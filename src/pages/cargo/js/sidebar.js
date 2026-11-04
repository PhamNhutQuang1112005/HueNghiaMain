/* Sidebar redesign: chia nhóm Vận hành / Tài chính, badge COD, thẻ trạm ở đầu sidebar.
   Chỉ sắp xếp lại / thêm phần tử trang trí — giữ nguyên các phần tử gốc (id, href, radio lọc) mà responsive.js và cargo.js đang dùng. */
(function () {
  'use strict';

  function loadCargos() {
    try { return JSON.parse(localStorage.getItem('hueNghia_cargos')) || []; } catch (e) { return []; }
  }

  function init() {
    initFlyouts();
    var nav = document.querySelector('.sidebar-nav');
    var aside = document.getElementById('appSidebar');
    if (!nav || !aside) return;

    var first = document.querySelector('.sidebar-section-title');
    if (first) first.textContent = 'Vận hành';

    var cod = nav.querySelector('a[href="cod.html"]');
    var shift = nav.querySelector('a[href="ket-ca.html"]');
    if (cod && shift && !nav.querySelector('.rd-nav-title')) { // HTML đã đúng thứ tự sẵn; nhánh này chỉ là dự phòng cho trang cũ
      var title = document.createElement('div');
      title.className = 'sidebar-section-title rd-nav-title';
      title.textContent = 'Tài chính';
      nav.appendChild(title);
      nav.appendChild(shift);
      nav.appendChild(cod);
    }

    // Thẻ "Trạm đang làm việc" ở đầu sidebar (như bản redesign)
    var content = aside.querySelector('.sidebar-content');
    if (content) {
      var cur = window.HNAuth && window.HNAuth.getCurrentStaff ? window.HNAuth.getCurrentStaff() : null;
      var stName = (cur && cur.station) || 'Chưa chọn trạm';
      var card = aside.querySelector('.rd-station'); // có sẵn trong HTML (giữ chỗ) để menu không bị đẩy xuống khi tải
      if (!card) {
        card = document.createElement('div');
        card.className = 'rd-station';
        card.innerHTML = '<span class="rd-station-avatar"></span><div><small>Trạm đang làm việc</small><strong></strong></div>';
        content.insertBefore(card, content.firstChild);
      }
      card.querySelector('.rd-station-avatar').textContent = stName.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
      card.querySelector('strong').textContent = stName;
    }

    // Badge số lượng trên Hàng trả về (đọc từ localStorage, chỉ trang trí)
    function addBadge(el, n, tip) {
      if (!el || !(n > 0)) return;
      var b = document.createElement('span');
      b.className = 'rd-badge';
      b.textContent = n > 99 ? '99+' : n;
      b.title = tip;
      el.appendChild(b);
    }
    var all = loadCargos();
    addBadge(nav.querySelector('a[href="returned.html"]'), all.filter(function (c) { return c.status === 'returned'; }).length, 'Hàng trả về');

    // Badge COD: số đơn COD đã giao đang chờ đối soát
    if (cod) {
      var pending = loadCargos().filter(function (c) { return c.status === 'delivered' && Number(c.codAmount) > 0; }).length;
      if (pending > 0) {
        var badge = document.createElement('span');
        badge.className = 'rd-badge';
        badge.textContent = pending > 99 ? '99+' : pending;
        badge.title = pending + ' đơn COD chờ đối soát';
        cod.appendChild(badge);
      }
    }
  }

  // Danh sách lọc loại hàng = bảng nổi bên phải mục cha (position: fixed để không bị vùng cuộn của sidebar cắt).
  // responsive.js toggle class "open" khi bấm mũi tên; ở đây chỉ đặt vị trí, đóng khi bấm ra ngoài / chọn một mục / nhấn Esc.
  function initFlyouts() {
    var aside = document.getElementById('appSidebar');
    if (!aside) return;
    function place(sub) {
      var head = sub.querySelector(':scope > .sidebar-nav-item');
      var menu = sub.querySelector(':scope > .sidebar-submenu');
      if (!head || !menu) return;
      var r = head.getBoundingClientRect();
      var h = menu.offsetHeight || 300;
      var w = menu.offsetWidth || 230;
      // cạnh phải sidebar + 8px; màn hình hẹp (menu trượt) thì lùi vào trong để không bị cắt mép phải
      var x = Math.max(8, Math.min(aside.getBoundingClientRect().right + 8, window.innerWidth - w - 8));
      menu.style.setProperty('--fly-x', Math.round(x) + 'px');
      menu.style.setProperty('--fly-y', Math.max(8, Math.min(r.top, window.innerHeight - h - 8)) + 'px');
    }
    function closeAll(except) {
      aside.querySelectorAll('.sidebar-subgroup.open').forEach(function (g) { if (g !== except) g.classList.remove('open'); });
    }
    aside.querySelectorAll('.sidebar-subgroup').forEach(function (sub) {
      new MutationObserver(function () { if (sub.classList.contains('open')) { closeAll(sub); place(sub); } })
        .observe(sub, { attributes: true, attributeFilter: ['class'] });
    });
    document.addEventListener('click', function (e) {
      var open = aside.querySelector('.sidebar-subgroup.open');
      if (!open) return;
      if (e.target.closest('.status-option')) { setTimeout(function () { closeAll(); }, 0); return; }
      if (!e.target.closest('.sidebar-subgroup.open')) closeAll();
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
    window.addEventListener('resize', function () { closeAll(); });
    var sc = aside.querySelector('.sidebar-content');
    if (sc) sc.addEventListener('scroll', function () { closeAll(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
