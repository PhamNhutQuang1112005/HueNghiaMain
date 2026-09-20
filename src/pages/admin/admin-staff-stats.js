/* =========================================================
   THỐNG KÊ NHÂN SỰ (Admin) — 5 tab con trong nhóm "Nhân sự":
     1. Chuyến tài xế — số "phơi xe" đã KHỞI HÀNH THẬT (manifest hn_ts_manifests_v1, không phải bank.driver
        vì trường đó chỉ là "đang chỉ định", có thể đổi trước giờ chạy — xem adminTripDisplayStatus bên
        admin-trips.js) + số lượt trung chuyển đã nhận (ShuttleDriverService, khớp theo TÊN vì dữ liệu
        này chỉ lưu tên tài xế dạng chữ, không có staffId).
     2. Chuyến phụ xe — tương tự mục 1 nhưng chỉ tính phơi xe (trung chuyển KHÔNG có khái niệm phụ xe
        trong toàn bộ hệ thống — không có role 'shuttle_helper' nào cả, xem STAFF_ROLES admin-staff.js).
     3-5. Kết ca — đọc lại đúng 1 nguồn "Kết ca" có sẵn của TicketStaff (hn_ts_shift_closings_v1,
        tsConfirmShiftClosing trong ticketstaff-manifest-core.js), rồi tách thành 3 tab riêng theo VAI
        TRÒ TÀI KHOẢN của người đã kết ca (tra staffId → Nhân viên → username → Tài khoản → role), thay
        vì gộp cả 3 bảng vào 1 trang như trước (khó quan sát khi phải cuộn qua 3 bảng dài):
          - "Kết ca — Tổng đài" ('call_center' và mọi role khác chưa liệt kê — mặc định khi không xác
            định được role) → chỉ hiện tổng vé/khách đã đặt trong ca.
          - "Kết ca — Phòng vé" ('ticket' Nhân viên vé — loại nhân viên GỐC — VÀ 'ticket_office' Nhân
            viên phòng vé, role tách riêng thêm sau theo yêu cầu — xem PHONG_VE_ROLES ở
            ssGetKetcaRows(); trước đây chỉ có 'call_center' dùng chung cho cả đặt vé lẫn thu tiền) →
            hiện đủ số liệu tiền: doanh thu,
            tiền ứng tài xế, thu tiền mặt/chuyển khoản, kiểm đếm thực tế, chênh lệch thiếu/đủ. Đầu tab còn
            có bảng TỔNG THEO TRẠM (ssAggregateKetcaStations) — gộp stationBreakdown có sẵn trong MỌI lượt
            kết ca của MỌI nhân viên phòng vé đang lọc theo ngày, vì đây là báo cáo cấp admin xem theo cả
            hệ thống chứ không riêng từng người như bên TicketStaff.
          - "Kết ca — Trung chuyển": Trung chuyển KHÔNG có sự kiện "kết ca" nào trong hệ thống (không
            tạo manifest/shift-closing nào cả) — tab này vì vậy chỉ là tổng số lượt đã nhận TỪ TRƯỚC TỚI
            NAY (ShuttleDriverService, cùng logic đếm với tab "Chuyến tài xế"), không phải 1 sự kiện kết
            ca thật và không lọc được theo ngày.
        2 tab Tổng đài/Phòng vé dùng chung 1 bộ lọc ngày (SS_KETCA_FILTER) vì cùng đọc từ 1 nguồn dữ liệu
        kết ca, chỉ tách hiển thị theo role.

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
var SS_KETCA_FILTER = { dateFrom: '', dateTo: '', region: '', station: '' };

function ssShiftClosingList() {
  var list = lsRead(SS_SHIFT_CLOSING_KEY, []);
  return Array.isArray(list) ? list : [];
}

// Danh sách "Trạm bán vé" (Lê Đại Hành/Xa Cảng/Kinh Dương Vương mặc định, TicketStaff cho tự thêm/sửa
// qua HN_TS_STATIONS_KEY) — đọc thẳng key localStorage vì admin.html không nạp ticketstaff-manifest-
// core.js (nơi định nghĩa getTicketStations()), tránh phải load cả bộ script TicketStaff chỉ để dùng 1
// hàm đọc danh sách trạm.
var SS_TICKET_STATIONS_KEY = 'hn_ts_ticket_stations_v1';
function ssTicketStations() {
  return lsRead(SS_TICKET_STATIONS_KEY, ['Lê Đại Hành', 'Xa Cảng', 'Kinh Dương Vương']);
}

/* ---- Bộ lọc "Khu vực" + "Trạm" (FleetStore.getStations()/region — CÙNG danh mục Khu vực/Trạm xe của
   trang "Trạm xe", KHÁC với "Trạm bán vé" ở trên) ----
   Bản ghi kết ca không tự lưu khu vực/trạm của mình — suy ngược qua tripIds đã kết ca: mỗi tripId tra
   ra đúng 1 chuyến (getTrips(), admin.js) có fromStation (trạm khởi hành thật, cùng danh mục
   FleetStore.getStations()); từ đó suy ra region của trạm đó. 1 lượt kết ca có thể gồm nhiều chuyến ở
   nhiều trạm khác nhau nên khớp lọc kiểu "match nếu có ÍT NHẤT 1 chuyến thuộc khu vực/trạm đang lọc",
   không tách nhỏ số tiền theo từng trạm (khác bảng "theo trạm bán vé" ở trên vốn đã có sẵn breakdown). */
