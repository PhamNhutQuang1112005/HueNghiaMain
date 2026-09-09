/* =========================================================
   QUẢN LÝ LOẠI XE (VEHICLE CATEGORIES MANAGEMENT)
   Giao diện chuẩn Admin đồng bộ 100% với hệ thống.
   ========================================================= */

var DEFAULT_VEHICLE_CATEGORIES = [
  { id: 1, name: 'Loại xe 9 chỗ', content: 'Xe Limousine 9 chỗ phục vụ tuyến cố định và trung chuyển cao cấp.', isPassenger: true, isCargo: true, active: false, deleted: true },
  { id: 2, name: 'Loại Xe Limousine 11 Chỗ', content: 'Xe Limousine 11 chỗ VIP nội thất sang trọng.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 3, name: 'Loại Xe Limousine 19 Chỗ', content: 'Xe Limousine 19 chỗ ghế ngả massage.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 4, name: 'Loại Xe Limousine 28 Chỗ', content: 'Xe Limousine 28 chỗ rộng rãi tiện nghi.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 5, name: 'Loại Xe Limousine 9 Chỗ', content: 'Xe Limousine 9 chỗ thế hệ mới.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 6, name: 'Loại Xe Thường 16 Chỗ', content: 'Xe 16 chỗ chạy tuyến ngắn và đón trả khách.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 7, name: 'Loại Xe Thường 26 Chỗ', content: 'Xe ghế ngồi 26 chỗ phổ thông.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 8, name: 'Loại Xe Thường 28 Chỗ', content: 'Xe 28 chỗ đưa đón tận nơi.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 9, name: 'Loại Xe Thường 47 Chỗ', content: 'Xe khách 47 chỗ vận tải đường dài.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 10, name: 'Xe Tải Chở Hàng', content: 'Phương tiện chuyên dụng vận tải hàng hóa, bưu gửi.', isPassenger: false, isCargo: true, active: true, deleted: false },
  { id: 11, name: 'Loại Xe VIP 24 Phòng', content: 'Xe giường nằm 24 cabin VIP riêng biệt.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 12, name: 'Loại Xe 34 Giường', content: 'Xe giường nằm 34 chỗ 2 tầng.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 13, name: 'Loại Xe 36 Giường', content: 'Xe giường nằm 36 chỗ.', isPassenger: true, isCargo: true, active: true, deleted: false },
  { id: 14, name: 'Loại Xe 40 Giường', content: 'Xe giường nằm 40 chỗ tiêu chuẩn.', isPassenger: true, isCargo: true, active: true, deleted: false }
];

var VEHICLE_CATEGORY_FILTERS = { search: '', isPassenger: '', isCargo: '', active: '', deleted: '' };

function getVehicleCategories() {
  return lsRead(HN_VEHICLE_CATEGORIES_KEY, DEFAULT_VEHICLE_CATEGORIES);
}

function saveVehicleCategories(list) {
  lsWrite(HN_VEHICLE_CATEGORIES_KEY, list);
}

