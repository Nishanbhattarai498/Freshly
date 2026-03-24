import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt


def parse_args():
    parser = argparse.ArgumentParser(description="Generate model comparison diagrams as PNG files.")
    parser.add_argument(
        "--metadata",
        type=Path,
        default=Path("best_food_condition_model.metadata.json"),
        help="Path to metadata JSON",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("diagrams"),
        help="Directory where PNG diagrams are saved",
    )
    return parser.parse_args()


def load_metadata(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Metadata file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_metric_bar_chart(names, values, title, y_label, out_path: Path):
    plt.figure(figsize=(10, 5.5))
    bars = plt.bar(names, values)
    plt.title(title)
    plt.ylabel(y_label)
    plt.ylim(min(values) * 0.98, 1.0 if max(values) <= 1.0 else max(values) * 1.02)
    plt.grid(axis="y", alpha=0.25)

    for bar, value in zip(bars, values):
        plt.text(bar.get_x() + bar.get_width() / 2, value, f"{value:.4f}", ha="center", va="bottom")

    plt.tight_layout()
    plt.savefig(out_path, dpi=180)
    plt.close()


def save_ranking_chart(names, values, out_path: Path):
    plt.figure(figsize=(10, 5.5))
    y_pos = list(range(len(names)))
    plt.barh(y_pos, values)
    plt.yticks(y_pos, names)
    plt.gca().invert_yaxis()
    plt.title("Final Model Ranking (by Accuracy)")
    plt.xlabel("Accuracy")
    plt.xlim(min(values) * 0.98, 1.0)
    plt.grid(axis="x", alpha=0.25)

    for i, value in enumerate(values):
        plt.text(value, i, f"  {value:.4f}", va="center")

    plt.tight_layout()
    plt.savefig(out_path, dpi=180)
    plt.close()


def save_confusion_matrix(cm, out_path: Path):
    matrix = [[cm["tn"], cm["fp"]], [cm["fn"], cm["tp"]]]

    plt.figure(figsize=(6, 5))
    plt.imshow(matrix)
    plt.title("Best Model Train Confusion Matrix")
    plt.colorbar()
    plt.xticks([0, 1], ["Pred Bad", "Pred Good"])
    plt.yticks([0, 1], ["True Bad", "True Good"])

    for i in range(2):
        for j in range(2):
            plt.text(j, i, str(matrix[i][j]), ha="center", va="center")

    plt.tight_layout()
    plt.savefig(out_path, dpi=180)
    plt.close()


def main():
    args = parse_args()
    data = load_metadata(args.metadata)
    leaderboard = data.get("leaderboard", [])
    if not leaderboard:
        raise ValueError("Leaderboard is empty in metadata JSON.")

    args.out_dir.mkdir(parents=True, exist_ok=True)

    names = [row["name"] for row in leaderboard]
    accuracy = [float(row["accuracy_mean"]) for row in leaderboard]
    precision = [float(row.get("precision_mean", 0.0)) for row in leaderboard]
    recall = [float(row.get("recall_mean", 0.0)) for row in leaderboard]
    f1 = [float(row.get("f1_mean", 0.0)) for row in leaderboard]

    save_metric_bar_chart(
        names,
        accuracy,
        "Accuracy Comparison (5-fold CV)",
        "Accuracy",
        args.out_dir / "accuracy_comparison.png",
    )
    save_metric_bar_chart(
        names,
        precision,
        "Precision Comparison (5-fold CV)",
        "Precision",
        args.out_dir / "precision_comparison.png",
    )
    save_metric_bar_chart(
        names,
        recall,
        "Recall Comparison (5-fold CV)",
        "Recall",
        args.out_dir / "recall_comparison.png",
    )
    save_metric_bar_chart(
        names,
        f1,
        "F1 Comparison (5-fold CV)",
        "F1",
        args.out_dir / "f1_comparison.png",
    )
    save_ranking_chart(names, accuracy, args.out_dir / "final_ranking.png")

    cm = data.get("selected_train_metrics", {}).get("confusion_matrix")
    if isinstance(cm, dict) and all(k in cm for k in ("tn", "fp", "fn", "tp")):
        save_confusion_matrix(cm, args.out_dir / "best_model_confusion_matrix.png")

    print(json.dumps({
        "success": True,
        "output_dir": str(args.out_dir),
        "files": sorted([p.name for p in args.out_dir.glob("*.png")]),
    }, indent=2))


if __name__ == "__main__":
    main()
