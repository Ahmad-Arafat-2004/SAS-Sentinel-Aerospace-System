import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SMOKE_DATASET = ROOT / "data" / "smoke_dataset"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def load_class_names(data_path):
    data = yaml.safe_load(data_path.read_text(encoding="utf-8")) or {}
    names = data.get("names", {})

    if isinstance(names, dict):
        return {str(k): str(v) for k, v in names.items()}

    return {str(i): str(name) for i, name in enumerate(names)}


def resolve_dataset_root(data_path):
    data = yaml.safe_load(data_path.read_text(encoding="utf-8")) or {}
    raw_path = data.get("path")

    if raw_path:
        candidate = Path(str(raw_path))

        if candidate.is_absolute():
            return candidate

        root_candidate = ROOT / candidate
        if root_candidate.exists():
            return root_candidate

        return data_path.parent / candidate

    return data_path.parent


def split_image_dir(dataset_root, split):
    return dataset_root / split / "images"


def split_label_dir(dataset_root, split):
    return dataset_root / split / "labels"


def image_files(directory):
    if not directory.exists():
        return []

    return sorted(
        [p for p in directory.glob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]
    )


def create_smoke_dataset(source_data_path, limit_train, limit_valid, limit_test):
    source_root = resolve_dataset_root(source_data_path)

    if SMOKE_DATASET.exists():
        shutil.rmtree(SMOKE_DATASET)

    limits = {
        "train": limit_train,
        "valid": limit_valid,
        "test": limit_test,
    }

    copied = {}

    for split, limit in limits.items():
        out_images = SMOKE_DATASET / split / "images"
        out_labels = SMOKE_DATASET / split / "labels"

        out_images.mkdir(parents=True, exist_ok=True)
        out_labels.mkdir(parents=True, exist_ok=True)

        source_images = image_files(split_image_dir(source_root, split))[:limit]

        copied[split] = {"images": 0, "labels": 0}

        for image_path in source_images:
            label_path = split_label_dir(source_root, split) / f"{image_path.stem}.txt"

            shutil.copy2(image_path, out_images / image_path.name)

            if label_path.exists():
                shutil.copy2(label_path, out_labels / label_path.name)
            else:
                (out_labels / f"{image_path.stem}.txt").write_text(
                    "", encoding="utf-8"
                )

            copied[split]["images"] += 1
            copied[split]["labels"] += 1

    source_yaml = yaml.safe_load(source_data_path.read_text(encoding="utf-8")) or {}

    smoke_yaml = {
        "path": "data/smoke_dataset",
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "names": source_yaml.get("names", load_class_names(source_data_path)),
    }

    smoke_data_path = SMOKE_DATASET / "data.yaml"

    with smoke_data_path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(smoke_yaml, handle, sort_keys=False)

    smoke_info = {
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "source_data": str(source_data_path),
        "smoke_data": str(smoke_data_path),
        "counts": copied,
        "note": "Smoke test dataset only. Do not use for final model accuracy.",
    }

    (SMOKE_DATASET / "smoke_dataset_info.json").write_text(
        json.dumps(smoke_info, indent=2),
        encoding="utf-8",
    )

    return smoke_data_path, copied


