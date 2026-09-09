/* =========================================================
   4. QUẢN LÝ XE
   ========================================================= */
var VEHICLE_FILTERS = { search: '', scope: '', status: '' };

function renderVehiclesView() {
  var all = FleetStore.getVehicles();
  var f = VEHICLE_FILTERS;

  var totalCount = all.length;
  var lineCount = all.filter(function (v) { return v.scope !== 'shuttle'; }).length;
  var shuttleCount = all.filter(function (v) { return v.scope === 'shuttle'; }).length;
  var activeCount = all.filter(activeOf).length;

  var filtered = all.filter(function (v) {
    if (f.search) {
      var kw = f.search.toLowerCase();
      var matchPlate = (v.plate || '').toLowerCase().indexOf(kw) !== -1;
      var matchType = (v.vehicleType || '').toLowerCase().indexOf(kw) !== -1;
      var matchNote = (v.note || '').toLowerCase().indexOf(kw) !== -1;
      if (!matchPlate && !matchType && !matchNote) return false;
    }
    if (f.scope && v.scope !== f.scope) return false;
    if (f.status === 'active' && !activeOf(v)) return false;
    if (f.status === 'inactive' && activeOf(v)) return false;
    return true;
  });

  var rows = filtered.length ? filtered.map(function (v) {
    var originalIdx = all.indexOf(v);
    var scopeBadge = v.scope === 'shuttle'
      ? '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#E0F2FE;color:#0369A1;font-size:11.5px;font-weight:700;">Trung chuyển</span>'
      : '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:var(--red-light);color:var(--red);font-size:11.5px;font-weight:700;">Xe tuyến</span>';

    return '<tr>' +
      '<td><span class="trip-plate-inline" style="font-size:13px;padding:3px 10px;">' + esc(v.plate) + '</span></td>' +
      '<td style="font-weight:800;color:var(--black);font-size:14px;">' + esc(v.vehicleType || '—') + '</td>' +
      '<td style="text-align:center;font-weight:800;font-size:14px;color:var(--black);">' + (v.seats || 0) + '</td>' +
      '<td>' + scopeBadge + '</td>' +
      '<td class="col-status" style="text-align:center;">' + activeTag(activeOf(v)) + '</td>' +
      '<td style="color:var(--text-sub);">' + (v.note ? esc(v.note) : '—') + '</td>' +
      '<td class="row-actions" style="text-align:center;">' +
        '<button class="btn btn-sm" data-action="adminOpenVehicleModal" data-args=\'[' + originalIdx + ']\'>Sửa</button> ' +
        '<button class="btn btn-sm btn-danger" data-action="adminDeleteVehicle" data-args=\'[' + originalIdx + ']\'>Xoá</button>' +
      '</td></tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">Không tìm thấy xe phù hợp.</td></tr>';

  $('viewVehicles').innerHTML =
    '<div class="vehicles-shell">' +
      '<!-- OVERVIEW STATS METRICS -->' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng số xe</div>' +
          '<div class="dir-stat-val">' + totalCount + '</div>' +
          '<div class="dir-stat-sub">Toàn bộ bãi xe nhà xe</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Xe chạy tuyến</div>' +
          '<div class="dir-stat-val" style="color:var(--red);">' + lineCount + '</div>' +
          '<div class="dir-stat-sub">Phục vụ hành trình cố định</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Xe trung chuyển</div>' +
          '<div class="dir-stat-val" style="color:#0284C7;">' + shuttleCount + '</div>' +
          '<div class="dir-stat-sub">Phục vụ đưa đón tận nơi</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Đang hoạt động</div>' +
          '<div class="dir-stat-val" style="color:#059669;">' + activeCount + '</div>' +
          '<div class="dir-stat-sub">Sẵn sàng điều phối</div>' +
        '</div>' +
      '</div>' +

      '<!-- FILTER TOOLBAR -->' +
      '<div class="filter-toolbar" style="margin-bottom:20px;">' +
        '<div class="filter-field">' +
          '<label>Tìm kiếm xe</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Biển số, loại xe..." data-input-action="adminVehicleFilterInput" data-args=\'["search","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Nhóm xe</label>' +
          '<select data-change-action="adminVehicleFilterInput" data-args=\'["scope","__this_value__"]\'>' +
            '<option value="">Tất cả nhóm</option>' +
            '<option value="line"' + (f.scope === 'line' ? ' selected' : '') + '>Xe tuyến</option>' +
            '<option value="shuttle"' + (f.scope === 'shuttle' ? ' selected' : '') + '>Xe trung chuyển</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Trạng thái</label>' +
          '<select data-change-action="adminVehicleFilterInput" data-args=\'["status","__this_value__"]\'>' +
            '<option value="">Tất cả trạng thái</option>' +
            '<option value="active"' + (f.status === 'active' ? ' selected' : '') + '>Đang hoạt động</option>' +
            '<option value="inactive"' + (f.status === 'inactive' ? ' selected' : '') + '>Tạm ngưng</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-spacer"></div>' +
        '<button class="btn btn-primary" data-action="adminOpenVehicleModal" data-args=\'[-1]\'>Thêm xe mới</button>' +
      '</div>' +

      '<!-- TABLE CARD -->' +
      '<div class="ref-card" style="padding:0; overflow:hidden;">' +
        '<div class="ref-card-header" style="padding:18px 22px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">' +
          '<div style="font-size:15px; font-weight:800; color:var(--black);">Danh sách phương tiện bãi xe</div>' +
          '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">Hiển thị ' + filtered.length + ' / ' + totalCount + ' xe</div>' +
        '</div>' +
        '<div class="table-wrap" style="border:0; border-radius:0; box-shadow:none;">' +
          '<table class="admin-table">' +
            '<thead><tr>' +
              '<th>Biển số</th>' +
              '<th>Loại xe</th>' +
              '<th style="text-align:center;">Số ghế</th>' +
              '<th>Nhóm phơi</th>' +
              '<th class="col-status" style="text-align:center;">Trạng thái</th>' +
              '<th>Ghi chú</th>' +
              '<th class="th-actions" style="text-align:center;">Thao tác</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function adminVehicleFilterInput(field, val) {
  if (field in VEHICLE_FILTERS) {
    VEHICLE_FILTERS[field] = val || '';
    renderVehiclesView();
  }
}

function adminOpenVehicleModal(idx) {
  var all = FleetStore.getVehicles();
  var v = idx >= 0 ? all[idx] : null;
  var typeScope = v ? v.scope : 'line';
  var typeOpts = function (scope) {
    return FleetStore.getVehicleTypes({ scope: scope }).filter(activeOf).map(function (x) {
      return '<option value="' + esc(x.name) + '" data-seats="' + (x.seats || 0) + '"' + (v && v.vehicleType === x.name ? ' selected' : '') + '>' + esc(x.name) + ' (' + (x.seats || 0) + ' ghế)</option>';
    }).join('');
  };
  openAdminModal(
    '<h3>' + (v ? 'Sửa thông tin xe' : 'Thêm xe mới') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveVehicle" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="vmIdx" value="' + idx + '">' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Biển số xe *</label><input id="vmPlate" required value="' + (v ? esc(v.plate) : '') + '" placeholder="VD: 51B-123.45"></div>' +
        '<div class="fld"><label>Nhóm phơi *</label><select id="vmScope" data-change-action="adminVehicleScopeChange"><option value="line"' + (typeScope === 'line' ? ' selected' : '') + '>Tuyến cố định</option><option value="shuttle"' + (typeScope === 'shuttle' ? ' selected' : '') + '>Trung chuyển</option></select></div>' +
      '</div>' +
      '<div class="fld"><label>Loại xe</label><select id="vmType" data-change-action="adminVehicleTypeChange">' +
        '<option value="">-- Chọn loại xe --</option>' + typeOpts(typeScope) + '</select></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Số ghế</label><input type="number" id="vmSeats" min="0" value="' + (v ? (v.seats || 0) : 0) + '"></div>' +
        '<div class="fld" style="justify-content:flex-end;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="vmActive" ' + (!v || activeOf(v) ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Sẵn sàng hoạt động</label></div>' +
      '</div>' +
      '<div class="fld"><label>Ghi chú</label><input id="vmNote" value="' + (v ? esc(v.note || '') : '') + '" placeholder="Ghi chú phương tiện..."></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu thông tin</button></div>' +
    '</form>'
  );
}

function adminVehicleScopeChange() {
  var scope = $('vmScope').value;
  var sel = $('vmType');
  sel.innerHTML = '<option value="">-- Chọn loại xe --</option>' + FleetStore.getVehicleTypes({ scope: scope }).filter(activeOf).map(function (x) {
    return '<option value="' + esc(x.name) + '" data-seats="' + (x.seats || 0) + '">' + esc(x.name) + ' (' + (x.seats || 0) + ' ghế)</option>';
  }).join('');
}

function adminVehicleTypeChange() {
  var opt = $('vmType').selectedOptions[0];
  if (opt && opt.dataset.seats) $('vmSeats').value = opt.dataset.seats;
}

function adminSaveVehicle(e) {
  e.preventDefault();
  var idx = parseInt($('vmIdx').value, 10);
  var all = FleetStore.getVehicles();
  var plate = $('vmPlate').value.trim();
  if (!plate) { showToast('Nhập biển số.'); return; }
  if (all.some(function (x, i) { return x.plate === plate && i !== idx; })) { showToast('Biển số đã tồn tại.'); return; }
  var rec = {
    plate: plate, scope: $('vmScope').value, vehicleType: $('vmType').value,
    seats: parseInt($('vmSeats').value, 10) || 0, active: $('vmActive').checked,
    note: $('vmNote').value.trim(),
    driverDefault: (idx >= 0 && all[idx] && all[idx].driverDefault) || '',
    helperDefault: (idx >= 0 && all[idx] && all[idx].helperDefault) || ''
  };
  if (idx >= 0) {
    var before = all[idx];
    all[idx] = rec;
    FleetStore.log({ action: 'update', entity: 'vehicle', entityId: plate, summary: 'Sửa xe ' + plate, before: before, after: rec });
  } else {
    all.push(rec);
    FleetStore.log({ action: 'create', entity: 'vehicle', entityId: plate, summary: 'Thêm xe ' + plate, after: rec });
  }
  FleetStore.setVehicles(all);
  closeAdminModal();
  showToast('Đã lưu xe.');
  renderVehiclesView();
}

function adminDeleteVehicle(idx) {
  var all = FleetStore.getVehicles();
  var v = all[idx];
  if (!v) return;
  var chk = FleetStore.canDeleteVehicle(v.plate);
  if (!chk.ok) { showToast('Không thể xoá: ' + chk.reason); return; }
  if (!confirm('Xoá xe ' + v.plate + '?')) return;
  all.splice(idx, 1);
  FleetStore.setVehicles(all);
  FleetStore.log({ action: 'delete', entity: 'vehicle', entityId: v.plate, summary: 'Xoá xe ' + v.plate });
  showToast('Đã xoá xe.');
  renderVehiclesView();
}
