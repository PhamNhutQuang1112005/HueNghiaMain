/* =========================================================
   NHÂN SỰ > CẤU HÌNH NHÂN SỰ — quản lý danh mục "Loại nhân viên" (trước đây hard-code STAFF_ROLES
   trong admin-staff.js: ticket/driver/helper/shuttle_driver), nay admin tự thêm/sửa/xoá qua đây
   (FleetStore.getStaffRoles(), xem shared/js/fleet-store.js). Mỗi loại nhân viên mang theo 1 "cụm phân
   quyền" (mảng permission key theo window.PERMISSION_GROUPS, auth/permissions.js) = quyền mặc định cấp
   cho nhân viên thuộc loại đó — dùng chung khung checkbox với modal Tài khoản (acPermissionsFieldHtml/
   acToggleGroupPerms/acReadSelectedPermissions, admin-accounts.js) để 2 nơi luôn đồng bộ 1 danh mục quyền.
   ========================================================= */
var STAFF_ROLE_FILTERS = { search: '', permStatus: '' };

function renderStaffConfigView() {
  var roles = FleetStore.getStaffRoles();
  var staffAll = FleetStore.getStaff();
  var f = STAFF_ROLE_FILTERS;
  var kw = f.search.toLowerCase();

  var filtered = roles.filter(function (r) {
    var permCount = Array.isArray(r.permissions) ? r.permissions.length : 0;
    if (f.permStatus === 'unassigned' && permCount) return false;
    if (f.permStatus === 'assigned' && !permCount) return false;
    if (kw && (r.label + ' ' + r.key).toLowerCase().indexOf(kw) === -1) return false;
    return true;
  });

  var rows = filtered.length ? filtered.map(function (r, i) {
    var usedCount = staffAll.filter(function (s) { return s && s.role === r.key; }).length;
    var permCount = Array.isArray(r.permissions) ? r.permissions.length : 0;
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(r.label) + '</b></td>' +
      '<td class="mono">' + esc(r.key) + '</td>' +
      '<td style="text-align:center;">' + usedCount + '</td>' +
      '<td>' + (permCount ? permCount + ' quyền đã gán' : '<span class="hint-inline">Chưa gán quyền</span>') + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStaffRoleRowMenu" data-args=\'["__this__","' + esc(r.key) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="6" class="empty-state">Chưa có loại nhân viên nào phù hợp.</td></tr>';

  $('viewStaffConfig').innerHTML =
    '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search">' +
        '<label>Tìm kiếm</label>' +
        '<input type="text" id="srSearch" value="' + esc(f.search) + '" placeholder="Tên loại nhân viên, mã..." data-input-action="adminStaffRoleFilterInput" data-args=\'["search","__this_value__"]\'>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Trạng thái phân quyền</label>' +
        '<select data-change-action="adminStaffRoleFilterInput" data-args=\'["permStatus","__this_value__"]\'>' +
          '<option value="">Tất cả trạng thái</option>' +
          '<option value="unassigned"' + (f.permStatus === 'unassigned' ? ' selected' : '') + '>Chưa gán quyền</option>' +
          '<option value="assigned"' + (f.permStatus === 'assigned' ? ' selected' : '') + '>Đã gán quyền</option>' +
        '</select>' +
      '</div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn sd-btn" data-action="adminStaffRoleSearchClick">Tìm kiếm</button>' +
        '<button type="button" class="btn sd-btn" data-action="adminResetStaffRoleFilters">Đặt lại</button>' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStaffRoleModal" data-args=\'[""]\'>Thêm loại nhân viên</button>' +
      '</div>' +
    '</div>' +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span>Loại nhân viên &amp; cụm phân quyền</span>' +
        '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + filtered.length + ' loại nhân viên</span>' +
      '</div>' +
      '<div class="sd-table-wrap">' +
        '<table class="admin-table">' +
          '<thead><tr>' +
            '<th class="num">STT</th>' +
            '<th>Tên loại nhân viên</th>' +
            '<th>Mã</th>' +
            '<th style="text-align:center;">Số nhân viên</th>' +
            '<th>Cụm phân quyền</th>' +
            '<th class="th-actions">Thao tác</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div></div>';
}

function adminStaffRoleFilterInput(field, val) {
  if (!(field in STAFF_ROLE_FILTERS)) return;
  STAFF_ROLE_FILTERS[field] = val || '';
  adminKeepFocus(renderStaffConfigView);
}
// Nút "Tìm kiếm" cạnh ô lọc (giống admin-customers.js:custSearchClick) — lọc đã chạy live theo
// data-input-action nên nút này chỉ đọc lại giá trị ô hiện tại rồi render, cho quen thao tác bấm nút.
function adminStaffRoleSearchClick() {
  var el = $('srSearch');
  STAFF_ROLE_FILTERS.search = (el && el.value) || '';
  renderStaffConfigView();
}
function adminResetStaffRoleFilters() {
  STAFF_ROLE_FILTERS = { search: '', permStatus: '' };
  renderStaffConfigView();
}

function adminStaffRoleRowMenu(btn, key) {
  adminOpenRowMenu(btn, 'staff-role:' + key,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStaffRoleModal" data-args=\'["' + esc(key) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStaffRole" data-args=\'["' + esc(key) + '"]\'>Xoá</button>');
}

function adminOpenStaffRoleModal(key) {
  var r = key ? FleetStore.getStaffRoles().find(function (x) { return x.key === key; }) : null;
  openAdminModal(
    '<h3>' + (r ? 'Sửa loại nhân viên' : 'Thêm loại nhân viên') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStaffRole" data-args=\'["__event__"' + (r ? ',"' + esc(r.key) + '"' : '') + ']\'>' +
      '<div class="fld"><label>Tên loại nhân viên <span class="req">*</span></label><input id="srLabel" required value="' + (r ? esc(r.label) : '') + '" placeholder="VD: Nhân viên kho, Nhân viên vệ sinh..."></div>' +
      acPermissionsFieldHtml(r ? r.permissions : []) +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Huỷ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu</button>' +
      '</div>' +
    '</form>',
    true
  );
}

function adminSaveStaffRole(e, key) {
  e.preventDefault();
  var fields = {
    label: $('srLabel').value.trim(),
    permissions: acReadSelectedPermissions()
  };
  if (!fields.label) { showToast('Nhập tên loại nhân viên.'); return; }

  var res = key ? FleetStore.updateStaffRole(key, fields) : FleetStore.addStaffRole(fields);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: key ? 'update' : 'create', entity: 'staff_role', entityId: (res.item && res.item.key) || key || fields.label, summary: (key ? 'Sửa' : 'Thêm') + ' loại nhân viên "' + fields.label + '"' });
  closeAdminModal();
  showToast(key ? 'Đã lưu loại nhân viên.' : 'Đã thêm loại nhân viên.');
  renderStaffConfigView();
}

function adminDeleteStaffRole(key) {
  var r = FleetStore.getStaffRoles().find(function (x) { return x.key === key; });
  if (!r) return;
  if (!confirm('Xoá loại nhân viên "' + r.label + '"?')) return;
  var res = FleetStore.removeStaffRole(key);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: 'delete', entity: 'staff_role', entityId: key, summary: 'Xoá loại nhân viên "' + r.label + '"' });
  showToast('Đã xoá loại nhân viên.');
  renderStaffConfigView();
}