def main():
    parser = argparse.ArgumentParser(
        description="Train YOLOv8 aircraft damage detection model."
    )

    # Dataset and model
    parser.add_argument(
        "--data",
        default="data/unified_aircraft_damage_yolov8_clean/data.yaml",
        help="Path to YOLO data.yaml file.",
    )
    parser.add_argument(
        "--model",
        default="yolov8s.pt",
        help="YOLO model to train, for example yolov8n.pt, yolov8s.pt, yolov8m.pt.",
    )

    # RTX 4060 safe defaults
    parser.add_argument(
        "--epochs",
        type=int,
        default=30,
        help="Number of training epochs.",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Training image size.",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=8,
        help="Batch size. Safe default for RTX 4060 Laptop 8GB is 8.",
    )
    parser.add_argument(
        "--device",
        default="0",
        help="Training device. Use 0 for GPU, cpu for CPU.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=0,
        help="DataLoader workers. Use 0 on Windows to avoid shared memory errors.",
    )

    # Output
    parser.add_argument(
        "--project",
        default="runs/aircraft_damage",
        help="Project output directory.",
    )
    parser.add_argument(
        "--name",
        default="rtx4060_yolov8s_640_b8_w0",
        help="Training run name.",
    )

    # Smoke test
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Run a tiny CPU smoke training using data/smoke_dataset.",
    )
    parser.add_argument("--limit-train", type=int, default=100)
    parser.add_argument("--limit-valid", type=int, default=30)
    parser.add_argument("--limit-test", type=int, default=30)

    args = parser.parse_args()

    from ultralytics import YOLO

    data_path = (ROOT / args.data).resolve()
    is_smoke = bool(args.smoke)

    if is_smoke:
        data_path, copied = create_smoke_dataset(
            data_path,
            args.limit_train,
            args.limit_valid,
            args.limit_test,
        )

        args.epochs = 1
        args.imgsz = 320
        args.batch = 2
        args.device = "cpu"
        args.workers = 0
        args.project = "runs/aircraft_damage_smoke"

        if args.name == "rtx4060_yolov8s_640_b8_w0":
            args.name = "smoke_dataset_check"

        print("SMOKE TEST ONLY: using mini dataset at data/smoke_dataset")
        print(f"Smoke counts: {copied}")

    print("=" * 70)
    print("YOLOv8 Aircraft Damage Training")
    print("=" * 70)
    print(f"Dataset: {data_path}")
    print(f"Model: {args.model}")
    print(f"Epochs: {args.epochs}")
    print(f"Image size: {args.imgsz}")
    print(f"Batch: {args.batch}")
    print(f"Device: {args.device}")
    print(f"Workers: {args.workers}")
    print(f"Run name: {args.name}")
    print("=" * 70)

    model = YOLO(args.model)

    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        workers=args.workers,
        project=str(ROOT / args.project),
        name=args.name,

        # Stable training settings
        patience=30,
        cos_lr=True,
        close_mosaic=10,
        cache=False,

        # Important for Windows memory problem
        plots=False,
    )

    save_dir = Path(getattr(results, "save_dir", ROOT / args.project / args.name))
    best_path = save_dir / "weights" / "best.pt"

    backend_model_dir = ROOT / "backend" / "model"
    backend_model_dir.mkdir(parents=True, exist_ok=True)

    target_model = backend_model_dir / "best.pt"

    if best_path.exists() and not is_smoke:
        shutil.copy2(best_path, target_model)

    info = {
        "training_date": datetime.now().isoformat(timespec="seconds"),
        "smoke_test": is_smoke,
        "dataset_path": str(data_path),
        "class_names": load_class_names(data_path),
        "model_type": args.model,
        "image_size": args.imgsz,
        "epochs": args.epochs,
        "batch": args.batch,
        "device": args.device,
        "workers": args.workers,
        "run_path": str(save_dir),
        "backend_model_path": str(target_model)
        if best_path.exists() and not is_smoke
        else None,
        "note": "Smoke test only; best.pt was not copied to backend/model."
        if is_smoke
        else "Final training run.",
    }

    info_path = (
        SMOKE_DATASET / "smoke_training_info.json"
        if is_smoke
        else backend_model_dir / "model_info.json"
    )

    info_path.parent.mkdir(parents=True, exist_ok=True)
    info_path.write_text(json.dumps(info, indent=2), encoding="utf-8")

    print("=" * 70)
    print(f"Training complete. Run path: {save_dir}")

    if is_smoke:
        print("SMOKE TEST ONLY: best.pt was not copied to backend/model/best.pt")
        print(f"Smoke training info saved to {info_path}")
    elif best_path.exists():
        print(f"Copied best model to {target_model}")
    else:
        print("Training completed, but best.pt was not found in the run weights folder.")

    print("=" * 70)


if __name__ == "__main__":
    main()