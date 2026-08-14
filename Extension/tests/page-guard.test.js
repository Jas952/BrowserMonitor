import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../features/security/page-guard.js", import.meta.url), "utf8");
const context = vm.createContext({ URL });
vm.runInContext(source, context);
const guard = context.BrowserMonitorPageGuard;

test("Crypto Guard recognizes common blockchain address families", () => {
  assert.equal(guard.detectWalletAddress("0x52908400098527886E0F7030069857D2E4169EE7").family, "EVM");
  assert.equal(guard.detectWalletAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080").family, "Bitcoin");
  assert.equal(guard.detectWalletAddress("TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE").family, "Tron");
  assert.equal(guard.detectWalletAddress("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF").family, "Stellar");
  assert.equal(guard.detectWalletAddress("not-a-wallet-address"), null);
});

test("Crypto Guard removes invisible formatting and finds one address in copied text", () => {
  const address = "0x52908400098527886E0F7030069857D2E4169EE7";
  const detected = guard.detectWalletAddress(`\u202E${address}\u200B`);
  assert.equal(detected.value, address);
  assert.equal(detected.changed, true);
  assert.equal(guard.findWalletAddress(`Wallet: ${address}`).value, address);
});

test("search protection supports popular engines and unwraps destination parameters", () => {
  assert.equal(guard.searchEngine("www.google.com"), "google");
  assert.equal(guard.searchEngine("google.co.uk"), "google");
  assert.equal(guard.searchEngine("yandex.ru"), "yandex");
  assert.equal(guard.searchEngine("duckduckgo.com"), "duckduckgo");
  assert.equal(
    guard.unwrapSearchURL("https://www.google.com/url?url=https%3A%2F%2Fexample.com%2Faccount", "google.com"),
    "https://example.com/account"
  );
  assert.equal(guard.registrableDomain("https://support.example.co.uk/page"), "example.co.uk");
});

test("continue watching identity removes common mirror noise", () => {
  assert.equal(
    guard.normalizedMediaIdentity("Example Show — Episode 4 | Watch online"),
    "example show episode 4"
  );
});

test("programmatic wallet copies are cleaned in the page world", async () => {
  const writes = [];
  const events = [];
  const mainSource = readFileSync(new URL("../features/security/crypto-guard-main.js", import.meta.url), "utf8");
  const clipboard = { writeText: async (value) => writes.push(value) };
  const mainContext = vm.createContext({
    navigator: { clipboard },
    window: { dispatchEvent: (event) => events.push(event) },
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
      }
    }
  });
  vm.runInContext(mainSource, mainContext);
  const address = "0x52908400098527886E0F7030069857D2E4169EE7";
  await clipboard.writeText(`\u202E${address}\u200B`);
  assert.deepEqual(writes, [address]);
  assert.equal(events[0].type, "browser-monitor-crypto-copy");
  assert.equal(events[0].detail.changed, true);
});
