/* =========================================================
   SƠ ĐỒ BỐ TRÍ GHẾ XE (VEHICLE SEAT LAYOUTS)
   Giao diện chuẩn Admin đồng bộ 100% với hệ thống.
   ========================================================= */

var DEFAULT_SEAT_LAYOUTS = [
  { id: 1, name: 'Sơ đồ xe 34 giường', seats: 34, isDoubleDeck: true, active: true, deleted: false, content: 'Bố trí 34 giường 2 tầng cao cấp (Tầng 1: A1-A17, Tầng 2: B1-B17)' },
  { id: 2, name: 'Sơ đồ xe 36 giường', seats: 36, isDoubleDeck: true, active: true, deleted: false, content: 'Bố trí 36 giường 2 tầng (Tầng 1: 18 giường, Tầng 2: 18 giường)' },
  { id: 3, name: 'Sơ đồ xe 40 giường', seats: 40, isDoubleDeck: true, active: true, deleted: false, content: 'Bố trí 40 giường 2 tầng tiêu chuẩn' },
  { id: 4, name: 'Sơ đồ xe 41 giường', seats: 41, isDoubleDeck: true, active: true, deleted: false, content: 'Bố trí 41 giường 2 tầng' },
  { id: 5, name: 'Sơ đồ xe 44 giường', seats: 44, isDoubleDeck: true, active: true, deleted: false, content: 'Bố trí 44 giường 2 tầng' },
  { id: 6, name: 'Sơ đồ xe limousine 11 chỗ', seats: 11, isDoubleDeck: false, active: true, deleted: false, content: 'Xe Limousine 11 chỗ 1 tầng VIP' },
  { id: 7, name: 'Sơ đồ xe limousine 19 chỗ', seats: 19, isDoubleDeck: false, active: true, deleted: false, content: 'Xe Limousine 19 chỗ 1 tầng' },
  { id: 8, name: 'Sơ đồ xe limousine 28 chỗ', seats: 28, isDoubleDeck: false, active: true, deleted: false, content: 'Xe Limousine 28 chỗ 1 tầng' },
  { id: 9, name: 'Sơ đồ xe limousine 9 chỗ', seats: 9, isDoubleDeck: false, active: true, deleted: false, content: 'Xe Limousine 9 chỗ VIP 1 tầng' },
  { id: 10, name: 'Sơ đồ xe thường 16 chỗ', seats: 16, isDoubleDeck: false, active: true, deleted: false, content: 'Xe thường 16 chỗ 1 tầng' },
  { id: 11, name: 'Sơ đồ xe thường 26 chỗ', seats: 26, isDoubleDeck: false, active: true, deleted: false, content: 'Xe thường 26 chỗ 1 tầng' },
  { id: 12, name: 'Sơ đồ xe thường 28 chỗ', seats: 28, isDoubleDeck: false, active: true, deleted: false, content: 'Xe thường 28 chỗ 1 tầng' },
  { id: 13, name: 'Sơ đồ xe thường 47 chỗ', seats: 47, isDoubleDeck: true, active: true, deleted: false, content: 'Sơ đồ xe 47 chỗ 2 tầng' },
  { id: 14, name: 'Sơ đồ xe VIP 24 phòng', seats: 24, isDoubleDeck: true, active: true, deleted: false, content: 'Sơ đồ VIP 24 phòng cabin đôi 2 tầng' },
  { id: 15, name: 'Xe Tải', seats: 2, isDoubleDeck: false, active: true, deleted: false, content: 'Sơ đồ Xe tải chở hàng' },
  { id: 16, name: '76', seats: 76, isDoubleDeck: true, active: false, deleted: false, content: 'Sơ đồ xe 76 chỗ 2 tầng' },
  { id: 17, name: 'Sơ đồ xe limousine 18 chỗ', seats: 18, isDoubleDeck: false, active: true, deleted: false, content: 'Sơ đồ xe limousine 18 chỗ 1 tầng' }
];

var SEAT_LAYOUT_FILTERS = { search: '', isDoubleDeck: '', active: '', deleted: '' };

function getSeatLayouts() {
  return lsRead(HN_SEAT_LAYOUTS_KEY, DEFAULT_SEAT_LAYOUTS);
}

function saveSeatLayouts(list) {
  lsWrite(HN_SEAT_LAYOUTS_KEY, list);
}

