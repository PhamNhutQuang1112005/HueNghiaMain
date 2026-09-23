const STORAGE_KEYS = {
  MANIFESTS: 'hueNghia_manifests',
  CARGOS: 'hueNghia_cargos'
};

const defaultManifests = [];

const DEFAULT_UNITS = ['cái', 'kg', 'bao', 'túi', 'thùng', 'hộp', 'cuộn', 'lô'];

function loadCustomUnits() {
  const saved = localStorage.getItem('hueNghia_customUnits');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [];
}

function saveCustomUnit(newUnit) {
  if (!newUnit || typeof newUnit !== 'string') return;
  const unitClean = newUnit.trim();
  if (!unitClean) return;
  
  const customUnits = loadCustomUnits();
  const lowerAll = [...DEFAULT_UNITS, ...customUnits].map(u => u.toLowerCase());
  
  if (!lowerAll.includes(unitClean.toLowerCase())) {
    customUnits.push(unitClean);
    localStorage.setItem('hueNghia_customUnits', JSON.stringify(customUnits));
  }
}

function populateUnitDropdown(selectedUnit = 'cái') {
  const unitSelect = document.getElementById('cargoUnitSelect');
  const customWrap = document.getElementById('cargoUnitCustomWrap');
  const customInput = document.getElementById('cargoUnitCustom');
  if (!unitSelect) return;

  const customUnits = loadCustomUnits();
  const allUnits = [...DEFAULT_UNITS];
  customUnits.forEach(u => {
    if (!allUnits.some(existing => existing.toLowerCase() === u.toLowerCase())) {
      allUnits.push(u);
    }
  });

  let optionsHtml = allUnits.map(u => {
    const label = u === 'cái' ? 'Cái / Kiện' : u === 'kg' ? 'kg (Ký)' : u;
    return `<option value="${u}">${label}</option>`;
  }).join('');

  optionsHtml += `<option value="custom">Tự nhập đơn vị mới...</option>`;
  unitSelect.innerHTML = optionsHtml;

  const existsInList = allUnits.some(u => u.toLowerCase() === (selectedUnit || '').toLowerCase());
  if (existsInList) {
    unitSelect.value = selectedUnit;
    if (customWrap) customWrap.style.display = 'none';
    if (customInput) customInput.value = '';
  } else if (selectedUnit && selectedUnit !== 'cái') {
    unitSelect.value = 'custom';
    if (customWrap) customWrap.style.display = 'flex';
    if (customInput) customInput.value = selectedUnit;
  } else {
    unitSelect.value = 'cái';
    if (customWrap) customWrap.style.display = 'none';
    if (customInput) customInput.value = '';
  }
}

function parseFeeInput(val, defaultVal = 150000) {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = Number(val);
  if (isNaN(num)) return defaultVal;
  if (num > 0 && num < 10000) {
    return num * 1000;
  }
  return num;
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
  if (origQ > q) {
    return `${q}/${origQ} ${unit}`;
  }
  return `${q} ${unit}`;
}

