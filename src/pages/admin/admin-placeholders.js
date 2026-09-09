/* =========================================================
   CÁC MÀN HÌNH CHƯA TRIỂN KHAI trong nhóm "Quản lý vận tải" — để trống làm sau theo yêu cầu, chỉ
   dựng khung view + thông báo, chưa có CRUD/dữ liệu thật.
   ========================================================= */
function renderComingSoon(title, desc) {
  return '<div class="grid-empty" style="min-height:320px;">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>' +
    '<p style="font-weight:800;font-size:14px;color:var(--text-main);">' + esc(title) + '</p>' +
    '<p>' + esc(desc) + '</p>' +
  '</div>';
}

function renderStopsView() {
  $('viewStops').innerHTML = renderComingSoon('Điểm dừng', 'Danh sách các điểm có thể rước theo trạm — tính năng sẽ có ở bản cập nhật sau.');
}

function renderPricingView() {
  $('viewPricing').innerHTML = renderComingSoon('Quản lý giá', 'Bảng giá vé theo trạm đi — trạm đến — tính năng sẽ có ở bản cập nhật sau.');
}

