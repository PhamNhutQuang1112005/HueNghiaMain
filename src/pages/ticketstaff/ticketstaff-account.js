/* ===================== TÀI KHOẢN / ĐĂNG XUẤT ===================== */
(function initUserMenu() {
  const menu = document.getElementById('userMenu');
  const chipBtn = document.getElementById('userChipBtn');
  const dropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');
  if (!menu || !chipBtn || !dropdown || !logoutBtn) return;

  // Hiển thị thông tin người dùng từ phiên đăng nhập (nếu có)
  const user = Session.get();
  if (user) {
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const roleEl = document.getElementById('userRoleLabel');
    const userEl = document.getElementById('userUsername');
    const display = user.username || 'Nhân viên';
    if (nameEl) nameEl.textContent = display;
    if (avatarEl) avatarEl.textContent = display.charAt(0).toUpperCase();
    if (roleEl) roleEl.textContent = user.roleLabel || 'Nhân viên tổng đài';
    if (userEl) userEl.textContent = user.username || '';
  }

  function closeMenu() {
    menu.classList.remove('open');
    chipBtn.setAttribute('aria-expanded', 'false');
    dropdown.hidden = true;
  }
  function openMenu() {
    menu.classList.add('open');
    chipBtn.setAttribute('aria-expanded', 'true');
    dropdown.hidden = false;
  }

  chipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.classList.contains('open')) closeMenu();
    else openMenu();
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  logoutBtn.addEventListener('click', () => {
    Session.clear();
    window.location.href = 'index.html';
  });
})();

/* ===================== CUSTOMER HISTORY SEARCH ===================== */

let customerHistoryActive = false;
let currentSearchPhone = '';
let rebookSelectedSeats = [];
let rebookSelectedTripId = null;
let _historyResults = [];
let _rawHistoryResults = [];
let historyColumnFilters = {};
let activePopoverColKey = null;

window.addEventListener('popstate', function (e) {
  const s = e.state;
  if (s?.view === 'customerHistory' && s.phone) {
    openCustomerHistory(s.phone, false);
  } else if (s?.view === 'trip' && s.tripId) {
    if (customerHistoryActive) closeCustomerHistory();
    const card = document.querySelector(`.trip-card[data-trip="${s.tripId}"]`);
    if (card) {
      const tripMeta = allTripsMeta?.find(t => t.id === s.tripId);
      selectTrip(card, tripMeta?.time, tripMeta?.route);
    }
  } else if (customerHistoryActive) {
    closeCustomerHistory();
  }
});

// Đọc chung các trường form của modal "Đặt lại vé" — dùng cho cả "Đặt vé" (confirmRebook, giữ chỗ chưa
// thanh toán) lẫn "Bán vé" (confirmRebookAndSell, thanh toán ngay). Trước đây confirmRebookAndSell() đọc
// thẳng các biến name/phone/guestType/... không hề tồn tại trong scope của nó (lỗi ReferenceError, bấm
// "Bán vé" ở modal này luôn crash) — gom lại 1 hàm đọc form duy nhất để không lặp lại lỗi đó.
function readRebookForm() {
  const getVal = id => document.getElementById(id)?.value?.trim() || '';
  const guestType = document.getElementById('rbGuestType')?.value || 'Khách trạm';
  return {
    name: getVal('rbName'),
    phone: getVal('rbPhone'),
    guestType,
    firstStop: document.getElementById('rbFirstStop').value,
    transship: guestType === 'Rước đường'
      ? (document.getElementById('rbTransshipSelect')?.value || '')
      : (document.getElementById('rbTransshipInput')?.value?.trim() || ''),
    lastStop: document.getElementById('rbLastStop').value,
    arrivalTransfer: getVal('rbArrivalTransfer'),
    note: getVal('rbNote'),
    hasLuggage: document.getElementById('rbLuggage')?.checked || false
  };
}

// Đọc + validate giá vé đã sửa ở ô #rbPrice (0đ bắt buộc phải có lý do, giống hệt getEditedPrice()/
// sellTicket() ở ticketstaff.js) — dùng chung cho cả "Đặt vé" lẫn "Bán vé" trong modal Đặt lại vé.
function readAndValidateRebookPrice() {
  const price = (typeof getEditedPrice === 'function') ? getEditedPrice('rbPrice') : 280000;
  const zeroReasonEl = document.getElementById('rbZeroPriceReason');
  if (price === 0 && !(zeroReasonEl?.value.trim())) {
    showToast('Vui lòng nhập lý do khi giá vé 0đ', 'error');
    return null;
  }
  return { price, zeroPriceReason: price === 0 ? zeroReasonEl.value.trim() : '' };
}

