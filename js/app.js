/* =========================================================
 * 星海绮谭 · 主程序
 * 状态存档 / 剪影墙 / 图鉴 / 抽卡动画 / 详情弹窗
 * ========================================================= */
(() => {
  const { RARITY, CATEGORIES, CHARACTERS, CHAR_BY_ID } = window.GameData;
  const STORE_KEY = 'xinghai_save_v1';

  /* ---------- 工具 ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const pad2 = n => String(n).padStart(2, '0');
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const charImg = c => `assets/characters/c${pad2(c.id)}.png`;
  const cardBg = r => `assets/cards/bg_${r}.png`;
  const cardBack = 'assets/card-back.png';
  const stars = r => '★'.repeat(RARITY[r].stars);

  /* ---------- 状态 ---------- */
  let state = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.owned) return s;
    } catch (e) {}
    return { owned: {}, pulls: 0, ssr: 0 };
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  function isOwned(id) { return !!state.owned[id]; }
  function grant(c) {
    const isNew = !state.owned[c.id];
    state.owned[c.id] = (state.owned[c.id] || 0) + 1;
    if (c.rarity === 'SSR') state.ssr++;
    return isNew;
  }

  /* ---------- 图片处理：绿幕抠图 + 卡背景兜底 ---------- */
  function applyChroma(imgEl, src) {
    ChromaKey.process(src).then(url => { imgEl.src = url; })
      .catch(() => { imgEl.style.display = 'none'; });
  }
  function setBg(el, url, fallbackClass) {
    el.classList.add(fallbackClass);
    const t = new Image();
    t.onload = () => { el.style.backgroundImage = `url(${url})`; };
    t.src = url;
  }

  /* ---------- 顶部计数 ---------- */
  function updateCount() {
    $('#ownedCount').textContent = Object.keys(state.owned).length;
    $('#totalCount').textContent = CHARACTERS.length;
  }

  /* ============ 剪影墙 · 大合影 ============ */
  // 分排：后排人多、个小、靠上；前排人少、个大、靠下，前排遮挡后排，营造纵深合影
  const WALL_ROWS = [
    { count: 12, scale: 0.74 },
    { count: 11, scale: 0.80 },
    { count: 10, scale: 0.86 },
    { count: 10, scale: 0.92 },
    { count: 9,  scale: 0.96 },
    { count: 8,  scale: 1.00 },
  ];
  function buildWallCell(c) {
    const cell = document.createElement('div');
    cell.className = `cell q-${c.rarity}`;
    const owned = c.implemented && isOwned(c.id);
    if (owned) cell.classList.add('owned');
    if (!c.implemented) cell.classList.add('locked');
    const img = document.createElement('img');
    img.className = 'cell-img';
    img.alt = owned ? c.name : '';
    if (c.implemented) applyChroma(img, charImg(c));
    cell.appendChild(img);
    cell.insertAdjacentHTML('beforeend',
      `<span class="cell-name">${owned ? c.name : ''}</span>`);
    if (c.implemented) cell.addEventListener('click', () => openDetail(c));
    return cell;
  }
  function renderWall() {
    const wall = $('#silhouetteWall');
    wall.innerHTML = '';
    let i = 0;
    const makeRow = (scale) => {
      const row = document.createElement('div');
      row.className = 'wall-row';
      row.style.setProperty('--row-scale', scale);
      return row;
    };
    WALL_ROWS.forEach(def => {
      if (i >= CHARACTERS.length) return;
      const row = makeRow(def.scale);
      const end = Math.min(i + def.count, CHARACTERS.length);
      for (; i < end; i++) row.appendChild(buildWallCell(CHARACTERS[i]));
      wall.appendChild(row);
    });
    // 角色多于预设分排时，余下的并入最前排
    if (i < CHARACTERS.length) {
      const row = makeRow(1);
      for (; i < CHARACTERS.length; i++) row.appendChild(buildWallCell(CHARACTERS[i]));
      wall.appendChild(row);
    }
  }

  /* ============ 图鉴 ============ */
  let filterRarity = 'all', filterOwn = 'all';
  function renderGallery() {
    const grid = $('#galleryGrid');
    grid.innerHTML = '';
    CHARACTERS.filter(c => {
      if (filterRarity !== 'all' && c.rarity !== filterRarity) return false;
      if (filterOwn === 'owned' && !isOwned(c.id)) return false;
      if (filterOwn === 'locked' && isOwned(c.id)) return false;
      return true;
    }).forEach(c => grid.appendChild(buildCard(c)));
    if (!grid.children.length) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:40px">这里还空空如也～</p>`;
    }
  }

  function buildCard(c) {
    const card = document.createElement('div');
    card.className = `card q-${c.rarity}`;
    if (!c.implemented) {
      card.classList.add('unimplemented');
      card.innerHTML = `<div class="card-bg fallback-${c.rarity}"></div>
        <span class="card-q">${c.rarity}</span>
        <div class="soon-box"><div class="qm">?</div><div>敬请期待</div></div>`;
      return card;
    }
    const owned = isOwned(c.id);
    if (!owned) card.classList.add('locked');
    const bg = document.createElement('div');
    bg.className = 'card-bg';
    setBg(bg, cardBg(c.rarity), `fallback-${c.rarity}`);
    card.appendChild(bg);
    const img = document.createElement('img');
    img.className = 'card-char';
    applyChroma(img, charImg(c));
    card.appendChild(img);
    card.insertAdjacentHTML('beforeend',
      `<div class="card-frame"></div>       <span class="card-q">${c.rarity}</span>
       <div class="card-info">
         <div class="card-stars">${stars(c.rarity)}</div>
         <div class="card-name">${owned ? c.name : '？？？'}</div>
         <div class="card-title">${owned ? c.title : '尚未获得'}</div>
       </div>`);
    card.addEventListener('click', () => openDetail(c));
    return card;
  }

  /* ============ 角色详情 ============ */
  function openDetail(c) {
    const owned = isOwned(c.id);
    const panel = $('#detailPanel');
    panel.className = `detail-panel q-${c.rarity}`;
    if (!c.implemented) {
      panel.innerHTML = `<button class="detail-close" data-close="detail">✕</button>
        <div class="d-locked"><div style="font-size:48px">?</div>
        <h3 style="margin:10px 0">敬请期待</h3>
        <p>${c.title} · ${c.rarity}</p>
        <p style="margin-top:10px;font-size:13px">这位少女的立绘正在绘制中……</p></div>`;
      showOverlay('detail'); return;
    }

    const art = document.createElement('div');
    art.className = 'detail-art';
    const dbg = document.createElement('div'); dbg.className = 'd-bg';
    setBg(dbg, cardBg(c.rarity), `fallback-${c.rarity}`);
    const dchar = document.createElement('img'); dchar.className = 'd-char';
    applyChroma(dchar, charImg(c));
    if (!owned) dchar.style.filter = 'brightness(0) saturate(0)', dchar.style.opacity = '.55';
    art.appendChild(dbg); art.appendChild(dchar);
    art.insertAdjacentHTML('beforeend', '<div class="d-grad"></div>');

    const info = document.createElement('div');
    info.className = 'detail-info';
    info.innerHTML = owned ? `
        <div><span class="d-q">${c.rarity}</span><span class="d-stars">${stars(c.rarity)}</span></div>
        <div class="d-name">${c.name}</div>
        <div class="d-title">「${c.title}」</div>
        <div class="d-tags">
          <span class="d-tag">元素 · ${c.element}</span>
        </div>
        <div class="d-stats">
          <div class="d-stat"><div class="v">${c.hp}</div><div class="k">生命 HP</div></div>
          <div class="d-stat"><div class="v">${c.atk}</div><div class="k">攻击 ATK</div></div>
        </div>
        <div class="d-bio"><div class="d-bio-label">人 物 小 传</div>${c.bio}</div>
      ` : `
        <div><span class="d-q">${c.rarity}</span><span class="d-stars">${stars(c.rarity)}</span></div>
        <div class="d-name">？？？</div>
        <div class="d-title">「${c.title}」</div>
        <div class="d-tags"><span class="d-tag">尚未获得</span></div>
        <div class="d-bio"><div class="d-bio-label">尚 未 邂 逅</div>她仍隐没在星海之中。抽取召唤，点亮她的剪影，便能读到属于她的故事。</div>
      `;

    panel.innerHTML = '<button class="detail-close" data-close="detail">✕</button>';
    panel.appendChild(art); panel.appendChild(info);
    showOverlay('detail');
  }

  /* ============ 抽卡动画 ============ */
  let animating = false;
  const stage = $('#gachaStage');
  const summary = $('#resultSummary');

  function flipCardHTML(c) {
    return `<div class="flip-card"><div class="flip-inner">
      <div class="flip-face flip-back"><img src="${cardBack}" alt=""></div>
      <div class="flip-face flip-front"><div class="card q-${c.rarity}" id="frontCard"></div></div>
    </div></div>`;
  }

  function fillFrontCard(host, c) {
    host.className = `card q-${c.rarity}`;
    const bg = document.createElement('div'); bg.className = 'card-bg';
    setBg(bg, cardBg(c.rarity), `fallback-${c.rarity}`);
    const img = document.createElement('img'); img.className = 'card-char';
    applyChroma(img, charImg(c));
    host.appendChild(bg); host.appendChild(img);
    host.insertAdjacentHTML('beforeend',
      `<div class="card-frame"></div>       <span class="card-q">${c.rarity}</span>
       <div class="card-info"><div class="card-stars">${stars(c.rarity)}</div>
       <div class="card-name">${c.name}</div><div class="card-title">${c.title}</div></div>`);
  }

  async function playSingle(c, isNew) {
    stage.innerHTML = flipCardHTML(c) +
      `<div class="fx q-${c.rarity}"><div class="rays"></div><div class="burst"></div></div>
       <div class="single-info q-${c.rarity}">
         <div class="si-stars">${stars(c.rarity)}</div>
         <div class="si-name">${c.name}${isNew ? ' <small style="color:var(--gold)">NEW</small>' : ''}</div>
         <div class="si-title">「${c.title}」</div>
         <div class="si-tip">点击查看小传 · 或点击空白继续</div>
       </div>`;
    fillFrontCard($('#frontCard'), c);
    summary.classList.remove('active');
    showOverlay('gacha');

    await delay(420);
    $('.flip-card').classList.add('flipped');
    $('.fx').classList.add('show');
    await delay(640);
    $('.single-info').classList.add('show');
    // 点击立绘看详情
    $('#frontCard').addEventListener('click', e => { e.stopPropagation(); closeOverlay('gacha'); openDetail(c); });
    animating = false;
  }

  async function playTen(results) {
    const top = results.reduce((m, c) => RARITY[c.rarity].stars > RARITY[m.rarity].stars ? c : m, results[0]);
    stage.innerHTML = `<div class="fx q-${top.rarity} show"><div class="rays"></div><div class="burst"></div></div>`;
    summary.innerHTML = `<h3>十连召唤结果</h3>
      <div class="result-grid"></div>
      <div class="summary-actions">
        <button class="btn-again" id="againBtn">再抽十连</button>
        <button class="btn-close" id="closeSummary">完 成</button>
      </div>`;
    const grid = $('.result-grid', summary);
    showOverlay('gacha');
    summary.classList.add('active');

    for (let i = 0; i < results.length; i++) {
      const c = results[i];
      const mini = document.createElement('div');
      mini.className = `mini-card card q-${c.rarity} mini-pop` + (results._new[i] ? ' new' : '');
      const bg = document.createElement('div'); bg.className = 'card-bg';
      setBg(bg, cardBg(c.rarity), `fallback-${c.rarity}`);
      const img = document.createElement('img'); img.className = 'card-char';
      applyChroma(img, charImg(c));
      mini.appendChild(bg); mini.appendChild(img);
      mini.insertAdjacentHTML('beforeend',
        `<div class="card-frame"></div><span class="card-q" style="font-size:9px;padding:1px 5px">${c.rarity}</span>
         <div class="card-info" style="padding:16px 4px 4px"><div class="card-name" style="font-size:11px">${c.name}</div></div>`);
      mini.style.animationDelay = (i * 55) + 'ms';
      mini.addEventListener('click', e => { e.stopPropagation(); closeOverlay('gacha'); openDetail(c); });
      grid.appendChild(mini);
    }
    $('#closeSummary').addEventListener('click', e => { e.stopPropagation(); closeOverlay('gacha'); });
    $('#againBtn').addEventListener('click', e => { e.stopPropagation(); doPull(10); });
    animating = false;
  }

  /* ============ 执行抽卡 ============ */
  function doPull(n) {
    if (animating) return;
    animating = true;
    state.pulls += n;
    if (n === 1) {
      const c = Gacha.rollOne();
      const isNew = grant(c);
      save(); refreshAll();
      playSingle(c, isNew);
    } else {
      const results = Gacha.rollTen();
      results._new = results.map(c => grant(c));
      save(); refreshAll();
      playTen(results);
    }
  }

  /* ============ 遮罩控制 ============ */
  function showOverlay(name) { $(`#${name}Overlay`).classList.add('active'); }
  function closeOverlay(name) {
    $(`#${name}Overlay`).classList.remove('active');
    if (name === 'gacha') { stage.innerHTML = ''; summary.classList.remove('active'); summary.innerHTML = ''; animating = false; }
  }

  /* ============ 刷新 ============ */
  function refreshAll() { updateCount(); renderWall(); renderGallery(); }

  /* ============ 事件绑定 ============ */
  function bind() {
    $('#btnPull1').addEventListener('click', () => doPull(1));
    $('#btnPull10').addEventListener('click', () => doPull(10));

    $$('.tab').forEach(t => t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const v = t.dataset.view;
      $$('.view').forEach(x => x.classList.remove('active'));
      $(`#view-${v}`).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));

    $('#filterRarity').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      $$('#filterRarity .chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); filterRarity = b.dataset.rar; renderGallery();
    });
    $('#filterOwn').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      $$('#filterOwn .chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); filterOwn = b.dataset.own; renderGallery();
    });

    // 跳过 / 点击空白关闭抽卡
    $('#skipBtn').addEventListener('click', () => closeOverlay('gacha'));
    $('.gacha-overlay .overlay-bg').addEventListener('click', () => { if (!summary.classList.contains('active')) closeOverlay('gacha'); });
    $('#gachaStage').addEventListener('click', () => { if (!summary.classList.contains('active')) closeOverlay('gacha'); });

    // 关闭详情
    document.addEventListener('click', e => {
      if (e.target.dataset.close === 'detail') closeOverlay('detail');
    });
  }

  /* ============ 初始化 ============ */
  function init() { bind(); refreshAll(); }
  document.addEventListener('DOMContentLoaded', init);
})();
