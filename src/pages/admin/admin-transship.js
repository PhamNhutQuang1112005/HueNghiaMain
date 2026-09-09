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
    ? '<span style="font-weight:700;color:var(--black);">' + esc(r.fromStation) + '</span>' +
      '<div style="font-size:12px;color:var(--red);font-weight:600;margin-top:2px;">📍 Đón: ' + esc(r.fromTransfer) + '</div>'
    : '<span style="font-weight:700;color:var(--black);">' + esc(r.fromStation) + '</span>';

  var lastStopHtml = r.toTransfer
    ? '<span style="font-weight:700;color:var(--black);">' + esc(r.toStation) + '</span>' +
      '<div style="font-size:12px;color:#059669;font-weight:600;margin-top:2px;">🏁 Trả: ' + esc(r.toTransfer) + '</div>'
    : '<span style="font-weight:700;color:var(--black);">' + esc(r.toStation) + '</span>';

  return '<div class="pax-route">' +
    '<div class="pax-route-row pax-route-from"><div class="pax-route-text">' + firstStopHtml + '</div></div>' +
    '<div class="pax-route-connector"></div>' +
    '<div class="pax-route-row pax-route-to"><div class="pax-route-text">' + lastStopHtml + '</div></div>' +
  '</div>';
}

var TS_STATUS_LABELS = {
  waiting: { text: 'Chờ điều phối', cls: 'status-badge chua-chi-dinh' },
  enroute: { text: 'Đang trung chuyển', cls: 'status-badge da-chi-dinh' },
  onboard: { text: 'Đã đón', cls: 'status-badge dang-ban' },
  issue: { text: 'Không đón được', cls: 'status-badge da-huy' }
};

