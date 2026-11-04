> **ĐÃ CHỐT 28/10/2026** (đã ghi vào dat-ve-erd.mmd): Q1 = không lưu vé gốc (như lựa chọn C); Q2 = B (bán bao gồm đặt, vẫn có người chỉ đặt); Q3 = A; Q4 = A; Q5 = A; Q6 = KHÔNG seed quyền mặc định (HR cấp theo khóa chức năng; chỉ giữ cờ bật kiểm quyền); C7 = bắt buộc lý do khi chuyển vé sold sang phơi khác; C3 = thêm view_tickets, view_customers; C5 = bỏ trip_seat.state; Q7 = A (người có change_price sửa mọi giá kể cả giá bảng). Các phần Q1-Q7 bên dưới giữ để tham chiếu, đừng làm theo lựa chọn không được chốt.

# Đặt vé: các điểm cần chủ quyết định và lệnh triển khai

Đối chiếu `docs/dat-ve-erd.mmd` với code ngày 28/10/2026. Mỗi mục Q có: vấn đề (kèm vị trí code), các lựa chọn, và **lệnh triển khai theo từng lựa chọn**. Bạn chỉ cần điền chữ cái vào bảng ở cuối file. Chưa lựa chọn nào được áp dụng vào code hay ERD.

Quy ước: `ERD` = sửa `docs/dat-ve-erd.mmd`; `CODE` = sửa code app; `TEST` = cách kiểm.

---

## PHẦN 0. Việc làm chắc chắn (không cần quyết, làm theo bất kỳ lựa chọn nào)

**W1. Ghi nhật ký admin cho Đặt lại vé (sửa lỗi B12).**
CODE `src/pages/ticketstaff/ticketstaff-manifest-ui.js`, khối `wrapLog` (khoảng dòng 1295-1312):
- Cho `wrapLog` nhận hàm lấy phơi riêng, thêm hai dòng:
  `wrapLog('confirmRebook', 'rebook', 'đặt lại vé', () => rebookSelectedTripId);`
  `wrapLog('confirmRebookAndSell', 'rebook_sell', 'đặt lại vé và bán', () => rebookSelectedTripId);`
- Lưu ý: `confirmRebookAndSell` chỉ mở hộp thanh toán, việc bán thật chạy ở `confirmSellPayment` (nhánh `pendingRebookSell`, `ticketstaff.js:2959`). Bọc `confirmSellPayment` bằng hàm phơi động: `() => (pendingRebookSell ? pendingRebookSell.tripId : pendingPickupAssignSell ? pendingPickupAssignSell.tripId : currentTripId)`, nhưng phải đọc biến này **trước** khi gọi hàm gốc vì hàm gốc xoá nó.
- Bọc thêm `confirmRestoreFromCancelled` (action `restore`), `pkConfirmAssign` và `adminTsConfirmSellPayment` (action `assign_pickup`).
- TEST: đăng nhập admin, Re-open đóng, đặt lại vé vào phơi đã khởi hành, kiểm có bản ghi nhật ký.

**W2. Sửa ERD B11 và B16: "chỉ định xe" KHÔNG thuộc `transship_assign`.**
Trong code, `transship_assign` chỉ bật *chế độ điều hành trung chuyển* (`Auth.isShuttleDispatch`, `ticketstaff-pickup.js:118`), dùng để gán tài xế và cập nhật chặng. Nút "Chỉ định" (`pkConfirmAssign`, nút ghi chữ "Bán vé") là chế độ *phòng vé*, dành cho người **không** có `transship_assign` (`ticketstaff.js:4226` ẩn nút này ở chế độ điều hành).
ERD: B11 dòng "Cần quyền transship_pickup để nhập khách, transship_assign để chỉ định xe" đổi thành "transship_pickup để nhập khách; chỉ định xe (bán vé Rước liền) theo Q5; transship_assign chỉ cho gán tài xế / cập nhật chặng". B16 sửa tương ứng.

