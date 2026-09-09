# web/ — khung dự án Next.js + Supabase (dự phòng migrate)

Đây là bộ khung thư mục/tên file cho bản viết lại sau này bằng **Next.js (App Router) + Supabase**.
Các file trong này **chưa có logic thật**, chỉ có 1 dòng comment ghi chú file đó sẽ thay thế phần nào
của code hiện tại (ở `html/`, `css/`, `js/` ngoài thư mục gốc). Bản cũ vẫn là bản đang chạy — cứ tiếp
tục sửa ở đó bình thường, khi nào sẵn sàng migrate thì dùng khung này làm điểm bắt đầu.

## Cấu trúc

```
web/
├── src/
│   ├── app/                        Next.js App Router — routing theo cây thư mục
│   │   ├── (auth)/login/           trang đăng nhập
│   │   ├── (dashboard)/            layout chung + trang nghiệp vụ
│   │   │   └── ticketstaff/
│   │   └── api/                    API routes (Route Handlers) gọi Supabase
│   │       ├── trips/
│   │       ├── seats/
│   │       └── passengers/
│   ├── components/                 UI component tách theo khu vực chức năng
│   │   ├── ui/                     nút, modal... dùng chung toàn app
│   │   ├── booking/                sơ đồ ghế, form đặt vé
│   │   ├── passenger-list/         bảng danh sách hành khách
│   │   ├── trung-chuyen/           tab Trung chuyển: gán tài xế trung chuyển
│   │   └── layout/                 header, sidebar
│   ├── lib/                        logic thuần (không phải UI)
│   │   └── supabase/               supabase client (browser + server)
│   ├── hooks/                      custom React hooks
│   ├── types/                      định nghĩa kiểu dữ liệu (TypeScript)
│   └── styles/                     CSS tách theo khu vực (kế thừa từ booking-ui.css)
├── supabase/
│   ├── schema.sql                  định nghĩa bảng DB
│   └── migrations/                 các migration SQL theo thời gian
└── public/img/                     tài nguyên tĩnh (ảnh...)
```

## Mapping từ code cũ → code mới

| Code cũ | Code mới |
|---|---|
| `html/index.html` + `js/login.js` | `src/app/(auth)/login/page.tsx` |
| `html/ticketstaff.html` + `js/ticketstaff*.js` | `src/app/(dashboard)/ticketstaff/page.tsx` (gộp cả nghiệp vụ Đặt vé/Lịch sử/Phơi xe của Callcenter cũ + điều hành trung chuyển của Shuttle cũ — cả 2 trang đó đã bị xóa) |
| `js/shared/booking.js` | `src/lib/booking.ts` + `src/components/booking/` |
| `js/shared/seat-bank.js` | `src/lib/seat-bank.ts` + `src/hooks/useSeatBank.ts` |
| `js/shared/format.js` | `src/lib/format.ts` |
| `js/shared/constants.js` | `src/lib/constants.ts` |
| `js/shared/events.js` | `src/lib/events.ts` |
| `js/shared/storage-keys.js` (localStorage) | `supabase/schema.sql` + `src/app/api/*` (DB thật) |
| `css/shared/variables.css` | `src/styles/variables.css` |
| `css/shared/base.css` | `src/styles/base.css` |
| `css/shared/booking-ui.css` (1 file 4673 dòng) | `src/styles/booking-ui/*.css` (tách theo Zone/Modal/History...) |
| `css/login.css`, `css/ticketstaff.css` | CSS module riêng theo từng page/component tương ứng |

## Khi bắt đầu migrate thật

1. `npx create-next-app@latest` ngay trong `web/` (chọn TypeScript, App Router, Tailwind tuỳ chọn) —
   lệnh này sẽ tạo `package.json`, `tsconfig.json`, `next.config.js`... đè lên khung thư mục này.
2. Tạo project Supabase, điền `.env.example` → đổi tên thành `.env.local`.
3. Viết `supabase/schema.sql` dựa theo các key trong `js/shared/storage-keys.js`, chạy migration đầu tiên.
4. Làm lần lượt từng trang: chuyển logic thuần trong `lib/` trước, rồi đến component UI, cuối cùng nối API.
