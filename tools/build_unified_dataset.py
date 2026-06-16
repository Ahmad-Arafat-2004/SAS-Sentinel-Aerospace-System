import json
import re
import shutil
from collections import Counter, defaultdict
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_DIR = DATA_DIR / "unified_aircraft_damage_yolov8"
CLASS_MAPPING_REPORT = DATA_DIR / "class_mapping_report.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
UNIFIED_NAMES = [
    "crack",
    "dent",
    "scratch",
    "corrosion",
    "paint_damage",
    "stress_crack",
    "other_damage",
]
UNIFIED_IDS = {name: index for index, name in enumerate(UNIFIED_NAMES)}
IGNORE_DIRS = {"unified_aircraft_damage_yolov8", "preview", "previews", "outputs", "output", "runs"}


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def load_yaml(path):
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def parse_names(data):
    names = data.get("names", [])
    if isinstance(names, dict):
        return [str(names[key]) for key in sorted(names, key=lambda item: int(item))]
    if isinstance(names, list):
        return [str(name) for name in names]
    return []


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


def map_class_name(name):
    value = str(name or "").replace("_", " ").replace("-", " ").strip().lower()
    value = re.sub(r"\s+", " ", value)
    if "stress" in value and "crack" in value:
        return "stress_crack"
    if "crack" in value:
        return "crack"
    if "dent" in value:
        return "dent"
    if "scratch" in value:
        return "scratch"
    if "corrosion" in value or "rust" in value:
        return "corrosion"
    if "paint" in value or "coating" in value:
        return "paint_damage"
    return "other_damage"


def discover_datasets():
    datasets = []
    for child in sorted(DATA_DIR.iterdir()):
        if not child.is_dir() or child.name.startswith("."):
            continue
        if slugify(child.name) in IGNORE_DIRS or child.name in IGNORE_DIRS:
            continue
        yaml_path = child / "data.yaml"
        if yaml_path.exists():
            datasets.append(child)
    return datasets


def valid_yolo_values(parts):
    if len(parts) != 5:
        return None
    try:
        source_class_id = int(float(parts[0]))
        coords = [float(value) for value in parts[1:]]
    except ValueError:
        return None
    if not all(0.0 <= value <= 1.0 for value in coords):
        return None
    if coords[2] <= 0 or coords[3] <= 0:
        return None
    return source_class_id, coords


def reset_output():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    for split in ("train", "valid", "test"):
        (OUTPUT_DIR / split / "images").mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / split / "labels").mkdir(parents=True, exist_ok=True)


