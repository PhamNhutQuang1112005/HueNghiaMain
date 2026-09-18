/* =========================================================
   CÁC MÀN HÌNH CHƯA TRIỂN KHAI trong nhóm "Quản lý vận tải" — để trống làm sau theo yêu cầu, chỉ
   dựng khung view + thông báo, chưa có CRUD/dữ liệu thật.
   ========================================================= */
function renderComingSoon(title, desc) {
  return '<div class="grid-empty" style="min-height:320px;">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>' +
    '<p style="font-weight:800;font-size:14px;color:var(--text-main);">' + esc(title) + '</p>' +
    '<p>' + esc(desc) + '</p>' +
  '</div>';
}

function renderStopsView() {
  $('viewStops').innerHTML = renderComingSoon('Điểm dừng', 'Danh sách các điểm có thể rước theo trạm — tính năng sẽ có ở bản cập nhật sau.');
}

function renderRecruitmentView() {
  $('viewRecruitment').innerHTML = renderComingSoon('Thông báo tuyển dụng', 'Danh sách thông báo tuyển dụng — tính năng sẽ có ở bản cập nhật sau.');
}

var PRICING_FILTERS = { search: '', direction: '', route: '' };
var PRICE_SEL = {}; // id tuyến đang tick chọn (bảng Quản lý giá) — dùng cho "Xoá"/"Cập nhật giá" hàng loạt

function routeVehicleType(r, idx) {
  if (r && r.vehicleType) return r.vehicleType;
  if (idx % 2 === 0) return 'Limousine 24 Phòng';
  return 'Xe 45 chỗ';
}

// hasDouble chỉ true khi cả 2 ô giá (Ghế đơn + Ghế đôi) đều được điền ở modal Thêm/Sửa tuyến — lúc đó
// cột "Giá" hiện cả 2 mức (Đơn/Đôi). Nếu chỉ điền 1 ô thì chỉ hiện đúng giá của ô đó (only).
function buildSeatPriceMeta(r) {
  var single = Number(r && r.price) || 0;
  var double = Number(r && r.doubleSeatPrice) || 0;
  var hasDouble = single > 0 && double > 0;
  return {
    single: single,
    double: double,
    hasDouble: hasDouble,
    only: single || double
  };
}

function adminPricingFilterInput(field, value) {
  if (!(field in PRICING_FILTERS)) return;
  PRICING_FILTERS[field] = value || '';
  if (field === 'direction') PRICING_FILTERS.route = '';
  renderPricingView();
}

function adminResetPricingFilters() {
  PRICING_FILTERS.search = '';
  PRICING_FILTERS.direction = '';
  PRICING_FILTERS.route = '';
  renderPricingView();
}

// Cột "Thao tác" bảng Quản lý giá — dropdown nổi giống bên Trạm Xe (dùng chung adminOpenRowMenu ở admin-station-directory.js).
function adminPriceRowMenu(btn, routeId) {
  adminOpenRowMenu(btn, 'price:' + routeId,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenRouteModal" data-args=\'["' + esc(routeId) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminDuplicateRoute" data-args=\'["' + esc(routeId) + '"]\'>Sao chép</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteRoute" data-args=\'["' + esc(routeId) + '"]\'>Xoá</button>');
}

