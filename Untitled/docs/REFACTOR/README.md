# Tái cấu trúc source web local — Huệ Nghĩa Express

Thư mục này chứa tài liệu cho việc **hệ thống hoá lại source code web local hiện tại**
(HTML + CSS + JS thuần trong `html/`, `css/`, `js/`).

Mục tiêu: source sạch, có cấu trúc, dễ bảo trì/mở rộng — **giữ nguyên 100% giao diện,
hành vi và nghiệp vụ hiện tại**. Không xây backend/DB, không đổi framework, không deploy.

## Tài liệu

| File | Nội dung |
|---|---|
| `00-AUDIT.md` | Kết quả audit toàn bộ source (pages, JS, CSS, data, component, permission, vấn đề, cấu trúc đích, kế hoạch, rủi ro). |
| `01-PHASE-A-CHECKLIST.md` | Checklist test thủ công dùng làm **mốc so sánh** (regression baseline). Duyệt trước khi refactor để chốt "GỐC OK", duyệt lại sau MỖI phase. |

## Điểm lùi an toàn (Phase 0)

- Nhánh refactor: **`refactor/restructure`** (mọi thay đổi refactor nằm ở đây).
- Nhánh gốc sạch: **`main`** — không đụng tới trong quá trình refactor.
- Snapshot WIP ngay trước refactor: tag **`pre-refactor`**.

Khôi phục toàn bộ về trạng thái trước refactor:

```bash
git checkout pre-refactor      # xem lại đúng trạng thái gốc
# hoặc
git checkout main              # nhánh gốc chưa có WIP admin/shuttle-merge
```

## Lưu ý về thư mục `web/`

`web/` là một bản **migrate sang Next.js + Supabase đang dang dở**, KHÔNG phải web local
hiện tại và **NGOÀI phạm vi** đợt tái cấu trúc này. Không sửa, không trộn, không xoá —
để nguyên cho giai đoạn sau. Web local đang chạy = `html/` + `css/` + `js/`.

## Tiến độ

