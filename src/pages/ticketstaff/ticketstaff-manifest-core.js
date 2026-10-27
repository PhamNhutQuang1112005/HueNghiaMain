// js/ticketstaff-manifest-core.js — "lõi" của tính năng vòng đời chuyến xe (Khởi hành → Tạo phơi →
// Re-open → Kết ca), dùng cho ticketstaff.html (nhân viên phòng vé) và admin.html (chỉ để đóng băng phơi
// hàng loạt ở tab Phơi xe), không đụng tới callcenter.html.
// Nạp SAU ticketstaff.js (cần currentTripId/tripSeatBank/getAllBookedSeats/showToast đã có sẵn).
//
// Kiến trúc theo đúng yêu cầu (tách bạch từng lớp, không random DOM):
//   Hằng số & dữ liệu mẫu → State (localStorage) → Business logic/tính toán → (UI đọc qua các hàm ở đây)
// File js/ticketstaff-manifest-ui.js sẽ đọc/ghi state THÔNG QUA các hàm ở file này, không tự ý đụng
// thẳng vào localStorage hay vào mảng seatPlanDown/Up.

/* ===================== 1. HẰNG SỐ & DỮ LIỆU MẪU ===================== */

// State machine chuyến xe — dùng đúng 5 giá trị này xuyên suốt, không so sánh chuỗi tự do ở nơi khác.
const TRIP_LIFECYCLE_STATUS = Object.freeze({
  SELLING: 'SELLING',
  DEPARTED: 'DEPARTED',
  REOPEN: 'REOPEN',
  REOPEN_CLOSED: 'REOPEN_CLOSED',
  MANIFEST_CLOSED: 'MANIFEST_CLOSED'
});

// Nhãn hiển thị + màu badge cho từng state (khớp class .status-xxx ở css/ticketstaff.css).
const TRIP_STATUS_META = {
  SELLING: { label: 'Đang bán', cssClass: 'status-selling' },
  DEPARTED: { label: 'Khởi hành', cssClass: 'status-departed' },
  REOPEN: { label: 'Re-open', cssClass: 'status-reopen' },
  REOPEN_CLOSED: { label: 'Đóng Re-open', cssClass: 'status-reopen_closed' },
  MANIFEST_CLOSED: { label: 'Đã kết ca', cssClass: 'status-manifest_closed' }
};

// Danh sách trạm bán vé — KHÔNG cố định trong UI: mọi nơi hiển thị (chip lọc, cột "Trạm bán", bảng
// doanh thu theo trạm...) đều đọc qua getTicketStations(), nên thêm/xoá trạm ở đây (hoặc qua
// addTicketStation/removeTicketStation lúc runtime) là đủ, không phải sửa HTML/CSS nơi khác.
const DEFAULT_TICKET_STATIONS = ['Lê Đại Hành', 'Xa Cảng', 'Kinh Dương Vương'];

/* ===================== 2. LOCALSTORAGE KEYS (chỉ riêng ticketstaff) ===================== */

const HN_TS_MANIFESTS_KEY = 'hn_ts_manifests_v1';       // { [tripId]: manifestObject }
const HN_TS_REOPEN_EVENTS_KEY = 'hn_ts_reopen_events_v1'; // { [tripId]: [event, ...] }
const HN_TS_VIOLATIONS_KEY = 'hn_ts_violations_v1';     // [violation, ...]
const HN_TS_SHIFT_CLOSINGS_KEY = 'hn_ts_shift_closings_v1'; // [closing, ...]
const HN_TS_STATIONS_KEY = 'hn_ts_ticket_stations_v1';  // [stationName, ...]

/* ===================== 3. STATE — ĐỌC/GHI LOCALSTORAGE ===================== */
// Mọi hàm đọc dưới đây đều try/catch quanh JSON.parse — dữ liệu hỏng/cũ không làm crash cả trang,
// chỉ coi như chưa có gì (giống quy ước try/catch quanh localStorage đã dùng ở các nơi khác của app).

function tsLoadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed === null || parsed === undefined) ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function tsSaveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* ignore quota/lỗi ghi — không chặn luồng nghiệp vụ vì mất localStorage */ }
}

// ---- Trạm bán vé ----
function getTicketStations() {
  return tsLoadJSON(HN_TS_STATIONS_KEY, DEFAULT_TICKET_STATIONS.slice());
}
function saveTicketStations(list) {
  tsSaveJSON(HN_TS_STATIONS_KEY, list);
}
function addTicketStation(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return false;
  const list = getTicketStations();
  if (list.includes(trimmed)) return false;
  list.push(trimmed);
  saveTicketStations(list);
  return true;
}
function removeTicketStation(name) {
  const list = getTicketStations().filter(s => s !== name);
  saveTicketStations(list);
}

// ---- Trạm đang bán (gán cho quầy/nhân viên hiện tại, áp cho mọi vé bán ra từ giờ) ----
function getCurrentStation() {
  // Trạm của nhân viên đang đăng nhập (ERD quy tắc 12), không chọn tay, KHÔNG còn trạm dự phòng:
  // nhân viên phải được gán trạm từ lúc tạo tài khoản ('' = chưa gán, nơi bán vé sẽ chặn).
  return getActingStaffStation();
}

// ---- Nhân viên thực hiện (đọc từ phiên đăng nhập nếu có, không thì lấy tên đang hiện trên topbar) ----
function getCurrentStaffLabel() {
  return getActingStaffCode(); // '' khi chưa đăng nhập — không còn giá trị dự phòng (seat-bank.js)
}

// ---- Manifest (phơi) — 1 bản ghi / chuyến xe ----
function getAllManifests() {
  return tsLoadJSON(HN_TS_MANIFESTS_KEY, {});
}
function getManifest(tripId) {
  return getAllManifests()[tripId] || null;
}
function saveManifest(tripId, manifestObj) {
  const all = getAllManifests();
  all[tripId] = manifestObj;
  tsSaveJSON(HN_TS_MANIFESTS_KEY, all);
}

// Trạng thái chuyến = trạng thái manifest; chưa có manifest thì mặc định vẫn đang bán vé bình thường.
function getTripLifecycleStatus(tripId) {
  const manifest = getManifest(tripId);
  return manifest ? manifest.status : TRIP_LIFECYCLE_STATUS.SELLING;
}

