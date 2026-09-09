/* =========================================================
   DANH SÁCH VÉ — dựng ĐÚNG y html/class của tab "Lịch sử" trên header TicketStaff (#historyView /
   .pax-table.pax-table--history trong shared/js/booking.js), thêm 2 tab kiểu .pk-subtabs "Tất cả" /
   "Đã đặt" (yêu cầu riêng của Admin, TicketStaff không có) để lọc nhanh vé chưa thu tiền. Tự đọc trips
   (TripService) + seat bank (HN_STORAGE_KEY) mỗi lần render, KHÔNG dùng biến toàn cục allTripsMeta/
   tripSeatBank của ticketstaff.js (trang admin không nạp trang đó).
   ========================================================= */
var TICKET_SUBTAB = 'all'; // 'all' | 'hold'
var TICKET_FILTERS = { search: '', direction: '', route: '', time: '', staff: '' };
var TICKET_PAGE = 1;
var TICKET_PAGE_SIZE = 50;

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
  var bookStaff = getStaffCode(r.staff) || '—';
  var timeStr = r.actionTime ? fmtStamp(r.actionTime).replace(/^\S+ /, '') : '—';
  var priceStr = r.price ? fmtMoney(r.price) : '—';
  var stateCls = r.state === 'hold' ? 'tk-state-hold' : r.state === 'sold' ? 'tk-state-sold' : 'tk-state-other';
  var stateLabel = r.state === 'hold' ? 'Đã đặt' : r.state === 'sold' ? 'Đã bán' : r.state === 'free' ? 'Miễn phí' : r.state;
  var noteTip = r.note ? ' title="' + esc(r.note) + '"' : '';

  return '<div class="tk-row ' + stateCls + '">' +
    /* Col 1: trip time */
    '<div class="tk-col-time">' +
      '<span class="tk-time">' + esc(r.time || '—') + '</span>' +
      '<span class="tk-date">' + fmtDate(r.date) + '</span>' +
    '</div>' +
    /* Col 2: passenger info */
    '<div class="tk-col-pax">' +
      '<span class="tk-pax-name">' + esc(r.name) + '</span>' +
      '<span class="tk-pax-phone">' + esc(r.phone) + '</span>' +
    '</div>' +
    /* Col 3: route */
    '<div class="tk-col-route">' +
      '<span class="tk-stop tk-stop-from">' + esc(r.firstStop) + '</span>' +
      '<span class="tk-stop-arrow">→</span>' +
      '<span class="tk-stop tk-stop-to">' + esc(r.lastStop) + '</span>' +
    '</div>' +
    /* Col 4: seat + price */
    '<div class="tk-col-seat">' +
      '<span class="tk-seat-badge">' + esc(r.seat) + '</span>' +
      '<span class="tk-price">' + priceStr + '</span>' +
    '</div>' +
    /* Col 5: state badge */
    '<div class="tk-col-state"><span class="tk-state-badge ' + stateCls + '">' + stateLabel + '</span></div>' +
    /* Col 6: staff + time */
    '<div class="tk-col-meta">' +
      '<span class="tk-staff">' + esc(bookStaff) + '</span>' +
      '<span class="tk-time-small">' + timeStr + '</span>' +
    '</div>' +
    /* Col 7: note */
    (r.note ? '<div class="tk-col-note"' + noteTip + '><span class="tk-note">' + esc(r.note) + '</span></div>' : '<div class="tk-col-note"><span class="tk-note-empty">—</span></div>') +
  '</div>';
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

  var countAll  = all.length;
  var countHold = all.filter(function (r) { return r.state === 'hold'; }).length;
  var totalRevenue = all.filter(function (r) { return r.state === 'sold' || r.state === 'free'; })
    .reduce(function (s, r) { return s + (r.price || 0); }, 0);

  // Pagination
  var totalPages = Math.max(1, Math.ceil(list.length / TICKET_PAGE_SIZE));
  if (TICKET_PAGE > totalPages) TICKET_PAGE = totalPages;
  var pageStart = (TICKET_PAGE - 1) * TICKET_PAGE_SIZE;
  var pageList  = list.slice(pageStart, pageStart + TICKET_PAGE_SIZE);

  var statsHtml =
    '<div class="dir-stats-grid">' +
      '<div class="ref-card dir-stat-card">' +
        '<div class="dir-stat-label">Tổng vé</div>' +
        '<div class="dir-stat-val">' + countAll + ' <span class="ref-unit">vé</span></div>' +
        '<div class="dir-stat-sub">Tất cả trạng thái</div>' +
      '</div>' +
      '<div class="ref-card dir-stat-card">' +
        '<div class="dir-stat-label">Đã đặt (chưa thanh toán)</div>' +
        '<div class="dir-stat-val" style="color:var(--red);">' + countHold + ' <span class="ref-unit">vé</span></div>' +
        '<div class="dir-stat-sub">Đang giữ chỗ</div>' +
      '</div>' +
      '<div class="ref-card dir-stat-card">' +
        '<div class="dir-stat-label">Đang hiển thị</div>' +
        '<div class="dir-stat-val">' + list.length + ' <span class="ref-unit">vé</span></div>' +
        '<div class="dir-stat-sub">Khớp bộ lọc hiện tại</div>' +
      '</div>' +
      '<div class="ref-card dir-stat-card ref-card-featured" style="min-height:auto;">' +
        '<div class="ref-featured-head">Doanh thu</div>' +
        '<div class="dir-stat-val" style="font-size:22px;color:#fff;">' + fmtMoney(totalRevenue) + '</div>' +
        '<div class="ref-featured-sub">Vé đã bán</div>' +
      '</div>' +
    '</div>';

  var listHeader = list.length ?
    '<div class="tk-list-header">' +
      '<div class="tk-col-time">Giờ / Ngày</div>' +
      '<div class="tk-col-pax">Hành khách</div>' +
      '<div class="tk-col-route">Hành trình</div>' +
      '<div class="tk-col-seat">Ghế / Giá</div>' +
      '<div class="tk-col-state">Trạng thái</div>' +
      '<div class="tk-col-meta">NV / Giờ đặt</div>' +
      '<div class="tk-col-note">Ghi chú</div>' +
    '</div>' : '';

  var rowsHtml = list.length
    ? pageList.map(tkRenderRow).join('')
    : '<div class="grid-empty">Không có vé phù hợp với bộ lọc hiện tại.</div>';

  // Pagination bar
  var paginationHtml = '';
  if (totalPages > 1) {
    var pages = [];
    // Always show first, last, current ±2
    var shown = {};
    [1, totalPages].forEach(function (p) { shown[p] = true; });
    for (var p = Math.max(1, TICKET_PAGE - 2); p <= Math.min(totalPages, TICKET_PAGE + 2); p++) { shown[p] = true; }
    var keys = Object.keys(shown).map(Number).sort(function (a, b) { return a - b; });
    var prev = null;
    keys.forEach(function (pg) {
      if (prev !== null && pg - prev > 1) pages.push(-1); // ellipsis
      pages.push(pg);
      prev = pg;
    });

    paginationHtml = '<div class="tk-pagination">' +
      '<button class="btn btn-sm' + (TICKET_PAGE <= 1 ? ' disabled' : '') + '" data-action="adminTicketGoPage" data-args=\'[' + (TICKET_PAGE - 1) + ']\'' + (TICKET_PAGE <= 1 ? ' disabled' : '') + '>← Trước</button>' +
      pages.map(function (pg) {
        if (pg === -1) return '<span class="tk-page-ellipsis">…</span>';
        return '<button class="btn btn-sm tk-page-btn' + (pg === TICKET_PAGE ? ' btn-primary' : '') + '" data-action="adminTicketGoPage" data-args=\'[' + pg + ']\'>' + pg + '</button>';
      }).join('') +
      '<button class="btn btn-sm' + (TICKET_PAGE >= totalPages ? ' disabled' : '') + '" data-action="adminTicketGoPage" data-args=\'[' + (TICKET_PAGE + 1) + ']\'' + (TICKET_PAGE >= totalPages ? ' disabled' : '') + '>Sau →</button>' +
      '<span class="tk-page-info">Trang ' + TICKET_PAGE + ' / ' + totalPages + ' · ' + list.length + ' vé</span>' +
    '</div>';
  }

  $('viewTicketList').innerHTML =
    statsHtml +
    '<div class="tk-tabs">' +
      '<button type="button" class="tk-tab' + (TICKET_SUBTAB === 'all' ? ' active' : '') + '" data-action="adminTicketSwitchTab" data-args=\'["all"]\'>Tất cả <span class="tk-tab-count">' + countAll + '</span></button>' +
      '<button type="button" class="tk-tab' + (TICKET_SUBTAB === 'hold' ? ' active' : '') + '" data-action="adminTicketSwitchTab" data-args=\'["hold"]\'>Đã đặt <span class="tk-tab-count">' + countHold + '</span></button>' +
    '</div>' +
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
        '<option value="">Tất cả tuyến</option>' + routes.map(function (rv) { return '<option value="' + esc(rv) + '"' + (f.route === rv ? ' selected' : '') + '>' + esc(rv) + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-field"><label>Khung giờ</label><select data-change-action="adminTicketFilterInput" data-args=\'["time","__this_value__"]\'>' +
        '<option value="">Tất cả</option>' +
        '<option value="morning"' + (f.time === 'morning' ? ' selected' : '') + '>Sáng</option>' +
        '<option value="afternoon"' + (f.time === 'afternoon' ? ' selected' : '') + '>Chiều</option>' +
        '<option value="evening"' + (f.time === 'evening' ? ' selected' : '') + '>Tối</option></select></div>' +
      '<div class="filter-field"><label>Nhân viên</label><select data-change-action="adminTicketFilterInput" data-args=\'["staff","__this_value__"]\'>' +
        '<option value="">Tất cả</option>' + staffCodes.map(function (s) { return '<option value="' + esc(s) + '"' + (f.staff === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="btn" data-action="adminResetTicketFilters">Đặt lại</button>' +
    '</div>' +
    '<div class="tk-list">' +
      listHeader +
      rowsHtml +
    '</div>' +
    paginationHtml;

  adminCalUpdateTrigger('tk');
}

function adminTicketSwitchTab(tab) { TICKET_SUBTAB = tab; TICKET_PAGE = 1; renderTicketListView(); }
function adminTicketFilterInput(field, val) {
  if (!(field in TICKET_FILTERS)) return;
  TICKET_FILTERS[field] = val || '';
  TICKET_PAGE = 1;
  renderTicketListView();
}
function adminResetTicketFilters() {
  Object.keys(TICKET_FILTERS).forEach(function (k) { TICKET_FILTERS[k] = ''; });
  adminCalState('tk').selectedStr = '';
  TICKET_PAGE = 1;
  renderTicketListView();
}
function adminTicketGoPage(page) {
  TICKET_PAGE = page;
  renderTicketListView();
  var el = $('viewTicketList');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
