/* =========================================================
   LOGIN.JS — Xử lý đăng nhập & phân quyền
   Nhà Xe Huệ Nghĩa
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
const existingPages = ["ticketstaff.html", "admin.html", "cargo/cargo.html"];

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

  // getAccountsList() (auth/accounts.js) — bản "sống" trong localStorage mà trang Admin > Tài khoản
  // thêm/sửa/xoá qua UI, KHÔNG phải mảng AUTH_ACCOUNTS tĩnh — nếu so thẳng AUTH_ACCOUNTS thì tài khoản
  // admin vừa tạo/sửa sẽ không bao giờ đăng nhập được.
  const account = getAccountsList().find(
    (acc) => acc.username === username && acc.password === password
  );

  // Sổ sự kiện đăng nhập (auth_events) — AuthLog nạp từ auth/auth-log.js; thiếu thì bỏ qua, không chặn đăng nhập.
  const log = (type, detail, extra) => {
    if (window.AuthLog) AuthLog.event(type, Object.assign({ username: username, detail: detail || {} }, extra || {}));
  };

  if (!account){
    log("login_failed");
    showError("Sai tài khoản hoặc mật khẩu. Vui lòng kiểm tra lại.");
    return;
  }
  if (account.active === false){
    log("login_blocked", { reason: "manual_locked" });
    showError("Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên.");
    return;
  }
  if (employeeLocked(account.username)){
    log("login_blocked", { reason: "employee_locked" });
    showError("Nhân viên đang ở trạng thái không được đăng nhập (tạm ngưng hoặc nghỉ việc).");
    return;
  }

  // Bậc 3 của account_login_state (sau khóa theo nhân viên và khóa thủ công): 5 lần sai trong 15 phút -> chặn kể cả khi lần này nhập đúng mật khẩu.
  // Áp cả cho admin gốc; cửa sổ trượt 15 phút nên tự hết, hoặc admin gốc khác bấm Mở khóa nhập sai.
  if (window.AuthLog && AuthLog.isFailedLoginLocked(username)){
    log("login_blocked", { reason: "failed_login_locked" });
    showError("Tài khoản tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút hoặc liên hệ quản trị viên để mở khóa.");
    return;
  }

  loginSuccess(account);
});

/* Trạng thái làm việc của nhân viên gắn với tài khoản có khóa đăng nhập không (employment_statuses.locks_account).
   Đọc thẳng localStorage vì trang đăng nhập không nạp fleet-store.js. Không tìm thấy nhân viên = không khóa. */
function employeeLocked(username){
  try {
    const staff = JSON.parse(localStorage.getItem(HN_STAFF_KEY) || "[]");
    const s = Array.isArray(staff) ? staff.find((x) => x && x.username === username && x.role !== "admin") : null;
    if (!s) return false;
    const code = s.statusCode || (s.active === false ? "suspended" : "working");
    let list = JSON.parse(localStorage.getItem(HN_EMPLOYMENT_STATUSES_KEY) || "null");
    if (!Array.isArray(list) || !list.length) list = [{ code: "working", locksAccount: false }, { code: "suspended", locksAccount: true }, { code: "left", locksAccount: true }];
    const st = list.find((x) => x.code === code);
    return !!(st && st.locksAccount);
  } catch (e) { return false; }
}

/* ---------- Đăng nhập thành công: điều hướng theo vai trò ---------- */
function loginSuccess(account){
  btnSubmit.textContent = "Đang chuyển hướng...";
  btnSubmit.disabled = true;

  // Lưu lại phiên đăng nhập tối thiểu để các trang sau đọc & hiển thị đúng vai trò.
  // sid = id phiên trong sổ phiên (user_sessions) — để nhật ký thao tác biết thao tác thuộc phiên/thiết bị nào.
  const ses = window.AuthLog ? AuthLog.startSession(account.username, {}) : null;
  Session.set({
    username: account.username,
    role: account.role,
    roleLabel: account.roleLabel,
    sid: ses ? ses.id : ""
  });

  // Role admin luôn vào admin.html — "redirect" lưu trong localStorage có thể là mặc định 'ticketstaff.html'
  // (tài khoản tạo qua Admin > Tài khoản mà loại nhân viên 'admin' không có trong danh sách loại -> rơi về mặc định).
  // Tài khoản nhân sự (loại nhân viên có quyền manage_hr/manage_accounts) cũng vào admin.html.
  const target = (account.role === "admin" || Auth.isHrRoleKey(account.role)) ? "admin.html" : account.redirect;

  setTimeout(() => {
    if (existingPages.includes(target)){
      window.location.href = target;
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
