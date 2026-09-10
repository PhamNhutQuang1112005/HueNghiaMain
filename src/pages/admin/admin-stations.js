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
var STATION_GROUPS = [['fromStations', 'Trạm điểm đi'], ['toStations', 'Trạm điểm đến'], ['pickupStations', 'Trạm có thể nhận thêm khách']];
var REGION_META = [['saigon', 'Trạm Sài Gòn'], ['binhduong', 'Trạm Bình Dương'], ['angiang', 'Trạm An Giang']];
// hn_admin_regions_v1: mảng { key, title?, custom?, hidden? }
//   - custom  : địa điểm do admin thêm (ngoài 3 địa điểm gốc)
//   - title   : tên hiển thị — với địa điểm gốc là "ghi đè" tên mặc định
//   - hidden  : địa điểm đã bị xoá khỏi danh mục (gốc thì ẩn, tự thêm thì cũng đánh dấu ẩn)
var HN_ADMIN_REGIONS_KEY = 'hn_admin_regions_v1';
var REGION_FILTER = ''; // giữ lại cho adminRemoveRegion() reset; panel lọc theo địa điểm đã bỏ

function regionStore() { return lsRead(HN_ADMIN_REGIONS_KEY, []); }
function isBuiltinRegion(key) { return REGION_META.some(function (m) { return m[0] === key; }); }
function regionRow(key) { return regionStore().find(function (r) { return r && r.key === key; }) || null; }
function regionHidden(key) { var r = regionRow(key); return !!(r && r.hidden); }
function regionTitleOf(key, fallback) { var r = regionRow(key); return (r && r.title) || fallback || key; }

// Danh sách địa điểm hiển thị: 3 địa điểm gốc (trừ cái bị ẩn, có thể đổi tên) +
// địa điểm tự thêm + địa điểm lạ còn dính trên trạm. Mỗi phần tử: [key, title, isCustom].
function getRegionMeta() {
  var store = regionStore();
  var byKey = {};
  store.forEach(function (r) { if (r && r.key) byKey[r.key] = r; });
  var meta = [];
  var seen = {};
  REGION_META.forEach(function (m) {
    seen[m[0]] = true;
    var r = byKey[m[0]];
    if (r && r.hidden) return;
    meta.push([m[0], (r && r.title) || m[1], false]);
  });
  store.forEach(function (r) {
    if (!r || !r.key || seen[r.key] || r.hidden || !r.custom) return;
    meta.push([r.key, r.title || r.key, true]);
    seen[r.key] = true;
  });
  FleetStore.getStations().forEach(function (s) {
    if (s.region && !seen[s.region] && !(byKey[s.region] && byKey[s.region].hidden)) {
      meta.push([s.region, 'Trạm ' + s.region, false]);
      seen[s.region] = true;
    }
  });
  return meta;
}

function slugifyRegion(s) {
  var base = String(s || '').trim().toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || ('loc-' + Date.now().toString(36));
}

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

  var tableHtml = sel ? renderRoutesTable(shownRoutes, !!rq)
    : '<div class="empty-state">Chưa có hướng nào. Bấm “+ Thêm hướng” để tạo.</div>';

  $('viewDirections').innerHTML =
    '<div class="st-right">' +
      toolbar +
      '<section class="st-col st-col-routes">' + tableHtml + '</section>' +
    '</div>';
}

function adminRouteSearch(v) { ROUTE_FILTER = v || ''; adminKeepFocus(renderDirectionsView); }

/* ---- Cập nhật danh mục địa điểm (thêm / sửa tên / xoá / khôi phục) — tất cả trong 1 modal.
   Mở từ trang Trạm Xe (nút "Cập nhật danh mục") — refresh đúng view đang hiển thị sau mỗi thay đổi. ---- */
