// js/ticketstaff-manifest-ui.js — Render UI + modal + event handlers cho tính năng vòng đời chuyến xe.
// Đọc/ghi state LUÔN thông qua các hàm ở js/ticketstaff-manifest-core.js (không tự ý localStorage/DOM
// lung tung ở đây). Nạp SAU cả ticketstaff.js lẫn ticketstaff-manifest-core.js.
//
// File này override 1 vài hàm đã có sẵn ở ticketstaff.js (openDepartModal/confirmDepart/selectTrip/
// onSeatClick) bằng cách khai báo lại cùng tên ở phạm vi global — script nạp sau nên hàm sau thắng,
// không cần sửa trực tiếp ticketstaff.js (giảm rủi ro đụng vào luồng bán vé đang chạy tốt).

/* ===================== 1. RENDER: BADGE TRẠNG THÁI + NÚT HÀNH ĐỘNG THEO STATE ===================== */

function renderTripLifecycleUI() {
  const badge = document.getElementById('tripStatusBadge');
  const actionsBox = document.getElementById('tripLifecycleActions');
  if (!badge || !actionsBox || typeof currentTripId === 'undefined' || !currentTripId) return;

  const status = getTripLifecycleStatus(currentTripId);

  // Nhãn badge lấy từ trạng thái hiển thị THỐNG NHẤT (dùng chung với thẻ danh sách Phơi xe) — không
  // còn luôn hiện "Đang bán" cho mọi chuyến chưa tạo phơi mà phân biệt Chưa/Đã chỉ định xe/Đang bán.
  if (typeof tripDisplayStatusKey === 'function') {
    const dispKey = tripDisplayStatusKey(currentTripId);
    const dispMeta = TRIP_DISPLAY_STATUS[dispKey] || TRIP_DISPLAY_STATUS['chua-chi-dinh'];
    badge.textContent = dispMeta.label;
    badge.className = 'trip-status-badge ' + dispMeta.zone2;
  } else {
    const meta = TRIP_STATUS_META[status] || TRIP_STATUS_META.SELLING;
    badge.textContent = meta.label;
    badge.className = 'trip-status-badge ' + meta.cssClass;
  }

  // Nút vòng đời vẫn theo state-machine phơi (SELLING/DEPARTED/...) — không đổi.
  actionsBox.innerHTML = tsBuildLifecycleButtonsHtml(status);

  // Mọi lần đổi vòng đời chuyến (khởi hành / Re-open / đóng Re-open / kết ca) đều gọi hàm này — vẽ lại
  // danh sách phơi Zone 1 để badge SL ghế đổi màu ngay (đỏ = đã khoá bán vé, xem zone1IsTripSellingLocked)
  // thay vì chờ tới lần render kế tiếp. selectTrip đã tự vẽ Zone 1 nên 1 lần vẽ lại thừa ở đó là không đáng kể.
  if (typeof renderZone1TripList === 'function') renderZone1TripList();
}

function tsBuildLifecycleButtonsHtml(status) {
  const assignBtn = `
    <button class="assign-btn" data-action="openAssignModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"/></svg>
      Chỉ định xe
    </button>`;
  const departBtn = `
    <button class="assign-btn depart-btn" data-action="openDepartModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14"/><path d="M5 17a2 2 0 0 1-2-2v-3.2a1 1 0 0 1 .3-.7l2.6-2.6A2 2 0 0 1 7.3 8H16a2 2 0 0 1 1.6.8l2.1 2.8a1 1 0 0 0 .5.3l1.4.4a1 1 0 0 1 .7 1v1.7a2 2 0 0 1-2 2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/></svg>
      Khởi hành xe
    </button>`;
  const viewManifestBtn = `
    <button class="assign-btn depart-btn" data-action="openManifestView">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
      Xem phơi
    </button>`;
  const reopenBtn = `
    <button class="assign-btn reopen-btn" data-action="openReopenModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 1 0 2-9.5L1 10"/></svg>
      Re-open
    </button>`;
  const closeReopenBtn = `
    <button class="assign-btn" data-action="openCloseReopenModal">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>
      Đóng Re-open
    </button>`;
  const viewLiveReopenBtn = `
    <button class="assign-btn depart-btn" data-action="openReopenLiveView">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      Xem phát sinh
    </button>`;
  const viewReopenHistoryBtn = `
    <button class="assign-btn depart-btn" data-action="openReopenHistoryView">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>
      Lịch sử Re-open
    </button>`;
  const viewShiftClosingBtn = `
    <button class="assign-btn depart-btn" data-action="openShiftClosingHistoryForTrip">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="m9 16 2 2 4-4"/></svg>
      Xem kết ca
    </button>`;

  switch (status) {
    case TRIP_LIFECYCLE_STATUS.DEPARTED:
      return viewManifestBtn + reopenBtn;
    case TRIP_LIFECYCLE_STATUS.REOPEN:
      return closeReopenBtn + viewLiveReopenBtn;
    case TRIP_LIFECYCLE_STATUS.REOPEN_CLOSED:
      return viewManifestBtn + viewReopenHistoryBtn + reopenBtn;
    case TRIP_LIFECYCLE_STATUS.MANIFEST_CLOSED:
      return viewManifestBtn + viewShiftClosingBtn;
    case TRIP_LIFECYCLE_STATUS.SELLING:
    default:
      return assignBtn + departBtn;
  }
}

function tsIsSellingLocked(tripId) {
  const status = getTripLifecycleStatus(tripId);
  return status === TRIP_LIFECYCLE_STATUS.DEPARTED || status === TRIP_LIFECYCLE_STATUS.REOPEN_CLOSED || status === TRIP_LIFECYCLE_STATUS.MANIFEST_CLOSED;
}

/* ===================== 2. KHỞI HÀNH XE → TỔNG HỢP VÉ → TẠO PHƠI ===================== */

function openDepartModal() {
  if (!currentTripId || !tripSeatBank[currentTripId]) return;
  if (getTripLifecycleStatus(currentTripId) !== TRIP_LIFECYCLE_STATUS.SELLING) {
    showToast('Chuyến này đã khởi hành rồi');
    return;
  }
  const box = document.getElementById('departSummaryBox');
  if (box) box.innerHTML = tsRenderDepartPreviewHtml(currentTripId);

  const advanceInput = document.getElementById('departAdvanceInput');
  if (advanceInput) advanceInput.value = '0';

  // Mặc định KHÔNG in kèm danh sách rước đường — nhân viên tự tick nếu cần.
  const roadsideChk = document.getElementById('departPrintRoadside');
  if (roadsideChk) roadsideChk.checked = false;

  document.getElementById('departModal').classList.add('open');
}

function confirmDepart() {
  if (!currentTripId || !tripSeatBank[currentTripId]) return;
  const advanceInput = document.getElementById('departAdvanceInput');
  const advanceAmount = advanceInput ? (parseInt(advanceInput.value, 10) || 0) : 0;
  const tripId = currentTripId;

  tsCreateManifestForCurrentTrip(advanceAmount);
  saveSeatBank();

  // Có in kèm "Danh sách rước đường" vào phơi hay không — theo ô checkbox trong modal Khởi hành xe.
  const includeRoadside = !!((document.getElementById('departPrintRoadside') || {}).checked);

  closeModal('departModal');
  renderTripLifecycleUI();
  showToast('Xe đã khởi hành, đã tạo phơi cho chuyến ' + (document.getElementById('tripTitle') ? document.getElementById('tripTitle').textContent.trim() : ''));
  // Khởi hành xe xong thì in luôn "Phơi xe giao theo chuyến" — nhân viên không cần vào lại "Xem phơi"
  // rồi bấm "In phơi" thêm 1 bước nữa.
  printManifestView(tripId, { includeRoadside });
}

/* ===================== 3. RE-OPEN ===================== */

