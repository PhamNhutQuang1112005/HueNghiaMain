// Key localStorage/sessionStorage dùng chung giữa các trang — nguồn duy nhất, tránh lệch key giữa các trang.
// Nạp bằng thẻ <script> thường (không phải module) TRƯỚC script chính của từng trang —
// const top-level ở đây dùng chung được cho các <script> nạp sau trong cùng trang.
const HN_STORAGE_KEY = 'hn_trip_seat_bank_v12';
const HN_TRIPS_KEY = 'hn_trips_meta_v9';
const HN_PICKUP_PAX_KEY = 'hn_pickup_passengers_v6';
const HN_CURRENT_USER_KEY = 'hn_current_user';
const ZONE1_COLLAPSED_KEY = 'callcenter.zone1Collapsed';
// Tài xế trung chuyển gán ở trang shuttle.html, đọc lại ở cột "Tài xế" bảng Trung chuyển đón
// (ticketstaff.html/callcenter.html) — khoá theo "sđt_chặng" (chặng 'don' gộp cả khách Rước liền,
// vì shuttle.html xếp Rước liền vào cùng nhóm "đón" khi đồng bộ từ tripSeatBank).
const HN_SHUTTLE_DRIVER_KEY = 'hn_shuttle_driver_assign_v1';

// Loại xe + biển số MẶC ĐỊNH đi kèm từng tài xế trung chuyển — dùng ở modal "Cập nhật trạng thái"
// (ticketstaff-pickup.js, role trung chuyển): chọn 1 tài xế thì 2 ô loại xe/biển số tự điền theo giá trị
// đã gán trước cho tài xế đó. Nút "Gán" ghi đè giá trị mặc định mới cho tài xế; nút "Lưu" chỉ áp loại
// xe/biển số cho (các) khách đang sửa nên KHÔNG đụng tới map này (lần sau chọn lại tài xế vẫn ra mặc
// định cũ). Shape: { "<mã tài xế>": { vehicleType, plate } }.
const HN_SHUTTLE_DRIVER_VEHICLE_KEY = 'hn_shuttle_driver_vehicle_v1';

// Trang "Trung chuyển" (ticketstaff-pickup.js) — 2 danh sách thông báo/đánh dấu hiện ở đầu bảng gộp,
// CẢ 2 role (bán vé + trung chuyển) đều thấy nên phải qua localStorage (không phải biến JS trong 1 tab)
// để đồng bộ giữa các phiên đăng nhập khác nhau (2 tab/2 máy khác nhau), giống cách HN_SHUTTLE_DRIVER_KEY
// đồng bộ qua sự kiện 'storage' — xem window.addEventListener('storage', ...) trong ticketstaff-account.js.
// Mỗi lần sửa/thêm là 1 phần tử MỚI (không ghi đè phần tử cũ), phần tử mới nhất đứng đầu mảng.
const HN_PK_PHONGVE_NOTICES_KEY = 'hn_pk_phongve_notices_v1'; // [{ id, phone, rowKey }]
const HN_PK_PRINT_RUOC_KEY = 'hn_pk_print_ruoc_dividers_v1'; // [{ id, label }]

// ===== Store cấu hình đội xe dùng chung (trang Admin quản trị, ticketstaff/shuttle đọc theo) =====
// Nguồn dữ liệu duy nhất cho Hướng/Tuyến/Loại xe/Xe/Nhân viên — trước đây hard-code rải rác trong
// js/ticketstaff.js (TRIP_DIRECTIONS_CFG, ROUTES_CFG) và các <select> trong ticketstaff.html/shuttle.html.
// Đọc/ghi qua window.FleetStore (js/shared/fleet-store.js). Seed 1 lần từ giá trị hard-code cũ nên
// hành vi 2 trang kia không đổi.
const HN_DIRECTIONS_KEY = 'hn_directions_v3';
const HN_ROUTES_KEY = 'hn_routes_v5';
const HN_STATIONS_KEY = 'hn_stations_v1';
const HN_VEHICLE_TYPES_KEY = 'hn_vehicle_types_v1';
const HN_VEHICLES_KEY = 'hn_vehicles_v1';
const HN_STAFF_KEY = 'hn_staff_v1';
const HN_ADMIN_ACTIVITY_KEY = 'hn_admin_activity_v1';
const HN_SCHEDULE_HOURS_KEY = 'hn_schedule_hours_v1';
const HN_SEAT_LAYOUTS_KEY = 'hn_seat_layouts_v2';
const HN_VEHICLE_CATEGORIES_KEY = 'hn_vehicle_categories_v1';
const HN_VEHICLE_SEATS_KEY = 'hn_vehicle_seats_v1';


