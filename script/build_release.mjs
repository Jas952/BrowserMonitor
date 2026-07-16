import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionDirectory = join(root, "Extension");
const distDirectory = join(root, "dist");
const sourceManifest = JSON.parse(readFileSync(join(extensionDirectory, "manifest.json"), "utf8"));
const version = sourceManifest.version;
const stagingDirectory = join(distDirectory, `browser-monitor-${version}`);
const archivePath = join(distDirectory, `browser-monitor-${version}.zip`);
const checksumPath = join(distDirectory, "SHA256SUMS.txt");

const rootFiles = [
  "blocker-metadata.js",
  "blocker.js",
  "content.js",
  "cookies.js",
  "filter-parser.js",
  "localization.js",
  "options.css",
  "options.html",
  "options.js",
  "popup.css",
  "popup.html",
  "popup.js",
  "scoring.js",
  "service-worker.js"
];

rmSync(distDirectory, { recursive: true, force: true });
mkdirSync(stagingDirectory, { recursive: true });

for (const file of rootFiles) {
  cpSync(join(extensionDirectory, file), join(stagingDirectory, file));
}
for (const directory of ["icons", "images", "rules"]) {
  cpSync(join(extensionDirectory, directory), join(stagingDirectory, directory), {
    recursive: true,
    filter: (path) => !path.endsWith(".DS_Store")
  });
}

const releaseManifest = structuredClone(sourceManifest);
delete releaseManifest.key;
writeFileSync(join(stagingDirectory, "manifest.json"), `${JSON.stringify(releaseManifest, null, 2)}\n`);

function filesBelow(directory, prefix = "") {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = join(directory, entry);
    const relative = join(prefix, entry);
    return statSync(absolute).isDirectory() ? filesBelow(absolute, relative) : [relative];
  });
}

const packagedFiles = filesBelow(stagingDirectory);
assert.ok(packagedFiles.includes("manifest.json"), "Release manifest is missing");
assert.ok(!("key" in releaseManifest), "Development public key leaked into the Store package");
assert.ok(!releaseManifest.permissions.includes("declarativeNetRequestFeedback"));
assert.ok(packagedFiles.every((file) => !/(^|\/)(tests?|TestFixtures|output)(\/|$)/i.test(file)));
assert.ok(packagedFiles.every((file) => !/(^|\/)(package\.json|\.DS_Store)$/i.test(file)));

const scripts = packagedFiles.filter((file) => file.endsWith(".js"));
for (const file of scripts) {
  const source = readFileSync(join(stagingDirectory, file), "utf8");
  assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\s*\(/, `${file} contains dynamic code execution`);
  assert.doesNotMatch(source, /onRuleMatchedDebug|declarativeNetRequestFeedback/, `${file} contains a debug-only API`);
}

const zip = spawnSync("zip", ["-X", "-q", "-r", archivePath, "."], {
  cwd: stagingDirectory,
  encoding: "utf8"
});
assert.equal(zip.status, 0, zip.stderr || "zip failed");
assert.ok(existsSync(archivePath), "Release archive was not created");

const archive = readFileSync(archivePath);
const checksum = createHash("sha256").update(archive).digest("hex");
writeFileSync(checksumPath, `${checksum}  ${archivePath.split("/").at(-1)}\n`);
rmSync(stagingDirectory, { recursive: true, force: true });

console.log(JSON.stringify({
  ok: true,
  version,
  archive: archivePath,
  bytes: archive.byteLength,
  sha256: checksum,
  fileCount: packagedFiles.length
}, null, 2));