| Phase | Trạng thái | Ghi chú |
|---|---|---|
| 0 — Điểm lùi an toàn | ✅ | nhánh `refactor/restructure`, tag `pre-refactor` |
| A — Checklist baseline | ✅ (tài liệu) | `01-PHASE-A-CHECKLIST.md` — cần người duyệt điền cột GỐC |
| B — Tạo cây `src/`, di chuyển file | ✅ | `git mv` thuần (0 đổi nội dung JS/CSS) + sửa đường dẫn `<link>/<script>` trong 3 HTML |
| C — Tách dữ liệu mẫu → `src/data/` | ✅ | `CUSTOMER_HISTORY_DATA`, `DEFAULT_*_TRIPS`, các pool sinh ghế (`nameSamples`…) ra khỏi `constants.js` + `ticketstaff.js`. Chỉ `ticketstaff.html` nạp thêm 3 file `src/data/*`; hành vi giữ nguyên (biến global như cũ). |
| D — Tách `booking-ui.css` → `booking-ui/` | ✅ | Cắt 5139 dòng thành 11 lát liền mạch theo banner Zone. `cmp`+`sha256` xác nhận ghép lại giống hệt từng byte. `ticketstaff.html` nạp 11 `<link>` đúng thứ tự 01→11. Xem `src/shared/css/booking-ui/README.md`. |
| **E — Tách file JS lớn theo banner** | 🔄 đang làm — từng file 1 commit + verify riêng | |
| &nbsp;&nbsp;E1 `admin.js` → 9 mảnh | ✅ | Cắt 1333 dòng theo banner mục 1–8. `cmp` xác nhận ghép lại giống hệt; `node --check` từng mảnh OK; không có def trùng. `admin.html` nạp 9 `<script>` đúng thứ tự. Xem `src/pages/admin/README.md`. **Đã fix 1 lỗi**: `VIEW_RENDERERS` tham chiếu hàm của mảnh nạp sau → bọc closure. |
| &nbsp;&nbsp;E2 `booking.js` → 3 mảnh | ✅ | Cắt 2028 dòng tại banner dòng 912 & 1446 → `booking.js` / `booking-combobox.js` / `booking-rebook.js`. `cmp` giống hệt; `node --check` OK; không def trùng. Đã soi: `initDatalistCombobox` (def+3 gọi cùng mảnh 2), IIFE `initZone1ComboBoxes` (3 hàm truyền-theo-giá-trị cùng mảnh 3, trước IIFE). Xem `src/shared/js/README-booking.md`. |
| &nbsp;&nbsp;E3 `ticketstaff.js` → 3 mảnh | ✅ | Cắt 5264 dòng tại banner dòng 3584 & 3854 → `ticketstaff.js` / `ticketstaff-account.js` / `ticketstaff-pickup.js`. **Chỉ cắt được ≥ dòng 3543** vì lệnh top-level @980–985 gọi hàm def @1939 & @3543 (hoisting). `cmp` giống hệt (file gốc không có newline cuối → mảnh cuối `sed 3854,$p`); `node --check` OK; không def trùng. `manifest-*.js` vẫn nạp sau cả 3. Xem `src/pages/ticketstaff/README.md`. |
| E hoàn tất | ✅ | 3 file JS lớn (admin/booking/ticketstaff) đã tách; các mảnh nạp qua nhiều `<script>` đúng thứ tự dòng gốc. |
| **F — Services bọc `localStorage`** | 🔄 đang làm — từng key 1 commit + verify | |
| &nbsp;&nbsp;F1 `HN_SHUTTLE_DRIVER_KEY` → `ShuttleDriverService` | ✅ | `src/services/shuttle-driver-service.js` (`getMap`/`setMap`/`hasAny`, `KEY`). Bọc 9 call site rải trong `ticketstaff.js` + `ticketstaff-pickup.js` (seed, `pkReadShuttleDriverMap`, `pkPrevShuttleDriverMap`, `pkApplyShuttleDriverChange`, `pkRenderPaxTable`, 2 write). Tên key + shape KHÔNG đổi. `account.js` giữ `e.key === HN_SHUTTLE_DRIVER_KEY` (so StorageEvent); `fleet-store.js` giữ reader nội bộ (thiết kế tự-chứa). |
| &nbsp;&nbsp;F2 `HN_TRIPS_KEY` → `TripService` | ✅ | `src/services/trip-service.js` (`getRawString`/`getAll`/`save`, `KEY`) — lớp lưu trữ mỏng, KHÔNG migration. `admin.js` `getTrips`/`setTrips` → service; `ticketstaff.js` `loadAllTrips` (giữ migration date/createdAt + fallback DEFAULT_*_TRIPS tại chỗ) + `saveData` → service. `save` KHÔNG try/catch (giữ đúng `lsWrite`/`saveData` cũ). Nạp ở cả 2 trang. `e.key ===` + fleet-store reader nội bộ giữ nguyên. |
| &nbsp;&nbsp;F3 `HN_PICKUP_PAX_KEY` → `PickupService` | ✅ | `src/services/pickup-service.js` — 4 method 1:1 với 3 kiểu call site: `readFirstNonEmpty(legacyKeys)` (multi-key legacy v5/v4/v3), `getAll()` (single-key), `save()` (không bắn event), `saveAndBroadcast()` (ghi + tự bắn `storage` cho chính tab). Bọc 7 site trong `ticketstaff-pickup.js` + `booking-rebook.js`. Tên key + shape + việc tự-dispatch KHÔNG đổi. `account.js` `e.key ===` giữ nguyên. |
| &nbsp;&nbsp;F4 (seat bank / manifest) | ⏸️ hoãn | `HN_STORAGE_KEY` đã có `loadSeatBank`/`saveSeatBank` (seat-bank.js) + admin `lsRead/lsWrite`; manifest có `tsLoadJSON/tsSaveJSON` (manifest-core.js) — đã trừu tượng sẵn trong từng file, giá trị gom thêm thấp. |
| &nbsp;&nbsp;dọn dead code `syncRuocLienToPickupList` | ✅ | Hàm 50 dòng ở `booking-rebook.js` — 0 caller (panel đặt vé không có option "Rước liền"). Xoá + gỡ `PickupService.getAll()` (orphan). |
| **G — Auth (session / accounts / permission)** | 🔄 đang làm — từng phần 1 commit | |
| &nbsp;&nbsp;G1 `Session` service | ✅ | `src/auth/session.js` (`get`/`set`/`clear`/`role`/`username`, `KEY`) bọc `hn_current_user`. Đổi 9 site: `login.js` (ghi), `admin.js` (guard + chip + logout), `ticketstaff-account.js` (chip + logout), `ticketstaff-pickup.js` (`pkIsShuttleDispatchRole`), `manifest-core.js` + `booking.js` (`getCurrentStaffLabel`/`getCurrentActionStaffCode`). Nạp ở **cả 3 trang** (index.html giờ nạp thêm `storage-keys.js` + `session.js`). `fleet-store.js` reader nội bộ giữ nguyên. |
| &nbsp;&nbsp;G2 accounts + permissions | ✅ | `src/auth/accounts.js` (`window.AUTH_ACCOUNTS` — gộp `accounts[]` login.js + `LOGIN_ACCOUNTS_MIRROR` admin, giờ admin dẫn xuất). `src/auth/permissions.js` (`window.Auth.isAdmin()` / `.isShuttleDispatch()` — gom đúng 2 gate hiện có, đọc role qua `Session`). `adminGuard` → `Auth.isAdmin()`; `pkIsShuttleDispatchRole` → `Auth.isShuttleDispatch()`. Không thêm luật mới. |
| G hoàn tất | ✅ | session + accounts + permission đã tập trung trong `src/auth/`. `fleet-store.js` reader nội bộ giữ nguyên (module tự-chứa). |
| **H — Namespace global (`window.HN.state`)** | ⏸️ hoãn | Rủi ro cao (globals như `tripSeatBank`/`allTripsMeta`/`currentTripId` dùng hàng trăm chỗ), lợi ích thấp lúc này. Làm sau khi có test thật / khi lên API. |
| **I — Gộp 4 lịch → `ui/datePicker.js`** | ⏸️ hoãn | Rủi ro cao (audit đã đánh dấu optional). |
| **J — Quét dependency / thứ tự nạp** | ✅ | `02-DEPENDENCY-MAP.md`: 34/34 file JS parse OK, 0 file mồ côi, 0 vòng phụ thuộc, mọi path resolve. Ghi lại thứ tự nạp chuẩn (7 layer) + quy ước `?v=`. Không sửa code. |
| **K — Regression tổng theo `01-PHASE-A-CHECKLIST`** | ⬜ | cần người duyệt trên trình duyệt |

