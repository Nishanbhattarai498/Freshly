# Freshly Render Deployment (Split Backend + ML)

This guide deploys Freshly using:
- Render PostgreSQL
- Render Web Service for Node backend (`backend/`)
- Render Web Service for Python ML API (`backend/ml/service/`)

## 1) Create PostgreSQL on Render

1. In Render dashboard, click **New +** -> **PostgreSQL**.
2. Name: `freshly-postgres`.
3. Region: same as your web services.
4. After creation, copy:
   - Internal Database URL (best for services inside Render)
   - External Database URL (for local tools if needed)

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
5. Deploy.
6. Verify:
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
