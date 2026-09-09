/* =========================================================
   QUẢN LÝ GHẾ XE (VEHICLE SEATS)
   Giao diện chuẩn Admin đồng bộ với hệ thống.
   ========================================================= */

var SEAT_FLOOR_OPTIONS = [
  { value: '1', label: 'Tầng 1 (Tầng dưới)' },
  { value: '2', label: 'Tầng 2 (Tầng trên)' }
];

function buildDefaultVehicleSeats() {
  var list = [];
  var id = 1;
  function add(name, floor, content) {
    list.push({ id: id++, name: name, floor: floor, content: content, active: true, deleted: false });
  }
  var i;
  for (i = 1; i <= 17; i++) add('A' + i, '1', 'Ghế giường tầng dưới — vị trí A' + i);
  for (i = 1; i <= 17; i++) add('B' + i, '2', 'Ghế giường tầng trên — vị trí B' + i);
  for (i = 1; i <= 18; i++) add('C' + i, '1', 'Ghế giường tầng dưới — vị trí C' + i);
  for (i = 1; i <= 18; i++) add('D' + i, '2', 'Ghế giường tầng trên — vị trí D' + i);
  for (i = 1; i <= 21; i++) add('L' + i, '1', 'Ghế limousine — vị trí L' + i);
  return list;
}

var VEHICLE_SEAT_FILTERS = { search: '', floor: '', active: '', deleted: '' };
var VEHICLE_SEAT_PAGE = { page: 1, pageSize: 15, sortAsc: true };

function getVehicleSeats() {
  return lsRead(HN_VEHICLE_SEATS_KEY, buildDefaultVehicleSeats());
}

function saveVehicleSeats(list) {
  lsWrite(HN_VEHICLE_SEATS_KEY, list);
}

function getSeatFloorLabel(floor) {
  var opt = SEAT_FLOOR_OPTIONS.find(function (x) { return x.value === String(floor); });
  return opt ? opt.label : '—';
}

function naturalSeatSort(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
}

function vsRadioGroup(name, checkedYes) {
  return '<div class="radio-inline">' +
    '<label><input type="radio" name="' + name + '" value="1"' + (checkedYes ? ' checked' : '') + '> Có</label>' +
    '<label><input type="radio" name="' + name + '" value="0"' + (!checkedYes ? ' checked' : '') + '> Không</label>' +
  '</div>';
}

function seatFloorSelectOptions(selected) {
  return SEAT_FLOOR_OPTIONS.map(function (o) {
    return '<option value="' + o.value + '"' + (String(selected || '1') === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
  }).join('');
}

function renderVehicleSeatPagination(total, page, pageSize) {
  var totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) page = totalPages;
  var start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  var end = Math.min(page * pageSize, total);

  var pageBtns = '';
  function pageBtn(p, label, active) {
    return '<button type="button" class="admin-page-btn' + (active ? ' active' : '') + '"' +
      (p === page ? '' : ' data-action="adminVehicleSeatPageChange" data-args=\'[' + p + ']\'') + '>' +
      esc(label || String(p)) + '</button>';
  }

  if (totalPages <= 7) {
    for (var i = 1; i <= totalPages; i++) pageBtns += pageBtn(i, String(i), i === page);
  } else {
    pageBtns += pageBtn(1, '1', page === 1);
    if (page > 3) pageBtns += '<span class="admin-page-ellipsis">…</span>';
    var from = Math.max(2, page - 1);
    var to = Math.min(totalPages - 1, page + 1);
    for (var j = from; j <= to; j++) pageBtns += pageBtn(j, String(j), j === page);
    if (page < totalPages - 2) pageBtns += '<span class="admin-page-ellipsis">…</span>';
    pageBtns += pageBtn(totalPages, String(totalPages), page === totalPages);
  }

  return '<div class="admin-table-footer">' +
    '<div class="admin-table-footer-left">' +
      '<select class="admin-page-size" data-change-action="adminVehicleSeatPageSizeChange" data-args=\'["__this_value__"]\'>' +
        [10, 15, 25, 50].map(function (n) {
          return '<option value="' + n + '"' + (pageSize === n ? ' selected' : '') + '>' + n + '</option>';
        }).join('') +
      '</select>' +
      '<span class="admin-page-info">Hiển thị ' + start + ' đến ' + end + ' của ' + total + ' mục</span>' +
    '</div>' +
    '<div class="admin-pagination">' +
      '<button type="button" class="admin-page-btn"' + (page <= 1 ? ' disabled' : ' data-action="adminVehicleSeatPageChange" data-args=\'[' + (page - 1) + ']\'') + '>Trước</button>' +
      pageBtns +
      '<button type="button" class="admin-page-btn"' + (page >= totalPages ? ' disabled' : ' data-action="adminVehicleSeatPageChange" data-args=\'[' + (page + 1) + ']\'') + '>Tiếp</button>' +
    '</div>' +
  '</div>';
}

