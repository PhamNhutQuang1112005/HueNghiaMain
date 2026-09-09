/* =========================================================
   SƠ ĐỒ GHẾ (SEAT LAYOUTS) — Admin
   Vẽ sơ đồ ghế trực quan, lấy dữ liệu từ trang tổng đài
   ========================================================= */

var DEFAULT_SEAT_LAYOUTS = [
  { id: 1,  name: 'Sơ đồ xe 34 giường',       seats: 34, isDoubleDeck: true,  active: true,  deleted: false, content: 'Bố trí 34 giường 2 tầng cao cấp (Tầng 1: A1-A17, Tầng 2: B1-B17)', hiddenSeats: ['A3','B3'] },
  { id: 2,  name: 'Sơ đồ xe 36 giường',       seats: 36, isDoubleDeck: true,  active: true,  deleted: false, content: 'Bố trí 36 giường 2 tầng (Tầng 1: 18 giường, Tầng 2: 18 giường)',   hiddenSeats: [] },
  { id: 3,  name: 'Sơ đồ xe 40 giường',       seats: 40, isDoubleDeck: true,  active: true,  deleted: false, content: 'Bố trí 40 giường 2 tầng tiêu chuẩn',                              hiddenSeats: [] },
  { id: 4,  name: 'Sơ đồ xe 41 giường',       seats: 41, isDoubleDeck: true,  active: true,  deleted: false, content: 'Bố trí 41 giường 2 tầng',                                        hiddenSeats: [] },
  { id: 5,  name: 'Sơ đồ xe 44 giường',       seats: 44, isDoubleDeck: true,  active: true,  deleted: false, content: 'Bố trí 44 giường 2 tầng',                                        hiddenSeats: [] },
  { id: 6,  name: 'Sơ đồ xe limousine 11 chỗ',seats: 11, isDoubleDeck: false, active: true,  deleted: false, content: 'Xe Limousine 11 chỗ 1 tầng VIP',                                 hiddenSeats: [] },
  { id: 7,  name: 'Sơ đồ xe limousine 19 chỗ',seats: 19, isDoubleDeck: false, active: true,  deleted: false, content: 'Xe Limousine 19 chỗ 1 tầng',                                     hiddenSeats: [] },
  { id: 8,  name: 'Sơ đồ xe limousine 28 chỗ',seats: 28, isDoubleDeck: false, active: true,  deleted: false, content: 'Xe Limousine 28 chỗ 1 tầng',                                     hiddenSeats: [] },
  { id: 9,  name: 'Sơ đồ xe limousine 9 chỗ', seats: 9,  isDoubleDeck: false, active: true,  deleted: false, content: 'Xe Limousine 9 chỗ VIP 1 tầng',                                  hiddenSeats: [] },
  { id: 10, name: 'Sơ đồ xe thường 16 chỗ',   seats: 16, isDoubleDeck: false, active: true,  deleted: false, content: 'Xe thường 16 chỗ 1 tầng',                                        hiddenSeats: [] },
  { id: 11, name: 'Sơ đồ xe thường 26 chỗ',   seats: 26, isDoubleDeck: false, active: true,  deleted: false, content: 'Xe thường 26 chỗ 1 tầng',                                        hiddenSeats: [] },
  { id: 12, name: 'Sơ đồ xe thường 28 chỗ',   seats: 28, isDoubleDeck: false, active: true,  deleted: false, content: 'Xe thường 28 chỗ 1 tầng',                                        hiddenSeats: [] },
  { id: 13, name: 'Sơ đồ xe thường 47 chỗ',   seats: 47, isDoubleDeck: true,  active: true,  deleted: false, content: 'Sơ đồ xe 47 chỗ 2 tầng',                                        hiddenSeats: [] },
  { id: 14, name: 'Sơ đồ xe VIP 24 phòng',    seats: 24, isDoubleDeck: true,  active: true,  deleted: false, content: 'Sơ đồ VIP 24 phòng cabin đôi 2 tầng',                           hiddenSeats: [] },
  { id: 15, name: 'Xe Tải',                    seats: 2,  isDoubleDeck: false, active: true,  deleted: false, content: 'Sơ đồ Xe tải chở hàng',                                         hiddenSeats: [] },
  { id: 16, name: '76',                        seats: 76, isDoubleDeck: true,  active: false, deleted: false, content: 'Sơ đồ xe 76 chỗ 2 tầng',                                        hiddenSeats: [] },
  { id: 17, name: 'Sơ đồ xe limousine 18 chỗ',seats: 18, isDoubleDeck: false, active: true,  deleted: false, content: 'Sơ đồ xe limousine 18 chỗ 1 tầng',                              hiddenSeats: [] }
];