// ---- Lịch sử Re-open — nhiều bản ghi / chuyến xe ----
function getAllReopenEvents() {
  return tsLoadJSON(HN_TS_REOPEN_EVENTS_KEY, {});
}
function getReopenEventsForTrip(tripId) {
  return getAllReopenEvents()[tripId] || [];
}
function saveReopenEventsForTrip(tripId, events) {
  const all = getAllReopenEvents();
  all[tripId] = events;
  tsSaveJSON(HN_TS_REOPEN_EVENTS_KEY, all);
}
function getActiveReopenEvent(tripId) {
  const events = getReopenEventsForTrip(tripId);
  return events.find(e => e.status === 'OPEN') || null;
}

// ---- Khách ngoài phơi (vi phạm) ----
function getAllViolations() {
  return tsLoadJSON(HN_TS_VIOLATIONS_KEY, []);
}
function getViolationsForTrip(tripId) {
  return getAllViolations().filter(v => v.tripId === tripId);
}
function addViolation(record) {
  const all = getAllViolations();
  all.push(record);
  tsSaveJSON(HN_TS_VIOLATIONS_KEY, all);
}

// ---- Kết ca ----
function getAllShiftClosings() {
  return tsLoadJSON(HN_TS_SHIFT_CLOSINGS_KEY, []);
}
function addShiftClosing(record) {
  const all = getAllShiftClosings();
  all.push(record);
  tsSaveJSON(HN_TS_SHIFT_CLOSINGS_KEY, all);
}

// ---- Hủy phơi: MỘT NƠI KIỂM DUY NHẤT cho TicketStaff lẫn Admin, hủy 1 hoặc hàng loạt (ERD quy tắc 10) ----
// Phơi đã hủy / đã khởi hành / đã có manifest thì KHÓA sửa ở mọi trang (ERD quy tắc 2) — kiểm ở tầng service, không chỉ tắt ô nhập.
function tsIsTripEditLocked(trip) {
  return !!trip && (['Khởi hành', 'Đã khởi hành', 'Đã hủy'].includes(trip.status) || !!getManifest(trip.id));
}
// Số ghế đang có khách (sold/hold/free/cargo) của 1 seat bank, gồm cả ghế phụ và ghế dư.
function tsBankBookedCount(bank) {
  if (!bank) return 0;
  return [].concat(bank.down || [], bank.up || [], bank.subSeats || [], bank.extraSeats || [])
    .filter(s => s && ['sold', 'hold', 'free', 'cargo'].includes(s.state)).length;
}
// trips: mảng phơi (sửa trực tiếp, nơi gọi tự lưu); seatBank: { [tripId]: bank }. Chỉ hủy phơi TRỐNG và CHƯA khởi
// hành (chưa có manifest); phơi không đủ điều kiện bị bỏ qua và trả lý do. Bắt buộc lý do + người thao tác.
function tsCancelTrips(trips, seatBank, ids, reason, actingStaff) {
  const result = { cancelled: [], skipped: [] };
  const why = String(reason || '').trim();
  (ids || []).forEach(id => {
    const t = (trips || []).find(x => x && x.id === id);
    const skip = msg => result.skipped.push({ id, reason: msg });
    if (!why) return skip('Chưa nhập lý do hủy');
    if (!actingStaff) return skip('Chưa đăng nhập');
    if (!t) return skip('Không tìm thấy phơi');
    if (t.status === 'Đã hủy') return skip('Phơi đã hủy');
    if (t.status === 'Khởi hành' || t.status === 'Đã khởi hành' || getManifest(id)) return skip('Phơi đã khởi hành, không hủy được');
    if (tsBankBookedCount((seatBank || {})[id]) > 0) return skip('Phơi còn ghế đã bán/đặt — chuyển hết khách sang phơi khác rồi mới hủy');
    t.status = 'Đã hủy';
    t.cancelReason = why;
    t.cancelledAt = new Date().toISOString();
    t.cancelledBy = actingStaff;
    if (window.FleetStore && typeof FleetStore.log === 'function') {
      FleetStore.log({ action: 'cancel', entity: 'trip', entityId: id, summary: 'Huỷ chuyến ' + (t.name || id) + ' — Lý do: ' + why });
    }
    result.cancelled.push(id);
  });
  return result;
}

/* ===================== 4. BUSINESS LOGIC / TÍNH TOÁN ===================== */
// Nguyên tắc quan trọng nhất (mục 6 trong spec nghiệp vụ): KHÔNG BAO GIỜ ghi đè số liệu phơi gốc.
// Mỗi vé bán ra được gắn nhãn tại thời điểm bán (sellingStation/soldPhase/reopenEventId — xem
// ticketstaff.js, hàm applyFormToSeat/confirmSellPayment/confirmRebookAndSell), nên tổng hợp luôn tính
// lại từ dữ liệu vé thật (nguồn duy nhất) thay vì cộng dồn thủ công — tránh sai số/không khớp.

// Ghế đã đặt/bán của 1 "bank" (seatPlan) bất kỳ — cùng điều kiện trạng thái với getAllBookedSeats() ở
// ticketstaff.js nhưng nhận thẳng bank làm tham số thay vì đọc biến toàn cục seatPlanDown/Up, để gom lại
// được vé của 1 CHUYẾN KHÁC currentTripId đang xem (VD lúc vá dữ liệu phơi cũ ở tsGetManifestCurrentTotals).
function tsGetBankBookedSeats(bank) {
  if (!bank) return [];
  return [...(bank.down || []), ...(bank.up || []), ...(bank.extraSeats || []), ...(bank.subSeats || [])]
    .filter(s => ['sold', 'hold', 'free', 'cargo'].includes(s.state));
}

