/* =========================================================
   6. QUẢN LÝ TÀI KHOẢN (ACCOUNT MANAGEMENT)
   Giao diện chuẩn Admin đồng bộ với hệ thống.
   Avatar hình tròn duy nhất dùng màu xám trung tính (#64748B / #475569)
   cho tất cả người dùng; giữ nguyên hệ thống màu sắc thương hiệu
   và trạng thái tiêu chuẩn của Admin.
   ========================================================= */

var ACCOUNT_FILTERS = { search: '', role: '', status: '', station: '' };
var HN_ADMIN_ACCOUNTS_KEY = 'hn_admin_accounts_v1';

function getAccountsList() {
  var list = lsRead(HN_ADMIN_ACCOUNTS_KEY, null);
  if (!Array.isArray(list) || list.length === 0) {
    var seed = (window.AUTH_ACCOUNTS || []).map(function (a) {
      return {
        id: 'acc_' + a.username,
        username: a.username,
        password: a.password || '123456',
        fullName: a.roleLabel || a.username,
        role: a.role,
        roleLabel: a.roleLabel,
        redirect: a.redirect || 'ticketstaff.html',
        active: true,
        createdAt: Date.now()
      };
    });
    list = seed;
    lsWrite(HN_ADMIN_ACCOUNTS_KEY, list);
  }
  return list;
}

function saveAccountsList(list) {
  lsWrite(HN_ADMIN_ACCOUNTS_KEY, list);
}

