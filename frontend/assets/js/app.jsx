/* SAS — UI components, pages, router
   All React with hooks. No JSX file imports needed at runtime — this single file
   is loaded as type=text/babel. */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- store hook ---------- */
function useStore(selector = s => s) {
  const [v, setV] = useState(() => selector(window.__store.get()));
  useEffect(() => window.__store.sub(s => setV(selector(s))), []);
  return v;
}
const nav = (p) => window.__store.nav(p);
const setS = (p) => window.__store.set(p);

/* ---------- icons (inline SVG) ---------- */
const Ico = {
  plane: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M21 12l-9 5-9-5 4-2 5 1 5-1z"/><path d="M12 17v3"/><path d="M9 20h6"/></svg>,
  upload: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/></svg>,
  cube: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>,
  chart: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>,
  doc: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></svg>,
  gear: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>,
  grid: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  scan: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M3 12h18"/></svg>,
  alert: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  zoomIn: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>,
  zoomOut: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/></svg>,
  expand: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>,
  layers: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/></svg>,
  flame: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M12 2s4 4 4 9a4 4 0 11-8 0 6 6 0 014-5.6c0 0-1 2 0 4 1-3 0-7 0-7z"/></svg>,
  reset: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M3 12a9 9 0 1015 -7"/><path d="M3 4v5h5"/></svg>,
};

/* ---------- chrome: top bar, sidebar, status bar ---------- */
function TopBar() {
  const route = useStore(s => s.route);
  const items = [
    ["dashboard", "Dashboard", null],
    ["aircraft_select", "Aircraft Select", "aircraft_select.html"],
    ["upload", "Upload", "upload.html"],
    ["viewer", "3D Viewer", "viewer3d.html"],
    ["history", "History", "history.html"],
    ["analysis", "Analysis", null],
    ["reports", "Reports", null],
    ["settings", "Settings", null],
  ];
  return (
    <header className="topbar">
      <div className="brand" onClick={() => nav("")} style={{ cursor: "pointer" }}>
        <div className="brand-mark">AR</div>
        <div className="brand-name">
          SAS
          <span className="sub">Sentinel · Aerospace</span>
        </div>
      </div>
      <nav className="topbar-nav">
        {items.map(([k, l, href]) => (
          <a
            key={k}
            className={route.name === k ? "active" : ""}
            onClick={() => {
              if (href) window.location.href = href;
              else nav(k);
            }}
          >
            {l}
          </a>
        ))}
      </nav>
      <div className="topbar-spacer" />
      <div className="topbar-meta">
        <span className="pill"><span className="dot"></span> AI · ONLINE</span>
        <span>v3.4.1</span>
        <span>UTC {new Date().toUTCString().slice(17, 22)}</span>
      </div>
    </header>
  );
}

function StatusBar() {
  const route = useStore(s => s.route);
  return (
    <footer className="statusbar">
      <span>SAS / {route.name.toUpperCase()}</span>
      <span className="sep">·</span>
      <span>OPERATOR · A.ABDELRAHMAN</span>
      <span className="sep">·</span>
      <span>FLEET · 5 ACTIVE</span>
      <span className="sep">·</span>
      <span style={{ color: "var(--cyan)" }}>● MODEL: SENTINEL-V3 / 0.91 mAP</span>
      <span style={{ flex: 1 }}></span>
      <span>BUILD 2026.05.07</span>
    </footer>
  );
}

function Sidebar({ active }) {
  const items = [
    ["dashboard", "Overview", Ico.grid, null],
    ["aircraft_select", "Aircraft Select", Ico.plane, "aircraft_select.html"],
    ["upload", "Upload & Detect", Ico.upload, "upload.html"],
    ["viewer", "3D Viewer", Ico.cube, "viewer3d.html"],
    ["history", "History", Ico.layers, "history.html"],
    ["analysis", "Damage Analysis", Ico.chart, null],
    ["reports", "Reports", Ico.doc, null],
    ["settings", "Settings", Ico.gear, null],
  ];
  return (
    <aside className="sidebar">
      <div className="section">Workspace</div>
      {items.map(([k, l, I, href]) => (
        <a key={k} className={"side-link " + (active === k ? "active" : "")} onClick={() => {
          if (href) window.location.href = href;
          else nav(k);
        }}>
          <I className="ico" />
          <span>{l}</span>
        </a>
      ))}
      <div className="section">Fleet</div>
      <FleetList />
    </aside>
  );
}