// Gom 1 danh sách ghế đã đặt/bán theo 1 điều kiện lọc tuỳ ý — dùng chung cho cả "tổng hợp lúc khởi hành"
// (chuyến đang mở, qua tsAggregateTickets) lẫn "vá dữ liệu phơi cũ" (chuyến khác, qua tsGetBankBookedSeats).
function tsAggregateTicketsFromSeats(seats, predicateFn) {
  const groups = groupSeatsByTicket(seats.filter(predicateFn));
  const result = {
    ticketCount: groups.length,
    passengerCount: 0,
    totalAmount: 0,
    cashAmount: 0,
    transferAmount: 0,
    // Đã thu = tổng tiền vé ĐÃ BÁN (state 'sold'). Chưa thu = tổng tiền vé CHƯA BÁN (giữ chỗ 'hold', vé
    // miễn phí 'free', hàng hoá 'cargo') — tách theo trạng thái ghế, không theo cờ "paid"/tiền cọc.
    paidAmount: 0,
    unpaidAmount: 0,
    // "Vé trạm" = vé của khách mua tại trạm hoặc đi trung chuyển tới trạm (guestType Khách trạm/Trung
    // chuyển), đếm theo VÉ. "Khách rước đường" tách riêng, đếm theo HÀNH KHÁCH (guestType Rước đường) vì
    // 1 vé rước đường có thể gộp nhiều ghế/khách cùng lúc — kèm danh sách chi tiết để hiện bảng riêng.
    stationTicketCount: 0,
    roadsidePassengerCount: 0,
    roadsideList: [],
    stationBreakdown: {},
    sellerBreakdown: {} // theo nhân viên bán (seat.staff = ticket.sold_by)
  };
  // Luôn có đủ các trạm đang cấu hình trong "Doanh thu theo trạm" (kể cả chưa phát sinh vé), khớp với
  // cách tsAggregateStationDenomination làm cho bảng "Chi tiết mệnh giá" — mục 6 spec: không được tự ý
  // bỏ trạm trống.
  getTicketStations().forEach(st => {
    result.stationBreakdown[st] = { tickets: 0, passengers: 0, amount: 0 };
  });
  groups.forEach(g => {
    const s = g.main;
    const count = g.members.length;
    const amount = (s.price || 0) * count;
    result.passengerCount += count;
    result.totalAmount += amount;
    const method = s.paymentMethod || 'Tiền mặt';
    if (method === 'Chuyển khoản') result.transferAmount += amount;
    else result.cashAmount += amount;

    if (s.state === 'sold') result.paidAmount += amount;
    else result.unpaidAmount += amount;

    const station = s.sellingStation || 'Chưa xác định';
    if (!result.stationBreakdown[station]) result.stationBreakdown[station] = { tickets: 0, passengers: 0, amount: 0 };
    result.stationBreakdown[station].tickets += 1;
    result.stationBreakdown[station].passengers += count;
    result.stationBreakdown[station].amount += amount;
    const seller = s.staff || 'Không rõ';
    const sb = result.sellerBreakdown[seller] || (result.sellerBreakdown[seller] = { tickets: 0, passengers: 0, amount: 0 });
    sb.tickets += 1; sb.passengers += count; sb.amount += amount;

    const guestType = s.guestType || 'Khách trạm';
    if (guestType === 'Rước đường') {
      result.roadsidePassengerCount += count;
      // Điểm rước — cùng thứ tự ưu tiên field đang dùng ở getHistoryStopsDisplay() (shared/booking.js)
      // để hiện đúng 1 địa chỉ như các nơi khác trong app.
      const pickupLoc = s.transshipStation || s.transship || s.pickupAddress || s.fromTransfer || '';
      result.roadsideList.push({
        name: s.customerName || '',
        phone: s.phone || '',
        firstStop: (typeof sgCanon === 'function' ? sgCanon(s.firstStop || '') : (s.firstStop || '')),
        lastStop: s.lastStop || '',
        pickupLoc,
        seatCount: count,
        seatCodes: g.members.map(m => m.code),
        amount
      });
    } else {
      result.stationTicketCount += 1;
    }
  });
  return result;
}

// Gom vé của CHUYẾN ĐANG MỞ (currentTripId/seatPlanDown/Up qua getAllBookedSeats()) — wrapper giữ đúng
// tên/chữ ký cũ cho các chỗ đang gọi (tsAggregateOriginalTickets/tsAggregateReopenEventTickets...).
function tsAggregateTickets(predicateFn) {
  return tsAggregateTicketsFromSeats(getAllBookedSeats(), predicateFn);
}

// Toàn bộ vé đã bán TRƯỚC khi khởi hành (chưa có seat.soldPhase === 'POST_DEPART' nào vì lúc này chuyến
// còn đang SELLING) — dùng để đóng băng thành "phơi gốc".
function tsAggregateOriginalTickets() {
  return tsAggregateTickets(s => s.soldPhase !== 'POST_DEPART');
}

// Vé thuộc riêng 1 lần Re-open cụ thể (dùng cho "Xem phát sinh" khi đang mở, và lúc đóng Re-open để
// đóng băng số liệu vào lịch sử).
function tsAggregateReopenEventTickets(eventId) {
  const result = tsAggregateTickets(s => s.reopenEventId === eventId);
  return tsApplyReopenSettlements(result, getAllBookedSeats(), eventId);
}

// THU BỔ SUNG trong Re-open: vé đã ĐẶT từ trước (đã nằm trong số liệu phơi gốc / Re-open trước dưới dạng "chưa thu")
// được thu tiền trong lần Re-open này. Số vé / hành khách / tổng tiền KHÔNG đổi (tránh đếm hai lần); chỉ chuyển:
// chưa thu -> đã thu, tiền mặt <-> chuyển khoản theo cách thu thật, và doanh thu / số vé từ người ĐẶT + trạm đặt
// sang NGƯỜI THU TIỀN + trạm của người đó (có thể ra số âm cho người đặt). Chốt cứng vào event lúc đóng Re-open.
function tsApplyReopenSettlements(result, seats, eventId) {
  result.settledCount = 0;
  result.settledAmount = 0;
  const move = (map, fromKey, toKey, tickets, passengers, amount) => {
    if (fromKey === toKey) return;
    const get = k => map[k] || (map[k] = { tickets: 0, passengers: 0, amount: 0 });
    const a = get(fromKey), b = get(toKey);
    a.tickets -= tickets; a.passengers -= passengers; a.amount -= amount;
    b.tickets += tickets; b.passengers += passengers; b.amount += amount;
  };
  groupSeatsByTicket((seats || []).filter(s => s && s.state === 'sold' && s.settledReopenEventId === eventId)).forEach(g => {
    const s = g.main;
    const count = g.members.length;
    const amount = (s.price || 0) * count;
    result.settledCount += 1;
    result.settledAmount += amount;
    result.paidAmount += amount;
    result.unpaidAmount -= amount;
    if ((s.paymentMethod || 'Tiền mặt') === 'Chuyển khoản') { result.cashAmount -= amount; result.transferAmount += amount; }
    move(result.stationBreakdown, s.bookedStation || 'Chưa xác định', s.sellingStation || 'Chưa xác định', 1, count, amount);
    move(result.sellerBreakdown, s.bookedBy || 'Không rõ', s.staff || 'Không rõ', 1, count, amount);
  });
  return result;
}

