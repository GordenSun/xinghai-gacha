/* =========================================================
 * 绿幕抠图 (Chroma Key)
 * 把纯绿背景立绘的绿色像素变透明，去除绿色溢出边缘，
 * 并自动裁剪到人物边界，输出透明 PNG 的 dataURL（带缓存）。
 * 剪影通过 CSS filter:brightness(0) 实现，无需单独生成。
 * ========================================================= */

const ChromaKey = (() => {
  const cache = new Map();     // src -> dataURL
  const pending = new Map();   // src -> Promise

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image load failed: ' + src));
      img.src = src;
    });
  }

  /* 核心抠图：返回处理后的 canvas */
  function keyOut(img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const p = imgData.data;

    let minX = w, minY = h, maxX = 0, maxY = 0, hasPixel = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = p[i], g = p[i + 1], b = p[i + 2];
        // “绿度”：绿色比红蓝都明显高即视为绿幕
        const greenness = g - Math.max(r, b);

        if (greenness > 55 && g > 80) {
          p[i + 3] = 0;                       // 纯绿 → 全透明
        } else if (greenness > 18) {
          // 半透明边缘：羽化 + 去绿溢出，避免人物边缘发绿
          const a = 1 - (greenness - 18) / 37;
          p[i + 3] = Math.round(p[i + 3] * Math.max(0, a));
          const cap = Math.round((r + b) / 2 + 12);
          if (g > cap) p[i + 1] = cap;
        }

        if (p[i + 3] > 24) {
          hasPixel = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    if (!hasPixel) return cv;

    // 裁剪到人物边界（留 2% 留白），统一不同立绘的构图
    const padX = Math.round(w * 0.02), padY = Math.round(h * 0.02);
    minX = Math.max(0, minX - padX); minY = Math.max(0, minY - padY);
    maxX = Math.min(w - 1, maxX + padX); maxY = Math.min(h - 1, maxY + padY);
    const cw = maxX - minX + 1, ch = maxY - minY + 1;

    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(cv, minX, minY, cw, ch, 0, 0, cw, ch);
    return out;
  }

  async function process(src) {
    if (cache.has(src)) return cache.get(src);
    if (pending.has(src)) return pending.get(src);

    const task = (async () => {
      const img = await loadImage(src);
      const cv = keyOut(img);
      const url = cv.toDataURL('image/png');
      cache.set(src, url);
      pending.delete(src);
      return url;
    })();

    pending.set(src, task);
    return task;
  }

  return { process, loadImage };
})();

window.ChromaKey = ChromaKey;
