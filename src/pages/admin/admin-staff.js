/* =========================================================
   5. QUẢN LÝ NHÂN VIÊN
   ========================================================= */
// Danh mục "Loại nhân viên" nay cấu hình được ở Nhân sự > Cấu hình nhân sự (admin-staff-config.js,
// FleetStore.getStaffRoles()) thay vì hard-code — giữ hàm này để nơi khác trong file khỏi phải gọi
// FleetStore trực tiếp và lỡ đổi shape.
function getStaffRoleList() { return FleetStore.getStaffRoles(); }
var STAFF_FILTERS = { search: '', role: '', status: '', station: '' };
var STAFF_SEL = {}; // vị trí (index trong FleetStore.getStaff()) đang tick chọn — dùng cho hành động "Xoá các nhân viên đã chọn"

function roleLabel(r) { var m = getStaffRoleList().find(function (x) { return x.key === r; }); return m ? m.label : r; }

/* "Trạm xe" của nhân viên/tài khoản = Trạm chính trong danh mục Tỉnh/Trạm chính/Trạm phụ/Điểm dừng
   (FleetStore.getMainStations(), xem admin-station-directory.js — đây LÀ trang "Trạm xe" trong sidebar,
   không phải danh sách trạm phẳng cũ). Dùng chung cho cả form Nhân viên (admin-staff.js) lẫn Tài khoản
   (admin-accounts.js). */
function staffMainStationOptionsHtml(selectedId) {
  var stations = FleetStore.getMainStations();
  return '<option value="">— Chưa gán trạm —</option>' +
    stations.map(function (st) {
      return '<option value="' + esc(st.id) + '"' + (selectedId === st.id ? ' selected' : '') + '>' + esc(st.name) + '</option>';
    }).join('');
}
function staffMainStationName(id) {
  if (!id) return '';
  var st = FleetStore.getMainStations().find(function (m) { return m.id === id; });
  return st ? st.name : '';
}

/* "Khu vực" + "Trạm" cho form Nhân viên — dùng ĐÚNG danh mục Khu vực (Tỉnh/Thành) + Trạm xe THẬT của
   trang "Trạm xe" (FleetStore.getStations()/region, xem admin-station-directory.js), KHÁC với
   staffMainStationOptionsHtml/getMainStations() ở trên (danh mục "Trạm chính" chưa có UI CRUD nào cả nên
   luôn rỗng — trước đây chọn "Sài Gòn" không ra trạm nào để chọn tiếp vì chính "Sài Gòn" cũng chưa từng
   là 1 lựa chọn có thật). Tái dùng đúng cặp hàm ssRegionOptions/ssRegionLabel/ssStationOptions/
   ssStationRegion/ssWireSearchCombo đã có ở admin-staff-stats.js (cùng nạp trên trang admin.html, dùng
   cho bộ lọc Kết ca) thay vì viết lại 1 bộ combobox khác. Lưu thẳng TÊN trạm vào staff.station (khớp quy
   ước "trạm = tên, không id" xuyên suốt FleetStore.getStations()) — không lưu riêng field "khu vực" vì
   suy được từ station.region, tránh 2 nguồn có thể lệch nhau. */
var SM_REGION_KEY = ''; // khu vực đang chọn trong modal Nhân viên đang mở (Thêm/Sửa)

