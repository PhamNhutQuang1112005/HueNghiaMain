# 00 — AUDIT SOURCE WEB LOCAL

Ngày audit: 2026-09-01. Không sửa code trong bước này — chỉ phân tích & lập kế hoạch.

> **Lưu ý:** tài liệu này chụp lại hiện trạng **trước** khi refactor. Từ Phase B, toàn bộ
> `html/ css/ js/ img/` đã được `git mv` vào `src/` (xem `README.md` › "Cây thư mục sau Phase B").
> Các đường dẫn `js/…`, `css/…` bên dưới là vị trí **cũ** — đối chiếu để hiểu lịch sử, không
> phải vị trí hiện tại.

---

## A. Cấu trúc hiện tại

```
d:\DH\huenghia\
├── html/
│   ├── index.html        (93 dòng)   — Trang đăng nhập
│   ├── ticketstaff.html  (2097 dòng) — Trang nghiệp vụ chính
│   └── admin.html         (97 dòng)  — Vỏ trang Admin (view dựng động bằng JS)
├── css/
│   ├── login.css          (340)
│   ├── ticketstaff.css   (2373)
│   ├── admin.css         (1119)
│   └── shared/
│       ├── variables.css   (16)   — CSS custom properties
│       ├── base.css       (123)   — reset + nền chung
│       └── booking-ui.css (5139)  — CSS Zone 1–4, bảng, modal, lịch, responsive
├── js/
│   ├── login.js           (161)
│   ├── ticketstaff.js    (5295)   — GOD FILE: ~178 hàm top-level
│   ├── admin.js          (1333)
│   ├── ticketstaff-manifest-core.js (640)  — logic phơi/manifest
│   ├── ticketstaff-manifest-ui.js  (1147)  — render phơi + GHI ĐÈ hàm của ticketstaff.js
│   └── shared/
│       ├── storage-keys.js (25)   — tên key localStorage/sessionStorage (nguồn duy nhất)
│       ├── format.js       (77)   — hàm định dạng thuần
│       ├── constants.js    (86)   — hằng số + dữ liệu mẫu trộn lẫn
│       ├── seat-bank.js    (60)   — sinh mã ghế + load/save seat bank
│       ├── fleet-store.js (508)   — window.FleetStore: nguồn dữ liệu Hướng/Tuyến/Trạm/Xe/NV
│       ├── ui.js          (212)   — toast, modal, panel đặt vé, dropdown
│       ├── booking.js    (2023)   — lịch sử hành khách, lịch, combobox, modal đặt lại
│       └── events.js      (112)   — dispatcher trung tâm cho data-action
├── img/           — login-hero.png
├── web/           — MIGRATION Next.js + Supabase (đang dang dở, NGOÀI PHẠM VI)
└── README.md
```

Tổng ~23.000 dòng. Không build step, không bundler — file tĩnh chạy trực tiếp. Các
`<script>` nạp thường (không `type="module"`); biến `const/let` top-level chia sẻ ngầm
giữa các thẻ `<script>` cùng trang — **thứ tự nạp là load-bearing** (cảnh báo trong
comment ở gần như mọi file).

Thứ tự nạp script của `ticketstaff.html`:
`storage-keys → format → constants → seat-bank → fleet-store → ui → booking →
ticketstaff → manifest-core → manifest-ui → events`

Của `admin.html`:
`storage-keys → format → constants → seat-bank → fleet-store → admin → events`

## B. Pages & chức năng

| Page | Chức năng | Role dùng |
|---|---|---|
| **index.html** | Đăng nhập. `accounts[]` hard-code trong `js/login.js`, lưu `hn_current_user` vào sessionStorage, redirect theo role. | tất cả |
| **ticketstaff.html** | 4 tab: **Đặt vé** (Zone 1 danh sách phơi / Zone 2 header xe / Zone 3 sơ đồ ghế + tab Trung chuyển / Zone 4 panel đặt vé), **Rước liền**, **Lịch sử hành khách**, **Phơi xe** (quản lý + tạo hàng loạt). Kèm: chuyển ghế, ghế phụ, khởi hành → tổng hợp vé → tạo phơi, kết ca/đối soát, gán tài xế trung chuyển. | `shuttle_dispatch` |
| **admin.html** | 8 view CRUD `FleetStore`: Dashboard, Quản lý trạm (Hướng/Tuyến/Trạm), Quản lý chuyến, Quản lý xe, Quản lý nhân viên, Tài khoản, Nhật ký hoạt động, Cài đặt. Guard `role !== 'admin'` → đá về index. | `admin` |

