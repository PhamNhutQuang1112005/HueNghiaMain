/* =========================================================
   6. QUẢN LÝ TÀI KHOẢN (HR v3.1) — bảng users + user_sessions + user_devices + login_approvals
   Chuỗi quyền: tài khoản -> nhân viên -> loại nhân viên -> quyền của loại. Trang này CHỈ XEM quyền (đổi quyền = đổi loại ở trang
   Nhân viên; sửa quyền trong một loại ở Cấu hình nhân sự). Tài khoản chỉ tạo SAU khi có nhân viên (chọn nhân viên, không nhập họ tên/loại).
   Không xoá tài khoản: khóa kèm lý do. Admin gốc (role 'admin') chỉ đọc; chỉ admin gốc đổi username.
   Hai tab: "Danh sách tài khoản" và "Duyệt đăng nhập" (chờ duyệt / thiết bị / lịch sử duyệt).
   Phiên, thiết bị, yêu cầu duyệt do auth/auth-log.js ghi (xem chú thích ở đó về phần demo chưa chặn).
   ========================================================= */
var ACCOUNT_TAB = 'list';   // 'list' | 'approvals'
var APPROVAL_TAB = 'pending'; // 'pending' | 'devices' | 'history'
var ACCOUNT_FILTERS = { search: '', role: '', status: '', station: '', region: '' };
var APPROVAL_FILTERS = { search: '', status: '', dateFrom: '', dateTo: '' };
var ACCOUNT_SEL = {};   // id tài khoản đang tick (khóa / mở khóa hàng loạt)
// HN_ADMIN_ACCOUNTS_KEY: shared/js/storage-keys.js. getAccountsList()/saveAccountsList(): auth/accounts.js — KHÔNG định nghĩa lại ở đây.

/* ---------------------------------------------------------
   Quyền & trạng thái đăng nhập
   --------------------------------------------------------- */
function acHasPerm(perm) {
  var me = hrActor();
  if (me.isRoot) return true;
  var st = FleetStore.getStaff().find(function (s) { return s.username === me.username; });
  return !!(st && hrRoleHas(st.role, perm));
}
// Quy tắc "AI SỬA AI" cho 1 tài khoản đích: cần quyền perm (mặc định manage_accounts; null = không kiểm, cho hàm tự kiểm quyền riêng như revoke_sessions),
// không tự sửa mình; nhóm được bảo vệ chỉ admin gốc.
function acCheckManage(acc, perm) {
  var me = hrActor();
  if (me.isRoot) return { ok: true };
  if (perm !== null && !acHasPerm(perm || 'manage_accounts')) return { ok: false, reason: 'Bạn không có quyền quản lý tài khoản.' };
  if (hrIsRootAccount(acc)) return { ok: false, reason: 'Chỉ admin gốc xử lý tài khoản admin gốc.' };
  if (acc.username === me.username) return { ok: false, reason: 'Không ai tự thao tác lên chính mình (trừ tự đổi mật khẩu).' };
  var st = hrStaffOfAccount(acc);
  if (st && hrIsProtectedStaff(st)) return { ok: false, reason: 'Tài khoản thuộc nhóm được bảo vệ (HR/admin) — chỉ admin gốc xử lý.' };
  return { ok: true };
}

// account_login_state theo thứ tự ưu tiên: employee_locked, manual_locked, failed_login_locked, must_change_password, ok.
function acLoginState(acc) {
  var reasons = [];
  var root = hrIsRootAccount(acc);
  var st = hrStaffOfAccount(acc);
  if (!root && st && hrStatusLocks(hrStaffStatus(st))) reasons.push({ code: 'employee_locked', label: 'Nhân viên ' + hrStatusName(hrStaffStatus(st)).toLowerCase(), tone: 'da-huy' });
  if (acc.active === false) reasons.push({ code: 'manual_locked', label: 'Đã khóa thủ công', tone: 'da-huy' });
  if (AuthLog.isFailedLoginLocked(acc.username)) reasons.push({ code: 'failed_login_locked', label: 'Khóa do nhập sai', tone: 'da-huy' });
  if (acc.mustChangePassword) reasons.push({ code: 'must_change_password', label: 'Phải đổi mật khẩu', tone: 'da-chi-dinh' });
  if (!reasons.length) reasons.push({ code: 'ok', label: 'Hoạt động', tone: 'dang-ban' });
  return { main: reasons[0], reasons: reasons };
}

function acPendingApprovals(username) {
  return AuthLog.getApprovals().filter(function (a) { return a.status === 'pending' && (!username || a.username === username); });
}
function acSweepApprovals() {
  var now = Date.now(), list = AuthLog.getApprovals(), ch = false;
  list.forEach(function (a) {
    if ((a.status === 'pending' || a.status === 'approved') && a.expiresAt && now > a.expiresAt) { a.status = 'expired'; ch = true; }
  });
  if (ch) AuthLog.saveApprovals(list);
}

// Cảnh báo (tính lúc xem, không lưu).
function acWarnings(acc) {
  var w = [], st = hrStaffOfAccount(acc);
  if (hrIsRootAccount(acc)) return w;
  if (!st) { w.push('Chưa gắn với hồ sơ nhân viên'); return w; }
  var role = hrRole(st.role);
  var scope = hrScope(st);
  if (hrIsProtectedStaff(st) && !scope.viewAll) w.push('Nhóm HR chưa có quyền Xem dữ liệu mọi trạm (sửa loại ở Cấu hình nhân sự)');
  if (!scope.viewAll && !scope.self && !scope.names.length) w.push('Chưa có trạm xem được (đăng nhập được nhưng không thấy dữ liệu trạm nào)');
  (st.regions || []).forEach(function (rk) { if (!hrStationsOfRegion(rk).length) w.push('Khu vực "' + hrRegionName(rk) + '" chưa có trạm active'); });
  if (role && !role.active) w.push('Loại nhân viên đã ngừng dùng');
  if (role && !role.permissions.length) w.push('Loại nhân viên chưa có quyền nào');
  var status = hrStaffStatus(st);
  if (status === 'suspended' && !hrStatusLocks('suspended')) w.push('Đang tạm ngưng mà trạng thái này không khóa đăng nhập');
  var p = acPendingApprovals(acc.username).length;
  if (p) w.push(p + ' yêu cầu duyệt đăng nhập đang chờ');
  return w;
}

/* ---------------------------------------------------------
   Khung chọn quyền (dùng chung với Cấu hình nhân sự)
   opts: { scope: 'perm'|'grant', label, hint, excludeProtected, readonly, onChange }
   --------------------------------------------------------- */
function acPermissionsFieldHtml(selected, opts) {
  selected = Array.isArray(selected) ? selected : [];
  opts = opts || {};
  var scope = opts.scope || 'perm';
  var groups = (window.PERMISSION_GROUPS || []).map(function (g) {
    return { key: g.key, label: g.label, items: g.items.filter(function (it) { return !(opts.excludeProtected && it.protects); }) };
  }).filter(function (g) { return g.items.length; });
  var changeAttr = opts.onChange ? ' data-change-action="' + opts.onChange + '"' : '';
  return '<div class="fld">' +
    '<label>' + esc(opts.label || 'Phân quyền') + '</label>' +
    (opts.hint ? '<span class="hint-inline">' + esc(opts.hint) + '</span>' : '') +
    '<div class="acc-perm-groups">' +
      groups.map(function (g) {
        var allChecked = g.items.every(function (it) { return selected.indexOf(it.key) !== -1; });
        return '<div class="acc-perm-group">' +
          '<label class="acc-perm-check acc-perm-group-head">' +
            (opts.readonly ? '' : '<input type="checkbox"' + (allChecked ? ' checked' : '') + ' data-change-action="acToggleGroupPerms" data-args=\'["' + scope + '","' + g.key + '","__this__"]\'>') +
            '<b>' + esc(g.label) + '</b>' +
          '</label>' +
          '<div class="acc-perm-group-items" data-scope="' + scope + '" data-perm-group="' + g.key + '">' +
            g.items.map(function (it) {
              if (opts.readonly) {
                return selected.indexOf(it.key) !== -1 ? '<div class="acc-perm-check"><span>✓ ' + esc(it.label) + '</span></div>' : '';
              }
              return '<label class="acc-perm-check">' +
                '<input type="checkbox" value="' + esc(it.key) + '"' + (selected.indexOf(it.key) !== -1 ? ' checked' : '') + changeAttr + '>' +
                '<span>' + esc(it.label) + (it.protects ? ' <em>(quyền bảo vệ)</em>' : '') + '</span>' +
              '</label>';
            }).join('') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';
}
function acToggleGroupPerms(scope, groupKey, el) {
  var checked = !!(el && el.checked);
  var container = document.querySelector('.acc-perm-group-items[data-scope="' + scope + '"][data-perm-group="' + groupKey + '"]');
  if (!container) return;
  container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = checked; });
  if (scope === 'perm' && typeof hrRefreshFnPreview === 'function') hrRefreshFnPreview();
}
function acReadSelectedPermissions(scope) {
  scope = scope || 'perm';
  return Array.prototype.map.call(
    document.querySelectorAll('.acc-perm-group-items[data-scope="' + scope + '"] input[type="checkbox"]:checked'),
    function (cb) { return cb.value; }
  );
}

/* =====================================================================
   RENDER
   ===================================================================== */
