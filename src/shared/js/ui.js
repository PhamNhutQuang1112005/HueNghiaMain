// shared/ui.js — Toast, modal/panel đóng chung, dropdown tìm kiếm, helper <select>. Dùng chung callcenter/ticketstaff.
// Nạp bằng <script> thường TRƯỚC script chính của trang — không dùng export/import.

function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ---- Zone 4: Panel đặt vé ---- */
function openBookingPanel(seats, options = {}) {
  const depositModalEl = document.getElementById('depositModal');
  if (depositModalEl) depositModalEl.classList.remove('open');
  const mode = options.mode || 'booking';
  currentPanelMode = mode;
  currentPanelSeats = seats.slice();
  currentPanelSeat = seats[0];
  currentEditSeatCode = mode === 'edit' ? seats[0].code : null;
  const seat = seats[0];
  // Vé đã bán (state 'sold') chỉ xem thông tin, không cho lưu/bán lại — ẩn nút "Lưu thay đổi" (cả 2
  // trang) và "Bán vé" (riêng ticketstaff) thay vì chặn không cho mở panel như trước.
  const isReadOnly = mode === 'edit' && seat && seat.state === 'sold';
  // Ghế phụ ("S1", "S2"...) không có phần "Đặt cọc"/nút "Đặt vé" (giữ chỗ) — chỉ bán thẳng, xem
  // isSubSeatCode() ở shared/booking.js. Chỉ áp dụng khi TẤT CẢ ghế trong lượt đặt đều là ghế phụ —
  // nhóm gồm cả ghế thường lẫn ghế phụ vẫn đi theo luồng vé thường (có cọc, có "Đặt vé").
  const isSubSeatBooking = seats.length > 0 && typeof isSubSeatCode === 'function' && seats.every(s => isSubSeatCode(s.code));
  const saveBtn = document.getElementById('savePanelBtn');
  const sellBtn = document.getElementById('sellPanelBtn');
  const reprintBtn = document.getElementById('reprintPanelBtn');
  const depositBlockEl = document.querySelector('.deposit-block');
  if (saveBtn) saveBtn.style.display = (isReadOnly || isSubSeatBooking) ? 'none' : '';
  if (sellBtn) sellBtn.style.display = isReadOnly ? 'none' : '';
  if (depositBlockEl) depositBlockEl.style.display = isSubSeatBooking ? 'none' : '';
  // Vé đã bán không tự động in lại (VD: sau khi chuyển ghế) — chỉ hiện nút này để nhân viên chủ động
  // bấm in khi cần (chỉ có ở ticketstaff, callcenter không có #reprintPanelBtn/chức năng in).
  if (reprintBtn) reprintBtn.style.display = isReadOnly ? '' : 'none';
  document.getElementById('panelSeatCode').textContent = seats.map(s => s.code).join(', ');
  document.getElementById('panelTitleMode').textContent = isReadOnly ? 'Thông tin ghế' : (mode === 'edit' ? 'Sửa thông tin ghế' : 'Đặt vé');
  document.getElementById('t_seat').textContent = seat.code;
  document.getElementById('t_price').textContent = seat.price.toLocaleString('vi-VN') + 'đ';
  // Lý do giá 0đ lưu riêng ở seat.zeroPriceReason (không gộp vào seat.note) — mở sửa lại thì trả đúng
  // về ô "Lý do giá 0đ", ô "Ghi chú" chỉ chứa đúng phần ghi chú người dùng gõ.
  const zeroReasonInput = document.getElementById('f_zero_price_reason');
  if (zeroReasonInput) zeroReasonInput.value = (mode === 'edit' && seat.zeroPriceReason) ? seat.zeroPriceReason : '';
  updateZeroPriceReasonVisibility();

  // Cọc tiền lưu riêng ở seat.depositAmount/seat.depositMethod (không gộp vào seat.note/giá vé) —
  // mở sửa lại thì trả đúng về ô "Đặt cọc", giống cách "Lý do giá 0đ" đã làm ở trên.
  const depositEnabledInput = document.getElementById('f_deposit_enabled');
  const depositAmountInput = document.getElementById('f_deposit_amount');
  const depositMethodInputs = document.querySelectorAll('input[name="f_deposit_method"]');
  const hasDeposit = mode === 'edit' && !!seat.depositAmount;
  if (depositEnabledInput) depositEnabledInput.checked = hasDeposit;
  if (depositAmountInput) depositAmountInput.value = hasDeposit ? seat.depositAmount : '';
  depositMethodInputs.forEach(r => { r.checked = r.value === (hasDeposit ? seat.depositMethod : 'Tiền mặt'); });

  // Vé mẫu trước đây luôn hiện cứng "07:00 - Sài Gòn - Châu Đốc • 08/07/2026" bất kể đang mở phơi
  // nào — lấy đúng giờ/tuyến/ngày của phơi đang xem (currentTripId) để hiển thị đúng.
  const tripMeta = (typeof allTripsMeta !== 'undefined' && allTripsMeta) ? allTripsMeta.find(t => t.id === currentTripId) : null;
  const tripRoute = tripMeta ? (tripMeta.route || '') : '';
  const tripTime = tripMeta ? (tripMeta.time || '') : '';
  const tripDateText = tripMeta && tripMeta.date ? formatHistoryDate(tripMeta.date) : '';
  const tripLine = [tripTime, tripDateText].filter(Boolean).join(' • ');
  const panelHeadSub = document.getElementById('panelHeadSub');
  if (panelHeadSub) panelHeadSub.textContent = [tripTime && tripRoute ? `${tripTime} - ${tripRoute}` : (tripRoute || tripTime), tripDateText].filter(Boolean).join(' • ');
  const tRouteEl = document.getElementById('t_route');
  if (tRouteEl) tRouteEl.textContent = tripRoute || '—';
  // Gợi ý Trạm đi/Trạm đến theo phơi đang mở (không đổ cả danh mục trạm) — xem stationsForTrip().
  if (typeof populateBookingStationDatalists === 'function') populateBookingStationDatalists(tripMeta || (tripRoute ? { route: tripRoute } : null));
  const tDatetimeEl = document.getElementById('t_datetime');
  if (tDatetimeEl) tDatetimeEl.textContent = tripLine || '—';
  const batchWrap = document.getElementById('batchChipRow');
  if (seats.length > 1) {
    batchWrap.style.display = 'flex';
    batchWrap.innerHTML = seats.map(s => `<span class="seat-chip">${s.code}</span>`).join('');
  } else {
    batchWrap.style.display = 'none';
  }
  const phoneEl = document.getElementById('f_phone');
  const nameEl = document.getElementById('f_name');
  const noteEl = document.getElementById('f_note');
  const typeEl = document.getElementById('f_type');
  const transshipEl = document.getElementById('f_transship');
  const destinationEl = document.getElementById('f_destination');
  const arrivalTransferEl = document.getElementById('f_arrival_transfer');
  const luggageEl = document.getElementById('f_luggage');
  const luggageNoteEl = document.getElementById('f_luggage_note');
  if (mode === 'edit' && seat) {
    const phones = (seat.phone || '').split(',').map(p => p.trim()).filter(Boolean);
    phoneEl.value = phones[0] || '';
    renderExtraPhoneFields('f_phone_extra', phones.slice(1), 'refreshTicket');
    nameEl.value = seat.customerName || '';
    noteEl.value = seat.note || '';
    typeEl.value = seat.guestType || 'Khách trạm';
    destinationEl.value = seat.lastStop || '';
    // "Địa điểm rước"/"Trung chuyển đi" giờ dùng chung 1 ô combobox (input + datalist, xem f_transship ở
    // ticketstaff.html) cho cả 3 loại khách cần điểm đón — không còn dropdown cố định riêng cho "Rước
    // đường" nữa nên gán thẳng .value là đủ, không lo bị bỏ chọn âm thầm như <select> trước đây.
    if (transshipEl) transshipEl.value = (seat.guestType === 'Trung chuyển' || seat.guestType === 'Rước liền' || seat.guestType === 'Rước đường') ? seat.transshipStation || '' : '';
    if (arrivalTransferEl) arrivalTransferEl.value = seat.arrivalTransfer || '';
    if (luggageEl) luggageEl.checked = !!seat.hasLuggage;
    if (luggageNoteEl) luggageNoteEl.value = seat.hasLuggage ? (seat.luggageNote || '') : '';
    onGuestTypeChange();
    setStationValue(seat.firstStop || DEFAULT_STAFF_STATION);
  } else {
    phoneEl.value = '';
    renderExtraPhoneFields('f_phone_extra', [], 'refreshTicket');
    nameEl.value = '';
    noteEl.value = '';
    typeEl.value = 'Khách trạm';
    destinationEl.value = '';
    if (transshipEl) transshipEl.value = '';
    if (arrivalTransferEl) arrivalTransferEl.value = '';
    if (luggageEl) luggageEl.checked = false;
    if (luggageNoteEl) luggageNoteEl.value = '';
    onGuestTypeChange();
  }
  refreshTicket();
  document.getElementById('bookingOverlay').classList.add('open');
  document.getElementById('savePanelBtnText').textContent = mode === 'edit' ? 'Lưu thay đổi' : 'Đặt vé';
}