const defaultCargos = [];
const _old_defaultCargos = [
  {
    id: 4,
    name: 'Tivi Sony 55 inch',
    code: 'SG00125',
    quantity: 1,
    originalQuantity: 1,
    unit: 'cái',
    sender: 'Vũ Văn Hùng',
    senderPhone: '0907777888',
    receiver: 'Nguyễn Thị Mai',
    receiverPhone: '0909999000',
    stationTo: 'Châu Đốc',
    stationFrom: 'Sài Gòn',
    fee: '150000',
    codAmount: 500000,
    staff: 'Linh',
    transferTime: `09:00 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    receiveTime: `11:30 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    status: 'delivered',
    statusText: 'Đã giao',
    manifestId: null,
    cargoCategory: 'goods'
  },
  {
    id: 5,
    name: 'Thùng Điện Thoại iPhone 15',
    code: 'SG00126',
    quantity: 2,
    originalQuantity: 2,
    unit: 'thùng',
    sender: 'Trần Văn Hoàng',
    senderPhone: '0912345678',
    receiver: 'Phạm Thanh Thảo',
    receiverPhone: '0987654321',
    stationTo: 'Châu Đốc',
    stationFrom: 'Sài Gòn',
    fee: '200000',
    codAmount: 500000,
    staff: 'Thành',
    transferTime: `10:15 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    receiveTime: `14:00 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    status: 'delivered',
    statusText: 'Đã giao',
    manifestId: null,
    cargoCategory: 'goods'
  },
  {
    id: 6,
    name: 'Lô Quần Áo May Mặc',
    code: 'AG00340',
    quantity: 5,
    originalQuantity: 5,
    unit: 'bao',
    sender: 'Nguyễn Thị Bích',
    senderPhone: '0933111222',
    receiver: 'Đặng Quốc Bảo',
    receiverPhone: '0944333444',
    stationTo: 'Sài Gòn',
    stationFrom: 'Châu Đốc',
    fee: '350000',
    codAmount: 1200000,
    staff: 'Minh',
    transferTime: `07:45 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    receiveTime: `12:15 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    status: 'delivered',
    statusText: 'Đã giao',
    manifestId: null,
    cargoCategory: 'goods'
  },
  {
    id: 7,
    name: 'Bộ Máy Tính Văn Phòng',
    code: 'SG00128',
    quantity: 1,
    originalQuantity: 1,
    unit: 'bộ',
    sender: 'Lê Hoàng Nam',
    senderPhone: '0977888999',
    receiver: 'Huỳnh Mẫn Nhi',
    receiverPhone: '0966555444',
    stationTo: 'Long Xuyên',
    stationFrom: 'Sài Gòn',
    fee: '180000',
    codAmount: 850000,
    staff: 'Phương',
    transferTime: `13:30 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    receiveTime: `16:45 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    status: 'delivered',
    statusText: 'Đã giao',
    manifestId: null,
    cargoCategory: 'goods'
  },
  {
    id: 1,
    name: 'Máy lạnh 2HP',
    code: 'DH-1001',
    quantity: 1,
    originalQuantity: 1,
    unit: 'cái',
    sender: 'Nguyễn Văn Long',
    senderPhone: '0901111111',
    receiver: 'Trần Thị Hạnh',
    receiverPhone: '0902222222',
    stationTo: 'Châu Đốc',
    stationFrom: 'Sài Gòn',
    fee: '180000',
    staff: 'Linh',
    transferTime: `08:30 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    receiveTime: `12:00 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    status: 'in-transit',
    statusText: 'Đã chuyển',
    manifestId: 101,
    cargoCategory: 'goods'
  },
  {
    id: 15,
    name: 'Xe máy Honda Vision (Chở Baga)',
    code: 'BG00901',
    quantity: 1,
    originalQuantity: 1,
    unit: 'chiếc',
    sender: 'Nguyễn Thanh Tùng',
    senderPhone: '0977888999',
    receiver: 'Lê Hoàng Nam',
    receiverPhone: '0966555444',
    stationTo: 'Châu Đốc',
    stationFrom: 'Sài Gòn',
    fee: '450000',
    staff: 'Thành',
    transferTime: `08:00 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    receiveTime: `12:30 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    status: 'transferred',
    statusText: 'Đã nhận phơi',
    manifestId: 105,
    cargoCategory: 'baga'
  },
  {
    id: 16,
    name: 'Bộ Baga mui chở hàng inox xe tải',
    code: 'BG00902',
    quantity: 2,
    originalQuantity: 2,
    unit: 'bộ',
    sender: 'Phạm Minh Đức',
    senderPhone: '0911222333',
    receiver: 'Vũ Thị Loan',
    receiverPhone: '0933444555',
    stationTo: 'Tân Châu',
    stationFrom: 'Sài Gòn',
    fee: '250000',
    staff: 'Linh',
    transferTime: `09:15 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    receiveTime: `13:45 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    status: 'transferred',
    statusText: 'Đã nhận phơi',
    manifestId: 102,
    cargoCategory: 'baga'
  },
  {
    id: 2,
    name: 'mười triệu VNĐ',
    code: 'DH-1002',
    quantity: 1,
    originalQuantity: 1,
    unit: 'Nguyên vẹn',
    moneyAmount: '10000000',
    sender: 'Phạm Minh Tâm',
    senderPhone: '0903333333',
    receiver: 'Võ Anh Dũng',
    receiverPhone: '0904444444',
    stationTo: 'Sài Gòn',
    stationFrom: 'Tân Châu',
    fee: '240000',
    staff: 'Huy',
    transferTime: '10:15 21/07',
    receiveTime: '17:20 21/07',
    status: 'undelivered',
    statusText: 'Chưa giao',
    manifestId: 102,
    cargoCategory: 'cash'
  },
  {
    id: 3,
    name: 'năm mươi triệu VNĐ',
    code: 'DH-1003',
    quantity: 1,
    originalQuantity: 1,
    unit: 'Nguyên vẹn',
    moneyAmount: '50000000',
    sender: 'Đỗ Thu Hà',
    senderPhone: '0905555555',
    receiver: 'Lê Quốc Bảo',
    receiverPhone: '0906666666',
    stationTo: 'Tân Châu',
    stationFrom: 'Châu Đốc',
    fee: '320000',
    staff: 'Mai',
    transferTime: '13:10 20/07',
    receiveTime: '08:00 21/07',
    status: 'delivered',
    statusText: 'Đã giao',
    manifestId: null,
    cargoCategory: 'hot'
  },

  /* ===== Dữ liệu mẫu nghiệp vụ Giao hàng — hàng đã đến trạm qua manifest 108 (đã "Đã nhận xe"),
     dùng cho trang delivery.html (Danh sách giao hàng, xem js/delivery.js). Không phải hàng mới tạo
     từ Nhận hàng — đây là 4 đơn thể hiện đủ trạng thái giao: Chờ giao/Đang giao/Đã giao/Thất bại. ===== */
  {
    id: 17,
    name: 'Baga: Xe máy',
    code: 'BG-W6B3ZW',
    quantity: 1,
    originalQuantity: 1,
    unit: 'cái',
    sender: 'Khách gửi Baga',
    senderPhone: '0900000001',
    receiver: 'Khách nhận Baga',
    receiverPhone: '123456789',
    deliveryAddress: 'Long Xuyên, An Giang',
    stationTo: 'AG',
    stationFrom: 'Sài Gòn',
    fee: '50000',
    codAmount: 0,
    staff: 'Nhiên',
    transferTime: `19:22 03/09`,
    status: 'in-transit',
    statusText: 'Đã chuyển',
    manifestId: 108,
    cargoCategory: 'baga',
    baga: { code: 'W6B3ZW' },
    deliveryStatus: 'cho-giao',
    deliveryStaff: '',
    deliveryStaffPhone: '',
    codCollected: 0
  },
  {
    id: 18,
    name: 'Máy lạnh',
    code: 'DH-9971',
    quantity: 1,
    originalQuantity: 1,
    unit: 'cái',
    sender: 'Người gửi mẫu',
    senderPhone: '0900000002',
    receiver: 'Nguyễn Văn B',
    receiverPhone: '0901234567',
    deliveryAddress: 'Long Xuyên, An Giang',
    stationTo: 'AG',
    stationFrom: 'Sài Gòn',
    fee: '150000',
    codAmount: 450000,
    staff: 'Bạn',
    transferTime: `20:11 21/08`,
    status: 'in-transit',
    statusText: 'Đã chuyển',
    manifestId: 108,
    cargoCategory: 'goods',
    deliveryStatus: 'dang-giao',
    deliveryStaff: 'Nguyễn Văn C',
    deliveryStaffPhone: '0913000111',
    codCollected: 0,
    pickedUpAt: `15:05 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`
  },
  {
    id: 19,
    name: 'ML',
    code: 'DH-6267',
    quantity: 1,
    originalQuantity: 1,
    unit: 'cái',
    sender: 'Người gửi mẫu',
    senderPhone: '0900000003',
    receiver: 'Nguyễn Thị B',
    receiverPhone: '0987654321',
    deliveryAddress: 'Long Xuyên, An Giang',
    stationTo: 'AG',
    stationFrom: 'Sài Gòn',
    fee: '150000',
    codAmount: 0,
    staff: 'Bạn',
    transferTime: `19:08 21/08`,
    status: 'delivered',
    statusText: 'Đã giao',
    manifestId: 108,
    cargoCategory: 'goods',
    deliveryStatus: 'da-giao',
    deliveryStaff: 'Trần Văn D',
    deliveryStaffPhone: '0913000222',
    codCollected: 150000,
    pickedUpAt: `14:40 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
    deliveredAt: `16:10 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`
  },
  {
    id: 20,
    name: 'Tivi',
    code: 'DH-2184',
    quantity: 1,
    originalQuantity: 1,
    unit: 'cái',
    sender: 'Người gửi mẫu',
    senderPhone: '0900000004',
    receiver: 'Trần Văn A',
    receiverPhone: '0912345678',
    deliveryAddress: 'Long Xuyên, An Giang',
    stationTo: 'AG',
    stationFrom: 'Sài Gòn',
    fee: '100000',
    codAmount: 75000,
    staff: 'Bạn',
    transferTime: `14:54 05/08`,
    status: 'undelivered',
    statusText: 'Chưa giao',
    manifestId: 108,
    cargoCategory: 'goods',
    deliveryStatus: 'that-bai',
    deliveryStaff: 'Nguyễn Văn C',
    deliveryStaffPhone: '0913000111',
    deliveryFailReason: 'Không liên lạc được',
    codCollected: 0,
    pickedUpAt: `10:20 ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`
  }
];

// Auto reset dữ liệu về 0 theo yêu cầu người dùng
if (!localStorage.getItem('hueNghia_data_reset_clean_v3')) {
  localStorage.setItem(STORAGE_KEYS.CARGOS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.MANIFESTS, JSON.stringify([]));
  localStorage.setItem('hueNghia_receive_shift_reports', JSON.stringify([]));
  localStorage.setItem('hueNghia_delivery_shift_reports', JSON.stringify([]));
  localStorage.setItem('hueNghia_cod_tickets', JSON.stringify([]));
  localStorage.setItem('cargo_deletion_history', JSON.stringify([]));
  localStorage.setItem('hueNghia_data_reset_clean_v3', 'true');
}

function loadManifests() {
  const saved = localStorage.getItem(STORAGE_KEYS.MANIFESTS);
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  localStorage.setItem(STORAGE_KEYS.MANIFESTS, JSON.stringify([]));
  return [];
}

function syncCargosWithManifests(cargos) {
  if (!Array.isArray(cargos)) return cargos;
  const manifests = loadManifests();
  cargos.forEach(cargo => {
    if (cargo.name) {
      cargo.name = cargo.name.replace(/🧳/g, '').trim();
    }
    const name = (cargo.name || '').toLowerCase();
    if (name.includes('nóng') || name.includes('50tr')) {
      cargo.cargoCategory = 'hot';
    } else if (name.includes('bạn hàng')) {
      cargo.cargoCategory = 'partner_cash';
    } else if (name.includes('tiền')) {
      cargo.cargoCategory = 'cash';
    } else if (cargo.status === 'returned') {
      cargo.cargoCategory = 'returned';
    } else if (!cargo.cargoCategory || cargo.cargoCategory === 'all') {
      cargo.cargoCategory = 'goods';
    }

    if (cargo.manifestId) {
      const manifest = manifests.find(m => String(m.id) === String(cargo.manifestId));
      if (manifest) {
        cargo.stationFrom = manifest.from || (manifest.route ? manifest.route.split('→')[0].trim() : (cargo.stationFrom || 'Chưa gán'));
        cargo.stationTo = manifest.to || (manifest.route ? manifest.route.split('→')[1].trim() : (cargo.stationTo || 'Chưa gán'));
      }
      if (!cargo.status || cargo.status === 'pending') {
        cargo.status = 'in-transit';
        cargo.statusText = 'Đã chuyển';
      }
    } else {
      cargo.stationFrom = cargo.stationFrom || 'Chưa gán';
      cargo.stationTo = cargo.stationTo || 'Chưa gán';
      if (!cargo.status) {
        cargo.status = 'pending';
        cargo.statusText = 'Chưa chuyển';
      }
    }
  });
  return cargos;
}

function loadCargos() {
  const saved = localStorage.getItem(STORAGE_KEYS.CARGOS);
  let list = null;
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch (e) {}
  }
  if (!list || !Array.isArray(list)) {
    list = [];
    localStorage.setItem(STORAGE_KEYS.CARGOS, JSON.stringify([]));
  }
  return syncCargosWithManifests(list);
}

function saveCargos(cargos) {
  localStorage.setItem(STORAGE_KEYS.CARGOS, JSON.stringify(cargos));
}

const urlParams = new URLSearchParams(window.location.search);
const urlFilter = urlParams.get('filter');
// cargo.js dùng chung cho cả cargo.html VÀ delivery.html (không có delivery.js riêng), nhưng sidebar
// có CẢ 2 nhóm bộ lọc (Nhận hàng + Giao hàng) trên mọi trang. Phải tách riêng key lưu trạng thái +
// scope input theo đúng nhóm của trang đang mở, nếu không 2 nhóm sẽ đọc/ghi đè lẫn nhau.
const isDeliveryPage = window.location.pathname.includes('delivery.html');
const categoryStorageKey = isDeliveryPage ? 'hueNghia_selectedDeliveryCategory' : 'hueNghia_selectedCategory';
const savedCategory = urlFilter || localStorage.getItem(categoryStorageKey) || 'all';

localStorage.setItem(categoryStorageKey, savedCategory);

const state = {
  manifests: loadManifests(),
  data: loadCargos(),
  selectedCategory: savedCategory
};

let currentDetailCargoId = null;

const cargoTableBody = document.getElementById('cargoTableBody');
const bundleModal = document.getElementById('bundleModal');
const transferModal = document.getElementById('transferModal');
const cargoDetailModal = document.getElementById('cargoDetailModal');
const toast = document.getElementById('toast');
const bundleForm = document.getElementById('bundleForm');
const transferForm = document.getElementById('transferForm');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const batchTransferBtn = document.getElementById('batchTransferBtn');
const selectedCountEl = document.getElementById('selectedCount');
const statusOptions = Array.from(document.querySelectorAll(
  isDeliveryPage ? '.status-option input[name="deliveryStateFilter"]' : '.status-option input[name="cargoStateFilter"]'
));

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 1800);
}

function updateManifestDropdowns() {
  state.manifests = loadManifests();
  const filterManifest = document.getElementById('filterManifest');
  const targetManifestSelect = document.getElementById('targetManifestSelect') || document.getElementById('transferManifestSelect');

  const optionsHtml = `
    <option value="all">Tất cả phơi</option>
    <option value="none">Chưa gán phơi</option>
    ${state.manifests.map(m => `<option value="${m.id}">${m.name} (${m.plate})</option>`).join('')}
  `;

  const transferOptionsHtml = `
    <option value="">-- Chọn phơi nhận hàng --</option>
    ${state.manifests.length
      ? state.manifests.map(m => `<option value="${m.id}">${m.name} (${m.plate}) — ${m.from || (m.route ? m.route.split('➔')[0].trim() : '')} ➔ ${m.to || (m.route ? m.route.split('➔')[1].trim() : '')}</option>`).join('')
      : '<option value="">Chưa có phơi hàng nào (Vui lòng tạo phơi trước)</option>'}
  `;

  if (filterManifest) filterManifest.innerHTML = optionsHtml;
  if (targetManifestSelect) targetManifestSelect.innerHTML = transferOptionsHtml;
}

const defaultStationsList = [
  'Sài Gòn',
  'Bến xe Miền Tây',
  'Châu Đốc',
  'Trạm Châu Đốc',
  'Tân Châu',
  'Trạm Tân Châu',
  'Trạm Long Bình',
  'Trạm An Phú',
  'Trạm Tri Tôn',
  'Trạm Chợ Mới',
  'Trạm Bình Long',
  'Trạm Tịnh Biên',
  'AG (An Giang)'
];

function populateCargoStationSelects(selectedFrom = 'Sài Gòn', selectedTo = 'Châu Đốc') {
  const fromEl = document.getElementById('stationFrom');
  const toEl = document.getElementById('stationTo');
  if (!fromEl || !toEl) return;

  fromEl.innerHTML = defaultStationsList.map(st => `<option value="${st}" ${st === selectedFrom ? 'selected' : ''}>${st}</option>`).join('');
  toEl.innerHTML = defaultStationsList.map(st => `<option value="${st}" ${st === selectedTo ? 'selected' : ''}>${st}</option>`).join('');

  const dirEl = document.getElementById('cargoDirection');
  if (dirEl) {
    const matchVal = `${selectedFrom}|${selectedTo}`;
    dirEl.value = [...dirEl.options].some(o => o.value === matchVal) ? matchVal : dirEl.options[0].value;
  }
}

const STATIONS_BY_REGION = {
  AG: ['Châu Đốc', 'Hà Tiên', 'Long Xuyên', 'Tân Châu', 'Tri Tôn', 'Chợ Mới', 'Bình Long', 'Tịnh Biên', 'An Châu', 'An Phú'],
  SG: ['508 Kinh Dương Vương', '4 Tống Văn Trân', '58 Lê Đại Hành', 'Bến xe Miền Tây', 'Sài Gòn'],
  BD: ['Trạm An Phú', 'Bến An Phú', 'Trạm An Sương', 'Trạm Bến Cát']
};

const DIRECTION_MAP = {
  AG_SG: { from: 'AG', to: 'SG' },
  SG_AG: { from: 'SG', to: 'AG' },
  AG_BD: { from: 'AG', to: 'BD' },
  BD_AG: { from: 'BD', to: 'AG' }
};

function updateDirectionFilterOptions() {
  const dirEl = document.getElementById('filterDirection');
  const fromEl = document.getElementById('filterFrom');
  const toEl = document.getElementById('filterTo');
  if (!dirEl || !fromEl || !toEl) return;

  const dirVal = dirEl.value;
  const currentFrom = fromEl.value;
  const currentTo = toEl.value;

  if (dirVal === 'all') {
    renderStationSelectGroup(fromEl, 'Tất cả trạm gửi', ['AG', 'SG', 'BD'], currentFrom);
    renderStationSelectGroup(toEl, 'Tất cả trạm nhận', ['SG', 'AG', 'BD'], currentTo);
  } else if (DIRECTION_MAP[dirVal]) {
    const config = DIRECTION_MAP[dirVal];
    renderStationSelectGroup(fromEl, 'Tất cả trạm gửi', [config.from], currentFrom);
    renderStationSelectGroup(toEl, 'Tất cả trạm nhận', [config.to], currentTo);
  }
}

function renderStationSelectGroup(selectEl, defaultLabel, regions, selectedVal) {
  const regionLabels = {
    AG: 'An Giang',
    SG: 'Sài Gòn',
    BD: 'Bình Dương'
  };

  let html = `<option value="all">${defaultLabel}</option>`;
  regions.forEach(regKey => {
    const list = STATIONS_BY_REGION[regKey] || [];
    if (list.length > 0) {
      html += `<optgroup label="${regionLabels[regKey] || regKey}">`;
      list.forEach(st => {
        html += `<option value="${st}" ${st === selectedVal ? 'selected' : ''}>${st}</option>`;
      });
      html += `</optgroup>`;
    }
  });

  selectEl.innerHTML = html;
}

function getFilteredData() {
  const globalSearchEl = document.getElementById('globalSearch');
  const filterDateEl = document.getElementById('filterDate');
  const filterDirectionEl = document.getElementById('filterDirection');
  const filterFromEl = document.getElementById('filterFrom');
  const filterToEl = document.getElementById('filterTo');

  const searchText = globalSearchEl ? globalSearchEl.value.trim().toLowerCase() : '';
  const dateVal = filterDateEl ? filterDateEl.value : '';
  const dirVal = filterDirectionEl ? filterDirectionEl.value : 'all';
  const from = filterFromEl ? filterFromEl.value : 'all';
  const to = filterToEl ? filterToEl.value : 'all';
  
  let dateFormatted = '';
  const now = new Date();
  const todayDayStr = String(now.getDate()).padStart(2, '0');
  const todayMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const todayFormatted = `${todayDayStr}/${todayMonthStr}`;

  if (dateVal) {
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      dateFormatted = `${parts[2]}/${parts[1]}`;
    }
  }

  const isTodaySelected = dateVal && (dateFormatted === todayFormatted || dateVal === now.toISOString().split('T')[0]);

  if (!Array.isArray(state.data) || state.data.length === 0) {
    state.data = loadCargos();
  }

  return state.data.filter((row) => {
    const name = (row.name || '').toLowerCase();
    let itemCat = row.cargoCategory;
    if (name.includes('nóng') || name.includes('50tr')) {
      itemCat = 'hot';
    } else if (name.includes('bạn hàng')) {
      itemCat = 'partner_cash';
    } else if (name.includes('tiền')) {
      itemCat = 'cash';
    } else if (name.includes('baga') || name.includes('xe máy') || name.includes('tay ga') || name.includes('xe số')) {
      itemCat = 'baga';
    } else if (row.status === 'returned') {
      itemCat = 'returned';
    } else if (!itemCat) {
      itemCat = 'goods';
    }
    const matchesCategory = state.selectedCategory === 'all'
      ? true
      : state.selectedCategory === 'overdue'
        ? isCargoOverdue(row)
        : state.selectedCategory === 'returned'
          ? (row.status === 'returned' || itemCat === 'returned')
          : state.selectedCategory === 'cash'
            ? (itemCat === 'cash' || itemCat === 'partner_cash')
            : itemCat === state.selectedCategory;

    let matchesDirection = true;
    if (dirVal !== 'all' && DIRECTION_MAP[dirVal]) {
      const config = DIRECTION_MAP[dirVal];
      const fromStations = STATIONS_BY_REGION[config.from] || [];
      const toStations = STATIONS_BY_REGION[config.to] || [];
      const rowFrom = (row.stationFrom || '').toLowerCase();
      const rowTo = (row.stationTo || '').toLowerCase();

      const fromMatch = fromStations.some(st => rowFrom.includes(st.toLowerCase()) || (st === 'Sài Gòn' && (rowFrom.includes('sg') || rowFrom.includes('sài gòn'))));
      const toMatch = toStations.some(st => rowTo.includes(st.toLowerCase()) || (st === 'Sài Gòn' && (rowTo.includes('sg') || rowTo.includes('sài gòn'))));

      matchesDirection = fromMatch && toMatch;
    }

    const matchesSearch = !searchText || [row.name, row.code, row.sender, row.senderPhone, row.receiver, row.receiverPhone, row.stationFrom, row.stationTo, row.staff].some((val) => (val || '').toLowerCase().includes(searchText));
    const matchesFrom = from === 'all' || (row.stationFrom || '').toLowerCase().includes(from.toLowerCase());
    const matchesTo = to === 'all' || (row.stationTo || '').toLowerCase().includes(to.toLowerCase());

    const rowTime = row.transferTime || '';
    const matchesDate = !dateVal || 
      rowTime.includes(dateFormatted) || 
      rowTime.includes(dateVal) || 
      (isTodaySelected && (rowTime.includes('Vừa tạo') || rowTime.includes(todayFormatted)));

    return matchesCategory && matchesDirection && matchesSearch && matchesFrom && matchesTo && matchesDate;
  });
}

/* Render bang gop 8 cot thong tin tinh te & sach se */
function renderTable() {
  if (!cargoTableBody) return;

  const newBagaBtn = document.getElementById('newBagaBtn');
  const newOrderBtn = document.getElementById('newOrderBtn');
  if (state.selectedCategory === 'baga') {
    if (newBagaBtn) newBagaBtn.style.display = 'inline-flex';
    if (newOrderBtn) newOrderBtn.style.display = 'none';
  } else {
    if (newBagaBtn) newBagaBtn.style.display = 'none';
    if (newOrderBtn) newOrderBtn.style.display = 'inline-flex';
  }

  const isDelivery = window.location.pathname.includes('delivery.html');
  const eyebrow = document.querySelector('.toolbar .eyebrow');
  const mainH1 = document.querySelector('.toolbar h1');
  if (state.selectedCategory === 'baga') {
    if (eyebrow) eyebrow.textContent = isDelivery ? 'Giao hàng' : 'Nhận hàng';
    if (mainH1) mainH1.textContent = 'Danh sách Baga xe khách';
  } else {
    if (eyebrow) eyebrow.textContent = isDelivery ? 'Giao hàng' : 'Nhận hàng';
    if (mainH1) mainH1.textContent = isDelivery ? 'Danh sách giao hàng' : 'Danh sách hàng hóa';
  }

  const rows = getFilteredData();
  state.manifests = loadManifests();

  cargoTableBody.innerHTML = rows.length
    ? rows.map((row, index) => {
        const manifest = state.manifests.find(m => String(m.id) === String(row.manifestId));
        const manifestInfo = manifest
          ? `<div style="font-size:11.5px; color:#475569; font-weight:600; margin-top:2px;">${manifest.name}</div>`
          : `<div style="font-size:11px; color:#94a3b8; margin-top:2px;">Chưa gán phơi</div>`;

        const fromSt = row.stationFrom || (manifest ? manifest.from : 'Sài Gòn');
        const toSt = row.stationTo || (manifest ? manifest.to : 'AG');

        const dimParts = [];
        if (row.length || row.width || row.height) {
          dimParts.push(`${row.length || 0}x${row.width || 0}x${row.height || 0}cm`);
        }
        if (row.weight) {
          dimParts.push(`${row.weight}kg`);
        }
        const dimBadge = dimParts.length
          ? `<div style="font-size:11px; color:#475569; font-weight:600; margin-top:2px;">${dimParts.join(' • ')}</div>`
          : '';

        return `
          <tr>
            <td style="text-align:center;">
              <input type="checkbox" class="row-checkbox" data-id="${row.id}" />
            </td>
            <td style="text-align:center;"><strong>${index + 1}</strong></td>
            <td>
              <strong class="cargo-name">${(row.name || '').replace(/🧳/g, '').trim()}</strong> <span style="font-size:11.5px; font-weight:700; color:#64748b;">(${formatCargoQuantity(row)})</span><br>
              <code>${row.code}</code>
              ${manifestInfo}
              ${dimBadge}
              ${row.delayReason ? `<br><span style="display:inline-block; font-size:11px; color:#be123c; font-weight:700; background:#fff1f2; border:1px solid #fecdd3; padding:1px 6px; border-radius:4px; margin-top:2px;" title="${row.delayReason}">⚠️ Lý do hoãn: ${row.delayReason}</span>` : ''}
            </td>
            <td>
              <div style="font-weight:700; color:#0f172a; font-size:12.5px;">${fromSt} ➔ ${toSt}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">${row.transferTime || 'Vừa tạo'} • NV: ${row.staff || 'Nhiên'}</div>
            </td>
            <td>
              <div style="line-height:1.35; font-size:12px;">
                <small style="color:var(--text-muted);">Gửi:</small> <strong>${row.sender}</strong> (${row.senderPhone})<br>
                <small style="color:var(--text-muted);">Nhận:</small> <strong>${row.receiver}</strong> (${row.receiverPhone})
              </div>
            </td>
            <td>
              <strong>${Number(row.fee || 0).toLocaleString('vi-VN')}đ</strong><br>
              ${row.paymentStatus === 'free' ? `<span style="font-size:11px; color:#2563eb; font-weight:700;">Không thu phí</span>` : (row.paymentStatus === 'paid' ? `<span style="font-size:11px; color:#15803d; font-weight:700;">Tiền rồi (${row.paidMethod === 'transfer' ? (row.transferCode || 'CK') : 'Tiền mặt'})</span>` : '<span style="font-size:11px; color:#dc2626; font-weight:700;">Chưa tiền</span>')}
              ${(row.codAmount && Number(row.codAmount) > 0) || (row.baga && row.baga.code && !row.code.includes(row.baga.code)) ? `
                <div class="mini-tag-row">
                  ${row.codAmount && Number(row.codAmount) > 0 ? `<span class="mini-tag">COD: ${Number(row.codAmount).toLocaleString('vi-VN')}đ</span>` : ''}
                  ${row.baga && row.baga.code && !row.code.includes(row.baga.code) ? `<span class="mini-tag">Baga: ${row.baga.code}</span>` : ''}
                </div>
              ` : ''}
            </td>
            <td style="text-align:center;">
              <select class="cargo-status-select-inline" onchange="updateCargoStatusFromTable('${row.id}', this.value)" ${row.manifestId != null ? 'disabled' : ''} style="padding:4px 4px; border-radius:6px; font-weight:700; font-size:11.5px; border:1.5px solid #cbd5e1; cursor:${row.manifestId != null ? 'not-allowed' : 'pointer'}; background:${row.manifestId != null ? '#f1f5f9' : 'white'}; color:${row.manifestId != null ? '#64748b' : '#1e293b'}; width:100%;" title="${row.manifestId != null ? 'Hàng đã gán phơi xe - Khóa không thể đổi' : 'Đổi trạng thái'}">
                ${window.location.pathname.includes('delivery.html') ? `
                  <option value="undelivered" ${row.status === 'undelivered' || row.status === 'pending' || !row.status ? 'selected' : ''}>Chưa giao</option>
                  <option value="delivered" ${row.status === 'delivered' ? 'selected' : ''}>Đã giao</option>
                ` : `
                  <option value="pending" ${row.status === 'pending' && !row.manifestId ? 'selected' : ''}>Chưa chuyển</option>
                  <option value="in-transit" ${row.status === 'in-transit' || row.manifestId != null ? 'selected' : ''}>Đã chuyển</option>
                `}
              </select>
            </td>
            <td style="text-align:center;">
              <div class="action-group">
                <button class="rowicon-btn" data-action="detail" data-id="${row.id}" onclick="handleCargoRowAction(event, '${row.id}', 'detail')" title="Xem chi tiết">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="rowicon-btn" data-action="edit" data-id="${row.id}" onclick="handleCargoRowAction(event, '${row.id}', 'edit')" title="Chỉnh sửa">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="rowicon-btn rowicon-btn--danger" data-action="delete" data-id="${row.id}" onclick="handleCargoRowAction(event, '${row.id}', 'delete')" title="Xóa hàng hóa">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
                <div class="action-more-wrap">
                  <button class="rowicon-btn" onclick="toggleRowActionMenu(event, '${row.id}')" title="Thêm">
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                  </button>
                  <div class="action-more-menu" id="actionMenu-${row.id}">
                    <button type="button" onclick="closeAllRowActionMenus(); openDeliveryReceiptModal('${row.id}')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      Biên lai
                    </button>
                    <button type="button" onclick="closeAllRowActionMenus(); handleCargoRowAction(event, '${row.id}', 'print')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                      In tem dán
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="8" style="text-align:center;padding:24px;color:#6b7280;">Không có dữ liệu phù hợp.</td></tr>';

  updateBatchTransferButton();
}

function updateBatchTransferButton() {
  const checkedBoxes = Array.from(document.querySelectorAll('.row-checkbox:checked'));
  const count = checkedBoxes.length;
  if (selectedCountEl) selectedCountEl.textContent = count;
  const selectedPrintCountEl = document.getElementById('selectedPrintCount');
  if (selectedPrintCountEl) selectedPrintCountEl.textContent = count;
  if (batchTransferBtn) batchTransferBtn.style.display = count > 0 ? 'inline-flex' : 'none';
  const batchPrintCargoStickersBtn = document.getElementById('batchPrintCargoStickersBtn');
  if (batchPrintCargoStickersBtn) batchPrintCargoStickersBtn.style.display = count > 0 ? 'inline-flex' : 'none';
}

function openCargoDetailModal(cargoId) {
  currentDetailCargoId = cargoId;
  const cargo = state.data.find(c => String(c.id) === String(cargoId));
  if (!cargo) return;

  state.manifests = loadManifests();
  const manifest = state.manifests.find(m => String(m.id) === String(cargo.manifestId));

  const cleanName = (cargo.name || '').replace(/🧳/g, '').trim();
  const fromSt = cargo.stationFrom || (manifest ? manifest.from : 'Sài Gòn');
  const toSt = cargo.stationTo || (manifest ? manifest.to : 'Châu Đốc');

  let statusLabel = cargo.statusText || 'Chưa chuyển';
  let statusClass = 'st-pending';
  if (cargo.status === 'delivered') {
    statusLabel = 'Đã giao';
    statusClass = 'st-delivered';
  } else if (cargo.status === 'in-transit' || cargo.manifestId != null) {
    statusLabel = 'Đã chuyển';
    statusClass = 'st-transit';
  } else {
    statusLabel = 'Chưa chuyển';
    statusClass = 'st-pending';
  }

  const payText = cargo.paymentStatus === 'free' ? 'Không thu phí' : (cargo.paymentStatus === 'paid' ? `Đã thu (${cargo.paidMethod === 'transfer' ? (cargo.transferCode || 'CK') : 'Tiền mặt'})` : 'Chưa thu tiền');

  document.getElementById('cargoDetailTitle').textContent = `Chi tiết hàng hóa`;
  document.getElementById('cargoDetailContent').innerHTML = `
    <div class="cargo-detail-minimal">
      <!-- Header: Title, Code, Status -->
      <div class="minimal-header">
        <div class="minimal-title-wrap">
          <h3 class="minimal-title">${cleanName}</h3>
          <span class="minimal-code">Mã đơn: ${cargo.code}</span>
        </div>
        <span class="minimal-status-badge ${statusClass}"><span class="status-dot"></span>${statusLabel}</span>
      </div>

      <!-- Route & Manifest -->
      <div class="minimal-section">
        <div class="minimal-label">Hành trình vận chuyển</div>
        <div class="minimal-route-text"><span class="route-badge">${fromSt}</span> ➔ <span class="route-badge">${toSt}</span></div>
        <div class="minimal-subtext">${manifest ? `Phơi xe: ${manifest.name} (${manifest.plate || 'Chưa biển số'})` : 'Chưa gán phơi xe'}</div>
      </div>

      <!-- Sender & Receiver -->
      <div class="minimal-grid-2">
        <div class="form-section minimal-col">
          <div class="minimal-label">Người gửi</div>
          <div class="minimal-val-main">${cargo.sender || '---'}</div>
          <div class="minimal-subtext">${cargo.senderPhone || ''}</div>
          ${cargo.pickupAddress ? `<div class="minimal-subtext">Địa chỉ nhận: ${cargo.pickupAddress}</div>` : ''}
        </div>

        <div class="form-section minimal-col">
          <div class="minimal-label">Người nhận</div>
          <div class="minimal-val-main">${cargo.receiver || '---'}</div>
          <div class="minimal-subtext">${cargo.receiverPhone || ''}</div>
          ${cargo.deliveryAddress ? `<div class="minimal-subtext">Địa chỉ giao: ${cargo.deliveryAddress}</div>` : ''}
        </div>
      </div>

      <!-- Financials & Staff -->
      <div class="form-section">
        <div class="minimal-grid-4">
          <div class="minimal-col">
            <div class="minimal-label">Số lượng</div>
            <div class="minimal-val">${formatCargoQuantity(cargo)}</div>
          </div>
          <div class="minimal-col">
            <div class="minimal-label">Cước phí</div>
            <div class="minimal-val bold">${Number(cargo.fee || 0).toLocaleString('vi-VN')}đ</div>
          </div>
          <div class="minimal-col">
            <div class="minimal-label">Thanh toán</div>
            <div class="minimal-val">${payText}</div>
          </div>
          <div class="minimal-col">
            <div class="minimal-label">Nhân viên tạo</div>
            <div class="minimal-val">${cargo.staff || 'Nhiên'} <small style="color:#94a3b8;">(${cargo.transferTime || ''})</small></div>
          </div>
        </div>
      </div>

      ${cargo.note || (cargo.baga && cargo.baga.note) ? `
        <div class="form-section">
          <div class="minimal-label">Ghi chú</div>
          <div class="minimal-subtext note">${cargo.note || cargo.baga.note}</div>
        </div>
      ` : ''}
    </div>
  `;

  cargoDetailModal.classList.add('open');
}

function setFormLockedState(isLocked, manifestName = '', isMoneyLockedOnly = false) {
  if (!bundleForm) return;

  const moneyInputIds = [
    'cargoFee',
    'cargoMoneyAmount',
    'cargoCodAmount',
    'codCheckbox',
    'cargoPaymentStatus',
    'cargoPaidMethod',
    'cargoTransferCode',
    'pickupPaymentMethod',
    'pickupFee',
    'pickupTransferCode',
    'deliveryPaymentMethod',
    'deliveryFee',
    'deliveryTransferCode'
  ];

  const formElements = bundleForm.querySelectorAll('input, select, textarea');
  formElements.forEach(el => {
    if (el.type !== 'hidden') {
      if (isLocked) {
        el.disabled = true;
      } else if (isMoneyLockedOnly) {
        el.disabled = moneyInputIds.includes(el.id);
      } else {
        el.disabled = false;
      }
    }
  });

  const submitBtn = document.getElementById('submitBundleBtn');
  if (submitBtn) {
    submitBtn.style.display = isLocked ? 'none' : 'inline-block';
  }

  let noticeEl = document.getElementById('lockedManifestNotice');
  if (isLocked) {
    if (!noticeEl) {
      noticeEl = document.createElement('div');
      noticeEl.id = 'lockedManifestNotice';
      bundleForm.insertBefore(noticeEl, bundleForm.firstChild);
    }
    noticeEl.style.display = 'flex';
    noticeEl.style.cssText = 'background:#fef2f2; border:1.5px solid #fca5a5; color:#991b1b; padding:10px 14px; border-radius:8px; font-weight:700; font-size:13.5px; margin-bottom:14px; display:flex; align-items:center; gap:8px;';
    noticeEl.innerHTML = `<span>Hàng đã vào <strong>${manifestName || 'phơi hàng'}</strong>. Thông tin đã bị khóa và không thể chỉnh sửa.</span>`;
  } else if (noticeEl) {
    noticeEl.style.display = 'none';
  }
}

function openModal(editId = null) {
  if (!bundleModal) return;
  updateManifestDropdowns();
  const titleEl = document.getElementById('modalTitle');
  const eyebrowEl = document.getElementById('modalEyebrow');
  const submitBtn = document.getElementById('submitBundleBtn');

  if (editId) {
    const item = state.data.find(d => String(d.id) === String(editId));
    if (item) {
      const isLocked = item.manifestId != null;
      const isMoneyLockedOnly = !isLocked;
      const manifest = isLocked ? state.manifests.find(m => String(m.id) === String(item.manifestId)) : null;

      if (titleEl) titleEl.textContent = isLocked ? 'Chi tiết hàng hóa (Đã khóa)' : 'Chỉnh sửa hàng hóa';
      if (eyebrowEl) eyebrowEl.textContent = isLocked ? 'Đã vào phơi hàng' : 'Cập nhật đơn hàng';
      if (submitBtn) submitBtn.textContent = 'Lưu thay đổi';

      setFormLockedState(isLocked, manifest ? manifest.name : '', isMoneyLockedOnly);

      document.getElementById('bundleId').value = String(item.id);
      document.getElementById('cargoName').value = item.name || '';
      document.getElementById('cargoQuantity').value = item.quantity || 1;
      populateUnitDropdown(item.unit || 'cái');
      populateCargoStationSelects(item.stationFrom || 'Sài Gòn', item.stationTo || 'Châu Đốc');
      
      const catSelect = document.getElementById('cargoCategorySelect');
      const moneyInput = document.getElementById('cargoMoneyAmount');
      if (catSelect) catSelect.value = item.cargoCategory || 'goods';
      if (moneyInput) {
        const rawMoney = String(item.moneyAmount || '').replace(/\D/g, '');
        moneyInput.value = rawMoney ? rawMoney.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
      }
      updateCargoCategoryVisibility();

      document.getElementById('senderName').value = item.sender || '';
      document.getElementById('senderPhone').value = item.senderPhone || '';
      document.getElementById('receiverName').value = item.receiver || '';
      document.getElementById('receiverPhone').value = item.receiverPhone || '';
      const feeVal = Number(item.fee || 150000);
      document.getElementById('cargoFee').value = feeVal >= 1000 ? Math.round(feeVal / 1000) : feeVal;
      document.getElementById('cargoNote').value = item.note || '';
      const hasDimensions = !!(item.length || item.width || item.height || item.weight);
      const dimensionsCheckbox = document.getElementById('dimensionsCheckbox');
      const dimensionsFieldsWrap = document.getElementById('dimensionsFieldsWrap');
      if (dimensionsCheckbox) dimensionsCheckbox.checked = hasDimensions;
      if (dimensionsFieldsWrap) dimensionsFieldsWrap.style.display = hasDimensions ? 'block' : 'none';
      if (document.getElementById('cargoLength')) document.getElementById('cargoLength').value = item.length || '';
      if (document.getElementById('cargoWidth')) document.getElementById('cargoWidth').value = item.width || '';
      if (document.getElementById('cargoHeight')) document.getElementById('cargoHeight').value = item.height || '';
      if (document.getElementById('cargoWeight')) document.getElementById('cargoWeight').value = item.weight || '';

      const paySelect = document.getElementById('cargoPaymentStatus');
      const paidMethodWrap = document.getElementById('paidMethodWrap');
      const paidMethodSelect = document.getElementById('cargoPaidMethod');
      const transferWrap = document.getElementById('transferCodeWrap');
      const transferInput = document.getElementById('cargoTransferCode');
      const codInput = document.getElementById('cargoCodAmount');
      if (paySelect) {
        paySelect.value = item.paymentStatus === 'free' ? 'free' : (item.paymentStatus === 'unpaid' ? 'unpaid' : 'paid');
        if (paidMethodSelect) paidMethodSelect.value = item.paidMethod || 'cash';
        if (transferInput) transferInput.value = item.transferCode || '';

        if (paidMethodWrap) paidMethodWrap.style.display = paySelect.value === 'paid' ? 'flex' : 'none';
        if (transferWrap) transferWrap.style.display = (paySelect.value === 'paid' && (item.paidMethod || 'cash') === 'transfer') ? 'flex' : 'none';
      }
      const codCheckbox = document.getElementById('codCheckbox');
      const codAmountFieldWrap = document.getElementById('codAmountFieldWrap');
      if (codCheckbox && codInput) {
        const codVal = Number(item.codAmount || 0);
        const hasCod = codVal > 0;
        codCheckbox.checked = hasCod;
        if (codAmountFieldWrap) codAmountFieldWrap.style.display = hasCod ? 'flex' : 'none';
        codInput.value = codVal >= 1000 ? Math.round(codVal / 1000) : (codVal || '');
      }

      const pickupCheckbox = document.getElementById('pickupCheckbox');
      const pickupAddressWrap = document.getElementById('pickupAddressWrap');
      const pickupAddressInput = document.getElementById('pickupAddress');

      const deliveryCheckbox = document.getElementById('deliveryCheckbox');
      const deliveryAddressWrap = document.getElementById('deliveryAddressWrap');
      const deliveryAddressInput = document.getElementById('deliveryAddress');

      if (pickupCheckbox && pickupAddressWrap && pickupAddressInput) {
        pickupCheckbox.checked = !!item.pickupAddress;
        pickupAddressWrap.style.display = item.pickupAddress ? 'block' : 'none';
        pickupAddressInput.value = item.pickupAddress || '';
        document.getElementById('pickupCard')?.classList.toggle('active', !!item.pickupAddress);
        const pPaySelect = document.getElementById('pickupPaymentMethod');
        if (pPaySelect) pPaySelect.value = item.pickupPaymentMethod || 'cash';
        const pFee = Number(item.pickupFee || 0);
        if (document.getElementById('pickupFee')) document.getElementById('pickupFee').value = pFee >= 1000 ? Math.round(pFee / 1000) : (pFee || '');
        if (document.getElementById('pickupTransferCode')) document.getElementById('pickupTransferCode').value = item.pickupTransferCode || '';
        if (typeof updatePickupPaymentVisibility === 'function') updatePickupPaymentVisibility();
      }

      if (deliveryCheckbox && deliveryAddressWrap && deliveryAddressInput) {
        deliveryCheckbox.checked = !!item.deliveryAddress;
        deliveryAddressWrap.style.display = item.deliveryAddress ? 'block' : 'none';
        deliveryAddressInput.value = item.deliveryAddress || '';
        document.getElementById('deliveryCard')?.classList.toggle('active', !!item.deliveryAddress);
        const dPaySelect = document.getElementById('deliveryPaymentMethod');
        if (dPaySelect) dPaySelect.value = item.deliveryPaymentMethod || 'cash';
        const dFee = Number(item.deliveryFee || 0);
        if (document.getElementById('deliveryFee')) document.getElementById('deliveryFee').value = dFee >= 1000 ? Math.round(dFee / 1000) : (dFee || '');
        if (document.getElementById('deliveryTransferCode')) document.getElementById('deliveryTransferCode').value = item.deliveryTransferCode || '';
        if (typeof updateDeliveryPaymentVisibility === 'function') updateDeliveryPaymentVisibility();
      }
    }
  } else {
    setFormLockedState(false);
    if (titleEl) titleEl.textContent = 'Tạo mới lô hàng';
    if (eyebrowEl) eyebrowEl.textContent = 'Tạo hàng hóa';
    if (submitBtn) submitBtn.textContent = 'Tạo hàng hóa';
    bundleForm.reset();
    document.getElementById('bundleId').value = '';
    document.getElementById('cargoQuantity').value = 1;
    document.getElementById('cargoFee').value = 150;
    populateUnitDropdown('cái');
    populateCargoStationSelects('Sài Gòn', 'Châu Đốc');
    
    const catSelect = document.getElementById('cargoCategorySelect');
    if (catSelect) catSelect.value = 'goods';
    updateCargoCategoryVisibility();

    const pickupAddressWrap = document.getElementById('pickupAddressWrap');
    const deliveryAddressWrap = document.getElementById('deliveryAddressWrap');
    if (pickupAddressWrap) pickupAddressWrap.style.display = 'none';
    if (deliveryAddressWrap) deliveryAddressWrap.style.display = 'none';
    document.getElementById('pickupCard')?.classList.remove('active');
    document.getElementById('deliveryCard')?.classList.remove('active');

    const paySelect = document.getElementById('cargoPaymentStatus');
    const paidMethodWrap = document.getElementById('paidMethodWrap');
    const paidMethodSelect = document.getElementById('cargoPaidMethod');
    const transferWrap = document.getElementById('transferCodeWrap');
    const transferInput = document.getElementById('cargoTransferCode');
    const codInput = document.getElementById('cargoCodAmount');
    if (paySelect) paySelect.value = 'paid';
    if (paidMethodSelect) paidMethodSelect.value = 'cash';
    if (transferInput) transferInput.value = '';
    if (paidMethodWrap) paidMethodWrap.style.display = 'flex';
    if (transferWrap) transferWrap.style.display = 'none';
    if (codInput) codInput.value = '';

    const codCheckbox = document.getElementById('codCheckbox');
    const codAmountFieldWrap = document.getElementById('codAmountFieldWrap');
    if (codCheckbox) codCheckbox.checked = false;
    if (codAmountFieldWrap) codAmountFieldWrap.style.display = 'none';

    const dimensionsCheckbox = document.getElementById('dimensionsCheckbox');
    const dimensionsFieldsWrap = document.getElementById('dimensionsFieldsWrap');
    if (dimensionsCheckbox) dimensionsCheckbox.checked = false;
    if (dimensionsFieldsWrap) dimensionsFieldsWrap.style.display = 'none';
    if (document.getElementById('cargoLength')) document.getElementById('cargoLength').value = '';
    if (document.getElementById('cargoWidth')) document.getElementById('cargoWidth').value = '';
    if (document.getElementById('cargoHeight')) document.getElementById('cargoHeight').value = '';
    if (document.getElementById('cargoWeight')) document.getElementById('cargoWeight').value = '';
  }

  bundleModal.classList.add('open');
}

function closeModal() {
  if (!bundleModal) return;
  bundleModal.classList.remove('open');
  bundleForm.reset();
  document.getElementById('bundleId').value = '';
}

function openTransferModal(cargoIds) {
  if (!transferModal) return;
  updateManifestDropdowns();
  document.getElementById('transferCargoIds').value = cargoIds.join(',');

  const container = document.getElementById('transferCargoQuantityContainer');
  if (container) {
    const selectedCargos = state.data.filter(c => cargoIds.map(String).includes(String(c.id)));
    container.innerHTML = selectedCargos.map(cargo => {
      const q = cargo.quantity || 1;
      const isMoney = isMoneyCargo(cargo);
      const displayQtyText = formatCargoQuantity(cargo);
      const unitStr = isMoney ? displayQtyText : (cargo.unit || 'cái');
      const labelText = isMoney ? 'Tổng số tiền hiện có' : 'Tổng số lượng hiện có';
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #cbd5e1;">
          <div>
            <strong style="font-size:14px; color:#0f172a;">${cargo.name}</strong> <code style="font-size:12px;">(${cargo.code})</code><br>
            <small style="color:#64748b;">${labelText}: <strong>${displayQtyText}</strong></small>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:13px; font-weight:600; color:#334155;">Chuyển đi:</span>
            ${isMoney ? `
              <span style="font-size:13px; font-weight:800; color:#1d4ed8; padding:5px 12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px;">${displayQtyText}</span>
              <input type="hidden" class="transfer-qty-input" data-cargo-id="${cargo.id}" data-max-qty="1" value="1" />
            ` : `
              <input type="number" class="transfer-qty-input" data-cargo-id="${cargo.id}" data-max-qty="${q}" min="1" max="${q}" value="${q}" style="width:75px; padding:6px; border:1px solid #cbd5e1; border-radius:6px; text-align:center; font-weight:800; font-size:14px; color:#1d4ed8; background:white;" />
              <span style="font-size:13px; color:#64748b;">${unitStr}</span>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  transferModal.classList.add('open');
}

function closeTransferModal() {
  if (!transferModal) return;
  transferModal.classList.remove('open');
}

if (bundleForm) {
  bundleForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(bundleForm);
    const idVal = formData.get('id');
    const stFrom = formData.get('stationFrom') || 'Sài Gòn';
    const stTo = formData.get('stationTo') || 'Châu Đốc';

    const catVal = formData.get('cargoCategory') || 'goods';
    const isMoneyCat = catVal === 'cash' || catVal === 'hot' || catVal === 'partner_cash';

    let selectedUnit = formData.get('unit') || 'cái';
    if (isMoneyCat) {
      selectedUnit = 'Nguyên vẹn';
    } else if (selectedUnit === 'custom') {
      const customVal = document.getElementById('cargoUnitCustom')?.value.trim();
      if (customVal) {
        selectedUnit = customVal;
        saveCustomUnit(selectedUnit);
      } else {
        selectedUnit = 'cái';
      }
    }

    if (idVal) {
      const target = state.data.find(row => String(row.id) === String(idVal));
      if (target && target.manifestId != null) {
        alert('Hàng hóa này đã được gán vào phơi hàng, không thể chỉnh sửa!');
        return;
      }
      let cName = (formData.get('cargoName') || '').trim();
      if (isMoneyCat && cName && !/VNĐ$/i.test(cName)) {
        cName += ' VNĐ';
      }

      if (target) {
        target.name = cName;
        const newQty = isMoneyCat ? 1 : (Number(formData.get('quantity')) || 1);
        target.quantity = newQty;
        if (!target.originalQuantity || newQty > target.originalQuantity) {
          target.originalQuantity = newQty;
        }
        target.unit = selectedUnit;
        target.cargoCategory = catVal;
        target.moneyAmount = (formData.get('moneyAmount') || '').replace(/\D/g, '');
        target.stationFrom = stFrom;
        target.stationTo = stTo;
        target.sender = formData.get('senderName');
        target.senderPhone = formData.get('senderPhone');
        target.receiver = formData.get('receiverName');
        target.receiverPhone = formData.get('receiverPhone');
        const isMoneyDisabled = document.getElementById('cargoFee')?.disabled;
        if (!isMoneyDisabled) {
          target.fee = parseFeeInput(formData.get('fee'), 150000);
          target.paymentStatus = formData.get('paymentStatus') || 'paid';
          target.paidMethod = formData.get('paidMethod') || 'cash';
          target.transferCode = formData.get('transferCode') || '';
          target.codAmount = document.getElementById('codCheckbox')?.checked ? parseFeeInput(formData.get('codAmount'), 0) : 0;
          target.pickupPaymentMethod = formData.get('pickupPaymentMethod') || 'cash';
          target.pickupFee = parseFeeInput(formData.get('pickupFee'), 0);
          target.pickupTransferCode = formData.get('pickupTransferCode') || '';
          target.deliveryPaymentMethod = formData.get('deliveryPaymentMethod') || 'cash';
          target.deliveryFee = parseFeeInput(formData.get('deliveryFee'), 0);
          target.deliveryTransferCode = formData.get('deliveryTransferCode') || '';
        }
        target.note = formData.get('note') || '';
        target.length = formData.get('cargoLength') || '';
        target.width = formData.get('cargoWidth') || '';
        target.height = formData.get('cargoHeight') || '';
        target.weight = formData.get('cargoWeight') || '';
        
        showToast('Đã cập nhật thông tin hàng hóa');
      }
    } else {
      let cName = (formData.get('cargoName') || '').trim();
      if (isMoneyCat && cName && !/VNĐ$/i.test(cName)) {
        cName += ' VNĐ';
      }
      const newQty = isMoneyCat ? 1 : (Number(formData.get('quantity')) || 1);
      const newRecord = {
        id: Date.now(),
        name: cName,
        quantity: newQty,
        originalQuantity: newQty,
        unit: selectedUnit,
        cargoCategory: catVal,
        moneyAmount: (formData.get('moneyAmount') || '').replace(/\D/g, ''),
        code: `DH-${Math.floor(1000 + Math.random() * 9000)}`,
        sender: formData.get('senderName'),
        senderPhone: formData.get('senderPhone'),
        receiver: formData.get('receiverName'),
        receiverPhone: formData.get('receiverPhone'),
        stationFrom: stFrom,
        stationTo: stTo,
        fee: parseFeeInput(formData.get('fee'), 150000),
        note: formData.get('note') || '',
        length: formData.get('cargoLength') || '',
        width: formData.get('cargoWidth') || '',
        height: formData.get('cargoHeight') || '',
        weight: formData.get('cargoWeight') || '',
        paymentStatus: formData.get('paymentStatus') || 'paid',
        paidMethod: formData.get('paidMethod') || 'cash',
        transferCode: formData.get('transferCode') || '',
        codAmount: document.getElementById('codCheckbox')?.checked ? parseFeeInput(formData.get('codAmount'), 0) : 0,
        pickupAddress: document.getElementById('pickupCheckbox')?.checked ? (document.getElementById('pickupAddress')?.value || '') : '',
        pickupPaymentMethod: formData.get('pickupPaymentMethod') || 'cash',
        pickupFee: parseFeeInput(formData.get('pickupFee'), 0),
        pickupTransferCode: formData.get('pickupTransferCode') || '',
        deliveryAddress: document.getElementById('deliveryCheckbox')?.checked ? (document.getElementById('deliveryAddress')?.value || '') : '',
        deliveryPaymentMethod: formData.get('deliveryPaymentMethod') || 'cash',
        deliveryFee: parseFeeInput(formData.get('deliveryFee'), 0),
        deliveryTransferCode: formData.get('deliveryTransferCode') || '',
        staff: 'Bạn',
        transferTime: `${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
        receiveTime: 'Chưa nhận',
        status: 'pending',
        statusText: 'Chưa chuyển',
        manifestId: null
      };
      state.data.unshift(newRecord);
      showToast('Đã tạo hàng hóa mới');
    }

    saveCargos(state.data);
    renderTable();
    closeModal();
  });
}

if (transferForm) {
  transferForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const manifestId = Number(document.getElementById('targetManifestSelect').value);
    if (!manifestId) {
      alert('Vui lòng chọn hoặc tạo một phơi hàng!');
      return;
    }
    const idsStr = document.getElementById('transferCargoIds').value;
    const ids = idsStr.split(',').map(n => Number(n)).filter(Boolean);

    let count = 0;
    const qtyInputs = document.querySelectorAll('.transfer-qty-input');
    const newItemsToAdd = [];

    const targetManifest = state.manifests.find(m => String(m.id) === String(manifestId));
    const stFrom = targetManifest ? (targetManifest.from || targetManifest.route.split('→')[0].trim()) : 'Chưa gán';
    const stTo = targetManifest ? (targetManifest.to || targetManifest.route.split('→')[1].trim()) : 'Chưa gán';

    ids.forEach(id => {
      const item = state.data.find(row => row.id === id);
      if (!item) return;

      const qtyInput = Array.from(qtyInputs).find(input => Number(input.dataset.cargoId) === id);
      const totalQty = item.quantity || 1;
      const origQty = item.originalQuantity || totalQty;
      let qtyToTransfer = qtyInput ? Number(qtyInput.value) : totalQty;
      if (isNaN(qtyToTransfer) || qtyToTransfer <= 0) qtyToTransfer = totalQty;
      if (qtyToTransfer > totalQty) qtyToTransfer = totalQty;

      if (qtyToTransfer >= totalQty) {
        // Transfer all quantity
        item.manifestId = manifestId;
        item.stationFrom = stFrom;
        item.stationTo = stTo;
        item.status = 'in-transit';
        item.statusText = 'Đã chuyển';
        count += qtyToTransfer;
      } else {
        // Partial quantity transfer -> split into a new transferred item
        // Đơn đầu (gốc) giữ nguyên toàn bộ cước phí ban đầu (totalFee)
        // Đơn mới tách ra cước phí = 0đ (không thu cước lại)
        const remainingQty = totalQty - qtyToTransfer;
        const totalFee = Number(item.fee || 0);

        item.quantity = remainingQty;
        item.originalQuantity = origQty;
        item.fee = totalFee; // Đơn đầu giữ nguyên cước phí ban đầu

        const transferredItem = {
          ...item,
          id: Date.now() + Math.floor(Math.random() * 1000),
          code: `${item.code}.${Math.floor(Math.random() * 90 + 10)}`,
          quantity: qtyToTransfer,
          originalQuantity: origQty,
          fee: 0, // Đơn mới tách ra có cước phí = 0đ
          paymentStatus: 'free',
          manifestId: manifestId,
          stationFrom: stFrom,
          stationTo: stTo,
          status: 'in-transit',
          statusText: 'Đã chuyển'
        };

        newItemsToAdd.push(transferredItem);
        count += qtyToTransfer;
      }
    });

    if (newItemsToAdd.length > 0) {
      state.data.unshift(...newItemsToAdd);
    }

    saveCargos(state.data);
    renderTable();
    closeTransferModal();
    showToast(`Đã chuyển ${count} món hàng vào phơi thành công`);
  });
}

