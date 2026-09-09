// shared/format.js — Hàm định dạng/chuẩn hoá text dùng chung giữa callcenter và ticketstaff (100% giống hệt).
// Nạp bằng <script> thường TRƯỚC script chính của trang — không dùng export/import.

function formatHistoryDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Giờ:phút nhân viên thao tác (đặt/sửa/bán vé) — ghi từ seat.actionTime (ISO string, stamp lúc lưu form
// hoặc lúc bán nhanh/đặt lại), hiện ở cột "Thời gian" bảng Lịch sử. Ghi chú lịch sử cũ (CUSTOMER_HISTORY_DATA,
// dữ liệu mẫu dựng sẵn) không có trường này nên trả về "—" thay vì báo lỗi.
function formatActionTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getPastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getStaffCode(usernameOrCode) {
  if (!usernameOrCode) return null;
  return STAFF_CODE_MAP[usernameOrCode] || usernameOrCode;
}

function normalizeSearchText(str) {
  return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

function shortenStopName(name) {
  if (!name || name === '—') return '—';
  return name
    .replace('Trạm ', '')
    .replace('Bến xe ', 'BX ')
    .replace('Văn phòng ', 'VP ');
}

// Tag loại khách hiện trên seat card (bên phải mã ghế) — không hiện với "Khách trạm" (loại mặc định,
// không có gì đặc biệt cần lưu ý).
function guestTypeTagHtml(guestType) {
  const cls = { 'Rước liền': 'rl', 'Rước đường': 'rd', 'Trung chuyển': 'tc' }[guestType];
  if (!cls) return '';
  return `<span class="seat-guest-type-tag ${cls}">${guestType}</span>`;
}

// Ghép lý do giá 0đ vào ghi chú CHỈ để hiển thị (thẻ ghế, bảng hành khách, vé mẫu...) — dữ liệu gốc
// seat.note/seat.zeroPriceReason vẫn tách riêng để khi mở lại modal sửa, lý do trả đúng về ô "Lý do
// giá 0đ", không lẫn vào ô "Ghi chú" (trước đây ghép thẳng vào seat.note nên mở sửa lại là mất dấu,
// mỗi lần lưu lại ghép chồng thêm 1 lớp lý do mới).
function seatNoteWithReason(seat) {
  if (!seat) return '';
  if (seat.price === 0 && seat.zeroPriceReason) {
    return seat.note ? `${seat.zeroPriceReason} — ${seat.note}` : seat.zeroPriceReason;
  }
  return seat.note || '';
}

// Thoát ký tự đặc biệt HTML trước khi chèn text tự do (ghi chú khách nhập tay...) vào template string —
// nếu không, ghi chú chứa dấu ngoặc kép/&/< sẽ phá vỡ thuộc tính title="..." hoặc bị trình duyệt hiểu
// nhầm thành thẻ HTML, làm lệch cả layout hàng đó (ví dụ ghi chú có dấu " sẽ cắt đứt title giữa chừng).
function escapeHtml(str) {
  return (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
