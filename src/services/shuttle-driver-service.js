/* =========================================================
   SHUTTLE-DRIVER-SERVICE.JS — Bọc localStorage cho phân công
   tài xế trung chuyển (key HN_SHUTTLE_DRIVER_KEY).
   =========================================================

   Gom mọi lời gọi localStorage rải rác cho key này về 1 chỗ (Phase F):
     - đọc  : ticketstaff.js (renderTransshipTables), ticketstaff-pickup.js
              (pkReadShuttleDriverMap, pkRenderPaxTable)
     - ghi  : ticketstaff-pickup.js (seed, pkSaveDriverNote, pkSaveDriverUpdate)
   Shape dữ liệu KHÔNG đổi: { "<sđt>_<don|tra>": { driverName, driverPhone,
   driverPlate, driverVehicleType, driverNote } }. Tên key KHÔNG đổi.

   Ghi bằng setItem thường (không tự bắn StorageEvent) — trình duyệt tự bắn 'storage'
   cho các tab khác; trang shuttle.html thật cũng ghi cùng key này.

   Nạp bằng <script> thường NGAY SAU js/shared/storage-keys.js (dùng hằng
   HN_SHUTTLE_DRIVER_KEY) và TRƯỚC ticketstaff-pickup.js. Chỉ ticketstaff.html nạp.

   API: window.ShuttleDriverService
   ========================================================= */
(function () {
  'use strict';

  var KEY = HN_SHUTTLE_DRIVER_KEY;

  // Bản đồ phân công tài xế — trả {} khi chưa có / lỗi parse (giống mọi call site cũ).
  function getMap() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) {
      return {};
    }
  }

  function setMap(map) {
    try {
      localStorage.setItem(KEY, JSON.stringify(map || {}));
    } catch (e) {
      /* ignore — giống các call site cũ (try/catch nuốt lỗi quota/private mode) */
    }
  }

  // Key đã có gì trong localStorage chưa — dùng để KHÔNG seed đè lên phân công thật.
  function hasAny() {
    try {
      return !!localStorage.getItem(KEY);
    } catch (e) {
      return false;
    }
  }

  window.ShuttleDriverService = {
    KEY: KEY,
    getMap: getMap,
    setMap: setMap,
    hasAny: hasAny
  };
})();
