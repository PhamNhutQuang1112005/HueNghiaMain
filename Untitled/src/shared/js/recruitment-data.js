/* =========================================================
   RECRUITMENT-DATA.JS — Dữ liệu "Thông báo tuyển dụng" dùng chung
   Nhà Xe Huệ Nghĩa

   Admin (admin.html > Nhân sự > "Thông báo tuyển dụng", admin-recruitment.js) CRUD danh sách này;
   trang khách hàng (customer/tuyen-dung.html, customer-recruitment.js) CHỈ ĐỌC để hiển thị theo khối
   (Khối văn phòng / Lái xe tuyến). Cả 2 script đó gọi qua getRecruitmentPosts()/saveRecruitmentPosts()
   ở file này thay vì đụng thẳng localStorage, để đổi shape dữ liệu sau này chỉ sửa 1 chỗ.

   Nạp bằng thẻ <script> thường, NGAY SAU js/shared/storage-keys.js (dùng chung hằng
   HN_RECRUITMENT_POSTS_KEY) và TRƯỚC admin-recruitment.js / customer-recruitment.js.

   Mỗi bài tuyển dụng: { id, title, category: 'office'|'driver', excerpt, content, image (data URL hoặc
   rỗng — chưa có ảnh thì trang khách hàng tự hiện khung placeholder), date: 'YYYY-MM-DD', active,
   featured (Admin tự tick "Tin nổi bật" — khối "Tin nổi bật" ở trang khách hàng CHỈ hiện các bài có cờ
   này, khối "Tất cả" luôn hiện MỌI bài đang active bất kể featured, xem customer-recruitment.js). }.
   ========================================================= */