### Cây thư mục sau Phase B

```
src/
├── pages/
│   ├── index.html · ticketstaff.html · admin.html   (3 trang — cùng cấp, điều hướng giữ nguyên)
│   ├── login/       login.css · login.js
│   ├── ticketstaff/ ticketstaff.css · ticketstaff.js · ticketstaff-manifest-core.js · ticketstaff-manifest-ui.js
│   └── admin/        admin.css · admin.js
├── shared/
│   ├── css/  variables.css · base.css · booking-ui/ (11 lát của booking-ui.css — Phase D)
│   └── js/   storage-keys.js · format.js · constants.js · seat-bank.js · fleet-store.js · ui.js · booking.js · events.js
├── assets/
│   └── img/  login-hero.png
└── data/   sample-seat-pool.js · sample-customer-history.js · sample-trip-templates.js  (dữ liệu MẪU — Phase C)
```

`src/shared/` là **kho tạm** — các phase sau sẽ tách/nâng dần thành `core/`, `services/`, `ui/`,
`data/`, `auth/`, `state/` như cấu trúc đích ở `00-AUDIT.md` mục I, khi từng file được dọn.
Thứ tự nạp `<script>` giữ **nguyên xi** so với trước.

## Quy trình mỗi phase

```
REFACTOR (phase nhỏ)  →  TEST theo 01-PHASE-A-CHECKLIST  →  FIX nếu lệch
                      →  VERIFY khớp cột "GỐC"           →  COMMIT  →  phase tiếp theo
```

Chưa tự động chạy hết các phase — mỗi phase báo cáo kết quả trước khi tiếp tục.
