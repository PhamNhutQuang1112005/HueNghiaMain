/* ===================== DỮ LIỆU GHẾ MẪU ===================== */

// ===== Storage & Data Models =====
// Các pool dữ liệu MẪU (staffList, stopsFirst, stopsLast, noteSamples, nameSamples,
// phonePool, pickupTimes) đã tách sang src/data/sample-seat-pool.js (Phase C) — nạp TRƯỚC
// file này trong ticketstaff.html. makeSeat() bên dưới vẫn đọc chúng qua biến global như cũ.

let pickupTimeIdx = 0, custIdx = 0, ticketSeq = 1;

// Khởi tạo đối tượng dữ liệu cho một ghế trên phơi xe
function makeSeat(code, state, opts = {}) {
  const isBooked = ['sold', 'hold', 'free', 'cargo'].includes(state);
  const sampleIdx = isBooked ? (custIdx++) % nameSamples.length : 0;
  const guestTypes = ['Trung chuyển', 'Rước đường', 'Trung chuyển', 'Khách trạm'];
  const gType = isBooked ? (opts.guestType || guestTypes[Math.floor(Math.random() * guestTypes.length)]) : null;
  const transAddrs = [
    '142 Lê Hồng Phong, P.2, Q.5, TP.HCM',
    '385 Kinh Dương Vương, P. An Lạc, Q. Bình Tân',
    '215 Nguyễn Trãi, P.3, Q.5, TP.HCM',
    'Vòng xoay An Lạc, Bình Tân, TP.HCM',
    '52 Cây Keo, P. Hiệp Tân, Q. Tân Phú',
    '78 Lý Thường Kiệt, Q.10, TP.HCM',
    '102 Quốc Lộ 1A, Bình Chánh, TP.HCM'
  ];
  const dropoffAddrs = [
    'Bến xe Châu Đốc, TP. Châu Đốc, An Giang',
    'Văn phòng Tân Châu, TX. Tân Châu, An Giang',
    '105 Nguyễn Huệ, P. Châu Phú A, TP. Châu Đốc',
    'Chợ Long Xuyên, TP. Long Xuyên, An Giang',
    'Trạm Tân Châu, Thị xã Tân Châu, An Giang',
    '228 Trần Hưng Đạo, TP. Long Xuyên, An Giang',
    'Khách sạn Victoria Châu Đốc, An Giang'
  ];
  const driverList = ['Trần Văn Hùng (TC-01)', 'Nguyễn Văn Nam (TC-03)', 'Phạm Quốc Bảo (TC-02)', 'Lê Hoàng Anh (TC-05)'];

  const tAddr = (isBooked && gType !== 'Khách trạm') ? transAddrs[Math.floor(Math.random() * transAddrs.length)] : '';
  const dAddr = (isBooked && gType !== 'Khách trạm' && (gType === 'Trung chuyển' || Math.random() > 0.4)) ? dropoffAddrs[Math.floor(Math.random() * dropoffAddrs.length)] : '';
  const driver = isBooked ? driverList[Math.floor(Math.random() * driverList.length)] : '';

  const base = {
    code, state, // empty | hold | sold | free | cargo
    locked: false,
    price: state === 'free' ? 0 : 280000,
    callState: isBooked ? "Chưa gọi" : null,
    guestType: gType,
    driver: driver,
    transshipStation: tAddr,
    transship: tAddr,
    pickupAddress: (gType === 'Rước đường' || gType === 'Trung chuyển') ? tAddr : '',
    dropoffAddress: dAddr,
    arrivalTransfer: dAddr,
    firstStop: isBooked ? stopsFirst[Math.floor(Math.random() * stopsFirst.length)] : null,
    lastStop: isBooked ? stopsLast[Math.floor(Math.random() * stopsLast.length)] : null,
    staff: isBooked ? staffList[Math.floor(Math.random() * staffList.length)] : null,
    customerName: isBooked ? nameSamples[sampleIdx] : null,
    note: isBooked ? noteSamples[Math.floor(Math.random() * noteSamples.length)] : null,
    count: 1,
    pickupTime: isBooked ? pickupTimes[(pickupTimeIdx++) % pickupTimes.length] : null,
    phone: isBooked ? phonePool[sampleIdx] : null,
    ticketNo: isBooked ? ("SGCD-" + String(ticketSeq++).padStart(4, '0')) : null,
    paid: isBooked ? (state === 'free' ? true : (state === 'sold' ? Math.random() > 0.25 : Math.random() > 0.6)) : false,
    hasLuggage: isBooked ? Math.random() > 0.55 : false
  };
  return Object.assign(base, opts);
}

// Ghép ghế liền kề vào chung 1 vé (cùng khách, cùng SĐT, cùng mã vé, cùng điểm đi/đến...)
// để dữ liệu ghế trên sơ đồ và dữ liệu ở danh sách hành khách luôn khớp nhau tuyệt đối.
function groupSeat(mainSeat, code, state) {
  mainSeat.count = 2;
  return makeSeat(code, state, {
    ticketNo: mainSeat.ticketNo,
    customerName: mainSeat.customerName,
    phone: mainSeat.phone,
    pickupTime: mainSeat.pickupTime,
    guestType: mainSeat.guestType,
    transshipStation: mainSeat.transshipStation,
    transship: mainSeat.transship,
    pickupAddress: mainSeat.pickupAddress,
    dropoffAddress: mainSeat.dropoffAddress,
    arrivalTransfer: mainSeat.arrivalTransfer,
    firstStop: mainSeat.firstStop,
    lastStop: mainSeat.lastStop,
    note: mainSeat.note,
    hasLuggage: mainSeat.hasLuggage,
    paid: mainSeat.paid,
    count: 2
  });
}

const a1 = makeSeat("A1", "sold");
const a2 = groupSeat(a1, "A2", "sold");
const a10 = makeSeat("A10", "hold");
const a11 = groupSeat(a10, "A11", "hold");
const a12 = makeSeat("A12", "sold", {
  customerName: "Võ Minh Khoa",
  phone: "0809654321",
  firstStop: "Trạm An Sương",
  lastStop: "Trạm Long Xuyên",
  transshipStation: "45 Trường Chinh, Q.12"
});

let seatPlanDown = [
  a1, a2, makeSeat("A3", "empty"), makeSeat("A4", "hold"),
  makeSeat("A5", "sold"), makeSeat("A6", "empty"), makeSeat("A7", "sold"), makeSeat("A8", "free"),
  makeSeat("A9", "empty"), a10, a11, a12,
];
seatPlanDown[2].locked = true; // ví dụ trạng thái khoá tạm thời (BR-05)
seatPlanDown[2].lockedBy = "NV. Hồng";

const b2 = makeSeat("B2", "sold");
const b3 = groupSeat(b2, "B3", "sold");

let seatPlanUp = [
  makeSeat("B1", "empty"), b2, b3, makeSeat("B4", "empty"),
  makeSeat("B5", "sold"), makeSeat("B6", "empty"), makeSeat("B7", "hold"), makeSeat("B8", "hold"),
  makeSeat("B9", "empty"), makeSeat("B10", "sold"), makeSeat("B11", "free"), makeSeat("B12", "empty"),
];

// Danh sách các chuyến (khớp với data-trip trên trip-card ở Zone 1) để có thể
// chuyển ghế của khách sang một chuyến xe khác, không chỉ trong cùng 1 chuyến.
const todayStr = new Date().toISOString().split("T")[0];

/* ---- Zone 1: trạng thái lịch chọn ngày (khai báo SỚM vì renderZone1TripList() lọc theo selectedDate
   và được gọi ngay lúc nạp trang). Ngày mặc định = HÔM NAY THẬT (khớp todayStr — cùng ngày mà phơi mẫu
   / tab Phơi xe / Rước liền / Đặt lại vé đang dùng). Trước đây gắn cứng 08/07/2026 nên lịch Zone 1
   lệch hẳn với dữ liệu phơi và không lọc gì cả. ---- */
function zone1TodayDate() { return new Date(todayStr + 'T00:00:00'); }
function zone1DateStr(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
let calDate = zone1TodayDate();
let selectedDate = zone1TodayDate();

// Chuẩn hoá "phơi mẫu" (isTemplate): luôn kéo về ngày HÔM NAY (mẫu để nhân bản, không có ngày thật) và
// LUÔN ở trạng thái "Chưa chỉ định" + không có biển số — mẫu là bản thiết kế chuyến, không mang
// trạng thái/biển số sống. Áp cho cả dữ liệu localStorage lẫn seed mặc định.
function normalizeTemplateTrips(list) {
  (list || []).forEach(t => {
    if (t && t.isTemplate) {
      t.date = todayStr;
      t.status = 'Chưa chỉ định';
      t.plate = '';
    }
  });
  return list;
}

// ===== Trạng thái hiển thị THỐNG NHẤT cho 1 chuyến =====
// Dùng CHUNG cho thẻ danh sách Phơi xe (applyFilters) và badge Zone 2 (renderTripLifecycleUI) để 2 nơi
// luôn hiện đúng cùng 1 trạng thái. Suy từ: đã hủy → vòng đời phơi (khởi hành/Re-open/kết ca) → chưa
// tạo phơi thì theo biển số (có biển = "Đang bán"). KHÔNG đọc thẳng t.status (chuỗi lưu sẵn, dễ lệch).
const TRIP_DISPLAY_STATUS = {
  'chua-chi-dinh':  { label: 'Chưa chỉ định', phoi: 'chua-chi-dinh', zone2: 'status-chua-chi-dinh' },
  'dang-ban':       { label: 'Đang bán',         phoi: 'dang-ban',      zone2: 'status-selling' },
  'da-khoi-hanh':   { label: 'Khởi hành',        phoi: 'da-khoi-hanh',  zone2: 'status-departed' },
  'dang-reopen':    { label: 'Re-open',          phoi: 'da-khoi-hanh',  zone2: 'status-reopen' },
  'da-dong-reopen': { label: 'Đóng Re-open',     phoi: 'da-khoi-hanh',  zone2: 'status-reopen_closed' },
  'da-ket-ca':      { label: 'Đã kết ca',        phoi: 'da-khoi-hanh',  zone2: 'status-manifest_closed' },
  'da-huy':         { label: 'Đã hủy',           phoi: 'da-huy',        zone2: 'status-departed' }
};

function tripDisplayStatusKey(tripId) {
  const trip = (Array.isArray(allTripsMeta) ? allTripsMeta : []).find(t => t && t.id === tripId);
  if (trip && trip.status === 'Đã hủy') return 'da-huy';
  const life = (typeof getTripLifecycleStatus === 'function') ? getTripLifecycleStatus(tripId) : 'SELLING';
  if (life === 'DEPARTED') return 'da-khoi-hanh';
  if (life === 'REOPEN') return 'dang-reopen';
  if (life === 'REOPEN_CLOSED') return 'da-dong-reopen';
  if (life === 'MANIFEST_CLOSED') return 'da-ket-ca';
  // SELLING = chưa tạo phơi → chỉ còn 2 trạng thái: chưa có biển số ("Chưa chỉ định") vs đã có biển số
  // ("Đang bán"). Trước đây tách thêm "Đã chỉ định xe" cho xe có biển mà chưa bán vé — bỏ, vì chỉ định
  // xe xong coi như đang bán.
  const bank = (typeof tripSeatBank === 'object' && tripSeatBank) ? tripSeatBank[tripId] : null;
  const plate = (bank && bank.plate) || (trip && trip.plate) || '';
  return plate ? 'dang-ban' : 'chua-chi-dinh';
}

function loadAllTrips() {
  const saved = TripService.getRawString();
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Di trú 1 lần: phơi seed id 1..10 từng bị đánh dấu isTemplate nhầm — chúng là CHUYẾN THẬT
        // (có sơ đồ ghế demo), chỉ id 11..14 mới là phơi mẫu. Gỡ cờ để chúng hiện lại ở Zone 1 /
        // danh sách phơi thường như trước.
        const REAL_SEED_TRIP_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        parsed.forEach((t, idx) => {
          if (!t.date || t.date === '2026-07-29') t.date = todayStr;
          if (t.isTemplate && REAL_SEED_TRIP_IDS.indexOf(String(t.id)) !== -1) delete t.isTemplate;
          // Phơi cũ nạp từ trước khi có createdAt (seed/mẫu) không có mốc thời gian tạo thật — gán tạm
          // theo thứ tự trong mảng (số rất nhỏ so với Date.now()) để phơi tạo thật sự sau này luôn nổi
          // lên đầu danh sách (xem applyFilters), còn phơi cũ vẫn giữ đúng thứ tự tương đối với nhau.
          if (!t.createdAt) t.createdAt = idx;
        });
        normalizeTemplateTrips(parsed);
        TripService.save(parsed);
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse trips", e);
    }
  }
  return normalizeTemplateTrips([...DEFAULT_SGCD_TRIPS, ...DEFAULT_CDSG_TRIPS, ...DEFAULT_EXTRA_TEMPLATE_TRIPS]);
}

// Suy chiều của 1 tuyến: ưu tiên FleetStore (chuẩn theo hướng Admin cấu hình, đúng cả với tuyến KHÔNG
// bắt đầu bằng "Sài Gòn"), fallback về quy ước cũ route.startsWith('Sài Gòn') cho phơi/tuyến lạ chưa có
// trong store. Trả 'di' (chiều đi) hoặc 've' (chiều về).
function tripRouteSense(route) {
  if (!route) return 've';
  try {
    if (window.FleetStore && typeof FleetStore.getRouteSense === 'function') {
      const s = FleetStore.getRouteSense(route);
      if (s === 'di' || s === 've') return s;
    }
  } catch (e) { /* fallback bên dưới */ }
  return route.startsWith('Sài Gòn') ? 'di' : 've';
}

// Suy id HƯỚNG (1 trong 4 hướng cố định) của 1 phơi: ưu tiên FleetStore, fallback theo sense cũ
// (phơi/tuyến lạ chưa có trong store → gộp vào hướng cùng chiều: 'sg-ag' nếu đi, 'ag-sg' nếu về).
function tripDirectionId(route) {
  try {
    if (window.FleetStore && typeof FleetStore.getRouteDirectionId === 'function') {
      const id = FleetStore.getRouteDirectionId(route);
      if (id) return id;
    }
  } catch (e) { /* fallback */ }
  return tripRouteSense(route) === 've' ? 'ag-sg' : 'sg-ag';
}

// Gom allTripsMeta theo id hướng — { [dirId]: [...] } — dùng lại sau mỗi lần allTripsMeta đổi.
// KHÔNG gồm "phơi mẫu" (isTemplate): mẫu chỉ là bản thiết kế để nhân bản hàng loạt, không phải chuyến
// thật — nên không hiện ở Zone 1 lẫn danh sách phơi thường, để 2 nơi đó luôn nhất quán với nhau.
function refreshTripMetaFilters() {
  tripsByDirection = {};
  allTripsMeta.forEach(t => {
    if (!t || !t.route || t.status === 'Đã hủy' || t.isTemplate) return;
    const id = tripDirectionId(t.route);
    (tripsByDirection[id] = tripsByDirection[id] || []).push(t);
  });
}

let allTripsMeta = loadAllTrips();
let tripsByDirection = {};
refreshTripMetaFilters();

// Zone 1 "Hướng đi" — 4 hướng cố định, đọc từ FleetStore (không còn hard-code 2 chiều sg-cd/cd-sg).
// directionLabels: { [dirId]: label }
// routeOptions:    { [dirId]: [{id:'all'|<label>, label, fromStations, toStations}] } — LUÔN đủ 4 key.
//   Bỏ tuyến "gộp" (nhãn = nhãn hướng, VD "Sài Gòn - An Giang") vì chọn nó = "Tất cả tuyến".
//   fromStations/toStations lấy từ FleetStore để renderZone1TripList() lọc phơi theo TRẠM ĐI/TRẠM ĐẾN.
let selectedDirection = 'sg-ag';
let selectedRoute = 'all';
let directionLabels = {};
let routeOptions = {};
function reloadDirectionLabels() {
  const dirs = (window.FleetStore ? FleetStore.getDirections() : [])
    .filter(d => d && d.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const dtc = window.FleetStore ? FleetStore.buildDirTripCfg() : {};
  directionLabels = {};
  routeOptions = {};
  dirs.forEach(d => {
    directionLabels[d.id] = d.label;
    const dcfg = dtc[d.id] || {};
    const mainLabel = dcfg.route; // nhãn tuyến "gộp" của hướng
    routeOptions[d.id] = [{ id: 'all', label: 'Tất cả tuyến' }].concat(
      (dcfg.routes || [])
        .filter(r => r.label && r.label !== mainLabel)
        .map(r => ({
          id: r.label,
          label: r.label,
          fromStations: (r.fromStations || []).slice(),
          toStations: (r.toStations || []).slice()
        }))
    );
  });
  if (!directionLabels[selectedDirection]) {
    selectedDirection = Object.keys(directionLabels)[0] || 'sg-ag';
    selectedRoute = 'all';
  }
}
reloadDirectionLabels();

// 1 phơi có "khớp tuyến đang lọc ở Zone 1" không: so TRẠM ĐI + TRẠM ĐẾN của phơi với nhóm trạm đi/đến
// của tuyến (không dùng chuỗi trip.route). Phơi thiếu cả 2 trạm → fallback so nhãn trip.route.
function zone1TripMatchesRoute(t) {
  if (!selectedRoute || selectedRoute === 'all') return true;
  const r = (routeOptions[selectedDirection] || []).find(o => o.id === selectedRoute);
  if (!r || !r.fromStations) return true;
  if (t.fromStation || t.toStation) {
    const okFrom = !t.fromStation || !r.fromStations.length || r.fromStations.indexOf(t.fromStation) !== -1;
    const okTo = !t.toStation || !r.toStations.length || r.toStations.indexOf(t.toStation) !== -1;
    return okFrom && okTo;
  }
  return t.route === selectedRoute;
}

// Sinh dữ liệu ghế mẫu cho các chuyến còn lại (mỗi ghế là 1 khách hàng độc nhất)

let isSyncingFromStorage = false;

let extraLeftoverSeats = []; // danh sách "ghế dư" khi đổi loại xe làm mất mã ghế đang có khách
let subSeats = []; // danh sách "ghế phụ" tự thêm (chỉ có ghi chú + giá tiền), ô "+" luôn ở cuối danh sách này
let cancelledSeats = []; // danh sách ghế đã hủy của chuyến hiện tại

const savedBank = loadSeatBank();
const tripSeatBank = savedBank || {};
if (!savedBank) {
  tripSeatBank['1'] = {
    down: seatPlanDown,
    up: seatPlanUp,
    plate: '51F-123.45',
    vehicleType: 'Limousine 24 Phòng',
    driver: 'Trần Văn Hùng (TC-01)',
    helper: 'Nguyễn Thị Hương',
    cancelledSeats: []
  };
  allTripsMeta.forEach(t => {
    if (t.id !== '1') {
      const plan = generateTripSeatPlanForVehicleType(t.vehicleType || 'Giường nằm 34 chỗ');
      tripSeatBank[t.id] = {
        down: plan.down,
        up: plan.up,
        plate: t.plate || '50H-678.90',
        vehicleType: t.vehicleType || 'Giường nằm 34 chỗ',
        driver: 'Phạm Quốc Bảo',
        helper: 'Đỗ Văn Sơn',
        cancelledSeats: []
      };
    }
  });
  cancelledSeats = tripSeatBank['1'].cancelledSeats || [];
  saveSeatBank();
} else {
  seatPlanDown = tripSeatBank['1'].down;
  seatPlanUp = tripSeatBank['1'].up;
  extraLeftoverSeats = tripSeatBank['1'].extraSeats || [];
  subSeats = tripSeatBank['1'].subSeats || [];
  cancelledSeats = tripSeatBank['1'].cancelledSeats || [];
}

// ĐỒNG BỘ ticketSeq VỚI SEAT BANK ĐÃ LƯU. `ticketSeq` luôn reset về 1 mỗi lần tải trang rồi bị đoạn
// sinh ghế mẫu đẩy lên ~20. Nếu seat bank (localStorage) đã có vé của phiên trước với số vé "SGCD-00xx"
// nằm trong khoảng đó thì vé ĐẶT/BÁN MỚI sẽ TRÙNG số vé với vé cũ → buildTicketGroupMap() gộp nhầm 2 vé
// KHÔNG liên quan thành 1 "nhóm" (hiện số ghế của nhau, sửa/cọc 1 vé kéo theo vé kia) dù không hề đặt
// vé nhóm. Kéo ticketSeq vượt qua số vé lớn nhất đang có để số vé mới luôn duy nhất.
function reseedTicketSeqFromBank() {
  let maxNo = 0;
  Object.keys(tripSeatBank).forEach(tid => {
    const bank = tripSeatBank[tid];
    if (!bank) return;
    [].concat(bank.down || [], bank.up || [], bank.subSeats || [], bank.extraSeats || []).forEach(s => {
      const m = s && s.ticketNo != null && String(s.ticketNo).match(/(\d+)\s*$/);
      if (m) { const n = parseInt(m[1], 10); if (n > maxNo) maxNo = n; }
    });
  });
  if (maxNo + 1 > ticketSeq) ticketSeq = maxNo + 1;
}
reseedTicketSeqFromBank();

// Sửa DỮ LIỆU CŨ đã dính lỗi trùng số vé: trong 1 nhóm cùng ticketNo mà có ghế của KHÁCH KHÁC NHAU
// (tên + SĐT khác) → tách mỗi khách thành 1 số vé riêng. Vé đặt nhóm thật (mọi ghế cùng 1 khách) giữ y.
function splitAccidentalTicketGroups() {
  const OCC = ['sold', 'hold', 'free', 'cargo'];
  const custKey = s => (s.customerName || '').trim().toLowerCase() + '|' + String(s.phone || '').replace(/[\s.\-]/g, '');
  let changed = false;
  Object.keys(tripSeatBank).forEach(tid => {
    const bank = tripSeatBank[tid];
    if (!bank) return;
    const byTicket = new Map();
    [].concat(bank.down || [], bank.up || [], bank.subSeats || [], bank.extraSeats || []).forEach(s => {
      if (!s || !s.ticketNo || OCC.indexOf(s.state) === -1) return;
      if (!byTicket.has(s.ticketNo)) byTicket.set(s.ticketNo, []);
      byTicket.get(s.ticketNo).push(s);
    });
    byTicket.forEach((members, tno) => {
      if (members.length < 2) return;
      const groups = new Map();
      members.forEach(s => {
        const k = custKey(s);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(s);
      });
      if (groups.size < 2) return; // cùng 1 khách → vé nhóm thật, giữ nguyên
      Array.from(groups.values()).forEach((g, i) => {
        const no = i === 0 ? tno : ('SGCD-' + String(ticketSeq++).padStart(4, '0'));
        g.forEach(s => { s.ticketNo = no; s.count = g.length; });
      });
      changed = true;
    });
  });
  if (changed) { try { saveSeatBank(); } catch (e) {} }
}
splitAccidentalTicketGroups();

let currentTripId = '1';
let zone1HourFilter = 'all'; // lọc zone1 theo giờ (dropdown #zone1HourFilter) — khai báo sớm vì renderSeats() gọi renderZone1TripList() ngay khi script vừa nạp
let currentView = 'booking'; // 'booking' | 'history' — goToTripFromHistory() (shared/booking.js) đọc biến này để tự chuyển về màn đặt vé khi cần

window.addEventListener('storage', (e) => {
  // Admin sửa Hướng/Tuyến ở tab khác → dựng lại cấu hình + các dropdown/bộ lọc phụ thuộc.
  if (e.key === HN_DIRECTIONS_KEY || e.key === HN_ROUTES_KEY) {
    reloadFleetCfg();
    try { if (typeof populateTripDirectionSelect === 'function') populateTripDirectionSelect(); } catch (err) {}
    try { if (typeof onFilterDirectionChange === 'function') onFilterDirectionChange(); } catch (err) {}
    try { if (typeof refreshTripsList === 'function') refreshTripsList(); } catch (err) {}
    try { if (typeof applyFilters === 'function') applyFilters(); } catch (err) {}
  }
  // Admin sửa danh mục trạm ở tab khác → đổ lại các <select>/<datalist> Trạm đi/Trạm đến gắn cứng.
  if (e.key === HN_STATIONS_KEY) {
    try { if (typeof populateStationPickers === 'function') populateStationPickers(); } catch (err) {}
  }
  if (e.key === HN_STORAGE_KEY || e.key === HN_TRIPS_KEY) {
    if (e.key === HN_TRIPS_KEY) {
      allTripsMeta = loadAllTrips();
      refreshTripMetaFilters();
    }
    const newBank = loadSeatBank();
    if (newBank) {
      isSyncingFromStorage = true;
      Object.keys(newBank).forEach(k => {
        tripSeatBank[k] = newBank[k];
      });
      // Tab khác vừa đặt/bán thêm vé → kéo ticketSeq vượt qua số vé mới nhất để tab này không sinh trùng.
      reseedTicketSeqFromBank();
      if (tripSeatBank[currentTripId]) {
        seatPlanDown = tripSeatBank[currentTripId].down;
        seatPlanUp = tripSeatBank[currentTripId].up;
        extraLeftoverSeats = tripSeatBank[currentTripId].extraSeats || [];
        subSeats = tripSeatBank[currentTripId].subSeats || [];
        cancelledSeats = tripSeatBank[currentTripId].cancelledSeats || [];

        // Update header details from bank
        const bank = tripSeatBank[currentTripId];
        const headerPlate = document.getElementById('headerPlate');
        if (headerPlate) headerPlate.textContent = bank.plate || '51F-123.45';

        const carTypeEl = document.querySelector('.car-type');
        if (carTypeEl) {
          const svgIcon = carTypeEl.querySelector('svg');
          carTypeEl.innerHTML = '';
          if (svgIcon) carTypeEl.appendChild(svgIcon);
          carTypeEl.appendChild(document.createTextNode(' ' + (bank.vehicleType || 'Limousine 24 Phòng')));
        }

        const headerDriver = document.getElementById('headerDriver');
        if (headerDriver) headerDriver.textContent = bank.driver || 'Trần Văn Hùng';

        const headerHelper = document.getElementById('headerHelper');
        if (headerHelper) headerHelper.textContent = bank.helper || 'Nguyễn Thị Hương';
      }
      renderSeats();
      renderExtraSeats();
      renderSubSeats();
      renderCancelledSeats();
      updateCancelledTabCount();
      renderZone1TripList();
      if (document.getElementById('zone3Passengers') && document.getElementById('zone3Passengers').style.display !== 'none') {
        renderPassengerList();
      }
      if (document.getElementById('zone3Cancelled') && document.getElementById('zone3Cancelled').style.display !== 'none') {
        renderCancelledListTable();
      }
      isSyncingFromStorage = false;
    }
  }
});

let multiSelectMode = false;
let selectionMode = null; // 'transfer' | 'group' | null — loại thao tác đang thực hiện
let selectedSourceSeats = [];
let selectedTargetSeats = [];
let transferSourceTripId = null; // chuyến của các ghế nguồn đang chọn để chuyển
let transferTargetTripId = null; // chuyến đang xem để chọn ghế trống làm đích (có thể khác chuyến nguồn)
let transferSourceCancelId = null; // id bản ghi trong cancelledSeats đang chọn để "chuyển ghế" sang phơi khác (thay vì 1 ghế nguồn còn sống)
let sellFromTransferBarSeats = null; // (các) ghế đang chờ bán nhanh từ thanh chuyển ghế, không qua panel sửa vé — xem sellFromTransferBar()
let pendingRebookSell = null; // { tripId, seatCodes, form, deposit } đang chờ xác nhận thanh toán từ modal "Đặt lại vé" — xem confirmRebookAndSell() ở ticketstaff-account.js
let pendingPickupAssignSell = null; // { paxId, tripId, seatCodes, unitPrice } đang chờ xác nhận thanh toán từ modal "Chỉ định xe rước" — xem pkConfirmAssign() ở ticketstaff-pickup.js
let currentPanelSeat = null;
let currentPanelSeats = [];
let currentEditSeatCode = null;
let currentPanelMode = 'booking';

// ===== Tabs & Zone 3: Views =====

// Chuyển đổi hiển thị tab (Sơ đồ ghế / Hành khách / Trung chuyển / Ghế hủy)
function switchTab(tab, el) {
  document.querySelectorAll('.tabs .tab-item').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  const seatSection = document.querySelector('.zone3:not(.passenger-view)');
  const paxSection = document.getElementById('zone3Passengers');
  const transSection = document.getElementById('zone3Transship');
  const roadsideSection = document.getElementById('zone3Roadside');
  const cancelledSection = document.getElementById('zone3Cancelled');
  // Chọn theo id — KHÔNG dùng querySelector('.sticky-actions') vì trang có nhiều thanh cùng class
  // (#tsPrintActionBar, #bulkTemplateBar, #pkActionBar...) và #tsPrintActionBar đứng TRƯỚC thanh chọn ghế
  // trong DOM nên querySelector trả nhầm nó, khiến thanh "Chuyển ghế / Đặt vé nhóm" không bao giờ hiện.
  const sticky = document.getElementById('seatTransferBar');
  const tsPrintBar = document.getElementById('tsPrintActionBar');

  [seatSection, paxSection, transSection, roadsideSection, cancelledSection, sticky, tsPrintBar].forEach(sec => { if (sec) sec.style.display = 'none'; });

  if (tab === 'seatmap') {
    if (seatSection) seatSection.style.display = '';
    updateTransferBarVisibility();
  } else if (tab === 'passengers') {
    if (paxSection) paxSection.style.display = 'flex';
    renderPassengerList();
  } else if (tab === 'transship') {
    if (transSection) transSection.style.display = 'flex';
    renderTransshipTables();
  } else if (tab === 'roadside') {
    if (roadsideSection) roadsideSection.style.display = 'flex';
    renderRoadsideTable();
  } else if (tab === 'cancelled') {
    if (cancelledSection) cancelledSection.style.display = 'flex';
    renderCancelledListTable();
  }
}

function renderCancelledListTable() {
  const tbody = document.getElementById('cancelledTableBody');
  const hint = document.getElementById('cancelledResultHint');
  if (!tbody) return;

  updateCancelledTabCount();

  if (!cancelledSeats || cancelledSeats.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#6b7280; font-size:14px;">Chưa có ghế nào bị hủy trong chuyến này</td></tr>`;
    if (hint) hint.textContent = 'Danh sách ghế đã hủy (0 ghế)';
    return;
  }

  if (hint) hint.textContent = `Danh sách ghế đã hủy (${cancelledSeats.length} ghế)`;

  tbody.innerHTML = cancelledSeats.map((item, index) => {
    const firstStopShort = shortenStopName(item.firstStop) || '—';
    const lastStopShort = shortenStopName(item.lastStop) || '—';
    const routeStr = `${firstStopShort} → ${lastStopShort}`;
    const priceStr = item.price ? item.price.toLocaleString('vi-VN') + 'đ' : '—';
    const reasonText = item.reason || 'Không có lý do';
    const timeText = item.cancelTime || '—';

    return `
      <tr>
        <td style="text-align:center; font-weight:600; color:#6b7280;">${index + 1}</td>
        <td><b style="color:var(--red,#C20D08);">${item.code}</b></td>
        <td><b>${item.customerName || '—'}</b></td>
        <td>${item.phone || '—'}</td>
        <td>${routeStr}</td>
        <td style="font-weight:600;">${priceStr}</td>
        <td style="color:#dc2626; font-weight:600;">${reasonText}</td>
        <td style="color:#6b7280; font-size:13px;">${timeText}</td>
      </tr>
    `;
  }).join('');
}

// Cột "Trạng thái" (2 bảng Trung chuyển đón/trả) — bấm để ghi/sửa ghi chú riêng (VD "đã gọi tài xế",
// "khách xin đón trễ 10p"), KHÔNG hiện thẳng nội dung ghi chú trên tag (khác kiểu cột "Trung chuyển"
// .pk-transship-cell ở trang Rước liền) — chỉ đổi viền/nền báo có ghi chú, rê chuột vào mới thấy qua title="...".
// Chiều "đón": "Đang đón" chỉ đúng khi ĐÃ gán tài xế trung chuyển (hasAssignedDriver, xem cột "Tài xế"
// cùng hàng) — trước đây dùng nhầm item.paid (trạng thái thu tiền vé, không liên quan gì đến việc đã có
// tài xế đi đón hay chưa) nên hiện sai. Chiều "trả" chưa có cột gán tài xế hiển thị ở bảng này nên vẫn
// giữ nguyên theo item.paid như cũ.
// ===== Chọn dòng (checkbox) + thanh nổi "In vé trung chuyển" ở 2 bảng Trung chuyển đón/trả (tab Trung
// chuyển trong booking view, zone3Transship) — CHỈ hiện cho role trung chuyển (xem renderTransshipTables,
// toggle class "ts-dispatch-role"). Key = "pickup:"/"dropoff:" + ticketNo (2 bảng khoá độc lập, 1 khách
// có cả 2 chặng đón+trả thì mỗi chặng in ra 1 tờ vé riêng, mỗi tờ chỉ có 1 địa chỉ đón/trả). =====
let tsSelectedTicketKeys = new Set();

function tsToggleRow(key, checkboxEl) {
  if (checkboxEl.checked) tsSelectedTicketKeys.add(key);
  else tsSelectedTicketKeys.delete(key);
  tsUpdatePrintActionBar();
}

function tsToggleAll(prefix, checkboxEl) {
  const body = document.getElementById(prefix === 'pickup' ? 'transshipPickupBody' : 'transshipDropoffBody');
  if (!body) return;
  body.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    let key = null;
    try { key = JSON.parse(cb.dataset.args || '[]')[0]; } catch (e) { /* ignore */ }
    if (!key) return;
    cb.checked = checkboxEl.checked;
    if (checkboxEl.checked) tsSelectedTicketKeys.add(key);
    else tsSelectedTicketKeys.delete(key);
  });
  tsUpdatePrintActionBar();
}

