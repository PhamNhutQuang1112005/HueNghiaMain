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
  var hasDouble = /24\s*Phòng|24\s*phong/i.test(String(vehicleType || ''));
  var double = Number(r && r.doubleSeatPrice) || 0;
  if (!double && hasDouble) double = Math.round(single * 1.15);
  if (!double) double = single;
  return {
    single: single,
    double: double,
    hasDouble: hasDouble
  };
}

function adminEditPriceCell(routeId, seatType) {
  var routes = FleetStore && FleetStore.getRoutes ? FleetStore.getRoutes() : [];
  var route = routes.find(function (r) { return String(r.id) === String(routeId); });
  if (!route) return;
  var vehicleType = routeVehicleType(route, 0);
  var priceMeta = buildSeatPriceMeta(route, vehicleType);
  var isDouble = String(seatType || 'single') === 'double';
  if (isDouble && !priceMeta.hasDouble) return;
  var value = isDouble ? priceMeta.double : priceMeta.single;
  openAdminModal(
    '<h3>Chỉnh sửa giá</h3>' +
    '<form class="admin-form" data-submit-action="adminSavePriceEdit" data-args="[__event__]">' +
      '<input type="hidden" id="priceEditRouteId" value="' + esc(route.id) + '">' +
      '<input type="hidden" id="priceEditSeatType" value="' + esc(isDouble ? 'double' : 'single') + '">' +
      '<div class="fld"><label>Loại xe</label><input type="text" value="' + esc(vehicleType) + '" readonly></div>' +
      '<div class="fld"><label>' + (isDouble ? 'Giá ghế đôi' : 'Giá ghế đơn') + '</label><input id="priceEditValue" type="number" min="0" step="5000" value="' + Number(value || 0) + '"></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function adminSavePriceEdit(evt) {
  evt.preventDefault();
  var routeId = $('priceEditRouteId').value;
  var seatType = $('priceEditSeatType').value;
  var newValue = parseInt($('priceEditValue').value, 10) || 0;
  var routes = FleetStore && FleetStore.getRoutes ? FleetStore.getRoutes() : [];
  var route = routes.find(function (r) { return String(r.id) === String(routeId); });
  if (!route) return;
  if (seatType === 'double') {
    route.doubleSeatPrice = newValue;
  } else {
    route.price = newValue;
  }
  FleetStore.setRoutes(routes);
  closeAdminModal();
  showToast('Đã cập nhật giá tuyến.');
  renderPricingView();
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

function renderPricingView() {
  var directions = (FleetStore && FleetStore.getDirections ? FleetStore.getDirections() : []).filter(function (d) { return d && d.active !== false; });
  var routes = (FleetStore && FleetStore.getRoutes ? FleetStore.getRoutes() : []).filter(function (r) { return r && r.active !== false; });

  var dirMap = {};
  directions.forEach(function (d) { dirMap[d.id] = d; });

  var filteredRoutes = routes.filter(function (r) {
    var text = [r.label, r.abbr, r.price, (r.fromStations || []).join(' '), (r.toStations || []).join(' ')].join(' ').toLowerCase();
    var dirId = FleetStore && FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(r.label) : null;
    if (PRICING_FILTERS.search && text.indexOf(PRICING_FILTERS.search.trim().toLowerCase()) === -1) return false;
    if (PRICING_FILTERS.direction && dirId !== PRICING_FILTERS.direction) return false;
    if (PRICING_FILTERS.route && r.label !== PRICING_FILTERS.route) return false;
    return true;
  }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

  var routeOptions = routes.filter(function (r) {
    var dirId = FleetStore && FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(r.label) : null;
    if (PRICING_FILTERS.direction && dirId !== PRICING_FILTERS.direction) return false;
    return true;
  }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

  function compactList(items) {
    var list = Array.isArray(items) ? items.filter(function (x) { return x && String(x).trim(); }) : [];
    return list.length ? list.join(' + ') : '—';
  }

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

  var rows = filteredRoutes.length ? filteredRoutes.map(function (r, idx) {
    var dirId = FleetStore && FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(r.label) : null;
    var dirLabel = dirId && dirMap[dirId] ? dirMap[dirId].label : '—';
    var vehicleType = routeVehicleType(r, idx);
    var priceMeta = buildSeatPriceMeta(r, vehicleType);
    var priceHtml = priceMeta.hasDouble ?
      '<div class="pricing-price-stack">' +
        '<div class="price-row" data-dblclick-action="adminEditPriceCell" data-args=\'["' + esc(r.id) + '","single"]\'><span>Ghế đơn</span><strong>' + esc(fmtMoney(priceMeta.single)) + '</strong></div>' +
        '<div class="price-row" data-dblclick-action="adminEditPriceCell" data-args=\'["' + esc(r.id) + '","double"]\'><span>Ghế đôi</span><strong>' + esc(fmtMoney(priceMeta.double)) + '</strong></div>' +
      '</div>' :
      '<div class="price-row" data-dblclick-action="adminEditPriceCell" data-args=\'["' + esc(r.id) + '","single"]\'><span>Giá</span><strong>' + esc(fmtMoney(priceMeta.single)) + '</strong></div>';

    return '<tr>' +
      '<td class="num">' + (idx + 1) + '</td>' +
      '<td><strong>' + esc(r.label || '—') + '</strong></td>' +
      '<td>' + esc(vehicleType) + '</td>' +
      '<td class="mono">' + priceHtml + '</td>' +
      '<td style="min-width:180px; max-width:220px; white-space:normal;">' + stationCells({ routeId: r.id, field: 'fromStations' }, r.fromStations || []) + '</td>' +
      '<td style="min-width:180px; max-width:220px; white-space:normal;">' + stationCells({ routeId: r.id, field: 'toStations' }, r.toStations || []) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm" data-action="adminOpenRouteModal" data-args=\'["' + esc(r.id) + '"]\'>Sửa</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="adminDeleteRoute" data-args=\'["' + esc(r.id) + '"]\'>Xoá</button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" class="empty-state">Không có tuyến nào phù hợp với bộ lọc.</td></tr>';

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
    '<div class="sd-section-block">' +
      '<div class="sd-table-wrap" style="overflow:auto;">' +
        '<table class="admin-table" style="table-layout:fixed; min-width:930px;">' +
          '<thead><tr>' +
            '<th class="num" style="width:48px;">STT</th>' +
            '<th style="width:200px;">Tuyến chính</th>' +
            '<th style="width:160px;">Loại xe</th>' +
            '<th style="width:120px;">Giá</th>' +
            '<th style="width:210px;">Điểm đi</th>' +
            '<th style="width:210px;">Điểm đến</th>' +
            '<th style="width:140px;">Thao tác</th>' +
          '</tr></thead><tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
}

