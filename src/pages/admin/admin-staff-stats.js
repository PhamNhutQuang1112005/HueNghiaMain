/* =========================================================
   THỐNG KÊ NHÂN SỰ (Admin) — 4 tab con trong nhóm "Nhân sự":
     1. Giờ làm việc  — tổng giờ làm theo Ngày/Tuần/Tháng/Quý/Năm, tính từ mốc đăng nhập/đăng xuất
        THẬT trên hệ thống (HN_STAFF_TIMELOG_KEY, ghi tự động trong auth/session.js). Áp dụng cho MỌI
        nhân viên, không phân loại "theo giờ/cố định" (hệ thống chưa có trường này trên hồ sơ nhân viên).
     2. Chuyến tài xế — số "phơi xe" đã KHỞI HÀNH THẬT (manifest hn_ts_manifests_v1, không phải bank.driver
        vì trường đó chỉ là "đang chỉ định", có thể đổi trước giờ chạy — xem adminTripDisplayStatus bên
        admin-trips.js) + số lượt trung chuyển đã nhận (ShuttleDriverService, khớp theo TÊN vì dữ liệu
        này chỉ lưu tên tài xế dạng chữ, không có staffId).
     3. Chuyến phụ xe — tương tự mục 2 nhưng chỉ tính phơi xe (trung chuyển KHÔNG có khái niệm phụ xe
        trong toàn bộ hệ thống — không có role 'shuttle_helper' nào cả, xem STAFF_ROLES admin-staff.js).
     4. Kết ca — đọc lại đúng 1 nguồn "Kết ca" có sẵn của TicketStaff (hn_ts_shift_closings_v1,
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

var STAFF_STATS_TAB = 'hours';
var SS_HOURS_PERIOD = 'month'; // day | week | month | quarter | year
var SS_TRIP_FILTERS = {
  driver: { search: '', dateFrom: '', dateTo: '' },
  helper: { search: '', dateFrom: '', dateTo: '' }
};

function ssRoleLabel(role) {
  var map = { ticket: 'Nhân viên vé', driver: 'Tài xế', helper: 'Phụ xe', shuttle_driver: 'Tài xế trung chuyển' };
  return map[role] || role || '—';
}
function ssFmtHours(ms) {
  return (ms / 3600000).toFixed(1).replace('.', ',') + ' giờ';
}
function ssMatchName(a, b) {
  a = String(a || '').trim().toLowerCase();
  b = String(b || '').trim().toLowerCase();
  return !!a && !!b && a === b;
}
function ssCardHtml(title, countLabel, tableHtml) {
  return '<div class="ref-card" style="padding:0; overflow:hidden;">' +
    '<div class="ref-card-header" style="padding:14px 20px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">' +
      '<div style="font-size:14.5px; font-weight:800; color:var(--black);">' + esc(title) + '</div>' +
      '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">' + esc(countLabel) + '</div>' +
    '</div>' +
    '<div class="table-wrap">' + tableHtml + '</div>' +
  '</div>';
}

/* =====================================================================
   1. GIỜ LÀM VIỆC — dựng phiên làm việc (login→logout) từ HN_STAFF_TIMELOG_KEY, cắt theo từng ngày lịch
   (phòng trường hợp phiên qua đêm), rồi cộng dồn theo Ngày/Tuần/Tháng/Quý/Năm đang chọn.
   ===================================================================== */
function ssBuildSessions(events) {
  var sorted = events.slice().sort(function (a, b) { return a.ts - b.ts; });
  var sessions = [];
  var openLogin = null;

  sorted.forEach(function (e) {
    if (e.type === 'login') {
      // Đăng nhập mới mà phiên trước chưa có logout → coi như phiên trước kết thúc ngay lúc này
      // (quên đăng xuất rồi đăng nhập lại), tránh cộng chồng 2 phiên đè lên nhau.
      if (openLogin != null) sessions.push({ start: openLogin, end: e.ts });
      openLogin = e.ts;
    } else if (e.type === 'logout' && openLogin != null) {
      sessions.push({ start: openLogin, end: e.ts });
      openLogin = null;
    }
  });

  if (openLogin != null) {
    var now = Date.now();
    var loginDay = toLocalDateStr(openLogin), today = toLocalDateStr(now);
    // Phiên hôm nay còn mở → tính tới thời điểm hiện tại (đang online); phiên NGÀY CŨ còn mở (tắt tab/
    // trình duyệt không đăng xuất) → chốt tạm ở cuối ngày hôm đó thay vì bỏ qua hẳn.
    var cap = loginDay === today ? now : new Date(loginDay + 'T23:59:59').getTime();
    sessions.push({ start: openLogin, end: cap });
  }
  return sessions;
}

