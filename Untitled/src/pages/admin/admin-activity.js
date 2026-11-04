/* =========================================================
   7. NHẬT KÝ HOẠT ĐỘNG (Hệ thống > Nhật ký hoạt động) — HR v3.1. Xem cần quyền view_activity_logs.
   Ba tab, hai nguồn, không trộn:
     1. Đăng nhập (phiên)   — user_sessions nối user_devices: mỗi dòng một phiên, có giờ vào, giờ ra, thiết bị, lý do kết thúc, thời lượng.
     2. Sự kiện đăng nhập   — auth_events: kể cả đăng nhập sai và bị chặn (tên gõ vào, thiết bị, detail.reason). Dùng để điều tra.
     3. Thao tác            — activity_logs: ai làm gì, trên phiên nào, thay đổi cũ -> mới (changes).
   Giữ tối thiểu log_retention_months (mặc định 12). Chỉ GHI THÊM; "Dọn nhật ký quá hạn" bỏ các dòng quá hạn trừ các action
   giữ vĩnh viễn (login_approve, login_reject, device_block, device_unblock). Phiên, thiết bị, yêu cầu duyệt không dọn theo thời gian.
   ========================================================= */
var ACT_TAB = 'actions';   // 'sessions' | 'events' | 'actions'
var ACT_FILTER = { search: '', entity: '', action: '', dateFrom: '', dateTo: '' };
var ACT_SES_FILTER = { search: '', device: '', reason: '', dateFrom: '', dateTo: '' };
var ACT_EV_FILTER = { search: '', type: '', dateFrom: '', dateTo: '' };

var ACT_PERMANENT = ['login_approve', 'login_reject', 'device_block', 'device_unblock'];
var ACT_ACTION_LABEL = {
  create: 'Tạo mới', update: 'Cập nhật', delete: 'Xóa', grant: 'Cấp quyền', revoke: 'Thu hồi', assign: 'Gán', status_change: 'Đổi trạng thái',
  type_change: 'Đổi loại nhân viên', station_change: 'Đổi trạm', scope_change: 'Đổi khu vực', account_lock: 'Khóa tài khoản', account_unlock: 'Mở khóa tài khoản',
  password_reset: 'Đặt lại mật khẩu', username_change: 'Đổi tên tài khoản',
  revoke_session: 'Thu hồi phiên', login_unlock: 'Mở khóa nhập sai', login_approve: 'Duyệt đăng nhập', login_reject: 'Từ chối đăng nhập',
  device_block: 'Chặn thiết bị', device_unblock: 'Mở chặn thiết bị'
};
var ACT_REVOKE_LABEL = {
  logout: 'Đăng xuất', logout_all: 'Đăng xuất mọi nơi', admin_revoke: 'Admin thu hồi', employee_status: 'Trạng thái nhân viên', password_changed: 'Đổi/đặt lại mật khẩu',
  account_locked: 'Tài khoản bị khóa', username_changed: 'Đổi tên tài khoản', expired: 'Hết hạn 12 giờ', idle_timeout: 'Không hoạt động', device_replaced: 'Đăng nhập thiết bị khác',
  device_blocked: 'Thiết bị bị chặn'
};
var ACT_EVENT_LABEL = {
  login_ok: 'Đăng nhập thành công', login_failed: 'Đăng nhập sai', login_blocked: 'Đăng nhập bị chặn', logout: 'Đăng xuất', logout_all: 'Đăng xuất mọi nơi',
  session_expired: 'Phiên hết hạn', session_revoked: 'Phiên bị thu hồi', password_changed: 'Đổi mật khẩu', password_reset: 'Đặt lại mật khẩu',
  account_locked: 'Khóa tài khoản', account_unlocked: 'Mở khóa tài khoản', username_changed: 'Đổi tên tài khoản', approval_requested: 'Xin duyệt đăng nhập',
  approval_approved: 'Duyệt đăng nhập', approval_rejected: 'Từ chối đăng nhập', device_blocked: 'Chặn thiết bị', device_unblocked: 'Mở chặn thiết bị'
};
var ACT_BLOCK_REASON = {
  employee_locked: 'Nhân viên nghỉ việc/tạm ngưng', manual_locked: 'Tài khoản bị khóa', failed_login_locked: 'Khóa do nhập sai',
  device_blocked: 'Thiết bị bị chặn', approval_pending: 'Đang chờ duyệt', approval_rejected: 'Vừa bị từ chối duyệt', approval_limit: 'Quá số yêu cầu chờ duyệt'
};

