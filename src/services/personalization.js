const STORAGE_KEY = 'moodflix_data';

export function loadUserData() {
  try { 
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data || {history:[],favorites:[],watchedIds:[],genreAffinity:{},moodHistory:[],chatHistory:[],userName:''}; 
  }
  catch(e) { return {history:[],favorites:[],watchedIds:[],genreAffinity:{},moodHistory:[],chatHistory:[],userName:''}; }
}

export function saveUserData(d) { 
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); 
}

export function saveChatMessage(role, content) {
  const data = loadUserData();
  data.chatHistory = data.chatHistory || [];
  data.chatHistory.push({ role, content, timestamp: new Date().toISOString() });
  // Keep only the last 20 messages so it doesn't get too large
  if (data.chatHistory.length > 20) {
    data.chatHistory = data.chatHistory.slice(data.chatHistory.length - 20);
  }
  saveUserData(data);
}

export function saveUserName(name) {
  const data = loadUserData();
  data.userName = name;
  saveUserData(data);
}

export function getMoodBoostScore(movie, mood, userData) {
  const boostGenres={
    happy:[35,10751,16], sad:[35,16,10751], stressed:[35,16,10751],
    anxious:[35,16,12], angry:[35,12,16], bored:[878,14,53,9648],
    romantic:[10749,18,35], excited:[28,12,878]
  };
  const bg=boostGenres[mood]||[];
  const mg=movie.genreIds||[];
  const o=mg.filter(g=>bg.includes(g)).length;
  const genreScore=Math.min(o/Math.max(bg.length,1),1);
  const ratingScore=Math.min((parseFloat(movie.rating)||5)/10,1);
  const aff=userData.genreAffinity||{};
  const afSum=mg.reduce((s,g)=>s+(aff[g]||0),0);
  const maxAf=Math.max(...Object.values(aff),1);
  const afScore=Math.min(afSum/(maxAf*mg.length+1),1);
  return Math.round((genreScore*.4+ratingScore*.35+afScore*.2+(movie.ott?0.05:0))*100);
}
