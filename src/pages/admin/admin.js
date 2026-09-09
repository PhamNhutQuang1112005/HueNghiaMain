/* =========================================================
   ADMIN.JS — Trang Admin "Quản lý nhà xe"
   Nhà xe Huệ Nghĩa Express
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
var TRIP_STATUSES = ['Chưa chỉ định xe', 'Đã chỉ định xe', 'Đang bán', 'Đã khởi hành', 'Đã hủy'];
var STATUS_CLASS = {
  'Chưa chỉ định xe': 'chua-chi-dinh',
  'Đã chỉ định xe': 'da-chi-dinh',
  'Đang bán': 'dang-ban',
  'Đã khởi hành': 'da-khoi-hanh',
  'Đã hủy': 'da-huy'
};

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function $(id) { return document.getElementById(id); }
function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s); }
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
  viewStops: function () { renderStopsView(); },
  viewDirections: function () { renderDirectionsView(); },
  viewTrips: function () { renderTripsView(); },
  viewPricing: function () { renderPricingView(); },
  viewSchedule: function () { renderScheduleView(); },
  viewTransship: function () { renderTransshipView(); },
  viewTicketList: function () { renderTicketListView(); },
  viewSeatLayouts: function () { renderSeatLayoutsView(); },
  viewVehicleSeats: function () { renderVehicleSeatsView(); },
  viewVehicleCategories: function () { renderVehicleCategoriesView(); },
  viewVehicles: function () { renderVehiclesView(); },
  viewStaff: function () { renderStaffView(); },
  viewAccounts: function () { renderAccountsView(); },
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
  VIEW_RENDERERS[view]();
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

/* Admin sửa dữ liệu ở tab khác → render lại view đang mở. */
window.addEventListener('storage', function (e) {
  if (!e.key) return;
  var watched = [HN_DIRECTIONS_KEY, HN_ROUTES_KEY, HN_STATIONS_KEY, HN_VEHICLE_TYPES_KEY, HN_VEHICLES_KEY, HN_STAFF_KEY, HN_TRIPS_KEY, HN_ADMIN_ACTIVITY_KEY, HN_STORAGE_KEY, HN_PICKUP_PAX_KEY, HN_SHUTTLE_DRIVER_KEY, HN_SEAT_LAYOUTS_KEY, HN_VEHICLE_CATEGORIES_KEY];
  if (watched.indexOf(e.key) !== -1 && VIEW_RENDERERS[CURRENT_VIEW]) VIEW_RENDERERS[CURRENT_VIEW]();
});