const pickupCheckbox = document.getElementById('pickupCheckbox');
const deliveryCheckbox = document.getElementById('deliveryCheckbox');
const pickupAddressWrap = document.getElementById('pickupAddressWrap');
const deliveryAddressWrap = document.getElementById('deliveryAddressWrap');
const momoBtn = document.getElementById('momoBtn');

if (pickupCheckbox) {
  pickupCheckbox.addEventListener('change', () => {
    if (pickupAddressWrap) pickupAddressWrap.style.display = pickupCheckbox.checked ? 'block' : 'none';
    document.getElementById('pickupCard')?.classList.toggle('active', pickupCheckbox.checked);
  });
}

if (deliveryCheckbox) {
  deliveryCheckbox.addEventListener('change', () => {
    if (deliveryAddressWrap) deliveryAddressWrap.style.display = deliveryCheckbox.checked ? 'block' : 'none';
    document.getElementById('deliveryCard')?.classList.toggle('active', deliveryCheckbox.checked);
  });
}

document.querySelectorAll('input[name="paymentPaid"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (momoBtn) momoBtn.style.display = radio.value === 'transfer-paid' ? 'inline-flex' : 'none';
  });
});

if (momoBtn) momoBtn.addEventListener('click', () => showToast('Mã QR MoMo đã được khởi tạo'));

