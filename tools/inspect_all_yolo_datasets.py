import json
import re
from collections import Counter
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
REPORT_PATH = DATA_DIR / "dataset_inspection_report.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
IGNORED_DIR_NAMES = {
    "unified_aircraft_damage_yolov8",
    "preview",
    "previews",
    "output",
    "outputs",
    "runs",
}


def load_yaml(path):
    try:
        with path.open("r", encoding="utf-8") as handle:
            return yaml.safe_load(handle) or {}
    except Exception as exc:
        return {"_error": str(exc)}


def parse_names(data):
    names = data.get("names", [])
    if isinstance(names, dict):
        return [str(names[key]) for key in sorted(names, key=lambda item: int(item))]
    if isinstance(names, list):
        return [str(name) for name in names]
    return []


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def resolve_split_dir(dataset_dir, data, split, kind):
    split_key = "val" if split == "valid" else split
    raw = data.get(split_key) or data.get(split)
    candidates = []
    if raw:
        raw_path = Path(str(raw))
        if kind == "labels" and raw_path.name == "images":
            raw_path = raw_path.parent / "labels"
        if kind == "images" and raw_path.name == "labels":
            raw_path = raw_path.parent / "images"
        base = dataset_dir
        if data.get("path"):
            path_base = Path(str(data["path"]))
            base = path_base if path_base.is_absolute() else dataset_dir / path_base
        candidates.extend([
            raw_path if raw_path.is_absolute() else base / raw_path,
            raw_path if raw_path.is_absolute() else dataset_dir / raw_path,
        ])
    candidates.append(dataset_dir / split / kind)
    candidates.append(dataset_dir / ("valid" if split == "valid" else split) / kind)
    for candidate in candidates:
        if candidate.exists() and candidate.is_dir():
            return candidate.resolve()
    return (dataset_dir / split / kind).resolve()


def label_is_valid(line, class_count):
    parts = line.strip().split()
    if len(parts) != 5:
        return False
    try:
        class_id = int(float(parts[0]))
        values = [float(value) for value in parts[1:]]
    except ValueError:
        return False
    if class_id < 0 or (class_count and class_id >= class_count):
        return False
    return all(0.0 <= value <= 1.0 for value in values)


def inspect_split(dataset_dir, data, class_count, split):
    image_dir = resolve_split_dir(dataset_dir, data, split, "images")
    label_dir = resolve_split_dir(dataset_dir, data, split, "labels")
    images = sorted([p for p in image_dir.glob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]) if image_dir.exists() else []
    labels = sorted(label_dir.glob("*.txt")) if label_dir.exists() else []
    image_stems = Counter(p.stem for p in images)
    label_stems = Counter(p.stem for p in labels)
    missing_labels = sorted(set(image_stems) - set(label_stems))
    orphan_labels = sorted(set(label_stems) - set(image_stems))
    duplicate_filenames = sorted([name for name, count in image_stems.items() if count > 1])
    empty_labels = []
    invalid_label_lines = []
    for label_path in labels:
        text = label_path.read_text(encoding="utf-8", errors="ignore")
        lines = [line for line in text.splitlines() if line.strip()]
        if not lines:
            empty_labels.append(label_path.name)
        for index, line in enumerate(lines, start=1):
            if not label_is_valid(line, class_count):
                invalid_label_lines.append({
                    "file": label_path.name,
                    "line_number": index,
                    "line": line,
                })
    return {
        "image_dir": str(image_dir),
        "label_dir": str(label_dir),
        "images": len(images),
        "labels": len(labels),
        "missing_labels": missing_labels,
        "missing_labels_count": len(missing_labels),
        "orphan_labels": orphan_labels,
        "orphan_labels_count": len(orphan_labels),
        "empty_label_files": empty_labels,
        "empty_label_files_count": len(empty_labels),
        "invalid_label_lines": invalid_label_lines[:200],
        "invalid_label_lines_count": len(invalid_label_lines),
        "duplicate_filenames": duplicate_filenames,
        "duplicate_filenames_count": len(duplicate_filenames),
        "image_extensions": sorted(set(p.suffix.lower() for p in images)),
    }


def find_datasets():
    if not DATA_DIR.exists():
        return []
    datasets = []
    for child in sorted(DATA_DIR.iterdir()):
        if not child.is_dir() or child.name.startswith("."):
            continue
        if slugify(child.name) in IGNORED_DIR_NAMES or child.name in IGNORED_DIR_NAMES:
            continue
        yaml_path = child / "data.yaml"
        if yaml_path.exists():
            datasets.append(child)
    return datasets


def inspect_dataset(dataset_dir):
    yaml_path = dataset_dir / "data.yaml"
    data = load_yaml(yaml_path)
    names = parse_names(data)
    splits = {
        split: inspect_split(dataset_dir, data, len(names), split)
        for split in ("train", "valid", "test")
    }
    return {
        "name": dataset_dir.name,
        "path": str(dataset_dir),
        "data_yaml": str(yaml_path),
        "yaml_error": data.get("_error"),
        "classes": names,
        "class_count": len(names),
        "splits": splits,
    }


def main():
    DATA_DIR.mkdir(exist_ok=True)
    datasets = [inspect_dataset(path) for path in find_datasets()]
    report = {
        "data_dir": str(DATA_DIR),
        "dataset_count": len(datasets),
        "datasets": datasets,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Found {len(datasets)} YOLO datasets in {DATA_DIR}")
    for dataset in datasets:
        print(f"\n{dataset['name']}")
        print(f"  classes ({dataset['class_count']}): {dataset['classes']}")
        for split, info in dataset["splits"].items():
            print(
                f"  {split}: images={info['images']} labels={info['labels']} "
                f"missing={info['missing_labels_count']} empty={info['empty_label_files_count']} "
                f"invalid={info['invalid_label_lines_count']}"
            )
    print(f"\nSaved report: {REPORT_PATH}")


if __name__ == "__main__":
    main()
