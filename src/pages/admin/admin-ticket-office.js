/* =========================================================
   PHÒNG VÉ (Admin) — tổng hợp lịch sử vòng đời phơi xe mà "Tổng đài" (viewTicketList, chỉ xem vé đã bán)
   không có: khi nào phơi khởi hành thật (xuất phơi), lịch sử Re-open, toàn bộ diễn biến 1 ngày (tạo/sửa/
   khởi hành/reopen/hủy gộp chung theo mốc thời gian), và danh sách phơi đã hủy. 4 tab con dựng kiểu
   .station-subtabs + .sd-toolbar + .sd-section-block (y hệt trang Trạm Xe, admin-station-directory.js)
   NGAY TRONG 1 view, không phải 4 mục sidebar riêng.

   Nguồn dữ liệu (chỉ đọc, không có CRUD riêng ở đây):
     - Khởi hành thật của phơi   → manifest TicketStaff 'hn_ts_manifests_v1' (createdAt = lúc xuất phơi;
       KHÔNG phải t.status vì không có nơi nào set t.status = 'Khởi hành' cả — xem adminTripDisplayStatus).
     - Lịch sử Re-open           → 'hn_ts_reopen_events_v1' (mảng theo từng tripId).
     - Phơi đã hủy               → getTrips() lọc status === 'Đã hủy' (đây LÀ nghĩa "phơi đã xóa": hệ
       thống không xóa cứng phơi, chỉ đổi status), đối chiếu FleetStore activity log (action 'cancel') để
       lấy mốc giờ + người hủy.
     - "Phơi trong ngày"         → gộp cả 3 nguồn trên (activity log tạo/sửa/hủy + manifest khởi hành +
       reopen) theo đúng 1 ngày đang chọn, xếp theo mốc giờ mới nhất lên trước — timeline đầy đủ 1 phơi.
   ========================================================= */

var TICKET_OFFICE_TAB = 'depart';
function toEmptyFilterSet() { return { search: '', direction: '', fromStation: '' }; }
var TO_FILTERS = { depart: toEmptyFilterSet(), reopen: toEmptyFilterSet(), daily: toEmptyFilterSet(), cancelled: toEmptyFilterSet() };
var TO_NS = { depart: 'toDep', reopen: 'toReopen', daily: 'toDay', cancelled: 'toCancel' };
var TO_REOPEN_KEY = 'hn_ts_reopen_events_v1';

/* Ngày lịch ĐỊA PHƯƠNG "yyyy-mm-dd" của 1 mốc giờ (ISO string hoặc epoch ms) — KHÔNG dùng
   toISOString().slice(0,10) (UTC) để so khớp với ngày người dùng chọn trên lịch (adminCalPickDate/
   adminCalGoToday đều tính theo giờ địa phương): lệch múi giờ VN (+7) sẽ đẩy các mốc giờ khuya
   (00:00–07:00 giờ VN) sang NGÀY HÔM TRƯỚC nếu so theo UTC, khiến khởi hành/reopen lúc sáng sớm biến
   mất khỏi tab "Phơi trong ngày" của đúng ngày hôm đó. */