var SEAT_LAYOUT_FILTERS = { search: '', isDoubleDeck: '', active: '' };

/* ---------------------------------------------------------
   STORAGE
   --------------------------------------------------------- */
function getSeatLayouts() {
  return lsRead(HN_SEAT_LAYOUTS_KEY, DEFAULT_SEAT_LAYOUTS);
}
function saveSeatLayouts(list) {
  lsWrite(HN_SEAT_LAYOUTS_KEY, list);
}

/* ---------------------------------------------------------
   HELPERS — sinh mã ghế cho preview & editor
   Dùng lại logic của seat-bank.js (đã nạp trước)
   --------------------------------------------------------- */
function slBuildCodes(seats, hiddenSeats) {
  var hidden = hiddenSeats || [];
  var downCount = Math.ceil(seats / 2);
  var upCount   = seats - downCount;
  var down = [];
  var up   = [];
  for (var i = 1; i <= downCount; i++) {
    var c = 'A' + i;
    down.push({ code: c, hidden: hidden.indexOf(c) !== -1 });
  }
  for (var j = 1; j <= upCount; j++) {
    var cu = 'B' + j;
    up.push({ code: cu, hidden: hidden.indexOf(cu) !== -1 });
  }
  return { down: down, up: up };
}

/* Mini preview sơ đồ nhỏ hiển thị trong card danh sách */
function slMiniPreview(layout) {
  var seats      = layout.seats || 1;
  var hidden     = layout.hiddenSeats || [];
  var dbl        = layout.isDoubleDeck;
  var codes      = slBuildCodes(seats, hidden);

  function renderFloor(arr, floorLabel) {
    var cells = arr.map(function(s) {
      if (s.hidden) return '<span class="sl-mini-cell sl-mini-hidden"></span>';
      return '<span class="sl-mini-cell"></span>';
    }).join('');
    return '<div class="sl-mini-floor">' +
             '<span class="sl-mini-floor-lbl">' + floorLabel + '</span>' +
             '<div class="sl-mini-grid">' + cells + '</div>' +
           '</div>';
  }

  var html = '<div class="sl-mini-wrap">';
  if (dbl) {
    html += renderFloor(codes.down, 'T1');
    html += renderFloor(codes.up,   'T2');
  } else {
    html += renderFloor(codes.down, '');
  }
  html += '</div>';
  return html;
}

/* ---------------------------------------------------------
   MAIN LIST VIEW
   --------------------------------------------------------- */
