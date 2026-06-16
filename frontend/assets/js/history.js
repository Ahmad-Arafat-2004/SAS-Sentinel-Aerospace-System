// ============================================================
// Aircraft Damage Detection 3D - History Page Logic
// File: frontend/assets/js/history.js
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const historyStatus = document.getElementById("historyStatus");

  const historyCountText = document.getElementById("historyCountText");
  const damageCountText = document.getElementById("damageCountText");
  const cleanCountText = document.getElementById("cleanCountText");
  const latestResultText = document.getElementById("latestResultText");

  const historyGrid = document.getElementById("historyGrid");
  const historySearchInput = document.getElementById("historySearchInput");
  const historyFilterSelect = document.getElementById("historyFilterSelect");
  const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");

  let allHistory = [];

  if (!window.AircraftAPI) {
    setStatus("api.js was not loaded. Make sure api.js loads before history.js.", "error");
    return;
  }

  loadHistory();

  if (refreshHistoryBtn) {
    refreshHistoryBtn.addEventListener("click", loadHistory);
  }

  if (historySearchInput) {
    historySearchInput.addEventListener("input", renderFilteredHistory);
  }

  if (historyFilterSelect) {
    historyFilterSelect.addEventListener("change", renderFilteredHistory);
  }

  async function loadHistory() {
    try {
      setStatus("Loading detection history...", "loading");
      renderLoading();

      const data = await AircraftAPI.getResultHistory();

      allHistory = Array.isArray(data.results)
        ? data.results
        : (Array.isArray(data.history) ? data.history : []);

      renderSummary(allHistory);
      renderFilteredHistory();

      setStatus("History loaded successfully", "success");
    } catch (error) {
      console.error("History load error:", error);
      setStatus(error.message || "Failed to load history.", "error");
      renderError(error.message || "Failed to load history.");
    }
  }

  function renderSummary(history) {
    const total = history.length;

    const damageCount = history.filter((item) => {
      return isDamaged(item);
    }).length;

    const cleanCount = total - damageCount;
    const latest = history[0];

    setText(historyCountText, `Total Results: ${total}`);
    setText(damageCountText, `Damage Results: ${damageCount}`);
    setText(cleanCountText, `Clean Results: ${cleanCount}`);
    setText(
      latestResultText,
      `Latest: ${latest?.created_at || latest?.createdAt || latest?.originalFile || "No result yet"}`
    );
  }

  function renderFilteredHistory() {
    const query = String(historySearchInput?.value || "").toLowerCase().trim();
    const filter = String(historyFilterSelect?.value || "all").toLowerCase();

    let filtered = [...allHistory];

    if (query) {
      filtered = filtered.filter((item) => {
        const first = getMainDetection(item);

        const text = [
          item.resultId,
          item.result_id,
          item.created_at,
          item.createdAt,
          item.originalFile,
          item.uploadedFile,
          item.view,
          item.modelMode,
          item.aircraft_type,
          item.damage_status,
          item.damage_type,
          first?.type,
          first?.severity,
          first?.zone,
          first?.zoneLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(query);
      });
    }

    if (filter !== "all") {
      filtered = filtered.filter((item) => {
        const first = getMainDetection(item);
        const severity = String(item.severity || first?.severity || "").toLowerCase();

        if (filter === "damage") {
          return isDamaged(item);
        }

        if (filter === "clean") {
          return !isDamaged(item);
        }

        return severity === filter;
      });
    }

    renderHistoryGrid(filtered);
  }

  function renderHistoryGrid(history) {
    if (!historyGrid) return;

    historyGrid.innerHTML = "";

    if (!history.length) {
      historyGrid.innerHTML = `
        <div class="history-empty">
          <i class="fa-regular fa-folder-open"></i>
          <p>No detection results found.</p>
          <a href="upload.html" class="primary-btn link-btn">
            <i class="fa-solid fa-upload"></i>
            Upload Image
          </a>
        </div>
      `;
      return;
    }

    history.forEach((item) => {
      const card = document.createElement("article");
      card.className = "history-card";

      const detections = getDetections(item);
      const first = getMainDetection(item);

      const damageDetected = isDamaged(item);

      const severity = String(item.severity || first?.severity || (damageDetected ? "unknown" : "none")).toLowerCase();
      const severityClass = getSeverityClass(severity);

      card.innerHTML = `
        <div class="history-image-box">
          ${
            getImageUrl(item)
              ? `<img src="${escapeHtml(getImageUrl(item))}" alt="Detection result">`
              : `<div class="history-no-image"><i class="fa-regular fa-image"></i></div>`
          }

          <span class="history-status-pill ${damageDetected ? "damage" : "clean"}">
            ${escapeHtml(item.damage_status || (damageDetected ? "Damaged" : "No Damage"))}
          </span>
        </div>

        <div class="history-card-body">
          <div class="history-card-top">
            <div>
              <h3>${escapeHtml(item.originalFile || "Unknown File")}</h3>
              <p>${escapeHtml(item.created_at || item.createdAt || "Unknown date")}</p>
            </div>

            <span class="severity-pill ${severityClass}">
              ${escapeHtml(formatTitle(severity))}
            </span>
          </div>

          <div class="history-details">
            <div>
              <span>View</span>
              <strong>${escapeHtml(formatTitle(item.view || "unknown"))}</strong>
            </div>

            <div>
              <span>Aircraft</span>
              <strong>${escapeHtml(item.aircraft_type || "Default Aircraft")}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>${escapeHtml(item.damage_status || (damageDetected ? "Damaged" : "No Damage"))}</strong>
            </div>

            <div>
              <span>Zone</span>
              <strong>${escapeHtml(damageDetected ? (item.zone || first?.zoneLabel || first?.zone || "---") : "None")}</strong>
            </div>

            <div>
              <span>Confidence</span>
              <strong>${AircraftAPI.formatPercent(item.confidence || item.damage_status_confidence || first?.confidence || 0)}</strong>
            </div>
          </div>

          <div class="history-damage-summary">
            <strong>${escapeHtml(item.damage_type || first?.type || "No visible damage")}</strong>
            <p>${escapeHtml(first?.recommendation || item.description || item.message || "No recommendation available.")}</p>
          </div>

          <div class="history-actions">
            <button type="button" class="primary-btn" data-action="result">
              <i class="fa-solid fa-chart-simple"></i>
              Open Result
            </button>

            <button type="button" class="secondary-btn" data-action="viewer">
              <i class="fa-solid fa-cube"></i>
              3D Viewer
            </button>

            ${
              item.resultJsonUrl
                ? `<a href="${escapeHtml(item.resultJsonUrl)}" target="_blank" class="text-link">
                    <i class="fa-solid fa-code"></i>
                    JSON
                   </a>`
                : ""
            }
          </div>
        </div>
      `;

      const resultButton = card.querySelector('[data-action="result"]');
      const viewerButton = card.querySelector('[data-action="viewer"]');

      if (resultButton) {
        resultButton.addEventListener("click", () => {
          openResult(item);
        });
      }

      if (viewerButton) {
        viewerButton.addEventListener("click", () => {
          openViewer(item);
        });
      }

      historyGrid.appendChild(card);
    });
  }

  function renderLoading() {
    if (!historyGrid) return;

    historyGrid.innerHTML = `
      <div class="history-empty">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Loading detection history...</p>
      </div>
    `;
  }

  function renderError(message) {
    if (!historyGrid) return;

    historyGrid.innerHTML = `
      <div class="history-empty error">
        <i class="fa-solid fa-circle-exclamation"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

function openResult(item) {
  AircraftAPI.saveLatestResult(item);
  AircraftAPI.saveLatestResultId(getResultId(item));
  AircraftAPI.saveSelectedZone(isDamaged(item) ? getPrimaryZone(item) : "");

  const resultId = getResultId(item);

  if (resultId) {
    window.location.href = `result.html?id=${encodeURIComponent(resultId)}`;
  } else {
    window.location.href = "result.html";
  }
}

function openViewer(item) {
  AircraftAPI.saveLatestResult(item);
  AircraftAPI.saveLatestResultId(getResultId(item));
  AircraftAPI.saveSelectedZone(isDamaged(item) ? getPrimaryZone(item) : "");

  const resultId = getResultId(item);

  if (resultId) {
    window.location.href = `viewer3d.html?result_id=${encodeURIComponent(resultId)}`;
  } else {
    window.location.href = "viewer3d.html";
  }
}

function getResultId(item) {
  return item?.resultId || item?.result_id || item?.id || "";
}
  function getImageUrl(item) {
    return item?.processed_image_url || item?.resultImageUrl || "";
  }

  function getPrimaryZone(item) {
    if (!item) return "";
    if (item.zone) return item.zone;
    const first = getMainDetection(item);
    return first?.zoneLabel || first?.zone || "";
  }
  function isDamaged(item) {
    if (!item) return false;
    if (typeof item.is_damaged === "boolean") return item.is_damaged;
    if (typeof item.damageDetected === "boolean") return item.damageDetected;
    if (String(item.damage_status || "").toLowerCase() === "no damage") return false;
    return getDetections(item).length > 0;
  }
  function getDetections(item) {
    return Array.isArray(item?.detections) ? item.detections : [];
  }

  function getMainDetection(item) {
    const detections = getDetections(item);
    return detections.length > 0 ? detections[0] : null;
  }

  function setStatus(message, type = "info") {
    if (!historyStatus) {
      console.log(`[${type}] ${message}`);
      return;
    }

    historyStatus.textContent = message;
    historyStatus.classList.remove("success", "error", "loading", "info");
    historyStatus.classList.add(type);
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function getSeverityClass(severity) {
    const value = String(severity || "").toLowerCase();

    if (value === "critical") return "severity-critical";
    if (value === "high") return "severity-high";
    if (value === "major") return "severity-high";
    if (value === "medium") return "severity-medium";
    if (value === "low") return "severity-low";
    if (value === "minor") return "severity-low";
    if (value === "none") return "severity-none";

    return "severity-unknown";
  }

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

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
