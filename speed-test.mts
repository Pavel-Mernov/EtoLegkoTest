import { performance } from 'node:perf_hooks';

const requestCount = 10;
const timeoutMs = 120_000;
const [address, ...extraArgs] = process.argv.slice(2);

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.cause instanceof Error ? error.cause.message : error.message;
  }
  return String(error);
}

async function main(): Promise<void> {
  const url = address ? URL.parse(address) : null;
  if (!url || !['http:', 'https:'].includes(url.protocol) || extraArgs.length) {
    throw new Error('Использование: node speed-test.mts "<http:// или https:// URL>"');
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
      throw new Error(`Запрос ${request} из ${requestCount}: ${errorMessage(error)}`);
    }
  }

  const averageMs = totalMs / requestCount;
  const megabitsPerSecond = (totalBytes * 8) / (totalMs * 1000);
  console.log(`Среднее время запроса: ${averageMs.toFixed(2)} мс`);
  console.log(`Общий объём: ${totalBytes} байт`);
  console.log(`Скорость скачивания: ${megabitsPerSecond.toFixed(2)} Мбит/с`);
}

main().catch((error: unknown) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
