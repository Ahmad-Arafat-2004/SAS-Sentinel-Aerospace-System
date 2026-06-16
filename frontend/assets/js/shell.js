/**
 * SAS — Shared App Shell
 * Injects topbar, sidebar, and statusbar into every static page.
 * Place <script src="assets/js/shell.js"></script> inside .with-sidebar,
 * immediately after <aside id="site-sidebar">, so it runs synchronously
 * before any page content renders.
 */
(function () {
  var current = location.pathname.split('/').pop() || 'index.html';

  function ico(d) {
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' + d + '</svg>';
  }

  var NAV = [
    { href: 'index.html',           label: 'Dashboard',       svg: ico('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>') },
    { href: 'aircraft_select.html', label: 'Aircraft Select', svg: ico('<path d="M21 12l-9 5-9-5 4-2 5 1 5-1z"/><path d="M12 17v3"/><path d="M9 20h6"/>') },
    { href: 'upload.html',          label: 'Upload & Detect', svg: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>') },
    { href: 'viewer3d.html',        label: '3D Viewer',       svg: ico('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>') },
    { href: 'history.html',         label: 'History',         svg: ico('<path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/>') },
  ];

  /* ── Topbar ──────────────────────────────────────────────── */
  var topbar = document.getElementById('site-topbar');
  if (topbar) {
    topbar.innerHTML =
      '<a href="index.html" class="brand">' +
        '<div class="brand-mark">AR</div>' +
        '<div class="brand-name">SAS<span class="sub">Sentinel · Aerospace</span></div>' +
      '</a>' +
      '<nav class="topbar-nav">' +
        NAV.map(function (p) {
          return '<a href="' + p.href + '"' + (current === p.href ? ' class="active"' : '') + '>' + p.label + '</a>';
        }).join('') +
      '</nav>' +
      '<div class="topbar-spacer"></div>' +
      '<div class="topbar-meta">' +
        '<span class="pill"><span class="dot"></span> AI · ONLINE</span>' +
        '<span>v3.4.1</span>' +
      '</div>';
  }

  /* ── Sidebar ─────────────────────────────────────────────── */
  var sidebar = document.getElementById('site-sidebar');
  if (sidebar) {
    sidebar.innerHTML =
      '<div class="section">Workspace</div>' +
      NAV.map(function (p) {
        return '<a class="side-link' + (current === p.href ? ' active' : '') + '" href="' + p.href + '">' +
          p.svg + '<span>' + p.label + '</span>' +
        '</a>';
      }).join('');
  }

  /* ── Statusbar (after DOM ready — it's at the bottom) ────── */
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.getElementById('site-statusbar');
    if (!bar) return;
    var page = current.replace('.html', '').replace(/_/g, ' ').toUpperCase();
    bar.innerHTML =
      '<span>SAS / ' + page + '</span>' +
      '<span class="sep">·</span>' +
      '<span>OPERATOR · A.ABDELRAHMAN</span>' +
      '<span class="sep">·</span>' +
      '<span>FLEET · 5 ACTIVE</span>' +
      '<span class="sep">·</span>' +
      '<span style="color:var(--cyan)">● MODEL: SENTINEL-V3 / 0.91 mAP</span>' +
      '<span style="flex:1"></span>' +
      '<span>BUILD 2026.05.07</span>';
  });
})();
