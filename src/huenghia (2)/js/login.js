/* =========================================================
   LOGIN.JS — Xử lý đăng nhập & phân quyền
   Nhà xe Huệ Nghĩa Express
   =========================================================

   HỆ THỐNG PHÂN QUYỀN (DEMO):
   Mỗi tài khoản gắn với 1 "role" (vai trò) xác định trang đích
   sau khi đăng nhập thành công. Trong bản demo này, dữ liệu tài
   khoản được khai báo cứng (hard-code) ngay trong file JS để dễ
   kiểm thử giao diện — khi triển khai thực tế, danh sách này cần
   được thay bằng lời gọi API xác thực tới backend (vd: POST /api/auth/login),
   mật khẩu phải được hash và không bao giờ để lộ ở phía client.

   Mỗi tài khoản gồm:
   - username, password : thông tin đăng nhập
   - role      : mã vai trò (dùng để phân quyền chức năng bên trong hệ thống)
   - roleLabel : tên vai trò hiển thị cho người dùng
   - redirect  : trang được điều hướng đến sau khi đăng nhập thành công
   - color     : màu đại diện cho vai trò, dùng để nhận diện trong các
                 màn hình quản trị sau này (ví dụ: nhãn vai trò, badge...)
   ========================================================= */

const accounts = [
  {
    username: "tongdai01",
    password: "123456",
    role: "call_center",
    roleLabel: "Nhân viên tổng đài",
    // Đây là tài khoản DUY NHẤT trong hệ thống demo được cấp quyền
    // truy cập trang Tổng đài (callcenter.html) — nơi xử lý đặt vé,
    // xếp ghế và chăm sóc khách hàng qua điện thoại.
    redirect: "callcenter.html",
    color: "var(--red)"
  },
  {
    username: "trungchuyen01",
    password: "123456",
    role: "shuttle_dispatch",
    roleLabel: "Điều hành trung chuyển",
    // Trang điều hành trung chuyển (shuttle.html) — quản lý xe trung chuyển,
    // lịch chạy và phối hợp đón/trả khách giữa các điểm.
    redirect: "shuttle.html",
    color: "#0EA5E9"
  },
  {
    username: "quantri01",
    password: "123456",
    role: "admin",
    roleLabel: "Quản trị viên hệ thống",
    // Trang quản trị tổng thể (chưa xây dựng trong phạm vi demo này).
    redirect: "admin.html",
    color: "#111213"
  },
  {
    username: "dieuhanh01",
    password: "123456",
    role: "dispatch_manager",
    roleLabel: "Điều hành bến xe",
    // Trang quản lý chuyến, tài xế, xe tại bến (chưa xây dựng trong phạm vi demo này).
    redirect: "dieuhanh.html",
    color: "#3B82F6"
  },
  {
    username: "ketoan01",
    password: "123456",
    role: "accountant",
    roleLabel: "Kế toán / Thu ngân",
    // Trang đối soát doanh thu, công nợ (chưa xây dựng trong phạm vi demo này).
    redirect: "ketoan.html",
    color: "#16A34A"
  },
  {
    username: "taixe01",
    password: "123456",
    role: "driver",
    roleLabel: "Tài xế / Phụ xe",
    // Trang xem lịch chạy, danh sách khách lên xe (chưa xây dựng trong phạm vi demo này).
    redirect: "taixe.html",
    color: "#FBBF24"
  }
];

// Danh sách các trang ĐÃ TỒN TẠI thực sự trong bản demo này.
// Nếu tài khoản đăng nhập có "redirect" không nằm trong danh sách này,
// hệ thống sẽ báo cho người dùng biết trang đó đang được xây dựng,
// thay vì điều hướng tới một liên kết không tồn tại.
const existingPages = ["callcenter.html", "shuttle.html"];

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

  const account = accounts.find(
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

  // Lưu lại phiên đăng nhập tối thiểu để các trang sau (vd: callcenter.html)
  // có thể đọc và hiển thị đúng vai trò người dùng nếu cần.
  sessionStorage.setItem("hn_current_user", JSON.stringify({
    username: account.username,
    role: account.role,
    roleLabel: account.roleLabel
  }));

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