function openReopenModal() {
  if (!currentTripId) return;
  const status = getTripLifecycleStatus(currentTripId);
  if (status !== TRIP_LIFECYCLE_STATUS.DEPARTED && status !== TRIP_LIFECYCLE_STATUS.REOPEN_CLOSED) {
    showToast('Chỉ Re-open được chuyến đã khởi hành hoặc đã đóng Re-open');
    return;
  }
  const manifest = getManifest(currentTripId);
  const tripEl = document.getElementById('tripTitle');
  document.getElementById('reopenTripInfo').textContent = tripEl ? tripEl.textContent.trim() : '—';
  document.getElementById('reopenPlateInfo').textContent = (manifest && manifest.plate) || '—';
  document.getElementById('reopenDriverInfo').textContent = (manifest && manifest.driver) || '—';
  document.getElementById('reopenStaffInfo').textContent = getCurrentStaffLabel();
  document.getElementById('reopenTimeInfo').textContent = formatActionTime(new Date().toISOString());
  document.getElementById('reopenReasonInput').value = '';

  document.getElementById('reopenModal').classList.add('open');
}

function confirmReopen() {
  const reason = document.getElementById('reopenReasonInput').value.trim();
  if (!reason) {
    showToast('Vui lòng nhập lý do mở lại xe');
    return;
  }
  tsOpenReopen(currentTripId, reason);
  closeModal('reopenModal');
  renderTripLifecycleUI();
  showToast('Đã Re-open xe — có thể bán vé phát sinh');
}

function openCloseReopenModal() {
  const event = getActiveReopenEvent(currentTripId);
  if (!event) { showToast('Không có lần Re-open nào đang mở'); return; }
  const diff = tsAggregateReopenEventTickets(event.id);
  const box = document.getElementById('closeReopenSummaryBox');
  box.innerHTML = `
    <div class="manifest-section-title">Phát sinh lần Re-open #${event.sequence}</div>
    <div class="readonly-line" style="padding-top:0;">Lý do: ${tsEsc(event.reason)} • Mở lúc ${formatActionTime(event.time)} bởi ${tsEsc(event.staffId)}</div>
    ${tsRenderStationTableHtml(diff.stationBreakdown)}
  `;
  document.getElementById('closeReopenModal').classList.add('open');
}

function confirmCloseReopen() {
  const event = tsCloseActiveReopen(currentTripId);
  if (!event) { showToast('Không có lần Re-open nào đang mở'); return; }
  closeModal('closeReopenModal');
  renderTripLifecycleUI();
  showToast(`Đã đóng Re-open #${event.sequence}: +${event.ticketsAdded} vé, +${tsFormatMoney(event.amountAdded)}`);
}

function openReopenLiveView() {
  const event = getActiveReopenEvent(currentTripId);
  if (!event) { showToast('Không có lần Re-open nào đang mở'); return; }
  const diff = tsAggregateReopenEventTickets(event.id);
  tsOpenManifestModalWithBody(`
    <div class="manifest-section-title">Phát sinh Re-open #${event.sequence} (đang mở)</div>
    <div class="readonly-line" style="padding-top:0;">Lý do: ${tsEsc(event.reason)} • Mở lúc ${formatActionTime(event.time)} bởi ${tsEsc(event.staffId)}</div>
    ${tsRenderStationTableHtml(diff.stationBreakdown)}
  `);
}

function openReopenHistoryView() {
  tsOpenManifestModalWithBody(tsRenderReopenHistoryHtml(currentTripId));
}

/* ===================== 4. XEM PHƠI (tổng hợp đầy đủ) ===================== */

function openManifestView() {
  const manifest = getManifest(currentTripId);
  if (!manifest) { showToast('Chuyến này chưa tạo phơi'); return; }
  tsOpenManifestModalWithBody(tsRenderManifestFullHtml(currentTripId));
}

function openViolationModalFromManifest() {
  closeModal('manifestViewModal');
  openViolationModal();
}

function tsOpenManifestModalWithBody(html) {
  // Mặc định KHÔNG in kèm danh sách rước đường — nhân viên tự tick ở thanh nút nếu cần.
  const roadsideChk = document.getElementById('manifestPrintRoadside');
  if (roadsideChk) roadsideChk.checked = false;
  document.getElementById('manifestViewBody').innerHTML = html;
  document.getElementById('manifestViewModal').classList.add('open');
}

// Phần lõi dùng CHUNG cho cả modal "Xem phơi" (sau khi đã tạo) LẪN modal "Khởi hành xe" (xem trước lúc
// chưa tạo) — 2 giao diện phải y hệt nhau nên chỉ có 1 hàm render duy nhất, khác nhau ở dữ liệu đầu vào
// (tripInfo/totals/denomBreakdown truyền vào từ manifest đã lưu, hoặc tính "sống" trước khi tạo).
// Thứ tự: Thông tin chuyến → Chi tiết mệnh giá (kèm Đã thu/Chưa thu/Vé trạm/Khách rước đường ở cuối bảng,
// xem tsRenderDenominationTableHtml) → Danh sách rước đường (chi tiết từng khách Rước đường).
function tsRenderManifestCoreSectionsHtml(tripInfo, totals, templateKey, denomBreakdown, opts) {
  // opts.hideRoadside: bỏ khối "Danh sách rước đường" khỏi giao diện (modal Khởi hành xe không cần
  // hiển thị danh sách này nữa — nhân viên chỉ chọn IN kèm qua ô checkbox).
  const roadsideBlock = (opts && opts.hideRoadside)
    ? ''
    : `<div class="pv-detail-title">Danh sách rước đường</div>
    ${tsRenderRoadsideListTableHtml(totals ? totals.roadsideList : null)}`;
  return `
    <div class="manifest-section-title">Thông tin chuyến</div>
    ${tsRenderTripInfoHtml(tripInfo)}

    <div class="pv-detail-title">Chi tiết mệnh giá</div>
    ${tsRenderDenominationTableHtml(denomBreakdown, templateKey, totals, tripInfo.advanceAmount)}

    ${roadsideBlock}
  `;
}

