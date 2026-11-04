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
  // adj (tuỳ chọn) = [điều chỉnh cột trái, cột phải] do đã trả / chuyển nợ, hiện thành 1 dòng trừ vào tổng.
  // base (tuỳ chọn) = [nợ ròng trái, phải] sau khi bù trừ từng cặp trạm → thêm dòng "Bù trừ hai chiều".
  function sourceTable(b, left, right, adj, base) {
    var tot = [0, 0];
    var rows = ['cash', 'hot', 'cod'].map(function (k) {
      tot[0] += b[k][0]; tot[1] += b[k][1];
      return '<tr><td>' + KIND_LABEL[k] + '</td><td class="r">' + fmt(b[k][0]) + '</td><td class="r">' + fmt(b[k][1]) + '</td></tr>';
    }).join('');
    var sh = function (v) { return (v < 0 ? '−' : '') + fmt(Math.abs(v)); }, label = 'Tổng gộp';
    var off = base ? [base[0] - tot[0], base[1] - tot[1]] : [0, 0];
    if (off[0] || off[1]) {
      label = 'Còn lại';
      rows += '<tr><td>Bù trừ hai chiều</td><td class="r">' + sh(off[0]) + '</td><td class="r">' + sh(off[1]) + '</td></tr>';
      tot = [tot[0] + off[0], tot[1] + off[1]];
    }
    if (adj && (adj[0] || adj[1])) {
      label = 'Còn lại';
      rows += '<tr><td>Đã trả / chuyển nợ</td><td class="r">' + sh(adj[0]) + '</td><td class="r">' + sh(adj[1]) + '</td></tr>';
      tot = [tot[0] + adj[0], tot[1] + adj[1]];
    }
    rows += '<tr class="nt-total"><td>' + label + '</td><td class="r">' + fmt(tot[0]) + '</td><td class="r">' + fmt(tot[1]) + '</td></tr>';
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

    var toPay = 0, toGet = 0, totalDebt = 0, totalGet0 = 0, d0 = computeDebts(cargos, []);
    var perStation = '';
    cands.forEach(function (s) {
      var v = net(d, me, s); if (v > 0) toPay += v; else toGet -= v;
      var v0 = net(d0, me, s); if (v0 > 0) totalDebt += v0; else totalGet0 -= v0; // nợ ròng gốc khi chưa trả / chuyển nợ
      if (!v0 && !v) return;
      var mine = (v0 || v) > 0, a0 = Math.abs(v0), a = Math.abs(v);
      perStation += '<tr><td>' + s + (mine ? '' : ' <small>(nợ mình)</small>') + '</td><td class="r">' + fmt(a0) + '</td><td class="r">' + fmt(Math.max(a0 - a, 0)) + '</td><td class="r">' + fmt(a) + '</td></tr>';
    });
    if (perStation) perStation = '<table class="nt-table"><thead><tr><th>Trạm</th><th>Tổng nợ</th><th>Đã trả</th><th>Thiếu</th></tr></thead><tbody>' + perStation + '</tbody></table>';

    var ICO_CHEV = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
    var stationSelect = function (id, label, placeholder, list, current, withDebt) {
      return '<label class="ntx-field"><span>Chọn trạm</span><select id="' + id + '" aria-label="' + label + '"><option value="">' + placeholder + '</option>' +
        list.map(function (st) {
          var v = withDebt && me ? net(d, me, st) : 0;
          return '<option value="' + st + '"' + (st === current ? ' selected' : '') + '>' + st + (v ? ' — ' + pairText(me, st, v) : '') + '</option>';
        }).join('') + '</select></label>';
    };
    var stepHead = function (num, title, sub, cls) {
      return '<div class="ntx-step-head"><span class="ntx-num ' + cls + '">' + num + '</span><div><strong>' + title + '</strong><small>' + sub + '</small></div></div>';
    };

    // Tổng các khoản đã chuyển qua trạm trung gian liên quan trạm đang đối soát
    var rerouted = entries.filter(function (e) {
      return e.kind === 'reroute' && (e.from === me || e.to === me || e.via === me);
    }).reduce(function (sum, e) { return sum + Number(e.amount || 0); }, 0);
    var paid = Math.max(totalDebt - toPay, 0);

    var stats = '<div class="ntx-stats">' +
      '<div class="ntx-stat"><span>Tổng công nợ</span><strong>' + fmt(totalDebt) + '</strong><small>' + (me ? 'Giữa ' + cands.length + ' chi nhánh đang chọn' : 'Chọn trạm đang đối soát') + '</small></div>' +
      '<div class="ntx-stat ntx-green"><span>Đã thanh toán</span><strong>' + fmt(paid) + '</strong><small>' + (paid ? 'Đã trả / cấn trừ' : 'Chưa có khoản trả trong kỳ') + '</small></div>' +
      '<div class="ntx-stat ntx-red"><span>Còn phải trả</span><strong>' + fmt(toPay) + '</strong><small>Cần hoàn tất đối soát</small></div>' +
      '<div class="ntx-stat"><span>Qua trạm trung gian</span><strong>' + fmt(rerouted) + '</strong><small>' + (rerouted ? 'Đã chuyển tiếp công nợ' : 'Không có khoản chuyển tiếp') + '</small></div></div>';

    var perStationBlock = perStation ? '<div class="ntx-scroll">' + perStation + '</div>' : '';
    var step1 = '<div class="ntx-card">' + stepHead(1, 'Trạm đang đối soát', 'Chi nhánh nguồn', 'ntx-dark') +
      stationSelect('ntMe', 'Trạm đang đối soát', '— Chọn trạm —', all, me, false) +
      '<div class="ntx-tile"><span>Công nợ với các trạm</span><strong>' + fmt(totalDebt) + '</strong>' +
      '<div class="ntx-tile-foot"><span>Được các trạm trả (sau cấn trừ)</span><b>' + fmt(toGet) + '</b></div></div>' +
      (me ? '<details class="ntx-more"><summary>Xem nợ theo nguồn tiền và từng trạm</summary><div class="ntx-scroll">' + sourceTable(breakdown(cargos, me), 'Nợ các trạm', 'Các trạm nợ', [toPay - totalDebt, toGet - totalGet0], [totalDebt, totalGet0]).html + '</div>' + perStationBlock + '</details>' : '') + '</div>';

    var n = 0;
    if (me && other) n = net(d, me, other);
    var tile2 = !(me && other)
      ? '<div class="ntx-empty">' + (me ? 'Chọn trạm cần đối soát.' : 'Chọn trạm đang đối soát trước.') + '</div>'
      : '<div class="ntx-tile ' + (n ? 'ntx-tile-red' : '') + '"><span>Nợ ròng cần thanh toán</span><strong>' + (n ? fmt(Math.abs(n)) : '0đ') + '</strong>' +
        '<div class="ntx-tile-foot"><span>' + (n ? (n > 0 ? me : other) + ' nợ' : 'Đã cấn trừ hết') + '</span><b>' + (n ? (n > 0 ? other : me) : '') + '</b></div></div>';
    var step2 = '<div class="ntx-card">' + stepHead(2, 'Trạm cần đối soát', 'Chi nhánh nhận công nợ', 'ntx-red') +
      stationSelect('ntOther', 'Trạm cần đối soát', '— Chọn trạm —', cands, other, true) + tile2 + '</div>';

    var viaBody = '<div class="ntx-empty">Chọn trạm đối soát và trạm cần đối soát trước.</div>';
    if (me && other) {
      viaBody = !via ? '' :
        '<div class="nt-adj">' + via + '–' + me + ': ' + pairText(via, me, net(d, via, me)) + '</div>' +
        '<div class="nt-adj">' + via + '–' + other + ': ' + pairText(via, other, net(d, via, other)) + '</div>' +
        (n ? '' : '<div class="nt-adj">' + me + ' và ' + other + ' không còn nợ ròng để chuyển.</div>');
    }
    var chains = entries.filter(function (e) {
      return e.kind === 'reroute' && (e.from === me || e.to === me || e.via === me);
    }).reverse().map(function (e) {
      return '<div class="nt-chain"><b>' + e.from + ' → ' + e.via + ' → ' + e.to + ': ' + fmt(e.amount) + '</b>' +
        '<div>' + e.from + '–' + e.via + ': ' + pairText(e.from, e.via, net(d, e.from, e.via)) + '</div>' +
        '<div>' + e.via + '–' + e.to + ': ' + pairText(e.via, e.to, net(d, e.via, e.to)) + '</div>' +
        '<small>' + e.time + ' · ' + e.by + '</small></div>';
    }).join('') || '<div class="ntx-empty">Chưa có khoản nợ nào chuyển qua trạm trung gian.</div>';
    var step3 = '<div class="ntx-card">' + stepHead(3, 'Trạm trung gian', 'Chuyển tiếp công nợ', 'ntx-light') +
      stationSelect('ntVia', 'Trạm trung gian', '— Chọn trạm trung gian —', all.filter(function (c) { return c !== me && c !== other; }), via, false) +
      viaBody + '<details class="ntx-more"><summary>Các khoản đã chuyển qua trung gian</summary>' + chains + '</details></div>';

    var steps = '<div class="ntx-steps">' + step1 +
      '<div class="ntx-link"><span>Đối soát</span>' + ICO_CHEV + '</div>' + step2 +
      '<div class="ntx-link ntx-link-dim"><span>Tùy chọn</span>' + ICO_CHEV + '</div>' + step3 + '</div>';

    // Chi tiết công nợ giữa 2 trạm (bảng nguồn tiền + hành động) — chỉ hiện khi đã chọn đủ 2 trạm
    var detail = '';
    if (me && other) {
      var bk = breakdown(cargos, me, other), tot = [0, 0];
      var rowsHtml = ['cash', 'hot', 'cod'].map(function (k) {
        var l = bk[k][0], r = bk[k][1], diff = l - r;
        tot[0] += l; tot[1] += r;
        return '<tr><td><b class="ntx-src">' + KIND_LABEL[k] + '</b></td><td>' + fmt(l) + '</td><td>' + fmt(r) + '</td><td><b>' + fmt(Math.abs(diff)) + '</b></td>' +
          '<td><span class="ntx-pill ' + (diff ? 'ntx-pill-wait' : 'ntx-pill-ok') + '">' + (diff ? 'Chờ thanh toán' : 'Đã cân bằng') + '</span></td></tr>';
      }).join('');
      var adjD = n - (tot[0] - tot[1]);
      detail = '<div class="ntx-detail"><div class="ntx-detail-head"><div><strong>Chi tiết công nợ</strong><small>Đối chiếu theo từng nguồn tiền</small></div></div>' +
        '<div class="ntx-scroll"><table class="ntx-table"><thead><tr><th>Nguồn tiền</th><th>' + me + ' nợ ' + other + '</th><th>' + other + ' nợ ' + me + '</th><th>Chênh lệch</th><th>Trạng thái</th></tr></thead><tbody>' + rowsHtml +
        '<tr class="ntx-total"><td>Tổng cộng</td><td>' + fmt(tot[0]) + '</td><td>' + fmt(tot[1]) + '</td><td>' + fmt(Math.abs(tot[0] - tot[1])) + '</td><td></td></tr></tbody></table></div>' +
        (adjD ? '<div class="nt-adj ntx-adj">Đã trả / chuyển nợ trước đó: ' + (adjD > 0 ? '+' : '−') + fmt(Math.abs(adjD)) + '</div>' : '') +
        '<div class="ntx-foot"><div><span>Số tiền cần đối soát</span><strong>' + fmt(Math.abs(n)) + '</strong><small>' + pairText(me, other, n) + '</small></div>' +
        (n ? '<div class="nt-actions"><button class="secondary-btn" data-act="pay">Ghi nhận ' + (n > 0 ? 'đã trả' : 'đã nhận') + '</button>' +
          '<button class="primary-btn" data-act="reroute">Chuyển nợ qua ' + (via || 'trạm trung gian') + '</button></div>' : '') + '</div></div>';
    }

    // Bảng cuối trang: các trạm đang thiếu trạm đang đứng bao nhiêu / trạm đang đứng nợ các trạm khác bao nhiêu
    // (nợ ròng từng cặp, đã bù trừ hai chiều và trừ khoản đã trả/chuyển nợ — cùng cách tính với cột "Thiếu" ở trên).
    var board = '';
    if (me) {
      var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
      var list = [], sumGet = 0, sumPay = 0;
      cands.forEach(function (s) {
        var v = net(d, me, s);
        if (!v) return;
        var theyOwe = v < 0 ? -v : 0, iOwe = v > 0 ? v : 0;
        sumGet += theyOwe; sumPay += iOwe;
        list.push({ s: s, theyOwe: theyOwe, iOwe: iOwe });
      });
      list.sort(function (a, b) { return Math.max(b.theyOwe, b.iOwe) - Math.max(a.theyOwe, a.iOwe); });
      var body = list.map(function (r) {
        return '<tr class="ntx-pick" data-pick="' + esc(r.s) + '" title="Bấm để đối soát với ' + esc(r.s) + '"><td><b class="ntx-src">' + esc(r.s) + '</b></td>' +
          '<td class="ntx-get">' + (r.theyOwe ? fmt(r.theyOwe) : '—') + '</td><td class="ntx-pay">' + (r.iOwe ? fmt(r.iOwe) : '—') + '</td></tr>';
      }).join('');
      board = '<div class="ntx-detail ntx-board"><div class="ntx-detail-head"><div><strong>Công nợ với các trạm khác</strong>' +
        '<small>Nợ ròng giữa ' + esc(me) + ' và từng trạm (đã bù trừ hai chiều, đã trừ khoản đã trả) · bấm một dòng để đối soát</small></div></div>' +
        (list.length
          ? '<div class="ntx-scroll"><table class="ntx-table"><thead><tr><th>Trạm</th><th>Trạm đang thiếu ' + esc(me) + '</th><th>' + esc(me) + ' đang nợ trạm</th></tr></thead><tbody>' + body +
            '<tr class="ntx-total"><td>Tổng cộng</td><td class="ntx-get">' + fmt(sumGet) + '</td><td class="ntx-pay">' + fmt(sumPay) + '</td></tr></tbody></table></div>'
          : '<div class="ntx-empty" style="margin:16px 24px 20px;">' + esc(me) + ' không còn công nợ với trạm nào.</div>') + '</div>';
    }

    root.innerHTML = stats + steps + detail + board;
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
      var pick = ev.target.closest('tr[data-pick]');
      if (pick) { ui.other = pick.dataset.pick; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
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
