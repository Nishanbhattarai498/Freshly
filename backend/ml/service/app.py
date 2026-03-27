import os
from pathlib import Path
import logging

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    name: str = Field(..., min_length=2)
    temp: float
    humidity: float = Field(..., ge=0, le=100)
    light: float
    co2: float = Field(..., ge=0)


class PredictionResponse(BaseModel):
    input: dict
    prediction: str
    prediction_code: int
    probability: dict | None


app = FastAPI(title="Freshly ML Service", version="1.0.0")
logger = logging.getLogger("freshly.ml")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(BASE_DIR.parent / "best_food_condition_model.joblib")))
model = None


@app.on_event("startup")
def load_model() -> None:
    global model
    logger.info("Starting ML service")
    logger.info("Loading model from %s", MODEL_PATH)
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    logger.info("Model loaded successfully")


@app.get("/")
def root() -> dict:
    return {
        "service": "freshly-ml",
        "status": "ok",
        "health": "/health",
        "predict": "/predict",
    }


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictRequest) -> dict:
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    row = pd.DataFrame(
        [
            {
                "Fruit": payload.name.strip().lower(),
                "Temp": float(payload.temp),
                "Humid (%)": float(payload.humidity),
                "Light (Fux)": float(payload.light),
                "CO2 (pmm)": float(payload.co2),
            }
        ]
    )

    pred = int(model.predict(row)[0])
    proba = None
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(row)[0]
        proba = {
            "bad": float(probs[0]),
            "good": float(probs[1]),
        }

    return {
        "input": {
            "name": payload.name,
            "temp": payload.temp,
            "humidity": payload.humidity,
            "light": payload.light,
            "co2": payload.co2,
        },
        "prediction": "Good" if pred == 1 else "Bad",
        "prediction_code": pred,
        "probability": proba,
    }
