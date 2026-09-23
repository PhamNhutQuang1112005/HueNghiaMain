// Key localStorage/sessionStorage dùng chung giữa các trang — nguồn duy nhất, tránh lệch key giữa các trang.
// Nạp bằng thẻ <script> thường (không phải module) TRƯỚC script chính của từng trang —
// const top-level ở đây dùng chung được cho các <script> nạp sau trong cùng trang.
const HN_STORAGE_KEY = 'hn_trip_seat_bank_v12';
const HN_TRIPS_KEY = 'hn_trips_meta_v9';
const HN_PICKUP_PAX_KEY = 'hn_pickup_passengers_v6';
const HN_CURRENT_USER_KEY = 'hn_current_user';
// Bản "sống" của danh sách tài khoản đăng nhập — bắt đầu là bản sao window.AUTH_ACCOUNTS
// (auth/accounts.js) nhưng lưu ở localStorage để trang Admin > Tài khoản thêm/sửa/xoá được qua UI
// (getAccountsList()/saveAccountsList(), định nghĩa chung ở auth/accounts.js — index.html lẫn admin.html
// đều nạp file đó nên trang đăng nhập (login.js) và trang Admin luôn đọc/ghi ĐÚNG 1 danh sách).
const HN_ADMIN_ACCOUNTS_KEY = 'hn_admin_accounts_v1';
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
const HN_MAIN_STATIONS_KEY = 'hn_main_stations_v1';
const HN_SUB_STATIONS_KEY = 'hn_sub_stations_v1';
const HN_STOP_STATIONS_KEY = 'hn_stop_stations_v1';
const HN_VEHICLE_TYPES_KEY = 'hn_vehicle_types_v1';
const HN_VEHICLES_KEY = 'hn_vehicles_v1';
const HN_STAFF_KEY = 'hn_staff_v1';
const HN_STAFF_ROLES_KEY = 'hn_staff_roles_v1';
const HN_AGENTS_KEY = 'hn_agents_v1'; // Danh sách Đại lý — xem shared/js/agent-store.js
const HN_ADMIN_ACTIVITY_KEY ='hn_admin_activity_v1';
const HN_SEAT_LAYOUTS_KEY = 'hn_seat_layouts_v2';
const HN_VEHICLE_CATEGORIES_KEY = 'hn_vehicle_categories_v1';
const HN_VEHICLE_SEATS_KEY = 'hn_vehicle_seats_v1';
// Bản tuyển dụng CRUD qua window.FleetStore (SEED_RECRUITMENT/getRecruitmentPosts trong fleet-store.js)
// — shape khác hẳn (quantity/location/salary/status...) và HIỆN KHÔNG có admin view/trang khách hàng nào
// gọi tới (admin-recruitment.js + trang customer/tuyen-dung.html dùng HN_RECRUITMENT_POSTS_KEY bên dưới).
// Cố tình để KHÁC giá trị với HN_RECRUITMENT_POSTS_KEY — 2 key này từng trùng giá trị
// ('hn_recruitment_posts_v1') do merge, khiến FleetStore.seedAll() tự ghi đè dữ liệu mẫu sai shape vào
// đúng key mà trang khách hàng đọc, làm trang Tuyển dụng trống trơn. Đừng gộp lại 2 key này khi chưa
// thống nhất dùng chung 1 shape dữ liệu.
const HN_RECRUITMENT_KEY = 'hn_recruitment_jobs_v1';

// ===== Thông báo tuyển dụng — Admin > Nhân sự > "Thông báo tuyển dụng" CRUD, trang khách hàng
// (customer/tuyen-dung.html) chỉ đọc để hiển thị theo khối (Văn phòng/Lái xe tuyến). Đọc/ghi qua
// getRecruitmentPosts()/saveRecruitmentPosts() (js/shared/recruitment-data.js — nạp SAU file này). =====
const HN_RECRUITMENT_POSTS_KEY = 'hn_recruitment_posts_v1';

// ===== Store Kế toán & Tài chính =====
const HN_ACCOUNTING_VOUCHERS_KEY = 'hn_accounting_vouchers_v1';
const HN_ACCOUNTING_FUEL_LOGS_KEY = 'hn_accounting_fuel_logs_v1';
const HN_ACCOUNTING_FIXED_ASSETS_KEY = 'hn_accounting_fixed_assets_v1';
const HN_ACCOUNTING_DEBTS_KEY = 'hn_accounting_debts_v1';
const HN_ACCOUNTING_PAYROLL_KEY = 'hn_accounting_payroll_v1';
const HN_ACCOUNTING_INSPECTION_KEY = 'hn_accounting_inspection_v1';
const HN_ACCOUNTING_EXPENSE_REQUESTS_KEY = 'hn_accounting_expense_requests_v1';
const HN_ACCOUNTING_CHI_CATEGORIES_KEY = 'hn_accounting_chi_categories_v1';
const HN_ACCOUNTING_CHI_GROUPS_KEY = 'hn_accounting_chi_groups_v1';
const HN_ACCOUNTING_THU_APPROVED_KEY = 'hn_accounting_thu_approved_v1';
