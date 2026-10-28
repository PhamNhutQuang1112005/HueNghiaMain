/* =========================================================
   ĐẠI LÝ (Admin) — 2 view trong nhóm "Đại lý":
     1. Thiết lập đại lý — CRUD danh sách đại lý (AgentStore, shared/js/agent-store.js). Đại lý này hiện ở
        ô "Đại lý" (tick cạnh "Đặt cọc") trong panel Đặt vé/Bán vé của TicketStaff.
     2. Thống kê đại lý — đọc thẳng seat bank (HN_STORAGE_KEY): mỗi ghế mang seat.agentId là 1 vé của đại
        lý đó. Gộp theo (đại lý × phơi): số vé (giữ chỗ + đã bán), số vé đã bán, doanh thu = tổng giá các
        vé ĐÃ BÁN (vé mới đặt/giữ chỗ chưa thu đủ nên chưa tính vào doanh thu).
   ========================================================= */
var AGENT_STATS_FILTER = { agentId: '', dateFrom: '', dateTo: '' };
var AGENT_STATS_SUBTAB = 'summary';
var AGENT_SETUP_SEARCH = '';

function adminSetAgentStatsSubTab(tab) {
  if (!['summary', 'detail'].includes(tab)) return;
  AGENT_STATS_SUBTAB = tab;
  renderAgentStatsView();
}