function renderSeatLayoutsView() {
  var list = getSeatLayouts();
  var f = SEAT_LAYOUT_FILTERS;

  var filtered = list.filter(function(x) {
    if (!x) return false;
    if (f.search) {
      var kw = f.search.toLowerCase();
      if ((x.name || '').toLowerCase().indexOf(kw) === -1 &&
          String(x.seats || '').indexOf(kw) === -1 &&
          (x.content || '').toLowerCase().indexOf(kw) === -1) return false;
    }
    if (f.isDoubleDeck === 'true'  && !x.isDoubleDeck) return false;
    if (f.isDoubleDeck === 'false' &&  x.isDoubleDeck) return false;
    if (f.active === 'true'  && !x.active) return false;
    if (f.active === 'false' &&  x.active) return false;
    return true;
  });

  /* Grid thẻ layout */
  var cardsHtml = filtered.length ? filtered.map(function(x) {
    var realIdx  = list.indexOf(x);
    var deckText = x.isDoubleDeck ? '2 tầng' : '1 tầng';
    var deckColor= x.isDoubleDeck ? 'var(--red)' : '#0284C7';
    var activeBadge = x.active
      ? '<span class="status-badge dang-ban"><span class="status-dot"></span>Kích hoạt</span>'
      : '<span class="status-badge da-huy"><span class="status-dot"></span>Tắt</span>';
    var hiddenCount = (x.hiddenSeats || []).length;
    var hiddenNote  = hiddenCount > 0
      ? '<span style="font-size:11px;color:var(--text-sub);font-weight:600;">' + hiddenCount + ' ô ẩn</span>'
      : '';

    return '<div class="sl-card ref-card">' +
      /* header */
      '<div class="sl-card-head">' +
        '<div class="sl-card-title">' + esc(x.name) + '</div>' +
        '<div class="sl-card-badges">' +
          activeBadge +
          '<span class="sl-deck-badge" style="color:' + deckColor + ';">' + deckText + '</span>' +
        '</div>' +
      '</div>' +
      /* preview */
      '<div class="sl-card-preview">' +
        slMiniPreview(x) +
        '<div class="sl-card-stats">' +
          '<span class="sl-stat"><b>' + (x.seats || 0) + '</b> ghế</span>' +
          hiddenNote +
        '</div>' +
      '</div>' +
      /* description */
      (x.content ? '<div class="sl-card-desc">' + esc(x.content) + '</div>' : '') +
      /* actions */
      '<div class="sl-card-actions">' +
        '<button class="btn btn-sm btn-primary" data-action="adminOpenSeatLayoutModal" data-args=\'[' + realIdx + ']\'>Sửa / Vẽ sơ đồ</button>' +
        '<button class="btn btn-sm" data-action="adminToggleSeatLayoutActive" data-args=\'[' + realIdx + ']\'>' + (x.active ? 'Tắt' : 'Bật') + '</button>' +
        '<button class="btn btn-sm btn-danger" data-action="adminDeleteSeatLayout" data-args=\'[' + realIdx + ']\'>Xoá</button>' +
      '</div>' +
    '</div>';
  }).join('') : '<div class="empty-state" style="padding:60px 0;text-align:center;color:var(--text-sub);">Không tìm thấy sơ đồ ghế xe nào.</div>';

  $('viewSeatLayouts').innerHTML =
    '<div class="seat-layouts-shell">' +

      '<!-- FILTER TOOLBAR -->' +
      '<div class="filter-toolbar" style="margin-bottom:20px;">' +
        '<div class="filter-field">' +
          '<label>Tìm kiếm</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Tên sơ đồ, số ghế..." data-input-action="adminSeatLayoutFilterInput" data-args=\'["search","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Số tầng</label>' +
          '<select data-change-action="adminSeatLayoutFilterInput" data-args=\'["isDoubleDeck","__this_value__"]\'>' +
            '<option value="">Tất cả</option>' +
            '<option value="true"'  + (f.isDoubleDeck === 'true'  ? ' selected' : '') + '>2 tầng</option>' +
            '<option value="false"' + (f.isDoubleDeck === 'false' ? ' selected' : '') + '>1 tầng</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Trạng thái</label>' +
          '<select data-change-action="adminSeatLayoutFilterInput" data-args=\'["active","__this_value__"]\'>' +
            '<option value="">Tất cả</option>' +
            '<option value="true"'  + (f.active === 'true'  ? ' selected' : '') + '>Kích hoạt</option>' +
            '<option value="false"' + (f.active === 'false' ? ' selected' : '') + '>Tắt</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-spacer"></div>' +
        '<button class="btn btn-primary" data-action="adminOpenSeatLayoutModal" data-args=\'[-1]\'>+ Tạo sơ đồ mới</button>' +
      '</div>' +

      '<div class="sl-card-grid">' + cardsHtml + '</div>' +
    '</div>';
}

function adminSeatLayoutFilterInput(key, val) {
  SEAT_LAYOUT_FILTERS[key] = val;
  renderSeatLayoutsView();
}

/* ---------------------------------------------------------
   MODAL — TẠO MỚI / SỬA SƠ ĐỒ GHẾ
   Form thông tin + preview sơ đồ ghế live trong 1 modal.
   Nhập số ghế → sơ đồ cập nhật ngay.
   Click ô ghế → ẩn/hiện ghế đó.
   --------------------------------------------------------- */

/* State dùng chung cho cả tạo mới lẫn chỉnh sửa */
var _slEditorState = {
  idx:         -1,       /* -1 = tạo mới */
  seats:       0,
  isDoubleDeck:true,
  hiddenSeats: [],       /* mã ghế đang ẩn */
  seatNames:   {},       /* tên tuỳ chỉnh: { "A1": "VIP1", ... } */
  isDragging:  false,
  dragMode:    'hide'
};

