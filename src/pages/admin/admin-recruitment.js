/* =========================================================
   THÔNG BÁO TUYỂN DỤNG (Nhân sự > Thông báo tuyển dụng)
   Quản lý danh sách vị trí đang cần tuyển: thêm/sửa/đóng-mở/xoá + xem trước bản thông báo
   đầy đủ thông tin (mô tả công việc, yêu cầu, quyền lợi, liên hệ...) trước khi đăng.
   Dữ liệu: FleetStore.getRecruitmentPosts()/setRecruitmentPosts() (shared/js/fleet-store.js).
   ========================================================= */
var RECRUIT_FILTERS = { search: '', status: '', employmentType: '' };
var RECRUIT_SEL = {}; // id thông báo đang tick chọn — dùng cho hành động "Xoá các thông báo đã chọn"

var RC_EMP_TYPE_LABELS = { full_time: 'Toàn thời gian', part_time: 'Bán thời gian', shift: 'Theo ca', seasonal: 'Thời vụ / Theo chuyến' };
var RC_STATUS_META = {
  active: { label: 'Đang tuyển', cls: 'dang-ban' },
  paused: { label: 'Tạm dừng', cls: 'chua-chi-dinh' },
  closed: { label: 'Đã đóng', cls: 'da-huy' }
};
function rcEmpTypeLabel(k) { return RC_EMP_TYPE_LABELS[k] || k || '—'; }
function rcStatusMeta(k) { return RC_STATUS_META[k] || RC_STATUS_META.active; }
function rcStatusBadgeHtml(k) {
  var m = rcStatusMeta(k);
  return '<span class="status-badge ' + m.cls + '"><span class="status-dot"></span>' + m.label + '</span>';
}
// Chuỗi nhiều dòng (mỗi dòng 1 ý, nhập ở textarea) -> danh sách gạch đầu dòng cho bản xem trước.
function rcLinesToListHtml(text) {
  var lines = String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!lines.length) return '<p class="hint-inline">Chưa cập nhật.</p>';
  return '<ul style="margin:6px 0 0 18px; padding:0; color:var(--text-main); font-weight:600; font-size:13px; line-height:1.7;">' +
    lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') +
  '</ul>';
}

