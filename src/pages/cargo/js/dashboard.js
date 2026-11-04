/* Tổng quan theo trạm: chỉ ĐỌC dữ liệu đơn hàng / phơi trong localStorage, không ghi gì.
   Trạm mặc định = trạm của tài khoản đang đăng nhập (HNAuth.getCurrentStaff().station); chọn trạm khác ở ô chọn trên đầu trang. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return Number(n || 0).toLocaleString('vi-VN') + 'đ'; };
  var read = function (key) { try { var v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };

  // Điểm nhận/gửi con của trạm Sài Gòn (cùng danh sách với STATIONS_BY_REGION.SG ở cargo.js)
  var SG_SUB = ['508 kinh dương vương', '4 tống văn trân', '58 lê đại hành', 'bến xe miền tây'];
  var key = function (n) { return String(n == null ? '' : n).trim().replace(/^(trạm|bến xe)\s+/i, '').toLowerCase(); };

  // Tên điểm (1 trạm hoặc "A, B, C") có thuộc trạm đang xem không
  function inStation(name, station) {
    var want = key(station);
    if (!want) return true;
    return String(name == null ? '' : name).split(',').some(function (part) {
      var k = key(part), raw = part.trim().toLowerCase();
      if (k === want) return true;
      return want === 'sài gòn' && SG_SUB.some(function (s) { return raw.indexOf(s) === 0; });
    });
  }

  function isOverdue(c) {
    if (c.manifestId || (c.status && c.status !== 'pending')) return false;
    if (c.isOverdue) return true;
    if (c.createdTimestamp && (Date.now() - c.createdTimestamp) / 864e5 >= 3) return true;
    var m = String(c.transferTime || c.receiveTime || '').match(/(\d{1,2})[\/-](\d{1,2})/);
    if (m) return (Date.now() - new Date(new Date().getFullYear(), +m[2] - 1, +m[1])) / 864e5 >= 3;
    return false;
  }
  var isDone = function (c) { return c.status === 'delivered' || c.deliveryStatus === 'da-giao'; };
  var isReceivedVehicle = function (m) { return m.status === 'received' || m.statusText === 'Đã nhận xe'; };

  function compute(station) {
    var cargos = read('hueNghia_cargos'), manifests = read('hueNghia_manifests');
    var at = function (n) { return inStation(n, station); };

    var outgoing = cargos.filter(function (c) { return at(c.stationFrom); });                 // đơn nhận tại trạm
    var incoming = cargos.filter(function (c) { return at(c.stationTo); });                   // đơn gửi đến trạm
    var inbound = manifests.filter(function (m) { return at(m.to); });                        // phơi chạy đến trạm
    var outbound = manifests.filter(function (m) { return at(m.from); });                     // phơi xuất bến từ trạm

    var today = new Date();
    var dd = ('0' + today.getDate()).slice(-2) + '/' + ('0' + (today.getMonth() + 1)).slice(-2);
    var receivedToday = outgoing.filter(function (c) { return String(c.transferTime || '').indexOf(dd) !== -1 || String(c.transferTime || '').indexOf('Vừa tạo') !== -1; });

    var waitSend = outgoing.filter(function (c) { return !c.manifestId && c.status !== 'returned' && !isDone(c); });
    var overdue = outgoing.filter(isOverdue);
    var arriving = inbound.filter(function (m) { return !isReceivedVehicle(m); });
    var unreceived = incoming.filter(function (c) { return c.manifestId && !c.isScanned && !isDone(c) && c.status !== 'returned'; });
    var waitDeliver = incoming.filter(function (c) { return c.isScanned && !isDone(c) && c.status !== 'returned' && (c.deliveryStatus || 'cho-giao') !== 'da-hoan'; });
    var delivered = incoming.filter(isDone);
    var codOwed = waitDeliver.reduce(function (s, c) { return s + (Number(c.codAmount) || 0); }, 0);
    var codCollected = delivered.reduce(function (s, c) { return s + (Number(c.codCollected) || 0); }, 0);
    var feeToday = receivedToday.reduce(function (s, c) { return s + (Number(c.fee) || 0); }, 0);

    return { cargos: cargos, outgoing: outgoing, incoming: incoming, inbound: inbound, outbound: outbound, receivedToday: receivedToday, waitSend: waitSend,
      overdue: overdue, arriving: arriving, unreceived: unreceived, waitDeliver: waitDeliver, delivered: delivered, codOwed: codOwed, codCollected: codCollected, feeToday: feeToday };
  }

  var ICON = {
    box: '<path d="m21 8-9 5-9-5"/><path d="m3.3 7 8.7-5 8.7 5v10L12 22l-8.7-5Z"/><path d="M12 13v9"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.8 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/>',
    cash: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><circle cx="12" cy="12" r="2.5"/>'
  };
  var svg = function (n) { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>'; };

  function card(label, value, sub, icon, color, href) {
    return '<a class="rd-stat dash-card" href="' + href + '"><div class="rd-stat-icon rd-' + color + '">' + svg(icon) + '</div>' +
      '<div><span>' + label + '</span><strong>' + value + '</strong><small>' + sub + '</small></div></a>';
  }

  function listRows(items, empty) {
    return items.length ? items.join('') : '<div class="dash-empty">' + empty + '</div>';
  }

  var CAT_LABELS = { goods: 'Hàng hóa', cash: 'Tiền thường', partner_cash: 'Bạn hàng', hot: 'Tiền nóng', baga: 'Baga' };

  // Số đơn nhận mỗi ngày trong 7 ngày gần nhất (đơn chỉ lưu "giờ • dd/mm" hoặc "Vừa tạo" nên đếm theo dd/mm)
  function weekSeries(orders) {
    var days = [], now = new Date();
    for (var i = 6; i >= 0; i--) {
      var dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ key: ('0' + dt.getDate()).slice(-2) + '/' + ('0' + (dt.getMonth() + 1)).slice(-2), n: 0, fee: 0, today: i === 0 });
    }
    orders.forEach(function (c) {
      var t = String(c.transferTime || '');
      var m = t.match(/(\d{1,2})\/(\d{1,2})/);
      var k = m ? ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) : (t.indexOf('Vừa tạo') !== -1 ? days[6].key : '');
      var day = days.filter(function (x) { return x.key === k; })[0];
      if (day) { day.n++; day.fee += Number(c.fee) || 0; }
    });
    return days;
  }

  function columnChart(days, val, fmt, tip) {
    val = val || function (x) { return x.n; }; fmt = fmt || String; tip = tip || function (v) { return v + ' đơn'; };
    var max = Math.max.apply(null, days.map(val).concat([1]));
    return '<div class="bars">' + days.map(function (x) {
      return '<div class="bar-col' + (x.today ? ' is-today' : '') + '" title="' + x.key + ': ' + tip(val(x)) + '">' +
        '<b>' + (val(x) ? fmt(val(x)) : '') + '</b><i style="height:' + Math.round(val(x) / max * 100) + '%"></i><span>' + x.key.slice(0, 5) + '</span></div>';
    }).join('') + '</div>';
  }

  function hBars(rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; }).concat([1]));
    return rows.map(function (r) {
      return '<div class="hbar" title="' + esc(r.label) + ': ' + r.n + ' đơn"><span>' + esc(r.label) + '</span>' +
        '<div><i style="width:' + Math.round(r.n / max * 100) + '%"></i></div><b>' + r.n + '</b></div>';
    }).join('');
  }

  function render() {
    var station = $('dashStation').value;
    var d = compute(station);

    $('dashCards').innerHTML = [
      card('Đơn nhận hôm nay', d.receivedToday.length, 'Cước ' + money(d.feeToday), 'box', 'red', 'cargo.html'),
      card('Chờ chuyển vào phơi', d.waitSend.length, d.overdue.length ? d.overdue.length + ' đơn quá hạn' : 'Không có đơn quá hạn', 'clock', 'amber', 'cargo.html'),
      card('Xe sắp đến trạm', d.arriving.length, d.inbound.length + ' phơi đi tới trạm', 'truck', 'blue', 'manifest.html?tab=receive'),
      card('Chờ giao tại trạm', d.waitDeliver.length, 'COD cần thu ' + money(d.codOwed), 'check', 'green', 'delivery.html'),
      card('Hàng chưa giao', d.unreceived.length, 'Có trong phơi nhưng chưa quét', 'alert', 'red', 'manifest.html?tab=unreceived'),
      card('COD đã thu', money(d.codCollected), d.delivered.length + ' đơn đã giao', 'cash', 'green', 'cod.html')
    ].join('');

    var arrivingRows = d.arriving.slice(0, 5).map(function (m) {
      var n = d.cargos.filter(function (c) { return Number(c.manifestId) === Number(m.id); }).length;
      return '<a class="dash-row" href="manifest.html?tab=receive"><div><strong>' + esc(m.plate) + '</strong><small>' + esc(m.from) + ' ➔ ' + esc(m.to) + '</small></div>' +
        '<div class="dash-right"><b>' + esc(m.time || '—') + '</b><small>' + n + ' đơn hàng</small></div></a>';
    });
    $('dashArriving').innerHTML = listRows(arrivingRows, 'Không có xe nào đang chạy đến trạm này.');

    var todo = [];
    d.overdue.forEach(function (c) { todo.push({ c: c, tag: 'Quá hạn', cls: 'late', href: 'cargo.html?filter=overdue' }); });
    d.unreceived.forEach(function (c) { todo.push({ c: c, tag: 'Chưa nhận từ phơi', cls: 'warn', href: 'manifest.html?tab=unreceived' }); });
    d.waitDeliver.filter(function (c) { return Number(c.codAmount) > 0; }).forEach(function (c) { todo.push({ c: c, tag: 'COD ' + money(c.codAmount), cls: 'info', href: 'delivery.html' }); });
    $('dashTodo').innerHTML = listRows(todo.slice(0, 6).map(function (t) {
      return '<a class="dash-row" href="' + t.href + '"><div><strong>' + esc(t.c.code) + ' · ' + esc((t.c.name || '').replace(/🧳/g, '').trim()) + '</strong>' +
        '<small>' + esc(t.c.stationFrom || '—') + ' ➔ ' + esc(t.c.stationTo || '—') + '</small></div><span class="dash-tag ' + t.cls + '">' + esc(t.tag) + '</span></a>';
    }), 'Không có đơn nào cần xử lý. 🎉');

    var week = weekSeries(d.outgoing);
    $('dashWeek').innerHTML = columnChart(week);
    $('dashWeekTotal').textContent = week.reduce(function (s, x) { return s + x.n; }, 0) + ' đơn';
    // cước theo ngày hiển thị gọn: 1,2tr / 350k
    var short = function (v) { return v >= 1e6 ? (Math.round(v / 1e5) / 10).toString().replace('.', ',') + 'tr' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(v); };
    $('dashFee').innerHTML = columnChart(week, function (x) { return x.fee; }, short, money);
    $('dashFeeTotal').textContent = money(week.reduce(function (s, x) { return s + x.fee; }, 0));

    var counts = {};
    d.outgoing.filter(function (c) { return c.status !== 'returned'; }).forEach(function (c) {
      var k = CAT_LABELS[c.cargoCategory] ? c.cargoCategory : 'goods';
      counts[k] = (counts[k] || 0) + 1;
    });
    var rows = Object.keys(CAT_LABELS).map(function (k) { return { label: CAT_LABELS[k], n: counts[k] || 0 }; });
    var codN = d.outgoing.filter(function (c) { return Number(c.codAmount) > 0; }).length;
    rows.push({ label: 'Đơn COD', n: codN });
    $('dashCats').innerHTML = hBars(rows);
    $('dashCatTotal').textContent = d.outgoing.length + ' đơn';

    $('dashOutbound').textContent = d.outbound.length + ' phơi xuất bến từ trạm';
    $('dashNote').textContent = 'Số liệu theo trạm "' + station + '". Đơn nhận/gửi tính theo trạm gửi, đơn giao/COD tính theo trạm nhận.';
  }

  function init() {
    var staff = window.HNAuth && window.HNAuth.getCurrentStaff ? window.HNAuth.getCurrentStaff() : null;
    var mine = (staff && staff.station) || 'Sài Gòn';
    var names = (window.HueNghiaStations && window.HueNghiaStations.getStations()) || [];
    // trạm của tài khoản luôn có trong danh sách và được chọn sẵn
    if (names.map(key).indexOf(key(mine)) === -1) names = [mine].concat(names);
    var sel = $('dashStation');
    sel.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '"' + (key(n) === key(mine) ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
    sel.addEventListener('change', render);
    window.addEventListener('storage', render);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