/* Hai khung dùng chung một bộ code, phân biệt bằng ACCOUNT_SCOPE:
     'normal' = trang Tài khoản (nhân viên thường; KHÔNG hiện, KHÔNG tạo tài khoản của nhóm HR)
     'hr'     = tab Tài khoản nhân sự trong Cấu hình nhân sự (admin-staff-config.js; chỉ tài khoản của nhân viên thuộc nhóm được bảo vệ; CHỈ ADMIN GỐC tạo) */
var ACCOUNT_SCOPE = 'normal';
function acViewId() { return ACCOUNT_SCOPE === 'hr' ? 'viewStaffConfig' : 'viewAccounts'; }
function renderAccountsView() { ACCOUNT_SCOPE = 'normal'; acRender(); }
// Tài khoản này thuộc khung nào: HR (nhân viên được bảo vệ, không phải admin gốc) hay thường.
function acIsHrAccount(acc) {
  if (hrIsRootAccount(acc)) return false;
  var st = hrStaffOfAccount(acc);
  return !!(st && hrIsProtectedStaff(st));
}

function acRender() {
  if (ACCOUNT_SCOPE === 'hr') { renderStaffConfigView(); return; }   // tab Tài khoản nhân sự tự dựng lại cả khung + thanh chọn nhiều
  acSweepApprovals();
  AuthLog.sweep();
  var pending = acPendingApprovals().length;
  var tabBtn = function (key, label) {
    return '<button type="button" class="station-subtab' + (ACCOUNT_TAB === key ? ' active' : '') + '" data-action="setAccountTab" data-args=\'["' + key + '"]\'>' + label + '</button>';
  };
  $('viewAccounts').innerHTML =
    '<div class="station-subtabs">' + tabBtn('list', 'Danh sách tài khoản') +
      tabBtn('approvals', 'Duyệt đăng nhập' + (pending ? ' <span class="hr-count-badge">' + pending + '</span>' : '')) +
    '</div>' +
    (ACCOUNT_TAB === 'approvals' ? acRenderApprovalsTab() : acRenderListTab());
  if (ACCOUNT_TAB === 'list') adminAccountSyncBar();
}
function setAccountTab(tab) { ACCOUNT_TAB = tab; acRender(); }

function acRoleFilterOptions() {
  return FleetStore.getStaffRoles().map(function (r) { return [r.key, r.label]; });
}

