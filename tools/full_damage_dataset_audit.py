# ============================================================
# Full YOLO Damage Dataset Audit / Preprocessing Report
# File: tools/full_damage_dataset_audit.py
#
# This script does NOT modify your dataset.
# It creates a full report about:
# - Image/label counts
# - Class distribution
# - Bounding-box distribution
# - Missing labels
# - Empty labels
# - Invalid labels
# - Corrupt images
# - Image sizes
# - Duplicate / near-duplicate images
# - Possible augmentation patterns
# - Cross-split leakage: train vs valid/test duplicates
# - Preview images with boxes
# ============================================================

import argparse
import csv
import json
import math
import re
import shutil
from collections import defaultdict, Counter
from pathlib import Path

import cv2
import yaml
from PIL import Image

try:
    import imagehash
    IMAGEHASH_AVAILABLE = True
except Exception:
    IMAGEHASH_AVAILABLE = False

try:
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except Exception:
    MATPLOTLIB_AVAILABLE = False


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ============================================================
# YAML / Names
# ============================================================

def load_yaml(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def normalize_names(names):
    if names is None:
        return {}

    if isinstance(names, list):
        return {i: str(name) for i, name in enumerate(names)}

    if isinstance(names, dict):
        return {int(k): str(v) for k, v in names.items()}

    raise ValueError("Invalid names format in data.yaml")


def find_data_yaml(dataset_root: Path):
    candidates = [
        dataset_root / "data.yaml",
        dataset_root / "data.yml",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def resolve_dataset(dataset_root: Path, data_yaml: Path = None, manual_names=None):
    dataset_root = dataset_root.resolve()

    if data_yaml:
        data_yaml = data_yaml.resolve()
    else:
        data_yaml = find_data_yaml(dataset_root)

    if data_yaml and data_yaml.exists():
        data = load_yaml(data_yaml)

        root = Path(data.get("path", dataset_root)).resolve()

        train_images = root / data.get("train", "train/images")
        val_images = root / data.get("val", data.get("valid", "valid/images"))
        test_images = root / data.get("test", "test/images")

        names = normalize_names(data.get("names"))
    else:
        root = dataset_root
        train_images = root / "train" / "images"

        if (root / "valid").exists():
            val_images = root / "valid" / "images"
        else:
            val_images = root / "val" / "images"

        test_images = root / "test" / "images"

        names = {}

    if manual_names:
        names = {i: name.strip() for i, name in enumerate(manual_names.split(","))}

    return {
        "root": root,
        "data_yaml": data_yaml,
        "train_images": train_images,
        "valid_images": val_images,
        "test_images": test_images,
        "names": names,
    }


# ============================================================
# File Helpers
# ============================================================

def find_images(images_dir: Path):
    if not images_dir.exists():
        return []

    return [
        p for p in images_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    ]


def image_to_label_path(image_path: Path):
    parts = list(image_path.parts)

    for i, part in enumerate(parts):
        if part.lower() == "images":
            parts[i] = "labels"
            break

    return Path(*parts).with_suffix(".txt")


def read_yolo_label(label_path: Path):
    boxes = []
    errors = []

    if not label_path.exists():
        return boxes, errors

    try:
        lines = label_path.read_text(encoding="utf-8").splitlines()
    except Exception as e:
        return boxes, [f"Cannot read label file: {e}"]

    for line_no, line in enumerate(lines, start=1):
        raw = line.strip()

        if not raw:
            continue

        parts = raw.split()

        if len(parts) < 5:
            errors.append(f"Line {line_no}: less than 5 values: {raw}")
            continue

        try:
            class_id = int(float(parts[0]))
            x = float(parts[1])
            y = float(parts[2])
            w = float(parts[3])
            h = float(parts[4])

            boxes.append({
                "class_id": class_id,
                "x": x,
                "y": y,
                "w": w,
                "h": h,
                "line_no": line_no,
                "raw": raw
            })

        except Exception:
            errors.append(f"Line {line_no}: parse error: {raw}")

    return boxes, errors


def get_image_info(image_path: Path):
    image = cv2.imread(str(image_path))

    if image is None:
        return None

    h, w = image.shape[:2]

    return {
        "width": int(w),
        "height": int(h),
        "channels": int(image.shape[2]) if len(image.shape) == 3 else 1,
    }


# ============================================================
# Augmentation / Duplicate Checks
# ============================================================

def simplified_original_key(filename: str):
    """
    Attempts to detect Roboflow-style related images.
    Example:
    image_jpg.rf.abc123.jpg -> image_jpg
    """
    name = Path(filename).stem

    # Roboflow pattern
    if ".rf." in filename:
        return filename.split(".rf.")[0]

    # Common suffix patterns
    name = re.sub(r"(_jpg|_jpeg|_png)$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"(_aug\d+|_flip|_rot|_rotate|_blur|_bright|_dark)$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"[-_](\d{1,3})$", "", name)

    return name.lower()


def compute_phash(image_path: Path):
    if not IMAGEHASH_AVAILABLE:
        return None

    try:
        img = Image.open(image_path).convert("RGB")
        return imagehash.phash(img)
    except Exception:
        return None


def find_near_duplicates(image_records, threshold=6, max_examples=100):
    """
    image_records: list of dicts with image_path and phash
    """
    valid = [r for r in image_records if r.get("phash") is not None]
    pairs = []
    count = 0

    for i in range(len(valid)):
        h1 = valid[i]["phash"]

        for j in range(i + 1, len(valid)):
            h2 = valid[j]["phash"]
            distance = h1 - h2

            if distance <= threshold:
                count += 1

                if len(pairs) < max_examples:
                    pairs.append({
                        "image_1": str(valid[i]["image_path"]),
                        "split_1": valid[i]["split"],
                        "image_2": str(valid[j]["image_path"]),
                        "split_2": valid[j]["split"],
                        "distance": int(distance)
                    })

    return count, pairs


def find_cross_split_duplicate_examples(image_records, threshold=6, max_examples=100):
    valid = [r for r in image_records if r.get("phash") is not None]
    pairs = []
    count = 0

    for i in range(len(valid)):
        for j in range(i + 1, len(valid)):
            if valid[i]["split"] == valid[j]["split"]:
                continue

            distance = valid[i]["phash"] - valid[j]["phash"]

            if distance <= threshold:
                count += 1

                if len(pairs) < max_examples:
                    pairs.append({
                        "image_1": str(valid[i]["image_path"]),
                        "split_1": valid[i]["split"],
                        "image_2": str(valid[j]["image_path"]),
                        "split_2": valid[j]["split"],
                        "distance": int(distance)
                    })

    return count, pairs


# ============================================================
# Preview
# ============================================================

def draw_boxes(image_path: Path, label_path: Path, names, output_path: Path):
    image = cv2.imread(str(image_path))

    if image is None:
        return False

    h_img, w_img = image.shape[:2]
    boxes, _ = read_yolo_label(label_path)

    for box in boxes:
        cls_id = box["class_id"]
        x, y, w, h = box["x"], box["y"], box["w"], box["h"]

        x1 = int((x - w / 2) * w_img)
        y1 = int((y - h / 2) * h_img)
        x2 = int((x + w / 2) * w_img)
        y2 = int((y + h / 2) * h_img)

        x1 = max(0, min(w_img - 1, x1))
        y1 = max(0, min(h_img - 1, y1))
        x2 = max(0, min(w_img - 1, x2))
        y2 = max(0, min(h_img - 1, y2))

        label = names.get(cls_id, f"class_{cls_id}")

        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 255), 2)
        cv2.putText(
            image,
            label,
            (x1, max(24, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 255, 255),
            2,
            cv2.LINE_AA
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), image)
    return True


