// shared/booking.js — Panel đặt vé, ghế phụ, menu ghế, chuyển ghế, lịch sử khách, đặt lại vé. Dùng chung callcenter/ticketstaff.
// Nạp bằng <script> thường TRƯỚC script chính của trang — không dùng export/import.

// ===== Trang "Lịch sử hành khách" (Zone header, dạng bảng đầy đủ + bộ lọc ở đầu) — khác với view "Tìm
// kiếm vé khách hàng" (customerHistoryView) ở chỗ hiển thị TẤT CẢ khách chứ không theo 1 SĐT cụ thể. =====
let _allPassengerHistoryRaw = [];

// ===== Lịch chọn ngày cho bộ lọc "Ngày đi" trang Lịch sử hành khách — cùng dạng lịch chọn-ngày-bất-kỳ
// như #pkCalendarPanel (trang Rước liền), nhưng GIỮ nút "Tất cả" (khác #rbCalendarPanel ở modal Đặt lại
// vé, nơi đã bỏ nút này) vì trang này về bản chất là xem toàn bộ lịch sử — "Tất cả ngày" là trạng thái
// mặc định có ý nghĩa, không phải trường hợp biên. =====
const PH_MONTH_NAMES = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
let phCalDate = new Date();
let phSelectedDateStr = null; // null = "Tất cả ngày"
let phCalendarOpen = false;

function phRenderCalendar() {
  const calGrid = document.getElementById('phCalGrid');
  const monthLabel = document.getElementById('phCalMonthLabel');
  if (!calGrid || !monthLabel) return;
  const today = new Date();
  const y = phCalDate.getFullYear(), m = phCalDate.getMonth();
  monthLabel.textContent = `${PH_MONTH_NAMES[m]}, ${y}`;
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  let html = '';
  ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach(d => { html += `<div class="cal-dow">${d}</div>`; });
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="cal-day muted">${daysInPrevMonth - startOffset + i + 1}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(y, m, d);
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateObj.toDateString() === today.toDateString();
    const isSelected = dateStr === phSelectedDateStr;
    html += `<div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-action="phPickDate" data-args='[${y},${m},${d}]'>${d}</div>`;
  }
  const totalCells = startOffset + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    html += `<div class="cal-day muted">${i}</div>`;
  }
  calGrid.innerHTML = html;
}

function phShiftMonth(dir) {
  phCalDate = new Date(phCalDate.getFullYear(), phCalDate.getMonth() + dir, 1);
  phRenderCalendar();
}

function phGoToday() {
  const today = new Date();
  phCalDate = new Date(today);
  phSelectedDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  phRenderCalendar();
  phUpdateCalTrigger();
  phToggleCalendar(false);
  renderPassengerHistoryTable();
}

function phPickDate(y, m, d) {
  phSelectedDateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  phRenderCalendar();
  phUpdateCalTrigger();
  phToggleCalendar(false);
  renderPassengerHistoryTable();
}

function phClearDateFilter() {
  phSelectedDateStr = null;
  phRenderCalendar();
  phUpdateCalTrigger();
  phToggleCalendar(false);
  renderPassengerHistoryTable();
}

function phUpdateCalTrigger() {
  const label = document.getElementById('phFilterDateLabel');
  if (!label) return;
  label.textContent = phSelectedDateStr ? formatHistoryDate(phSelectedDateStr) : 'Tất cả ngày';
}

function phToggleCalendar(force) {
  const panel = document.getElementById('phCalendarPanel');
  const btn = document.getElementById('phFilterDateBtn');
  if (!panel || !btn) return;
  phCalendarOpen = typeof force === 'boolean' ? force : !phCalendarOpen;
  panel.classList.toggle('open', phCalendarOpen);
  btn.classList.toggle('open', phCalendarOpen);
}

document.addEventListener('click', (e) => {
  if (phCalendarOpen && !e.target.closest('#phCalendarPanel') && !e.target.closest('#phFilterDateBtn')) {
    phToggleCalendar(false);
  }
});

function openPassengerHistoryView() {
  _allPassengerHistoryRaw = loadAllPassengerHistory();
  rebuildPhFilterOptions();
  phRenderCalendar();
  phUpdateCalTrigger();
  // Luôn quay về bảng lịch sử mặc định khi vào lại trang này — tránh giữ trạng thái "đang xem Ghế hủy"
  // từ lần trước, gây hiểu nhầm là trang chưa tải xong dữ liệu lịch sử mới.
  if (phCancelledViewActive) {
    phCancelledViewActive = false;
    const btn = document.getElementById('phCancelledBtn');
    const cancelledWrap = document.getElementById('phCancelledTableWrap');
    const cancelledEmpty = document.getElementById('phCancelledEmpty');
    if (btn) btn.classList.remove('active');
    if (cancelledWrap) cancelledWrap.style.display = 'none';
    if (cancelledEmpty) cancelledEmpty.style.display = 'none';
    const historyWrap = document.getElementById('phHistoryTableWrap');
    if (historyWrap) historyWrap.style.display = '';
  }
  renderPassengerHistoryTable();
}

// Gọi ngay sau khi đặt/bán vé xong (đặt vé thường, Đặt lại vé, Chỉ định xe rước...) để trang Lịch sử
// phản ánh đúng thông tin mới nhất NGAY LẬP TỨC, không cần bấm lại tab "Lịch sử" (tức "load lại") mới
// thấy. Nếu nhân viên đang đứng sẵn ở tab "Lịch sử hành khách" (bảng tổng hợp mọi khách) thì render lại
// TẠI CHỖ bảng đó; các trường hợp khác (đang ở màn đặt vé bình thường) thì giữ hành vi cũ — mở luôn kết
// quả tìm kiếm lịch sử của đúng khách vừa đặt/bán (openCustomerHistory), 1 trong 2 hàm này LUÔN quét lại
// tripSeatBank sống (searchCustomerByPhone/loadAllPassengerHistory) nên không cần lo dữ liệu cũ.
function refreshHistoryViewsAfterBooking(phone) {
  const tabHistory = document.getElementById('tabHistory');
  const historyView = document.getElementById('historyView');
  const isOnHistoryTab = tabHistory && tabHistory.classList.contains('active')
    && historyView && historyView.style.display !== 'none';
  if (isOnHistoryTab) {
    _allPassengerHistoryRaw = loadAllPassengerHistory();
    rebuildPhFilterOptions();
    renderPassengerHistoryTable();
    return;
  }
  openCustomerHistory(phone);
}