function adminRerenderRegionViews() {
  if (typeof VIEW_RENDERERS === 'object' && VIEW_RENDERERS[CURRENT_VIEW]) VIEW_RENDERERS[CURRENT_VIEW]();
  else if (typeof renderDirectionsView === 'function') renderDirectionsView();
}
function renderRegionsManager() {
  var rows = getRegionMeta().map(function (rm) {
    var key = rm[0], title = rm[1], isCustom = rm[2];
    return '<div class="rgm-row">' +
      '<div class="rgm-main">' +
        '<input class="rgm-name" value="' + esc(title) + '" data-region-key="' + esc(key) + '" aria-label="Tên địa điểm">' +
        '<span class="rgm-count">' + (isCustom ? 'Tự thêm' : 'Mặc định') + '</span>' +
      '</div>' +
      '<div class="rgm-act">' +
        '<button type="button" class="btn btn-sm" data-action="adminRenameRegion" data-args=\'["' + esc(key) + '"]\'>Lưu tên</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="adminRemoveRegion" data-args=\'["' + esc(key) + '"]\'>Xoá</button>' +
      '</div>' +
    '</div>';
  }).join('');

  var hiddenB = REGION_META.filter(function (m) { return regionHidden(m[0]); });
  var hiddenHtml = hiddenB.length
    ? '<div class="rgm-hidden"><div class="grp-label">Địa điểm đã xoá</div>' +
      hiddenB.map(function (m) {
        return '<div class="rgm-row rgm-row-hidden">' +
          '<span class="rgm-name-static">' + esc(regionTitleOf(m[0], m[1])) + '</span>' +
          '<button type="button" class="btn btn-sm" data-action="adminRestoreRegion" data-args=\'["' + esc(m[0]) + '"]\'>Khôi phục</button>' +
        '</div>';
      }).join('') + '</div>'
    : '';

  return '<div class="rgm-list">' + rows + '</div>' + hiddenHtml +
    '<div class="rgm-add">' +
      '<input id="rgmNew" placeholder="Tên địa điểm mới" aria-label="Tên địa điểm mới">' +
      '<button type="button" class="btn btn-primary" data-action="adminAddRegion">+ Thêm</button>' +
    '</div>';
}
function adminOpenRegionsModal() {
  openAdminModal(
    '<h3>Cập nhật danh mục địa điểm</h3>' +
    '<div class="admin-form regions-modal">' +
      renderRegionsManager() +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="closeAdminModal">Xong</button></div>' +
    '</div>',
    true
  );
}

function adminAddRegion() {
  var el = $('rgmNew');
  var name = ((el ? el.value : (prompt('Tên địa điểm mới:') || '')) || '').trim();
  if (!name) return;
  var key = slugifyRegion(name);
  if (isBuiltinRegion(key) && regionHidden(key)) { adminRestoreRegion(key); return; }
  if (getRegionMeta().some(function (rm) { return rm[0] === key; })) { showToast('Địa điểm này đã có.'); return; }
  var title = /^trạm\s/i.test(name) ? name : 'Trạm ' + name;
  var list = regionStore();
  list.push({ key: key, title: title, custom: true });
  lsWrite(HN_ADMIN_REGIONS_KEY, list);
  FleetStore.log({ action: 'create', entity: 'region', entityId: key, summary: 'Thêm địa điểm "' + name + '"' });
  showToast('Đã thêm địa điểm.');
  adminRerenderRegionViews();
  adminOpenRegionsModal();
}

function adminRenameRegion(key) {
  var inp = document.querySelector('.rgm-name[data-region-key="' + key + '"]');
  var title = (inp && inp.value || '').trim();
  if (!title) { showToast('Nhập tên địa điểm.'); return; }
  var list = regionStore();
  var row = list.find(function (r) { return r && r.key === key; });
  if (row) {
    if (row.title === title) { showToast('Tên không đổi.'); return; }
    row.title = title;
  } else {
    list.push({ key: key, title: title, custom: !isBuiltinRegion(key) });
  }
  lsWrite(HN_ADMIN_REGIONS_KEY, list);
  FleetStore.log({ action: 'update', entity: 'region', entityId: key, summary: 'Sửa địa điểm "' + title + '"' });
  showToast('Đã lưu tên địa điểm.');
  adminRerenderRegionViews();
  adminOpenRegionsModal();
}

function adminRemoveRegion(key) {
  var cnt = FleetStore.getStations().filter(function (s) { return s.region === key; }).length;
  if (cnt) { showToast('Địa điểm còn ' + cnt + ' trạm — xoá hết trạm trước.'); return; }
  if (!confirm('Xoá địa điểm này khỏi danh mục?')) return;
  var list = regionStore();
  if (isBuiltinRegion(key)) {
    var row = list.find(function (r) { return r && r.key === key; });
    if (row) { row.hidden = true; delete row.custom; }
    else list.push({ key: key, hidden: true });
  } else {
    list = list.filter(function (r) { return !r || r.key !== key; });
  }
  lsWrite(HN_ADMIN_REGIONS_KEY, list);
  FleetStore.log({ action: 'delete', entity: 'region', entityId: key, summary: 'Xoá địa điểm "' + key + '"' });
  if (REGION_FILTER === key) REGION_FILTER = '';
  showToast('Đã xoá địa điểm.');
  adminRerenderRegionViews();
  adminOpenRegionsModal();
}

function adminRestoreRegion(key) {
  var list = regionStore();
  var row = list.find(function (r) { return r && r.key === key; });
  if (row) delete row.hidden;
  lsWrite(HN_ADMIN_REGIONS_KEY, list);
  FleetStore.log({ action: 'update', entity: 'region', entityId: key, summary: 'Khôi phục địa điểm "' + key + '"' });
  showToast('Đã khôi phục địa điểm.');
  adminRerenderRegionViews();
  adminOpenRegionsModal();
}


