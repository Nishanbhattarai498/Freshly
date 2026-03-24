import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedShuffleSplit


FEATURE_COLUMNS = ["Fruit", "Temp", "Humid (%)", "Light (Fux)", "CO2 (pmm)"]
RAW_COLUMNS = FEATURE_COLUMNS + ["Class"]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate external-like test dataset and evaluate saved model.",
    )
    parser.add_argument(
        "--source-dataset",
        type=Path,
        default=Path("data") / "Dataset.csv",
        help="Path to source dataset CSV",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("best_food_condition_model.joblib"),
        help="Path to trained model",
    )
    parser.add_argument(
        "--output-dataset",
        type=Path,
        default=Path("data") / "external_like_test_dataset.csv",
        help="Output CSV for external-like test data",
    )
    parser.add_argument(
        "--output-report",
        type=Path,
        default=Path("external_like_test_report.json"),
        help="Output JSON report path",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Fraction of rows used for external-like test set",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=2026,
        help="Random seed",
    )
    return parser.parse_args()


def normalize_label(value):
    text = str(value).strip().lower()
    if text in {"good", "fresh", "1"}:
        return 1
    if text in {"bad", "spoiled", "0"}:
        return 0
    return None


def load_clean_dataframe(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Source dataset not found: {path}")

    df = pd.read_csv(path)
    missing = [c for c in RAW_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in dataset: {missing}")

    data = df[RAW_COLUMNS].copy()
    data["ClassCode"] = data["Class"].map(normalize_label)

    data["Fruit"] = data["Fruit"].astype(str).str.strip().str.lower()
    data["Temp"] = pd.to_numeric(data["Temp"], errors="coerce")
    data["Humid (%)"] = pd.to_numeric(data["Humid (%)"], errors="coerce")
    data["Light (Fux)"] = pd.to_numeric(data["Light (Fux)"], errors="coerce")
    data["CO2 (pmm)"] = pd.to_numeric(data["CO2 (pmm)"], errors="coerce")

    data = data.dropna(subset=FEATURE_COLUMNS + ["ClassCode"]).copy()
    data["ClassCode"] = data["ClassCode"].astype(int)
    return data


def make_external_like(test_df: pd.DataFrame, seed: int):
    rng = np.random.default_rng(seed)
    out = test_df.copy()

    # Small realistic perturbations so rows are not identical to training examples.
    out["Temp"] = out["Temp"] + rng.normal(0.0, 0.9, size=len(out))
    out["Humid (%)"] = out["Humid (%)"] + rng.normal(0.0, 2.2, size=len(out))
    out["Light (Fux)"] = out["Light (Fux)"] * rng.normal(1.0, 0.08, size=len(out))
    out["CO2 (pmm)"] = out["CO2 (pmm)"] + rng.normal(0.0, 18.0, size=len(out))

    # Keep values in realistic bounds.
    out["Temp"] = out["Temp"].clip(lower=-10, upper=60)
    out["Humid (%)"] = out["Humid (%)"].clip(lower=0, upper=100)
    out["Light (Fux)"] = out["Light (Fux)"].clip(lower=0)
    out["CO2 (pmm)"] = out["CO2 (pmm)"].clip(lower=0)

    return out


def main():
    args = parse_args()

    data = load_clean_dataframe(args.source_dataset)
    X = data[FEATURE_COLUMNS]
    y = data["ClassCode"]

    splitter = StratifiedShuffleSplit(n_splits=1, test_size=args.test_size, random_state=args.seed)
    _, test_idx = next(splitter.split(X, y))
    test_df = data.iloc[test_idx].reset_index(drop=True)
    external_df = make_external_like(test_df, seed=args.seed + 1)

    args.output_dataset.parent.mkdir(parents=True, exist_ok=True)
    export_df = external_df.copy()
    export_df["Class"] = export_df["ClassCode"].map({1: "Good", 0: "Bad"})
    export_df = export_df[RAW_COLUMNS]
    export_df.to_csv(args.output_dataset, index=False)

    if not args.model.exists():
        raise FileNotFoundError(f"Model file not found: {args.model}")
    model = joblib.load(args.model)

    X_test = external_df[FEATURE_COLUMNS]
    y_true = external_df["ClassCode"].to_numpy()
    y_pred = model.predict(X_test)

    acc = float(accuracy_score(y_true, y_pred))
    precision = float(precision_score(y_true, y_pred))
    recall = float(recall_score(y_true, y_pred))
    f1 = float(f1_score(y_true, y_pred))
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    report = {
        "source_dataset": str(args.source_dataset),
        "model": str(args.model),
        "external_dataset": str(args.output_dataset),
        "test_rows": int(len(external_df)),
        "class_balance": {
            "good": int((y_true == 1).sum()),
            "bad": int((y_true == 0).sum()),
        },
        "metrics": {
            "accuracy": acc,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "confusion_matrix": {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp),
            },
        },
        "note": "External-like test generated from unseen stratified rows with realistic sensor perturbation.",
    }

    args.output_report.parent.mkdir(parents=True, exist_ok=True)
    args.output_report.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
