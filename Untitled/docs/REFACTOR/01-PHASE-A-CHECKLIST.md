# 01 — PHASE A: CHECKLIST TEST THỦ CÔNG (REGRESSION BASELINE)

Mục đích: chốt **hành vi hiện tại** của web local làm mốc so sánh cho mọi phase refactor.

## Cách dùng

1. **Chốt mốc GỐC:** `git checkout pre-refactor` (hoặc `refactor/restructure` khi chưa
   bắt đầu Phase B), mở lần lượt 3 trang, đi hết checklist, điền cột **GỐC** =
   `OK` / `LỖI SẴN CÓ: <mô tả>`.
2. **Sau mỗi phase refactor:** đi lại checklist, điền cột **Phase X**. Bất kỳ mục nào
   khác cột GỐC ⇒ dừng, sửa cho khớp GỐC trước khi commit / sang phase sau.
3. Không sửa "lỗi sẵn có" trong lúc refactor — chỉ ghi nhận (mục H của audit).

## Môi trường test

- [ ] Trình duyệt: ghi rõ (Chrome/Edge…) + phiên bản: ______
- [ ] Cách mở: mở file trực tiếp `file://` HAY qua local server (ghi rõ): ______
- [ ] **Đường dẫn 3 trang (sau Phase B):**
  - Login: `src/pages/index.html`
  - TicketStaff: `src/pages/ticketstaff.html`
  - Admin: `src/pages/admin.html`
  - (Local server chạy ở gốc repo → `http://localhost:PORT/src/pages/index.html`)
- [ ] Trước khi test GỐC: **giữ nguyên** localStorage đang có (đừng xoá) — hoặc ghi chú
  nếu test trên localStorage trống để thấy đường đi seed.
- [ ] DevTools Console mở suốt buổi test.

---

## 0. Kiểm tra chung (làm cho CẢ 3 trang)

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 0.1 | Console error | Tải trang → Console không có error đỏ | | |
| 0.2 | Console warning | Ghi lại warning nếu có (một số warning `[events.js]` có thể là sẵn có) | | |
| 0.3 | 404 resource | Tab Network: không có CSS/JS/img/font nào 404 | | |
| 0.4 | Thứ tự script | Không có `ReferenceError: X is not defined` khi thao tác | | |
| 0.5 | Layout tổng thể | Bố cục, khoảng cách, màu, font khớp ảnh chụp GỐC | | |
| 0.6 | Responsive | Thu nhỏ cửa sổ (≈1024px, ≈768px): layout co đúng như GỐC | | |

> Gợi ý: chụp màn hình từng trang ở trạng thái GỐC, lưu vào `docs/REFACTOR/_baseline-screenshots/`.

---

## 1. index.html — Đăng nhập

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 1.1 | Đăng nhập admin | `quantri01` / `123456` → chuyển sang `admin.html` | | |
| 1.2 | Đăng nhập tổng đài | `tongdai01` / `123456` → chuyển sang `ticketstaff.html` | | |
| 1.3 | Đăng nhập trung chuyển | `trungchuyen01` / `123456` → chuyển sang `ticketstaff.html` | | |
| 1.4 | Sai mật khẩu | mật khẩu bất kỳ sai → hiện khối lỗi đỏ "Sai tài khoản hoặc mật khẩu" | | |
| 1.5 | Sai tài khoản | username không tồn tại → cùng thông báo lỗi | | |
| 1.6 | Trang chưa xây | `dieuhanh01` / `ketoan01` / `taixe01` (`/123456`) → báo "Trang ... đang được xây dựng", KHÔNG điều hướng | | |
| 1.7 | Hiện/ẩn mật khẩu | Bấm icon con mắt → password ↔ text | | |
| 1.8 | Ghi nhớ đăng nhập | Checkbox tick/untick được (chỉ UI) | | |
| 1.9 | Quên mật khẩu | Link "Quên mật khẩu?" hiển thị (không cần hoạt động) | | |
| 1.10 | sessionStorage | Sau đăng nhập: `hn_current_user` có `{username, role, roleLabel}` đúng | | |
| 1.11 | Ảnh hero | `img/login-hero.png` hiển thị nửa trái | | |

