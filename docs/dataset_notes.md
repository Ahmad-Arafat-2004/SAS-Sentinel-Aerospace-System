# Dataset Notes

Main dataset:

`Aircraft Surface Defect Detection.v3-version-i.yolov8/data.yaml`

YOLOv8 classes:

- `crack`
- `dent`
- `missing-head`
- `paint-off`
- `scratch`

The legacy path `dataset/yolo/data.yaml` is kept as a compatibility pointer to
the new dataset. It should not be treated as a separate dataset.

Current backend behavior:

- If `backend/model/best.pt` exists and `ultralytics` is installed, the detector
  attempts YOLOv8 inference.
- If weights are missing or cannot load, the backend uses the OpenCV demo
  detector so the local university demo remains runnable.

Future training target:

```powershell
yolo detect train data="Aircraft Surface Defect Detection.v3-version-i.yolov8/data.yaml" model=yolov8n.pt epochs=50 imgsz=640
```

After training, copy the final weights to:

`backend/model/best.pt`
