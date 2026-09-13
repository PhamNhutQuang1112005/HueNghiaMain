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
var STOP_STATION_SUB_FILTER = '';

function syncStationDirFilters() {
  var mainStations = FleetStore.getMainStations();
  var subStations = FleetStore.getSubStations();

  if (SUB_STATION_MAIN_FILTER) {
    var selectedMain = mainStations.find(function (m) { return m && m.id === SUB_STATION_MAIN_FILTER; });
    if (!selectedMain || (STATION_DIR_REGION && selectedMain.provinceKey !== STATION_DIR_REGION)) {
      SUB_STATION_MAIN_FILTER = '';
    }
  }

  if (STOP_STATION_SUB_FILTER) {
    var selectedSub = subStations.find(function (s) { return s && s.id === STOP_STATION_SUB_FILTER; });
    if (!selectedSub) {
      STOP_STATION_SUB_FILTER = '';
    } else {
      var selectedSubMain = mainStations.find(function (m) { return m && m.id === selectedSub.mainStationId; });
      if (!selectedSubMain || (STATION_DIR_REGION && selectedSubMain.provinceKey !== STATION_DIR_REGION) || (SUB_STATION_MAIN_FILTER && selectedSubMain.id !== SUB_STATION_MAIN_FILTER)) {
        STOP_STATION_SUB_FILTER = '';
      }
    }
  }
}

function adminSetStationSubTab(tab) {
  if (!['all', 'main', 'sub', 'stop'].includes(tab)) return;
  STATION_SUBTAB = tab;
  renderStationsView();
}

