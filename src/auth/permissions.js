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

  // Loại nhân viên `key` thuộc nhóm HR (có quyền protects_holder: manage_hr / manage_accounts) không.
  // Đọc thẳng localStorage để dùng được cả ở trang đăng nhập (không nạp fleet-store.js).
  function isHrRoleKey(key) {
    try {
      var list = JSON.parse(localStorage.getItem(HN_STAFF_ROLES_KEY) || 'null');
      var t = Array.isArray(list) ? list.find(function (r) { return r && r.key === key; }) : null;
      return !!(t && (t.permissions || []).some(function (p) { var i = window.permInfo(p); return i && i.protects; }));
    } catch (e) { return false; }
  }

  window.Auth = {
    // Được vào trang Admin.
    isAdmin: function () {
      return role() === 'admin';
    },
    // Tài khoản nhân sự (HR) do admin gốc tạo — vào trang Admin với quyền giới hạn theo loại nhân viên.
    canEnterAdmin: function () {
      return role() === 'admin' || isHrRoleKey(role());
    },
    isHrRoleKey: isHrRoleKey,
    // Ở chế độ ĐIỀU HÀNH trung chuyển (thay vì phòng vé) tại tab "Trung chuyển" — admin luôn có đủ
    // quyền cao nhất nên cũng được tính là chế độ điều hành (vd bấm "Đón khách" từ sidebar Admin).
    isShuttleDispatch: function () {
      return role() === 'shuttle_dispatch' || role() === 'admin';
    }
  };
})();

/* =========================================================
   DANH MỤC QUYỀN THEO CHỨC NĂNG (không theo chức vụ/role) — nguồn DUY NHẤT cho khung
   chọn quyền ở modal "Thêm/Sửa tài khoản" (admin/admin-accounts.js). Mỗi tài khoản lưu
   1 mảng permissions: string[] gồm các "key" dưới đây (rỗng = chưa được gán quyền nào).
   Hiện CHƯA có nơi nào đọc mảng này để ẩn/khoá chức năng thật (admin tự xem bằng mắt khi
   phân quyền) — đây là bước khai báo + gán quyền; việc thực thi (hasPermission(key)) sẽ
   làm ở giai đoạn sau khi đã rõ cần khoá ở đúng những chỗ nào.
   ========================================================= */
