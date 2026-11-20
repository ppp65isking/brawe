(function (root) {
  'use strict';
  const integer = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  // Per-tier XP table (optional 38,950 pass model, 2026-11-20): when a
  // table of maxLevel-1 positive entries is passed, the level is derived
  // from XP alone — an old save's stored level is NOT kept, or a 4,900-XP
  // save would stay at tier 50 under the new 38,950 total. Without a
  // table the old flat-100 behaviour is preserved verbatim.
  function levelForXp(xp, maxLevel, xpTable) {
    if (Array.isArray(xpTable) && xpTable.length === Math.max(0, maxLevel - 1) && xpTable.every(v => Number.isFinite(v) && v > 0)) {
      let remaining = integer(xp), level = 1;
      for (let i = 0; i < xpTable.length && remaining >= xpTable[i]; i++) { remaining -= xpTable[i]; level++; }
      return Math.min(maxLevel, level);
    }
    return null;
  }
  function normalize(pass, maxLevel = 50, xpTable) {
    pass.xp = integer(pass.xp);
    // Keep previously earned levels, claims and purchases; never re-credit spent tokens.
    const tableLevel = levelForXp(pass.xp, maxLevel, xpTable);
    pass.level = tableLevel != null ? tableLevel : Math.min(maxLevel, Math.max(1, integer(pass.level), Math.floor(pass.xp / 100) + 1));
    if (pass.tokenSchema !== 1) {
      pass.tokensEarned = pass.xp;
      pass.tokenWallet = pass.xp;
      pass.tokenPurchases = {};
      pass.tokenSchema = 1;
    }
    pass.tokensEarned = integer(pass.tokensEarned);
    pass.tokenWallet = Math.min(pass.tokensEarned, integer(pass.tokenWallet));
    if (!pass.tokenPurchases || typeof pass.tokenPurchases !== 'object') pass.tokenPurchases = {};
    return pass;
  }
  function earn(pass, amount, maxLevel = 50, xpTable) {
    normalize(pass, maxLevel, xpTable);
    amount = integer(amount);
    if (!amount) return false;
    pass.xp += amount;
    pass.tokensEarned += amount;
    pass.tokenWallet += amount;
    normalize(pass, maxLevel, xpTable);
    return true;
  }
  const offers = Object.freeze([
    { id: 'coin-cache', name: 'Coin Cache', icon: '🪙', cost: 100, limit: 10, reward: { type: 'coins', amount: 200 } },
    { id: 'soul-cache', name: 'Soul Cache', icon: '✦', cost: 200, limit: 5, reward: { type: 'souls', amount: 30 } },
    { id: 'super-tapper', name: 'Super Tapper', icon: '🎁', cost: 400, limit: 3, reward: { type: 'superTapper', amount: 1 } },
    { id: 'core-cache', name: 'Core Piece Cache', icon: '💠', cost: 800, limit: 3, reward: { type: 'corePieces', amount: 25 } },
    { id: 'random-piece', name: 'Random Piece Bundle', icon: '🧩', cost: 1200, limit: 2, reward: { type: 'randomPiece', amount: 3 } }
  ]);
  function purchase(pass, id, grant, xpTable) {
    normalize(pass, undefined, xpTable);
    const offer = offers.find(entry => entry.id === id);
    if (!offer || pass.tokenWallet < offer.cost || integer(pass.tokenPurchases[id]) >= offer.limit) return false;
    if (grant(offer.reward) === false) return false;
    pass.tokenWallet -= offer.cost;
    pass.tokenPurchases[id] = integer(pass.tokenPurchases[id]) + 1;
    return true;
  }
  root.BrawePassTokens = Object.freeze({ normalize, earn, purchase, offers });
})(globalThis);
