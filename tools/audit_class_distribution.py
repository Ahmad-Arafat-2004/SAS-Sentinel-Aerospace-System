import json
from collections import Counter, defaultdict
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "data" / "unified_aircraft_damage_yolov8"
REPORT = DATASET / "class_distribution_report.json"


def load_names():
    data = yaml.safe_load((DATASET / "data.yaml").read_text(encoding="utf-8")) or {}
    names = data.get("names", {})
    if isinstance(names, dict):
        return {int(k): str(v) for k, v in names.items()}
    return {i: str(name) for i, name in enumerate(names)}


def inspect_split(split, names):
    label_dir = DATASET / split / "labels"
    image_dir = DATASET / split / "images"
    labels = sorted(label_dir.glob("*.txt"))
    image_count = len([p for p in image_dir.glob("*") if p.is_file()])
    boxes = Counter()
    images_by_class = defaultdict(set)
    empty_labels = 0
    invalid_lines = []
    total_boxes = 0

    for label in labels:
        lines = [line for line in label.read_text(encoding="utf-8", errors="ignore").splitlines() if line.strip()]
        if not lines:
            empty_labels += 1
        for line_number, line in enumerate(lines, start=1):
            parts = line.split()
            if len(parts) != 5:
                invalid_lines.append({"file": label.name, "line_number": line_number, "reason": "wrong_format", "line": line})
                continue
            try:
                class_id = int(float(parts[0]))
                coords = [float(v) for v in parts[1:]]
            except ValueError:
                invalid_lines.append({"file": label.name, "line_number": line_number, "reason": "non_numeric", "line": line})
                continue
            if class_id not in names or not all(0 <= v <= 1 for v in coords):
                invalid_lines.append({"file": label.name, "line_number": line_number, "reason": "invalid_value", "line": line})
                continue
            class_name = names[class_id]
            boxes[class_name] += 1
            images_by_class[class_name].add(label.stem)
            total_boxes += 1

    return {
        "images": image_count,
        "labels": len(labels),
        "empty_labels": empty_labels,
        "total_boxes": total_boxes,
        "average_boxes_per_image": round(total_boxes / image_count, 4) if image_count else 0,
        "boxes_per_class": {names[i]: boxes[names[i]] for i in sorted(names)},
        "images_containing_class": {names[i]: len(images_by_class[names[i]]) for i in sorted(names)},
        "invalid_lines": invalid_lines[:100],
        "invalid_lines_count": len(invalid_lines),
    }


def main():
    names = load_names()
    splits = {split: inspect_split(split, names) for split in ("train", "valid", "test")}
    total_boxes_by_class = Counter()
    images_by_class_total = Counter()
    total_boxes = 0
    total_images = 0
    total_empty = 0
    for split_info in splits.values():
        total_boxes += split_info["total_boxes"]
        total_images += split_info["images"]
        total_empty += split_info["empty_labels"]
        for name, count in split_info["boxes_per_class"].items():
            total_boxes_by_class[name] += count
        for name, count in split_info["images_containing_class"].items():
            images_by_class_total[name] += count

    warnings = []
    for name in names.values():
        count = total_boxes_by_class[name]
        pct = (count / total_boxes * 100) if total_boxes else 0
        if count < 200:
            warnings.append(f"{name} has very low box count: {count}")
        elif pct < 1.0:
            warnings.append(f"{name} is under 1% of boxes: {pct:.2f}%")
    other = total_boxes_by_class["other_damage"]
    real_total = total_boxes - other
    if real_total and other / real_total > 0.20:
        warnings.append(f"other_damage is high relative to real classes: {other} vs {real_total} ({other / real_total:.2%})")

    totals = {
        "images": total_images,
        "empty_labels": total_empty,
        "total_boxes": total_boxes,
        "average_boxes_per_image": round(total_boxes / total_images, 4) if total_images else 0,
        "boxes_per_class": dict(total_boxes_by_class),
        "images_containing_class": dict(images_by_class_total),
        "percentage_per_class": {
            name: round((total_boxes_by_class[name] / total_boxes * 100), 4) if total_boxes else 0
            for name in names.values()
        },
    }
    report = {
        "dataset": str(DATASET),
        "classes": {str(k): v for k, v in names.items()},
        "splits": splits,
        "totals": totals,
        "warnings": warnings,
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("Class distribution summary")
    for split, info in splits.items():
        print(f"{split}: images={info['images']} empty={info['empty_labels']} boxes={info['total_boxes']} avg_boxes={info['average_boxes_per_image']}")
        print(f"  {info['boxes_per_class']}")
    print(f"totals: {totals['boxes_per_class']}")
    print(f"percentages: {totals['percentage_per_class']}")
    for warning in warnings:
        print(f"WARNING: {warning}")
    print(f"Saved report: {REPORT}")


if __name__ == "__main__":
    main()
