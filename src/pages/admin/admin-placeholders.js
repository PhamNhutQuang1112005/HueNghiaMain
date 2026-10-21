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

var PRICING_FILTERS = { search: '', direction: '', route: '' };
var PRICE_SEL = {}; // id tuyến đang tick chọn (bảng Quản lý giá) — dùng cho "Xoá"/"Cập nhật giá" hàng loạt

// Giá nằm ở route.prices = [{ from, to, price, doubleSeatPrice }] (bảng route_price: theo cặp trạm đi - trạm đến).
// Cột "Giá" chỉ tóm tắt: số cặp đã có giá + mức thấp nhất.
function routePriceSummary(r) {
  var ps = (r && r.prices) || [];
  var singles = ps.map(function (p) { return Number(p.price) || 0; }).filter(Boolean);
  var doubles = ps.map(function (p) { return Number(p.doubleSeatPrice) || 0; }).filter(Boolean);
  return { count: ps.length, single: singles.length ? Math.min.apply(null, singles) : 0, double: doubles.length ? Math.min.apply(null, doubles) : 0 };
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
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenRoutePrices" data-args=\'["' + esc(routeId) + '"]\'>Giá theo trạm</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenRouteModal" data-args=\'["' + esc(routeId) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminDuplicateRoute" data-args=\'["' + esc(routeId) + '"]\'>Sao chép</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteRoute" data-args=\'["' + esc(routeId) + '"]\'>Xoá</button>');
}

