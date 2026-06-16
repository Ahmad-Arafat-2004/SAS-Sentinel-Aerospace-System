import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "data" / "unified_aircraft_damage_yolov8"
DATASET_REPORT = DATASET / "dataset_report.json"
QUALITY_REPORT = DATASET / "quality_report.json"
CLASS_MAPPING_REPORT = ROOT / "data" / "class_mapping_report.json"
INSPECTION_REPORT = ROOT / "data" / "dataset_inspection_report.json"
OUTPUT = DATASET / "invalid_label_review.json"


def source_from_path(path_text):
    value = str(path_text).replace("\\", "/")
    marker = "/data/"
    if marker in value:
        tail = value.split(marker, 1)[1]
        return tail.split("/", 1)[0]
    return "unknown"


def reason_for_line(line):
    parts = str(line).split()
    if len(parts) != 5:
        return "wrong_format"
    try:
        class_id = int(float(parts[0]))
        coords = [float(v) for v in parts[1:]]
    except ValueError:
        return "non_numeric"
    if class_id < 0:
        return "invalid_class_id"
    if any(v < 0 or v > 1 for v in coords):
        return "outside_0_1_range"
    if coords[2] <= 0 or coords[3] <= 0:
        return "non_positive_width_height"
    return "class_id_out_of_source_range_or_unknown"


def main():
    dataset_report = json.loads(DATASET_REPORT.read_text(encoding="utf-8"))
    quality_report = json.loads(QUALITY_REPORT.read_text(encoding="utf-8"))
    class_mapping = json.loads(CLASS_MAPPING_REPORT.read_text(encoding="utf-8"))
    inspection_report = json.loads(INSPECTION_REPORT.read_text(encoding="utf-8")) if INSPECTION_REPORT.exists() else {}
    by_source = Counter()
    by_reason = Counter()
    examples_by_reason = defaultdict(list)
    examples_by_source = defaultdict(list)
    total_invalid = 0
    for split, info in dataset_report["splits"].items():
        for item in info.get("invalid_label_lines", []):
            total_invalid += 1
            source = source_from_path(item.get("file", ""))
            reason = reason_for_line(item.get("line", ""))
            by_source[source] += 1
            by_reason[reason] += 1
            if len(examples_by_reason[reason]) < 10:
                examples_by_reason[reason].append({"split": split, **item})
            if len(examples_by_source[source]) < 10:
                examples_by_source[source].append({"split": split, "reason": reason, **item})
    full_counts_by_source = {}
    full_counts_by_split = {"train": 0, "valid": 0, "test": 0}
    for dataset in inspection_report.get("datasets", []):
        dataset_total = 0
        for split, info in dataset.get("splits", {}).items():
            count = int(info.get("invalid_label_lines_count", 0))
            dataset_total += count
            if split in full_counts_by_split:
                full_counts_by_split[split] += count
        full_counts_by_source[dataset.get("name", "unknown")] = dataset_total
    full_total = sum(full_counts_by_source.values())
    report = {
        "dataset_report": str(DATASET_REPORT),
        "quality_report": str(QUALITY_REPORT),
        "class_mapping_report": str(CLASS_MAPPING_REPORT),
        "total_invalid_source_rows_skipped": full_total or total_invalid,
        "logged_invalid_examples_count": total_invalid,
        "invalid_rows_by_source_dataset": dict(by_source),
        "full_invalid_rows_by_source_dataset_from_inspection": full_counts_by_source,
        "full_invalid_rows_by_split_from_inspection": full_counts_by_split,
        "invalid_rows_by_reason": dict(by_reason),
        "examples_by_reason": dict(examples_by_reason),
        "examples_by_source_dataset": dict(examples_by_source),
        "final_unified_invalid_labels": {
            split: quality_report["splits"][split].get("invalid_label_values_count", 0)
            for split in ("train", "valid", "test")
        },
        "class_mapping_to_other_damage": class_mapping.get("mapped_to_other_damage", []),
        "recommendation": "Do not restore invalid source rows automatically. They were skipped because their YOLO lines were malformed, outside normalized range, or had invalid source class IDs.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Invalid source rows skipped: {total_invalid}")
    print(f"By source: {dict(by_source)}")
    print(f"By reason: {dict(by_reason)}")
    print(f"Final unified invalid labels: {report['final_unified_invalid_labels']}")
    print(f"Saved report: {OUTPUT}")


if __name__ == "__main__":
    main()