function ssStationRegion(stationName) {
  var st = FleetStore.getStations().find(function (s) { return s.name === stationName; });
  return st ? (st.region || '') : '';
}
function ssRecordTripStations(record) {
  var trips = (typeof getTrips === 'function') ? getTrips() : [];
  var byId = {};
  trips.forEach(function (t) { if (t && t.id) byId[t.id] = t; });
  var names = {};
  (record.tripIds || []).forEach(function (id) {
    var t = byId[id];
    if (t && t.fromStation) names[t.fromStation] = true;
  });
  return Object.keys(names);
}
function ssRecordMatchesRegionStation(record, f) {
  if (!f.region && !f.station) return true;
  var names = ssRecordTripStations(record);
  if (!names.length) return false;
  return names.some(function (n) {
    if (f.station) return n === f.station;
    return ssStationRegion(n) === f.region;
  });
}
function ssRegionOptions() {
  return [{ key: '', label: 'Tất cả khu vực' }].concat(getRegionMeta().map(function (m) { return { key: m[0], label: m[1] }; }));
}
function ssRegionLabel(key) {
  if (!key) return '';
  var m = getRegionMeta().find(function (x) { return x[0] === key; });
  return m ? m[1] : key;
}
function ssStationOptions(regionKey) {
  var stations = FleetStore.getStations().filter(function (s) { return !regionKey || s.region === regionKey; });
  return [{ key: '', label: 'Tất cả trạm' }].concat(stations.map(function (s) { return { key: s.name, label: s.name }; }));
}