`dieuhanh.html / ketoan.html / taixe.html` khai báo trong login.js nhưng **chưa tồn tại**.
`callcenter.html` và `shuttle.html` **đã bị xoá** — nghiệp vụ gộp vào ticketstaff.

## C. UI components dùng chung

| Component | Vị trí hiện tại | Ghi chú |
|---|---|---|
| Toast | `ui.js` `showToast()` + `#toast` | generic, OK |
| Modal đóng/mở | `ui.js` `closeModal()` | mỗi trang tự khai báo overlay |
| Panel đặt vé (Zone 4) | `ui.js` `openBookingPanel()` | **thò tay vào global page** (`tripSeatBank`, `allTripsMeta`, `currentTripId`) — ranh giới UI/logic nhoè |
| Searchable dropdown | `ticketstaff.js` `filterDropdown()` + `booking.js` | tài xế/phụ xe/biển số |
| Datalist combobox | `booking.js` `initDatalistCombobox()` | trạm đi/đến/địa điểm rước |
| **Lịch chọn ngày** | **≥4 bản riêng biệt**: Zone 1, Lịch sử "Ngày đi", Rước liền, modal Đặt lại vé | trùng lặp (comment tự nhận) |
| Bảng lưới đầy đủ | `.grid-table` (booking-ui.css) | Hành khách / Trung chuyển / Ghế hủy |
| Badge trạng thái | rải trong CSS từng trang | |
| Ô nhiều số điện thoại | `ui.js` `renderExtraPhoneFields()` | panel + modal khách rước |
| Dispatcher sự kiện | `events.js` — `data-action`/`data-args` | pattern tốt, đã thay hết inline onclick |

## D. Services / business logic cần tách

Chỉ **`FleetStore`** (fleet-store.js) đã đóng gói đúng chuẩn: `window.FleetStore` với
getter/setter, seed, dependency guard, activity log. **Hình mẫu để nhân rộng.**

Chưa đóng gói — đang gọi `localStorage.getItem(HN_*_KEY)` + `JSON.parse` rải rác:

| Dữ liệu / key | Nằm rải ở | Nên gom |
|---|---|---|
| Seat bank — `hn_trip_seat_bank_v12` | seat-bank.js, ticketstaff.js, ui.js, booking.js | `SeatBankService` |
| Phơi/chuyến — `hn_trips_meta_v9` | ticketstaff.js, manifest-core.js, fleet-store.js | `TripService` |
| Khách rước liền — `hn_pickup_passengers_v6` | ticketstaff.js | `PickupService` |
| Manifest — `hn_ts_manifests_v1` | manifest-core.js, manifest-ui.js | `ManifestService` |
| Gán tài xế TC — `hn_shuttle_driver_assign_v1` | ticketstaff.js | `ShuttleDriverService` |
| Sinh vé/khách mẫu | ticketstaff.js `makeSeat()`, `nameSamples`, `phonePool` | tách sang `data/` (mock) |

## E. State hiện tại

Biến top-level chia sẻ ngầm giữa các `<script>` (không có store):
`tripSeatBank`, `allTripsMeta`, `currentTripId`, `currentUser`, `currentPanelMode`,
`currentPanelSeats`, `currentPanelSeat`, `currentEditSeatCode`, `toastTimer`,
`calendarOpen`, `pickupTimeIdx`, `custIdx`, `ticketSeq`, `todayStr__constants`…
→ Không có `appState`. Nguồn rủi ro lớn nhất khi tách file.

## F. Dữ liệu đang lưu ở đâu

- **localStorage**: `hn_trip_seat_bank_v12`, `hn_trips_meta_v9`, `hn_pickup_passengers_v6`,
  `hn_ts_manifests_v1`, `hn_shuttle_driver_assign_v1`, `hn_directions_v3`, `hn_routes_v5`,
  `hn_stations_v1`, `hn_vehicle_types_v1`, `hn_vehicles_v1`, `hn_staff_v1`,
  `hn_admin_activity_v1`, `callcenter.zone1Collapsed`
