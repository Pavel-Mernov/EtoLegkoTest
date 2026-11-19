import { performance } from 'node:perf_hooks';

const requestCount = 10;
const timeoutMs = 120_000;
const [address, ...extraArgs] = process.argv.slice(2);

async function main() {
  const url = URL.canParse(address) ? new URL(address) : null;
  if (!url || !['http:', 'https:'].includes(url.protocol) || extraArgs.length) {
    throw new Error('Использование: node speed-test.mjs "<http:// или https:// URL>"');
  }

  let totalBytes = 0;
  let totalMs = 0;

  for (let request = 1; request <= requestCount; request++) {
    const start = performance.now();
    try {
      const response = await fetch(url, {
        headers: { 'accept-encoding': 'identity' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }
      if (response.body) {
        for await (const chunk of response.body) {
          totalBytes += chunk.byteLength;
        }
      }
      totalMs += performance.now() - start;
    } catch (error) {
      throw new Error(`Запрос ${request} из ${requestCount}: ${error.cause?.message ?? error.message}`);
    }
  }

  const averageMs = totalMs / requestCount;
  const megabitsPerSecond = (totalBytes * 8) / (totalMs * 1000);
  console.log(`Среднее время запроса: ${averageMs.toFixed(2)} мс`);
  console.log(`Общий объём: ${totalBytes} байт`);
  console.log(`Скорость скачивания: ${megabitsPerSecond.toFixed(2)} Мбит/с`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
