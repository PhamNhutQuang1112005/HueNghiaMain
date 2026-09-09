/* =========================================================
   2. QUẢN LÝ TRẠM
   - Danh mục trạm theo địa điểm: 3 địa điểm gốc (Sài Gòn / Bình Dương / An Giang)
     + địa điểm tự thêm (lưu ở HN_ADMIN_REGIONS_KEY); panel có bộ lọc theo địa điểm
   - 4 hướng chính, mỗi hướng có các tuyến chính
   - Chọn một tuyến chính → thêm "Trạm có thể nhận" lấy từ danh mục trạm của từng địa điểm
   ========================================================= */
var SELECTED_DIR_ID = null;
var SELECTED_ROUTE_ID = null;
var STATION_GROUPS = [['fromStations', 'Trạm điểm đi'], ['toStations', 'Trạm điểm đến'], ['pickupStations', 'Trạm có thể nhận thêm khách']];
var REGION_META = [['saigon', 'Trạm Sài Gòn'], ['binhduong', 'Trạm Bình Dương'], ['angiang', 'Trạm An Giang']];
// hn_admin_regions_v1: mảng { key, title?, custom?, hidden? }
//   - custom  : địa điểm do admin thêm (ngoài 3 địa điểm gốc)
//   - title   : tên hiển thị — với địa điểm gốc là "ghi đè" tên mặc định
//   - hidden  : địa điểm đã bị xoá khỏi danh mục (gốc thì ẩn, tự thêm thì cũng đánh dấu ẩn)
var HN_ADMIN_REGIONS_KEY = 'hn_admin_regions_v1';
var REGION_FILTER = ''; // '' = tất cả; lọc panel "Danh mục trạm theo địa điểm"

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
  var stations = FleetStore.getStations();
  if (!SELECTED_DIR_ID || !dirs.some(function (d) { return d.id === SELECTED_DIR_ID; })) {
    SELECTED_DIR_ID = dirs.length ? dirs[0].id : null;
  }

  // ----- Danh mục trạm theo địa điểm -----
  var regionMeta = getRegionMeta();
  if (REGION_FILTER && !regionMeta.some(function (rm) { return rm[0] === REGION_FILTER; })) REGION_FILTER = '';
  var locCards = regionMeta.filter(function (rm) {
    return !REGION_FILTER || rm[0] === REGION_FILTER;
  }).map(function (rm) {
    var region = rm[0], title = rm[1];
    var st = stations.filter(function (s) { return s.region === region; });
    var chips = st.map(function (s) {
      return '<span class="chip">' + esc(s.name) +
        '<button title="Xoá trạm" data-action="adminRemoveLocationStation" data-args=\'["' + esc(s.name) + '"]\'>&times;</button></span>';
    }).join('') || '<span class="hint-inline">Chưa có trạm.</span>';
    return '<div class="loc-card">' +
      '<div class="loc-card-head"><span>' + esc(title) + ' <span class="sp-count">' + st.length + '</span></span>' +
        '<button class="btn btn-sm btn-primary" data-action="adminAddLocationStation" data-args=\'["' + esc(region) + '"]\'>+ Thêm trạm</button></div>' +
      '<div class="chip-editor">' + chips + '</div>' +
    '</div>';
  }).join('') || '<div class="empty-state">Không có địa điểm nào khớp bộ lọc.</div>';

  var regionFilterHtml =
    '<span class="st-stations-tools">' +
      '<select class="st-region-filter" data-change-action="adminFilterRegion" data-args=\'["__this_value__"]\'>' +
        '<option value="">Tất cả địa điểm</option>' +
        regionMeta.map(function (rm) {
          return '<option value="' + esc(rm[0]) + '"' + (rm[0] === REGION_FILTER ? ' selected' : '') + '>' + esc(rm[1]) + '</option>';
        }).join('') +
      '</select>' +
      '<button class="btn btn-sm" data-action="adminOpenRegionsModal">Cập nhật</button>' +
    '</span>';

  // ----- Hướng đang chọn + danh sách tuyến -----
  var sel = dirs.find(function (d) { return d.id === SELECTED_DIR_ID; });
  var selRoutes = sel ? routes.filter(function (r) { return r.directionId === sel.id; }).sort(byOrder) : [];
  if (SELECTED_ROUTE_ID && !selRoutes.some(function (r) { return r.id === SELECTED_ROUTE_ID; })) SELECTED_ROUTE_ID = null;

  // Thanh trên: gộp chọn hướng (dropdown) + hành động hướng, 2 nút "thêm" dồn về bên phải.
  var dirOptions = dirs.map(function (d) {
    return '<option value="' + esc(d.id) + '"' + (d.id === SELECTED_DIR_ID ? ' selected' : '') + '>' +
      esc(d.label) + (activeOf(d) ? '' : ' · đã tắt') + '</option>';
  }).join('');

  var toolbar = '<div class="st-toolbar">' +
    (dirs.length
      ? '<label class="st-dir-picker"><span>Hướng</span>' +
          '<select data-change-action="adminSelectDirection" data-args=\'["__this_value__"]\'>' + dirOptions + '</select>' +
        '</label>' +
        (sel ? '<button class="btn btn-sm" data-action="adminOpenDirectionModal" data-args=\'["' + esc(sel.id) + '"]\'>Cập nhật</button>' : '')
      : '<span class="hint-inline">Chưa có hướng nào.</span>') +
    '<span class="st-toolbar-spacer"></span>' +
    '<button class="btn btn-sm" data-action="adminOpenDirectionModal">+ Thêm hướng</button>' +
    (sel ? '<button class="btn btn-sm btn-primary" data-action="adminOpenRouteModal" data-args=\'["","' + esc(sel.id) + '"]\'>+ Thêm tuyến</button>' : '') +
  '</div>';

  var tableHtml = sel ? renderRoutesTable(selRoutes)
    : '<div class="empty-state">Chưa có hướng nào. Bấm “+ Thêm hướng” để tạo.</div>';

  $('viewDirections').innerHTML =
    '<div class="st-workspace">' +
      '<section class="st-col st-col-stations">' +
        '<div class="pane-head"><span>Danh mục trạm theo địa điểm</span>' + regionFilterHtml + '</div>' +
        '<div class="st-col-body">' + locCards + '</div>' +
      '</section>' +
      '<div class="st-right">' +
        toolbar +
        '<section class="st-col st-col-routes">' + tableHtml + '</section>' +
      '</div>' +
    '</div>';
}

