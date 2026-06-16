import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import yaml


ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def file_hash(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_names(dataset):
    data_yaml = dataset / "data.yaml"
    data = yaml.safe_load(data_yaml.read_text(encoding="utf-8")) or {}
    names = data.get("names", {})
    if isinstance(names, dict):
        return {int(k): str(v) for k, v in names.items()}
    return {i: str(name) for i, name in enumerate(names)}


def parse_label_line(line, class_count):
    parts = line.strip().split()
    if len(parts) != 5:
        return None, "wrong_column_count"
    try:
        class_id = int(float(parts[0]))
        x, y, w, h = [float(value) for value in parts[1:]]
    except ValueError:
        return None, "non_numeric"
    if class_id < 0 or class_id >= class_count:
        return None, "class_id_out_of_range"
    if not all(0.0 <= value <= 1.0 for value in (x, y, w, h)):
        return None, "coordinate_out_of_range"
    if w <= 0 or h <= 0:
        return None, "non_positive_box"
    return (class_id, x, y, w, h), None


def inspect_split(dataset, split, names, remove_duplicates=False):
    image_dir = dataset / split / "images"
    label_dir = dataset / split / "labels"
    images = sorted([p for p in image_dir.glob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]) if image_dir.exists() else []
    labels = sorted(label_dir.glob("*.txt")) if label_dir.exists() else []
    label_stems = {p.stem for p in labels}
    image_stems = {p.stem for p in images}
    report = {
        "images": len(images),
        "labels": len(labels),
        "missing_labels": sorted(image_stems - label_stems),
        "orphan_labels": sorted(label_stems - image_stems),
        "empty_labels": [],
        "invalid_label_values": [],
        "class_distribution": Counter(),
        "tiny_boxes": [],
        "huge_boxes": [],
        "duplicate_image_hashes": [],
        "duplicate_label_hashes": [],
        "broken_images": [],
        "zero_size_images": [],
        "removed_duplicates": [],
    }
    image_hashes = defaultdict(list)
    label_hashes = defaultdict(list)
    for image in images:
        img = cv2.imread(str(image))
        if img is None:
            report["broken_images"].append(image.name)
        elif img.size == 0 or img.shape[0] == 0 or img.shape[1] == 0:
            report["zero_size_images"].append(image.name)
        image_hashes[file_hash(image)].append(image.name)
        label_path = label_dir / f"{image.stem}.txt"
        if not label_path.exists():
            continue
        label_hashes[file_hash(label_path)].append(label_path.name)
        lines = [line for line in label_path.read_text(encoding="utf-8", errors="ignore").splitlines() if line.strip()]
        if not lines:
            report["empty_labels"].append(label_path.name)
        for line_number, line in enumerate(lines, start=1):
            parsed, error = parse_label_line(line, len(names))
            if error:
                report["invalid_label_values"].append({
                    "file": label_path.name,
                    "line_number": line_number,
                    "error": error,
                    "line": line,
                })
                continue
            class_id, _, _, width, height = parsed
            class_name = names[class_id]
            report["class_distribution"][class_name] += 1
            area = width * height
            if area < 0.0004:
                report["tiny_boxes"].append({"file": label_path.name, "line_number": line_number, "area": area})
            if area > 0.65:
                report["huge_boxes"].append({"file": label_path.name, "line_number": line_number, "area": area})
    report["duplicate_image_hashes"] = [files for files in image_hashes.values() if len(files) > 1]
    report["duplicate_label_hashes"] = [files for files in label_hashes.values() if len(files) > 1]
    if remove_duplicates:
        for duplicate_group in report["duplicate_image_hashes"]:
            for duplicate_name in duplicate_group[1:]:
                image_path = image_dir / duplicate_name
                label_path = label_dir / f"{image_path.stem}.txt"
                image_path.unlink(missing_ok=True)
                label_path.unlink(missing_ok=True)
                report["removed_duplicates"].append(duplicate_name)
    report["missing_labels_count"] = len(report["missing_labels"])
    report["empty_labels_count"] = len(report["empty_labels"])
    report["invalid_label_values_count"] = len(report["invalid_label_values"])
    report["tiny_boxes_count"] = len(report["tiny_boxes"])
    report["huge_boxes_count"] = len(report["huge_boxes"])
    report["duplicate_image_count"] = sum(max(0, len(group) - 1) for group in report["duplicate_image_hashes"])
    report["duplicate_label_count"] = sum(max(0, len(group) - 1) for group in report["duplicate_label_hashes"])
    report["class_distribution"] = dict(report["class_distribution"])
    report["tiny_boxes"] = report["tiny_boxes"][:500]
    report["huge_boxes"] = report["huge_boxes"][:500]
    report["invalid_label_values"] = report["invalid_label_values"][:500]
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="data/unified_aircraft_damage_yolov8")
    parser.add_argument("--remove-duplicates", action="store_true")
    args = parser.parse_args()
    dataset = (ROOT / args.dataset).resolve()
    names = load_names(dataset)
    report = {
        "dataset": str(dataset),
        "class_names": names,
        "remove_duplicates": args.remove_duplicates,
        "splits": {
            split: inspect_split(dataset, split, names, args.remove_duplicates)
            for split in ("train", "valid", "test")
        },
    }
    report_path = dataset / "quality_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    for split, info in report["splits"].items():
        print(
            f"{split}: images={info['images']} labels={info['labels']} "
            f"missing={info['missing_labels_count']} empty={info['empty_labels_count']} "
            f"invalid={info['invalid_label_values_count']} duplicate_images={info['duplicate_image_count']}"
        )
    print(f"Saved report: {report_path}")


if __name__ == "__main__":
    main()
