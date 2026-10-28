// shared/seat-bank.js — Sinh mã ghế theo loại xe + lưu/tải seat bank localStorage. Dùng chung callcenter/ticketstaff.
// Nạp bằng <script> thường TRƯỚC script chính của trang — không dùng export/import.

function buildSequentialSeatCodes(total) {
  const downCount = Math.ceil(total / 2);
  const upCount = total - downCount;
  const down = Array.from({ length: downCount }, (_, i) => "A" + (i + 1));
  const up = Array.from({ length: upCount }, (_, i) => "B" + (i + 1));
  return { down, up };
}

function generateTripSeatPlanForVehicleType(vehicleType, tripId = '1') {
  const codes = getSeatCodesForVehicleType(vehicleType);
  // Đã bỏ 'cargo' khỏi vòng lặp mẫu — không còn loại ghế màu xanh biển riêng trên sơ đồ ghế.
  const pattern = ['sold', 'empty', 'hold', 'empty', 'sold', 'empty', 'hold', 'free', 'empty', 'sold', 'hold', 'empty'];
  let seatCustIdx = (parseInt(tripId || '1') * 7) % nameSamples.length;
  const buildFloor = floorCodes => floorCodes.map((code) => {
    if (code.endsWith('_hidden')) return { code, state: 'hidden' };
    return makeSeat(code, 'empty'); // ghế trống, không còn khách mẫu
  });
  return {
    down: buildFloor(codes.down),
    up: buildFloor(codes.up),
  };
}

function getSeatCodesForVehicleType(typeLabel) {
  const total = VEHICLE_TYPE_SEATS[typeLabel];
  if (typeLabel === "Limousine 34 giường" || typeLabel === "Giường nằm 34 chỗ") {
    const base = buildSequentialSeatCodes(VEHICLE_TYPE_SEATS["Xe thường 36 giường"]);
    return {
      down: base.down.map(c => c === "A3" ? "A3_hidden" : c),
      up: base.up.map(c => c === "B3" ? "B3_hidden" : c),
    };
  }
  return buildSequentialSeatCodes(total);
}

function loadSeatBank() {
  const saved = localStorage.getItem(HN_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse seat bank", e);
    }
  }
  return null;
}

function saveSeatBank() {
  // KHÔNG tự dispatch StorageEvent ở đây: mọi nơi gọi saveSeatBank() đã tự render lại trực tiếp
  // ngay sau đó rồi. Trình duyệt tự bắn 'storage' cho các tab/trang KHÁC khi localStorage đổi —
  // tự dispatch thêm ở đây chỉ khiến CHÍNH trang vừa lưu tự nghe lại sự kiện của chính mình và
  // render lại toàn bộ (renderSeats + renderPassengerList + renderZone1TripList...) lần thứ 2,
  // dư thừa, xảy ra trên MỌI thao tác ghế (đặt/hủy/sửa) — nguyên nhân chính gây lag khi thao tác.
  const jsonStr = JSON.stringify(tripSeatBank);
  localStorage.setItem(HN_STORAGE_KEY, jsonStr);
}


// Trạm của nhân viên đang đăng nhập (HR: staff.station = trạm chính) — nguồn của ticket.selling_station
// (ERD quy tắc 12: trạm bán KHÔNG chọn tay). '' khi chưa đăng nhập / nhân viên chưa được gán trạm.
function getActingStaffStation() {
  try {
    const u = window.Session && Session.get();
    const me = u && window.FleetStore && FleetStore.getStaff().find(s => s && s.username === u.username);
    if (me && me.station) return me.station;
    // Admin gốc không gắn trạm: vé admin bán ghi trạm hệ thống 'Admin' (ERD quy tắc 12), người bán là username admin.
    return (window.Auth && Auth.isAdmin && Auth.isAdmin()) ? 'Admin' : '';
  } catch (e) { return ''; }
}

