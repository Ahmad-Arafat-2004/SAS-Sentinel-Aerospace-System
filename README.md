# SAS: Sentinel Aerospace System for Aircraft Surface Damage Detection and 3D Localization Using Deep Learning

SAS, short for **Sentinel Aerospace System**, is a computer vision and artificial intelligence-based web application designed for aircraft surface damage detection, severity estimation, aircraft type classification, and interactive 3D localization.

The system allows users to upload aircraft images or videos, detects visible surface damage using a YOLOv8-based object detection model, estimates the damage severity, maps the detected damage to an aircraft zone, and visualizes the result on an interactive 3D aircraft model.

---

## Project Overview

Aircraft surface inspection is an important task in aviation maintenance. Traditional visual inspection can be time-consuming, subjective, and affected by lighting conditions, camera angle, inspector fatigue, and human error.

This project proposes a web-based AI inspection-support platform that combines:

- Aircraft type classification
- YOLOv8-based aircraft damage detection
- Damage severity estimation
- Zone-based aircraft damage mapping
- Interactive 3D localization using Three.js
- Flask backend API
- Web frontend for upload, detection, results, and history

The goal of SAS is to support aircraft inspection by providing clear visual detection results and approximate 3D localization of the damaged region.

---

## Main Features

- Upload aircraft images or videos
- Detect visible aircraft surface damage
- Classify damage type
- Estimate severity level
- Predict aircraft type
- Map detected damage to aircraft zone
- Visualize damage on an interactive 3D aircraft model
- Store and view previous inspection history
- Display annotated detection results
- Support aircraft-specific 3D visualization

---

## Supported Aircraft Types

The aircraft type classification model supports:

- Boeing 737
- Boeing 747
- Boeing 787

The predicted aircraft type is used to support aircraft-specific visualization and 3D model selection.

---

## Supported Damage Classes

The YOLOv8 damage detection model supports seven aircraft surface damage classes:

| Class ID | Damage Class |
|---------:|--------------|
| 0 | Crack |
| 1 | Scratch |
| 2 | Dent |
| 3 | Corrosion |
| 4 | Paint Damage |
| 5 | Fastener Damage |
| 6 | Rupture |

---

## System Architecture

The SAS system is designed as a full-stack AI web application.

### Main Components

1. **Frontend Interface**
   - Dashboard
   - Aircraft selection page
   - Upload and detection page
   - Result page
   - 3D viewer page
   - History page

2. **Flask Backend**
   - Receives uploaded files
   - Validates images and videos
   - Runs AI inference
   - Sends results to frontend
   - Stores inspection history

3. **AI Inference Engine**
   - Aircraft type classification
   - YOLOv8 damage detection
   - Post-processing
   - Severity estimation
   - Zone mapping

4. **3D Localization Viewer**
   - Built using Three.js
   - Loads aircraft `.glb` models
   - Highlights approximate damage zone
   - Provides interactive rotate and zoom controls

5. **History Storage**
   - Stores previous inspection records
   - Saves file name, damage type, severity, confidence, zone, and timestamp

---

## AI Pipeline

The system follows a multi-stage AI pipeline:

1. User uploads an aircraft image or video
2. Backend validates the uploaded input
3. Image preprocessing is applied
4. Aircraft type classification is performed
5. YOLOv8 damage detection is applied
6. Bounding boxes and confidence scores are generated
7. Severity level is estimated
8. Damage is mapped to an aircraft zone
9. Result is displayed in the web interface
10. Damage location is visualized in the 3D viewer
11. Inspection result is stored in history

---

## Model Performance

### Aircraft Type Classification

The aircraft type classification model was trained on three aircraft classes:

- Boeing 737
- Boeing 747
- Boeing 787

Dataset split:

| Split | Images |
|------:|-------:|
| Training | 556 |
| Validation | 118 |
| Test | 121 |
| Total | 795 |

Final result:

| Metric | Value |
|-------|-------|
| Test Accuracy | 95.04% |

---

### Aircraft Damage Detection

The YOLOv8s damage detection model was trained on a cleaned aircraft damage dataset with seven classes.

Dataset split:

| Split | Images |
|------:|-------:|
| Training | 24,513 |
| Validation | 1,867 |
| Test | 1,314 |
| Total | 27,694 |

Final YOLOv8s detection results:

| Metric | Value |
|-------|-------|
| Training Epochs | 20 |
| mAP@0.5 | 0.752 |
| mAP@0.5:0.95 | approximately 0.504 |
| Best F1 Score | 0.74 at confidence 0.390 |

---

## Technologies Used

### Artificial Intelligence and Computer Vision

- Python
- YOLOv8
- Ultralytics
- OpenCV
- NumPy
- Deep Learning
- Object Detection
- Image Classification

### Backend

- Flask
- REST API
- Python

### Frontend

- HTML
- CSS
- JavaScript

### 3D Visualization

- Three.js
- WebGL
- GLB aircraft models

### Dataset and Training

