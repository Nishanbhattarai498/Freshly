import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

const router = express.Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL?.replace(/\/$/, '');
const ML_REQUEST_TIMEOUT_MS = parseInt(process.env.ML_REQUEST_TIMEOUT_MS || '10000', 10);
const ML_RETRY_ATTEMPTS = Math.max(parseInt(process.env.ML_RETRY_ATTEMPTS || '2', 10), 1);
const ML_RETRY_BACKOFF_MS = Math.max(parseInt(process.env.ML_RETRY_BACKOFF_MS || '1200', 10), 250);
const ML_LOCAL_FALLBACK_ENABLED = process.env.ML_LOCAL_FALLBACK !== '0';
const ML_HEALTH_TIMEOUT_MS = Math.max(parseInt(process.env.ML_HEALTH_TIMEOUT_MS || '8000', 10), 1000);
const ML_COLD_START_TIMEOUT_MS = Math.max(parseInt(process.env.ML_COLD_START_TIMEOUT_MS || '70000', 10), ML_HEALTH_TIMEOUT_MS);
const ML_COLD_START_POLL_INTERVAL_MS = Math.max(parseInt(process.env.ML_COLD_START_POLL_INTERVAL_MS || '2500', 10), 500);

const predictSchema = z.object({
  name: z.string().min(2),
  temp: z.number(),
  humidity: z.number().min(0).max(100),
  light: z.number(),
  co2: z.number().min(0),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withStatus = (message, statusCode, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
};

const extractResponseMessage = (parsed, status) => {
  if (parsed?.error) return parsed.error;
  if (parsed?.detail) return parsed.detail;
  return `ML service request failed with status ${status}`;
};

const isRetryableUpstreamStatus = (status) => [429, 500, 502, 503, 504].includes(status);

const fetchWithTimeout = async (url, options = {}, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const runPythonPredict = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonExec = process.env.PYTHON_EXECUTABLE || process.env.PYTHON || 'python';
    const scriptPath = path.join(backendRoot, 'ml', 'predict_condition.py');
    const modelPath = path.join(backendRoot, 'ml', 'best_food_condition_model.joblib');

    const args = [
      scriptPath,
      '--model',
      modelPath,
      '--name',
      String(payload.name),
      '--temp',
      String(payload.temp),
      '--humidity',
      String(payload.humidity),
      '--light',
      String(payload.light),
      '--co2',
      String(payload.co2),
    ];

    const child = spawn(pythonExec, args, {
      cwd: backendRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(withStatus(`Failed to start Python process: ${error.message}`, 503));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(withStatus(stderr || `Prediction process failed with exit code ${code}`, 503));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (_error) {
        reject(withStatus('Prediction output was not valid JSON.', 500));
      }
    });
  });
};

