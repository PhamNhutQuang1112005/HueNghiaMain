/* =========================================================
   2. QUẢN LÝ TUYẾN XE
   - Danh mục "Khu vực (Tỉnh/Thành)": 3 địa điểm gốc + địa điểm tự thêm (HN_ADMIN_REGIONS_KEY),
     quản lý qua modal "Cập nhật danh mục" (mở từ trang Trạm Xe)
   - 4 hướng chính (chọn bằng dropdown), mỗi hướng có các tuyến chính
   - Chọn một tuyến chính → thêm "Trạm có thể nhận" lấy từ danh mục trạm của từng địa điểm
   ========================================================= */
var SELECTED_DIR_ID = null;
var SELECTED_ROUTE_ID = null;
var ROUTE_FILTER = ''; // ô tìm tuyến ở trang Tuyến xe (lọc theo tên / mã tuyến trong hướng đang chọn)
var ROUTE_SEL = {}; // id tuyến đang tick chọn (bảng Tuyến) — dùng cho hành động "Xoá các tuyến đã chọn"
var STATION_GROUPS = [['fromStations', 'Trạm điểm đi'], ['toStations', 'Trạm điểm đến'], ['pickupStations', 'Trạm có thể nhận thêm khách']];

// Danh sách tỉnh cho dropdown: [key, tên, isCustom, active]. Mặc định chỉ tỉnh đang bật; { all: true } lấy cả tỉnh tắt.
// Nguồn dữ liệu: FleetStore.getRegions() (không còn cơ chế ẩn/xoá/khôi phục — dùng cờ active).
function getRegionMeta(opts) {
  var all = !!(opts && opts.all);
  return FleetStore.getRegions().slice().sort(byOrder)
    .filter(function (r) { return all || r.active !== false; })
    .map(function (r) { return [r.key, r.name, !!r.custom, r.active !== false]; });
}
function regionTitleOf(key) {
  var m = getRegionMeta({ all: true }).find(function (x) { return x[0] === key; });
  return m ? m[1] : (key || '');
}
var slugifyRegion = FleetStore.slugify;

function renderDirectionsView() {
  var dirs = FleetStore.getDirections().slice().sort(byOrder);
  var routes = FleetStore.getRoutes();
  if (!SELECTED_DIR_ID || !dirs.some(function (d) { return d.id === SELECTED_DIR_ID; })) {
    SELECTED_DIR_ID = dirs.length ? dirs[0].id : null;
  }

  // ----- Hướng đang chọn + danh sách tuyến -----
  var sel = dirs.find(function (d) { return d.id === SELECTED_DIR_ID; });
  var selRoutes = sel ? routes.filter(function (r) { return r.directionId === sel.id; }).sort(byOrder) : [];
  if (SELECTED_ROUTE_ID && !selRoutes.some(function (r) { return r.id === SELECTED_ROUTE_ID; })) SELECTED_ROUTE_ID = null;

  var rq = ROUTE_FILTER.trim().toLowerCase();
  var shownRoutes = rq
    ? selRoutes.filter(function (r) {
        return [r.label, r.abbr, (r.pickupStations || []).join(' ')].filter(Boolean).join(' ').toLowerCase().indexOf(rq) !== -1;
      })
    : selRoutes;

  // Thanh trên (1 hàng, mỗi ô có nhãn phía trên): Tìm tuyến — Hướng — Cập nhật hướng — + Thêm tuyến.
  var dirOptions = dirs.map(function (d) {
    return '<option value="' + esc(d.id) + '"' + (d.id === SELECTED_DIR_ID ? ' selected' : '') + '>' +
      esc(d.label) + (activeOf(d) ? '' : ' · đã tắt') + '</option>';
  }).join('');

  var toolbar = '<div class="st-toolbar">' +
    '<div class="filter-field st-search-field"><label>Tìm tuyến</label>' +
      '<input type="text" id="stRouteSearch" value="' + esc(ROUTE_FILTER) + '" placeholder="Tên tuyến, mã, trạm..." data-input-action="adminRouteSearch" data-args=\'["__this_value__"]\'></div>' +
    (dirs.length
      ? '<div class="filter-field st-dir-field"><label>Hướng</label>' +
          '<select data-change-action="adminSelectDirection" data-args=\'["__this_value__"]\'>' + dirOptions + '</select></div>'
      : '<span class="hint-inline">Chưa có hướng nào.</span>') +
    '<button class="btn btn-sm st-tb-btn" data-action="adminOpenDirsModal">Cập nhật hướng</button>' +
    (sel ? '<button class="btn btn-sm btn-primary st-tb-btn" data-action="adminOpenRouteModal" data-args=\'["","' + esc(sel.id) + '"]\'>+ Thêm tuyến</button>' : '') +
  '</div>';

  // Dọn lựa chọn của tuyến không còn hiển thị (đổi hướng / lọc lại).
  var visRouteIds = {}; shownRoutes.forEach(function (r) { visRouteIds[r.id] = true; });
  Object.keys(ROUTE_SEL).forEach(function (id) { if (!visRouteIds[id]) delete ROUTE_SEL[id]; });

  var tableHtml = sel ? renderRoutesTable(shownRoutes, !!rq)
    : '<div class="empty-state">Chưa có hướng nào. Bấm “+ Thêm hướng” để tạo.</div>';

  $('viewDirections').innerHTML =
    '<div class="st-right">' +
      toolbar +
      '<section class="st-col st-col-routes">' + tableHtml + '</section>' +
    '</div>' +
    '<div class="bulk-bar" id="rtActionBar" style="display:none;">' +
      '<span class="bulk-bar-hint" id="rtActionHint">Đã chọn 0 tuyến</span>' +
      '<div class="bulk-bar-fields">' +
        '<button type="button" class="btn btn-secondary" data-action="adminRouteClearSel">Hủy</button>' +
        '<button type="button" class="btn btn-danger" data-action="adminRouteDeleteSelected">Xoá các tuyến đã chọn</button>' +
      '</div>' +
    '</div>';
  adminRouteSyncBar();
}

