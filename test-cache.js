import { overpassQueue, geminiQueue } from './app/_scripts/queue.js';
import { getCached, setCached } from './app/_scripts/cache.js';

async function main() {
  console.log("Testing Cache...");
  setCached("test", "data");
  console.log(getCached("test"));
  
  console.log("Testing Queue...");
  const promises = [];
  for(let i=0; i<3; i++) {
    promises.push(geminiQueue.enqueue(() => new Promise(r => setTimeout(() => r(i), 1000))));
  }
  const t0 = Date.now();
  await Promise.all(promises);
  const t1 = Date.now();
  console.log("Queue took", t1 - t0, "ms");
}
main();
