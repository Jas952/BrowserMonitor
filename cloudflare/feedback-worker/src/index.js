const MAX_JSON_BYTES = 3 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 5_000;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const TYPE_TITLES = {
  feature: "Tool request",
  bug: "Bug report",
  site: "Site filter report"
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      ...corsHeaders(init.origin),
      ...init.headers
    }
  });
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function cleanString(value, limit) {
  return String(value ?? "").replace(/\p{C}/gu, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseAllowedExtensionIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extensionIdFromOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === "chrome-extension:" ? url.hostname : "";
  } catch {
    return "";
  }
}

function assertAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedIds = parseAllowedExtensionIds(env.ALLOWED_EXTENSION_IDS);
  if (allowedIds.length === 0) return origin;
  const extensionId = extensionIdFromOrigin(origin);
  if (!extensionId || !allowedIds.includes(extensionId)) {
    throw new Response(JSON.stringify({ error: "Origin is not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
    });
  }
  return origin;
}

async function readPayload(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_JSON_BYTES) {
    throw new Response(JSON.stringify({ error: "Request is too large" }), { status: 413 });
  }
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    throw new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  return payload;
}

function normalizeAttachment(attachment) {
  if (!attachment) return null;
  const name = cleanString(attachment.name, 120) || "screenshot";
  const type = cleanString(attachment.type, 40);
  const size = Number(attachment.size || 0);
  const dataURL = String(attachment.dataURL || "");
  if (!IMAGE_TYPES.has(type) || size <= 0 || size > MAX_ATTACHMENT_BYTES) return null;
  const prefix = `data:${type};base64,`;
  if (!dataURL.startsWith(prefix)) return null;
  const content = dataURL.slice(prefix.length);
  if (!/^[A-Za-z0-9+/=]+$/.test(content)) return null;
  return { filename: name, content, content_type: type };
}

function safeHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function buildEmail(payload, env) {
  const type = ["feature", "bug", "site"].includes(payload.type) ? payload.type : "feature";
  const replyEmail = cleanString(payload.email, 254);
  const message = String(payload.message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!isEmail(replyEmail) || message.length < 10) {
    throw new Response(JSON.stringify({ error: "Email and message are required" }), { status: 400 });
  }

  const reportedURL = cleanString(payload.reportedURL, 2_000);
  const titlePrefix = TYPE_TITLES[type] || TYPE_TITLES.feature;
  const subjectSeed = type === "site" && safeHostname(reportedURL)
    ? safeHostname(reportedURL)
    : message.split("\n")[0].slice(0, 80);
  const diagnostics = payload.diagnostics && typeof payload.diagnostics === "object"
    ? JSON.stringify(payload.diagnostics, null, 2).slice(0, 4_000)
    : "";
  const text = [
    `Reply email: ${replyEmail}`,
    `Type: ${type}`,
    reportedURL ? `Reported URL: ${reportedURL}` : "",
    "",
    message,
    diagnostics ? "\nSite diagnostics:" : "",
    diagnostics,
    "",
    `Browser Monitor ${cleanString(payload.version, 40)}`
  ].filter(Boolean).join("\n");

  const attachment = normalizeAttachment(payload.attachment);
  return {
    from: env.FROM_EMAIL,
    to: [env.TO_EMAIL],
    reply_to: replyEmail,
    subject: `Browser Monitor — ${titlePrefix}: ${subjectSeed}`,
    text,
    attachments: attachment ? [attachment] : undefined
  };
}

async function sendViaResend(email, env) {
  if (!env.RESEND_API_KEY) {
    throw new Response(JSON.stringify({ error: "Email provider is not configured" }), { status: 503 });
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(email)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json({ error: "Email provider rejected the request", details: data }, { status: 502 });
  }
  return json({ ok: true, id: data.id || null }, { status: 202 });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST" || new URL(request.url).pathname !== "/feedback") {
      return json({ error: "Not found" }, { status: 404, origin });
    }
    try {
      const allowedOrigin = assertAllowedOrigin(request, env);
      const payload = await readPayload(request);
      const email = buildEmail(payload, env);
      return await sendViaResend(email, env, allowedOrigin);
    } catch (error) {
      if (error instanceof Response) return error;
      return json({ error: "Internal error" }, { status: 500, origin });
    }
  }
};
