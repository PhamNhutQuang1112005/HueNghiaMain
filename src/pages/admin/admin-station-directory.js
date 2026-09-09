/* =========================================================
   TRẠM XE — Danh mục đầy đủ tất cả các trạm hiện có của nhà xe.
   Khác với panel "Danh mục trạm theo địa điểm" trong Tuyến xe (admin-stations.js, chỉ có tên + khu
   vực, dùng để chọn trạm đi/đến/đón cho tuyến) — màn này là nơi CRUD đầy đủ thông tin liên hệ của
   từng trạm: mã trạm, địa chỉ, tỉnh thành, hotline hàng/vé. Cùng 1 nguồn dữ liệu FleetStore station
   (HN_STATIONS_KEY) — sửa/xoá ở đây phản ánh ngay sang Tuyến xe và ngược lại.
   ========================================================= */
var STATION_DIR_FILTER = '';
var STATION_DIR_REGION = '';

function renderStationsView() {
  var stations = FleetStore.getStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });
  // Danh mục khu vực (Tỉnh/Thành) — LẤY CHUNG getRegionMeta() với panel "Danh mục trạm theo địa điểm"
  // ở Tuyến xe (admin-stations.js), để dropdown lọc ở đây và các thẻ địa điểm bên đó luôn khớp 1-1:
  // chọn "Trạm Sài Gòn" ở đây ra đúng những trạm nằm trong thẻ "Trạm Sài Gòn" bên Tuyến xe.
  var regionMetaAll = getRegionMeta();
  if (STATION_DIR_REGION && !regionMetaAll.some(function (rm) { return rm[0] === STATION_DIR_REGION; })) STATION_DIR_REGION = '';

  var q = STATION_DIR_FILTER.trim().toLowerCase();
  var list = stations.filter(function (s) {
    if (STATION_DIR_REGION && s.region !== STATION_DIR_REGION) return false;
    if (!q) return true;
    var hay = [s.name, s.code, s.address, s.province].filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });

  var regionLabelOf = {};
  regionMetaAll.forEach(function (rm) { regionLabelOf[rm[0]] = rm[1]; });

  var rows = list.length ? list.map(function (s, i) {
    var regionLabel = s.region ? (regionLabelOf[s.region] || s.region) : '';
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(s.name) + '</b></td>' +
      '<td class="mono">' + esc(s.code || '—') + '</td>' +
      '<td>' + esc(s.address || '—') + '</td>' +
      '<td>' + (regionLabel ? esc(regionLabel) : '<span class="hint-inline">Chưa gán</span>') + '</td>' +
      '<td class="mono">' + esc(s.hotlineCargo || '—') + '</td>' +
      '<td class="mono">' + esc(s.hotlineTicket || '—') + '</td>' +
      '<td class="row-actions">' +
        '<button class="btn btn-sm" data-action="adminOpenStationModal" data-args=\'["' + esc(s.name) + '"]\'>Sửa</button>' +
        '<button class="btn btn-sm btn-danger" data-action="adminDeleteStationFull" data-args=\'["' + esc(s.name) + '"]\'>Xoá</button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="8" class="empty-state">Không tìm thấy trạm phù hợp.</td></tr>';

  $('viewStations').innerHTML =
    '<div class="filter-toolbar">' +
      fld('Tìm trạm', '<input type="text" id="sdSearch" value="' + esc(STATION_DIR_FILTER) + '" placeholder="Tên trạm, mã trạm, địa chỉ, tỉnh thành..." data-input-action="adminStationDirSearch" data-args=\'["__this_value__"]\'>') +
      '<div class="filter-field"><label>Tỉnh/Thành</label>' +
        '<select id="sdRegionFilter" title="Danh mục dùng chung với Danh mục trạm theo địa điểm ở Tuyến xe" data-change-action="adminStationDirFilterRegion" data-args=\'["__this_value__"]\'>' +
          '<option value="">Tất cả tỉnh/thành</option>' +
          regionMetaAll.map(function (rm) { return '<option value="' + esc(rm[0]) + '"' + (rm[0] === STATION_DIR_REGION ? ' selected' : '') + '>' + esc(rm[1]) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="filter-spacer"></div>' +
      '<button class="btn btn-primary" data-action="adminOpenStationModal" data-args=\'[""]\'>+ Thêm trạm</button>' +
    '</div>' +
    '<div class="table-wrap"><table class="admin-table"><thead><tr>' +
      '<th class="num">STT</th><th>Tên trạm</th><th>Mã trạm</th><th>Địa chỉ</th><th>Khu vực</th>' +
      '<th>Hotline hàng</th><th>Hotline vé</th><th class="th-actions">Thao tác</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function adminStationDirSearch(v) { STATION_DIR_FILTER = v || ''; renderStationsView(); }
function adminStationDirFilterRegion(v) { STATION_DIR_REGION = v || ''; renderStationsView(); }

function adminOpenStationModal(name) {
  var s = name ? FleetStore.getStations().find(function (x) { return x.name === name; }) : null;
  var regionMeta = getRegionMeta();
  openAdminModal(
    '<h3>' + (s ? 'Sửa trạm' : 'Thêm trạm mới') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStationFull" data-args=\'["__event__"' + (s ? ',"' + esc(s.name) + '"' : '') + ']\'>' +
      '<div class="fld"><label>Tên trạm <span class="req">*</span></label><input id="sdName" required value="' + (s ? esc(s.name) : '') + '" placeholder="VD: 508 Kinh Dương Vương"></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Mã trạm</label><input id="sdCode" value="' + (s ? esc(s.code || '') : '') + '" placeholder="VD: SG01"></div>' +
        '<div class="fld"><label>Tỉnh thành</label><input id="sdProvince" value="' + (s ? esc(s.province || '') : '') + '" placeholder="VD: TP. Hồ Chí Minh"></div>' +
      '</div>' +
      '<div class="fld"><label>Địa chỉ</label><input id="sdAddress" value="' + (s ? esc(s.address || '') : '') + '" placeholder="Số nhà, đường, phường/xã..."></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Hotline hàng</label><input id="sdHotlineCargo" value="' + (s ? esc(s.hotlineCargo || '') : '') + '" placeholder="SĐT nhận gửi hàng"></div>' +
        '<div class="fld"><label>Hotline vé</label><input id="sdHotlineTicket" value="' + (s ? esc(s.hotlineTicket || '') : '') + '" placeholder="SĐT đặt vé"></div>' +
      '</div>' +
      '<div class="fld"><label>Khu vực <span class="hint-inline">(dùng để chọn trạm đi/đến ở Tuyến xe — không bắt buộc)</span></label>' +
        '<select id="sdRegion">' +
          '<option value="">— Không thuộc khu vực nào —</option>' +
          regionMeta.map(function (rm) { return '<option value="' + esc(rm[0]) + '"' + (s && s.region === rm[0] ? ' selected' : '') + '>' + esc(rm[1]) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Huỷ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu</button>' +
      '</div>' +
    '</form>'
  );
}

function adminSaveStationFull(e, oldName) {
  e.preventDefault();
  var fields = {
    name: $('sdName').value.trim(),
    code: $('sdCode').value.trim(),
    address: $('sdAddress').value.trim(),
    province: $('sdProvince').value.trim(),
    hotlineCargo: $('sdHotlineCargo').value.trim(),
    hotlineTicket: $('sdHotlineTicket').value.trim(),
    region: $('sdRegion').value
  };
  if (!fields.name) { showToast('Nhập tên trạm.'); return; }

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
