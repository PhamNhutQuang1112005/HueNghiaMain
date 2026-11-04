// src/pages/customer/customer-session.js — Phiên đăng nhập KHÁCH HÀNG, tách biệt hoàn toàn khỏi
// phiên nhân viên nội bộ (src/auth/session.js, key 'hn_current_user'). Khách và nhân viên là 2 hệ
// tài khoản khác nhau nên không dùng chung key, tránh khách đăng nhập lại đá phiên nhân viên (và
// ngược lại) nếu ai đó mở 2 trang trong cùng 1 trình duyệt.
//
// Tài khoản khách lưu ở localStorage (khách quay lại nhiều ngày sau vẫn còn) — KEY: hn_customer_accounts.
// Phiên đăng nhập: sessionStorage mặc định, chuyển sang localStorage nếu khách tick "Ghi nhớ đăng nhập"
// — KEY: hn_customer_session.
//
// ⚠️ DEMO: mật khẩu lưu thô phía client, chỉ để kiểm thử giao diện. Lên thật phải gọi API xác thực
// thật (hash mật khẩu phía server), xem thêm ghi chú tương tự ở src/auth/accounts.js.
(function () {
  'use strict';

  var ACCOUNTS_KEY = 'hn_customer_accounts';
  var SESSION_KEY = 'hn_customer_session';
  var BOOKINGS_KEY = 'hn_customer_bookings';

  function getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveAccounts(list) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  }

  function findAccountByPhone(phone) {
    return getAccounts().find(function (a) { return a.phone === phone; }) || null;
  }

  function register(fields) {
    if (findAccountByPhone(fields.phone)) {
      return { ok: false, error: 'Số điện thoại này đã có tài khoản.' };
    }
    var accounts = getAccounts();
    accounts.push({
      phone: fields.phone,
      name: fields.name,
      email: fields.email || '',
      password: fields.password,
      createdAt: new Date().toISOString()
    });
    saveAccounts(accounts);
    return { ok: true };
  }

  function login(phone, password, remember) {
    var account = findAccountByPhone(phone);
    if (!account || account.password !== password) {
      return { ok: false, error: 'Sai số điện thoại hoặc mật khẩu.' };
    }
    var profile = { phone: account.phone, name: account.name, email: account.email };
    setSession(profile, remember);
    return { ok: true, profile: profile };
  }

  function setSession(profile, remember) {
    var raw = JSON.stringify(profile);
    if (remember) {
      localStorage.setItem(SESSION_KEY, raw);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, raw);
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function get() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  function getBookings() {
    try {
      return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveBooking(booking) {
    var list = getBookings();
    list.unshift(booking);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
  }

  function findBooking(code, phone) {
    return getBookings().find(function (b) {
      return b.code.toLowerCase() === (code || '').trim().toLowerCase() && b.phone === (phone || '').trim();
    }) || null;
  }

  function bookingsForPhone(phone) {
    return getBookings().filter(function (b) { return b.phone === phone; });
  }

  window.CustomerAuth = {
    register: register,
    login: login,
    get: get,
    clear: clear,
    findAccountByPhone: findAccountByPhone,
    saveBooking: saveBooking,
    findBooking: findBooking,
    bookingsForPhone: bookingsForPhone
  };

  // ---------- Header dùng chung: hiển thị "Xin chào, X" hoặc nút Đăng nhập/Đăng ký ----------
  function renderAuthHeader() {
    var slot = document.getElementById('customerAuthSlot');
    if (!slot) return;
    var profile = get();
    if (profile) {
      slot.innerHTML =
        '<div class="cust-user-menu">' +
        '<button type="button" class="cust-user-btn" id="custUserBtn">' +
        '<span class="cust-user-avatar">' + profile.name.trim().charAt(0).toUpperCase() + '</span>' +
        '<span>' + profile.name + '</span>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="cust-user-dropdown" id="custUserDropdown">' +
        '<a href="tai-khoan.html">Vé của tôi</a>' +
        '<button type="button" id="custLogoutBtn">Đăng xuất</button>' +
        '</div>' +
        '</div>';
      var btn = document.getElementById('custUserBtn');
      var dropdown = document.getElementById('custUserDropdown');
      btn.addEventListener('click', function () { dropdown.classList.toggle('show'); });
      document.addEventListener('click', function (e) {
        if (!slot.contains(e.target)) dropdown.classList.remove('show');
      });
      document.getElementById('custLogoutBtn').addEventListener('click', function () {
        clear();
        window.location.reload();
      });
    } else {
      slot.innerHTML =
        '<a href="login.html" class="cust-btn cust-btn-ghost">Đăng nhập</a>' +
        '<a href="register.html" class="cust-btn cust-btn-primary">Đăng ký</a>';
    }
  }

  document.addEventListener('DOMContentLoaded', renderAuthHeader);
})();
