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

function routeVehicleType(r, idx) {
  if (r && r.vehicleType) return r.vehicleType;
  if (idx % 2 === 0) return 'Limousine 24 Phòng';
  return 'Xe 45 chỗ';
}

function buildSeatPriceMeta(r, vehicleType) {
  var single = Number(r && r.price) || 0;
  var hasDouble = routeVehicleHasDoubleSeat(vehicleType);
  var double = Number(r && r.doubleSeatPrice) || 0;
  if (!double && hasDouble) double = Math.round(single * 1.15);
  if (!double) double = single;
  return {
    single: single,
    double: double,
    hasDouble: hasDouble
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
    if (!priceMeta.hasDouble) return '<span class="price-badge">' + esc(fmtMoney(priceMeta.single)) + '</span>';
    return '<div class="price-badge-stack">' +
      '<span class="price-badge"><em>Đơn</em>' + esc(fmtMoney(priceMeta.single)) + '</span>' +
      '<span class="price-badge"><em>Đôi</em>' + esc(fmtMoney(priceMeta.double)) + '</span>' +
    '</div>';
  }

  function routeRowHtml(r, idx) {
    var vehicleType = routeVehicleType(r, idx);
    var priceMeta = buildSeatPriceMeta(r, vehicleType);
    return '<tr>' +
      '<td class="num">' + (idx + 1) + '</td>' +
      '<td><strong>' + esc(r.label || '—') + '</strong></td>' +
      '<td class="pr-vehicle">' + esc(vehicleType) + '</td>' +
      '<td class="pr-price">' + priceBadgeHtml(priceMeta) + '</td>' +
      '<td style="white-space:normal;">' + stationCells({ routeId: r.id, field: 'fromStations' }, r.fromStations || []) + '</td>' +
      '<td style="white-space:normal;">' + stationCells({ routeId: r.id, field: 'toStations' }, r.toStations || []) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminPriceRowMenu" data-args=\'["__this__","' + esc(r.id) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
    '</tr>';
  }

  var rows = filteredRoutes.length ? filteredRoutes.map(routeRowHtml).join('') : '<tr><td colspan="7" class="empty-state">Không có tuyến nào phù hợp với bộ lọc.</td></tr>';

  var tableHtml = '<div class="sd-section-block">' +
    '<div class="sd-table-wrap" style="overflow:auto;">' +
      '<table class="admin-table pricing-table" style="table-layout:fixed; min-width:900px;">' +
        '<thead><tr>' +
          '<th class="num" style="width:44px; white-space:nowrap;">STT</th>' +
          '<th style="width:160px;">Tuyến chính</th>' +
          '<th class="pr-vehicle" style="width:130px;">Loại xe</th>' +
          '<th class="pr-price" style="width:95px;">Giá</th>' +
          '<th style="width:247px;">Điểm đi</th>' +
          '<th style="width:258px;">Điểm đến</th>' +
          '<th class="th-actions" style="width:100px;">Thao tác</th>' +
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
    tableHtml;
}

