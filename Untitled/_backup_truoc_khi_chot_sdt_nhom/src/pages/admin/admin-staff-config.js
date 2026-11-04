/* =========================================================
   NHÂN SỰ > CẤU HÌNH NHÂN SỰ (trạng thái, tham số, tài khoản nhân sự: CHỈ ADMIN GỐC; loại nhân viên thường: admin gốc + HR)
   4 tab (v3.1; đã bỏ Nhóm công việc và Ca mẫu):
     1. Loại nhân viên ... employee_types + employee_type_permissions + employee_type_grantable_permissions
                           (FleetStore.getStaffRoles(), xem shared/js/fleet-store.js). Mỗi loại mang: mã (không sửa sau khi
                           tạo), BA CỜ is_self / requires_license / crew_role (crew_role khóa khi đã có nhân viên), ngừng dùng,
                           cụm phân quyền (có thể để trống = loại 0 quyền) và QUYỀN ĐƯỢC PHÉP CẤP cho người khác (trần ủy quyền).
     2. Trạng thái ........ employment_statuses — Đang làm việc / Tạm ngưng / Nghỉ việc, cờ khóa đăng nhập.
     3. Tham số đăng nhập . idle_timeout_minutes, session_hours, ... (M09 app_settings, bản demo lưu localStorage).
     4. Tài khoản nhân sự . tài khoản của nhóm HR (admin gốc tạo). Luồng: Loại nhân viên HR > Quyền > Tài khoản.
                           Dùng lại khung tài khoản của admin-accounts.js (ACCOUNT_SCOPE = 'hr').
   Loại nhân viên: admin gốc và HR (quyền manage_hr) thêm/sửa loại cho nhân viên thường; loại chứa quyền bảo vệ (nhóm HR) chỉ admin gốc.
   Khung chọn quyền dùng chung với admin-accounts.js (acPermissionsFieldHtml/acReadSelectedPermissions).
   ========================================================= */
var STAFF_CFG_TAB = 'types';
var STAFF_ROLE_FILTERS = { search: '', permStatus: '', usage: '', crew: '' };

function setStaffConfigTab(tab) { STAFF_CFG_TAB = tab; renderStaffConfigView(); }
function hrRequireRoot() {
  if (hrActor().isRoot) return true;
  showToast('Chỉ admin gốc được sửa Cấu hình nhân sự.');
  return false;
}
// Sửa loại nhân viên: admin gốc làm được mọi loại; HR (quyền manage_hr) chỉ thêm/sửa loại thường, không đụng nhóm HR. r = null: loại mới.
function hrCanEditRole(r) {
  if (hrActor().isRoot) return true;
  return acHasPerm('manage_hr') && !(r && hrIsProtectedRole(r.key));
}
function hrRequireRoleEditor(r) {
  if (hrCanEditRole(r)) return true;
  showToast(r && hrIsProtectedRole(r.key) ? 'Loại thuộc nhóm HR — chỉ admin gốc sửa.' : 'Chỉ admin gốc hoặc nhân sự (quyền Quản lý nhân sự) được sửa loại nhân viên.');
  return false;
}
function hrCountStaffOfRole(key) { return FleetStore.getStaff().filter(function (s) { return s && s.role === key; }).length; }

function renderStaffConfigView() {
  var tabBtn = function (key, label) {
    return '<button type="button" class="station-subtab' + (STAFF_CFG_TAB === key ? ' active' : '') + '" data-action="setStaffConfigTab" data-args=\'["' + key + '"]\'>' + esc(label) + '</button>';
  };
  var isRoot = hrActor().isRoot;
  if (STAFF_CFG_TAB === 'hraccounts' && !isRoot) STAFF_CFG_TAB = 'types';
  var body;
  if (STAFF_CFG_TAB === 'statuses') body = scRenderStatusesTab();
  else if (STAFF_CFG_TAB === 'params') body = scRenderParamsTab();
  else if (STAFF_CFG_TAB === 'hraccounts') body = scRenderHrAccountsTab();
  else body = scRenderTypesTab();
  $('viewStaffConfig').innerHTML =
    '<div class="station-subtabs">' +
      tabBtn('types', 'Loại nhân viên') + tabBtn('statuses', 'Trạng thái làm việc') + tabBtn('params', 'Tham số đăng nhập') +
      (isRoot ? tabBtn('hraccounts', 'Tài khoản nhân sự') : '') +
    '</div>' + body;
  if (STAFF_CFG_TAB === 'hraccounts') adminAccountSyncBar();
}

/* =====================================================================
   TAB 4 — TÀI KHOẢN NHÂN SỰ (nhóm HR; chỉ admin gốc)
   Luồng: Loại nhân viên HR > Quyền > Tài khoản. Loại HR = loại có quyền bảo vệ (Quản lý nhân sự / Quản lý tài khoản)
   và luôn kèm quyền Xem dữ liệu mọi trạm (adminSaveStaffRole tự thêm). Danh sách + thao tác tài khoản dùng lại acRenderListTab().
   ===================================================================== */