function tsClearPrintSelection() {
  tsSelectedTicketKeys.clear();
  renderTransshipTables();
}

function tsUpdatePrintActionBar() {
  const bar = document.getElementById('tsPrintActionBar');
  const hint = document.getElementById('tsPrintActionHint');
  if (!bar) return;
  if (tsSelectedTicketKeys.size === 0) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  if (hint) hint.textContent = `Đã chọn ${tsSelectedTicketKeys.size} khách`;
}

// Tìm lại đúng dòng (item + seatCount) theo key "pickup:"/"dropoff:"+ticketNo — dùng khi in vé, lấy lại
// đúng địa chỉ theo ĐÚNG chặng đã chọn (đón dùng pickupAddress, trả dùng dropoffAddress).
function tsFindRowByKey(key) {
  const leg = key.startsWith('dropoff:') ? 'dropoff' : 'pickup';
  const ticketKeyPart = key.slice(leg.length + 1);
  const grouped = groupSeatsByTicket(getAllBookedSeats());
  const g = grouped.find((gr) => (gr.main.ticketNo || ('T-' + gr.main.code)) === ticketKeyPart);
  if (!g) return null;
  return { leg, item: g.main, seatCodes: g.members ? g.members.map((s) => s.code) : [g.main.code], seatCount: g.members ? g.members.length : 1 };
}

// Chuẩn bị dữ liệu hiển thị cho 1 tờ "vé trung chuyển" (1 khách / 1 chặng đón hoặc trả) — cùng khuôn dữ
// liệu với buildTicketPrintData() bên role phòng vé (ticketNo/nowStr/seatsText/customerName/phone/route/
// time/unitPrice/totalPrice/qrImgUrl/paymentMethod) để dùng chung buildTicketPageHtml()/TICKET_PRINT_STYLE,
// chỉ thêm 2 trường riêng cho trung chuyển: legLabel (Đón khách/Trả khách) và address (địa chỉ đón/trả
// thực tế, không phải tên trạm).
function tsBuildTransshipTicketData(r, currentTrip) {
  const item = r.item;
  const address = r.leg === 'dropoff'
    ? (item.dropoffAddress || item.arrivalTransfer || item.lastStop || '—')
    : (item.pickupAddress || item.transship || item.transshipStation || item.firstStop || '—');
  const ticketNo = item.ticketNo || ('TC-' + String(Math.floor(1000 + Math.random() * 9000)));
  const seatsText = r.seatCodes.join(', ');
  const customerName = item.customerName || 'Khách';
  const phone = item.phone || '—';
  const route = currentTrip.route || 'Sài Gòn - An Giang';
  const time = currentTrip.time || '—';
  const unitPrice = item.price || 0;
  const totalPrice = unitPrice * r.seatCount;
  const paymentMethod = item.paymentMethod || 'Tiền mặt';
  const legLabel = r.leg === 'dropoff' ? 'Trả khách' : 'Đón khách';

  const now = new Date();
  const nowStr = `${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${now.toLocaleDateString('vi-VN')}`;

  return { ticketNo, nowStr, seatsText, customerName, phone, route, time, legLabel, address, unitPrice, totalPrice, paymentMethod };
}

// Dựng 1 trang vé trung chuyển — bố cục Y CHANG vé lên xe bên role phòng vé (buildTicketPageHtml() ở
// dưới: brand-header/ticket-title/dash-line/kv-row/seat-box/total-price-box/footer-note), chỉ khác tiêu
// đề ("VÉ TRUNG CHUYỂN" thay vì "VÉ XE KHÁCH"), ô nổi bật hiện chặng đón/trả thay vì số ghế, có thêm dòng
// địa chỉ đón/trả thực tế cho tài xế, và KHÔNG có mã QR (vé trung chuyển không cần quét QR lên xe).
function buildTransshipTicketPageHtml(d) {
  return `
    <div class="brand-header">
      <div class="brand-badge">HN</div>
      <div class="brand-name">HUỆ NGHĨA EXPRESS</div>
      <div class="brand-sub">Hệ thống Đặt vé & Trung chuyển Chuyên nghiệp</div>
    </div>

    <div class="ticket-title">VÉ TRUNG CHUYỂN</div>
    <div class="dash-line"></div>

    <div class="kv-row"><span class="kv-label">Mã vé:</span><span class="kv-val">${d.ticketNo}</span></div>
    <div class="kv-row"><span class="kv-label">Ngày in:</span><span class="kv-val">${d.nowStr}</span></div>

    <div class="dash-line"></div>

    <div class="seat-box">${d.legLabel.toUpperCase()}</div>

    <div class="kv-row"><span class="kv-label">Hành khách:</span><span class="kv-val">${d.customerName}</span></div>
    <div class="kv-row"><span class="kv-label">Điện thoại:</span><span class="kv-val">${d.phone}</span></div>
    <div class="kv-row"><span class="kv-label">Tuyến xe:</span><span class="kv-val">${d.route}</span></div>
    <div class="kv-row"><span class="kv-label">Giờ xuất bến:</span><span class="kv-val">${d.time}</span></div>
    <div class="kv-row"><span class="kv-label">Số ghế:</span><span class="kv-val">${d.seatsText}</span></div>
    <div class="kv-row"><span class="kv-label">Địa chỉ:</span><span class="kv-val">${d.address}</span></div>

    <div class="dash-line"></div>

    <div class="footer-note">
      <b>Cảm ơn quý khách đã chọn Huệ Nghĩa Express!</b><br>
      Tổng đài đặt vé & hỗ trợ: <b>1900 63 64 99</b>
    </div>
  `;
}

// Gộp nhiều tờ vé trung chuyển vào CHUNG 1 cửa sổ in (mỗi tờ 1 trang, ngăn cách bằng page-break) — cùng
// cơ chế với buildMultiTicketPrintHtml() bên role phòng vé, tránh bị trình duyệt chặn popup nếu gọi
// window.open() riêng cho từng tờ.
function buildTransshipMultiTicketPrintHtml(dataList) {
  const pagesHtml = dataList.map(d => `<div class="ticket-page">${buildTransshipTicketPageHtml(d)}</div>`).join('');
  const titleTicketNo = dataList.length ? dataList[0].ticketNo : '';
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
    <meta charset="UTF-8">
    <title>In Vé Trung Chuyển Huệ Nghĩa - ${titleTicketNo}${dataList.length > 1 ? ` (+${dataList.length - 1})` : ''}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>${TICKET_PRINT_STYLE}</style>
    </head>
    <body>
    ${pagesHtml}
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 400);
      };
    </script>
    </body>
    </html>
  `;
}

// In (các) vé trung chuyển đã chọn — mỗi khách/chặng 1 tờ vé riêng (vé lẻ), cùng kiểu dáng và cùng cách
// mở cửa sổ in tự động như vé lên xe bên role phòng vé (printTicketsSeparately()), thay vì bảng phiếu
// điều phối gộp nhiều khách hay modal xem trước trên trang như trước đây.
function tsPrintSelectedTickets() {
  if (tsSelectedTicketKeys.size === 0) return;
  const rows = Array.from(tsSelectedTicketKeys).map(tsFindRowByKey).filter(Boolean);
  if (!rows.length) return;

  const currentTrip = (typeof allTripsMeta !== 'undefined' && allTripsMeta.find((t) => t.id === currentTripId)) || {};
  const dataList = rows.map(r => tsBuildTransshipTicketData(r, currentTrip));
  const printHtml = buildTransshipMultiTicketPrintHtml(dataList);
  const printWin = window.open('', '_blank', 'width=450,height=600');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  }
}

function tsRenderTransshipStatusBadge(item, leg, hasAssignedDriver) {
  const noteField = leg === 'dropoff' ? 'transshipDropoffNote' : 'transshipPickupNote';
  const note = item[noteField] || '';
  const label = leg === 'dropoff'
    ? (item.paid ? 'Đã trả' : 'Chờ trả')
    : (hasAssignedDriver ? 'Đang đón' : 'Chờ đón');
  const statusClass = leg === 'dropoff'
    ? (item.paid ? 'done' : 'blue')
    : (hasAssignedDriver ? 'ongoing' : 'pending');
  const title = note ? note : 'Bấm để ghi chú trạng thái';
  return `<button type="button" class="ts-status-badge ${statusClass}${note ? ' has-note' : ''}" data-action="openTransshipStatusNoteModal" data-stop-propagation="1" data-args='${JSON.stringify([item.ticketNo || '', leg])}' title="${escapeHtml(title)}">${label}</button>`;
}

// Tìm lại đúng các ghế THẬT (không phải bản sao qua getAllBookedSeats()) theo ticketNo — cần sửa trực
// tiếp lên seatPlanDown/Up/extraLeftoverSeats thì lưu mới có tác dụng, sửa lên bản sao không lưu được gì.
// Trước tiên tìm ở phơi đang mở; không thấy thì quét toàn bộ tripSeatBank để bảng gộp trang "Trung
// chuyển" (gộp khách trung chuyển từ MỌI phơi) cũng ghi/sửa ghi chú trạng thái được như bảng rước liền.
function tsFindRealSeatsByTicket(ticketNo) {
  const cur = [...seatPlanDown, ...seatPlanUp, ...(extraLeftoverSeats || []), ...(subSeats || [])].filter(s => s.ticketNo === ticketNo);
  if (cur.length) return cur;
  const out = [];
  Object.keys(tripSeatBank || {}).forEach(tid => {
    const b = tripSeatBank[tid];
    if (!b) return;
    [...(b.down || []), ...(b.up || []), ...(b.extraSeats || []), ...(b.subSeats || [])].forEach(s => {
      if (s && s.ticketNo === ticketNo) out.push(s);
    });
  });
  return out;
}

let tsTransshipStatusNoteActive = null; // { ticketNo, leg }

function openTransshipStatusNoteModal(ticketNo, leg) {
  if (!ticketNo) return;
  const seats = tsFindRealSeatsByTicket(ticketNo);
  if (!seats.length) return;
  tsTransshipStatusNoteActive = { ticketNo, leg };
  const noteField = leg === 'dropoff' ? 'transshipDropoffNote' : 'transshipPickupNote';
  const input = document.getElementById('tsStatusNoteInput');
  if (input) input.value = seats[0][noteField] || '';
  const modal = document.getElementById('tsStatusNoteModal');
  if (modal) modal.classList.add('open');
}

function saveTransshipStatusNote() {
  if (!tsTransshipStatusNoteActive) return;
  const { ticketNo, leg } = tsTransshipStatusNoteActive;
  const noteField = leg === 'dropoff' ? 'transshipDropoffNote' : 'transshipPickupNote';
  const input = document.getElementById('tsStatusNoteInput');
  const value = input ? input.value.trim() : '';

  const realSeats = tsFindRealSeatsByTicket(ticketNo);
  const changed = realSeats.some(s => (s[noteField] || '') !== value);
  realSeats.forEach(s => { s[noteField] = value; });
  saveSeatBank();

  // Ghi chú cột "Phòng vé" của dòng khách trung chuyển vừa đổi — KHÔNG còn đẩy dòng lên đầu bảng gộp
  // trang "Trung chuyển" nữa, chỉ báo bằng dòng thông báo đỏ ở đầu bảng (tab "Tất cả", xem
  // pkNotifyPhongVeUpdate), giống hành vi của khách rước liền khi sửa ghi chú.
  if (changed && leg !== 'dropoff') pkNotifyPhongVeUpdate(realSeats[0] && realSeats[0].phone, pkTransshipRowKey(ticketNo));

  closeModal('tsStatusNoteModal');
  tsTransshipStatusNoteActive = null;
  renderTransshipTables();
  if (currentView === 'pickup') pkRenderPaxTable();
}

// ===== Filter kiểu Excel theo từng cột — 2 bảng "Trung chuyển đón"/"Trung chuyển trả" (zone3Transship) =====
// Mỗi cột lọc bằng cách CHỌN các giá trị muốn giữ lại (checkbox, y hệt Excel) thay vì gõ từ khoá/chọn 1
// giá trị — đúng tinh thần "filter kiểu Excel ở tiêu đề bảng" đã yêu cầu. State: tsColumnFilterState[table]
// là object { field: Set(giá trị được giữ) }; field KHÔNG có mặt trong object = không lọc (giữ tất cả).
// Chọn đủ hết mọi giá trị đang có (Áp dụng) coi như bỏ lọc luôn (xoá field khỏi state) — tránh giữ 1 Set
// "chọn hết" vô nghĩa mãi trong state.
let tsColumnFilterState = { pickup: {}, dropoff: {} };

// 2 danh sách khách ĐÃ TÍNH SẴN field (driverName/station/address/...) của lần render gần nhất — popover
// filter (tsOpenColumnFilter) đọc lại từ đây để biết "cột này đang có những giá trị nào" mà không phải
// tính lại từ đầu (tính 1 lần trong renderTransshipTables(), dùng chung cho cả lọc lẫn popover).
let tsLastPickupRows = [];
let tsLastDropoffRows = [];

// Cách lấy giá trị-để-lọc của 1 cột từ 1 dòng đã tính sẵn (object trả về bởi map() trong
// renderTransshipTables()) — DÙNG CHUNG cho việc lọc danh sách hiển thị lẫn việc liệt kê giá trị trong
// popover, tránh 2 nơi tính field lệch nhau. CHỈ cột "Trạm đi"/"Trạm đến" có filter (yêu cầu thu hẹp lại,
// các cột khác không cần) — object chỉ còn 1 field nhưng vẫn giữ dạng map để tsRowPassesColumnFilters/
// tsOpenColumnFilter dùng chung logic cho cả 2 bảng mà không cần rẽ nhánh riêng.
const TS_PICKUP_FIELD_VALUE = {
  station: r => r.station
};
const TS_DROPOFF_FIELD_VALUE = {
  station: r => r.station
};

// 1 dòng có "lọt" qua bộ lọc hiện tại của cả bảng hay không — true nếu MỌI cột đang có lọc đều chứa đúng
// giá trị của dòng đó (AND giữa các cột, giống Excel: lọc nhiều cột cùng lúc thì phải khớp hết).
function tsRowPassesColumnFilters(table, row, fieldValueMap) {
  const state = tsColumnFilterState[table];
  for (const field in state) {
    const allowed = state[field];
    if (allowed && !allowed.has(fieldValueMap[field](row))) return false;
  }
  return true;
}

// Bật/tắt style "đang lọc" (.ch-col-filter-btn.active, đỏ đậm) trên nút lọc mỗi cột — gọi lại mỗi lần
// render để luôn khớp đúng tsColumnFilterState hiện tại (kể cả khi lọc bị xoá bằng cách khác).
function tsUpdateColFilterButtonsActive(table) {
  const fields = table === 'pickup' ? Object.keys(TS_PICKUP_FIELD_VALUE) : Object.keys(TS_DROPOFF_FIELD_VALUE);
  fields.forEach(field => {
    const btn = document.getElementById(`tsColFilterBtn-${table}-${field}`);
    if (btn) btn.classList.toggle('active', !!tsColumnFilterState[table][field]);
  });
}

// ----- Popover filter dùng chung (#tsColFilterPopover) -----
let tsColFilterCtx = null; // { table, field, allValues, checkedSet } | null — cột đang mở popover

function tsOpenColumnFilter(table, field, btnEl) {
  const rows = table === 'pickup' ? tsLastPickupRows : tsLastDropoffRows;
  const valueFn = (table === 'pickup' ? TS_PICKUP_FIELD_VALUE : TS_DROPOFF_FIELD_VALUE)[field];
  const allValues = Array.from(new Set(rows.map(valueFn))).sort((a, b) => a.localeCompare(b, 'vi'));
  const currentAllowed = tsColumnFilterState[table][field]; // Set | undefined (undefined = đang giữ hết)

  tsColFilterCtx = {
    table, field, allValues,
    checkedSet: new Set(currentAllowed ? allValues.filter(v => currentAllowed.has(v)) : allValues)
  };

  const popover = document.getElementById('tsColFilterPopover');
  const search = document.getElementById('tsColFilterSearch');
  if (!popover || !search) return;
  search.value = '';
  tsRenderColFilterList('');

  const rect = btnEl.getBoundingClientRect();
  popover.style.display = 'block'; // hiện trước rồi mới đo offsetWidth (ẩn thì offsetWidth luôn = 0)
  const popW = popover.offsetWidth || 240;
  popover.style.top = (rect.bottom + 4) + 'px';
  popover.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - popW - 8)) + 'px';
  search.focus();
}

// Đổ lại danh sách checkbox trong popover — lọc theo ô tìm kiếm nội bộ (keyword, chỉ để dễ tìm giá trị
// giữa danh sách dài, KHÔNG đụng tới checkedSet) nên các giá trị bị ẩn tạm thời do đang gõ tìm vẫn giữ
// nguyên trạng thái tick/bỏ tick khi gõ xoá từ khoá để hiện lại.
function tsRenderColFilterList(keyword) {
  if (!tsColFilterCtx) return;
  const list = document.getElementById('tsColFilterList');
  if (!list) return;
  const kw = (keyword || '').toLowerCase();
  const values = kw ? tsColFilterCtx.allValues.filter(v => v.toLowerCase().includes(kw)) : tsColFilterCtx.allValues;
  list.innerHTML = values.length ? values.map(v => {
    const idx = tsColFilterCtx.allValues.indexOf(v);
    const checked = tsColFilterCtx.checkedSet.has(v);
    return `<label class="ch-popover-opt"><input type="checkbox" data-change-action="tsColFilterToggle" data-args='[${idx},"__this__"]' ${checked ? 'checked' : ''}><span>${escapeHtml(v)}</span></label>`;
  }).join('') : '<div style="padding:8px 4px;color:var(--text-sub);font-size:12.5px;">Không có giá trị phù hợp</div>';
}

function tsColFilterSearchInput(value) {
  tsRenderColFilterList(value);
}

function tsColFilterToggle(idx, checkboxEl) {
  if (!tsColFilterCtx) return;
  const value = tsColFilterCtx.allValues[idx];
  if (checkboxEl.checked) tsColFilterCtx.checkedSet.add(value);
  else tsColFilterCtx.checkedSet.delete(value);
}

function tsColFilterApply() {
  if (!tsColFilterCtx) return;
  const { table, field, allValues, checkedSet } = tsColFilterCtx;
  if (checkedSet.size >= allValues.length) {
    delete tsColumnFilterState[table][field]; // chọn hết = coi như không lọc, khỏi giữ Set thừa trong state
  } else {
    tsColumnFilterState[table][field] = new Set(checkedSet);
  }
  tsCloseColumnFilter();
  renderTransshipTables();
}

function tsColFilterClear() {
  if (!tsColFilterCtx) return;
  delete tsColumnFilterState[tsColFilterCtx.table][tsColFilterCtx.field];
  tsCloseColumnFilter();
  renderTransshipTables();
}

function tsCloseColumnFilter() {
  const popover = document.getElementById('tsColFilterPopover');
  if (popover) popover.style.display = 'none';
  tsColFilterCtx = null;
}

document.addEventListener('click', (e) => {
  if (!tsColFilterCtx) return;
  if (e.target.closest('#tsColFilterPopover') || e.target.closest('.ch-col-filter-btn')) return;
  tsCloseColumnFilter();
});

function renderTransshipTables() {
  const pickupBody = document.getElementById('transshipPickupBody');
  const dropoffBody = document.getElementById('transshipDropoffBody');
  const pickupCntEl = document.getElementById('transshipPickupCount');
  const dropoffCntEl = document.getElementById('transshipDropoffCount');
  const tabCntEl = document.getElementById('transshipTabCnt');

  // Cột checkbox + thanh nổi "In vé trung chuyển" CHỈ hiện cho role trung chuyển — gắn/gỡ class ngay
  // mỗi lần render để luôn khớp đúng role hiện tại (đăng nhập lại/đổi tab không cần load lại trang).
  const zone3Transship = document.getElementById('zone3Transship');
  if (zone3Transship) zone3Transship.classList.toggle('ts-dispatch-role', pkIsShuttleDispatchRole());

  const allBooked = getAllBookedSeats();
  const grouped = groupSeatsByTicket(allBooked);

  // Tài xế trung chuyển được gán ở trang shuttle.html, đọc lại qua HN_SHUTTLE_DRIVER_KEY (khoá theo
  // "sđt_don" — xem shuttleDriverLegKey() bên shuttle.js) để hiện đúng tên thay vì tên giả cố định.
  let shuttleDriverMap = ShuttleDriverService.getMap();

  const pickupList = grouped.filter(g => {
    const s = g.main;
    return s.guestType === 'Trung chuyển' || s.guestType === 'Rước liền' || s.guestType === 'Rước đường' || !!s.pickupAddress || !!s.transship;
  });

  const dropoffList = grouped.filter(g => {
    const s = g.main;
    return s.guestType === 'Trung chuyển' || !!s.dropoffAddress || !!s.arrivalTransfer;
  });

  // Thanh lọc select (Trạng thái / Địa chỉ đón / Địa chỉ trả) — đổ từ đúng giá trị đang có, áp cho cả
  // 2 bảng Đón/Trả. "Trạng thái" gộp nhãn của cả 2 bảng (Chờ đón/Đang đón + Chờ trả/Đã trả).
  const tsFVal = id => (document.getElementById(id) || {}).value || '';
  const tsPickupStatusOf = g => (shuttleDriverMap[`${(g.main.phone || '').replace(/\s+/g, '')}_don`] ? 'Đang đón' : 'Chờ đón');
  const tsDropoffStatusOf = g => (g.main.paid ? 'Đã trả' : 'Chờ trả');
  rsFillFilterSelect('tsFilterStatus', [...pickupList.map(tsPickupStatusOf), ...dropoffList.map(tsDropoffStatusOf)], 'Tất cả trạng thái');
  rsFillFilterSelect('tsFilterPickup', pickupList.map(g => g.main.firstStop || '—'), 'Tất cả địa chỉ đón');
  rsFillFilterSelect('tsFilterDropoff', dropoffList.map(g => g.main.lastStop || '—'), 'Tất cả địa chỉ trả');
  const tsFStatus = tsFVal('tsFilterStatus');
  const tsFPickup = tsFVal('tsFilterPickup');
  const tsFDropoff = tsFVal('tsFilterDropoff');

  if (pickupCntEl) pickupCntEl.textContent = `${pickupList.length} khách`;
  if (dropoffCntEl) dropoffCntEl.textContent = `${dropoffList.length} khách`;
  if (tabCntEl) tabCntEl.textContent = `(${pickupList.length} | ${dropoffList.length})`;

  // 2 bảng dưới đây dùng chung định dạng .pax-table với bảng "Hành khách" (cột Ghế theo kiểu SL:/VT:,
  // cột Ghi chú theo kiểu icon-chỉ-hiện-khi-có-nội-dung + escapeHtml, không in đậm tên/SĐT/tiền) để giao
  // diện nhất quán giữa các tab. escapeHtml() áp dụng cho mọi text tự do (tên tài xế/khách, địa chỉ, ghi
  // chú) vì đây đều là dữ liệu nhập tay — chèn thẳng vào title="..."/HTML mà không escape sẽ vỡ layout
  // giống lỗi từng gặp ở cột Ghi chú bảng Hành khách nếu text chứa dấu ngoặc kép/&/<.
  // Render Table 1: DANH SÁCH TRUNG CHUYỂN ĐÓN — tính sẵn mọi field cần cho cả hiển thị lẫn lọc (1 lần/
  // khách), dùng chung cho việc liệt kê giá trị trong popover filter kiểu Excel (tsOpenColumnFilter) lẫn
  // lọc theo tsColumnFilterState, tránh tính 2 lần/duplicate logic giữa 2 việc.
  if (pickupBody) {
    const pickupRows = pickupList.map(g => {
      const item = g.main;
      const driverKey = `${(item.phone || '').replace(/\s+/g, '')}_don`;
      const assignedDriver = shuttleDriverMap[driverKey];
      const driverName = assignedDriver ? assignedDriver.driverName : 'Chưa gán tài xế';
      const driverTooltip = assignedDriver
        ? `SĐT: ${assignedDriver.driverPhone || '—'} · Biển số: ${assignedDriver.driverPlate || '—'}${assignedDriver.driverVehicleType ? ' · ' + assignedDriver.driverVehicleType : ''}`
        : '';
      const driverCellHtml = assignedDriver
        ? `<span title="${escapeHtml(driverTooltip)}">${escapeHtml(assignedDriver.driverName)}</span>`
        : `<span class="ts-driver-unassigned">Chưa gán tài xế</span>`;
      // "Trạm đi" (station) KHÔNG còn là cột riêng — gộp hiển thị chung vào ô "Địa chỉ đón" (trạm chính ở
      // dòng đầu, địa chỉ cụ thể ở dòng phụ nhỏ hơn nếu khác trạm — xem addressHtml bên dưới) nhưng vẫn
      // giữ làm giá trị-để-lọc riêng cho nút lọc gắn trên header "Địa chỉ đón" (tsOpenColumnFilter).
      const station = item.firstStop || '—';
      const pickupLoc = item.pickupAddress || item.transship || item.transshipStation || item.firstStop || '—';
      const seatCodes = g.members ? g.members.map(s => s.code) : [item.code || '—'];
      const seatCount = g.members ? g.members.length : 1;
      const phone = item.phone || '—';
      const totalPrice = item.price ? (item.price * seatCount).toLocaleString('vi-VN') + 'đ' : '—';
      const note = seatNoteWithReason(item);
      const customerName = item.customerName || 'Khách';
      const statusLabel = assignedDriver ? 'Đang đón' : 'Chờ đón';
      const statusBadge = tsRenderTransshipStatusBadge(item, 'pickup', !!assignedDriver);
      const ticketKey = 'pickup:' + (item.ticketNo || ('T-' + item.code));
      return { item, driverName, driverCellHtml, station, pickupLoc, seatCodes, seatCount, phone, totalPrice, note, customerName, statusLabel, statusBadge, ticketKey };
    });

    tsLastPickupRows = pickupRows;
    const pickupRowsFiltered = pickupRows.filter(r =>
      (!tsFStatus || r.statusLabel === tsFStatus) &&
      (!tsFPickup || r.station === tsFPickup));

    if (pickupRowsFiltered.length === 0) {
      pickupBody.innerHTML = `<tr><td colspan="11" class="ts-empty">${pickupRows.length === 0 ? 'Không có hành khách cần trung chuyển đón trong chuyến này' : 'Không có khách nào khớp bộ lọc đang chọn'}</td></tr>`;
    } else {
      pickupBody.innerHTML = pickupRowsFiltered.map((r, idx) => {
        const noteSafe = escapeHtml(r.note);
        const noteHtml = r.note
          ? `<div class="pax-note-row"><svg class="pax-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="pax-note-clamp">${noteSafe}</span></div>`
          : `<span class="pax-note-empty">—</span>`;
        // "Địa chỉ đón" gộp cả trạm đi lẫn địa chỉ cụ thể: trạm ở dòng chính, địa chỉ cụ thể ở dòng phụ
        // nhỏ hơn (.ch-sub-address, y hệt pattern cột "Hành trình" trang Rước liền) — chỉ hiện dòng phụ
        // khi nó khác trạm (tránh lặp lại y hệt 1 chữ 2 lần khi khách không có địa chỉ cụ thể riêng).
        const addressHtml = (r.pickupLoc && r.pickupLoc !== r.station)
          ? `${escapeHtml(r.station)}<div class="ch-sub-address">${escapeHtml(r.pickupLoc)}</div>`
          : escapeHtml(r.station);
        return `
          <tr data-ticket="${escapeHtml(r.item.ticketNo || '')}">
            <td class="mono pax-col-stt">${idx + 1}</td>
            <td class="pax-col-driver">${r.driverCellHtml}</td>
            <td class="pax-col-address">${addressHtml}</td>
            <td class="pax-col-sl">${r.seatCount}</td>
            <td class="pax-col-vt">${escapeHtml(r.seatCodes.join(', '))}</td>
            <td class="pax-col-name">${escapeHtml(r.customerName)}</td>
            <td class="pax-col-phone">${escapeHtml(r.phone)}</td>
            <td class="pax-col-total">${r.totalPrice}</td>
            <td class="pax-col-status">${r.statusBadge}</td>
            <td class="pax-col-note" title="${noteSafe}">${noteHtml}</td>
            <td class="pax-col-check ts-check-col"><input type="checkbox" ${tsSelectedTicketKeys.has(r.ticketKey) ? 'checked' : ''} data-change-action="tsToggleRow" data-args='["${r.ticketKey}","__this__"]'></td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Table 2: DANH SÁCH TRUNG CHUYỂN TRẢ — cùng cách làm với bảng "đón" ở trên.
  if (dropoffBody) {
    const dropoffRows = dropoffList.map(g => {
      const item = g.main;
      // "Trạm đến" (station) KHÔNG còn là cột riêng — gộp hiển thị chung vào ô "Địa chỉ đón/trả" (trạm
      // chính ở dòng đầu, địa chỉ cụ thể ở dòng phụ nếu khác trạm) nhưng vẫn giữ làm giá trị-để-lọc riêng
      // cho nút lọc gắn trên header "Địa chỉ đón/trả" (tsOpenColumnFilter).
      const station = item.lastStop || '—';
      const dropoffLoc = item.dropoffAddress || item.arrivalTransfer || item.lastStop || '—';
      const seatCodes = g.members ? g.members.map(s => s.code) : [item.code || '—'];
      const seatCount = g.members ? g.members.length : 1;
      const phone = item.phone || '—';
      const totalPrice = item.price ? (item.price * seatCount).toLocaleString('vi-VN') + 'đ' : '—';
      const note = seatNoteWithReason(item);
      const customerName = item.customerName || 'Khách';
      const statusLabel = item.paid ? 'Đã trả' : 'Chờ trả';
      const statusBadge = tsRenderTransshipStatusBadge(item, 'dropoff');
      const ticketKey = 'dropoff:' + (item.ticketNo || ('T-' + item.code));
      return { item, station, dropoffLoc, seatCodes, seatCount, phone, totalPrice, note, customerName, statusLabel, statusBadge, ticketKey };
    });

    tsLastDropoffRows = dropoffRows;
    const dropoffRowsFiltered = dropoffRows.filter(r =>
      (!tsFStatus || r.statusLabel === tsFStatus) &&
      (!tsFDropoff || r.station === tsFDropoff));

    if (dropoffRowsFiltered.length === 0) {
      dropoffBody.innerHTML = `<tr><td colspan="10" class="ts-empty">${dropoffRows.length === 0 ? 'Không có hành khách cần trung chuyển trả trong chuyến này' : 'Không có khách nào khớp bộ lọc đang chọn'}</td></tr>`;
    } else {
      dropoffBody.innerHTML = dropoffRowsFiltered.map((r, idx) => {
        const noteSafe = escapeHtml(r.note);
        const noteHtml = r.note
          ? `<div class="pax-note-row"><svg class="pax-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="pax-note-clamp">${noteSafe}</span></div>`
          : `<span class="pax-note-empty">—</span>`;
        const addressHtml = (r.dropoffLoc && r.dropoffLoc !== r.station)
          ? `${escapeHtml(r.station)}<div class="ch-sub-address">${escapeHtml(r.dropoffLoc)}</div>`
          : escapeHtml(r.station);
        return `
          <tr data-ticket="${escapeHtml(r.item.ticketNo || '')}">
            <td class="mono pax-col-stt">${idx + 1}</td>
            <td class="pax-col-address">${addressHtml}</td>
            <td class="pax-col-sl">${r.seatCount}</td>
            <td class="pax-col-vt">${escapeHtml(r.seatCodes.join(', '))}</td>
            <td class="pax-col-name">${escapeHtml(r.customerName)}</td>
            <td class="pax-col-phone">${escapeHtml(r.phone)}</td>
            <td class="pax-col-total">${r.totalPrice}</td>
            <td class="pax-col-status">${r.statusBadge}</td>
            <td class="pax-col-note" title="${noteSafe}">${noteHtml}</td>
            <td class="pax-col-check ts-check-col"><input type="checkbox" ${tsSelectedTicketKeys.has(r.ticketKey) ? 'checked' : ''} data-change-action="tsToggleRow" data-args='["${r.ticketKey}","__this__"]'></td>
          </tr>
        `;
      }).join('');
    }
  }

  tsUpdatePrintActionBar();
}