function acRenderListTab() {
  var accounts = getAccountsList();
  var f = ACCOUNT_FILTERS;
  var kw = f.search.toLowerCase();

  var hrScopeOn = ACCOUNT_SCOPE === 'hr';
  accounts = accounts.filter(function (a) { return a && (hrScopeOn ? acIsHrAccount(a) : !acIsHrAccount(a)); });
  var rowsData = accounts.map(function (a) {
    return { acc: a, staff: hrStaffOfAccount(a) };
  }).filter(function (x) {
    var a = x.acc, st = x.staff;
    var roleKey = hrIsRootAccount(a) ? 'admin' : (st ? st.role : a.role);
    if (f.role && roleKey !== f.role) return false;
    var state = acLoginState(a).main.code;
    if (f.status === 'ok' && state !== 'ok') return false;
    if (f.status === 'locked' && state !== 'employee_locked' && state !== 'manual_locked' && state !== 'failed_login_locked') return false;
    if (f.status === 'must_change' && !a.mustChangePassword) return false;
    if (f.station === '__none__' || f.region === '__none__') {
      if (st && ((st.stations || []).length || (st.regions || []).length)) return false;
    } else {
      if (f.station && !(st && (st.stations || []).indexOf(f.station) !== -1)) return false;
      if (f.region && !(st && (st.regions || []).indexOf(f.region) !== -1)) return false;
    }
    if (kw) {
      var hay = ((a.username || '') + ' ' + (st ? st.name : (a.fullName || '')) + ' ' + (hrIsRootAccount(a) ? 'quản trị gốc' : hrRoleLabel(roleKey))).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    return true;
  });

  var visIds = {}; rowsData.forEach(function (x) { visIds[x.acc.id] = true; });
  Object.keys(ACCOUNT_SEL).forEach(function (id) { if (!visIds[id]) delete ACCOUNT_SEL[id]; });

  var ICN_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 5v14M5 12h14"/></svg>';

  var rowsHtml = rowsData.length ? rowsData.map(function (x, idx) {
    var a = x.acc, st = x.staff, root = hrIsRootAccount(a);
    var state = acLoginState(a);
    var sel = !!ACCOUNT_SEL[a.id];
    var live = AuthLog.liveSession(a.username);
    var dev = live ? AuthLog.getDevices().find(function (d) { return d.id === live.deviceId; }) : null;
    var pend = acPendingApprovals(a.username).length;
    var initial = String(a.username || 'A').charAt(0).toUpperCase();
    var permN = root ? null : hrRolePerms(st ? st.role : a.role).length;
    var warns = acWarnings(a);
    return '<tr data-row-key="' + esc(a.id) + '" class="' + (state.main.code === 'ok' || state.main.code === 'must_change_password' ? '' : 'sch-row-deleted') + (sel ? ' selected-row' : '') + '">' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td><div style="display:flex; align-items:center; gap:10px;">' +
        '<div style="width:32px; height:32px; border-radius:50%; background:#64748B; color:#fff; font-weight:800; display:grid; place-items:center; font-size:13px;">' + esc(initial) + '</div>' +
        '<div><div style="font-weight:700; font-family:\'Roboto Mono\', monospace; color:var(--black);">' + esc(a.username) + '</div>' +
        '<div style="font-size:12px; color:var(--text-sub);">' + esc(st ? st.name : (a.fullName || a.username)) + '</div></div></div></td>' +
      '<td>' + (root ? hrChip('Quản trị gốc', 'red') : '<span class="status-badge" style="background:var(--surface-2); color:var(--text-main); border:1px solid var(--border-gray);">' + esc(hrRoleLabel(st ? st.role : a.role)) + '</span>') + '</td>' +
      '<td>' + (root ? '<span class="hint-inline">Mọi quyền</span>' : (permN ? '<span class="hr-link" role="button" tabindex="0" data-action="acViewPermissions" data-args=\'["' + esc(a.id) + '"]\'>' + permN + ' quyền</span>' : '<span class="hint-inline">Chưa gán quyền</span>')) + '</td>' +
      '<td style="font-weight:600; color:var(--text-main);">' + (root || (st && hrScope(st).viewAll) ? hrChip('Mọi trạm', 'amber') : (st ? ((smStationSummary(st) || '—') + (smRegionSummary(st) ? '<div class="hint-inline">KV: ' + smRegionSummary(st) + '</div>' : '')) : '—')) + '</td>' +
      '<td>' + (dev ? '<div style="font-weight:600;">' + esc(dev.label) + '</div><div class="hint-inline">từ ' + esc(fmtStamp(live.createdAt)) + '</div>' : '<span class="hint-inline">Không có phiên</span>') +
        (pend ? '<div><span class="hr-link" role="button" tabindex="0" data-action="acOpenApprovalsFor" data-args=\'["' + esc(a.username) + '"]\'>' + hrChip(pend + ' yêu cầu chờ duyệt', 'amber') + '</span></div>' : '') + '</td>' +
      '<td>' + (a.lastLoginAt ? esc(fmtStamp(a.lastLoginAt)) : '<span class="hint-inline">Chưa đăng nhập</span>') +
        (a.mustChangePassword ? '<div>' + hrChip('Phải đổi mật khẩu', 'amber') + '</div>' : '') + '</td>' +
      '<td class="col-status" style="text-align:center;">' + hrBadge(state.main.label, state.main.tone) +
        (state.reasons.length > 1 ? '<div class="hint-inline">+ ' + state.reasons.slice(1).map(function (r) { return esc(r.label); }).join(', ') + '</div>' : '') +
        (a.active === false && a.lockReason ? '<div class="hint-inline" title="' + esc(a.lockReason) + '">Lý do: ' + esc(a.lockReason.length > 28 ? a.lockReason.slice(0, 28) + '…' : a.lockReason) + '</div>' : '') + '</td>' +
      '<td style="max-width:220px;">' + hrWarnHtml(warns) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminAccountRowMenu" data-args=\'["__this__","' + esc(a.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check">' + (root ? '' : '<input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminAccountToggleRow" data-args=\'["' + esc(a.id) + '","__this__"]\'>') + '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--text-sub);">Không tìm thấy tài khoản nào phù hợp bộ lọc.</td></tr>';

  var allChecked = rowsData.length && rowsData.filter(function (x) { return !hrIsRootAccount(x.acc); }).every(function (x) { return ACCOUNT_SEL[x.acc.id]; });
  var stationOpts = FleetStore.getStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });

  return '<div class="accounts-shell">' +
    (hrScopeOn ? '<div class="hr-note"><b>Tài khoản nhân sự (HR)</b> là tài khoản của nhân viên thuộc nhóm được bảo vệ (loại có quyền Quản lý nhân sự hoặc Quản lý tài khoản), luôn <b>xem được mọi trạm</b>. ' +
      'Chỉ <b>admin gốc</b> tạo, đặt lại mật khẩu, khóa/mở khóa, đổi tên và thu hồi phiên của nhóm này; HR không tự sửa mình hay sửa HR khác. Hồ sơ nhân viên HR tạo ở Quản lý nhân viên, sau đó tạo tài khoản tại đây.</div>' : '') +
    '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search"><label>Tìm kiếm tài khoản</label>' +
        '<input type="text" id="acSearch" value="' + esc(f.search) + '" placeholder="Tên đăng nhập, họ tên, loại nhân viên..." data-input-action="adminAccountFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
      '<div class="filter-field sd-field-region"><label>Loại nhân viên</label>' +
        '<select data-change-action="adminAccountFilterInput" data-args=\'["role","__this_value__"]\'>' +
          '<option value="">Tất cả loại</option><option value="admin"' + (f.role === 'admin' ? ' selected' : '') + '>Quản trị gốc</option>' +
          acRoleFilterOptions().map(function (r) { return '<option value="' + esc(r[0]) + '"' + (f.role === r[0] ? ' selected' : '') + '>' + esc(r[1]) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="filter-field sd-field-region"><label>Trạng thái</label>' +
        '<select data-change-action="adminAccountFilterInput" data-args=\'["status","__this_value__"]\'>' +
          '<option value="">Tất cả trạng thái</option>' +
          '<option value="ok"' + (f.status === 'ok' ? ' selected' : '') + '>Hoạt động</option>' +
          '<option value="locked"' + (f.status === 'locked' ? ' selected' : '') + '>Đang bị khóa</option>' +
          '<option value="must_change"' + (f.status === 'must_change' ? ' selected' : '') + '>Phải đổi mật khẩu</option>' +
        '</select></div>' +
      '<div class="filter-field sd-field-region"><label>Trạm</label>' +
        '<select data-change-action="adminAccountFilterInput" data-args=\'["station","__this_value__"]\'>' +
          '<option value="">Tất cả trạm</option><option value="__none__"' + (f.station === '__none__' ? ' selected' : '') + '>Chưa gán trạm hoặc khu vực</option>' +
          stationOpts.map(function (st) { return '<option value="' + esc(st.name) + '"' + (f.station === st.name ? ' selected' : '') + '>' + esc(st.name) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="filter-field sd-field-region"><label>Khu vực</label>' +
        '<select data-change-action="adminAccountFilterInput" data-args=\'["region","__this_value__"]\'>' +
          '<option value="">Tất cả khu vực</option>' +
          getRegionMeta().map(function (m) { return '<option value="' + esc(m[0]) + '"' + (f.region === m[0] ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn sd-btn" data-action="adminResetAccountFilters">Đặt lại</button>' +
        (hrScopeOn ? (hrActor().isRoot ? '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenAccountModal" data-args=\'["","","hr"]\'>' + ICN_PLUS + 'Tạo tài khoản nhân sự</button>' : '') :
          '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenAccountModal" data-args=\'["","",""]\'>' + ICN_PLUS + 'Thêm tài khoản mới</button>') +
      '</div>' +
    '</div>' +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span>' + (hrScopeOn ? 'Danh sách tài khoản HR' : 'Danh sách tài khoản truy cập hệ thống') + '</span>' +
        '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">Hiển thị ' + rowsData.length + ' / ' + accounts.length + ' tài khoản</span>' +
      '</div>' +
      '<div class="sd-table-wrap"><table class="admin-table acc-table"><thead><tr>' +
        '<th style="width:50px; text-align:center;">STT</th><th>Tài khoản &amp; Người dùng</th><th>Loại nhân viên</th><th>Quyền</th><th>Trạm</th>' +
        '<th>Thiết bị</th><th>Đăng nhập cuối</th><th class="col-status" style="text-align:center;">Trạng thái</th><th>Cảnh báo</th><th class="th-actions">Thao tác</th>' +
        '<th class="col-check"><input type="checkbox" id="accCheckAll"' + (allChecked ? ' checked' : '') + ' data-action="adminAccountToggleAll" data-args=\'["__this__"]\'></th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
    '</div></div>' +
    '<div class="bulk-bar" id="accActionBar" style="display:none;">' +
      '<span class="bulk-bar-hint" id="accActionHint">Đã chọn 0 tài khoản</span>' +
      '<div class="bulk-bar-fields">' +
        '<button type="button" class="btn btn-secondary" data-action="adminAccountClearSel">Hủy</button>' +
        '<button type="button" class="btn btn-danger" data-action="acBulkLockModal" data-args=\'[true]\'>Khóa</button>' +
        '<button type="button" class="btn btn-primary" data-action="acBulkLockModal" data-args=\'[false]\'>Mở khóa</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ---- Chọn nhiều dòng để khóa / mở khóa hàng loạt ---- */
function adminAccountSyncBar() {
  var bar = $('accActionBar');
  if (!bar) return;
  var ids = Object.keys(ACCOUNT_SEL);
  if (!ids.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  var hint = $('accActionHint'); if (hint) hint.textContent = 'Đã chọn ' + ids.length + ' tài khoản';
}
function adminAccountToggleRow(id, cb) {
  if (cb.checked) ACCOUNT_SEL[id] = true; else delete ACCOUNT_SEL[id];
  var tr = document.querySelector('#' + acViewId() + ' tr[data-row-key="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  var all = $('accCheckAll');
  if (all) all.checked = document.querySelectorAll('#' + acViewId() + ' td.col-check input[type="checkbox"]:not(:checked)').length === 0;
  adminAccountSyncBar();
}
function adminAccountToggleAll(cb) {
  var boxes = document.querySelectorAll('#' + acViewId() + ' tbody td.col-check input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (b) {
    var id = null;
    try { id = JSON.parse(b.getAttribute('data-args') || '[]')[0]; } catch (e) { /* ignore */ }
    if (!id) return;
    if (cb.checked) ACCOUNT_SEL[id] = true; else delete ACCOUNT_SEL[id];
  });
  acRender();
}
function adminAccountClearSel() { ACCOUNT_SEL = {}; acRender(); }

function adminAccountFilterInput(field, val) {
  if (!(field in ACCOUNT_FILTERS)) return;
  ACCOUNT_FILTERS[field] = val || '';
  if (field === 'station' && val === '__none__') ACCOUNT_FILTERS.region = '';
  adminKeepFocus(acRender);
}
function adminResetAccountFilters() {
  ACCOUNT_FILTERS = { search: '', role: '', status: '', station: '', region: '' };
  acRender();
}

// Cột "Thao tác" — dropdown nổi (adminOpenRowMenu ở admin-station-directory.js).
function adminAccountRowMenu(btn, id) {
  var acc = getAccountsList().find(function (a) { return a.id === id; }); if (!acc) return;
  var me = hrActor(), root = hrIsRootAccount(acc), isSelf = acc.username === me.username;
  var item = function (action, label, danger) {
    return '<button type="button" class="admin-row-menu-item' + (danger ? ' danger' : '') + '" data-action="' + action + '" data-args=\'["' + esc(id) + '"]\'>' + label + '</button>';
  };
  var html = item('adminOpenAccountDetail', 'Xem chi tiết');
  if (isSelf) html += item('adminOpenPassModal', 'Đổi mật khẩu của tôi');
  if (!root) {
    html += item('adminOpenPassModal', 'Đặt lại mật khẩu');
    var locked = acc.active === false;
    html += item('acOpenLockModal', locked ? 'Mở khóa' : 'Khóa', !locked);
  }
  if (!isSelf && AuthLog.isFailedLoginLocked(acc.username)) html += item('acUnlockFailedLogin', 'Mở khóa nhập sai');
  if (me.isRoot && !root) html += item('acOpenRenameModal', 'Đổi tên tài khoản');
  if (me.isRoot && root && !isSelf) html += item('acOpenRenameModal', 'Đổi tên tài khoản');
  if (AuthLog.liveSession(acc.username) && !isSelf) html += item('acRevokeSession', 'Thu hồi phiên', true);
  adminOpenRowMenu(btn, 'account:' + id, html);
}

/* =====================================================================
   MODAL THÊM TÀI KHOẢN (chọn nhân viên) + XEM CHI TIẾT
   ===================================================================== */
// mode 'hr': nhân viên thuộc nhóm được bảo vệ; mode khác: nhân viên thường (không gồm nhóm HR).
function acStaffWithoutAccount(mode) {
  var accs = getAccountsList();
  return FleetStore.getStaff().filter(function (s) {
    if (s.role === 'admin') return false;
    if ((mode === 'hr') !== hrIsProtectedStaff(s)) return false;
    if (hrStatusLocks(hrStaffStatus(s))) return false; // chỉ nhân viên đang làm việc (working)
    return !accs.some(function (a) { return (a.employeeId && a.employeeId === s.id) || (s.username && a.username === s.username); });
  });
}
function acStaffSummaryHtml(s) {
  if (!s) return '<div class="hint-inline">Chọn nhân viên để xem họ tên, loại, trạm và khu vực.</div>';
  var scope = hrScope(s);
  return '<div class="hr-summary">' +
    '<div><span>Họ tên</span><b>' + esc(s.name) + '</b></div>' +
    '<div><span>Mã NV</span><b>' + esc(s.code || '—') + '</b></div>' +
    '<div><span>Loại nhân viên</span><b>' + esc(hrRoleLabel(s.role)) + '</b></div>' +
    '<div><span>Trạm</span><b>' + (smStationSummary(s) || '—') + '</b></div>' +
    '<div><span>Khu vực</span><b>' + (hrIsSelfKind(s.role) ? 'Chỉ dữ liệu của mình' : (smRegionSummary(s) || '—')) + '</b></div>' +
    '<div><span>Quyền</span><b>' + (hrRolePerms(s.role).length ? hrRolePerms(s.role).length + ' quyền' : 'Chưa có quyền nào (loại 0 quyền)') + '</b></div>' +
    '<div><span>Xem được</span><b>' + (scope.viewAll ? 'mọi trạm' : scope.self ? 'dữ liệu của mình' : scope.names.length + ' trạm') + '</b></div>' +
  '</div>';
}
function acOnStaffPick() {
  var sel = $('acStaff'), box = $('acStaffInfo'); if (!sel || !box) return;
  var s = FleetStore.getStaff().find(function (x) { return x.id === sel.value; });
  box.innerHTML = acStaffSummaryHtml(s);
  var u = $('acUser');
  if (u && s && !u.value) {
    // gợi ý tên đăng nhập từ họ tên (bỏ dấu, ghép liền) — người tạo vẫn sửa được
    var base = String(s.name || '').toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    u.placeholder = 'VD: ' + (base.slice(0, 20) || 'nguyen.van.a');
  }
}

// staffId: tạo tài khoản cho đúng nhân viên này (gọi từ trang Nhân viên).
function adminOpenAccountModal(id, staffId, mode) {
  if (id) { adminOpenAccountDetail(id); return; }
  mode = mode === 'hr' ? 'hr' : '';
  if (mode === 'hr' && !hrActor().isRoot) { showToast('Chỉ admin gốc tạo tài khoản HR.'); return; }
  var cand = acStaffWithoutAccount(mode);
  if (!cand.length) { showToast(mode === 'hr' ? 'Không còn nhân viên HR đang làm việc nào chưa có tài khoản. Tạo hồ sơ nhân viên (loại có quyền Quản lý nhân sự/tài khoản) ở Quản lý nhân viên trước.' : 'Mọi nhân viên thường đang làm việc đều đã có tài khoản. Hãy tạo nhân viên mới ở trang Quản lý nhân viên (nhân viên HR tạo tài khoản ở Cấu hình nhân sự > Tài khoản nhân sự).'); return; }
  var pick = staffId ? cand.find(function (s) { return s.id === staffId; }) : null;
  if (staffId && !pick) { showToast('Nhân viên này không tạo được tài khoản (đã có tài khoản hoặc không ở trạng thái làm việc).'); return; }
  openAdminModal(
    '<h3>' + (mode === 'hr' ? 'Tạo tài khoản HR' : 'Thêm tài khoản mới') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveAccount" data-args=\'["__event__","' + mode + '"]\'>' +
      (mode === 'hr' ? '<div class="hr-note">Chỉ admin gốc tạo tài khoản cho nhân viên HR (loại có quyền Quản lý nhân sự / Quản lý tài khoản).</div>' : '') +
      '<div class="fld"><label>Chọn nhân viên <span class="req">*</span></label>' +
        '<select id="acStaff" required data-change-action="acOnStaffPick">' +
          '<option value="">— Chọn nhân viên ' + (mode === 'hr' ? 'HR ' : '') + 'đang làm việc chưa có tài khoản —</option>' +
          cand.map(function (s) { return '<option value="' + esc(s.id) + '"' + (pick && pick.id === s.id ? ' selected' : '') + '>' + esc((s.code || '') + ' · ' + s.name + ' · ' + hrRoleLabel(s.role)) + '</option>'; }).join('') +
        '</select></div>' +
      '<div id="acStaffInfo">' + acStaffSummaryHtml(pick) + '</div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Tên tài khoản (Username) <span class="req">*</span></label><input type="text" id="acUser" required placeholder="chữ thường, số, . _ - (3-32 ký tự)" autocomplete="off"></div>' +
        '<div class="fld"><label>Mật khẩu <span class="req">*</span></label><input type="password" id="acPass" required placeholder="Tối thiểu 8 ký tự" autocomplete="new-password"></div>' +
      '</div>' +
      '<div class="hr-note">Họ tên, loại nhân viên, trạm và khu vực lấy từ hồ sơ nhân viên (không nhập ở đây). Tạo xong tài khoản sẽ <b>phải đổi mật khẩu ở lần đăng nhập đầu</b>, và lần đăng nhập đầu tiên cần HR duyệt thiết bị. Quyền = quyền của loại nhân viên; muốn đổi quyền, đổi loại ở trang Quản lý nhân viên.</div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button>' +
        '<button type="submit" class="btn btn-primary">Tạo tài khoản</button>' +
      '</div>' +
    '</form>',
    true
  );
}

// Username dùng được: đúng CHECK, không trùng username đang dùng và không trùng username CŨ từng thuộc tài khoản khác.
function acUsernameError(username, exceptId) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return 'Tên tài khoản chỉ gồm chữ thường, số, . _ - (3-32 ký tự).';
  var low = username.toLowerCase();
  if (getAccountsList().some(function (a) { return a.id !== exceptId && String(a.username).toLowerCase() === low; })) return 'Tên tài khoản "' + username + '" đã tồn tại.';
  var cur = exceptId ? getAccountsList().find(function (a) { return a.id === exceptId; }) : null;
  var used = AuthLog.getEvents().some(function (e) {
    return e.eventType === 'username_changed' && e.detail && String(e.detail.old || '').toLowerCase() === low && (!cur || e.detail.new !== cur.username);
  });
  if (used) return 'Tên "' + username + '" từng thuộc tài khoản khác, không dùng lại để lịch sử đăng nhập không bị lẫn.';
  return '';
}
function acPasswordError(pass, username) {
  if (pass.length < 8) return 'Mật khẩu tối thiểu 8 ký tự.';
  if (pass.toLowerCase() === String(username || '').toLowerCase()) return 'Mật khẩu không được trùng tên tài khoản.';
  return '';
}

function adminSaveAccount(e, mode) {
  if (e && e.preventDefault) e.preventDefault();
  mode = mode === 'hr' ? 'hr' : '';
  var staffId = ($('acStaff') || {}).value || '';
  var username = (($('acUser') || {}).value || '').trim().toLowerCase();
  var password = ($('acPass') || {}).value || '';
  var staff = FleetStore.getStaff().find(function (s) { return s.id === staffId; });
  if (!staff) { showToast('Chọn nhân viên.'); return; }
  var me = hrActor();
  // Tài khoản HR (nhóm được bảo vệ) tách riêng: chỉ tạo ở Cấu hình nhân sự > Tài khoản nhân sự và chỉ admin gốc.
  if (hrIsProtectedStaff(staff) && mode !== 'hr') { showToast('Nhân viên này thuộc nhóm HR — tạo tài khoản ở Cấu hình nhân sự > Tài khoản nhân sự (chỉ admin gốc).'); return; }
  if (mode === 'hr' && !hrIsProtectedStaff(staff)) { showToast('Tab Tài khoản nhân sự chỉ tạo cho nhân viên thuộc nhóm HR. Nhân viên thường tạo ở trang Tài khoản.'); return; }
  if (mode === 'hr' && !me.isRoot) { showToast('Chỉ admin gốc tạo tài khoản HR.'); return; }
  if (!me.isRoot) {
    if (me.username && staff.username === me.username) { showToast('Không tự tạo tài khoản cho chính mình.'); return; }
    if (hrIsProtectedStaff(staff)) { showToast('Hồ sơ thuộc nhóm được bảo vệ — chỉ admin gốc tạo tài khoản.'); return; }
    if (!acHasPerm('manage_accounts')) { showToast('Bạn không có quyền quản lý tài khoản.'); return; }
  }
  var err = acUsernameError(username, '') || acPasswordError(password, username);
  if (err) { showToast(err); return; }
  // v3.0: không bắt buộc trạm khi tạo tài khoản (chỉ cảnh báo ở cột Cảnh báo của danh sách).
  var role = hrRole(staff.role);
  var now = Date.now();
  var list = getAccountsList();
  var rec = {
    id: 'acc_' + now, username: username, password: password, fullName: staff.name, employeeId: staff.id,
    role: staff.role, roleLabel: hrRoleLabel(staff.role), redirect: (role && role.redirect) || (staff.role === 'admin' ? 'admin.html' : 'ticketstaff.html'),
    active: true, mustChangePassword: true, passwordChangedAt: 0, lockedAt: 0, lockedBy: '', lockReason: '',
    lastLoginAt: 0, createdAt: now, createdBy: me.username
  };
  list.push(rec);
  saveAccountsList(list);
  var all = FleetStore.getStaff();
  var s2 = all.find(function (x) { return x.id === staff.id; });
  if (s2) {
    s2.username = username;
    FleetStore.setStaff(all);
  }
  hrLog('create', 'users', username, 'Tạo tài khoản ' + (mode === 'hr' ? 'HR ' : '') + username + ' cho nhân viên ' + staff.name, { employee: staff.code || staff.id, role: staff.role, must_change_password: true });
  showToast('Đã tạo tài khoản. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu.');
  closeAdminModal();
  if (typeof renderStaffView === 'function' && !$('viewStaff').hidden) renderStaffView();
  acRender();
}

/* ---- Chi tiết tài khoản (chỉ đọc quyền) ---- */
function adminOpenAccountDetail(id) {
  var acc = getAccountsList().find(function (a) { return a.id === id; }); if (!acc) return;
  var root = hrIsRootAccount(acc), st = hrStaffOfAccount(acc), state = acLoginState(acc);
  var me = hrActor();
  var perms = root ? [] : hrRolePerms(st ? st.role : acc.role);
  var live = AuthLog.liveSession(acc.username);
  var dev = live ? AuthLog.getDevices().find(function (d) { return d.id === live.deviceId; }) : null;
  var canManage = acCheckManage(acc).ok && !root;
  var locked = acc.active === false;
  var empLocked = state.reasons.some(function (r) { return r.code === 'employee_locked'; });
  openAdminModal(
    '<h3>Chi tiết tài khoản ' + esc(acc.username) + (root ? ' ' + hrChip('Quản trị gốc', 'red') : '') + '</h3>' +
    '<div class="admin-form hr-form">' +
      '<div class="fld-row">' +
        hrReadonlyField('Tên tài khoản', '<span class="mono" style="font-weight:700;">' + esc(acc.username) + '</span>' +
          (me.isRoot ? ' <button type="button" class="btn btn-sm" data-action="acOpenRenameModal" data-args=\'["' + esc(acc.id) + '"]\'>Đổi tên tài khoản</button>' : '')) +
        hrReadonlyField('Họ tên', esc(st ? st.name : (acc.fullName || acc.username))) +
      '</div>' +
      '<div class="fld-row">' +
        hrReadonlyField('Loại nhân viên', root ? 'Quản trị gốc (mọi quyền, không thuộc loại nào)' : esc(hrRoleLabel(st ? st.role : acc.role))) +
        hrReadonlyField('Trạm', root ? 'Mọi trạm' : (st ? ((smStationSummary(st) || '—')) : '—')) +
      '</div>' +
      '<div class="fld-row">' +
        hrReadonlyField('Khu vực', root ? 'Mọi khu vực' : (st ? (hrIsSelfKind(st.role) ? 'Chỉ dữ liệu của mình' : (st.regions || []).map(hrRegionName).join(', ') || '—') : '—')) +
        hrReadonlyField('Đăng nhập cuối', acc.lastLoginAt ? esc(fmtStamp(acc.lastLoginAt)) : 'Chưa đăng nhập') +
      '</div>' +
      '<div class="fld"><label>Trạng thái đăng nhập</label><div class="hr-readonly">' +
        state.reasons.map(function (r) { return hrBadge(r.label, r.tone); }).join(' ') +
        (locked ? '<div class="hint-inline">Khóa lúc ' + esc(fmtStamp(acc.lockedAt)) + ' bởi ' + esc(acc.lockedBy || '—') + ' · Lý do: ' + esc(acc.lockReason || '—') + '</div>' : '') +
        (empLocked ? '<div class="hint-inline">Khóa theo trạng thái nhân viên — đổi trạng thái ở trang Quản lý nhân viên.</div>' : '') +
      '</div></div>' +
      '<div class="fld-row">' +
        hrReadonlyField('Phiên đang sống', live ? esc((dev ? dev.label : 'Thiết bị không rõ') + ' · từ ' + fmtStamp(live.createdAt) + ' · hoạt động cuối ' + fmtStamp(live.lastSeenAt)) : 'Không có') +
      '</div>' +
      (root ? '<div class="hr-note">Admin gốc có mọi quyền và miễn duyệt đăng nhập. Chỉ đọc; chỉ tự đổi mật khẩu.</div>' :
        acPermissionsFieldHtml(perms, { scope: 'view', label: 'Quyền (' + perms.length + ', theo loại nhân viên — chỉ xem)', readonly: true,
          hint: 'Muốn đổi quyền, đổi loại nhân viên ở trang Quản lý nhân viên. Sửa quyền bên trong một loại chỉ admin gốc, ở Cấu hình nhân sự.' })) +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Đóng</button>' +
        (canManage && !empLocked ? '<button type="button" class="btn ' + (locked ? 'btn-primary' : 'btn-danger') + '" data-action="acOpenLockModal" data-args=\'["' + esc(acc.id) + '"]\'>' + (locked ? 'Mở khóa' : 'Khóa tài khoản') + '</button>' : '') +
      '</div>' +
    '</div>',
    true
  );
}
function acViewPermissions(id) { adminOpenAccountDetail(id); }

/* =====================================================================
   KHÓA / MỞ KHÓA (bắt buộc Lý do) — một tài khoản hoặc hàng loạt
   ===================================================================== */
function acOpenLockModal(id) {
  var acc = getAccountsList().find(function (a) { return a.id === id; }); if (!acc) return;
  var chk = acCheckManage(acc); if (!chk.ok) { showToast(chk.reason); return; }
  if (hrIsRootAccount(acc)) { showToast('Admin gốc không bị khóa qua giao diện.'); return; }
  var state = acLoginState(acc);
  if (state.reasons.some(function (r) { return r.code === 'employee_locked'; })) { showToast('Đang khóa theo trạng thái nhân viên — đổi trạng thái ở trang Quản lý nhân viên.'); return; }
  var lock = acc.active !== false;
  openAdminModal(
    '<h3>' + (lock ? 'Khóa' : 'Mở khóa') + ' tài khoản ' + esc(acc.username) + '</h3>' +
    '<form class="admin-form" data-submit-action="acApplyLock" data-args=\'["__event__","' + (lock ? 'lock' : 'unlock') + '","' + esc(acc.id) + '"]\'>' +
      (lock ? '<div class="hr-note">Khóa sẽ thu hồi mọi phiên đang sống và hủy các yêu cầu duyệt đăng nhập đang chờ.' +
        '</div>' : '') +
      '<div class="fld"><label>Lý do <span class="req">*</span></label><textarea id="acLockReason" required rows="3" placeholder="' + (lock ? 'Vì sao khóa tài khoản này?' : 'Vì sao mở khóa?') + '"></textarea></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button><button type="submit" class="btn ' + (lock ? 'btn-danger' : 'btn-primary') + '">' + (lock ? 'Khóa tài khoản' : 'Mở khóa') + '</button></div>' +
    '</form>'
  );
}
// Áp khóa/mở khóa một tài khoản (đã kiểm quy tắc). Trả null nếu ok, hoặc lý do bị bỏ qua.
function acDoLock(acc, lock, reason) {
  var chk = acCheckManage(acc); if (!chk.ok) return chk.reason;
  if (hrIsRootAccount(acc)) return 'Admin gốc không bị khóa qua giao diện';
  if (acLoginState(acc).reasons.some(function (r) { return r.code === 'employee_locked'; })) return 'Đang khóa theo trạng thái nhân viên';
  var me = hrActor().username, now = Date.now();
  if (lock) {
    if (acc.active === false) return 'Đã bị khóa từ trước';
    acc.active = false; acc.lockedAt = now; acc.lockedBy = me; acc.lockReason = reason;
    var n = AuthLog.revokeAllOf(acc.username, 'account_locked', me);
    AuthLog.saveApprovals(AuthLog.getApprovals().map(function (ap) {
      return (ap.username === acc.username && (ap.status === 'pending' || ap.status === 'approved')) ? Object.assign({}, ap, { status: 'expired' }) : ap;
    }));
    AuthLog.event('account_locked', { username: acc.username, detail: { reason: 'manual', by: me, note: reason } });
    hrLog('account_lock', 'users', acc.username, 'Khóa tài khoản ' + acc.username + (n ? ' (thu hồi ' + n + ' phiên)' : ''), { is_active: { old: true, new: false } }, reason);
  } else {
    if (acc.active !== false) return 'Chưa bị khóa';
    acc.active = true; acc.lockedAt = 0; acc.lockedBy = ''; acc.lockReason = '';
    AuthLog.event('account_unlocked', { username: acc.username, detail: { reason: 'manual', by: me, note: reason } });
    hrLog('account_unlock', 'users', acc.username, 'Mở khóa tài khoản ' + acc.username, { is_active: { old: false, new: true } }, reason);
  }
  return null;
}
function acApplyLock(e, mode, id) {
  e.preventDefault();
  var reason = ($('acLockReason') || {}).value.trim();
  if (!reason) { showToast('Nhập lý do.'); return; }
  var list = getAccountsList(), acc = list.find(function (a) { return a.id === id; }); if (!acc) return;
  var skip = acDoLock(acc, mode === 'lock', reason);
  if (skip) { showToast('Không thực hiện được: ' + skip); return; }
  saveAccountsList(list);
  closeAdminModal();
  showToast((mode === 'lock' ? 'Đã khóa' : 'Đã mở khóa') + ' tài khoản ' + acc.username + '.');
  acRender();
}
function acBulkLockModal(lock) {
  var ids = Object.keys(ACCOUNT_SEL); if (!ids.length) return;
  openAdminModal(
    '<h3>' + (lock ? 'Khóa' : 'Mở khóa') + ' ' + ids.length + ' tài khoản đã chọn</h3>' +
    '<form class="admin-form" data-submit-action="acApplyBulkLock" data-args=\'["__event__",' + (lock ? 'true' : 'false') + ']\'>' +
      '<div class="hr-note">Tài khoản không thao tác được (admin gốc, nhóm được bảo vệ, đang khóa theo nhân viên, đã ở đúng trạng thái) sẽ được bỏ qua và báo lý do từng dòng.</div>' +
      '<div class="fld"><label>Lý do <span class="req">*</span></label><textarea id="acLockReason" required rows="3"></textarea></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button><button type="submit" class="btn ' + (lock ? 'btn-danger' : 'btn-primary') + '">' + (lock ? 'Khóa' : 'Mở khóa') + '</button></div>' +
    '</form>'
  );
}
function acApplyBulkLock(e, lock) {
  e.preventDefault();
  var reason = ($('acLockReason') || {}).value.trim();
  if (!reason) { showToast('Nhập lý do.'); return; }
  var list = getAccountsList(), ok = 0, skipped = [];
  Object.keys(ACCOUNT_SEL).forEach(function (id) {
    var acc = list.find(function (a) { return a.id === id; }); if (!acc) return;
    var skip = acDoLock(acc, lock, reason);
    if (skip) skipped.push(acc.username + ' (' + skip + ')'); else ok++;
  });
  saveAccountsList(list);
  ACCOUNT_SEL = {};
  closeAdminModal();
  showToast((lock ? 'Đã khóa ' : 'Đã mở khóa ') + ok + ' tài khoản.' + (skipped.length ? ' Bỏ qua ' + skipped.length + ': ' + skipped.join('; ') : ''));
  acRender();
}
function acUnlockFailedLogin(id) {
  var acc = getAccountsList().find(function (a) { return a.id === id; }); if (!acc) return;
  var chk = acCheckManage(acc); if (!chk.ok) { showToast(chk.reason); return; }
  var me = hrActor().username;
  AuthLog.event('account_unlocked', { username: acc.username, detail: { reason: 'failed_login', by: me } });
  hrLog('login_unlock', 'users', acc.username, 'Mở khóa nhập sai cho tài khoản ' + acc.username, { failed_login: { old: true, new: false } });
  showToast('Đã mở khóa nhập sai cho ' + acc.username + '.');
  acRender();
}

/* =====================================================================
   ĐỔI / ĐẶT LẠI MẬT KHẨU
   ===================================================================== */
function adminOpenPassModal(id) {
  var acc = getAccountsList().find(function (a) { return a.id === id; }); if (!acc) return;
  var me = hrActor(), isSelf = acc.username === me.username;
  if (!isSelf) { var chk = acCheckManage(acc); if (!chk.ok) { showToast(chk.reason); return; } if (hrIsRootAccount(acc)) { showToast('Mật khẩu admin gốc: chỉ chính admin gốc đổi (quên thì khôi phục bằng script trên DB).'); return; } }
  openAdminModal(
    '<h3>' + (isSelf ? 'Đổi mật khẩu của tôi' : 'Đặt lại mật khẩu cho ' + esc(acc.username)) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSavePassModal" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="pwId" value="' + esc(acc.id) + '">' +
      '<div class="fld"><label>Mật khẩu mới <span class="req">*</span></label><input type="password" id="pwNew" required placeholder="Tối thiểu 8 ký tự, không trùng tên tài khoản" autocomplete="new-password"></div>' +
      (isSelf ? '' : '<div class="hr-note">Đặt lại bởi người khác: tài khoản <b>phải đổi mật khẩu</b> ở lần đăng nhập kế tiếp và mọi phiên đang sống bị thu hồi. Mật khẩu chỉ lưu dạng mã hóa, không ai xem lại được.</div>') +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button><button type="submit" class="btn btn-primary">' + (isSelf ? 'Đổi mật khẩu' : 'Đặt lại mật khẩu') + '</button></div>' +
    '</form>'
  );
}
function adminSavePassModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  var id = ($('pwId') || {}).value || '', pass = ($('pwNew') || {}).value || '';
  var list = getAccountsList(), acc = list.find(function (a) { return a.id === id; }); if (!acc) return;
  var err = acPasswordError(pass, acc.username); if (err) { showToast(err); return; }
  var me = hrActor(), isSelf = acc.username === me.username, now = Date.now();
  if (!isSelf) {
    var chk = acCheckManage(acc); if (!chk.ok) { showToast(chk.reason); return; }
    if (hrIsRootAccount(acc)) { showToast('Mật khẩu admin gốc: chỉ chính admin gốc đổi.'); return; }
  }
  acc.password = pass; acc.passwordChangedAt = now; acc.mustChangePassword = !isSelf;
  saveAccountsList(list);
  if (isSelf) {
    AuthLog.event('password_changed', { username: acc.username, sessionId: (Session.get() || {}).sid, detail: {} });
  } else {
    var n = AuthLog.revokeAllOf(acc.username, 'password_changed', me.username);
    AuthLog.event('password_reset', { username: acc.username, detail: { by: me.username, revoked: n } });
    hrLog('password_reset', 'users', acc.username, 'Đặt lại mật khẩu tài khoản ' + acc.username + (n ? ' (thu hồi ' + n + ' phiên)' : ''), { must_change_password: { old: false, new: true } });
  }
  showToast(isSelf ? 'Đã đổi mật khẩu.' : 'Đã đặt lại mật khẩu cho ' + acc.username + '.');
  closeAdminModal();
  acRender();
}

/* =====================================================================
   ĐỔI TÊN TÀI KHOẢN (CHỈ ADMIN GỐC, lúc nào cũng được)
   ===================================================================== */
function acOpenRenameModal(id) {
  if (!hrActor().isRoot) { showToast('Chỉ admin gốc đổi được tên tài khoản.'); return; }
  var acc = getAccountsList().find(function (a) { return a.id === id; }); if (!acc) return;
  openAdminModal(
    '<h3>Đổi tên tài khoản ' + esc(acc.username) + '</h3>' +
    '<form class="admin-form" data-submit-action="acApplyRename" data-args=\'["__event__","' + esc(acc.id) + '"]\'>' +
      '<div class="fld"><label>Tên tài khoản mới <span class="req">*</span></label><input id="acNewUser" required placeholder="chữ thường, số, . _ - (3-32 ký tự)" autocomplete="off"></div>' +
      '<div class="hr-note">Đổi tên sẽ thu hồi mọi phiên của tài khoản. Tên mới không được trùng tên đang dùng hoặc tên cũ từng thuộc tài khoản khác. Dùng cả khi gõ sai tên lúc tạo.</div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button><button type="submit" class="btn btn-primary">Đổi tên</button></div>' +
    '</form>'
  );
}
function acApplyRename(e, id) {
  e.preventDefault();
  if (!hrActor().isRoot) { showToast('Chỉ admin gốc đổi được tên tài khoản.'); return; }
  var next = ($('acNewUser') || {}).value.trim().toLowerCase();
  var list = getAccountsList(), acc = list.find(function (a) { return a.id === id; }); if (!acc) return;
  if (next === acc.username) { showToast('Tên mới trùng tên hiện tại.'); return; }
  var err = acUsernameError(next, acc.id); if (err) { showToast(err); return; }
  var old = acc.username, me = hrActor().username;
  var n = AuthLog.revokeAllOf(old, 'username_changed', me);
  acc.username = next;
  saveAccountsList(list);
  var staff = FleetStore.getStaff(), st = staff.find(function (s) { return (acc.employeeId && s.id === acc.employeeId) || s.username === old; });
  if (st) { st.username = next; FleetStore.setStaff(staff); }
  AuthLog.saveDevices(AuthLog.getDevices().map(function (d) { return d.username === old ? Object.assign({}, d, { username: next }) : d; }));
  AuthLog.saveApprovals(AuthLog.getApprovals().map(function (a) { return a.username === old ? Object.assign({}, a, { username: next }) : a; }));
  AuthLog.event('username_changed', { username: next, detail: { old: old, new: next, by: me, revoked: n } });
  hrLog('username_change', 'users', next, 'Đổi tên tài khoản ' + old + ' → ' + next, { username: { old: old, new: next } });
  closeAdminModal(); showToast('Đã đổi tên tài khoản ' + old + ' → ' + next + '.'); acRender();
}

/* =====================================================================
   THU HỒI PHIÊN
   ===================================================================== */
function acRevokeSession(id) {
  var acc = getAccountsList().find(function (a) { return a.id === id; }); if (!acc) return;
  if (!acHasPerm('revoke_sessions')) { showToast('Bạn không có quyền thu hồi phiên.'); return; }
  var chk = acCheckManage(acc, null); if (!chk.ok) { showToast(chk.reason); return; }
  var live = AuthLog.liveSession(acc.username); if (!live) { showToast('Tài khoản không có phiên đang sống.'); return; }
  if (!confirm('Thu hồi phiên đang sống của ' + acc.username + '? Người dùng sẽ bị đăng xuất.')) return;
  AuthLog.revokeSession(live.id, 'admin_revoke', hrActor().username);
  hrLog('revoke_session', 'user_sessions', live.id, 'Thu hồi phiên của ' + acc.username, { reason: 'admin_revoke' });
  showToast('Đã thu hồi phiên.'); acRender();
}

/* =====================================================================
   TAB DUYỆT ĐĂNG NHẬP
   ===================================================================== */
// Yêu cầu duyệt nằm ở trang Tài khoản (kể cả của nhóm HR, chỉ admin gốc duyệt): từ tab Tài khoản nhân sự bấm vào cũng chuyển sang đó.
function acOpenApprovalsFor(username) { ACCOUNT_TAB = 'approvals'; APPROVAL_TAB = 'pending'; APPROVAL_FILTERS.search = username; switchAdminView('viewAccounts'); }
function setApprovalTab(tab) { APPROVAL_TAB = tab; acRender(); }
function acApprovalFilterInput(field, val) {
  if (!(field in APPROVAL_FILTERS)) return;
  APPROVAL_FILTERS[field] = val || '';
  adminKeepFocus(acRender);
}
function acResetApprovalFilters() { APPROVAL_FILTERS = { search: '', status: '', dateFrom: '', dateTo: '' }; acRender(); }

function acDeviceOf(id) { return AuthLog.getDevices().find(function (d) { return d.id === id; }) || null; }
function acNameOf(username) {
  var acc = getAccountsList().find(function (a) { return a.username === username; });
  var st = acc ? hrStaffOfAccount(acc) : null;
  return st ? st.name : (acc ? acc.fullName : username);
}
var APPROVAL_KIND = { first_login: 'Lần đăng nhập đầu tiên', concurrent_session: 'Đăng nhập khi có phiên ở thiết bị khác' };
var APPROVAL_STATUS = { pending: ['Chờ duyệt', 'da-chi-dinh'], approved: ['Đã duyệt', 'dang-ban'], rejected: ['Từ chối', 'da-huy'], consumed: ['Đã dùng', 'dang-ban'], expired: ['Hết hạn', 'da-huy'] };

function acApprovalMatches(ap, f) {
  var kw = (f.search || '').toLowerCase();
  if (kw && (ap.username + ' ' + acNameOf(ap.username)).toLowerCase().indexOf(kw) === -1) return false;
  if (f.status && ap.status !== f.status) return false;
  var day = new Date(ap.requestedAt); var iso = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
  if (f.dateFrom && iso < f.dateFrom) return false;
  if (f.dateTo && iso > f.dateTo) return false;
  return true;
}
function acApprovalToolbar(withStatus, withDate) {
  var f = APPROVAL_FILTERS;
  return '<div class="sd-toolbar">' +
    '<div class="filter-field sd-field-search"><label>Tài khoản / nhân viên</label><input type="text" id="apSearch" value="' + esc(f.search) + '" placeholder="Tên đăng nhập hoặc họ tên..." data-input-action="acApprovalFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
    (withStatus ? '<div class="filter-field sd-field-region"><label>Trạng thái</label><select data-change-action="acApprovalFilterInput" data-args=\'["status","__this_value__"]\'><option value="">Tất cả</option>' +
      Object.keys(APPROVAL_STATUS).map(function (k) { return '<option value="' + k + '"' + (f.status === k ? ' selected' : '') + '>' + APPROVAL_STATUS[k][0] + '</option>'; }).join('') + '</select></div>' : '') +
    (withDate ? '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(f.dateFrom) + '" data-change-action="acApprovalFilterInput" data-args=\'["dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(f.dateTo) + '" data-change-action="acApprovalFilterInput" data-args=\'["dateTo","__this_value__"]\'></div>' : '') +
    '<div class="sd-toolbar-actions"><button type="button" class="btn sd-btn" data-action="acResetApprovalFilters">Đặt lại</button></div></div>';
}

function acRenderApprovalsTab() {
  var tabBtn = function (key, label) {
    return '<button type="button" class="station-subtab' + (APPROVAL_TAB === key ? ' active' : '') + '" data-action="setApprovalTab" data-args=\'["' + key + '"]\'>' + label + '</button>';
  };
  var pending = acPendingApprovals().length;
  var body = APPROVAL_TAB === 'devices' ? acRenderDevicesTab() : APPROVAL_TAB === 'history' ? acRenderApprovalHistoryTab() : acRenderPendingTab();
  return '<div class="hr-note">Chỉ phải duyệt hai trường hợp: <b>lần đăng nhập đầu tiên</b> của tài khoản (HR duyệt) và <b>đăng nhập khi đang có phiên sống ở thiết bị khác</b> (duyệt xong, phiên cũ bị đá ra). Các trường hợp còn lại đăng nhập bằng thiết bị nào cũng được. Duyệt không nhớ thiết bị: chỉ dùng cho đúng lần đăng nhập đó. Mỗi tài khoản chỉ có một phiên một thiết bị.</div>' +
    '<div class="station-subtabs" style="margin-top:4px;">' + tabBtn('pending', 'Chờ duyệt' + (pending ? ' <span class="hr-count-badge">' + pending + '</span>' : '')) + tabBtn('devices', 'Thiết bị') + tabBtn('history', 'Lịch sử duyệt') + '</div>' + body;
}

function acRenderPendingTab() {
  var list = AuthLog.getApprovals().filter(function (a) { return a.status === 'pending' && acApprovalMatches(a, APPROVAL_FILTERS); }).sort(function (a, b) { return a.requestedAt - b.requestedAt; });
  var rows = list.map(function (ap, i) {
    var dev = acDeviceOf(ap.deviceId);
    var blocking = ap.blockingSessionId ? AuthLog.getSessions().find(function (s) { return s.id === ap.blockingSessionId; }) : null;
    var bdev = blocking ? acDeviceOf(blocking.deviceId) : null;
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td>' + hrChip(APPROVAL_KIND[ap.kind] || ap.kind, ap.kind === 'first_login' ? 'blue' : 'amber') + '</td>' +
      '<td><b>' + esc(acNameOf(ap.username)) + '</b><div class="mono hint-inline">@' + esc(ap.username) + '</div></td>' +
      '<td>' + (dev ? '<b>' + esc(dev.label) + '</b><div class="hint-inline">' + esc(dev.platform) + (ap.ip ? ' · ' + esc(ap.ip) : '') + '</div><div class="hint-inline" title="' + esc(dev.userAgent) + '">' + esc((dev.userAgent || '').slice(0, 48)) + '…</div>' : '—') + '</td>' +
      '<td>' + (ap.kind === 'concurrent_session' ? (bdev ? '<b>' + esc(bdev.label) + '</b><div class="hint-inline">sẽ bị đá ra · phiên từ ' + esc(fmtStamp(blocking.createdAt)) + '</div>' : '<span class="hint-inline">Phiên chặn đã kết thúc</span>') : '<span class="hint-inline">—</span>') + '</td>' +
      '<td>' + esc(fmtStamp(ap.requestedAt)) + '</td>' +
      '<td>' + esc(fmtStamp(ap.expiresAt)) + '</td>' +
      '<td class="row-actions" style="white-space:nowrap;">' +
        '<button type="button" class="btn btn-sm btn-primary" data-action="acApprove" data-args=\'["' + esc(ap.id) + '"]\'>Duyệt</button> ' +
        '<button type="button" class="btn btn-sm" data-action="acOpenRejectModal" data-args=\'["' + esc(ap.id) + '"]\'>Từ chối</button>' +
      '</td></tr>';
  }).join('') || '<tr><td colspan="8" class="empty-state">Không có yêu cầu nào đang chờ duyệt.</td></tr>';
  return acApprovalToolbar(false, false) +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; justify-content:space-between;"><span>Yêu cầu chờ duyệt</span><span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + list.length + ' yêu cầu</span></div>' +
      '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Loại yêu cầu</th><th>Nhân viên</th><th>Thiết bị xin đăng nhập</th><th>Thiết bị đang sống (sẽ bị đá)</th><th>Giờ yêu cầu</th><th>Hạn</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div></div>';
}

function acApprovalGuard(ap) {
  if (!acHasPerm('approve_devices')) return 'Bạn không có quyền duyệt đăng nhập.';
  var me = hrActor();
  if (me.isRoot) return '';
  if (ap.username === me.username) return 'Không tự duyệt yêu cầu của chính mình.';
  var acc = getAccountsList().find(function (a) { return a.username === ap.username; });
  var st = acc ? hrStaffOfAccount(acc) : null;
  if (hrIsRootAccount(acc) || (st && hrIsProtectedStaff(st))) return 'Yêu cầu của nhóm được bảo vệ (HR/admin) chỉ admin gốc xử lý.';
  return '';
}
function acApprove(id) {
  var list = AuthLog.getApprovals(), ap = list.find(function (x) { return x.id === id; });
  if (!ap || ap.status !== 'pending') { showToast('Yêu cầu không còn ở trạng thái chờ.'); return; }
  var g = acApprovalGuard(ap); if (g) { showToast(g); return; }
  if (ap.kind === 'concurrent_session') {
    var blk = AuthLog.getSessions().find(function (s) { return s.id === ap.blockingSessionId && !s.revokedAt; });
    if (!blk) { ap.status = 'expired'; AuthLog.saveApprovals(list); showToast('Phiên chặn đã kết thúc, yêu cầu không còn cần duyệt.'); acRender(); return; }
  }
  var now = Date.now();
  ap.status = 'approved'; ap.decidedBy = hrActor().username; ap.decidedAt = now;
  ap.expiresAt = now + AuthLog.settings().approvalValidMinutes * 60000;
  AuthLog.saveApprovals(list);
  AuthLog.event('approval_approved', { username: ap.username, deviceId: ap.deviceId, detail: { approval_id: ap.id, kind: ap.kind, by: ap.decidedBy } });
  hrLog('login_approve', 'login_approvals', ap.id, 'Duyệt đăng nhập (' + (APPROVAL_KIND[ap.kind] || ap.kind) + ') cho ' + ap.username, { status: { old: 'pending', new: 'approved' } });
  showToast('Đã duyệt. Có hiệu lực ' + AuthLog.settings().approvalValidMinutes + ' phút cho đúng thiết bị này.'); acRender();
}
function acOpenRejectModal(id) {
  openAdminModal(
    '<h3>Từ chối yêu cầu đăng nhập</h3>' +
    '<form class="admin-form" data-submit-action="acApplyReject" data-args=\'["__event__","' + esc(id) + '"]\'>' +
      '<div class="fld"><label>Ghi chú <span class="req">*</span></label><textarea id="apNote" required rows="3" placeholder="Lý do từ chối"></textarea></div>' +
      '<div class="hint-inline">Sau khi từ chối, trong ' + AuthLog.settings().approvalRejectCooldownMinutes + ' phút tài khoản không tạo được yêu cầu mới.</div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button><button type="submit" class="btn btn-danger">Từ chối</button></div>' +
    '</form>'
  );
}
function acApplyReject(e, id) {
  e.preventDefault();
  var note = ($('apNote') || {}).value.trim(); if (!note) { showToast('Nhập ghi chú.'); return; }
  var list = AuthLog.getApprovals(), ap = list.find(function (x) { return x.id === id; });
  if (!ap || ap.status !== 'pending') { showToast('Yêu cầu không còn ở trạng thái chờ.'); return; }
  var g = acApprovalGuard(ap); if (g) { showToast(g); return; }
  ap.status = 'rejected'; ap.decidedBy = hrActor().username; ap.decidedAt = Date.now(); ap.decisionNote = note;
  AuthLog.saveApprovals(list);
  AuthLog.event('approval_rejected', { username: ap.username, deviceId: ap.deviceId, detail: { approval_id: ap.id, by: ap.decidedBy, note: note } });
  hrLog('login_reject', 'login_approvals', ap.id, 'Từ chối đăng nhập của ' + ap.username, { status: { old: 'pending', new: 'rejected' } }, note);
  closeAdminModal(); showToast('Đã từ chối yêu cầu.'); acRender();
}

function acRenderDevicesTab() {
  var kw = (APPROVAL_FILTERS.search || '').toLowerCase();
  var list = AuthLog.getDevices().filter(function (d) { return !kw || (d.username + ' ' + acNameOf(d.username)).toLowerCase().indexOf(kw) !== -1; })
    .sort(function (a, b) { return b.lastSeenAt - a.lastSeenAt; });
  var rows = list.map(function (d, i) {
    var live = AuthLog.getSessions().some(function (s) { return s.deviceId === d.id && !s.revokedAt; });
    return '<tr class="' + (d.status === 'blocked' ? 'sch-row-deleted' : '') + '">' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(acNameOf(d.username)) + '</b><div class="mono hint-inline">@' + esc(d.username) + '</div></td>' +
      '<td><b>' + esc(d.label) + '</b><div class="hint-inline">' + esc(d.platform) + '</div></td>' +
      '<td>' + esc(fmtStamp(d.firstSeenAt)) + '</td><td>' + esc(fmtStamp(d.lastSeenAt)) + (live ? ' ' + hrChip('Đang đăng nhập', 'green') : '') + '</td>' +
      '<td style="text-align:center;">' + (d.status === 'blocked' ? hrBadge('Đã chặn', 'da-huy') : hrBadge('Hoạt động', 'dang-ban')) +
        (d.status === 'blocked' ? '<div class="hint-inline">' + esc(d.blockNote || '') + ' · ' + esc(d.blockedBy || '') + '</div>' : '') + '</td>' +
      '<td class="row-actions">' + (d.status === 'blocked' ?
        '<button type="button" class="btn btn-sm" data-action="acUnblockDevice" data-args=\'["' + esc(d.id) + '"]\'>Mở chặn</button>' :
        '<button type="button" class="btn btn-sm" data-action="acOpenBlockModal" data-args=\'["' + esc(d.id) + '"]\'>Chặn</button>') + '</td></tr>';
  }).join('') || '<tr><td colspan="7" class="empty-state">Chưa có thiết bị nào trong sổ thiết bị (mỗi lần đăng nhập thành công từ trình duyệt mới sẽ thêm một dòng).</td></tr>';
  return acApprovalToolbar(false, false) +
    '<div class="hr-note">Mã thiết bị là cơ chế gây khó, không phải ràng buộc phần cứng: trên web, xóa cookie/dữ liệu trình duyệt thì thành thiết bị mới nên chặn thiết bị web chỉ có tác dụng yếu.</div>' +
    '<div class="sd-blocks"><div class="sd-section-block"><div class="sd-section-head">Sổ thiết bị đăng nhập</div>' +
    '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Tài khoản</th><th>Thiết bị</th><th>Thấy lần đầu</th><th>Lần cuối</th><th style="text-align:center;">Trạng thái</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
}
function acDeviceGuard(d) {
  if (!acHasPerm('approve_devices')) return 'Bạn không có quyền chặn/mở chặn thiết bị.';
  var me = hrActor(); if (me.isRoot) return '';
  if (d.username === me.username) return 'Không tự chặn hoặc mở chặn thiết bị của chính mình.';
  var acc = getAccountsList().find(function (a) { return a.username === d.username; });
  var st = acc ? hrStaffOfAccount(acc) : null;
  if (hrIsRootAccount(acc) || (st && hrIsProtectedStaff(st))) return 'Thiết bị của nhóm được bảo vệ chỉ admin gốc xử lý.';
  return '';
}
function acOpenBlockModal(id) {
  var d = acDeviceOf(id); if (!d) return;
  var g = acDeviceGuard(d); if (g) { showToast(g); return; }
  openAdminModal(
    '<h3>Chặn thiết bị ' + esc(d.label) + ' (@' + esc(d.username) + ')</h3>' +
    '<form class="admin-form" data-submit-action="acApplyBlock" data-args=\'["__event__","' + esc(d.id) + '"]\'>' +
      '<div class="fld"><label>Ghi chú <span class="req">*</span></label><textarea id="dvNote" required rows="3" placeholder="Vì sao chặn thiết bị này?"></textarea></div>' +
      '<div class="hint-inline">Chặn thiết bị sẽ thu hồi luôn phiên đang sống của thiết bị đó.</div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button><button type="submit" class="btn btn-danger">Chặn thiết bị</button></div>' +
    '</form>'
  );
}
function acApplyBlock(e, id) {
  e.preventDefault();
  var note = ($('dvNote') || {}).value.trim(); if (!note) { showToast('Nhập ghi chú.'); return; }
  var list = AuthLog.getDevices(), d = list.find(function (x) { return x.id === id; }); if (!d) return;
  var g = acDeviceGuard(d); if (g) { showToast(g); return; }
  d.status = 'blocked'; d.blockedBy = hrActor().username; d.blockedAt = Date.now(); d.blockNote = note;
  AuthLog.saveDevices(list);
  AuthLog.getSessions().filter(function (s) { return s.deviceId === id && !s.revokedAt; }).forEach(function (s) { AuthLog.revokeSession(s.id, 'device_blocked', d.blockedBy); });
  AuthLog.event('device_blocked', { username: d.username, deviceId: d.id, detail: { by: d.blockedBy, note: note } });
  hrLog('device_block', 'user_devices', d.id, 'Chặn thiết bị ' + d.label + ' của ' + d.username, { status: { old: 'active', new: 'blocked' } }, note);
  closeAdminModal(); showToast('Đã chặn thiết bị.'); acRender();
}
function acUnblockDevice(id) {
  var list = AuthLog.getDevices(), d = list.find(function (x) { return x.id === id; }); if (!d) return;
  var g = acDeviceGuard(d); if (g) { showToast(g); return; }
  d.status = 'active'; d.blockedBy = ''; d.blockedAt = 0; d.blockNote = '';
  AuthLog.saveDevices(list);
  AuthLog.event('device_unblocked', { username: d.username, deviceId: d.id, detail: { by: hrActor().username } });
  hrLog('device_unblock', 'user_devices', d.id, 'Mở chặn thiết bị ' + d.label + ' của ' + d.username, { status: { old: 'blocked', new: 'active' } });
  showToast('Đã mở chặn thiết bị.'); acRender();
}

function acRenderApprovalHistoryTab() {
  var list = AuthLog.getApprovals().filter(function (a) { return acApprovalMatches(a, APPROVAL_FILTERS); }).sort(function (a, b) { return b.requestedAt - a.requestedAt; });
  var rows = list.map(function (ap, i) {
    var dev = acDeviceOf(ap.deviceId), s = APPROVAL_STATUS[ap.status] || [ap.status, 'chua-chi-dinh'];
    return '<tr><td class="num">' + (i + 1) + '</td>' +
      '<td>' + esc(fmtStamp(ap.requestedAt)) + '</td>' +
      '<td><b>' + esc(acNameOf(ap.username)) + '</b><div class="mono hint-inline">@' + esc(ap.username) + '</div></td>' +
      '<td>' + esc(APPROVAL_KIND[ap.kind] || ap.kind) + '</td>' +
      '<td>' + (dev ? esc(dev.label) : '—') + '</td>' +
      '<td>' + hrBadge(s[0], s[1]) + '</td>' +
      '<td>' + (ap.decidedBy ? esc(ap.decidedBy) + '<div class="hint-inline">' + esc(fmtStamp(ap.decidedAt)) + '</div>' : '—') + '</td>' +
      '<td>' + esc(ap.decisionNote || '—') + '</td></tr>';
  }).join('') || '<tr><td colspan="8" class="empty-state">Chưa có yêu cầu duyệt nào.</td></tr>';
  return acApprovalToolbar(true, true) +
    '<div class="sd-blocks"><div class="sd-section-block"><div class="sd-section-head" style="display:flex; justify-content:space-between;"><span>Lịch sử duyệt đăng nhập (giữ vĩnh viễn)</span><span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + list.length + ' yêu cầu</span></div>' +
    '<div class="sd-table-wrap"><table class="admin-table"><thead><tr><th class="num">STT</th><th>Giờ yêu cầu</th><th>Nhân viên</th><th>Loại</th><th>Thiết bị</th><th>Trạng thái</th><th>Người quyết định</th><th>Ghi chú</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
}