function renderAccountsView() {
  var accounts = getAccountsList();
  var f = ACCOUNT_FILTERS;

  var totalCount = accounts.length;
  var adminCount = 0, activeCount = 0, staffCount = 0;

  accounts.forEach(function (a) {
    if (!a) return;
    if (a.active !== false) activeCount++;
    if (a.role === 'admin') adminCount++;
    if (a.role === 'call_center' || a.role === 'ticket_office' || a.role === 'shuttle_dispatch') staffCount++;
  });

  var filtered = accounts.filter(function (a) {
    if (!a) return false;
    if (f.role && a.role !== f.role) return false;
    if (f.station && a.mainStationId !== f.station) return false;
    if (f.status === 'active' && a.active === false) return false;
    if (f.status === 'inactive' && a.active !== false) return false;

    if (f.search) {
      var hay = ((a.username || '') + ' ' + (a.fullName || '') + ' ' + (a.roleLabel || '') + ' ' + (a.redirect || '')).toLowerCase();
      if (hay.indexOf(f.search.toLowerCase()) === -1) return false;
    }
    return true;
  });

  var ICN_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 5v14M5 12h14"/></svg>';

  function acPermCountHtml(permissions) {
    var n = Array.isArray(permissions) ? permissions.length : 0;
    return '<div style="font-size:11px; font-weight:600; color:' + (n ? 'var(--text-sub)' : '#DC2626') + '; margin-top:5px;">' +
      (n ? n + ' quyền đã cấp' : 'Chưa gán quyền') +
    '</div>';
  }

  function tableRow(a, idx) {
    var isActive = a.active !== false;
    var initial = String(a.username || 'A').charAt(0).toUpperCase();

    // AVATAR DÙNG MÀU XÁM TRUNG TÍNH VÀ GIỮ NGUYÊN BADGE CHUẨN SYSTEM
    var roleBadge = '<span class="status-badge" style="background:var(--surface-2); color:var(--text-main); border:1px solid var(--border-gray);">' + esc(a.roleLabel || a.role) + '</span>';

    return '<tr class="' + (isActive ? '' : 'sch-row-deleted') + '">' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td>' +
        '<div style="display:flex; align-items:center; gap:10px;">' +
          '<div style="width:32px; height:32px; border-radius:50%; background:#64748B; color:#fff; font-weight:800; display:grid; place-items:center; font-size:13px;">' + initial + '</div>' +
          '<div>' +
            '<div style="font-weight:700; font-family:\'Roboto Mono\', monospace; color:var(--black);">' + esc(a.username) + '</div>' +
            '<div style="font-size:12px; color:var(--text-sub);">' + esc(a.fullName || a.username) + '</div>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' + roleBadge + acPermCountHtml(a.permissions) + '</td>' +
      '<td style="font-weight:600; color:var(--text-main);">' + esc(staffMainStationName(a.mainStationId) || '—') + '</td>' +
      '<td><span style="font-family:\'Roboto Mono\', monospace; font-size:12.5px; color:var(--text-sub);">' + esc(a.redirect || '—') + '</span></td>' +
      '<td><span style="font-family:\'Roboto Mono\', monospace; letter-spacing:2px; font-size:12px; color:var(--text-sub);">••••••</span></td>' +
      '<td class="col-status" style="text-align:center;">' +
        '<span class="status-badge ' + (isActive ? 'dang-ban' : 'chua-chi-dinh') + '">' +
          '<span class="status-dot"></span>' + (isActive ? 'Hoạt động' : 'Tạm khóa') +
        '</span>' +
      '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminAccountRowMenu" data-args=\'["__this__","' + esc(a.id) + '",' + (isActive ? 'true' : 'false') + ']\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
    '</tr>';
  }

  var rowsHtml = filtered.length
    ? filtered.map(tableRow).join('')
    : '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-sub);">Không tìm thấy tài khoản nào phù hợp bộ lọc.</td></tr>';

  $('viewAccounts').innerHTML =
    '<div class="accounts-shell">' +
      '<!-- OVERVIEW STATS METRICS -->' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng số tài khoản</div>' +
          '<div class="dir-stat-val">' + totalCount + ' <span class="ref-unit">tài khoản</span></div>' +
          '<div class="dir-stat-sub">Toàn hệ thống nhà xe</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Đang hoạt động</div>' +
          '<div class="dir-stat-val" style="color:#059669;">' + activeCount + ' <span class="ref-unit">tài khoản</span></div>' +
          '<div class="dir-stat-sub">Có thể đăng nhập sử dụng</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng đài & Vé</div>' +
          '<div class="dir-stat-val" style="color:var(--red);">' + staffCount + ' <span class="ref-unit">tài khoản</span></div>' +
          '<div class="dir-stat-sub">Bán vé & điều phối trung chuyển</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card ref-card-featured" style="min-height:auto;">' +
          '<div class="ref-featured-head">Quản trị viên</div>' +
          '<div class="dir-stat-val" style="font-size:26px;color:#fff;">' + adminCount + ' <span class="ref-unit" style="color:#fff;">tài khoản</span></div>' +
          '<div class="ref-featured-sub">Quyền quản trị cao nhất</div>' +
        '</div>' +
      '</div>' +

      '<div class="sd-toolbar">' +
        '<div class="filter-field sd-field-search">' +
          '<label>Tìm kiếm tài khoản</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Tên đăng nhập, họ tên, vai trò..." data-input-action="adminAccountFilterInput" data-args=\'["search","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field sd-field-region">' +
          '<label>Vai trò</label>' +
          '<select data-change-action="adminAccountFilterInput" data-args=\'["role","__this_value__"]\'>' +
            '<option value="">Tất cả vai trò</option>' +
            '<option value="admin"' + (f.role === 'admin' ? ' selected' : '') + '>Quản trị viên hệ thống</option>' +
            '<option value="call_center"' + (f.role === 'call_center' ? ' selected' : '') + '>Nhân viên tổng đài</option>' +
            '<option value="ticket_office"' + (f.role === 'ticket_office' ? ' selected' : '') + '>Nhân viên phòng vé</option>' +
            '<option value="shuttle_dispatch"' + (f.role === 'shuttle_dispatch' ? ' selected' : '') + '>Điều hành trung chuyển</option>' +
            '<option value="dispatch_manager"' + (f.role === 'dispatch_manager' ? ' selected' : '') + '>Điều hành bến xe</option>' +
            '<option value="accountant"' + (f.role === 'accountant' ? ' selected' : '') + '>Kế toán / Thu ngân</option>' +
            '<option value="driver"' + (f.role === 'driver' ? ' selected' : '') + '>Tài xế / Phụ xe</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field sd-field-region">' +
          '<label>Trạng thái</label>' +
          '<select data-change-action="adminAccountFilterInput" data-args=\'["status","__this_value__"]\'>' +
            '<option value="">Tất cả trạng thái</option>' +
            '<option value="active"' + (f.status === 'active' ? ' selected' : '') + '>Đang hoạt động</option>' +
            '<option value="inactive"' + (f.status === 'inactive' ? ' selected' : '') + '>Tạm khóa</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field sd-field-region">' +
          '<label>Trạm xe</label>' +
          '<select data-change-action="adminAccountFilterInput" data-args=\'["station","__this_value__"]\'>' +
            '<option value="">Tất cả trạm</option>' +
            FleetStore.getMainStations().map(function (st) { return '<option value="' + esc(st.id) + '"' + (f.station === st.id ? ' selected' : '') + '>' + esc(st.name) + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div class="sd-toolbar-actions">' +
          '<button type="button" class="btn sd-btn" data-action="adminResetAccountFilters">Đặt lại</button>' +
          '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenAccountModal" data-args=\'[""]\'>' + ICN_PLUS + 'Thêm tài khoản mới</button>' +
        '</div>' +
      '</div>' +

      '<div class="sd-blocks"><div class="sd-section-block">' +
        '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
          '<span>Danh sách tài khoản truy cập hệ thống</span>' +
          '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">Hiển thị ' + filtered.length + ' / ' + totalCount + ' tài khoản</span>' +
        '</div>' +
        '<div class="sd-table-wrap">' +
          '<table class="admin-table">' +
            '<thead><tr>' +
              '<th style="width:60px; text-align:center;">STT</th>' +
              '<th style="width:200px;">Tài khoản & Người dùng</th>' +
              '<th style="width:180px;">Vai trò hệ thống</th>' +
              '<th style="width:150px;">Trạm xe</th>' +
              '<th style="width:160px;">Trang đích</th>' +
              '<th style="width:130px;">Mật khẩu</th>' +
              '<th class="col-status" style="text-align:center; width:130px;">Trạng thái</th>' +
              '<th class="th-actions" style="width:120px;">Thao tác</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div></div>' +
    '</div>';
}

// Cột "Thao tác" — dropdown nổi giống bên Trạm Xe (dùng chung adminOpenRowMenu ở admin-station-directory.js).
function adminAccountRowMenu(btn, id, isActive) {
  adminOpenRowMenu(btn, 'account:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenAccountModal" data-args=\'["' + esc(id) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenPassModal" data-args=\'["' + esc(id) + '"]\'>Đổi mật khẩu</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminToggleAccountActive" data-args=\'["' + esc(id) + '"]\'>' + (isActive ? 'Khóa' : 'Mở khóa') + '</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteAccount" data-args=\'["' + esc(id) + '"]\'>Xoá</button>');
}

function adminAccountFilterInput(field, val) {
  if (field in ACCOUNT_FILTERS) {
    ACCOUNT_FILTERS[field] = val || '';
    renderAccountsView();
  }
}

function adminResetAccountFilters() {
  ACCOUNT_FILTERS = { search: '', role: '', status: '', station: '' };
  renderAccountsView();
}

/* Modal "Thêm mới / Chỉnh sửa tài khoản" */
function adminOpenAccountModal(id) {
  var list = getAccountsList();
  var acc = id ? list.find(function (a) { return a.id === id; }) : null;

  var isEdit = !!acc;
  var title = isEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới';

  var roles = [
    ['admin', 'Quản trị viên hệ thống', 'admin.html'],
    ['call_center', 'Nhân viên tổng đài (Bán vé)', 'ticketstaff.html'],
    ['ticket_office', 'Nhân viên phòng vé (Thu tiền)', 'ticketstaff.html'],
    ['shuttle_dispatch', 'Điều hành trung chuyển', 'ticketstaff.html'],
    ['dispatch_manager', 'Điều hành bến xe', 'dieuhanh.html'],
    ['accountant', 'Kế toán / Thu ngân', 'ketoan.html'],
    ['driver', 'Tài xế / Phụ xe', 'taixe.html']
  ];

  var curRole = acc ? acc.role : 'call_center';

  openAdminModal(
    '<h3>' + esc(title) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveAccount" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="acId" value="' + (acc ? esc(acc.id) : '') + '">' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Tên tài khoản (Username) <span class="req">*</span></label>' +
          '<input type="text" id="acUser" required ' + (isEdit ? 'readonly disabled' : '') + ' placeholder="VD: tongdai02" value="' + (acc ? esc(acc.username) : '') + '"></div>' +
        '<div class="fld"><label>Mật khẩu ' + (isEdit ? '' : '<span class="req">*</span>') + '</label>' +
          '<input type="password" id="acPass" ' + (isEdit ? '' : 'required') + ' placeholder="' + (isEdit ? 'Để trống nếu không đổi' : 'Nhập mật khẩu...') + '"></div>' +
      '</div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Họ tên người sử dụng</label>' +
          '<input type="text" id="acName" placeholder="VD: Nguyễn Văn A..." value="' + (acc ? esc(acc.fullName || '') : '') + '"></div>' +
        '<div class="fld"><label>Vai trò hệ thống <span class="req">*</span></label>' +
          '<select id="acRole" required data-change-action="adminAccountRoleChange">' +
            roles.map(function (r) {
              return '<option value="' + r[0] + '"' + (r[0] === curRole ? ' selected' : '') + '>' + r[1] + '</option>';
            }).join('') +
          '</select></div>' +
      '</div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Trang đích khi đăng nhập</label>' +
          '<input type="text" id="acRedirect" placeholder="ticketstaff.html" value="' + (acc ? esc(acc.redirect || '') : 'ticketstaff.html') + '"></div>' +
        '<div class="fld"><label>Trạng thái tài khoản</label>' +
          '<select id="acActive">' +
            '<option value="1"' + (!acc || acc.active !== false ? ' selected' : '') + '>Đang hoạt động</option>' +
            '<option value="0"' + (acc && acc.active === false ? ' selected' : '') + '>Tạm khóa</option>' +
          '</select></div>' +
      '</div>' +

      '<div class="fld"><label>Trạm xe</label><select id="acStation">' + staffMainStationOptionsHtml(acc ? acc.mainStationId : '') + '</select></div>' +

      acPermissionsFieldHtml(acc ? acc.permissions : []) +

      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu tài khoản</button>' +
      '</div>' +
    '</form>',
    true
  );
}

/* Khung chọn quyền theo chức năng (KHÔNG theo vai trò/role) — danh mục nguồn ở
   window.PERMISSION_GROUPS (auth/permissions.js). Mỗi nhóm có 1 checkbox "chọn cả nhóm"
   để bật/tắt nhanh toàn bộ quyền con — xem acToggleGroupPerms. */
function acPermissionsFieldHtml(selected) {
  selected = Array.isArray(selected) ? selected : [];
  var groups = window.PERMISSION_GROUPS || [];
  return '<div class="fld">' +
    '<label>Phân quyền theo chức năng</label>' +
    '<div class="acc-perm-groups">' +
      groups.map(function (g) {
        var allChecked = g.items.length > 0 && g.items.every(function (it) { return selected.indexOf(it.key) !== -1; });
        return '<div class="acc-perm-group">' +
          '<label class="acc-perm-check acc-perm-group-head">' +
            '<input type="checkbox"' + (allChecked ? ' checked' : '') + ' data-change-action="acToggleGroupPerms" data-args=\'["' + g.key + '","__this__"]\'>' +
            '<b>' + esc(g.label) + '</b>' +
          '</label>' +
          '<div class="acc-perm-group-items" data-perm-group="' + g.key + '">' +
            g.items.map(function (it) {
              return '<label class="acc-perm-check">' +
                '<input type="checkbox" value="' + esc(it.key) + '"' + (selected.indexOf(it.key) !== -1 ? ' checked' : '') + '>' +
                '<span>' + esc(it.label) + '</span>' +
              '</label>';
            }).join('') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';
}

function acToggleGroupPerms(groupKey, el) {
  var checked = !!(el && el.checked);
  var container = document.querySelector('.acc-perm-group-items[data-perm-group="' + groupKey + '"]');
  if (!container) return;
  container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = checked; });
}

/* Đọc danh sách quyền đang tick trong form đang mở (chỉ tính checkbox quyền con — bỏ qua
   checkbox "chọn cả nhóm" vì nó không mang value permission key). */
function acReadSelectedPermissions() {
  return Array.prototype.map.call(
    document.querySelectorAll('.acc-perm-group-items input[type="checkbox"]:checked'),
    function (cb) { return cb.value; }
  );
}

function adminAccountRoleChange() {
  var role = ($('acRole') || {}).value || '';
  var redInput = $('acRedirect');
  if (!redInput) return;

  var map = {
    'admin': 'admin.html',
    'call_center': 'ticketstaff.html',
    'ticket_office': 'ticketstaff.html',
    'shuttle_dispatch': 'ticketstaff.html',
    'dispatch_manager': 'dieuhanh.html',
    'accountant': 'ketoan.html',
    'driver': 'taixe.html'
  };
  if (map[role]) redInput.value = map[role];
}

function adminSaveAccount(e) {
  if (e && e.preventDefault) e.preventDefault();
  var id = ($('acId') || {}).value || '';
  var username = ($('acUser') || {}).value || '';
  var password = ($('acPass') || {}).value || '';
  var fullName = ($('acName') || {}).value || '';
  var role = ($('acRole') || {}).value || 'call_center';
  var redirect = ($('acRedirect') || {}).value || 'ticketstaff.html';
  var active = ($('acActive') || {}).value === '1';
  var mainStationId = ($('acStation') || {}).value || '';
  var permissions = acReadSelectedPermissions();

  var roleLabels = {
    'admin': 'Quản trị viên hệ thống',
    'call_center': 'Nhân viên tổng đài',
    'ticket_office': 'Nhân viên phòng vé',
    'shuttle_dispatch': 'Điều hành trung chuyển',
    'dispatch_manager': 'Điều hành bến xe',
    'accountant': 'Kế toán / Thu ngân',
    'driver': 'Tài xế / Phụ xe'
  };

  var list = getAccountsList();

  if (id) {
    var acc = list.find(function (a) { return a.id === id; });
    if (acc) {
      if (password.trim()) acc.password = password.trim();
      acc.fullName = fullName || acc.username;
      acc.role = role;
      acc.roleLabel = roleLabels[role] || role;
      acc.redirect = redirect;
      acc.active = active;
      acc.mainStationId = mainStationId;
      acc.permissions = permissions;
    }
  } else {
    if (!username.trim()) { showToast('Nhập tên tài khoản.'); return; }
    if (!password.trim()) { showToast('Nhập mật khẩu.'); return; }

    if (list.some(function (a) { return a.username.toLowerCase() === username.trim().toLowerCase(); })) {
      showToast('Tên tài khoản ' + username + ' đã tồn tại.');
      return;
    }

    var newId = 'acc_' + Date.now();
    list.push({
      id: newId,
      username: username.trim(),
      password: password.trim(),
      fullName: fullName || username.trim(),
      role: role,
      roleLabel: roleLabels[role] || role,
      redirect: redirect,
      active: active,
      mainStationId: mainStationId,
      permissions: permissions,
      createdAt: Date.now()
    });
  }

  saveAccountsList(list);

  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: id ? 'update' : 'create', entity: 'account', summary: (id ? 'Cập nhật' : 'Tạo mới') + ' tài khoản ' + username });
  }

  showToast('Đã lưu thông tin tài khoản.');
  closeAdminModal();
  renderAccountsView();
}