function FleetList() {
  const aircraft = useStore(s => s.aircraft);
  const active = useStore(s => s.activeAircraft);
  return (
    <>
      {aircraft.map(a => (
        <a key={a.tail} className={"side-link " + (active === a.tail ? "active" : "")}
           onClick={() => setS({ activeAircraft: a.tail })}>
          <span className={"dot " + (a.openIssues > 5 ? "red" : a.openIssues > 0 ? "amber" : "")} style={{ marginLeft: 2 }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{a.tail}</span>
        </a>
      ))}
    </>
  );
}

/* ---------- LANDING PAGE ---------- */
function LandingPage() {
  return (
    <div className="landing">
      <section className="hero">
        <HeroAircraft />
        <div className="hero-content">
          <div className="eyebrow">SENTINEL · AEROSPACE · SYSTEM</div>
          <h1>AI-driven structural <span className="accent">integrity intelligence</span> for modern fleets.</h1>
          <p>SAS ingests photographic inspection data, classifies surface anomalies in milliseconds, and pins each finding to a millimeter-accurate point on the airframe model — so your line crews don't waste a turnaround.</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn primary" onClick={() => { window.location.href = "upload.html"; }}>
              Launch console <span style={{ opacity: .6 }}>→</span>
            </button>
            <button className="btn ghost" onClick={() => { window.location.href = "viewer3d.html"; }}>View live demo</button>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 48, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-2)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            <span><span style={{ color: "var(--cyan)" }}>●</span> SOC 2 · TYPE II</span>
            <span><span style={{ color: "var(--cyan)" }}>●</span> EASA PART-145</span>
            <span><span style={{ color: "var(--cyan)" }}>●</span> ISO 9100</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">// PERFORMANCE</div>
          <h2>Operating across 14 carriers, 312 airframes, 1.2M annotated frames.</h2>
        </div>
        <div className="stats-row">
          {[
            ["91.4", "%", "Detection mAP"],
            ["0.18", "s", "Per-frame inference"],
            ["1.2", "M", "Annotated samples"],
            ["312", "", "Active airframes"],
          ].map(([v, u, l]) => (
            <div key={l}>
              <div className="v">{v}<span className="unit">{u}</span></div>
              <div className="l">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">// CAPABILITIES</div>
          <h2>From the ramp to the registry, in a single pane.</h2>
          <p>Six integrated modules — engineered for line maintenance, deep checks, and compliance reporting alike.</p>
        </div>
        <div className="grid-3">
          {[
            ["01", "Walk-around capture", "Drag, drop, or stream frames from handheld kit; lossless ingest with chain-of-custody."],
            ["02", "Sentinel-V3 detector", "Crack, corrosion, dent, delamination, lightning-strike. Multi-class, calibrated."],
            ["03", "Airframe registration", "Pose-aware projection lifts each 2D detection onto the digital twin's surface."],
            ["04", "Severity scoring", "Six-axis risk model: depth, length, location-criticality, propagation, age, repeat."],
            ["05", "Maintenance hand-off", "One-click EASA Form-1 / FAA 8130-3 packets with inline imagery."],
            ["06", "Fleet trend telemetry", "Roll-up dashboards across tail, type, and operator with anomaly alerts."],
          ].map(([n, h, p]) => (
            <div className="card feature" key={n}>
              <div className="ico-box"><Ico.plane width="18" height="18" /></div>
              <div className="num">{n}</div>
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">// PIPELINE</div>
          <h2>Four steps from ramp photo to signed-off finding.</h2>
        </div>
        <div className="grid-4">
          {[
            ["INGEST", "Capture", "Photo / video / drone-pass"],
            ["DETECT", "Classify", "Sentinel-V3 inference"],
            ["LOCATE", "Project", "2D → airframe surface"],
            ["DISPATCH", "Action", "Work order + sign-off"],
          ].map(([k, h, p], i) => (
            <div className="card" key={k}>
              <div className="label">STEP · {String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 22, marginTop: 6 }}>{h}</div>
              <div style={{ color: "var(--ink-2)", fontSize: 12, marginTop: 6 }}>{p}</div>
              <div className="bar" style={{ marginTop: 12 }}><span style={{ width: ["100%", "92%", "78%", "60%"][i] }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 120 }}>
        <div className="grid-2">
          <div>
            <div className="eyebrow" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.22em", color: "var(--cyan-dim)", marginBottom: 8 }}>// HAND-OFF</div>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 500, margin: "0 0 16px", letterSpacing: "-0.01em" }}>Ready when your next D-check is.</h2>
            <p style={{ color: "var(--ink-1)", fontSize: 15, lineHeight: 1.6, maxWidth: 520 }}>Onboard a single tail in 24 hours. Production rollouts complete in 4 weeks, with on-site calibration and historic backfill included.</p>
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button className="btn primary" onClick={() => nav("auth")}>Request access</button>
              <button className="btn ghost" onClick={() => nav("dashboard")}>Tour the console</button>
            </div>
          </div>
          <div className="card" style={{ padding: 28 }}>
            <div className="label">CURRENT FLEET HEALTH · 24H</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
              <div>
                <div className="value" style={{ fontSize: 36 }}>4 <span className="unit">CRIT</span></div>
                <div className="bar danger" style={{ marginTop: 6 }}><span style={{ width: "40%" }} /></div>
              </div>
              <div>
                <div className="value" style={{ fontSize: 36 }}>7 <span className="unit">MAJ</span></div>
                <div className="bar warn" style={{ marginTop: 6 }}><span style={{ width: "65%" }} /></div>
              </div>
              <div>
                <div className="value" style={{ fontSize: 36 }}>6 <span className="unit">MIN</span></div>
                <div className="bar" style={{ marginTop: 6 }}><span style={{ width: "85%" }} /></div>
              </div>
              <div>
                <div className="value" style={{ fontSize: 36, color: "var(--green)" }}>96<span className="unit">%</span></div>
                <div style={{ color: "var(--ink-2)", fontFamily: "var(--mono)", fontSize: 10, marginTop: 6, letterSpacing: "0.12em" }}>FLEET DISPATCH-READY</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* Hero schematic — animated, no React Three Fiber needed for landing background */
function HeroAircraft() {
  const ref = useRef();
  useEffect(() => {
    let t = 0, raf;
    const tick = () => {
      t += 0.5;
      if (ref.current) ref.current.style.transform = `translate(-50%, -50%) rotate(${Math.sin(t / 80) * 4}deg)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="hero-3d">
      <svg className="aircraft-svg" viewBox="-300 -200 600 400" ref={ref} style={{ position: "absolute", left: "75%", top: "50%", width: "1100px", opacity: 0.55 }}>
        <defs>
          <linearGradient id="planeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2a40" />
            <stop offset="100%" stopColor="#070b13" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#58e0ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#58e0ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="240" fill="url(#glow)" />
        {/* fuselage */}
        <ellipse cx="0" cy="0" rx="260" ry="22" fill="url(#planeFill)" stroke="rgba(140,180,230,0.35)" strokeWidth="1" />
        {/* wings */}
        <path d="M-30,-8 L80,-130 L120,-130 L40,-4 Z" fill="url(#planeFill)" stroke="rgba(140,180,230,0.35)" strokeWidth="1" />
        <path d="M-30,8 L80,130 L120,130 L40,4 Z" fill="url(#planeFill)" stroke="rgba(140,180,230,0.35)" strokeWidth="1" />
        {/* tail */}
        <path d="M-200,-6 L-260,-60 L-240,-60 L-180,-3 Z" fill="url(#planeFill)" stroke="rgba(140,180,230,0.35)" strokeWidth="1" />
        <path d="M-200,6 L-260,60 L-240,60 L-180,3 Z" fill="url(#planeFill)" stroke="rgba(140,180,230,0.35)" strokeWidth="1" />
        {/* ID tags */}
        {[
          { x: 80, y: -90, label: "WING-S", c: "var(--cyan)" },
          { x: -210, y: -34, label: "TAIL-V", c: "var(--amber)" },
          { x: 100, y: 0, label: "FUS-FWD", c: "var(--red)" },
        ].map((m, i) => (
          <g key={i}>
            <circle cx={m.x} cy={m.y} r="3" fill={m.c}>
              <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
              <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
            </circle>
            <circle cx={m.x} cy={m.y} r="3" fill={m.c} />
            <line x1={m.x} y1={m.y} x2={m.x + 40} y2={m.y - 30} stroke={m.c} strokeWidth="0.5" opacity="0.6" />
            <text x={m.x + 44} y={m.y - 28} fontFamily="var(--mono)" fontSize="9" fill={m.c} letterSpacing="2">{m.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- AUTH PAGE ---------- */
function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ email: "", pass: "", confirm: "", name: "" });
  const [errs, setErrs] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) errs.email = "Valid email required";
    if (form.pass.length < 6) errs.pass = "Min 6 characters";
    if (mode === "signup" && form.confirm !== form.pass) errs.confirm = "Passwords do not match";
    if (mode === "signup" && !form.name) errs.name = "Name required";
    setErrs(errs);
    if (Object.keys(errs).length) return;
    setS({ user: { ...window.__store.get().user, email: form.email } });
    nav("dashboard");
  };
  return (
    <div className="auth-wrap">
      <div className="auth-vis">
        <AuthVis />
        <div className="auth-vis-text">
          <div className="big">Restricted console.<br />Authorized operators only.</div>
          <div>SAS · SENTINEL AEROSPACE SYSTEM · v3.4.1</div>
          <div style={{ marginTop: 6 }}>SOC 2 TYPE II · EASA PART-145 · ISO 9100</div>
        </div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form slide-in" onSubmit={submit}>
          <h2>{mode === "signin" ? "Operator sign-in" : "Request access"}</h2>
          <div className="sub">{mode === "signin" ? "Resume your inspection workspace." : "Create a credential for your maintenance team."}</div>
          <div className="auth-segment">
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
          </div>
          {mode === "signup" && (
            <div className="field">
              <label>Full name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="A. Abdelrahman" />
              {errs.name && <div className="err">! {errs.name}</div>}
            </div>
          )}
          <div className="field">
            <label>Operator email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="operator@carrier.aero" />
            {errs.email && <div className="err">! {errs.email}</div>}
            {!errs.email && /^[^@]+@[^@]+\.[^@]+$/.test(form.email) && <div className="ok-tick">✓ accepted</div>}
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.pass} onChange={e => setForm({ ...form, pass: e.target.value })} placeholder="••••••••" />
            {errs.pass && <div className="err">! {errs.pass}</div>}
          </div>
          {mode === "signup" && (
            <div className="field">
              <label>Confirm password</label>
              <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="••••••••" />
              {errs.confirm && <div className="err">! {errs.confirm}</div>}
            </div>
          )}
          <button className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
            {mode === "signin" ? "Authenticate" : "Create account"} →
          </button>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--ink-2)" }}>
            <a onClick={() => nav("dashboard")} style={{ cursor: "pointer", color: "var(--cyan)" }}>Skip → demo console</a>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuthVis() {
  // Decorative animated radar / aircraft outline
  return (
    <svg className="auth-vis-inner" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="radarG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#58e0ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#58e0ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="300" r="280" fill="url(#radarG)" />
      {[80, 140, 200, 260].map(r => (
        <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="rgba(88,224,255,0.12)" strokeWidth="1" />
      ))}
      {[0, 45, 90, 135].map(a => (
        <line key={a} x1="300" y1="300"
          x2={300 + 280 * Math.cos((a * Math.PI) / 180)}
          y2={300 + 280 * Math.sin((a * Math.PI) / 180)}
          stroke="rgba(88,224,255,0.08)" strokeWidth="1" />
      ))}
      {/* sweep */}
      <g transform="translate(300 300)">
        <path d="M0,0 L260,0 A260,260 0 0,0 184,-184 Z" fill="url(#radarG)" opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
        </path>
      </g>
      {/* ghost airframe */}
      <g transform="translate(300 300)" opacity="0.45">
        <ellipse rx="180" ry="14" fill="none" stroke="rgba(140,180,230,0.5)" />
        <path d="M-20,-6 L60,-90 L88,-90 L26,-3 Z" fill="none" stroke="rgba(140,180,230,0.5)" />
        <path d="M-20,6 L60,90 L88,90 L26,3 Z" fill="none" stroke="rgba(140,180,230,0.5)" />
        <path d="M-140,-4 L-180,-40 L-160,-40 L-122,-2 Z" fill="none" stroke="rgba(140,180,230,0.5)" />
        <path d="M-140,4 L-180,40 L-160,40 L-122,2 Z" fill="none" stroke="rgba(140,180,230,0.5)" />
      </g>
      {/* blip dots */}
      {[[180, 220], [420, 360], [340, 180], [240, 380]].map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--cyan)">
          <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" begin={`${i * 0.7}s`} />
        </circle>
      ))}
    </svg>
  );
}

/* ---------- DASHBOARD ---------- */
function DashboardPage() {
  const inspections = useStore(s => s.inspections);
  const damages = useStore(s => s.damages);
  const sevHist = useStore(s => s.severityHistory);
  const aircraft = useStore(s => s.aircraft);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">SAS // CONSOLE // OVERVIEW</div>
          <h1>Operations overview</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost"><Ico.scan width="14" /> Sync fleet</button>
          <button className="btn primary" onClick={() => nav("upload")}><Ico.upload width="14" /> New inspection</button>
        </div>
      </div>

      <div className="grid-4">
        {[
          { l: "Active airframes", v: 5, u: "", trend: "+1" },
          { l: "Open critical findings", v: 4, u: "", trend: "+2", danger: true },
          { l: "Inspections / 24h", v: 12, u: "" },
          { l: "Avg AI confidence", v: "0.91", u: "" },
        ].map((s, i) => (
          <div className="card" key={i}>
            <div className="label">{s.l}</div>
            <div className="value" style={{ marginTop: 8, color: s.danger ? "var(--red)" : undefined }}>
              {s.v}<span className="unit">{s.u}</span>
            </div>
            {s.trend && <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-2)", marginTop: 4 }}>Δ 24h · {s.trend}</div>}
            <div className="bar" style={{ marginTop: 12 }}><span style={{ width: `${20 + i * 22}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div className="label">Severity trend · 14d</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4 }}>Findings by severity, fleet-wide</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ink-2)", fontFamily: "var(--mono)" }}>
              <span><span style={{ color: "var(--red)" }}>●</span> CRIT</span>
              <span><span style={{ color: "var(--amber)" }}>●</span> MAJ</span>
              <span><span style={{ color: "var(--cyan)" }}>●</span> MIN</span>
            </div>
          </div>
          <SeverityChart data={sevHist} />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="label">Severity distribution · current</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 16 }}>Open findings by class</div>
          <DonutChart />
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
          <div>
            <div className="label">Recent inspections</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4 }}>Last 24 dispatches</div>
          </div>
          <button className="btn ghost sm">View all</button>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th><th>Tail</th><th>Region</th><th>Findings</th><th>Severity</th><th>Inspector</th><th>Logged</th><th></th>
            </tr>
          </thead>
          <tbody>
            {inspections.map(i => (
              <tr key={i.id} onClick={() => nav("viewer")} style={{ cursor: "pointer" }}>
                <td style={{ fontFamily: "var(--mono)", color: "var(--ink-0)" }}>{i.id}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{i.tail}</td>
                <td>{i.region}</td>
                <td style={{ fontFamily: "var(--mono)", textAlign: "center", color: i.findings ? "var(--ink-0)" : "var(--ink-3)" }}>{i.findings}</td>
                <td><span className={"severity " + i.severity}>{i.severity}</span></td>
                <td>{i.inspector}</td>
                <td style={{ color: "var(--ink-2)", fontFamily: "var(--mono)", fontSize: 11 }}>{i.date}</td>
                <td style={{ color: "var(--ink-2)" }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* SVG line + area chart */
function SeverityChart({ data }) {
  const W = 600, H = 200, pad = { l: 32, r: 12, t: 16, b: 24 };
  const max = 12;
  const xs = (i) => pad.l + (i * (W - pad.l - pad.r)) / (data.length - 1);
  const ys = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const linePath = (key) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(d[key])}`).join(" ");
  const areaPath = (key) => linePath(key) + ` L ${xs(data.length - 1)} ${H - pad.b} L ${xs(0)} ${H - pad.b} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 220 }}>
      <defs>
        <linearGradient id="critG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--red)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--red)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="majG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="minG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid */}
      <g className="chart-grid">
        {[0, 3, 6, 9, 12].map(v => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)} />
            <text x="6" y={ys(v) + 3} className="chart-axis">{v}</text>
          </g>
        ))}
        {data.map((d, i) => i % 3 === 0 && (
          <text key={i} x={xs(i)} y={H - 6} className="chart-axis" textAnchor="middle">{d.d}</text>
        ))}
      </g>
      <path d={areaPath("min")} fill="url(#minG)" />
      <path d={areaPath("maj")} fill="url(#majG)" />
      <path d={areaPath("crit")} fill="url(#critG)" />
      <path d={linePath("min")} fill="none" stroke="var(--cyan)" strokeWidth="1.5" />
      <path d={linePath("maj")} fill="none" stroke="var(--amber)" strokeWidth="1.5" />
      <path d={linePath("crit")} fill="none" stroke="var(--red)" strokeWidth="1.5" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(d.crit)} r="2" fill="var(--red)" />
        </g>
      ))}
    </svg>
  );
}