---

## 2. ticketstaff.html

Đăng nhập bằng `tongdai01` (hoặc `trungchuyen01` cho các mục "role trung chuyển").

### 2.1 Khung chung & điều hướng tab

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.1.1 | 4 pill tab | "Đặt vé / Rước liền / Lịch sử hành khách / Phơi xe" hiện, bấm chuyển view đúng | | |
| 2.1.2 | Chip user | Góc phải hiện tên + role đúng người đăng nhập | | |
| 2.1.3 | Đăng xuất | Menu user → Đăng xuất → về `index.html`, `hn_current_user` bị xoá | | |
| 2.1.4 | Giữ tab khi thao tác | Chuyển tab qua lại không mất dữ liệu đang xem | | |

### 2.2 Tab "Đặt vé" — Zone 1 (danh sách phơi)

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.2.1 | Danh sách phơi | Zone 1 liệt kê các thẻ phơi (giờ, biển số, tuyến, badge trạng thái) | | |
| 2.2.2 | Chọn phơi | Bấm 1 thẻ → Zone 2 + Zone 3 nạp đúng phơi đó | | |
| 2.2.3 | Lọc khung giờ | Nút "Tất cả các giờ" → popover 2 cột Sáng/Chiều → chọn giờ → danh sách lọc đúng | | |
| 2.2.4 | Lịch chọn ngày | Nút lịch Zone 1 → đổi ngày → danh sách phơi đổi theo ngày | | |
| 2.2.5 | Thu/hiện Zone 1 | Nút toggle mép Zone 1 → ẩn/hiện; trạng thái lưu `callcenter.zone1Collapsed` | | |
| 2.2.6 | Số lượng phơi | Đếm phơi khớp dữ liệu `hn_trips_meta_v9` + phơi mẫu | | |

### 2.3 Tab "Đặt vé" — Zone 2 (header xe & thống kê)

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.3.1 | Header xe | Biển số, loại xe, tuyến, giờ, ngày hiển thị đúng phơi đang chọn | | |
| 2.3.2 | Thống kê ghế | Số đã bán / giữ / trống / tổng đúng với sơ đồ | | |

### 2.4 Tab "Đặt vé" — Zone 3 Sơ đồ ghế

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.4.1 | Vẽ sơ đồ | 2 tầng A/B, số ghế đúng theo loại xe (vd 34 giường ẩn A3/B3) | | |
| 2.4.2 | Màu trạng thái | sold / hold / free / empty màu đúng như GỐC | | |
| 2.4.3 | Tag loại khách | Ghế Rước liền/Rước đường/Trung chuyển hiện tag; "Khách trạm" không tag | | |
| 2.4.4 | Click ghế trống | → mở panel "Đặt vé" (Zone 4) | | |
| 2.4.5 | Click ghế đã bán | → panel "Thông tin ghế" (ẩn nút Lưu/Bán, hiện "In lại") | | |
| 2.4.6 | Click ghế hold/free | → panel "Sửa thông tin ghế" (cho Lưu) | | |
| 2.4.7 | Menu ghế | Chuột phải / nút menu trên ghế → menu (Chuyển ghế, ...) | | |
| 2.4.8 | Chuyển ghế | Menu → "Chuyển ghế" → chọn ghế đích trống → khách chuyển sang, ghế cũ trống | | |
| 2.4.9 | Chọn nhiều ghế | Kéo/bấm chọn nhiều ghế trống → panel hiện dãy chip ghế → đặt hàng loạt | | |
| 2.4.10 | Tab "Trung chuyển" trong Zone 3 | Bấm tab → bảng khách cần trung chuyển; số đếm `(x | y)` đúng | | |
| 2.4.11 | Tab "Ghế hủy" | Hiện danh sách ghế đã huỷ của phơi | | |

