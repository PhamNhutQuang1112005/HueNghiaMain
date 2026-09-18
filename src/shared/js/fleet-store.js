/* =========================================================
   FLEET-STORE.JS — Store cấu hình đội xe dùng chung
   Nhà Xe Huệ Nghĩa
   =========================================================

   NGUỒN DỮ LIỆU DUY NHẤT cho: Hướng, Tuyến, Loại xe, Xe, Nhân viên.
   Trước đây các dữ liệu này được khai báo cứng rải rác:
     - TRIP_DIRECTIONS_CFG / ROUTES_CFG  → js/ticketstaff.js
     - <select> biển số / loại xe / tài xế / phụ xe → ticketstaff.html, shuttle.html
     - driversPool (TX01..TX05) → js/shuttle.js
     - VEHICLE_TYPE_SEATS / STAFF_CODE_MAP → js/shared/constants.js

   Trang Admin (admin.html) CRUD store này; ticketstaff.html + shuttle.html ĐỌC
   theo. Store được seed 1 lần từ đúng giá trị hard-code cũ nên hành vi 2 trang
   kia KHÔNG đổi ở lần chạy đầu.

   Nạp bằng thẻ <script> thường, NGAY SAU js/shared/storage-keys.js và TRƯỚC
   script chính của trang. Không phụ thuộc constants.js (shuttle.html không nạp
   file đó) — mọi seed literal nằm ngay trong file này.

   API: window.FleetStore  (xem cuối file).
   ========================================================= */
