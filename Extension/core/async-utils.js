export class OperationTimeoutError extends Error {
  constructor(label, timeoutMs) {
    super(`${label} timed out after ${timeoutMs} ms`);
    this.name = "OperationTimeoutError";
    this.code = "OPERATION_TIMEOUT";
  }
}

export function withTimeout(operation, timeoutMs, label = "Operation") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new OperationTimeoutError(label, timeoutMs)), timeoutMs);
  });
  return Promise.race([Promise.resolve(operation), timeout]).finally(() => clearTimeout(timeoutId));
}