### 2.5 Tab "Đặt vé" — Zone 4 Panel đặt vé

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.5.1 | Mở panel | Overlay trượt ra, tiêu đề đúng chế độ (Đặt vé / Sửa / Thông tin) | | |
| 2.5.2 | Thông tin phơi | Dòng phụ hiện giờ - tuyến • ngày của phơi đang xem | | |
| 2.5.3 | Nhập SĐT nhiều số | Nút thêm số → thêm ô; xoá ô; gộp thành 1 chuỗi khi lưu | | |
| 2.5.4 | Loại khách | Đổi "Loại khách": các ô phụ (địa điểm rước / trung chuyển đi / trả) hiện/ẩn đúng | | |
| 2.5.5 | Trạm đi/đến | Combobox (gõ tự do + gợi ý datalist) nhận giá trị | | |
| 2.5.6 | Giá vé | Hiển thị giá; đổi giá cập nhật vé mẫu | | |
| 2.5.7 | Giá 0đ | Đặt giá 0đ → ô "Lý do giá 0đ" hiện + bắt buộc; lưu vào `seat.zeroPriceReason` | | |
| 2.5.8 | Đặt cọc | Bật "Đặt cọc" → nhập số tiền + phương thức (Tiền mặt/CK); lưu riêng, mở lại đúng | | |
| 2.5.9 | Hành lý | Tick "Có hành lý" → ô ghi chú hành lý hiện | | |
| 2.5.10 | Ghi chú | Nhập ghi chú tự do có ký tự `"` `<` `&` → không vỡ layout (escapeHtml) | | |
| 2.5.11 | Đặt vé | Bấm "Đặt vé" → ghế thành hold/sold theo luồng GỐC, panel đóng, sơ đồ cập nhật | | |
| 2.5.12 | Lưu thay đổi | Sửa ghế đã đặt → "Lưu thay đổi" → dữ liệu ghế cập nhật | | |
| 2.5.13 | Bán vé | (nếu có nút) "Bán vé" → chuyển sold + luồng in vé GỐC | | |
| 2.5.14 | In lại | Ghế đã bán → "In lại" mở mẫu in | | |
| 2.5.15 | Đóng panel | Nút đóng / click overlay → panel đóng, không lưu | | |
| 2.5.16 | Mở lại sửa | Mở lại ghế vừa lưu → mọi trường (SĐT, loại khách, cọc, lý do 0đ, hành lý) trả đúng | | |

### 2.6 Ghế phụ

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.6.1 | Thêm ghế phụ | Chức năng thêm ghế phụ (chỉ ghi chú + giá) hoạt động | | |
| 2.6.2 | Hiển thị | Ghế phụ hiện đúng chỗ trên sơ đồ / danh sách như GỐC | | |

### 2.7 Searchable dropdown (tài xế / phụ xe / biển số)

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.7.1 | Lọc gõ | Gõ vào ô → danh sách lọc theo từ khoá (bỏ dấu) | | |
| 2.7.2 | Chọn mục | Chọn 1 dòng → giá trị điền vào ô | | |
| 2.7.3 | Cảnh báo trùng lịch tài xế | Chọn tài xế có "(trùng lịch)" → hiện cảnh báo `checkDriverConflict` | | |
| 2.7.4 | Nguồn dữ liệu | Danh sách tài xế/phụ xe/biển số lấy từ FleetStore (khớp Admin) | | |