function adminFilterRegion(v) { REGION_FILTER = v || ''; renderDirectionsView(); }

/* ---- Cập nhật danh mục địa điểm (thêm / sửa tên / xoá / khôi phục) — tất cả trong 1 modal ---- */
function renderRegionsManager() {
  var stations = FleetStore.getStations();
  var rows = getRegionMeta().map(function (rm) {
    var key = rm[0], title = rm[1], isCustom = rm[2];
    var cnt = stations.filter(function (s) { return s.region === key; }).length;
    return '<div class="rgm-row">' +
      '<div class="rgm-main">' +
        '<input class="rgm-name" value="' + esc(title) + '" data-region-key="' + esc(key) + '" aria-label="Tên địa điểm">' +
        '<span class="rgm-count">' + cnt + ' trạm' + (isCustom ? '' : ' · gốc') + '</span>' +
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
  renderDirectionsView();
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
  renderDirectionsView();
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
  renderDirectionsView();
  adminOpenRegionsModal();
}

function adminRestoreRegion(key) {
  var list = regionStore();
  var row = list.find(function (r) { return r && r.key === key; });
  if (row) delete row.hidden;
  lsWrite(HN_ADMIN_REGIONS_KEY, list);
  FleetStore.log({ action: 'update', entity: 'region', entityId: key, summary: 'Khôi phục địa điểm "' + key + '"' });
  showToast('Đã khôi phục địa điểm.');
  renderDirectionsView();
  adminOpenRegionsModal();
}

function adminAddLocationStation(region) {
  var name = (prompt('Tên trạm mới:') || '').trim();
  if (!name) return;
  if (!FleetStore.addStation(name, region)) { showToast('Trạm "' + name + '" đã có trong danh mục.'); return; }
  FleetStore.log({ action: 'create', entity: 'station', entityId: name, summary: 'Thêm trạm "' + name + '"' });
  showToast('Đã thêm trạm.');
  renderDirectionsView();
}
function adminRemoveLocationStation(name) {
  var used = FleetStore.stationUsage(name);
  var msg = used ? 'Trạm "' + name + '" đang dùng ở ' + used + ' tuyến. Xoá trạm và gỡ khỏi các tuyến đó?' : 'Xoá trạm "' + name + '"?';
  if (!confirm(msg)) return;
  FleetStore.removeStation(name);
  FleetStore.log({ action: 'delete', entity: 'station', entityId: name, summary: 'Xoá trạm "' + name + '"' + (used ? ' (gỡ khỏi ' + used + ' tuyến)' : '') });
  showToast('Đã xoá trạm.');
  renderDirectionsView();
}

function renderRoutesTable(routes) {
  var routeRows = routes.length ? routes.map(function (r) {
    var stnCount = (r.fromStations || []).length + (r.toStations || []).length + (r.pickupStations || []).length;
    return '<tr><td class="mono">' + esc(r.abbr || '—') + '</td><td>' + esc(r.label) + '</td><td class="num">' + fmtMoney(r.price) + '</td>' +
      '<td class="num">' + stnCount + '</td>' +
      '<td class="col-status">' + activeTag(activeOf(r)) + '</td>' +
      '<td class="row-actions">' +
        '<button class="btn btn-sm" data-action="adminOpenRouteStations" data-args=\'["' + esc(r.id) + '"]\'>Trạm</button>' +
        '<button class="btn btn-sm" data-action="adminOpenRouteModal" data-args=\'["' + esc(r.id) + '"]\'>Sửa</button>' +
        '<button class="btn btn-sm btn-danger" data-action="adminDeleteRoute" data-args=\'["' + esc(r.id) + '"]\'>Xoá</button>' +
      '</td></tr>';
  }).join('') : '<tr><td colspan="6" class="empty-state">Hướng này chưa có tuyến nào.</td></tr>';

  return '<div class="table-wrap" style="border:0;border-radius:0;"><table class="admin-table"><thead><tr><th>Mã</th><th>Tên tuyến chính</th><th class="num">Giá vé</th><th class="num">Trạm</th><th class="col-status">Trạng thái</th><th class="th-actions">Thao tác</th></tr></thead><tbody>' +
    routeRows + '</tbody></table></div>';
}

function renderRouteStationEditor(r) {
  return STATION_GROUPS.map(function (g) {
    var kind = g[0], title = g[1];
    var chips = (r[kind] || []).map(function (s, i) {
      return '<span class="chip">' + esc(s) + '<button data-action="adminRemoveRouteStation" data-args=\'["' + esc(r.id) + '","' + kind + '",' + i + ']\'>&times;</button></span>';
    }).join('');
    return '<div class="rs-group">' +
      '<div class="grp-label">' + title + '</div>' +
      '<div class="chip-editor">' + (chips || '<span class="hint-inline">Chưa có trạm.</span>') +
        '<button class="btn btn-sm btn-ghost" data-action="adminOpenStationPicker" data-args=\'["' + esc(r.id) + '","' + kind + '"]\'>+ chọn trạm</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// "Thao tác trạm" của một tuyến — mở trong modal (trước đây bung dòng inline dưới bảng).
function adminOpenRouteStations(id) {
  var r = FleetStore.getRoutes().find(function (x) { return x.id === id; });
  if (!r) { closeAdminModal(); return; }
  SELECTED_ROUTE_ID = id;
  openAdminModal(
    '<h3>Trạm của tuyến — ' + esc(r.label) + '</h3>' +
    '<div class="admin-form route-stations-modal">' +
      renderRouteStationEditor(r) +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="closeAdminModal">Xong</button></div>' +
    '</div>',
    true
  );
}

function adminSelectDirection(id) { SELECTED_DIR_ID = id; SELECTED_ROUTE_ID = null; renderDirectionsView(); }

// Suy chiều nội bộ từ tên hướng (để bộ lọc "Chiều đi / Chiều về" ở TicketStaff vẫn chạy) — KHÔNG hiển thị.
function senseFromLabel(label) {
  return /^\s*(Sài Gòn|Bình Dương)\b/i.test(label || '') ? 'di' : 've';
}

function adminOpenDirectionModal(id) {
  var d = id ? FleetStore.getDirections().find(function (x) { return x.id === id; }) : null;
  openAdminModal(
    '<h3>' + (d ? 'Sửa hướng' : 'Thêm hướng') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveDirection" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="dmId" value="' + (d ? esc(d.id) : '') + '">' +
      '<div class="fld"><label>Tên hướng *</label><input id="dmLabel" required value="' + (d ? esc(d.label) : '') + '" placeholder="VD: Sài Gòn - An Giang"></div>' +
      '<div class="fld"><label>Mã hướng (id) *</label><input id="dmKey" required value="' + (d ? esc(d.id) : '') + '" ' + (d ? 'readonly' : '') + ' placeholder="vd: sg-ag"></div>' +
      '<div class="fld"><label><input type="checkbox" id="dmActive" ' + (!d || activeOf(d) ? 'checked' : '') + '> Đang hoạt động</label></div>' +
      '<div class="modal-actions">' +
        (d ? '<button type="button" class="btn btn-danger" data-action="adminDeleteDirection" data-args=\'["' + esc(d.id) + '"]\' style="margin-right:auto;">Xoá hướng</button>' : '') +
        '<button type="button" class="btn" data-action="closeAdminModal">Huỷ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu</button>' +
      '</div>' +
    '</form>'
  );
}

function adminSaveDirection(e) {
  e.preventDefault();
  var id0 = $('dmId').value;
  var key = $('dmKey').value.trim();
  var label = $('dmLabel').value.trim();
  if (!key || !label) { showToast('Nhập đủ Tên hướng và Mã hướng.'); return; }
  var list = FleetStore.getDirections();
  if (!id0 && list.some(function (x) { return x.id === key; })) { showToast('Mã hướng đã tồn tại.'); return; }
  var active = $('dmActive').checked;

  if (id0) {
    var d = list.find(function (x) { return x.id === id0; });
    var before = JSON.parse(JSON.stringify(d));
    d.label = label; d.active = active; d.sense = senseFromLabel(label);
    FleetStore.setDirections(list);
    FleetStore.log({ action: 'update', entity: 'direction', entityId: id0, summary: 'Sửa hướng ' + label, before: before, after: d });
  } else {
    var maxOrder = list.reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1);
    var nd = { id: key, label: label, sense: senseFromLabel(label), active: active, order: maxOrder + 1 };
    list.push(nd);
    FleetStore.setDirections(list);
    FleetStore.log({ action: 'create', entity: 'direction', entityId: key, summary: 'Thêm hướng ' + label, after: nd });
    SELECTED_DIR_ID = key;
  }
  closeAdminModal();
  showToast('Đã lưu hướng.');
  renderDirectionsView();
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
}

function adminDeleteDirection(id) {
  var chk = FleetStore.canDeleteDirection(id);
  if (!chk.ok) { showToast('Không thể xoá: ' + chk.reason); return; }
  if (!confirm('Xoá hướng này?')) return;
  var list = FleetStore.getDirections().filter(function (x) { return x.id !== id; });
  FleetStore.setDirections(list);
  FleetStore.log({ action: 'delete', entity: 'direction', entityId: id, summary: 'Xoá hướng ' + id });
  if (SELECTED_DIR_ID === id) SELECTED_DIR_ID = null;
  closeAdminModal();
  showToast('Đã xoá hướng.');
  renderDirectionsView();
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
  adminOpenRouteStations(routeId); // dựng lại thân modal với danh sách trạm mới
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
    '<form class="admin-form" data-submit-action="adminSaveStationPick" data-args=\'["__event__"]\'>' +
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
      '<div class="modal-actions"><button type="button" class="btn" data-action="adminOpenRouteStations" data-args=\'["' + esc(routeId) + '"]\'>Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
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
  renderDirectionsView();
  adminOpenRouteStations(routeId); // quay lại modal "Trạm của tuyến" thay vì đóng hẳn
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
      '<div class="fld"><label>Tên tuyến * <span class="hint-inline">(chuỗi này được lưu vào mọi phơi — đổi tên sẽ không tự sửa phơi cũ)</span></label>' +
        '<input id="rmLabel" required value="' + (r ? esc(r.label) : '') + '" placeholder="VD: Sài Gòn - An Giang"></div>' +
      '<div class="fld-row">' +
        '<div class="fld"><label>Mã tuyến</label><input id="rmAbbr" value="' + (r ? esc(r.abbr || '') : '') + '" placeholder="SG-LX"></div>' +
        '<div class="fld"><label>Giá vé (đ) *</label><input id="rmPrice" type="number" min="0" step="5000" required value="' + (r ? (r.price || 0) : '') + '"></div>' +
      '</div>' +
      '<div class="fld"><label><input type="checkbox" id="rmActive" ' + (!r || activeOf(r) ? 'checked' : '') + '> Đang hoạt động</label></div>' +
      '<div class="hint-inline">Sau khi lưu, bấm "Trạm" ở dòng tuyến để chọn trạm đi / đến / đón.</div>' +
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

