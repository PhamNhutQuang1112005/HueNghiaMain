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
  var regionMetaAll = getRegionMeta();
  var provinceLabelMap = {};
  regionMetaAll.forEach(function (rm) { provinceLabelMap[rm[0]] = rm[1].replace(/^Trạm\s+/i, ''); });
  if (STATION_DIR_REGION && !regionMetaAll.some(function (rm) { return rm[0] === STATION_DIR_REGION; })) STATION_DIR_REGION = '';

  var q = STATION_DIR_FILTER.trim().toLowerCase();
  var stationMap = {};
  allStations.forEach(function (s) { stationMap[s.name] = s; });

  var filteredAll = allStations.filter(function (s) {
    if (STATION_DIR_REGION && s.region !== STATION_DIR_REGION) return false;
    if (!q) return true;
    var hay = [s.name, s.code, s.address, s.province].filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  var stopList = FleetStore.getStopStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var filteredStop = stopList.filter(function (stop) {
    var station = stationMap[stop.stationName] || null;
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
      '<td>' + (regionLabel ? esc(regionLabel) : '<span class="hint-inline">Chưa gán</span>') + '</td>' +
      '<td class="mono">' + esc(s.hotlineCargo || '—') + '</td>' +
      '<td class="mono">' + esc(s.hotlineTicket || '—') + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStationRowMenu" data-args=\'["__this__","' + esc(s.name) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="8" class="empty-state">Không tìm thấy trạm phù hợp.</td></tr>';

  var currentTab = STATION_SUBTAB || 'all';
  var tabContent = '';

  if (currentTab === 'all') {
    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Tên trạm</th><th>Mã trạm</th><th>Địa chỉ</th><th>Khu vực</th><th>Hotline hàng</th><th>Hotline vé</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + allRows + '</tbody></table></div>' +
      '</div>';
  } else {
    var stopStations = filteredStop.slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
    var stopRows = stopStations.length ? stopStations.map(function (stop, i) {
      var station = stationMap[stop.stationName] || null;
      return '<tr>' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td><b>' + esc((station && station.name) || stop.stationName || '—') + '</b></td>' +
        '<td><b>' + esc(stop.name || '—') + '</b></td>' +
        '<td class="mono">' + esc(stop.code || '—') + '</td>' +
        '<td>' + esc(stop.address || '—') + '</td>' +
        '<td class="mono">' + esc(stop.hotline || '—') + '</td>' +
        '<td class="row-actions">' +
          '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStopStationRowMenu" data-args=\'["__this__","' + esc(stop.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="7" class="empty-state">Không có điểm dừng phù hợp.</td></tr>';

    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Trạm xe</th><th>Điểm dừng</th><th>Mã</th><th>Địa chỉ</th><th>Hotline</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + stopRows + '</tbody></table></div>' +
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
function adminStationRowMenu(btn, name) {
  adminOpenRowMenu(btn, 'station:' + name,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStationModal" data-args=\'["' + esc(name) + '"]\'>Sửa trạm</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStationFull" data-args=\'["' + esc(name) + '"]\'>Xoá trạm</button>');
}

function adminOpenStationModal(name, defaultRegion) {
  var s = name ? FleetStore.getStations().find(function (x) { return x.name === name; }) : null;
  var regionMeta = getRegionMeta();
  var curRegion = s ? (s.region || '') : (defaultRegion || '');
  openAdminModal(
    '<h3>' + (s ? 'Sửa trạm' : 'Thêm trạm mới') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStationFull" data-args=\'["__event__"' + (s ? ',"' + esc(s.name) + '"' : '') + ']\'>' +
      '<div class="fld"><label>Tên trạm <span class="req">*</span></label><input id="sdName" required value="' + (s ? esc(s.name) : '') + '" placeholder="VD: 508 Kinh Dương Vương"></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Mã trạm</label><input id="sdCode" value="' + (s ? esc(s.code || '') : '') + '" placeholder="VD: SG01"></div>' +
        '<div class="fld"><label>Khu vực (Tỉnh / Thành) <span class="req">*</span></label>' +
          '<select id="sdRegion" required>' +
            '<option value="" disabled' + (curRegion ? '' : ' selected') + '>— Chọn khu vực —</option>' +
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

function adminSaveStationFull(e, oldName) {
  e.preventDefault();
  var region = $('sdRegion').value;
  var regionLabel = (getRegionMeta().find(function (rm) { return rm[0] === region; }) || [])[1] || '';
  var fields = {
    name: $('sdName').value.trim(),
    code: $('sdCode').value.trim(),
    address: $('sdAddress').value.trim(),
    // "Tỉnh / Thành" = khu vực; lưu kèm nhãn khu vực (bỏ tiền tố "Trạm ") để tìm kiếm theo tỉnh vẫn ra
    province: regionLabel.replace(/^Trạm\s+/i, ''),
    hotlineCargo: $('sdHotlineCargo').value.trim(),
    hotlineTicket: $('sdHotlineTicket').value.trim(),
    region: region
  };
  if (!fields.name) { showToast('Nhập tên trạm.'); return; }
  if (!fields.region) { showToast('Chọn khu vực (tỉnh / thành) cho trạm.'); return; }

  if (oldName) {
    var res = FleetStore.updateStation(oldName, fields);
    if (!res.ok) { showToast(res.reason); return; }
    FleetStore.log({ action: 'update', entity: 'station', entityId: fields.name, summary: 'Sửa trạm "' + fields.name + '"' });
    showToast('Đã lưu trạm.');
  } else {
    if (!FleetStore.addStationFull(fields)) { showToast('Trạm "' + fields.name + '" đã tồn tại.'); return; }
    FleetStore.log({ action: 'create', entity: 'station', entityId: fields.name, summary: 'Thêm trạm "' + fields.name + '"' });
    showToast('Đã thêm trạm.');
  }
  closeAdminModal();
  renderStationsView();
}

function adminDeleteStationFull(name) {
  var used = FleetStore.stationUsage(name);
  var msg = used ? 'Trạm "' + name + '" đang dùng ở ' + used + ' tuyến. Xoá trạm và gỡ khỏi các tuyến đó?' : 'Xoá trạm "' + name + '"?';
  if (!confirm(msg)) return;
  FleetStore.removeStation(name);
  FleetStore.log({ action: 'delete', entity: 'station', entityId: name, summary: 'Xoá trạm "' + name + '"' + (used ? ' (gỡ khỏi ' + used + ' tuyến)' : '') });
  showToast('Đã xoá trạm.');
  renderStationsView();
}

function renderSubStationsView() {
  renderStationsView();
}

function adminStopStationRowMenu(btn, id) {
  adminOpenRowMenu(btn, 'stop-station:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStopStationModal" data-args=\'["' + esc(id) + '"]\'>Sửa điểm dừng</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStopStation" data-args=\'["' + esc(id) + '"]\'>Xoá điểm dừng</button>');
}

function adminOpenStopStationModal(id) {
  var stop = id ? FleetStore.getStopStations().find(function (x) { return x.id === id; }) : null;
  var stations = FleetStore.getStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var curStationName = stop ? (stop.stationName || '') : (stations[0] ? stations[0].name : '');
  var stationOptions = stations.map(function (s) { return '<option value="' + esc(s.name) + '"' + (curStationName === s.name ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') || '<option value="">Chưa có trạm xe</option>';
  openAdminModal(
    '<h3>' + (stop ? 'Sửa điểm dừng' : 'Thêm điểm dừng') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStopStation" data-args=\'["__event__"' + (stop ? ',"' + esc(stop.id) + '"' : '') + ']\'>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Trạm xe <span class="req">*</span></label><select id="stopStationStationName" required>' + stationOptions + '</select></div>' +
        '<div class="fld"><label>Tên điểm dừng <span class="req">*</span></label><input id="stopStationName" required value="' + (stop ? esc(stop.name) : '') + '" placeholder="Nhập tên điểm dừng"></div>' +
      '</div>' +
      '<div class="fld"><label>Mã điểm dừng</label><input id="stopStationCode" value="' + (stop ? esc(stop.code || '') : '') + '" placeholder="VD: D009"></div>' +
      '<div class="fld"><label>Địa chỉ</label><input id="stopStationAddress" value="' + (stop ? esc(stop.address || '') : '') + '" placeholder="Số nhà, đường, xã/phường..."></div>' +
      '<div class="fld"><label>Hotline</label><input id="stopStationHotline" value="' + (stop ? esc(stop.hotline || '') : '') + '" placeholder="SĐT liên hệ"></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function adminSaveStopStation(e, id) {
  e.preventDefault();
  var payload = {
    stationName: $('stopStationStationName').value,
    name: $('stopStationName').value.trim(),
    code: $('stopStationCode').value.trim(),
    address: $('stopStationAddress').value.trim(),
    hotline: $('stopStationHotline').value.trim()
  };
  if (!payload.stationName) { showToast('Chọn trạm xe cho điểm dừng.'); return; }
  if (!payload.name) { showToast('Nhập tên điểm dừng.'); return; }
  var res = id ? FleetStore.updateStopStation(id, payload) : FleetStore.addStopStation(payload);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: id ? 'update' : 'create', entity: 'stop_station', entityId: (res.item && res.item.id) || id || payload.name, summary: (id ? 'Sửa' : 'Thêm') + ' điểm dừng "' + payload.name + '"' });
  closeAdminModal();
  renderSubStationsView();
  showToast(id ? 'Đã lưu điểm dừng.' : 'Đã thêm điểm dừng.');
}

function adminDeleteStopStation(id) {
  if (!confirm('Xoá điểm dừng này?')) return;
  FleetStore.removeStopStation(id);
  FleetStore.log({ action: 'delete', entity: 'stop_station', entityId: id, summary: 'Xoá điểm dừng' });
  showToast('Đã xoá điểm dừng.');
  renderSubStationsView();
}
