/* =========================================================
   NHÂN SỰ > CẤU HÌNH NHÂN SỰ > tab NHÓM CÔNG VIỆC — bảng riêng work_kinds (FleetStore.getWorkKinds()). CHỈ ADMIN GỐC SỬA.
   Tab này do renderStaffConfigView() (admin-staff-config.js) gọi wkRenderTabHtml(); dữ liệu tách bảng khỏi employee_types.
   Mỗi loại nhân viên (tab Loại nhân viên) chọn 1 nhóm ở đây (employee_types.work_kind).
   Nhóm quyết định 3 việc, KHÔNG quyết định quyền và KHÔNG dùng chia tab kết ca (kết ca chia theo chức năng):
     - self    : chỉ xem dữ liệu của CHÍNH MÌNH (app tự lọc, ẩn ô Khu vực ở form nhân viên) — tài xế, tài xế trung chuyển, phụ xe
     - license : bắt buộc nhập hạng + hạn bằng lái (T1)
     - chia tab Tài xế / Lơ xe ở Thống kê nhân sự (theo mã nhóm driver, shuttle_driver, helper)
   Nhóm gốc (isSystem) được logic thống kê tham chiếu theo mã nên không xoá và không đổi mã; vẫn sửa được tên, cờ, ghi chú.
   Không xoá nhóm: ngừng dùng (không chọn được cho loại mới, loại và nhân viên cũ giữ nguyên).
   ========================================================= */
var WORK_KIND_FILTERS = { search: '', usage: '' };

function wkTypesOf(key) { return FleetStore.getStaffRoles().filter(function (r) { return r.workKind === key; }); }
function wkStaffCountOf(key) {
  var types = wkTypesOf(key).map(function (r) { return r.key; });
  return FleetStore.getStaff().filter(function (s) { return types.indexOf(s.role) !== -1; }).length;
}

