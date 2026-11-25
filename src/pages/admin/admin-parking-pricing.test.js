const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepareRates, quote, normalizePlate } = require('./admin-parking-pricing.js');

const monday = new Date('2026-11-16T00:00:00+07:00').getTime();
const day = 24 * 60 * 60 * 1000;
const rates = prepareRates({
  dailyRate: '10000',
  weekdayRates: ['', '12000', '15000', '', '', '', '0'],
  bands: [{ from: '3', through: '5', rate: '8000' }],
  monthlyDiscount: '10'
});

test('one day minimum, a new charge after each full 24 hours', () => {
  assert.equal(quote(rates, monday, monday).days, 1);
  assert.equal(quote(rates, monday, monday + day).total, 12000);
  assert.equal(quote(rates, monday, monday + day + 1).total, 27000);
});

test('weekday prices follow Vietnam time and distinguish blank from zero', () => {
  assert.equal(quote(rates, monday - 1, monday).total, 10000);
  assert.equal(quote(rates, monday + 2 * day, monday + 3 * day).total, 10000);
  assert.equal(quote(rates, monday + 5 * day, monday + 6 * day).total, 0);
});

test('a duration band covers the entire stay, with both endpoints included', () => {
  assert.equal(quote(rates, monday, monday + 3 * day).total, 24000);
  assert.equal(quote(rates, monday, monday + 5 * day).total, 40000);
  assert.equal(quote(rates, monday, monday + 6 * day).total, 57000);
});

test('the monthly discount applies from 30 billed days, including on a duration band', () => {
  const monthly = prepareRates({
    dailyRate: '200', weekdayRates: [], monthlyDiscount: '10',
    bands: [{ from: '30', through: '31', rate: '103' }]
  });
  assert.equal(quote(monthly, monday, monday + 29 * day).discount, 0);
  assert.deepEqual(quote(monthly, monday, monday + 30 * day), {
    days: 30, subtotal: 3090, discount: 309, total: 2781
  });
  const weekdayPrices = quote(rates, monday, monday + 30 * day);
  assert.equal(weekdayPrices.subtotal, 295000);
  assert.equal(weekdayPrices.total, 265500);
});

test('rates reject overlapping bands, inverted ranges and invalid amounts', () => {
  const band = (from, through = '5', rate = '8000') => ({ from, through, rate });
  const policy = { dailyRate: '10000', weekdayRates: [], bands: [], monthlyDiscount: '' };
  assert.equal(prepareRates({ ...policy, bands: [band('3'), band('5', '8')] }).bands.length, 2);
  assert.throws(() => prepareRates({ ...policy, bands: [band('3'), band('4', '8')] }), /Kho/);
  assert.throws(() => prepareRates({ ...policy, bands: [band('6')] }), /khoảng/i);
  assert.throws(() => prepareRates({ ...policy, bands: [band('4', '4', '')] }), /Giá/i);
  assert.throws(() => prepareRates({ ...policy, dailyRate: '' }), /Giá/i);
  assert.throws(() => prepareRates({ ...policy, weekdayRates: ['-1'] }), /Giá/i);
  assert.throws(() => prepareRates({ ...policy, monthlyDiscount: '101' }), /giảm/i);
  assert.equal(prepareRates({ ...policy, dailyRate: '0' }).dailyRate, 0);
});

test('plate comparison ignores letter case, punctuation and spaces', () => {
  assert.equal(normalizePlate(' 59-a1 123.45 '), '59A112345');
});