// Danh sách chi tiết khách "Rước đường" (đón dọc đường, không tính vào lưới trạm × mệnh giá ở trên) —
// dùng chung 1 nguồn roadsideList đã gom sẵn ở tsAggregateTickets (phơi gốc + các lần Re-open đã đóng,
// xem tsGetManifestCurrentTotals) nên luôn khớp đúng số "Khách rước đường" ở bảng Chi tiết mệnh giá.
function tsRenderRoadsideListTableHtml(list) {
  if (!Array.isArray(list) || !list.length) {
    return '<p style="color:var(--text-sub);font-size:13px;">Chưa có khách rước đường.</p>';
  }
  const rows = list.map((r, index) => `
    <tr>
      <td class="mono ts-rlist-stt">${index + 1}</td>
      <td class="ts-rlist-name">${tsEsc(r.name || '—')}</td>
      <td class="mono ts-rlist-phone">${tsEsc(r.phone || '—')}</td>
      <td class="ts-rlist-stop">${tsEsc(r.firstStop || '—')}</td>
      <td class="ts-rlist-stop">${tsEsc(r.lastStop || '—')}</td>
      <td class="ts-rlist-pickup">${tsEsc(r.pickupLoc || '—')}</td>
      <td class="mono ts-rlist-count" style="text-align:center;">1</td>
      <td class="mono ts-rlist-seats" style="text-align:center;">${tsEsc((r.seatCodes || []).join(', ')) || '—'}</td>
      <td class="ts-rlist-amount" style="text-align:right;">${tsFormatMoney(r.amount || 0)}</td>
    </tr>`).join('');
  return `
    <div class="pax-table-wrap grid-table-wrap" style="margin-bottom:8px;">
      <table class="pax-table lined-table">
        <thead>
          <tr>
            <th class="ts-rlist-stt">STT</th>
            <th class="ts-rlist-name">Họ và tên</th>
            <th class="ts-rlist-phone">SDT</th>
            <th class="ts-rlist-stop">Trạm đi</th>
            <th class="ts-rlist-stop">Trạm đến</th>
            <th class="ts-rlist-pickup">Điểm rước</th>
            <th class="ts-rlist-count" style="text-align:center;">SL</th>
            <th class="ts-rlist-seats" style="text-align:center;">Số ghế</th>
            <th class="ts-rlist-amount" style="text-align:right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// "Thông tin chuyến" — 1 khối bo viền có header riêng (tuyến + biển số nổi bật), bên dưới chia 2 cột:
// trái là kíp xe (Tài xế/Phụ xe), phải là mốc thời gian (Khởi hành/thời điểm tạo phơi) — 2 nhóm thông
// tin khác bản chất nên tách cột thay vì xếp chung 1 danh sách dọc.
// Ưu tiên tripLabel (VD "07:00 - Sài Gòn - Châu Đốc") thay vì tripId nội bộ (VD "3") vì đây mới là thông
// tin nhân viên cần nhận diện chuyến, tripId chỉ dùng làm fallback khi không có tripLabel.
function tsRenderTripInfoHtml(tripInfo) {
  const crewRows = [['Tài xế', tsEsc(tripInfo.driver || '—')]];
  if (tripInfo.helper) crewRows.push(['Phụ xe', tsEsc(tripInfo.helper)]);

  const timeRows = [
    ['Khởi hành', `${formatHistoryDate(tripInfo.date)} • ${tsEsc(tripInfo.time || '—')}`],
    [tsEsc(tripInfo.metaLabel), `${formatActionTime(tripInfo.createdAt)} • ${tsEsc(tripInfo.createdBy)}`]
  ];

  const colHtml = rows => rows.map(([label, value]) => `
    <div class="trip-meta-item">
      <span class="tm-label">${label}</span>
      <span class="tm-value">${value}</span>
    </div>`).join('');

  return `
    <div class="trip-meta-box">
      <div class="trip-meta-head">
        <div class="trip-meta-route">${tsEsc(tripInfo.tripLabel || ('Chuyến #' + tripInfo.tripId))}</div>
        <div class="trip-meta-plate">${tsEsc(tripInfo.plate || '—')}</div>
      </div>
      <div class="trip-meta-cols">
        <div class="trip-meta-col">${colHtml(crewRows)}</div>
        <div class="trip-meta-col">${colHtml(timeRows)}</div>
      </div>
    </div>`;
}

function tsRenderManifestFullHtml(tripId) {
  const manifest = getManifest(tripId);
  if (!manifest) return '<p>Chưa có phơi.</p>';
  const totals = tsGetManifestCurrentTotals(tripId);
  const events = getReopenEventsForTrip(tripId);
  const templateKey = tsGetPrintTemplateKey(tripId);
  const denomBreakdown = tsGetManifestCurrentDenominationBreakdown(tripId);

  let html = tsRenderManifestCoreSectionsHtml({
    tripId: manifest.tripId,
    tripLabel: manifest.tripLabel,
    plate: manifest.plate,
    driver: manifest.driver,
    helper: manifest.helper,
    date: manifest.date,
    time: manifest.time,
    createdBy: manifest.createdBy,
    createdAt: manifest.createdAt,
    metaLabel: 'Tạo phơi lúc',
    advanceAmount: manifest.advanceAmount
  }, totals, templateKey, denomBreakdown, { hideRoadside: true });

  // Bỏ khối "Diễn biến phơi" (timeline Phơi gốc → từng lần Re-open → Tổng hiện tại) theo yêu cầu — chỉ
  // còn "Lịch sử Re-open" khi đã có ít nhất 1 lần Re-open.
  if (events.length) {
    html += `<div class="pv-detail-title">Lịch sử Re-open</div>${tsRenderReopenHistoryTableHtml(events)}`;
  }

  const violations = getViolationsForTrip(tripId);
  if (violations.length) {
    html += `<div class="pv-detail-title">Khách ngoài phơi đã ghi nhận</div>${tsRenderViolationsTableHtml(violations)}`;
  }

  return html;
}

// Xem trước phơi TRƯỚC khi bấm "Xác nhận khởi hành" (modal Khởi hành xe) — y hệt giao diện "Xem phơi"
// (dùng chung tsRenderManifestCoreSectionsHtml), chỉ khác là số liệu tính "sống" từ vé đang bán
// (tsAggregateOriginalTickets) vì manifest thật sự chưa được tạo, và không có Diễn biến phơi/Lịch sử
// Re-open/Khách ngoài phơi vì các mục đó chỉ phát sinh SAU khi xe đã khởi hành.
function tsRenderDepartPreviewHtml(tripId) {
  const bank = tripSeatBank[tripId];
  const tripMeta = (typeof allTripsMeta !== 'undefined' ? allTripsMeta : []).find(t => t.id === tripId);
  const totals = tsAggregateOriginalTickets();
  const templateKey = tsGetPrintTemplateKey(tripId);
  const denomBreakdown = tsAggregateStationDenomination(s => s.soldPhase !== 'POST_DEPART');
  const tripTitleEl = document.getElementById('tripTitle');

  return tsRenderManifestCoreSectionsHtml({
    tripId,
    tripLabel: tripTitleEl ? tripTitleEl.textContent.trim() : '',
    plate: (bank && bank.plate) || (tripMeta && tripMeta.plate) || '',
    driver: (bank && bank.driver) || '',
    helper: (bank && bank.helper) || '',
    date: (tripMeta && tripMeta.date) || '',
    time: (tripMeta && tripMeta.time) || '',
    createdBy: getCurrentStaffLabel(),
    createdAt: new Date().toISOString(),
    metaLabel: 'Dự kiến tạo phơi lúc',
    advanceAmount: undefined
  }, totals, templateKey, denomBreakdown, { hideRoadside: true });
}

/* ===================== 4b. IN PHƠI (mẫu phơi giấy — KHÁC layout web, CÙNG data) ===================== */
// Nguyên tắc bắt buộc: web (tsRenderManifestFullHtml ở trên) và bản in dưới đây phải đọc CÙNG 1 nguồn
// (getManifest/tsGetManifestCurrentTotals/tsGetManifestCurrentDenominationBreakdown) — không tự tính
// lại số liệu riêng cho bản in, để không bao giờ xảy ra trường hợp web và bản in lệch số nhau.

// CSS riêng cho cửa sổ in — khổ A4, có border rõ ràng, không bóng/không nền dashboard, lặp lại header
// bảng khi sang trang (mục 10 spec nghiệp vụ). Tách khỏi ticketstaff.css vì đây là tài liệu HTML độc lập
// mở ở cửa sổ mới (đúng quy ước in vé lẻ có sẵn — xem buildMultiTicketPrintHtml ở ticketstaff.js).
// Font: ưu tiên 'Noto Serif' (bộ Unicode đầy đủ dấu tiếng Việt, kể cả dấu chồng ít gặp như ẫ/ỡ) — nếu
// máy in không cài thì tự rớt xuống 'Times New Roman' (đã hỗ trợ tốt tiếng Việt sẵn trên Windows) rồi
// Georgia/serif, không phụ thuộc tải font ngoài (cửa sổ in có thể mở ở máy không có mạng tại bến xe).
const TS_MANIFEST_PRINT_STYLE = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Serif', 'Times New Roman', Georgia, serif;
    margin: 0; padding: 26px; color: #111; line-height: 1.5;
  }
  .pm-page { max-width: 820px; margin: 0 auto; }
  .pm-company { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #444; }
  .pm-title {
    text-align: center; font-size: 23px; font-weight: 700; letter-spacing: 1.5px;
    margin: 6px 0 20px; padding-bottom: 12px;
    border-bottom: 3px double #000;
  }
  .pm-section-title {
    font-size: 13.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
    color: #444; margin: 22px 0 8px;
  }
  .pm-section-title:first-of-type { margin-top: 0; }
  .pm-meta-box {
    display: grid; grid-template-columns: 1fr 1fr; gap: 7px 28px;
    border: 1px solid #000; border-radius: 4px;
    padding: 12px 18px; margin-bottom: 4px;
    font-size: 14px;
  }
  .pm-meta-box .pm-meta-item { display: flex; justify-content: space-between; gap: 10px; }
  .pm-meta-box .pm-meta-label { color: #444; }
  .pm-meta-box b { font-weight: 700; }
  .pm-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .pm-table th, .pm-table td { border: 1px solid #000; padding: 7px 6px; text-align: center; }
  .pm-table thead { display: table-header-group; }
  .pm-table thead th { background: #e8e8e8; font-weight: 700; letter-spacing: .3px; }
  .pm-table tbody tr { page-break-inside: avoid; }
  .pm-station-cell { font-weight: 700; background: #f4f4f4; font-size: 13.5px; }
  .pm-row-amount td { color: #444; font-style: italic; font-size: 11.5px; }
  .pm-station-group:nth-of-type(odd) .pm-station-cell { background: #ececec; }
  .pm-summary-box {
    border: 1px solid #000; border-radius: 4px; overflow: hidden; font-size: 14px;
  }
  .pm-summary-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .pm-summary-item {
    display: flex; justify-content: space-between; gap: 10px;
    padding: 8px 16px; border-bottom: 1px solid #ddd;
  }
  .pm-summary-item:nth-child(odd) { border-right: 1px solid #ddd; }
  .pm-summary-item .pm-meta-label { color: #444; }
  .pm-summary-item b { font-weight: 700; }
  .pm-summary-grand {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 16px; background: #f4f4f4;
  }
  .pm-summary-grand span { font-weight: 700; font-size: 15px; }
  .pm-summary-grand b { font-weight: 800; font-size: 18px; }
  .pm-roadside-table th:nth-child(1), .pm-roadside-table td:nth-child(1) { width: 6%; }
  .pm-roadside-table th:nth-child(6), .pm-roadside-table td:nth-child(6) { width: 18%; }
  .pm-roadside-table td:nth-child(2), .pm-roadside-table td:nth-child(4),
  .pm-roadside-table td:nth-child(5), .pm-roadside-table td:nth-child(6) { text-align: left; }
  .pm-roadside-table td:nth-child(9) { text-align: right; }
  .pm-empty-note { font-size: 13px; color: #666; font-style: italic; margin: 0; }
  @page { size: A4 portrait; margin: 16mm 14mm; }
  @media print { body { padding: 0; } }
`;

// Xây HTML bản in — CHỈ đọc số liệu qua các hàm tổng hợp đã có (không hard-code, không tính tay). Có đủ
// từng mục y hệt modal "Xem phơi"/"Khởi hành xe" trên web (Thông tin chuyến → Chi tiết mệnh giá → Tóm
// tắt → Danh sách rước đường) — không phải bản rút gọn riêng như trước.
// templateKey hiện chỉ có "saigon" — tsGetPrintTemplateKey() là điểm mở rộng khi có mẫu khu vực khác.
function buildManifestPrintHtml(tripId, opts) {
  // Mặc định (nút "In phơi" ở modal Xem phơi, không truyền opts) vẫn in kèm danh sách rước đường như cũ;
  // luồng Khởi hành xe truyền opts.includeRoadside theo ô checkbox trong modal.
  const includeRoadside = !opts || opts.includeRoadside !== false;
  const manifest = getManifest(tripId);
  if (!manifest) return '';
  const totals = tsGetManifestCurrentTotals(tripId);
  const templateKey = tsGetPrintTemplateKey(tripId);
  const breakdown = tsGetManifestCurrentDenominationBreakdown(tripId);
  const denoms = breakdown.denominations;

  const headCols = ['TRẠM', 'RƯỚC', 'FREE'].concat(denoms.map(d => tsFormatMoneyShort(d))).concat(['TỔNG']);
  const numCell = n => `<td>${n || 0}</td>`;
  const moneyCell = n => `<td>${n ? tsFormatMoneyShort(n) : 0}</td>`;

  const stationGroups = breakdown.stationOrder.map(st => {
    const b = breakdown.stations[st];
    const abbr = tsGetStationAbbr(templateKey, st);
    const countCells = [numCell(b.ruocCount), numCell(b.freeCount)]
      .concat(denoms.map(d => numCell(b.denomCounts[d])))
      .concat([numCell(b.totalCount)]);
    const amountCells = [moneyCell(b.ruocAmount), moneyCell(b.freeAmount)]
      .concat(denoms.map(d => moneyCell(b.denomAmounts[d])))
      .concat([moneyCell(b.totalAmount)]);
    return `
      <tbody class="pm-station-group">
        <tr class="pm-row-count">
          <td rowspan="2" class="pm-station-cell">${tsEsc(abbr)}</td>
          ${countCells.join('')}
        </tr>
        <tr class="pm-row-amount">${amountCells.join('')}</tr>
      </tbody>`;
  }).join('');

  const timeDisplay = manifest.time ? tsEsc(manifest.time).replace(':', 'H') : 'Chưa rõ';
  const createdAtDisplay = manifest.createdAt
    ? `${formatHistoryDate(manifest.createdAt)} ${formatActionTime(manifest.createdAt)}`.trim()
    : 'Chưa rõ';

  // Tóm tắt — cùng bộ mục với bảng "Chi tiết mệnh giá" trên web (tsRenderDenominationTableHtml), trình
  // bày lại thành ô lưới 2 cột cho bản giấy, không nối "số vé — số tiền" bằng gạch ngang như bản cũ.
  const summaryItem = (label, value) => `
    <div class="pm-summary-item"><span class="pm-meta-label">${label}</span><b>${value}</b></div>`;
  const summaryItems = [
    summaryItem('Số vé', totals.ticketCount),
    summaryItem('Chưa thu', tsFormatMoney(totals.unpaidAmount || 0)),
    summaryItem('Khách rước đường', totals.roadsidePassengerCount || 0),
    summaryItem('Đã thu', tsFormatMoney(totals.paidAmount || 0)),
    summaryItem('Vé trạm', totals.stationTicketCount || 0),
    // Bản in chỉ dựng được khi manifest đã tồn tại thật (phơi đã tạo ở modal Khởi hành xe, luôn có
    // advanceAmount là số — kể cả 0 nếu nhân viên để trống), nên luôn hiện dòng này, không kiểm tra
    // truthy như trước (0đ vẫn bị coi là falsy nên từng bị ẩn mất) — khớp đúng cách web
    // (tsRenderDenominationTableHtml) kiểm tra "advanceAmount !== undefined" chứ không phải giá trị > 0.
    summaryItem('Tiền rước đường dự kiến', tsFormatMoney(manifest.advanceAmount || 0))
  ];

  // Danh sách rước đường — cùng nguồn totals.roadsideList với bảng web (tsRenderRoadsideListTableHtml).
  const roadsideList = totals.roadsideList || [];
  const roadsideHtml = roadsideList.length
    ? `<table class="pm-table pm-roadside-table">
        <thead><tr>
          <th>STT</th><th>Họ và tên</th><th>SDT</th><th>Trạm đi</th><th>Trạm đến</th><th>Điểm rước</th>
          <th>SL</th><th>Số ghế</th><th>Thành tiền</th>
        </tr></thead>
        <tbody>${roadsideList.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${tsEsc(r.name || 'Chưa rõ')}</td>
            <td>${tsEsc(r.phone || 'Chưa rõ')}</td>
            <td>${tsEsc(r.firstStop || 'Chưa rõ')}</td>
            <td>${tsEsc(r.lastStop || 'Chưa rõ')}</td>
            <td>${tsEsc(r.pickupLoc || 'Chưa rõ')}</td>
            <td>1</td>
            <td>${tsEsc((r.seatCodes || []).join(', ')) || 'Chưa rõ'}</td>
            <td>${tsFormatMoney(r.amount || 0)}</td>
          </tr>`).join('')}</tbody>
      </table>`
    : `<p class="pm-empty-note">Chưa có khách rước đường.</p>`;

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Phơi xe ${tsEsc(manifest.tripLabel || tripId)}</title>
<style>${TS_MANIFEST_PRINT_STYLE}</style>
</head>
<body>
  <div class="pm-page">
    <div class="pm-company">Trạm điều hành Huệ Nghĩa</div>
    <div class="pm-title">PHƠI XE GIAO THEO CHUYẾN</div>

    <div class="pm-section-title">Thông tin chuyến</div>
    <div class="pm-meta-box">
      <div class="pm-meta-item"><span class="pm-meta-label">Ngày</span><b>${formatHistoryDate(manifest.date)}</b></div>
      <div class="pm-meta-item"><span class="pm-meta-label">Tài xế</span><b>${tsEsc(manifest.driver || 'Chưa rõ')}</b></div>
      <div class="pm-meta-item"><span class="pm-meta-label">Giờ xuất bến</span><b>${timeDisplay}</b></div>
      <div class="pm-meta-item"><span class="pm-meta-label">Phụ xe</span><b>${tsEsc(manifest.helper || 'Chưa rõ')}</b></div>
      <div class="pm-meta-item"><span class="pm-meta-label">Xe số</span><b>${tsEsc(manifest.plate || 'Chưa rõ')}</b></div>
      <div class="pm-meta-item"><span class="pm-meta-label">Tạo phơi lúc</span><b>${tsEsc(createdAtDisplay)}</b></div>
    </div>

    <div class="pm-section-title">Chi tiết mệnh giá</div>
    <table class="pm-table">
      <thead><tr>${headCols.map(h => `<th>${tsEsc(h)}</th>`).join('')}</tr></thead>
      ${stationGroups}
    </table>

    <div class="pm-section-title">Tóm tắt</div>
    <div class="pm-summary-box">
      <div class="pm-summary-grid">${summaryItems.join('')}</div>
      <div class="pm-summary-grand"><span>Tổng tiền</span><b>${tsFormatMoney(totals.totalAmount)}</b></div>
    </div>

    ${includeRoadside ? `<div class="pm-section-title">Danh sách rước đường</div>
    ${roadsideHtml}` : ''}
  </div>
  <script>
    window.onload = function () { setTimeout(function () { window.print(); }, 400); };
  </script>
</body>
</html>`;
}

