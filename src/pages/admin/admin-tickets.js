/* =========================================================
   DANH SÁCH VÉ (Admin) — dựng ĐẦY ĐỦ chức năng + thiết kế Y CHANG tab "Lịch sử hành khách" trên header
   TicketStaff (#historyView / renderPassengerHistoryTable + renderPhCancelledTable trong shared/js/
   booking.js + booking-rebook.js): thanh lọc (Tìm kiếm / Ngày đi / Hướng đi / Tuyến đường / Khung giờ /
   Nhân viên / Đặt lại / nút "Ghế hủy"), bảng .pax-table--history 12 cột (gộp theo VÉ — mỗi vé 1 dòng,
   nhiều ghế "A1, A2"), nút "Ghế hủy" bật bảng .pax-table--cancelled-all quét cancelledSeats mọi phơi.
   Bố cục PHẲNG như trang Trạm Xe (không panel). Tự đọc trips (TripService) + seat bank (HN_STORAGE_KEY)
   mỗi lần render — KHÔNG dùng allTripsMeta/tripSeatBank của ticketstaff.js.
   ========================================================= */
var TICKET_FILTERS = { search: '', direction: '', route: '', time: '', staff: '' };
var TICKET_CANCELLED_VIEW = false;

function tkRouteDirectionId(route) {
  var id = FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(route) : null;
  if (id) return id;
  var di = FleetStore.getRouteSense ? FleetStore.getRouteSense(route) === 'di' : String(route || '').indexOf('Sài Gòn') === 0;
  return di ? 'sg-ag' : 'ag-sg';
}

/* ---------- Quét seat bank → gộp theo VÉ (ticketNo) như groupHistoryResults ---------- */
function adminScanTicketRows() {
  var trips = getTrips();
  var seatBank = lsRead(HN_STORAGE_KEY, {});
  var map = {};
  trips.forEach(function (t) {
    var bank = seatBank[t.id];
    if (!bank) return;
    [].concat(bank.down || [], bank.up || [], bank.subSeats || [], bank.extraSeats || []).forEach(function (seat) {
      if (!seat || ['sold', 'hold', 'free', 'cargo'].indexOf(seat.state) === -1) return;
      var gk = seat.ticketNo
        ? (t.id + '::' + seat.ticketNo)
        : (t.id + '_' + (seat.phone || '') + '_' + (seat.customerName || '') + '_' + seat.state + '_' + !!seat.paid);
      var g = map[gk];
      if (!g) {
        g = map[gk] = {
          tripId: t.id, route: t.route || '—', time: t.time || '', date: t.date || '',
          plate: bank.plate || t.plate || '', vehicleType: bank.vehicleType || t.vehicleType || '',
          driver: bank.driver || '', helper: bank.helper || '',
          name: seat.customerName || '—', phone: seat.phone || '—',
          firstStop: seat.firstStop || t.fromStation || '—', lastStop: seat.lastStop || t.toStation || '—',
          guestType: seat.guestType || 'Khách trạm',
          transshipStation: seat.transshipStation || seat.transship || '',
          pickupAddress: seat.pickupAddress || '', dropoffAddress: seat.dropoffAddress || '',
          state: seat.state, paid: !!seat.paid, staff: seat.staff || '',
          note: seat.note || '', actionTime: seat.actionTime || '',
          _seats: [], _tickets: [], price: 0
        };
      }
      if (seat.code && g._seats.indexOf(seat.code) === -1) g._seats.push(seat.code);
      if (seat.ticketNo && g._tickets.indexOf(seat.ticketNo) === -1) g._tickets.push(seat.ticketNo);
      g.price += Number(seat.price) || 0;
      if (!g.pickupAddress && seat.pickupAddress) g.pickupAddress = seat.pickupAddress;
      if (!g.dropoffAddress && seat.dropoffAddress) g.dropoffAddress = seat.dropoffAddress;
      if (!g.note && seat.note) g.note = seat.note;
    });
  });
  return Object.keys(map).map(function (k) {
    var g = map[k];
    g.seat = g._seats.join(', ');
    g.seatCount = g._seats.length;
    delete g._seats; delete g._tickets;
    return g;
  }).sort(function (a, b) { return (b.actionTime || '').localeCompare(a.actionTime || ''); });
}