function tsRenderRow(r, idx) {
  var timeStr = function (iso) { return iso ? (fmtDate(String(iso).slice(0, 10)) + '<br>' + (fmtStamp(iso).split(' ')[1] || '')) : '—'; };
  var seatCell = r.seat ? '<span class="trip-plate-inline" style="background:var(--red-light);color:var(--red);border-color:var(--red-border);">' + esc(r.seat) + '</span>' : '<span style="color:var(--text-sub);">—</span>';
  var status = r.driver ? (r.driver.status || 'waiting') : null;
  var statusCell = status ? '<span class="' + (TS_STATUS_LABELS[status] ? TS_STATUS_LABELS[status].cls : 'status-badge chua-chi-dinh') + '"><span class="status-dot"></span>' + (TS_STATUS_LABELS[status] ? TS_STATUS_LABELS[status].text : status) + '</span>' : '<span style="color:var(--text-sub);">—</span>';
  var driverHtml = r.driver
    ? '<div style="font-weight:700;color:var(--black);">' + esc(r.driver.driverName || '') + '</div>' + (r.driver.driverNote ? '<div style="font-size:11.5px;color:var(--text-sub);">' + esc(r.driver.driverNote) + '</div>' : '')
    : '<span class="status-badge chua-chi-dinh"><span class="status-dot"></span>Chưa gán</span>';
  var phongVeHtml = r.statusNote ? '<span style="font-size:12.5px;color:var(--text-main);">' + esc(r.statusNote) + '</span>' : '<span style="color:var(--text-sub);">—</span>';
  return '<tr>' +
    '<td class="col-stt" style="font-weight:700;color:var(--text-sub);text-align:center;">' + (idx + 1) + '</td>' +
    '<td><div class="pax-info"><div style="font-weight:800;font-size:14px;color:var(--black);">' + esc(r.name || '—') + '</div><div style="font-size:12.5px;font-weight:600;color:var(--text-sub);">' + esc(r.phone || '—') + '</div></div></td>' +
    '<td>' + tsRouteHtml(r) + '</td>' +
    '<td style="text-align:center;font-weight:800;font-size:14px;color:var(--black);">' + (r.ticketCount || 1) + '</td>' +
    '<td style="text-align:center;">' + seatCell + '</td>' +
    '<td>' + (r.note ? esc(r.note) : '<span style="color:var(--text-sub);">—</span>') + '</td>' +
    '<td style="text-align:center;font-size:12px;color:var(--text-sub);font-family:\'Roboto Mono\',monospace;">' + timeStr(r.createdAt) + '</td>' +
    '<td style="text-align:center;font-size:12px;color:var(--text-sub);font-family:\'Roboto Mono\',monospace;">' + timeStr(r.printedAt) + '</td>' +
    '<td style="text-align:center;">' + statusCell + '</td>' +
    '<td style="text-align:center;">' + driverHtml + '</td>' +
    '<td>' + phongVeHtml + '</td>' +
    '<td class="col-check" style="text-align:center;"><input type="checkbox" disabled style="min-width:auto;height:auto;"></td>' +
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
      '<!-- OVERVIEW STATS METRICS -->' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng lượt trung chuyển</div>' +
          '<div class="dir-stat-val">' + cnt.all + '</div>' +
          '<div class="dir-stat-sub">Tất cả yêu cầu đón / trả</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Trung chuyển đón</div>' +
          '<div class="dir-stat-val" style="color:var(--red);">' + cnt.don + '</div>' +
          '<div class="dir-stat-sub">Địa chỉ đón tận nơi</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Rước liền</div>' +
          '<div class="dir-stat-val" style="color:#0284C7;">' + cnt.ruoclien + '</div>' +
          '<div class="dir-stat-sub">Khách đặt rước trực tiếp</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Trung chuyển trả</div>' +
          '<div class="dir-stat-val" style="color:#059669;">' + cnt.tra + '</div>' +
          '<div class="dir-stat-sub">Địa chỉ trả tận nơi</div>' +
        '</div>' +
      '</div>' +

      '<!-- SUBTABS PILL NAVIGATION -->' +
      '<div class="ref-card dir-tabs-card" style="margin-bottom: 20px;">' +
        '<div class="dir-tabs-header">' +
          '<div class="dir-pills-list">' +
            '<button type="button" class="dir-pill-btn' + (TRANSSHIP_SUBTAB === 'all' ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["all"]\'>' +
              'Tất cả <span class="dir-cnt-badge">' + cnt.all + '</span>' +
            '</button>' +
            '<button type="button" class="dir-pill-btn' + (TRANSSHIP_SUBTAB === 'don' ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["don"]\'>' +
              'Trung chuyển đón <span class="dir-cnt-badge">' + cnt.don + '</span>' +
            '</button>' +
            '<button type="button" class="dir-pill-btn' + (TRANSSHIP_SUBTAB === 'ruoclien' ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["ruoclien"]\'>' +
              'Rước liền <span class="dir-cnt-badge">' + cnt.ruoclien + '</span>' +
            '</button>' +
            '<button type="button" class="dir-pill-btn' + (TRANSSHIP_SUBTAB === 'tra' ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["tra"]\'>' +
              'Trung chuyển trả <span class="dir-cnt-badge">' + cnt.tra + '</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- FILTER TOOLBAR -->' +
      '<div class="filter-toolbar" style="margin-bottom: 20px;">' +
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

      '<!-- TABLE CARD -->' +
      '<div class="ref-card" style="padding:0; overflow:hidden;">' +
        '<div class="ref-card-header" style="padding:18px 22px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">' +
          '<div style="font-size:15px; font-weight:800; color:var(--black);">Danh sách đón / trả trung chuyển</div>' +
          '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">Hiển thị ' + list.length + ' / ' + byTab.length + ' hành khách</div>' +
        '</div>' +
        '<div class="table-wrap" style="border:0; border-radius:0; box-shadow:none;">' +
          '<table class="admin-table shuttle-table">' +
            '<colgroup>' +
              '<col style="width:44px">' +   /* STT */
              '<col style="width:160px">' +  /* Khách hàng */
              '<col>' +                       /* Hành trình */
              '<col style="width:44px">' +   /* SL */
              '<col style="width:80px">' +   /* Số ghế */
              '<col style="width:120px">' +  /* Ghi chú */
              '<col style="width:90px">' +   /* Thời gian */
              '<col style="width:90px">' +   /* In lúc */
              '<col style="width:130px">' +  /* Trạng thái */
              '<col style="width:150px">' +  /* Tài xế TC */
              '<col style="width:130px">' +  /* Ghi chú PV */
              '<col style="width:44px">' +   /* Checkbox */
            '</colgroup>' +
            '<thead><tr>' +
              '<th class="col-stt" style="text-align:center;">STT</th>' +
              '<th>Khách hàng</th>' +
              '<th>Hành trình & Địa chỉ</th>' +
              '<th style="text-align:center;">SL</th>' +
              '<th style="text-align:center;">Số ghế</th>' +
              '<th>Ghi chú</th>' +
              '<th style="text-align:center;">Thời gian</th>' +
              '<th style="text-align:center;">In lúc</th>' +
              '<th class="col-status" style="text-align:center;">Trạng thái</th>' +
              '<th style="text-align:center;">Tài xế trung chuyển</th>' +
              '<th>Ghi chú phòng vé</th>' +
              '<th class="col-check" style="text-align:center;"><input type="checkbox" disabled style="min-width:auto;height:auto;"></th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
          (rowsHtml ? '' : '<div class="empty-state">Không có hành khách nào phù hợp với điều kiện lọc hiện tại.</div>') +
        '</div>' +
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
