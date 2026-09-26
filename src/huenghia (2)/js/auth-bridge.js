/**
 * AUTH-BRIDGE.JS — Cầu nối module hàng hóa (cargo/receive-report...) với hệ đăng nhập
 * thật của app (src/auth/session.js + src/shared/js/fleet-store.js), nạp SAU 2 file đó.
 *
 * Mã/tên nhân viên hiển thị trên các trang hàng hóa PHẢI lấy từ tài khoản đang đăng
 * nhập (Session), tra cứu ra hồ sơ nhân viên thật (FleetStore.getStaff()) — không cho
 * nhập tay như bản demo cũ.
 */
(function () {
  'use strict';

  var LOGIN_PAGE = '../../pages/index.html';

  function getCurrentStaff() {
    if (typeof Session === 'undefined' || typeof FleetStore === 'undefined') return null;
    var session = Session.get();
    if (!session || !session.username) return null;

    var staff = FleetStore.getStaff().find(function (s) { return s.username === session.username; });
    return {
      code: (staff && staff.code) || session.username,
      name: (staff && staff.name) || session.roleLabel || session.username,
      station: (staff && staff.station) || '',
      username: session.username,
      role: session.role
    };
  }

  // Chặn trang nếu chưa đăng nhập. Luôn trả về 1 object (không bao giờ null) để code gọi
  // sau đó không phải null-check — lúc đang redirect thì dữ liệu placeholder này vô hại.
  function requireLogin() {
    var staff = getCurrentStaff();
    if (!staff) {
      window.location.href = LOGIN_PAGE;
      return { code: '', name: '', station: '', username: '', role: '', __unauthenticated: true };
    }
    return staff;
  }

  function logout() {
    if (typeof Session !== 'undefined') Session.clear();
    window.location.href = LOGIN_PAGE;
  }

  function renderUserChip(staff) {
    var chip = document.querySelector('.user-chip');
    if (!chip || !staff || staff.__unauthenticated) return;
    chip.innerHTML =
      '<span class="avatar">' + (staff.name || '?').charAt(0).toUpperCase() + '</span>' +
      '<span>' + staff.name + (staff.code ? ' (Mã NV: ' + staff.code + ')' : '') + '</span>' +
      '<button type="button" id="hnLogoutBtn" title="Đăng xuất" ' +
        'style="margin-left:10px;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:12px;font-weight:700;">Đăng xuất</button>';
    var btn = document.getElementById('hnLogoutBtn');
    if (btn) btn.addEventListener('click', logout);
  }

  window.HNAuth = {
    getCurrentStaff: getCurrentStaff,
    requireLogin: requireLogin,
    logout: logout,
    renderUserChip: renderUserChip
  };
})();
