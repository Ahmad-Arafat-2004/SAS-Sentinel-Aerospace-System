import argparse
import random
import shutil
from collections import defaultdict
from pathlib import Path

import cv2
import yaml


ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
COLORS = [
    (70, 220, 255),
    (255, 180, 70),
    (90, 255, 120),
    (90, 120, 255),
    (255, 90, 210),
    (220, 220, 80),
    (180, 120, 255),
]


def load_names(dataset):
    data = yaml.safe_load((dataset / "data.yaml").read_text(encoding="utf-8")) or {}
    names = data.get("names", {})
    if isinstance(names, dict):
        return {int(k): str(v) for k, v in names.items()}
    return {i: str(name) for i, name in enumerate(names)}


def draw_label(image, label_path, names):
    height, width = image.shape[:2]
    cv2.rectangle(image, (0, 0), (min(width - 1, 900), 28), (0, 0, 0), -1)
    cv2.putText(image, label_path.stem, (6, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
    if not label_path.exists():
        return image
    for line in label_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) != 5:
            continue
        try:
            class_id = int(float(parts[0]))
            x, y, box_w, box_h = [float(value) for value in parts[1:]]
        except ValueError:
            continue
        x1 = int((x - box_w / 2) * width)
        y1 = int((y - box_h / 2) * height)
        x2 = int((x + box_w / 2) * width)
        y2 = int((y + box_h / 2) * height)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(width - 1, x2), min(height - 1, y2)
        color = COLORS[class_id % len(COLORS)]
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
        text = f"{class_id}: {names.get(class_id, 'unknown')}"
        text_size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        cv2.rectangle(image, (x1, max(0, y1 - text_size[1] - 10)), (x1 + text_size[0] + 8, y1), color, -1)
        cv2.putText(image, text, (x1 + 4, max(14, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2, cv2.LINE_AA)
    return image


def image_files(image_dir):
    return sorted([p for p in image_dir.glob("*") if p.suffix.lower() in IMAGE_EXTENSIONS])


def write_previews(images, label_dir, output_dir, names):
    output_dir.mkdir(parents=True, exist_ok=True)
    written = 0
    for image_path in images:
        image = cv2.imread(str(image_path))
        if image is None:
            continue
        image = draw_label(image, label_dir / f"{image_path.stem}.txt", names)
        cv2.imwrite(str(output_dir / image_path.name), image)
        written += 1
    return written


def labels_by_class(dataset, split, names):
    image_dir = dataset / split / "images"
    label_dir = dataset / split / "labels"
    result = defaultdict(list)
    for label_path in sorted(label_dir.glob("*.txt")):
        image = next((image_dir / f"{label_path.stem}{ext}" for ext in IMAGE_EXTENSIONS if (image_dir / f"{label_path.stem}{ext}").exists()), None)
        if image is None:
            continue
        seen = set()
        for line in label_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            parts = line.split()
            if len(parts) != 5:
                continue
            try:
                class_id = int(float(parts[0]))
            except ValueError:
                continue
            if class_id in names and class_id not in seen:
                result[names[class_id]].append(image)
                seen.add(class_id)
    return result


def generate_full_preview_set(dataset, names, seed=42):
    random.seed(seed)
    outputs = {}
    for split in ("train", "valid", "test"):
        image_dir = dataset / split / "images"
        label_dir = dataset / split / "labels"
        images = image_files(image_dir)
        sample = random.sample(images, min(50, len(images)))
        output_dir = ROOT / "dataset_preview" / "unified" / f"{split}_random"
        outputs[str(output_dir)] = write_previews(sample, label_dir, output_dir, names)

    by_class = defaultdict(list)
    for split in ("train", "valid", "test"):
        split_classes = labels_by_class(dataset, split, names)
        for class_name, images in split_classes.items():
            by_class[class_name].extend((split, image) for image in images)

    for class_name in names.values():
        candidates = by_class[class_name]
        random.shuffle(candidates)
        selected = candidates[:20]
        output_dir = ROOT / "dataset_preview" / "unified" / "by_class" / class_name
        output_dir.mkdir(parents=True, exist_ok=True)
        written = 0
        for split, image_path in selected:
            label_dir = dataset / split / "labels"
            image = cv2.imread(str(image_path))
            if image is None:
                continue
            image = draw_label(image, label_dir / f"{image_path.stem}.txt", names)
            cv2.imwrite(str(output_dir / f"{split}_{image_path.name}"), image)
            written += 1
        outputs[str(output_dir)] = written

    empty_candidates = []
    for split in ("train", "valid", "test"):
        image_dir = dataset / split / "images"
        label_dir = dataset / split / "labels"
        for label_path in sorted(label_dir.glob("*.txt")):
            if label_path.read_text(encoding="utf-8", errors="ignore").strip():
                continue
            image = next((image_dir / f"{label_path.stem}{ext}" for ext in IMAGE_EXTENSIONS if (image_dir / f"{label_path.stem}{ext}").exists()), None)
            if image:
                empty_candidates.append((split, image))
    random.shuffle(empty_candidates)
    output_dir = ROOT / "dataset_preview" / "unified" / "empty_labels"
    output_dir.mkdir(parents=True, exist_ok=True)
    written = 0
    for split, image_path in empty_candidates[:50]:
        image = cv2.imread(str(image_path))
        if image is None:
            continue
        h, w = image.shape[:2]
        cv2.rectangle(image, (0, 0), (min(w - 1, 1000), 32), (0, 80, 80), -1)
        cv2.putText(image, f"EMPTY LABEL / NEGATIVE? {split}/{image_path.name}", (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.imwrite(str(output_dir / f"{split}_{image_path.name}"), image)
        written += 1
    outputs[str(output_dir)] = written
    return outputs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="data/unified_aircraft_damage_yolov8")
    parser.add_argument("--split", default="test", choices=["train", "valid", "test"])
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--full-audit", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    dataset = (ROOT / args.dataset).resolve()
    names = load_names(dataset)
    if args.full_audit:
        outputs = generate_full_preview_set(dataset, names, args.seed)
        for path, count in outputs.items():
            print(f"Saved {count} previews to {path}")
        return
    image_dir = dataset / args.split / "images"
    label_dir = dataset / args.split / "labels"
    output_dir = ROOT / "dataset_preview" / "unified" / args.split
    output_dir.mkdir(parents=True, exist_ok=True)
    images = sorted([p for p in image_dir.glob("*") if p.suffix.lower() in IMAGE_EXTENSIONS])[:args.limit]
    written = 0
    for image_path in images:
        image = cv2.imread(str(image_path))
        if image is None:
            continue
        image = draw_label(image, label_dir / f"{image_path.stem}.txt", names)
        cv2.imwrite(str(output_dir / image_path.name), image)
        written += 1
    print(f"Saved {written} previews to {output_dir}")


if __name__ == "__main__":
    main()
