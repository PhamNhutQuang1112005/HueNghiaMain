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
var PRICE_SEL = {}; // "routeId|frameId" đang tick chọn (bảng Quản lý giá) — dùng cho xoá hàng loạt

/* Mô hình (docs/fare-erd.mmd): GIÁ nằm ở cặp (trạm đi → trạm đến) + LOẠI XE, dùng chung mọi tuyến, lưu trong
   FleetStore (station_price). Tuyến chỉ gom hiển thị: route.priceFrames = [{ id, vehicles:[{ vehicleType, pendingPrice?,
   pendingDoublePrice? }], from:[stationId], to:[stationId] }], mỗi khung = tập trạm đi × tập trạm đến × các loại xe
   (bỏ cặp đi = đến). Lưu khung = ghi cùng 1 mức giá cho mọi cặp của khung ở từng loại xe; 1 tuyến có nhiều khung.
   Khung mới thêm chưa có trạm thì giữ giá "chờ" trong từng loại xe và tự áp vào các cặp ngay khi khung có đủ
   điểm đi + điểm đến. */
var PF_SEP = '|';

function stName(id) {
  var s = FleetStore.stationByRef(id);
  return s ? s.name : '?';
}

// Trạm được phép đặt giá (id): trạm đi/đến của tuyến + trạm có thể nhận (khách lên/xuống dọc đường).
function priceStations(r, kind) {
  var out = [];
  (r[kind] || []).concat(r.pickupStations || []).forEach(function (n) {
    var s = FleetStore.stationByRef(n);
    if (s && out.indexOf(s.id) === -1) out.push(s.id);
  });
  return out;
}

function frameVts(f) {
  return (f.vehicles || []).map(function (v) { return v.vehicleType; });
}

function routeFrames(r) {
  return Array.isArray(r.priceFrames) ? r.priceFrames : [];
}

