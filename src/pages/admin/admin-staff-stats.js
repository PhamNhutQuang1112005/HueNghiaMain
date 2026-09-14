/* =========================================================
   THỐNG KÊ NHÂN SỰ (Admin) — 3 tab con trong nhóm "Nhân sự":
     1. Chuyến tài xế — số "phơi xe" đã KHỞI HÀNH THẬT (manifest hn_ts_manifests_v1, không phải bank.driver
        vì trường đó chỉ là "đang chỉ định", có thể đổi trước giờ chạy — xem adminTripDisplayStatus bên
        admin-trips.js) + số lượt trung chuyển đã nhận (ShuttleDriverService, khớp theo TÊN vì dữ liệu
        này chỉ lưu tên tài xế dạng chữ, không có staffId).
     2. Chuyến phụ xe — tương tự mục 1 nhưng chỉ tính phơi xe (trung chuyển KHÔNG có khái niệm phụ xe
        trong toàn bộ hệ thống — không có role 'shuttle_helper' nào cả, xem STAFF_ROLES admin-staff.js).
     3. Kết ca — đọc lại đúng 1 nguồn "Kết ca" có sẵn của TicketStaff (hn_ts_shift_closings_v1,
        tsConfirmShiftClosing trong ticketstaff-manifest-core.js), rồi tách hiển thị theo VAI TRÒ TÀI
        KHOẢN của người đã kết ca (tra staffId → Nhân viên → username → Tài khoản → role):
          - 'call_center' (Nhân viên tổng đài)  → chỉ hiện tổng vé/khách đã đặt trong ca.
          - 'ticket_office' (Nhân viên phòng vé, role MỚI thêm theo yêu cầu — trước đây chỉ có
            'call_center' dùng chung cho cả đặt vé lẫn thu tiền) → hiện đủ số liệu tiền: doanh thu,
            tiền ứng tài xế, thu tiền mặt/chuyển khoản, kiểm đếm thực tế, chênh lệch thiếu/đủ.
          - Trung chuyển KHÔNG có sự kiện "kết ca" nào trong hệ thống (không tạo manifest/shift-closing
            nào cả) — mục "Trung chuyển" ở tab này vì vậy chỉ là tổng số lượt đã nhận TỪ TRƯỚC TỚI NAY
            (ShuttleDriverService, cùng logic đếm với tab "Chuyến tài xế"), không phải 1 sự kiện kết ca
            thật và không lọc được theo ngày.

   Khớp tài xế/phụ xe/người kết ca bằng so TÊN (case-insensitive) vì manifest.driver/helper, staffId kết
   ca và ShuttleDriverService chỉ lưu chuỗi tên/nhãn nhập tay, không lưu id cứng — cùng hạn chế như việc
   khớp địa điểm rước khách ở admin-customers.js.
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

  var rows = FleetStore.getStaff()
    .filter(function (s) { return s.role === 'driver' || s.role === 'shuttle_driver'; })
    .filter(function (s) { return !kw || ((s.code || '') + ' ' + (s.name || '') + ' ' + (s.phone || '')).toLowerCase().indexOf(kw) !== -1; })
    .map(function (s) {
      var lineTrips = ssCountLineTrips('driver', s.name, f.dateFrom, f.dateTo);
      var shuttleLegs = ssCountShuttleLegs(s.name);
      return { staff: s, lineTrips: lineTrips, shuttleLegs: shuttleLegs, total: lineTrips + shuttleLegs };
    })
    .sort(function (a, b) { return b.total - a.total; });

  var rowsHtml = rows.map(function (r, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="font-weight:700;">' + esc(r.staff.code || '—') + '</td>' +
      '<td style="font-weight:700;">' + esc(r.staff.name || '—') + '</td>' +
      '<td class="mono">' + esc(r.staff.phone || '—') + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + r.lineTrips + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + r.shuttleLegs + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800; color:var(--red);">' + r.total + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Mã NV</th><th>Tên tài xế</th><th>SĐT</th><th>Số phơi xe đã chạy</th><th>Số lượt trung chuyển đã nhận</th><th>Tổng cộng</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có tài xế nào.</p></div>');

  return ssTripFilterToolbarHtml('driver', f, 'Mã NV, tên, SĐT...') +
    ssCardHtml('Thống kê chuyến của tài xế', rows.length + ' tài xế', table);
}

function ssRenderHelperTripsTab() {
  var f = SS_TRIP_FILTERS.helper;
  var kw = f.search.toLowerCase();

  var rows = FleetStore.getStaff()
    .filter(function (s) { return s.role === 'helper'; })
    .filter(function (s) { return !kw || ((s.code || '') + ' ' + (s.name || '') + ' ' + (s.phone || '')).toLowerCase().indexOf(kw) !== -1; })
    .map(function (s) { return { staff: s, lineTrips: ssCountLineTrips('helper', s.name, f.dateFrom, f.dateTo) }; })
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
    '<thead><tr><th style="width:50px;">STT</th><th>Mã NV</th><th>Tên phụ xe</th><th>SĐT</th><th>Số phơi xe đã chạy</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có phụ xe nào.</p></div>');

  return ssTripFilterToolbarHtml('helper', f, 'Mã NV, tên, SĐT...') +
    ssCardHtml('Thống kê chuyến của phụ xe', rows.length + ' phụ xe', table);
}

/* =====================================================================
   3. KẾT CA — đọc hn_ts_shift_closings_v1 (TicketStaff), tách theo vai trò TÀI KHOẢN của người kết ca.
   ===================================================================== */