// Gom các ghế cùng chung 1 mã vé (ticketNo) thành 1 dòng hành khách duy nhất,
// dùng đúng mã ghế thật trên sơ đồ thay vì suy đoán ghế kế tiếp — đảm bảo
// danh sách ghế và danh sách hành khách luôn thống nhất với nhau.
function groupSeatsByTicket(seats) {
  const map = new Map();
  seats.forEach(s => {
    const key = s.ticketNo || ('T-' + s.code);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  });
  return Array.from(map.values()).map(members => {
    members.sort((a, b) => a.code.localeCompare(b.code));
    return { main: members[0], members };
  });
}

// Số vé kế tiếp dạng "SGCD-0001" từ một seat bank { [tripId]: {down, up, subSeats, extraSeats, cancelledSeats} }:
// tuần tự chung cho mọi phơi, không bao giờ trùng (ERD ticket.ticket_no UK). Dùng ở trang không có ticketSeq (Admin).
function nextTicketNoFromBank(bank, prefix) {
  let max = 0;
  Object.keys(bank || {}).forEach(tid => {
    const b = bank[tid];
    if (!b) return;
    [].concat(b.down || [], b.up || [], b.subSeats || [], b.extraSeats || [], b.cancelledSeats || []).forEach(s => {
      const m = s && s.ticketNo != null && String(s.ticketNo).match(/(\d+)\s*$/);
      if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    });
  });
  return (prefix || 'SGCD') + '-' + String(max + 1).padStart(4, '0');
}

// Mã nhân viên của tài khoản đang đăng nhập ('' khi chưa đăng nhập). NGUỒN DUY NHẤT cho "người thao tác":
// KHÔNG còn giá trị dự phòng ('NV trực', 'Nhân viên trực', 'system', 'admin') — dữ liệu mới bắt buộc có người thao tác.
function getActingStaffCode() {
  try {
    const u = window.Session && Session.get();
    if (!u || !u.username) return '';
    return (typeof getStaffCode === 'function' && getStaffCode(u.username)) || u.username;
  } catch (e) { return ''; }
}

// ===== Giá + trạm theo trạm KHÁCH chọn (ERD B5) — dùng chung Rước liền (ticketstaff) và Admin > Trung chuyển =====
// '—' = chưa nhập. Trả null khi thiếu trạm / chưa có giá trong Admin > Quản lý giá (khi đó nhân viên nhập tay).
function hnCleanPlaceName(v) { v = (v == null ? '' : String(v).trim()); return v === '\u2014' ? '' : v; }
function fareForCustomerStations(fromName, toName, vehicleType) {
  const f = hnCleanPlaceName(fromName), t = hnCleanPlaceName(toName);
  if (!f || !t || !window.FleetStore) return null;
  return FleetStore.getFare(f, t, vehicleType) || null;
}
function stationIdsForCustomer(fromName, toName) {
  const f = hnCleanPlaceName(fromName), t = hnCleanPlaceName(toName);
  const a = (f && window.FleetStore) ? FleetStore.stationByRef(f) : null;
  const b = (t && window.FleetStore) ? FleetStore.stationByRef(t) : null;
  return { fromStationId: a ? a.id : null, toStationId: b ? b.id : null };
}

// Chặn thao tác ghi dữ liệu khi chưa đăng nhập; needStation = true thì tài khoản thường còn phải có trạm
// (admin gốc không gắn trạm nên được miễn). Trả về true nếu được phép tiếp tục.
function requireActor(needStation) {
  const say = m => { if (typeof showToast === 'function') showToast(m); else alert(m); };
  if (!getActingStaffCode()) { say('Chưa đăng nhập — không thực hiện được thao tác này'); return false; }
  if (needStation && !getActingStaffStation() && !(window.Auth && Auth.isAdmin && Auth.isAdmin())) {
    say('Tài khoản chưa được gán trạm — liên hệ quản trị viên');
    return false;
  }
  return true;
}

/* ===== KIỂM QUYỀN VÉ (ERD đặt vé B16) =====
   sell_ticket BAO GỒM book_ticket: người có sell_ticket cũng đặt được vé; vẫn có người chỉ có book_ticket
   (chỉ giữ chỗ, không bán). Quyền do nhân sự cấp theo loại nhân viên (không seed mặc định) nên kiểm quyền chỉ
   chạy khi cờ HN_ENFORCE_TICKET_PERMS_KEY = '1' (Admin > Cấu hình nhân sự > Tham số); tắt thì mọi thao tác qua.
   Admin gốc luôn có đủ quyền (Auth.hasPermission). Đây mới là kiểm ở giao diện; lên DB phải kiểm lại ở tầng service. */