/* Modal "Đổi mật khẩu" */
function adminOpenPassModal(id) {
  var list = getAccountsList();
  var acc = list.find(function (a) { return a.id === id; });
  if (!acc) return;

  openAdminModal(
    '<h3>Đổi mật khẩu tài khoản ' + esc(acc.username) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSavePassModal" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="pwId" value="' + esc(acc.id) + '">' +

      '<div class="fld"><label>Mật khẩu mới <span class="req">*</span></label>' +
        '<input type="password" id="pwNew" required placeholder="Nhập mật khẩu mới..."></div>' +

      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button>' +
        '<button type="submit" class="btn btn-primary">Đổi mật khẩu</button>' +
      '</div>' +
    '</form>'
  );
}

function adminSavePassModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  var id = ($('pwId') || {}).value || '';
  var pass = ($('pwNew') || {}).value || '';

  if (!pass.trim()) { showToast('Vui lòng nhập mật khẩu mới.'); return; }

  var list = getAccountsList();
  var acc = list.find(function (a) { return a.id === id; });
  if (!acc) return;

  acc.password = pass.trim();
  saveAccountsList(list);

  showToast('Đã đổi mật khẩu cho tài khoản ' + acc.username + '.');
  closeAdminModal();
  renderAccountsView();
}

function adminToggleAccountActive(id) {
  var list = getAccountsList();
  var acc = list.find(function (a) { return a.id === id; });
  if (!acc) return;

  acc.active = !(acc.active !== false);
  saveAccountsList(list);

  showToast((acc.active ? 'Đã kích hoạt' : 'Đã tạm khóa') + ' tài khoản ' + acc.username + '.');
  renderAccountsView();
}

function adminDeleteAccount(id) {
  var list = getAccountsList();
  var acc = list.find(function (a) { return a.id === id; });
  if (!acc) return;

  if (acc.username === 'quantri01') {
    showToast('Không thể xóa tài khoản Quản trị viên mặc định.');
    return;
  }

  if (!confirm('Bạn có chắc chắn muốn xóa tài khoản "' + acc.username + '"?')) return;

  list = list.filter(function (a) { return a.id !== id; });
  saveAccountsList(list);

  showToast('Đã xóa tài khoản ' + acc.username + '.');
  renderAccountsView();
}