(function () {
  'use strict';

  // hn_ts_manifests_v1 được khai báo trong js/ticketstaff-manifest-core.js (không nạp ở shuttle/admin),
  // nên tham chiếu bằng literal ở đây để canDelete* dùng được ở mọi trang.
  var TS_MANIFESTS_KEY = 'hn_ts_manifests_v1';

  /* ---------------------------------------------------------
     SEED LITERALS — copy đúng giá trị hard-code cũ (1 lần).
     --------------------------------------------------------- */

  // ---- Danh mục TRẠM theo 3 vùng (nguồn: bảng người dùng cung cấp) ----
  var SG_STATIONS = ['508 Kinh Dương Vương', '58 Lê Đại Hành', '4 Tống Văn Trân', 'Bến xe miền Tây quầy 29', 'Sài Gòn', 'Tiền Giang', 'Vĩnh Long', 'Đồng Tháp'];
  var BD_STATIONS = ['Trạm An Phú', 'Bến xe An Phú', 'Trạm Bến Cát', 'Trạm Phú Chánh', 'Trạm Tân Uyên', 'Trạm An Tây', 'Trạm Bình Phước', 'Trạm An Sương', 'Bình Dương'];
  var AG_STATIONS = ['Trạm An Giang', 'Trạm Sa Đéc', 'Trạm Long Xuyên', 'Trạm Vịnh Tre', 'Trạm Châu Đốc', 'Trạm An Phú', 'Trạm Tri Tôn', 'Trạm Chi Lăng', 'Trạm Tịnh Biên', 'Trạm Nhà Bàng', 'Trạm Tân Châu', 'Trạm Núi Sập', 'Trạm Hà Tiên', 'Trạm Long Bình', 'Trạm Đồng Ky', 'Trạm Bắc Đai', 'Trạm Vĩnh Hội Đông', 'Trạm Cần Thảo', 'Trạm Cái Dầu', 'Trạm Năng Gù', 'Trạm Bình Hòa', 'Trạm Châu Thành', 'Trạm Cần Đăng', 'Trạm Phú Hòa', 'Trạm Óc Eo', 'Trạm An Hòa', 'Trạm Cựu Hội', 'Trạm Ba Chúc', 'Trạm Lạc Quới', 'Trạm Giang Thành', 'Trạm Tân An - Tân Châu'];

  // Dữ liệu mẫu cho các cột Mã trạm / Địa chỉ / Hotline hàng / Hotline vé — sinh theo quy tắc cố định
  // (deterministic) cho từng vùng để mỗi trạm có sẵn thông tin minh hoạ thay vì bỏ trống.
  var STATION_SEED_META = {
    saigon:    { code: 'SG', province: 'TP. Hồ Chí Minh', landline: '028 3752 ', mobile: '0908 ' },
    binhduong: { code: 'BD', province: 'Bình Dương',      landline: '0274 3822 ', mobile: '0918 ' },
    angiang:   { code: 'AG', province: 'An Giang',        landline: '0296 3853 ', mobile: '0968 ' }
  };
  function pad3(n) { n = String(n); return n.length >= 3 ? n : ('000' + n).slice(-3); }
  function seedStationRow(name, region, i) {
    var m = STATION_SEED_META[region] || { code: 'TR', province: '', landline: '02 ', mobile: '09 ' };
    var no = String(i + 1); if (no.length < 2) no = '0' + no;
    var short = name.replace(/^Trạm\s+/i, '');
    return {
      name: name,
      region: region,
      code: m.code + no,
      address: short + (m.province ? ', ' + m.province : ''),
      province: m.province,
      hotlineCargo: m.landline + pad3(700 + i * 3),
      hotlineTicket: m.mobile + pad3(110 + i * 9) + ' ' + pad3(20 + i * 7)
    };
  }

  var SEED_STATIONS = []
    .concat(SG_STATIONS.map(function (n, i) { return seedStationRow(n, 'saigon', i); }))
    .concat(BD_STATIONS.map(function (n, i) { return seedStationRow(n, 'binhduong', i); }))
    .concat(AG_STATIONS.map(function (n, i) { return seedStationRow(n, 'angiang', i); }));

  // 4 hướng — hiển thị tên đầy đủ, KHÔNG gắn nhãn đi/về. `sense` giữ NỘI BỘ cho bộ lọc "Chiều đi /
  // Chiều về" ở tab Phơi xe của TicketStaff. Trạm đi/đến/đón nằm ở TỪNG TUYẾN, không ở hướng.
  var SEED_DIRECTIONS = [
    { id: 'sg-ag', label: 'Sài Gòn - An Giang', sense: 'di', active: true, order: 0 },
    { id: 'bd-ag', label: 'Bình Dương - An Giang', sense: 'di', active: true, order: 1 },
    { id: 'ag-bd', label: 'An Giang - Bình Dương', sense: 've', active: true, order: 2 },
    { id: 'ag-sg', label: 'An Giang - Sài Gòn', sense: 've', active: true, order: 3 }
  ];

  // Điểm đầu An Giang cho từng tuyến: [tên hiển thị, tên trạm An Giang, viết tắt]
  var AG_ENDPOINTS = [
    ['Long Xuyên', 'Trạm Long Xuyên', 'LX'],
    ['Châu Đốc', 'Trạm Châu Đốc', 'CD'],
    ['An Phú', 'Trạm An Phú', 'AP'],
    ['Tri Tôn', 'Trạm Tri Tôn', 'TT'],
    ['Chi Lăng', 'Trạm Chi Lăng', 'CL'],
    ['Tịnh Biên', 'Trạm Tịnh Biên', 'TB'],
    ['Tân Châu', 'Trạm Tân Châu', 'TC'],
    ['Núi Sập', 'Trạm Núi Sập', 'NS'],
    ['Hà Tiên', 'Trạm Hà Tiên', 'HT']
  ];

  // Tuyến chính — 10 tuyến / 1 hướng (40 tuyến): 1 tuyến gốc + 9 tuyến theo điểm đầu An Giang.
  // `label` = chuỗi `route` lưu vào mọi phơi. Trạm đi/đến seed theo quy ước; "Trạm có thể nhận"
  // (pickupStations) để trống — Admin thêm từ danh mục trạm của từng địa điểm.
  var SEED_ROUTES = (function buildSeedRoutes() {
    var out = [];
    // tuyến gốc (row đầu): địa điểm ↔ An Giang, trạm đi/đến = cả 2 danh mục
    out.push({ id: 'sg-ag-main', directionId: 'sg-ag', label: 'Sài Gòn - An Giang', abbr: 'SG-AG', price: 160000, active: true, order: 0, fromStations: SG_STATIONS.slice(), toStations: AG_STATIONS.slice(), pickupStations: [] });
    out.push({ id: 'bd-ag-main', directionId: 'bd-ag', label: 'Bình Dương - An Giang', abbr: 'BD-AG', price: 140000, active: true, order: 0, fromStations: BD_STATIONS.slice(), toStations: AG_STATIONS.slice(), pickupStations: [] });
    out.push({ id: 'ag-bd-main', directionId: 'ag-bd', label: 'An Giang - Bình Dương', abbr: 'AG-BD', price: 140000, active: true, order: 0, fromStations: AG_STATIONS.slice(), toStations: BD_STATIONS.slice(), pickupStations: [] });
    out.push({ id: 'ag-sg-main', directionId: 'ag-sg', label: 'An Giang - Sài Gòn', abbr: 'AG-SG', price: 160000, active: true, order: 0, fromStations: AG_STATIONS.slice(), toStations: SG_STATIONS.slice(), pickupStations: [] });

    AG_ENDPOINTS.forEach(function (ep, i) {
      var name = ep[0], stn = ep[1], ab = ep[2];
      var o = i + 1;
      // Sài Gòn -> An Giang
      out.push({ id: 'sg-ag-' + ab.toLowerCase(), directionId: 'sg-ag', label: 'Sài Gòn - ' + name, abbr: 'SG-' + ab, price: 160000, active: true, order: o, fromStations: SG_STATIONS.slice(), toStations: [stn], pickupStations: [] });
      // Bình Dương -> An Giang
      out.push({ id: 'bd-ag-' + ab.toLowerCase(), directionId: 'bd-ag', label: 'Bình Dương - ' + name, abbr: 'BD-' + ab, price: 140000, active: true, order: o, fromStations: BD_STATIONS.slice(), toStations: [stn], pickupStations: [] });
      // An Giang -> Bình Dương
      out.push({ id: 'ag-bd-' + ab.toLowerCase(), directionId: 'ag-bd', label: name + ' - Bình Dương', abbr: ab + '-BD', price: 140000, active: true, order: o, fromStations: [stn], toStations: BD_STATIONS.slice(), pickupStations: [] });
      // An Giang -> Sài Gòn
      out.push({ id: 'ag-sg-' + ab.toLowerCase(), directionId: 'ag-sg', label: name + ' - Sài Gòn', abbr: ab + '-SG', price: 160000, active: true, order: o, fromStations: [stn], toStations: SG_STATIONS.slice(), pickupStations: [] });
    });
    return out;
  })();

  // Loại xe — scope 'line' = 18 loại của VEHICLE_TYPE_SEATS (js/shared/constants.js).
  // featuredForTrip:true = đúng 3 loại đang có trong <select id="tripVehicleType"> (ticketstaff.html).
  var SEED_VEHICLE_TYPES = [
    { name: 'Limousine 24 Phòng', seats: 24, scope: 'line', featuredForTrip: true, active: true },
    { name: 'Giường nằm 34 chỗ', seats: 34, scope: 'line', featuredForTrip: true, active: true },
    { name: 'Ghế ngồi 45 chỗ', seats: 45, scope: 'line', featuredForTrip: true, active: true },
    { name: 'Limousine 34 giường', seats: 34, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe thường 36 giường', seats: 36, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe thường 40 giường', seats: 40, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe thường 41 giường', seats: 41, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe VIP 24 phòng', seats: 24, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe 44 giường', seats: 44, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe Limousine 9 chỗ', seats: 9, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe Limousine 11 chỗ', seats: 11, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe Limousine 19 chỗ', seats: 19, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe Limousine 28 chỗ', seats: 28, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe thường 16 chỗ', seats: 16, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe thường 26 chỗ', seats: 26, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe thường 28 chỗ', seats: 28, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe thường 47 chỗ', seats: 47, scope: 'line', featuredForTrip: false, active: true },
    { name: 'Xe Limousine 18 chỗ', seats: 18, scope: 'line', featuredForTrip: false, active: true },
    // scope 'shuttle' = 4 loại của <select id="assignVehicleTypeSelect"> (shuttle.html) — từ vựng riêng.
    { name: 'Xe 16 chỗ', seats: 16, scope: 'shuttle', featuredForTrip: false, active: true },
    { name: 'Xe 7 chỗ', seats: 7, scope: 'shuttle', featuredForTrip: false, active: true },
    { name: 'Xe 29 chỗ', seats: 29, scope: 'shuttle', featuredForTrip: false, active: true },
    // Trùng tên với loại 'line' cùng tên là chấp nhận được: getVehicleTypes({scope}) lọc theo scope,
    // vehicleTypeSeats() gộp theo tên (cùng số ghế = 9).
    { name: 'Xe Limousine 9 chỗ', seats: 9, scope: 'shuttle', featuredForTrip: false, active: true }
  ];

  // Xe — scope 'line' = 3 biển placeholder của <select id="plateSelect"> ∪ biển thật trong phơi mẫu
  // (DEFAULT_*_TRIPS, constants.js). scope 'shuttle' = 6 biển của <select id="assignPlateSelect">.
  var SEED_VEHICLES = [
    { plate: '51F-123.45', vehicleType: 'Limousine 24 Phòng', seats: 24, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '50H-678.90', vehicleType: 'Giường nằm 34 chỗ', seats: 34, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '50H-345.67', vehicleType: 'Ghế ngồi 45 chỗ', seats: 45, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51F-234.56', vehicleType: 'Limousine 24 Phòng', seats: 24, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '50H-789.01', vehicleType: 'Giường nằm 34 chỗ', seats: 34, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51F-222.33', vehicleType: 'Limousine 24 Phòng', seats: 24, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51B-123.45', vehicleType: '', seats: 0, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51B-678.90', vehicleType: '', seats: 0, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '50F-111.22', vehicleType: '', seats: 0, scope: 'line', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51B-666.66', vehicleType: 'Xe 16 chỗ', seats: 16, scope: 'shuttle', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51B-777.77', vehicleType: 'Xe 16 chỗ', seats: 16, scope: 'shuttle', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '50H-888.88', vehicleType: 'Xe 29 chỗ', seats: 29, scope: 'shuttle', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51B-999.99', vehicleType: 'Xe 7 chỗ', seats: 7, scope: 'shuttle', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51B-111.11', vehicleType: 'Xe 16 chỗ', seats: 16, scope: 'shuttle', driverDefault: '', helperDefault: '', active: true, note: '' },
    { plate: '51B-222.22', vehicleType: 'Xe Limousine 9 chỗ', seats: 9, scope: 'shuttle', driverDefault: '', helperDefault: '', active: true, note: '' }
  ];

  // Nhân viên —
  //  role 'ticket'        : STAFF_CODE_MAP (constants.js) — giữ username để getStaffCode() vẫn map đúng
  //  role 'driver'        : <div id="driverDropdownPanel"> (ticketstaff.html) ∪ PK_TS_SAMPLE_DRIVERS
  //  role 'helper'        : <div id="helperDropdownPanel"> (ticketstaff.html)
  //  role 'shuttle_driver': driversPool TX01..TX05 (shuttle.js)
  // Chuỗi "Lê Minh Tuấn (trùng lịch)" GIỮ NGUYÊN — checkDriverConflict() match bằng .includes('trùng lịch').
  var SEED_STAFF = [
    { code: 'NV01', name: 'tuyetphuong.huenghia', username: 'tuyetphuong.huenghia', role: 'ticket', phone: '', license: '', active: true },
    { code: 'NV02', name: 'minh.tran', username: 'minh.tran', role: 'ticket', phone: '', license: '', active: true },
    { code: 'NV03', name: 'nguyen.long', username: 'nguyen.long', role: 'ticket', phone: '', license: '', active: true },
    { code: 'NV04', name: 'thi.hoa', username: 'thi.hoa', role: 'ticket', phone: '', license: '', active: true },
    { code: '', name: 'Trần Văn Hùng', username: '', role: 'driver', phone: '0908 111 222', license: '', active: true },
    { code: '', name: 'Lê Minh Tuấn (trùng lịch)', username: '', role: 'driver', phone: '', license: '', active: true },
    { code: '', name: 'Phạm Quốc Bảo', username: '', role: 'driver', phone: '0937 555 666', license: '', active: true },
    { code: '', name: 'Nguyễn Văn Nam', username: '', role: 'driver', phone: '0918 333 444', license: '', active: true },
    { code: '', name: 'Lê Hoàng Anh', username: '', role: 'driver', phone: '0946 777 888', license: '', active: true },
    { code: '', name: 'Võ Thành Long', username: '', role: 'driver', phone: '0977 999 000', license: '', active: true },
    { code: '', name: 'Nguyễn Thị Hương', username: '', role: 'helper', phone: '', license: '', active: true },
    { code: '', name: 'Đỗ Văn Sơn', username: '', role: 'helper', phone: '', license: '', active: true },
    { code: '', name: 'Nguyễn Văn Bình', username: '', role: 'helper', phone: '', license: '', active: true },
    { code: 'TX01', name: 'Nguyễn Văn Bình', username: '', role: 'shuttle_driver', phone: '0909111222', license: 'D', active: true },
    { code: 'TX02', name: 'Trịnh Công Sơn', username: '', role: 'shuttle_driver', phone: '0918222333', license: 'B2', active: true },
    { code: 'TX03', name: 'Lê Hoài Nam', username: '', role: 'shuttle_driver', phone: '0927333444', license: 'E', active: true },
    { code: 'TX04', name: 'Phạm Đức Duy', username: '', role: 'shuttle_driver', phone: '0936444555', license: 'D', active: true },
    { code: 'TX05', name: 'Trần Văn Hải', username: '', role: 'shuttle_driver', phone: '0907222333', license: 'FC', active: true }
  ];

  // Thông báo tuyển dụng (Nhân sự > Thông báo tuyển dụng, admin-recruitment.js) — 3 mẫu minh hoạ để
  // trang không trống khi mới mở lần đầu. `requirements`/`benefits`/`description` lưu dạng chuỗi nhiều
  // dòng (mỗi dòng 1 ý) — trang hiển thị tách dòng ra thành danh sách gạch đầu dòng.
  var SEED_RECRUITMENT = [
    {
      id: 'rc_seed_1',
      title: 'Tài xế Limousine / Giường nằm',
      quantity: 3,
      location: 'Trạm Sài Gòn (508 Kinh Dương Vương) và các trạm lân cận',
      employmentType: 'full_time',
      salary: '10.000.000 - 15.000.000đ + phụ cấp chuyến',
      experience: 'Trên 2 năm lái xe khách đường dài, có bằng lái phù hợp loại xe',
      requirements: 'Có bằng lái hạng D/E/FC còn hiệu lực\nTrên 2 năm kinh nghiệm lái xe khách đường dài\nSức khoẻ tốt, không có tiền án tiền sự\nƯu tiên biết tuyến Sài Gòn - An Giang',
      benefits: 'Lương thoả thuận theo kinh nghiệm + phụ cấp mỗi chuyến\nBHXH, BHYT theo quy định\nHỗ trợ ăn ở khi chạy tuyến dài\nThưởng lễ, Tết',
      description: 'Trực tiếp lái xe đưa khách theo tuyến cố định, đảm bảo an toàn, đúng giờ; kiểm tra tình trạng xe trước/sau chuyến; phối hợp phụ xe hỗ trợ khách lên xuống.',
      deadline: '',
      contactName: 'Phòng Nhân sự',
      contactPhone: '0908 111 222',
      contactEmail: 'tuyendung@huenghia.vn',
      status: 'active',
      featured: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'rc_seed_2',
      title: 'Nhân viên bán vé / Phòng vé',
      quantity: 2,
      location: 'Trạm Bình Dương',
      employmentType: 'full_time',
      salary: '6.500.000 - 8.500.000đ + hoa hồng',
      experience: 'Không yêu cầu kinh nghiệm, ưu tiên đã từng bán vé/CSKH',
      requirements: 'Tốt nghiệp THPT trở lên\nGiao tiếp tốt, chịu được áp lực giờ cao điểm\nBiết sử dụng máy tính cơ bản\nƯu tiên nữ, ngoại hình ưa nhìn',
      benefits: 'Đào tạo nghiệp vụ trước khi làm\nĐồng phục, phụ cấp ăn trưa\nBHXH sau thời gian thử việc\nCơ hội thăng tiến lên trưởng ca',
      description: 'Bán vé, tư vấn hành trình cho khách tại quầy; sắp xếp chỗ ngồi trên phơi xe; hỗ trợ khách lên xe đúng chuyến, đúng giờ.',
      deadline: '',
      contactName: 'Phòng Nhân sự',
      contactPhone: '0908 111 222',
      contactEmail: 'tuyendung@huenghia.vn',
      status: 'active',
      featured: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'rc_seed_3',
      title: 'Nhân viên tổng đài (Call Center)',
      quantity: 4,
      location: 'Làm việc tại văn phòng, có thể sắp ca linh động',
      employmentType: 'shift',
      salary: 'Thoả thuận theo năng lực',
      experience: 'Không yêu cầu, có đào tạo',
      requirements: 'Giọng nói rõ, dễ nghe\nSử dụng thành thạo tin học văn phòng\nChịu được áp lực trả lời điện thoại liên tục\nCó thể làm ca tối/cuối tuần',
      benefits: 'Lương cứng + thưởng theo doanh số\nCa làm linh động, có thể học song song\nMôi trường làm việc trẻ, năng động',
      description: 'Tiếp nhận và tư vấn đặt vé qua điện thoại/Zalo; xử lý yêu cầu đổi/trả vé; phối hợp điều phối trung chuyển đón khách.',
      deadline: '',
      contactName: 'Phòng Nhân sự',
      contactPhone: '0908 111 222',
      contactEmail: 'tuyendung@huenghia.vn',
      status: 'paused',
      featured: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  /* ---------------------------------------------------------
     LOW-LEVEL
     --------------------------------------------------------- */
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      var val = JSON.parse(raw);
      return val == null ? fallback : val;
    } catch (e) {
      console.warn('[FleetStore] đọc lỗi', key, e);
      return fallback;
    }
  }

  function writeJSON(key, val) {
    // Không tự bắn StorageEvent (giống saveSeatBank()); tab khác nhận qua 'storage' của trình duyệt.
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('[FleetStore] ghi lỗi', key, e);
    }
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function seedKey(key, build) {
    if (localStorage.getItem(key) === null) writeJSON(key, build());
  }

  function seedAll() {
    seedKey(HN_DIRECTIONS_KEY, function () { return clone(SEED_DIRECTIONS); });
    seedKey(HN_ROUTES_KEY, function () { return clone(SEED_ROUTES); });
    seedKey(HN_STATIONS_KEY, function () { return clone(SEED_STATIONS); });
    seedKey(HN_MAIN_STATIONS_KEY, function () { return []; });
    seedKey(HN_SUB_STATIONS_KEY, function () { return []; });
    seedKey(HN_VEHICLE_TYPES_KEY, function () { return clone(SEED_VEHICLE_TYPES); });
    seedKey(HN_VEHICLES_KEY, function () { return clone(SEED_VEHICLES); });
    seedKey(HN_STAFF_KEY, function () { return clone(SEED_STAFF); });
    seedKey(HN_ADMIN_ACTIVITY_KEY, function () { return []; });
    seedKey(HN_RECRUITMENT_KEY, function () { return clone(SEED_RECRUITMENT); });
  }

  // Với localStorage đã seed từ bản cũ: tự BỔ SUNG những trạm seed còn thiếu (khớp theo region+name),
  // KHÔNG xoá/sửa trạm Admin đã thêm hay đã chỉnh. Chạy mỗi lần nạp — idempotent.
  function mergeSeedStations() {
    var cur = readJSON(HN_STATIONS_KEY, null);
    if (cur === null || !Array.isArray(cur)) return; // seedKey đã ghi trọn SEED_STATIONS
    var seedByKey = {};
    SEED_STATIONS.forEach(function (s) { seedByKey[(s.region || '') + '||' + s.name] = s; });
    var have = {};
    cur.forEach(function (s) { if (s && s.name != null) have[(s.region || '') + '||' + s.name] = true; });
    var changed = 0;
    SEED_STATIONS.forEach(function (s) {
      var k = (s.region || '') + '||' + s.name;
      if (!have[k]) { cur.push(clone(s)); have[k] = true; changed++; }
    });
    // Backfill dữ liệu mẫu (mã trạm / địa chỉ / tỉnh thành / hotline) cho trạm seed đang bỏ trống —
    // KHÔNG đè giá trị Admin đã tự nhập. Idempotent, chạy mỗi lần nạp.
    cur.forEach(function (s) {
      if (!s || s.name == null) return;
      var seed = seedByKey[(s.region || '') + '||' + s.name];
      if (!seed) return;
      ['code', 'address', 'province', 'hotlineCargo', 'hotlineTicket'].forEach(function (f) {
        if (!s[f] && seed[f]) { s[f] = seed[f]; changed++; }
      });
    });
    if (changed) writeJSON(HN_STATIONS_KEY, cur);
  }

  // Tương tự cho TUYẾN: với các tuyến seed (khớp theo id), bổ sung trạm đi/đến seed còn thiếu để
  // dropdown "Trạm đi/Trạm đến" khi tạo phơi (kể cả nhánh theo từng tuyến bên Admin) có đủ trạm mới.
  // Chỉ đụng tuyến seed; tuyến Admin tự tạo (id lạ) và danh sách "trạm có thể nhận" giữ nguyên.
  function mergeSeedRouteStations() {
    var cur = readJSON(HN_ROUTES_KEY, null);
    if (cur === null || !Array.isArray(cur)) return;
    var seedById = {};
    SEED_ROUTES.forEach(function (r) { seedById[r.id] = r; });
    var changed = false;
    cur.forEach(function (r) {
      var sd = r && seedById[r.id];
      if (!sd) return;
      ['fromStations', 'toStations'].forEach(function (k) {
        var have = {};
        (r[k] || []).forEach(function (n) { have[n] = true; });
        (sd[k] || []).forEach(function (n) {
          if (!have[n]) { r[k] = (r[k] || []).concat([n]); have[n] = true; changed = true; }
        });
      });
    });
    if (changed) writeJSON(HN_ROUTES_KEY, cur);
  }

  /* ---------------------------------------------------------
     GETTERS / SETTERS
     --------------------------------------------------------- */
  function getDirections() { return readJSON(HN_DIRECTIONS_KEY, clone(SEED_DIRECTIONS)); }
  function setDirections(a) { writeJSON(HN_DIRECTIONS_KEY, Array.isArray(a) ? a : []); }

  function getRoutes() { return readJSON(HN_ROUTES_KEY, clone(SEED_ROUTES)); }
  function setRoutes(a) { writeJSON(HN_ROUTES_KEY, Array.isArray(a) ? a : []); }

  function getStations(opts) {
    var list = readJSON(HN_STATIONS_KEY, clone(SEED_STATIONS));
    if (opts && opts.region) list = list.filter(function (s) { return s.region === opts.region; });
    return list;
  }
  function setStations(a) { writeJSON(HN_STATIONS_KEY, Array.isArray(a) ? a : []); }

  function getMainStations() { return readJSON(HN_MAIN_STATIONS_KEY, []); }
  function setMainStations(a) { writeJSON(HN_MAIN_STATIONS_KEY, Array.isArray(a) ? a : []); }
  function getSubStations() { return readJSON(HN_SUB_STATIONS_KEY, []); }
  function setSubStations(a) { writeJSON(HN_SUB_STATIONS_KEY, Array.isArray(a) ? a : []); }
  function getStopStations() { return readJSON(HN_STOP_STATIONS_KEY, []); }
  function setStopStations(a) { writeJSON(HN_STOP_STATIONS_KEY, Array.isArray(a) ? a : []); }
  function makeStationId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }
  function normalizeProvince(provinceKey, fallbackLabel) {
    var meta = [];
    try { meta = (typeof getRegionMeta === 'function') ? getRegionMeta() : []; } catch (e) { meta = []; }
    var match = meta.find(function (m) { return m && m[0] === provinceKey; });
    return match ? { provinceKey: match[0], province: match[1].replace(/^Trạm\s+/i, '') } : { provinceKey: provinceKey || '', province: (fallbackLabel || '').replace(/^Trạm\s+/i, '') };
  }
  function addMainStation(fields) {
    var name = String((fields && fields.name) || '').trim();
    if (!name) return { ok: false, reason: 'Tên trạm chính không được để trống.' };
    var meta = normalizeProvince(fields && fields.provinceKey, fields && fields.province);
    var list = getMainStations();
    if (list.some(function (s) { return String(s.name || '').toLowerCase() === name.toLowerCase(); })) {
      return { ok: false, reason: 'Trạm chính này đã tồn tại.' };
    }
    var item = {
      id: String((fields && fields.id) || makeStationId('main')),
      name: name,
      provinceKey: meta.provinceKey,
      province: meta.province || '',
      code: String((fields && fields.code) || '').trim(),
      address: String((fields && fields.address) || '').trim(),
      hotline: String((fields && fields.hotline) || '').trim()
    };
    list.push(item);
    setMainStations(list);
    return { ok: true, item: item };
  }
  function updateMainStation(id, fields) {
    var list = getMainStations();
    var idx = list.findIndex(function (s) { return s && s.id === id; });
    if (idx === -1) return { ok: false, reason: 'Không tìm thấy trạm chính.' };
    var name = String((fields && fields.name) || '').trim();
    if (!name) return { ok: false, reason: 'Tên trạm chính không được để trống.' };
    var current = list[idx];
    if (String(current.name || '').toLowerCase() !== name.toLowerCase() && list.some(function (s, i) { return i !== idx && String(s.name || '').toLowerCase() === name.toLowerCase(); })) {
      return { ok: false, reason: 'Tên trạm chính đã tồn tại.' };
    }
    var meta = normalizeProvince(fields && fields.provinceKey, fields && fields.province);
    current.name = name;
    current.provinceKey = meta.provinceKey;
    current.province = meta.province || '';
    current.code = String((fields && fields.code) || '').trim();
    current.address = String((fields && fields.address) || '').trim();
    current.hotline = String((fields && fields.hotline) || '').trim();
    setMainStations(list);
    return { ok: true, item: current };
  }
  function removeMainStation(id) {
    var list = getMainStations();
    var item = list.find(function (s) { return s && s.id === id; });
    if (!item) return { ok: true };
    var dependents = getSubStations().filter(function (s) { return s && s.mainStationId === id; }).length;
    if (dependents) return { ok: false, reason: 'Trạm chính còn ' + dependents + ' trạm phụ. Xoá các trạm phụ trước.' };
    setMainStations(list.filter(function (s) { return s && s.id !== id; }));
    return { ok: true };
  }
  function addSubStation(fields) {
    var mainStationId = String((fields && fields.mainStationId) || '').trim();
    var name = String((fields && fields.name) || '').trim();
    if (!mainStationId) return { ok: false, reason: 'Chọn trạm chính trước.' };
    if (!name) return { ok: false, reason: 'Tên trạm phụ không được để trống.' };
    var main = getMainStations().find(function (s) { return s && s.id === mainStationId; });
    if (!main) return { ok: false, reason: 'Trạm chính không tồn tại.' };
    var list = getSubStations();
    if (list.some(function (s) { return s && s.mainStationId === mainStationId && String(s.name || '').toLowerCase() === name.toLowerCase(); })) {
      return { ok: false, reason: 'Trạm phụ này đã tồn tại trong trạm chính.' };
    }
    var item = {
      id: String((fields && fields.id) || makeStationId('sub')),
      mainStationId: mainStationId,
      name: name,
      provinceKey: main.provinceKey || '',
      province: main.province || '',
      code: String((fields && fields.code) || '').trim(),
      address: String((fields && fields.address) || '').trim(),
      hotline: String((fields && fields.hotline) || '').trim()
    };
    list.push(item);
    setSubStations(list);
    return { ok: true, item: item };
  }
  function updateSubStation(id, fields) {
    var list = getSubStations();
    var idx = list.findIndex(function (s) { return s && s.id === id; });
    if (idx === -1) return { ok: false, reason: 'Không tìm thấy trạm phụ.' };
    var mainStationId = String((fields && fields.mainStationId) || '').trim();
    var name = String((fields && fields.name) || '').trim();
    if (!mainStationId) return { ok: false, reason: 'Chọn trạm chính trước.' };
    if (!name) return { ok: false, reason: 'Tên trạm phụ không được để trống.' };
    var main = getMainStations().find(function (s) { return s && s.id === mainStationId; });
    if (!main) return { ok: false, reason: 'Trạm chính không tồn tại.' };
    if (String(list[idx].name || '').toLowerCase() !== name.toLowerCase() && list.some(function (s, i) {
      return i !== idx && s && s.mainStationId === mainStationId && String(s.name || '').toLowerCase() === name.toLowerCase();
    })) {
      return { ok: false, reason: 'Tên trạm phụ đã tồn tại trong trạm chính.' };
    }
    var current = list[idx];
    current.mainStationId = mainStationId;
    current.name = name;
    current.provinceKey = main.provinceKey || '';
    current.province = main.province || '';
    current.code = String((fields && fields.code) || '').trim();
    current.address = String((fields && fields.address) || '').trim();
    current.hotline = String((fields && fields.hotline) || '').trim();
    setSubStations(list);
    return { ok: true, item: current };
  }
  function removeSubStation(id) {
    var list = getSubStations();
    var next = list.filter(function (s) { return s && s.id !== id; });
    setSubStations(next);
    return { ok: true };
  }
  function addStopStation(fields) {
    var stationName = String((fields && fields.stationName) || '').trim();
    var name = String((fields && fields.name) || '').trim();
    if (!stationName) return { ok: false, reason: 'Chọn trạm xe.' };
    if (!name) return { ok: false, reason: 'Tên điểm dừng không được để trống.' };
    var station = getStations().find(function (s) { return s && s.name === stationName; });
    if (!station) return { ok: false, reason: 'Trạm xe không hợp lệ.' };
    var list = getStopStations();
    if (list.some(function (s) { return s && s.stationName === stationName && String(s.name || '').toLowerCase() === name.toLowerCase(); })) {
      return { ok: false, reason: 'Điểm dừng này đã tồn tại trong trạm xe.' };
    }
    var item = {
      id: String((fields && fields.id) || makeStationId('stop')),
      stationName: stationName,
      name: name,
      code: String((fields && fields.code) || '').trim(),
      address: String((fields && fields.address) || '').trim(),
      hotline: String((fields && fields.hotline) || '').trim()
    };
    list.push(item);
    setStopStations(list);
    return { ok: true, item: item };
  }
  function updateStopStation(id, fields) {
    var list = getStopStations();
    var idx = list.findIndex(function (s) { return s && s.id === id; });
    if (idx === -1) return { ok: false, reason: 'Không tìm thấy điểm dừng.' };
    var stationName = String((fields && fields.stationName) || '').trim();
    var name = String((fields && fields.name) || '').trim();
    if (!stationName) return { ok: false, reason: 'Chọn trạm xe.' };
    if (!name) return { ok: false, reason: 'Tên điểm dừng không được để trống.' };
    var station = getStations().find(function (s) { return s && s.name === stationName; });
    if (!station) return { ok: false, reason: 'Trạm xe không hợp lệ.' };
    if (String(list[idx].name || '').toLowerCase() !== name.toLowerCase() && list.some(function (s, i) {
      return i !== idx && s && s.stationName === stationName && String(s.name || '').toLowerCase() === name.toLowerCase();
    })) {
      return { ok: false, reason: 'Điểm dừng này đã tồn tại trong trạm xe.' };
    }
    var current = list[idx];
    current.stationName = stationName;
    current.name = name;
    current.code = String((fields && fields.code) || '').trim();
    current.address = String((fields && fields.address) || '').trim();
    current.hotline = String((fields && fields.hotline) || '').trim();
    setStopStations(list);
    return { ok: true, item: current };
  }
  function removeStopStation(id) {
    var list = getStopStations();
    setStopStations(list.filter(function (s) { return s && s.id !== id; }));
    return { ok: true };
  }
  // Thêm 1 trạm vào danh mục nếu chưa có (khớp theo tên) — trả true nếu vừa thêm.
  function addStation(name, region) {
    name = String(name || '').trim();
    if (!name) return false;
    var list = getStations();
    if (list.some(function (s) { return s.name === name; })) return false;
    list.push({ name: name, region: region || '' });
    setStations(list);
    return true;
  }
  // Thêm 1 trạm đầy đủ thông tin (màn "Trạm xe") — trả true nếu vừa thêm, false nếu tên đã tồn tại.
  // fields: { name, region, code, address, province, hotlineCargo, hotlineTicket }
  function addStationFull(fields) {
    var name = String((fields && fields.name) || '').trim();
    if (!name) return false;
    var list = getStations();
    if (list.some(function (s) { return s.name === name; })) return false;
    list.push({
      name: name,
      region: (fields && fields.region) || '',
      code: (fields && fields.code) || '',
      address: (fields && fields.address) || '',
      province: (fields && fields.province) || '',
      hotlineCargo: (fields && fields.hotlineCargo) || '',
      hotlineTicket: (fields && fields.hotlineTicket) || ''
    });
    setStations(list);
    return true;
  }
  // Sửa 1 trạm theo tên hiện tại — nếu fields.name đổi sang tên mới, cascade đổi tên đó trong mọi
  // tuyến (fromStations/toStations/pickupStations) để không "mồ côi" tham chiếu trạm cũ.
  // Trả { ok:true } hoặc { ok:false, reason }.
  function updateStation(oldName, fields) {
    var newName = String((fields && fields.name) || '').trim();
    if (!newName) return { ok: false, reason: 'Tên trạm không được để trống.' };
    var list = getStations();
    var st = list.find(function (s) { return s.name === oldName; });
    if (!st) return { ok: false, reason: 'Không tìm thấy trạm.' };
    if (newName !== oldName && list.some(function (s) { return s.name === newName; })) {
      return { ok: false, reason: 'Tên trạm đã tồn tại.' };
    }
    st.name = newName;
    st.region = (fields && fields.region) || '';
    st.code = (fields && fields.code) || '';
    st.address = (fields && fields.address) || '';
    st.province = (fields && fields.province) || '';
    st.hotlineCargo = (fields && fields.hotlineCargo) || '';
    st.hotlineTicket = (fields && fields.hotlineTicket) || '';
    setStations(list);
    if (newName !== oldName) {
      var routes = getRoutes();
      var changed = false;
      routes.forEach(function (r) {
        ['fromStations', 'toStations', 'pickupStations'].forEach(function (k) {
          if (!Array.isArray(r[k])) return;
          var i = r[k].indexOf(oldName);
          if (i !== -1) { r[k][i] = newName; changed = true; }
        });
      });
      if (changed) setRoutes(routes);
    }
    return { ok: true };
  }
  // Số tuyến đang dùng 1 trạm (ở Trạm đi / Trạm đến / Trạm có thể nhận).
  function stationUsage(name) {
    return getRoutes().filter(function (r) {
      return (r.fromStations || []).indexOf(name) !== -1 ||
        (r.toStations || []).indexOf(name) !== -1 ||
        (r.pickupStations || []).indexOf(name) !== -1;
    }).length;
  }
  // Xoá trạm khỏi danh mục + gỡ khỏi mọi tuyến.
  function removeStation(name) {
    setStations(getStations().filter(function (s) { return s.name !== name; }));
    var routes = getRoutes();
    var changed = false;
    routes.forEach(function (r) {
      ['fromStations', 'toStations', 'pickupStations'].forEach(function (k) {
        if (Array.isArray(r[k]) && r[k].indexOf(name) !== -1) {
          r[k] = r[k].filter(function (x) { return x !== name; });
          changed = true;
        }
      });
    });
    if (changed) setRoutes(routes);
  }

  function getVehicleTypes(opts) {
    var list = readJSON(HN_VEHICLE_TYPES_KEY, clone(SEED_VEHICLE_TYPES));
    if (opts && opts.scope) list = list.filter(function (v) { return v.scope === opts.scope; });
    return list;
  }
  function setVehicleTypes(a) { writeJSON(HN_VEHICLE_TYPES_KEY, Array.isArray(a) ? a : []); }

  function getVehicles(opts) {
    var list = readJSON(HN_VEHICLES_KEY, clone(SEED_VEHICLES));
    if (opts && opts.scope) list = list.filter(function (v) { return v.scope === opts.scope; });
    return list;
  }
  function setVehicles(a) { writeJSON(HN_VEHICLES_KEY, Array.isArray(a) ? a : []); }

  function getStaff(opts) {
    var list = readJSON(HN_STAFF_KEY, clone(SEED_STAFF));
    if (opts && opts.role) list = list.filter(function (s) { return s.role === opts.role; });
    return list;
  }
  function setStaff(a) { writeJSON(HN_STAFF_KEY, Array.isArray(a) ? a : []); }

  // "Loại nhân viên" (Cấu hình nhân sự > Loại nhân viên) — trước đây là mảng hard-code STAFF_ROLES
  // trong admin-staff.js (ticket/driver/helper/shuttle_driver), nay chuyển vào đây để admin tự thêm/sửa/
  // xoá được qua UI. Giữ nguyên 4 key cũ khi seed lần đầu để không "mồ côi" staff.role đã lưu trước đó.
  // Mỗi loại còn mang theo `permissions` (mảng key theo window.PERMISSION_GROUPS, auth/permissions.js)
  // = "cụm phân quyền" mặc định cấp cho nhân viên thuộc loại này, và `redirect` (trang đích khi đăng
  // nhập) — đây là NGUỒN DUY NHẤT cho danh sách "Vai trò hệ thống" ở modal Thêm tài khoản
  // (admin-accounts.js, acAllRoles()) thay vì mảng gắn cứng riêng như trước, để 2 nơi luôn khớp nhau:
  // thêm loại nhân viên mới ở đây sẽ tự hiện ra khi tạo tài khoản. call_center/ticket_office/
  // shuttle_dispatch/dispatch_manager/accountant thêm MỚI ở đây (khác 4 key gốc ticket/driver/helper/
  // shuttle_driver) để khớp đúng 7 "Vai trò hệ thống" cũ của Tài khoản (trừ 'admin' — không phải 1 loại
  // nhân viên, vẫn giữ cố định riêng ở acAllRoles()). KHÔNG xoá/đổi tên 'ticket' dù trùng ý nghĩa với
  // 'call_center' — staff cũ (NV01-04) đang tham chiếu key này, đổi sẽ mồ côi dữ liệu.
  var SEED_STAFF_ROLES = [
    { key: 'ticket', label: 'Nhân viên vé', permissions: [], redirect: 'ticketstaff.html' },
    { key: 'driver', label: 'Tài xế', permissions: [], redirect: 'taixe.html' },
    { key: 'helper', label: 'Phụ xe', permissions: [], redirect: 'ticketstaff.html' },
    { key: 'shuttle_driver', label: 'Tài xế trung chuyển', permissions: [], redirect: 'ticketstaff.html' },
    { key: 'call_center', label: 'Nhân viên tổng đài', permissions: [], redirect: 'ticketstaff.html' },
    { key: 'ticket_office', label: 'Nhân viên phòng vé', permissions: [], redirect: 'ticketstaff.html' },
    { key: 'shuttle_dispatch', label: 'Điều hành trung chuyển', permissions: [], redirect: 'ticketstaff.html' },
    { key: 'dispatch_manager', label: 'Điều hành bến xe', permissions: [], redirect: 'dieuhanh.html' },
    { key: 'accountant', label: 'Kế toán / Thu ngân', permissions: [], redirect: 'ketoan.html' }
  ];
  function getStaffRoles() {
    var list = readJSON(HN_STAFF_ROLES_KEY, null);
    if (!Array.isArray(list)) return clone(SEED_STAFF_ROLES);
    // Dữ liệu cũ lưu trước khi có field `redirect` — mặc định ticketstaff.html thay vì để trống, tránh
    // modal Tài khoản tự điền trang đích rỗng cho các loại nhân viên đã tồn tại từ trước.
    return list.map(function (r) { return r && !r.redirect ? Object.assign({}, r, { redirect: 'ticketstaff.html' }) : r; });
  }
  function setStaffRoles(a) { writeJSON(HN_STAFF_ROLES_KEY, Array.isArray(a) ? a : []); }
  function addStaffRole(fields) {
    var label = String((fields && fields.label) || '').trim();
    if (!label) return { ok: false, reason: 'Tên loại nhân viên không được để trống.' };
    var list = getStaffRoles();
    if (list.some(function (r) { return String(r.label || '').toLowerCase() === label.toLowerCase(); })) {
      return { ok: false, reason: 'Loại nhân viên này đã tồn tại.' };
    }
    var item = {
      key: String((fields && fields.key) || makeStationId('role')),
      label: label,
      permissions: Array.isArray(fields && fields.permissions) ? fields.permissions : [],
      redirect: String((fields && fields.redirect) || 'ticketstaff.html')
    };
    list.push(item);
    setStaffRoles(list);
    return { ok: true, item: item };
  }
  function updateStaffRole(key, fields) {
    var list = getStaffRoles();
    var idx = list.findIndex(function (r) { return r && r.key === key; });
    if (idx === -1) return { ok: false, reason: 'Không tìm thấy loại nhân viên.' };
    var label = String((fields && fields.label) || '').trim();
    if (!label) return { ok: false, reason: 'Tên loại nhân viên không được để trống.' };
    if (list.some(function (r, i) { return i !== idx && String(r.label || '').toLowerCase() === label.toLowerCase(); })) {
      return { ok: false, reason: 'Tên loại nhân viên đã tồn tại.' };
    }
    list[idx].label = label;
    list[idx].permissions = Array.isArray(fields && fields.permissions) ? fields.permissions : [];
    list[idx].redirect = String((fields && fields.redirect) || 'ticketstaff.html');
    setStaffRoles(list);
    return { ok: true, item: list[idx] };
  }
  function removeStaffRole(key) {
    var used = getStaff().filter(function (s) { return s && s.role === key; }).length;
    if (used) return { ok: false, reason: 'Loại nhân viên này đang gán cho ' + used + ' nhân viên. Đổi loại cho các nhân viên đó trước.' };
    setStaffRoles(getStaffRoles().filter(function (r) { return r && r.key !== key; }));
    return { ok: true };
  }

  /* ---------------------------------------------------------
     THÔNG BÁO TUYỂN DỤNG
     --------------------------------------------------------- */
  function getRecruitmentPosts() { return readJSON(HN_RECRUITMENT_KEY, clone(SEED_RECRUITMENT)); }
  function setRecruitmentPosts(a) { writeJSON(HN_RECRUITMENT_KEY, Array.isArray(a) ? a : []); }
  function makeRecruitmentId() { return 'rc_' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function addRecruitmentPost(fields) {
    var title = String((fields && fields.title) || '').trim();
    if (!title) return { ok: false, reason: 'Nhập vị trí tuyển dụng.' };
    var list = getRecruitmentPosts();
    var now = Date.now();
    var item = {
      id: makeRecruitmentId(),
      title: title,
      quantity: Math.max(1, parseInt((fields && fields.quantity), 10) || 1),
      location: String((fields && fields.location) || '').trim(),
      employmentType: String((fields && fields.employmentType) || 'full_time'),
      salary: String((fields && fields.salary) || '').trim(),
      experience: String((fields && fields.experience) || '').trim(),
      requirements: String((fields && fields.requirements) || '').trim(),
      benefits: String((fields && fields.benefits) || '').trim(),
      description: String((fields && fields.description) || '').trim(),
      deadline: String((fields && fields.deadline) || '').trim(),
      contactName: String((fields && fields.contactName) || '').trim(),
      contactPhone: String((fields && fields.contactPhone) || '').trim(),
      contactEmail: String((fields && fields.contactEmail) || '').trim(),
      status: String((fields && fields.status) || 'active'),
      featured: !!(fields && fields.featured),
      createdAt: now,
      updatedAt: now
    };
    list.push(item);
    setRecruitmentPosts(list);
    return { ok: true, item: item };
  }
  function updateRecruitmentPost(id, fields) {
    var list = getRecruitmentPosts();
    var item = list.find(function (r) { return r && r.id === id; });
    if (!item) return { ok: false, reason: 'Không tìm thấy thông báo tuyển dụng.' };
    var title = String((fields && fields.title) || '').trim();
    if (!title) return { ok: false, reason: 'Nhập vị trí tuyển dụng.' };
    item.title = title;
    item.quantity = Math.max(1, parseInt((fields && fields.quantity), 10) || 1);
    item.location = String((fields && fields.location) || '').trim();
    item.employmentType = String((fields && fields.employmentType) || 'full_time');
    item.salary = String((fields && fields.salary) || '').trim();
    item.experience = String((fields && fields.experience) || '').trim();
    item.requirements = String((fields && fields.requirements) || '').trim();
    item.benefits = String((fields && fields.benefits) || '').trim();
    item.description = String((fields && fields.description) || '').trim();
    item.deadline = String((fields && fields.deadline) || '').trim();
    item.contactName = String((fields && fields.contactName) || '').trim();
    item.contactPhone = String((fields && fields.contactPhone) || '').trim();
    item.contactEmail = String((fields && fields.contactEmail) || '').trim();
    item.status = String((fields && fields.status) || 'active');
    item.featured = !!(fields && fields.featured);
    item.updatedAt = Date.now();
    setRecruitmentPosts(list);
    return { ok: true, item: item };
  }
  function removeRecruitmentPost(id) {
    setRecruitmentPosts(getRecruitmentPosts().filter(function (r) { return r && r.id !== id; }));
    return { ok: true };
  }

  function getActivity() { return readJSON(HN_ADMIN_ACTIVITY_KEY, []); }
  function pushActivity(entry) {
    var list = getActivity();
    list.push(entry);
    if (list.length > 500) list = list.slice(list.length - 500); // cap 500 FIFO
    writeJSON(HN_ADMIN_ACTIVITY_KEY, list);
  }

  /* ---------------------------------------------------------
     BUILDERS — trả về đúng shape cũ để code downstream không phải sửa.
     --------------------------------------------------------- */

  // { [route.id]: { label, route, price, directionId, directionLabel, fromStations, toStations, pickupStations } }
  // TicketStaff dùng object này cho dropdown "Hướng đi" khi tạo phơi — nay MỖI TUYẾN là 1 mục (trạm nằm
  // ở tuyến). Key = route.id; `.route` = nhãn tuyến (chuỗi lưu vào phơi). Chỉ gồm tuyến của hướng đang bật.
  function buildTripDirectionsCfg() {
    var dirById = {};
    getDirections().forEach(function (d) { dirById[d.id] = d; });
    var cfg = {};
    getRoutes().slice()
      .filter(function (r) { return r.active !== false; })
      .sort(function (a, b) {
        var da = dirById[a.directionId] || {}, db = dirById[b.directionId] || {};
        return (da.order || 0) - (db.order || 0) || (a.order || 0) - (b.order || 0);
      })
      .forEach(function (r) {
        var d = dirById[r.directionId];
        if (d && d.active === false) return;
        cfg[r.id] = {
          label: r.label,
          route: r.label,
          price: r.price,
          directionId: r.directionId,
          directionLabel: d ? d.label : '',
          fromStations: (r.fromStations || []).slice(),
          toStations: (r.toStations || []).slice(),
          pickupStations: (r.pickupStations || []).slice()
        };
      });
    return cfg;
  }

  // { [directionId]: { label, route, sense, price, fromStations, toStations, pickupStations, routeLabels } }
  // Dùng cho modal "Tạo phơi xe" bên TicketStaff khi CHỌN THEO 4 HƯỚNG CHÍNH (không chọn tuyến):
  //   - label            = nhãn hướng (hiển thị trong dropdown)
  //   - route            = nhãn tuyến "chính" (tuyến đầu tiên theo order) của hướng — chuỗi lưu vào phơi
  //                        để tương thích getRouteSense() + bộ lọc "Tuyến đi"; rỗng route → dùng nhãn hướng
  //   - fromStations     = TỔNG HỢP mọi trạm thuộc (các) địa điểm điểm-đi của hướng
  //   - toStations       = TỔNG HỢP mọi trạm thuộc (các) địa điểm điểm-đến của hướng
  //   - pickupStations   = hợp "trạm có thể nhận thêm khách" của mọi tuyến con
  //   - routeLabels      = mọi nhãn tuyến con (suy ngược hướng từ trip.route của phơi cũ)
  // Địa điểm điểm-đi/điểm-đến suy từ region của trạm trong fromStations/toStations của các tuyến con.
  function buildDirTripCfg() {
    var regionOf = {}, byRegion = {};
    getStations().forEach(function (s) {
      regionOf[s.name] = s.region;
      (byRegion[s.region] = byRegion[s.region] || []).push(s.name);
    });
    var uniq = function (arr) { var seen = {}; return arr.filter(function (x) { return seen[x] ? false : (seen[x] = true); }); };
    var collectRegions = function (regSet) {
      var out = [];
      Object.keys(regSet).forEach(function (rk) { (byRegion[rk] || []).forEach(function (n) { out.push(n); }); });
      return uniq(out);
    };
    var routes = getRoutes();
    var cfg = {};
    getDirections().slice().sort(byOrder).forEach(function (d) {
      if (d.active === false) return;
      var kids = routes.filter(function (r) { return r.directionId === d.id && r.active !== false; }).sort(byOrder);
      var fromReg = {}, toReg = {}, pickup = {}, routeLabels = [];
      kids.forEach(function (r) {
        routeLabels.push(r.label);
        (r.fromStations || []).forEach(function (n) { if (regionOf[n] != null) fromReg[regionOf[n]] = true; });
        (r.toStations || []).forEach(function (n) { if (regionOf[n] != null) toReg[regionOf[n]] = true; });
        (r.pickupStations || []).forEach(function (n) { pickup[n] = true; });
      });
      var main = kids[0] || null;
      cfg[d.id] = {
        label: d.label,
        route: main ? main.label : d.label,
        sense: d.sense === 'di' ? 'di' : 've',
        price: main ? (main.price || 0) : 0,
        doubleSeatPrice: main ? (main.doubleSeatPrice || 0) : 0,
        fromStations: collectRegions(fromReg),
        toStations: collectRegions(toReg),
        pickupStations: uniq(Object.keys(pickup)),
        routeLabels: uniq(routeLabels),
        // Tuyến con thô để TicketStaff suy ra "tuyến chính" sau khi chọn Trạm đi/Trạm đến,
        // rồi hiện đúng "trạm có thể rước" (pickupStations) của tuyến đó.
        routes: kids.map(function (r) {
          return {
            label: r.label,
            price: r.price || 0,
            // Giá vé ghế đôi (nếu tuyến có cấu hình ở Admin > Quản lý giá) — mang theo để TicketStaff
            // hiện được ô tick "Ghế đôi" cạnh giá vé, đổi giá đơn/đôi đúng theo đúng tuyến đang chọn.
            doubleSeatPrice: r.doubleSeatPrice || 0,
            vehicleType: r.vehicleType || '',
            order: r.order || 0,
            fromStations: (r.fromStations || []).slice(),
            toStations: (r.toStations || []).slice(),
            pickupStations: (r.pickupStations || []).slice()
          };
        })
      };
    });
    return cfg;
  }

  // { 'chieu-di': [{label,abbr,price}], 'chieu-ve': [{label,abbr,price}] } — nhóm theo sense của hướng.
  function buildRoutesCfg() {
    var dirById = {};
    getDirections().forEach(function (d) { dirById[d.id] = d; });
    var out = { 'chieu-di': [], 'chieu-ve': [] };
    getDirections().slice().sort(byOrder).forEach(function (d) {
      if (d.active === false) return;
      var bucket = d.sense === 'di' ? out['chieu-di'] : out['chieu-ve'];
      getRoutes()
        .filter(function (r) { return r.directionId === d.id && r.active !== false; })
        .sort(byOrder)
        .forEach(function (r) { bucket.push({ label: r.label, abbr: r.abbr, price: r.price }); });
    });
    return out;
  }

  // { [name]: seats } — shape của VEHICLE_TYPE_SEATS (gộp cả 2 scope; trùng tên = cùng số ghế).
  function vehicleTypeSeats() {
    var m = {};
    getVehicleTypes().forEach(function (v) { m[String(v.name).trim()] = v.seats; });
    return m;
  }

  // 'di' | 've' | null — thay cho route.startsWith('Sài Gòn'). null = tuyến lạ (phơi cũ) → caller tự fallback.
  function getRouteSense(routeLabel) {
    if (!routeLabel) return null;
    var r = getRoutes().find(function (x) { return x.label === routeLabel; });
    if (!r) return null;
    var d = getDirections().find(function (x) { return x.id === r.directionId; });
    return d ? (d.sense === 'di' ? 'di' : 've') : null;
  }

  // 'sg-ag' | 'bd-ag' | 'ag-bd' | 'ag-sg' | null — map nhãn tuyến (chuỗi lưu trong phơi) -> id hướng.
  // Điểm map DUY NHẤT route -> 1 trong 4 hướng cố định. null = tuyến lạ → caller tự fallback theo sense.
  function getRouteDirectionId(routeLabel) {
    if (!routeLabel) return null;
    var r = getRoutes().find(function (x) { return x.label === routeLabel; });
    return r ? (r.directionId || null) : null;
  }

  // Danh sách "Trạm có thể nhận thêm khách" khi tạo phơi = TOÀN BỘ trạm ở phía ĐIỂM ĐẾN của hướng.
  // Quy ước 2 cụm: {An Giang} và {Sài Gòn + Bình Dương}. Hướng kết thúc ở An Giang → mọi trạm An Giang;
  // hướng kết thúc ở Sài Gòn/Bình Dương → mọi trạm Sài Gòn + Bình Dương. Dùng chung TicketStaff + Admin.
  function pickupStationsForDirection(dirId) {
    var stations = getStations();
    var d = getDirections().find(function (x) { return x.id === dirId; });
    var toRegions = {};
    getRoutes()
      .filter(function (r) { return r.directionId === dirId && r.active !== false; })
      .forEach(function (r) {
        (r.toStations || []).forEach(function (n) {
          var st = stations.find(function (s) { return s.name === n; });
          if (st && st.region) toRegions[st.region] = true;
        });
      });
    var arrivesAngiang = !!toRegions['angiang'] || /-ag$/.test(dirId || '') ||
      ((d && d.label) ? /-\s*An Giang\s*$/i.test(d.label) : false);
    var wanted = arrivesAngiang ? { angiang: 1 } : { saigon: 1, binhduong: 1 };
    var seen = {};
    return stations
      .filter(function (s) { return s && wanted[s.region] && !seen[s.name] && (seen[s.name] = true); })
      .map(function (s) { return s.name; });
  }

  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function firstActiveRoute(routes, directionId) {
    var matches = routes.filter(function (r) { return r.directionId === directionId && r.active !== false; }).sort(byOrder);
    return matches[0] || null;
  }

  /* ---------------------------------------------------------
     DEPENDENCY GUARDS — chặn xoá khi còn dữ liệu tham chiếu.
     Đọc thẳng localStorage nên module không phụ thuộc trang.
     --------------------------------------------------------- */
  function allTrips() { return readJSON(HN_TRIPS_KEY, []); }
  function seatBank() { return readJSON(HN_STORAGE_KEY, {}); }
  function manifests() { return readJSON(TS_MANIFESTS_KEY, {}); }
  function shuttleDriverAssigns() { return readJSON(HN_SHUTTLE_DRIVER_KEY, {}); }

  function canDeleteDirection(id) {
    var childRoutes = getRoutes().filter(function (r) { return r.directionId === id; });
    if (childRoutes.length) {
      return { ok: false, reason: 'Hướng còn ' + childRoutes.length + ' tuyến con — xoá/di chuyển các tuyến trước.', count: childRoutes.length };
    }
    var labels = {};
    childRoutes.forEach(function (r) { labels[r.label] = true; });
    var used = allTrips().filter(function (t) { return t && labels[t.route]; }).length;
    if (used) return { ok: false, reason: 'Có ' + used + ' chuyến thuộc hướng này.', count: used };
    return { ok: true, reason: '', count: 0 };
  }

  function canDeleteRoute(id) {
    var r = getRoutes().find(function (x) { return x.id === id; });
    if (!r) return { ok: true, reason: '', count: 0 };
    var used = allTrips().filter(function (t) { return t && t.route === r.label; }).length;
    if (used) return { ok: false, reason: 'Tuyến đang được dùng bởi ' + used + ' chuyến.', count: used };
    return { ok: true, reason: '', count: 0 };
  }

  function canDeleteVehicle(plate) {
    if (!plate) return { ok: true, reason: '', count: 0 };
    var n = 0;
    allTrips().forEach(function (t) { if (t && t.plate === plate) n++; });
    var bank = seatBank();
    Object.keys(bank).forEach(function (k) { if (bank[k] && bank[k].plate === plate) n++; });
    var mf = manifests();
    Object.keys(mf).forEach(function (k) { if (mf[k] && mf[k].plate === plate) n++; });
    if (n) return { ok: false, reason: 'Biển số đang gắn với ' + n + ' chuyến/phơi.', count: n };
    return { ok: true, reason: '', count: 0 };
  }

  function canDeleteStaff(nameOrCode) {
    if (!nameOrCode) return { ok: true, reason: '', count: 0 };
    var target = String(nameOrCode);
    var n = 0;
    var bank = seatBank();
    Object.keys(bank).forEach(function (k) {
      var b = bank[k];
      if (!b) return;
      if (b.driver === target || b.helper === target) n++;
    });
    var mf = manifests();
    Object.keys(mf).forEach(function (k) {
      var m = mf[k];
      if (!m) return;
      if (m.driver === target || m.helper === target || m.createdBy === target) n++;
    });
    var sda = shuttleDriverAssigns();
    Object.keys(sda).forEach(function (k) { if (sda[k] && sda[k].driverName === target) n++; });
    if (STAFF_CODE_MAP_HAS(target)) return { ok: false, reason: 'Nhân viên nằm trong bảng mã STAFF_CODE_MAP — không xoá.', count: 1 };
    if (n) return { ok: false, reason: 'Nhân viên đang được phân công ở ' + n + ' chuyến/phơi.', count: n };
    return { ok: true, reason: '', count: 0 };
  }

  // STAFF_CODE_MAP khai báo ở constants.js (không nạp ở shuttle) — kiểm tra mềm.
  function STAFF_CODE_MAP_HAS(v) {
    try {
      if (typeof STAFF_CODE_MAP === 'undefined' || !STAFF_CODE_MAP) return false;
      return Object.keys(STAFF_CODE_MAP).indexOf(v) !== -1 || Object.keys(STAFF_CODE_MAP).some(function (k) { return STAFF_CODE_MAP[k] === v; });
    } catch (e) { return false; }
  }

  /* ---------------------------------------------------------
     ACTIVITY LOG
     --------------------------------------------------------- */
  function currentUserName() {
    try {
      var u = JSON.parse(sessionStorage.getItem(HN_CURRENT_USER_KEY) || 'null');
      return (u && (u.username || u.roleLabel)) || 'không rõ';
    } catch (e) { return 'không rõ'; }
  }

  function log(e) {
    e = e || {};
    pushActivity({
      ts: Date.now(),
      user: currentUserName(),
      action: e.action || '',
      entity: e.entity || '',
      entityId: e.entityId != null ? String(e.entityId) : '',
      summary: e.summary || '',
      before: e.before != null ? e.before : undefined,
      after: e.after != null ? e.after : undefined
    });
  }

  /* ---------------------------------------------------------
     SEED khi nạp + export
     --------------------------------------------------------- */
  seedAll();
  mergeSeedStations();
  mergeSeedRouteStations();

  window.FleetStore = {
    KEYS: {
      directions: HN_DIRECTIONS_KEY,
      routes: HN_ROUTES_KEY,
      stations: HN_STATIONS_KEY,
      vehicleTypes: HN_VEHICLE_TYPES_KEY,
      vehicles: HN_VEHICLES_KEY,
      staff: HN_STAFF_KEY,
      activity: HN_ADMIN_ACTIVITY_KEY,
      recruitment: HN_RECRUITMENT_KEY
    },
    getDirections: getDirections,
    setDirections: setDirections,
    getRoutes: getRoutes,
    setRoutes: setRoutes,
    getStations: getStations,
    setStations: setStations,
    getMainStations: getMainStations,
    setMainStations: setMainStations,
    getSubStations: getSubStations,
    setSubStations: setSubStations,
    getStopStations: getStopStations,
    setStopStations: setStopStations,
    addMainStation: addMainStation,
    updateMainStation: updateMainStation,
    removeMainStation: removeMainStation,
    addSubStation: addSubStation,
    updateSubStation: updateSubStation,
    removeSubStation: removeSubStation,
    addStopStation: addStopStation,
    updateStopStation: updateStopStation,
    removeStopStation: removeStopStation,
    addStation: addStation,
    addStationFull: addStationFull,
    updateStation: updateStation,
    removeStation: removeStation,
    stationUsage: stationUsage,
    getVehicleTypes: getVehicleTypes,
    setVehicleTypes: setVehicleTypes,
    getVehicles: getVehicles,
    setVehicles: setVehicles,
    getStaff: getStaff,
    setStaff: setStaff,
    getStaffRoles: getStaffRoles,
    setStaffRoles: setStaffRoles,
    addStaffRole: addStaffRole,
    updateStaffRole: updateStaffRole,
    removeStaffRole: removeStaffRole,
    getActivity: getActivity,
    pushActivity: pushActivity,
    getRecruitmentPosts: getRecruitmentPosts,
    setRecruitmentPosts: setRecruitmentPosts,
    addRecruitmentPost: addRecruitmentPost,
    updateRecruitmentPost: updateRecruitmentPost,
    removeRecruitmentPost: removeRecruitmentPost,
    buildTripDirectionsCfg: buildTripDirectionsCfg,
    buildDirTripCfg: buildDirTripCfg,
    buildRoutesCfg: buildRoutesCfg,
    vehicleTypeSeats: vehicleTypeSeats,
    getRouteSense: getRouteSense,
    getRouteDirectionId: getRouteDirectionId,
    pickupStationsForDirection: pickupStationsForDirection,
    canDeleteDirection: canDeleteDirection,
    canDeleteRoute: canDeleteRoute,
    canDeleteVehicle: canDeleteVehicle,
    canDeleteStaff: canDeleteStaff,
    log: log,
    // Cho phép Admin "Khôi phục mặc định": xoá các key cấu hình rồi seed lại.
    resetToSeed: function () {
      [HN_DIRECTIONS_KEY, HN_ROUTES_KEY, HN_STATIONS_KEY, HN_VEHICLE_TYPES_KEY, HN_VEHICLES_KEY, HN_STAFF_KEY, HN_STAFF_ROLES_KEY, HN_RECRUITMENT_KEY].forEach(function (k) {
        localStorage.removeItem(k);
      });
      seedAll();
    },
    _seedLiterals: {
      directions: SEED_DIRECTIONS, routes: SEED_ROUTES, stations: SEED_STATIONS,
      vehicleTypes: SEED_VEHICLE_TYPES, vehicles: SEED_VEHICLES, staff: SEED_STAFF
    }
  };
})();
