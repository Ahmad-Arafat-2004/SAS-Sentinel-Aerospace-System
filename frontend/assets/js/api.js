// ============================================================
// Aircraft Damage Detection 3D - API Helper
// File: frontend/assets/js/api.js
// ============================================================

// Backend base URL
const API_BASE_URL = "http://127.0.0.1:5000";

// ============================================================
// API Endpoints
// ============================================================

const API_ENDPOINTS = {
  root: `${API_BASE_URL}/`,
  health: `${API_BASE_URL}/api/health`,
  detectImage: `${API_BASE_URL}/api/detect/image`,
  history: `${API_BASE_URL}/api/results/history`,
  singleResult: (resultId) => `${API_BASE_URL}/api/results/${encodeURIComponent(resultId)}`,
};

// ============================================================
// Local Storage Keys
// ============================================================

const STORAGE_KEYS = {
  latestResult: "aircraft_latest_result",
  latestResultId: "aircraft_latest_result_id",
  selectedZone: "aircraft_selected_zone",
};

// ============================================================
// Helper: Safe JSON Parse
// ============================================================

function safeJsonParse(value, fallback = null) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

// ============================================================
// Helper: Get Result ID Safely
// ============================================================

function getResultId(result) {
  return result?.resultId || result?.result_id || result?.id || "";
}

function getResultZone(result) {
  if (!result) return "";
  if (isResultDamaged(result) === false) return "";
  if (result.zone) return result.zone;
  const detections = Array.isArray(result.detections) ? result.detections : [];
  const first = detections[0] || {};
  return first.zoneLabel || first.zone || "";
}

function isResultDamaged(result) {
  if (!result) return null;
  if (typeof result.is_damaged === "boolean") return result.is_damaged;
  if (typeof result.damageDetected === "boolean") return result.damageDetected;
  if (String(result.damage_status || "").toLowerCase() === "no damage") return false;
  const detections = Array.isArray(result.detections) ? result.detections : [];
  return detections.length > 0;
}

// ============================================================
// Helper: Normalize API Result
// ============================================================

function normalizeResultPayload(data) {
  if (!data) return data;

  // Some APIs return the result directly:
  // { success: true, resultId: "...", detections: [...] }
  if (data.resultId || data.result_id || data.id || Array.isArray(data.detections)) {
    return data;
  }

  // Some APIs may wrap it:
  // { success: true, result: {...} }
  if (data.result) {
    return data.result;
  }

  // Some APIs may wrap it:
  // { success: true, data: {...} }
  if (data.data) {
    return data.data;
  }

  return data;
}

// ============================================================
// Helper: Normalize History Payload
// ============================================================

function normalizeHistoryPayload(data) {
  if (!data) {
    return { success: true, history: [] };
  }

  // Expected format:
  // { success: true, history: [...] }
  if (Array.isArray(data.history)) {
    return data;
  }

  // Alternative:
  // { success: true, results: [...] }
  if (Array.isArray(data.results)) {
    return {
      ...data,
      history: data.results,
    };
  }

  // Alternative:
  // [ ... ]
  if (Array.isArray(data)) {
    return {
      success: true,
      history: data,
    };
  }

  return {
    ...data,
    history: [],
  };
}

// ============================================================
// Helper: API Error Handler
// ============================================================

