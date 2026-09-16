/* =========================================================
   KHÁCH HÀNG (Admin) — tổng hợp danh sách khách hàng DUY NHẤT theo số điện thoại từ toàn bộ vé đã bán/
   giữ chỗ (dùng lại adminScanTicketRows() của admin-tickets.js, KHÔNG quét lại seat bank lần nữa), cộng
   2 bảng thống kê: khách đi thường xuyên, và khu vực hay được "rước khách" (Trạm xe/Điểm dừng — danh
   mục 2 cấp trong admin-station-directory.js, xem FleetStore.getStations()/getStopStations()).

   Hệ thống KHÔNG có sẵn "mã khách hàng" hay bảng khách hàng gốc — điểm đi/điểm đến trên vé cũng chỉ là
   text tự do (transshipStation/pickupAddress do nhân viên gõ tay, KHÔNG khớp cứng vào danh mục trạm).
   Vì vậy:
     - Mã khách hàng (KH0001, KH0002...) TỰ SINH, đánh theo thứ tự khách xuất hiện SỚM NHẤT (actionTime),
       lưu cố định ở HN_ADMIN_CUSTOMER_CODES_KEY để không đổi giữa các lần xem (chỉ thêm mã mới, không
       gán lại mã cũ).
     - Khu vực "rước khách" chỉ KHỚP ĐƯỢC khi text nhân viên gõ trùng/chứa đúng tên trạm đã khai báo
       trong danh mục — phần không khớp gộp riêng vào "Chưa khớp danh mục trạm" để admin thấy rõ, không
       âm thầm bỏ qua hay gán bừa.
   ========================================================= */

var HN_ADMIN_CUSTOMER_CODES_KEY = 'hn_admin_customer_codes_v1';
var CUST_TAB = 'list';
var CUST_FILTERS = { list: '' };

/* ---------- Gộp toàn bộ vé (adminScanTicketRows, admin-tickets.js) theo SĐT ---------- */
function custBuildCustomers() {
  var rows = adminScanTicketRows();
  var byPhone = {};

  rows.forEach(function (r) {
    var phone = String(r.phone || '').trim();
    if (!phone || phone === '—') return;

    var c = byPhone[phone];
    if (!c) c = byPhone[phone] = { phone: phone, name: r.name, tripCount: 0, routeCounts: {}, firstSeenTime: '', lastSeenTime: '' };

    c.tripCount++;
    if (r.name && r.name !== '—') c.name = r.name;

    var routeKey = (r.firstStop || '—') + '|' + (r.lastStop || '—');
    c.routeCounts[routeKey] = (c.routeCounts[routeKey] || 0) + 1;

    var t = r.actionTime || '';
    if (t && (!c.firstSeenTime || t < c.firstSeenTime)) c.firstSeenTime = t;
    if (t && (!c.lastSeenTime || t > c.lastSeenTime)) c.lastSeenTime = t;
  });

  var customers = Object.keys(byPhone).map(function (phone) {
    var c = byPhone[phone];
    var bestRouteKey = Object.keys(c.routeCounts).sort(function (a, b) { return c.routeCounts[b] - c.routeCounts[a]; })[0] || '—|—';
    var parts = bestRouteKey.split('|');
    return {
      phone: phone, name: c.name, tripCount: c.tripCount,
      firstStop: parts[0], lastStop: parts[1],
      firstSeenTime: c.firstSeenTime, lastSeenTime: c.lastSeenTime
    };
  });

  return custAssignCodes(customers);
}

/* Sinh mã KH mới cho các SĐT chưa có mã (theo thứ tự xuất hiện sớm nhất), KHÔNG đổi mã đã cấp trước đó. */
function custAssignCodes(customers) {
  var map = lsRead(HN_ADMIN_CUSTOMER_CODES_KEY, {});
  var maxNum = 0;
  Object.keys(map).forEach(function (p) {
    var n = parseInt(String(map[p]).replace(/\D/g, ''), 10) || 0;
    if (n > maxNum) maxNum = n;
  });

  var missing = customers.filter(function (c) { return !map[c.phone]; });
  missing.sort(function (a, b) { return String(a.firstSeenTime || '').localeCompare(String(b.firstSeenTime || '')); });
  missing.forEach(function (c) {
    maxNum++;
    map[c.phone] = 'KH' + ('0000' + maxNum).slice(-4);
  });
  if (missing.length) lsWrite(HN_ADMIN_CUSTOMER_CODES_KEY, map);

  customers.forEach(function (c) { c.code = map[c.phone] || '—'; });
  return customers;
}

/* ---------- Thống kê khu vực hay "rước khách" — khớp text tự do vào danh mục Trạm chính/Trạm phụ/
   Điểm dừng (admin-station-directory.js), roll-up lên tới Tỉnh. Chỉ tính vé có guestType thuộc nhóm
   "rước" (Rước liền/Rước đường/Trung chuyển) — "Khách trạm" là khách tự ra trạm, không phải rước. ---------- */
