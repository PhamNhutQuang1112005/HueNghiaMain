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

// Danh sách tỉnh cho dropdown: [key, tên, active]. Mặc định chỉ tỉnh đang bật; { all: true } lấy cả tỉnh tắt.
// Nguồn dữ liệu: FleetStore.getRegions() (không còn cơ chế ẩn/xoá/khôi phục — dùng cờ active).
function getRegionMeta(opts) {
  var all = !!(opts && opts.all);
  return FleetStore.getRegions().slice().sort(byOrder)
    .filter(function (r) { return all || r.active !== false; })
    .map(function (r) { return [r.key, r.name, r.active !== false]; });
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
    var key = rm[0], on = rm[2];
    var rg = FleetStore.getRegions().find(function (r) { return r.key === key; }) || {};
    return '<div class="rgm-row' + (on ? '' : ' rgm-row-hidden') + '">' +
      '<div class="rgm-main">' +
        '<input class="rgm-name" value="' + esc(rm[1]) + '" data-region-key="' + esc(key) + '" aria-label="Tên tỉnh">' +
        '<span class="rgm-count">Mã: ' + esc(FleetStore.getRegions().find(function (r) { return r.key === key; }).code) + '</span>' +
        '<span class="rgm-count">' + (on ? '' : 'Đã tắt') + '</span>' +
        '<span class="rgm-count" title="Tạo: ' + esc(rg.createdAt ? fmtStamp(rg.createdAt) + ' · ' + (rg.createdBy || '—') : '—') + '">Sửa: ' + esc(rg.updatedAt ? fmtStamp(rg.updatedAt) + ' · ' + (rg.updatedBy || '—') : '—') + '</span>' +
      '</div>' +
      '<div class="rgm-act">' +
        '<span class="mv">' +
          '<button type="button" data-action="adminMoveRegion" data-args=\'["' + esc(key) + '",-1]\' aria-label="Lên">▲</button>' +
          '<button type="button" data-action="adminMoveRegion" data-args=\'["' + esc(key) + '",1]\' aria-label="Xuống">▼</button>' +
        '</span>' +
        '<button type="button" class="btn btn-sm" data-action="adminRenameRegion" data-args=\'["' + esc(key) + '"]\'>Lưu</button>' +
        '<button type="button" class="btn btn-sm" data-action="adminToggleRegion" data-args=\'["' + esc(key) + '"]\'>' + (on ? 'Tắt' : 'Bật') + '</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="adminRemoveRegion" data-args=\'["' + esc(key) + '"]\'>Xoá</button>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="rgm-list">' + rows + '</div>' +
    '<div class="rgm-add">' +
      '<input id="rgmNew" placeholder="Tên tỉnh mới" aria-label="Tên tỉnh mới">' +
      '<button type="button" class="btn btn-primary" data-action="adminAddRegion">+ Thêm</button>' +
    '</div>';
}
function adminOpenRegionsModal() {
  if (!adminRequire('manage_regions')) return;
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

function adminMoveRegion(key, delta) {
  if (!adminRequire('manage_regions')) return;
  FleetStore.moveRegion(key, delta);
  adminRerenderRegionViews();
  adminOpenRegionsModal();
}

function adminAddRegion() {
  if (!adminRequire('manage_regions')) return;
  var name = (($('rgmNew') || {}).value || '').trim();
  var res = FleetStore.addRegion({ name: name });
  if (!res.ok) { showToast(res.reason); return; }
  adminRegionDone('Đã thêm tỉnh.', res.item.key, 'create', 'Thêm tỉnh "' + res.item.name + '"');
}

function adminRenameRegion(key) {
  if (!adminRequire('manage_regions')) return;
  var nameEl = document.querySelector('.rgm-name[data-region-key="' + key + '"]');
  var res = FleetStore.updateRegion(key, { name: nameEl && nameEl.value });
  if (!res.ok) { showToast(res.reason); return; }
  adminRegionDone('Đã lưu tỉnh.', key, 'update', 'Sửa tỉnh "' + res.item.name + '"');
}

function adminToggleRegion(key) {
  if (!adminRequire('manage_regions')) return;
  var cur = FleetStore.getRegions().find(function (r) { return r.key === key; });
  if (!cur) return;
  var on = cur.active === false;
  var res = FleetStore.setRegionActive(key, on);
  if (!res.ok) { showToast(res.reason); return; }
  adminRegionDone(on ? 'Đã bật tỉnh.' : 'Đã tắt tỉnh.', key, 'toggle', (on ? 'Bật' : 'Tắt') + ' tỉnh "' + cur.name + '"');
}

function adminRemoveRegion(key) {
  if (!adminRequire('manage_regions')) return;
  if (!confirm('Xoá tỉnh này khỏi danh mục?')) return;
  var res = FleetStore.removeRegion(key);
  if (!res.ok) { showToast(res.reason); return; }
  adminRegionDone('Đã xoá tỉnh.', key, 'delete', 'Xoá tỉnh "' + key + '"');
}


function routeStationCell(r, field, label) {
  var chips = (r[field] || []).map(function (s, i) {
    return '<span class="chip">' + esc(s) + '<button title="Bỏ trạm" data-action="adminRemoveRouteStation" data-args=\'["' + esc(r.id) + '","' + field + '",' + i + ']\'>&times;</button></span>';
  }).join('');
  return '<div class="rt-pickup chip-editor">' + (chips || '<span class="hint-inline">Chưa có trạm.</span>') +
    '<button class="btn btn-sm btn-ghost" data-action="adminOpenStationPicker" data-args=\'["' + esc(r.id) + '","' + field + '"]\'>+ chọn ' + label + '</button></div>';
}

function renderRoutesTable(routes, filtered) {
  var routeRows = routes.length ? routes.map(function (r, i) {
    var sel = !!ROUTE_SEL[r.id];
    return '<tr data-row-key="' + esc(r.id) + '" class="' + (sel ? 'selected-row' : '') + '">' +
      '<td class="col-stt">' + (i + 1) + '</td>' +
      '<td class="mono rt-col-abbr">' + esc(r.abbr || '—') + '</td><td>' + esc(r.label) + '</td>' +
      '<td class="rt-pickup-cell rt-col-pickup">' + routeStationCell(r, 'pickupStations', 'điểm nhận') + '</td>' +
      '<td class="col-status">' + activeTag(activeOf(r)) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminRouteRowMenu" data-args=\'["__this__","' + esc(r.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminRouteToggleRow" data-args=\'["' + esc(r.id) + '","__this__"]\'></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">' + (filtered ? 'Không tìm thấy tuyến phù hợp.' : 'Hướng này chưa có tuyến nào.') + '</td></tr>';

  var allChecked = routes.length && routes.every(function (r) { return ROUTE_SEL[r.id]; });
  return '<div class="table-wrap" style="border:0;border-radius:0;"><table class="admin-table rt-table"><thead><tr>' +
    '<th class="col-stt">STT</th><th class="rt-col-abbr">Mã</th><th>Tên tuyến chính</th><th class="rt-col-pickup">Điểm có thể nhận</th><th class="col-status">Trạng thái</th><th class="th-actions">Thao tác</th>' +
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
  if (!adminRequire('manage_routes')) return;
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
  if (!adminRequire('manage_directions')) return;
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
  var opts = getRegionMeta({ all: true }).filter(function (m) { return m[2] || m[0] === current; });
  return '<select class="' + cls + '" ' + attr + ' aria-label="' + esc(placeholder) + '">' +
    '<option value=""' + (current ? '' : ' selected') + '>' + esc(placeholder) + '</option>' +
    opts.map(function (m) { return '<option value="' + esc(m[0]) + '"' + (m[0] === current ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') +
  '</select>';
}
// Các tỉnh giữa (có thứ tự, không giới hạn số lượng): chip + <select> "+ Tỉnh giữa". Trạng thái nằm ở data-vias.
function viaWidgetHtml(attr, vias) {
  return '<div class="dm-via" ' + attr + ' data-vias="' + esc(vias.join(',')) + '">' + viaInnerHtml(vias) + '</div>';
}
function viaInnerHtml(vias) {
  var meta = getRegionMeta({ all: true });
  var name = function (k) { var m = meta.filter(function (x) { return x[0] === k; })[0]; return m ? m[1] : k; };
  return vias.map(function (k, i) {
    return '<span class="chip">' + esc(name(k)) + '<button type="button" title="Bỏ tỉnh giữa" data-action="adminDirViaRemove" data-args=\'["__this__",' + i + ']\'>&times;</button></span>';
  }).join('') +
  '<select data-change-action="adminDirViaAdd" data-args=\'["__this__"]\' aria-label="Thêm tỉnh giữa"><option value="">+ Tỉnh giữa</option>' +
    meta.filter(function (m) { return m[2] && vias.indexOf(m[0]) === -1; }).map(function (m) { return '<option value="' + esc(m[0]) + '">' + esc(m[1]) + '</option>'; }).join('') +
  '</select>';
}
function viasOf(w) { return w && w.dataset.vias ? w.dataset.vias.split(',') : []; }
function setVias(w, vias) { w.dataset.vias = vias.join(','); w.innerHTML = viaInnerHtml(vias); }
function adminDirViaAdd(sel) {
  var w = sel.closest('.dm-via');
  if (sel.value) setVias(w, viasOf(w).concat(sel.value));
}
function adminDirViaRemove(btn, idx) {
  var w = btn.closest('.dm-via'), v = viasOf(w);
  v.splice(idx, 1);
  setVias(w, v);
}
function renderDirsManager() {
  var dirs = FleetStore.getDirections().slice().sort(byOrder);
  var rows = dirs.map(function (d) {
    var on = activeOf(d);
    return '<div class="rgm-row' + (on ? '' : ' rgm-row-hidden') + '">' +
      '<div class="rgm-main">' +
        '<input class="rgm-name dm-name" value="' + esc(d.label) + '" data-dir-id="' + esc(d.id) + '" aria-label="Tên hướng">' +
        dirRegionSelect('dm-from', 'data-dir-from="' + esc(d.id) + '"', d.fromRegion || '', '— Tỉnh đi —') +
        viaWidgetHtml('data-dir-via="' + esc(d.id) + '"', d.viaRegions || []) +
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
      dirRegionSelect('', 'id="dmNewFrom"', '', '— Tỉnh đi —') +
      viaWidgetHtml('id="dmNewVia"', []) +
      dirRegionSelect('', 'id="dmNewTo"', '', '— Tỉnh đến —') +
      '<button type="button" class="btn btn-primary" data-action="adminAddDirection">+ Thêm</button>' +
    '</div>';
}

function adminSaveDirName(id) {
  if (!adminRequire('manage_directions')) return;
  var inp = document.querySelector('.dm-name[data-dir-id="' + id + '"]');
  var fields = {
    label: (inp && inp.value || '').trim(),
    fromRegion: (document.querySelector('[data-dir-from="' + id + '"]') || {}).value || '',
    viaRegions: viasOf(document.querySelector('[data-dir-via="' + id + '"]')),
    toRegion: (document.querySelector('[data-dir-to="' + id + '"]') || {}).value || ''
  };
  var list = FleetStore.getDirections();
  var d = list.find(function (x) { return x.id === id; });
  if (!d) return;
  var why = FleetStore.validateDirection(fields, id);
  if (why) { showToast(why); return; }
  if (d.label === fields.label && d.fromRegion === fields.fromRegion && d.toRegion === fields.toRegion && (d.viaRegions || []).join() === fields.viaRegions.join()) { showToast('Không có thay đổi.'); return; }
  var before = JSON.parse(JSON.stringify(d));
  d.label = fields.label; d.fromRegion = fields.fromRegion; d.toRegion = fields.toRegion; d.viaRegions = fields.viaRegions;
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'update', entity: 'direction', entityId: id, summary: 'Sửa hướng ' + fields.label, before: before, after: d });
  showToast('Đã lưu hướng.');
  renderDirectionsView();
  adminOpenDirsModal();
}

function adminAddDirection() {
  if (!adminRequire('manage_directions')) return;
  var fields = {
    label: ($('dmNewLabel').value || '').trim(),
    fromRegion: $('dmNewFrom').value,
    viaRegions: viasOf($('dmNewVia')),
    toRegion: $('dmNewTo').value
  };
  var why = FleetStore.validateDirection(fields, null);
  if (why) { showToast(why); return; }
  var key = FleetStore.genDirectionId(fields.fromRegion, fields.toRegion, fields.viaRegions); // mã hướng tự sinh từ mã các tỉnh
  var list = FleetStore.getDirections();
  var maxOrder = list.reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
  var nd = { id: key, label: fields.label, fromRegion: fields.fromRegion, viaRegions: fields.viaRegions, toRegion: fields.toRegion, active: true, order: maxOrder + 1 };
  list.push(nd);
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'create', entity: 'direction', entityId: key, summary: 'Thêm hướng ' + fields.label, after: nd });
  SELECTED_DIR_ID = key;
  showToast('Đã thêm hướng.');
  renderDirectionsView();
  adminOpenDirsModal();
}

function adminToggleDirectionActive(id) {
  if (!adminRequire('manage_directions')) return;
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
  if (!adminRequire('manage_directions')) return;
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
  // Khung giá chỉ hợp lệ với trạm còn nằm trong tuyến.
  if (r.priceFrames) syncRoutePrices(r);
  FleetStore.setRoutes(list);
}
function adminRemoveRouteStation(routeId, kind, idx) {
  if (!adminRequire('manage_routes')) return;
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
  if (!adminRequire('manage_routes')) return;
  var r = FleetStore.getRoutes().find(function (x) { return x.id === routeId; });
  if (!r) return;
  var groupLabel = (STATION_GROUPS.filter(function (g) { return g[0] === kind; })[0] || ['', 'Trạm'])[1];
  var chosen = {};
  (r[kind] || []).forEach(function (s) { chosen[s] = true; });
  var metaPick = getRegionMeta();
  var dir = FleetStore.getDirections().find(function (x) { return x.id === r.directionId; }) || {};
  // Trạm đi → tỉnh đi của hướng; trạm đến / nhận thêm → tỉnh đến. Hướng chưa có tỉnh thì không lọc.
  // Trạm nhận thêm khách nằm dọc đường đi → cho chọn cả tỉnh đi lẫn tỉnh đến.
  var wantRegions = kind === 'fromStations' ? [dir.fromRegion] : kind === 'pickupStations' ? FleetStore.directionRegions(dir) : [dir.toRegion];
  var noFilter = !wantRegions.some(Boolean);
  var byRegion = {};
  var regionTitle = {};
  metaPick.forEach(function (m) { if (noFilter || wantRegions.indexOf(m[0]) !== -1) { byRegion[m[0]] = []; regionTitle[m[0]] = m[1]; } });
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
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>',
    false, true
  );
}
function adminSaveStationPick(e) {
  e.preventDefault();
  if (!adminRequire('manage_routes')) return;
  var routeId = $('spRoute').value, kind = $('spKind').value;
  var picked = Array.prototype.map.call($('spList').querySelectorAll('input[type=checkbox]:checked'), function (c) { return c.value; });
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

// Trạm của tỉnh đi / tỉnh đến theo hướng: 'from' → ô tick nhiều, 'to' → <option> chọn 1. Trạm đã chọn mà nay tắt vẫn hiện.
function routeModalStations(dirId, kind, chosenList) {
  var dir = FleetStore.getDirections().find(function (x) { return x.id === dirId; }) || {};
  var region = kind === 'from' ? dir.fromRegion : dir.toRegion;
  var chosen = {}; (chosenList || []).forEach(function (n) { chosen[n] = true; });
  var names = FleetStore.getStations().filter(function (s) { return (!region || s.region === region) && (s.active !== false || chosen[s.name]); })
    .map(function (s) { return s.name; });
  return names.map(function (n) {
    var a = esc(n);
    return kind === 'from'
      ? '<label class="chip sp-opt"><input type="checkbox" value="' + a + '"' + (chosen[n] ? ' checked' : '') + '><span>' + a + '</span></label>'
      : '<option value="' + a + '"' + (chosen[n] ? ' selected' : '') + '>' + a + '</option>';
  }).join('') || '<span class="hint-inline">Chưa có trạm.</span>';
}
function adminRouteModalDir(dirId) {
  $('rmFrom').innerHTML = routeModalStations(dirId, 'from', []);
  $('rmTo').innerHTML = routeModalStations(dirId, 'to', []);
}

// Tuyến không có giá/loại xe: giá nhập theo khung giá (adminOpenPriceFrame), loại xe nằm ở phơi mẫu.
function adminOpenRouteModal(id, directionId) {
  if (!adminRequire('manage_routes')) return;
  var routes = FleetStore.getRoutes();
  var r = id ? routes.find(function (x) { return x.id === id; }) : null;
  var dirs = FleetStore.getDirections().slice().sort(byOrder);
  var parentId = r ? r.directionId : (directionId || SELECTED_DIR_ID || (dirs[0] && dirs[0].id));
  openAdminModal(
    '<h3>' + (r ? 'Sửa tuyến' : 'Thêm tuyến') + '</h3>' +
    '<form class="admin-form route-form" data-submit-action="adminSaveRoute" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="rmId" value="' + (r ? esc(r.id) : '') + '">' +
      '<div class="fld"><label>Thuộc hướng *</label><select id="rmDir" data-change-action="adminRouteModalDir" data-args=\'["__this_value__"]\'>' +
        dirs.map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === parentId ? ' selected' : '') + '>' + esc(d.label) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="fld"><label>Tên tuyến *</label>' +
        '<input id="rmLabel" required value="' + (r ? esc(r.label) : '') + '" placeholder="VD: Sài Gòn - An Giang"></div>' +
      '<div class="fld fld-full"><label>Điểm đi * <span class="hint-inline">(chọn nhiều)</span></label><div class="chip-editor" id="rmFrom">' + routeModalStations(parentId, 'from', r ? r.fromStations : []) + '</div></div>' +
      '<div class="fld"><label>Điểm đến chính *</label><select id="rmTo">' + routeModalStations(parentId, 'to', r ? r.toStations : []) + '</select></div>' +
      '<div class="fld"><label>Mã tuyến</label><input id="rmAbbr" value="' + (r ? esc(r.abbr || '') : '') + '" placeholder="SG-LX"></div>' +
      '<div class="fld fld-full"><label><input type="checkbox" id="rmActive" ' + (!r || activeOf(r) ? 'checked' : '') + '> Đang hoạt động</label></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function adminSaveRoute(e) {
  e.preventDefault();
  if (!adminRequire('manage_routes')) return;
  var id0 = $('rmId').value;
  var label = $('rmLabel').value.trim();
  var dirId = $('rmDir').value;
  if (!label || !dirId) { showToast('Nhập đủ Tên tuyến và hướng.'); return; }
  var list = FleetStore.getRoutes();
  var abbr = $('rmAbbr').value.trim();
  var active = $('rmActive').checked;
  var froms = Array.prototype.map.call($('rmFrom').querySelectorAll('input:checked'), function (c) { return c.value; });
  var to = $('rmTo').value;
  if (!froms.length || !to) { showToast('Chọn ít nhất 1 điểm đi và 1 điểm đến.'); return; }

  if (id0) {
    var r = list.find(function (x) { return x.id === id0; });
    var before = JSON.parse(JSON.stringify(r));
    r.label = label; r.directionId = dirId; r.abbr = abbr; r.active = active; r.fromStations = froms;
    if ((r.toStations || []).indexOf(to) === -1) r.toStations = [to]; // giữ các điểm đến thêm ở bảng Tuyến xe nếu điểm đến chính không đổi
    syncRoutePrices(r); // bỏ trạm vừa gỡ khỏi khung giá + xoá giá cặp không còn ai dùng
    FleetStore.setRoutes(list);
    FleetStore.log({ action: 'update', entity: 'route', entityId: id0, summary: 'Sửa tuyến ' + label, before: before, after: r });
  } else {
    var newId = dirId + '-' + Date.now().toString(36);
    var maxOrder = list.filter(function (x) { return x.directionId === dirId; }).reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
    var nr = { id: newId, directionId: dirId, label: label, abbr: abbr, priceFrames: [], active: active, order: maxOrder + 1, fromStations: froms, toStations: [to], pickupStations: [] };
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

/* "Sao chép mẫu" — nhân bản 1 tuyến thành tuyến MỚI ngay lập tức (không qua modal), copy Trạm đi/Trạm đến/
   Trạm nhận thêm/Tuyến chính. KHÔNG copy khung giá: mỗi cặp trạm chỉ thuộc 1 khung trên toàn hệ thống
   (docs/fare-erd.mmd), copy sẽ trùng cặp. Tên tuyến được phép trùng. */
function adminDuplicateRoute(id) {
  if (!adminRequire('manage_routes')) return;
  var list = FleetStore.getRoutes();
  var src = list.find(function (x) { return x.id === id; });
  if (!src) return;

  var label = src.label; // tuyến được phép trùng tên: cùng tuyến có nhiều khung giá khác nhau

  var newId = src.directionId + '-' + Date.now().toString(36);
  var maxOrder = list.filter(function (x) { return x.directionId === src.directionId; }).reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
  var copy = {
    id: newId, directionId: src.directionId, label: label, abbr: src.abbr || '',
    priceFrames: [],
    active: true, order: maxOrder + 1,
    fromStations: (src.fromStations || []).slice(),
    toStations: (src.toStations || []).slice(),
    pickupStations: (src.pickupStations || []).slice()
  };
  list.push(copy);
  FleetStore.setRoutes(list);
  FleetStore.log({ action: 'create', entity: 'route', entityId: newId, summary: 'Sao chép tuyến từ "' + src.label + '" thành "' + label + '"', after: copy });
  showToast('Đã sao chép "' + src.label + '" (không kèm khung giá — mỗi cặp trạm chỉ thuộc 1 khung).');
  renderPricingView();
}

function adminDeleteRoute(id) {
  if (!adminRequire('manage_routes')) return;
  var chk = FleetStore.canDeleteRoute(id);
  if (!chk.ok) { showToast('Không thể xoá: ' + chk.reason); return; }
  if (!confirm('Xoá tuyến này?')) return;
  var gone = FleetStore.getRoutes().find(function (x) { return x.id === id; });
  var list = FleetStore.getRoutes().filter(function (x) { return x.id !== id; });
  FleetStore.setRoutes(list);
  if (gone) FleetStore.releasePairPrices(FleetStore.routePairs(gone), id); // giá cặp chỉ tuyến này dùng thì xoá theo
  FleetStore.log({ action: 'delete', entity: 'route', entityId: id, summary: 'Xoá tuyến ' + id });
  if (SELECTED_ROUTE_ID === id) SELECTED_ROUTE_ID = null;
  showToast('Đã xoá tuyến.');
  if (typeof CURRENT_VIEW !== 'undefined' && CURRENT_VIEW === 'viewPricing') {
    renderPricingView();
  } else {
    renderDirectionsView();
  }
}

