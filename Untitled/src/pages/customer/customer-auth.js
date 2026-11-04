// src/pages/customer/customer-auth.js — Xử lý form đăng nhập/đăng ký khách hàng.
// Dùng chung cho login.html + register.html (chỉ form tương ứng tồn tại trên mỗi trang nên script
// tự bỏ qua phần không có trên DOM). Lưu trữ thật nằm ở customer-session.js (window.CustomerAuth).
(function () {
  'use strict';

  var authError = document.getElementById('authError');
  var authErrorText = document.getElementById('authErrorText');

  function showError(message) {
    authErrorText.textContent = message;
    authError.classList.add('show');
  }
  function hideError() {
    authError.classList.remove('show');
  }

  var togglePassBtn = document.getElementById('togglePass');
  if (togglePassBtn) {
    togglePassBtn.addEventListener('click', function () {
      var input = document.getElementById('loginPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  }

  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError();
      var phone = document.getElementById('loginPhone').value.trim();
      var password = document.getElementById('loginPassword').value;
      var remember = document.getElementById('rememberMe').checked;
      var btnSubmit = document.getElementById('btnSubmit');

      var result = CustomerAuth.login(phone, password, remember);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      btnSubmit.textContent = 'Đang chuyển hướng...';
      btnSubmit.disabled = true;
      setTimeout(function () { window.location.href = 'index.html'; }, 400);
    });
  }

  var registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError();

      var name = document.getElementById('regName').value.trim();
      var phone = document.getElementById('regPhone').value.trim();
      var email = document.getElementById('regEmail').value.trim();
      var password = document.getElementById('regPassword').value;
      var passwordConfirm = document.getElementById('regPasswordConfirm').value;
      var btnSubmit = document.getElementById('btnSubmit');

      if (password !== passwordConfirm) {
        showError('Mật khẩu xác nhận không khớp.');
        return;
      }
      if (!/^[0-9]{9,11}$/.test(phone)) {
        showError('Số điện thoại không hợp lệ.');
        return;
      }

      var result = CustomerAuth.register({ name: name, phone: phone, email: email, password: password });
      if (!result.ok) {
        showError(result.error);
        return;
      }
      CustomerAuth.login(phone, password, false);
      btnSubmit.textContent = 'Đăng ký thành công...';
      btnSubmit.disabled = true;
      setTimeout(function () { window.location.href = 'index.html'; }, 500);
    });
  }
})();
