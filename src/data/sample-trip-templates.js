// src/data/sample-trip-templates.js — Dữ liệu MẪU: các "phơi mẫu" cố định (isTemplate:true).
// Tách khỏi js/shared/constants.js (Phase C). Chỉ ticketstaff.js đọc (defaultTripsMeta fallback
// khi localStorage trống) — nạp trước ticketstaff.js trong ticketstaff.html. Không nạp ở admin.html.
// Tự chứa (todayStr__constants nằm luôn trong file này). Sau này thay bằng API => xoá khỏi HTML.
//
// Tuyến (`route`) dùng đúng nhãn 4 HƯỚNG CỐ ĐỊNH của FleetStore (fleet-store.js SEED_DIRECTIONS):
//   Sài Gòn - An Giang · Bình Dương - An Giang · An Giang - Bình Dương · An Giang - Sài Gòn
// Tên biến DEFAULT_SGCD_TRIPS / DEFAULT_CDSG_TRIPS giữ nguyên (chỉ ticketstaff.js:loadAllTrips dùng).

const todayStr__constants = new Date().toISOString().split("T")[0];

// isTemplate:true đánh dấu đây là "phơi mẫu" cố định dùng cho chế độ chọn mẫu tạo hàng loạt (xem
// toggleBulkTemplateMode() trong ticketstaff.js — tính năng Phơi xe trước đây ở callcenter.js, đã
// chuyển hẳn sang ticketstaff.js) — phơi tạo mới (đơn lẻ hay hàng loạt) KHÔNG có cờ này
// nên không lẫn vào danh sách mẫu, dù được thêm vào allTripsMeta chung với các phơi mẫu.
const DEFAULT_SGCD_TRIPS = [
  { id: '1', name: 'Sài Gòn - An Giang - Xuất bến VP Q.5', time: '07:00', route: 'Sài Gòn - An Giang', plate: '', vehicleType: 'Limousine 24 Phòng', date: todayStr__constants, price: 280000, status: 'Chưa chỉ định xe', note: 'Xuất bến VP Q.5 - Tải 24 phòng VIP', isTemplate: true },
  { id: '2', name: 'Sài Gòn - An Giang - Chạy bến An Sương', time: '08:30', route: 'Sài Gòn - An Giang', plate: '', vehicleType: 'Giường nằm 34 chỗ', date: todayStr__constants, price: 250000, status: 'Chưa chỉ định xe', note: 'Chạy bến An Sương - Đón dọc QL22', isTemplate: true },
  { id: '3', name: 'Sài Gòn - An Giang - Chuyến sáng trung tâm', time: '10:00', route: 'Sài Gòn - An Giang', plate: '', vehicleType: 'Limousine 24 Phòng', date: todayStr__constants, price: 280000, status: 'Chưa chỉ định xe', note: 'Chuyến sáng trung tâm - Đã mở bán', isTemplate: true },
  { id: '4', name: 'Sài Gòn - An Giang - Tăng cường xe 45 chỗ', time: '13:15', route: 'Sài Gòn - An Giang', plate: '', vehicleType: 'Ghế ngồi 45 chỗ', date: todayStr__constants, price: 180000, status: 'Chưa chỉ định xe', note: 'Tăng cường xe 45 chỗ - Rước Kinh Dương Vương', isTemplate: true },
  { id: '5', name: 'Sài Gòn - An Giang - Tuyến cố định chiều', time: '15:30', route: 'Sài Gòn - An Giang', plate: '', vehicleType: 'Limousine 24 Phòng', date: todayStr__constants, price: 280000, status: 'Chưa chỉ định xe', note: 'Tuyến cố định chiều - Đón khách VP Q5', isTemplate: true },
  { id: '6', name: 'Sài Gòn - An Giang - Chuyến chiều tối', time: '17:00', route: 'Sài Gòn - An Giang', plate: '', vehicleType: 'Giường nằm 34 chỗ', date: todayStr__constants, price: 250000, status: 'Chưa chỉ định xe', note: 'Chuyến chiều tối - Xe giường nằm 34 chỗ', isTemplate: true },
];

