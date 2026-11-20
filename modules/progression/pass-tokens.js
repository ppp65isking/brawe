(function (root) {
  'use strict';
  const integer = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  function normalize(pass, maxLevel = 50) {
    pass.xp = integer(pass.xp);
    // Keep previously earned levels, claims and purchases; never re-credit spent tokens.
    pass.level = Math.min(maxLevel, Math.max(1, integer(pass.level), Math.floor(pass.xp / 100) + 1));
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
  function earn(pass, amount, maxLevel = 50) {
    normalize(pass, maxLevel);
    amount = integer(amount);
    if (!amount) return false;
    pass.xp += amount;
    pass.tokensEarned += amount;
    pass.tokenWallet += amount;
    normalize(pass, maxLevel);
    return true;
  }
  const offers = Object.freeze([
    { id: 'coin-cache', name: 'Coin Cache', icon: '🪙', cost: 100, limit: 10, reward: { type: 'coins', amount: 200 } },
    { id: 'soul-cache', name: 'Soul Cache', icon: '✦', cost: 200, limit: 5, reward: { type: 'souls', amount: 30 } },
    { id: 'super-tapper', name: 'Super Tapper', icon: '🎁', cost: 400, limit: 3, reward: { type: 'superTapper', amount: 1 } },
    { id: 'core-cache', name: 'Core Piece Cache', icon: '💠', cost: 800, limit: 3, reward: { type: 'corePieces', amount: 25 } },
    { id: 'random-piece', name: 'Random Piece Bundle', icon: '🧩', cost: 1200, limit: 2, reward: { type: 'randomPiece', amount: 3 } }
  ]);
  function purchase(pass, id, grant) {
    normalize(pass);
    const offer = offers.find(entry => entry.id === id);
    if (!offer || pass.tokenWallet < offer.cost || integer(pass.tokenPurchases[id]) >= offer.limit) return false;
    if (grant(offer.reward) === false) return false;
    pass.tokenWallet -= offer.cost;
    pass.tokenPurchases[id] = integer(pass.tokenPurchases[id]) + 1;
    return true;
  }
  root.BrawePassTokens = Object.freeze({ normalize, earn, purchase, offers });
})(globalThis);
