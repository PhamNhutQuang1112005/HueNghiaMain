/* =========================================================
   DELIVERY.JS — Nghiệp vụ GIAO HÀNG (delivery.html)
   Nhà Xe Huệ Nghĩa

   Khác với Nhận hàng (cargo.js): trang này KHÔNG tạo đơn hàng mới.
   Danh sách chỉ gồm những hàng đã được nhận, xếp vào chuyến xe đi,
   và chuyến xe đó đã "Đã nhận xe" (đến trạm nhận) qua manifest.html
   → Danh sách chuyến xe đến. Dữ liệu đọc/ghi chung 2 key localStorage
   với cargo.js/manifest.html: hueNghia_cargos, hueNghia_manifests.
   ========================================================= */

const STORAGE_KEYS = {
  MANIFESTS: 'hueNghia_manifests',
  CARGOS: 'hueNghia_cargos'
};

const DELIVERY_STATUS_DEFS = {
  'cho-giao': { label: 'Chờ giao', cls: 'status-pending' },
  'dang-giao': { label: 'Đang giao', cls: 'status-in-transit' },
  'da-giao': { label: 'Đã giao', cls: 'status-delivered' },
  'that-bai': { label: 'Giao không thành công', cls: 'status-fail' },
  'hen-lai': { label: 'Hẹn giao lại', cls: 'status-reschedule' },
  'da-hoan': { label: 'Đã hoàn', cls: 'status-returned' }
};

function loadManifests() {
  const saved = localStorage.getItem(STORAGE_KEYS.MANIFESTS);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [];
}

function loadCargos() {
  const saved = localStorage.getItem(STORAGE_KEYS.CARGOS);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [];
}

function saveCargos(cargos) {
  localStorage.setItem(STORAGE_KEYS.CARGOS, JSON.stringify(cargos));
}

function isMoneyCargo(cargo) {
  if (!cargo) return false;
  const cat = cargo.cargoCategory;
  if (cat === 'cash' || cat === 'hot' || cat === 'partner_cash') return true;
  const name = (cargo.name || '').toLowerCase();
  if (name.includes('bạn hàng') || name.includes('tiền nóng') || name.includes('gửi tiền') || name.includes('tiền thường') || name.includes('chuyển tiền') || name.includes('năm ngàn')) return true;
  return false;
}

function getCargoMoneyText(cargo) {
  if (!cargo) return '0đ';
  let amt = cargo.moneyAmount;
  if (!amt) {
    const name = (cargo.name || '').toLowerCase();
    if (name.includes('năm ngàn') || name.includes('5 ngàn') || name.includes('5k')) amt = 5000;
    else if (name.includes('mười ngàn') || name.includes('10 ngàn') || name.includes('10k')) amt = 10000;
    else if (name.includes('hai mươi ngàn') || name.includes('20 ngàn') || name.includes('20k')) amt = 20000;
    else if (name.includes('năm mươi ngàn') || name.includes('50 ngàn') || name.includes('50k')) amt = 50000;
    else if (name.includes('trăm ngàn') || name.includes('100k')) amt = 100000;
    else {
      const match = name.match(/(\d+[\d\.]*)\s*(tr|triệu|k|ngàn|đ|vnd)?/i);
      if (match) {
        const numStr = match[1].replace(/\./g, '');
        const num = parseInt(numStr, 10);
        const unit = (match[2] || '').toLowerCase();
        if (unit === 'tr' || unit === 'triệu') amt = num * 1000000;
        else if (unit === 'k' || unit === 'ngàn') amt = num * 1000;
        else if (num < 1000) amt = num * 1000000;
        else amt = num;
      }
    }
  }
  if (amt) {
    const val = Number(String(amt).replace(/\D/g, ''));
    if (!isNaN(val) && val > 0) {
      return val.toLocaleString('vi-VN') + 'đ';
    }
  }
  return '50.000đ';
}

function formatCargoQuantity(cargo) {
  if (!cargo) return '1 cái';
  if (isMoneyCargo(cargo)) return getCargoMoneyText(cargo);
  const q = cargo.quantity || 1;
  const origQ = cargo.originalQuantity || q;
  const unit = cargo.unit || 'cái';
  if (origQ > q) return `${q}/${origQ} ${unit}`;
  return `${q} ${unit}`;
}

