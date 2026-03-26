import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


EXPECTED_COLUMNS = ["Fruit", "Temp", "Humid (%)", "Light (Fux)", "CO2 (pmm)", "Class"]
INPUT_COLUMNS = ["Fruit", "Temp", "Humid (%)", "Light (Fux)", "CO2 (pmm)"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare 2 classifiers (Logistic Regression & Naive Bayes) and save the best model for food condition prediction.",
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path("data") / "Dataset_deduplicated.csv",
        help="Path to dataset CSV",
    )
    parser.add_argument(
        "--output-model",
        type=Path,
        default=Path("best_food_condition_model.joblib"),
        help="Output path for saved model",
    )
    parser.add_argument(
        "--output-metadata",
        type=Path,
        default=Path("best_food_condition_model.metadata.json"),
        help="Output path for saved metadata",
    )
    parser.add_argument(
        "--cv-folds",
        type=int,
        default=5,
        help="Number of CV folds",
    )
    return parser.parse_args()


def normalize_label(value: str):
    text = str(value).strip().lower()
    if text in {"good", "fresh", "1"}:
        return 1
    if text in {"bad", "spoiled", "0"}:
        return 0
    return None


def load_dataset(dataset_path: Path):
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    df = pd.read_csv(dataset_path)

    missing_cols = [c for c in EXPECTED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    df = df.copy()
    df["Class"] = df["Class"].map(normalize_label)
    df = df.dropna(subset=INPUT_COLUMNS + ["Class"]).copy()

    df["Fruit"] = df["Fruit"].astype(str).str.strip().str.lower()
    df["Temp"] = pd.to_numeric(df["Temp"], errors="coerce")
    df["Humid (%)"] = pd.to_numeric(df["Humid (%)"], errors="coerce")
    df["Light (Fux)"] = pd.to_numeric(df["Light (Fux)"], errors="coerce")
    df["CO2 (pmm)"] = pd.to_numeric(df["CO2 (pmm)"], errors="coerce")

    df = df.dropna(subset=INPUT_COLUMNS + ["Class"])
    df["Class"] = df["Class"].astype(int)

    if len(df) < 50:
        raise ValueError("Not enough valid rows after preprocessing. Need at least 50 rows.")

    X = df[INPUT_COLUMNS]
    y = df["Class"]
    return X, y


def build_preprocessors():
    categorical_features = ["Fruit"]
    numeric_features = ["Temp", "Humid (%)", "Light (Fux)", "CO2 (pmm)"]

    preprocess_scaled = ColumnTransformer(
        transformers=[
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                categorical_features,
            ),
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_features,
            ),
        ]
    )

    preprocess_unscaled = ColumnTransformer(
        transformers=[
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                categorical_features,
            ),
            (
                "num",
                Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))]),
                numeric_features,
            ),
        ]
    )

    return preprocess_scaled, preprocess_unscaled


def build_models(preprocess_scaled, preprocess_unscaled):
    return {
        "LogisticRegression": Pipeline(
            steps=[
                ("preprocess", preprocess_scaled),
                ("model", LogisticRegression(max_iter=1000, random_state=42)),
            ]
        ),
        "NaiveBayes": Pipeline(
            steps=[
                ("preprocess", preprocess_scaled),
                ("model", GaussianNB()),
            ]
        ),
    }


def evaluate_models(X_train, y_train, models, folds: int):
    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
    results = []
    for name, model in models.items():
        scores = cross_validate(
            model,
            X_train,
            y_train,
            cv=cv,
            scoring={
                "accuracy": "accuracy",
                "precision": "precision",
                "recall": "recall",
                "f1": "f1",
            },
            n_jobs=1,
        )
        results.append(
            {
                "name": name,
                "accuracy_mean": float(scores["test_accuracy"].mean()),
                "accuracy_std": float(scores["test_accuracy"].std()),
                "precision_mean": float(scores["test_precision"].mean()),
                "recall_mean": float(scores["test_recall"].mean()),
                "f1_mean": float(scores["test_f1"].mean()),
            }
        )

    results.sort(key=lambda row: row["accuracy_mean"], reverse=True)
    return results


def main():
    args = parse_args()
    X, y = load_dataset(args.dataset)
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    preprocess_scaled, preprocess_unscaled = build_preprocessors()
    models = build_models(preprocess_scaled, preprocess_unscaled)
    leaderboard = evaluate_models(X_train, y_train, models, folds=args.cv_folds)

    best_name = leaderboard[0]["name"]
    best_model = models[best_name]
    best_model.fit(X_train, y_train)

    y_pred = best_model.predict(X_test)
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()
    test_metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred)),
        "recall": float(recall_score(y_test, y_pred)),
        "f1": float(f1_score(y_test, y_pred)),
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp),
        },
    }
    report = classification_report(y_test, y_pred, target_names=["bad", "good"])

    args.output_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_model, args.output_model)

    metadata = {
        "dataset": str(args.dataset),
        "dataset_rows": int(len(X)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "input_features": INPUT_COLUMNS,
        "target_labels": {"0": "bad", "1": "good"},
        "cv_folds": int(args.cv_folds),
        "leaderboard": leaderboard,
        "selected_model": best_name,
        "selected_accuracy_mean": leaderboard[0]["accuracy_mean"],
        "selected_test_metrics": test_metrics,
        "selected_test_classification_report": report,
    }

    args.output_metadata.parent.mkdir(parents=True, exist_ok=True)
    args.output_metadata.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(json.dumps(
        {
            "saved_model": str(args.output_model),
            "saved_metadata": str(args.output_metadata),
            "selected_model": best_name,
            "selected_accuracy_mean": round(leaderboard[0]["accuracy_mean"], 4),
            "final_test_accuracy": round(test_metrics["accuracy"], 4),
        },
        indent=2,
    ))
    print("\nFinal classification report on untouched test set:\n")
    print(report)


if __name__ == "__main__":
    main()
