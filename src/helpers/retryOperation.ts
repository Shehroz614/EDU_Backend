const retryOperation = async <T>(operation: () => Promise<T>, maxRetries: number, retryDelay: number): Promise<T> => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (err) {
      console.error(`Error: ${err}`);
      retries++;
      if (retries < maxRetries) {
        console.log(`Retrying in ${retryDelay} milliseconds...`);
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw new Error('Max retries reached, operation failed.');
};
export default retryOperation;