const BOOK_KEYS = ['book_ticket', 'sell_ticket'];
const SELL_KEYS = ['sell_ticket'];
function ticketPermsEnforced() {
  try { return localStorage.getItem(HN_ENFORCE_TICKET_PERMS_KEY) === '1'; } catch (e) { return false; }
}
// Có (ít nhất) một trong các khóa `keys` không — không báo lỗi, dùng để ẩn / làm mờ nút.
function hasTicketPermission(keys) {
  if (!ticketPermsEnforced()) return true;
  const list = Array.isArray(keys) ? keys : [keys];
  return !!(window.Auth && Auth.hasAnyPermission && Auth.hasAnyPermission(list));
}
// Chặn thao tác nếu thiếu quyền và báo lý do. Trả về true nếu được phép tiếp tục.
function requirePermission(keys, msg) {
  if (hasTicketPermission(keys)) return true;
  const first = Array.isArray(keys) ? keys[0] : keys;
  const SHORT = { book_ticket: 'Đặt vé', sell_ticket: 'Bán vé', change_price: 'Đổi giá', transship_pickup: 'Nhận khách Rước liền', view_tickets: 'Xem danh sách vé', view_customers: 'Xem khách hàng' };
  const text = msg || ('Bạn không có quyền ' + (SHORT[first] || 'thực hiện thao tác này') + '.');
  if (typeof showToast === 'function') showToast(text); else alert(text);
  return false;
}
/* ===== THÔNG TIN KHÁCH BẮT BUỘC (ERD đặt vé B4, B29) =====
   SĐT chính: mặc định BẮT BUỘC. Tên khách: mặc định KHÔNG bắt buộc. Cả hai chỉnh được bằng cài đặt (Admin > Cấu hình nhân sự > Tham số).
   Chỉ kiểm khi TẠO vé mới; khi SỬA vé cũ mà ô đó vốn đã trống (dữ liệu cũ không có) thì không đòi, để vé cũ không bị khóa vì luật mới. */
function ticketRequiresPhone() {
  try { return localStorage.getItem(HN_TICKET_REQUIRE_PHONE_KEY) !== '0'; } catch (e) { return true; }
}
function ticketRequiresName() {
  try { return localStorage.getItem(HN_TICKET_REQUIRE_NAME_KEY) === '1'; } catch (e) { return false; }
}
// phone: chuỗi 'a, b' (số đầu là SĐT chính). prevSeat: ghế đang sửa (null khi tạo vé mới). Trả true nếu hợp lệ; báo lỗi và trả false nếu thiếu.
function validateCustomerContact(name, phone, prevSeat) {
  const say = m => { if (typeof showToast === 'function') showToast(m); else alert(m); };
  const firstPhone = String(phone || '').split(/[,;\/]/)[0].replace(/[\s.\-]/g, '');
  if (ticketRequiresPhone() && !firstPhone && !(prevSeat && !String(prevSeat.phone || '').trim())) { say('Vui lòng nhập số điện thoại khách'); return false; }
  if (ticketRequiresName() && !String(name || '').trim() && !(prevSeat && !String(prevSeat.customerName || '').trim())) { say('Vui lòng nhập tên khách'); return false; }
  return true;
}
// Khóa cần cho một thao tác sửa / hủy / chuyển trên các ghế nguồn: có ghế đã bán (sold) -> sell_ticket,
// toàn ghế giữ chỗ (hold) -> book_ticket hoặc sell_ticket (ERD B16 mục 2).
function ticketTouchKeys(seats) {
  return (seats || []).some(function (s) { return s && s.state === 'sold'; }) ? SELL_KEYS : BOOK_KEYS;
}
function requireTicketTouchPermission(seats) {
  return requirePermission(ticketTouchKeys(seats));
}
