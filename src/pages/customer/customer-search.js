// src/pages/customer/customer-search.js — Trang chủ khách hàng: tìm chuyến + wizard đặt vé 4 bước
// (Chọn tuyến / Xác nhận lộ trình / Thông tin hành khách / Thanh toán).
// Phụ thuộc customer-data.js (dữ liệu chuyến/trạm mock), customer-session.js (CustomerAuth) và
// window.FleetStore (danh sách trạm THẬT theo tuyến, để chọn điểm lên/xuống xe ở bước 2).
// Toàn bộ đặt vé là DEMO phía client (lưu localStorage), không gọi API thật.
(function () {
  'use strict';

  var fromCitySel = document.getElementById('fromCity');
  var toCitySel = document.getElementById('toCity');
  var departDateInput = document.getElementById('departDate');
  var searchForm = document.getElementById('searchForm');

  var wizard = document.getElementById('bookingWizard');
  var wizardRouteTitle = document.getElementById('wizardRouteTitle');
  var wizardRouteDate = document.getElementById('wizardRouteDate');
  var wizardStepper = document.getElementById('wizardStepper');
  var wizardBackBtn = document.getElementById('wizardBackBtn');
  var wizardNextBtn = document.getElementById('wizardNextBtn');
  var wizardFooter = document.getElementById('wizardFooter');

  var panels = {
    2: document.getElementById('wizardPanel2'),
    3: document.getElementById('wizardPanel3'),
    4: document.getElementById('wizardPanel4'),
    done: document.getElementById('wizardPanelDone')
  };

  var pickupStationList = document.getElementById('pickupStationList');
  var dropoffStationList = document.getElementById('dropoffStationList');
  var wizardStationPicker = document.getElementById('wizardStationPicker');
  var wizardRouteSummary = document.getElementById('wizardRouteSummary');
  var summaryPickupEl = document.getElementById('summaryPickup');
  var summaryDropoffEl = document.getElementById('summaryDropoff');
  var changeStationsBtn = document.getElementById('changeStationsBtn');
  var wizardTripFilters = document.getElementById('wizardTripFilters');
  var filterPriceSel = document.getElementById('filterPrice');
  var filterVehicleSel = document.getElementById('filterVehicle');
  var filterTimeSel = document.getElementById('filterTime');
  var wizardTripListHead = document.getElementById('wizardTripListHead');
  var wizardTripListSub = document.getElementById('wizardTripListSub');
  var wizardTripList = document.getElementById('wizardTripList');

  var seatModalOverlay = document.getElementById('seatModalOverlay');
  var seatModalTitle = document.getElementById('seatModalTitle');
  var seatModalCloseBtn = document.getElementById('seatModalCloseBtn');
  var seatModalContinueBtn = document.getElementById('seatModalContinueBtn');
  var wizardTripSummaryText = document.getElementById('wizardTripSummaryText');
  var changeSeatsBtn = document.getElementById('changeSeatsBtn');

  var currentStep = 2;
  var currentTrip = null;
  var allTrips = [];
  var selectedSeats = [];
  var selectedPickupStation = null;
  var selectedDropoffStation = null;
  var tripListRevealed = false;

  function fmtVnd(n) {
    return n.toLocaleString('vi-VN') + 'đ';
  }

  function todayStr() {
    var d = new Date();
    return d.toISOString().split('T')[0];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatVnDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function fillCitySelects() {
    CUSTOMER_CITIES.forEach(function (city) {
      var opt1 = document.createElement('option');
      opt1.value = city; opt1.textContent = city;
      fromCitySel.appendChild(opt1);
      var opt2 = document.createElement('option');
      opt2.value = city; opt2.textContent = city;
      toCitySel.appendChild(opt2);
    });
    fromCitySel.value = CUSTOMER_CITIES[0];
    toCitySel.value = CUSTOMER_CITIES[1];
  }

  // Tuyến "gốc" (hub) của FleetStore ứng với thành phố đi — dùng để lấy đúng danh sách trạm thật
  // (fromStations/toStations/pickupStations) cho bước "Xác nhận lộ trình".
  function routeForFromCity(fromCity) {
    if (typeof FleetStore === 'undefined') return null;
    var id = fromCity === CUSTOMER_CITIES[0] ? 'sg-ag-main' : 'ag-sg-main';
    return FleetStore.getRoutes().find(function (r) { return r.id === id; }) || null;
  }

  function init() {
    fillCitySelects();
    departDateInput.min = todayStr();
    departDateInput.value = todayStr();

    document.getElementById('swapCitiesBtn').addEventListener('click', function () {
      var tmp = fromCitySel.value;
      fromCitySel.value = toCitySel.value;
      toCitySel.value = tmp;
    });

    document.getElementById('stationLegend').innerHTML =
      '<span><span class="cust-pin cust-pin-main">' + PIN_MAIN_ICON + '</span>Lên tại trạm</span>' +
      '<span><span class="cust-pin cust-pin-shuttle">' + PIN_SHUTTLE_ICON + '</span>Có trung chuyển</span>';

    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (fromCitySel.value === toCitySel.value) {
        alert('Điểm đi và điểm đến phải khác nhau.');
        return;
      }
      openWizard();
    });

    wizardBackBtn.addEventListener('click', goBack);
    wizardNextBtn.addEventListener('click', goNext);
    changeStationsBtn.addEventListener('click', collapseTripList);
    changeSeatsBtn.addEventListener('click', function () { goToStep(2); });
    [filterPriceSel, filterVehicleSel, filterTimeSel].forEach(function (sel) {
      sel.addEventListener('change', renderTripList);
    });
    document.getElementById('wizardBackHomeBtn').addEventListener('click', function () {
      wizard.classList.remove('show');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    seatModalCloseBtn.addEventListener('click', closeSeatModal);
    seatModalOverlay.addEventListener('click', function (e) {
      if (e.target === seatModalOverlay) closeSeatModal();
    });
    seatModalContinueBtn.addEventListener('click', function () {
      if (selectedSeats.length < 1) return;
      closeSeatModal();
      goToStep(3);
    });
  }

  // ---------- Mở wizard sau khi bấm "Tìm chuyến xe" ----------
  function openWizard() {
    currentTrip = null;
    selectedSeats = [];
    selectedPickupStation = null;
    selectedDropoffStation = null;
    tripListRevealed = false;

    wizardRouteTitle.textContent = fromCitySel.value + ' - ' + toCitySel.value;
    wizardRouteDate.textContent = formatVnDate(departDateInput.value);

    renderStationLists();
    wizardStationPicker.classList.remove('cust-hidden');
    wizardRouteSummary.classList.remove('show');
    wizardTripList.innerHTML = '';
    wizardTripFilters.classList.remove('show');
    wizardTripListHead.classList.remove('show');

    wizard.classList.add('show');
    goToStep(2);
    wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Bước 2: Xác nhận lộ trình (chọn điểm lên/xuống xe) ----------
  // 2 icon khác nhau: ghim tròn đặc = "Lên tại trạm" (fromStations/toStations), ghim có mũi tên
  // rẽ = "Có trung chuyển" (pickupStations — trạm được đón bằng xe trung chuyển tới điểm chính).
  var PIN_MAIN_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6.72 11.34 7.02 11.6a1.5 1.5 0 0 0 1.96 0C13.28 21.34 20 15.25 20 10c0-4.42-3.58-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>';
  var PIN_SHUTTLE_ICON = '<svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6.72 11.34 7.02 11.6a1.5 1.5 0 0 0 1.96 0C13.28 21.34 20 15.25 20 10c0-4.42-3.58-8-8-8Z"/><path d="M8.5 10.5h7M12.5 7.5l3 3-3 3" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Bảng tra "tên trạm" -> hồ sơ trạm đầy đủ (địa chỉ...) trong FleetStore.getStations() — cùng dữ
  // liệu Admin dùng ở mục Trạm Xe, để hiện đúng địa chỉ thật thay vì chỉ tên trạm.
  function stationDirectory() {
    var map = {};
    if (typeof FleetStore === 'undefined') return map;
    FleetStore.getStations().forEach(function (s) { map[s.name] = s; });
    return map;
  }

  function stationOptionHtml(name, groupName, pinClass, pinIcon, address) {
    return (
      '<label class="cust-station-option">' +
      '<input type="radio" name="' + groupName + '" value="' + esc(name) + '">' +
      '<span class="cust-pin ' + pinClass + '">' + pinIcon + '</span>' +
      '<span class="cust-station-text">' +
      '<span class="cust-station-name">' + esc(name) + '</span>' +
      (address ? '<span class="cust-station-address">' + esc(address) + '</span>' : '') +
      '</span>' +
      '</label>'
    );
  }

  function renderStationLists() {
    var route = routeForFromCity(fromCitySel.value);
    var fromStations = (route && route.fromStations) || [];
    var toStations = (route && route.toStations) || [];
    var pickupExtra = (route && route.pickupStations) || [];
    var directory = stationDirectory();

    function addressOf(name) { return directory[name] ? directory[name].address : ''; }

    pickupStationList.innerHTML =
      fromStations.map(function (s) { return stationOptionHtml(s, 'pickupStationRadio', 'cust-pin-main', PIN_MAIN_ICON, addressOf(s)); }).join('') +
      pickupExtra.map(function (s) { return stationOptionHtml(s, 'pickupStationRadio', 'cust-pin-shuttle', PIN_SHUTTLE_ICON, addressOf(s)); }).join('');

    dropoffStationList.innerHTML = toStations.map(function (s) { return stationOptionHtml(s, 'dropoffStationRadio', 'cust-pin-main', PIN_MAIN_ICON, addressOf(s)); }).join('');

    pickupStationList.querySelectorAll('input').forEach(function (r) {
      r.addEventListener('change', function () { selectedPickupStation = r.value; onStationChoiceChanged(); });
    });
    dropoffStationList.querySelectorAll('input').forEach(function (r) {
      r.addEventListener('change', function () { selectedDropoffStation = r.value; onStationChoiceChanged(); });
    });
  }

  // Đổi trạm lên/xuống thì danh sách chuyến (nếu đã hiện) không còn đúng nữa — ẩn đi, bắt bấm lại
  // "Tìm chuyến xe" để hiện danh sách mới thay vì tự động hiện ngay khi vừa chọn xong 2 trạm.
  function onStationChoiceChanged() {
    tripListRevealed = false;
    wizardTripList.innerHTML = '';
    wizardTripFilters.classList.remove('show');
    wizardTripListHead.classList.remove('show');
    currentTrip = null;
    updateNextButtonState();
  }

  // Bấm "Tìm chuyến xe": thu gọn phần chọn trạm lại (đỡ dài trang), thay bằng dòng tóm tắt lộ
  // trình đã chọn, rồi hiện bộ lọc + danh sách chuyến bên dưới.
  function revealTripList() {
    tripListRevealed = true;
    wizardStationPicker.classList.add('cust-hidden');
    summaryPickupEl.textContent = selectedPickupStation;
    summaryDropoffEl.textContent = selectedDropoffStation;
    wizardRouteSummary.classList.add('show');
    loadTrips();
    renderTripList();
    wizardTripFilters.classList.add('show');
    wizardTripListHead.classList.add('show');
    wizardFooter.style.display = 'none';
  }

  // Bấm "Đổi điểm đón/trả": mở lại phần chọn trạm, ẩn tóm tắt + bộ lọc + danh sách chuyến.
  function collapseTripList() {
    tripListRevealed = false;
    wizardStationPicker.classList.remove('cust-hidden');
    wizardRouteSummary.classList.remove('show');
    wizardTripList.innerHTML = '';
    wizardTripFilters.classList.remove('show');
    wizardTripListHead.classList.remove('show');
    currentTrip = null;
    wizardFooter.style.display = 'flex';
    updateNextButtonState();
  }

  // Nạp toàn bộ chuyến của tuyến/ngày đã chọn + đổ danh mục "Loại xe" cho bộ lọc, đồng thời reset
  // 3 bộ lọc về mặc định (mỗi lần tìm chuyến lại là 1 lượt tìm mới).
  function loadTrips() {
    allTrips = customerSearchTrips(fromCitySel.value, toCitySel.value, departDateInput.value);
    filterPriceSel.value = '';
    filterTimeSel.value = '';
    var vehicleTypes = [];
    allTrips.forEach(function (t) {
      if (vehicleTypes.indexOf(t.vehicleType) === -1) vehicleTypes.push(t.vehicleType);
    });
    filterVehicleSel.innerHTML = '<option value="">Tất cả loại xe</option>' +
      vehicleTypes.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
  }

  function tripMatchesFilters(trip) {
    var priceRange = filterPriceSel.value;
    if (priceRange) {
      var parts = priceRange.split('-');
      if (trip.price < Number(parts[0]) || trip.price > Number(parts[1])) return false;
    }
    if (filterVehicleSel.value && trip.vehicleType !== filterVehicleSel.value) return false;
    var timeRange = filterTimeSel.value;
    if (timeRange) {
      var range = timeRange.split('-');
      var hour = Number(trip.departTime.split(':')[0]);
      if (hour < Number(range[0]) || hour >= Number(range[1])) return false;
    }
    return true;
  }

  function renderTripList() {
    var trips = allTrips.filter(tripMatchesFilters);
    wizardTripListSub.textContent = trips.length + '/' + allTrips.length + ' chuyến · ' + formatVnDate(departDateInput.value);
    wizardTripList.innerHTML = trips.length
      ? trips.map(tripCardHtml).join('')
      : '<div class="cust-results-empty">Không có chuyến nào khớp bộ lọc đang chọn.</div>';

    wizardTripList.querySelectorAll('.cust-trip2:not(.disabled)').forEach(function (card) {
      card.addEventListener('click', function () {
        openSeatModal(customerFindTripById(card.dataset.tripId));
      });
    });
  }

  var TRIP_ARROW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var AMENITY_ICONS = [
    { title: 'Wifi miễn phí', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>' },
    { title: 'Chăn đắp', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>' },
    { title: 'Sạc USB', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>' }
  ];

  function tripCardHtml(trip) {
    var seatsLeftLabel = trip.availableSeats === 0 ? 'Hết chỗ' : 'Còn ' + trip.availableSeats + '/' + trip.totalSeats + ' chỗ';
    var disabled = trip.availableSeats === 0;
    var selected = currentTrip && currentTrip.id === trip.id;
    return (
      '<div class="cust-trip2' + (selected ? ' selected' : '') + (disabled ? ' disabled' : '') + '" data-trip-id="' + trip.id + '">' +
      '<div class="cust-trip2-icons">' + AMENITY_ICONS.map(function (a) { return '<span title="' + esc(a.title) + '">' + a.svg + '</span>'; }).join('') + '</div>' +
      '<div class="cust-trip2-main">' +
      '<div class="cust-trip2-time"><span>' + trip.departTime + '</span>' + TRIP_ARROW_ICON + '<span>' + trip.arriveTime + '</span>' +
      '<span class="cust-trip2-price-tag">' + fmtVnd(trip.price) + '</span></div>' +
      '<div class="cust-trip2-vehicle">' + esc(trip.vehicleType) + ' <span class="cust-trip2-dot-sep">•</span> <span class="' + (disabled ? 'none' : (trip.availableSeats <= 5 ? 'low' : '')) + '">' + seatsLeftLabel + '</span></div>' +
      '<div class="cust-trip2-route">' +
      '<div class="cust-trip2-rail"><span class="cust-trip2-node pickup"></span><span class="cust-trip2-rail-line"></span><span class="cust-trip2-node dropoff"></span></div>' +
      '<div class="cust-trip2-route-text">' +
      '<div class="cust-trip2-stop">' + esc(trip.fromStation) + '</div>' +
      '<div class="cust-trip2-duration">Hành trình: ' + trip.durationLabel + '</div>' +
      '<div class="cust-trip2-stop">' + esc(trip.toStation) + '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="cust-trip2-side">' +
      '<div class="cust-trip2-select-btn">' + (disabled ? 'Hết chỗ' : 'Chọn') + '</div>' +
      '</div>' +
      '</div>'
    );
  }

  // ---------- Modal chọn chỗ ngồi (mở ngay khi bấm 1 chuyến ở bước "Xác nhận lộ trình") ----------
  function openSeatModal(trip) {
    if (!trip) return;
    currentTrip = trip;
    selectedSeats = [];
    seatModalTitle.textContent = trip.departTime + ' · ' + trip.fromStation + ' → ' + trip.toStation;
    renderSeatFloors();
    updateSeatSummary();
    updateSeatModalContinueState();
    seatModalOverlay.classList.add('show');
  }

  function closeSeatModal() {
    seatModalOverlay.classList.remove('show');
  }

  function updateSeatModalContinueState() {
    seatModalContinueBtn.disabled = selectedSeats.length < 1;
  }

  // Icon ghế + cách tô màu theo trạng thái (free/selected/disabled) lấy đúng theo mẫu modal
  // "Chỉ định xe rước liền" bên ticketstaff-pickup.js (pkRenderSeatMap) để 2 nơi đồng bộ giao diện.
  var SEAT_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor">' +
    '<path d="M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V17C19 18.6569 17.6569 20 16 20H8C6.34315 20 5 18.6569 5 17V5Z"/>' +
    '<path d="M2 8C2 7.44772 2.44772 7 3 7H5V15H3C2.44772 15 2 14.5523 2 14V8Z"/>' +
    '<path d="M19 7H21C21.5523 7 22 7.44772 22 8V14C22 14.5523 21.5523 15 21 15H19V7Z"/>' +
    '</svg>';

  function renderSeatFloors() {
    var layout = customerBuildSeatLayout(currentTrip);
    var cols = layout.dense ? 'cols-3' : '';
    var host = document.getElementById('seatFloors');
    host.innerHTML = layout.floors.map(function (floor) {
      return (
        '<div class="cust-seat-floor">' +
        (floor.name ? '<h4>' + floor.name + '</h4>' : '') +
        '<div class="cust-seat-grid ' + cols + '">' +
        floor.seats.map(function (seat) {
          if (seat.hidden) return '<button type="button" class="cust-seat cust-seat-hidden" tabindex="-1"></button>';
          return '<button type="button" class="cust-seat' + (seat.booked ? '' : ' free') + '" data-seat="' + seat.label + '"' + (seat.booked ? ' disabled' : '') + '>' +
            SEAT_ICON +
            '<span class="cust-seat-num">' + esc(seat.label) + '</span>' +
            '</button>';
        }).join('') +
        '</div>' +
        '</div>'
      );
    }).join('');

    host.querySelectorAll('.cust-seat:not(:disabled)').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleSeat(btn); });
    });
  }

  function toggleSeat(btn) {
    var label = btn.dataset.seat;
    var idx = selectedSeats.indexOf(label);
    if (idx >= 0) {
      selectedSeats.splice(idx, 1);
      btn.classList.remove('selected');
    } else {
      selectedSeats.push(label);
      btn.classList.add('selected');
    }
    updateSeatSummary();
    updateSeatModalContinueState();
  }

  function updateSeatSummary() {
    document.getElementById('seatSelectedCount').textContent = selectedSeats.length;
    document.getElementById('seatTotalPrice').textContent = fmtVnd(selectedSeats.length * currentTrip.price);
  }

  // Dòng tóm tắt chuyến + ghế đã chọn ở đầu bước 3 (thay cho sơ đồ ghế — đã chọn xong trong modal).
  function renderTripSummaryLine() {
    wizardTripSummaryText.innerHTML =
      '<span>' + currentTrip.departTime + ' → ' + currentTrip.arriveTime + '</span>' +
      '<span class="cust-route-summary-arrow">·</span>' +
      '<span>' + esc(currentTrip.vehicleType) + '</span>' +
      '<span class="cust-route-summary-arrow">·</span>' +
      '<span>Ghế <b>' + esc(selectedSeats.join(', ')) + '</b></span>' +
      '<span class="cust-route-summary-arrow">·</span>' +
      '<span><b>' + fmtVnd(currentTrip.price * selectedSeats.length) + '</b></span>';
  }

  function prefillPassengerForm() {
    var profile = window.CustomerAuth ? CustomerAuth.get() : null;
    if (!profile) return;
    var nameInput = document.getElementById('passengerName');
    var phoneInput = document.getElementById('passengerPhone');
    var emailInput = document.getElementById('passengerEmail');
    nameInput.value = nameInput.value || profile.name;
    phoneInput.value = phoneInput.value || profile.phone;
    emailInput.value = emailInput.value || (profile.email || '');
  }

  // ---------- Bước 4: thanh toán ----------
  function renderPaymentSummary() {
    var name = document.getElementById('passengerName').value.trim();
    var phone = document.getElementById('passengerPhone').value.trim();
    document.getElementById('paymentSummaryTable').innerHTML =
      '<tr><td>Tuyến</td><td>' + esc(fromCitySel.value) + ' → ' + esc(toCitySel.value) + '</td></tr>' +
      '<tr><td>Ngày giờ đi</td><td>' + formatVnDate(departDateInput.value) + ' · ' + currentTrip.departTime + '</td></tr>' +
      '<tr><td>Loại xe</td><td>' + esc(currentTrip.vehicleType) + '</td></tr>' +
      '<tr><td>Ghế</td><td>' + esc(selectedSeats.join(', ')) + '</td></tr>' +
      '<tr><td>Điểm lên xe</td><td>' + esc(selectedPickupStation) + '</td></tr>' +
      '<tr><td>Điểm xuống xe</td><td>' + esc(selectedDropoffStation) + '</td></tr>' +
      '<tr><td>Hành khách</td><td>' + esc(name) + ' · ' + esc(phone) + '</td></tr>' +
      '<tr><td>Tổng tiền</td><td>' + fmtVnd(currentTrip.price * selectedSeats.length) + '</td></tr>';
  }

  function genBookingCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'HN';
    for (var i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  function submitBooking() {
    var booking = {
      code: genBookingCode(),
      tripId: currentTrip.id,
      route: fromCitySel.value + ' → ' + toCitySel.value,
      date: currentTrip.date,
      departTime: currentTrip.departTime,
      arriveTime: currentTrip.arriveTime,
      vehicleType: currentTrip.vehicleType,
      seats: selectedSeats.slice(),
      price: currentTrip.price,
      totalPrice: currentTrip.price * selectedSeats.length,
      name: document.getElementById('passengerName').value.trim(),
      phone: document.getElementById('passengerPhone').value.trim(),
      email: document.getElementById('passengerEmail').value.trim(),
      pickupStation: selectedPickupStation,
      dropoffStation: selectedDropoffStation,
      note: document.getElementById('passengerNote').value.trim(),
      status: 'Đã đặt',
      createdAt: new Date().toISOString()
    };
    CustomerAuth.saveBooking(booking);
    showDone(booking);
  }

  function showDone(booking) {
    document.getElementById('confirmCode').textContent = booking.code;
    document.getElementById('confirmTable').innerHTML =
      '<tr><td>Tuyến</td><td>' + esc(booking.route) + '</td></tr>' +
      '<tr><td>Ngày giờ đi</td><td>' + formatVnDate(booking.date) + ' · ' + booking.departTime + '</td></tr>' +
      '<tr><td>Loại xe</td><td>' + esc(booking.vehicleType) + '</td></tr>' +
      '<tr><td>Ghế</td><td>' + esc(booking.seats.join(', ')) + '</td></tr>' +
      '<tr><td>Điểm lên xe</td><td>' + esc(booking.pickupStation) + '</td></tr>' +
      '<tr><td>Điểm xuống xe</td><td>' + esc(booking.dropoffStation) + '</td></tr>' +
      '<tr><td>Hành khách</td><td>' + esc(booking.name) + ' · ' + esc(booking.phone) + '</td></tr>' +
      '<tr><td>Tổng tiền</td><td>' + fmtVnd(booking.totalPrice) + '</td></tr>';
    goToStep('done');
  }

  // ---------- Điều khiển wizard (chuyển bước, cập nhật thanh tiến trình) ----------
  function goToStep(step) {
    currentStep = step;
    var doneStepNum = step === 'done' ? 5 : step;

    Object.keys(panels).forEach(function (key) {
      if (panels[key]) panels[key].classList.toggle('show', String(key) === String(step));
    });

    wizardStepper.querySelectorAll('.cust-step').forEach(function (li) {
      var n = Number(li.dataset.step);
      li.classList.toggle('done', n < doneStepNum);
      li.classList.toggle('active', n === doneStepNum);
    });

    wizardFooter.style.display = (step === 'done' || (step === 2 && tripListRevealed)) ? 'none' : 'flex';
    wizardBackBtn.style.visibility = step === 2 ? 'hidden' : 'visible';

    if (step === 3) {
      renderTripSummaryLine();
      prefillPassengerForm();
    }
    if (step === 4) renderPaymentSummary();

    updateNextButtonState();
    wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Bước 2 chỉ còn dùng nút này ở giai đoạn CHƯA hiện danh sách chuyến ("Tìm chuyến xe") — sau khi
  // hiện danh sách, bấm 1 chuyến sẽ mở thẳng modal chọn ghế và modal đó tự đưa sang bước 3, nên
  // thanh nút của wizard được ẩn đi (xem goToStep) chứ không còn ở trạng thái "Tiếp tục" nữa.
  function updateNextButtonState() {
    if (currentStep === 2) {
      wizardNextBtn.textContent = 'Tìm chuyến xe ›';
      wizardNextBtn.disabled = !(selectedPickupStation && selectedDropoffStation);
    } else if (currentStep === 3) {
      wizardNextBtn.textContent = 'Tiếp tục ›';
      wizardNextBtn.disabled = false;
    } else if (currentStep === 4) {
      wizardNextBtn.textContent = 'Xác nhận đặt vé ›';
      wizardNextBtn.disabled = false;
    }
  }

  function goNext() {
    if (currentStep === 2) {
      revealTripList();
    } else if (currentStep === 3) {
      if (!document.getElementById('bookingInfoForm').reportValidity()) return;
      goToStep(4);
    } else if (currentStep === 4) {
      submitBooking();
    }
  }

  function goBack() {
    if (currentStep === 3) goToStep(2);
    else if (currentStep === 4) goToStep(3);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
