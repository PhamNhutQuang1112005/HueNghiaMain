/* =========================================================
   AUTH/PERMISSIONS.JS — Toàn bộ luật phân quyền hiện tại.
   =========================================================

   Hệ thống demo hiện CHỈ có 2 gate, trước đây nằm rải:
     - admin.html: chặn vào nếu role !== 'admin' (adminGuard trong admin.js)
     - ticketstaff tab "Trung chuyển": role === 'shuttle_dispatch' → chế độ điều
       hành (chọn nhiều + "Cập nhật"); role khác → chế độ phòng vé ("Chỉ định")
       (pkIsShuttleDispatchRole trong ticketstaff-pickup.js)

   Gom về đây để 1 chỗ thấy hết luật. Đọc role qua window.Session (auth/session.js).
   KHÔNG thêm luật mới — mọi thao tác khác (đặt/sửa/huỷ vé...) hiện KHÔNG gán quyền
   theo role. Sau này chuyển sang bảng permission → hàm thật sẽ là hasPermission(key).

   Nạp bằng <script> thường SAU auth/session.js, TRƯỚC script dùng.
   admin.html + ticketstaff.html nạp (index.html không cần).

   API: window.Auth
   ========================================================= */
(function () {
  'use strict';

  function role() {
    return (window.Session && Session.get()) ? Session.get().role : null;
  }

  window.Auth = {
    // Được vào trang Admin.
    isAdmin: function () {
      return role() === 'admin';
    },
    // Ở chế độ ĐIỀU HÀNH trung chuyển (thay vì phòng vé) tại tab "Trung chuyển".
    isShuttleDispatch: function () {
      return role() === 'shuttle_dispatch';
    }
  };
})();
