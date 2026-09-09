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
    const st = pattern[(seatCustIdx++) % pattern.length];
    return makeSeat(code, st);
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