### 2.8 Tab "Rước liền"

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.8.1 | Danh sách | Bảng khách rước liền hiển thị từ `hn_pickup_passengers_v6` | | |
| 2.8.2 | Lịch lọc ngày | Widget lịch riêng của tab này → lọc theo ngày | | |
| 2.8.3 | Nav 4 tab con | "Tất cả / Trung chuyển đón / Rước liền / Trung chuyển trả" lọc đúng nhóm | | |
| 2.8.4 | Chọn dòng (checkbox) | **Role trung chuyển**: checkbox hiện, chọn nhiều dòng được | | |
| 2.8.5 | (role thường) | `tongdai01`: KHÔNG có cột chọn dòng / nút "Cập nhật" hàng loạt (đúng như GỐC) | | |
| 2.8.6 | Thanh nổi "In vé trung chuyển" | Khi chọn ≥1 dòng → thanh nổi hiện, bấm in ra phiếu tài xế | | |
| 2.8.7 | Modal "Cập nhật tài xế trung chuyển" | Mở, chọn tài xế, lưu → cột "Tài xế" cập nhật; lưu `hn_shuttle_driver_assign_v1` | | |
| 2.8.8 | Modal "Ghi chú trung chuyển" | Cột "Trung chuyển" → mở modal ghi chú, lưu, hiện lại đúng | | |
| 2.8.9 | Modal "Chỉ định xe rước liền" | Gán xe cho khách rước liền → cập nhật | | |
| 2.8.10 | Modal ghi chú trạng thái đón (cột "Phòng vé") | Mở, lưu trạng thái đón khách | | |
| 2.8.11 | Đồng bộ từ seat bank | Khách "Rước liền" đặt ở tab Đặt vé xuất hiện đúng ở tab này | | |

### 2.9 Tab "Lịch sử hành khách"

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.9.1 | Bảng đầy đủ | Cột ngày, SĐT, tên, tuyến, giờ, ghế, hành trình, trạng thái... hiển thị | | |
| 2.9.2 | Bộ lọc đầu trang | Lọc theo các tiêu chí ở toolbar hoạt động | | |
| 2.9.3 | Lịch "Ngày đi" | Widget lịch lọc theo ngày đi | | |
| 2.9.4 | Nút "Ghế hủy" | Mở danh sách ghế huỷ (khác tab Ghế hủy trong màn đặt vé) | | |
| 2.9.5 | Tìm khách | Gõ SĐT/tên ở ô tìm → kết quả gợi ý | | |
| 2.9.6 | Mở lịch sử khách | Chọn 1 kết quả → view "Lịch sử hành khách" của khách đó | | |
| 2.9.7 | View sơ đồ ghế của khách | Trong lịch sử khách → xem lại sơ đồ ghế chuyến đã đi | | |
| 2.9.8 | Modal "Đặt lại vé" | Mở modal rebook, chọn phơi (có lịch chọn phơi riêng), xác nhận | | |
| 2.9.9 | Dữ liệu mẫu | `CUSTOMER_HISTORY_DATA` (15 dòng) hiển thị đúng khi chưa có lịch sử thật | | |

### 2.10 Tab "Phơi xe"

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.10.1 | Danh sách phơi mẫu | Hiển thị các phơi mẫu (`isTemplate:true`) + phơi đã tạo | | |
| 2.10.2 | Lọc Chiều đi / Chiều về | Toggle lọc theo `sense` của hướng | | |
| 2.10.3 | Tạo phơi đơn lẻ | Form: chọn hướng/tuyến, biển số, loại xe, ngày, giờ, giá, ghi chú → tạo → phơi mới vào danh sách + `hn_trips_meta_v9` | | |
| 2.10.4 | Dropdown hướng/tuyến | Lấy từ `FleetStore.buildTripDirectionsCfg()` — mỗi tuyến 1 mục | | |
| 2.10.5 | Loại xe nổi bật | `<select>` loại xe hiện 3 loại `featuredForTrip` + đủ loại còn lại | | |
| 2.10.6 | Tạo phơi hàng loạt | Bật chế độ chọn phơi mẫu → tick nhiều mẫu → tạo hàng loạt → đúng số phơi | | |
| 2.10.7 | Modal "Lộ trình" | Mở → timeline dọc điểm xuất phát / đón khách / điểm đến đúng tuyến | | |
| 2.10.8 | Nhân bản → Bán vé | Nút "Bán vé" trên phơi mẫu/đã tạo → chuyển sang tab Đặt vé đúng phơi + sơ đồ ghế | | |
| 2.10.9 | Sửa / xoá phơi | (nếu GỐC cho phép) sửa/xoá phơi đã tạo | | |

