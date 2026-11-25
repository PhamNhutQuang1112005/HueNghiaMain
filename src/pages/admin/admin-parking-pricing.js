const ParkingPricing = (() => {
  const dayMs = 24 * 60 * 60 * 1000;
  const weekdayFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short'
  });
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function integer(value, min, max, label) {
    const number = Number(value);
    if (value == null || String(value).trim() === '' || !Number.isInteger(number) || number < min || number > max) {
      throw new Error(`${label} phải là số nguyên từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')}.`);
    }
    return number;
  }

  function prepareRates({ dailyRate, weekdayRates, bands, monthlyDiscount }) {
    const money = (value, label) => integer(value, 0, 999999999, label);
    const base = money(dailyRate, 'Giá mặc định');
    const weekly = Array.from({ length: 7 }, (_, index) => {
      const rate = weekdayRates[index];
      return rate == null || rate === '' ? null : money(rate, 'Giá theo thứ');
    });
    const ranges = bands.map(({ from, through, rate }) => ({
      from: integer(from, 1, 36500, 'Ngày bắt đầu'),
      through: integer(through, 1, 36500, 'Ngày kết thúc'),
      rate: money(rate, 'Giá theo khoảng ngày')
    })).sort((a, b) => a.from - b.from);
    ranges.forEach((band, index) => {
      if (band.from > band.through) throw new Error('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc của khoảng.');
      if (index && band.from !== ranges[index - 1].through) throw new Error('Kho\u1ea3ng ng\u00e0y ti\u1ebfp theo ph\u1ea3i b\u1eaft \u0111\u1ea7u t\u1ea1i m\u1ed1c k\u1ebft th\u00fac c\u1ee7a kho\u1ea3ng tr\u01b0\u1edbc.');
    });
    return {
      dailyRate: base, weekdayRates: weekly, bands: ranges,
      monthlyDiscount: integer(monthlyDiscount || 0, 0, 100, 'Mức giảm khi gửi từ 30 ngày')
    };
  }

  function quote(rates, receivedAt, returnedAt) {
    const days = Math.max(1, Math.ceil((returnedAt - receivedAt) / dayMs));
    const band = rates.bands.find(({ from, through }) => from <= days && days <= through);
    let subtotal;
    if (band) {
      subtotal = days * band.rate;
    } else {
      const daily = rates.weekdayRates.map(rate => rate ?? rates.dailyRate);
      const first = weekdays.indexOf(weekdayFormat.format(receivedAt));
      const weekTotal = daily.reduce((sum, rate) => sum + rate, 0);
      subtotal = Math.floor(days / 7) * weekTotal;
      for (let offset = 0; offset < days % 7; offset++) {
        subtotal += daily[(first + offset) % 7];
      }
    }
    const discount = days >= 30 ? Math.round(subtotal * rates.monthlyDiscount / 100) : 0;
    return { days, subtotal, discount, total: subtotal - discount };
  }

  function normalizePlate(plate) {
    return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  return { dayMs, prepareRates, quote, normalizePlate };
})();

if (typeof module !== 'undefined') module.exports = ParkingPricing;
