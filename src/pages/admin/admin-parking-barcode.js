// Code 39 patterns for the characters used in parking codes. Each bit marks a wide element.
// https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/oned/Code39Reader.java
const parkingCode39Patterns = {
  '0': 0x034, '1': 0x121, '2': 0x061, '3': 0x160, '4': 0x031,
  '5': 0x130, '6': 0x070, '7': 0x025, '8': 0x124, '9': 0x064,
  A: 0x109, B: 0x049, C: 0x148, D: 0x019, E: 0x118, F: 0x058,
  G: 0x00D, X: 0x091, '-': 0x085, '*': 0x094
};

function parkingBarcode(code) {
  if (!/^GX-[0-9A-F]{8}$/.test(code)) return '';
  const quietZone = 10;
  const bars = [];
  let x = quietZone;
  for (const symbol of `*${code}*`) {
    const pattern = parkingCode39Patterns[symbol];
    for (let element = 0; element < 9; element++) {
      const width = pattern & (1 << (8 - element)) ? 2 : 1;
      if (element % 2 === 0) bars.push(`<rect x="${x}" width="${width}" height="36"/>`);
      x += width;
    }
    x += 1;
  }
  return `<svg viewBox="0 0 ${x - 1 + quietZone} 36" preserveAspectRatio="none" aria-hidden="true" fill="#000">${bars.join('')}</svg>`;
}

if (typeof module !== 'undefined') module.exports = parkingBarcode;