['globalSearch', 'filterDate', 'filterDirection', 'filterFrom', 'filterTo', 'filterStatus'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    if (id === 'filterDirection') {
      el.addEventListener('change', () => {
        updateDirectionFilterOptions();
        renderTable();
      });
    } else {
      el.addEventListener('input', renderTable);
      el.addEventListener('change', renderTable);
    }
  }
});

const applyFilterBtn = document.getElementById('applyFilterBtn');
if (applyFilterBtn) {
  applyFilterBtn.addEventListener('click', () => {
    renderTable();
    showToast('Đã áp dụng bộ lọc dữ liệu');
  });
}

statusOptions.forEach((input) => {
  input.addEventListener('change', () => {
    statusOptions.forEach(opt => opt.closest('.status-option')?.classList.remove('active'));
    input.closest('.status-option')?.classList.add('active');
    state.selectedCategory = input.value;
    localStorage.setItem(categoryStorageKey, input.value);
    renderTable();
    const labelText = input.closest('.status-option')?.textContent.trim();
    showToast(`Lọc phân loại: ${labelText}`);
  });
});

// Sync initial radio UI with state.selectedCategory
if (state.selectedCategory) {
  const targetInput = statusOptions.find(i => i.value === state.selectedCategory);
  if (targetInput) {
    statusOptions.forEach(opt => {
      opt.checked = false;
      opt.closest('.status-option')?.classList.remove('active');
    });
    targetInput.checked = true;
    targetInput.closest('.status-option')?.classList.add('active');
    targetInput.dispatchEvent(new Event('change'));
  }
}