function DonutChart() {
  const segs = [
    { l: "Critical", v: 4, c: "var(--red)" },
    { l: "Major", v: 12, c: "var(--amber)" },
    { l: "Minor", v: 23, c: "var(--cyan)" },
    { l: "Closed", v: 41, c: "var(--ink-3)" },
  ];
  const total = segs.reduce((a, s) => a + s.v, 0);
  let acc = 0;
  const R = 70, C = 100;
  const circ = 2 * Math.PI * R;
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <svg viewBox="0 0 200 200" style={{ width: 180, height: 180 }}>
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(140,180,230,0.06)" strokeWidth="22" />
        {segs.map((s, i) => {
          const len = (s.v / total) * circ;
          const off = -((acc / total) * circ);
          acc += s.v;
          return (
            <circle key={i} cx={C} cy={C} r={R} fill="none" stroke={s.c} strokeWidth="22"
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={off} transform={`rotate(-90 ${C} ${C})`} />
          );
        })}
        <text x={C} y={C - 4} textAnchor="middle" fontFamily="var(--display)" fontSize="32" fill="var(--ink-0)" fontWeight="500">{total}</text>
        <text x={C} y={C + 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-2)" letterSpacing="3">FINDINGS</text>
      </svg>
      <div style={{ flex: 1 }}>
        {segs.map(s => (
          <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 12 }}>
            <span><span style={{ color: s.c, marginRight: 6 }}>●</span>{s.l}</span>
            <span style={{ fontFamily: "var(--mono)", color: "var(--ink-0)" }}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- UPLOAD PAGE ---------- */
function UploadPage() {
  const [files, setFiles] = useState([]);
  const [stage, setStage] = useState("idle"); // idle, processing, done, error
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backendResult, setBackendResult] = useState(null);
  const [backendError, setBackendError] = useState("");
  const [selectedView, setSelectedView] = useState("front");
  const inputRef = useRef();

  const onPick = (list) => {
    const arr = Array.from(list || []).slice(0, 8).map((f, i) => ({
      id: "F" + Date.now() + i,
      name: f.name || `frame_${i + 1}.jpg`,
      size: f.size || 2400000,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));

    setFiles(arr);
    setBackendResult(null);
    setBackendError("");
    setProgress(0);
    setStage("idle");
  };

  const runDetection = async () => {
    if (!files.length || !files[0].file) return;

    setStage("processing");
    setProgress(15);
    setBackendResult(null);
    setBackendError("");

    try {
      const formData = new FormData();
      formData.append("image", files[0].file);
      formData.append("view", selectedView);

      setProgress(35);

      const response = await fetch("http://127.0.0.1:5000/api/detect/image", {
        method: "POST",
        body: formData,
      });

      setProgress(75);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Detection failed");
      }

      setBackendResult(data);
      setProgress(100);
      setStage("done");
    } catch (err) {
      console.error("Backend detection error:", err);
      setBackendError(err.message || "Could not connect to backend");
      setStage("error");
    }
  };

  const fallbackDetections = [
    { type: "Stress crack", severity: "critical", confidence: 0.96, zoneLabel: "Right Wing Zone", position3d: [1.2, -0.15, -1.15], bbox: { x: 0.35, y: 0.28, width: 0.22, height: 0.14 } },
    { type: "Lightning strike", severity: "major", confidence: 0.91, zoneLabel: "Tail / Vertical Stabilizer Zone", position3d: [-3.1, 0.55, 0.05], bbox: { x: 0.60, y: 0.42, width: 0.14, height: 0.18 } },
  ];

  const currentDetections = backendResult?.detections || [];
  const avgConfidence = currentDetections.length
    ? currentDetections.reduce((sum, d) => sum + (d.confidence || 0), 0) / currentDetections.length
    : 0;

  const sendBackendResultToViewer = () => {
    if (!backendResult?.detections?.length) {
      nav("viewer");
      return;
    }

    const newDamages = backendResult.detections.map((d, i) => ({
      id: d.id || `D-BACKEND-${String(i + 1).padStart(3, "0")}`,
      tail: "N742-AR",
      type: d.type || "Detected Damage",
      severity: d.severity || "minor",
      confidence: d.confidence || 0,
      pos: d.position3d || [0, 0, 0],
      zone: d.zone || "unknown",
      zoneLabel: d.zoneLabel || "Mapped Zone",
      region: d.zoneLabel || "Detected Aircraft Zone",
      logged: new Date().toISOString().slice(0, 16).replace("T", " "),
      note: d.recommendation || "Backend detection mapped to the 3D airframe.",
    }));

    setS({
      damages: newDamages,
      activeDamage: newDamages[0]?.id || null,
    });

    nav("viewer");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">SAS // INSPECT // BACKEND AI PIPELINE</div>
          <h1>Upload & detect aircraft damage</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn ghost sm"
            onClick={() => {
              setFiles([]);
              setBackendResult(null);
              setBackendError("");
              setProgress(0);
              setStage("idle");
            }}
          >
            <Ico.reset width="14" /> Reset
          </button>
          <button className="btn primary" disabled={!files.length || stage === "processing"} onClick={runDetection}>
            <Ico.scan width="14" /> {stage === "processing" ? "Detecting…" : stage === "done" ? "Re-run detection" : "Run detection"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 390px", gap: 16 }}>
        <div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 14, alignItems: "center", flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-2)", textTransform: "uppercase" }}>
              <span>TAIL · N742-AR</span>
              <span style={{ color: "var(--ink-3)" }}>·</span>
              <span>SECTOR · TEST INSPECTION</span>
              <span style={{ color: "var(--ink-3)" }}>·</span>
              <span>VIEW</span>
              <select
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
                style={{
                  background: "rgba(8, 12, 20, 0.8)",
                  color: "var(--ink-0)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 6,
                  padding: "6px 8px",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                <option value="front">Front / Nose</option>
                <option value="left">Left Side</option>
                <option value="right">Right Side</option>
                <option value="top">Top View</option>
              </select>
            </div>

            <div className={"dropzone" + (drag ? " active" : "")}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); onPick(e.dataTransfer.files); }}>
              <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={e => onPick(e.target.files)} accept="image/*" />
              <div className="dropzone-icon"><Ico.upload width="20" /></div>
              <div style={{ fontFamily: "var(--display)", fontSize: 17 }}>Drop aircraft inspection image here</div>
              <div style={{ color: "var(--ink-2)", fontSize: 12, marginTop: 6 }}>JPEG / PNG / WEBP · backend Flask API · YOLO-ready pipeline</div>
              <div style={{ marginTop: 14 }}>
                <button className="btn sm">Browse files</button>
              </div>
            </div>

            {files.length > 0 && (
              <div className="upload-thumbs">
                {files.map((f, i) => {
                  const d = currentDetections[i];
                  return (
                    <div key={f.id} className="upload-thumb">
                      {f.previewUrl ? (
                        <img
                          src={f.previewUrl}
                          alt={f.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            opacity: stage === "processing" ? 0.55 : 0.9,
                          }}
                        />
                      ) : (
                        <div className="ph">{f.name}</div>
                      )}
                      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
                      {stage === "processing" && <span className="scan-line" />}
                      {stage === "done" && d?.bbox && (
                        <div className="det-box" data-label={(d.type || "DAMAGE").toUpperCase()}
                          style={{
                            left: `${d.bbox.x * 100}%`,
                            top: `${d.bbox.y * 100}%`,
                            width: `${d.bbox.width * 100}%`,
                            height: `${d.bbox.height * 100}%`,
                          }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(stage === "processing" || stage === "done") && (
            <div className="card slide-in" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div className="label">Backend inference pipeline</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--cyan)" }}>{progress.toFixed(0)}%</div>
              </div>
              <div className="bar"><span style={{ width: `${progress}%`, transition: "width 0.1s" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-2)", letterSpacing: "0.1em" }}>
                <div>● UPLOAD<br /><span style={{ color: progress > 20 ? "var(--green)" : "var(--ink-3)" }}>{progress > 20 ? "DONE" : "..."}</span></div>
                <div>● DETECT<br /><span style={{ color: progress > 50 ? "var(--green)" : "var(--ink-3)" }}>{progress > 50 ? "DONE" : "..."}</span></div>
                <div>● SEVERITY<br /><span style={{ color: progress > 75 ? "var(--green)" : "var(--ink-3)" }}>{progress > 75 ? "DONE" : "..."}</span></div>
                <div>● 3D MAP<br /><span style={{ color: progress >= 100 ? "var(--green)" : "var(--ink-3)" }}>{progress >= 100 ? "DONE" : "..."}</span></div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ padding: 20 }}>
            <div className="label">Detection panel</div>
            {stage !== "done" ? (
              <div style={{ marginTop: 14, color: stage === "error" ? "var(--red)" : "var(--ink-2)", fontSize: 13 }}>
                {stage === "processing"
                  ? "Backend AI pipeline is analyzing your image…"
                  : stage === "error"
                  ? `Error: ${backendError}`
                  : "Upload an image and run detection to populate findings."}
                <div style={{ marginTop: 16 }}>
                  {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 38, marginTop: 8 }} />)}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }} className="fade-in">
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div className="label">FINDINGS</div>
                    <div className="value" style={{ fontSize: 22 }}>{currentDetections.length}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="label">AVG CONF</div>
                    <div className="value" style={{ fontSize: 22 }}>{avgConfidence.toFixed(2)}</div>
                  </div>
                </div>

                {currentDetections.map((d, i) => (
                  <div key={d.id || i} className="dam-row" style={{ borderColor: "var(--line)", marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div className="ttl">{d.type}</div>
                      <div className="meta">
                        {(d.zoneLabel || "Mapped Zone")} · {d.position3d ? `(${d.position3d.join(", ")})` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className={"severity " + (d.severity || "minor")}>{d.severity || "minor"}</div>
                      <div className="meta" style={{ marginTop: 4 }}>conf {(d.confidence || 0).toFixed(2)}</div>
                    </div>
                  </div>
                ))}

                {backendResult?.resultImageUrl && (
                  <div style={{ marginTop: 12 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Backend result image</div>
                    <img
                      src={backendResult.resultImageUrl}
                      alt="Detection result"
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                      }}
                    />
                  </div>
                )}

                <button className="btn primary" style={{ marginTop: 12, width: "100%", justifyContent: "center" }} onClick={sendBackendResultToViewer}>
                  <Ico.cube width="14" /> Open in 3D viewer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3D VIEWER ---------- */
function createTextSprite(text, color = "#58e0ff") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 512;
  canvas.height = 128;
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(5, 8, 13, 0.78)";
  context.strokeStyle = color;
  context.lineWidth = 3;

  context.beginPath();
  if (context.roundRect) context.roundRect(10, 20, 492, 74, 12);
  else context.rect(10, 20, 492, 74);
  context.fill();
  context.stroke();

  context.font = "bold 30px JetBrains Mono, monospace";
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 58);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 0.3, 1);
  return sprite;
}

function ViewerPage() {
  const damages = useStore(s => s.damages);
  const activeId = useStore(s => s.activeDamage);
  const [wire, setWire] = useState(false);
  const [heat, setHeat] = useState(false);
  const [full, setFull] = useState(false);
  const hostRef = useRef();
  const canvasRef = useRef();
  const sceneRef = useRef({});
  const [, force] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(10, 5, 12);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const amb = new THREE.AmbientLight(0xaaccff, 0.45);
    scene.add(amb);
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(8, 12, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x58e0ff, 0.45);
    fill.position.set(-8, 4, -6);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xff4d5a, 0.28);
    rim.position.set(0, -6, -8);
    scene.add(rim);

    const aircraft = new THREE.Group();
    scene.add(aircraft);

    if (!THREE.GLTFLoader) {
      console.error("GLTFLoader is not loaded. Check index.html Three.js loader script.");
    } else {
      const loader = new THREE.GLTFLoader();
      loader.load(
        "assets/models/aircraft.glb",
        (gltf) => {
          const model = gltf.scene;

          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          model.position.set(-center.x, -center.y, -center.z);

          const maxDim = Math.max(size.x, size.y, size.z);
          const targetSize = 14;
          const scale = targetSize / maxDim;
          model.scale.setScalar(scale);

          model.position.y += 3.0;
          model.rotation.y = Math.PI;
          model.rotation.x = 0;
          model.rotation.z = 0;

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.side = THREE.DoubleSide;
                child.material.needsUpdate = true;
              }
            }
          });

          aircraft.add(model);

          const zoneLabels = [
            { text: "NOSE", pos: [3.8, 1.05, 0], color: "#58e0ff" },
            { text: "FORWARD FUSELAGE", pos: [2.1, 1.25, 0], color: "#58e0ff" },
            { text: "CENTER FUSELAGE", pos: [0.2, 1.25, 0], color: "#58e0ff" },
            { text: "AFT FUSELAGE", pos: [-2.0, 1.25, 0], color: "#58e0ff" },
            { text: "RIGHT WING", pos: [0.5, 1.0, -2.5], color: "#ffb547" },
            { text: "LEFT WING", pos: [0.5, 1.0, 2.5], color: "#ffb547" },
            { text: "TAIL", pos: [-3.5, 1.55, 0], color: "#ff4d5a" },
            { text: "ENGINE AREA", pos: [0.8, 0.45, 1.25], color: "#4ade80" },
          ];

          zoneLabels.forEach((z) => {
            const label = createTextSprite(z.text, z.color);
            label.position.set(...z.pos);
            label.userData.skipWire = true;
            aircraft.add(label);
          });

          const damageData = window.__store.get().damages;
          damageData.forEach((d) => {
            const color = d.severity === "critical" ? 0xff4d5a : d.severity === "major" ? 0xffb547 : 0x58e0ff;

            const marker = new THREE.Mesh(
              new THREE.SphereGeometry(0.09, 16, 16),
              new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
            );
            marker.position.set(...d.pos);
            marker.userData.skipWire = true;
            aircraft.add(marker);

            const halo = new THREE.Mesh(
              new THREE.SphereGeometry(0.22, 16, 16),
              new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.BackSide })
            );
            halo.position.set(...d.pos);
            halo.userData.skipWire = true;
            halo.userData.isHalo = true;
            halo.userData.pulsePhase = Math.random() * Math.PI * 2;
            aircraft.add(halo);
          });
        },
        (progress) => console.log("Loading aircraft model:", progress.loaded, progress.total),
        (error) => console.error("Error loading aircraft.glb:", error)
      );
    }

    const grid = new THREE.GridHelper(40, 40, 0x1a2840, 0x0a1018);
    grid.position.y = -1.2;
    scene.add(grid);

    const scanGeo = new THREE.PlaneGeometry(14, 14);
    const scanMat = new THREE.MeshBasicMaterial({ color: 0x58e0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const scanPlane = new THREE.Mesh(scanGeo, scanMat);
    scanPlane.rotation.x = Math.PI / 2;
    scanPlane.position.y = -1.2;
    scene.add(scanPlane);

    let theta = Math.PI * 0.18, phi = 1.15, dist = 13;
    let dragging = false, last = null;

    const updateCam = () => {
      camera.position.x = dist * Math.sin(phi) * Math.cos(theta);
      camera.position.z = dist * Math.sin(phi) * Math.sin(theta);
      camera.position.y = dist * Math.cos(phi);
      camera.lookAt(0, 0, 0);
    };
    updateCam();

    const onDown = (e) => { dragging = true; last = { x: e.clientX, y: e.clientY }; };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      theta -= dx * 0.005;
      phi = Math.max(0.2, Math.min(Math.PI - 0.2, phi - dy * 0.005));
      last = { x: e.clientX, y: e.clientY };
      updateCam();
    };
    const onUp = () => dragging = false;
    const onWheel = (e) => { e.preventDefault(); dist = Math.max(5, Math.min(40, dist + e.deltaY * 0.01)); updateCam(); };

    canvasRef.current.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvasRef.current.addEventListener("wheel", onWheel, { passive: false });

    const resize = () => {
      const r = host.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let scanT = 0, raf;
    const tick = () => {
      scanT += 0.012;
      scanPlane.position.y = -1.2 + ((scanT % 1) * 3);
      scanMat.opacity = 0.25 * (1 - (scanT % 1));

      const t = performance.now() / 1000;
      aircraft.traverse((o) => {
        if (o.userData?.isHalo) {
          const s = 1 + Math.sin(t * 2 + o.userData.pulsePhase) * 0.35;
          o.scale.set(s, s, s);
          if (o.material) o.material.opacity = 0.12 + 0.18 * (1 - Math.sin(t * 2 + o.userData.pulsePhase) * 0.5 + 0.5);
        }
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
      force(x => x + 1);
    };
    tick();

    sceneRef.current = {
      scene,
      camera,
      renderer,
      aircraft,
      scanPlane,
      scanMat,
      updateCam,
      getCamSettings: () => ({ theta, phi, dist }),
      setCam: (t, p, d) => { theta = t; phi = p; dist = d; updateCam(); },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvasRef.current?.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvasRef.current?.removeEventListener("wheel", onWheel);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const a = sceneRef.current.aircraft;
    if (!a) return;
    a.traverse(o => {
      if (o.isMesh && o.material && !o.userData.skipWire) {
        o.material.wireframe = wire;
      }
    });
  }, [wire]);

  const project = (pos) => {
    const { camera, renderer } = sceneRef.current;
    if (!camera || !renderer) return null;
    const v = new THREE.Vector3(...pos).project(camera);
    if (v.z > 1) return null;
    const r = renderer.domElement.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * r.width,
      y: (-v.y * 0.5 + 0.5) * r.height,
      depth: v.z,
    };
  };

  const active = damages.find(d => d.id === activeId);

  const fly = (pos) => {
    const { setCam } = sceneRef.current;
    if (!setCam) return;
    setCam(Math.atan2(pos[2], pos[0]) + Math.PI / 4, 1.1, 9);
  };

  return (
    <div style={{
      position: full ? "fixed" : "relative",
      inset: full ? 0 : "auto",
      zIndex: full ? 200 : "auto",
      height: full ? "100vh" : "100%",
      background: "var(--bg-0)",
    }}>
      <div className="viewer-host" ref={hostRef}>
        <canvas ref={canvasRef} className="viewer-canvas" />
        {heat && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 60% 50%, rgba(255,77,90,0.15) 0%, transparent 30%), radial-gradient(ellipse at 40% 55%, rgba(255,181,71,0.1) 0%, transparent 25%)" }} />}

        <div className="viewer-hud">
          <div className="hud-corner tl">
            <div>// AIRFRAME · N742-AR</div>
            <div className="v" style={{ marginTop: 4 }}>BOEING 737-300 · 3D LOCALIZATION</div>
          </div>
          <div className="hud-corner tr">
            <div>// VIEWPORT · MAIN</div>
            <div className="v" style={{ marginTop: 4 }}>R: {(sceneRef.current.getCamSettings?.().theta * 57.3 || 45).toFixed(0)}° / Z: {(sceneRef.current.getCamSettings?.().dist || 13).toFixed(1)}m</div>
          </div>
          <div className="cross-hair" />
          <div className="hud-corner bl" style={{ display: "flex", gap: 12 }}>
            <span><Ico.scan width="14" style={{ verticalAlign: "middle" }} /> SCAN · ACTIVE</span>
          </div>

          <div className="tool-stack">
            <button className="tool-btn" onClick={() => sceneRef.current.setCam?.(Math.PI / 4, 1.0, 14)} title="Reset view"><Ico.reset width="14" /></button>
            <button className={"tool-btn " + (wire ? "active" : "")} onClick={() => setWire(!wire)} title="Wireframe"><Ico.cube width="14" /></button>
            <button className={"tool-btn " + (heat ? "active" : "")} onClick={() => setHeat(!heat)} title="Heatmap"><Ico.flame width="14" /></button>
            <button className="tool-btn" onClick={() => { const c = sceneRef.current.getCamSettings(); sceneRef.current.setCam(c.theta, c.phi, Math.max(5, c.dist - 2)); }} title="Zoom in"><Ico.zoomIn width="14" /></button>
            <button className="tool-btn" onClick={() => { const c = sceneRef.current.getCamSettings(); sceneRef.current.setCam(c.theta, c.phi, Math.min(40, c.dist + 2)); }} title="Zoom out"><Ico.zoomOut width="14" /></button>
            <button className={"tool-btn " + (full ? "active" : "")} onClick={() => setFull(!full)} title="Fullscreen"><Ico.expand width="14" /></button>
          </div>

          <div className="viewer-list glass" style={{ padding: 10 }}>
            <div className="label" style={{ padding: "6px 6px" }}>Detections · {damages.length}</div>
            {damages.map(d => (
              <div key={d.id} className={"dam-row " + (activeId === d.id ? "active" : "")}
                onClick={() => { setS({ activeDamage: d.id }); fly(d.pos); }}>
                <span className={"dot " + (d.severity === "critical" ? "red" : d.severity === "major" ? "amber" : "")} />
                <div style={{ flex: 1 }}>
                  <div className="ttl">{d.type}</div>
                  <div className="meta">{d.region}</div>
                </div>
                <div className="id">{d.id}</div>
              </div>
            ))}
          </div>

          {active && (
            <div className="viewer-detail glass slide-in" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="label">{active.id}</div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4 }}>{active.type}</div>
                </div>
                <span className={"severity " + active.severity}>{active.severity}</span>
              </div>
              <div className="meta" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", marginTop: 6 }}>
                {active.region}
              </div>

              <div style={{ marginTop: 10, padding: "10px 12px", border: "1px solid rgba(88, 224, 255, 0.25)", borderRadius: 8, background: "rgba(88, 224, 255, 0.06)" }}>
                <div className="label">3D LOCALIZATION ZONE</div>
                <div style={{ marginTop: 4, fontFamily: "var(--display)", fontSize: 15, color: "var(--cyan)" }}>
                  {active.zoneLabel || "Unmapped Zone"}
                </div>
                <div style={{ marginTop: 4, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-2)", letterSpacing: "0.08em" }}>
                  STATUS · MAPPED TO DIGITAL AIRFRAME
                </div>
              </div>

              <p style={{ fontSize: 12, color: "var(--ink-1)", margin: "10px 0", lineHeight: 1.5 }}>{active.note}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                <div>
                  <div className="label">CONFIDENCE</div>
                  <div style={{ fontFamily: "var(--mono)", color: "var(--ink-0)", fontSize: 13, marginTop: 2 }}>{active.confidence.toFixed(2)}</div>
                  <div className="bar" style={{ marginTop: 4 }}><span style={{ width: `${active.confidence * 100}%` }} /></div>
                </div>
                <div>
                  <div className="label">POSITION (XYZ)</div>
                  <div style={{ fontFamily: "var(--mono)", color: "var(--ink-0)", fontSize: 13, marginTop: 2 }}>{active.pos.map(n => n.toFixed(1)).join(", ")}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button className="btn sm">Assign</button>
                <button className="btn sm">Export</button>
                <button className="btn sm ghost" onClick={() => setS({ activeDamage: null })}>Dismiss</button>
              </div>
            </div>
          )}

          <div className="viewer-axis hud-card" style={{ padding: 6 }}>
            <svg viewBox="0 0 80 80" width="68" height="68">
              <line x1="40" y1="40" x2="68" y2="40" stroke="var(--red)" strokeWidth="1.5" />
              <line x1="40" y1="40" x2="40" y2="12" stroke="var(--green)" strokeWidth="1.5" />
              <line x1="40" y1="40" x2="22" y2="58" stroke="var(--cyan)" strokeWidth="1.5" />
              <text x="70" y="42" fontFamily="var(--mono)" fontSize="9" fill="var(--red)">X</text>
              <text x="42" y="10" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">Y</text>
              <text x="14" y="62" fontFamily="var(--mono)" fontSize="9" fill="var(--cyan)">Z</text>
            </svg>
          </div>

          {damages.map(d => {
            const p = project(d.pos);
            if (!p) return null;
            const sevCls = d.severity === "critical" ? "" : d.severity === "major" ? "amber" : "cyan";
            return (
              <div key={d.id}
                className={"marker-2d " + sevCls}
                style={{ left: p.x, top: p.y, opacity: activeId === d.id ? 1 : 0.85 }}
                onClick={() => setS({ activeDamage: d.id })}>
                {activeId === d.id && (
                  <div className="label-tag">
                    {d.id} · {d.type.toUpperCase()} · {d.zoneLabel?.toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ViewerPageWrap() {
  return (
    <div style={{ height: "100%" }}>
      <ViewerPage />
    </div>
  );
}

/* Build a stylized airliner from Three primitives.
   Origin: nose at +X, tail at -X, lateral wings on Z, vertical on Y. */
function buildAircraft() {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xc9d2e0, metalness: 0.6, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a3346, metalness: 0.7, roughness: 0.4 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x58e0ff, metalness: 0.3, roughness: 0.5, emissive: 0x103040, emissiveIntensity: 0.3 });

  // Fuselage — capsule-ish along X
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 7.0, 12, 24), mat);
  fus.rotation.z = Math.PI / 2;
  root.add(fus);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 24), mat);
  nose.position.set(4.5, 0, 0);
  nose.rotation.z = -Math.PI / 2;
  root.add(nose);

  // Cockpit windows (dark band)
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 1.0), dark);
  cockpit.position.set(3.4, 0.25, 0);
  root.add(cockpit);

  // Side windows strip
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 0.04), dark);
  sideL.position.set(0, 0.18, 0.6);
  root.add(sideL);
  const sideR = sideL.clone();
  sideR.position.z = -0.6;
  root.add(sideR);

  // Wings — swept trapezoid
  const wingShape = (sign) => {
    const g = new THREE.Shape();
    g.moveTo(0.8, 0);
    g.lineTo(-0.6, 4.4 * sign);
    g.lineTo(-1.4, 4.4 * sign);
    g.lineTo(-1.6, 0);
    g.lineTo(0.8, 0);
    const ext = new THREE.ExtrudeGeometry(g, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
    const m = new THREE.Mesh(ext, mat);
    m.rotation.x = Math.PI / 2;
    m.position.set(0.5, -0.2, 0);
    return m;
  };
  root.add(wingShape(1));
  root.add(wingShape(-1));

  // Engines
  const engineL = new THREE.Group();
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.4, 18), dark);
  cowl.rotation.z = Math.PI / 2;
  engineL.add(cowl);
  const intake = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 18), accent);
  intake.position.set(0.7, 0, 0);
  intake.rotation.y = Math.PI / 2;
  engineL.add(intake);
  engineL.position.set(0.6, -0.45, 2.2);
  root.add(engineL);
  const engineR = engineL.clone();
  engineR.position.z = -2.2;
  root.add(engineR);

  // Vertical stabilizer
  const vsShape = new THREE.Shape();
  vsShape.moveTo(0, 0); vsShape.lineTo(-1.2, 1.5); vsShape.lineTo(-1.6, 1.5); vsShape.lineTo(-0.8, 0); vsShape.lineTo(0, 0);
  const vsGeo = new THREE.ExtrudeGeometry(vsShape, { depth: 0.1, bevelEnabled: false });
  const vs = new THREE.Mesh(vsGeo, mat);
  vs.position.set(-3.2, 0.4, -0.05);
  root.add(vs);

  // Horizontal stabilizers
  const hsShape = (sign) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(-0.8, 1.6 * sign); s.lineTo(-1.2, 1.6 * sign); s.lineTo(-0.8, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false });
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = Math.PI / 2;
    m.position.set(-3.0, 0.4, 0);
    return m;
  };
  root.add(hsShape(1));
  root.add(hsShape(-1));

  // Belly antenna fins
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.04), dark);
  fin.position.set(0.5, -0.6, 0);
  root.add(fin);

  // Surface panel lines (subtle)
  const lineMat = new THREE.LineBasicMaterial({ color: 0x4a6080, transparent: true, opacity: 0.4 });
  for (let x = -3.5; x < 4; x += 0.7) {
    const pts = [];
    for (let a = 0; a < Math.PI * 2 + 0.1; a += 0.2) pts.push(new THREE.Vector3(x, Math.sin(a) * 0.6, Math.cos(a) * 0.6));
    const ln = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
    ln.userData.skipWire = true;
    root.add(ln);
  }

  // Damage glow markers (3D pulsing spheres)
  const damages = window.__store.get().damages;
  damages.forEach(d => {
    const color = d.severity === "critical" ? 0xff4d5a : d.severity === "major" ? 0xffb547 : 0x58e0ff;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
    m.position.set(...d.pos);
    m.userData.skipWire = true;
    m.userData.pulsePhase = Math.random() * Math.PI * 2;
    m.userData.markerColor = color;
    root.add(m);

    // Pulsing halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.BackSide })
    );
    halo.position.set(...d.pos);
    halo.userData.skipWire = true;
    halo.userData.isHalo = true;
    halo.userData.pulsePhase = m.userData.pulsePhase;
    root.add(halo);
  });

  // Animate halos (ride the parent group's onBeforeRender)
  root.onBeforeRender = () => {
    const t = performance.now() / 1000;
    root.children.forEach(c => {
      if (c.userData.isHalo) {
        const s = 1 + Math.sin(t * 2 + c.userData.pulsePhase) * 0.4;
        c.scale.set(s, s, s);
        c.material.opacity = 0.18 + 0.18 * (1 - Math.sin(t * 2 + c.userData.pulsePhase) * 0.5 + 0.5);
      }
    });
  };

  return root;
}

