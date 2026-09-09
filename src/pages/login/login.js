/* =========================================================
   LOGIN.JS — Xử lý đăng nhập & phân quyền
   Nhà xe Huệ Nghĩa Express
   =========================================================

   HỆ THỐNG PHÂN QUYỀN (DEMO):
   Danh sách tài khoản (window.AUTH_ACCOUNTS) khai báo ở src/auth/accounts.js —
   dữ liệu hard-code phía client để dễ kiểm thử. Khi triển khai thực tế phải thay
   bằng lời gọi API xác thực tới backend (vd: POST /api/auth/login), mật khẩu hash
   và không bao giờ để lộ phía client.

   Mỗi tài khoản: { username, password, role, roleLabel, redirect, color }.
   ========================================================= */

// Danh sách các trang ĐÃ TỒN TẠI thực sự trong bản demo này.
// Nếu tài khoản đăng nhập có "redirect" không nằm trong danh sách này,
// hệ thống sẽ báo cho người dùng biết trang đó đang được xây dựng,
// thay vì điều hướng tới một liên kết không tồn tại.
const existingPages = ["ticketstaff.html", "admin.html"];

const loginForm      = document.getElementById("loginForm");
const usernameInput  = document.getElementById("username");
const passwordInput  = document.getElementById("password");
const authError      = document.getElementById("authError");
const authErrorText  = document.getElementById("authErrorText");
const togglePassBtn  = document.getElementById("togglePass");
const btnSubmit      = document.getElementById("btnSubmit");

/* ---------- Hiện/ẩn mật khẩu ---------- */
togglePassBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
});

/* ---------- Hiển thị lỗi ---------- */
function showError(message){
  authErrorText.textContent = message;
  authError.classList.add("show");
}
function hideError(){
  authError.classList.remove("show");
}

/* ---------- Xử lý đăng nhập ---------- */
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  hideError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  const account = AUTH_ACCOUNTS.find(
    (acc) => acc.username === username && acc.password === password
  );

  if (!account){
    showError("Sai tài khoản hoặc mật khẩu. Vui lòng kiểm tra lại.");
    return;
  }

  loginSuccess(account);
});

/* ---------- Đăng nhập thành công: điều hướng theo vai trò ---------- */
function loginSuccess(account){
  btnSubmit.textContent = "Đang chuyển hướng...";
  btnSubmit.disabled = true;

  // Lưu lại phiên đăng nhập tối thiểu để các trang sau đọc & hiển thị đúng vai trò.
  Session.set({
    username: account.username,
    role: account.role,
    roleLabel: account.roleLabel
  });

  setTimeout(() => {
    if (existingPages.includes(account.redirect)){
      window.location.href = account.redirect;
    } else {
      // Trang đích chưa được xây dựng trong bản demo -> báo cho người dùng biết,
      // thay vì chuyển tới một liên kết hỏng.
      btnSubmit.textContent = "Đăng nhập";
      btnSubmit.disabled = false;
      showError(
        `Đăng nhập thành công với vai trò "${account.roleLabel}". ` +
        `Trang "${account.redirect}" đang được xây dựng trong bản demo này.`
      );
    }
  }, 500);
}
