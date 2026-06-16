import argparse
from pathlib import Path
from collections import defaultdict

import cv2
import yaml


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def normalize_names(names):
    if isinstance(names, list):
        return {i: name for i, name in enumerate(names)}
    if isinstance(names, dict):
        return {int(k): v for k, v in names.items()}
    raise ValueError("Invalid names format in data.yaml")


def get_dataset_paths(data_yaml):
    data_yaml = Path(data_yaml).resolve()
    data = load_yaml(data_yaml)

    root = Path(data.get("path", data_yaml.parent)).resolve()

    train_images = root / data["train"]
    valid_images = root / data["val"]
    test_images = root / data["test"]

    names = normalize_names(data["names"])

    return root, train_images, valid_images, test_images, names


def image_to_label_path(image_path):
    parts = list(image_path.parts)

    for i, part in enumerate(parts):
        if part.lower() == "images":
            parts[i] = "labels"
            break

    return Path(*parts).with_suffix(".txt")


def find_images(folder):
    if not folder.exists():
        return []

    return [
        p for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    ]


def read_label(label_path):
    boxes = []

    if not label_path.exists():
        return boxes

    with open(label_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()

        if not line:
            continue

        parts = line.split()

        if len(parts) < 5:
            continue

        try:
            class_id = int(float(parts[0]))
            x = float(parts[1])
            y = float(parts[2])
            w = float(parts[3])
            h = float(parts[4])

            boxes.append((class_id, x, y, w, h))
        except Exception:
            continue

    return boxes


def draw_preview(image_path, label_path, names, output_path):
    image = cv2.imread(str(image_path))

    if image is None:
        return False

    h_img, w_img = image.shape[:2]
    boxes = read_label(label_path)

    for class_id, x, y, w, h in boxes:
        x1 = int((x - w / 2) * w_img)
        y1 = int((y - h / 2) * h_img)
        x2 = int((x + w / 2) * w_img)
        y2 = int((y + h / 2) * h_img)

        x1 = max(0, min(w_img - 1, x1))
        y1 = max(0, min(h_img - 1, y1))
        x2 = max(0, min(w_img - 1, x2))
        y2 = max(0, min(h_img - 1, y2))

        label = names.get(class_id, f"class_{class_id}")

        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 255), 2)
        cv2.putText(
            image,
            label,
            (x1, max(25, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2,
            cv2.LINE_AA
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), image)
    return True


def inspect_split(split_name, images_dir, names, preview_root, preview_count):
    images = find_images(images_dir)

    image_count_per_class = defaultdict(int)
    box_count_per_class = defaultdict(int)

    missing_labels = 0
    empty_labels = 0
    corrupt_images = 0

    previews_done = 0

    for image_path in images:
        img = cv2.imread(str(image_path))

        if img is None:
            corrupt_images += 1
            continue

        label_path = image_to_label_path(image_path)

        if not label_path.exists():
            missing_labels += 1
            continue

        boxes = read_label(label_path)

        if not boxes:
            empty_labels += 1
            continue

        classes_in_image = set()

        for box in boxes:
            class_id = box[0]

            if class_id in names:
                classes_in_image.add(class_id)
                box_count_per_class[class_id] += 1

        for class_id in classes_in_image:
            image_count_per_class[class_id] += 1

        if previews_done < preview_count:
            output_path = preview_root / split_name / f"preview_{previews_done + 1:03d}_{image_path.name}"
            draw_preview(image_path, label_path, names, output_path)
            previews_done += 1

    return {
        "split": split_name,
        "total_images": len(images),
        "missing_labels": missing_labels,
        "empty_labels": empty_labels,
        "corrupt_images": corrupt_images,
        "image_count_per_class": dict(image_count_per_class),
        "box_count_per_class": dict(box_count_per_class),
    }


def print_report(report, names):
    print("\n" + "=" * 80)
    print(f"Split: {report['split']}")
    print("=" * 80)

    print(f"Total images   : {report['total_images']}")
    print(f"Missing labels : {report['missing_labels']}")
    print(f"Empty labels   : {report['empty_labels']}")
    print(f"Corrupt images : {report['corrupt_images']}")

    print("\nImages per class:")
    for class_id, name in names.items():
        print(f"  {class_id} - {name}: {report['image_count_per_class'].get(class_id, 0)}")

    print("\nBoxes per class:")
    for class_id, name in names.items():
        print(f"  {class_id} - {name}: {report['box_count_per_class'].get(class_id, 0)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to data.yaml")
    parser.add_argument("--preview-count", type=int, default=30)

    args = parser.parse_args()

    data_yaml = Path(args.data).resolve()

    root, train_images, valid_images, test_images, names = get_dataset_paths(data_yaml)

    preview_root = root / "dataset_preview"

    print("=" * 80)
    print("Aircraft Damage Dataset Inspector")
    print("=" * 80)
    print(f"data.yaml: {data_yaml}")
    print(f"root     : {root}")
    print(f"classes  : {len(names)}")

    for class_id, name in names.items():
        print(f"{class_id}: {name}")

    reports = []

    for split_name, images_dir in [
        ("train", train_images),
        ("valid", valid_images),
        ("test", test_images),
    ]:
        report = inspect_split(
            split_name=split_name,
            images_dir=images_dir,
            names=names,
            preview_root=preview_root,
            preview_count=args.preview_count
        )

        reports.append(report)
        print_report(report, names)

    total_images = sum(r["total_images"] for r in reports)

    total_image_count_per_class = defaultdict(int)
    total_box_count_per_class = defaultdict(int)

    for report in reports:
        for class_id in names:
            total_image_count_per_class[class_id] += report["image_count_per_class"].get(class_id, 0)
            total_box_count_per_class[class_id] += report["box_count_per_class"].get(class_id, 0)

    print("\n" + "=" * 80)
    print("Overall Summary")
    print("=" * 80)
    print(f"Total images across all splits: {total_images}")

    print("\nTotal images per class:")
    for class_id, name in names.items():
        print(f"  {class_id} - {name}: {total_image_count_per_class[class_id]}")

    print("\nTotal boxes per class:")
    for class_id, name in names.items():
        print(f"  {class_id} - {name}: {total_box_count_per_class[class_id]}")

    print("\nPreview images saved to:")
    print(preview_root)
    print("=" * 80)


if __name__ == "__main__":
    main()