/* Mở modal tạo mới */
function adminOpenSeatLayoutModal(idx) {
  var list = getSeatLayouts();
  var item = idx >= 0 ? list[idx] : null;

  _slEditorState.idx          = idx;
  _slEditorState.seats        = item ? (item.seats || 36) : 0;
  _slEditorState.isDoubleDeck = item ? !!item.isDoubleDeck : true;
  _slEditorState.hiddenSeats  = item ? (item.hiddenSeats || []).slice() : [];
  _slEditorState.seatNames    = item ? Object.assign({}, item.seatNames || {}) : {};
  _slEditorState.isDragging   = false;

  openAdminModal(_slBuildCombinedHtml(item), false, true);
  /* Dùng setTimeout 0 để chờ DOM modal render xong mới gắn events + render grid */
  setTimeout(function() {
    _slAttachFormEvents();
    if (_slEditorState.seats > 0) {
      _slRenderGrid();
      _slEditorAttachEvents();
    }
  }, 0);
}

/* Alias — nút "Vẽ sơ đồ" trên card cũng mở cùng modal này */
function adminOpenSeatLayoutEditor(idx) {
  adminOpenSeatLayoutModal(idx);
}

/* Xây dựng HTML modal tổng hợp */
function _slBuildCombinedHtml(item) {
  var isNew   = !item;
  var seats   = _slEditorState.seats;
  var dbl     = _slEditorState.isDoubleDeck;
  var hidden  = _slEditorState.hiddenSeats;
  var visible = seats - hidden.length;
  var title   = isNew ? 'Tạo sơ đồ ghế mới' : 'Chỉnh sửa — ' + esc(item.name);

  var counterHtml = seats > 0
    ? visible + ' ghế · ' + (dbl ? '2 tầng' : '1 tầng') +
      (hidden.length > 0 ? ' · <span style="color:#F59E0B;">' + hidden.length + ' ẩn</span>' : '')
    : 'Nhập số ghế để xem sơ đồ';

  return (
    '<h3 style="display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
      '<span>' +
        '<svg style="width:20px;height:20px;vertical-align:-3px;margin-right:6px;color:var(--red);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>' +
        title +
      '</span>' +
      '<span id="slCounter" style="font-size:13px;font-weight:600;color:var(--text-sub);">' + counterHtml + '</span>' +
    '</h3>' +

    '<div class="admin-form" style="padding-top:8px;display:flex;flex-direction:column;gap:12px;min-height:0;">' +

      /* ── Hàng 1: Tên + Số ghế + Tầng ── */
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">' +
        '<div class="fld" style="flex:1 1 200px;margin:0;">' +
          '<label>Tên sơ đồ <span style="color:var(--red);">*</span></label>' +
          '<input type="text" id="slName" placeholder="VD: Sơ đồ xe 34 giường" value="' + (item ? esc(item.name) : '') + '">' +
        '</div>' +
        '<div class="fld" style="width:110px;flex-shrink:0;margin:0;">' +
          '<label>Số ghế <span style="color:var(--red);">*</span></label>' +
          '<input type="number" id="slSeats" min="1" max="200" placeholder="34" value="' + (item ? (item.seats || '') : '') + '" style="text-align:center;width:100%;height:38px;min-width:0;">' +
        '</div>' +
        '<div class="fld" style="margin:0;flex-shrink:0;">' +
          '<label>Số tầng</label>' +
          '<div class="radio-inline" style="height:38px;">' +
            '<label><input type="radio" name="slDeck" value="2" ' + (dbl ? 'checked' : '') + '> 2 tầng</label>' +
            '<label><input type="radio" name="slDeck" value="1" ' + (!dbl ? 'checked' : '') + '> 1 tầng</label>' +
          '</div>' +
        '</div>' +
        '<div class="fld" style="margin:0;flex-shrink:0;">' +
          '<label>Kích hoạt</label>' +
          '<div class="radio-inline" style="height:38px;">' +
            '<label><input type="radio" name="slActive" value="1" ' + (!item || item.active ? 'checked' : '') + '> Bật</label>' +
            '<label><input type="radio" name="slActive" value="0" ' + (item && !item.active ? 'checked' : '') + '> Tắt</label>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── Hàng 2: Mô tả ── */
      '<div class="fld" style="margin:0;">' +
        '<label>Mô tả</label>' +
        '<input type="text" id="slContent" placeholder="Mô tả ngắn bố trí ghế..." value="' + (item ? esc(item.content || '') : '') + '">' +
      '</div>' +

      /* ── Legend ── */
      '<div class="sl-editor-legend" id="slLegend" style="' + (seats > 0 ? '' : 'display:none;') + '">' +
        '<div class="sl-editor-legend-item"><span class="sl-editor-legend-dot sl-normal"></span>Ghế bình thường</div>' +
        '<div class="sl-editor-legend-item"><span class="sl-editor-legend-dot sl-hidden-dot"></span>Ô ẩn</div>' +
        '<div class="sl-editor-legend-item"><span class="sl-editor-legend-dot sl-custom-dot"></span>Tên tuỳ chỉnh</div>' +
        '<button type="button" class="btn btn-sm" style="margin-left:auto;" onclick="adminSeatLayoutEditorReset()">' +
          '<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:3px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.65"/></svg>' +
          'Đặt lại' +
        '</button>' +
        '<span style="font-size:12px;color:var(--text-sub);">Click để ẩn · Double-click để đổi tên</span>' +
      '</div>' +

      /* ── Grid sơ đồ ghế ── */
      '<div class="sl-editor-body" id="slEditorBody">' +
        (seats > 0
          ? ''  /* sẽ render bằng _slRenderGrid() */
          : '<div style="padding:40px 0;text-align:center;color:var(--text-sub);font-size:13px;">Nhập số ghế ở trên để hiện sơ đồ</div>') +
      '</div>' +

      /* ── Hành động ── */
      '<div class="modal-actions" style="flex:0 0 auto;">' +
        '<button type="button" class="btn" data-action="closeAdminModal">Huỷ</button>' +
        '<button type="button" class="btn btn-primary" onclick="adminSaveSeatLayout()">Lưu sơ đồ</button>' +
      '</div>' +
    '</div>'
  );
}