// Seed demo — id cố định để sửa/xoá lặp lại được trong lúc test, không phải dữ liệu thật của HR.
var DEFAULT_RECRUITMENT_POSTS = [
  {
    id: 'rc_seed_1', category: 'office',
    title: 'Tuyển nhân viên phòng vé — Chi nhánh Sài Gòn',
    excerpt: 'Nhà Xe Huệ Nghĩa cần tuyển nhân viên bán vé/tư vấn khách hàng làm việc tại quầy vé 508 Kinh Dương Vương, ưu tiên có kinh nghiệm ngành vận tải hành khách.',
    content: 'Mô tả công việc: bán vé, tư vấn lộ trình, xử lý đặt chỗ qua điện thoại/tổng đài, phối hợp điều hành phơi xe.\nYêu cầu: tốt nghiệp THPT trở lên, giao tiếp tốt, sử dụng thành thạo máy tính văn phòng, ưu tiên biết Excel.\nQuyền lợi: lương thoả thuận theo năng lực, thưởng doanh số, BHXH đầy đủ theo quy định.\nLiên hệ: Phòng Hành chính - Nhân sự, hotline 1900 6067.',
    image: '', date: '2026-09-10', active: true, featured: true
  },
  {
    id: 'rc_seed_2', category: 'office',
    title: 'Tuyển kế toán nội bộ — Ưu tiên có kinh nghiệm ngành vận tải',
    excerpt: 'Cần tuyển kế toán tổng hợp làm việc tại văn phòng, phụ trách thu chi, đối soát doanh thu các trạm/tuyến.',
    content: 'Mô tả công việc: hạch toán thu chi hàng ngày, đối soát doanh thu vé theo tuyến/trạm, lập báo cáo tài chính định kỳ.\nYêu cầu: tốt nghiệp Cao đẳng/Đại học chuyên ngành Kế toán, tối thiểu 1 năm kinh nghiệm.\nQuyền lợi: lương thoả thuận, xét tăng lương định kỳ, môi trường làm việc ổn định lâu dài.\nLiên hệ: Phòng Hành chính - Nhân sự, hotline 1900 6067.',
    image: '', date: '2026-09-05', active: true
  },
  {
    id: 'rc_seed_3', category: 'office',
    title: 'Tuyển nhân viên tổng đài chăm sóc khách hàng',
    excerpt: 'Trực tổng đài tiếp nhận đặt vé, tra cứu vé, hỗ trợ khách hàng qua điện thoại và Zalo.',
    content: 'Mô tả công việc: tiếp nhận cuộc gọi/tin nhắn đặt vé, tra cứu vé, giải đáp thắc mắc, ghi nhận phản hồi khách hàng.\nYêu cầu: giọng nói rõ ràng, kiên nhẫn, có thể làm ca (bao gồm cuối tuần).\nQuyền lợi: lương cứng + phụ cấp ca, đào tạo nghiệp vụ từ đầu.\nLiên hệ: Phòng Hành chính - Nhân sự, hotline 1900 6067.',
    image: '', date: '2026-08-28', active: true, featured: true
  },
  {
    id: 'rc_seed_4', category: 'office',
    title: 'Tuyển nhân viên điều hành bến xe — Trạm Long Xuyên',
    excerpt: 'Điều phối phơi xe, xếp tài, giám sát giờ xuất bến tại trạm Long Xuyên, An Giang.',
    content: 'Mô tả công việc: điều phối phơi xe theo lịch, xếp tài xế/phụ xe, giám sát giờ xuất bến, phối hợp phòng vé xử lý phát sinh.\nYêu cầu: nắm rõ địa bàn An Giang, có khả năng xử lý tình huống, ưu tiên từng làm điều hành bến xe.\nQuyền lợi: lương thoả thuận theo năng lực, phụ cấp trách nhiệm.\nLiên hệ: Phòng Hành chính - Nhân sự, hotline 1900 6067.',
    image: '', date: '2026-08-20', active: true
  },
  {
    id: 'rc_seed_5', category: 'driver',
    title: 'Tuyển tài xế chạy tuyến Sài Gòn — An Giang, lương 15-20 triệu/tháng',
    excerpt: 'Cần tuyển tài xế bằng D/E chạy tuyến cố định Sài Gòn — Long Xuyên/Châu Đốc, thu nhập ổn định.',
    content: 'Mô tả công việc: lái xe khách chạy đúng tuyến/lịch trình được phân công, đảm bảo an toàn và giờ giấc.\nYêu cầu: bằng lái hạng D/E còn hạn, có kinh nghiệm chạy tuyến cố định, lý lịch rõ ràng.\nQuyền lợi: thu nhập 15-20 triệu/tháng tuỳ hiệu suất, thưởng an toàn, hỗ trợ ăn nghỉ dọc tuyến.\nLiên hệ: Phòng Hành chính - Nhân sự, hotline 1900 6067 (Zalo).',
    image: '', date: '2026-09-12', active: true, featured: true
  },
  {
    id: 'rc_seed_6', category: 'driver',
    title: 'Tuyển tài xế trung chuyển nội thành — Có xe đưa đón',
    excerpt: 'Chạy trung chuyển đón/trả khách nội thành TP.HCM ra bến xe chính, xe công ty, không cần góp vốn mua xe.',
    content: 'Mô tả công việc: đón/trả khách tại các điểm hẹn nội thành, đưa ra trạm chính đúng giờ xe xuất bến.\nYêu cầu: bằng lái hạng B2 trở lên, thông thạo đường TP.HCM.\nQuyền lợi: lương + phụ cấp theo chuyến, xe công ty cấp, đóng BHXH.\nLiên hệ: Phòng Hành chính - Nhân sự, hotline 1900 6067.',
    image: '', date: '2026-09-02', active: true, featured: true
  },
  {
    id: 'rc_seed_7', category: 'driver',
    title: 'Tuyển phụ xe tuyến cố định — Bao ăn ở',
    excerpt: 'Hỗ trợ tài xế trên các chuyến chạy tuyến cố định, bao ăn ở dọc tuyến, không yêu cầu kinh nghiệm.',
    content: 'Mô tả công việc: hỗ trợ hành khách lên/xuống, xếp hành lý, phối hợp tài xế đảm bảo an toàn chuyến đi.\nYêu cầu: sức khoẻ tốt, chịu được lịch trình đường dài, không yêu cầu kinh nghiệm (được đào tạo).\nQuyền lợi: lương + phụ cấp theo chuyến, bao ăn ở dọc tuyến.\nLiên hệ: Phòng Hành chính - Nhân sự, hotline 1900 6067.',
    image: '', date: '2026-08-15', active: true
  }
];

function rcReadPosts() {
  try {
    var raw = localStorage.getItem(HN_RECRUITMENT_POSTS_KEY);
    if (raw === null) return DEFAULT_RECRUITMENT_POSTS.slice();
    var val = JSON.parse(raw);
    return Array.isArray(val) ? val : DEFAULT_RECRUITMENT_POSTS.slice();
  } catch (e) {
    console.warn('[RecruitmentData] đọc lỗi', e);
    return DEFAULT_RECRUITMENT_POSTS.slice();
  }
}

function rcWritePosts(list) {
  try {
    localStorage.setItem(HN_RECRUITMENT_POSTS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch (e) {
    console.error('[RecruitmentData] ghi lỗi', e);
  }
}

function getRecruitmentPosts() { return rcReadPosts(); }
function saveRecruitmentPosts(list) { rcWritePosts(list); }
