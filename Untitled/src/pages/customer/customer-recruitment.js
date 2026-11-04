// src/pages/customer/customer-recruitment.js — Trang "Tuyển dụng" (tuyen-dung.html).
// CHỈ ĐỌC danh sách bài tuyển dụng qua getRecruitmentPosts() (shared/js/recruitment-data.js, Admin >
// Nhân sự > "Thông báo tuyển dụng" là nơi CRUD dữ liệu này — xem admin-recruitment.js). Trang này không
// ghi gì vào localStorage cả.
// Nạp SAU storage-keys.js + recruitment-data.js.

let CR_CATEGORY = 'office';

function crEscapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function crFormatDate(iso) {
  if (!iso || typeof iso !== 'string') return '—';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

// Placeholder khi bài chưa gắn ảnh (Admin chưa upload) — khung gradient + icon loa tuyển dụng, tránh để
// trống trơn nhìn như ảnh hỏng.
function crImageBlock(post, className) {
  if (post.image) return `<img src="${crEscapeHtml(post.image)}" alt="">`;
  return `<div class="${className}-placeholder">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
  </div>`;
}

function crCardHtml(post) {
  return `<article class="cust-recruit-card" data-post-id="${crEscapeHtml(post.id)}" tabindex="0" role="button">
    <div class="cust-recruit-card-img">${crImageBlock(post, 'cust-recruit-card-img')}</div>
    <div class="cust-recruit-card-body">
      <h3 class="cust-recruit-card-title">${crEscapeHtml(post.title)}</h3>
      <p class="cust-recruit-card-desc">${crEscapeHtml(post.excerpt || '')}</p>
      <div class="cust-recruit-row-date"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${crFormatDate(post.date)}</div>
    </div>
  </article>`;
}

function crRowHtml(post) {
  return `<article class="cust-recruit-row" data-post-id="${crEscapeHtml(post.id)}" tabindex="0" role="button">
    <div class="cust-recruit-row-thumb">${crImageBlock(post, 'cust-recruit-row-thumb')}</div>
    <div class="cust-recruit-row-body">
      <h4 class="cust-recruit-row-title">${crEscapeHtml(post.title)}</h4>
      <div class="cust-recruit-row-date"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${crFormatDate(post.date)}</div>
    </div>
  </article>`;
}

function crRenderList() {
  const all = (typeof getRecruitmentPosts === 'function' ? getRecruitmentPosts() : [])
    .filter((p) => p && p.active !== false && p.category === CR_CATEGORY)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const featuredEl = document.getElementById('recruitFeatured');
  const listEl = document.getElementById('recruitList');
  const emptyEl = document.getElementById('recruitEmpty');
  const featuredTitleEl = document.getElementById('recruitFeaturedTitle');
  const listTitleEl = document.getElementById('recruitListTitle');
  if (!featuredEl || !listEl || !emptyEl) return;

  if (!all.length) {
    featuredEl.innerHTML = '';
    listEl.innerHTML = '';
    if (featuredTitleEl) featuredTitleEl.style.display = 'none';
    if (listTitleEl) listTitleEl.style.display = 'none';
    emptyEl.style.display = '';
    return;
  }
  emptyEl.style.display = 'none';

  // "Tin nổi bật" = các bài Admin tự tick cờ featured (không phải cứ mới nhất là nổi bật); "Tất cả" luôn
  // liệt kê ĐỦ mọi bài đang hiển thị của khối này, kể cả những bài đã nằm trong "Tin nổi bật" ở trên —
  // giống báo thật (bài nổi bật vẫn có mặt trong danh sách đầy đủ bên dưới), không phải phần còn lại.
  const featured = all.filter((p) => p.featured);
  featuredEl.innerHTML = featured.map(crCardHtml).join('');
  listEl.innerHTML = all.map(crRowHtml).join('');
  if (featuredTitleEl) featuredTitleEl.style.display = featured.length ? '' : 'none';
  if (listTitleEl) listTitleEl.style.display = '';

  document.querySelectorAll('#recruitFeatured .cust-recruit-card, #recruitList .cust-recruit-row').forEach((el) => {
    el.addEventListener('click', () => crGoToDetail(el.dataset.postId));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); crGoToDetail(el.dataset.postId); }
    });
  });
}

// Bấm vào 1 bài → sang trang riêng dạng bài báo (tuyen-dung-chi-tiet.html?id=..., xem
// customer-recruitment-detail.js) thay vì mở modal — khớp cách hiển thị tin tuyển dụng thật (trang riêng
// có sidebar "Tuyển dụng xem nhiều"), không phải popup ngắn.
function crGoToDetail(postId) {
  window.location.href = 'tuyen-dung-chi-tiet.html?id=' + encodeURIComponent(postId);
}

function crWireTabs() {
  const tabs = document.getElementById('recruitTabs');
  if (!tabs) return;
  tabs.querySelectorAll('.cust-recruit-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === CR_CATEGORY);
    btn.addEventListener('click', () => {
      CR_CATEGORY = btn.dataset.category === 'driver' ? 'driver' : 'office';
      tabs.querySelectorAll('.cust-recruit-tab').forEach((b) => b.classList.toggle('active', b === btn));
      crRenderList();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Sang từ trang chi tiết (tuyen-dung-chi-tiet.html) bấm nút khối → giữ đúng khối đó khi về lại danh
  // sách, thay vì luôn rơi về "Khối văn phòng" mặc định.
  const catParam = new URLSearchParams(window.location.search).get('cat');
  if (catParam === 'driver' || catParam === 'office') CR_CATEGORY = catParam;
  crWireTabs();
  crRenderList();
});