**W3. Thêm vào ERD.**
- B18: thêm action `rebook`, `rebook_sell` vào danh sách action của `activity_logs`.
- B18 "HIỆN TRẠNG": đổi thành "admin thao tác sau khởi hành đã được ghi qua wrapLog (edit, sell, cancel_seat, transfer, add_group, split_sell, và rebook, restore, assign_pickup sau W1); thao tác thường chưa ghi".
- B22: thêm mục (f) mô tả đường vào từ lịch sử: nút "Đặt lại" ở mỗi dòng trang Lịch sử hành khách (`openRebookFromHistory`, `booking-combobox.js:333`). Điền sẵn: tên, SĐT, loại khách, trạm đi / đến, điểm đón / trả, ghi chú, hành lý. **Không mang theo**: đại lý, cọc, lý do 0đ, ghế đôi, giá (giá tra lại theo phơi mới). Lưu `customer_id` theo SĐT chính như B14.
- B16: đổi nhãn `sell_ticket` thành "Bán vé / Hủy ghế đã bán, chuyển vé, Đặt lại vé nút Bán" (`permissions.js:81`), và thêm dòng `assign_depart_reopen` vào bảng B16 (khóa quyết định Re-open của B12).

**W4. Thêm hàm kiểm quyền chung.**
CODE `src/shared/js/seat-bank.js`, ngay sau `requireActor` (dòng 132-141):
```js
// Kiểm quyền theo khóa (admin gốc luôn qua, xem Auth.hasPermission). keys: string | string[] (đủ MỘT trong các khóa).
function requirePermission(keys, msg) {
  var list = Array.isArray(keys) ? keys : [keys];
  if (window.Auth && Auth.hasAnyPermission(list)) return true;
  if (typeof showToast === 'function') showToast(msg || 'Tài khoản không có quyền thực hiện thao tác này');
  return false;
}
```
Hàm này chỉ chặn ở giao diện. ERD B16 giữ nguyên yêu cầu kiểm lại ở tầng service khi lên DB: `acting_context(user_id, station_id)` rồi `has_permission(key)`.

**W5. Ẩn nút theo quyền** (bổ sung cho kiểm quyền, không thay thế): sau khi chốt Q2-Q5, nút "Đặt" / "Bán" ở panel đặt vé, modal Đặt lại vé và thanh chọn ghế được ẩn hoặc làm mờ khi thiếu quyền tương ứng.

---

## PHẦN 1. Các điểm cần quyết

### Q1. Đặt lại vé từ lịch sử: có lưu vé gốc không?

**Hiện trạng.** `openRebookFromHistory` điền form từ dòng lịch sử, rồi `confirmRebook` / `confirmSellPayment` tạo vé mới. Vé gốc chỉ xuất hiện trong dòng chữ "Đặt lại từ vé cũ…" của modal (`rbSubtitle`); sau khi lưu thì không còn dấu vết nào nối vé mới với vé cũ. `transferred_from_ticket_id` không dùng được vì nó có nghĩa "vé nguồn bị chuyển đi và đổi trạng thái", còn đặt lại thì vé cũ vẫn nguyên.

**Lựa chọn**
- **A (khuyên): thêm cột `ticket.rebooked_from_ticket_id`** (FK tới `ticket`, nullable). Truy được "khách quay lại", thống kê đặt lại, đối soát khi khách khiếu nại.
- **B: chỉ ghi nhật ký** `activity_logs` action `rebook` với `changes = { from_ticket_id }`. Không đổi cấu trúc bảng, nhưng muốn thống kê phải đọc JSON nhật ký.
- **C: không lưu.** Giữ nguyên như app hiện tại.

