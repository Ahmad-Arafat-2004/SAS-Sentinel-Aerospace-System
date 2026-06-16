// ============================================================
// Aircraft Damage Detection 3D - Upload Page Logic
// File: frontend/assets/js/upload.js
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const uploadForm = document.getElementById("uploadForm");
  const imageInput = document.getElementById("imageInput");
  const viewSelect = document.getElementById("viewSelect");

  const previewBox = document.getElementById("previewBox");
  const previewImage = document.getElementById("previewImage");

  const uploadButton = document.getElementById("uploadButton");
  const statusBox = document.getElementById("statusBox");
  const backendStatus = document.getElementById("backendStatus");

  const selectedFileName = document.getElementById("selectedFileName");
  const dropArea = document.querySelector(".file-drop-area");

  let selectedFile = null;

  // ------------------------------------------------------------
  // Make sure api.js is loaded
  // ------------------------------------------------------------
  if (!window.AircraftAPI) {
    showStatus(
      "Frontend API helper was not loaded. Make sure api.js is included before upload.js.",
      "error"
    );
    return;
  }

  // ------------------------------------------------------------
  // Check backend status when page loads
  // ------------------------------------------------------------
  checkBackend();

  // ------------------------------------------------------------
  // Image selection preview
  // ------------------------------------------------------------
  if (imageInput) {
    imageInput.addEventListener("change", handleImageSelection);
  }

  if (dropArea) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropArea.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropArea.classList.add("drag-active");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropArea.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropArea.classList.remove("drag-active");
      });
    });

    dropArea.addEventListener("drop", (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      selectedFile = file;
      if (imageInput) {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        imageInput.files = transfer.files;
      }
      handleSelectedFile(file);
    });
  }

  // ------------------------------------------------------------
  // Upload form submit
  // ------------------------------------------------------------
  if (uploadForm) {
    uploadForm.addEventListener("submit", handleUploadSubmit);
  }

  // ============================================================
  // Functions
  // ============================================================

  async function checkBackend() {
    try {
      const health = await AircraftAPI.checkBackendHealth();

      if (backendStatus) {
        backendStatus.textContent = "Backend connected";
        backendStatus.classList.remove("error");
        backendStatus.classList.add("success");
      }

      console.log("Backend health:", health);
    } catch (error) {
      if (backendStatus) {
        backendStatus.textContent = "Backend not connected";
        backendStatus.classList.remove("success");
        backendStatus.classList.add("error");
      }

      showStatus(
        "Backend is not connected. Run the Flask server first: python app.py",
        "error"
      );

      console.error("Backend health error:", error);
    }
  }

  function handleImageSelection(event) {
    const file = event.target.files[0];
    handleSelectedFile(file);
  }

  function handleSelectedFile(file) {
    if (!file) {
      selectedFile = null;
      clearPreview();
      return;
    }

    if (!isValidImageFile(file)) {
      selectedFile = null;
      imageInput.value = "";
      clearPreview();
      showStatus("Invalid image type. Please upload JPG, PNG, JPEG, or WEBP.", "error");
      return;
    }

    selectedFile = file;

    if (selectedFileName) {
      selectedFileName.textContent = file.name;
    }

    showImagePreview(file);
    showStatus("Image selected successfully. Ready for detection.", "success");
  }

  function isValidImageFile(file) {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    return allowedTypes.includes(file.type);
  }

  function showImagePreview(file) {
    if (!previewImage || !previewBox) return;

    const reader = new FileReader();

    reader.onload = function (event) {
      previewImage.src = event.target.result;
      previewImage.alt = file.name;
      previewBox.style.display = "block";

      const emptyPreview = document.getElementById("emptyPreview");
        if (emptyPreview) {
            emptyPreview.style.display = "none";
        }
    };

    reader.readAsDataURL(file);
  }

function clearPreview() {
  const emptyPreview = document.getElementById("emptyPreview");

  if (previewImage) {
    previewImage.src = "";
    previewImage.alt = "";
  }

  if (previewBox) {
    previewBox.style.display = "none";
  }

  if (emptyPreview) {
    emptyPreview.style.display = "flex";
  }

  if (selectedFileName) {
    selectedFileName.textContent = "No file selected";
  }
}

  async function handleUploadSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      showStatus("Please choose an aircraft image first.", "error");
      return;
    }

    const view = viewSelect ? viewSelect.value : "right";

    setLoading(true);
    showStatus("Uploading image and running detection...", "loading");

    try {
      const result = await AircraftAPI.detectImage(selectedFile, view);
      const resultId = AircraftAPI.getResultId(result);
      const zone = AircraftAPI.getResultZone(result);

      AircraftAPI.saveLatestResult(result);
      AircraftAPI.saveLatestResultId(resultId);
      AircraftAPI.saveSelectedZone(zone);

      showStatus("Detection completed successfully. Opening result page...", "success");

      console.log("Detection result:", result);

      setTimeout(() => {
        AircraftAPI.openResultPage(resultId);
      }, 700);
    } catch (error) {
      console.error("Upload/detection error:", error);
      showStatus(error.message || "Detection failed. Please try again.", "error");
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    if (!uploadButton) return;

    uploadButton.disabled = isLoading;

    if (isLoading) {
      uploadButton.dataset.originalText = uploadButton.textContent;
      uploadButton.textContent = "Analyzing...";
    } else {
      uploadButton.textContent = uploadButton.dataset.originalText || "Start Detection";
    }
  }

  function showStatus(message, type = "info") {
    if (!statusBox) {
      console.log(`[${type}] ${message}`);
      return;
    }

    statusBox.textContent = message;

    statusBox.classList.remove(
      "success",
      "error",
      "loading",
      "info"
    );

    statusBox.classList.add(type);
    statusBox.style.display = "block";
  }
});