function generateSVGBarcode(code) {
  return `
    <svg class="barcode-lines-svg" viewBox="0 0 220 50" preserveAspectRatio="none">
      <rect x="0" y="0" width="220" height="50" fill="#ffffff" />
      <rect x="10" y="0" width="3" height="50" fill="#000" />
      <rect x="16" y="0" width="2" height="50" fill="#000" />
      <rect x="22" y="0" width="5" height="50" fill="#000" />
      <rect x="30" y="0" width="2" height="50" fill="#000" />
      <rect x="35" y="0" width="4" height="50" fill="#000" />
      <rect x="42" y="0" width="2" height="50" fill="#000" />
      <rect x="48" y="0" width="6" height="50" fill="#000" />
      <rect x="57" y="0" width="2" height="50" fill="#000" />
      <rect x="62" y="0" width="4" height="50" fill="#000" />
      <rect x="70" y="0" width="3" height="50" fill="#000" />
      <rect x="76" y="0" width="5" height="50" fill="#000" />
      <rect x="84" y="0" width="2" height="50" fill="#000" />
      <rect x="90" y="0" width="4" height="50" fill="#000" />
      <rect x="98" y="0" width="2" height="50" fill="#000" />
      <rect x="104" y="0" width="6" height="50" fill="#000" />
      <rect x="114" y="0" width="3" height="50" fill="#000" />
      <rect x="120" y="0" width="2" height="50" fill="#000" />
      <rect x="126" y="0" width="5" height="50" fill="#000" />
      <rect x="134" y="0" width="2" height="50" fill="#000" />
      <rect x="140" y="0" width="4" height="50" fill="#000" />
      <rect x="148" y="0" width="2" height="50" fill="#000" />
      <rect x="154" y="0" width="6" height="50" fill="#000" />
      <rect x="163" y="0" width="2" height="50" fill="#000" />
      <rect x="168" y="0" width="4" height="50" fill="#000" />
      <rect x="176" y="0" width="3" height="50" fill="#000" />
      <rect x="182" y="0" width="5" height="50" fill="#000" />
      <rect x="190" y="0" width="2" height="50" fill="#000" />
      <rect x="196" y="0" width="4" height="50" fill="#000" />
      <rect x="204" y="0" width="3" height="50" fill="#000" />
    </svg>
  `;
}

function closeCargoStickerModal() {
  const cargoStickerModal = document.getElementById('cargoStickerModal');
  if (cargoStickerModal) cargoStickerModal.classList.remove('open');
  const printArea = document.getElementById('printableStickerArea');
  if (printArea) {
    printArea.style.display = 'none';
    printArea.innerHTML = '';
  }
}
window.closeCargoStickerModal = closeCargoStickerModal;

function openPrintStickerModal(cargoId) {
  const cargo = state.data.find(c => String(c.id) === String(cargoId));
  if (!cargo) return;

  state.manifests = loadManifests();
  const manifest = state.manifests.find(m => String(m.id) === String(cargo.manifestId));
  const printArea = document.getElementById('printableStickerArea');

  const htmlContent = `
    <div class="cargo-sticker-card printable-single-sticker-page">
      <div class="sticker-header">
        <div class="sticker-brand">
          <span>HUỆ NGHĨA EXPRESS</span>
        </div>
        <div class="sticker-code-badge">${cargo.code}</div>
      </div>

      <div class="sticker-barcode-wrap">
        ${generateSVGBarcode(cargo.code)}
        <div class="barcode-text">* ${cargo.code} *</div>
      </div>

      <div class="sticker-route-banner">
        ${manifest ? manifest.from : (cargo.stationFrom || 'Chưa gán')} ➔ ${manifest ? manifest.to : (cargo.stationTo || 'Chưa gán')}
      </div>

      <div class="sticker-grid">
        <div class="sticker-box">
          <span class="sticker-label">Tên hàng gửi</span>
          <div class="sticker-val"><strong>${(cargo.name || '').replace(/🧳/g, '').trim()}</strong></div>
        </div>
        <div class="sticker-box">
          <span class="sticker-label">Cước phí & Thanh toán</span>
          <div class="sticker-val">
            <strong>${Number(cargo.fee || 0).toLocaleString('vi-VN')}đ</strong>
            <small style="display:block; color:#059669; font-weight:700;">(Đã thanh toán)</small>
          </div>
        </div>
        <div class="sticker-box">
          <span class="sticker-label">Người gửi</span>
          <div class="sticker-val">
            <strong>${cargo.sender}</strong><br>
            ${cargo.senderPhone}
          </div>
        </div>
        <div class="sticker-box">
          <span class="sticker-label">Người nhận</span>
          <div class="sticker-val">
            <strong>${cargo.receiver}</strong><br>
            ${cargo.receiverPhone}
          </div>
        </div>
      </div>

      ${cargo.pickupAddress || cargo.deliveryAddress ? `
        <div class="sticker-box" style="margin-bottom:12px;">
          <span class="sticker-label">Địa chỉ dịch vụ</span>
          <div class="sticker-val">
            ${cargo.pickupAddress ? `Nhận: ${cargo.pickupAddress}<br>` : ''}
            ${cargo.deliveryAddress ? `Giao: ${cargo.deliveryAddress}` : ''}
          </div>
        </div>
      ` : ''}

      <div class="sticker-footer">
        <span>Phơi: <strong>${manifest ? manifest.name + ' (' + manifest.plate + ')' : 'Chưa gán phơi'}</strong></span>
        <span>In ngày: ${new Date().toLocaleDateString('vi-VN')}</span>
      </div>
    </div>
  `;

  const previewEl = document.getElementById('cargoStickerPreview');
  if (previewEl) previewEl.innerHTML = htmlContent;

  if (printArea) {
    printArea.innerHTML = htmlContent;
    printArea.style.display = 'none';
  }

  const cargoStickerModal = document.getElementById('cargoStickerModal');
  if (cargoStickerModal) cargoStickerModal.classList.add('open');
  
  showToast(`Đang in tem dán đơn hàng ${cargo.code}...`);
  setTimeout(() => {
    if (printArea) printArea.style.display = 'block';
    window.print();
    setTimeout(() => {
      closeCargoStickerModal();
    }, 400);
  }, 200);
}

const openCreateBundleBtn = document.getElementById('openCreateBundleBtn');
const newOrderBtn = document.getElementById('newOrderBtn');
const closeBundleModalBtn = document.getElementById('closeBundleModalBtn');
const cancelBundleBtn = document.getElementById('cancelBundleBtn');
const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
const cancelTransferBtn = document.getElementById('cancelTransferBtn');
const closeCargoDetailModalBtn = document.getElementById('closeCargoDetailModalBtn');
const closeCargoDetailBtn = document.getElementById('closeCargoDetailBtn');
const printDetailCargoBtn = document.getElementById('printDetailCargoBtn');
const editDetailCargoBtn = document.getElementById('editDetailCargoBtn');
const closeCargoStickerModalBtn = document.getElementById('closeCargoStickerModalBtn');
const cancelCargoStickerBtn = document.getElementById('cancelCargoStickerBtn');
const confirmPrintStickerBtn = document.getElementById('confirmPrintStickerBtn');
const filterBtn = document.getElementById('filterBtn');

if (openCreateBundleBtn) openCreateBundleBtn.addEventListener('click', () => openModal());
if (newOrderBtn) newOrderBtn.addEventListener('click', () => openModal());
if (closeBundleModalBtn) closeBundleModalBtn.addEventListener('click', closeModal);
if (cancelBundleBtn) cancelBundleBtn.addEventListener('click', closeModal);
if (closeTransferModalBtn) closeTransferModalBtn.addEventListener('click', closeTransferModal);
if (cancelTransferBtn) cancelTransferBtn.addEventListener('click', closeTransferModal);

const cargoPaymentStatusSelect = document.getElementById('cargoPaymentStatus');
const cargoPaidMethodSelect = document.getElementById('cargoPaidMethod');
const paidMethodWrap = document.getElementById('paidMethodWrap');
const transferCodeWrap = document.getElementById('transferCodeWrap');
const cargoTransferCodeInput = document.getElementById('cargoTransferCode');
const codAmountWrap = document.getElementById('codAmountWrap');

function updatePaymentVisibility() {
  const statusVal = cargoPaymentStatusSelect ? cargoPaymentStatusSelect.value : 'paid';
  const methodVal = cargoPaidMethodSelect ? cargoPaidMethodSelect.value : 'cash';

  if (paidMethodWrap) paidMethodWrap.style.display = statusVal === 'paid' ? 'flex' : 'none';
  if (codAmountWrap) codAmountWrap.style.display = statusVal === 'cod' ? 'flex' : 'none';
  
  const showTransfer = statusVal === 'paid' && methodVal === 'transfer';
  if (transferCodeWrap) transferCodeWrap.style.display = showTransfer ? 'flex' : 'none';
  if (showTransfer && cargoTransferCodeInput && !cargoTransferCodeInput.value) {
    cargoTransferCodeInput.value = `CK-${Math.floor(10000 + Math.random() * 90000)}`;
  }
}

if (cargoPaymentStatusSelect) cargoPaymentStatusSelect.addEventListener('change', updatePaymentVisibility);
if (cargoPaidMethodSelect) cargoPaidMethodSelect.addEventListener('change', updatePaymentVisibility);
const cargoManifestSelect = document.getElementById('cargoManifestSelect');
if (cargoManifestSelect) cargoManifestSelect.addEventListener('change', updateDisplayStations);

const cargoDirectionSelect = document.getElementById('cargoDirection');
if (cargoDirectionSelect) {
  cargoDirectionSelect.addEventListener('change', () => {
    const [from, to] = cargoDirectionSelect.value.split('|');
    const fromEl = document.getElementById('stationFrom');
    const toEl = document.getElementById('stationTo');
    if (fromEl) fromEl.value = from;
    if (toEl) toEl.value = to;
  });
}

const cargoUnitSelect = document.getElementById('cargoUnitSelect');
const cargoUnitCustomWrap = document.getElementById('cargoUnitCustomWrap');
const cargoUnitCustomInput = document.getElementById('cargoUnitCustom');

if (cargoUnitSelect) {
  cargoUnitSelect.addEventListener('change', () => {
    if (cargoUnitSelect.value === 'custom') {
      if (cargoUnitCustomWrap) cargoUnitCustomWrap.style.display = 'flex';
      if (cargoUnitCustomInput) cargoUnitCustomInput.focus();
    } else {
      if (cargoUnitCustomWrap) cargoUnitCustomWrap.style.display = 'none';
    }
  });
}

function convertNumberToVietnameseWords(num) {
  let str = String(num).replace(/\D/g, '');
  if (!str) return '';
  str = str.replace(/^0+/, '');
  if (!str) return 'không';

  const scales = ['', 'ngàn', 'triệu', 'tỷ', 'ngàn tỷ', 'triệu tỷ'];

  const groups = [];
  while (str.length > 0) {
    groups.push(str.slice(-Math.min(3, str.length)));
    str = str.slice(0, -Math.min(3, str.length));
  }

  const groupWords = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const groupStr = groups[i];
    const isLeadingGroup = (i === groups.length - 1);
    const groupVal = parseInt(groupStr, 10);

    if (groupVal === 0 && !isLeadingGroup) {
      continue;
    }

    const tripletText = readTripletWords(groupStr, isLeadingGroup);
    const scale = scales[i] || '';

    if (tripletText) {
      groupWords.push(tripletText + (scale ? ' ' + scale : ''));
    }
  }

  return groupWords.join(' ').trim();
}

function readTripletWords(str, isLeadingGroup) {
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const padded = str.padStart(3, '0');
  const d1 = parseInt(padded[0], 10);
  const d2 = parseInt(padded[1], 10);
  const d3 = parseInt(padded[2], 10);

  let result = '';

  if (d1 > 0) {
    result += units[d1] + ' trăm';
  } else if (!isLeadingGroup) {
    result += 'không trăm';
  }

  if (d2 > 1) {
    result += (result ? ' ' : '') + units[d2] + ' mươi';
    if (d3 === 1) {
      result += ' mốt';
    } else if (d3 === 4) {
      result += ' tư';
    } else if (d3 === 5) {
      result += ' lăm';
    } else if (d3 > 0) {
      result += ' ' + units[d3];
    }
  } else if (d2 === 1) {
    result += (result ? ' ' : '') + 'mười';
    if (d3 === 5) {
      result += ' lăm';
    } else if (d3 > 0) {
      result += ' ' + units[d3];
    }
  } else if (d2 === 0) {
    if (d3 > 0) {
      if (result) {
        result += ' lẻ ' + units[d3];
      } else {
        result += units[d3];
      }
    }
  }

  return result;
}

function syncMoneyToCargoName() {
  const catSelect = document.getElementById('cargoCategorySelect');
  const moneyInput = document.getElementById('cargoMoneyAmount');
  const cargoNameInput = document.getElementById('cargoName');

  if (!catSelect || !cargoNameInput) return;

  const cat = catSelect.value;
  if (cat !== 'cash' && cat !== 'hot' && cat !== 'partner_cash') return;

  const rawMoney = (moneyInput?.value || '').replace(/\D/g, '');
  if (rawMoney) {
    const words = convertNumberToVietnameseWords(rawMoney);
    if (words) {
      cargoNameInput.value = words + ' VNĐ';
    }
  } else {
    const defaultName = cat === 'hot' ? 'Gửi tiền nóng' : (cat === 'partner_cash' ? 'Bạn hàng gửi tiền thường' : 'Gửi tiền thường');
    cargoNameInput.value = defaultName + ' VNĐ';
  }
}

function updateCargoCategoryVisibility() {
  const catSelect = document.getElementById('cargoCategorySelect');
  const cargoQuantityWrap = document.getElementById('cargoQuantityWrap');
  const moneyAmountWrap = document.getElementById('moneyAmountWrap');
  const cargoUnitCustomWrap = document.getElementById('cargoUnitCustomWrap');
  const cargoNameInput = document.getElementById('cargoName');

  if (!catSelect) return;
  const cat = catSelect.value;
  const isMoney = cat === 'cash' || cat === 'hot' || cat === 'partner_cash';
  const isGoods = cat === 'goods';

  if (moneyAmountWrap) moneyAmountWrap.style.display = isMoney ? 'flex' : 'none';
  if (cargoQuantityWrap) cargoQuantityWrap.style.display = isMoney ? 'none' : 'flex';
  if (isMoney && cargoUnitCustomWrap) cargoUnitCustomWrap.style.display = 'none';

  const cargoDimensionsWrap = document.getElementById('cargoDimensionsWrap');
  if (cargoDimensionsWrap) cargoDimensionsWrap.style.display = isGoods ? 'block' : 'none';

  if (isMoney && cargoNameInput) {
    syncMoneyToCargoName();
  } else if (!isMoney && cargoNameInput && (cargoNameInput.value === 'Gửi tiền nóng' || cargoNameInput.value === 'Gửi tiền thường' || cargoNameInput.value === 'Bạn hàng gửi tiền thường')) {
    cargoNameInput.value = '';
  }

  const codFormSection = document.getElementById('codFormSection');
  if (codFormSection) codFormSection.style.display = isGoods ? '' : 'none';

  const deliveryCard = document.getElementById('deliveryCard');
  if (deliveryCard) deliveryCard.style.display = isGoods ? '' : 'none';

  if (!isGoods) {
    const dimensionsCheckbox = document.getElementById('dimensionsCheckbox');
    const dimensionsFieldsWrap = document.getElementById('dimensionsFieldsWrap');
    if (dimensionsCheckbox) dimensionsCheckbox.checked = false;
    if (dimensionsFieldsWrap) dimensionsFieldsWrap.style.display = 'none';
    if (document.getElementById('cargoLength')) document.getElementById('cargoLength').value = '';
    if (document.getElementById('cargoWidth')) document.getElementById('cargoWidth').value = '';
    if (document.getElementById('cargoHeight')) document.getElementById('cargoHeight').value = '';
    if (document.getElementById('cargoWeight')) document.getElementById('cargoWeight').value = '';

    const codInput = document.getElementById('cargoCodAmount');
    if (codInput) codInput.value = '';
    const codCheckbox = document.getElementById('codCheckbox');
    const codAmountFieldWrap = document.getElementById('codAmountFieldWrap');
    if (codCheckbox) codCheckbox.checked = false;
    if (codAmountFieldWrap) codAmountFieldWrap.style.display = 'none';

    const deliveryCheckbox = document.getElementById('deliveryCheckbox');
    const deliveryAddressWrap = document.getElementById('deliveryAddressWrap');
    const deliveryAddressInput = document.getElementById('deliveryAddress');
    if (deliveryCheckbox) deliveryCheckbox.checked = false;
    if (deliveryAddressWrap) deliveryAddressWrap.style.display = 'none';
    if (deliveryAddressInput) deliveryAddressInput.value = '';
    deliveryCard?.classList.remove('active');
  }
}

if (cargoCategorySelect) {
  cargoCategorySelect.addEventListener('change', updateCargoCategoryVisibility);
}

