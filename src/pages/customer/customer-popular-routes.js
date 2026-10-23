// src/pages/customer/customer-popular-routes.js — "Tuyến xe phổ biến" ở trang chủ khách hàng.
// Đọc trực tiếp window.FleetStore (cùng localStorage/nguồn dữ liệu với trang Admin > Tuyến xe) để
// hiện đúng tên tuyến + giá vé thật đang áp dụng, thay vì bịa số liệu minh hoạ.
// Chỉ lấy tuyến 2 hướng Sài Gòn <-> An Giang vì đó là 2 thành phố mà khung tìm chuyến (CUSTOMER_CITIES,
// customer-data.js) đang hỗ trợ — bấm vào thẻ sẽ tự điền form và tìm chuyến ngay.
// Nạp SAU storage-keys.js + fleet-store.js + customer-data.js, TRƯỚC customer-search.js.
(function () {
  'use strict';

  // Tối đa số thẻ mỗi chiều; tuyến Admin tạo có id động nên chọn theo hướng chứ không theo id cố định.
  var PER_DIRECTION = 4;

  var BUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9"/><path d="M4 16h16"/><path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>';
  var TAG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m20.59 13.41-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1"/></svg>';
  var SEATS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtVnd(n) {
    return n.toLocaleString('vi-VN') + ' đ';
  }

  function priceLabel(route) {
    var p = 0; // giá thấp nhất trong các cặp trạm của mọi tuyến cùng tên (1 tuyến có thể tách nhiều bản ghi, mỗi bản ghi vài khung giá)
    FleetStore.getRoutes().forEach(function (r) {
      if (r.label !== route.label || r.directionId !== route.directionId || r.active === false) return;
      var f = FleetStore.routeFare(r), v = f.price || f.doubleSeatPrice;
      if (v && (!p || v < p)) p = v;
    });
    return p ? 'Từ ' + fmtVnd(p) : 'Liên hệ';
  }

  function vehicleTypeLabel(route) {
    if (route.vehicleType) return route.vehicleType;
    var featured = FleetStore.getVehicleTypes({ scope: 'line' }).filter(function (v) { return v.featuredForTrip; });
    return featured.length ? featured.map(function (v) { return v.name; }).join(' · ') : 'Nhiều loại xe';
  }

  function pickPopularRoutes() {
    var routes = FleetStore.getRoutes().filter(function (r) { return r.active !== false; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var picked = [];
    ['sg-ag', 'ag-sg'].forEach(function (dir) {
      var seen = {};
      routes.filter(function (r) {
        if (r.directionId !== dir || seen[r.label]) return false; // tuyến trùng tên (nhiều khung) chỉ hiện 1 thẻ
        return (seen[r.label] = true);
      }).slice(0, PER_DIRECTION).forEach(function (r) { picked.push(r); });
    });
    return picked;
  }

  function cardHtml(route) {
    var outbound = route.directionId === 'sg-ag';
    var fromCity = outbound ? CUSTOMER_CITIES[0] : CUSTOMER_CITIES[1];
    var toCity = outbound ? CUSTOMER_CITIES[1] : CUSTOMER_CITIES[0];
    var routeLabel = esc(route.label).replace(' - ', ' <span class="arrow">⇄</span> ');
    return (
      '<div class="cust-popular-card" data-from="' + esc(fromCity) + '" data-to="' + esc(toCity) + '" tabindex="0" role="button">' +
      '<div class="cust-popular-icon">' + BUS_ICON + '</div>' +
      '<div class="cust-popular-info">' +
      '<div class="cust-popular-route">' + routeLabel + '</div>' +
      '<div class="cust-popular-meta">' +
      '<span>' + TAG_ICON + priceLabel(route) + '</span>' +
      '<span>' + SEATS_ICON + esc(vehicleTypeLabel(route)) + '</span>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function init() {
    var grid = document.getElementById('popularRoutesGrid');
    if (!grid || typeof FleetStore === 'undefined') return;

    var routes = pickPopularRoutes();
    if (!routes.length) return;

    grid.innerHTML = routes.map(cardHtml).join('');

    grid.querySelectorAll('.cust-popular-card').forEach(function (card) {
      card.addEventListener('click', function () {
        document.getElementById('fromCity').value = card.dataset.from;
        document.getElementById('toCity').value = card.dataset.to;
        document.getElementById('searchForm').requestSubmit();
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