function actOpt(arr, cur, labelMap) {
  return '<option value="">Tất cả</option>' + arr.map(function (v) {
    return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc((labelMap && labelMap[v]) || v) + '</option>';
  }).join('');
}
function actDateOk(ts, from, to) {
  var d = toLocalDateStr(ts || 0);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
function actNameOf(username) {
  var acc = getAccountsList().find(function (a) { return a.username === username; });
  if (!acc) return '';
  var st = hrStaffOfAccount(acc);
  return st ? st.name : (acc.fullName || '');
}
function actDeviceOfSession(sid) {
  if (!sid) return null;
  var ses = AuthLog.getSessions().find(function (s) { return s.id === sid; });
  if (!ses) return null;
  var dev = AuthLog.getDevices().find(function (d) { return d.id === ses.deviceId; });
  return { session: ses, device: dev };
}
function setActTab(tab) { ACT_TAB = tab; renderActivityView(); }

function renderActivityView() {
  AuthLog.sweep();
  var tabBtn = function (key, label) {
    return '<button type="button" class="station-subtab' + (ACT_TAB === key ? ' active' : '') + '" data-action="setActTab" data-args=\'["' + key + '"]\'>' + esc(label) + '</button>';
  };
  var body = ACT_TAB === 'sessions' ? actRenderSessionsTab() : ACT_TAB === 'events' ? actRenderEventsTab() : actRenderActionsTab();
  var st = AuthLog.settings();
  $('viewActivity').innerHTML =
    '<div class="activity-shell">' +
      '<div class="station-subtabs">' + tabBtn('actions', 'Thao tác') + tabBtn('sessions', 'Đăng nhập (phiên)') + tabBtn('events', 'Sự kiện đăng nhập') + '</div>' +
      body +
      '<div class="hr-note" style="margin-top:14px;">Nhật ký giữ tối thiểu <b>' + st.logRetentionMonths + ' tháng</b>. Chỉ ghi thêm, không sửa. Phiên, thiết bị và lịch sử duyệt đăng nhập là bằng chứng kiểm soát nên không dọn theo thời gian. Ở bản demo, IP do máy chủ ghi nên chưa có.</div>' +
    '</div>';
}

/* =====================================================================
   TAB 3 — THAO TÁC (activity_logs)
   ===================================================================== */
function actActionClass(action) {
  var a = String(action || '').toLowerCase();
  if (/^(create|grant|assign|login_approve|device_unblock|account_unlock|login_unlock)/.test(a) || a.indexOf('create') !== -1 || a.indexOf('tạo') !== -1 || a.indexOf('bulk') !== -1) return 'dang-ban';
  if (/^(delete|revoke|account_lock|device_block|login_reject|revoke_session)/.test(a) || a.indexOf('delete') !== -1 || a.indexOf('xóa') !== -1 || a.indexOf('cancel') !== -1 || a.indexOf('hủy') !== -1) return 'da-huy';
  return 'chua-chi-dinh';
}
function actRenderActionsTab() {
  var rawList = FleetStore.getActivity();
  var items = rawList.map(function (x, i) { return { x: x, i: i }; }).reverse();
  var totalCount = items.length, createCount = 0, updateCount = 0, deleteCount = 0;
  items.forEach(function (it) {
    var cls = actActionClass(it.x && it.x.action);
    if (cls === 'dang-ban') createCount++; else if (cls === 'da-huy') deleteCount++; else updateCount++;
  });

  var entities = uniq(items.map(function (it) { return it.x.entity; }).filter(Boolean));
  var actions = uniq(items.map(function (it) { return it.x.action; }).filter(Boolean));
  var f = ACT_FILTER;

  var filtered = items.filter(function (it) {
    var x = it.x; if (!x) return false;
    if (f.entity && x.entity !== f.entity) return false;
    if (f.action && x.action !== f.action) return false;
    if (!actDateOk(x.ts, f.dateFrom, f.dateTo)) return false;
    if (f.search) {
      var hay = (fmtStamp(x.ts) + ' ' + (x.user || '') + ' ' + (x.action || '') + ' ' + (ACT_ACTION_LABEL[x.action] || '') + ' ' + (x.entity || '') + ' ' + (x.entityId || '') + ' ' + (x.summary || '')).toLowerCase();
      if (hay.indexOf(f.search.toLowerCase()) === -1) return false;
    }
    return true;
  });

  var rowsHtml = filtered.length ? filtered.map(function (it, idx) {
    var x = it.x, user = x.user || 'Quản trị viên', initial = String(user).charAt(0).toUpperCase();
    var ds = actDeviceOfSession(x.sessionId);
    var hasChanges = x.changes && Object.keys(x.changes).length;
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td><span style="font-family:\'Roboto Mono\', monospace; font-size:12.5px; color:var(--black); font-weight:600;">' + esc(fmtStamp(x.ts)) + '</span></td>' +
      '<td><div style="display:flex; align-items:center; gap:8px;">' +
        '<div style="width:28px; height:28px; border-radius:50%; background:#64748B; color:#fff; font-weight:800; display:grid; place-items:center; font-size:12px;">' + esc(initial) + '</div>' +
        '<span style="font-weight:700; color:var(--black);">' + esc(user) + '</span></div></td>' +
      '<td>' + hrBadge(ACT_ACTION_LABEL[x.action] || x.action || 'Hoạt động', actActionClass(x.action)) + '</td>' +
      '<td><span style="font-weight:700; color:var(--text-main);">' + esc(x.entity || '—') + '</span>' +
        (x.entityId ? ' <span class="mono" style="color:var(--text-sub); font-size:11.5px;">#' + esc(x.entityId) + '</span>' : '') + '</td>' +
      '<td style="line-height:1.4; color:var(--text-main);">' + esc(x.summary || '—') +
        (hasChanges ? ' <span class="hr-link" role="button" tabindex="0" data-action="actShowChanges" data-args=\'[' + it.i + ']\'>Xem thay đổi</span>' : '') + '</td>' +
      '<td>' + (ds ? '<div style="font-size:12.5px;font-weight:600;">' + esc(ds.device ? ds.device.label : 'Thiết bị không rõ') + '</div><div class="hint-inline">phiên từ ' + esc(fmtStamp(ds.session.createdAt)) + '</div>' : '<span class="hint-inline">' + (x.sessionId ? 'Phiên đã dọn' : 'Hệ thống / chưa gắn phiên') + '</span>') + '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-sub);">Chưa có hoạt động nào được ghi nhận.</td></tr>';

  var cur = ACT_FILTER;
  return '<div class="dir-stats-grid">' +
      '<div class="ref-card dir-stat-card"><div class="dir-stat-label">Tổng nhật ký thao tác</div><div class="dir-stat-val">' + totalCount + ' <span class="ref-unit">bản ghi</span></div><div class="dir-stat-sub">Lịch sử tác vụ quản trị</div></div>' +
      '<div class="ref-card dir-stat-card"><div class="dir-stat-label">Tạo mới, cấp, duyệt</div><div class="dir-stat-val" style="color:#059669;">' + createCount + ' <span class="ref-unit">tác vụ</span></div><div class="dir-stat-sub">Thêm nhân sự, cấp quyền, duyệt đăng nhập</div></div>' +
      '<div class="ref-card dir-stat-card"><div class="dir-stat-label">Cập nhật &amp; thay đổi</div><div class="dir-stat-val" style="color:var(--black);">' + updateCount + ' <span class="ref-unit">tác vụ</span></div><div class="dir-stat-sub">Đổi thông tin, loại, trạm, khu vực</div></div>' +
      '<div class="ref-card dir-stat-card ref-card-featured" style="min-height:auto;"><div class="ref-featured-head">Xóa, thu hồi, khóa</div><div class="dir-stat-val" style="font-size:26px;color:#fff;">' + deleteCount + ' <span class="ref-unit" style="color:#fff;">tác vụ</span></div><div class="ref-featured-sub">Khóa tài khoản, thu hồi phiên, chặn thiết bị</div></div>' +
    '</div>' +
    '<div class="filter-toolbar" style="margin-bottom:20px;">' +
      '<div class="filter-field"><label>Tìm kiếm nhật ký</label><input type="text" id="actSearch" value="' + esc(cur.search) + '" placeholder="Người thực hiện, hành động, đối tượng..." data-input-action="adminActFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đối tượng</label><select data-change-action="adminActFilterInput" data-args=\'["entity","__this_value__"]\'>' + actOpt(entities, cur.entity) + '</select></div>' +
      '<div class="filter-field"><label>Hành động</label><select data-change-action="adminActFilterInput" data-args=\'["action","__this_value__"]\'>' + actOpt(actions, cur.action, ACT_ACTION_LABEL) + '</select></div>' +
      '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(cur.dateFrom) + '" data-change-action="adminActFilterInput" data-args=\'["dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(cur.dateTo) + '" data-change-action="adminActFilterInput" data-args=\'["dateTo","__this_value__"]\'></div>' +
      '<button type="button" class="btn" data-action="adminResetActFilters">Đặt lại</button>' +
      '<div class="filter-spacer"></div>' +
      '<button type="button" class="btn btn-secondary" data-action="adminPurgeActivityLogs">Dọn nhật ký quá hạn</button>' +
    '</div>' +
    '<div class="ref-card" style="padding:0; overflow:hidden;">' +
      '<div class="ref-card-header" style="padding:18px 22px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">' +
        '<div style="font-size:15px; font-weight:800; color:var(--black);">Nhật ký thao tác</div>' +
        '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">Hiển thị ' + filtered.length + ' / ' + totalCount + ' bản ghi</div>' +
      '</div>' +
      '<div class="table-wrap" style="border:0; border-radius:0; box-shadow:none;"><table class="admin-table" style="min-width:1340px;"><thead><tr>' +
        '<th style="width:50px; text-align:center;">STT</th><th style="width:150px;">Thời gian</th><th style="width:160px;">Người thực hiện</th>' +
        '<th style="width:170px;">Hành động</th><th style="width:190px;">Đối tượng (bảng)</th><th style="min-width:300px;">Tóm tắt chi tiết</th><th style="width:190px;">Phiên / thiết bị</th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
    '</div>';
}

function actShowChanges(rawIdx) {
  var x = FleetStore.getActivity()[rawIdx]; if (!x) return;
  var ch = x.changes || {};
  var fmtVal = function (v) {
    if (v == null || v === '') return '<span class="hint-inline">—</span>';
    if (typeof v === 'object') return '<span class="mono" style="font-size:12px;">' + esc(JSON.stringify(v)) + '</span>';
    return esc(String(v));
  };
  var rows = Object.keys(ch).map(function (k) {
    var v = ch[k];
    if (v && typeof v === 'object' && ('old' in v || 'new' in v)) {
      return '<tr><td class="mono"><b>' + esc(k) + '</b></td><td>' + fmtVal(v.old) + '</td><td>' + fmtVal(v.new) + '</td></tr>';
    }
    return '<tr><td class="mono"><b>' + esc(k) + '</b></td><td colspan="2">' + fmtVal(v) + '</td></tr>';
  }).join('');
  openAdminModal(
    '<h3>Chi tiết thay đổi</h3>' +
    '<div class="admin-form hr-form">' +
      '<div class="hr-summary">' +
        '<div><span>Thời gian</span><b>' + esc(fmtStamp(x.ts)) + '</b></div><div><span>Người thực hiện</span><b>' + esc(x.user || '—') + '</b></div>' +
        '<div><span>Hành động</span><b>' + esc(ACT_ACTION_LABEL[x.action] || x.action) + '</b></div><div><span>Đối tượng</span><b>' + esc(x.entity || '—') + (x.entityId ? ' #' + esc(x.entityId) : '') + '</b></div>' +
      '</div>' +
      '<div class="fld" style="margin-top:12px;"><label>' + esc(x.summary || '') + '</label></div>' +
      '<div class="sd-table-wrap"><table class="admin-table hr-mini-table"><thead><tr><th>Trường</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Đóng</button></div>' +
    '</div>',
    true
  );
}

function adminActFilterInput(field, val) {
  if (!(field in ACT_FILTER)) return;
  ACT_FILTER[field] = val || '';
  adminKeepFocus(renderActivityView);
}
function adminResetActFilters() {
  ACT_FILTER = { search: '', entity: '', action: '', dateFrom: '', dateTo: '' };
  renderActivityView();
}

// Dọn nhật ký quá hạn: nhật ký thao tác và sự kiện đăng nhập cũ hơn log_retention_months, trừ action giữ vĩnh viễn.
function adminPurgeActivityLogs() {
  if (!hrActor().isRoot) { showToast('Chỉ admin gốc dọn nhật ký.'); return; }
  var months = AuthLog.settings().logRetentionMonths;
  var cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
  var cut = cutoff.getTime();
  var acts = FleetStore.getActivity(), evs = AuthLog.getEvents();
  var keepActs = acts.filter(function (x) { return x.ts >= cut || ACT_PERMANENT.indexOf(x.action) !== -1; });
  var keepEvs = evs.filter(function (e) { return e.ts >= cut; });
  var nA = acts.length - keepActs.length, nE = evs.length - keepEvs.length;
  if (!nA && !nE) { showToast('Chưa có nhật ký nào quá ' + months + ' tháng để dọn.'); return; }
  if (!confirm('Dọn ' + nA + ' dòng nhật ký thao tác và ' + nE + ' sự kiện đăng nhập cũ hơn ' + months + ' tháng? (Giữ vĩnh viễn: duyệt/từ chối đăng nhập, chặn/mở chặn thiết bị.)')) return;
  FleetStore.setActivity(keepActs);
  localStorage.setItem(HN_AUTH_EVENTS_KEY, JSON.stringify(keepEvs));
  showToast('Đã dọn ' + nA + ' dòng thao tác và ' + nE + ' sự kiện đăng nhập.');
  renderActivityView();
}

/* =====================================================================
   TAB 1 — ĐĂNG NHẬP (phiên)
   ===================================================================== */
function actRenderSessionsTab() {
  var f = ACT_SES_FILTER, devices = AuthLog.getDevices();
  var devMap = {}; devices.forEach(function (d) { devMap[d.id] = d; });
  var kw = f.search.toLowerCase();
  var list = AuthLog.getSessions().slice().reverse().filter(function (s) {
    if (kw && (s.username + ' ' + actNameOf(s.username)).toLowerCase().indexOf(kw) === -1) return false;
    if (f.device && s.deviceId !== f.device) return false;
    if (f.reason === '__live__' ? s.revokedAt : (f.reason && s.revokeReason !== f.reason)) return false;
    return actDateOk(s.createdAt, f.dateFrom, f.dateTo);
  });
  var rows = list.length ? list.map(function (s, i) {
    var d = devMap[s.deviceId];
    var end = s.revokedAt || 0;
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (i + 1) + '</td>' +
      '<td><b class="mono">' + esc(s.username) + '</b></td>' +
      '<td>' + esc(actNameOf(s.username) || '—') + '</td>' +
      '<td>' + (d ? '<b>' + esc(d.label) + '</b><div class="hint-inline">' + esc(d.platform) + '</div>' : '—') + '</td>' +
      '<td class="mono">' + esc(s.ip || '—') + '</td>' +
      '<td class="mono">' + esc(fmtStamp(s.createdAt)) + '</td>' +
      '<td class="mono">' + (end ? esc(fmtStamp(end)) : hrChip('Đang hoạt động', 'green')) + '</td>' +
      '<td>' + (end ? esc(ACT_REVOKE_LABEL[s.revokeReason] || s.revokeReason || '—') : '—') + '</td>' +
      '<td>' + esc(hrDurationText(s.createdAt, end || Date.now())) + '</td>' +
      '<td class="mono">' + esc(fmtStamp(s.lastSeenAt)) + '</td>' +
      '<td class="row-actions"><button type="button" class="btn btn-sm" data-action="actShowSessionEvents" data-args=\'["' + esc(s.id) + '"]\'>Chuỗi sự kiện</button></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="11" class="empty-state">Chưa có phiên đăng nhập nào được ghi nhận. Phiên được ghi từ lần đăng nhập kế tiếp.</td></tr>';
  return '<div class="filter-toolbar" style="margin-bottom:20px;">' +
      '<div class="filter-field"><label>Tài khoản / họ tên</label><input type="text" id="sesSearch" value="' + esc(f.search) + '" placeholder="Tên đăng nhập hoặc họ tên..." data-input-action="actSesFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Thiết bị</label><select data-change-action="actSesFilterInput" data-args=\'["device","__this_value__"]\'><option value="">Tất cả thiết bị</option>' +
        devices.map(function (d) { return '<option value="' + esc(d.id) + '"' + (f.device === d.id ? ' selected' : '') + '>' + esc(d.username + ' · ' + d.label) + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-field"><label>Lý do kết thúc</label><select data-change-action="actSesFilterInput" data-args=\'["reason","__this_value__"]\'><option value="">Tất cả</option>' +
        '<option value="__live__"' + (f.reason === '__live__' ? ' selected' : '') + '>Đang hoạt động</option>' +
        Object.keys(ACT_REVOKE_LABEL).map(function (k) { return '<option value="' + k + '"' + (f.reason === k ? ' selected' : '') + '>' + esc(ACT_REVOKE_LABEL[k]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(f.dateFrom) + '" data-change-action="actSesFilterInput" data-args=\'["dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(f.dateTo) + '" data-change-action="actSesFilterInput" data-args=\'["dateTo","__this_value__"]\'></div>' +
      '<button type="button" class="btn" data-action="actResetSesFilter">Đặt lại</button>' +
    '</div>' +
    '<div class="ref-card" style="padding:0; overflow:hidden;">' +
      '<div class="ref-card-header" style="padding:18px 22px; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between;"><div style="font-size:15px; font-weight:800;">Nhật ký đăng nhập theo phiên</div>' +
      '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">' + list.length + ' phiên</div></div>' +
      '<div class="table-wrap" style="border:0; border-radius:0; box-shadow:none;"><table class="admin-table" style="min-width:1200px;"><thead><tr>' +
        '<th style="width:50px;">STT</th><th>Tài khoản</th><th>Họ tên</th><th>Thiết bị</th><th>IP</th><th>Giờ đăng nhập</th><th>Giờ kết thúc</th><th>Lý do kết thúc</th><th>Thời lượng</th><th>Hoạt động cuối</th><th class="th-actions">Chi tiết</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}
function actSesFilterInput(field, val) { if (!(field in ACT_SES_FILTER)) return; ACT_SES_FILTER[field] = val || ''; adminKeepFocus(renderActivityView); }
function actResetSesFilter() { ACT_SES_FILTER = { search: '', device: '', reason: '', dateFrom: '', dateTo: '' }; renderActivityView(); }

function actEventDetailText(e) {
  var d = e.detail || {}, parts = [];
  if (d.reason) parts.push(ACT_BLOCK_REASON[d.reason] || ACT_REVOKE_LABEL[d.reason] || d.reason);
  if (d.old) parts.push(d.old + ' → ' + d.new);
  if (d.by) parts.push('bởi ' + d.by);
  if (d.note) parts.push('"' + d.note + '"');
  if (d.approval_id) parts.push('duyệt #' + String(d.approval_id).slice(-6));
  return parts.join(' · ') || '—';
}
function actEventRow(e, i, devMap) {
  var d = devMap[e.deviceId];
  var bad = e.eventType === 'login_failed' || e.eventType === 'login_blocked';
  return '<tr>' +
    '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (i + 1) + '</td>' +
    '<td class="mono">' + esc(fmtStamp(e.ts)) + '</td>' +
    '<td class="mono"><b>' + esc(e.username || '—') + '</b></td>' +
    '<td>' + hrBadge(ACT_EVENT_LABEL[e.eventType] || e.eventType, bad ? 'da-huy' : e.eventType === 'login_ok' ? 'dang-ban' : 'chua-chi-dinh') + '</td>' +
    '<td>' + (d ? esc(d.label) : '<span class="hint-inline">—</span>') + '</td>' +
    '<td>' + esc(actEventDetailText(e)) + '</td></tr>';
}
function actRenderEventsTab() {
  var f = ACT_EV_FILTER, devMap = {};
  AuthLog.getDevices().forEach(function (d) { devMap[d.id] = d; });
  var kw = f.search.toLowerCase();
  var list = AuthLog.getEvents().slice().reverse().filter(function (e) {
    if (kw && (e.username || '').toLowerCase().indexOf(kw) === -1) return false;
    if (f.type && e.eventType !== f.type) return false;
    return actDateOk(e.ts, f.dateFrom, f.dateTo);
  });
  var rows = list.length ? list.map(function (e, i) { return actEventRow(e, i, devMap); }).join('') : '<tr><td colspan="6" class="empty-state">Chưa có sự kiện đăng nhập nào.</td></tr>';
  var failed = list.filter(function (e) { return e.eventType === 'login_failed'; }).length;
  var blocked = list.filter(function (e) { return e.eventType === 'login_blocked'; }).length;
  return '<div class="filter-toolbar" style="margin-bottom:20px;">' +
      '<div class="filter-field"><label>Tên đăng nhập</label><input type="text" id="evSearch" value="' + esc(f.search) + '" placeholder="Kể cả tên gõ sai hoặc không tồn tại..." data-input-action="actEvFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Sự kiện</label><select data-change-action="actEvFilterInput" data-args=\'["type","__this_value__"]\'>' + actOpt(Object.keys(ACT_EVENT_LABEL), f.type, ACT_EVENT_LABEL) + '</select></div>' +
      '<div class="filter-field"><label>Từ ngày</label><input type="date" value="' + esc(f.dateFrom) + '" data-change-action="actEvFilterInput" data-args=\'["dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày</label><input type="date" value="' + esc(f.dateTo) + '" data-change-action="actEvFilterInput" data-args=\'["dateTo","__this_value__"]\'></div>' +
      '<button type="button" class="btn" data-action="actResetEvFilter">Đặt lại</button>' +
    '</div>' +
    '<div class="ref-card" style="padding:0; overflow:hidden;">' +
      '<div class="ref-card-header" style="padding:18px 22px; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between;"><div style="font-size:15px; font-weight:800;">Sự kiện đăng nhập (auth_events)</div>' +
      '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">' + list.length + ' sự kiện · ' + failed + ' đăng nhập sai · ' + blocked + ' bị chặn</div></div>' +
      '<div class="table-wrap" style="border:0; border-radius:0; box-shadow:none;"><table class="admin-table" style="min-width:1000px;"><thead><tr>' +
        '<th style="width:50px;">STT</th><th style="width:150px;">Thời gian</th><th style="width:170px;">Tên đăng nhập</th><th style="width:200px;">Sự kiện</th><th style="width:190px;">Thiết bị</th><th>Chi tiết</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}
function actEvFilterInput(field, val) { if (!(field in ACT_EV_FILTER)) return; ACT_EV_FILTER[field] = val || ''; adminKeepFocus(renderActivityView); }
function actResetEvFilter() { ACT_EV_FILTER = { search: '', type: '', dateFrom: '', dateTo: '' }; renderActivityView(); }

// Chuỗi sự kiện của một phiên (login_ok, logout, session_expired...).
function actShowSessionEvents(sid) {
  var ses = AuthLog.getSessions().find(function (s) { return s.id === sid; }); if (!ses) return;
  var devMap = {}; AuthLog.getDevices().forEach(function (d) { devMap[d.id] = d; });
  var evs = AuthLog.getEvents().filter(function (e) { return e.sessionId === sid; });
  var rows = evs.map(function (e, i) { return actEventRow(e, i, devMap); }).join('') || '<tr><td colspan="6" class="empty-state">Không có sự kiện nào gắn với phiên này.</td></tr>';
  openAdminModal(
    '<h3>Chuỗi sự kiện của phiên ' + esc(ses.username) + '</h3>' +
    '<div class="admin-form hr-form"><div class="sd-table-wrap"><table class="admin-table hr-mini-table"><thead><tr><th>STT</th><th>Thời gian</th><th>Tên đăng nhập</th><th>Sự kiện</th><th>Thiết bị</th><th>Chi tiết</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Đóng</button></div></div>', true);
}
