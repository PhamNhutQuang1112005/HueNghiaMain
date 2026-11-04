// src/pages/customer/customer-lookup.js — Trang "Tra cứu vé" (tra-cuu-ve.html): tìm vé đã đặt
// bằng mã vé + số điện thoại, đọc từ CustomerAuth.findBooking (customer-session.js).
(function () {
  'use strict';

  var form = document.getElementById('lookupForm');
  var resultBox = document.getElementById('lookupResult');

  function fmtVnd(n) {
    return n.toLocaleString('vi-VN') + 'đ';
  }

  function formatVnDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = document.getElementById('lookupCode').value.trim();
    var phone = document.getElementById('lookupPhone').value.trim();
    var booking = CustomerAuth.findBooking(code, phone);

    if (!booking) {
      resultBox.innerHTML = '<div class="cust-results-empty">Không tìm thấy vé phù hợp. Kiểm tra lại mã vé và số điện thoại.</div>';
      return;
    }

    resultBox.innerHTML =
      '<div class="cust-booking-card">' +
      '<div class="head"><span class="code">' + booking.code + '</span><span class="cust-status-pill">' + booking.status + '</span></div>' +
      '<table class="cust-confirm-table">' +
      '<tr><td>Tuyến</td><td>' + booking.route + '</td></tr>' +
      '<tr><td>Ngày giờ đi</td><td>' + formatVnDate(booking.date) + ' · ' + booking.departTime + '</td></tr>' +
      '<tr><td>Loại xe</td><td>' + booking.vehicleType + '</td></tr>' +
      '<tr><td>Ghế</td><td>' + booking.seats.join(', ') + '</td></tr>' +
      '<tr><td>Điểm đón</td><td>' + booking.pickupStation + '</td></tr>' +
      '<tr><td>Điểm trả</td><td>' + booking.dropoffStation + '</td></tr>' +
      '<tr><td>Hành khách</td><td>' + booking.name + ' · ' + booking.phone + '</td></tr>' +
      '<tr><td>Tổng tiền</td><td>' + fmtVnd(booking.totalPrice) + '</td></tr>' +
      '</table>' +
      '</div>';
  });
})();