// Bỏ trạm không còn thuộc tuyến khỏi khung giá; cặp đã rời khỏi tuyến này và không tuyến nào dùng nữa thì xoá giá.
function syncRoutePrices(r) {
  var froms = priceStations(r, 'fromStations'), tos = priceStations(r, 'toStations');
  var saved = FleetStore.getRoutes().find(function (x) { return x.id === r.id; });
  var before = saved ? FleetStore.routePairs(saved) : [];
  r.priceFrames = routeFrames(r).map(function (f) {
    return { id: f.id, vehicles: f.vehicles || [], // giá chờ của từng loại xe nằm trong vehicles
      from: f.from.filter(function (s) { return froms.indexOf(s) !== -1; }),
      to: f.to.filter(function (s) { return tos.indexOf(s) !== -1; }) };
  }); // giữ cả khung đã mất hết trạm: Sửa để chọn lại hoặc Xoá
  var after = {};
  FleetStore.routePairs(r).forEach(function (p) { after[p.from + '>' + p.to + '>' + p.vehicleType] = true; });
  FleetStore.releasePairPrices(before.filter(function (p) { return !after[p.from + '>' + p.to + '>' + p.vehicleType]; }), r.id);
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

// Menu "Thao tác" của 1 khung giá — dropdown nổi dùng chung adminOpenRowMenu (admin-station-directory.js).
function adminPriceRowMenu(btn, key) {
  var p = key.split(PF_SEP);
  adminOpenRowMenu(btn, 'price:' + key,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenPriceFrame" data-args=\'["' + esc(p[0]) + '","' + esc(p[1]) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeletePriceFrame" data-args=\'["' + esc(p[0]) + '","' + esc(p[1]) + '"]\'>Xoá</button>');
}

// Nút "+" trong ô điểm đi/đến: mở modal liệt kê trạm của tuyến chưa có trong khung để tick chọn nhiều trạm 1 lần.
function adminPriceAddStationMenu(btn, routeId, frameId, kind) {
  if (!adminRequire('manage_prices')) return;
  var r = FleetStore.getRoutes().find(function (x) { return x.id === routeId; });
  var f = r && routeFrames(r).find(function (x) { return x.id === frameId; });
  if (!f) return;
  var left = priceStations(r, kind === 'from' ? 'fromStations' : 'toStations').filter(function (s) { return f[kind].indexOf(s) === -1; });
  openAdminModal(
    '<h3>Thêm điểm ' + (kind === 'from' ? 'đi' : 'đến') + ' — ' + esc(r.label) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminPriceAddStations" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="pasRoute" value="' + esc(routeId) + '"><input type="hidden" id="pasFrame" value="' + esc(frameId) + '"><input type="hidden" id="pasKind" value="' + kind + '">' +
      (left.length
        ? '<div class="chip-editor" style="margin-bottom:6px;"><label class="chip sp-opt"><input type="checkbox" data-change-action="adminPriceAddPickAll" data-args=\'["__this__"]\'><span>Chọn tất cả</span></label></div>' +
          '<div class="chip-editor pf-pick" data-pf="pick">' + left.map(function (st) {
            return '<label class="chip sp-opt"><input type="checkbox" value="' + esc(st) + '"><span>' + esc(stName(st)) + '</span></label>';
          }).join('') + '</div>'
        : '<p class="hint-inline">Đã thêm hết trạm của tuyến. Thêm trạm mới ở màn "Tuyến xe".</p>') +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button>' +
        (left.length ? '<button type="submit" class="btn btn-primary">Thêm</button>' : '') + '</div>' +
    '</form>'
  );
}

function adminPriceAddPickAll(cb) {
  Array.prototype.forEach.call(document.querySelectorAll('[data-pf="pick"] input'), function (c) { c.checked = cb.checked; });
}

function adminPriceAddStations(e) {
  e.preventDefault();
  var stations = Array.prototype.map.call(document.querySelectorAll('[data-pf="pick"] input:checked'), function (c) { return c.value; });
  if (!stations.length) { showToast('Chọn ít nhất 1 trạm.'); return; }
  if (adminAddFrameStations($('pasRoute').value, $('pasFrame').value, $('pasKind').value, stations)) closeAdminModal();
}

// Một (cặp đi → đến, loại xe) chỉ thuộc 1 khung giá trên toàn hệ thống (mọi tuyến) → thông báo nếu from × to × vts đụng khung khác, '' nếu ổn.
function frameClashMsg(r, frameId, from, to, vts) {
  var hit = FleetStore.pairClash(from, to, vts, r.id, frameId), vt = hit && hit.pair.vehicleType;
  return hit ? 'Cặp ' + stName(hit.pair.from) + ' → ' + stName(hit.pair.to) + (vt ? ' (' + vt + ')' : '') + ' đã thuộc khung giá của tuyến "' + hit.route.label + '" — mỗi cặp + loại xe chỉ có 1 giá, hãy sửa ở khung đó.' : '';
}

// Danh sách loại xe (xe tuyến đang bật) để tick trong modal khung giá, mỗi loại xe kèm ô giá đơn/đôi; giữ loại xe
// đang có ở khung dù đã tắt/lạ. fares = frameFares(f) của khung (giá hiện có / giá chờ), rỗng với khung mới.
function vehicleFareRowsHtml(fares) {
  var cur = {}, names = FleetStore.getVehicleTypes({ scope: 'line' }).filter(function (v) { return v.active !== false; }).map(function (v) { return v.name; });
  fares.forEach(function (x) { cur[x.vehicleType] = x; if (x.vehicleType && names.indexOf(x.vehicleType) === -1) names.push(x.vehicleType); });
  return '<div class="pf-vehicles" style="max-height:240px; overflow:auto;">' + names.map(function (n) {
    var x = cur[n];
    return '<div class="pf-vrow" data-vt="' + esc(n) + '" style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">' +
      '<label style="flex:1; display:flex; align-items:center; gap:6px;"><input type="checkbox" class="pf-vcheck"' + (x ? ' checked' : '') + '><span>' + esc(n) + '</span></label>' +
      '<input class="pf-vprice" type="number" min="1" step="1" placeholder="Giá đơn" style="width:110px;" value="' + (x && x.price ? x.price : '') + '">' +
      '<input class="pf-vdouble" type="number" min="0" step="1" placeholder="Giá đôi" style="width:110px;" value="' + (x && x.doubleSeatPrice ? x.doubleSeatPrice : '') + '">' +
    '</div>';
  }).join('') + '</div>';
}

// Thêm các trạm vào điểm đi/đến của khung → true nếu đã lưu.
function adminAddFrameStations(routeId, frameId, kind, stations) {
  if (!adminRequire('manage_prices')) return false;
  var list = FleetStore.getRoutes();
  var r = list.find(function (x) { return x.id === routeId; });
  var f = r && routeFrames(r).find(function (x) { return x.id === frameId; });
  if (!f) return false;
  var nf = { id: f.id, vehicles: (f.vehicles || []).map(function (v) { return Object.assign({}, v); }), from: f.from.slice(), to: f.to.slice() }; nf[kind] = nf[kind].concat(stations);
  var clash = frameClashMsg(r, frameId, nf.from, nf.to, frameVts(nf));
  if (clash) { showToast(clash); return false; }
  // Cặp mới của khung lấy đúng giá riêng của từng loại xe (không cặp nào thuộc khung khác nên không đụng giá tuyến khác).
  var oldKeys = {}, newPairs = FleetStore.framePairs(nf), fares = FleetStore.frameFares(f);
  FleetStore.framePairs(f).forEach(function (p) { oldKeys[p.from + '>' + p.to + '>' + p.vehicleType] = true; });
  for (var i = 0; i < fares.length; i++) {
    var fare = fares[i];
    if (!(fare.price > 0)) continue; // loại xe chưa có giá: chỉ thêm trạm, giá nhập sau bằng "Sửa"
    var mine = newPairs.filter(function (p) { // giá chờ: áp cho mọi cặp khung vừa có
      return p.vehicleType === fare.vehicleType && (fare.pending || !oldKeys[p.from + '>' + p.to + '>' + p.vehicleType]);
    });
    if (!mine.length) continue;
    var saved = FleetStore.savePairPrices(mine, fare.price, fare.doubleSeatPrice);
    if (!saved.ok) { showToast(saved.reason); return false; }
    if (fare.pending) { delete nf.vehicles[i].pendingPrice; delete nf.vehicles[i].pendingDoublePrice; }
  }
  f.vehicles = nf.vehicles;
  f[kind] = nf[kind];
  syncRoutePrices(r);
  FleetStore.setRoutes(list);
  FleetStore.log({ action: 'update', entity: 'route', entityId: routeId, summary: 'Thêm ' + stations.length + ' trạm ' + (kind === 'from' ? 'đi' : 'đến') + ' vào khung giá ' + r.label });
  renderPricingView();
  return true;
}

/* Mỗi dòng = 1 khung giá. Tuyến lấy từ bảng "Tuyến xe" (trạm đi/đến của khung phải nằm trong tuyến),
   cùng 1 tuyến thêm được nhiều khung giá. */
function renderPricingView() {
  var directions = (FleetStore && FleetStore.getDirections ? FleetStore.getDirections() : []).filter(function (d) { return d && d.active !== false; }).sort(byOrder);
  // Cả tuyến đã tắt: khung của nó vẫn giữ cặp (pairClash tính), phải thấy được để Sửa/Xoá vĩnh viễn.
  var routes = (FleetStore && FleetStore.getRoutes ? FleetStore.getRoutes() : []).filter(function (r) { return r; })
    .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

  function routeDirId(r) { return FleetStore && FleetStore.getRouteDirectionId ? FleetStore.getRouteDirectionId(r.label) : null; }

  var rowsData = [];
  routes.forEach(function (r) {
    var dirId = routeDirId(r);
    if (PRICING_FILTERS.direction && dirId !== PRICING_FILTERS.direction) return;
    if (PRICING_FILTERS.route && r.label !== PRICING_FILTERS.route) return;
    routeFrames(r).forEach(function (f) {
      var text = [r.label, r.abbr, frameVts(f).join(' '), f.from.map(stName).join(' '), f.to.map(stName).join(' ')].join(' ').toLowerCase();
      if (PRICING_FILTERS.search && text.indexOf(PRICING_FILTERS.search.trim().toLowerCase()) === -1) return;
      rowsData.push({ r: r, f: f, key: r.id + PF_SEP + f.id });
    });
  });

  // Dọn lựa chọn của khung giá không còn hiển thị (đổi bộ lọc).
  var vis = {}; rowsData.forEach(function (x) { vis[x.key] = true; });
  Object.keys(PRICE_SEL).forEach(function (k) { if (!vis[k]) delete PRICE_SEL[k]; });

  var seen = {};
  var routeOptions = routes.filter(function (r) {
    if (PRICING_FILTERS.direction && routeDirId(r) !== PRICING_FILTERS.direction) return false;
    if (seen[r.label]) return false;
    return (seen[r.label] = true);
  });

  function chips(items, x, kind) {
    return '<div class="rt-pickup chip-editor">' + items.map(function (s) { return '<span class="chip">' + esc(stName(s)) + '</span>'; }).join('') +
      '<button type="button" class="chip" title="Thêm trạm" data-action="adminPriceAddStationMenu" data-args=\'["__this__","' + esc(x.r.id) + '","' + esc(x.f.id) + '","' + kind + '"]\'>+</button></div>';
  }

  var fares = FleetStore.priceMap();
  // Mỗi loại xe của khung 1 khối: tên loại xe + giá đơn/đôi của loại xe đó.
  function priceCell(f) {
    return FleetStore.frameFares(f, fares).map(function (fare) {
      return '<div class="price-badge-stack"><strong' + (fare.vehicleType ? '' : ' title="Giá cũ chưa gắn loại xe — bấm Sửa để chọn"') + '>' + (fare.vehicleType ? esc(fare.vehicleType) : 'Chưa chọn loại xe') + '</strong>' +
        '<span class="price-badge"' + (fare.pending ? ' title="Giá sẽ áp dụng khi thêm điểm đi và điểm đến"' : '') + '><em>Đơn</em>' + (fare.price ? esc(fmtMoney(fare.price)) : '—') + '</span>' +
        (fare.doubleSeatPrice ? '<span class="price-badge"><em>Đôi</em>' + esc(fmtMoney(fare.doubleSeatPrice)) + '</span>' : '') + '</div>';
    }).join('');
  }

  function rowHtml(x, idx) {
    var sel = !!PRICE_SEL[x.key], f = x.f;
    return '<tr data-row-key="' + esc(x.key) + '" class="' + (sel ? 'selected-row' : '') + '">' +
      '<td class="num">' + (idx + 1) + '</td>' +
      '<td><strong>' + esc(x.r.label || '—') + '</strong>' + (x.r.active === false ? ' <span class="hint-inline">(tuyến đang tắt)</span>' : '') + '</td>' +
      '<td class="pr-price"><div class="price-badge-stack" style="gap:12px;">' + priceCell(f) + '</div></td>' +
      '<td style="white-space:normal;">' + chips(f.from, x, 'from') + '</td>' +
      '<td style="white-space:normal;">' + chips(f.to, x, 'to') + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminPriceRowMenu" data-args=\'["__this__","' + esc(x.key) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminPriceToggleRow" data-args=\'["' + esc(x.key) + '","__this__"]\'></td>' +
    '</tr>';
  }

  var rows = rowsData.length ? rowsData.map(rowHtml).join('') : '<tr><td colspan="7" class="empty-state">Chưa có khung giá nào. Bấm "+ Thêm tuyến" để thêm.</td></tr>';
  var allChecked = rowsData.length && rowsData.every(function (x) { return PRICE_SEL[x.key]; });

  var tableHtml = '<div class="sd-section-block">' +
    '<div class="sd-table-wrap" style="overflow:auto;">' +
      '<table class="admin-table pricing-table" style="table-layout:fixed; min-width:1000px;">' +
        '<thead><tr>' +
          '<th class="num" style="width:44px; white-space:nowrap;">STT</th>' +
          '<th style="width:160px;">Tuyến chính</th>' +
          '<th class="pr-price" style="width:210px;">Loại xe / Giá</th>' +
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
      '<button type="button" class="btn btn-primary" data-action="adminOpenPriceFrame" data-args=\'["",""]\'>+ Thêm tuyến</button>' +
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

/* ---- Chọn nhiều khung giá (checkbox cuối bảng) để xoá hàng loạt. ---- */
function adminPriceSyncBar() {
  var bar = $('prActionBar');
  if (!bar) return;
  var ids = Object.keys(PRICE_SEL);
  if (!ids.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  var hint = $('prActionHint'); if (hint) hint.textContent = 'Đã chọn ' + ids.length + ' khung giá';
}

function adminPriceToggleRow(key, cb) {
  if (cb.checked) PRICE_SEL[key] = true; else delete PRICE_SEL[key];
  var tr = document.querySelector('#viewPricing tr[data-row-key="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  var all = $('prCheckAll');
  if (all) all.checked = document.querySelectorAll('#viewPricing tbody td.col-check input[type="checkbox"]:not(:checked)').length === 0;
  adminPriceSyncBar();
}

function adminPriceToggleAll(cb) {
  var boxes = document.querySelectorAll('#viewPricing tbody td.col-check input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (b) {
    var key = null;
    try { key = JSON.parse(b.getAttribute('data-args') || '[]')[0]; } catch (e) { /* ignore */ }
    if (!key) return;
    if (cb.checked) PRICE_SEL[key] = true; else delete PRICE_SEL[key];
  });
  renderPricingView();
}

function adminPriceClearSel() { PRICE_SEL = {}; renderPricingView(); }

// Xoá các khung giá (cặp [routeId, frameId]) rồi lưu + vẽ lại.
function removeFrames(pairs, summary) {
  var list = FleetStore.getRoutes(), freed = [];
  pairs.forEach(function (p) {
    var r = list.find(function (x) { return x.id === p[0]; });
    if (!r) return;
    routeFrames(r).forEach(function (f) { if (f.id === p[1]) freed = freed.concat(FleetStore.framePairs(f)); });
    r.priceFrames = routeFrames(r).filter(function (f) { return f.id !== p[1]; });
    delete PRICE_SEL[p[0] + PF_SEP + p[1]];
  });
  FleetStore.setRoutes(list);
  FleetStore.releasePairPrices(freed); // sau setRoutes: mọi tuyến đã cập nhật nên pairInUse thấy đúng khung còn lại
  FleetStore.log({ action: 'update', entity: 'route', entityId: pairs[0][0], summary: summary });
  renderPricingView();
}

function adminPriceDeleteSelected() {
  var pairs = Object.keys(PRICE_SEL).map(function (k) { return k.split(PF_SEP); });
  if (!pairs.length || !adminRequire('manage_prices')) return;
  if (!confirm('Xoá vĩnh viễn ' + pairs.length + ' khung giá đã chọn? Các cặp trạm của chúng sẽ không còn giá cho đến khi được đưa vào khung khác.')) return;
  removeFrames(pairs, 'Xoá ' + pairs.length + ' khung giá');
  showToast('Đã xoá ' + pairs.length + ' khung giá.');
}

function adminDeletePriceFrame(routeId, frameId) {
  if (!adminRequire('manage_prices') || !confirm('Xoá vĩnh viễn khung giá này? Các cặp trạm của khung sẽ không còn giá cho đến khi được đưa vào một khung khác.')) return;
  removeFrames([[routeId, frameId]], 'Xoá khung giá ' + frameId);
  showToast('Đã xoá khung giá.');
}

/* ---- Thêm khung giá = chỉ thêm 1 dòng cho tuyến (từ bảng Tuyến xe), chưa có trạm/giá. Trạm đi/đến thêm bằng nút "+" hoặc "Sửa" (Sửa nhập luôn giá). ---- */
function priceFrameStationsHtml(r, f) {
  function checks(name, all, on) {
    return '<div class="chip-editor pf-pick" data-pf="' + name + '">' + (all.length ? all.map(function (s) {
      return '<label class="chip sp-opt"><input type="checkbox" value="' + esc(s) + '"' + (on.indexOf(s) !== -1 ? ' checked' : '') + '><span>' + esc(stName(s)) + '</span></label>';
    }).join('') : '<span class="hint-inline">Tuyến chưa có trạm — thêm ở màn "Tuyến xe".</span>') + '</div>';
  }
  return '<div class="fld"><label>Điểm đi *</label>' + checks('from', priceStations(r, 'fromStations'), f.from) + '</div>' +
    '<div class="fld"><label>Điểm đến *</label>' + checks('to', priceStations(r, 'toStations'), f.to) + '</div>';
}

function adminOpenPriceFrame(routeId, frameId) {
  if (!adminRequire('manage_prices')) return;
  // Thêm khung chỉ cho tuyến đang bật; Sửa khung vẫn mở được khi tuyến của khung đã tắt.
  var routes = FleetStore.getRoutes().filter(function (x) { return x.active !== false || x.id === routeId; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  var r = routes.find(function (x) { return x.id === routeId; }) || (frameId ? null : routes[0]);
  if (!r) { showToast(frameId ? 'Không tìm thấy tuyến.' : 'Chưa có tuyến nào. Thêm tuyến ở màn "Tuyến xe" trước.'); return; }
  var f = routeFrames(r).find(function (x) { return x.id === frameId; }) || { from: [], to: [], vehicles: [] };
  openAdminModal(
    '<h3>' + (frameId ? 'Sửa' : 'Thêm') + ' khung giá</h3>' +
    '<form class="admin-form" data-submit-action="adminSavePriceFrame" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="pfId" value="' + esc(frameId || '') + '">' +
      '<div class="fld"><label>Tuyến *</label><select id="pfRoute"' + (frameId ? ' disabled' : '') + '>' +
        routes.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === r.id ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') +
      '</select></div>' +
      (frameId ? '<div id="pfStations">' + priceFrameStationsHtml(r, f) + '</div>' : '<p class="hint-inline">Điểm đi, điểm đến thêm sau bằng nút "+" hoặc "Sửa"; giá nhập ở đây sẽ áp dụng cho các cặp trạm đó.</p>') +
      '<div class="fld"><label>Loại xe và giá * <span class="hint-inline">(tick loại xe, nhập giá ghế đơn / ghế đôi của loại xe đó)</span></label>' + vehicleFareRowsHtml(frameId ? FleetStore.frameFares(f) : []) + '</div>' +
      '<p class="hint-inline">Mỗi cặp điểm đi → điểm đến + loại xe chỉ có 1 giá và chỉ thuộc 1 khung giá (ở mọi tuyến). Để trống giá ghế đôi = chưa có giá riêng (bán ghế đôi tạm tính giá đơn × 2).</p>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="closeAdminModal">Huỷ</button><button type="submit" class="btn btn-primary">Lưu</button></div>' +
    '</form>'
  );
}

function adminSavePriceFrame(e) {
  e.preventDefault();
  if (!adminRequire('manage_prices')) return;
  function picked(name) {
    return Array.prototype.map.call(document.querySelectorAll('[data-pf="' + name + '"] input:checked'), function (c) { return c.value; });
  }
  var routeId = $('pfRoute').value, id = $('pfId').value;
  var list = FleetStore.getRoutes();
  var r = list.find(function (x) { return x.id === routeId; });
  if (!r) return;
  var before = JSON.parse(JSON.stringify(r));
  var frames = routeFrames(r);
  // Loại xe đã tick + giá. Để trống giá ghế đơn của loại xe đang có ở khung = giữ giá hiện có (hoặc giá chờ).
  var curFares = {}, items = [];
  if (id) FleetStore.frameFares(frames.find(function (o) { return o.id === id; }) || {}).forEach(function (x) { curFares[x.vehicleType] = x; });
  var rowEls = document.querySelectorAll('.pf-vrow');
  for (var i = 0; i < rowEls.length; i++) {
    if (!rowEls[i].querySelector('.pf-vcheck').checked) continue;
    var vt = rowEls[i].getAttribute('data-vt'), raw = rowEls[i].querySelector('.pf-vprice').value.trim();
    var price = Number(raw), dbl = Number(rowEls[i].querySelector('.pf-vdouble').value) || 0;
    if (raw === '' && curFares[vt] && curFares[vt].price) { price = curFares[vt].price; dbl = curFares[vt].doubleSeatPrice || 0; }
    var iwhy = FleetStore.validatePairPrice(price, dbl);
    if (iwhy) { showToast(vt + ': ' + iwhy); return; }
    items.push({ vehicleType: vt, price: price, dbl: dbl });
  }
  if (!items.length) { showToast('Chọn ít nhất 1 loại xe.'); return; }
  var vts = items.map(function (it) { return it.vehicleType; });
  if (!id) { // thêm mới: 1 khung rỗng cho tuyến, giá từng loại xe giữ chờ tới khi thêm trạm
    r.priceFrames = frames.concat({ id: 'pf' + Date.now().toString(36), from: [], to: [], vehicles: items.map(function (it) {
      return { vehicleType: it.vehicleType, pendingPrice: it.price, pendingDoublePrice: it.dbl };
    }) });
    FleetStore.setRoutes(list);
    FleetStore.log({ action: 'update', entity: 'route', entityId: routeId, summary: 'Thêm khung giá ' + r.label, before: before, after: r });
    closeAdminModal();
    showToast('Đã thêm khung giá. Thêm điểm đi, điểm đến bằng nút "+" hoặc "Sửa".');
    renderPricingView();
    return;
  }
  var from = picked('from'), to = picked('to');
  var clash = frameClashMsg(r, id, from, to, vts);
  if (clash) { showToast(clash); return; }
  var hasPairs = FleetStore.framePairs({ from: from, to: to, vehicleType: 'x' }).length > 0;
  if (hasPairs) { // không cặp nào thuộc khung khác (đã chặn ở trên) → mỗi loại xe ghi 1 mức cho mọi cặp của nó, không đụng tuyến khác
    for (var k = 0; k < items.length; k++) {
      var saved = FleetStore.savePairPrices(FleetStore.framePairs({ from: from, to: to, vehicleType: items[k].vehicleType }), items[k].price, items[k].dbl);
      if (!saved.ok) { showToast(saved.reason); return; }
    }
  }
  r.priceFrames = frames.map(function (o) {
    if (o.id !== id) return o;
    return { id: id, from: from, to: to, vehicles: items.map(function (it) { // đã có cặp → giá chờ đã áp vào cặp, bỏ
      return hasPairs ? { vehicleType: it.vehicleType } : { vehicleType: it.vehicleType, pendingPrice: it.price, pendingDoublePrice: it.dbl };
    }) };
  });
  syncRoutePrices(r); // loại xe bị bỏ tick → cặp của nó rời khung, xoá giá theo
  FleetStore.setRoutes(list);
  FleetStore.log({ action: 'update', entity: 'route', entityId: routeId, summary: 'Sửa khung giá ' + r.label + ' (' + from.length * to.length + ' ô, ' + items.length + ' loại xe)', before: before, after: r });
  closeAdminModal();
  showToast('Đã lưu khung giá.');
  renderPricingView();
}