function clearTransshipFilter() {
  ['tsFilterStatus', 'tsFilterPickup', 'tsFilterDropoff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderTransshipTables();
}

// "In danh sách" tab Trung chuyển — mở cửa sổ in 2 bảng Đón + Trả theo đúng bộ lọc đang xem, tự gọi
// window.print() (cùng quy ước với In danh sách tab Rước đường / In phơi).
function printTransshipList() {
  const grouped = groupSeatsByTicket(getAllBookedSeats());
  const drvMap = ShuttleDriverService.getMap();
  const fVal = id => (document.getElementById(id) || {}).value || '';
  const fStatus = fVal('tsFilterStatus'), fPickup = fVal('tsFilterPickup'), fDropoff = fVal('tsFilterDropoff');
  const esc = s => escapeHtml(String(s == null ? '' : s));

  const pickup = grouped
    .filter(g => { const s = g.main; return s.guestType === 'Trung chuyển' || s.guestType === 'Rước liền' || s.guestType === 'Rước đường' || !!s.pickupAddress || !!s.transship; })
    .map(g => {
      const it = g.main;
      const drv = drvMap[`${(it.phone || '').replace(/\s+/g, '')}_don`];
      return {
        station: it.firstStop || '—',
        loc: it.pickupAddress || it.transship || it.transshipStation || it.firstStop || '—',
        status: drv ? 'Đang đón' : 'Chờ đón',
        driver: drv ? drv.driverName : 'Chưa gán',
        name: it.customerName || 'Khách', phone: it.phone || '—',
        seats: (g.members ? g.members.map(s => s.code) : [it.code]).join(', '),
        count: g.members ? g.members.length : 1,
        total: it.price ? (it.price * (g.members ? g.members.length : 1)).toLocaleString('vi-VN') + 'đ' : '—',
        note: seatNoteWithReason(it)
      };
    })
    .filter(r => (!fStatus || r.status === fStatus) && (!fPickup || r.station === fPickup));

  const dropoff = grouped
    .filter(g => { const s = g.main; return s.guestType === 'Trung chuyển' || !!s.dropoffAddress || !!s.arrivalTransfer; })
    .map(g => {
      const it = g.main;
      return {
        station: it.lastStop || '—',
        loc: it.dropoffAddress || it.arrivalTransfer || it.lastStop || '—',
        status: it.paid ? 'Đã trả' : 'Chờ trả',
        name: it.customerName || 'Khách', phone: it.phone || '—',
        seats: (g.members ? g.members.map(s => s.code) : [it.code]).join(', '),
        count: g.members ? g.members.length : 1,
        total: it.price ? (it.price * (g.members ? g.members.length : 1)).toLocaleString('vi-VN') + 'đ' : '—',
        note: seatNoteWithReason(it)
      };
    })
    .filter(r => (!fStatus || r.status === fStatus) && (!fDropoff || r.station === fDropoff));

  if (!pickup.length && !dropoff.length) { showToast('Không có khách trung chuyển để in'); return; }

  const trip = (allTripsMeta && allTripsMeta.find(t => t.id === currentTripId)) || {};
  const pickupRows = pickup.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.driver)}</td><td>${esc(r.loc)}</td><td style="text-align:center;">${r.count}</td><td>${esc(r.seats)}</td><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td style="text-align:right;">${esc(r.total)}</td><td>${esc(r.status)}</td><td>${esc(r.note)}</td></tr>`).join('');
  const dropoffRows = dropoff.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.loc)}</td><td style="text-align:center;">${r.count}</td><td>${esc(r.seats)}</td><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td style="text-align:right;">${esc(r.total)}</td><td>${esc(r.status)}</td><td>${esc(r.note)}</td></tr>`).join('');

  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<title>Danh sách trung chuyển - ${esc(trip.route || currentTripId || '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, "Segoe UI", sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 18px 0 6px; }
  .meta { font-size: 13px; color: #333; margin-bottom: 6px; }
  .meta b { color: #000; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 6px; }
  th, td { border: 1px solid #999; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; }
  .empty { font-size: 12px; color: #666; }
  @media print { body { margin: 10mm; } }
</style></head><body>
  <h1>DANH SÁCH TRUNG CHUYỂN</h1>
  <div class="meta">Tuyến: <b>${esc(trip.route || '—')}</b> &nbsp;|&nbsp; Giờ: <b>${esc(trip.time || '—')}</b> &nbsp;|&nbsp; Ngày: <b>${esc(trip.date || '—')}</b> &nbsp;|&nbsp; Xe: <b>${esc(trip.plate || '—')}</b></div>
  <h2>TRUNG CHUYỂN ĐÓN (${pickup.length})</h2>
  ${pickup.length ? `<table><thead><tr><th>STT</th><th>Tài xế</th><th>Địa chỉ đón</th><th>SL</th><th>Số ghế</th><th>Họ và tên</th><th>SĐT</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>${pickupRows}</tbody></table>` : '<p class="empty">Không có khách.</p>'}
  <h2>TRUNG CHUYỂN TRẢ (${dropoff.length})</h2>
  ${dropoff.length ? `<table><thead><tr><th>STT</th><th>Địa chỉ đón/trả</th><th>SL</th><th>Số ghế</th><th>Họ và tên</th><th>SĐT</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>${dropoffRows}</tbody></table>` : '<p class="empty">Không có khách.</p>'}
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=980,height=680');
  if (win) { win.document.open(); win.document.write(html); win.document.close(); }
  else showToast('Trình duyệt đã chặn cửa sổ in — vui lòng cho phép popup');
}

document.addEventListener('click', function (e) {
  const wrap = document.querySelector('.pax-filter-wrap');
  if (wrap && !wrap.contains(e.target)) { const dd = document.getElementById('paxFilterDropdown'); if (dd) dd.classList.remove('open'); }
});

// ===== Tab "Rước đường" (Zone 2) — danh sách khách guestType='Rước đường' của chuyến đang mở =====
// Cột theo đúng "Danh sách rước đường" ở phơi in (printManifestView): STT, Họ tên, SĐT, Trạm đi, Trạm
// đến, Điểm rước, SL, Số ghế, Thành tiền, Trạng thái (Đã thu/Còn nợ), Ghi chú.
// Bộ lọc: Hướng / Điểm rước / Trạm đi / Trạm đến / Thanh toán — mỗi <select> đổ từ đúng các giá trị
// distinct đang có trong danh sách, giữ nguyên lựa chọn hiện tại khi render lại.

function getRoadsideRows() {
  const grouped = groupSeatsByTicket(getAllBookedSeats());
  return grouped
    .filter(g => g.main.guestType === 'Rước đường')
    .map(g => {
      const item = g.main;
      const seatCodes = g.members ? g.members.map(s => s.code) : [item.code || '—'];
      const seatCount = seatCodes.length;
      const pickupLoc = item.pickupAddress || item.transship || item.transshipStation || '—';
      return {
        item,
        name: item.customerName || 'Khách',
        phone: item.phone || '—',
        firstStop: item.firstStop || '—',
        lastStop: item.lastStop || '—',
        pickupLoc,
        seatCodes,
        seatCount,
        amount: (item.price || 0) * seatCount,
        paid: !!item.paid,
        note: seatNoteWithReason(item)
      };
    });
}

// Đổ 1 <select> lọc từ tập giá trị distinct, giữ lựa chọn hiện tại nếu vẫn còn trong tập mới.
function rsFillFilterSelect(id, values, allLabel) {
  const el = document.getElementById(id);
  if (!el) return;
  const prev = el.value;
  const uniq = Array.from(new Set(values.filter(v => v && v !== '—'))).sort((a, b) => a.localeCompare(b, 'vi'));
  el.innerHTML = `<option value="">${allLabel}</option>` +
    uniq.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  el.value = uniq.indexOf(prev) !== -1 ? prev : '';
}

function rsCurrentFilters() {
  const val = id => (document.getElementById(id) || {}).value || '';
  return { pickup: val('rsFilterPickup'), first: val('rsFilterFirstStop'), last: val('rsFilterLastStop'), paid: val('rsFilterPaid') };
}

function rsApplyFilters(rows, f) {
  return rows.filter(r =>
    (!f.pickup || r.pickupLoc === f.pickup) &&
    (!f.first || r.firstStop === f.first) &&
    (!f.last || r.lastStop === f.last) &&
    (!f.paid || (f.paid === 'paid' ? r.paid : !r.paid))
  );
}

function renderRoadsideTable() {
  const tbody = document.getElementById('roadsideTableBody');
  const rows = getRoadsideRows();

  rsFillFilterSelect('rsFilterPickup', rows.map(r => r.pickupLoc), 'Tất cả điểm rước');
  rsFillFilterSelect('rsFilterFirstStop', rows.map(r => r.firstStop), 'Tất cả trạm đi');
  rsFillFilterSelect('rsFilterLastStop', rows.map(r => r.lastStop), 'Tất cả trạm đến');

  const filtered = rsApplyFilters(rows, rsCurrentFilters());

  updateRoadsideTabCount(rows.length);

  if (!tbody) return;
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="ts-empty">${rows.length === 0 ? 'Không có khách rước đường trong chuyến này' : 'Không có khách nào khớp bộ lọc đang chọn'}</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((r, idx) => {
    const noteSafe = escapeHtml(r.note);
    const noteHtml = r.note
      ? `<div class="pax-note-row"><svg class="pax-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="pax-note-clamp">${noteSafe}</span></div>`
      : `<span class="pax-note-empty">—</span>`;
    return `
      <tr>
        <td class="mono pax-col-stt">${idx + 1}</td>
        <td class="pax-col-name">${escapeHtml(r.name)}</td>
        <td class="pax-col-phone">${escapeHtml(r.phone)}</td>
        <td class="pax-col-stop">${escapeHtml(r.firstStop)}</td>
        <td class="pax-col-stop">${escapeHtml(r.lastStop)}</td>
        <td class="pax-col-pickup">${escapeHtml(r.pickupLoc)}</td>
        <td class="pax-col-sl">${r.seatCount}</td>
        <td class="pax-col-vt">${escapeHtml(r.seatCodes.join(', '))}</td>
        <td class="pax-col-total">${r.amount ? r.amount.toLocaleString('vi-VN') + 'đ' : '—'}</td>
        <td class="pax-col-paid"><span class="ts-status-badge ${r.paid ? 'ongoing' : 'blue'}">${r.paid ? 'Đã thu' : 'Còn nợ'}</span></td>
        <td class="pax-col-note" title="${noteSafe}">${noteHtml}</td>
      </tr>`;
  }).join('');
}

function updateRoadsideTabCount(n) {
  const el = document.getElementById('roadsideTabCnt');
  if (!el) return;
  const count = typeof n === 'number'
    ? n
    : groupSeatsByTicket(getAllBookedSeats()).filter(g => g.main.guestType === 'Rước đường').length;
  el.textContent = `(${count})`;
}

function clearRoadsideFilter() {
  ['rsFilterPickup', 'rsFilterFirstStop', 'rsFilterLastStop', 'rsFilterPaid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderRoadsideTable();
}

// "In danh sách" — mở cửa sổ mới với đúng danh sách đang xem (đã áp bộ lọc) + tự gọi window.print(),
// cùng quy ước với nút "In phơi" (printManifestView) và in vé lẻ (printTicketsSeparately).
function printRoadsideList() {
  const list = rsApplyFilters(getRoadsideRows(), rsCurrentFilters());
  if (!list.length) { showToast('Không có khách rước đường để in'); return; }

  const trip = (allTripsMeta && allTripsMeta.find(t => t.id === currentTripId)) || {};
  const esc = s => escapeHtml(String(s == null ? '' : s));
  const totalAmount = list.reduce((s, r) => s + (r.amount || 0), 0);
  const totalPax = list.reduce((s, r) => s + r.seatCount, 0);
  const bodyRows = list.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.phone)}</td>
      <td>${esc(r.firstStop)}</td>
      <td>${esc(r.lastStop)}</td>
      <td>${esc(r.pickupLoc)}</td>
      <td style="text-align:center;">${r.seatCount}</td>
      <td>${esc(r.seatCodes.join(', '))}</td>
      <td style="text-align:right;">${r.amount ? r.amount.toLocaleString('vi-VN') + 'đ' : '—'}</td>
      <td>${r.paid ? 'Đã thu' : 'Còn nợ'}</td>
      <td>${esc(r.note)}</td>
    </tr>`).join('');

  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<title>Danh sách rước đường - ${esc(trip.route || currentTripId || '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, "Segoe UI", sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 13px; color: #333; margin-bottom: 14px; }
  .meta b { color: #000; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #999; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; }
  tfoot td { font-weight: bold; background: #fafafa; }
  @media print { body { margin: 10mm; } }
</style></head><body>
  <h1>DANH SÁCH KHÁCH RƯỚC ĐƯỜNG</h1>
  <div class="meta">
    Tuyến: <b>${esc(trip.route || '—')}</b> &nbsp;|&nbsp; Giờ: <b>${esc(trip.time || '—')}</b>
    &nbsp;|&nbsp; Ngày: <b>${esc(trip.date || '—')}</b> &nbsp;|&nbsp; Xe: <b>${esc(trip.plate || '—')}</b>
    &nbsp;|&nbsp; Tài xế: <b>${esc(trip.driver || '—')}</b>
  </div>
  <table>
    <thead><tr>
      <th>STT</th><th>Họ và tên</th><th>SĐT</th><th>Trạm đi</th><th>Trạm đến</th><th>Điểm rước</th>
      <th>SL</th><th>Số ghế</th><th>Thành tiền</th><th>Trạng thái</th><th>Ghi chú</th>
    </tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr>
      <td colspan="6" style="text-align:right;">Tổng</td>
      <td style="text-align:center;">${totalPax}</td>
      <td></td>
      <td style="text-align:right;">${totalAmount.toLocaleString('vi-VN')}đ</td>
      <td colspan="2"></td>
    </tr></tfoot>
  </table>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=650');
  if (win) { win.document.open(); win.document.write(html); win.document.close(); }
  else showToast('Trình duyệt đã chặn cửa sổ in — vui lòng cho phép popup');
}

function getAllBookedSeats() {
  return [...seatPlanDown.map(s => ({ ...s, floor: 'down' })), ...seatPlanUp.map(s => ({ ...s, floor: 'up' })), ...extraLeftoverSeats.map(s => ({ ...s, floor: 'extra' })), ...subSeats.map(s => ({ ...s, floor: 'sub' }))]
    .filter(s => ['sold', 'hold', 'free', 'cargo'].includes(s.state));
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

function renderPassengerList() {
  // Thanh lọc select (giống tab Rước đường): Trạm đi / Trạm đến / Thanh toán. Lọc theo VÉ (nhóm ghế
  // cùng ticketNo) chứ không theo từng ghế — đổ danh sách trạm từ đúng các giá trị đang có.
  const allGroups = groupSeatsByTicket(getAllBookedSeats());
  rsFillFilterSelect('pxFilterFirstStop', allGroups.map(g => g.main.firstStop), 'Tất cả trạm đi');
  rsFillFilterSelect('pxFilterLastStop', allGroups.map(g => g.main.lastStop), 'Tất cả trạm đến');

  const fVal = id => (document.getElementById(id) || {}).value || '';
  const fFirst = fVal('pxFilterFirstStop');
  const fLast = fVal('pxFilterLastStop');
  const fPaid = fVal('pxFilterPaid');

  const groups = allGroups.filter(g => {
    const s = g.main;
    if (fFirst && (s.firstStop || '') !== fFirst) return false;
    if (fLast && (s.lastStop || '') !== fLast) return false;
    if (fPaid) {
      const isPaid = !!s.paid && s.state !== 'free';
      if (fPaid === 'paid' ? !isPaid : isPaid) return false;
    }
    return true;
  });
  const tbody = document.getElementById('paxTableBody');
  if (tbody) {
    if (groups.length === 0) {
      tbody.innerHTML = '<tr class="pax-empty-row"><td colspan="10">Không có hành khách phù hợp bộ lọc</td></tr>';
    } else {
      tbody.innerHTML = groups.map((g, index) => {
        const s = g.main;
        const count = g.members.length;
        const seatCodes = g.members.map(m => m.code);
        // Vé giá 0đ (qua ô "Lý do giá 0đ") cũng tính là vé miễn phí như ghế trạng thái 'free', không
        // riêng gì ghế state==='free' — cả 2 trường hợp đều không có gì để thu/nợ.
        const isFree = s.state === 'free' || s.price === 0;
        const totalPrice = s.price * count;
        // Đã cọc (seat.depositAmount) lưu 1 lần cho cả nhóm vé (không nhân theo count) — xem giải
        // thích ở applyFormToSeat lúc lưu vé. Vé đã "Bán" (paid) thì đã thu đủ, không còn cọc dở dang.
        const daThuAmount = isFree ? 0 : (s.paid ? totalPrice : Math.min(s.depositAmount || 0, totalPrice));
        const conNoAmount = isFree ? 0 : (totalPrice - daThuAmount);
        const { firstStopHtml, lastStopHtml } = getHistoryStopsDisplay(s);
        const note = seatNoteWithReason(s);

        const daThuText = isFree ? 'Miễn phí' : (daThuAmount > 0 ? daThuAmount.toLocaleString('vi-VN') + 'đ' : '—');
        const conNoText = isFree ? 'Miễn phí' : (conNoAmount > 0 ? conNoAmount.toLocaleString('vi-VN') + 'đ' : '—');

        const luggageHtml = s.hasLuggage
          ? `<span class="pax-luggage-mark" title="Có hành lý ký gửi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg></span>`
          : `<span class="pax-luggage-empty">—</span>`;

        // Ghi chú do nhân viên nhập tay có thể chứa dấu ngoặc kép/&/< — phải escapeHtml() trước khi chèn,
        // nếu không sẽ phá vỡ thuộc tính title="..." hoặc bị hiểu nhầm thành thẻ HTML, làm lệch cả hàng.
        const noteSafe = escapeHtml(note);
        const noteHtml = note
          ? `<div class="pax-note-row"><svg class="pax-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="pax-note-clamp">${noteSafe}</span></div>`
          : `<span class="pax-note-empty">—</span>`;

        return `
        <tr data-action="fillSearchInputWithPhone" data-args='${JSON.stringify([s.phone])}' style="cursor:pointer;">
          <td class="mono pax-col-stt">${index + 1}</td>
          <td class="pax-col-name">${s.customerName || '—'}</td>
          <td class="pax-col-phone">${s.phone || '—'}</td>
          <td class="pax-col-route">
            <div class="pax-route">
              <div class="pax-route-row pax-route-from">
                <svg class="pax-route-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
                <div class="pax-route-text">${firstStopHtml}</div>
              </div>
              <div class="pax-route-connector"></div>
              <div class="pax-route-row pax-route-to">
                <svg class="pax-route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                <div class="pax-route-text">${lastStopHtml}</div>
              </div>
            </div>
          </td>
          <td class="pax-col-sl">${count}</td>
          <td class="pax-col-vt">${seatCodes.join(', ')}</td>
          <td class="pax-col-paid">${daThuText}</td>
          <td class="pax-col-debt">${conNoText}</td>
          <td class="pax-col-luggage">${luggageHtml}</td>
          <td class="pax-col-note" title="${noteSafe}">${noteHtml}</td>
        </tr>
        `;
      }).join('');
    }
  }

  const countBadge = document.getElementById('paxCountBadge');
  if (countBadge) countBadge.textContent = `${groups.length} khách`;
}

// Gom ghế theo ticketNo 1 lần duy nhất cho cả lượt render (renderSeats() gọi 1 lần, truyền map vào
// seatCard() cho từng ghế) thay vì mỗi ghế tự quét lại toàn bộ seatPlanDown+seatPlanUp — tránh O(n²)
// khi xe có nhiều ghế (~44-47 ghế → tới ~2000 lượt so sánh dư thừa mỗi lần render trước khi sửa).
function buildTicketGroupMap() {
  const map = new Map();
  [...seatPlanDown, ...seatPlanUp, ...subSeats].forEach(s => {
    if (!s.ticketNo) return;
    if (!map.has(s.ticketNo)) map.set(s.ticketNo, []);
    map.get(s.ticketNo).push(s);
  });
  return map;
}

function seatCard(seat, ticketGroupMap, isNarrow) {
  if (seat.state === 'hidden') {
    return `<div class="seat-card hidden-placeholder"></div>`;
  }
  const stateClass = seat.locked ? "locked" : seat.state;
  const lockHtml = seat.locked ? `<div class="lock-tag"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>${seat.lockedBy || 'Đang giữ'}</div>` : "";
  const isEmpty = seat.state === "empty";
  const isCancelable = ["sold", "hold", "free", "cargo"].includes(seat.state);
  const footLabel = isEmpty ? "ĐẶT VÉ" : "KDV - CHÂU ĐỐC";
  const footHoverLabel = seat.state === 'sold' ? "THÔNG TIN" : "CHỈNH SỬA";
  const cancelTag = isCancelable
    ? `<button type="button" class="seat-cancel-tag" data-action="openCancelModal" data-stop-propagation="1" data-args='${JSON.stringify([seat.code])}'>Hủy</button>`
    : "";
  // Vé sửa giá còn 0đ (qua "Lý do giá 0đ") hiện y hệt kiểu ghế 'free' (nền/viền xám, "Miễn phí")
  // dù seat.state thật vẫn là hold/sold/cargo — không đổi seat.state để không ảnh hưởng logic khác
  // (đếm ghế đã bán, filter, thống kê...), chỉ đổi lớp CSS hiển thị cho riêng thẻ ghế này.
  const isFreeDisplay = !isEmpty && !seat.locked && (seat.state === 'free' || seat.price === 0);
  const cardStateClass = isFreeDisplay ? 'free' : stateClass;
  const priceHtml = isEmpty ? `<div class="seat-price-tag"></div>` : (isFreeDisplay ? `<div class="seat-price-tag">Miễn phí</div>` : `<div class="seat-price-tag">${seat.price.toLocaleString('vi-VN')}đ</div>`);
  const depositHtml = (!isEmpty && seat.depositAmount) ? `<div class="seat-deposit-tag" title="Đã cọc ${seat.depositAmount.toLocaleString('vi-VN')}đ (${seat.depositMethod || 'Tiền mặt'})">Cọc: ${seat.depositAmount.toLocaleString('vi-VN')}đ</div>` : '';

  // Group booking badge logic
  let groupLabelHtml = "";
  if (!isEmpty && seat.ticketNo) {
    const groupSeats = (ticketGroupMap || buildTicketGroupMap()).get(seat.ticketNo) || [];
    if (groupSeats.length > 1) {
      const sortedGroup = [...groupSeats].sort((a, b) => a.code.localeCompare(b.code));
      const groupName = sortedGroup.map(s => s.code).join('-');
      groupLabelHtml = `<div class="seat-line" style="margin-bottom:2px;" title="Ghế đi chung: ${groupName}"><span class="group-badge" style="font-size:10.5px; font-weight:800; color:var(--red); background:var(--red-light); padding:1px 5px; border-radius:4px; display:inline-block; border:1px solid rgba(245,16,11,0.25); white-space:nowrap; vertical-align:middle;">C: ${groupName}</span></div>`;
    }
  }

  const firstStopShort = shortenStopName(seat.firstStop) || '—';
  const lastStopShort = shortenStopName(seat.lastStop) || '—';
  const routeStr = `${firstStopShort} → ${lastStopShort}`;

  const textColor = 'color:var(--black);';
  const displayRoute = isEmpty ? '—' : routeStr;
  const displayFirst = isEmpty ? '—' : firstStopShort;
  const displayLast = isEmpty ? '—' : lastStopShort;
  const custName = isEmpty ? '—' : (seat.customerName || '—');
  const custPhone = isEmpty ? '—' : (seat.phone || '—');
  const noteStr = isEmpty ? (seat.note || '—') : (seatNoteWithReason(seat) || '—');

  const pickupTransferAddr = !isEmpty && seat.transshipStation ? seat.transshipStation : '';
  const dropoffTransferAddr = !isEmpty && seat.arrivalTransfer ? seat.arrivalTransfer : '';
  const firstTitle = pickupTransferAddr ? `Trung chuyển đón: ${pickupTransferAddr}` : displayFirst;
  const lastTitle = dropoffTransferAddr ? `Trung chuyển trả: ${dropoffTransferAddr}` : displayLast;
  const routeTitle = (pickupTransferAddr || dropoffTransferAddr)
    ? `Đón: ${pickupTransferAddr || displayFirst} • Trả: ${dropoffTransferAddr || displayLast}`
    : displayRoute;

  const linesHtml = `
    ${isEmpty ? '' : groupLabelHtml}
    <div class="seat-line route-single-line"><span class="seat-label-full">Chặng đi: </span><span class="seat-stop" title="${routeTitle}">${displayRoute}</span></div>
    <div class="route-split-line">
      <div class="route-split-row"><span class="route-split-label">Đi:</span><span class="seat-stop" title="${firstTitle}">${displayFirst}</span></div>
      <div class="route-split-row"><span class="route-split-label">Đến:</span><span class="seat-stop" title="${lastTitle}">${displayLast}</span></div>
    </div>
    <div class="seat-line" style="${textColor}">KH: ${custName}</div>
    <div class="seat-line" style="${textColor}">SĐT: ${custPhone}</div>
    <div class="seat-note" title="${noteStr}"><span class="seat-label-full">Ghi chú: </span><span class="seat-label-short">GC: </span>${noteStr}</div>
  `;

  const guestTagHtml = isEmpty ? '' : guestTypeTagHtml(seat.guestType);

  // Card đủ rộng (layout 2 cột mặc định) -> giữ nguyên kiểu cũ: tag loại khách đi cùng hàng với mã ghế,
  // cọc+giá+nút Hủy gộp chung 1 cụm ở góc phải.
  // Card hẹp (layout 3 cột, xe ~34+ chỗ trở lên) -> cụm cọc+giá+Hủy gộp chung dễ tràn ra ngoài thẻ, nên
  // tách riêng: hàng 1 chỉ còn mã ghế (trái) + giá/Hủy (phải, luôn cố định góc phải); hàng 2 (bên dưới)
  // là tag loại khách (trái) + cọc (phải, thẳng lề với giá ở hàng trên).
  const topHtml = isNarrow
    ? `<div class="seat-top">
      <div class="seat-code">${seat.code}</div>
      <div class="seat-top-right">${priceHtml}${cancelTag}</div>
    </div>
    ${(guestTagHtml || depositHtml) ? `<div class="seat-second-row"><div class="seat-second-row-left">${guestTagHtml}</div><div class="seat-second-row-right">${depositHtml}</div></div>` : ''}`
    : `<div class="seat-top">
      <div>
        <div class="seat-code" style="display:inline-block; vertical-align:middle;">${seat.code}</div>${guestTagHtml}
      </div>
      <div class="seat-top-right">${depositHtml}${priceHtml}${cancelTag}</div>
    </div>`;

  return `
  <div class="seat-card ${cardStateClass}" data-code="${seat.code}" data-action="onSeatClick" data-args='${JSON.stringify(["__event__", seat.code])}'>
    ${lockHtml}
    ${topHtml}
    ${linesHtml}
    <button class="seat-footbtn" type="button" data-action="seatFootBtnClick" data-stop-propagation="1" data-seat-code="${seat.code}" data-edit-mode="${isEmpty ? '0' : '1'}"><span class="foot-text-normal">${footLabel}</span><span class="foot-text-hover">${footHoverLabel}</span></button>
  </div>`;
}

function renderSeats() {
  const totalSeats = [...seatPlanDown, ...seatPlanUp].filter(s => s.state !== 'hidden').length;
  const useThreeCols = totalSeats >= 34;

  const floorDownEl = document.getElementById('floorDown');
  const floorUpEl = document.getElementById('floorUp');
  const ticketGroupMap = buildTicketGroupMap();

  if (floorDownEl) {
    floorDownEl.classList.toggle('cols-3', useThreeCols);
    floorDownEl.innerHTML = seatPlanDown.map(s => seatCard(s, ticketGroupMap, useThreeCols)).join('');
  }
  if (floorUpEl) {
    floorUpEl.classList.toggle('cols-3', useThreeCols);
    floorUpEl.innerHTML = seatPlanUp.map(s => seatCard(s, ticketGroupMap, useThreeCols)).join('');
  }

  updatePassengerTabCount();
  updateTripStats();
  renderSubSeats();

  if (typeof isSyncingFromStorage !== 'undefined' && !isSyncingFromStorage) {
    saveSeatBank();
  }
}
// ===== Zone 2: Vehicle Header & Stats =====

