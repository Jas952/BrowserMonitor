import test from "node:test";
import assert from "node:assert/strict";

import { OperationTimeoutError, withTimeout } from "../core/async-utils.js";

test("withTimeout returns an operation result", async () => {
  assert.equal(await withTimeout(Promise.resolve("ready"), 50, "Popup"), "ready");
});

test("withTimeout rejects a stalled operation with a classified error", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 10, "Popup snapshot"),
    (error) => error instanceof OperationTimeoutError
      && error.code === "OPERATION_TIMEOUT"
      && /Popup snapshot timed out/.test(error.message)
  );
});