// Tạo phơi từ chuyến đang chọn — gọi đúng 1 lần lúc xác nhận "Khởi hành xe". Từ đây trip.route/plate/...
// được đóng băng vào manifest, sửa thông tin xe sau đó (vd đổi biển số ở modal Chỉ định xe) sẽ KHÔNG còn
// tự động cập nhật lại phơi đã tạo — đúng tinh thần "không ghi đè phơi cũ".
// Điều kiện khởi hành (chủ đã chốt): phơi thật (không phải mẫu), chưa hủy, chưa khởi hành, ĐÃ có xe (biển số)
// và tài xế tuyến; phụ xe tùy chọn. Trả về chuỗi lỗi, '' = được phép khởi hành.
function tsCheckCanDepart(tripId) {
  if (!getCurrentStaffLabel()) return 'Chưa đăng nhập — không khởi hành được';
  const tripMeta = (typeof allTripsMeta !== 'undefined' ? allTripsMeta : []).find(t => t.id === tripId);
  const bank = (typeof tripSeatBank !== 'undefined') ? tripSeatBank[tripId] : null;
  if (!tripMeta || !bank) return 'Không tìm thấy phơi';
  if (tripMeta.isTemplate) return 'Phơi mẫu không khởi hành được';
  if (tripMeta.status === 'Đã hủy') return 'Phơi đã hủy, không khởi hành được';
  if (getManifest(tripId)) return 'Chuyến này đã khởi hành rồi';
  if (!String(bank.plate || tripMeta.plate || '').trim()) return 'Chưa chỉ định xe — chỉ định biển số trước khi khởi hành';
  const driverName = String(bank.driver || '').trim();
  if (!driverName || driverName === '—' || driverName === '-') return 'Chưa chọn tài xế — chọn tài xế trước khi khởi hành';
  return '';
}

function tsCreateManifestForCurrentTrip(advanceAmount) {
  const tripId = currentTripId;
  if (tsCheckCanDepart(tripId)) return null; // service tự kiểm lại, không chỉ dựa vào UI
  const bank = tripSeatBank[tripId];
  const tripMeta = (typeof allTripsMeta !== 'undefined' ? allTripsMeta : []).find(t => t.id === tripId);
  const original = tsAggregateOriginalTickets();
  const nowIso = new Date().toISOString();

  const manifest = {
    tripId,
    tripLabel: document.getElementById('tripTitle') ? document.getElementById('tripTitle').textContent.trim() : '',
    plate: (bank && bank.plate) || (tripMeta && tripMeta.plate) || '',
    driver: (bank && bank.driver) || '',
    helper: (bank && bank.helper) || '',
    date: (tripMeta && tripMeta.date) || '',
    time: (tripMeta && tripMeta.time) || '',
    status: TRIP_LIFECYCLE_STATUS.DEPARTED,
    original,
    advanceAmount: Number(advanceAmount) || 0,
    createdBy: getCurrentStaffLabel(),
    createdAt: nowIso
  };
  saveManifest(tripId, manifest);
  // trip.status lưu "Khởi hành" (ERD quy tắc 2) — khoá sửa/hủy phơi ở mọi trang; trạng thái chi tiết (Re-open/kết ca) vẫn suy từ manifest.
  if (tripMeta) { tripMeta.status = 'Khởi hành'; TripService.save(allTripsMeta); }
  saveReopenEventsForTrip(tripId, []); // chuyến mới khởi hành thì chưa có lần Re-open nào
  return manifest;
}

// Mở Re-open — tạo 1 event mới ở trạng thái OPEN, không đụng tới manifest.original.
function tsOpenReopen(tripId, reason) {
  const manifest = getManifest(tripId);
  if (!getCurrentStaffLabel()) return null; // chưa đăng nhập thì không thao tác
  if (!manifest || manifest.frozenAt) return null; // phơi đã đóng băng thì không Re-open nữa
  // Điều kiện mở (ERD quy tắc 5): đã khởi hành (có manifest) + chưa đóng băng + chưa có lần nào đang OPEN.
  // Không giới hạn theo trạng thái kết ca (phần kết ca xử lý sau).
  if (manifest.status === TRIP_LIFECYCLE_STATUS.REOPEN || getActiveReopenEvent(tripId)) return null;
  const events = getReopenEventsForTrip(tripId);
  const event = {
    id: 'RO-' + tripId + '-' + (events.length + 1) + '-' + Date.now().toString(36),
    sequence: events.length + 1,
    time: new Date().toISOString(),
    staffId: getCurrentStaffLabel(),
    reason: (reason || '').trim(),
    status: 'OPEN'
  };
  events.push(event);
  saveReopenEventsForTrip(tripId, events);
  manifest.status = TRIP_LIFECYCLE_STATUS.REOPEN;
  saveManifest(tripId, manifest);
  return event;
}

// Đóng lần Re-open đang mở — đóng băng số vé/tiền phát sinh vào chính event đó (từ đây về sau không
// tính lại nữa dù vé có bị sửa giá/trạng thái), rồi chuyển trạng thái chuyến sang REOPEN_CLOSED.
function tsCloseActiveReopen(tripId) {
  const manifest = getManifest(tripId);
  const event = getActiveReopenEvent(tripId);
  if (!manifest || !event || !getCurrentStaffLabel()) return null;

  const diff = tsAggregateReopenEventTickets(event.id);
  event.status = 'CLOSED';
  event.closedAt = new Date().toISOString();
  event.closedBy = getCurrentStaffLabel();
  event.ticketsAdded = diff.ticketCount;
  event.passengersAdded = diff.passengerCount;
  event.amountAdded = diff.totalAmount;
  event.cashAdded = diff.cashAmount;
  event.transferAdded = diff.transferAmount;
  event.paidAdded = diff.paidAmount;
  event.unpaidAdded = diff.unpaidAmount;
  event.stationTicketAdded = diff.stationTicketCount;
  event.roadsidePassengerAdded = diff.roadsidePassengerCount;
  event.settledCount = diff.settledCount || 0;   // vé đặt từ trước được thu tiền trong lần Re-open này
  event.settledAmount = diff.settledAmount || 0;
  event.roadsideListAdded = diff.roadsideList;
  event.stationBreakdown = diff.stationBreakdown;
  event.sellerBreakdown = diff.sellerBreakdown;

  const events = getReopenEventsForTrip(tripId).map(e => e.id === event.id ? event : e);
  saveReopenEventsForTrip(tripId, events);

  manifest.status = TRIP_LIFECYCLE_STATUS.REOPEN_CLOSED;
  saveManifest(tripId, manifest);
  return event;
}

// Tổng hiện tại = phơi gốc + toàn bộ lần Re-open đã đóng (Re-open đang mở tính live riêng, xem
// tsAggregateReopenEventTickets, không cộng vào đây để tránh đếm 2 lần trước khi "đóng" chính thức).
function tsGetManifestCurrentTotals(tripId) {
  if (!getManifest(tripId)) return null;
  return tsSumManifestParts(tripId, true, getReopenEventsForTrip(tripId).filter(e => e.status === 'CLOSED'));
}

