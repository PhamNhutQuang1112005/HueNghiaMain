# Nhà Xe Huệ Nghĩa — Hệ thống quản lý nhà xe

Bộ giao diện demo (front-end tĩnh, không build step) cho hệ thống quản lý nhà xe
**Huệ Nghĩa Express**: bán vé, điều hành trung chuyển, quản lý hàng hóa/COD, và
trang quản trị. Toàn bộ là HTML/CSS/JavaScript thuần (vanilla JS), dữ liệu là
mock/demo khai báo cứng trong các file `.js` hoặc lưu ở `localStorage` — chưa nối
với backend/API thật.

## Cấu trúc thư mục

Repo gồm **hai mảng giao diện độc lập**, không dùng chung layout:

### 1. `html/` + `css/` + `js/` — Nghiệp vụ hàng hóa & COD

| Trang (`html/`) | JS đi kèm | Chức năng |
|---|---|---|
| `cargo.html` | `cargo.js`, `stations.js` | Nhập hàng, danh sách lô hàng, lập vận đơn Baga |
| `delivery.html` | `cargo.js`, `stations.js` | Giao hàng, gán hàng vào phơi xe đi |
| `manifest.html` | `stations.js` | Quản lý phơi hàng, danh sách xe cần nhận |
| `cod.html` | `cod.js` | Đối soát tiền thu hộ (COD) giữa các chi nhánh |
| `receive-report.html` | `receive-report.js` | Báo cáo nhận hàng theo ca (thu ngân) |
| `delivery-report.html` | `delivery-report.js` | Báo cáo giao hàng theo ca (thu ngân) |
| `returned.html` | `stations.js` | Danh sách hàng trả về, chuyển lại vào phơi khác |

`js/responsive.js` xử lý sidebar/menu responsive dùng chung cho các trang trên.
`js/stations.js` là master data danh sách trạm (điểm đi/đến) dùng chung.

`js/callcenter.js` / `css/callcenter.css` và `js/shuttle.js` chứa logic tổng đài
và điều hành trung chuyển nhưng **không có trang HTML tương ứng trong repo này**
(có thể trang chủ đã bị bỏ sót khi export/tách file).

### 2. `pages/` — Đăng nhập, Bán vé, Quản trị

| Trang | Thư mục con | Chức năng |
|---|---|---|
| `pages/index.html` | `pages/login/` | Đăng nhập & phân quyền theo role |
| `pages/ticketstaff.html` | `pages/ticketstaff/` | Bán vé (Zone 1–3), lịch sử khách hàng, quản lý phơi xe, **rước liền** (trung chuyển) |
| `pages/admin.html` | `pages/admin/` | Trang quản trị: dashboard, trạm/tuyến, chuyến, xe, nhân viên, tài khoản, kế toán, lịch, trung chuyển, vé... |

Mỗi trang lớn (`admin.js`, `ticketstaff.js`) từng là **một file duy nhất, rất
dài** và đã được cắt thành nhiều mảnh nhỏ theo banner mục, nạp theo đúng thứ tự
trong `<script>` — xem chi tiết & thứ tự nạp bắt buộc tại:
- [`pages/admin/README.md`](pages/admin/README.md)
- [`pages/ticketstaff/README.md`](pages/ticketstaff/README.md)

> **Lưu ý:** các trang trong `pages/` tham chiếu tới `../shared/css/`,
> `../shared/js/`, `../assets/img/` và `../auth/` (biến `variables.css`,
> `base.css`, `booking-ui/*.css`, `storage-keys.js`, `session.js`,
> `accounts.js`, `login-hero.png`...) — những thư mục này **không có mặt** trong
> bản export hiện tại của repo. Cần bổ sung `shared/`, `assets/`, `auth/` (đặt
> ngang cấp với `pages/`) để các trang trong `pages/` chạy được đầy đủ.

## Chạy thử

Đây là site tĩnh, không cần build/cài dependency. Mở trực tiếp file `.html`
bằng trình duyệt, hoặc chạy một static server đơn giản để tránh lỗi CORS khi
load ảnh/script (khuyến khích cho `pages/`, vì có dùng `localStorage` chia sẻ
giữa các trang):

```bash
# ví dụ với Python
python -m http.server 8000
# rồi mở http://localhost:8000/pages/index.html
#        hoặc http://localhost:8000/html/cargo.html
```

## Ghi chú kỹ thuật

- Ngôn ngữ giao diện: tiếng Việt.
- Không có framework/build tool — chỉ HTML/CSS/JS thuần, font qua Google Fonts CDN.
- Dữ liệu là **mock/demo**: khai báo cứng trong các file JS hoặc đọc/ghi qua
  `localStorage` (khóa dạng `hueNghia_*` / `huenghia_*`). Khi triển khai thật,
  cần thay bằng gọi API tới backend (đăng nhập cần hash mật khẩu phía server,
  hiện `js/login.js` đang hard-code tài khoản demo phía client).
- Không có `package.json`, test suite, hay CI trong repo này.
