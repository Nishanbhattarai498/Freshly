import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt


def parse_args():
    parser = argparse.ArgumentParser(description="Generate diagrams for external test evaluation.")
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("external_like_test_report.json"),
        help="Path to external test report JSON",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("diagrams") / "external_test",
        help="Output directory for diagram PNG files",
    )
    return parser.parse_args()


def load_report(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Report not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_metrics_chart(metrics, out_path: Path):
    labels = ["Accuracy", "Precision", "Recall", "F1"]
    values = [
        float(metrics["accuracy"]),
        float(metrics["precision"]),
        float(metrics["recall"]),
        float(metrics["f1"]),
    ]

    plt.figure(figsize=(8, 5))
    bars = plt.bar(labels, values)
    plt.title("External Test Metrics")
    plt.ylim(0, 1.0)
    plt.grid(axis="y", alpha=0.25)

    for bar, value in zip(bars, values):
        plt.text(bar.get_x() + bar.get_width() / 2, value, f"{value:.4f}", ha="center", va="bottom")

    plt.tight_layout()
    plt.savefig(out_path, dpi=180)
    plt.close()


def save_confusion_matrix(confusion, out_path: Path):
    matrix = [
        [int(confusion["tn"]), int(confusion["fp"])],
        [int(confusion["fn"]), int(confusion["tp"])],
    ]

    plt.figure(figsize=(6, 5))
    plt.imshow(matrix)
    plt.title("External Test Confusion Matrix")
    plt.colorbar()
    plt.xticks([0, 1], ["Pred Bad", "Pred Good"])
    plt.yticks([0, 1], ["True Bad", "True Good"])

    for i in range(2):
        for j in range(2):
            plt.text(j, i, str(matrix[i][j]), ha="center", va="center")

    plt.tight_layout()
    plt.savefig(out_path, dpi=180)
    plt.close()


def save_class_balance(class_balance, out_path: Path):
    labels = ["Good", "Bad"]
    values = [int(class_balance["good"]), int(class_balance["bad"])]

    plt.figure(figsize=(7, 5))
    bars = plt.bar(labels, values)
    plt.title("External Test Class Balance")
    plt.ylabel("Rows")
    plt.grid(axis="y", alpha=0.25)

    for bar, value in zip(bars, values):
        plt.text(bar.get_x() + bar.get_width() / 2, value, f"{value}", ha="center", va="bottom")

    plt.tight_layout()
    plt.savefig(out_path, dpi=180)
    plt.close()


def save_combined_dashboard(metrics, confusion, class_balance, out_path: Path):
    fig, axes = plt.subplots(2, 2, figsize=(13, 9))
    fig.suptitle("External Test Evaluation Dashboard", fontsize=16, fontweight="bold")

    # Panel 1: metrics bar chart
    labels = ["Accuracy", "Precision", "Recall", "F1"]
    values = [
        float(metrics["accuracy"]),
        float(metrics["precision"]),
        float(metrics["recall"]),
        float(metrics["f1"]),
    ]
    bars = axes[0, 0].bar(labels, values)
    axes[0, 0].set_title("Metrics")
    axes[0, 0].set_ylim(0, 1.0)
    axes[0, 0].grid(axis="y", alpha=0.25)
    for bar, value in zip(bars, values):
        axes[0, 0].text(bar.get_x() + bar.get_width() / 2, value, f"{value:.4f}", ha="center", va="bottom")

    # Panel 2: confusion matrix heatmap
    matrix = [
        [int(confusion["tn"]), int(confusion["fp"])],
        [int(confusion["fn"]), int(confusion["tp"])],
    ]
    im = axes[0, 1].imshow(matrix)
    axes[0, 1].set_title("Confusion Matrix")
    axes[0, 1].set_xticks([0, 1], ["Pred Bad", "Pred Good"])
    axes[0, 1].set_yticks([0, 1], ["True Bad", "True Good"])
    for i in range(2):
        for j in range(2):
            axes[0, 1].text(j, i, str(matrix[i][j]), ha="center", va="center")
    fig.colorbar(im, ax=axes[0, 1], fraction=0.046, pad=0.04)

    # Panel 3: class balance
    class_labels = ["Good", "Bad"]
    class_values = [int(class_balance["good"]), int(class_balance["bad"])]
    balance_bars = axes[1, 0].bar(class_labels, class_values)
    axes[1, 0].set_title("Class Balance")
    axes[1, 0].set_ylabel("Rows")
    axes[1, 0].grid(axis="y", alpha=0.25)
    for bar, value in zip(balance_bars, class_values):
        axes[1, 0].text(bar.get_x() + bar.get_width() / 2, value, f"{value}", ha="center", va="bottom")

    # Panel 4: summary text
    axes[1, 1].axis("off")
    summary = (
        f"External Test Summary\n\n"
        f"Accuracy:  {metrics['accuracy']:.4f}\n"
        f"Precision: {metrics['precision']:.4f}\n"
        f"Recall:    {metrics['recall']:.4f}\n"
        f"F1 Score:  {metrics['f1']:.4f}\n\n"
        f"TN: {confusion['tn']}   FP: {confusion['fp']}\n"
        f"FN: {confusion['fn']}   TP: {confusion['tp']}\n\n"
        f"Good rows: {class_balance['good']}\n"
        f"Bad rows:  {class_balance['bad']}"
    )
    axes[1, 1].text(0.02, 0.98, summary, va="top", ha="left", fontsize=11)

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    plt.savefig(out_path, dpi=200)
    plt.close()


def main():
    args = parse_args()
    report = load_report(args.report)
    args.out_dir.mkdir(parents=True, exist_ok=True)

    metrics = report.get("metrics", {})
    confusion = metrics.get("confusion_matrix", {})
    class_balance = report.get("class_balance", {})

    if not all(k in metrics for k in ("accuracy", "precision", "recall", "f1")):
        raise ValueError("Metrics section is incomplete in external report")
    if not all(k in confusion for k in ("tn", "fp", "fn", "tp")):
        raise ValueError("Confusion matrix is incomplete in external report")
    if not all(k in class_balance for k in ("good", "bad")):
        raise ValueError("Class balance is incomplete in external report")

    save_metrics_chart(metrics, args.out_dir / "external_test_metrics.png")
    save_confusion_matrix(confusion, args.out_dir / "external_test_confusion_matrix.png")
    save_class_balance(class_balance, args.out_dir / "external_test_class_balance.png")
    save_combined_dashboard(
        metrics,
        confusion,
        class_balance,
        args.out_dir / "external_test_dashboard.png",
    )

    print(json.dumps({
        "success": True,
        "output_dir": str(args.out_dir),
        "files": sorted([p.name for p in args.out_dir.glob("*.png")]),
    }, indent=2))


if __name__ == "__main__":
    main()
