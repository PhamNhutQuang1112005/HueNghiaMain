/* =========================================================
   DANH SÁCH VÉ — dựng ĐÚNG y html/class của tab "Lịch sử" trên header TicketStaff (#historyView /
   .pax-table.pax-table--history trong shared/js/booking.js), thêm 2 tab kiểu .pk-subtabs "Tất cả" /
   "Đã đặt" (yêu cầu riêng của Admin, TicketStaff không có) để lọc nhanh vé chưa thu tiền. Tự đọc trips
   (TripService) + seat bank (HN_STORAGE_KEY) mỗi lần render, KHÔNG dùng biến toàn cục allTripsMeta/
   tripSeatBank của ticketstaff.js (trang admin không nạp trang đó).
   ========================================================= */
var TICKET_SUBTAB = 'all'; // 'all' | 'hold'
var TICKET_FILTERS = { search: '', direction: '', route: '', time: '', staff: '' };

// id HƯỚNG (1 trong 4 hướng cố định) của 1 tuyến — ưu tiên FleetStore, fallback theo sense/tiền tố tên.
function tkRouteDirectionId(route) {
  var id = FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(route) : null;
  if (id) return id;
  var di = FleetStore.getRouteSense ? FleetStore.getRouteSense(route) === 'di' : String(route || '').indexOf('Sài Gòn') === 0;
  return di ? 'sg-ag' : 'ag-sg';
}

function adminScanTicketRows() {
  var trips = getTrips();
  var seatBank = lsRead(HN_STORAGE_KEY, {});
  var rows = [];
  trips.forEach(function (t) {
    var bank = seatBank[t.id];
    if (!bank) return;
    var seats = [].concat(bank.down || [], bank.up || [], bank.subSeats || []);
    seats.forEach(function (seat) {
      if (!seat || ['sold', 'hold', 'free', 'cargo'].indexOf(seat.state) === -1) return;
      rows.push({
        tripId: t.id, route: t.route || '—', time: t.time || '', date: t.date || '',
        plate: bank.plate || t.plate || '', vehicleType: bank.vehicleType || t.vehicleType || '',
        driver: bank.driver || '', helper: bank.helper || '',
        name: seat.customerName || '—', phone: seat.phone || '—',
        firstStop: seat.firstStop || t.fromStation || '—', lastStop: seat.lastStop || t.toStation || '—',
        seat: seat.code || '—', price: seat.price || 0, state: seat.state,
        paid: !!seat.paid, staff: seat.staff || '', note: seat.note || '', actionTime: seat.actionTime || ''
      });
    });
  });
  return rows.sort(function (a, b) { return (b.actionTime || '').localeCompare(a.actionTime || ''); });
}

function tkRouteHtml(r) {
  return '<div class="pax-route">' +
    '<div class="pax-route-row pax-route-from"><svg class="pax-route-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg><div class="pax-route-text">' + esc(r.firstStop) + '</div></div>' +
    '<div class="pax-route-connector"></div>' +
    '<div class="pax-route-row pax-route-to"><svg class="pax-route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg><div class="pax-route-text">' + esc(r.lastStop) + '</div></div>' +
  '</div>';
}

function tkRenderRow(r, idx) {
  var bookStaffStr = getStaffCode(r.staff) || 'NV01';
  var sellStaffStr = r.paid ? (getStaffCode(r.staff) || 'NV05') : '—';
  var staffTagsHtml = '<div class="staff-tag-stack">' +
    '<span class="staff-tag staff-tag-book">' + esc(bookStaffStr) + '</span>' +
    (sellStaffStr === '—' ? '<span class="staff-tag staff-tag-empty">—</span>' : '<span class="staff-tag staff-tag-sell">' + esc(sellStaffStr) + '</span>') +
  '</div>';
  var actionTimeStr = r.actionTime ? (fmtDate(r.date) + ' ' + (fmtStamp(r.actionTime).split(' ')[1] || '')) : '—';
  var priceStr = r.price ? fmtMoney(r.price) : '—';
  var tripTitle = 'Biển số xe: ' + (r.plate || '—') + ' • Loại xe: ' + (r.vehicleType || '—') + ' • Tài xế: ' + (r.driver || '—') + ' • Phụ xe: ' + (r.helper || '—');

  return '<tr>' +
    '<td style="text-align:center;font-weight:600;color:var(--text-sub);">' + (idx + 1) + '</td>' +
    '<td><span class="ch-trip-link" title="' + esc(tripTitle) + '">' + esc(r.route) + ' — ' + esc(r.time) + '</span></td>' +
    '<td class="ch-col-ellipsis" title="' + esc(r.name) + '">' + esc(r.name) + '</td>' +
    '<td class="mono ch-col-nowrap">' + esc(r.phone) + '</td>' +
    '<td>' + tkRouteHtml(r) + '</td>' +
    '<td class="mono">1</td>' +
    '<td class="mono">' + esc(r.seat) + '</td>' +
    '<td style="text-align:right;">' + priceStr + '</td>' +
    '<td title="' + esc(r.note) + '">' + (r.note ? '<span class="pax-note-clamp">' + esc(r.note) + '</span>' : '<span class="pax-note-empty">—</span>') + '</td>' +
    '<td>' + staffTagsHtml + '</td>' +
    '<td class="mono" style="color:var(--text-sub);font-style:italic;">' + actionTimeStr + '</td>' +
    '<td></td>' +
  '</tr>';
}

