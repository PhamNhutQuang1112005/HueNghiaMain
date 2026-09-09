/* =========================================================
   AUTH/ACCOUNTS.JS — Danh sách tài khoản demo (nguồn DUY NHẤT).
   =========================================================

   Trước đây khai báo 2 nơi: `accounts[]` trong login.js (đầy đủ, để đối chiếu
   đăng nhập) và `LOGIN_ACCOUNTS_MIRROR` trong admin (rút gọn, cho bảng "Tài khoản"
   chỉ-đọc). Nay chỉ ở đây; admin dẫn xuất từ mảng này.

   ⚠️ Đây là dữ liệu DEMO — mật khẩu để thô trong mã client. Khi lên thật phải thay
   bằng lời gọi API xác thực, mật khẩu hash phía server. Xem login.js.

   Nạp bằng <script> thường (không phụ thuộc file nào). index.html + admin.html nạp.

   Biến: window.AUTH_ACCOUNTS  (mỗi phần tử: {username, password, role, roleLabel,
   redirect, color})
   ========================================================= */
window.AUTH_ACCOUNTS = [
  {
    username: 'tongdai01',
    password: '123456',
    role: 'call_center',
    roleLabel: 'Nhân viên tổng đài',
    // Trang callcenter.html cũ đã bị xoá — mọi nghiệp vụ (đặt vé, xếp ghế, Phơi xe,
    // Lịch sử, Rước liền) nằm trong ticketstaff.html nên tài khoản này đăng nhập
    // thẳng vào đó với QUYỀN PHÒNG VÉ (bán vé): tab "Trung chuyển" chỉ chọn 1 dòng,
    // nút "Chỉ định". Chế độ trung chuyển (chọn nhiều, "Cập nhật" tài xế) là của
    // trungchuyen01 — phân biệt qua Auth.isShuttleDispatch() (role 'shuttle_dispatch').
    redirect: 'ticketstaff.html',
    color: 'var(--red)'
  },
  {
    username: 'trungchuyen01',
    password: '123456',
    role: 'shuttle_dispatch',
    roleLabel: 'Điều hành trung chuyển',
    // Cùng vào ticketstaff.html như tongdai01 nhưng ở chế độ điều hành trung chuyển.
    redirect: 'ticketstaff.html',
    color: '#0EA5E9'
  },
  {
    username: 'quantri01',
    password: '123456',
    role: 'admin',
    roleLabel: 'Quản trị viên hệ thống',
    redirect: 'admin.html',
    color: '#111213'
  },
  {
    username: 'dieuhanh01',
    password: '123456',
    role: 'dispatch_manager',
    roleLabel: 'Điều hành bến xe',
    // Trang quản lý chuyến/tài xế/xe tại bến — chưa xây dựng trong bản demo.
    redirect: 'dieuhanh.html',
    color: '#3B82F6'
  },
  {
    username: 'ketoan01',
    password: '123456',
    role: 'accountant',
    roleLabel: 'Kế toán / Thu ngân',
    // Trang đối soát doanh thu/công nợ — chưa xây dựng trong bản demo.
    redirect: 'ketoan.html',
    color: '#16A34A'
  },
  {
    username: 'taixe01',
    password: '123456',
    role: 'driver',
    roleLabel: 'Tài xế / Phụ xe',
    // Trang lịch chạy/danh sách khách lên xe — chưa xây dựng trong bản demo.
    redirect: 'taixe.html',
    color: '#FBBF24'
  }
];
