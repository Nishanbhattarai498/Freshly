# Freshly Render Deployment (Split Backend + ML)

This guide deploys Freshly using:
- Render PostgreSQL
- Render Web Service for Node backend (`backend/`)
- Render Web Service for Python ML API (`backend/ml/service/`)

## 1) Database (Neon or Render Postgres)

Choose one:

- **If you already use Neon (recommended in your current setup):**
   1. Keep Neon as your DB provider.
   2. Copy Neon `DATABASE_URL`.
   3. Use that URL in Render backend environment variables.

- **If you want Render Postgres instead:**
   1. In Render dashboard, click **New +** -> **PostgreSQL**.
   2. Name: `freshly-postgres`.
   3. Region: same as your web services.
   4. After creation, copy internal/external DB URLs.

## 2) Deploy Python ML service

1. In Render dashboard, click **New +** -> **Web Service**.
2. Connect this repository.
3. Configure:
   - Name: `freshly-ml`
   - Root Directory: `backend/ml/service`
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   - `MODEL_PATH=../best_food_condition_model.joblib`
   - Optional: `LOG_LEVEL=INFO`
5. Deploy.
6. Verify:
   - `GET https://freshly-ml.onrender.com/`
   - `GET https://freshly-ml.onrender.com/health`
   - `POST https://freshly-ml.onrender.com/predict`

Sample body:

```json
{
  "name": "orange",
  "temp": 23,
  "humidity": 95,
  "light": 8,
  "co2": 350
}
```

## 3) Deploy Node backend service

1. In Render dashboard, click **New +** -> **Web Service**.
2. Connect this repository.
3. Configure:
   - Name: `freshly-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm ci`
   - Start Command: `npm start`
4. Add environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL=<Render Postgres internal URL>`
   - `CLERK_SECRET_KEY=<your Clerk secret key>`
   - `ML_SERVICE_URL=https://freshly-ml.onrender.com`
   - Optional: `ML_REQUEST_TIMEOUT_MS=10000`
5. Deploy.

## 4) Verify backend + ML integration

1. Check backend status:
   - `GET https://freshly-backend.onrender.com/api/ml/status`
2. Check predict through backend proxy:
   - `POST https://freshly-backend.onrender.com/api/ml/predict`
3. Confirm response shape still includes:
   - `prediction`
   - `prediction_code`
   - `probability`

## 5) Frontend production config

Set API and socket URLs to your backend domain (not local LAN IP):
- API base: `https://freshly-backend.onrender.com/api`
- Socket base: `https://freshly-backend.onrender.com`

If using Expo EAS, pass these as environment-specific values for production builds.

## 6) Clerk setup reminders

1. Ensure backend has `CLERK_SECRET_KEY`.
2. Point Clerk webhook endpoint to:
   - `https://freshly-backend.onrender.com/api/users/webhook`
3. Verify your frontend app uses matching Clerk publishable key/project settings.

## 7) Optional hardening

- Restrict CORS origins in backend.
- Add webhook signature verification for Clerk webhooks.
- Move large media payloads to object storage instead of DB/base64.
- Use paid Render instance for stable Socket.IO uptime (avoids free-tier sleep).

## 8) Troubleshooting logs on Render

### A) `InconsistentVersionWarning` from scikit-learn

Cause:
- Model was trained with one scikit-learn version and loaded with a different one.

Fix:
- Keep ML dependencies pinned to training-compatible versions in `backend/ml/service/requirements.txt`.
- Pin Python runtime with `backend/ml/service/runtime.txt`.

### B) `No open ports detected, continuing to scan...`

Meaning:
- Render is scanning while service starts; often harmless if app binds quickly.

Fix:
- Keep start command exactly: `uvicorn app:app --host 0.0.0.0 --port $PORT`.
- Keep a root endpoint (`/`) and health endpoint (`/health`) for easy checks.

### C) `GET /` 404 noise in logs

Cause:
- Browser or platform probes hitting root path.

Fix:
- Return a simple JSON response on `/`.

### D) Useful operational checks

- Check uptime quickly: `GET /health`
- Verify model path loaded: inspect `model_path` in `GET /health`
- Validate predictions: `POST /predict` with sample payload