function toLocalDateStr(ts) {
  var d = new Date(ts);
  if (isNaN(d)) return '';
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/* ---------- Tra cứu phơi theo id (dùng chung cho cả 4 tab để hiện tên phơi bấm được) ---------- */
function toTripLookup() {
  var map = {};
  getTrips().forEach(function (t) { if (t && t.id) map[t.id] = t; });
  return map;
}
function toTripLabel(t, tripId) {
  // t.name đã tự gợi ý sẵn "Trạm đi - Trạm đến (giờ)" lúc tạo phơi (xem adminTripNameSuggest ở
  // admin-trips.js) — nối thêm "— t.time" ở đây bị lặp giờ 2 lần. Hiện tên trần y hệt trang Phơi xe.
  if (t) return t.name || t.route || 'Phơi';
  return 'Phơi #' + String(tripId || '—');
}
function toGoToTrip() { switchAdminView('viewTrips'); }

function toLifecycleBadge(status) {
  var META = {
    DEPARTED: { cls: 'da-khoi-hanh', label: 'Khởi hành' },
    REOPEN: { cls: 'da-khoi-hanh', label: 'Re-open' },
    REOPEN_CLOSED: { cls: 'da-khoi-hanh', label: 'Đóng Re-open' },
    MANIFEST_CLOSED: { cls: 'da-khoi-hanh', label: 'Đã kết ca' }
  };
  var m = META[status] || { cls: 'chua-chi-dinh', label: status || '—' };
  return '<span class="status-badge ' + m.cls + '"><span class="status-dot"></span>' + esc(m.label) + '</span>';
}
function toReopenStatusBadge(status) {
  return status === 'OPEN'
    ? '<span class="status-badge dang-ban"><span class="status-dot"></span>Đang mở</span>'
    : '<span class="status-badge da-khoi-hanh"><span class="status-dot"></span>Đã đóng</span>';
}
function toActionMeta(type) {
  var META = {
    'create': { cls: 'dang-ban', label: 'Tạo phơi' },
    'bulk-create': { cls: 'dang-ban', label: 'Tạo hàng loạt' },
    'update': { cls: 'chua-chi-dinh', label: 'Sửa phơi' },
    'cancel': { cls: 'da-huy', label: 'Hủy phơi' },
    'depart': { cls: 'da-khoi-hanh', label: 'Khởi hành' },
    'close': { cls: 'da-khoi-hanh', label: 'Đã kết ca' },
    'reopen-open': { cls: 'dang-ban', label: 'Mở Re-open' },
    'reopen-close': { cls: 'chua-chi-dinh', label: 'Đóng Re-open' }
  };
  return META[type] || { cls: 'chua-chi-dinh', label: type || '—' };
}

/* ---------- Bộ lọc Hướng đi / Trạm đi dùng chung cho cả 4 tab — áp theo phơi (t.route/t.fromStation)
   gắn với từng dòng lịch sử. Trạm đi lấy TOÀN BỘ danh mục trạm (FleetStore.getStations), không chỉ
   trạm đang xuất hiện trong dữ liệu, giống cách "Trạm đi" ở tab Trung chuyển (admin-transship.js). ---------- */
function toDirectionOptionsHtml(cur) {
  var directions = (FleetStore && FleetStore.getDirections ? FleetStore.getDirections() : []).filter(function (d) { return d && d.active !== false; }).sort(byOrder);
  return '<option value="">Tất cả hướng</option>' + directions.map(function (d) {
    return '<option value="' + esc(d.id) + '"' + (cur === d.id ? ' selected' : '') + '>' + esc(d.label) + '</option>';
  }).join('');
}
function toStationOptionsHtml(cur) {
  var stations = (FleetStore && FleetStore.getStations ? FleetStore.getStations() : []).map(function (s) { return s.name; }).sort();
  return '<option value="">Tất cả trạm đi</option>' + stations.map(function (s) {
    return '<option value="' + esc(s) + '"' + (cur === s ? ' selected' : '') + '>' + esc(s) + '</option>';
  }).join('');
}
function toDirStationFieldsHtml(tab, f) {
  return '<div class="filter-field"><label>Hướng đi</label><select data-change-action="toFilterInput" data-args=\'["' + tab + '","direction","__this_value__"]\'>' + toDirectionOptionsHtml(f.direction) + '</select></div>' +
    '<div class="filter-field"><label>Trạm đi</label><select data-change-action="toFilterInput" data-args=\'["' + tab + '","fromStation","__this_value__"]\'>' + toStationOptionsHtml(f.fromStation) + '</select></div>';
}
// t = phơi (trip) gắn với dòng lịch sử đang lọc — có thể null nếu phơi gốc đã bị xoá dữ liệu.
function toTripMatchesFilters(t, f) {
  if (f.direction && (!t || tripRouteDirectionId(t.route) !== f.direction)) return false;
  if (f.fromStation && (!t || t.fromStation !== f.fromStation)) return false;
  return true;
}

/* ---------- Nguồn 1: Lịch sử khởi hành xe — mỗi phơi 1 dòng theo manifest hiện có ---------- */
function toGetDepartures() {
  var mf = getManifests();
  var trips = toTripLookup();
  return Object.keys(mf).map(function (tripId) {
    var m = mf[tripId] || {};
    var t = trips[tripId];
    return {
      tripId: tripId, trip: t,
      plate: m.plate || (t && t.plate) || '—',
      driver: m.driver || '—', helper: m.helper || '',
      date: m.date || (t && t.date) || '', time: m.time || (t && t.time) || '',
      createdAt: m.createdAt, createdBy: m.createdBy || '—',
      status: m.status, closedAt: m.closedAt, closedBy: m.closedBy
    };
  }).sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
}

/* ---------- Nguồn 2: Lịch sử Re-open — làm phẳng map {tripId:[event,...]} ---------- */
function toGetReopenEvents() {
  var raw = lsRead(TO_REOPEN_KEY, {});
  var trips = toTripLookup();
  var rows = [];
  Object.keys(raw).forEach(function (tripId) {
    (raw[tripId] || []).forEach(function (ev) {
      var row = {}; for (var k in ev) if (Object.prototype.hasOwnProperty.call(ev, k)) row[k] = ev[k];
      row.tripId = tripId; row.trip = trips[tripId];
      rows.push(row);
    });
  });
  return rows.sort(function (a, b) { return String(b.time || '').localeCompare(String(a.time || '')); });
}

/* ---------- Nguồn 3: Phơi đã hủy — status 'Đã hủy' đối chiếu log 'cancel' lấy mốc giờ/người hủy ---------- */
function toGetCancelledTrips() {
  var trips = getTrips().filter(function (t) { return t && t.status === 'Đã hủy'; });
  var acts = (window.FleetStore && typeof FleetStore.getActivity === 'function') ? FleetStore.getActivity() : [];
  var lastCancel = {};
  acts.forEach(function (x) {
    if (!x || x.entity !== 'trip' || x.action !== 'cancel' || !x.entityId) return;
    if (!lastCancel[x.entityId] || x.ts > lastCancel[x.entityId].ts) lastCancel[x.entityId] = x;
  });
  return trips.map(function (t) {
    var log = lastCancel[t.id];
    // Lý do hủy ưu tiên t.cancelReason (ghi thẳng lên phơi lúc hủy — admin lẫn TicketStaff đều ghi qua
    // đây), fallback rút từ summary log cũ (trước khi có t.cancelReason) dạng "... — Lý do: ...".
    var reason = t.cancelReason || '';
    if (!reason && log && log.summary) {
      var m = /Lý do:\s*(.+)$/.exec(log.summary);
      if (m) reason = m[1];
    }
    return { trip: t, cancelledAt: log ? log.ts : null, cancelledBy: log ? log.user : '—', reason: reason };
  }).sort(function (a, b) { return (b.cancelledAt || 0) - (a.cancelledAt || 0); });
}

/* ---------- Nguồn 4: Toàn bộ diễn biến 1 ngày — gộp cả 3 nguồn trên theo đúng ngày đang chọn ---------- */
function toGetDailyEvents(dateStr) {
  var trips = toTripLookup();
  var events = [];

  var acts = (window.FleetStore && typeof FleetStore.getActivity === 'function') ? FleetStore.getActivity() : [];
  acts.forEach(function (x) {
    if (!x || x.entity !== 'trip') return;
    if (toLocalDateStr(x.ts || 0) !== dateStr) return;
    events.push({
      ts: x.ts, type: x.action, tripId: x.entityId, trip: trips[x.entityId],
      detail: x.summary || '—', user: x.user || '—'
    });
  });

  var mf = getManifests();
  Object.keys(mf).forEach(function (tripId) {
    var m = mf[tripId];
    if (!m) return;
    if (m.createdAt && toLocalDateStr(m.createdAt) === dateStr) {
      events.push({
        ts: new Date(m.createdAt).getTime(), type: 'depart', tripId: tripId, trip: trips[tripId],
        detail: 'Xuất phơi biển số ' + (m.plate || '—') + ' — Tài xế ' + (m.driver || '—'), user: m.createdBy || '—'
      });
    }
    if (m.closedAt && toLocalDateStr(m.closedAt) === dateStr) {
      events.push({
        ts: new Date(m.closedAt).getTime(), type: 'close', tripId: tripId, trip: trips[tripId],
        detail: 'Kết ca phơi', user: m.closedBy || '—'
      });
    }
  });

  var reopen = lsRead(TO_REOPEN_KEY, {});
  Object.keys(reopen).forEach(function (tripId) {
    (reopen[tripId] || []).forEach(function (ev) {
      if (ev.time && toLocalDateStr(ev.time) === dateStr) {
        events.push({
          ts: new Date(ev.time).getTime(), type: 'reopen-open', tripId: tripId, trip: trips[tripId],
          detail: 'Mở Re-open lần ' + (ev.sequence != null ? ev.sequence : '—') + (ev.reason ? ' — ' + ev.reason : ''),
          user: ev.staffId || '—'
        });
      }
      if (ev.closedAt && toLocalDateStr(ev.closedAt) === dateStr) {
        events.push({
          ts: new Date(ev.closedAt).getTime(), type: 'reopen-close', tripId: tripId, trip: trips[tripId],
          detail: 'Đóng Re-open lần ' + (ev.sequence != null ? ev.sequence : '—') + ' — ' + (ev.ticketsAdded || 0) + ' vé thêm',
          user: ev.closedBy || '—'
        });
      }
    });
  });

  return events.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
}

/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */
function renderTicketOfficeView() {
  var tab = TICKET_OFFICE_TAB;
  var tabBtn = function (key, label) {
    return '<button type="button" class="station-subtab' + (tab === key ? ' active' : '') + '" data-action="setTicketOfficeTab" data-args=\'["' + key + '"]\'>' + esc(label) + '</button>';
  };

  var body;
  if (tab === 'depart') body = toRenderDepartTab();
  else if (tab === 'reopen') body = toRenderReopenTab();
  else if (tab === 'daily') body = toRenderDailyTab();
  else body = toRenderCancelledTab();

  $('viewTicketOffice').innerHTML =
    '<div class="station-subtabs">' +
      tabBtn('depart', 'Lịch sử khởi hành xe') +
      tabBtn('reopen', 'Lịch sử Re-open') +
      tabBtn('daily', 'Phơi trong ngày') +
      tabBtn('cancelled', 'Phơi đã hủy') +
    '</div>' +
    body;

  adminCalUpdateTrigger(TO_NS[tab]);
}

function setTicketOfficeTab(tab) { TICKET_OFFICE_TAB = tab; renderTicketOfficeView(); }
function toFilterInput(tab, field, val) {
  if (!TO_FILTERS[tab] || !(field in TO_FILTERS[tab])) return;
  TO_FILTERS[tab][field] = val || '';
  adminKeepFocus(renderTicketOfficeView);
}
function toResetFilter(tab, ns) {
  TO_FILTERS[tab] = toEmptyFilterSet();
  adminCalState(ns).selectedStr = '';
  renderTicketOfficeView();
}

function toCardHtml(title, countLabel, tableHtml) {
  return '<div class="sd-blocks"><div class="sd-section-block">' +
    '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
      '<span>' + esc(title) + '</span>' +
      '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + esc(countLabel) + '</span>' +
    '</div>' +
    '<div class="sd-table-wrap">' + tableHtml + '</div>' +
  '</div></div>';
}

function toRenderDepartTab() {
  var ns = TO_NS.depart;
  adminCalInit(ns, function () { renderTicketOfficeView(); });
  var selectedDate = adminCalState(ns).selectedStr;
  var f = TO_FILTERS.depart;
  var kw = f.search.toLowerCase();

  var rows = toGetDepartures().filter(function (r) {
    if (selectedDate && r.date !== selectedDate) return false;
    if (!toTripMatchesFilters(r.trip, f)) return false;
    if (kw) {
      var hay = (toTripLabel(r.trip, r.tripId) + ' ' + r.plate + ' ' + r.driver + ' ' + r.helper).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    return true;
  });

  var rowsHtml = rows.map(function (r, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td><span class="ch-trip-link" data-action="toGoToTrip">' + esc(toTripLabel(r.trip, r.tripId)) + '</span></td>' +
      '<td class="mono">' + esc(r.plate) + '</td>' +
      '<td style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + esc(r.driver + (r.helper ? ' / ' + r.helper : '')) + '">' + esc(r.driver) + (r.helper ? ' / ' + esc(r.helper) : '') + '</td>' +
      '<td class="mono" style="text-align:center;">' + esc(fmtDate(r.date)) + ' ' + esc(r.time || '—') + '</td>' +
      '<td class="mono" style="text-align:center; color:var(--text-sub);">' + esc(fmtStamp(r.createdAt)) + '</td>' +
      '<td>' + toLifecycleBadge(r.status) + '</td>' +
      '<td>' + esc(r.createdBy) + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table" style="table-layout:fixed;">' +
    '<thead><tr><th style="width:50px;">STT</th><th style="width:255px;">Tên phơi</th><th style="width:113px;">Biển số</th><th style="width:250px; white-space:nowrap;">Tài xế / Phụ xe</th><th style="width:110px;">Giờ chạy</th><th style="width:110px;">Khởi hành</th><th style="width:110px;">Trạng thái</th><th style="width:100px;">NV chốt</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có phơi nào khởi hành' + (selectedDate ? ' trong ngày đã chọn' : '') + '.</p></div>');

  return '<div class="sd-toolbar">' +
      '<div class="filter-field"><label>Tìm kiếm</label><input type="text" value="' + esc(f.search) + '" placeholder="Tên phơi, biển số, tài xế..." data-input-action="toFilterInput" data-args=\'["depart","search","__this_value__"]\'></div>' +
      toDirStationFieldsHtml('depart', f) +
      adminCalFieldHtml(ns, 'Ngày khởi hành') +
      '<div class="filter-reset"><button type="button" class="btn btn-secondary" data-action="toResetFilter" data-args=\'["depart","' + ns + '"]\'>Đặt lại</button></div>' +
    '</div>' +
    toCardHtml('Lịch sử khởi hành xe', rows.length + ' lượt khởi hành', table);
}

function toRenderReopenTab() {
  var ns = TO_NS.reopen;
  adminCalInit(ns, function () { renderTicketOfficeView(); });
  var selectedDate = adminCalState(ns).selectedStr;
  var f = TO_FILTERS.reopen;
  var kw = f.search.toLowerCase();

  var rows = toGetReopenEvents().filter(function (r) {
    var d = r.time ? toLocalDateStr(r.time) : '';
    if (selectedDate && d !== selectedDate) return false;
    if (!toTripMatchesFilters(r.trip, f)) return false;
    if (kw) {
      var hay = (toTripLabel(r.trip, r.tripId) + ' ' + (r.staffId || '') + ' ' + (r.reason || '')).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    return true;
  });

  var rowsHtml = rows.map(function (r, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td><span class="ch-trip-link" data-action="toGoToTrip">' + esc(toTripLabel(r.trip, r.tripId)) + '</span></td>' +
      '<td class="mono" style="text-align:center;">#' + esc(r.sequence != null ? r.sequence : '—') + '</td>' +
      '<td>' + esc(r.staffId || '—') + '</td>' +
      '<td title="' + esc(r.reason || '') + '"><span class="pax-note-clamp">' + esc(r.reason || '—') + '</span></td>' +
      '<td class="mono" style="color:var(--text-sub);">' + esc(fmtStamp(r.time)) + '</td>' +
      '<td class="mono" style="color:var(--text-sub);">' + (r.closedAt ? esc(fmtStamp(r.closedAt)) : '—') + '</td>' +
      '<td>' + toReopenStatusBadge(r.status) + '</td>' +
      '<td class="mono" style="text-align:center;">' + (r.ticketsAdded != null ? r.ticketsAdded : '—') + '</td>' +
      '<td style="text-align:right;">' + (r.amountAdded ? fmtMoney(r.amountAdded) : '—') + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Tên phơi</th><th>Lần</th><th>NV mở</th><th>Lý do</th><th>Giờ mở</th><th>Giờ đóng</th><th>Trạng thái</th><th>Vé thêm</th><th>Doanh thu thêm</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có lượt Re-open nào' + (selectedDate ? ' trong ngày đã chọn' : '') + '.</p></div>');

  return '<div class="sd-toolbar">' +
      '<div class="filter-field"><label>Tìm kiếm</label><input type="text" value="' + esc(f.search) + '" placeholder="Tên phơi, nhân viên, lý do..." data-input-action="toFilterInput" data-args=\'["reopen","search","__this_value__"]\'></div>' +
      toDirStationFieldsHtml('reopen', f) +
      adminCalFieldHtml(ns, 'Ngày mở Re-open') +
      '<div class="filter-reset"><button type="button" class="btn btn-secondary" data-action="toResetFilter" data-args=\'["reopen","' + ns + '"]\'>Đặt lại</button></div>' +
    '</div>' +
    toCardHtml('Lịch sử Re-open', rows.length + ' lượt Re-open', table);
}

function toRenderDailyTab() {
  var ns = TO_NS.daily;
  adminCalInit(ns, function () { renderTicketOfficeView(); });
  var st = adminCalState(ns);
  // Tab này xem theo TỪNG NGÀY — không có khái niệm "Tất cả ngày" như các tab khác, nên khi chưa
  // chọn (hoặc bấm "Tất cả"/"Đặt lại") luôn quy về hôm nay thay vì gộp toàn bộ lịch sử vào 1 bảng.
  // Lấy "hôm nay" theo giờ ĐỊA PHƯƠNG (giống hệt nút "Hôm nay" trong lịch — adminCalGoToday), KHÔNG
  // dùng todayISO() (UTC) — nếu không 2 cách sẽ ra 2 ngày khác nhau vào khung giờ khuya ở múi giờ VN.
  if (!st.selectedStr) st.selectedStr = toLocalDateStr(new Date());
  var effDate = st.selectedStr;
  var f = TO_FILTERS.daily;
  var kw = f.search.toLowerCase();

  var events = toGetDailyEvents(effDate).filter(function (e) {
    if (!toTripMatchesFilters(e.trip, f)) return false;
    if (kw) {
      var hay = (toTripLabel(e.trip, e.tripId) + ' ' + e.detail + ' ' + e.user).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    return true;
  });

  var rowsHtml = events.map(function (e, idx) {
    var meta = toActionMeta(e.type);
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="color:var(--text-sub);">' + esc(fmtStamp(e.ts)) + '</td>' +
      '<td><span class="ch-trip-link" data-action="toGoToTrip">' + esc(toTripLabel(e.trip, e.tripId)) + '</span></td>' +
      '<td><span class="status-badge ' + meta.cls + '"><span class="status-dot"></span>' + esc(meta.label) + '</span></td>' +
      '<td title="' + esc(e.detail) + '"><span class="pax-note-clamp">' + esc(e.detail) + '</span></td>' +
      '<td>' + esc(e.user) + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Thời gian</th><th>Tên phơi</th><th>Sự kiện</th><th>Chi tiết</th><th>Nhân viên</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có diễn biến phơi nào trong ngày ' + esc(fmtDate(effDate)) + '.</p></div>');

  return '<div class="sd-toolbar">' +
      '<div class="filter-field"><label>Tìm kiếm</label><input type="text" value="' + esc(f.search) + '" placeholder="Tên phơi, nhân viên, nội dung..." data-input-action="toFilterInput" data-args=\'["daily","search","__this_value__"]\'></div>' +
      toDirStationFieldsHtml('daily', f) +
      adminCalFieldHtml(ns, 'Xem theo ngày') +
      '<div class="filter-reset"><button type="button" class="btn btn-secondary" data-action="toResetFilter" data-args=\'["daily","' + ns + '"]\'>Về hôm nay</button></div>' +
    '</div>' +
    toCardHtml('Toàn bộ diễn biến phơi ngày ' + fmtDate(effDate), events.length + ' sự kiện', table);
}

function toRenderCancelledTab() {
  var ns = TO_NS.cancelled;
  adminCalInit(ns, function () { renderTicketOfficeView(); });
  var selectedDate = adminCalState(ns).selectedStr;
  var f = TO_FILTERS.cancelled;
  var kw = f.search.toLowerCase();

  var rows = toGetCancelledTrips().filter(function (r) {
    if (selectedDate && r.trip.date !== selectedDate) return false;
    if (!toTripMatchesFilters(r.trip, f)) return false;
    if (kw) {
      var hay = (toTripLabel(r.trip, r.trip.id) + ' ' + (r.trip.plate || '') + ' ' + r.cancelledBy + ' ' + r.reason).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    return true;
  });

  var rowsHtml = rows.map(function (r, idx) {
    var t = r.trip;
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td><span class="ch-trip-link" data-action="toGoToTrip">' + esc(toTripLabel(t, t.id)) + '</span></td>' +
      '<td class="mono">' + esc(t.plate || '—') + '</td>' +
      '<td class="mono">' + esc(fmtDate(t.date)) + ' ' + esc(t.time || '—') + '</td>' +
      '<td>' + esc(t.route || '—') + '</td>' +
      '<td title="' + esc(r.reason || '') + '"><span class="pax-note-clamp">' + esc(r.reason || '—') + '</span></td>' +
      '<td class="mono" style="color:var(--text-sub);">' + (r.cancelledAt ? esc(fmtStamp(r.cancelledAt)) : '—') + '</td>' +
      '<td>' + esc(r.cancelledBy) + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Tên phơi</th><th>Biển số</th><th>Ngày giờ chạy</th><th>Tuyến</th><th>Lý do hủy</th><th>Thời điểm hủy</th><th>Người hủy</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có phơi nào bị hủy' + (selectedDate ? ' trong ngày đã chọn' : '') + '.</p></div>');

  return '<div class="sd-toolbar">' +
      '<div class="filter-field"><label>Tìm kiếm</label><input type="text" value="' + esc(f.search) + '" placeholder="Tên phơi, biển số, người hủy, lý do..." data-input-action="toFilterInput" data-args=\'["cancelled","search","__this_value__"]\'></div>' +
      toDirStationFieldsHtml('cancelled', f) +
      adminCalFieldHtml(ns, 'Ngày chạy') +
      '<div class="filter-reset"><button type="button" class="btn btn-secondary" data-action="toResetFilter" data-args=\'["cancelled","' + ns + '"]\'>Đặt lại</button></div>' +
    '</div>' +
    toCardHtml('Phơi đã hủy', rows.length + ' phơi', table);
}
