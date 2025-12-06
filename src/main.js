import { fetchThreadHTML } from './parser/threadParser.js';
import { parseOpMatches, extractTeamNamesFromOp } from './parser/threadParser.js';
import { parsePosts } from './parser/postParser.js';
import { resolveReplaysToMatches } from './parser/replayResolver.js';
import { generateTeamTagMap } from './utils/teamTagGenerator.js';

const $ = id => document.getElementById(id);
const threadInput = $('threadInput');
const btnParse = $('btnParse');
const btnGenerateReplays = $('btnGenerateReplays');
const btnGenerateKey = $('btnGenerateKey');
const parsedArea = $('parsedArea');
const parsedJson = $('parsedJson');
const outputArea = $('outputArea');
const bbOutput = $('bbOutput');
const keyArea = $('keyArea');
const keyOutput = $('keyOutput');
const copyReplays = $('copyReplays');
const copyKey = $('copyKey');

let parsedState = null;

// parse button
btnParse.addEventListener('click', async () => {
  const input = threadInput.value.trim();
  if (!input) return alert('Paste a Smogon URL or OP text.');

  try {
    let htmlOrText = input;
    if (/^https?:\/\//i.test(input)) {
      htmlOrText = await fetchThreadHTML(input);
    }

    // parse OP matches & team names
    const matches = parseOpMatches(htmlOrText);
    const teams = extractTeamNamesFromOp(htmlOrText);
    const teamMap = generateTeamTagMap(teams);

    // parse posts -> replays & claims
    const posts = parsePosts(htmlOrText);

    // resolve replays to matches
    const resolved = resolveReplaysToMatches(matches, posts);

    parsedState = { matches: resolved, teams, teamMap, posts, raw: htmlOrText };

    parsedJson.textContent = JSON.stringify(parsedState, null, 2);
    parsedArea.classList.remove('hidden');
    btnGenerateReplays.disabled = false;
    btnGenerateKey.disabled = false;
  } catch (err) {
    console.error(err);
    alert('Failed to parse thread: ' + err.message);
  }
});

// generate BBCode
btnGenerateReplays.addEventListener('click', () => {
  if (!parsedState) return alert('Parse first.');

  const opts = { useSprites: $('optSprites').checked, autoPrefixes: $('optAutoPrefixes').checked, includeKey: $('optKey').checked };
  const { matches, teamMap } = parsedState;

  // Group matches by tier
  const byTier = {};
  for (const m of matches) {
    const tier = m.tier || 'Misc';
    if (!byTier[tier]) byTier[tier] = [];
    // build display line
    const teamLeftTag = teamMap[m.team1] || '';
    const teamRightTag = teamMap[m.team2] || '';
    const left = teamLeftTag ? `${teamLeftTag} ` : '';
    const right = teamRightTag ? ` ${teamRightTag}` : '';
    const players = `${m.p1} vs ${m.p2}`;
    const replay = m.replay || `REPLAY_PLACEHOLDER:${encodeURIComponent(players)}`;
    const sprite = opts.useSprites ? ':pokeball: ' : '';
    const line = `[${teamLeftTag?.replace(/\\[|\\]/g,'') || ''}] [URL='${replay}']${sprite}${players}${sprite}[/URL] [${teamRightTag?.replace(/\\[|\\]/g,'') || ''}]`;
    byTier[tier].push(line);
  }

  const sections = [];
  sections.push(`[B][COLOR=rgb(61, 142, 185)][SIZE=7]Week Replays[/SIZE][/COLOR][/B]`);
  for (const tier of Object.keys(byTier)) {
    sections.push(`\\n[B][COLOR=rgb(250,197,28)][SIZE=6]${tier}[/SIZE][/COLOR][/B]`);
    for (const l of byTier[tier]) sections.push(l);
  }

  const bb = sections.join('\\n');
  bbOutput.value = bb;
  outputArea.classList.remove('hidden');
});

// generate KEY
btnGenerateKey.addEventListener('click', () => {
  if (!parsedState) return alert('Parse first.');
  const { teamMap } = parsedState;
  const lines = ['[CENTER]', '[I]Key:\\nAcronym + Team Name[/I]', ''];
  for (const [team, tag] of Object.entries(teamMap)) {
    // emoji placeholder: use :pokeball:
    lines.push(`:pokeball: ${tag} ${team} ${tag} :pokeball:`);
  }
  lines.push('[/CENTER]');
  keyOutput.value = lines.join('\\n');
  keyArea.classList.remove('hidden');
});

// clipboard actions
copyReplays?.addEventListener('click', async () => {
  await navigator.clipboard.writeText(bbOutput.value || '');
  copyReplays.textContent = 'Copied!'; setTimeout(()=>copyReplays.textContent='Copy Replays BBCode',1200);
});
copyKey?.addEventListener('click', async () => {
  await navigator.clipboard.writeText(keyOutput.value || '');
  copyKey.textContent = 'Copied!'; setTimeout(()=>copyKey.textContent='Copy KEY',1200);
});