function renderRecruitmentView() {
  var all = FleetStore.getRecruitmentPosts();
  var f = RECRUIT_FILTERS;
  var today = todayISO();

  var totalCount = all.length;
  var activeCount = 0, totalQtyActive = 0, featuredActiveCount = 0;
  all.forEach(function (r) {
    if (!r) return;
    if (r.status === 'active') {
      activeCount++;
      totalQtyActive += Math.max(0, parseInt(r.quantity, 10) || 0);
      if (r.featured) featuredActiveCount++;
    }
  });

  var filtered = all.filter(function (r) {
    if (!r) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.employmentType && r.employmentType !== f.employmentType) return false;
    if (f.search) {
      var hay = ((r.title || '') + ' ' + (r.location || '') + ' ' + (r.salary || '')).toLowerCase();
      if (hay.indexOf(f.search.toLowerCase()) === -1) return false;
    }
    return true;
  }).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });

  // Dọn lựa chọn của thông báo không còn hiển thị (đổi bộ lọc) — tránh xoá nhầm mục đã ẩn khỏi danh sách.
  var visIds = {}; filtered.forEach(function (r) { visIds[r.id] = true; });
  Object.keys(RECRUIT_SEL).forEach(function (id) { if (!visIds[id]) delete RECRUIT_SEL[id]; });

  var ICN_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 5v14M5 12h14"/></svg>';

  function tableRow(r, idx) {
    var sel = !!RECRUIT_SEL[r.id];
    var overdue = r.deadline && r.deadline < today && r.status === 'active';
    return '<tr data-row-key="' + esc(r.id) + '" class="' + (sel ? 'selected-row' : '') + '">' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td>' +
        '<div style="font-weight:800; font-size:14px; color:var(--black);">' + esc(r.title || '—') +
          (r.featured ? ' <span style="display:inline-block; margin-left:4px; padding:2px 8px; border-radius:999px; background:var(--red-light); color:var(--red); font-size:10.5px; font-weight:800; vertical-align:middle;">TUYỂN GẤP</span>' : '') +
        '</div>' +
        '<div style="font-size:12px; color:var(--text-sub); font-weight:600;">Cần tuyển ' + (parseInt(r.quantity, 10) || 1) + ' người</div>' +
      '</td>' +
      '<td style="font-weight:600; color:var(--text-main);">' + esc(r.location || '—') + '</td>' +
      '<td><span class="status-badge" style="background:var(--surface-2); color:var(--text-main); border:1px solid var(--border-gray);">' + esc(rcEmpTypeLabel(r.employmentType)) + '</span></td>' +
      '<td style="font-weight:700; color:var(--text-main);">' + esc(r.salary || 'Thoả thuận') + '</td>' +
      '<td style="font-weight:600; ' + (overdue ? 'color:var(--red);' : 'color:var(--text-sub);') + '">' + (r.deadline ? esc(fmtDate(r.deadline)) : 'Không giới hạn') + (overdue ? ' · Quá hạn' : '') + '</td>' +
      '<td class="col-status" style="text-align:center;">' + rcStatusBadgeHtml(r.status) + '</td>' +
      '<td class="row-actions">' +
        '<button type="button" class="btn btn-sm row-menu-btn" data-action="adminRecruitRowMenu" data-args=\'["__this__","' + esc(r.id) + '","' + esc(r.status) + '"]\'>Cập nhật <span class="row-menu-caret">▾</span></button>' +
      '</td>' +
      '<td class="col-check"><input type="checkbox"' + (sel ? ' checked' : '') + ' data-change-action="adminRecruitToggleRow" data-args=\'["' + esc(r.id) + '","__this__"]\'></td>' +
    '</tr>';
  }

  var rowsHtml = filtered.length
    ? filtered.map(tableRow).join('')
    : '<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-sub);">Không tìm thấy thông báo tuyển dụng nào phù hợp bộ lọc.</td></tr>';

  var allChecked = filtered.length && filtered.every(function (r) { return RECRUIT_SEL[r.id]; });

  $('viewRecruitment').innerHTML =
    '<div class="accounts-shell">' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng số thông báo</div>' +
          '<div class="dir-stat-val">' + totalCount + ' <span class="ref-unit">thông báo</span></div>' +
          '<div class="dir-stat-sub">Toàn hệ thống nhà xe</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-val" style="color:#059669;">' + activeCount + ' <span class="ref-unit">thông báo</span></div>' +
          '<div class="dir-stat-label" style="margin-top:4px;">Đang tuyển</div>' +
          '<div class="dir-stat-sub">Đang hiển thị, nhận hồ sơ</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-val" style="color:var(--red);">' + totalQtyActive + ' <span class="ref-unit">người</span></div>' +
          '<div class="dir-stat-label" style="margin-top:4px;">Tổng số lượng cần tuyển</div>' +
          '<div class="dir-stat-sub">Cộng dồn các thông báo đang tuyển</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card ref-card-featured" style="min-height:auto;">' +
          '<div class="ref-featured-head">Tuyển gấp</div>' +
          '<div class="dir-stat-val" style="font-size:26px;color:#fff;">' + featuredActiveCount + ' <span class="ref-unit" style="color:#fff;">thông báo</span></div>' +
          '<div class="ref-featured-sub">Ưu tiên hiển thị lên đầu</div>' +
        '</div>' +
      '</div>' +

      '<div class="sd-toolbar">' +
        '<div class="filter-field sd-field-search">' +
          '<label>Tìm kiếm thông báo</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Vị trí, địa điểm, mức lương..." data-input-action="adminRecruitFilterInput" data-args=\'["search","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field sd-field-region">' +
          '<label>Hình thức</label>' +
          '<select data-change-action="adminRecruitFilterInput" data-args=\'["employmentType","__this_value__"]\'>' +
            '<option value="">Tất cả hình thức</option>' +
            Object.keys(RC_EMP_TYPE_LABELS).map(function (k) {
              return '<option value="' + k + '"' + (f.employmentType === k ? ' selected' : '') + '>' + RC_EMP_TYPE_LABELS[k] + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="filter-field sd-field-region">' +
          '<label>Trạng thái</label>' +
          '<select data-change-action="adminRecruitFilterInput" data-args=\'["status","__this_value__"]\'>' +
            '<option value="">Tất cả trạng thái</option>' +
            Object.keys(RC_STATUS_META).map(function (k) {
              return '<option value="' + k + '"' + (f.status === k ? ' selected' : '') + '>' + RC_STATUS_META[k].label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="sd-toolbar-actions">' +
          '<button type="button" class="btn sd-btn" data-action="adminResetRecruitFilters">Đặt lại</button>' +
          '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenRecruitModal" data-args=\'[""]\'>' + ICN_PLUS + 'Đăng tuyển dụng mới</button>' +
        '</div>' +
      '</div>' +

      '<div class="sd-blocks"><div class="sd-section-block">' +
        '<div class="sd-section-head" style="display:flex; align-items:center; justify-content:space-between;">' +
          '<span>Danh sách thông báo tuyển dụng</span>' +
          '<span style="font-weight:700; color:var(--text-sub); font-size:12.5px;">Hiển thị ' + filtered.length + ' / ' + totalCount + ' thông báo</span>' +
        '</div>' +
        '<div class="sd-table-wrap">' +
          '<table class="admin-table acc-table">' +
            '<thead><tr>' +
              '<th style="width:50px; text-align:center;">STT</th>' +
              '<th style="width:220px;">Vị trí & số lượng</th>' +
              '<th style="width:170px;">Địa điểm làm việc</th>' +
              '<th style="width:130px;">Hình thức</th>' +
              '<th style="width:160px;">Mức lương</th>' +
              '<th style="width:140px;">Hạn nộp hồ sơ</th>' +
              '<th class="col-status" style="text-align:center; width:120px;">Trạng thái</th>' +
              '<th class="th-actions" style="width:120px;">Thao tác</th>' +
              '<th class="col-check"><input type="checkbox" id="rcCheckAll"' + (allChecked ? ' checked' : '') + ' data-action="adminRecruitToggleAll" data-args=\'["__this__"]\'></th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div></div>' +

      '<div class="bulk-bar" id="rcActionBar" style="display:none;">' +
        '<span class="bulk-bar-hint" id="rcActionHint">Đã chọn 0 thông báo</span>' +
        '<div class="bulk-bar-fields">' +
          '<button type="button" class="btn btn-secondary" data-action="adminRecruitClearSel">Hủy</button>' +
          '<button type="button" class="btn btn-danger" data-action="adminRecruitDeleteSelected">Xoá các thông báo đã chọn</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  adminRecruitSyncBar();
}

function adminRecruitFilterInput(field, val) {
  if (field in RECRUIT_FILTERS) {
    RECRUIT_FILTERS[field] = val || '';
    renderRecruitmentView();
  }
}
function adminResetRecruitFilters() {
  RECRUIT_FILTERS = { search: '', status: '', employmentType: '' };
  renderRecruitmentView();
}

/* ---- Chọn nhiều dòng (checkbox cuối bảng) để xoá hàng loạt ---- */
function adminRecruitSyncBar() {
  var bar = $('rcActionBar');
  if (!bar) return;
  var ids = Object.keys(RECRUIT_SEL);
  if (!ids.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  var hint = $('rcActionHint'); if (hint) hint.textContent = 'Đã chọn ' + ids.length + ' thông báo';
}
function adminRecruitToggleRow(id, cb) {
  if (cb.checked) RECRUIT_SEL[id] = true; else delete RECRUIT_SEL[id];
  var tr = document.querySelector('#viewRecruitment tr[data-row-key="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  if (tr) tr.classList.toggle('selected-row', !!cb.checked);
  var all = $('rcCheckAll');
  if (all) all.checked = document.querySelectorAll('#viewRecruitment td.col-check input[type="checkbox"]:not(:checked)').length === 0;
  adminRecruitSyncBar();
}
function adminRecruitToggleAll(cb) {
  var boxes = document.querySelectorAll('#viewRecruitment tbody td.col-check input[type="checkbox"]');
  Array.prototype.forEach.call(boxes, function (b) {
    var id = null;
    try { id = JSON.parse(b.getAttribute('data-args') || '[]')[0]; } catch (e) { /* ignore */ }
    if (!id) return;
    if (cb.checked) RECRUIT_SEL[id] = true; else delete RECRUIT_SEL[id];
  });
  renderRecruitmentView();
}
function adminRecruitClearSel() { RECRUIT_SEL = {}; renderRecruitmentView(); }
function adminRecruitDeleteSelected() {
  var ids = Object.keys(RECRUIT_SEL);
  if (!ids.length) return;
  if (!confirm('Xoá ' + ids.length + ' thông báo tuyển dụng đã chọn?')) return;
  var list = FleetStore.getRecruitmentPosts();
  var titleById = {}; list.forEach(function (r) { titleById[r.id] = r.title; });
  var set = {}; ids.forEach(function (id) { set[id] = true; });
  FleetStore.setRecruitmentPosts(list.filter(function (r) { return !set[r.id]; }));
  ids.forEach(function (id) {
    FleetStore.log({ action: 'delete', entity: 'recruitment', entityId: id, summary: 'Xoá thông báo tuyển dụng ' + (titleById[id] || id) });
    delete RECRUIT_SEL[id];
  });
  showToast('Đã xoá ' + ids.length + ' thông báo tuyển dụng.');
  renderRecruitmentView();
}

// Cột "Thao tác" — dropdown nổi giống bên Trạm Xe (dùng chung adminOpenRowMenu ở admin-station-directory.js).
function adminRecruitRowMenu(btn, id, status) {
  var isActive = status === 'active';
  adminOpenRowMenu(btn, 'recruit:' + id,
    '<button type="button" class="admin-row-menu-item" data-action="adminOpenRecruitModal" data-args=\'["' + esc(id) + '"]\'>Sửa</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminRecruitPreview" data-args=\'["' + esc(id) + '"]\'>Xem thông báo</button>' +
    '<button type="button" class="admin-row-menu-item" data-action="adminToggleRecruitStatus" data-args=\'["' + esc(id) + '"]\'>' + (isActive ? 'Đóng tuyển' : 'Mở lại tuyển') + '</button>' +
    '<button type="button" class="admin-row-menu-item danger" data-action="adminDeleteRecruitPost" data-args=\'["' + esc(id) + '"]\'>Xoá</button>');
}

function adminToggleRecruitStatus(id) {
  var list = FleetStore.getRecruitmentPosts();
  var item = list.find(function (r) { return r && r.id === id; });
  if (!item) return;
  item.status = item.status === 'active' ? 'closed' : 'active';
  item.updatedAt = Date.now();
  FleetStore.setRecruitmentPosts(list);
  FleetStore.log({ action: 'update', entity: 'recruitment', entityId: id, summary: (item.status === 'active' ? 'Mở lại' : 'Đóng') + ' tuyển dụng ' + item.title });
  showToast(item.status === 'active' ? 'Đã mở lại tuyển cho vị trí này.' : 'Đã đóng tuyển vị trí này.');
  renderRecruitmentView();
}

function adminDeleteRecruitPost(id) {
  var list = FleetStore.getRecruitmentPosts();
  var item = list.find(function (r) { return r && r.id === id; });
  if (!item) return;
  if (!confirm('Xoá thông báo tuyển dụng "' + item.title + '"?')) return;
  FleetStore.removeRecruitmentPost(id);
  FleetStore.log({ action: 'delete', entity: 'recruitment', entityId: id, summary: 'Xoá thông báo tuyển dụng ' + item.title });
  showToast('Đã xoá thông báo tuyển dụng.');
  renderRecruitmentView();
}

/* Modal "Đăng mới / Chỉnh sửa thông báo tuyển dụng" — đầy đủ thông tin cần thiết cho 1 tin tuyển dụng:
   vị trí, số lượng, địa điểm, hình thức làm việc, lương, kinh nghiệm, mô tả công việc, yêu cầu ứng viên,
   quyền lợi, hạn nộp hồ sơ, thông tin liên hệ, trạng thái và cờ "tuyển gấp". */
function adminOpenRecruitModal(id) {
  var list = FleetStore.getRecruitmentPosts();
  var r = id ? list.find(function (x) { return x.id === id; }) : null;
  var isEdit = !!r;

  openAdminModal(
    '<h3>' + (isEdit ? 'Chỉnh sửa thông báo tuyển dụng' : 'Đăng tuyển dụng mới') + '</h3>' +
    '<form class="admin-form rc-form" data-submit-action="adminSaveRecruitPost" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="rcId" value="' + (r ? esc(r.id) : '') + '">' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Vị trí tuyển dụng <span class="req">*</span></label>' +
          '<input type="text" id="rcTitle" required placeholder="VD: Tài xế Limousine, Nhân viên bán vé..." value="' + (r ? esc(r.title) : '') + '"></div>' +
        '<div class="fld" style="max-width:160px;"><label>Số lượng cần tuyển <span class="req">*</span></label>' +
          '<input type="number" id="rcQty" min="1" step="1" required value="' + (r ? esc(r.quantity) : '1') + '"></div>' +
      '</div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Địa điểm làm việc</label>' +
          '<input type="text" id="rcLocation" placeholder="VD: Trạm Sài Gòn, Bến xe An Giang..." value="' + (r ? esc(r.location || '') : '') + '"></div>' +
        '<div class="fld"><label>Hình thức làm việc</label>' +
          '<select id="rcEmpType">' +
            Object.keys(RC_EMP_TYPE_LABELS).map(function (k) {
              return '<option value="' + k + '"' + ((r ? r.employmentType : 'full_time') === k ? ' selected' : '') + '>' + RC_EMP_TYPE_LABELS[k] + '</option>';
            }).join('') +
          '</select></div>' +
      '</div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Mức lương</label>' +
          '<input type="text" id="rcSalary" placeholder="VD: 8.000.000 - 12.000.000đ hoặc Thoả thuận" value="' + (r ? esc(r.salary || '') : '') + '"></div>' +
        '<div class="fld"><label>Kinh nghiệm yêu cầu</label>' +
          '<input type="text" id="rcExperience" placeholder="VD: Không yêu cầu, Trên 1 năm..." value="' + (r ? esc(r.experience || '') : '') + '"></div>' +
      '</div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Hạn nộp hồ sơ</label>' +
          '<input type="date" id="rcDeadline" value="' + (r ? esc(r.deadline || '') : '') + '"></div>' +
        '<div class="fld"><label>Trạng thái</label>' +
          '<select id="rcStatus">' +
            Object.keys(RC_STATUS_META).map(function (k) {
              return '<option value="' + k + '"' + ((r ? r.status : 'active') === k ? ' selected' : '') + '>' + RC_STATUS_META[k].label + '</option>';
            }).join('') +
          '</select></div>' +
      '</div>' +

      '<div class="fld"><label>Mô tả công việc</label>' +
        '<textarea id="rcDesc" rows="3" placeholder="Mô tả ngắn công việc cần làm...">' + (r ? esc(r.description || '') : '') + '</textarea></div>' +

      '<div class="fld"><label>Yêu cầu ứng viên <span class="hint-inline">(mỗi dòng 1 ý)</span></label>' +
        '<textarea id="rcReq" rows="4" placeholder="VD:\nCó bằng lái hạng D/E\nTrên 1 năm kinh nghiệm...">' + (r ? esc(r.requirements || '') : '') + '</textarea></div>' +

      '<div class="fld"><label>Quyền lợi <span class="hint-inline">(mỗi dòng 1 ý)</span></label>' +
        '<textarea id="rcBenefits" rows="4" placeholder="VD:\nLương thoả thuận + phụ cấp\nBHXH, BHYT đầy đủ...">' + (r ? esc(r.benefits || '') : '') + '</textarea></div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Người liên hệ</label>' +
          '<input type="text" id="rcContactName" placeholder="VD: Phòng Nhân sự" value="' + (r ? esc(r.contactName || '') : '') + '"></div>' +
        '<div class="fld"><label>SĐT liên hệ</label>' +
          '<input type="text" id="rcContactPhone" placeholder="VD: 0908 111 222" value="' + (r ? esc(r.contactPhone || '') : '') + '"></div>' +
      '</div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Email nhận hồ sơ</label>' +
          '<input type="email" id="rcContactEmail" placeholder="VD: tuyendung@huenghia.vn" value="' + (r ? esc(r.contactEmail || '') : '') + '"></div>' +
        '<div class="fld" style="display:flex; align-items:flex-end;">' +
          '<label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">' +
            '<input type="checkbox" id="rcFeatured"' + (r && r.featured ? ' checked' : '') + ' style="width:16px; height:16px;">' +
            'Đánh dấu "Tuyển gấp" (ưu tiên hiển thị)' +
          '</label></div>' +
      '</div>' +

      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu thông báo</button>' +
      '</div>' +
    '</form>',
    true
  );
}

function adminSaveRecruitPost(e) {
  if (e && e.preventDefault) e.preventDefault();
  var id = ($('rcId') || {}).value || '';
  var fields = {
    title: ($('rcTitle') || {}).value || '',
    quantity: ($('rcQty') || {}).value || 1,
    location: ($('rcLocation') || {}).value || '',
    employmentType: ($('rcEmpType') || {}).value || 'full_time',
    salary: ($('rcSalary') || {}).value || '',
    experience: ($('rcExperience') || {}).value || '',
    deadline: ($('rcDeadline') || {}).value || '',
    status: ($('rcStatus') || {}).value || 'active',
    description: ($('rcDesc') || {}).value || '',
    requirements: ($('rcReq') || {}).value || '',
    benefits: ($('rcBenefits') || {}).value || '',
    contactName: ($('rcContactName') || {}).value || '',
    contactPhone: ($('rcContactPhone') || {}).value || '',
    contactEmail: ($('rcContactEmail') || {}).value || '',
    featured: !!($('rcFeatured') || {}).checked
  };

  if (!fields.title.trim()) { showToast('Nhập vị trí tuyển dụng.'); return; }

  var res = id ? FleetStore.updateRecruitmentPost(id, fields) : FleetStore.addRecruitmentPost(fields);
  if (!res.ok) { showToast(res.reason || 'Không thể lưu thông báo.'); return; }

  FleetStore.log({ action: id ? 'update' : 'create', entity: 'recruitment', entityId: res.item.id, summary: (id ? 'Cập nhật' : 'Đăng') + ' thông báo tuyển dụng ' + res.item.title });

  showToast('Đã lưu thông báo tuyển dụng.');
  closeAdminModal();
  renderRecruitmentView();
}

/* Bản "Xem thông báo" — format như 1 tin tuyển dụng thật để admin duyệt trước khi chia sẻ/đăng ra ngoài. */
function adminRecruitPreview(id) {
  var list = FleetStore.getRecruitmentPosts();
  var r = list.find(function (x) { return x.id === id; });
  if (!r) return;

  var metaRow = function (label, value) {
    return '<div style="min-width:150px;">' +
      '<div style="font-size:11px; font-weight:700; letter-spacing:.3px; text-transform:uppercase; color:var(--text-sub);">' + esc(label) + '</div>' +
      '<div style="font-size:14px; font-weight:700; color:var(--black); margin-top:2px;">' + value + '</div>' +
    '</div>';
  };

  openAdminModal(
    '<div class="rc-preview-head">' +
      '<h3 style="margin:0;">' + esc(r.title) + '</h3>' +
      '<div style="display:flex; gap:6px; flex:0 0 auto;">' +
        (r.featured ? '<span style="padding:3px 10px; border-radius:999px; background:var(--red-light); color:var(--red); font-size:11px; font-weight:800;">TUYỂN GẤP</span>' : '') +
        rcStatusBadgeHtml(r.status) +
      '</div>' +
    '</div>' +
    '<div class="rc-preview-body">' +
    '<div style="display:flex; flex-wrap:wrap; gap:16px; margin:14px 0; padding:12px 14px; background:var(--surface-2); border-radius:10px;">' +
      metaRow('Số lượng cần tuyển', (parseInt(r.quantity, 10) || 1) + ' người') +
      metaRow('Địa điểm làm việc', esc(r.location || '—')) +
      metaRow('Hình thức', esc(rcEmpTypeLabel(r.employmentType))) +
      metaRow('Mức lương', esc(r.salary || 'Thoả thuận')) +
      metaRow('Kinh nghiệm', esc(r.experience || 'Không yêu cầu')) +
      metaRow('Hạn nộp hồ sơ', r.deadline ? esc(fmtDate(r.deadline)) : 'Không giới hạn') +
    '</div>' +
    '<div style="margin-bottom:14px;">' +
      '<div style="font-weight:800; font-size:13px; color:var(--black);">Mô tả công việc</div>' +
      '<div style="font-weight:600; font-size:13px; color:var(--text-main); margin-top:4px;">' + (r.description ? esc(r.description) : '<span class="hint-inline">Chưa cập nhật.</span>') + '</div>' +
    '</div>' +
    '<div style="margin-bottom:14px;">' +
      '<div style="font-weight:800; font-size:13px; color:var(--black);">Yêu cầu ứng viên</div>' +
      rcLinesToListHtml(r.requirements) +
    '</div>' +
    '<div style="margin-bottom:14px;">' +
      '<div style="font-weight:800; font-size:13px; color:var(--black);">Quyền lợi</div>' +
      rcLinesToListHtml(r.benefits) +
    '</div>' +
    '<div style="padding:12px 14px; background:var(--surface-2); border-radius:10px; margin-bottom:6px;">' +
      '<div style="font-weight:800; font-size:13px; color:var(--black); margin-bottom:6px;">Thông tin liên hệ ứng tuyển</div>' +
      '<div style="font-weight:600; font-size:13px; color:var(--text-main);">' +
        (r.contactName ? esc(r.contactName) + '<br>' : '') +
        (r.contactPhone ? 'Điện thoại: ' + esc(r.contactPhone) + '<br>' : '') +
        (r.contactEmail ? 'Email: ' + esc(r.contactEmail) : '') +
        (!r.contactName && !r.contactPhone && !r.contactEmail ? '<span class="hint-inline">Chưa cập nhật.</span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="modal-actions">' +
      '<button type="button" class="btn" data-action="closeAdminModal">Đóng</button>' +
      '<button type="button" class="btn btn-primary" data-action="adminOpenRecruitModal" data-args=\'["' + esc(r.id) + '"]\'>Chỉnh sửa</button>' +
    '</div>' +
    '</div>',
    true
  );
}