var SS_SHIFT_CLOSING_KEY = 'hn_ts_shift_closings_v1';
var SS_KETCA_FILTER = { dateFrom: '', dateTo: '' };

function ssShiftClosingList() {
  var list = lsRead(SS_SHIFT_CLOSING_KEY, []);
  return Array.isArray(list) ? list : [];
}

/* staffId trong bản ghi kết ca là NHÃN hiển thị lúc đó (mã NV nếu tra được, không thì trả nguyên
   username) — xem getCurrentStaffLabel() trong ticketstaff-manifest-core.js. Truy ngược: thử khớp mã
   NV trong Nhân viên trước, lấy username của NV đó rồi tra role trong Tài khoản; nếu không khớp mã NV
   nào thì coi thẳng staffId là username để tra Tài khoản. */
function ssResolveCloserAccount(staffId) {
  var staffRec = FleetStore.getStaff().find(function (s) { return s.code && s.code === staffId; });
  var username = staffRec ? staffRec.username : staffId;
  if (!username) return null;
  var accounts = (typeof getAccountsList === 'function') ? getAccountsList() : [];
  return accounts.find(function (a) { return a.username === username; }) || null;
}

function ssKetcaFilterInput(field, val) {
  if (!(field in SS_KETCA_FILTER)) return;
  SS_KETCA_FILTER[field] = val || '';
  adminKeepFocus(renderStaffStatsView);
}
function ssResetKetcaFilter() { SS_KETCA_FILTER = { dateFrom: '', dateTo: '' }; renderStaffStatsView(); }

