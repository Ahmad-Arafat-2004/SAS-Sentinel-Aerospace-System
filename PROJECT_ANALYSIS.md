# Project Analysis: SAS – Sentinel Aerospace System

## Overview

**Project Name:** SAS (Sentinel Aerospace System)  
**Type:** Full-stack computer vision web application  
**Purpose:** Aircraft surface damage detection, classification, severity estimation, and 3D localization  
**Stack:** Python/Flask backend + React/Three.js frontend  
**Status:** Demo-ready with rule-based classifiers; trained YOLO model not yet placed

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  Upload Page → Result Display → 3D Viewer → History Management  │
│         ↓           ↓              ↓              ↓              │
│    api.js   result.js         viewer3d.js    history.js         │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP POST/GET
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Flask Backend (Python)                         │
├──────────────────────────────────────────────────────────────────┤
│  POST /api/detect/image (Main Pipeline)                         │
│    ├─ File validation & storage                                  │
│    ├─ aircraft_classifier.py  (deterministic demo)               │
│    ├─ damage_classifier.py    (rule-based binary)                │
│    ├─ detector.py                                                │
│    │  ├─ YOLO (if backend/model/best.pt exists)                  │
│    │  └─ OpenCV demo detector (fallback)                         │
│    ├─ severity.py             (rule-based)                       │
│    ├─ zone_mapper.py          (2D → 3D coordinate mapping)       │
│    └─ Result JSON + annotated image storage                      │
├──────────────────────────────────────────────────────────────────┤
│  GET /api/results/history                                        │
│  GET /api/results/<id>                                           │
│  Static file serving (images, JSON, 3D models)                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
D:\aircraft_damage_detection_3d/
├── README.md                         Complete setup and API documentation
├── requirements.txt                  Python dependencies (18 packages)
├── PROJECT_ANALYSIS.md               This file
│
├── backend/                          Flask API server
│   ├── app.py                        623 lines – main Flask app & routes
│   ├── config.py                     171 lines – paths, thresholds, settings
│   ├── model/                        Trained YOLO weights go here (best.pt)
│   ├── uploads/images/               User-uploaded images
│   ├── results/images/               Annotated result images
│   ├── results/json/                 Detection result metadata (JSON)
│   └── utils/
│       ├── aircraft_classifier.py    Demo aircraft type classifier
│       ├── damage_classifier.py      Binary damage presence classifier
│       ├── detector.py               YOLO + OpenCV detection logic
│       ├── severity.py               Rule-based severity estimator
│       ├── zone_mapper.py            362 lines – 2D bbox → 3D zone mapping
│       ├── file_handler.py           Upload handling utilities
│       └── video_processor.py        Future video support (disabled)
│
├── frontend/
│   ├── index.html / upload.html / result.html / history.html / viewer3d.html
│   └── assets/
│       ├── js/
│       │   ├── api.js                API client helpers
│       │   ├── store.js              localStorage state management
│       │   ├── upload.js             Upload form logic
│       │   ├── result.js             Result page rendering
│       │   ├── history.js            History retrieval
│       │   └── viewer3d.js           150+ lines – Three.js 3D scene
│       └── models/
│           ├── aircraft.glb          1.2 MB – generic model
│           ├── boeing_747.glb        1.9 MB
│           └── boeing_787.glb        1.9 MB
│
├── data/
│   ├── unified_aircraft_damage_yolov8/   28,447 images (train/valid/test)
│   └── [5 source Roboflow datasets]
│
├── tools/                            Dataset preparation & training scripts
├── 3d_localization/                  Zone coordinate definitions (JSON + rules)
├── tests/                            Backend, detector, and zone mapper tests
├── docs/                             Mostly empty stubs
├── yolo11n.pt / yolov8n.pt / yolov8s.pt   Pre-trained YOLO base weights
└── AS/                               Python virtual environment
```

---

## Detection Pipeline (Step-by-Step)

1. **Upload** – User submits an aircraft image (max 50 MB, PNG/JPG/WEBP)
2. **Aircraft Classification** – Deterministic demo classifier identifies type (Boeing 747, 787, or Generic) using stable hashing + image features (aspect ratio, brightness, edge density)
3. **Damage Status** – Rule-based binary classifier uses OpenCV features (edge density, texture irregularity, contour analysis) with threshold 0.23
4. **Detection**
   - If `backend/model/best.pt` exists → run YOLOv8 inference
   - Otherwise → OpenCV demo detector (Canny edges → dilate → close → contours)
5. **Damage Type** – Determined by bounding box geometry (aspect ratio, position, area)
6. **Severity** – Rule-based; three levels (Low / Medium / High) with type-specific thresholds (cracks escalate faster than scratches)
7. **3D Zone Mapping** – Bounding box center + detected view angle → one of 8 named zones (Nose, Forward/Mid/Rear Fuselage, Left/Right Wing, Tail, Engine) with fixed Three.js 3D coordinates
8. **Result Storage** – Annotated image saved to `backend/results/images/`, metadata to `backend/results/json/`
9. **Visualization** – Result page shows original + annotated images, metadata, and opens interactive Three.js 3D viewer with damage marker on the correct zone

---

## Damage Classes (7)

| ID | Class       | Description              |
|----|-------------|--------------------------|
| 0  | crack        | Surface fracture         |
| 1  | dent         | Surface deformation      |
| 2  | scratch      | Surface abrasion mark    |
| 3  | corrosion    | Oxidation damage         |
| 4  | paint_damage | Paint loss/chipping      |
| 5  | stress_crack | Fatigue crack            |
| 6  | other_damage | Unclassified damage      |

---

## Dataset

| Split | Images |
|-------|--------|
| Train | 25,136 |
| Valid |  1,942 |
| Test  |  1,369 |
| **Total** | **28,447** |

**Format:** YOLO bounding box format (normalized `x_center y_center width height`)  
**Sources:** 5 Roboflow datasets merged and class-normalized via `tools/build_unified_dataset.py`  
**Reports available:** `dataset_report.json`, `quality_report.json`, `duplicate_report.json`, `class_distribution_report.json`, `training_recommendation.json`

---

## Key Algorithms

### Aircraft Classifier (`aircraft_classifier.py`)
- Stable hash of image bytes → deterministic aircraft type
- Supplements with filename hints (`"747"`, `"787"`)
- Confidence range: 0.84 – 0.93

### Damage Classifier (`damage_classifier.py`)
- Damage score = `edge_density×2.6 + contours/85 + texture_irregularity/330 + contour_area_ratio×0.55`
- Threshold: 0.23 → binary damage / no-damage decision
- Confidence range: 0.78 – 0.96

### Demo Detector (`detector.py`)
- Canny edges → dilation → morphological close → contour extraction
- Scores contours by area, density, centrality, vertical position, texture
- Filters out watermarks, border-touching contours, size outliers
- Damage type inferred from winning contour geometry:
  - Aspect > 3.0 → Crack
  - Area > 9% → Dent
  - Y-center > 68% → Corrosion
  - Aspect > 1.6 → Scratch
  - Default → Paint Damage

### YOLO Detector (`detector.py`)
- Loads `backend/model/best.pt` at runtime
- Confidence threshold: 0.25 | IoU threshold: 0.45
- Falls back to OpenCV demo if model file missing

### Severity Estimator (`severity.py`)
- Critical types (crack, stress_crack): High if confidence ≥ 0.90 or area ≥ 6%
- High-risk types (corrosion, dent): High if confidence ≥ 0.90 or area ≥ 8%
- Medium-risk types (scratch, paint_damage): Max Medium severity

### Zone Mapper (`zone_mapper.py`)
- Supports 7 camera views: front, back, left, right, top, bottom, unknown
- Maps 2D bbox center to one of 8 named 3D zones
- 3D coordinate convention: x = nose→tail, y = up→down, z = left wing→right wing
- Output used directly by Three.js viewer to position damage marker

---

## Frontend / 3D Viewer

- Built with React 18 (via Babel CDN) – no build step required
- Three.js 0.128.0 for 3D scene
- Loads GLB aircraft models and renders:
  - Damage sphere marker at zone coordinates
  - Animated halo ring around the damage point
  - Zone highlight mesh
  - Orbit controls for camera
  - Wireframe toggle
- Dynamic model switching based on detected aircraft type

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/detect/image` | Run full detection pipeline |
| GET | `/api/results/history` | All past results |
| GET | `/api/results/<id>` | Single result by ID |
| GET | `/results/images/<filename>` | Serve result image |
| GET | `/uploads/images/<filename>` | Serve uploaded image |

