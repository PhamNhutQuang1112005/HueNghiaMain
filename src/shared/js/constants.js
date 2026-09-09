// src/shared/js/constants.js — HẰNG SỐ / bảng tra cấu hình dùng chung (ticketstaff + admin).
// Nạp bằng thẻ <script> thường TRƯỚC script chính của trang — const top-level ở đây dùng chung
// cho các <script> nạp sau trong cùng trang. Thuần khai báo tĩnh, không chạy gì lúc nạp.
//
// Dữ liệu MẪU trước đây nằm chung file này đã tách sang src/data/ (Phase C):
//   CUSTOMER_HISTORY_DATA                                  -> src/data/sample-customer-history.js
//   DEFAULT_SGCD_TRIPS / DEFAULT_CDSG_TRIPS / *_EXTRA_*    -> src/data/sample-trip-templates.js

const STAFF_CODE_MAP = {
  "tuyetphuong.huenghia": "NV01",
  "minh.tran": "NV02",
  "nguyen.long": "NV03",
  "thi.hoa": "NV04"
};

const VEHICLE_TYPE_SEATS = {
  "Limousine 34 giường": 34,
  "Xe thường 36 giường": 36,
  "Xe thường 40 giường": 40,
  "Xe thường 41 giường": 41,
  "Xe VIP 24 phòng": 24,
  "Xe 44 giường": 44,
  "Xe Limousine 9 chỗ": 9,
  "Xe Limousine 11 chỗ": 11,
  "Xe Limousine 19 chỗ": 19,
  "Xe Limousine 28 chỗ": 28,
  "Xe thường 16 chỗ": 16,
  "Xe thường 26 chỗ": 26,
  "Xe thường 28 chỗ": 28,
  "Xe thường 47 chỗ": 47,
  "Xe Limousine 18 chỗ": 18,
  "Limousine 24 Phòng": 24,
  "Giường nằm 34 chỗ": 34,
  "Ghế ngồi 45 chỗ": 45
};

const DEFAULT_STAFF_STATION = '508 Kinh Dương Vương'; // Trạm đi mặc định theo nhân viên trạm đang đăng nhập
const DEFAULT_SUB_SEAT_PRICE = 280000;
const OCCUPIED_STATES = ['sold', 'hold', 'cargo', 'free'];
