# admin/ — các mảnh của `admin.js`

`admin.js` (1333 dòng) đã cắt thành **các lát dòng liền mạch** theo banner mục 1–8
có sẵn (Phase E1). Mỗi file là một đoạn nguyên vẹn của bản gốc — không sửa, không
sắp xếp lại. Ghép lại theo thứ tự = giống hệt từng byte (`cmp` đã xác nhận).

## Thứ tự nạp trong `src/pages/admin.html` — BẮT BUỘC theo thứ tự này

Các file dùng chung biến/hàm global top-level như khi còn là 1 file. `admin.js` (mảnh
đầu) chứa guard + state + `initAdminUserMenu()` / `switchAdminView()`; `admin-settings-boot.js`
(mảnh cuối) chứa 2 dòng BOOT gọi 2 hàm đó nên **phải nạp sau cùng** (trước `events.js`).

| # | File | Dòng gốc | Nội dung |
|---|---|---|---|
| 1 | `admin.js` | 1–146 | header, GUARD (IIFE), state chung, section 0 (helper), `initAdminUserMenu`, `switchAdminView`, 2 listener toàn cục |
| 2 | `admin-dashboard.js` | 147–209 | 1. DASHBOARD |
| 3 | `admin-stations.js` | 210–545 | 2. QUẢN LÝ TRẠM (Hướng/Tuyến/Trạm) |
| 4 | `admin-trips.js` | 546–1028 | 3. QUẢN LÝ CHUYẾN |
| 5 | `admin-vehicles.js` | 1029–1134 | 4. QUẢN LÝ XE |
| 6 | `admin-staff.js` | 1135–1225 | 5. QUẢN LÝ NHÂN VIÊN |
| 7 | `admin-accounts.js` | 1226–1245 | 6. TÀI KHOẢN (chỉ đọc) |
| 8 | `admin-activity.js` | 1246–1275 | 7. NHẬT KÝ HOẠT ĐỘNG |
| 9 | `admin-settings-boot.js` | 1276–1333 | 8. CÀI ĐẶT + dòng BOOT ở cuối |

## Khôi phục về 1 file

```bash
cat src/pages/admin/{admin,admin-dashboard,admin-stations,admin-trips,admin-vehicles,admin-staff,admin-accounts,admin-activity,admin-settings-boot}.js > /tmp/admin.js
```
