import argparse
import hashlib
import json
import shutil
from collections import defaultdict
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "data" / "unified_aircraft_damage_yolov8"
CLEAN_DATASET = ROOT / "data" / "unified_aircraft_damage_yolov8_clean"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SPLIT_PRIORITY = {"train": 0, "valid": 1, "test": 2}


def hash_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def collect_images(dataset):
    hashes = defaultdict(list)
    for split in ("train", "valid", "test"):
        for image in sorted((dataset / split / "images").glob("*")):
            if image.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            label = dataset / split / "labels" / f"{image.stem}.txt"
            hashes[hash_file(image)].append({
                "split": split,
                "image": str(image.relative_to(dataset)),
                "label": str(label.relative_to(dataset)),
                "label_exists": label.exists(),
                "filename": image.name,
            })
    return hashes


def choose_keep(group):
    return sorted(group, key=lambda item: (SPLIT_PRIORITY[item["split"]], item["filename"]))[0]


def copy_clean_dataset(groups):
    if CLEAN_DATASET.exists():
        shutil.rmtree(CLEAN_DATASET)
    kept = []
    removed = []
    remove_keys = set()
    for digest, group in groups.items():
        if len(group) <= 1:
            continue
        keep = choose_keep(group)
        kept.append({"hash": digest, "kept": keep, "duplicates": group})
        for item in group:
            if item is not keep and item != keep:
                remove_keys.add((item["split"], item["filename"]))
                removed.append({"hash": digest, **item})
    for split in ("train", "valid", "test"):
        (CLEAN_DATASET / split / "images").mkdir(parents=True, exist_ok=True)
        (CLEAN_DATASET / split / "labels").mkdir(parents=True, exist_ok=True)
        for image in sorted((DATASET / split / "images").glob("*")):
            if image.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            if (split, image.name) in remove_keys:
                continue
            label = DATASET / split / "labels" / f"{image.stem}.txt"
            shutil.copy2(image, CLEAN_DATASET / split / "images" / image.name)
            if label.exists():
                shutil.copy2(label, CLEAN_DATASET / split / "labels" / label.name)
            else:
                (CLEAN_DATASET / split / "labels" / f"{image.stem}.txt").write_text("", encoding="utf-8")
    data = yaml.safe_load((DATASET / "data.yaml").read_text(encoding="utf-8")) or {}
    data["path"] = "data/unified_aircraft_damage_yolov8_clean"
    with (CLEAN_DATASET / "data.yaml").open("w", encoding="utf-8") as handle:
        yaml.safe_dump(data, handle, sort_keys=False)
    counts = {}
    for split in ("train", "valid", "test"):
        counts[split] = {
            "images": len(list((CLEAN_DATASET / split / "images").glob("*"))),
            "labels": len(list((CLEAN_DATASET / split / "labels").glob("*.txt"))),
        }
    cleaning_report = {
        "source_dataset": str(DATASET),
        "clean_dataset": str(CLEAN_DATASET),
        "removed_exact_duplicate_images": len(removed),
        "kept_groups": kept[:1000],
        "removed": removed[:2000],
        "counts": counts,
        "rule": "Exact SHA256 duplicate images only. First occurrence kept by train > valid > test priority, then filename.",
    }
    (CLEAN_DATASET / "cleaning_report.json").write_text(json.dumps(cleaning_report, indent=2), encoding="utf-8")
    return cleaning_report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--create-clean", action="store_true")
    args = parser.parse_args()
    groups = collect_images(DATASET)
    duplicate_groups = {digest: group for digest, group in groups.items() if len(group) > 1}
    duplicate_count = sum(len(group) - 1 for group in duplicate_groups.values())
    report = {
        "dataset": str(DATASET),
        "duplicate_group_count": len(duplicate_groups),
        "duplicate_image_count": duplicate_count,
        "groups": [
            {"hash": digest, "count": len(group), "items": group}
            for digest, group in duplicate_groups.items()
        ],
    }
    report_path = DATASET / "duplicate_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Duplicate groups: {len(duplicate_groups)}")
    print(f"Duplicate images beyond first: {duplicate_count}")
    print(f"Saved report: {report_path}")
    if args.create_clean:
        cleaning_report = copy_clean_dataset(duplicate_groups)
        print(f"Clean dataset created: {CLEAN_DATASET}")
        print(f"Removed exact duplicates: {cleaning_report['removed_exact_duplicate_images']}")
        print(f"Counts: {cleaning_report['counts']}")


if __name__ == "__main__":
    main()