const CATEGORY_LABELS = { goods: 'Hàng hóa', cash: 'Tiền thường', partner_cash: 'Tiền thường', hot: 'Tiền nóng', baga: 'Baga' };

let allCargos = [];
let manifestsById = {};

function isManifestArrived(manifest) {
  return !!manifest && (manifest.status === 'received' || manifest.statusText === 'Đã nhận xe');
}

/* Hiển thị tất cả hàng hóa từ Nhận hàng sang Danh sách giao hàng */
function isEligibleForDelivery(cargo) {
  return !!cargo;
}

/* Gán mặc định "Chờ giao" cho các đơn vừa đủ điều kiện giao mà chưa từng được khởi tạo
   deliveryStatus (ví dụ vừa được Nhận xe ở manifest.html xong). */
function ensureDeliveryDefaults() {
  let changed = false;
  allCargos.forEach(c => {
    if (isEligibleForDelivery(c)) {
      if (!c.deliveryStatus) {
        c.deliveryStatus = 'cho-giao';
        changed = true;
      }
      if (!c.deliveryStaff) {
        c.deliveryStaff = c.staff || 'NV Giao Hàng';
        changed = true;
      }
    }
  });
  if (changed) saveCargos(allCargos);
}

function reloadData() {
  allCargos = loadCargos();
  const manifests = loadManifests();
  manifestsById = {};
  manifests.forEach(m => { manifestsById[m.id] = m; });
  ensureDeliveryDefaults();
}

function populateDeliveryStaffFilter() {
  const select = document.getElementById('filterDeliveryStaff');
  if (!select) return;
  const current = select.value;
  const staffSet = new Set();
  allCargos.forEach(c => {
    if (isEligibleForDelivery(c) && c.deliveryStaff) staffSet.add(c.deliveryStaff);
  });
  select.innerHTML = '<option value="all">Tất cả nhân viên</option>' +
    Array.from(staffSet).sort().map(s => `<option value="${s}">${s}</option>`).join('');
  if (current && (current === 'all' || staffSet.has(current))) {
    select.value = current;
  }
}

function getFilters() {
  return {
    date: (document.getElementById('filterDeliveryDate') || {}).value || '',
    status: (document.getElementById('filterDeliveryStatus') || {}).value || 'all',
    stationTo: (document.getElementById('filterStationTo') || {}).value || 'all',
    staff: (document.getElementById('filterDeliveryStaff') || {}).value || 'all',
    category: (document.getElementById('filterDeliveryCategory') || {}).value || 'all',
    search: ((document.getElementById('globalSearch') || {}).value || '').trim().toLowerCase()
  };
}