// Cọc áp dụng chung cho cả nhóm ghế đang đặt lại/bán lại (giống panel đặt vé chính) — kiểm tra hợp lệ
// so với giá vé (đã sửa nếu có) chung cho cả nhóm (currentPanelSeats/sellTicket() ở ticketstaff.js
// cũng chỉ so với 1 mức giá chung cho cả nhóm, không phải tổng giá trị nhiều ghế).
function readAndValidateRebookDeposit(referencePrice) {
  const depositEnabled = document.getElementById('rbDepositEnabled')?.checked || false;
  const depositAmountRaw = parseInt(document.getElementById('f_deposit_amount').value, 10) || 0;
  if (depositEnabled && depositAmountRaw <= 0) {
    showToast('Vui lòng nhập số tiền cọc', 'error');
    return null;
  }
  if (depositEnabled && depositAmountRaw > referencePrice) {
    showToast('Số tiền cọc không được lớn hơn giá vé', 'error');
    return null;
  }
  const depositMethod = depositEnabled ? (document.querySelector('input[name="f_deposit_method"]:checked')?.value || 'Tiền mặt') : '';
  return { depositEnabled, depositAmount: depositEnabled ? depositAmountRaw : 0, depositMethod };
}

function confirmRebook() {
  const form = readRebookForm();
  if (!form.name || !form.phone) { showToast('Vui lòng nhập họ tên và SĐT', 'error'); return; }
  if (!rebookSelectedTripId || !rebookSelectedSeats.length) { showToast('Vui lòng chọn chuyến và ghế', 'error'); return; }

  const bank = tripSeatBank[rebookSelectedTripId];
  if (!bank) { showToast('Lỗi dữ liệu chuyến', 'error'); return; }

  const allSeats = [...(bank.down || []), ...(bank.up || [])];
  const targetSeats = rebookSelectedSeats.map(code => allSeats.find(s => s.code === code)).filter(s => s && s.state === 'empty');
  if (!targetSeats.length) { showToast('Không thể đặt ghế đã chọn', 'error'); return; }

  const priceInfo = readAndValidateRebookPrice();
  if (!priceInfo) return;

  const deposit = readAndValidateRebookDeposit(priceInfo.price);
  if (!deposit) return;

  const tripMeta = allTripsMeta.find(t => t.id === rebookSelectedTripId);
  const prefix = (tripMeta?.route?.includes('Sài Gòn')) ? 'SGCD' : 'CDSG';
  const newTicketNo = `${prefix}-${Math.floor(Math.random() * 9000) + 1000}`;
  const staffCode = (typeof getCurrentActionStaffCode === 'function') ? getCurrentActionStaffCode() : 'system';

  targetSeats.forEach(seat => {
    Object.assign(seat, {
      state: 'hold',
      customerName: form.name,
      phone: form.phone,
      guestType: form.guestType,
      firstStop: form.firstStop,
      transshipStation: form.transship,
      lastStop: form.lastStop,
      arrivalTransfer: form.arrivalTransfer,
      note: form.note,
      hasLuggage: form.hasLuggage,
      ticketNo: newTicketNo,
      paid: false,
      count: targetSeats.length,
      staff: staffCode,
      price: priceInfo.price,
      zeroPriceReason: priceInfo.zeroPriceReason,
      depositAmount: deposit.depositAmount,
      depositMethod: deposit.depositMethod,
      actionTime: new Date().toISOString()
    });
  });

  saveSeatBank();
  if (currentTripId === rebookSelectedTripId) {
    seatPlanDown = bank.down;
    seatPlanUp = bank.up;
    renderSeats();
  }
  showToast(`Đặt lại thành công ${targetSeats.length} ghế cho ${form.name}`);
  closeRebookModal();
  refreshHistoryViewsAfterBooking(form.phone);
}

// "Bán vé" trong modal Đặt lại vé — validate xong thì KHÔNG bán ngay, mở modal xác nhận phương thức
// thanh toán (#sellPaymentModal, y chang panel đặt vé chính) trước; việc bán thật sự chuyển sang nhánh
// pendingRebookSell trong confirmSellPayment() (ticketstaff.js).
function confirmRebookAndSell() {
  const form = readRebookForm();
  if (!form.name || !form.phone) { showToast('Vui lòng nhập họ tên và SĐT', 'error'); return; }
  if (!rebookSelectedTripId || !rebookSelectedSeats.length) { showToast('Vui lòng chọn chuyến và ghế', 'error'); return; }

  const bank = tripSeatBank[rebookSelectedTripId];
  if (!bank) { showToast('Lỗi dữ liệu chuyến', 'error'); return; }

  const allSeats = [...(bank.down || []), ...(bank.up || [])];
  const targetSeats = rebookSelectedSeats.map(code => allSeats.find(s => s.code === code)).filter(s => s && s.state === 'empty');
  if (!targetSeats.length) { showToast('Không thể bán ghế đã chọn', 'error'); return; }

  const priceInfo = readAndValidateRebookPrice();
  if (!priceInfo) return;

  const deposit = readAndValidateRebookDeposit(priceInfo.price);
  if (!deposit) return;

  pendingRebookSell = {
    tripId: rebookSelectedTripId,
    seatCodes: rebookSelectedSeats.slice(),
    form,
    priceInfo,
    deposit
  };

  document.querySelectorAll('input[name="sellPaymentMethod"]').forEach(r => { r.checked = r.value === 'Tiền mặt'; });
  document.getElementById('sellPaymentModal').classList.add('open');
}

