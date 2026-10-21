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
var SD_SEL = { station: {}, stop: {} }; // id đang tick chọn để xoá hàng loạt (theo tab)
var SD_VISIBLE = { station: [], stop: [] }; // id đang hiển thị (sau tìm kiếm / lọc tỉnh) — cho "chọn tất cả"

function adminSetStationSubTab(tab) {
  if (!['all', 'stop'].includes(tab)) return;
  if (!adminRequire(tab === 'all' ? 'manage_stations' : 'manage_stop_stations')) return;
  STATION_SUBTAB = tab;
  renderStationsView();
}

function renderStationsView() {
  var allStations = FleetStore.getStations(); // đã sắp theo thứ tự trên quãng đường
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
  var stopList = FleetStore.getStopStations();
  var filteredStop = stopList.filter(function (stop) {
    var station = stationById[stop.stationId] || null;
    if (STATION_DIR_REGION && (!station || station.region !== STATION_DIR_REGION)) return false;
    if (!q) return true;
    var hay = [stop.name, stop.code, stop.address, stop.hotline, station && station.name].filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  // Hiển thị theo tỉnh (đúng thứ tự trên quãng đường): tiêu đề tỉnh → các trạm trong tỉnh theo thứ tự ưu tiên.
  var regionNameOf = {};
  regionMetaAll.forEach(function (rm) { regionNameOf[rm[0]] = rm[1]; });
  function groupByRegion(items, regionKeyOf, rowFn, colspan, unit) {
    var out = '', last = null, n = 0, groups = [];
    items.forEach(function (it) {
      var k = regionKeyOf(it) || '';
      if (k !== last) { groups.push({ key: k, items: [] }); last = k; }
      groups[groups.length - 1].items.push(it);
    });
    groups.forEach(function (g) {
      var title = g.key ? esc(regionNameOf[g.key] || g.key) : '<span class="hint-inline">Chưa gán tỉnh / mồ côi</span>';
      out += '<tr class="sd-group-row"><td colspan="' + colspan + '"><b>' + title + '</b> <span class="hint-inline">' + g.items.length + ' ' + unit + '</span></td></tr>';
      g.items.forEach(function (it, i) { out += rowFn(it, i + 1); });
    });
    return out;
  }

  SD_VISIBLE.station = filteredAll.map(function (x) { return x.id; });
  SD_VISIBLE.stop = filteredStop.map(function (x) { return x.id; });
  ['station', 'stop'].forEach(function (k) {
    Object.keys(SD_SEL[k]).forEach(function (id) { if (SD_VISIBLE[k].indexOf(id) === -1) delete SD_SEL[k][id]; });
  });

  var allRows = filteredAll.length ? groupByRegion(filteredAll, function (s) { return s.region; }, function (s, no) {
    return '<tr>' +
      adminOrderTd('adminMoveStation', s.id, !q, no) +
      '<td><b>' + esc(s.name) + '</b></td>' +
      '<td class="mono">' + esc(s.code || '—') + '</td>' +
      '<td>' + esc(s.address || '—') + '</td>' +
      '<td class="mono">' + esc(s.hotlineCargo || '—') + '</td>' +
      '<td class="mono">' + esc(s.hotlineTicket || '—') + '</td>' +
      '<td class="col-status">' + activeTag(s.active !== false) + '</td>' +
      adminAuditTd(s.createdAt, s.createdBy) + adminAuditTd(s.updatedAt, s.updatedBy) +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStationRowMenu" data-args=\'["__this__","' + esc(s.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      sdCheckTd('station', s.id) +
    '</tr>';
  }, 11, 'trạm') : '<tr><td colspan="11" class="empty-state">Không tìm thấy trạm phù hợp.</td></tr>';

  // Mỗi tab / nút chỉ hiện khi tài khoản có đúng quyền: trạm, điểm dừng, tỉnh (danh mục).
  var canSt = adminCan('manage_stations'), canStop = adminCan('manage_stop_stations'), canReg = adminCan('manage_regions');
  var currentTab = STATION_SUBTAB || 'all';
  if (currentTab === 'all' && !canSt && canStop) currentTab = 'stop';
  if (currentTab === 'stop' && !canStop && canSt) currentTab = 'all';
  var tabContent = '';

  if (!canSt && !canStop) {
    tabContent = '<div class="empty-state">Bạn chỉ có quyền quản lý tỉnh — dùng nút “Cập nhật danh mục”.</div>';
  } else if (currentTab === 'all') {
    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="col-order">Thứ tự</th><th>Tên trạm</th><th>Mã trạm</th><th>Địa chỉ</th><th>Hotline hàng</th><th>Hotline vé</th><th class="col-status">Trạng thái</th><th>Tạo</th><th>Cập nhật</th><th class="th-actions">Thao tác</th>' + sdCheckAllTh('station') + '</tr></thead><tbody>' + allRows + '</tbody></table></div>' +
      '</div>';
  } else {
    var stopStations = filteredStop;
    var stopRows = stopStations.length ? groupByRegion(stopStations, function (stop) { var st = stationById[stop.stationId]; return st && st.region; }, function (stop, no) {
      var station = stationById[stop.stationId] || null;
      return '<tr>' +
        adminOrderTd('adminMoveStopStation', stop.id, !q, no) +
        '<td><b>' + (station ? esc(station.name) : '<span class="hint-inline">Mồ côi' + (stop.stationName ? ' (' + esc(stop.stationName) + ')' : '') + ' — chọn lại trạm</span>') + '</b></td>' +
        '<td><b>' + esc(stop.name || '—') + '</b></td>' +
        '<td class="mono">' + esc(stop.code || '—') + '</td>' +
        '<td>' + esc(stop.address || '—') + '</td>' +
        '<td class="mono">' + esc(stop.hotline || '—') + '</td>' +
        '<td class="col-status">' + activeTag(stop.active !== false) + '</td>' +
        adminAuditTd(stop.createdAt, stop.createdBy) + adminAuditTd(stop.updatedAt, stop.updatedBy) +
        '<td class="row-actions">' +
          '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStopStationRowMenu" data-args=\'["__this__","' + esc(stop.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
        '</td>' +
        sdCheckTd('stop', stop.id) +
      '</tr>';
    }, 11, 'điểm dừng') : '<tr><td colspan="11" class="empty-state">Không có điểm dừng phù hợp.</td></tr>';

    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="col-order">Thứ tự</th><th>Trạm xe</th><th>Điểm dừng</th><th>Mã</th><th>Địa chỉ</th><th>Hotline</th><th class="col-status">Trạng thái</th><th>Tạo</th><th>Cập nhật</th><th class="th-actions">Thao tác</th>' + sdCheckAllTh('stop') + '</tr></thead><tbody>' + stopRows + '</tbody></table></div>' +
      '</div>';
  }

  var addButton = '';
  if (!canSt && !canStop) {
    addButton = '';
  } else if (currentTab === 'all') {
    addButton = '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStationModal" data-args=\'["","' + esc(STATION_DIR_REGION) + '"]\'>Thêm trạm</button>';
  } else {
    addButton = '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStopStationModal">Thêm điểm dừng</button>';
  }

  $('viewStations').innerHTML =
    '<div class="station-subtabs">' +
      (canSt ? '<button type="button" class="station-subtab' + (currentTab === 'all' ? ' active' : '') + '" data-action="adminSetStationSubTab" data-args=\'["all"]\'>Trạm xe</button>' : '') +
      (canStop ? '<button type="button" class="station-subtab' + (currentTab === 'stop' ? ' active' : '') + '" data-action="adminSetStationSubTab" data-args=\'["stop"]\'>Điểm dừng</button>' : '') +
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
        (canReg ? '<button type="button" class="btn sd-btn" data-action="adminOpenRegionsModal">Cập nhật danh mục</button>' : '') +
      '</div>' +
    '</div>' +
    '<div class="sd-blocks">' + tabContent + '</div>' +
    '<div class="bulk-bar" id="sdActionBar" style="display:none;">' +
      '<span class="bulk-bar-hint" id="sdActionHint"></span>' +
      '<div class="bulk-bar-fields">' +
        '<button type="button" class="btn btn-secondary" data-action="adminSdClearSel">Hủy</button>' +
        '<button type="button" class="btn btn-danger" data-action="adminSdDeleteSelected">Xoá đã chọn</button>' +
      '</div>' +
    '</div>';
  sdSyncBar();
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
  if (!adminRequire('manage_stations')) return;
  var s = FleetStore.getStations().find(function (x) { return x.id === id; });
  if (!s) return;
  var used = FleetStore.stationUsage(s.name);
  adminOpenRowMenu(btn, 'station:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStationModal" data-args=\'["' + esc(id) + '"]\'>Sửa trạm</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminToggleStation" data-args=\'["' + esc(id) + '"]\'>' + (s.active !== false ? 'Tắt trạm' : 'Bật trạm') + '</button>' +
    (used ? '' : '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStationFull" data-args=\'["' + esc(id) + '"]\'>Xoá trạm</button>'));
}

function adminOpenStationModal(id, defaultRegion) {
  if (!adminRequire('manage_stations')) return;
  var s = id ? FleetStore.getStations().find(function (x) { return x.id === id; }) : null;
  var curRegion = s ? (s.region || '') : (defaultRegion || '');
  // Chỉ tỉnh đang bật; tỉnh hiện tại của trạm (nếu đã tắt) vẫn giữ trong danh sách.
  var regionMeta = getRegionMeta({ all: true }).filter(function (rm) { return rm[2] || rm[0] === curRegion; });
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
  if (!adminRequire('manage_stations')) return;
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
  if (!adminRequire('manage_stations')) return;
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
  if (!adminRequire('manage_stations')) return;
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
  if (!adminRequire('manage_stop_stations')) return;
  var stop = FleetStore.getStopStations().find(function (x) { return x.id === id; });
  adminOpenRowMenu(btn, 'stop-station:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStopStationModal" data-args=\'["' + esc(id) + '"]\'>Sửa điểm dừng</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminToggleStopStation" data-args=\'["' + esc(id) + '"]\'>' + (stop && stop.active === false ? 'Bật điểm dừng' : 'Tắt điểm dừng') + '</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStopStation" data-args=\'["' + esc(id) + '"]\'>Xoá điểm dừng</button>');
}

function adminOpenStopStationModal(id) {
  if (!adminRequire('manage_stop_stations')) return;
  var stop = id ? FleetStore.getStopStations().find(function (x) { return x.id === id; }) : null;
  var curStationId = stop ? (stop.stationId || '') : '';
  // Chỉ trạm đang bật; trạm hiện tại của điểm dừng (nếu đã tắt) vẫn giữ. Điểm dừng mồ côi bắt chọn lại.
  var stations = FleetStore.getStations().filter(function (s) { return s.active !== false || s.id === curStationId; });
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
  if (!adminRequire('manage_stop_stations')) return;
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
  if (!adminRequire('manage_stop_stations')) return;
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
  if (!adminRequire('manage_stop_stations')) return;
  if (!confirm('Xoá điểm dừng này?')) return;
  FleetStore.removeStopStation(id);
  FleetStore.log({ action: 'delete', entity: 'stop_station', entityId: id, summary: 'Xoá điểm dừng' });
  showToast('Đã xoá điểm dừng.');
  renderSubStationsView();
}

/* ---- Cột Thứ tự (sort_order theo quãng đường A → B) + cột audit dùng chung cho Trạm / Điểm dừng ---- */
function adminOrderTd(action, id, enabled, no) {
  var dis = enabled ? '' : ' disabled';
  var args = function (d) { return ' data-action="' + action + '" data-args=\'["' + esc(id) + '",' + d + ']\''; };
  return '<td class="col-order"><span class="ord-no">' + no + '</span>' +
    '<span class="mv"' + (enabled ? '' : ' title="Bỏ ô tìm kiếm để sắp xếp"') + '>' +
      '<button type="button"' + dis + args(-1) + ' aria-label="Lên">▲</button>' +
      '<button type="button"' + dis + args(1) + ' aria-label="Xuống">▼</button>' +
    '</span></td>';
}
function adminAuditTd(at, by) {
  return '<td class="audit-cell">' + (at ? esc(fmtStamp(at)) + '<br><span class="hint-inline">' + esc(by || '—') + '</span>' : '<span class="hint-inline">—</span>') + '</td>';
}
function adminMoveStation(id, delta) {
  if (!adminRequire('manage_stations')) return;
  FleetStore.moveStation(id, delta);
  renderStationsView();
}
function adminMoveStopStation(id, delta) {
  if (!adminRequire('manage_stop_stations')) return;
  FleetStore.moveStopStation(id, delta);
  renderStationsView();
}

/* ---- Chọn nhiều dòng (ô tick cuối bảng) để xoá hàng loạt — Trạm xe / Điểm dừng ---- */
function sdCurKind() { return STATION_SUBTAB === 'stop' ? 'stop' : 'station'; }
function sdCheckTd(kind, id) {
  var on = !!SD_SEL[kind][id];
  return '<td class="col-check"><input type="checkbox"' + (on ? ' checked' : '') + ' data-change-action="adminSdToggleRow" data-args=\'["' + kind + '","' + esc(id) + '","__this__"]\'></td>';
}
function sdCheckAllTh(kind) {
  var ids = SD_VISIBLE[kind];
  var all = ids.length && ids.every(function (id) { return SD_SEL[kind][id]; });
  return '<th class="col-check"><input type="checkbox"' + (all ? ' checked' : '') + ' data-action="adminSdToggleAll" data-args=\'["' + kind + '","__this__"]\'></th>';
}
function sdSyncBar() {
  var bar = $('sdActionBar');
  if (!bar) return;
  var kind = sdCurKind();
  var n = Object.keys(SD_SEL[kind]).length;
  bar.style.display = n ? 'flex' : 'none';
  var hint = $('sdActionHint');
  if (hint) hint.textContent = 'Đã chọn ' + n + (kind === 'stop' ? ' điểm dừng' : ' trạm');
}
function adminSdToggleRow(kind, id, cb) {
  if (cb.checked) SD_SEL[kind][id] = true; else delete SD_SEL[kind][id];
  var tr = cb.closest && cb.closest('tr');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  var head = document.querySelector('#viewStations thead .col-check input');
  if (head) head.checked = SD_VISIBLE[kind].length > 0 && SD_VISIBLE[kind].every(function (x) { return SD_SEL[kind][x]; });
  sdSyncBar();
}
function adminSdToggleAll(kind, cb) {
  SD_VISIBLE[kind].forEach(function (id) { if (cb.checked) SD_SEL[kind][id] = true; else delete SD_SEL[kind][id]; });
  renderStationsView();
}
function adminSdClearSel() {
  SD_SEL[sdCurKind()] = {};
  renderStationsView();
}
function adminSdDeleteSelected() {
  var kind = sdCurKind();
  if (!adminRequire(kind === 'stop' ? 'manage_stop_stations' : 'manage_stations')) return;
  var ids = Object.keys(SD_SEL[kind]);
  if (!ids.length) return;
  if (kind === 'stop') {
    if (!confirm('Xoá ' + ids.length + ' điểm dừng đã chọn?')) return;
    ids.forEach(function (id) {
      FleetStore.removeStopStation(id);
      FleetStore.log({ action: 'delete', entity: 'stop_station', entityId: id, summary: 'Xoá điểm dừng' });
    });
    SD_SEL.stop = {};
    showToast('Đã xoá ' + ids.length + ' điểm dừng.');
  } else {
    var stations = FleetStore.getStations();
    var del = [], blocked = [], nStops = 0;
    var stops = FleetStore.getStopStations();
    ids.forEach(function (id) {
      var s = stations.find(function (x) { return x.id === id; });
      if (!s) return;
      if (FleetStore.stationUsage(s.name)) blocked.push(s.name); else { del.push(s); nStops += stops.filter(function (x) { return x.stationId === id; }).length; }
    });
    if (!del.length) { showToast('Không thể xoá: tất cả trạm đã chọn đang được tuyến dùng (chỉ có thể tắt).'); return; }
    var msg = 'Xoá ' + del.length + ' trạm đã chọn?' + (nStops ? '\nSẽ xoá luôn ' + nStops + ' điểm dừng của các trạm này.' : '') +
      (blocked.length ? '\nBỏ qua ' + blocked.length + ' trạm đang được tuyến dùng: ' + blocked.join(', ') : '');
    if (!confirm(msg)) return;
    del.forEach(function (s) {
      FleetStore.removeStation(s.id);
      FleetStore.log({ action: 'delete', entity: 'station', entityId: s.name, summary: 'Xoá trạm "' + s.name + '"' });
      delete SD_SEL.station[s.id];
    });
    showToast('Đã xoá ' + del.length + ' trạm.' + (blocked.length ? ' Bỏ qua ' + blocked.length + ' trạm đang dùng.' : ''));
  }
  renderStationsView();
}
