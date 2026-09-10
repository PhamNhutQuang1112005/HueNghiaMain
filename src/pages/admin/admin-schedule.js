/* =========================================================
   QUẢN LÝ LỊCH TRÌNH / QUẢN LÝ GIỜ
   Giữ NGUYÊN PHONG CÁCH GIAO DIỆN CHUẨN ĐỒNG BỘ với các trang Admin khác.
   Chứa ĐẦY ĐỦ CÁC TÍNH NĂNG & TRƯỜNG DỮ LIỆU:
   - STT | Thời gian (01h30, 02h00...) | Nội dung | Được Kích Hoạt | Đã Xóa | Thao tác
   - Modal Tạo mới / Chỉnh sửa Lịch trình (Thời gian *, Nội dung, Được Kích Hoạt, Đã Xóa)
   ========================================================= */

var SCHEDULE_FILTERS = { search: '', active: '', deleted: '' };

var DEFAULT_SCHEDULE_ITEMS = [
  { id: 'sch_1', time: '00h00', content: 'Khung giờ đêm xuất bến 00h00', active: true, deleted: false },
  { id: 'sch_2', time: '01h00', content: 'Khung giờ đêm xuất bến 01h00', active: true, deleted: false },
  { id: 'sch_3', time: '01h15', content: 'Khung giờ đêm xuất bến 01h15', active: true, deleted: false },
  { id: 'sch_4', time: '01h30', content: 'Chuyến xe ca đêm 01h30', active: true, deleted: false },
  { id: 'sch_5', time: '01h45', content: 'Chuyến xe ca đêm 01h45', active: true, deleted: false },
  { id: 'sch_6', time: '01h50', content: 'Chuyến xe ca đêm 01h50', active: true, deleted: false },
  { id: 'sch_7', time: '02h00', content: 'Chuyến xe ca đêm 02h00', active: true, deleted: false },
  { id: 'sch_8', time: '02h20', content: 'Chuyến xe ca đêm 02h20', active: true, deleted: false },
  { id: 'sch_9', time: '02h30', content: 'Chuyến xe ca đêm 02h30', active: true, deleted: false },
  { id: 'sch_10', time: '02h45', content: 'Chuyến xe ca đêm 02h45', active: true, deleted: false },
  { id: 'sch_11', time: '03h00', content: 'Chuyến xe sáng sớm 03h00', active: true, deleted: false },
  { id: 'sch_12', time: '04h00', content: 'Chuyến xe sáng sớm 04h00', active: true, deleted: false },
  { id: 'sch_13', time: '05h00', content: 'Chuyến xe xuất bến ca sáng 05h00', active: true, deleted: false },
  { id: 'sch_14', time: '06h00', content: 'Chuyến xe tuyến cố định 06h00', active: true, deleted: false },
  { id: 'sch_15', time: '07h00', content: 'Chuyến cao điểm ca sáng 07h00', active: true, deleted: false },
  { id: 'sch_16', time: '08h30', content: 'Chuyến sáng trung tâm 08h30', active: true, deleted: false },
  { id: 'sch_17', time: '09h15', content: 'Chuyến rước khách 09h15', active: true, deleted: false },
  { id: 'sch_18', time: '10h00', content: 'Chuyến sáng muộn 10h00', active: true, deleted: false },
  { id: 'sch_19', time: '13h15', content: 'Chuyến xe chiều 13h15', active: true, deleted: false },
  { id: 'sch_20', time: '15h30', content: 'Chuyến cố định chiều 15h30', active: true, deleted: false },
  { id: 'sch_21', time: '17h00', content: 'Chuyến chiều tối 17h00', active: true, deleted: false },
  { id: 'sch_22', time: '21h00', content: 'Chuyến đêm Limousine 21h00', active: true, deleted: false }
];

function getScheduleItems() {
  var list = lsRead(HN_SCHEDULE_HOURS_KEY, null);
  if (!Array.isArray(list) || list.length === 0) {
    list = DEFAULT_SCHEDULE_ITEMS.slice();
    lsWrite(HN_SCHEDULE_HOURS_KEY, list);
  }
  return list;
}

function saveScheduleItems(list) {
  lsWrite(HN_SCHEDULE_HOURS_KEY, list);
}