function adminScanCancelledSeats() {
  var trips = getTrips();
  var seatBank = lsRead(HN_STORAGE_KEY, {});
  var rows = [];
  trips.forEach(function (t) {
    var bank = seatBank[t.id];
    if (!bank || !Array.isArray(bank.cancelledSeats)) return;
    bank.cancelledSeats.forEach(function (item) {
      var o = {}; for (var kk in item) if (Object.prototype.hasOwnProperty.call(item, kk)) o[kk] = item[kk];
      o.route = t.route || '—'; o.time = t.time || '';
      rows.push(o);
    });
  });
  return rows.sort(function (a, b) { return (b.cancelTime || '').localeCompare(a.cancelTime || ''); });
}

/* Port getHistoryStopsDisplay() — hiển thị điểm đi/đến + dòng phụ "Đón/TC/Rước liền" cho khách trung chuyển. */
function tkHistoryStops(r) {
  if (!r) return { first: '—', last: '—' };
  var type = r.guestType || 'Khách trạm';
  var first = esc(r.firstStop || '—'), last = esc(r.lastStop || '—');
  var pickupLoc = r.transshipStation || r.transship || r.pickupAddress || r.fromTransfer || '';
  var dropLoc = r.dropoffAddress || r.arrivalTransfer || (type === 'Trung chuyển' ? (r.transshipStation || r.transship || '') : '');
  var sub = function (label, loc) { return '<div class="ch-sub-address" style="font-size:12px;color:var(--text-sub);margin-top:2px;">' + label + esc(loc) + '</div>'; };
  if (type === 'Rước liền' && pickupLoc) first = esc(r.firstStop || 'Trạm đi') + sub('Rước liền: ', pickupLoc);
  else if (type === 'Rước đường' && pickupLoc) first = esc(r.firstStop || 'Trạm đi') + sub('Rước: ', pickupLoc);
  else if (type === 'Trung chuyển' && pickupLoc) first = esc(r.firstStop || 'Trạm đi') + sub('Đón: ', pickupLoc);
  if (dropLoc) last = esc(r.lastStop || 'Trạm đến') + sub(type === 'Trung chuyển' ? 'TC: ' : '', dropLoc);
  return { first: first, last: last };
}

function tkRouteHtml(first, last) {
  return '<div class="pax-route">' +
    '<div class="pax-route-row pax-route-from"><svg class="pax-route-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg><div class="pax-route-text">' + first + '</div></div>' +
    '<div class="pax-route-connector"></div>' +
    '<div class="pax-route-row pax-route-to"><svg class="pax-route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg><div class="pax-route-text">' + last + '</div></div>' +
  '</div>';
}

function tkRenderRow(r, idx) {
  var stops = tkHistoryStops(r);
  var bookStaff = getStaffCode(r.staff) || 'NV01';
  var sellStaff = r.paid ? (getStaffCode(r.staff) || 'NV05') : '—';
  var staffTags = '<div class="staff-tag-stack">' +
    '<span class="staff-tag staff-tag-book">' + esc(bookStaff) + '</span>' +
    (sellStaff === '—' ? '<span class="staff-tag staff-tag-empty">—</span>' : '<span class="staff-tag staff-tag-sell">' + esc(sellStaff) + '</span>') +
  '</div>';
  // Cột "Thời gian" gộp ngày + giờ từ CÙNG mốc actionTime (y chang renderPassengerHistoryRowHtml).
  var actionTimeStr = r.actionTime ? (formatHistoryDate(r.actionTime) + ' ' + formatActionTime(r.actionTime)) : '—';
  var priceStr = r.price ? fmtMoney(r.price) : '—';
  var tripTitle = 'Biển số xe: ' + (r.plate || '—') + ' • Loại xe: ' + (r.vehicleType || '—') + ' • Tài xế: ' + (r.driver || '—') + ' • Phụ xe: ' + (r.helper || '—');

  return '<tr>' +
    '<td style="text-align:center;font-weight:600;color:var(--text-sub);">' + (idx + 1) + '</td>' +
    '<td><span class="ch-trip-link" data-action="adminTicketGoToTrip" data-args=\'["' + esc(r.tripId) + '"]\' title="' + esc(tripTitle) + '">' + esc(r.route) + ' — ' + esc(r.time) + '</span></td>' +
    '<td class="ch-col-ellipsis" title="' + esc(r.name) + '">' + esc(r.name) + '</td>' +
    '<td class="mono ch-col-nowrap">' + esc(r.phone) + '</td>' +
    '<td>' + tkRouteHtml(stops.first, stops.last) + '</td>' +
    '<td class="mono">' + (r.seatCount || '—') + '</td>' +
    '<td class="mono">' + esc(r.seat || '—') + '</td>' +
    '<td style="text-align:right;">' + priceStr + '</td>' +
    '<td title="' + esc(r.note) + '">' + (r.note ? '<span class="pax-note-clamp">' + esc(r.note) + '</span>' : '<span class="pax-note-empty">—</span>') + '</td>' +
    '<td>' + staffTags + '</td>' +
    '<td class="mono" style="color:var(--text-sub);font-style:italic;">' + actionTimeStr + '</td>' +
  '</tr>';
}