function scRenderHrAccountsTab() {
  ACCOUNT_SCOPE = 'hr';
  acSweepApprovals();
  AuthLog.sweep();
  var hrTypes = FleetStore.getStaffRoles().filter(function (r) { return r.active && hrIsProtectedRole(r.key); });
  var pending = acStaffWithoutAccount('hr').length;
  var step = function (n, title, done, desc, tab, btn) {
    return '<div class="sd-section-block" style="flex:1 1 200px;padding:12px;">' +
      '<div style="font-weight:800;">' + n + '. ' + esc(title) + ' ' + (done ? hrChip('Xong', 'green') : hrChip('Chưa', 'amber')) + '</div>' +
      '<div class="hint-inline" style="margin:4px 0 8px;">' + esc(desc) + '</div>' +
      (tab ? '<button type="button" class="btn btn-sm" data-action="setStaffConfigTab" data-args=\'["' + tab + '"]\'>' + esc(btn) + '</button>' : '') +
    '</div>';
  };
  return '<div class="hr-note">Tài khoản nhân sự (HR) có quyền <b>xem mọi trạm</b>. Làm lần lượt: loại nhân viên HR, quyền của loại, rồi tạo tài khoản.</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">' +
      step(1, 'Loại nhân viên HR', hrTypes.length > 0, hrTypes.length + ' loại (bảng bên dưới, tick quyền Quản lý nhân sự / tài khoản)', '', '') +
      step(2, 'Quyền cho nhân sự', hrTypes.some(function (r) { return r.permissions.length > 1; }), 'Gán quyền trong modal của loại HR; tự kèm Xem mọi trạm', '', '') +
      step(3, 'Tài khoản nhân sự', pending === 0 && hrTypes.length > 0, pending + ' nhân viên HR chưa có tài khoản (tạo hồ sơ ở Quản lý nhân viên)', '', '') +
    '</div>' +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span>Loại nhân viên HR</span>' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStaffRoleModal" data-args=\'["","hr"]\'>Thêm loại nhân viên HR</button>' +
      '</div>' +
      scRoleTableHtml(FleetStore.getStaffRoles().filter(function (r) { return hrIsProtectedRole(r.key); })) +
    '</div></div>' + acRenderListTab();
}

/* =====================================================================
   TAB 1 — LOẠI NHÂN VIÊN
   ===================================================================== */