// Nút "In phơi" trong modal Xem phơi — mở cửa sổ mới, KHÔNG in nguyên trang web hiện tại (không sidebar/
// header/modal), giống đúng quy ước in vé lẻ đã có (printTicketsSeparately ở ticketstaff.js).
function printManifestView(tripId, opts) {
  tripId = tripId || currentTripId;
  if (!tripId) return;
  const manifest = getManifest(tripId);
  if (!manifest) { showToast('Chuyến này chưa tạo phơi'); return; }
  // Không truyền opts (nút "In phơi" ở modal Xem phơi) → lấy theo ô checkbox trong modal đó.
  if (!opts) {
    const chk = document.getElementById('manifestPrintRoadside');
    opts = { includeRoadside: !!(chk && chk.checked) };
  }
  const printHtml = buildManifestPrintHtml(tripId, opts);
  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  }
}

function tsRenderReopenHistoryHtml(tripId) {
  const events = getReopenEventsForTrip(tripId);
  if (!events.length) return '<div class="manifest-section-title">Lịch sử Re-open</div><p>Chưa có lần Re-open nào.</p>';
  return `<div class="manifest-section-title">Lịch sử Re-open</div>${tsRenderReopenHistoryTableHtml(events)}`;
}

/* ===================== 5. KHÁCH NGOÀI PHƠI ===================== */

