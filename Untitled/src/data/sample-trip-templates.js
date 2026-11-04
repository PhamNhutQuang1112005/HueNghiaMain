// src/data/sample-trip-templates.js — Dữ liệu MẪU: các "phơi mẫu" cố định (isTemplate:true).
// Tách khỏi js/shared/constants.js (Phase C). Chỉ ticketstaff.js đọc (defaultTripsMeta fallback
// khi localStorage trống) — nạp trước ticketstaff.js trong ticketstaff.html. Không nạp ở admin.html.
// Tự chứa (todayStr__constants nằm luôn trong file này). Sau này thay bằng API => xoá khỏi HTML.
//
// Tuyến (`route`) dùng đúng nhãn 4 HƯỚNG CỐ ĐỊNH của FleetStore (fleet-store.js SEED_DIRECTIONS):
//   Sài Gòn - An Giang · Bình Dương - An Giang · An Giang - Bình Dương · An Giang - Sài Gòn
// Tên biến DEFAULT_SGCD_TRIPS / DEFAULT_CDSG_TRIPS giữ nguyên (chỉ ticketstaff.js:loadAllTrips dùng).

const todayStr__constants = new Date().toISOString().split("T")[0];

// isTemplate:true đánh dấu đây là "phơi mẫu" cố định dùng cho chế độ chọn mẫu tạo hàng loạt (xem
// toggleBulkTemplateMode() trong ticketstaff.js — tính năng Phơi xe trước đây ở callcenter.js, đã
// chuyển hẳn sang ticketstaff.js) — phơi tạo mới (đơn lẻ hay hàng loạt) KHÔNG có cờ này
// nên không lẫn vào danh sách mẫu, dù được thêm vào allTripsMeta chung với các phơi mẫu.
// id 1..10: CHUYẾN THẬT trong ngày (có sơ đồ ghế demo) — KHÔNG phải phơi mẫu. Hiện ở Zone 1 / danh
// sách phơi thường như mọi chuyến khác. Chỉ id 11..14 (DEFAULT_EXTRA_TEMPLATE_TRIPS) mới là phơi mẫu.
const DEFAULT_SGCD_TRIPS = [];

const DEFAULT_CDSG_TRIPS = [];

// Phơi mẫu bổ sung — trạm đi/đến/trạm đón lấy từ danh mục trạm FleetStore (SG: "508 Kinh Dương Vương"...
// / AG: "Trạm Long Xuyên"...) để nút "Bán vé"/lộ trình hoạt động đúng khi nhân bản.
const DEFAULT_EXTRA_TEMPLATE_TRIPS = [];