- **sessionStorage**: `hn_current_user`
- **Hard-code trong JS**: `login.js` (accounts), `constants.js` (CUSTOMER_HISTORY_DATA,
  VEHICLE_TYPE_SEATS, DEFAULT_*_TRIPS, STAFF_CODE_MAP), `ticketstaff.js` (nameSamples,
  phonePool, driverList…), `fleet-store.js` (SEED_* — hợp lý vì là seed)
- **Inline HTML**: hầu hết `<select>` đã rút về FleetStore; còn lại ít.

⚠️ **Mọi chuỗi key `HN_*` phải giữ nguyên byte** khi refactor — đổi là mất dữ liệu.

## G. Role & permission hiện tại

- Định nghĩa ở `js/login.js`: roles `shuttle_dispatch`, `admin`, `dispatch_manager`,
  `accountant`, `driver`.
- Thực thi **rải rác, không tập trung**:
  - `admin.js:24` — `if (u.role !== 'admin')` → redirect
  - `ticketstaff.js:3980` — `user.role === 'shuttle_dispatch'` → bật UI chọn nhiều dòng
    + nút "Cập nhật" tài xế ở tab Trung chuyển
  - fleet-store.js chỉ dùng role để lọc danh sách nhân viên, không phải phân quyền
- **Nhãn role không nhất quán**: login.js "Điều hành trung chuyển" vs ticketstaff.js
  fallback "Nhân viên tổng đài" vs admin.js accounts "Nhân viên tổng đài".
- Chưa có `hasPermission()`. Permission thực tế rất mỏng: 2 trang, mỗi trang 1 check role.

## H. Vấn đề trong source (GHI NHẬN — không sửa nghiệp vụ)

1. `ticketstaff.js` 5295 dòng / ~178 hàm / 10+ mối quan tâm trong 1 file. `booking-ui.css`
   5139 dòng. `booking.js` 2023 dòng.
2. Thứ tự nạp mong manh: global chia sẻ ngầm giữa các `<script>`; tách/di chuyển sai thứ
   tự → `undefined` lúc parse.
3. Monkey-patch ẩn: `ticketstaff-manifest-ui.js §8` "GHI ĐÈ/BỌC CÁC HÀM CÓ SẴN Ở
   ticketstaff.js" — coupling khó lần.
4. Tên "shared" sai thực tế: `booking.js`, `ui.js` giờ chỉ ticketstaff dùng. Chỉ thật sự
   dùng chung: `storage-keys`, `format`, `fleet-store`, `events`, `seat-bank`, `constants`.
5. Dữ liệu mẫu trộn hằng số trong `constants.js`; trộn logic trong `ticketstaff.js`.
6. 4 bản lịch chọn ngày gần giống nhau.
7. Truy cập localStorage rải rác thay vì qua service (trừ FleetStore).
8. `?v=NN` cache-bust chỉnh tay trên từng thẻ — dễ lệch (ticketstaff.js `?v=116`).
9. WIP chưa commit + file mới chưa track (`js/admin.js`, `js/shared/fleet-store.js`…),
   `shuttle.*` vừa xoá — chưa có điểm lùi. File rác `git` ở gốc. → **xử lý ở Phase 0**.
10. Hai cây "nguồn sự thật": `html|css|js/` (bản chạy) và `web/` (Next.js dang dở).
11. Nhãn role không đồng bộ giữa 3 file.

## I. Cấu trúc source mục tiêu (đề xuất)

> **Điều chỉnh so với prompt mẫu:**
> 1. KHÔNG chuyển sang ES modules / bundler ở phase này. Giữ `<script>` thường. Chỉ tách
>    file theo banner `/* ===== */` có sẵn + gom global vào namespace `window.HN.*` dần
>    (đúng pattern `window.FleetStore`).
> 2. Không đụng `web/` — cô lập.
> 3. Thêm Phase 0.5: commit WIP hiện tại trước.
> 4. `services/` copy đúng mô hình `FleetStore`.
> 5. Gộp 4 lịch → 1 là việc rủi ro cao → để phase cuối, optional.
> 6. `state/appState.js` chỉ chứa vài biến điều phối, chuyển từng biến một.

