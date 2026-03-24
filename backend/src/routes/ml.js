import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

const router = express.Router();

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

router.get('/status', (req, res) => {
  return res.json({
    active: true,
    mode: 'python-model',
    modelPath: 'ml/best_food_condition_model.joblib',
    inputFeatures: ['name', 'temp', 'humidity', 'light', 'co2'],
  });
});

router.post('/predict', async (req, res) => {
  try {
    const body = predictSchema.parse(req.body);
    const prediction = await runPythonPredict(body);
    return res.json(prediction);
  } catch (error) {
    return res.status(400).json({
      error: error?.message || 'Prediction failed',
    });
  }
});

export default router;
