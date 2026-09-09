# booking-ui/ — các mảnh của `booking-ui.css`

`booking-ui.css` (5139 dòng) đã được cắt thành **các lát liền mạch** theo đúng banner
`/* ===== ... ===== */` có sẵn trong file gốc (Phase D). Mỗi file dưới đây là một đoạn
dòng nguyên vẹn của file gốc — **không sửa, không sắp xếp lại** nội dung.

## Thứ tự nạp — BẮT BUỘC 01 → 11

Cascade / độ ưu tiên (specificity + last-wins) của CSS phụ thuộc thứ tự khai báo.
Ghép 11 file theo đúng thứ tự số = **giống hệt từng byte** file gốc (đã verify bằng
`cmp` + `sha256`). Vì vậy trong `src/pages/ticketstaff.html` phải giữ 11 thẻ `<link>`
đúng thứ tự này, không đổi chỗ.

| # | File | Dòng gốc | Nội dung |
|---|---|---|---|
| 01 | `01-base-layout.css` | 1–350 | brand, sơ đồ ghế cơ bản, MAIN LAYOUT |
| 02 | `02-zone1.css` | 351–1019 | ZONE 1 (bộ lọc + danh sách phơi + lịch) |
| 03 | `03-right-column.css` | 1020–1903 | RIGHT COLUMN: Zone 2 + tab + Zone 3 + thanh sticky |
| 04 | `04-overlay-modals.css` | 1904–2449 | OVERLAY/POPUP Zone 4 (panel đặt vé) + MODALS |
| 05 | `05-passenger-list.css` | 2450–3071 | PASSENGER LIST (Zone 3B) |
| 06 | `06-grid-table.css` | 3072–3533 | Bảng lưới kẻ ô đầy đủ + các cột (Hành trình/Ghế/Baga/Ghi chú) |
| 07 | `07-customer-history.css` | 3534–3767 | CUSTOMER HISTORY VIEW |
| 08 | `08-phoi-management.css` | 3768–3943 | PHƠI XE MANAGEMENT (toolbar kiểu shuttle) |
| 09 | `09-rebook-modal.css` | 3944–4338 | REBOOK MODAL (Đặt lại vé) |
| 10 | `10-customer-history-seatmap.css` | 4339–5001 | CUSTOMER HISTORY SEAT MAP VIEW |
| 11 | `11-responsive.css` | 5002–5139 | RESPONSIVE — toàn bộ `@media` |

## Khôi phục về 1 file (nếu cần)

```bash
cat src/shared/css/booking-ui/{01-base-layout,02-zone1,03-right-column,04-overlay-modals,05-passenger-list,06-grid-table,07-customer-history,08-phoi-management,09-rebook-modal,10-customer-history-seatmap,11-responsive}.css > src/shared/css/booking-ui.css
```
