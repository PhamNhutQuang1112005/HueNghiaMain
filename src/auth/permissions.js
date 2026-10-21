/* =========================================================
   AUTH/PERMISSIONS.JS — Toàn bộ luật phân quyền hiện tại.
   =========================================================

   Hệ thống demo hiện CHỈ có 2 gate, trước đây nằm rải:
     - admin.html: chặn vào nếu role !== 'admin' (adminGuard trong admin.js)
     - ticketstaff tab "Trung chuyển": loại có quyền transship_assign → chế độ điều
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

  function hasPermission(key) {
    if (role() === 'admin') return true;
    var t = window.FleetStore && FleetStore.getStaffRoles().find(function (r) { return r.key === role(); });
    return !!t && (t.permissions || []).indexOf(key) !== -1;
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
      return hasPermission('transship_assign');   // theo quyền của loại, không so mã loại
    },
    // Tài khoản hiện tại có quyền `key` (khai báo ở PERMISSION_GROUPS) không. Admin gốc luôn có đủ.
    // Quyền gán theo LOẠI nhân viên (role), không gán riêng từng người.
    hasPermission: hasPermission,
    // Có ít nhất 1 trong các quyền `keys` không.
    hasAnyPermission: function (keys) {
      return (keys || []).some(hasPermission);
    }
  };
})();

/* =========================================================
   DANH MỤC QUYỀN THEO CHỨC NĂNG (không theo chức vụ/role) — nguồn DUY NHẤT cho khung
   chọn quyền ở modal "Thêm/Sửa tài khoản" (admin/admin-accounts.js). Mỗi tài khoản lưu
   1 mảng permissions: string[] gồm các "key" dưới đây (rỗng = chưa được gán quyền nào).
   Đã thực thi bằng Auth.hasPermission(key) cho: manage_regions / manage_stations /
   manage_stop_stations (trang Admin > Trạm xe) và manage_directions / manage_routes (Admin > Tuyến xe). Các quyền còn lại mới chỉ khai báo + gán.
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
      { key: 'delete_trip', label: 'Xóa phơi' }
    ]
  },
  {
    key: 'catalog_admin',
    label: 'Quản lý danh mục (Admin)',
    items: [
      { key: 'manage_regions', label: 'Quản lý tỉnh' },
      { key: 'manage_stations', label: 'Quản lý trạm' },
      { key: 'manage_stop_stations', label: 'Quản lý điểm dừng' },
      { key: 'manage_directions', label: 'Quản lý hướng (tỉnh đi / tỉnh giữa / tỉnh đến)' },
      { key: 'manage_routes', label: 'Quản lý tuyến (tuyến chính, trạm đi/đến/nhận thêm)' },
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
    key: 'hr_system',
    label: 'Nhân sự & hệ thống',
    items: [
      { key: 'manage_hr', label: 'Quản lý nhân sự (hồ sơ, loại, trạng thái)', protects: true },
      { key: 'manage_accounts', label: 'Quản lý tài khoản (tạo, đặt lại mật khẩu, khóa)', protects: true },
      { key: 'revoke_sessions', label: 'Thu hồi phiên đăng nhập' },
      { key: 'view_staff_stats', label: 'Xem thống kê nhân sự' },
      { key: 'view_activity_logs', label: 'Xem nhật ký hoạt động' },
      { key: 'approve_devices', label: 'Duyệt đăng nhập và chặn thiết bị' },
      { key: 'view_all_stations', label: 'Xem dữ liệu mọi trạm' }
    ]
  }
];

/* Tra nhanh thông tin 1 quyền: { key, label, group, groupLabel, protects } hoặc null. */
window.permInfo = function (key) {
  var gs = window.PERMISSION_GROUPS || [];
  for (var i = 0; i < gs.length; i++) {
    for (var j = 0; j < gs[i].items.length; j++) {
      var it = gs[i].items[j];
      if (it.key === key) return { key: it.key, label: it.label, group: gs[i].key, groupLabel: gs[i].label, protects: !!it.protects };
    }
  }
  return null;
};