// Cộng số liệu theo PHẦN của phơi: phần gốc (includeBase) + các lần Re-open đã đóng truyền vào (events).
// Kết ca dùng hàm này để chỉ cộng các phần CHƯA kết ca (ERD quy tắc 6); tiền ứng chỉ tính cùng phần gốc.
function tsSumManifestParts(tripId, includeBase, events) {
  const manifest = getManifest(tripId);
  if (!manifest) return null;

  // Phơi tạo trước khi có Đã thu/Chưa thu/Vé trạm/Khách rước đường (roadsideList undefined — khác "[]"
  // là đã tính nhưng không ai Rước đường) chưa từng tính các trường này nên đóng băng thiếu, không phải
  // do dữ liệu vé thật sự bằng 0 — vá lại 1 lần bằng cách tính lại đúng công thức gốc từ tripSeatBank
  // (vẫn còn đủ trong bộ nhớ vì tripSeatBank lưu chung cho MỌI chuyến, không riêng chuyến đang mở) rồi
  // lưu lại để không phải vá lại mỗi lần xem.
  if (manifest.original.roadsideList === undefined && typeof tripSeatBank !== 'undefined' && tripSeatBank[tripId]) {
    const seats = tsGetBankBookedSeats(tripSeatBank[tripId]);
    const backfilled = tsAggregateTicketsFromSeats(seats, s => s.soldPhase !== 'POST_DEPART');
    manifest.original.paidAmount = backfilled.paidAmount;
    manifest.original.unpaidAmount = backfilled.unpaidAmount;
    manifest.original.stationTicketCount = backfilled.stationTicketCount;
    manifest.original.roadsidePassengerCount = backfilled.roadsidePassengerCount;
    manifest.original.roadsideList = backfilled.roadsideList;
    saveManifest(tripId, manifest);
  }

  // includeBase = có tính phần GỐC (bán trước khởi hành) không; events = các lần Re-open ĐÃ ĐÓNG cần cộng.
  const base = includeBase ? manifest.original : {};

  const totals = {
    ticketCount: base.ticketCount || 0,
    passengerCount: base.passengerCount || 0,
    totalAmount: base.totalAmount || 0,
    cashAmount: base.cashAmount || 0,
    transferAmount: base.transferAmount || 0,
    // "|| 0"/"|| []" cho phơi cũ hơn nữa (tạo trước cả tripSeatBank[tripId] còn tồn tại để vá) — không
    // suy ngược lại được nữa, coi như 0/rỗng thay vì NaN/crash.
    paidAmount: base.paidAmount || 0,
    unpaidAmount: base.unpaidAmount || 0,
    stationTicketCount: base.stationTicketCount || 0,
    roadsidePassengerCount: base.roadsidePassengerCount || 0,
    roadsideList: (base.roadsideList || []).slice(),
    stationBreakdown: {},
    sellerBreakdown: {}
  };
  Object.keys(base.stationBreakdown || {}).forEach(st => {
    totals.stationBreakdown[st] = { ...base.stationBreakdown[st] };
  });

  Object.entries(base.sellerBreakdown || {}).forEach(([k, v]) => { totals.sellerBreakdown[k] = { ...v }; });

  events.forEach(ev => {
    totals.ticketCount += ev.ticketsAdded || 0;
    totals.passengerCount += ev.passengersAdded || 0;
    totals.totalAmount += ev.amountAdded || 0;
    totals.cashAmount += ev.cashAdded || 0;
    totals.transferAmount += ev.transferAdded || 0;
    totals.paidAmount += ev.paidAdded || 0;
    totals.unpaidAmount += ev.unpaidAdded || 0;
    totals.stationTicketCount += ev.stationTicketAdded || 0;
    totals.roadsidePassengerCount += ev.roadsidePassengerAdded || 0;
    if (Array.isArray(ev.roadsideListAdded)) totals.roadsideList = totals.roadsideList.concat(ev.roadsideListAdded);
    Object.entries(ev.stationBreakdown || {}).forEach(([st, v]) => {
      if (!totals.stationBreakdown[st]) totals.stationBreakdown[st] = { tickets: 0, passengers: 0, amount: 0 };
      totals.stationBreakdown[st].tickets += v.tickets;
      totals.stationBreakdown[st].passengers += v.passengers;
      totals.stationBreakdown[st].amount += v.amount;
    });
    Object.entries(ev.sellerBreakdown || {}).forEach(([k, v]) => {
      const t = totals.sellerBreakdown[k] || (totals.sellerBreakdown[k] = { tickets: 0, passengers: 0, amount: 0 });
      t.tickets += v.tickets; t.passengers += v.passengers; t.amount += v.amount;
    });
  });

  const advance = includeBase ? (manifest.advanceAmount || 0) : 0;
  totals.remainingAmount = totals.totalAmount - advance;
  totals.advanceAmount = advance;
  return totals;
}

// ---- Kết ca theo PHẦN của phơi (ERD quy tắc 6): phần GỐC + từng lần Re-open đã đóng, mỗi phần kết ca đúng 1 lần ----
// Phần đã kết ca: manifest.baseShiftClosingId (phần gốc) và event.shiftClosingId (từng lần Re-open). Dữ liệu cũ
// (bản ghi kết ca không có `parts`) coi như đã phủ phần gốc + mọi Re-open đã đóng trước giờ kết ca đó.
function tsGetClosedParts(tripId) {
  const m = getManifest(tripId);
  const events = getReopenEventsForTrip(tripId);
  const closedEventIds = new Set();
  let baseClosed = !!(m && m.baseShiftClosingId);
  events.forEach(e => { if (e.shiftClosingId) closedEventIds.add(e.id); });
  getAllShiftClosings().forEach(c => {
    if (c.parts || !Array.isArray(c.tripIds) || c.tripIds.indexOf(tripId) === -1) return;
    baseClosed = true;
    events.forEach(e => { if (e.status === 'CLOSED' && e.closedAt && e.closedAt <= c.time) closedEventIds.add(e.id); });
  });
  return { baseClosed, closedEventIds };
}

// Các phần CHƯA kết ca và đủ điều kiện đưa vào đợt kết ca: phần gốc (nếu chưa kết) + các lần Re-open ĐÃ ĐÓNG chưa kết.
function tsGetPendingShiftParts(tripId) {
  const closed = tsGetClosedParts(tripId);
  const events = getReopenEventsForTrip(tripId).filter(e => e.status === 'CLOSED' && !closed.closedEventIds.has(e.id));
  return { includeBase: !closed.baseClosed, events };
}

