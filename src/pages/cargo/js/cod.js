/**
 * Logic Quản lý & Đối soát tiền thu hộ (COD) giữa các chi nhánh
 * Huệ Nghĩa Express
 */

const COD_STORAGE_KEY = 'hueNghia_codTickets';
const CARGO_STORAGE_KEY = 'hueNghia_cargos';

// Toast Notification
function showCodToast(msg, type = 'success') {
  let toastContainer = document.getElementById('codToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'codToastContainer';
    toastContainer.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 12px 18px;
    border-radius: 8px;
    background: ${type === 'error' ? '#ef4444' : '#0f172a'};
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.18);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span> <span>${msg}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// Default COD Tickets (Empty - real tickets are created from COD orders)
const defaultCodTickets = [];

// Barcode Generator for Modal
function generateSVGBarcode(code) {
  return `
    <svg class="barcode-lines-svg" viewBox="0 0 220 50" preserveAspectRatio="none" style="width:100%; height:45px;">
      <rect x="0" y="0" width="220" height="50" fill="#ffffff" />
      <g fill="#0f172a">
        <rect x="10" y="5" width="3" height="40"/><rect x="15" y="5" width="1" height="40"/><rect x="18" y="5" width="4" height="40"/>
        <rect x="24" y="5" width="2" height="40"/><rect x="28" y="5" width="1" height="40"/><rect x="31" y="5" width="3" height="40"/>
        <rect x="36" y="5" width="4" height="40"/><rect x="42" y="5" width="2" height="40"/><rect x="46" y="5" width="1" height="40"/>
        <rect x="50" y="5" width="3" height="40"/><rect x="55" y="5" width="2" height="40"/><rect x="59" y="5" width="4" height="40"/>
        <rect x="65" y="5" width="1" height="40"/><rect x="68" y="5" width="3" height="40"/><rect x="73" y="5" width="2" height="40"/>
        <rect x="77" y="5" width="4" height="40"/><rect x="83" y="5" width="1" height="40"/><rect x="86" y="5" width="3" height="40"/>
        <rect x="91" y="5" width="2" height="40"/><rect x="95" y="5" width="4" height="40"/><rect x="101" y="5" width="1" height="40"/>
        <rect x="104" y="5" width="3" height="40"/><rect x="109" y="5" width="2" height="40"/><rect x="113" y="5" width="4" height="40"/>
        <rect x="119" y="5" width="1" height="40"/><rect x="122" y="5" width="3" height="40"/><rect x="127" y="5" width="2" height="40"/>
        <rect x="131" y="5" width="4" height="40"/><rect x="137" y="5" width="1" height="40"/><rect x="140" y="5" width="3" height="40"/>
        <rect x="145" y="5" width="2" height="40"/><rect x="149" y="5" width="4" height="40"/><rect x="155" y="5" width="1" height="40"/>
        <rect x="158" y="5" width="3" height="40"/><rect x="163" y="5" width="2" height="40"/><rect x="167" y="5" width="4" height="40"/>
        <rect x="173" y="5" width="1" height="40"/><rect x="176" y="5" width="3" height="40"/><rect x="181" y="5" width="2" height="40"/>
        <rect x="185" y="5" width="4" height="40"/><rect x="191" y="5" width="1" height="40"/><rect x="194" y="5" width="3" height="40"/>
        <rect x="200" y="5" width="2" height="40"/><rect x="205" y="5" width="4" height="40"/>
      </g>
    </svg>
  `;
}

const defaultCargosList = [];

// Load Cargos (Respect user edits & deletions in localStorage)
function getCargos() {
  const saved = localStorage.getItem(CARGO_STORAGE_KEY);
  if (saved !== null) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  // Initialize default list only on initial clean run
  localStorage.setItem(CARGO_STORAGE_KEY, JSON.stringify(defaultCargosList));
  return defaultCargosList;
}

// Load COD Tickets & Auto-sync with Cargos
function getCodTickets() {
  const saved = localStorage.getItem(COD_STORAGE_KEY);
  let tickets = [];
  if (saved) {
    try {
      tickets = JSON.parse(saved);
      // Remove old sample tickets if present
      tickets = tickets.filter(t => !['DT00125', 'DT00126', 'DT00127', 'DT00128'].includes(t.ticketCode));
    } catch (e) {}
  }

  // Auto sync COD orders from cargos without creating duplicates
  const cargos = getCargos();
  let updated = false;

  cargos.forEach(cargo => {
    const codVal = Number(cargo.codAmount || 0);
    if (codVal > 0) {
      // Check if ticket already exists
      const existingTicket = tickets.find(t => String(t.orderId) === String(cargo.id) || t.orderCode === cargo.code);
      if (!existingTicket) {
        const newTicketId = tickets.length ? Math.max(...tickets.map(t => t.id || 0)) + 1 : 1;
        const ticketCode = `DT00${120 + newTicketId}`;
        const newTicket = {
          id: newTicketId,
          ticketCode: ticketCode,
          orderId: cargo.id,
          orderCode: cargo.code,
          orderDate: cargo.transferTime || 'Vừa tạo',
          stationFrom: cargo.stationFrom || 'Sài Gòn',
          stationTo: cargo.stationTo || 'Châu Đốc',
          sender: cargo.sender || 'Người gửi',
          senderPhone: cargo.senderPhone || '',
          receiver: cargo.receiver || 'Người nhận',
          receiverPhone: cargo.receiverPhone || '',
          orderStatus: cargo.status || 'pending',
          orderStatusText: cargo.statusText || 'Chưa chuyển',
          codAmount: codVal,
          collectingBranch: cargo.stationTo || 'Châu Đốc',
          receivingBranch: cargo.stationFrom || 'Sài Gòn',
          transferredAmount: 0,
          remainingAmount: codVal,
          status: cargo.status === 'delivered' ? 'cho_chuyen_tien' : 'cho_doi_soat',
          statusText: cargo.status === 'delivered' ? 'Chờ chuyển tiền' : 'Chờ đối soát',
          transferDate: '',
          transferredBy: '',
          confirmedDate: '',
          confirmedBy: '',
          note: 'Tự động khởi tạo từ đơn hàng gốc COD',
          transactions: []
        };
        tickets.push(newTicket);
        updated = true;
      } else {
        // Sync original order details in case cargo updated
        existingTicket.orderStatus = cargo.status;
        existingTicket.orderStatusText = cargo.statusText;
        existingTicket.codAmount = codVal;
        existingTicket.remainingAmount = Math.max(0, codVal - (existingTicket.transferredAmount || 0));
      }
    }
  });

  if (updated) {
    localStorage.setItem(COD_STORAGE_KEY, JSON.stringify(tickets));
  }

  return tickets;
}

// Save COD Tickets
function saveCodTickets(tickets) {
  localStorage.setItem(COD_STORAGE_KEY, JSON.stringify(tickets));
}

// Global App State
const state = {
  tickets: [],
  selectedTicket: null,
  filters: {
    search: '',
    collectingBranch: 'all',
    receivingBranch: 'all',
    status: 'all',
    fromDate: '',
    toDate: ''
  }
};

// Map status to badge UI
function renderStatusBadge(status) {
  const map = {
    'cho_doi_soat': { text: 'Chờ đối soát', class: 'status-cho_doi_soat' },
    'cho_chuyen_tien': { text: 'Chờ chuyển tiền', class: 'status-cho_chuyen_tien' },
    'chuyen_thieu': { text: 'Chuyển thiếu', class: 'status-chuyen_thieu' },
    'cho_bo_sung': { text: 'Chờ bổ sung', class: 'status-cho_bo_sung' },
    'da_chuyen': { text: 'Đã chuyển', class: 'status-da_chuyen' },
    'da_doi_soat': { text: 'Đã đối soát', class: 'status-da_doi_soat' }
  };
  const item = map[status] || { text: status, class: 'status-cho_doi_soat' };
  return `<span class="cod-status-badge ${item.class}"><span class="dot"></span>${item.text}</span>`;
}

// Filter tickets
function getFilteredTickets() {
  return state.tickets.filter(ticket => {
    const searchLower = state.filters.search.trim().toLowerCase();
    const matchSearch = !searchLower || [
      ticket.ticketCode,
      ticket.orderCode,
      ticket.sender,
      ticket.senderPhone,
      ticket.receiver,
      ticket.receiverPhone,
      ticket.collectingBranch,
      ticket.receivingBranch
    ].some(val => (val || '').toLowerCase().includes(searchLower));

    const matchCollect = state.filters.collectingBranch === 'all' || ticket.collectingBranch === state.filters.collectingBranch;
    const matchReceive = state.filters.receivingBranch === 'all' || ticket.receivingBranch === state.filters.receivingBranch;
    const matchStatus = state.filters.status === 'all' || ticket.status === state.filters.status;

    return matchSearch && matchCollect && matchReceive && matchStatus;
  });
}

// Render KPI Metric Cards
function renderMetrics() {
  const filtered = getFilteredTickets();
  const totalTickets = filtered.length;
  const totalRequired = filtered.reduce((sum, t) => sum + (Number(t.codAmount) || 0), 0);
  const totalTransferred = filtered.reduce((sum, t) => sum + (Number(t.transferredAmount) || 0), 0);
  const totalRemaining = filtered.reduce((sum, t) => sum + (Number(t.remainingAmount) || 0), 0);
  const pendingCount = filtered.filter(t => ['cho_chuyen_tien', 'chuyen_thieu', 'cho_bo_sung'].includes(t.status)).length;

  document.getElementById('metricTotalTickets').textContent = totalTickets;
  document.getElementById('metricTotalRequired').textContent = `${totalRequired.toLocaleString('vi-VN')}đ`;
  document.getElementById('metricTotalTransferred').textContent = `${totalTransferred.toLocaleString('vi-VN')}đ`;
  document.getElementById('metricTotalRemaining').textContent = `${totalRemaining.toLocaleString('vi-VN')}đ`;
  document.getElementById('metricPendingActions').textContent = pendingCount;
}

// Render Table
function renderTable() {
  const tbody = document.getElementById('codTableBody');
  if (!tbody) return;
  const filtered = getFilteredTickets();

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:32px; color:#64748b;">Không tìm thấy phiếu đối soát COD phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((row, index) => {
    return `
      <tr>
        <td style="text-align:center; font-weight:700; color:#64748b;">${index + 1}</td>
        <td>
          <span style="font-family:'Roboto Mono', monospace; font-weight:800; color:#0f172a; background:#f1f5f9; padding:2px 8px; border-radius:6px; border:1px solid #cbd5e1;">${row.ticketCode}</span>
        </td>
        <td>
          <button type="button" class="clickable-order-code" onclick="openOriginalCargoModal('${row.orderCode}')" title="Bấm để xem chi tiết đơn hàng gốc">
            <span>📦 ${row.orderCode}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </td>
        <td>
          <strong style="color:#0f172a;">${row.collectingBranch}</strong>
        </td>
        <td>
          <strong style="color:#0f172a;">${row.receivingBranch}</strong>
        </td>
        <td style="text-align:right;">
          <strong style="color:#0f172a; font-family:'Roboto Mono', monospace; font-size:14px;">${Number(row.codAmount).toLocaleString('vi-VN')}đ</strong>
        </td>
        <td style="text-align:right;">
          <strong style="color:#0f172a; font-family:'Roboto Mono', monospace; font-size:14px;">${Number(row.transferredAmount).toLocaleString('vi-VN')}đ</strong>
        </td>
        <td style="text-align:right;">
          <strong style="color:#0f172a; font-family:'Roboto Mono', monospace; font-size:14px;">${Number(row.remainingAmount).toLocaleString('vi-VN')}đ</strong>
        </td>
        <td style="text-align:center;">
          ${renderStatusBadge(row.status)}
        </td>
        <td style="text-align:center; white-space:nowrap;">
          <button type="button" class="secondary-btn" onclick="openDetailModal('${row.ticketCode}')" style="padding:5px 12px; font-size:12.5px; font-weight:700; border-radius:6px; background:#f8fafc; border:1px solid #cbd5e1; color:#0f172a;">
            Chi tiết / Đối soát
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Open Detail Modal (3 Sections)
function openDetailModal(ticketCode) {
  const ticket = state.tickets.find(t => t.ticketCode === ticketCode);
  if (!ticket) return;

  state.selectedTicket = ticket;

  // Section 1: Original Order Info
  document.getElementById('detailOrderCodeBtn').innerHTML = `📦 ${ticket.orderCode} ↗`;
  document.getElementById('detailOrderCodeBtn').onclick = () => openOriginalCargoModal(ticket.orderCode);
  document.getElementById('detailOrderDate').textContent = ticket.orderDate || '—';
  document.getElementById('detailRoute').textContent = `${ticket.stationFrom} → ${ticket.stationTo}`;
  document.getElementById('detailSender').textContent = `${ticket.sender} (${ticket.senderPhone})`;
  document.getElementById('detailReceiver').textContent = `${ticket.receiver} (${ticket.receiverPhone})`;
  document.getElementById('detailCodAmount').textContent = `${Number(ticket.codAmount).toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('detailOrderStatus').innerHTML = `<span style="background:#e0f2fe; color:#0369a1; font-weight:800; padding:2px 8px; border-radius:4px; font-size:12px;">${ticket.orderStatusText || 'Đã giao'}</span>`;

  // Section 2: Reconciliation Cash Flow Info
  document.getElementById('detailTicketCode').textContent = ticket.ticketCode;
  document.getElementById('detailCollectingBranch').textContent = ticket.collectingBranch;
  document.getElementById('detailReceivingBranch').textContent = ticket.receivingBranch;
  document.getElementById('detailRequiredAmount').textContent = `${Number(ticket.codAmount).toLocaleString('vi-VN')}đ`;
  document.getElementById('detailTransferredAmount').textContent = `${Number(ticket.transferredAmount).toLocaleString('vi-VN')}đ`;
  document.getElementById('detailRemainingAmount').textContent = `${Number(ticket.remainingAmount).toLocaleString('vi-VN')}đ`;
  document.getElementById('detailStatusBadge').innerHTML = renderStatusBadge(ticket.status);

  // Prefill transfer form
  const transferInput = document.getElementById('transferAmountInput');
  if (transferInput) {
    transferInput.value = ticket.remainingAmount > 0 ? ticket.remainingAmount : '';
  }
  const transferBranchSelect = document.getElementById('transferBranchInput');
  if (transferBranchSelect) {
    transferBranchSelect.value = ticket.collectingBranch;
  }
  const confirmBranchSelect = document.getElementById('confirmBranchInput');
  if (confirmBranchSelect) {
    confirmBranchSelect.value = ticket.receivingBranch;
  }

  // Toggle forms visibility based on status
  const transferFormBox = document.getElementById('transferActionFormBox');
  const confirmFormBox = document.getElementById('confirmActionFormBox');

  if (ticket.status === 'da_doi_soat') {
    if (transferFormBox) transferFormBox.style.display = 'none';
    if (confirmFormBox) confirmFormBox.style.display = 'none';
  } else {
    if (transferFormBox) transferFormBox.style.display = ticket.remainingAmount > 0 ? 'block' : 'none';
    if (confirmFormBox) confirmFormBox.style.display = ticket.transferredAmount > 0 ? 'block' : 'none';
  }

  // Section 3: Transaction History
  renderTransactionHistory(ticket.transactions || []);

  // Show modal
  document.getElementById('codDetailModal').style.display = 'flex';
}

// Render Transaction History
function renderTransactionHistory(transactions) {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  if (!transactions || !transactions.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:#94a3b8;">Chưa có giao dịch chuyển tiền nào cho phiếu này.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map((tx, idx) => {
    return `
      <tr>
        <td style="text-align:center; font-weight:700;">${idx + 1}</td>
        <td style="white-space:nowrap; font-weight:600;">${tx.time}</td>
        <td style="text-align:right;">
          <strong style="color:#0f172a; font-family:'Roboto Mono', monospace;">
            ${tx.amount > 0 ? `+${Number(tx.amount).toLocaleString('vi-VN')}đ` : '—'}
          </strong>
        </td>
        <td><strong>${tx.performer}</strong></td>
        <td><span class="route-pill">${tx.branch}</span></td>
        <td>${tx.note || '—'}</td>
        <td style="text-align:center;"><span style="font-size:12px; font-weight:700; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#334155;">${tx.statusAfter}</span></td>
      </tr>
    `;
  }).join('');
}

// Handle Transfer Money (Full or Partial)
function executeTransferMoney() {
  const ticket = state.selectedTicket;
  if (!ticket) return;

  const amountInput = document.getElementById('transferAmountInput');
  const performerInput = document.getElementById('transferPerformerInput');
  const branchInput = document.getElementById('transferBranchInput');
  const noteInput = document.getElementById('transferNoteInput');

  const transferVal = Number(amountInput.value) || 0;
  if (transferVal <= 0) {
    showCodToast('Vui lòng nhập số tiền chuyển hợp lệ (> 0đ)', 'error');
    return;
  }

  const performer = performerInput.value.trim() || 'Nhân viên';
  const branch = branchInput.value || ticket.collectingBranch;
  const note = noteInput.value.trim() || `Chuyển tiền COD đợt ${ (ticket.transactions || []).length + 1 }`;

  // Update Ticket State
  ticket.transferredAmount = (Number(ticket.transferredAmount) || 0) + transferVal;
  ticket.remainingAmount = Math.max(0, Number(ticket.codAmount) - ticket.transferredAmount);

  if (ticket.transferredAmount >= ticket.codAmount) {
    ticket.status = 'da_chuyen';
    ticket.statusText = 'Đã chuyển';
  } else {
    ticket.status = 'chuyen_thieu';
    ticket.statusText = 'Chuyển thiếu';
  }

  ticket.transferDate = `${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`;
  ticket.transferredBy = `${performer} (${branch})`;

  // Add Transaction Entry
  if (!ticket.transactions) ticket.transactions = [];
  ticket.transactions.push({
    id: `tx-${Date.now()}`,
    time: ticket.transferDate,
    amount: transferVal,
    performer: performer,
    branch: branch,
    type: 'transfer',
    note: note,
    statusAfter: ticket.statusText
  });

  saveCodTickets(state.tickets);
  showCodToast(`Đã ghi nhận chuyển ${transferVal.toLocaleString('vi-VN')}đ. Trạng thái: ${ticket.statusText}`);

  // Refresh views
  renderMetrics();
  renderTable();
  openDetailModal(ticket.ticketCode);
}

// Handle Receiving Branch Confirmation
function executeConfirmReceipt() {
  const ticket = state.selectedTicket;
  if (!ticket) return;

  const performerInput = document.getElementById('confirmPerformerInput');
  const branchInput = document.getElementById('confirmBranchInput');
  const noteInput = document.getElementById('confirmNoteInput');

  const performer = performerInput.value.trim() || 'Kế toán';
  const branch = branchInput.value || ticket.receivingBranch;
  const note = noteInput.value.trim() || 'Xác nhận đã nhận đủ tiền COD';

  // Update Ticket State
  ticket.status = 'da_doi_soat';
  ticket.statusText = 'Đã đối soát';
  ticket.confirmedDate = `${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`;
  ticket.confirmedBy = `${performer} (${branch})`;

  // Add Transaction Entry
  if (!ticket.transactions) ticket.transactions = [];
  ticket.transactions.push({
    id: `tx-${Date.now()}`,
    time: ticket.confirmedDate,
    amount: 0,
    performer: performer,
    branch: branch,
    type: 'confirm',
    note: note,
    statusAfter: 'Đã đối soát'
  });

  saveCodTickets(state.tickets);
  showCodToast(`Đã xác nhận đối soát thành công cho phiếu ${ticket.ticketCode}`);

  // Refresh views
  renderMetrics();
  renderTable();
  openDetailModal(ticket.ticketCode);
}

// Open Original Cargo Order Detail Modal
function openOriginalCargoModal(orderCode) {
  const cargos = getCargos();
  let cargo = cargos.find(c => c.code === orderCode);

  // Fallback to ticket data if cargo object is missing in localStorage
  if (!cargo) {
    const ticket = (state.tickets || []).find(t => t.orderCode === orderCode);
    if (ticket) {
      cargo = {
        code: ticket.orderCode,
        name: 'Hàng hóa COD',
        quantity: 1,
        unit: 'kiện',
        stationFrom: ticket.stationFrom || ticket.receivingBranch,
        stationTo: ticket.stationTo || ticket.collectingBranch,
        sender: ticket.sender,
        senderPhone: ticket.senderPhone,
        receiver: ticket.receiver,
        receiverPhone: ticket.receiverPhone,
        fee: 150000,
        codAmount: ticket.codAmount,
        transferTime: ticket.orderDate,
        statusText: ticket.orderStatusText || 'Đã giao'
      };
    }
  }

  const container = document.getElementById('cargoOriginalDetailContent');
  if (!container) return;

  if (cargo) {
    container.innerHTML = `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div>
            <span style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase;">Mã vận đơn gốc</span>
            <div style="font-family:'Roboto Mono', monospace; font-size:22px; font-weight:800; color:#1d4ed8;">${cargo.code}</div>
          </div>
          <div style="text-align:right;">
            <span style="background:#dcfce7; color:#15803d; font-weight:800; padding:4px 12px; border-radius:20px; font-size:12.5px; border:1px solid #86efac;">
              ● ${cargo.statusText || 'Đã giao thành công'}
            </span>
          </div>
        </div>

        <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          ${generateSVGBarcode(cargo.code)}
          <div style="font-family:'Roboto Mono', monospace; font-size:12.5px; font-weight:700; color:#475569; margin-top:3px;">* ${cargo.code} *</div>
        </div>
      </div>

      <div class="cod-info-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
        <div class="cod-info-item"><label>Tên hàng hóa</label><div class="val"><strong>${cargo.name || 'Hàng hóa COD'}</strong> (${cargo.quantity || 1} ${cargo.unit || 'cái'})</div></div>
        <div class="cod-info-item"><label>Tuyến vận chuyển</label><div class="val"><span class="route-pill">${cargo.stationFrom || 'Sài Gòn'} → ${cargo.stationTo || 'Châu Đốc'}</span></div></div>
        <div class="cod-info-item"><label>Người gửi</label><div class="val"><strong>${cargo.sender || '—'}</strong> (${cargo.senderPhone || '—'})</div></div>
        <div class="cod-info-item"><label>Người nhận</label><div class="val"><strong>${cargo.receiver || '—'}</strong> (${cargo.receiverPhone || '—'})</div></div>
        <div class="cod-info-item"><label>Cước vận chuyển</label><div class="val">${Number(cargo.fee || 150000).toLocaleString('vi-VN')}đ</div></div>
        <div class="cod-info-item"><label>Tiền thu hộ (COD)</label><div class="val" style="color:#7c3aed; font-weight:800; font-family:'Roboto Mono', monospace; font-size:16px;">⚡ ${Number(cargo.codAmount || 0).toLocaleString('vi-VN')}đ</div></div>
        <div class="cod-info-item"><label>Thời gian gửi hàng</label><div class="val">${cargo.transferTime || '—'}</div></div>
        <div class="cod-info-item"><label>Nhân viên tiếp nhận</label><div class="val">${cargo.staff || 'Linh'}</div></div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="padding:24px; text-align:center;">
        <h3>Đơn hàng gốc <code>${orderCode}</code></h3>
        <p style="color:#64748b; margin-top:8px;">Chi tiết đơn hàng đang được cập nhật từ hệ thống.</p>
      </div>
    `;
  }

  document.getElementById('cargoOriginalDetailModal').style.display = 'flex';
}

// Close Modals
function closeCodDetailModal() {
  document.getElementById('codDetailModal').style.display = 'none';
}
function closeOriginalCargoModal() {
  document.getElementById('cargoOriginalDetailModal').style.display = 'none';
}

// Attach Event Listeners
function initEventListeners() {
  // Global search input
  const searchInput = document.getElementById('codSearchInput') || document.getElementById('globalCodSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      renderMetrics();
      renderTable();
    });
  }

  // Filter selects
  const filterCollect = document.getElementById('filterCollectingBranch');
  if (filterCollect) {
    filterCollect.addEventListener('change', (e) => {
      state.filters.collectingBranch = e.target.value;
      renderMetrics();
      renderTable();
    });
  }

  const filterReceive = document.getElementById('filterReceivingBranch');
  if (filterReceive) {
    filterReceive.addEventListener('change', (e) => {
      state.filters.receivingBranch = e.target.value;
      renderMetrics();
      renderTable();
    });
  }

  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      renderMetrics();
      renderTable();
    });
  }

  // Close modals when clicking overlay
  window.addEventListener('click', (e) => {
    const detailModal = document.getElementById('codDetailModal');
    const cargoModal = document.getElementById('cargoOriginalDetailModal');
    if (e.target === detailModal) closeCodDetailModal();
    if (e.target === cargoModal) closeOriginalCargoModal();
  });
}

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
  state.tickets = getCodTickets();
  initEventListeners();
  renderMetrics();
  renderTable();
});