### 2.11 Quản lý vòng đời chuyến (manifest — core + ui)

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.11.1 | Badge + nút theo state | Mỗi phơi hiện badge trạng thái + nút hành động đúng theo state (Đang bán / Đã chỉ định xe / Khởi hành / Kết ca) | | |
| 2.11.2 | Khởi hành xe | Bấm "Khởi hành" → tổng hợp vé → tạo phơi/manifest (`hn_ts_manifests_v1`) | | |
| 2.11.3 | Xem phơi | Mở "Xem phơi" → bảng tổng hợp đầy đủ (khách, ghế, tiền, tài xế...) | | |
| 2.11.4 | In phơi | "In phơi" → mẫu phơi giấy theo khu vực (SG/BD/AG) — layout khác web, cùng data | | |
| 2.11.5 | Khách ngoài phơi | Thêm khách ngoài phơi → xuất hiện trong tổng hợp | | |
| 2.11.6 | Kết ca / đối soát | Chức năng kết ca → bảng đối soát tiền đúng | | |
| 2.11.7 | Re-open | Mở lại phơi đã khởi hành/kết ca → về trạng thái trước, chỉnh tiếp được | | |
| 2.11.8 | "Tiền ứng" | Cột/nhãn "tiền ứng" trên bảng phơi hiển thị & tính đúng theo nghĩa nghiệp vụ hiện tại | | |

### 2.12 Tài khoản / phiên

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 2.12.1 | Mở trực tiếp khi chưa đăng nhập | Mở `ticketstaff.html` không có `hn_current_user` → hành vi GỐC (ghi lại: có chặn hay không) | | |
| 2.12.2 | Ghi `seat.staff` | Thao tác đặt/bán vé → `seat.staff` = username hiện tại (hoặc `system`) | | |

---

## 3. admin.html