// Bảng trạm × mệnh giá chỉ của các phần được chọn (đọc vé hiện tại của phơi, không dùng bản chụp đóng băng vì
// bản chụp gộp mọi phần).
function tsGetPartsDenominationBreakdownForTrip(tripId, includeBase, events) {
  const bank = (typeof tripSeatBank !== 'undefined') ? tripSeatBank[tripId] : null;
  if (!getManifest(tripId) || !bank) return null;
  const ids = new Set((events || []).map(e => e.id));
  return tsAggregateStationDenominationFromSeats(tsGetBankBookedSeats(bank),
    // Vé đặt từ trước nhưng được thu trong Re-open (settledReopenEventId) tính vào PHẦN Re-open đó (nơi tiền được thu).
    s => {
      const part = s.settledReopenEventId || s.reopenEventId || null;
      return part ? ids.has(part) : (includeBase && s.soldPhase !== 'POST_DEPART');
    });
}

// Gom chuyến đã khởi hành (DEPARTED/REOPEN_CLOSED — chưa kết ca) CỦA ĐÚNG NHÂN VIÊN đang đăng nhập để
// hiển thị báo cáo Kết ca — mỗi nhân viên (mã nhân viên riêng, qua getCurrentStaffLabel()/createdBy) chỉ
// kết ca các phơi do chính mình tạo, không gom lẫn phơi của nhân viên khác. Chuyến còn SELLING/REOPEN
// (chưa chốt xong) không đưa vào kết ca.
function tsAggregateShiftClosing() {
  const manifests = getAllManifests();
  const currentStaff = getCurrentStaffLabel();
  // Phơi do chính mình tạo, KHÔNG có lần Re-open đang mở, và còn ít nhất 1 PHẦN chưa kết ca (gốc hoặc Re-open đã đóng).
  const pendingByTrip = {};
  const eligibleTripIds = Object.keys(manifests).filter(tripId => {
    const m = manifests[tripId];
    if (m.createdBy !== currentStaff || m.status === TRIP_LIFECYCLE_STATUS.REOPEN || getActiveReopenEvent(tripId)) return false;
    const pending = tsGetPendingShiftParts(tripId);
    if (!pending.includeBase && !pending.events.length) return false;
    pendingByTrip[tripId] = pending;
    return true;
  });

  const report = {
    staffId: currentStaff,
    tripIds: eligibleTripIds,
    parts: [], // [{ tripId, reopenEventId }] reopenEventId = null là phần gốc
    tripCount: eligibleTripIds.length,
    ticketCount: 0,
    passengerCount: 0,
    totalAmount: 0,
    advanceAmount: 0,
    cashAmount: 0,
    transferAmount: 0,
    stationBreakdown: {},
    staffBreakdown: {},
    // THU theo giờ khởi hành × mệnh giá (mục "Kết ca" — bảng dạng lưới kiểu excel) — xem
    // tsRenderTimeDenominationTableHtml() ở ticketstaff-manifest-ui.js.
    timeBreakdown: {},
    denominations: [],
    reopenCount: 0,
    reopenAmount: 0
  };

  const denomSet = new Set();

  eligibleTripIds.forEach(tripId => {
    const pending = pendingByTrip[tripId];
    const totals = tsSumManifestParts(tripId, pending.includeBase, pending.events);
    const manifest = manifests[tripId];
    if (!totals) return;
    if (pending.includeBase) report.parts.push({ tripId, reopenEventId: null });
    pending.events.forEach(e => report.parts.push({ tripId, reopenEventId: e.id }));
    report.ticketCount += totals.ticketCount;
    report.passengerCount += totals.passengerCount;
    report.totalAmount += totals.totalAmount;
    report.advanceAmount += totals.advanceAmount;
    report.cashAmount += totals.cashAmount;
    report.transferAmount += totals.transferAmount;
    Object.entries(totals.stationBreakdown).forEach(([st, v]) => {
      if (!report.stationBreakdown[st]) report.stationBreakdown[st] = { tickets: 0, passengers: 0, amount: 0 };
      report.stationBreakdown[st].tickets += v.tickets;
      report.stationBreakdown[st].passengers += v.passengers;
      report.stationBreakdown[st].amount += v.amount;
    });
    // Theo NHÂN VIÊN BÁN (ticket.sold_by); phơi cũ chưa có dữ liệu người bán thì tính cho người tạo phơi.
    const sellers = Object.keys(totals.sellerBreakdown).length
      ? totals.sellerBreakdown
      : { [manifest.createdBy || 'Không rõ']: { tickets: totals.ticketCount, amount: totals.totalAmount } };
    Object.entries(sellers).forEach(([k, v]) => {
      if (!report.staffBreakdown[k]) report.staffBreakdown[k] = { tickets: 0, amount: 0 };
      report.staffBreakdown[k].tickets += v.tickets;
      report.staffBreakdown[k].amount += v.amount;
    });

    const timeKey = manifest.time || 'Chưa xác định';
    if (!report.timeBreakdown[timeKey]) report.timeBreakdown[timeKey] = { ticketCount: 0, totalAmount: 0, ruocCount: 0, freeCount: 0, denomCounts: {} };
    const timeRow = report.timeBreakdown[timeKey];
    const denomBreakdown = tsGetPartsDenominationBreakdownForTrip(tripId, pending.includeBase, pending.events);
    if (denomBreakdown) {
      denomBreakdown.stationOrder.forEach(st => {
        const b = denomBreakdown.stations[st];
        timeRow.ticketCount += b.totalCount;
        timeRow.totalAmount += b.totalAmount;
        timeRow.ruocCount += b.ruocCount;
        timeRow.freeCount += b.freeCount;
        Object.entries(b.denomCounts).forEach(([price, count]) => {
          denomSet.add(Number(price));
          timeRow.denomCounts[price] = (timeRow.denomCounts[price] || 0) + count;
        });
      });
    }

    pending.events.forEach(e => {
      report.reopenCount += 1;
      report.reopenAmount += e.amountAdded || 0;
    });
  });

  report.denominations = Array.from(denomSet).sort((a, b) => a - b);

  return report;
}

