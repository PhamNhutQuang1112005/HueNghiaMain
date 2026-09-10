/* =========================================================
   TRUNG CHUYỂN (Admin) — port ĐẦY ĐỦ chức năng + thiết kế của tab "Trung chuyển" trên header
   TicketStaff, GỘP cả 2 role:
     • role "trung chuyển"  → chọn nhiều dòng + thanh nổi "Cập nhật" (gán tài xế / đổi trạng thái đón),
                              cột "Trung chuyển" bấm được để ghi/sửa ghi chú tài xế, nút "In rước".
     • role "phòng vé"      → chọn 1 dòng + "Chỉ định" (mở modal "Chỉ định xe rước": danh sách phơi +
                              sơ đồ ghế ngay trong admin, port từ #assignPickupModal TicketStaff), cột
                              "Phòng vé" bấm được để ghi/sửa ghi chú trạng thái, nút "Rước liền" thêm khách.
   Admin có CẢ 2 nên KHÔNG phân quyền — mọi ô/nút đều bấm được.
   Ghi THẬT: tài xế/trạng thái → ShuttleDriverService (HN_SHUTTLE_DRIVER_KEY, đồng bộ 2 chiều với
   ticketstaff + shuttle.html); chỉ định ghế → seat bank (HN_STORAGE_KEY) + p.assigned (PickupService);
   ghi chú phòng vé (rước liền) → PickupService, (trung chuyển) → seat bank (transshipPickupNote);
   vạch "in rước" → HN_PK_PRINT_RUOC_KEY. Không có bước thanh toán/in vé (thu tiền do phòng vé làm sau).
   Admin XEM TỔNG HỢP mọi phơi/mọi ngày (lọc ngày tuỳ chọn, mặc định "Tất cả ngày").
   ========================================================= */
var TRANSSHIP_SUBTAB = 'all'; // 'all' | 'don' | 'ruoclien' | 'tra'
var TRANSSHIP_FILTERS = { search: '', fromStation: '', toStation: '', timeSlot: '', status: '' };
var ADMIN_TS_SEL = {};        // key dòng đang chọn -> true

/* ---------- Tài xế trung chuyển: khoá + bản ghi (khớp shuttleDriverLegKey bên shuttle.js) ---------- */
function adminTsDriverLegKey(phone) { return String(phone || '').replace(/\s+/g, '') + '_don'; }
function adminShuttleDriverRecord(phone) { return ShuttleDriverService.getMap()[adminTsDriverLegKey(phone)] || null; }

/* Loại xe + biển số mặc định theo từng tài xế (HN_SHUTTLE_DRIVER_VEHICLE_KEY) — chọn tài xế trong modal
   "Cập nhật" thì 2 ô tự điền; nút "Gán" ghi đè map này. */
function adminTsReadDriverVehMap() {
  try { var r = localStorage.getItem(HN_SHUTTLE_DRIVER_VEHICLE_KEY); return r ? (JSON.parse(r) || {}) : {}; }
  catch (e) { return {}; }
}
function adminTsWriteDriverVehMap(m) {
  try { localStorage.setItem(HN_SHUTTLE_DRIVER_VEHICLE_KEY, JSON.stringify(m || {})); } catch (e) { }
}

function adminTsDriverPool() {
  try {
    var list = FleetStore.getStaff({ role: 'shuttle_driver' })
      .filter(function (s) { return s.active !== false; })
      .map(function (s) { return { id: s.code || s.name, driverName: s.name, driverPhone: s.phone || '', license: s.license || '' }; });
    if (list.length) return list;
  } catch (e) { /* fallback */ }
  return [
    { id: 'TX01', driverName: 'Nguyễn Văn Bình', driverPhone: '0909111222', license: 'D' },
    { id: 'TX02', driverName: 'Trịnh Công Sơn', driverPhone: '0918222333', license: 'B2' },
    { id: 'TX03', driverName: 'Lê Hoài Nam', driverPhone: '0927333444', license: 'E' },
    { id: 'TX04', driverName: 'Phạm Đức Duy', driverPhone: '0936444555', license: 'D' },
    { id: 'TX05', driverName: 'Trần Văn Hải', driverPhone: '0907222333', license: 'FC' }
  ];
}
function adminTsShuttleTypes() {
  try { return FleetStore.getVehicleTypes({ scope: 'shuttle' }).filter(function (v) { return v.active !== false; }).map(function (v) { return v.name; }); }
  catch (e) { return ['Xe 7 chỗ', 'Xe 16 chỗ', 'Xe 29 chỗ', 'Xe Limousine 9 chỗ']; }
}
function adminTsShuttlePlates() {
  try { return FleetStore.getVehicles({ scope: 'shuttle' }).filter(function (v) { return v.active !== false; }).map(function (v) { return v.plate; }); }
  catch (e) { return ['51B-666.66', '51B-777.77', '50H-888.88', '51B-999.99']; }
}

var ADMIN_TS_STATUS_LABELS = {
  waiting: { text: 'Chờ điều phối', cls: 'status-waiting' },
  enroute: { text: 'Đang trung chuyển', cls: 'status-enroute' },
  onboard: { text: 'Đã đón', cls: 'status-onboard' },
  issue: { text: 'Không đón được', cls: 'status-issue' }
};

/* ---------- Quét dữ liệu: gộp khách "Rước liền" (PickupService) + khách trung chuyển trên seat bank ---------- */
function adminScanTransshipRows() {
  var rows = [];

  PickupService.readFirstNonEmpty([]).forEach(function (p) {
    rows.push({
      kind: 'pk', key: 'pk:' + p.id, paxId: p.id,
      name: p.name || '', phone: p.phone || '', ticketCount: p.ticketCount || p.count || 1,
      date: p.date || '', createdAt: p.createdAt || '', printedAt: p.printedAt || '',
      fromStation: p.fromStation || '—', toStation: p.toStation || '—',
      fromTransfer: p.fromTransfer || '', toTransfer: p.toTransfer || '',
      assigned: p.assigned || null,
      seatStr: p.assigned ? (p.assigned.seat || (Array.isArray(p.assigned.seats) ? p.assigned.seats.join(', ') : '')) : '',
      tripId: p.assigned ? p.assigned.tripId : '',
      note: p.note || '', phongVeNote: p.statusNote || ''
    });
  });

  var trips = getTrips();
  var seatBank = lsRead(HN_STORAGE_KEY, {});
  trips.forEach(function (t) {
    var bank = seatBank[t.id];
    if (!bank) return;
    var seats = [].concat(bank.down || [], bank.up || [], bank.subSeats || [], bank.extraSeats || [])
      .filter(function (s) { return s && ['sold', 'hold', 'free', 'cargo'].indexOf(s.state) !== -1; });

    var byTicket = {};
    seats.forEach(function (s) {
      var tk = t.id + '|' + (s.ticketNo || ('T-' + s.code));
      (byTicket[tk] = byTicket[tk] || []).push(s);
    });

    Object.keys(byTicket).forEach(function (tk) {
      var members = byTicket[tk].sort(function (a, b) { return String(a.code).localeCompare(String(b.code)); });
      var m = members[0];
      var isTs = m.guestType === 'Trung chuyển' || m.pickupAddress || m.dropoffAddress || m.transship || m.transshipStation || m.arrivalTransfer;
      if (!isTs) return;
      var codes = members.map(function (s) { return s.code; });
      rows.push({
        kind: 'ts', key: 'ts:' + t.id + '|' + (m.ticketNo || codes.join(',')),
        tripId: t.id, ticketNo: m.ticketNo || '', seatCodes: codes,
        name: m.customerName || '', phone: m.phone || '', ticketCount: members.length,
        date: t.date || '', createdAt: m.actionTime || '', printedAt: m.printedAt || '',
        fromStation: m.firstStop || t.fromStation || '—', toStation: m.lastStop || t.toStation || '—',
        fromTransfer: m.pickupAddress || m.transship || m.transshipStation || '',
        toTransfer: m.dropoffAddress || m.arrivalTransfer || '',
        assigned: true, seatStr: codes.join(', '),
        note: m.note || '', phongVeNote: m.transshipPickupNote || ''
      });
    });
  });

  return rows;
}