function attachMoneyFieldFormatter(el) {
  if (!el) return;
  let isComposing = false;

  function formatMoneyField() {
    if (isComposing) return;
    const cursorPos = el.selectionStart || 0;
    const oldVal = el.value;

    let raw = oldVal.replace(/\D/g, '');
    if (!raw) {
      if (el.value !== '') el.value = '';
      return;
    }

    raw = raw.replace(/^0+(?=\d)/, '');
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (oldVal === formatted) return;

    const digitsBeforeCursor = oldVal.slice(0, cursorPos).replace(/\D/g, '').length;
    el.value = formatted;

    let newCursorPos = 0;
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitCount++;
      }
      newCursorPos = i + 1;
      if (digitCount >= digitsBeforeCursor) {
        break;
      }
    }

    try {
      el.setSelectionRange(newCursorPos, newCursorPos);
    } catch (err) {}
  }

  el.addEventListener('compositionstart', () => { isComposing = true; });
  el.addEventListener('compositionend', () => {
    isComposing = false;
    formatMoneyField();
    if (el.id === 'cargoMoneyAmount') {
      syncMoneyToCargoName();
    }
  });
  el.addEventListener('input', () => {
    formatMoneyField();
    if (el.id === 'cargoMoneyAmount') {
      syncMoneyToCargoName();
    }
  });
}

attachMoneyFieldFormatter(document.getElementById('cargoMoneyAmount'));

const codCheckboxEl = document.getElementById('codCheckbox');
if (codCheckboxEl) {
  codCheckboxEl.addEventListener('change', () => {
    const codAmountFieldWrap = document.getElementById('codAmountFieldWrap');
    const codInput = document.getElementById('cargoCodAmount');
    if (codAmountFieldWrap) codAmountFieldWrap.style.display = codCheckboxEl.checked ? 'flex' : 'none';
    if (!codCheckboxEl.checked && codInput) codInput.value = '';
    if (codCheckboxEl.checked && codInput) codInput.focus();
  });
}

const dimensionsCheckboxEl = document.getElementById('dimensionsCheckbox');
if (dimensionsCheckboxEl) {
  dimensionsCheckboxEl.addEventListener('change', () => {
    const dimensionsFieldsWrap = document.getElementById('dimensionsFieldsWrap');
    if (dimensionsFieldsWrap) dimensionsFieldsWrap.style.display = dimensionsCheckboxEl.checked ? 'block' : 'none';
    if (!dimensionsCheckboxEl.checked) {
      if (document.getElementById('cargoLength')) document.getElementById('cargoLength').value = '';
      if (document.getElementById('cargoWidth')) document.getElementById('cargoWidth').value = '';
      if (document.getElementById('cargoHeight')) document.getElementById('cargoHeight').value = '';
      if (document.getElementById('cargoWeight')) document.getElementById('cargoWeight').value = '';
    }
  });
}

const qrPaymentModal = document.getElementById('qrPaymentModal');
const showQrBtn = document.getElementById('showQrBtn');
const closeQrModalTopBtn = document.getElementById('closeQrModalTopBtn');
const closeQrModalBtn2 = document.getElementById('closeQrModalBtn2');
const copyQrCodeBtn = document.getElementById('copyQrCodeBtn');

function openQrPaymentModal() {
  if (!qrPaymentModal) return;
  const rawFee = document.getElementById('cargoFee')?.value;
  const feeVal = parseFeeInput(rawFee, 150000);
  const codeVal = document.getElementById('cargoTransferCode')?.value || 'CK-98214';

  const amountEl = document.getElementById('qrAmountDisplay');
  const codeEl = document.getElementById('qrCodeDisplay');

  if (amountEl) amountEl.textContent = `${Number(feeVal).toLocaleString('vi-VN')}đ`;
  if (codeEl) codeEl.textContent = codeVal;

  qrPaymentModal.classList.add('open');
}