/* Gắn event lắng nghe thay đổi form (số ghế, số tầng) → re-render grid */
function _slAttachFormEvents() {
  var seatsInput = document.getElementById('slSeats');
  if (seatsInput) {
    seatsInput.addEventListener('input', function() {
      var v = parseInt(this.value, 10) || 0;
      if (v === _slEditorState.seats) return;
      /* Khi đổi số ghế → reset hiddenSeats vì mã ghế thay đổi */
      _slEditorState.seats = v;
      _slEditorState.hiddenSeats = [];
      _slRenderGrid();
      _slEditorAttachEvents();
    });
  }

  document.querySelectorAll('input[name="slDeck"]').forEach(function(r) {
    r.addEventListener('change', function() {
      _slEditorState.isDoubleDeck = (this.value === '2');
      _slEditorState.hiddenSeats = [];
      _slRenderGrid();
      _slEditorAttachEvents();
    });
  });
}

/* Render (hoặc re-render) phần grid bên trong #slEditorBody */
function _slRenderGrid() {
  var body = document.getElementById('slEditorBody');
  var legend = document.getElementById('slLegend');
  if (!body) return;

  var seats  = _slEditorState.seats;
  var dbl    = _slEditorState.isDoubleDeck;
  var hidden = _slEditorState.hiddenSeats;

  if (seats <= 0) {
    body.innerHTML = '<div style="padding:40px 0;text-align:center;color:var(--text-sub);font-size:13px;">Nhập số ghế ở trên để hiện sơ đồ</div>';
    if (legend) legend.style.display = 'none';
    _slUpdateCounter();
    return;
  }

  if (legend) legend.style.display = '';

  var codes = slBuildCodes(seats, hidden);
  var useCols3 = seats > 24;

  function floorHtml(arr, floorLabel) {
    var cells = arr.map(function(s) {
      var cls = 'sl-editor-cell' + (s.hidden ? ' sl-editor-hidden' : '');
      var displayName = _slEditorState.seatNames[s.code] || s.code;
      var isCustom = !!_slEditorState.seatNames[s.code];
      return '<div class="' + cls + '" data-seat="' + s.code + '">' +
               '<span class="sl-editor-cell-code' + (isCustom ? ' sl-custom-name' : '') + '">' +
                 displayName +
               '</span>' +
             '</div>';
    }).join('');
    var lbl = floorLabel ? '<div class="sl-editor-floor-label">' + floorLabel + '</div>' : '';
    var gridCls = 'sl-editor-grid' + (useCols3 ? ' sl-cols-3' : '');
    return '<div class="sl-editor-floor">' + lbl + '<div class="' + gridCls + '">' + cells + '</div></div>';
  }

  body.innerHTML = '<div class="sl-editor-floors">' +
    (dbl
      ? floorHtml(codes.down, 'TẦNG DƯỚI') + floorHtml(codes.up, 'TẦNG TRÊN')
      : floorHtml(codes.down, '')) +
  '</div>';

  _slUpdateCounter();
}

