// threadParser.js
export async function fetchThreadHTML(url) {
  // Try direct fetch, then fallback to proxy if cross-origin fails
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Direct fetch failed');
    const txt = await res.text();
    return txt;
  } catch (err) {
    const proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);
    const res2 = await fetch(proxy);
    if (!res2.ok) throw new Error('Proxy fetch failed');
    return await res2.text();
  }
}

/**
 * parseOpMatches(htmlOrText)
 * - tries to find match lines in the OP
 * - returns array of {tier, team1, team2, p1, p2, raw}
 */
export function parseOpMatches(htmlOrText) {
  // If html, try extracting OP message body
  let text = htmlOrText;
  try {
    const doc = new DOMParser().parseFromString(htmlOrText, 'text/html');
    const opEl = doc.querySelector('.message-body') || doc.querySelector('.message-content') || doc.body;
    text = opEl ? opEl.innerText : doc.body.innerText;
  } catch (e) {
    text = htmlOrText;
  }
  text = text.replace(/\r/g, '');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const matches = [];
  let currentTier = null;

  // Heuristics:
  // - lines with "Replays" or "Week" are headers
  // - lines like "SV OU" or "SV Ubers" are tiers
  for (const line of lines) {
    // detect tier header lines (e.g., "SV OU" or "SV Ubers")
    const tierMatch = line.match(/^(SV|SS|SM|ORAS|BW|DPP|ADV|GSC|RBY|NATDEX|SV|SS|SM|SS|SV).*/i);
    if (tierMatch && line.toLowerCase().includes(' ')) {
      currentTier = line;
      continue;
    }

    // detect team-vs-team block headers: e.g., "US South (5) vs (3) LATAM"
    const teamBlock = line.match(/^(.+?)\s+\(\d+\)\s+vs\s+\(\d+\)\s+(.+)$/i);
    if (teamBlock) {
      // store team names for later detection
      const leftTeam = teamBlock[1].trim();
      const rightTeam = teamBlock[2].trim();
      // We don't treat as a match line but we will include as team header in teams extraction
      // Add a pseudo-match placeholder so OP teams are captured by other logic later
      matches.push({ tier: currentTier, team1: leftTeam, team2: rightTeam, p1: null, p2: null, raw: line, autoTeamHeader: true });
      continue;
    }

    // detect normal match lines like: "SV LC: Stories vs seraphz"
    const matchLine = line.match(/^(?:([A-Za-z0-9\\s\\-]+):)?\\s*(.+?)\\s+vs\\s+(.+)$/i);
    if (matchLine) {
      const maybeTier = matchLine[1] ? matchLine[1].trim() : currentTier;
      let left = matchLine[2].trim();
      let right = matchLine[3].trim();
      // if left/right include "SV LC" or "RBY OU" prefix inside player string, try to clean
      left = left.replace(/^(?:SV|SS|SM|ORAS|BW|DPP|ADV|GSC|RBY)\\s*/i, '').trim();
      right = right.replace(/^(?:SV|SS|SM|ORAS|BW|DPP|ADV|GSC|RBY)\\s*/i, '').trim();

      matches.push({
        tier: maybeTier,
        team1: null,
        team2: null,
        p1: left,
        p2: right,
        raw: line
      });
      continue;
    }
  }

  return matches;
}

/**
 * extractTeamNamesFromOp(htmlOrText)
 * - looks for team-vs-team block lines and returns unique team names
 */
export function extractTeamNamesFromOp(htmlOrText) {
  let text = htmlOrText;
  try {
    const doc = new DOMParser().parseFromString(htmlOrText, 'text/html');
    const opEl = doc.querySelector('.message-body') || doc.querySelector('.message-content') || doc.body;
    text = opEl ? opEl.innerText : doc.body.innerText;
  } catch (e) {
    text = htmlOrText;
  }
  text = text.replace(/\r/g, '');
  const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);

  const teams = new Set();
  for (const line of lines) {
    // team-vs-team with counts: "US South (5) vs (3) LATAM"
    const tb = line.match(/^(.+?)\\s+\\(\\d+\\)\\s+vs\\s+\\(\\d+\\)\\s+(.+)$/i);
    if (tb) {
      teams.add(tb[1].trim());
      teams.add(tb[2].trim());
      continue;
    }
    // also check "Team A vs Team B" where team names are capitalized and likely not players
    const teamVs = line.match(/^(.{3,40})\\s+vs\\s+(.{3,40})$/i);
    if (teamVs) {
      // heuristic: if both sides contain spaces or capital letters (likely team names), include
      const left = teamVs[1].trim(), right = teamVs[2].trim();
      if (left.match(/[A-Z]/) && left.split(' ').length >= 1 && right.match(/[A-Z]/)) {
        teams.add(left); teams.add(right);
      }
    }
  }
  return Array.from(teams);
}