function renderStationsView() {
  var allStations = FleetStore.getStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var mainStations = FleetStore.getMainStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var subStations = FleetStore.getSubStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var regionMetaAll = getRegionMeta();
  var provinceLabelMap = {};
  regionMetaAll.forEach(function (rm) { provinceLabelMap[rm[0]] = rm[1].replace(/^Trạm\s+/i, ''); });
  if (STATION_DIR_REGION && !regionMetaAll.some(function (rm) { return rm[0] === STATION_DIR_REGION; })) STATION_DIR_REGION = '';

  syncStationDirFilters();

  var q = STATION_DIR_FILTER.trim().toLowerCase();
  var mainMap = {};
  mainStations.forEach(function (m) { mainMap[m.id] = m; });

  var visibleMainOptions = mainStations.filter(function (m) {
    return !STATION_DIR_REGION || m.provinceKey === STATION_DIR_REGION;
  });

  var visibleSubOptions = subStations.filter(function (s) {
    var main = mainMap[s.mainStationId] || null;
    return (!STATION_DIR_REGION || (main && main.provinceKey === STATION_DIR_REGION)) &&
      (!SUB_STATION_MAIN_FILTER || (main && main.id === SUB_STATION_MAIN_FILTER));
  });

  var filteredAll = allStations.filter(function (s) {
    if (STATION_DIR_REGION && s.region !== STATION_DIR_REGION) return false;
    if (!q) return true;
    var hay = [s.name, s.code, s.address, s.province].filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  var filteredMain = mainStations.filter(function (m) {
    if (STATION_DIR_REGION && m.provinceKey !== STATION_DIR_REGION) return false;
    if (SUB_STATION_MAIN_FILTER && m.id !== SUB_STATION_MAIN_FILTER) return false;
    if (!q) return true;
    var hay = [m.name, m.code, m.address, m.province, m.provinceKey].filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  var filteredSub = subStations.filter(function (s) {
    var main = mainMap[s.mainStationId] || null;
    if (STATION_DIR_REGION && (!main || main.provinceKey !== STATION_DIR_REGION)) return false;
    if (SUB_STATION_MAIN_FILTER && (!main || main.id !== SUB_STATION_MAIN_FILTER)) return false;
    if (!q) return true;
    var hay = [s.name, s.code, s.address, s.province, main && main.name, main && main.province].filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  var stopList = FleetStore.getStopStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var filteredStop = stopList.filter(function (stop) {
    var main = mainMap[stop.mainStationId] || null;
    var sub = (stop.subStationId && subStations.find(function (s) { return s.id === stop.subStationId; })) || null;
    if (STATION_DIR_REGION && (!main || main.provinceKey !== STATION_DIR_REGION)) return false;
    if (SUB_STATION_MAIN_FILTER && (!main || main.id !== SUB_STATION_MAIN_FILTER)) return false;
    if (STOP_STATION_SUB_FILTER && (!sub || sub.id !== STOP_STATION_SUB_FILTER)) return false;
    if (!q) return true;
    var hay = [stop.name, stop.code, stop.address, stop.hotline, main && main.name, main && main.province, sub && sub.name].filter(Boolean).join(' ').toLowerCase();
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

  var mainRows = filteredMain.length ? filteredMain.map(function (m, i) {
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(m.name) + '</b></td>' +
      '<td class="mono">' + esc(m.code || '—') + '</td>' +
      '<td>' + esc(m.address || '—') + '</td>' +
      '<td>' + esc((m.province || provinceLabelMap[m.provinceKey]) || '—') + '</td>' +
      '<td class="mono">' + esc(m.hotline || '—') + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminMainStationRowMenu" data-args=\'["__this__","' + esc(m.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">Không có trạm chính phù hợp.</td></tr>';

  var subRows = filteredSub.length ? filteredSub.map(function (s, i) {
    var main = mainMap[s.mainStationId] || { name: '—', province: '—' };
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(s.name) + '</b></td>' +
      '<td><b>' + esc(main.name || '—') + '</b></td>' +
      '<td class="mono">' + esc(s.code || '—') + '</td>' +
      '<td>' + esc(s.address || '—') + '</td>' +
      '<td>' + esc((s.province || provinceLabelMap[main.provinceKey]) || '—') + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminSubStationRowMenu" data-args=\'["__this__","' + esc(s.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">Không có trạm phụ phù hợp.</td></tr>';

  var currentTab = STATION_SUBTAB || 'all';
  var tabContent = '';

  if (currentTab === 'all') {
    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Tên trạm</th><th>Mã trạm</th><th>Địa chỉ</th><th>Khu vực</th><th>Hotline hàng</th><th>Hotline vé</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + allRows + '</tbody></table></div>' +
      '</div>';
  } else if (currentTab === 'main') {
    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Tên trạm</th><th>Mã trạm</th><th>Địa chỉ</th><th>Tỉnh/Thành</th><th>Hotline</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + mainRows + '</tbody></table></div>' +
      '</div>';
  } else if (currentTab === 'sub') {
    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Trạm phụ</th><th>Trạm chính</th><th>Mã</th><th>Địa chỉ</th><th>Tỉnh/Thành</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + subRows + '</tbody></table></div>' +
      '</div>';
  } else {
    var stopStations = filteredStop.slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
    var stopMainMap = {};
    mainStations.forEach(function (m) { stopMainMap[m.id] = m; });
    var stopSubMap = {};
    subStations.forEach(function (s) { stopSubMap[s.id] = s; });
    var stopRows = stopStations.length ? stopStations.map(function (stop, i) {
      var main = stopMainMap[stop.mainStationId] || null;
      var sub = stopSubMap[stop.subStationId] || null;
      return '<tr>' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td>' + esc((main && main.province) || '—') + '</td>' +
        '<td><b>' + esc((main && main.name) || '—') + '</b></td>' +
        '<td><b>' + esc((sub && sub.name) || '—') + '</b></td>' +
        '<td><b>' + esc(stop.name || '—') + '</b></td>' +
        '<td class="mono">' + esc(stop.code || '—') + '</td>' +
        '<td>' + esc(stop.address || '—') + '</td>' +
        '<td class="mono">' + esc(stop.hotline || '—') + '</td>' +
        '<td class="row-actions">' +
          '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStopStationRowMenu" data-args=\'["__this__","' + esc(stop.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
        '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="9" class="empty-state">Không có điểm dừng phù hợp.</td></tr>';

    tabContent =
      '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Tỉnh</th><th>Trạm chính</th><th>Trạm phụ</th><th>Điểm dừng</th><th>Mã</th><th>Địa chỉ</th><th>Hotline</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + stopRows + '</tbody></table></div>' +
      '</div>';
  }

  var addButton = '';
  if (currentTab === 'all') {
    addButton = '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStationModal" data-args=\'["","' + esc(STATION_DIR_REGION) + '"]\'>Thêm trạm</button>';
  } else if (currentTab === 'main') {
    addButton = '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenMainStationModal">Thêm trạm chính</button>';
  } else if (currentTab === 'sub') {
    addButton = '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenSubStationModal">Thêm trạm phụ</button>';
  } else {
    addButton = '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStopStationModal">Thêm điểm dừng</button>';
  }

  $('viewStations').innerHTML =
    '<div class="station-subtabs">' +
      '<button type="button" class="station-subtab' + (currentTab === 'all' ? ' active' : '') + '" data-action="adminSetStationSubTab" data-args=\'["all"]\'>Trạm xe</button>' +
      '<button type="button" class="station-subtab' + (currentTab === 'main' ? ' active' : '') + '" data-action="adminSetStationSubTab" data-args=\'["main"]\'>Trạm Chính</button>' +
      '<button type="button" class="station-subtab' + (currentTab === 'sub' ? ' active' : '') + '" data-action="adminSetStationSubTab" data-args=\'["sub"]\'>Trạm Phụ</button>' +
      '<button type="button" class="station-subtab' + (currentTab === 'stop' ? ' active' : '') + '" data-action="adminSetStationSubTab" data-args=\'["stop"]\'>Điểm dừng</button>' +
    '</div>' +
    '<div class="sd-toolbar" style="gap:8px;">' +
      '<div class="filter-field sd-field-search" style="flex:0 1 220px; min-width:170px; max-width:220px;">' +
        '<label>Tìm</label>' +
        '<input type="text" id="sdSearch" value="' + esc(STATION_DIR_FILTER) + '" placeholder="Tên, mã..." data-input-action="adminStationDirSearch" data-args=\'["__this_value__"]\'></div>' +
      '<div class="filter-field sd-field-region" style="flex:0 1 180px; min-width:150px;">' +
        '<label>Tỉnh</label>' +
        '<select id="sdRegionFilter" data-change-action="adminStationDirFilterRegion" data-args=\'["__this_value__"]\'>' +
          '<option value="">Tất cả</option>' +
          regionMetaAll.map(function (rm) { return '<option value="' + esc(rm[0]) + '"' + (rm[0] === STATION_DIR_REGION ? ' selected' : '') + '>' + esc(rm[1]) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="filter-field sd-field-region" style="flex:0 1 180px; min-width:150px;">' +
        '<label>Trạm Chính</label>' +
        '<select id="sdMainFilter" data-change-action="adminStationDirFilterMain" data-args=\'["__this_value__"]\'>' +
          '<option value="">Tất cả</option>' +
          visibleMainOptions.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === (SUB_STATION_MAIN_FILTER || '') ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="filter-field sd-field-region" style="flex:0 1 180px; min-width:150px;">' +
        '<label>Trạm Phụ</label>' +
        '<select id="sdSubFilter" data-change-action="adminStationDirFilterSub" data-args=\'["__this_value__"]\'>' +
          '<option value="">Tất cả</option>' +
          visibleSubOptions.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === (STOP_STATION_SUB_FILTER || '') ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
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
  if (SUB_STATION_MAIN_FILTER) {
    var main = FleetStore.getMainStations().find(function (m) { return m && m.id === SUB_STATION_MAIN_FILTER; });
    if (!main || (STATION_DIR_REGION && main.provinceKey !== STATION_DIR_REGION)) SUB_STATION_MAIN_FILTER = '';
  }
  if (STOP_STATION_SUB_FILTER) {
    var sub = FleetStore.getSubStations().find(function (s) { return s && s.id === STOP_STATION_SUB_FILTER; });
    if (!sub) {
      STOP_STATION_SUB_FILTER = '';
    } else {
      var subMain = FleetStore.getMainStations().find(function (m) { return m && m.id === sub.mainStationId; });
      if (!subMain || (STATION_DIR_REGION && subMain.provinceKey !== STATION_DIR_REGION) || (SUB_STATION_MAIN_FILTER && subMain.id !== SUB_STATION_MAIN_FILTER)) STOP_STATION_SUB_FILTER = '';
    }
  }
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

var SUB_STATION_FILTER = '';
var SUB_STATION_PROVINCE = '';
var SUB_STATION_MAIN_FILTER = '';

function adminSubStationDirSearch(v) { SUB_STATION_FILTER = v || ''; adminKeepFocus(renderStationsView); }
function adminSubStationDirFilterProvince(v) { SUB_STATION_PROVINCE = v || ''; renderStationsView(); }
function adminSubStationDirFilterMain(v) {
  SUB_STATION_MAIN_FILTER = v || '';
  if (STOP_STATION_SUB_FILTER) {
    var sub = FleetStore.getSubStations().find(function (s) { return s.id === STOP_STATION_SUB_FILTER; });
    if (!sub || sub.mainStationId !== (v || '')) STOP_STATION_SUB_FILTER = '';
  }
  renderStationsView();
}
function adminStopStationDirFilterSub(v) {
  STOP_STATION_SUB_FILTER = v || '';
  renderStationsView();
}
function adminStationDirFilterMain(v) {
  SUB_STATION_MAIN_FILTER = v || '';
  if (STOP_STATION_SUB_FILTER) {
    var sub = FleetStore.getSubStations().find(function (s) { return s.id === STOP_STATION_SUB_FILTER; });
    if (!sub || sub.mainStationId !== (v || '')) STOP_STATION_SUB_FILTER = '';
  }
  renderStationsView();
}
function adminStationDirFilterSub(v) {
  STOP_STATION_SUB_FILTER = v || '';
  renderStationsView();
}

function renderSubStationsView() {
  renderStationsView();
}

function getStationSuggestionList() {
  return FleetStore.getStations().slice().sort(function (a, b) {
    return (a && a.name || '').localeCompare(b && b.name || '', 'vi');
  });
}

function matchStationSuggestion(input) {
  var query = String(input || '').trim().toLowerCase();
  if (!query) return null;
  var list = getStationSuggestionList();
  return list.find(function (s) {
    return (s && s.name && s.name.toLowerCase() === query) ||
      (s && s.code && s.code.toLowerCase() === query);
  }) || null;
}

function adminFillMainStationSuggestion() {
  var input = $('mainStationName');
  var select = $('mainStationProvince');
  var code = $('mainStationCode');
  var address = $('mainStationAddress');
  var hotline = $('mainStationHotline');
  if (!input || !select || !code || !address || !hotline) return;

  var value = String(input.value || '').trim();
  if (!value) return;

  var match = matchStationSuggestion(value);
  if (!match) return;

  var regionMeta = getRegionMeta();
  var regionValue = match.region || '';
  var regionLabel = (regionMeta.find(function (rm) { return rm[0] === regionValue; }) || [])[1] || match.province || '';
  select.value = regionValue;
  code.value = match.code || '';
  address.value = match.address || '';
  hotline.value = match.hotlineCargo || match.hotlineTicket || '';
  input.value = match.name || input.value;
  if (regionLabel) {
    select.title = regionLabel;
  }
}

function adminMainStationRowMenu(btn, id) {
  adminOpenRowMenu(btn, 'main-station:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenMainStationModal" data-args=\'["' + esc(id) + '"]\'>Sửa trạm chính</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteMainStation" data-args=\'["' + esc(id) + '"]\'>Xoá trạm chính</button>');
}

function adminSubStationRowMenu(btn, id) {
  adminOpenRowMenu(btn, 'sub-station:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenSubStationModal" data-args=\'["' + esc(id) + '"]\'>Sửa trạm phụ</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteSubStation" data-args=\'["' + esc(id) + '"]\'>Xoá trạm phụ</button>');
}

function adminOpenMainStationModal(id) {
  var m = id ? FleetStore.getMainStations().find(function (x) { return x.id === id; }) : null;
  var provinceMeta = getRegionMeta();
  var curProvince = m ? (m.provinceKey || '') : '';
  var stationSuggests = getStationSuggestionList();
  var suggestHtml = stationSuggests.map(function (s) {
    return '<option value="' + esc(s.name || '') + '"></option>';
  }).join('');
  openAdminModal(
    '<h3>' + (m ? 'Sửa trạm chính' : 'Thêm trạm chính') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveMainStation" data-args=\'["__event__"' + (m ? ',"' + esc(m.id) + '"' : '') + ']\'>' +
      '<div class="fld"><label>Tên trạm chính <span class="req">*</span></label><input id="mainStationName" list="mainStationNameSuggestions" required value="' + (m ? esc(m.name) : '') + '" placeholder="Nhập vài ký tự rồi chọn gợi ý" onchange="adminFillMainStationSuggestion()"></div>' +
      '<datalist id="mainStationNameSuggestions">' + suggestHtml + '</datalist>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Tỉnh / Thành <span class="req">*</span></label>' +
          '<select id="mainStationProvince" required>' +
            '<option value="" disabled' + (curProvince ? '' : ' selected') + '>— Chọn tỉnh/thành —</option>' +
            provinceMeta.map(function (rm) { return '<option value="' + esc(rm[0]) + '"' + (curProvince === rm[0] ? ' selected' : '') + '>' + esc(rm[1]) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="fld"><label>Mã trạm</label><input id="mainStationCode" value="' + (m ? esc(m.code || '') : '') + '" placeholder="VD: BD01"></div>' +
      '</div>' +
      '<div class="fld"><label>Địa chỉ</label><input id="mainStationAddress" value="' + (m ? esc(m.address || '') : '') + '" placeholder="Số nhà, đường, phường/xã..."></div>' +
      '<div class="fld"><label>Hotline</label><input id="mainStationHotline" value="' + (m ? esc(m.hotline || '') : '') + '" placeholder="SĐT liên hệ"></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function adminSaveMainStation(e, id) {
  e.preventDefault();
  var inputName = $('mainStationName').value.trim();
  var matchedStation = inputName ? matchStationSuggestion(inputName) : null;
  if (!inputName) { showToast('Nhập tên trạm chính.'); return; }
  if (!matchedStation) { showToast('Chọn một trạm có sẵn trong danh sách Trạm xe hoặc nhập đúng tên trạm đã có để tự điền.'); return; }
  var payload = {
    name: matchedStation.name || inputName,
    provinceKey: matchedStation.region || $('mainStationProvince').value,
    code: matchedStation.code || $('mainStationCode').value.trim(),
    address: matchedStation.address || $('mainStationAddress').value.trim(),
    hotline: matchedStation.hotlineCargo || matchedStation.hotlineTicket || $('mainStationHotline').value.trim()
  };
  if (!payload.provinceKey) { showToast('Chọn tỉnh/thành cho trạm chính.'); return; }
  var res = id ? FleetStore.updateMainStation(id, payload) : FleetStore.addMainStation(payload);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: id ? 'update' : 'create', entity: 'main_station', entityId: (res.item && res.item.id) || id || payload.name, summary: (id ? 'Sửa' : 'Thêm') + ' trạm chính "' + payload.name + '"' });
  closeAdminModal();
  renderSubStationsView();
  showToast(id ? 'Đã lưu trạm chính.' : 'Đã thêm trạm chính.');
}

function adminDeleteMainStation(id) {
  if (!confirm('Xoá trạm chính này?')) return;
  var res = FleetStore.removeMainStation(id);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: 'delete', entity: 'main_station', entityId: id, summary: 'Xoá trạm chính' });
  showToast('Đã xoá trạm chính.');
  renderSubStationsView();
}

function adminOpenSubStationModal(id) {
  var s = id ? FleetStore.getSubStations().find(function (x) { return x.id === id; }) : null;
  var mainStations = FleetStore.getMainStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var provinceMeta = getRegionMeta();
  var mainMap = {};
  provinceMeta.forEach(function (rm) { mainMap[rm[0]] = rm[1].replace(/^Trạm\s+/i, ''); });
  var curMainId = s ? s.mainStationId : (mainStations[0] ? mainStations[0].id : '');
  var curProvince = s ? (s.provinceKey || '') : (mainStations[0] ? (mainStations[0].provinceKey || '') : '');
  var mainOptions = mainStations.map(function (m) {
    return '<option value="' + esc(m.id) + '"' + (curMainId === m.id ? ' selected' : '') + '>' + esc(m.name + ' — ' + (mainMap[m.provinceKey] || m.province || '')) + '</option>';
  }).join('') || '<option value="">Chưa có trạm chính nào trong Trạm xe.</option>';
  var subSuggestions = getSubStationSuggestionList({ provinceKey: curProvince || '', mainStationId: curMainId || '' });
  openAdminModal(
    '<h3>' + (s ? 'Sửa trạm phụ' : 'Thêm trạm phụ') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveSubStation" data-args=\'["__event__"' + (s ? ',"' + esc(s.id) + '"' : '') + ']\'>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Tỉnh / Thành</label>' +
          '<select id="subStationProvince" data-change-action="adminSubStationProvinceSelect" data-args=\'["__this_value__"]\'>' +
            '<option value="">— Chọn tỉnh/thành —</option>' +
            provinceMeta.map(function (rm) { return '<option value="' + esc(rm[0]) + '"' + (curProvince === rm[0] ? ' selected' : '') + '>' + esc(rm[1]) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="fld"><label>Trạm chính <span class="req">*</span></label><select id="subStationMainId" required>' + mainOptions + '</select></div>' +
      '</div>' +
      '<div class="fld"><label>Tên trạm phụ <span class="req">*</span></label><input id="subStationName" list="subStationNameSuggestions" required value="' + (s ? esc(s.name) : '') + '" placeholder="Nhập vài ký tự rồi chọn gợi ý" onchange="adminFillSubStationSuggestion()"></div>' +
      '<datalist id="subStationNameSuggestions">' + subSuggestions.map(function (item) { return '<option value="' + esc(item.name || '') + '"></option>'; }).join('') + '</datalist>' +
      '<div class="fld"><label>Mã trạm phụ</label><input id="subStationCode" value="' + (s ? esc(s.code || '') : '') + '" placeholder="VD: BD01-P1"></div>' +
      '<div class="fld"><label>Địa chỉ</label><input id="subStationAddress" value="' + (s ? esc(s.address || '') : '') + '" placeholder="Số nhà, đường, phường/xã..."></div>' +
      '<div class="fld"><label>Hotline</label><input id="subStationHotline" value="' + (s ? esc(s.hotline || '') : '') + '" placeholder="SĐT liên hệ"></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function getSubStationSuggestionList(options) {
  var provinceKey = options && options.provinceKey ? String(options.provinceKey) : '';
  var mainStationId = options && options.mainStationId ? String(options.mainStationId) : '';
  var main = mainStationId ? FleetStore.getMainStations().find(function (m) { return String(m.id) === mainStationId; }) : null;
  return FleetStore.getStations().filter(function (s) {
    if (provinceKey && String(s.region || '') !== provinceKey) return false;
    if (main && main.provinceKey && String(s.region || '') !== String(main.provinceKey)) return false;
    return true;
  }).slice().sort(function (a, b) {
    return (a && a.name || '').localeCompare(b && b.name || '', 'vi');
  });
}

function matchSubStationSuggestion(input, provinceKey, mainStationId) {
  var query = String(input || '').trim().toLowerCase();
  if (!query) return null;
  var list = getSubStationSuggestionList({ provinceKey: provinceKey || '', mainStationId: mainStationId || '' });
  return list.find(function (s) {
    return (s && s.name && s.name.toLowerCase() === query) ||
      (s && s.code && s.code.toLowerCase() === query);
  }) || null;
}

function adminFillSubStationSuggestion() {
  var input = $('subStationName');
  var province = $('subStationProvince');
  var mainId = $('subStationMainId');
  var code = $('subStationCode');
  var address = $('subStationAddress');
  var hotline = $('subStationHotline');
  if (!input || !province || !mainId || !code || !address || !hotline) return;

  var value = String(input.value || '').trim();
  if (!value) return;

  var match = matchSubStationSuggestion(value, province.value, mainId.value);
  if (!match) return;

  var stationMain = FleetStore.getMainStations().find(function (m) {
    return m && (
      (m.name && m.name.toLowerCase() === String(match.name || '').toLowerCase()) ||
      (m.code && m.code.toLowerCase() === String(match.code || '').toLowerCase())
    );
  }) || null;

  province.value = match.region || province.value;
  if (stationMain) mainId.value = stationMain.id;
  code.value = match.code || '';
  address.value = match.address || '';
  hotline.value = match.hotlineCargo || match.hotlineTicket || '';
  input.value = match.name || input.value;
}

function adminStopStationRowMenu(btn, id) {
  adminOpenRowMenu(btn, 'stop-station:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStopStationModal" data-args=\'["' + esc(id) + '"]\'>Sửa điểm dừng</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStopStation" data-args=\'["' + esc(id) + '"]\'>Xoá điểm dừng</button>');
}

function getStopStationSuggestionList(options) {
  var provinceKey = options && options.provinceKey ? String(options.provinceKey) : '';
  var mainStationId = options && options.mainStationId ? String(options.mainStationId) : '';
  var subStationId = options && options.subStationId ? String(options.subStationId) : '';
  return FleetStore.getStations().filter(function (s) {
    if (provinceKey && String(s.region || '') !== provinceKey) return false;
    if (mainStationId) {
      var main = FleetStore.getMainStations().find(function (m) { return String(m.id) === mainStationId; });
      if (main && String(s.region || '') !== String(main.provinceKey || '')) return false;
    }
    if (subStationId) {
      var sub = FleetStore.getSubStations().find(function (item) { return String(item.id) === subStationId; });
      if (sub && String(sub.mainStationId || '') !== String(mainStationId || '')) return false;
    }
    return true;
  }).slice().sort(function (a, b) {
    return (a && a.name || '').localeCompare(b && b.name || '', 'vi');
  });
}

function matchStopStationSuggestion(input, provinceKey, mainStationId, subStationId) {
  var query = String(input || '').trim().toLowerCase();
  if (!query) return null;
  var list = getStopStationSuggestionList({ provinceKey: provinceKey || '', mainStationId: mainStationId || '', subStationId: subStationId || '' });
  return list.find(function (s) {
    return (s && s.name && s.name.toLowerCase() === query) ||
      (s && s.code && s.code.toLowerCase() === query);
  }) || null;
}

function adminFillStopStationSuggestion() {
  var input = $('stopStationName');
  var province = $('stopStationProvince');
  var main = $('stopStationMainId');
  var sub = $('stopStationSubId');
  var code = $('stopStationCode');
  var address = $('stopStationAddress');
  var hotline = $('stopStationHotline');
  if (!input || !province || !main || !sub || !code || !address || !hotline) return;

  var value = String(input.value || '').trim();
  if (!value) return;

  var match = matchStopStationSuggestion(value, province.value, main.value, sub.value);
  if (!match) return;

  var selectedMain = FleetStore.getMainStations().find(function (m) { return m && m.name && m.name.toLowerCase() === String(match.name || '').toLowerCase(); }) || null;
  var selectedSub = FleetStore.getSubStations().find(function (s) { return s && s.name && s.name.toLowerCase() === String(match.name || '').toLowerCase(); }) || null;

  province.value = match.region || province.value;
  if (selectedMain) main.value = selectedMain.id;
  if (selectedSub) sub.value = selectedSub.id;
  code.value = match.code || '';
  address.value = match.address || '';
  hotline.value = match.hotlineCargo || match.hotlineTicket || '';
  input.value = match.name || input.value;
}

function adminSubStationProvinceSelect(value) {
  var mainSelect = $('subStationMainId');
  if (!mainSelect) return;
  var mains = FleetStore.getMainStations().filter(function (m) { return !value || m.provinceKey === value; }).sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  mainSelect.innerHTML = mains.length ? mains.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>'; }).join('') : '<option value="">Chưa có trạm chính trong tỉnh này</option>';
  var nameSuggest = $('subStationNameSuggestions');
  if (nameSuggest) {
    var suggestions = getSubStationSuggestionList({ provinceKey: value || '', mainStationId: mainSelect.value || '' });
    nameSuggest.innerHTML = suggestions.map(function (s) { return '<option value="' + esc(s.name || '') + '"></option>'; }).join('');
  }
}

function adminStopStationProvinceSelect(value) {
  var mainSelect = $('stopStationMainId');
  if (!mainSelect) return;
  var mains = FleetStore.getMainStations().filter(function (m) { return !value || m.provinceKey === value; }).sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  mainSelect.innerHTML = mains.length ? mains.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>'; }).join('') : '<option value="">Chưa có trạm chính trong tỉnh này</option>';
  var subSelect = $('stopStationSubId');
  if (subSelect) {
    var selectedMainId = mainSelect.value || (mains[0] ? mains[0].id : '');
    var subs = FleetStore.getSubStations().filter(function (s) { return (!value || (FleetStore.getMainStations().find(function (m) { return m && m.id === s.mainStationId; }) || {}).provinceKey === value) && (!selectedMainId || s.mainStationId === selectedMainId); }).sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
    subSelect.innerHTML = subs.length ? subs.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('') : '<option value="">Chưa có trạm phụ trong trạm chính này</option>';
  }
}

function adminOpenStopStationModal(id) {
  var stop = id ? FleetStore.getStopStations().find(function (x) { return x.id === id; }) : null;
  var regionMeta = getRegionMeta();
  var mainStations = FleetStore.getMainStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var subStations = FleetStore.getSubStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var curProvince = stop ? (stop.provinceKey || '') : '';
  var curMainId = stop ? (stop.mainStationId || '') : (mainStations[0] ? mainStations[0].id : '');
  var curSubId = stop ? (stop.subStationId || '') : (subStations[0] ? subStations[0].id : '');
  var mains = mainStations.filter(function (m) { return !curProvince || m.provinceKey === curProvince; });
  var subs = subStations.filter(function (s) { return (!curMainId || s.mainStationId === curMainId) && (!curProvince || (FleetStore.getMainStations().find(function (m) { return m && m.id === s.mainStationId; }) || {}).provinceKey === curProvince); });
  var mainOptions = mains.map(function (m) { return '<option value="' + esc(m.id) + '"' + (curMainId === m.id ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') || '<option value="">Chưa có trạm chính</option>';
  var subOptions = subs.map(function (s) { return '<option value="' + esc(s.id) + '"' + (curSubId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') || '<option value="">Chưa có trạm phụ</option>';
  var stopSuggestions = getStopStationSuggestionList({ provinceKey: curProvince || '', mainStationId: curMainId || '', subStationId: curSubId || '' });
  openAdminModal(
    '<h3>' + (stop ? 'Sửa điểm dừng' : 'Thêm điểm dừng') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStopStation" data-args=\'["__event__"' + (stop ? ',"' + esc(stop.id) + '"' : '') + ']\'>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Tỉnh / Thành</label>' +
          '<select id="stopStationProvince" data-change-action="adminStopStationProvinceSelect" data-args=\'["__this_value__"]\'>' +
            '<option value="">— Chọn tỉnh/thành —</option>' +
            regionMeta.map(function (rm) { return '<option value="' + esc(rm[0]) + '"' + (curProvince === rm[0] ? ' selected' : '') + '>' + esc(rm[1]) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="fld"><label>Trạm chính <span class="req">*</span></label><select id="stopStationMainId" data-change-action="adminStopStationMainSelect" data-args=\'["__this_value__"]\' required>' + mainOptions + '</select></div>' +
      '</div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Trạm phụ <span class="req">*</span></label><select id="stopStationSubId" required>' + subOptions + '</select></div>' +
        '<div class="fld"><label>Tên điểm dừng <span class="req">*</span></label><input id="stopStationName" required value="' + (stop ? esc(stop.name) : '') + '" placeholder="Nhập tên điểm dừng"></div>' +
      '</div>' +
      '<div class="fld"><label>Mã điểm dừng</label><input id="stopStationCode" value="' + (stop ? esc(stop.code || '') : '') + '" placeholder="VD: D009"></div>' +
      '<div class="fld"><label>Địa chỉ</label><input id="stopStationAddress" value="' + (stop ? esc(stop.address || '') : '') + '" placeholder="Số nhà, đường, xã/phường..."></div>' +
      '<div class="fld"><label>Hotline</label><input id="stopStationHotline" value="' + (stop ? esc(stop.hotline || '') : '') + '" placeholder="SĐT liên hệ"></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function adminStopStationMainSelect(value) {
  var mainSelect = $('stopStationMainId');
  var subSelect = $('stopStationSubId');
  if (!mainSelect || !subSelect) return;
  var province = $('stopStationProvince');
  var mains = FleetStore.getMainStations().filter(function (m) { return !province.value || m.provinceKey === province.value; }).sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  var selectedMainId = value || (mainSelect.value || (mains[0] ? mains[0].id : ''));
  var subs = FleetStore.getSubStations().filter(function (s) { return (!selectedMainId || s.mainStationId === selectedMainId); }).sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  subSelect.innerHTML = subs.length ? subs.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('') : '<option value="">Chưa có trạm phụ</option>';
}

function adminSaveStopStation(e, id) {
  e.preventDefault();
  var provinceKey = $('stopStationProvince').value;
  var mainStationId = $('stopStationMainId').value;
  var subStationId = $('stopStationSubId').value;
  var inputName = $('stopStationName').value.trim();
  var payload = {
    provinceKey: provinceKey,
    mainStationId: mainStationId,
    subStationId: subStationId,
    name: inputName,
    code: $('stopStationCode').value.trim(),
    address: $('stopStationAddress').value.trim(),
    hotline: $('stopStationHotline').value.trim()
  };
  if (!payload.provinceKey) { showToast('Chọn tỉnh/thành cho điểm dừng.'); return; }
  if (!payload.mainStationId) { showToast('Chọn trạm chính cho điểm dừng.'); return; }
  if (!payload.subStationId) { showToast('Chọn trạm phụ cho điểm dừng.'); return; }
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

function adminSaveSubStation(e, id) {
  e.preventDefault();
  var inputName = $('subStationName').value.trim();
  var matchedStation = inputName ? matchSubStationSuggestion(inputName, $('subStationProvince').value, $('subStationMainId').value) : null;
  var payload = {
    mainStationId: $('subStationMainId').value,
    name: inputName,
    code: $('subStationCode').value.trim(),
    address: $('subStationAddress').value.trim(),
    hotline: $('subStationHotline').value.trim()
  };
  if (!payload.mainStationId) { showToast('Chọn trạm chính cho trạm phụ.'); return; }
  if (!payload.name) { showToast('Nhập tên trạm phụ.'); return; }
  if (!matchedStation) {
    showToast('Chọn một trạm phụ có sẵn trong danh sách hoặc nhập đúng tên trạm phụ đã có để tự điền các cột.');
    return;
  }
  payload.name = matchedStation.name || payload.name;
  payload.code = matchedStation.code || payload.code;
  payload.address = matchedStation.address || payload.address;
  payload.hotline = matchedStation.hotline || payload.hotline;
  payload.mainStationId = matchedStation.mainStationId || payload.mainStationId;
  var mainExists = FleetStore.getMainStations().some(function (m) { return m && m.id === payload.mainStationId; });
  if (!mainExists) { showToast('Trạm chính phải tồn tại trong Trạm xe trước khi thêm trạm phụ.'); return; }
  var res = id ? FleetStore.updateSubStation(id, payload) : FleetStore.addSubStation(payload);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: id ? 'update' : 'create', entity: 'sub_station', entityId: (res.item && res.item.id) || id || payload.name, summary: (id ? 'Sửa' : 'Thêm') + ' trạm phụ "' + payload.name + '"' });
  closeAdminModal();
  renderSubStationsView();
  showToast(id ? 'Đã lưu trạm phụ.' : 'Đã thêm trạm phụ.');
}

function adminDeleteSubStation(id) {
  if (!confirm('Xoá trạm phụ này?')) return;
  FleetStore.removeSubStation(id);
  FleetStore.log({ action: 'delete', entity: 'sub_station', entityId: id, summary: 'Xoá trạm phụ' });
  showToast('Đã xoá trạm phụ.');
  renderSubStationsView();
}

