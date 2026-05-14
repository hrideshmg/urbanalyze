export class AsyncQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async enqueue(promiseFactory) {
    if (this.running >= this.concurrency) {
      await new Promise((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await promiseFactory();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
}

export const geminiQueue = new AsyncQueue(2); // Limit concurrent Gemini requests
export const overpassQueue = new AsyncQueue(1); // Limit concurrent Overpass requests to 1 to avoid 504/429