**Lệnh triển khai nếu chọn A**
- ERD `ticket`: thêm dòng `bigint rebooked_from_ticket_id FK "vé gốc khi Đặt lại vé từ lịch sử; NULL = vé thường hoặc dữ liệu cũ; CHECK khác ticket_id"`.
- ERD quan hệ: `ticket |o--o{ ticket : "vé đặt lại từ lịch sử (rebooked_from_ticket_id)"`.
- ERD B22: thêm "(g) vé mới ghi `rebooked_from_ticket_id` = vé của dòng lịch sử được bấm Đặt lại; vé gốc có thể ở trạng thái bất kỳ, kể cả cancelled / transferred / phơi đã khởi hành; không chặn khi vé gốc còn hiệu lực".
- ERD B17: thêm index `ticket(rebooked_from_ticket_id) WHERE NOT NULL`. ERD B20: dữ liệu cũ để NULL.
- ERD ánh xạ app: `rebookedFromTicketNo` + `rebookedFromTripId` -> `ticket.rebooked_from_ticket_id` (tra vé theo phơi + mã vé).
- CODE `booking-combobox.js` `openRebookFromHistory`: sau khi lấy `r`, đặt `rebookSourceTicketNo = r.ticketNo; rebookSourceTripId = r.tripId;` (khai báo hai biến cạnh `rebookSelectedSeats` ở `ticketstaff-account.js:70`; dòng lịch sử đã có `ticketNo`, `tripId`). Dữ liệu quá khứ `CUSTOMER_HISTORY_DATA` không có `tripId`: để null.
- CODE `closeRebookModal` (`booking.js:588`): reset hai biến về null.
- CODE `confirmRebook` (`ticketstaff-account.js`, trong `Object.assign(seat, {...})`): thêm `rebookedFromTicketNo: rebookSourceTicketNo, rebookedFromTripId: rebookSourceTripId`. `confirmRebookAndSell`: lưu vào `pendingRebookSell` rồi chép vào ghế ở nhánh `pendingRebookSell` của `confirmSellPayment` (`ticketstaff.js:2959`).
- TEST: đặt lại một vé từ lịch sử, kiểm ghế mới mang hai trường; mở Đặt lại không từ lịch sử (nếu có đường khác) thì hai trường rỗng.

**Nếu chọn B:** ERD B18 thêm `rebook` (đã có ở W3), mô tả `changes.from_ticket_id`; CODE cần biến `rebookSourceTicketNo` như A nhưng chỉ đưa vào nhật ký (W1). **Nếu chọn C:** bỏ mục (g); chỉ làm W1, W3.

---

### Q2. `sell_ticket` có bao gồm `book_ticket` không?

**Hiện trạng.** Hai khóa độc lập, chưa khóa nào được kiểm. Bán trực tiếp từ ghế trống (không qua bước đặt) là luồng có thật (`sellTicket`, `ticketstaff.js:2801`).

**Lựa chọn**
- **A (khuyên): độc lập.** Người chỉ có `sell_ticket` vẫn bán trực tiếp được nhưng không tạo được vé giữ chỗ. Người chỉ có `book_ticket` chỉ giữ chỗ, không bán. Rõ ràng nhất với yêu cầu dùng riêng từng chức năng.
- **B: bán bao gồm đặt.** Mọi chỗ kiểm `book_ticket` đổi thành "book_ticket HOẶC sell_ticket". Phù hợp nếu mọi người bán vé cũng được đặt vé.

**Lệnh triển khai**
- Chung: gắn kiểm quyền ở `saveTicket` (nhánh tạo mới, `ticketstaff.js:2677`), `sellTicket` (2801), `confirmSellPayment` (2953), `sellFromTransferBar` (3237), `confirmAddToGroup` (2062), `confirmRebook`, `confirmRebookAndSell`, `confirmRestoreFromCancelled` (`booking-combobox.js:483`), ngay dưới dòng `if (!requireActor(...)) return;` sẵn có.
  - tạo vé hold (`saveTicket` tạo mới, `confirmAddToGroup`, `confirmRebook`, `confirmRestoreFromCancelled`): `if (!requirePermission(BOOK_KEYS)) return;`
  - tạo hoặc chuyển sang sold (`sellTicket`, `confirmSellPayment`, `sellFromTransferBar`, `confirmRebookAndSell`): `if (!requirePermission('sell_ticket')) return;`
- Nếu **A**: `const BOOK_KEYS = ['book_ticket'];`. Nếu **B**: `const BOOK_KEYS = ['book_ticket', 'sell_ticket'];`
- ERD B16: ghi rõ lựa chọn trong một câu; cập nhật bảng ma trận.
- TEST: tạo tài khoản chỉ `book_ticket`, bấm Bán -> bị chặn; tài khoản chỉ `sell_ticket`, bấm Đặt -> bị chặn (A) hoặc qua (B).

