/* Mock data + tiny store
   Global state on window.__store with subscribe/setState pattern (Zustand-shaped) */

const AIRCRAFT_STORAGE_KEYS = {
  latestResult: "aircraft_latest_result",
  latestResultId: "aircraft_latest_result_id",
  selectedZone: "aircraft_selected_zone",
};

function saveLatestResult(result) {
  if (!result) return;
  localStorage.setItem(AIRCRAFT_STORAGE_KEYS.latestResult, JSON.stringify(result));
}

function getLatestResult() {
  try {
    return JSON.parse(localStorage.getItem(AIRCRAFT_STORAGE_KEYS.latestResult) || "null");
  } catch (error) {
    return null;
  }
}

function saveLatestResultId(id) {
  if (id) localStorage.setItem(AIRCRAFT_STORAGE_KEYS.latestResultId, String(id));
}

function getLatestResultId() {
  return localStorage.getItem(AIRCRAFT_STORAGE_KEYS.latestResultId) || "";
}

function clearLatestResult() {
  localStorage.removeItem(AIRCRAFT_STORAGE_KEYS.latestResult);
  localStorage.removeItem(AIRCRAFT_STORAGE_KEYS.latestResultId);
}

function saveSelectedZone(zone) {
  if (zone && String(zone).toLowerCase() !== "none") {
    localStorage.setItem(AIRCRAFT_STORAGE_KEYS.selectedZone, String(zone));
  } else {
    localStorage.removeItem(AIRCRAFT_STORAGE_KEYS.selectedZone);
  }
}

function getSelectedZone() {
  return localStorage.getItem(AIRCRAFT_STORAGE_KEYS.selectedZone) || "";
}

window.saveLatestResult = window.saveLatestResult || saveLatestResult;
window.getLatestResult = window.getLatestResult || getLatestResult;
window.saveLatestResultId = window.saveLatestResultId || saveLatestResultId;
window.getLatestResultId = window.getLatestResultId || getLatestResultId;
window.clearLatestResult = window.clearLatestResult || clearLatestResult;
window.saveSelectedZone = window.saveSelectedZone || saveSelectedZone;
window.getSelectedZone = window.getSelectedZone || getSelectedZone;