function openViolationModal() {
  const manifest = getManifest(currentTripId);
  const tripEl = document.getElementById('tripTitle');
  document.getElementById('violationTripInfo').textContent = tripEl ? tripEl.textContent.trim() : '—';
  document.getElementById('violationDriverInfo').textContent = (manifest && manifest.driver) || '—';

  const onManifestCount = manifest ? tsGetManifestCurrentTotals(currentTripId).passengerCount : 0;
  document.getElementById('violationOnManifestInfo').textContent = onManifestCount + ' khách';
  document.getElementById('violationOnManifestInfo').dataset.count = onManifestCount;

  document.getElementById('violationActualInput').value = '';
  document.getElementById('violationCheckerInput').value = '';
  document.getElementById('violationPenaltyInput').value = '0';
  document.getElementById('violationNoteInput').value = '';
  document.getElementById('violationStatusSelect').value = 'Chưa xử lý';
  tsUpdateViolationDiff();

  document.getElementById('violationModal').classList.add('open');
}

function onViolationActualInput() {
  tsUpdateViolationDiff();
}

function tsUpdateViolationDiff() {
  const onManifest = parseInt(document.getElementById('violationOnManifestInfo').dataset.count, 10) || 0;
  const actualRaw = document.getElementById('violationActualInput').value;
  const diffEl = document.getElementById('violationDiffInfo');
  if (actualRaw === '') {
    diffEl.textContent = '—';
    diffEl.classList.remove('has-diff');
    return;
  }
  const actual = parseInt(actualRaw, 10) || 0;
  const diff = actual - onManifest;
  diffEl.textContent = (diff > 0 ? '+' : '') + diff + ' khách';
  diffEl.classList.toggle('has-diff', diff !== 0);
}

function confirmViolation() {
  const actualRaw = document.getElementById('violationActualInput').value;
  const checker = document.getElementById('violationCheckerInput').value.trim();
  if (actualRaw === '' || !checker) {
    showToast('Vui lòng nhập đủ Số khách kiểm tra thực tế và Người kiểm tra');
    return;
  }
  const onManifest = parseInt(document.getElementById('violationOnManifestInfo').dataset.count, 10) || 0;
  const actual = parseInt(actualRaw, 10) || 0;
  const tripEl = document.getElementById('tripTitle');

  const record = {
    id: 'VL-' + Date.now().toString(36),
    tripId: currentTripId,
    tripLabel: tripEl ? tripEl.textContent.trim() : '',
    driver: (getManifest(currentTripId) || {}).driver || '',
    onManifestCount: onManifest,
    actualCount: actual,
    diffCount: actual - onManifest,
    checker,
    time: new Date().toISOString(),
    note: document.getElementById('violationNoteInput').value.trim(),
    penaltyAmount: parseInt(document.getElementById('violationPenaltyInput').value, 10) || 0,
    status: document.getElementById('violationStatusSelect').value
  };
  addViolation(record);
  closeModal('violationModal');
  showToast('Đã ghi nhận khách ngoài phơi: chênh lệch ' + (record.diffCount > 0 ? '+' : '') + record.diffCount + ' khách');
}

/* ===================== 6. KẾT CA / ĐỐI SOÁT ===================== */

let tsCurrentShiftReport = null;

function renderShiftClosingPage() {
  const report = tsAggregateShiftClosing();
  tsCurrentShiftReport = report;

  const body = document.getElementById('shiftClosingBody');
  body.innerHTML = `
    <div class="manifest-section-title">Tổng hợp phơi trong ca</div>
    <div class="stat-hero-row">
      <div class="stat-hero-item">
        <div class="stat-hero-value">${report.tripCount}</div>
        <div class="stat-hero-label">Phơi</div>
      </div>
      <div class="stat-hero-divider"></div>
      <div class="stat-hero-item">
        <div class="stat-hero-value">${report.ticketCount}</div>
        <div class="stat-hero-label">Vé</div>
      </div>
      <div class="stat-hero-divider"></div>
      <div class="stat-hero-item">
        <div class="stat-hero-value">${report.passengerCount}</div>
        <div class="stat-hero-label">Khách</div>
      </div>
      <div class="stat-hero-divider"></div>
      <div class="stat-hero-item accent">
        <div class="stat-hero-value">${tsFormatMoney(report.totalAmount)}</div>
        <div class="stat-hero-label">Tổng tiền vé</div>
      </div>
    </div>
    <div class="stat-detail-list">
      <div class="stat-detail-row"><span>Tiền ứng giao ca</span><span>${tsFormatMoney(report.advanceAmount)}</span></div>
      <div class="stat-detail-row"><span>Tiền mặt (hệ thống)</span><span>${tsFormatMoney(report.cashAmount)}</span></div>
      <div class="stat-detail-row"><span>Chuyển khoản (hệ thống)</span><span>${tsFormatMoney(report.transferAmount)}</span></div>
      <div class="stat-detail-row"><span>Re-open</span><span>${report.reopenCount} lần • ${tsFormatMoney(report.reopenAmount)}</span></div>
      <div class="stat-detail-row${report.penaltyAmount || report.violationDiffCount ? ' warn' : ''}"><span>Phạt / chênh lệch khách</span><span>${tsFormatMoney(report.penaltyAmount)} • ${report.violationDiffCount} khách</span></div>
    </div>

    <div class="manifest-section-title">Doanh thu theo trạm</div>
    ${tsRenderStationTableHtml(report.stationBreakdown)}

    <div class="manifest-section-title">Doanh thu theo nhân viên tạo phơi</div>
    ${tsRenderStaffTableHtml(report.staffBreakdown)}
  `;

  document.getElementById('shiftActualCashInput').value = report.cashAmount || 0;
  document.getElementById('shiftActualTransferInput').value = report.transferAmount || 0;
  document.getElementById('shiftAckDiffCheckbox').checked = false;
  tsUpdateShiftReconcile();
}

function onShiftActualInput() {
  tsUpdateShiftReconcile();
}

