const ParkingPricing = (() => {
  const dayMs = 24 * 60 * 60 * 1000;
  const weekdayFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short'
  });
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function integer(value, min, max, label) {
    const number = Number(value);
    if (value == null || String(value).trim() === '' || !Number.isInteger(number) || number < min || number > max) {
      throw new Error(`${label} ph\u1ea3i l\u00e0 s\u1ed1 nguy\u00ean t\u1eeb ${min} \u0111\u1ebfn ${max}.`);
    }
    return number;
  }

  function prepareRates({ bands }) {
    const money = (value, label) => integer(value, 0, 999999999, label);
    const ranges = bands.map(({ from, through, rate, discount }) => ({
      from: integer(from, 1, 36500, 'Ng\u00e0y b\u1eaft \u0111\u1ea7u'),
      through: integer(through, 1, 36500, 'Ng\u00e0y k\u1ebft th\u00fac'),
      rate: money(rate, 'Gi\u00e1 theo kho\u1ea3ng ng\u00e0y'),
      discount: money(discount ?? 0, 'M\u1ee9c gi\u1ea3m theo kho\u1ea3ng')
    })).sort((a, b) => a.from - b.from);
    if (!ranges.length) throw new Error('H\u00e3y th\u00eam \u00edt nh\u1ea5t m\u1ed9t kho\u1ea3ng gi\u00e1.');
    ranges.forEach((band, index) => {
      if (band.from > band.through) throw new Error('Ng\u00e0y b\u1eaft \u0111\u1ea7u ph\u1ea3i nh\u1ecf h\u01a1n ho\u1eb7c b\u1eb1ng ng\u00e0y k\u1ebft th\u00fac.');
      if (index === 0 && band.from !== 1) throw new Error('Kho\u1ea3ng ng\u00e0y \u0111\u1ea7u ti\u00ean ph\u1ea3i b\u1eaft \u0111\u1ea7u t\u1eeb ng\u00e0y 1.');
      if (index && band.from !== ranges[index - 1].through) throw new Error('Kho\u1ea3ng ng\u00e0y ti\u1ebfp theo ph\u1ea3i b\u1eaft \u0111\u1ea7u t\u1ea1i m\u1ed1c k\u1ebft th\u00fac kho\u1ea3ng tr\u01b0\u1edbc.');
    });
    return { bands: ranges };
  }

  function quote(rates, receivedAt, returnedAt) {
    const days = Math.max(1, Math.ceil((returnedAt - receivedAt) / dayMs));
    const band = rates.bands?.find(({ from, through }) => from <= days && days <= through);
    if (!band && rates.dailyRate != null) return quoteLegacyRates(rates, days, receivedAt);
    if (!band) throw new Error('Ch\u01b0a c\u00e0i \u0111\u1eb7t gi\u00e1 cho kho\u1ea3ng s\u1ed1 ng\u00e0y n\u00e0y.');
    const subtotal = days * band.rate;
    const discount = Math.min(subtotal, band.discount || 0);
    return { days, subtotal, discount, total: subtotal - discount };
  }

  // Tickets created before range-only pricing keep their original price snapshot.
  function quoteLegacyRates(rates, days, receivedAt) {
    const daily = Array.isArray(rates.weekdayRates)
      ? rates.weekdayRates.map(rate => rate ?? rates.dailyRate)
      : Array(7).fill(rates.dailyRate);
    const first = weekdays.indexOf(weekdayFormat.format(receivedAt));
    const subtotal = Math.floor(days / 7) * daily.reduce((sum, rate) => sum + rate, 0) +
      Array.from({ length: days % 7 }, (_, offset) => daily[(first + offset) % 7]).reduce((sum, rate) => sum + rate, 0);
    const discount = days >= 30 ? Math.round(subtotal * (rates.monthlyDiscount || 0) / 100) : 0;
    return { days, subtotal, discount, total: subtotal - discount };
  }

  function normalizePlate(plate) {
    return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  return { dayMs, prepareRates, quote, normalizePlate };
})();

if (typeof module !== 'undefined') module.exports = ParkingPricing;