// Combobox gõ-để-lọc dùng chung cho "Khu vực"/"Trạm" — cùng khung nhìn (.combo-input-wrap/.combo-input/
// .dropdown-panel/.dropdown-item) đã nạp sẵn qua booking-ui/02-zone1.css cho trang Admin, KHÔNG nạp
// nguyên file booking-combobox.js (gắn cứng vào nhiều id/luồng chỉ có ở TicketStaff). Chọn 1 dòng chỉ
// đổi giá trị input + gọi onSelect (thường là set filter rồi renderStaffStatsView() render lại TOÀN BỘ
// toolbar) — không cần giữ focus qua adminKeepFocus như ô "Tìm kiếm" gõ-tới-đâu-lọc-dữ-liệu-tới-đó, vì
// việc gõ để LỌC DANH SÁCH GỢI Ý ở đây thuần phía client (chỉ render lại <div dropdown-panel>, không
// render lại toolbar) — chỉ khi BẤM CHỌN 1 dòng mới thật sự đổi filter và render lại toolbar.
// `options`/`selectedKey` NHẬN CẢ mảng/chuỗi TĨNH lẫn HÀM (đánh giá lại mỗi lần mở dropdown) — modal
// Nhân viên (admin-staff.js, smAttachStationCombos) dùng dạng hàm vì modal KHÔNG render lại toàn bộ HTML
// mỗi lần chọn 1 dòng (sẽ mất các ô khác đang gõ dở), nên chỉ set thẳng input.value rồi để nguyên listener
// — danh sách "Trạm" vì vậy phải tự đọc LẠI khu vực đang chọn (biến ngoài) mỗi lần mở, không đóng băng
// tại thời điểm gắn listener.
function ssWireSearchCombo(inputId, dropdownId, optionsOrFn, selectedKeyOrFn, onSelect) {
  var input = document.getElementById(inputId);
  var dd = document.getElementById(dropdownId);
  if (!input || !dd) return;

  function renderList(filterText) {
    var options = typeof optionsOrFn === 'function' ? optionsOrFn() : optionsOrFn;
    var selectedKey = typeof selectedKeyOrFn === 'function' ? selectedKeyOrFn() : selectedKeyOrFn;
    var q = (filterText || '').trim().toLowerCase();
    var list = !q ? options : options.filter(function (o) { return o.label.toLowerCase().indexOf(q) !== -1; });
    dd.innerHTML = list.length
      ? list.map(function (o, i) {
          return '<div class="dropdown-item' + (o.key === selectedKey ? ' active' : '') + '" data-idx="' + i + '">' +
            '<span>' + esc(o.label) + '</span><span class="dropdown-item-check">✓</span></div>';
        }).join('')
      : '<div class="dropdown-empty">Không tìm thấy</div>';
    dd.classList.add('open');
    Array.prototype.forEach.call(dd.querySelectorAll('.dropdown-item'), function (el) {
      el.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var opt = list[parseInt(el.getAttribute('data-idx'), 10)];
        if (opt) onSelect(opt.key, opt.label);
      });
    });
  }

  input.addEventListener('focus', function () { input.select(); renderList(''); });
  input.addEventListener('click', function () { input.select(); renderList(''); });
  input.addEventListener('input', function () { renderList(input.value); });
  input.addEventListener('blur', function () { setTimeout(function () { dd.classList.remove('open'); }, 150); });
}
function ssKetcaSelectRegion(key) {
  SS_KETCA_FILTER.region = key;
  // Đổi khu vực mà trạm đang chọn không còn thuộc khu vực đó → bỏ chọn trạm, tránh lọc "khu vực A + trạm
  // của khu vực B" không ra kết quả nào mà không rõ lý do.
  if (SS_KETCA_FILTER.station && ssStationRegion(SS_KETCA_FILTER.station) !== key) SS_KETCA_FILTER.station = '';
  renderStaffStatsView();
}
function ssKetcaSelectStation(key) {
  SS_KETCA_FILTER.station = key;
  if (key) SS_KETCA_FILTER.region = ssStationRegion(key); // chọn thẳng 1 trạm → tự khớp luôn khu vực của nó
  renderStaffStatsView();
}
function ssKetcaAttachCombos() {
  ssWireSearchCombo('ssKetcaRegionInput', 'ssKetcaRegionDropdown', ssRegionOptions(), SS_KETCA_FILTER.region, ssKetcaSelectRegion);
  ssWireSearchCombo('ssKetcaStationInput', 'ssKetcaStationDropdown', ssStationOptions(SS_KETCA_FILTER.region), SS_KETCA_FILTER.station, ssKetcaSelectStation);
}

// Gộp stationBreakdown của TẤT CẢ lượt kết ca phòng vé (đã lọc theo ngày) thành 1 bảng TỔNG theo trạm —
// mỗi lượt kết ca đã tự lưu sẵn stationBreakdown riêng của lượt đó (tsAggregateShiftClosing,
// ticketstaff-manifest-core.js) nên chỉ cần cộng dồn theo key trạm qua mọi nhân viên/mọi lượt, không
// cần đọc lại dữ liệu vé gốc.
function ssAggregateKetcaStations(phongVeRows) {
  var totals = {};
  phongVeRows.forEach(function (x) {
    var sb = (x.record && x.record.stationBreakdown) || {};
    Object.keys(sb).forEach(function (st) {
      if (!totals[st]) totals[st] = { tickets: 0, passengers: 0, amount: 0 };
      totals[st].tickets += sb[st].tickets || 0;
      totals[st].passengers += sb[st].passengers || 0;
      totals[st].amount += sb[st].amount || 0;
    });
  });
  return totals;
}