function renderVehicleCategoriesView() {
  var list = getVehicleCategories();
  var f = VEHICLE_CATEGORY_FILTERS;

  var totalCount = list.length;
  var passengerCount = list.filter(function (x) { return x.isPassenger; }).length;
  var cargoCount = list.filter(function (x) { return x.isCargo; }).length;
  var activeCount = list.filter(function (x) { return x.active && !x.deleted; }).length;

  var filtered = list.filter(function (x) {
    if (!x) return false;
    if (f.search) {
      var kw = f.search.toLowerCase();
      var matchName = (x.name || '').toLowerCase().indexOf(kw) !== -1;
      var matchContent = (x.content || '').toLowerCase().indexOf(kw) !== -1;
      if (!matchName && !matchContent) return false;
    }
    if (f.isPassenger === 'true' && !x.isPassenger) return false;
    if (f.isPassenger === 'false' && x.isPassenger) return false;
    if (f.isCargo === 'true' && !x.isCargo) return false;
    if (f.isCargo === 'false' && x.isCargo) return false;
    if (f.active === 'true' && !x.active) return false;
    if (f.active === 'false' && x.active) return false;
    if (f.deleted === 'true' && !x.deleted) return false;
    if (f.deleted === 'false' && x.deleted) return false;
    return true;
  });

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

  function getYesNoBadge(val) {
    if (val) {
      return '<span class="status-badge dang-ban"><span class="status-dot"></span>Có</span>';
    }
    return '<span class="status-badge da-huy"><span class="status-dot"></span>Không</span>';
  }

  var rowsHtml = filtered.length ? filtered.map(function (x, idx) {
    var realIdx = list.indexOf(x);

    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub); width:60px;">' + (idx + 1) + '</td>' +
      '<td>' +
        '<div style="font-weight:700; color:var(--black); font-size:14px;">' + esc(x.name) + '</div>' +
        '<div style="font-size:12px; color:var(--text-sub); line-height:1.3; margin-top:2px;">' + esc(x.content || 'Chưa có mô tả') + '</div>' +
      '</td>' +
      '<td style="text-align:center;">' + getYesNoBadge(x.isPassenger) + '</td>' +
      '<td style="text-align:center;">' + getYesNoBadge(x.isCargo) + '</td>' +
      '<td style="text-align:center;">' + getActiveBadge(x.active) + '</td>' +
      '<td style="text-align:center;">' + getDeletedBadge(x.deleted) + '</td>' +
      '<td style="text-align:center;">' +
        '<div style="display:flex; align-items:center; justify-content:center; gap:6px;">' +
          '<button class="btn btn-sm" data-action="adminOpenVehicleCategoryModal" data-args=\'[' + realIdx + ']\'>Sửa</button>' +
          '<button class="btn btn-sm" data-action="adminToggleVehicleCategoryActive" data-args=\'[' + realIdx + ']\'>' + (x.active ? 'Tắt' : 'Bật') + '</button>' +
          '<button class="btn btn-sm btn-danger" data-action="adminDeleteVehicleCategory" data-args=\'[' + realIdx + ']\'>Xoá</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">Không tìm thấy loại xe nào.</td></tr>';

  $('viewVehicleCategories').innerHTML =
    '<div class="vehicle-categories-shell">' +
      '<!-- OVERVIEW STATS METRICS -->' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng số loại xe</div>' +
          '<div class="dir-stat-val">' + totalCount + '</div>' +
          '<div class="dir-stat-sub">Phân loại phương tiện hệ thống</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Loại Chở Khách</div>' +
          '<div class="dir-stat-val" style="color:var(--red);">' + passengerCount + '</div>' +
          '<div class="dir-stat-sub">Phục vụ hành khách</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Loại Chở Hàng</div>' +
          '<div class="dir-stat-val" style="color:#0284C7;">' + cargoCount + '</div>' +
          '<div class="dir-stat-sub">Vận chuyển hàng hóa</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Đang kích hoạt</div>' +
          '<div class="dir-stat-val" style="color:#059669;">' + activeCount + '</div>' +
          '<div class="dir-stat-sub">Sẵn sàng áp dụng cho đội xe</div>' +
        '</div>' +
      '</div>' +

      '<!-- FILTER TOOLBAR -->' +
      '<div class="filter-toolbar" style="margin-bottom:20px;">' +
        '<div class="filter-field" style="flex:1 1 220px; min-width:220px;">' +
          '<label>Tìm kiếm loại xe</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Tên loại xe, nội dung..." data-input-action="adminVehicleCategoryFilterInput" data-args=\'["search","__this_value__"]\' style="width:100%; min-width:0;">' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Phân loại</label>' +
          '<select data-change-action="adminVehicleCategoryFilterInput" data-args=\'["isPassenger","__this_value__"]\'>' +
            '<option value="">Chở khách — Tất cả</option>' +
            '<option value="true"' + (f.isPassenger === 'true' ? ' selected' : '') + '>Có chở khách</option>' +
            '<option value="false"' + (f.isPassenger === 'false' ? ' selected' : '') + '>Không chở khách</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>&nbsp;</label>' +
          '<select data-change-action="adminVehicleCategoryFilterInput" data-args=\'["isCargo","__this_value__"]\'>' +
            '<option value="">Chở hàng — Tất cả</option>' +
            '<option value="true"' + (f.isCargo === 'true' ? ' selected' : '') + '>Có chở hàng</option>' +
            '<option value="false"' + (f.isCargo === 'false' ? ' selected' : '') + '>Không chở hàng</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Trạng thái</label>' +
          '<select data-change-action="adminVehicleCategoryFilterInput" data-args=\'["active","__this_value__"]\'>' +
            '<option value="">Kích hoạt — Tất cả</option>' +
            '<option value="true"' + (f.active === 'true' ? ' selected' : '') + '>Được kích hoạt</option>' +
            '<option value="false"' + (f.active === 'false' ? ' selected' : '') + '>Chưa kích hoạt</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>&nbsp;</label>' +
          '<select data-change-action="adminVehicleCategoryFilterInput" data-args=\'["deleted","__this_value__"]\'>' +
            '<option value="">Đã xóa — Tất cả</option>' +
            '<option value="false"' + (f.deleted === 'false' ? ' selected' : '') + '>Chưa xóa</option>' +
            '<option value="true"' + (f.deleted === 'true' ? ' selected' : '') + '>Đã xóa</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-spacer"></div>' +
        '<button class="btn btn-primary" data-action="adminOpenVehicleCategoryModal" data-args=\'[-1]\'>+ Tạo Mới</button>' +
      '</div>' +

      '<!-- TABLE CARD -->' +
      '<div class="ref-card admin-table-card">' +
        '<div class="admin-table-wrap">' +
          '<table class="admin-table">' +
            '<thead>' +
              '<tr>' +
                '<th style="width:60px; text-align:center;">STT</th>' +
                '<th>Tên loại xe</th>' +
                '<th style="text-align:center; width:110px;">Chở khách</th>' +
                '<th style="text-align:center; width:110px;">Chở hàng</th>' +
                '<th style="text-align:center; width:130px;">Kích hoạt</th>' +
                '<th style="text-align:center; width:110px;">Đã xóa</th>' +
                '<th style="text-align:center; width:160px;">Hành động</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function adminVehicleCategoryFilterInput(key, val) {
  VEHICLE_CATEGORY_FILTERS[key] = val;
  renderVehicleCategoriesView();
}

function vcRadioGroup(name, checkedYes) {
  return '<div class="radio-inline">' +
    '<label><input type="radio" name="' + name + '" value="1"' + (checkedYes ? ' checked' : '') + '> Có</label>' +
    '<label><input type="radio" name="' + name + '" value="0"' + (!checkedYes ? ' checked' : '') + '> Không</label>' +
  '</div>';
}

function adminOpenVehicleCategoryModal(idx) {
  var list = getVehicleCategories();
  var item = idx >= 0 ? list[idx] : null;
  var isEdit = !!item;
  var title = isEdit ? 'Cập nhật loại xe' : 'Tạo mới loại xe';
  var toggleCols = isEdit ? '' : ' cols-3';

  openAdminModal(
    '<h3><svg style="width:20px; height:20px; vertical-align:-3px; margin-right:6px; color:var(--red);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' + esc(title) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveVehicleCategory" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="vcIdx" value="' + idx + '">' +

      '<div class="form-section-label">Thông tin cơ bản</div>' +
      '<div class="fld"><label>Tên loại xe <span class="req">*</span></label>' +
        '<input type="text" id="vcName" required placeholder="VD: Loại Xe Limousine 11 Chỗ" value="' + (item ? esc(item.name) : '') + '"></div>' +
      '<div class="fld"><label>Mô tả <span class="req">*</span></label>' +
        '<textarea id="vcContent" rows="4" required placeholder="Nhập nội dung mô tả loại xe...">' + (item ? esc(item.content || '') : '') + '</textarea>' +
      '</div>' +

      '<div class="form-section-label" style="margin-top:4px;">Phân loại & trạng thái</div>' +
      '<div class="form-toggle-grid' + toggleCols + '">' +
        '<div class="fld"><label>Chở khách</label>' + vcRadioGroup('vcIsPassenger', !item || item.isPassenger) + '</div>' +
        '<div class="fld"><label>Chở hàng</label>' + vcRadioGroup('vcIsCargo', !item || item.isCargo) + '</div>' +
        '<div class="fld"><label>Kích hoạt</label>' + vcRadioGroup('vcActive', !item || item.active) + '</div>' +
        (isEdit ? '<div class="fld"><label>Đã xóa</label>' + vcRadioGroup('vcDeleted', !!(item && item.deleted)) + '</div>' : '') +
      '</div>' +

      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button>' +
        '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Lưu thay đổi' : 'Tạo loại xe') + '</button>' +
      '</div>' +
    '</form>',
    true
  );

  var form = document.querySelector('#adminModalBox form');
  if (form) {
    form.onsubmit = function (e) {
      adminSaveVehicleCategory(e);
    };
  }
}

