/* =========================================================
   3. QUẢN LÝ CHUYẾN
   Thiết kế BÁM SÁT tab "Quản lý phơi" của TicketStaff:
   - thanh lọc: Tên phơi / Ngày khởi hành / Hướng đi (Chiều đi–về) / Tuyến đi / Trạng thái
   - danh sách dạng THẺ (.phoi-card): giờ + biển số + ngày + badge trạng thái + tên phơi
     + meta (Loại xe / Ghế trống / Giá vé) + footer 2 nút.
   Cùng nguồn dữ liệu hn_trips_meta_v9 + seat bank hn_trip_seat_bank_v12.
   ========================================================= */
var TRIP_FILTERS = { name: '', date: '', direction: '', route: '', status: '' };

// id HƯỚNG (1 trong 4 hướng cố định) của 1 tuyến — ưu tiên FleetStore, fallback theo sense/tiền tố tên.
function tripRouteDirectionId(route) {
  var id = FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(route) : null;
  if (id) return id;
  var s = FleetStore.getRouteSense ? FleetStore.getRouteSense(route) : null;
  if (!s) s = String(route || '').indexOf('Sài Gòn') === 0 ? 'di' : 've';
  return s === 'di' ? 'sg-ag' : 'ag-sg';
}
var ADMIN_BULK = { mode: false, ids: [] }; // "Tạo phơi xe hàng loạt" — chọn phơi mẫu (isTemplate) rồi nhân bản theo khoảng ngày
var ADMIN_TPL_MODE = false; // đang mở modal ở chế độ "Tạo phơi mẫu" (gắn isTemplate cho phơi mới) — xem adminOpenTripModal

function fld(label, inner) { return '<div class="filter-field"><label>' + esc(label) + '</label>' + inner + '</div>'; }
function uniq(a) { return Array.from(new Set(a)); }

/* Trạng thái hiển thị THỐNG NHẤT với thẻ Phơi xe bên TicketStaff (tripDisplayStatusKey / TRIP_DISPLAY_STATUS):
   đã hủy → vòng đời phơi (manifest TicketStaff, key hn_ts_manifests_v1) → chưa có manifest thì suy từ
   biển số + vé đã bán. KHÔNG đọc thẳng t.status. bank = seat bank của phơi (HN_STORAGE_KEY[tripId]). */
function adminTripDisplayStatus(t, bank) {
  if (t.status === 'Đã hủy') return { cls: 'da-huy', label: 'Đã hủy' };
  var mf = lsRead('hn_ts_manifests_v1', {});
  var life = (mf && mf[t.id] && mf[t.id].status) || 'SELLING';
  if (life === 'DEPARTED') return { cls: 'da-khoi-hanh', label: 'Khởi hành' };
  if (life === 'REOPEN') return { cls: 'da-khoi-hanh', label: 'Re-open' };
  if (life === 'REOPEN_CLOSED') return { cls: 'da-khoi-hanh', label: 'Đóng Re-open' };
  if (life === 'MANIFEST_CLOSED') return { cls: 'da-khoi-hanh', label: 'Đã kết ca' };
  var plate = (bank && bank.plate) || t.plate || '';
  // Chỉ còn 2 trạng thái khi chưa tạo phơi: chưa có biển số vs đã có biển số ("Đang bán").
  // Bỏ "Đã chỉ định xe" — chỉ định xe xong coi như đang bán.
  return plate ? { cls: 'dang-ban', label: 'Đang bán' } : { cls: 'chua-chi-dinh', label: 'Chưa chỉ định' };
}

