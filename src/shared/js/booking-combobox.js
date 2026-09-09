/* ===================== "Trạm đi"/"Trạm đến"/"Địa điểm rước" — Searchable Combobox ===================== */
// Cả 3 ô này trước đây mỗi ô 1 kiểu khác nhau (select cố định, hoặc input list="..." datalist) — mở/đóng
// không nhất quán giữa trình duyệt, không tự bôi đen text, không lọc real-time đáng tin cậy, không có
// trạng thái "không tìm thấy", không điều khiển được bằng bàn phím. initDatalistCombobox() dựng 1 kiểu
// dropdown chung cho cả 3, gắn thẳng vào <body> với position:fixed (tính lại toạ độ theo input mỗi lần
// mở/cuộn/resize) để không bao giờ bị .panel-body (overflow-y:auto) cắt mất dù các ô này đều nằm trong
// đó. Danh sách gợi ý đọc từ đúng <datalist> có sẵn của từng ô (không thêm/đổi dữ liệu).
function initDatalistCombobox(inputId, datalistId, emptyMessage) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.setAttribute('autocomplete', 'off');

  let dropdownEl = null;
  let currentOptions = [];
  let highlightedIndex = -1;
  // Bấm chọn 1 option xong, focus vẫn còn nguyên trên input (xem mousedown bên dưới) — không được coi
  // đây là 1 lượt "focus mới" nữa vì handler 'focus' sẽ tự bôi đen + mở lại toàn bộ danh sách, trái với
  // yêu cầu "không trigger lại việc select toàn bộ text ngay sau khi option được chọn".
  let justSelected = false;

  function getOptionValues() {
    return Array.from(document.querySelectorAll(`#${datalistId} option`))
      .map(o => o.value)
      .filter(Boolean);
  }

  function ensureDropdown() {
    if (dropdownEl) return dropdownEl;
    dropdownEl = document.createElement('div');
    dropdownEl.className = 'datalist-combo-dropdown';
    document.body.appendChild(dropdownEl);
    return dropdownEl;
  }

  function isOpen() {
    return !!dropdownEl && dropdownEl.classList.contains('open');
  }

  function positionDropdown() {
    if (!dropdownEl) return;
    const rect = input.getBoundingClientRect();
    dropdownEl.style.left = rect.left + 'px';
    dropdownEl.style.top = (rect.bottom + 4) + 'px';
    dropdownEl.style.width = rect.width + 'px';
  }

  function renderOptions(list) {
    const dd = ensureDropdown();
    currentOptions = list;
    highlightedIndex = -1;
    dd.innerHTML = list.length
      ? list.map((opt, i) => `<div class="datalist-combo-option" data-index="${i}">${escapeHtml(opt)}</div>`).join('')
      : `<div class="datalist-combo-empty">${escapeHtml(emptyMessage)}</div>`;
  }

  function openDropdown(filterText) {
    const all = getOptionValues();
    const query = (filterText || '').trim().toLowerCase();
    renderOptions(query ? all.filter(o => o.toLowerCase().includes(query)) : all);
    positionDropdown();
    ensureDropdown().classList.add('open');
  }

  function closeDropdown() {
    if (dropdownEl) dropdownEl.classList.remove('open');
    highlightedIndex = -1;
  }

  function updateHighlight() {
    if (!dropdownEl) return;
    dropdownEl.querySelectorAll('.datalist-combo-option').forEach((el, i) => {
      const active = i === highlightedIndex;
      el.classList.toggle('highlighted', active);
      if (active) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function selectValue(value) {
    input.value = value;
    closeDropdown();
    justSelected = true;
    // events.js chỉ nghe event 'input' thật để chạy data-input-action="refreshTicket" — gán .value bằng
    // JS không tự bắn event, phải tự dispatch để phần xem trước vé cập nhật ngay theo giá trị vừa chọn.
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  input.addEventListener('focus', () => {
    if (justSelected) { justSelected = false; return; }
    input.select();
    openDropdown('');
  });

  // Input đã đang focus sẵn thì 'focus' không bắn lại — vẫn cần 'click' để bấm lại lần nữa sau khi đã
  // chọn 1 giá trị (bôi đen + mở lại toàn bộ danh sách) vẫn hoạt động đúng.
  input.addEventListener('click', () => {
    input.select();
    openDropdown('');
  });

  input.addEventListener('input', () => {
    openDropdown(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen()) { openDropdown(input.value); return; }
      if (currentOptions.length) {
        highlightedIndex = (highlightedIndex + 1) % currentOptions.length;
        updateHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen()) { openDropdown(input.value); return; }
      if (currentOptions.length) {
        highlightedIndex = (highlightedIndex - 1 + currentOptions.length) % currentOptions.length;
        updateHighlight();
      }
    } else if (e.key === 'Enter') {
      if (isOpen() && highlightedIndex >= 0 && currentOptions[highlightedIndex] !== undefined) {
        e.preventDefault();
        selectValue(currentOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isOpen()) {
        e.preventDefault();
        closeDropdown();
      }
    }
    // Backspace/Delete/Tab: không can thiệp, giữ nguyên hành vi mặc định của trình duyệt.
  });

  // Bắt buộc dùng 'mousedown' + preventDefault() (không phải 'click') trên option — 'click' bắn SAU
  // 'blur', nên nếu chỉ nghe 'click' thì input đã blur/đóng dropdown trước khi lựa chọn được xử lý, làm
  // mất lượt bấm (lỗi kinh điển "chọn option bị mất do input blur trước"). preventDefault() ở mousedown
  // chặn luôn việc input mất focus, nên không có 'blur' nào xảy ra ở giữa cả.
  document.addEventListener('mousedown', (e) => {
    const optionEl = e.target.closest('.datalist-combo-option');
    if (optionEl && dropdownEl && dropdownEl.contains(optionEl)) {
      e.preventDefault();
      const idx = parseInt(optionEl.getAttribute('data-index'), 10);
      if (currentOptions[idx] !== undefined) selectValue(currentOptions[idx]);
      return;
    }
    if (e.target === input) return;
    if (isOpen() && dropdownEl && !dropdownEl.contains(e.target)) closeDropdown();
  });

  input.addEventListener('blur', () => {
    // Rời input bằng Tab/click ra ngoài không qua option (bấm option đã được giữ focus nhờ
    // preventDefault() ở mousedown nên không rơi vào đây) — đóng dropdown lại cho gọn.
    closeDropdown();
  });

  window.addEventListener('scroll', () => { if (isOpen()) positionDropdown(); }, true);
  window.addEventListener('resize', () => { if (isOpen()) positionDropdown(); });
}

initDatalistCombobox('f_transship', 'stopPointList', 'Không tìm thấy địa điểm');
initDatalistCombobox('f_station_select', 'departureStationList', 'Không tìm thấy trạm');
initDatalistCombobox('f_destination', 'destinationStationList', 'Không tìm thấy trạm');

function onRebookGuestTypeChange() {
  const type = document.getElementById('rbGuestType')?.value || 'Khách trạm';
  const stationLabel = document.getElementById('rbStationLabel');
  const transshipWrap = document.getElementById('rbTransshipWrap');
  const transshipLabel = document.getElementById('rbTransshipLabel');
  const transshipSelect = document.getElementById('rbTransshipSelect');
  const transshipInput = document.getElementById('rbTransshipInput');
  const stationRow = document.getElementById('rbStationRow');

  const isTransshipLike = (type === 'Trung chuyển');
  if (type === 'Rước đường') {
    if (stationLabel) stationLabel.textContent = 'Trạm đi';
    if (transshipLabel) transshipLabel.textContent = 'Địa điểm rước';
    if (transshipSelect) transshipSelect.style.display = 'block';
    if (transshipInput) transshipInput.style.display = 'none';
    if (transshipWrap) transshipWrap.style.display = 'flex';
  } else {
    if (stationLabel) stationLabel.textContent = 'Trạm đi';
    if (transshipSelect) transshipSelect.style.display = 'none';
    if (transshipInput) {
      transshipInput.style.display = isTransshipLike ? 'block' : 'none';
      transshipInput.placeholder = isTransshipLike ? 'Nơi trung chuyển...' : 'Nhập địa điểm rước...';
    }
    if (transshipLabel) transshipLabel.textContent = isTransshipLike ? 'Trung chuyển đi' : 'Địa điểm rước';
    if (transshipWrap) transshipWrap.style.display = isTransshipLike ? 'flex' : 'none';
  }
  if (stationRow) stationRow.style.setProperty('--cols', (!transshipWrap || transshipWrap.style.display === 'none') ? 1 : 2);
}

function openCustomerHistory(phone, pushHistory = true) {
  fillSearchInputWithPhone(phone);
  historyColumnFilters = {};
  const results = searchCustomerByPhone(phone);
  _rawHistoryResults = results;

  if (!results.length) {
    showToast('Không tìm thấy vé phù hợp với: ' + phone, 'error');
    return;
  }
  customerHistoryActive = true;
  currentSearchPhone = phone;

  if (pushHistory) {
    try {
      if (!history.state || history.state.view !== 'customerHistory' || history.state.phone !== phone) {
        history.pushState({ view: 'customerHistory', phone }, '', '#history-' + encodeURIComponent(phone));
      }
    } catch (err) { }
  }

  const firstResult = results[0];
  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setTxt('chName', firstResult.name || 'Khách hàng');
  setTxt('chPhone', firstResult.phone || phone);
  setTxt('chAvatar', (firstResult.name || 'K').charAt(0).toUpperCase());

  renderHistorySeatMap(results);

  const rightCol = document.querySelector('.right-col');
  if (rightCol) {
    ['.zone2', '.tabs'].forEach(sel => {
      const el = rightCol.querySelector(sel);
      if (el) el.style.display = 'none';
    });
    // Thanh chọn ghế lấy theo id (xem updateTransferBarVisibility) — '.sticky-actions' sẽ trúng nhầm #tsPrintActionBar.
    const seatTransferBar = document.getElementById('seatTransferBar');
    if (seatTransferBar) seatTransferBar.style.display = 'none';
    rightCol.querySelectorAll('.zone3').forEach(el => el.style.display = 'none');
  }

  const chView = document.getElementById('customerHistoryView');
  if (chView) chView.style.display = 'flex';
  const sr = document.getElementById('searchResults');
  if (sr) sr.classList.remove('open');
}

function openGroupBookingFromSelection() {
  if (!multiSelectMode || selectedTargetSeats.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 ghế trống để đặt vé nhóm');
    return;
  }
  const seats = selectedTargetSeats.map(code => findSeat(code)).filter(Boolean);
  if (seats.length === 0) {
    showToast('Không tìm thấy ghế đã chọn');
    return;
  }
  openBookingPanel(seats);
}

// Nút "Chỉnh sửa" trên thẻ vé ở view "Tìm kiếm vé khách hàng" (renderHistorySeatCardHtml — chỉ chứa vé
// TRONG NGÀY, xem searchCustomerByPhone) gọi hàm này — chuyển đúng phơi (dùng lại goToTripFromHistory)
// rồi mở panel sửa ghế y hệt bên sơ đồ vé (openBookingPanel mode 'edit'), thay vì mở form đặt lại vé mới.
// Trang "Lịch sử hành khách" (renderPassengerHistoryRowHtml) KHÔNG dùng hàm này — trang đó gồm cả vé quá
// khứ đã kết thúc (CUSTOMER_HISTORY_DATA, không còn ghế sống để sửa) nên vẫn dùng openRebookFromHistory.
function openEditFromHistory(idx) {
  const list = window._historyResults || _historyResults || _rawHistoryResults || [];
  const r = list[idx];
  if (!r) { showToast('Không tìm thấy dữ liệu vé để sửa', 'error'); return; }

  const switched = goToTripFromHistory(null, idx, false);
  if (!switched) return; // goToTripFromHistory đã tự báo toast lỗi (chuyến quá cũ/không còn phơi)

  const codes = (r.seat || '').split(',').map(s => s.trim()).filter(Boolean);
  const seats = codes.map(c => findSeat(c)).filter(Boolean);
  if (!seats.length) { showToast('Không tìm thấy ghế để sửa', 'error'); return; }
  openBookingPanel(seats, { mode: 'edit' });
}

// Nút "Đặt lại vé" trong bảng trang "Lịch sử hành khách" (renderPassengerHistoryRowHtml) gọi hàm này —
// trang đó gồm cả vé quá khứ đã kết thúc, không còn ghế sống để "sửa" nên tạo vé đặt lại mới thay vì mở
// panel sửa (khác với view "Tìm kiếm vé khách hàng", chỉ vé trong ngày, dùng openEditFromHistory).
function openRebookFromHistory(idx) {
  try {
    // idx là vị trí trong mảng kết quả lịch sử (window._historyResults) — mỗi thẻ lịch sử render trực
    // tiếp từ mảng này (renderHistoryCardHtml), nên idx của mỗi thẻ trùng đúng vị trí trong mảng.
    const list = window._historyResults || _historyResults || _rawHistoryResults || [];
    const r = list[idx];
    if (!r) { showToast('Không tìm thấy dữ liệu vé để đặt lại', 'error'); return; }

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('rbName', r.name || '');
    setVal('rbPhone', r.phone || currentSearchPhone || '');

    const guestType = r.guestType || 'Khách trạm';
    setVal('rbGuestType', guestType);
    onRebookGuestTypeChange();

    setSelectOptionValue('rbFirstStop', r.firstStop || '508 Kinh Dương Vương');
    // Cùng công thức fallback với getHistoryStopsDisplay() — giữ nhất quán giữa thông tin hiển thị ở
    // danh sách lịch sử và thông tin điền sẵn vào form đặt lại vé (trước đây thiếu transshipStation/
    // fromTransfer nên có trường hợp danh sách hiện thông tin nhưng form đặt lại vé lại trống).
    const pickupVal = r.transshipStation || r.transship || r.pickupAddress || r.fromTransfer || '';
    const transshipInput = document.getElementById('rbTransshipInput');
    const transshipSelect = document.getElementById('rbTransshipSelect');
    if (guestType === 'Rước đường' && transshipSelect) setSelectOptionValue('rbTransshipSelect', pickupVal);
    if (transshipInput) transshipInput.value = pickupVal;

    setSelectOptionValue('rbLastStop', r.lastStop || 'Trạm Châu Đốc');
    const arrTransEl = document.getElementById('rbArrivalTransfer');
    if (arrTransEl) arrTransEl.value = r.dropoffAddress || r.arrivalTransfer || (guestType === 'Trung chuyển' ? (r.transshipStation || r.transship || '') : '');

    setVal('rbNote', r.note || '');
    const luggageEl = document.getElementById('rbLuggage');
    if (luggageEl) luggageEl.checked = !!r.hasLuggage;

    // Reset cọc mỗi lần mở lại modal — tránh giữ số tiền/tick cọc của lần đặt lại vé trước đó.
    const depositEl = document.getElementById('rbDepositEnabled');
    if (depositEl) depositEl.checked = false;
    const depositAmountEl = document.getElementById('f_deposit_amount');
    if (depositAmountEl) depositAmountEl.value = '';
    if (typeof updateRebookDepositHint === 'function') updateRebookDepositHint();

    const zeroReasonEl = document.getElementById('rbZeroPriceReason');
    if (zeroReasonEl) zeroReasonEl.value = '';

    const subEl = document.getElementById('rbSubtitle');
    if (subEl) subEl.textContent = `Đặt lại từ vé cũ: ${r.route} (${r.time}) — Ghế ${r.seat}`;

    rebookSelectedSeats = [];
    rebookSelectedTripId = null;
    // Reset giá vé về mặc định SAU KHI đã xoá rebookSelectedTripId ở trên — chưa chọn phơi nào nên chưa
    // có giá thật, sẽ được updateRebookPricePreview() ghi đè đúng giá của phơi ngay khi nhân viên chọn
    // phơi bên dưới (selectRebookTrip()). Gọi trước đó sẽ lỡ lấy nhầm giá của phơi ở lần đặt lại trước.
    if (typeof updateRebookPricePreview === 'function') updateRebookPricePreview();
    rbSelectedDateStr = rbTodayStr();
    rbCalDate = new Date();
    rbUpdateCalTrigger();
    rbRenderCalendar();
    setVal('rbFilterTime', 'all');
    renderRebookTripList();

    const mapEl = document.getElementById('rbSeatMap');
    if (mapEl) mapEl.innerHTML = '<p class="ch-seat-placeholder">Vui lòng chọn phơi xe trước</p>';

    updateRebookBtn();

    const modal = document.getElementById('rebookModal');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
      modal.style.setProperty('display', 'flex', 'important');
    } else {
      showToast('Không tìm thấy giao diện đặt lại vé (rebookModal)', 'error');
    }
  } catch (err) {
    console.error('Error opening rebook modal:', err);
    showToast('Lỗi mở khung đặt lại vé: ' + err.message, 'error');
  }
}

function openSeatMenu(ev, seat) {
  if (blockIfMultiSelectActive()) return;
  const menu = document.getElementById('seatMenu');
  menu.innerHTML = `
    <button data-action="closeSeatMenuAndStartTransfer" data-args='${JSON.stringify([seat.code])}'>Chuyển vé</button>
  `;
  const rect = ev.target.closest('.seat-card').getBoundingClientRect();
  menu.style.top = (window.scrollY + rect.bottom + 4) + 'px';
  menu.style.left = (window.scrollX + rect.left) + 'px';
  menu.classList.add('open');
  ev.stopPropagation();
}

function renderCancelledSeats() {
  const section = document.getElementById('cancelledSeatsSection');
  const list = document.getElementById('cancelledSeatsList');
  if (!section || !list) return;

  // Danh sách rút gọn cuối Zone 3 chỉ hiện vé hủy CHƯA được chuyển ghế (còn cần xử lý) — vé đã chuyển
  // vẫn còn nguyên trong cancelledSeats và vẫn hiện đủ ở tab "Ghế hủy" (Zone 2) để lưu vết lịch sử.
  const activeCancelled = (cancelledSeats || []).filter(c => !c.restored);
  if (activeCancelled.length === 0) {
    section.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  section.style.display = '';

  const totalSeats = [...seatPlanDown, ...seatPlanUp].filter(s => s.state !== 'hidden').length;
  const useThreeCols = totalSeats >= 34;
  list.classList.toggle('cols-3', useThreeCols);

  list.innerHTML = activeCancelled.map(cancelledSeatCard).join('');
}

/* ---- Chuyển ghế từ danh sách ghế hủy sang 1 ghế trống ở phơi bất kỳ — tái dùng nguyên cơ chế
   "chuyển ghế" sẵn có (multiSelectMode/selectionMode='transfer', thanh .sticky-actions, chọn phơi
   khác ở Zone 1 trong lúc chọn). Khác transfer thường ở chỗ nguồn là 1 bản ghi trong cancelledSeats
   (không phải ghế đang có khách) nên KHÔNG xoá/clear gì ở "nguồn" — chỉ áp dữ liệu vào ghế đích, giữ
   nguyên bản ghi trong cancelledSeats để lưu vết (không xoá). */
// Tra bản ghi vé hủy theo ĐÚNG phơi nguồn (transferSourceTripId), không dùng biến toàn cục
// cancelledSeats trực tiếp — biến đó phản ánh phơi ĐANG XEM, mà trong lúc chuyển ghế người dùng có
// thể đã bấm sang phơi khác ở Zone 1 (để chọn ghế đích) nên cancelledSeats lúc đó là của phơi đích.
function findCancelledRecordInTrip(tripId, cancelId) {
  const bank = tripSeatBank[tripId];
  const list = (bank && bank.cancelledSeats) || (tripId === currentTripId ? cancelledSeats : null) || [];
  return list.find(c => c.id === cancelId);
}

function startTransferFromCancelled(cancelId) {
  if (blockIfMultiSelectActive()) return;
  const record = (cancelledSeats || []).find(c => c.id === cancelId);
  if (!record) { showToast('Không tìm thấy vé đã hủy này'); return; }
  multiSelectMode = true;
  selectionMode = 'transfer';
  selectedSourceSeats = [];
  selectedTargetSeats = [];
  transferSourceCancelId = cancelId;
  transferSourceTripId = currentTripId;
  transferTargetTripId = currentTripId;
  document.querySelectorAll('.seat-card').forEach(c => { c.style.outline = 'none'; });
  updateTransferHint();
  showToast(`Đã chọn vé hủy của ${record.customerName || 'khách'}. Bấm ghế trống để chuyển sang (có thể chọn chuyến khác ở Zone 1).`);
}

function confirmRestoreFromCancelled() {
  const record = findCancelledRecordInTrip(transferSourceTripId, transferSourceCancelId);
  if (!record || selectedTargetSeats.length === 0) {
    showToast('Vui lòng chọn 1 ghế trống để chuyển vé hủy sang');
    return;
  }
  const targetTripId = transferTargetTripId || currentTripId;
  const targetCode = selectedTargetSeats[0];
  const targetSeat = findSeatInTrip(targetTripId, targetCode);
  if (!targetSeat || targetSeat.state !== 'empty') {
    showToast('Ghế đích không còn trống, vui lòng chọn ghế khác');
    return;
  }

  Object.assign(targetSeat, {
    state: 'hold',
    customerName: record.customerName,
    phone: record.phone,
    firstStop: record.firstStop,
    lastStop: record.lastStop,
    price: record.price,
    note: record.note,
    ticketNo: record.ticketNo,
    paid: false,
    count: 1
  });
  // Không xoá record khỏi cancelledSeats — giữ lại để lưu vết theo yêu cầu nghiệp vụ (tab "Ghế hủy"
  // vẫn hiện đủ mọi bản ghi). Chỉ đánh dấu "restored" để danh sách rút gọn cuối Zone 3 (nơi để bấm
  // chuyển ghế) ẩn bớt các vé đã xử lý xong, tránh chuyển nhầm lần 2 vào cùng 1 vé hủy.
  const trip = allTripsMeta.find(t => t.id === targetTripId);
  record.restored = true;
  record.restoredToSeat = targetCode;
  record.restoredToTripLabel = trip ? trip.time : '';
  record.restoredAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');

  saveSeatBank();
  if (targetTripId === currentTripId) renderSeats();
  renderCancelledSeats();
  if (document.getElementById('zone3Passengers') && document.getElementById('zone3Passengers').style.display !== 'none' && typeof renderPassengerList === 'function') {
    renderPassengerList();
  }
  if (typeof renderCancelledListTable === 'function') renderCancelledListTable();

  const restoredName = record.customerName;
  exitMultiSelectMode();
  showToast(`Đã chuyển vé hủy của ${restoredName || 'khách'} sang ghế ${targetCode}${trip ? ' · phơi ' + trip.time : ''}`);
}

function renderLiveSearchResults(query) {
  const dropdown = document.getElementById('searchResults');
  if (!dropdown) return;
  if (!query || !query.trim().length) {
    dropdown.classList.remove('open');
    return;
  }

  const custMatches = searchCustomerByPhone(query);
  const customerMap = new Map();
  custMatches.forEach(m => {
    const key = `${m.phone || ''}_${m.name || ''}`;
    if (!customerMap.has(key)) customerMap.set(key, m);
  });
  const topCustMatches = Array.from(customerMap.values()).slice(0, 5);

  let html = '';
  if (topCustMatches.length) {
    html += topCustMatches.map(m => {
      const phoneDisp = m.phone ? ` (<span style="color:var(--red);font-weight:700;">${m.phone}</span>)` : '';
      return `
        <div class="search-result-row" data-action="searchResultRowClick" data-args='${JSON.stringify([m.phone || '', m.phone || m.name])}'>
          <div>
            <div class="src-name">${m.name || 'Khách hàng'}${phoneDisp}</div>
            <div class="src-meta">${m.route} • ${m.time} • Ghế ${m.seat}</div>
          </div>
        </div>`;
    }).join('');
  }
  if (!html) {
    html = '<div class="search-result-row" style="color:var(--text-sub);justify-content:center;padding:12px;">Không tìm thấy kết quả phù hợp</div>';
  }
  dropdown.innerHTML = html;
  dropdown.classList.add('open');
}

function renderMiniSeatMap(tripId) {
  const container = document.getElementById('rbSeatMap');
  if (!container) return;
  const bank = tripSeatBank?.[tripId];
  if (!bank) {
    container.innerHTML = '<p class="ch-seat-placeholder">Không có dữ liệu phơi xe</p>';
    return;
  }
  const downSeats = bank.down || [];
  const upSeats = bank.up || [];
  const validDown = downSeats.filter(s => s.state !== 'hidden');
  const validUp = upSeats.filter(s => s.state !== 'hidden');
  const colsClass = (validDown.length + validUp.length) >= 34 ? 'cols-3' : '';

  container.innerHTML = `
    <div class="ch-mini-floors">
      <div class="ch-mini-floor">
        <div class="ch-mini-floor-title">TẦNG DƯỚI</div>
        <div class="ch-mini-grid ${colsClass}">${downSeats.map(s => miniSeatHtml(s, tripId)).join('')}</div>
      </div>
      <div class="ch-mini-floor">
        <div class="ch-mini-floor-title">TẦNG TRÊN</div>
        <div class="ch-mini-grid ${colsClass}">${upSeats.map(s => miniSeatHtml(s, tripId)).join('')}</div>
      </div>
    </div>`;
}

