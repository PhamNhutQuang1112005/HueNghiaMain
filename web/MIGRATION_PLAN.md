# Kế hoạch migrate sang Next.js + Supabase

Checklist theo dõi tiến độ chuyển từ code cũ (`html/`, `css/`, `js/`) sang `web/`. Đi theo đúng thứ tự
phụ thuộc thật của code cũ (dựa theo thứ tự `<script>` nạp trong các trang HTML): từ phần không phụ
thuộc gì → lõi nghiệp vụ → trang đơn giản nhất (kiểm chứng cả pipeline) → trang phức tạp dần.

Đánh dấu `[x]` khi hoàn thành từng mục. Không cần làm tuần tự tuyệt đối trong 1 giai đoạn, nhưng nên
xong giai đoạn trước mới sang giai đoạn sau vì các giai đoạn sau phụ thuộc vào giai đoạn trước.

## Giai đoạn 0 — Hạ tầng

- [ ] `npx create-next-app@latest` trong `web/` (TypeScript, App Router)
- [ ] Tạo project Supabase, lấy URL + anon key + service role key
- [ ] Điền `.env.example` → đổi tên `.env.local`
- [ ] Viết `supabase/schema.sql` (bảng `trips`, `seats`, `passengers`, `users`, `shuttle_driver_assignments`)
- [ ] Chạy migration đầu tiên, kiểm tra kết nối DB từ Next.js
- [ ] Cấu hình Supabase Auth (hoặc NextAuth) cơ bản

## Giai đoạn 1 — Logic thuần (không phụ thuộc file nào khác)

- [ ] `js/shared/storage-keys.js` → phản ánh vào `supabase/schema.sql` (mỗi key = 1 bảng/field)
- [ ] `js/shared/format.js` → `src/lib/format.ts`
- [ ] `js/shared/constants.js` → `src/lib/constants.ts`

## Giai đoạn 2 — Lõi nghiệp vụ (trái tim hệ thống, mọi trang đều dùng)

- [ ] `js/shared/seat-bank.js` → `src/lib/seat-bank.ts` + `src/hooks/useSeatBank.ts`
- [ ] `js/shared/booking.js` → `src/lib/booking.ts` + `src/components/booking/`
- [ ] `js/shared/events.js` → `src/lib/events.ts`

## Giai đoạn 3 — UI dùng chung

- [ ] `js/shared/ui.js` → `src/components/ui/` (Button, Modal, các phần tử lặp lại)
- [ ] `css/shared/variables.css` → `src/styles/variables.css`
- [ ] `css/shared/base.css` → `src/styles/base.css`
- [ ] `css/shared/booking-ui.css` → tách vào `src/styles/booking-ui/*.css` theo đúng comment Zone sẵn có

## Giai đoạn 4 — Trang Đăng nhập

Trang đơn giản nhất, không đụng booking/seat-bank — dùng để xác nhận Next.js + Supabase Auth chạy
thông suốt trước khi làm các trang lớn.

- [ ] `html/index.html` + `js/login.js` + `css/login.css` → `src/app/(auth)/login/page.tsx`
- [ ] Test đăng nhập/đăng xuất end-to-end

## Giai đoạn 5 — Trang Ticketstaff

Trang nghiệp vụ duy nhất (callcenter.html/js/css và shuttle.html/js/css đều đã bị xóa khỏi bản cũ —
toàn bộ nghiệp vụ Đặt vé/Lịch sử/Phơi xe/Rước liền của tổng đài và điều hành trung chuyển của
shuttle đã gộp hẳn vào ticketstaff.html/js, xem lịch sử commit — nên các giai đoạn "Trang Callcenter"
và "Trang Shuttle" trước đây không còn cần nữa). Dài nhất (~5929 dòng gộp 3 file JS), dùng lại
`booking.ts` + `seat-bank.ts` + `components/ui/` đã xong ở giai đoạn 2-3.

- [ ] `js/ticketstaff.js` → `src/app/(dashboard)/ticketstaff/page.tsx`
- [ ] `js/ticketstaff-manifest-core.js` → `src/lib/` (logic manifest chuyến)
- [ ] `js/ticketstaff-manifest-ui.js` → `src/components/` (UI manifest chuyến)
- [ ] Tab Trung chuyển → `src/components/trung-chuyen/` (gán tài xế trung chuyển)
- [ ] `src/app/api/trips/route.ts` (quản lý chuyến/phơi xe, thay `HN_TRIPS_KEY`)
- [ ] `src/app/api/passengers/route.ts` (khách rước liền, thay `HN_PICKUP_PAX_KEY`)
- [ ] `src/app/api/seats/route.ts`
- [ ] Gán tài xế trung chuyển (thay `HN_SHUTTLE_DRIVER_KEY`) — bảng `shuttle_driver_assignments`
- [ ] `css/ticketstaff.css` → CSS module riêng cho trang ticketstaff
- [ ] Đối chiếu chức năng với bản cũ

## Giai đoạn 6 — Kiểm thử & Deploy

- [ ] Chạy song song bản cũ và bản mới, đối chiếu từng nghiệp vụ (đặt vé, xếp ghế, trung chuyển...)
- [ ] Import dữ liệu thật (nếu có) từ localStorage/bản cũ sang Supabase
- [ ] Push GitHub → deploy Next.js lên Vercel
- [ ] Trỏ domain, tắt bản cũ