function wkRenderTabHtml() {
  var f = WORK_KIND_FILTERS, kw = f.search.toLowerCase();
  var all = FleetStore.getWorkKinds();
  var list = all.filter(function (k) {
    if (f.usage === 'active' && !k.active) return false;
    if (f.usage === 'inactive' && k.active) return false;
    if (kw && (k.label + ' ' + k.key).toLowerCase().indexOf(kw) === -1) return false;
    return true;
  });
  var rows = list.length ? list.map(function (k, i) {
    var types = wkTypesOf(k.key);
    return '<tr class="' + (k.active ? '' : 'sch-row-deleted') + '">' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td class="mono">' + esc(k.key) + '</td>' +
      '<td><b>' + esc(k.label) + '</b>' + (k.isSystem ? ' ' + hrChip('Nhóm gốc', 'gray') : '') + (k.note ? '<div class="hint-inline">' + esc(k.note) + '</div>' : '') + '</td>' +
      '<td style="text-align:center;">' + (k.self ? hrChip('Chỉ dữ liệu của mình', 'blue') : hrChip('Theo trạm / khu vực', 'gray')) + '</td>' +
      '<td style="text-align:center;">' + (k.license ? hrChip('Bắt buộc', 'amber') : hrChip('Không', 'gray')) + '</td>' +
      '<td style="text-align:center;">' + types.length + (types.length ? '<div class="hint-inline" title="' + esc(types.map(function (t) { return t.label; }).join(', ')) + '">' + esc(types.slice(0, 2).map(function (t) { return t.label; }).join(', ') + (types.length > 2 ? '…' : '')) + '</div>' : '') + '</td>' +
      '<td style="text-align:center;">' + wkStaffCountOf(k.key) + '</td>' +
      '<td class="col-status" style="text-align:center;">' + (k.active ? hrBadge('Đang dùng', 'dang-ban') : hrBadge('Ngừng dùng', 'da-huy')) + '</td>' +
      '<td class="row-actions"><button type="button" class="btn btn-sm row-menu-btn" data-action="wkRowMenu" data-args=\'["__this__","' + esc(k.key) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="9" class="empty-state">Chưa có nhóm công việc nào phù hợp.</td></tr>';

  return '<div class="hr-note">Nhóm công việc dùng để chia tab <b>Tài xế / Lơ xe</b>, kiểm <b>bằng lái</b> và xác định nhóm <b>chỉ xem dữ liệu của chính mình</b>. ' +
      'Nhóm <b>không</b> quyết định quyền (quyền do loại nhân viên) và không dùng chia tab kết ca (kết ca chia theo chức năng). Mỗi loại nhân viên chọn một nhóm ở tab Loại nhân viên.</div>' +
    '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search"><label>Tìm kiếm</label>' +
        '<input type="text" id="wkSearch" value="' + esc(f.search) + '" placeholder="Tên nhóm, mã..." data-input-action="wkFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
      '<div class="filter-field sd-field-region"><label>Trạng thái sử dụng</label>' +
        '<select data-change-action="wkFilterInput" data-args=\'["usage","__this_value__"]\'><option value="">Tất cả</option>' +
          '<option value="active"' + (f.usage === 'active' ? ' selected' : '') + '>Đang dùng</option><option value="inactive"' + (f.usage === 'inactive' ? ' selected' : '') + '>Ngừng dùng</option></select></div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn sd-btn" data-action="wkResetFilters">Đặt lại</button>' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="wkOpenModal" data-args=\'[""]\'>Thêm nhóm công việc</button>' +
      '</div>' +
    '</div>' +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;"><span>Danh mục nhóm công việc</span>' +
        '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + list.length + ' / ' + all.length + ' nhóm</span></div>' +
      '<div class="sd-table-wrap"><table class="admin-table" style="min-width:1000px;"><thead><tr>' +
        '<th class="num">STT</th><th>Mã</th><th>Tên nhóm</th><th style="text-align:center;">Phạm vi xem dữ liệu</th><th style="text-align:center;">Bằng lái</th>' +
        '<th style="text-align:center;">Số loại nhân viên</th><th style="text-align:center;">Số nhân viên</th><th class="col-status" style="text-align:center;">Trạng thái</th><th class="th-actions">Thao tác</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div></div>';
}

function wkFilterInput(field, val) {
  if (!(field in WORK_KIND_FILTERS)) return;
  WORK_KIND_FILTERS[field] = val || '';
  adminKeepFocus(renderStaffConfigView);
}
function wkResetFilters() { WORK_KIND_FILTERS = { search: '', usage: '' }; renderStaffConfigView(); }

function wkRowMenu(btn, key) {
  var k = FleetStore.workKind(key);
  adminOpenRowMenu(btn, 'work-kind:' + key,
    '<button type="button" class="admin-row-menu-item" data-action="wkOpenModal" data-args=\'["' + esc(key) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="wkToggleActive" data-args=\'["' + esc(key) + '"]\'>' + (k && k.active ? 'Ngừng dùng' : 'Mở lại') + '</button>');
}

function wkRequireRoot() {
  if (hrActor().isRoot) return true;
  showToast('Chỉ admin gốc được sửa Nhóm công việc.');
  return false;
}

function wkOpenModal(key) {
  var k = key ? FleetStore.workKind(key) : null;
  var types = k ? wkTypesOf(k.key) : [], staffN = k ? wkStaffCountOf(k.key) : 0;
  openAdminModal(
    '<h3>' + (k ? 'Sửa nhóm công việc' : 'Thêm nhóm công việc') + '</h3>' +
    '<form class="admin-form" data-submit-action="wkSave" data-args=\'["__event__"' + (k ? ',"' + esc(k.key) + '"' : '') + ']\'>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Tên nhóm <span class="req">*</span></label><input id="wkLabel" required value="' + (k ? esc(k.label) : '') + '" placeholder="VD: Nhân viên kho"></div>' +
        '<div class="fld"><label>Mã <span class="req">*</span></label><input id="wkCode" required ' + (k ? 'readonly disabled' : '') + ' value="' + (k ? esc(k.key) : '') + '" placeholder="chữ thường, VD: warehouse">' +
          '<span class="hint-inline">' + (k ? 'Mã không sửa sau khi tạo.' : 'Chữ thường, số, gạch dưới; 2-32 ký tự, bắt đầu bằng chữ. Không sửa được sau khi tạo.') + '</span></div>' +
      '</div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="wkSelf" ' + (k && k.self ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Chỉ xem dữ liệu của chính mình</label>' +
        '<span class="hint-inline">Bật: nhân viên thuộc nhóm này chỉ thấy dữ liệu do chính họ phụ trách (app tự lọc), ô Khu vực bị ẩn ở form nhân viên; trạm gán lẻ chỉ để lọc danh sách khi xếp xe, phơi. Tắt: xem theo trạm lẻ + khu vực được gán.</span></div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="wkLicense" ' + (k && k.license ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Bắt buộc bằng lái</label>' +
        '<span class="hint-inline">Bật: form nhân viên bắt buộc nhập hạng và hạn bằng lái (áp cả khi đổi sang loại thuộc nhóm này).</span></div>' +
      (k && (types.length || staffN) ? '<div class="hr-note">⚠ Nhóm này đang được <b>' + types.length + '</b> loại nhân viên (' + staffN + ' nhân viên) dùng. Đổi hai cờ trên có hiệu lực ngay cho tất cả.</div>' : '') +
      '<div class="fld-row">' +
        '<div class="fld"><label>Thứ tự</label><input type="number" id="wkSort" min="1" value="' + (k ? k.sortOrder : FleetStore.getWorkKinds().length + 1) + '"></div>' +
        '<div class="fld"><label>Ghi chú</label><input id="wkNote" value="' + (k ? esc(k.note || '') : '') + '"></div>' +
      '</div>' +
      '<div class="fld"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="wkInactive" ' + (k && !k.active ? 'checked' : '') + ' style="min-width:auto;height:auto;"> Ngừng dùng</label>' +
        '<span class="hint-inline">Thay nút Xóa: không chọn được cho loại nhân viên mới; loại và nhân viên đang dùng giữ nguyên.</span></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function wkSave(e, key) {
  e.preventDefault();
  if (!wkRequireRoot()) return;
  var list = FleetStore.getWorkKinds();
  var label = $('wkLabel').value.trim();
  var rec = { key: key || $('wkCode').value.trim(), label: label, self: $('wkSelf').checked, license: $('wkLicense').checked,
              active: !$('wkInactive').checked, sortOrder: parseInt($('wkSort').value, 10) || 1, note: $('wkNote').value.trim() };
  if (!label) { showToast('Nhập tên nhóm.'); return; }
  if (!key && !/^[a-z][a-z0-9_]{1,31}$/.test(rec.key)) { showToast('Mã chỉ gồm chữ thường, số, gạch dưới (2-32 ký tự, bắt đầu bằng chữ).'); return; }
  if (list.some(function (x) { return x.key !== key && (x.key === rec.key || x.label.toLowerCase() === label.toLowerCase()); })) { showToast('Mã hoặc tên nhóm đã tồn tại.'); return; }
  var before = key ? list.find(function (x) { return x.key === key; }) : null;
  var now = Date.now(), me = hrActor().username;
  if (before) {
    rec.isSystem = before.isSystem; rec.createdAt = before.createdAt; rec.createdBy = before.createdBy; rec.updatedAt = now; rec.updatedBy = me;
    var flagChange = before.self !== rec.self || before.license !== rec.license;
    var used = wkTypesOf(key).length;
    if (flagChange && used && !confirm('Nhóm này đang có ' + used + ' loại nhân viên (' + wkStaffCountOf(key) + ' nhân viên). Đổi cờ sẽ áp ngay cho tất cả. Tiếp tục?')) return;
    list[list.indexOf(before)] = rec;
    hrLog('update', 'work_kinds', key, 'Sửa nhóm công việc "' + label + '"', hrDiff(before, rec, ['label', 'self', 'license', 'active', 'sortOrder', 'note']));
  } else {
    rec.isSystem = false; rec.createdAt = now; rec.createdBy = me;
    list.push(rec);
    hrLog('create', 'work_kinds', rec.key, 'Thêm nhóm công việc "' + label + '"', { created: { label: label, self: rec.self, license: rec.license } });
  }
  FleetStore.setWorkKinds(list);
  closeAdminModal(); showToast('Đã lưu nhóm công việc.'); renderStaffConfigView();
}

function wkToggleActive(key) {
  if (!wkRequireRoot()) return;
  var list = FleetStore.getWorkKinds(), k = list.find(function (x) { return x.key === key; }); if (!k) return;
  var used = wkTypesOf(key).length;
  if (k.active && !confirm('Ngừng dùng nhóm "' + k.label + '"? Không chọn được cho loại nhân viên mới' + (used ? ' (' + used + ' loại hiện tại vẫn giữ nguyên).' : '.'))) return;
  k.active = !k.active; k.updatedAt = Date.now(); k.updatedBy = hrActor().username;
  FleetStore.setWorkKinds(list);
  hrLog('update', 'work_kinds', key, (k.active ? 'Mở lại' : 'Ngừng dùng') + ' nhóm công việc "' + k.label + '"', { active: { old: !k.active, new: k.active } });
  showToast(k.active ? 'Đã mở lại nhóm.' : 'Đã ngừng dùng nhóm.'); renderStaffConfigView();
}