function adminTsRowByKey(key) {
  var rows = adminScanTransshipRows();
  for (var i = 0; i < rows.length; i++) if (rows[i].key === key) return rows[i];
  return null;
}
function adminTsSelKeys() { return Object.keys(ADMIN_TS_SEL).filter(function (k) { return ADMIN_TS_SEL[k]; }); }

/* ---------- Vạch "In rước" (HN_PK_PRINT_RUOC_KEY — chung với TicketStaff) ---------- */
function adminTsReadDividers() {
  try { var r = localStorage.getItem(HN_PK_PRINT_RUOC_KEY); var a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function adminTsWriteDividers(list) {
  var s = JSON.stringify(list);
  try { localStorage.setItem(HN_PK_PRINT_RUOC_KEY, s); } catch (e) { }
  try { window.dispatchEvent(new StorageEvent('storage', { key: HN_PK_PRINT_RUOC_KEY, newValue: s, storageArea: localStorage })); } catch (e) { }
}

/* ---------- Render ---------- */
function tsRouteHtml(r) {
  var firstStopHtml = r.fromTransfer
    ? esc(r.fromStation) + '<div style="font-size:12px;color:var(--text-sub);margin-top:2px;">Đón: ' + esc(r.fromTransfer) + '</div>'
    : esc(r.fromStation);
  var lastStopHtml = r.toTransfer
    ? esc(r.toStation) + '<div style="font-size:12px;color:var(--text-sub);margin-top:2px;">Trả: ' + esc(r.toTransfer) + '</div>'
    : esc(r.toStation);
  var fromRow = '<div class="pax-route-row pax-route-from"><svg class="pax-route-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg><div class="pax-route-text">' + firstStopHtml + '</div></div>';
  var toRow = '<div class="pax-route-row pax-route-to"><svg class="pax-route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg><div class="pax-route-text">' + lastStopHtml + '</div></div>';
  if (TRANSSHIP_SUBTAB === 'don') return '<div class="pax-route">' + fromRow + '</div>';
  if (TRANSSHIP_SUBTAB === 'tra') return '<div class="pax-route">' + toRow + '</div>';
  return '<div class="pax-route">' + fromRow + '<div class="pax-route-connector"></div>' + toRow + '</div>';
}

var ADMIN_TS_ICN_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

function adminTsRenderRow(r, idx) {
  var timeStr = function (iso) { return iso ? (fmtDate(String(iso).slice(0, 10)) + '<br>' + (fmtStamp(iso).split(' ')[1] || '')) : '—'; };
  var sel = !!ADMIN_TS_SEL[r.key];

  var seatCell = (r.assigned && r.seatStr)
    ? '<button type="button" class="pk-seat-link" data-action="adminTsGotoSell" data-stop-propagation="1" data-args=\'["' + esc(r.key) + '"]\' title="Xem/đổi chỉ định ghế">' + esc(r.seatStr) + '</button>'
    : '<span class="pk-seat-none">Chưa chỉ định</span>';

  var drv = adminShuttleDriverRecord(r.phone);
  var status = (drv && drv.status) || 'waiting';

  var drvName = (drv && drv.driverName) || '';
  var drvNote = (drv && drv.driverNote) || '';
  // Chưa gán tài xế -> hiện thẳng trạng thái "Chờ điều phối" (cột "Trạng thái" riêng đã bỏ).
  var transInner = '<span class="pk-driver-name' + (drvName ? '' : ' pk-driver-empty') + '">' + (esc(drvName) || ADMIN_TS_STATUS_LABELS[status].text) + '</span>' +
    (drvNote ? '<span class="pk-driver-sub">' + esc(drvNote) + '</span>' : ADMIN_TS_ICN_EDIT.replace('<svg ', '<svg style="width:12px;height:12px;margin-top:2px;" '));
  var transCell = '<button type="button" class="pk-transship-cell pk-transship-cell--clickable" data-action="adminTsOpenDriverNote" data-stop-propagation="1" data-args=\'["' + esc(r.key) + '"]\' title="Ghi/sửa ghi chú trung chuyển">' + transInner + '</button>';

  var pvInner = r.phongVeNote ? '<span class="pk-note-text">' + esc(r.phongVeNote) + '</span>' : ADMIN_TS_ICN_EDIT;
  var pvCell = '<button type="button" class="pk-note-cell' + (r.phongVeNote ? ' has-note' : '') + '" data-action="adminTsOpenPhongVe" data-stop-propagation="1" data-args=\'["' + esc(r.key) + '"]\' title="Ghi/sửa ghi chú phòng vé">' + pvInner + '</button>';

  var typeChip = r.kind === 'ts' ? '<span class="pk-type-chip">Trung chuyển</span>' : '';

  return '<tr data-row-key="' + esc(r.key) + '" class="' + (sel ? 'selected-row' : '') + '">' +
    '<td class="col-stt">' + (idx + 1) + '</td>' +
    '<td><div class="pax-info">' + typeChip + '<div class="pax-name">KH: ' + esc(r.name || '—') + '</div><div class="pax-phone">SĐT: ' + esc(r.phone || '—') + '</div></div></td>' +
    '<td>' + tsRouteHtml(r) + '</td>' +
    '<td class="center" style="font-weight:700;font-size:13.5px;">' + (r.ticketCount || 1) + '</td>' +
    '<td class="center">' + seatCell + '</td>' +
    '<td>' + (r.note ? esc(r.note) : '—') + '</td>' +
    '<td class="center mono" style="font-size:12px;color:var(--text-sub);">' + timeStr(r.createdAt) + '</td>' +
    '<td class="center mono" style="font-size:12px;color:var(--text-sub);">' + timeStr(r.printedAt) + '</td>' +
    '<td class="center">' + transCell + '</td>' +
    '<td class="center">' + pvCell + '</td>' +
    '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminTsToggleRow" data-args=\'["' + esc(r.key) + '","__this__"]\'></td>' +
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
    if (TRANSSHIP_SUBTAB === 'don') return r.kind === 'ts' && !!r.fromTransfer;
    if (TRANSSHIP_SUBTAB === 'tra') return r.kind === 'ts' && !!r.toTransfer;
    // 'all': khách rước liền + khách trung chuyển CÓ chặng đón (giống TicketStaff pkRowMatchesSubTab).
    return r.kind === 'pk' || !!r.fromTransfer;
  });
  var list = byTab.filter(function (r) {
    if (f.search) {
      var kw = f.search.toLowerCase();
      if (((r.name || '') + ' ' + (r.phone || '') + ' ' + (r.seatStr || '')).toLowerCase().indexOf(kw) === -1) return false;
    }
    if (selectedDate && r.date && r.date !== selectedDate) return false;
    if (f.fromStation && r.fromStation !== f.fromStation) return false;
    if (f.toStation && r.toStation !== f.toStation) return false;
    if (f.status === 'pending' && r.assigned) return false;
    if (f.status === 'assigned' && !r.assigned) return false;
    if (f.timeSlot) {
      var hh = r.createdAt ? new Date(r.createdAt).getHours() : null;
      if (hh == null) return false;
      if (f.timeSlot === 'morning' && (hh < 5 || hh >= 12)) return false;
      if (f.timeSlot === 'afternoon' && (hh < 12 || hh >= 18)) return false;
      if (f.timeSlot === 'evening' && (hh < 18 || hh > 24)) return false;
    }
    return true;
  });
  list.sort(function (a, b) { return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0); });

  // Dọn lựa chọn của dòng không còn hiển thị.
  var visKeys = {}; list.forEach(function (r) { visKeys[r.key] = true; });
  Object.keys(ADMIN_TS_SEL).forEach(function (k) { if (!visKeys[k]) delete ADMIN_TS_SEL[k]; });

  var cnt = {
    all: all.filter(function (r) { return r.kind === 'pk' || !!r.fromTransfer; }).length,
    don: all.filter(function (r) { return r.kind === 'ts' && !!r.fromTransfer; }).length,
    ruoclien: all.filter(function (r) { return r.kind === 'pk'; }).length,
    tra: all.filter(function (r) { return r.kind === 'ts' && !!r.toTransfer; }).length
  };

  var dividerRows = adminTsReadDividers().map(function (d) {
    return '<tr class="pk-print-divider-row"><td colspan="11">' + esc(d.label) +
      '<button type="button" class="pk-print-divider-close" data-action="adminTsDismissDivider" data-args=\'["' + esc(d.id) + '"]\' aria-label="Đóng">&times;</button>' +
    '</td></tr>';
  }).join('');
  var rowsHtml = list.map(adminTsRenderRow).join('');
  var bodyHtml = dividerRows + rowsHtml;

  var subtab = function (id, label) {
    return '<button type="button" class="pk-subtab' + (TRANSSHIP_SUBTAB === id ? ' active' : '') + '" data-action="adminTransshipSwitchTab" data-args=\'["' + id + '"]\'>' + label + '<span class="pk-subtab-count">(' + cnt[id] + ')</span></button>';
  };
  var stOpts = function (cur) {
    return stationNames.map(function (s) { return '<option value="' + esc(s) + '"' + (cur === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('');
  };

  $('viewTransship').innerHTML =
    '<nav class="pk-subtabs">' +
      subtab('all', 'Tất cả') + subtab('don', 'Trung chuyển đón') + subtab('ruoclien', 'Rước liền') + subtab('tra', 'Trung chuyển trả') +
    '</nav>' +
    '<div class="filter-toolbar">' +
        '<div class="filter-field"><label>Tìm kiếm</label><input type="text" id="tsSearch" value="' + esc(f.search) + '" placeholder="Tên, SĐT, số ghế..." data-input-action="adminTransshipFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
        adminCalFieldHtml('ts', 'Ngày') +
        '<div class="filter-field"><label>Trạm đi</label><select data-change-action="adminTransshipFilterInput" data-args=\'["fromStation","__this_value__"]\'><option value="">Tất cả trạm đi</option>' + stOpts(f.fromStation) + '</select></div>' +
        '<div class="filter-field"><label>Trạm đến</label><select data-change-action="adminTransshipFilterInput" data-args=\'["toStation","__this_value__"]\'><option value="">Tất cả trạm đến</option>' + stOpts(f.toStation) + '</select></div>' +
        '<div class="filter-field"><label>Khung giờ</label><select data-change-action="adminTransshipFilterInput" data-args=\'["timeSlot","__this_value__"]\'>' +
          '<option value="">Tất cả khung giờ</option>' +
          '<option value="morning"' + (f.timeSlot === 'morning' ? ' selected' : '') + '>Sáng (05:00 - 12:00)</option>' +
          '<option value="afternoon"' + (f.timeSlot === 'afternoon' ? ' selected' : '') + '>Chiều (12:00 - 18:00)</option>' +
          '<option value="evening"' + (f.timeSlot === 'evening' ? ' selected' : '') + '>Tối (18:00 - 24:00)</option>' +
        '</select></div>' +
        '<div class="filter-field"><label>Trạng thái</label><select data-change-action="adminTransshipFilterInput" data-args=\'["status","__this_value__"]\'>' +
          '<option value="">Tất cả trạng thái</option>' +
          '<option value="pending"' + (f.status === 'pending' ? ' selected' : '') + '>Chưa chỉ định</option>' +
          '<option value="assigned"' + (f.status === 'assigned' ? ' selected' : '') + '>Đã chỉ định</option>' +
        '</select></div>' +
        '<div class="filter-reset">' +
          '<button type="button" class="btn btn-secondary" data-action="adminTransshipResetFilters">Đặt lại</button>' +
          '<button type="button" class="btn btn-secondary" data-action="adminTsOpenPrintRuoc">In rước</button>' +
          '<button type="button" class="btn btn-primary" data-action="adminOpenPickupModal">Rước liền</button>' +
        '</div>' +
      '</div>' +
      '<div class="sd-table-wrap">' +
        '<table class="shuttle-table shuttle-table--grid">' +
          '<thead><tr>' +
            '<th class="col-stt">STT</th><th>Khách hàng</th><th>Hành trình</th><th>SL</th><th>Số ghế</th>' +
            '<th>Ghi chú</th><th>Thời gian</th><th>In lúc</th>' +
            '<th>Trung chuyển</th><th>Phòng vé</th>' +
            '<th class="col-check"><input type="checkbox" id="tsCheckAll"' + (list.length && list.every(function (r) { return ADMIN_TS_SEL[r.key]; }) ? ' checked' : '') + ' data-action="adminTsToggleAll" data-args=\'["__this__"]\'></th>' +
          '</tr></thead>' +
          '<tbody>' + bodyHtml + '</tbody>' +
        '</table>' +
        (rowsHtml ? '' : '<div class="grid-empty">Không có hành khách nào phù hợp với điều kiện lọc hiện tại.</div>') +
      '</div>' +
    '<div class="bulk-bar ts-action-bar" id="tsActionBar" style="display:none;">' +
      '<span class="bulk-bar-hint" id="tsActionHint">Đã chọn 0 khách</span>' +
      '<div class="bulk-bar-fields">' +
        '<button type="button" class="btn btn-secondary" data-action="adminTsClearSel">Hủy</button>' +
        '<button type="button" class="btn btn-secondary" id="tsAssignBtn" data-action="adminTsConfirmAssign">Chỉ định</button>' +
        '<button type="button" class="btn btn-primary" id="tsUpdateBtn" data-action="adminTsOpenUpdateModal">Cập nhật</button>' +
      '</div>' +
    '</div>';

  adminCalUpdateTrigger('ts');
  adminTsSyncActionBar();
}

function adminTsSyncActionBar() {
  var bar = $('tsActionBar');
  if (!bar) return;
  var keys = adminTsSelKeys();
  var view = $('viewTransship');
  if (!keys.length) {
    bar.style.display = 'none';
    if (view) view.classList.remove('ts-bar-open');
    return;
  }
  bar.style.display = 'flex';
  if (view) view.classList.add('ts-bar-open');
  var hint = $('tsActionHint'); if (hint) hint.textContent = 'Đã chọn ' + keys.length + ' khách';
  // "Chỉ định" chỉ áp cho 1 khách — KHÔNG disable (disable làm nút không bấm được, khó hiểu); bấm khi
  // chọn ≠1 sẽ hiện toast nhắc. "Cập nhật" áp cho 1+ khách.
  var assignBtn = $('tsAssignBtn');
  if (assignBtn) assignBtn.title = keys.length === 1 ? 'Chỉ định phơi + ghế cho khách này' : 'Chọn đúng 1 khách để chỉ định';
}

/* ---------- Chọn dòng ---------- */
function adminTsToggleRow(key, cb) {
  if (cb.checked) ADMIN_TS_SEL[key] = true; else delete ADMIN_TS_SEL[key];
  var tr = document.querySelector('#viewTransship tr[data-row-key="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  adminTsSyncActionBar();
}
function adminTsToggleAll(cb) {
  var boxes = document.querySelectorAll('#viewTransship tbody td.col-check input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (b) {
    var key = null;
    try { key = JSON.parse(b.getAttribute('data-args') || '[]')[0]; } catch (e) { /* ignore */ }
    if (!key) return;
    if (cb.checked) ADMIN_TS_SEL[key] = true; else delete ADMIN_TS_SEL[key];
  });
  renderTransshipView();
}
function adminTsClearSel() { ADMIN_TS_SEL = {}; renderTransshipView(); }

/* ===================================================================================================
   MODAL "CHỈ ĐỊNH XE RƯỚC" — danh sách phơi + sơ đồ ghế ngay trong admin (port từ #assignPickupModal
   TicketStaff). Ghi thẳng vào seat bank (HN_STORAGE_KEY) + p.assigned (PickupService). KHÔNG qua bước
   thanh toán/in vé như ticketstaff — admin là chỉ định chỗ, thu tiền do phòng vé làm sau.
   =================================================================================================== */
var ADMIN_ASSIGN = null;

function adminTsConfirmAssign() {
  var keys = adminTsSelKeys();
  if (keys.length !== 1) { showToast('Chọn đúng 1 khách để chỉ định.'); return; }
  adminTsOpenAssignModal(keys[0]);
}
function adminTsGotoSell(key) { adminTsOpenAssignModal(key); }

function adminTsCloseAssignModal() {
  var ov = $('atsAssignOverlay'); if (ov) ov.classList.remove('open');
  ADMIN_ASSIGN = null;
}

function adminTsOpenAssignModal(key) {
  var r = adminTsRowByKey(key);
  if (!r) return;
  var trips = getTrips().filter(function (t) { return t && !t.isTemplate; });
  if (!trips.length) { showToast('Chưa có phơi xe nào.'); return; }

  var srcSeats = r.kind === 'ts'
    ? (r.seatCodes || []).slice()
    : (r.assigned ? (r.assigned.seats || (r.assigned.seat ? String(r.assigned.seat).split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [])) : []);
  // Chọn sẵn phơi: ưu tiên phơi khách đang gắn, sau đó phơi ĐẦU TIÊN CÓ sơ đồ ghế (tránh mở modal ra
  // sơ đồ ghế trống, không chọn được ghế nào), cuối cùng mới tới phơi đầu danh sách.
  var seatBank0 = lsRead(HN_STORAGE_KEY, {});
  var curTrip = r.tripId
    || (trips.filter(function (t) { var b = seatBank0[t.id]; return b && ((b.down || []).length || (b.up || []).length); })[0] || {}).id
    || trips[0].id;
  var tMeta = trips.find(function (t) { return t.id === curTrip; });

  ADMIN_ASSIGN = {
    key: key, kind: r.kind, paxId: (r.paxId != null ? r.paxId : null),
    srcTripId: r.tripId || '', srcSeats: srcSeats,
    tripId: curTrip, seats: srcSeats.slice(), search: '',
    price: (r.assigned && r.assigned.price) || (tMeta ? (tMeta.price || 280000) : 280000),
    name: r.name || '', phone: r.phone || '',
    fromStation: r.fromStation || '', toStation: r.toStation || '',
    fromTransfer: r.fromTransfer || '', toTransfer: r.toTransfer || ''
  };
  var A = ADMIN_ASSIGN;

  var cntStr = (r.ticketCount || 1) + ' vé';
  var sub = $('atsAssignSub');
  if (sub) sub.textContent = 'Khách: ' + (A.name || 'Khách') + ' · ' + (A.phone || '—') + ' · SL: ' + cntStr + ' · ' + (A.fromStation || '—') + ' → ' + (A.toStation || '—');
  var si = $('atsTripSearchInput'); if (si) si.value = '';
  var pi = $('atsAssignTripPrice'); if (pi) pi.value = A.price;

  var ov = $('atsAssignOverlay'); if (ov) ov.classList.add('open');

  adminTsAssignRenderTripList();
  adminTsAssignRenderSeatMap();
  adminTsAssignUpdateConfirm();
}

function adminTsAssignSearch(v) { if (!ADMIN_ASSIGN) return; ADMIN_ASSIGN.search = v || ''; adminTsAssignRenderTripList(); }

// Phơi "đã khoá bán vé" = vòng đời DEPARTED / REOPEN_CLOSED / MANIFEST_CLOSED (đã khởi hành & không còn
// Re-open mở) — khớp zone1IsTripSellingLocked bên ticketstaff. Badge SL ghế đỏ (tag-departed) + xếp cuối.
function adminTsTripSellingLocked(tripId) {
  var life = adminTsTripLifecycle(tripId);
  return life === 'DEPARTED' || life === 'REOPEN_CLOSED' || life === 'MANIFEST_CLOSED';
}
function adminTsTripMinutes(t) {
  var pt = String((t && t.time) || '00:00').split(':');
  return (parseInt(pt[0], 10) || 0) * 60 + (parseInt(pt[1], 10) || 0);
}

function adminTsAssignRenderTripList() {
  // #pkTripListPanel: dùng ĐÚNG id ticketstaff để kế thừa toàn bộ style thẻ phơi (.z1-*) trong
  // booking-ui/02-zone1.css (các rule đó scope theo #pkTripListPanel).
  var wrap = $('pkTripListPanel'); if (!wrap || !ADMIN_ASSIGN) return;
  var kw = (ADMIN_ASSIGN.search || '').trim().toLowerCase();
  var seatBank = lsRead(HN_STORAGE_KEY, {});
  var trips = getTrips().filter(function (t) {
    if (!t || t.isTemplate) return false;
    if (!kw) return true;
    return ((t.time || '') + ' ' + (t.route || '') + ' ' + (t.name || '') + ' ' + (t.plate || '') + ' ' + (t.vehicleType || '')).toLowerCase().indexOf(kw) !== -1;
  });
  // Xếp Y CHANG zone1SortByDeparture: phơi còn bán được lên trên, phơi đã khoá (đỏ) xuống cuối; trong
  // từng nhóm sắp theo giờ khởi hành tăng dần.
  trips.sort(function (a, b) {
    var al = adminTsTripSellingLocked(a.id) ? 1 : 0, bl = adminTsTripSellingLocked(b.id) ? 1 : 0;
    if (al !== bl) return al - bl;
    return adminTsTripMinutes(a) - adminTsTripMinutes(b);
  });

  if (!trips.length) { wrap.innerHTML = '<div class="pk-trip-empty-msg">Không tìm thấy phơi xe phù hợp</div>'; return; }

  // Thẻ phơi dùng CHUNG class .trip-card (booking-ui/02-zone1.css) — giống hệt danh sách phơi Zone 1
  // và modal "Chỉ định xe rước" bên TicketStaff.
  wrap.innerHTML = trips.map(function (t) {
    var bk = seatBank[t.id];
    var total = 0, booked = 0;
    if (bk) {
      var comb = [].concat(bk.down || [], bk.up || []);
      total = comb.filter(function (s) { return s && s.state !== 'hidden'; }).length;
      booked = comb.filter(function (s) { return s && ['sold', 'hold', 'free', 'cargo'].indexOf(s.state) !== -1; }).length;
    }
    var plate = (bk && bk.plate) || t.plate || 'Chưa có';
    var name = t.name || ((t.route || '') + ' (' + (t.time || '') + ')');
    var selCls = t.id === ADMIN_ASSIGN.tripId ? ' selected' : '';
    var tagCls = adminTsTripSellingLocked(t.id) ? 'tag-departed' : 'tag-not-departed';
    return '<div class="trip-card' + selCls + '" data-trip="' + esc(t.id) + '" data-action="adminTsAssignSelectTrip" data-args=\'["' + esc(t.id) + '"]\'>' +
      '<div class="z1-header">' +
        '<div class="z1-time-block">' +
          '<div class="z1-clock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>' +
          '<span class="trip-time">' + esc(t.time || '--:--') + '</span>' +
        '</div>' +
        '<div class="z1-divider"></div>' +
        '<span class="trip-plate-inline">' + esc(plate) + '</span>' +
        '<div class="trip-seat-tag ' + tagCls + '">' + booked + '/' + total + '</div>' +
      '</div>' +
      '<div class="z1-name-row"><span class="trip-name-text">' + esc(name) + '</span></div>' +
    '</div>';
  }).join('');
}

function adminTsAssignSelectTrip(tripId) {
  if (!ADMIN_ASSIGN || tripId === ADMIN_ASSIGN.tripId) return;
  ADMIN_ASSIGN.tripId = tripId;
  ADMIN_ASSIGN.seats = (ADMIN_ASSIGN.srcTripId === tripId) ? ADMIN_ASSIGN.srcSeats.slice() : [];
  var t = getTrips().find(function (x) { return x.id === tripId; });
  ADMIN_ASSIGN.price = t ? (t.price || 280000) : 280000;
  var pi = $('atsAssignTripPrice'); if (pi) pi.value = ADMIN_ASSIGN.price;
  adminTsAssignRenderTripList();
  adminTsAssignRenderSeatMap();
  adminTsAssignUpdateConfirm();
}

function adminTsAssignRenderSeatMap() {
  if (!ADMIN_ASSIGN) return;
  var bank = lsRead(HN_STORAGE_KEY, {})[ADMIN_ASSIGN.tripId];
  var down = $('atsAssignSeatFloorDown'), up = $('atsAssignSeatFloorUp'), upWrap = $('atsAssignSeatFloorUpWrap');
  if (!down || !up) return;
  if (!bank) {
    down.innerHTML = '<div class="pk-trip-empty-msg" style="grid-column:1/-1;">Phơi này chưa tạo sơ đồ ghế.</div>';
    up.innerHTML = ''; if (upWrap) upWrap.style.display = 'none';
    return;
  }
  var srcSet = (ADMIN_ASSIGN.srcTripId === ADMIN_ASSIGN.tripId) ? ADMIN_ASSIGN.srcSeats : [];
  var sel = ADMIN_ASSIGN.seats;
  var SEAT_SVG = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">' +
    '<path d="M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V17C19 18.6569 17.6569 20 16 20H8C6.34315 20 5 18.6569 5 17V5Z"/>' +
    '<path d="M2 8C2 7.44772 2.44772 7 3 7H5V15H3C2.44772 15 2 14.5523 2 14V8Z"/>' +
    '<path d="M19 7H21C21.5523 7 22 7.44772 22 8V14C22 14.5523 21.5523 15 21 15H19V7Z"/>' +
  '</svg>';
  var cell = function (s) {
    if (!s) return '';
    if (s.state === 'hidden') return '<div class="van-seat" style="visibility:hidden;pointer-events:none;"></div>';
    var blocked = ['sold', 'hold', 'free', 'cargo'].indexOf(s.state) !== -1 && srcSet.indexOf(s.code) === -1;
    var seld = sel.indexOf(s.code) !== -1;
    var cls = blocked ? 'blocked' : (seld ? 'selected' : 'empty');
    var act = blocked ? '' : ' data-action="adminTsAssignSelectSeat" data-args=\'["' + esc(s.code) + '"]\'';
    return '<div class="van-seat ' + cls + '"' + act + '>' + SEAT_SVG + '<span class="seat-num">' + esc(s.code) + '</span></div>';
  };
  var total = (bank.down || []).length + (bank.up || []).length;
  var c3 = total >= 34 ? ' cols-3' : '';
  down.className = 'seat-grid' + c3;
  down.innerHTML = (bank.down || []).map(cell).join('');
  var downCol = down.parentElement;
  if (!(bank.up || []).length) {
    if (upWrap) upWrap.style.display = 'none';
    if (downCol) { downCol.style.maxWidth = '320px'; downCol.style.margin = '0 auto'; }
  } else {
    if (upWrap) upWrap.style.display = 'flex';
    if (downCol) { downCol.style.maxWidth = ''; downCol.style.margin = ''; }
    up.className = 'seat-grid' + c3;
    up.innerHTML = bank.up.map(cell).join('');
  }
}

function adminTsAssignSelectSeat(code) {
  if (!ADMIN_ASSIGN) return;
  var i = ADMIN_ASSIGN.seats.indexOf(code);
  if (i !== -1) ADMIN_ASSIGN.seats.splice(i, 1); else ADMIN_ASSIGN.seats.push(code);
  adminTsAssignRenderSeatMap();
  adminTsAssignUpdateConfirm();
}
function adminTsAssignPriceChange(v) {
  if (!ADMIN_ASSIGN) return;
  ADMIN_ASSIGN.price = Math.max(0, parseInt(v, 10) || 0);
  adminTsAssignUpdateConfirm();
}
function adminTsAssignUpdateConfirm() {
  if (!ADMIN_ASSIGN) return;
  var btn = $('atsConfirmAssignBtn'), hint = $('atsAssignHint'), tot = $('atsAssignTotalPrice');
  var n = ADMIN_ASSIGN.seats.length;
  if (tot) tot.textContent = ((ADMIN_ASSIGN.price || 0) * n).toLocaleString('vi-VN') + 'đ';
  if (btn) btn.disabled = !(ADMIN_ASSIGN.tripId && n > 0);
  if (hint) hint.innerHTML = n
    ? ('Sẽ chỉ định <b>' + n + ' ghế (' + ADMIN_ASSIGN.seats.join(', ') + ')</b> — phơi xe <b>' + esc((getTrips().find(function (t) { return t.id === ADMIN_ASSIGN.tripId; }) || {}).time || ADMIN_ASSIGN.tripId) + '</b>')
    : 'Chọn 1 phơi xe và 1 ghế trống để chỉ định.';
}

// Bấm "Chỉ định" trong modal -> KHÔNG bán ngay, mở modal "Xác nhận thanh toán" (y chang ticketstaff:
// pkConfirmAssign -> #sellPaymentModal -> confirmSellPayment). Ngữ cảnh giữ trong ADMIN_ASSIGN.
function adminTsAssignConfirm() {
  var A = ADMIN_ASSIGN;
  if (!A || !A.tripId || !A.seats.length) return;
  var bank = lsRead(HN_STORAGE_KEY, {});
  if (!bank[A.tripId]) { showToast('Phơi này chưa có sơ đồ ghế.'); return; }
  var radios = document.querySelectorAll('#atsSellPaymentModal input[name="atsSellPaymentMethod"]');
  Array.prototype.forEach.call(radios, function (r) { r.checked = r.value === 'Tiền mặt'; });
  var ov = $('atsSellPaymentModal'); if (ov) ov.classList.add('open');
}
function adminTsCloseSellPayment() {
  var ov = $('atsSellPaymentModal'); if (ov) ov.classList.remove('open');
}

// Vòng đời phơi (SELLING/DEPARTED/REOPEN...) từ manifest — thay getTripLifecycleStatus() bên ticketstaff.
function adminTsTripLifecycle(tripId) {
  var mf = lsRead('hn_ts_manifests_v1', {});
  return (mf && mf[tripId] && mf[tripId].status) || 'SELLING';
}

// Xác nhận thanh toán -> ghi ghế 'sold' Y CHANG confirmSellPayment() nhánh pendingPickupAssignSell:
// trả ghế nguồn cũ, đánh dấu ghế mới đầy đủ (staff/paymentMethod/actionTime/ticketNo + phase stamp),
// cập nhật p.assigned, lưu seat bank + PickupService (2 trang dùng chung key nên đồng bộ ngay), in vé.
function adminTsConfirmSellPayment() {
  var A = ADMIN_ASSIGN;
  if (!A || !A.tripId || !A.seats.length) { adminTsCloseSellPayment(); return; }
  var paymentMethod = (document.querySelector('#atsSellPaymentModal input[name="atsSellPaymentMethod"]:checked') || {}).value || 'Tiền mặt';

  var bank = lsRead(HN_STORAGE_KEY, {});
  var tb = bank[A.tripId];
  if (!tb) { showToast('Phơi này chưa có sơ đồ ghế.'); adminTsCloseSellPayment(); return; }

  // 1) Trả (các) ghế nguồn cũ về trống (khi đổi chỉ định) — trừ ghế giữ lại nếu chỉ định lại chính phơi đó.
  var keepSame = {};
  if (A.srcTripId === A.tripId) A.seats.forEach(function (c) { keepSame[c] = true; });
  var oldTb = bank[A.srcTripId];
  if (oldTb && A.srcSeats.length) {
    ['down', 'up', 'subSeats', 'extraSeats'].forEach(function (fld) {
      (oldTb[fld] || []).forEach(function (s) {
        if (s && A.srcSeats.indexOf(s.code) !== -1 && !keepSame[s.code]) {
          s.state = 'empty'; s.customerName = null; s.phone = null; s.ticketNo = null; s.paid = false;
          s.pickupAddress = ''; s.dropoffAddress = ''; s.transshipStation = ''; s.guestType = '';
        }
      });
    });
  }

  // 2) Đánh dấu ghế mới đã bán.
  var ticketNo = 'RL-' + String(Math.floor(1000 + Math.random() * 9000));
  var nowIso = new Date().toISOString();
  var staffCode = (window.Session && Session.username && Session.username()) || 'admin';
  var life = adminTsTripLifecycle(A.tripId);
  var soldPhase = life === 'SELLING' ? 'PRE_DEPART' : 'POST_DEPART';
  var codes = {}; A.seats.forEach(function (c) { codes[c] = true; });
  var soldSeats = [];
  ['down', 'up', 'subSeats', 'extraSeats'].forEach(function (fld) {
    (tb[fld] || []).forEach(function (s) {
      if (!s || !codes[s.code]) return;
      s.state = 'sold';
      s.customerName = A.name; s.phone = A.phone;
      s.firstStop = A.fromStation; s.lastStop = A.toStation;
      s.pickupAddress = A.fromTransfer; s.dropoffAddress = A.toTransfer; s.transshipStation = A.fromTransfer;
      s.guestType = 'Trung chuyển';
      s.price = A.price; s.count = A.seats.length;
      s.ticketNo = ticketNo; s.paid = true; s.staff = staffCode;
      s.paymentMethod = paymentMethod; s.actionTime = nowIso;
      if (!s.soldPhase) { s.soldPhase = soldPhase; s.sellingStation = ''; s.reopenEventId = null; }
      soldSeats.push(s);
    });
  });
  if (!soldSeats.length) { showToast('Không ghi được ghế đã chọn.'); adminTsCloseSellPayment(); return; }
  lsWrite(HN_STORAGE_KEY, bank);

  // 3) Cập nhật p.assigned cho khách rước liền.
  if (A.kind === 'pk' && A.paxId != null) {
    var list = PickupService.readFirstNonEmpty([]);
    var p = list.find(function (x) { return String(x.id) === String(A.paxId); });
    if (p) { p.assigned = { tripId: A.tripId, seat: A.seats.join(', '), seats: A.seats.slice(), price: A.price }; PickupService.save(list); }
  }

  var trip = getTrips().find(function (t) { return t.id === A.tripId; }) || {};
  var doneSeats = A.seats.slice(), doneName = A.name, unit = A.price || 0;

  adminTsCloseSellPayment();
  adminTsCloseAssignModal();
  ADMIN_TS_SEL = {};
  adminTsPrintTickets(soldSeats, trip);
  showToast('Đã bán vé cho ' + (doneName || 'khách') + ' — ' + doneSeats.length + ' ghế (' + doneSeats.join(', ') +
    ') · Tổng: ' + (unit * doneSeats.length).toLocaleString('vi-VN') + 'đ');
  renderTransshipView();
}

/* ---------- In vé (port TICKET_PRINT_STYLE + buildTicketPageHtml TicketStaff) — mỗi ghế 1 tờ, gộp 1 cửa sổ ---------- */
var ADMIN_TICKET_PRINT_STYLE =
  "@page{size:80mm auto;margin:0}" +
  "body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;color:#111213;background:#fff;font-size:12.5px;line-height:1.35}" +
  ".ticket-page{width:76mm;margin:0 auto;padding:12px 6px}.ticket-page + .ticket-page{page-break-before:always}" +
  ".brand-header{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px}" +
  ".brand-badge{display:inline-block;background:#C20D08;color:#fff;font-weight:900;font-size:16px;padding:2px 8px;border-radius:4px;margin-bottom:4px}" +
  ".brand-name{font-size:17px;font-weight:900;letter-spacing:.5px;color:#000}.brand-sub{font-size:11px;font-weight:600;color:#444}" +
  ".ticket-title{font-size:15px;font-weight:900;text-align:center;margin:8px 0 4px;text-transform:uppercase}" +
  ".dash-line{border-bottom:1px dashed #000;margin:6px 0}" +
  ".kv-row{display:flex;justify-content:space-between;font-size:12.5px;margin:4px 0}" +
  ".kv-label{color:#333;font-weight:600}.kv-val{font-weight:700;text-align:right}" +
  ".seat-box{font-size:21px;font-weight:900;text-align:center;border:2px solid #000;padding:6px;margin:8px 0;background:#fafafa}" +
  ".total-price-box{text-align:center;font-size:16px;font-weight:900;margin:8px 0;padding:6px;border:1px solid #000;background:#f0f0f0}" +
  ".qr-container{text-align:center;margin-top:10px;padding-top:8px;border-top:1px dashed #000}" +
  ".qr-img{width:140px;height:140px;display:block;margin:0 auto 6px;border:1px solid #ccc;padding:4px;background:#fff}" +
  ".footer-note{text-align:center;font-size:10.5px;margin-top:10px;line-height:1.4;color:#333}";

function adminTsTicketPageHtml(d) {
  return '' +
    '<div class="brand-header"><div class="brand-badge">HN</div><div class="brand-name">HUỆ NGHĨA EXPRESS</div>' +
      '<div class="brand-sub">Hệ thống Đặt vé & Trung chuyển Chuyên nghiệp</div></div>' +
    '<div class="ticket-title">VÉ XE KHÁCH</div><div class="dash-line"></div>' +
    '<div class="kv-row"><span class="kv-label">Mã vé:</span><span class="kv-val">' + esc(d.ticketNo) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Ngày in:</span><span class="kv-val">' + esc(d.nowStr) + '</span></div>' +
    '<div class="dash-line"></div>' +
    '<div class="seat-box">SỐ GHẾ: ' + esc(d.seatsText) + '</div>' +
    '<div class="kv-row"><span class="kv-label">Hành khách:</span><span class="kv-val">' + esc(d.customerName) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Điện thoại:</span><span class="kv-val">' + esc(d.phone) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Tuyến xe:</span><span class="kv-val">' + esc(d.route) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Giờ xuất bến:</span><span class="kv-val">' + esc(d.time) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Trạm đi:</span><span class="kv-val">' + esc(d.fromStation) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Trạm đến:</span><span class="kv-val">' + esc(d.toStation) + '</span></div>' +
    '<div class="dash-line"></div>' +
    '<div class="kv-row"><span class="kv-label">Đơn giá:</span><span class="kv-val">' + d.unitPrice.toLocaleString('vi-VN') + 'đ/vé</span></div>' +
    '<div class="total-price-box">TỔNG TIỀN: ' + d.totalPrice.toLocaleString('vi-VN') + 'đ</div>' +
    '<div class="kv-row"><span class="kv-label">Thanh toán:</span><span class="kv-val">' + esc(d.paymentMethod) + '</span></div>' +
    '<div class="qr-container"><img class="qr-img" src="' + d.qrImgUrl + '" alt="QR">' +
      '<div style="font-weight:800;font-size:11.5px;margin-top:2px;">MÃ QR XÁC NHẬN LÊN XE</div>' +
      '<div style="font-size:10px;color:#555;">Quét mã QR để kiểm tra trạng thái lên xe</div></div>' +
    '<div class="footer-note"><b>Cảm ơn quý khách đã chọn Huệ Nghĩa Express!</b><br>Tổng đài đặt vé & hỗ trợ: <b>1900 63 64 99</b></div>';
}

function adminTsPrintTickets(seats, trip) {
  if (!seats || !seats.length) return;
  var now = new Date();
  var nowStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString('vi-VN');
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=1&data=' + encodeURIComponent('https://caolinh2412.github.io/demo/');
  var pages = seats.map(function (s) {
    var unit = s.price || 280000;
    var d = {
      ticketNo: s.ticketNo || ('SGAG-' + String(Math.floor(1000 + Math.random() * 9000))),
      nowStr: nowStr, seatsText: s.code, customerName: s.customerName || 'Khách lẻ',
      phone: s.phone || '—', route: (trip && trip.route) || 'Sài Gòn - An Giang', time: (trip && trip.time) || '07:00',
      fromStation: s.firstStop || (trip && trip.fromStation) || '508 Kinh Dương Vương',
      toStation: s.lastStop || (trip && trip.toStation) || 'Trạm Châu Đốc',
      unitPrice: unit, totalPrice: unit, qrImgUrl: qrUrl, paymentMethod: s.paymentMethod || 'Tiền mặt'
    };
    return '<div class="ticket-page">' + adminTsTicketPageHtml(d) + '</div>';
  }).join('');
  var html = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>In Vé Xe Huệ Nghĩa</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">' +
    '<style>' + ADMIN_TICKET_PRINT_STYLE + '</style></head><body>' + pages +
    '<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script></body></html>';
  var w = window.open('', '_blank', 'width=450,height=600');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

/* ---------- Modal "Cập nhật trạng thái/tài xế" (#atsUpdateOverlay — markup tĩnh, y chang #pkUpdateStatusModal) ---------- */
function adminTsCloseUpdateModal() { var ov = $('atsUpdateOverlay'); if (ov) ov.classList.remove('open'); }

function adminTsOpenUpdateModal() {
  var keys = adminTsSelKeys();
  if (!keys.length) { showToast('Chọn ít nhất 1 khách.'); return; }
  var rows = keys.map(adminTsRowByKey).filter(Boolean);
  if (!rows.length) return;

  var map = ShuttleDriverService.getMap();
  var statusOf = function (row) { var e = map[adminTsDriverLegKey(row.phone)]; return (e && e.status) || 'waiting'; };
  var first = statusOf(rows[0]);
  var same = rows.every(function (r) { return statusOf(r) === first; });
  var bulk = rows.length > 1;

  if (bulk && !same) {
    showToast('Các khách đã chọn không cùng trạng thái hiện tại. Vui lòng chọn nhóm khách có cùng trạng thái!');
    return;
  }

  var curStatus = same ? first : 'waiting';
  var assigned = !bulk ? map[adminTsDriverLegKey(rows[0].phone)] : null;
  var pool = adminTsDriverPool();

  var totalPax = rows.reduce(function (n, r) { return n + (r.ticketCount || 1); }, 0);
  var sub = bulk
    ? ('Đang chọn ' + rows.length + ' khách hàng (' + totalPax + ' pax) — Trạng thái hiện tại: "' + ADMIN_TS_STATUS_LABELS[first].text + '"')
    : ('Khách hàng: ' + (rows[0].name || '—') + ' (' + (rows[0].phone || '—') + ')');

  $('atsUpdateTitle').textContent = bulk ? 'Cập nhật trạng thái hàng loạt' : 'Cập nhật trạng thái khách hàng';
  $('atsUpdateSub').textContent = sub;
  $('atsUpdateKeys').value = JSON.stringify(keys);

  $('atsUpdateStatus').value = curStatus;

  $('atsUpdateDriver').innerHTML = '<option value="">-- Giữ nguyên / chưa gán --</option>' +
    pool.map(function (d) {
      var selD = assigned && assigned.driverName === d.driverName ? ' selected' : '';
      var lic = (d.license || '').replace(/^Bằng\s*/i, '');
      return '<option value="' + esc(d.id) + '"' + selD + '>Tài xế ' + esc(d.driverName) + ' — SĐT: ' + esc(d.driverPhone) + (lic ? ' (' + esc(lic) + ')' : '') + '</option>';
    }).join('');
  $('atsUpdateVType').innerHTML = '<option value="">— Chưa chọn —</option>' + adminTsShuttleTypes().map(function (x) {
    return '<option value="' + esc(x) + '"' + (assigned && assigned.driverVehicleType === x ? ' selected' : '') + '>' + esc(x) + '</option>';
  }).join('');
  $('atsUpdatePlate').innerHTML = '<option value="">— Chưa chọn —</option>' + adminTsShuttlePlates().map(function (x) {
    return '<option value="' + esc(x) + '"' + (assigned && assigned.driverPlate === x ? ' selected' : '') + '>' + esc(x) + '</option>';
  }).join('');
  $('atsUpdateReason').value = (!bulk && curStatus === 'issue' && assigned && assigned.note) ? assigned.note : '';

  adminTsOnStatusChange();
  $('atsUpdateOverlay').classList.add('open');
}

function adminTsOnStatusChange() {
  var box = $('atsUpdateReasonBox'), v = ($('atsUpdateStatus') || {}).value;
  if (box) box.style.display = (v === 'issue') ? 'flex' : 'none';
}
function adminTsOnDriverChange() {
  var sel = $('atsUpdateDriver'); if (!sel || !sel.value) return;
  var def = adminTsReadDriverVehMap()[sel.value];
  if (!def) return;
  if ($('atsUpdateVType') && def.vehicleType) $('atsUpdateVType').value = def.vehicleType;
  if ($('atsUpdatePlate') && def.plate) $('atsUpdatePlate').value = def.plate;
}
function adminTsAssignDriverDefault() {
  var sel = $('atsUpdateDriver');
  if (!sel || !sel.value) { showToast('Hãy chọn tài xế trước khi gán loại xe / biển số mặc định.'); return; }
  var map = adminTsReadDriverVehMap();
  map[sel.value] = { vehicleType: ($('atsUpdateVType') || {}).value || '', plate: ($('atsUpdatePlate') || {}).value || '' };
  adminTsWriteDriverVehMap(map);
  var d = adminTsDriverPool().find(function (x) { return x.id === sel.value; });
  showToast('Đã gán mặc định cho tài xế ' + (d ? d.driverName : '') + '. Lần sau chọn tài xế này sẽ tự điền loại xe / biển số.');
}
function adminTsSaveUpdate() {
  var keys; try { keys = JSON.parse(($('atsUpdateKeys') || {}).value || '[]'); } catch (e) { keys = []; }
  var rows = keys.map(adminTsRowByKey).filter(Boolean);
  if (!rows.length) { adminTsCloseUpdateModal(); return; }

  var newStatus = ($('atsUpdateStatus') || {}).value || 'waiting';
  var reason = ($('atsUpdateReason') || {}).value.trim();
  var drvId = ($('atsUpdateDriver') || {}).value || '';
  var driver = drvId ? adminTsDriverPool().find(function (d) { return d.id === drvId; }) : null;
  var vType = ($('atsUpdateVType') || {}).value || '';
  var plate = ($('atsUpdatePlate') || {}).value || '';

  var map = ShuttleDriverService.getMap();
  rows.forEach(function (r) {
    if (!r.phone) return;
    var lk = adminTsDriverLegKey(r.phone);
    var e = map[lk] || {};
    e.status = newStatus;
    e.note = newStatus === 'issue' ? (reason || 'Không liên lạc được') : '';
    e.noteImportant = newStatus === 'issue';
    if (driver) {
      e.driverName = driver.driverName;
      e.driverPhone = driver.driverPhone;
      e.driverVehicleType = vType;
      e.driverPlate = plate;
    }
    map[lk] = e;
  });
  ShuttleDriverService.setMap(map);

  adminTsCloseUpdateModal();
  ADMIN_TS_SEL = {};
  showToast((rows.length > 1 ? 'Đã cập nhật trạng thái cho ' + rows.length + ' khách hàng' : 'Đã cập nhật trạng thái') +
    ' thành "' + ADMIN_TS_STATUS_LABELS[newStatus].text + '"' + (driver ? ' và gán tài xế ' + driver.driverName : '') + '.');
  renderTransshipView();
}

/* ---------- Modal ghi chú "Trung chuyển" (driverNote — ghi thật vào ShuttleDriverService) ---------- */
function adminTsOpenDriverNote(key) {
  var r = adminTsRowByKey(key);
  if (!r) return;
  if (!r.phone) { showToast('Khách chưa có SĐT — không lưu được ghi chú tài xế.'); return; }
  var cur = (ShuttleDriverService.getMap()[adminTsDriverLegKey(r.phone)] || {}).driverNote || '';
  openAdminModal(
    '<h3>Ghi chú trung chuyển</h3>' +
    '<div class="admin-form">' +
      '<input type="hidden" id="tsDrvNoteKey" value="' + esc(key) + '">' +
      '<div class="fld"><label>Ghi chú (tài xế / điều phối)</label>' +
        '<textarea id="tsDrvNote" rows="4" placeholder="VD: đã liên hệ khách, hẹn đón đúng giờ...">' + esc(cur) + '</textarea></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Đóng</button>' +
        '<button type="button" class="btn btn-primary" data-action="adminTsSaveDriverNote">Lưu</button>' +
      '</div>' +
    '</div>'
  );
}
function adminTsSaveDriverNote() {
  var r = adminTsRowByKey(($('tsDrvNoteKey') || {}).value || '');
  if (!r || !r.phone) { closeAdminModal(); return; }
  var lk = adminTsDriverLegKey(r.phone);
  var map = ShuttleDriverService.getMap();
  var e = map[lk] || {};
  e.driverNote = ($('tsDrvNote') || {}).value.trim();
  map[lk] = e;
  ShuttleDriverService.setMap(map);
  closeAdminModal();
  showToast('Đã lưu ghi chú trung chuyển.');
  renderTransshipView();
}

/* ---------- Modal ghi chú "Phòng vé" (rước liền → PickupService, trung chuyển → seat bank) ---------- */
function adminTsOpenPhongVe(key) {
  var r = adminTsRowByKey(key);
  if (!r) return;
  openAdminModal(
    '<h3>Ghi chú phòng vé</h3>' +
    '<div class="admin-form">' +
      '<input type="hidden" id="tsPvKey" value="' + esc(key) + '">' +
      '<div class="fld"><label>Ghi chú trạng thái đón khách</label>' +
        '<textarea id="tsPvNote" rows="4" placeholder="VD: khách yêu cầu gọi trước 10 phút...">' + esc(r.phongVeNote || '') + '</textarea></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Đóng</button>' +
        '<button type="button" class="btn btn-primary" data-action="adminTsSavePhongVe">Lưu</button>' +
      '</div>' +
    '</div>'
  );
}
function adminTsSavePhongVe() {
  var r = adminTsRowByKey(($('tsPvKey') || {}).value || '');
  if (!r) { closeAdminModal(); return; }
  var val = ($('tsPvNote') || {}).value.trim();
  var changed = (r.phongVeNote || '') !== val;

  if (r.kind === 'pk') {
    var list = PickupService.readFirstNonEmpty([]);
    var p = list.find(function (x) { return String(x.id) === String(r.paxId); });
    if (p) { p.statusNote = val; PickupService.save(list); }
  } else {
    var bank = lsRead(HN_STORAGE_KEY, {});
    var tb = bank[r.tripId];
    if (tb) {
      var codes = {}; (r.seatCodes || []).forEach(function (c) { codes[c] = true; });
      ['down', 'up', 'subSeats', 'extraSeats'].forEach(function (fld) {
        (tb[fld] || []).forEach(function (s) { if (s && codes[s.code]) s.transshipPickupNote = val; });
      });
      lsWrite(HN_STORAGE_KEY, bank);
    }
  }
  // Đồng bộ với ticketstaff: chèn 1 thông báo "vừa cập nhật ghi chú Phòng vé" (HN_PK_PHONGVE_NOTICES_KEY,
  // chung key) để role trung chuyển bên ticketstaff thấy ngay — y hệt pkNotifyPhongVeUpdate().
  if (changed) adminTsNotifyPhongVe(r.phone, r.key);

  closeAdminModal();
  showToast('Đã lưu ghi chú phòng vé.');
  renderTransshipView();
}
function adminTsNotifyPhongVe(phone, rowKey) {
  if (!rowKey) return;
  var raw; try { raw = localStorage.getItem(HN_PK_PHONGVE_NOTICES_KEY); } catch (e) { return; }
  var arr; try { arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  arr.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), phone: phone || '', rowKey: rowKey, ts: Date.now() });
  var s = JSON.stringify(arr);
  try { localStorage.setItem(HN_PK_PHONGVE_NOTICES_KEY, s); } catch (e) { }
  try { window.dispatchEvent(new StorageEvent('storage', { key: HN_PK_PHONGVE_NOTICES_KEY, newValue: s, storageArea: localStorage })); } catch (e) { }
}

/* ---------- "In rước" — chèn vạch phân cách đỏ (chung HN_PK_PRINT_RUOC_KEY với TicketStaff) ---------- */
function adminTsOpenPrintRuoc() {
  var now = new Date();
  var hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  openAdminModal(
    '<h3>In rước</h3>' +
    '<div class="admin-form">' +
      '<div class="fld"><label>Giờ</label><input type="text" id="tsRuocTime" value="' + esc(hhmm) + '" placeholder="VD: 14:30"></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Đóng</button>' +
        '<button type="button" class="btn btn-primary" data-action="adminTsSavePrintRuoc">Lưu</button>' +
      '</div>' +
    '</div>'
  );
}
function adminTsSavePrintRuoc() {
  var gio = ($('tsRuocTime') || {}).value.trim();
  if (!gio) { showToast('Nhập giờ in rước.'); return; }
  var list = adminTsReadDividers();
  list.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: '+++++ ' + gio + ' +++++', ts: Date.now() });
  adminTsWriteDividers(list);
  closeAdminModal();
  showToast('Đã in rước lúc ' + gio + '.');
  renderTransshipView();
}
function adminTsDismissDivider(id) {
  adminTsWriteDividers(adminTsReadDividers().filter(function (d) { return d.id !== id; }));
  renderTransshipView();
}

