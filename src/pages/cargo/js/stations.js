/**
 * Master Data Danh sách Trạm Huệ Nghĩa Express
 * Dùng chung cho cả Điểm đi (Trạm gửi) và Điểm đến (Trạm nhận)
 */

const DEFAULT_STATIONS = [
  // Khu vực An Giang
  'Châu Đốc',
  'Hà Tiên',
  'Long Xuyên',
  'Tân Châu',
  'Tri Tôn',
  'Chợ Mới',
  'Bình Long',
  'Tịnh Biên',
  'An Châu',
  'An Phú',
  'AG',
  'Cái Dầu',
  'Chi Lăng',
  'Long Bình',
  'Đồng Ky',
  'An Hòa',
  // Khu vực Sài Gòn
  '508 Kinh Dương Vương',
  '4 Tống Văn Trân',
  '58 Lê Đại Hành',
  'Bến xe Miền Tây',
  'Sài Gòn',
  // Khu vực Bình Dương
  'Trạm An Phú',
  'Bến An Phú',
  'Trạm An Sương',
  'Trạm Bến Cát'
];

const STATIONS_STORAGE_KEY = 'hueNghia_stations';

function getStations() {
  const saved = localStorage.getItem(STATIONS_STORAGE_KEY);
  if (saved) {
    try {
      let list = JSON.parse(saved);
      if (Array.isArray(list) && list.length > 0) {
        // Migration: split 'Tân Châu- AG' if found into 'Tân Châu' and 'AG'
        if (list.some(st => st.includes('Tân Châu- AG') || st.includes('Tân Châu - AG'))) {
          list = list.flatMap(st => (st.includes('Tân Châu- AG') || st.includes('Tân Châu - AG')) ? ['Tân Châu', 'AG'] : [st]);
          list = Array.from(new Set(list));
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(list));
        }
        return list;
      }
    } catch (e) {}
  }
  localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(DEFAULT_STATIONS));
  return DEFAULT_STATIONS;
}

function saveStations(stationsList) {
  const uniqueList = Array.from(new Set(stationsList.map(s => s.trim()))).filter(Boolean);
  localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(uniqueList));
  return uniqueList;
}

function addCustomStation(stationName) {
  if (!stationName) return;
  const current = getStations();
  if (!current.includes(stationName.trim())) {
    current.push(stationName.trim());
    saveStations(current);
  }
}

/**
 * Populate standard <select> elements with station options
 */
function populateStationDropdowns(selectElement, selectedValue = '', includeAllOption = false, allLabel = 'Tất cả trạm') {
  if (!selectElement) return;
  const stations = getStations();
  let html = '';
  
  if (includeAllOption) {
    html += `<option value="all">${allLabel}</option>`;
  }
  
  stations.forEach(st => {
    const selected = st === selectedValue ? 'selected' : '';
    html += `<option value="${st}" ${selected}>${st}</option>`;
  });
  
  selectElement.innerHTML = html;
}

const VEHICLE_TYPES = [
  'Đội xe 36 giường',
  'Đội xe 40 Giường',
  'Đội xe 41 Giường',
  'Đội xe 44 Giường',
  'Đội Xe Limousine 11 Chỗ',
  'Đội Xe Limousine 19 Chỗ',
  'Đội Xe Limousine 28 Chỗ',
  'Đội xe Limousine 34 giường',
  'Đội Xe Limousine 9 Chỗ',
  'Đội Xe Thường 16 Chỗ',
  'Đội Xe Thường 26 Chỗ',
  'Đội Xe Thường 28 Chỗ',
  'Đội xe thường 47 chỗ',
  'Đội xe VIP 24 Phòng'
];

function populateVehicleDropdowns(selectElement, selectedValue = '') {
  if (!selectElement) return;
  let html = '';
  VEHICLE_TYPES.forEach(vt => {
    const selected = vt === selectedValue ? 'selected' : '';
    html += `<option value="${vt}" ${selected}>${vt}</option>`;
  });
  selectElement.innerHTML = html;
}

if (typeof window !== 'undefined') {
  window.HueNghiaStations = {
    getStations,
    saveStations,
    addCustomStation,
    populateStationDropdowns,
    populateVehicleDropdowns,
    DEFAULT_STATIONS,
    VEHICLE_TYPES
  };
}