function closePanel() {
  currentPanelMode = 'booking';
  currentEditSeatCode = null;
  document.getElementById('bookingOverlay').classList.remove('open');
}

// Giá vé 0đ bắt buộc phải nhập lý do (ô riêng, lưu vào seat.zeroPriceReason — không dùng chung ô
// "Ghi chú"/seat.note) — hiện/ẩn ô này theo giá đang hiển thị trên vé mẫu. Gọi lại mỗi khi giá thay
// đổi (mở panel, sửa giá). Ô này luôn được openBookingPanel() điền sẵn từ seat.zeroPriceReason khi
// sửa 1 ghế đã có giá 0đ từ trước nên không cần bắt gõ lại mỗi lần lưu.
// Dùng chung cho cả giá vé panel đặt vé chính (#t_price) lẫn modal "Đặt lại vé" (#rbPrice, xem
// ticketstaff.html) — truyền đúng id ô giá + tra ra đúng khối "Lý do giá 0đ" tương ứng.
const PRICE_ZERO_REASON_WRAP_BY_ID = { t_price: 'zeroPriceReasonWrap', rbPrice: 'rbZeroPriceReasonWrap' };
function updateZeroPriceReasonVisibility(priceElId) {
  const id = priceElId || 't_price';
  const wrapId = PRICE_ZERO_REASON_WRAP_BY_ID[id] || 'zeroPriceReasonWrap';
  const priceEl = document.getElementById(id);
  const wrap = document.getElementById(wrapId);
  if (!priceEl || !wrap) return;
  const price = parseInt((priceEl.textContent || '').replace(/[^0-9]/g, '')) || 0;
  wrap.style.display = price === 0 ? 'flex' : 'none';
}