function tsUpdateShiftReconcile() {
  if (!tsCurrentShiftReport) return;
  const report = tsCurrentShiftReport;
  const actualCash = parseInt(document.getElementById('shiftActualCashInput').value, 10) || 0;
  const actualTransfer = parseInt(document.getElementById('shiftActualTransferInput').value, 10) || 0;
  const actualTotal = actualCash + actualTransfer;
  const diff = actualTotal - report.totalAmount;

  const box = document.getElementById('shiftReconcileBox');
  box.innerHTML = `
    <div class="manifest-section-title">Đối soát</div>
    <div class="reconcile-row"><span>Tổng doanh thu hệ thống</span><span class="rc-value">${tsFormatMoney(report.totalAmount)}</span></div>
    <div class="reconcile-row"><span>Tiền mặt kiểm đếm thực tế</span><span class="rc-value">${tsFormatMoney(actualCash)}</span></div>
    <div class="reconcile-row"><span>Chuyển khoản xác nhận thực tế</span><span class="rc-value">${tsFormatMoney(actualTransfer)}</span></div>
    <div class="reconcile-total"><span>Tổng thực tế</span><span>${tsFormatMoney(actualTotal)}</span></div>
    <div class="reconcile-diff-box ${diff === 0 ? 'ok' : 'warn'}">
      ${diff === 0 ? 'KHỚP — không có chênh lệch' : 'CHÊNH LỆCH: ' + tsFormatSignedMoney(diff)}
    </div>
  `;
  document.getElementById('btnConfirmShiftClosing').dataset.diff = diff;
}

function confirmShiftClosing() {
  if (!tsCurrentShiftReport || !tsCurrentShiftReport.tripCount) {
    showToast('Không có phơi nào đủ điều kiện để kết ca (chuyến còn đang bán/Re-open sẽ không được gom)');
    return;
  }
  if (!document.getElementById('shiftAckDiffCheckbox').checked) {
    showToast('Vui lòng xác nhận đã kiểm tra số liệu đối soát trước khi kết ca');
    return;
  }
  const actualCash = parseInt(document.getElementById('shiftActualCashInput').value, 10) || 0;
  const actualTransfer = parseInt(document.getElementById('shiftActualTransferInput').value, 10) || 0;
  const diffAmount = (actualCash + actualTransfer) - tsCurrentShiftReport.totalAmount;

  const record = tsConfirmShiftClosing(tsCurrentShiftReport, { actualCash, actualTransfer, diffAmount });
  tsCurrentShiftReport = null;
  switchView('booking');
  renderTripLifecycleUI();
  showToast(`Đã kết ca: ${record.tripCount} phơi, tổng ${tsFormatMoney(record.totalAmount)}` + (diffAmount !== 0 ? ` (chênh lệch ${tsFormatSignedMoney(diffAmount)})` : ''));
}

function openShiftClosingHistoryForTrip() {
  const manifest = getManifest(currentTripId);
  if (!manifest) return;
  const closings = getAllShiftClosings().filter(c => c.tripIds.includes(currentTripId));
  let html = tsRenderManifestFullHtml(currentTripId);
  if (closings.length) {
    const last = closings[closings.length - 1];
    html += `
      <div class="manifest-section-title">Kết ca</div>
      <div class="manifest-history-item is-total">
        <div><div class="mh-label">Đã kết ca lúc ${formatActionTime(last.time)}</div><div class="mh-sub">Nhân viên: ${tsEsc(last.staffId)} • ${last.tripCount} phơi trong lần kết ca này</div></div>
        <div class="mh-value">${tsFormatMoney(last.totalAmount)}</div>
      </div>
    `;
  }
  tsOpenManifestModalWithBody(html);
}

/* ===================== 7. RENDER HELPERS DÙNG CHUNG ===================== */

function tsRenderStationTableHtml(stationBreakdown) {
  const breakdown = stationBreakdown || {};
  // Luôn hiện đủ các trạm đang cấu hình (kể cả chưa phát sinh vé) — kể cả với phơi cũ đã đóng băng
  // stationBreakdown từ trước khi trạm mới được thêm/trạm chưa có vé, không chỉ dựa vào key có sẵn
  // trong dữ liệu đầu vào.
  const stations = getTicketStations().slice();
  Object.keys(breakdown).forEach(st => {
    if (!stations.includes(st)) stations.push(st);
  });
  if (!stations.length) return '<p style="color:var(--text-sub);font-size:13px;">Chưa có dữ liệu theo trạm.</p>';
  let total = { tickets: 0, amount: 0 };
  const rows = stations.map(st => {
    const v = breakdown[st] || { tickets: 0, passengers: 0, amount: 0 };
    total.tickets += v.tickets || 0;
    total.amount += v.amount || 0;
    // Cột "Số khách" hiện lấy đúng số vé (v.tickets), không phải tổng số ghế/hành khách trong vé
    // (v.passengers) — theo yêu cầu, cho khớp với cột "Số vé" đứng trước.
    return `<tr><td>${tsEsc(st)}</td><td class="mono" style="text-align:center;">${v.tickets || 0}</td><td class="mono" style="text-align:center;">${v.tickets || 0}</td><td style="text-align:right;">${tsFormatMoney(v.amount)}</td></tr>`;
  }).join('');
  // Luôn hiện dòng TỔNG — stations giờ luôn có ít nhất 3 trạm cấu hình sẵn (LDH/XC/KDV) nên
  // stations.length > 1 gần như luôn đúng, bỏ điều kiện ẩn dòng TỔNG cho gọn.
  const totalRow = `<tr style="font-weight:800;"><td>TỔNG</td><td class="mono" style="text-align:center;">${total.tickets}</td><td class="mono" style="text-align:center;">${total.tickets}</td><td style="text-align:right;">${tsFormatMoney(total.amount)}</td></tr>`;
  return `
    <div class="pax-table-wrap grid-table-wrap" style="margin-bottom:8px;">
      <table class="pax-table lined-table">
        <thead><tr><th>Trạm</th><th style="text-align:center;">Số vé</th><th style="text-align:center;">Số khách</th><th style="text-align:right;">Doanh thu</th></tr></thead>
        <tbody>${rows}${totalRow}</tbody>
      </table>
    </div>`;
}