- YOLO format dataset
- Bounding box annotations
- Aircraft type classification dataset
- Aircraft surface damage detection dataset

---

## Project Structure

```text
SAS-Aircraft-Damage-Detection/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── model/
│   │   ├── best.pt
│   │   └── aircraft_type_best.pt
│   └── utils/
│       ├── detector.py
│       ├── severity.py
│       ├── zone_mapper.py
│       ├── file_handler.py
│       └── video_processor.py
│
├── frontend/
│   ├── index.html
│   ├── upload.html
│   ├── result.html
│   ├── viewer3d.html
│   ├── history.html
│   └── assets/
│       ├── css/
│       ├── js/
│       └── models/
│           ├── aircraft.glb
│           ├── boeing_737.glb
│           ├── boeing_747.glb
│           └── boeing_787.glb
│
├── data/
│   ├── uploads/
│   ├── results/
│   └── history/
│
├── docs/
│   ├── paper/
│   ├── figures/
│   └── results/
│
├── requirements.txt
└── README.md
````

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/SAS-Aircraft-Damage-Detection.git
cd SAS-Aircraft-Damage-Detection
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

### 3. Activate the Virtual Environment

For Windows:

```bash
venv\Scripts\activate
```

For macOS or Linux:

```bash
source venv/bin/activate
```

### 4. Install Requirements

```bash
pip install -r requirements.txt
```

---

## Requirements

Example `requirements.txt`:

```text
flask
ultralytics
opencv-python
numpy
pillow
werkzeug
```

Additional packages may be required depending on the final implementation.

---

## Running the Project

### 1. Start the Flask Backend

```bash
cd backend
python app.py
```

The backend should start on:

```text
http://127.0.0.1:5000
```

### 2. Open the Frontend

Open the frontend pages in your browser, or run a local server from the frontend folder:

```bash
cd frontend
python -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500
```

---

## How to Use

1. Open the web interface
2. Go to the upload page
3. Upload an aircraft image or video
4. Wait for the AI detection result
5. View the detected damage type, confidence, severity, and aircraft zone
6. Open the 3D viewer to see the approximate damage location
7. Check the history page to review previous inspections

---

## Example Outputs

### Aircraft Type Classification

The system can classify uploaded aircraft images into supported aircraft types such as Boeing 737, Boeing 747, and Boeing 787.

### Damage Detection Result

The system detects aircraft surface damage and displays:

* Damage class
* Confidence score
* Severity level
* Aircraft zone
* Annotated image

### 3D Localization

The system maps the detected damage to an approximate aircraft zone and highlights it on a 3D aircraft model.

---

## Research Paper

This project is supported by a research paper titled:

**SAS: Sentinel Aerospace System for Aircraft Surface Damage Detection and 3D Localization Using Deep Learning**

The paper explains the system architecture, dataset preparation, YOLOv8 model training, evaluation results, 3D localization method, limitations, and future work.

---

## Team Members

* Abedulrhman Sameer AL-Naser
* Ahmad Abed El-Thahir Arafat
* Omar Sami Ismail Hussein

---

## Supervisor

* Dr. Marya Yousef
  Department of Computer Science / AI
  Middle East University
  Amman, Jordan

---

## Results Summary

| Component                             | Result              |
| ------------------------------------- | ------------------- |
| Aircraft Type Classification Accuracy | 95.04%              |
| YOLOv8s Damage Detection mAP@0.5      | 0.752               |
| YOLOv8s Damage Detection mAP@0.5:0.95 | approximately 0.504 |
| Best F1 Score                         | 0.74                |
| Best Confidence Threshold             | 0.390               |

---

## Limitations

The current system is a prototype and has some limitations:

* Supports only Boeing 737, Boeing 747, and Boeing 787
* Uses zone-based 3D localization instead of exact geometric projection
* Severity estimation is rule-based
* Performance depends on dataset quality and image conditions
* Not certified for real aviation maintenance use
* Requires further validation using real aircraft maintenance data

---

## Future Work

Possible future improvements include:

* Adding more aircraft types
* Expanding the aircraft damage dataset
* Improving corrosion detection performance
* Supporting real-time video inspection
* Improving 2D-to-3D damage localization accuracy
* Adding more detailed aircraft models
* Using pose estimation or depth estimation for better localization
* Adding exportable PDF inspection reports
* Validating the system with aviation maintenance experts

---

## Disclaimer

This project is developed for academic and research purposes only.
It is not certified for real-world aircraft maintenance, aviation safety decisions, or official inspection procedures.

The system should be considered an inspection-support prototype and not a replacement for certified maintenance engineers or official aircraft inspection standards.

---

## License

This project is for academic use.
You can add your preferred license, such as MIT License, if you want to make the project open source.

---

## Keywords

Computer Vision, Deep Learning, YOLOv8, Aircraft Damage Detection, Object Detection, Aircraft Inspection, 3D Localization, Flask, Three.js, Artificial Intelligence, Web Application


