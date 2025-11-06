// DOM Elements
const $ = id => document.getElementById(id);

const els = {
  date: $('date'),
  play: $('playBtn'),
  guessBtn: $('guessBtn'),
  guess: $('guess'),
  msg: $('msg'),
  wins: $('wins'),
  avgScore: $('avgScore'),
  name: $('nameInput'),
  giveUp: $('giveUp'),
  fastest: $('fastestTime'),
  avgTime: $('avgTime'),
  levels: document.getElementsByName('level'),
  lb: document.getElementsByName('leaderboard')
};

// Game State
let state = {
  level: 3,
  answer: 1,
  score: 0,
  player: '',
  roundStart: 0,
  countdownId: null,
  elapsedId: null,
  entries: [],
  totalTime: 0,
  fastest: null,
  msgBase: ''
};

const fmtName = s => (s||'').trim().toLowerCase().replace(/^./, c => c.toUpperCase());
const pad2 = n => String(n).padStart(2,'0');

const formatTime = ms => {
  if (ms == null) return '—';
  const s = ms/1000;
  return s >= 60 ? `${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}` : `${s.toFixed(2)}s`;
};

// Clock Display
const updateClock = () => {
  const d = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const suffix = (d.getDate()%100>=11 && d.getDate()%100<=13) ? 'th' : 
                ({1:'st',2:'nd',3:'rd'}[d.getDate()%10]||'th');
  return `${months[d.getMonth()]} ${d.getDate()}${suffix}, ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

els.date && (els.date.textContent = updateClock());
setInterval(() => els.date && (els.date.textContent = updateClock()), 1000);

// Game Controls
const lockLevels = v => Array.from(els.levels).forEach(r => r.disabled = v);

const clearTimers = () => {
  if (state.countdownId) { clearInterval(state.countdownId); state.countdownId = null; }
  if (state.elapsedId) { clearInterval(state.elapsedId); state.elapsedId = null; }
};


const guessQuality = (score, level) => {
  if (score === 1) return 'Perfect';
  if (score <= Math.ceil(Math.log2(level))) return 'Good';
  if (score <= Math.ceil(level / 2)) return 'OK';
  return 'Bad';
};


const showConfetti = () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
    confetti.style.opacity = Math.random();
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 5000);
  }
};


const updateBackgroundHint = (guess, answer, level) => {
  const distance = Math.abs(guess - answer) / level;
  const hue = distance * 120; // Red (0) when far, Green (120) when close
  document.body.style.backgroundColor = `hsl(${120 - hue}, 50%, 20%)`;
  setTimeout(() => document.body.style.backgroundColor = '', 1000);
};


const getMotivationalMessage = (attempts, level) => {
  const messages = {
    start: ["You can do it!", "Good luck!", "Think strategically!"],
    middle: ["Getting closer!", "Keep going!", "You're on the right track!"],
    struggling: ["Don't give up!", "Take a deep breath!", "You'll get it soon!"]
  };
  
  const threshold = Math.ceil(Math.log2(level));
  const category = attempts <= threshold/2 ? 'start' : 
                   attempts <= threshold ? 'middle' : 'struggling';
                   
  return messages[category][Math.floor(Math.random() * messages[category].length)];
};

// Game Functions
function play() {
  const raw = els.name.value || '';
  if (!raw.trim()) { els.msg.textContent = 'Please enter your name before playing.'; els.name.focus(); return; }
  
  state.player = fmtName(raw);
  els.name.value = state.player;
  state.score = 0;
  
  [els.play, els.guessBtn, els.giveUp, els.guess].forEach(el => el.disabled = true);
  Array.from(els.levels).forEach(r => { if (r.checked) state.level = Number(r.value); r.disabled = true; });
  
  state.answer = Math.floor(Math.random() * state.level) + 1;
  els.guess.placeholder = 'Wait for start...';
  
  let countdown = 3;
  const updateCountdown = () => {
    state.msgBase = `${state.player}, starting in ${countdown}...`;
    els.msg.textContent = state.msgBase;
    if (--countdown === 0) {
      clearInterval(state.countdownId);
      state.countdownId = null;
      startRound();
    }
  };
  updateCountdown();
  state.countdownId = setInterval(updateCountdown, 1000);
}

function startRound() {
  state.roundStart = Date.now();
  [els.guessBtn, els.giveUp, els.guess].forEach(el => el.disabled = false);
  els.guess.placeholder = 'Enter a number';
  state.msgBase = `${state.player}, guess a number from 1-${state.level}.`;
  els.msg.textContent = `${state.msgBase} Time: 0.00s`;
  
  state.elapsedId = setInterval(() => {
    const elapsed = Date.now() - state.roundStart;
    els.msg.textContent = `${state.msgBase} Time: ${formatTime(elapsed)}`;
  }, 100);
}

function finalize(resultScore, noteTimeMs, finalMsg){
  clearTimers();
  const entry = { name: state.player, score: resultScore, time: typeof noteTimeMs === 'number' ? noteTimeMs : null };
  state.entries.push(entry);
  
  state.entries.sort((a,b) => {
    if (a.score !== b.score) return a.score - b.score;
    const ta = a.time==null?Infinity:a.time, tb = b.time==null?Infinity:b.time;
    return ta - tb;
  });
  
  if (entry.time != null) {
    state.totalTime += entry.time;
    state.fastest = state.fastest == null ? entry.time : Math.min(state.fastest, entry.time);
  }
  
  els.wins.textContent = `${state.player} - Wins: ${state.entries.length}`;
  const sumScores = state.entries.reduce((s,e)=>s+e.score,0);
  els.avgScore.textContent = `Average Score: ${(sumScores/state.entries.length).toFixed(2)}`;
  els.fastest.textContent = `Fastest Time: ${state.fastest==null?'N/A':formatTime(state.fastest)}`;
  els.avgTime.textContent = `Average Time: ${state.entries.filter(e=>e.time!=null).length ? formatTime(state.totalTime/state.entries.filter(e=>e.time!=null).length) : 'N/A'}`;
  
  Array.from(els.lb).forEach((li,i) => {
    const e = state.entries[i];
    li.textContent = e ? `${e.name} — ${e.time!=null ? formatTime(e.time) : '—'}` : '—';
  });
  
  const quality = guessQuality(resultScore, state.level);
  state.msgBase = `${finalMsg} (${quality})`;
  els.msg.textContent = state.msgBase;
  
  els.play.disabled = false;
  [els.guessBtn, els.giveUp, els.guess].forEach(el => el.disabled = true);
  els.guess.value = '';
  els.guess.placeholder = '';
  lockLevels(false);
}


function makeGuess() {
  const guess = parseInt(els.guess.value, 10);
  const elapsed = state.roundStart ? (Date.now() - state.roundStart) : 0;
  
  if (isNaN(guess) || guess < 1 || guess > state.level) {
    state.msgBase = `${state.player}, enter a valid number 1-${state.level}`;
  } else {
    state.score++;
    updateBackgroundHint(guess, state.answer, state.level);
    
    if (guess === state.answer) {
      if (state.score === 1) showConfetti();
      finalize(state.score, elapsed, 
        `${state.player}, correct! Nice Job! You got it in ${state.score} guesses (${formatTime(elapsed)}). Press play to try again.`);
      return;
    }
    
    const motivation = getMotivationalMessage(state.score, state.level);
    state.msgBase = `${state.player}, you guessed ${guess}. Too ${guess < state.answer ? 'low' : 'high'}. ${motivation}`;
    els.guess.value = '';
  }
  els.msg.textContent = `${state.msgBase} Time: ${formatTime(elapsed)}`;
}

// Event Listeners
els.play?.addEventListener('click', play);
els.guessBtn?.addEventListener('click', makeGuess);
els.giveUp?.addEventListener('click', () => {
  clearTimers();
  const elapsed = state.roundStart ? (Date.now() - state.roundStart) : 0;
  finalize(state.level, elapsed, `${state.player}, you gave up. Nice Try! The correct number was ${state.answer}. Score: ${state.level}, time ${formatTime(elapsed)}. Press play to try again.`);
});
