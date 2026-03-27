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

const predictSchema = z.object({
  name: z.string().min(2),
  temp: z.number(),
  humidity: z.number().min(0).max(100),
  light: z.number(),
  co2: z.number().min(0),
});

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
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Prediction process failed with exit code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (_error) {
        reject(new Error('Prediction output was not valid JSON.'));
      }
    });
  });
};

const runRemotePredict = async (payload) => {
  if (!ML_SERVICE_URL) {
    throw new Error('ML_SERVICE_URL is not configured');
  }

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
      const message = parsed?.error || parsed?.detail || `ML service request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (!parsed) {
      throw new Error('ML service returned empty or invalid JSON');
    }

    return parsed;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`ML service request timed out after ${ML_REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const getRemoteHealth = async () => {
  if (!ML_SERVICE_URL) {
    return {
      available: false,
      reason: 'ML_SERVICE_URL not configured',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, { signal: controller.signal });
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
  } finally {
    clearTimeout(timeout);
  }
};

router.get('/status', async (req, res) => {
  const remoteHealth = await getRemoteHealth();

  return res.json({
    active: true,
    mode: ML_SERVICE_URL ? 'remote-python-service' : 'local-python-process',
    mlServiceUrl: ML_SERVICE_URL || null,
    remoteHealth,
    localFallback: {
      modelPath: 'ml/best_food_condition_model.joblib',
    },
    inputFeatures: ['name', 'temp', 'humidity', 'light', 'co2'],
  });
});

router.post('/predict', async (req, res) => {
  try {
    const body = predictSchema.parse(req.body);
    const prediction = ML_SERVICE_URL
      ? await runRemotePredict(body)
      : await runPythonPredict(body);

    return res.json(prediction);
  } catch (error) {
    return res.status(400).json({
      error: error?.message || 'Prediction failed',
    });
  }
});

export default router;