function adminRouteSearch(v) { ROUTE_FILTER = v || ''; adminKeepFocus(renderDirectionsView); }

/* ---- Cập nhật danh mục tỉnh (thêm / sửa tên + mã / bật-tắt / xoá) — tất cả trong 1 modal.
   Mở từ trang Trạm Xe (nút "Cập nhật danh mục") — refresh đúng view đang hiển thị sau mỗi thay đổi. ---- */
function adminRerenderRegionViews() {
  if (typeof VIEW_RENDERERS === 'object' && VIEW_RENDERERS[CURRENT_VIEW]) VIEW_RENDERERS[CURRENT_VIEW]();
  else if (typeof renderDirectionsView === 'function') renderDirectionsView();
}
function renderRegionsManager() {
  var rows = getRegionMeta({ all: true }).map(function (rm) {
    var key = rm[0], isCustom = rm[2], on = rm[3];
    return '<div class="rgm-row' + (on ? '' : ' rgm-row-hidden') + '">' +
      '<div class="rgm-main">' +
        '<input class="rgm-name" value="' + esc(rm[1]) + '" data-region-key="' + esc(key) + '" aria-label="Tên tỉnh">' +
        '<input class="rgm-code" value="' + esc(FleetStore.getRegions().find(function (r) { return r.key === key; }).code) + '" data-region-code="' + esc(key) + '" aria-label="Mã tỉnh" placeholder="Mã" size="5">' +
        '<span class="rgm-count">' + (on ? (isCustom ? 'Tự thêm' : 'Mặc định') : 'Đã tắt') + '</span>' +
      '</div>' +
      '<div class="rgm-act">' +
        '<button type="button" class="btn btn-sm" data-action="adminRenameRegion" data-args=\'["' + esc(key) + '"]\'>Lưu</button>' +
        '<button type="button" class="btn btn-sm" data-action="adminToggleRegion" data-args=\'["' + esc(key) + '"]\'>' + (on ? 'Tắt' : 'Bật') + '</button>' +
        (isCustom ? '<button type="button" class="btn btn-sm btn-danger" data-action="adminRemoveRegion" data-args=\'["' + esc(key) + '"]\'>Xoá</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="rgm-list">' + rows + '</div>' +
    '<div class="rgm-add">' +
      '<input id="rgmNew" placeholder="Tên tỉnh mới" aria-label="Tên tỉnh mới">' +
      '<input id="rgmNewCode" placeholder="Mã (vd: CT)" aria-label="Mã tỉnh mới" size="8">' +
      '<button type="button" class="btn btn-primary" data-action="adminAddRegion">+ Thêm</button>' +
    '</div>';
}
function adminOpenRegionsModal() {
  openAdminModal(
    '<h3>Cập nhật danh mục tỉnh</h3>' +
    '<div class="admin-form regions-modal">' +
      renderRegionsManager() +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="closeAdminModal">Xong</button></div>' +
    '</div>',
    true
  );
}
function adminRegionDone(msg, entityId, action, summary) {
  FleetStore.log({ action: action, entity: 'region', entityId: entityId, summary: summary });
  showToast(msg);
  adminRerenderRegionViews();
  adminOpenRegionsModal();
}

function adminAddRegion() {
  var name = (($('rgmNew') || {}).value || '').trim();
  var code = (($('rgmNewCode') || {}).value || '').trim();
  var res = FleetStore.addRegion({ name: name, code: code });
  if (!res.ok) { showToast(res.reason); return; }
  adminRegionDone('Đã thêm tỉnh.', res.item.key, 'create', 'Thêm tỉnh "' + res.item.name + '"');
}

function adminRenameRegion(key) {
  var nameEl = document.querySelector('.rgm-name[data-region-key="' + key + '"]');
  var codeEl = document.querySelector('.rgm-code[data-region-code="' + key + '"]');
  var res = FleetStore.updateRegion(key, { name: nameEl && nameEl.value, code: codeEl && codeEl.value });
  if (!res.ok) { showToast(res.reason); return; }
  adminRegionDone('Đã lưu tỉnh.', key, 'update', 'Sửa tỉnh "' + res.item.name + '" (' + res.item.code + ')');
}

function adminToggleRegion(key) {
  var cur = FleetStore.getRegions().find(function (r) { return r.key === key; });
  if (!cur) return;
  var on = cur.active === false;
  var res = FleetStore.setRegionActive(key, on);
  if (!res.ok) { showToast(res.reason); return; }
  adminRegionDone(on ? 'Đã bật tỉnh.' : 'Đã tắt tỉnh.', key, 'toggle', (on ? 'Bật' : 'Tắt') + ' tỉnh "' + cur.name + '"');
}

function adminRemoveRegion(key) {
  if (!confirm('Xoá tỉnh này khỏi danh mục?')) return;
  var res = FleetStore.removeRegion(key);
  if (!res.ok) { showToast(res.reason); return; }
  adminRegionDone('Đã xoá tỉnh.', key, 'delete', 'Xoá tỉnh "' + key + '"');
}


function renderRoutesTable(routes, filtered) {
  var routeRows = routes.length ? routes.map(function (r, i) {
    var pk = r.pickupStations || [];
    var chips = pk.map(function (s, i) {
      return '<span class="chip">' + esc(s) + '<button title="Bỏ trạm" data-action="adminRemoveRouteStation" data-args=\'["' + esc(r.id) + '","pickupStations",' + i + ']\'>&times;</button></span>';
    }).join('');
    var pkCell = '<div class="rt-pickup chip-editor">' +
      (chips || '<span class="hint-inline">Chưa có trạm.</span>') +
      '<button class="btn btn-sm btn-ghost" data-action="adminOpenStationPicker" data-args=\'["' + esc(r.id) + '","pickupStations"]\'>+ chọn trạm</button>' +
    '</div>';
    var sel = !!ROUTE_SEL[r.id];
    return '<tr data-row-key="' + esc(r.id) + '" class="' + (sel ? 'selected-row' : '') + '">' +
      '<td class="col-stt">' + (i + 1) + '</td>' +
      '<td class="mono rt-col-abbr">' + esc(r.abbr || '—') + '</td><td>' + esc(r.label) + '</td>' +
      '<td class="rt-pickup-cell rt-col-pickup">' + pkCell + '</td>' +
      '<td class="col-status">' + activeTag(activeOf(r)) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminRouteRowMenu" data-args=\'["__this__","' + esc(r.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminRouteToggleRow" data-args=\'["' + esc(r.id) + '","__this__"]\'></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">' + (filtered ? 'Không tìm thấy tuyến phù hợp.' : 'Hướng này chưa có tuyến nào.') + '</td></tr>';

  var allChecked = routes.length && routes.every(function (r) { return ROUTE_SEL[r.id]; });
  return '<div class="table-wrap" style="border:0;border-radius:0;"><table class="admin-table rt-table"><thead><tr>' +
    '<th class="col-stt">STT</th><th class="rt-col-abbr">Mã</th><th>Tên tuyến chính</th><th class="rt-col-pickup">Trạm có thể nhận</th><th class="col-status">Trạng thái</th><th class="th-actions">Thao tác</th>' +
    '<th class="col-check"><input type="checkbox" id="rtCheckAll"' + (allChecked ? ' checked' : '') + ' data-action="adminRouteToggleAll" data-args=\'["__this__"]\'></th>' +
    '</tr></thead><tbody>' +
    routeRows + '</tbody></table></div>';
}

/* ---- Chọn nhiều dòng trong bảng Tuyến (checkbox cuối bảng) để xoá hàng loạt ---- */
function adminRouteSyncBar() {
  var bar = $('rtActionBar');
  if (!bar) return;
  var ids = Object.keys(ROUTE_SEL);
  if (!ids.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  var hint = $('rtActionHint'); if (hint) hint.textContent = 'Đã chọn ' + ids.length + ' tuyến';
}
function adminRouteToggleRow(id, cb) {
  if (cb.checked) ROUTE_SEL[id] = true; else delete ROUTE_SEL[id];
  var tr = document.querySelector('.st-col-routes tr[data-row-key="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  var all = $('rtCheckAll');
  if (all) all.checked = document.querySelectorAll('.st-col-routes td.col-check input[type="checkbox"]:not(:checked)').length === 0;
  adminRouteSyncBar();
}
function adminRouteToggleAll(cb) {
  var boxes = document.querySelectorAll('.st-col-routes tbody td.col-check input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (b) {
    var id = null;
    try { id = JSON.parse(b.getAttribute('data-args') || '[]')[0]; } catch (e) { /* ignore */ }
    if (!id) return;
    if (cb.checked) ROUTE_SEL[id] = true; else delete ROUTE_SEL[id];
  });
  renderDirectionsView();
}
function adminRouteClearSel() { ROUTE_SEL = {}; renderDirectionsView(); }
function adminRouteDeleteSelected() {
  var ids = Object.keys(ROUTE_SEL);
  if (!ids.length) return;
  var routes = FleetStore.getRoutes();
  var deletable = [], blocked = [];
  ids.forEach(function (id) {
    var r = routes.find(function (x) { return x.id === id; });
    var chk = FleetStore.canDeleteRoute(id);
    if (chk.ok) deletable.push(id); else blocked.push((r ? r.label : id) + ' (' + chk.reason + ')');
  });
  if (!deletable.length) { showToast('Không thể xoá: tất cả tuyến đã chọn đang được dùng.'); return; }
  var msg = 'Xoá ' + deletable.length + ' tuyến đã chọn?' + (blocked.length ? '\nBỏ qua ' + blocked.length + ' tuyến đang được dùng: ' + blocked.join(', ') : '');
  if (!confirm(msg)) return;
  var deletableSet = {}; deletable.forEach(function (id) { deletableSet[id] = true; });
  var list = routes.filter(function (x) { return !deletableSet[x.id]; });
  FleetStore.setRoutes(list);
  deletable.forEach(function (id) {
    FleetStore.log({ action: 'delete', entity: 'route', entityId: id, summary: 'Xoá tuyến ' + id });
    if (SELECTED_ROUTE_ID === id) SELECTED_ROUTE_ID = null;
    delete ROUTE_SEL[id];
  });
  showToast('Đã xoá ' + deletable.length + ' tuyến.' + (blocked.length ? ' Bỏ qua ' + blocked.length + ' tuyến đang dùng.' : ''));
  renderDirectionsView();
}

// Cột "Thao tác" bảng tuyến — dropdown nổi giống bên Trạm Xe (dùng chung adminOpenRowMenu ở admin-station-directory.js).
function adminRouteRowMenu(btn, routeId) {
  adminOpenRowMenu(btn, 'route:' + routeId,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenRouteModal" data-args=\'["' + esc(routeId) + '"]\'>Sửa tuyến</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteRoute" data-args=\'["' + esc(routeId) + '"]\'>Xoá tuyến</button>');
}

function adminSelectDirection(id) { SELECTED_DIR_ID = id; SELECTED_ROUTE_ID = null; renderDirectionsView(); }

/* ---- Cập nhật hướng — 1 modal gộp Thêm / Sửa (tên + tỉnh đi + tỉnh đến) / Bật-Tắt / Xoá cho mọi hướng ---- */
function adminOpenDirsModal() {
  openAdminModal(
    '<h3>Cập nhật hướng</h3>' +
    '<div class="admin-form regions-modal dirs-modal">' +
      renderDirsManager() +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="closeAdminModal">Xong</button></div>' +
    '</div>'
  );
}
// <select> tỉnh: chỉ tỉnh đang bật, riêng tỉnh đang chọn (kể cả đã tắt) vẫn giữ để không mất dữ liệu.
function dirRegionSelect(cls, attr, current, placeholder) {
  var opts = getRegionMeta({ all: true }).filter(function (m) { return m[3] || m[0] === current; });
  return '<select class="' + cls + '" ' + attr + ' aria-label="' + esc(placeholder) + '">' +
    '<option value=""' + (current ? '' : ' selected') + '>' + esc(placeholder) + '</option>' +
    opts.map(function (m) { return '<option value="' + esc(m[0]) + '"' + (m[0] === current ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') +
  '</select>';
}
function renderDirsManager() {
  var dirs = FleetStore.getDirections().slice().sort(byOrder);
  var rows = dirs.map(function (d) {
    var on = activeOf(d);
    return '<div class="rgm-row' + (on ? '' : ' rgm-row-hidden') + '">' +
      '<div class="rgm-main">' +
        '<input class="rgm-name dm-name" value="' + esc(d.label) + '" data-dir-id="' + esc(d.id) + '" aria-label="Tên hướng">' +
        dirRegionSelect('dm-from', 'data-dir-from="' + esc(d.id) + '"', d.fromRegion || '', '— Tỉnh đi —') +
        dirRegionSelect('dm-to', 'data-dir-to="' + esc(d.id) + '"', d.toRegion || '', '— Tỉnh đến —') +
      '</div>' +
      '<div class="rgm-act">' +
        '<button type="button" class="btn btn-sm" data-action="adminSaveDirName" data-args=\'["' + esc(d.id) + '"]\'>Lưu</button>' +
        '<button type="button" class="btn btn-sm" data-action="adminToggleDirectionActive" data-args=\'["' + esc(d.id) + '"]\'>' + (on ? 'Tắt' : 'Bật') + '</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="adminDeleteDirection" data-args=\'["' + esc(d.id) + '"]\'>Xoá</button>' +
      '</div>' +
    '</div>';
  }).join('') || '<div class="empty-state">Chưa có hướng nào.</div>';

  return '<div class="rgm-list">' + rows + '</div>' +
    '<div class="rgm-add dm-add">' +
      '<input id="dmNewLabel" placeholder="Tên hướng mới — VD: Sài Gòn - An Giang" aria-label="Tên hướng mới">' +
      '<input id="dmNewKey" placeholder="Mã (vd: sg-ag)" aria-label="Mã hướng">' +
      dirRegionSelect('', 'id="dmNewFrom"', '', '— Tỉnh đi —') +
      dirRegionSelect('', 'id="dmNewTo"', '', '— Tỉnh đến —') +
      '<button type="button" class="btn btn-primary" data-action="adminAddDirection">+ Thêm</button>' +
    '</div>';
}

function adminSaveDirName(id) {
  var inp = document.querySelector('.dm-name[data-dir-id="' + id + '"]');
  var fields = {
    label: (inp && inp.value || '').trim(),
    fromRegion: (document.querySelector('[data-dir-from="' + id + '"]') || {}).value || '',
    toRegion: (document.querySelector('[data-dir-to="' + id + '"]') || {}).value || ''
  };
  var list = FleetStore.getDirections();
  var d = list.find(function (x) { return x.id === id; });
  if (!d) return;
  var why = FleetStore.validateDirection(fields, id);
  if (why) { showToast(why); return; }
  if (d.label === fields.label && d.fromRegion === fields.fromRegion && d.toRegion === fields.toRegion) { showToast('Không có thay đổi.'); return; }
  var before = JSON.parse(JSON.stringify(d));
  d.label = fields.label; d.fromRegion = fields.fromRegion; d.toRegion = fields.toRegion;
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'update', entity: 'direction', entityId: id, summary: 'Sửa hướng ' + fields.label, before: before, after: d });
  showToast('Đã lưu hướng.');
  renderDirectionsView();
  adminOpenDirsModal();
}

function adminAddDirection() {
  var fields = {
    label: ($('dmNewLabel').value || '').trim(),
    fromRegion: $('dmNewFrom').value,
    toRegion: $('dmNewTo').value
  };
  var key = ($('dmNewKey').value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  var why = FleetStore.validateDirection(fields, null);
  if (why) { showToast(why); return; }
  if (!key) key = slugifyRegion(fields.label);
  var list = FleetStore.getDirections();
  if (list.some(function (x) { return x.id === key; })) { showToast('Mã hướng "' + key + '" đã tồn tại.'); return; }
  var maxOrder = list.reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
  var nd = { id: key, label: fields.label, fromRegion: fields.fromRegion, toRegion: fields.toRegion, active: true, order: maxOrder + 1 };
  list.push(nd);
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'create', entity: 'direction', entityId: key, summary: 'Thêm hướng ' + fields.label, after: nd });
  SELECTED_DIR_ID = key;
  showToast('Đã thêm hướng.');
  renderDirectionsView();
  adminOpenDirsModal();
}

function adminToggleDirectionActive(id) {
  var list = FleetStore.getDirections();
  var d = list.find(function (x) { return x.id === id; });
  if (!d) return;
  d.active = !activeOf(d);
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'toggle', entity: 'direction', entityId: id, summary: (d.active ? 'Bật' : 'Tắt') + ' hướng ' + d.label });
  showToast(d.active ? 'Đã bật hướng.' : 'Đã tắt hướng.');
  renderDirectionsView();
  adminOpenDirsModal();
}

function adminDeleteDirection(id) {
  var chk = FleetStore.canDeleteDirection(id);
  if (!chk.ok) { showToast('Không thể xoá: ' + chk.reason); return; }
  if (!confirm('Xoá hướng này?')) return;
  var list = FleetStore.getDirections().filter(function (x) { return x.id !== id; });
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'delete', entity: 'direction', entityId: id, summary: 'Xoá hướng ' + id });
  if (SELECTED_DIR_ID === id) SELECTED_DIR_ID = null;
  showToast('Đã xoá hướng.');
  renderDirectionsView();
  adminOpenDirsModal();
}

/* ---- Trạm của tuyến ---- */
function mutateRoute(id, fn) {
  var list = FleetStore.getRoutes();
  var r = list.find(function (x) { return x.id === id; });
  if (!r) return;
  fn(r);
  FleetStore.setRoutes(list);
}
function adminRemoveRouteStation(routeId, kind, idx) {
  var removed = '';
  mutateRoute(routeId, function (r) {
    if (!Array.isArray(r[kind])) return;
    removed = r[kind][idx];
    r[kind].splice(idx, 1);
  });
  FleetStore.log({ action: 'update', entity: 'route', entityId: routeId, summary: 'Bỏ trạm "' + removed + '" khỏi ' + kind });
  if (typeof CURRENT_VIEW !== 'undefined' && CURRENT_VIEW === 'viewPricing') {
    renderPricingView();
  } else {
    renderDirectionsView();
  }
}
function adminOpenStationPicker(routeId, kind) {
  var r = FleetStore.getRoutes().find(function (x) { return x.id === routeId; });
  if (!r) return;
  var groupLabel = (STATION_GROUPS.filter(function (g) { return g[0] === kind; })[0] || ['', 'Trạm'])[1];
  var chosen = {};
  (r[kind] || []).forEach(function (s) { chosen[s] = true; });
  var metaPick = getRegionMeta();
  var dir = FleetStore.getDirections().find(function (x) { return x.id === r.directionId; }) || {};
  // Trạm đi → tỉnh đi của hướng; trạm đến / nhận thêm → tỉnh đến. Hướng chưa có tỉnh thì không lọc.
  var wantRegion = kind === 'fromStations' ? dir.fromRegion : dir.toRegion;
  var byRegion = {};
  var regionTitle = {};
  metaPick.forEach(function (m) { if (!wantRegion || m[0] === wantRegion) { byRegion[m[0]] = []; regionTitle[m[0]] = m[1]; } });
  // Chỉ trạm đang bật; trạm đã chọn từ trước mà nay tắt vẫn hiện (đã tick) để không mất khi lưu.
  FleetStore.getStations().forEach(function (s) {
    if (!byRegion[s.region]) return;
    if (s.active !== false || chosen[s.name]) byRegion[s.region].push(s.name);
  });
  var groupsHtml = Object.keys(byRegion).filter(function (k) { return byRegion[k].length; }).map(function (k) {
    return '<div class="sp-region">' +
      '<div class="grp-label">' + regionTitle[k] + ' <span class="sp-count">' + byRegion[k].length + '</span></div>' +
      '<div class="chip-editor">' + byRegion[k].map(function (n) {
        var a = esc(n);
        return '<label class="chip sp-opt" title="' + a + '"><input type="checkbox" value="' + a + '"' + (chosen[n] ? ' checked' : '') + '><span>' + a + '</span></label>';
      }).join('') + '</div>' +
    '</div>';
  }).join('');
  openAdminModal(
    '<h3>Chọn trạm — ' + esc(groupLabel) + '</h3>' +
    '<form class="admin-form sp-picker" data-submit-action="adminSaveStationPick" data-args=\'["__event__"]\'>' +
      '<p class="sp-hint hint-inline">Tuyến: <b>' + esc(r.label) + '</b></p>' +
      '<input type="hidden" id="spRoute" value="' + esc(routeId) + '"><input type="hidden" id="spKind" value="' + esc(kind) + '">' +
      '<div class="sp-list" id="spList">' + (groupsHtml || '<span class="hint-inline">Danh mục trạm trống.</span>') + '</div>' +
      '<div class="fld sp-addfld"><label>Thêm trạm mới vào danh mục</label>' +
        '<div class="sp-addrow">' +
          '<input id="spNew" placeholder="Tên trạm mới">' +
          '<select id="spNewRegion"><option value="">— chọn tỉnh —</option>' +
            metaPick.map(function (m) { return '<option value="' + esc(m[0]) + '">' + esc(m[1]) + '</option>'; }).join('') +
          '</select>' +
        '</div></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>',
    false, true
  );
}
function adminSaveStationPick(e) {
  e.preventDefault();
  var routeId = $('spRoute').value, kind = $('spKind').value;
  var picked = Array.prototype.map.call($('spList').querySelectorAll('input[type=checkbox]:checked'), function (c) { return c.value; });
  var newName = ($('spNew').value || '').trim();
  if (newName) {
    if (!$('spNewRegion').value) { showToast('Chọn tỉnh cho trạm mới.'); return; }
    if (!FleetStore.addStation(newName, $('spNewRegion').value)) { showToast('Không thêm được trạm "' + newName + '" (trùng tên hoặc tỉnh sai).'); return; }
    if (picked.indexOf(newName) === -1) picked.push(newName);
  }
  mutateRoute(routeId, function (r) { r[kind] = picked; });
  FleetStore.log({ action: 'update', entity: 'route', entityId: routeId, summary: 'Cập nhật ' + kind + ' (' + picked.length + ' trạm)' });
  showToast('Đã lưu trạm.');
  closeAdminModal();
  if (typeof CURRENT_VIEW !== 'undefined' && CURRENT_VIEW === 'viewPricing') {
    renderPricingView();
  } else {
    renderDirectionsView();
  }
}

/* "Loại xe" của 1 tuyến/mức giá — dùng lại đúng danh mục Loại xe (scope 'line') như modal "Tạo phơi xe"
   (admin-trips.js) thay vì tự bịa danh sách riêng. Route đang sửa mà vehicleType không còn active/đã bị
   xoá khỏi danh mục vẫn được giữ lại trong <select> (nối thêm) để không mất dữ liệu cũ khi sửa. */
function routeVehicleTypeOptionsHtml(current) {
  var vtypes = FleetStore.getVehicleTypes({ scope: 'line' }).filter(activeOf);
  if (current && !vtypes.some(function (v) { return v.name === current; })) vtypes = vtypes.concat([{ name: current }]);
  return vtypes.map(function (v) {
    return '<option value="' + esc(v.name) + '"' + (v.name === current ? ' selected' : '') + '>' + esc(v.name) + '</option>';
  }).join('');
}

// Mỗi tuyến có 2 ô giá độc lập: Ghế đơn và Ghế đôi (không còn phụ thuộc vào Loại xe như trước). Điền cả
// 2 ô thì cột "Giá" ở bảng Quản lý giá hiện cả 2 mức (Đơn/Đôi, như xe 24 Phòng hiện nay); chỉ điền 1 ô thì
// cột "Giá" chỉ hiện đúng 1 mức đó (như các xe còn lại). Logic quyết định hasDouble nằm ở buildSeatPriceMeta
// (admin-placeholders.js), dựa trên chính 2 giá trị route.price/route.doubleSeatPrice.
function adminOpenRouteModal(id, directionId) {
  var routes = FleetStore.getRoutes();
  var r = id ? routes.find(function (x) { return x.id === id; }) : null;
  var dirs = FleetStore.getDirections().slice().sort(byOrder);
  var parentId = r ? r.directionId : (directionId || SELECTED_DIR_ID || (dirs[0] && dirs[0].id));
  openAdminModal(
    '<h3>' + (r ? 'Sửa tuyến' : 'Thêm tuyến') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveRoute" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="rmId" value="' + (r ? esc(r.id) : '') + '">' +
      '<div class="fld"><label>Thuộc hướng *</label><select id="rmDir">' +
        dirs.map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === parentId ? ' selected' : '') + '>' + esc(d.label) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="fld"><label>Tên tuyến *</label>' +
        '<input id="rmLabel" required value="' + (r ? esc(r.label) : '') + '" placeholder="VD: Sài Gòn - An Giang"></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Mã tuyến</label><input id="rmAbbr" value="' + (r ? esc(r.abbr || '') : '') + '" placeholder="SG-LX"></div>' +
        '<div class="fld"><label>Loại xe *</label><select id="rmVehicleType" required>' + routeVehicleTypeOptionsHtml(r ? r.vehicleType : '') + '</select></div>' +
      '</div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Giá vé ghế đơn (đ)</label><input id="rmPrice" type="number" min="0" step="5000" placeholder="Bỏ trống nếu không bán" value="' + (r && r.price ? r.price : '') + '"></div>' +
        '<div class="fld"><label>Giá vé ghế đôi (đ)</label><input id="rmDoublePrice" type="number" min="0" step="5000" placeholder="Bỏ trống nếu không bán" value="' + (r && r.doubleSeatPrice ? r.doubleSeatPrice : '') + '"></div>' +
      '</div>' +
      '<div class="fld"><label><input type="checkbox" id="rmActive" ' + (!r || activeOf(r) ? 'checked' : '') + '> Đang hoạt động</label></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function adminSaveRoute(e) {
  e.preventDefault();
  var id0 = $('rmId').value;
  var label = $('rmLabel').value.trim();
  var dirId = $('rmDir').value;
  var price = parseInt($('rmPrice').value, 10) || 0;
  var doublePrice = parseInt($('rmDoublePrice').value, 10) || 0;
  if (!label || !dirId) { showToast('Nhập đủ Tên tuyến và hướng.'); return; }
  if (!price && !doublePrice) { showToast('Nhập ít nhất 1 trong 2 giá vé (ghế đơn hoặc ghế đôi).'); return; }
  var list = FleetStore.getRoutes();
  if (list.some(function (x) { return x.label === label && x.id !== id0; })) { showToast('Tên tuyến đã tồn tại.'); return; }
  var abbr = $('rmAbbr').value.trim();
  var vehicleType = ($('rmVehicleType') || {}).value || '';
  var active = $('rmActive').checked;

  if (id0) {
    var r = list.find(function (x) { return x.id === id0; });
    var before = JSON.parse(JSON.stringify(r));
    r.label = label; r.directionId = dirId; r.price = price; r.doubleSeatPrice = doublePrice; r.abbr = abbr; r.vehicleType = vehicleType; r.active = active;
    FleetStore.setRoutes(list);
    FleetStore.log({ action: 'update', entity: 'route', entityId: id0, summary: 'Sửa tuyến ' + label, before: before, after: r });
  } else {
    var newId = dirId + '-' + Date.now().toString(36);
    var maxOrder = list.filter(function (x) { return x.directionId === dirId; }).reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
    var nr = { id: newId, directionId: dirId, label: label, abbr: abbr, price: price, doubleSeatPrice: doublePrice, vehicleType: vehicleType, active: active, order: maxOrder + 1, fromStations: [], toStations: [], pickupStations: [] };
    list.push(nr);
    FleetStore.setRoutes(list);
    FleetStore.log({ action: 'create', entity: 'route', entityId: newId, summary: 'Thêm tuyến ' + label, after: nr });
    SELECTED_ROUTE_ID = newId;
  }
  SELECTED_DIR_ID = dirId;
  closeAdminModal();
  showToast('Đã lưu tuyến.');
  if (typeof CURRENT_VIEW !== 'undefined' && CURRENT_VIEW === 'viewPricing') {
    renderPricingView();
  } else {
    renderDirectionsView();
  }
}

/* "Sao chép mẫu" (nút Sao chép ở bảng Quản lý giá) — nhân bản 1 tuyến/mức giá thành 1 dòng MỚI ngay lập
   tức (không qua modal, vì modal Thêm/Sửa tuyến không có ô Trạm đi/Trạm đến — 2 trường đó chỉ sửa được
   qua chip-editor trong bảng), copy đủ Giá/Loại xe/Trạm đi/Trạm đến/Tuyến chính rồi để admin đổi tên +
   chỉnh lại cho nhanh thay vì gõ lại từ đầu. Tên tuyến phải là DUY NHẤT (adminSaveRoute kiểm tra) nên tự
   thêm hậu tố "(Copy)"/"(Copy 2)"... cho tới khi không trùng. */
function adminDuplicateRoute(id) {
  var list = FleetStore.getRoutes();
  var src = list.find(function (x) { return x.id === id; });
  if (!src) return;

  var baseLabel = src.label + ' (Copy)';
  var label = baseLabel, n = 2;
  while (list.some(function (x) { return x.label === label; })) { label = baseLabel + ' ' + n; n++; }

  var newId = src.directionId + '-' + Date.now().toString(36);
  var maxOrder = list.filter(function (x) { return x.directionId === src.directionId; }).reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
  var copy = {
    id: newId, directionId: src.directionId, label: label, abbr: src.abbr || '',
    price: src.price || 0, doubleSeatPrice: src.doubleSeatPrice, vehicleType: src.vehicleType || '',
    active: true, order: maxOrder + 1,
    fromStations: (src.fromStations || []).slice(),
    toStations: (src.toStations || []).slice(),
    pickupStations: (src.pickupStations || []).slice()
  };
  list.push(copy);
  FleetStore.setRoutes(list);
  FleetStore.log({ action: 'create', entity: 'route', entityId: newId, summary: 'Sao chép tuyến từ "' + src.label + '" thành "' + label + '"', after: copy });
  showToast('Đã sao chép "' + src.label + '" — đổi tên nếu cần.');
  renderPricingView();
}

function adminDeleteRoute(id) {
  var chk = FleetStore.canDeleteRoute(id);
  if (!chk.ok) { showToast('Không thể xoá: ' + chk.reason); return; }
  if (!confirm('Xoá tuyến này?')) return;
  var list = FleetStore.getRoutes().filter(function (x) { return x.id !== id; });
  FleetStore.setRoutes(list);
  FleetStore.log({ action: 'delete', entity: 'route', entityId: id, summary: 'Xoá tuyến ' + id });
  if (SELECTED_ROUTE_ID === id) SELECTED_ROUTE_ID = null;
  showToast('Đã xoá tuyến.');
  if (typeof CURRENT_VIEW !== 'undefined' && CURRENT_VIEW === 'viewPricing') {
    renderPricingView();
  } else {
    renderDirectionsView();
  }
}