function tkRenderCancelledRow(item, idx) {
  var stops = tkHistoryStops(item);
  var priceStr = item.price ? fmtMoney(item.price) : '—';
  var tripLabel = item.time ? (esc(item.route) + ' — ' + esc(item.time)) : esc(item.route || '—');
  var staffStr = getStaffCode(item.cancelStaff) || item.cancelStaff || '—';
  return '<tr>' +
    '<td style="text-align:center;font-weight:600;color:var(--text-sub);">' + (idx + 1) + '</td>' +
    '<td>' + tripLabel + '</td>' +
    '<td><b>' + esc(item.customerName || '—') + '</b></td>' +
    '<td class="mono">' + esc(item.phone || '—') + '</td>' +
    '<td>' + tkRouteHtml(stops.first, stops.last) + '</td>' +
    '<td class="mono" style="text-align:center;">1</td>' +
    '<td class="mono" style="text-align:center;"><b style="color:var(--red);">' + esc(item.code || '—') + '</b></td>' +
    '<td style="font-weight:600;">' + priceStr + '</td>' +
    '<td style="color:#dc2626;font-weight:600;">' + esc(item.reason || 'Không có lý do') + '</td>' +
    '<td>' + esc(staffStr) + '</td>' +
    '<td class="mono" style="color:var(--text-sub);font-size:13px;">' + esc(item.cancelTime || '—') + '</td>' +
  '</tr>';
}