# ============================================================
# Split Audit
# ============================================================

def audit_split(split_name, images_dir: Path, names, report_dir: Path, preview_count: int, hash_images: bool):
    images = find_images(images_dir)

    result = {
        "split": split_name,
        "images_dir": str(images_dir),
        "total_images": len(images),
        "missing_labels": 0,
        "empty_labels": 0,
        "corrupt_images": 0,
        "invalid_labels": 0,
        "unknown_class_ids": 0,
        "image_count_per_class": defaultdict(int),
        "box_count_per_class": defaultdict(int),
        "image_sizes": Counter(),
        "filesize_buckets": Counter(),
        "related_name_groups": Counter(),
        "multi_class_images": 0,
        "multi_box_images": 0,
        "records": [],
        "issues": [],
    }

    preview_dir = report_dir / "previews" / split_name
    if preview_dir.exists():
        shutil.rmtree(preview_dir)
    preview_dir.mkdir(parents=True, exist_ok=True)

    preview_done = 0

    for image_path in images:
        info = get_image_info(image_path)

        if info is None:
            result["corrupt_images"] += 1
            result["issues"].append({
                "type": "corrupt_image",
                "image": str(image_path)
            })
            continue

        result["image_sizes"][f"{info['width']}x{info['height']}"] += 1

        size_kb = image_path.stat().st_size / 1024
        bucket = int(size_kb // 100) * 100
        result["filesize_buckets"][f"{bucket}-{bucket + 99}KB"] += 1

        related_key = simplified_original_key(image_path.name)
        result["related_name_groups"][related_key] += 1

        label_path = image_to_label_path(image_path)

        if not label_path.exists():
            result["missing_labels"] += 1
            result["issues"].append({
                "type": "missing_label",
                "image": str(image_path),
                "expected_label": str(label_path)
            })
            continue

        boxes, label_errors = read_yolo_label(label_path)

        if label_errors:
            result["invalid_labels"] += len(label_errors)
            for err in label_errors[:5]:
                result["issues"].append({
                    "type": "invalid_label_line",
                    "label": str(label_path),
                    "error": err
                })

        if not boxes:
            result["empty_labels"] += 1
            result["issues"].append({
                "type": "empty_label",
                "image": str(image_path),
                "label": str(label_path)
            })
            continue

        classes_in_image = set()
        valid_box_count = 0

        for box in boxes:
            cls_id = box["class_id"]
            x, y, w, h = box["x"], box["y"], box["w"], box["h"]

            bbox_ok = (0 <= x <= 1 and 0 <= y <= 1 and 0 < w <= 1 and 0 < h <= 1)

            if not bbox_ok:
                result["invalid_labels"] += 1
                result["issues"].append({
                    "type": "invalid_bbox",
                    "label": str(label_path),
                    "line_no": box["line_no"],
                    "raw": box["raw"]
                })
                continue

            if names and cls_id not in names:
                result["unknown_class_ids"] += 1
                result["issues"].append({
                    "type": "unknown_class_id",
                    "label": str(label_path),
                    "class_id": cls_id,
                    "line_no": box["line_no"]
                })
                continue

            classes_in_image.add(cls_id)
            result["box_count_per_class"][cls_id] += 1
            valid_box_count += 1

        for cls_id in classes_in_image:
            result["image_count_per_class"][cls_id] += 1

        if len(classes_in_image) > 1:
            result["multi_class_images"] += 1

        if valid_box_count > 1:
            result["multi_box_images"] += 1

        phash = compute_phash(image_path) if hash_images else None

        result["records"].append({
            "split": split_name,
            "image_path": image_path,
            "label_path": label_path,
            "filename": image_path.name,
            "width": info["width"],
            "height": info["height"],
            "classes": sorted(list(classes_in_image)),
            "box_count": valid_box_count,
            "phash": phash,
            "related_key": related_key,
        })

        if preview_done < preview_count:
            out_path = preview_dir / f"preview_{preview_done + 1:03d}_{image_path.name}"
            draw_boxes(image_path, label_path, names, out_path)
            preview_done += 1

    return result


# ============================================================
# Report Output
# ============================================================

def convert_defaultdicts(obj):
    if isinstance(obj, defaultdict):
        return dict(obj)
    if isinstance(obj, Counter):
        return dict(obj)
    if isinstance(obj, Path):
        return str(obj)
    if hasattr(obj, "__str__") and obj.__class__.__name__.endswith("Hash"):
        return str(obj)
    if isinstance(obj, dict):
        return {str(k): convert_defaultdicts(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_defaultdicts(v) for v in obj]
    return obj


def save_csv_class_summary(report_dir: Path, split_reports, names):
    csv_path = report_dir / "class_summary.csv"

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        writer.writerow([
            "split",
            "class_id",
            "class_name",
            "image_count",
            "box_count"
        ])

        for split_report in split_reports:
            for cls_id in sorted(names.keys() if names else set(split_report["box_count_per_class"].keys())):
                writer.writerow([
                    split_report["split"],
                    cls_id,
                    names.get(cls_id, f"class_{cls_id}"),
                    split_report["image_count_per_class"].get(cls_id, 0),
                    split_report["box_count_per_class"].get(cls_id, 0),
                ])

    return csv_path


def save_issues_csv(report_dir: Path, split_reports):
    csv_path = report_dir / "dataset_issues.csv"

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        writer.writerow(["split", "type", "image", "label", "details"])

        for split_report in split_reports:
            split = split_report["split"]

            for issue in split_report["issues"]:
                writer.writerow([
                    split,
                    issue.get("type", ""),
                    issue.get("image", ""),
                    issue.get("label", ""),
                    json.dumps(issue, ensure_ascii=False)
                ])

    return csv_path


def create_plots(report_dir: Path, split_reports, names):
    if not MATPLOTLIB_AVAILABLE:
        print("[WARNING] matplotlib not installed. Skipping plots.")
        return []

    plot_paths = []

    class_ids = sorted(names.keys()) if names else sorted(set().union(*[
        set(r["box_count_per_class"].keys()) for r in split_reports
    ]))

    class_names = [names.get(i, f"class_{i}") for i in class_ids]

    # Total images per class
    total_images = []
    total_boxes = []

    for cls_id in class_ids:
        total_images.append(sum(r["image_count_per_class"].get(cls_id, 0) for r in split_reports))
        total_boxes.append(sum(r["box_count_per_class"].get(cls_id, 0) for r in split_reports))

    fig = plt.figure(figsize=(10, 6))
    plt.bar(class_names, total_images)
    plt.title("Total Images per Class")
    plt.xlabel("Class")
    plt.ylabel("Images")
    plt.xticks(rotation=25, ha="right")
    plt.tight_layout()
    path = report_dir / "total_images_per_class.png"
    plt.savefig(path, dpi=200)
    plt.close(fig)
    plot_paths.append(path)

    fig = plt.figure(figsize=(10, 6))
    plt.bar(class_names, total_boxes)
    plt.title("Total Boxes per Class")
    plt.xlabel("Class")
    plt.ylabel("Boxes")
    plt.xticks(rotation=25, ha="right")
    plt.tight_layout()
    path = report_dir / "total_boxes_per_class.png"
    plt.savefig(path, dpi=200)
    plt.close(fig)
    plot_paths.append(path)

    # Split sizes
    split_names = [r["split"] for r in split_reports]
    split_sizes = [r["total_images"] for r in split_reports]

    fig = plt.figure(figsize=(8, 5))
    plt.bar(split_names, split_sizes)
    plt.title("Images per Split")
    plt.xlabel("Split")
    plt.ylabel("Images")
    plt.tight_layout()
    path = report_dir / "images_per_split.png"
    plt.savefig(path, dpi=200)
    plt.close(fig)
    plot_paths.append(path)

    return plot_paths


def write_text_report(report_dir: Path, dataset_info, split_reports, names, duplicate_summary, target_total=None):
    path = report_dir / "AUDIT_REPORT.txt"

    total_images_all = sum(r["total_images"] for r in split_reports)
    total_missing = sum(r["missing_labels"] for r in split_reports)
    total_empty = sum(r["empty_labels"] for r in split_reports)
    total_corrupt = sum(r["corrupt_images"] for r in split_reports)
    total_invalid = sum(r["invalid_labels"] for r in split_reports)

    class_ids = sorted(names.keys()) if names else sorted(set().union(*[
        set(r["box_count_per_class"].keys()) for r in split_reports
    ]))

    with path.open("w", encoding="utf-8") as f:
        f.write("=" * 90 + "\n")
        f.write("FULL AIRCRAFT DAMAGE DATASET AUDIT REPORT\n")
        f.write("=" * 90 + "\n\n")

        f.write(f"Dataset root: {dataset_info['root']}\n")
        f.write(f"Data YAML   : {dataset_info.get('data_yaml')}\n")
        f.write(f"Total images: {total_images_all}\n")
        f.write(f"Classes     : {len(class_ids)}\n\n")

        f.write("Classes:\n")
        for cls_id in class_ids:
            f.write(f"  {cls_id}: {names.get(cls_id, f'class_{cls_id}')}\n")

        f.write("\n" + "=" * 90 + "\n")
        f.write("SPLIT SUMMARY\n")
        f.write("=" * 90 + "\n\n")

        for r in split_reports:
            f.write(f"[{r['split']}]\n")
            f.write(f"  Images          : {r['total_images']}\n")
            f.write(f"  Missing labels  : {r['missing_labels']}\n")
            f.write(f"  Empty labels    : {r['empty_labels']}\n")
            f.write(f"  Corrupt images  : {r['corrupt_images']}\n")
            f.write(f"  Invalid labels  : {r['invalid_labels']}\n")
            f.write(f"  Unknown class IDs: {r['unknown_class_ids']}\n")
            f.write(f"  Multi-class imgs: {r['multi_class_images']}\n")
            f.write(f"  Multi-box imgs  : {r['multi_box_images']}\n\n")

        f.write("\n" + "=" * 90 + "\n")
        f.write("TOTAL IMAGES PER CLASS\n")
        f.write("=" * 90 + "\n\n")

        for cls_id in class_ids:
            total = sum(r["image_count_per_class"].get(cls_id, 0) for r in split_reports)
            class_name = names.get(cls_id, f"class_{cls_id}")
            f.write(f"{cls_id} - {class_name}: {total} images\n")

        f.write("\n" + "=" * 90 + "\n")
        f.write("TOTAL BOXES PER CLASS\n")
        f.write("=" * 90 + "\n\n")

        for cls_id in class_ids:
            total = sum(r["box_count_per_class"].get(cls_id, 0) for r in split_reports)
            class_name = names.get(cls_id, f"class_{cls_id}")
            f.write(f"{cls_id} - {class_name}: {total} boxes\n")

        if target_total:
            f.write("\n" + "=" * 90 + "\n")
            f.write(f"GAP TO TARGET: {target_total} IMAGES PER CLASS\n")
            f.write("=" * 90 + "\n\n")

            for cls_id in class_ids:
                total = sum(r["image_count_per_class"].get(cls_id, 0) for r in split_reports)
                missing = max(0, target_total - total)
                class_name = names.get(cls_id, f"class_{cls_id}")
                f.write(f"{class_name}: current={total}, missing={missing}\n")

        f.write("\n" + "=" * 90 + "\n")
        f.write("AUGMENTATION / DUPLICATE INDICATORS\n")
        f.write("=" * 90 + "\n\n")

        f.write(f"ImageHash available: {IMAGEHASH_AVAILABLE}\n")
        f.write(f"Near duplicate pairs total: {duplicate_summary.get('near_duplicate_total', 'N/A')}\n")
        f.write(f"Cross-split near duplicates: {duplicate_summary.get('cross_split_duplicate_total', 'N/A')}\n\n")

        f.write("Roboflow / related filename groups larger than 1 may indicate augmented variants.\n")
        f.write("If many related variants appear in valid/test, evaluation may be less reliable.\n\n")

        f.write("\n" + "=" * 90 + "\n")
        f.write("DATA QUALITY DECISION\n")
        f.write("=" * 90 + "\n\n")

        if total_corrupt == 0 and total_missing == 0 and total_invalid == 0:
            f.write("Basic label integrity: GOOD\n")
        else:
            f.write("Basic label integrity: NEEDS CLEANING\n")

        cross_split_total = duplicate_summary.get("cross_split_duplicate_total", 0)

        if not isinstance(cross_split_total, (int, float)):
            cross_split_total = 0

        if cross_split_total > 0:
            f.write("Cross-split leakage risk: PRESENT - review duplicate examples.\n")

        else:
            f.write("Cross-split leakage risk: LOW based on hash check.\n")

        f.write("\nRecommended next steps:\n")
        f.write("1. Review preview images manually.\n")
        f.write("2. Check duplicate examples if reported.\n")
        f.write("3. Do not augment valid/test splits.\n")
        f.write("4. Balance weak classes before training.\n")
        f.write("5. Train only after class IDs and labels are visually confirmed.\n")

    return path


def print_console_summary(dataset_info, split_reports, names, duplicate_summary, report_dir, target_total=None):
    print("\n" + "=" * 90)
    print("FINAL DATASET AUDIT SUMMARY")
    print("=" * 90)

    total_images = sum(r["total_images"] for r in split_reports)
    print(f"Dataset root: {dataset_info['root']}")
    print(f"Total images: {total_images}")

    print("\nSplit sizes:")
    for r in split_reports:
        print(f"  {r['split']}: {r['total_images']} images")

    class_ids = sorted(names.keys()) if names else sorted(set().union(*[
        set(r["box_count_per_class"].keys()) for r in split_reports
    ]))

    print("\nTotal images per class:")
    for cls_id in class_ids:
        total = sum(r["image_count_per_class"].get(cls_id, 0) for r in split_reports)
        print(f"  {cls_id} - {names.get(cls_id, f'class_{cls_id}')}: {total}")

    print("\nTotal boxes per class:")
    for cls_id in class_ids:
        total = sum(r["box_count_per_class"].get(cls_id, 0) for r in split_reports)
        print(f"  {cls_id} - {names.get(cls_id, f'class_{cls_id}')}: {total}")

    if target_total:
        print(f"\nGap to target ({target_total} images per class):")
        for cls_id in class_ids:
            total = sum(r["image_count_per_class"].get(cls_id, 0) for r in split_reports)
            missing = max(0, target_total - total)
            print(f"  {names.get(cls_id, f'class_{cls_id}')}: current={total}, missing={missing}")

    print("\nQuality issues:")
    for r in split_reports:
        print(
            f"  {r['split']}: "
            f"missing={r['missing_labels']}, "
            f"empty={r['empty_labels']}, "
            f"corrupt={r['corrupt_images']}, "
            f"invalid={r['invalid_labels']}, "
            f"unknown_ids={r['unknown_class_ids']}"
        )

    print("\nDuplicate / augmentation indicators:")
    print(f"  Near duplicate total: {duplicate_summary.get('near_duplicate_total', 'N/A')}")
    print(f"  Cross-split duplicate total: {duplicate_summary.get('cross_split_duplicate_total', 'N/A')}")

    print("\nReport folder:")
    print(report_dir)
    print("=" * 90)


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--dataset",
        required=True,
        help="Dataset root folder containing train/valid/test"
    )

    parser.add_argument(
        "--data",
        default=None,
        help="Optional path to data.yaml"
    )

    parser.add_argument(
        "--names",
        default=None,
        help="Manual class names separated by comma if no data.yaml exists"
    )

    parser.add_argument(
        "--preview-count",
        type=int,
        default=60,
        help="Preview images per split"
    )

    parser.add_argument(
        "--hash",
        action="store_true",
        help="Enable image hash duplicate detection"
    )

    parser.add_argument(
        "--hash-threshold",
        type=int,
        default=6,
        help="Near duplicate hash threshold, typical 4-8"
    )

    parser.add_argument(
        "--target-per-class",
        type=int,
        default=4000,
        help="Target image count per class for gap analysis"
    )

    args = parser.parse_args()

    dataset_root = Path(args.dataset).resolve()
    data_yaml = Path(args.data).resolve() if args.data else None

    if not dataset_root.exists():
        raise FileNotFoundError(f"Dataset root not found: {dataset_root}")

    dataset_info = resolve_dataset(dataset_root, data_yaml, args.names)
    root = dataset_info["root"]
    names = dataset_info["names"]

    report_dir = root / "dataset_audit_report"
    report_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 90)
    print("FULL AIRCRAFT DAMAGE DATASET AUDIT")
    print("=" * 90)
    print(f"Dataset root: {root}")
    print(f"Data YAML   : {dataset_info.get('data_yaml')}")
    print(f"Report dir  : {report_dir}")
    print(f"Hash check  : {args.hash}")
    print("=" * 90)

    if not names:
        print("[WARNING] No class names found. Use --names or data.yaml for readable class names.")

    split_definitions = [
        ("train", dataset_info["train_images"]),
        ("valid", dataset_info["valid_images"]),
        ("test", dataset_info["test_images"]),
    ]

    split_reports = []

    for split_name, images_dir in split_definitions:
        print(f"\nAuditing split: {split_name}")
        print(f"Images dir: {images_dir}")

        report = audit_split(
            split_name=split_name,
            images_dir=images_dir,
            names=names,
            report_dir=report_dir,
            preview_count=args.preview_count,
            hash_images=args.hash
        )

        split_reports.append(report)

    all_records = []
    for r in split_reports:
        all_records.extend(r["records"])

    duplicate_summary = {
        "near_duplicate_total": "not_checked",
        "cross_split_duplicate_total": "not_checked",
        "near_duplicate_examples": [],
        "cross_split_duplicate_examples": [],
    }

    if args.hash:
        if not IMAGEHASH_AVAILABLE:
            print("[WARNING] imagehash is not installed. Install with: pip install imagehash")
        else:
            print("\nChecking near duplicates. This may take time...")

            near_total, near_examples = find_near_duplicates(
                all_records,
                threshold=args.hash_threshold
            )

            cross_total, cross_examples = find_cross_split_duplicate_examples(
                all_records,
                threshold=args.hash_threshold
            )

            duplicate_summary = {
                "near_duplicate_total": near_total,
                "cross_split_duplicate_total": cross_total,
                "near_duplicate_examples": near_examples,
                "cross_split_duplicate_examples": cross_examples,
            }

            (report_dir / "duplicate_examples.json").write_text(
                json.dumps(duplicate_summary, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )

    save_csv_class_summary(report_dir, split_reports, names)
    save_issues_csv(report_dir, split_reports)
    create_plots(report_dir, split_reports, names)

    json_report = {
        "dataset_root": str(root),
        "data_yaml": str(dataset_info.get("data_yaml")),
        "names": names,
        "splits": [],
        "duplicate_summary": duplicate_summary,
    }

    for r in split_reports:
        clean_r = {
            key: value
            for key, value in r.items()
            if key not in {"records"}
        }
        json_report["splits"].append(convert_defaultdicts(clean_r))

    (report_dir / "audit_report.json").write_text(
        json.dumps(convert_defaultdicts(json_report), indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    text_report = write_text_report(
        report_dir=report_dir,
        dataset_info=dataset_info,
        split_reports=split_reports,
        names=names,
        duplicate_summary=duplicate_summary,
        target_total=args.target_per_class
    )

    print_console_summary(
        dataset_info=dataset_info,
        split_reports=split_reports,
        names=names,
        duplicate_summary=duplicate_summary,
        report_dir=report_dir,
        target_total=args.target_per_class
    )

    print("\nMain report:")
    print(text_report)


if __name__ == "__main__":
    main()