// ===== Lịch chọn ngày cho bộ lọc "Chọn phơi xe" trong modal Đặt lại vé =====
// Đặt lại vé có thể chuyển khách sang MỘT NGÀY KHÁC (không chỉ trong các ngày đã có sẵn phơi), nên dùng
// lịch chọn-ngày-bất-kỳ (giống #calTrigger Zone 1 / #pkFilterDateBtn trang Rước liền) thay vì <select>
// chỉ liệt kê những ngày đã có dữ liệu. Đây là lịch RIÊNG (tiền tố "rb"), không dùng chung toggleCalendar()
// của js/shared/ui.js vì hàm đó gắn cứng vào #calendarPanel/#calTrigger của Zone 1.
const RB_MONTH_NAMES = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
function rbTodayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
let rbCalDate = new Date();
let rbSelectedDateStr = rbTodayStr(); // null = "Tất cả ngày"; mặc định = hôm nay, giống mọi lịch khác trong app
let rbCalendarOpen = false;

function rbRenderCalendar() {
  const calGrid = document.getElementById('rbCalGrid');
  const monthLabel = document.getElementById('rbCalMonthLabel');
  if (!calGrid || !monthLabel) return;
  const today = new Date();
  const y = rbCalDate.getFullYear(), m = rbCalDate.getMonth();
  monthLabel.textContent = `${RB_MONTH_NAMES[m]}, ${y}`;
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
    const isSelected = dateStr === rbSelectedDateStr;
    html += `<div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-action="rbPickDate" data-args='[${y},${m},${d}]'>${d}</div>`;
  }
  const totalCells = startOffset + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    html += `<div class="cal-day muted">${i}</div>`;
  }
  calGrid.innerHTML = html;
}

function rbShiftMonth(dir) {
  rbCalDate = new Date(rbCalDate.getFullYear(), rbCalDate.getMonth() + dir, 1);
  rbRenderCalendar();
}

function rbGoToday() {
  rbCalDate = new Date();
  rbSelectedDateStr = rbTodayStr();
  rbRenderCalendar();
  rbUpdateCalTrigger();
  rbToggleCalendar(false);
  renderRebookTripList();
}

function rbPickDate(y, m, d) {
  rbSelectedDateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  rbRenderCalendar();
  rbUpdateCalTrigger();
  rbToggleCalendar(false);
  renderRebookTripList();
}

function rbUpdateCalTrigger() {
  const label = document.getElementById('rbFilterDateLabel');
  if (!label) return;
  if (!rbSelectedDateStr) { label.textContent = 'Tất cả ngày'; return; }
  label.textContent = rbSelectedDateStr === rbTodayStr() ? `Hôm nay (${formatHistoryDate(rbSelectedDateStr)})` : formatHistoryDate(rbSelectedDateStr);
}

function rbToggleCalendar(force) {
  const panel = document.getElementById('rbCalendarPanel');
  const btn = document.getElementById('rbFilterDateBtn');
  if (!panel || !btn) return;
  rbCalendarOpen = typeof force === 'boolean' ? force : !rbCalendarOpen;
  panel.classList.toggle('open', rbCalendarOpen);
  btn.classList.toggle('open', rbCalendarOpen);
}

document.addEventListener('click', (e) => {
  if (rbCalendarOpen && !e.target.closest('#rbCalendarPanel') && !e.target.closest('#rbFilterDateBtn')) {
    rbToggleCalendar(false);
  }
});

function renderRebookTripList() {
  const container = document.getElementById('rbTripList');
  if (!container) return;
  const timeVal = document.getElementById('rbFilterTime')?.value || 'all';

  const filtered = (allTripsMeta || []).filter(trip => {
    if (trip.status === 'Đã hủy' || trip.isTemplate) return false; // ẩn phơi mẫu — giống Zone 1
    if (rbSelectedDateStr && trip.date !== rbSelectedDateStr) return false;
    if (timeVal !== 'all') {
      const hh = parseInt((trip.time || '00:00').split(':')[0], 10);
      if (timeVal === 'morning' && (hh < 0 || hh >= 12)) return false;
      if (timeVal === 'afternoon' && (hh < 12 || hh >= 18)) return false;
      if (timeVal === 'evening' && (hh < 18 || hh > 24)) return false;
    }
    return true;
  });

  // Thẻ phơi + màu badge + thứ tự xếp: dùng CHUNG renderPhoiTripCardHtml()/zone1SortByDeparture() của
  // ticketstaff.js (nạp sau file này nhưng đã sẵn sàng lúc modal mở) để danh sách phơi ở đây giống HỆT
  // danh sách phơi Zone 1 — cả kiểu dáng lẫn logic (đỏ = chuyến đã khoá bán vé, xếp xuống cuối).
  const html = zone1SortByDeparture(filtered).map(trip => renderPhoiTripCardHtml(trip, {
    selectedId: rebookSelectedTripId,
    dataAction: 'selectRebookTrip',
    dataArgsJson: JSON.stringify([trip.id])
  })).join('');

  container.innerHTML = html || `<div class="ch-trip-empty">Không có phơi xe phù hợp với bộ lọc.</div>`;
}

