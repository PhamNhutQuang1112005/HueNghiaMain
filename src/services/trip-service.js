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

  window.TripService = {
    KEY: KEY,
    getRawString: getRawString,
    getAll: getAll,
    save: save
  };
})();
