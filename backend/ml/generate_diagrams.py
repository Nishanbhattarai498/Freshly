import json
from pathlib import Path
import matplotlib.pyplot as plt


def save_metric_bar_chart(names, values, title, y_label, out_path: Path):
    plt.figure(figsize=(8, 5))
    bars = plt.bar(names, values, color=["#4C72B0", "#55A868"])
    plt.title(title)
    plt.ylabel(y_label)
    plt.ylim(0, 1.05)

    for bar, value in zip(bars, values):
        plt.text(bar.get_x() + bar.get_width() / 2, value + 0.01, f"{value:.4f}", ha="center", va="bottom")

    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()


def save_ranking_chart(names, values, out_path: Path):
    plt.figure(figsize=(8, 5))
    y_pos = list(range(len(names)))
    plt.barh(y_pos, values, color=["#4C72B0", "#55A868"])
    plt.yticks(y_pos, names)
    plt.gca().invert_yaxis()
    plt.title("Final Model Ranking (by Accuracy)")
    plt.xlabel("Accuracy")
    plt.xlim(0, 1.0)

    for i, value in enumerate(values):
        plt.text(value, i, f"  {value:.4f}", va="center")

    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()

def main():
    metadata_path = Path("best_food_condition_model.metadata.json")
    out_dir = Path("diagrams")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    if not metadata_path.exists():
        print("Metadata not found.")
        return
        
    data = json.loads(metadata_path.read_text(encoding="utf-8"))
    leaderboard = data.get("leaderboard", [])

    if not leaderboard:
        print("Leaderboard is empty in metadata.")
        return
    
    names = [row["name"] for row in leaderboard]
    accuracy = [float(row["accuracy_mean"]) for row in leaderboard]
    precision = [float(row.get("precision_mean", 0.0)) for row in leaderboard]
    recall = [float(row.get("recall_mean", 0.0)) for row in leaderboard]
    f1 = [float(row.get("f1_mean", 0.0)) for row in leaderboard]

    save_metric_bar_chart(
        names,
        accuracy,
        "Model Accuracy Comparison",
        "Accuracy",
        out_dir / "accuracy_comparison.png",
    )
    save_metric_bar_chart(
        names,
        precision,
        "Model Precision Comparison",
        "Precision",
        out_dir / "precision_comparison.png",
    )
    save_metric_bar_chart(
        names,
        recall,
        "Model Recall Comparison",
        "Recall",
        out_dir / "recall_comparison.png",
    )
    save_metric_bar_chart(
        names,
        f1,
        "Model F1 Comparison",
        "F1 Score",
        out_dir / "f1_comparison.png",
    )
    save_ranking_chart(names, accuracy, out_dir / "final_ranking.png")
    
    # Final test metrics confusion matrix (fallback to older train-metrics key).
    cm = data.get("selected_test_metrics", {}).get("confusion_matrix")
    if not cm:
        cm = data.get("selected_train_metrics", {}).get("confusion_matrix")
    if cm:
        matrix = [[cm["tn"], cm["fp"]], [cm["fn"], cm["tp"]]]
        plt.figure(figsize=(6, 5))
        plt.imshow(matrix, interpolation="nearest", cmap=plt.cm.Blues)
        plt.title(f"Confusion Matrix ({data.get('selected_model')})")
        plt.colorbar()
        plt.xticks([0, 1], ["Predicted Bad", "Predicted Good"])
        plt.yticks([0, 1], ["True Bad", "True Good"])
        
        for i in range(2):
            for j in range(2):
                plt.text(j, i, str(matrix[i][j]), ha="center", va="center", color="white" if matrix[i][j] > (max(cm.values()) / 2) else "black")
                
        plt.tight_layout()
        plt.savefig(out_dir / "best_model_confusion_matrix.png", dpi=150)
        plt.close()
        
    files = sorted([p.name for p in out_dir.glob("*.png")])
    print(json.dumps({"success": True, "output_dir": str(out_dir), "files": files}, indent=2))

if __name__ == "__main__":
    main()
