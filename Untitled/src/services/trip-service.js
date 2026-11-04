/* =========================================================
   TRIP-SERVICE.JS — Bọc localStorage cho danh sách chuyến/phơi
   (key HN_TRIPS_KEY = 'hn_trips_meta_v9').
   =========================================================

   Gom lời gọi localStorage cho key này về 1 chỗ (Phase F). Chỉ là lớp lưu trữ mỏng —
   KHÔNG chứa logic nghiệp vụ:
     - Chuẩn hoá phơi cũ (date / createdAt) + fallback về phơi mẫu DEFAULT_*_TRIPS
       vẫn nằm trong loadAllTrips() ở ticketstaff.js (đặc thù trang bán vé).
     - admin.js dùng getAll()/save() thẳng (không migration, [] khi trống).

   Ghi bằng setItem thường, KHÔNG try/catch (giữ đúng hành vi lsWrite/saveData cũ —
   lỗi quota sẽ ném ra như trước). Trình duyệt tự bắn 'storage' cho tab khác.

   Nạp bằng <script> thường NGAY SAU js/shared/storage-keys.js và TRƯỚC admin.js /
   ticketstaff.js. Cả admin.html và ticketstaff.html đều nạp.

   API: window.TripService
   ========================================================= */
(function () {
  'use strict';

  var KEY = HN_TRIPS_KEY;

  // Chuỗi JSON thô đã lưu (hoặc null). Dùng cho loadAllTrips() — nơi cần tự parse để
  // console.error khi hỏng + kiểm tra Array.isArray && length > 0.
  function getRawString() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  // Mảng phơi đã lưu; [] khi chưa có / null / parse lỗi (= admin lsRead(KEY, [])).
  function getAll() {
    var raw = getRawString();
    if (raw == null) return [];
    try {
      var v = JSON.parse(raw);
      return v == null ? [] : v;
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  // Trạng thái LƯU của phơi chưa chạy theo biển số: có biển = 'Đang bán', chưa có = 'Chưa chỉ định' (cùng
  // quy tắc với trạng thái hiển thị trên thẻ phơi). Không đụng trạng thái khác (Khởi hành, Đã hủy...) và phơi mẫu.
  // Gọi sau mỗi lần đổi biển số / trước khi hiện trạng thái để chuỗi lưu không lệch với biển số.
  function syncStatus(t) {
    if (t && !t.isTemplate && (!t.status || t.status === 'Chưa chỉ định' || t.status === 'Đang bán' || t.status === 'Đã chỉ định xe')) {
      t.status = t.plate ? 'Đang bán' : 'Chưa chỉ định';
    }
    return t;
  }

  window.TripService = {
    syncStatus: syncStatus,
    KEY: KEY,
    getRawString: getRawString,
    getAll: getAll,
    save: save
  };
})();
