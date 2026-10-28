/* =========================================================
   QUẢN LÝ HÀNG HÓA (Admin) — giám sát, không nhập đơn. 5 tab:
     1. Tổng quan ...... theo loại hàng: Chưa chuyển · Đã chuyển · Đã giao + đơn bất thường.
     2. Đối soát tiền .. các ca Kết ca nhận/giao hàng: chưa giao ca, thừa/thiếu tiền nộp.
     3. Lịch sử xóa .... ai xóa đơn nào, lý do; công tắc khóa sửa/xóa đơn tiền với nhân viên.
     4. Theo nhân viên . số đơn nhận / chuyển / giao / xóa và cước đã thu của từng người.
     5. Cấu hình ....... ngưỡng "quá hạn" + lối tắt sang Quản lý giá, Trạm xe.
   Nguồn dữ liệu (localStorage, cùng khoá với các trang Nhận/Giao hàng, Kết ca):
     hueNghia_cargos · hueNghia_receive_shift_reports · hueNghia_delivery_shift_reports ·
     cargo_deletion_history. Công tắc khóa: hueNghia_cargoLockMoney ('1' = khóa).
   ========================================================= */

var CARGO_ADMIN_TAB = 'overview';
var CARGO_ADMIN_CATS = [
  { key: 'goods', label: 'Hàng hóa' },
  { key: 'cash', label: 'Tiền thường' },
  { key: 'partner_cash', label: 'Bạn hàng gửi tiền' },
  { key: 'hot', label: 'Tiền nóng' },
  { key: 'baga', label: 'Baga' }
];