// Suy chiều của 1 tuyến: ưu tiên store dùng chung (FleetStore — hướng do Admin cấu hình, đúng cả với
// tuyến KHÔNG bắt đầu bằng "Sài Gòn"), fallback về quy ước cũ route.startsWith('Sài Gòn').
function phRouteSense(route) {
  try {
    if (window.FleetStore && typeof FleetStore.getRouteSense === 'function') {
      const s = FleetStore.getRouteSense(route);
      if (s === 'di' || s === 've') return s;
    }
  } catch (e) { /* fallback */ }
  return (route || '').startsWith('Sài Gòn') ? 'di' : 've';
}

// Suy id HƯỚNG (1 trong 4 hướng cố định) của 1 tuyến: ưu tiên FleetStore, fallback theo sense cũ
// (tuyến lạ → gộp vào hướng cùng chiều: 'sg-ag' nếu đi, 'ag-sg' nếu về).
function phRouteDirectionId(route) {
  try {
    if (window.FleetStore && typeof FleetStore.getRouteDirectionId === 'function') {
      const id = FleetStore.getRouteDirectionId(route);
      if (id) return id;
    }
  } catch (e) { /* fallback */ }
  return phRouteSense(route) === 've' ? 'ag-sg' : 'sg-ag';
}

// Đổ 4 hướng cố định vào #phFilterDirection (từ FleetStore), giữ lựa chọn hiện tại.
function rebuildPhDirectionOptions() {
  const dirEl = document.getElementById('phFilterDirection');
  if (!dirEl || !window.FleetStore) return;
  const cur = dirEl.value;
  const dirs = FleetStore.getDirections()
    .filter(d => d && d.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  dirEl.innerHTML = `<option value="">Tất cả hướng</option>` +
    dirs.map(d => `<option value="${d.id}">${d.label}</option>`).join('');
  dirEl.value = dirs.some(d => d.id === cur) ? cur : '';
}

// Tuyến đường phụ thuộc vào HƯỚNG đã chọn (1 trong 4 hướng cố định).
function rebuildPhRouteOptions() {
  const routeEl = document.getElementById('phFilterRoute');
  if (!routeEl) return;
  const dirVal = document.getElementById('phFilterDirection')?.value || '';
  const prevVal = routeEl.value;
  const pool = _allPassengerHistoryRaw.filter(r => !dirVal || phRouteDirectionId(r.route) === dirVal);
  const routes = Array.from(new Set(pool.map(r => r.route).filter(Boolean))).sort();
  routeEl.innerHTML = `<option value="all">Tất cả tuyến</option>` +
    routes.map(r => `<option value="${r}">${r}</option>`).join('');
  routeEl.value = routes.includes(prevVal) ? prevVal : 'all';
}

function phOnFilterDirectionChange() {
  rebuildPhRouteOptions();
  renderPassengerHistoryTable();
}

function rebuildPhFilterOptions() {
  const routeEl = document.getElementById('phFilterRoute');
  const staffEl = document.getElementById('phFilterStaff');
  if (!routeEl) return;
  rebuildPhDirectionOptions();
  rebuildPhRouteOptions();
  if (staffEl) {
    // Nhân viên "Đặt" và "Bán" có thể khác nhau trên cùng 1 vé (bookStaff/sellStaff) — gộp chung 1 danh
    // sách lựa chọn, lọc thì khớp với 1 trong 2 vai trò (xem renderPassengerHistoryTable()).
    const staffCodes = Array.from(new Set(
      _allPassengerHistoryRaw.flatMap(r => [r.bookStaff, r.sellStaff]).filter(s => s && s !== '—')
    )).sort();
    staffEl.innerHTML = `<option value="all">Tất cả nhân viên</option>` +
      staffCodes.map(s => `<option value="${s}">${s}</option>`).join('');
  }
}

function resetPhFilters() {
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setVal('phSearchInput', '');
  phSelectedDateStr = null;
  phCalDate = new Date();
  phUpdateCalTrigger();
  phRenderCalendar();
  setVal('phFilterDirection', '');
  rebuildPhRouteOptions();
  setVal('phFilterTime', 'all');
  setVal('phFilterStaff', 'all');
  renderPassengerHistoryTable();
}

let phSearchInputDebounceTimer = null;
function phOnSearchInput(val) {
  clearTimeout(phSearchInputDebounceTimer);
  phSearchInputDebounceTimer = setTimeout(renderPassengerHistoryTable, 300);
}

function renderPassengerHistoryTable() {
  const searchVal = (document.getElementById('phSearchInput')?.value || '').trim().toLowerCase();
  const dirVal = document.getElementById('phFilterDirection')?.value || '';
  const routeVal = document.getElementById('phFilterRoute')?.value || 'all';
  const timeVal = document.getElementById('phFilterTime')?.value || 'all';
  const staffVal = document.getElementById('phFilterStaff')?.value || 'all';

  const filtered = (_allPassengerHistoryRaw || []).filter(r => {
    if (searchVal) {
      const matchName = r.name && r.name.toLowerCase().includes(searchVal);
      const matchPhone = r.phone && r.phone.toLowerCase().includes(searchVal);
      if (!matchName && !matchPhone) return false;
    }
    if (phSelectedDateStr && r.date !== phSelectedDateStr) return false;
    if (dirVal && phRouteDirectionId(r.route) !== dirVal) return false;
    if (routeVal !== 'all' && r.route !== routeVal) return false;
    if (timeVal !== 'all') {
      const hh = parseInt((r.time || '00:00').split(':')[0], 10);
      if (timeVal === 'morning' && (hh < 0 || hh >= 12)) return false;
      if (timeVal === 'afternoon' && (hh < 12 || hh >= 18)) return false;
      if (timeVal === 'evening' && (hh < 18 || hh > 24)) return false;
    }
    if (staffVal !== 'all' && r.bookStaff !== staffVal && r.sellStaff !== staffVal) return false;
    return true;
  });

  // idx phải trỏ đúng vị trí trong mảng ĐANG HIỂN THỊ (đã lọc) — openEditFromHistory/goToTripFromHistory
  // đọc lại đúng mảng này qua window._historyResults, cùng quy ước với customerHistoryView.
  window._historyResults = filtered;
  _historyResults = filtered;

  const tbody = document.getElementById('phHistoryTableBody');
  const emptyEl = document.getElementById('phHistoryEmpty');
  if (tbody) tbody.innerHTML = filtered.map((r, idx) => renderPassengerHistoryRowHtml(r, idx)).join('');
  if (emptyEl) emptyEl.style.display = filtered.length ? 'none' : 'block';
}

function renderPassengerHistoryRowHtml(r, idx) {
  const { firstStopHtml, lastStopHtml } = getHistoryStopsDisplay(r);
  const plate = r.plate || '51F-123.45';
  const vehicleType = r.vehicleType || 'Limousine 24 Phòng';
  const driver = r.driver || 'Trần Văn Hùng';
  const helper = r.helper || 'Nguyễn Văn Bình';
  const bookStaffStr = getStaffCode(r.bookStaff || r.staff) || 'NV01';
  const sellStaffStr = r.sellStaff ? (getStaffCode(r.sellStaff) || r.sellStaff) : (r.paid ? 'NV05' : '—');
  const priceStr = r.price ? r.price.toLocaleString('vi-VN') + 'đ' : '—';
  const seatCount = r.seat ? r.seat.split(',').map(s => s.trim()).filter(Boolean).length : 0;
  // Cột "Thời gian" gộp luôn phần ngày (không còn cột "Ngày" riêng vì trùng thông tin) — lấy cả ngày
  // lẫn giờ từ cùng 1 mốc seat.actionTime thay vì ghép với r.date (ngày khởi hành chuyến, có thể khác
  // ngày nhân viên thao tác).
  const actionTimeStr = r.actionTime ? `${formatHistoryDate(r.actionTime)} ${formatActionTime(r.actionTime)}` : '—';
  // Ghi chú của khách hàng — chỉ hiện chữ (không icon), line-clamp 2 dòng để không kéo dài chiều cao hàng.
  const noteSafe = escapeHtml(r.note || '');
  const noteHtml = r.note
    ? `<span class="pax-note-clamp">${noteSafe}</span>`
    : `<span class="pax-note-empty">—</span>`;
  // Phân biệt nhân viên đặt/bán bằng màu tag thay vì chữ "Đặt:"/"Bán:" — đặt (giữ chỗ) tag nền vàng,
  // bán (thu tiền, chốt vé) tag nền đỏ, theo đúng 2 tông màu trạng thái đã dùng xuyên suốt hệ thống
  // (vàng = đang chờ/giữ chỗ, đỏ = thương hiệu/hoàn tất). Chưa có nhân viên bán (sellStaffStr === '—')
  // thì hiện gạch ngang trung tính, không tô màu đỏ cho ô rỗng.
  const staffTagsHtml = `<div class="staff-tag-stack">
    <span class="staff-tag staff-tag-book">${bookStaffStr}</span>
    ${sellStaffStr === '—' ? `<span class="staff-tag staff-tag-empty">—</span>` : `<span class="staff-tag staff-tag-sell">${sellStaffStr}</span>`}
  </div>`;

  return `
    <tr>
      <td style="text-align:center; font-weight:600; color:#6b7280;">${idx + 1}</td>
      <td>
        <span class="ch-trip-link" data-action="goToTripFromHistory" data-args='${JSON.stringify(["__event__", idx])}' title="Biển số xe: ${plate} • Loại xe: ${vehicleType} • Tài xế: ${driver} • Phụ xe: ${helper}">${r.route} — ${r.time}</span>
      </td>
      <td class="ch-col-ellipsis" title="${r.name || '—'}">${r.name || '—'}</td>
      <td class="mono ch-col-nowrap">${r.phone || '—'}</td>
      <td>
        <div class="pax-route">
          <div class="pax-route-row pax-route-from">
            <svg class="pax-route-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
            <div class="pax-route-text">${firstStopHtml}</div>
          </div>
          <div class="pax-route-connector"></div>
          <div class="pax-route-row pax-route-to">
            <svg class="pax-route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
            <div class="pax-route-text">${lastStopHtml}</div>
          </div>
        </div>
      </td>
      <td class="mono">${seatCount || '—'}</td>
      <td class="mono">${r.seat || '—'}</td>
      <td style="text-align:right;">${priceStr}</td>
      <td title="${noteSafe}">${noteHtml}</td>
      <td>${staffTagsHtml}</td>
      <td class="mono" style="color:var(--text-sub);font-style:italic;font-weight:400;">${actionTimeStr}</td>
      <td><button type="button" class="btn ph-rebook-btn" data-action="openRebookFromHistory" data-args='${JSON.stringify([idx])}' title="Đặt lại" aria-label="Đặt lại"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button></td>
    </tr>
  `;
}

// ===== Nút "Ghế hủy" trên trang "Lịch sử hành khách" — khác tab "Ghế hủy" trong màn đặt vé (chỉ xem
// được ghế hủy của 1 chuyến đang chọn), nút này gộp ghế hủy của TẤT CẢ phơi xe (mọi tripSeatBank) lại
// thành 1 danh sách duy nhất, kèm nguyên nhân hủy, để tra cứu nhanh không cần mở từng chuyến. =====
let phCancelledViewActive = false;

// Nhân viên đang đăng nhập thực hiện thao tác hủy ghế — đọc từ phiên đăng nhập (giống
// getCurrentStaffLabel() ở ticketstaff-manifest-core.js), đặt ở đây (file dùng chung booking.js) vì
// trước đây callcenter.html không nạp ticketstaff-manifest-core.js (nay callcenter.html đã gộp vào
// ticketstaff.html, chỗ khai báo vẫn giữ ở đây vì booking.js là code lõi đặt vé dùng chung).
function getCurrentActionStaffCode() {
  const user = Session.get();
  if (user && user.username) return getStaffCode(user.username) || user.username;
  const nameEl = document.getElementById('userName');
  return (nameEl && nameEl.textContent.trim()) || 'NV trực';
}

function loadAllCancelledSeats() {
  const results = [];
  Object.keys(tripSeatBank || {}).forEach(tripId => {
    const bank = tripSeatBank[tripId];
    if (!bank || !Array.isArray(bank.cancelledSeats) || bank.cancelledSeats.length === 0) return;
    const tripMeta = (allTripsMeta || []).find(t => t.id === tripId);
    bank.cancelledSeats.forEach(item => {
      results.push({
        ...item,
        route: (tripMeta && tripMeta.route) || '—',
        time: (tripMeta && tripMeta.time) || ''
      });
    });
  });
  return results.sort((a, b) => (b.cancelTime || '').localeCompare(a.cancelTime || ''));
}

function renderPhCancelledTable() {
  const all = loadAllCancelledSeats();
  const tbody = document.getElementById('phCancelledTableBody');
  const emptyEl = document.getElementById('phCancelledEmpty');
  if (!tbody) return;

  if (!all.length) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  tbody.innerHTML = all.map((item, idx) => {
    // Hành trình trình bày giống hệt cột "Hành trình" bảng Lịch sử hành khách (chấm đỏ = điểm đi, ghim
    // xám = điểm đến, nối bằng 1 đường kẻ ngắn) — getHistoryStopsDisplay() chỉ cần firstStop/lastStop,
    // cancelledRecord không có guestType nên tự bỏ qua phần đón/trả trung chuyển, chỉ hiện đúng 2 trạm.
    const { firstStopHtml, lastStopHtml } = getHistoryStopsDisplay(item);
    const priceStr = item.price ? item.price.toLocaleString('vi-VN') + 'đ' : '—';
    const reasonText = item.reason || 'Không có lý do';
    const timeText = item.cancelTime || '—';
    const tripLabel = item.time ? `${item.route} — ${item.time}` : (item.route || '—');
    const staffStr = getStaffCode(item.cancelStaff) || item.cancelStaff || '—';

    return `
      <tr>
        <td style="text-align:center; font-weight:600; color:#6b7280;">${idx + 1}</td>
        <td>${tripLabel}</td>
        <td><b>${item.customerName || '—'}</b></td>
        <td>${item.phone || '—'}</td>
        <td>
          <div class="pax-route">
            <div class="pax-route-row pax-route-from">
              <svg class="pax-route-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
              <div class="pax-route-text">${firstStopHtml}</div>
            </div>
            <div class="pax-route-connector"></div>
            <div class="pax-route-row pax-route-to">
              <svg class="pax-route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
              <div class="pax-route-text">${lastStopHtml}</div>
            </div>
          </div>
        </td>
        <td class="mono" style="text-align:center;">1</td>
        <td class="mono" style="text-align:center;"><b style="color:var(--red,#C20D08);">${item.code}</b></td>
        <td style="font-weight:600;">${priceStr}</td>
        <td style="color:#dc2626; font-weight:600;">${reasonText}</td>
        <td>${staffStr}</td>
        <td style="color:#6b7280; font-size:13px;">${timeText}</td>
      </tr>
    `;
  }).join('');
}

function phToggleCancelledView() {
  phCancelledViewActive = !phCancelledViewActive;
  const btn = document.getElementById('phCancelledBtn');
  const historyWrap = document.getElementById('phHistoryTableWrap');
  const cancelledWrap = document.getElementById('phCancelledTableWrap');
  const historyEmpty = document.getElementById('phHistoryEmpty');
  const cancelledEmpty = document.getElementById('phCancelledEmpty');
  if (btn) btn.classList.toggle('active', phCancelledViewActive);

  if (phCancelledViewActive) {
    if (historyWrap) historyWrap.style.display = 'none';
    if (historyEmpty) historyEmpty.style.display = 'none';
    if (cancelledWrap) cancelledWrap.style.display = '';
    renderPhCancelledTable();
  } else {
    if (cancelledWrap) cancelledWrap.style.display = 'none';
    if (cancelledEmpty) cancelledEmpty.style.display = 'none';
    if (historyWrap) historyWrap.style.display = '';
    renderPassengerHistoryTable();
  }
}

function cancelTransferSelection() {
  exitMultiSelectMode();
  showToast('Đã hủy thao tác chuyển ghế');
}

// Chặn các thao tác đơn lẻ trên 1 ghế (đặt vé, sửa vé, hủy vé, mở menu ghế) trong lúc đang chọn nhiều
// ghế để chuyển ghế/đặt vé nhóm — trước đây các nút này không kiểm tra multiSelectMode nên bấm được
// song song, gây lẫn lộn trạng thái. Trả về true nếu đã chặn (gọi nơi dùng: if (blockIfMultiSelectActive()) return;).
function blockIfMultiSelectActive() {
  if (!multiSelectMode) return false;
  const modeLabel = selectionMode === 'transfer' ? 'chuyển ghế' : 'đặt vé nhóm';
  showToast(`Đang chọn ghế để ${modeLabel} — vui lòng hoàn tất hoặc hủy thao tác này trước`);
  return true;
}

function cancelledSeatCard(seat) {
  const firstStopShort = shortenStopName(seat.firstStop) || '—';
  const lastStopShort = shortenStopName(seat.lastStop) || '—';
  const routeStr = `${firstStopShort} → ${lastStopShort}`;
  const custName = seat.customerName || '—';
  const custPhone = seat.phone || '—';
  const noteStr = seat.note || '—';
  const priceStr = seat.price ? seat.price.toLocaleString('vi-VN') + 'đ' : '—';

  return `
  <div class="seat-card cancelled" data-code="${seat.code}">
    <div class="seat-top">
      <div>
        <div class="seat-code">${seat.code}</div>
      </div>
      <div class="seat-top-right">
        <div class="seat-price-tag">${priceStr}</div>
      </div>
    </div>
    <div class="seat-body">
      <div class="seat-line route-single-line"><span class="seat-label-full">Chặng đi: </span><span class="seat-stop" title="${routeStr}">${routeStr}</span></div>
      <div class="route-split-line">
        <div class="route-split-row"><span class="route-split-label">Đi:</span><span class="seat-stop" title="${firstStopShort}">${firstStopShort}</span></div>
        <div class="route-split-row"><span class="route-split-label">Đến:</span><span class="seat-stop" title="${lastStopShort}">${lastStopShort}</span></div>
      </div>
      <div class="seat-line" style="color:var(--text-main); font-weight:700;"><span class="seat-label-full">Khách hàng: </span><span class="seat-label-short">KH: </span>${custName}</div>
      <div class="seat-line" style="color:var(--text-main); font-weight:700;"><span class="seat-label-full">Số điện thoại: </span><span class="seat-label-short">SĐT: </span>${custPhone}</div>
      <div class="seat-note" title="${noteStr}"><span class="seat-label-full">Ghi chú: </span><span class="seat-label-short">GC: </span>${noteStr}</div>
    </div>
    <button type="button" class="seat-footbtn cancelled" data-action="startTransferFromCancelled" data-stop-propagation="1" data-args='${JSON.stringify([seat.id])}'>
      <span class="foot-text-normal">GHẾ ĐÃ HỦY</span><span class="foot-text-hover">CHUYỂN GHẾ</span>
    </button>
  </div>`;
}

function clearPaxFilter() {
  // Thanh lọc mới dùng <select> (Trạm đi / Trạm đến / Thanh toán) — reset về "" rồi render lại.
  // Vẫn bỏ tick các checkbox cũ nếu còn (tương thích ngược với callcenter.html chưa đổi thanh lọc).
  ['pxFilterFirstStop', 'pxFilterLastStop', 'pxFilterPaid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('.pax-filter-opt input').forEach(cb => cb.checked = false);
  renderPassengerList();
}

function closeCustomerHistory() {
  customerHistoryActive = false;
  currentSearchPhone = '';
  const chView = document.getElementById('customerHistoryView');
  if (chView) chView.style.display = 'none';
  const rightCol = document.querySelector('.right-col');
  if (rightCol) {
    ['.zone2', '.tabs'].forEach(sel => {
      const el = rightCol.querySelector(sel);
      if (el) el.style.display = '';
    });
  }
  const activeTabEl = document.querySelector('.tabs .tab-item.active');
  const match = activeTabEl ? /switchTab\('([^']+)'/.exec(activeTabEl.getAttribute('onclick') || '') : null;
  switchTab(match ? match[1] : 'seatmap', activeTabEl || document.querySelector('.tabs .tab-item'));

  const si = document.getElementById('searchInput');
  if (si) si.value = '';
}

function closeRebookModal() {
  const modal = document.getElementById('rebookModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
    modal.style.setProperty('display', 'none', 'important');
  }
}

function closeSeatMenu() { document.getElementById('seatMenu').classList.remove('open'); }

function startTransferMode(sourceCode) {
  const seat = findSeat(sourceCode);
  if (!seat) return;
  multiSelectMode = true;
  selectionMode = 'transfer';
  selectedSourceSeats = [sourceCode];
  selectedTargetSeats = [];
  transferSourceTripId = currentTripId;
  transferTargetTripId = currentTripId;
  document.querySelectorAll('.seat-card').forEach(c => { c.style.outline = 'none'; });
  const sourceCard = document.querySelector(`.seat-card[data-code="${sourceCode}"]`);
  if (sourceCard) { sourceCard.style.outline = '2.5px solid var(--red)'; sourceCard.style.outlineOffset = '1px'; }
  updateTransferHint();
  showToast(`Đã chọn ghế ${sourceCode}. Bấm ghế trống để chuyển sang (có thể chọn chuyến khác ở Zone 1).`);
}

function confirmSelectionAction() {
  if (transferSourceCancelId) {
    confirmRestoreFromCancelled();
    return;
  }
  if (selectedSourceSeats.length > 0) {
    confirmTransfer();
    return;
  }
  openGroupBookingFromSelection();
}

function exitMultiSelectMode() {
  multiSelectMode = false;
  selectionMode = null;
  selectedSourceSeats = [];
  selectedTargetSeats = [];
  transferSourceTripId = null;
  transferTargetTripId = null;
  transferSourceCancelId = null;
  document.querySelectorAll('.seat-card').forEach(c => {
    c.style.outline = 'none';
    c.style.boxShadow = 'none';
  });
  document.getElementById('stickyHint').textContent = '';
  updateTransferBarVisibility();
}

function findSeat(code) {
  return seatPlanDown.find(s => s.code === code) || seatPlanUp.find(s => s.code === code) || extraLeftoverSeats.find(s => s.code === code) || subSeats.find(s => s.code === code);
}

function findSeatInTrip(tripId, code) {
  const bank = tripSeatBank[tripId];
  if (!bank) return null;
  return bank.down.find(s => s.code === code) || bank.up.find(s => s.code === code) || (bank.extraSeats || []).find(s => s.code === code) || (bank.subSeats || []).find(s => s.code === code);
}

// Ghế phụ ("S1", "S2"...) không nằm trong sơ đồ ghế chính (seatPlanDown/Up) — dùng để tắt phần "Đặt
// cọc" + nút "Đặt vé" (giữ) trong panel đặt vé chung, chỉ còn "Bán vé" (xem openBookingPanel ở
// shared/ui.js). Ghi theo mã (không giữ tham chiếu object) vì subSeats bị thay/replace lúc nạp phơi.
function isSubSeatCode(code) {
  return typeof subSeats !== 'undefined' && subSeats.some(s => s.code === code);
}

function getHistoryStopsDisplay(r) {
  if (!r) return { firstStopHtml: '—', lastStopHtml: '—' };
  const type = r.guestType || 'Khách trạm';
  let firstStopHtml = r.firstStop || '—';
  let lastStopHtml = r.lastStop || '—';

  const pickupLoc = r.transshipStation || r.transship || r.pickupAddress || r.fromTransfer || '';
  const dropLoc = r.dropoffAddress || r.arrivalTransfer || (type === 'Trung chuyển' ? (r.transshipStation || r.transship || '') : '');

  if (type === 'Rước liền' && pickupLoc) {
    firstStopHtml = `${r.firstStop || 'Trạm đi'}<div class="ch-sub-address" style="font-size:12px;color:var(--text-sub);margin-top:2px;">Rước liền: ${pickupLoc}</div>`;
  } else if (type === 'Rước đường' && pickupLoc) {
    firstStopHtml = `${r.firstStop || 'Trạm đi'}<div class="ch-sub-address" style="font-size:12px;color:var(--text-sub);margin-top:2px;">Rước: ${pickupLoc}</div>`;
  } else if (type === 'Trung chuyển' && pickupLoc) {
    firstStopHtml = `${r.firstStop || 'Trạm đi'}<div class="ch-sub-address" style="font-size:12px;color:var(--text-sub);margin-top:2px;">Đón: ${pickupLoc}</div>`;
  }
  // Tách riêng khỏi nhánh trên (thay vì if/else-if chung 1 chuỗi): trước đây "Rước liền"/"Rước đường" khớp
  // nhánh của mình rồi dừng, không bao giờ chạy tới đây nên "Trung chuyển đến" (dropLoc) bị bỏ sót dù đã nhập.
  if (dropLoc) {
    const dropLabel = type === 'Trung chuyển' ? 'TC: ' : '';
    lastStopHtml = `${r.lastStop || 'Trạm đến'}<div class="ch-sub-address" style="font-size:12px;color:var(--text-sub);margin-top:2px;">${dropLabel}${dropLoc}</div>`;
  }

  return { firstStopHtml, lastStopHtml };
}

// Trả về true nếu chuyển phơi thành công, false nếu chuyến quá cũ/không còn — openEditFromHistory() dựa
// vào giá trị này để biết có nên tiếp tục mở panel sửa ghế hay không (tránh sửa nhầm ghế của phơi khác
// nếu chuyển phơi thất bại). Các nơi gọi hàm này từ trước (link tên phơi) không đọc giá trị trả về, không
// ảnh hưởng hành vi cũ.
// highlightSeat=false khi gọi từ goToTransshipFromHistory (tag "Trung chuyển") — nơi đó tự chuyển sang
// tab "Trung chuyển" và highlight đúng hàng của khách trong bảng đó, sơ đồ ghế không hiện nên không cần
// (và không nên) bật thêm tab "Sơ đồ ghế" chồng lên.
function goToTripFromHistory(e, idx, pushHistory = true, highlightSeat = true) {
  if (e) e.stopPropagation();
  const list = window._historyResults || _historyResults || [];
  const r = list[idx];
  if (!r) return false;

  const prevPhone = currentSearchPhone || r.phone;
  closeCustomerHistory();

  if (typeof currentView !== 'undefined' && currentView !== 'booking' && typeof switchView === 'function') {
    switchView('booking');
  }

  let targetTripId = r.tripId || allTripsMeta?.find(t => t.route === r.route && (t.time === r.time || !r.time))?.id;
  if (!targetTripId || !tripSeatBank[targetTripId]) {
    showToast(`Chuyến "${r.route} (${r.time})" đã quá cũ, không còn phơi xe để hiển thị`, 'warning');
    return false;
  }

  if (pushHistory) {
    try { history.pushState({ view: 'trip', tripId: targetTripId, phone: prevPhone }, '', '#trip-' + targetTripId); } catch (err) { }
  }

  const targetDir = phRouteDirectionId(r.route);
  if (typeof selectedDirection !== 'undefined' && selectedDirection !== targetDir && directionLabels?.[targetDir]) {
    selectedDirection = targetDir;
    selectedRoute = 'all';
    const dVal = document.getElementById('directionTrigger');
    if (dVal) dVal.value = directionLabels[targetDir];
    const rVal = document.getElementById('routeTrigger');
    if (rVal) rVal.value = 'Tất cả tuyến';
    document.querySelectorAll('#directionDropdown .dropdown-item').forEach(item => {
      item.classList.toggle('active', item.dataset.dir === targetDir);
    });
    if (typeof renderRouteOptions === 'function') renderRouteOptions();
    // Zone 1 chỉ hiện phơi của hướng đang chọn — dựng lại danh sách theo hướng đích.
    if (typeof updateTripListForDirection === 'function') updateTripListForDirection(targetDir);
    else if (typeof renderZone1TripList === 'function') renderZone1TripList();
  }

  const card = document.querySelector(`.trip-card[data-trip="${targetTripId}"]`);
  if (card) {
    selectTrip(card, r.time, r.route);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (typeof selectTrip === 'function') {
    const tripMeta = allTripsMeta.find(t => t.id === targetTripId);
    if (tripMeta) {
      const dummy = document.createElement('div');
      dummy.dataset.trip = targetTripId;
      selectTrip(dummy, tripMeta.time, tripMeta.route);
    }
  }

  // Chuyển thẳng sang tab "Sơ đồ ghế" rồi cuộn tới + highlight tạm đúng thẻ ghế của khách đó (r.seat) —
  // bấm tên phơi từ lịch sử mà vẫn phải tự dò lại ghế nào giữa 24-45 ghế thì mất tác dụng "nhảy nhanh".
  if (highlightSeat && r.seat) {
    if (typeof switchTab === 'function') {
      switchTab('seatmap', document.getElementById('tabSeatmapItem'));
    }
    requestAnimationFrame(() => {
      const seatEl = document.querySelector(`.seat-card[data-code="${r.seat}"]`);
      if (!seatEl) return;
      seatEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      seatEl.classList.add('seat-card-flash-highlight');
      setTimeout(() => seatEl.classList.remove('seat-card-flash-highlight'), 2200);
    });
  }

  showToast(`Đã chuyển sang phơi chuyến: ${r.route} (${r.time})`);
  return true;
}

// Bấm tag "Trung chuyển" trên thẻ lịch sử khách hàng (renderHistorySeatCardHtml) — nhảy tới đúng phơi
// (dùng lại goToTripFromHistory), mở thẳng tab "Trung chuyển" (switchTab, ticketstaff.js) rồi cuộn tới +
// highlight tạm đúng hàng của khách đó (khớp theo ticketNo) để không phải tự dò lại trong danh sách.
function goToTransshipFromHistory(e, idx) {
  if (e) e.stopPropagation();
  const list = window._historyResults || _historyResults || [];
  const r = list[idx];
  if (!r) return;

  const switched = goToTripFromHistory(null, idx, false, false);
  if (!switched) return;

  if (typeof switchTab === 'function') {
    switchTab('transship', document.getElementById('tabTransshipItem'));
  }

  // renderTransshipTables() (gọi bên trong switchTab) render lại toàn bộ tbody đồng bộ ngay trong cùng
  // lượt gọi ở trên — không cần chờ thêm, nhưng vẫn để trong rAF để chắc chắn trình duyệt đã áp layout
  // mới trước khi scrollIntoView (tránh cuộn hụt do bảng vừa được gắn vào DOM/đổi display ngay trước đó).
  requestAnimationFrame(() => {
    if (!r.ticketNo) return;
    const row = document.querySelector(`#transshipPickupBody tr[data-ticket="${r.ticketNo}"], #transshipDropoffBody tr[data-ticket="${r.ticketNo}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('ts-row-highlight');
    setTimeout(() => row.classList.remove('ts-row-highlight'), 2200);
  });
}

// Nhãn màu riêng cho từng loại khách (khớp đúng 4 giá trị guestType có trong hệ thống, xem
// f_type/onGuestTypeChange) — dùng cho tag "Loại khách" trên thẻ lịch sử (renderHistorySeatCardHtml).
const CH_GUEST_TAG_CLASS = {
  'Khách trạm': 'ch-guest-tag--station',
  'Trung chuyển': 'ch-guest-tag--transship',
  'Rước đường': 'ch-guest-tag--roadside',
  'Rước liền': 'ch-guest-tag--roadside'
};

function renderHistorySeatCardHtml(r, custName, custPhone) {
  const { firstStopHtml, lastStopHtml } = getHistoryStopsDisplay(r);
  const bookStaffStr = getStaffCode(r.bookStaff || r.staff) || 'NV01';
  const sellStaffStr = r.sellStaff ? (getStaffCode(r.sellStaff) || r.sellStaff) : (r.paid ? 'NV05' : '—');
  const stateClass = r.state === 'sold' ? 'sold' : (r.state === 'hold' ? 'hold' : 'sold');
  // Cùng quy ước nhãn nút footer với thẻ ghế bên sơ đồ ghế chính (seatCard() trong callcenter.js/
  // ticketstaff.js) — ghế đã bán hiện "THÔNG TIN" khi hover (mở panel chỉ xem, không sửa được), ghế
  // "hold" hiện "CHỈNH SỬA".
  const footLabel = 'KDV - CHÂU ĐỐC';
  const footHoverLabel = r.state === 'sold' ? 'THÔNG TIN' : 'CHỈNH SỬA';

  // Tag "Loại khách" thay cho tag "Hôm nay" cũ (isToday luôn true nên tag cũ không mang thông tin gì hữu
  // ích). Riêng "Trung chuyển" bấm được — nhảy tới đúng phơi rồi mở thẳng tab "Trung chuyển", cuộn tới +
  // highlight đúng hàng của khách đó (goToTransshipFromHistory, khớp theo ticketNo).
  const guestType = r.guestType || 'Khách trạm';
  const guestTagClass = CH_GUEST_TAG_CLASS[guestType] || 'ch-guest-tag--station';
  const guestTagHtml = guestType === 'Trung chuyển'
    ? `<span class="ch-history-badge ${guestTagClass} ch-guest-tag--clickable" data-action="goToTransshipFromHistory" data-stop-propagation="1" data-args='${JSON.stringify(["__event__", r.origIdx])}' title="Xem trong Danh sách trung chuyển">${guestType}</span>`
    : `<span class="ch-history-badge ${guestTagClass}">${guestType}</span>`;

  return `
    <div class="seat-card ${stateClass} ch-seat-card-item" data-code="${r.seat}">
      <div class="seat-top">
        <div>
          <div class="seat-code" style="display:inline-block; vertical-align:middle; font-size:16px; font-weight:800;">${r.seat}</div>
          <span style="margin-left:6px;">${guestTagHtml}</span>
        </div>
        <div class="seat-top-right">
          <div class="seat-price-tag">${r.price ? r.price.toLocaleString('vi-VN') + 'đ' : '—'}</div>
        </div>
      </div>

      <div class="seat-line" style="margin-top:2px;">
        <span class="seat-label-full" style="font-weight:700;color:var(--text-sub);">Trạm đi: </span>
        <span class="seat-stop" style="font-weight:700;">${firstStopHtml}</span>
      </div>

      <div class="seat-line" style="margin-top:2px;">
        <span class="seat-label-full" style="font-weight:700;color:var(--text-sub);">Trạm đến: </span>
        <span class="seat-stop" style="font-weight:700;">${lastStopHtml}</span>
      </div>

      <div class="seat-line" style="color:var(--text-main); font-weight:700; margin-top:4px;">
        <span class="seat-label-full">Khách hàng: </span>${custName}
      </div>
      <div class="seat-line" style="color:var(--text-main); font-weight:700;">
        <span class="seat-label-full">SĐT: </span>${custPhone}
      </div>

      <div class="seat-line" style="color:var(--text-sub); font-size:11.5px; margin-top:4px;">
        <span class="seat-label-full">Nhân viên: </span>Đặt: <b>${bookStaffStr}</b> | Bán: <b class="${sellStaffStr === '—' ? 'none' : ''}">${sellStaffStr}</b>
      </div>

      <button class="seat-footbtn" type="button" data-action="openEditFromHistory" data-stop-propagation="1" data-args='${JSON.stringify([r.origIdx])}'>
        <span class="foot-text-normal">${footLabel}</span>
        <span class="foot-text-hover">${footHoverLabel}</span>
      </button>
    </div>
  `;
}

// 1 thẻ cho MỖI lần đặt vé trong lịch sử — không gom theo tuyến nữa, hiện đầy đủ toàn bộ (đã bỏ icon "i"
// + modal xem thêm). idx là vị trí của r trong mảng results gốc, dùng cho goToTripFromHistory/rebook.
function renderHistoryCardHtml(r, idx, custName, custPhone) {
  const formattedDate = formatHistoryDate(r.date);
  const plate = r.plate || '51F-123.45';
  const vehicleType = r.vehicleType || 'Limousine 24 Phòng';
  const driver = r.driver || 'Trần Văn Hùng';
  const helper = r.helper || 'Nguyễn Văn Bình';

  return `
    <div class="ch-trip-seatmap-card">
      <div class="ch-trip-header">
        <div class="ch-trip-title-info" data-action="goToTripFromHistory" data-args='${JSON.stringify(["__event__", idx])}' title="Biển số xe: ${plate} • Loại xe: ${vehicleType} • Tài xế: ${driver} • Phụ xe: ${helper}">
          <div class="ch-trip-name">
            <span class="ch-trip-link">${r.route} — ${r.time}</span>
            <span class="ch-date-tag">${formattedDate}</span>
          </div>
        </div>
      </div>

      <div class="ch-seat-cards-grid">
        ${renderHistorySeatCardHtml({ ...r, origIdx: idx }, custName, custPhone)}
      </div>
    </div>
  `;
}

// callcenter và ticketstaff dùng CHUNG hàm này (nội dung gốc giống hệt nhau, chỉ khác 1 chỗ kiểm tra
// firstResult thừa không ảnh hưởng hành vi vì luôn có results.length > 0 tại điểm đó — đã đối chiếu bằng
// diff trước khi gộp).
function renderHistorySeatMap(results) {
  const body = document.getElementById('chBody');
  if (!body) return;

  const headerHtml = `
    <div class="ch-search-header">
      <h3 class="ch-search-title">Tìm kiếm vé khách hàng</h3>
      <button type="button" class="btn btn-secondary" data-action="closeCustomerHistory">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M18 6L6 18M6 6l12 12"/></svg>
        Đóng
      </button>
    </div>
  `;

  if (!results?.length) {
    body.innerHTML = headerHtml + `
      <div class="ch-empty" style="text-align:center;padding:40px;color:var(--text-sub);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;margin-bottom:8px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <div style="font-weight:600;">Không tìm thấy vé phù hợp</div>
      </div>`;
    return;
  }
  _historyResults = results;
  window._historyResults = results;

  const firstResult = results[0];
  const custName = firstResult ? (firstResult.name || 'Khách hàng') : 'Khách hàng';
  const custPhone = firstResult ? (firstResult.phone || currentSearchPhone || '—') : '—';

  const cardsHtml = results.map((r, idx) => renderHistoryCardHtml(r, idx, custName, custPhone)).join('');

  body.innerHTML = headerHtml + `<div class="ch-seatmaps-list" id="chSeatmapsList">${cardsHtml}</div>`;
}

function groupHistoryResults(rawResults) {
  if (!rawResults?.length) return [];
  const map = new Map();

  rawResults.forEach(item => {
    const phone = (item.phone || '').replace(/[\s.\-]/g, '');
    const name = (item.name || '').trim().toLowerCase();
    const tripKey = item.tripId || `${item.date}_${item.route}_${item.time}`;
    // Nhóm theo ĐÚNG 1 vé (ticketNo, luôn có sẵn trên mọi ghế đã có khách — xem applyFormToSeat()/
    // groupSeat()/confirmRebook()) chứ không chỉ theo tripKey+SĐT+tên+trạng thái+đã trả như trước —
    // khoá cũ khiến 2 vé KHÁC NHAU của cùng 1 khách trên CÙNG 1 chuyến (VD: "Đặt lại vé" ngay trên
    // chuyến đang có sẵn 1 vé cũ của khách đó, cùng trạng thái/đã trả) bị gộp lầm thành 1 dòng — số
    // ghế và tổng tiền của 2 vé cộng dồn vào nhau, nhìn như vé mới "sửa đè" lên vé cũ thay vì 2 dòng
    // độc lập. Chỉ lùi về khoá cũ khi thật sự thiếu ticketNo (không nên xảy ra với dữ liệu hợp lệ).
    const groupKey = item.ticketNo
      ? `${tripKey}::${item.ticketNo}`
      : `${tripKey}_${phone}_${name}_${item.state}_${!!item.paid}`;

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        ...item,
        seatsArray: item.seat ? item.seat.split(',').map(s => s.trim()) : [],
        ticketsArray: item.ticketNo ? [item.ticketNo] : [],
        totalPrice: Number(item.price) || 0
      });
    } else {
      const g = map.get(groupKey);
      if (item.seat) {
        item.seat.split(',').forEach(s => {
          const t = s.trim();
          if (t && !g.seatsArray.includes(t)) g.seatsArray.push(t);
        });
      }
      if (item.ticketNo && !g.ticketsArray.includes(item.ticketNo)) g.ticketsArray.push(item.ticketNo);
      g.totalPrice += Number(item.price) || 0;
      if (!g.pickupAddress && item.pickupAddress) g.pickupAddress = item.pickupAddress;
      if (!g.dropoffAddress && item.dropoffAddress) g.dropoffAddress = item.dropoffAddress;
      if (!g.note && item.note) g.note = item.note;
    }
  });

  return Array.from(map.values()).map(g => {
    g.seat = g.seatsArray.join(', ');
    g.ticketNo = g.ticketsArray.join(', ');
    g.price = g.totalPrice;
    delete g.seatsArray;
    delete g.ticketsArray;
    delete g.totalPrice;
    return g;
  });
}

function miniSeatHtml(seat, tripId) {
  if (seat.state === 'hidden') return '<div class="ch-mini-seat hidden-placeholder"></div>';
  const isAvailable = seat.state === 'empty' && !seat.locked;
  const stateClass = seat.locked ? 'locked' : seat.state;
  const selectedClass = rebookSelectedSeats.includes(seat.code) ? 'selected' : '';
  const clickHandler = isAvailable ? `data-action="toggleRebookSeat" data-args='${JSON.stringify([seat.code, tripId])}'` : '';
  return `<div class="ch-mini-seat ${stateClass} ${selectedClass}" ${clickHandler}>${seat.code}</div>`;
}

function nextSubSeatCode() {
  let max = 0;
  subSeats.forEach(s => {
    const m = /^S(\d+)$/.exec(s.code);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'S' + (max + 1);
}

function onGuestTypeChange() {
  const type = document.getElementById('f_type').value;
  const stationLabel = document.getElementById('f_station_label');
  const transshipWrap = document.getElementById('f_transship_wrap');
  const transshipLabel = document.getElementById('f_transship_label');
  const transshipInput = document.getElementById('f_transship');
  const stationRow = document.getElementById('f_station_row');

  stationLabel.textContent = 'Trạm đi';

  // "Địa điểm rước" (Rước đường) và "Trung chuyển đi" (Trung chuyển) dùng chung 1 ô combobox (input +
  // datalist stopPointList) — vừa gõ tự do vừa chọn gợi ý, khác nhau ở nhãn/placeholder hiển thị.
  const isTransshipLike = (type === 'Trung chuyển');
  const needsTransship = (type === 'Trung chuyển' || type === 'Rước đường');
  transshipInput.style.display = needsTransship ? 'block' : 'none';
  transshipLabel.textContent = isTransshipLike ? 'Trung chuyển đi' : 'Địa điểm rước';
  transshipInput.placeholder = isTransshipLike ? 'Nơi trung chuyển...' : 'Nhập địa điểm rước...';
  transshipWrap.style.display = needsTransship ? 'flex' : 'none';

  stationRow.style.setProperty('--cols', needsTransship ? 2 : 1);
  refreshTicket();
}