---

### Q3. Vé giữ chỗ (hold): người chỉ có `book_ticket` có được sửa / hủy / chuyển không?

**Hiện trạng.** Nhãn `sell_ticket` là "Bán vé / Hủy ghế, chuyển vé", và ERD B9 / B16 gán hủy ghế, chuyển vé cho `sell_ticket`. Hệ quả: nhân viên tổng đài chỉ có `book_ticket` không tự hủy hay đổi chỗ vé hold mình vừa đặt được.

**Lựa chọn**
- **A (khuyên): theo trạng thái ghế.** Ghế hold: `book_ticket` hoặc `sell_ticket`. Ghế sold: chỉ `sell_ticket`. Chọn lẫn hold và sold trong một thao tác thì cần `sell_ticket`.
- **B: giữ như ERD.** Hủy, chuyển, sửa mọi vé đều cần `sell_ticket`.

**Lệnh triển khai nếu chọn A**
- CODE thêm hàm cạnh `requirePermission`:
```js
// seats: các ghế nguồn của thao tác. Có ghế sold -> cần sell_ticket; toàn hold -> book_ticket hoặc sell_ticket.
function requireTicketTouchPermission(seats) {
  var hasSold = (seats || []).some(function (s) { return s && s.state === 'sold'; });
  return hasSold ? requirePermission('sell_ticket') : requirePermission(['book_ticket', 'sell_ticket']);
}
```
- Gọi ở: `confirmCancel` (`ticketstaff.js:3523`, sau `codes.map(findSeat)`), `confirmTransfer` (1915, trên `selectedSourceSeats`), `confirmSelectionAction` (`booking.js:615`), `saveTicket` nhánh sửa (`currentPanelMode === 'edit'`, trên `currentPanelSeats`).
- Hủy ghế từ danh sách ghế hủy (`startTransferFromCancelled`): chỉ vé `prev_status = hold` được đặt lại nên dùng `BOOK_KEYS`.
- ERD B9 và B16: ghi quy tắc trên; xoá câu "hủy ghế, chuyển vé = sell_ticket".
- TEST: tài khoản chỉ `book_ticket` hủy vé hold -> qua; hủy vé sold -> bị chặn.

**Nếu chọn B:** gọi `requirePermission('sell_ticket')` ở các hàm trên thay cho `requireTicketTouchPermission`; ERD giữ nguyên B9 / B16.

---

### Q4. Hoàn tiền: có tách khóa riêng không?

**Hiện trạng.** Hộp thoại hủy có ô "Số tiền hoàn" (`confirmCancel`, `tsCancelPlan`). Hoàn tiền là thao tác nhạy cảm nhưng đang đi cùng quyền hủy.

**Lựa chọn**
- **A (khuyên nếu nhà xe nhỏ): dùng `sell_ticket`.** Không đổi gì.
- **B: thêm khóa `refund_ticket`.** Chỉ người có khóa này mới hủy được vé đã thu tiền (`cancelPlan.refundable > 0`) và nhập số hoàn.

**Lệnh triển khai nếu chọn B**
- `permissions.js` nhóm `ticket_seat`: thêm `{ key: 'refund_ticket', label: 'Hoàn tiền khi hủy vé đã thu' }`.
- CODE `confirmCancel`: ngay sau `const cancelPlan = tsCancelPlan(...)`: `if (cancelPlan.refundable > 0 && !requirePermission('refund_ticket', 'Vé đã thu tiền — cần người có quyền hoàn tiền để hủy')) return;`
- CODE hộp thoại hủy (chỗ mở `openCancelModal*`): khi thiếu quyền và `refundable > 0`, hiện thông báo thay cho ô nhập.
- ERD B6, B16, B23: thêm khóa; ghi "thiếu khóa thì không hủy được vé đã thu tiền, không có chế độ hủy mà giữ lại toàn bộ tiền". ERD B23 trigger (e) không đổi.
- Admin gốc luôn có `refund_ticket` (Auth.hasPermission).
- TEST: tài khoản có `sell_ticket` nhưng không `refund_ticket` hủy vé đã cọc -> bị chặn; hủy vé chưa thu tiền -> qua.

