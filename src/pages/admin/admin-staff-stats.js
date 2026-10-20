/* =========================================================
   THỐNG KÊ NHÂN SỰ (Admin) — 2 tab con trong nhóm "Nhân sự" (HR v3.1; đã bỏ các tab kết ca và Ca đang mở, thuộc module kết ca M05):
     1. Tài xế ........... xe tuyến (phơi đã KHỞI HÀNH THẬT) + lượt trung chuyển. Danh sách = người có chuyến trong khoảng lọc HỢP
                           nhân viên đang làm việc có loại crew_role = route_driver hoặc shuttle_driver (người đã đổi loại vẫn hiện nếu có chuyến).
     2. Lơ xe ............ chỉ xe tuyến, nhân viên có loại crew_role = helper.
   Nguồn dữ liệu: manifest hn_ts_manifests_v1 (phơi) và ShuttleDriverService (gán tài xế trung chuyển).
   Khớp tài xế/phụ xe bằng so TÊN (case-insensitive) vì manifest.driver/helper và ShuttleDriverService
   chỉ lưu chuỗi tên/nhãn nhập tay, không lưu id cứng (DB sẽ khớp bằng employees.id).
   ========================================================= */

var STAFF_STATS_TAB = 'driver';
var SS_TRIP_FILTERS = {
  driver: { search: '', dateFrom: '', dateTo: '' },
  helper: { search: '', dateFrom: '', dateTo: '' }
};

function ssMatchName(a, b) {
  a = String(a || '').trim().toLowerCase();
  b = String(b || '').trim().toLowerCase();
  return !!a && !!b && a === b;
}
function ssCardHtml(title, countLabel, tableHtml) {
  return '<div class="sd-blocks"><div class="sd-section-block">' +
    '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
      '<span>' + esc(title) + '</span>' +
      '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + esc(countLabel) + '</span>' +
    '</div>' +
    '<div class="sd-table-wrap">' + tableHtml + '</div>' +
  '</div></div>';
}

/* =====================================================================
   1 & 2. CHUYẾN TÀI XẾ / CHUYẾN PHỤ XE
   ===================================================================== */
function ssManifestList() {
  var mf = lsRead(TS_MANIFESTS_KEY, {});
  return Object.keys(mf).map(function (tripId) { var m = mf[tripId] || {}; m._tripId = tripId; return m; });
}
function ssCountLineTrips(field, staffName, dateFrom, dateTo) {
  var count = 0;
  ssManifestList().forEach(function (m) {
    if (!ssMatchName(m[field], staffName)) return;
    var d = m.date || '';
    if (dateFrom && d < dateFrom) return;
    if (dateTo && d > dateTo) return;
    count++;
  });
  return count;
}
function ssCountShuttleLegs(staffName) {
  var map = (window.ShuttleDriverService && ShuttleDriverService.getMap()) || {};
  var count = 0;
  Object.keys(map).forEach(function (k) {
    if (map[k] && ssMatchName(map[k].driverName, staffName)) count++;
  });
  return count;
}

function ssTripFilterInput(tab, field, val) {
  if (!SS_TRIP_FILTERS[tab] || !(field in SS_TRIP_FILTERS[tab])) return;
  SS_TRIP_FILTERS[tab][field] = val || '';
  adminKeepFocus(renderStaffStatsView);
}
function ssResetTripFilters(tab) {
  if (!SS_TRIP_FILTERS[tab]) return;
  SS_TRIP_FILTERS[tab] = { search: '', dateFrom: '', dateTo: '' };
  renderStaffStatsView();
}

function ssTripFilterToolbarHtml(tab, f, searchPlaceholder) {
  return '<div class="sd-toolbar" style="margin-bottom:16px;">' +
      '<div class="filter-field sd-field-search"><label>Tìm kiếm</label><input type="text" value="' + esc(f.search) + '" placeholder="' + esc(searchPlaceholder) + '" data-input-action="ssTripFilterInput" data-args=\'["' + tab + '","search","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(f.dateFrom) + '" style="background:var(--white); min-width:190px;" data-change-action="ssTripFilterInput" data-args=\'["' + tab + '","dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(f.dateTo) + '" style="background:var(--white); min-width:190px;" data-change-action="ssTripFilterInput" data-args=\'["' + tab + '","dateTo","__this_value__"]\'></div>' +
      '<div class="sd-toolbar-actions"><button type="button" class="btn sd-btn" data-action="ssResetTripFilters" data-args=\'["' + tab + '"]\'>Đặt lại</button></div>' +
    '</div>';
}