function custPickupLocText(r) {
  var type = r.guestType || 'Khách trạm';
  if (type === 'Khách trạm') return '';
  return r.transshipStation || r.pickupAddress || '';
}

function custMatchStationHierarchy(text, stations, stops) {
  var t = String(text || '').trim().toLowerCase();
  if (!t) return null;

  var stop = stops.find(function (s) { return s && s.name && (s.name.toLowerCase() === t || t.indexOf(s.name.toLowerCase()) !== -1); });
  if (stop) {
    var stationOfStop = stations.find(function (s) { return s && s.name === stop.stationName; });
    return { station: stationOfStop ? stationOfStop.name : (stop.stationName || '—'), stop: stop.name };
  }

  var station = stations.find(function (s) { return s && s.name && (s.name.toLowerCase() === t || t.indexOf(s.name.toLowerCase()) !== -1); });
  if (station) {
    return { station: station.name, stop: '—' };
  }

  return null;
}

function custBuildPickupAreaStats() {
  var rows = adminScanTicketRows();
  var stations = FleetStore.getStations();
  var stops = FleetStore.getStopStations();

  var matched = {};   // key: "Trạm xe||Điểm dừng" -> count
  var unmatched = {}; // raw text -> count

  rows.forEach(function (r) {
    var text = custPickupLocText(r);
    if (!text) return;
    var hit = custMatchStationHierarchy(text, stations, stops);
    if (hit) {
      var key = hit.station + '||' + hit.stop;
      matched[key] = (matched[key] || 0) + 1;
    } else {
      unmatched[text] = (unmatched[text] || 0) + 1;
    }
  });

  var matchedList = Object.keys(matched).map(function (key) {
    var p = key.split('||');
    return { station: p[0], stop: p[1], count: matched[key] };
  }).sort(function (a, b) { return b.count - a.count; });

  var unmatchedList = Object.keys(unmatched).map(function (text) {
    return { text: text, count: unmatched[text] };
  }).sort(function (a, b) { return b.count - a.count; });

  return { matched: matchedList, unmatched: unmatchedList };
}

/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */
function renderCustomersView() {
  var tab = CUST_TAB;
  var tabBtn = function (key, label) {
    return '<button type="button" class="station-subtab' + (tab === key ? ' active' : '') + '" data-action="setCustomersTab" data-args=\'["' + key + '"]\'>' + esc(label) + '</button>';
  };

  var body;
  if (tab === 'frequent') body = custRenderFrequentTab();
  else if (tab === 'pickup_area') body = custRenderPickupAreaTab();
  else body = custRenderListTab();

  // Tab + thanh tìm kiếm (chỉ tab "Danh sách" có) nằm CHUNG 1 hàng, tìm kiếm ghim sát phải
  // (justify-content:space-between, chỉ 2 phần tử) thay vì xếp chồng 2 hàng như trước.
  $('viewCustomers').innerHTML =
    '<div style="display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:16px;">' +
      '<div class="station-subtabs" style="margin:0;">' +
        tabBtn('list', 'Danh sách khách hàng') +
        tabBtn('frequent', 'Khách thường xuyên') +
        tabBtn('pickup_area', 'Khu vực hay rước khách') +
      '</div>' +
      (tab === 'list' ? custListToolbarHtml() : '') +
    '</div>' +
    body;

  // Thanh tìm kiếm (ô + nút) dài đúng bằng khối 3 tab bên trái — .station-subtabs rộng theo nội dung
  // (fit-content) nên đo width thật lúc render thay vì đoán 1 số cố định.
  var tabsEl = $('viewCustomers').querySelector('.station-subtabs');
  var toolbarEl = $('viewCustomers').querySelector('.sd-toolbar');
  if (tabsEl && toolbarEl) toolbarEl.style.width = tabsEl.offsetWidth + 'px';
}

function custListToolbarHtml() {
  return '<div class="sd-toolbar" style="margin:0;">' +
      '<div class="filter-field sd-field-search" style="flex:1 1 auto; min-width:120px;">' +
        '<label>Tìm kiếm</label>' +
        '<input type="text" id="custSearch" value="' + esc(CUST_FILTERS.list) + '" placeholder="Mã KH, tên, số điện thoại..." data-input-action="custFilterInput" data-args=\'["list","__this_value__"]\'>' +
      '</div>' +
      '<button type="button" class="btn btn-primary" data-action="custSearchClick">Tìm kiếm</button>' +
    '</div>';
}

