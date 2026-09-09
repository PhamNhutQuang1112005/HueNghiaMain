/* =========================================================
   PICKUP-SERVICE.JS — Bọc localStorage cho danh sách khách
   "Rước liền" (key HN_PICKUP_PAX_KEY = 'hn_pickup_passengers_v6').
   =========================================================

   Gom lời gọi localStorage cho key này về 1 chỗ (Phase F). Các call site có 3 kiểu
   khác nhau nên service phơi 3 method 1:1, KHÔNG hợp nhất hành vi:

     readFirstNonEmpty(legacyKeys) — thử [KEY, ...legacyKeys] theo thứ tự, trả mảng
       ĐẦU TIÊN hợp lệ & không rỗng ([] nếu không có). Dùng cho loadPickupPassengers
       (legacy tới v3) và modal "Rước liền" (legacy tới v4).
     save(list) — ghi thẳng, KHÔNG bắn StorageEvent (savePickupPassengers — nơi gọi
       đã tự render lại; xem ghi chú trong js/shared/seat-bank.js).
     saveAndBroadcast(list) — ghi + TỰ bắn 'storage' cho CHÍNH tab này, để listener
       cùng trang chạy lại (savePickupInfo).

   Tên key + shape record KHÔNG đổi.

   Nạp bằng <script> thường NGAY SAU js/shared/storage-keys.js và TRƯỚC
   ticketstaff-pickup.js + booking-rebook.js. Chỉ ticketstaff.html nạp.

   API: window.PickupService
   ========================================================= */
(function () {
  'use strict';

  var KEY = HN_PICKUP_PAX_KEY;

  function readFirstNonEmpty(legacyKeys) {
    var keys = [KEY].concat(legacyKeys || []);
    for (var i = 0; i < keys.length; i++) {
      try {
        var saved = localStorage.getItem(keys[i]);
        if (saved) {
          var parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { /* thử key kế tiếp */ }
    }
    return [];
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function saveAndBroadcast(list) {
    var jsonStr = JSON.stringify(list);
    localStorage.setItem(KEY, jsonStr);
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: KEY,
        newValue: jsonStr,
        storageArea: localStorage
      }));
    } catch (e) { }
  }

  window.PickupService = {
    KEY: KEY,
    readFirstNonEmpty: readFirstNonEmpty,
    save: save,
    saveAndBroadcast: saveAndBroadcast
  };
})();