function renderRouteOptions(filterText) {
  const container = document.getElementById('routeDropdown');
  if (!container) return;
  const kw = normalizeSearchText(filterText || '');
  const routes = routeOptions[selectedDirection].filter(route => !kw || normalizeSearchText(route.label).includes(kw));
  container.innerHTML = routes.length ? routes.map(route => `
    <div class="dropdown-item ${route.id === selectedRoute ? 'active' : ''}" data-route="${route.id}" data-action="selectRoute" data-args='${JSON.stringify([route.id])}'>
      <span>${route.label}</span>
      <span class="dropdown-item-check">✓</span>
    </div>
  `).join('') : `<div class="dropdown-empty">Không tìm thấy tuyến phù hợp</div>`;
}

function renderDirectionOptions(filterText) {
  const container = document.getElementById('directionDropdown');
  if (!container) return;
  const kw = normalizeSearchText(filterText || '');
  const dirs = Object.keys(directionLabels).filter(dir => !kw || normalizeSearchText(directionLabels[dir]).includes(kw));
  container.innerHTML = dirs.length ? dirs.map(dir => `
    <div class="dropdown-item ${dir === selectedDirection ? 'active' : ''}" data-dir="${dir}" data-action="toggleDirection" data-args='${JSON.stringify([dir])}'>
      <span>${directionLabels[dir]}</span>
      <span class="dropdown-item-check">✓</span>
    </div>
  `).join('') : `<div class="dropdown-empty">Không tìm thấy hướng phù hợp</div>`;
}

