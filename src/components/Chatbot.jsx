import React, { useState, useEffect, useRef } from 'react';
import { analyzeMood } from '../services/moods';
import { fetchMoviesByMood, fetchTrending, searchMovies } from '../services/tmdb';

const QUICK_REPLIES = [
  { label: '😢 I feel sad', msg: 'I feel sad' },
  { label: '😄 I am happy', msg: 'I am happy' },
  { label: '🎬 Tamil movies', msg: 'Suggest Tamil movies' },
  { label: '💪 Action', msg: 'I want action movies' },
  { label: '😂 Comedy', msg: 'Suggest comedy movies' },
  { label: '😴 Something chill', msg: 'I want something relaxing' },
];

function buildLocalReply(message, detectedMood, movies, currentMood) {
  const picks = (movies || []).slice(0, 3);
  const pickLine = picks.length
    ? picks.map(m => `🎬 ${m.title}${m.releaseYear ? ` (${m.releaseYear})` : ''}`).join('\n')
    : '';

  if (/trending|popular|top/i.test(message)) {
    return `These are hot right now and worth a look:\n${pickLine || '🎬 Fresh trending picks are ready for you.'}\nWant more like these or something mood-based?`;
  }

  if (/search|find|look for/i.test(message)) {
    return picks.length
      ? `I found a few matches for you:\n${pickLine}\nWant me to narrow it down by language or mood?`
      : "I couldn't find a close match for that title. Try another movie name or tell me your mood.";
  }

  if (detectedMood) {
    const moodOpeners = {
      happy: 'You sound upbeat, so I leaned into fun, feel-good picks.',
      sad: 'You seem a little low, so I picked warm and comforting movies.',
      stressed: 'You sound stressed, so I focused on easier, more relaxing watches.',
      bored: 'Bored mode detected, so I pulled in movies with stronger hooks.',
      romantic: 'Romantic vibe noted, so I picked softer and more heartfelt films.',
      anxious: 'You seem anxious, so I went for lighter, calmer choices.',
      angry: 'That energy deserves something intense and satisfying.',
      excited: 'You sound hyped, so I pulled in bigger, more energetic picks.',
    };

    return `${moodOpeners[detectedMood] || `I picked these for your ${detectedMood} mood.`}
${pickLine || '🎬 I have a few movie ideas ready for you.'}
Want Tamil picks, English picks, or a mix?`;
  }

  return `I can help with mood-based picks, trending movies, or title search.${currentMood ? ` Right now I’m using your ${currentMood} mood as the baseline.` : ''} Tell me how you feel or what kind of movie night you want.`;
}

export function Chatbot({ open, onClose, currentMood, setMood, onLoadMovies, toast }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hey! 👋 I'm MoodBot, your AI movie copilot. Tell me how you feel or what you want to watch!", movies: [] }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const endRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  function initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = e => {
      const t = e.results[e.results.length - 1][0].transcript;
      setInput(t);
      setIsListening(false);
    };
    r.onerror = () => { setIsListening(false); toast?.('Voice not available', 'error'); };
    r.onend = () => setIsListening(false);
    return r;
  }

  function toggleVoice() {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const r = initRecognition();
    if (!r) { toast?.('Voice not supported in this browser', 'error'); return; }
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  }

  async function send(overrideMsg) {
    const msg = (overrideMsg || input).trim();
    if (!msg) return;
    setInput('');
    setShowQuickReplies(false);
    const userMsg = { role: 'user', text: msg, movies: [] };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setTyping(true);

    try {
      let realMovies = [];
      const detectedMood = analyzeMood(msg);
      if (/trending|popular|top/i.test(msg)) {
        realMovies = (await fetchTrending()).slice(0, 4);
      } else if (/search|find|look for/i.test(msg)) {
        const q = msg.replace(/search|find|look for|movie|called|named/gi, '').trim();
        if (q.length > 2) realMovies = (await searchMovies(q)).slice(0, 4);
      } else if (detectedMood) {
        realMovies = (await fetchMoviesByMood(detectedMood)).slice(0, 4);
        if (detectedMood !== currentMood) { setMood(detectedMood); onLoadMovies(detectedMood); }
      }

      const responseText = buildLocalReply(msg, detectedMood, realMovies, currentMood);

      setTyping(false);
      setMessages(p => [...p, { role: 'assistant', text: responseText, movies: realMovies }]);
    } catch (e) {
      setTyping(false);
      setMessages(p => [...p, { role: 'assistant', text: "Couldn't connect to the AI engine right now. 😔 But you can still browse movies!", movies: [] }]);
    }
  }

  return (
    <div className={`chatbot-panel glass-deep${open ? ' open' : ' closed'}`} role="dialog" aria-label="MoodBot AI Chat">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-orb-mini">🤖</div>
          <div>
            <div style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'0.95rem' }}>MoodBot AI</div>
            <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)' }}>
              {typing ? '✨ Thinking...' : currentMood ? `Mood: ${currentMood}` : 'Your movie copilot'}
            </div>
          </div>
        </div>
        <button className="chat-close-x" onClick={onClose} aria-label="Close chat">✕</button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-avatar">{m.role === 'assistant' ? '🤖' : '👤'}</div>
            <div className="chat-bubble">
              <span dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>') }} />
              {m.movies?.length > 0 && (
                <div className="chat-mini-row">
                  {m.movies.map(mv => (
                    <div key={mv.id} className="chat-mini-card">
                      {mv.poster
                        ? <img src={mv.poster} alt={mv.title} loading="lazy" />
                        : <div style={{ width:90, height:120, background:'rgba(255,255,255,0.08)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>🎬</div>
                      }
                      <div className="chat-mini-title">{mv.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="chat-msg assistant">
            <div className="chat-avatar">🤖</div>
            <div className="chat-bubble">
              <div className="typing-bubble">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="chat-quick-replies">
          {QUICK_REPLIES.map(qr => (
            <button key={qr.msg} className="chat-quick-reply" onClick={() => send(qr.msg)}>
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="chat-input-row">
        <button
          className="btn-icon"
          onClick={toggleVoice}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          style={{ color: isListening ? '#ef4444' : undefined, borderColor: isListening ? '#ef4444' : undefined, animation: isListening ? 'micPulse 1.2s infinite' : 'none', width:36, height:36, fontSize:'1rem' }}
        >
          🎤
        </button>
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={isListening ? '🎤 Listening...' : 'Ask MoodBot anything...'}
          aria-label="Chat input"
        />
        <button className="send-btn" onClick={() => send()} aria-label="Send message">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
