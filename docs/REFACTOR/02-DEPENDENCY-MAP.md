# 02 — BẢN ĐỒ PHỤ THUỘC & THỨ TỰ NẠP (Phase J)

Quét toàn bộ `src/` sau Phase B–G. **Không sửa code** — chỉ xác nhận + ghi lại quy ước.

## Kết quả quét

- **34/34 file JS** `node --check` pass.
- **0 file mồ côi** — mọi `.js` đều được ≥1 trang nạp.
- **0 vòng phụ thuộc.** Không file nào cần định danh của file nạp SAU tại thời điểm
  parse/nạp. Mọi tham chiếu chéo "xuôi" (dùng hàm của file sau) đều nằm trong hàm chạy
  lúc runtime (click / init sau khi trang tải xong), không phải top-level.
- Mọi `src=`/`href=` trong 3 HTML đều trỏ tới file có thật (đã kiểm từng phase).

## Thứ tự nạp chuẩn (layer)

Nạp bằng `<script>` thường (không `type="module"`); `const/let` top-level chia sẻ
giữa các thẻ script cùng trang. **Thứ tự dưới đây là bắt buộc** — sắp sai gây
`ReferenceError` lúc nạp.

| Layer | File | Phụ thuộc (lý do phải nạp trước) |
|---|---|---|
| 0 | `shared/js/storage-keys.js` | — (hằng tên key; mọi thứ khác cần) |
| 1 | `shared/js/format.js` | — |
| 1 | `shared/js/constants.js` | — (thuần tĩnh từ Phase C) |
| 1 | `auth/accounts.js` | — (thuần data) |
| 1 | `data/sample-seat-pool.js` | — |
| 1 | `data/sample-customer-history.js` | **format.js** (`getPastDate()` chạy lúc nạp) |
| 1 | `data/sample-trip-templates.js` | — (tự chứa `todayStr__constants`) |
| 2 | `auth/session.js` | storage-keys (`HN_CURRENT_USER_KEY`) |
| 2 | `auth/permissions.js` | (dùng `Session` lúc runtime) — xếp sau session.js |
| 3 | `shared/js/seat-bank.js` | constants (`VEHICLE_TYPE_SEATS`), sample-seat-pool (`nameSamples`) — chỉ lúc runtime, nhưng xếp sau cho an toàn |
| 3 | `shared/js/fleet-store.js` | storage-keys (IIFE `seedAll()` chạy lúc nạp) |
| 3 | `services/trip-service.js` | storage-keys (`HN_TRIPS_KEY` ở đầu IIFE) |
| 3 | `services/pickup-service.js` | storage-keys (`HN_PICKUP_PAX_KEY`) |
| 3 | `services/shuttle-driver-service.js` | storage-keys (`HN_SHUTTLE_DRIVER_KEY`) |
| 4 | `shared/js/ui.js` *(chỉ ticketstaff)* | (dùng global trang lúc runtime) |
| 5 | `shared/js/booking.js` → `booking-combobox.js` → `booking-rebook.js` *(chỉ ticketstaff)* | đúng thứ tự này; `booking-rebook.js` có IIFE `initZone1ComboBoxes` chạy lúc nạp, dùng hàm định nghĩa ngay trong `booking-rebook.js` phía trên |
| 6 | **admin**: `admin.js` → `admin-dashboard` → `admin-stations` → `admin-trips` → `admin-vehicles` → `admin-staff` → `admin-accounts` → `admin-activity` → `admin-settings-boot` | `admin.js` (mảnh 1) có `adminGuard` + `VIEW_RENDERERS` + `initAdminUserMenu`/`switchAdminView`; `admin-settings-boot` (mảnh cuối) chạy BOOT — phải cuối. `admin-accounts` dùng `AUTH_ACCOUNTS`. |
| 6 | **ticketstaff**: `ticketstaff.js` → `ticketstaff-account` → `ticketstaff-pickup` → `ticketstaff-manifest-core` → `ticketstaff-manifest-ui` | `ticketstaff.js` (mảnh 1, dòng 1–3583) chứa toàn bộ code init lúc nạp + hàm chúng gọi (`renderSeats`→`renderZone1TripList`…). `manifest-ui.js §8` ghi đè hàm của 3 mảnh ticketstaff → phải nạp sau cả 3. `ticketstaff-pickup` `pkIsShuttleDispatchRole` dùng `Auth`. |
| 7 | `shared/js/events.js` | **NẠP CUỐI CÙNG** — dispatcher tra hàm theo tên (`window[...]`) tại thời điểm click, cần mọi hàm nghiệp vụ đã định nghĩa |

### Trang nào nạp gì

| File | index.html | admin.html | ticketstaff.html |
|---|:--:|:--:|:--:|
| storage-keys, format | ✓* | ✓ | ✓ |
| constants, seat-bank | | ✓ | ✓ |
| auth/session | ✓ | ✓ | ✓ |
| auth/accounts | ✓ | ✓ | |
| auth/permissions | | ✓ | ✓ |
| fleet-store | | ✓ | ✓ |
| services/trip | | ✓ | ✓ |
| services/pickup, services/shuttle-driver | | | ✓ |
| data/*, ui, booking* | | | ✓ |
| events | | ✓ | ✓ |

\* index.html chỉ nạp `storage-keys.js` (cho `session.js`) — KHÔNG nạp `format.js`.

## Quy ước `?v=` (cache-busting)

Mỗi `<script>`/`<link>` mang `?v=N` riêng. **Khi sửa nội dung 1 file → tăng `?v=` của
đúng file đó** ở mọi trang nạp nó (dùng `grep -rn "tên-file.js?v="` để tìm hết). Số
không có ý nghĩa ngữ nghĩa, chỉ cần khác lần trước. File chưa từng sửa từ lúc tách giữ
nguyên số (vd `booking-ui/*.css?v=108`, các mảnh `admin-*.js?v=1`).

Sau khi `git pull` mà thấy giao diện/hành vi lạ → **hard-reload** (Ctrl+F5) để chắc chắn
không dính cache cũ.

## Vấn đề nhỏ ghi nhận (không sửa ở Phase J)

- `ui.js` dùng biến `toastTimer` chưa khai báo ở đâu → thành global ngầm ở lần
  `showToast()` đầu tiên. Hoạt động, nhưng nên khai báo tường minh ở Phase H.
- Vị trí `auth/*` giữa `seat-bank.js` và `fleet-store.js` trên ticketstaff.html hơi lệch
  so với admin.html (auth trước `fleet-store` ở cả 2, nhưng ticketstaff có `seat-bank`
  chen trước auth). Vô hại — không consumer nào của `Session`/`Auth` nạp trước
  `fleet-store.js`. Để nguyên, tránh churn.