function smAttachStationCombos() {
  var regionInput = $('smRegionInput'), stationInput = $('smStationInput');
  if (!regionInput || !stationInput) return;

  ssWireSearchCombo('smRegionInput', 'smRegionDropdown', ssRegionOptions, function () { return SM_REGION_KEY; }, function (key, label) {
    SM_REGION_KEY = key;
    regionInput.value = label;
    var dd = $('smRegionDropdown'); if (dd) dd.classList.remove('open');
    // Đổi khu vực mà trạm đang chọn không còn thuộc khu vực mới → bỏ chọn trạm, tránh lưu nhầm trạm sai vùng.
    if (stationInput.value && ssStationRegion(stationInput.value) !== key) stationInput.value = '';
  });

  ssWireSearchCombo('smStationInput', 'smStationDropdown', function () { return ssStationOptions(SM_REGION_KEY); }, function () { return stationInput.value; }, function (key, label) {
    stationInput.value = label;
    var dd = $('smStationDropdown'); if (dd) dd.classList.remove('open');
    if (key) { SM_REGION_KEY = ssStationRegion(key); regionInput.value = ssRegionLabel(SM_REGION_KEY); }
  });
}

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
    if (f.station && s.station !== f.station) return false;
    if (f.status === 'active' && !activeOf(s)) return false;
    if (f.status === 'inactive' && activeOf(s)) return false;
    return true;
  });

  // Dọn lựa chọn của nhân viên không còn hiển thị (đổi bộ lọc) — tránh xoá nhầm người đã ẩn khỏi danh sách.
  var visStaffIdx = {}; filtered.forEach(function (s) { visStaffIdx[all.indexOf(s)] = true; });
  Object.keys(STAFF_SEL).forEach(function (i) { if (!visStaffIdx[i]) delete STAFF_SEL[i]; });

  var rows = filtered.length ? filtered.map(function (s, i) {
    var originalIdx = all.indexOf(s);
    var sel = !!STAFF_SEL[originalIdx];
    return '<tr data-row-key="' + originalIdx + '" class="' + (sel ? 'selected-row' : '') + '">' +
      '<td class="col-stt">' + (i + 1) + '</td>' +
      '<td><span class="trip-plate-inline" style="font-size:12.5px;padding:3px 9px;">' + esc(s.code || '—') + '</span></td>' +
      '<td>' +
        '<div style="font-weight:800;font-size:14px;color:var(--black);">' + esc(s.name || '—') + '</div>' +
        (s.username ? '<div style="font-size:12px;color:var(--text-sub);font-weight:600;">@' + esc(s.username) + '</div>' : '') +
      '</td>' +
      '<td>' + roleBadge(s.role) + '</td>' +
      '<td style="font-weight:700;color:var(--text-main);">' + esc(s.phone || '—') + '</td>' +
      '<td style="font-weight:600;color:var(--text-sub);">' + esc(s.license || '—') + '</td>' +
      '<td style="font-weight:600;color:var(--text-main);">' + esc(ssRegionLabel(ssStationRegion(s.station)) || '—') + '</td>' +
      '<td style="font-weight:600;color:var(--text-main);">' + esc(s.station || '—') + '</td>' +
      '<td class="col-status" style="text-align:center;">' + activeTag(activeOf(s)) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminStaffRowMenu" data-args=\'["__this__",' + originalIdx + ']\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminStaffToggleRow" data-args=\'[' + originalIdx + ',"__this__"]\'></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="11" class="empty-state">Không tìm thấy nhân viên phù hợp.</td></tr>';

  var allChecked = filtered.length && filtered.every(function (s) { return STAFF_SEL[all.indexOf(s)]; });

  $('viewStaff').innerHTML =
    '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search">' +
        '<label>Tìm kiếm nhân viên</label>' +
        '<input type="text" value="' + esc(f.search) + '" placeholder="Họ tên, mã, SĐT, tài khoản..." data-input-action="adminStaffFilterInput" data-args=\'["search","__this_value__"]\'>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Vai trò</label>' +
        '<select data-change-action="adminStaffFilterInput" data-args=\'["role","__this_value__"]\'>' +
          '<option value="">Tất cả vai trò</option>' +
          getStaffRoleList().map(function (r) { return '<option value="' + r.key + '"' + (f.role === r.key ? ' selected' : '') + '>' + r.label + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Trạng thái</label>' +
        '<select data-change-action="adminStaffFilterInput" data-args=\'["status","__this_value__"]\'>' +
          '<option value="">Tất cả trạng thái</option>' +
          '<option value="active"' + (f.status === 'active' ? ' selected' : '') + '>Đang làm việc</option>' +
          '<option value="inactive"' + (f.status === 'inactive' ? ' selected' : '') + '>Tạm ngưng</option>' +
        '</select>' +
      '</div>' +
      '<div class="filter-field sd-field-region">' +
        '<label>Trạm xe</label>' +
        '<select data-change-action="adminStaffFilterInput" data-args=\'["station","__this_value__"]\'>' +
          '<option value="">Tất cả trạm</option>' +
          FleetStore.getStations().slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'vi'); })
            .map(function (st) { return '<option value="' + esc(st.name) + '"' + (f.station === st.name ? ' selected' : '') + '>' + esc(st.name) + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenStaffModal" data-args=\'[-1]\'>Thêm nhân viên mới</button>' +
      '</div>' +
    '</div>' +

    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span>Danh sách đội ngũ nhân sự</span>' +
        '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">Hiển thị ' + filtered.length + ' / ' + totalCount + ' nhân viên</span>' +
      '</div>' +
      '<div class="sd-table-wrap">' +
        '<table class="admin-table staff-table">' +
          '<thead><tr>' +
            '<th class="col-stt">STT</th>' +
            '<th>Mã NV</th>' +
            '<th>Họ tên & Tài khoản</th>' +
            '<th>Vai trò</th>' +
            '<th>SĐT liên hệ</th>' +
            '<th>Bằng lái</th>' +
            '<th>Khu vực</th>' +
            '<th>Trạm</th>' +
            '<th class="col-status" style="text-align:center;">Trạng thái</th>' +
            '<th class="th-actions">Thao tác</th>' +
            '<th class="col-check"><input type="checkbox" id="staffCheckAll"' + (allChecked ? ' checked' : '') + ' data-action="adminStaffToggleAll" data-args=\'["__this__"]\'></th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div></div>' +

    '<div class="bulk-bar" id="staffActionBar" style="display:none;">' +
      '<span class="bulk-bar-hint" id="staffActionHint">Đã chọn 0 nhân viên</span>' +
      '<div class="bulk-bar-fields">' +
        '<button type="button" class="btn btn-secondary" data-action="adminStaffClearSel">Hủy</button>' +
        '<button type="button" class="btn btn-danger" data-action="adminStaffDeleteSelected">Xoá các nhân viên đã chọn</button>' +
      '</div>' +
    '</div>';
  adminStaffSyncBar();
}

/* ---- Chọn nhiều dòng trong bảng Nhân viên (checkbox cuối bảng) để xoá hàng loạt ---- */
function adminStaffSyncBar() {
  var bar = $('staffActionBar');
  if (!bar) return;
  var idxs = Object.keys(STAFF_SEL);
  if (!idxs.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  var hint = $('staffActionHint'); if (hint) hint.textContent = 'Đã chọn ' + idxs.length + ' nhân viên';
}
function adminStaffToggleRow(idx, cb) {
  if (cb.checked) STAFF_SEL[idx] = true; else delete STAFF_SEL[idx];
  var tr = document.querySelector('#viewStaff tr[data-row-key="' + idx + '"]');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  var all = $('staffCheckAll');
  if (all) all.checked = document.querySelectorAll('#viewStaff td.col-check input[type="checkbox"]:not(:checked)').length === 0;
  adminStaffSyncBar();
}
function adminStaffToggleAll(cb) {
  var boxes = document.querySelectorAll('#viewStaff tbody td.col-check input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (b) {
    var idx = null;
    try { idx = JSON.parse(b.getAttribute('data-args') || '[]')[0]; } catch (e) { /* ignore */ }
    if (idx == null) return;
    if (cb.checked) STAFF_SEL[idx] = true; else delete STAFF_SEL[idx];
  });
  renderStaffView();
}
function adminStaffClearSel() { STAFF_SEL = {}; renderStaffView(); }
function adminStaffDeleteSelected() {
  var idxs = Object.keys(STAFF_SEL).map(Number);
  if (!idxs.length) return;
  var all = FleetStore.getStaff();
  var recs = idxs.map(function (i) { return all[i]; }).filter(Boolean);
  var deletable = [], blocked = [];
  recs.forEach(function (s) {
    var chk = FleetStore.canDeleteStaff(s.name || s.code);
    if (chk.ok) deletable.push(s); else blocked.push((s.name || s.code) + ' (' + chk.reason + ')');
  });
  if (!deletable.length) { showToast('Không thể xoá: tất cả nhân viên đã chọn đang được dùng.'); return; }
  var msg = 'Xoá ' + deletable.length + ' nhân viên đã chọn?' + (blocked.length ? '\nBỏ qua ' + blocked.length + ' người đang được dùng: ' + blocked.join(', ') : '');
  if (!confirm(msg)) return;
  var list = all.filter(function (s) { return deletable.indexOf(s) === -1; });
  FleetStore.setStaff(list);
  deletable.forEach(function (s) {
    FleetStore.log({ action: 'delete', entity: 'staff', entityId: s.name || s.code, summary: 'Xoá nhân viên ' + (s.name || s.code) });
  });
  STAFF_SEL = {};
  showToast('Đã xoá ' + deletable.length + ' nhân viên.' + (blocked.length ? ' Bỏ qua ' + blocked.length + ' người đang dùng.' : ''));
  renderStaffView();
}

// Cột "Thao tác" — dropdown nổi giống bên Trạm Xe (dùng chung adminOpenRowMenu ở admin-station-directory.js).
function adminStaffRowMenu(btn, idx) {
  adminOpenRowMenu(btn, 'staff:' + idx,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenStaffModal" data-args=\'[' + idx + ']\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteStaff" data-args=\'[' + idx + ']\'>Xoá</button>');
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
  SM_REGION_KEY = s && s.station ? ssStationRegion(s.station) : '';
  openAdminModal(
    '<h3>' + (s ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveStaff" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="smIdx" value="' + idx + '">' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Họ tên nhân viên *</label><input id="smName" required value="' + (s ? esc(s.name || '') : '') + '" placeholder="VD: Nguyễn Văn A"></div>' +
        '<div class="fld"><label>Mã nhân viên</label><input id="smCode" value="' + (s ? esc(s.code || '') : '') + '" placeholder="VD: NV-001"></div>' +
      '</div>' +
      '<div class="fld"><label>Vai trò đảm nhiệm *</label><select id="smRole">' +
        getStaffRoleList().map(function (r) { return '<option value="' + r.key + '"' + (s && s.role === r.key ? ' selected' : '') + '>' + r.label + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Số điện thoại</label><input id="smPhone" value="' + (s ? esc(s.phone || '') : '') + '" placeholder="VD: 0912345678"></div>' +
        '<div class="fld"><label>Hạng bằng lái</label><input id="smLicense" value="' + (s ? esc(s.license || '') : '') + '" placeholder="VD: Bằng E, FC"></div>' +
      '</div>' +
      '<div class="fld-row">' +
        '<div class="fld" style="position:relative;"><label>Khu vực</label>' +
          '<div class="combo-input-wrap"><input type="text" id="smRegionInput" class="combo-input" autocomplete="off" placeholder="Chọn khu vực..." value="' + esc(ssRegionLabel(SM_REGION_KEY)) + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></div>' +
          '<div class="dropdown-panel" id="smRegionDropdown"></div>' +
        '</div>' +
        '<div class="fld" style="position:relative;"><label>Trạm</label>' +
          '<div class="combo-input-wrap"><input type="text" id="smStationInput" class="combo-input" autocomplete="off" placeholder="Chọn trạm..." value="' + (s ? esc(s.station || '') : '') + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></div>' +
          '<div class="dropdown-panel" id="smStationDropdown"></div>' +
        '</div>' +
      '</div>' +
      '<div class="fld"><label>Tài khoản đăng nhập hệ thống (nếu có)</label><input id="smUser" value="' + (s ? esc(s.username || '') : '') + '" placeholder="Tên đăng nhập hệ thống..."></div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="smActive" ' + (!s || activeOf(s) ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Đang trong thời gian làm việc</label></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu thông tin</button></div>' +
    '</form>'
  );
  smAttachStationCombos();
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
    station: $('smStationInput').value.trim(), active: $('smActive').checked
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