if (showQrBtn) showQrBtn.addEventListener('click', openQrPaymentModal);
if (closeQrModalTopBtn) closeQrModalTopBtn.addEventListener('click', () => qrPaymentModal.classList.remove('open'));
if (closeQrModalBtn2) closeQrModalBtn2.addEventListener('click', () => qrPaymentModal.classList.remove('open'));
if (copyQrCodeBtn) {
  copyQrCodeBtn.addEventListener('click', () => {
    const codeVal = document.getElementById('qrCodeDisplay')?.textContent || '';
    const feeVal = document.getElementById('qrAmountDisplay')?.textContent || '';
    const textToCopy = `Huệ Nghĩa Express: ${feeVal} - Nội dung CK: ${codeVal}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
    showToast('Đã sao chép nội dung chuyển khoản!');
  });
}

const pickupCheckboxEl = document.getElementById('pickupCheckbox');
const pickupAddressWrapEl = document.getElementById('pickupAddressWrap');
const pickupPaymentMethodSelect = document.getElementById('pickupPaymentMethod');
const pickupCashWrap = document.getElementById('pickupCashWrap');
const pickupTransferWrap = document.getElementById('pickupTransferWrap');
const pickupTransferCodeInput = document.getElementById('pickupTransferCode');
const pickupQrBtn = document.getElementById('pickupQrBtn');

if (pickupCheckboxEl) {
  pickupCheckboxEl.addEventListener('change', () => {
    if (pickupAddressWrapEl) pickupAddressWrapEl.style.display = pickupCheckboxEl.checked ? 'block' : 'none';
    document.getElementById('pickupCard')?.classList.toggle('active', pickupCheckboxEl.checked);
  });
}

function updatePickupPaymentVisibility() {
  const method = pickupPaymentMethodSelect?.value;
  const isTransfer = method === 'transfer';
  const isFree = method === 'free';
  if (pickupCashWrap) pickupCashWrap.style.display = (isTransfer || isFree) ? 'none' : 'block';
  if (pickupTransferWrap) pickupTransferWrap.style.display = isTransfer ? 'block' : 'none';
  if (isTransfer && pickupTransferCodeInput && !pickupTransferCodeInput.value) {
    pickupTransferCodeInput.value = `CK-${Math.floor(10000 + Math.random() * 90000)}`;
  }
}
if (pickupPaymentMethodSelect) pickupPaymentMethodSelect.addEventListener('change', updatePickupPaymentVisibility);

if (pickupQrBtn) {
  pickupQrBtn.addEventListener('click', () => {
    const feeVal = document.getElementById('pickupFee')?.value || '30000';
    const codeVal = pickupTransferCodeInput?.value || 'CK-38291';
    openCustomQrModal(feeVal, codeVal);
  });
}

const deliveryCheckboxEl = document.getElementById('deliveryCheckbox');
const deliveryAddressWrapEl = document.getElementById('deliveryAddressWrap');
const deliveryPaymentMethodSelect = document.getElementById('deliveryPaymentMethod');
const deliveryCashWrap = document.getElementById('deliveryCashWrap');
const deliveryTransferWrap = document.getElementById('deliveryTransferWrap');
const deliveryTransferCodeInput = document.getElementById('deliveryTransferCode');
const deliveryQrBtn = document.getElementById('deliveryQrBtn');

if (deliveryCheckboxEl) {
  deliveryCheckboxEl.addEventListener('change', () => {
    if (deliveryAddressWrapEl) deliveryAddressWrapEl.style.display = deliveryCheckboxEl.checked ? 'block' : 'none';
    document.getElementById('deliveryCard')?.classList.toggle('active', deliveryCheckboxEl.checked);
  });
}

function updateDeliveryPaymentVisibility() {
  const method = deliveryPaymentMethodSelect?.value;
  const isTransfer = method === 'transfer';
  const isFree = method === 'free';
  if (deliveryCashWrap) deliveryCashWrap.style.display = (isTransfer || isFree) ? 'none' : 'block';
  if (deliveryTransferWrap) deliveryTransferWrap.style.display = isTransfer ? 'block' : 'none';
  if (isTransfer && deliveryTransferCodeInput && !deliveryTransferCodeInput.value) {
    deliveryTransferCodeInput.value = `CK-${Math.floor(10000 + Math.random() * 90000)}`;
  }
}
if (deliveryPaymentMethodSelect) deliveryPaymentMethodSelect.addEventListener('change', updateDeliveryPaymentVisibility);

if (deliveryQrBtn) {
  deliveryQrBtn.addEventListener('click', () => {
    const feeVal = document.getElementById('deliveryFee')?.value || '30000';
    const codeVal = deliveryTransferCodeInput?.value || 'CK-74812';
    openCustomQrModal(feeVal, codeVal);
  });
}

function openCustomQrModal(feeVal, codeVal) {
  if (!qrPaymentModal) return;
  const amountEl = document.getElementById('qrAmountDisplay');
  const codeEl = document.getElementById('qrCodeDisplay');

  if (amountEl) amountEl.textContent = `${Number(feeVal).toLocaleString('vi-VN')}đ`;
  if (codeEl) codeEl.textContent = codeVal;

  qrPaymentModal.classList.add('open');
}

if (closeCargoDetailModalBtn) closeCargoDetailModalBtn.addEventListener('click', () => cargoDetailModal.classList.remove('open'));
if (closeCargoDetailBtn) closeCargoDetailBtn.addEventListener('click', () => cargoDetailModal.classList.remove('open'));
if (printDetailCargoBtn) printDetailCargoBtn.addEventListener('click', () => {
  if (currentDetailCargoId) openPrintStickerModal(currentDetailCargoId);
});
if (editDetailCargoBtn) editDetailCargoBtn.addEventListener('click', () => {
  cargoDetailModal.classList.remove('open');
  if (currentDetailCargoId) openModal(currentDetailCargoId);
});
const transferDetailCargoBtn = document.getElementById('transferDetailCargoBtn');
if (transferDetailCargoBtn) transferDetailCargoBtn.addEventListener('click', () => {
  cargoDetailModal.classList.remove('open');
  if (currentDetailCargoId) openTransferModal([currentDetailCargoId]);
});

const cargoStickerModal = document.getElementById('cargoStickerModal');
if (closeCargoStickerModalBtn) closeCargoStickerModalBtn.addEventListener('click', closeCargoStickerModal);
if (cancelCargoStickerBtn) cancelCargoStickerBtn.addEventListener('click', closeCargoStickerModal);
if (confirmPrintStickerBtn) confirmPrintStickerBtn.addEventListener('click', () => {
  showToast('Đang khởi chạy hộp thoại in tem...');
  const printArea = document.getElementById('printableStickerArea');
  if (printArea) printArea.style.display = 'block';
  window.print();
  setTimeout(closeCargoStickerModal, 400);
});
window.addEventListener('afterprint', closeCargoStickerModal);



if (filterBtn) filterBtn.addEventListener('click', () => showToast('Đã áp dụng bộ lọc'));

if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener('change', () => {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    updateBatchTransferButton();
  });
}

if (batchTransferBtn) {
  batchTransferBtn.addEventListener('click', () => {
    const checkedBoxes = Array.from(document.querySelectorAll('.row-checkbox:checked'));
    const ids = checkedBoxes.map(cb => Number(cb.dataset.id));
    if (ids.length) {
      openTransferModal(ids);
    }
  });
}

const batchPrintCargoStickersBtn = document.getElementById('batchPrintCargoStickersBtn');
if (batchPrintCargoStickersBtn) {
  batchPrintCargoStickersBtn.addEventListener('click', () => {
    const checkedBoxes = Array.from(document.querySelectorAll('.row-checkbox:checked'));
    const ids = checkedBoxes.map(cb => Number(cb.dataset.id));
    if (!ids.length) return;

    const selectedCargos = state.data.filter(c => ids.includes(c.id));
    state.manifests = loadManifests();
    const printArea = document.getElementById('printableStickerArea');
    printArea.style.display = 'block';
    printArea.innerHTML = `
      <div class="batch-stickers-container">
        ${selectedCargos.map((cargo) => {
          const manifest = state.manifests.find(m => m.id === Number(cargo.manifestId));
          return `
            <div class="printable-single-sticker-page" style="page-break-after: always; break-after: page; page-break-inside: avoid; border:2px solid #000; border-radius:10px; padding:12px; background:white; width:380px; max-width:100%; margin:0 auto 20px auto; font-family:sans-serif;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:8px;">
                <strong style="color:#e53935; font-size:14px;">HUỆ NGHĨA EXPRESS</strong>
                <span style="font-family:monospace; font-size:15px; font-weight:800; background:#f1f5f9; padding:2px 8px; border-radius:4px;">${cargo.code}</span>
              </div>
              
              <div style="text-align:center; background:#fafafa; border:1px dashed #cbd5e1; border-radius:6px; padding:6px; margin-bottom:8px;">
                ${generateSVGBarcode(cargo.code)}
                <div style="font-family:monospace; font-weight:800; font-size:12.5px; letter-spacing:0.2em;">* ${cargo.code} *</div>
              </div>

              <div style="background:#1e293b; color:white; padding:5px; border-radius:6px; text-align:center; font-weight:800; font-size:14px; margin-bottom:8px;">
                ${cargo.stationFrom} ➔ ${cargo.stationTo}
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:11.5px; margin-bottom:8px;">
                <div style="border:1px solid #e2e8f0; padding:5px; border-radius:6px; background:#f8fafc;">
                  <small style="color:#64748b; font-weight:800; display:block;">HÀNG HÓA & SL</small>
                  <strong>${cargo.name}</strong> <small style="color:#1d4ed8; font-weight:700;">(${isMoneyCargo(cargo) ? formatCargoQuantity(cargo) : 'x' + formatCargoQuantity(cargo)})</small>
                </div>
                <div style="border:1px solid #e2e8f0; padding:5px; border-radius:6px; background:#f8fafc;">
                  <small style="color:#64748b; font-weight:800; display:block;">CƯỚC PHÍ</small>
                  <strong>${Number(cargo.fee || 0).toLocaleString('vi-VN')}đ</strong>
                </div>
                <div style="border:1px solid #e2e8f0; padding:5px; border-radius:6px; background:#f8fafc;">
                  <small style="color:#64748b; font-weight:800; display:block;">GỬI</small>
                  <strong>${cargo.sender}</strong> (${cargo.senderPhone})
                </div>
                <div style="border:1px solid #e2e8f0; padding:5px; border-radius:6px; background:#f8fafc;">
                  <small style="color:#64748b; font-weight:800; display:block;">NHẬN</small>
                  <strong>${cargo.receiver}</strong> (${cargo.receiverPhone})
                </div>
              </div>

              ${cargo.pickupAddress || cargo.deliveryAddress ? `
                <div style="border:1px solid #e2e8f0; padding:5px; border-radius:6px; background:#f8fafc; font-size:11px; margin-bottom:8px;">
                  ${cargo.pickupAddress ? `Nhận: ${cargo.pickupAddress}<br>` : ''}
                  ${cargo.deliveryAddress ? `Giao: ${cargo.deliveryAddress}` : ''}
                </div>
              ` : ''}

              <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#475569; border-top:1.5px solid #000; padding-top:5px;">
                <span>Phơi: <strong>${manifest ? manifest.name + ' (' + manifest.plate + ')' : 'Chưa gán phơi'}</strong></span>
                <span>In ngày: ${new Date().toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    showToast(`Đang in ${ids.length} tem dán được chọn...`);
    setTimeout(() => {
      window.print();
    }, 200);
  });
}

window.updateCargoStatusFromTable = function(id, newStatus) {
  const target = state.data.find(row => String(row.id) === String(id));
  if (target) {
    if (target.manifestId != null && !window.location.pathname.includes('delivery.html')) {
      alert('🔒 Đơn hàng đã được xếp vào phơi xe và ở trạng thái "Đã chuyển", không thể thay đổi!');
      renderTable();
      return;
    }
    target.status = newStatus;
    if (window.location.pathname.includes('delivery.html')) {
      if (newStatus === 'undelivered') target.statusText = 'Chưa giao';
      else if (newStatus === 'delivered') target.statusText = 'Đã giao';
    } else {
      if (newStatus === 'pending') target.statusText = 'Chưa chuyển';
      else if (newStatus === 'in-transit') target.statusText = 'Đã chuyển';
    }

    saveCargos(state.data);
    showToast(`Đã chuyển trạng thái sang "${target.statusText}"`);
  }
};

// Menu "Thêm" (⋮) gộp các hành động phụ (Biên lai/In tem) để bớt icon nổi cùng lúc trên mỗi dòng.
window.closeAllRowActionMenus = function() {
  document.querySelectorAll('.action-more-menu.open').forEach(m => m.classList.remove('open'));
};
window.toggleRowActionMenu = function(event, id) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('actionMenu-' + id);
  const wasOpen = menu && menu.classList.contains('open');
  window.closeAllRowActionMenus();
  if (menu && !wasOpen) menu.classList.add('open');
};
document.addEventListener('click', () => window.closeAllRowActionMenus());

window.handleCargoRowAction = function(event, id, action) {
  if (event) {
    event.stopPropagation();
  }
  if (action === 'detail') {
    openCargoDetailModal(id);
  } else if (action === 'print') {
    openPrintStickerModal(id);
  } else if (action === 'transfer') {
    openTransferModal([id]);
  } else if (action === 'edit') {
    const cargo = state.data.find(c => String(c.id) === String(id));
    if (cargo && (cargo.cargoCategory === 'baga' || cargo.baga || state.selectedCategory === 'baga')) {
      openStandaloneBagaModal(id);
    } else {
      openModal(id);
    }
  } else if (action === 'delete') {
    openDeleteCargoModal(id);
  }
};

if (cargoTableBody) {
  cargoTableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('row-checkbox')) {
      updateBatchTransferButton();
    }
  });

  cargoTableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;

    if (action === 'detail') {
      openCargoDetailModal(id);
    } else if (action === 'print') {
      openPrintStickerModal(id);
    } else if (action === 'transfer') {
      openTransferModal([id]);
    } else if (action === 'edit') {
      openModal(id);
    } else if (action === 'delete') {
      openDeleteCargoModal(id);
    }
  });
}

function initCargoPageStations() {
  if (window.HueNghiaStations) {
    const filterFrom = document.getElementById('filterFrom');
    const filterTo = document.getElementById('filterTo');
    if (filterFrom) window.HueNghiaStations.populateStationDropdowns(filterFrom, 'all', true, 'Tất cả trạm gửi');
    if (filterTo) window.HueNghiaStations.populateStationDropdowns(filterTo, 'all', true, 'Tất cả trạm nhận');
  }
}
initCargoPageStations();

// Sync initial radio UI right before initial renderTable
if (state.selectedCategory) {
  const activeRadioInput = statusOptions.find(i => i.value === state.selectedCategory);
  if (activeRadioInput) {
    statusOptions.forEach(opt => opt.closest('.status-option')?.classList.remove('active'));
    activeRadioInput.checked = true;
    activeRadioInput.closest('.status-option')?.classList.add('active');
  }
}

renderTable();

const editIdParam = urlParams.get('editId');
if (editIdParam) {
  openModal(editIdParam);
}

// Global modal exit handlers: Backdrop click & Escape key
document.querySelectorAll('.modal-backdrop').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach((overlay) => {
      overlay.classList.remove('open');
    });
  }
});

// --- Xử lý Xóa hàng hóa (Yêu cầu nhập lý do) & Lịch sử xóa ---
let pendingDeleteCargoId = null;

function getDeletionHistory() {
  try {
    return JSON.parse(localStorage.getItem('cargo_deletion_history')) || [];
  } catch (e) {
    return [];
  }
}

function saveDeletionHistory(list) {
  try {
    localStorage.setItem('cargo_deletion_history', JSON.stringify(list));
  } catch (e) {}
}

function openDeleteCargoModal(id) {
  const item = state.data.find(row => String(row.id) === String(id));
  if (!item) return;

  pendingDeleteCargoId = id;
  const targetInfoEl = document.getElementById('deleteCargoTargetInfo');
  const reasonInput = document.getElementById('deleteReasonInput');
  const errorEl = document.getElementById('deleteReasonError');
  const modal = document.getElementById('deleteCargoModal');

  if (reasonInput) reasonInput.value = '';
  if (errorEl) errorEl.style.display = 'none';

  if (targetInfoEl) {
    const feeDisplay = item.fee ? Number(item.fee).toLocaleString('vi-VN') + 'đ' : '0đ';
    const codDisplay = item.codAmount ? Number(item.codAmount).toLocaleString('vi-VN') + 'đ' : '0đ';
    targetInfoEl.innerHTML = `
      <div style="font-weight:800; color:#0f172a; font-size:14px; margin-bottom:4px;">
        ${item.name} <code style="background:#e2e8f0; padding:1px 6px; border-radius:4px; font-family:monospace;">${item.code || ''}</code>
      </div>
      <div>Người gửi: <strong>${item.sender || 'Chưa có'}</strong> (${item.senderPhone || ''})</div>
      <div>Người nhận: <strong>${item.receiver || 'Chưa có'}</strong> (${item.receiverPhone || ''})</div>
      <div style="margin-top:4px; font-weight:700; color:#0f172a;">
        Phí cước: ${feeDisplay} ${item.codAmount > 0 ? `| COD: ${codDisplay}` : ''}
      </div>
    `;
  }

  if (modal) modal.classList.add('open');
}

function closeDeleteCargoModal() {
  pendingDeleteCargoId = null;
  const modal = document.getElementById('deleteCargoModal');
  if (modal) modal.classList.remove('open');
}

function confirmDeleteCargo() {
  if (!pendingDeleteCargoId) return;

  const reasonInput = document.getElementById('deleteReasonInput');
  const errorEl = document.getElementById('deleteReasonError');
  const reason = reasonInput ? reasonInput.value.trim() : '';

  if (!reason) {
    if (errorEl) errorEl.style.display = 'block';
    if (reasonInput) reasonInput.focus();
    return;
  }
  if (errorEl) errorEl.style.display = 'none';

  const item = state.data.find(row => String(row.id) === String(pendingDeleteCargoId));
  if (item) {
    const historyList = getDeletionHistory();
    const historyEntry = {
      id: Date.now(),
      cargoId: item.id,
      code: item.code || '',
      name: item.name || '',
      sender: item.sender || '',
      senderPhone: item.senderPhone || '',
      receiver: item.receiver || '',
      receiverPhone: item.receiverPhone || '',
      fee: item.fee || 0,
      codAmount: item.codAmount || 0,
      stationFrom: item.stationFrom || '',
      stationTo: item.stationTo || '',
      reason: reason,
      deletedAt: `${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'})}`,
      deletedBy: item.staff || 'Nhân viên nhập'
    };
    historyList.unshift(historyEntry);
    saveDeletionHistory(historyList);

    state.data = state.data.filter(row => String(row.id) !== String(pendingDeleteCargoId));
    saveCargos(state.data);
    renderTable();
    showToast('Đã xóa hàng hóa và lưu lịch sử lý do xóa');
  }

  closeDeleteCargoModal();
}

function openDeletionHistoryModal() {
  renderDeletionHistory();
  const modal = document.getElementById('deletionHistoryModal');
  if (modal) modal.classList.add('open');
}

function closeDeletionHistoryModal() {
  const modal = document.getElementById('deletionHistoryModal');
  if (modal) modal.classList.remove('open');
}

function renderDeletionHistory() {
  const container = document.getElementById('deletionHistoryList');
  if (!container) return;

  const history = getDeletionHistory();
  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; text-align:center; padding:40px 10px; color:#64748b;">
        <span style="font-size:32px; display:block; margin-bottom:8px;">📭</span>
        <strong style="font-size:14px;">Chưa có lịch sử xóa hàng hóa nào</strong>
      </div>
    `;
    return;
  }

  let html = `
    <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; width:100%; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="padding:10px 14px; background:#f8fafc; border-bottom:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:13px; color:#0f172a; font-weight:700;">Danh sách hàng hóa đã xóa (${history.length} món hàng)</strong>
      </div>

      <table style="min-width:0 !important; width:100% !important; border-collapse:collapse; font-size:12px; table-layout:fixed !important; text-align:left;">
        <thead>
          <tr style="background:#f8fafc; border-bottom:1px solid #cbd5e1; color:#475569; font-size:11px; text-transform:uppercase; letter-spacing:0.4px;">
            <th style="padding:9px 10px; width:18%; font-weight:700; white-space:normal !important;">MÃ / TÊN HÀNG</th>
            <th style="padding:9px 10px; width:28%; font-weight:700; white-space:normal !important;">NGƯỜI GỬI ➔ NGƯỜI NHẬN</th>
            <th style="padding:9px 10px; width:16%; font-weight:700; white-space:normal !important;">PHÍ CƯỚC / COD</th>
            <th style="padding:9px 10px; width:20%; font-weight:700; white-space:normal !important;">LÝ DO XÓA HÀNG</th>
            <th style="padding:9px 10px; width:18%; font-weight:700; white-space:normal !important;">THỜI GIAN - NV XÓA</th>
          </tr>
        </thead>
        <tbody>
  `;

  history.forEach(item => {
    const feeStr = Number(item.fee || 0).toLocaleString('vi-VN') + 'đ';
    const codStr = item.codAmount > 0 ? Number(item.codAmount).toLocaleString('vi-VN') + 'đ' : '';

    html += `
      <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
        <td style="padding:8px 12px; word-break:break-word;">
          <strong style="color:#0f172a; display:block; font-size:12px; margin-bottom:2px;">${item.name}</strong>
          <code style="font-size:10.5px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569; font-family:monospace; border:1px solid #e2e8f0;">${item.code}</code>
        </td>
        <td style="padding:8px 12px; word-break:break-word;">
          <div style="font-weight:600; color:#1e293b;">${item.sender} <span style="color:#64748b; font-weight:400;">(${item.senderPhone})</span></div>
          <div style="color:#64748b; font-size:11px; margin-top:2px;">➔ ${item.receiver} <span style="color:#94a3b8;">(${item.receiverPhone})</span></div>
        </td>
        <td style="padding:8px 12px;">
          <div style="font-weight:700; color:#dc2626; font-size:12.5px;">${feeStr}</div>
          ${codStr ? `<div style="font-weight:700; color:#7c3aed; font-size:11px; margin-top:2px;">COD: ${codStr}</div>` : ''}
        </td>
        <td style="padding:8px 12px; word-break:break-word;">
          <div style="display:inline-block; max-width:100%; background:#fff1f2; color:#be123c; border:1px solid #fecdd3; padding:3px 8px; border-radius:5px; font-weight:600; font-size:11.5px; line-height:1.4;">
            ${item.reason}
          </div>
        </td>
        <td style="padding:8px 12px; color:#64748b; font-size:11px;">
          <div style="color:#334155; font-weight:500;">${item.deletedAt}</div>
          <div style="font-weight:700; color:#475569; margin-top:2px;">${item.deletedBy}</div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// Bind modal listeners
const closeDeleteCargoModalBtn = document.getElementById('closeDeleteCargoModalBtn');
const cancelDeleteCargoBtn = document.getElementById('cancelDeleteCargoBtn');
const confirmDeleteCargoBtn = document.getElementById('confirmDeleteCargoBtn');

if (closeDeleteCargoModalBtn) closeDeleteCargoModalBtn.addEventListener('click', closeDeleteCargoModal);
if (cancelDeleteCargoBtn) cancelDeleteCargoBtn.addEventListener('click', closeDeleteCargoModal);
if (confirmDeleteCargoBtn) confirmDeleteCargoBtn.addEventListener('click', confirmDeleteCargo);

const deleteHistoryBtn = document.getElementById('deleteHistoryBtn');
const closeDeletionHistoryModalBtn = document.getElementById('closeDeletionHistoryModalBtn');
const closeDeletionHistoryModalBtn2 = document.getElementById('closeDeletionHistoryModalBtn2');
const clearDeletionHistoryBtn = document.getElementById('clearDeletionHistoryBtn');

if (deleteHistoryBtn) deleteHistoryBtn.addEventListener('click', openDeletionHistoryModal);
if (closeDeletionHistoryModalBtn) closeDeletionHistoryModalBtn.addEventListener('click', closeDeletionHistoryModal);
if (closeDeletionHistoryModalBtn2) closeDeletionHistoryModalBtn2.addEventListener('click', closeDeletionHistoryModal);
if (clearDeletionHistoryBtn) {
  clearDeletionHistoryBtn.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xóa hàng hóa không?')) {
      saveDeletionHistory([]);
      renderDeletionHistory();
    }
  });
}

// --- Xử lý Baga xe khách (Tạo mới Baga & Gắn Baga vào đơn hàng) ---
let currentBagaCargoId = null;

const hasBagaCheckbox = document.getElementById('hasBagaCheckbox');
const bagaDetailFields = document.getElementById('bagaDetailFields');

if (hasBagaCheckbox) {
  hasBagaCheckbox.addEventListener('change', () => {
    if (bagaDetailFields) bagaDetailFields.style.display = hasBagaCheckbox.checked ? 'block' : 'none';
    if (hasBagaCheckbox.checked) {
      const codeInput = document.getElementById('cargoBagaCode');
      if (codeInput && !codeInput.value) generateCargoBagaCode();
    }
  });
}

function generateRandomBagaCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

window.generateCargoBagaCode = function() {
  const input = document.getElementById('cargoBagaCode');
  if (input) input.value = generateRandomBagaCode();
};

window.generateBagaCode = function() {
  const input = document.getElementById('bagaCode');
  if (input) input.value = generateRandomBagaCode();
};

function openStandaloneBagaModal(cargoId = null) {
  currentBagaCargoId = cargoId;
  const modal = document.getElementById('bagaModal');
  if (!modal) return;

  const cargos = loadCargos();
  const cargo = cargos.find(c => String(c.id) === String(cargoId));

  const nameInput = document.getElementById('bagaCargoName');
  const phoneInput = document.getElementById('bagaPhone');
  const nameUser = document.getElementById('bagaFullName');
  const addressInput = document.getElementById('bagaAddress');
  const feeInput = document.getElementById('bagaFee');
  const noteInput = document.getElementById('bagaNote');
  const payMethodInput = document.getElementById('bagaPayMethod');
  const stationFromSelect = document.getElementById('bagaStationFrom');
  const stationToSelect = document.getElementById('bagaStationTo');

  if (cargo) {
    if (nameInput) nameInput.value = (cargo.baga && cargo.baga.name) ? cargo.baga.name : (cargo.name || '').replace(/^Baga:\s*/i, '');
    if (phoneInput) phoneInput.value = cargo.senderPhone || cargo.receiverPhone || '';
    if (nameUser) nameUser.value = cargo.sender || cargo.receiver || '';
    if (addressInput) addressInput.value = cargo.pickupAddress || '';
    if (feeInput) {
      feeInput.value = (cargo.baga && cargo.baga.fee) ? cargo.baga.fee : (cargo.fee ? Number(cargo.fee).toLocaleString('vi-VN') : '50.000');
      feeInput.disabled = true;
      feeInput.style.background = '#f1f5f9';
      feeInput.style.cursor = 'not-allowed';
      feeInput.title = '🔒 Cước phí không được chỉnh sửa khi cập nhật';
    }
    if (noteInput) noteInput.value = (cargo.baga && cargo.baga.note) ? cargo.baga.note : cargo.note || '';
    if (payMethodInput) payMethodInput.value = cargo.paidMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt';
    if (stationFromSelect && cargo.stationFrom) stationFromSelect.value = cargo.stationFrom;
    if (stationToSelect && cargo.stationTo) stationToSelect.value = cargo.stationTo;
  } else {
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (nameUser) nameUser.value = '';
    if (addressInput) addressInput.value = '';
    if (feeInput) {
      feeInput.value = '50.000';
      feeInput.disabled = false;
      feeInput.style.background = 'white';
      feeInput.style.cursor = 'text';
      feeInput.title = '';
    }
    if (noteInput) noteInput.value = '';
    if (payMethodInput) payMethodInput.value = 'Tiền mặt';
    if (stationFromSelect) stationFromSelect.value = 'Sài Gòn';
    if (stationToSelect) stationToSelect.value = 'Tiền Giang';
  }

  modal.classList.add('open');
}
window.openStandaloneBagaModal = openStandaloneBagaModal;

window.closeBagaModal = function() {
  const modal = document.getElementById('bagaModal');
  if (modal) modal.classList.remove('open');
};

window.confirmBagaPayment = function() {
  const name = document.getElementById('bagaCargoName')?.value || 'Baga gửi kèm';
  const phone = document.getElementById('bagaPhone')?.value || '0901111111';
  const fullName = document.getElementById('bagaFullName')?.value || 'Khách gửi Baga';
  const address = document.getElementById('bagaAddress')?.value || '';
  const feeRaw = document.getElementById('bagaFee')?.value || '50.000';
  const feeNum = parseFloat(String(feeRaw).replace(/\./g, '').replace(/,/g, '')) || 50000;
  const payMethod = document.getElementById('bagaPayMethod')?.value || 'Tiền mặt';
  const note = document.getElementById('bagaNote')?.value || '';
  const stationFrom = document.getElementById('bagaStationFrom')?.value || 'Sài Gòn';
  const stationTo = document.getElementById('bagaStationTo')?.value || 'Tiền Giang';

  const code = generateRandomBagaCode();
  const bagaData = {
    code: code,
    fee: feeRaw,
    name: name,
    payMethod: payMethod,
    note: note,
    stationFrom: stationFrom,
    stationTo: stationTo,
    createdAt: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})
  };

  const cargos = loadCargos();
  if (currentBagaCargoId) {
    const cargo = cargos.find(c => String(c.id) === String(currentBagaCargoId));
    if (cargo) {
      cargo.name = `Baga: ${name}`;
      cargo.sender = fullName;
      cargo.senderPhone = phone;
      cargo.receiverPhone = phone;
      cargo.pickupAddress = address;
      cargo.stationFrom = stationFrom;
      cargo.stationTo = stationTo;
      cargo.note = note;
      cargo.paidMethod = payMethod === 'Chuyển khoản' ? 'transfer' : 'cash';
      if (cargo.baga) {
        cargo.baga.name = name;
        cargo.baga.payMethod = payMethod;
        cargo.baga.note = note;
        cargo.baga.stationFrom = stationFrom;
        cargo.baga.stationTo = stationTo;
      } else {
        cargo.baga = bagaData;
      }
      saveCargos(cargos);
      showToast(`🎉 Đã cập nhật thông tin Baga (${cargo.code || code}) thành công!`);
    }
  } else {
    const newCargo = {
      id: Date.now(),
      name: `Baga: ${name}`,
      code: `BG-${code}`,
      quantity: 1,
      unit: 'cái',
      sender: fullName,
      senderPhone: phone,
      receiver: 'Khách nhận Baga',
      receiverPhone: phone,
      stationFrom: stationFrom,
      stationTo: stationTo,
      fee: feeNum,
      staff: 'Nhiên',
      transferTime: `${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`,
      status: 'pending',
      statusText: 'Chưa chuyển',
      manifestId: null,
      cargoCategory: 'baga',
      note: note,
      paidMethod: payMethod === 'Chuyển khoản' ? 'transfer' : 'cash',
      paymentStatus: 'paid',
      baga: bagaData
    };
    cargos.unshift(newCargo);
    saveCargos(cargos);
    showToast(`🎉 Đã tiếp nhận đơn Baga (${code})! Bạn có thể chọn Chuyển phơi sau.`);
  }

  closeBagaModal();
  renderTable();
};

