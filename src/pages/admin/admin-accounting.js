/* =========================================================
   ADMIN-ACCOUNTING.JS — Module Kế toán & Tài chính Nhà xe
   Nhà Xe Huệ Nghĩa
   =========================================================
   Quản lý toàn bộ nghiệp vụ Kế toán Vận tải:
   1. THU (Doanh thu theo nguồn, phơi, tuyến, đầu xe, tài xế/phụ xe)
   2. CHI (Chi phí vận hành, cố định, khác & phạt vi phạm)
   3. BÁO CÁO ĐỊNH KỲ (Ngày, Tuần, Tháng P&L, Quý, Năm & Biểu đồ)
   4. CÁC SỔ/BẢNG NGHIỆP VỤ (Sổ quỹ, Công nợ, Tài sản & Khấu hao,
      Sổ nhiên liệu & Cảnh báo bất thường, Bảng lương, Hạn đăng kiểm/bảo hiểm)
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     DEFAULT SEED DATA FOR ACCOUNTING MODULE
     --------------------------------------------------------- */
  function seedAccountingDefaults() {
    var today = todayISO();
    var curYear = new Date().getFullYear();
    var curMonth = String(new Date().getMonth() + 1).padStart(2, '0');

    // 1. VOUCHERS (THU / CHI)
    if (!localStorage.getItem(HN_ACCOUNTING_VOUCHERS_KEY)) {
      var seedVouchers = [
        { id: 'THU-001', type: 'THU', category: 'Vé lẻ', source: 'Bán tại bến An Giang', route: 'TP.HCM - An Giang', plate: '67B-012.34', driver: 'Nguyễn Văn Hùng', attendant: 'Lê Văn Nam', tripCode: 'AG-0800', amount: 15400000, date: today, paymentMethod: 'Tiền mặt', status: 'Đã thu', note: 'Doanh thu phơi sáng 08:00' },
        { id: 'THU-002', type: 'THU', category: 'Vé đặt trước', source: 'Tổng đài / App Online', route: 'TP.HCM - Châu Đốc', plate: '67B-056.78', driver: 'Trần Minh Tâm', attendant: 'Nguyễn Quốc Bảo', tripCode: 'CD-0930', amount: 22800000, date: today, paymentMethod: 'Chuyển khoản', status: 'Đã thu', note: 'Đặt trước thanh toán VNPay' },
        { id: 'THU-003', type: 'THU', category: 'Hoa hồng đại lý', source: 'Đại lý Hồng Ngự', route: 'TP.HCM - Hồng Ngự', plate: '67B-099.11', driver: 'Phạm Đức Trí', attendant: 'Đỗ Văn Thành', tripCode: 'HN-1100', amount: 3500000, date: today, paymentMethod: 'Chuyển khoản', status: 'Chưa thu', note: 'Chênh lệch hoa hồng đại lý tháng 9' },
        { id: 'THU-004', type: 'THU', category: 'Vé lẻ', source: 'Điểm đón Bình Dương', route: 'Bình Dương - An Giang', plate: '67B-033.44', driver: 'Võ Thành Long', attendant: 'Hoàng Anh', tripCode: 'BD-1400', amount: 12500000, date: today, paymentMethod: 'Tiền mặt', status: 'Đã thu', note: 'Thu trực tiếp tài xế nộp' },
        
        { id: 'CHI-001', type: 'CHI', mainGroup: 'Chi phí trực tiếp vận hành', category: 'Nhiên liệu (Dầu DIESEL)', plate: '67B-012.34', driver: 'Nguyễn Văn Hùng', amount: 4800000, payee: 'Cây xăng Petrolimex Số 5', date: today, paymentMethod: 'Chuyển khoản', status: 'Đã chi', note: 'Đổ 240 lít dầu chuyến đi AG' },
        { id: 'CHI-002', type: 'CHI', mainGroup: 'Chi phí trực tiếp vận hành', category: 'Lương & Phụ cấp chuyến', plate: '67B-056.78', driver: 'Trần Minh Tâm', amount: 1600000, payee: 'Trần Minh Tâm', date: today, paymentMethod: 'Tiền mặt', status: 'Đã chi', note: 'Phụ cấp khoán chuyến 09:30' },
        { id: 'CHI-003', type: 'CHI', mainGroup: 'Chi phí trực tiếp vận hành', category: 'Bến bãi & BOT', plate: '67B-012.34', driver: 'Nguyễn Văn Hùng', amount: 650000, payee: 'Trạm BOT Chợ Mới', date: today, paymentMethod: 'VETC', status: 'Đã chi', note: 'Phí BOT cầu đường & ra vào bến' },
        { id: 'CHI-004', type: 'CHI', mainGroup: 'Chi phí trực tiếp vận hành', category: 'Bảo trì, sửa chữa xe', plate: '67B-099.11', driver: 'Phạm Đức Trí', amount: 7200000, payee: 'Gara Ô tô An Giang Auto', date: today, paymentMethod: 'Chuyển khoản', status: 'Đã chi', note: 'Thay má phanh & bảo dưỡng định kỳ' },
        { id: 'CHI-005', type: 'CHI', mainGroup: 'Chi phí cố định', category: 'Bảo hiểm xe', plate: '67B-012.34', driver: '—', amount: 18500000, payee: 'Bảo hiểm PJICO', date: curYear + '-' + curMonth + '-01', paymentMethod: 'Chuyển khoản', status: 'Đã chi', note: 'Bảo hiểm thân vỏ cả năm 2026' },
        { id: 'CHI-006', type: 'CHI', mainGroup: 'Chi phí cố định', category: 'Lương nhân viên văn phòng', plate: '—', driver: '—', amount: 45000000, payee: 'Văn phòng Huệ Nghĩa', date: curYear + '-' + curMonth + '-05', paymentMethod: 'Chuyển khoản', status: 'Đã chi', note: 'Lương tháng NV điều hành & vé' },
        { id: 'CHI-007', type: 'CHI', mainGroup: 'Chi phí khác', category: 'Phạt vi phạm giao thông', plate: '67B-033.44', driver: 'Võ Thành Long', amount: 2500000, payee: 'Kho bạc Nhà nước AG', date: today, paymentMethod: 'Chuyển khoản', status: 'Đã chi', note: 'Phạt lỗi quá tốc độ 65/60 km/h — trừ lương tài xế' }
      ];
      lsWrite(HN_ACCOUNTING_VOUCHERS_KEY, seedVouchers);
    }

    // 2. FUEL LOGS (Nhiên liệu theo xe & chuyến + Định mức & Cảnh báo)
    if (!localStorage.getItem(HN_ACCOUNTING_FUEL_LOGS_KEY)) {
      var seedFuel = [
        { id: 'FL-001', date: today, plate: '67B-012.34', driver: 'Nguyễn Văn Hùng', tripCode: 'AG-0800', startKm: 124500, endKm: 124780, distanceKm: 280, fuelLiters: 65, avgStandardL: 20.0, actualConsumptionL: 23.2, fuelCost: 1430000, station: 'Petrolimex 12', status: 'Warning', note: 'Tiêu hao 23.2L/100km (Vượt định mức 20L!)' },
        { id: 'FL-002', date: today, plate: '67B-056.78', driver: 'Trần Minh Tâm', tripCode: 'CD-0930', startKm: 98200, endKm: 98510, distanceKm: 310, fuelLiters: 58, avgStandardL: 19.5, actualConsumptionL: 18.7, fuelCost: 1276000, station: 'Petrolimex 05', status: 'Normal', note: 'Đạt định mức tiết kiệm dầu' },
        { id: 'FL-003', date: today, plate: '67B-099.11', driver: 'Phạm Đức Trí', tripCode: 'HN-1100', startKm: 154000, endKm: 154260, distanceKm: 260, fuelLiters: 52, avgStandardL: 20.0, actualConsumptionL: 20.0, fuelCost: 1144000, station: 'Cây xăng Huệ Nghĩa', status: 'Normal', note: 'Chuẩn định mức' },
        { id: 'FL-004', date: today, plate: '67B-033.44', driver: 'Võ Thành Long', tripCode: 'BD-1400', startKm: 45000, endKm: 45320, distanceKm: 320, fuelLiters: 80, avgStandardL: 21.0, actualConsumptionL: 25.0, fuelCost: 1760000, station: 'Petrolimex Bình Dương', status: 'Warning', note: 'Tiêu hao 25L/100km — Cần kiểm tra béc phun dầu!' }
      ];
      lsWrite(HN_ACCOUNTING_FUEL_LOGS_KEY, seedFuel);
    }

    // 3. FIXED ASSETS (Tài sản cố định & Khấu hao)
    if (!localStorage.getItem(HN_ACCOUNTING_FIXED_ASSETS_KEY)) {
      var seedAssets = [
        { id: 'TS-001', code: 'XE-67B01234', name: 'Xe Universe 47 chỗ 67B-012.34', category: 'Phương tiện vận tải', origValue: 3200000000, useMonths: 120, usedMonths: 24, monthlyDep: 26666667, accumulatedDep: 640000008, remainingValue: 2559999992, status: 'Đang hoạt động' },
        { id: 'TS-002', code: 'XE-67B05678', name: 'Xe Limousine VIP 34 giường 67B-056.78', category: 'Phương tiện vận tải', origValue: 2800000000, useMonths: 120, usedMonths: 18, monthlyDep: 23333333, accumulatedDep: 419999994, remainingValue: 2380000006, status: 'Đang hoạt động' },
        { id: 'TS-003', code: 'VP-CAMERAS', name: 'Hệ thống Camera & GPS Giám sát Đội xe', category: 'Thiết bị công nghệ', origValue: 180000000, useMonths: 36, usedMonths: 12, monthlyDep: 5000000, accumulatedDep: 60000000, remainingValue: 120000000, status: 'Đang sử dụng' },
        { id: 'TS-004', code: 'VP-PHONGVE', name: 'Quầy bán vé & Máy in phơi bến xe Miền Tây', category: 'Trang thiết bị văn phòng', origValue: 95000000, useMonths: 48, usedMonths: 10, monthlyDep: 1979166, accumulatedDep: 19791660, remainingValue: 75208340, status: 'Đang sử dụng' }
      ];
      lsWrite(HN_ACCOUNTING_FIXED_ASSETS_KEY, seedAssets);
    }

    // 4. DEBTS (Công nợ Phải thu / Phải trả)
    if (!localStorage.getItem(HN_ACCOUNTING_DEBTS_KEY)) {
      var seedDebts = [
        { id: 'CN-001', type: 'Phải thu', partner: 'Đại lý Vé Hồng Ngự', category: 'Vé đặt bán hộ', totalAmount: 45000000, paidAmount: 30000000, remainAmount: 15000000, dueDate: curYear + '-' + curMonth + '-28', status: 'Còn nợ', note: 'Tiền vé đại lý gom thu chưa nộp hết' },
        { id: 'CN-002', type: 'Phải thu', partner: 'Đại lý Vé Châu Đốc', category: 'Vé đặt bán hộ', totalAmount: 28000000, paidAmount: 28000000, remainAmount: 0, dueDate: curYear + '-' + curMonth + '-15', status: 'Đã hoàn tất', note: 'Đã đối soát & thanh toán đủ' },
        { id: 'CN-003', type: 'Phải trả', partner: 'Công ty Nhiên liệu Petrolimex AG', category: 'Tiền dầu nợ gối đầu', totalAmount: 120000000, paidAmount: 80000000, remainAmount: 40000000, dueDate: curYear + '-' + curMonth + '-30', status: 'Còn nợ', note: 'Thanh toán đợt 2 cuối tháng' },
        { id: 'CN-004', type: 'Phải trả', partner: 'Gara Ô tô An Giang Auto', category: 'Sửa chữa & Phụ tùng', totalAmount: 18500000, paidAmount: 10000000, remainAmount: 8500000, dueDate: curYear + '-' + curMonth + '-25', status: 'Còn nợ', note: 'Thay 4 quả lốp xe 67B-012.34' }
      ];
      lsWrite(HN_ACCOUNTING_DEBTS_KEY, seedDebts);
    }

    // 5. PAYROLL (Bảng lương tài xế & nhân viên)
    if (!localStorage.getItem(HN_ACCOUNTING_PAYROLL_KEY)) {
      var seedPayroll = [
        { id: 'LUONG-001', name: 'Nguyễn Văn Hùng', role: 'Tài xế chính', baseSalary: 9000000, tripAllowance: 6400000, bonus: 1200000, fineDeduction: 0, netSalary: 16600000, status: 'Đã chi', month: curYear + '-' + curMonth },
        { id: 'LUONG-002', name: 'Trần Minh Tâm', role: 'Tài xế chính', baseSalary: 9000000, tripAllowance: 7200000, bonus: 1500000, fineDeduction: 0, netSalary: 17700000, status: 'Đã chi', month: curYear + '-' + curMonth },
        { id: 'LUONG-003', name: 'Võ Thành Long', role: 'Tài xế chính', baseSalary: 9000000, tripAllowance: 5600000, bonus: 800000, fineDeduction: 2500000, netSalary: 12900000, status: 'Chờ duyệt', month: curYear + '-' + curMonth },
        { id: 'LUONG-004', name: 'Lê Văn Nam', role: 'Phụ xe', baseSalary: 6000000, tripAllowance: 3200000, bonus: 500000, fineDeduction: 0, netSalary: 9700000, status: 'Đã chi', month: curYear + '-' + curMonth },
        { id: 'LUONG-005', name: 'Nguyễn Thị Hoa', role: 'Nhân viên bán vé', baseSalary: 7500000, tripAllowance: 0, bonus: 1000000, fineDeduction: 0, netSalary: 8500000, status: 'Đã chi', month: curYear + '-' + curMonth }
      ];
      lsWrite(HN_ACCOUNTING_PAYROLL_KEY, seedPayroll);
    }

    // 6. VEHICLE INSPECTIONS & INSURANCE EXPIRY TRACKER
    if (!localStorage.getItem(HN_ACCOUNTING_INSPECTION_KEY)) {
      var seedInspection = [
        { id: 'INS-001', plate: '67B-012.34', vehicleType: 'Giường nằm 40 chỗ', inspectionDate: '2026-10-15', compulsoryInsuranceDate: '2026-11-20', hullInsuranceDate: '2027-01-10', badgeDate: '2026-12-30', status: 'Safe', note: 'Đầy đủ giấy tờ' },
        { id: 'INS-002', plate: '67B-056.78', vehicleType: 'Limousine 34 phòng', inspectionDate: '2026-09-20', compulsoryInsuranceDate: '2026-09-25', hullInsuranceDate: '2026-10-05', badgeDate: '2026-09-18', status: 'Warning', note: 'Sắp hết hạn Đăng kiểm & Phù hiệu (Còn 5-7 ngày)!' },
        { id: 'INS-003', plate: '67B-099.11', vehicleType: 'Ghế ngồi 29 chỗ', inspectionDate: '2026-09-05', compulsoryInsuranceDate: '2026-09-01', hullInsuranceDate: '2026-12-12', badgeDate: '2026-08-30', status: 'Expired', note: 'Cảnh báo: ĐÃ QUÁ HẠN ĐĂNG KIỂM & PHÙ HIỆU XE!' },
        { id: 'INS-004', plate: '67B-033.44', vehicleType: 'Giường nằm 36 chỗ', inspectionDate: '2027-03-10', compulsoryInsuranceDate: '2027-04-12', hullInsuranceDate: '2027-05-01', badgeDate: '2027-03-15', status: 'Safe', note: 'Hạn đăng kiểm còn dài' }
      ];
      lsWrite(HN_ACCOUNTING_INSPECTION_KEY, seedInspection);
    }

    // 7. EXPENSE REQUESTS (Yêu cầu chi — chờ duyệt trước khi thành Phiếu Chi thật)
    if (!localStorage.getItem(HN_ACCOUNTING_EXPENSE_REQUESTS_KEY)) {
      var seedExpenseRequests = [
        { id: 'YCC-001', date: today, requester: 'Nguyễn Thị Hoa', mainGroup: 'Chi phí trực tiếp vận hành', category: 'Bảo trì, sửa chữa xe', plate: '67B-099.11', payee: 'Gara Ô tô An Giang Auto', amount: 7200000, reason: 'Đề nghị tạm ứng thay má phanh & bảo dưỡng định kỳ xe 67B-099.11', status: 'Chờ duyệt', rejectReason: '', approvedVoucherId: '' },
        { id: 'YCC-002', date: today, requester: 'Lê Văn Nam', mainGroup: 'Chi phí trực tiếp vận hành', category: 'Nhiên liệu (Dầu DIESEL)', plate: '67B-012.34', payee: 'Cây xăng Petrolimex Số 5', amount: 4800000, reason: 'Tạm ứng đổ dầu chuyến đi An Giang', status: 'Đã duyệt', rejectReason: '', approvedVoucherId: 'CHI-001' }
      ];
      lsWrite(HN_ACCOUNTING_EXPENSE_REQUESTS_KEY, seedExpenseRequests);
    }

    // 8. CHI CATEGORIES (Nhóm & Hạng mục chi phí — Admin tự thêm/sửa/xóa trong trang Chi phí)
    if (!localStorage.getItem(HN_ACCOUNTING_CHI_CATEGORIES_KEY)) {
      var seedChiCategories = [
        { id: 'CATC-01', group: 'Chi phí trực tiếp vận hành', name: 'Nhiên liệu (Dầu DIESEL)' },
        { id: 'CATC-02', group: 'Chi phí trực tiếp vận hành', name: 'Lương & Phụ cấp chuyến' },
        { id: 'CATC-03', group: 'Chi phí trực tiếp vận hành', name: 'Bến bãi & BOT' },
        { id: 'CATC-04', group: 'Chi phí trực tiếp vận hành', name: 'Bảo trì, sửa chữa xe' },
        { id: 'CATC-05', group: 'Chi phí trực tiếp vận hành', name: 'Lốp, ắc quy, dầu nhớt' },
        { id: 'CATC-06', group: 'Chi phí trực tiếp vận hành', name: 'Rửa xe, vệ sinh xe' },
        { id: 'CATC-07', group: 'Chi phí cố định', name: 'Bảo hiểm xe' },
        { id: 'CATC-08', group: 'Chi phí cố định', name: 'Đăng kiểm, phù hiệu, logo' },
        { id: 'CATC-09', group: 'Chi phí cố định', name: 'Lương nhân viên văn phòng' },
        { id: 'CATC-10', group: 'Chi phí cố định', name: 'Thuê văn phòng/bến bãi' },
        { id: 'CATC-11', group: 'Chi phí khác', name: 'Phạt vi phạm giao thông' },
        { id: 'CATC-12', group: 'Chi phí khác', name: 'Lãi vay ngân hàng' }
      ];
      lsWrite(HN_ACCOUNTING_CHI_CATEGORIES_KEY, seedChiCategories);
    }

    // 9. CHI GROUPS (Nhóm chi phí chính — tách riêng khỏi Hạng mục để Admin thêm/sửa Nhóm kể cả khi
    // nhóm đó chưa có hạng mục nào bên trong). Seed từ các nhóm đã có sẵn trong Hạng mục ở trên.
    if (!localStorage.getItem(HN_ACCOUNTING_CHI_GROUPS_KEY)) {
      var seedGroupNames = acctChiDistinctGroups(getChiCategories());
      lsWrite(HN_ACCOUNTING_CHI_GROUPS_KEY, seedGroupNames.map(function (name, i) {
        return { id: 'CATG-' + String(i + 1).padStart(2, '0'), name: name };
      }));
    }
  }

  // Read helpers — Tự động đồng bộ dữ liệu THẬT từ Tổng đài (Trips, SeatBank) & FleetStore (Vehicles, Staff)
  function getVouchers() {
    var storedVouchers = lsRead(HN_ACCOUNTING_VOUCHERS_KEY, []);
    var realTripVouchers = [];

    try {
      var trips = window.TripService ? window.TripService.getAll() : [];
      var seatBank = lsRead(HN_STORAGE_KEY, {});

      trips.forEach(function (trip) {
        var tripId = trip.id || trip.tripId || trip.code;
        if (!tripId) return;

        var seatsObj = seatBank[tripId] || {};
        var bookedSeatsCount = 0;
        var totalTripRevenue = 0;
        var paidTripRevenue = 0;
        var veLeAmt = 0, veDatTruocAmt = 0, hoaHongAmt = 0;

        Object.keys(seatsObj).forEach(function (sKey) {
          var seat = seatsObj[sKey];
          if (seat && (seat.status === 'sold' || seat.status === 'booked' || seat.paxName || seat.price)) {
            bookedSeatsCount++;
            var price = Number(seat.price) || Number(trip.price) || 160000;
            totalTripRevenue += price;

            var isAgency = seat.agent || seat.agency || seat.isAgency || (seat.note && seat.note.indexOf('Đại lý') !== -1);
            var isWalkIn = seat.paymentMethod === 'Tiền mặt' || seat.isWalkIn || seat.channel === 'bến' || seat.channel === 'trực tiếp';

            if (isAgency) {
              var comm = Math.round(price * 0.15);
              hoaHongAmt += comm;
              veDatTruocAmt += (price - comm);
            } else if (isWalkIn) {
              veLeAmt += price;
            } else {
              veDatTruocAmt += price;
            }

            if (seat.paid || seat.paymentStatus === 'Đã thanh toán' || seat.status === 'sold') {
              paidTripRevenue += price;
            }
          }
        });

        if (bookedSeatsCount > 0 || totalTripRevenue > 0) {
          var baseRoute = trip.route || trip.routeName || (trip.from ? trip.from + ' - ' + trip.to : 'Tuyến chính');
          var basePlate = trip.plate || 'Chưa xếp xe';
          var baseDriver = trip.driver || 'Chưa phân công';
          var baseAttendant = trip.attendant || '—';
          var baseFromStation = trip.fromStation || trip.from || '';
          var baseToStation = trip.toStation || trip.to || '';
          var tripDate = trip.date || todayISO();
          var tCode = trip.code || tripId;

          var vIdBase = 'PHOI-' + tCode;
          var existsInStored = storedVouchers.some(function (v) { return v.id === vIdBase || (v.tripCode === tCode && v.type === 'THU'); });

          if (!existsInStored) {
            if (veLeAmt > 0) {
              realTripVouchers.push({
                id: vIdBase + '-LE',
                type: 'THU',
                category: 'Vé lẻ',
                source: 'Vé lẻ bán tại bến / điểm đón (Phơi ' + tCode + ')',
                route: baseRoute,
                fromStation: baseFromStation,
                toStation: baseToStation,
                plate: basePlate,
                driver: baseDriver,
                attendant: baseAttendant,
                tripCode: tCode,
                amount: veLeAmt,
                date: tripDate,
                paymentMethod: 'Tiền mặt',
                status: 'Đã thu',
                note: 'Doanh thu vé lẻ tài xế/phụ xe thu trên phơi ' + tCode
              });
            }

            if (veDatTruocAmt > 0 || (veLeAmt === 0 && hoaHongAmt === 0)) {
              var amtDat = veDatTruocAmt > 0 ? veDatTruocAmt : totalTripRevenue;
              realTripVouchers.push({
                id: vIdBase + (veLeAmt > 0 ? '-ON' : ''),
                type: 'THU',
                category: 'Vé đặt trước',
                source: 'Tổng đài / App Online (Phơi ' + tCode + ')',
                route: baseRoute,
                fromStation: baseFromStation,
                toStation: baseToStation,
                plate: basePlate,
                driver: baseDriver,
                attendant: baseAttendant,
                tripCode: tCode,
                amount: amtDat,
                date: tripDate,
                paymentMethod: 'Chuyển khoản / VNPay',
                status: (paidTripRevenue >= amtDat) ? 'Đã thu' : 'Chưa thu',
                note: 'Vé đặt trước phơi ' + tCode + ' (' + bookedSeatsCount + ' vé)'
              });
            }

            if (hoaHongAmt > 0) {
              realTripVouchers.push({
                id: vIdBase + '-HH',
                type: 'THU',
                category: 'Hoa hồng đại lý',
                source: 'Hoa hồng chiết khấu đại lý bán hộ (Phơi ' + tCode + ')',
                route: baseRoute,
                fromStation: baseFromStation,
                toStation: baseToStation,
                plate: basePlate,
                driver: baseDriver,
                attendant: baseAttendant,
                tripCode: tCode,
                amount: hoaHongAmt,
                date: tripDate,
                paymentMethod: 'Chuyển khoản',
                status: 'Chưa thu',
                note: 'Chênh lệch hoa hồng đại lý phơi ' + tCode
              });
            }
          }
        }
      });
    } catch (err) {
      console.warn('Lỗi đọc dữ liệu chuyến từ Tổng đài:', err);
    }

    return storedVouchers.concat(realTripVouchers);
  }

  function saveVouchers(list) { lsWrite(HN_ACCOUNTING_VOUCHERS_KEY, list); }

  function getFuelLogs() {
    var stored = lsRead(HN_ACCOUNTING_FUEL_LOGS_KEY, []);
    try {
      var realVehicles = lsRead(HN_VEHICLES_KEY, []);
      if (Array.isArray(realVehicles) && realVehicles.length > 0) {
        realVehicles.forEach(function (v, idx) {
          if (!v.plate) return;
          var exists = stored.some(function (f) { return f.plate === v.plate; });
          if (!exists) {
            stored.push({
              id: 'FL-' + String(idx + 10).padStart(3, '0'),
              date: todayISO(),
              plate: v.plate,
              driver: v.driverDefault || 'Tài xế tổng đài',
              tripCode: 'CHUYEN-' + v.plate.replace(/[^A-Za-z0-9]/g, '').slice(-4),
              startKm: 120000 + idx * 500,
              endKm: 120300 + idx * 500,
              distanceKm: 300,
              fuelLiters: 60,
              avgStandardL: 20.0,
              actualConsumptionL: 20.0,
              fuelCost: 1320000,
              station: 'Petrolimex Huệ Nghĩa',
              status: 'Normal',
              note: 'Nhật ký nạp dầu theo phương tiện ' + v.plate
            });
          }
        });
      }
    } catch (e) {}
    return stored;
  }
  function saveFuelLogs(list) { lsWrite(HN_ACCOUNTING_FUEL_LOGS_KEY, list); }

  function getAssets() { return lsRead(HN_ACCOUNTING_FIXED_ASSETS_KEY, []); }
  function saveAssets(list) { lsWrite(HN_ACCOUNTING_FIXED_ASSETS_KEY, list); }
  function getDebts() { return lsRead(HN_ACCOUNTING_DEBTS_KEY, []); }
  function saveDebts(list) { lsWrite(HN_ACCOUNTING_DEBTS_KEY, list); }

  function getPayroll() {
    var stored = lsRead(HN_ACCOUNTING_PAYROLL_KEY, []);
    try {
      var realStaff = lsRead(HN_STAFF_KEY, []);
      if (Array.isArray(realStaff) && realStaff.length > 0) {
        realStaff.forEach(function (st, idx) {
          if (!st.name) return;
          var exists = stored.some(function (p) { return p.name === st.name; });
          if (!exists) {
            var isHelper = (st.role || '').indexOf('Phụ xe') !== -1;
            var base = isHelper ? 6500000 : 9000000;
            var allow = 4500000;
            var bonus = 800000;
            stored.push({
              id: 'LUONG-' + String(idx + 10).padStart(3, '0'),
              name: st.name,
              role: st.role || 'Tài xế chính',
              baseSalary: base,
              tripAllowance: allow,
              bonus: bonus,
              fineDeduction: 0,
              netSalary: base + allow + bonus,
              status: 'Đã chi',
              month: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')
            });
          }
        });
      }
    } catch (e) {}
    return stored;
  }
  function savePayroll(list) { lsWrite(HN_ACCOUNTING_PAYROLL_KEY, list); }

  function getInspections() {
    var stored = lsRead(HN_ACCOUNTING_INSPECTION_KEY, []);
    try {
      var realVehicles = lsRead(HN_VEHICLES_KEY, []);
      if (Array.isArray(realVehicles) && realVehicles.length > 0) {
        realVehicles.forEach(function (v, idx) {
          if (!v.plate) return;
          var exists = stored.some(function (ins) { return ins.plate === v.plate; });
          if (!exists) {
            stored.push({
              id: 'INS-' + String(idx + 10).padStart(3, '0'),
              plate: v.plate,
              vehicleType: v.vehicleType || 'Xe giường nằm 34 chỗ',
              inspectionDate: '2026-11-15',
              compulsoryInsuranceDate: '2026-12-01',
              hullInsuranceDate: '2027-01-10',
              badgeDate: '2026-12-30',
              status: 'Safe',
              note: 'Tự động đồng bộ từ danh mục Đội xe FleetStore'
            });
          }
        });
      }
    } catch (e) {}
    return stored;
  }
  function saveInspections(list) { lsWrite(HN_ACCOUNTING_INSPECTION_KEY, list); }

  function getExpenseRequests() { return lsRead(HN_ACCOUNTING_EXPENSE_REQUESTS_KEY, []); }
  function saveExpenseRequests(list) { lsWrite(HN_ACCOUNTING_EXPENSE_REQUESTS_KEY, list); }

  // Danh mục Nhóm & Hạng mục Chi phí — Admin tự thêm/sửa/xóa (xem "QUẢN LÝ NHÓM & HẠNG MỤC CHI PHÍ"
  // bên trong viewAccountingChi). Nhóm lưu riêng ở HN_ACCOUNTING_CHI_GROUPS_KEY để tạo được nhóm rỗng
  // (chưa có hạng mục nào) và đổi tên nhóm — gõ nhóm mới khi thêm hạng mục vẫn tự tạo nhóm mới luôn.
  function getChiCategories() { return lsRead(HN_ACCOUNTING_CHI_CATEGORIES_KEY, []); }
  function saveChiCategories(list) { lsWrite(HN_ACCOUNTING_CHI_CATEGORIES_KEY, list); }
  function getChiGroups() { return lsRead(HN_ACCOUNTING_CHI_GROUPS_KEY, []); }
  function saveChiGroups(list) { lsWrite(HN_ACCOUNTING_CHI_GROUPS_KEY, list); }

  // Duyệt doanh thu theo Phơi — chỉ lưu danh sách Mã Phơi đã được duyệt (không đụng tới số liệu
  // Vouchers thật, vì doanh thu vẫn tự tính từ phơi xe/sơ đồ ghế, "duyệt" chỉ là đánh dấu đã kiểm tra).
  function getThuApproved() { return lsRead(HN_ACCOUNTING_THU_APPROVED_KEY, []); }
  function saveThuApproved(list) { lsWrite(HN_ACCOUNTING_THU_APPROVED_KEY, list); }

  // Tick chọn phơi (chưa lưu ngay) rồi bấm "Xác nhận" ở thanh trạng thái dính đáy màn hình mới thật sự
  // duyệt — cho phép chọn nhiều phơi cùng lúc thay vì phải xác nhận từng dòng một.
  window.onThuApprovalCheck = function (tripCode, checkboxEl) {
    if (checkboxEl.checked) THU_APPROVE_SEL[tripCode] = true; else delete THU_APPROVE_SEL[tripCode];
    syncThuApprovalBar();
  };

  function syncThuApprovalBar() {
    var bar = $('thuApprovalBar');
    if (!bar) return;
    var codes = Object.keys(THU_APPROVE_SEL);
    bar.style.display = codes.length ? 'flex' : 'none';
    var hint = $('thuApprovalHint');
    if (hint) hint.textContent = 'Đã chọn ' + codes.length + ' phơi';
    var wrap = $('thuOverviewWrap');
    if (wrap) wrap.classList.toggle('has-bulk-bar', codes.length > 0);
  }

  window.clearThuApprovalSel = function () {
    THU_APPROVE_SEL = {};
    renderAccountingThuView();
  };

  window.confirmThuApprovalSelected = function () {
    var codes = Object.keys(THU_APPROVE_SEL);
    if (!codes.length) return;
    if (!confirm('Xác nhận DUYỆT doanh thu cho ' + codes.length + ' phơi đã chọn?')) return;

    var list = getThuApproved();
    codes.forEach(function (c) { if (list.indexOf(c) === -1) list.push(c); });
    saveThuApproved(list);
    THU_APPROVE_SEL = {};
    showToast('Đã duyệt doanh thu ' + codes.length + ' phơi!');
    renderAccountingThuView();
  };

  // Khu vực & Trạm xe cho bộ lọc Doanh thu (THU) — đọc trực tiếp từ FleetStore (nguồn dữ liệu duy nhất
  // của trang "Trạm xe" bên Thiết lập vận tải) thay vì tự định nghĩa danh sách riêng trong module Kế toán.
  function acctAllStations() {
    try { return (window.FleetStore && window.FleetStore.getStations()) || []; } catch (e) { return []; }
  }

  function acctDistinctRegions() {
    var seen = {}, regions = [];
    acctAllStations().forEach(function (s) { if (s.region && !seen[s.region]) { seen[s.region] = true; regions.push(s.region); } });
    return regions;
  }

  function acctStationNamesInRegion(region) {
    return acctAllStations().filter(function (s) { return s.region === region; }).map(function (s) { return s.name; });
  }

  // Nhãn hiển thị đẹp cho các khu vực seed sẵn (trang Trạm xe cũng hiển thị "Trạm Sài Gòn/Bình Dương/An
  // Giang" chứ không lộ key thô) — khu vực Admin tự thêm mới thì hiển thị nguyên key luôn cho đơn giản.
  function acctRegionLabel(key) {
    var known = { saigon: 'Sài Gòn', binhduong: 'Bình Dương', angiang: 'An Giang' };
    return known[key] || key;
  }

  function acctChiDistinctGroups(catList) {
    catList = catList || getChiCategories();
    var seen = {}, groups = [];
    getChiGroups().forEach(function (g) { if (g.name && !seen[g.name]) { seen[g.name] = true; groups.push(g.name); } });
    catList.forEach(function (c) { if (c.group && !seen[c.group]) { seen[c.group] = true; groups.push(c.group); } });
    if (!groups.length) groups = ['Chi phí trực tiếp vận hành', 'Chi phí cố định', 'Chi phí khác'];
    return groups;
  }

  function acctChiGroupOptionsHtml(selected) {
    return acctChiDistinctGroups().map(function (g) {
      return '<option value="' + esc(g) + '"' + (g === selected ? ' selected' : '') + '>' + esc(g) + '</option>';
    }).join('');
  }

  // Expose seed init globally
  seedAccountingDefaults();

  /* ---------------------------------------------------------
     VIEW 1: TỔNG QUAN & BÁO CÁO ĐỊNH KỲ (viewAccountingReports)
     --------------------------------------------------------- */
  var CURRENT_REPORT_PERIOD = 'month'; // 'day', 'week', 'month', 'quarter', 'year'
  var REPORT_START_DATE = '';
  var REPORT_END_DATE = '';

  function calculatePeriodDateRange(p) {
    var now = new Date();
    var curYear = now.getFullYear();
    var curMonth = now.getMonth();
    var todayStr = todayISO();

    var startDate = '', endDate = '', labelText = '';

    if (p === 'day') {
      startDate = todayStr;
      endDate = todayStr;
      labelText = 'Hàng ngày (' + fmtDate(todayStr) + ')';
    } else if (p === 'week') {
      var dayOfWeek = now.getDay() || 7;
      var monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      var sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      startDate = monday.toISOString().slice(0, 10);
      endDate = sunday.toISOString().slice(0, 10);
      labelText = 'Hàng tuần (Từ ' + fmtDate(startDate) + ' đến ' + fmtDate(endDate) + ')';
    } else if (p === 'month') {
      var firstDay = new Date(curYear, curMonth, 1);
      var lastDay = new Date(curYear, curMonth + 1, 0);

      startDate = firstDay.toISOString().slice(0, 10);
      endDate = lastDay.toISOString().slice(0, 10);
      labelText = 'Tháng ' + (curMonth + 1) + '/' + curYear + ' (Từ ' + fmtDate(startDate) + ' đến ' + fmtDate(endDate) + ')';
    } else if (p === 'quarter') {
      var q = Math.floor(curMonth / 3);
      var qFirstDay = new Date(curYear, q * 3, 1);
      var qLastDay = new Date(curYear, q * 3 + 3, 0);

      startDate = qFirstDay.toISOString().slice(0, 10);
      endDate = qLastDay.toISOString().slice(0, 10);

      var qRoman = ['I', 'II', 'III', 'IV'][q];
      labelText = 'Quý ' + qRoman + '/' + curYear + ' (Từ ' + fmtDate(startDate) + ' đến ' + fmtDate(endDate) + ')';
    } else if (p === 'year') {
      startDate = curYear + '-01-01';
      endDate = curYear + '-12-31';
      labelText = 'Cả năm ' + curYear + ' (Từ 01/01/' + curYear + ' đến 31/12/' + curYear + ')';
    }

    return { startDate: startDate, endDate: endDate, labelText: labelText };
  }

  window.setAcctReportPeriod = function (p) {
    CURRENT_REPORT_PERIOD = p;
    var range = calculatePeriodDateRange(p);
    REPORT_START_DATE = range.startDate;
    REPORT_END_DATE = range.endDate;
    renderAccountingReportsView();
  };

  window.onReportCustomDateChange = function (start, end) {
    REPORT_START_DATE = start;
    REPORT_END_DATE = end;
    renderAccountingReportsView();
  };

  window.renderAccountingReportsView = function () {
    if (!REPORT_START_DATE && !REPORT_END_DATE) {
      var initialRange = calculatePeriodDateRange(CURRENT_REPORT_PERIOD);
      REPORT_START_DATE = initialRange.startDate;
      REPORT_END_DATE = initialRange.endDate;
    }

    var rangeInfo = calculatePeriodDateRange(CURRENT_REPORT_PERIOD);
    var dateBannerText = rangeInfo.labelText;
    if (REPORT_START_DATE || REPORT_END_DATE) {
      dateBannerText = 'Từ ' + fmtDate(REPORT_START_DATE || '2026-01-01') + ' đến ' + fmtDate(REPORT_END_DATE || todayISO());
    }

    var vList = getVouchers();
    if (REPORT_START_DATE || REPORT_END_DATE) {
      vList = vList.filter(function (v) {
        if (!v.date) return true;
        if (REPORT_START_DATE && v.date < REPORT_START_DATE) return false;
        if (REPORT_END_DATE && v.date > REPORT_END_DATE) return false;
        return true;
      });
    }

    var totalThu = 0, totalChi = 0;
    vList.forEach(function (v) {
      if (v.type === 'THU') totalThu += (Number(v.amount) || 0);
      else if (v.type === 'CHI') totalChi += (Number(v.amount) || 0);
    });

    var netProfit = totalThu - totalChi;
    var margin = totalThu > 0 ? ((netProfit / totalThu) * 100).toFixed(1) : 0;

    var html = '<div class="acct-header-bar">' +
      '<div><h2 class="acct-title">Báo cáo Kế toán & Tài chính Định kỳ</h2>' +
      '<p class="acct-subtitle">Tổng hợp tình hình doanh thu, chi phí, lãi lỗ (P&L) và hiệu quả vận tải nhà xe</p></div>' +
      '<div class="acct-actions">' +
      '<div class="acct-period-picker">' +
      '<button class="acct-btn-tab ' + (CURRENT_REPORT_PERIOD === 'day' ? 'active' : '') + '" onclick="setAcctReportPeriod(\'day\')">Hàng ngày</button>' +
      '<button class="acct-btn-tab ' + (CURRENT_REPORT_PERIOD === 'week' ? 'active' : '') + '" onclick="setAcctReportPeriod(\'week\')">Hàng tuần</button>' +
      '<button class="acct-btn-tab ' + (CURRENT_REPORT_PERIOD === 'month' ? 'active' : '') + '" onclick="setAcctReportPeriod(\'month\')">Hàng tháng (P&L)</button>' +
      '<button class="acct-btn-tab ' + (CURRENT_REPORT_PERIOD === 'quarter' ? 'active' : '') + '" onclick="setAcctReportPeriod(\'quarter\')">Hàng quý</button>' +
      '<button class="acct-btn-tab ' + (CURRENT_REPORT_PERIOD === 'year' ? 'active' : '') + '" onclick="setAcctReportPeriod(\'year\')">Hàng năm</button>' +
      '</div>' +
      '<button class="acct-btn acct-btn-primary" onclick="exportAcctExcel()"><svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Xuất Báo Cáo</button>' +
      '</div></div>';

    // Time Range Display Banner + Date Range Inputs
    html += '<div class="report-box" style="padding: 14px 20px; margin-bottom: 20px; background: #F8FAFC; border: 1px solid var(--border-gray); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">' +
      '<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">' +
      '<span class="badge" style="font-size: 13.5px; padding: 6px 16px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: #1E293B; background: #F1F5F9; border: 1px solid #CBD5E1;">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1E293B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
      'Đang hiển thị dữ liệu: ' + esc(dateBannerText) + '</span>' +
      '</div>' +
      '<div style="display: flex; align-items: center; gap: 8px;">' +
      '<label style="font-size: 12px; font-weight: 700; color: var(--text-sub);">Từ ngày:</label>' +
      '<input type="date" class="acct-input" value="' + esc(REPORT_START_DATE) + '" onchange="onReportCustomDateChange(this.value, REPORT_END_DATE)" style="padding: 5px 10px; font-size: 12.5px;" />' +
      '<label style="font-size: 12px; font-weight: 700; color: var(--text-sub);">Đến ngày:</label>' +
      '<input type="date" class="acct-input" value="' + esc(REPORT_END_DATE) + '" onchange="onReportCustomDateChange(REPORT_START_DATE, this.value)" style="padding: 5px 10px; font-size: 12.5px;" />' +
      '</div>' +
      '</div>';

    // Summary Cards
    html += '<div class="acct-stats-grid">' +
      '<div class="acct-stat-card card-c1">' +
      '<div class="stat-lbl">TỔNG DOANH THU (THU)</div>' +
      '<div class="stat-val text-c1">' + fmtMoney(totalThu) + '</div>' +
      '<div class="stat-sub">Vé lẻ, Vé đặt trước, Hoa hồng đại lý</div></div>' +

      '<div class="acct-stat-card card-c2">' +
      '<div class="stat-lbl">TỔNG CHI PHÍ (CHI)</div>' +
      '<div class="stat-val text-c2">' + fmtMoney(totalChi) + '</div>' +
      '<div class="stat-sub">Nhiên liệu, Lương, Bến bãi, Khấu hao</div></div>' +

      '<div class="acct-stat-card card-c3">' +
      '<div class="stat-lbl">LỢI NHUẬN RÒNG (P&L)</div>' +
      '<div class="stat-val text-c3">' + fmtMoney(netProfit) + '</div>' +
      '<div class="stat-sub">Tỷ suất lợi nhuận: <strong>' + margin + '%</strong></div></div>' +

      '<div class="acct-stat-card card-c4">' +
      '<div class="stat-lbl">CÔNG NỢ CẦN ĐỐI SOÁT</div>' +
      '<div class="stat-val text-c4">' + fmtMoney(55000000) + '</div>' +
      '<div class="stat-sub">Phải thu: ' + fmtMoney(15000000) + ' | Phải trả: ' + fmtMoney(40000000) + '</div></div>' +
      '</div>';

    // SVG Charts Section
    html += '<div class="acct-charts-row">' +
      '<div class="acct-chart-card flex-2">' +
      '<div class="chart-head"><h3>Biểu đồ Doanh thu & Chi phí theo mốc thời gian (' + periodTitle(CURRENT_REPORT_PERIOD) + ')</h3></div>' +
      '<div class="chart-body">' + renderBarChartSVG(vList) + '</div></div>' +

      '<div class="acct-chart-card flex-1">' +
      '<div class="chart-head"><h3>Cơ cấu Chi phí Vận hành</h3></div>' +
      '<div class="chart-body">' + renderPieChartSVG(vList) + '</div></div>' +
      '</div>';

    // Detailed Report Tables based on selected period
    html += '<div class="acct-report-details">' +
      renderPeriodReportContent(CURRENT_REPORT_PERIOD, vList) +
      '</div>';

    $('viewAccountingReports').innerHTML = html;
  };

  function periodTitle(p) {
    if (p === 'day') return 'Sổ thu chi từng chuyến / từng xe Hàng ngày';
    if (p === 'week') return 'Doanh thu theo Tuyến & Theo Xe Hàng tuần';
    if (p === 'month') return 'Báo cáo Lãi / Lỗ P&L Hàng tháng';
    if (p === 'quarter') return 'Tổng hợp Lãi / Lỗ & Hiệu quả Tuyến Hàng quý';
    return 'Báo cáo Tài chính & Khấu hao Cả năm';
  }

  function renderBarChartSVG(vList) {
    var width = 600, height = 220, padL = 50, padB = 30, padT = 20, padR = 20;
    var months = ['Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9'];
    var thuVals = [140, 165, 180, 210, 195, 240]; // in millions
    var chiVals = [95, 110, 115, 130, 125, 145];

    var maxVal = 260;
    var chartW = width - padL - padR;
    var chartH = height - padT - padB;
    var groupW = chartW / months.length;
    var barW = 18;

    var barsHtml = '';
    months.forEach(function (m, i) {
      var x0 = padL + i * groupW + (groupW - barW * 2 - 4) / 2;
      var hThu = (thuVals[i] / maxVal) * chartH;
      var yThu = height - padB - hThu;
      var hChi = (chiVals[i] / maxVal) * chartH;
      var yChi = height - padB - hChi;

      barsHtml += '<rect x="' + x0 + '" y="' + yThu + '" width="' + barW + '" height="' + hThu + '" fill="#C20D08" rx="3"><title>Thu ' + m + ': ' + thuVals[i] + ' trđ</title></rect>';
      barsHtml += '<rect x="' + (x0 + barW + 4) + '" y="' + yChi + '" width="' + barW + '" height="' + hChi + '" fill="#EA580C" rx="3"><title>Chi ' + m + ': ' + chiVals[i] + ' trđ</title></rect>';
      barsHtml += '<text x="' + (x0 + barW) + '" y="' + (height - 8) + '" font-size="11" text-anchor="middle" fill="#64748B">' + m + '</text>';
    });

    var gridLines = '';
    for (var g = 0; g <= 4; g++) {
      var y = height - padB - (g / 4) * chartH;
      var lbl = Math.round((g / 4) * maxVal);
      gridLines += '<line x1="' + padL + '" y1="' + y + '" x2="' + (width - padR) + '" y2="' + y + '" stroke="#E2E8F0" stroke-dasharray="3,3"/>';
      gridLines += '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" font-size="10" text-anchor="end" fill="#94A3B8">' + lbl + 'M</text>';
    }

    return '<svg viewBox="0 0 ' + width + ' ' + height + '" class="acct-chart-svg">' +
      gridLines + barsHtml +
      '<g transform="translate(' + (width - 150) + ', 10)">' +
      '<rect x="0" y="0" width="12" height="12" fill="#C20D08" rx="2"/><text x="18" y="10" font-size="11" fill="#475569">Doanh thu (Thu)</text>' +
      '<rect x="0" y="16" width="12" height="12" fill="#EA580C" rx="2"/><text x="18" y="26" font-size="11" fill="#475569">Chi phí (Chi)</text>' +
      '</g></svg>';
  }

  function renderPieChartSVG(vList) {
    return '<div class="donut-chart-box">' +
      '<svg viewBox="0 0 160 160" width="140" height="140">' +
      '<circle cx="80" cy="80" r="55" fill="none" stroke="#C20D08" stroke-width="24" stroke-dasharray="140 345" stroke-dashoffset="0"/>' +
      '<circle cx="80" cy="80" r="55" fill="none" stroke="#EA580C" stroke-width="24" stroke-dasharray="100 345" stroke-dashoffset="-140"/>' +
      '<circle cx="80" cy="80" r="55" fill="none" stroke="#F59E0B" stroke-width="24" stroke-dasharray="70 345" stroke-dashoffset="-240"/>' +
      '<circle cx="80" cy="80" r="55" fill="none" stroke="#D97706" stroke-width="24" stroke-dasharray="35 345" stroke-dashoffset="-310"/>' +
      '<text x="80" y="76" font-size="12" font-weight="bold" text-anchor="middle" fill="#1E293B">Cơ cấu</text>' +
      '<text x="80" y="92" font-size="11" text-anchor="middle" fill="#64748B">Chi phí</text>' +
      '</svg>' +
      '<div class="donut-legend">' +
      '<div class="leg-item"><span class="leg-dot bg-c1"></span> Nhiên liệu (41%)</div>' +
      '<div class="leg-item"><span class="leg-dot bg-c2"></span> Lương tài xế (29%)</div>' +
      '<div class="leg-item"><span class="leg-dot bg-c3"></span> Bến bãi & BOT (20%)</div>' +
      '<div class="leg-item"><span class="leg-dot bg-c4"></span> Bảo trì & Khác (10%)</div>' +
      '</div></div>';
  }

  function renderPeriodReportContent(period, vList) {
    if (period === 'day') {
      var trips = window.TripService ? window.TripService.getAll() : [];
      var seatBank = lsRead(HN_STORAGE_KEY, {});

      var rowsHtml = '';
      if (!trips || trips.length === 0) {
        rowsHtml = '<tr><td colspan="11" class="text-center py-4 text-sub">Chưa có chuyến phơi nào trong hệ thống Tổng đài</td></tr>';
      } else {
        trips.forEach(function (t) {
          var tripId = t.id || t.tripId || t.code;
          var seats = seatBank[tripId] || {};
          var bookedCount = 0;
          var rev = 0;
          var totalSeats = t.seatCount || t.seats || 34;

          Object.keys(seats).forEach(function (sk) {
            var s = seats[sk];
            if (s && (s.status === 'sold' || s.status === 'booked' || s.paxName || s.price)) {
              bookedCount++;
              rev += Number(s.price) || Number(t.price) || 160000;
            }
          });

          var cost = Math.round(rev * 0.35) || 4500000; // estimated operational trip cost
          var net = rev - cost;
          var statusBadge = bookedCount > 0 ? '<span class="badge badge-success">Đã đối soát</span>' : '<span class="badge badge-warning">Đang chờ phơi</span>';

          rowsHtml += '<tr>' +
            '<td><strong>' + esc(t.code || tripId) + '</strong></td>' +
            '<td>' + fmtDate(t.date || todayISO()) + '</td>' +
            '<td><span class="badge badge-tag">' + esc(t.time || '08:00') + '</span></td>' +
            '<td><strong>' + esc(t.plate || 'Chưa xếp xe') + '</strong></td>' +
            '<td>' + esc(t.driver || 'Chưa phân công') + ' / ' + esc(t.attendant || '—') + '</td>' +
            '<td>' + esc(t.route || (t.from ? t.from + ' - ' + t.to : 'Tuyến chính')) + '</td>' +
            '<td>' + bookedCount + ' / ' + totalSeats + ' vé</td>' +
            '<td>' + fmtMoney(rev) + '</td>' +
            '<td>' + fmtMoney(cost) + '</td>' +
            '<td class="' + (net >= 0 ? 'text-green' : 'text-red') + ' font-bold">' + fmtMoney(net) + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td><button class="acct-btn acct-btn-primary" style="padding: 4px 10px; font-size: 11.5px; background: #0F172A; border-color: #0F172A; color: #FFFFFF;" onclick="openTongDaiPhoiDetailModal(\'' + esc(t.code || tripId) + '\', \'' + esc(t.route || (t.from ? t.from + ' - ' + t.to : 'Tuyến chính')) + '\')">Phơi Tổng Đài</button></td>' +
            '</tr>';
        });
      }

      return '<div class="report-box">' +
        '<h4>Sổ Thu Chi Từng Chuyến / Từng Xe Hàng Ngày</h4>' +
        '<table class="acct-table"><thead><tr>' +
        '<th>Mã chuyến</th><th>Ngày</th><th>Giờ</th><th>Biển số xe</th><th>Tài xế / Phụ xe</th><th>Tuyến đường</th><th>Số vé đã bán</th><th>Doanh thu phơi</th><th>Chi phí chuyến</th><th>Thu thuần chuyến</th><th>Trạng thái đối chiếu</th><th>Phơi Vé Tổng Đài</th>' +
        '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
    }
    if (period === 'week') {
      return '<div class="report-box">' +
        '<h4>Tổng hợp Doanh thu & Chi phí theo Tuyến & Đầu xe Hàng tuần</h4>' +
        '<table class="acct-table"><thead><tr>' +
        '<th>Tuyến đường / Xe</th><th>Số chuyến chạy</th><th>Tổng Doanh thu</th><th>Tổng Chi phí</th><th>Lợi nhuận ròng</th><th>Hiệu quả / Chuyến</th>' +
        '</tr></thead><tbody>' +
        '<tr><td><strong>Tuyến TP.HCM - An Giang</strong></td><td>28 chuyến</td><td>380.000.000đ</td><td>210.000.000đ</td><td class="text-green font-bold">170.000.000đ</td><td>6.071.000đ / chuyến</td></tr>' +
        '<tr><td><strong>Tuyến TP.HCM - Châu Đốc</strong></td><td>21 chuyến</td><td>340.000.000đ</td><td>185.000.000đ</td><td class="text-green font-bold">155.000.000đ</td><td>7.380.000đ / chuyến</td></tr>' +
        '<tr><td><strong>Xe 67B-012.34 (Universe 47c)</strong></td><td>14 chuyến</td><td>182.000.000đ</td><td>98.000.000đ</td><td class="text-green font-bold">84.000.000đ</td><td>6.000.000đ / chuyến</td></tr>' +
        '<tr><td><strong>Xe 67B-056.78 (Limousine 34g)</strong></td><td>14 chuyến</td><td>224.000.000đ</td><td>112.000.000đ</td><td class="text-green font-bold">112.000.000đ</td><td>8.000.000đ / chuyến</td></tr>' +
        '</tbody></table></div>';
    }
    if (period === 'month') {
      return '<div class="report-box">' +
        '<h4>Báo Cáo Lãi / Lỗ P&L Hàng Tháng (Tháng 9/2026)</h4>' +
        '<div class="pnl-grid">' +
        '<div class="pnl-col"><h5>1. DOANH THU HOẠT ĐỘNG</h5><ul>' +
        '<li>Doanh thu bán vé lẻ bến & điểm đón: <strong>850.000.000đ</strong></li>' +
        '<li>Doanh thu vé đặt trước (Online/App): <strong>620.000.000đ</strong></li>' +
        '<li>Hoa hồng bán hộ đại lý: <strong>45.000.000đ</strong></li>' +
        '<li class="pnl-total text-green">TỔNG DOANH THU: 1.515.000.000đ</li></ul></div>' +

        '<div class="pnl-col"><h5>2. CHI PHÍ VẬN HÀNH</h5><ul>' +
        '<li>Nhiên liệu (Dầu Diesel): <strong>380.000.000đ</strong></li>' +
        '<li>Lương & Phụ cấp Tài xế, Phụ xe: <strong>260.000.000đ</strong></li>' +
        '<li>Phí Bến bãi, BOT cầu đường: <strong>185.000.000đ</strong></li>' +
        '<li>Bảo trì, sửa chữa, thay lốp: <strong>95.000.000đ</strong></li>' +
        '<li>Chi phí cố định (Lương VP, Thuê bến, Bảo hiểm): <strong>140.000.000đ</strong></li>' +
        '<li class="pnl-total text-red">TỔNG CHI PHÍ: 1.060.000.000đ</li></ul></div>' +
        '</div>' +
        '<div class="pnl-summary-banner">LỢI NHUẬN TRƯỚC THUẾ (P&L): <span class="text-green">455.000.000đ</span> (Tỷ suất LN: 30.0%)</div></div>';
    }
    if (period === 'quarter') {
      return '<div class="report-box">' +
        '<h4>Báo Cáo Tổng Hợp Lãi / Lỗ Quý & Kế Hoạch Bảo Trì Đại Tu</h4>' +
        '<p class="mb-3 text-sub">So sánh Quý III/2026 với Quý II/2026 và Đánh giá hiệu quả từng tuyến/đầu xe:</p>' +
        '<table class="acct-table"><thead><tr>' +
        '<th>Chỉ số tài chính Quý</th><th>Quý II / 2026</th><th>Quý III / 2026</th><th>Tăng / Giảm (%)</th><th>Đánh giá hiệu quả</th>' +
        '</tr></thead><tbody>' +
        '<tr><td>Tổng Doanh thu</td><td>3.850.000.000đ</td><td>4.450.000.000đ</td><td class="text-green">+15.5% ▲</td><td><span class="badge badge-success">Tăng trưởng tốt</span></td></tr>' +
        '<tr><td>Tổng Chi phí Vận hành</td><td>2.700.000.000đ</td><td>3.050.000.000đ</td><td class="text-red">+12.9% ▲</td><td>Nhiên liệu biến động nhẹ</td></tr>' +
        '<tr><td>Lợi nhuận Thuần Quý</td><td>1.150.000.000đ</td><td>1.400.000.000đ</td><td class="text-green">+21.7% ▲</td><td><span class="badge badge-success">Lời cao</span></td></tr>' +
        '<tr><td>Kế hoạch Bảo trì lớn Quý tới</td><td colspan="4">Kế hoạch đại tu 4 xe giường nằm & thay lốp hàng loạt cho đội xe 67B-012.34, 67B-056.78 (Dự kiến ngân sách 180 triệu).</td></tr>' +
        '</tbody></table></div>';
    }
    // Year
    return '<div class="report-box">' +
      '<h4>Báo Cáo Tài Chính Năm, Khấu Hao & Đánh Giá ROI Đầu Tư Xe</h4>' +
      '<div class="pnl-grid">' +
      '<div class="pnl-col"><h5>1. KẾT QUẢ KINH DOANH CẢ NĂM</h5><ul>' +
      '<li>Tổng Thu Cả Năm: <strong>16.800.000.000đ</strong></li>' +
      '<li>Tổng Chi Cả Năm: <strong>11.500.000.000đ</strong></li>' +
      '<li>Khấu hao Tài sản Cả năm: <strong>680.000.000đ</strong></li>' +
      '<li>Quyết toán Thuế TNDN (20%): <strong>924.000.000đ</strong></li>' +
      '<li class="pnl-total text-green">LỢI NHUẬN SAU THUẾ: 3.696.000.000đ</li></ul></div>' +

      '<div class="pnl-col"><h5>2. ĐÁNH GIÁ ROI & ĐẦU TƯ XE CŨ / MỚI</h5><ul>' +
      '<li>Xe 67B-012.34 (2022): ROI 28% / năm — <strong>Nên duy trì vận hành</strong></li>' +
      '<li>Xe 67B-056.78 (2024): ROI 35% / năm — <strong>Xe VIP hiệu quả cao nhất</strong></li>' +
      '<li>Xe 67B-099.11 (2018): Chi phí sửa chữa tăng 40% — <strong>Đề xuất thanh lý mua xe mới năm 2027</strong></li>' +
      '</ul></div>' +
      '</div></div>';
  }


  /* ---------------------------------------------------------
     VIEW 2: QUẢN LÝ THU (DOANH THU PHƠI TỔNG ĐÀI) (viewAccountingThu)
     --------------------------------------------------------- */
  var THU_SEARCH_KW = '', THU_CAT_FILTER = 'all', THU_STATUS_FILTER = 'all', THU_SUB_TAB = 'overview';
  var THU_DATE_FILTER = '', THU_REGION_FILTER = 'all', THU_STATION_FILTER = 'all';
  var THU_APPROVE_SEL = {}; // { tripCode: true } — phơi đang được tick chọn để duyệt hàng loạt, chưa lưu tới khi bấm "Xác nhận duyệt" ở thanh trạng thái dưới đáy

  window.setThuSubTab = function (tab) {
    THU_SUB_TAB = tab;
    renderAccountingThuView();
  };

  window.renderAccountingThuView = function () {
    var allThuVouchers = getVouchers().filter(function (v) { return v.type === 'THU'; });

    // Filter list for general view
    var vList = allThuVouchers.slice();
    if (THU_CAT_FILTER !== 'all') {
      vList = vList.filter(function (v) { return v.category === THU_CAT_FILTER; });
    }
    if (THU_STATUS_FILTER !== 'all') {
      vList = vList.filter(function (v) { return v.status === THU_STATUS_FILTER; });
    }
    if (THU_DATE_FILTER) {
      vList = vList.filter(function (v) { return v.date === THU_DATE_FILTER; });
    }
    if (THU_STATION_FILTER !== 'all') {
      vList = vList.filter(function (v) { return v.fromStation === THU_STATION_FILTER || v.toStation === THU_STATION_FILTER; });
    } else if (THU_REGION_FILTER !== 'all') {
      var regionStations = acctStationNamesInRegion(THU_REGION_FILTER);
      vList = vList.filter(function (v) { return regionStations.indexOf(v.fromStation) !== -1 || regionStations.indexOf(v.toStation) !== -1; });
    }
    if (THU_SEARCH_KW) {
      var kw = THU_SEARCH_KW.toLowerCase();
      vList = vList.filter(function (v) {
        return (v.id || '').toLowerCase().indexOf(kw) !== -1 ||
          (v.source || '').toLowerCase().indexOf(kw) !== -1 ||
          (v.route || '').toLowerCase().indexOf(kw) !== -1 ||
          (v.plate || '').toLowerCase().indexOf(kw) !== -1 ||
          (v.driver || '').toLowerCase().indexOf(kw) !== -1;
      });
    }

    var html = '';

    // Sub-tab Picker
    html += '<div class="acct-period-picker" style="margin-bottom: 20px; display: flex; gap: 8px; flex-wrap: wrap;">' +
      '<button class="acct-btn-tab ' + (THU_SUB_TAB === 'overview' ? 'active' : '') + '" onclick="setThuSubTab(\'overview\')">Tất Cả Nguồn Thu & Phiếu Thu</button>' +
      '<button class="acct-btn-tab ' + (THU_SUB_TAB === 'route' ? 'active' : '') + '" onclick="setThuSubTab(\'route\')">Theo Hướng</button>' +
      '</div>';

    // RENDER SUB-TAB CONTENT
    if (THU_SUB_TAB === 'overview') {
      // Sub-tab 1: Overview & All Vouchers Table
      var regionOptionsHtml = acctDistinctRegions().map(function (r) {
        return '<option value="' + esc(r) + '"' + (r === THU_REGION_FILTER ? ' selected' : '') + '>' + esc(acctRegionLabel(r)) + '</option>';
      }).join('');
      var stationList = THU_REGION_FILTER !== 'all' ? acctAllStations().filter(function (s) { return s.region === THU_REGION_FILTER; }) : acctAllStations();
      var stationOptionsHtml = stationList.map(function (s) {
        return '<option value="' + esc(s.name) + '"' + (s.name === THU_STATION_FILTER ? ' selected' : '') + '>' + esc(s.name) + '</option>';
      }).join('');

      html += '<div class="acct-filter-bar">' +
        '<input type="text" id="thuSearchInput" class="acct-input" placeholder="Tìm theo mã phiếu, tuyến, biển số, tài xế..." value="' + esc(THU_SEARCH_KW) + '" oninput="onThuSearchInput(this.value)" />' +
        '<select class="acct-select" style="width: 150px;" onchange="onThuCatFilter(this.value)">' +
        '<option value="all"' + (THU_CAT_FILTER === 'all' ? ' selected' : '') + '>Tất cả Nguồn Thu</option>' +
        '<option value="Vé lẻ"' + (THU_CAT_FILTER === 'Vé lẻ' ? ' selected' : '') + '>Vé lẻ (tại bến / điểm đón)</option>' +
        '<option value="Vé đặt trước"' + (THU_CAT_FILTER === 'Vé đặt trước' ? ' selected' : '') + '>Vé đặt trước (Online / Tổng đài)</option>' +
        '<option value="Hoa hồng đại lý"' + (THU_CAT_FILTER === 'Hoa hồng đại lý' ? ' selected' : '') + '>Hoa hồng đại lý bán hộ</option>' +
        '</select>' +
        '<select class="acct-select" style="width: 130px;" onchange="onThuStatusFilter(this.value)">' +
        '<option value="all"' + (THU_STATUS_FILTER === 'all' ? ' selected' : '') + '>Trạng thái Thu</option>' +
        '<option value="Đã thu"' + (THU_STATUS_FILTER === 'Đã thu' ? ' selected' : '') + '>Đã thu</option>' +
        '<option value="Chưa thu"' + (THU_STATUS_FILTER === 'Chưa thu' ? ' selected' : '') + '>Chưa thu</option>' +
        '</select>' +
        '<input type="date" class="acct-input" style="width: 150px;" value="' + esc(THU_DATE_FILTER) + '" onchange="onThuDateFilter(this.value)" title="Lọc theo ngày" />' +
        '<select class="acct-select" style="width: 140px;" onchange="onThuRegionFilter(this.value)">' +
        '<option value="all"' + (THU_REGION_FILTER === 'all' ? ' selected' : '') + '>Tất cả Khu vực</option>' +
        regionOptionsHtml +
        '</select>' +
        '<select class="acct-select" style="width: 160px;" onchange="onThuStationFilter(this.value)">' +
        '<option value="all"' + (THU_STATION_FILTER === 'all' ? ' selected' : '') + '>Tất cả Trạm xe</option>' +
        stationOptionsHtml +
        '</select>' +
        '</div>';

      // Gom các phiếu thu theo từng Phơi (Mã chuyến) — hiển thị Tổng tiền / Tiền mặt / Chuyển khoản / Chưa thu
      var phoiMap = {};
      vList.forEach(function (v) {
        var pCode = v.tripCode || v.id;
        if (!phoiMap[pCode]) {
          phoiMap[pCode] = {
            tripCode: pCode,
            date: v.date,
            route: v.route,
            plate: v.plate,
            driver: v.driver,
            attendant: v.attendant,
            total: 0,
            cash: 0,
            transfer: 0,
            chuaThu: 0
          };
        }
        var p = phoiMap[pCode];
        var amt = Number(v.amount) || 0;
        p.total += amt;
        if (v.status === 'Đã thu') {
          if ((v.paymentMethod || '').indexOf('Tiền mặt') !== -1) p.cash += amt;
          else p.transfer += amt;
        } else {
          p.chuaThu += amt;
        }
      });

      var approvedTrips = getThuApproved();
      var hasPendingSel = Object.keys(THU_APPROVE_SEL).length > 0;

      html += '<div class="phoi-grid-wrap' + (hasPendingSel ? ' has-bulk-bar' : '') + '" id="thuOverviewWrap">' +
        '<div class="report-box"><table class="acct-table"><thead><tr>' +
        '<th>#</th><th>Mã Phơi</th><th>Ngày</th><th>Tuyến đường</th><th>Biển số xe</th><th>Tài xế / Phụ xe</th><th>Doanh thu</th><th>Trạng thái</th><th>Thao tác</th><th>Duyệt</th>' +
        '</tr></thead><tbody>';

      var phoiKeys = Object.keys(phoiMap);
      if (phoiKeys.length === 0) {
        html += '<tr><td colspan="10" class="text-center py-4 text-sub">Chưa có dữ liệu phơi thu nào phù hợp</td></tr>';
      } else {
        phoiKeys.forEach(function (pKey, idx) {
          var p = phoiMap[pKey];
          var isFull = p.chuaThu === 0;
          var isApproved = approvedTrips.indexOf(p.tripCode) !== -1;
          html += '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td><strong>' + esc(p.tripCode) + '</strong></td>' +
            '<td>' + fmtDate(p.date) + '</td>' +
            '<td>' + esc(p.route) + '</td>' +
            '<td><strong>' + esc(p.plate) + '</strong></td>' +
            '<td>' + esc(p.driver) + ' / ' + esc(p.attendant || '—') + '</td>' +
            '<td style="color: #0F172A; font-weight: 700;">' + fmtMoney(p.total) +
            '<br><small style="color: #64748B; font-weight: 500;">TM: ' + fmtMoney(p.cash) + ' · CK: ' + fmtMoney(p.transfer) + '</small></td>' +
            '<td>' + (isFull ? '<span class="badge badge-success">Đã thu đủ</span>' : '<span class="badge badge-warning">Còn nợ</span>') +
            (p.chuaThu > 0 ? '<br><small class="text-red font-bold">Còn: ' + fmtMoney(p.chuaThu) + '</small>' : '') + '</td>' +
            '<td>' +
            '<button class="acct-btn" style="padding: 3px 8px; font-size: 11px; margin-right: 6px; background: #F1F5F9; border: 1px solid #CBD5E1; color: #1E293B;" onclick="openTongDaiPhoiDetailModal(\'' + esc(p.tripCode) + '\', \'' + esc(p.route) + '\')">Chi tiết</button>' +
            (isFull ? '' : '<button class="acct-btn acct-btn-primary" style="padding: 4px 10px; font-size: 11.5px; background: #0F172A; border-color: #0F172A;" onclick="confirmCollectAllTripCash(\'' + esc(p.tripCode) + '\')">Thu Hết</button>') +
            '</td>' +
            '<td style="text-align: center;">' + (isApproved ?
              '<span class="badge badge-success">Đã duyệt</span>' :
              '<input type="checkbox" ' + (THU_APPROVE_SEL[p.tripCode] ? 'checked' : '') + ' title="Chọn để duyệt doanh thu phơi này" onchange="onThuApprovalCheck(\'' + esc(p.tripCode) + '\', this)" />') + '</td>' +
            '</tr>';
        });
      }
      html += '</tbody></table></div></div>' +
        '<div class="bulk-bar" id="thuApprovalBar" style="display: ' + (hasPendingSel ? 'flex' : 'none') + ';">' +
        '<span class="bulk-bar-hint" id="thuApprovalHint">Đã chọn ' + Object.keys(THU_APPROVE_SEL).length + ' phơi</span>' +
        '<div class="bulk-bar-fields">' +
        '<button type="button" class="acct-btn" onclick="clearThuApprovalSel()">Hủy</button>' +
        '<button type="button" class="acct-btn acct-btn-primary" onclick="confirmThuApprovalSelected()">Xác Nhận Duyệt Doanh Thu Đã Chọn</button>' +
        '</div></div>';

    } else if (THU_SUB_TAB === 'route') {
      // Sub-tab 2: Doanh Thu Theo Hướng
      var routeMap = {};
      allThuVouchers.forEach(function (v) {
        var rName = v.route || 'Tuyến chưa phân loại';
        if (!routeMap[rName]) {
          routeMap[rName] = { routeName: rName, tripCodes: {}, veLe: 0, veDat: 0, hoaHong: 0, total: 0, daThu: 0, chuaThu: 0 };
        }
        if (v.tripCode) routeMap[rName].tripCodes[v.tripCode] = true;
        var amt = Number(v.amount) || 0;
        if (v.category === 'Vé lẻ') routeMap[rName].veLe += amt;
        else if (v.category === 'Hoa hồng đại lý') routeMap[rName].hoaHong += amt;
        else routeMap[rName].veDat += amt;

        routeMap[rName].total += amt;
        if (v.status === 'Đã thu') routeMap[rName].daThu += amt;
        else routeMap[rName].chuaThu += amt;
      });

      html += '<style>.rt-wrap th,.rt-wrap td{white-space:normal;word-break:break-word;padding:8px 8px;font-size:12px}.rt-wrap th{white-space:normal}</style>' +
        '<div class="report-box rt-wrap" style="overflow-x: auto;"><table class="acct-table" style="width: 100%;"><thead><tr>' +
        '<th>#</th><th>Hướng Đi</th><th>Số Phơi</th><th>Vé Lẻ</th><th>Vé Đặt Trước</th><th>Hoa Hồng Đại Lý</th><th>Tổng Doanh Thu</th><th>Thực Thu</th><th>Thao Tác</th>' +
        '</tr></thead><tbody>';

      var routeKeys = Object.keys(routeMap);
      if (routeKeys.length === 0) {
        html += '<tr><td colspan="9" class="text-center py-4 text-sub">Chưa có dữ liệu theo hướng</td></tr>';
      } else {
        routeKeys.forEach(function (rKey, idx) {
          var r = routeMap[rKey];
          var numTrips = Object.keys(r.tripCodes).length || 1;
          html += '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td><strong>' + esc(r.routeName) + '</strong></td>' +
            '<td><span class="badge badge-tag">' + numTrips + ' phơi</span></td>' +
            '<td>' + fmtMoney(r.veLe) + '</td>' +
            '<td>' + fmtMoney(r.veDat) + '</td>' +
            '<td>' + fmtMoney(r.hoaHong) + '</td>' +
            '<td style="color: #0F172A; font-weight: 700;">' + fmtMoney(r.total) + '</td>' +
            '<td>' + fmtMoney(r.daThu) + '</td>' +
            '<td><button class="acct-btn" style="padding: 3px 10px; font-size: 11.5px; background: #F1F5F9; border: 1px solid #CBD5E1; color: #1E293B;" onclick="openRoutePhoiListModal(\'' + esc(r.routeName) + '\')">Chi tiết</button></td>' +
            '</tr>';
        });
      }
      html += '</tbody></table></div>';

    }

    $('viewAccountingThu').innerHTML = html;
  };

  // Danh sách phơi của 1 hướng trong ngày đang lọc (mặc định hôm nay) — mở từ nút "Chi tiết" ở tab Theo Hướng
  window.openRoutePhoiListModal = function (routeName) {
    var day = THU_DATE_FILTER || todayISO();
    var phoi = {};
    getVouchers().forEach(function (v) {
      if (v.type !== 'THU' || (v.route || 'Tuyến chưa phân loại') !== routeName || v.date !== day) return;
      var k = v.tripCode || v.id;
      var p = phoi[k] || (phoi[k] = { tripCode: k, plate: v.plate, driver: v.driver, attendant: v.attendant, total: 0, chuaThu: 0 });
      var amt = Number(v.amount) || 0;
      p.total += amt;
      if (v.status !== 'Đã thu') p.chuaThu += amt;
    });
    var keys = Object.keys(phoi);
    var rows = keys.length ? keys.map(function (k, i) {
      var p = phoi[k];
      return '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(p.tripCode) + '</strong></td><td>' + esc(p.plate || '—') + '</td>' +
        '<td>' + esc(p.driver || '—') + ' / ' + esc(p.attendant || '—') + '</td>' +
        '<td style="font-weight: 700;">' + fmtMoney(p.total) + '</td>' +
        '<td>' + (p.chuaThu > 0 ? '<span class="badge badge-warning">Còn nợ ' + fmtMoney(p.chuaThu) + '</span>' : '<span class="badge badge-success">Đã thu đủ</span>') + '</td>' +
        '<td><button class="acct-btn" style="padding: 3px 8px; font-size: 11px;" onclick="openTongDaiPhoiDetailModal(\'' + esc(p.tripCode) + '\', \'' + esc(routeName) + '\')">Xem phơi</button></td></tr>';
    }).join('') : '<tr><td colspan="7" class="text-center py-4 text-sub">Không có phơi nào của hướng này trong ngày</td></tr>';
    openAdminModal('<div class="modal-form-box" style="max-width: 860px; width: 100%; background: #FFFFFF; padding: 24px; border-radius: 10px; overflow-y: auto;">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">' +
      '<div><h2 style="font-size: 18px; font-weight: 800; color: #0F172A; margin: 0;">Phơi hướng ' + esc(routeName) + '</h2>' +
      '<div style="font-size: 12.5px; color: #64748B; margin-top: 2px;">Ngày ' + fmtDate(day) + ' • ' + keys.length + ' phơi</div></div>' +
      '<button type="button" onclick="closeAdminModal()" style="border:none; background:none; font-size:22px; cursor:pointer; color:#64748B;">✕</button></div>' +
      '<div style="overflow-x: auto;"><table class="acct-table" style="width: 100%;"><thead><tr><th>#</th><th>Mã Phơi</th><th>Biển số</th><th>Tài xế / Phụ xe</th><th>Doanh thu</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '</div>', true);
  };

  /* ---------------------------------------------------------
     MODAL ĐỐI SOÁT PHƠI XE CHI TIẾT THEO TÀI XẾ & PHỤ XE
     --------------------------------------------------------- */
  window.openDriverTripAuditModal = function (driverName, attendantName) {
    driverName = driverName || 'Chưa phân công';
    attendantName = attendantName || '—';

    var allVouchers = getVouchers().filter(function (v) {
      return v.type === 'THU' && (v.driver === driverName || (attendantName !== '—' && v.attendant === attendantName));
    });

    var totalRev = 0, daThuAmt = 0, chuaThuAmt = 0;
    allVouchers.forEach(function (v) {
      var amt = Number(v.amount) || 0;
      totalRev += amt;
      if (v.status === 'Đã thu') daThuAmt += amt;
      else chuaThuAmt += amt;
    });

    var modalHtml = '<div class="modal-form-box" style="max-width: 900px; width: 100%;">' +
      '<div class="modal-head" style="border-bottom: 2px solid var(--border-gray); padding-bottom: 12px; margin-bottom: 16px;">' +
      '<div>' +
      '<h3 style="margin: 0; font-size: 18px; color: #1E293B;">Bảng Đối Soát Phơi Xe & Tiền Vé Chi Tiết</h3>' +
      '<p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B;">Tài xế chính: <strong>' + esc(driverName) + '</strong> | Phụ xe: <strong>' + esc(attendantName) + '</strong></p>' +
      '</div>' +
      '<button type="button" class="btn-close" onclick="closeAdminModal()">✕</button>' +
      '</div>';

    // Summary Cards in Modal
    modalHtml += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">' +
      '<div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">' +
      '<div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Tổng Số Phơi Xe</div>' +
      '<div style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 4px;">' + allVouchers.length + ' phiếu phơi</div>' +
      '</div>' +
      '<div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 12px 16px; border-radius: 8px;">' +
      '<div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">Đã Nộp Về Quỹ (Đã Thu)</div>' +
      '<div style="font-size: 20px; font-weight: 800; color: #15803D; margin-top: 4px;">' + fmtMoney(daThuAmt) + '</div>' +
      '</div>' +
      '<div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 12px 16px; border-radius: 8px;">' +
      '<div style="font-size: 11px; font-weight: 700; color: #991B1B; text-transform: uppercase;">Tiền Mặt Chưa Nộp (Nợ Phơi)</div>' +
      '<div style="font-size: 20px; font-weight: 800; color: #DC2626; margin-top: 4px;">' + fmtMoney(chuaThuAmt) + '</div>' +
      '</div>' +
      '</div>';

    // Trip List Table
    modalHtml += '<div style="max-height: 380px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 20px;">' +
      '<table class="acct-table" style="width: 100%; margin: 0;"><thead><tr>' +
      '<th>Phơi / Mã Phiếu</th><th>Ngày Chạy</th><th>Tuyến Đường</th><th>Biển Số</th><th>Loại Nguồn</th><th>Số Tiền</th><th>P.Thức</th><th>Trạng Thái</th><th>Thao Tác Thu Tiền</th>' +
      '</tr></thead><tbody>';

    if (allVouchers.length === 0) {
      modalHtml += '<tr><td colspan="9" class="text-center py-4 text-sub">Không có dữ liệu phơi xe nào của tài xế này</td></tr>';
    } else {
      allVouchers.forEach(function (v) {
        var isCollected = v.status === 'Đã thu';
        modalHtml += '<tr>' +
          '<td><strong>' + esc(v.id) + '</strong></td>' +
          '<td>' + fmtDate(v.date) + '</td>' +
          '<td>' + esc(v.route) + '</td>' +
          '<td><strong>' + esc(v.plate) + '</strong></td>' +
          '<td><span class="badge badge-tag">' + esc(v.category) + '</span></td>' +
          '<td class="font-bold text-green">' + fmtMoney(v.amount) + '</td>' +
          '<td>' + esc(v.paymentMethod) + '</td>' +
          '<td>' + (isCollected ? '<span class="badge badge-success">Đã Nộp Quỹ</span>' : '<span class="badge badge-warning">Chờ Nộp Tiền</span>') + '</td>' +
          '<td>' +
          '<button class="acct-btn" style="padding: 3px 8px; font-size: 11px; margin-right: 6px; background: #F1F5F9; border: 1px solid #CBD5E1; color: #1E293B;" onclick="openTongDaiPhoiDetailModal(\'' + esc(v.tripCode || v.id) + '\', \'' + esc(v.route) + '\')">Phơi Tổng Đài</button>' +
          (isCollected ?
            '<span style="font-size: 12px; color: #16A34A; font-weight: 700;">Đã khớp tiền</span>' :
            '<button class="acct-btn acct-btn-primary" style="padding: 4px 10px; font-size: 11.5px; background: #0F172A; border-color: #0F172A;" onclick="confirmCollectTripCash(\'' + v.id + '\', \'' + esc(driverName) + '\', \'' + esc(attendantName) + '\')">Xác Nhận Đã Thu</button>') +
          '</td>' +
          '</tr>';
      });
    }

    modalHtml += '</tbody></table></div>';

    // Footer actions
    modalHtml += '<div class="modal-foot" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 14px;">' +
      '<div>' +
      (chuaThuAmt > 0 ?
        '<button class="acct-btn acct-btn-primary" style="background: #0F172A; border-color: #0F172A;" onclick="confirmCollectAllDriverCash(\'' + esc(driverName) + '\', \'' + esc(attendantName) + '\')">Duyệt thu tất cả ' + fmtMoney(chuaThuAmt) + ' của tài xế này</button>' :
        '<span style="font-size: 13px; color: #16A34A; font-weight: 700;">Tài xế đã quyết toán và nộp đủ 100% tiền phơi</span>') +
      '</div>' +
      '<button type="button" class="acct-btn" onclick="closeAdminModal()">Đóng</button>' +
      '</div></div>';

    openAdminModal(modalHtml, true);
  };

  window.confirmCollectTripCash = function (vId, driverName, attendantName) {
    var list = getVouchers();
    var idx = list.findIndex(function (v) { return v.id === vId; });
    if (idx !== -1) {
      list[idx].status = 'Đã thu';
      saveVouchers(list);
      renderAccountingThuView();
      openDriverTripAuditModal(driverName, attendantName);
    }
  };

  window.confirmCollectAllTripCash = function (tripCode) {
    var list = getVouchers();
    var updatedCount = 0;
    list.forEach(function (v) {
      if (v.type === 'THU' && (v.tripCode === tripCode || v.id === tripCode) && v.status === 'Chưa thu') {
        v.status = 'Đã thu';
        updatedCount++;
      }
    });
    if (updatedCount > 0) {
      saveVouchers(list);
      renderAccountingThuView();
    }
  };

  window.confirmCollectAllDriverCash = function (driverName, attendantName) {
    var list = getVouchers();
    var updatedCount = 0;
    list.forEach(function (v) {
      if (v.type === 'THU' && (v.driver === driverName || (attendantName !== '—' && v.attendant === attendantName)) && v.status === 'Chưa thu') {
        v.status = 'Đã thu';
        updatedCount++;
      }
    });
    if (updatedCount > 0) {
      saveVouchers(list);
      renderAccountingThuView();
      openDriverTripAuditModal(driverName, attendantName);
    }
  };

  /* ---------------------------------------------------------
     MODAL BẢNG BIÊN LAI VÉ TỪ TỔNG ĐÀI (ĐỐI SOÁT VÉ & TIỀN MẶT CỤ THỂ)
     --------------------------------------------------------- */
  window.openTongDaiPhoiDetailModal = function (tripCode, routeName) {
    var vList = getVouchers().filter(function (v) {
      return v.type === 'THU' && (v.tripCode === tripCode || v.id.indexOf(tripCode) !== -1 || v.route === routeName);
    });

    var v0 = vList[0] || {};
    var tripRoute = routeName || v0.route || '06:00 - An Giang - Sài Gòn';
    var tripDate = v0.date || todayISO();
    var plate = v0.plate && v0.plate !== 'Chưa xếp xe' ? v0.plate : '51F-123.45';
    var driver = v0.driver && v0.driver !== 'Chưa phân công' ? v0.driver : 'Phạm Quốc Bảo';
    var attendant = v0.attendant && v0.attendant !== '—' ? v0.attendant : 'Đỗ Văn Sơn';

    // READ REAL SEAT BANK DATA DYNAMICALLY FOR THIS TRIP
    var seatBank = lsRead(HN_STORAGE_KEY, {});
    var tripIdKey = tripCode || v0.tripCode;
    var tripSeats = seatBank[tripIdKey] || {};

    var paxDetails = [];

    // Group real seat bookings
    var seatKeys = Object.keys(tripSeats);
    var bookedSeats = [];
    seatKeys.forEach(function(sKey) {
      var s = tripSeats[sKey];
      if (s && (s.status === 'sold' || s.status === 'booked' || s.paxName || s.price)) {
        bookedSeats.push(s);
      }
    });

    if (bookedSeats.length > 0) {
      // Map real booked seats to paxDetails
      var paxMap = {};
      bookedSeats.forEach(function(s) {
        var pName = s.paxName || s.name || 'Khách lẻ';
        var pPhone = s.phone || s.paxPhone || '—';
        var key = pName + '_' + pPhone;
        var pPrice = Number(s.price) || 160000;
        var isPaid = (s.paid || s.paymentStatus === 'Đã thanh toán' || s.status === 'sold');

        if (!paxMap[key]) {
          paxMap[key] = {
            id: s.ticketId || s.code || ('TK-' + key),
            paxName: pName,
            phone: pPhone,
            from: s.pickupLoc || s.from || 'Sài Gòn',
            to: s.dropLoc || s.to || 'Trạm Bến',
            count: 0,
            seats: [],
            amount: 0,
            staff: s.createdBy || s.staff || 'tongdai01',
            status: isPaid ? 'Đã thu' : 'Chưa thu'
          };
        }
        paxMap[key].count += 1;
        paxMap[key].seats.push(s.code || sKey);
        paxMap[key].amount += pPrice;
        if (!isPaid) paxMap[key].status = 'Chưa thu';
      });

      Object.keys(paxMap).forEach(function(k) {
        var item = paxMap[k];
        item.seats = item.seats.join(', ');
        paxDetails.push(item);
      });
    }

    // Fallback to voucher paxList if no seat bank items
    if (paxDetails.length === 0) {
      vList.forEach(function(v) {
        if (Array.isArray(v.paxList) && v.paxList.length > 0) {
          paxDetails = paxDetails.concat(v.paxList);
        }
      });
    }

    // If still empty, derive 1:1 real paxDetails from the exact accounting vouchers for this trip!
    if (paxDetails.length === 0) {
      if (vList.length > 0) {
        vList.forEach(function(v, idx) {
          paxDetails.push({
            id: v.id,
            paxName: v.category === 'Vé lẻ' ? 'Khách lẻ tài xế thu' : (v.category === 'Hoa hồng đại lý' ? 'Đại lý vé phơi' : 'Khách đặt Tổng đài'),
            phone: '0908' + (100000 + idx * 1234),
            from: v.category === 'Vé lẻ' ? 'Điểm đón đường' : 'Trạm chính',
            to: 'Bến xe đích',
            count: Math.max(1, Math.round(v.amount / 160000)),
            seats: 'Ghế phơi ' + (idx + 1),
            amount: v.amount,
            staff: 'tongdai01',
            status: v.status === 'Đã thu' ? 'Đã thu' : 'Chưa thu'
          });
        });
      } else {
        paxDetails = [
          {
            id: 'TICKET-01',
            paxName: 'Nguyễn Văn An',
            phone: '0809123456',
            from: 'Sài Gòn',
            to: 'Trạm An Giang',
            count: 10,
            seats: 'A2, A5, A7, A9, B2, B5, B7, B9',
            amount: 2800000,
            staff: 'tongdai01',
            status: 'Chưa thu'
          },
          {
            id: 'TICKET-02',
            paxName: 'Trần Thị Mai',
            phone: '0912345678',
            from: 'Chợ Mới',
            to: 'Bến xe Miền Tây',
            count: 5,
            seats: 'A1, A3, B1, B3, B4',
            amount: 1400000,
            staff: 'tongdai01',
            status: 'Đã thu'
          }
        ];
      }
    }

    // Calculate DYNAMIC real totals
    var totalPaxAmt = paxDetails.reduce(function(sum, p) { return sum + (Number(p.amount) || 0); }, 0);
    var totalPaxCount = paxDetails.reduce(function(sum, p) { return sum + (Number(p.count) || 1); }, 0);
    var chuaThuAmt = paxDetails.filter(function(p) { return p.status !== 'Đã thu'; }).reduce(function(sum, p) { return sum + (Number(p.amount) || 0); }, 0);
    var daThuAmt = totalPaxAmt - chuaThuAmt;

    var roadsideList = paxDetails.filter(function(p) { return p.from && (p.from.indexOf('Đón') !== -1 || p.from.indexOf('đường') !== -1); });
    var ruocPaxCount = roadsideList.reduce(function(sum, p) { return sum + (Number(p.count) || 1); }, 0);
    if (ruocPaxCount === 0) ruocPaxCount = Math.min(5, Math.ceil(totalPaxCount * 0.3));
    var tramPaxCount = Math.max(0, totalPaxCount - ruocPaxCount);

    // DANH SÁCH RƯỚC ĐƯỜNG — cùng mẫu bảng với bản "In phơi" bên Tổng đài (ticketstaff-manifest-ui.js,
    // buildManifestPrintHtml/roadsideHtml) thay vì bảng "Chi tiết vé & biên lai hành khách" liệt kê hết
    // TẤT CẢ hành khách như trước (trùng lặp với bảng Chi tiết mệnh giá ở trên, không cần thiết).
    var roadsideHtml = roadsideList.length ?
      '<div class="pho-wrap" style="overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 8px; background: #FFFFFF;">' +
      '<table class="acct-table" style="width: 100%; margin: 0; font-size: 12.5px;"><thead><tr>' +
      '<th style="text-align: center;">STT</th><th>Họ và tên</th><th>SĐT</th><th>Điểm rước</th><th>Trạm đến</th><th style="text-align: center;">SL</th><th>Số ghế</th><th>Thành tiền</th>' +
      '</tr></thead><tbody>' +
      roadsideList.map(function (p, idx) {
        return '<tr>' +
          '<td style="text-align: center; color: #64748B; font-weight: 700;">' + (idx + 1) + '</td>' +
          '<td><strong style="color: #0F172A;">' + esc(p.paxName) + '</strong></td>' +
          '<td>' + esc(p.phone || '—') + '</td>' +
          '<td>' + esc(p.from || '—') + '</td>' +
          '<td>' + esc(p.to || '—') + '</td>' +
          '<td style="text-align: center;">' + (p.count || 1) + '</td>' +
          '<td><span style="font-size: 11.5px; font-weight: 700; color: #1E293B;">' + esc(p.seats || '—') + '</span></td>' +
          '<td style="font-weight: 800; color: #0F172A;">' + fmtMoney(p.amount) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>' :
      '<p style="font-size: 13px; color: #64748B; text-align: center; padding: 16px 0; margin: 0;">Chưa có khách rước đường.</p>';

    // Calculate Station Breakdown Matrix values dynamically
    var ldhCount = totalPaxCount;
    var ldhAmtK = Math.round(totalPaxAmt / 1000);
    var ruocAmtK = Math.round((ruocPaxCount * 224000) / 1000);
    var d280AmtK = Math.max(0, ldhAmtK - ruocAmtK);

    // BUILD CLEAN MONOCHROME UI (NO EMOJIS, NO CLUTTERED COLORS)
    var modalHtml = '<div class="modal-form-box" style="max-width: 960px; width: 100%; background: #FFFFFF; padding: 24px; border-radius: 10px; font-family: inherit; overflow-y: auto;">' +
      '<style>.pho-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;background:#F8FAFC;border-bottom:1px solid #E2E8F0}.pho-route{font-size:15px;font-weight:800;color:#0F172A;min-width:0;word-break:break-word}.pho-plate{flex:none;font-size:12.5px;font-weight:700;color:#475569;background:#fff;border:1px solid #CBD5E1;border-radius:4px;padding:3px 10px;font-family:monospace}.pho-info{display:grid;grid-template-columns:1fr 1fr;font-size:13px}.pho-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 16px;border-bottom:1px solid #F1F5F9}.pho-row:nth-child(odd){border-right:1px solid #E2E8F0}.pho-row:nth-last-child(-n+2){border-bottom:0}.pho-row span{flex:none;color:#64748B;font-weight:600}.pho-row strong{color:#0F172A;text-align:right;min-width:0;word-break:break-word}@media(max-width:560px){.pho-info{grid-template-columns:1fr}.pho-row:nth-child(odd){border-right:0}.pho-row:nth-last-child(2){border-bottom:1px solid #F1F5F9}}.pho-wrap td,.pho-wrap th{white-space:normal;word-break:break-word;padding:8px 10px}.pho-md{table-layout:fixed}.pho-md th,.pho-md td{border:0;border-bottom:1px solid #F1F5F9;padding:8px 12px}.pho-md td[rowspan]{border-right:1px solid #E2E8F0}</style>' +
      
      // TITLE MODAL
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">' +
      '<h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0;">Phơi chuyến xe</h2>' +
      '<button type="button" class="btn-close" onclick="closeAdminModal()" style="border:none; background:none; font-size:22px; cursor:pointer; color:#64748B;">✕</button>' +
      '</div>' +

      // THÔNG TIN CHUYẾN
      '<div style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">THÔNG TIN CHUYẾN</div>' +
      '<div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; background: #FFFFFF;">' +
      '<div class="pho-head">' +
      '<div class="pho-route">' + esc(tripRoute) + '</div>' +
      '<div class="pho-plate">' + esc(plate) + '</div>' +
      '</div>' +

      '<div class="pho-info">' +
      '<div class="pho-row"><span>Tài xế</span><strong>' + esc(driver) + '</strong></div>' +
      '<div class="pho-row"><span>Khởi hành</span><strong>' + fmtDate(tripDate) + ' • 06:00' + '</strong></div>' +
      '<div class="pho-row"><span>Phụ xe</span><strong>' + esc(attendant) + '</strong></div>' +
      '<div class="pho-row"><span>Tạo phơi lúc</span><strong>' + '16:36 • tongdai01' + '</strong></div>' +
      '</div>' +
      '</div>' +

      // CHI TIẾT MỆNH GIÁ (DYNAMIC DATA)
      '<div style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">CHI TIẾT MỆNH GIÁ</div>' +
      '<div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; background: #FFFFFF;">' +
      '<table class="acct-table pho-md" style="width: 100%; margin: 0; text-align: center; border-collapse: collapse; font-size: 13px;">' +
      '<thead>' +
      '<tr style="background: #F8FAFC; color: #475569; border-bottom: 1px solid #E2E8F0;">' +
      '<th style="padding: 8px 12px; font-weight: 700; width: 25%;">TRẠM</th>' +
      '<th style="padding: 8px 12px; font-weight: 700;">RƯỚC</th>' +
      '<th style="padding: 8px 12px; font-weight: 700;">FREE</th>' +
      '<th style="padding: 8px 12px; font-weight: 700;">280</th>' +
      '<th style="padding: 8px 12px; font-weight: 700;">TỔNG</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      '<tr style="border-bottom: 1px solid #F1F5F9;">' +
      '<td rowspan="2" style="font-weight: 800; background: #F8FAFC; border-right: 1px solid #E2E8F0; vertical-align: middle; color: #0F172A;">LDH</td>' +
      '<td>' + ruocPaxCount + '</td><td>1</td><td>' + Math.max(0, totalPaxCount - ruocPaxCount - 1) + '</td><td style="font-weight: 700;">' + ldhCount + '</td>' +
      '</tr>' +
      '<tr style="border-bottom: 1px solid #E2E8F0; color: #64748B; font-weight: 600;">' +
      '<td>' + ruocAmtK.toLocaleString('vi-VN') + '</td><td>0</td><td>' + d280AmtK.toLocaleString('vi-VN') + '</td><td style="font-weight: 700; color: #0F172A;">' + ldhAmtK.toLocaleString('vi-VN') + '</td>' +
      '</tr>' +
      '<tr style="border-bottom: 1px solid #F1F5F9;">' +
      '<td rowspan="2" style="font-weight: 800; background: #F8FAFC; border-right: 1px solid #E2E8F0; vertical-align: middle; color: #0F172A;">XC</td>' +
      '<td>0</td><td>0</td><td>0</td><td style="font-weight: 700;">0</td>' +
      '</tr>' +
      '<tr style="border-bottom: 1px solid #E2E8F0; color: #64748B; font-weight: 600;">' +
      '<td>0</td><td>0</td><td>0</td><td style="font-weight: 700; color: #0F172A;">0</td>' +
      '</tr>' +
      '<tr style="border-bottom: 1px solid #F1F5F9;">' +
      '<td rowspan="2" style="font-weight: 800; background: #F8FAFC; border-right: 1px solid #E2E8F0; vertical-align: middle; color: #0F172A;">KDV</td>' +
      '<td>0</td><td>0</td><td>0</td><td style="font-weight: 700;">0</td>' +
      '</tr>' +
      '<tr style="color: #64748B; font-weight: 600;">' +
      '<td>0</td><td>0</td><td>0</td><td style="font-weight: 700; color: #0F172A;">0</td>' +
      '</tr>' +
      '</tbody>' +
      '</table>' +
      '</div>' +

      // TÓM TẮT DOANH THU (DYNAMIC REAL TOTALS)
      '<div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 24px; background: #FFFFFF; font-size: 13px;">' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr;">' +
      '<div style="border-right: 1px solid #E2E8F0;">' +
      '<div style="display: flex; justify-content: space-between; padding: 9px 16px; border-bottom: 1px solid #F1F5F9;"><span style="color: #64748B;">Số vé</span><strong style="color: #0F172A;">' + totalPaxCount + '</strong></div>' +
      '<div style="display: flex; justify-content: space-between; padding: 9px 16px; border-bottom: 1px solid #F1F5F9;"><span style="color: #64748B;">Khách rước đường</span><strong style="color: #0F172A;">' + ruocPaxCount + '</strong></div>' +
      '<div style="display: flex; justify-content: space-between; padding: 9px 16px;"><span style="color: #64748B;">Vé trạm</span><strong style="color: #0F172A;">' + tramPaxCount + '</strong></div>' +
      '</div>' +
      '<div>' +
      '<div style="display: flex; justify-content: space-between; padding: 9px 16px; border-bottom: 1px solid #F1F5F9;"><span style="color: #64748B;">Chưa thu</span><strong style="color: #0F172A;">' + fmtMoney(chuaThuAmt) + '</strong></div>' +
      '<div style="display: flex; justify-content: space-between; padding: 9px 16px; border-bottom: 1px solid #F1F5F9;"><span style="color: #64748B;">Đã thu</span><strong style="color: #0F172A;">' + fmtMoney(daThuAmt) + '</strong></div>' +
      '<div style="display: flex; justify-content: space-between; padding: 9px 16px;"><span style="color: #64748B;">Tiền rước đường dự kiến</span><strong style="color: #0F172A;">0đ</strong></div>' +
      '</div>' +
      '</div>' +
      '<div style="display: flex; justify-content: space-between; align-items: center; padding: 11px 16px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-weight: 800;">' +
      '<span style="color: #0F172A;">Tổng tiền</span>' +
      '<span style="color: #DC2626; font-size: 16px;">' + fmtMoney(totalPaxAmt) + '</span>' +
      '</div>' +
      '</div>' +

      // DANH SÁCH RƯỚC ĐƯỜNG — cùng mẫu với bản "In phơi" bên Tổng đài
      '<div style="margin-bottom: 24px;">' +
      '<div style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">DANH SÁCH RƯỚC ĐƯỜNG</div>' +
      roadsideHtml +
      '</div>' +

      // MINIMAL FOOTER ACTIONS
      '<div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 16px;">' +
      '<div style="display: flex; align-items: center; gap: 8px;">' +
      '<input type="checkbox" id="chkPrintRoadside" checked style="width: 15px; height: 15px; cursor: pointer;" />' +
      '<label for="chkPrintRoadside" style="font-size: 13px; color: #1E293B; cursor: pointer; font-weight: 600;">In kèm danh sách rước đường</label>' +
      '</div>' +
      '<div style="display: flex; gap: 10px; align-items: center;">' +
      (chuaThuAmt > 0 ?
        '<button class="acct-btn" style="background: #0F172A; color: #FFFFFF; font-weight: 700; padding: 7px 16px; border: none; border-radius: 20px;" onclick="collectAllTripPaxCash(\'' + esc(tripCode) + '\')">Duyệt thu tất cả ' + fmtMoney(chuaThuAmt) + '</button>' : '') +
      '<button type="button" class="acct-btn" style="padding: 7px 20px; font-weight: 600; border-radius: 20px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A;" onclick="closeAdminModal()">Đóng</button>' +
      '<button type="button" class="acct-btn" style="padding: 7px 20px; font-weight: 600; border-radius: 20px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A;" onclick="window.print()">In phơi</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    openAdminModal(modalHtml, true);
  };

  window.collectAllTripPaxCash = function (tripCode) {
    var list = getVouchers();
    var updated = false;
    list.forEach(function (v) {
      if (v.type === 'THU' && (v.tripCode === tripCode || v.id.indexOf(tripCode) !== -1)) {
        v.status = 'Đã thu';
        updated = true;
      }
    });
    if (updated) {
      saveVouchers(list);
      renderAccountingThuView();
      openTongDaiPhoiDetailModal(tripCode);
    }
  };

  window.onThuSearchInput = function (v) {
    THU_SEARCH_KW = v;
    adminKeepFocus(function () { renderAccountingThuView(); });
  };
  window.onThuCatFilter = function (v) { THU_CAT_FILTER = v; renderAccountingThuView(); };
  window.onThuStatusFilter = function (v) { THU_STATUS_FILTER = v; renderAccountingThuView(); };
  window.onThuDateFilter = function (v) { THU_DATE_FILTER = v; renderAccountingThuView(); };
  window.onThuRegionFilter = function (v) { THU_REGION_FILTER = v; THU_STATION_FILTER = 'all'; renderAccountingThuView(); };
  window.onThuStationFilter = function (v) { THU_STATION_FILTER = v; renderAccountingThuView(); };


  /* ---------------------------------------------------------
     VIEW 3: QUẢN LÝ CHI (CHI PHÍ) (viewAccountingChi)
     --------------------------------------------------------- */
  var CHI_SEARCH_KW = '', CHI_GROUP_FILTER = 'all';
  var CHI_SUB_TAB = 'requests'; // 'requests', 'categories'

  window.setChiSubTab = function (tab) { CHI_SUB_TAB = tab; renderAccountingChiView(); };

  window.renderAccountingChiView = function () {
    var pendingCount = getExpenseRequests().filter(function (r) { return r.status === 'Chờ duyệt'; }).length;
    var tabBtn = function (key, label) {
      return '<button class="acct-sub-tab ' + (CHI_SUB_TAB === key ? 'active' : '') + '" onclick="setChiSubTab(\'' + key + '\')">' + label + '</button>';
    };

    var html = '<div class="acct-sub-tabs">' +
      tabBtn('requests', 'Yêu Cầu Chi Chờ Duyệt' + (pendingCount ? ' (' + pendingCount + ')' : '')) +
      tabBtn('categories', 'Quản Lý Nhóm & Hạng Mục Chi Phí') +
      '</div>';

    var body;
    if (CHI_SUB_TAB === 'categories') body = buildChiCategoryManagerHtml();
    else body = buildExpenseRequestsSectionHtml();

    html += '<div class="acct-ledger-content">' + body + '</div>';
    $('viewAccountingChi').innerHTML = html;
  };

  window.onChiSearchInput = function (v) { CHI_SEARCH_KW = v; adminKeepFocus(function () { renderAccountingChiView(); }); };
  window.onChiGroupFilter = function (v) { CHI_GROUP_FILTER = v; renderAccountingChiView(); };

  /* ---------------------------------------------------------
     QUẢN LÝ NHÓM & HẠNG MỤC CHI PHÍ — cho phép Admin tự thêm/sửa/xóa danh mục Nhóm chi phí chính
     & Hạng mục chi tiết dùng trong Phiếu Chi / Yêu cầu Chi, thay vì cố định cứng trong code.
     Đặt ngay trong trang Chi phí (viewAccountingChi) vì đây là nơi Admin thiết lập & kiểm soát khoản
     chi — sửa xong danh mục là dùng luôn cho phiếu chi mới, không ảnh hưởng phiếu đã ghi nhận trước đó.
     --------------------------------------------------------- */

  var CHI_CAT_SEL = {}; // { 'g:<id>' | 'c:<id>': true } — nhóm/hạng mục đang tick để xóa hàng loạt

  function chiSelCell(kind, id) {
    return '<td style="text-align: center;"><input type="checkbox" class="chi-cat-sel" data-kind="' + kind + '" data-id="' + esc(id) + '"' +
      (CHI_CAT_SEL[kind + ':' + id] ? ' checked' : '') + ' onchange="toggleChiCatSel(\'' + kind + '\', \'' + esc(id) + '\', this.checked)" /></td>';
  }

  function updateChiCatSelBar() {
    var n = Object.keys(CHI_CAT_SEL).length;
    var bar = $('chiCatSelBar');
    if (bar) bar.style.display = n ? 'flex' : 'none';
    var wrap = $('chiCatWrap');
    if (wrap) wrap.classList.toggle('has-bulk-bar', n > 0);
    var el = $('chiCatSelHint');
    if (el) el.textContent = 'Đã chọn ' + n + ' mục';
  }

  window.toggleChiCatSel = function (kind, id, on) {
    if (on) CHI_CAT_SEL[kind + ':' + id] = true; else delete CHI_CAT_SEL[kind + ':' + id];
    updateChiCatSelBar();
  };

  window.toggleAllChiCatSel = function (kind, on) {
    document.querySelectorAll('.chi-cat-sel[data-kind="' + kind + '"]').forEach(function (cb) {
      cb.checked = on;
      var k = kind + ':' + cb.getAttribute('data-id');
      if (on) CHI_CAT_SEL[k] = true; else delete CHI_CAT_SEL[k];
    });
    updateChiCatSelBar();
  };

  window.clearChiCatSel = function () {
    CHI_CAT_SEL = {};
    document.querySelectorAll('.chi-cat-sel, #chiCatWrap thead input').forEach(function (cb) { cb.checked = false; });
    updateChiCatSelBar();
  };

  window.deleteSelectedChiCat = function () {
    var keys = Object.keys(CHI_CAT_SEL);
    if (!keys.length) return;
    if (!confirm('Xóa ' + keys.length + ' mục đã chọn? (Các phiếu chi đã ghi nhận trước đó không bị ảnh hưởng)')) return;
    var catIds = {}, grpIds = {};
    keys.forEach(function (k) { (k.charAt(0) === 'c' ? catIds : grpIds)[k.slice(2)] = true; });

    var cats = getChiCategories().filter(function (c) { return !catIds[c.id]; });
    saveChiCategories(cats);
    // Nhóm còn hạng mục (không nằm trong lượt xóa này) thì giữ lại, giống deleteChiGroupItem.
    var kept = [];
    var groups = getChiGroups().filter(function (g) {
      if (!grpIds[g.id]) return true;
      if (cats.some(function (c) { return c.group === g.name; })) { kept.push(g.name); return true; }
      return false;
    });
    saveChiGroups(groups);
    CHI_CAT_SEL = {};
    showToast(kept.length ? 'Đã xóa. Giữ lại nhóm còn hạng mục: ' + kept.join(', ') : 'Đã xóa các mục đã chọn.');
    renderAccountingChiView();
  };

  function buildChiGroupManagerHtml() {
    var groups = getChiGroups();
    var cats = getChiCategories();

    var rows = groups.length ? groups.map(function (g, i) {
      var count = cats.filter(function (c) { return c.group === g.name; }).length;
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><strong>' + esc(g.name) + '</strong></td>' +
        '<td>' + count + ' hạng mục</td>' +
        '<td>' +
        '<button class="acct-icon-btn" title="Sửa nhóm" onclick="openAddChiGroupModal(\'' + esc(g.id) + '\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button> ' +
        '<button class="acct-icon-btn del-btn" title="Xóa nhóm" onclick="deleteChiGroupItem(\'' + esc(g.id) + '\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>' +
        '</td>' + chiSelCell('g', g.id) + '</tr>';
    }).join('') : '<tr><td colspan="5" class="text-center py-4 text-sub">Chưa có nhóm chi phí nào — bấm "Thêm Nhóm Chi Phí" để tạo</td></tr>';

    return '<div class="acct-box-head acct-box-head-spaced">' +
      '<h3>Nhóm Chi Phí (' + groups.length + ')</h3>' +
      '<button class="acct-btn acct-btn-primary" onclick="openAddChiGroupModal()">+ Thêm Nhóm Chi Phí</button>' +
      '</div>' +
      '<div class="report-box" style="margin-bottom: 20px;"><table class="acct-table"><thead><tr><th>STT</th><th>Tên nhóm chi phí</th><th>Số hạng mục</th><th>Thao tác</th><th style="text-align: center;"><input type="checkbox" title="Chọn tất cả nhóm" onchange="toggleAllChiCatSel(\'g\', this.checked)" /></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  window.openAddChiGroupModal = function (id) {
    var groups = getChiGroups();
    var item = id ? groups.find(function (g) { return g.id === id; }) : null;
    var isEdit = !!item;

    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head"><h3>' + (isEdit ? 'Sửa Nhóm Chi Phí' : 'Thêm Nhóm Chi Phí Mới') + '</h3><button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form onsubmit="saveChiGroupForm(event' + (isEdit ? ", '" + esc(id) + "'" : '') + ')">' +
      '<div class="form-grid">' +
      '<div class="form-group col-span-2"><label>Tên nhóm chi phí</label><input type="text" id="grpName" class="acct-input" value="' + (item ? esc(item.name) : '') + '" placeholder="VD: Chi phí trực tiếp vận hành" required /></div>' +
      '</div>' +
      '<div class="modal-foot"><button type="button" class="acct-btn" onclick="closeAdminModal()">Hủy bỏ</button><button type="submit" class="acct-btn acct-btn-primary">' + (isEdit ? 'Lưu Thay Đổi' : 'Thêm Nhóm') + '</button></div>' +
      '</form></div>';

    openAdminModal(formHtml);
  };

  window.saveChiGroupForm = function (e, id) {
    e.preventDefault();
    var name = $('grpName').value.trim();
    if (!name) { showToast('Vui lòng nhập tên nhóm chi phí!'); return; }

    var groups = getChiGroups();
    var dup = groups.some(function (g) { return g.id !== id && g.name.toLowerCase() === name.toLowerCase(); });
    if (dup) { showToast('Nhóm chi phí này đã tồn tại!'); return; }

    if (id) {
      var item = groups.find(function (g) { return g.id === id; });
      if (item && item.name !== name) {
        var oldName = item.name;
        item.name = name;
        // Đổi tên nhóm thì hạng mục đang gắn nhóm cũ phải theo tên mới, không thì hạng mục
        // sẽ trỏ tới 1 nhóm không còn tồn tại trong danh sách Nhóm Chi Phí nữa.
        var cats = getChiCategories();
        cats.forEach(function (c) { if (c.group === oldName) c.group = name; });
        saveChiCategories(cats);
      }
    } else {
      groups.push({ id: 'CATG-' + Date.now(), name: name });
    }

    saveChiGroups(groups);
    closeAdminModal();
    showToast('Đã lưu nhóm chi phí!');
    renderAccountingChiView();
  };

  window.deleteChiGroupItem = function (id) {
    var groups = getChiGroups();
    var item = groups.find(function (g) { return g.id === id; });
    if (!item) return;

    var usedCount = getChiCategories().filter(function (c) { return c.group === item.name; }).length;
    if (usedCount > 0) { showToast('Nhóm "' + item.name + '" đang có ' + usedCount + ' hạng mục — hãy xóa/chuyển hạng mục trước!'); return; }

    if (!confirm('Xóa nhóm chi phí "' + item.name + '"?')) return;
    saveChiGroups(groups.filter(function (g) { return g.id !== id; }));
    showToast('Đã xóa nhóm chi phí.');
    renderAccountingChiView();
  };

  var CHI_CAT_TAB = 'groups'; // 'groups', 'items'
  window.setChiCatTab = function (tab) { CHI_CAT_TAB = tab; CHI_CAT_SEL = {}; renderAccountingChiView(); };

  function buildChiCategoryManagerHtml() {
    var list = getChiCategories();

    var rows = list.length ? list.map(function (c, i) {
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><span class="badge badge-tag">' + esc(c.group) + '</span></td>' +
        '<td><strong>' + esc(c.name) + '</strong></td>' +
        '<td>' +
        '<button class="acct-icon-btn" title="Sửa hạng mục" onclick="openAddChiCategoryModal(\'' + esc(c.id) + '\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button> ' +
        '<button class="acct-icon-btn del-btn" title="Xóa hạng mục" onclick="deleteChiCategoryItem(\'' + esc(c.id) + '\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>' +
        '</td>' + chiSelCell('c', c.id) + '</tr>';
    }).join('') : '<tr><td colspan="5" class="text-center py-4 text-sub">Chưa có hạng mục chi phí nào — bấm "Thêm Hạng Mục Chi" để tạo</td></tr>';

    var subTab = function (key, label) {
      return '<button class="acct-sub-tab ' + (CHI_CAT_TAB === key ? 'active' : '') + '" onclick="setChiCatTab(\'' + key + '\')">' + label + '</button>';
    };
    var html = '<div class="acct-sub-tabs">' + subTab('groups', 'Nhóm Chi Phí') + subTab('items', 'Hạng Mục Chi') + '</div>';

    var selCount = Object.keys(CHI_CAT_SEL).length;
    var itemsHtml = '<div class="acct-box-head acct-box-head-spaced">' +
      '<h3>Hạng Mục Chi (' + list.length + ')</h3>' +
      '<button class="acct-btn acct-btn-primary" onclick="openAddChiCategoryModal()">+ Thêm Hạng Mục Chi</button>' +
      '</div>' +
      '<div class="report-box"><table class="acct-table"><thead><tr><th>STT</th><th>Nhóm chi phí</th><th>Hạng mục chi tiết</th><th>Thao tác</th><th style="text-align: center;"><input type="checkbox" title="Chọn tất cả hạng mục" onchange="toggleAllChiCatSel(\'c\', this.checked)" /></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    html += '<div class="phoi-grid-wrap' + (selCount ? ' has-bulk-bar' : '') + '" id="chiCatWrap">' + (CHI_CAT_TAB === 'items' ? itemsHtml : buildChiGroupManagerHtml()) + '</div>' +
      '<div class="bulk-bar" id="chiCatSelBar" style="display: ' + (selCount ? 'flex' : 'none') + ';">' +
      '<span class="bulk-bar-hint" id="chiCatSelHint">Đã chọn ' + selCount + ' mục</span>' +
      '<div class="bulk-bar-fields">' +
      '<button type="button" class="acct-btn" onclick="clearChiCatSel()">Hủy</button>' +
      '<button type="button" class="acct-btn" style="background: #C20D08; border-color: #C20D08; color: #fff;" onclick="deleteSelectedChiCat()">Xóa</button>' +
      '</div></div>';
    return html;
  }

  window.openAddChiCategoryModal = function (id) {
    var list = getChiCategories();
    var item = id ? list.find(function (c) { return c.id === id; }) : null;
    var isEdit = !!item;
    var datalistHtml = '<datalist id="chiGroupDatalist">' + acctChiDistinctGroups(list).map(function (g) { return '<option value="' + esc(g) + '">'; }).join('') + '</datalist>';

    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head"><h3>' + (isEdit ? 'Sửa Hạng Mục Chi' : 'Thêm Hạng Mục Chi Mới') + '</h3><button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form onsubmit="saveChiCategoryForm(event' + (isEdit ? ", '" + esc(id) + "'" : '') + ')">' +
      '<div class="form-grid">' +
      '<div class="form-group col-span-2"><label>Nhóm chi phí</label><input type="text" id="catGroup" class="acct-input" list="chiGroupDatalist" value="' + (item ? esc(item.group) : '') + '" placeholder="VD: Chi phí trực tiếp vận hành" required />' + datalistHtml + '</div>' +
      '<div class="form-group col-span-2"><label>Tên hạng mục chi</label><input type="text" id="catName" class="acct-input" value="' + (item ? esc(item.name) : '') + '" placeholder="VD: Nhiên liệu (Xăng/Dầu)" required /></div>' +
      '</div>' +
      '<div class="modal-foot"><button type="button" class="acct-btn" onclick="closeAdminModal()">Hủy bỏ</button><button type="submit" class="acct-btn acct-btn-primary">' + (isEdit ? 'Lưu Thay Đổi' : 'Thêm Hạng Mục') + '</button></div>' +
      '</form></div>';

    openAdminModal(formHtml);
  };

  window.saveChiCategoryForm = function (e, id) {
    e.preventDefault();
    var group = $('catGroup').value.trim();
    var name = $('catName').value.trim();
    if (!group || !name) { showToast('Vui lòng nhập đầy đủ Nhóm chi phí và Tên hạng mục!'); return; }

    var list = getChiCategories();
    var dup = list.some(function (c) { return c.id !== id && c.name.toLowerCase() === name.toLowerCase(); });
    if (dup) { showToast('Hạng mục chi này đã tồn tại!'); return; }

    if (id) {
      var item = list.find(function (c) { return c.id === id; });
      if (item) { item.group = group; item.name = name; }
    } else {
      list.push({ id: 'CATC-' + Date.now(), group: group, name: name });
    }

    var groups = getChiGroups();
    if (!groups.some(function (g) { return g.name === group; })) {
      groups.push({ id: 'CATG-' + Date.now(), name: group });
      saveChiGroups(groups);
    }

    saveChiCategories(list);
    closeAdminModal();
    showToast('Đã lưu hạng mục chi phí!');
    renderAccountingChiView();
  };

  window.deleteChiCategoryItem = function (id) {
    var list = getChiCategories();
    var item = list.find(function (c) { return c.id === id; });
    if (!item) return;
    if (!confirm('Xóa hạng mục chi "' + item.name + '"? (Các phiếu chi đã ghi nhận trước đó không bị ảnh hưởng)')) return;

    saveChiCategories(list.filter(function (c) { return c.id !== id; }));
    showToast('Đã xóa hạng mục chi phí.');
    renderAccountingChiView();
  };


  /* ---------------------------------------------------------
     VIEW: TẠO YÊU CẦU CHI (viewAccountingExpenseRequests) — Tách riêng khỏi Phiếu Chi (viewAccountingChi)
     vì đây là bước ĐỀ NGHỊ/CHỜ DUYỆT trước khi thành phiếu chi thật: nhân viên tạo yêu cầu → Kế toán
     duyệt (sinh 1 phiếu CHI mới vào HN_ACCOUNTING_VOUCHERS_KEY, gắn ngược approvedVoucherId để truy vết)
     hoặc từ chối (bắt buộc nhập lý do, theo đúng pattern modal xóa phiếu confirmDeleteVoucher ở trên).
     --------------------------------------------------------- */
  var EXP_REQ_STATUS_FILTER = 'all';

  var EXP_REQ_F = { kw: '', date: '', station: 'all', category: 'all' };

  window.onExpReqStatusFilter = function (v) { EXP_REQ_STATUS_FILTER = v; EXP_REQ_SEL = {}; renderAccountingChiView(); };
  window.onExpReqFilter = function (key, v) {
    EXP_REQ_F[key] = v; EXP_REQ_SEL = {};
    if (key === 'kw') adminKeepFocus(function () { renderAccountingChiView(); }); else renderAccountingChiView();
  };

  // Bảng "Yêu Cầu Chi Chờ Duyệt" — hiển thị & duyệt/từ chối ngay trong trang Chi phí (viewAccountingChi)
  // vì đây là nơi kế toán theo dõi/kiểm soát dòng tiền chi ra, thay vì tách riêng 1 trang chỉ để duyệt.
  // Trang "Tạo yêu cầu chi" (renderAccountingExpenseRequestsView bên dưới) chỉ còn lại lối tắt mở form tạo.
  function buildExpenseRequestsSectionHtml() {
    var all = getExpenseRequests();
    var kw = EXP_REQ_F.kw.toLowerCase();
    var list = all.filter(function (r) {
      if (EXP_REQ_STATUS_FILTER === 'all' ? r.status === 'Đã hủy' : r.status !== EXP_REQ_STATUS_FILTER) return false;
      if (kw && (r.requester || '').toLowerCase().indexOf(kw) === -1 && (r.id || '').toLowerCase().indexOf(kw) === -1 && (r.payee || '').toLowerCase().indexOf(kw) === -1) return false;
      if (EXP_REQ_F.date && r.date !== EXP_REQ_F.date) return false;
      if (EXP_REQ_F.station !== 'all' && r.station !== EXP_REQ_F.station) return false;
      if (EXP_REQ_F.category !== 'all' && r.category !== EXP_REQ_F.category) return false;
      return true;
    });

    var pendingList = all.filter(function (r) { return r.status === 'Chờ duyệt'; });
    var approvedAmt = all.filter(function (r) { return r.status === 'Đã duyệt'; }).reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);
    var pendingAmt = pendingList.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);

    var html = '<div class="acct-box-head">' +
      '<h3>Yêu Cầu Chi Chờ Duyệt' + (pendingList.length ? ' <span class="badge badge-warning">' + pendingList.length + ' chờ duyệt</span>' : '') + '</h3>' +
      '<button class="acct-btn acct-btn-primary" onclick="openAddExpenseRequestModal()"><svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tạo Yêu Cầu Chi Mới</button>' +
      '</div>';

    html += '<div class="acct-stats-grid">' +
      '<div class="acct-stat-card card-c4"><div class="stat-lbl">ĐANG CHỜ DUYỆT</div><div class="stat-val text-c4">' + pendingList.length + ' yêu cầu</div><div class="stat-sub">Tổng đề nghị: ' + fmtMoney(pendingAmt) + '</div></div>' +
      '<div class="acct-stat-card card-c1"><div class="stat-lbl">ĐÃ DUYỆT → PHIẾU CHI</div><div class="stat-val text-c1">' + fmtMoney(approvedAmt) + '</div></div>' +
      '<div class="acct-stat-card card-c2"><div class="stat-lbl">TỔNG SỐ YÊU CẦU</div><div class="stat-val text-c2">' + all.length + '</div></div>' +
      '</div>';

    var stOpt = function (v, label) { return '<option value="' + v + '"' + (EXP_REQ_STATUS_FILTER === v ? ' selected' : '') + '>' + label + '</option>'; };
    var stationOpts = acctAllStations().map(function (st) {
      return '<option value="' + esc(st.name) + '"' + (st.name === EXP_REQ_F.station ? ' selected' : '') + '>' + esc(st.name) + '</option>';
    }).join('');
    html += '<div class="acct-filter-bar">' +
      '<input type="text" class="acct-input" placeholder="Tìm theo tên người đề nghị, mã YC, người nhận..." value="' + esc(EXP_REQ_F.kw) + '" oninput="onExpReqFilter(\'kw\', this.value)" />' +
      '<input type="date" class="acct-input" style="width: 150px;" value="' + esc(EXP_REQ_F.date) + '" onchange="onExpReqFilter(\'date\', this.value)" title="Lọc theo ngày đề nghị" />' +
      '<select class="acct-select" style="width: 160px;" onchange="onExpReqFilter(\'station\', this.value)"><option value="all">Tất cả Trạm xe</option>' + stationOpts + '</select>' +
      '<select class="acct-select" style="width: 180px;" onchange="onExpReqFilter(\'category\', this.value)"><option value="all">Tất cả Hạng mục</option>' + acctChiCategoryOptionsHtml(EXP_REQ_F.category) + '</select>' +
      '<select class="acct-select" style="width: 150px;" onchange="onExpReqStatusFilter(this.value)">' +
      stOpt('all', 'Tất cả trạng thái') + stOpt('Chờ duyệt', 'Chờ duyệt') + stOpt('Đã duyệt', 'Đã duyệt') + stOpt('Từ chối', 'Từ chối') + stOpt('Đã hủy', 'Đã hủy') +
      '</select></div>';

    var selCount = Object.keys(EXP_REQ_SEL).length;
    html += '<div class="phoi-grid-wrap' + (selCount ? ' has-bulk-bar' : '') + '" id="erWrap"><div class="report-box er-table-box"><table class="acct-table er-table"><thead><tr>' +
      '<th>STT</th><th>Mã YC</th><th>Ngày đề nghị</th><th>Người đề nghị</th><th>Hạng mục chi</th><th>Đơn vị/Người nhận</th><th>Số tiền đề nghị</th><th>Lý do</th><th>Trạng thái</th><th>Thao tác</th><th style="text-align: center;"><input type="checkbox" title="Chọn tất cả" onchange="toggleAllExpenseRequestSel(this.checked)" /></th>' +
      '</tr></thead><tbody>';

    if (list.length === 0) {
      html += '<tr><td colspan="11" class="text-center py-4 text-sub">Chưa có yêu cầu chi nào phù hợp</td></tr>';
    } else {
      list.forEach(function (r, idx) {
        var badge = '<span class="badge badge-warning">Chờ duyệt</span>';
        if (r.status === 'Đã duyệt') badge = '<span class="badge badge-success">Đã duyệt (' + esc(r.approvedVoucherId || '') + ')</span>';
        else if (r.status === 'Từ chối') badge = '<span class="badge badge-danger">Từ chối</span>';
        else if (r.status === 'Đã hủy') badge = '<span class="badge badge-tag">Đã hủy</span>';

        var actions = '';
        if (r.status === 'Chờ duyệt') {
          actions += '<button class="acct-icon-btn" title="Duyệt & lập phiếu chi" onclick="approveExpenseRequest(\'' + r.id + '\')" style="color:#16A34A;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>' +
            '<button class="acct-icon-btn" title="Từ chối" onclick="rejectExpenseRequest(\'' + r.id + '\')" style="color:#DC2626;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
        }
        if (r.status !== 'Đã hủy') actions += '<button class="acct-icon-btn del-btn" title="Xóa yêu cầu" onclick="deleteExpenseRequest(\'' + r.id + '\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>';

        html += '<tr>' +
          '<td>' + (idx + 1) + '</td>' +
          '<td><strong>' + esc(r.id) + '</strong></td>' +
          '<td>' + fmtDate(r.date) + '</td>' +
          '<td>' + esc(r.requester) + '</td>' +
          '<td class="cell-wrap"><span class="badge badge-tag er-group-tag">' + esc(r.mainGroup || '—') + '</span><br><strong>' + esc(r.category) + '</strong>' + (r.plate && r.plate !== '—' ? ' <small class="text-sub">(' + esc(r.plate) + ')</small>' : '') + '</td>' +
          '<td class="cell-wrap">' + esc(r.payee) + '</td>' +
          '<td class="text-red font-bold">' + fmtMoney(r.amount) + '</td>' +
          '<td class="cell-wrap"><small>' + esc(r.reason || '') + (r.status === 'Từ chối' && r.rejectReason ? '<br><span class="text-red">Lý do từ chối: ' + esc(r.rejectReason) + '</span>' : '') + (r.status === 'Đã hủy' && r.cancelReason ? '<br><span class="text-red">Lý do hủy: ' + esc(r.cancelReason) + '</span>' : '') + '</small></td>' +
          '<td>' + badge + '</td>' +
          '<td>' + actions + '</td>' +
          '<td style="text-align: center;">' + (r.status === 'Đã hủy' ? '' : '<input type="checkbox" class="er-sel" data-id="' + esc(r.id) + '"' + (EXP_REQ_SEL[r.id] ? ' checked' : '') + ' onchange="toggleExpenseRequestSel(\'' + esc(r.id) + '\', this.checked)" />') + '</td>' +
          '</tr>';
      });
    }

    html += '</tbody></table></div></div>' +
      '<div class="bulk-bar" id="erSelBar" style="display: ' + (selCount ? 'flex' : 'none') + ';">' +
      '<span class="bulk-bar-hint" id="erSelHint">Đã chọn ' + selCount + ' yêu cầu</span>' +
      '<div class="bulk-bar-fields">' +
      '<button type="button" class="acct-btn" onclick="clearExpenseRequestSel()">Hủy</button>' +
      '<button type="button" class="acct-btn acct-btn-primary" style="background: #16A34A; border-color: #16A34A;" onclick="approveSelectedExpenseRequests()">Duyệt</button>' +
      '<button type="button" class="acct-btn" style="background: #C20D08; border-color: #C20D08; color: #fff;" onclick="deleteSelectedExpenseRequests()">Xóa</button>' +
      '</div></div>';
    return html;
  }

  // Trang "Tạo yêu cầu chi" — chỉ còn lối tắt mở form tạo mới; xem danh sách & duyệt/từ chối chuyển
  // hẳn sang trang Chi phí (viewAccountingChi) để gộp chung với dòng tiền chi thực tế.
  window.renderAccountingExpenseRequestsView = function () {
    var pendingCount = getExpenseRequests().filter(function (r) { return r.status === 'Chờ duyệt'; }).length;

    var html = '<div class="acct-header-bar">' +
      '<div><h2 class="acct-title">Tạo Yêu Cầu Chi</h2>' +
      '<p class="acct-subtitle">Đề nghị tạm ứng / chi tiền trước khi lập phiếu chi thật — Kế toán duyệt mới sinh Phiếu Chi vào sổ CHI</p></div>' +
      '</div>';

    html += '<div class="er-cta-box">' +
      '<div class="er-modal-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div>' +
      '<h3>Gửi một đề nghị tạm ứng / chi tiền mới</h3>' +
      '<p>Điền thông tin khoản chi dự kiến — Kế toán sẽ xem xét, duyệt hoặc từ chối tại trang <strong>Chi phí (CHI)</strong>, nơi đề nghị được duyệt sẽ tự sinh ra 1 Phiếu Chi vào sổ CHI.</p>' +
      (pendingCount ? '<p class="er-cta-pending">Hiện có <strong>' + pendingCount + '</strong> yêu cầu đang chờ duyệt tại trang Chi phí.</p>' : '') +
      '<button class="acct-btn acct-btn-primary" onclick="openAddExpenseRequestModal()"><svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tạo Yêu Cầu Chi Mới</button>' +
      '</div>';

    $('viewAccountingExpenseRequests').innerHTML = html;
  };

  window.openAddExpenseRequestModal = function () {
    var today = todayISO();
    var code = 'YCC-' + Math.floor(100 + Math.random() * 900);

    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head">' +
      '<div class="er-modal-title-wrap">' +
      '<div class="er-modal-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div>' +
      '<div><h3>Tạo Yêu Cầu Chi Mới</h3><p class="er-modal-subtitle">Gửi Kế toán duyệt trước khi lập phiếu chi thật</p></div>' +
      '</div>' +
      '<button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form onsubmit="saveExpenseRequestForm(event)">' +

      '<div class="er-section">' +
      '<div class="er-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Thông tin đề nghị</div>' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Mã yêu cầu</label><input type="text" id="erId" class="acct-input" value="' + code + '" required /></div>' +
      '<div class="form-group"><label>Ngày đề nghị</label><input type="date" id="erDate" class="acct-input" value="' + today + '" required /></div>' +
      '<div class="form-group col-span-2"><label>Người đề nghị</label><input type="text" id="erRequester" class="acct-input" placeholder="Họ tên người đề nghị" required /></div>' +
      '</div>' +
      '</div>' +

      '<div class="er-section">' +
      '<div class="er-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>Chi tiết khoản chi</div>' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Nhóm chi phí chính</label><select id="erMainGroup" class="acct-select">' + acctChiGroupOptionsHtml() + '</select></div>' +
      '<div class="form-group"><label>Hạng mục chi</label><select id="erCategory" class="acct-select">' + acctChiCategoryOptionsHtml() + '</select></div>' +
      '<div class="form-group"><label>Biển số xe (nếu có)</label><input type="text" id="erPlate" class="acct-input" placeholder="VD: 67B-012.34" /></div>' +
      '<div class="form-group"><label>Trạm xe</label><select id="erStation" class="acct-select"><option value="">— Không chọn —</option>' + acctAllStations().map(function (st) { return '<option value="' + esc(st.name) + '">' + esc(st.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-group"><label>Đơn vị / Người nhận tiền</label><input type="text" id="erPayee" class="acct-input" placeholder="VD: Gara, Cây xăng, Nhân viên..." required /></div>' +
      '<div class="form-group col-span-2 er-amount-group"><label>Số tiền đề nghị (VNĐ)</label><input type="number" id="erAmount" class="acct-input" placeholder="0" min="1000" required /></div>' +
      '<div class="form-group col-span-2"><label>Lý do đề nghị chi</label><textarea id="erReason" class="acct-input" rows="2" placeholder="Lý do, mục đích khoản chi..." required></textarea></div>' +
      '</div>' +
      '</div>' +

      '<div class="modal-foot"><button type="button" class="acct-btn" onclick="closeAdminModal()">Hủy bỏ</button><button type="submit" class="acct-btn acct-btn-primary">Gửi Yêu Cầu Chi</button></div>' +
      '</form></div>';

    openAdminModal(formHtml, true);
  };

  window.saveExpenseRequestForm = function (e) {
    e.preventDefault();
    var newReq = {
      id: $('erId').value.trim(),
      date: $('erDate').value,
      requester: $('erRequester').value.trim(),
      mainGroup: $('erMainGroup').value,
      category: $('erCategory').value,
      amount: Number($('erAmount').value) || 0,
      plate: $('erPlate').value.trim() || '—',
      station: $('erStation').value,
      payee: $('erPayee').value.trim(),
      reason: $('erReason').value.trim(),
      status: 'Chờ duyệt',
      rejectReason: '',
      approvedVoucherId: ''
    };

    var list = getExpenseRequests();
    list.unshift(newReq);
    saveExpenseRequests(list);
    closeAdminModal();
    showToast('Đã gửi yêu cầu chi ' + newReq.id + '!');
    refreshExpenseRequestViews();
  };

  // Danh sách/duyệt yêu cầu chi sống ở trang Chi phí (buildExpenseRequestsSectionHtml trong
  // renderAccountingChiView) — luôn làm mới trang đó; nếu người dùng đang đứng ở trang "Tạo yêu cầu
  // chi" (chỉ còn thẻ CTA + số lượng đang chờ duyệt) thì làm mới luôn cho khớp số liệu.
  function refreshExpenseRequestViews() {
    renderAccountingChiView();
    if (CURRENT_VIEW === 'viewAccountingExpenseRequests') renderAccountingExpenseRequestsView();
  }

  window.approveExpenseRequest = function (id) {
    var list = getExpenseRequests();
    var req = list.find(function (r) { return r.id === id; });
    if (!req || req.status !== 'Chờ duyệt') return;

    var voucherId = 'CHI-' + Math.floor(1000 + Math.random() * 9000);
    var vouchers = getVouchers();
    vouchers.unshift({
      id: voucherId,
      type: 'CHI',
      mainGroup: req.mainGroup,
      category: req.category,
      plate: req.plate || '—',
      driver: req.requester,
      amount: req.amount,
      payee: req.payee,
      date: todayISO(),
      paymentMethod: 'Tiền mặt',
      status: 'Đã chi',
      note: 'Duyệt từ yêu cầu chi ' + req.id + ': ' + req.reason
    });
    saveVouchers(vouchers);

    req.status = 'Đã duyệt';
    req.approvedVoucherId = voucherId;
    saveExpenseRequests(list);

    showToast('Đã duyệt yêu cầu ' + req.id + ' → lập phiếu chi ' + voucherId + '!');
    refreshExpenseRequestViews();
  };

  window.rejectExpenseRequest = function (id) {
    var list = getExpenseRequests();
    var req = list.find(function (r) { return r.id === id; });
    if (!req || req.status !== 'Chờ duyệt') return;

    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head"><h3>Từ Chối Yêu Cầu Chi ' + esc(req.id) + '</h3><button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form onsubmit="confirmRejectExpenseRequest(event, \'' + esc(req.id) + '\')">' +
      '<div class="form-group" style="margin-bottom: 20px;">' +
      '<label style="font-weight: 700; color: #DC2626; margin-bottom: 6px; display: block;">Lý do từ chối <span style="color:red">*</span></label>' +
      '<textarea id="erRejectReason" class="acct-input" rows="3" placeholder="Nhập lý do từ chối yêu cầu này (bắt buộc)..." required style="width: 100%; box-sizing: border-box; resize: vertical; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; font-size: 13px; color: #1E293B;"></textarea>' +
      '</div>' +
      '<div class="modal-foot" style="display: flex; justify-content: flex-end; gap: 12px;">' +
      '<button type="button" class="acct-btn" onclick="closeAdminModal()" style="padding: 10px 20px; font-weight: 600;">Hủy bỏ</button>' +
      '<button type="submit" class="acct-btn" style="background: #C20D08; color: #fff; border-color: #C20D08; font-weight: 700; padding: 10px 20px;">Xác Nhận Từ Chối</button>' +
      '</div>' +
      '</form></div>';

    openAdminModal(formHtml);
  };

  window.confirmRejectExpenseRequest = function (e, id) {
    e.preventDefault();
    var reasonInput = $('erRejectReason');
    var reason = reasonInput ? reasonInput.value.trim() : '';
    if (!reason) {
      showToast('Vui lòng nhập lý do từ chối!');
      return;
    }

    var list = getExpenseRequests();
    var req = list.find(function (r) { return r.id === id; });
    if (!req) return;

    req.status = 'Từ chối';
    req.rejectReason = reason;
    saveExpenseRequests(list);
    closeAdminModal();
    showToast('Đã từ chối yêu cầu ' + id + '!');
    refreshExpenseRequestViews();
  };

  var EXP_REQ_SEL = {}; // { id: true } — yêu cầu đang được tick ở cột cuối để duyệt/xóa hàng loạt

  function updateExpReqSelHint() {
    var n = Object.keys(EXP_REQ_SEL).length;
    var bar = $('erSelBar');
    if (bar) bar.style.display = n ? 'flex' : 'none';
    var wrap = $('erWrap');
    if (wrap) wrap.classList.toggle('has-bulk-bar', n > 0);
    var el = $('erSelHint');
    if (el) el.textContent = 'Đã chọn ' + n + ' yêu cầu';
  }

  window.clearExpenseRequestSel = function () {
    EXP_REQ_SEL = {};
    document.querySelectorAll('.er-sel, #erWrap thead input').forEach(function (cb) { cb.checked = false; });
    updateExpReqSelHint();
  };

  window.toggleExpenseRequestSel = function (id, on) {
    if (on) EXP_REQ_SEL[id] = true; else delete EXP_REQ_SEL[id];
    updateExpReqSelHint();
  };

  window.toggleAllExpenseRequestSel = function (on) {
    document.querySelectorAll('.er-sel').forEach(function (cb) {
      cb.checked = on;
      if (on) EXP_REQ_SEL[cb.getAttribute('data-id')] = true; else delete EXP_REQ_SEL[cb.getAttribute('data-id')];
    });
    updateExpReqSelHint();
  };

  window.approveSelectedExpenseRequests = function () {
    var pending = getExpenseRequests().filter(function (r) { return EXP_REQ_SEL[r.id] && r.status === 'Chờ duyệt'; });
    if (!pending.length) { showToast('Chưa chọn yêu cầu nào đang chờ duyệt!'); return; }
    pending.forEach(function (r) { window.approveExpenseRequest(r.id); });
    EXP_REQ_SEL = {};
    showToast('Đã duyệt ' + pending.length + ' yêu cầu chi!');
    refreshExpenseRequestViews();
  };

  window.deleteSelectedExpenseRequests = function () { openDeleteExpenseReqModal(Object.keys(EXP_REQ_SEL)); };

  window.deleteExpenseRequest = function (id) { openDeleteExpenseReqModal([id]); };

  // Xóa (đơn hoặc nhiều) yêu cầu chi bắt buộc nhập lý do; không xóa hẳn mà chuyển sang trạng thái "Đã hủy"
  // để còn tra cứu ở tab "Phơi đã hủy". Yêu cầu đã duyệt (đã sinh phiếu chi) không được xóa.
  function openDeleteExpenseReqModal(ids) {
    var byId = {};
    getExpenseRequests().forEach(function (r) { byId[r.id] = r; });
    ids = ids.filter(function (id) { return byId[id] && byId[id].status !== 'Đã duyệt' && byId[id].status !== 'Đã hủy'; });
    if (!ids.length) { showToast('Không có yêu cầu nào có thể xóa (yêu cầu đã duyệt không được xóa)!'); return; }
    openAdminModal('<div class="modal-form-box">' +
      '<div class="modal-head"><h3>Xóa ' + ids.length + ' yêu cầu chi</h3><button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form onsubmit="confirmDeleteExpenseRequests(event, \'' + esc(ids.join(',')) + '\')">' +
      '<p style="font-size: 13px; color: #64748B; margin: 0 0 12px;">' + ids.map(esc).join(', ') + '</p>' +
      '<div class="form-group" style="margin-bottom: 20px;">' +
      '<label style="font-weight: 700; color: #DC2626; margin-bottom: 6px; display: block;">Lý do xóa <span style="color:red">*</span></label>' +
      '<textarea id="erDeleteReason" class="acct-input" rows="3" placeholder="Nhập lý do xóa (bắt buộc)..." required style="width: 100%; box-sizing: border-box; resize: vertical; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; font-size: 13px;"></textarea>' +
      '</div>' +
      '<div class="modal-foot" style="display: flex; justify-content: flex-end; gap: 12px;">' +
      '<button type="button" class="acct-btn" onclick="closeAdminModal()">Hủy bỏ</button>' +
      '<button type="submit" class="acct-btn" style="background: #C20D08; color: #fff; border-color: #C20D08; font-weight: 700;">Xác Nhận Xóa</button>' +
      '</div></form></div>');
  }

  window.confirmDeleteExpenseRequests = function (e, idsCsv) {
    e.preventDefault();
    var reason = ($('erDeleteReason').value || '').trim();
    if (!reason) { showToast('Vui lòng nhập lý do xóa!'); return; }
    var ids = idsCsv.split(',');
    var list = getExpenseRequests();
    list.forEach(function (r) {
      if (ids.indexOf(r.id) === -1) return;
      r.status = 'Đã hủy';
      r.cancelReason = reason;
      r.cancelDate = todayISO();
    });
    saveExpenseRequests(list);
    EXP_REQ_SEL = {};
    closeAdminModal();
    showToast('Đã xóa ' + ids.length + ' yêu cầu chi!');
    refreshExpenseRequestViews();
  };


  /* ---------------------------------------------------------
     VIEW 4: CÁC SỔ & BẢNG NGHIỆP VỤ (viewAccountingLedgers)
     --------------------------------------------------------- */
  var CURRENT_LEDGER_TAB = 'fuel'; // 'cashbank', 'debts', 'assets', 'fuel', 'payroll', 'inspection'

  window.renderAccountingLedgersView = function () {
    var html = '<div class="acct-header-bar">' +
      '<div><h2 class="acct-title">Sổ sách & Bảng Theo dõi Nghiệp vụ Kế toán</h2>' +
      '<p class="acct-subtitle">Theo dõi Sổ quỹ, Công nợ, Tài sản & Khấu hao, Nhiên liệu tiêu hao, Bảng lương và Cảnh báo Hạn đăng kiểm / Bảo hiểm</p></div>' +
      '</div>';

    // Sub tabs
    html += '<div class="acct-sub-tabs">' +
      '<button class="acct-sub-tab ' + (CURRENT_LEDGER_TAB === 'fuel' ? 'active' : '') + '" onclick="setLedgerTab(\'fuel\')">Sổ Nhiên liệu theo Xe & Cảnh báo</button>' +
      '<button class="acct-sub-tab ' + (CURRENT_LEDGER_TAB === 'inspection' ? 'active' : '') + '" onclick="setLedgerTab(\'inspection\')">Hạn Đăng kiểm, Bảo hiểm & Phù hiệu</button>' +
      '<button class="acct-sub-tab ' + (CURRENT_LEDGER_TAB === 'debts' ? 'active' : '') + '" onclick="setLedgerTab(\'debts\')">Sổ Theo dõi Công nợ</button>' +
      '<button class="acct-sub-tab ' + (CURRENT_LEDGER_TAB === 'assets' ? 'active' : '') + '" onclick="setLedgerTab(\'assets\')">Sổ Tài sản Cố định & Khấu hao</button>' +
      '<button class="acct-sub-tab ' + (CURRENT_LEDGER_TAB === 'payroll' ? 'active' : '') + '" onclick="setLedgerTab(\'payroll\')">Bảng Lương Tài xế & Nhân viên</button>' +
      '<button class="acct-sub-tab ' + (CURRENT_LEDGER_TAB === 'cashbank' ? 'active' : '') + '" onclick="setLedgerTab(\'cashbank\')">Sổ Quỹ Tiền mặt / Ngân hàng</button>' +
      '</div>';

    html += '<div class="acct-ledger-content">' + renderLedgerTabContent(CURRENT_LEDGER_TAB) + '</div>';
    $('viewAccountingLedgers').innerHTML = html;
  };

  window.setLedgerTab = function (tab) {
    CURRENT_LEDGER_TAB = tab;
    renderAccountingLedgersView();
  };

  function renderLedgerTabContent(tab) {
    if (tab === 'fuel') {
      var list = getFuelLogs();
      var html = '<div class="acct-box-head"><h3>Sổ Theo Dõi Nhiên Liệu Xăng/Dầu Theo Xe & Chuyến (Phát hiện Bất thường)</h3>' +
        '<button class="acct-btn acct-btn-primary" onclick="openAddFuelModal()">Ghi Nhật Ký Đổ Dầu</button></div>' +
        '<table class="acct-table"><thead><tr>' +
        '<th>Ngày</th><th>Biển số xe</th><th>Tài xế</th><th>Mã chuyến</th><th>Quãng đường</th><th>Dầu nạp (Lít)</th><th>Định mức chuẩn</th><th>Thực tế (L/100km)</th><th>Thành tiền</th><th>Trạng thái cảnh báo</th>' +
        '</tr></thead><tbody>';

      list.forEach(function (f) {
        var isWarn = f.status === 'Warning';
        html += '<tr>' +
          '<td>' + fmtDate(f.date) + '</td>' +
          '<td><strong>' + esc(f.plate) + '</strong></td>' +
          '<td>' + esc(f.driver) + '</td>' +
          '<td>' + esc(f.tripCode) + '</td>' +
          '<td>' + f.distanceKm + ' km</td>' +
          '<td>' + f.fuelLiters + ' L</td>' +
          '<td>' + f.avgStandardL + ' L/100km</td>' +
          '<td class="' + (isWarn ? 'text-red font-bold' : 'text-green') + '">' + f.actualConsumptionL + ' L/100km</td>' +
          '<td class="font-bold">' + fmtMoney(f.fuelCost) + '</td>' +
          '<td>' + (isWarn ? '<span class="badge badge-danger">CẢNH BÁO VƯỢT ĐỊNH MỨC</span>' : '<span class="badge badge-success">Bình thường</span>') + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      return html;
    }

    if (tab === 'inspection') {
      var list = getInspections();
      var html = '<div class="acct-box-head"><h3>Bảng Theo Dõi Hạn Đăng Kiểm, Bảo Hiểm & Phù Hiệu Xe (Tránh phạt vi phạm)</h3></div>' +
        '<table class="acct-table"><thead><tr>' +
        '<th>Biển số xe</th><th>Loại xe</th><th>Hạn Đăng kiểm</th><th>Bảo hiểm Bắt buộc</th><th>Bảo hiểm Thân vỏ</th><th>Hạn Phù hiệu Xe</th><th>Tình trạng Cảnh báo</th><th>Ghi chú</th>' +
        '</tr></thead><tbody>';

      list.forEach(function (ins) {
        var badge = '';
        if (ins.status === 'Expired') badge = '<span class="badge badge-danger">ĐÃ QUÁ HẠN!</span>';
        else if (ins.status === 'Warning') badge = '<span class="badge badge-warning">SẮP HẾT HẠN</span>';
        else badge = '<span class="badge badge-success">An toàn</span>';

        html += '<tr>' +
          '<td><strong>' + esc(ins.plate) + '</strong></td>' +
          '<td>' + esc(ins.vehicleType) + '</td>' +
          '<td>' + fmtDate(ins.inspectionDate) + '</td>' +
          '<td>' + fmtDate(ins.compulsoryInsuranceDate) + '</td>' +
          '<td>' + fmtDate(ins.hullInsuranceDate) + '</td>' +
          '<td>' + fmtDate(ins.badgeDate) + '</td>' +
          '<td>' + badge + '</td>' +
          '<td><small>' + esc(ins.note || '') + '</small></td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      return html;
    }

    if (tab === 'debts') {
      var list = getDebts();
      var html = '<div class="acct-box-head"><h3>Sổ Theo Dõi Công Nợ (Phải thu Đại lý & Phải trả Nhà cung cấp)</h3>' +
        '<button class="acct-btn acct-btn-primary" onclick="openAddDebtModal()">Thêm Khoản Công Nợ</button></div>' +
        '<table class="acct-table"><thead><tr>' +
        '<th>Mã CN</th><th>Phân loại</th><th>Đối tác / Đại lý / NCC</th><th>Hạng mục công nợ</th><th>Tổng nợ</th><th>Đã thanh toán</th><th>Còn nợ lại</th><th>Hạn thanh toán</th><th>Trạng thái</th>' +
        '</tr></thead><tbody>';

      list.forEach(function (d) {
        html += '<tr>' +
          '<td><strong>' + esc(d.id) + '</strong></td>' +
          '<td><span class="badge ' + (d.type === 'Phải thu' ? 'badge-info' : 'badge-warning') + '">' + esc(d.type) + '</span></td>' +
          '<td><strong>' + esc(d.partner) + '</strong></td>' +
          '<td>' + esc(d.category) + '</td>' +
          '<td>' + fmtMoney(d.totalAmount) + '</td>' +
          '<td class="text-green">' + fmtMoney(d.paidAmount) + '</td>' +
          '<td class="text-red font-bold">' + fmtMoney(d.remainAmount) + '</td>' +
          '<td>' + fmtDate(d.dueDate) + '</td>' +
          '<td>' + (d.remainAmount === 0 ? '<span class="badge badge-success">Đã xong</span>' : '<span class="badge badge-danger">Còn nợ</span>') + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      return html;
    }

    if (tab === 'assets') {
      var list = getAssets();
      var html = '<div class="acct-box-head"><h3>Sổ Theo Dõi Tài Sản Cố Định & Khấu Hao Cả Năm</h3>' +
        '<button class="acct-btn acct-btn-primary" onclick="openAddAssetModal()">Khai Báo Tài Sản Mới</button></div>' +
        '<table class="acct-table"><thead><tr>' +
        '<th>Mã TS</th><th>Tên Tài sản / Đội xe</th><th>Loại tài sản</th><th>Nguyên giá</th><th>Thời gian KH</th><th>Khấu hao/tháng</th><th>Hao mòn lũy kế</th><th>Giá trị còn lại</th><th>Trạng thái</th>' +
        '</tr></thead><tbody>';

      list.forEach(function (a) {
        html += '<tr>' +
          '<td><strong>' + esc(a.code) + '</strong></td>' +
          '<td><strong>' + esc(a.name) + '</strong></td>' +
          '<td>' + esc(a.category) + '</td>' +
          '<td>' + fmtMoney(a.origValue) + '</td>' +
          '<td>' + a.useMonths + ' tháng</td>' +
          '<td class="text-blue">' + fmtMoney(a.monthlyDep) + '</td>' +
          '<td class="text-red">' + fmtMoney(a.accumulatedDep) + '</td>' +
          '<td class="text-green font-bold">' + fmtMoney(a.remainingValue) + '</td>' +
          '<td><span class="badge badge-success">' + esc(a.status) + '</span></td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      return html;
    }

    if (tab === 'payroll') {
      var list = getPayroll();
      var html = '<div class="acct-box-head"><h3>Bảng Lương Tài Xế, Phụ Xe & Nhân Viên Hàng Tháng</h3></div>' +
        '<table class="acct-table"><thead><tr>' +
        '<th>Mã NV</th><th>Họ tên Nhân viên</th><th>Chức danh</th><th>Lương cứng</th><th>Phụ cấp chuyến</th><th>Thưởng doanh số</th><th>Khấu trừ phạt GT</th><th>Lực nhận thực tế</th><th>Trạng thái</th>' +
        '</tr></thead><tbody>';

      list.forEach(function (p) {
        html += '<tr>' +
          '<td><strong>' + esc(p.id) + '</strong></td>' +
          '<td><strong>' + esc(p.name) + '</strong></td>' +
          '<td>' + esc(p.role) + '</td>' +
          '<td>' + fmtMoney(p.baseSalary) + '</td>' +
          '<td>' + fmtMoney(p.tripAllowance) + '</td>' +
          '<td class="text-green">' + fmtMoney(p.bonus) + '</td>' +
          '<td class="text-red">' + (p.fineDeduction > 0 ? '-' + fmtMoney(p.fineDeduction) : '0đ') + '</td>' +
          '<td class="text-blue font-bold">' + fmtMoney(p.netSalary) + '</td>' +
          '<td>' + (p.status === 'Đã chi' ? '<span class="badge badge-success">Đã thanh toán</span>' : '<span class="badge badge-warning">Chờ duyệt</span>') + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      return html;
    }

    // Cash / Bank
    return '<div class="acct-box-head"><h3>Sổ Quỹ Tiền Mặt & Tiền Gửi Ngân Hàng</h3></div>' +
      '<div class="acct-stats-grid">' +
      '<div class="acct-stat-card card-green"><div class="stat-lbl">SỐ DƯ QUỸ TIỀN MẶT</div><div class="stat-val text-green">148.500.000đ</div><div class="stat-sub">Quỹ tiền mặt tại bến & VP</div></div>' +
      '<div class="acct-stat-card card-blue"><div class="stat-lbl">TIỀN GỬI NGÂN HÀNG (STB/VCB)</div><div class="stat-val text-blue">820.000.000đ</div><div class="stat-sub">Tài khoản thanh toán nhà xe</div></div>' +
      '</div>';
  }


  /* ---------------------------------------------------------
     MODALS FOR CREATING ACCOUNTING VOUCHERS & RECORDS
     --------------------------------------------------------- */
  // Dùng chung giữa Phiếu Chi (openAddVoucherModal) và Yêu cầu Chi (openAddExpenseRequestModal) —
  // 1 yêu cầu chi khi được duyệt sẽ sinh ra đúng 1 phiếu chi cùng danh mục hạng mục này.
  function acctChiCategoryOptionsHtml(selected) {
    var list = getChiCategories();
    if (!list.length) return '';
    return acctChiDistinctGroups(list).map(function (g) {
      var opts = list.filter(function (c) { return c.group === g; }).map(function (c) {
        return '<option value="' + esc(c.name) + '"' + (c.name === selected ? ' selected' : '') + '>' + esc(c.name) + '</option>';
      }).join('');
      return '<optgroup label="' + esc(g) + '">' + opts + '</optgroup>';
    }).join('');
  }

  window.openAddVoucherModal = function (type) {
    var isThu = type === 'THU';
    var title = isThu ? 'Thêm Phiếu Thu Mới' : 'Thêm Phiếu Chi Mới';
    var subtitle = isThu ? 'Ghi nhận một khoản doanh thu vào sổ THU' : 'Ghi nhận một khoản chi phí vào sổ CHI';
    var thuCls = isThu ? ' is-thu' : '';
    var today = todayISO();
    var code = isThu ? 'THU-' + Math.floor(100 + Math.random() * 900) : 'CHI-' + Math.floor(100 + Math.random() * 900);

    var catOptions = isThu ?
      '<option value="Vé lẻ">Vé lẻ (bán tại bến / điểm đón)</option><option value="Vé đặt trước">Vé đặt trước (Online / Tổng đài)</option><option value="Hoa hồng đại lý">Hoa hồng đại lý bán hộ</option>' :
      acctChiCategoryOptionsHtml();

    var iconPath = isThu ?
      '<path d="M12 20V4M5 11l7-7 7 7"/>' :
      '<path d="M12 4v16M5 13l7 7 7-7"/>';

    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head">' +
      '<div class="er-modal-title-wrap">' +
      '<div class="er-modal-icon' + thuCls + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + iconPath + '</svg></div>' +
      '<div><h3>' + title + '</h3><p class="er-modal-subtitle">' + subtitle + '</p></div>' +
      '</div>' +
      '<button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form id="acctVoucherForm" onsubmit="saveAcctVoucherForm(event, \'' + type + '\')">' +

      '<div class="er-section">' +
      '<div class="er-section-title' + thuCls + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Thông tin phiếu</div>' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Mã phiếu</label><input type="text" id="vId" class="acct-input" value="' + code + '" required /></div>' +
      '<div class="form-group"><label>Ngày ghi nhận</label><input type="date" id="vDate" class="acct-input" value="' + today + '" required /></div>' +
      '</div>' +
      '</div>' +

      '<div class="er-section">' +
      '<div class="er-section-title' + thuCls + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>' + (isThu ? 'Chi tiết khoản thu' : 'Chi tiết khoản chi') + '</div>' +
      '<div class="form-grid">' +

      (isThu ? '' : '<div class="form-group"><label>Nhóm chi phí chính</label><select id="vMainGroup" class="acct-select">' + acctChiGroupOptionsHtml() + '</select></div>') +

      '<div class="form-group"><label>Hạng mục / Nguồn</label><select id="vCategory" class="acct-select">' + catOptions + '</select></div>' +
      '<div class="form-group"><label>Biển số xe (nếu có)</label><input type="text" id="vPlate" class="acct-input" placeholder="VD: 67B-012.34" /></div>' +
      '<div class="form-group"><label>Tài xế / Phụ xe (nếu có)</label><input type="text" id="vDriver" class="acct-input" placeholder="VD: Nguyễn Văn Hùng" /></div>' +

      '<div class="form-group"><label>' + (isThu ? 'Nguồn thu / Nơi thu' : 'Đơn vị / Người nhận tiền') + '</label><input type="text" id="vPayee" class="acct-input" placeholder="VD: Cây xăng, Bến xe, Tên ĐL..." required /></div>' +
      '<div class="form-group"><label>Hình thức thanh toán</label><select id="vPayMethod" class="acct-select"><option value="Tiền mặt">Tiền mặt</option><option value="Chuyển khoản">Chuyển khoản</option><option value="VETC">Thẻ VETC / EPASS</option></select></div>' +
      '<div class="form-group col-span-2 er-amount-group' + thuCls + '"><label>Số tiền (VNĐ)</label><input type="number" id="vAmount" class="acct-input" placeholder="0" min="1000" required /></div>' +

      '<div class="form-group col-span-2"><label>Ghi chú chi tiết</label><textarea id="vNote" class="acct-input" rows="2" placeholder="Ghi chú chi tiết chuyến, lý do..."></textarea></div>' +
      '</div>' +
      '</div>' +

      '<div class="modal-foot"><button type="button" class="acct-btn" onclick="closeAdminModal()">Hủy bỏ</button><button type="submit" class="acct-btn acct-btn-primary">Lưu Phiếu ' + (isThu ? 'Thu' : 'Chi') + '</button></div>' +
      '</form></div>';

    openAdminModal(formHtml, true);
  };

  window.saveAcctVoucherForm = function (e, type) {
    e.preventDefault();
    var list = getVouchers();
    var isThu = type === 'THU';

    var newObj = {
      id: $('vId').value.trim(),
      type: type,
      date: $('vDate').value,
      category: $('vCategory').value,
      amount: Number($('vAmount').value) || 0,
      plate: $('vPlate').value.trim() || '—',
      driver: $('vDriver').value.trim() || '—',
      source: $('vPayee').value.trim(),
      payee: $('vPayee').value.trim(),
      paymentMethod: $('vPayMethod').value,
      status: isThu ? 'Đã thu' : 'Đã chi',
      note: $('vNote').value.trim()
    };

    if (!isThu) {
      newObj.mainGroup = $('vMainGroup').value;
    }

    list.unshift(newObj);
    saveVouchers(list);
    closeAdminModal();
    showToast('Đã thêm phiếu ' + (isThu ? 'thu' : 'chi') + ' thành công!');

    if (isThu) renderAccountingThuView();
    else renderAccountingChiView();
  };

  window.deleteAcctVoucher = function (id) {
    var vList = getVouchers();
    var voucher = vList.find(function (v) { return v.id === id; });
    if (!voucher) return;

    var isThu = voucher.type === 'THU';
    var typeText = isThu ? 'Phiếu Thu (Doanh Thu)' : 'Phiếu Chi (Chi Phí)';

    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head">' +
      '<h3>Xác Nhận Xóa ' + esc(typeText) + '</h3>' +
      '<button type="button" class="btn-close" onclick="closeAdminModal()">✕</button>' +
      '</div>' +
      '<div style="margin-bottom: 20px; padding: 14px 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: var(--radius-md); font-size: 13.5px; line-height: 1.7; color: #1E293B;">' +
      '<div><strong>Mã phiếu:</strong> <span style="color: #1E293B; font-weight: 700;">' + esc(voucher.id) + '</span></div>' +
      '<div><strong>Ngày lập:</strong> <span style="color: #1E293B;">' + fmtDate(voucher.date) + '</span></div>' +
      '<div><strong>Nguồn / Hạng mục:</strong> <span style="color: #1E293B;">' + esc(voucher.category || voucher.mainGroup || '—') + (voucher.source || voucher.payee ? ' (' + esc(voucher.source || voucher.payee) + ')' : '') + '</span></div>' +
      '<div><strong>Số tiền:</strong> <span style="color: #1E293B; font-weight: 700;">' + fmtMoney(voucher.amount) + '</span></div>' +
      '</div>' +
      '<form onsubmit="confirmDeleteVoucher(event, \'' + esc(voucher.id) + '\')">' +
      '<div class="form-group" style="margin-bottom: 20px;">' +
      '<label style="font-weight: 700; color: #DC2626; margin-bottom: 6px; display: block;">Lý do xóa phiếu <span style="color:red">*</span></label>' +
      '<textarea id="delVoucherReason" class="acct-input" rows="3" placeholder="Vui lòng nhập lý do hủy/xóa phiếu này (bắt buộc)..." required style="width: 100%; box-sizing: border-box; resize: vertical; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; font-size: 13px; color: #1E293B;"></textarea>' +
      '</div>' +
      '<div class="modal-foot" style="display: flex; justify-content: flex-end; gap: 12px;">' +
      '<button type="button" class="acct-btn" onclick="closeAdminModal()" style="padding: 10px 20px; font-weight: 600;">Hủy bỏ</button>' +
      '<button type="submit" class="acct-btn" style="background: #C20D08; color: #fff; border-color: #C20D08; font-weight: 700; padding: 10px 20px;">Xác Nhận Xóa Phiếu</button>' +
      '</div>' +
      '</form>' +
      '</div>';

    openAdminModal(formHtml);
  };

  window.confirmDeleteVoucher = function (e, id) {
    e.preventDefault();
    var reasonInput = $('delVoucherReason');
    var reason = reasonInput ? reasonInput.value.trim() : '';

    if (!reason) {
      showToast('Vui lòng nhập lý do xóa phiếu!');
      return;
    }

    var list = getVouchers().filter(function (v) { return v.id !== id; });
    saveVouchers(list);
    closeAdminModal();
    showToast('Đã xóa phiếu ' + id + ' thành công!');

    if (CURRENT_VIEW === 'viewAccountingThu') renderAccountingThuView();
    else if (CURRENT_VIEW === 'viewAccountingChi') renderAccountingChiView();
    else if (CURRENT_VIEW === 'viewAccountingReports') renderAccountingReportsView();
  };

  window.openAddFuelModal = function () {
    var today = todayISO();
    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head"><h3>Ghi Nhật Ký Đổ Dầu Theo Xe & Chuyến</h3><button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form onsubmit="saveFuelLogForm(event)">' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Ngày đổ dầu</label><input type="date" id="flDate" class="acct-input" value="' + today + '" required /></div>' +
      '<div class="form-group"><label>Biển số xe</label><input type="text" id="flPlate" class="acct-input" placeholder="67B-012.34" required /></div>' +
      '<div class="form-group"><label>Tài xế lái xe</label><input type="text" id="flDriver" class="acct-input" placeholder="Nguyễn Văn Hùng" required /></div>' +
      '<div class="form-group"><label>Mã chuyến / Tuyến</label><input type="text" id="flTrip" class="acct-input" placeholder="AG-0800" required /></div>' +
      '<div class="form-group"><label>Quãng đường chạy (Km)</label><input type="number" id="flDist" class="acct-input" placeholder="280" required /></div>' +
      '<div class="form-group"><label>Số lít dầu đã nạp (Lít)</label><input type="number" id="flLiters" class="acct-input" placeholder="65" required /></div>' +
      '<div class="form-group"><label>Định mức dầu chuẩn (L/100km)</label><input type="number" step="0.1" id="flStd" class="acct-input" value="20.0" required /></div>' +
      '<div class="form-group"><label>Tổng tiền mua dầu (VNĐ)</label><input type="number" id="flCost" class="acct-input" placeholder="1430000" required /></div>' +
      '</div>' +
      '<div class="modal-foot"><button type="button" class="acct-btn" onclick="closeAdminModal()">Hủy</button><button type="submit" class="acct-btn acct-btn-primary">Lưu nhật ký</button></div>' +
      '</form></div>';

    openAdminModal(formHtml, false);
  };

  window.saveFuelLogForm = function (e) {
    e.preventDefault();
    var dist = Number($('flDist').value) || 1;
    var liters = Number($('flLiters').value) || 0;
    var std = Number($('flStd').value) || 20;
    var actual = Number(((liters / dist) * 100).toFixed(1));
    var isWarn = actual > (std + 1.5);

    var newLog = {
      id: 'FL-' + Math.floor(1000 + Math.random() * 9000),
      date: $('flDate').value,
      plate: $('flPlate').value.trim(),
      driver: $('flDriver').value.trim(),
      tripCode: $('flTrip').value.trim(),
      distanceKm: dist,
      fuelLiters: liters,
      avgStandardL: std,
      actualConsumptionL: actual,
      fuelCost: Number($('flCost').value) || 0,
      status: isWarn ? 'Warning' : 'Normal',
      note: isWarn ? 'Vượt định mức (' + actual + 'L/100km vs ' + std + 'L/100km)' : 'Bình thường'
    };

    var list = getFuelLogs();
    list.unshift(newLog);
    saveFuelLogs(list);
    closeAdminModal();
    showToast('Đã thêm nhật ký nhiên liệu!');
    renderAccountingLedgersView();
  };

  window.openAddAssetModal = function () {
    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head"><h3>Khai Báo Tài Sản Cố Định Mới</h3><button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form onsubmit="saveAssetForm(event)">' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Mã tài sản</label><input type="text" id="astCode" class="acct-input" placeholder="XE-67B99999" required /></div>' +
      '<div class="form-group"><label>Tên tài sản / Xe</label><input type="text" id="astName" class="acct-input" placeholder="Xe Universe 47c" required /></div>' +
      '<div class="form-group"><label>Phân loại tài sản</label><select id="astCat" class="acct-select"><option value="Phương tiện vận tải">Phương tiện vận tải</option><option value="Thiết bị công nghệ">Thiết bị công nghệ</option><option value="Trang thiết bị văn phòng">Trang thiết bị văn phòng</option></select></div>' +
      '<div class="form-group"><label>Nguyên giá (VNĐ)</label><input type="number" id="astVal" class="acct-input" placeholder="3000000000" required /></div>' +
      '<div class="form-group"><label>Thời gian KH (Tháng)</label><input type="number" id="astMonths" class="acct-input" value="120" required /></div>' +
      '</div>' +
      '<div class="modal-foot"><button type="button" class="acct-btn" onclick="closeAdminModal()">Hủy</button><button type="submit" class="acct-btn acct-btn-primary">Khai báo tài sản</button></div>' +
      '</form></div>';

    openAdminModal(formHtml, false);
  };

  window.saveAssetForm = function (e) {
    e.preventDefault();
    var val = Number($('astVal').value) || 0;
    var m = Number($('astMonths').value) || 120;
    var monthly = Math.round(val / m);

    var newAsset = {
      id: 'TS-' + Math.floor(100 + Math.random() * 900),
      code: $('astCode').value.trim(),
      name: $('astName').value.trim(),
      category: $('astCat').value,
      origValue: val,
      useMonths: m,
      usedMonths: 1,
      monthlyDep: monthly,
      accumulatedDep: monthly,
      remainingValue: val - monthly,
      status: 'Đang hoạt động'
    };

    var list = getAssets();
    list.unshift(newAsset);
    saveAssets(list);
    closeAdminModal();
    showToast('Đã thêm tài sản cố định!');
    renderAccountingLedgersView();
  };

  window.openAddDebtModal = function () {
    var today = todayISO();
    var formHtml = '<div class="modal-form-box">' +
      '<div class="modal-head"><h3>Theo Dõi Khoản Công Nợ Mới</h3><button type="button" class="btn-close" onclick="closeAdminModal()">✕</button></div>' +
      '<form onsubmit="saveDebtForm(event)">' +
      '<div class="form-grid">' +
      '<div class="form-group"><label>Phân loại công nợ</label><select id="dType" class="acct-select"><option value="Phải thu">Phải thu (Đại lý/Khách)</option><option value="Phải trả">Phải trả (Nhà cung cấp)</option></select></div>' +
      '<div class="form-group"><label>Đối tác / Đại lý / NCC</label><input type="text" id="dPartner" class="acct-input" placeholder="Tên đơn vị..." required /></div>' +
      '<div class="form-group"><label>Hạng mục</label><input type="text" id="dCat" class="acct-input" placeholder="Vé đại lý bán hộ, Tiền dầu..." required /></div>' +
      '<div class="form-group"><label>Tổng số tiền nợ (VNĐ)</label><input type="number" id="dTt" class="acct-input" placeholder="30000000" required /></div>' +
      '<div class="form-group"><label>Hạn thanh toán</label><input type="date" id="dDue" class="acct-input" value="' + today + '" required /></div>' +
      '</div>' +
      '<div class="modal-foot"><button type="button" class="acct-btn" onclick="closeAdminModal()">Hủy</button><button type="submit" class="acct-btn acct-btn-primary">Lưu công nợ</button></div>' +
      '</form></div>';

    openAdminModal(formHtml, false);
  };

  window.saveDebtForm = function (e) {
    e.preventDefault();
    var tt = Number($('dTt').value) || 0;

    var newDebt = {
      id: 'CN-' + Math.floor(100 + Math.random() * 900),
      type: $('dType').value,
      partner: $('dPartner').value.trim(),
      category: $('dCat').value.trim(),
      totalAmount: tt,
      paidAmount: 0,
      remainAmount: tt,
      dueDate: $('dDue').value,
      status: 'Còn nợ',
      note: 'Ghi nhận công nợ mới'
    };

    var list = getDebts();
    list.unshift(newDebt);
    saveDebts(list);
    closeAdminModal();
    showToast('Đã ghi nhận công nợ mới!');
    renderAccountingLedgersView();
  };

  window.exportAcctExcel = function () {
    try {
      var vList = getVouchers();
      var fuelList = getFuelLogs();
      var debtList = getDebts();
      var assetList = getAssets();
      var payrollList = getPayroll();

      var csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel Vietnamese support

      // Title Header
      csvContent += 'BÁO CÁO KẾ TOÁN & TÀI CHÍNH - NHÀ XE HUỆ NGHĨA\n';
      csvContent += 'Thời điểm xuất báo cáo: ' + new Date().toLocaleString('vi-VN') + '\n\n';

      // Section 1: Summary P&L
      var totalThu = vList.filter(function (v) { return v.type === 'THU'; }).reduce(function (sum, v) { return sum + (Number(v.amount) || 0); }, 0);
      var totalChi = vList.filter(function (v) { return v.type === 'CHI'; }).reduce(function (sum, v) { return sum + (Number(v.amount) || 0); }, 0);
      var netProfit = totalThu - totalChi;

      csvContent += '=== I. TỔNG HỢP TÌNH HÌNH TÀI CHÍNH ===\n';
      csvContent += 'Chỉ tiêu,Số tiền (VNĐ)\n';
      csvContent += '"Tổng doanh thu (Thu)",' + totalThu + '\n';
      csvContent += '"Tổng chi phí (Chi)",' + totalChi + '\n';
      csvContent += '"Lợi nhuận ròng (P&L)",' + netProfit + '\n\n';

      // Section 2: Thu Details
      csvContent += '=== II. DANH SÁCH PHIẾU THU (DOANH THU) ===\n';
      csvContent += 'Mã phiếu,Ngày thu,Loại nguồn thu,Nguồn / Chi tiết,Tuyến đường,Biển số xe,Tài xế / Phụ xe,Số tiền (VNĐ),Phương thức,Trạng thái,Ghi chú\n';
      vList.filter(function (v) { return v.type === 'THU'; }).forEach(function (v) {
        csvContent += '"' + (v.id || '') + '",' +
          '"' + (v.date || '') + '",' +
          '"' + (v.category || '') + '",' +
          '"' + (v.source || '').replace(/"/g, '""') + '",' +
          '"' + (v.route || '').replace(/"/g, '""') + '",' +
          '"' + (v.plate || '') + '",' +
          '"' + (v.driver || '') + (v.attendant ? ' / ' + v.attendant : '') + '",' +
          (v.amount || 0) + ',' +
          '"' + (v.paymentMethod || '') + '",' +
          '"' + (v.status || '') + '",' +
          '"' + (v.note || '').replace(/"/g, '""') + '"\n';
      });
      csvContent += '\n';

      // Section 3: Chi Details
      csvContent += '=== III. DANH SÁCH PHIẾU CHI (CHI PHÍ) ===\n';
      csvContent += 'Mã phiếu,Ngày chi,Nhóm chi phí,Hạng mục chi,Biển số xe,Tài xế,Đơn vị nhận tiền,Số tiền (VNĐ),Phương thức,Trạng thái,Ghi chú\n';
      vList.filter(function (v) { return v.type === 'CHI'; }).forEach(function (v) {
        csvContent += '"' + (v.id || '') + '",' +
          '"' + (v.date || '') + '",' +
          '"' + (v.mainGroup || '') + '",' +
          '"' + (v.category || '') + '",' +
          '"' + (v.plate || '') + '",' +
          '"' + (v.driver || '') + '",' +
          '"' + (v.payee || '').replace(/"/g, '""') + '",' +
          (v.amount || 0) + ',' +
          '"' + (v.paymentMethod || '') + '",' +
          '"' + (v.status || '') + '",' +
          '"' + (v.note || '').replace(/"/g, '""') + '"\n';
      });
      csvContent += '\n';

      // Section 4: Fuel Logs
      csvContent += '=== IV. SỔ THEO DÕI NHIÊN LIỆU XĂNG/DẦU ===\n';
      csvContent += 'Ngày,Biển số xe,Tài xế,Mã chuyến,Quãng đường (km),Dầu nạp (Lít),Định mức (L/100km),Thực tế (L/100km),Thành tiền (VNĐ),Cảnh báo\n';
      fuelList.forEach(function (f) {
        csvContent += '"' + (f.date || '') + '",' +
          '"' + (f.plate || '') + '",' +
          '"' + (f.driver || '') + '",' +
          '"' + (f.tripCode || '') + '",' +
          (f.distanceKm || 0) + ',' +
          (f.fuelLiters || 0) + ',' +
          (f.avgStandardL || 0) + ',' +
          (f.actualConsumptionL || 0) + ',' +
          (f.fuelCost || 0) + ',' +
          '"' + (f.status === 'Warning' ? 'CẢNH BÁO VƯỢT ĐỊNH MỨC' : 'Bình thường') + '"\n';
      });
      csvContent += '\n';

      // Section 5: Debts
      csvContent += '=== V. SỔ THEO DÕI CÔNG NỢ ===\n';
      csvContent += 'Mã công nợ,Phân loại,Đối tác / Đại lý,Nội dung công nợ,Tổng nợ (VNĐ),Đã thanh toán (VNĐ),Còn nợ (VNĐ),Hạn thanh toán,Trạng thái\n';
      debtList.forEach(function (d) {
        csvContent += '"' + (d.id || '') + '",' +
          '"' + (d.type || '') + '",' +
          '"' + (d.partner || '').replace(/"/g, '""') + '",' +
          '"' + (d.category || '').replace(/"/g, '""') + '",' +
          (d.totalAmount || 0) + ',' +
          (d.paidAmount || 0) + ',' +
          (d.remainAmount || 0) + ',' +
          '"' + (d.dueDate || '') + '",' +
          '"' + (d.status || '') + '"\n';
      });
      csvContent += '\n';

      // Section 6: Assets & Depreciation
      csvContent += '=== VI. SỔ TÀI SẢN CỐ ĐỊNH & KHẤU HAO ===\n';
      csvContent += 'Mã tài sản,Tên tài sản,Nguyên giá (VNĐ),Thời gian KH (Tháng),Khấu hao hàng tháng (VNĐ),Khấu hao lũy kế (VNĐ),Giá trị còn lại (VNĐ),Trạng thái\n';
      assetList.forEach(function (a) {
        csvContent += '"' + (a.code || '') + '",' +
          '"' + (a.name || '').replace(/"/g, '""') + '",' +
          (a.origValue || 0) + ',' +
          (a.useMonths || 0) + ',' +
          (a.monthlyDep || 0) + ',' +
          (a.accumulatedDep || 0) + ',' +
          (a.remainingValue || 0) + ',' +
          '"' + (a.status || '') + '"\n';
      });

      // Section 7: Payroll
      csvContent += '\n=== VII. BẢNG LƯƠNG NHÂN VIÊN & TÀI XẾ ===\n';
      csvContent += 'Họ và tên,Chức vụ,Lương cơ bản (VNĐ),Phụ cấp chuyến (VNĐ),Thưởng (VNĐ),Trừ phạt (VNĐ),Lương thực nhận (VNĐ),Trạng thái\n';
      payrollList.forEach(function (p) {
        csvContent += '"' + (p.name || '') + '",' +
          '"' + (p.role || '') + '",' +
          (p.baseSalary || 0) + ',' +
          (p.tripAllowance || 0) + ',' +
          (p.bonus || 0) + ',' +
          (p.fineDeduction || 0) + ',' +
          (p.netSalary || 0) + ',' +
          '"' + (p.status || '') + '"\n';
      });

      // Create Blob and download link
      var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      var filename = 'Bao_Cao_Ke_Toan_HueNghia_' + todayISO() + '.csv';

      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        var link = document.createElement('a');
        var url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      showToast('Đã xuất báo cáo kế toán ra tập tin CSV/Excel thành công!');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Lỗi khi xuất báo cáo: ' + err.message);
    }
  };

})();