function renderPricingView() {
  var directions = (FleetStore && FleetStore.getDirections ? FleetStore.getDirections() : []).filter(function (d) { return d && d.active !== false; }).sort(byOrder);
  var routes = (FleetStore && FleetStore.getRoutes ? FleetStore.getRoutes() : []).filter(function (r) { return r && r.active !== false; });

  function routeDirId(r) { return FleetStore && FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(r.label) : null; }

  var filteredRoutes = routes.filter(function (r) {
    var text = [r.label, r.abbr, r.price, (r.fromStations || []).join(' '), (r.toStations || []).join(' ')].join(' ').toLowerCase();
    var dirId = routeDirId(r);
    if (PRICING_FILTERS.search && text.indexOf(PRICING_FILTERS.search.trim().toLowerCase()) === -1) return false;
    if (PRICING_FILTERS.direction && dirId !== PRICING_FILTERS.direction) return false;
    if (PRICING_FILTERS.route && r.label !== PRICING_FILTERS.route) return false;
    return true;
  }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

  // Dọn lựa chọn của khung giá không còn hiển thị (đổi bộ lọc).
  var visRouteIds = {}; filteredRoutes.forEach(function (r) { visRouteIds[r.id] = true; });
  Object.keys(PRICE_SEL).forEach(function (id) { if (!visRouteIds[id]) delete PRICE_SEL[id]; });

  var routeOptions = routes.filter(function (r) {
    var dirId = routeDirId(r);
    if (PRICING_FILTERS.direction && dirId !== PRICING_FILTERS.direction) return false;
    return true;
  }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

  function stationCells(kind, items) {
    var arr = Array.isArray(items) ? items.filter(function (x) { return x && String(x).trim(); }) : [];
    var chips = arr.map(function (s, i) {
      return '<span class="chip">' + esc(s) + '<button title="Bỏ trạm" data-action="adminRemoveRouteStation" data-args=\'["' + esc(kind.routeId) + '","' + kind.field + '",' + i + ']\'>&times;</button></span>';
    }).join('');
    return '<div class="rt-pickup chip-editor">' +
      (chips || '<span class="hint-inline">Chưa có</span>') +
      '<button class="btn btn-sm btn-ghost" data-action="adminOpenStationPicker" data-args=\'["' + esc(kind.routeId) + '","' + kind.field + '"]\'>+ thêm</button>' +
    '</div>';
  }

  function priceBadgeHtml(priceMeta) {
    if (!priceMeta.hasDouble) return '<span class="price-badge">' + esc(fmtMoney(priceMeta.only)) + '</span>';
    return '<div class="price-badge-stack">' +
      '<span class="price-badge"><em>Đơn</em>' + esc(fmtMoney(priceMeta.single)) + '</span>' +
      '<span class="price-badge"><em>Đôi</em>' + esc(fmtMoney(priceMeta.double)) + '</span>' +
    '</div>';
  }

  function routeRowHtml(r, idx) {
    var vehicleType = routeVehicleType(r, idx);
    var priceMeta = buildSeatPriceMeta(r);
    var sel = !!PRICE_SEL[r.id];
    return '<tr data-row-key="' + esc(r.id) + '" class="' + (sel ? 'selected-row' : '') + '">' +
      '<td class="num">' + (idx + 1) + '</td>' +
      '<td><strong>' + esc(r.label || '—') + '</strong></td>' +
      '<td class="pr-vehicle">' + esc(vehicleType) + '</td>' +
      '<td class="pr-price">' + priceBadgeHtml(priceMeta) + '</td>' +
      '<td style="white-space:normal;">' + stationCells({ routeId: r.id, field: 'fromStations' }, r.fromStations || []) + '</td>' +
      '<td style="white-space:normal;">' + stationCells({ routeId: r.id, field: 'toStations' }, r.toStations || []) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminPriceRowMenu" data-args=\'["__this__","' + esc(r.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminPriceToggleRow" data-args=\'["' + esc(r.id) + '","__this__"]\'></td>' +
    '</tr>';
  }

  var rows = filteredRoutes.length ? filteredRoutes.map(routeRowHtml).join('') : '<tr><td colspan="8" class="empty-state">Không có tuyến nào phù hợp với bộ lọc.</td></tr>';

  var allChecked = filteredRoutes.length && filteredRoutes.every(function (r) { return PRICE_SEL[r.id]; });

  var tableHtml = '<div class="sd-section-block">' +
    '<div class="sd-table-wrap" style="overflow:auto;">' +
      '<table class="admin-table pricing-table" style="table-layout:fixed; min-width:940px;">' +
        '<thead><tr>' +
          '<th class="num" style="width:44px; white-space:nowrap;">STT</th>' +
          '<th style="width:160px;">Tuyến chính</th>' +
          '<th class="pr-vehicle" style="width:130px;">Loại xe</th>' +
          '<th class="pr-price" style="width:95px;">Giá</th>' +
          '<th style="width:227px;">Điểm đi</th>' +
          '<th style="width:238px;">Điểm đến</th>' +
          '<th class="th-actions" style="width:100px;">Thao tác</th>' +
          '<th class="col-check"><input type="checkbox" id="prCheckAll"' + (allChecked ? ' checked' : '') + ' data-action="adminPriceToggleAll" data-args=\'["__this__"]\'></th>' +
        '</tr></thead><tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';

  $('viewPricing').innerHTML =
    '<div class="filter-toolbar tf-toolbar">' +
      '<div class="filter-field" style="min-width:220px;flex:1 1 220px;">' +
        '<label>Tìm kiếm</label>' +
        '<input type="text" value="' + esc(PRICING_FILTERS.search) + '" placeholder="Tên tuyến, mã, trạm..." data-input-action="adminPricingFilterInput" data-args=\'["search","__this_value__"]\'>' +
      '</div>' +
      '<div class="filter-field" style="min-width:180px;flex:1 1 180px;">' +
        '<label>Hướng</label>' +
        '<select data-change-action="adminPricingFilterInput" data-args=\'["direction","__this_value__"]\'>' +
          '<option value="">Tất cả hướng</option>' +
          directions.map(function (d) {
            return '<option value="' + esc(d.id) + '"' + (PRICING_FILTERS.direction === d.id ? ' selected' : '') + '>' + esc(d.label) + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="filter-field" style="min-width:220px;flex:1 1 220px;">' +
        '<label>Tuyến chính</label>' +
        '<select data-change-action="adminPricingFilterInput" data-args=\'["route","__this_value__"]\'>' +
          '<option value="">Tất cả tuyến</option>' +
          routeOptions.map(function (r) {
            return '<option value="' + esc(r.label) + '"' + (PRICING_FILTERS.route === r.label ? ' selected' : '') + '>' + esc(r.label) + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<button type="button" class="btn btn-primary" data-action="adminOpenRouteModal" data-args=\'["", "' + esc(PRICING_FILTERS.direction || SELECTED_DIR_ID || '') + '"]\'>+ Thêm giá</button>' +
      '<button type="button" class="btn" data-action="adminResetPricingFilters">Đặt lại</button>' +
    '</div>' +
    tableHtml +
    '<div class="bulk-bar" id="prActionBar" style="display:none;">' +
      '<span class="bulk-bar-hint" id="prActionHint">Đã chọn 0 khung giá</span>' +
      '<div class="bulk-bar-fields">' +
        '<button type="button" class="btn btn-secondary" data-action="adminPriceClearSel">Hủy</button>' +
        '<button type="button" class="btn" id="prBulkUpdateBtn" data-action="adminPriceOpenBulkUpdate">Cập nhật giá</button>' +
        '<button type="button" class="btn btn-danger" data-action="adminPriceDeleteSelected">Xoá các khung giá đã chọn</button>' +
      '</div>' +
    '</div>';
  adminPriceSyncBar();
}

/* ---- Chọn nhiều dòng trong bảng Quản lý giá (checkbox cuối bảng) để xoá/cập nhật giá hàng loạt.
   "Cập nhật giá" bật khi mọi khung giá đã chọn đang cùng giá Đơn VÀ cùng giá Đôi với nhau (so từng
   cặp, không cần cùng giá Đơn = giá Đôi trong nội bộ 1 khung) — vd 2 khung cùng Đơn 160k/Đôi 140k thì
   gộp được, còn 1 khung Đơn 160k/Đôi 140k với 1 khung Đơn 160k/Đôi 150k thì không (giá Đôi lệch nhau).
   Lúc lưu, cập nhật CẢ 2 loại giá (Đơn/Đôi) cùng lúc cho mọi khung trong nhóm — chỉ bỏ qua loại nào
   khung đó vốn không có (vd toàn khung chỉ có giá Đơn thì không đụng tới giá Đôi). ---- */
function adminPriceGroupInfo() {
  var ids = Object.keys(PRICE_SEL);
  if (!ids.length) return null;
  var routes = FleetStore.getRoutes();
  var items = ids.map(function (id) { return routes.find(function (r) { return r.id === id; }); }).filter(Boolean);
  if (!items.length) return null;
  var metas = items.map(function (r) { var m = buildSeatPriceMeta(r); return { id: r.id, single: m.single, double: m.double }; });
  var single = metas[0].single, double = metas[0].double;
  var sameSingle = metas.every(function (mt) { return mt.single === single; });
  var sameDouble = metas.every(function (mt) { return mt.double === double; });
  return {
    ids: items.map(function (r) { return r.id; }), metas: metas, count: items.length,
    single: single, double: double, hasSingle: single > 0, hasDouble: double > 0,
    valid: sameSingle && sameDouble
  };
}

function adminPriceSyncBar() {
  var bar = $('prActionBar');
  if (!bar) return;
  var ids = Object.keys(PRICE_SEL);
  if (!ids.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  var hint = $('prActionHint'); if (hint) hint.textContent = 'Đã chọn ' + ids.length + ' khung giá';
  var group = adminPriceGroupInfo();
  var updateBtn = $('prBulkUpdateBtn');
  if (updateBtn) {
    var ok = !!(group && group.valid);
    updateBtn.disabled = !ok;
    updateBtn.title = ok ? '' : 'Chỉ cập nhật hàng loạt khi các khung giá đã chọn có cùng giá Đơn và cùng giá Đôi với nhau.';
  }
}

function adminPriceToggleRow(id, cb) {
  if (cb.checked) PRICE_SEL[id] = true; else delete PRICE_SEL[id];
  var tr = document.querySelector('#viewPricing tr[data-row-key="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  var all = $('prCheckAll');
  if (all) all.checked = document.querySelectorAll('#viewPricing tbody td.col-check input[type="checkbox"]:not(:checked)').length === 0;
  adminPriceSyncBar();
}

function adminPriceToggleAll(cb) {
  var boxes = document.querySelectorAll('#viewPricing tbody td.col-check input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (b) {
    var id = null;
    try { id = JSON.parse(b.getAttribute('data-args') || '[]')[0]; } catch (e) { /* ignore */ }
    if (!id) return;
    if (cb.checked) PRICE_SEL[id] = true; else delete PRICE_SEL[id];
  });
  renderPricingView();
}

function adminPriceClearSel() { PRICE_SEL = {}; renderPricingView(); }

function adminPriceDeleteSelected() {
  var ids = Object.keys(PRICE_SEL);
  if (!ids.length) return;
  var routes = FleetStore.getRoutes();
  var deletable = [], blocked = [];
  ids.forEach(function (id) {
    var r = routes.find(function (x) { return x.id === id; });
    var chk = FleetStore.canDeleteRoute(id);
    if (chk.ok) deletable.push(id); else blocked.push((r ? r.label : id) + ' (' + chk.reason + ')');
  });
  if (!deletable.length) { showToast('Không thể xoá: tất cả khung giá đã chọn đang được dùng.'); return; }
  var msg = 'Xoá ' + deletable.length + ' khung giá đã chọn?' + (blocked.length ? '\nBỏ qua ' + blocked.length + ' khung giá đang được dùng: ' + blocked.join(', ') : '');
  if (!confirm(msg)) return;
  var deletableSet = {}; deletable.forEach(function (id) { deletableSet[id] = true; });
  var list = routes.filter(function (x) { return !deletableSet[x.id]; });
  FleetStore.setRoutes(list);
  deletable.forEach(function (id) {
    FleetStore.log({ action: 'delete', entity: 'route', entityId: id, summary: 'Xoá khung giá ' + id });
    delete PRICE_SEL[id];
  });
  showToast('Đã xoá ' + deletable.length + ' khung giá.' + (blocked.length ? ' Bỏ qua ' + blocked.length + ' khung giá đang dùng.' : ''));
  renderPricingView();
}

function adminPriceOpenBulkUpdate() {
  var group = adminPriceGroupInfo();
  if (!group || !group.valid) { showToast('Chỉ cập nhật hàng loạt khi các khung giá đã chọn có cùng giá Đơn và cùng giá Đôi với nhau.'); return; }
  var summary = [group.hasSingle ? 'Đơn ' + fmtMoney(group.single) : null, group.hasDouble ? 'Đôi ' + fmtMoney(group.double) : null]
    .filter(Boolean).join(' / ');
  openAdminModal(
    '<h3>Cập nhật giá hàng loạt</h3>' +
    '<p class="hint-inline">Áp dụng cho ' + group.count + ' khung giá, đang cùng giá ' + esc(summary) + '.</p>' +
    '<form class="admin-form" data-submit-action="adminSaveBulkPriceUpdate" data-args=\'["__event__"]\'>' +
      (group.hasSingle ? '<div class="fld"><label>Giá vé đơn mới (đ) *</label><input id="pmBulkSingle" type="number" min="0" step="5000" required value="' + group.single + '"></div>' : '') +
      (group.hasDouble ? '<div class="fld"><label>Giá vé đôi mới (đ) *</label><input id="pmBulkDouble" type="number" min="0" step="5000" required value="' + group.double + '"></div>' : '') +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

// Cập nhật CẢ 2 loại giá (Đơn/Đôi) cùng lúc cho mọi khung trong nhóm — chỉ đụng tới field nào nhóm đó
// vốn có (xem hasSingle/hasDouble ở adminPriceGroupInfo), tránh gán nhầm giá Đôi cho khung chỉ bán vé đơn.
function adminSaveBulkPriceUpdate(e) {
  e.preventDefault();
  var group = adminPriceGroupInfo();
  if (!group || !group.valid) { showToast('Danh sách đã chọn thay đổi, thử lại.'); closeAdminModal(); renderPricingView(); return; }
  var newSingle = group.hasSingle ? parseInt($('pmBulkSingle').value, 10) : null;
  var newDouble = group.hasDouble ? parseInt($('pmBulkDouble').value, 10) : null;
  if (group.hasSingle && (!newSingle || newSingle <= 0)) { showToast('Nhập giá vé đơn hợp lệ.'); return; }
  if (group.hasDouble && (!newDouble || newDouble <= 0)) { showToast('Nhập giá vé đôi hợp lệ.'); return; }
  var list = FleetStore.getRoutes();
  group.metas.forEach(function (mt) {
    var r = list.find(function (x) { return x.id === mt.id; });
    if (!r) return;
    var before = JSON.parse(JSON.stringify(r));
    if (group.hasSingle) r.price = newSingle;
    if (group.hasDouble) r.doubleSeatPrice = newDouble;
    FleetStore.log({ action: 'update', entity: 'route', entityId: mt.id, summary: 'Cập nhật giá hàng loạt ' + r.label, before: before, after: r });
  });
  FleetStore.setRoutes(list);
  closeAdminModal();
  showToast('Đã cập nhật giá cho ' + group.ids.length + ' khung giá.');
  renderPricingView();
}

