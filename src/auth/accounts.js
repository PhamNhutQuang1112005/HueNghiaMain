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
  },
  {
    username: 'nhanhang01',
    password: '123456',
    role: 'cashier',
    roleLabel: 'Nhân viên thu ngân / Nhận hàng',
    // Module hàng hóa (cargo.html/receive-report.html...) nằm ở cây thư mục riêng
    // (src/huenghia (2)/html/), không chung layout với pages/ — xem README của module đó.
    redirect: '../huenghia (2)/html/cargo.html',
    color: '#C20D08'
  }
];

/* ---------------------------------------------------------
   Danh sách tài khoản "SỐNG" (getAccountsList/saveAccountsList) — bản đọc/ghi được qua
   localStorage[HN_ADMIN_ACCOUNTS_KEY], seed lần đầu từ AUTH_ACCOUNTS ở trên. Đây LÀ NGUỒN THẬT trang
   Admin > Tài khoản (admin-accounts.js) dùng để thêm/sửa/xoá/khoá tài khoản qua UI, và login.js PHẢI
   xác thực qua đây (KHÔNG dùng thẳng AUTH_ACCOUNTS tĩnh) — trước đây login.js chỉ so khớp với
   AUTH_ACCOUNTS (mảng hard-code, không đổi lúc chạy) nên tài khoản admin vừa tạo/sửa ở trang Tài khoản
   không bao giờ đăng nhập được, dù đã lưu đúng vào localStorage.
   Định nghĩa ở đây (không phải admin-accounts.js) vì index.html (trang đăng nhập) không nạp file admin,
   chỉ nạp auth/accounts.js — 2 trang vì vậy luôn đọc/ghi cùng 1 hàm, không lệch logic seed.
   --------------------------------------------------------- */
// Tự "vá" danh sách "sống" bằng tài khoản demo mới thêm vào AUTH_ACCOUNTS (vd: khi code cập nhật
// thêm 1 tài khoản demo mới) — trước đây chỉ seed 1 LẦN DUY NHẤT lúc localStorage rỗng, nên tài khoản
// demo thêm SAU khi trình duyệt đã từng seed sẽ không bao giờ xuất hiện dù sửa lại AUTH_ACCOUNTS, dẫn
// tới đăng nhập báo sai tài khoản/mật khẩu dù mã đã đúng. Chỉ THÊM tài khoản demo còn thiếu (so khớp
// theo username), không đụng tới tài khoản đã có (kể cả admin đã sửa/khoá qua UI Admin > Tài khoản).
function toAccountRecord(a) {
  return {
    id: 'acc_' + a.username,
    username: a.username,
    password: a.password || '123456',
    fullName: a.roleLabel || a.username,
    role: a.role,
    roleLabel: a.roleLabel,
    redirect: a.redirect || 'ticketstaff.html',
    active: true,
    createdAt: Date.now()
  };
}

function getAccountsList() {
  var list = null;
  try {
    var raw = localStorage.getItem(HN_ADMIN_ACCOUNTS_KEY);
    list = raw === null ? null : JSON.parse(raw);
  } catch (e) { list = null; }

  if (!Array.isArray(list)) list = [];

  var existingUsernames = list.map(function (a) { return a.username; });
  var missing = (window.AUTH_ACCOUNTS || []).filter(function (a) {
    return existingUsernames.indexOf(a.username) === -1;
  });

  if (list.length === 0 || missing.length > 0) {
    missing.forEach(function (a) { list.push(toAccountRecord(a)); });
    saveAccountsList(list);
  }
  return list;
}

function saveAccountsList(list) {
  try { localStorage.setItem(HN_ADMIN_ACCOUNTS_KEY, JSON.stringify(Array.isArray(list) ? list : [])); }
  catch (e) { /* ignore quota/lỗi ghi */ }
}
