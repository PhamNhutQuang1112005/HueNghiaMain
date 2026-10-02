/**
 * Báo cáo Giao hàng — Courier Delivery Report Controller
 * Huệ Nghĩa Express
 *
 * Dữ liệu THẬT: đọc real-time từ local storage `hueNghia_cargos` (đồng bộ với delivery.js).
 * - Đơn "Tiền rồi" (đã trả cước tại nhận hàng): KHÔNG chuyển thành CT ở giao hàng (số tiền cần thu = 0đ).
 * - Đơn "Chưa tiền" (chưa trả cước tại nhận hàng) hoặc có COD:
 *   + Khi chưa quét giao: hiển thị CT (Chưa thu) với số tiền lấy đúng từ Cước phí/COD.
 *   + Khi quét giao thành công: tự động chuyển thành TR (Đã thu) và tính vào số tiền thu của ca giao hàng.
 */

(function () {
  const SHIFTS_KEY = 'hueNghia_delivery_shift_reports';
  const CARGOS_KEY = 'hueNghia_cargos';

  const currentStaff = window.HNAuth ? window.HNAuth.requireLogin() : { code: '', name: 'Nhân viên', station: '' };
  if (window.HNAuth) window.HNAuth.renderUserChip(currentStaff);

  function loadShifts() {
    try {
      return JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    } catch (e) {
      console.error('Error parsing stored delivery shifts:', e);
      return [];
    }
  }

  function saveShifts(data) {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(data));
  }

  function loadCargos() {
    try {
      return JSON.parse(localStorage.getItem(CARGOS_KEY) || '[]');
    } catch (e) {
      console.error('Error parsing stored cargos:', e);
      return [];
    }
  }

  let currentShifts = loadShifts();
  let selectedShiftId = null;

  function formatCurrency(amount) {
    if (!amount && amount !== 0) return '0 VNĐ';
    return Math.round(amount).toLocaleString('vi-VN') + ' VNĐ';
  }

  function formatDateTime(ms) {
    if (!ms) return '';
    if (typeof ms === 'string' && ms.includes('/')) return ms;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return String(ms);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  function formatShortDate(val) {
    if (!val) return '—';
    if (typeof val === 'string' && (val.includes(':') || val.includes('-') || val.includes('/')) && val.length <= 16) return val;
    const d = new Date(Number(val) || val);
    if (isNaN(d.getTime())) return String(val);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${mi} ${dd}-${mm}`;
  }

  // Số tiền giao hàng cần thu từ người nhận cho 1 đơn hàng
  function getDeliveryCollectAmount(c) {
    if (!c) return 0;
    let amt = 0;
    // Nếu ở nhận hàng chưa trả cước (Chưa tiền) -> Lấy cước phí làm số tiền phải thu
    if (c.paymentStatus === 'unpaid' || c.isPaid === false) {
      amt += Number(c.fee || 0);
    }
    // Nếu có tiền COD thu hộ -> Cộng thêm COD
    if (Number(c.codAmount || 0) > 0) {
      amt += Number(c.codAmount || 0);
    }
    return amt;
  }

  // Đơn CT ở Giao hàng: Chưa quét giao VÀ có tiền cần thu tại giao hàng (> 0đ)
  function isDeliveryItemUnpaid(c) {
    if (c.deliveryStatus === 'da-giao') return false;
    return getDeliveryCollectAmount(c) > 0;
  }

  // Đơn TR ở Giao hàng: Đã quét giao hàng thành công
  function isDeliveryItemPaid(c) {
    return c.deliveryStatus === 'da-giao';
  }

  // Tự động kiểm tra & đồng bộ ca giao hàng từ danh sách hàng hóa (hueNghia_cargos)
  function autoSyncShiftsFromCargos() {
    const allCargos = loadCargos();
    let updated = false;

    // 1. Tự động tạo/mở ca cho nhân viên đang đăng nhập nếu có đơn giao
    if (currentStaff && (currentStaff.code || currentStaff.name)) {
      const code = String(currentStaff.code || '').trim();
      const name = String(currentStaff.name || '').trim().toLowerCase();
      const existingOpen = currentShifts.find(
        (s) => !s.endTime && (String(s.staffCode || s.staffId) === code || (name && s.staffName && s.staffName.toLowerCase() === name))
      );

      const staffCargos = allCargos.filter((c) => {
        if (c.status === 'unreceived' || c.isUnreceived) return false;
        const cCode = String(c.deliveryStaffCode || c.deliveredByCode || c.staffCode || c.staff || '').trim();
        const cStaff = String(c.deliveryStaff || c.deliveredBy || c.staff || '').trim().toLowerCase();
        return (code && cCode === code) || (name && cStaff.includes(name));
      });

      if (!existingOpen && staffCargos.length > 0) {
        const earliestTime = Math.min(...staffCargos.map((c) => c.deliveredAtTimestamp || c.transferredAt || c.receivedAtTimestamp || c.id));
        const autoShift = {
          id: earliestTime,
          staffCode: currentStaff.code || '883',
          staffId: currentStaff.code || '883',
          staffName: currentStaff.name || 'NV Giao Hàng',
          station: currentStaff.station || 'Sài Gòn',
          startTime: earliestTime,
          endTime: null,
          submittedCash: null,
          note: 'Ca tự động đơn giao hàng',
          isHandedOver: false,
          isChecked: false
        };
        currentShifts.unshift(autoShift);
        updated = true;
      }
    }

    // 2. Tự động tạo ca cho các NV giao hàng khác có đơn hàng
    const staffMap = {};
    allCargos.forEach((c) => {
      if (c.status === 'unreceived' || c.isUnreceived) return;
      const sCode = String(c.deliveredByCode || c.deliveryStaffCode || c.staffCode || c.staff || '883').trim();
      const sName = c.deliveredBy || c.deliveryStaff || c.staff || currentStaff.name || 'NV Giao Hàng';
      const sStation = c.stationTo || c.stationFrom || c.station || currentStaff.station || 'Sài Gòn';
      if (!staffMap[sCode]) {
        staffMap[sCode] = { code: sCode, name: sName, station: sStation, cargos: [] };
      }
      staffMap[sCode].cargos.push(c);
    });

    Object.values(staffMap).forEach((st) => {
      const hasShift = currentShifts.some(
        (s) => String(s.staffCode || s.staffId) === st.code || (st.name && s.staffName && s.staffName.toLowerCase() === st.name.toLowerCase())
      );
      if (!hasShift && st.cargos.length > 0) {
        const earliestTime = Math.min(...st.cargos.map((c) => c.deliveredAtTimestamp || c.transferredAt || c.receivedAtTimestamp || c.id));
        currentShifts.unshift({
          id: earliestTime,
          staffCode: st.code,
          staffId: st.code,
          staffName: st.name,
          station: st.station,
          startTime: earliestTime,
          endTime: null,
          submittedCash: null,
          note: 'Ca tự động đơn giao hàng',
          isHandedOver: false,
          isChecked: false
        });
        updated = true;
      }
    });

    if (updated) {
      saveShifts(currentShifts);
    }
  }

  // Toàn bộ hàng hóa thuộc ca giao hàng này (bao gồm cả đơn TR đã giao và đơn CT chưa giao)
  function getShiftCargoItems(shift, allCargos) {
    const cargos = allCargos || loadCargos();
    const shiftCode = String(shift.staffCode || shift.staffId || '').trim();
    const shiftName = String(shift.staffName || '').trim().toLowerCase();

    return cargos.filter((c) => {
      if (c.status === 'unreceived' || c.isUnreceived) return false;

      const cCode = String(c.deliveryStaffCode || c.deliveredByCode || c.staffCode || c.staff || '').trim();
      const cStaff = String(c.deliveryStaff || c.deliveredBy || c.staff || '').trim().toLowerCase();

      const matchStaff =
        (shiftCode && (cCode === shiftCode || cCode.includes(shiftCode))) ||
        (shiftName && (cStaff === shiftName || cStaff.includes(shiftName))) ||
        (!shiftCode && !shiftName);

      if (!matchStaff) return false;

      const itemTimestamp = c.deliveredAtTimestamp || c.transferredAt || c.receivedAtTimestamp || c.id;

      if (shift.endTime) {
        const startMs = typeof shift.startTime === 'number' ? shift.startTime : new Date(shift.startTime).getTime();
        const endMs = typeof shift.endTime === 'number' ? shift.endTime : new Date(shift.endTime).getTime();
        return (c.id >= startMs && c.id <= endMs) ||
               (itemTimestamp >= startMs && itemTimestamp <= endMs);
      }

      const startMs = typeof shift.startTime === 'number' ? shift.startTime : new Date(shift.startTime).getTime();
      const shiftDateObj = new Date(startMs || Date.now());
      shiftDateObj.setHours(0, 0, 0, 0);
      return c.id >= shiftDateObj.getTime() || itemTimestamp >= shiftDateObj.getTime() || c.deliveryStatus != null;
    });
  }

  // Tính toán số liệu tiền thực tế của ca giao hàng
  function computeShiftStats(shift, allCargos) {
    const items = getShiftCargoItems(shift, allCargos);

    const paidItems = items.filter((c) => isDeliveryItemPaid(c));
    const unpaidItems = items.filter((c) => isDeliveryItemUnpaid(c));

    let cashPaid = 0;
    let transferPaid = 0;
    paidItems.forEach((c) => {
      const amt = getDeliveryCollectAmount(c) || Number(c.codCollected || c.codAmount || c.fee || 0);
      if (c.paidMethod === 'transfer' || c.paymentMethod === 'transfer') {
        transferPaid += amt;
      } else {
        cashPaid += amt;
      }
    });

    const unpaidAmount = unpaidItems.reduce((sum, c) => {
      return sum + getDeliveryCollectAmount(c);
    }, 0);

    const totalCollected = cashPaid + transferPaid;
    const submittedCash = shift.submittedAmount == null ? null : Number(shift.submittedAmount);
    const diff = submittedCash == null ? null : submittedCash - cashPaid;

    return {
      items,
      paidItems,
      unpaidItems,
      cashPaid,
      transferPaid,
      unpaidAmount,
      totalCollected,
      submittedCash,
      diff
    };
  }

  // Render Master Shifts Table
  function renderShiftsTable() {
    autoSyncShiftsFromCargos();

    const tbody = document.getElementById('shiftsTbody');
    const shiftsCountEl = document.getElementById('shiftsCount');
    const totalCollectedStat = document.getElementById('statTotalCollected');
    const totalShiftsStat = document.getElementById('statTotalShifts');
    const totalHandoverStat = document.getElementById('statTotalHandover');

    if (!tbody) return;

    const allCargos = loadCargos();

    const stationFilter = document.getElementById('filterStation')?.value || 'all';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    const filterDateVal = document.getElementById('filterDate')?.value || '';
    const searchQuery = (document.getElementById('shiftSearch')?.value || '').toLowerCase().trim();

    // Loại bỏ các ca trống không có đơn hàng nào
    const validShifts = currentShifts.filter((shift) => {
      const stats = computeShiftStats(shift, allCargos);
      return stats.items.length > 0;
    });

    const filtered = validShifts.filter((shift) => {
      const matchStation = stationFilter === 'all' || shift.station === stationFilter;
      let matchStatus = true;
      if (statusFilter === 'handed') matchStatus = shift.isHandedOver;
      if (statusFilter === 'unhanded') matchStatus = !shift.isHandedOver;
      if (statusFilter === 'checked') matchStatus = shift.isChecked;

      let matchDate = true;
      if (filterDateVal) {
        const [fy, fm, fd] = filterDateVal.split('-');
        if (fy && fm && fd) {
          const dayStart = new Date(Number(fy), Number(fm) - 1, Number(fd), 0, 0, 0).getTime();
          const dayEnd = dayStart + 24 * 60 * 60 * 1000;
          const startMs = typeof shift.startTime === 'number' ? shift.startTime : new Date(shift.startTime).getTime();
          const endMs = shift.endTime ? (typeof shift.endTime === 'number' ? shift.endTime : new Date(shift.endTime).getTime()) : null;

          matchDate = (startMs >= dayStart && startMs < dayEnd) ||
                     (!endMs && startMs <= dayEnd) ||
                     (endMs && startMs <= dayEnd && endMs >= dayStart);
        }
      }

      const matchSearch =
        !searchQuery ||
        String(shift.id).includes(searchQuery) ||
        (shift.staffName || '').toLowerCase().includes(searchQuery) ||
        String(shift.staffCode || shift.staffId || '').toLowerCase().includes(searchQuery) ||
        (shift.station || '').toLowerCase().includes(searchQuery) ||
        (shift.note || '').toLowerCase().includes(searchQuery);

      return matchStation && matchStatus && matchDate && matchSearch;
    });

    if (shiftsCountEl) shiftsCountEl.textContent = filtered.length;

    let totalSum = 0;
    let handoverCount = 0;
    filtered.forEach((s) => {
      const stats = computeShiftStats(s, allCargos);
      totalSum += stats.totalCollected;
      if (s.isHandedOver) handoverCount++;
    });

    if (totalCollectedStat) totalCollectedStat.textContent = formatCurrency(totalSum);
    if (totalShiftsStat) totalShiftsStat.textContent = filtered.length + ' ca';
    if (totalHandoverStat) totalHandoverStat.textContent = `${handoverCount} / ${filtered.length} ca`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px 12px; color: #64748b;">
            <svg style="width: 40px; height: 40px; margin-bottom: 8px; color: #cbd5e1;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <div style="font-weight: 600; font-size: 15px;">Không tìm thấy ca giao hàng nào</div>
            <div style="font-size: 13px;">Vui lòng điều chỉnh lại bộ lọc trạm, ngày hoặc từ khóa tìm kiếm.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((shift, idx) => {
        const stats = computeShiftStats(shift, allCargos);
        const startStr = formatDateTime(shift.startTime).split(' ');
        const endStr = shift.endTime ? formatDateTime(shift.endTime).split(' ') : ['', 'Đang mở'];

        return `
        <tr data-shift-id="${shift.id}">
          <td style="text-align: center; vertical-align: middle;">
            <div style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
              <input type="checkbox" class="shift-checkbox" />
              <span style="font-weight:700; color:#64748b;">${idx + 1}</span>
            </div>
          </td>
          <td style="vertical-align: middle;">
            <div class="staff-cell">
              <strong style="font-size:13.5px; color:#0f172a;">${shift.staffName}</strong>
              <div style="margin-top:4px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span class="code-badge" style="font-size:11px; padding:2px 6px;">Mã ca: ${shift.id}</span>
                <span class="station-chip" style="font-size:11px; padding:2px 6px;">${shift.station}</span>
              </div>
            </div>
          </td>
          <td style="vertical-align: middle;">
            <div class="time-block">
              <span style="font-size:13px; font-weight:700; color:#1e293b;">${startStr[1] || ''} ➔ ${endStr[1] || 'Đang mở'}</span>
              <small style="color:#64748b; margin-top:3px; display:block; font-size:11.5px;">${startStr[0] || ''} • NV: ${shift.staffCode || shift.staffId}</small>
            </div>
          </td>
          <td style="vertical-align: middle;">
            <div class="amount-block" style="display:flex; flex-direction:column; gap:3px;">
              <strong style="font-size:14px; color:#0f172a; font-weight:800;">${formatCurrency(stats.totalCollected)}</strong>
              <div style="display:flex; gap:6px; align-items:center; font-size:11px; font-weight:700; flex-wrap:wrap;">
                <span style="color:#16a34a; background:#f0fdf4; padding:1.5px 6px; border-radius:4px; border:1px solid #dcfce7; white-space:nowrap;">TR (Đã thu): ${formatCurrency(stats.totalCollected)} (${stats.paidItems.length})</span>
                <span style="color:#b45309; background:#fffbeb; padding:1.5px 6px; border-radius:4px; border:1px solid #fde68a; white-space:nowrap;">CT (Chưa thu): ${formatCurrency(stats.unpaidAmount)} (${stats.unpaidItems.length})</span>
              </div>
            </div>
          </td>
          <td style="vertical-align: middle;"><div class="note-truncate" title="${shift.note || ''}">${shift.note || '—'}</div></td>
          <td class="text-center" style="vertical-align: middle;">
            <select class="status-select-box ${shift.isHandedOver ? 'handed' : 'unhanded'}" onchange="window.toggleShiftHandover(${shift.id})">
              <option value="handed" ${shift.isHandedOver ? 'selected' : ''}>Đã giao</option>
              <option value="unhanded" ${!shift.isHandedOver ? 'selected' : ''}>Chưa giao</option>
            </select>
          </td>
          <td class="text-center" style="vertical-align: middle;">
            <div class="action-icons-row">
              <button type="button" class="rowicon-btn ${shift.isChecked ? 'is-active' : ''}" onclick="window.toggleShiftCheck(${shift.id})" title="${shift.isChecked ? 'Bỏ kiểm tra' : 'Khóa / Kiểm tra ca'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </button>
              <button type="button" class="rowicon-btn" onclick="window.openDetailReport(${shift.id})" title="Xem chi tiết / In báo cáo ca">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button type="button" class="rowicon-btn rowicon-btn--danger" onclick="window.deleteShift(${shift.id})" title="Hủy ca / Xóa ca giao hàng">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  function syncModalFormWithTablesBelow(shift) {
    const allCargos = loadCargos();
    const stats = computeShiftStats(shift, allCargos);

    const summaryTbody = document.getElementById('modalSummaryTbody');
    if (summaryTbody) {
      summaryTbody.innerHTML = `
        <tr>
          <td style="text-align: center; font-weight: 600;">1</td>
          <td style="font-weight: 700; color: #334155; text-align: center;">${shift.staffCode || shift.staffId}</td>
          <td style="text-align: center; font-weight: 600;">${stats.unpaidItems.length} (món)</td>
          <td style="text-align: right; font-weight: 700; color: #b45309;">${formatCurrency(stats.unpaidAmount)}</td>
          <td style="text-align: center; font-weight: 600;">${stats.paidItems.length} (món)</td>
          <td style="text-align: right; font-weight: 700; color: #16a34a;">${formatCurrency(stats.totalCollected)}</td>
        </tr>
      `;
    }

    const cargoCountStat = document.getElementById('modalCargoCountStat');
    const paidSumStat = document.getElementById('modalPaidSumStat');
    const unpaidSumStat = document.getElementById('modalUnpaidSumStat');

    if (cargoCountStat) cargoCountStat.textContent = stats.items.length + ' (Món)';
    if (paidSumStat) paidSumStat.textContent = formatCurrency(stats.totalCollected);
    if (unpaidSumStat) unpaidSumStat.textContent = formatCurrency(stats.unpaidAmount);

    const cargoTbody = document.getElementById('modalCargoTbody');
    if (cargoTbody) {
      if (stats.items.length === 0) {
        cargoTbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding: 20px; color:#94a3b8;">Chưa có đơn hàng nào phân công/giao trong ca này.</td></tr>`;
      } else {
        cargoTbody.innerHTML = stats.items
          .map((item, idx) => {
            const collectAmt = getDeliveryCollectAmount(item);
            const isPaidAtStation = item.paymentStatus === 'paid' && Number(item.codAmount || 0) === 0;
            const isDelivered = item.deliveryStatus === 'da-giao';

            let badgeHtml = '';
            let feeDisplayHtml = '';

            if (isDelivered) {
              badgeHtml = `<span style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-size:11px; padding:2px 7px; border-radius:12px; font-weight:600; white-space:nowrap; display:inline-block;">TR (Đã thu)</span>`;
              feeDisplayHtml = `<strong style="color:#16a34a; font-size:11.5px;">${formatCurrency(collectAmt || Number(item.fee || 0))}</strong>`;
            } else if (isPaidAtStation) {
              badgeHtml = `<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:11px; padding:2px 7px; border-radius:12px; font-weight:600; white-space:nowrap; display:inline-block;">Tiền rồi</span>`;
              feeDisplayHtml = `<strong style="color:#2563eb; font-size:11.5px;">0 VNĐ</strong>`;
            } else {
              badgeHtml = `<span style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:11px; padding:2px 7px; border-radius:12px; font-weight:600; white-space:nowrap; display:inline-block;">CT (Chưa thu)</span>`;
              feeDisplayHtml = `<strong style="color:#d97706; font-size:11.5px;">${formatCurrency(collectAmt || Number(item.fee || 0))}</strong>`;
            }

            const formattedDate = formatShortDate(item.deliveredAtTimestamp || item.transferredAt || item.id);

            return `
          <tr>
            <td style="text-align: center; font-weight: 600; color: #64748b; font-size: 11.5px;">${idx + 1}</td>
            <td style="text-align: center;"><strong style="color:#0f172a; font-family:'Roboto Mono', monospace; font-size:12px;">${item.code || ''}</strong></td>
            <td style="max-width: 240px; font-size: 11.5px; line-height:1.3; color:#1e293b;">${(item.name || '').replace(/🧳/g, '').trim()}</td>
            <td>
              <div style="font-weight:600; color:#0f172a; font-size:11.5px;">${item.sender || '—'}</div>
              <div style="font-size:10.5px; color:#64748b;">${item.senderPhone || ''}</div>
            </td>
            <td style="text-align: center;"><span class="branch-pill-from">${item.stationFrom || '—'}</span></td>
            <td style="text-align: center;"><span class="branch-pill-to">${item.stationTo || '—'}</span></td>
            <td>
              <div style="font-weight:600; color:#0f172a; font-size:11.5px;">${item.receiver || '—'}</div>
              <div style="font-size:10.5px; color:#64748b;">${item.receiverPhone || ''}</div>
            </td>
            <td style="text-align: center; font-weight: 600; font-size:11.5px; color:#475569;">${item.deliveryStaffCode || item.staffCode || shift.staffCode || ''}</td>
            <td style="text-align: center; font-weight: 600; font-size:11.5px; color:#475569;">${item.deliveredByCode || item.deliveryStaffCode || shift.staffCode || ''}</td>
            <td style="text-align: right;">${feeDisplayHtml}</td>
            <td style="text-align: right; font-weight: 600; font-size:11.5px; color:#334155;">${item.codAmount ? formatCurrency(item.codAmount) : '—'}</td>
            <td style="text-align: center;">${badgeHtml}</td>
            <td style="text-align: center;"><span style="font-size: 11px; color: #64748b; white-space: nowrap;">${formattedDate}</span></td>
          </tr>
        `;
          })
          .join('');
      }
    }
  }

  window.openDetailReport = function (shiftId) {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return;

    selectedShiftId = shiftId;
    const modal = document.getElementById('reportDetailModal');
    if (!modal) return;

    const stats = computeShiftStats(shift);

    document.getElementById('modalShiftTitle').textContent = `CHI TIẾT BÁO CÁO GIAO HÀNG`;
    const statusPill = document.getElementById('modalShiftStatusPill');
    if (statusPill) {
      statusPill.className = `modal-status-tag ${shift.isHandedOver ? 'tag-success' : 'tag-warning'}`;
      statusPill.textContent = shift.isHandedOver ? 'CHÚ Ý: ĐÃ GIAO CA' : '( CHƯA GIAO CA )';
    }

    const staffNameEl = document.getElementById('modalStaffName');
    const timeFromEl = document.getElementById('modalTimeFrom');
    const timeToEl = document.getElementById('modalTimeTo');
    const totalCollectedEl = document.getElementById('modalTotalCollected');
    const submittedAmountEl = document.getElementById('modalSubmittedAmount');
    const diffAmountEl = document.getElementById('modalDiffAmount');
    const paidCodesEl = document.getElementById('modalPaidCodes');
    const noteTextEl = document.getElementById('modalNoteText');

    if (staffNameEl) staffNameEl.value = `${shift.staffName} (Mã NV: ${shift.staffCode || shift.staffId})`;
    if (timeFromEl) timeFromEl.value = formatDateTime(shift.startTime);
    if (timeToEl) timeToEl.value = shift.endTime ? formatDateTime(shift.endTime) : 'Đang mở ca...';
    if (totalCollectedEl) totalCollectedEl.value = stats.totalCollected.toLocaleString('vi-VN');
    if (submittedAmountEl) submittedAmountEl.value = stats.submittedCash != null ? stats.submittedCash.toLocaleString('vi-VN') : '';
    if (diffAmountEl) diffAmountEl.value = stats.diff != null ? stats.diff.toLocaleString('vi-VN') : '—';
    if (paidCodesEl) paidCodesEl.value = stats.paidItems.map((c) => c.code).join(', ');
    if (noteTextEl) noteTextEl.value = shift.note || '';

    syncModalFormWithTablesBelow(shift);

    modal.classList.add('show');
  };

  window.closeDetailReportModal = function () {
    const modal = document.getElementById('reportDetailModal');
    if (modal) modal.classList.remove('show');
  };

  window.saveShiftHandoverFromModal = function () {
    if (!selectedShiftId) return;
    const shift = currentShifts.find((s) => s.id === selectedShiftId);
    if (!shift) return;

    const submittedVal = document.getElementById('modalSubmittedAmount')?.value || '0';
    const noteVal = document.getElementById('modalNoteText')?.value || '';

    shift.submittedAmount = parseFloat(submittedVal.replace(/\./g, '').replace(/,/g, '')) || 0;
    shift.note = noteVal;
    shift.isHandedOver = true;

    saveShifts(currentShifts);
    renderShiftsTable();
    window.closeDetailReportModal();
    showToastNotification(`Đã lưu thông tin ca giao hàng [Mã ca ${shift.id}]!`);
  };

  window.toggleShiftHandover = function (shiftId) {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    shift.isHandedOver = !shift.isHandedOver;
    saveShifts(currentShifts);
    renderShiftsTable();
    showToastNotification(`Đã cập nhật trạng thái giao ca [Mã ${shift.id}]: ${shift.isHandedOver ? 'ĐÃ GIAO CA' : 'CHƯA GIAO CA'}`);
  };

  window.toggleShiftCheck = function (shiftId) {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    shift.isChecked = !shift.isChecked;
    saveShifts(currentShifts);
    renderShiftsTable();
    showToastNotification(`Đã kiểm tra ca giao hàng [Mã ${shift.id}]`);
  };

  function showToastNotification(message) {
    let toast = document.getElementById('reportToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'reportToast';
      toast.className = 'report-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> <span>${message}</span>`;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  window.clearAllRealShifts = function () {
    if (confirm('Bạn có chắc chắn muốn làm sạch dữ liệu ca giao hàng?')) {
      currentShifts = [];
      saveShifts(currentShifts);
      renderShiftsTable();
      showToastNotification('Đã làm sạch danh sách ca giao hàng!');
    }
  };

  let pendingDeleteShiftId = null;

  window.deleteShift = function (shiftId) {
    const shift = currentShifts.find((s) => String(s.id) === String(shiftId));
    if (!shift) return;

    pendingDeleteShiftId = shiftId;
    const staffNameEl = document.getElementById('deleteStaffName');
    const shiftIdCodeEl = document.getElementById('deleteShiftIdCode');
    const modal = document.getElementById('deleteConfirmModal');

    if (staffNameEl) staffNameEl.textContent = shift.staffName;
    if (shiftIdCodeEl) shiftIdCodeEl.textContent = shift.id;
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
    }
  };

  window.closeDeleteModal = function () {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
    }
    pendingDeleteShiftId = null;
  };

  window.confirmExecuteDeleteShift = function () {
    if (!pendingDeleteShiftId) return;
    const shiftId = pendingDeleteShiftId;

    currentShifts = currentShifts.filter((s) => String(s.id) !== String(shiftId));
    saveShifts(currentShifts);
    renderShiftsTable();
    window.closeDeleteModal();
    showToastNotification(`Đã xóa thành công ca giao hàng [Mã ca ${shiftId}]!`);
  };

  window.clearFilterDate = function () {
    const dateFilter = document.getElementById('filterDate');
    if (dateFilter) {
      dateFilter.value = '';
    }
    renderShiftsTable();
  };

  window.printCurrentReportModal = function () {
    window.print();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const dateFilter = document.getElementById('filterDate');
    if (dateFilter) {
      const today = new Date().toISOString().split('T')[0];
      dateFilter.value = today;
    }

    const filterStation = document.getElementById('filterStation');
    const filterStatus = document.getElementById('filterStatus');
    const filterDateInput = document.getElementById('filterDate');
    const shiftSearch = document.getElementById('shiftSearch');
    const btnApplyFilter = document.getElementById('btnApplyFilter');

    if (filterStation) filterStation.addEventListener('change', renderShiftsTable);
    if (filterStatus) filterStatus.addEventListener('change', renderShiftsTable);
    if (filterDateInput) filterDateInput.addEventListener('change', renderShiftsTable);
    if (shiftSearch) shiftSearch.addEventListener('input', renderShiftsTable);
    if (btnApplyFilter) btnApplyFilter.addEventListener('click', renderShiftsTable);

    // Live Auto-Update khi có đơn hàng mới từ các tab giao hàng
    window.addEventListener('storage', (e) => {
      if (e.key === CARGOS_KEY || e.key === SHIFTS_KEY) {
        currentShifts = loadShifts();
        renderShiftsTable();
      }
    });

    setInterval(() => {
      renderShiftsTable();
    }, 2500);

    renderShiftsTable();
  });
})();
