/* =========================================================
   6. QUẢN LÝ TÀI KHOẢN (ACCOUNT MANAGEMENT)
   Giao diện chuẩn Admin đồng bộ với hệ thống.
   Avatar hình tròn duy nhất dùng màu xám trung tính (#64748B / #475569)
   cho tất cả người dùng; giữ nguyên hệ thống màu sắc thương hiệu
   và trạng thái tiêu chuẩn của Admin.
   ========================================================= */

var ACCOUNT_FILTERS = { search: '', role: '', status: '' };
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
    if (a.role === 'call_center' || a.role === 'shuttle_dispatch') staffCount++;
  });

  var filtered = accounts.filter(function (a) {
    if (!a) return false;
    if (f.role && a.role !== f.role) return false;
    if (f.status === 'active' && a.active === false) return false;
    if (f.status === 'inactive' && a.active !== false) return false;

    if (f.search) {
      var hay = ((a.username || '') + ' ' + (a.fullName || '') + ' ' + (a.roleLabel || '') + ' ' + (a.redirect || '')).toLowerCase();
      if (hay.indexOf(f.search.toLowerCase()) === -1) return false;
    }
    return true;
  });

  var ICN_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var ICN_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var ICN_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  var ICN_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 5v14M5 12h14"/></svg>';

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
      '<td>' + roleBadge + '</td>' +
      '<td><span style="font-family:\'Roboto Mono\', monospace; font-size:12.5px; color:var(--text-sub);">' + esc(a.redirect || '—') + '</span></td>' +
      '<td><span style="font-family:\'Roboto Mono\', monospace; letter-spacing:2px; font-size:12px; color:var(--text-sub);">••••••</span></td>' +
      '<td class="col-status" style="text-align:center;">' +
        '<span class="status-badge ' + (isActive ? 'dang-ban' : 'chua-chi-dinh') + '">' +
          '<span class="status-dot"></span>' + (isActive ? 'Hoạt động' : 'Tạm khóa') +
        '</span>' +
      '</td>' +
      '<td class="th-actions" style="text-align:center;">' +
        '<div style="display:inline-flex; gap:6px; align-items:center;">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="adminOpenAccountModal" data-args=\'["' + esc(a.id) + '"]\'>' + ICN_EDIT + 'Sửa</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="adminOpenPassModal" data-args=\'["' + esc(a.id) + '"]\'>' + ICN_LOCK + 'Đổi MK</button>' +
          '<button type="button" class="btn btn-sm ' + (isActive ? 'btn-secondary' : 'btn-primary') + '" data-action="adminToggleAccountActive" data-args=\'["' + esc(a.id) + '"]\'>' + (isActive ? 'Khóa' : 'Mở') + '</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-action="adminDeleteAccount" data-args=\'["' + esc(a.id) + '"]\'>' + ICN_TRASH + '</button>' +
        '</div>' +
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

      '<!-- FILTER TOOLBAR -->' +
      '<div class="filter-toolbar" style="margin-bottom:20px;">' +
        '<div class="filter-field">' +
          '<label>Tìm kiếm tài khoản</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Tên đăng nhập, họ tên, vai trò..." data-input-action="adminAccountFilterInput" data-args=\'["search","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Vai trò</label>' +
          '<select data-change-action="adminAccountFilterInput" data-args=\'["role","__this_value__"]\'>' +
            '<option value="">Tất cả vai trò</option>' +
            '<option value="admin"' + (f.role === 'admin' ? ' selected' : '') + '>Quản trị viên hệ thống</option>' +
            '<option value="call_center"' + (f.role === 'call_center' ? ' selected' : '') + '>Nhân viên tổng đài</option>' +
            '<option value="shuttle_dispatch"' + (f.role === 'shuttle_dispatch' ? ' selected' : '') + '>Điều hành trung chuyển</option>' +
            '<option value="dispatch_manager"' + (f.role === 'dispatch_manager' ? ' selected' : '') + '>Điều hành bến xe</option>' +
            '<option value="accountant"' + (f.role === 'accountant' ? ' selected' : '') + '>Kế toán / Thu ngân</option>' +
            '<option value="driver"' + (f.role === 'driver' ? ' selected' : '') + '>Tài xế / Phụ xe</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Trạng thái</label>' +
          '<select data-change-action="adminAccountFilterInput" data-args=\'["status","__this_value__"]\'>' +
            '<option value="">Tất cả trạng thái</option>' +
            '<option value="active"' + (f.status === 'active' ? ' selected' : '') + '>Đang hoạt động</option>' +
            '<option value="inactive"' + (f.status === 'inactive' ? ' selected' : '') + '>Tạm khóa</option>' +
          '</select>' +
        '</div>' +
        '<button type="button" class="btn" data-action="adminResetAccountFilters">Đặt lại</button>' +
        '<div class="filter-spacer"></div>' +
        '<button type="button" class="btn btn-primary" data-action="adminOpenAccountModal" data-args=\'[""]\'>' + ICN_PLUS + 'Thêm tài khoản mới</button>' +
      '</div>' +

      '<!-- TABLE CARD -->' +
      '<div class="ref-card" style="padding:0; overflow:hidden;">' +
        '<div class="ref-card-header" style="padding:18px 22px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">' +
          '<div style="font-size:15px; font-weight:800; color:var(--black);">Danh sách tài khoản truy cập hệ thống</div>' +
          '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">Hiển thị ' + filtered.length + ' / ' + totalCount + ' tài khoản</div>' +
        '</div>' +
        '<div class="table-wrap" style="border:0; border-radius:0; box-shadow:none;">' +
          '<table class="admin-table">' +
            '<thead><tr>' +
              '<th style="width:60px; text-align:center;">STT</th>' +
              '<th style="width:200px;">Tài khoản & Người dùng</th>' +
              '<th style="width:180px;">Vai trò hệ thống</th>' +
              '<th style="width:160px;">Trang đích</th>' +
              '<th style="width:130px;">Mật khẩu</th>' +
              '<th class="col-status" style="text-align:center; width:130px;">Trạng thái</th>' +
              '<th class="th-actions" style="text-align:center; width:260px;">Thao tác</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function adminAccountFilterInput(field, val) {
  if (field in ACCOUNT_FILTERS) {
    ACCOUNT_FILTERS[field] = val || '';
    renderAccountsView();
  }
}

function adminResetAccountFilters() {
  ACCOUNT_FILTERS = { search: '', role: '', status: '' };
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

      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu tài khoản</button>' +
      '</div>' +
    '</form>'
  );
}

function adminAccountRoleChange() {
  var role = ($('acRole') || {}).value || '';
  var redInput = $('acRedirect');
  if (!redInput) return;

  var map = {
    'admin': 'admin.html',
    'call_center': 'ticketstaff.html',
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

  var roleLabels = {
    'admin': 'Quản trị viên hệ thống',
    'call_center': 'Nhân viên tổng đài',
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