function renderTripsView() {
  var trips = getTrips();
  var seatBank = lsRead(HN_STORAGE_KEY, {});
  var seatMap = FleetStore.vehicleTypeSeats();
  var dtc = FleetStore.buildDirTripCfg();             // { [dirId]: { label, routes:[{label,price,...}], routeLabels:[...] } }
  var routeOpts = TRIP_FILTERS.direction && dtc[TRIP_FILTERS.direction]
    ? (dtc[TRIP_FILTERS.direction].routes || [])
    : Object.keys(dtc).reduce(function (acc, k) { return acc.concat(dtc[k].routes || []); }, []);

  var f = TRIP_FILTERS;
  var list = trips.filter(function (t) {
    if (!t) return false;
    // Chế độ chọn "phơi mẫu" luôn hiện đủ toàn bộ mẫu cố định, bỏ qua thanh lọc (giống TicketStaff).
    if (ADMIN_BULK.mode) return t.isTemplate && t.status !== 'Đã hủy';
    // Ngoài chế độ hàng loạt: KHÔNG hiện phơi mẫu trong danh sách thường (giống TicketStaff).
    if (t.isTemplate) return false;
    var bk = seatBank[t.id];
    var plateStr = (bk && bk.plate) || t.plate || '';
    var vtypeStr = (bk && bk.vehicleType) || t.vehicleType || '';
    if (f.name) {
      var hay = ((t.name || '') + ' ' + (t.route || '') + ' ' + (t.time || '') + ' ' + plateStr + ' ' + vtypeStr).toLowerCase();
      if (hay.indexOf(f.name.toLowerCase()) === -1) return false;
    }
    if (f.date && t.date && t.date !== f.date) return false;
    if (f.direction && tripRouteDirectionId(t.route) !== f.direction) return false;
    if (f.route && t.route !== f.route) return false;
    // Lọc theo ĐÚNG trạng thái đang hiện trên thẻ (suy từ vòng đời + biển số + vé), không theo t.status.
    if (f.status && adminTripDisplayStatus(t, bk).label !== f.status) return false;
    return true;
  }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });

  function optList(arr, cur, valFn, txtFn) {
    return arr.map(function (x) {
      var v = valFn(x); return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(txtFn(x)) + '</option>';
    }).join('');
  }

  var ICN_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var ICN_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICN_ROUTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15.472M9 3.236v15.472"/></svg>';
  var ICN_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICN_SELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9Z"/><path d="M13 5v2M13 17v2M13 11v2"/></svg>';

  function seatInfo(t) {
    var plan = seatBank[t.id], empty = 0, total = 0;
    if (plan && Array.isArray(plan.down) && Array.isArray(plan.up)) {
      var comb = plan.down.concat(plan.up);
      empty = comb.filter(function (s) { return s && s.state === 'empty'; }).length;
      total = comb.filter(function (s) { return s && s.state !== 'hidden'; }).length;
    } else { total = seatMap[t.vehicleType] || 24; empty = total; }
    return empty + '/' + total;
  }
  // Card hiển thị y hệt TicketStaff (renderTable): biển số & loại xe ưu tiên seat bank, giá vé fallback
  // 280.000đ, tên = t.name || "<tuyến> (<giờ>h)".
  function cardInner(t, cls, label) {
    var bank = seatBank[t.id];
    var timeStr = t.time || '00:00';
    var name = t.name || ((t.route || '') + ' (' + timeStr.replace(':', 'h') + ')');
    var plate = (bank && bank.plate) || t.plate || 'Chưa có';
    var vtype = (bank && bank.vehicleType) || t.vehicleType || '—';
    return '<div class="phoi-card-top">' +
        '<div class="phoi-card-schedule">' +
          '<div class="phoi-card-time-row"><span class="phoi-card-time">' + esc(timeStr) + '</span>' +
          '<span class="trip-plate-inline">' + esc(plate) + '</span></div>' +
          '<span class="phoi-card-date">' + fmtDate(t.date) + '</span>' +
        '</div>' +
        '<span class="status-badge ' + cls + '"><span class="status-dot"></span>' + esc(label) + '</span>' +
      '</div>' +
      '<div class="phoi-card-name">' + esc(name) + '</div>' +
      '<div class="phoi-card-meta">' +
        '<div class="phoi-card-meta-item"><label>Loại xe</label><span>' + esc(vtype) + '</span></div>' +
        '<div class="phoi-card-meta-item"><label>Ghế trống</label><span>' + seatInfo(t) + '</span></div>' +
        '<div class="phoi-card-meta-item"><label>Giá vé</label><span>' + fmtMoney(t.price || 280000) + '</span></div>' +
      '</div>';
  }

  function tripCard(t) {
    if (ADMIN_BULK.mode) {
      // Danh sách PHƠI MẪU: mọi thẻ luôn hiện "Chưa chỉ định" (mẫu không mang trạng thái/biển số sống).
      var sel = ADMIN_BULK.ids.indexOf(t.id) !== -1;
      return '<div class="phoi-card phoi-card-selectable status-chua-chi-dinh' + (sel ? ' selected' : '') + '" data-action="adminToggleBulkSelect" data-args=\'["' + esc(t.id) + '"]\'>' +
        '<div class="phoi-card-select-check">' + (sel ? ICN_CHECK : '') + '</div>' +
        cardInner(t, 'chua-chi-dinh', 'Chưa chỉ định') +
      '</div>';
    }

    var ds = adminTripDisplayStatus(t, seatBank[t.id]);
    var cls = ds.cls, label = ds.label;
    var sellDisabled = cls === 'da-huy' || cls === 'da-khoi-hanh';
    return '<div class="phoi-card status-' + cls + '" data-action="adminOpenTripModal" data-args=\'["' + esc(t.id) + '"]\'>' +
      '<button type="button" class="phoi-route-btn" title="Xem lộ trình" data-action="adminShowTripRoute" data-stop-propagation="1" data-args=\'["' + esc(t.id) + '"]\'>' + ICN_ROUTE + '</button>' +
      cardInner(t, cls, label) +
      '<div class="phoi-card-footer">' +
        '<button type="button" class="btn btn-secondary phoi-edit-btn" data-action="adminOpenTripModal" data-stop-propagation="1" data-args=\'["' + esc(t.id) + '"]\'>' + ICN_EDIT + 'Chỉnh sửa</button>' +
        '<button type="button" class="btn btn-primary phoi-sell-btn" data-action="adminSellTripTickets" data-stop-propagation="1" data-args=\'["' + esc(t.id) + '"]\'' + (sellDisabled ? ' disabled' : '') + '>' + ICN_SELL + 'Bán vé</button>' +
      '</div>' +
    '</div>';
  }

  var grid = list.length
    ? '<div class="phoi-card-grid">' + list.map(tripCard).join('') + '</div>'
    : '<div class="grid-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg><p>' +
      (ADMIN_BULK.mode ? 'Chưa có phơi mẫu nào.' : 'Không tìm thấy chuyến phù hợp với bộ lọc.') + '</p></div>';

  var today = todayISO();
  var allSelected = list.length > 0 && list.every(function (t) { return ADMIN_BULK.ids.indexOf(t.id) !== -1; });
  var bulkBar = ADMIN_BULK.mode
    ? '<div class="bulk-bar">' +
        '<span class="bulk-bar-hint">' + (ADMIN_BULK.ids.length ? 'Đã chọn ' + ADMIN_BULK.ids.length + '/' + list.length + ' phơi mẫu' : 'Chọn các phơi mẫu bên trên để tạo hàng loạt theo khoảng ngày') + '</span>' +
        '<div class="bulk-bar-fields">' +
          '<div class="filter-field"><label>Từ ngày</label><input type="date" id="bkFrom" value="' + today + '" min="' + today + '"></div>' +
          '<div class="filter-field"><label>Đến ngày</label><input type="date" id="bkTo" value="' + today + '" min="' + today + '"></div>' +
          '<button class="btn btn-secondary" data-action="adminBulkSelectAll"' + (list.length ? '' : ' disabled') + '>' + (allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả') + '</button>' +
          '<button class="btn btn-secondary" data-action="adminToggleBulkMode">Hủy</button>' +
          '<button class="btn btn-primary" data-action="adminBulkCreate"' + (ADMIN_BULK.ids.length ? '' : ' disabled') + '>Tạo hàng loạt</button>' +
        '</div>' +
      '</div>'
    : '';

  // .has-bulk-bar: chừa chỗ dưới lưới cho thanh chọn phơi mẫu (position:fixed, dính đáy màn hình).
  var body = '<div class="phoi-grid-wrap' + (ADMIN_BULK.mode ? ' has-bulk-bar' : '') + '">' + grid + '</div>' + bulkBar;

  $('viewTrips').innerHTML =
    '<div class="filter-toolbar tf-toolbar">' +
      fld('Tên phơi', '<input type="text" id="tfName" value="' + esc(f.name) + '" placeholder="Nhập tên phơi..." data-change-action="adminTripFilterInput" data-args=\'["name","__this_value__"]\'>') +
      fld('Ngày khởi hành', '<input type="date" id="tfDate" value="' + esc(f.date) + '" data-change-action="adminTripFilterInput" data-args=\'["date","__this_value__"]\'>') +
      fld('Hướng đi', '<select id="tfDirection" data-change-action="adminTripFilterInput" data-args=\'["direction","__this_value__"]\'>' +
        '<option value="">Tất cả hướng</option>' +
        FleetStore.getDirections().filter(function (d) { return d && d.active !== false; })
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
          .map(function (d) { return '<option value="' + esc(d.id) + '"' + (f.direction === d.id ? ' selected' : '') + '>' + esc(d.label) + '</option>'; }).join('') +
        '</select>') +
      fld('Tuyến đi', '<select id="tfRoute" data-change-action="adminTripFilterInput" data-args=\'["route","__this_value__"]\'>' +
        '<option value="">Tất cả tuyến</option>' + optList(routeOpts, f.route, function (r) { return r.label; }, function (r) { return r.label; }) + '</select>') +
      fld('Trạng thái', '<select id="tfStatus" data-change-action="adminTripFilterInput" data-args=\'["status","__this_value__"]\'>' +
        '<option value="">Tất cả trạng thái</option>' + optList(TRIP_STATUSES, f.status, function (x) { return x; }, function (x) { return x; }) + '</select>') +
      '<button class="btn btn-primary" data-action="adminTripSearch">Tìm kiếm</button>' +
      '<button class="btn" data-action="adminResetTripFilters">Đặt lại</button>' +
      '<div class="filter-spacer"></div>' +
      '<button class="btn' + (ADMIN_BULK.mode ? ' bulk-toggle-active' : '') + '" data-action="adminToggleBulkMode">' +
        (ADMIN_BULK.mode ? 'Hủy chọn phơi mẫu' : 'Tạo phơi xe hàng loạt') + '</button>' +
      (ADMIN_BULK.mode
        ? '<button class="btn btn-primary" data-action="adminOpenTripModal" data-args=\'["",true]\'>+ Tạo phơi mẫu</button>'
        : '<button class="btn btn-primary" data-action="adminOpenTripModal" data-args=\'[""]\'>+ Tạo phơi xe</button>') +
    '</div>' +
    body;
}