function refDateOf(cargo) {
  // "Ngày giao" lọc theo ngày thực giao nếu đã giao, không thì theo ngày xe đến trạm.
  const raw = cargo.deliveredAt || (manifestsById[cargo.manifestId] || {}).arrivedAt || '';
  const m = raw.match(/(\d{2})\/(\d{2})(?:\/(\d{2,4}))?\s*$/) || raw.match(/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const now = new Date();
  const year = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(now.getFullYear());
  return `${year}-${m[2]}-${m[1]}`;
}

function getFilteredList() {
  const f = getFilters();
  return allCargos.filter(c => {
    if (!isEligibleForDelivery(c)) return false;
    if (f.status !== 'all' && (c.deliveryStatus || 'cho-giao') !== f.status) return false;
    if (f.stationTo !== 'all' && c.stationTo !== f.stationTo) return false;
    if (f.staff !== 'all' && c.deliveryStaff !== f.staff) return false;
    if (f.category !== 'all' && (c.cargoCategory || 'goods') !== f.category) return false;
    if (f.date) {
      const rd = refDateOf(c);
      if (rd !== f.date) return false;
    }
    if (f.search) {
      const hay = [c.code, c.name, c.receiver, c.receiverPhone].join(' ').toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    return true;
  }).sort((a, b) => Number(b.id) - Number(a.id));
}

function statusBadgeHtml(cargo) {
  const def = DELIVERY_STATUS_DEFS[cargo.deliveryStatus] || DELIVERY_STATUS_DEFS['cho-giao'];
  return `<span class="status-pill ${def.cls}">${def.label}</span>`;
}

function closeAllRowActionMenus() {
  document.querySelectorAll('.action-more-menu.open').forEach(m => m.classList.remove('open'));
}
document.addEventListener('click', () => closeAllRowActionMenus());

window.toggleRowActionMenu = function (event, id) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('actionMenu-' + id);
  const wasOpen = menu && menu.classList.contains('open');
  closeAllRowActionMenus();
  if (menu && !wasOpen) menu.classList.add('open');
};

function buildRow(cargo, index) {
  const manifest = manifestsById[cargo.manifestId] || {};
  const catLabel = CATEGORY_LABELS[cargo.cargoCategory] || '';
  const isDone = cargo.deliveryStatus === 'da-giao';
  const canDelete = (cargo.deliveryStatus || 'cho-giao') === 'cho-giao';

  return `
    <tr>
      <td style="text-align:center;"><input type="checkbox" class="row-checkbox" data-id="${cargo.id}" /></td>
      <td style="text-align:center;"><strong>${index + 1}</strong></td>
      <td>
        <strong class="cargo-name">${(cargo.name || '').replace(/🧳/g, '').trim()}</strong> <span style="font-size:11.5px; font-weight:700; color:#64748b;">(${formatCargoQuantity(cargo)})</span><br>
        <code>${cargo.code}</code>
        ${catLabel ? `<div style="font-size:11px; color:#94a3b8; margin-top:2px;">${catLabel}</div>` : ''}
      </td>
      <td>
        <div style="font-weight:700; color:#0f172a; font-size:12.5px;">Xe: ${manifest.plate || '—'}</div>
        <div style="font-size:12px; color:#334155; margin-top:2px;">${cargo.stationFrom || manifest.from || '—'} ➔ ${cargo.stationTo || manifest.to || '—'}</div>
        <div style="font-size:11px; color:#64748b; margin-top:2px;">Đến trạm: ${manifest.arrivedAt || '—'}</div>
      </td>
      <td>
        <div style="line-height:1.35; font-size:12.5px;">
          <strong>${cargo.receiver || '—'}</strong><br>
          <span style="color:#475569;">${cargo.receiverPhone || ''}</span><br>
          <small style="color:var(--text-muted);">${cargo.deliveryAddress || cargo.stationTo || ''}</small>
        </div>
      </td>
      <td>
        <div style="font-size:11.5px; color:#475569;">Cước: <strong style="color:#0f172a;">${Number(cargo.fee || 0).toLocaleString('vi-VN')}đ</strong></div>
        ${Number(cargo.codAmount || 0) > 0 ? `<div style="font-size:11.5px; color:#475569; margin-top:2px;">COD cần thu: <strong style="color:#0f172a;">${Number(cargo.codAmount).toLocaleString('vi-VN')}đ</strong></div>` : ''}
        ${isDone && Number(cargo.codCollected || 0) > 0 ? `<div style="margin-top:3px;"><span class="mini-tag" style="color:#15803d; border-color:#86efac; background:#f0fdf4;">Đã thu: ${Number(cargo.codCollected).toLocaleString('vi-VN')}đ</span></div>` : ''}
      </td>
      <td>
        <div style="font-weight:700; color:#0f172a; font-size:12.5px;">${cargo.deliveryStaff || cargo.staff || 'NV Giao Hàng'}</div>
        ${cargo.deliveryStaffPhone ? `<small style="color:var(--text-muted);">${cargo.deliveryStaffPhone}</small>` : ''}
      </td>
      <td style="text-align:center;">
        ${statusBadgeHtml(cargo)}
        ${cargo.deliveryFailReason && (cargo.deliveryStatus === 'that-bai' || cargo.deliveryStatus === 'hen-lai') ? `<div style="font-size:10.5px; color:#94a3b8; margin-top:3px;" title="${cargo.deliveryFailReason}">${cargo.deliveryFailReason}</div>` : ''}
      </td>
      <td style="text-align:center;">
        <div class="action-group">
          <button class="rowicon-btn" onclick="openDeliveryDetailModal(${cargo.id})" title="Xem chi tiết">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="rowicon-btn" onclick="openAssignDeliveryModal(${cargo.id})" title="Cập nhật giao hàng">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          ${canDelete ? `<button class="rowicon-btn rowicon-btn--danger" onclick="deleteDeliveryOrder(${cargo.id})" title="Xóa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>` : ''}
          <div class="action-more-wrap">
            <button class="rowicon-btn" onclick="toggleRowActionMenu(event, ${cargo.id})" title="Thêm">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
            </button>
            <div class="action-more-menu" id="actionMenu-${cargo.id}">
              <button type="button" ${isDone ? '' : 'disabled style="opacity:.45; cursor:not-allowed;"'} onclick="closeAllRowActionMenus(); ${isDone ? `openDeliveryReceiptModal(${cargo.id})` : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Biên lai giao hàng
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function updateBatchAssignButton() {
  const checkboxes = document.querySelectorAll('.row-checkbox:checked');
  const btn = document.getElementById('batchAssignBtn');
  const countEl = document.getElementById('selectedCount');
  if (countEl) countEl.textContent = checkboxes.length;
  if (btn) btn.style.display = checkboxes.length > 0 ? 'inline-flex' : 'none';
}

function renderTable() {
  const tbody = document.getElementById('deliveryTableBody');
  if (!tbody) return;
  const rows = getFilteredList();
  tbody.innerHTML = rows.length
    ? rows.map((c, i) => buildRow(c, i)).join('')
    : '<tr><td colspan="9" style="text-align:center;padding:24px;color:#6b7280;">Chưa có hàng hóa trong danh sách giao hàng.</td></tr>';

  document.querySelectorAll('.row-checkbox').forEach(cb => cb.addEventListener('change', updateBatchAssignButton));
  const selectAll = document.getElementById('selectAllCheckbox');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.onclick = () => {
      document.querySelectorAll('.row-checkbox').forEach(cb => { cb.checked = selectAll.checked; });
      updateBatchAssignButton();
    };
  }
  updateBatchAssignButton();
}

/* ---------------------------------------------------------
   CHI TIẾT GIAO HÀNG
   --------------------------------------------------------- */
function timelineHtml(cargo, manifest) {
  const steps = [
    { key: 'arrived', label: 'Xe đến trạm', time: manifest.arrivedAt, done: true },
    { key: 'cho-giao', label: 'Chờ giao', time: '', done: true },
    { key: 'dang-giao', label: 'Đã phân công / Đang giao', time: cargo.pickedUpAt, done: ['dang-giao', 'da-giao', 'that-bai', 'hen-lai', 'da-hoan'].includes(cargo.deliveryStatus) },
    { key: 'da-giao', label: cargo.deliveryStatus === 'that-bai' ? 'Giao không thành công' : (cargo.deliveryStatus === 'hen-lai' ? 'Hẹn giao lại' : 'Đã giao'), time: cargo.deliveredAt, done: ['da-giao', 'that-bai', 'hen-lai', 'da-hoan'].includes(cargo.deliveryStatus) }
  ];
  return `
    <div class="delivery-timeline">
      ${steps.map(s => `
        <div class="delivery-timeline-step ${s.done ? 'is-done' : ''}">
          <span class="delivery-timeline-dot"></span>
          <div>
            <div class="delivery-timeline-label">${s.label}</div>
            ${s.time ? `<div class="delivery-timeline-time">${s.time}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

window.openDeliveryDetailModal = function (id) {
  const cargo = allCargos.find(c => Number(c.id) === Number(id));
  if (!cargo) return;
  const manifest = manifestsById[cargo.manifestId] || {};
  const catLabel = CATEGORY_LABELS[cargo.cargoCategory] || '—';
  const payText = cargo.paymentStatus === 'free' ? 'Không thu phí' : (cargo.paymentStatus === 'paid' ? `Đã thu (${cargo.paidMethod === 'transfer' ? (cargo.transferCode || 'CK') : 'Tiền mặt'})` : 'Chưa thu tiền');

  document.getElementById('deliveryDetailTitle').textContent = `${(cargo.name || '').replace(/🧳/g, '').trim()} — ${cargo.code}`;
  document.getElementById('deliveryDetailContent').innerHTML = `
    <div class="cargo-detail-minimal">
      <div class="minimal-header">
        <div class="minimal-title-wrap">
          <h3 class="minimal-title">${(cargo.name || '').replace(/🧳/g, '').trim()}</h3>
          <span class="minimal-code">Mã hàng: ${cargo.code}</span>
        </div>
        ${statusBadgeHtml(cargo)}
      </div>

      <div class="form-section">
        <div class="minimal-label">Thông tin hàng hóa</div>
        <div class="minimal-grid-4" style="margin-top:6px;">
          <div class="minimal-col"><div class="minimal-label">Mã hàng</div><div class="minimal-val">${cargo.code}</div></div>
          <div class="minimal-col"><div class="minimal-label">Tên hàng</div><div class="minimal-val">${(cargo.name || '').replace(/🧳/g, '').trim()}</div></div>
          <div class="minimal-col"><div class="minimal-label">Số lượng</div><div class="minimal-val">${formatCargoQuantity(cargo)}</div></div>
          <div class="minimal-col"><div class="minimal-label">Loại hàng</div><div class="minimal-val">${catLabel}</div></div>
        </div>
      </div>

      <div class="form-section">
        <div class="minimal-label">Hành trình</div>
        <div class="minimal-route-text" style="margin-top:6px;"><span class="route-badge">${cargo.stationFrom || manifest.from || '—'}</span> ➔ <span class="route-badge">${cargo.stationTo || manifest.to || '—'}</span></div>
        <div class="minimal-grid-2" style="margin-top:10px;">
          <div class="minimal-col"><div class="minimal-label">Chuyến xe đi</div><div class="minimal-val">Xe: ${manifest.plate || '—'} • ${manifest.route || ''}</div></div>
          <div class="minimal-col"><div class="minimal-label">TG xuất bến</div><div class="minimal-val">${manifest.departTime || manifest.time || '—'}</div></div>
          <div class="minimal-col"><div class="minimal-label">Trạm nhận</div><div class="minimal-val">${cargo.stationTo || manifest.to || '—'}</div></div>
          <div class="minimal-col"><div class="minimal-label">TG xe đến</div><div class="minimal-val">${manifest.arrivedAt || '—'}</div></div>
        </div>
      </div>

      <div class="form-section">
        <div class="minimal-label">Người nhận</div>
        <div class="minimal-grid-2" style="margin-top:6px;">
          <div class="minimal-col"><div class="minimal-label">Họ tên</div><div class="minimal-val-main">${cargo.receiver || '—'}</div></div>
          <div class="minimal-col"><div class="minimal-label">SĐT</div><div class="minimal-val-main">${cargo.receiverPhone || '—'}</div></div>
        </div>
        <div class="minimal-col" style="margin-top:10px;"><div class="minimal-label">Địa chỉ giao</div><div class="minimal-val">${cargo.deliveryAddress || '—'}</div></div>
        ${cargo.note ? `<div class="minimal-col" style="margin-top:10px;"><div class="minimal-label">Ghi chú giao hàng</div><div class="minimal-subtext note">${cargo.note}</div></div>` : ''}
      </div>

      <div class="form-section">
        <div class="minimal-label">Thanh toán</div>
        <div class="minimal-grid-4" style="margin-top:6px;">
          <div class="minimal-col"><div class="minimal-label">Cước</div><div class="minimal-val bold">${Number(cargo.fee || 0).toLocaleString('vi-VN')}đ</div></div>
          <div class="minimal-col"><div class="minimal-label">COD cần thu</div><div class="minimal-val bold">${Number(cargo.codAmount || 0).toLocaleString('vi-VN')}đ</div></div>
          <div class="minimal-col"><div class="minimal-label">COD thực thu</div><div class="minimal-val bold">${Number(cargo.codCollected || 0).toLocaleString('vi-VN')}đ</div></div>
          <div class="minimal-col"><div class="minimal-label">Phương thức</div><div class="minimal-val">${payText}</div></div>
        </div>
      </div>

      <div class="form-section">
        <div class="minimal-label">Giao hàng</div>
        <div class="minimal-grid-4" style="margin-top:6px;">
          <div class="minimal-col"><div class="minimal-label">Nhân viên giao</div><div class="minimal-val">${cargo.deliveryStaff || 'Chưa phân công'}</div></div>
          <div class="minimal-col"><div class="minimal-label">TG nhận hàng đi giao</div><div class="minimal-val">${cargo.pickedUpAt || '—'}</div></div>
          <div class="minimal-col"><div class="minimal-label">TG giao thành công</div><div class="minimal-val">${cargo.deliveredAt || '—'}</div></div>
          <div class="minimal-col"><div class="minimal-label">Trạng thái</div><div class="minimal-val">${DELIVERY_STATUS_DEFS[cargo.deliveryStatus] ? DELIVERY_STATUS_DEFS[cargo.deliveryStatus].label : '—'}</div></div>
        </div>
        ${cargo.deliveryFailReason ? `<div class="minimal-col" style="margin-top:10px;"><div class="minimal-label">Lý do giao thất bại</div><div class="minimal-subtext note">${cargo.deliveryFailReason}</div></div>` : ''}
      </div>

      <div class="form-section">
        <div class="minimal-label" style="margin-bottom:8px;">Lịch sử trạng thái</div>
        ${timelineHtml(cargo, manifest)}
      </div>
    </div>
  `;
  document.getElementById('deliveryDetailModal').classList.add('open');
};

document.addEventListener('DOMContentLoaded', () => {
  const closeDetailBtn1 = document.getElementById('closeDeliveryDetailModalBtn');
  const closeDetailBtn2 = document.getElementById('closeDeliveryDetailBtn');
  [closeDetailBtn1, closeDetailBtn2].forEach(btn => {
    if (btn) btn.addEventListener('click', () => document.getElementById('deliveryDetailModal').classList.remove('open'));
  });
});

/* ---------------------------------------------------------
   PHÂN CÔNG / CẬP NHẬT GIAO HÀNG
   --------------------------------------------------------- */
function updateAssignFormVisibility() {
  const status = document.getElementById('assignStatus').value;
  document.getElementById('assignCodCollectedWrap').style.display = status === 'da-giao' ? 'flex' : 'none';
  document.getElementById('assignReasonWrap').style.display = (status === 'that-bai' || status === 'hen-lai') ? 'flex' : 'none';
}

window.openAssignDeliveryModal = function (id) {
  const cargo = allCargos.find(c => Number(c.id) === Number(id));
  if (!cargo) return;
  document.getElementById('assignDeliveryId').value = cargo.id;
  const staffInput = document.getElementById('assignStaffName');
  if (staffInput) staffInput.value = cargo.deliveryStaff || cargo.staff || 'NV Giao Hàng';
  const staffPhoneInput = document.getElementById('assignStaffPhone');
  if (staffPhoneInput) staffPhoneInput.value = cargo.deliveryStaffPhone || '';
  document.getElementById('assignStatus').value = cargo.deliveryStatus || 'cho-giao';
  document.getElementById('assignCodCollected').value = cargo.codCollected || cargo.codAmount || '';
  document.getElementById('assignReason').value = cargo.deliveryFailReason || '';
  updateAssignFormVisibility();
  document.getElementById('assignDeliveryModal').classList.add('open');
};

function closeAssignDeliveryModal() {
  document.getElementById('assignDeliveryModal').classList.remove('open');
}

function nowStr() {
  const d = new Date();
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const assignStatusSelect = document.getElementById('assignStatus');
  if (assignStatusSelect) assignStatusSelect.addEventListener('change', updateAssignFormVisibility);

  const cancelBtn = document.getElementById('cancelAssignDeliveryBtn');
  const closeBtn = document.getElementById('closeAssignDeliveryModalBtn');
  [cancelBtn, closeBtn].forEach(btn => { if (btn) btn.addEventListener('click', closeAssignDeliveryModal); });

  const form = document.getElementById('assignDeliveryForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('assignDeliveryId').value;
      const cargo = allCargos.find(c => String(c.id) === String(id));
      if (!cargo) return;

      const prevStatus = cargo.deliveryStatus;
      const newStatus = document.getElementById('assignStatus').value;
      const staffNameEl = document.getElementById('assignStaffName');
      if (staffNameEl && staffNameEl.value.trim()) {
        cargo.deliveryStaff = staffNameEl.value.trim();
      } else if (!cargo.deliveryStaff) {
        cargo.deliveryStaff = cargo.staff || 'NV Giao Hàng';
      }
      const staffPhoneEl = document.getElementById('assignStaffPhone');
      if (staffPhoneEl) cargo.deliveryStaffPhone = staffPhoneEl.value.trim();
      cargo.deliveryStatus = newStatus;

      if (newStatus === 'dang-giao' && prevStatus !== 'dang-giao' && !cargo.pickedUpAt) {
        cargo.pickedUpAt = nowStr();
      }
      if (newStatus === 'da-giao') {
        cargo.codCollected = Number(document.getElementById('assignCodCollected').value || 0);
        cargo.deliveredAt = nowStr();
        cargo.deliveryFailReason = '';
        // Đồng bộ field dùng chung để Đối soát COD (cod.js) tự nhận đơn đã giao.
        cargo.status = 'delivered';
        cargo.statusText = 'Đã giao';
      } else if (newStatus === 'that-bai' || newStatus === 'hen-lai') {
        cargo.deliveryFailReason = document.getElementById('assignReason').value.trim();
      }

      saveCargos(allCargos);
      closeAssignDeliveryModal();
      showDeliveryToast('Đã cập nhật giao hàng');
      populateDeliveryStaffFilter();
      renderTable();
    });
  }
});

/* ---------------------------------------------------------
   PHÂN CÔNG HÀNG LOẠT (chọn nhiều dòng)
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const batchBtn = document.getElementById('batchAssignBtn');
  if (batchBtn) {
    batchBtn.addEventListener('click', () => {
      const ids = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
      if (!ids.length) return;
      const staffName = window.prompt('Nhập tên nhân viên giao hàng để phân công cho ' + ids.length + ' đơn đã chọn:');
      if (!staffName) return;
      allCargos.forEach(c => {
        if (ids.includes(String(c.id))) {
          c.deliveryStaff = staffName.trim();
          if ((c.deliveryStatus || 'cho-giao') === 'cho-giao') c.deliveryStatus = 'dang-giao';
          if (!c.pickedUpAt) c.pickedUpAt = nowStr();
        }
      });
      saveCargos(allCargos);
      showDeliveryToast(`Đã phân công ${ids.length} đơn cho ${staffName.trim()}`);
      populateDeliveryStaffFilter();
      renderTable();
    });
  }
});

/* ---------------------------------------------------------
   XÓA ĐƠN GIAO (chỉ khi đang Chờ giao)
   --------------------------------------------------------- */
window.deleteDeliveryOrder = function (id) {
  const cargo = allCargos.find(c => Number(c.id) === Number(id));
  if (!cargo) return;
  if ((cargo.deliveryStatus || 'cho-giao') !== 'cho-giao') {
    showDeliveryToast('Chỉ có thể xóa đơn đang ở trạng thái Chờ giao');
    return;
  }
  if (!window.confirm(`Xóa đơn giao hàng "${cargo.name}" (${cargo.code})?`)) return;
  allCargos = allCargos.filter(c => Number(c.id) !== Number(id));
  saveCargos(allCargos);
  showDeliveryToast('Đã xóa đơn giao hàng');
  renderTable();
};

/* ---------------------------------------------------------
   BIÊN LAI GIAO HÀNG (rút gọn từ cargo.js, dùng riêng cho trang này)
   --------------------------------------------------------- */
window.openDeliveryReceiptModal = function (id) {
  const cargo = allCargos.find(c => Number(c.id) === Number(id));
  if (!cargo) return;
  const collect = Number(cargo.codCollected || 0);

  document.getElementById('printableReceiptArea').innerHTML = `
    <div style="text-align:center; margin-bottom:14px;">
      <h2 style="margin:0; font-size:18px; font-weight:800; color:var(--primary);">HUỆ NGHĨA EXPRESS</h2>
      <div style="font-size:13px; font-weight:700; margin-top:4px;">BIÊN LAI XÁC NHẬN ĐÃ GIAO HÀNG</div>
      <div style="font-size:11.5px; color:#64748b;">(Phiếu xác nhận đã giao hàng thành công cho người nhận)</div>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:10px;">
      <tr><td style="padding:4px 0; color:#64748b;">Mã hàng</td><td style="padding:4px 0; text-align:right; font-weight:700;">${cargo.code}</td></tr>
      <tr><td style="padding:4px 0; color:#64748b;">Tên hàng</td><td style="padding:4px 0; text-align:right; font-weight:700;">${cargo.name}</td></tr>
      <tr><td style="padding:4px 0; color:#64748b;">Người nhận</td><td style="padding:4px 0; text-align:right; font-weight:700;">${cargo.receiver} (${cargo.receiverPhone || ''})</td></tr>
      <tr><td style="padding:4px 0; color:#64748b;">Cước phí</td><td style="padding:4px 0; text-align:right;">${Number(cargo.fee || 0).toLocaleString('vi-VN')}đ</td></tr>
      <tr><td style="padding:4px 0; color:#64748b;">Đã thu</td><td style="padding:4px 0; text-align:right; font-weight:800; color:#15803d;">${collect.toLocaleString('vi-VN')}đ</td></tr>
      <tr><td style="padding:4px 0; color:#64748b;">Nhân viên giao</td><td style="padding:4px 0; text-align:right;">${cargo.deliveryStaff || '—'}</td></tr>
      <tr><td style="padding:4px 0; color:#64748b;">Thời gian giao</td><td style="padding:4px 0; text-align:right;">${cargo.deliveredAt || '—'}</td></tr>
    </table>
    <div style="display:flex; justify-content:space-between; margin-top:24px; font-size:12px; text-align:center;">
      <div style="flex:1;"><div style="margin-bottom:32px; font-weight:700;">NGƯỜI NHẬN HÀNG</div><div>(Ký, ghi rõ họ tên)</div></div>
      <div style="flex:1;"><div style="margin-bottom:32px; font-weight:700;">NHÂN VIÊN GIAO HÀNG</div><div>(Ký, ghi rõ họ tên)</div></div>
    </div>
  `;
  document.getElementById('deliveryReceiptModal').classList.add('open');
};
window.closeDeliveryReceiptModal = function () {
  document.getElementById('deliveryReceiptModal').classList.remove('open');
};
window.printReceiptNow = function () {
  const area = document.getElementById('printableReceiptArea');
  const container = document.getElementById('printableReceiptContainer');
  if (!area || !container) return;
  container.innerHTML = area.innerHTML;
  container.style.display = 'block';
  window.print();
  container.style.display = 'none';
};

/* ---------------------------------------------------------
   TOAST + KHỞI TẠO
   --------------------------------------------------------- */
function showDeliveryToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showDeliveryToast.timeout);
  showDeliveryToast.timeout = setTimeout(() => toast.classList.remove('show'), 1800);
}

document.addEventListener('DOMContentLoaded', () => {
  reloadData();
  populateDeliveryStaffFilter();

  // Đồng bộ giá trị ban đầu của dropdown "Loại hàng" với tab đang chọn ở sidebar
  // (?filter=... trên URL hoặc giá trị đã lưu trong localStorage), để lần render
  // đầu tiên hiển thị đúng danh sách đã lọc thay vì luôn hiện "Tất cả".
  const categorySelect = document.getElementById('filterDeliveryCategory');
  const urlFilter = new URLSearchParams(window.location.search).get('filter');
  const savedCategory = urlFilter || localStorage.getItem('hueNghia_selectedDeliveryCategory') || 'all';
  if (categorySelect && [...categorySelect.options].some(o => o.value === savedCategory)) {
    categorySelect.value = savedCategory;
  }

  renderTable();

  const filterIds = ['filterDeliveryDate', 'filterDeliveryStatus', 'filterStationTo', 'filterDeliveryStaff', 'filterDeliveryCategory'];
  filterIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderTable);
  });

  // Tab lọc nhanh ở sidebar (Tất cả/Hàng hóa/Tiền thường/Tiền nóng) chỉ đổi UI/URL
  // qua responsive.js, không tự lọc bảng — nên phải đồng bộ giá trị đó vào dropdown
  // "Loại hàng" rồi render lại mỗi khi radio đổi.
  document.querySelectorAll('input[name="deliveryStateFilter"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (categorySelect) categorySelect.value = radio.value;
      renderTable();
    });
  });

  const applyBtn = document.getElementById('applyFilterBtn');
  if (applyBtn) applyBtn.addEventListener('click', renderTable);

  const searchInput = document.getElementById('globalSearch');
  if (searchInput) searchInput.addEventListener('input', renderTable);
});