function renderTicketListView() {
  adminCalInit('tk', function () { renderTicketListView(); });
  var all = adminScanTicketRows();
  var selectedDate = adminCalState('tk').selectedStr;
  var routes = uniq(all.map(function (r) { return r.route; }).filter(Boolean)).sort();
  var staffCodes = uniq(all.map(function (r) { return getStaffCode(r.staff); }).filter(function (s) { return s; })).sort();

  var f = TICKET_FILTERS;
  var list = all.filter(function (r) {
    if (TICKET_SUBTAB === 'hold' && r.state !== 'hold') return false;
    if (f.search) {
      var kw = f.search.toLowerCase();
      var hay = ((r.name || '') + ' ' + (r.phone || '')).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
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

  var countAll = all.length, countHold = all.filter(function (r) { return r.state === 'hold'; }).length;
  var rowsHtml = list.length ? list.map(tkRenderRow).join('') : '';

  $('viewTicketList').innerHTML =
    '<div class="ticket-list-shell">' +
      '<nav class="pk-subtabs">' +
        '<button type="button" class="pk-subtab' + (TICKET_SUBTAB === 'all' ? ' active' : '') + '" data-action="adminTicketSwitchTab" data-args=\'["all"]\'>Tất cả<span class="pk-subtab-count">(' + countAll + ')</span></button>' +
        '<button type="button" class="pk-subtab' + (TICKET_SUBTAB === 'hold' ? ' active' : '') + '" data-action="adminTicketSwitchTab" data-args=\'["hold"]\'>Đã đặt<span class="pk-subtab-count">(' + countHold + ')</span></button>' +
      '</nav>' +
      '<div class="filter-toolbar">' +
        '<div class="filter-field"><label>Tìm kiếm</label><input type="text" value="' + esc(f.search) + '" placeholder="Tên, SĐT khách..." data-input-action="adminTicketFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
        adminCalFieldHtml('tk', 'Ngày đi') +
        '<div class="filter-field"><label>Hướng đi</label><select data-change-action="adminTicketFilterInput" data-args=\'["direction","__this_value__"]\'>' +
          '<option value="">Tất cả hướng</option>' +
          FleetStore.getDirections().filter(function (d) { return d && d.active !== false; })
            .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
            .map(function (d) { return '<option value="' + esc(d.id) + '"' + (f.direction === d.id ? ' selected' : '') + '>' + esc(d.label) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="filter-field"><label>Tuyến đường</label><select data-change-action="adminTicketFilterInput" data-args=\'["route","__this_value__"]\'>' +
          '<option value="">Tất cả tuyến</option>' + routes.map(function (r) { return '<option value="' + esc(r) + '"' + (f.route === r ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') + '</select></div>' +
        '<div class="filter-field"><label>Khung giờ</label><select data-change-action="adminTicketFilterInput" data-args=\'["time","__this_value__"]\'>' +
          '<option value="">Tất cả khung giờ</option>' +
          '<option value="morning"' + (f.time === 'morning' ? ' selected' : '') + '>Sáng (00:00 - 12:00)</option>' +
          '<option value="afternoon"' + (f.time === 'afternoon' ? ' selected' : '') + '>Chiều (12:00 - 18:00)</option>' +
          '<option value="evening"' + (f.time === 'evening' ? ' selected' : '') + '>Tối (18:00 - 24:00)</option></select></div>' +
        '<div class="filter-field"><label>Nhân viên</label><select data-change-action="adminTicketFilterInput" data-args=\'["staff","__this_value__"]\'>' +
          '<option value="">Tất cả nhân viên</option>' + staffCodes.map(function (s) { return '<option value="' + esc(s) + '"' + (f.staff === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
        '<div class="filter-reset"><button type="button" class="btn btn-secondary" data-action="adminResetTicketFilters">Đặt lại bộ lọc</button></div>' +
      '</div>' +
      '<div class="pax-table-wrap pax-table-wrap--history">' +
        '<table class="pax-table pax-table--history pax-table--grid">' +
          '<thead><tr>' +
            '<th>STT</th><th>Chuyến</th><th>Hành khách</th><th>SĐT</th><th>Hành trình</th><th>SL</th>' +
            '<th>Vị trí</th><th>Giá vé</th><th>Ghi chú</th><th>Mã NV</th><th>Thời gian</th><th></th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
        (rowsHtml ? '' : '<div class="grid-empty">Không có vé phù hợp với bộ lọc hiện tại.</div>') +
      '</div>' +
    '</div>';

  adminCalUpdateTrigger('tk');
}

function adminTicketSwitchTab(tab) { TICKET_SUBTAB = tab; renderTicketListView(); }
function adminTicketFilterInput(field, val) {
  if (!(field in TICKET_FILTERS)) return;
  TICKET_FILTERS[field] = val || '';
  renderTicketListView();
}
function adminResetTicketFilters() {
  Object.keys(TICKET_FILTERS).forEach(function (k) { TICKET_FILTERS[k] = ''; });
  adminCalState('tk').selectedStr = '';
  renderTicketListView();
}