// Hook into search input
(function () {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.querySelector('.search-btn');

  function handlePhoneSearch() {
    if (!searchInput) return;
    const raw = searchInput.value.trim();
    if (raw.length > 0) {
      openCustomerHistory(raw);
    } else {
      showToast('Vui lòng nhập số điện thoại, tên hoặc mã vé để tìm kiếm', 'warning');
    }
  }

  if (searchInput) {
    let liveSearchDebounceTimer = null;
    searchInput.addEventListener('input', function () {
      const val = this.value;
      // Tab "Rước liền"/"Lịch sử" đang mở: ô tìm kiếm chung trên header lọc luôn danh sách đang xem
      // (tên/SĐT) thay vì tra cứu lịch sử khách theo SĐT — đồng bộ giá trị sang đúng ô tìm kiếm riêng
      // của view đó rồi gọi lại đúng hàm lọc debounce sẵn có (pkOnSearchInput/phOnSearchInput), để 2 ô
      // luôn hiện cùng 1 giá trị thay vì mỗi ô 1 trạng thái riêng.
      if (typeof currentView !== 'undefined' && currentView === 'pickup') {
        const pkField = document.getElementById('pkSearchInput');
        if (pkField) pkField.value = val;
        pkOnSearchInput(val);
        return;
      }
      if (typeof currentView !== 'undefined' && currentView === 'history') {
        const phField = document.getElementById('phSearchInput');
        if (phField) phField.value = val;
        phOnSearchInput(val);
        return;
      }
      if (typeof currentView !== 'undefined' && currentView === 'phoi') {
        const nameField = document.getElementById('filterName');
        if (nameField) nameField.value = val;
        clearTimeout(phoiFilterDebounceTimer);
        phoiFilterDebounceTimer = setTimeout(applyFilters, 300);
        return;
      }
      clearTimeout(liveSearchDebounceTimer);
      liveSearchDebounceTimer = setTimeout(() => renderLiveSearchResults(val), 300);
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        if (typeof currentView !== 'undefined' && (currentView === 'pickup' || currentView === 'history' || currentView === 'phoi')) return;
        e.preventDefault();
        handlePhoneSearch();
      }
    });
  }
  if (searchBtn) {
    searchBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      handlePhoneSearch();
    });
  }
})();

window.addEventListener('storage', (e) => {
  if (!e.key || e.key === HN_PICKUP_PAX_KEY) {
    pickupPassengers = loadPickupPassengers();
    if (currentView === 'pickup') pkRenderPaxTable();
  }
});

// Tài xế vừa được gán ở trang shuttle.html (tab khác) -> render lại ngay cột "Tài xế" nếu đang mở tab
// Trung chuyển, không cần tải lại trang.
window.addEventListener('storage', (e) => {
  if (e.key === HN_SHUTTLE_DRIVER_KEY) {
    renderTransshipTables();
    // Tài xế trung chuyển vừa đổi ở tab khác / trang shuttle.html -> chỉ render lại để cột "Trung chuyển"
    // khớp giá trị mới. KHÔNG đổi thứ tự dòng khách (vị trí giữ nguyên); thông báo đầu bảng cho thay đổi
    // phát từ trang này đã đồng bộ sẵn qua HN_PK_PHONGVE_NOTICES_KEY.
    if (currentView === 'pickup') pkRenderPaxTable();
  }
});

// Thông báo "vừa cập nhật ghi chú Phòng vé" hoặc vạch "in rước" vừa thêm/đóng ở 1 phiên đăng nhập khác
// (role bán vé và role trung chuyển thường là 2 tài khoản/2 tab khác nhau) -> render lại ngay để phiên
// này cũng thấy, không cần tải lại trang. Xem pkNotifyPhongVeUpdate/pkSavePrintRuoc trong
// ticketstaff-pickup.js.
window.addEventListener('storage', (e) => {
  if (e.key === HN_PK_PHONGVE_NOTICES_KEY || e.key === HN_PK_PRINT_RUOC_KEY) {
    if (currentView === 'pickup') pkRenderPaxTable();
  }
});

