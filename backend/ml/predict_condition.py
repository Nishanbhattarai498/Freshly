import argparse
import json
from pathlib import Path

import joblib
import pandas as pd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Predict food condition using saved model.")
    parser.add_argument("--model", type=Path, default=Path("best_food_condition_model.joblib"))
    parser.add_argument("--name", required=True, help="Food name/fruit type")
    parser.add_argument("--temp", type=float, required=True, help="Temperature")
    parser.add_argument("--humidity", type=float, required=True, help="Humidity percentage")
    parser.add_argument("--light", type=float, required=True, help="Light level")
    parser.add_argument("--co2", type=float, required=True, help="CO2 level")
    return parser.parse_args()


def main():
    args = parse_args()
    if not args.model.exists():
        raise FileNotFoundError(f"Model file not found: {args.model}")

    model = joblib.load(args.model)
    row = pd.DataFrame(
        [
            {
                "Fruit": str(args.name).strip().lower(),
                "Temp": float(args.temp),
                "Humid (%)": float(args.humidity),
                "Light (Fux)": float(args.light),
                "CO2 (pmm)": float(args.co2),
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

    print(
        json.dumps(
            {
                "input": {
                    "name": args.name,
                    "temp": args.temp,
                    "humidity": args.humidity,
                    "light": args.light,
                    "co2": args.co2,
                },
                "prediction": "Good" if pred == 1 else "Bad",
                "prediction_code": pred,
                "probability": proba,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
