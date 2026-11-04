// src/pages/customer/customer-data.js — Dữ liệu MẪU cho trang khách hàng (trang chủ + tra cứu).
// Độc lập với dữ liệu nội bộ (src/data/sample-trip-templates.js) nhưng dùng lại đúng tên
// tuyến/trạm đã có trong hệ thống (FleetStore, DEFAULT_SGCD_TRIPS...) để nhất quán thương hiệu.
// Nạp bằng <script> thường, TRƯỚC customer-search.js / customer-lookup.js.

const CUSTOMER_CITIES = ['TP. Hồ Chí Minh', 'An Giang'];

const CUSTOMER_STATIONS_BY_CITY = {
  'TP. Hồ Chí Minh': ['508 Kinh Dương Vương (Q. Bình Tân)', 'Bến xe Miền Tây - Quầy 29'],
  'An Giang': ['Trạm Long Xuyên', 'Trạm Châu Đốc']
};

// Số ghế theo loại xe — trùng tên với VEHICLE_TYPE_SEATS nội bộ (chỉ lấy 3 loại đang chạy tuyến này).
const CUSTOMER_VEHICLE_SEATS = {
  'Limousine 24 Phòng': 24,
  'Giường nằm 34 chỗ': 34,
  'Ghế ngồi 45 chỗ': 45
};

const CUSTOMER_AMENITIES = ['Wifi miễn phí', 'Nước uống', 'Chăn đắp', 'Sạc USB', 'Bảo hiểm hành khách'];

// Giờ đi + thời lượng ước tính (phút) theo từng chiều — dùng để tính giờ đến hiển thị cho khách.
const CUSTOMER_TRIP_TEMPLATES = {
  'TP. Hồ Chí Minh__An Giang': [
    { time: '07:00', durationMin: 360, vehicleType: 'Limousine 24 Phòng', price: 280000, fromStation: '508 Kinh Dương Vương (Q. Bình Tân)', toStation: 'Trạm Long Xuyên' },
    { time: '08:30', durationMin: 330, vehicleType: 'Giường nằm 34 chỗ', price: 250000, fromStation: 'Bến xe Miền Tây - Quầy 29', toStation: 'Trạm Long Xuyên' },
    { time: '10:00', durationMin: 360, vehicleType: 'Limousine 24 Phòng', price: 280000, fromStation: '508 Kinh Dương Vương (Q. Bình Tân)', toStation: 'Trạm Châu Đốc' },
    { time: '13:15', durationMin: 300, vehicleType: 'Ghế ngồi 45 chỗ', price: 180000, fromStation: 'Bến xe Miền Tây - Quầy 29', toStation: 'Trạm Long Xuyên' },
    { time: '15:30', durationMin: 360, vehicleType: 'Limousine 24 Phòng', price: 280000, fromStation: '508 Kinh Dương Vương (Q. Bình Tân)', toStation: 'Trạm Châu Đốc' },
    { time: '21:00', durationMin: 390, vehicleType: 'Giường nằm 34 chỗ', price: 250000, fromStation: '508 Kinh Dương Vương (Q. Bình Tân)', toStation: 'Trạm Châu Đốc' }
  ],
  'An Giang__TP. Hồ Chí Minh': [
    { time: '06:00', durationMin: 360, vehicleType: 'Limousine 24 Phòng', price: 280000, fromStation: 'Trạm Long Xuyên', toStation: '508 Kinh Dương Vương (Q. Bình Tân)' },
    { time: '09:15', durationMin: 330, vehicleType: 'Giường nằm 34 chỗ', price: 250000, fromStation: 'Trạm Long Xuyên', toStation: 'Bến xe Miền Tây - Quầy 29' },
    { time: '11:00', durationMin: 300, vehicleType: 'Ghế ngồi 45 chỗ', price: 180000, fromStation: 'Trạm Châu Đốc', toStation: 'Bến xe Miền Tây - Quầy 29' },
    { time: '14:00', durationMin: 360, vehicleType: 'Limousine 24 Phòng', price: 280000, fromStation: 'Trạm Long Xuyên', toStation: '508 Kinh Dương Vương (Q. Bình Tân)' },
    { time: '16:00', durationMin: 390, vehicleType: 'Giường nằm 34 chỗ', price: 250000, fromStation: 'Trạm Châu Đốc', toStation: '508 Kinh Dương Vương (Q. Bình Tân)' },
    { time: '21:00', durationMin: 360, vehicleType: 'Limousine 24 Phòng', price: 280000, fromStation: 'Trạm Châu Đốc', toStation: '508 Kinh Dương Vương (Q. Bình Tân)' }
  ]
};

function customerAddMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const dayMin = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(dayMin / 60)).padStart(2, '0');
  const mm = String(dayMin % 60).padStart(2, '0');
  return `${hh}:${mm}${total >= 1440 ? ' (+1 ngày)' : ''}`;
}

function customerFormatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${m}p` : `${h}h`;
}

// Ghế "đã bán" xác định theo công thức cố định (không random thật) để demo lặp lại kết quả giống
// nhau mỗi lần tìm kiếm cùng 1 chuyến, thay vì đổi liên tục gây khó hiểu khi test.
function customerSeededBooked(seatIndex, seed) {
  return (seatIndex * 7 + seed * 13) % 5 === 0;
}

// Sinh danh sách chuyến cho 1 tuyến + ngày cụ thể.
function customerSearchTrips(fromCity, toCity, dateStr) {
  const key = `${fromCity}__${toCity}`;
  const templates = CUSTOMER_TRIP_TEMPLATES[key] || [];
  return templates.map((tpl, idx) => {
    const totalSeats = CUSTOMER_VEHICLE_SEATS[tpl.vehicleType] || 34;
    let booked = 0;
    for (let i = 0; i < totalSeats; i++) {
      if (customerSeededBooked(i, idx + 1)) booked++;
    }
    return {
      id: `${fromCity === 'TP. Hồ Chí Minh' ? 'SGAG' : 'AGSG'}-${idx + 1}-${dateStr}`,
      fromCity,
      toCity,
      date: dateStr,
      departTime: tpl.time,
      arriveTime: customerAddMinutes(tpl.time, tpl.durationMin),
      durationLabel: customerFormatDuration(tpl.durationMin),
      vehicleType: tpl.vehicleType,
      price: tpl.price,
      fromStation: tpl.fromStation,
      toStation: tpl.toStation,
      totalSeats,
      availableSeats: totalSeats - booked,
      amenities: CUSTOMER_AMENITIES
    };
  });
}

function customerFindTripById(tripId) {
  // id = "SGAG-<stt>-<yyyy-mm-dd>" — không split('-') toàn chuỗi vì ngày cũng chứa dấu "-",
  // chỉ cắt sau dấu "-" thứ 2 để giữ nguyên phần ngày.
  const firstDash = tripId.indexOf('-');
  const secondDash = tripId.indexOf('-', firstDash + 1);
  const dateStr = tripId.slice(secondDash + 1);
  const isSGAG = tripId.startsWith('SGAG');
  const fromCity = isSGAG ? 'TP. Hồ Chí Minh' : 'An Giang';
  const toCity = isSGAG ? 'An Giang' : 'TP. Hồ Chí Minh';
  const trips = customerSearchTrips(fromCity, toCity, dateStr);
  return trips.find((t) => t.id === tripId) || null;
}

// Mã ghế đúng quy tắc dùng chung Admin (Sơ đồ ghế) + TicketStaff (Rước liền) — xem
// shared/js/seat-bank.js: buildSequentialSeatCodes()/getSeatCodesForVehicleType(). Mỗi tầng đánh
// số RIÊNG (không ghép hàng/cột kiểu "A1A" như bản cũ): tầng dưới "A1..An", tầng trên "B1..Bn".
// Xe "Giường nằm 34 chỗ" mượn đúng cách chia của xe 36 giường rồi ẩn ghế A3/B3 (giống bản gốc),
// không phải công thức riêng cho số 34.
function customerSeatCodesForVehicleType(vehicleType) {
  const total = CUSTOMER_VEHICLE_SEATS[vehicleType] || 34;

  function buildCodes(t) {
    const downCount = Math.ceil(t / 2);
    const upCount = t - downCount;
    const down = Array.from({ length: downCount }, (_, i) => 'A' + (i + 1));
    const up = Array.from({ length: upCount }, (_, i) => 'B' + (i + 1));
    return { down, up };
  }

  if (vehicleType === 'Giường nằm 34 chỗ') {
    const base = buildCodes(36);
    return {
      down: base.down.map((c) => (c === 'A3' ? 'A3_hidden' : c)),
      up: base.up.map((c) => (c === 'B3' ? 'B3_hidden' : c))
    };
  }
  return buildCodes(total);
}

// Sơ đồ ghế: luôn 2 tầng (đúng cách sơ đồ ghế thật luôn chia tầng dưới/tầng trên bất kể loại xe).
// `dense` = true khi tổng số ghế >= 34 — dùng để đổi sang lưới 3 cột/ghế nhỏ hơn (đúng ngưỡng
// TicketStaff dùng ở modal "Chỉ định xe rước liền").
function customerBuildSeatLayout(trip) {
  const codes = customerSeatCodesForVehicleType(trip.vehicleType);
  const seatIndexSeed = trip.id.split('-')[1] ? Number(trip.id.split('-')[1]) : 1;

  function buildFloor(codeList, startIndex) {
    let n = 0;
    return codeList.map((code) => {
      if (code.indexOf('_hidden') !== -1) return { label: code, hidden: true };
      const globalIndex = startIndex + n;
      n++;
      return { label: code, booked: customerSeededBooked(globalIndex, seatIndexSeed) };
    });
  }

  return {
    dense: codes.down.length + codes.up.length >= 34,
    floors: [
      { name: 'Tầng dưới', seats: buildFloor(codes.down, 0) },
      { name: 'Tầng trên', seats: buildFloor(codes.up, codes.down.length) }
    ]
  };
}
