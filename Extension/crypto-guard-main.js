(() => {
  if (globalThis.__browserMonitorCryptoGuardMainLoaded) return;
  globalThis.__browserMonitorCryptoGuardMainLoaded = true;
  const clipboard = navigator.clipboard;
  const originalWriteText = clipboard?.writeText?.bind(clipboard);
  if (!originalWriteText) return;

  const clean = (value) => String(value ?? "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
  const looksLikeWalletAddress = (value) => {
    const text = clean(value);
    return /^(?:0x[a-f0-9]{40}|0x[a-f0-9]{64}|(?:bc1|tb1)[ac-hj-np-z02-9]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34}|(?:addr|stake)(?:_test)?1[ac-hj-np-z02-9]{20,100}|(?:EQ|UQ)[A-Za-z0-9_-]{46}|(?:nano|xrb)_[13][13-9a-km-uw-z]{59}|[1-9A-HJ-NP-Za-km-z]{32,105})$/i.test(text);
  };

  const protectedWriteText = async (value) => {
    const original = String(value ?? "");
    const protectedValue = looksLikeWalletAddress(original) ? clean(original) : original;
    try {
      await originalWriteText(protectedValue);
      if (protectedValue !== original || looksLikeWalletAddress(protectedValue)) {
        window.dispatchEvent(new CustomEvent("browser-monitor-crypto-copy", {
          detail: { value: protectedValue, changed: protectedValue !== original }
        }));
      }
    } catch (error) {
      if (looksLikeWalletAddress(original)) {
        window.dispatchEvent(new CustomEvent("browser-monitor-crypto-copy-error"));
      }
      throw error;
    }
  };
  try {
    Object.defineProperty(clipboard, "writeText", {
      configurable: true,
      value: protectedWriteText
    });
  } catch {
    // Some pages may expose a non-configurable Clipboard object; selection-copy protection still remains active.
  }
})();
