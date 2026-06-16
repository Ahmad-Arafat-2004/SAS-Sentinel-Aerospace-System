/**
 * Shared navbar — injected into every static page.
 * Edit this file once to update navigation everywhere.
 */
(function () {
  var PAGES = [
    ['index.html',           'Dashboard'],
    ['aircraft_select.html', 'Aircraft Select'],
    ['upload.html',          'Upload'],
    ['viewer3d.html',        '3D Viewer'],
    ['history.html',         'History'],
  ];

  var current = location.pathname.split('/').pop() || 'index.html';

  var links = PAGES.map(function (p) {
    return '<a href="' + p[0] + '"' + (current === p[0] ? ' class="active"' : '') + '>' + p[1] + '</a>';
  }).join('');

  var header = document.createElement('header');
  header.className = 'topbar';
  header.innerHTML =
    '<a href="index.html" class="brand">' +
      '<div class="brand-mark">AR</div>' +
      '<div class="brand-name">SAS<span class="sub">Sentinel · Aerospace</span></div>' +
    '</a>' +
    '<nav class="topbar-nav">' + links + '</nav>' +
    '<div class="topbar-spacer"></div>' +
    '<div class="topbar-meta">' +
      '<span class="pill"><span class="dot"></span> AI · ONLINE</span>' +
      '<span>v3.4.1</span>' +
    '</div>';

  /* Insert right after .app-bg so the background layer stays behind */
  var bg = document.querySelector('.app-bg');
  if (bg) {
    bg.parentNode.insertBefore(header, bg.nextSibling);
  } else {
    document.body.insertBefore(header, document.body.firstChild);
  }
})();
