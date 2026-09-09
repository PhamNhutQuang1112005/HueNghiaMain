// src/data/sample-seat-pool.js — Pool dữ liệu MẪU để sinh ghế demo trên phơi xe.
// Tách khỏi đầu js/ticketstaff.js (Phase C). Nạp bằng <script> thường TRƯỚC seat-bank.js
// và ticketstaff.js trong ticketstaff.html — makeSeat() (ticketstaff.js) và
// generateTripSeatPlanForVehicleType() (seat-bank.js) đọc các mảng này qua biến global như cũ.
// Không phụ thuộc file nào khác. Sau này thay bằng API => xoá file này khỏi ticketstaff.html.

const staffList = ["tuyetphuong.huenghia", "minh.tran", "nguyen.long", "thi.hoa"];
// Trạm đi/đến demo — khớp danh mục trạm FleetStore (SG + BD phía xuất phát, An Giang phía điểm đến).
const stopsFirst = [
  "508 Kinh Dương Vương", "58 Lê Đại Hành", "4 Tống Văn Trân", "Bến xe miền Tây quầy 29",
  "Sài Gòn", "Tiền Giang", "Vĩnh Long", "Đồng Tháp",
  "Trạm An Phú", "Bến xe An Phú", "Trạm Bến Cát", "Trạm Phú Chánh", "Trạm Tân Uyên",
  "Trạm An Tây", "Trạm Bình Phước", "Trạm An Sương", "Bình Dương"
];
const stopsLast = [
  "Trạm An Giang", "Trạm Sa Đéc", "Trạm Long Xuyên", "Trạm Vịnh Tre", "Trạm Châu Đốc",
  "Trạm An Phú", "Trạm Tri Tôn", "Trạm Chi Lăng", "Trạm Tịnh Biên", "Trạm Nhà Bàng",
  "Trạm Tân Châu", "Trạm Núi Sập", "Trạm Hà Tiên", "Trạm Long Bình", "Trạm Đồng Ky",
  "Trạm Bắc Đai", "Trạm Vĩnh Hội Đông", "Trạm Cần Thảo", "Trạm Cái Dầu", "Trạm Năng Gù",
  "Trạm Bình Hòa", "Trạm Châu Thành", "Trạm Cần Đăng", "Trạm Phú Hòa", "Trạm Óc Eo",
  "Trạm An Hòa", "Trạm Cựu Hội", "Trạm Ba Chúc", "Trạm Lạc Quới", "Trạm Giang Thành",
  "Trạm Tân An - Tân Châu"
];
const noteSamples = ["", "Khách quen, hay đi ghế gần cửa", "Yêu cầu ghế tầng dưới", "Có trẻ nhỏ đi cùng", ""];
// Danh sách Khách hàng mẫu & Số điện thoại mẫu (50 profiles độc nhất)
const nameSamples = [
  "Nguyễn Văn An", "Trần Thị Mai", "Lê Hoàng Nam", "Phạm Thùy Linh",
  "Võ Minh Khoa", "Huỳnh Ngọc Ánh", "Đặng Quốc Huy", "Bùi Thảo Vy",
  "Nguyễn Thanh Tùng", "Lý Thị Hồng", "Cao Văn Đức", "Trương Minh Tuấn",
  "Đỗ Thị Bích", "Phan Văn Cường", "Hồ Thanh Hải", "Dương Quốc Bảo",
  "Ngô Thị Yến", "Trịnh Văn Lâm", "Đinh Thị Hoa", "Mai Văn Hùng",
  "Lâm Thị Ngọc", "Hoàng Văn Thái", "Vũ Thị Kim", "Đoàn Văn Lộc",
  "Tạ Thị Thu", "Quách Văn Sang", "Đặng Thị Nga", "Bùi Văn Tâm",
  "Nguyễn Thị Tuyết", "Trần Văn Phát", "Lê Thị Thắm", "Phạm Văn Sơn",
  "Võ Thị Diệu", "Huỳnh Văn Quyền", "Cao Thị Hạnh", "Trương Văn Khang",
  "Lý Văn Tấn", "Phan Thị Thảo", "Đỗ Văn Nghĩa", "Hồ Thị Phượng",
  "Dương Văn Kiên", "Ngô Thị Vân", "Trịnh Văn Trung", "Đinh Văn Phong",
  "Mai Thị Loan", "Lâm Văn Phú", "Hoàng Thị Trinh", "Vũ Văn Quý",
  "Đoàn Thị Trúc", "Tạ Văn Vinh"
];
const phonePool = [
  "0809123456", "0912345678", "0933778899", "0987654321",
  "0809654321", "0901234567", "0966998877", "0913579246",
  "0938001122", "0989112233", "0908771122", "0967345678",
  "0903112233", "0918223344", "0927334455", "0936445566",
  "0945556677", "0954667788", "0963778899", "0972889900",
  "0981990011", "0909001122", "0917112233", "0926223344",
  "0935334455", "0944445566", "0953556677", "0962667788",
  "0971778899", "0980889900", "0908990011", "0916001122",
  "0925112233", "0934223344", "0943334455", "0952445566",
  "0961556677", "0970667788", "0989778899", "0907889900",
  "0915990011", "0924001122", "0933112244", "0942223355",
  "0951334466", "0960445577", "0979556688", "0988667799",
  "0906778800", "0914889911"
];
const pickupTimes = ["07:00", "08:30", "10:00", "13:15", "15:30", "17:00"];