def main():
    DATA_DIR.mkdir(exist_ok=True)
    reset_output()
    class_mapping = {}
    unknown_mappings = []
    report = {
        "output_dir": str(OUTPUT_DIR),
        "classes": {str(index): name for index, name in enumerate(UNIFIED_NAMES)},
        "source_datasets": [],
        "splits": {
            split: {
                "images": 0,
                "labels": 0,
                "missing_labels": [],
                "empty_labels": 0,
                "invalid_label_lines": [],
                "class_distribution": Counter(),
            }
            for split in ("train", "valid", "test")
        },
    }

    for dataset_dir in discover_datasets():
        data = load_yaml(dataset_dir / "data.yaml")
        names = parse_names(data)
        slug = slugify(dataset_dir.name)
        source_mapping = {}
        for class_id, class_name in enumerate(names):
            mapped_name = map_class_name(class_name)
            source_mapping[str(class_id)] = {
                "source_name": class_name,
                "unified_name": mapped_name,
                "unified_id": UNIFIED_IDS[mapped_name],
            }
            if mapped_name == "other_damage":
                unknown_mappings.append({"dataset": dataset_dir.name, "source_name": class_name})
        class_mapping[dataset_dir.name] = source_mapping
        dataset_summary = {"name": dataset_dir.name, "classes": names, "splits": {}}

        for split in ("train", "valid", "test"):
            image_dir = resolve_split_dir(dataset_dir, data, split, "images")
            label_dir = resolve_split_dir(dataset_dir, data, split, "labels")
            images = sorted([p for p in image_dir.glob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]) if image_dir.exists() else []
            copied_images = 0
            copied_labels = 0
            for image_path in images:
                label_path = label_dir / f"{image_path.stem}.txt"
                output_stem = f"{slug}_{image_path.stem}"
                output_image = OUTPUT_DIR / split / "images" / f"{output_stem}{image_path.suffix.lower()}"
                output_label = OUTPUT_DIR / split / "labels" / f"{output_stem}.txt"
                shutil.copy2(image_path, output_image)
                copied_images += 1
                remapped_lines = []
                if not label_path.exists():
                    report["splits"][split]["missing_labels"].append(str(label_path))
                    output_label.write_text("", encoding="utf-8")
                    report["splits"][split]["empty_labels"] += 1
                    copied_labels += 1
                    continue
                lines = [line for line in label_path.read_text(encoding="utf-8", errors="ignore").splitlines() if line.strip()]
                if not lines:
                    report["splits"][split]["empty_labels"] += 1
                for line_number, line in enumerate(lines, start=1):
                    parsed = valid_yolo_values(line.split())
                    if not parsed:
                        report["splits"][split]["invalid_label_lines"].append({
                            "file": str(label_path),
                            "line_number": line_number,
                            "line": line,
                        })
                        continue
                    source_class_id, coords = parsed
                    if source_class_id < 0 or source_class_id >= len(names):
                        mapped_name = "other_damage"
                    else:
                        mapped_name = map_class_name(names[source_class_id])
                    mapped_id = UNIFIED_IDS[mapped_name]
                    report["splits"][split]["class_distribution"][mapped_name] += 1
                    remapped_lines.append(
                        f"{mapped_id} {coords[0]:.6f} {coords[1]:.6f} {coords[2]:.6f} {coords[3]:.6f}"
                    )
                output_label.write_text("\n".join(remapped_lines) + ("\n" if remapped_lines else ""), encoding="utf-8")
                copied_labels += 1
            report["splits"][split]["images"] += copied_images
            report["splits"][split]["labels"] += copied_labels
            dataset_summary["splits"][split] = {"images": copied_images, "labels": copied_labels}
        report["source_datasets"].append(dataset_summary)

    data_yaml = {
        "path": "data/unified_aircraft_damage_yolov8",
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "names": {index: name for index, name in enumerate(UNIFIED_NAMES)},
    }
    with (OUTPUT_DIR / "data.yaml").open("w", encoding="utf-8") as handle:
        yaml.safe_dump(data_yaml, handle, sort_keys=False)

    serializable_report = json.loads(json.dumps(report, default=dict))
    for split in serializable_report["splits"].values():
        split["class_distribution"] = dict(split["class_distribution"])
        split["missing_labels_count"] = len(split["missing_labels"])
        split["invalid_label_lines_count"] = len(split["invalid_label_lines"])
        split["invalid_label_lines"] = split["invalid_label_lines"][:500]
    (OUTPUT_DIR / "dataset_report.json").write_text(json.dumps(serializable_report, indent=2), encoding="utf-8")
    CLASS_MAPPING_REPORT.write_text(json.dumps({
        "target_classes": {str(i): name for i, name in enumerate(UNIFIED_NAMES)},
        "source_mappings": class_mapping,
        "mapped_to_other_damage": unknown_mappings,
    }, indent=2), encoding="utf-8")

    print(f"Unified dataset created: {OUTPUT_DIR}")
    for split, info in serializable_report["splits"].items():
        print(
            f"{split}: images={info['images']} labels={info['labels']} "
            f"missing={info['missing_labels_count']} invalid={info['invalid_label_lines_count']} "
            f"empty={info['empty_labels']}"
        )
    print(f"Saved report: {OUTPUT_DIR / 'dataset_report.json'}")
    print(f"Saved class mapping: {CLASS_MAPPING_REPORT}")


if __name__ == "__main__":
    main()