```
src/
├── pages/
│   ├── login/         login.html · login.css · login.js
│   ├── ticketstaff/   ticketstaff.html · ticketstaff.css
│   │   ├── booking/      (chọn ghế, chuyển ghế, panel đặt vé, ghế phụ)
│   │   ├── pickup/       (rước liền)
│   │   ├── history/      (lịch sử hành khách — từ booking.js)
│   │   ├── phoi/         (quản lý phơi + tạo hàng loạt)
│   │   ├── manifest/     (manifest-core + manifest-ui)
│   │   └── transship/    (tab Trung chuyển + gán tài xế)
│   └── admin/         admin.html · admin.css
│       └── views/        (dashboard, stations, trips, vehicles, staff, accounts, activity, settings)
├── core/             storage-keys.js · events.js · format.js
├── services/         fleetStore.js · seatBankService.js · tripService.js
│                     pickupService.js · manifestService.js · shuttleDriverService.js
├── auth/             accounts.js · session.js · permissions.js
├── ui/               toast.js · modal.js · dropdown.js · combobox.js · datePicker.js(sau)
├── data/             sampleCustomers.js · sampleTrips.js · sampleSeeds.js
├── state/            appState.js
└── styles/
    ├── variables.css · base.css
    ├── components/   (tách booking-ui.css theo banner Zone)
    └── pages/        (ticketstaff.css, admin.css)
```

## J. Migration Plan

| Phase | Việc | Verify |
|---|---|---|
| **0** | Commit WIP → nhánh `refactor/restructure`; tag `pre-refactor`; xoá rác `git`; ghi chú cô lập `web/`. | `git status` sạch |
| **A** | Chốt checklist test thủ công (`01-PHASE-A-CHECKLIST.md`) làm mốc. | có file checklist + cột GỐC OK |
| **B** | Tạo cây `src/`, `git mv` không đổi nội dung, sửa đường dẫn `<link>/<script>` + `?v=`. | 3 trang load y hệt, 0 lỗi console |
| **C** | Rút dữ liệu mẫu khỏi `constants.js` + `ticketstaff.js` → `src/data/`. | so UI, seed đúng |
| **D** | Tách `booking-ui.css` theo banner Zone → `styles/components/`; giữ thứ tự nạp. | pixel-identical |
| **E** | Tách `ticketstaff.js`/`booking.js`/`admin.js` theo banner, cùng thứ tự. Xử lý monkey-patch. | full regression từng lần split |
| **F** | Thêm `services/*` bọc `localStorage.getItem(HN_*)`; đổi call site dần. | key `HN_*` không đổi; đọc được dữ liệu cũ |
| **G** | `auth/`: gom accounts, session, `hasPermission()` map ĐÚNG Y quyền hiện tại. Đồng bộ nhãn role. | login + guard + tab TC như cũ |
| **H** | Thay global rời bằng `window.HN.state.*` — từng biến một. | regression sau mỗi biến |
| **I** | *(optional)* Gộp 4 lịch → `ui/datePicker.js` giữ hành vi. | so từng lịch |
| **J** | Quét dependency: thứ tự nạp, không vòng, thống nhất `?v=`. | |
| **K** | Regression toàn bộ theo checklist Phase A trên 3 trang. | |

## K. Rủi ro phá chức năng

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Global chia sẻ ngầm giữa `<script>` → `undefined` khi đổi thứ tự | **Cao** | Giữ đúng thứ tự nạp; tách "tại chỗ" trước khi di chuyển |
| `booking-ui.css` tách theo Zone → đảo thứ tự rule → lệch specificity | **Cao** | Nạp `<link>` đúng thứ tự cũ; so pixel |
| Monkey-patch `manifest-ui.js §8` phụ thuộc timing | **Cao** | Không tách phần bị ghi đè khỏi phần ghi đè trong cùng bước |
| Đổi nhầm chuỗi key `HN_*` → mất seat bank / phơi / rước liền | **Cao** | Cấm sửa chuỗi key; giữ trong `storage-keys.js` |
| Cache `?v=` phục vụ file cũ sau khi move | Trung bình | Bump version / hard-reload |
| `hasPermission()` map sai quyền → mở/khoá nhầm nút | Trung bình | Bảng đối chiếu role→quyền, test từng account |
| Không có test tự động — verify thủ công | Trung bình | Checklist Phase A chi tiết, phase nhỏ |
| Đụng nhầm `web/` | Thấp | Không thao tác trong `web/` |