/* ---------- Modal "+ Tạo mới" khách rước liền (ghi thật vào PickupService) ---------- */
function adminOpenPickupModal() {
  var stations = FleetStore.getStations().map(function (s) { return s.name; }).sort();
  var stOpt = function () { return '<option value="">— Chọn —</option>' + stations.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join(''); };
  openAdminModal(
    '<h3>Thông tin khách rước</h3>' +
    '<form class="admin-form trip-form" data-submit-action="adminSavePickup" data-args=\'["__event__"]\'>' +
      '<p class="hint-inline" style="margin:0 0 4px;">Nhập thông tin khách rước để lưu vào hệ thống</p>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Họ và tên <span class="req">*</span></label><input type="text" id="tpName" placeholder="Nguyễn Văn A"></div>' +
        '<div class="fld"><label>Số điện thoại <span class="req">*</span></label><input type="text" id="tpPhone" placeholder="09xxxxxxxx"></div>' +
      '</div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Trạm đi</label><select id="tpFrom">' + stOpt() + '</select></div>' +
        '<div class="fld"><label>Trung chuyển đi</label><input type="text" id="tpFromT" placeholder="Địa chỉ đón cụ thể"></div>' +
      '</div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Trạm đến</label><select id="tpTo">' + stOpt() + '</select></div>' +
        '<div class="fld"><label>Trung chuyển đến</label><input type="text" id="tpToT" placeholder="Địa chỉ trả cụ thể"></div>' +
      '</div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Số lượng vé <span class="req">*</span></label><input type="number" id="tpCount" min="1" max="10" value="1"></div>' +
        '<div class="fld"><label>Ghi chú</label><input type="text" id="tpNote" placeholder="Ghi chú thêm..."></div>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Đóng</button>' +
        '<button type="submit" class="btn btn-primary">Lưu thông tin</button>' +
      '</div>' +
    '</form>'
  );
}
function adminSavePickup(e) {
  if (e && e.preventDefault) e.preventDefault();
  var name = ($('tpName') || {}).value.trim();
  var phone = ($('tpPhone') || {}).value.trim();
  if (!name || !phone) { showToast('Nhập họ tên và số điện thoại khách.'); return; }
  var selDate = adminCalState('ts').selectedStr || todayISO();
  var list = PickupService.readFirstNonEmpty([]);
  list.unshift({
    id: Date.now(),
    name: name, phone: phone,
    ticketCount: parseInt(($('tpCount') || {}).value, 10) || 1,
    fromStation: ($('tpFrom') || {}).value || '—',
    fromTransfer: ($('tpFromT') || {}).value.trim() || '',
    toStation: ($('tpTo') || {}).value || '—',
    toTransfer: ($('tpToT') || {}).value.trim() || '',
    note: ($('tpNote') || {}).value.trim() || '',
    assigned: null, guestType: 'Rước liền', isRuocLien: true,
    date: selDate, createdAt: new Date().toISOString(), printedAt: '', statusNote: ''
  });
  PickupService.saveAndBroadcast(list);
  closeAdminModal();
  showToast('Đã thêm khách rước liền: ' + name);
  renderTransshipView();
}

/* ---------- Bộ lọc / tab ---------- */
function adminTransshipSwitchTab(tab) { TRANSSHIP_SUBTAB = tab; ADMIN_TS_SEL = {}; renderTransshipView(); }
function adminTransshipFilterInput(field, val) {
  if (!(field in TRANSSHIP_FILTERS)) return;
  TRANSSHIP_FILTERS[field] = val || '';
  adminKeepFocus(renderTransshipView);
}
function adminTransshipResetFilters() {
  Object.keys(TRANSSHIP_FILTERS).forEach(function (k) { TRANSSHIP_FILTERS[k] = ''; });
  adminCalState('ts').selectedStr = '';
  ADMIN_TS_SEL = {};
  renderTransshipView();
}

/* Bấm nền tối ngoài panel/modal để đóng (giống ticketstaff #assignPickupModal). */
document.addEventListener('click', function (e) {
  if (!e.target) return;
  if (e.target.id === 'atsAssignOverlay') adminTsCloseAssignModal();
  if (e.target.id === 'atsUpdateOverlay') adminTsCloseUpdateModal();
  if (e.target.id === 'atsSellPaymentModal') adminTsCloseSellPayment();
});