function renderSeatLayoutsView() {
  var list = getSeatLayouts();
  var f = SEAT_LAYOUT_FILTERS;

  var totalCount = list.length;
  var doubleDeckCount = list.filter(function (x) { return x.isDoubleDeck; }).length;
  var singleDeckCount = list.filter(function (x) { return !x.isDoubleDeck; }).length;
  var activeCount = list.filter(function (x) { return x.active && !x.deleted; }).length;

  var filtered = list.filter(function (x) {
    if (!x) return false;
    if (f.search) {
      var kw = f.search.toLowerCase();
      var matchName = (x.name || '').toLowerCase().indexOf(kw) !== -1;
      var matchContent = (x.content || '').toLowerCase().indexOf(kw) !== -1;
      var matchSeats = String(x.seats || '').indexOf(kw) !== -1;
      if (!matchName && !matchContent && !matchSeats) return false;
    }
    if (f.isDoubleDeck === 'true' && !x.isDoubleDeck) return false;
    if (f.isDoubleDeck === 'false' && x.isDoubleDeck) return false;
    if (f.active === 'true' && !x.active) return false;
    if (f.active === 'false' && x.active) return false;
    if (f.deleted === 'true' && !x.deleted) return false;
    if (f.deleted === 'false' && x.deleted) return false;
    return true;
  });

  function getDeckBadge(isDoubleDeck, seats, content) {
    var text = isDoubleDeck ? 'Hai Tầng' : 'Một tầng';
    var title = 'Số ghế: ' + (seats || 0) + (content ? ' — ' + content : '');
    return '<span style="display:inline-flex; align-items:center; gap:4px; font-weight:600; color:var(--text-main);" title="' + esc(title) + '">' +
      text +
      ' <svg style="width:14px; height:14px; color:var(--text-sub); cursor:help;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' +
    '</span>';
  }

  function getActiveBadge(active) {
    if (active) {
      return '<span class="status-badge dang-ban"><span class="status-dot"></span>Được Kích Hoạt</span>';
    }
    return '<span class="status-badge da-huy"><span class="status-dot"></span>Chưa Kích Hoạt</span>';
  }

  function getDeletedBadge(deleted) {
    if (deleted) {
      return '<span class="status-badge da-huy"><span class="status-dot"></span>Đã Xóa</span>';
    }
    return '<span class="status-badge dang-ban"><span class="status-dot"></span>Chưa Xóa</span>';
  }

  var rowsHtml = filtered.length ? filtered.map(function (x, idx) {
    var realIdx = list.indexOf(x);

    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub); width:60px;">' + (idx + 1) + '</td>' +
      '<td>' +
        '<div style="font-weight:700; color:var(--black); font-size:14px;">' + esc(x.name) + '</div>' +
        '<div style="font-size:12px; color:var(--text-sub); line-height:1.3; margin-top:2px;">' + esc(x.content || (x.seats + ' ghế')) + '</div>' +
      '</td>' +
      '<td>' + getDeckBadge(x.isDoubleDeck, x.seats, x.content) + '</td>' +
      '<td style="text-align:center;">' + getActiveBadge(x.active) + '</td>' +
      '<td style="text-align:center;">' + getDeletedBadge(x.deleted) + '</td>' +
      '<td style="text-align:center;">' +
        '<div style="display:flex; align-items:center; justify-content:center; gap:6px;">' +
          '<button class="btn btn-sm" data-action="adminOpenSeatLayoutModal" data-args=\'[' + realIdx + ']\'>Sửa</button>' +
          '<button class="btn btn-sm" data-action="adminToggleSeatLayoutActive" data-args=\'[' + realIdx + ']\'>' + (x.active ? 'Tắt' : 'Bật') + '</button>' +
          '<button class="btn btn-sm btn-danger" data-action="adminDeleteSeatLayout" data-args=\'[' + realIdx + ']\'>Xoá</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="6" class="empty-state">Không tìm thấy sơ đồ ghế xe nào.</td></tr>';

  $('viewSeatLayouts').innerHTML =
    '<div class="seat-layouts-shell">' +
      '<!-- OVERVIEW STATS METRICS -->' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng số sơ đồ xe</div>' +
          '<div class="dir-stat-val">' + totalCount + '</div>' +
          '<div class="dir-stat-sub">Mẫu thiết kế ghế xe hệ thống</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Sơ đồ Hai Tầng</div>' +
          '<div class="dir-stat-val" style="color:var(--red);">' + doubleDeckCount + '</div>' +
          '<div class="dir-stat-sub">Xe giường nằm 2 tầng</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Sơ đồ Một Tầng</div>' +
          '<div class="dir-stat-val" style="color:#0284C7;">' + singleDeckCount + '</div>' +
          '<div class="dir-stat-sub">Xe ghế ngồi & Limousine 1 tầng</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Đang kích hoạt</div>' +
          '<div class="dir-stat-val" style="color:#059669;">' + activeCount + '</div>' +
          '<div class="dir-stat-sub">Sẵn sàng áp dụng cho chuyến</div>' +
        '</div>' +
      '</div>' +

      '<!-- FILTER TOOLBAR -->' +
      '<div class="filter-toolbar" style="margin-bottom:20px;">' +
        '<div class="filter-field">' +
          '<label>Tìm kiếm sơ đồ</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Tên sơ đồ, số ghế..." data-input-action="adminSeatLayoutFilterInput" data-args=\'["search","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Số tầng</label>' +
          '<select data-change-action="adminSeatLayoutFilterInput" data-args=\'["isDoubleDeck","__this_value__"]\'>' +
            '<option value="">Tất cả tầng</option>' +
            '<option value="true"' + (f.isDoubleDeck === 'true' ? ' selected' : '') + '>Hai Tầng</option>' +
            '<option value="false"' + (f.isDoubleDeck === 'false' ? ' selected' : '') + '>Một tầng</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Kích hoạt</label>' +
          '<select data-change-action="adminSeatLayoutFilterInput" data-args=\'["active","__this_value__"]\'>' +
            '<option value="">Tất cả trạng thái</option>' +
            '<option value="true"' + (f.active === 'true' ? ' selected' : '') + '>Được kích hoạt</option>' +
            '<option value="false"' + (f.active === 'false' ? ' selected' : '') + '>Chưa kích hoạt</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Đã xóa</label>' +
          '<select data-change-action="adminSeatLayoutFilterInput" data-args=\'["deleted","__this_value__"]\'>' +
            '<option value="">Tất cả</option>' +
            '<option value="false"' + (f.deleted === 'false' ? ' selected' : '') + '>Chưa xóa</option>' +
            '<option value="true"' + (f.deleted === 'true' ? ' selected' : '') + '>Đã xóa</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-spacer"></div>' +
        '<button class="btn btn-primary" data-action="adminOpenSeatLayoutModal" data-args=\'[-1]\'>+ Tạo Mới</button>' +
      '</div>' +

      '<!-- TABLE CARD -->' +
      '<div class="ref-card admin-table-card">' +
        '<div class="admin-table-wrap">' +
          '<table class="admin-table">' +
            '<thead>' +
              '<tr>' +
                '<th style="width:60px; text-align:center;">STT</th>' +
                '<th>Tên ⇕</th>' +
                '<th>Hai Tầng</th>' +
                '<th style="text-align:center;">Được Kích Hoạt</th>' +
                '<th style="text-align:center;">Đã Xóa</th>' +
                '<th style="text-align:center; width:160px;">Hành động</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function adminSeatLayoutFilterInput(key, val) {
  SEAT_LAYOUT_FILTERS[key] = val;
  renderSeatLayoutsView();
}

function adminOpenSeatLayoutModal(idx) {
  var list = getSeatLayouts();
  var item = idx >= 0 ? list[idx] : null;
  var title = item ? 'Cập nhật sơ đồ xe' : 'Tạo mới sơ đồ xe';

  openAdminModal(
    '<h3><svg style="width:20px; height:20px; vertical-align:-3px; margin-right:6px; color:var(--red);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' + esc(title) + '</h3>' +
    '<form class="admin-form" data-submit-action="adminSaveSeatLayout" data-args=\'["__event__"]\'>' +
      '<input type="hidden" id="slIdx" value="' + idx + '">' +

      '<div class="fld-row">' +
        '<div class="fld"><label>Tên <span class="req" style="color:var(--red);">*</span></label>' +
          '<input type="text" id="slName" required placeholder="VD: Sơ đồ xe 34 giường" value="' + (item ? esc(item.name) : '') + '"></div>' +
        '<div class="fld"><label>Số Lượng Ghế <span class="req" style="color:var(--red);">*</span></label>' +
          '<input type="number" id="slSeats" min="1" required placeholder="0" value="' + (item ? (item.seats || 0) : 0) + '"></div>' +
      '</div>' +

      '<div class="fld"><label>Nội dung <span class="req" style="color:var(--red);">*</span></label>' +
        '<textarea id="slContent" rows="4" required placeholder="Nhập chi tiết sơ đồ bố trí ghế..." style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:6px; font-family:inherit; font-size:13.5px; outline:none; transition:border-color 0.15s;">' + (item ? esc(item.content || '') : '') + '</textarea>' +
      '</div>' +

      '<div class="fld-row" style="margin-top:10px; padding:12px; background:var(--bg-sub); border-radius:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">' +
        '<div class="fld"><label style="margin-bottom:6px; font-weight:700;">Hai Tầng</label>' +
          '<div style="display:flex; align-items:center; gap:16px;">' +
            '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600;"><input type="radio" name="slIsDoubleDeck" value="1" ' + (item && item.isDoubleDeck ? 'checked' : '') + '> Yes</label>' +
            '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600;"><input type="radio" name="slIsDoubleDeck" value="0" ' + (!item || !item.isDoubleDeck ? 'checked' : '') + '> No</label>' +
          '</div>' +
        '</div>' +

        '<div class="fld"><label style="margin-bottom:6px; font-weight:700;">Được Kích Hoạt</label>' +
          '<div style="display:flex; align-items:center; gap:16px;">' +
            '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600;"><input type="radio" name="slActive" value="1" ' + (!item || item.active ? 'checked' : '') + '> Yes</label>' +
            '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600;"><input type="radio" name="slActive" value="0" ' + (item && !item.active ? 'checked' : '') + '> No</label>' +
          '</div>' +
        '</div>' +

        '<div class="fld"><label style="margin-bottom:6px; font-weight:700;">Đã Xóa</label>' +
          '<div style="display:flex; align-items:center; gap:16px;">' +
            '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600;"><input type="radio" name="slDeleted" value="1" ' + (item && item.deleted ? 'checked' : '') + '> Yes</label>' +
            '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600;"><input type="radio" name="slDeleted" value="0" ' + (!item || !item.deleted ? 'checked' : '') + '> No</label>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal-actions" style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">' +
        '<button type="button" class="btn btn-secondary" data-action="closeAdminModal" style="background:#00B259; color:#fff; border:none; display:inline-flex; align-items:center; gap:6px;"><svg style="width:16px; height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Lưu</button>' +
        '<button type="button" class="btn btn-primary" data-action="closeAdminModal" style="background:#007BFF; color:#fff; border:none; display:inline-flex; align-items:center; gap:6px;"><svg style="width:16px; height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Hủy Bỏ</button>' +
      '</div>' +
    '</form>',
    true
  );

  // Override submit logic manually when form submits
  var form = document.querySelector('#adminModalBox form');
  if (form) {
    form.onsubmit = function (e) {
      adminSaveSeatLayout(e);
    };
  }
}

function adminSaveSeatLayout(e) {
  if (e && e.preventDefault) e.preventDefault();
  var idx = parseInt($('slIdx').value, 10);
  var list = getSeatLayouts();
  var name = $('slName').value.trim();
  var seats = parseInt($('slSeats').value, 10) || 0;
  var content = $('slContent').value.trim();

  if (!name) { showToast('Vui lòng nhập tên sơ đồ.'); return; }
  if (seats <= 0) { showToast('Số lượng ghế phải lớn hơn 0.'); return; }

  var doubleDeckEl = document.querySelector('input[name="slIsDoubleDeck"]:checked');
  var activeEl = document.querySelector('input[name="slActive"]:checked');
  var deletedEl = document.querySelector('input[name="slDeleted"]:checked');

  var isDoubleDeck = doubleDeckEl ? doubleDeckEl.value === '1' : false;
  var active = activeEl ? activeEl.value === '1' : true;
  var deleted = deletedEl ? deletedEl.value === '1' : false;

  var rec = {
    id: idx >= 0 ? list[idx].id : Date.now(),
    name: name,
    seats: seats,
    content: content,
    isDoubleDeck: isDoubleDeck,
    active: active,
    deleted: deleted
  };

  if (idx >= 0) {
    var before = list[idx];
    list[idx] = rec;
    if (window.FleetStore && window.FleetStore.log) {
      window.FleetStore.log({ action: 'update', entity: 'seat_layout', entityId: name, summary: 'Sửa sơ đồ ghế xe ' + name, before: before, after: rec });
    }
  } else {
    list.push(rec);
    if (window.FleetStore && window.FleetStore.log) {
      window.FleetStore.log({ action: 'create', entity: 'seat_layout', entityId: name, summary: 'Tạo mới sơ đồ ghế xe ' + name, after: rec });
    }
  }

  saveSeatLayouts(list);
  closeAdminModal();
  showToast('Đã lưu sơ đồ xe.');
  renderSeatLayoutsView();
}

function adminToggleSeatLayoutActive(idx) {
  var list = getSeatLayouts();
  var item = list[idx];
  if (!item) return;
  item.active = !item.active;
  saveSeatLayouts(list);
  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: 'update', entity: 'seat_layout', entityId: item.name, summary: (item.active ? 'Kích hoạt' : 'Tắt kích hoạt') + ' sơ đồ ghế ' + item.name });
  }
  showToast('Đã cập nhật trạng thái kích hoạt.');
  renderSeatLayoutsView();
}

function adminDeleteSeatLayout(idx) {
  var list = getSeatLayouts();
  var item = list[idx];
  if (!item) return;
  if (!confirm('Bạn có chắc chắn muốn xóa sơ đồ xe "' + item.name + '"?')) return;
  list.splice(idx, 1);
  saveSeatLayouts(list);
  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: 'delete', entity: 'seat_layout', entityId: item.name, summary: 'Xóa sơ đồ ghế ' + item.name });
  }
  showToast('Đã xóa sơ đồ xe.');
  renderSeatLayoutsView();
}
