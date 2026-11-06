/* Devu's Daily Quiz. Day files live in days/YYYY-MM-DD.js and are found automatically. */
window.DEVU_DAYS = [];
const START = '2026-11-01';          // first date to look for day files
const KEY = 'devu-quiz-attempts-v1';
const $app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const L = ['A','B','C','D','E','F'];

/* ---------- storage ---------- */
let mem = [];
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ return mem; } }
function save(a){ mem = a; try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} }

/* ---------- helpers ---------- */
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const pick = a => a[Math.floor(Math.random()*a.length)];
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fmtDay = s => new Date(s+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
const fmtDT = t => new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
const fmtT = s => Math.floor(s/60)+':'+String(s%60).padStart(2,'0');

const HELLO = [
 "You are going to be a Company Secretary. Today is one more step.",
 "Small steps every day beat big plans someday.",
 "Tax will bow down to you, Devu. Keep going.",
 "Wrong answers are just the brain learning. Be proud you tried.",
 "Dance break after this quiz. You earned it in advance.",
 "You do not have to be perfect. You have to be here, and you are.",
 "60 in Tax is not luck. It is days like today adding up.",
 "Phone down, heart up. You can do hard things."
];
const GRADES = [
 [90,"Superstar! A secretary in the making.","Take a bow, Devu. That was brilliant."],
 [70,"Yesss, Devu! So close to perfect.","Look at that score. Fix the few misses below and you own this topic."],
 [50,"Good going! You are building it.","Half the battle is won. Read the explanations below, then try again."],
 [0,"Every expert started right here.","This is what retakes are for, Devu. Read the reasons below and go again. Your next score will be higher."]
];
const grade = p => GRADES.find(g => p >= g[0]);

/* ---------- state ---------- */
let state = { view:'home', quiz:null, review:null, timer:null };

/* ---------- discovery of day files ---------- */
function discover(){
  const today = iso(new Date()), tasks = [];
  for(let d=new Date(START+'T00:00:00'); iso(d)<=today; d.setDate(d.getDate()+1)){
    tasks.push(new Promise(res => {
      const s = document.createElement('script');
      s.src = 'days/'+iso(d)+'.js'; s.onload = s.onerror = () => res(); document.head.appendChild(s);
    }));
  }
  return Promise.all(tasks).then(() => { DEVU_DAYS.sort((a,b)=>a.date<b.date?1:-1); });
}

/* ---------- stats ---------- */
function streak(att){
  const days = new Set(att.map(a => iso(new Date(a.at))));
  const d = new Date(); if(!days.has(iso(d))) d.setDate(d.getDate()-1);
  let n = 0; while(days.has(iso(d))){ n++; d.setDate(d.getDate()-1); }
  return n;
}

/* ---------- views ---------- */
function home(){
  const att = load();
  const best = att.length ? Math.max(...att.map(a => Math.round(100*a.score/a.total))) : 0;
  const st = streak(att);
  const cards = DEVU_DAYS.map(d => {
    const mine = att.filter(a => a.day===d.date);
    const b = mine.length ? Math.max(...mine.map(a => Math.round(100*a.score/a.total))) : null;
    const dt = new Date(d.date+'T00:00:00');
    return `<div class="day">
      <div class="dbadge"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('en-IN',{month:'short'})}</span></div>
      <div><h3>${esc(d.topic)}</h3><div class="meta">${fmtDay(d.date)} · ${d.questions.length} questions · tried ${mine.length}×</div>
      ${b!==null?`<span class="best">Best: ${b}%</span>`:''}</div>
      <button class="btn" data-start="${d.date}">${mine.length?'Try again':'Start'}</button></div>`;
  }).join('');
  const nth = Math.floor(Date.now()/864e5) % HELLO.length;
  $app.innerHTML = `
  <section class="hero">
    <h1 class="hi">Hi <span>Devu</span> <span class="hh">♥</span></h1>
    <p class="courage">${esc(HELLO[nth])}</p>
    <div class="sticky"><b>Reminder</b>Phone on silent. Water nearby. One quiz, then a snack. You've got this.</div>
  </section>
  <div class="stats">
    <div class="stat"><b>${st}</b><span>${st===1?'day':'days'} in a row</span></div>
    <div class="stat"><b>${att.length}</b><span>quizzes taken</span></div>
    <div class="stat"><b>${best}%</b><span>best score</span></div>
  </div>
  <h2 class="sec">What you studied</h2>
  <div class="days">${cards || `<div class="empty"><h3>No quizzes yet</h3><p>Add a file for today in the <b>days</b> folder and it will show up here.</p></div>`}</div>`;
}

function startQuiz(date){
  const d = DEVU_DAYS.find(x => x.date===date); if(!d) return;
  const items = shuffle(d.questions).map(q => {
    const opts = shuffle([{t:q.a,ok:true}, ...q.w.map(t => ({t,ok:false}))]);
    return { q:q.q, opts, sel:null, why:q.why||'' };
  });
  state.quiz = { day:d, items, i:0, t0:Date.now() };
  state.view = 'quiz';
  clearInterval(state.timer);
  state.timer = setInterval(() => { const t=document.getElementById('tm'); if(t&&state.quiz) t.textContent = '⏱ '+fmtT(Math.floor((Date.now()-state.quiz.t0)/1000)); }, 1000);
  render();
}

function quiz(){
  const z = state.quiz, it = z.items[z.i], n = z.items.length;
  const answered = z.items.filter(x => x.sel!==null).length;
  const last = z.i===n-1;
  $app.innerHTML = `
  <div class="qhead"><h2>${esc(z.day.topic)}</h2><span class="timer" id="tm">⏱ ${fmtT(Math.floor((Date.now()-z.t0)/1000))}</span></div>
  <div class="bar" role="progressbar" aria-valuenow="${answered}" aria-valuemax="${n}"><div style="width:${100*answered/n}%"></div></div>
  <div class="qcard">
    <div class="qno">Question ${z.i+1} of ${n}</div>
    <div class="qtext">${esc(it.q)}</div>
    <div class="opts">${it.opts.map((o,k) => `<button class="opt ${it.sel===k?'sel':''}" data-opt="${k}"><span class="l">${L[k]}</span><span>${esc(o.t)}</span></button>`).join('')}</div>
    <div class="qnav">
      <button class="btn alt" data-prev ${z.i===0?'disabled':''}>Back</button>
      ${last?`<button class="btn" data-finish>Finish quiz</button>`:`<button class="btn" data-next>Next</button>`}
    </div>
    <div class="pal">${z.items.map((x,k)=>`<button class="${k===z.i?'cur':x.sel!==null?'done':''}" data-jump="${k}" aria-label="Go to question ${k+1}">${k+1}</button>`).join('')}</div>
  </div>
  <p class="cheer">${answered} of ${n} answered. ${answered===n?'All done, press Finish when you are ready.':'Take your time, Devu. You know more than you think.'}</p>`;
}

function finish(){
  const z = state.quiz, n = z.items.length;
  const unanswered = z.items.filter(x => x.sel===null).length;
  if(unanswered && !confirm(unanswered+' question'+(unanswered>1?'s are':' is')+' still unanswered. Finish anyway?')) return;
  const score = z.items.filter(x => x.sel!==null && x.opts[x.sel].ok).length;
  const rec = { id:Date.now(), at:Date.now(), day:z.day.date, topic:z.day.topic, score, total:n,
    secs:Math.floor((Date.now()-z.t0)/1000),
    items:z.items.map(x => ({q:x.q, opts:x.opts.map(o=>o.t), ans:x.opts.findIndex(o=>o.ok), sel:x.sel, why:x.why})) };
  const a = load(); a.unshift(rec); save(a);
  clearInterval(state.timer); state.quiz = null;
  state.review = rec; state.view = 'result'; render();
}

function reviewList(rec){
  return rec.items.map((x,i) => {
    const ok = x.sel===x.ans;
    return `<div class="rev ${ok?'ok':'no'}"><div class="qno">Question ${i+1} · ${ok?'Correct':(x.sel===null?'Not answered':'Not quite')}</div>
    <div class="qtext">${esc(x.q)}</div>
    ${x.opts.map((o,k) => {
      const cls = k===x.ans?'right':(k===x.sel?'wrong':'');
      const tag = k===x.ans?(k===x.sel?'Your answer ✓':'Correct answer'):(k===x.sel?'Your answer':'');
      return `<div class="ro ${cls}"><b>${L[k]}.</b><span>${esc(o)}</span><span class="tag">${tag}</span></div>`;
    }).join('')}
    ${x.why?`<div class="why"><b>Why:</b> ${esc(x.why)}</div>`:''}</div>`;
  }).join('');
}

function result(){
  const r = state.review, p = Math.round(100*r.score/r.total), g = grade(p);
  $app.innerHTML = `
  <section class="score">
    <div class="ring" style="--p:${p}"><div><span>${r.score}/${r.total}<small>${p}%</small></span></div></div>
    <div class="big">${g[1]}</div><p>${g[2]}</p>
    <p class="meta">Finished in ${fmtT(r.secs)}. Saved in My results.</p>
    <div class="acts"><button class="btn" data-start="${r.day}">Try again, new order</button><button class="btn alt" data-go="home">Home</button><button class="btn alt" data-go="history">My results</button></div>
  </section>
  <h2 class="sec">Let's look at every answer</h2>${reviewList(r)}`;
  window.scrollTo(0,0);
}

function history(){
  const a = load();
  $app.innerHTML = `<h2 class="sec" style="margin-top:8px">My results</h2>
  <div class="tools"><button class="btn alt" data-export>Save a backup</button><button class="btn alt" data-import>Load a backup</button>
  <input type="file" id="imp" accept=".json" class="hidden"></div>
  ${a.length ? a.map(r => `<button class="att" data-open="${r.id}"><div><b>${esc(r.topic)}</b><div class="meta">${fmtDT(r.at)} · ${fmtT(r.secs)}</div></div><div class="pc">${r.score}/${r.total}</div></button>`).join('')
  : `<div class="empty"><h3>Nothing here yet</h3><p>Take your first quiz and it will be saved here.</p><button class="btn" data-go="home">Pick a quiz</button></div>`}
  <p class="meta">Results are saved in this browser on this laptop. Use "Save a backup" now and then so nothing gets lost.</p>`;
}

function reviewView(){
  const r = state.review;
  $app.innerHTML = `<button class="chip" data-go="history">Back to results</button>
  <h2 class="sec" style="margin-top:14px">${esc(r.topic)}</h2>
  <p class="meta">${fmtDT(r.at)} · ${r.score}/${r.total} · ${fmtT(r.secs)}</p>${reviewList(r)}`;
  window.scrollTo(0,0);
}

function render(){
  ({home, quiz, result, history, review:reviewView})[state.view]();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  const D = t.dataset, z = state.quiz;
  if(D.go){ if(z && !confirm('Leave this quiz? Your answers will not be saved.')) return;
    clearInterval(state.timer); state.quiz=null; state.view=D.go; render(); window.scrollTo(0,0); }
  else if(D.start){ startQuiz(D.start); window.scrollTo(0,0); }
  else if(D.opt!==undefined){ z.items[z.i].sel = +D.opt; render(); }
  else if(D.next!==undefined){ z.i++; render(); }
  else if(D.prev!==undefined){ z.i--; render(); }
  else if(D.jump!==undefined){ z.i = +D.jump; render(); }
  else if(D.finish!==undefined){ finish(); }
  else if(D.open){ state.review = load().find(r => String(r.id)===D.open); state.view='review'; render(); }
  else if(D.export!==undefined){
    const b = new Blob([JSON.stringify(load())],{type:'application/json'}), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href=u; a.download='devu-results-'+iso(new Date())+'.json'; a.click(); URL.revokeObjectURL(u); }
  else if(D.import!==undefined){ document.getElementById('imp').click(); }
});
document.addEventListener('change', e => {
  if(e.target.id!=='imp' || !e.target.files[0]) return;
  const fr = new FileReader();
  fr.onload = () => { try{
    const inc = JSON.parse(fr.result), cur = load(), ids = new Set(cur.map(r=>r.id));
    save(cur.concat(inc.filter(r => !ids.has(r.id))).sort((a,b)=>b.at-a.at)); alert('Backup loaded. Welcome back, Devu!'); history();
  }catch(err){ alert('That file is not a Devu backup. Pick the .json file you saved earlier.'); } };
  fr.readAsText(e.target.files[0]);
});

/* floating hearts */
(function(){ const f=document.getElementById('float'); for(let i=0;i<14;i++){ const h=document.createElement('i'); h.textContent=i%3?'♥':'✿';
  h.style.left=(Math.random()*100)+'%'; h.style.fontSize=(16+Math.random()*30)+'px'; h.style.animationDuration=(14+Math.random()*16)+'s'; h.style.animationDelay=(-Math.random()*20)+'s'; f.appendChild(h);} })();

discover().then(render);
