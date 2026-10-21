// src/data/sample-customer-history.js — Dữ liệu MẪU: lịch sử vé quá khứ của khách.
// Tách khỏi js/shared/constants.js (Phase C). Dùng getPastDate() nên PHẢI nạp SAU
// js/shared/format.js. Chỉ booking.js đọc (loadAllPassengerHistory) — nạp trước booking.js
// trong ticketstaff.html. Không nạp ở admin.html. Sau này thay bằng API => xoá khỏi HTML.

const CUSTOMER_HISTORY_DATA = [];
