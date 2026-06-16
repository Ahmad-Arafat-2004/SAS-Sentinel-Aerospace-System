document.addEventListener("DOMContentLoaded", () => {
  if (!window.AircraftAPI) {
    const status = document.getElementById("resultStatus");
    if (status) {
      status.textContent = "Frontend API helper was not loaded.";
      status.classList.add("error");
    }
    return;
  }

  const els = {
    resultStatus: byId("resultStatus"),
    statusCard: byId("statusCard"),
    resultImageBox: byId("resultImageBox"),
    resultImage: byId("resultImage"),
    resultEmptyState: byId("resultEmptyState"),
    originalImageBox: byId("originalImageBox"),
    originalImage: byId("originalImage"),
    originalEmptyState: byId("originalEmptyState"),
    resultIdText: byId("resultIdText"),
    createdAtText: byId("createdAtText"),
    originalFileText: byId("originalFileText"),
    aircraftTypeText: byId("aircraftTypeText"),
    aircraftConfidenceText: byId("aircraftConfidenceText"),
    modelFileText: byId("modelFileText"),
    datasetSourceText: byId("datasetSourceText"),
    damageStatusText: byId("damageStatusText"),
    damageStatusConfidenceText: byId("damageStatusConfidenceText"),
    viewText: byId("viewText"),
    modelModeText: byId("modelModeText"),
    totalDetectionsText: byId("totalDetectionsText"),
    noDetectionBox: byId("noDetectionBox"),
    damageTypeText: byId("damageTypeText"),
    severityText: byId("severityText"),
    confidenceText: byId("confidenceText"),
    areaRatioText: byId("areaRatioText"),
    zoneText: byId("zoneText"),
    position3dText: byId("position3dText"),
    recommendationText: byId("recommendationText"),
    open3dButton: byId("open3dButton"),
    jsonLink: byId("jsonLink"),
  };

  loadResultPage();

  async function loadResultPage() {
    try {
      setStatus("Loading detection result...", "loading");
      const resultId = getResultIdFromUrl();
      let result = resultId ? await AircraftAPI.getResultById(resultId) : AircraftAPI.getLatestResult();

      if (!result && AircraftAPI.getLatestResultId()) {
        result = await AircraftAPI.getResultById(AircraftAPI.getLatestResultId());
      }
      if (!result) throw new Error("No result found. Please upload and analyze an image first.");

      AircraftAPI.saveLatestResult(result);
      AircraftAPI.saveLatestResultId(AircraftAPI.getResultId(result));
      AircraftAPI.saveSelectedZone(AircraftAPI.getResultZone(result));
      renderResult(result);
      setStatus("Result loaded successfully", "success");
    } catch (error) {
      console.error("Result page error:", error);
      setStatus(error.message || "Failed to load result.", "error");
      renderEmptyResult();
    }
  }

  function renderResult(result) {
    const detections = Array.isArray(result.detections) ? result.detections : [];
    const first = detections[0] || {};
    const isDamaged = AircraftAPI.isResultDamaged(result) !== false;
    const processedUrl = result.processed_image_url || result.resultImageUrl || "";
    const originalUrl = result.original_image_url || result.originalImageUrl || "";
    const status = result.damage_status || (isDamaged ? "Damaged" : "No Damage");
    const modelFile = result.aircraft_model_file || getModelFileFromType(result.aircraft_type);

    renderImage(els.originalImageBox, els.originalImage, els.originalEmptyState, originalUrl);
    renderImage(els.resultImageBox, els.resultImage, els.resultEmptyState, processedUrl);

    setText(els.resultIdText, AircraftAPI.getResultId(result) || "---");
    setText(els.createdAtText, result.created_at || result.createdAt || "---");
    setText(els.originalFileText, result.original_filename || result.originalFile || "---");
    setText(els.aircraftTypeText, result.aircraft_type || result.aircraftType || "Default Aircraft");
    setText(els.aircraftConfidenceText, AircraftAPI.formatPercent(result.aircraft_confidence || 0));
    setText(els.modelFileText, modelFile);
    setText(els.datasetSourceText, result.dataset_source || result.datasetSource || "YOLOv8 Aircraft Surface Defect Dataset");
    setText(els.damageStatusText, status);
    setText(els.damageStatusConfidenceText, AircraftAPI.formatPercent(result.damage_status_confidence || result.confidence || 0));
    setText(els.viewText, formatTitle(result.aircraft_view || result.view || "---"));
    setText(els.modelModeText, formatTitle(result.model_mode || result.modelMode || "opencv_demo"));
    setText(els.totalDetectionsText, String(result.total_detections ?? result.totalDetections ?? detections.length));

    const damageType = result.damage_type || first.type || "No Damage";
    const severity = result.severity || first.severity || (isDamaged ? "Unknown" : "None");
    const zone = isDamaged ? (result.zone || first.zoneLabel || first.zone || "Unknown") : "None";
    const position = isDamaged ? (result.position_3d || first.position3d) : null;

    setText(els.damageTypeText, damageType);
    setText(els.confidenceText, AircraftAPI.formatPercent(result.confidence || first.confidence || 0));
    setText(els.severityText, formatTitle(severity));
    setSeverityClass(els.severityText, severity);
    setText(els.areaRatioText, AircraftAPI.formatPercent(result.area_ratio || first.areaRatio || 0));
    setText(els.zoneText, zone);
    setText(els.position3dText, isDamaged ? formatPosition(position) : "No zone highlight required");
    setText(els.recommendationText, formatRecommendations(result.recommendations, result.description));

    if (els.noDetectionBox) {
      els.noDetectionBox.style.display = isDamaged ? "none" : "block";
      els.noDetectionBox.textContent = result.description || "No visible aircraft surface damage was detected.";
    }
    if (els.statusCard) {
      els.statusCard.classList.toggle("result-safe", !isDamaged);
      els.statusCard.classList.toggle("result-warning", isDamaged);
    }
    if (els.jsonLink && result.resultJsonUrl) {
      els.jsonLink.href = result.resultJsonUrl;
      els.jsonLink.style.display = "inline-flex";
    }
    if (els.open3dButton) {
      els.open3dButton.onclick = () => open3DViewer(result);
    }
  }

  function renderImage(box, image, empty, url) {
    if (url && box && image) {
      image.src = url;
      box.style.display = "block";
      if (empty) empty.style.display = "none";
      return;
    }
    if (box) box.style.display = "none";
    if (empty) empty.style.display = "flex";
  }

  function renderEmptyResult() {
    renderImage(els.originalImageBox, els.originalImage, els.originalEmptyState, "");
    renderImage(els.resultImageBox, els.resultImage, els.resultEmptyState, "");
    [
      els.resultIdText, els.createdAtText, els.originalFileText, els.aircraftTypeText,
      els.aircraftConfidenceText, els.modelFileText, els.datasetSourceText, els.damageStatusText,
      els.damageStatusConfidenceText, els.viewText, els.modelModeText,
      els.totalDetectionsText, els.damageTypeText, els.confidenceText,
      els.severityText, els.areaRatioText, els.zoneText, els.position3dText,
      els.recommendationText,
    ].forEach((element) => setText(element, "---"));
  }

  function open3DViewer(result) {
    AircraftAPI.saveLatestResult(result);
    AircraftAPI.saveLatestResultId(AircraftAPI.getResultId(result));
    AircraftAPI.saveSelectedZone(AircraftAPI.getResultZone(result));
    const id = AircraftAPI.getResultId(result);
    window.location.href = id ? `viewer3d.html?result_id=${encodeURIComponent(id)}` : "viewer3d.html";
  }

  function getResultIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("result_id") || params.get("resultId") || params.get("id") || "";
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(element, value) {
    if (element) element.textContent = value ?? "---";
  }

  function setStatus(message, type = "info") {
    if (!els?.resultStatus && !document.getElementById("resultStatus")) return;
    const status = els?.resultStatus || document.getElementById("resultStatus");
    status.textContent = message;
    status.classList.remove("success", "error", "loading", "info");
    status.classList.add(type);
  }

  function formatRecommendations(recommendations, fallback) {
    if (Array.isArray(recommendations) && recommendations.length) {
      return recommendations.join(" ");
    }
    return fallback || "Manual inspection recommended.";
  }

  function formatPosition(position) {
    if (!position) return "---";
    return AircraftAPI.formatPosition3D(position);
  }

  function formatTitle(value) {
    if (value === null || value === undefined) return "---";
    return String(value).replaceAll("_", " ").replaceAll("-", " ").trim()
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  }

  function getModelFileFromType(type) {
    const value = String(type || "").toLowerCase();
    if (value.includes("747")) return "boeing_747.glb";
    if (value.includes("787")) return "boeing_787.glb";
    return "aircraft.glb";
  }

  function getSeverityClass(severity) {
    const value = String(severity || "").toLowerCase();
    if (value === "high" || value === "critical" || value === "major") return "severity-high";
    if (value === "medium") return "severity-medium";
    if (value === "low" || value === "minor") return "severity-low";
    if (value === "none") return "severity-none";
    return "severity-unknown";
  }

  function setSeverityClass(element, severity) {
    if (!element) return;
    element.classList.remove("severity-critical", "severity-high", "severity-medium", "severity-low", "severity-none", "severity-unknown");
    element.classList.add(getSeverityClass(severity));
  }
});