Đăng nhập bằng `quantri01`.

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 3.1 | Guard quyền | Mở `admin.html` khi chưa đăng nhập / role ≠ admin → redirect về `index.html` | | |
| 3.2 | Guard OK | Đăng nhập admin → vào được, không redirect | | |
| 3.3 | Chip user | Hiện "Quản trị viên" + username + roleLabel; menu mở/đóng | | |
| 3.4 | Đăng xuất | → về `index.html`, xoá `hn_current_user` | | |
| 3.5 | Sidebar 8 mục | Bấm từng mục → section tương ứng hiện, các section khác `hidden` | | |
| 3.6 | Dashboard | Thẻ thống kê hiển thị số liệu (đếm hướng/tuyến/xe/nhân viên/chuyến...) | | |
| 3.7 | Quản lý trạm — cây Hướng/Tuyến | Cây phân cấp Hướng > Tuyến hiển thị từ FleetStore | | |
| 3.8 | CRUD Hướng | Thêm / sửa / bật-tắt / xoá hướng; xoá bị chặn khi còn tuyến con hoặc còn chuyến (`canDeleteDirection`) | | |
| 3.9 | CRUD Tuyến | Thêm / sửa / xoá tuyến; sửa giá, trạm đi/đến/nhận; xoá bị chặn khi còn chuyến dùng (`canDeleteRoute`) | | |
| 3.10 | Danh mục trạm theo vùng | 3 vùng SG / BD / AG; thêm/xoá trạm; modal chọn trạm (station picker) | | |
| 3.11 | Xoá trạm | Xoá trạm → gỡ khỏi mọi tuyến; cảnh báo `stationUsage` | | |
| 3.12 | Quản lý chuyến | Danh sách thẻ phơi (đồng bộ tab "Phơi xe" TicketStaff); thao tác CRUD như GỐC | | |
| 3.13 | Quản lý xe | CRUD xe: biển số, loại xe, số ghế, scope `line`/`shuttle`, tài xế/phụ xe mặc định | | |
| 3.14 | Xoá xe | Bị chặn khi biển số đang gắn chuyến/phơi/manifest (`canDeleteVehicle`) | | |
| 3.15 | Quản lý nhân viên | CRUD: mã, tên, username, role (ticket/driver/helper/shuttle_driver), SĐT, bằng lái | | |
| 3.16 | Xoá nhân viên | Bị chặn khi đang phân công ở chuyến/phơi/manifest hoặc nằm trong `STAFF_CODE_MAP` (`canDeleteStaff`) | | |
| 3.17 | Tài khoản | Bảng tài khoản (username / roleLabel / redirect) hiển thị (read-only) | | |
| 3.18 | Nhật ký hoạt động | Danh sách log từ `FleetStore.log` (`hn_admin_activity_v1`), mới nhất trước, cap 500 | | |
| 3.19 | Log được ghi | Sau khi CRUD ở Admin → có dòng log mới với user/action/entity/summary | | |
| 3.20 | Cài đặt — Khôi phục mặc định | `resetToSeed()` → xoá key cấu hình + seed lại; xác nhận trước khi chạy | | |
| 3.21 | Toast | Mọi thao tác lưu/xoá → toast xác nhận hiện & tự ẩn | | |
| 3.22 | Modal Admin | `#adminModal` mở/đóng, nội dung dựng động đúng từng loại | | |

---

## 4. Dữ liệu & tích hợp chéo

| # | Hạng mục | Cách kiểm | GỐC | Phase __ |
|---|---|---|---|---|
| 4.1 | Seed 1 lần | localStorage trống → tải admin/ticketstaff → các key `hn_directions_v3`, `hn_routes_v5`, `hn_stations_v1`, `hn_vehicle_types_v1`, `hn_vehicles_v1`, `hn_staff_v1` được tạo | | |
| 4.2 | Không ghi đè | Đã có dữ liệu → tải lại trang KHÔNG ghi đè bằng seed | | |
| 4.3 | Tên key không đổi | Sau refactor: tất cả key `hn_*` trong `Application > Local/Session Storage` giữ nguyên tên | | |
| 4.4 | Admin → TicketStaff | Thêm 1 tuyến ở Admin → mở TicketStaff tab Phơi xe → tuyến mới có trong dropdown | | |
| 4.5 | Admin → TicketStaff (xe) | Thêm biển số ở Admin → xuất hiện trong dropdown biển số khi tạo phơi | | |
| 4.6 | Admin → TicketStaff (nhân viên) | Thêm tài xế ở Admin → xuất hiện trong dropdown tài xế trung chuyển | | |
| 4.7 | Cross-tab sync | Mở TicketStaff + Admin ở 2 tab; đổi ở Admin → tab TicketStaff nhận qua sự kiện `storage` (không cần F5) | | |
| 4.8 | Seat bank bền | Đặt vài vé → F5 → vé vẫn còn (`hn_trip_seat_bank_v12`) | | |
| 4.9 | Phơi bền | Tạo phơi → F5 → phơi vẫn còn (`hn_trips_meta_v9`) | | |
| 4.10 | Không lag khi thao tác ghế | Đặt/huỷ/sửa ghế liên tục → không giật/lag bất thường (lưu ý note trong `seat-bank.js`) | | |

---

## 5. Ảnh chụp baseline (khuyến nghị)

Lưu vào `docs/REFACTOR/_baseline-screenshots/`:

- [ ] `login.png`
- [ ] `ts-booking.png` (Zone 1+2+3 khi chọn 1 phơi)
- [ ] `ts-panel.png` (panel Zone 4 mở, chế độ Đặt vé)
- [ ] `ts-pickup.png`
- [ ] `ts-history.png`
- [ ] `ts-phoi.png`
- [ ] `ts-manifest-print.png` (mẫu in phơi)
- [ ] `admin-stations.png`
- [ ] `admin-vehicles.png`
- [ ] `admin-staff.png`

---

## Kết quả mốc GỐC

- Người test: ______   Ngày: ______   Commit test: `pre-refactor` (`git rev-parse pre-refactor`: ______)
- Tổng mục: ~130   |   OK: ___   |   Lỗi sẵn có (ghi nhận, không sửa khi refactor): ___

### Danh sách "lỗi sẵn có" ghi nhận

| # mục | Mô tả lỗi hiện tại | Ghi chú |
|---|---|---|
| 2.4.8 / 2.4.9 | Thanh "Chuyển ghế / Đặt vé nhóm / Hủy" không hiện khi chọn ghế ở sơ đồ (role phòng vé). Nguyên nhân: `querySelector('.sticky-actions')` trúng nhầm `#tsPrintActionBar` (thanh "In vé trung chuyển" đứng trước trong DOM sau đợt gộp shuttle→ticketstaff). | **ĐÃ SỬA** trước Phase B — thêm `id="seatTransferBar"`, đổi 3 call site sang `getElementById`. Commit riêng, không thuộc refactor. |
| 2.8.4 / 2.8.5 / 2.1.2 | Role phòng vé (`tongdai01`) bị lộn thành role trung chuyển ở tab Trung chuyển (hiện checkbox chọn nhiều + nút "Cập nhật" thay vì "Chỉ định"). Nguyên nhân: đợt gộp shuttle→ticketstaff đổi `tongdai01.role` từ `call_center` → `shuttle_dispatch`, trùng với `trungchuyen01`, làm chế độ phòng vé không truy cập được. | **ĐÃ SỬA** trong Phase B — khôi phục `tongdai01` về `role: "call_center"` / "Nhân viên tổng đài" (giống bản trước commit `b04d927`); bump `login.js?v=3`. |
| 3.* (admin trắng trang) | Sau Phase E1 (tách `admin.js`), trang admin không hiển thị gì. Nguyên nhân: `VIEW_RENDERERS` trong mảnh `admin.js` tham chiếu thẳng các hàm `render*` (nằm ở mảnh nạp SAU) ngay lúc dựng object ở top-level → `ReferenceError` khi mảnh 1 chạy. | **ĐÃ SỬA** ngay trong Phase E1 — bọc mỗi renderer bằng closure gọi-khi-cần `function(){ renderX(); }` (các hàm đều không tham số → hành vi y hệt); bump `admin.js?v=17`. |

## Điều chỉnh hành vi theo yêu cầu (Phase K)

Không phải lỗi refactor — người dùng yêu cầu đổi hành vi có sẵn khi rà soát:

| Chỗ | Trước | Sau |
|---|---|---|
| Tab "Trung chuyển" (`pkRenderPaxTable`) — cột "Trung chuyển" (tài xế) | Dòng khách rước liền: "Chưa gán tài xế". Dòng khách trung chuyển: **tên tài xế MẪU**. | Cả hai: **để trống** khi chưa gán tài xế thật. |
| Tab "Trung chuyển" — thứ tự dòng trung chuyển | Theo vị trí ghế. | Vé vừa đặt/sửa từ modal đặt vé (`seat.actionTime` mới nhất) **nổi lên đầu** nhóm trung chuyển. |
| `pkGetTransshipRows` — điều kiện hiện | (giữ nguyên) đã gom mọi loại khách có địa chỉ trung chuyển đón/trả — xác nhận đúng, không sửa. | — |