function adminTripSearch() {
  var el = $('tfName');
  if (el) TRIP_FILTERS.name = el.value || '';
  renderTripsView();
}
function adminTripFilterInput(field, val) {
  if (!(field in TRIP_FILTERS)) return;
  TRIP_FILTERS[field] = val || '';
  if (field === 'direction') TRIP_FILTERS.route = ''; // đổi Hướng đi → dựng lại danh sách Tuyến
  renderTripsView();
}
function adminResetTripFilters() {
  Object.keys(TRIP_FILTERS).forEach(function (k) { TRIP_FILTERS[k] = ''; });
  renderTripsView();
}

/* ---- Xem lộ trình (điểm xuất phát → điểm đón dọc đường → điểm đến) ---- */
function adminShowTripRoute(id) {
  var t = getTrips().find(function (x) { return x.id === id; });
  if (!t) return;
  var steps = [];
  if (t.fromStation) steps.push(['start', 'Điểm xuất phát', t.fromStation]);
  (Array.isArray(t.pickupStations) ? t.pickupStations : []).forEach(function (s) { steps.push(['stop', 'Điểm đón khách', s]); });
  if (t.toStation) steps.push(['end', 'Điểm đến', t.toStation]);
  var timeline = steps.length
    ? steps.map(function (s) {
        return '<div class="route-step ' + s[0] + '"><span class="route-step-dot"></span>' +
          '<div class="route-step-body"><div class="route-step-label">' + esc(s[1]) + '</div>' +
          '<div class="route-step-name">' + esc(s[2]) + '</div></div></div>';
      }).join('')
    : '<p class="hint-inline">Chưa có thông tin lộ trình chi tiết cho chuyến này.</p>';
  openAdminModal(
    '<h3>Lộ trình chuyến</h3>' +
    '<div class="admin-form">' +
      '<div style="font-weight:800;font-size:14px;">' + esc(t.name || t.route || '—') + '</div>' +
      '<p class="hint-inline" style="margin:4px 0 14px;">' + [esc(t.time || ''), fmtDate(t.date), esc(t.plate || '')].filter(Boolean).join(' • ') + '</p>' +
      '<div class="route-timeline">' + timeline + '</div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="closeAdminModal">Đóng</button></div>' +
    '</div>'
  );
}

