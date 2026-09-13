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

  // Ghi 1 mốc đăng nhập/đăng xuất vào HN_STAFF_TIMELOG_KEY — dùng cho màn "Thống kê nhân sự" (giờ làm)
  // bên admin. Không được để lỗi ở đây làm hỏng luồng đăng nhập/đăng xuất chính nên bọc try/catch riêng.
  function logTimeEvent(type, username) {
    if (!username) return;
    try {
      var raw = localStorage.getItem(HN_STAFF_TIMELOG_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      list.push({ id: 'tl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), username: username, type: type, ts: Date.now() });
      localStorage.setItem(HN_STAFF_TIMELOG_KEY, JSON.stringify(list));
    } catch (e) { /* localStorage đầy/bị chặn — bỏ qua, không chặn đăng nhập/đăng xuất */ }
  }

  // Giữ nguyên hành vi cũ: KHÔNG try/catch (login.js gốc gọi setItem trực tiếp).
  function set(user) {
    sessionStorage.setItem(KEY, JSON.stringify(user));
    logTimeEvent('login', user && user.username);
  }

  function clear() {
    var cur = get();
    sessionStorage.removeItem(KEY);
    logTimeEvent('logout', cur && cur.username);
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
