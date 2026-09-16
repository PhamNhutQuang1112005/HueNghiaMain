/* =========================================================
   ADMIN.JS — Trang Admin "Quản lý nhà xe"
   Nhà Xe Huệ Nghĩa
   =========================================================

   Trung tâm quản trị: Hướng → Tuyến → Chuyến, Xe, Nhân viên. KHÔNG có DB/API
   riêng — dùng CHUNG localStorage với ticketstaff.html:
     - Hướng/Tuyến/Loại xe/Xe/Nhân viên  → window.FleetStore (js/shared/fleet-store.js)
     - Chuyến (phơi)                      → HN_TRIPS_KEY 'hn_trips_meta_v9'  (+ seat bank HN_STORAGE_KEY)
     - Phơi tài chính bất biến            → 'hn_ts_manifests_v1'  → CHỈ ĐỌC, không CRUD
   "Quản lý chuyến" bê nguyên pattern tab "Quản lý phơi" của ticketstaff
   (applyFilters / renderTable / saveSingleTrip trong js/ticketstaff.js).

   Nạp SAU storage-keys/format/constants/seat-bank/fleet-store, TRƯỚC events.js.
   ========================================================= */

/* ---------------------------------------------------------
   GUARD — trang duy nhất có kiểm tra vai trò. Các trang khác (ticketstaff/
   shuttle) cố tình KHÔNG chặn, giữ nguyên hiện trạng hệ thống demo.
   --------------------------------------------------------- */
(function adminGuard() {
  if (!Auth.isAdmin()) {
    location.replace('index.html');
  }
})();

var TS_MANIFESTS_KEY = 'hn_ts_manifests_v1'; // khai báo trong ticketstaff-manifest-core.js (không nạp ở đây)
var TRIP_STATUSES = ['Chưa chỉ định', 'Đang bán', 'Khởi hành', 'Đã hủy'];
var STATUS_CLASS = {
  'Chưa chỉ định': 'chua-chi-dinh',
  'Đang bán': 'dang-ban',
  'Khởi hành': 'da-khoi-hanh',
  'Đã hủy': 'da-huy'
};

// Trang đích khi đăng nhập — dùng chung cho ô "Trang đích đăng nhập" ở Cấu hình nhân sự
// (admin-staff-config.js, FleetStore.addStaffRole/updateStaffRole) VÀ modal Tài khoản
// (admin-accounts.js, acAllRoles()) để 2 nơi luôn liệt kê đúng cùng 1 bộ trang, không lệch nhau.
var ADMIN_REDIRECT_PAGES = [
  ['ticketstaff.html', 'ticketstaff.html — Bán vé / Phòng vé / Trung chuyển'],
  ['dieuhanh.html', 'dieuhanh.html — Điều hành bến xe'],
  ['ketoan.html', 'ketoan.html — Kế toán / Thu ngân'],
  ['taixe.html', 'taixe.html — Tài xế']
];
function adminRedirectPageOptionsHtml(selected) {
  return ADMIN_REDIRECT_PAGES.map(function (p) {
    return '<option value="' + p[0] + '"' + (selected === p[0] ? ' selected' : '') + '>' + esc(p[1]) + '</option>';
  }).join('');
}

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function $(id) { return document.getElementById(id); }
function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s); }

/* Chạy hàm render (thường dựng lại innerHTML nguyên view) mà KHÔNG mất focus/vị trí con trỏ ở ô đang gõ.
   Các ô "Tìm kiếm" gõ-đến-đâu-lọc-đến-đó gọi lại full render mỗi phím → phần tử <input> bị thay mới, mất
   focus, chỉ gõ được 1 ký tự. Bọc render trong hàm này: nhớ id + selection của ô đang focus, render xong
   trả lại focus + đặt con trỏ đúng chỗ. Ô tìm kiếm phải có id ổn định (giữ nguyên qua các lần render). */