// Combobox tìm-để-chọn cho "Hướng đi"/"Tuyến" ở Zone 1 — gõ để lọc realtime trong danh sách lựa chọn
// (renderDirectionOptions/renderRouteOptions có sẵn, giữ nguyên), để trống ô thì hiện lại toàn bộ. Dùng
// addEventListener trực tiếp (không qua data-action) vì cần bắt focus/blur/keydown — dispatcher dùng
// chung chỉ hỗ trợ click/change/input/blur/submit qua data-*-action, còn ở đây phải tự quản lý theo từng
// ô nên gắn thẳng cho gọn, giống cách #searchInput đã làm.
//
// wireZone1Combobox() dùng chung cho cả 2 ô — cùng hành vi searchable combobox với #f_transship (bôi đen
// + mở toàn bộ danh sách khi click/focus, điều hướng bằng bàn phím, không mất lượt chọn do input blur
// trước khi click option kịp xử lý): trước đây đóng dropdown bằng setTimeout 150ms sau blur — 1 hack dựa
// vào thời gian, có thể trật nếu máy chậm/DOM nặng. Đổi hẳn sang mousedown+preventDefault() trên item để
// input KHÔNG BAO GIỜ blur khi bấm chọn (loại bỏ hẳn race condition thay vì chỉ né bằng độ trễ).
function wireZone1Combobox(inputId, panelId, renderFn, getCanonicalValueFn) {
  const input = document.getElementById(inputId);
  const panel = document.getElementById(panelId);
  if (!input || !panel) return;
  let highlightedIndex = -1;

  function items() {
    return Array.from(panel.querySelectorAll('.dropdown-item'));
  }

  function updateHighlight() {
    items().forEach((el, i) => {
      const active = i === highlightedIndex;
      el.classList.toggle('kbd-highlight', active);
      if (active) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function open(filterText) {
    renderFn(filterText || '');
    highlightedIndex = -1;
    panel.classList.add('open');
  }

  function close() {
    panel.classList.remove('open');
    highlightedIndex = -1;
    input.value = getCanonicalValueFn();
  }

  input.addEventListener('focus', () => {
    input.select();
    open('');
  });
  // Input đã đang focus sẵn thì 'focus' không bắn lại — vẫn cần 'click' để bấm lại lần nữa sau khi đã
  // chọn 1 giá trị (bôi đen + mở lại toàn bộ danh sách từ đầu) hoạt động đúng.
  input.addEventListener('click', () => {
    input.select();
    open('');
  });
  input.addEventListener('input', () => {
    open(input.value);
  });
  input.addEventListener('blur', close);

  input.addEventListener('keydown', (e) => {
    const list = items();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!panel.classList.contains('open')) { open(input.value); return; }
      if (list.length) { highlightedIndex = (highlightedIndex + 1) % list.length; updateHighlight(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!panel.classList.contains('open')) { open(input.value); return; }
      if (list.length) { highlightedIndex = (highlightedIndex - 1 + list.length) % list.length; updateHighlight(); }
    } else if (e.key === 'Enter') {
      if (panel.classList.contains('open') && highlightedIndex >= 0 && list[highlightedIndex]) {
        e.preventDefault();
        list[highlightedIndex].click(); // đi qua đúng data-action="toggleDirection"/"selectRoute" có sẵn
      }
    } else if (e.key === 'Escape') {
      if (panel.classList.contains('open')) {
        e.preventDefault();
        close();
      }
    }
    // Backspace/Delete/Tab: không can thiệp, giữ nguyên hành vi mặc định của trình duyệt.
  });

  // preventDefault() ở mousedown (không phải click) trên item — chặn input mất focus TRƯỚC khi
  // toggleDirection()/selectRoute() (gọi qua data-action lúc 'click' bắn sau đó) kịp chạy, nên không còn
  // phải né bằng setTimeout nữa.
  panel.addEventListener('mousedown', (e) => {
    if (e.target.closest('.dropdown-item')) e.preventDefault();
  });
}

(function initZone1ComboBoxes() {
  wireZone1Combobox('directionTrigger', 'directionDropdown', renderDirectionOptions,
    () => directionLabels[selectedDirection] || '');
  wireZone1Combobox('routeTrigger', 'routeDropdown', renderRouteOptions, () => {
    const item = routeOptions[selectedDirection].find(r => r.id === selectedRoute);
    return item ? item.label : '';
  });
})();

// Ghế phụ giờ dùng CHUNG seatCard()/openBookingPanel() với ghế thường (giống cách "Ghế dư" — xem
// renderExtraSeats() — đã làm từ trước) thay vì render riêng dạng thẻ chỉ có ghi chú + giá tiền: ô
// trống bấm vào mở đúng panel đặt vé đầy đủ (tên khách, SĐT, tuyến, giá...), hỗ trợ chọn nhiều ghế
// phụ trống để đặt vé nhóm y hệt sơ đồ ghế chính (xem onSeatClick ở ticketstaff.js).
function renderSubSeats() {
  const section = document.getElementById('subSeatsSection');
  const list = document.getElementById('subSeatsList');
  if (!section || !list) return;

  const totalSeats = [...seatPlanDown, ...seatPlanUp].filter(s => s.state !== 'hidden').length;
  const useThreeCols = totalSeats >= 34;
  list.classList.toggle('cols-3', useThreeCols);

  const ticketGroupMap = buildTicketGroupMap();
  list.innerHTML = subSeats.map(s => seatCard(s, ticketGroupMap)).join('') + subSeatAddTile();
}

// Bấm "+" -> thêm ngay 1 ô ghế phụ TRỐNG vào danh sách (y hệt 1 ghế trống trên sơ đồ chính), không mở
// modal ngay như trước — bấm vào chính ô trống đó (qua seatCard() -> onSeatClick) mới mở panel đặt vé.
function addEmptySubSeat() {
  if (typeof blockIfMultiSelectActive === 'function' && blockIfMultiSelectActive()) return;
  subSeats.push({ code: nextSubSeatCode(), state: 'empty', price: DEFAULT_SUB_SEAT_PRICE, count: 1 });
  if (tripSeatBank[currentTripId]) tripSeatBank[currentTripId].subSeats = subSeats;
  saveSeatBank();
  renderSubSeats();
  updateTripStats();
}

// Quét tripSeatBank (phơi đang có trong ngày), trả về danh sách vé đã đặt/bán/rước dạng phẳng (chưa gom
// nhóm) — dùng chung cho tìm kiếm theo SĐT/tên (searchCustomerByPhone, chỉ lấy khớp matchSeatFn) và trang
// "Lịch sử hành khách" (loadAllPassengerHistory, lấy hết không lọc).
function scanTripSeatBankHistory(matchSeatFn) {
  const rawResults = [];
  Object.keys(tripSeatBank).forEach(tripId => {
    const bank = tripSeatBank[tripId];
    const tripMeta = allTripsMeta.find(t => t.id === tripId);
    if (!bank || !tripMeta) return;

    [...(bank.down || []), ...(bank.up || []), ...(bank.subSeats || [])].forEach(seat => {
      if (['sold', 'hold', 'free', 'cargo'].includes(seat.state) && matchSeatFn(seat)) {
        rawResults.push({
          date: tripMeta.date || todayStr,
          phone: seat.phone,
          name: seat.customerName,
          guestType: seat.guestType || 'Khách trạm',
          transship: seat.transshipStation || seat.transship || '',
          pickupAddress: seat.pickupAddress || '',
          dropoffAddress: seat.dropoffAddress || '',
          note: seatNoteWithReason(seat),
          ticketNo: seat.ticketNo,
          route: tripMeta.route,
          time: tripMeta.time,
          seat: seat.code,
          firstStop: seat.firstStop,
          lastStop: seat.lastStop,
          state: seat.state,
          paid: seat.paid,
          price: seat.price,
          plate: bank.plate || tripMeta.plate,
          vehicleType: bank.vehicleType || tripMeta.vehicleType,
          driver: bank.driver || '',
          helper: bank.helper || '',
          bookStaff: getStaffCode(seat.staff) || 'NV01',
          sellStaff: seat.paid ? (getStaffCode(seat.staff) || 'NV05') : '—',
          actionTime: seat.actionTime || '',
          isToday: true,
          tripId
        });
      }
    });
  });
  return rawResults;
}

// Khoá sắp xếp lịch sử: ưu tiên đúng THỜI ĐIỂM đặt/bán vé (seat.actionTime, ISO đầy đủ ngày+giờ) chứ
// KHÔNG phải ngày khởi hành của chuyến (r.date) — 1 vé đặt ngay bây giờ cho chuyến chạy tuần sau vẫn phải
// lên đầu danh sách vì thao tác vừa xảy ra, trong khi sắp theo r.date sẽ đẩy nó xuống dưới các vé cũ hơn
// đặt cho chuyến chạy sớm hơn. Dữ liệu mẫu quá khứ (CUSTOMER_HISTORY_DATA) không có actionTime nên vẫn
// lùi về r.date (kèm giờ 00:00:00 để so sánh chuỗi ISO cùng định dạng với actionTime thật).
function historySortKey(r) {
  return r.actionTime || (r.date ? r.date + 'T00:00:00' : '');
}

function searchCustomerByPhone(query) {
  const raw = (query || '').toString().trim();
  if (!raw) return [];

  const rawNoSpace = raw.replace(/[\s.\-]/g, '');
  const isPhone = /^\+?[0-9]+$/.test(rawNoSpace);
  const normPhone = rawNoSpace.replace(/^\+84/, '0');
  const normText = normalizeSearchText(raw);

  const isMatch = (p, n, t) => isPhone
    ? (p || '').replace(/[\s.\-]/g, '').replace(/^\+84/, '0').includes(normPhone)
    : (n && normalizeSearchText(n).includes(normText)) || (t && t.toLowerCase().includes(normText));

  // Tìm kiếm lịch sử từ thanh tìm kiếm header chỉ lấy phơi đang có trong ngày (tripSeatBank), không lấy
  // dữ liệu lịch sử quá khứ (CUSTOMER_HISTORY_DATA) theo yêu cầu — trước đây có gộp cả 2 nguồn. Muốn xem
  // cả lịch sử quá khứ của TẤT CẢ khách thì dùng trang "Lịch sử hành khách" (loadAllPassengerHistory).
  const rawResults = scanTripSeatBankHistory(seat => isMatch(seat.phone, seat.customerName, seat.ticketNo));
  return groupHistoryResults(rawResults).sort((a, b) => historySortKey(b).localeCompare(historySortKey(a)));
}

// Toàn bộ lịch sử vé của TẤT CẢ khách (không lọc theo SĐT/tên) cho trang "Lịch sử hành khách" — gồm cả
// phơi đang có trong ngày (tripSeatBank) lẫn dữ liệu quá khứ (CUSTOMER_HISTORY_DATA).
function loadAllPassengerHistory() {
  const rawResults = scanTripSeatBankHistory(() => true);
  CUSTOMER_HISTORY_DATA.forEach(h => rawResults.push({ ...h, isToday: false }));
  return groupHistoryResults(rawResults).sort((a, b) => historySortKey(b).localeCompare(historySortKey(a)));
}

function selectRebookTrip(tripId) {
  rebookSelectedTripId = tripId;
  rebookSelectedSeats = [];
  document.querySelectorAll('#rbTripList .trip-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`#rbTripList .trip-card[data-trip="${tripId}"]`);
  if (card) card.classList.add('selected');
  // Trạm đi/đến trong modal đặt lại vé bám theo phơi đích vừa chọn (xem stationsForTrip).
  const tripMeta = (allTripsMeta || []).find(t => t.id === tripId);
  if (tripMeta && typeof populateRebookStationSelects === 'function') populateRebookStationSelects(tripMeta);
  renderMiniSeatMap(tripId);
  updateRebookBtn();
  updateRebookPricePreview();
}

// Hiện giá vé MẶC ĐỊNH của đúng phơi vừa chọn lên ô giá (#rbPrice) — nhân viên vẫn sửa được ngay sau đó
// (focusPriceEdit/onPriceEdit, giống hệt panel đặt vé chính). Chỉ gọi lúc CHỌN PHƠI (đổi hẳn ngữ cảnh
// giá), không gọi lại mỗi lần tích/bỏ ghế (toggleRebookSeat) để không ghi đè giá nhân viên vừa sửa tay.
function updateRebookPricePreview() {
  const priceEl = document.getElementById('rbPrice');
  if (!priceEl) return;
  const trip = rebookSelectedTripId ? (allTripsMeta || []).find(t => t.id === rebookSelectedTripId) : null;
  const price = trip ? (trip.price || 280000) : 280000;
  priceEl.textContent = price.toLocaleString('vi-VN') + 'đ';
  priceEl.contentEditable = 'true';
  if (typeof updateZeroPriceReasonVisibility === 'function') updateZeroPriceReasonVisibility('rbPrice');
  updateRebookTotalPrice();
}

// "Tổng cộng" = đơn giá (ô #rbPrice) × số ghế đang chọn — gọi lại mỗi khi 1 trong 2 giá trị đó đổi
// (chọn/bỏ ghế qua updateRebookBtn(), hoặc sửa giá qua onPriceEdit() ở ticketstaff.js).
function updateRebookTotalPrice() {
  const totalEl = document.getElementById('rbTotalPrice');
  if (!totalEl) return;
  const unitPrice = (typeof getEditedPrice === 'function') ? getEditedPrice('rbPrice') : 0;
  const count = rebookSelectedSeats.length;
  totalEl.textContent = (unitPrice * count).toLocaleString('vi-VN') + 'đ';
}

function selectRoute(route) {
  const routeItem = routeOptions[selectedDirection].find(item => item.id === route);
  if (!routeItem) return;
  selectedRoute = route;
  const routeInput = document.getElementById('routeTrigger');
  if (routeInput) routeInput.value = routeItem.label;
  document.querySelectorAll('#routeDropdown .dropdown-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === route);
  });
  document.getElementById('routeDropdown').classList.remove('open');
  showToast('Chọn tuyến: ' + routeItem.label);
  // Lọc lại danh sách phơi Zone 1 ngay theo tuyến vừa chọn (so trạm đi/đến của phơi).
  if (typeof renderZone1TripList === 'function') renderZone1TripList();
}

function subSeatAddTile() {
  return `
  <div class="seat-card sub-add" data-action="addEmptySubSeat">
    <span class="sub-add-plus">+</span>
  </div>`;
}

function toggleDirection(dir) {
  if (!directionLabels[dir]) return;
  selectedDirection = dir;
  selectedRoute = 'all';
  const directionInput = document.getElementById('directionTrigger');
  if (directionInput) directionInput.value = directionLabels[dir];
  const routeInput = document.getElementById('routeTrigger');
  if (routeInput) routeInput.value = 'Tất cả tuyến';
  document.querySelectorAll('#directionDropdown .dropdown-item').forEach(item => {
    item.classList.toggle('active', item.dataset.dir === dir);
  });
  renderRouteOptions();
  updateTripListForDirection(dir);
  document.getElementById('directionDropdown').classList.remove('open');
  showToast('Chọn hướng: ' + directionLabels[dir]);
}

function togglePaxFilter() {
  const dd = document.getElementById('paxFilterDropdown');
  if (dd) dd.classList.toggle('open');
}

function toggleRebookSeat(code, tripId) {
  if (tripId !== rebookSelectedTripId) return;
  const idx = rebookSelectedSeats.indexOf(code);
  if (idx >= 0) rebookSelectedSeats.splice(idx, 1);
  else rebookSelectedSeats.push(code);
  renderMiniSeatMap(tripId);
  updateRebookBtn();
}

function toggleZone1() {
  setZone1Collapsed(!document.body.classList.contains('zone1-collapsed'));
}

function updateCancelledTabCount() {
  const cntEl = document.getElementById('cancelledTabCnt');
  if (cntEl) {
    cntEl.textContent = `(${cancelledSeats ? cancelledSeats.length : 0})`;
  }
}

function updatePassengerTabCount() {
  const allBooked = getAllBookedSeats();
  const grouped = groupSeatsByTicket(allBooked);

  const cntEl = document.getElementById('passengerTabCnt');
  if (cntEl) cntEl.textContent = `(${allBooked.length})`;

  const pickupCount = grouped.filter(g => {
    const s = g.main;
    return s.guestType === 'Trung chuyển' || s.guestType === 'Rước liền' || s.guestType === 'Rước đường' || !!s.pickupAddress || !!s.transship;
  }).length;

  const dropoffCount = grouped.filter(g => {
    const s = g.main;
    return s.guestType === 'Trung chuyển' || !!s.dropoffAddress || !!s.arrivalTransfer;
  }).length;

  const transTabCntEl = document.getElementById('transshipTabCnt');
  if (transTabCntEl) transTabCntEl.textContent = `(${pickupCount} | ${dropoffCount})`;

  const transSection = document.getElementById('zone3Transship');
  if (transSection && transSection.style.display !== 'none') {
    renderTransshipTables();
  }

  // Tab "Rước đường" (chỉ có ở ticketstaff) — cập nhật số đếm + render lại nếu đang mở.
  const roadsideTabCntEl = document.getElementById('roadsideTabCnt');
  if (roadsideTabCntEl) {
    const roadsideCount = grouped.filter(g => g.main.guestType === 'Rước đường').length;
    roadsideTabCntEl.textContent = `(${roadsideCount})`;
  }
  const roadsideSection = document.getElementById('zone3Roadside');
  if (roadsideSection && roadsideSection.style.display !== 'none' && typeof renderRoadsideTable === 'function') {
    renderRoadsideTable();
  }
}

function updateRebookBtn() {
  const btn = document.getElementById('rbConfirmBtn');
  const sellBtn = document.getElementById('rbSellBtn');
  const countEl = document.getElementById('rbSelectedCount');
  if (countEl) countEl.textContent = `(${rebookSelectedSeats.length} ghế)`;
  const isDisabled = !rebookSelectedTripId || !rebookSelectedSeats.length;
  if (btn) btn.disabled = isDisabled;
  if (sellBtn) sellBtn.disabled = isDisabled;
  updateRebookTotalPrice();
}

function updateTransferBarVisibility() {
  // Thanh chọn ghế (Chuyển ghế / Đặt vé nhóm) — lấy theo id, KHÔNG querySelector('.sticky-actions')
  // vì #tsPrintActionBar (thanh "In vé trung chuyển") dùng cùng class và đứng trước trong DOM.
  const sticky = document.getElementById('seatTransferBar');
  if (!sticky) return;
  const paxSection = document.getElementById('zone3Passengers');
  const isSeatMapVisible = !paxSection || paxSection.style.display === 'none';
  const shouldShow = multiSelectMode && isSeatMapVisible;
  sticky.style.display = shouldShow ? 'flex' : 'none';
  const seatSection = document.querySelector('.zone3:not(.passenger-view)');
  if (seatSection) seatSection.classList.toggle('has-sticky-actions', shouldShow);
}

function updateTransferHint() {
  let bookedText = '';
  if (transferSourceCancelId) {
    const record = findCancelledRecordInTrip(transferSourceTripId, transferSourceCancelId);
    bookedText = record ? `Đã chọn vé hủy: ${record.customerName || 'Khách'} (${record.phone || '—'})` : '';
  } else if (selectedSourceSeats.length) {
    bookedText = `Đã chọn ghế đã đặt: ${selectedSourceSeats.join(', ')}`;
  }
  const emptyText = selectedTargetSeats.length ? ` | Ghế trống: ${selectedTargetSeats.join(', ')}` : '';
  document.getElementById('stickyHint').textContent = bookedText + emptyText;
  const actionBtn = document.getElementById('stickyActionBtn');
  if (actionBtn) {
    if (selectionMode === 'transfer') {
      actionBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3v18"/><path d="m21 7-4-4-4 4"/><path d="M7 21V3"/><path d="m3 17 4 4 4-4"/></svg>Chuyển ghế';
    } else {
      actionBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>Đặt vé nhóm';
    }
  }
  // Nút "Bán vé" trên thanh chuyển ghế (chỉ có ở ticketstaff, callcenter không có #stickySellBtn) —
  // chỉ hiện khi đang chọn nguồn là ghế thật (không phải vé hủy) thuộc ĐÚNG chuyến đang xem (tránh
  // in nhầm tuyến/giờ của chuyến khác nếu người dùng đã bấm sang Zone 1 chọn ghế đích ở chuyến khác)
  // và TẤT CẢ ghế nguồn đang chọn đều chưa bán (state khác 'sold').
  const sellBtn = document.getElementById('stickySellBtn');
  const reprintBtn = document.getElementById('stickyReprintBtn');
  const cancelBtn = document.getElementById('stickyCancelBtn');
  if (sellBtn || reprintBtn || cancelBtn) {
    const sourceSeats = (!transferSourceCancelId && selectedSourceSeats.length && transferSourceTripId === currentTripId)
      ? selectedSourceSeats.map(code => findSeatInTrip(transferSourceTripId, code)).filter(Boolean)
      : [];
    if (sellBtn) {
      const canSell = sourceSeats.length > 0 && sourceSeats.every(s => s.state !== 'sold');
      sellBtn.style.display = canSell ? '' : 'none';
    }
    // Nút "In lại vé" trên thanh chuyển ghế — chỉ hiện khi TẤT CẢ ghế nguồn đang chọn đều ĐÃ bán,
    // để nhân viên in lại vé ngay khi vừa chọn ghế mà không cần mở panel riêng.
    if (reprintBtn) {
      const canReprint = sourceSeats.length > 0 && sourceSeats.every(s => s.state === 'sold');
      reprintBtn.style.display = canReprint ? '' : 'none';
    }
    // Nút "Hủy vé" trên thanh chuyển ghế — cho phép hủy 1 hoặc nhiều ghế (đã đặt hoặc đã bán) cùng
    // lúc, chỉ hiện khi đang chọn ghế nguồn theo chế độ chuyển ghế (không phải đang chọn vé hủy để
    // đặt lại, và không phải chế độ đặt vé nhóm chọn ghế trống).
    if (cancelBtn) {
      const canCancel = selectionMode === 'transfer' && sourceSeats.length > 0;
      cancelBtn.style.display = canCancel ? '' : 'none';
    }
  }
  // Nút "Đặt thêm cho nhóm" (chỉ có ở ticketstaff) — hiện khi đang chọn ghế kiểu "chuyển ghế", nguồn là
  // ĐÚNG 1 ghế đã đặt thuộc 1 VÉ NHÓM (>=2 ghế cùng số vé) ở đúng chuyến đang xem, và đã chọn >=1 ghế
  // trống. Bấm nút này copy thông tin khách của ghế nhóm sang các ghế trống, giữ chung số vé.
  const groupAddBtn = document.getElementById('stickyGroupAddBtn');
  if (groupAddBtn) {
    let canGroupAdd = false;
    if (selectionMode === 'transfer' && !transferSourceCancelId
        && selectedSourceSeats.length === 1 && selectedTargetSeats.length >= 1
        && transferSourceTripId === currentTripId
        && (transferTargetTripId || currentTripId) === currentTripId) {
      const src = findSeatInTrip(currentTripId, selectedSourceSeats[0]);
      if (src && src.ticketNo && OCCUPIED_STATES.includes(src.state)) {
        const groupPool = [...seatPlanDown, ...seatPlanUp, ...extraLeftoverSeats, ...subSeats];
        canGroupAdd = groupPool.filter(s => s.ticketNo === src.ticketNo).length >= 2;
      }
    }
    groupAddBtn.style.display = canGroupAdd ? '' : 'none';
  }
  updateTransferBarVisibility();
}