function renderTicketListView() {
  adminCalInit('tk', function () { renderTicketListView(); });
  var all = adminScanTicketRows();
  var selectedDate = adminCalState('tk').selectedStr;
  var f = TICKET_FILTERS;

  // Tuyến đường lọc theo hướng đang chọn (giống rebuildPhRouteOptions).
  var routePool = all.filter(function (r) { return !f.direction || tkRouteDirectionId(r.route) === f.direction; });
  var routes = uniq(routePool.map(function (r) { return r.route; }).filter(Boolean)).sort();
  var staffCodes = uniq(all.reduce(function (acc, r) {
    var c = getStaffCode(r.staff); if (c) acc.push(c); return acc;
  }, [])).sort();

  var list = all.filter(function (r) {
    if (f.search) {
      var kw = f.search.toLowerCase();
      if (((r.name || '') + ' ' + (r.phone || '')).toLowerCase().indexOf(kw) === -1) return false;
    }
    if (selectedDate && r.date !== selectedDate) return false;
    if (f.direction && tkRouteDirectionId(r.route) !== f.direction) return false;
    if (f.route && r.route !== f.route) return false;
    if (f.time) {
      var hh = parseInt((r.time || '00:00').split(':')[0], 10);
      if (f.time === 'morning' && (hh < 0 || hh >= 12)) return false;
      if (f.time === 'afternoon' && (hh < 12 || hh >= 18)) return false;
      if (f.time === 'evening' && (hh < 18 || hh > 24)) return false;
    }
    if (f.staff && getStaffCode(r.staff) !== f.staff) return false;
    return true;
  });

  var rowsHtml = list.length ? list.map(tkRenderRow).join('') : '';
  var cancelled = TICKET_CANCELLED_VIEW ? adminScanCancelledSeats() : [];
  var cancelledHtml = cancelled.length ? cancelled.map(tkRenderCancelledRow).join('') : '';

  var dirOpts = '<option value="">Tất cả hướng</option>' +
    FleetStore.getDirections().filter(function (d) { return d && d.active !== false; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      .map(function (d) { return '<option value="' + esc(d.id) + '"' + (f.direction === d.id ? ' selected' : '') + '>' + esc(d.label) + '</option>'; }).join('');

  $('viewTicketList').innerHTML =
    '<div class="filter-toolbar">' +
      '<div class="filter-field"><label>Tìm kiếm</label><input type="text" id="tkSearch" value="' + esc(f.search) + '" placeholder="Tên, SĐT khách..." data-input-action="adminTicketFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
      adminCalFieldHtml('tk', 'Ngày đi') +
      '<div class="filter-field"><label>Hướng đi</label><select data-change-action="adminTicketFilterInput" data-args=\'["direction","__this_value__"]\'>' + dirOpts + '</select></div>' +
      '<div class="filter-field"><label>Tuyến đường</label><select data-change-action="adminTicketFilterInput" data-args=\'["route","__this_value__"]\'>' +
        '<option value="">Tất cả tuyến</option>' + routes.map(function (r) { return '<option value="' + esc(r) + '"' + (f.route === r ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-field"><label>Khung giờ</label><select data-change-action="adminTicketFilterInput" data-args=\'["time","__this_value__"]\'>' +
        '<option value="">Tất cả khung giờ</option>' +
        '<option value="morning"' + (f.time === 'morning' ? ' selected' : '') + '>Sáng (00:00 - 12:00)</option>' +
        '<option value="afternoon"' + (f.time === 'afternoon' ? ' selected' : '') + '>Chiều (12:00 - 18:00)</option>' +
        '<option value="evening"' + (f.time === 'evening' ? ' selected' : '') + '>Tối (18:00 - 24:00)</option></select></div>' +
      '<div class="filter-field"><label>Nhân viên</label><select data-change-action="adminTicketFilterInput" data-args=\'["staff","__this_value__"]\'>' +
        '<option value="">Tất cả nhân viên</option>' + staffCodes.map(function (s) { return '<option value="' + esc(s) + '"' + (f.staff === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-reset">' +
        '<button type="button" class="btn btn-secondary" data-action="adminResetTicketFilters">Đặt lại</button>' +
        '<button type="button" class="btn btn-secondary btn-action-red' + (TICKET_CANCELLED_VIEW ? ' active' : '') + '" data-action="adminTicketToggleCancelled">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>Ghế hủy</button>' +
      '</div>' +
    '</div>' +
    (TICKET_CANCELLED_VIEW
      ? '<div class="sd-table-wrap">' +
          '<table class="pax-table pax-table--cancelled-all pax-table--grid">' +
            '<thead><tr><th>STT</th><th>Tên phơi</th><th>Họ và tên</th><th>SĐT</th><th>Hành trình</th><th>SL</th>' +
              '<th>Vị trí</th><th>Số tiền</th><th>Nguyên nhân</th><th>Nhân viên</th><th>Thời gian</th></tr></thead>' +
            '<tbody>' + cancelledHtml + '</tbody>' +
          '</table>' +
          (cancelledHtml ? '' : '<div class="grid-empty">Chưa có ghế hủy nào.</div>') +
        '</div>'
      : '<div class="sd-table-wrap">' +
          '<table class="pax-table pax-table--history pax-table--grid">' +
            '<thead><tr>' +
              '<th>STT</th><th>Tên phơi</th><th>Hành khách</th><th>SĐT</th><th>Hành trình</th><th>SL</th>' +
              '<th>Vị trí</th><th>Giá vé</th><th>Ghi chú</th><th>Mã NV</th><th>Thời gian</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
          (rowsHtml ? '' : '<div class="grid-empty">Không có vé phù hợp với bộ lọc hiện tại.</div>') +
        '</div>');

  adminCalUpdateTrigger('tk');
}

function adminTicketGoToTrip() { switchAdminView('viewTrips'); }
function adminTicketToggleCancelled() { TICKET_CANCELLED_VIEW = !TICKET_CANCELLED_VIEW; renderTicketListView(); }
function adminTicketFilterInput(field, val) {
  if (!(field in TICKET_FILTERS)) return;
  TICKET_FILTERS[field] = val || '';
  if (field === 'direction') TICKET_FILTERS.route = ''; // đổi hướng → reset tuyến (giống rebuildPhRouteOptions)
  adminKeepFocus(renderTicketListView);
}
function adminResetTicketFilters() {
  Object.keys(TICKET_FILTERS).forEach(function (k) { TICKET_FILTERS[k] = ''; });
  adminCalState('tk').selectedStr = '';
  TICKET_CANCELLED_VIEW = false;
  renderTicketListView();
}
