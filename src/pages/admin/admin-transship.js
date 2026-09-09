/* =========================================================
   TRUNG CHUYỂN — dựng ĐÚNG y html/class của tab "Trung chuyển" trên header TicketStaff (trang
   #pickupView trong ticketstaff.html/ticketstaff-pickup.js): nav .pk-subtabs 4 tab, filter-toolbar,
   bảng .shuttle-table.shuttle-table--grid 12 cột. Chỉ khác ở chỗ Admin XEM TỔNG HỢP mọi phơi/mọi
   ngày (không giới hạn 1 ngày như ticketstaff) và KHÔNG có modal gán tài xế/ghi chú — cột "Trung
   chuyển"/"Phòng vé" hiển thị đúng dữ liệu đã có, không bấm sửa được.
   ========================================================= */
var TRANSSHIP_SUBTAB = 'all'; // 'all' | 'don' | 'ruoclien' | 'tra'
var TRANSSHIP_FILTERS = { search: '', fromStation: '', toStation: '', timeSlot: '' };

function adminShuttleDriverRecord(phone) {
  var map = ShuttleDriverService.getMap();
  return map[String(phone || '').replace(/\s+/g, '') + '_don'] || null;
}

function adminScanTransshipRows() {
  var rows = [];

  // Nguồn 1: khách "Rước liền" đứng riêng.
  PickupService.readFirstNonEmpty([]).forEach(function (p) {
    rows.push({
      kind: 'pk', name: p.name || '', phone: p.phone || '', ticketCount: p.ticketCount || 1,
      date: p.date || '', createdAt: p.createdAt || '', printedAt: p.printedAt || '',
      fromStation: p.fromStation || '—', toStation: p.toStation || '—',
      fromTransfer: p.fromTransfer || '', toTransfer: p.toTransfer || '',
      seat: p.assigned ? (p.assigned.seat || (Array.isArray(p.assigned.seats) ? p.assigned.seats.join(', ') : '')) : '',
      note: p.note || '', statusNote: p.statusNote || '',
      driver: adminShuttleDriverRecord(p.phone)
    });
  });

  // Nguồn 2: khách trên phơi có địa chỉ đón/trả trung chuyển.
  var trips = getTrips();
  var seatBank = lsRead(HN_STORAGE_KEY, {});
  trips.forEach(function (t) {
    var bank = seatBank[t.id];
    if (!bank) return;
    var seats = [].concat(bank.down || [], bank.up || [], bank.subSeats || []);
    seats.forEach(function (seat) {
      if (!seat || ['sold', 'hold', 'free', 'cargo'].indexOf(seat.state) === -1) return;
      var hasTransship = seat.pickupAddress || seat.dropoffAddress || seat.transship || seat.transshipStation;
      if (!hasTransship) return;
      rows.push({
        kind: 'ts', name: seat.customerName || '', phone: seat.phone || '', ticketCount: 1,
        date: t.date || '', createdAt: seat.actionTime || '', printedAt: '',
        fromStation: seat.firstStop || t.fromStation || '—', toStation: seat.lastStop || t.toStation || '—',
        fromTransfer: seat.pickupAddress || '', toTransfer: seat.dropoffAddress || '',
        seat: seat.code || '', note: seat.note || '', statusNote: '',
        driver: adminShuttleDriverRecord(seat.phone)
      });
    });
  });

  return rows;
}

function tsRouteHtml(r) {
  var firstStopHtml = r.fromTransfer
    ? esc(r.fromStation) + '<div style="font-size:12px;color:var(--text-sub);margin-top:2px;">Đón: ' + esc(r.fromTransfer) + '</div>'
    : esc(r.fromStation);
  var lastStopHtml = r.toTransfer
    ? esc(r.toStation) + '<div style="font-size:12px;color:var(--text-sub);margin-top:2px;">Trả: ' + esc(r.toTransfer) + '</div>'
    : esc(r.toStation);
  return '<div class="pax-route">' +
    '<div class="pax-route-row pax-route-from"><svg class="pax-route-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg><div class="pax-route-text">' + firstStopHtml + '</div></div>' +
    '<div class="pax-route-connector"></div>' +
    '<div class="pax-route-row pax-route-to"><svg class="pax-route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg><div class="pax-route-text">' + lastStopHtml + '</div></div>' +
  '</div>';
}

