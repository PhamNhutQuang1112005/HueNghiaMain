/* =========================================================
   5. QUẢN LÝ NHÂN VIÊN
   ========================================================= */
var STAFF_ROLES = [['ticket', 'Nhân viên vé'], ['driver', 'Tài xế'], ['helper', 'Phụ xe'], ['shuttle_driver', 'Tài xế trung chuyển']];
var STAFF_FILTERS = { search: '', role: '', status: '' };

function roleLabel(r) { var m = STAFF_ROLES.find(function (x) { return x[0] === r; }); return m ? m[1] : r; }

function roleBadge(r) {
  if (r === 'driver' || r === 'shuttle_driver') {
    return '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:var(--red-light);color:var(--red);font-size:11.5px;font-weight:700;">' + esc(roleLabel(r)) + '</span>';
  }
  if (r === 'ticket') {
    return '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#E0F2FE;color:#0369A1;font-size:11.5px;font-weight:700;">' + esc(roleLabel(r)) + '</span>';
  }
  return '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#D1FAE5;color:#047857;font-size:11.5px;font-weight:700;">' + esc(roleLabel(r)) + '</span>';
}

function renderStaffView() {
  var all = FleetStore.getStaff();
  var f = STAFF_FILTERS;

  var totalCount = all.length;
  var driverCount = all.filter(function (s) { return s.role === 'driver' || s.role === 'helper' || s.role === 'shuttle_driver'; }).length;
  var ticketCount = all.filter(function (s) { return s.role === 'ticket'; }).length;
  var activeCount = all.filter(activeOf).length;

  var filtered = all.filter(function (s) {
    if (f.search) {
      var kw = f.search.toLowerCase();
      var matchName = (s.name || '').toLowerCase().indexOf(kw) !== -1;
      var matchCode = (s.code || '').toLowerCase().indexOf(kw) !== -1;
      var matchPhone = (s.phone || '').toLowerCase().indexOf(kw) !== -1;
      var matchUser = (s.username || '').toLowerCase().indexOf(kw) !== -1;
      if (!matchName && !matchCode && !matchPhone && !matchUser) return false;
    }
    if (f.role && s.role !== f.role) return false;
    if (f.status === 'active' && !activeOf(s)) return false;
    if (f.status === 'inactive' && activeOf(s)) return false;
    return true;
  });

  var rows = filtered.length ? filtered.map(function (s) {
    var originalIdx = all.indexOf(s);
    return '<tr>' +
      '<td><span class="trip-plate-inline" style="font-size:12.5px;padding:3px 9px;">' + esc(s.code || '—') + '</span></td>' +
      '<td>' +
        '<div style="font-weight:800;font-size:14px;color:var(--black);">' + esc(s.name || '—') + '</div>' +
        (s.username ? '<div style="font-size:12px;color:var(--text-sub);font-weight:600;">@' + esc(s.username) + '</div>' : '') +
      '</td>' +
      '<td>' + roleBadge(s.role) + '</td>' +
      '<td style="font-weight:700;color:var(--text-main);">' + esc(s.phone || '—') + '</td>' +
      '<td style="font-weight:600;color:var(--text-sub);">' + esc(s.license || '—') + '</td>' +
      '<td class="col-status" style="text-align:center;">' + activeTag(activeOf(s)) + '</td>' +
      '<td class="row-actions" style="text-align:center;">' +
        '<button class="btn btn-sm" data-action="adminOpenStaffModal" data-args=\'[' + originalIdx + ']\'>Sửa</button> ' +
        '<button class="btn btn-sm btn-danger" data-action="adminDeleteStaff" data-args=\'[' + originalIdx + ']\'>Xoá</button>' +
      '</td></tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">Không tìm thấy nhân viên phù hợp.</td></tr>';

  $('viewStaff').innerHTML =
    '<div class="staff-shell">' +
      '<!-- OVERVIEW STATS METRICS -->' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng nhân sự</div>' +
          '<div class="dir-stat-val">' + totalCount + '</div>' +
          '<div class="dir-stat-sub">Toàn bộ đội ngũ nhà xe</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tài xế & Phụ xe</div>' +
          '<div class="dir-stat-val" style="color:var(--red);">' + driverCount + '</div>' +
          '<div class="dir-stat-sub">Vận hành phương tiện phơi xe</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Nhân viên vé</div>' +
          '<div class="dir-stat-val" style="color:#0284C7;">' + ticketCount + '</div>' +
          '<div class="dir-stat-sub">Điều phối & bán vé trạm</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Đang làm việc</div>' +
          '<div class="dir-stat-val" style="color:#059669;">' + activeCount + '</div>' +
          '<div class="dir-stat-sub">Đang hoạt động trong ca</div>' +
        '</div>' +
      '</div>' +

      '<!-- FILTER TOOLBAR -->' +
      '<div class="filter-toolbar" style="margin-bottom:20px;">' +
        '<div class="filter-field">' +
          '<label>Tìm kiếm nhân viên</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Họ tên, mã, SĐT, tài khoản..." data-input-action="adminStaffFilterInput" data-args=\'["search","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Vai trò</label>' +
          '<select data-change-action="adminStaffFilterInput" data-args=\'["role","__this_value__"]\'>' +
            '<option value="">Tất cả vai trò</option>' +
            STAFF_ROLES.map(function (r) { return '<option value="' + r[0] + '"' + (f.role === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Trạng thái</label>' +
          '<select data-change-action="adminStaffFilterInput" data-args=\'["status","__this_value__"]\'>' +
            '<option value="">Tất cả trạng thái</option>' +
            '<option value="active"' + (f.status === 'active' ? ' selected' : '') + '>Đang làm việc</option>' +
            '<option value="inactive"' + (f.status === 'inactive' ? ' selected' : '') + '>Tạm ngưng</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-spacer"></div>' +
        '<button class="btn btn-primary" data-action="adminOpenStaffModal" data-args=\'[-1]\'>Thêm nhân viên mới</button>' +
      '</div>' +

      '<!-- TABLE CARD -->' +
      '<div class="ref-card" style="padding:0; overflow:hidden;">' +
        '<div class="ref-card-header" style="padding:18px 22px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">' +
          '<div style="font-size:15px; font-weight:800; color:var(--black);">Danh sách đội ngũ nhân sự</div>' +
          '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">Hiển thị ' + filtered.length + ' / ' + totalCount + ' nhân viên</div>' +
        '</div>' +
        '<div class="table-wrap" style="border:0; border-radius:0; box-shadow:none;">' +
          '<table class="admin-table">' +
            '<thead><tr>' +
              '<th>Mã NV</th>' +
              '<th>Họ tên & Tài khoản</th>' +
              '<th>Vai trò</th>' +
              '<th>SĐT liên hệ</th>' +
              '<th>Bằng lái</th>' +
              '<th class="col-status" style="text-align:center;">Trạng thái</th>' +
              '<th class="th-actions" style="text-align:center;">Thao tác</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function adminStaffFilterInput(field, val) {
  if (field in STAFF_FILTERS) {
    STAFF_FILTERS[field] = val || '';
    renderStaffView();
  }
}

function adminOpenStaffModal(idx) {
  var all = FleetStore.getStaff();
  var s = idx >= 0 ? all[idx] : null;
  openAdminModal(
    '<h3>' + (s ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStaff" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="smIdx" value="' + idx + '">' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Họ tên nhân viên *</label><input id="smName" required value="' + (s ? esc(s.name || '') : '') + '" placeholder="VD: Nguyễn Văn A"></div>' +
        '<div class="fld"><label>Mã nhân viên</label><input id="smCode" value="' + (s ? esc(s.code || '') : '') + '" placeholder="VD: NV-001"></div>' +
      '</div>' +
      '<div class="fld"><label>Vai trò đảm nhiệm *</label><select id="smRole">' +
        STAFF_ROLES.map(function (r) { return '<option value="' + r[0] + '"' + (s && s.role === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Số điện thoại</label><input id="smPhone" value="' + (s ? esc(s.phone || '') : '') + '" placeholder="VD: 0912345678"></div>' +
        '<div class="fld"><label>Hạng bằng lái</label><input id="smLicense" value="' + (s ? esc(s.license || '') : '') + '" placeholder="VD: Bằng E, FC"></div>' +
      '</div>' +
      '<div class="fld"><label>Tài khoản đăng nhập hệ thống (nếu có)</label><input id="smUser" value="' + (s ? esc(s.username || '') : '') + '" placeholder="Tên đăng nhập hệ thống..."></div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="smActive" ' + (!s || activeOf(s) ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Đang trong thời gian làm việc</label></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu thông tin</button></div>' +
    '</form>'
  );
}

function adminSaveStaff(e) {
  e.preventDefault();
  var idx = parseInt($('smIdx').value, 10);
  var all = FleetStore.getStaff();
  var name = $('smName').value.trim();
  if (!name) { showToast('Nhập họ tên.'); return; }
  var rec = {
    code: $('smCode').value.trim(), name: name, username: $('smUser').value.trim(),
    role: $('smRole').value, phone: $('smPhone').value.trim(), license: $('smLicense').value.trim(),
    active: $('smActive').checked
  };
  if (idx >= 0) {
    var before = all[idx];
    all[idx] = rec;
    FleetStore.log({ action: 'update', entity: 'staff', entityId: name, summary: 'Sửa nhân viên ' + name, before: before, after: rec });
  } else {
    all.push(rec);
    FleetStore.log({ action: 'create', entity: 'staff', entityId: name, summary: 'Thêm nhân viên ' + name, after: rec });
  }
  FleetStore.setStaff(all);
  closeAdminModal();
  showToast('Đã lưu nhân viên.');
  renderStaffView();
}

function adminDeleteStaff(idx) {
  var all = FleetStore.getStaff();
  var s = all[idx];
  if (!s) return;
  var chk = FleetStore.canDeleteStaff(s.name || s.code);
  if (!chk.ok) { showToast('Không thể xoá: ' + chk.reason); return; }
  if (!confirm('Xoá nhân viên ' + s.name + '?')) return;
  all.splice(idx, 1);
  FleetStore.setStaff(all);
  FleetStore.log({ action: 'delete', entity: 'staff', entityId: s.name || s.code, summary: 'Xoá nhân viên ' + (s.name || s.code) });
  showToast('Đã xoá nhân viên.');
  renderStaffView();
}
