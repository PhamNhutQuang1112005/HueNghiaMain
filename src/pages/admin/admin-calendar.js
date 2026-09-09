/* =========================================================
   BỘ LỌC "NGÀY" DÙNG CHUNG cho Trung chuyển + Danh sách vé — cùng kiểu lịch chọn-ngày-bất-kỳ với
   #phCalendarPanel/#pkCalendarPanel bên TicketStaff (css dùng lại nguyên booking-ui/02-zone1.css,
   07-customer-history.css đã nạp trong admin.html), viết 1 bản DÙNG CHUNG theo "ns" (namespace) thay vì
   chép JS riêng cho từng view như TicketStaff — 2 view admin gọi lại đúng 1 bộ hàm này với ns khác nhau
   ("tk" = Danh sách vé, "ts" = Trung chuyển), DOM id theo mẫu "<ns>CalendarPanel"/"<ns>FilterDateBtn"/
   "<ns>FilterDateLabel"/"<ns>CalGrid"/"<ns>CalMonthLabel".
   ========================================================= */
var ADMIN_CAL_MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
var ADMIN_CAL_REGISTRY = {};

function pad2(n) { return String(n).padStart(2, '0'); }

function adminCalState(ns) {
  return ADMIN_CAL_REGISTRY[ns] || (ADMIN_CAL_REGISTRY[ns] = { calDate: new Date(), selectedStr: '', open: false, onChange: function () {} });
}
function adminCalInit(ns, onChange) { adminCalState(ns).onChange = onChange || function () {}; }

function adminCalRender(ns) {
  var st = adminCalState(ns);
  var grid = $(ns + 'CalGrid'), label = $(ns + 'CalMonthLabel');
  if (!grid || !label) return;
  var today = new Date();
  var y = st.calDate.getFullYear(), m = st.calDate.getMonth();
  label.textContent = ADMIN_CAL_MONTHS[m] + ', ' + y;
  var first = new Date(y, m, 1);
  var startOffset = (first.getDay() + 6) % 7;
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var daysInPrevMonth = new Date(y, m, 0).getDate();
  var html = '';
  ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });
  for (var i = 0; i < startOffset; i++) html += '<div class="cal-day muted">' + (daysInPrevMonth - startOffset + i + 1) + '</div>';
  for (var d = 1; d <= daysInMonth; d++) {
    var dateObj = new Date(y, m, d);
    var dateStr = y + '-' + pad2(m + 1) + '-' + pad2(d);
    var isToday = dateObj.toDateString() === today.toDateString();
    var isSelected = dateStr === st.selectedStr;
    html += '<div class="cal-day' + (isToday ? ' today' : '') + (isSelected ? ' selected' : '') + '" data-action="adminCalPickDate" data-args=\'["' + ns + '",' + y + ',' + m + ',' + d + ']\'>' + d + '</div>';
  }
  var totalCells = startOffset + daysInMonth;
  var trailing = (7 - (totalCells % 7)) % 7;
  for (var j = 1; j <= trailing; j++) html += '<div class="cal-day muted">' + j + '</div>';
  grid.innerHTML = html;
}

function adminCalUpdateTrigger(ns) {
  var st = adminCalState(ns);
  var label = $(ns + 'FilterDateLabel');
  if (!label) return;
  label.textContent = st.selectedStr ? fmtDate(st.selectedStr) : 'Tất cả ngày';
}

function adminCalShiftMonth(ns, dir) {
  var st = adminCalState(ns);
  st.calDate = new Date(st.calDate.getFullYear(), st.calDate.getMonth() + dir, 1);
  adminCalRender(ns);
}

function adminCalGoToday(ns) {
  var st = adminCalState(ns);
  var today = new Date();
  st.calDate = new Date(today);
  st.selectedStr = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
  adminCalRender(ns); adminCalUpdateTrigger(ns); adminCalToggle(ns, false); st.onChange(st.selectedStr);
}

function adminCalPickDate(ns, y, m, d) {
  var st = adminCalState(ns);
  st.selectedStr = y + '-' + pad2(m + 1) + '-' + pad2(d);
  adminCalRender(ns); adminCalUpdateTrigger(ns); adminCalToggle(ns, false); st.onChange(st.selectedStr);
}

function adminCalClear(ns) {
  var st = adminCalState(ns);
  st.selectedStr = '';
  adminCalRender(ns); adminCalUpdateTrigger(ns); adminCalToggle(ns, false); st.onChange('');
}

function adminCalToggle(ns, force) {
  var st = adminCalState(ns);
  var panel = $(ns + 'CalendarPanel'), btn = $(ns + 'FilterDateBtn');
  if (!panel || !btn) return;
  st.open = typeof force === 'boolean' ? force : !st.open;
  panel.classList.toggle('open', st.open);
  btn.classList.toggle('open', st.open);
  if (st.open) adminCalRender(ns);
}

document.addEventListener('click', function (e) {
  Object.keys(ADMIN_CAL_REGISTRY).forEach(function (ns) {
    var st = ADMIN_CAL_REGISTRY[ns];
    if (st.open && !e.target.closest('#' + ns + 'CalendarPanel') && !e.target.closest('#' + ns + 'FilterDateBtn')) {
      adminCalToggle(ns, false);
    }
  });
});

// Markup 1 ô lọc "Ngày" hoàn chỉnh (nhãn + nút + popover lịch) — dùng lại y hệt cho mọi view cần lọc ngày.
function adminCalFieldHtml(ns, labelText) {
  return '<div class="filter-field filter-field-date">' +
    '<label>' + esc(labelText) + '</label>' +
    '<button type="button" class="filter-select" id="' + ns + 'FilterDateBtn" data-action="adminCalToggle" data-args=\'["' + ns + '"]\'>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/></svg>' +
      '<span id="' + ns + 'FilterDateLabel">Tất cả ngày</span>' +
      '<svg class="filter-date-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>' +
    '</button>' +
    '<div class="calendar calendar-popover" id="' + ns + 'CalendarPanel">' +
      '<div class="cal-head">' +
        '<div class="cal-nav"><button type="button" data-action="adminCalShiftMonth" data-args=\'["' + ns + '",-1]\'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg></button></div>' +
        '<b id="' + ns + 'CalMonthLabel">Tháng 1, 2026</b>' +
        '<div class="cal-head-right">' +
          '<button type="button" class="cal-today-btn" data-action="adminCalClear" data-args=\'["' + ns + '"]\'>Tất cả</button>' +
          '<button type="button" class="cal-today-btn" data-action="adminCalGoToday" data-args=\'["' + ns + '"]\'>Hôm nay</button>' +
          '<div class="cal-nav"><button type="button" data-action="adminCalShiftMonth" data-args=\'["' + ns + '",1]\'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg></button></div>' +
        '</div>' +
      '</div>' +
      '<div class="cal-grid" id="' + ns + 'CalGrid"></div>' +
    '</div>' +
  '</div>';
}