function ssRenderKetcaTab() {
  var f = SS_KETCA_FILTER;
  var all = ssShiftClosingList().filter(function (r) {
    if (!r) return false;
    var d = toLocalDateStr(r.time);
    if (f.dateFrom && d < f.dateFrom) return false;
    if (f.dateTo && d > f.dateTo) return false;
    return true;
  }).sort(function (a, b) { return String(b.time || '').localeCompare(String(a.time || '')); });

  var tongDaiRows = [], phongVeRows = [];
  all.forEach(function (r) {
    var acc = ssResolveCloserAccount(r.staffId);
    var role = acc ? acc.role : '';
    var row = { record: r, closerName: (acc && (acc.fullName || acc.username)) || r.staffId };
    if (role === 'ticket_office') phongVeRows.push(row);
    else tongDaiRows.push(row); // mặc định (call_center hoặc chưa xác định được role) → xem như tổng đài
  });

  var tongDaiHtml = tongDaiRows.map(function (x, idx) {
    var r = x.record;
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td style="font-weight:700;">' + esc(x.closerName) + '</td>' +
      '<td class="mono" style="color:var(--text-sub);">' + esc(fmtStamp(r.time)) + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + (r.tripCount || 0) + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800; color:var(--red);">' + (r.ticketCount || 0) + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + (r.passengerCount || 0) + '</td>' +
    '</tr>';
  }).join('');
  var tongDaiTable = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Nhân viên</th><th>Thời gian kết ca</th><th>Số phơi</th><th>Tổng vé đã đặt/bán</th><th>Tổng khách</th></tr></thead>' +
    '<tbody>' + tongDaiHtml + '</tbody></table>' +
    (tongDaiHtml ? '' : '<div class="grid-empty"><p>Chưa có lượt kết ca nào của nhân viên tổng đài.</p></div>');

  var phongVeHtml = phongVeRows.map(function (x, idx) {
    var r = x.record;
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td style="font-weight:700;">' + esc(x.closerName) + '</td>' +
      '<td class="mono" style="color:var(--text-sub);">' + esc(fmtStamp(r.time)) + '</td>' +
      '<td style="text-align:right;">' + fmtMoney(r.totalAmount) + '</td>' +
      '<td style="text-align:right;">' + fmtMoney(r.advanceAmount) + '</td>' +
      '<td style="text-align:right;">' + fmtMoney(r.cashAmount) + ' / ' + fmtMoney(r.transferAmount) + '</td>' +
      '<td style="text-align:right;">' + fmtMoney(r.actualCash) + ' / ' + fmtMoney(r.actualTransfer) + '</td>' +
      '<td style="text-align:right; font-weight:800; color:' + (r.diffAmount ? 'var(--red)' : 'var(--text-sub)') + ';">' + fmtMoney(r.diffAmount) + '</td>' +
    '</tr>';
  }).join('');
  var phongVeTable = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Nhân viên</th><th>Thời gian kết ca</th><th>Doanh thu ca</th><th>Tiền ứng tài xế</th><th>Thu (Mặt/CK)</th><th>Kiểm đếm thực tế (Mặt/CK)</th><th>Chênh lệch</th></tr></thead>' +
    '<tbody>' + phongVeHtml + '</tbody></table>' +
    (phongVeHtml ? '' : '<div class="grid-empty"><p>Chưa có lượt kết ca nào của nhân viên phòng vé.</p></div>');

  var shuttleStaff = FleetStore.getStaff().filter(function (s) { return s.role === 'shuttle_driver'; })
    .map(function (s) { return { staff: s, legs: ssCountShuttleLegs(s.name) }; })
    .sort(function (a, b) { return b.legs - a.legs; });
  var shuttleHtml = shuttleStaff.map(function (r, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="font-weight:700;">' + esc(r.staff.code || '—') + '</td>' +
      '<td style="font-weight:700;">' + esc(r.staff.name || '—') + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800; color:var(--red);">' + r.legs + '</td>' +
    '</tr>';
  }).join('');
  var shuttleTable = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Mã NV</th><th>Tài xế trung chuyển</th><th>Số chuyến đã trung chuyển</th></tr></thead>' +
    '<tbody>' + shuttleHtml + '</tbody></table>' +
    (shuttleHtml ? '' : '<div class="grid-empty"><p>Chưa có tài xế trung chuyển nào.</p></div>');

  return '<div class="sd-toolbar">' +
      '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(f.dateFrom) + '" data-change-action="ssKetcaFilterInput" data-args=\'["dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(f.dateTo) + '" data-change-action="ssKetcaFilterInput" data-args=\'["dateTo","__this_value__"]\'></div>' +
      '<div class="sd-toolbar-actions"><button type="button" class="btn sd-btn" data-action="ssResetKetcaFilter">Đặt lại</button></div>' +
    '</div>' +
    '<div style="font-size:12px; color:var(--text-sub); margin-bottom:14px; line-height:1.5;">' +
      'Bộ lọc ngày áp dụng cho 2 bảng Kết ca bên dưới (đọc từ đúng nút "Kết ca" trong TicketStaff). Mục ' +
      '"Trung chuyển" không có sự kiện kết ca thật trong hệ thống nên luôn là tổng số lượt từ trước tới nay.' +
    '</div>' +
    ssCardHtml('Kết ca — Nhân viên tổng đài', tongDaiRows.length + ' lượt', tongDaiTable) +
    '<div style="height:16px;"></div>' +
    ssCardHtml('Kết ca — Nhân viên phòng vé', phongVeRows.length + ' lượt', phongVeTable) +
    '<div style="height:16px;"></div>' +
    ssCardHtml('Trung chuyển — Số chuyến đã thực hiện', shuttleStaff.length + ' tài xế', shuttleTable);
}

/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */
function renderStaffStatsView() {
  var tab = STAFF_STATS_TAB;
  var tabBtn = function (key, label) {
    return '<button type="button" class="station-subtab' + (tab === key ? ' active' : '') + '" data-action="setStaffStatsTab" data-args=\'["' + key + '"]\'>' + esc(label) + '</button>';
  };

  var body;
  if (tab === 'helper') body = ssRenderHelperTripsTab();
  else if (tab === 'ketca') body = ssRenderKetcaTab();
  else body = ssRenderDriverTripsTab();

  $('viewStaffStats').innerHTML =
    '<div class="station-subtabs">' +
      tabBtn('driver', 'Chuyến tài xế') +
      tabBtn('helper', 'Chuyến phụ xe') +
      tabBtn('ketca', 'Kết ca') +
    '</div>' +
    body;
}

function setStaffStatsTab(tab) { STAFF_STATS_TAB = tab; renderStaffStatsView(); }