// Kết ca — chốt báo cáo (đã đối soát) và đánh dấu MANIFEST_CLOSED cho toàn bộ chuyến vừa gom, để chúng
// không bị gom lại ở lần Kết ca tiếp theo.
function tsConfirmShiftClosing(report, reconcile) {
  if (!getCurrentStaffLabel()) return null; // chưa đăng nhập thì không kết ca
  // Báo cáo cũ (mở từ trước, hoặc tab khác đã kết ca phần này): từ chối nếu có phần đã kết ca rồi, tránh kết trùng.
  const parts = report.parts || [];
  const stale = parts.some(p => {
    const c = tsGetClosedParts(p.tripId);
    return p.reopenEventId ? c.closedEventIds.has(p.reopenEventId) : c.baseClosed;
  });
  if (!parts.length || stale) return null;
  const record = {
    id: 'SC-' + Date.now().toString(36),
    time: new Date().toISOString(),
    staffId: getCurrentStaffLabel(),
    tripIds: report.tripIds,
    parts: parts,
    tripCount: report.tripCount,
    ticketCount: report.ticketCount,
    passengerCount: report.passengerCount,
    totalAmount: report.totalAmount,
    advanceAmount: report.advanceAmount,
    cashAmount: report.cashAmount,
    transferAmount: report.transferAmount,
    stationBreakdown: report.stationBreakdown,
    staffBreakdown: report.staffBreakdown,
    timeBreakdown: report.timeBreakdown,
    denominations: report.denominations,
    reopenCount: report.reopenCount,
    reopenAmount: report.reopenAmount,
    actualCash: reconcile.actualCash,
    actualTransfer: reconcile.actualTransfer,
    diffAmount: reconcile.diffAmount,
    // Khoản CHI tự điền tay (lý do/số tiền thu/người duyệt) — nhân viên nhập tại lúc kết ca, không tính
    // vào đối soát THU ở trên, chỉ lưu lại nguyên văn kèm bản ghi kết ca để tra cứu sau này.
    chiItems: reconcile.chiItems || []
  };
  addShiftClosing(record);

  const manifests = getAllManifests();
  // Đánh dấu từng PHẦN đã kết ca: phần gốc -> manifest.baseShiftClosingId, mỗi lần Re-open -> event.shiftClosingId
  report.tripIds.forEach(tripId => {
    const evs = getReopenEventsForTrip(tripId);
    parts.filter(p => p.tripId === tripId).forEach(p => {
      if (!p.reopenEventId) { manifests[tripId].baseShiftClosingId = record.id; return; }
      const ev = evs.find(e => e.id === p.reopenEventId);
      if (ev) ev.shiftClosingId = record.id;
    });
    saveReopenEventsForTrip(tripId, evs);
  });
  report.tripIds.forEach(tripId => {
    manifests[tripId].status = TRIP_LIFECYCLE_STATUS.MANIFEST_CLOSED;
    manifests[tripId].closedAt = record.time;
    manifests[tripId].closedBy = record.staffId;
  });
  tsSaveJSON(HN_TS_MANIFESTS_KEY, manifests);

  return record;
}

// Gom vé theo TRẠM × MỆNH GIÁ cho bảng "phơi giấy" (mục 4 spec nghiệp vụ) — dùng chung 1 predicate với
// tsAggregateTickets nên KHÔNG tạo nguồn dữ liệu riêng, chỉ thêm 1 chiều gom nhóm mới (mệnh giá) mà
// stationBreakdown hiện có chưa có. Phân loại 1 vé vào ĐÚNG 1 trong 3 nhóm (không trùng):
//   - "Rước" (guestType = 'Rước đường' — CHỈ khách rước đường, không tính 'Trung chuyển') — không tính
//     vào mệnh giá.
//   - "Free" (giá 0đ, không phải Rước).
//   - Mệnh giá cụ thể (giá > 0đ, không phải Rước) — danh sách mệnh giá lấy động từ chính dữ liệu vé,
//     KHÔNG hard-code (mục 5 spec: 160/170/180.../250 trong hình chỉ là ví dụ minh hoạ).
// "Vé" ở đây đếm theo TICKET (nhóm ticketNo, giống ticketCount toàn hệ thống), không đếm theo hành
// khách, để khớp đúng khái niệm "Tổng số vé" đã dùng xuyên suốt các bảng khác.
function tsAggregateStationDenomination(predicateFn) {
  return tsAggregateStationDenominationFromSeats(getAllBookedSeats(), predicateFn);
}

// Bản nhận thẳng danh sách ghế thay vì tự đọc getAllBookedSeats() (CHỈ đúng cho currentTripId đang mở
// trên sơ đồ ghế) — dùng khi cần gom mệnh giá của 1 CHUYẾN KHÁC currentTripId (VD báo cáo Kết ca gom
// nhiều chuyến khác nhau cùng lúc), giống lý do tsAggregateTicketsFromSeats tách ra khỏi tsAggregateTickets.
function tsAggregateStationDenominationFromSeats(seats, predicateFn) {
  const stations = {};
  const stationOrder = [];
  function ensureStation(name) {
    if (!stations[name]) {
      stations[name] = { ruocCount: 0, ruocAmount: 0, freeCount: 0, freeAmount: 0, denomCounts: {}, denomAmounts: {}, totalCount: 0, totalAmount: 0 };
      stationOrder.push(name);
    }
    return stations[name];
  }
  // Luôn có đủ các trạm đang cấu hình (kể cả chưa phát sinh vé) — mục 6 spec: không được tự ý bỏ trạm
  // trống. Danh sách trạm đọc từ getTicketStations() (đã có sẵn, không hard-code KDV/LDH/XC).
  getTicketStations().forEach(ensureStation);

  const groups = groupSeatsByTicket(seats.filter(predicateFn));
  const denomSet = new Set();

  groups.forEach(g => {
    const s = g.main;
    const price = s.price || 0;
    const station = s.sellingStation || 'Chưa xác định';
    const bucket = ensureStation(station);
    // Cột "Rước" chỉ tính khách Rước đường — "Trung chuyển" vẫn là khách bán tại trạm bình thường
    // (chỉ cần đi xe trung chuyển tới điểm đón), không xếp chung nhóm Rước.
    const isRuoc = s.guestType === 'Rước đường';
    bucket.totalCount += 1;
    bucket.totalAmount += price;
    if (isRuoc) {
      bucket.ruocCount += 1;
      bucket.ruocAmount += price;
    } else if (price === 0) {
      bucket.freeCount += 1;
    } else {
      denomSet.add(price);
      bucket.denomCounts[price] = (bucket.denomCounts[price] || 0) + 1;
      bucket.denomAmounts[price] = (bucket.denomAmounts[price] || 0) + price;
    }
  });

  const denominations = Array.from(denomSet).sort((a, b) => a - b);
  let giaoXeCount = 0, giaoXeAmount = 0, khachDuongCount = 0, khachDuongAmount = 0, ticketCount = 0, totalAmount = 0;
  stationOrder.forEach(st => {
    const b = stations[st];
    ticketCount += b.totalCount;
    totalAmount += b.totalAmount;
    khachDuongCount += b.ruocCount;
    khachDuongAmount += b.ruocAmount;
    giaoXeCount += (b.totalCount - b.ruocCount);
    giaoXeAmount += (b.totalAmount - b.ruocAmount);
  });

  return {
    denominations,
    stations,
    stationOrder,
    totals: { ticketCount, totalAmount, giaoXeCount, giaoXeAmount, khachDuongCount, khachDuongAmount }
  };
}

