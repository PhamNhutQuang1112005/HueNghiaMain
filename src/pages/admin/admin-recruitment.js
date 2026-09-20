/* =========================================================
   THÔNG BÁO TUYỂN DỤNG (Nhân sự > "Thông báo tuyển dụng")
   CRUD danh sách bài tuyển dụng hiển thị ở trang khách hàng (customer/tuyen-dung.html, 2 khối
   "Khối văn phòng"/"Lái xe tuyến" — xem customer-recruitment.js). Dữ liệu đọc/ghi qua
   getRecruitmentPosts()/saveRecruitmentPosts() (js/shared/recruitment-data.js, nạp trước file này).
   Giao diện theo đúng khuôn CRUD chuẩn của trang Admin (đối chiếu admin-vehicle-categories.js).
   ========================================================= */

var RECRUITMENT_CATEGORY_LABEL = { office: 'Khối văn phòng', driver: 'Lái xe tuyến' };
var RECRUITMENT_FILTERS = { search: '', category: '', active: '' };
var RECRUITMENT_SEL = {}; // id bài tuyển dụng đang tick chọn (bảng) — dùng cho "Xoá các bài đã chọn"

function rcMakeId() {
  return 'rc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function rcCategoryLabel(cat) { return RECRUITMENT_CATEGORY_LABEL[cat] || cat || '—'; }

function rcThumbHtml(post) {
  if (post.image) return '<img src="' + esc(post.image) + '" alt="" class="rc-thumb">';
  return '<div class="rc-thumb rc-thumb-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>';
}

function renderRecruitmentView() {
  var all = getRecruitmentPosts();
  var f = RECRUITMENT_FILTERS;

  var totalCount = all.length;
  var officeCount = all.filter(function (p) { return p.category === 'office'; }).length;
  var driverCount = all.filter(function (p) { return p.category === 'driver'; }).length;
  var activeCount = all.filter(activeOf).length;

  var filtered = all.filter(function (p) {
    if (!p) return false;
    if (f.search) {
      var kw = f.search.toLowerCase();
      var matchTitle = (p.title || '').toLowerCase().indexOf(kw) !== -1;
      var matchExcerpt = (p.excerpt || '').toLowerCase().indexOf(kw) !== -1;
      if (!matchTitle && !matchExcerpt) return false;
    }
    if (f.category && p.category !== f.category) return false;
    if (f.active === 'true' && !activeOf(p)) return false;
    if (f.active === 'false' && activeOf(p)) return false;
    return true;
  }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

  // Dọn lựa chọn của bài không còn hiển thị (đổi bộ lọc) — tránh xoá nhầm bài đã ẩn khỏi danh sách.
  var visIds = {}; filtered.forEach(function (p) { visIds[p.id] = true; });
  Object.keys(RECRUITMENT_SEL).forEach(function (id) { if (!visIds[id]) delete RECRUITMENT_SEL[id]; });

  var rows = filtered.length ? filtered.map(function (p, i) {
    var idx = all.indexOf(p);
    var sel = !!RECRUITMENT_SEL[p.id];
    return '<tr data-row-key="' + esc(p.id) + '" class="' + (sel ? 'selected-row' : '') + '">' +
      '<td class="num">' + (i + 1) + '</td>' +
      '<td>' + rcThumbHtml(p) + '</td>' +
      '<td>' +
        '<div style="font-weight:800;font-size:14px;color:var(--black);">' + esc(p.title || '—') + (p.featured ? ' <span class="rc-featured-badge">★ Nổi bật</span>' : '') + '</div>' +
        '<div style="font-size:12px;color:var(--text-sub);line-height:1.4;margin-top:2px;max-width:420px;">' + esc(p.excerpt || 'Chưa có mô tả ngắn') + '</div>' +
      '</td>' +
      '<td><span class="status-badge ' + (p.category === 'driver' ? 'dang-ban' : 'chua-chi-dinh') + '">' + esc(rcCategoryLabel(p.category)) + '</span></td>' +
      '<td style="font-weight:600;color:var(--text-sub);white-space:nowrap;">' + esc(fmtDate(p.date)) + '</td>' +
      '<td style="text-align:center;">' + activeTag(activeOf(p)) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminRecruitmentRowMenu" data-args=\'["__this__","' + esc(p.id) + '",' + (activeOf(p) ? 'true' : 'false') + ',' + (p.featured ? 'true' : 'false') + ']\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminRecruitmentToggleRow" data-args=\'["' + esc(p.id) + '","__this__"]\'></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="8" class="empty-state">Không tìm thấy bài tuyển dụng nào phù hợp.</td></tr>';

  var allChecked = filtered.length && filtered.every(function (p) { return RECRUITMENT_SEL[p.id]; });

  $('viewRecruitment').innerHTML =
    '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search" style="flex:1 1 260px; min-width:220px;">' +
        '<label>Tìm kiếm</label>' +
        '<input type="text" id="rcSearch" value="' + esc(f.search) + '" placeholder="Tiêu đề, mô tả ngắn..." data-input-action="adminRecruitmentFilterInput" data-args=\'["search","__this_value__"]\'>' +
      '</div>' +
      '<div class="filter-field sd-field-region" style="flex:1 1 170px; min-width:150px;">' +
        '<label>Khối</label>' +
        '<select data-change-action="adminRecruitmentFilterInput" data-args=\'["category","__this_value__"]\'>' +
          '<option value="">Tất cả khối</option>' +
          '<option value="office"' + (f.category === 'office' ? ' selected' : '') + '>Khối văn phòng</option>' +
          '<option value="driver"' + (f.category === 'driver' ? ' selected' : '') + '>Lái xe tuyến</option>' +
        '</select>' +
      '</div>' +
      '<div class="filter-field sd-field-region" style="flex:1 1 170px; min-width:150px;">' +
        '<label>Trạng thái</label>' +
        '<select data-change-action="adminRecruitmentFilterInput" data-args=\'["active","__this_value__"]\'>' +
          '<option value="">Tất cả trạng thái</option>' +
          '<option value="true"' + (f.active === 'true' ? ' selected' : '') + '>Đang hiển thị</option>' +
          '<option value="false"' + (f.active === 'false' ? ' selected' : '') + '>Đang ẩn</option>' +
        '</select>' +
      '</div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn sd-btn" data-action="adminRecruitmentSearchClick">Tìm kiếm</button>' +
        '<button type="button" class="btn sd-btn" data-action="adminResetRecruitmentFilters">Đặt lại</button>' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenRecruitmentModal" data-args=\'["-1"]\'>+ Thêm bài tuyển dụng</button>' +
      '</div>' +
    '</div>' +

    '<div class="sd-blocks"><div class="sd-section-block">' +
      '<div class="sd-section-head" style="display:flex;align-items:center;justify-content:space-between;">' +
        '<span>Danh sách bài tuyển dụng</span>' +
        '<span style="font-weight:700;color:var(--text-sub);font-size:12.5px;">Hiển thị ' + filtered.length + ' / ' + totalCount + ' bài · ' + officeCount + ' văn phòng · ' + driverCount + ' lái xe · ' + activeCount + ' đang hiển thị</span>' +
      '</div>' +
      '<div class="sd-table-wrap">' +
        '<table class="admin-table rc-table">' +
          '<thead><tr>' +
            '<th class="num" style="width:44px; white-space:nowrap;">STT</th>' +
            '<th style="width:84px;">Ảnh</th>' +
            '<th>Tiêu đề & mô tả ngắn</th>' +
            '<th style="width:130px;">Khối</th>' +
            '<th style="width:100px;">Ngày đăng</th>' +
            '<th style="width:110px;text-align:center;">Trạng thái</th>' +
            '<th class="th-actions" style="width:120px;">Thao tác</th>' +
            '<th class="col-check"><input type="checkbox" id="rcCheckAll"' + (allChecked ? ' checked' : '') + ' data-action="adminRecruitmentToggleAll" data-args=\'["__this__"]\'></th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div></div>' +

    '<div class="bulk-bar" id="rcActionBar" style="display:none;">' +
      '<span class="bulk-bar-hint" id="rcActionHint">Đã chọn 0 bài</span>' +
      '<div class="bulk-bar-fields">' +
        '<button type="button" class="btn btn-secondary" data-action="adminRecruitmentClearSel">Hủy</button>' +
        '<button type="button" class="btn btn-danger" data-action="adminRecruitmentDeleteSelected">Xoá các bài đã chọn</button>' +
      '</div>' +
    '</div>';
  adminRecruitmentSyncBar();
}

/* ---- Chọn nhiều dòng (checkbox cuối bảng) để xoá hàng loạt ---- */
function adminRecruitmentSyncBar() {
  var bar = $('rcActionBar');
  if (!bar) return;
  var ids = Object.keys(RECRUITMENT_SEL);
  if (!ids.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  var hint = $('rcActionHint'); if (hint) hint.textContent = 'Đã chọn ' + ids.length + ' bài';
}
function adminRecruitmentToggleRow(id, cb) {
  if (cb.checked) RECRUITMENT_SEL[id] = true; else delete RECRUITMENT_SEL[id];
  var tr = document.querySelector('#viewRecruitment tr[data-row-key="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  var all = $('rcCheckAll');
  if (all) all.checked = document.querySelectorAll('#viewRecruitment tbody td.col-check input[type="checkbox"]:not(:checked)').length === 0;
  adminRecruitmentSyncBar();
}
function adminRecruitmentToggleAll(cb) {
  var boxes = document.querySelectorAll('#viewRecruitment tbody td.col-check input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (b) {
    var id = null;
    try { id = JSON.parse(b.getAttribute('data-args') || '[]')[0]; } catch (e) { /* ignore */ }
    if (!id) return;
    if (cb.checked) RECRUITMENT_SEL[id] = true; else delete RECRUITMENT_SEL[id];
  });
  renderRecruitmentView();
}
function adminRecruitmentClearSel() { RECRUITMENT_SEL = {}; renderRecruitmentView(); }
function adminRecruitmentDeleteSelected() {
  var ids = Object.keys(RECRUITMENT_SEL);
  if (!ids.length) return;
  var all = getRecruitmentPosts();
  var idSet = {}; ids.forEach(function (id) { idSet[id] = true; });
  var titles = all.filter(function (p) { return idSet[p.id]; }).map(function (p) { return p.title; });
  if (!confirm('Xoá ' + titles.length + ' bài tuyển dụng đã chọn?\n' + titles.join(', '))) return;
  var remaining = all.filter(function (p) { return !idSet[p.id]; });
  saveRecruitmentPosts(remaining);
  titles.forEach(function (title, i) {
    FleetStore.log({ action: 'delete', entity: 'recruitment_post', entityId: ids[i], summary: 'Xoá bài tuyển dụng ' + title });
  });
  RECRUITMENT_SEL = {};
  showToast('Đã xoá ' + titles.length + ' bài tuyển dụng.');
  renderRecruitmentView();
}

// Cột "Thao tác" — dropdown nổi giống bên Trạm Xe (dùng chung adminOpenRowMenu ở admin-station-directory.js).
function adminRecruitmentRowMenu(btn, id, isActive, isFeatured) {
  adminOpenRowMenu(btn, 'recruitment:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenRecruitmentModal" data-args=\'["' + esc(id) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminToggleRecruitmentFeatured" data-args=\'["' + esc(id) + '"]\'>' + (isFeatured ? 'Bỏ khỏi Tin nổi bật' : 'Đánh dấu Tin nổi bật') + '</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminToggleRecruitmentActive" data-args=\'["' + esc(id) + '"]\'>' + (isActive ? 'Ẩn khỏi trang khách hàng' : 'Hiện lên trang khách hàng') + '</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteRecruitmentPost" data-args=\'["' + esc(id) + '"]\'>Xoá</button>');
}

function adminRecruitmentFilterInput(field, val) {
  if (field in RECRUITMENT_FILTERS) {
    RECRUITMENT_FILTERS[field] = val || '';
    renderRecruitmentView();
  }
}
// Nút "Tìm kiếm" cạnh ô lọc (giống admin-customers.js:custSearchClick) — lọc đã chạy live theo
// data-input-action nên nút này chỉ đọc lại giá trị ô hiện tại rồi render, cho quen thao tác bấm nút.
function adminRecruitmentSearchClick() {
  var el = $('rcSearch');
  RECRUITMENT_FILTERS.search = (el && el.value) || '';
  renderRecruitmentView();
}
function adminResetRecruitmentFilters() {
  RECRUITMENT_FILTERS = { search: '', category: '', active: '' };
  renderRecruitmentView();
}

// Đọc file ảnh chọn ở modal Thêm/Sửa thành data URL, lưu thẳng vào ô ẩn #rmImage (không có server upload
// riêng nên lưu data URL luôn trong localStorage, giống cách adminImportConfig đọc file JSON).
function rcOnImagePick(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    $('rmImage').value = reader.result;
    $('rmImagePreview').innerHTML = '<img src="' + reader.result + '" alt="">';
  };
  reader.readAsDataURL(file);
}
function rcClearImage() {
  $('rmImage').value = '';
  $('rmImageFile').value = '';
  $('rmImagePreview').innerHTML = '<span class="hint-inline">Chưa chọn ảnh</span>';
}

// Ô "Nội dung chi tiết" dùng CKEditor 5 (bản UMD tự lưu trong repo — nạp qua CDN ở admin.html) thay
// <textarea> thường — kéo dài hết chiều cao cột phải (.rc-form-side .fld.rc-fld-fill .ck-editor*,
// admin.css) giống ô <textarea> flex-fill cũ. RC_EDITOR giữ instance đang mở để đọc lại lúc Lưu
// (getData()) và huỷ lúc đóng modal (destroy()), tránh rò rỉ/nhân đôi editor khi mở lại modal nhiều lần.
// Không có global CKEDITOR (file tĩnh bị thiếu/đường dẫn sai) thì lùi về <textarea> thường —
// adminSaveRecruitmentPost tự kiểm tra RC_EDITOR trước khi đọc.
var RC_EDITOR = null;

function rcDestroyEditor() {
  if (RC_EDITOR) {
    var editor = RC_EDITOR;
    RC_EDITOR = null;
    editor.destroy().catch(function (err) { console.error('[CKEditor] huỷ lỗi', err); });
  }
}

// Mỗi nhóm chỉ thêm vào plugins/toolbar khi ĐỦ hết plugin liệt kê thật sự tồn tại trên global CKEDITOR
// (bản UMD gộp mọi plugin thành CKEDITOR.<TênPlugin>) — lỡ đoán sai 1 tên thì chỉ mất đúng nhóm đó, KHÔNG
// làm ClassicEditor.create() ném lỗi và mất trắng toàn bộ toolbar như lần dùng "super-build" trước (tên
// plugin không khớp bản build → cả editor không hiện ra gì).
// KHÔNG nạp TableToolbar/ImageToolbar (toolbar nổi lên khi bấm vào bảng/ảnh đã chèn) — 2 plugin này cần
// cấu hình table.contentToolbar/image.toolbar riêng, thiếu là CKEditor ném lỗi "widget-toolbar-no-items".
// Bớt tính năng (không có thanh sửa nhanh khi bấm vào bảng/ảnh) để đổi lấy không bị lỗi khi mở modal.
var RC_TOOLBAR_GROUPS = [
  { plugins: ['Heading'], items: ['heading'] },
  { plugins: ['Bold'], items: ['bold'] },
  { plugins: ['Italic'], items: ['italic'] },
  { plugins: ['Underline'], items: ['underline'] },
  { plugins: ['Font'], items: ['fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor'] },
  { plugins: ['Alignment'], items: ['alignment'] },
  { plugins: ['List'], items: ['bulletedList', 'numberedList'] },
  { plugins: ['Link'], items: ['link'] },
  { plugins: ['Table'], items: ['insertTable'] },
  { plugins: ['Image', 'ImageInsert'], items: ['insertImage'] }
];

function rcInitContentEditor() {
  rcDestroyEditor();
  var el = $('rmContent');
  var C = window.CKEDITOR;
  if (!el || !C || typeof C.ClassicEditor === 'undefined' || !C.Essentials || !C.Paragraph) return;

  var plugins = [C.Essentials, C.Paragraph];
  var toolbar = ['undo', 'redo'];
  RC_TOOLBAR_GROUPS.forEach(function (group) {
    var ok = group.plugins.every(function (name) { return typeof C[name] === 'function'; });
    if (!ok) return;
    group.plugins.forEach(function (name) { plugins.push(C[name]); });
    toolbar.push('|');
    group.items.forEach(function (item) { toolbar.push(item); });
  });

  C.ClassicEditor.create({
    licenseKey: 'GPL',
    attachTo: el,
    plugins: plugins,
    toolbar: toolbar
  }).then(function (editor) {
    RC_EDITOR = editor;
  }).catch(function (err) {
    console.error('[CKEditor] khởi tạo lỗi', err);
  });
}

function rcCloseRecruitmentModal() {
  rcDestroyEditor();
  closeAdminModal();
}

function adminOpenRecruitmentModal(id) {
  var all = getRecruitmentPosts();
  var p = id && id !== '-1' ? all.find(function (x) { return x.id === id; }) : null;
  var isEdit = !!p;

  openAdminModal(
    '<h3>' + (isEdit ? 'Sửa bài tuyển dụng' : 'Thêm bài tuyển dụng') + '</h3>' +
    '<form class="admin-form rc-form" data-submit-action="adminSaveRecruitmentPost" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="rmId" value="' + (p ? esc(p.id) : '') + '">' +
      '<div class="rc-form-grid">' +
        '<div class="rc-form-main">' +
          '<div class="fld"><label>Tiêu đề <span class="req">*</span></label>' +
            '<input type="text" id="rmTitle" required placeholder="VD: Tuyển tài xế chạy tuyến Sài Gòn — An Giang" value="' + (p ? esc(p.title) : '') + '"></div>' +
          '<div class="fld-row">' +
            '<div class="fld"><label>Khối <span class="req">*</span></label><select id="rmCategory">' +
              '<option value="office"' + (!p || p.category === 'office' ? ' selected' : '') + '>Khối văn phòng</option>' +
              '<option value="driver"' + (p && p.category === 'driver' ? ' selected' : '') + '>Lái xe tuyến</option>' +
            '</select></div>' +
            '<div class="fld"><label>Ngày đăng</label><input type="date" id="rmDate" value="' + (p ? esc(p.date || '') : todayISO()) + '"></div>' +
          '</div>' +
          '<div class="fld"><label>Mô tả ngắn (hiện trên thẻ bài đăng)</label>' +
            '<textarea id="rmExcerpt" rows="2" placeholder="Tóm tắt 1-2 câu...">' + (p ? esc(p.excerpt || '') : '') + '</textarea></div>' +
          '<div class="fld"><label>Ảnh bài đăng</label>' +
            '<div class="rc-img-preview" id="rmImagePreview">' + (p && p.image ? '<img src="' + esc(p.image) + '" alt="">' : '<span class="hint-inline">Chưa chọn ảnh</span>') + '</div>' +
            '<input type="file" id="rmImageFile" class="rc-img-file-input" accept="image/*" data-change-action="rcOnImagePick" data-args=\'["__event__"]\'>' +
            '<input type="hidden" id="rmImage" value="' + (p ? esc(p.image || '') : '') + '">' +
            '<div class="rc-img-actions">' +
              '<label for="rmImageFile" class="btn btn-sm btn-primary">Tải ảnh lên</label>' +
              '<button type="button" class="btn btn-sm btn-danger" data-action="rcClearImage">Xoá ảnh</button>' +
            '</div>' +
          '</div>' +
          '<div class="rc-toggle-row">' +
            '<label class="rc-active-inline"><input type="checkbox" id="rmActive" ' + (!p || activeOf(p) ? 'checked' : '') + '> Hiển thị trên trang khách hàng</label>' +
            '<label class="rc-active-inline"><input type="checkbox" id="rmFeatured" ' + (p && p.featured ? 'checked' : '') + '> Đánh dấu Tin nổi bật</label>' +
          '</div>' +
        '</div>' +
        '<div class="rc-form-side">' +
          '<div class="fld rc-fld-fill"><label>Nội dung chi tiết</label>' +
            '<textarea id="rmContent" placeholder="Mô tả công việc, yêu cầu, quyền lợi, liên hệ...">' + (p ? esc(p.content || '') : '') + '</textarea></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="rcCloseRecruitmentModal">Huỷ</button><button type="submit" class="btn btn-primary">' + (isEdit ? 'Lưu thay đổi' : 'Đăng bài') + '</button></div>' +
    '</form>',
    true
  );
  rcInitContentEditor();
}

function adminSaveRecruitmentPost(e) {
  e.preventDefault();
  var id = $('rmId').value;
  var all = getRecruitmentPosts();
  var idx = id ? all.findIndex(function (x) { return x.id === id; }) : -1;
  var title = $('rmTitle').value.trim();
  if (!title) { showToast('Nhập tiêu đề bài tuyển dụng.'); return; }
  var rec = {
    id: idx >= 0 ? all[idx].id : rcMakeId(),
    title: title,
    category: $('rmCategory').value === 'driver' ? 'driver' : 'office',
    excerpt: $('rmExcerpt').value.trim(),
    content: RC_EDITOR ? RC_EDITOR.getData() : $('rmContent').value.trim(),
    image: $('rmImage').value || '',
    date: $('rmDate').value || todayISO(),
    active: $('rmActive').checked,
    featured: $('rmFeatured').checked
  };
  if (idx >= 0) {
    var before = all[idx];
    all[idx] = rec;
    FleetStore.log({ action: 'update', entity: 'recruitment_post', entityId: rec.id, summary: 'Sửa bài tuyển dụng ' + title, before: before, after: rec });
  } else {
    all.push(rec);
    FleetStore.log({ action: 'create', entity: 'recruitment_post', entityId: rec.id, summary: 'Thêm bài tuyển dụng ' + title, after: rec });
  }
  saveRecruitmentPosts(all);
  rcCloseRecruitmentModal();
  showToast('Đã lưu bài tuyển dụng.');
  renderRecruitmentView();
}

function adminToggleRecruitmentActive(id) {
  var all = getRecruitmentPosts();
  var p = all.find(function (x) { return x.id === id; });
  if (!p) return;
  p.active = !activeOf(p);
  saveRecruitmentPosts(all);
  FleetStore.log({ action: 'update', entity: 'recruitment_post', entityId: id, summary: (p.active ? 'Hiện' : 'Ẩn') + ' bài tuyển dụng ' + p.title });
  showToast(p.active ? 'Đã hiện bài trên trang khách hàng.' : 'Đã ẩn bài khỏi trang khách hàng.');
  renderRecruitmentView();
}

function adminToggleRecruitmentFeatured(id) {
  var all = getRecruitmentPosts();
  var p = all.find(function (x) { return x.id === id; });
  if (!p) return;
  p.featured = !p.featured;
  saveRecruitmentPosts(all);
  FleetStore.log({ action: 'update', entity: 'recruitment_post', entityId: id, summary: (p.featured ? 'Đánh dấu' : 'Bỏ đánh dấu') + ' Tin nổi bật cho bài ' + p.title });
  showToast(p.featured ? 'Đã đánh dấu Tin nổi bật.' : 'Đã bỏ khỏi Tin nổi bật.');
  renderRecruitmentView();
}

function adminDeleteRecruitmentPost(id) {
  var all = getRecruitmentPosts();
  var idx = all.findIndex(function (x) { return x.id === id; });
  if (idx < 0) return;
  var p = all[idx];
  if (!confirm('Xoá bài tuyển dụng "' + p.title + '"?')) return;
  all.splice(idx, 1);
  saveRecruitmentPosts(all);
  FleetStore.log({ action: 'delete', entity: 'recruitment_post', entityId: id, summary: 'Xoá bài tuyển dụng ' + p.title });
  showToast('Đã xoá bài tuyển dụng.');
  renderRecruitmentView();
}
