let operationDepth = 0;

/** Mark a save or document-directory copy so orphan cleanup will not run. */
export function beginStorageOperation(): void {
  operationDepth += 1;
}

export function endStorageOperation(): void {
  operationDepth = Math.max(0, operationDepth - 1);
}

export function isStorageOperationInProgress(): boolean {
  return operationDepth > 0;
}

export async function withStorageOperation<T>(work: () => Promise<T>): Promise<T> {
  beginStorageOperation();
  try {
    return await work();
  } finally {
    endStorageOperation();
  }
}

export function resetStorageOperations(): void {
  operationDepth = 0;
}