const DEFAULT_CDSG_TRIPS = [
  { id: '7', name: 'An Giang - Sài Gòn - Xuất bến sớm', time: '06:00', route: 'An Giang - Sài Gòn', plate: '', vehicleType: 'Limousine 24 Phòng', date: todayStr__constants, price: 280000, status: 'Chưa chỉ định xe', note: 'Xuất bến sớm - Trả Q.5 & An Sương', isTemplate: true },
  { id: '8', name: 'An Giang - Sài Gòn - Chuyến sáng', time: '09:15', route: 'An Giang - Sài Gòn', plate: '', vehicleType: 'Giường nằm 34 chỗ', date: todayStr__constants, price: 250000, status: 'Chưa chỉ định xe', note: 'Chuyến sáng - Trung chuyển tận nơi', isTemplate: true },
  { id: '9', name: 'An Giang - Sài Gòn - Tuyến cố định rước khách', time: '14:00', route: 'An Giang - Sài Gòn', plate: '', vehicleType: 'Limousine 24 Phòng', date: todayStr__constants, price: 280000, status: 'Chưa chỉ định xe', note: 'Tuyến cố định rước khách dọc đường', isTemplate: true },
  { id: '10', name: 'An Giang - Sài Gòn - Chuyến đêm Limousine VIP', time: '21:00', route: 'An Giang - Sài Gòn', plate: '', vehicleType: 'Giường nằm 34 chỗ', date: todayStr__constants, price: 250000, status: 'Chưa chỉ định xe', note: 'Chuyến đêm Limousine VIP - Chạy thẳng Sài Gòn', isTemplate: true },
];

// Phơi mẫu bổ sung — trạm đi/đến/trạm đón lấy từ danh mục trạm FleetStore (SG: "508 Kinh Dương Vương"...
// / AG: "Trạm Long Xuyên"...) để nút "Bán vé"/lộ trình hoạt động đúng khi nhân bản.
const DEFAULT_EXTRA_TEMPLATE_TRIPS = [
  { id: '11', name: 'Sài Gòn - An Giang - Chuyến sáng cao tốc', time: '09:00', route: 'Sài Gòn - An Giang', plate: '', vehicleType: 'Giường nằm 34 chỗ', date: todayStr__constants, price: 150000, status: 'Chưa chỉ định xe', note: 'Chuyến sáng cao tốc', fromStation: '508 Kinh Dương Vương', toStation: 'Trạm Long Xuyên', pickupStations: [], isTemplate: true },
  { id: '12', name: 'An Giang - Sài Gòn - Chuyến trưa về SG', time: '13:00', route: 'An Giang - Sài Gòn', plate: '', vehicleType: 'Limousine 24 Phòng', date: todayStr__constants, price: 150000, status: 'Chưa chỉ định xe', note: 'Chuyến trưa về SG - Xuất bến Long Xuyên', fromStation: 'Trạm Long Xuyên', toStation: '508 Kinh Dương Vương', pickupStations: [], isTemplate: true },
  { id: '13', name: 'Sài Gòn - An Giang - Chuyến trưa miền Tây', time: '11:00', route: 'Sài Gòn - An Giang', plate: '', vehicleType: 'Ghế ngồi 45 chỗ', date: todayStr__constants, price: 180000, status: 'Chưa chỉ định xe', note: 'Chuyến trưa miền Tây', fromStation: 'Bến xe miền Tây quầy 29', toStation: 'Trạm Châu Đốc', pickupStations: [], isTemplate: true },
  { id: '14', name: 'An Giang - Sài Gòn - Chuyến chiều về SG', time: '16:00', route: 'An Giang - Sài Gòn', plate: '', vehicleType: 'Giường nằm 34 chỗ', date: todayStr__constants, price: 180000, status: 'Chưa chỉ định xe', note: 'Chuyến chiều về SG - Xuất bến Châu Đốc', fromStation: 'Trạm Châu Đốc', toStation: 'Bến xe miền Tây quầy 29', pickupStations: [], isTemplate: true },
];