---

### Q5. Chỉ định xe Rước liền (`pkConfirmAssign`): cần khóa nào?

**Hiện trạng.** Xem W2. Đây là chế độ phòng vé, tạo vé **sold** và thu tiền; nút ghi "Bán vé" (`ticketstaff.html:1221`). `transship_assign` không dùng được cho việc này.

**Lựa chọn**
- **A (khuyên): `sell_ticket`.** Vì kết quả là bán vé.
- **B: `transship_pickup`.** Người nhập khách Rước liền cũng được chỉ định xe.
- **C: A hoặc B** (một trong hai là đủ).

**Lệnh triển khai**
- CODE `ticketstaff-pickup.js:1646` `pkConfirmAssign`, dòng đầu: A: `if (!requirePermission('sell_ticket')) return;` B: `if (!requirePermission('transship_pickup')) return;` C: `if (!requirePermission(['sell_ticket', 'transship_pickup'])) return;`
- Đổi chiều: `savePickupInfo` (`ticketstaff-pickup.js:713`, nhập khách Rước liền) kiểm `transship_pickup` ở cả ba lựa chọn; `adminSavePickup` bên Admin để admin / HR.
- Nút "Chỉ định" ở chế độ phòng vé (`pkRenderPaxTable`): ẩn khi thiếu quyền chọn.
- ERD B11 (câu về quyền) và B16: ghi lựa chọn.
- TEST: tài khoản chỉ `transship_pickup` bấm Chỉ định -> bị chặn (A) hoặc qua (B).

---

### Q6. Gán quyền mặc định cho các loại nhân viên, và cách bật kiểm quyền

**Hiện trạng.** `SEED_STAFF_ROLES` (`fleet-store.js:1182-1191`) để **mọi loại `permissions: []`**. `getStaffRoles()` đọc từ localStorage nếu đã lưu, nên đổi seed **không** cập nhật dữ liệu đã có. Bật kiểm quyền ngay sẽ khóa toàn bộ nhân viên vé.

**Lựa chọn**
- **A (khuyên): seed quyền + migrate một lần + bật kiểm quyền bằng cờ.** Triển khai theo thứ tự an toàn, bật cờ sau khi admin kiểm lại.
- **B: không seed;** admin tự gán ở màn Loại nhân viên trước khi bật kiểm quyền.

**Lệnh triển khai nếu chọn A** (bộ quyền dưới đây là đề xuất, bạn sửa được)

| Loại | Quyền đề xuất |
|---|---|
| `ticket` (Nhân viên vé) | `book_ticket`, `sell_ticket`, `transship_pickup` |
| `ticket_office` (Phòng vé) | `book_ticket`, `sell_ticket`, `change_price`, `transship_pickup`, `print_transship_ticket` |
| `call_center` (Tổng đài) | `book_ticket`, `transship_pickup` |
| `shuttle_dispatch` | `transship_assign`, `print_transship_ticket` |
| `dispatch_manager` | `assign_depart_reopen` |

- CODE `fleet-store.js`: điền `permissions` trong `SEED_STAFF_ROLES` theo bảng.
- CODE migrate: thêm khóa lưu trữ `HN_PERM_MIGRATION_V1` (khai báo ở `storage-keys.js`). Khi `getStaffRoles()` chạy lần đầu mà cờ chưa có: với mỗi loại trong bảng, **gộp thêm** các quyền còn thiếu vào `permissions` đã lưu (không xoá quyền admin đã gán), rồi `localStorage.setItem(cờ, '1')`.
- CODE cờ bật kiểm quyền: `HN_ENFORCE_TICKET_PERMS` (mặc định tắt). `requirePermission` trả `true` khi cờ tắt. Admin bật cờ ở màn cấu hình sau khi kiểm các tài khoản.
- ERD B16: thêm đoạn "Quyền mặc định theo loại nhân viên" (bảng trên) và ghi rằng khi lên DB phải seed `employee_type_permissions` tương ứng (so-do-er-nhan-su-v3.1) trước khi bật kiểm quyền ở service.
- TEST: tài khoản `ticket` cũ đăng nhập sau migrate vẫn đặt và bán được; tài khoản loại mới tạo (permissions rỗng) bị chặn khi cờ bật.

