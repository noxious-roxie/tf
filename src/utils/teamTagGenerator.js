// teamTagGenerator.js
// generateTeamTagMap(["Wealthy Weaviles","Three GoGoats"]) -> { "Wealthy Weaviles": "[WW]", ... }

function acronymFromName(name) {
  // split on non-letter tokens and take first letters of words
  const words = name.replace(/[^\w\\s+]/g, ' ').split(/\\s+/).filter(Boolean);
  let ac = words.map(w => w[0]).join('').toUpperCase();
  if (ac.length >= 3) return ac.slice(0,3);
  // if single word or too short, take first 3 letters
  if (words.length === 1) {
    const s = words[0].replace(/[^A-Z]/ig, '');
    return (s.slice(0,3) || s).toUpperCase();
  }
  // pad to 3
  while (ac.length < 3) {
    ac += (words[words.length - 1] || 'X').slice(0,1).toUpperCase();
  }
  return ac.slice(0,3);
}

export function generateTeamTagMap(teamNames = []) {
  const map = {};
  const used = new Set();
  for (const t of teamNames) {
    const base = acronymFromName(t);
    let candidate = base;
    let i = 1;
    while (used.has(candidate)) {
      candidate = (base.slice(0,2) + String(i)).toUpperCase();
      i++;
    }
    used.add(candidate);
    map[t] = `[${candidate}]`;
  }
  return map;
}
