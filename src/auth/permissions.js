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

  window.Auth = {
    // Được vào trang Admin.
    isAdmin: function () {
      return role() === 'admin';
    },
    // Ở chế độ ĐIỀU HÀNH trung chuyển (thay vì phòng vé) tại tab "Trung chuyển".
    isShuttleDispatch: function () {
      return role() === 'shuttle_dispatch';
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
      { key: 'manage_vehicle_seats', label: 'Quản lý ghế xe' },
      { key: 'manage_hr', label: 'Quản nhân sự' }
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
  }
];