function renderVehicleSeatsView() {
  var list = getVehicleSeats();
  var f = VEHICLE_SEAT_FILTERS;
  var pg = VEHICLE_SEAT_PAGE;

  var totalCount = list.length;
  var floor1Count = list.filter(function (x) { return x.floor === '1'; }).length;
  var floor2Count = list.filter(function (x) { return x.floor === '2'; }).length;
  var activeCount = list.filter(function (x) { return x.active && !x.deleted; }).length;

  var filtered = list.filter(function (x) {
    if (!x) return false;
    if (f.search) {
      var kw = f.search.toLowerCase();
      var matchName = (x.name || '').toLowerCase().indexOf(kw) !== -1;
      var matchContent = (x.content || '').toLowerCase().indexOf(kw) !== -1;
      var matchFloor = getSeatFloorLabel(x.floor).toLowerCase().indexOf(kw) !== -1;
      if (!matchName && !matchContent && !matchFloor) return false;
    }
    if (f.floor && String(x.floor) !== f.floor) return false;
    if (f.active === 'true' && !x.active) return false;
    if (f.active === 'false' && x.active) return false;
    if (f.deleted === 'true' && !x.deleted) return false;
    if (f.deleted === 'false' && x.deleted) return false;
    return true;
  });

  filtered.sort(function (a, b) {
    var cmp = naturalSeatSort(a, b);
    return pg.sortAsc ? cmp : -cmp;
  });

  var totalFiltered = filtered.length;
  var totalPages = Math.max(1, Math.ceil(totalFiltered / pg.pageSize));
  if (pg.page > totalPages) pg.page = totalPages;
  var sliceStart = (pg.page - 1) * pg.pageSize;
  var pageItems = filtered.slice(sliceStart, sliceStart + pg.pageSize);

  function getActiveBadge(active) {
    if (active) {
      return '<span class="status-badge dang-ban"><span class="status-dot"></span>Được Kích Hoạt</span>';
    }
    return '<span class="status-badge da-huy"><span class="status-dot"></span>Chưa Kích Hoạt</span>';
  }

  function getDeletedBadge(deleted) {
    if (deleted) {
      return '<span class="status-badge da-huy"><span class="status-dot"></span>Đã xóa</span>';
    }
    return '<span class="status-badge dang-ban"><span class="status-dot"></span>Chưa Xóa</span>';
  }

  var sortIcon = pg.sortAsc ? ' ↑' : ' ↓';
  var rowsHtml = pageItems.length ? pageItems.map(function (x, idx) {
    var realIdx = list.indexOf(x);
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub); width:60px;">' + (sliceStart + idx + 1) + '</td>' +
      '<td><div style="font-weight:700; color:var(--black); font-size:14px;">' + esc(x.name) + '</div></td>' +
      '<td>' + esc(getSeatFloorLabel(x.floor)) + '</td>' +
      '<td style="text-align:center;">' + getActiveBadge(x.active) + '</td>' +
      '<td style="text-align:center;">' + getDeletedBadge(x.deleted) + '</td>' +
      '<td style="text-align:center;">' +
        '<div style="display:flex; align-items:center; justify-content:center; gap:6px;">' +
          '<button class="btn btn-sm" data-action="adminOpenVehicleSeatModal" data-args=\'[' + realIdx + ']\'>Sửa</button>' +
          '<button class="btn btn-sm" data-action="adminToggleVehicleSeatActive" data-args=\'[' + realIdx + ']\'>' + (x.active ? 'Tắt' : 'Bật') + '</button>' +
          '<button class="btn btn-sm btn-danger" data-action="adminDeleteVehicleSeat" data-args=\'[' + realIdx + ']\'>Xoá</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="6" class="empty-state">Không tìm thấy ghế xe nào.</td></tr>';

  $('viewVehicleSeats').innerHTML =
    '<div class="vehicle-seats-shell">' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng số ghế xe</div>' +
          '<div class="dir-stat-val">' + totalCount + '</div>' +
          '<div class="dir-stat-sub">Danh mục ghế trong hệ thống</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tầng dưới</div>' +
          '<div class="dir-stat-val" style="color:var(--red);">' + floor1Count + '</div>' +
          '<div class="dir-stat-sub">Ghế tầng 1</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tầng trên</div>' +
          '<div class="dir-stat-val" style="color:#0284C7;">' + floor2Count + '</div>' +
          '<div class="dir-stat-sub">Ghế tầng 2</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Đang kích hoạt</div>' +
          '<div class="dir-stat-val" style="color:#059669;">' + activeCount + '</div>' +
          '<div class="dir-stat-sub">Sẵn sàng áp dụng cho sơ đồ</div>' +
        '</div>' +
      '</div>' +

      '<div class="filter-toolbar" style="margin-bottom:20px;">' +
        '<div class="filter-field" style="flex:1 1 220px; min-width:220px;">' +
          '<label>Tìm kiếm ghế xe</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Tên ghế, tầng, mô tả..." data-input-action="adminVehicleSeatFilterInput" data-args=\'["search","__this_value__"]\' style="width:100%; min-width:0;">' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Tầng</label>' +
          '<select data-change-action="adminVehicleSeatFilterInput" data-args=\'["floor","__this_value__"]\'>' +
            '<option value="">Tất cả tầng</option>' +
            SEAT_FLOOR_OPTIONS.map(function (o) {
              return '<option value="' + o.value + '"' + (f.floor === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Trạng thái</label>' +
          '<select data-change-action="adminVehicleSeatFilterInput" data-args=\'["active","__this_value__"]\'>' +
            '<option value="">Kích hoạt — Tất cả</option>' +
            '<option value="true"' + (f.active === 'true' ? ' selected' : '') + '>Được kích hoạt</option>' +
            '<option value="false"' + (f.active === 'false' ? ' selected' : '') + '>Chưa kích hoạt</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>&nbsp;</label>' +
          '<select data-change-action="adminVehicleSeatFilterInput" data-args=\'["deleted","__this_value__"]\'>' +
            '<option value="">Đã xóa — Tất cả</option>' +
            '<option value="false"' + (f.deleted === 'false' ? ' selected' : '') + '>Chưa xóa</option>' +
            '<option value="true"' + (f.deleted === 'true' ? ' selected' : '') + '>Đã xóa</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-spacer"></div>' +
        '<button class="btn btn-primary" data-action="adminOpenVehicleSeatModal" data-args=\'[-1]\'>+ Tạo Mới</button>' +
      '</div>' +

      '<div class="ref-card admin-table-card">' +
        '<div class="admin-table-wrap">' +
          '<table class="admin-table">' +
            '<thead>' +
              '<tr>' +
                '<th style="width:60px; text-align:center;">STT</th>' +
                '<th><button type="button" class="admin-th-sort" data-action="adminVehicleSeatToggleSort">Tên' + sortIcon + '</button></th>' +
                '<th style="width:180px;">Tầng</th>' +
                '<th style="text-align:center; width:130px;">Kích hoạt</th>' +
                '<th style="text-align:center; width:110px;">Đã xóa</th>' +
                '<th style="text-align:center; width:160px;">Hành động</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
        renderVehicleSeatPagination(totalFiltered, pg.page, pg.pageSize) +
      '</div>' +
    '</div>';
}

function adminVehicleSeatFilterInput(key, val) {
  VEHICLE_SEAT_FILTERS[key] = val;
  VEHICLE_SEAT_PAGE.page = 1;
  renderVehicleSeatsView();
}

function adminVehicleSeatPageChange(page) {
  VEHICLE_SEAT_PAGE.page = Math.max(1, parseInt(page, 10) || 1);
  renderVehicleSeatsView();
}

function adminVehicleSeatPageSizeChange(size) {
  VEHICLE_SEAT_PAGE.pageSize = Math.max(5, parseInt(size, 10) || 15);
  VEHICLE_SEAT_PAGE.page = 1;
  renderVehicleSeatsView();
}

function adminVehicleSeatToggleSort() {
  VEHICLE_SEAT_PAGE.sortAsc = !VEHICLE_SEAT_PAGE.sortAsc;
  renderVehicleSeatsView();
}

function adminOpenVehicleSeatModal(idx) {
  var list = getVehicleSeats();
  var item = idx >= 0 ? list[idx] : null;
  var isEdit = !!item;
  var title = isEdit ? 'Cập nhật ghế xe' : 'Tạo mới ghế xe';
  var toggleCols = isEdit ? '' : ' cols-3';

  openAdminModal(
    '<h3><svg style="width:20px; height:20px; vertical-align:-3px; margin-right:6px; color:var(--red);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' + esc(title) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveVehicleSeat" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="vsIdx" value="' + idx + '">' +

      '<div class="form-section-label">Thông tin ghế</div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Tên ghế <span class="req">*</span></label>' +
          '<input type="text" id="vsName" required placeholder="VD: A1, B12..." value="' + (item ? esc(item.name) : '') + '"></div>' +
        '<div class="fld"><label>Sơ đồ bố trí ghế xe <span class="req">*</span></label>' +
          '<select id="vsFloor" required>' + seatFloorSelectOptions(item ? item.floor : '1') + '</select></div>' +
      '</div>' +
      '<div class="fld"><label>Nội dung <span class="req">*</span></label>' +
        '<textarea id="vsContent" rows="4" required placeholder="Nhập mô tả ghế xe...">' + (item ? esc(item.content || '') : '') + '</textarea>' +
      '</div>' +

      '<div class="form-section-label" style="margin-top:4px;">Trạng thái</div>' +
      '<div class="form-toggle-grid' + toggleCols + '">' +
        '<div class="fld"><label>Kích hoạt</label>' + vsRadioGroup('vsActive', !item || item.active) + '</div>' +
        (isEdit ? '<div class="fld"><label>Đã xóa</label>' + vsRadioGroup('vsDeleted', !!(item && item.deleted)) + '</div>' : '') +
      '</div>' +

      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button>' +
        '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Lưu thay đổi' : 'Tạo ghế xe') + '</button>' +
      '</div>' +
    '</form>',
    true
  );

  var form = document.querySelector('#adminModalBox form');
  if (form) {
    form.onsubmit = function (e) {
      adminSaveVehicleSeat(e);
    };
  }
}

function adminSaveVehicleSeat(e) {
  if (e && e.preventDefault) e.preventDefault();
  var idx = parseInt($('vsIdx').value, 10);
  var list = getVehicleSeats();
  var name = $('vsName').value.trim();
  var floor = $('vsFloor').value;
  var content = $('vsContent').value.trim();

  if (!name) { showToast('Vui lòng nhập tên ghế.'); return; }
  if (!content) { showToast('Vui lòng nhập nội dung mô tả ghế.'); return; }

  var dup = list.some(function (x, i) {
    return i !== idx && x && String(x.name).toLowerCase() === name.toLowerCase() && String(x.floor) === String(floor);
  });
  if (dup) { showToast('Ghế "' + name + '" đã tồn tại trên tầng này.'); return; }

  var activeEl = document.querySelector('input[name="vsActive"]:checked');
  var deletedEl = document.querySelector('input[name="vsDeleted"]:checked');
  var active = activeEl ? activeEl.value === '1' : true;
  var deleted = deletedEl ? deletedEl.value === '1' : false;

  var rec = {
    id: idx >= 0 ? list[idx].id : Date.now(),
    name: name,
    floor: floor,
    content: content,
    active: active,
    deleted: deleted
  };

  if (idx >= 0) {
    var before = list[idx];
    list[idx] = rec;
    if (window.FleetStore && window.FleetStore.log) {
      window.FleetStore.log({ action: 'update', entity: 'vehicle_seat', entityId: name, summary: 'Sửa ghế xe ' + name, before: before, after: rec });
    }
  } else {
    list.push(rec);
    if (window.FleetStore && window.FleetStore.log) {
      window.FleetStore.log({ action: 'create', entity: 'vehicle_seat', entityId: name, summary: 'Tạo mới ghế xe ' + name, after: rec });
    }
  }

  saveVehicleSeats(list);
  closeAdminModal();
  showToast('Đã lưu ghế xe.');
  renderVehicleSeatsView();
}

function adminToggleVehicleSeatActive(idx) {
  var list = getVehicleSeats();
  var item = list[idx];
  if (!item) return;
  item.active = !item.active;
  saveVehicleSeats(list);
  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: 'update', entity: 'vehicle_seat', entityId: item.name, summary: (item.active ? 'Kích hoạt' : 'Tắt kích hoạt') + ' ghế xe ' + item.name });
  }
  showToast('Đã cập nhật trạng thái kích hoạt.');
  renderVehicleSeatsView();
}

function adminDeleteVehicleSeat(idx) {
  var list = getVehicleSeats();
  var item = list[idx];
  if (!item) return;
  if (!confirm('Bạn có chắc chắn muốn xóa ghế xe "' + item.name + '"?')) return;
  list.splice(idx, 1);
  saveVehicleSeats(list);
  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: 'delete', entity: 'vehicle_seat', entityId: item.name, summary: 'Xóa ghế xe ' + item.name });
  }
  showToast('Đã xóa ghế xe.');
  renderVehicleSeatsView();
}
