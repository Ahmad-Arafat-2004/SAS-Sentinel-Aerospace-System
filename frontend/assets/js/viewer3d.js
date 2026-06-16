// ============================================================
// Aircraft Damage Detection 3D - Viewer Logic
// File: frontend/assets/js/viewer3d.js
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // DOM Elements
  // ============================================================

  const canvas = document.getElementById("aircraftCanvas");
  const canvasHost = document.getElementById("viewerCanvasHost");

  const viewerStatus = document.getElementById("viewerStatus");
  const modelStatusText = document.getElementById("modelStatusText");
  const modelHudText = document.querySelector(".viewer-top-hud strong");

  const damageType3d = document.getElementById("damageType3d");
  const severity3d = document.getElementById("severity3d");
  const confidence3d = document.getElementById("confidence3d");
  const zone3d = document.getElementById("zone3d");
  const position3dText = document.getElementById("position3d");
  const recommendation3d = document.getElementById("recommendation3d");

  const resetViewBtn = document.getElementById("resetViewBtn");
  const toggleWireBtn = document.getElementById("toggleWireBtn");
  const focusDamageBtn = document.getElementById("focusDamageBtn");
  const backResultBtn = document.getElementById("backResultBtn");
  const modelSelector = document.getElementById("modelSelector");

  const damageLabel = document.getElementById("damageLabel");
  const damageLabelTitle = document.getElementById("damageLabelTitle");
  const damageLabelZone = document.getElementById("damageLabelZone");
  const detectedZoneLabel = document.getElementById("detectedZoneLabel");
  const zoneButtons = document.querySelectorAll("[data-zone]");

  // ============================================================
  // Safety Checks
  // ============================================================

  if (!canvas || !canvasHost) {
    console.error("Viewer canvas or host not found.");
    return;
  }

  if (!window.THREE) {
    setViewerStatus("Three.js is not loaded. Check script links in viewer3d.html.", "error");
    return;
  }

  if (!window.AircraftAPI) {
    setViewerStatus("api.js is not loaded. Make sure api.js loads before viewer3d.js.", "error");
    return;
  }

  // ============================================================
  // Global Viewer State
  // ============================================================

  let scene;
  let camera;
  let renderer;
  let aircraftGroup;
  let aircraftModel = null;
  let controls = null;

  let damageMarker = null;
  let damageHalo = null;
  let damageLine = null;
  let zoneOverlay = null;

  let currentResult = null;
  let currentDetection = null;
  let currentSelectedZone = "";

  let isWireframe = false;
  let animationFrameId = null;

  // Camera orbit values
  let theta = Math.PI * 0.22;
  let phi = 1.1;
  let distance = 12;

  let isDragging = false;
  let lastMouse = { x: 0, y: 0 };

  const MODEL_OPTIONS = {
    default: {
      label: "Boeing 737 model",
      url: "assets/models/boeing_737.glb",
    },
    boeing_737: {
      label: "Boeing 737 model",
      url: "assets/models/boeing_737.glb",
    },
    boeing_747: {
      label: "Boeing 747 model",
      url: "assets/models/boeing_747.glb",
    },
    boeing_787: {
      label: "Boeing 787 model",
      url: "assets/models/boeing_787.glb",
    },
  };

  let currentModelKey = "default";
  let modelLoadToken = 0;

  // ============================================================
  // Init
  // ============================================================

  initViewer();
  loadDetectionResult();

  // ============================================================
  // Main Init Function
  // ============================================================

  function initViewer() {
    setViewerStatus("Initializing 3D scene...", "loading");
    setModelStatus("Initializing");

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      45,
      canvasHost.clientWidth / canvasHost.clientHeight,
      0.1,
      1000
    );

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight, false);
    renderer.setClearColor(0x000000, 0);

    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }

    aircraftGroup = new THREE.Group();
    scene.add(aircraftGroup);

    setupLights();
    setupEnvironment();
    setupOrbitControls();
    setupCameraControls();
    setupButtons();

    updateCamera();
    loadAircraftModel(currentModelKey);

    window.addEventListener("resize", handleResize);
    animate();
  }

  function setupOrbitControls() {
    if (!THREE.OrbitControls) return;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.75, 0);
    controls.minDistance = 4.5;
    controls.maxDistance = 28;
    controls.update();
  }

  // ============================================================
  // Scene Setup
  // ============================================================

  function setupLights() {
    const ambient = new THREE.AmbientLight(0xaaccff, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(7, 10, 8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x58e0ff, 0.55);
    fillLight.position.set(-8, 4, -6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff4d5a, 0.35);
    rimLight.position.set(-4, 2, -8);
    scene.add(rimLight);
  }

  function setupEnvironment() {
    const grid = new THREE.GridHelper(40, 40, 0x1a2840, 0x0a1018);
    grid.position.y = -1.4;
    scene.add(grid);

    const ringGeometry = new THREE.RingGeometry(2.4, 2.45, 96);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x58e0ff,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.35;
    ring.userData.isScanRing = true;
    scene.add(ring);
  }

  // ============================================================
  // Load Aircraft Model
  // ============================================================

  function loadAircraftModel(modelKey = "default") {
    const resolvedKey = MODEL_OPTIONS[modelKey] ? modelKey : "default";
    const modelConfig = MODEL_OPTIONS[resolvedKey];
    const loadToken = ++modelLoadToken;

    currentModelKey = resolvedKey;
    syncModelSelector(resolvedKey);
    removeAircraftModel();
    removeDamageMarker();
    resetCamera();

    setModelStatus(`Loading ${modelConfig.label}`);
    setModelHud(modelConfig.url);
    setViewerStatus(`Loading ${modelConfig.url}...`, "loading");

    if (!THREE.GLTFLoader) {
      setViewerStatus("GLTFLoader is not loaded. Check viewer3d.html scripts.", "error");
      setModelStatus("Loader missing");
      createFallbackAircraft();
      return;
    }

    const loader = new THREE.GLTFLoader();

    loader.load(
      modelConfig.url,
      (gltf) => {
        if (loadToken !== modelLoadToken) return;

        aircraftModel = gltf.scene;

        normalizeModel(aircraftModel);

        aircraftModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.needsUpdate = true;
            }
          }
        });

        aircraftGroup.add(aircraftModel);

        setModelStatus(`${modelConfig.label} loaded`);

        if (currentDetection) {
          createDamageMarker(currentDetection);
          setViewerStatus("Damage localized on 3D aircraft model", "success");
        } else if (currentSelectedZone && isCurrentResultDamaged()) {
          highlightZone(currentSelectedZone);
        } else {
          setViewerStatus(`${modelConfig.label} loaded`, "success");
          if (!isCurrentResultDamaged()) {
            showNoDamageZoneState();
          }
        }
      },
      (progress) => {
        if (loadToken !== modelLoadToken) return;

        if (progress.total) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setModelStatus(`Loading ${modelConfig.label} ${percent}%`);
        }
      },
      (error) => {
        if (loadToken !== modelLoadToken) return;

        console.error("Aircraft model loading error:", error);

        setViewerStatus(
          `Could not load ${modelConfig.label}. Fallback aircraft displayed.`,
          "error"
        );
        setModelStatus("Fallback aircraft displayed");

        createFallbackAircraft();
      }
    );
  }

  function removeAircraftModel() {
    if (!aircraftModel || !aircraftGroup) return;

    aircraftGroup.remove(aircraftModel);

    aircraftModel.traverse((child) => {
      if (child.geometry) child.geometry.dispose();

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    aircraftModel = null;
  }

  function normalizeModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.set(-center.x, -center.y, -center.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 8.5;
    const scale = targetSize / maxDim;

    model.scale.setScalar(scale);

    // Important: this value fixed your aircraft vertical position
    model.position.y += 3.0;

    model.rotation.y = Math.PI;
    model.rotation.x = 0;
    model.rotation.z = 0;
  }

  function createFallbackAircraft() {
    const material = new THREE.MeshStandardMaterial({
      color: 0xc9d2e0,
      metalness: 0.45,
      roughness: 0.35,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3346,
      metalness: 0.4,
      roughness: 0.45,
    });

    const fallback = new THREE.Group();

    const fuselage = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 5.8, 12, 24),
      material
    );
    fuselage.rotation.z = Math.PI / 2;
    fallback.add(fuselage);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.9, 24),
      material
    );
    nose.position.set(3.35, 0, 0);
    nose.rotation.z = -Math.PI / 2;
    fallback.add(nose);

    const wings = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 5.6),
      material
    );
    wings.position.set(0.35, -0.12, 0);
    fallback.add(wings);

    const tailWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.06, 2.0),
      material
    );
    tailWing.position.set(-2.7, 0.08, 0);
    fallback.add(tailWing);

    const verticalTail = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1.2, 0.08),
      darkMaterial
    );
    verticalTail.position.set(-2.8, 0.65, 0);
    fallback.add(verticalTail);

    fallback.position.y = 1.0;
    fallback.rotation.y = Math.PI;

    aircraftModel = fallback;
    aircraftGroup.add(fallback);

    if (currentDetection) {
      createDamageMarker(currentDetection);
    } else if (currentSelectedZone && isCurrentResultDamaged()) {
      highlightZone(currentSelectedZone);
    } else if (!isCurrentResultDamaged()) {
      showNoDamageZoneState();
    }
  }

  // ============================================================
  // Load Detection Result
  // ============================================================

  function getModelKeyFromClassifiedType() {
    try {
      const saved = localStorage.getItem("lastAircraftTypeResult");
      if (!saved) return null;
      const data = JSON.parse(saved);
      return getModelKeyFromAircraftType(data.aircraft_type || "");
    } catch (_) {
      return null;
    }
  }

  async function loadDetectionResult() {
    try {
      const resultId = getResultIdFromUrl();

      if (!resultId) {
        currentResult = AircraftAPI.getLatestResult();
        currentSelectedZone = AircraftAPI.getSelectedZone() || AircraftAPI.getResultZone(currentResult);

        if (currentResult) {
          switchModelForResult(currentResult);

          if (!isResultDamaged(currentResult)) {
            currentDetection = null;
            currentSelectedZone = "";
            renderNoDamageDetails();
            setViewerStatus("No damage zone selected", "info");
            return;
          }

          const detections = Array.isArray(currentResult.detections) ? currentResult.detections : [];
          currentDetection = detections[0] || makeDetectionFromZone(currentSelectedZone, currentResult);
          renderDamageDetails(currentDetection);
          if (aircraftModel) createDamageMarker(currentDetection);
          setViewerStatus(`Detected Zone: ${currentSelectedZone || "Fuselage"}`, "success");
          return;
        }

        currentDetection = makeDetectionFromZone(currentSelectedZone || "Fuselage", null);
        renderDamageDetails(currentDetection);
        if (aircraftModel) createDamageMarker(currentDetection);

        setViewerStatus(`Detected Zone: ${currentSelectedZone || "Fuselage"}`, "info");
        return;
      }

      setViewerStatus(`Loading detection result: ${resultId}`, "loading");

      currentResult = await AircraftAPI.getResultById(resultId);

      if (!currentResult) {
        currentDetection = null;
        setViewerStatus("No result found for this ID.", "info");
        renderEmptyDetails("No result found for this result ID.");
        return;
      }

      AircraftAPI.saveLatestResult(currentResult);
      switchModelForResult(currentResult);

      if (!isResultDamaged(currentResult)) {
        currentDetection = null;
        currentSelectedZone = "";
        AircraftAPI.saveSelectedZone("");
        renderNoDamageDetails();
        setViewerStatus("No damage zone selected", "info");
        return;
      }

      const detections = Array.isArray(currentResult.detections)
        ? currentResult.detections
        : [];

      if (detections.length === 0) {
        currentDetection = null;
        setViewerStatus("No damage zone selected", "info");
        renderNoDamageDetails();
        return;
      }

      currentDetection = detections[0];
      currentSelectedZone = AircraftAPI.getResultZone(currentResult) || currentDetection.zoneLabel || currentDetection.zone || "";
      AircraftAPI.saveSelectedZone(currentSelectedZone);

      renderDamageDetails(currentDetection);

      if (aircraftModel) {
        createDamageMarker(currentDetection);
      }

      setViewerStatus("Damage localized on 3D aircraft model", "success");
    } catch (error) {
      console.error("Failed to load result:", error);

      currentResult = null;
      currentDetection = null;

      setViewerStatus(error.message || "Failed to load detection result.", "error");
      renderEmptyDetails("Failed to load detection result.");
    }
  }

  // ============================================================
  // Damage Marker
  // ============================================================

  function createDamageMarker(detection) {
    if (!detection || !aircraftGroup) return;

    removeDamageMarker();

    const pos = normalizePosition3D(detection.position3d);
    const severity = String(detection.severity || "unknown").toLowerCase();
    const color = getSeverityColorHex(severity);

    const markerGeometry = new THREE.SphereGeometry(0.14, 32, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    });

    damageMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    damageMarker.position.set(pos.x, pos.y, pos.z);
    aircraftGroup.add(damageMarker);

    const haloGeometry = new THREE.SphereGeometry(0.34, 32, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.24,
      side: THREE.BackSide,
    });

    damageHalo = new THREE.Mesh(haloGeometry, haloMaterial);
    damageHalo.position.set(pos.x, pos.y, pos.z);
    aircraftGroup.add(damageHalo);

    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
    });

    const points = [
      new THREE.Vector3(pos.x, pos.y, pos.z),
      new THREE.Vector3(pos.x, pos.y + 0.58, pos.z),
    ];

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    damageLine = new THREE.Line(lineGeometry, lineMaterial);
    aircraftGroup.add(damageLine);

    highlightZone(detection.zoneLabel || detection.zone || currentSelectedZone || "Mid Fuselage Zone", false, pos);

    if (damageLabel && damageLabelTitle && damageLabelZone) {
      damageLabel.style.display = "block";
      damageLabelTitle.textContent = `${detection.type || "Damage"} - ${formatTitle(severity)}`;
      damageLabelZone.textContent = detection.zoneLabel || detection.zone || "Unknown Zone";
    }

    console.log("3D localization debug", {
      zone: detection.zoneLabel || detection.zone,
      position_3d: pos,
      model_file: MODEL_OPTIONS[currentModelKey]?.url,
      model_key: currentModelKey,
      aircraft_type: currentResult?.aircraft_type || currentResult?.aircraftType || "Unknown",
    });

    focusOnDamage(false);
  }

  function removeDamageMarker() {
    const items = [damageMarker, damageHalo, damageLine, zoneOverlay];

    items.forEach((item) => {
      if (!item || !aircraftGroup) return;

      aircraftGroup.remove(item);

      if (item.geometry) item.geometry.dispose();

      if (item.material) {
        if (Array.isArray(item.material)) {
          item.material.forEach((mat) => mat.dispose());
        } else {
          item.material.dispose();
        }
      }
    });

    damageMarker = null;
    damageHalo = null;
    damageLine = null;
    zoneOverlay = null;
  }

  // ============================================================
  // Camera Controls
  // ============================================================

  function setupCameraControls() {
    canvas.addEventListener("mousedown", (event) => {
      isDragging = true;
      lastMouse.x = event.clientX;
      lastMouse.y = event.clientY;
    });

    window.addEventListener("mousemove", (event) => {
      if (!isDragging) return;

      const dx = event.clientX - lastMouse.x;
      const dy = event.clientY - lastMouse.y;

      theta -= dx * 0.005;
      phi -= dy * 0.005;

      phi = Math.max(0.25, Math.min(Math.PI - 0.25, phi));

      lastMouse.x = event.clientX;
      lastMouse.y = event.clientY;

      updateCamera();
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();

        distance += event.deltaY * 0.01;
        distance = Math.max(4.5, Math.min(28, distance));

        updateCamera();
      },
      { passive: false }
    );
  }

  function updateCamera() {
    camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
    camera.position.z = distance * Math.sin(phi) * Math.sin(theta);
    camera.position.y = distance * Math.cos(phi);

    camera.lookAt(0, 0.4, 0);
    if (controls) {
      controls.target.set(0, 0.75, 0);
      controls.update();
    }
  }

  function resetCamera() {
    theta = Math.PI * 0.22;
    phi = 1.1;
    distance = 12;
    updateCamera();
  }

  function focusOnDamage(animate = true) {
    if (!currentDetection) {
      resetCamera();
      return;
    }

    const pos = normalizePosition3D(currentDetection.position3d);

    theta = Math.atan2(pos.z, pos.x) + Math.PI / 5;
    phi = 1.05;
    distance = 7.5;

    updateCamera();

    if (animate && damageMarker) {
      damageMarker.scale.set(1.8, 1.8, 1.8);

      setTimeout(() => {
        if (damageMarker) {
          damageMarker.scale.set(1, 1, 1);
        }
      }, 500);
    }
  }

  // ============================================================
  // Buttons
  // ============================================================

  function setupButtons() {
    if (resetViewBtn) {
      resetViewBtn.addEventListener("click", resetCamera);
    }

    zoneButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!isCurrentResultDamaged()) {
          showNoDamageZoneState();
          setViewerStatus("No damage zone selected", "info");
          return;
        }

        const zone = button.dataset.zone || "Fuselage";
        currentSelectedZone = zone;
        AircraftAPI.saveSelectedZone(zone);
        currentDetection = makeDetectionFromZone(zone, currentResult);
        renderDamageDetails(currentDetection);
        createDamageMarker(currentDetection);
        setViewerStatus(`Detected Zone: ${zone}`, "success");
      });
    });

    if (modelSelector) {
      modelSelector.addEventListener("change", () => {
        loadAircraftModel(modelSelector.value);
      });
    }

    if (toggleWireBtn) {
      toggleWireBtn.addEventListener("click", () => {
        isWireframe = !isWireframe;
        toggleWireBtn.classList.toggle("active", isWireframe);
        applyWireframe(isWireframe);
      });
    }

    if (focusDamageBtn) {
      focusDamageBtn.addEventListener("click", () => {
        focusOnDamage(true);
      });
    }

    if (backResultBtn) {
      backResultBtn.addEventListener("click", () => {
        const resultId =
          currentResult?.resultId ||
          currentResult?.id ||
          getResultIdFromUrl();

        if (resultId) {
          window.location.href = `result.html?id=${encodeURIComponent(resultId)}`;
        } else {
          window.location.href = "history.html";
        }
      });
    }
  }

  function applyWireframe(enabled) {
    if (!aircraftModel) return;

    aircraftModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.wireframe = enabled;
            mat.needsUpdate = true;
          });
        } else {
          child.material.wireframe = enabled;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  // ============================================================
  // Render Damage Details
  // ============================================================

  function renderDamageDetails(detection) {
    const severity = String(detection.severity || "unknown").toLowerCase();
    const pos = normalizePosition3D(detection.position3d);

    setText(damageType3d, detection.type || detection.damageType || "Unknown damage");
    setText(severity3d, formatTitle(severity));
    setText(confidence3d, formatConfidence(detection.confidence));
    setText(zone3d, detection.zoneLabel || detection.zone || "Unknown Aircraft Zone");
    setDetectedZoneLabel(detection.zoneLabel || detection.zone || "Fuselage");

    setText(
      position3dText,
      `x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}`
    );

    setText(
      recommendation3d,
      detection.recommendation || getRecommendationBySeverity(severity)
    );

    if (severity3d) {
      severity3d.className = "viewer-severity";
      severity3d.classList.add(getSeverityClass(severity));
    }
  }

  function renderEmptyDetails(message = "No damage result loaded.") {
    setText(damageType3d, "---");
    setText(severity3d, "---");
    setText(confidence3d, "---");
    setText(zone3d, "---");
    setText(position3dText, "---");
    setText(recommendation3d, message);

    if (severity3d) {
      severity3d.className = "viewer-severity unknown";
    }

    if (damageLabel) {
      damageLabel.style.display = "none";
    }

    removeDamageMarker();
  }

  function renderNoDamageDetails() {
    setText(damageType3d, "No Damage");
    setText(severity3d, "None");
    setText(confidence3d, formatConfidence(currentResult?.damage_status_confidence || currentResult?.confidence || 0));
    setText(zone3d, "No damage zone selected");
    setText(position3dText, "---");
    setText(
      recommendation3d,
      Array.isArray(currentResult?.recommendations)
        ? currentResult.recommendations.join(" ")
        : "No immediate damage action required."
    );

    if (severity3d) {
      severity3d.className = "viewer-severity low";
    }

    showNoDamageZoneState();
  }

  // ============================================================
  // Animation Loop
  // ============================================================

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const time = performance.now() / 1000;

    scene.traverse((object) => {
      if (object.userData?.isScanRing) {
        object.rotation.z += 0.012;
        object.scale.setScalar(1 + Math.sin(time * 1.5) * 0.06);
      }
    });

    if (damageMarker) {
      const pulse = 1 + Math.sin(time * 4) * 0.22;
      damageMarker.scale.set(pulse, pulse, pulse);
    }

    if (damageHalo && damageHalo.material) {
      const pulse = 1.15 + Math.sin(time * 2.2) * 0.35;
      damageHalo.scale.set(pulse, pulse, pulse);
      damageHalo.material.opacity = 0.14 + Math.sin(time * 2.2) * 0.06;
    }

    if (aircraftGroup) {
      aircraftGroup.rotation.y += 0.0006;
    }

    if (controls) {
      controls.update();
    }

    updateDamageLabelScreenPosition();

    renderer.render(scene, camera);
  }

  function updateDamageLabelScreenPosition() {
    if (!damageLabel || !damageMarker || damageLabel.style.display === "none") {
      return;
    }

    const vector = damageMarker.position.clone();

    aircraftGroup.localToWorld(vector);
    vector.project(camera);

    const width = canvasHost.clientWidth;
    const height = canvasHost.clientHeight;

    const x = (vector.x * 0.5 + 0.5) * width;
    const y = (-vector.y * 0.5 + 0.5) * height;

    if (
      vector.z > 1 ||
      x < -100 ||
      x > width + 100 ||
      y < -100 ||
      y > height + 100
    ) {
      damageLabel.style.opacity = "0";
      return;
    }

    damageLabel.style.opacity = "1";
    damageLabel.style.left = `${x}px`;
    damageLabel.style.top = `${y}px`;
  }

  // ============================================================
  // Resize
  // ============================================================

  function handleResize() {
    if (!camera || !renderer || !canvasHost) return;

    const width = canvasHost.clientWidth;
    const height = canvasHost.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
  }

  // ============================================================
  // Helper Functions
  // ============================================================

  function getResultIdFromUrl() {
    const params = new URLSearchParams(window.location.search);

    // Support all possible URL formats:
    // viewer3d.html?result_id=...
    // viewer3d.html?id=...
    // viewer3d.html?resultId=...
    return (
      params.get("result_id") ||
      params.get("resultId") ||
      params.get("id") ||
      ""
    );
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function setViewerStatus(message, type = "info") {
    if (!viewerStatus) {
      console.log(`[${type}] ${message}`);
      return;
    }

    viewerStatus.textContent = message;
    viewerStatus.classList.remove("loading", "success", "error", "info");
    viewerStatus.classList.add(type);
  }

  function setModelStatus(message) {
    if (modelStatusText) {
      modelStatusText.textContent = message;
    }
  }

  function setModelHud(message) {
    if (modelHudText) {
      modelHudText.textContent = message;
    }
  }

  function normalizePosition3D(position3d) {
    // New backend format:
    // { x: 0.8, y: -0.1, z: -1.2 }
    if (
      position3d &&
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

    // Old backend format:
    // [0.8, -0.1, -1.2]
    if (Array.isArray(position3d) && position3d.length >= 3) {
      return {
        x: safeNumber(position3d[0]),
        y: safeNumber(position3d[1]),
        z: safeNumber(position3d[2]),
      };
    }

    // Extra safety for possible backend names
    if (
      position3d &&
      typeof position3d === "object" &&
      !Array.isArray(position3d)
    ) {
      return {
        x: safeNumber(position3d.X || position3d.posX || position3d.leftRight),
        y: safeNumber(position3d.Y || position3d.posY || position3d.upDown),
        z: safeNumber(position3d.Z || position3d.posZ || position3d.frontBack),
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  function switchModelForResult(result) {
    const modelKey = getModelKeyFromResult(result);
    if (modelKey !== currentModelKey) {
      loadAircraftModel(modelKey);
    } else {
      syncModelSelector(modelKey);
    }
  }

  function getModelKeyFromResult(result) {
    const modelFile = String(result?.aircraft_model_file || "").toLowerCase();
    if (modelFile.includes("737")) return "boeing_737";
    if (modelFile.includes("747")) return "boeing_747";
    if (modelFile.includes("787")) return "boeing_787";
    const fromType = getModelKeyFromAircraftType(result?.aircraft_type || result?.aircraftType || "");
    if (fromType !== "default") return fromType;
    return getModelKeyFromClassifiedType() || "default";
  }

  function isResultDamaged(result) {
    if (!result) return false;
    if (window.AircraftAPI && typeof AircraftAPI.isResultDamaged === "function") {
      return AircraftAPI.isResultDamaged(result) !== false;
    }
    if (typeof result.is_damaged === "boolean") return result.is_damaged;
    if (String(result.damage_status || "").toLowerCase() === "no damage") return false;
    const detections = Array.isArray(result.detections) ? result.detections : [];
    return detections.length > 0;
  }

  function isCurrentResultDamaged() {
    if (!currentResult) return true;
    return isResultDamaged(currentResult);
  }

  function getModelKeyFromAircraftType(aircraftType) {
    const value = String(aircraftType || "").toLowerCase();
    if (value.includes("737")) return "boeing_737";
    if (value.includes("747")) return "boeing_747";
    if (value.includes("787")) return "boeing_787";
    return "default";
  }

  function syncModelSelector(modelKey) {
    if (modelSelector && modelSelector.value !== modelKey) {
      modelSelector.value = modelKey;
    }
  }

  function makeDetectionFromZone(zone, result) {
    const cleanZone = normalizeZoneName(zone || "Fuselage");
    return {
      type: result?.damage_type || "Surface Damage",
      severity: result?.severity || "Medium",
      confidence: result?.confidence || 0.86,
      zone: cleanZone,
      zoneLabel: cleanZone,
      position3d: result?.position_3d || result?.position3d || getZonePosition(cleanZone),
      recommendation: Array.isArray(result?.recommendations)
        ? result.recommendations.join(" ")
        : "Inspect the affected zone manually.",
    };
  }

  function normalizeZoneName(zone) {
    const value = String(zone || "").toLowerCase();
    if (value.includes("left") && value.includes("wing")) return "Left Wing";
    if (value.includes("right") && value.includes("wing")) return "Right Wing";
    if (value.includes("nose")) return "Nose";
    if (value.includes("forward")) return "Forward Fuselage Zone";
    if (value.includes("rear") || value.includes("aft")) return "Rear Fuselage Zone";
    if (value.includes("mid")) return "Mid Fuselage Zone";
    if (value.includes("tail") || value.includes("aft") || value.includes("stabilizer")) return "Tail";
    if (value.includes("engine")) return "Engine";
    if (value.includes("fuselage")) return "Mid Fuselage Zone";
    return "Mid Fuselage Zone";
  }

  function getZonePosition(zone) {
    const cleanZone = normalizeZoneName(zone);
    const positions = {
      "Nose": { x: 2.7, y: 0.05, z: 0 },
      "Forward Fuselage Zone": { x: 1.7, y: 0.05, z: 0 },
      "Mid Fuselage Zone": { x: 0.2, y: 0.05, z: 0 },
      "Rear Fuselage Zone": { x: -1.4, y: 0.05, z: 0 },
      "Left Wing": { x: 0.0, y: 0.05, z: 1.7 },
      "Right Wing": { x: 0.0, y: 0.05, z: -1.7 },
      "Tail": { x: -2.3, y: 0.25, z: 0 },
      "Engine": { x: 0.1, y: -0.25, z: 1.1 },
    };
    return positions[cleanZone] || positions["Mid Fuselage Zone"];
  }

  function highlightZone(zone, focus = true, overridePosition = null) {
    if (!aircraftGroup) return;

    if (zoneOverlay) {
      aircraftGroup.remove(zoneOverlay);
      if (zoneOverlay.geometry) zoneOverlay.geometry.dispose();
      if (zoneOverlay.material) zoneOverlay.material.dispose();
      zoneOverlay = null;
    }

    const cleanZone = normalizeZoneName(zone);
    const pos = overridePosition || getZonePosition(cleanZone);
    const geometry = getZoneOverlayGeometry(cleanZone);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6b2b,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });

    zoneOverlay = new THREE.Mesh(geometry, material);
    zoneOverlay.position.set(pos.x, pos.y, pos.z);
    aircraftGroup.add(zoneOverlay);
    setDetectedZoneLabel(cleanZone);

    if (focus) focusOnDamage(false);
  }

  function getZoneOverlayGeometry(cleanZone) {
    if (cleanZone.includes("Wing")) {
      return new THREE.BoxGeometry(1.15, 0.12, 1.25);
    }
    if (cleanZone === "Engine") {
      return new THREE.SphereGeometry(0.42, 32, 32);
    }
    if (cleanZone === "Tail") {
      return new THREE.SphereGeometry(0.46, 32, 32);
    }
    return new THREE.SphereGeometry(0.48, 32, 32);
  }

  function setDetectedZoneLabel(zone) {
    const cleanZone = normalizeZoneName(zone);
    if (detectedZoneLabel) {
      detectedZoneLabel.textContent = `Detected Zone: ${cleanZone}`;
    }
    zoneButtons.forEach((button) => {
      button.classList.toggle("active", normalizeZoneName(button.dataset.zone) === cleanZone);
    });
  }

  function showNoDamageZoneState() {
    removeDamageMarker();

    if (damageLabel) {
      damageLabel.style.display = "none";
    }

    if (detectedZoneLabel) {
      detectedZoneLabel.textContent = "No damage zone selected";
    }

    zoneButtons.forEach((button) => {
      button.classList.remove("active");
    });
  }

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function formatConfidence(value) {
    if (window.AircraftAPI && typeof AircraftAPI.formatPercent === "function") {
      return AircraftAPI.formatPercent(value || 0);
    }

    const number = Number(value || 0);

    if (number <= 1) {
      return `${Math.round(number * 100)}%`;
    }

    return `${Math.round(number)}%`;
  }

  function getSeverityColorHex(severity) {
    const value = String(severity || "").toLowerCase();

    if (value === "critical") return 0xff4d5a;
    if (value === "high") return 0xff7a2f;
    if (value === "major") return 0xffb547;
    if (value === "medium") return 0xfacc15;
    if (value === "low") return 0x4ade80;
    if (value === "minor") return 0x58e0ff;

    return 0x58e0ff;
  }

  function getSeverityClass(severity) {
    const value = String(severity || "").toLowerCase();

    if (value === "critical") return "critical";
    if (value === "high") return "high";
    if (value === "major") return "major";
    if (value === "medium") return "medium";
    if (value === "low") return "low";
    if (value === "minor") return "minor";

    return "unknown";
  }

  function getRecommendationBySeverity(severity) {
    const value = String(severity || "").toLowerCase();

    if (value === "critical") {
      return "Critical damage detected. Aircraft must be grounded until professional inspection and repair are completed.";
    }

    if (value === "high") {
      return "High severity damage detected. Immediate maintenance inspection is recommended before operation.";
    }

    if (value === "medium") {
      return "Medium severity damage detected. Schedule maintenance inspection and monitor affected zone.";
    }

    if (value === "low") {
      return "Low severity damage detected. Visual inspection and routine monitoring are recommended.";
    }

    return "Manual inspection recommended.";
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

  // ============================================================
  // Cleanup on leave
  // ============================================================

  window.addEventListener("beforeunload", () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    if (renderer) {
      renderer.dispose();
    }
  });
});