function ssRenderDriverTripsTab() {
  var f = SS_TRIP_FILTERS.driver;
  var kw = f.search.toLowerCase();

  var byDate = !!(f.dateFrom || f.dateTo);   // dữ liệu gán trung chuyển của demo chưa có ngày nên không lọc ngày được
  var rows = FleetStore.getStaff()
    .filter(function (s) { return !kw || ((s.code || '') + ' ' + (s.name || '') + ' ' + (s.phone || '')).toLowerCase().indexOf(kw) !== -1; })
    .map(function (s) {
      var lineTrips = ssCountLineTrips('driver', s.name, f.dateFrom, f.dateTo);
      var shuttleLegs = byDate ? 0 : ssCountShuttleLegs(s.name);
      return { staff: s, lineTrips: lineTrips, shuttleLegs: shuttleLegs, total: lineTrips + shuttleLegs };
    })
    // Đang làm việc có vai trò tài xế (crew_role), HOẶC có chuyến trong khoảng lọc (kể cả đã đổi loại hoặc nghỉ việc).
    .filter(function (r) { var k = hrCrewRole(r.staff.role); return r.total > 0 || ((k === 'route_driver' || k === 'shuttle_driver') && hrStaffStatus(r.staff) === 'working'); })
    .sort(function (a, b) { return b.total - a.total; });

  var rowsHtml = rows.map(function (r, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="font-weight:700;">' + esc(r.staff.code || '—') + '</td>' +
      '<td style="font-weight:700;">' + esc(r.staff.name || '—') + '</td>' +
      '<td class="mono">' + esc(r.staff.phone || '—') + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + r.lineTrips + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + (byDate ? '—' : r.shuttleLegs) + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800; color:var(--red);">' + r.total + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Mã NV</th><th>Tên tài xế</th><th>SĐT</th><th>Số chuyến tuyến</th><th>Số lượt trung chuyển</th><th>Tổng cộng</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có tài xế nào.</p></div>');

  return ssTripFilterToolbarHtml('driver', f, 'Mã NV, tên, SĐT...') +
    (byDate ? '<div class="hint-inline" style="margin:-6px 0 10px;">Đang lọc theo ngày: lượt trung chuyển chưa có dữ liệu ngày nên không tính vào cột Số lượt trung chuyển và Tổng cộng.</div>' : '') +
    ssCardHtml('Thống kê chuyến của tài xế', rows.length + ' tài xế', table);
}

function ssRenderHelperTripsTab() {
  var f = SS_TRIP_FILTERS.helper;
  var kw = f.search.toLowerCase();

  var rows = FleetStore.getStaff()
    .filter(function (s) { return !kw || ((s.code || '') + ' ' + (s.name || '') + ' ' + (s.phone || '')).toLowerCase().indexOf(kw) !== -1; })
    .map(function (s) { return { staff: s, lineTrips: ssCountLineTrips('helper', s.name, f.dateFrom, f.dateTo) }; })
    .filter(function (r) { return r.lineTrips > 0 || (hrCrewRole(r.staff.role) === 'helper' && hrStaffStatus(r.staff) === 'working'); })
    .sort(function (a, b) { return b.lineTrips - a.lineTrips; });

  var rowsHtml = rows.map(function (r, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="font-weight:700;">' + esc(r.staff.code || '—') + '</td>' +
      '<td style="font-weight:700;">' + esc(r.staff.name || '—') + '</td>' +
      '<td class="mono">' + esc(r.staff.phone || '—') + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800; color:var(--red);">' + r.lineTrips + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Mã NV</th><th>Tên phụ xe</th><th>SĐT</th><th>Số chuyến tuyến</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có phụ xe nào.</p></div>');

  return ssTripFilterToolbarHtml('helper', f, 'Mã NV, tên, SĐT...') +
    ssCardHtml('Thống kê chuyến của phụ xe', rows.length + ' phụ xe', table);
}

/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */
function renderStaffStatsView() {
  var tab = STAFF_STATS_TAB;
  var tabBtn = function (key, label) {
    return '<button type="button" class="station-subtab' + (tab === key ? ' active' : '') + '" data-action="setStaffStatsTab" data-args=\'["' + key + '"]\'>' + esc(label) + '</button>';
  };
  var body = tab === 'helper' ? ssRenderHelperTripsTab() : ssRenderDriverTripsTab();

  $('viewStaffStats').innerHTML =
    '<div class="station-subtabs">' +
      tabBtn('driver', 'Tài xế') +
      tabBtn('helper', 'Lơ xe') +
    '</div>' +
    body;
}

function setStaffStatsTab(tab) { STAFF_STATS_TAB = tab; renderStaffStatsView(); }
