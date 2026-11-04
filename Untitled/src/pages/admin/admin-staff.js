/* =========================================================
   5. QUẢN LÝ NHÂN VIÊN (HR v3.1) — bảng employees + employee_stations + employee_scope_regions +
      employee_type_history + employee_status_history (lịch sử nằm trong staff.history). Không còn lịch ca (v3.0).
   Hồ sơ lưu ở FleetStore.getStaff() (localStorage). Trường: id, code (NV00001...), name, phone, email, address, role (= mã loại),
   license + licenseExpiry, hiredDate, leftDate, statusCode, stations[] + station (trạm chính), regions[], note, history[].
   Phạm vi xem dữ liệu = trạm gán lẻ HỢP trạm của khu vực được gán (hrScope, admin-hr-common.js); KHÔNG phụ thuộc loại nhân viên.
   Không xoá nhân viên (dùng trạng thái Nghỉ việc); không còn ô nhập Mã NV hay Tài khoản (tài khoản tạo ở trang Tài khoản).
   ========================================================= */
var STAFF_FILTERS = { search: '', role: '', status: '', station: '', region: '' };

// Tên cũ, vẫn còn nơi khác trong admin gọi: nhãn loại + danh sách loại.
function getStaffRoleList() { return FleetStore.getStaffRoles(); }
function roleLabel(r) { return hrRoleLabel(r); }
function roleBadge(r) {
  if (r === 'admin') return hrChip('Quản trị gốc', 'red');
  var c = hrCrewRole(r);
  var tone = (c === 'route_driver' || c === 'shuttle_driver') ? 'red' : c === 'helper' ? 'green' : 'blue';
  return hrChip(hrRoleLabel(r), tone);
}

