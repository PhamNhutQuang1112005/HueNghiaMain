// src/pages/customer/customer-recruitment-detail.js — Trang chi tiết 1 bài tuyển dụng
// (tuyen-dung-chi-tiet.html?id=...), dạng bài báo: nội dung đầy đủ bên trái + sidebar "Tuyển dụng xem
// nhiều" bên phải. CHỈ ĐỌC qua getRecruitmentPosts() (shared/js/recruitment-data.js) — không ghi gì.
// Nạp SAU storage-keys.js + recruitment-data.js.

const CRD_CATEGORY_LABEL = { office: 'Khối văn phòng', driver: 'Lái xe tuyến' };
const CRD_ASIDE_LIMIT = 6;

function crdEscapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function crdFormatDate(iso) {
  if (!iso || typeof iso !== 'string') return '—';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function crdImageBlock(post, className) {
  if (post.image) return `<img src="${crdEscapeHtml(post.image)}" alt="">`;
  return `<div class="${className}-placeholder">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
  </div>`;
}

function crdDateIconSvg() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
}

// Admin soạn "Nội dung chi tiết" bằng CKEditor 5 (admin-recruitment.js) nên post.content giờ là HTML thật
// (ví dụ "<p>..</p><ul><li>..</li></ul>") — dùng thẳng, KHÔNG escape (nội dung do nhân sự nội bộ nhập,
// cùng mức tin cậy như mọi dữ liệu Admin khác hiển thị cho khách). Bài cũ trước khi có trình soạn thảo
// rich text chỉ là text thường ngăn cách bằng "\n" (không có thẻ HTML) — vẫn nhận ra và tách đoạn như cũ
// để không vỡ layout.
function crdContentHtml(raw) {
  const text = (raw || '').trim();
  if (!text) return '<p>Chưa có nội dung chi tiết.</p>';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text.split('\n').filter((line) => line.trim()).map((line) => `<p>${crdEscapeHtml(line)}</p>`).join('');
}

function crdCurrentPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '';
}

// 2 nút khối trên cùng vẫn hiện ở trang chi tiết (không phải chỉ trang danh sách) — bấm vào đưa về
// tuyen-dung.html đúng khối đó (xem crWireTabs() đọc ?cat= ở customer-recruitment.js), còn khối của
// CHÍNH bài đang xem được tô đậm sẵn để biết đang ở khối nào.
function crdWireTabs(activeCategory) {
  const tabs = document.getElementById('recruitTabs');
  if (!tabs) return;
  tabs.querySelectorAll('.cust-recruit-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === activeCategory);
    btn.addEventListener('click', () => {
      window.location.href = 'tuyen-dung.html?cat=' + encodeURIComponent(btn.dataset.category);
    });
  });
}

function crdAsideItemHtml(post) {
  return `<article class="cust-article-aside-item" data-post-id="${crdEscapeHtml(post.id)}" tabindex="0" role="button">
    <div class="cust-article-aside-thumb">${crdImageBlock(post, 'cust-article-aside-thumb')}</div>
    <h4 class="cust-article-aside-title">${crdEscapeHtml(post.title)}</h4>
  </article>`;
}

function crdRenderAside(root, allActive, currentId) {
  const others = allActive.filter((p) => p.id !== currentId).slice(0, CRD_ASIDE_LIMIT);
  const itemsHtml = others.length
    ? others.map(crdAsideItemHtml).join('')
    : '<div class="cust-article-aside-empty">Chưa có bài tuyển dụng khác.</div>';

  const aside = document.createElement('aside');
  aside.className = 'cust-article-aside';
  aside.innerHTML = `
    <div class="cust-article-aside-card">
      <div class="cust-article-aside-head">Tuyển dụng xem nhiều</div>
      <div class="cust-article-aside-list">${itemsHtml}</div>
    </div>
  `;
  aside.querySelectorAll('.cust-article-aside-item').forEach((el) => {
    el.addEventListener('click', () => {
      window.location.href = 'tuyen-dung-chi-tiet.html?id=' + encodeURIComponent(el.dataset.postId);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = 'tuyen-dung-chi-tiet.html?id=' + encodeURIComponent(el.dataset.postId);
      }
    });
  });
  root.appendChild(aside);
}

function crdRenderNotFound(root) {
  root.innerHTML = `<div class="cust-article-not-found">
    Không tìm thấy bài tuyển dụng này, có thể bài đã bị gỡ. Quay lại
    <a href="tuyen-dung.html" style="color:var(--red);font-weight:700;">danh sách tuyển dụng</a>.
  </div>`;
}

function crdRender() {
  const root = document.getElementById('articleRoot');
  if (!root) return;

  const all = typeof getRecruitmentPosts === 'function' ? getRecruitmentPosts() : [];
  const activeAll = all.filter((p) => p && p.active !== false);
  const postId = crdCurrentPostId();
  const post = activeAll.find((p) => p.id === postId);

  if (!post) {
    crdWireTabs('office');
    crdRenderNotFound(root);
    return;
  }

  crdWireTabs(post.category);
  document.title = post.title + ' — Nhà Xe Huệ Nghĩa';

  const contentHtml = crdContentHtml(post.content);

  const grid = document.createElement('div');
  grid.className = 'cust-article-grid';
  grid.innerHTML = `
    <article class="cust-article-main">
      <span class="cust-article-tag">${crdEscapeHtml(CRD_CATEGORY_LABEL[post.category] || post.category)}</span>
      <h1>${crdEscapeHtml(post.title)}</h1>
      <div class="cust-article-meta">${crdDateIconSvg()}Đăng ngày ${crdFormatDate(post.date)}</div>
      ${post.excerpt ? `<p class="cust-article-lede">${crdEscapeHtml(post.excerpt)}</p>` : ''}
      <div class="cust-article-img">${crdImageBlock(post, 'cust-article-img')}</div>
      <div class="cust-article-content">${contentHtml}</div>
      <a href="tel:19006067" class="cust-btn cust-btn-primary cust-article-cta">Liên hệ ứng tuyển: 1900 6067</a>
    </article>
  `;
  root.innerHTML = '';
  root.appendChild(grid);
  crdRenderAside(grid, activeAll, post.id);
}

document.addEventListener('DOMContentLoaded', crdRender);
