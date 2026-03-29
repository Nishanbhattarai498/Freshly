const backendHealthUrl = process.env.BACKEND_HEALTH_URL || 'https://freshly-backend.onrender.com/health';
const backendMlStatusUrl = process.env.BACKEND_ML_STATUS_URL || 'https://freshly-backend.onrender.com/api/ml/status';
const mlHealthUrl = process.env.ML_HEALTH_URL || 'https://freshly-ml.onrender.com/health';

const endpoints = [
  { name: 'backend', url: backendHealthUrl },
  { name: 'backend_ml', url: backendMlStatusUrl },
  { name: 'ml', url: mlHealthUrl },
];

const ping = async ({ name, url }) => {
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'freshly-render-keepalive/1.0',
      },
    });

    const durationMs = Date.now() - startedAt;
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log(`[keepalive] ${name} OK ${response.status} ${durationMs}ms ${url}`);
    return { ok: true };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(`[keepalive] ${name} FAIL ${durationMs}ms ${url} :: ${error.message}`);
    return { ok: false, error };
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