/* ---- Tạo phơi xe hàng loạt từ phơi mẫu ---- */
function adminToggleBulkMode() {
  ADMIN_BULK.mode = !ADMIN_BULK.mode;
  ADMIN_BULK.ids = [];
  renderTripsView();
}
function adminToggleBulkSelect(id) {
  var i = ADMIN_BULK.ids.indexOf(id);
  if (i === -1) ADMIN_BULK.ids.push(id); else ADMIN_BULK.ids.splice(i, 1);
  renderTripsView();
}
function adminBulkSelectAll() {
  var ids = getTrips().filter(function (t) { return t && t.isTemplate && t.status !== 'Đã hủy'; }).map(function (t) { return t.id; });
  var allSel = ids.length > 0 && ids.every(function (id) { return ADMIN_BULK.ids.indexOf(id) !== -1; });
  ADMIN_BULK.ids = allSel ? [] : ids;
  renderTripsView();
}
function adminBulkCreate() {
  if (!ADMIN_BULK.ids.length) { showToast('Chưa chọn phơi mẫu nào.'); return; }
  var from = ($('bkFrom') || {}).value || '';
  var to = ($('bkTo') || {}).value || '';
  if (!from || !to) { showToast('Chọn Từ ngày và Đến ngày.'); return; }
  if (new Date(to) < new Date(from)) { showToast('Đến ngày không được nhỏ hơn Từ ngày.'); return; }

  var dates = [];
  var cur = new Date(from), end = new Date(to);
  while (cur <= end) { dates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }

  var trips = getTrips();
  var templates = ADMIN_BULK.ids.map(function (id) { return trips.find(function (x) { return x.id === id; }); }).filter(Boolean);
  var total = dates.length * templates.length;
  if (!confirm('Sẽ tạo khoảng ' + total + ' chuyến từ ' + templates.length + ' phơi mẫu. Xác nhận?')) return;

  var created = 0, n = 0;
  dates.forEach(function (d) {
    templates.forEach(function (tpl) {
      var newId = String(Date.now()) + '_' + (n++);
      trips.push({
        id: newId,
        name: tpl.name || ((tpl.route || '') + ' (' + (tpl.time || '') + ')'),
        date: d, route: tpl.route, time: tpl.time,
        fromStation: tpl.fromStation || '', toStation: tpl.toStation || '',
        pickupStations: Array.isArray(tpl.pickupStations) ? tpl.pickupStations.slice() : [],
        vehicleType: tpl.vehicleType, price: tpl.price,
        status: 'Chưa chỉ định', plate: '', note: tpl.note || '', createdAt: Date.now() + n
      });
      created++;
    });
  });
  setTrips(trips);
  // seat bank rỗng cho từng chuyến vừa tạo
  trips.slice(trips.length - created).forEach(function (nt) { regenSeatBankForType(nt.id, nt.vehicleType, nt.price); });
  FleetStore.log({ action: 'bulk-create', entity: 'trip', summary: 'Tạo hàng loạt ' + created + ' chuyến từ ' + templates.length + ' phơi mẫu' });
  ADMIN_BULK.ids = [];
  showToast('Đã tạo ' + created + ' chuyến.');
  renderTripsView();
}

