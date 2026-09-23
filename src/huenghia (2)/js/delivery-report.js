/**
 * Báo cáo Giao hàng — Courier Delivery Report Controller
 * Huệ Nghĩa Express
 */

(function () {
  const STORAGE_KEY = 'huenghia_cashier_delivery_shifts_real_v2';

  // Seed data for Delivery Shifts
  function getStoredShifts() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored delivery shifts:', e);
      }
    }
    return [];
      {
        id: 590102,
        staffName: 'Lê Văn Nam GH SG',
        staffId: 883,
        station: 'Sài Gòn',
        startTime: '01/09/2026 08:00:00',
        endTime: '01/09/2026 12:30:00',
        totalCollected: 150000,
        submittedAmount: 150000,
        diffAmount: 0,
        note: 'Ca giao hàng tuyến Quận 5 - Châu Đốc',
        isHandedOver: true,
        isChecked: true,
        summaryStats: {
          totalItems: 3,
          staffId: 883,
          unpaidCount: 0,
          unpaidAmount: 0,
          paidCount: 3,
          paidAmount: 150000
        },
        paidCodes: ['12691270', '12691255', '12691180'],
        cargoItems: [
          {
            no: 1,
            code: '12691270',
            cargoName: '1 bao thư giấy tờ xe * ko xử lý đền bù * nhẹ tay không bao hư bể ldh',
            sender: 'Hải',
            senderPhone: '0359301921',
            stationFrom: 'Sài Gòn (1)',
            stationTo: 'Châu Đốc (4)',
            receiver: 'Thái',
            receiverPhone: '0919710517',
            staffEntry: 735,
            staffReceive: 883,
            trAmount: 50000,
            ctAmount: 0,
            isPaid: true,
            receiveDate: '01/09/2026 13:12:07'
          },
          {
            no: 2,
            code: '12691255',
            cargoName: '1 thùng phụ tùng xe gắn máy',
            sender: 'Nguyên',
            senderPhone: '0901091530',
            stationFrom: 'Sài Gòn (1)',
            stationTo: 'Long Xuyên (29)',
            receiver: 'HẬU DECAL',
            receiverPhone: '0944442403',
            staffEntry: 735,
            staffReceive: 883,
            trAmount: 50000,
            ctAmount: 0,
            isPaid: true,
            receiveDate: '01/09/2026 13:07:26'
          },
          {
            no: 3,
            code: '12691180',
            cargoName: '1 kiện mỹ phẩm xách tay',
            sender: 'Chị Hồng',
            senderPhone: '0903112233',
            stationFrom: 'Sài Gòn (1)',
            stationTo: 'Long Xuyên (29)',
            receiver: 'Tiệm Spa Mỹ',
            receiverPhone: '0944556677',
            staffEntry: 49,
            staffReceive: 883,
            trAmount: 50000,
            ctAmount: 0,
            isPaid: true,
            receiveDate: '01/09/2026 10:05:00'
          }
        ]
      },
      {
        id: 590088,
        staffName: 'Trần Minh Quân GH SG',
        staffId: 512,
        station: 'Sài Gòn',
        startTime: '01/09/2026 13:15:00',
        endTime: '01/09/2026 17:00:00',
        totalCollected: 90000,
        submittedAmount: 90000,
        diffAmount: 0,
        note: 'Giao hàng trạm thành công',
        isHandedOver: false,
        isChecked: false,
        summaryStats: {
          totalItems: 2,
          staffId: 512,
          unpaidCount: 0,
          unpaidAmount: 0,
          paidCount: 2,
          paidAmount: 90000
        },
        paidCodes: ['12691050', '12691100'],
        cargoItems: [
          {
            no: 1,
            code: '12691050',
            cargoName: '1 hộp bánh trung thu cao cấp',
            sender: 'Ngô Thanh',
            senderPhone: '0901239999',
            stationFrom: 'Sài Gòn (1)',
            stationTo: 'Châu Đốc (4)',
            receiver: 'Dương Hùng',
            receiverPhone: '0918887776',
            staffEntry: 708,
            staffReceive: 512,
            trAmount: 45000,
            ctAmount: 0,
            isPaid: true,
            receiveDate: '01/09/2026 14:00:00'
          },
          {
            no: 2,
            code: '12691100',
            cargoName: '1 bao tài liệu công ty',
            sender: 'Văn phòng ABC',
            senderPhone: '02838112233',
            stationFrom: 'Sài Gòn (1)',
            stationTo: 'Bình Dương (3)',
            receiver: 'Chi nhánh BD',
            receiverPhone: '0909887766',
            staffEntry: 585,
            staffReceive: 512,
            trAmount: 45000,
            ctAmount: 0,
            isPaid: true,
            receiveDate: '01/09/2026 14:30:00'
          }
        ]
      }
    ];
  }

  function saveStoredShifts(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let currentShifts = getStoredShifts();
  let selectedShiftId = null;

  function formatCurrency(amount) {
    if (!amount && amount !== 0) return '0 VNĐ';
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  }

  function renderShiftsTable() {
    const tbody = document.getElementById('shiftsTbody');
    const shiftsCountEl = document.getElementById('shiftsCount');
    const totalCollectedStat = document.getElementById('statTotalCollected');
    const totalShiftsStat = document.getElementById('statTotalShifts');
    const totalHandoverStat = document.getElementById('statTotalHandover');

    if (!tbody) return;

    const stationFilter = document.getElementById('filterStation')?.value || 'all';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    const filterDateVal = document.getElementById('filterDate')?.value || '';
    const searchQuery = (document.getElementById('shiftSearch')?.value || '').toLowerCase().trim();

    const filtered = currentShifts.filter((shift) => {
      const matchStation = stationFilter === 'all' || shift.station === stationFilter;
      let matchStatus = true;
      if (statusFilter === 'handed') matchStatus = shift.isHandedOver;
      if (statusFilter === 'unhanded') matchStatus = !shift.isHandedOver;
      if (statusFilter === 'checked') matchStatus = shift.isChecked;

      let matchDate = true;
      if (filterDateVal) {
        const [fy, fm, fd] = filterDateVal.split('-');
        if (fy && fm && fd) {
          const dateFormatted = `${fd.padStart(2, '0')}/${fm.padStart(2, '0')}/${fy}`;
          matchDate = shift.startTime && shift.startTime.startsWith(dateFormatted);
        }
      }

      const matchSearch =
        !searchQuery ||
        shift.id.toString().includes(searchQuery) ||
        shift.staffName.toLowerCase().includes(searchQuery) ||
        shift.staffId.toString().includes(searchQuery) ||
        shift.station.toLowerCase().includes(searchQuery) ||
        (shift.note || '').toLowerCase().includes(searchQuery);

      return matchStation && matchStatus && matchDate && matchSearch;
    });

    if (shiftsCountEl) shiftsCountEl.textContent = filtered.length;

    let totalSum = 0;
    let handoverCount = 0;
    filtered.forEach((s) => {
      totalSum += s.totalCollected;
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
        const startParts = shift.startTime ? shift.startTime.split(' ') : ['', ''];
        const endParts = shift.endTime ? shift.endTime.split(' ') : ['', 'Đang mở'];
        const startTimeStr = startParts[1] || startParts[0] || '';
        const endTimeStr = endParts[1] || endParts[0] || 'Đang mở';
        const dateStr = startParts[0] || '';

        return `
        <tr data-shift-id="${shift.id}">
          <td style="text-align: center; vertical-align: middle;">
            <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
              <input type="checkbox" class="shift-checkbox" />
              <span style="font-weight:700; color:#64748b;">${idx + 1}</span>
            </div>
          </td>
          <td>
            <div class="staff-cell">
              <strong>${shift.staffName}</strong>
              <div style="margin-top:2px; font-size:12px;">
                <span class="code-badge" style="font-size:11.5px; padding:1px 5px;">Mã ca: ${shift.id}</span>
                <span class="station-chip" style="margin-left:4px; font-size:11.5px;">📍 ${shift.station}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="time-block">
              <span><strong>${startTimeStr} ➔ ${endTimeStr}</strong></span>
              <small style="color:#64748b; margin-top:2px;">🕒 ${dateStr} • NV: ${shift.staffId}</small>
            </div>
          </td>
          <td class="text-right">
            <strong style="font-size:14.5px; color:#0f172a;">${formatCurrency(shift.totalCollected)}</strong>
            <div style="font-size:11.5px; color:#16a34a; font-weight:700; margin-top:1px;">Đã thu tiền giao</div>
          </td>
          <td><div class="note-truncate" title="${shift.note || ''}">${shift.note || '—'}</div></td>
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

  function getRealLiveDateTimeString(dateObj = new Date()) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    const h = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    const s = String(dateObj.getSeconds()).padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}:${s}`;
  }

  function syncModalFormWithTablesBelow(shift) {
    const staffNameVal = document.getElementById('modalStaffName')?.value || shift.staffName || '';
    const totalCollectedStr = document.getElementById('modalTotalCollected')?.value || '0';
    const paidCodesStr = document.getElementById('modalPaidCodes')?.value || '';

    const staffIdMatch = staffNameVal.match(/(\d+)/);
    const staffId = staffIdMatch ? staffIdMatch[1] : (shift.staffId || '883');

    const totalCollectedNum = parseFloat(totalCollectedStr.replace(/\./g, '').replace(/,/g, '')) || shift.totalCollected || 0;
    const paidCodesArr = paidCodesStr ? paidCodesStr.split(',').map((c) => c.trim()).filter(Boolean) : (shift.paidCodes || []);
    const paidCount = paidCodesArr.length || 1;

    const summaryTbody = document.getElementById('modalSummaryTbody');
    if (summaryTbody) {
      summaryTbody.innerHTML = `
        <tr>
          <td style="text-align: center; font-weight: 600;">1</td>
          <td style="font-weight: 700; color: #334155; text-align: center;">${staffId}</td>
          <td style="text-align: center; font-weight: 600;">0 (món)</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">0 VNĐ</td>
          <td style="text-align: center; font-weight: 600;">${paidCount} (món)</td>
          <td style="text-align: right; font-weight: 700; color: #2563eb;">${formatCurrency(totalCollectedNum)}</td>
        </tr>
      `;
    }

    const cargoCountStat = document.getElementById('modalCargoCountStat');
    const paidSumStat = document.getElementById('modalPaidSumStat');
    const unpaidSumStat = document.getElementById('modalUnpaidSumStat');

    if (cargoCountStat) cargoCountStat.textContent = paidCount + ' (Món)';
    if (paidSumStat) paidSumStat.textContent = formatCurrency(totalCollectedNum);
    if (unpaidSumStat) unpaidSumStat.textContent = '0 VNĐ';

    const cargoTbody = document.getElementById('modalCargoTbody');
    const realNowStr = getRealLiveDateTimeString();

    if (cargoTbody) {
      const codeList = paidCodesArr.length > 0 ? paidCodesArr : ['12691270', '12691255'];
      const unitAmount = Math.round(totalCollectedNum / codeList.length);

      cargoTbody.innerHTML = codeList
        .map((code, idx) => `
          <tr>
            <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
            <td><strong style="color:#0f172a; font-family:'Roboto Mono', monospace;">${code}</strong></td>
            <td style="max-width: 280px; font-size: 13px; line-height:1.4;">1 kiện hàng giao tận nơi * nhẹ tay</td>
            <td><strong>Khách hàng gửi ${idx + 1}</strong><br/><small style="color:#64748b;">📞 0359301921</small></td>
            <td style="text-align: center;"><span class="branch-pill-from">Sài Gòn (1)</span></td>
            <td style="text-align: center;"><span class="branch-pill-to">Châu Đốc (4)</span></td>
            <td><strong>Người nhận ${idx + 1}</strong><br/><small style="color:#64748b;">📞 0919710517</small></td>
            <td style="text-align: center; font-weight: 600;">${staffId}</td>
            <td style="text-align: center; font-weight: 600;">${staffId}</td>
            <td style="text-align: right; font-weight: 700; color: #2563eb;">${formatCurrency(unitAmount)}</td>
            <td style="text-align: center;">0đ</td>
            <td style="text-align: center;">
              <span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:11px;">True (Đã ĐT)</span>
            </td>
            <td><span style="font-size: 12px; color: #64748b; white-space: nowrap;">${realNowStr}</span></td>
          </tr>
        `).join('');
    }
  }

  window.openDetailReport = function (shiftId) {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return;

    selectedShiftId = shiftId;
    const modal = document.getElementById('reportDetailModal');
    if (!modal) return;

    const realNowStr = getRealLiveDateTimeString();

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

    if (staffNameEl) staffNameEl.value = `${shift.staffName} (Mã NV: ${shift.staffId})`;
    if (timeFromEl) timeFromEl.value = shift.startTime || realNowStr;
    if (timeToEl) timeToEl.value = shift.endTime || realNowStr;
    if (totalCollectedEl) totalCollectedEl.value = shift.totalCollected ? shift.totalCollected.toLocaleString('vi-VN') : '0';
    if (submittedAmountEl) submittedAmountEl.value = shift.submittedAmount ? shift.submittedAmount.toLocaleString('vi-VN') : '0';
    if (diffAmountEl) diffAmountEl.value = shift.diffAmount ? shift.diffAmount.toLocaleString('vi-VN') : '0';
    if (paidCodesEl) paidCodesEl.value = (shift.paidCodes && shift.paidCodes.length > 0) ? shift.paidCodes.join(', ') : '';
    if (noteTextEl) noteTextEl.value = shift.note || '';

    syncModalFormWithTablesBelow(shift);

    ['modalStaffName', 'modalTotalCollected', 'modalPaidCodes'].forEach((id) => {
      const inputEl = document.getElementById(id);
      if (inputEl) {
        inputEl.oninput = function () {
          syncModalFormWithTablesBelow(shift);
        };
      }
    });

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

    const staffNameVal = document.getElementById('modalStaffName')?.value || '';
    const timeFromVal = document.getElementById('modalTimeFrom')?.value || '';
    const timeToVal = document.getElementById('modalTimeTo')?.value || '';
    const totalCollectedVal = document.getElementById('modalTotalCollected')?.value || '0';
    const submittedVal = document.getElementById('modalSubmittedAmount')?.value || '0';
    const diffVal = document.getElementById('modalDiffAmount')?.value || '0';
    const paidCodesVal = document.getElementById('modalPaidCodes')?.value || '';
    const noteVal = document.getElementById('modalNoteText')?.value || '';

    if (staffNameVal) shift.staffName = staffNameVal;
    if (timeFromVal) shift.startTime = timeFromVal;
    if (timeToVal) shift.endTime = timeToVal;

    shift.totalCollected = parseFloat(totalCollectedVal.replace(/\./g, '').replace(/,/g, '')) || 0;
    shift.submittedAmount = parseFloat(submittedVal.replace(/\./g, '').replace(/,/g, '')) || 0;
    shift.diffAmount = parseFloat(diffVal.replace(/\./g, '').replace(/,/g, '')) || 0;
    shift.note = noteVal;
    shift.paidCodes = paidCodesVal ? paidCodesVal.split(',').map((c) => c.trim()).filter(Boolean) : [];
    shift.isHandedOver = true;

    saveStoredShifts(currentShifts);
    renderShiftsTable();
    window.closeDetailReportModal();
    showToastNotification(`Đã lưu thông tin ca giao hàng [Mã ca ${shift.id}]!`);
  };

  window.toggleShiftHandover = function (shiftId) {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    shift.isHandedOver = !shift.isHandedOver;
    saveStoredShifts(currentShifts);
    renderShiftsTable();
    showToastNotification(`Đã cập nhật trạng thái giao ca [Mã ${shift.id}]: ${shift.isHandedOver ? 'ĐÃ GIAO CA' : 'CHƯA GIAO CA'}`);
  };

  window.toggleShiftCheck = function (shiftId) {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    shift.isChecked = !shift.isChecked;
    saveStoredShifts(currentShifts);
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

  window.openCreateShiftModal = function () {
    const modal = document.getElementById('createShiftModal');
    if (!modal) return;
    const nowStr = getRealLiveDateTimeString();
    const startTimeInput = document.getElementById('newStartTime');
    if (startTimeInput) startTimeInput.value = nowStr;
    modal.classList.add('show');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
  };

  window.closeCreateShiftModal = function () {
    const modal = document.getElementById('createShiftModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
    }
  };

  window.saveNewShift = function (e) {
    e.preventDefault();
    const staffName = document.getElementById('newStaffName')?.value.trim() || 'Nhân viên mới';
    const staffId = document.getElementById('newStaffId')?.value.trim() || '883';
    const station = document.getElementById('newStation')?.value || 'Sài Gòn';
    const totalCollectedVal = document.getElementById('newTotalCollected')?.value || '0';
    const totalCollected = parseFloat(totalCollectedVal.replace(/\./g, '').replace(/,/g, '')) || 0;
    const startTime = document.getElementById('newStartTime')?.value || new Date().toLocaleString('vi-VN');
    const endTime = document.getElementById('newEndTime')?.value || '';
    const note = document.getElementById('newNote')?.value || '';

    const newId = Math.floor(590000 + Math.random() * 9000);

    const newShiftObj = {
      id: newId,
      staffName,
      staffId,
      station,
      startTime,
      endTime,
      totalCollected,
      submittedAmount: totalCollected,
      diffAmount: 0,
      note,
      isHandedOver: false,
      isChecked: false,
      summaryStats: {
        totalItems: 0,
        staffId,
        unpaidCount: 0,
        unpaidAmount: 0,
        paidCount: 0,
        paidAmount: totalCollected
      },
      paidCodes: [],
      cargoItems: []
    };

    currentShifts.unshift(newShiftObj);
    saveStoredShifts(currentShifts);
    renderShiftsTable();
    window.closeCreateShiftModal();
    document.getElementById('newShiftForm')?.reset();
    showToastNotification(`Đã mở ca giao hàng mới [Mã ca ${newId}] thành công!`);
  };

  window.clearAllRealShifts = function () {
    if (confirm('Bạn có chắc chắn muốn làm sạch dữ liệu ca giao hàng?')) {
      currentShifts = [];
      saveStoredShifts(currentShifts);
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
    saveStoredShifts(currentShifts);
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
    const filterDate = document.getElementById('filterDate');
    const shiftSearch = document.getElementById('shiftSearch');
    const btnApplyFilter = document.getElementById('btnApplyFilter');

    if (filterStation) filterStation.addEventListener('change', renderShiftsTable);
    if (filterStatus) filterStatus.addEventListener('change', renderShiftsTable);
    if (filterDate) filterDate.addEventListener('change', renderShiftsTable);
    if (shiftSearch) shiftSearch.addEventListener('input', renderShiftsTable);
    if (btnApplyFilter) btnApplyFilter.addEventListener('click', renderShiftsTable);

    renderShiftsTable();
  });
})();