function renderScheduleView() {
  var items = getScheduleItems();
  var f = SCHEDULE_FILTERS;

  var filtered = items.filter(function (x) {
    if (!x) return false;
    if (f.active === '1' && !x.active) return false;
    if (f.active === '0' && x.active) return false;
    if (f.deleted === '1' && !x.deleted) return false;
    if (f.deleted === '0' && x.deleted) return false;

    if (f.search) {
      var hay = ((x.time || '') + ' ' + (x.content || '')).toLowerCase();
      if (hay.indexOf(f.search.toLowerCase()) === -1) return false;
    }
    return true;
  });

  var ICN_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var ICN_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  var ICN_POWER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>';

  function tableRow(x, idx) {
    var isAct = !!x.active;
    var isDel = !!x.deleted;

    var activeBadge = isAct
      ? '<span class="status-badge dang-ban"><span class="status-dot"></span>Được Kích Hoạt</span>'
      : '<span class="status-badge chua-chi-dinh"><span class="status-dot"></span>Chưa Kích Hoạt</span>';

    var deletedBadge = isDel
      ? '<span class="status-badge da-huy"><span class="status-dot"></span>Đã Xóa</span>'
      : '<span class="status-badge dang-ban"><span class="status-dot"></span>Chưa Xóa</span>';

    return '<tr class="' + (isDel ? 'sch-row-deleted' : '') + '">' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td style="text-align:center;"><span style="font-size:15px; font-weight:800; font-family:\'Roboto Mono\', monospace; color:var(--black); background:var(--surface-2); padding:3px 10px; border-radius:6px; border:1px solid var(--border-gray); display:inline-block;">' + esc(x.time) + '</span></td>' +
      '<td>' + (esc(x.content) || '<span class="hint-inline">Chưa có nội dung mô tả</span>') + '</td>' +
      '<td class="col-status" style="text-align:center;">' + activeBadge + '</td>' +
      '<td class="col-status" style="text-align:center;">' + deletedBadge + '</td>' +
      '<td class="th-actions" style="text-align:center;">' +
        '<div style="display:inline-flex; gap:6px; align-items:center;">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="adminOpenScheduleModal" data-args=\'["' + esc(x.id) + '"]\'>' + ICN_EDIT + 'Sửa</button>' +
          '<button type="button" class="btn btn-sm ' + (isAct ? 'btn-secondary' : 'btn-primary') + '" data-action="adminToggleScheduleActive" data-args=\'["' + esc(x.id) + '"]\'>' + ICN_POWER + (isAct ? 'Tắt' : 'Bật') + '</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-action="adminToggleScheduleDeleted" data-args=\'["' + esc(x.id) + '"]\'>' + ICN_TRASH + (isDel ? 'Khôi phục' : 'Xóa') + '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  var rowsHtml = filtered.length
    ? filtered.map(tableRow).join('')
    : '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-sub);">Không tìm thấy lịch trình phù hợp với bộ lọc.</td></tr>';

  // Bố cục phẳng giống trang Trạm Xe: thanh lọc .sd-toolbar (không panel/nền/bóng) + bảng trong
  // .sd-table-wrap. Bỏ dải thẻ thống kê và header "Hệ Thống Quản Lý Lịch Trình".
  $('viewSchedule').innerHTML =
    '<div class="sd-toolbar">' +
      '<div class="filter-field sd-field-search"><label>Tìm kiếm lịch trình</label>' +
        '<input type="text" id="schSearch" value="' + esc(f.search) + '" placeholder="Nhập giờ (01h30...) hoặc nội dung..." data-input-action="adminScheduleFilterInput" data-args=\'["search","__this_value__"]\'></div>' +
      '<div class="filter-field sd-field-region"><label>Trạng thái kích hoạt</label>' +
        '<select data-change-action="adminScheduleFilterInput" data-args=\'["active","__this_value__"]\'>' +
          '<option value="">Tất cả trạng thái</option>' +
          '<option value="1"' + (f.active === '1' ? ' selected' : '') + '>Được Kích Hoạt</option>' +
          '<option value="0"' + (f.active === '0' ? ' selected' : '') + '>Chưa Kích Hoạt</option>' +
        '</select></div>' +
      '<div class="filter-field sd-field-region"><label>Trạng thái xóa</label>' +
        '<select data-change-action="adminScheduleFilterInput" data-args=\'["deleted","__this_value__"]\'>' +
          '<option value="">Tất cả</option>' +
          '<option value="0"' + (f.deleted === '0' ? ' selected' : '') + '>Chưa Xóa</option>' +
          '<option value="1"' + (f.deleted === '1' ? ' selected' : '') + '>Đã Xóa</option>' +
        '</select></div>' +
      '<div class="sd-toolbar-actions">' +
        '<button type="button" class="btn sd-btn" data-action="adminResetScheduleFilters">Đặt lại</button>' +
        '<button type="button" class="btn btn-primary sd-btn" data-action="adminOpenScheduleModal" data-args=\'[""]\'>+ Tạo mới lịch trình</button>' +
      '</div>' +
    '</div>' +
    '<div class="sd-table-wrap">' +
      '<table class="admin-table">' +
        '<thead><tr>' +
          '<th class="num" style="text-align:center;">STT</th>' +
          '<th style="width:150px; text-align:center;">Thời gian</th>' +
          '<th>Nội dung mô tả</th>' +
          '<th class="col-status" style="text-align:center; width:150px;">Được Kích Hoạt</th>' +
          '<th class="col-status" style="text-align:center; width:130px;">Đã Xóa</th>' +
          '<th class="th-actions" style="text-align:center; width:220px;">Thao tác</th>' +
        '</tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>' +
    '</div>';
}

function adminScheduleFilterInput(field, val) {
  if (field in SCHEDULE_FILTERS) {
    SCHEDULE_FILTERS[field] = val || '';
    adminKeepFocus(renderScheduleView);
  }
}

function adminResetScheduleFilters() {
  SCHEDULE_FILTERS = { search: '', active: '', deleted: '' };
  renderScheduleView();
}

/* Modal "Tạo mới / Chỉnh sửa lịch trình" */
function adminOpenScheduleModal(id) {
  var items = getScheduleItems();
  var x = id ? items.find(function (item) { return item.id === id; }) : null;

  var isEdit = !!x;
  var titleText = isEdit ? 'Chỉnh sửa lịch trình' : 'Tạo mới lịch trình';
  var curTime = x ? (x.time || '') : '00:00';
  var curContent = x ? (x.content || '') : '';
  var curActive = x ? x.active : true;
  var curDeleted = x ? x.deleted : false;

  openAdminModal(
    '<h3>' + esc(titleText) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveScheduleModal" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="smId" value="' + (x ? esc(x.id) : '') + '">' +

      '<div class="fld"><label>Thời gian <span class="req">*</span></label>' +
        '<input type="text" id="smTime" required placeholder="VD: 00:00 hoặc 01h30" value="' + esc(curTime) + '"></div>' +

      '<div class="fld"><label>Nội dung mô tả</label>' +
        '<textarea id="smContent" rows="4" style="width:100%; padding:9px 12px; border:1px solid var(--border-gray); border-radius:6px; font-size:13.5px; font-family:inherit;" placeholder="Nhập nội dung mô tả lịch trình...">' + esc(curContent) + '</textarea></div>' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Được Kích Hoạt</label>' +
          '<div style="display:flex; gap:16px; align-items:center; margin-top:6px;">' +
            '<label style="font-weight:600; cursor:pointer;"><input type="radio" name="smActive" value="1"' + (curActive ? ' checked' : '') + '> Yes</label>' +
            '<label style="font-weight:600; cursor:pointer;"><input type="radio" name="smActive" value="0"' + (!curActive ? ' checked' : '') + '> No</label>' +
          '</div></div>' +
        '<div class="fld"><label>Đã Xóa</label>' +
          '<div style="display:flex; gap:16px; align-items:center; margin-top:6px;">' +
            '<label style="font-weight:600; cursor:pointer;"><input type="radio" name="smDeleted" value="1"' + (curDeleted ? ' checked' : '') + '> Yes</label>' +
            '<label style="font-weight:600; cursor:pointer;"><input type="radio" name="smDeleted" value="0"' + (!curDeleted ? ' checked' : '') + '> No</label>' +
          '</div></div>' +
      '</div>' +

      '<div class="modal-actions">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Hủy bỏ</button>' +
        '<button type="submit" class="btn btn-primary">Lưu lịch trình</button>' +
      '</div>' +
    '</form>'
  );
}

function adminSaveScheduleModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  var id = ($('smId') || {}).value || '';
  var time = ($('smTime') || {}).value || '';
  var content = ($('smContent') || {}).value || '';

  var activeRadio = document.querySelector('input[name="smActive"]:checked');
  var active = activeRadio ? (activeRadio.value === '1') : true;

  var deletedRadio = document.querySelector('input[name="smDeleted"]:checked');
  var deleted = deletedRadio ? (deletedRadio.value === '1') : false;

  if (!time.trim()) { showToast('Vui lòng nhập Thời gian.'); return; }

  var items = getScheduleItems();
  if (id) {
    var x = items.find(function (item) { return item.id === id; });
    if (x) {
      x.time = time.trim();
      x.content = content;
      x.active = active;
      x.deleted = deleted;
    }
  } else {
    var newId = 'sch_' + Date.now();
    items.push({
      id: newId,
      time: time.trim(),
      content: content,
      active: active,
      deleted: deleted
    });
  }

  saveScheduleItems(items);
  showToast('Đã lưu thông tin lịch trình.');
  closeAdminModal();
  renderScheduleView();
}

function adminToggleScheduleActive(id) {
  var items = getScheduleItems();
  var x = items.find(function (item) { return item.id === id; });
  if (!x) return;
  x.active = !x.active;
  saveScheduleItems(items);
  showToast((x.active ? 'Đã kích hoạt' : 'Đã tắt kích hoạt') + ' lịch trình ' + x.time);
  renderScheduleView();
}

function adminToggleScheduleDeleted(id) {
  var items = getScheduleItems();
  var x = items.find(function (item) { return item.id === item.id; });
  var itemToToggle = items.find(function (item) { return item.id === id; });
  if (!itemToToggle) return;
  itemToToggle.deleted = !itemToToggle.deleted;
  saveScheduleItems(items);
  showToast((itemToToggle.deleted ? 'Đã đánh dấu xóa' : 'Đã khôi phục') + ' lịch trình ' + itemToToggle.time);
  renderScheduleView();
}
