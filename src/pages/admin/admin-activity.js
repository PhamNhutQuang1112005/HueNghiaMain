/* =========================================================
   7. NHẬT KÝ HOẠT ĐỘNG (SYSTEM ACTIVITY LOGS)
   Giao diện chuẩn Admin đồng bộ 100% với hệ thống.
   Thống kê hoạt động, bộ lọc tìm kiếm theo người dùng, đối tượng,
   hành vi và khoảng thời gian.
   ========================================================= */

var ACT_FILTER = { search: '', entity: '', action: '', dateFrom: '', dateTo: '' };

function renderActivityView() {
  var rawList = window.FleetStore && typeof window.FleetStore.getActivity === 'function'
    ? window.FleetStore.getActivity()
    : lsRead(HN_ADMIN_ACTIVITY_KEY, []);

  var list = rawList.slice().reverse();

  var totalCount = list.length;
  var createCount = 0, updateCount = 0, deleteCount = 0;

  list.forEach(function (x) {
    if (!x) return;
    var act = String(x.action || '').toLowerCase();
    if (act.indexOf('create') !== -1 || act.indexOf('tạo') !== -1 || act.indexOf('bulk') !== -1) createCount++;
    else if (act.indexOf('delete') !== -1 || act.indexOf('xóa') !== -1 || act.indexOf('cancel') !== -1 || act.indexOf('hủy') !== -1) deleteCount++;
    else updateCount++;
  });

  var entities = uniq(list.map(function (x) { return x.entity; }).filter(Boolean));
  var actions = uniq(list.map(function (x) { return x.action; }).filter(Boolean));

  var f = ACT_FILTER;

  var filtered = list.filter(function (x) {
    if (!x) return false;
    if (f.entity && x.entity !== f.entity) return false;
    if (f.action && x.action !== f.action) return false;

    if (f.dateFrom) {
      var logDate = new Date(x.ts || 0).toISOString().slice(0, 10);
      if (logDate < f.dateFrom) return false;
    }
    if (f.dateTo) {
      var logDateTo = new Date(x.ts || 0).toISOString().slice(0, 10);
      if (logDateTo > f.dateTo) return false;
    }

    if (f.search) {
      var hay = (fmtStamp(x.ts) + ' ' + (x.user || '') + ' ' + (x.action || '') + ' ' + (x.entity || '') + ' ' + (x.summary || '')).toLowerCase();
      if (hay.indexOf(f.search.toLowerCase()) === -1) return false;
    }
    return true;
  });

  function getActionBadge(action) {
    var a = String(action || '').toLowerCase();
    if (a.indexOf('create') !== -1 || a.indexOf('tạo') !== -1 || a.indexOf('bulk') !== -1) {
      return '<span class="status-badge dang-ban"><span class="status-dot"></span>' + esc(action) + '</span>';
    }
    if (a.indexOf('delete') !== -1 || a.indexOf('xóa') !== -1 || a.indexOf('cancel') !== -1 || a.indexOf('hủy') !== -1) {
      return '<span class="status-badge da-huy"><span class="status-dot"></span>' + esc(action) + '</span>';
    }
    return '<span class="status-badge chua-chi-dinh"><span class="status-dot"></span>' + esc(action || 'Hoạt động') + '</span>';
  }

  function tableRow(x, idx) {
    var user = x.user || 'Quản trị viên';
    var initial = String(user).charAt(0).toUpperCase();

    return '<tr>' +
      '<td style="text-align:center; font-weight:700; color:var(--text-sub);">' + (idx + 1) + '</td>' +
      '<td><span style="font-family:\'Roboto Mono\', monospace; font-size:12.5px; color:var(--black); font-weight:600;">' + esc(fmtStamp(x.ts)) + '</span></td>' +
      '<td>' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
          '<div style="width:28px; height:28px; border-radius:50%; background:#64748B; color:#fff; font-weight:800; display:grid; place-items:center; font-size:12px;">' + initial + '</div>' +
          '<span style="font-weight:700; color:var(--black);">' + esc(user) + '</span>' +
        '</div>' +
      '</td>' +
      '<td>' + getActionBadge(x.action) + '</td>' +
      '<td>' +
        '<span style="font-weight:700; color:var(--text-main);">' + esc(x.entity || '—') + '</span>' +
        (x.entityId ? ' <span class="mono" style="color:var(--text-sub); font-size:11.5px;">#' + esc(x.entityId) + '</span>' : '') +
      '</td>' +
      '<td style="line-height:1.4; color:var(--text-main);">' + esc(x.summary || '—') + '</td>' +
    '</tr>';
  }

  var rowsHtml = filtered.length
    ? filtered.map(tableRow).join('')
    : '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-sub);">Chưa có hoạt động nào được ghi nhận.</td></tr>';

  var opt = function (arr, cur) {
    return '<option value="">Tất cả</option>' + arr.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  };

  $('viewActivity').innerHTML =
    '<div class="activity-shell">' +
      '<!-- OVERVIEW STATS METRICS -->' +
      '<div class="dir-stats-grid">' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tổng nhật ký hoạt động</div>' +
          '<div class="dir-stat-val">' + totalCount + ' <span class="ref-unit">bản ghi</span></div>' +
          '<div class="dir-stat-sub">Lịch sử tác vụ quản trị</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Tạo mới & Nhân bản</div>' +
          '<div class="dir-stat-val" style="color:#059669;">' + createCount + ' <span class="ref-unit">tác vụ</span></div>' +
          '<div class="dir-stat-sub">Thêm phơi, tuyến, xe, nhân sự</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card">' +
          '<div class="dir-stat-label">Cập nhật & Chỉnh sửa</div>' +
          '<div class="dir-stat-val" style="color:var(--black);">' + updateCount + ' <span class="ref-unit">tác vụ</span></div>' +
          '<div class="dir-stat-sub">Đổi thông tin & cấu hình</div>' +
        '</div>' +
        '<div class="ref-card dir-stat-card ref-card-featured" style="min-height:auto;">' +
          '<div class="ref-featured-head">Xóa & Hủy chuyến</div>' +
          '<div class="dir-stat-val" style="font-size:26px;color:#fff;">' + deleteCount + ' <span class="ref-unit" style="color:#fff;">tác vụ</span></div>' +
          '<div class="ref-featured-sub">Nhật ký hủy phơi/dữ liệu</div>' +
        '</div>' +
      '</div>' +

      '<!-- FILTER TOOLBAR -->' +
      '<div class="filter-toolbar" style="margin-bottom:20px;">' +
        '<div class="filter-field">' +
          '<label>Tìm kiếm nhật ký</label>' +
          '<input type="text" value="' + esc(f.search) + '" placeholder="Người thực hiện, hành động, đối tượng..." data-input-action="adminActFilterInput" data-args=\'["search","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Đối tượng</label>' +
          '<select data-change-action="adminActFilterInput" data-args=\'["entity","__this_value__"]\'>' + opt(entities, f.entity) + '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Hành động</label>' +
          '<select data-change-action="adminActFilterInput" data-args=\'["action","__this_value__"]\'>' + opt(actions, f.action) + '</select>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Từ ngày</label>' +
          '<input type="date" value="' + esc(f.dateFrom) + '" data-change-action="adminActFilterInput" data-args=\'["dateFrom","__this_value__"]\'>' +
        '</div>' +
        '<div class="filter-field">' +
          '<label>Đến ngày</label>' +
          '<input type="date" value="' + esc(f.dateTo) + '" data-change-action="adminActFilterInput" data-args=\'["dateTo","__this_value__"]\'>' +
        '</div>' +
        '<button type="button" class="btn" data-action="adminResetActFilters">Đặt lại</button>' +
        '<div class="filter-spacer"></div>' +
        '<button type="button" class="btn btn-secondary" data-action="adminClearActivityLogs">Xóa lịch sử nhật ký</button>' +
      '</div>' +

      '<!-- TABLE CARD -->' +
      '<div class="ref-card" style="padding:0; overflow:hidden;">' +
        '<div class="ref-card-header" style="padding:18px 22px; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">' +
          '<div style="font-size:15px; font-weight:800; color:var(--black);">Nhật ký hoạt động hệ thống</div>' +
          '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub);">Hiển thị ' + filtered.length + ' / ' + totalCount + ' bản ghi</div>' +
        '</div>' +
        '<div class="table-wrap" style="border:0; border-radius:0; box-shadow:none;">' +
          '<table class="admin-table">' +
            '<thead><tr>' +
              '<th style="width:50px; text-align:center;">STT</th>' +
              '<th style="width:160px;">Thời gian</th>' +
              '<th style="width:170px;">Người thực hiện</th>' +
              '<th style="width:150px;">Hành động</th>' +
              '<th style="width:150px;">Đối tượng</th>' +
              '<th>Tóm tắt chi tiết</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function adminActFilterInput(field, val) {
  if (field in ACT_FILTER) {
    ACT_FILTER[field] = val || '';
    renderActivityView();
  }
}

function adminResetActFilters() {
  ACT_FILTER = { search: '', entity: '', action: '', dateFrom: '', dateTo: '' };
  renderActivityView();
}

function adminClearActivityLogs() {
  if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử nhật ký hoạt động?')) return;
  lsWrite(HN_ADMIN_ACTIVITY_KEY, []);
  showToast('Đã xóa lịch sử nhật ký hoạt động.');
  renderActivityView();
}