/* ---- Nhiều số điện thoại ở ô "Số điện thoại" — dùng chung cho panel đặt vé (wrapId "f_phone_extra")
   và modal "Thông tin khách rước" (wrapId "pickup_phone_extra"). refreshAction là tên hàm global cần
   gọi lại sau khi thêm/xoá 1 ô (vd "refreshTicket", "refreshPickupPreview") để cập nhật phần xem trước. ---- */
function phoneExtraRowHtml(value, refreshAction) {
  return `<div class="phone-extra-row"><input type="tel" class="phone-extra-input" value="${value}" placeholder="09xxxxxxxx" data-input-action="${refreshAction}"><button type="button" class="phone-remove-btn" data-action="removeExtraPhoneField" data-args='["__this__","${refreshAction}"]' title="Bỏ số này">×</button></div>`;
}

function renderExtraPhoneFields(wrapId, phones, refreshAction) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.innerHTML = phones.map(p => phoneExtraRowHtml(p, refreshAction)).join('');
}

function addExtraPhoneField(wrapId, refreshAction) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.insertAdjacentHTML('beforeend', phoneExtraRowHtml('', refreshAction));
}

function removeExtraPhoneField(btnEl, refreshAction) {
  const row = btnEl.closest('.phone-extra-row');
  if (row) row.remove();
  if (refreshAction && typeof window[refreshAction] === 'function') window[refreshAction]();
}

// Gộp số điện thoại chính + các số thêm vào 1 chuỗi, cách nhau bởi ", " — giữ phone vẫn là 1 chuỗi
// như trước (mọi chỗ tìm kiếm/hiển thị SĐT khác đều đọc chuỗi này, tìm theo kiểu "chứa" nên vẫn tìm
// đúng dù có nhiều số).
function collectPhoneValues(mainFieldId, wrapId) {
  const main = (document.getElementById(mainFieldId)?.value || '').trim();
  const wrap = document.getElementById(wrapId);
  const extras = wrap ? Array.from(wrap.querySelectorAll('.phone-extra-input')).map(el => el.value.trim()) : [];
  return [main, ...extras].filter(Boolean).join(', ');
}

function pickSearchResult() {
  document.getElementById('searchResults').classList.remove('open');
  showToast('Đã điều hướng đến đúng phơi xe và ghế của khách');
}

function toggleSearchResults(force) {
  const el = document.getElementById('searchResults');
  if (force === true) { el.classList.add('open'); return; }
  el.classList.toggle('open');
}

function toggleCalendar(force) {
  calendarOpen = typeof force === 'boolean' ? force : !calendarOpen;
  document.getElementById('calendarPanel').classList.toggle('open', calendarOpen);
  document.getElementById('calTrigger').classList.toggle('open', calendarOpen);
}

function getStationValue() {
  return document.getElementById('f_station_select').value;
}

// #f_station_select giờ là 1 ô combobox (input tự do + datalist gợi ý, xem initDatalistCombobox() ở
// shared/booking.js), không còn là <select> chỉ nhận đúng 1 trong các option cố định nữa — gán thẳng
// .value luôn được, không cần kiểm tra "hasOption" như trước (kiểm tra đó từng khiến setStationValue()
// im lặng bỏ qua nếu seat.firstStop không khớp đúng 1 option, làm mất giá trị thật đã lưu).
function setStationValue(val) {
  document.getElementById('f_station_select').value = val || '';
}

function setSelectOptionValue(selectId, val) {
  const sel = document.getElementById(selectId);
  if (!sel || !val) return;
  const exists = Array.from(sel.options).some(opt => opt.value === val || opt.text === val);
  if (!exists) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.text = val;
    sel.add(opt);
  }
  sel.value = val;
}
