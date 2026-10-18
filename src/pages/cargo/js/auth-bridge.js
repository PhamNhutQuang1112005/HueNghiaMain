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

  var LOGIN_PAGE = '../index.html';

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
    var displayName = staff.name || '?';
    // Rút gọn tên nếu quá dài (> 20 ký tự) để tránh tràn header
    var shortName = displayName.length > 20 ? displayName.substring(0, 18) + '…' : displayName;
    var codeLabel = staff.code ? ' (' + staff.code + ')' : '';
    chip.innerHTML =
      '<span class="avatar" title="' + displayName + codeLabel + '">'+
        (displayName).charAt(0).toUpperCase() +
      '</span>' +
      '<span title="' + displayName + codeLabel + '" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">' +
        shortName +
      '</span>' +
      '<button type="button" id="hnLogoutBtn" title="Đăng xuất" ' +
        'style="margin-left:6px;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:12px;font-weight:700;flex-shrink:0;">Đăng xuất</button>';
    var btn = document.getElementById('hnLogoutBtn');
    if (btn) btn.addEventListener('click', logout);
  }

  function clearAllSystemData() {
    if (confirm('Xác nhận XÓA SẠCH toàn bộ dữ liệu đơn hàng, phơi xe và báo cáo để chạy lại từ đầu?')) {
      localStorage.setItem('hueNghia_cargos', JSON.stringify([]));
      localStorage.setItem('hueNghia_manifests', JSON.stringify([]));
      localStorage.setItem('hueNghia_receive_shift_reports', JSON.stringify([]));
      localStorage.setItem('hueNghia_delivery_shift_reports', JSON.stringify([]));
      localStorage.setItem('hueNghia_cod_tickets', JSON.stringify([]));
      localStorage.setItem('cargo_deletion_history', JSON.stringify([]));
      window.location.reload();
    }
  }

  // Header phải THỐNG NHẤT trên mọi trang hàng hóa, giống trang bán vé:
  //   [Quản trị hệ thống — chỉ admin] [avatar + "Admin"/"NV" ▾ → dropdown: tên vai trò, username, Kết ca, Đăng xuất]
  // Không redirect khi chưa đăng nhập (việc đó do requireLogin() của từng trang lo).
  var ICON = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>',
    shift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
  };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function mountHeaderRight() {
    var right = document.querySelector('.header-right');
    if (!right) return;
    var staff = getCurrentStaff();
    if (!staff) return;
    var isAdmin = staff.role === 'admin';
    var label = isAdmin ? 'Admin' : 'NV';
    var session = (typeof Session !== 'undefined' && Session.get()) || {};
    var roleLabel = session.roleLabel || (isAdmin ? 'Quản trị viên hệ thống' : 'Nhân viên');
    right.innerHTML =
      (isAdmin ? '<a class="admin-link-btn" href="../admin.html" title="Về trang Quản trị hệ thống">' + ICON.shield + 'Quản trị hệ thống</a>' : '') +
      '<div class="hn-user-menu" id="hnUserMenu">' +
        '<button type="button" class="hn-user-btn" id="hnUserBtn" aria-haspopup="true" aria-expanded="false">' +
          '<span class="hn-avatar">' + label.charAt(0) + '</span><span>' + label + '</span>' + ICON.chevron +
        '</button>' +
        '<div class="hn-user-dropdown" id="hnUserDropdown" hidden>' +
          '<div class="hn-user-meta"><b>' + esc(roleLabel) + '</b><span>' + esc(staff.username) + '</span></div>' +
          '<a class="hn-user-item" href="ket-ca.html">' + ICON.shift + 'Kết ca</a>' +
          '<button type="button" class="hn-user-item hn-user-logout" id="hnLogoutBtn">' + ICON.logout + 'Đăng xuất</button>' +
        '</div>' +
      '</div>';
    var menu = document.getElementById('hnUserMenu');
    var btn = document.getElementById('hnUserBtn');
    var dd = document.getElementById('hnUserDropdown');
    function setOpen(open) {
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      dd.hidden = !open;
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(dd.hidden); });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    document.getElementById('hnLogoutBtn').addEventListener('click', logout);
  }
  document.addEventListener('DOMContentLoaded', mountHeaderRight);

  window.HNAuth = {
    getCurrentStaff: getCurrentStaff,
    requireLogin: requireLogin,
    logout: logout,
    renderUserChip: renderUserChip,
    clearAllSystemData: clearAllSystemData
  };
})();