window.PERMISSION_GROUPS = [
  {
    key: 'ticket_seat',
    label: 'Vé & ghế',
    items: [
      { key: 'book_ticket', label: 'Đặt vé' },
      { key: 'sell_ticket', label: 'Bán vé' },
      { key: 'change_price', label: 'Đổi giá' },
      { key: 'assign_depart_reopen', label: 'Chỉ định xe / Khởi hành xe / Reopen' },
      { key: 'transship_pickup', label: 'Trung chuyển / rước khách' },
      { key: 'transship_assign', label: 'Trung chuyển - chỉ định xe,...' },
      { key: 'print_transship_ticket', label: 'In vé trung chuyển' }
    ]
  },
  {
    key: 'trip_management',
    label: 'Chuyến / phơi xe',
    items: [
      { key: 'create_trip', label: 'Tạo phơi' },
      { key: 'print_trip', label: 'In phơi' },
      { key: 'edit_trip', label: 'Sửa phơi' },
      { key: 'delete_trip', label: 'Xóa phơi' },
      { key: 'close_shift_reconcile', label: 'Kết ca / đối soát' }
    ]
  },
  {
    key: 'catalog_admin',
    label: 'Quản lý danh mục (Admin)',
    items: [
      { key: 'manage_stations', label: 'Quản lý trạm' },
      { key: 'manage_routes', label: 'Quản lý tuyến (hướng đi/về)' },
      { key: 'manage_prices', label: 'Quản lý giá vé' },
      { key: 'manage_schedule', label: 'Quản lý khung giờ chạy' },
      { key: 'manage_vehicles', label: 'Quản lý xe (biển số, tài xế/phụ xe mặc định)' },
      { key: 'manage_vehicle_types', label: 'Quản lý loại xe' },
      { key: 'manage_seat_layouts', label: 'Quản lý sơ đồ ghế' },
      { key: 'manage_vehicle_seats', label: 'Quản lý ghế xe' }
    ]
  },
  {
    key: 'accounting',
    label: 'Kế toán',
    items: [
      { key: 'view_revenue_overview', label: 'Xem báo cáo tổng quan doanh thu' },
      { key: 'manage_thu_ledger', label: 'Ghi/xem sổ thu' },
      { key: 'manage_chi_ledger', label: 'Ghi/xem sổ chi' },
      { key: 'view_ledgers', label: 'Xem sổ & bảng nghiệp vụ' }
    ]
  },
  {
    key: 'shift',
    label: 'Ca làm việc',
    items: [
      { key: 'manage_shift_call_center', label: 'Mở / kết ca Tổng đài', fn: 'call_center' },
      { key: 'manage_shift_ticket_office', label: 'Mở / kết ca Phòng vé', fn: 'ticket_office' },
      { key: 'manage_shift_cargo_receive', label: 'Mở / kết ca Nhận hàng', fn: 'cargo_receive' },
      { key: 'manage_shift_cargo_delivery', label: 'Mở / kết ca Giao hàng', fn: 'cargo_delivery' },
      { key: 'manage_shift_shuttle_driver', label: 'Kết ca Tài xế trung chuyển', fn: 'shuttle_driver' }
    ]
  },
  {
    key: 'hr_system',
    label: 'Nhân sự & hệ thống',
    items: [
      { key: 'manage_hr', label: 'Quản lý nhân sự (hồ sơ, loại, trạng thái, lịch ca)', protects: true },
      { key: 'manage_accounts', label: 'Quản lý tài khoản (tạo, đặt lại mật khẩu, khóa)', protects: true },
      { key: 'revoke_sessions', label: 'Thu hồi phiên đăng nhập' },
      { key: 'view_staff_stats', label: 'Xem thống kê nhân sự' },
      { key: 'view_activity_logs', label: 'Xem nhật ký hoạt động' },
      { key: 'approve_devices', label: 'Duyệt đăng nhập và chặn thiết bị' },
      { key: 'view_all_stations', label: 'Xem dữ liệu mọi trạm' }
    ]
  }
];

/* Danh mục CHỨC NĂNG (work_functions) — mỗi quyền ca mang 1 function_key; nhân viên "có chức năng" khi loại của
   họ chứa ít nhất 1 quyền mang function_key đó. has_shift = phải mở ca khi thao tác; auto_open = API tự mở ca. */
window.WORK_FUNCTIONS = [
  { key: 'call_center', label: 'Tổng đài', hasShift: true, autoOpen: false },
  { key: 'ticket_office', label: 'Phòng vé', hasShift: true, autoOpen: false },
  { key: 'cargo_receive', label: 'Nhận hàng', hasShift: true, autoOpen: false },
  { key: 'cargo_delivery', label: 'Giao hàng', hasShift: true, autoOpen: false },
  { key: 'shuttle_driver', label: 'Tài xế trung chuyển', hasShift: true, autoOpen: true },
  { key: 'shuttle_dispatch', label: 'Điều hành trung chuyển', hasShift: false, autoOpen: false }
];

/* Tra nhanh thông tin 1 quyền: { key, label, group, groupLabel, fn, protects } hoặc null. */
window.permInfo = function (key) {
  var gs = window.PERMISSION_GROUPS || [];
  for (var i = 0; i < gs.length; i++) {
    for (var j = 0; j < gs[i].items.length; j++) {
      var it = gs[i].items[j];
      if (it.key === key) return { key: it.key, label: it.label, group: gs[i].key, groupLabel: gs[i].label, fn: it.fn || null, protects: !!it.protects };
    }
  }
  return null;
};
/* Nhóm công việc (employee_types.work_kind) là BẢNG RIÊNG work_kinds, cấu hình ở Nhân sự > Cấu hình nhân sự > tab Nhóm công việc
   (FleetStore.getWorkKinds, shared/js/fleet-store.js) — không khai báo cứng ở đây. Trả { key, label, self, license, active, ... } hoặc null. */
window.workKindInfo = function (key) {
  return (window.FleetStore && window.FleetStore.workKind) ? window.FleetStore.workKind(key) : null;
};
window.workFunctionLabel = function (key) {
  var a = window.WORK_FUNCTIONS || [];
  for (var i = 0; i < a.length; i++) if (a[i].key === key) return a[i].label;
  return key || '';
};
