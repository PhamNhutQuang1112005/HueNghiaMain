/**
 * Cấn trừ công nợ giữa các trạm (tab "Cấn trừ giữa các trạm" của cod.html).
 *
 * Nợ gộp x→y suy ra từ đơn hàng (hueNghia_cargos) + sổ điều chỉnh (hueNghia_stationNetting):
 *  - Tiền thường/nóng/bạn hàng gửi từ X đến Y: X thu tiền khách => X nợ Y.
 *  - COD đã giao: Y thu hộ từ người nhận => Y nợ X.
 *  - 'pay'     : from trả to `amount` (giảm nợ from→to).
 *  - 'reroute' : nợ from→to chuyển qua via: from nợ via, via nợ to (via gửi thẳng cho to).
 * Nợ ròng giữa 2 trạm = nợ gộp 2 chiều bù trừ nhau.
 */
(function () {
  'use strict';

  var KEY = 'hueNghia_stationNetting';

  // Gọi fn(loại, trạm nợ, trạm được nợ, số tiền) cho từng đơn: 'cash' tiền thường (gồm bạn hàng), 'hot' tiền nóng, 'cod' thu hộ.
  function eachDebt(cargos, fn) {
    cargos.forEach(function (c) {
      // có số tiền gửi là đơn tiền (đơn cũ có thể lưu nhầm cargoCategory = 'goods')
      if (Number(c.moneyAmount) > 0) fn(c.cargoCategory === 'hot' ? 'hot' : 'cash', c.stationFrom, c.stationTo, Number(c.moneyAmount));
      if (c.status === 'delivered' && Number(c.codAmount) > 0) fn('cod', c.stationTo, c.stationFrom, Number(c.codAmount));
    });
  }

  // Nợ gộp theo từng loại giữa x và y (bỏ y = với mọi trạm): { cash: [x nợ y, y nợ x], hot: [...], cod: [...] }
  function breakdown(cargos, x, y) {
    var b = { cash: [0, 0], hot: [0, 0], cod: [0, 0] };
    eachDebt(cargos, function (kind, debtor, creditor, v) {
      if (debtor === x && (!y || creditor === y)) b[kind][0] += v;
      else if (creditor === x && (!y || debtor === y)) b[kind][1] += v;
    });
    return b;
  }

  function computeDebts(cargos, entries) {
    var d = {};
    function add(x, y, v) {
      if (!x || !y || x === y) return;
      d[x] = d[x] || {};
      d[x][y] = (d[x][y] || 0) + v;
    }
    eachDebt(cargos, function (kind, debtor, creditor, v) { add(debtor, creditor, v); });
    entries.forEach(function (e) {
      add(e.from, e.to, -e.amount);
      if (e.kind === 'reroute') { add(e.from, e.via, e.amount); add(e.via, e.to, e.amount); }
    });
    return d;
  }
  function owe(d, x, y) { return (d[x] && d[x][y]) || 0; }
  // > 0: x nợ y; < 0: y nợ x
  function net(d, x, y) { return owe(d, x, y) - owe(d, y, x); }

  if (typeof module !== 'undefined') module.exports = { computeDebts: computeDebts, net: net, breakdown: breakdown };
  if (typeof document === 'undefined') return;

  // ---------- UI ----------
  var fmt = function (n) { return Number(n).toLocaleString('vi-VN') + 'đ'; };
  var staff = window.HNAuth ? window.HNAuth.getCurrentStaff() : null;
  var ui = { me: (staff && staff.station) || '', other: '', via: '' };
  var KIND_LABEL = { cash: 'Tiền thường', hot: 'Tiền nóng', cod: 'Thu hộ (COD)' };

  function load(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function stationList() { return typeof getStations === 'function' ? getStations() : []; }

  function pairText(a, b, v) {
    return v === 0 ? 'Đã cấn trừ hết' : (v > 0 ? a + ' nợ ' + b : b + ' nợ ' + a) + ' ' + fmt(Math.abs(v));
  }

  // Bảng nợ theo nguồn tiền từ breakdown(...); trả về { total: [trái, phải], html }
  function sourceTable(b, left, right) {
    var tot = [0, 0];
    var rows = ['cash', 'hot', 'cod'].map(function (k) {
      tot[0] += b[k][0]; tot[1] += b[k][1];
      return '<tr><td>' + KIND_LABEL[k] + '</td><td class="r">' + fmt(b[k][0]) + '</td><td class="r">' + fmt(b[k][1]) + '</td></tr>';
    }).join('');
    rows += '<tr class="nt-total"><td>Tổng gộp</td><td class="r">' + fmt(tot[0]) + '</td><td class="r">' + fmt(tot[1]) + '</td></tr>';
    return { total: tot, html: '<table class="nt-table"><thead><tr><th>Nguồn tiền</th><th>' + left + '</th><th>' + right + '</th></tr></thead><tbody>' + rows + '</tbody></table>' };
  }

  function render() {
    var root = document.getElementById('nettingPanel');
    if (!root) return;
    var entries = load(KEY), d = computeDebts(load('hueNghia_cargos'), entries), all = stationList();
    var me = ui.me;
    var cands = all.filter(function (s) { return s !== me; });
    if (cands.indexOf(ui.other) < 0) ui.other = '';
    var other = ui.other;
    if (ui.via === me || ui.via === other) ui.via = '';
    var via = ui.via, cargos = load('hueNghia_cargos');

    var toPay = 0, toGet = 0;
    cands.forEach(function (s) { var v = net(d, me, s); if (v > 0) toPay += v; else toGet -= v; });

    var col1 = '<div class="nt-col"><h3>1. Trạm đang đối soát</h3>' +
      '<select id="ntMe" aria-label="Trạm đang đối soát"><option value="">— Chọn trạm —</option>' +
      all.map(function (s) { return '<option' + (s === me ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      (me ? sourceTable(breakdown(cargos, me), 'Nợ các trạm', 'Các trạm nợ').html : '') +
      '<div class="nt-sum">Phải trả các trạm (sau cấn trừ)<b>' + fmt(toPay) + '</b></div>' +
      '<div class="nt-sum">Được các trạm trả (sau cấn trừ)<b>' + fmt(toGet) + '</b></div></div>';

    var n = 0, body = '<div class="nt-empty">' + (me ? 'Chọn trạm cần đối soát.' : 'Chọn trạm đang đối soát trước.') + '</div>';
    if (me && other) {
      n = net(d, me, other);
      var t = sourceTable(breakdown(cargos, me, other), me + ' nợ ' + other, other + ' nợ ' + me);
      var adj = n - (t.total[0] - t.total[1]);
      body = t.html +
        (adj ? '<div class="nt-adj">Đã trả / chuyển nợ trước đó: ' + (adj > 0 ? '+' : '−') + fmt(Math.abs(adj)) + '</div>' : '') +
        '<div class="nt-net">Nợ ròng: <b>' + pairText(me, other, n) + '</b></div>' +
        (n ? '<div class="nt-actions"><button class="secondary-btn" data-act="pay">Ghi nhận ' + (n > 0 ? 'đã trả' : 'đã nhận') + '</button></div>' : '');
    }
    var col2 = '<div class="nt-col nt-wide"><h3>2. Trạm cần đối soát</h3>' +
      '<select id="ntOther" aria-label="Trạm cần đối soát"><option value="">— Chọn trạm —</option>' +
      cands.map(function (s) {
        var v = me ? net(d, me, s) : 0;
        return '<option value="' + s + '"' + (s === other ? ' selected' : '') + '>' + s + (v ? ' — ' + pairText(me, s, v) : '') + '</option>';
      }).join('') + '</select>' + body + '</div>';

    var viaBody = '<div class="nt-adj">Chọn trạm đối soát và trạm cần đối soát trước.</div>';
    if (me && other) {
      viaBody = !via ? '' :
        '<div class="nt-adj">' + via + '–' + me + ': ' + pairText(via, me, net(d, via, me)) + '</div>' +
        '<div class="nt-adj">' + via + '–' + other + ': ' + pairText(via, other, net(d, via, other)) + '</div>' +
        (n ? '<div class="nt-actions"><button class="secondary-btn" data-act="reroute">Chuyển nợ ' + me + '–' + other + ' qua ' + via + '</button></div>'
           : '<div class="nt-adj">' + me + ' và ' + other + ' không còn nợ ròng để chuyển.</div>');
    }
    var chains = entries.filter(function (e) {
      return e.kind === 'reroute' && (e.from === me || e.to === me || e.via === me);
    }).reverse().map(function (e) {
      return '<div class="nt-chain"><b>' + e.from + ' → ' + e.via + ' → ' + e.to + ': ' + fmt(e.amount) + '</b>' +
        '<div>' + e.from + '–' + e.via + ': ' + pairText(e.from, e.via, net(d, e.from, e.via)) + '</div>' +
        '<div>' + e.via + '–' + e.to + ': ' + pairText(e.via, e.to, net(d, e.via, e.to)) + '</div>' +
        '<small>' + e.time + ' · ' + e.by + '</small></div>';
    }).join('') || '<div class="nt-empty">Chưa có khoản nợ nào chuyển qua trạm trung gian.</div>';
    var col3 = '<div class="nt-col"><h3>3. Trạm trung gian</h3>' +
      '<select id="ntVia" aria-label="Trạm trung gian"><option value="">— Chọn trạm trung gian —</option>' +
      all.filter(function (c) { return c !== me && c !== other; }).map(function (c) {
        return '<option' + (c === via ? ' selected' : '') + '>' + c + '</option>';
      }).join('') + '</select>' + viaBody +
      '<h4 class="nt-sub">Các khoản đã chuyển qua trung gian</h4>' + chains + '</div>';

    root.innerHTML = col1 + col2 + col3;
  }

  function addEntry(e) {
    var list = load(KEY);
    e.id = 'nt-' + Date.now();
    e.time = new Date().toLocaleString('vi-VN');
    e.by = (staff && staff.name) || '';
    list.push(e);
    localStorage.setItem(KEY, JSON.stringify(list));
    render();
  }

  function askAmount(max) {
    var v = Number(String(prompt('Số tiền (tối đa ' + fmt(max) + '):', max) || '').replace(/\D/g, ''));
    return v > 0 && v <= max ? v : (v ? (alert('Số tiền không hợp lệ.'), 0) : 0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var panel = document.getElementById('nettingPanel');
    if (!panel) return;
    panel.addEventListener('change', function (ev) {
      if (ev.target.id === 'ntMe') { ui.me = ev.target.value; render(); }
      if (ev.target.id === 'ntOther') { ui.other = ev.target.value; render(); }
      if (ev.target.id === 'ntVia') { ui.via = ev.target.value; render(); }
    });
    panel.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      var me = ui.me, other = ui.other, d = computeDebts(load('hueNghia_cargos'), load(KEY));
      var n = net(d, me, other), max = Math.abs(n);
      if (!n) return;
      var debtor = n > 0 ? me : other, creditor = n > 0 ? other : me;
      if (btn.dataset.act === 'pay') {
        var amt = askAmount(max);
        if (amt) addEntry({ kind: 'pay', from: debtor, to: creditor, amount: amt });
      } else {
        if (!ui.via) return alert('Chọn trạm trung gian trước.');
        var amt2 = askAmount(max);
        if (amt2) addEntry({ kind: 'reroute', from: debtor, to: creditor, via: ui.via, amount: amt2 });
      }
    });
    render();
  });
})();