var TS_STATUS_LABELS = {
  waiting: { text: 'Chờ điều phối', cls: 'status-waiting' },
  enroute: { text: 'Đang trung chuyển', cls: 'status-enroute' },
  onboard: { text: 'Đã đón', cls: 'status-onboard' },
  issue: { text: 'Không đón được', cls: 'status-issue' }
};

function tsRenderRow(r, idx) {
  var timeStr = function (iso) { return iso ? (fmtDate(String(iso).slice(0, 10)) + '<br>' + (fmtStamp(iso).split(' ')[1] || '')) : '—'; };
  var seatCell = r.seat ? '<span class="pk-seat-link">' + esc(r.seat) + '</span>' : '<span class="pk-seat-none">_</span>';
  var status = r.driver ? (r.driver.status || 'waiting') : null;
  var statusCell = status ? '<span class="pk-status-tag ' + TS_STATUS_LABELS[status].cls + '">' + TS_STATUS_LABELS[status].text + '</span>' : '<span class="hint-inline">—</span>';
  var driverHtml = r.driver
    ? '<span class="pk-driver-name">' + esc(r.driver.driverName || '') + '</span>' + (r.driver.driverNote ? '<span class="pk-driver-sub">' + esc(r.driver.driverNote) + '</span>' : '')
    : '<span class="pk-driver-name pk-driver-empty">Chưa gán</span>';
  var phongVeHtml = r.statusNote ? '<span class="pk-note-text">' + esc(r.statusNote) + '</span>' : '<span class="hint-inline">—</span>';
  var typeChip = r.kind === 'ts' ? '<div class="pk-type-chip">Trung chuyển</div>' : '';

  return '<tr>' +
    '<td class="col-stt">' + (idx + 1) + '</td>' +
    '<td><div class="pax-info">' + typeChip + '<div class="pax-name">KH: ' + esc(r.name || '—') + '</div><div class="pax-phone">SĐT: ' + esc(r.phone || '—') + '</div></div></td>' +
    '<td>' + tsRouteHtml(r) + '</td>' +
    '<td class="center" style="font-weight:700;font-size:13.5px;">' + (r.ticketCount || 1) + '</td>' +
    '<td class="center">' + seatCell + '</td>' +
    '<td>' + (r.note ? esc(r.note) : '—') + '</td>' +
    '<td class="center mono" style="font-size:12px;color:var(--text-sub);">' + timeStr(r.createdAt) + '</td>' +
    '<td class="center mono" style="font-size:12px;color:var(--text-sub);">' + timeStr(r.printedAt) + '</td>' +
    '<td class="center">' + statusCell + '</td>' +
    '<td class="center">' + driverHtml + '</td>' +
    '<td class="center">' + phongVeHtml + '</td>' +
    '<td class="col-check"><input type="checkbox" disabled></td>' +
  '</tr>';
}