// --- Xử lý In Biên Lai Giao Hàng trong Quản lý hàng hóa ---
let currentReceiptCargoId = null;

function openDeliveryReceiptModal(cargoId) {
  const cargos = loadCargos();
  const manifests = loadManifests();
  const cargo = cargos.find(c => String(c.id) === String(cargoId));

  if (!cargo) return;
  currentReceiptCargoId = cargoId;

  const manifest = manifests.find(m => String(m.id) === String(cargo.manifestId));
  const feeVal = Number(cargo.fee || 0);
  const codVal = Number(cargo.codAmount || 0);

  const isFeePaid = cargo.paymentStatus === 'paid';
  const isFeeFree = cargo.paymentStatus === 'free';
  const collectFee = isFeePaid || isFeeFree ? 0 : feeVal;
  const totalCollect = collectFee + codVal;

  let payStatusStr = 'Chưa thanh toán (Thu cước)';
  if (isFeeFree) payStatusStr = 'Không thu phí';
  else if (isFeePaid) payStatusStr = `Tiền rồi (${cargo.paidMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'})`;

  const isDelivery = window.location.pathname.includes('delivery.html') || cargo.status === 'delivered';
  const receiptTitle = isDelivery ? 'BIÊN LAI XÁC NHẬN ĐÃ GIAO HÀNG' : 'BIÊN LAI XÁC NHẬN ĐÃ NHẬN HÀNG';
  const receiptSubtext = isDelivery ? '(Phiếu xác nhận đã giao hàng thành công cho người nhận)' : '(Phiếu xác nhận nhà xe đã nhận hàng từ người gửi)';
  const leftSigLabel = isDelivery ? 'NGƯỜI NHẬN HÀNG' : 'NGƯỜI GỬI HÀNG';
  const rightSigLabel = isDelivery ? 'NHÂN VIÊN GIAO HÀNG' : 'NHÂN VIÊN NHẬN HÀNG';

  let modal = document.getElementById('deliveryReceiptModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'deliveryReceiptModal';
    modal.innerHTML = `
      <div class="modal-card" style="width:90%; max-width:650px; margin:auto; background:white; border-radius:12px; overflow:hidden;">
        <div class="modal-head" style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size:16px; font-weight:800; margin:0; color:#0f172a;">${isDelivery ? 'Biên lai xác nhận đã giao hàng' : 'Biên lai xác nhận'}</h2>
            <span style="font-size:12px; color:#64748b;">Xem trước & In phiếu biên lai</span>
          </div>
          <button type="button" class="icon-btn" onclick="closeDeliveryReceiptModal()">✕</button>
        </div>
        <div style="padding:16px; max-height:75vh; overflow-y:auto;">
          <div id="printableReceiptArea" style="background:white; border:1px solid #cbd5e1; border-radius:8px; padding:20px; font-family:-apple-system, BlinkMacSystemFont, sans-serif; color:#0f172a;"></div>
        </div>
        <div class="modal-actions" style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; background:#f8fafc;">
          <button type="button" class="ghost-btn" onclick="closeDeliveryReceiptModal()">Đóng</button>
          <button type="button" class="primary-btn" onclick="printReceiptNow()" style="background:#2563eb; display:flex; align-items:center; gap:6px; color:white; border:none; padding:8px 18px; border-radius:6px; font-weight:700; cursor:pointer;">
            <span>In biên lai</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const area = document.getElementById('printableReceiptArea');
  if (area) {
    area.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px dashed #cbd5e1; padding-bottom:12px; margin-bottom:14px;">
        <div>
          <h2 style="margin:0; font-size:19px; font-weight:800; color:#dc2626;">HUỆ NGHĨA EXPRESS</h2>
          <span style="font-size:12px; color:#475569;">Dịch vụ vận tải & Giao nhận hàng hóa tận nơi</span>
        </div>
        <div style="text-align:right;">
          <code style="font-size:16px; font-weight:800; background:#f1f5f9; padding:2px 8px; border-radius:4px; color:#0f172a;">${cargo.code}</code>
          <div style="font-size:11.5px; color:#64748b; margin-top:2px;">Ngày: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
      </div>

      <div style="text-align:center; margin-bottom:14px;">
        <h3 style="margin:0; font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#1e293b;">${receiptTitle}</h3>
        <span style="font-size:11.5px; color:#64748b;">${receiptSubtext}</span>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:8px; margin-bottom:14px; font-size:12.5px;">
        <div>
          <div style="color:#64748b; font-size:10.5px; font-weight:700; text-transform:uppercase;">NGƯỜI GỬI:</div>
          <strong style="color:#0f172a; font-size:13.5px;">${cargo.sender}</strong>
          <div style="color:#475569;">SĐT: ${cargo.senderPhone}</div>
          <div style="color:#64748b; font-size:11.5px;">Trạm đi: ${cargo.stationFrom || (manifest ? manifest.from : 'Sài Gòn')}</div>
        </div>
        <div>
          <div style="color:#64748b; font-size:10.5px; font-weight:700; text-transform:uppercase;">NGƯỜI NHẬN:</div>
          <strong style="color:#0f172a; font-size:13.5px;">${cargo.receiver}</strong>
          <div style="color:#475569;">SĐT: ${cargo.receiverPhone}</div>
          <div style="color:#64748b; font-size:11.5px;">Địa chỉ/Trạm: ${cargo.deliveryAddress || cargo.stationTo || (manifest ? manifest.to : 'An Giang')}</div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:14px; font-size:12.5px;">
        <thead>
          <tr style="background:#f1f5f9; border-bottom:1.5px solid #cbd5e1; text-align:left; font-size:11px; text-transform:uppercase;">
            <th style="padding:7px 10px;">TÊN HÀNG HÓA</th>
            <th style="padding:7px 10px; text-align:center;">SỐ LƯỢNG</th>
            <th style="padding:7px 10px; text-align:right;">PHÍ CƯỚC</th>
            <th style="padding:7px 10px; text-align:right;">THU HỘ (COD)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 10px;"><strong style="color:#0f172a;">${cargo.name}</strong></td>
            <td style="padding:8px 10px; text-align:center;">${formatCargoQuantity(cargo)}</td>
            <td style="padding:8px 10px; text-align:right; font-weight:700;">${feeVal.toLocaleString('vi-VN')}đ</td>
            <td style="padding:8px 10px; text-align:right; font-weight:800; color:#7c3aed;">${codVal > 0 ? codVal.toLocaleString('vi-VN') + 'đ' : '0đ'}</td>
          </tr>
        </tbody>
      </table>

      <div style="background:#fff1f2; border:1.5px solid #fecdd3; padding:10px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <span style="font-size:11px; color:#9f1239; font-weight:700; display:block;">TRẠNG THÁI CƯỚC:</span>
          <strong style="font-size:12.5px; color:#be123c;">${payStatusStr}</strong>
        </div>
        <div style="text-align:right;">
          <span style="font-size:11px; color:#9f1239; font-weight:700; display:block;">TỔNG CẦN THU CỦA KHÁCH:</span>
          <strong style="font-size:18px; color:#dc2626;">${totalCollect.toLocaleString('vi-VN')} VNĐ</strong>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; text-align:center; font-size:12px; margin-top:14px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <div>
          <strong style="display:block; margin-bottom:4px; color:#0f172a;">${leftSigLabel}</strong>
          <span style="font-size:10.5px; color:#64748b;">(Ký & ghi rõ họ tên)</span>
          <div style="height:45px;"></div>
        </div>
        <div>
          <strong style="display:block; margin-bottom:4px; color:#0f172a;">${rightSigLabel}</strong>
          <span style="font-size:10.5px; color:#64748b;">(Ký & ghi rõ họ tên)</span>
          <div style="height:45px;"></div>
        </div>
      </div>
    `;
  }

  modal.classList.add('open');
}
window.openDeliveryReceiptModal = openDeliveryReceiptModal;

function closeDeliveryReceiptModal() {
  const modal = document.getElementById('deliveryReceiptModal');
  if (modal) modal.classList.remove('open');
}
window.closeDeliveryReceiptModal = closeDeliveryReceiptModal;

function printReceiptNow() {
  const receiptContent = document.getElementById('printableReceiptArea')?.innerHTML;
  if (!receiptContent) return;

  let container = document.getElementById('printableReceiptContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'printableReceiptContainer';
    document.body.appendChild(container);
  }
  container.innerHTML = `
    <div style="max-width:580px; margin:0 auto; padding:20px; background:white; font-family:-apple-system, BlinkMacSystemFont, sans-serif; color:#0f172a;">
      ${receiptContent}
    </div>
  `;

  window.print();
}
window.printReceiptNow = printReceiptNow;

// --- Xử lý Hàng quá hạn (>3 ngày chưa xếp phơi) & Thông báo Giải trình ---
function isCargoOverdue(item) {
  if (!item) return false;
  if (item.manifestId || (item.status && item.status !== 'pending')) return false;

  if (item.isOverdue) return true;

  if (item.createdTimestamp) {
    const days = (Date.now() - item.createdTimestamp) / (1000 * 60 * 60 * 24);
    if (days >= 3) return true;
  }

  const timeStr = item.transferTime || item.receiveTime || '';
  const dateMatch = timeStr.match(/(\d{1,2})[\/-](\d{1,2})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const itemDate = new Date(new Date().getFullYear(), month, day);
    const now = new Date();
    const diffTime = now - itemDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays >= 3) return true;
  }

  return false;
}
window.isCargoOverdue = isCargoOverdue;

function checkAndDisplayOverdueWarning() {
  const cargos = loadCargos();
  const overdueItems = cargos.filter(c => isCargoOverdue(c));
  const unresolvedItems = overdueItems.filter(c => !c.delayReason);

  const banner = document.getElementById('overdueWarningBanner');
  const bannerCount = document.getElementById('overdueBannerCount');
  const badgeCount = document.getElementById('overdueBadgeCount');

  if (badgeCount) {
    badgeCount.textContent = overdueItems.length;
    badgeCount.style.display = overdueItems.length > 0 ? 'inline-block' : 'none';
  }

  if (banner) {
    if (unresolvedItems.length > 0) {
      if (bannerCount) bannerCount.textContent = unresolvedItems.length;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }
}
window.checkAndDisplayOverdueWarning = checkAndDisplayOverdueWarning;

function openOverdueReasonModal() {
  const cargos = loadCargos();
  const overdueItems = cargos.filter(c => isCargoOverdue(c));
  const container = document.getElementById('overdueItemsListContainer');
  const modal = document.getElementById('overdueReasonModal');

  if (!container || !modal) return;

  if (overdueItems.length === 0) {
    alert('Không có đơn hàng nào bị quá hạn (>3 ngày chưa chuyển phơi)!');
    return;
  }

  let html = '';
  overdueItems.forEach((item, idx) => {
    html += `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:13px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <strong style="color:#be123c; font-size:14px;">${idx + 1}. ${item.name}</strong> 
            <code style="font-size:12px; background:#f1f5f9; padding:1px 5px; border-radius:4px; margin-left:6px; font-weight:700;">${item.code}</code>
          </div>
          <span style="font-size:11.5px; background:#ffe4e6; color:#be123c; font-weight:700; padding:2px 8px; border-radius:4px;">
            Nhận: ${item.transferTime || 'Cách đây >3 ngày'}
          </span>
        </div>
        <div style="color:#64748b; font-size:12px; margin-bottom:8px;">
          Gửi: <strong>${item.sender}</strong> (${item.senderPhone}) ➔ Nhận: <strong>${item.receiver}</strong> (${item.receiverPhone}) | Tuyến: <strong>${item.stationFrom || 'Sài Gòn'} ➔ ${item.stationTo || 'Châu Đốc'}</strong>
        </div>
        <div>
          <span style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Lý do chưa chuyển phơi <strong style="color:#dc2626;">*</strong>:</span>
          <input type="text" class="overdue-reason-input" data-cargo-id="${item.id}" value="${item.delayReason || ''}" placeholder="Nhập lý do chưa xếp phơi (vd: Khách hẹn gửi sau...)" style="width:100%; padding:7px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:12.5px; background:white; font-weight:600;" />
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  modal.classList.add('open');
}
window.openOverdueReasonModal = openOverdueReasonModal;

function closeOverdueReasonModal() {
  const modal = document.getElementById('overdueReasonModal');
  if (modal) modal.classList.remove('open');
}
window.closeOverdueReasonModal = closeOverdueReasonModal;

function applyQuickOverdueReason(reasonText) {
  const inputs = document.querySelectorAll('.overdue-reason-input');
  inputs.forEach(input => {
    if (!input.value) input.value = reasonText;
  });
}
window.applyQuickOverdueReason = applyQuickOverdueReason;

function submitOverdueReasons() {
  const inputs = document.querySelectorAll('.overdue-reason-input');
  let missingCount = 0;
  inputs.forEach(input => {
    if (!input.value || !input.value.trim()) missingCount++;
  });

  if (missingCount > 0) {
    alert(`Vui lòng nhập đầy đủ lý do giải trình cho tất cả ${missingCount} đơn hàng quá hạn!`);
    return;
  }

  const cargos = loadCargos();
  inputs.forEach(input => {
    const cargoId = input.dataset.cargoId;
    const reason = input.value.trim();
    const cargo = cargos.find(c => String(c.id) === String(cargoId));
    if (cargo) {
      cargo.delayReason = reason;
    }
  });

  saveCargos(cargos);
  closeOverdueReasonModal();
  checkAndDisplayOverdueWarning();
  renderTable();
  showToast('🎉 Đã lưu lý do giải trình và tắt thông báo cảnh báo thành công!');
}
window.submitOverdueReasons = submitOverdueReasons;

// Auto trigger check on load
document.addEventListener('DOMContentLoaded', () => {
  checkAndDisplayOverdueWarning();
  const urlFilterNow = new URLSearchParams(window.location.search).get('filter');
  const isDelivery = window.location.pathname.includes('delivery.html');

  const newBagaBtn = document.getElementById('newBagaBtn');
  const newOrderBtn = document.getElementById('newOrderBtn');

  if (urlFilterNow === 'baga') {
    const eyebrow = document.querySelector('.toolbar .eyebrow');
    const mainH1 = document.querySelector('.toolbar h1');
    if (eyebrow) eyebrow.textContent = isDelivery ? 'Giao hàng' : 'Nhận hàng';
    if (mainH1) mainH1.textContent = 'Danh sách Baga xe khách';
    if (newBagaBtn) newBagaBtn.style.display = 'inline-flex';
    if (newOrderBtn) newOrderBtn.style.display = 'none';
  } else {
    if (isDelivery) {
      const eyebrow = document.querySelector('.toolbar .eyebrow');
      const mainH1 = document.querySelector('.toolbar h1');
      if (eyebrow) eyebrow.textContent = 'Giao hàng';
      if (mainH1) mainH1.textContent = 'Danh sách giao hàng';
    }
    if (newBagaBtn) newBagaBtn.style.display = 'none';
    if (newOrderBtn) newOrderBtn.style.display = 'inline-flex';
  }
});
setTimeout(() => {
  checkAndDisplayOverdueWarning();
}, 200);