// Đóng băng phơi — nhân viên xác nhận tay ở "Xem phơi" (ERD quy tắc 15), không có mốc giờ mặc định.
// Chụp bảng mệnh giá vào manifest.frozenDenom + ghi frozenAt/frozenBy; từ đây phơi không Re-open được nữa
// (vé chỉ sửa được khi Re-open) và mọi nơi đọc mệnh giá lấy từ bản chụp. Bấm 1 lần, không mở lại.
function tsCanFreezeManifest(tripId) {
  const m = getManifest(tripId);
  return !!m && !m.frozenAt && m.status !== TRIP_LIFECYCLE_STATUS.REOPEN; // đang Re-open (còn bán thêm) thì chưa chốt được
}
function tsFreezeManifest(tripId, bankArg) {
  if (!getCurrentStaffLabel() || !tsCanFreezeManifest(tripId)) return null;
  const snapshot = tsGetManifestDenominationBreakdownForTrip(tripId, bankArg); // tính TRƯỚC khi đặt frozenDenom
  if (!snapshot) return null;
  const m = getManifest(tripId);
  m.frozenDenom = snapshot;
  m.frozenAt = new Date().toISOString();
  m.frozenBy = getCurrentStaffLabel();
  saveManifest(tripId, m);
  return m;
}

// Bản "trạm × mệnh giá" khớp đúng với tsGetManifestCurrentTotals (phơi gốc + các lần Re-open ĐÃ đóng,
// Re-open đang mở không tính vào để tránh đếm 2 lần) — dùng chung điều kiện lọc nên số liệu web (Xem
// phơi) và bản in luôn khớp nhau tuyệt đối vì cùng đọc 1 hàm này.
function tsGetManifestCurrentDenominationBreakdown(tripId) {
  const manifest = getManifest(tripId);
  if (!manifest) return null;
  if (manifest.frozenDenom) return manifest.frozenDenom; // đã đóng băng: đọc bản chụp, không tính lại
  const closedEventIds = new Set(getReopenEventsForTrip(tripId).filter(e => e.status === 'CLOSED').map(e => e.id));
  return tsAggregateStationDenomination(s => s.soldPhase !== 'POST_DEPART' || closedEventIds.has(s.reopenEventId));
}

// Bản dùng cho tripId BẤT KỲ, không riêng currentTripId đang mở trên sơ đồ ghế — cần cho báo cáo Kết ca
// vì 1 lần kết ca gom nhiều chuyến (nhiều tripId) khác nhau cùng lúc, không chỉ chuyến đang xem. Đọc
// thẳng tripSeatBank[tripId] qua tsGetBankBookedSeats() (bank được giữ trong bộ nhớ cho MỌI chuyến, xem
// chú thích ở tsGetBankBookedSeats) thay vì getAllBookedSeats() (chỉ đúng cho chuyến đang mở).
function tsGetManifestDenominationBreakdownForTrip(tripId, bankArg) {
  const manifest = getManifest(tripId);
  if (manifest && manifest.frozenDenom) return manifest.frozenDenom; // đã đóng băng: đọc bản chụp
  // bankArg: trang Admin không có tripSeatBank toàn cục nên tự truyền seat bank của phơi vào.
  const bank = bankArg || ((typeof tripSeatBank !== 'undefined') ? tripSeatBank[tripId] : null);
  if (!manifest || !bank) return null;
  const closedEventIds = new Set(getReopenEventsForTrip(tripId).filter(e => e.status === 'CLOSED').map(e => e.id));
  const seats = tsGetBankBookedSeats(bank);
  return tsAggregateStationDenominationFromSeats(seats, s => s.soldPhase !== 'POST_DEPART' || closedEventIds.has(s.reopenEventId));
}

/* ===================== 5. MẪU IN PHƠI THEO KHU VỰC ===================== */
// Đăng ký mẫu in theo khu vực/trạm — hiện tại chỉ có "saigon" (KDV/LDH/XC, đúng 3 trạm mặc định ở
// DEFAULT_TICKET_STATIONS). Sau này thêm khu vực khác chỉ cần thêm 1 entry mới vào TS_PRINT_TEMPLATES
// và mở rộng tsGetPrintTemplateKey() để chọn đúng mẫu theo chuyến — không cần sửa lại phần build HTML.
const TS_PRINT_TEMPLATES = {
  saigon: {
    label: 'Phơi Sài Gòn',
    stationAbbr: {
      'Kinh Dương Vương': 'KDV',
      'Lê Đại Hành': 'LDH',
      'Xa Cảng': 'XC'
    }
  }
};

function tsGetPrintTemplateKey(tripId) {
  return 'saigon'; // chỉ 1 mẫu hiện có — chọn theo route/trạm khi có thêm mẫu khu vực khác
}

function tsGetStationAbbr(templateKey, stationName) {
  const tpl = TS_PRINT_TEMPLATES[templateKey];
  return (tpl && tpl.stationAbbr && tpl.stationAbbr[stationName]) || stationName;
}

/* ===================== 6. FORMAT TIỀN / NGÀY GIỜ ===================== */
// formatHistoryDate()/formatActionTime() đã có sẵn ở shared/format.js — chỉ bổ sung formatMoney() vì
// chỗ này dùng lại rất nhiều lần (mỗi ô số tiền trong bảng phơi/đối soát/kết ca).
function tsFormatMoney(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString('vi-VN') + 'đ';
}

function tsFormatSignedMoney(amount) {
  const n = Number(amount) || 0;
  const sign = n > 0 ? '+' : (n < 0 ? '−' : '');
  return sign + Math.abs(n).toLocaleString('vi-VN') + 'đ';
}

// Ghi tiền kiểu rút gọn theo nghìn đồng (VD 2.540.000đ -> "2.540") — đúng quy ước viết tay trên tờ phơi
// giấy thực tế (mục 4 spec), chỉ dùng cho bảng in phơi, KHÔNG dùng cho số liệu hiển thị trên web.
function tsFormatMoneyShort(amount) {
  const n = Number(amount) || 0;
  return Math.round(n / 1000).toLocaleString('vi-VN');
}