function renderTransshipView() {
  adminCalInit('ts', function () { renderTransshipView(); });
  var all = adminScanTransshipRows();
  var f = TRANSSHIP_FILTERS;
  var selectedDate = adminCalState('ts').selectedStr;

  var stationNames = FleetStore.getStations().map(function (s) { return s.name; }).sort();

  var byTab = all.filter(function (r) {
    if (TRANSSHIP_SUBTAB === 'ruoclien') return r.kind === 'pk';
    if (TRANSSHIP_SUBTAB === 'don') return !!r.fromTransfer;
    if (TRANSSHIP_SUBTAB === 'tra') return !!r.toTransfer;
    return true; // all
  });
  var list = byTab.filter(function (r) {
    if (f.search) {
      var kw = f.search.toLowerCase();
      if (((r.name || '') + ' ' + (r.phone || '')).toLowerCase().indexOf(kw) === -1) return false;
    }
    if (selectedDate && r.date && r.date !== selectedDate) return false;
    if (f.fromStation && r.fromStation !== f.fromStation) return false;
    if (f.toStation && r.toStation !== f.toStation) return false;
    if (f.timeSlot) {
      var hh = r.createdAt ? new Date(r.createdAt).getHours() : null;
      if (hh == null) return false;
      if (f.timeSlot === 'morning' && (hh < 5 || hh >= 12)) return false;
      if (f.timeSlot === 'afternoon' && (hh < 12 || hh >= 18)) return false;
      if (f.timeSlot === 'evening' && (hh < 18 || hh > 24)) return false;
    }
    return true;
  });

  var cnt = {
    all: all.length,
    don: all.filter(function (r) { return !!r.fromTransfer; }).length,
    ruoclien: all.filter(function (r) { return r.kind === 'pk'; }).length,
    tra: all.filter(function (r) { return !!r.toTransfer; }).length
  };

  var rowsHtml = list.length ? list.map(tsRenderRow).join('') : '';

  $('viewTransship').innerHTML =
    '<div class="transship-shell">' +
      '<nav class="pk-subtabs">' +
        '<button type="button" class="pk-subtab' + (TRANSSHIP_SUBTAB === 'all' ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["all"]\'>Tất cả<span class="pk-subtab-count">(' + cnt.all + ')</span></button>' +
        '<button type="button" class="pk-subtab' + (TRANSSHIP_SUBTAB === 'don' ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["don"]\'>Trung chuyển đón<span class="pk-subtab-count">(' + cnt.don + ')</span></button>' +
        '<button type="button" class="pk-subtab' + (TRANSSHIP_SUBTAB === 'ruoclien' ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["ruoclien"]\'>Rước liền<span class="pk-subtab-count">(' + cnt.ruoclien + ')</span></button>' +
        '<button type="button" class="pk-subtab' + (TRANSSHIP_SUBTAB === 'tra' ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["tra"]\'>Trung chuyển trả<span class="pk-subtab-count">(' + cnt.tra + ')</span></button>' +
      '</nav>' +
      '<div class="filter-toolbar">' +
        '<div class="filter-field"><label>Tìm kiếm</label><input type="text" value="' + esc(f.search) + '" placeholder="Tên, SĐT khách..." data-input-action="adminTransshipFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
        adminCalFieldHtml('ts', 'Ngày') +
        '<div class="filter-field"><label>Trạm đi</label><select data-change-action="adminTransshipFilterInput" data-args=\'["fromStation","__this_value__"]\'>' +
          '<option value="">Tất cả trạm đi</option>' + stationNames.map(function (s) { return '<option value="' + esc(s) + '"' + (f.fromStation === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
        '<div class="filter-field"><label>Trạm đến</label><select data-change-action="adminTransshipFilterInput" data-args=\'["toStation","__this_value__"]\'>' +
          '<option value="">Tất cả trạm đến</option>' + stationNames.map(function (s) { return '<option value="' + esc(s) + '"' + (f.toStation === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
        '<div class="filter-field"><label>Khung giờ</label><select data-change-action="adminTransshipFilterInput" data-args=\'["timeSlot","__this_value__"]\'>' +
          '<option value="">Tất cả khung giờ</option>' +
          '<option value="morning"' + (f.timeSlot === 'morning' ? ' selected' : '') + '>Sáng (05:00 - 12:00)</option>' +
          '<option value="afternoon"' + (f.timeSlot === 'afternoon' ? ' selected' : '') + '>Chiều (12:00 - 18:00)</option>' +
          '<option value="evening"' + (f.timeSlot === 'evening' ? ' selected' : '') + '>Tối (18:00 - 24:00)</option>' +
        '</select></div>' +
        '<div class="filter-reset"><button type="button" class="btn btn-secondary" data-action="adminTransshipResetFilters">Đặt lại bộ lọc</button></div>' +
      '</div>' +
      '<div class="pax-table-wrap">' +
        '<table class="shuttle-table shuttle-table--grid">' +
          '<thead><tr>' +
            '<th class="col-stt">STT</th><th>Khách hàng</th><th>Hành trình</th><th>SL</th><th>Số ghế</th>' +
            '<th>Ghi chú</th><th>Thời gian</th><th>In lúc</th><th class="col-status">Trạng thái</th>' +
            '<th>Trung chuyển</th><th>Phòng vé</th><th class="col-check"><input type="checkbox" disabled></th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
        (rowsHtml ? '' : '<div class="grid-empty">Không có hành khách nào phù hợp với điều kiện lọc hiện tại.</div>') +
      '</div>' +
    '</div>';

  adminCalUpdateTrigger('ts');
}

function adminTransshipSwitchTab(tab) { TRANSSHIP_SUBTAB = tab; renderTransshipView(); }
function adminTransshipFilterInput(field, val) {
  if (!(field in TRANSSHIP_FILTERS)) return;
  TRANSSHIP_FILTERS[field] = val || '';
  renderTransshipView();
}
function adminTransshipResetFilters() {
  Object.keys(TRANSSHIP_FILTERS).forEach(function (k) { TRANSSHIP_FILTERS[k] = ''; });
  adminCalState('ts').selectedStr = '';
  renderTransshipView();
}