function cgCat(c) { return c.cargoCategory || 'goods'; }
function cgIsMoney(c) { var k = cgCat(c); return k === 'cash' || k === 'hot' || k === 'partner_cash'; }
function cgDelivered(c) { return c.deliveryStatus === 'da-giao' || c.status === 'delivered'; }
function cgTransferred(c) { return c.manifestId != null || c.status === 'in-transit' || !!c.moneyTransferred; }
// 'pending' (chưa chuyển) → 'transit' (đã chuyển) → 'done' (đã giao).
function cgState(c) { return cgDelivered(c) ? 'done' : (cgTransferred(c) ? 'transit' : 'pending'); }
function cgAgeDays(c) {
  var t = c.createdTimestamp || c.transferredAt;
  return t ? Math.floor((Date.now() - t) / 86400000) : null;
}
function cgMoney(n) { return Number(n || 0).toLocaleString('vi-VN') + 'đ'; }
function cgSigned(n) { return (n > 0 ? '+' : '') + Number(n).toLocaleString('vi-VN') + 'đ'; }
function cgDateTime(ts) {
  if (!ts) return '—';
  var d = new Date(ts);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function cgOldDays() {
  var n = Number(lsRead('hueNghia_cargoOverdueDays', 3));
  return n > 0 ? n : 3;
}
function cgLockOn() { return lsRead('hueNghia_cargoLockMoney', '0') === '1' || lsRead('hueNghia_cargoLockMoney', 0) === 1; }
function cgList(key) { var v = lsRead(key, []); return Array.isArray(v) ? v : []; }

/* ---------- dựng bảng / thẻ dùng chung ---------- */
function cgTable(head, rowsHtml, emptyText) {
  return '<table class="admin-table"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
    (rowsHtml ? '' : '<div class="grid-empty"><p>' + esc(emptyText) + '</p></div>');
}
function cgBlock(title, countLabel, inner) {
  return '<div class="sd-blocks"><div class="sd-section-block">' +
    '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
      '<span>' + esc(title) + '</span>' +
      '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + esc(countLabel) + '</span>' +
    '</div><div class="sd-table-wrap">' + inner + '</div></div></div>';
}
function cgKpis(items) {   // items: [[label, value, 'bad'?]]
  return '<div class="cg-grid">' + items.map(function (k) {
    return '<div class="cg-card"><div class="cg-card-title">' + esc(k[0]) + '</div>' +
      '<div class="cg-card-total' + (k[2] ? ' cg-bad' : '') + '">' + k[1] + '</div></div>';
  }).join('') + '</div>';
}
function cgBadge(text, bad) { return '<span class="badge ' + (bad ? 'badge-off' : 'badge-on') + '">' + esc(text) + '</span>'; }

/* ---------- 1. TỔNG QUAN ---------- */
function cargoAdminOverview(list) {
  var cards = CARGO_ADMIN_CATS.map(function (cat) {
    var r = { pending: 0, transit: 0, done: 0 };
    list.forEach(function (c) { if (cgCat(c) === cat.key) r[cgState(c)]++; });
    return '<div class="cg-card">' +
      '<div class="cg-card-title">' + esc(cat.label) + '</div>' +
      '<div class="cg-card-total">' + (r.pending + r.transit + r.done) + '<span> đơn</span></div>' +
      '<div class="cg-card-split">' +
        '<span><b>' + r.pending + '</b>Chưa chuyển</span>' +
        '<span><b>' + r.transit + '</b>Đã chuyển</span>' +
        '<span><b>' + r.done + '</b>Đã giao</span>' +
      '</div></div>';
  }).join('');
  return '<div class="cg-grid">' + cards + '</div>';
}

// Trả về [{c, issue, level}] — 1 đơn có thể dính nhiều vấn đề, mỗi vấn đề 1 dòng.
function cargoAdminIssues(list) {
  var days = cgOldDays(), out = [];
  list.forEach(function (c) {
    var age = cgAgeDays(c), old = age != null && age >= days, st = cgState(c);
    if (st === 'pending' && (old || c.isOverdue)) out.push({ c: c, issue: 'Tồn quá ' + days + ' ngày chưa chuyển', level: 'high' });
    if (st === 'transit' && cgIsMoney(c)) out.push({ c: c, issue: 'Tiền đã chuyển, chưa giao', level: old ? 'high' : 'mid' });
    else if (st === 'transit' && old) out.push({ c: c, issue: 'Đã chuyển quá ' + days + ' ngày chưa giao', level: 'high' });
    if (st === 'done' && c.paymentStatus === 'unpaid') out.push({ c: c, issue: 'Đã giao nhưng chưa thu cước', level: 'mid' });
  });
  return out.sort(function (a, b) { return (a.level === 'high' ? 0 : 1) - (b.level === 'high' ? 0 : 1); });
}

function cargoAdminTabOverview(list) {
  var catLabel = {}, issues = cargoAdminIssues(list);
  CARGO_ADMIN_CATS.forEach(function (c) { catLabel[c.key] = c.label; });
  var rows = issues.map(function (it, idx) {
    var c = it.c, age = cgAgeDays(c);
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td class="mono" style="font-weight:700;">' + esc(c.code || '—') + '</td>' +
      '<td><div style="font-weight:700;">' + esc((c.name || '').replace(/🧳/g, '').trim() || '—') + '</div>' +
        '<div class="cell-sub">' + esc(catLabel[cgCat(c)] || '') + '</div></td>' +
      '<td>' + esc(c.sender || '—') + ' ➔ ' + esc(c.receiver || '—') + '</td>' +
      '<td>' + esc(c.stationFrom || '—') + ' ➔ ' + esc(c.stationTo || '—') + '</td>' +
      '<td class="mono" style="text-align:right;">' + cgMoney(c.fee) + '</td>' +
      '<td style="text-align:center;">' + (age == null ? '—' : age + ' ngày') + '</td>' +
      '<td>' + cgBadge(it.issue, it.level === 'high') + '</td>' +
    '</tr>';
  }).join('');
  return cargoAdminOverview(list) +
    cgBlock('Đơn bất thường', issues.length + ' vấn đề',
      cgTable(['STT', 'Mã đơn', 'Hàng hóa', 'Người gửi ➔ nhận', 'Tuyến', 'Cước', 'Tuổi đơn', 'Vấn đề'], rows, 'Không có đơn bất thường.'));
}

/* ---------- 2. ĐỐI SOÁT TIỀN (ca Kết ca) ---------- */
function cargoAdminShifts() {
  var out = [];
  cgList('hueNghia_receive_shift_reports').forEach(function (s) {
    out.push({ kind: 'Nhận hàng', s: s, submitted: s.submittedCash });
  });
  cgList('hueNghia_delivery_shift_reports').forEach(function (s) {
    out.push({ kind: 'Giao hàng', s: s, submitted: s.submittedAmount });
  });
  return out.sort(function (a, b) { return new Date(b.s.startTime) - new Date(a.s.startTime); });
}
function cargoAdminTabReconcile() {
  var shifts = cargoAdminShifts(), DAY = 86400000, now = Date.now();
  var unhanded = 0, mismatch = 0, sumDiff = 0;
  var rows = shifts.map(function (x, i) {
    var s = x.s, started = new Date(s.startTime).getTime(), flags = [];
    var hasExpected = s.expectedCash != null;
    var diff = hasExpected && x.submitted != null ? Number(s.diff != null ? s.diff : x.submitted - s.expectedCash) : null;
    if (!s.isHandedOver) {
      if (s.endTime || (started && now - started >= DAY)) { unhanded++; flags.push(cgBadge('Chưa giao ca', true)); }
      else flags.push(cgBadge('Đang mở ca', false));
    } else if (diff == null) {
      flags.push('<span class="cell-sub">Chưa có số đối soát (lưu lại ca để chốt)</span>');
    } else if (diff !== 0) {
      mismatch++; sumDiff += diff;
      flags.push(cgBadge((diff < 0 ? 'Thiếu ' : 'Thừa ') + cgMoney(Math.abs(diff)), true));
    } else flags.push(cgBadge('Khớp', false));
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (i + 1) + '</td>' +
      '<td>' + esc(x.kind) + '</td>' +
      '<td><div style="font-weight:700;">' + esc(s.staffName || '—') + '</div><div class="cell-sub">' + esc(s.staffCode || '') + ' · ' + esc(s.station || '') + '</div></td>' +
      '<td>' + cgDateTime(started) + '</td>' +
      '<td class="mono" style="text-align:right;">' + (hasExpected ? cgMoney(s.expectedCash) : '—') + '</td>' +
      '<td class="mono" style="text-align:right;">' + (x.submitted != null ? cgMoney(x.submitted) : '—') + '</td>' +
      '<td class="mono" style="text-align:right; font-weight:800;' + (diff ? ' color:var(--red);' : '') + '">' + (diff == null ? '—' : cgSigned(diff)) + '</td>' +
      '<td>' + flags.join(' ') + '</td>' +
    '</tr>';
  }).join('');
  return cgKpis([
      ['Tổng số ca', shifts.length],
      ['Ca chưa giao ca', unhanded, unhanded > 0],
      ['Ca lệch tiền', mismatch, mismatch > 0],
      ['Tổng thừa / thiếu', cgSigned(sumDiff), sumDiff !== 0]
    ]) +
    cgBlock('Đối soát ca thu ngân', shifts.length + ' ca',
      cgTable(['STT', 'Loại ca', 'Nhân viên', 'Bắt đầu', 'Tiền mặt cần nộp', 'Đã nộp', 'Thừa / thiếu', 'Kết quả'], rows, 'Chưa có ca nào trong Kết ca.'));
}

/* ---------- 3. LỊCH SỬ XÓA + KHÓA ---------- */
function cargoAdminTabDeletes() {
  var hist = cgList('cargo_deletion_history'), by = {};
  hist.forEach(function (h) {
    var k = h.deletedBy || '—';
    by[k] = by[k] || { n: 0, fee: 0 };
    by[k].n++; by[k].fee += Number(h.fee || 0);
  });
  var summary = Object.keys(by).sort(function (a, b) { return by[b].n - by[a].n; }).map(function (k) {
    return '<tr><td style="font-weight:700;">' + esc(k) + '</td><td style="text-align:center;" class="mono">' + by[k].n + '</td>' +
      '<td class="mono" style="text-align:right;">' + cgMoney(by[k].fee) + '</td></tr>';
  }).join('');
  var rows = hist.map(function (h, i) {
    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (i + 1) + '</td>' +
      '<td>' + esc(h.deletedAt || '—') + '</td>' +
      '<td class="mono" style="font-weight:700;">' + esc(h.code || '—') + '</td>' +
      '<td>' + esc((h.name || '').replace(/🧳/g, '').trim() || '—') + '</td>' +
      '<td>' + esc(h.sender || '—') + ' ➔ ' + esc(h.receiver || '—') + '</td>' +
      '<td class="mono" style="text-align:right;">' + cgMoney(h.fee) + '</td>' +
      '<td>' + esc(h.deletedBy || '—') + '</td>' +
      '<td>' + esc(h.reason || '—') + '</td>' +
    '</tr>';
  }).join('');
  var on = cgLockOn();
  var lock = '<div class="cg-card" style="margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">' +
    '<div><div class="cg-card-title">Khóa sửa / xóa đơn tiền</div>' +
    '<div class="cell-sub" style="margin-top:4px;">' + (on ? 'Đang BẬT — nhân viên không sửa hoặc xóa được đơn tiền thường, tiền nóng, bạn hàng. Admin vẫn thao tác được.'
                                                          : 'Đang TẮT — nhân viên tự sửa / xóa đơn tiền (xóa phải nhập lý do).') + '</div></div>' +
    '<button type="button" class="btn ' + (on ? '' : 'btn-primary ') + 'btn-sm" data-action="toggleCargoLockMoney">' + (on ? 'Tắt khóa' : 'Bật khóa') + '</button>' +
  '</div>';
  return lock +
    cgBlock('Tổng hợp theo nhân viên', Object.keys(by).length + ' người', cgTable(['Nhân viên', 'Số đơn đã xóa', 'Tổng cước'], summary, 'Chưa có đơn nào bị xóa.')) +
    cgBlock('Lịch sử xóa chi tiết', hist.length + ' đơn', cgTable(['STT', 'Thời gian', 'Mã đơn', 'Hàng hóa', 'Người gửi ➔ nhận', 'Cước', 'Người xóa', 'Lý do'], rows, 'Chưa có đơn nào bị xóa.'));
}
function toggleCargoLockMoney() {
  try { localStorage.setItem('hueNghia_cargoLockMoney', cgLockOn() ? '0' : '1'); } catch (e) {}
  showToast(cgLockOn() ? 'Đã bật khóa sửa/xóa đơn tiền' : 'Đã tắt khóa sửa/xóa đơn tiền');
  renderCargoAdminView();
}

/* ---------- 4. THEO NHÂN VIÊN ---------- */
function cargoAdminTabStaff(list) {
  var by = {};
  function row(name) { name = String(name || '').trim(); if (!name) return null; return by[name] = by[name] || { recv: 0, transfer: 0, deliver: 0, del: 0, fee: 0 }; }
  list.forEach(function (c) {
    var r;
    if ((r = row(c.staff))) { r.recv++; if (c.paymentStatus === 'paid' || c.isPaid) r.fee += Number(c.fee || 0); }
    if ((r = row(c.transferredBy))) r.transfer++;
    if ((r = row(c.deliveredBy))) r.deliver++;
  });
  cgList('cargo_deletion_history').forEach(function (h) { var r = row(h.deletedBy); if (r) r.del++; });
  var names = Object.keys(by).sort(function (a, b) { return by[b].recv - by[a].recv; });
  var rows = names.map(function (n, i) {
    var r = by[n];
    return '<tr><td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (i + 1) + '</td>' +
      '<td style="font-weight:700;">' + esc(n) + '</td>' +
      '<td class="mono" style="text-align:center;">' + r.recv + '</td>' +
      '<td class="mono" style="text-align:center;">' + r.transfer + '</td>' +
      '<td class="mono" style="text-align:center;">' + r.deliver + '</td>' +
      '<td class="mono" style="text-align:center;' + (r.del ? ' color:var(--red); font-weight:800;' : '') + '">' + r.del + '</td>' +
      '<td class="mono" style="text-align:right;">' + cgMoney(r.fee) + '</td></tr>';
  }).join('');
  return cgBlock('Hiệu suất theo nhân viên', names.length + ' người',
    cgTable(['STT', 'Nhân viên', 'Đơn nhận', 'Đơn chuyển', 'Đơn giao', 'Đơn xóa', 'Cước đã thu'], rows, 'Chưa có dữ liệu nhân viên.')) +
    '<div class="hint-inline" style="margin-top:10px;">Đơn nhận = người nhập đơn. Cước đã thu chỉ tính đơn đã thanh toán tại lúc nhận.</div>';
}

/* ---------- 5. CẤU HÌNH ---------- */
function cargoAdminTabConfig() {
  var link = function (title, sub, view) {
    return '<div class="cg-card"><div class="cg-card-title">' + esc(title) + '</div>' +
      '<div class="cell-sub" style="margin:6px 0 12px;">' + esc(sub) + '</div>' +
      '<button type="button" class="btn btn-sm" data-action="switchAdminView" data-args=\'["' + view + '"]\'>Mở</button></div>';
  };
  return '<div class="cg-card" style="margin-bottom:16px;">' +
      '<div class="cg-card-title">Ngưỡng đơn quá hạn</div>' +
      '<div class="cell-sub" style="margin:6px 0 12px;">Đơn chưa chuyển / chưa giao quá số ngày này sẽ hiện ở "Đơn bất thường".</div>' +
      '<div style="display:flex; gap:8px; align-items:center;">' +
        '<input id="cargoAdminDays" type="number" min="1" max="60" value="' + cgOldDays() + '" style="width:90px; height:34px; padding:0 10px; border:1px solid var(--border,#cbd5e1); border-radius:8px;" /> <span class="cg-unit">ngày</span> ' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="saveCargoAdminDays">Lưu</button>' +
      '</div></div>' +
    '<div class="cg-grid">' +
      link('Bảng giá cước', 'Giá cước vận chuyển theo tuyến.', 'viewPricing') +
      link('Trạm xe', 'Danh sách trạm gửi / nhận hàng.', 'viewStations') +
      link('Nhân viên', 'Tài khoản và quyền nhân viên.', 'viewStaff') +
    '</div>';
}
function saveCargoAdminDays() {
  var n = parseInt(($('cargoAdminDays') || {}).value, 10);
  if (!(n >= 1 && n <= 60)) { showToast('Nhập số ngày từ 1 đến 60.'); return; }
  try { localStorage.setItem('hueNghia_cargoOverdueDays', String(n)); } catch (e) {}
  showToast('Đã lưu ngưỡng quá hạn: ' + n + ' ngày');
  renderCargoAdminView();
}

/* ---------- RENDER ---------- */
function setCargoAdminTab(tab) { CARGO_ADMIN_TAB = tab; renderCargoAdminView(); }

function renderCargoAdminView() {
  var list = cgList('hueNghia_cargos').filter(function (c) { return c && c.status !== 'returned'; });
  var tabs = [['overview', 'Tổng quan'], ['reconcile', 'Đối soát tiền'], ['deletes', 'Lịch sử xóa'], ['staff', 'Theo nhân viên'], ['config', 'Cấu hình']];
  var body = {
    overview: function () { return cargoAdminTabOverview(list); },
    reconcile: cargoAdminTabReconcile,
    deletes: cargoAdminTabDeletes,
    staff: function () { return cargoAdminTabStaff(list); },
    config: cargoAdminTabConfig
  }[CARGO_ADMIN_TAB] || function () { return cargoAdminTabOverview(list); };

  $('viewCargoAdmin').innerHTML =
    '<div class="cg-toolbar">' +
      '<div><h3 class="cg-title">Quản lý hàng hóa</h3>' +
      '<div class="cell-sub">' + list.length + ' đơn trong hệ thống · dữ liệu lấy từ trang Nhận hàng / Giao hàng / Kết ca</div></div>' +
      '<div style="display:flex; gap:8px;">' +
        '<button type="button" class="btn btn-sm" data-action="setCargoAdminTab" data-args=\'["' + CARGO_ADMIN_TAB + '"]\'>Làm mới</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="adminGoToCargo">Mở Giao nhận hàng</button>' +
      '</div>' +
    '</div>' +
    '<div class="station-subtabs">' + tabs.map(function (t) {
      return '<button type="button" class="station-subtab' + (CARGO_ADMIN_TAB === t[0] ? ' active' : '') + '" data-action="setCargoAdminTab" data-args=\'["' + t[0] + '"]\'>' + esc(t[1]) + '</button>';
    }).join('') + '</div>' +
    body();
}
