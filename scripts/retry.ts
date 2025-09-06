/**
 * A utility function that pauses execution for a specified duration.
 * @param ms The time in milliseconds to sleep.
 * @returns A promise that resolves after the specified time.
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * A generic function to retry a given asynchronous operation with exponential backoff.
 * @param operation The async function to execute.
 * @param maxRetries The maximum number of retry attempts. Defaults to 3.
 * @param delay The initial delay in milliseconds before the first retry. Defaults to 1000.
 * @returns The result of the successful operation.
 * @throws The last error if the operation fails after all retries.
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Attempt the operation and return its result on success.
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      console.log(`Attempt ${i + 1} failed:`, error);
      
      // If there are more retries, wait using exponential backoff.
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }

  // If all attempts fail, throw the last captured error.
  throw lastError;
}