function ssSplitSessionByDay(session) {
  var parts = [];
  var cursor = session.start;
  while (cursor < session.end) {
    var d = new Date(cursor);
    var dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    var segEnd = Math.min(session.end, dayEnd);
    if (segEnd > cursor) parts.push({ date: toLocalDateStr(cursor), ms: segEnd - cursor });
    cursor = dayEnd + 1;
  }
  return parts;
}

/* -> { username: { 'YYYY-MM-DD': tổng ms trong ngày đó } } */
function ssBuildDailyTotalsByUsername() {
  var events = lsRead(HN_STAFF_TIMELOG_KEY, []);
  var byUser = {};
  events.forEach(function (e) {
    if (!e || !e.username || (e.type !== 'login' && e.type !== 'logout')) return;
    (byUser[e.username] || (byUser[e.username] = [])).push(e);
  });

  var totals = {};
  Object.keys(byUser).forEach(function (u) {
    var dayMap = totals[u] = {};
    ssBuildSessions(byUser[u]).forEach(function (s) {
      ssSplitSessionByDay(s).forEach(function (p) { dayMap[p.date] = (dayMap[p.date] || 0) + p.ms; });
    });
  });
  return totals;
}

/* Khoảng ngày [start,end] của Ngày/Tuần/Tháng/Quý/Năm chứa ngày mốc anchorStr (yyyy-mm-dd, giờ địa
   phương — cùng quy ước với lịch chọn ngày adminCalFieldHtml). Tuần tính Thứ 2 → Chủ nhật. */
function ssPeriodRange(type, anchorStr) {
  var p = anchorStr.split('-').map(Number);
  var y = p[0], m = p[1] - 1, day = p[2];
  var d = new Date(y, m, day);

  if (type === 'day') return { start: anchorStr, end: anchorStr, label: fmtDate(anchorStr) };

  if (type === 'week') {
    var dow = (d.getDay() + 6) % 7; // 0 = Thứ 2
    var mon = new Date(y, m, day - dow), sun = new Date(y, m, day - dow + 6);
    return { start: toLocalDateStr(mon.getTime()), end: toLocalDateStr(sun.getTime()), label: 'Tuần ' + fmtDate(toLocalDateStr(mon.getTime())) + ' – ' + fmtDate(toLocalDateStr(sun.getTime())) };
  }
  if (type === 'month') {
    var mf = new Date(y, m, 1), ml = new Date(y, m + 1, 0);
    return { start: toLocalDateStr(mf.getTime()), end: toLocalDateStr(ml.getTime()), label: 'Tháng ' + (m + 1) + '/' + y };
  }
  if (type === 'quarter') {
    var q = Math.floor(m / 3);
    var qf = new Date(y, q * 3, 1), ql = new Date(y, q * 3 + 3, 0);
    return { start: toLocalDateStr(qf.getTime()), end: toLocalDateStr(ql.getTime()), label: 'Quý ' + (q + 1) + '/' + y };
  }
  var yf = new Date(y, 0, 1), yl = new Date(y, 11, 31);
  return { start: toLocalDateStr(yf.getTime()), end: toLocalDateStr(yl.getTime()), label: 'Năm ' + y };
}

function ssSetHoursPeriod(period) { SS_HOURS_PERIOD = period; renderStaffStatsView(); }