(function () {
  const subs = new Set();
  const initial = {
    aircraft: [
      { tail: "N742-AR", model: "Long-haul Twin", hours: 38420, cycles: 7126, lastInspect: "2026-04-28", status: "active", openIssues: 3 },
      { tail: "N210-AR", model: "Regional Jet",   hours: 12860, cycles: 9842, lastInspect: "2026-05-02", status: "in-service", openIssues: 1 },
      { tail: "N889-AR", model: "Wide-body",      hours: 51220, cycles: 4218, lastInspect: "2026-04-15", status: "maintenance", openIssues: 7 },
      { tail: "N304-AR", model: "Narrow-body",    hours: 24180, cycles: 11402, lastInspect: "2026-05-05", status: "active", openIssues: 0 },
      { tail: "N915-AR", model: "Cargo Variant",  hours: 47710, cycles: 6291, lastInspect: "2026-04-20", status: "active", openIssues: 2 },
    ],
    inspections: [
      { id: "INS-04812", tail: "N742-AR", date: "2026-05-06 09:14", region: "Fuselage / L-side", findings: 4, severity: "critical", status: "complete", inspector: "A. Abdelrahman" },
      { id: "INS-04811", tail: "N889-AR", date: "2026-05-06 07:42", region: "Wing / Stbd",       findings: 7, severity: "critical", status: "complete", inspector: "Omar K." },
      { id: "INS-04810", tail: "N210-AR", date: "2026-05-05 18:20", region: "Empennage",         findings: 1, severity: "minor",    status: "complete", inspector: "Amro F." },
      { id: "INS-04809", tail: "N304-AR", date: "2026-05-05 16:01", region: "Belly / Forward",   findings: 0, severity: "ok",       status: "complete", inspector: "Rashid M." },
      { id: "INS-04808", tail: "N915-AR", date: "2026-05-05 12:38", region: "Wing / Port",       findings: 2, severity: "major",    status: "complete", inspector: "A. Abdelrahman" },
      { id: "INS-04807", tail: "N742-AR", date: "2026-05-04 11:22", region: "Engine / #2",       findings: 3, severity: "major",    status: "review",   inspector: "Omar K." },
      { id: "INS-04806", tail: "N210-AR", date: "2026-05-03 09:55", region: "Nose / Radome",     findings: 0, severity: "ok",       status: "complete", inspector: "Amro F." },
    ],
    // Damage on the schematic 3D model. Coordinates are in our model-space (roughly):
    // x: along fuselage (-6 nose ... +6 tail), y: vertical, z: lateral (wings span ±5)
damages: [
  {
    id: "D-001",
    tail: "N742-AR",
    type: "Stress crack",
    severity: "critical",
    confidence: 0.96,
    pos: [1.2, -0.15, -1.15],
    zone: "right_wing",
    zoneLabel: "Right Wing Zone",
    region: "Right Wing / Leading Edge",
    logged: "2026-05-06 09:14",
    note: "Hairline propagation along rivet line, 38mm length."
  },
  {
    id: "D-002",
    tail: "N742-AR",
    type: "Lightning strike",
    severity: "major",
    confidence: 0.91,
    pos: [-3.1, 0.55, 0.05],
    zone: "tail",
    zoneLabel: "Tail / Vertical Stabilizer Zone",
    region: "Tail / Vertical Stabilizer",
    logged: "2026-05-06 09:18",
    note: "Pitting cluster, no through-hole. Bond test required."
  },
  {
    id: "D-003",
    tail: "N742-AR",
    type: "Paint delamination",
    severity: "minor",
    confidence: 0.88,
    pos: [2.2, -0.05, 0.25],
    zone: "forward_fuselage",
    zoneLabel: "Forward Fuselage Zone",
    region: "Forward Fuselage / Left Side",
    logged: "2026-05-06 09:21",
    note: "Surface only, approximately 120cm² affected area."
  },
  {
    id: "D-004",
    tail: "N742-AR",
    type: "Dent / Impact",
    severity: "major",
    confidence: 0.94,
    pos: [0.3, -0.35, 0.85],
    zone: "belly",
    zoneLabel: "Belly / Lower Fuselage Zone",
    region: "Belly / Cargo Door Area",
    logged: "2026-05-06 09:24",
    note: "12mm depth, likely ground-handling impact."
  },
  {
    id: "D-005",
    tail: "N742-AR",
    type: "Corrosion patch",
    severity: "minor",
    confidence: 0.79,
    pos: [-1.4, -0.25, -0.55],
    zone: "aft_fuselage",
    zoneLabel: "Aft Fuselage Zone",
    region: "Aft Fuselage / Lower Skin",
    logged: "2026-05-06 09:27",
    note: "Surface oxidation, no measurable thinning."
  },
],
    severityHistory: [ // last 14 days
      { d: "Apr 23", crit: 1, maj: 4, min: 7 },
      { d: "Apr 24", crit: 0, maj: 3, min: 5 },
      { d: "Apr 25", crit: 2, maj: 5, min: 4 },
      { d: "Apr 26", crit: 1, maj: 2, min: 8 },
      { d: "Apr 27", crit: 0, maj: 4, min: 6 },
      { d: "Apr 28", crit: 3, maj: 6, min: 9 },
      { d: "Apr 29", crit: 1, maj: 3, min: 5 },
      { d: "Apr 30", crit: 2, maj: 4, min: 7 },
      { d: "May 01", crit: 0, maj: 5, min: 6 },
      { d: "May 02", crit: 1, maj: 2, min: 4 },
      { d: "May 03", crit: 0, maj: 3, min: 8 },
      { d: "May 04", crit: 2, maj: 4, min: 5 },
      { d: "May 05", crit: 1, maj: 5, min: 7 },
      { d: "May 06", crit: 4, maj: 7, min: 6 },
    ],
    user: { email: null, name: "A. Abdelrahman", role: "Lead Inspector", team: "AR Aerospace" },
    settings: {
      theme: "dark",
      aiThreshold: 0.75,
      notif: { critical: true, daily: true, weekly: false },
      autoExport: false,
      units: "metric",
    },
    activeAircraft: "N742-AR",
    activeDamage: null,
    route: parseRoute(),
  };

  function parseRoute() {
    const h = (location.hash || "#/").replace(/^#/, "");
    const [path, ...rest] = h.split("/").filter(Boolean);
    return { name: path || "landing", params: rest };
  }

  let state = initial;

  const store = {
    get: () => state,
    set: (patch) => {
      state = typeof patch === "function" ? patch(state) : { ...state, ...patch };
      subs.forEach(fn => fn(state));
    },
    sub: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    nav: (path) => { location.hash = "#/" + path; },
  };

  window.__store = store;
  window.addEventListener("hashchange", () => {
    store.set({ route: parseRoute() });
  });
})();
