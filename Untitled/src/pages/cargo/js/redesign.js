/* Giao diện redesign: thẻ thống kê + tab trạng thái có số đếm + phân trang. Tất cả chỉ ĐỌC các dòng <tr> mà JS của trang
   đã dựng rồi ẩn/hiện bằng thuộc tính hidden (không đổi dữ liệu, không đụng logic lọc/render cũ).
   Khai báo trong HTML: <div class="rd-stats" data-body="<id tbody>" data-row="<selector dòng, tuỳ chọn>"
   data-cards='[["Nhãn","chuỗi cần khớp trong dòng ('' = tất cả)","icon","màu"]]'
   data-tabs='[["Tất cả",""],["Chưa chuyển","Chưa chuyển"]]' (tuỳ chọn, tab lọc theo chuỗi khớp)
   data-page-size="10" (tuỳ chọn, bật phân trang)></div> */
(function () {
  var ICONS = {
    box: '<path d="m21 8-9 5-9-5"/><path d="m3.3 7 8.7-5 8.7 5v10L12 22l-8.7-5Z"/><path d="M12 13v9"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'
  };
  function svg(name) {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.box) + '</svg>';
  }
  function setup(el) {
    var body = document.getElementById(el.dataset.body);
    if (!body) return;
    var cards;
    try { cards = JSON.parse(el.dataset.cards || '[]'); } catch (e) { return; }
    var sel = el.dataset.row || 'tr:not(:has(td[colspan]))';
    el.classList.add('rd-stats-grid');
    el.innerHTML = cards.map(function (c) {
      return '<div class="rd-stat"><div class="rd-stat-icon rd-' + (c[3] || 'red') + '">' + svg(c[2]) + '</div>' +
        '<div><span>' + c[0] + '</span><strong data-n>0</strong></div></div>';
    }).join('');
    var nums = el.querySelectorAll('[data-n]');
    var tabs = [], pageSize = parseInt(el.dataset.pageSize, 10) || 0, activeTab = 0, page = 1;
    try { tabs = JSON.parse(el.dataset.tabs || '[]'); } catch (e) { tabs = []; }
    var card = el.nextElementSibling && el.nextElementSibling.classList.contains('table-card') ? el.nextElementSibling : null;
    var tabBar = null, pager = null, tabCounts = [];
    if (card && tabs.length) {
      tabBar = document.createElement('div');
      tabBar.className = 'rd-tabbar';
      tabBar.innerHTML = '<div class="rd-tabs">' + tabs.map(function (t, i) {
        return '<button type="button" data-i="' + i + '">' + t[0] + '<span>0</span></button>';
      }).join('') + '</div>';
      card.insertBefore(tabBar, card.firstChild);
      tabCounts = tabBar.querySelectorAll('button span');
      tabBar.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-i]');
        if (!b) return;
        activeTab = +b.dataset.i; page = 1; update();
      });
    }
    if (card && pageSize) {
      pager = document.createElement('div');
      pager.className = 'rd-pager';
      card.appendChild(pager);
      pager.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-p]');
        if (!b || b.disabled) return;
        page = +b.dataset.p; update();
      });
    }
    function matches(r, t) { return !t || r.textContent.indexOf(t) !== -1; }
    function update() {
      var rows = Array.prototype.slice.call(body.querySelectorAll(sel));
      cards.forEach(function (c, i) {
        nums[i].textContent = c[1] ? rows.filter(function (r) { return matches(r, c[1]); }).length : rows.length;
      });
      tabs.forEach(function (t, i) {
        tabCounts[i].textContent = rows.filter(function (r) { return matches(r, t[1]); }).length;
        tabBar.querySelectorAll('button')[i].classList.toggle('active', i === activeTab);
      });
      if (!tabs.length && !pageSize) return;
      var vis = rows.filter(function (r) { return !tabs.length || matches(r, tabs[activeTab][1]); });
      var pages = pageSize ? Math.max(1, Math.ceil(vis.length / pageSize)) : 1;
      if (page > pages) page = pages;
      var from = pageSize ? (page - 1) * pageSize : 0, to = pageSize ? from + pageSize : vis.length;
      rows.forEach(function (r) { r.hidden = vis.indexOf(r) < from || vis.indexOf(r) >= to; });
      if (pager) {
        var btns = '';
        for (var i = 1; i <= pages; i++) btns += '<button type="button" data-p="' + i + '"' + (i === page ? ' class="active"' : '') + '>' + i + '</button>';
        pager.innerHTML = '<span>Hiển thị <strong>' + (vis.length ? from + 1 : 0) + '–' + Math.min(to, vis.length) + '</strong> trong ' + vis.length + ' đơn</span>' +
          '<div><button type="button" data-p="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>‹</button>' + btns +
          '<button type="button" data-p="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>›</button></div>';
        pager.style.display = vis.length > pageSize ? '' : 'none';
      }
    }
    new MutationObserver(update).observe(body, { childList: true });
    update();
  }
  function init() { document.querySelectorAll('.rd-stats').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