/* Bảng loại nhân viên (dùng cho tab Loại nhân viên và khối loại HR ở tab Tài khoản nhân sự). */
function scRoleTableHtml(filtered) {
  var rows = filtered.length ? filtered.map(function (r, i) {
    return '<tr class="' + (r.active ? '' : 'sch-row-deleted') + '">' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(r.label) + '</b>' + (hrIsProtectedRole(r.key) ? ' ' + hrChip('Nhóm HR', 'red') : '') + (r.note ? '<div class="hint-inline">' + esc(r.note) + '</div>' : '') + '</td>' +
      '<td class="mono">' + esc(r.key) + '</td>' +
      '<td>' + esc(hrCrewRoleLabel(r.crewRole)) + '</td>' +
      '<td>' + (r.isSelf ? hrChip('Của mình', 'blue') : hrChip('Theo trạm', 'gray')) + '</td>' +
      '<td style="text-align:center;">' + (r.requiresLicense ? hrChip('Bắt buộc', 'amber') : '<span class="hint-inline">—</span>') + '</td>' +
      '<td style="text-align:center;">' + hrCountStaffOfRole(r.key) + '</td>' +
      '<td>' + (r.permissions.length ? r.permissions.length + ' quyền đã gán' : '<span class="hint-inline">Chưa gán quyền</span>') +
        (hrRoleHas(r.key, 'view_all_stations') ? '<div class="hr-chips">' + hrChip('Xem mọi trạm', 'amber') + '</div>' : '') +
      '</td>' +
      '<td class="col-status" style="text-align:center;">' + (r.active ? hrBadge('Đang dùng', 'dang-ban') : hrBadge('Ngừng dùng', 'da-huy')) + '</td>' +
      '<td class="row-actions">' + (hrCanEditRole(r) ?
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStaffRoleRowMenu" data-args=\'["__this__","' + esc(r.key) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' :
        hrChip('Chỉ admin gốc', 'gray')) +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="10" class="empty-state">Chưa có loại nhân viên nào phù hợp.</td></tr>';

  return '<div class="sd-table-wrap">' +
        '<table class="admin-table">' +
          '<thead><tr>' +
            '<th class="num">STT</th><th>Tên loại</th><th>Mã</th><th>Vai trò trên xe</th><th>Phạm vi xem</th><th style="text-align:center;">Bằng lái</th>' +
            '<th style="text-align:center;">Số nhân viên</th><th>Cụm phân quyền</th>' +
            '<th class="col-status" style="text-align:center;">Trạng thái</th><th class="th-actions">Thao tác</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';
}

function scRenderTypesTab() {
  // Loại thuộc nhóm HR nằm ở tab "Tài khoản nhân sự" — admin gốc ở đây thấy đúng như HR: chỉ loại thường.
  var roles = FleetStore.getStaffRoles().filter(function (r) { return !hrIsProtectedRole(r.key); });
  var f = STAFF_ROLE_FILTERS;
  var kw = f.search.toLowerCase();

  var filtered = roles.filter(function (r) {
    var permCount = r.permissions.length;
    if (f.permStatus === 'unassigned' && permCount) return false;
    if (f.permStatus === 'assigned' && !permCount) return false;
    if (f.usage === 'active' && !r.active) return false;
    if (f.usage === 'inactive' && r.active) return false;
    if (f.crew && (r.crewRole || '') !== (f.crew === '__none__' ? '' : f.crew)) return false;
    if (kw && (r.label + ' ' + r.key).toLowerCase().indexOf(kw) === -1) return false;
    return true;
  });

  return '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search">' +
        '<label>Tìm kiếm</label>' +
        '<input type="text" id="srSearch" value="' + esc(f.search) + '" placeholder="Tên loại nhân viên, mã..." data-input-action="adminStaffRoleFilterInput" data-args=\'["search","__this_value__"]\'>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Trạng thái phân quyền</label>' +
        '<select data-change-action="adminStaffRoleFilterInput" data-args=\'["permStatus","__this_value__"]\'>' +
          '<option value="">Tất cả</option>' +
          '<option value="unassigned"' + (f.permStatus === 'unassigned' ? ' selected' : '') + '>Chưa gán quyền</option>' +
          '<option value="assigned"' + (f.permStatus === 'assigned' ? ' selected' : '') + '>Đã gán quyền</option>' +
        '</select>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Trạng thái sử dụng</label>' +
        '<select data-change-action="adminStaffRoleFilterInput" data-args=\'["usage","__this_value__"]\'>' +
          '<option value="">Tất cả</option>' +
          '<option value="active"' + (f.usage === 'active' ? ' selected' : '') + '>Đang dùng</option>' +
          '<option value="inactive"' + (f.usage === 'inactive' ? ' selected' : '') + '>Ngừng dùng</option>' +
        '</select>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Vai trò trên xe</label>' +
        '<select data-change-action="adminStaffRoleFilterInput" data-args=\'["crew","__this_value__"]\'>' +
          '<option value="">Tất cả</option>' +
          HR_CREW_ROLES.map(function (c) { var v = c[0] || '__none__'; return '<option value="' + v + '"' + (f.crew === v ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn sd-btn" data-action="adminStaffRoleSearchClick">Tìm kiếm</button>' +
        '<button type="button" class="btn sd-btn" data-action="adminResetStaffRoleFilters">Đặt lại</button>' +
        (hrCanEditRole(null) ? '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStaffRoleModal" data-args=\'[""]\'>Thêm loại nhân viên</button>' : '') +
      '</div>' +
    '</div>' +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span>Loại nhân viên &amp; cụm phân quyền</span>' +
        '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + filtered.length + ' loại nhân viên</span>' +
      '</div>' +
      scRoleTableHtml(filtered) +
    '</div></div>';
}

function adminStaffRoleFilterInput(field, val) {
  if (!(field in STAFF_ROLE_FILTERS)) return;
  STAFF_ROLE_FILTERS[field] = val || '';
  adminKeepFocus(renderStaffConfigView);
}
// Nút "Tìm kiếm" cạnh ô lọc — lọc đã chạy live theo data-input-action nên nút này chỉ đọc lại ô hiện tại rồi render.
function adminStaffRoleSearchClick() {
  var el = $('srSearch');
  STAFF_ROLE_FILTERS.search = (el && el.value) || '';
  renderStaffConfigView();
}
function adminResetStaffRoleFilters() {
  STAFF_ROLE_FILTERS = { search: '', permStatus: '', usage: '', crew: '' };
  renderStaffConfigView();
}

function adminStaffRoleRowMenu(btn, key) {
  var r = hrRole(key);
  adminOpenRowMenu(btn, 'staff-role:' + key,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStaffRoleModal" data-args=\'["' + esc(key) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminToggleStaffRoleActive" data-args=\'["' + esc(key) + '"]\'>' + (r && r.active ? 'Ngừng dùng' : 'Mở lại') + '</button>');
}

// Trang vào mặc định theo vai trò trên xe (crew_role); không có thì ticketstaff.html.
var ROLE_DEFAULT_REDIRECT = { route_driver: 'taixe.html' };

// mode 'hr' = thêm loại nhóm HR (chỉ từ tab "Tài khoản nhân sự", admin gốc); sửa loại có sẵn thì tự suy từ loại.
function srIsHrMode(r, mode) { return mode === 'hr' || !!(r && hrIsProtectedRole(r.key)); }
function adminOpenStaffRoleModal(key, mode) {
  var r = key ? hrRole(key) : null;
  if (!hrRequireRoleEditor(r)) return;
  var isRoot = hrActor().isRoot;
  var hr = srIsHrMode(r, mode);
  if (hr && !isRoot) { showToast('Chỉ admin gốc thêm/sửa loại nhân viên HR.'); return; }
  var used = r ? hrCountStaffOfRole(r.key) : 0;
  openAdminModal(
    '<h3>' + (r ? 'Sửa loại nhân viên' : 'Thêm loại nhân viên') + (hr ? ' HR' : '') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStaffRole" data-args=\'["__event__","' + (r ? esc(r.key) : '') + '","' + (hr ? 'hr' : '') + '"]\'>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Tên loại nhân viên <span class="req">*</span></label><input id="srLabel" required value="' + (r ? esc(r.label) : '') + '" placeholder="VD: Nhân viên kho, Nhân viên vệ sinh..."></div>' +
        '<div class="fld"><label>Mã <span class="req">*</span></label><input id="srCode" required ' + (r ? 'readonly disabled' : '') + ' value="' + (r ? esc(r.key) : '') + '" placeholder="chữ thường, VD: kho_vanchuyen">' +
          '<span class="hint-inline">' + (r ? 'Mã không sửa sau khi tạo.' : 'Chữ thường, số, gạch dưới; 2-32 ký tự, bắt đầu bằng chữ. Không sửa được sau khi tạo.') + '</span></div>' +
      '</div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="srIsSelf" ' + (r && r.isSelf ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Chỉ xem dữ liệu của chính mình</label>' +
        '<span class="hint-inline">Dành cho tài xế, phụ xe: không có khu vực được xem (nếu đổi người sang loại này, khu vực đang gán bị đóng).</span></div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="srNeedLicense" ' + (r && r.requiresLicense ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Bắt buộc bằng lái (hạng và hạn)</label></div>' +
      '<div class="fld"><label>Vai trò trên xe</label>' +
        '<select id="srCrewRole" ' + (used ? 'disabled' : '') + '>' +
          HR_CREW_ROLES.map(function (c) { return '<option value="' + c[0] + '"' + ((r ? (r.crewRole || '') : '') === c[0] ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') +
        '</select>' +
        '<span class="hint-inline">' + (used ? 'Khóa vì loại đã có ' + used + ' nhân viên. Muốn đổi vai trò, tạo loại mới rồi chuyển người sang.' :
          'Loại được chọn làm tài xế tuyến, tài xế trung chuyển hay phụ xe khi xếp xe, phơi; cũng là cột chia tab Tài xế, Lơ xe ở Thống kê nhân sự. Không quyết định quyền.') + '</span>' +
      '</div>' +
      '<div class="fld"><label>Ghi chú</label><input id="srNote" value="' + (r ? esc(r.note || '') : '') + '" placeholder="Mô tả ngắn về loại nhân viên"></div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="srInactive" ' + (r && !r.active ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Ngừng dùng</label>' +
        '<span class="hint-inline">Thay nút Xóa: không chọn được cho nhân viên mới, nhân viên và lịch sử cũ vẫn giữ.</span></div>' +
      (used ? '<div class="hr-note">⚠ Loại này đang có <b>' + used + '</b> nhân viên. Sửa quyền hoặc hai cờ Chỉ xem của mình / Bắt buộc bằng lái bên dưới có hiệu lực NGAY cho tất cả những người đó (tính lúc dùng, không chụp bản sao).</div>' : '') +
      acPermissionsFieldHtml(r ? r.permissions : (hr ? ['manage_hr'] : []), { scope: 'perm', label: 'Phân quyền (có thể để trống = loại chưa gán quyền)', onChange: 'hrRefreshFnPreview', excludeProtected: !hr,
        hint: hr ? 'Loại HR phải có ít nhất 1 quyền Quản lý nhân sự / Quản lý tài khoản; tự kèm quyền Xem dữ liệu mọi trạm.'
          : (isRoot ? 'Loại nhân viên thường — không có quyền bảo vệ. Loại HR thêm ở tab "Tài khoản nhân sự".'
            : 'Bạn chỉ thêm được quyền nằm trong danh sách quyền loại của bạn được phép cấp; không có quyền bảo vệ (loại HR do admin gốc tạo).') }) +
      '<div class="hr-note" id="hrFnPreview"></div>' +
      (isRoot && hr ? acPermissionsFieldHtml(r ? r.grantable : [], { scope: 'grant', label: 'Quyền được phép cấp cho người khác', excludeProtected: true,
        hint: 'Khi HR gán hoặc đổi loại cho người khác, phần quyền được THÊM phải nằm trong danh sách này. Người cấp không cần tự có quyền đó. Không chứa quyền bảo vệ (Quản lý nhân sự, Quản lý tài khoản) để HR không tạo ra HR khác.' }) : '') +
      '<input type="hidden" id="srRedirect" value="' + (r ? esc(r.redirect || '') : '') + '">' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Huỷ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu</button>' +
      '</div>' +
    '</form>',
    true
  );
  hrRefreshFnPreview();
}

// Xem trước theo các quyền đang tick: số quyền, Xem mọi trạm, nhóm HR.
function hrRefreshFnPreview() {
  var box = $('hrFnPreview'); if (!box) return;
  var perms = acReadSelectedPermissions('perm');
  var isHr = perms.some(function (p) { var i = window.permInfo(p); return i && i.protects; });
  var viewAll = isHr || perms.indexOf('view_all_stations') !== -1;
  box.innerHTML = (perms.length ? '<b>' + perms.length + '</b> quyền đang chọn' : '<i>Chưa gán quyền nào (hợp lệ: loại 0 quyền)</i>') +
    (viewAll ? ' · <b>Xem dữ liệu mọi trạm</b>' : '') + (isHr ? ' · <b>Nhóm HR</b> (tự kèm Xem mọi trạm)' : '');
}

function adminSaveStaffRole(e, key, mode) {
  e.preventDefault();
  var before = key ? hrRole(key) : null;
  if (!hrRequireRoleEditor(before)) return;
  var isRoot = hrActor().isRoot;
  var hr = srIsHrMode(before, mode);
  var fields = {
    label: $('srLabel').value.trim(),
    key: key ? key : $('srCode').value.trim(),
    isSelf: $('srIsSelf').checked,
    requiresLicense: $('srNeedLicense').checked,
    crewRole: $('srCrewRole').value || null,
    note: $('srNote').value.trim(),
    active: !$('srInactive').checked,
    permissions: acReadSelectedPermissions('perm'),
    grantable: acReadSelectedPermissions('grant'),
    redirect: $('srRedirect').value || ROLE_DEFAULT_REDIRECT[$('srCrewRole').value] || 'ticketstaff.html'
  };
  if (!fields.label) { showToast('Nhập tên loại nhân viên.'); return; }
  if (!key && !/^[a-z][a-z0-9_]{1,31}$/.test(fields.key)) { showToast('Mã chỉ gồm chữ thường, số, gạch dưới (2-32 ký tự, bắt đầu bằng chữ).'); return; }
  // Khối "được phép cấp" chỉ có ở loại HR (người gán/đổi loại cho người khác); loại thường giữ nguyên giá trị cũ.
  if (!hr) fields.grantable = before ? before.grantable : [];
  // Admin gốc không được đưa quyền protects_holder vào danh sách cấp của HR.
  var bad = fields.grantable.filter(function (p) { var i = window.permInfo(p); return i && i.protects; });
  if (bad.length) { showToast('Không đưa quyền bảo vệ vào danh sách cấp: ' + hrPermLabels(bad)); return; }
  var isProt = function (p) { var i = window.permInfo(p); return i && i.protects; };
  if (isRoot) {
    // Loại HR phải có quyền bảo vệ (và luôn xem được mọi trạm); loại thường thì không được có.
    var hasProt = fields.permissions.some(isProt);
    if (hr && !hasProt) { showToast('Loại nhân viên HR cần ít nhất 1 quyền: Quản lý nhân sự hoặc Quản lý tài khoản.'); return; }
    if (!hr && hasProt) { showToast('Loại thường không chứa quyền Quản lý nhân sự / tài khoản — thêm loại HR ở tab "Tài khoản nhân sự".'); return; }
    if (hasProt && fields.permissions.indexOf('view_all_stations') === -1) fields.permissions.push('view_all_stations');
  } else {
    // HR: không đụng danh sách "được phép cấp" (giữ nguyên), không tạo quyền bảo vệ, quyền THÊM mới phải nằm trong trần của loại mình.
    fields.grantable = before ? before.grantable : [];
    var oldP = before ? before.permissions : [];
    var prot = fields.permissions.filter(isProt);
    if (prot.length) { showToast('Chỉ admin gốc gán quyền bảo vệ: ' + hrPermLabels(prot)); return; }
    var over = fields.permissions.filter(function (p) { return oldP.indexOf(p) === -1 && hrActorGrantable().indexOf(p) === -1; });
    if (over.length) { showToast('Vượt trần ủy quyền, bạn không được cấp: ' + hrPermLabels(over)); return; }
  }

  var used = key ? hrCountStaffOfRole(key) : 0;
  if (key && used && (fields.isSelf !== before.isSelf || fields.requiresLicense !== before.requiresLicense) &&
      !confirm('Loại này đang có ' + used + ' nhân viên. Đổi cờ Chỉ xem của mình / Bắt buộc bằng lái có hiệu lực ngay cho tất cả. Tiếp tục?')) return;
  if (key && used) {
    var oldP = before.permissions;
    var added = fields.permissions.filter(function (p) { return oldP.indexOf(p) === -1; });
    var removed = oldP.filter(function (p) { return fields.permissions.indexOf(p) === -1; });
    if ((added.length || removed.length) && !confirm('Loại này đang có ' + used + ' nhân viên. Đổi quyền sẽ áp dụng ngay cho tất cả. Tiếp tục?')) return;
  }

  var res = key ? FleetStore.updateStaffRole(key, fields) : FleetStore.addStaffRole(fields);
  if (!res.ok) { showToast(res.reason); return; }
  var id = (res.item && res.item.key) || key;

  var cmpKeys = ['label', 'isSelf', 'requiresLicense', 'crewRole', 'note', 'active'];
  var changes = key ? hrDiff(before, res.item, cmpKeys) : { created: { label: fields.label, isSelf: fields.isSelf, requiresLicense: fields.requiresLicense, crewRole: fields.crewRole } };
  hrLog(key ? 'update' : 'create', 'employee_types', id, (key ? 'Sửa' : 'Thêm') + ' loại nhân viên "' + fields.label + '"', changes);

  var oldPerm = before ? before.permissions : [], oldGrant = before ? before.grantable : [];
  [['employee_type_permissions', oldPerm, fields.permissions], ['employee_type_grantable_permissions', oldGrant, fields.grantable]].forEach(function (t) {
    var add = t[2].filter(function (p) { return t[1].indexOf(p) === -1; });
    var rem = t[1].filter(function (p) { return t[2].indexOf(p) === -1; });
    if (add.length) hrLog('grant', t[0], id, 'Cấp quyền cho loại "' + fields.label + '": ' + hrPermLabels(add), { added: add, affectedStaff: used });
    if (rem.length) hrLog('revoke', t[0], id, 'Bỏ quyền của loại "' + fields.label + '": ' + hrPermLabels(rem), { removed: rem, affectedStaff: used });
  });

  closeAdminModal();
  showToast(key ? 'Đã lưu loại nhân viên.' : 'Đã thêm loại nhân viên.');
  renderStaffConfigView();
}

function adminToggleStaffRoleActive(key) {
  var r = hrRole(key); if (!r) return;
  if (!hrRequireRoleEditor(r)) return;
  var used = hrCountStaffOfRole(key);
  var next = !r.active;
  if (!next && !confirm('Ngừng dùng loại "' + r.label + '"? Loại sẽ không chọn được cho nhân viên mới' + (used ? ' (' + used + ' nhân viên hiện tại vẫn giữ nguyên).' : '.'))) return;
  var res = FleetStore.updateStaffRole(key, { label: r.label, permissions: r.permissions, grantable: r.grantable, active: next, note: r.note, redirect: r.redirect, isSelf: r.isSelf, requiresLicense: r.requiresLicense, crewRole: r.crewRole });
  if (!res.ok) { showToast(res.reason); return; }
  hrLog('update', 'employee_types', key, (next ? 'Mở lại' : 'Ngừng dùng') + ' loại nhân viên "' + r.label + '"', { active: { old: r.active, new: next } });
  showToast(next ? 'Đã mở lại loại nhân viên.' : 'Đã ngừng dùng loại nhân viên.');
  renderStaffConfigView();
}

/* =====================================================================
   TAB 2 — TRẠNG THÁI LÀM VIỆC (employment_statuses)
   ===================================================================== */
function scRenderStatusesTab() {
  var list = FleetStore.getEmploymentStatuses();
  var staff = FleetStore.getStaff();
  var rows = list.map(function (st, i) {
    var n = staff.filter(function (s) { return hrStaffStatus(s) === st.code; }).length;
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td class="mono">' + esc(st.code) + '</td>' +
      '<td><b>' + esc(st.name) + '</b>' + (st.note ? '<div class="hint-inline">' + esc(st.note) + '</div>' : '') + '</td>' +
      '<td style="text-align:center;">' + (st.locksAccount ? hrChip('Khóa đăng nhập', 'red') : hrChip('Đăng nhập được', 'green')) + '</td>' +
      '<td style="text-align:center;">' + n + '</td>' +
      '<td style="text-align:center;">' + (st.isSystem ? hrChip('Hệ thống', 'gray') : '') + '</td>' +
      '<td class="row-actions"><button type="button" class="btn btn-sm" data-action="scOpenStatusModal" data-args=\'["' + esc(st.code) + '"]\'>Sửa</button></td>' +
    '</tr>';
  }).join('');
  return '<div class="hr-note"><b>working</b> luôn không khóa và <b>left</b> luôn khóa (cố định). <b>suspended</b> mặc định khóa. Khi đổi cờ khóa sang "Khóa", mọi phiên của nhân viên đang ở trạng thái đó bị thu hồi.</div>' +
    '<div class="sd-toolbar"><div class="sd-toolbar-actions" style="margin-left:auto;">' +
      '<button type="button" class="btn btn-primary sd-btn" data-action="scOpenStatusModal" data-args=\'[""]\'>Thêm trạng thái</button>' +
    '</div></div>' +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head">Trạng thái làm việc của nhân viên</div>' +
      '<div class="sd-table-wrap"><table class="admin-table"><thead><tr>' +
        '<th class="num">STT</th><th>Mã</th><th>Tên hiển thị</th><th style="text-align:center;">Khóa tài khoản</th><th style="text-align:center;">Số nhân viên</th><th style="text-align:center;">Loại</th><th class="th-actions">Thao tác</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div></div>';
}
function scOpenStatusModal(code) {
  var st = code ? FleetStore.employmentStatus(code) : null;
  var fixed = st && (st.code === 'working' || st.code === 'left');
  openAdminModal(
    '<h3>' + (st ? 'Sửa trạng thái làm việc' : 'Thêm trạng thái làm việc') + '</h3>' +
    '<form class="admin-form" data-submit-action="scSaveStatus" data-args=\'["__event__"' + (st ? ',"' + esc(st.code) + '"' : '') + ']\'>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Mã <span class="req">*</span></label><input id="esCode" required ' + (st ? 'readonly disabled' : '') + ' value="' + (st ? esc(st.code) : '') + '" placeholder="VD: maternity"></div>' +
        '<div class="fld"><label>Tên hiển thị <span class="req">*</span></label><input id="esName" required value="' + (st ? esc(st.name) : '') + '" placeholder="VD: Nghỉ thai sản"></div>' +
      '</div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="esLocks" ' + (!st || st.locksAccount ? 'checked' : '') + ' ' + (fixed ? 'disabled' : '') + ' style="min-width:auto;height:auto;"> Khóa tài khoản (nhân viên ở trạng thái này không đăng nhập được)</label>' +
        (fixed ? '<span class="hint-inline">Trạng thái hệ thống cố định, không đổi cờ này.</span>' : '') + '</div>' +
      '<div class="fld"><label>Thứ tự</label><input type="number" id="esSort" min="1" value="' + (st ? st.sortOrder : FleetStore.getEmploymentStatuses().length + 1) + '"></div>' +
      '<div class="fld"><label>Ghi chú</label><input id="esNote" value="' + (st ? esc(st.note || '') : '') + '"></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}
function scSaveStatus(e, code) {
  e.preventDefault();
  if (!hrRequireRoot()) return;
  var list = FleetStore.getEmploymentStatuses();
  var rec = { code: code || $('esCode').value.trim(), name: $('esName').value.trim(), sortOrder: parseInt($('esSort').value, 10) || 1, note: $('esNote').value.trim() };
  if (!code && !/^[a-z][a-z0-9_]{1,31}$/.test(rec.code)) { showToast('Mã chỉ gồm chữ thường, số, gạch dưới (2-32 ký tự).'); return; }
  if (!rec.name) { showToast('Nhập tên trạng thái.'); return; }
  if (!code && list.some(function (x) { return x.code === rec.code; })) { showToast('Mã trạng thái đã tồn tại.'); return; }
  var cur = code ? list.find(function (x) { return x.code === code; }) : null;
  var fixed = cur && (cur.code === 'working' || cur.code === 'left');
  rec.locksAccount = fixed ? cur.locksAccount : $('esLocks').checked;
  rec.isSystem = cur ? cur.isSystem : false;
  var affected = FleetStore.getStaff().filter(function (s) { return hrStaffStatus(s) === rec.code; });
  if (cur && !cur.locksAccount && rec.locksAccount && affected.length &&
      !confirm('Có ' + affected.length + ' nhân viên đang ở trạng thái này. Chuyển sang "Khóa" sẽ thu hồi phiên đăng nhập của họ. Tiếp tục?')) return;
  if (cur) list[list.indexOf(cur)] = rec; else list.push(rec);
  FleetStore.setEmploymentStatuses(list);
  var revoked = 0;
  if (cur && !cur.locksAccount && rec.locksAccount) {
    affected.forEach(function (s) { if (s.username) revoked += AuthLog.revokeAllOf(s.username, 'employee_status', hrActor().username); });
  }
  hrLog(cur ? 'update' : 'create', 'employment_statuses', rec.code, (cur ? 'Sửa' : 'Thêm') + ' trạng thái làm việc "' + rec.name + '"' + (revoked ? ' (thu hồi ' + revoked + ' phiên)' : ''),
    cur ? hrDiff(cur, rec, ['name', 'locksAccount', 'sortOrder', 'note']) : { created: rec });
  closeAdminModal(); showToast('Đã lưu trạng thái.'); renderStaffConfigView();
}

/* =====================================================================
   TAB 3 — THAM SỐ ĐĂNG NHẬP (M09 app_settings, bản demo)
   ===================================================================== */
var SC_PARAM_FIELDS = [
  ['idleTimeoutMinutes', 'idle_timeout_minutes', 'Phiên không hoạt động tối đa (phút)', 'Quá hạn thì phiên bị đánh dấu idle_timeout. Mặc định 60.'],
  ['sessionHours', 'session_hours', 'Hết hạn tuyệt đối của phiên (giờ)', 'Mặc định 12.'],
  ['logRetentionMonths', 'log_retention_months', 'Giữ nhật ký tối thiểu (tháng)', 'Đề xuất 12. Áp cho nhật ký thao tác và sự kiện đăng nhập.'],
  ['approvalValidMinutes', 'approval_valid_minutes', 'Hạn dùng yêu cầu đã duyệt (phút)', 'Kể từ lúc duyệt.'],
  ['approvalRejectCooldownMinutes', 'approval_reject_cooldown_minutes', 'Chờ sau khi bị từ chối (phút)', 'Trong thời gian này không tạo yêu cầu mới.'],
  ['maxPendingApprovalsPerUser', 'max_pending_approvals_per_user', 'Số yêu cầu chờ duyệt tối đa mỗi tài khoản', '']
];
function scRenderParamsTab() {
  var st = AuthLog.settings();
  var fields = SC_PARAM_FIELDS.map(function (f) {
    return '<div class="fld"><label>' + esc(f[2]) + ' <span class="mono" style="font-weight:600;color:var(--text-sub);">' + f[1] + '</span></label>' +
      '<input type="number" min="0" id="sp_' + f[0] + '" value="' + st[f[0]] + '">' + (f[3] ? '<span class="hint-inline">' + esc(f[3]) + '</span>' : '') + '</div>';
  }).join('');
  return '<div class="hr-note">Tham số của module Cài đặt hệ thống (M09). Bản demo lưu ở trình duyệt; khi có backend sẽ chuyển sang bảng cài đặt. Khóa nhập sai: <b>' + st.failedLoginLimit + ' lần sai trong ' + st.failedLoginWindowMinutes + ' phút</b>.</div>' +
    '<div class="sd-blocks"><div class="sd-section-block"><div class="sd-section-head">Tham số đăng nhập &amp; nhật ký</div>' +
    '<form class="admin-form" data-submit-action="scSaveParams" data-args=\'["__event__"]\'>' +
      '<div class="hr-grid-2">' + fields + '</div>' +
      '<div class="modal-actions"><button type="submit" class="btn btn-primary">Lưu tham số</button></div>' +
    '</form></div></div>' + scTicketPermsBlockHtml();
}
// Cờ bật kiểm quyền vé (ERD đặt vé B16): quyền do nhân sự cấp theo loại nhân viên, không seed mặc định, nên kiểm quyền
// mặc định TẮT. Bật khi đã cấp book_ticket / sell_ticket cho các loại nhân viên cần dùng, nếu không sẽ khóa nhân viên vé.
function scTicketPermsOn() {
  try { return localStorage.getItem(HN_ENFORCE_TICKET_PERMS_KEY) === '1'; } catch (e) { return false; }
}
function scTicketPermsBlockHtml() {
  var roles = FleetStore.getStaffRoles().filter(function (r) { return r.active; });
  var has = function (r) { return (r.permissions || []).some(function (p) { return p === 'book_ticket' || p === 'sell_ticket'; }); };
  var granted = roles.filter(has).map(function (r) { return esc(r.label); });
  return '<div class="sd-blocks"><div class="sd-section-block"><div class="sd-section-head">Kiểm quyền vé (Đặt vé / Bán vé / Đổi giá)</div>' +
    '<label style="display:flex;gap:8px;align-items:center;font-weight:600;"><input type="checkbox" id="sp_enforceTicketPerms"' + (scTicketPermsOn() ? ' checked' : '') +
      ' data-change-action="scToggleTicketPerms" data-args=\'["__this__"]\'> Bật kiểm quyền các thao tác vé</label>' +
    '<span class="hint-inline">Tắt: ai vào được trang vé cũng thao tác được như trước. Bật: mỗi thao tác kiểm khóa book_ticket / sell_ticket / change_price của loại nhân viên (admin gốc luôn có đủ). ' +
    (granted.length ? 'Loại đã được cấp quyền đặt / bán vé: <b>' + granted.join(', ') + '</b>.' : '<b>Chưa loại nhân viên nào được cấp quyền đặt / bán vé</b> — cấp ở tab Loại nhân viên trước khi bật.') + '</span></div></div>';
}
function scToggleTicketPerms(el) {
  var on = !!el.checked;
  if (!hrRequireRoot()) { el.checked = !on; return; }
  if (on) {
    var any = FleetStore.getStaffRoles().some(function (r) { return r.active && (r.permissions || []).some(function (p) { return p === 'book_ticket' || p === 'sell_ticket'; }); });
    if (!any) { el.checked = false; showToast('Chưa loại nhân viên nào có quyền đặt / bán vé — cấp quyền ở tab Loại nhân viên trước, nếu không toàn bộ nhân viên vé sẽ bị khóa.'); return; }
  }
  var before = { enforce: scTicketPermsOn() ? 1 : 0 };
  try { localStorage.setItem(HN_ENFORCE_TICKET_PERMS_KEY, on ? '1' : '0'); } catch (e) { showToast('Không lưu được cài đặt.'); el.checked = !on; return; }
  hrLog('update', 'app_settings', 'enforce_ticket_perms', (on ? 'Bật' : 'Tắt') + ' kiểm quyền thao tác vé', hrDiff(before, { enforce: on ? 1 : 0 }, ['enforce']));
  showToast(on ? 'Đã bật kiểm quyền vé.' : 'Đã tắt kiểm quyền vé.');
}
function scSaveParams(e) {
  e.preventDefault();
  if (!hrRequireRoot()) return;
  var before = AuthLog.settings(), patch = {};
  SC_PARAM_FIELDS.forEach(function (f) {
    var v = parseInt($('sp_' + f[0]).value, 10);
    patch[f[0]] = isNaN(v) || v < 0 ? before[f[0]] : v;
  });
  if (patch.idleTimeoutMinutes < 1 || patch.sessionHours < 1) { showToast('Thời gian phiên phải lớn hơn 0.'); return; }
  AuthLog.saveSettings(patch);
  hrLog('update', 'app_settings', 'login_params', 'Sửa tham số đăng nhập', hrDiff(before, patch, Object.keys(patch)));
  showToast('Đã lưu tham số.'); renderStaffConfigView();
}
