/* =========================================================
   AUTH/SESSION.JS — Bọc sessionStorage cho phiên đăng nhập
   (key HN_CURRENT_USER_KEY = 'hn_current_user').
   =========================================================

   Nguồn DUY NHẤT để đọc/ghi/xoá phiên đăng nhập. Trước đây mỗi trang tự
   parse sessionStorage.getItem('hn_current_user') với try/catch riêng
   (login.js ghi; admin.js, ticketstaff-account/pickup, booking.js,
   manifest-core.js đọc).

   Bản ghi phiên: { username, role, roleLabel }. Chỉ login.js ghi (khi đăng nhập);
   các trang khác chỉ đọc + xoá (đăng xuất). Shape + tên key KHÔNG đổi.

   Nạp bằng <script> thường NGAY SAU js/shared/storage-keys.js và TRƯỚC mọi script
   dùng phiên (kể cả login.js ở index.html — adminGuard ở admin.js chạy lúc nạp).

   API: window.Session
   ========================================================= */
(function () {
  'use strict';

  var KEY = HN_CURRENT_USER_KEY;

  // { username, role, roleLabel } hoặc null (chưa đăng nhập / dữ liệu hỏng).
  function get() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  // Giữ nguyên hành vi cũ: KHÔNG try/catch (login.js gốc gọi setItem trực tiếp).
  function set(user) {
    sessionStorage.setItem(KEY, JSON.stringify(user));
  }

  function clear() {
    sessionStorage.removeItem(KEY);
  }

  function role() {
    var u = get();
    return u ? u.role : null;
  }

  function username() {
    var u = get();
    return u ? u.username : null;
  }

  window.Session = {
    KEY: KEY,
    get: get,
    set: set,
    clear: clear,
    role: role,
    username: username
  };
})();
