const assert = require('node:assert/strict');
const { test } = require('node:test');
const parkingBarcode = require('./admin-parking-barcode.js');

function barcodeRow(svg) {
  const [, width] = svg.match(/viewBox="0 0 (\d+) \d+"/);
  const pixels = Array(Number(width)).fill('0');
  for (const [, x, barWidth] of svg.matchAll(/<rect x="(\d+)" width="(\d+)"/g)) {
    pixels.fill('1', Number(x), Number(x) + Number(barWidth));
  }
  return pixels.join('');
}

test('the barcode encodes the parking code with start and stop characters and quiet zones', () => {
  // Reference Code 39 patterns for *GX-0123ABCD* with narrow = 1 and wide = 2.
  const expectedSymbols = [
    '100101101101', '101010011011', '100101101011', '100101011011',
    '101001101101', '110100101011', '101100101011', '110110010101',
    '110101001011', '101101001011', '110110100101', '101011001011',
    '100101101101'
  ];
  assert.equal(barcodeRow(parkingBarcode('GX-0123ABCD')), `0000000000${expectedSymbols.join('0')}0000000000`);
});

test('the bars change with the code and unsupported records keep their plain-text label', () => {
  assert.notEqual(parkingBarcode('GX-4567EF89'), parkingBarcode('GX-0123ABCD'));
  assert.equal(parkingBarcode('GX-<bad>'), '');
});