/* Modal "Tạo phơi xe mới" / "Chỉnh sửa phơi xe" — dựng GIỐNG #singleModal của TicketStaff:
   Hướng đi → Trạm đi | Trạm đến → Ngày | Giờ → Trạm có thể nhận thêm khách → Giá vé | Loại xe →
   Ghi chú → (chỉ khi sửa) Trạng thái | Biển số → Tên phơi. Footer: [Hủy phơi xe] [Đóng] [Lưu]. */
function adminOpenTripModal(id, asTemplate) {
  ADMIN_TPL_MODE = !!asTemplate && !id;
  var trips = getTrips();
  var t = id ? trips.find(function (x) { return x.id === id; }) : null;
  var readOnly = !!t && (t.status === 'Khởi hành' || t.status === 'Đã khởi hành' || t.status === 'Đã hủy');
  var cfg = FleetStore.buildTripDirectionsCfg();               // { [routeId]: {label,route,price,fromStations,toStations,pickupStations,directionLabel} }
  var dirKeys = Object.keys(cfg);
  var curDirKey = t ? (dirKeys.find(function (k) { return cfg[k].route === t.route; }) || '') : '';
  var ro = roDis(readOnly);

  var dirOpts = '<option value="">-- Chọn hướng tuyến --</option>' +
    dirKeys.map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === curDirKey ? ' selected' : '') + '>' + esc(cfg[k].route) + '</option>';
    }).join('');

  var vtypes = FleetStore.getVehicleTypes({ scope: 'line' }).filter(function (v) { return activeOf(v) && v.featuredForTrip; });
  if (!vtypes.length) vtypes = FleetStore.getVehicleTypes({ scope: 'line' }).filter(activeOf);
  var curType = t ? (t.vehicleType || '') : (vtypes[0] && vtypes[0].name) || '';
  if (curType && !vtypes.some(function (v) { return v.name === curType; })) vtypes = vtypes.concat([{ name: curType }]);

  openAdminModal(
    '<h3>' + (t ? 'Chỉnh sửa phơi xe' : (ADMIN_TPL_MODE ? 'Tạo phơi mẫu' : 'Tạo phơi xe mới')) + '</h3>' +
    '<form class="admin-form trip-form" data-submit-action="adminSaveTrip" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="ttId" value="' + (t ? esc(t.id) : '') + '">' +

      '<div class="fld"><label>Hướng đi <span class="req">*</span></label>' +
        '<select id="ttDir" ' + ro + ' data-change-action="adminTripDirChange">' + dirOpts + '</select></div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Trạm đi <span class="req">*</span></label>' +
          '<select id="ttFrom" ' + ro + ' data-change-action="adminTripNameSuggest"><option value="">-- Chọn hướng đi trước --</option></select></div>' +
        '<div class="fld"><label>Trạm đến <span class="req">*</span></label>' +
          '<select id="ttTo" ' + ro + ' data-change-action="adminTripNameSuggest"><option value="">-- Chọn hướng đi trước --</option></select></div>' +
      '</div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Ngày khởi hành <span class="req">*</span></label>' +
          '<input type="date" id="ttDate" ' + ro + ' value="' + (t ? esc(t.date || '') : todayISO()) + '"></div>' +
        '<div class="fld"><label>Giờ khởi hành <span class="req">*</span></label>' +
          '<input type="time" id="ttTime" ' + ro + ' value="' + (t ? esc(t.time || '') : '') + '" data-change-action="adminTripNameSuggest"></div>' +
      '</div>' +

      '<div class="fld"><label>Trạm có thể nhận thêm khách</label>' +
        '<div class="station-pick-group" id="ttPickups"></div></div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Giá vé (đ) <span class="req">*</span></label>' +
          '<input type="number" id="ttPrice" min="0" step="5000" ' + ro + ' placeholder="Lấy theo hướng đi" value="' + (t ? (t.price || '') : '') + '"></div>' +
        '<div class="fld"><label>Loại xe <span class="req">*</span></label>' +
          '<select id="ttType" ' + ro + '>' +
            vtypes.map(function (v) { return '<option value="' + esc(v.name) + '"' + (v.name === curType ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('') +
          '</select></div>' +
      '</div>' +

      '<div class="fld"><label>Ghi chú</label>' +
        '<input type="text" id="ttNote" ' + ro + ' placeholder="Thông tin nội bộ xe tăng cường..." value="' + (t ? esc(t.note || '') : '') + '"></div>' +

      (t ? '<div class="fld-row">' +
        '<div class="fld"><label>Trạng thái phơi xe</label><select id="ttStatus" ' + ro + '>' +
          TRIP_STATUSES.map(function (s) { return '<option value="' + esc(s) + '"' + (s === (t.status || '') ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="fld"><label>Biển số xe chỉ định</label><input type="text" id="ttPlate" ' + ro + ' placeholder="VD: 51F-123.45" value="' + esc(t.plate || '') + '"></div>' +
      '</div>' : '') +

      '<div class="fld"><label>Tên phơi <span class="req">*</span></label>' +
        '<input type="text" id="ttName" ' + ro + ' placeholder="Tự cập nhật theo Trạm đi - Trạm đến" value="' + (t ? esc(t.name || '') : '') + '"></div>' +

      '<div class="modal-actions">' +
        (t ? '<button type="button" class="btn btn-danger" data-action="adminCancelTripFromModal" data-args=\'["' + esc(t.id) + '"]\' style="margin-right:auto;"' + (readOnly ? ' disabled' : '') + '>Hủy phơi xe</button>' : '') +
        '<button type="button" class="btn" data-action="closeAdminModal">Đóng</button>' +
        (readOnly ? '' : '<button type="submit" class="btn btn-primary">Lưu</button>') +
      '</div>' +
    '</form>'
  );

  adminTripDirChange();                 // đổ Trạm đi/đến + pill Trạm đón + giá theo hướng đang chọn
  if (t) {
    if (t.fromStation) setSelect('ttFrom', t.fromStation);
    if (t.toStation) setSelect('ttTo', t.toStation);
    // tick lại các trạm đón đã lưu — bổ sung pill cho trạm đã lưu không nằm trong cụm điểm đến hiện tại (dữ liệu cũ)
    var saved = Array.isArray(t.pickupStations) ? t.pickupStations : [];
    var pbox = $('ttPickups');
    if (pbox && saved.length) {
      var em = pbox.querySelector('.station-pick-empty');
      if (em) em.remove();
      var have = {};
      Array.prototype.forEach.call(pbox.querySelectorAll('input[type=checkbox]'), function (cb) { have[cb.value] = true; });
      saved.forEach(function (s) {
        if (s && !have[s]) {
          pbox.insertAdjacentHTML('beforeend', '<label class="station-pick-pill"><input type="checkbox" value="' + esc(s) + '" data-change-action="adminTogglePickup" data-args=\'["__this__"]\'>' + esc(s) + '</label>');
          have[s] = true;
        }
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('#ttPickups input[type=checkbox]'), function (cb) {
      cb.checked = saved.indexOf(cb.value) !== -1;
      var pill = cb.closest('.station-pick-pill');
      if (pill) pill.classList.toggle('checked', cb.checked);
    });
    // giá vé & tên phơi thật của phơi này (đặt SAU adminTripDirChange vì hàm đó vừa set giá mặc định theo hướng)
    if ($('ttPrice')) $('ttPrice').value = t.price || 280000;
    if ($('ttName')) $('ttName').value = t.name || '';
  }
}
function roDis(ro) { return ro ? 'disabled' : ''; }
function setSelect(id, val) {
  var s = $(id); if (!s) return;
  if (!Array.prototype.some.call(s.options, function (o) { return o.value === val; })) s.add(new Option(val, val));
  s.value = val;
}

// Đổi Hướng đi → dựng lại Trạm đi/Trạm đến + danh sách pill "Trạm có thể nhận thêm khách" + giá vé mặc định.
function adminTripDirChange() {
  var cfg = FleetStore.buildTripDirectionsCfg();
  var d = cfg[$('ttDir') ? $('ttDir').value : ''];
  var fromSel = $('ttFrom'), toSel = $('ttTo'), pickBox = $('ttPickups'), priceEl = $('ttPrice');

  if (!d) {
    if (fromSel) fromSel.innerHTML = '<option value="">-- Chọn hướng đi trước --</option>';
    if (toSel) toSel.innerHTML = '<option value="">-- Chọn hướng đi trước --</option>';
    if (pickBox) pickBox.innerHTML = '<span class="station-pick-empty">Không có trạm dọc đường</span>';
    return;
  }
  if (fromSel) fromSel.innerHTML = '<option value="">-- Chọn trạm đi --</option>' +
    (d.fromStations || []).map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
  if (toSel) toSel.innerHTML = '<option value="">-- Chọn trạm đến --</option>' +
    (d.toStations || []).map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');

  // "Trạm có thể nhận thêm khách" = TOÀN BỘ trạm phía điểm đến của hướng (giống TicketStaff), không bó
  // vào riêng pickupStations của tuyến con.
  var opts = (FleetStore.pickupStationsForDirection ? FleetStore.pickupStationsForDirection(d.directionId) : (d.pickupStations || [])) || [];
  if (pickBox) {
    pickBox.innerHTML = opts.length
      ? opts.map(function (s) {
          return '<label class="station-pick-pill"><input type="checkbox" value="' + esc(s) + '" data-change-action="adminTogglePickup" data-args=\'["__this__"]\'>' + esc(s) + '</label>';
        }).join('')
      : '<span class="station-pick-empty">Không có trạm dọc đường</span>';
  }
  if (priceEl) priceEl.value = d.price || '';
  adminTripNameSuggest();
}

function adminTogglePickup(cb) {
  var pill = cb.closest('.station-pick-pill');
  if (pill) pill.classList.toggle('checked', cb.checked);
}

// Tên phơi tự gợi ý "Trạm đi - Trạm đến (giờ)" mỗi khi đổi Trạm đi / Trạm đến / Giờ (nhân viên vẫn gõ đè được).
function adminTripNameSuggest() {
  var from = ($('ttFrom') || {}).value || '';
  var to = ($('ttTo') || {}).value || '';
  var time = ($('ttTime') || {}).value || '';
  var nameEl = $('ttName');
  if (!nameEl || !from || !to) return;
  nameEl.value = time ? (from + ' - ' + to + ' (' + time + ')') : (from + ' - ' + to);
}

function adminCancelTripFromModal(id) {
  closeAdminModal();
  adminCancelTrip(id);
}

function adminSaveTrip(e) {
  e.preventDefault();
  var id = $('ttId').value;
  var cfg = FleetStore.buildTripDirectionsCfg();
  var d = cfg[$('ttDir').value];
  var from = $('ttFrom').value, to = $('ttTo').value;
  if (!d || !from || !to) { showToast('Vui lòng chọn đầy đủ Hướng đi, Trạm đi và Trạm đến.'); return; }
  var date = $('ttDate').value, time = $('ttTime').value;
  if (!date || !time) { showToast('Vui lòng nhập Ngày và Giờ khởi hành.'); return; }
  var price = parseInt($('ttPrice').value, 10) || d.price || 280000;
  var vehicleType = $('ttType').value;
  var name = $('ttName').value.trim() || (from + ' - ' + to);
  var note = $('ttNote').value.trim();
  var pickups = Array.prototype.map.call(
    document.querySelectorAll('#ttPickups input[type=checkbox]:checked'), function (cb) { return cb.value; });
  var trips = getTrips();

  if (id) {
    var t = trips.find(function (x) { return x.id === id; });
    if (!t) { showToast('Không tìm thấy phơi xe.'); return; }
    var before = JSON.parse(JSON.stringify(t));
    var typeChanged = t.vehicleType !== vehicleType;
    if (typeChanged && !confirm('Cảnh báo: Thay đổi loại xe sẽ xoá toàn bộ sơ đồ ghế cũ và sinh lại ghế trống mới. Tiếp tục?')) return;
    t.route = d.route; t.fromStation = from; t.toStation = to; t.pickupStations = pickups;
    t.date = date; t.time = time; t.price = price; t.vehicleType = vehicleType; t.name = name; t.note = note;
    if ($('ttStatus')) t.status = $('ttStatus').value;
    if ($('ttPlate')) t.plate = $('ttPlate').value.trim();
    setTrips(trips);
    if (typeChanged) regenSeatBankForType(id, vehicleType, price);
    // Đồng bộ biển số / loại xe / tài xế-phụ xe mặc định xuống seat bank — giống updateExistingTrip() của TicketStaff,
    // để header sơ đồ ghế bên TicketStaff luôn hiện đúng biển số của phơi.
    syncTripSeatBankMeta(id, t.plate || '', vehicleType);
    FleetStore.log({ action: 'update', entity: 'trip', entityId: id, summary: 'Sửa phơi ' + name, before: before, after: t });
  } else {
    var newId = String(Date.now());
    var nt = {
      id: newId, name: name, date: (ADMIN_TPL_MODE ? todayISO() : date), route: d.route, fromStation: from, toStation: to,
      pickupStations: pickups, time: time, vehicleType: vehicleType, price: price,
      note: note, status: 'Chưa chỉ định', plate: '', createdAt: Date.now()
    };
    if (ADMIN_TPL_MODE) nt.isTemplate = true;
    trips.push(nt);
    setTrips(trips);
    regenSeatBankForType(newId, vehicleType, price);
    FleetStore.log({ action: 'create', entity: 'trip', entityId: newId, summary: (ADMIN_TPL_MODE ? 'Tạo phơi mẫu ' : 'Tạo phơi ') + name, after: nt });
  }
  var wasTpl = ADMIN_TPL_MODE;
  ADMIN_TPL_MODE = false;
  closeAdminModal();
  showToast(wasTpl ? 'Đã thêm phơi mẫu.' : 'Đã lưu phơi xe.');
  renderTripsView();
}

// Ghi biển số / loại xe / (tài xế, phụ xe mặc định khi có biển số) xuống seat bank của phơi.
function syncTripSeatBankMeta(tripId, plate, vehicleType) {
  var bank = lsRead(HN_STORAGE_KEY, {});
  var b = bank[tripId];
  if (!b) return;
  b.plate = plate;
  b.vehicleType = vehicleType;
  if (plate) {
    b.driver = b.driver || 'Phạm Quốc Bảo';
    b.helper = b.helper || 'Đỗ Văn Sơn';
  }
  bank[tripId] = b;
  lsWrite(HN_STORAGE_KEY, bank);
}

/* ---- "Bán vé" trên thẻ phơi — mở Danh sách vé của phơi (admin không có luồng đặt vé; đây là chỗ xem/
   quản lý vé gần nhất) ---- */
function adminSellTripTickets(id) {
  var t = getTrips().find(function (x) { return x.id === id; });
  if (!t) return;
  if (typeof TICKET_FILTERS === 'object') {
    Object.keys(TICKET_FILTERS).forEach(function (k) { TICKET_FILTERS[k] = ''; });
    TICKET_FILTERS.route = t.route || '';
  }
  try { if (typeof adminCalState === 'function') adminCalState('tk').selectedStr = t.date || ''; } catch (e) {}
  if (typeof switchAdminView === 'function') switchAdminView('viewTicketList');
}

/* Sinh seat bank rỗng cho chuyến mới / khi đổi loại xe — ghi thẳng HN_STORAGE_KEY (không dùng global
   tripSeatBank của ticketstaff). Nếu bank hiện có ghế đã bán thì KHÔNG đụng (an toàn dữ liệu). */
function regenSeatBankForType(tripId, vehicleType, price) {
  var bank = lsRead(HN_STORAGE_KEY, {});
  var cur = bank[tripId];
  if (cur && hasSoldSeats(cur)) {
    showToast('Chuyến đã có ghế bán — giữ nguyên sơ đồ ghế, chỉ đổi thông tin loại xe.');
    cur.vehicleType = vehicleType;
    bank[tripId] = cur;
    lsWrite(HN_STORAGE_KEY, bank);
    return;
  }
  var codes;
  try { codes = getSeatCodesForVehicleType(vehicleType); } catch (e) { codes = { down: [], up: [] }; }
  var mk = function (arr) {
    return (arr || []).map(function (c) {
      if (String(c).endsWith('_hidden')) return { code: c, state: 'hidden' };
      return { code: c, state: 'empty', locked: false, price: Number(price) || 280000, count: 1 };
    });
  };
  bank[tripId] = {
    down: mk(codes.down), up: mk(codes.up),
    plate: (cur && cur.plate) || '', vehicleType: vehicleType,
    driver: (cur && cur.driver) || '', helper: (cur && cur.helper) || '',
    cancelledSeats: [], subSeats: [], extraSeats: []
  };
  lsWrite(HN_STORAGE_KEY, bank);
}
function hasSoldSeats(bank) {
  var chk = function (a) { return (a || []).some(function (s) { return s && (s.state === 'sold' || s.state === 'hold'); }); };
  return chk(bank.down) || chk(bank.up) || chk(bank.subSeats);
}

function adminCancelTrip(id) {
  if (!confirm('Đánh dấu chuyến này là "Đã hủy"?')) return;
  var trips = getTrips();
  var t = trips.find(function (x) { return x.id === id; });
  if (!t) return;
  t.status = 'Đã hủy';
  setTrips(trips);
  FleetStore.log({ action: 'cancel', entity: 'trip', entityId: id, summary: 'Huỷ chuyến ' + (t.name || id) });
  showToast('Đã huỷ chuyến.');
  renderTripsView();
}

