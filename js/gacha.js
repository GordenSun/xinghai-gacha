/* =========================================================
 * 抽卡逻辑
 * 概率：R 79.2% / SR 20% / SSR 0.8%
 * 十连保底：至少 1 张 SR 及以上（不保底 SSR）
 * 抽卡池仅含已实装角色 (POOL)
 * ========================================================= */

const Gacha = (() => {
  const { RARITY, POOL } = window.GameData;

  function pickRarity() {
    const r = Math.random();
    if (r < RARITY.SSR.rate) return 'SSR';
    if (r < RARITY.SSR.rate + RARITY.SR.rate) return 'SR';
    return 'R';
  }

  function pickByRarity(rarity) {
    let pool = POOL.filter(c => c.rarity === rarity);
    if (!pool.length) {
      // 该品质暂无实装角色时，按 SSR→SR→R 顺序降级取最近的可用池
      for (const rr of ['SSR', 'SR', 'R']) {
        const p = POOL.filter(c => c.rarity === rr);
        if (p.length) { pool = p; break; }
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function rollOne() {
    return pickByRarity(pickRarity());
  }

  function rollTen() {
    const rarities = Array.from({ length: 10 }, () => pickRarity());
    // 十连保底：若全为 R，则随机一张提升为 SR
    if (!rarities.some(r => r !== 'R')) {
      rarities[Math.floor(Math.random() * 10)] = 'SR';
    }
    return rarities.map(pickByRarity);
  }

  return { rollOne, rollTen, pickRarity, pickByRarity };
})();

window.Gacha = Gacha;
