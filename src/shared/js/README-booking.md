# booking.js — đã tách 3 mảnh (Phase E2)

`booking.js` (2028 dòng) cắt tại banner tại dòng 912 và 1446 — các đoạn dòng liền mạch,
không sửa nội dung, không sắp xếp lại. Ghép lại = giống hệt từng byte (`cmp` xác nhận).

Chỉ `src/pages/ticketstaff.html` nạp (sau `ui.js`, trước `ticketstaff.js`). **Nạp đúng thứ tự:**

| # | File | Dòng gốc | Nội dung |
|---|---|---|---|
| 1 | `booking.js` | 1–911 | Trang "Lịch sử hành khách": bảng đầy đủ + bộ lọc, lịch "Ngày đi", nút "Ghế hủy" |
| 2 | `booking-combobox.js` | 912–1445 | Combobox tìm kiếm "Trạm đi/Trạm đến/Địa điểm rước" — `initDatalistCombobox()` + 3 lời gọi khởi tạo ở cuối mảnh |
| 3 | `booking-rebook.js` | 1446–2028 | Lịch chọn phơi modal "Đặt lại vé", builder Rước liền, wiring combobox Zone 1 (`wireZone1Combobox` + IIFE `initZone1ComboBoxes`), `scanTripSeatBankHistory`, `searchCustomerByPhone`, `updateTransferHint/BarVisibility` |

## An toàn khi tách (đã kiểm)

- Mảnh 2: `initDatalistCombobox` định nghĩa + 3 lời gọi đồng bộ đều nằm trong mảnh 2 → OK.
- Mảnh 3: IIFE `initZone1ComboBoxes` truyền `renderDirectionOptions`/`renderRouteOptions`/
  `wireZone1Combobox` **theo giá trị** — cả 3 định nghĩa trong mảnh 3, TRƯỚC IIFE → OK.
  Các biến của `ticketstaff.js` (`directionLabels`, `routeOptions`, `selectedDirection`…)
  chỉ nằm trong arrow-closure hoãn nên không lỗi lúc nạp (giống bản gốc).
- Không có bảng tham chiếu hàm theo giá trị ở top-level (chỉ `CH_GUEST_TAG_CLASS` = chuỗi).

## Khôi phục về 1 file

```bash
cat src/shared/js/{booking,booking-combobox,booking-rebook}.js > /tmp/booking.js
```
