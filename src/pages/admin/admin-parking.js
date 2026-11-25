const parkingAdmin = (() => {
  'use strict';

  const key = 'hn_admin_parking_v1';
  const setupNotice = 'Hãy thiết lập giá giữ xe trước khi ghi nhận xe đầu tiên.';
  const view = $('viewParking');
  const receiveForm = $('parkingReceiveForm');
  const ratesForm = $('parkingRates');
  const bands = $('parkingBands');
  const dialog = $('parkingCheckout');
  const checkoutForm = $('parkingCheckoutForm');
  const notice = $('parkingNotice');
  const ratesNotice = $('parkingRatesNotice');
  const checkoutNotice = $('parkingCheckoutNotice');
  const stamp = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short'
  });
  const isoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const { quote, prepareRates, dayMs, normalizePlate } = ParkingPricing;
  let ratesBaseline;
  let nextBandId = 0;
  let selectedCheckout;
  let receiving = false;

  function setNotice(target, message = '', error = false) {
    target.textContent = message;
    target.hidden = !message;
    target.classList.toggle('parking-error', error);
  }

  function readStore() {
    const raw = localStorage.getItem(key);
    if (raw === null) return { records: [], rates: null };
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.records) || !Object.hasOwn(data, 'rates')) {
      throw new Error('Dữ liệu giữ xe không hợp lệ.');
    }
    return data;
  }

  class ParkingError extends Error {}

  // Lock read + write together so supported browsers serialize changes across admin tabs.
  async function changeStore(change) {
    const update = () => {
      if (!Auth.isAdmin()) throw new ParkingError('Phiên quản trị đã thay đổi. Vui lòng đăng nhập lại.');
      const state = readStore();
      const result = change(state);
      localStorage.setItem(key, JSON.stringify(state));
      return result;
    };
    return navigator.locks ? navigator.locks.request(key, update) : update();
  }

  function renderRecords() {
    if (!Auth.isAdmin()) return;
    try {
      const { records, rates } = readStore();
      receiveForm.querySelector('[type="submit"]').disabled = receiving || !rates;
      if (!rates) setNotice(notice, setupNotice);
      else if (notice.textContent === setupNotice) setNotice(notice);

      const active = records.filter(record => !record.checkout).length;
      $('parkingCounts').textContent = `${active} đang giữ · ${records.length - active} đã trả`;
      const keyword = $('parkingSearch').value.trim();
      const plateKeyword = normalizePlate(keyword);
      const status = $('parkingStatus').value;
      const matches = records.filter(record => {
        if ((status === 'active' && record.checkout) || (status === 'returned' && !record.checkout)) return false;
        return [record.code, record.plate, record.customer, record.phone].some(value => value.sIncludes(keyword)) ||
          (plateKeyword && normalizePlate(record.plate).includes(plateKeyword));
      });
      const now = Date.now();
      $('parkingRows').innerHTML = matches.length ? matches.map(record => recordRow(record, now)).join('') :
        `<tr><td class="empty-state" colspan="6">${records.length ? 'Không tìm thấy phiếu phù hợp.' : 'Chưa có phiếu giữ xe.'}</td></tr>`;
    } catch {
      receiveForm.querySelector('[type="submit"]').disabled = true;
      setNotice(notice, 'Không đọc được dữ liệu giữ xe trên trình duyệt này.', true);
    }
  }

  function recordRow(record, now) {
    const checkout = record.checkout;
    const fee = checkout || quote(record.rates, record.receivedAt, now);
    const plate = record.plate ? ` · ${esc(record.plate)}` : '';
    return `<tr data-code="${esc(record.code)}">
      <th scope="row"><strong class="mono">${esc(record.code)}</strong>
        <div class="cell-sub">${esc(record.type)}${plate}</div>
        ${record.note ? `<div class="cell-sub parking-row-note">${esc(record.note)}</div>` : ''}</th>
      <td>${esc(record.customer || '—')}${record.phone ? `<div class="cell-sub">${esc(record.phone)}</div>` : ''}</td>
      <td class="parking-stamp">${stamp.format(record.receivedAt)}
        ${checkout ? `<div class="cell-sub">Trả ${stamp.format(checkout.at)}</div>` : ''}</td>
      <td><strong>${fmtMoney(fee.total)}</strong><div class="cell-sub">${fee.days} ngày${checkout ? '' : ' · Tạm tính'}</div></td>
      <td><span class="status-badge ${checkout ? 'chua-chi-dinh' : 'dang-ban'}">${checkout ? 'Đã trả' : 'Đang giữ'}</span></td>
      <td><div class="parking-row-actions">
        <button type="button" class="btn btn-sm" data-parking-action="receipt">In biên lai</button>
        ${checkout ? '' : `<button type="button" class="btn btn-sm" data-parking-action="label">In tem dán</button>
          <button type="button" class="btn btn-primary btn-sm" data-parking-action="checkout">Trả xe</button>`}
      </div></td>
    </tr>`;
  }

  function updatePlateRequired() {
    const required = ['Xe máy', 'Ô tô'].includes($('parkingType').value);
    $('parkingPlate').required = required;
    $('parkingPlateOptional').hidden = required;
  }

  async function receiveVehicle(event) {
    event.preventDefault();
    const button = receiveForm.querySelector('[type="submit"]');
    if (button.disabled) return;
    const input = Object.fromEntries(Array.from(new FormData(receiveForm), ([name, value]) => [name, value.trim()]));
    input.plate = input.plate.toUpperCase();
    const normalized = normalizePlate(input.plate);
    if (($('parkingPlate').required || input.plate) && !normalized) {
      setNotice(notice, 'Vui lòng nhập biển số hợp lệ.', true);
      $('parkingPlate').focus();
      return;
    }
    receiving = true;
    button.disabled = true;
    try {
      const record = await changeStore(state => {
        if (!state.rates) throw new ParkingError('Vui lòng lưu bảng giá trước khi nhận xe.');
        if (normalized && state.records.some(item => !item.checkout && normalizePlate(item.plate) === normalized)) {
          throw new ParkingError('Biển số này đang có phiếu giữ xe.');
        }
        let code;
        do {
          const number = crypto.getRandomValues(new Uint32Array(1))[0];
          code = `GX-${number.toString(16).padStart(8, '0').toUpperCase()}`;
        } while (state.records.some(item => item.code === code));
        const item = { code, ...input, receivedAt: Date.now(), rates: state.rates, checkout: null };
        state.records.unshift(item);
        return item;
      });
      receiveForm.reset();
      updatePlateRequired();
      $('parkingStatus').value = 'all';
      $('parkingSearch').value = '';
      setNotice(notice, `Đã nhận xe. Phiếu ${record.code} sẵn sàng để in biên lai và tem dán.`);
    } catch (error) {
      setNotice(notice, error instanceof ParkingError ? error.message : 'Không lưu được phiếu giữ xe trên trình duyệt.', true);
    } finally {
      receiving = false;
      renderRecords();
    }
  }

  function readRatesForm() {
    const rateInDong = value => value === '' ? '' : String(Number(value) * 1000);
    return prepareRates({
      bands: Array.from(bands.children, row => ({
        from: valueOfBand(row, 'from'),
        through: valueOfBand(row, 'through'),
        rate: rateInDong(valueOfBand(row, 'rate')),
        discount: rateInDong(valueOfBand(row, 'discount'))
      }))
    });
  }

  function valueOfBand(row, field) {
    const input = row.querySelector(`[data-rate="${field}"]`);
    if (!input) throw new Error('Thi\u1ebfu \u00f4 kho\u1ea3ng ng\u00e0y: ' + field);
    return input.value;
  }

  function syncBandStarts() {
    let previousThrough = null;
    Array.from(bands.children).forEach((row, index) => {
      const from = row.querySelector('[data-rate="from"]');
      const through = row.querySelector('[data-rate="through"]');
      if (index > 0) from.value = previousThrough ?? '';
      const end = Number(through.value);
      previousThrough = through.value && Number.isInteger(end) ? String(end) : null;
    });
  }

  function addBand(band, focus = false) {
    const id = ++nextBandId;
    const previousBand = bands.lastElementChild;
    const linkedStart = previousBand ? previousBand.querySelector('[data-rate="through"]').value : '1';
    const row = document.createElement('div');
    row.className = 'parking-band';
    row.innerHTML = [
      ['from', 'T\u1eeb ng\u00e0y', 1, 36500], ['through', '\u0110\u1ebfn ng\u00e0y', 1, 36500], ['rate', 'Gi\u00e1 (\u0111/ng\u00e0y)', 0, 999999999], ['discount', 'Gi\u1ea3m (\u0111/l\u01b0\u1ee3t)', 0, 999999999]
    ].map(([field, label, min, max]) => `<div class="filter-field parking-field">
        <label for="parkingBand-${id}-${field}">${label}</label>
        <div class="parking-money-input"><input type="number" id="parkingBand-${id}-${field}" data-rate="${field}" min="${min}" max="${field === 'rate' || field === 'discount' ? 999999.999 : max}" step="${field === 'rate' || field === 'discount' ? '0.001' : '1'}" ${field === 'from' ? 'readonly aria-readonly="true"' : ''} required />${field === 'rate' || field === 'discount' ? '<span class="parking-money-suffix" aria-hidden="true">000</span>' : ''}</div>
      </div>`).join('') + '<button type="button" class="btn btn-danger btn-sm parking-remove-band">Xóa khoảng</button>';
    bands.append(row);
    row.querySelectorAll('[data-rate]').forEach(input => {
      const value = band?.[input.dataset.rate];
      if (input.dataset.rate === 'from') input.value = value ?? linkedStart;
      else input.value = (input.dataset.rate === 'rate' || input.dataset.rate === 'discount') && value != null ? Number(value) / 1000 : input.dataset.rate === 'discount' ? '0' : value ?? '';
    });
    row.querySelector('button').addEventListener('click', () => {
      row.remove();
      syncBandStarts();
      $('parkingAddBand').focus();
      renderPreview();
    });
    row.querySelector('[data-rate="through"]').addEventListener('input', () => {
      syncBandStarts();
      renderPreview();
    });
    if (focus) row.querySelector('input').focus();
  }

  function loadRates() {
    try {
      const { rates } = readStore();
      ratesBaseline = JSON.stringify(rates);
      bands.replaceChildren();
      if (Array.isArray(rates?.bands)) rates.bands.forEach(band => addBand(band));
      syncBandStarts();
      setNotice(ratesNotice);
      renderPreview();
    } catch {
      setNotice(ratesNotice, 'Không đọc được bảng giá giữ xe trên trình duyệt này.', true);
    }
  }

  function renderPreview() {
    const result = $('parkingPreviewTotal');
    const date = $('parkingPreviewDate');
    const days = $('parkingPreviewDays');
    try {
      if (!date.value || !days.value || !days.validity.valid) throw new Error();
      const start = Date.parse(`${date.value}T00:00:00+07:00`);
      if (!Number.isFinite(start)) throw new Error();
      const fee = quote(readRatesForm(), start, start + days.valueAsNumber * dayMs);
      result.textContent = `Dự tính ${fmtMoney(fee.total)}${fee.discount ? ` · Đã giảm ${fmtMoney(fee.discount)}` : ''}`;
    } catch {
      result.textContent = 'Nhập bảng giá, ngày bắt đầu và số ngày để tính phí.';
    }
  }

  async function saveRates(event) {
    event.preventDefault();
    let rates;
    try { rates = readRatesForm(); } catch (error) {
      setNotice(ratesNotice, error.message, true);
      return;
    }
    const button = ratesForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await changeStore(state => {
        if (JSON.stringify(state.rates) !== ratesBaseline) {
          throw new ParkingError('Bảng giá đã được cập nhật ở tab khác. Bấm “Nạp giá đã lưu” để xem bảng mới.');
        }
        state.rates = rates;
      });
      ratesBaseline = JSON.stringify(rates);
      setNotice(ratesNotice, 'Đã lưu bảng giá giữ xe.');
    } catch (error) {
      setNotice(ratesNotice, error instanceof ParkingError ? error.message : 'Không lưu được bảng giá trên trình duyệt.', true);
    } finally {
      button.disabled = false;
    }
  }

  function feeBreakdown(fee) {
    const rows = [['Số ngày tính phí', fee.days]];
    if (fee.discount) rows.push(['Trước giảm', fmtMoney(fee.subtotal)], ['Giảm giá', fmtMoney(fee.discount)]);
    return rows;
  }

  function fillCheckout(record, fee) {
    selectedCheckout = { code: record.code, fee };
    $('parkingCheckoutVehicle').textContent = [record.code, record.type, record.plate].filter(Boolean).join(' · ');
    const rows = [['Nhận xe', stamp.format(record.receivedAt)], ...feeBreakdown(fee)];
    $('parkingCheckoutSummary').innerHTML = rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('') +
      `<dt>Phí giữ xe</dt><dd><strong>${fmtMoney(fee.total)}</strong></dd>`;
  }

  async function returnVehicle(event) {
    event.preventDefault();
    const confirmed = selectedCheckout;
    const button = checkoutForm.querySelector('[type="submit"]');
    if (button.disabled || !confirmed) return;
    button.disabled = true;
    try {
      await changeStore(state => {
        const record = state.records.find(item => item.code === confirmed.code);
        if (!record || record.checkout) throw new ParkingError('Phiếu này đã được trả hoặc không còn trong danh sách.');
        const at = Math.max(Date.now(), record.receivedAt);
        const fee = quote(record.rates, record.receivedAt, at);
        if (fee.days !== confirmed.fee.days) {
          fillCheckout(record, fee);
          throw new ParkingError('Số ngày tính phí vừa thay đổi. Hãy kiểm tra lại số tiền và xác nhận.');
        }
        record.checkout = { at, ...fee };
      });
      dialog.close();
      setNotice(notice, `Đã trả xe ${confirmed.code}. Có thể in biên lai từ danh sách.`);
      renderRecords();
      const receiptButton = $('parkingRows').querySelector(`tr[data-code="${CSS.escape(confirmed.code)}"] [data-parking-action="receipt"]`);
      (receiptButton || $('parkingStatus')).focus();
    } catch (error) {
      setNotice(checkoutNotice, error instanceof ParkingError ? error.message : 'Không lưu được thông tin trả xe.', true);
      renderRecords();
    } finally {
      button.disabled = false;
    }
  }

  function receiptRows(rows) {
    return `<dl>${rows.map(([label, value]) => `<div class="kv-row"><dt class="kv-label">${label}:</dt><dd class="kv-val">${esc(value)}</dd></div>`).join('')}</dl>`;
  }

  function receiptContent(record, title) {
    const checkout = record.checkout;
    const metadata = [['Mã phiếu', record.code], ['Ngày in', stamp.format(Date.now())]];
    const details = [['Loại xe', record.type]];
    if (record.customer) details.push(['Khách gửi', record.customer]);
    details.push(['Nhận xe', stamp.format(record.receivedAt)]);
    if (checkout) details.push(['Trả xe', stamp.format(checkout.at)], ...feeBreakdown(checkout));

    return `<header class="brand-header">
        <div class="brand-badge">HN</div>
        <div class="brand-name">NHÀ XE HUỆ NGHĨA</div>
      </header>
      <h1 class="ticket-title">${title}</h1>
      <div class="dash-line"></div>
      ${receiptRows(metadata)}
      <div class="dash-line"></div>
      ${record.plate ? `<p class="seat-box"><span class="vehicle-caption">Biển số</span>${esc(record.plate)}</p>` : ''}
      ${receiptRows(details)}
      <div class="dash-line"></div>
      <p class="total-price-box">${checkout ? `TỔNG PHÍ GIỮ XE: ${fmtMoney(checkout.total)}` : 'CHƯA THU PHÍ'}</p>
      <p class="footer-note">${checkout ? '<strong>Cảm ơn quý khách đã chọn Nhà xe Huệ Nghĩa!</strong>' : 'Vui lòng giữ phiếu để nhận xe.'}</p>`;
  }

  const receiptStyle = `
    ${ADMIN_TICKET_PRINT_STYLE}
    @page { size: auto; margin: 0; }
    .ticket-page { max-width: 100%; padding: 8px 10px; }
    .brand-header { padding-bottom: 6px; margin-bottom: 6px; }
    .brand-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    dl, dd { margin: 0; }
    .kv-row { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; margin: 2px 0; }
    .seat-box, .total-price-box { margin: 6px 0; padding: 5px; break-inside: avoid; }
    .vehicle-caption { display: block; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
    .footer-note { margin: 6px 0 0; }
  `;

  const labelStyle = `
    @page { size: 60mm 40mm; margin: 0; }
    body { margin: 0; color: #111; font: 11px/1.15 Arial, sans-serif; }
    .parking-label {
      width: 58mm; max-width: 100%; margin: .75mm auto 0; padding: 1.15mm;
      border: 1px solid #111; border-radius: 2mm;
      display: grid; gap: .7mm; break-inside: avoid;
    }
    .label-header {
      display: flex; justify-content: space-between; align-items: center; gap: 4px;
      padding-bottom: 3px; border-bottom: 1.5px solid #111;
    }
    .label-brand { font-size: 9px; font-weight: 800; letter-spacing: .02em; }
    .label-code { padding: 2px 4px; border: 1px solid #777; border-radius: 3px; font: bold 10px monospace; }
    .label-barcode { padding: 2px 0; border: 1px dashed #777; border-radius: 3px; }
    .label-barcode svg { display: block; width: 100%; height: 8.5mm; }
    .label-vehicle { margin: 0; text-align: center; font-size: 16px; }
    .label-vehicle.long-plate { font-size: 12px; }
    .label-vehicle span, .label-info dt { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .label-info { display: grid; grid-template-columns: 2fr 3fr; gap: 4px; margin: 0; }
    .label-info div { min-width: 0; border: 1px solid #999; border-radius: 3px; padding: 2px 4px; }
    .label-info dd { margin: 1px 0 0; font-weight: 700; }
  `;

  function labelContent(record) {
    const barcode = parkingBarcode(record.code);
    const plateLength = record.plate.length;
    return `<header class="label-header">
        <strong class="label-brand">HUỆ NGHĨA EXPRESS</strong>
        <span class="label-code">${esc(record.code)}</span>
      </header>
      ${barcode ? `<div class="label-barcode">${barcode}</div>` : ''}
      <h1 class="label-vehicle${plateLength > 16 ? ' long-plate' : ''}"><span>Giữ xe${plateLength ? ' · Biển số' : ''}</span>${esc(record.plate || 'Không biển số')}</h1>
      <dl class="label-info">
        <div><dt>Loại xe</dt><dd>${esc(record.type)}</dd></div>
        <div><dt>Nhận lúc</dt><dd>${stamp.format(record.receivedAt)}</dd></div>
      </dl>`;
  }

  function printRecord(record, isLabel) {
    const title = isLabel ? 'Tem dán xe' : record.checkout ? 'Biên lai giữ xe' : 'Phiếu nhận giữ xe';
    const popup = window.open('', '_blank', 'popup,width=540,height=700');
    if (!popup) throw new ParkingError('Trình duyệt đã chặn cửa sổ in. Hãy cho phép cửa sổ bật lên để in phiếu.');
    popup.opener = null;
    const content = isLabel ? labelContent(record) : receiptContent(record, title);
    popup.document.open();
    popup.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
      <title>${title} ${esc(record.code)}</title><style>
        * { box-sizing: border-box; }
        article { overflow-wrap: anywhere; }
        ${isLabel ? labelStyle : receiptStyle}
        @media screen {
          body { background: #f1f2f4; padding: 16px; }
          .parking-label, .ticket-page { margin: 16px auto; background: #fff; box-shadow: 0 1px 4px #0003; }
          button { display: block; margin: 0 auto; padding: 8px 16px; font: inherit; cursor: pointer; }
        }
        @media print { button { display: none; } }
      </style></head><body><button type="button">${isLabel ? 'In tem' : 'In phiếu'}</button>
        <article class="${isLabel ? 'parking-label' : 'ticket-page'}">${content}</article></body></html>`);
    popup.document.close();
    popup.document.querySelector('button').addEventListener('click', () => popup.print());
  }

  function handleRecordAction(event) {
    const button = event.target.closest('[data-parking-action]');
    if (!button || !Auth.isAdmin()) return;
    try {
      const code = button.closest('tr').dataset.code;
      const record = readStore().records.find(item => item.code === code);
      if (!record) throw new ParkingError('Không tìm thấy phiếu giữ xe.');
      if (button.dataset.parkingAction === 'checkout') {
        if (record.checkout) throw new ParkingError('Xe này đã được trả.');
        fillCheckout(record, quote(record.rates, record.receivedAt, Date.now()));
        setNotice(checkoutNotice);
        dialog.showModal();
      } else {
        printRecord(record, button.dataset.parkingAction === 'label');
      }
    } catch (error) {
      setNotice(notice, error instanceof ParkingError ? error.message : 'Không mở được phiếu giữ xe.', true);
    }
  }

  function showPanel(journal) {
    if (!Auth.isAdmin()) return;
    setNotice(notice);
    $('parkingJournal').hidden = !journal;
    ratesForm.hidden = journal;
    const journalButton = $('parkingJournalButton');
    const ratesButton = $('parkingRatesButton');
    journalButton.setAttribute('aria-pressed', String(journal));
    ratesButton.setAttribute('aria-pressed', String(!journal));
    journalButton.classList.toggle('btn-primary', journal);
    ratesButton.classList.toggle('btn-primary', !journal);
    if (journal) renderRecords();
    else if (ratesBaseline === undefined) loadRates();
  }

  $('parkingPreviewDate').value = isoDate.format(Date.now());
  $('parkingType').addEventListener('change', updatePlateRequired);
  $('parkingJournalButton').addEventListener('click', () => showPanel(true));
  $('parkingRatesButton').addEventListener('click', () => showPanel(false));
  $('parkingSearch').addEventListener('input', renderRecords);
  $('parkingStatus').addEventListener('change', renderRecords);
  $('parkingRows').addEventListener('click', handleRecordAction);
  $('parkingAddBand').addEventListener('click', () => { addBand(null, true); renderPreview(); });
  $('parkingReloadRates').addEventListener('click', loadRates);
  $('parkingCancelCheckout').addEventListener('click', () => dialog.close());
  receiveForm.addEventListener('submit', receiveVehicle);
  ratesForm.addEventListener('input', renderPreview);
  ratesForm.addEventListener('submit', saveRates);
  checkoutForm.addEventListener('submit', returnVehicle);
  window.addEventListener('storage', event => {
    if ((event.key === key || event.key === null) && !view.hidden && ratesForm.hidden) renderRecords();
  });

  return { render: () => showPanel(ratesForm.hidden) };
})();

function renderParkingView() { parkingAdmin.render(); }

