# Module Hàng hóa (`src/pages/cargo/`)

Nghiệp vụ nhận hàng, giao hàng, phơi hàng, COD, hàng trả về và kết ca của
**Huệ Nghĩa Express**. HTML/CSS/JS thuần (không build step); dữ liệu lưu ở
`localStorage` (khóa `hueNghia_*`) và dùng chung `shared/`, `auth/` với phần
Bán vé / Quản trị.

## Cấu trúc

```
src/pages/cargo/
├─ cargo.html       Nhập hàng, danh sách lô hàng, lập vận đơn Baga
├─ delivery.html    Giao hàng, gán hàng vào phơi xe
├─ manifest.html    Quản lý phơi hàng (tạo phơi, đặt lại từ phơi cũ), xe đến, hàng chưa giao
├─ cod.html         Đối soát tiền thu hộ (COD) giữa các chi nhánh
├─ returned.html    Hàng trả về, chuyển lại vào phơi khác
├─ ket-ca.html      Kết ca: báo cáo nhận hàng + giao hàng theo ca, trên 1 trang
├─ css/
│  ├─ shell.css       Giao diện DÙNG CHUNG: header, sidebar, nút, popup, bộ lọc… (nạp trước tiên)
│  ├─ cargo.css       Riêng cho cargo / delivery / cod / returned / ket-ca
│  ├─ manifest.css    Riêng cho manifest
│  ├─ cod.css, delivery.css
│  └─ responsive.css  Responsive + menu tài khoản header (nạp cuối cùng)
└─ js/
   ├─ auth-bridge.js  Đăng nhập + dựng góc phải header (nút Quản trị, menu tài khoản)
   ├─ responsive.js   Thu gọn / mở sidebar
   ├─ stations.js     Danh mục trạm dùng chung
   ├─ cargo.js, delivery.js, cod.js
   └─ ket-ca/         receive-report.js, delivery-report.js (2 phần của trang Kết ca)
```

Thứ tự nạp CSS: `shell.css` → file riêng của trang → `responsive.css`.
Thứ tự nạp script cuối trang: `shared/js/storage-keys.js` → `auth/session.js` →
`shared/js/fleet-store.js` → `js/auth-bridge.js` → `js/responsive.js` → JS của trang.

## Liên kết với phần còn lại

- Đăng nhập (`pages/login/login.js`, `auth/accounts.js`) và nút "Hàng hóa" trong
  Admin chuyển tới `pages/cargo/cargo.html`.
- Nút **Quản trị hệ thống** ở header chỉ hiện với tài khoản role `admin`, trỏ về `../admin.html`.
- Kết ca nhận hàng và giao hàng dùng 2 tập id/hàm tách biệt (phần giao hàng có tiền tố `dlv`).

## Chạy thử

```bash
cd src
python -m http.server 8000
# đăng nhập tại http://localhost:8000/pages/index.html
# hoặc mở thẳng http://localhost:8000/pages/cargo/cargo.html (cần đã đăng nhập)
```
