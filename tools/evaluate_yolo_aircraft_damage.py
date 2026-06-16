import argparse
import json
import shutil
import tempfile
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def build_remapped_test_set(original_label_dir, image_dir, model_names, dataset_names):
    """
    Copies test labels into a temp directory, remapping class indices from
    the dataset's class list to the model's class list.
    Labels whose class has no match in the model are dropped.
    Returns (tmp_dir, remapped_label_dir, remapped_image_dir).
    """
    # dataset index → model index (None = drop)
    remap = {}
    for ds_idx, ds_name in dataset_names.items():
        for m_idx, m_name in model_names.items():
            if ds_name == m_name:
                remap[ds_idx] = m_idx
                break

    print(f"Class remapping (dataset → model): {remap}")

    tmp_dir = Path(tempfile.mkdtemp(prefix="yolo_eval_"))
    tmp_labels = tmp_dir / "labels"
    tmp_images = tmp_dir / "images"
    tmp_labels.mkdir()
    tmp_images.mkdir()

    label_dir = Path(original_label_dir)
    for label_file in label_dir.glob("*.txt"):
        if not label_file.exists():
            continue
        lines_out = []
        try:
            raw_lines = label_file.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in raw_lines:
            parts = line.strip().split()
            if not parts:
                continue
            cls = int(parts[0])
            new_cls = remap.get(cls)
            if new_cls is None:
                continue
            lines_out.append(f"{new_cls} " + " ".join(parts[1:]))

        if lines_out:
            (tmp_labels / label_file.name).write_text(
                "\n".join(lines_out), encoding="utf-8"
            )
            # Symlink or copy matching image
            stem = label_file.stem
            for ext in (".jpg", ".jpeg", ".png", ".bmp"):
                img = Path(image_dir) / (stem + ext)
                if img.exists():
                    shutil.copy2(img, tmp_images / img.name)
                    break

    return tmp_dir, tmp_labels, tmp_images


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/unified_aircraft_damage_yolov8/data.yaml")
    parser.add_argument("--model", default="backend/model/best.pt")
    parser.add_argument("--conf", type=float, default=0.4)
    parser.add_argument("--iou", type=float, default=0.5)
    args = parser.parse_args()

    from ultralytics import YOLO

    data_path = (ROOT / args.data).resolve()
    model_path = (ROOT / args.model).resolve()

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    model = YOLO(str(model_path))
    model_names = model.names  # {0: 'crack', 1: 'dent', ...}

    with open(data_path, encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)

    dataset_names = data_cfg.get("names", {})
    if isinstance(dataset_names, list):
        dataset_names = dict(enumerate(dataset_names))

    dataset_root = Path(data_cfg.get("path", data_path.parent)).resolve()
    test_image_dir = dataset_root / data_cfg.get("test", "test/images")
    test_label_dir = test_image_dir.parent.parent / "labels" / test_image_dir.name.replace(
        "images", ""
    ).strip("/")
    # Simpler: images are at test/images, labels at test/labels
    test_label_dir = dataset_root / "test" / "labels"

    # Check if a remap is needed
    needs_remap = set(dataset_names.keys()) != set(model_names.keys()) or any(
        dataset_names.get(k) != model_names.get(k) for k in model_names
    )

    tmp_dir = None
    try:
        if needs_remap:
            print(
                f"Dataset has {len(dataset_names)} classes, model has {len(model_names)}. "
                "Building remapped test set..."
            )
            tmp_dir, tmp_labels, tmp_images = build_remapped_test_set(
                test_label_dir, test_image_dir, model_names, dataset_names
            )
            remapped_yaml = tmp_dir / "data.yaml"
            remapped_yaml.write_text(
                yaml.dump(
                    {
                        "path": str(tmp_dir),
                        "train": "images",
                        "val": "images",
                        "test": "images",
                        "nc": len(model_names),
                        "names": model_names,
                    }
                ),
                encoding="utf-8",
            )
            eval_data = str(remapped_yaml)
            print(f"Remapped test set at: {tmp_dir} ({len(list(tmp_images.iterdir()))} images)")
        else:
            eval_data = str(data_path)

        metrics = model.val(
            data=eval_data,
            conf=args.conf,
            iou=args.iou,
            split="test",
            project=str(ROOT / "runs" / "aircraft_damage"),
            name="test_predictions",
            plots=True,
            save_json=True,
        )

        box = metrics.box
        result = {
            "model": str(model_path),
            "data": str(data_path),
            "conf": args.conf,
            "iou": args.iou,
            "precision": float(box.mp),
            "recall": float(box.mr),
            "mAP50": float(box.map50),
            "mAP50_95": float(box.map),
            "class_results": {
                model_names[i]: {
                    "precision": float(box.p[i]) if i < len(box.p) else None,
                    "recall": float(box.r[i]) if i < len(box.r) else None,
                    "mAP50": float(box.ap50[i]) if i < len(box.ap50) else None,
                }
                for i in range(len(model_names))
            },
        }

        output_path = ROOT / "backend" / "model" / "evaluation_metrics.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        print(f"Saved metrics: {output_path}")
        print(f"Prediction previews: {ROOT / 'runs' / 'aircraft_damage' / 'test_predictions'}")

    finally:
        if tmp_dir and tmp_dir.exists():
            shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