/* ---------- ANALYSIS PAGE ---------- */
function AnalysisPage() {
  const sevHist = useStore(s => s.severityHistory);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">SAS // ANALYSIS // N742-AR</div>
          <h1>Damage analysis</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="btn" style={{ background: "var(--bg-2)" }}><option>Last 14 days</option><option>Last 30 days</option><option>Last 90 days</option></select>
          <button className="btn ghost"><Ico.doc width="14" /> Export CSV</button>
        </div>
      </div>

      <div className="grid-4">
        {[
          { l: "Crack propagation rate", v: "0.32", u: "mm/wk" },
          { l: "Critical findings (30d)", v: "11", u: "" },
          { l: "Avg AI confidence", v: "0.91", u: "" },
          { l: "Mean time to repair", v: "8.2", u: "h" },
        ].map((s, i) => (
          <div className="card" key={i}>
            <div className="label">{s.l}</div>
            <div className="value" style={{ marginTop: 8 }}>{s.v}<span className="unit">{s.u}</span></div>
            <div className="bar" style={{ marginTop: 12 }}><span style={{ width: `${30 + i * 18}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="label">Severity classification · 14d</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 12 }}>Stacked findings by class</div>
          <StackedBars data={sevHist} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="label">Confidence calibration</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 12 }}>Predicted vs. confirmed</div>
          <CalibrationPlot />
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="label">Damage history</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 12 }}>N742-AR · last 30 days</div>
          <div className="timeline">
            {[
              ["May 06 09:14", "crit", "Wing/Stbd · stress crack flagged", "Sentinel-V3 · 0.96 conf"],
              ["May 06 09:18", "warn", "V-Stab · lightning pitting cluster", "Sentinel-V3 · 0.91 conf"],
              ["May 04 11:22", "warn", "Engine #2 · cowl scoring", "Manual addendum · A. Abdelrahman"],
              ["Apr 28 14:03", "", "Belly L · paint touch-up signed off", "WO 88231 · closed"],
              ["Apr 22 10:12", "crit", "Wing/Stbd · prior crack inspection (cleared)", "Sentinel-V3 · 0.93 conf"],
            ].map(([w, c, t, who], i) => (
              <div key={i} className={"tl-item " + c}>
                <div className="when">{w}</div>
                <div className="what">{t}</div>
                <div className="who">{who}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="label">Comparison · prior inspection</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 16 }}>Δ vs. last D-check</div>
          <table className="tbl" style={{ marginLeft: -14, marginRight: -14, width: "calc(100% + 28px)" }}>
            <thead><tr><th>Region</th><th>Then</th><th>Now</th><th>Δ</th></tr></thead>
            <tbody>
              <tr><td>Wing / Stbd</td><td>2 minor</td><td>1 crit / 1 minor</td><td style={{ color: "var(--red)" }}>↑ 1 sev</td></tr>
              <tr><td>Wing / Port</td><td>1 minor</td><td>0</td><td style={{ color: "var(--green)" }}>↓ 1</td></tr>
              <tr><td>Empennage</td><td>0</td><td>1 major</td><td style={{ color: "var(--amber)" }}>↑ 1</td></tr>
              <tr><td>Belly</td><td>3 minor</td><td>1 major / 1 minor</td><td style={{ color: "var(--amber)" }}>↑ sev</td></tr>
              <tr><td>Engines</td><td>1 minor</td><td>1 major</td><td style={{ color: "var(--amber)" }}>↑ sev</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StackedBars({ data }) {
  const W = 580, H = 220, pad = { l: 32, r: 12, t: 16, b: 24 };
  const max = 22;
  const bw = (W - pad.l - pad.r) / data.length - 4;
  const ys = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 220 }}>
      <g className="chart-grid">
        {[0, 5, 10, 15, 20].map(v => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)} />
            <text x="6" y={ys(v) + 3} className="chart-axis">{v}</text>
          </g>
        ))}
      </g>
      {data.map((d, i) => {
        const x = pad.l + i * (bw + 4);
        const total = d.crit + d.maj + d.min;
        const yMin = ys(d.min);
        const yMaj = ys(d.min + d.maj);
        const yCrit = ys(total);
        return (
          <g key={i}>
            <rect x={x} y={yMin} width={bw} height={ys(0) - yMin} fill="var(--cyan)" opacity="0.6" />
            <rect x={x} y={yMaj} width={bw} height={yMin - yMaj} fill="var(--amber)" opacity="0.7" />
            <rect x={x} y={yCrit} width={bw} height={yMaj - yCrit} fill="var(--red)" opacity="0.85" />
            {i % 3 === 0 && <text x={x + bw / 2} y={H - 6} className="chart-axis" textAnchor="middle">{d.d}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function CalibrationPlot() {
  const W = 480, H = 220, pad = { l: 36, r: 12, t: 16, b: 28 };
  const xs = (v) => pad.l + v * (W - pad.l - pad.r);
  const ys = (v) => H - pad.b - v * (H - pad.t - pad.b);
  const points = [
    [0.5, 0.46], [0.6, 0.61], [0.7, 0.68], [0.75, 0.74], [0.8, 0.79],
    [0.85, 0.86], [0.9, 0.88], [0.95, 0.94], [0.98, 0.97],
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 220 }}>
      <g className="chart-grid">
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)} />
            <line y1={pad.t} y2={H - pad.b} x1={xs(v)} x2={xs(v)} />
            <text x="6" y={ys(v) + 3} className="chart-axis">{v.toFixed(2)}</text>
            <text x={xs(v)} y={H - 8} className="chart-axis" textAnchor="middle">{v.toFixed(2)}</text>
          </g>
        ))}
      </g>
      <line x1={xs(0)} y1={ys(0)} x2={xs(1)} y2={ys(1)} stroke="var(--ink-3)" strokeDasharray="3 3" />
      <path d={points.map(([a, b], i) => `${i === 0 ? "M" : "L"} ${xs(a)} ${ys(b)}`).join(" ")} fill="none" stroke="var(--cyan)" strokeWidth="1.5" />
      {points.map(([a, b], i) => <circle key={i} cx={xs(a)} cy={ys(b)} r="3" fill="var(--cyan)" />)}
      <text x={xs(0.7)} y={ys(0.92)} className="chart-axis" fill="var(--cyan)">Sentinel-V3</text>
      <text x={xs(0.05)} y={ys(0.05) + 4} className="chart-axis" fill="var(--ink-2)">CONFIDENCE →</text>
    </svg>
  );
}

/* ---------- REPORTS PAGE ---------- */
function ReportsPage() {
  const inspections = useStore(s => s.inspections);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">SAS // REPORTS</div>
          <h1>Maintenance reports</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost"><Ico.doc width="14" /> EASA Form-1</button>
          <button className="btn primary"><Ico.doc width="14" /> Export PDF</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div className="label">Recent</div>
            </div>
            {inspections.map((i, idx) => (
              <div key={i.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", background: idx === 0 ? "rgba(88, 224, 255, 0.04)" : "" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{i.id}</div>
                  <span className={"severity " + i.severity}>{i.severity}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{i.region}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-2)", marginTop: 4 }}>{i.tail} · {i.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 32, background: "rgba(20, 28, 42, 0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
            <div>
              <div className="label">SAS · INSPECTION REPORT</div>
              <h2 style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 500, margin: "6px 0 4px" }}>INS-04812 · N742-AR</h2>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>2026-05-06 · A. Abdelrahman · LHR Stand 23</div>
            </div>
            <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 20 }}>AR</div>
          </div>

          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div><div className="label">AIRFRAME</div><div style={{ fontFamily: "var(--mono)", fontSize: 13, marginTop: 4 }}>N742-AR · Long-haul Twin</div></div>
            <div><div className="label">FLIGHT HOURS</div><div style={{ fontFamily: "var(--mono)", fontSize: 13, marginTop: 4 }}>38,420 hr · 7,126 cyc</div></div>
            <div><div className="label">LAST D-CHECK</div><div style={{ fontFamily: "var(--mono)", fontSize: 13, marginTop: 4 }}>2025-12-04 · LGW</div></div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="label" style={{ marginBottom: 8 }}>Summary</div>
            <p style={{ fontSize: 13, color: "var(--ink-1)", lineHeight: 1.7 }}>
              Walk-around inspection completed pre-departure LHR-DXB. Sentinel-V3 returned 5 findings across 4 zones; one critical stress-crack on the starboard wing leading edge requires hold-point review prior to dispatch. All findings projected to airframe model and cross-referenced against last 30-day baseline.
            </p>
          </div>

          <div className="label" style={{ marginBottom: 8 }}>Findings</div>
          <table className="tbl" style={{ marginLeft: -14, width: "calc(100% + 28px)" }}>
            <thead><tr><th>ID</th><th>Type</th><th>Region</th><th>Severity</th><th>Conf.</th></tr></thead>
            <tbody>
              <tr><td>D-001</td><td>Stress crack</td><td>Wing / Stbd LE</td><td><span className="severity critical">crit</span></td><td>0.96</td></tr>
              <tr><td>D-002</td><td>Lightning strike</td><td>V-Stab</td><td><span className="severity major">maj</span></td><td>0.91</td></tr>
              <tr><td>D-003</td><td>Paint delam.</td><td>Fus / Fwd L</td><td><span className="severity minor">min</span></td><td>0.88</td></tr>
              <tr><td>D-004</td><td>Dent / impact</td><td>Belly / Cargo L</td><td><span className="severity major">maj</span></td><td>0.94</td></tr>
              <tr><td>D-005</td><td>Corrosion patch</td><td>Belly / Aft</td><td><span className="severity minor">min</span></td><td>0.79</td></tr>
            </tbody>
          </table>

          <div className="label" style={{ marginTop: 24, marginBottom: 8 }}>Damage location screenshots</div>
          <div className="grid-3">
            {["WING-S LE", "V-STAB", "BELLY/L"].map(n => (
              <div key={n} style={{ aspectRatio: "16/10", border: "1px solid var(--line)", borderRadius: 6, position: "relative", background: "var(--bg-2)", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, rgba(140,180,230,0.05) 0 8px, transparent 8px 16px)" }} />
                <div style={{ position: "absolute", top: 6, left: 8, fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-2)", letterSpacing: "0.1em" }}>{n}</div>
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                  <div className="marker-2d" style={{ position: "static" }}><div className="label-tag">3D-LINKED</div></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-2)", letterSpacing: "0.12em" }}>
            <span>SIGNED · A.ABDELRAHMAN · LIC #AR-2841</span>
            <span>SAS v3.4.1 · DOC ID INS-04812 · PAGE 1/3</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- SETTINGS PAGE ---------- */
function SettingsPage() {
  const settings = useStore(s => s.settings);
  const user = useStore(s => s.user);
  const update = (patch) => setS({ settings: { ...settings, ...patch } });
  const updateNotif = (k, v) => update({ notif: { ...settings.notif, [k]: v } });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">SAS // SETTINGS</div>
          <h1>Settings</h1>
        </div>
      </div>
      <div className="grid-2">
        <div className="card" style={{ padding: 24 }}>
          <div className="label">Profile</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 16 }}>Operator credential</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, #0e1828, #050810)", border: "1px solid var(--line-strong)", display: "grid", placeItems: "center", fontFamily: "'Cormorant Garamond', serif", fontSize: 24 }}>AR</div>
            <div>
              <div style={{ fontSize: 15 }}>{user.name}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>{user.role} · {user.team}</div>
            </div>
          </div>
          <div className="field"><label>Display name</label><input defaultValue={user.name} /></div>
          <div className="field"><label>Email</label><input defaultValue={user.email || "operator@ar-aero.com"} /></div>
          <div className="field"><label>Operator role</label>
            <select defaultValue={user.role}><option>Lead Inspector</option><option>Inspector</option><option>Engineer</option><option>Auditor</option></select>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="label">AI · detection</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 16 }}>Sentinel-V3 thresholds</div>
          <div className="field">
            <label>Confidence threshold · {settings.aiThreshold.toFixed(2)}</label>
            <div className="slider-row">
              <input className="slider" type="range" min="0.5" max="0.99" step="0.01"
                value={settings.aiThreshold} onChange={e => update({ aiThreshold: +e.target.value })} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--cyan)", minWidth: 36 }}>{settings.aiThreshold.toFixed(2)}</span>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-2)", marginTop: 6, letterSpacing: "0.1em" }}>
              {settings.aiThreshold < 0.7 ? "AGGRESSIVE · MORE FALSE POSITIVES" : settings.aiThreshold > 0.9 ? "CONSERVATIVE · MAY MISS MARGINAL FINDINGS" : "BALANCED · RECOMMENDED"}
            </div>
          </div>
          <div className="field">
            <label>Severity weighting</label>
            <select><option>Default — depth × location × age</option><option>Length-weighted</option><option>Location-weighted</option></select>
          </div>
          <div className="field">
            <label>Units</label>
            <div className="auth-segment" style={{ marginBottom: 0 }}>
              <button className={settings.units === "metric" ? "active" : ""} onClick={() => update({ units: "metric" })}>Metric</button>
              <button className={settings.units === "imperial" ? "active" : ""} onClick={() => update({ units: "imperial" })}>Imperial</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="label">Notifications</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 16 }}>Channels & cadence</div>
          {[
            ["critical", "Critical findings · instant push"],
            ["daily", "Daily fleet digest · 06:00 local"],
            ["weekly", "Weekly trend report · Mondays"],
          ].map(([k, l]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <span>{l}</span>
              <div className={"toggle " + (settings.notif[k] ? "on" : "")} onClick={() => updateNotif(k, !settings.notif[k])}><div className="knob" /></div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="label">Theme</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, marginTop: 4, marginBottom: 16 }}>Workspace appearance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {["Dark · Aerospace", "Dark · Hangar", "Dark · Tactical", "Light · Daylight"].map((t, i) => (
              <div key={t} className="card" style={{ padding: 12, cursor: "pointer", borderColor: i === 0 ? "var(--cyan)" : "var(--line)" }}>
                <div style={{ height: 48, borderRadius: 4, background:
                  i === 0 ? "linear-gradient(135deg, #0a1018, #131d2c)" :
                  i === 1 ? "linear-gradient(135deg, #100a08, #1c1812)" :
                  i === 2 ? "linear-gradient(135deg, #0a120a, #1c241c)" :
                  "linear-gradient(135deg, #f0f4fa, #d4dde8)"
                , marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>{t}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", marginTop: 8 }}>
            <span>Auto-export reports nightly</span>
            <div className={"toggle " + (settings.autoExport ? "on" : "")} onClick={() => update({ autoExport: !settings.autoExport })}><div className="knob" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- ROUTER ---------- */
function App() {
  const route = useStore(s => s.route);
  const name = route.name;

  if (name === "landing") {
    return (
      <div className="app">
        <TopBar />
        <main style={{ overflow: "hidden" }}><LandingPage /></main>
        <StatusBar />
      </div>
    );
  }
  if (name === "auth") {
    return (
      <div className="app">
        <TopBar />
        <main style={{ overflow: "hidden" }}><AuthPage /></main>
        <StatusBar />
      </div>
    );
  }

  // sidebar layouts
  const pages = {
    dashboard: <DashboardPage />,
    upload: <UploadPage />,
    viewer: <ViewerPage />,
    analysis: <AnalysisPage />,
    reports: <ReportsPage />,
    settings: <SettingsPage />,
  };
  const Page = pages[name] || <DashboardPage />;
  return (
    <div className="app">
      <TopBar />
      <main className="with-sidebar" style={{ overflow: "hidden" }}>
        <Sidebar active={name} />
        <div style={{ overflow: name === "viewer" ? "hidden" : "auto", height: "100%" }}>
          {Page}
        </div>
      </main>
      <StatusBar />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