function setCustomersTab(tab) { CUST_TAB = tab; renderCustomersView(); }
function custFilterInput(field, val) {
  if (!(field in CUST_FILTERS)) return;
  CUST_FILTERS[field] = val || '';
  adminKeepFocus(renderCustomersView);
}
// Nút "Tìm kiếm" cạnh ô lọc (giống admin-trips.js:adminTripSearch) — lọc đã chạy live theo
// data-input-action nên nút này chỉ đọc lại giá trị ô hiện tại rồi render, cho quen thao tác bấm nút.
function custSearchClick() {
  var el = $('custSearch');
  CUST_FILTERS.list = (el && el.value) || '';
  renderCustomersView();
}

function custCardHtml(title, countLabel, tableHtml) {
  return '<div class="sd-blocks"><div class="sd-section-block">' +
    '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
      '<span>' + esc(title) + '</span>' +
      '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + esc(countLabel) + '</span>' +
    '</div>' +
    '<div class="sd-table-wrap">' + tableHtml + '</div>' +
  '</div></div>';
}

function custRenderListTab() {
  var all = custBuildCustomers();
  var kw = CUST_FILTERS.list.toLowerCase();

  var rows = all.filter(function (c) {
    if (!kw) return true;
    var hay = (c.code + ' ' + c.name + ' ' + c.phone).toLowerCase();
    return hay.indexOf(kw) !== -1;
  }).sort(function (a, b) { return a.code.localeCompare(b.code); });

  var rowsHtml = rows.map(function (c, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="font-weight:700; color:var(--black);">' + esc(c.code) + '</td>' +
      '<td style="font-weight:700;">' + esc(c.name || '—') + '</td>' +
      '<td class="mono">' + esc(c.phone) + '</td>' +
      '<td>' + esc(c.firstStop) + '</td>' +
      '<td>' + esc(c.lastStop) + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Mã số khách hàng</th><th>Tên khách hàng</th><th>Số điện thoại</th><th>Điểm đi</th><th>Điểm đến</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có khách hàng nào phù hợp.</p></div>');

  return custCardHtml('Danh sách khách hàng', all.length + ' khách hàng', table);
}

function custRenderFrequentTab() {
  var all = custBuildCustomers().sort(function (a, b) { return b.tripCount - a.tripCount; });

  var rowsHtml = all.map(function (c, idx) {
    var badge = c.tripCount >= 3
      ? '<span class="status-badge dang-ban"><span class="status-dot"></span>Khách thân thiết</span>'
      : '<span class="status-badge chua-chi-dinh"><span class="status-dot"></span>Vãng lai</span>';
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="font-weight:700; color:var(--black);">' + esc(c.code) + '</td>' +
      '<td style="font-weight:700;">' + esc(c.name || '—') + '</td>' +
      '<td class="mono">' + esc(c.phone) + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + c.tripCount + '</td>' +
      '<td>' + esc(c.firstStop) + ' → ' + esc(c.lastStop) + '</td>' +
      '<td>' + badge + '</td>' +
    '</tr>';
  }).join('');

  var table = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Mã KH</th><th>Tên khách hàng</th><th>SĐT</th><th>Số chuyến</th><th>Tuyến quen thuộc</th><th>Phân loại</th></tr></thead>' +
    '<tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>Chưa có dữ liệu chuyến đi nào.</p></div>');

  return custCardHtml('Khách thường xuyên (xếp theo số chuyến đã đi)', all.length + ' khách hàng', table);
}

function custRenderPickupAreaTab() {
  var stats = custBuildPickupAreaStats();

  var matchedRowsHtml = stats.matched.map(function (m, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td>' + esc(m.station) + '</td>' +
      '<td>' + esc(m.stop) + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + m.count + '</td>' +
    '</tr>';
  }).join('');

  var matchedTable = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Trạm xe</th><th>Điểm dừng</th><th>Số lượt rước</th></tr></thead>' +
    '<tbody>' + matchedRowsHtml + '</tbody></table>' +
    (matchedRowsHtml ? '' : '<div class="grid-empty"><p>Chưa có lượt rước khách nào khớp được danh mục trạm.</p></div>');

  var unmatchedRowsHtml = stats.unmatched.map(function (u, idx) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td>' + esc(u.text) + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + u.count + '</td>' +
    '</tr>';
  }).join('');

  var unmatchedTable = '<table class="admin-table">' +
    '<thead><tr><th style="width:50px;">STT</th><th>Địa điểm nhân viên nhập (chưa khớp danh mục trạm)</th><th>Số lượt</th></tr></thead>' +
    '<tbody>' + unmatchedRowsHtml + '</tbody></table>' +
    (unmatchedRowsHtml ? '' : '<div class="grid-empty"><p>Không có địa điểm nào nằm ngoài danh mục.</p></div>');

  return custCardHtml('Khu vực hay rước khách (theo danh mục trạm)', stats.matched.length + ' khu vực', matchedTable) +
    '<div style="height:16px;"></div>' +
    custCardHtml('Chưa khớp danh mục trạm', stats.unmatched.length + ' địa điểm', unmatchedTable);
}
