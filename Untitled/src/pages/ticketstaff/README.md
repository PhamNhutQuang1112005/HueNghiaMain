# ticketstaff/ — các mảnh của `ticketstaff.js`

`ticketstaff.js` (5264 dòng) cắt thành **3 lát dòng liền mạch** (Phase E3) — không sửa
nội dung, không sắp xếp lại. Ghép lại = giống hệt từng byte (`cmp` xác nhận).

## Vì sao chỉ 3 lát (không nhiều hơn)

Trong bản gốc có **lệnh top-level đồng bộ** ở dòng 980–985 gọi `renderSeats()`,
`renderExtraSeats()`, `renderZone1TripList()`… — các hàm này định nghĩa tận dòng 1939
và 3543, chạy được nhờ **function hoisting** trong 1 `<script>`. Khi tách nhiều `<script>`,
hoisting theo từng file → **không được cắt trong khoảng (dòng 985, dòng 3543)**, nếu
không lời gọi ở mảnh đầu sẽ `ReferenceError`. Vùng an toàn duy nhất để cắt là **≥ 3543**
(sau khi mọi hàm init top-level đã được định nghĩa) và cắt tại các banner sau đó.

## Thứ tự nạp trong `src/pages/ticketstaff.html` — BẮT BUỘC, TRƯỚC `ticketstaff-manifest-*.js`

| # | File | Dòng gốc | Nội dung |
|---|---|---|---|
| 1 | `ticketstaff.js` | 1–3583 | dữ liệu ghế mẫu, storage models, tabs/Zone 3, chọn dòng + thanh "In vé TC", Zone 2 header, chọn/chuyển ghế, ghế phụ, searchable dropdowns, chuyển màn Đặt vé↔Lịch sử, **PHƠI XE MANAGEMENT** + tạo hàng loạt, `renderZone1TripList`. Chứa toàn bộ code init chạy lúc nạp. |
| 2 | `ticketstaff-account.js` | 3584–3853 | TÀI KHOẢN / ĐĂNG XUẤT (`initUserMenu` IIFE), CUSTOMER HISTORY SEARCH (IIFE ô tìm kiếm header), 2 listener `storage` cho rước liền / tài xế TC |
| 3 | `ticketstaff-pickup.js` | 3854–5264 | **RƯỚC LIỀN** (gộp từ pickup-list.js cũ): load/seed, lịch lọc ngày, nav 4-tab, modal "Cập nhật tài xế trung chuyển", modal "Ghi chú trung chuyển", danh sách hành khách rước liền, modal ghi chú trạng thái đón, modal "Chỉ định xe rước liền" |

## An toàn khi tách (đã kiểm)

- Mọi lệnh top-level đồng bộ (seed ghế, `renderSeats/…` @980–985, `renderCalendar` @2516,
  IIFE `initPhoiDashboard` @3531) nằm gọn trong **mảnh 1**, cùng chỗ với hàm chúng gọi.
- Mảnh 2: IIFE `initUserMenu` + IIFE ô tìm kiếm chỉ thao tác DOM + đăng ký listener hoãn.
  2 listener `storage` gọi hàm của mảnh 3 nhưng **hoãn** (chỉ chạy khi có sự kiện) → OK.
- Mảnh 3: `loadPickupPassengers()` @3903 + `seedDefaultShuttleDriverAssignment()` @3920 —
  hàm định nghĩa ngay trên (3871 / 3910) trong cùng mảnh 3.
- Không có bảng tham chiếu hàm theo giá trị ở top-level (đã quét — chỉ map chuỗi/SVG).
- `manifest-*.js` vẫn nạp SAU cả 3 mảnh nên phần "GHI ĐÈ hàm ticketstaff.js" không đổi.

## Khôi phục về 1 file

```bash
cat src/pages/ticketstaff/{ticketstaff,ticketstaff-account,ticketstaff-pickup}.js > /tmp/ticketstaff.js
# lưu ý: file gốc KHÔNG có newline ở cuối
```