/* ---------------- 1. THIẾT LẬP ĐẠI LÝ ---------------- */
function renderAgentSetupView() {
  var kw = AGENT_SETUP_SEARCH.toLowerCase();
  var all = AgentStore.getAll();
  var list = all.filter(function (a) {
    return !kw || ((a.code || '') + ' ' + a.name + ' ' + (a.phone || '')).toLowerCase().indexOf(kw) !== -1;
  });
  var rows = list.length ? list.map(function (a, i) {
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td class="mono" style="font-weight:700;">' + esc(a.code) + '</td>' +
      '<td><b>' + esc(a.name) + '</b></td>' +
      '<td class="mono">' + esc(a.phone || '—') + '</td>' +
      '<td>' + esc(a.note || '—') + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm" data-action="adminOpenAgentModal" data-args=\'["' + esc(a.id) + '"]\'>Sửa</button> ' +
        '<button type="button" class="btn btn-sm" style="color:var(--red);" data-action="adminDeleteAgent" data-args=\'["' + esc(a.id) + '"]\'>Xoá</button>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="6" class="empty-state">Chưa có đại lý nào.</td></tr>';

  $('viewAgentSetup').innerHTML =
    '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search"><label>Tìm kiếm</label>' +
        '<input type="text" id="agSearch" value="' + esc(AGENT_SETUP_SEARCH) + '" placeholder="Mã, tên đại lý, SĐT..." data-input-action="adminAgentSearchInput" data-args=\'["__this_value__"]\'></div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenAgentModal" data-args=\'[""]\'>Thêm đại lý</button>' +
      '</div>' +
    '</div>' +
    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
        '<span>Danh sách đại lý</span>' +
        '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">' + list.length + ' đại lý</span>' +
      '</div>' +
      '<div class="sd-table-wrap"><table class="admin-table">' +
        '<thead><tr><th class="num">STT</th><th>Mã</th><th>Tên đại lý</th><th>SĐT</th><th>Ghi chú</th><th class="th-actions">Thao tác</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
    '</div></div>';
}

function adminAgentSearchInput(val) {
  AGENT_SETUP_SEARCH = val || '';
  adminKeepFocus(renderAgentSetupView);
}

function adminOpenAgentModal(id) {
  var a = id ? AgentStore.getById(id) : null;
  openAdminModal(
    '<h3>' + (a ? 'Sửa đại lý' : 'Thêm đại lý') + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveAgent" data-args=\'["__event__"' + (a ? ',"' + esc(a.id) + '"' : '') + ']\'>' +
      '<div class="fld"><label>Tên đại lý <span class="req">*</span></label><input id="agName" required value="' + (a ? esc(a.name) : '') + '" placeholder="VD: Đại lý Thanh Hà"></div>' +
      '<div class="fld"><label>Số điện thoại</label><input id="agPhone" value="' + (a ? esc(a.phone) : '') + '"></div>' +
      '<div class="fld"><label>Ghi chú</label><input id="agNote" value="' + (a ? esc(a.note) : '') + '"></div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Huỷ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu</button>' +
      '</div>' +
    '</form>'
  );
}

function adminSaveAgent(e, id) {
  e.preventDefault();
  var fields = { name: $('agName').value, phone: $('agPhone').value, note: $('agNote').value };
  var res = id ? AgentStore.update(id, fields) : AgentStore.add(fields);
  if (!res.ok) { showToast(res.reason); return; }
  FleetStore.log({ action: id ? 'update' : 'create', entity: 'agent', entityId: res.item.id, summary: (id ? 'Sửa' : 'Thêm') + ' đại lý "' + res.item.name + '"' });
  closeAdminModal();
  showToast(id ? 'Đã lưu đại lý.' : 'Đã thêm đại lý.');
  renderAgentSetupView();
}

function adminDeleteAgent(id) {
  var a = AgentStore.getById(id);
  if (!a) return;
  if (!confirm('Xoá đại lý "' + a.name + '"? Các vé đã đặt qua đại lý này vẫn giữ tên trong thống kê.')) return;
  AgentStore.remove(id);
  FleetStore.log({ action: 'delete', entity: 'agent', entityId: id, summary: 'Xoá đại lý "' + a.name + '"' });
  showToast('Đã xoá đại lý.');
  renderAgentSetupView();
}

/* ---------------- 2. THỐNG KÊ ĐẠI LÝ ---------------- */
// Trả về các dòng gộp theo (đại lý × phơi), đã lọc theo đại lý + ngày của phơi.
function agentStatsRows() {
  var f = AGENT_STATS_FILTER;
  var bank = (typeof loadSeatBank === 'function' && loadSeatBank()) || {};
  var tripsById = {};
  getTrips().forEach(function (t) { if (t && t.id) tripsById[t.id] = t; });
  var rows = {};

  Object.keys(bank).forEach(function (tripId) {
    var b = bank[tripId] || {};
    var trip = tripsById[tripId] || {};
    var d = trip.date || '';
    if (f.dateFrom && d < f.dateFrom) return;
    if (f.dateTo && d > f.dateTo) return;
    [].concat(b.down || [], b.up || [], b.subSeats || [], b.extraSeats || []).forEach(function (s) {
      if (!s || !s.agentId || (s.state !== 'hold' && s.state !== 'sold')) return;
      if (f.agentId && s.agentId !== f.agentId) return;
      var key = s.agentId + '|' + tripId;
      var r = rows[key] || (rows[key] = { agentId: s.agentId, agentName: s.agentName || '', trip: trip, tripId: tripId, tickets: 0, sold: 0, revenue: 0 });
      r.tickets++;
      if (s.state === 'sold') { r.sold++; r.revenue += Number(s.price) || 0; }
    });
  });

  return Object.keys(rows).map(function (k) {
    var r = rows[k];
    var a = AgentStore.getById(r.agentId);
    if (a) r.agentName = a.name; // tên hiện tại nếu đại lý còn tồn tại, không thì giữ tên đã chụp trên vé
    return r;
  }).sort(function (x, y) {
    return (x.agentName.localeCompare(y.agentName, 'vi')) || String(y.trip.date || '').localeCompare(String(x.trip.date || '')) || String(x.trip.time || '').localeCompare(String(y.trip.time || ''));
  });
}

function renderAgentStatsView() {
  var f = AGENT_STATS_FILTER;
  var rows = agentStatsRows();
  var totalTickets = 0, totalSold = 0, totalRevenue = 0;
  var byAgent = {};
  rows.forEach(function (r) {
    totalTickets += r.tickets; totalSold += r.sold; totalRevenue += r.revenue;
    var g = byAgent[r.agentId] || (byAgent[r.agentId] = { name: r.agentName, tickets: 0, sold: 0, revenue: 0, trips: 0 });
    g.tickets += r.tickets; g.sold += r.sold; g.revenue += r.revenue; g.trips++;
  });

  var agentOpts = '<option value="">Tất cả đại lý</option>' + AgentStore.getAll().map(function (a) {
    return '<option value="' + esc(a.id) + '"' + (a.id === f.agentId ? ' selected' : '') + '>' + esc(a.name) + '</option>';
  }).join('');

  var summaryRows = Object.keys(byAgent).map(function (id) {
    var g = byAgent[id];
    return '<tr><td><b>' + esc(g.name || '—') + '</b></td>' +
      '<td class="mono" style="text-align:center;">' + g.trips + '</td>' +
      '<td class="mono" style="text-align:center;">' + g.tickets + '</td>' +
      '<td class="mono" style="text-align:center;">' + g.sold + '</td>' +
      '<td style="text-align:right; font-weight:800;">' + fmtMoney(g.revenue) + '</td></tr>';
  }).join('') || '<tr><td colspan="5" class="empty-state">Chưa có vé nào của đại lý.</td></tr>';

  var detailRows = rows.map(function (r, i) {
    var t = r.trip;
    return '<tr>' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td><b>' + esc(r.agentName || '—') + '</b></td>' +
      '<td class="mono">' + esc(t.time || '—') + '</td>' +
      '<td>' + esc(t.route || '—') + '</td>' +
      '<td class="mono">' + esc(fmtDate(t.date)) + '</td>' +
      '<td class="mono">' + esc(t.plate || '—') + '</td>' +
      '<td class="mono" style="text-align:center;">' + r.tickets + '</td>' +
      '<td class="mono" style="text-align:center; font-weight:800;">' + r.sold + '</td>' +
      '<td style="text-align:right; font-weight:800; color:var(--red);">' + fmtMoney(r.revenue) + '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="9" class="empty-state">Chưa có vé nào của đại lý.</td></tr>';

  var totalRow = rows.length
    ? '<tr style="font-weight:800;"><td colspan="6">TỔNG</td><td class="mono" style="text-align:center;">' + totalTickets + '</td><td class="mono" style="text-align:center;">' + totalSold + '</td><td style="text-align:right;">' + fmtMoney(totalRevenue) + '</td></tr>'
    : '';

  var currentTab = AGENT_STATS_SUBTAB || 'summary';
  var tabContent = currentTab === 'summary'
    ? '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table">' +
          '<thead><tr><th>Đại lý</th><th style="text-align:center;">Số phơi</th><th style="text-align:center;">Số vé</th><th style="text-align:center;">Vé đã bán</th><th style="text-align:right;">Doanh thu</th></tr></thead>' +
          '<tbody>' + summaryRows + '</tbody></table></div>' +
      '</div>'
    : '<div class="sd-section-block">' +
        '<div class="sd-table-wrap"><table class="admin-table">' +
          '<thead><tr><th class="num">STT</th><th>Đại lý</th><th>Giờ</th><th>Tuyến</th><th>Ngày</th><th>Biển số</th><th style="text-align:center;">Số vé</th><th style="text-align:center;">Vé đã bán</th><th style="text-align:right;">Doanh thu</th></tr></thead>' +
          '<tbody>' + detailRows + totalRow + '</tbody></table></div>' +
        '<div class="hint-inline" style="padding:8px 12px;">Số vé gồm cả vé giữ chỗ; doanh thu chỉ tính vé đã bán.</div>' +
      '</div>';

  $('viewAgentStats').innerHTML =
    '<div class="station-subtabs">' +
      '<button type="button" class="station-subtab' + (currentTab === 'summary' ? ' active' : '') + '" data-action="adminSetAgentStatsSubTab" data-args=\'["summary"]\'>Tổng hợp theo đại lý</button>' +
      '<button type="button" class="station-subtab' + (currentTab === 'detail' ? ' active' : '') + '" data-action="adminSetAgentStatsSubTab" data-args=\'["detail"]\'>Vé và doanh thu theo phơi</button>' +
    '</div>' +
    '<div class="sd-toolbar" style="margin-bottom:16px;">' +
      '<div class="filter-field"><label>Đại lý</label><select data-change-action="adminAgentStatsFilter" data-args=\'["agentId","__this_value__"]\'>' + agentOpts + '</select></div>' +
      '<div class="filter-field"><label>Từ ngày (phơi)</label><input type="date" value="' + esc(f.dateFrom) + '" style="background:var(--white);" data-change-action="adminAgentStatsFilter" data-args=\'["dateFrom","__this_value__"]\'></div>' +
      '<div class="filter-field"><label>Đến ngày (phơi)</label><input type="date" value="' + esc(f.dateTo) + '" style="background:var(--white);" data-change-action="adminAgentStatsFilter" data-args=\'["dateTo","__this_value__"]\'></div>' +
      '<div class="sd-toolbar-actions"><button type="button" class="btn sd-btn" data-action="adminAgentStatsReset">Đặt lại</button></div>' +
    '</div>' +
    '<div class="sd-blocks">' + tabContent + '</div>';
}

function adminAgentStatsFilter(field, val) {
  if (!(field in AGENT_STATS_FILTER)) return;
  AGENT_STATS_FILTER[field] = val || '';
  renderAgentStatsView();
}
function adminAgentStatsReset() {
  AGENT_STATS_FILTER = { agentId: '', dateFrom: '', dateTo: '' };
  renderAgentStatsView();
}
