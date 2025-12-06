// postParser.js
// Parse posts/replies in the thread HTML and extract: postId, username, text, replays[], claims[]

export function parsePosts(htmlOrText) {
  // If HTML, use DOM to find individual posts
  try {
    const doc = new DOMParser().parseFromString(htmlOrText, 'text/html');
    // Smogon posts have class .message or .message-main (subject to variant). We'll attempt common selectors.
    const postEls = doc.querySelectorAll('.message, .message-main, .messageListItem, .post, .message-entry') || [];
    const out = [];
    if (postEls && postEls.length) {
      postEls.forEach((el) => {
        // Try to find username
        const userEl = el.querySelector('[class*="username"], .username, .message-user, .author, .message-name') || el.querySelector('.message-user');
        const username = userEl ? (userEl.innerText || userEl.textContent || '').trim() : '';
        // find content
        const body = el.querySelector('.message-body, .message-content, .postBody') || el;
        const text = body ? (body.innerText || body.textContent || '').trim() : '';
        const postId = el.getAttribute('id') || el.getAttribute('data-post-id') || '';
        // extract replay urls
        const replayRegex = /(https?:\\/\\/replay\\.pokemonshowdown\\.com\\/[\\w\\-\\?=\\&\\%\\.\\_\\/]+)/gi;
        const replays = Array.from((text.match(replayRegex) || [])).map(s => s.trim());
        // claims: "X won" or "I won" "posting for X"
        const claims = [];
        const winMatch = text.match(/(\\b[\\w_\\-]+)\\s+won/i);
        if (winMatch) claims.push({ type: 'claim-win', who: winMatch[1] });
        const postingFor = text.match(/posting for\\s+([\\w_\\-]+)/i) || text.match(/on behalf of\\s+([\\w_\\-]+)/i);
        if (postingFor) claims.push({ type: 'posting-for', who: postingFor[1] });
        // find simple "beat X" patterns
        const beatMatch = text.match(/([\\w_\\-]+)\\s+(beat|defeated|d)\\s+([\\w_\\-]+)/i);
        if (beatMatch) claims.push({ type: 'beat', winner: beatMatch[1], loser: beatMatch[3] });
        out.push({ postId, username, text, replays, claims });
      });
      return out;
    }
  } catch (e) {
    // fallback: raw text - break into posts by common separator
    const lines = htmlOrText.split('\\n').map(l => l.trim()).filter(Boolean);
    // fallback very naive: any line with "replay.pokemonshowdown.com" is output as a pseudo-post
    const out = [];
    lines.forEach((l, i) => {
      if (l.includes('replay.pokemonshowdown.com')) {
        const replays = Array.from(l.match(/https?:\\/\\/replay\\.pokemonshowdown\\.com\\/[\\w\\-\\?=\\&\\%\\.\\_\\/]+/gi) || []);
        out.push({ postId: 'p' + i, username: '', text: l, replays, claims: [] });
      }
    });
    return out;
  }
  return [];
}