function renderPricingView() {
  var directions = (FleetStore && FleetStore.getDirections ? FleetStore.getDirections() : []).filter(function (d) { return d && d.active !== false; }).sort(byOrder);
  var routes = (FleetStore && FleetStore.getRoutes ? FleetStore.getRoutes() : []).filter(function (r) { return r && r.active !== false; });

  function routeDirId(r) { return FleetStore && FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(r.label) : null; }

  var filteredRoutes = routes.filter(function (r) {
    var text = [r.label, r.abbr, (r.fromStations || []).join(' '), (r.toStations || []).join(' ')].join(' ').toLowerCase();
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

  function priceBadgeHtml(sm) {
    if (!sm.count) return '<span class="hint-inline">Chưa có giá</span>';
    return '<div class="price-badge-stack">' +
      '<span class="price-badge"><em>' + sm.count + ' cặp · từ</em>' + esc(fmtMoney(sm.single || sm.double)) + '</span>' +
    '</div>';
  }

  function routeRowHtml(r, idx) {
    var priceMeta = routePriceSummary(r);
    var sel = !!PRICE_SEL[r.id];
    return '<tr data-row-key="' + esc(r.id) + '" class="' + (sel ? 'selected-row' : '') + '">' +
      '<td class="num">' + (idx + 1) + '</td>' +
      '<td><strong>' + esc(r.label || '—') + '</strong></td>' +
      '<td class="pr-price">' + priceBadgeHtml(priceMeta) + '</td>' +
      '<td style="white-space:normal;">' + stationCells({ routeId: r.id, field: 'fromStations' }, r.fromStations || []) + '</td>' +
      '<td style="white-space:normal;">' + stationCells({ routeId: r.id, field: 'toStations' }, r.toStations || []) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminPriceRowMenu" data-args=\'["__this__","' + esc(r.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminPriceToggleRow" data-args=\'["' + esc(r.id) + '","__this__"]\'></td>' +
    '</tr>';
  }

  var rows = filteredRoutes.length ? filteredRoutes.map(routeRowHtml).join('') : '<tr><td colspan="7" class="empty-state">Không có tuyến nào phù hợp với bộ lọc.</td></tr>';

  var allChecked = filteredRoutes.length && filteredRoutes.every(function (r) { return PRICE_SEL[r.id]; });

  var tableHtml = '<div class="sd-section-block">' +
    '<div class="sd-table-wrap" style="overflow:auto;">' +
      '<table class="admin-table pricing-table" style="table-layout:fixed; min-width:940px;">' +
        '<thead><tr>' +
          '<th class="num" style="width:44px; white-space:nowrap;">STT</th>' +
          '<th style="width:160px;">Tuyến chính</th>' +
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
      '<button type="button" class="btn btn-primary" data-action="adminOpenRouteModal" data-args=\'["", "' + esc(PRICING_FILTERS.direction || SELECTED_DIR_ID || '') + '"]\'>+ Thêm tuyến</button>' +
      '<button type="button" class="btn" data-action="adminResetPricingFilters">Đặt lại</button>' +
    '</div>' +
    tableHtml +
    '<div class="bulk-bar" id="prActionBar" style="display:none;">' +
      '<span class="bulk-bar-hint" id="prActionHint">Đã chọn 0 khung giá</span>' +
      '<div class="bulk-bar-fields">' +
        '<button type="button" class="btn btn-secondary" data-action="adminPriceClearSel">Hủy</button>' +
        '<button type="button" class="btn btn-danger" data-action="adminPriceDeleteSelected">Xoá các khung giá đã chọn</button>' +
      '</div>' +
    '</div>';
  adminPriceSyncBar();
}

/* ---- Chọn nhiều dòng trong bảng Quản lý giá (checkbox cuối bảng) để xoá hàng loạt. ---- */
function adminPriceSyncBar() {
  var bar = $('prActionBar');
  if (!bar) return;
  var ids = Object.keys(PRICE_SEL);
  if (!ids.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  var hint = $('prActionHint'); if (hint) hint.textContent = 'Đã chọn ' + ids.length + ' khung giá';
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

/* ---- Giá theo cặp trạm đi - trạm đến của 1 tuyến (route_price). Cặp để trống = không bán. ---- */
var RP_SEP = '\u0001';
function adminOpenRoutePrices(routeId) {
  if (!adminRequire('manage_prices')) return;
  var r = FleetStore.getRoutes().find(function (x) { return x.id === routeId; });
  if (!r) return;
  var froms = r.fromStations || [], tos = r.toStations || [];
  if (!froms.length || !tos.length) { showToast('Tuyến cần có trạm đi và trạm đến trước khi nhập giá.'); return; }
  var cur = {};
  (r.prices || []).forEach(function (p) { cur[p.from + RP_SEP + p.to] = p; });
  var rows = '';
  froms.forEach(function (f) {
    tos.forEach(function (t) {
      var p = cur[f + RP_SEP + t] || {};
      rows += '<tr data-from="' + esc(f) + '" data-to="' + esc(t) + '"><td>' + esc(f) + ' → ' + esc(t) + '</td>' +
        '<td><input class="rp-s" type="number" min="0" step="5000" placeholder="Đơn" value="' + (p.price || '') + '"></td>' +
        '<td><input class="rp-d" type="number" min="0" step="5000" placeholder="Đôi" value="' + (p.doubleSeatPrice || '') + '"></td></tr>';
    });
  });
  openAdminModal(
    '<h3>Giá theo trạm — ' + esc(r.label) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveRoutePrices" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="rpRoute" value="' + esc(routeId) + '">' +
      '<p class="hint-inline">Để trống cả 2 ô = không bán cặp trạm đó.</p>' +
      '<div style="max-height:55vh;overflow:auto;"><table class="admin-table"><thead><tr><th>Trạm đi → Trạm đến</th><th>Giá ghế đơn (đ)</th><th>Giá ghế đôi (đ)</th></tr></thead><tbody id="rpList">' + rows + '</tbody></table></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>', false, true
  );
}

function adminSaveRoutePrices(e) {
  e.preventDefault();
  if (!adminRequire('manage_prices')) return;
  var id = $('rpRoute').value;
  var prices = [];
  Array.prototype.forEach.call($('rpList').querySelectorAll('tr'), function (tr) {
    var s = parseInt(tr.querySelector('.rp-s').value, 10) || 0, d = parseInt(tr.querySelector('.rp-d').value, 10) || 0;
    if (s > 0 || d > 0) prices.push({ from: tr.getAttribute('data-from'), to: tr.getAttribute('data-to'), price: s, doubleSeatPrice: d });
  });
  var list = FleetStore.getRoutes();
  var r = list.find(function (x) { return x.id === id; });
  if (!r) return;
  var before = JSON.parse(JSON.stringify(r));
  r.prices = prices;
  // ponytail: route.price/doubleSeatPrice = mức thấp nhất, chỉ để phơi/đặt vé cũ (chưa tra theo cặp trạm) còn chạy; bỏ khi các nơi đó dùng FleetStore.getRoutePrice.
  var sm = routePriceSummary(r);
  r.price = sm.single; r.doubleSeatPrice = sm.double;
  FleetStore.setRoutes(list);
  FleetStore.log({ action: 'update', entity: 'route', entityId: id, summary: 'Cập nhật giá theo trạm ' + r.label + ' (' + prices.length + ' cặp)', before: before, after: r });
  closeAdminModal();
  showToast('Đã lưu giá (' + prices.length + ' cặp trạm).');
  renderPricingView();
}