function renderRoutesTable(routes, filtered) {
  var routeRows = routes.length ? routes.map(function (r) {
    var pk = r.pickupStations || [];
    var chips = pk.map(function (s, i) {
      return '<span class="chip">' + esc(s) + '<button title="Bỏ trạm" data-action="adminRemoveRouteStation" data-args=\'["' + esc(r.id) + '","pickupStations",' + i + ']\'>&times;</button></span>';
    }).join('');
    var pkCell = '<div class="rt-pickup chip-editor">' +
      (chips || '<span class="hint-inline">Chưa có trạm.</span>') +
      '<button class="btn btn-sm btn-ghost" data-action="adminOpenStationPicker" data-args=\'["' + esc(r.id) + '","pickupStations"]\'>+ chọn trạm</button>' +
    '</div>';
    return '<tr><td class="mono rt-col-abbr">' + esc(r.abbr || '—') + '</td><td>' + esc(r.label) + '</td>' +
      '<td class="rt-pickup-cell rt-col-pickup">' + pkCell + '</td>' +
      '<td class="col-status">' + activeTag(activeOf(r)) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminRouteRowMenu" data-args=\'["__this__","' + esc(r.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td></tr>';
  }).join('') : '<tr><td colspan="5" class="empty-state">' + (filtered ? 'Không tìm thấy tuyến phù hợp.' : 'Hướng này chưa có tuyến nào.') + '</td></tr>';

  return '<div class="table-wrap" style="border:0;border-radius:0;"><table class="admin-table rt-table"><thead><tr><th class="rt-col-abbr">Mã</th><th>Tên tuyến chính</th><th class="rt-col-pickup">Trạm có thể nhận</th><th class="col-status">Trạng thái</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' +
    routeRows + '</tbody></table></div>';
}

// Cột "Thao tác" bảng tuyến — dropdown nổi giống bên Trạm Xe (dùng chung adminOpenRowMenu ở admin-station-directory.js).
function adminRouteRowMenu(btn, routeId) {
  adminOpenRowMenu(btn, 'route:' + routeId,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenRouteModal" data-args=\'["' + esc(routeId) + '"]\'>Sửa tuyến</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteRoute" data-args=\'["' + esc(routeId) + '"]\'>Xoá tuyến</button>');
}

function adminSelectDirection(id) { SELECTED_DIR_ID = id; SELECTED_ROUTE_ID = null; renderDirectionsView(); }

// Suy chiều nội bộ từ tên hướng (để bộ lọc "Chiều đi / Chiều về" ở TicketStaff vẫn chạy) — KHÔNG hiển thị.
function senseFromLabel(label) {
  return /^\s*(Sài Gòn|Bình Dương)\b/i.test(label || '') ? 'di' : 've';
}

/* ---- Cập nhật hướng — 1 modal gộp Thêm / Sửa tên / Bật-Tắt / Xoá cho mọi hướng ---- */
function adminOpenDirsModal() {
  openAdminModal(
    '<h3>Cập nhật hướng</h3>' +
    '<div class="admin-form regions-modal dirs-modal">' +
      renderDirsManager() +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="closeAdminModal">Xong</button></div>' +
    '</div>'
  );
}
function renderDirsManager() {
  var dirs = FleetStore.getDirections().slice().sort(byOrder);
  var rows = dirs.map(function (d) {
    var on = activeOf(d);
    return '<div class="rgm-row' + (on ? '' : ' rgm-row-hidden') + '">' +
      '<div class="rgm-main">' +
        '<input class="rgm-name dm-name" value="' + esc(d.label) + '" data-dir-id="' + esc(d.id) + '" aria-label="Tên hướng">' +
      '</div>' +
      '<div class="rgm-act">' +
        '<button type="button" class="btn btn-sm" data-action="adminSaveDirName" data-args=\'["' + esc(d.id) + '"]\'>Lưu tên</button>' +
        '<button type="button" class="btn btn-sm" data-action="adminToggleDirectionActive" data-args=\'["' + esc(d.id) + '"]\'>' + (on ? 'Tắt' : 'Bật') + '</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="adminDeleteDirection" data-args=\'["' + esc(d.id) + '"]\'>Xoá</button>' +
      '</div>' +
    '</div>';
  }).join('') || '<div class="empty-state">Chưa có hướng nào.</div>';

  return '<div class="rgm-list">' + rows + '</div>' +
    '<div class="rgm-add dm-add">' +
      '<input id="dmNewLabel" placeholder="Tên hướng mới — VD: Sài Gòn - An Giang" aria-label="Tên hướng mới">' +
      '<input id="dmNewKey" placeholder="Mã (vd: sg-ag)" aria-label="Mã hướng">' +
      '<button type="button" class="btn btn-primary" data-action="adminAddDirection">+ Thêm</button>' +
    '</div>';
}