// Bảng "Chi tiết mệnh giá" trên WEB — cùng dữ liệu (tsGetManifestCurrentDenominationBreakdown) với bản
// in phơi giấy (xem buildManifestPrintHtml), chỉ khác cách trình bày: mỗi ô show số vé nổi bật + số
// tiền nhỏ bên dưới thay vì 2 dòng riêng "Số vé"/"Thành tiền" như tờ giấy, cho gọn và hiện đại hơn.
// totals/advanceAmount là 2 tham số TÙY CHỌN — chỉ modal Khởi hành xe/Xem phơi truyền vào để thêm khối
// tóm tắt (Số vé/Vé trạm/Khách rước đường/Đã thu/Chưa thu/Tiền rước đường dự kiến/Tổng tiền) ngay dưới
// bảng lưới trạm × mệnh giá; các chỗ khác gọi hàm này (nếu có) không truyền thì chỉ có phần lưới.
function tsRenderDenominationTableHtml(breakdown, templateKey, totals, advanceAmount) {
  if (!breakdown || !breakdown.stationOrder.length) {
    return '<p style="color:var(--text-sub);font-size:13px;">Chưa có dữ liệu mệnh giá.</p>';
  }
  const denoms = breakdown.denominations;
  const headCols = ['TRẠM', 'RƯỚC', 'FREE'].concat(denoms.map(d => tsFormatMoneyShort(d))).concat(['TỔNG']);
  const theadHtml = '<tr>' + headCols.map(h => `<th style="text-align:center;">${tsEsc(h)}</th>`).join('') + '</tr>';

  const numCell = n => `<td class="mono" style="text-align:center; font-weight:400; font-size:12px; color:var(--text-main);">${n || 0}</td>`;
  const moneyCell = n => `<td class="mono" style="text-align:center; font-weight:400; font-size:12px; color:var(--text-main);">${n ? tsFormatMoneyShort(n) : 0}</td>`;

  const stationGroups = breakdown.stationOrder.map(st => {
    const b = breakdown.stations[st];
    const abbr = tsGetStationAbbr(templateKey, st);
    const countCells = [numCell(b.ruocCount), numCell(b.freeCount)]
      .concat(denoms.map(d => numCell(b.denomCounts[d])))
      .concat([numCell(b.totalCount)]);
    const amountCells = [moneyCell(b.ruocAmount), moneyCell(b.freeAmount)]
      .concat(denoms.map(d => moneyCell(b.denomAmounts[d])))
      .concat([moneyCell(b.totalAmount)]);
    return `
      <tbody class="denom-grid-group">
        <tr class="denom-row-count">
          <td rowspan="2" class="denom-station-cell" style="text-align:center; vertical-align:middle; font-weight:700; background:var(--surface-2);">${tsEsc(abbr)}</td>
          ${countCells.join('')}
        </tr>
        <tr class="denom-row-amount">${amountCells.join('')}</tr>
      </tbody>`;
  }).join('');

  // Khối tóm tắt tách thành 1 bảng riêng ngay dưới bảng lưới trạm × mệnh giá — bảng riêng có 4 cột cố
  // định (nhãn/giá trị × 2 cặp) khai qua <colgroup> nên luôn đúng tỉ lệ 2 cột đều nhau, không phụ thuộc
  // bảng lưới mệnh giá phía trên có bao nhiêu cột (khác bản chất: 1 bên là số liệu theo cột mệnh giá cụ
  // thể, 1 bên là các mục tổng hợp không theo cột nào). "Tổng tiền" chiếm trọn hàng cuối, nổi bật hơn.
  let summaryTableHtml = '';
  if (totals) {
    const pairRow = (label1, value1, label2, value2) => `
      <tr class="denom-summary-row">
        <td class="ds-label">${label1 || ''}</td>
        <td class="mono ds-value">${value1 !== undefined ? value1 : ''}</td>
        <td class="ds-label">${label2 || ''}</td>
        <td class="mono ds-value">${value2 !== undefined ? value2 : ''}</td>
      </tr>`;

    const items = [
      ['Số vé', totals.ticketCount],
      ['Chưa thu', tsFormatMoney(totals.unpaidAmount || 0)],
      ['Khách rước đường', totals.roadsidePassengerCount || 0],
      ['Đã thu', tsFormatMoney(totals.paidAmount || 0)],
      ['Vé trạm', totals.stationTicketCount || 0]
    ];
    if (advanceAmount !== undefined) {
      items.push(['Tiền rước đường dự kiến', tsFormatMoney(advanceAmount)]);
    }
    let rowsHtml = '';
    for (let i = 0; i < items.length; i += 2) {
      const [l1, v1] = items[i];
      const pair2 = items[i + 1];
      rowsHtml += pairRow(l1, v1, pair2 ? pair2[0] : '', pair2 ? pair2[1] : '');
    }
    rowsHtml += `
      <tr class="denom-summary-row denom-summary-total-row">
        <td class="ds-label" colspan="3">Tổng tiền</td>
        <td class="mono ds-value"><span style="color:var(--red);">${tsFormatMoney(totals.totalAmount)}</span></td>
      </tr>`;

    summaryTableHtml = `
      <div class="pax-table-wrap grid-table-wrap" style="margin-top:18px; margin-bottom:8px;">
        <table class="pax-table denom-summary-table">
          <colgroup>
            <col style="width:27%"><col style="width:23%"><col style="width:27%"><col style="width:23%">
          </colgroup>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }

  return `
    <div class="pax-table-wrap grid-table-wrap" style="margin-bottom:8px;">
      <table class="pax-table denom-grid-table">
        <thead>${theadHtml}</thead>
        ${stationGroups}
      </table>
    </div>
    ${summaryTableHtml}`;
}

function tsRenderStaffTableHtml(staffBreakdown) {
  const staffIds = Object.keys(staffBreakdown || {});
  if (!staffIds.length) return '<p style="color:var(--text-sub);font-size:13px;">Chưa có dữ liệu.</p>';
  const rows = staffIds.map(id => {
    const v = staffBreakdown[id];
    return `<tr><td>${tsEsc(id)}</td><td class="mono" style="text-align:center;">${v.tickets}</td><td style="text-align:right;">${tsFormatMoney(v.amount)}</td></tr>`;
  }).join('');
  return `
    <div class="pax-table-wrap" style="margin-bottom:8px;">
      <table class="pax-table">
        <thead><tr><th>Nhân viên tạo phơi</th><th style="text-align:center;">Số vé</th><th style="text-align:right;">Doanh thu</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function tsRenderReopenHistoryTableHtml(events) {
  const rows = events.map(e => {
    const statusLabel = e.status === 'OPEN' ? 'Đang mở' : 'Đã đóng';
    const statusClass = e.status === 'OPEN' ? 'status-reopen' : 'status-reopen_closed';
    return `<tr>
      <td class="mono" style="text-align:center;">#${e.sequence}</td>
      <td class="mono">${formatActionTime(e.time)}</td>
      <td>${tsEsc(e.staffId)}</td>
      <td>${tsEsc(e.reason)}</td>
      <td class="mono" style="text-align:center;">${e.status === 'CLOSED' ? (e.ticketsAdded || 0) : '—'}</td>
      <td style="text-align:right;">${e.status === 'CLOSED' ? tsFormatSignedMoney(e.amountAdded || 0) : '—'}</td>
      <td><span class="trip-status-badge ${statusClass}" style="display:inline-flex;">${statusLabel}</span></td>
    </tr>`;
  }).join('');
  return `
    <div class="pax-table-wrap grid-table-wrap" style="margin-bottom:8px;">
      <table class="pax-table lined-table">
        <thead><tr><th>Lần</th><th>Thời gian</th><th>Nhân viên mở</th><th>Lý do</th><th style="text-align:center;">Vé phát sinh</th><th style="text-align:right;">Tiền</th><th>Trạng thái</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function tsRenderViolationsTableHtml(violations) {
  const rows = violations.map(v => `<tr>
    <td class="mono">${formatActionTime(v.time)}</td>
    <td class="mono" style="text-align:center;">${v.diffCount > 0 ? '+' : ''}${v.diffCount}</td>
    <td>${tsEsc(v.checker)}</td>
    <td>${tsEsc(v.note || '—')}</td>
    <td style="text-align:right;">${tsFormatMoney(v.penaltyAmount)}</td>
    <td>${tsEsc(v.status)}</td>
  </tr>`).join('');
  return `
    <div class="pax-table-wrap" style="margin-bottom:8px;">
      <table class="pax-table">
        <thead><tr><th>Thời gian</th><th style="text-align:center;">Chênh lệch</th><th>Người kiểm tra</th><th>Ghi chú</th><th style="text-align:right;">Mức phạt</th><th>Trạng thái</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function tsEsc(str) {
  return (typeof escapeHtml === 'function') ? escapeHtml(str) : String(str == null ? '' : str);
}

/* ===================== 8. GHI ĐÈ/BỌC CÁC HÀM CÓ SẴN Ở ticketstaff.js ===================== */
// Bọc thay vì sửa trực tiếp ticketstaff.js — script này nạp sau nên hàm gọi qua data-action (window[name])
// sẽ tự động lấy đúng bản mới nhất.

(function () {
  const originalSelectTrip = window.selectTrip;
  if (typeof originalSelectTrip === 'function') {
    window.selectTrip = function (el, time, routeLabel) {
      originalSelectTrip(el, time, routeLabel);
      renderTripLifecycleUI();
    };
  }
})();

(function () {
  const originalOnSeatClick = window.onSeatClick;
  if (typeof originalOnSeatClick === 'function') {
    window.onSeatClick = function (ev, code) {
      if (tsIsSellingLocked(currentTripId)) {
        showToast('Chuyến đã khởi hành — bấm "Re-open" ở đầu trang để thao tác lại trên sơ đồ ghế');
        return;
      }
      return originalOnSeatClick(ev, code);
    };
  }
})();

// onSeatClick chặn được thao tác click trực tiếp lên ô ghế, nhưng còn 2 đường KHÔNG đi qua onSeatClick
// nên phải khóa riêng từng hàm:
//  - Nút "Hủy" nhỏ trên mỗi ghế đã bán gọi thẳng openCancelModal() và có data-stop-propagation="1"
//    (xem renderSeats() ở ticketstaff.js) nên không bao giờ chạy qua onSeatClick.
//  - Luồng "Đặt lại vé" (rebook) ở tab Lịch sử có sơ đồ chọn ghế riêng, không dùng onSeatClick, nên
//    confirmRebook()/confirmRebookAndSell() phải tự kiểm tra khóa theo đúng chuyến đích
//    (rebookSelectedTripId, có thể khác currentTripId đang xem).
// sellTicket()/confirmSellPayment()/sellFromTransferBar() chỉ mở/chạy được từ 1 panel đã mở qua
// onSeatClick nên về lý thuyết không gọi được khi đã khóa — vẫn khóa thêm ở đây làm lớp phòng thủ thứ 2
// phòng trường hợp panel đã mở từ trước lúc bấm "Khởi hành xe".
(function () {
  const lockMsg = 'Chuyến đã khởi hành — bấm "Re-open" ở đầu trang để thao tác lại trên sơ đồ ghế';

  const originalOpenCancelModal = window.openCancelModal;
  if (typeof originalOpenCancelModal === 'function') {
    window.openCancelModal = function (code) {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalOpenCancelModal(code);
    };
  }

  const originalConfirmCancel = window.confirmCancel;
  if (typeof originalConfirmCancel === 'function') {
    window.confirmCancel = function () {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalConfirmCancel();
    };
  }

  const originalOpenCancelModalForCodes = window.openCancelModalForCodes;
  if (typeof originalOpenCancelModalForCodes === 'function') {
    window.openCancelModalForCodes = function (codes) {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalOpenCancelModalForCodes(codes);
    };
  }

  const originalCancelSelectedFromTransferBar = window.cancelSelectedFromTransferBar;
  if (typeof originalCancelSelectedFromTransferBar === 'function') {
    window.cancelSelectedFromTransferBar = function () {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalCancelSelectedFromTransferBar();
    };
  }

  const originalSellTicket = window.sellTicket;
  if (typeof originalSellTicket === 'function') {
    window.sellTicket = function () {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalSellTicket();
    };
  }

  const originalConfirmSellPayment = window.confirmSellPayment;
  if (typeof originalConfirmSellPayment === 'function') {
    window.confirmSellPayment = function () {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalConfirmSellPayment();
    };
  }

  const originalSellFromTransferBar = window.sellFromTransferBar;
  if (typeof originalSellFromTransferBar === 'function') {
    window.sellFromTransferBar = function () {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalSellFromTransferBar();
    };
  }

  // "Chuyển ghế" / "Đặt vé nhóm" / "Khôi phục vé hủy" trên thanh chuyển ghế — về lý thuyết chỉ bấm được
  // sau khi đã chọn ghế qua onSeatClick (đã khóa ở trên), nhưng vẫn khóa thêm ở đây phòng trường hợp
  // chuyến bị khởi hành/đóng Re-open NGAY LÚC đang có sẵn lượt chọn dở dang (vd 2 nhân viên thao tác
  // cùng lúc), tránh hoàn tất chuyển/đặt ghế trên 1 chuyến đã khóa bán vé.
  const originalConfirmSelectionAction = window.confirmSelectionAction;
  if (typeof originalConfirmSelectionAction === 'function') {
    window.confirmSelectionAction = function () {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalConfirmSelectionAction();
    };
  }

  // "Đặt thêm cho nhóm" trên thanh chọn ghế — cũng ghi vé mới lên sơ đồ nên phải khóa khi chuyến đã
  // khởi hành / đóng Re-open, giống confirmSelectionAction ở trên.
  const originalConfirmAddToGroup = window.confirmAddToGroup;
  if (typeof originalConfirmAddToGroup === 'function') {
    window.confirmAddToGroup = function () {
      if (tsIsSellingLocked(currentTripId)) { showToast(lockMsg); return; }
      return originalConfirmAddToGroup();
    };
  }

  const originalConfirmRebook = window.confirmRebook;
  if (typeof originalConfirmRebook === 'function') {
    window.confirmRebook = function () {
      if (tsIsSellingLocked(rebookSelectedTripId)) { showToast(lockMsg); return; }
      return originalConfirmRebook();
    };
  }

  const originalConfirmRebookAndSell = window.confirmRebookAndSell;
  if (typeof originalConfirmRebookAndSell === 'function') {
    window.confirmRebookAndSell = function () {
      if (tsIsSellingLocked(rebookSelectedTripId)) { showToast(lockMsg); return; }
      return originalConfirmRebookAndSell();
    };
  }
})();

// Thêm view "shiftClosing" (trang Kết ca) vào cùng cơ chế switchView('booking'/'pickup'/'history') có
// sẵn — bọc thay vì sửa trực tiếp ticketstaff.js. Ẩn/hiện #shiftClosingView giống hệt cách hàm gốc đang
// ẩn/hiện #historyView/#pickupView, để chuyển qua lại giữa các view không bị lẫn.
(function () {
  const originalSwitchView = window.switchView;
  if (typeof originalSwitchView !== 'function') return;
  window.switchView = function (viewName) {
    const shiftView = document.getElementById('shiftClosingView');
    if (viewName === 'shiftClosing') {
      if (typeof currentView !== 'undefined') currentView = 'shiftClosing';
      const zone1 = document.querySelector('aside.zone1');
      const zone1Toggle = document.getElementById('zone1ToggleBtn');
      const rightCol = document.querySelector('.right-col');
      const historyView = document.getElementById('historyView');
      const pickupView = document.getElementById('pickupView');
      const tabBooking = document.getElementById('tabBooking');
      const tabPickup = document.getElementById('tabPickup');
      const tabHistory = document.getElementById('tabHistory');
      if (zone1) zone1.style.display = 'none';
      if (zone1Toggle) zone1Toggle.style.display = 'none';
      if (rightCol) rightCol.style.display = 'none';
      if (historyView) historyView.style.display = 'none';
      if (pickupView) pickupView.style.display = 'none';
      if (tabBooking) tabBooking.classList.remove('active');
      if (tabPickup) tabPickup.classList.remove('active');
      if (tabHistory) tabHistory.classList.remove('active');
      if (shiftView) shiftView.style.display = 'flex';
      renderShiftClosingPage();
      return;
    }
    if (shiftView) shiftView.style.display = 'none';
    originalSwitchView(viewName);
  };
})();

// Dropdown "Thao tác" ở zone2 — gộp toàn bộ nút vòng đời chuyến (Chỉ định xe/Khởi hành xe/Re-open...)
// vào 1 nút bấm để mở thay vì hiện thẳng thành hàng nút, cùng cơ chế mở/đóng với dropdown tài khoản
// (initUserMenu trong ticketstaff.js): bấm nút để bật/tắt, bấm ra ngoài hoặc Esc thì đóng, bấm 1 nút
// hành động bên trong thì tự đóng lại sau khi hành động đã chạy.
(function initZ2ActionsMenu() {
  const menu = document.getElementById('z2ActionsMenu');
  const btn = document.getElementById('z2ActionsBtn');
  const dropdown = document.getElementById('tripLifecycleActions');
  if (!menu || !btn || !dropdown) return;

  function closeMenu() {
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    dropdown.style.display = 'none';
  }
  function openMenu() {
    menu.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    dropdown.style.display = 'flex';
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.classList.contains('open')) closeMenu();
    else openMenu();
  });
  dropdown.addEventListener('click', (e) => {
    if (e.target.closest('button')) closeMenu();
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();

/* ===================== 9. KHỞI TẠO ===================== */

window.renderTripLifecycleUI = renderTripLifecycleUI;
window.openDepartModal = openDepartModal;
window.confirmDepart = confirmDepart;
window.openReopenModal = openReopenModal;
window.confirmReopen = confirmReopen;
window.openCloseReopenModal = openCloseReopenModal;
window.confirmCloseReopen = confirmCloseReopen;
window.openReopenLiveView = openReopenLiveView;
window.openReopenHistoryView = openReopenHistoryView;
window.openManifestView = openManifestView;
window.printManifestView = printManifestView;
window.openViolationModalFromManifest = openViolationModalFromManifest;
window.openViolationModal = openViolationModal;
window.onViolationActualInput = onViolationActualInput;
window.confirmViolation = confirmViolation;
window.renderShiftClosingPage = renderShiftClosingPage;
window.onShiftActualInput = onShiftActualInput;
window.confirmShiftClosing = confirmShiftClosing;
window.openShiftClosingHistoryForTrip = openShiftClosingHistoryForTrip;

renderTripLifecycleUI();