const runRemotePredict = async (payload) => {
  if (!ML_SERVICE_URL) {
    throw withStatus('ML_SERVICE_URL is not configured', 503);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= ML_RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ML_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await response.text();
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (_e) {
        parsed = null;
      }

      if (!response.ok) {
        const message = extractResponseMessage(parsed, response.status);
        const mappedStatus = response.status >= 500 ? 502 : 400;
        const err = withStatus(message, mappedStatus);

        if (isRetryableUpstreamStatus(response.status) && attempt < ML_RETRY_ATTEMPTS) {
          lastError = err;
          await sleep(ML_RETRY_BACKOFF_MS * attempt);
          continue;
        }

        throw err;
      }

      if (!parsed) {
        throw withStatus('ML service returned empty or invalid JSON', 502);
      }

      return parsed;
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      const wrapped = isAbort
        ? withStatus(`ML service request timed out after ${ML_REQUEST_TIMEOUT_MS}ms`, 504)
        : withStatus(error?.message || 'Failed to reach ML service', error?.statusCode || 502);

      const retryable = isAbort || (wrapped.statusCode >= 500 && wrapped.statusCode <= 504);
      if (retryable && attempt < ML_RETRY_ATTEMPTS) {
        lastError = wrapped;
        await sleep(ML_RETRY_BACKOFF_MS * attempt);
        continue;
      }

      throw wrapped;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || withStatus('ML service request failed', 502);
};

const waitForRemoteMl = async () => {
  if (!ML_SERVICE_URL) {
    return {
      ready: false,
      reason: 'ML_SERVICE_URL not configured',
    };
  }

  const startedAt = Date.now();
  let lastFailure = null;

  while (Date.now() - startedAt < ML_COLD_START_TIMEOUT_MS) {
    try {
      const response = await fetchWithTimeout(`${ML_SERVICE_URL}/health`, {}, ML_HEALTH_TIMEOUT_MS);
      if (response.ok) {
        const data = await response.json();
        if (data?.model_loaded) {
          return {
            ready: true,
            waitedMs: Date.now() - startedAt,
            data,
          };
        }

        lastFailure = 'ML health responded before model finished loading';
      } else {
        lastFailure = `Health endpoint returned status ${response.status}`;
      }
    } catch (error) {
      lastFailure = error?.name === 'AbortError'
        ? `ML health timed out after ${ML_HEALTH_TIMEOUT_MS}ms`
        : (error?.message || 'Failed to reach ML service');
    }

    await sleep(ML_COLD_START_POLL_INTERVAL_MS);
  }

  return {
    ready: false,
    waitedMs: Date.now() - startedAt,
    reason: lastFailure || `ML service did not become ready within ${ML_COLD_START_TIMEOUT_MS}ms`,
  };
};

const getRemoteHealth = async () => {
  if (!ML_SERVICE_URL) {
    return {
      available: false,
      reason: 'ML_SERVICE_URL not configured',
    };
  }

  try {
    const response = await fetchWithTimeout(`${ML_SERVICE_URL}/health`, {}, ML_HEALTH_TIMEOUT_MS);
    if (!response.ok) {
      return {
        available: false,
        reason: `Health endpoint returned status ${response.status}`,
      };
    }
    const data = await response.json();
    return {
      available: true,
      data,
    };
  } catch (error) {
    return {
      available: false,
      reason: error?.message || 'Failed to reach ML service',
    };
  }
};

router.get('/status', async (req, res) => {
  const remoteHealth = await getRemoteHealth();

  return res.json({
    active: true,
    mode: ML_SERVICE_URL ? 'remote-python-service' : 'local-python-process',
    mlServiceUrl: ML_SERVICE_URL || null,
    retryAttempts: ML_RETRY_ATTEMPTS,
    timeoutMs: ML_REQUEST_TIMEOUT_MS,
    coldStartTimeoutMs: ML_COLD_START_TIMEOUT_MS,
    healthTimeoutMs: ML_HEALTH_TIMEOUT_MS,
    remoteHealth,
    localFallback: {
      enabled: ML_LOCAL_FALLBACK_ENABLED,
      modelPath: 'ml/best_food_condition_model.joblib',
    },
    inputFeatures: ['name', 'temp', 'humidity', 'light', 'co2'],
  });
});

router.post('/predict', async (req, res) => {
  const parsedBody = predictSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(422).json({
      error: 'Invalid prediction input',
      details: parsedBody.error.flatten(),
    });
  }

  const payload = parsedBody.data;
  const attempts = [];

  try {
    if (ML_SERVICE_URL) {
      try {
        const warmup = await waitForRemoteMl();
        if (!warmup.ready) {
          throw withStatus(
            `ML service is still waking up on Render. ${warmup.reason || 'Please retry shortly.'}`,
            503,
            warmup
          );
        }

        const prediction = await runRemotePredict(payload);
        return res.json({
          ...prediction,
          prediction_source: 'remote',
          cold_start_wait_ms: warmup.waitedMs || 0,
        });
      } catch (remoteError) {
        attempts.push({
          source: 'remote',
          message: remoteError?.message || 'Remote prediction failed',
          statusCode: remoteError?.statusCode || 502,
          details: remoteError?.details,
        });
      }
    }

    if (ML_LOCAL_FALLBACK_ENABLED) {
      try {
        const prediction = await runPythonPredict(payload);
        return res.json({ ...prediction, prediction_source: ML_SERVICE_URL ? 'local-fallback' : 'local' });
      } catch (localError) {
        attempts.push({
          source: 'local',
          message: localError?.message || 'Local prediction failed',
          statusCode: localError?.statusCode || 503,
        });
      }
    }

    const primary = attempts[0] || {
      source: 'unknown',
      message: 'Prediction failed',
      statusCode: 502,
    };

    return res.status(primary.statusCode).json({
      error: primary.message,
      attempts,
      hint: 'If this is a hosted environment, verify ML_SERVICE_URL and service uptime.',
    });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({
      error: error?.message || 'Prediction failed',
    });
  }
});

export default router;
