const backendHealthUrl = process.env.BACKEND_HEALTH_URL || 'https://freshly-backend-5vmz.onrender.com/health';
const backendMlStatusUrl = process.env.BACKEND_ML_STATUS_URL || 'https://freshly-backend-5vmz.onrender.com/api/ml/status';
const mlHealthUrl = process.env.ML_HEALTH_URL || 'https://freshly-ml.onrender.com/health';

const endpoints = [
  { name: 'backend', url: backendHealthUrl },
  { name: 'backend_ml', url: backendMlStatusUrl },
  { name: 'ml', url: mlHealthUrl },
];

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 4000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ping = async ({ name, url }) => {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'freshly-render-keepalive/1.0',
          'cache-control': 'no-cache',
        },
      });

      const durationMs = Date.now() - startedAt;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`[keepalive] ${name} OK attempt=${attempt} ${response.status} ${durationMs}ms ${url}`);
      return { ok: true };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      console.error(`[keepalive] ${name} FAIL attempt=${attempt} ${durationMs}ms ${url} :: ${error.message}`);

      if (attempt < RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      return { ok: false, error };
    }
  }
};

const run = async () => {
  console.log(`[keepalive] started ${new Date().toISOString()}`);

  const results = await Promise.all(endpoints.map(ping));
  const failed = results.some((result) => !result.ok);

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log('[keepalive] completed successfully');
};

run().catch((error) => {
  console.error('[keepalive] unexpected failure', error);
  process.exit(1);
});