function adminKeepFocus(renderFn) {
  var a = document.activeElement;
  var id = a && a.id, ss = null, se = null;
  try { ss = a.selectionStart; se = a.selectionEnd; } catch (e) { /* input không hỗ trợ selection */ }
  renderFn();
  if (!id) return;
  var el = document.getElementById(id);
  if (!el) return;
  el.focus();
  if (ss != null) { try { el.setSelectionRange(ss, se); } catch (e) { /* ignore */ } }
}
function fmtMoney(n) { return (Number(n) || 0).toLocaleString('vi-VN') + 'đ'; }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) {
  if (!iso || typeof iso !== 'string') return '—';
  var p = iso.split('-');
  return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}
function fmtStamp(ts) {
  var d = new Date(ts);
  if (isNaN(d)) return '—';
  var pad = function (x) { return String(x).padStart(2, '0'); };
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

var _toastTimer = null;
function showToast(msg) {
  var t = $('toast');
  $('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2800);
}

function openAdminModal(html, wide, fill) {
  var box = $('adminModalBox');
  box.innerHTML = html;
  box.classList.toggle('modal-wide', !!wide);
  box.classList.toggle('modal-fill', !!fill);
  $('adminModal').classList.add('open');
}
function closeAdminModal() { $('adminModal').classList.remove('open'); }
function closeModal(id) { var m = $(id); if (m) m.classList.remove('open'); } // cho data-action="closeModal"

/* localStorage đọc/ghi cho khoá KHÔNG thuộc FleetStore */
function lsRead(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    var v = JSON.parse(raw);
    return v == null ? fallback : v;
  } catch (e) { return fallback; }
}
function lsWrite(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function getTrips() { return TripService.getAll(); }
function setTrips(list) { TripService.save(list); }
function getManifests() { return lsRead(TS_MANIFESTS_KEY, {}); }

/* ---------------------------------------------------------
   USER MENU  (port initUserMenu() từ ticketstaff.js — cùng id DOM)
   --------------------------------------------------------- */
function initAdminUserMenu() {
  var u = Session.get();
  var name = (u && u.username) || 'Quản trị viên';
  $('userName').textContent = name;
  $('userUsername').textContent = (u && u.username) || '—';
  $('userRoleLabel').textContent = (u && u.roleLabel) || 'Quản trị viên hệ thống';
  $('userAvatar').textContent = (name[0] || 'A').toUpperCase();
}
function toggleAdminUserMenu() { $('userMenu').classList.toggle('open'); }
function adminLogout() {
  Session.clear();
  window.location.href = 'index.html';
}

// Nhóm "Vận hành vé" (Đặt vé/Bán vé/Đón khách) không phải view dựng trong admin.html — đây là các
// tính năng thật của trang ticketstaff.html (nhân viên phòng vé). Bấm vào là điều hướng thẳng sang đó,
// mở đúng tab tương ứng (đọc query string ?view=... — xem ticketstaff.js). Session admin hiện tại giữ
// nguyên khi sang trang, và role 'admin' đã được Auth.isShuttleDispatch() (auth/permissions.js) coi là
// đủ quyền điều hành trung chuyển nên tab "Trung chuyển" mở ở chế độ đầy đủ, không bị giới hạn như
// role bán vé thường.
function adminGoToTicketStaff(view) {
  window.location.href = 'ticketstaff.html?view=' + encodeURIComponent(view || 'booking');
}
document.addEventListener('click', function (e) {
  var m = $('userMenu');
  if (m && m.classList.contains('open') && !m.contains(e.target)) m.classList.remove('open');
});

/* ---------------------------------------------------------
   VIEW ROUTING
   --------------------------------------------------------- */
var CURRENT_VIEW = 'viewDashboard';
// Bọc mỗi renderer trong closure GỌI-KHI-CẦN thay vì tham chiếu thẳng: các hàm render*
// nằm ở các mảnh admin-*.js nạp SAU file này, nên tham chiếu trực tiếp lúc dựng object
// (top-level của mảnh này) sẽ ReferenceError. Các hàm render* đều không nhận tham số nên
// wrapper không cần forward gì — hành vi y hệt bảng tham chiếu trực tiếp cũ.
var VIEW_RENDERERS = {
  viewDashboard: function () { renderDashboard(); },
  viewStations: function () { renderStationsView(); },
  viewSubStations: function () { renderSubStationsView(); },
  viewStops: function () { renderStopsView(); },
  viewDirections: function () { renderDirectionsView(); },
  viewTrips: function () { renderTripsView(); },
  viewPricing: function () { renderPricingView(); },
  viewTransship: function () { renderTransshipView(); },
  viewTicketList: function () { renderTicketListView(); },
  viewTicketOffice: function () { renderTicketOfficeView(); },
  viewCustomers: function () { renderCustomersView(); },
  viewSeatLayouts: function () { renderSeatLayoutsView(); },
  viewVehicleSeats: function () { renderVehicleSeatsView(); },
  viewVehicleCategories: function () { renderVehicleCategoriesView(); },
  viewVehicles: function () { renderVehiclesView(); },
  viewAccountingReports: function () { renderAccountingReportsView(); },
  viewAccountingThu: function () { renderAccountingThuView(); },
  viewAccountingChi: function () { renderAccountingChiView(); },
  viewAccountingExpenseRequests: function () { renderAccountingExpenseRequestsView(); },
  viewAccountingLedgers: function () { renderAccountingLedgersView(); },
  viewStaffConfig: function () { renderStaffConfigView(); },
  viewStaff: function () { renderStaffView(); },
  viewAccounts: function () { renderAccountsView(); },
  viewStaffStats: function () { renderStaffStatsView(); },
  viewRecruitment: function () { renderRecruitmentView(); },
  viewActivity: function () { renderActivityView(); },
  viewSettings: function () { renderSettingsView(); }
};

function switchAdminView(view) {
  if (!VIEW_RENDERERS[view]) return;
  CURRENT_VIEW = view;
  document.querySelectorAll('.admin-view').forEach(function (s) { s.hidden = s.id !== view; });
  document.querySelectorAll('.admin-nav-item').forEach(function (b) {
    var a = b.getAttribute('data-args') || '';
    b.classList.toggle('active', a.indexOf('"' + view + '"') !== -1);
  });
  adminRenderBreadcrumb(view);
  adminUpdateNotifBadge();
  VIEW_RENDERERS[view]();
}

/* ---------------------------------------------------------
   BREADCRUMB (topbar) — "Quản trị hệ thống > <tên nhóm> > <tên trang>". Nhãn lấy tay theo đúng chữ
   trên nút sidebar (admin.html) — không đọc lại DOM vì nhóm cha không map 1-1 rõ ràng qua data-args.
   --------------------------------------------------------- */
var ADMIN_BREADCRUMB_MAP = {
  viewDashboard: { group: null, label: 'Dashboard' },
  viewStations: { group: 'Quản lý vận tải', label: 'Trạm xe' },
  viewDirections: { group: 'Quản lý vận tải', label: 'Tuyến xe' },
  viewTrips: { group: 'Quản lý vận tải', label: 'Phơi xe' },
  viewPricing: { group: 'Quản lý vận tải', label: 'Quản lý giá' },
  viewTransship: { group: 'Quản lý vận tải', label: 'Trung chuyển' },
  viewTicketList: { group: 'Quản lý vận tải', label: 'Tổng đài' },
  viewTicketOffice: { group: 'Quản lý vận tải', label: 'Phòng vé' },
  viewCustomers: { group: 'Quản lý vận tải', label: 'Khách hàng' },
  viewVehicles: { group: 'Thiết lập vận tải', label: 'Quản lý xe' },
  viewVehicleCategories: { group: 'Thiết lập vận tải', label: 'Loại xe' },
  viewSeatLayouts: { group: 'Thiết lập vận tải', label: 'Sơ đồ ghế' },
  viewVehicleSeats: { group: 'Thiết lập vận tải', label: 'Ghế xe' },
  viewStaffConfig: { group: 'Nhân sự', label: 'Cấu hình nhân sự' },
  viewStaff: { group: 'Nhân sự', label: 'Quản lý nhân viên' },
  viewAccounts: { group: 'Nhân sự', label: 'Tài khoản' },
  viewStaffStats: { group: 'Nhân sự', label: 'Thống kê nhân sự' },
  viewRecruitment: { group: 'Nhân sự', label: 'Thông báo tuyển dụng' },
  viewAccountingReports: { group: 'Kế toán & Tài chính', label: 'Tổng quan & Báo cáo' },
  viewAccountingThu: { group: 'Kế toán & Tài chính', label: 'Doanh thu (THU)' },
  viewAccountingChi: { group: 'Kế toán & Tài chính', label: 'Chi phí (CHI)' },
  viewAccountingExpenseRequests: { group: 'Kế toán & Tài chính', label: 'Tạo yêu cầu chi' },
  viewAccountingLedgers: { group: 'Kế toán & Tài chính', label: 'Sổ & Bảng nghiệp vụ' },
  viewActivity: { group: 'Hệ thống', label: 'Nhật ký hoạt động' },
  viewSettings: { group: 'Hệ thống', label: 'Cài đặt' }
};
function adminRenderBreadcrumb(view) {
  var el = $('adminBreadcrumb');
  if (!el) return;
  var meta = ADMIN_BREADCRUMB_MAP[view] || { group: null, label: view };
  var segs = ['Quản trị hệ thống'];
  if (meta.group) segs.push(meta.group);
  segs.push(meta.label);
  var sep = '<svg class="bc-sep" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>';
  el.innerHTML = '<svg class="bc-home-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>' +
    segs.map(function (s, i) {
      var isLast = i === segs.length - 1;
      return (i > 0 ? sep : '') + '<span class="bc-seg' + (isLast ? ' bc-current' : '') + '">' + esc(s) + '</span>';
    }).join('');
}

/* ---------------------------------------------------------
   CHUÔNG THÔNG BÁO (topbar) — badge = số phơi "chưa gán biển số" (cần xử lý), tính trực tiếp từ
   TripService qua getTrips(); KHÔNG phải hệ thống thông báo thời gian thực (không có backend đẩy tin).
   --------------------------------------------------------- */
function adminNotifCount() {
  var trips = (typeof getTrips === 'function') ? getTrips() : [];
  return trips.filter(function (t) { return t && !t.plate && t.status !== 'Đã hủy' && !t.isTemplate; }).length;
}
function adminUpdateNotifBadge() {
  var badge = $('adminNotifBadge');
  if (!badge) return;
  var n = adminNotifCount();
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.hidden = n === 0;
}
function adminOpenNotifPanel() {
  showToast(adminNotifCount() > 0 ? 'Có ' + adminNotifCount() + ' phơi xe chưa gán biển số — chuyển tới trang Phơi xe.' : 'Không có phơi nào cần chú ý.');
  switchAdminView('viewTrips');
}

/* ---------------------------------------------------------
   NHÓM SIDEBAR THU GỌN ĐƯỢC (VD "Quản lý vận tải") — bấm tiêu đề nhóm để sổ/thu các nút con, nhớ trạng
   thái đóng/mở qua localStorage để giữ nguyên khi tải lại trang.
   --------------------------------------------------------- */
var ADMIN_NAV_GROUP_KEY = 'hn_admin_navgroup_collapsed_v1';
function adminToggleNavGroup(wrapId) {
  var wrap = $(wrapId);
  var btn = Array.prototype.filter.call(document.querySelectorAll('.admin-nav-group-toggle'), function (b) {
    return (b.getAttribute('data-args') || '').indexOf('"' + wrapId + '"') !== -1;
  })[0];
  if (!wrap || !btn) return;
  var collapsed = !wrap.classList.contains('collapsed');
  wrap.classList.toggle('collapsed', collapsed);
  btn.classList.toggle('collapsed', collapsed);
  var state = lsRead(ADMIN_NAV_GROUP_KEY, {});
  state[wrapId] = collapsed;
  lsWrite(ADMIN_NAV_GROUP_KEY, state);
}
function initAdminNavGroups() {
  var state = lsRead(ADMIN_NAV_GROUP_KEY, {});
  document.querySelectorAll('.admin-nav-group-toggle').forEach(function (btn) {
    var m = (btn.getAttribute('data-args') || '').match(/"([^"]+)"/);
    var wrapId = m && m[1];
    var wrap = wrapId && $(wrapId);
    if (!wrap) return;
    var collapsed = !!state[wrapId];
    wrap.classList.toggle('collapsed', collapsed);
    btn.classList.toggle('collapsed', collapsed);
  });
}

/* ---------------------------------------------------------
   THU GỌN TOÀN BỘ SIDEBAR THÀNH DẠNG ICON — khác với accordion nhóm ở trên (ẩn/hiện từng nhóm con,
   vẫn giữ full chữ); cái này thu hẹp --admin-sidebar-w về 1 cột icon, ẩn mọi nhãn chữ (kể cả logo
   trong .sidebar-brand). Nhớ trạng thái qua localStorage như nhóm accordion ở trên. Trạng thái đóng/mở
   riêng từng nhóm (adminToggleNavGroup) vẫn hoạt động bình thường kể cả khi đang thu gọn. */
var ADMIN_SIDEBAR_COLLAPSE_KEY = 'hn_admin_sidebar_collapsed_v1';
function adminToggleSidebarCollapse() {
  var collapsed = !document.body.classList.contains('admin-sidebar-collapsed');
  document.body.classList.toggle('admin-sidebar-collapsed', collapsed);
  lsWrite(ADMIN_SIDEBAR_COLLAPSE_KEY, collapsed);
}
function initAdminSidebarCollapse() {
  document.body.classList.toggle('admin-sidebar-collapsed', !!lsRead(ADMIN_SIDEBAR_COLLAPSE_KEY, false));
}
/* Gắn title = đúng nhãn chữ của nút cho MỌI nút nav (kể cả khi sidebar đang mở) — để khi thu gọn còn
   icon, hover vẫn thấy tên qua tooltip trình duyệt mà không cần sửa tay từng nút trong admin.html. */
function initAdminSidebarTooltips() {
  document.querySelectorAll('.admin-nav-item, .admin-nav-group-toggle').forEach(function (btn) {
    if (!btn.title) btn.title = btn.textContent.trim();
  });
}

/* Admin sửa dữ liệu ở tab khác → render lại view đang mở. */
window.addEventListener('storage', function (e) {
  if (!e.key) return;
  var watched = [HN_DIRECTIONS_KEY, HN_ROUTES_KEY, HN_STATIONS_KEY, HN_MAIN_STATIONS_KEY, HN_SUB_STATIONS_KEY, HN_VEHICLE_TYPES_KEY, HN_VEHICLES_KEY, HN_STAFF_KEY, HN_STAFF_ROLES_KEY, HN_TRIPS_KEY, HN_ADMIN_ACTIVITY_KEY, HN_STORAGE_KEY, HN_PICKUP_PAX_KEY, HN_SHUTTLE_DRIVER_KEY, HN_SEAT_LAYOUTS_KEY, HN_VEHICLE_CATEGORIES_KEY, HN_ACCOUNTING_VOUCHERS_KEY, HN_ACCOUNTING_FUEL_LOGS_KEY, HN_ACCOUNTING_FIXED_ASSETS_KEY, HN_ACCOUNTING_DEBTS_KEY, HN_ACCOUNTING_PAYROLL_KEY, HN_ACCOUNTING_INSPECTION_KEY];
  if (watched.indexOf(e.key) !== -1 && VIEW_RENDERERS[CURRENT_VIEW]) VIEW_RENDERERS[CURRENT_VIEW]();
  if (e.key === HN_TRIPS_KEY) adminUpdateNotifBadge();
});