/* Cập nhật dòng counter trong tiêu đề */
function _slUpdateCounter() {
  var el = document.getElementById('slCounter');
  if (!el) return;
  var seats   = _slEditorState.seats;
  var hidden  = _slEditorState.hiddenSeats;
  var visible = seats - hidden.length;
  var dbl     = _slEditorState.isDoubleDeck;
  if (seats <= 0) {
    el.innerHTML = 'Nhập số ghế để xem sơ đồ';
    return;
  }
  el.innerHTML = visible + ' ghế · ' + (dbl ? '2 tầng' : '1 tầng') +
    (hidden.length > 0 ? ' · <span style="color:#F59E0B;">' + hidden.length + ' ẩn</span>' : '');
}

/* Gắn mouse events vào grid */
function _slEditorAttachEvents() {
  var body = document.getElementById('slEditorBody');
  if (!body) return;

  /* ── Double-click: đổi tên ô ghế ── */
  body.addEventListener('dblclick', function(e) {
    var cell = e.target.closest('.sl-editor-cell');
    if (!cell) return;
    e.preventDefault();
    e.stopPropagation();
    _slEditorState.isDragging = false; /* huỷ drag nếu đang kéo */

    var code = cell.getAttribute('data-seat');
    var currentName = _slEditorState.seatNames[code] || code;
    var codeSpan = cell.querySelector('.sl-editor-cell-code');

    /* Chuyển span thành input inline */
    var input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'sl-editor-rename-input';
    input.maxLength = 10;
    codeSpan.style.display = 'none';
    cell.appendChild(input);
    input.focus();
    input.select();

    function commit() {
      var newName = input.value.trim();
      if (newName && newName !== code) {
        _slEditorState.seatNames[code] = newName;
      } else if (!newName || newName === code) {
        delete _slEditorState.seatNames[code];
      }
      /* Xoá input, khôi phục span với tên mới */
      var displayName = _slEditorState.seatNames[code] || code;
      var isCustom = !!_slEditorState.seatNames[code];
      codeSpan.textContent = displayName;
      codeSpan.className = 'sl-editor-cell-code' + (isCustom ? ' sl-custom-name' : '');
      codeSpan.style.display = '';
      input.remove();
    }

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter')  { commit(); }
      if (ev.key === 'Escape') {
        codeSpan.style.display = '';
        input.remove();
      }
    });
  });

  /* ── Single-click + drag: ẩn/hiện ô ── */
  /* Xử lý 1 ô */
  function toggleCell(el) {
    var code = el.getAttribute('data-seat');
    if (!code) return;
    /* Nếu đang có input đổi tên trong ô này → bỏ qua */
    if (el.querySelector('.sl-editor-rename-input')) return;
    var idx = _slEditorState.hiddenSeats.indexOf(code);
    if (_slEditorState.dragMode === 'hide') {
      if (idx === -1) _slEditorState.hiddenSeats.push(code);
    } else {
      if (idx !== -1) _slEditorState.hiddenSeats.splice(idx, 1);
    }
    el.classList.toggle('sl-editor-hidden', _slEditorState.hiddenSeats.indexOf(code) !== -1);
    _slUpdateCounter();
  }

  body.addEventListener('mousedown', function(e) {
    var cell = e.target.closest('.sl-editor-cell');
    if (!cell) return;
    e.preventDefault();
    var code = cell.getAttribute('data-seat');
    /* Xác định dragMode theo trạng thái hiện tại của ô đầu tiên bấm */
    _slEditorState.dragMode = _slEditorState.hiddenSeats.indexOf(code) === -1 ? 'hide' : 'show';
    _slEditorState.isDragging = true;
    toggleCell(cell);
  });

  body.addEventListener('mousemove', function(e) {
    if (!_slEditorState.isDragging) return;
    var cell = e.target.closest('.sl-editor-cell');
    if (!cell) return;
    toggleCell(cell);
  });

  document.addEventListener('mouseup', function _onUp() {
    _slEditorState.isDragging = false;
    document.removeEventListener('mouseup', _onUp);
  }, { once: true });
}