// Cập nhật số liệu thống kê (Đã bán, Đã đặt, Doanh thu, Thu/Nợ)
function updateTripStats() {
  const allSeats = [...seatPlanDown, ...seatPlanUp];
  const totalSeats = allSeats.filter(s => s.state !== 'hidden').length + subSeats.length;
  // Ghế phụ giờ cũng có trạng thái 'empty' (ô trống chưa bán, xem addEmptySubSeat) nên phải lọc theo
  // cùng điều kiện với ghế thường thay vì gộp thẳng toàn bộ subSeats vào "đã đặt" như trước (lúc đó mọi
  // ghế phụ đều là đã bán, không có khái niệm ghế phụ trống).
  const bookedSeats = allSeats.concat(subSeats).filter(s => ['sold', 'hold', 'free', 'cargo'].includes(s.state));
  const soldSeats = bookedSeats.filter(s => s.state === 'sold');

  let totalRevenue = 0, paidRevenue = 0, unpaidRevenue = 0;
  bookedSeats.forEach(s => {
    if (s.state === 'free') return;
    const price = s.price || 280000;
    totalRevenue += price;
    if (s.paid) {
      paidRevenue += price;
    } else {
      // Vé chưa "Bán" nhưng có cọc (seat.depositAmount) thì tính đúng phần đã thu là số tiền cọc,
      // phần còn lại (giá vé - cọc) mới là chưa thu — không tính cả giá vé là chưa thu như trước.
      const deposit = Math.min(s.depositAmount || 0, price);
      paidRevenue += deposit;
      unpaidRevenue += price - deposit;
    }
  });

  const fmt = val => val.toLocaleString('vi-VN') + 'đ';
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setTxt('statsDaBan', `${soldSeats.length}/${totalSeats}`);
  setTxt('statsDaDat', `${bookedSeats.length}/${totalSeats}`);
  setTxt('statsTongTien', fmt(totalRevenue));
  setTxt('statsDaThu', fmt(paidRevenue));
  setTxt('statsChuaThu', fmt(unpaidRevenue));

  const numEl = document.querySelector('.trip-card.selected .trip-nums .n1');
  if (numEl) numEl.textContent = `${bookedSeats.length}/${totalSeats}`;
}
renderSeats();
renderExtraSeats();
renderSubSeats();
renderCancelledSeats();
updateCancelledTabCount();
renderZone1TripList();
if (typeof populateDirectionFilter === 'function') populateDirectionFilter();
if (typeof populateStationPickers === 'function') populateStationPickers();
// Dựng sẵn 4 mục cho combobox "Hướng đi" Zone 1 (HTML để rỗng) — khỏi phụ thuộc lần focus đầu.
if (typeof renderDirectionOptions === 'function') renderDirectionOptions('');
if (typeof renderRouteOptions === 'function') renderRouteOptions('');

