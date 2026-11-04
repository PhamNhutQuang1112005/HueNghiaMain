// src/pages/customer/customer-account.js — Trang "Tài khoản của tôi" (tai-khoan.html): yêu cầu
// đăng nhập, hiển thị thông tin cá nhân + toàn bộ vé đã đặt (CustomerAuth.bookingsForPhone).
(function () {
  'use strict';

  function fmtVnd(n) {
    return n.toLocaleString('vi-VN') + 'đ';
  }

  function formatVnDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function bookingCardHtml(b) {
    return (
      '<div class="cust-booking-card">' +
      '<div class="head"><span class="code">' + b.code + '</span><span class="cust-status-pill">' + b.status + '</span></div>' +
      '<table class="cust-confirm-table">' +
      '<tr><td>Tuyến</td><td>' + b.route + '</td></tr>' +
      '<tr><td>Ngày giờ đi</td><td>' + formatVnDate(b.date) + ' · ' + b.departTime + '</td></tr>' +
      '<tr><td>Ghế</td><td>' + b.seats.join(', ') + '</td></tr>' +
      '<tr><td>Tổng tiền</td><td>' + fmtVnd(b.totalPrice) + '</td></tr>' +
      '</table>' +
      '</div>'
    );
  }

  document.addEventListener('DOMContentLoaded', function () {
    var profile = CustomerAuth.get();
    if (!profile) {
      window.location.href = 'login.html';
      return;
    }

    document.getElementById('accountSection').style.display = '';
    document.getElementById('accAvatar').textContent = profile.name.trim().charAt(0).toUpperCase();
    document.getElementById('accName').textContent = profile.name;
    document.getElementById('accPhone').textContent = profile.phone;
    document.getElementById('accEmail').textContent = profile.email || '';

    document.getElementById('accLogoutBtn').addEventListener('click', function () {
      CustomerAuth.clear();
      window.location.href = 'index.html';
    });

    var bookings = CustomerAuth.bookingsForPhone(profile.phone);
    var listHost = document.getElementById('bookingList');
    listHost.innerHTML = bookings.length
      ? bookings.map(bookingCardHtml).join('')
      : '<div class="cust-results-empty">Bạn chưa đặt vé nào. <a href="index.html" style="color:var(--red);font-weight:700;">Đặt vé ngay</a></div>';
  });
})();