/* Đặt lại — hiện tất cả ô */
function adminSeatLayoutEditorReset() {
  _slEditorState.hiddenSeats = [];
  _slEditorState.seatNames   = {};
  _slRenderGrid();
  _slEditorAttachEvents();
}

/* Lưu sơ đồ */
function adminSaveSeatLayout() {
  var list    = getSeatLayouts();
  var idx     = _slEditorState.idx;
  var name    = (document.getElementById('slName')    || {}).value || '';
  var seats   = parseInt((document.getElementById('slSeats')   || {}).value, 10) || 0;
  var content = (document.getElementById('slContent') || {}).value || '';
  name    = name.trim();
  content = content.trim();

  if (!name)      { showToast('Vui lòng nhập tên sơ đồ.'); return; }
  if (seats <= 0) { showToast('Số ghế phải lớn hơn 0.');   return; }

  var deckEl   = document.querySelector('input[name="slDeck"]:checked');
  var activeEl = document.querySelector('input[name="slActive"]:checked');
  var isDoubleDeck = deckEl   ? deckEl.value === '2'   : true;
  var active       = activeEl ? activeEl.value === '1' : true;

  var existing = idx >= 0 ? list[idx] : null;
  var rec = {
    id:          existing ? existing.id : Date.now(),
    name:        name,
    seats:       seats,
    content:     content,
    isDoubleDeck:isDoubleDeck,
    active:      active,
    deleted:     existing ? (existing.deleted || false) : false,
    hiddenSeats: _slEditorState.hiddenSeats.slice(),
    seatNames:   Object.assign({}, _slEditorState.seatNames)
  };

  if (idx >= 0) {
    var before = list[idx];
    list[idx] = rec;
    if (window.FleetStore && window.FleetStore.log) {
      window.FleetStore.log({ action: 'update', entity: 'seat_layout', entityId: name,
        summary: 'Sửa sơ đồ ghế ' + name, before: before, after: rec });
    }
  } else {
    list.push(rec);
    if (window.FleetStore && window.FleetStore.log) {
      window.FleetStore.log({ action: 'create', entity: 'seat_layout', entityId: name,
        summary: 'Tạo mới sơ đồ ghế ' + name, after: rec });
    }
  }

  saveSeatLayouts(list);
  closeAdminModal();
  showToast('Đã lưu sơ đồ ghế.');
  renderSeatLayoutsView();
}

/* Alias cũ */
function adminSeatLayoutEditorSave() { adminSaveSeatLayout(); }

/* ---------------------------------------------------------
   CRUD HELPERS
   --------------------------------------------------------- */
function adminToggleSeatLayoutActive(idx) {
  var list = getSeatLayouts();
  var item = list[idx];
  if (!item) return;
  item.active = !item.active;
  saveSeatLayouts(list);
  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: 'update', entity: 'seat_layout', entityId: item.name,
      summary: (item.active ? 'Kích hoạt' : 'Tắt kích hoạt') + ' sơ đồ ghế ' + item.name });
  }
  showToast('Đã cập nhật trạng thái.');
  renderSeatLayoutsView();
}

function adminDeleteSeatLayout(idx) {
  var list = getSeatLayouts();
  var item = list[idx];
  if (!item) return;
  if (!confirm('Bạn có chắc chắn muốn xóa sơ đồ "' + item.name + '"?')) return;
  list.splice(idx, 1);
  saveSeatLayouts(list);
  if (window.FleetStore && window.FleetStore.log) {
    window.FleetStore.log({ action: 'delete', entity: 'seat_layout', entityId: item.name,
      summary: 'Xóa sơ đồ ghế ' + item.name });
  }
  showToast('Đã xóa sơ đồ.');
  renderSeatLayoutsView();
}