function ssRenderHoursTab() {
  var ns = 'ssHours';
  adminCalInit(ns, function () { renderStaffStatsView(); });
  var st = adminCalState(ns);
  if (!st.selectedStr) st.selectedStr = toLocalDateStr(new Date());

  var range = ssPeriodRange(SS_HOURS_PERIOD, st.selectedStr);
  var dailyTotals = ssBuildDailyTotalsByUsername();
  var staff = FleetStore.getStaff();

  var rows = staff.map(function (s) {
    var dayMap = dailyTotals[s.username] || {};
    var totalMs = 0, dayCount = 0;
    Object.keys(dayMap).forEach(function (d) {
      if (d >= range.start && d <= range.end) { totalMs += dayMap[d]; dayCount++; }
    });
    return { staff: s, totalMs: totalMs, dayCount: dayCount };
  }).sort(function (a, b) { return b.totalMs - a.totalMs; });

  var periodBtn = function (key, label) {
    return '<button type="button" class="acct-sub-tab' + (SS_HOURS_PERIOD === key ? ' active' : '') + '" data-action="ssSetHoursPeriod" data-args=\'["' + key + '"]\'>' + label + '</button>';
  };

  var rowsHtml = rows.map(function (r, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="font-weight:700; color:var(--black);">' + esc(r.staff.code || '—') + '</td>' +
      '<td style="font-weight:700;">' + esc(r.staff.name || '—') + '</td>' +
      '<td>' + esc(ssRoleLabel(r.staff.role)) + '</td>' +
      '<td class="mono" style="text-align:center;">' + r.dayCount + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + ssFmtHours(r.totalMs) + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Mã NV</th><th>Tên nhân viên</th><th>Vai trò</th><th>Số ngày có đăng nhập</th><th>Tổng giờ làm</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có nhân viên nào.</p></div>');

  return '<div class="acct-sub-tabs" style="margin-bottom:12px;">' +
      periodBtn('day', 'Ngày') + periodBtn('week', 'Tuần') + periodBtn('month', 'Tháng') + periodBtn('quarter', 'Quý') + periodBtn('year', 'Năm') +
    '</div>' +
    '<div class="filter-toolbar">' +
      adminCalFieldHtml(ns, 'Chọn mốc thời gian') +
      '<div style="align-self:center; font-size:13px; font-weight:800; color:var(--black);">' + esc(range.label) + '</div>' +
    '</div>' +
    '<div style="font-size:12px; color:var(--text-sub); margin-bottom:14px; line-height:1.5;">' +
      'Giờ làm tính từ mốc đăng nhập/đăng xuất THẬT trên hệ thống — không phải chấm công tại chỗ. Phiên tắt ' +
      'tab/trình duyệt mà không bấm "Đăng xuất" được tính tạm tới hết ngày hôm đó.' +
    '</div>' +
    ssCardHtml('Giờ làm việc — ' + range.label, rows.length + ' nhân viên', table);
}

/* =====================================================================
   2 & 3. CHUYẾN TÀI XẾ / CHUYẾN PHỤ XE
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

function ssTripFilterToolbarHtml(tab, f, searchPlaceholder, dateCaption) {
  return '<div class="filter-toolbar">' +
      '<div class="filter-field"><label>Tìm kiếm</label><input type="text" value="' + esc(f.search) + '" placeholder="' + esc(searchPlaceholder) + '" data-input-action="ssTripFilterInput" data-args=\'["' + tab + '","search","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(f.dateFrom) + '" data-change-action="ssTripFilterInput" data-args=\'["' + tab + '","dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(f.dateTo) + '" data-change-action="ssTripFilterInput" data-args=\'["' + tab + '","dateTo","__this_value__"]\'></div>' +
      '<button type="button" class="btn btn-secondary" data-action="ssResetTripFilters" data-args=\'["' + tab + '"]\'>Đặt lại</button>' +
    '</div>' +
    '<div style="font-size:12px; color:var(--text-sub); margin-bottom:14px;">' + esc(dateCaption) + '</div>';
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

  return ssTripFilterToolbarHtml('driver', f, 'Mã NV, tên, SĐT...',
      'Bộ lọc ngày chỉ áp dụng cho cột "Số phơi xe đã chạy" — lượt trung chuyển không lưu mốc thời gian nên luôn là tổng từ trước tới nay.') +
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

  return ssTripFilterToolbarHtml('helper', f, 'Mã NV, tên, SĐT...',
      'Trung chuyển hiện không có khái niệm phụ xe trong hệ thống nên chỉ thống kê phơi xe.') +
    ssCardHtml('Thống kê chuyến của phụ xe', rows.length + ' phụ xe', table);
}

/* =====================================================================
   4. KẾT CA — đọc hn_ts_shift_closings_v1 (TicketStaff), tách theo vai trò TÀI KHOẢN của người kết ca.
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

  return '<div class="filter-toolbar">' +
      '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(f.dateFrom) + '" data-change-action="ssKetcaFilterInput" data-args=\'["dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(f.dateTo) + '" data-change-action="ssKetcaFilterInput" data-args=\'["dateTo","__this_value__"]\'></div>' +
      '<button type="button" class="btn btn-secondary" data-action="ssResetKetcaFilter">Đặt lại</button>' +
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
    return '<button type="button" class="acct-sub-tab' + (tab === key ? ' active' : '') + '" data-action="setStaffStatsTab" data-args=\'["' + key + '"]\'>' + esc(label) + '</button>';
  };

  var body;
  if (tab === 'driver') body = ssRenderDriverTripsTab();
  else if (tab === 'helper') body = ssRenderHelperTripsTab();
  else if (tab === 'ketca') body = ssRenderKetcaTab();
  else body = ssRenderHoursTab();

  $('viewStaffStats').innerHTML =
    '<div class="acct-sub-tabs">' +
      tabBtn('hours', 'Giờ làm việc') +
      tabBtn('driver', 'Chuyến tài xế') +
      tabBtn('helper', 'Chuyến phụ xe') +
      tabBtn('ketca', 'Kết ca') +
    '</div>' +
    body;

  if (tab === 'hours') adminCalUpdateTrigger('ssHours');
}

function setStaffStatsTab(tab) { STAFF_STATS_TAB = tab; renderStaffStatsView(); }
