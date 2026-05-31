/* TapColor — palette generation & color helpers
   The palette is an additive RGB light field rendered to an offscreen
   buffer at a FIXED internal resolution. That makes pixel colors stable
   regardless of viewport size, and lets the game read the exact color
   under any click via getImageData. */

(function () {
  const BW = 1280;   // internal buffer width
  const BH = 800;    // internal buffer height (1.6 ratio, ~ the reference)

  // HSV -> RGB (h in degrees, s/v in 0..1)
  function hsv2rgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r, g, b;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  function buildBuffer() {
    const cv = document.createElement('canvas');
    cv.width = BW; cv.height = BH;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(BW, BH);
    const d = img.data;

    // Classic RGB stretch:
    //   x  -> hue sweeps the full spectrum (red -> ... -> red)
    //   top half  : white -> full colour (saturation 0 -> 1, value 1)
    //   bottom half: full colour -> black (value 1 -> 0, saturation 1)
    for (let y = 0; y < BH; y++) {
      const ny = y / (BH - 1);
      let s, v;
      if (ny < 0.5) { s = ny / 0.5; v = 1; }
      else { s = 1; v = 1 - (ny - 0.5) / 0.5; }
      for (let x = 0; x < BW; x++) {
        const hue = (x / (BW - 1)) * 360;
        const c = hsv2rgb(hue, s, v);
        const idx = (y * BW + x) * 4;
        d[idx]     = c[0];
        d[idx + 1] = c[1];
        d[idx + 2] = c[2];
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return { canvas: cv, ctx, data: d, w: BW, h: BH };
  }

  // sample color at normalized coords (0..1)
  function sampleNorm(buf, nx, ny) {
    let x = Math.round(nx * (buf.w - 1));
    let y = Math.round(ny * (buf.h - 1));
    if (x < 0) x = 0; if (x >= buf.w) x = buf.w - 1;
    if (y < 0) y = 0; if (y >= buf.h) y = buf.h - 1;
    const i = (y * buf.w + x) * 4;
    return [buf.data[i], buf.data[i + 1], buf.data[i + 2]];
  }

  // Euclidean RGB distance; max ~441.67
  const MAX_DIST = Math.sqrt(255 * 255 * 3);
  function dist(a, b) {
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function toHex(c) {
    return '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // Pick a fair target: a real palette pixel that is neither near-black,
  // near-white, nor low-saturation (those are ambiguous / trivial).
  function pickTarget(buf) {
    for (let tries = 0; tries < 4000; tries++) {
      const nx = 0.04 + Math.random() * 0.92;
      const ny = 0.10 + Math.random() * 0.78;
      const c = sampleNorm(buf, nx, ny);
      const mx = Math.max(c[0], c[1], c[2]);
      const mn = Math.min(c[0], c[1], c[2]);
      const sum = c[0] + c[1] + c[2];
      if (sum < 150) continue;          // too dark
      if (mn > 224) continue;           // too white
      if (mx - mn < 55) continue;       // too gray / unsaturated
      return { rgb: c, hex: toHex(c) };
    }
    const c = sampleNorm(buf, 0.5, 0.5);
    return { rgb: c, hex: toHex(c) };
  }

  window.TapPalette = { buildBuffer, sampleNorm, dist, toHex, pickTarget, MAX_DIST, BW, BH };
})();