function adminSaveVehicleCategory(e) {
  if (e && e.preventDefault) e.preventDefault();
  var idx = parseInt($('vcIdx').value, 10);
  var list = getVehicleCategories();
  var name = $('vcName').value.trim();
  var content = $('vcContent').value.trim();

  if (!name) { showToast('Vui lòng nhập tên loại xe.'); return; }

  var isPassengerEl = document.querySelector('input[name="vcIsPassenger"]:checked');
  var isCargoEl = document.querySelector('input[name="vcIsCargo"]:checked');
  var activeEl = document.querySelector('input[name="vcActive"]:checked');
  var deletedEl = document.querySelector('input[name="vcDeleted"]:checked');

  var isPassenger = isPassengerEl ? isPassengerEl.value === '1' : true;
  var isCargo = isCargoEl ? isCargoEl.value === '1' : true;
  var active = activeEl ? activeEl.value === '1' : true;
  var deleted = deletedEl ? deletedEl.value === '1' : false;

  var rec = {
    id: idx >= 0 ? list[idx].id : Date.now(),
    name: name,
    content: content,
    isPassenger: isPassenger,
    isCargo: isCargo,
    active: active,
    deleted: deleted
  };

  if (idx >= 0) {
    var before = list[idx];
    list[idx] = rec;
    if (window.FleetStore && window.FleetStore.log) {
      window.FleetStore.log({ action: 'update', entity: 'vehicle_category', entityId: name, summary: 'Sửa loại xe ' + name, before: before, after: rec });
    }
  } else {
    list.push(rec);
    if (window.FleetStore && window.FleetStore.log) {
      window.FleetStore.log({ action: 'create', entity: 'vehicle_category', entityId: name, summary: 'Tạo mới loại xe ' + name, after: rec });
    }
  }

  saveVehicleCategories(list);
  closeAdminModal();
  showToast('Đã lưu loại xe.');
  renderVehicleCategoriesView();
}

function adminToggleVehicleCategoryActive(idx) {
  var list = getVehicleCategories();
  var item = list[idx];
  if (!item) return;
  item.active = !item.active;
  saveVehicleCategories(list);
  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: 'update', entity: 'vehicle_category', entityId: item.name, summary: (item.active ? 'Kích hoạt' : 'Tắt kích hoạt') + ' loại xe ' + item.name });
  }
  showToast('Đã cập nhật trạng thái kích hoạt.');
  renderVehicleCategoriesView();
}

function adminDeleteVehicleCategory(idx) {
  var list = getVehicleCategories();
  var item = list[idx];
  if (!item) return;
  if (!confirm('Bạn có chắc chắn muốn xóa loại xe "' + item.name + '"?')) return;
  list.splice(idx, 1);
  saveVehicleCategories(list);
  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: 'delete', entity: 'vehicle_category', entityId: item.name, summary: 'Xóa loại xe ' + item.name });
  }
  showToast('Đã xóa loại xe.');
  renderVehicleCategoriesView();
}