// Mã NV mới = 'NV' + số thứ tự (tối thiểu 5 chữ số), một dãy chung không theo loại. Lấy số lớn nhất đang có + 1.
function smNextEmployeeCode() {
  var max = 0;
  FleetStore.getStaff().forEach(function (s) {
    var m = /^NV(\d+)$/.exec(s.code || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var n = max + 1;
  return 'NV' + (n < 100000 ? ('00000' + n).slice(-5) : String(n));
}

function smStationSummary(s) {
  var st = s.stations || [];
  if (!st.length) return '';
  var primary = s.station || st[0];
  return esc(primary) + (st.length > 1 ? ' <span class="hint-inline">+' + (st.length - 1) + '</span>' : '');
}
function smRegionSummary(s) {
  var rg = s.regions || [];
  if (!rg.length) return '';
  return esc(hrRegionName(rg[0])) + (rg.length > 1 ? ' <span class="hint-inline">+' + (rg.length - 1) + '</span>' : '');
}
function smLicenseCell(s) {
  if (!s.license && !s.licenseExpiry) return '—';
  var out = esc(s.license || '—');
  if (s.licenseExpiry) {
    var days = Math.floor((new Date(s.licenseExpiry + 'T00:00:00') - Date.now()) / 86400000);
    var warn = days < 0 ? hrChip('Hết hạn', 'red') : days <= 30 ? hrChip('Còn ' + days + ' ngày', 'amber') : '';
    out += '<div class="hint-inline">HH ' + esc(fmtDate(s.licenseExpiry)) + ' ' + warn + '</div>';
  }
  return out;
}

function renderStaffView() {
  var all = FleetStore.getStaff();
  var f = STAFF_FILTERS;
  var kw = f.search.toLowerCase();

  var filtered = all.filter(function (s) {
    if (kw) {
      var hay = ((s.name || '') + ' ' + (s.code || '') + ' ' + (s.phone || '') + ' ' + (s.username || '') + ' ' + (s.email || '')).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    if (f.role && s.role !== f.role) return false;
    if (f.status && hrStaffStatus(s) !== f.status) return false;
    var st = s.stations || [], rg = s.regions || [];
    if (f.station === '__none__' || f.region === '__none__') { if (st.length || rg.length) return false; }
    else {
      if (f.station && st.indexOf(f.station) === -1) return false;
      if (f.region && rg.indexOf(f.region) === -1) return false;
    }
    return true;
  });

  var rows = filtered.length ? filtered.map(function (s, i) {
    var isRoot = s.role === 'admin';
    var status = hrStaffStatus(s);
    var scope = hrScope(s);
    var acc = hrAccountOfStaff(s);
    return '<tr class="' + (hrStatusLocks(status) ? 'sch-row-deleted' : '') + '">' +
      '<td class="col-stt">' + (i + 1) + '</td>' +
      '<td><span class="trip-plate-inline" style="font-size:12.5px;padding:3px 9px;">' + esc(s.code || '—') + '</span></td>' +
      '<td>' +
        '<div style="font-weight:800;font-size:14px;color:var(--black);">' + esc(s.name || '—') + '</div>' +
        (s.username ? '<div style="font-size:12px;color:var(--text-sub);font-weight:600;">@' + esc(s.username) + '</div>' : '<div class="hint-inline">Chưa có tài khoản</div>') +
      '</td>' +
      '<td>' + roleBadge(s.role) + '</td>' +
      '<td style="font-weight:700;color:var(--text-main);">' + esc(s.phone || '—') + '</td>' +
      '<td style="font-weight:600;color:var(--text-sub);">' + smLicenseCell(s) + '</td>' +
      '<td style="font-weight:600;color:var(--text-main);">' + (isRoot ? '<span class="hint-inline">Mọi khu vực</span>' : (hrIsSelfKind(s.role) ? '<span class="hint-inline">Chỉ dữ liệu của mình</span>' : (smRegionSummary(s) || '—'))) + '</td>' +
      '<td style="font-weight:600;color:var(--text-main);">' + (smStationSummary(s) || '—') +
        (!isRoot && !hrIsSelfKind(s.role) ? '<div class="hint-inline">Xem được ' + (scope.viewAll ? 'mọi trạm' : scope.names.length + ' trạm') + '</div>' : '') + '</td>' +
      '<td class="col-status" style="text-align:center;">' + (hrStatusLocks(status) ? hrBadge(hrStatusName(status), 'da-huy') : hrBadge(hrStatusName(status), 'dang-ban')) + '</td>' +
      '<td class="row-actions">' + (isRoot ? hrChip('Chỉ đọc', 'gray') :
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStaffRowMenu" data-args=\'["__this__","' + esc(s.id) + '",' + (acc ? 'true' : 'false') + ']\'>Cập nhật <span class="row-menu-caret">▾</span></button>') +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="10" class="empty-state">Không tìm thấy nhân viên phù hợp.</td></tr>';

  var statuses = FleetStore.getEmploymentStatuses();
  var stationOpts = FleetStore.getStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); });

  $('viewStaff').innerHTML =
    '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search">' +
        '<label>Tìm kiếm nhân viên</label>' +
        '<input type="text" id="smSearch" value="' + esc(f.search) + '" placeholder="Họ tên, mã, SĐT, email, tài khoản..." data-input-action="adminStaffFilterInput" data-args=\'["search","__this_value__"]\'>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Loại nhân viên</label>' +
        '<select data-change-action="adminStaffFilterInput" data-args=\'["role","__this_value__"]\'>' +
          '<option value="">Tất cả loại</option>' +
          getStaffRoleList().map(function (r) { return '<option value="' + esc(r.key) + '"' + (f.role === r.key ? ' selected' : '') + '>' + esc(r.label) + (r.active ? '' : ' (ngừng dùng)') + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Trạng thái</label>' +
        '<select data-change-action="adminStaffFilterInput" data-args=\'["status","__this_value__"]\'>' +
          '<option value="">Tất cả trạng thái</option>' +
          statuses.map(function (st) { return '<option value="' + esc(st.code) + '"' + (f.status === st.code ? ' selected' : '') + '>' + esc(st.name) + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Trạm</label>' +
        '<select data-change-action="adminStaffFilterInput" data-args=\'["station","__this_value__"]\'>' +
          '<option value="">Tất cả trạm</option>' +
          '<option value="__none__"' + (f.station === '__none__' ? ' selected' : '') + '>Chưa gán trạm hoặc khu vực</option>' +
          stationOpts.map(function (st) { return '<option value="' + esc(st.name) + '"' + (f.station === st.name ? ' selected' : '') + '>' + esc(st.name) + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Khu vực</label>' +
        '<select data-change-action="adminStaffFilterInput" data-args=\'["region","__this_value__"]\'>' +
          '<option value="">Tất cả khu vực</option>' +
          getRegionMeta().map(function (m) { return '<option value="' + esc(m[0]) + '"' + (f.region === m[0] ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn sd-btn" data-action="adminResetStaffFilters">Đặt lại</button>' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStaffModal" data-args=\'[""]\'>Thêm nhân viên mới</button>' +
      '</div>' +
    '</div>' +

    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span>Danh sách đội ngũ nhân sự</span>' +
        '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">Hiển thị ' + filtered.length + ' / ' + all.length + ' nhân viên</span>' +
      '</div>' +
      '<div class="sd-table-wrap">' +
        '<table class="admin-table staff-table">' +
          '<thead><tr>' +
            '<th class="col-stt">STT</th><th>Mã NV</th><th>Họ tên &amp; Tài khoản</th><th>Loại nhân viên</th><th>SĐT liên hệ</th><th>Bằng lái</th>' +
            '<th>Khu vực được xem</th><th>Trạm</th><th class="col-status" style="text-align:center;">Trạng thái</th><th class="th-actions">Thao tác</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div></div>';
}

// Cột "Thao tác" — dropdown nổi (adminOpenRowMenu ở admin-station-directory.js). Không có nút Xoá: nhân viên nghỉ việc dùng trạng thái.
function adminStaffRowMenu(btn, id, hasAccount) {
  adminOpenRowMenu(btn, 'staff:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStaffModal" data-args=\'["' + esc(id) + '"]\'>Sửa hồ sơ</button>' +
    (hasAccount ? '' : '<button type="button" class="admin-row-menu-item" data-action="smCreateAccountFor" data-args=\'["' + esc(id) + '"]\'>Tạo tài khoản</button>'));
}
function adminStaffFilterInput(field, val) {
  if (!(field in STAFF_FILTERS)) return;
  STAFF_FILTERS[field] = val || '';
  // "Chưa gán trạm hoặc khu vực" áp cho cả hai bộ lọc: chọn ở ô Trạm thì ô Khu vực về tất cả.
  if (field === 'station' && val === '__none__') STAFF_FILTERS.region = '';
  adminKeepFocus(renderStaffView);
}
function adminResetStaffFilters() {
  STAFF_FILTERS = { search: '', role: '', status: '', station: '', region: '' };
  renderStaffView();
}

/* =====================================================================
   MODAL THÊM / SỬA NHÂN VIÊN
   ===================================================================== */
var SM_EDIT_ID = '';   // id nhân viên đang sửa ('' = thêm mới)

function smStationChecklistHtml(selected) {
  var byRegion = {};
  hrActiveStations().forEach(function (st) { (byRegion[st.region || ''] = byRegion[st.region || ''] || []).push(st); });
  var keys = Object.keys(byRegion);
  if (!keys.length) return '<div class="hint-inline">Chưa có trạm nào. Thêm ở Quản lý &gt; Trạm xe.</div>';
  return keys.map(function (rk) {
    return '<div class="hr-check-group"><div class="hr-check-group-title">' + esc(hrRegionName(rk) || 'Chưa có khu vực') + '</div>' +
      hrCheckListHtml('smStations_' + rk, byRegion[rk].map(function (st) {
        return { value: st.name, label: st.name, checked: selected.indexOf(st.name) !== -1, attrs: 'class="sm-station" data-change-action="smRefreshScope"' };
      })) + '</div>';
  }).join('');
}
function smRegionChecklistHtml(selected) {
  var items = getRegionMeta().map(function (m) {
    var n = hrStationsOfRegion(m[0]).length;
    return { value: m[0], label: m[1], sub: n + ' trạm', checked: selected.indexOf(m[0]) !== -1, attrs: 'class="sm-region" data-change-action="smRefreshScope"' };
  });
  return hrCheckListHtml('smRegions', items, 'Chưa có khu vực nào.');
}
function smReadStations() {
  return Array.prototype.map.call(document.querySelectorAll('#smStationBox .sm-station:checked'), function (c) { return c.value; });
}
function smReadRegions() {
  return Array.prototype.map.call(document.querySelectorAll('#smRegions .sm-region:checked'), function (c) { return c.value; });
}

function adminOpenStaffModal(id) {
  var all = FleetStore.getStaff();
  var s = id ? all.find(function (x) { return x.id === id; }) : null;
  if (id && !s) return;
  var chk = hrCanEditStaff(s); if (!chk.ok) { showToast(chk.reason); return; }
  SM_EDIT_ID = s ? s.id : '';
  var roles = getStaffRoleList().filter(function (r) { return r.active || (s && s.role === r.key); });
  var curRole = s ? s.role : (roles[0] ? roles[0].key : '');
  var acc = s ? hrAccountOfStaff(s) : null;
  var statuses = FleetStore.getEmploymentStatuses();
  var status = s ? hrStaffStatus(s) : 'working';
  var hist = s ? (s.history || []).slice(-8).reverse() : [];

  openAdminModal(
    '<h3>' + (s ? 'Sửa hồ sơ nhân viên' : 'Thêm nhân viên mới') + '</h3>' +
    '<form class="admin-form hr-form" data-submit-action="adminSaveStaff" data-args=\'["__event__"]\'>' +
      hrSectionHtml('Thông tin cơ bản',
        '<div class="fld-row">' +
          '<div class="fld"><label>Họ tên nhân viên <span class="req">*</span></label><input id="smName" required value="' + (s ? esc(s.name || '') : '') + '" placeholder="VD: Nguyễn Văn A"></div>' +
          '<div class="fld"><label>Mã nhân viên</label><input id="smCode" readonly disabled value="' + (s ? esc(s.code || '') : '') + '" placeholder="Hệ thống tự cấp (NV00001...)"></div>' +
        '</div>' +
        '<div class="fld"><label>Loại nhân viên <span class="req">*</span></label><select id="smRole" data-change-action="smOnRoleChange">' +
          roles.map(function (r) { return '<option value="' + esc(r.key) + '"' + (r.key === curRole ? ' selected' : '') + '>' + esc(r.label) + (r.active ? '' : ' (ngừng dùng)') + '</option>'; }).join('') +
        '</select><span class="hint-inline" id="smRoleHint"></span></div>' +
        '<div class="fld-row">' +
          '<div class="fld"><label>Số điện thoại</label><input id="smPhone" value="' + (s ? esc(s.phone || '') : '') + '" placeholder="VD: 0912345678"></div>' +
          '<div class="fld"><label>Email</label><input type="email" id="smEmail" value="' + (s ? esc(s.email || '') : '') + '" placeholder="ten@huenghia.vn"></div>' +
        '</div>' +
        '<div class="fld-row">' +
          '<div class="fld"><label>Địa chỉ</label><input id="smAddress" value="' + (s ? esc(s.address || '') : '') + '"></div>' +
          '<div class="fld"><label>Ngày vào làm</label><input type="date" id="smHired" value="' + (s ? esc(s.hiredDate || '') : todayISO()) + '"></div>' +
        '</div>') +

      '<div id="smLicenseBox">' + hrSectionHtml('Bằng lái xe',
        '<div class="fld-row">' +
          '<div class="fld"><label>Hạng bằng lái <span class="req" id="smLicReq">*</span></label><input id="smLicense" value="' + (s ? esc(s.license || '') : '') + '" placeholder="VD: D, E, FC"></div>' +
          '<div class="fld"><label>Hạn bằng lái <span class="req" id="smLicExpReq">*</span></label><input type="date" id="smLicenseExpiry" value="' + (s ? esc(s.licenseExpiry || '') : '') + '"></div>' +
        '</div>', 'Bắt buộc với loại có cờ Bắt buộc bằng lái') + '</div>' +

      hrSectionHtml('Trạm và phạm vi xem dữ liệu',
        '<div class="hr-note" id="smSelfNote" style="display:none;">Loại này chỉ xem dữ liệu của <b>chính mình</b> (app tự lọc). Trạm bên dưới chỉ để lọc danh sách khi xếp xe, phơi; không có ô Khu vực.</div>' +
        '<div class="fld"><label>Trạm làm việc (chọn nhiều)</label><div id="smStationBox">' + smStationChecklistHtml(s ? (s.stations || []) : []) + '</div></div>' +
        '<div class="fld"><label>Trạm chính</label><select id="smPrimary"></select></div>' +
        '<div class="fld" id="smRegionFld"><label>Khu vực được xem</label>' + smRegionChecklistHtml(s ? (s.regions || []) : []) +
          '<span class="hint-inline">Xem dữ liệu mọi trạm active của khu vực; khu vực có trạm mới thì tự thấy. Dùng cùng lúc với ô Trạm được.</span></div>' +
        '<div class="hr-note" id="smScopeSummary"></div>') +

      hrSectionHtml('Trạng thái làm việc',
        '<div class="fld-row">' +
          '<div class="fld"><label>Trạng thái</label><select id="smStatus" data-change-action="smOnStatusChange">' +
            statuses.map(function (st) { return '<option value="' + esc(st.code) + '"' + (st.code === status ? ' selected' : '') + '>' + esc(st.name) + (st.locksAccount ? ' (khóa đăng nhập)' : '') + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="fld" id="smLeftFld"><label>Ngày nghỉ việc <span class="req">*</span></label><input type="date" id="smLeftDate" value="' + (s ? esc(s.leftDate || '') : '') + '"></div>' +
        '</div>') +

      hrSectionHtml('Lý do & ghi chú',
        '<div class="fld"><label>Lý do thay đổi <span class="req" id="smReasonReq" style="display:none;">*</span></label><input id="smReason" placeholder="Một ô duy nhất, áp cho mọi thay đổi trong lần lưu này">' +
          '<span class="hint-inline">Bắt buộc khi đổi loại, trạm, khu vực hoặc đổi sang trạng thái khác Đang làm việc.</span></div>' +
        '<div class="fld"><label>Ghi chú</label><input id="smNote" value="' + (s ? esc(s.note || '') : '') + '"></div>') +

      hrSectionHtml('Tài khoản đăng nhập',
        '<div class="hr-readonly">' + (acc ? '<span class="mono" style="font-weight:700;">@' + esc(acc.username) + '</span> ' + (acc.active === false ? hrChip('Đã khóa', 'red') : hrChip('Hoạt động', 'green')) :
          (s ? 'Chưa có tài khoản. Tạo ở trang Tài khoản, hoặc bấm <b>Thao tác &gt; Tạo tài khoản</b> trong danh sách.' : 'Tạo nhân viên trước, sau đó tạo tài khoản (không nhập tên đăng nhập ở form này).')) + '</div>') +

      (hist.length ? hrSectionHtml('Lịch sử thay đổi gần đây', '<div class="hr-history">' + hist.map(function (h) {
        return '<div class="hr-history-row"><span class="mono">' + esc(fmtStamp(h.ts)) + '</span><b>' + esc(h.label) + '</b> ' + esc(h.from || '—') + ' → ' + esc(h.to || '—') +
          (h.reason ? ' <em>(' + esc(h.reason) + ')</em>' : '') + ' <span class="hint-inline">bởi ' + esc(h.by || '—') + '</span></div>';
      }).join('') + '</div>') : '') +

      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu thông tin</button></div>' +
    '</form>',
    true
  );
  smOnRoleChange();
  smOnStatusChange();
  smRefreshScope();
}

// Đổi loại: cập nhật ô bằng lái (bắt buộc?), ô khu vực (ẩn với loại is_self), gợi ý vai trò trên xe và quyền.
function smOnRoleChange() {
  var sel = $('smRole'); if (!sel) return;
  var key = sel.value, role = hrRole(key);
  var needLic = hrNeedsLicense(key), self = hrIsSelfKind(key);
  var q = function (id, show) { var el = $(id); if (el) el.style.display = show ? '' : 'none'; };
  q('smLicReq', needLic); q('smLicExpReq', needLic);
  q('smRegionFld', !self); q('smSelfNote', self);
  var hint = $('smRoleHint');
  if (hint) hint.innerHTML = (hrCrewRole(key) ? 'Vai trò trên xe: <b>' + esc(hrCrewRoleLabel(hrCrewRole(key))) + '</b> · ' : '') +
    (hrRolePerms(key).length ? hrRolePerms(key).length + ' quyền' : '<b>Chưa gán quyền</b> (loại 0 quyền)') + (hrRoleHas(key, 'view_all_stations') ? ' · Xem mọi trạm' : '');
  smRefreshScope();
}
function smOnStatusChange() {
  var st = $('smStatus'), fld = $('smLeftFld'); if (!st || !fld) return;
  fld.style.display = st.value === 'left' ? '' : 'none';
}

// Cập nhật ô "Trạm chính" theo các trạm đang tick + dòng "trạm xem được: N" + cảnh báo.
function smRefreshScope() {
  var roleSel = $('smRole'); if (!roleSel) return;
  var key = roleSel.value, self = hrIsSelfKind(key);
  var stations = smReadStations(), regions = self ? [] : smReadRegions();
  var primary = $('smPrimary');
  if (primary) {
    var cur = primary.value;
    var s = SM_EDIT_ID ? FleetStore.getStaff().find(function (x) { return x.id === SM_EDIT_ID; }) : null;
    var want = (cur && stations.indexOf(cur) !== -1) ? cur : (s && s.station && stations.indexOf(s.station) !== -1 ? s.station : stations[0] || '');
    primary.innerHTML = stations.length ? stations.map(function (n) { return '<option value="' + esc(n) + '"' + (n === want ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('')
      : '<option value="">— Chưa chọn trạm —</option>';
    primary.value = want;
  }
  var names = stations.slice();
  regions.forEach(function (rk) { hrStationsOfRegion(rk).forEach(function (st) { if (names.indexOf(st.name) === -1) names.push(st.name); }); });
  var viewAll = hrRoleHas(key, 'view_all_stations');
  var box = $('smScopeSummary'); if (!box) return;
  var html;
  if (self) html = 'Chỉ xem dữ liệu của <b>chính mình</b>. Trạm lẻ gán: <b>' + stations.length + '</b>.';
  else if (viewAll) html = 'Loại này có quyền <b>Xem dữ liệu mọi trạm</b> nên xem tất cả trạm active, không cần gán trạm hay khu vực.';
  else html = 'Trạm xem được: <b>' + names.length + ' trạm</b> (' + stations.length + ' trạm lẻ' + (regions.length ? ' + ' + regions.length + ' khu vực' : '') + ')';
  var warn = [];
  // v3.0: không bắt buộc trạm; chỉ cảnh báo khi người có tài khoản mà không xem được trạm nào.
  var accOfEdit = SM_EDIT_ID ? hrAccountOfStaff(FleetStore.getStaff().find(function (x) { return x.id === SM_EDIT_ID; })) : null;
  if (accOfEdit && !self && !viewAll && !names.length) warn.push('Người này có tài khoản nhưng chưa có trạm xem được: đăng nhập được nhưng không thấy dữ liệu trạm nào.');
  regions.forEach(function (rk) { if (!hrStationsOfRegion(rk).length) warn.push('Khu vực "' + hrRegionName(rk) + '" chưa có trạm active, chọn khu vực này chưa xem được gì.'); });
  box.innerHTML = html + warn.map(function (w) { return '<div class="hr-warn">⚠ ' + esc(w) + '</div>'; }).join('');
}

function adminSaveStaff(e) {
  e.preventDefault();
  var all = FleetStore.getStaff();
  var s = SM_EDIT_ID ? all.find(function (x) { return x.id === SM_EDIT_ID; }) : null;
  var actor = hrActor().username;
  var chk = hrCanEditStaff(s); if (!chk.ok) { showToast(chk.reason); return; }

  var name = $('smName').value.trim();
  if (!name) { showToast('Nhập họ tên.'); return; }
  var roleKey = $('smRole').value, role = hrRole(roleKey);
  if (!role) { showToast('Chọn loại nhân viên.'); return; }
  var self = hrIsSelfKind(roleKey);
  var status = $('smStatus').value, locks = hrStatusLocks(status);
  var license = $('smLicense').value.trim(), licExp = $('smLicenseExpiry').value;
  var hired = $('smHired').value, left = status === 'left' ? $('smLeftDate').value : '';
  var reason = $('smReason').value.trim();

  if (hrNeedsLicense(roleKey) && (!license || !licExp)) { showToast('Loại nhân viên này bắt buộc nhập hạng và hạn bằng lái.'); return; }
  if (status === 'left' && !left) { showToast('Nhập ngày nghỉ việc.'); return; }
  if (left && hired && left < hired) { showToast('Ngày nghỉ việc phải sau hoặc bằng ngày vào làm.'); return; }

  var stations = smReadStations();
  var primary = stations.length ? ($('smPrimary').value || stations[0]) : '';
  if (stations.length && stations.indexOf(primary) === -1) primary = stations[0];
  var regions = self ? [] : smReadRegions();

  // ---- Quy tắc g: trạm/khu vực gán cho người khác phải nằm trong phạm vi xem của người thao tác ----
  var me = hrActor();
  if (!me.isRoot) {
    var meStaff = all.find(function (x) { return x.username === me.username; });
    var myScope = hrScope(meStaff);
    if (!myScope.viewAll) {
      var outStations = stations.filter(function (n) { return myScope.names.indexOf(n) === -1; });
      var outRegions = regions.filter(function (rk) { return hrStationsOfRegion(rk).some(function (st) { return myScope.names.indexOf(st.name) === -1; }); });
      if (outStations.length || outRegions.length) { showToast('Chỉ gán được trạm/khu vực nằm trong phạm vi xem của bạn.'); return; }
    }
  }

  // ---- Thay đổi so với bản cũ ----
  var oldRole = s ? s.role : '', oldStatus = s ? hrStaffStatus(s) : 'working';
  var typeChanged = !!s && oldRole !== roleKey;
  var stationsChanged = !!s && JSON.stringify((s.stations || []).slice().sort()) !== JSON.stringify(stations.slice().sort());
  var primaryChanged = !!s && (s.station || '') !== primary;
  var regionsChanged = !!s && JSON.stringify((s.regions || []).slice().sort()) !== JSON.stringify(regions.slice().sort());
  var statusChanged = !!s && oldStatus !== status;

  // ---- (v3.0) Đổi loại, gỡ trạm, gỡ khu vực KHÔNG còn bị chặn vì ca đang mở (hết khái niệm ca). Khóa theo trạng thái thu hồi phiên ở bước đồng bộ tài khoản bên dưới. ----

  // ---- Quy tắc e: trần ủy quyền khi đổi loại ----
  if (typeChanged || !s) {
    var ceil = hrCheckGrantCeiling(s ? oldRole : '', roleKey);
    if (!ceil.ok) { showToast('Vượt trần ủy quyền, loại mới thêm các quyền bạn không được cấp: ' + hrPermLabels(ceil.missing)); return; }
  }

  // ---- Bắt buộc lý do ----
  var needReason = s && (typeChanged || stationsChanged || primaryChanged || regionsChanged || (statusChanged && status !== 'working'));
  if (needReason && !reason) { showToast('Nhập Lý do thay đổi (đổi loại/trạm/khu vực/trạng thái).'); $('smReason').focus(); return; }

  // SĐT trùng chỉ cảnh báo
  var phone = $('smPhone').value.trim();
  if (phone) {
    var dup = all.find(function (x) { return x.id !== (s && s.id) && x.phone && x.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''); });
    if (dup && !confirm('SĐT này đang trùng với nhân viên "' + dup.name + '". Vẫn lưu?')) return;
  }

  var now = Date.now();
  var rec = s ? Object.assign({}, s) : { id: 'emp_' + now.toString(36) + Math.random().toString(36).slice(2, 7), code: smNextEmployeeCode(), username: '', history: [], createdAt: now, createdBy: actor };
  var before = s ? JSON.parse(JSON.stringify(s)) : null;
  rec.name = name; rec.role = roleKey; rec.phone = phone; rec.email = $('smEmail').value.trim(); rec.address = $('smAddress').value.trim();
  rec.license = license; rec.licenseExpiry = licExp; rec.hiredDate = hired; rec.leftDate = left;
  rec.statusCode = status; rec.active = status === 'working';
  rec.stations = stations; rec.station = primary; rec.regions = regions; delete rec.schedule;
  rec.note = $('smNote').value.trim(); rec.updatedAt = now; rec.updatedBy = actor;
  rec.history = (rec.history || []).slice();

  var hist = function (label, from, to) { rec.history.push({ ts: now, label: label, from: from, to: to, reason: reason, by: actor }); };
  if (!s) {
    hist('Tạo hồ sơ', '', hrRoleLabel(roleKey) + ' · ' + hrStatusName(status));
  } else {
    if (typeChanged) hist('Loại nhân viên', hrRoleLabel(oldRole), hrRoleLabel(roleKey));
    if (statusChanged) hist('Trạng thái', hrStatusName(oldStatus), hrStatusName(status));
    if (stationsChanged || primaryChanged) hist('Trạm', (s.stations || []).join(', ') + ((s.stations || []).length ? ' (chính: ' + s.station + ')' : ''), stations.join(', ') + (stations.length ? ' (chính: ' + primary + ')' : ''));
    if (regionsChanged) hist('Khu vực được xem', (s.regions || []).map(hrRegionName).join(', '), regions.map(hrRegionName).join(', '));
  }
  if (s) all[all.indexOf(s)] = rec; else all.push(rec);
  FleetStore.setStaff(all);

  // ---- Đồng bộ tài khoản gắn với nhân viên ----
  var accs = getAccountsList(), a = accs.find(function (x) { return (x.employeeId && x.employeeId === rec.id) || (rec.username && x.username === rec.username); });
  if (a) {
    a.employeeId = rec.id;
    if (typeChanged) { a.role = roleKey; a.roleLabel = hrRoleLabel(roleKey); a.redirect = role.redirect || a.redirect; }
    saveAccountsList(accs);
    if (locks && !hrStatusLocks(oldStatus)) {
      var n = AuthLog.revokeAllOf(a.username, 'employee_status', actor);
      AuthLog.saveApprovals(AuthLog.getApprovals().map(function (ap) { return (ap.username === a.username && (ap.status === 'pending' || ap.status === 'approved')) ? Object.assign({}, ap, { status: 'expired' }) : ap; }));
      if (n) showToast('Đã thu hồi ' + n + ' phiên đăng nhập của ' + rec.name + '.');
    }
  }

  // ---- Nhật ký thao tác: mỗi loại thay đổi một dòng với đúng action + entity (tên bảng) ----
  var id = rec.code || rec.id;
  var withReason = reason || undefined;
  if (!s) {
    hrLog('create', 'employees', id, 'Thêm nhân viên ' + name + ' (' + hrRoleLabel(roleKey) + ')', { created: { name: name, role: roleKey, stations: stations, regions: regions } });
  } else {
    var diff = hrDiff(before, rec, ['name', 'phone', 'email', 'address', 'license', 'licenseExpiry', 'hiredDate', 'leftDate', 'note']);
    if (diff) hrLog('update', 'employees', id, 'Sửa hồ sơ nhân viên ' + name, diff, withReason);
    if (typeChanged) hrLog('type_change', 'employees', id, 'Đổi loại ' + name + ': ' + hrRoleLabel(oldRole) + ' → ' + hrRoleLabel(roleKey), { employee_type: { old: oldRole, new: roleKey } }, withReason);
    if (statusChanged) hrLog('status_change', 'employees', id, 'Đổi trạng thái ' + name + ': ' + hrStatusName(oldStatus) + ' → ' + hrStatusName(status), { status: { old: oldStatus, new: status } }, withReason);
    if (stationsChanged || primaryChanged) hrLog('station_change', 'employee_stations', id, 'Đổi trạm của ' + name, { stations: { old: s.stations || [], new: stations }, primary: { old: s.station || '', new: primary } }, withReason);
    if (regionsChanged) hrLog('scope_change', 'employee_scope_regions', id, 'Đổi khu vực được xem của ' + name, { regions: { old: s.regions || [], new: regions } }, withReason);
  }

  closeAdminModal();
  showToast('Đã lưu nhân viên.');
  renderStaffView();
}

// "Tạo tài khoản" từ danh sách nhân viên -> mở modal Tài khoản đã chọn sẵn nhân viên (nhân viên HR: tab Tài khoản nhân sự, chỉ admin gốc).
function smCreateAccountFor(id) {
  if (typeof adminOpenAccountModal !== 'function') return;
  var st = FleetStore.getStaff().find(function (x) { return x.id === id; });
  adminOpenAccountModal('', id, st && hrIsProtectedStaff(st) ? 'hr' : '');
}