function setZone1Collapsed(collapsed) {
  document.body.classList.toggle('zone1-collapsed', collapsed);
  const btn = document.getElementById('zone1ToggleBtn');
  if (btn) {
    const label = collapsed ? 'Hiện zone 1' : 'Ẩn zone 1';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }
  try { localStorage.setItem(ZONE1_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (e) { }
}

function toggleZone2Grid() {
  const zone2 = document.querySelector('.zone2');
  const btn = document.querySelector('.z2-collapse-btn');
  if (!zone2 || !btn) return;
  const isCollapsed = zone2.classList.toggle('collapsed');
  const text = btn.querySelector('.collapse-text');
  const svg = btn.querySelector('svg');
  if (text) text.textContent = isCollapsed ? 'Mở rộng' : 'Thu gọn';
  btn.title = (isCollapsed ? 'Mở rộng' : 'Thu gọn') + ' thông tin xe';
  if (svg) svg.style.transform = isCollapsed ? 'rotate(180deg)' : 'none';
}

try {
  setZone1Collapsed(localStorage.getItem(ZONE1_COLLAPSED_KEY) === '1');
} catch (e) { }

// ===== Seat Selection & Transfer =====

// Xử lý sự kiện nhấp chuột chọn ghế trên sơ đồ
function onSeatClick(ev, code) {
  if (ev.detail > 1) { return; }
  const seat = findSeat(code);
  if (seat && seat.phone) {
    fillSearchInputWithPhone(seat.phone);
  }
  if (seat.locked) { showToast(`Ghế ${code} đang được ${seat.lockedBy} thao tác`); return; }

  // Ghế dư (extraLeftoverSeats) dùng chung luồng "chuyển ghế" (chọn nguồn -> chọn ghế trống bất kỳ,
  // kể cả sang phơi khác) với ghế thường thay vì mở riêng modal — cùng nhánh OCCUPIED_STATES bên dưới,
  // vì ghế dư luôn ở 1 trong các trạng thái sold/hold/free/cargo giống ghế thường.
  if (!multiSelectMode && OCCUPIED_STATES.includes(seat.state)) {
    multiSelectMode = true;
    selectionMode = 'transfer';
    selectedSourceSeats = [seat.code];
    selectedTargetSeats = [];
    transferSourceTripId = currentTripId;
    transferTargetTripId = currentTripId;
    document.querySelectorAll('.seat-card').forEach(c => { c.style.outline = 'none'; });
    const card = ev.target.closest('.seat-card');
    card.style.outline = '2px solid var(--red)';
    card.style.outlineOffset = '1px';
    card.style.boxShadow = 'none';
    updateTransferHint();
    showToast(`Đã kích hoạt chọn ghế từ ${seat.code}. Có thể chọn chuyến khác ở Zone 1 để chuyển sang.`);
    ev.stopPropagation();
    return;
  }

  if (!multiSelectMode && seat.state === 'empty') {
    multiSelectMode = true;
    selectionMode = 'group';
    selectedSourceSeats = [];
    selectedTargetSeats = [seat.code];
    document.querySelectorAll('.seat-card').forEach(c => { c.style.outline = 'none'; c.style.boxShadow = 'none'; });
    const card = ev.target.closest('.seat-card');
    card.style.outline = '2px solid var(--red)';
    card.style.outlineOffset = '1px';
    card.style.boxShadow = 'none';
    updateTransferHint();
    showToast(`Đã kích hoạt đặt vé nhóm từ ghế ${seat.code}`);
    ev.stopPropagation();
    return;
  }

  if (multiSelectMode) {
    const card = ev.target.closest('.seat-card');
    if (selectionMode === 'transfer' && OCCUPIED_STATES.includes(seat.state)) {
      if (currentTripId !== transferSourceTripId) {
        showToast('Vui lòng quay lại chuyến ban đầu để chọn thêm ghế nguồn');
        return;
      }
      const idx = selectedSourceSeats.indexOf(code);
      if (idx > -1) { selectedSourceSeats.splice(idx, 1); card.style.outline = 'none'; card.style.boxShadow = 'none'; }
      else { selectedSourceSeats.push(code); card.style.outline = '2px solid var(--red)'; card.style.outlineOffset = '1px'; card.style.boxShadow = 'none'; }
      if (selectedSourceSeats.length === 0 && selectedTargetSeats.length === 0) { exitMultiSelectMode(); return; }
      updateTransferHint();
      return;
    }

    if (seat.state === 'empty') {
      const idx = selectedTargetSeats.indexOf(code);
      if (idx > -1) { selectedTargetSeats.splice(idx, 1); card.style.outline = 'none'; card.style.boxShadow = 'none'; }
      else { selectedTargetSeats.push(code); card.style.outline = '2px solid var(--red)'; card.style.outlineOffset = '1px'; card.style.boxShadow = 'none'; }
      if (selectedSourceSeats.length === 0 && selectedTargetSeats.length === 0) { exitMultiSelectMode(); return; }
      updateTransferHint();
      return;
    }

    showToast('Chỉ có thể chọn ghế đã đặt làm nguồn và ghế trống làm đích');
    return;
  }

  if (seat.state === 'empty') {
    openBookingPanel([seat]);
  } else {
    openSeatMenu(ev, seat);
  }
}

/* ---- Seat context menu (Hủy vé / Chuyển vé) ---- */
document.addEventListener('click', (e) => {
  if (!e.target.closest('#seatMenu') && !e.target.closest('.seat-card')) closeSeatMenu();
});

function confirmTransfer() {
  if (!multiSelectMode || !selectedSourceSeats.length || !selectedTargetSeats.length) {
    showToast('Vui lòng chọn ít nhất 1 ghế đã đặt và 1 ghế trống');
    return;
  }

  const pairCount = Math.min(selectedSourceSeats.length, selectedTargetSeats.length);
  if (pairCount === 0) { showToast('Vui lòng chọn ít nhất 1 ghế trống để chuyển'); return; }
  const sourceTripId = transferSourceTripId || currentTripId;
  const targetTripId = transferTargetTripId || currentTripId;

  let extraSeatsChanged = false;
  // Ghế đích của các ghế NGUỒN đã bán (state 'sold') — in lại vé cho đúng mã ghế/chuyến mới sau khi
  // chuyển, vì vé giấy khách đang cầm giờ ghi sai mã ghế/chuyến cũ.
  const reprintSeats = [];
  for (let i = 0; i < pairCount; i++) {
    const sourceSeat = findSeatInTrip(sourceTripId, selectedSourceSeats[i]);
    const targetSeat = findSeatInTrip(targetTripId, selectedTargetSeats[i]);
    if (!sourceSeat || !OCCUPIED_STATES.includes(sourceSeat.state) || !targetSeat || targetSeat.state !== 'empty') continue;

    const wasSold = sourceSeat.state === 'sold';

    Object.assign(targetSeat, {
      state: sourceSeat.state,
      firstStop: sourceSeat.firstStop,
      lastStop: sourceSeat.lastStop,
      phone: sourceSeat.phone,
      note: sourceSeat.note,
      customerName: sourceSeat.customerName,
      pickupTime: sourceSeat.pickupTime,
      ticketNo: sourceSeat.ticketNo,
      paid: sourceSeat.paid,
      count: sourceSeat.count,
      hasLuggage: sourceSeat.hasLuggage,
      luggageNote: sourceSeat.luggageNote,
      guestType: sourceSeat.guestType,
      transshipStation: sourceSeat.transshipStation,
      arrivalTransfer: sourceSeat.arrivalTransfer,
      price: sourceSeat.price,
      zeroPriceReason: sourceSeat.zeroPriceReason,
      depositAmount: sourceSeat.depositAmount,
      depositMethod: sourceSeat.depositMethod,
      paymentMethod: sourceSeat.paymentMethod
    });

    if (wasSold) reprintSeats.push(targetSeat);

    // Ghế dư không phải "mã ghế thật" của xe hiện tại (đã mất khi đổi loại xe) — chuyển đi xong thì
    // phải XOÁ khỏi extraLeftoverSeats hẳn, không thể clearSeatToEmpty() như ghế thường (sẽ để lại
    // 1 dòng "ghế dư trống" vô nghĩa trong danh sách).
    const extraIdx = extraLeftoverSeats.indexOf(sourceSeat);
    if (extraIdx > -1) {
      extraLeftoverSeats.splice(extraIdx, 1);
      extraSeatsChanged = true;
    } else {
      clearSeatToEmpty(sourceSeat);
    }
  }

  renderSeats();
  if (extraSeatsChanged) renderExtraSeats();
  if (document.getElementById('zone3Passengers').style.display !== 'none') renderPassengerList();
  exitMultiSelectMode();
  // Không tự động in lại vé cho ghế đã bán vừa chuyển — chỉ nhắc để nhân viên tự bấm "In lại vé"
  // trong panel xem thông tin ghế đó khi cần (xem reprintCurrentPanelTicket()).
  if (reprintSeats.length) {
    const codes = reprintSeats.map(s => s.code).join(', ');
    showToast(`Đã chuyển ${pairCount} ghế thành công — ghế ${codes} đã bán, mở lại ghế để bấm "In lại vé" cho khách`);
  } else {
    showToast(`Đã chuyển ${pairCount} ghế thành công`);
  }
}

/* ---- Đặt thêm vé cho 1 VÉ NHÓM đã có ----
   Luồng: bấm 1 ghế thuộc vé nhóm (vào chế độ chọn ghế như "chuyển ghế") -> bấm thêm 1..n ghế trống
   trong cùng chuyến -> bấm nút "Đặt thêm cho nhóm" trên thanh chọn ghế.
   Mỗi ghế trống được COPY nguyên thông tin khách của ghế nhóm (tên/SĐT/chặng/giá/ghi chú/loại khách/
   trung chuyển/baga...) và GIỮ CHUNG số vé (ticketNo) với nhóm. Khác "Chuyển ghế": KHÔNG đụng tới ghế
   nguồn. Ghế mới luôn ở trạng thái 'hold' + chưa thanh toán (đây là "đặt thêm", chưa bán/chưa thu tiền)
   dù nhóm gốc đã bán — nhân viên bán riêng sau bằng luồng bán vé thường.
   Cuối cùng đồng bộ lại count cho MỌI ghế cùng số vé. */
function confirmAddToGroup() {
  if (!multiSelectMode || selectionMode !== 'transfer' || transferSourceCancelId) {
    showToast('Vui lòng chọn 1 ghế trong vé nhóm và ít nhất 1 ghế trống');
    return;
  }
  if (selectedSourceSeats.length !== 1) {
    showToast('Chỉ chọn đúng 1 ghế trong vé nhóm để đặt thêm');
    return;
  }
  if (!selectedTargetSeats.length) {
    showToast('Vui lòng chọn ít nhất 1 ghế trống để đặt thêm cho nhóm');
    return;
  }
  const tripId = transferSourceTripId || currentTripId;
  if ((transferTargetTripId || currentTripId) !== tripId) {
    showToast('Chỉ đặt thêm cho nhóm trên cùng 1 chuyến — chọn ghế trống trong chuyến của vé nhóm');
    return;
  }
  const src = findSeatInTrip(tripId, selectedSourceSeats[0]);
  if (!src || !OCCUPIED_STATES.includes(src.state) || !src.ticketNo) {
    showToast('Ghế nguồn không hợp lệ để đặt thêm cho nhóm');
    return;
  }

  const bank = tripSeatBank[tripId];
  const pool = bank
    ? [...bank.down, ...bank.up, ...(bank.extraSeats || []), ...(bank.subSeats || [])]
    : [...seatPlanDown, ...seatPlanUp, ...extraLeftoverSeats, ...subSeats];
  if (pool.filter(s => s.ticketNo === src.ticketNo).length < 2) {
    showToast('Ghế đang chọn không thuộc vé nhóm nào — dùng "Sửa vé" để đặt lại thông tin');
    return;
  }

  const addedSeats = [];
  selectedTargetSeats.forEach(code => {
    const tgt = findSeatInTrip(tripId, code);
    if (!tgt || tgt.state !== 'empty') return;
    Object.assign(tgt, {
      state: 'hold',
      paid: false,
      depositAmount: 0,
      depositMethod: '',
      firstStop: src.firstStop,
      lastStop: src.lastStop,
      phone: src.phone,
      note: src.note,
      customerName: src.customerName,
      staff: src.staff,
      pickupTime: src.pickupTime,
      ticketNo: src.ticketNo,
      hasLuggage: src.hasLuggage,
      luggageNote: src.luggageNote,
      guestType: src.guestType,
      transshipStation: src.transshipStation,
      transship: src.transship,
      pickupAddress: src.pickupAddress,
      dropoffAddress: src.dropoffAddress,
      arrivalTransfer: src.arrivalTransfer,
      price: src.price,
      zeroPriceReason: src.zeroPriceReason,
      paymentMethod: null,
      actionTime: new Date().toISOString()
    });
    // Nhãn trạm bán / giai đoạn bán cho vé mới (giống applyFormToSeat khi ghế chưa có soldPhase).
    if (!tgt.soldPhase) {
      tgt.sellingStation = (typeof getCurrentStation === 'function') ? getCurrentStation() : '';
      const tripStatus = (typeof getTripLifecycleStatus === 'function') ? getTripLifecycleStatus(tripId) : 'SELLING';
      tgt.soldPhase = tripStatus === 'SELLING' ? 'PRE_DEPART' : 'POST_DEPART';
      tgt.reopenEventId = (tripStatus === 'REOPEN' && typeof getActiveReopenEvent === 'function')
        ? ((getActiveReopenEvent(tripId) || {}).id || null)
        : null;
    }
    addedSeats.push(tgt);
  });

  if (!addedSeats.length) {
    showToast('Không có ghế trống hợp lệ để đặt thêm cho nhóm');
    return;
  }

  // Đồng bộ count cho MỌI ghế cùng số vé (kể cả ghế nhóm cũ) để sơ đồ ghế và danh sách hành khách khớp.
  const groupSeats = pool.filter(s => s.ticketNo === src.ticketNo);
  groupSeats.forEach(s => { s.count = groupSeats.length; });

  renderSeats();
  saveSeatBank();
  if (document.getElementById('zone3Passengers').style.display !== 'none') renderPassengerList();
  exitMultiSelectMode();
  showToast(`Đã đặt thêm ${addedSeats.length} vé cho nhóm ${src.ticketNo} (${addedSeats.map(s => s.code).join(', ')}) — tổng ${groupSeats.length} ghế`);
}

/* Đưa ghế về trạng thái trống hoàn toàn — không giữ lại bất kỳ thông tin khách nào */
function clearSeatToEmpty(seat) {
  Object.assign(seat, {
    state: 'empty', count: 1, customerName: null, phone: null, firstStop: null,
    lastStop: null, note: null, staff: null, callState: null, pickupTime: null,
    ticketNo: null, paid: false, hasLuggage: false, guestType: null,
    transshipStation: null, arrivalTransfer: null, zeroPriceReason: null,
    luggageNote: null, paymentMethod: null
  });
}

/* Trạm đi và địa điểm rước thay đổi theo loại khách:
   - Khách trạm: dropdown chọn trạm đi, mặc định là trạm của nhân viên đang thao tác
     nhưng vẫn có thể chọn trạm đi khác trong danh sách.
   - Trung chuyển: có thêm ô nhập nơi trung chuyển (bắt buộc).
   - Rước đường: trạm đi vẫn là dropdown, còn địa điểm rước là dropdown danh sách điểm rước. */

function refreshTicket() {
  const type = document.getElementById('f_type').value;
  document.getElementById('t_name').textContent = document.getElementById('f_name').value || '—';
  document.getElementById('t_phone').textContent = collectPhoneValues('f_phone', 'f_phone_extra') || '—';
  document.getElementById('t_station').textContent = getStationValue() || '—';
  document.getElementById('t_destination').textContent = document.getElementById('f_destination').value || '—';
  // Ghi chú trên vé mẫu ghép hiển thị lý do giá 0đ (nếu có) đứng trước ghi chú thật — chỉ để xem
  // trước, không ghi ngược vào f_note (giữ tách riêng, xem applyFormToSeat lúc lưu).
  const noteFieldVal = document.getElementById('f_note').value.trim();
  const zeroReasonFieldVal = getEditedPrice() === 0 ? document.getElementById('f_zero_price_reason').value.trim() : '';
  const ticketNoteDisplay = zeroReasonFieldVal ? (noteFieldVal ? `${zeroReasonFieldVal} — ${noteFieldVal}` : zeroReasonFieldVal) : noteFieldVal;
  document.getElementById('t_note').textContent = ticketNoteDisplay || '—';

  const transshipLabel = document.getElementById('t_transship_label');
  const transshipRow = document.getElementById('t_transship_row');
  const transshipVal = document.getElementById('f_transship').value.trim();

  const isTransshipLike = (type === 'Trung chuyển');
  if (isTransshipLike && transshipVal) {
    transshipLabel.textContent = 'TC đi';
    transshipRow.style.display = 'flex';
    document.getElementById('t_transship').textContent = transshipVal;
  } else if (type === 'Rước đường' && transshipVal) {
    transshipLabel.textContent = 'Địa điểm rước';
    transshipRow.style.display = 'flex';
    document.getElementById('t_transship').textContent = transshipVal;
  } else {
    transshipRow.style.display = 'none';
  }

  const arrivalVal = document.getElementById('f_arrival_transfer').value.trim();
  const arrivalRow = document.getElementById('t_arrival_transfer_row');
  if (arrivalVal) {
    arrivalRow.style.display = 'flex';
    document.getElementById('t_arrival_transfer').textContent = arrivalVal;
  } else {
    arrivalRow.style.display = 'none';
  }

  const luggageChecked = document.getElementById('f_luggage').checked;
  document.getElementById('t_luggage_row').style.display = luggageChecked ? 'flex' : 'none';
  document.getElementById('f_luggage_note_row').style.display = luggageChecked ? '' : 'none';
  const luggageNoteVal = document.getElementById('f_luggage_note').value.trim();
  document.getElementById('t_luggage_val').textContent = luggageNoteVal ? `Có — ${luggageNoteVal}` : 'Có';

  const depositEnabled = document.getElementById('f_deposit_enabled').checked;
  const depositRow = document.getElementById('t_deposit_row');
  const depositAmount = parseInt(document.getElementById('f_deposit_amount').value, 10) || 0;
  if (depositEnabled && depositAmount > 0) {
    const depositMethod = document.querySelector('input[name="f_deposit_method"]:checked')?.value || 'Tiền mặt';
    depositRow.style.display = 'flex';
    document.getElementById('t_deposit').textContent = `${depositAmount.toLocaleString('vi-VN')}đ (${depositMethod})`;
  } else {
    depositRow.style.display = 'none';
  }

  updateTicketQR();
}

// Modal "Đặt cọc" (#depositModal) dùng CHUNG cho nhiều nơi — panel đặt vé chính (checkbox
// f_deposit_enabled) lẫn modal "Đặt lại vé" (checkbox rbDepositEnabled) — nên phải nhớ checkbox nào vừa
// bật cọc để lúc "Xác nhận"/"Hủy" cập nhật/bỏ tick ĐÚNG checkbox đó, không hard-code riêng cho panel
// chính như trước (bấm "Đặt cọc" bên modal Đặt lại vé sẽ vô tình bỏ tick nhầm checkbox của panel chính).
let depositModalSourceCheckboxId = 'f_deposit_enabled';

// Tick "Đặt cọc" -> mở ngay modal nhập số tiền + phương thức. Bỏ tick -> tắt cọc, xoá số tiền đã gõ
// để lần tick lại sau không giữ số cũ gây nhầm. Gọi qua data-change-action nên `this` = checkbox vừa bấm.
function onDepositToggle() {
  depositModalSourceCheckboxId = this.id || 'f_deposit_enabled';
  if (this.checked) {
    openDepositModal();
  } else {
    document.getElementById('f_deposit_amount').value = '';
    if (depositModalSourceCheckboxId === 'f_deposit_enabled') refreshTicket();
    else updateRebookDepositHint();
  }
}

function openDepositModal() {
  document.getElementById('f_deposit_amount').focus();
  document.getElementById('depositModal').classList.add('open');
}

// Hiện số tiền cọc đã nhập bên modal "Đặt lại vé" — panel đặt vé chính có cả tờ vé xem trước
// (refreshTicket() tự vẽ dòng "Đã cọc"), còn modal Đặt lại vé không có tờ vé nên chỉ cần 1 dòng gợi ý
// ngắn cạnh checkbox "Đặt cọc".
function updateRebookDepositHint() {
  const hint = document.getElementById('rbDepositHint');
  if (!hint) return;
  const enabled = document.getElementById('rbDepositEnabled')?.checked;
  const amount = parseInt(document.getElementById('f_deposit_amount').value, 10) || 0;
  hint.textContent = (enabled && amount > 0) ? `Đã cọc: ${amount.toLocaleString('vi-VN')}đ` : '';
}

// "Xác nhận" trong modal — bắt buộc phải có số tiền cọc > 0 mới cho đóng modal.
function closeDepositModal() {
  const amount = parseInt(document.getElementById('f_deposit_amount').value, 10) || 0;
  if (amount <= 0) {
    showToast('Vui lòng nhập số tiền cọc');
    return;
  }
  document.getElementById('depositModal').classList.remove('open');
  if (depositModalSourceCheckboxId === 'f_deposit_enabled') refreshTicket();
  else updateRebookDepositHint();
}

// "Hủy" trong modal — huỷ luôn việc đặt cọc, bỏ tick đúng checkbox đã mở modal này lại.
function cancelDepositModal() {
  document.getElementById('depositModal').classList.remove('open');
  const checkboxEl = document.getElementById(depositModalSourceCheckboxId);
  if (checkboxEl) checkboxEl.checked = false;
  document.getElementById('f_deposit_amount').value = '';
  if (depositModalSourceCheckboxId === 'f_deposit_enabled') refreshTicket();
  else updateRebookDepositHint();
}

function buildScannableQRText() {
  return 'https://caolinh2412.github.io/demo/';
}

function updateTicketQR() {
  const qrImg = document.getElementById('t_qr_img');
  if (!qrImg) return;
  const qrUrl = buildScannableQRText();

  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=1&data=${encodeURIComponent(qrUrl)}`;
  qrImg.title = "Mã QR xác nhận vé lên xe — Nhấp để mở https://caolinh2412.github.io/demo/";
  qrImg.onclick = () => window.open(qrUrl, '_blank');
}

// Dựng đúng phần NỘI DUNG 1 tờ vé (không kèm <html>/<head>) — dùng chung cho cả in 1 vé
// (buildTicketPrintHtml) lẫn in nhiều vé gộp chung 1 cửa sổ (buildMultiTicketPrintHtml).
function buildTicketPageHtml(d) {
  return `
    <div class="brand-header">
      <div class="brand-badge">HN</div>
      <div class="brand-name">HUỆ NGHĨA EXPRESS</div>
      <div class="brand-sub">Hệ thống Đặt vé & Trung chuyển Chuyên nghiệp</div>
    </div>

    <div class="ticket-title">VÉ XE KHÁCH</div>
    <div class="dash-line"></div>

    <div class="kv-row"><span class="kv-label">Mã vé:</span><span class="kv-val">${d.ticketNo}</span></div>
    <div class="kv-row"><span class="kv-label">Ngày in:</span><span class="kv-val">${d.nowStr}</span></div>

    <div class="dash-line"></div>

    <div class="seat-box">SỐ GHẾ: ${d.seatsText}</div>

    <div class="kv-row"><span class="kv-label">Hành khách:</span><span class="kv-val">${d.customerName}</span></div>
    <div class="kv-row"><span class="kv-label">Điện thoại:</span><span class="kv-val">${d.phone}</span></div>
    <div class="kv-row"><span class="kv-label">Tuyến xe:</span><span class="kv-val">${d.route}</span></div>
    <div class="kv-row"><span class="kv-label">Giờ xuất bến:</span><span class="kv-val">${d.time}</span></div>
    <div class="kv-row"><span class="kv-label">Trạm đi:</span><span class="kv-val">${d.fromStation}</span></div>
    <div class="kv-row"><span class="kv-label">Trạm đến:</span><span class="kv-val">${d.toStation}</span></div>

    <div class="dash-line"></div>

    <div class="kv-row"><span class="kv-label">Đơn giá:</span><span class="kv-val">${d.unitPrice.toLocaleString('vi-VN')}đ/vé</span></div>
    <div class="total-price-box">TỔNG TIỀN: ${d.totalPrice.toLocaleString('vi-VN')}đ</div>
    <div class="kv-row"><span class="kv-label">Thanh toán:</span><span class="kv-val">${d.paymentMethod}</span></div>

    <div class="qr-container">
      <img class="qr-img" src="${d.qrImgUrl}" alt="Mã QR Lên Xe">
      <div style="font-weight:800; font-size:11.5px; margin-top:2px;">MÃ QR XÁC NHẬN LÊN XE</div>
      <div style="font-size:10px; color:#555;">Quét mã QR để kiểm tra trạng thái lên xe</div>
    </div>

    <div class="footer-note">
      <b>Cảm ơn quý khách đã chọn Huệ Nghĩa Express!</b><br>
      Tổng đài đặt vé & hỗ trợ: <b>1900 63 64 99</b>
    </div>
  `;
}

const TICKET_PRINT_STYLE = `
  @page { size: 80mm auto; margin: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    margin: 0;
    color: #111213;
    background: #fff;
    font-size: 12.5px;
    line-height: 1.35;
  }
  .ticket-page { width: 76mm; margin: 0 auto; padding: 12px 6px; }
  .ticket-page + .ticket-page { page-break-before: always; }
  .brand-header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }
  .brand-badge {
    display: inline-block;
    background: #C20D08;
    color: #fff;
    font-weight: 900;
    font-size: 16px;
    padding: 2px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
  }
  .brand-name { font-size: 17px; font-weight: 900; letter-spacing: 0.5px; color: #000; }
  .brand-sub { font-size: 11px; font-weight: 600; color: #444; }
  .ticket-title { font-size: 15px; font-weight: 900; text-align: center; margin: 8px 0 4px; text-transform: uppercase; }
  .dash-line { border-bottom: 1px dashed #000; margin: 6px 0; }
  .kv-row { display: flex; justify-content: space-between; font-size: 12.5px; margin: 4px 0; }
  .kv-label { color: #333; font-weight: 600; }
  .kv-val { font-weight: 700; text-align: right; }
  .seat-box {
    font-size: 21px;
    font-weight: 900;
    text-align: center;
    border: 2px solid #000;
    padding: 6px;
    margin: 8px 0;
    background: #fafafa;
  }
  .total-price-box {
    text-align: center;
    font-size: 16px;
    font-weight: 900;
    margin: 8px 0;
    padding: 6px;
    border: 1px solid #000;
    background: #f0f0f0;
  }
  .qr-container {
    text-align: center;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed #000;
  }
  .qr-img { width: 140px; height: 140px; display: block; margin: 0 auto 6px; border: 1px solid #ccc; padding: 4px; background: #fff; }
  .footer-note { text-align: center; font-size: 10.5px; margin-top: 10px; line-height: 1.4; color: #333; }
`;

// Dựng HTML đầy đủ (kể cả <style> in nhiệt 80mm) cho cửa sổ in — 1 vé duy nhất.
function buildTicketPrintHtml(d) {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
    <meta charset="UTF-8">
    <title>In Vé Xe Huệ Nghĩa - ${d.ticketNo}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>${TICKET_PRINT_STYLE}</style>
    </head>
    <body>
    <div class="ticket-page">${buildTicketPageHtml(d)}</div>
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 400);
      };
    </script>
    </body>
    </html>
  `;
}

// Dựng 1 cửa sổ in DUY NHẤT chứa NHIỀU tờ vé nối tiếp nhau (mỗi tờ 1 trang in riêng nhờ
// page-break-before), thay vì gọi window.open() nhiều lần — trình duyệt chặn popup nếu mở nhiều
// cửa sổ liên tiếp trong cùng 1 lần bấm nên in riêng từng ghế bằng nhiều window.open() thực tế chỉ
// ra được đúng 1 vé đầu, các vé sau bị chặn âm thầm (không báo lỗi gì).
function buildMultiTicketPrintHtml(dataList) {
  const pagesHtml = dataList.map(d => `<div class="ticket-page">${buildTicketPageHtml(d)}</div>`).join('');
  const titleTicketNo = dataList.length ? dataList[0].ticketNo : '';
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
    <meta charset="UTF-8">
    <title>In Vé Xe Huệ Nghĩa - ${titleTicketNo}${dataList.length > 1 ? ` (+${dataList.length - 1})` : ''}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>${TICKET_PRINT_STYLE}</style>
    </head>
    <body>
    ${pagesHtml}
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 400);
      };
    </script>
    </body>
    </html>
  `;
}

// Chuẩn bị dữ liệu hiển thị cho 1 tờ vé (không mở cửa sổ in) — tách khỏi printTicket() để dùng lại
// được cho cả in nhiều vé gộp chung 1 cửa sổ (xem printTicketsSeparately()).
function buildTicketPrintData(seats) {
  const currentTrip = (allTripsMeta && allTripsMeta.find(t => t.id === currentTripId)) || { route: 'Sài Gòn - An Giang', time: '07:00' };
  const firstSeat = seats[0];
  const seatsText = seats.map(s => s.code).join(', ');
  const ticketNo = firstSeat.ticketNo || ('SGAG-' + String(Math.floor(1000 + Math.random() * 9000)));
  const customerName = firstSeat.customerName || document.getElementById('f_name').value.trim() || 'Khách lẻ';
  const phone = firstSeat.phone || collectPhoneValues('f_phone', 'f_phone_extra') || '—';
  const fromStation = firstSeat.firstStop || getStationValue().trim() || '508 Kinh Dương Vương';
  const toStation = firstSeat.lastStop || document.getElementById('f_destination').value.trim() || 'Trạm Châu Đốc';
  const unitPrice = firstSeat.price || getEditedPrice();
  const totalPrice = unitPrice * seats.length;
  const route = currentTrip.route || 'Sài Gòn - An Giang';
  const time = currentTrip.time || '07:00';
  const paymentMethod = firstSeat.paymentMethod || 'Tiền mặt';

  const qrText = buildScannableQRText(ticketNo, seatsText, customerName, phone, route, time);
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=1&data=${encodeURIComponent(qrText)}`;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('vi-VN');
  const nowStr = `${timeStr} - ${dateStr}`;

  return {
    ticketNo, nowStr, seatsText, customerName, phone, route, time,
    fromStation, toStation, unitPrice, totalPrice, qrImgUrl, paymentMethod
  };
}

function printTicket(seats) {
  if (!seats || seats.length === 0) return;
  const printHtml = buildTicketPrintHtml(buildTicketPrintData(seats));
  const printWin = window.open('', '_blank', 'width=450,height=600');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  }
}

/* Nút "In lại vé" trong panel xem thông tin ghế đã bán (chỉ hiện khi panel ở chế độ chỉ xem — xem
   openBookingPanel() ở js/shared/ui.js) — nhân viên chủ động bấm khi cần, không tự động in (VD:
   sau khi chuyển ghế đã bán sang ghế khác). */
function reprintCurrentPanelTicket() {
  const seats = currentPanelSeats.length ? currentPanelSeats : (currentPanelSeat ? [currentPanelSeat] : []);
  if (!seats.length) return;
  printTicketsSeparately(seats);
}

// Cả 3 hàm dưới đây dùng chung cho giá vé panel đặt vé chính (#t_price, gọi không truyền tham số) lẫn
// giá vé modal "Đặt lại vé" (#rbPrice, gọi kèm 'rbPrice') — xem readAndValidateRebookDeposit()/
// confirmRebook() ở ticketstaff-account.js.
function focusPriceEdit(priceElId) {
  const el = document.getElementById(priceElId || 't_price');
  if (!el) return;
  el.contentEditable = "true";
  el.focus();
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) { }
}

function onPriceEdit(priceElId) {
  const id = priceElId || 't_price';
  const el = document.getElementById(id);
  if (!el) return;
  const num = parseInt(el.textContent.replace(/[^0-9]/g, '')) || 0;
  el.textContent = num.toLocaleString('vi-VN') + 'đ';
  updateZeroPriceReasonVisibility(id);
  if (id === 'rbPrice' && typeof updateRebookTotalPrice === 'function') updateRebookTotalPrice();
}

function getEditedPrice(priceElId) {
  const el = document.getElementById(priceElId || 't_price');
  if (!el) return 280000;
  // Không dùng "|| 280000": giá 0đ (miễn phí, có lý do) là giá trị hợp lệ, không phải giá trị thiếu.
  const num = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(num) ? 280000 : num;
}

// Số tiền cọc nhập ở form là TỔNG cho cả vé (ticketNo), nhưng khi sửa từ nút "Sửa" trên 1 ghế, panel
// chỉ nhận đúng 1 ghế đó (không phải cả nhóm) — nếu không đồng bộ, ghế còn lại cùng vé vẫn giữ
// depositAmount cũ, khiến cột "Đã thu"/"Còn nợ" (đọc từ ghế đại diện đầu nhóm, xem groupSeatsByTicket)
// hiện sai/không đổi khi sửa đúng ghế không phải ghế đại diện đó.
function syncDepositToTicketGroup(seat) {
  if (!seat.ticketNo) return;
  [...seatPlanDown, ...seatPlanUp, ...extraLeftoverSeats, ...subSeats].forEach(s => {
    if (s !== seat && s.ticketNo === seat.ticketNo) {
      s.depositAmount = seat.depositAmount;
      s.depositMethod = seat.depositMethod;
    }
  });
}

function saveTicket() {
  const type = document.getElementById('f_type').value;

  if (type === 'Trung chuyển' && !document.getElementById('f_transship').value.trim()) {
    showToast('Vui lòng nhập trạm trung chuyển');
    return;
  }
  if (type === 'Rước đường' && !document.getElementById('f_transship').value.trim()) {
    showToast('Vui lòng chọn địa điểm rước');
    return;
  }
  if (type === 'Rước đường' && !getStationValue().trim()) {
    showToast('Vui lòng chọn trạm đi cho khách rước đường');
    return;
  }
  if (!document.getElementById('f_destination').value.trim()) {
    showToast('Vui lòng chọn trạm đến');
    return;
  }

  const editedPrice = getEditedPrice();
  if (editedPrice === 0 && !document.getElementById('f_zero_price_reason').value.trim()) {
    showToast('Vui lòng nhập lý do khi giá vé 0đ');
    return;
  }
  const depositEnabled = document.getElementById('f_deposit_enabled').checked;
  const depositAmountRaw = parseInt(document.getElementById('f_deposit_amount').value, 10) || 0;
  if (depositEnabled && depositAmountRaw <= 0) {
    showToast('Vui lòng nhập số tiền cọc');
    return;
  }
  if (depositEnabled && depositAmountRaw > editedPrice) {
    showToast('Số tiền cọc không được lớn hơn giá vé');
    return;
  }

  const applyFormToSeat = (seat) => {
    seat.customerName = document.getElementById('f_name').value.trim();
    seat.phone = collectPhoneValues('f_phone', 'f_phone_extra');
    seat.guestType = type;
    seat.firstStop = getStationValue().trim() || seat.firstStop;
    seat.lastStop = document.getElementById('f_destination').value.trim() || seat.lastStop;
    seat.transshipStation = document.getElementById('f_transship').value.trim();
    seat.arrivalTransfer = document.getElementById('f_arrival_transfer').value.trim();
    seat.hasLuggage = document.getElementById('f_luggage').checked;
    seat.luggageNote = seat.hasLuggage ? document.getElementById('f_luggage_note').value.trim() : '';
    seat.price = editedPrice;
    // Ghi chú giữ nguyên đúng những gì gõ ở ô "Ghi chú" — lý do giá 0đ lưu riêng ở zeroPriceReason,
    // chỉ ghép hiển thị chung lúc render (seatNoteWithReason) chứ không ghi đè vào note thật.
    seat.note = document.getElementById('f_note').value.trim();
    seat.zeroPriceReason = editedPrice === 0 ? document.getElementById('f_zero_price_reason').value.trim() : '';
    seat.depositAmount = depositEnabled ? depositAmountRaw : 0;
    seat.depositMethod = depositEnabled ? (document.querySelector('input[name="f_deposit_method"]:checked')?.value || 'Tiền mặt') : '';
    // Mốc giờ nhân viên thao tác — hiện ở cột "Thời gian" bảng Lịch sử (xem formatActionTime trong
    // shared/format.js). Ghi đè mỗi lần lưu form (tạo mới lẫn sửa vé) nên luôn phản ánh lần thao tác
    // gần nhất trên ghế này, không riêng lần đặt đầu tiên.
    seat.actionTime = new Date().toISOString();
    // Gắn nhãn trạm bán/giai đoạn bán CHỈ 1 LẦN lúc tạo vé mới (seat.soldPhase chưa có) — sửa vé sau đó
    // không được đổi lại đã bán ở trạm nào/giai đoạn nào, tránh sai lệch báo cáo doanh thu theo trạm và
    // lịch sử Re-open (xem js/ticketstaff-manifest-core.js).
    if (!seat.soldPhase) {
      seat.sellingStation = (typeof getCurrentStation === 'function') ? getCurrentStation() : '';
      const tripStatus = (typeof getTripLifecycleStatus === 'function') ? getTripLifecycleStatus(currentTripId) : 'SELLING';
      seat.soldPhase = tripStatus === 'SELLING' ? 'PRE_DEPART' : 'POST_DEPART';
      seat.reopenEventId = (tripStatus === 'REOPEN' && typeof getActiveReopenEvent === 'function')
        ? ((getActiveReopenEvent(currentTripId) || {}).id || null)
        : null;
    }
  };

  const seatsTarget = currentPanelSeats.length ? currentPanelSeats : (currentPanelSeat ? [currentPanelSeat] : []);
  if (!seatsTarget.length) { closePanel(); return; }

  if (currentPanelMode === 'edit' && currentPanelSeat) {
    const anchor = currentPanelSeat;
    // Sửa 1 vé thuộc VÉ NHÓM → áp dụng thông tin form cho MỌI ghế cùng số vé (ticketNo), không chỉ ghế
    // đang mở. Giữ nguyên field riêng của từng ghế (mã ghế / trạng thái / khoá — applyFormToSeat không
    // đụng tới). Vé lẻ (ticketNo rỗng hoặc chỉ 1 ghế mang số vé đó) → chỉ sửa đúng ghế đó.
    const pool = [...seatPlanDown, ...seatPlanUp, ...extraLeftoverSeats, ...subSeats];
    const groupSeats = anchor.ticketNo ? pool.filter(s => s.ticketNo === anchor.ticketNo) : [];
    const targets = groupSeats.length ? groupSeats : [anchor];
    targets.forEach(s => { applyFormToSeat(s); s.count = targets.length; });
    renderSeats();
    saveSeatBank();
    if (document.getElementById('zone3Passengers').style.display !== 'none') renderPassengerList();
    closePanel();
    showToast(targets.length > 1
      ? `Đã cập nhật ${targets.length} vé trong nhóm (${targets.map(s => s.code).join(', ')})`
      : `Đã cập nhật thông tin ghế ${anchor.code}`);
    return;
  }

  const groupTicketNo = "SGCD-" + String(ticketSeq++).padStart(4, '0');
  seatsTarget.forEach(seat => {
    applyFormToSeat(seat);
    seat.ticketNo = groupTicketNo;
    seat.paid = false;
    seat.count = seatsTarget.length;
    // Ghế có baga vẫn ghi seat.hasLuggage bình thường, không còn chuyển sang state 'cargo' riêng
    // (đã bỏ loại ghế màu xanh biển trên sơ đồ) — luôn giữ 'hold' như ghế đặt thường.
    seat.state = 'hold';
  });

  renderSeats();
  saveSeatBank();
  if (document.getElementById('zone3Passengers').style.display !== 'none') renderPassengerList();

  closePanel();
  showToast(seatsTarget.length > 1 ? 'Đã đặt vé nhóm thành công' : 'Đã đặt vé thành công');
  if (typeof multiSelectMode !== 'undefined' && multiSelectMode) {
    if (typeof exitMultiSelectMode === 'function') exitMultiSelectMode();
  }
}

/* ---- Bán vé trực tiếp: xác nhận bán và chuyển ghế sang trạng thái đã bán (màu đỏ) ---- */
function sellTicket() {
  const type = document.getElementById('f_type').value;

  if (type === 'Trung chuyển' && !document.getElementById('f_transship').value.trim()) {
    showToast('Vui lòng nhập trạm trung chuyển');
    return;
  }
  if (type === 'Rước đường' && !document.getElementById('f_transship').value.trim()) {
    showToast('Vui lòng chọn địa điểm rước');
    return;
  }
  if (type === 'Rước đường' && !getStationValue().trim()) {
    showToast('Vui lòng chọn trạm đi cho khách rước đường');
    return;
  }
  if (!document.getElementById('f_destination').value.trim()) {
    showToast('Vui lòng chọn trạm đến');
    return;
  }

  const editedPrice = getEditedPrice();
  if (editedPrice === 0 && !document.getElementById('f_zero_price_reason').value.trim()) {
    showToast('Vui lòng nhập lý do khi giá vé 0đ');
    return;
  }
  const depositEnabled = document.getElementById('f_deposit_enabled').checked;
  const depositAmountRaw = parseInt(document.getElementById('f_deposit_amount').value, 10) || 0;
  if (depositEnabled && depositAmountRaw <= 0) {
    showToast('Vui lòng nhập số tiền cọc');
    return;
  }
  if (depositEnabled && depositAmountRaw > editedPrice) {
    showToast('Số tiền cọc không được lớn hơn giá vé');
    return;
  }

  const seatsToSell = currentPanelSeats.length ? currentPanelSeats : (currentPanelSeat ? [currentPanelSeat] : []);
  if (!seatsToSell.length) { closePanel(); return; }

  // Form hợp lệ — chưa bán ngay, mở modal bắt buộc chọn phương thức thanh toán trước khi thật sự bán
  // + in vé. Việc bán vé thật sự chuyển sang confirmSellPayment().
  document.querySelectorAll('input[name="sellPaymentMethod"]').forEach(r => { r.checked = r.value === 'Tiền mặt'; });
  document.getElementById('sellPaymentModal').classList.add('open');
}

function closeSellPaymentModal() {
  document.getElementById('sellPaymentModal').classList.remove('open');
  // Bỏ dở giữa chừng (bấm "Đóng" thay vì xác nhận) — dọn sạch mọi ngữ cảnh đang chờ modal này xử lý,
  // tránh lần mở tiếp theo (từ 1 luồng bán vé khác) lỡ chạy nhầm ngữ cảnh cũ còn sót lại.
  sellFromTransferBarSeats = null;
  pendingRebookSell = null;
  pendingPickupAssignSell = null;
}

// Gắn nhãn trạm bán/giai đoạn bán (PRE_DEPART/POST_DEPART) + lần Re-open đang mở (nếu có) CHỈ 1 LẦN
// lúc tạo vé mới — dùng chung cho mọi luồng tạo vé "sold" ngoài panel chính (Đặt lại vé, Chỉ định xe
// rước) để nhất quán với applyFormToSeat() ở sellTicket()/confirmSellPayment().
function tsStampSoldPhaseIfNeeded(seat, tripId) {
  if (seat.soldPhase) return;
  seat.sellingStation = (typeof getCurrentStation === 'function') ? getCurrentStation() : '';
  const tripStatus = (typeof getTripLifecycleStatus === 'function') ? getTripLifecycleStatus(tripId) : 'SELLING';
  seat.soldPhase = tripStatus === 'SELLING' ? 'PRE_DEPART' : 'POST_DEPART';
  seat.reopenEventId = (tripStatus === 'REOPEN' && typeof getActiveReopenEvent === 'function')
    ? ((getActiveReopenEvent(tripId) || {}).id || null)
    : null;
}

function confirmSellPayment() {
  const paymentMethod = document.querySelector('input[name="sellPaymentMethod"]:checked')?.value || 'Tiền mặt';

  // "Bán vé" từ modal "Đặt lại vé" (confirmRebookAndSell() ở ticketstaff-account.js) — chuyến đích có
  // thể KHÁC chuyến đang xem (rebookSelectedTripId, không phải currentTripId).
  if (pendingRebookSell) {
    const ctx = pendingRebookSell;
    pendingRebookSell = null;
    const bank = tripSeatBank[ctx.tripId];
    if (!bank) { closeSellPaymentModal(); return; }
    const allSeats = [...(bank.down || []), ...(bank.up || [])];
    const tripMeta = allTripsMeta.find(t => t.id === ctx.tripId);
    const prefix = (tripMeta?.route?.includes('Sài Gòn')) ? 'SGCD' : 'CDSG';
    const newTicketNo = `${prefix}-${Math.floor(Math.random() * 9000) + 1000}`;
    const staffCode = (typeof getCurrentActionStaffCode === 'function') ? getCurrentActionStaffCode() : 'system';
    const soldSeats = [];
    ctx.seatCodes.forEach(code => {
      const seat = allSeats.find(s => s.code === code);
      if (!seat || seat.state !== 'empty') return;
      Object.assign(seat, {
        state: 'sold',
        customerName: ctx.form.name,
        phone: ctx.form.phone,
        guestType: ctx.form.guestType,
        firstStop: ctx.form.firstStop,
        transshipStation: ctx.form.transship,
        lastStop: ctx.form.lastStop,
        arrivalTransfer: ctx.form.arrivalTransfer,
        note: ctx.form.note,
        hasLuggage: ctx.form.hasLuggage,
        ticketNo: newTicketNo,
        paid: true,
        count: ctx.seatCodes.length,
        staff: staffCode,
        paymentMethod,
        price: ctx.priceInfo.price,
        zeroPriceReason: ctx.priceInfo.zeroPriceReason,
        depositAmount: ctx.deposit.depositAmount,
        depositMethod: ctx.deposit.depositMethod,
        actionTime: new Date().toISOString()
      });
      tsStampSoldPhaseIfNeeded(seat, ctx.tripId);
      soldSeats.push(seat);
    });
    if (!soldSeats.length) { showToast('Không thể bán ghế đã chọn'); closeSellPaymentModal(); return; }

    saveSeatBank();
    if (currentTripId === ctx.tripId) {
      seatPlanDown = bank.down;
      seatPlanUp = bank.up;
      renderSeats();
    }
    closeSellPaymentModal();
    closeRebookModal();
    showToast(`Đã bán vé thành công ${soldSeats.length} ghế cho ${ctx.form.name}`);
    printTicketsSeparately(soldSeats);
    refreshHistoryViewsAfterBooking(ctx.form.phone);
    return;
  }

  // "Bán vé" từ modal "Chỉ định xe rước" (pkConfirmAssign() ở ticketstaff-pickup.js).
  if (pendingPickupAssignSell) {
    const ctx = pendingPickupAssignSell;
    pendingPickupAssignSell = null;
    const pax = pickupPassengers.find(p => p.id === ctx.paxId);
    const bank = tripSeatBank[ctx.tripId];
    if (!pax || !bank) { closeSellPaymentModal(); return; }
    const allSeats = [...(bank.down || []), ...(bank.up || [])];
    const staffCode = (typeof getCurrentActionStaffCode === 'function') ? getCurrentActionStaffCode() : 'system';

    // Nếu khách đang đổi chỉ định từ 1 hoặc nhiều ghế/phơi xe khác thì trả ghế cũ về trạng thái trống —
    // chỉ làm lúc xác nhận thanh toán xong (không phải lúc mở modal), tránh mất ghế cũ nếu người dùng
    // bấm "Đóng" thay vì xác nhận.
    if (pax.assigned) {
      const oldBank = tripSeatBank[pax.assigned.tripId];
      if (oldBank) {
        const oldSeatsList = pax.assigned.seats || (pax.assigned.seat ? pax.assigned.seat.split(',').map(s => s.trim()).filter(Boolean) : []);
        oldSeatsList.forEach(code => {
          const oldSeat = [...oldBank.down, ...oldBank.up].find(s => s.code === code);
          if (oldSeat) Object.assign(oldSeat, { state: 'empty', customerName: null, phone: null, ticketNo: null, paid: false });
        });
      }
    }

    const soldSeats = [];
    ctx.seatCodes.forEach(code => {
      const seat = allSeats.find(s => s.code === code);
      if (!seat) return;
      Object.assign(seat, {
        state: 'sold',
        customerName: pax.name,
        phone: pax.phone,
        firstStop: pax.fromStation,
        lastStop: pax.toStation,
        transshipStation: pax.fromTransfer,
        price: ctx.unitPrice,
        paid: true,
        count: ctx.seatCodes.length,
        ticketNo: ctx.ticketNo,
        staff: staffCode,
        paymentMethod,
        actionTime: new Date().toISOString()
      });
      tsStampSoldPhaseIfNeeded(seat, ctx.tripId);
      soldSeats.push(seat);
    });
    if (!soldSeats.length) { showToast('Không thể bán ghế đã chọn'); closeSellPaymentModal(); return; }

    pax.assigned = { tripId: ctx.tripId, seat: ctx.seatCodes.join(', '), seats: [...ctx.seatCodes], price: ctx.unitPrice };

    saveSeatBank();
    savePickupPassengers();
    if (currentTripId === ctx.tripId) {
      seatPlanDown = bank.down;
      seatPlanUp = bank.up;
      renderSeats();
    }
    closeSellPaymentModal();
    if (typeof pkCloseAssignModal === 'function') pkCloseAssignModal();
    if (typeof pkRenderPaxTable === 'function') pkRenderPaxTable();
    const tripMeta = allTripsMeta.find(t => t.id === ctx.tripId);
    const totalPrice = ctx.unitPrice * ctx.seatCodes.length;
    showToast(`Đã bán vé cho ${pax.name} lên xe ${tripMeta ? (tripMeta.plate || '') : ''} — ${ctx.seatCodes.length} ghế (${ctx.seatCodes.join(', ')}) · Tổng: ${totalPrice.toLocaleString('vi-VN')}đ`);
    printTicketsSeparately(soldSeats);
    return;
  }

  // Bán nhanh từ thanh chuyển ghế (sellFromTransferBar()) — các ghế này có thể thuộc nhiều vé/khách
  // khác nhau nên KHÔNG đi qua panel sửa vé (không có 1 bộ dữ liệu chung để hiện), chỉ đánh dấu đã
  // bán bằng đúng dữ liệu sẵn có của từng ghế, không đụng tới thông tin khách/tuyến/giá/cọc.
  if (sellFromTransferBarSeats && sellFromTransferBarSeats.length) {
    const seats = sellFromTransferBarSeats;
    sellFromTransferBarSeats = null;
    seats.forEach(seat => {
      seat.paid = true;
      seat.state = 'sold';
      seat.paymentMethod = paymentMethod;
      seat.actionTime = new Date().toISOString();
    });
    renderSeats();
    saveSeatBank();
    if (document.getElementById('zone3Passengers').style.display !== 'none') renderPassengerList();
    closeSellPaymentModal();
    showToast(seats.length > 1
      ? `Đã bán vé thành công cho ${seats.length} ghế`
      : `Đã bán vé thành công — Ghế ${seats[0].code}`);
    printTicketsSeparately(seats);
    return;
  }

  const type = document.getElementById('f_type').value;
  const editedPrice = getEditedPrice();
  const depositEnabled = document.getElementById('f_deposit_enabled').checked;
  const depositAmountRaw = parseInt(document.getElementById('f_deposit_amount').value, 10) || 0;

  const applyFormToSeat = (seat) => {
    seat.customerName = document.getElementById('f_name').value.trim();
    seat.phone = collectPhoneValues('f_phone', 'f_phone_extra');
    seat.guestType = type;
    seat.firstStop = getStationValue().trim() || seat.firstStop;
    seat.lastStop = document.getElementById('f_destination').value.trim() || seat.lastStop;
    seat.transshipStation = document.getElementById('f_transship').value.trim();
    seat.arrivalTransfer = document.getElementById('f_arrival_transfer').value.trim();
    seat.hasLuggage = document.getElementById('f_luggage').checked;
    seat.luggageNote = seat.hasLuggage ? document.getElementById('f_luggage_note').value.trim() : '';
    seat.price = editedPrice;
    // Ghi chú giữ nguyên đúng những gì gõ ở ô "Ghi chú" — lý do giá 0đ lưu riêng ở zeroPriceReason,
    // chỉ ghép hiển thị chung lúc render (seatNoteWithReason) chứ không ghi đè vào note thật.
    seat.note = document.getElementById('f_note').value.trim();
    seat.zeroPriceReason = editedPrice === 0 ? document.getElementById('f_zero_price_reason').value.trim() : '';
    seat.depositAmount = depositEnabled ? depositAmountRaw : 0;
    seat.depositMethod = depositEnabled ? (document.querySelector('input[name="f_deposit_method"]:checked')?.value || 'Tiền mặt') : '';
    seat.paymentMethod = paymentMethod;
    // Mốc giờ nhân viên thao tác — hiện ở cột "Thời gian" bảng Lịch sử (xem formatActionTime trong
    // shared/format.js).
    seat.actionTime = new Date().toISOString();
    // Gắn nhãn trạm bán/giai đoạn bán CHỈ 1 LẦN lúc tạo vé mới (seat.soldPhase chưa có) — xem giải thích
    // ở applyFormToSeat phía trên.
    if (!seat.soldPhase) {
      seat.sellingStation = (typeof getCurrentStation === 'function') ? getCurrentStation() : '';
      const tripStatus = (typeof getTripLifecycleStatus === 'function') ? getTripLifecycleStatus(currentTripId) : 'SELLING';
      seat.soldPhase = tripStatus === 'SELLING' ? 'PRE_DEPART' : 'POST_DEPART';
      seat.reopenEventId = (tripStatus === 'REOPEN' && typeof getActiveReopenEvent === 'function')
        ? ((getActiveReopenEvent(currentTripId) || {}).id || null)
        : null;
    }
  };

  const seatsToSell = currentPanelSeats.length ? currentPanelSeats : (currentPanelSeat ? [currentPanelSeat] : []);
  if (!seatsToSell.length) { closeSellPaymentModal(); closePanel(); return; }

  const groupTicketNo = (currentPanelMode === 'edit' && currentPanelSeat && currentPanelSeat.ticketNo)
    ? currentPanelSeat.ticketNo
    : ("SGCD-" + String(ticketSeq++).padStart(4, '0'));

  seatsToSell.forEach(seat => {
    applyFormToSeat(seat);
    seat.ticketNo = seat.ticketNo || groupTicketNo;
    seat.paid = true;
    seat.count = seatsToSell.length;
    seat.state = 'sold'; // Bán vé -> ghế chuyển sang màu đỏ (đã bán)
    syncDepositToTicketGroup(seat);
  });

  renderSeats();
  saveSeatBank();
  if (document.getElementById('zone3Passengers').style.display !== 'none') renderPassengerList();

  closeSellPaymentModal();
  closePanel();
  showToast(seatsToSell.length > 1
    ? 'Đã bán vé thành công cho ' + seatsToSell.length + ' ghế'
    : 'Đã bán vé thành công — Ghế ' + seatsToSell[0].code);
  if (typeof multiSelectMode !== 'undefined' && multiSelectMode) {
    if (typeof exitMultiSelectMode === 'function') exitMultiSelectMode();
  }

  // In vé trực tiếp có mã QR xác nhận lên xe — in riêng từng ghế 1 tờ, kể cả vé nhóm nhiều ghế
  // (xem printTicketsSeparately()), không gộp chung nhiều ghế vào 1 tờ vé nữa.
  printTicketsSeparately(seatsToSell);
}

/* In riêng 1 tờ vé cho MỖI ghế (kể cả các ghế cùng 1 vé nhóm) thay vì gộp chung như trước — áp dụng
   cho mọi luồng bán vé (bán qua panel lẫn bán nhanh từ thanh chuyển ghế). Số vé (ticketNo) trên từng
   tờ vẫn đúng vì mỗi ghế tự mang sẵn ticketNo chung của cả nhóm, chỉ khác là giá/route hiện đúng theo
   từng ghế thay vì cộng gộp cả nhóm.
   Gộp tất cả các tờ vào CHUNG 1 cửa sổ in (mỗi tờ 1 trang, ngăn cách bằng page-break) thay vì gọi
   window.open() riêng cho từng tờ — gọi nhiều window.open() liên tiếp trong cùng 1 lần bấm sẽ bị
   trình duyệt chặn popup từ tờ thứ 2 trở đi (chỉ tờ đầu mở được, không báo lỗi gì nên nhìn như "chỉ
   in được 1 vé"). */
function printTicketsSeparately(seats) {
  if (!seats || seats.length === 0) return;
  const dataList = seats.map(seat => buildTicketPrintData([seat]));
  const printHtml = buildMultiTicketPrintHtml(dataList);
  const printWin = window.open('', '_blank', 'width=450,height=600');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  }
}

/* Bán nhanh (các) ghế đang chọn làm nguồn ở thanh chuyển ghế — không mở panel sửa vé (các ghế có thể
   thuộc nhiều vé/khách khác nhau nên không có 1 bộ dữ liệu chung để hiện lên panel), chỉ hỏi xác nhận
   phương thức thanh toán rồi đánh dấu đã bán, giữ nguyên toàn bộ thông tin khách/tuyến/giá/cọc sẵn có
   của từng ghế. Chỉ khả dụng khi tất cả ghế đó chưa bán và đang ở đúng chuyến hiện xem (xem điều kiện
   hiện nút trong updateTransferHint() ở js/shared/booking.js). */
function sellFromTransferBar() {
  if (transferSourceCancelId || !selectedSourceSeats.length || transferSourceTripId !== currentTripId) return;
  const seats = selectedSourceSeats.map(code => findSeatInTrip(transferSourceTripId, code)).filter(Boolean);
  if (!seats.length || seats.some(s => s.state === 'sold')) {
    showToast('Chỉ có thể bán ghế chưa bán');
    return;
  }
  exitMultiSelectMode();
  sellFromTransferBarSeats = seats;
  document.querySelectorAll('input[name="sellPaymentMethod"]').forEach(r => { r.checked = r.value === 'Tiền mặt'; });
  document.getElementById('sellPaymentModal').classList.add('open');
}

/* In lại vé cho (các) ghế đang chọn làm nguồn ở thanh chuyển ghế — chỉ khả dụng khi tất cả ghế đó
   ĐÃ bán và đang ở đúng chuyến hiện xem (xem điều kiện hiện nút trong updateTransferHint() ở
   js/shared/booking.js). Không thoát chế độ chuyển ghế sau khi in — in vé không đổi dữ liệu gì nên
   nhân viên có thể tiếp tục bấm "Chuyển ghế" ngay sau đó nếu cần. */
function reprintFromTransferBar() {
  if (transferSourceCancelId || !selectedSourceSeats.length || transferSourceTripId !== currentTripId) return;
  const seats = selectedSourceSeats.map(code => findSeatInTrip(transferSourceTripId, code)).filter(Boolean);
  if (!seats.length || seats.some(s => s.state !== 'sold')) {
    showToast('Chỉ có thể in lại vé cho ghế đã bán');
    return;
  }
  printTicketsSeparately(seats);
}

/* ---- Modal chỉ định xe: đổi loại xe -> đổi sơ đồ ghế ---- */

// Vehicle type config successfully initialized at the top of the file

// Chuyển sơ đồ ghế hiện tại sang đúng số lượng/khung ghế của loại xe được chọn.
// Ghế nào giữ nguyên mã ở xe mới thì giữ nguyên toàn bộ thông tin khách (VD: khách A1 xe 36 chỗ
// chuyển sang xe 34 chỗ vẫn ở A1). Ghế đang có khách nhưng mã đó không còn tồn tại ở xe mới
// (VD: khách ở B3 xe 36 chỗ chuyển sang xe 34 chỗ - không có B3) sẽ dồn xuống danh sách "Ghế dư".
function applyVehicleType(typeLabel) {
  if (!typeLabel || !VEHICLE_TYPE_SEATS[typeLabel]) return;

  const target = getSeatCodesForVehicleType(typeLabel);
  const targetCodes = new Set([...target.down, ...target.up]);

  // Gom toàn bộ ghế đang có (kể cả ghế dư từ lần đổi trước) để tra cứu theo mã.
  const allCurrentSeats = [...seatPlanDown, ...seatPlanUp, ...extraLeftoverSeats];
  const seatByCode = {};
  allCurrentSeats.forEach(s => { seatByCode[s.code] = s; });

  seatPlanDown = target.down.map(code => {
    if (code.endsWith('_hidden')) return { code, state: 'hidden' };
    return seatByCode[code] ? { ...seatByCode[code], code } : makeSeat(code, "empty");
  });
  seatPlanUp = target.up.map(code => {
    if (code.endsWith('_hidden')) return { code, state: 'hidden' };
    return seatByCode[code] ? { ...seatByCode[code], code } : makeSeat(code, "empty");
  });

  // Save to bank so changes persist when switching trips
  if (tripSeatBank[currentTripId]) {
    tripSeatBank[currentTripId].down = seatPlanDown;
    tripSeatBank[currentTripId].up = seatPlanUp;
    // Thiếu dòng này khiến listener 'storage' (kích hoạt bởi saveSeatBank() ở cuối hàm) render lại
    // .car-type từ tripSeatBank[currentTripId].vehicleType — nếu không cập nhật ở đây, nó lấy giá trị
    // cũ/mặc định và ghi đè ngay lên .car-type vừa đổi phía dưới, khiến mở lại modal thấy loại xe cũ.
    tripSeatBank[currentTripId].vehicleType = typeLabel;
  }

  // Update header vehicle label
  const carTypeEl = document.querySelector('.car-type');
  if (carTypeEl) {
    const svgIcon = carTypeEl.querySelector('svg');
    carTypeEl.innerHTML = '';
    if (svgIcon) carTypeEl.appendChild(svgIcon);
    carTypeEl.appendChild(document.createTextNode(' ' + typeLabel));
  }

  // Update trip card subtext in the sidebar list
  const selectedTripCard = document.querySelector('.trip-card.selected');
  if (selectedTripCard) {
    const subEl = selectedTripCard.querySelector('.trip-sub');
    if (subEl) {
      const parts = subEl.textContent.split('•');
      subEl.textContent = parts[0].trim() + ' • ' + typeLabel;
    }
  }

  // Ghế dư: có khách (không phải ghế trống) nhưng mã không còn trong sơ đồ xe mới.
  extraLeftoverSeats = allCurrentSeats.filter(s => !targetCodes.has(s.code) && ['sold', 'hold', 'free', 'cargo'].includes(s.state));

  if (tripSeatBank[currentTripId]) {
    tripSeatBank[currentTripId].extraSeats = extraLeftoverSeats;
  }

  renderSeats();
  renderExtraSeats();
}

function renderExtraSeats() {
  const section = document.getElementById('extraSeatsSection');
  const list = document.getElementById('extraSeatsList');
  if (!section || !list) return;
  if (extraLeftoverSeats.length === 0) {
    section.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  section.style.display = '';

  // Align columns configuration with the main seat map
  const totalSeats = [...seatPlanDown, ...seatPlanUp].filter(s => s.state !== 'hidden').length;
  const useThreeCols = totalSeats >= 34;
  list.classList.toggle('cols-3', useThreeCols);

  const ticketGroupMap = buildTicketGroupMap();
  list.innerHTML = extraLeftoverSeats.map(s => seatCard(s, ticketGroupMap, useThreeCols)).join('');
}

/* ===================== GHẾ PHỤ (chỉ ghi chú + giá tiền) ===================== */

let currentCancelSeatCodes = [];

function openCancelModal(code) {
  if (blockIfMultiSelectActive()) return;
  openCancelModalForCodes([code]);
}

/* Hủy nhiều ghế cùng lúc — dùng chung modal/lý do hủy với hủy 1 ghế (openCancelModal), chỉ khác là
   nhận vào danh sách mã ghế thay vì 1 mã. Gọi từ nút "Hủy vé" trên thanh chuyển ghế
   (xem cancelSelectedFromTransferBar bên dưới) khi đang chọn nhiều ghế đã đặt/đã bán làm nguồn. */
function openCancelModalForCodes(codes) {
  if (!codes || !codes.length) return;
  currentCancelSeatCodes = codes;
  const codeEl = document.getElementById('cancelSeatCode');
  const reasonEl = document.getElementById('cancelReason');
  const btn = document.getElementById('confirmCancelBtn');
  if (codeEl) codeEl.textContent = codes.join(', ');
  if (reasonEl) reasonEl.value = '';
  if (btn) btn.disabled = true;
  const modal = document.getElementById('cancelModal');
  if (modal) modal.classList.add('open');
}

/* Hủy (các) ghế đang chọn làm nguồn ở thanh chuyển ghế — cho phép chọn nhiều ghế đã đặt/đã bán rồi
   hủy cùng lúc thay vì phải mở từng ghế một. Chỉ khả dụng khi tất cả ghế nguồn thuộc đúng chuyến
   đang xem (không áp dụng cho vé hủy đang chọn lại — transferSourceCancelId). */
function cancelSelectedFromTransferBar() {
  if (transferSourceCancelId || !selectedSourceSeats.length || transferSourceTripId !== currentTripId) return;
  const seats = selectedSourceSeats.map(code => findSeatInTrip(transferSourceTripId, code)).filter(Boolean);
  if (!seats.length) return;
  exitMultiSelectMode();
  openCancelModalForCodes(seats.map(s => s.code));
}

function checkCancelReason() {
  const reasonEl = document.getElementById('cancelReason');
  const btn = document.getElementById('confirmCancelBtn');
  if (reasonEl && btn) {
    btn.disabled = !reasonEl.value.trim();
  }
}

function confirmCancel() {
  const codes = currentCancelSeatCodes;
  if (!codes || !codes.length) return;
  const reasonEl = document.getElementById('cancelReason');
  const reason = reasonEl ? reasonEl.value.trim() : '';
  if (!reason) return;

  const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');

  if (!cancelledSeats) cancelledSeats = [];
  const cancelledCodes = [];
  codes.forEach(code => {
    const seat = findSeat(code);
    if (!seat) return;

    const cancelledRecord = {
      id: 'CANCEL_' + Date.now() + '_' + code,
      code: seat.code,
      customerName: seat.customerName || 'Khách vảng lai',
      phone: seat.phone || '—',
      firstStop: seat.firstStop || 'Kinh Dương Vương',
      lastStop: seat.lastStop || 'Châu Đốc',
      price: seat.price || 280000,
      reason: reason,
      cancelTime: nowStr,
      cancelStaff: getCurrentActionStaffCode(),
      ticketNo: seat.ticketNo || '—',
      note: seatNoteWithReason(seat) || ''
    };
    cancelledSeats.unshift(cancelledRecord);
    cancelledCodes.push(seat.code);

    // Reset trạng thái ghế về trống
    clearSeatToEmpty(seat);
  });

  if (!cancelledCodes.length) return;

  if (tripSeatBank[currentTripId]) {
    tripSeatBank[currentTripId].cancelledSeats = cancelledSeats;
  }

  saveSeatBank();
  closeModal('cancelModal');
  renderSeats();
  renderCancelledSeats();
  updateCancelledTabCount();
  if (document.getElementById('zone3Cancelled') && document.getElementById('zone3Cancelled').style.display !== 'none') {
    renderCancelledListTable();
  }
  updateTripStats();
  updatePassengerTabCount();
  showToast(`Đã hủy ghế ${cancelledCodes.join(', ')}. Lý do: ${reason}`);
  currentCancelSeatCodes = [];
}

// Dựng lại các <select>/dropdown trong modal Chỉ định xe từ store dùng chung (loại xe / biển số / tài xế
// / phụ xe do Admin quản trị). Chạy TRƯỚC phần pre-select bên dưới để cơ chế "chèn giá trị hiện tại nếu
// thiếu" vẫn là lưới an toàn cho phơi cũ có biển/loại lạ.
function hydrateAssignModalFromStore() {
  try {
    if (!window.FleetStore) return;

    const vtSel = document.getElementById('vehicleTypeSelect');
    if (vtSel) {
      const cur = vtSel.value;
      const types = FleetStore.getVehicleTypes({ scope: 'line' }).filter(v => v.active !== false);
      vtSel.innerHTML = '<option value="">-- Chọn loại xe --</option>' +
        types.map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`).join('');
      if (cur) vtSel.value = cur;
    }

    const plateSel = document.getElementById('plateSelect');
    if (plateSel) {
      const cur = plateSel.value;
      const plates = FleetStore.getVehicles({ scope: 'line' }).filter(v => v.active !== false).map(v => v.plate);
      plateSel.innerHTML = plates.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
      if (cur && plates.indexOf(cur) !== -1) plateSel.value = cur;
    }

    hydrateCrewDropdown('driverDropdownPanel', 'driverDropdownContainer', 'driver');
    hydrateCrewDropdown('helperDropdownPanel', 'helperDropdownContainer', 'helper');
  } catch (e) {
    console.warn('[ticketstaff] hydrateAssignModalFromStore lỗi', e);
  }
}

function hydrateCrewDropdown(panelId, containerId, role) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const people = FleetStore.getStaff({ role }).filter(s => s.active !== false).map(s => s.name);
  panel.innerHTML = people.map(name => {
    const a = escapeHtml(name);
    return `<div class="dropdown-item" data-value="${a}" data-action="selectSearchDropdownItem" ` +
      `data-args='["${containerId}", "${a}", "${a}", "${role}"]'>` +
      `<span>${a}</span><span class="dropdown-item-check">✓</span></div>`;
  }).join('');
}

function openAssignModal() {
  document.getElementById('assignModal').classList.add('open');
  document.getElementById('driverWarn').style.display = 'none';
  hydrateAssignModalFromStore();

  // Pre-select current vehicle type and add to select options if missing
  const carTypeEl = document.querySelector('.car-type');
  if (carTypeEl) {
    const cloned = carTypeEl.cloneNode(true);
    const svg = cloned.querySelector('svg');
    if (svg) svg.remove();
    const currentType = cloned.textContent.trim();

    const select = document.getElementById('vehicleTypeSelect');
    if (select) {
      let exists = false;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === currentType) {
          exists = true;
          select.selectedIndex = i;
          break;
        }
      }
      if (!exists) {
        const newOpt = new Option(currentType, currentType);
        select.add(newOpt, 1); // Insert right after the placeholder
        select.selectedIndex = 1;
      }
    }
  }

  // Pre-populate plate and add to select options if missing, plus driver and helper
  const headerPlate = document.getElementById('headerPlate');
  const headerDriver = document.getElementById('headerDriver');
  const headerHelper = document.getElementById('headerHelper');

  if (headerPlate) {
    const currentPlate = headerPlate.textContent.trim();
    const plateSelect = document.getElementById('plateSelect');
    if (plateSelect) {
      let exists = false;
      for (let i = 0; i < plateSelect.options.length; i++) {
        if (plateSelect.options[i].value === currentPlate) {
          exists = true;
          plateSelect.selectedIndex = i;
          break;
        }
      }
      if (!exists) {
        const newOpt = new Option(currentPlate, currentPlate);
        plateSelect.add(newOpt, 0); // Insert at the top
        plateSelect.selectedIndex = 0;
      }
    }
  }
  if (headerDriver && document.getElementById('driverSelect')) {
    const val = headerDriver.textContent.trim();
    document.getElementById('driverSelect').value = val;
    dropdownState['driverDropdownContainer'] = { value: val, label: val };
    document.querySelectorAll('#driverDropdownPanel .dropdown-item').forEach(item => {
      item.classList.toggle('active', item.dataset.value === val);
    });
  }
  if (headerHelper && document.getElementById('helperSelect')) {
    const val = headerHelper.textContent.trim();
    document.getElementById('helperSelect').value = val;
    dropdownState['helperDropdownContainer'] = { value: val, label: val };
    document.querySelectorAll('#helperDropdownPanel .dropdown-item').forEach(item => {
      item.classList.toggle('active', item.dataset.value === val);
    });
  }
}
function checkDriverConflict() {
  const conflict = document.getElementById('driverSelect').value.includes('trùng lịch');
  document.getElementById('driverWarn').style.display = conflict ? 'flex' : 'none';
}
function saveAssign() {
  if (document.getElementById('driverWarn').style.display === 'flex') { showToast('Vui lòng chọn tài xế khác trước khi lưu (BR-07)'); return; }

  const select = document.getElementById('vehicleTypeSelect');
  if (select && select.value) {
    applyVehicleType(select.value);
  }

  // Update header info dynamically
  const plateVal = document.getElementById('plateSelect').value;
  const driverVal = document.getElementById('driverSelect').value;
  const helperVal = document.getElementById('helperSelect').value;

  const headerPlate = document.getElementById('headerPlate');
  const headerDriver = document.getElementById('headerDriver');
  const headerHelper = document.getElementById('headerHelper');

  if (headerPlate) headerPlate.textContent = plateVal;
  if (headerDriver) headerDriver.textContent = driverVal;
  if (headerHelper) headerHelper.textContent = helperVal;

  if (tripSeatBank[currentTripId]) {
    tripSeatBank[currentTripId].plate = plateVal;
    tripSeatBank[currentTripId].driver = driverVal;
    tripSeatBank[currentTripId].helper = helperVal;
  }

  // Biển số xe cũng phải ghi lại vào allTripsMeta (không chỉ tripSeatBank) — đây là dữ liệu mà cột "Biển
  // số" ở thẻ phơi bên phần quản lý phơi (renderTable) đọc trực tiếp, thiếu dòng này thì gán xe ở Zone 2
  // không thấy phản ánh lại bên quản lý phơi.
  const tripMeta = allTripsMeta.find(t => t.id === currentTripId);
  if (tripMeta) tripMeta.plate = plateVal;

  saveData();
  refreshTripsList();

  closeModal('assignModal');
  showToast('Đã lưu thông tin chỉ định xe');
}

/* ---- Modal khởi hành xe ---- */
function openDepartModal() {
  const tripEl = document.getElementById('tripTitle');
  const infoEl = document.getElementById('departTripInfo');
  if (tripEl && infoEl) infoEl.textContent = tripEl.textContent.trim();
  document.getElementById('departModal').classList.add('open');
}
function confirmDepart() {
  const tripEl = document.getElementById('tripTitle');
  closeModal('departModal');
  showToast('Xe đã khởi hành: ' + (tripEl ? tripEl.textContent.trim() : ''));
}

/* ---- Toast ---- */
let toastTimer;

/* ---- Search dropdown (SB-01) ---- */
document.getElementById('searchInput').addEventListener('focus', () => {
  if (typeof currentView !== 'undefined' && (currentView === 'pickup' || currentView === 'history')) return;
  toggleSearchResults(true);
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) document.getElementById('searchResults').classList.remove('open');
  if (!e.target.closest('#directionDropdown') && !e.target.closest('#directionTrigger')) {
    const panel = document.getElementById('directionDropdown');
    if (panel) panel.classList.remove('open');
  }
  if (!e.target.closest('#routeDropdown') && !e.target.closest('#routeTrigger')) {
    const panel = document.getElementById('routeDropdown');
    if (panel) panel.classList.remove('open');
  }

  // Close searchable dropdowns (Driver & Helper) and save values if clicked outside
  document.querySelectorAll('.searchable-dropdown').forEach(container => {
    const panel = container.querySelector('.dropdown-panel');
    if (panel && panel.classList.contains('open') && !container.contains(e.target)) {
      panel.classList.remove('open');

      const input = container.querySelector('input');
      const state = dropdownState[container.id];
      if (input && state) {
        state.label = input.value;
        state.value = input.value;
      }
    }
  });
});

function fillSearchInputWithPhone(phone) {
  const input = document.getElementById('searchInput');
  if (input) input.value = phone;
}

// Đồng bộ lại header Zone 2 (biển số/loại xe/tài xế/phụ xe) theo đúng tripSeatBank của 1 phơi — dùng
// chung cho lúc chọn phơi ở Zone 1 (selectTrip) và lúc sửa biển số 1 phơi đang được chọn từ phần quản
// lý phơi (saveSingleTrip gọi refreshVehicleHeaderIfCurrent) để 2 nơi luôn hiện cùng 1 biển số xe.
function refreshVehicleHeader(bank) {
  const headerPlate = document.getElementById('headerPlate');
  if (headerPlate) headerPlate.textContent = bank.plate || '51F-123.45';

  const carTypeEl = document.querySelector('.car-type');
  if (carTypeEl) {
    const svgIcon = carTypeEl.querySelector('svg');
    carTypeEl.innerHTML = '';
    if (svgIcon) carTypeEl.appendChild(svgIcon);
    carTypeEl.appendChild(document.createTextNode(' ' + (bank.vehicleType || 'Limousine 24 Phòng')));
  }

  const headerDriver = document.getElementById('headerDriver');
  if (headerDriver) headerDriver.textContent = bank.driver || 'Trần Văn Hùng';

  const headerHelper = document.getElementById('headerHelper');
  if (headerHelper) headerHelper.textContent = bank.helper || 'Nguyễn Thị Hương';
}

// Gọi sau khi lưu 1 phơi ở modal quản lý phơi — nếu đúng phơi đang được chọn/xem ở Zone 2 thì refresh
// ngay header, không phải bấm chọn lại phơi ở Zone 1 mới thấy biển số/loại xe vừa sửa.
function refreshVehicleHeaderIfCurrent(tripId) {
  if (!tripId || tripId !== currentTripId) return;
  const bank = tripSeatBank[tripId];
  if (bank) refreshVehicleHeader(bank);
}

/* ---- Zone 1: Trip list select ---- */
function selectTrip(el, time, routeLabel) {
  if (customerHistoryActive) closeCustomerHistory();
  document.querySelectorAll('.trip-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('tripTitle').textContent = time + ' - ' + (routeLabel || 'Sài Gòn - An Giang');
  const tripId = el.dataset.trip;
  // Trạm đi/đến trong panel đặt vé bám theo phơi vừa chọn (region-wide cho Trạm đi; Trạm đến thu hẹp
  // theo "trạm có thể nhận" nếu phơi có tick — xem stationsForTrip).
  const selTripMeta = (allTripsMeta || []).find(t => t.id === tripId) || (routeLabel ? { route: routeLabel } : null);
  if (typeof populateBookingStationDatalists === 'function') populateBookingStationDatalists(selTripMeta);
  const bank = tripSeatBank[tripId];
  if (!tripId || !bank) return;

  // Sync state
  currentTripId = tripId;
  seatPlanDown = bank.down;
  seatPlanUp = bank.up;
  extraLeftoverSeats = bank.extraSeats || [];
  subSeats = bank.subSeats || [];
  cancelledSeats = bank.cancelledSeats || [];

  refreshVehicleHeader(bank);

  if (multiSelectMode && selectionMode === 'transfer' && (selectedSourceSeats.length || transferSourceCancelId)) {
    if (transferTargetTripId !== tripId) {
      selectedTargetSeats = [];
      transferTargetTripId = tripId;
    }
    renderSeats();
    renderExtraSeats();
    renderSubSeats();
    renderCancelledSeats();
    updateCancelledTabCount();
    const markSeats = (seats) => seats.forEach(code => {
      const card = document.querySelector(`.seat-card[data-code="${code}"]`);
      if (card) { card.style.outline = '2px solid var(--red)'; card.style.outlineOffset = '1px'; }
    });
    if (transferSourceTripId === tripId) markSeats(selectedSourceSeats);
    if (transferTargetTripId === tripId) markSeats(selectedTargetSeats);
    if (document.getElementById('zone3Passengers').style.display !== 'none') renderPassengerList();
    if (document.getElementById('zone3Cancelled') && document.getElementById('zone3Cancelled').style.display !== 'none') renderCancelledListTable();
    updateTransferHint();
    return;
  }

  if (multiSelectMode) exitMultiSelectMode();

  renderSeats();
  renderExtraSeats();
  renderSubSeats();
  renderCancelledSeats();
  updateCancelledTabCount();
  if (document.getElementById('zone3Passengers').style.display !== 'none') renderPassengerList();
  if (document.getElementById('zone3Cancelled') && document.getElementById('zone3Cancelled').style.display !== 'none') renderCancelledListTable();
}

function updateTripListForDirection(dir) {
  if (!directionLabels[dir]) return;
  selectedDirection = dir;
  // Đổi hướng thì bỏ lọc tuyến cũ (danh sách tuyến của mỗi hướng khác nhau).
  selectedRoute = 'all';
  const routeInput = document.getElementById('routeTrigger');
  if (routeInput) routeInput.value = 'Tất cả tuyến';
  if (typeof renderRouteOptions === 'function') renderRouteOptions('');
  renderZone1TripList();
  const firstCard = document.querySelector('#tripListSGCD .trip-card');
  if (firstCard) {
    const timeEl = firstCard.querySelector('.trip-time');
    selectTrip(firstCard, timeEl ? timeEl.textContent : '', directionLabels[dir]);
  }
}

/* ===================== SEARCHABLE DROPDOWNS ===================== */
const dropdownState = {
  driverDropdownContainer: { value: '', label: '' },
  helperDropdownContainer: { value: '', label: '' }
};

function toggleSearchDropdown(containerId, event) {
  event.stopPropagation();

  // Close all other dropdowns
  document.querySelectorAll('.searchable-dropdown').forEach(d => {
    if (d.id !== containerId) {
      const panel = d.querySelector('.dropdown-panel');
      if (panel) panel.classList.remove('open');
    }
  });

  const container = document.getElementById(containerId);
  if (!container) return;
  const panel = container.querySelector('.dropdown-panel');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');

  if (!isOpen) {
    panel.classList.add('open');
    const input = container.querySelector('input');
    if (input) {
      input.select();
    }
    filterDropdown(containerId);
  } else {
    panel.classList.remove('open');
  }
}

function filterDropdown(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const input = container.querySelector('input');
  if (!input) return;
  const filter = input.value.toLowerCase().trim();
  const items = container.querySelectorAll('.dropdown-item');

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(filter)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });

  const panel = container.querySelector('.dropdown-panel');
  if (panel) panel.classList.add('open');
}

function selectSearchDropdownItem(containerId, label, value, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const input = container.querySelector('input');
  if (input) {
    input.value = label;
  }
  dropdownState[containerId] = { value, label };

  container.querySelectorAll('.dropdown-item').forEach(item => {
    const itemValue = item.dataset.value;
    item.classList.toggle('active', itemValue === value);
  });

  const panel = container.querySelector('.dropdown-panel');
  if (panel) panel.classList.remove('open');

  if (type === 'driver') {
    checkDriverConflict();
  }
}

/* ---- Zone 1: Calendar ---- */
const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
function renderCalendar() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  document.getElementById('calMonthLabel').textContent = `${monthNames[m]}, ${y}`;
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  const todayRefStr = zone1TodayDate().toDateString();
  const selectedStr = selectedDate.toDateString();

  let html = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="cal-day muted">${daysInPrevMonth - startOffset + i + 1}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(y, m, d);
    const dateStr = dateObj.toDateString();
    const isToday = dateStr === todayRefStr;
    const isSelected = dateStr === selectedStr;
    const lunar = ((d + 16) % 30) + 1;
    html += `<div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-action="pickDate" data-args='${JSON.stringify([y, m, d])}'>${d}<span class="lunar">${lunar}/6</span></div>`;
  }
  const trailing = (7 - ((startOffset + daysInMonth) % 7)) % 7;
  for (let i = 1; i <= trailing; i++) { html += `<div class="cal-day muted">${i}</div>`; }
  document.getElementById('calGrid').innerHTML = html;
}
function shiftMonth(dir) { calDate = new Date(calDate.getFullYear(), calDate.getMonth() + dir, 1); renderCalendar(); }
function goToday() {
  calDate = zone1TodayDate();
  selectedDate = zone1TodayDate();
  renderCalendar();
  updateCalTrigger();
  renderZone1TripList();
}
function pickDate(y, m, d) {
  selectedDate = new Date(y, m, d);
  renderCalendar();
  updateCalTrigger();
  toggleCalendar(false);
  renderZone1TripList();
}

function updateCalTrigger() {
  const isToday = selectedDate.toDateString() === zone1TodayDate().toDateString();
  const d = String(selectedDate.getDate()).padStart(2, '0');
  const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
  document.getElementById('calTriggerDate').textContent = isToday ? 'Hôm nay' : `${d}/${m}`;
}

let calendarOpen = false;
document.addEventListener('click', (e) => {
  if (calendarOpen && !e.target.closest('.calendar') && !e.target.closest('#calTrigger')) {
    toggleCalendar(false);
  }
});

renderCalendar();
updateCalTrigger();

/* ---- Zone 1: lọc danh sách phơi theo giờ khởi hành (popover 2 cột Sáng/Chiều thay cho <select> cũ) ---- */
function toggleZone1HourPopover(force) {
  const popover = document.getElementById('zone1HourPopover');
  const btn = document.getElementById('zone1HourFilterBtn');
  if (!popover || !btn) return;
  const willOpen = typeof force === 'boolean' ? force : !popover.classList.contains('open');
  popover.classList.toggle('open', willOpen);
  btn.classList.toggle('open', willOpen);
  if (willOpen) updateZone1HourPopoverSelection();
}

function updateZone1HourPopoverSelection() {
  document.querySelectorAll('#zone1HourPopover [data-action="selectZone1Hour"]').forEach(b => {
    const val = JSON.parse(b.getAttribute('data-args'))[0];
    b.classList.toggle('selected', val === zone1HourFilter);
  });
}

function selectZone1Hour(value) {
  zone1HourFilter = value;
  const label = document.getElementById('zone1HourFilterLabel');
  if (label) label.textContent = value === 'all' ? 'Tất cả các giờ' : (String(value).padStart(2, '0') + ':00');
  toggleZone1HourPopover(false);
  renderZone1TripList();
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#zone1HourPopover') && !e.target.closest('#zone1HourFilterBtn')) {
    toggleZone1HourPopover(false);
  }
});

/* ===================== CHUYỂN MÀN "Đặt vé" <-> "Lịch sử hành khách" ===================== */
// ticketstaff không có #bookingView bọc riêng như callcenter (zone1/right-col nằm thẳng trong .main) nên
// ẩn/hiện từng phần thay vì chỉ đổi display của 1 wrapper. Tên hàm switchView(viewName) giữ đúng tên mà
// goToTripFromHistory() (shared/booking.js) đang gọi để tự chuyển về màn đặt vé khi cần.
function switchView(viewName) {
  if (viewName === currentView) return;
  // Rời khỏi tab Phơi xe khi đang ở chế độ chọn "phơi mẫu" (tạo hàng loạt) — thoát luôn chế độ chọn để
  // tránh trạng thái treo lơ lửng khi quay lại tab này lần sau (chuyển từ callcenter.js qua).
  if (currentView === 'phoi' && viewName !== 'phoi' && phoiBulkMode) toggleBulkTemplateMode();
  currentView = viewName;

  const zone1 = document.querySelector('aside.zone1');
  const zone1Toggle = document.getElementById('zone1ToggleBtn');
  const rightCol = document.querySelector('.right-col');
  const historyView = document.getElementById('historyView');
  const pickupView = document.getElementById('pickupView');
  const phoiView = document.getElementById('phoiView');
  const tabBooking = document.getElementById('tabBooking');
  const tabPickup = document.getElementById('tabPickup');
  const tabHistory = document.getElementById('tabHistory');
  const tabPhoi = document.getElementById('tabPhoi');
  const searchInput = document.getElementById('searchInput');

  if (searchInput) searchInput.value = '';

  if (tabBooking) tabBooking.classList.remove('active');
  if (tabPickup) tabPickup.classList.remove('active');
  if (tabHistory) tabHistory.classList.remove('active');
  if (tabPhoi) tabPhoi.classList.remove('active');

  if (historyView) historyView.style.display = 'none';
  if (pickupView) pickupView.style.display = 'none';
  if (phoiView) phoiView.style.display = 'none';

  if (viewName === 'history') {
    if (zone1) zone1.style.display = 'none';
    if (zone1Toggle) zone1Toggle.style.display = 'none';
    if (rightCol) rightCol.style.display = 'none';
    if (historyView) historyView.style.display = 'flex';
    if (tabHistory) tabHistory.classList.add('active');
    if (searchInput) searchInput.placeholder = 'Tìm tên, SĐT trong lịch sử...';
    openPassengerHistoryView();
  } else if (viewName === 'pickup') {
    if (zone1) zone1.style.display = 'none';
    if (zone1Toggle) zone1Toggle.style.display = 'none';
    if (rightCol) rightCol.style.display = 'none';
    if (pickupView) pickupView.style.display = 'flex';
    if (tabPickup) tabPickup.classList.add('active');
    if (searchInput) searchInput.placeholder = 'Tìm tên, SĐT khách trung chuyển...';
    const pkOpenPickupBtn = document.getElementById('pkOpenPickupBtn');
    if (pkOpenPickupBtn) pkOpenPickupBtn.style.display = pkIsShuttleDispatchRole() ? 'none' : '';
    pkRenderCalendar();
    pkRenderPaxTable();
  } else if (viewName === 'phoi') {
    if (zone1) zone1.style.display = 'none';
    if (zone1Toggle) zone1Toggle.style.display = 'none';
    if (rightCol) rightCol.style.display = 'none';
    if (phoiView) phoiView.style.display = 'flex';
    if (tabPhoi) tabPhoi.classList.add('active');
    if (searchInput) searchInput.placeholder = 'Tìm kiếm phơi xe...';
    applyFilters();
  } else {
    if (zone1) zone1.style.display = '';
    if (zone1Toggle) zone1Toggle.style.display = '';
    if (rightCol) rightCol.style.display = '';
    if (tabBooking) tabBooking.classList.add('active');
    if (searchInput) searchInput.placeholder = 'Tìm kiếm theo SĐT, Mã vé, Tên hành khách...';
  }
}

/* ===================== PHƠI XE MANAGEMENT (chuyển từ callcenter.js qua) ===================== */

// Routes / Hướng đi — TRƯỚC ĐÂY khai báo cứng ở đây; NAY đọc từ store dùng chung (js/shared/fleet-store.js)
// để trang Admin quản trị được và đồng bộ sang cả ticketstaff/shuttle. Builder trả về ĐÚNG shape cũ nên
// mọi chỗ đọc ROUTES_CFG / TRIP_DIRECTIONS_CFG bên dưới không phải sửa. reloadFleetCfg() dựng lại khi
// Admin sửa ở tab khác (xem listener 'storage' phía trên). Seed lần đầu = đúng giá trị hard-code cũ.
let ROUTES_CFG = FleetStore.buildRoutesCfg();

// Cấu hình "Hướng đi" cho modal Tạo phơi xe (singleModal) — key = id HƯỚNG CHÍNH (Admin quản trị),
// shape { [dirId]: {label,route,sense,price,fromStations,toStations,pickupStations,routeLabels} }.
// Dropdown chỉ có 4 hướng chính; Trạm đi/Trạm đến là TỔNG HỢP mọi trạm ở địa điểm điểm-đi/điểm-đến
// của hướng (xem FleetStore.buildDirTripCfg). Chỉ gồm hướng đang bật.
let TRIP_DIRECTIONS_CFG = FleetStore.buildDirTripCfg();

// Dựng lại các cấu hình trên khi Admin sửa Hướng/Tuyến (gọi từ listener 'storage' và sau khi Admin cùng máy đổi dữ liệu).
function reloadFleetCfg() {
  ROUTES_CFG = FleetStore.buildRoutesCfg();
  TRIP_DIRECTIONS_CFG = FleetStore.buildDirTripCfg();
  reloadDirectionLabels();
  refreshTripMetaFilters();
  if (typeof populateDirectionFilter === 'function') populateDirectionFilter();
}

// Global variables specific to Phơi xe
let phoiBulkMode = false; // chế độ chọn "phơi mẫu" để tạo hàng loạt — xem toggleBulkTemplateMode()
let bulkTemplateIds = [];
// true khi modal "Tạo phơi xe" đang mở ở chế độ TẠO PHƠI MẪU (nút "Tạo phơi mẫu", chỉ hiện lúc tạo
// hàng loạt) — saveSingleTrip() sẽ gắn isTemplate:true cho phơi mới. Reset ở openSingleModal/openEditModal.
let templateModalMode = false;
let phoiFilterDebounceTimer = null;

// refreshTripMetaFilters()/renderZone1TripList() đã có sẵn ở trên (đọc chung allTripsMeta) — hàm này chỉ
// là 1 wrapper giữ đúng tên gọi refreshTripsList() như code gốc bên callcenter.js.
function refreshTripsList() {
  refreshTripMetaFilters();
  renderZone1TripList();
}

// saveSeatBank() (js/shared/seat-bank.js) đã lưu tripSeatBank vào HN_STORAGE_KEY — chỉ cần tự lưu thêm
// allTripsMeta vào HN_TRIPS_KEY ở đây, không lặp lại literal localStorage.setItem cho HN_STORAGE_KEY.
function saveData() {
  TripService.save(allTripsMeta);
  saveSeatBank();
}

function generateNewEmptyPlan(vehicleType, priceValue = 280000) {
  const codes = getSeatCodesForVehicleType(vehicleType);
  const buildFloor = floorCodes => floorCodes.map(code => {
    if (code.endsWith('_hidden')) return { code, state: 'hidden' };
    return {
      code,
      state: 'empty',
      locked: false,
      price: priceValue,
      callState: null,
      firstStop: null,
      lastStop: null,
      staff: null,
      customerName: null,
      note: null,
      count: 1,
      pickupTime: null,
      phone: null,
      ticketNo: null,
      paid: false,
      hasLuggage: false
    };
  });
  return {
    down: buildFloor(codes.down),
    up: buildFloor(codes.up)
  };
}

// Đổ 4 hướng cố định vào bộ lọc "Hướng đi" của tab Phơi xe (#filterDirection) — từ FleetStore, giữ lựa
// chọn hiện tại. Gọi khi tải trang + khi Admin sửa Hướng (reloadFleetCfg).
function populateDirectionFilter() {
  const sel = document.getElementById("filterDirection");
  if (!sel) return;
  const cur = sel.value;
  const dirs = FleetStore.getDirections()
    .filter(d => d && d.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  sel.innerHTML = '<option value="">Tất cả hướng</option>' +
    dirs.map(d => `<option value="${d.id}">${d.label}</option>`).join('');
  sel.value = dirs.some(d => d.id === cur) ? cur : '';
}

// Đổ danh mục trạm (FleetStore) vào các <select> chọn Trạm đi/Trạm đến của tab "Rước liền" — phần này
// KHÔNG gắn với 1 phơi cụ thể (là hàng chờ rước của nhiều chuyến) nên vẫn dùng cả danh mục. Panel đặt vé
// và modal Đặt lại vé thì lọc theo tuyến của phơi đang mở — xem populateBookingStationDatalists()/
// populateRebookStationSelects(). Giữ nguyên option "tất cả"/"chọn..." đầu tiên.
function populateStationPickers() {
  if (!window.FleetStore) return;
  const seen = {};
  const names = [];
  FleetStore.getStations().forEach(s => {
    const n = s && s.name;
    if (n && !seen[n]) { seen[n] = true; names.push(n); }
  });
  const optTags = names.map(n => `<option value="${n}">${n}</option>`).join('');
  const fillSelect = id => {
    const el = document.getElementById(id);
    if (!el) return;
    const keep = el.querySelector('option[value=""], option[value="all"]');
    const prev = el.value;
    el.innerHTML = (keep ? keep.outerHTML : '') + optTags;
    if (prev && names.indexOf(prev) !== -1) el.value = prev;
  };
  ['pkFilterFromStation', 'pkFilterToStation', 'pickupStation', 'pickupDestination'].forEach(fillSelect);
}

// Trạm theo VÙNG của HƯỚNG (region-wide): Trạm đi = mọi trạm vùng xuất phát, Trạm đến = mọi trạm vùng
// điểm đến. Route rỗng / hướng lạ → trả cả danh mục.
function stationsForRoute(route) {
  const dedupe = arr => { const seen = {}; return (arr || []).filter(n => n && !seen[n] && (seen[n] = true)); };
  const allNames = () => dedupe((window.FleetStore ? FleetStore.getStations() : []).map(s => s && s.name));
  if (!route || !window.FleetStore) { const all = allNames(); return { from: all, to: all }; }
  let from = [], to = [];
  try {
    const dirId = FleetStore.getRouteDirectionId(route) || tripDirectionId(route);
    const cfg = FleetStore.buildDirTripCfg()[dirId];
    if (cfg) {
      from = dedupe(cfg.fromStations);
      to = dedupe(cfg.toStations);
    }
  } catch (e) { /* fallback dưới */ }
  if (!from.length && !to.length) { const all = allNames(); return { from: all, to: all }; }
  return { from: from, to: to };
}

// Trạm ĐI / ĐẾN cho panel đặt vé của 1 PHƠI cụ thể:
//   - Trạm đi : LUÔN = toàn bộ trạm vùng xuất phát của hướng (không đổi).
//   - Trạm đến: nếu phơi CÓ tick "Trạm có thể nhận thêm khách" (trip.pickupStations không rỗng) → chỉ
//               gồm Trạm đến chính + các trạm đã tick đó; ngược lại (phơi cũ / chưa tick) → toàn bộ
//               trạm vùng điểm đến như trước.
function stationsForTrip(trip) {
  const base = stationsForRoute(trip && trip.route);
  const picks = (trip && Array.isArray(trip.pickupStations)) ? trip.pickupStations.filter(Boolean) : [];
  if (!picks.length) return base;
  const seen = {};
  const to = [trip.toStation].concat(picks).filter(s => s && !seen[s] && (seen[s] = true));
  return { from: base.from, to: to };
}

// Panel đặt vé (Zone 4): gợi ý Trạm đi/Trạm đến theo phơi đang mở (xem stationsForTrip).
function populateBookingStationDatalists(trip) {
  const { from, to } = stationsForTrip(trip);
  const tags = names => names.map(n => `<option value="${n}"></option>`).join('');
  const depEl = document.getElementById('departureStationList');
  const destEl = document.getElementById('destinationStationList');
  if (depEl) depEl.innerHTML = tags(from);
  if (destEl) destEl.innerHTML = tags(to);
}

// Modal "Đặt lại vé": Trạm đi/Trạm đến theo phơi ĐÍCH đang chọn (cùng quy tắc stationsForTrip); giữ lại
// giá trị đang chọn nếu vẫn hợp lệ, còn setSelectOptionValue() sau đó vẫn tự thêm nếu cần.
function populateRebookStationSelects(trip) {
  const { from, to } = stationsForTrip(trip);
  const fill = (id, names) => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    const list = (prev && names.indexOf(prev) === -1) ? [prev].concat(names) : names;
    el.innerHTML = list.map(n => `<option value="${n}">${n}</option>`).join('');
    if (prev && list.indexOf(prev) !== -1) el.value = prev;
  };
  fill('rbFirstStop', from);
  fill('rbLastStop', to);
}

// Direction selection for filters and modals
function onFilterDirectionChange() {
  const dir = document.getElementById("filterDirection").value;
  const routeSelect = document.getElementById("filterRoute");
  routeSelect.innerHTML = '<option value="">Tất cả tuyến</option>';

  // dir = id HƯỚNG (1 trong 4) — tuyến con lấy từ TRIP_DIRECTIONS_CFG (FleetStore.buildDirTripCfg).
  const labels = (dir && TRIP_DIRECTIONS_CFG[dir] && TRIP_DIRECTIONS_CFG[dir].routeLabels) || [];
  labels.forEach(l => { routeSelect.innerHTML += `<option value="${l}">${l}</option>`; });
}

function onModalDirectionChange(modalType) {
  const dir = document.getElementById(modalType === 'single' ? "tripDirection" : "bulkDirection").value;
  const routeSelect = document.getElementById(modalType === 'single' ? "tripRoute" : "bulkRoute");
  routeSelect.innerHTML = '<option value="">-- Chọn tuyến --</option>';

  if (dir && ROUTES_CFG[dir]) {
    ROUTES_CFG[dir].forEach(r => {
      routeSelect.innerHTML += `<option value="${r.label}">${r.label}</option>`;
    });
  }
}

function onRouteSelect(modalType) {
  const dir = document.getElementById(modalType === 'single' ? "tripDirection" : "bulkDirection").value;
  const routeVal = document.getElementById(modalType === 'single' ? "tripRoute" : "bulkRoute").value;
  const priceInput = document.getElementById(modalType === 'single' ? "tripPrice" : "bulkPrice");

  if (dir && routeVal && ROUTES_CFG[dir]) {
    const routeObj = ROUTES_CFG[dir].find(r => r.label === routeVal);
    if (routeObj) {
      priceInput.value = routeObj.price;
    }
  }
  if (modalType === 'single') {
    updateSingleTripNameSuggestion();
  }
}

// Đổ danh sách "Hướng đi" (modal Tạo phơi xe đơn) = 4 HƯỚNG CHÍNH từ TRIP_DIRECTIONS_CFG — gọi lại mỗi
// lần mở modal (openSingleModal/openEditModal) thay vì đổ 1 lần lúc nạp trang, để không phụ thuộc thứ
// tự script chạy trước/sau khi HTML đã sẵn sàng.
function populateTripDirectionSelect() {
  const sel = document.getElementById("tripDirection");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Chọn hướng --</option>' +
    Object.keys(TRIP_DIRECTIONS_CFG).map(key => `<option value="${key}">${TRIP_DIRECTIONS_CFG[key].label}</option>`).join('');
}

// Chọn "Hướng đi" xong: Trạm đi = tổng hợp mọi trạm ở địa điểm điểm-đi, Trạm đến = mọi trạm ở địa điểm
// điểm-đến (xem TRIP_DIRECTIONS_CFG) — đổi hướng thì đổ lại 2 ô trạm + giá vé mặc định của hướng. Danh
// sách "trạm có thể rước" CHƯA hiện: phải chọn xong Trạm đi + Trạm đến để xác định tuyến chính đã.
function onTripDirectionChange() {
  const dirKey = document.getElementById("tripDirection").value;
  const fromSel = document.getElementById("tripFromStation");
  const toSel = document.getElementById("tripToStation");
  const priceInput = document.getElementById("tripPrice");
  const resolvedEl = document.getElementById("tripResolvedRoute");
  const cfg = TRIP_DIRECTIONS_CFG[dirKey];
  if (resolvedEl) resolvedEl.value = '';

  if (!cfg) {
    fromSel.innerHTML = '<option value="">-- Chọn hướng đi trước --</option>';
    toSel.innerHTML = '<option value="">-- Chọn hướng đi trước --</option>';
    renderPickupStationPills([]);
    return;
  }

  fromSel.innerHTML = '<option value="">-- Chọn trạm đi --</option>' +
    cfg.fromStations.map(s => `<option value="${s}">${s}</option>`).join('');
  toSel.innerHTML = '<option value="">-- Chọn trạm đến --</option>' +
    cfg.toStations.map(s => `<option value="${s}">${s}</option>`).join('');
  renderPickupStationPills([], 'Chọn Trạm đi và Trạm đến để xem trạm có thể nhận');
  priceInput.value = cfg.price;

  updateSingleTripNameSuggestion();
}

// Đổi Trạm đi / Trạm đến → xác định "tuyến chính" khớp (trong số tuyến con của hướng) rồi hiện đúng
// "trạm có thể rước" của tuyến đó; đồng thời gợi ý lại tên phơi.
function onTripStationChange() {
  resolveTripRoute();
  updateSingleTripNameSuggestion();
}

// Suy "tuyến chính" từ (hướng, trạm đi, trạm đến): tuyến con nào có trạm đi ∈ fromStations và trạm đến
// ∈ toStations; nhiều tuyến khớp thì lấy tuyến CỤ THỂ nhất (ít trạm đến nhất → ít trạm nhất → order nhỏ).
// Không tuyến nào khớp → dùng tuyến chính của hướng, không có trạm rước.
function pickBestTripRoute(routes, from, to) {
  const hits = (routes || []).filter(r =>
    (r.fromStations || []).indexOf(from) !== -1 && (r.toStations || []).indexOf(to) !== -1);
  if (!hits.length) return null;
  hits.sort((a, b) =>
    (a.toStations || []).length - (b.toStations || []).length ||
    ((a.fromStations || []).length + (a.toStations || []).length) -
      ((b.fromStations || []).length + (b.toStations || []).length) ||
    (a.order || 0) - (b.order || 0));
  return hits[0];
}

// "Trạm có thể nhận thêm khách" khi tạo phơi = TOÀN BỘ trạm phía điểm đến của hướng — dùng chung
// FleetStore.pickupStationsForDirection() (xem fleet-store.js). GIỮ nguyên cả Trạm đi/Trạm đến.
function pickupPoolForDirection(dirId) {
  try {
    if (window.FleetStore && typeof FleetStore.pickupStationsForDirection === 'function') {
      return FleetStore.pickupStationsForDirection(dirId) || [];
    }
  } catch (e) { /* fallback */ }
  return [];
}

// extraPickups: trạm rước đã lưu của phơi cũ — gộp thêm để lúc SỬA phơi vẫn tick lại được dù trạm đó
// không nằm trong cụm điểm đến hiện tại (dữ liệu cũ).
function resolveTripRoute(extraPickups) {
  const dirId = document.getElementById("tripDirection").value;
  const cfg = TRIP_DIRECTIONS_CFG[dirId];
  const from = document.getElementById("tripFromStation").value;
  const to = document.getElementById("tripToStation").value;
  const resolvedEl = document.getElementById("tripResolvedRoute");
  const priceInput = document.getElementById("tripPrice");

  if (!cfg || !from || !to) {
    if (resolvedEl) resolvedEl.value = '';
    renderPickupStationPills([], 'Chọn Trạm đi và Trạm đến để xem trạm có thể nhận');
    return;
  }

  const matched = pickBestTripRoute(cfg.routes, from, to);
  const routeLabel = (matched && matched.label) || cfg.route || '';
  if (resolvedEl) resolvedEl.value = routeLabel;
  if (matched && matched.price != null) priceInput.value = matched.price;

  // Toàn bộ trạm phía điểm đến của hướng + trạm rước đã lưu (khi sửa phơi), khử trùng lặp.
  const seen = {};
  const pickups = pickupPoolForDirection(dirId).concat(extraPickups || [])
    .filter(s => s && !seen[s] && (seen[s] = true));
  renderPickupStationPills(pickups, 'Hướng này chưa có trạm nào ở điểm đến');
}

// "Trạm có thể nhận thêm khách" hiện dạng chip checkbox nằm ngang (không phải <select multiple> cao
// lêu nghêu) — mỗi chip tự đổi màu qua class "checked" khi tick (xem toggleStationPill bên dưới), vì
// component chọn nhiều bằng checkbox không có trạng thái ":checked" ở cấp <label> để CSS tự bắt được.
function renderPickupStationPills(stations, emptyMsg) {
  const container = document.getElementById("tripPickupStations");
  if (!container) return;
  if (!stations || !stations.length) {
    container.innerHTML = `<span class="station-pick-empty">${emptyMsg || 'Không có trạm dọc đường'}</span>`;
    return;
  }
  container.innerHTML = stations.map(s => `
    <label class="station-pick-pill">
      <input type="checkbox" value="${s}" data-change-action="toggleStationPill" data-args='["__this__"]'>
      ${s}
    </label>`).join('');
}

function toggleStationPill(checkbox) {
  const pill = checkbox.closest('.station-pick-pill');
  if (pill) pill.classList.toggle('checked', checkbox.checked);
}

// Tên phơi tự cập nhật theo đúng format "Trạm đi - Trạm đến" mỗi khi 1 trong 2 ô đổi — nhân viên vẫn
// gõ tay đè lên được sau đó nếu muốn tên khác, chỉ auto-fill lại khi Trạm đi/Trạm đến đổi tiếp.
function updateSingleTripNameSuggestion() {
  const fromVal = document.getElementById("tripFromStation").value;
  const toVal = document.getElementById("tripToStation").value;
  const timeVal = document.getElementById("tripTime").value;
  const nameInput = document.getElementById("tripName");
  if (!fromVal || !toVal) return;
  // Có kèm giờ khởi hành trong tên gợi ý (nếu đã chọn giờ) — thiếu giờ khiến 2 phơi cùng tuyến, cùng
  // ngày nhưng khác giờ (VD 07:00 và 08:30) bị gợi ý trùng tên nhau, dẫn tới báo lỗi trùng tên (BR-01)
  // sai khi lưu phơi thứ 2 dù đây là 2 chuyến khác nhau.
  nameInput.value = timeVal ? `${fromVal} - ${toVal} (${timeVal})` : `${fromVal} - ${toVal}`;
}

// Search Filters implementation
function applyFilters() {
  const filterNameEl = document.getElementById("filterName");
  const filterNameVal = filterNameEl ? filterNameEl.value.trim().toLowerCase() : '';
  const searchInput = document.getElementById("searchInput");
  const searchInputVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const fName = filterNameVal || searchInputVal;

  const filterDateEl = document.getElementById("filterDate");
  const fDate = filterDateEl ? filterDateEl.value : '';
  const filterDirEl = document.getElementById("filterDirection");
  const fDir = filterDirEl ? filterDirEl.value : '';
  const filterRouteEl = document.getElementById("filterRoute");
  const fRoute = filterRouteEl ? filterRouteEl.value : '';
  const filterStatusEl = document.getElementById("filterStatus");
  const fStatus = filterStatusEl ? filterStatusEl.value : '';

  if (!Array.isArray(allTripsMeta)) allTripsMeta = [];

  const filtered = allTripsMeta.filter(t => {
    if (!t) return false;

    // Chế độ chọn "phơi mẫu" (tạo hàng loạt) luôn hiện đủ toàn bộ danh sách mẫu cố định (isTemplate:true,
    // xem constants.js), bỏ qua mọi bộ lọc tên/ngày/hướng/tuyến đang để dở trên thanh lọc — nếu không,
    // bấm "Tạo phơi xe hàng loạt" lúc đang lọc dở (VD đổi "Ngày khởi hành" sang hôm khác) sẽ lọc mất hết
    // mẫu do các bộ lọc đó vốn để tìm phơi thật, không áp dụng được cho danh sách mẫu.
    if (phoiBulkMode) return t.isTemplate && t.status !== 'Đã hủy';

    // Ngoài chế độ chọn hàng loạt: KHÔNG hiện "phơi mẫu" trong danh sách phơi thường — danh sách này
    // phải trùng đúng tập chuyến hiện ở Zone 1 (refreshTripMetaFilters cũng đã loại isTemplate).
    if (t.isTemplate) return false;

    const bankMeta = (typeof tripSeatBank === 'object' && tripSeatBank) ? tripSeatBank[t.id] : null;
    const timeStr = t.time || '';
    const routeStr = t.route || '';
    // Tìm theo biển số / loại xe: ưu tiên giá trị THỰC ở sơ đồ ghế (khớp thẻ hiển thị + Zone 1).
    const plateStr = (bankMeta && bankMeta.plate) || t.plate || '';
    const vehicleTypeStr = (bankMeta && bankMeta.vehicleType) || t.vehicleType || '';

    if (fName) {
      const matchName = timeStr.toLowerCase().includes(fName) ||
        routeStr.toLowerCase().includes(fName) ||
        plateStr.toLowerCase().includes(fName) ||
        vehicleTypeStr.toLowerCase().includes(fName);
      let abbr = '';
      if (typeof ROUTES_CFG === 'object' && ROUTES_CFG) {
        Object.keys(ROUTES_CFG).forEach(k => {
          if (Array.isArray(ROUTES_CFG[k])) {
            const found = ROUTES_CFG[k].find(r => r.label === routeStr);
            if (found) abbr = found.abbr;
          }
        });
      }
      const timeFormatted = timeStr ? timeStr.replace(':', 'h') : '';
      const suggestedName = `${abbr} ${timeFormatted}`.trim().toLowerCase();
      const customNameMatches = t.name ? t.name.toLowerCase().includes(fName) : suggestedName.includes(fName);

      if (!matchName && !customNameMatches) return false;
    }

    // Lọc đúng theo ngày đã chọn — kể cả khi ngày đó trùng hôm nay (trước đây "hôm nay" bị coi là giá
    // trị mặc định "bỏ qua lọc ngày", khiến danh sách trộn lẫn phơi của mọi ngày lại với nhau).
    if (fDate && t.date && t.date !== fDate) return false;

    if (fDir && tripDirectionId(routeStr) !== fDir) return false;

    if (fRoute && routeStr !== fRoute) return false;

    // Lọc theo ĐÚNG trạng thái đang hiển thị trên thẻ (suy từ vòng đời + biển số + vé), không theo
    // chuỗi t.status lưu sẵn — để bộ lọc khớp với những gì nhân viên thấy.
    if (fStatus) {
      const dispLabel = (TRIP_DISPLAY_STATUS[tripDisplayStatusKey(t.id)] || {}).label || (t.status || 'Chưa chỉ định');
      if (dispLabel !== fStatus) return false;
    }

    return true;
  });

  // Phơi tạo gần nhất (createdAt lớn nhất) lên đầu — thay vì sắp theo giờ khởi hành như trước, để nhân
  // viên thấy ngay phơi vừa tạo đơn/tạo hàng loạt mà không phải dò tìm trong danh sách.
  filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  renderTable(filtered);
}

// Đưa thanh lọc phơi xe về mặc định
function resetPhoiFilters() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('filterName', '');
  setVal('filterDate', '');
  setVal('filterDirection', '');
  setVal('filterStatus', '');
  onFilterDirectionChange(); // dựng lại option của filterRoute theo đúng trạng thái "Tất cả"
  applyFilters();
}

// Card grid rendering
function renderTable(trips) {
  const grid = document.getElementById("tripsCardGrid");
  const emptyState = document.getElementById("emptyState");
  if (!grid) return;
  grid.innerHTML = '';

  if (!Array.isArray(trips) || trips.length === 0) {
    if (emptyState) emptyState.style.display = "flex";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  trips.forEach((t) => {
    if (!t) return;
    const timeStr = t.time || '00:00';
    const routeStr = t.route || '';
    const timeFormatted = timeStr.replace(':', 'h');

    const displayName = t.name || `${routeStr} (${timeFormatted})`;

    const plan = (typeof tripSeatBank === 'object' && tripSeatBank) ? tripSeatBank[t.id] : null;
    let emptyCount = 0;
    let totalCount = 0;
    if (plan && Array.isArray(plan.down) && Array.isArray(plan.up)) {
      const combined = [...plan.down, ...plan.up];
      emptyCount = combined.filter(s => s.state === 'empty').length;
      totalCount = combined.filter(s => s.state !== 'hidden').length;
    } else {
      totalCount = (typeof VEHICLE_TYPE_SEATS === 'object' && VEHICLE_TYPE_SEATS && VEHICLE_TYPE_SEATS[t.vehicleType]) || 24;
      emptyCount = totalCount;
    }

    let formattedDate = '';
    if (t.date && typeof t.date === 'string') {
      const parts = t.date.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        formattedDate = t.date;
      }
    }

    // Trạng thái hiển thị THỐNG NHẤT với badge Zone 2 (renderTripLifecycleUI) — suy từ vòng đời phơi +
    // biển số + vé đã bán, KHÔNG đọc trực tiếp t.status (chuỗi lưu sẵn có thể lệch thực tế).
    const dispKey = tripDisplayStatusKey(t.id);
    const dispMeta = TRIP_DISPLAY_STATUS[dispKey] || TRIP_DISPLAY_STATUS['chua-chi-dinh'];
    const statusClass = dispMeta.phoi;
    const label = dispMeta.label;

    const sellDisabled = dispKey === 'da-huy';

    const card = document.createElement("div");
    card.setAttribute("data-id", t.id);

    // Chế độ chọn "phơi mẫu" để tạo hàng loạt (bật/tắt bằng nút "Tạo phơi xe hàng loạt") — thẻ phơi lược
    // bớt route-btn/footer, cả thẻ trở thành 1 điểm bấm chọn/bỏ chọn giống chọn ghế ở sơ đồ ghế, có dấu
    // tích ở góc phải trên báo trạng thái đã chọn (xem toggleBulkTemplateMode/toggleBulkTemplateSelect).
    if (phoiBulkMode) {
      const selected = bulkTemplateIds.includes(t.id);
      // Danh sách phơi MẪU: mọi thẻ luôn hiện trạng thái "Chưa chỉ định" (mẫu là bản thiết kế, không
      // mang trạng thái/biển số sống) — dữ liệu cũng đã được normalizeTemplateTrips() chuẩn hoá khi nạp.
      card.className = `phoi-card phoi-card-selectable status-chua-chi-dinh${selected ? ' selected' : ''}`;
      card.setAttribute("data-action", "toggleBulkTemplateSelect");
      card.setAttribute("data-args", JSON.stringify([t.id]));

      card.innerHTML = `
        <div class="phoi-card-select-check">${selected ? '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ''}</div>
        <div class="phoi-card-top">
          <div class="phoi-card-schedule">
            <div class="phoi-card-time-row">
              <span class="phoi-card-time">${timeStr}</span>
            </div>
            <span class="phoi-card-date">${formattedDate}</span>
          </div>
          <span class="status-badge chua-chi-dinh"><span class="status-dot"></span>Chưa chỉ định</span>
        </div>
        <div class="phoi-card-name">${displayName}</div>
        <div class="phoi-card-meta">
          <div class="phoi-card-meta-item">
            <label>Loại xe</label>
            <span>${t.vehicleType || '—'}</span>
          </div>
          <div class="phoi-card-meta-item">
            <label>Ghế trống</label>
            <span>${emptyCount}/${totalCount}</span>
          </div>
          <div class="phoi-card-meta-item">
            <label>Giá vé</label>
            <span>${(t.price || 280000).toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
      return;
    }

    card.className = `phoi-card status-${statusClass}`;
    card.addEventListener("dblclick", () => openEditModal(t.id));

    card.innerHTML = `
      <div class="phoi-card-top">
        <div class="phoi-card-schedule">
          <div class="phoi-card-time-row">
            <span class="phoi-card-time">${timeStr}</span>
            <span class="trip-plate-inline">${(plan && plan.plate) || t.plate || 'Chưa có'}</span>
          </div>
          <span class="phoi-card-date">${formattedDate}</span>
        </div>
        <button type="button" class="phoi-route-btn" title="Xem lộ trình" data-action="showTripRoute" data-stop-propagation="1" data-args='${JSON.stringify([t.id])}'>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
            <path d="M15 5.764v15.472" />
            <path d="M9 3.236v15.472" />
          </svg>
        </button>
        <span class="status-badge ${statusClass}"><span class="status-dot"></span>${label}</span>
      </div>
      <div class="phoi-card-name">${displayName}</div>
      <div class="phoi-card-meta">
        <div class="phoi-card-meta-item">
          <label>Loại xe</label>
          <span>${(plan && plan.vehicleType) || t.vehicleType || '—'}</span>
        </div>
        <div class="phoi-card-meta-item">
          <label>Ghế trống</label>
          <span>${emptyCount}/${totalCount}</span>
        </div>
        <div class="phoi-card-meta-item">
          <label>Giá vé</label>
          <span>${(t.price || 280000).toLocaleString('vi-VN')}đ</span>
        </div>
      </div>
      <div class="phoi-card-footer">
        <button type="button" class="btn btn-secondary phoi-edit-btn" data-action="openEditModal" data-stop-propagation="1" data-args='${JSON.stringify([t.id])}'>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Chỉnh sửa
        </button>
        <button type="button" class="btn btn-primary phoi-sell-btn" data-action="sellTicketForTrip" data-stop-propagation="1" data-args='${JSON.stringify([t.id])}' ${sellDisabled ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;">
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9Z" />
            <path d="M13 5v2M13 17v2M13 11v2" />
          </svg>
          Bán vé
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Nút "Hủy phơi xe" trong modal "Chỉnh sửa phơi xe" (chỉ hiện khi sửa phơi có sẵn — xem openEditModal).
function cancelTripFromModal() {
  const id = document.getElementById("editTripId").value;
  const trip = allTripsMeta.find(t => t.id === id);
  if (!trip) return;

  if (trip.status === 'Khởi hành' || trip.status === 'Đã khởi hành') {
    alert("Lỗi: Không được hủy phơi xe đã khởi hành.");
    return;
  }
  if (trip.status === 'Đã hủy') {
    alert("Phơi xe đã ở trạng thái Hủy.");
    return;
  }

  const plan = tripSeatBank[id];
  let bookedCount = 0;
  if (plan) {
    const combined = [...plan.down, ...plan.up];
    bookedCount = combined.filter(s => ['sold', 'hold', 'free', 'cargo'].includes(s.state)).length;
  }

  let confirmed = false;
  if (bookedCount > 0) {
    confirmed = confirm(`CẢNH BÁO (BR-07): Phơi xe này đang có ${bookedCount} ghế đã bán/đặt. Bạn có chắc chắn muốn HỦY phơi xe này và bồi thường/chuyển khách?`);
    if (confirmed) {
      confirmed = confirm("Xác nhận hủy phơi xe một lần nữa (Thao tác không thể hoàn tác)?");
    }
  } else {
    confirmed = confirm(`Bạn có chắc chắn muốn hủy phơi xe "${trip.name || trip.time}"?`);
  }

  if (confirmed) {
    trip.status = 'Đã hủy';
    saveData();
    refreshTripsList();
    applyFilters();
    closeSingleModal();
  }
}

// Nút "Bán vé" trên thẻ phơi (trang Phơi xe) — chuyển sang tab Đặt vé và chọn sẵn đúng phơi đó ở Zone 1
// để nhân viên bán vé ngay, không phải tự tìm lại chuyến trong danh sách.
function sellTicketForTrip(tripId) {
  if (typeof selectZone1Hour === 'function') selectZone1Hour('all');
  switchView('booking');

  const trip = allTripsMeta.find(t => t.id === tripId);

  // Zone 1 chỉ hiện phơi của HƯỚNG đang chọn — phải chuyển sang đúng hướng chứa phơi đích rồi render lại,
  // nếu không thẻ phơi được chọn ngầm nhưng không nằm trong danh sách đang hiển thị.
  if (trip) {
    updateTripListForDirection(tripDirectionId(trip.route));
    const dirInput = document.getElementById('directionTrigger');
    if (dirInput && directionLabels[selectedDirection]) dirInput.value = directionLabels[selectedDirection];
  }

  const cardEl = document.querySelector(`.trip-card[data-trip="${tripId}"]`);
  if (cardEl) {
    selectTrip(cardEl, trip ? trip.time : '', trip ? trip.route : '');
    cardEl.scrollIntoView({ block: 'nearest' });
  } else {
    showToast('Không tìm thấy phơi xe này trong danh sách đặt vé.');
  }
}

// Icon bản đồ trên thẻ phơi — mở modal xem lộ trình (điểm xuất phát, các điểm đón dọc đường, điểm đến)
// dựng từ đúng dữ liệu đã lưu khi tạo/sửa phơi (trip.fromStation/toStation/pickupStations).
const TRIP_ROUTE_STEP_ICONS = {
  start: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.86-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.14-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>',
  end: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/></svg>'
};

function renderTripRouteStep(step) {
  return `
    <div class="trip-route-step ${step.type}">
      <div class="trip-route-step-marker">${TRIP_ROUTE_STEP_ICONS[step.type]}</div>
      <div class="trip-route-step-body">
        <div class="trip-route-step-label">${step.label}</div>
        <div class="trip-route-step-name">${step.name}</div>
      </div>
    </div>
  `;
}

function showTripRoute(tripId) {
  const trip = allTripsMeta.find(t => t.id === tripId);
  if (!trip) return;

  const nameEl = document.getElementById('tripRouteName');
  const metaEl = document.getElementById('tripRouteMeta');
  const timelineEl = document.getElementById('tripRouteTimeline');
  if (!timelineEl) return;

  if (nameEl) nameEl.textContent = trip.name || `${trip.route} (${trip.time})`;

  let formattedDate = '';
  if (trip.date && typeof trip.date === 'string') {
    const parts = trip.date.split('-');
    if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  if (metaEl) metaEl.textContent = [trip.time, formattedDate, trip.plate].filter(Boolean).join(' • ');

  const steps = [];
  if (trip.fromStation) steps.push({ type: 'start', label: 'Điểm xuất phát', name: trip.fromStation });
  (Array.isArray(trip.pickupStations) ? trip.pickupStations : []).forEach(s => {
    steps.push({ type: 'stop', label: 'Điểm đón khách', name: s });
  });
  if (trip.toStation) steps.push({ type: 'end', label: 'Điểm đến', name: trip.toStation });

  timelineEl.innerHTML = steps.length
    ? steps.map(renderTripRouteStep).join('')
    : `<p class="trip-route-empty">Chưa có thông tin lộ trình chi tiết cho phơi xe này.</p>`;

  document.getElementById('tripRouteModal').classList.add('open');
}

// Đổ <select id="tripVehicleType"> từ store — giữ đúng "3 loại nổi bật" cũ qua cờ featuredForTrip
// (Admin có thể gắn cờ cho loại khác). Giữ nguyên giá trị đang chọn nếu có.
function populateTripVehicleTypeSelect() {
  const sel = document.getElementById('tripVehicleType');
  if (!sel || !window.FleetStore) return;
  const cur = sel.value;
  let types = FleetStore.getVehicleTypes({ scope: 'line' }).filter(v => v.active !== false && v.featuredForTrip);
  if (!types.length) types = FleetStore.getVehicleTypes({ scope: 'line' }).filter(v => v.active !== false);
  sel.innerHTML = types.map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`).join('');
  if (cur && types.some(v => v.name === cur)) sel.value = cur;
}

// Chèn 1 <option> tạm nếu giá trị cần chọn không có sẵn trong <select> (lưới an toàn cho dữ liệu cũ).
function ensureSelectOption(selectId, value) {
  if (!value) return;
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const has = Array.prototype.some.call(sel.options, o => o.value === value);
  if (!has) sel.add(new Option(value, value));
}

// Single Modal triggers
function openSingleModal() {
  templateModalMode = false;
  document.getElementById("singleModalTitle").textContent = "Tạo phơi xe mới";
  document.getElementById("singleForm").reset();
  document.getElementById("editTripId").value = '';
  document.getElementById("editStatusRow").style.display = "none";
  const dateGroup = document.getElementById("tripDateGroup");
  if (dateGroup) dateGroup.style.display = "";
  document.getElementById("btnSaveSingle").disabled = false;
  document.getElementById("btnCancelTrip").style.display = "none";

  populateTripVehicleTypeSelect();
  populateTripDirectionSelect();
  onTripDirectionChange();

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("tripDate").value = today;
  document.getElementById("singleModal").classList.add("active");
  document.getElementById("singleModal").classList.add("open");
}

// Nút "Tạo phơi mẫu" (chỉ hiện ở chế độ tạo hàng loạt) — dùng lại modal "Tạo phơi xe", ẩn ô "Ngày khởi
// hành" (mẫu không gắn ngày cụ thể), đổi tiêu đề. Lưu ra phơi có isTemplate:true, luôn "Chưa chỉ định".
function openTemplateModal() {
  openSingleModal();
  templateModalMode = true;
  document.getElementById("singleModalTitle").textContent = "Tạo phơi mẫu";
  const dateGroup = document.getElementById("tripDateGroup");
  if (dateGroup) dateGroup.style.display = "none";
}

function closeSingleModal() {
  document.getElementById("singleModal").classList.remove("active");
  document.getElementById("singleModal").classList.remove("open");
}

function openEditModal(id) {
  const trip = allTripsMeta.find(t => t.id === id);
  if (!trip) return;

  templateModalMode = false;
  document.getElementById("singleModalTitle").textContent = "Chỉnh sửa phơi xe";
  document.getElementById("editTripId").value = id;
  document.getElementById("editStatusRow").style.display = "flex";
  const dateGroup = document.getElementById("tripDateGroup");
  if (dateGroup) dateGroup.style.display = "";

  document.getElementById("tripDate").value = trip.date || '';
  document.getElementById("tripTime").value = trip.time || '';
  populateTripVehicleTypeSelect();
  ensureSelectOption("tripVehicleType", trip.vehicleType); // phơi cũ có loại xe không nằm trong danh sách nổi bật
  document.getElementById("tripVehicleType").value = trip.vehicleType || 'Limousine 24 Phòng';
  document.getElementById("tripNote").value = trip.note || '';

  document.getElementById("tripStatus").value = trip.status || 'Chưa chỉ định';
  document.getElementById("tripPlate").value = trip.plate || '';

  // Suy ngược HƯỚNG CHÍNH từ chuỗi route đã lưu: khớp nhãn tuyến chính, hoặc nằm trong danh sách tuyến
  // con của hướng (phơi cũ tạo khi còn chọn theo tuyến). Không khớp → để trống cho nhân viên chọn lại.
  populateTripDirectionSelect();
  const dirKey = Object.keys(TRIP_DIRECTIONS_CFG).find(k => {
    const c = TRIP_DIRECTIONS_CFG[k];
    return c.route === trip.route || (c.routeLabels || []).indexOf(trip.route) !== -1;
  }) || '';
  document.getElementById("tripDirection").value = dirKey;
  onTripDirectionChange();

  document.getElementById("tripFromStation").value = trip.fromStation || '';
  document.getElementById("tripToStation").value = trip.toStation || '';
  // Suy lại "tuyến chính" + đổ danh sách trạm có thể nhận cho đúng phơi này (gộp thêm trạm đã lưu để
  // dữ liệu cũ vẫn tick lại được), RỒI mới tick lại các trạm đã lưu.
  const savedPickups = Array.isArray(trip.pickupStations) ? trip.pickupStations : [];
  resolveTripRoute(savedPickups);
  document.querySelectorAll("#tripPickupStations input[type='checkbox']").forEach(cb => {
    cb.checked = savedPickups.includes(cb.value);
    cb.closest('.station-pick-pill').classList.toggle('checked', cb.checked);
  });

  // Ghi đè lại giá vé/tên phơi thật của phơi này — onTripDirectionChange()/resolveTripRoute() ở trên vừa
  // set giá mặc định theo hướng/tuyến nên phải set lại SAU, nếu không sẽ mất giá vé thật đã lưu trước đó.
  document.getElementById("tripPrice").value = trip.price || 280000;
  document.getElementById("tripName").value = trip.name || '';

  const isReadOnly = (trip.status === 'Khởi hành' || trip.status === 'Đã khởi hành' || trip.status === 'Đã hủy');
  const inputs = document.querySelectorAll("#singleForm input, #singleForm select, #singleForm button[type='submit']");
  inputs.forEach(el => {
    if (el.id !== 'btnSaveSingle') el.disabled = isReadOnly;
  });
  document.getElementById("btnSaveSingle").disabled = isReadOnly;

  const btnCancelTrip = document.getElementById("btnCancelTrip");
  btnCancelTrip.style.display = "";
  btnCancelTrip.disabled = isReadOnly;

  document.getElementById("singleModal").classList.add("active");
  document.getElementById("singleModal").classList.add("open");
}

// Cập nhật phơi đã có. Trả về false nếu người dùng huỷ xác nhận đổi loại xe (báo cho saveSingleTrip
// dừng lại, không lưu/đóng modal) — giữ đúng hành vi early-return của bản gốc.
function updateExistingTrip(id, fields) {
  const { finalName, dateVal, routeVal, fromStationVal, toStationVal, pickupStationsVal, timeVal, vehicleVal, priceVal, noteVal, statusVal, plateVal } = fields;
  const tripIdx = allTripsMeta.findIndex(t => t.id === id);
  if (tripIdx === -1) return true;
  const trip = allTripsMeta[tripIdx];

  trip.name = finalName;
  trip.date = dateVal;
  trip.route = routeVal;
  trip.fromStation = fromStationVal;
  trip.toStation = toStationVal;
  trip.pickupStations = pickupStationsVal;
  trip.time = timeVal;
  trip.price = priceVal;
  trip.note = noteVal;
  trip.status = statusVal;

  if (trip.vehicleType !== vehicleVal) {
    const confirmed = confirm("Cảnh báo: Thay đổi loại xe sẽ xoá toàn bộ sơ đồ ghế cũ và sinh lại ghế trống mới. Tiếp tục?");
    if (!confirmed) return false;
    trip.vehicleType = vehicleVal;
    tripSeatBank[id] = generateNewEmptyPlan(vehicleVal, priceVal);
  }

  trip.plate = plateVal;

  if (tripSeatBank[id]) {
    tripSeatBank[id].plate = plateVal;
    tripSeatBank[id].vehicleType = vehicleVal;
    if (plateVal) {
      tripSeatBank[id].driver = tripSeatBank[id].driver || 'Phạm Quốc Bảo';
      tripSeatBank[id].helper = tripSeatBank[id].helper || 'Đỗ Văn Sơn';
    }
  }
  return true;
}

function createNewTrip(fields) {
  const { finalName, dateVal, routeVal, fromStationVal, toStationVal, pickupStationsVal, timeVal, vehicleVal, priceVal, noteVal, isTemplate } = fields;
  const newId = (Date.now().toString() + Math.random().toString(36).substr(2, 5));
  const newTrip = {
    id: newId,
    name: finalName,
    // Phơi mẫu không gắn ngày thật — luôn để HÔM NAY (normalizeTemplateTrips cũng kéo về hôm nay mỗi lần nạp).
    date: isTemplate ? todayStr : dateVal,
    route: routeVal,
    fromStation: fromStationVal,
    toStation: toStationVal,
    pickupStations: pickupStationsVal,
    time: timeVal,
    vehicleType: vehicleVal,
    price: priceVal,
    note: noteVal,
    status: 'Chưa chỉ định',
    plate: '',
    createdAt: Date.now()
  };
  if (isTemplate) newTrip.isTemplate = true;

  allTripsMeta.push(newTrip);

  tripSeatBank[newId] = generateNewEmptyPlan(vehicleVal, priceVal);
  tripSeatBank[newId].plate = '';
  tripSeatBank[newId].vehicleType = vehicleVal;
  tripSeatBank[newId].driver = '';
  tripSeatBank[newId].helper = '';
  tripSeatBank[newId].subSeats = [];
  tripSeatBank[newId].extraSeats = [];
}

function saveSingleTrip(e) {
  e.preventDefault();

  const id = document.getElementById("editTripId").value;
  const nameVal = document.getElementById("tripName").value.trim();
  const dateVal = document.getElementById("tripDate").value;
  const dirVal = document.getElementById("tripDirection").value;
  const fromStationVal = document.getElementById("tripFromStation").value;
  const toStationVal = document.getElementById("tripToStation").value;
  const pickupStationsVal = Array.from(document.querySelectorAll("#tripPickupStations input[type='checkbox']:checked")).map(cb => cb.value);
  const timeVal = document.getElementById("tripTime").value;
  const vehicleVal = document.getElementById("tripVehicleType").value;
  const priceVal = parseInt(document.getElementById("tripPrice").value) || 280000;
  const noteVal = document.getElementById("tripNote").value.trim();
  const statusVal = document.getElementById("tripStatus").value || 'Chưa chỉ định';
  const plateVal = document.getElementById("tripPlate").value.trim();

  const dirCfg = TRIP_DIRECTIONS_CFG[dirVal];
  if (!dirCfg || !fromStationVal || !toStationVal) {
    showToast('Vui lòng chọn đầy đủ Hướng đi, Trạm đi và Trạm đến');
    return;
  }
  // "tuyến chính" suy từ Trạm đi/Trạm đến (xem resolveTripRoute); chưa suy được thì fallback tuyến chính của hướng.
  const routeVal = document.getElementById("tripResolvedRoute").value || dirCfg.route;
  const suggested = `${fromStationVal} - ${toStationVal}`;
  const finalName = nameVal || suggested;

  // Không ràng buộc trùng tên/trùng giờ phơi nữa — nhân viên có thể chủ động tạo nhiều phơi trùng tên
  // hoặc trùng giờ khởi hành trong cùng 1 ngày nếu cần (VD tăng cường thêm xe cùng khung giờ).
  // Tạo mới ở chế độ "Tạo phơi mẫu" → gắn cờ isTemplate cho phơi mới (không áp dụng khi sửa phơi có sẵn).
  const isTemplate = !id && templateModalMode;
  const fields = { finalName, dateVal, routeVal, fromStationVal, toStationVal, pickupStationsVal, timeVal, vehicleVal, priceVal, noteVal, statusVal, plateVal, isTemplate };

  if (id) {
    if (!updateExistingTrip(id, fields)) return;
  } else {
    createNewTrip(fields);
  }

  templateModalMode = false;
  saveData();
  refreshTripsList();
  refreshVehicleHeaderIfCurrent(id);
  applyFilters();
  closeSingleModal();
  if (isTemplate) showToast('Đã thêm phơi mẫu vào danh sách');
}

// ===== Tạo phơi xe hàng loạt từ "phơi mẫu" =====
// Bấm "Tạo phơi xe hàng loạt" để bật chế độ chọn — thẻ phơi trong danh sách trở thành "phơi mẫu" bấm
// chọn được (giống chọn ghế ở sơ đồ ghế), thanh dính đáy hiện ra cho chọn khoảng Từ ngày/Đến ngày rồi
// bấm "Tạo hàng loạt" để nhân bản các phơi mẫu đã chọn cho mỗi ngày trong khoảng đó. Bấm lại nút "Tạo
// phơi xe hàng loạt" (hoặc "Hủy" trên thanh) để thoát chế độ chọn, quay về danh sách phơi bình thường —
// sau khi tạo thành công cũng tự thoát để thấy ngay các phơi vừa tạo trong danh sách.
function toggleBulkTemplateMode() {
  phoiBulkMode = !phoiBulkMode;
  bulkTemplateIds = [];

  const labelEl = document.getElementById("btnBulkCreateLabel");
  const btn = document.getElementById("btnBulkCreate");
  const bar = document.getElementById("bulkTemplateBar");
  const singleCreateBtn = document.getElementById("btnSingleCreate");
  const templateCreateBtn = document.getElementById("btnCreateTemplate");

  if (phoiBulkMode) {
    if (labelEl) labelEl.textContent = "Hủy chọn phơi mẫu";
    if (btn) btn.classList.add("active-bulk");
    if (bar) bar.style.display = "flex";
    // Ở chế độ chọn hàng loạt: đổi nút "Tạo phơi xe" thành "Tạo phơi mẫu" (thêm mẫu vào danh sách mẫu).
    if (singleCreateBtn) singleCreateBtn.style.display = "none";
    if (templateCreateBtn) templateCreateBtn.style.display = "";

    const today = new Date().toISOString().split("T")[0];
    const fromEl = document.getElementById("bulkTplFromDate");
    const toEl = document.getElementById("bulkTplToDate");
    if (fromEl) { fromEl.value = today; fromEl.min = today; }
    if (toEl) { toEl.value = today; toEl.min = today; }
  } else {
    if (labelEl) labelEl.textContent = "Tạo phơi xe hàng loạt";
    if (btn) btn.classList.remove("active-bulk");
    if (bar) bar.style.display = "none";
    if (singleCreateBtn) singleCreateBtn.style.display = "";
    if (templateCreateBtn) templateCreateBtn.style.display = "none";
  }

  updateBulkTemplateHint();
  applyFilters();
}

function toggleBulkTemplateSelect(id) {
  const idx = bulkTemplateIds.indexOf(id);
  if (idx === -1) bulkTemplateIds.push(id);
  else bulkTemplateIds.splice(idx, 1);
  updateBulkTemplateHint();
  applyFilters();
}

// Danh sách id các phơi MẪU đang hiện trong chế độ chọn hàng loạt (khớp đúng bộ lọc ở applyFilters).
function bulkTemplateAllIds() {
  return (Array.isArray(allTripsMeta) ? allTripsMeta : [])
    .filter(t => t && t.isTemplate && t.status !== 'Đã hủy')
    .map(t => t.id);
}

// Nút "Chọn tất cả" trên thanh chọn phơi mẫu — chọn hết mọi phơi mẫu; bấm lại khi đã chọn hết thì bỏ chọn hết.
function toggleSelectAllTemplates() {
  const allIds = bulkTemplateAllIds();
  const allSelected = allIds.length > 0 && allIds.every(id => bulkTemplateIds.includes(id));
  bulkTemplateIds = allSelected ? [] : allIds.slice();
  updateBulkTemplateHint();
  applyFilters();
}

function updateBulkTemplateHint() {
  const hint = document.getElementById("bulkTemplateHint");
  const createBtn = document.getElementById("bulkTemplateCreateBtn");
  const selectAllBtn = document.getElementById("bulkSelectAllBtn");
  if (hint) {
    hint.textContent = bulkTemplateIds.length
      ? `Đã chọn ${bulkTemplateIds.length} phơi mẫu`
      : "Chọn các phơi mẫu bên trên để tạo hàng loạt theo khoảng ngày";
  }
  if (createBtn) createBtn.disabled = bulkTemplateIds.length === 0;
  if (selectAllBtn) {
    const allIds = bulkTemplateAllIds();
    const allSelected = allIds.length > 0 && allIds.every(id => bulkTemplateIds.includes(id));
    selectAllBtn.textContent = allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả";
    selectAllBtn.disabled = allIds.length === 0;
  }
}

// Tính danh sách ngày (chuỗi yyyy-mm-dd) rơi vào các thứ trong tuần đã chọn, trong khoảng from..to.
function computeBulkTripDates(fromDateStr, toDateStr, weekdays) {
  const fromDate = new Date(fromDateStr);
  const toDate = new Date(toDateStr);
  const validDates = [];
  let current = new Date(fromDate);
  while (current <= toDate) {
    if (weekdays.includes(current.getDay())) {
      validDates.push(current.toISOString().split("T")[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return validDates;
}

// Nhân bản từng "phơi mẫu" cho mỗi ngày trong khoảng đã chọn — giữ nguyên tuyến/giờ/loại xe/giá/tên/
// trạm đi-đến/trạm đón dọc đường, KHÔNG copy biển số hay trạng thái của mẫu (phơi mới luôn bắt đầu
// "Chưa chỉ định" như tạo phơi đơn thật sự). Không ràng buộc trùng tên/trùng lịch — nhân viên có thể
// chủ động tạo thêm phơi trùng tên hoặc trùng giờ nếu cần (VD tăng cường thêm xe).
function createBulkTripsFromTemplates(validDates, templates) {
  let createdCount = 0;
  let firstNew = null;

  validDates.forEach(dateVal => {
    templates.forEach(tpl => {
      const finalName = tpl.name || `${tpl.route} (${tpl.time})`;
      const newId = (Date.now().toString() + Math.random().toString(36).substr(2, 5));
      const newTrip = {
        id: newId,
        name: finalName,
        date: dateVal,
        route: tpl.route,
        time: tpl.time,
        vehicleType: tpl.vehicleType,
        price: tpl.price,
        status: 'Chưa chỉ định',
        plate: '',
        note: tpl.note || '',
        fromStation: tpl.fromStation || '',
        toStation: tpl.toStation || '',
        pickupStations: Array.isArray(tpl.pickupStations) ? [...tpl.pickupStations] : [],
        createdAt: Date.now()
      };
      allTripsMeta.push(newTrip);
      if (!firstNew) firstNew = newTrip;

      tripSeatBank[newId] = generateNewEmptyPlan(tpl.vehicleType, tpl.price);
      tripSeatBank[newId].plate = '';
      tripSeatBank[newId].vehicleType = tpl.vehicleType;
      tripSeatBank[newId].driver = '';
      tripSeatBank[newId].helper = '';
      tripSeatBank[newId].subSeats = [];
      tripSeatBank[newId].extraSeats = [];

      createdCount++;
    });
  });

  return { createdCount, firstNew };
}

function confirmBulkFromTemplates() {
  if (bulkTemplateIds.length === 0) return;

  const fromDateStr = document.getElementById("bulkTplFromDate").value;
  const toDateStr = document.getElementById("bulkTplToDate").value;
  if (!fromDateStr || !toDateStr) {
    alert("Vui lòng chọn Từ ngày và Đến ngày.");
    return;
  }
  if (new Date(toDateStr) < new Date(fromDateStr)) {
    alert("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
    return;
  }

  const validDates = computeBulkTripDates(fromDateStr, toDateStr, [0, 1, 2, 3, 4, 5, 6]);
  const templates = bulkTemplateIds.map(id => allTripsMeta.find(t => t.id === id)).filter(Boolean);
  const totalExpected = validDates.length * templates.length;

  const confirmed = confirm(`Hệ thống sẽ tạo khoảng ${totalExpected} phơi xe từ ${templates.length} phơi mẫu đã chọn. Xác nhận tạo?`);
  if (!confirmed) return;

  const { createdCount, firstNew } = createBulkTripsFromTemplates(validDates, templates);

  saveData();

  // Đưa Zone 1 + bộ lọc tab Phơi xe về ĐÚNG ngày & hướng của đợt vừa tạo để thấy ngay các phơi mới —
  // trước đây giữ nguyên "hôm nay" nên phơi tạo hàng loạt cho ngày/hướng khác không hiện ở Zone 1.
  if (createdCount && validDates.length) {
    const d0 = validDates[0];
    selectedDate = new Date(d0 + 'T00:00:00');
    calDate = new Date(d0 + 'T00:00:00');
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof updateCalTrigger === 'function') updateCalTrigger();
    zone1HourFilter = 'all';
    const hourLabel = document.getElementById('zone1HourFilterLabel');
    if (hourLabel) hourLabel.textContent = 'Tất cả các giờ';
    const dir = firstNew ? tripDirectionId(firstNew.route) : selectedDirection;
    if (directionLabels[dir]) {
      selectedDirection = dir;
      selectedRoute = 'all';
      const dInput = document.getElementById('directionTrigger');
      if (dInput) dInput.value = directionLabels[dir];
      const rInput = document.getElementById('routeTrigger');
      if (rInput) rInput.value = 'Tất cả tuyến';
      if (typeof renderRouteOptions === 'function') renderRouteOptions('');
    }
    const fEl = document.getElementById('filterDate');
    if (fEl) fEl.value = d0;
  }

  refreshTripsList();
  // Ở lại chế độ chọn "phơi mẫu" sau khi tạo xong (không gọi toggleBulkTemplateMode() để thoát) — nhân
  // viên có thể chọn tiếp mẫu khác hoặc đổi khoảng ngày để tạo thêm đợt khác ngay, không phải bấm lại nút
  // "Tạo phơi xe hàng loạt" từ đầu mỗi lần. Chỉ xoá lượt chọn mẫu cũ để tránh tạo trùng đợt vừa xong.
  bulkTemplateIds = [];
  updateBulkTemplateHint();
  applyFilters();

  alert(`Đã tạo thành công ${createdCount} phơi xe.`);
}

// Init phơi dates and event listeners
(function initPhoiDashboard() {
  const today = new Date().toISOString().split("T")[0];
  const filterDate = document.getElementById("filterDate");
  const tripDate = document.getElementById("tripDate");

  if (filterDate) filterDate.value = today;
  if (tripDate) {
    tripDate.value = today;
    tripDate.min = today;
  }
})();

// Xe "đã khoá bán vé" = đã khởi hành và KHÔNG còn Re-open đang mở (DEPARTED / REOPEN_CLOSED /
// MANIFEST_CLOSED) — khớp đúng điều kiện khoá sơ đồ ghế (tsIsSellingLocked, ticketstaff-manifest-ui.js).
// Dùng để tô màu danh sách phơi Zone 1 (đỏ = đã khoá; xanh = còn bán được, kể cả khi đang Re-open) và
// để sắp xếp (xem renderZone1TripList bên dưới).
function zone1IsTripSellingLocked(tripId) {
  if (typeof tsIsSellingLocked === 'function') return tsIsSellingLocked(tripId);
  if (typeof getTripLifecycleStatus !== 'function') return false;
  const st = getTripLifecycleStatus(tripId);
  return st === TRIP_LIFECYCLE_STATUS.DEPARTED
    || st === TRIP_LIFECYCLE_STATUS.REOPEN_CLOSED
    || st === TRIP_LIFECYCLE_STATUS.MANIFEST_CLOSED;
}

// Xếp danh sách phơi: phơi còn bán được (xanh) lên trên, phơi đã khởi hành / đã khoá bán (đỏ,
// zone1IsTripSellingLocked) xuống cuối; TRONG TỪNG NHÓM sắp theo giờ khởi hành TĂNG DẦN.
function zone1TripMinutes(t) {
  const parts = String((t && t.time) || '00:00').split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}
function zone1SortByDeparture(list) {
  return list.slice().sort((a, b) => {
    const aLocked = zone1IsTripSellingLocked(a.id) ? 1 : 0;
    const bLocked = zone1IsTripSellingLocked(b.id) ? 1 : 0;
    if (aLocked !== bLocked) return aLocked - bLocked;
    return zone1TripMinutes(a) - zone1TripMinutes(b);
  });
}

// Dựng HTML 1 thẻ phơi xe — NGUỒN DUY NHẤT cho cả 3 nơi hiển thị "danh sách phơi": Zone 1
// (renderZone1TripList), modal "Đặt lại vé" (renderRebookTripList — #rbTripList) và modal "Chỉ định xe"
// (pkRenderTripList — #pkTripListPanel). Trước đây mỗi nơi tự ghép markup riêng nên kiểu dáng + logic
// badge SL ghế bị lệch nhau; nay gom về đây để "thống nhất từ kiểu dáng tới logic".
//   opts.selectedId   : id chuyến đang chọn → gắn class 'selected'
//   opts.dataAction    : tên hàm cho data-action khi bấm thẻ (selectTrip / selectRebookTrip / pkSelectTrip)
//   opts.dataArgsJson  : chuỗi JSON cho data-args
//   opts.tooltip       : true thì thêm title (chỉ Zone 1 dùng)
// Màu badge SL ghế THỐNG NHẤT theo vòng đời chuyến: đỏ (tag-departed) = đã khoá bán vé
// (zone1IsTripSellingLocked), xanh (tag-not-departed) = còn bán được — KHÔNG còn tô theo loại xe
// limo/thường như 2 modal trước đây nữa.
function renderPhoiTripCardHtml(trip, opts) {
  opts = opts || {};
  const plan = tripSeatBank[trip.id];
  const totalSeats = plan
    ? plan.down.filter(s => s.state !== 'hidden').length + plan.up.filter(s => s.state !== 'hidden').length
    : (trip.totalSeats || 0);
  const bookedSeats = plan
    ? [...plan.down, ...plan.up].filter(s => ['sold', 'hold', 'free', 'cargo'].includes(s.state)).length
    : 0;
  const selected = trip.id === opts.selectedId ? 'selected' : '';
  const plate = (plan && plan.plate) || trip.plate || 'Chưa có';
  const vehicleType = (plan && plan.vehicleType) || trip.vehicleType || 'Chưa rõ';
  const seatTagClass = zone1IsTripSellingLocked(trip.id) ? 'tag-departed' : 'tag-not-departed';
  const displayTripName = trip.name || `${trip.route} (${trip.time})`;
  const titleAttr = opts.tooltip
    ? ` title="Tên phơi: ${displayTripName}\nBiển số: ${plate}\nLoại xe: ${vehicleType}${trip.note ? '\nGhi chú: ' + trip.note : ''}"`
    : '';

  return `
    <div class="trip-card ${selected}" data-trip="${trip.id}" data-action="${opts.dataAction}" data-args='${opts.dataArgsJson}'${titleAttr}>
      <div class="z1-header">
        <div class="z1-time-block">
          <div class="z1-clock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
          <span class="trip-time">${trip.time}</span>
        </div>
        <div class="z1-divider"></div>
        <span class="trip-plate-inline">${plate}</span>
        <div class="trip-seat-tag ${seatTagClass}">${bookedSeats}/${totalSeats}</div>
      </div>
      <div class="z1-name-row">
        <span class="trip-name-text">${displayTripName}</span>
      </div>
    </div>
  `;
}

function renderZone1TripList() {
  const sgcdWrap = document.getElementById('tripListSGCD');
  const cdsgWrap = document.getElementById('tripListCDSG');
  if (!sgcdWrap || !cdsgWrap) return;

  const mapTrip = t => renderPhoiTripCardHtml(t, {
    selectedId: currentTripId,
    dataAction: 'selectTrip',
    dataArgsJson: JSON.stringify(['__this__', t.time, t.route]),
    tooltip: true
  });

  const matchesHourFilter = t => zone1HourFilter === 'all' || parseInt((t.time || '').split(':')[0], 10) === parseInt(zone1HourFilter, 10);
  // Lọc theo ĐÚNG ngày đã chọn trên lịch Zone 1 (phơi không có ngày thì luôn hiện).
  const selDateStr = zone1DateStr(selectedDate);
  const matchesDateFilter = t => !t.date || t.date === selDateStr;

  // Chỉ hiện phơi của HƯỚNG đang chọn (1 trong 4), khớp bộ lọc giờ + ngày + TUYẾN (theo trạm đi/đến).
  const list = (tripsByDirection[selectedDirection] || [])
    .filter(t => matchesHourFilter(t) && matchesDateFilter(t) && zone1TripMatchesRoute(t));
  sgcdWrap.innerHTML = zone1SortByDeparture(list).map(mapTrip).join('') ||
    '<div class="z1-empty" style="padding:14px;text-align:center;color:var(--text-sub);font-size:12.5px;">Không có phơi xe phù hợp với bộ lọc</div>';
  cdsgWrap.innerHTML = '';
}

