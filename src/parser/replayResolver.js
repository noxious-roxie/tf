// replayResolver.js
// Input: matches[] from OP parse, posts[] from postParser
// Output: matches with attached replay(s) and winner detection

function normalizeName(n) {
  return (n || '').trim().toLowerCase().replace(/^@/, '');
}

export function resolveReplaysToMatches(matches, posts) {
  // copy matches and ensure players exist arrays
  const resolved = matches.map((m, idx) => {
    return {
      id: 'm' + idx,
      tier: m.tier || null,
      team1: m.team1 || null,
      team2: m.team2 || null,
      p1: m.p1 || null,
      p2: m.p2 || null,
      replays: [],
      claims: [],
      raw: m.raw
    };
  });

  // Build player->match index for quick lookup (for known p1/p2)
  const nameIndex = new Map();
  for (const mm of resolved) {
    if (mm.p1) nameIndex.set(normalizeName(mm.p1), mm.id);
    if (mm.p2) nameIndex.set(normalizeName(mm.p2), mm.id);
  }

  // For each post with replays, attempt to map each replay to a match
  for (const post of posts) {
    for (const replay of post.replays) {
      // heuristic 1: check if post text contains both player names known from matches
      let matched = null;
      const textLower = (post.text || '').toLowerCase();
      for (const mm of resolved) {
        if (!mm.p1 || !mm.p2) continue;
        if (textLower.includes(mm.p1.toLowerCase()) && textLower.includes(mm.p2.toLowerCase())) {
          matched = mm;
          break;
        }
      }
      // heuristic 2: if post text contains single known player name -> map to their match
      if (!matched) {
        for (const [name, matchId] of nameIndex.entries()) {
          if (textLower.includes(name)) {
            matched = resolved.find(x => x.id === matchId);
            break;
          }
        }
      }
      // heuristic 3: try to extract player names from the replay url query if present (some replays include ?p2 or similar)
      if (!matched) {
        try {
          const u = new URL(replay);
          // sometimes /.../gen9-...-243...-<hash>?p2 or without names. we won't fetch replay to avoid heavy calls.
          // but if the pathname contains player names separated by '-' heuristics, try to split last section
          const parts = u.pathname.split('/');
          const tail = parts[parts.length - 1] || '';
          const nameCandidates = tail.split('-').filter(Boolean).slice(-3);
          // check if any candidate matches known names
          for (const cand of nameCandidates) {
            const lower = cand.toLowerCase();
            if (nameIndex.has(lower)) {
              const mm = resolved.find(x => x.id === nameIndex.get(lower));
              if (mm) { matched = mm; break; }
            }
          }
        } catch (e) { /* ignore */ }
      }

      // if still not matched and post has claims e.g., "Heysup won", map to claim
      if (!matched && post.claims && post.claims.length) {
        const c = post.claims[0];
        if (c.type === 'claim-win' && c.who) {
          const who = normalizeName(c.who);
          if (nameIndex.has(who)) {
            matched = resolved.find(x => x.id === nameIndex.get(who));
          } else {
            // try find match where p1 or p2 equals who
            matched = resolved.find(x => normalizeName(x.p1) === who || normalizeName(x.p2) === who);
          }
        } else if (c.type === 'beat' && c.winner && c.loser) {
          const w = normalizeName(c.winner);
          const l = normalizeName(c.loser);
          matched = resolved.find(x => normalizeName(x.p1) === w && normalizeName(x.p2) === l || normalizeName(x.p1) === l && normalizeName(x.p2) === w);
        }
      }

      // If matched attach; else append to a global unassigned queue
      if (matched) {
        matched.replays.push({ url: replay, postedBy: post.username || '', postText: post.text });
        // if claim indicates a winner we can set winner
        if (post.claims && post.claims.length) matched.claims.push(...post.claims);
      } else {
        // add a synthetic 'needsReview' placeholder matched to first ambiguous match containing one known player only
        const ambiguous = resolved.find(x => (x.p1 && post.text.toLowerCase().includes(x.p1.toLowerCase())) || (x.p2 && post.text.toLowerCase().includes(x.p2.toLowerCase())));
        if (ambiguous) {
          ambiguous.replays.push({ url: replay, postedBy: post.username || '', postText: post.text, note: 'ambiguous' });
        } else {
          // push to a global bucket (we attach to first match as fallback)
          if (resolved.length) resolved[0].replays.push({ url: replay, postedBy: post.username || '', postText: post.text, note: 'unmatched-fallback' });
        }
      }
    }

    // also register textual claims (no replay)
    if (post.claims && post.claims.length) {
      for (const claim of post.claims) {
        // map claim to match if possible
        if (claim.type === 'posting-for' && claim.who) {
          // do nothing; handled when replays present
        } else if (claim.type === 'claim-win' && claim.who) {
          const who = normalizeName(claim.who);
          const mm = resolved.find(x => normalizeName(x.p1) === who || normalizeName(x.p2) === who);
          if (mm) mm.claims.push({ claim });
        }
      }
    }
  }

  return resolved;
}
