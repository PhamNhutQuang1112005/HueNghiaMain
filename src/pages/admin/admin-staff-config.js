/* =========================================================
   NHÂN SỰ > CẤU HÌNH NHÂN SỰ — quản lý danh mục "Loại nhân viên" (trước đây hard-code STAFF_ROLES
   trong admin-staff.js: ticket/driver/helper/shuttle_driver), nay admin tự thêm/sửa/xoá qua đây
   (FleetStore.getStaffRoles(), xem shared/js/fleet-store.js). Mỗi loại nhân viên mang theo 1 "cụm phân
   quyền" (mảng permission key theo window.PERMISSION_GROUPS, auth/permissions.js) = quyền mặc định cấp
   cho nhân viên thuộc loại đó — dùng chung khung checkbox với modal Tài khoản (acPermissionsFieldHtml/
   acToggleGroupPerms/acReadSelectedPermissions, admin-accounts.js) để 2 nơi luôn đồng bộ 1 danh mục quyền.
   ========================================================= */
function renderStaffConfigView() {
  var roles = FleetStore.getStaffRoles();
  var staffAll = FleetStore.getStaff();

  var rows = roles.length ? roles.map(function (r, i) {
    var usedCount = staffAll.filter(function (s) { return s && s.role === r.key; }).length;
    var permCount = Array.isArray(r.permissions) ? r.permissions.length : 0;
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(r.label) + '</b></td>' +
      '<td class="mono">' + esc(r.key) + '</td>' +
      '<td style="text-align:center;">' + usedCount + '</td>' +
      '<td class="mono" style="color:var(--text-sub);">' + esc(r.redirect || 'ticketstaff.html') + '</td>' +
      '<td>' + (permCount ? permCount + ' quyền đã gán' : '<span class="hint-inline">Chưa gán quyền</span>') + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStaffRoleRowMenu" data-args=\'["__this__","' + esc(r.key) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">Chưa có loại nhân viên nào.</td></tr>';

  $('viewStaffConfig').innerHTML =
    '<div class="sd-toolbar">' +
      '<div class="sd-toolbar-actions" style="margin-left:auto;">' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStaffRoleModal" data-args=\'[""]\'>Thêm loại nhân viên</button>' +
      '</div>' +
    '</div>' +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span>Loại nhân viên &amp; cụm phân quyền</span>' +
        '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + roles.length + ' loại nhân viên</span>' +
      '</div>' +
      '<div class="sd-table-wrap">' +
        '<table class="admin-table">' +
          '<thead><tr>' +
            '<th class="num">STT</th>' +
            '<th>Tên loại nhân viên</th>' +
            '<th>Mã</th>' +
            '<th style="text-align:center;">Số nhân viên</th>' +
            '<th>Trang đích đăng nhập</th>' +
            '<th>Cụm phân quyền</th>' +
            '<th class="th-actions">Thao tác</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div></div>';
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
      '<div class="fld"><label>Trang đích đăng nhập <span class="req">*</span></label>' +
        '<select id="srRedirect">' + adminRedirectPageOptionsHtml(r ? r.redirect : 'ticketstaff.html') + '</select>' +
        '<p class="hint-inline">Trang mở ra khi tài khoản thuộc loại nhân viên này đăng nhập — dùng chung cho modal Tài khoản.</p>' +
      '</div>' +
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
    redirect: $('srRedirect').value,
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