function adminSaveDirName(id) {
  var inp = document.querySelector('.dm-name[data-dir-id="' + id + '"]');
  var label = (inp && inp.value || '').trim();
  if (!label) { showToast('Nhập tên hướng.'); return; }
  var list = FleetStore.getDirections();
  var d = list.find(function (x) { return x.id === id; });
  if (!d) return;
  if (d.label === label) { showToast('Tên không đổi.'); return; }
  var before = JSON.parse(JSON.stringify(d));
  d.label = label; d.sense = senseFromLabel(label);
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'update', entity: 'direction', entityId: id, summary: 'Sửa hướng ' + label, before: before, after: d });
  showToast('Đã lưu tên hướng.');
  renderDirectionsView();
  adminOpenDirsModal();
}

function adminAddDirection() {
  var label = ($('dmNewLabel').value || '').trim();
  var key = ($('dmNewKey').value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!label) { showToast('Nhập tên hướng.'); return; }
  if (!key) key = slugifyRegion(label);
  var list = FleetStore.getDirections();
  if (list.some(function (x) { return x.id === key; })) { showToast('Mã hướng "' + key + '" đã tồn tại.'); return; }
  var maxOrder = list.reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
  var nd = { id: key, label: label, sense: senseFromLabel(label), active: true, order: maxOrder + 1 };
  list.push(nd);
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'create', entity: 'direction', entityId: key, summary: 'Thêm hướng ' + label, after: nd });
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
  renderDirectionsView();
}
function adminOpenStationPicker(routeId, kind) {
  var r = FleetStore.getRoutes().find(function (x) { return x.id === routeId; });
  if (!r) return;
  var groupLabel = (STATION_GROUPS.filter(function (g) { return g[0] === kind; })[0] || ['', 'Trạm'])[1];
  var chosen = {};
  (r[kind] || []).forEach(function (s) { chosen[s] = true; });
  var metaPick = getRegionMeta();
  var byRegion = { '': [] };
  var regionTitle = { '': 'Trạm khác' };
  metaPick.forEach(function (m) { byRegion[m[0]] = []; regionTitle[m[0]] = m[1]; });
  FleetStore.getStations().forEach(function (s) { (byRegion[s.region] || byRegion['']).push(s.name); });
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
          '<select id="spNewRegion"><option value="">— chọn địa điểm —</option>' +
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
    FleetStore.addStation(newName, $('spNewRegion').value);
    if (picked.indexOf(newName) === -1) picked.push(newName);
  }
  mutateRoute(routeId, function (r) { r[kind] = picked; });
  FleetStore.log({ action: 'update', entity: 'route', entityId: routeId, summary: 'Cập nhật ' + kind + ' (' + picked.length + ' trạm)' });
  showToast('Đã lưu trạm.');
  closeAdminModal();
  renderDirectionsView();
}

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
        '<div class="fld"><label>Giá vé (đ) *</label><input id="rmPrice" type="number" min="0" step="5000" required value="' + (r ? (r.price || 0) : '') + '"></div>' +
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
  if (!label || !dirId) { showToast('Nhập đủ Tên tuyến và hướng.'); return; }
  var list = FleetStore.getRoutes();
  if (list.some(function (x) { return x.label === label && x.id !== id0; })) { showToast('Tên tuyến đã tồn tại.'); return; }
  var abbr = $('rmAbbr').value.trim();
  var active = $('rmActive').checked;

  if (id0) {
    var r = list.find(function (x) { return x.id === id0; });
    var before = JSON.parse(JSON.stringify(r));
    r.label = label; r.directionId = dirId; r.price = price; r.abbr = abbr; r.active = active;
    FleetStore.setRoutes(list);
    FleetStore.log({ action: 'update', entity: 'route', entityId: id0, summary: 'Sửa tuyến ' + label, before: before, after: r });
  } else {
    var newId = dirId + '-' + Date.now().toString(36);
    var maxOrder = list.filter(function (x) { return x.directionId === dirId; }).reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
    var nr = { id: newId, directionId: dirId, label: label, abbr: abbr, price: price, active: active, order: maxOrder + 1, fromStations: [], toStations: [], pickupStations: [] };
    list.push(nr);
    FleetStore.setRoutes(list);
    FleetStore.log({ action: 'create', entity: 'route', entityId: newId, summary: 'Thêm tuyến ' + label, after: nr });
    SELECTED_ROUTE_ID = newId;
  }
  SELECTED_DIR_ID = dirId;
  closeAdminModal();
  showToast('Đã lưu tuyến.');
  renderDirectionsView();
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
  renderDirectionsView();
}