function ssRenderKetcaStationTableHtml(totals) {
  var stations = ssTicketStations().slice();
  Object.keys(totals).forEach(function (st) { if (stations.indexOf(st) === -1) stations.push(st); });
  if (!stations.length) return '<div class="grid-empty"><p>Chưa có dữ liệu theo trạm.</p></div>';

  var grand = { tickets: 0, amount: 0 };
  var rowsHtml = stations.map(function (st) {
    var v = totals[st] || { tickets: 0, amount: 0 };
    grand.tickets += v.tickets || 0;
    grand.amount += v.amount || 0;
    return '<tr>' +
      '<td style="font-weight:700;">' + esc(st) + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + (v.tickets || 0) + '</td>' +
      '<td style="text-align:right; font-weight:800;">' + fmtMoney(v.amount) + '</td>' +
    '</tr>';
  }).join('');
  var totalRow = '<tr style="font-weight:800;">' +
    '<td>TỔNG</td>' +
    '<td class="mono" style="text-align:center;">' + grand.tickets + '</td>' +
    '<td style="text-align:right;">' + fmtMoney(grand.amount) + '</td>' +
  '</tr>';

  return '<table class="admin-table">' +
    '<thead><tr><th>Trạm</th><th style="text-align:center;">Số vé</th><th style="text-align:right;">Doanh thu</th></tr></thead>' +
    '<tbody>' + rowsHtml + totalRow + '</tbody></table>';
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
function ssResetKetcaFilter() { SS_KETCA_FILTER = { dateFrom: '', dateTo: '', region: '', station: '' }; renderStaffStatsView(); }

function ssGetKetcaRows() {
  var f = SS_KETCA_FILTER;
  var all = ssShiftClosingList().filter(function (r) {
    if (!r) return false;
    var d = toLocalDateStr(r.time);
    if (f.dateFrom && d < f.dateFrom) return false;
    if (f.dateTo && d > f.dateTo) return false;
    if (!ssRecordMatchesRegionStation(r, f)) return false;
    return true;
  }).sort(function (a, b) { return String(b.time || '').localeCompare(String(a.time || '')); });

  // 'ticket' (Nhân viên vé — loại nhân viên GỐC, xem SEED_STAFF_ROLES fleet-store.js) và 'ticket_office'
  // (Nhân viên phòng vé — role MỚI tách riêng cho phần thu tiền) đều là nhân viên PHÒNG VÉ, xếp chung 1
  // rổ; chỉ 'call_center' (Nhân viên tổng đài — role chuyên biệt, không thu tiền) và các role còn lại
  // (chưa xác định được/khác) mới rơi vào rổ tổng đài mặc định.
  var PHONG_VE_ROLES = { ticket: true, ticket_office: true };
  var tongDaiRows = [], phongVeRows = [];
  all.forEach(function (r) {
    var acc = ssResolveCloserAccount(r.staffId);
    var role = acc ? acc.role : '';
    var row = { record: r, closerName: (acc && (acc.fullName || acc.username)) || r.staffId };
    if (PHONG_VE_ROLES[role]) phongVeRows.push(row);
    else tongDaiRows.push(row); // mặc định (call_center hoặc chưa xác định được role) → xem như tổng đài
  });
  return { tongDaiRows: tongDaiRows, phongVeRows: phongVeRows };
}

function ssKetcaToolbarHtml() {
  var f = SS_KETCA_FILTER;
  return '<div class="sd-toolbar ss-ketca-toolbar">' +
      '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(f.dateFrom) + '" data-change-action="ssKetcaFilterInput" data-args=\'["dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(f.dateTo) + '" data-change-action="ssKetcaFilterInput" data-args=\'["dateTo","__this_value__"]\'></div>' +
      '<div class="filter-field" style="position:relative;"><label>Khu vực</label>' +
        '<div class="combo-input-wrap"><input type="text" id="ssKetcaRegionInput" class="combo-input" autocomplete="off" placeholder="Tất cả khu vực" value="' + esc(ssRegionLabel(f.region)) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></div>' +
        '<div class="dropdown-panel" id="ssKetcaRegionDropdown"></div>' +
      '</div>' +
      '<div class="filter-field" style="position:relative;"><label>Trạm</label>' +
        '<div class="combo-input-wrap"><input type="text" id="ssKetcaStationInput" class="combo-input" autocomplete="off" placeholder="Tất cả trạm" value="' + esc(f.station) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></div>' +
        '<div class="dropdown-panel" id="ssKetcaStationDropdown"></div>' +
      '</div>' +
      '<div class="sd-toolbar-actions"><button type="button" class="btn sd-btn" data-action="ssResetKetcaFilter">Đặt lại</button></div>' +
    '</div>';
}

function ssRenderKetcaTongDaiTab() {
  var tongDaiRows = ssGetKetcaRows().tongDaiRows;

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

  return ssKetcaToolbarHtml() +
    ssCardHtml('Kết ca — Nhân viên tổng đài', tongDaiRows.length + ' lượt', tongDaiTable);
}

// Gộp phẳng TOÀN BỘ dòng CHI (chiItems, nhân viên tự gõ tay lúc kết ca — xem tsCollectShiftChiItems,
// ticketstaff-manifest-ui.js) của MỌI lượt kết ca phòng vé đang lọc thành 1 bảng — mỗi dòng vẫn giữ
// NHÂN VIÊN + THỜI GIAN KẾT CA của đúng lượt sinh ra nó (không gộp mất nguồn) để còn tra ngược được lượt
// kết ca nào phát sinh khoản chi nào.
function ssAggregateKetcaChiRows(phongVeRows) {
  var rows = [];
  phongVeRows.forEach(function (x) {
    var items = (x.record && x.record.chiItems) || [];
    items.forEach(function (item) {
      rows.push({ closerName: x.closerName, time: x.record.time, reason: item.reason, amount: item.amount, approver: item.approver });
    });
  });
  return rows;
}

// 3 cột ĐÚNG như ticketstaff nhập (Lý do chi / Số tiền chi / Người duyệt) — không rút gọn/gộp chung
// thành 1 cột "lý do" mập mờ, để khớp đúng ý nghĩa dữ liệu nhân viên đã gõ tay lúc kết ca.
function ssRenderKetcaChiTableHtml(chiRows) {
  if (!chiRows.length) return '<div class="grid-empty"><p>Chưa có khoản chi nào được ghi nhận.</p></div>';
  var total = 0;
  var rowsHtml = chiRows.map(function (r, idx) {
    total += Number(r.amount) || 0;
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td style="font-weight:700;">' + esc(r.closerName) + '</td>' +
      '<td class="mono" style="color:var(--text-sub);">' + esc(fmtStamp(r.time)) + '</td>' +
      '<td>' + esc(r.reason || '—') + '</td>' +
      '<td style="text-align:right; font-weight:800;">' + fmtMoney(r.amount) + '</td>' +
      '<td>' + esc(r.approver || '—') + '</td>' +
    '</tr>';
  }).join('');
  var totalRow = '<tr style="font-weight:800;"><td colspan="4" style="text-align:right;">TỔNG CHI</td>' +
    '<td style="text-align:right;">' + fmtMoney(total) + '</td><td></td></tr>';
  return '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Nhân viên</th><th>Thời gian kết ca</th><th>Lý do chi</th><th style="text-align:right;">Số tiền chi</th><th>Người duyệt</th></tr></thead>' +
    '<tbody>' + rowsHtml + totalRow + '</tbody></table>';
}

function ssRenderKetcaPhongVeTab() {
  var phongVeRows = ssGetKetcaRows().phongVeRows;

  // Tổng theo trạm — gộp TOÀN BỘ lượt kết ca của MỌI nhân viên phòng vé trong khoảng ngày đang lọc,
  // không tách riêng theo từng người, đúng yêu cầu "kết ca của tất cả nhân viên phòng vé theo trạm".
  var stationTotals = ssAggregateKetcaStations(phongVeRows);
  var stationCard = ssCardHtml('Kết ca — Phòng vé (theo trạm bán vé)', phongVeRows.length + ' lượt kết ca', ssRenderKetcaStationTableHtml(stationTotals));

  var chiRows = ssAggregateKetcaChiRows(phongVeRows);
  var chiCard = ssCardHtml('Kết ca — Phòng vé (khoản chi)', chiRows.length + ' khoản chi', ssRenderKetcaChiTableHtml(chiRows));

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

  return ssKetcaToolbarHtml() +
    stationCard +
    chiCard +
    ssCardHtml('Chi tiết từng lượt kết ca', phongVeRows.length + ' lượt', phongVeTable);
}

function ssRenderKetcaTrungChuyenTab() {
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

  return '<div class="ss-ketca-note">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>' +
      '<span>Trung chuyển không có sự kiện "kết ca" thật trong hệ thống nên mục này luôn là tổng số lượt đã ' +
      'nhận từ trước tới nay, không lọc được theo ngày.</span>' +
    '</div>' +
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
  else if (tab === 'ketca_tongdai') body = ssRenderKetcaTongDaiTab();
  else if (tab === 'ketca_phongve') body = ssRenderKetcaPhongVeTab();
  else if (tab === 'ketca_trungchuyen') body = ssRenderKetcaTrungChuyenTab();
  else body = ssRenderDriverTripsTab();

  $('viewStaffStats').innerHTML =
    '<div class="station-subtabs">' +
      tabBtn('driver', 'Chuyến tài xế') +
      tabBtn('helper', 'Chuyến phụ xe') +
      tabBtn('ketca_tongdai', 'Kết ca — Tổng đài') +
      tabBtn('ketca_phongve', 'Kết ca — Phòng vé') +
      tabBtn('ketca_trungchuyen', 'Kết ca — Trung chuyển') +
    '</div>' +
    body;

  // Gắn lại hành vi combobox "Khu vực"/"Trạm" — toolbar vừa bị thay mới nguyên khối qua innerHTML ở
  // trên nên mọi listener cũ (nếu có) đã mất theo DOM cũ; hàm này tự no-op nếu tab hiện tại không có 2
  // ô input này (ssWireSearchCombo tự return sớm khi không tìm thấy input/dropdown).
  if (tab === 'ketca_tongdai' || tab === 'ketca_phongve') ssKetcaAttachCombos();
}

function setStaffStatsTab(tab) { STAFF_STATS_TAB = tab; renderStaffStatsView(); }