**Nếu chọn B:** bỏ phần seed, migrate. Giữ cờ `HN_ENFORCE_TICKET_PERMS`; ERD B16 ghi "admin phải gán quyền trước khi bật".

---

### Q7. `change_price`: chặn sửa giá ở mức nào?

**Hiện trạng.** Ô giá (`t_price`, `rbPrice`, ô giá của modal Chỉ định xe) bấm vào là sửa được (`focusPriceEdit` / `onPriceEdit`, `ticketstaff.js:2612-2640`). Cặp trạm chưa có trong bảng giá thì nhân viên **phải** nhập tay (ERD B4).

**Lựa chọn**
- **A (khuyên): khóa khi đã có giá bảng.** Thiếu `change_price` thì ô giá chỉ đọc nếu tra được giá; cặp chưa có giá vẫn được nhập tay. Giá 0đ luôn cần `change_price`.
- **B: khóa hoàn toàn.** Thiếu `change_price` không sửa giá, kể cả cặp chưa có giá (phải nhờ người có quyền).
- **C: chỉ chặn giá 0đ.** Sửa giá khác 0 thoải mái.

**Lệnh triển khai**
- CODE `focusPriceEdit(priceElId)` (`ticketstaff.js:2612`): đầu hàm: A: `if (!Auth.hasPermission('change_price') && tsFareLookupFound(priceElId)) { showToast('Cần quyền Đổi giá'); return; }` B: bỏ điều kiện thứ hai. C: bỏ hàm kiểm ở đây.
- `tsFareLookupFound`: hàm mới trả `true` khi giá điền sẵn lấy từ bảng giá (có sẵn thông tin này trong `tsFareSnapshot` / `pkAssignPricing`); nơi nào không xác định được thì coi như đã có giá.
- CODE chỗ kiểm giá 0đ (`saveTicket` dòng 2740, `sellTicket` 3161, `readAndValidateRebookPrice`, `pkConfirmAssign`): thêm `if (price === 0 && !requirePermission('change_price')) return;` (cả A, B, C).
- ERD B4 và B16: ghi lựa chọn. DB: không đổi cấu trúc.
- TEST: tài khoản không có `change_price` bấm vào ô giá có giá bảng -> bị chặn (A, B); đặt giá 0đ -> bị chặn (cả ba).

---

## PHẦN 2. Bảng ghi quyết định

| Mục | Lựa chọn của bạn (A / B / C) | Ghi chú |
|---|---|---|
| Q1 Vé gốc khi đặt lại từ lịch sử | | khuyên A |
| Q2 Bán có bao gồm đặt | | khuyên A |
| Q3 Vé hold: ai sửa, hủy, chuyển | | khuyên A |
| Q4 Khóa hoàn tiền riêng | | khuyên A, hoặc B nếu cần kiểm soát chặt |
| Q5 Chỉ định xe Rước liền | | khuyên A |
| Q6 Quyền mặc định và cờ bật | | khuyên A (bảng quyền cần bạn rà) |
| Q7 Mức khóa sửa giá | | khuyên A |

## Thứ tự triển khai đề xuất
1. W1, W2, W3 (sửa ERD và nhật ký, không đổi hành vi nghiệp vụ).
2. W4 (`requirePermission`) cùng cờ `HN_ENFORCE_TICKET_PERMS` tắt.
3. Q6 (seed và migrate), rồi Q2, Q3, Q5, Q4, Q7 gắn kiểm quyền từng nhóm.
4. Q1 (nếu chọn A).
5. Bật cờ sau khi kiểm các tài khoản mẫu; kiểm lại ở tầng service khi lên DB.
