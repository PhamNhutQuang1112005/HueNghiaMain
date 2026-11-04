/* Sidebar redesign: chia nhóm Vận hành / Tài chính, badge COD, khu tài khoản cố định ở chân sidebar.
   Chỉ sắp xếp lại / thêm phần tử trang trí — giữ nguyên các phần tử gốc (id, href, radio lọc) mà responsive.js và cargo.js đang dùng. */
(function () {
  'use strict';

  function loadCargos() {
    try { return JSON.parse(localStorage.getItem('hueNghia_cargos')) || []; } catch (e) { return []; }
  }

  function init() {
    var nav = document.querySelector('.sidebar-nav');
    var aside = document.getElementById('appSidebar');
    if (!nav || !aside) return;

    var first = document.querySelector('.sidebar-section-title');
    if (first) first.textContent = 'Vận hành';

    var cod = nav.querySelector('a[href="cod.html"]');
    var shift = nav.querySelector('a[href="ket-ca.html"]');
    if (cod && shift) {
      var title = document.createElement('div');
      title.className = 'sidebar-section-title rd-nav-title';
      title.textContent = 'Tài chính';
      nav.appendChild(title);
      nav.appendChild(shift);
      nav.appendChild(cod);
    }

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

    // Khu tài khoản + chi nhánh cố định ở chân sidebar (nằm ngoài vùng cuộn)
    if (!aside.querySelector('.rd-sidebar-foot')) {
      var staff = window.HNAuth && window.HNAuth.getCurrentStaff ? window.HNAuth.getCurrentStaff() : null;
      var name = (staff && staff.name) || 'Tài khoản';
      var station = (staff && staff.station) || 'Chưa chọn chi nhánh';
      var foot = document.createElement('div');
      foot.className = 'rd-sidebar-foot';
      var avatar = document.createElement('span');
      avatar.className = 'rd-foot-avatar';
      avatar.textContent = name.trim().charAt(0).toUpperCase() || '?';
      var info = document.createElement('div');
      info.className = 'rd-foot-info';
      var n = document.createElement('strong'); n.textContent = name;
      var st = document.createElement('small'); st.textContent = station;
      info.appendChild(n); info.appendChild(st);
      foot.appendChild(avatar); foot.appendChild(info);
      aside.appendChild(foot);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
