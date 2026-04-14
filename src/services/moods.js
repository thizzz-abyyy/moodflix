export const MOOD_GENRES = {
  happy:    [35, 10751, 16, 10402, 12],
  sad:      [18, 10749, 10402],
  stressed: [28, 53, 12],
  bored:    [878, 14, 9648, 80],
  romantic: [10749, 18, 35],
  anxious:  [35, 16, 10751],
  angry:    [28, 35, 12],
  excited:  [28, 12, 878, 14],
  neutral:  [18, 99, 9648],
};

export const MOOD_EMOJI = {
  happy:'😄', sad:'😢', stressed:'😤', bored:'😑',
  romantic:'🥰', anxious:'😰', angry:'😠', excited:'🤩', neutral:'😐',
};

export const MOOD_KEYWORDS = {
  happy:    ['happy','joy','joyful','excited','great','amazing','wonderful','fantastic','cheerful','good','love','fun','laugh','smile', 'santhosham', 'magilchi'],
  sad:      ['sad','unhappy','depressed','crying','cry','miserable','down','blue','lonely','heartbreak','grief','sorrow', 'sogam', 'kavalai', 'azhugai'],
  stressed: ['stressed','stress','anxious','anxiety','worry','worried','nervous','overwhelmed','pressure','tense','busy', 'tension', 'kuzhappam'],
  bored:    ['bored','boring','nothing','dull','idle','free','lazy','blah','meh', 'boradikithu', 'summa', 'veruppu'],
  romantic: ['romantic','romance','love','crush','date','relationship','partner','couple','valentine', 'kadhal', 'kadal'],
  anxious:  ['anxious','anxiety','nervous','jittery','uneasy','restless','overthink', 'bayam', 'padapadappu'],
  angry:    ['angry','anger','mad','furious','frustrated','irritated','annoyed','rage', 'kovam', 'kaduppu', 'veri'],
  excited:  ["excited","thrilled","pumped","hyped","stoked","energetic","eager","enthusiastic", "aarvam", "super", "mass", "verithanam"],
};

export const MOODS_LIST = Object.keys(MOOD_EMOJI).filter(m => m !== 'neutral').map(id => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
  emoji: MOOD_EMOJI[id],
}));

export const TIME_NOTES = {
  morning:   { emoji:'☀️', text:'Good morning! Light, feel-good movies recommended.' },
  afternoon: { emoji:'🌤️', text:'Good afternoon! Perfect time for casual entertainment.' },
  evening:   { emoji:'🌆', text:'Good evening! Romantic or thrilling picks for you.' },
  night:     { emoji:'🌙', text:'Late night mode — deep thrillers and emotional dramas.' },
};

export function analyzeMood(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  const scores = {};
  for (const [mood, kws] of Object.entries(MOOD_KEYWORDS)) {
    scores[mood] = kws.reduce((s, kw) => s + (t.includes(kw) ? (kw.includes(' ') ? 3 : 1) : 0), 0);
  }
  const best = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
  if (best[1] === 0) {
    for (const m of Object.keys(MOOD_KEYWORDS)) if (t.includes(m)) return m;
    return 'bored';
  }
  return best[0];
}

export function getTimeContext() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function getMoodFromEnergy(energy) {
  if (energy < 20) return 'sad';
  if (energy < 40) return 'stressed';
  if (energy < 60) return 'bored';
  if (energy < 80) return 'happy';
  return 'excited';
}
