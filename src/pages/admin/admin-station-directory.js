/* =========================================================
   TRẠM XE — Danh mục đầy đủ tất cả các trạm hiện có của nhà xe.
   Khác với panel "Danh mục trạm theo địa điểm" trong Tuyến xe (admin-stations.js, chỉ có tên + khu
   vực, dùng để chọn trạm đi/đến/đón cho tuyến) — màn này là nơi CRUD đầy đủ thông tin liên hệ của
   từng trạm: mã trạm, địa chỉ, tỉnh thành, hotline hàng/vé. Cùng 1 nguồn dữ liệu FleetStore station
   (HN_STATIONS_KEY) — sửa/xoá ở đây phản ánh ngay sang Tuyến xe và ngược lại.
   Danh mục "Khu vực (Tỉnh/Thành)" quản lý ở nút "Cập nhật danh mục" (mở modal chung getRegionMeta()).
   ========================================================= */
var STATION_DIR_FILTER = '';
var STATION_DIR_REGION = '';
var STATION_SUBTAB = 'all';

function adminSetStationSubTab(tab) {
  if (!['all', 'stop'].includes(tab)) return;
  STATION_SUBTAB = tab;
  renderStationsView();
}

function renderStationsView() {
  var allStations = FleetStore.getStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var regionMetaAll = getRegionMeta({ all: true });
  if (STATION_DIR_REGION && !regionMetaAll.some(function (rm) { return rm[0] === STATION_DIR_REGION; })) STATION_DIR_REGION = '';

  var q = STATION_DIR_FILTER.trim().toLowerCase();
  var stationMap = {};
  allStations.forEach(function (s) { stationMap[s.name] = s; });

  var filteredAll = allStations.filter(function (s) {
    if (STATION_DIR_REGION && s.region !== STATION_DIR_REGION) return false;
    if (!q) return true;
    var hay = [s.name, s.code, s.address].filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  var stationById = {};
  allStations.forEach(function (s) { stationById[s.id] = s; });
  var stopList = FleetStore.getStopStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var filteredStop = stopList.filter(function (stop) {
    var station = stationById[stop.stationId] || null;
    if (STATION_DIR_REGION && (!station || station.region !== STATION_DIR_REGION)) return false;
    if (!q) return true;
    var hay = [stop.name, stop.code, stop.address, stop.hotline, station && station.name].filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  var allRows = filteredAll.length ? filteredAll.map(function (s, i) {
    var regionLabel = s.region ? (regionMetaAll.find(function (rm) { return rm[0] === s.region; }) || [])[1] || s.region : '';
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(s.name) + '</b></td>' +
      '<td class="mono">' + esc(s.code || '—') + '</td>' +
      '<td>' + esc(s.address || '—') + '</td>' +
      '<td>' + (regionLabel ? esc(regionLabel) : '<span class="hint-inline">Chưa gán — cần sửa</span>') + '</td>' +
      '<td class="mono">' + esc(s.hotlineCargo || '—') + '</td>' +
      '<td class="mono">' + esc(s.hotlineTicket || '—') + '</td>' +
      '<td class="col-status">' + activeTag(s.active !== false) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStationRowMenu" data-args=\'["__this__","' + esc(s.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="9" class="empty-state">Không tìm thấy trạm phù hợp.</td></tr>';

  var currentTab = STATION_SUBTAB || 'all';
  var tabContent = '';

  if (currentTab === 'all') {
    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Tên trạm</th><th>Mã trạm</th><th>Địa chỉ</th><th>Tỉnh</th><th>Hotline hàng</th><th>Hotline vé</th><th class="col-status">Trạng thái</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + allRows + '</tbody></table></div>' +
      '</div>';
  } else {
    var stopStations = filteredStop.slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
    var stopRows = stopStations.length ? stopStations.map(function (stop, i) {
      var station = stationById[stop.stationId] || null;
      return '<tr>' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td><b>' + (station ? esc(station.name) : '<span class="hint-inline">Mồ côi' + (stop.stationName ? ' (' + esc(stop.stationName) + ')' : '') + ' — chọn lại trạm</span>') + '</b></td>' +
        '<td><b>' + esc(stop.name || '—') + '</b></td>' +
        '<td class="mono">' + esc(stop.code || '—') + '</td>' +
        '<td>' + esc(stop.address || '—') + '</td>' +
        '<td class="mono">' + esc(stop.hotline || '—') + '</td>' +
        '<td class="col-status">' + activeTag(stop.active !== false) + '</td>' +
        '<td class="row-actions">' +
          '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStopStationRowMenu" data-args=\'["__this__","' + esc(stop.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="8" class="empty-state">Không có điểm dừng phù hợp.</td></tr>';

    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Trạm xe</th><th>Điểm dừng</th><th>Mã</th><th>Địa chỉ</th><th>Hotline</th><th class="col-status">Trạng thái</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + stopRows + '</tbody></table></div>' +
      '</div>';
  }

  var addButton = '';
  if (currentTab === 'all') {
    addButton = '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStationModal" data-args=\'["","' + esc(STATION_DIR_REGION) + '"]\'>Thêm trạm</button>';
  } else {
    addButton = '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStopStationModal">Thêm điểm dừng</button>';
  }

  $('viewStations').innerHTML =
    '<div class="station-subtabs">' +
      '<button type="button" class="station-subtab' + (currentTab === 'all' ? ' active' : '') + '" data-action="adminSetStationSubTab" data-args=\'["all"]\'>Trạm xe</button>' +
      '<button type="button" class="station-subtab' + (currentTab === 'stop' ? ' active' : '') + '" data-action="adminSetStationSubTab" data-args=\'["stop"]\'>Điểm dừng</button>' +
    '</div>' +
    '<div class="sd-toolbar" style="gap:8px;">' +
      '<div class="filter-field sd-field-search" style="flex:1 1 190px; min-width:150px; max-width:none;">' +
        '<label>Tìm</label>' +
        '<input type="text" id="sdSearch" value="' + esc(STATION_DIR_FILTER) + '" placeholder="Tên, mã..." data-input-action="adminStationDirSearch" data-args=\'["__this_value__"]\'></div>' +
      '<div class="filter-field sd-field-region" style="flex:1 1 190px; min-width:150px;">' +
        '<label>Tỉnh</label>' +
        '<select id="sdRegionFilter" data-change-action="adminStationDirFilterRegion" data-args=\'["__this_value__"]\'>' +
          '<option value="">Tất cả</option>' +
          regionMetaAll.map(function (rm) { return '<option value="' + esc(rm[0]) + '"' + (rm[0] === STATION_DIR_REGION ? ' selected' : '') + '>' + esc(rm[1]) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="sd-toolbar-actions" style="margin-left:auto; display:flex; gap:8px;">' +
        addButton +
        '<button type="button" class="btn sd-btn" data-action="adminOpenRegionsModal">Cập nhật danh mục</button>' +
      '</div>' +
    '</div>' +
    '<div class="sd-blocks">' + tabContent + '</div>';
}

function adminStationDirSearch(v) { STATION_DIR_FILTER = v || ''; adminKeepFocus(renderStationsView); }
function adminStationDirFilterRegion(v) {
  STATION_DIR_REGION = v || '';
  renderStationsView();
}

// Cột "Thao tác" (Trạm Xe + Tuyến xe): nút "Cập nhật ▾" mở dropdown nổi (fixed, gắn <body> để không bị
// .sd-table-wrap / .table-wrap cắt) chứa Sửa / Xoá cho hàng. Bấm lại / ra ngoài / cuộn / resize → đóng.
function adminCloseRowMenu() {
  var m = document.getElementById('adminRowMenu');
  if (m) m.remove();
  document.removeEventListener('click', adminRowMenuOutside, true);
  window.removeEventListener('scroll', adminCloseRowMenu, true);
  window.removeEventListener('resize', adminCloseRowMenu, true);
}
function adminRowMenuOutside(e) {
  var m = document.getElementById('adminRowMenu');
  if (!m) return;
  if (m.contains(e.target) || (e.target.closest && e.target.closest('.row-menu-btn'))) return;
  adminCloseRowMenu();
}
// Dùng chung: itemsHtml = chuỗi các <button class="admin-row-menu-item [danger]" data-action=... data-args=...>
function adminOpenRowMenu(btn, key, itemsHtml) {
  var open = document.getElementById('adminRowMenu');
  if (open && open.dataset.for === key) { adminCloseRowMenu(); return; }
  adminCloseRowMenu();

  var m = document.createElement('div');
  m.id = 'adminRowMenu';
  m.className = 'admin-row-menu';
  m.dataset.for = key;
  m.innerHTML = itemsHtml;
  m.addEventListener('click', function (e) { if (e.target.closest('[data-action]')) adminCloseRowMenu(); });
  document.body.appendChild(m);

  var r = btn.getBoundingClientRect();
  var mw = m.offsetWidth, mh = m.offsetHeight;
  var left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
  var top = (r.bottom + 6 + mh > window.innerHeight - 8) ? (r.top - 6 - mh) : (r.bottom + 6);
  m.style.left = left + 'px';
  m.style.top = Math.max(8, top) + 'px';

  setTimeout(function () {
    document.addEventListener('click', adminRowMenuOutside, true);
    window.addEventListener('scroll', adminCloseRowMenu, true);
    window.addEventListener('resize', adminCloseRowMenu, true);
  }, 0);
}
// Trạm đang được tuyến dùng → không cho Xoá, chỉ Bật/Tắt (tuyến cũ vẫn giữ trạm tắt).
function adminStationRowMenu(btn, id) {
  var s = FleetStore.getStations().find(function (x) { return x.id === id; });
  if (!s) return;
  var used = FleetStore.stationUsage(s.name);
  adminOpenRowMenu(btn, 'station:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStationModal" data-args=\'["' + esc(id) + '"]\'>Sửa trạm</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminToggleStation" data-args=\'["' + esc(id) + '"]\'>' + (s.active !== false ? 'Tắt trạm' : 'Bật trạm') + '</button>' +
    (used ? '' : '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStationFull" data-args=\'["' + esc(id) + '"]\'>Xoá trạm</button>'));
}

function adminOpenStationModal(id, defaultRegion) {
  var s = id ? FleetStore.getStations().find(function (x) { return x.id === id; }) : null;
  var curRegion = s ? (s.region || '') : (defaultRegion || '');
  // Chỉ tỉnh đang bật; tỉnh hiện tại của trạm (nếu đã tắt) vẫn giữ trong danh sách.
  var regionMeta = getRegionMeta({ all: true }).filter(function (rm) { return rm[3] || rm[0] === curRegion; });
  openAdminModal(
    '<h3>' + (s ? 'Sửa trạm' : 'Thêm trạm mới') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStationFull" data-args=\'["__event__"' + (s ? ',"' + esc(s.id) + '"' : '') + ']\'>' +
      '<div class="fld"><label>Tên trạm <span class="req">*</span></label><input id="sdName" required value="' + (s ? esc(s.name) : '') + '" placeholder="VD: 508 Kinh Dương Vương"></div>' +
      '<div class="fld-row">' +
        (s ? '<div class="fld"><label>Mã trạm (tự sinh)</label><input value="' + esc(s.code || '') + '" disabled></div>' : '') +
        '<div class="fld"><label>Tỉnh <span class="req">*</span></label>' +
          '<select id="sdRegion" required>' +
            '<option value="" disabled' + (curRegion ? '' : ' selected') + '>— Chọn tỉnh —</option>' +
            regionMeta.map(function (rm) { return '<option value="' + esc(rm[0]) + '"' + (curRegion === rm[0] ? ' selected' : '') + '>' + esc(rm[1]) + '</option>'; }).join('') +
          '</select></div>' +
      '</div>' +
      '<div class="fld"><label>Địa chỉ</label><input id="sdAddress" value="' + (s ? esc(s.address || '') : '') + '" placeholder="Số nhà, đường, phường/xã..."></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Hotline hàng</label><input id="sdHotlineCargo" value="' + (s ? esc(s.hotlineCargo || '') : '') + '" placeholder="SĐT nhận gửi hàng"></div>' +
        '<div class="fld"><label>Hotline vé</label><input id="sdHotlineTicket" value="' + (s ? esc(s.hotlineTicket || '') : '') + '" placeholder="SĐT đặt vé"></div>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Huỷ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu</button>' +
      '</div>' +
    '</form>'
  );
}

function adminSaveStationFull(e, id) {
  e.preventDefault();
  var fields = {
    name: $('sdName').value.trim(),
    address: $('sdAddress').value.trim(),
    hotlineCargo: $('sdHotlineCargo').value.trim(),
    hotlineTicket: $('sdHotlineTicket').value.trim(),
    region: $('sdRegion').value
  };
  var res = id ? FleetStore.updateStation(id, fields) : FleetStore.addStationFull(fields);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: id ? 'update' : 'create', entity: 'station', entityId: fields.name, summary: (id ? 'Sửa' : 'Thêm') + ' trạm "' + fields.name + '"' });
  showToast(id ? 'Đã lưu trạm.' : 'Đã thêm trạm.');
  closeAdminModal();
  renderStationsView();
}

function adminToggleStation(id) {
  var s = FleetStore.getStations().find(function (x) { return x.id === id; });
  if (!s) return;
  var on = s.active === false;
  var res = FleetStore.setStationActive(id, on);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: 'toggle', entity: 'station', entityId: s.name, summary: (on ? 'Bật' : 'Tắt') + ' trạm "' + s.name + '"' });
  showToast(on ? 'Đã bật trạm.' : 'Đã tắt trạm.');
  renderStationsView();
}

function adminDeleteStationFull(id) {
  var s = FleetStore.getStations().find(function (x) { return x.id === id; });
  if (!s) return;
  if (FleetStore.stationUsage(s.name)) { showToast('Trạm đang được tuyến dùng — chỉ có thể tắt.'); return; }
  var nStops = FleetStore.getStopStations().filter(function (x) { return x.stationId === id; }).length;
  if (!confirm('Xoá trạm "' + s.name + '"?' + (nStops ? '\nSẽ xoá luôn ' + nStops + ' điểm dừng của trạm.' : ''))) return;
  FleetStore.removeStation(id);
  FleetStore.log({ action: 'delete', entity: 'station', entityId: s.name, summary: 'Xoá trạm "' + s.name + '"' + (nStops ? ' (kèm ' + nStops + ' điểm dừng)' : '') });
  showToast('Đã xoá trạm.');
  renderStationsView();
}

function renderSubStationsView() {
  renderStationsView();
}

function adminStopStationRowMenu(btn, id) {
  var stop = FleetStore.getStopStations().find(function (x) { return x.id === id; });
  adminOpenRowMenu(btn, 'stop-station:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStopStationModal" data-args=\'["' + esc(id) + '"]\'>Sửa điểm dừng</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminToggleStopStation" data-args=\'["' + esc(id) + '"]\'>' + (stop && stop.active === false ? 'Bật điểm dừng' : 'Tắt điểm dừng') + '</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStopStation" data-args=\'["' + esc(id) + '"]\'>Xoá điểm dừng</button>');
}

function adminOpenStopStationModal(id) {
  var stop = id ? FleetStore.getStopStations().find(function (x) { return x.id === id; }) : null;
  var curStationId = stop ? (stop.stationId || '') : '';
  // Chỉ trạm đang bật; trạm hiện tại của điểm dừng (nếu đã tắt) vẫn giữ. Điểm dừng mồ côi bắt chọn lại.
  var stations = FleetStore.getStations().filter(function (s) { return s.active !== false || s.id === curStationId; })
    .sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var stationOptions = (stop && !curStationId ? '<option value="" selected disabled>— Chọn lại trạm xe —</option>' : '') +
    stations.map(function (s) { return '<option value="' + esc(s.id) + '"' + (curStationId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('');
  if (!stations.length) stationOptions = '<option value="">Chưa có trạm xe</option>';
  openAdminModal(
    '<h3>' + (stop ? 'Sửa điểm dừng' : 'Thêm điểm dừng') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStopStation" data-args=\'["__event__"' + (stop ? ',"' + esc(stop.id) + '"' : '') + ']\'>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Trạm xe <span class="req">*</span></label><select id="stopStationStationId" required>' + stationOptions + '</select></div>' +
        '<div class="fld"><label>Tên điểm dừng <span class="req">*</span></label><input id="stopStationName" required value="' + (stop ? esc(stop.name) : '') + '" placeholder="Nhập tên điểm dừng"></div>' +
      '</div>' +
      (stop ? '<div class="fld"><label>Mã điểm dừng (tự sinh)</label><input value="' + esc(stop.code || '') + '" disabled></div>' : '') +
      '<div class="fld"><label>Địa chỉ</label><input id="stopStationAddress" value="' + (stop ? esc(stop.address || '') : '') + '" placeholder="Số nhà, đường, xã/phường..."></div>' +
      '<div class="fld"><label>Hotline</label><input id="stopStationHotline" value="' + (stop ? esc(stop.hotline || '') : '') + '" placeholder="SĐT liên hệ"></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function adminSaveStopStation(e, id) {
  e.preventDefault();
  var payload = {
    stationId: $('stopStationStationId').value,
    name: $('stopStationName').value.trim(),
    address: $('stopStationAddress').value.trim(),
    hotline: $('stopStationHotline').value.trim()
  };
  var res = id ? FleetStore.updateStopStation(id, payload) : FleetStore.addStopStation(payload);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: id ? 'update' : 'create', entity: 'stop_station', entityId: (res.item && res.item.id) || id || payload.name, summary: (id ? 'Sửa' : 'Thêm') + ' điểm dừng "' + payload.name + '"' });
  closeAdminModal();
  renderSubStationsView();
  showToast(id ? 'Đã lưu điểm dừng.' : 'Đã thêm điểm dừng.');
}

function adminToggleStopStation(id) {
  var stop = FleetStore.getStopStations().find(function (x) { return x.id === id; });
  if (!stop) return;
  var on = stop.active === false;
  var res = FleetStore.setStopActive(id, on);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: 'toggle', entity: 'stop_station', entityId: id, summary: (on ? 'Bật' : 'Tắt') + ' điểm dừng "' + stop.name + '"' });
  showToast(on ? 'Đã bật điểm dừng.' : 'Đã tắt điểm dừng.');
  renderSubStationsView();
}

function adminDeleteStopStation(id) {
  if (!confirm('Xoá điểm dừng này?')) return;
  FleetStore.removeStopStation(id);
  FleetStore.log({ action: 'delete', entity: 'stop_station', entityId: id, summary: 'Xoá điểm dừng' });
  showToast('Đã xoá điểm dừng.');
  renderSubStationsView();
}