async function handleApiResponse(response) {
  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Invalid server response. Backend did not return JSON.");
  }

  if (!response.ok || data.success === false) {
    const message =
      data.error ||
      data.message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

// ============================================================
// Health Check
// ============================================================

async function checkBackendHealth() {
  const response = await fetch(API_ENDPOINTS.health, {
    method: "GET",
  });

  return await handleApiResponse(response);
}

const healthCheck = checkBackendHealth;

// ============================================================
// Detect Image
// ============================================================

async function detectImage(file, view = "right") {
  if (!file) {
    throw new Error("No image file selected.");
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("view", view);

  const response = await fetch(API_ENDPOINTS.detectImage, {
    method: "POST",
    body: formData,
  });

  const data = await handleApiResponse(response);
  const result = normalizeResultPayload(data);

  saveLatestResult(result);

  return result;
}

const detectDamageImage = detectImage;

// ============================================================
// Get Result By ID
// ============================================================

async function getResultById(resultId) {
  if (!resultId) {
    throw new Error("No result ID provided.");
  }

  const response = await fetch(API_ENDPOINTS.singleResult(resultId), {
    method: "GET",
  });

  const data = await handleApiResponse(response);
  const result = normalizeResultPayload(data);

  saveLatestResult(result);

  return result;
}

// ============================================================
// Get Detection History
// ============================================================

async function getResultHistory() {
  const response = await fetch(API_ENDPOINTS.history, {
    method: "GET",
  });

  const data = await handleApiResponse(response);
  return normalizeHistoryPayload(data);
}

const getHistory = getResultHistory;

// ============================================================
// Local Storage: Save Latest Result
// ============================================================

function saveLatestResult(result) {
  if (!result) return;

  try {
    localStorage.setItem(STORAGE_KEYS.latestResult, JSON.stringify(result));

    const resultId = getResultId(result);

    if (resultId) {
      localStorage.setItem(STORAGE_KEYS.latestResultId, resultId);
    }

    const zone = getResultZone(result);
    if (zone) {
      localStorage.setItem(STORAGE_KEYS.selectedZone, zone);
    } else {
      localStorage.removeItem(STORAGE_KEYS.selectedZone);
    }
  } catch (error) {
    console.warn("Could not save latest result to localStorage:", error);
  }
}

// ============================================================
// Local Storage: Get Latest Result
// ============================================================

function getLatestResult() {
  const raw = localStorage.getItem(STORAGE_KEYS.latestResult);
  return safeJsonParse(raw, null);
}

// ============================================================
// Local Storage: Get Latest Result ID
// ============================================================

function getLatestResultId() {
  return localStorage.getItem(STORAGE_KEYS.latestResultId) || "";
}

function saveLatestResultId(id) {
  if (!id) return;
  localStorage.setItem(STORAGE_KEYS.latestResultId, String(id));
}

function saveSelectedZone(zone) {
  if (!zone || String(zone).toLowerCase() === "none") {
    localStorage.removeItem(STORAGE_KEYS.selectedZone);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.selectedZone, String(zone));
}

function getSelectedZone() {
  return localStorage.getItem(STORAGE_KEYS.selectedZone) || "";
}

// ============================================================
// Local Storage: Clear Latest Result
// ============================================================

function clearLatestResult() {
  try {
    localStorage.removeItem(STORAGE_KEYS.latestResult);
    localStorage.removeItem(STORAGE_KEYS.latestResultId);
    localStorage.removeItem(STORAGE_KEYS.selectedZone);
  } catch (error) {
    console.warn("Could not clear latest result from localStorage:", error);
  }
}

// ============================================================
// Navigation: Open Result Page
// ============================================================

function openResultPage(resultId = null) {
  const id = resultId || getLatestResultId();

  if (id) {
    window.location.href = `result.html?id=${encodeURIComponent(id)}`;
  } else {
    window.location.href = "result.html";
  }
}

// ============================================================
// Navigation: Open 3D Viewer
// ============================================================

function openViewerPage(resultId = null) {
  const id = resultId || getLatestResultId();

  if (id) {
    window.location.href = `viewer3d.html?result_id=${encodeURIComponent(id)}`;
  } else {
    window.location.href = "viewer3d.html";
  }
}

// ============================================================
// Format Detection Summary
// ============================================================

function formatDetectionSummary(result) {
  if (!result) {
    return "No result data available.";
  }

  const detections = Array.isArray(result.detections) ? result.detections : [];

  if (!result.damageDetected && detections.length === 0) {
    return "No visible aircraft surface damage detected.";
  }

  const firstDetection = detections[0];

  if (!firstDetection) {
    return "No visible aircraft surface damage detected.";
  }

  return [
    `Damage Type: ${firstDetection.type || firstDetection.damageType || "Unknown"}`,
    `Severity: ${formatTitle(firstDetection.severity || "Unknown")}`,
    `Confidence: ${formatPercent(firstDetection.confidence || 0)}`,
    `Zone: ${firstDetection.zoneLabel || firstDetection.zone || "Unknown Aircraft Zone"}`,
  ].join("\n");
}

// ============================================================
// Format Percentage
// Supports both:
// 0.91 → 91%
// 91   → 91%
// ============================================================

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0%";
  }

  if (number <= 1) {
    return `${Math.round(number * 100)}%`;
  }

  return `${Math.round(number)}%`;
}

// ============================================================
// Format Title
// ============================================================

function formatTitle(value) {
  if (value === null || value === undefined) return "---";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
    });
}

// ============================================================
// Format 3D Position
// Supports both:
// { x, y, z }
// [x, y, z]
// ============================================================

function formatPosition3D(position3d) {
  const pos = normalizePosition3D(position3d);

  if (!pos) {
    return "---";
  }

  return `x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}`;
}

// ============================================================
// Normalize 3D Position
// ============================================================

function normalizePosition3D(position3d) {
  if (!position3d) {
    return null;
  }

  if (
    typeof position3d === "object" &&
    !Array.isArray(position3d) &&
    "x" in position3d &&
    "y" in position3d &&
    "z" in position3d
  ) {
    return {
      x: safeNumber(position3d.x),
      y: safeNumber(position3d.y),
      z: safeNumber(position3d.z),
    };
  }

  if (Array.isArray(position3d) && position3d.length >= 3) {
    return {
      x: safeNumber(position3d[0]),
      y: safeNumber(position3d[1]),
      z: safeNumber(position3d[2]),
    };
  }

  return null;
}

// ============================================================
// Safe Number
// ============================================================

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

// ============================================================
// Expose API globally
// ============================================================

window.AircraftAPI = {
  API_BASE_URL,
  API_ENDPOINTS,
  STORAGE_KEYS,

  checkBackendHealth,
  healthCheck,
  detectImage,
  detectDamageImage,
  getResultById,
  getResultHistory,
  getHistory,

  saveLatestResult,
  getLatestResult,
  saveLatestResultId,
  getLatestResultId,
  clearLatestResult,
  saveSelectedZone,
  getSelectedZone,

  openResultPage,
  openViewerPage,

  getResultId,
  getResultZone,
  isResultDamaged,
  normalizeResultPayload,
  normalizeHistoryPayload,

  formatDetectionSummary,
  formatPercent,
  formatTitle,
  formatPosition3D,
  normalizePosition3D,
};