---

## Configuration Highlights (`backend/config.py`)

| Parameter | Value |
|-----------|-------|
| API Host | 127.0.0.1 |
| API Port | 5000 |
| Max Upload | 50 MB |
| Allowed Extensions | png, jpg, jpeg, webp |
| YOLO Confidence | 0.25 |
| YOLO IoU | 0.45 |
| Min Detection Area | 0.04% of image |
| Max Detection Area | 65% of image |

---

## Dependencies

**Python (requirements.txt):**
- `Flask 3.1.3`, `flask-cors 6.0.2`
- `torch 2.5.1`, `torchvision 0.20.1`
- `ultralytics 8.3.100` (YOLOv8/v11 framework)
- `opencv-python 4.10.0.84`, `Pillow 11.0.0`
- `numpy 2.1.1`, `scipy 1.15.2`, `matplotlib 3.10.9`
- `PyYAML 6.0.3`, `requests 2.34.2`, `psutil 7.2.2`

**Frontend (CDN):**
- React 18.3.1 + React-DOM + Babel Standalone 7.29.0
- Three.js 0.128.0 + GLTFLoader

---

## Model Files

| File | Size | Purpose |
|------|------|---------|
| `yolo11n.pt` | 5.4 MB | YOLOv11 Nano base weights |
| `yolov8n.pt` | 6.3 MB | YOLOv8 Nano base weights |
| `yolov8s.pt` | 22 MB | YOLOv8 Small base weights |
| `backend/model/best.pt` | — | Trained model (not yet created) |

---

## Testing

- `tests/test_backend.py` – Flask API endpoint integration tests
- `tests/test_detector.py` – Detection algorithm unit tests
- `tests/test_zone_mapper.py` – Zone mapping validation

---

## Current Limitations & Future Work

| Item | Status |
|------|--------|
| Trained YOLO model (`best.pt`) | Not yet trained – demo mode active |
| Video processing | Infrastructure present, disabled |
| Segmentation masks | Bounding box only for now |
| Aircraft pose estimation (v2 zone mapping) | Planned |
| Production deployment (auth, scaling) | Not implemented |
| Docs stubs (`project_plan.md`, etc.) | Empty |

**Next step to activate full YOLO pipeline:**  
Run `tools/train_yolo_aircraft_damage.py` → output `backend/model/best.pt`

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Backend source lines | ~2,039 |
| Frontend source lines | ~1,000+ |
| Dataset images (total) | 28,447 |
| Damage classes | 7 |
| 3D aircraft models | 3 GLB files (4.8 MB) |
| API routes | 7 |
| Source datasets merged | 5 |

---

*Analysis generated 2026-06-03*
