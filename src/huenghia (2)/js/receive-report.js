/**
 * Báo cáo Nhận hàng — Cashier Receive Report Controller
 * Huệ Nghĩa Express
 *
 * Dữ liệu THẬT: mỗi ca gắn với nhân viên đang đăng nhập (Session + FleetStore, qua
 * js/auth-bridge.js) — không nhập tay tên/mã NV nữa. Danh sách hàng hóa của 1 ca được
 * TÍNH TỪ hueNghia_cargos (cargo.js) — lọc theo staffCode NV đó và khoảng thời gian mở/
 * đóng ca (cargo.id = mốc thời gian tạo hàng, xem cargo.js), gồm mọi loại (hàng hóa,
 * tiền thường, tiền nóng, baga) — không lọc cargoCategory. Chỉ có shift {staffCode,
 * station, startTime, endTime, submittedCash, note, isHandedOver, isChecked} là dữ liệu
 * lưu thật; mọi số tiền/danh sách hàng hiển thị đều tính lại từ cargo mỗi lần render
 * (không lưu trùng để tránh lệch số).
 */

(function () {
  const SHIFTS_KEY = 'hueNghia_receive_shift_reports';
  const CARGOS_KEY = 'hueNghia_cargos';

  const currentStaff = window.HNAuth ? window.HNAuth.requireLogin() : { code: '', name: 'Nhân viên', station: '' };
  if (window.HNAuth) window.HNAuth.renderUserChip(currentStaff);

  function loadShifts() {
    try {
      return JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    } catch (e) {
      console.error('Error parsing stored shifts:', e);
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
    const d = new Date(ms);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  // Toàn bộ hàng hóa (mọi loại: goods/cash/hot/baga) mà NV của ca này đã nhận trong
  // khoảng ca đang mở/đã đóng — cargo.id = Date.now() lúc tạo (xem cargo.js) nên dùng
  // thẳng làm mốc thời gian, không cần field createdAt riêng.
  function getShiftCargoItems(shift, allCargos) {
    const cargos = allCargos || loadCargos();
    const start = shift.startTime;
    const end = shift.endTime || Date.now();
    return cargos.filter((c) => {
      const code = c.staffCode || c.staff;
      return code === shift.staffCode && c.id >= start && c.id <= end;
    });
  }

  // Tính lại toàn bộ số liệu tiền của 1 ca từ dữ liệu hàng hóa thật — không lưu lại,
  // luôn tính mới để không bao giờ lệch với cargo.js.
  function computeShiftStats(shift, allCargos) {
    const items = getShiftCargoItems(shift, allCargos);
    const paidItems = items.filter((c) => c.paymentStatus === 'paid');
    const unpaidItems = items.filter((c) => c.paymentStatus === 'unpaid');

    let cashPaid = 0;
    let transferPaid = 0;
    paidItems.forEach((c) => {
      const fee = Number(c.fee) || 0;
      if (c.paidMethod === 'transfer') transferPaid += fee;
      else cashPaid += fee;
    });

    const unpaidAmount = unpaidItems.reduce((sum, c) => sum + (Number(c.fee) || 0), 0);
    const totalCollected = cashPaid + transferPaid;
    const submittedCash = shift.submittedCash == null ? null : Number(shift.submittedCash);
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

  function findOpenShiftForStaff(staffCode) {
    return currentShifts.find((s) => s.staffCode === staffCode && !s.endTime);
  }

  // Render Master Shifts Table
  function renderShiftsTable() {
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
          const dayStart = new Date(Number(fy), Number(fm) - 1, Number(fd), 0, 0, 0).getTime();
          const dayEnd = dayStart + 24 * 60 * 60 * 1000;
          matchDate = shift.startTime >= dayStart && shift.startTime < dayEnd;
        }
      }

      const matchSearch =
        !searchQuery ||
        String(shift.id).includes(searchQuery) ||
        (shift.staffName || '').toLowerCase().includes(searchQuery) ||
        String(shift.staffCode || '').toLowerCase().includes(searchQuery) ||
        (shift.station || '').toLowerCase().includes(searchQuery) ||
        (shift.note || '').toLowerCase().includes(searchQuery);

      return matchStation && matchStatus && matchDate && matchSearch;
    });

    if (shiftsCountEl) shiftsCountEl.textContent = filtered.length;

    let totalSum = 0;
    let handoverCount = 0;
    let diffSum = 0;
    filtered.forEach((s) => {
      const stats = computeShiftStats(s, allCargos);
      totalSum += stats.totalCollected;
      if (s.isHandedOver) {
        handoverCount++;
        if (stats.diff != null) diffSum += stats.diff;
      }
    });

    if (totalCollectedStat) totalCollectedStat.textContent = formatCurrency(totalSum);
    if (totalShiftsStat) totalShiftsStat.textContent = filtered.length + ' ca';
    if (totalHandoverStat) totalHandoverStat.textContent = `${handoverCount} / ${filtered.length} ca`;
    const diffStatEl = document.querySelector('#statTotalHandover')?.closest('.stat-cards-grid')?.querySelector('.stat-card:nth-child(4) .stat-val');
    if (diffStatEl) diffStatEl.textContent = formatCurrency(diffSum);

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px 12px; color: #64748b;">
            <svg style="width: 40px; height: 40px; margin-bottom: 8px; color: #cbd5e1;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <div style="font-weight: 600; font-size: 15px;">Không tìm thấy ca thu ngân nào</div>
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
              <span><strong>${startStr[1] || ''} ➔ ${endStr[1] || 'Đang mở'}</strong></span>
              <small style="color:#64748b; margin-top:2px;">🕒 ${startStr[0] || ''} • NV: ${shift.staffCode}</small>
            </div>
          </td>
          <td class="text-right">
            <strong style="font-size:14.5px; color:#0f172a;">${formatCurrency(stats.totalCollected)}</strong>
            <div style="font-size:11px; color:#16a34a; font-weight:700; margin-top:1px;">Mặt: ${formatCurrency(stats.cashPaid)}</div>
            <div style="font-size:11px; color:#2563eb; font-weight:700;">CK: ${formatCurrency(stats.transferPaid)}</div>
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
              <button type="button" class="rowicon-btn rowicon-btn--danger" onclick="window.deleteShift(${shift.id})" title="Hủy ca / Xóa ca thu ngân">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  // Open Detail Modal — mọi số tiền/danh sách tính lại real-time từ cargo, chỉ "Số Tiền
  // Nộp" + "Ghi chú" là staff nhập tay lúc kết ca.
  window.openDetailReport = function (shiftId) {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return;

    selectedShiftId = shiftId;
    const modal = document.getElementById('reportDetailModal');
    if (!modal) return;

    const stats = computeShiftStats(shift);

    document.getElementById('modalShiftTitle').textContent = `CHI TIẾT BÁO CÁO NHẬN HÀNG`;
    document.querySelectorAll('#modalShiftStatusPill').forEach((pill) => {
      pill.className = `modal-status-tag ${shift.isHandedOver ? 'tag-success' : 'tag-warning'}`;
      pill.textContent = shift.isHandedOver ? 'CHÚ Ý: ĐÃ GIAO CA' : '( CHƯA GIAO CA )';
    });

    document.getElementById('modalStaffName').value = `${shift.staffName} (Mã NV: ${shift.staffCode})`;
    document.getElementById('modalTimeFrom').value = formatDateTime(shift.startTime);
    document.getElementById('modalTimeTo').value = shift.endTime ? formatDateTime(shift.endTime) : 'Đang mở ca...';
    document.getElementById('modalTotalCollected').value = stats.totalCollected.toLocaleString('vi-VN');
    document.getElementById('modalCashAmount').value = stats.cashPaid.toLocaleString('vi-VN');
    document.getElementById('modalTransferAmount').value = stats.transferPaid.toLocaleString('vi-VN');
    document.getElementById('modalUnpaidAmount').value = stats.unpaidAmount.toLocaleString('vi-VN');
    document.getElementById('modalSubmittedAmount').value = stats.submittedCash != null ? stats.submittedCash.toLocaleString('vi-VN') : '';
    document.getElementById('modalDiffAmount').value = stats.diff != null ? stats.diff.toLocaleString('vi-VN') : '—';
    document.getElementById('modalPaidCodes').value = stats.paidItems.map((c) => c.code).join(', ');
    document.getElementById('modalNoteText').value = shift.note || '';

    // Gõ "Số Tiền Nộp" cập nhật "Thừa Thiếu" ngay, chưa cần bấm Lưu.
    const submittedEl = document.getElementById('modalSubmittedAmount');
    submittedEl.oninput = function () {
      const val = parseFloat(submittedEl.value.replace(/\./g, '').replace(/,/g, '')) || 0;
      document.getElementById('modalDiffAmount').value = (val - stats.cashPaid).toLocaleString('vi-VN');
    };

    // Section 1: THỐNG KÊ NHẬN HÀNG
    const summaryTbody = document.getElementById('modalSummaryTbody');
    if (summaryTbody) {
      summaryTbody.innerHTML = `
        <tr>
          <td style="text-align: center; font-weight: 600;">1</td>
          <td style="font-weight: 700; color: #334155; text-align: center;">${shift.staffCode}</td>
          <td style="text-align: center; font-weight: 600;">${stats.unpaidItems.length} (món)</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(stats.unpaidAmount)}</td>
          <td style="text-align: center; font-weight: 600;">${stats.paidItems.length} (món)</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(stats.totalCollected)}</td>
        </tr>
      `;
    }

    // Section 2: TỔNG HỢP DANH SÁCH NHẬN HÀNG CHƯA XÓA
    document.getElementById('modalCargoCountStat').textContent = stats.items.length + ' (Món)';
    document.getElementById('modalPaidSumStat').textContent = formatCurrency(stats.totalCollected);
    document.getElementById('modalUnpaidSumStat').textContent = formatCurrency(stats.unpaidAmount);

    const cargoTbody = document.getElementById('modalCargoTbody');
    if (cargoTbody) {
      if (stats.items.length === 0) {
        cargoTbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding: 20px; color:#94a3b8;">Chưa có hàng hóa phát sinh trong ca này.</td></tr>`;
      } else {
        cargoTbody.innerHTML = stats.items
          .map(
            (item, idx) => `
          <tr>
            <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
            <td><strong style="color:#0f172a; font-family:'Roboto Mono', monospace;">${item.code || ''}</strong></td>
            <td style="max-width: 280px; font-size: 13px; line-height:1.4;">${item.name || ''}</td>
            <td><strong>${item.sender || '—'}</strong><br/><small style="color:#64748b;">📞 ${item.senderPhone || '—'}</small></td>
            <td style="text-align: center;"><span class="branch-pill-from">${item.stationFrom || '—'}</span></td>
            <td style="text-align: center;"><span class="branch-pill-to">${item.stationTo || '—'}</span></td>
            <td><strong>${item.receiver || '—'}</strong><br/><small style="color:#64748b;">📞 ${item.receiverPhone || '—'}</small></td>
            <td style="text-align: center; font-weight: 600;">${item.staffCode || ''}</td>
            <td style="text-align: center; font-weight: 600;">${item.staffCode || ''}</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(item.fee)}</td>
            <td style="text-align: center;">${item.codAmount ? formatCurrency(item.codAmount) : '—'}</td>
            <td style="text-align: center;">
              ${
                item.paymentStatus === 'paid'
                  ? `<span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; font-size:11px;">True (Đã TT)</span>`
                  : item.paymentStatus === 'free'
                  ? `<span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; font-size:11px;">Không thu phí</span>`
                  : `<span class="badge" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; font-size:11px;">False (Chưa TT)</span>`
              }
            </td>
            <td><span style="font-size: 12px; color: #64748b; white-space: nowrap;">${formatDateTime(item.id)}</span></td>
          </tr>
        `
          )
          .join('');
      }
    }

    modal.classList.add('show');
  };

  window.closeDetailReportModal = function () {
    const modal = document.getElementById('reportDetailModal');
    if (modal) modal.classList.remove('show');
  };

  // Lưu & kết ca — chỉ ghi lại "Số Tiền Nộp" (đếm tay) + Ghi chú; mọi số liệu khác tính
  // lại từ cargo nên không lưu trùng. Lần đầu bấm Lưu sẽ đóng ca (endTime = lúc bấm).
  window.saveShiftHandoverFromModal = function () {
    if (!selectedShiftId) return;
    const shift = currentShifts.find((s) => s.id === selectedShiftId);
    if (!shift) return;

    const submittedVal = document.getElementById('modalSubmittedAmount')?.value || '0';
    const noteVal = document.getElementById('modalNoteText')?.value || '';

    shift.submittedCash = parseFloat(submittedVal.replace(/\./g, '').replace(/,/g, '')) || 0;
    shift.note = noteVal;
    if (!shift.endTime) shift.endTime = Date.now();
    shift.isHandedOver = true;

    saveShifts(currentShifts);
    renderShiftsTable();
    window.closeDetailReportModal();
    showToastNotification(`Đã lưu thông tin ca thành công [Mã ca ${shift.id}]!`);
  };

  window.toggleShiftHandover = function (shiftId) {
    const shift = currentShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    shift.isHandedOver = !shift.isHandedOver;
    if (shift.isHandedOver && !shift.endTime) shift.endTime = Date.now();
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
    showToastNotification(`Đã kiểm tra ca thu ngân [Mã ${shift.id}]`);
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

  // Mở ca mới — mã/tên NV LẤY THẲNG từ tài khoản đang đăng nhập, không cho gõ tay. Nếu
  // NV này đang có ca chưa đóng thì mở lại ca đó thay vì tạo ca chồng lấn (double-count).
  window.openCreateShiftModal = function () {
    const openShift = findOpenShiftForStaff(currentStaff.code);
    if (openShift) {
      showToastNotification(`Bạn đang có ca chưa kết [Mã ca ${openShift.id}] — mở lại ca đó.`);
      window.openDetailReport(openShift.id);
      return;
    }

    const modal = document.getElementById('createShiftModal');
    if (!modal) return;
    document.getElementById('newStaffDisplay').value = `${currentStaff.name} (Mã NV: ${currentStaff.code})`;
    document.getElementById('newStartTimeDisplay').value = formatDateTime(Date.now());
    const stationSelect = document.getElementById('newStation');
    if (stationSelect && currentStaff.station) stationSelect.value = currentStaff.station;
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
    const station = document.getElementById('newStation')?.value || currentStaff.station || 'Sài Gòn';
    const note = document.getElementById('newNote')?.value || '';
    const now = Date.now();

    const newShiftObj = {
      id: now,
      staffCode: currentStaff.code,
      staffName: currentStaff.name,
      station,
      startTime: now,
      endTime: null,
      submittedCash: null,
      note,
      isHandedOver: false,
      isChecked: false
    };

    currentShifts.unshift(newShiftObj);
    saveShifts(currentShifts);
    renderShiftsTable();
    window.closeCreateShiftModal();
    document.getElementById('newShiftForm')?.reset();
    showToastNotification(`Đã mở ca thu ngân mới [Mã ca ${now}] thành công!`);
  };

  window.clearAllRealShifts = function () {
    if (confirm('Bạn có chắc chắn muốn làm sạch dữ liệu? Danh sách ca thu ngân sẽ được làm mới (không ảnh hưởng dữ liệu hàng hóa).')) {
      currentShifts = [];
      saveShifts(currentShifts);
      renderShiftsTable();
      showToastNotification('Đã làm sạch danh sách ca thu ngân!');
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
    showToastNotification(`Đã xóa thành công ca thu ngân [Mã ca ${shiftId}]!`);
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
