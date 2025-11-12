/* chatbot.js - Airi AI Chatbot + Dev-Option unlock (5x logo) + Night mode persistence
   Usage: include this script + chatbot.css on every page where you want chatbot + dev option to be available.
*/

/* -------------------- CONFIG -------------------- */
const CHAT_CONFIG = {
  logoSelector: '#siteLogo', // set this to the logo element id in your header
  clickToUnlock: 5,
  aiAvatar: 'img/Airi.png',      // relative path to Airi avatar (use the one in your img/)
  aiAvatarSmall: 'img/Airi_default.png',
  excludedPages: ['games.html','game.html','journey.html','intro.html', '2d-character.html', '3d-character.html', 'lunar-veil.html', 'denah-interior.html', '3d-bangunan.html', 'intro-youtube.html'], // no widget there
  keywords: {
    home: ['home','index','beranda'],
    about: ['about','tentang', 'siapa'],
    gallery: ['gallery','galeri','portofolio'],
    contact: ['contact','kontak','hubungi'],
    journey: ['journey','perjalanan','my journey','story'],
    games: ['games','permainan','game'],
    character2d: ['2d-character','gambar 2d','gambar'],
    character3d: ['3d-character','karakter 3d','model 3d'],
    lunarveil: ['lunar-veil','novel lunar veil', 'lunar veil', 'novel'],
    denahinterior: ['denah-interior','interior rumah', 'interior', 'denah'],
    bangunan3d: ['3d-bangunan','model 3d bangunan', 'bangunan 3d', 'bangunan'],
    introyoutube: ['intro-youtube','intro youtube'],
    vtuber3d: ['3d-vtuber','vtuber']
  }
};

/* -------------------- LOCAL STORAGE KEYS -------------------- */
const LS_KEYS = {
  unlocked: 'parzival_dev_unlocked_v1',
  night: 'parzival_night_enabled_v1',
  ai: 'parzival_ai_enabled_v1'
};

/* -------------------- UTIL -------------------- */
function $(s){ return document.querySelector(s); }
function onReady(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
function inExcludedPage(){
  const p = window.location.pathname.split('/').pop();
  return CHAT_CONFIG.excludedPages.includes(p);
}

/* -------------------- RENDER HTML UI (inject) -------------------- */
function createUI(){
  // Dev modal toggle (hidden by default)
  const devToggle = document.createElement('div');
  devToggle.id = 'devOptionsToggle';
  devToggle.innerHTML = `<div id="devModal" aria-hidden="true">
    <h4>Dev Options</h4>
    <div class="dev-row"><label>Night Mode</label><input type="checkbox" id="devNight"></div>
    <div class="dev-row"><label>AI Chatbot</label><input type="checkbox" id="devAI"></div>
    <div style="font-size:12px;color:#666;padding-top:6px">Status persisted across pages.</div>
  </div>`;
  document.body.appendChild(devToggle);

  // Chat root
  const root = document.createElement('div');
  root.id = 'aichat-root';
  root.innerHTML = `
  <div class="aichat-panel">
    <div class="aichat-head">
      <div class="avatar"><img src="${CHAT_CONFIG.aiAvatar}" alt="Airi"></div>
      <div>
        <div class="title">Airi — Assistant</div>
        <div class="mini">Butuh bantuan? Tulis saja :)</div>
      </div>
      <div style="flex:1"></div>
      <button id="aichat-close" style="background:transparent;border:0;font-weight:800;cursor:pointer">✕</button>
    </div>
    <div class="aichat-body" id="aichat-body"></div>
    <div class="aichat-inputWrap">
      <input placeholder="Tulis pertanyaan... (eg: lihat games)" id="aichat-input" class="aichat-input">
      <button class="aichat-send" id="aichat-send">Send</button>
    </div>
  </div>
  `;
  document.body.appendChild(root);

  // Toggle button (minimized)
  const tbtn = document.createElement('div');
  tbtn.className = 'aichat-toggleBtn';
  tbtn.id = 'aichat-toggle';
  tbtn.innerHTML = '<span>AI</span>';
  document.body.appendChild(tbtn);
}

/* -------------------- STATE -------------------- */
let clickCount = 0;
let devUnlocked = localStorage.getItem(LS_KEYS.unlocked) === '1';
let nightEnabled = localStorage.getItem(LS_KEYS.night) === '1';
let aiEnabled = localStorage.getItem(LS_KEYS.ai) === '1';

/* -------------------- MAIN -------------------- */
onReady(()=>{

  // ensure logo selector exists
  const logo = document.querySelector(CHAT_CONFIG.logoSelector);
  if(!logo){
    console.warn('chatbot.js: logo element not found. Set correct logoSelector in CHAT_CONFIG.');
    return;
  }

  // inject UI (modals + chat)
  createUI();

  const devModal = $('#devModal');
  const devToggle = $('#devOptionsToggle');
  const nightCheckbox = devModal.querySelector('#devNight');
  const aiCheckbox = devModal.querySelector('#devAI');

  const chatRoot = $('#aichat-root');
  const chatBody = $('#aichat-body');
  const chatInput = $('#aichat-input');
  const chatSend = $('#aichat-send');
  const chatToggle = $('#aichat-toggle');
  const chatClose = $('#aichat-close');

  // set initial UI states
  function applyNight(enabled){
    if(enabled) document.body.classList.add('a-night');
    else document.body.classList.remove('a-night');
  }
  applyNight(nightEnabled);

  function setDevVisible(visible){
    devModal.style.display = visible ? 'block' : 'none';
    devToggle.style.display = visible ? 'block' : 'none';
    devModal.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  // If unlocked previously: set checkboxes and keep toggles accessible
  if(devUnlocked){
    nightCheckbox.checked = nightEnabled;
    aiCheckbox.checked = aiEnabled;
    // show dev toggle icon so user can open modal any page
    devToggle.style.display = 'block';
    // but modal closed initially (per request)
    devModal.style.display = 'none';
  }

  // logo click sequence: count until unlock
  logo.addEventListener('click', ()=>{
    clickCount++;
    // small animation or feedback (optional)
    if(!devUnlocked && clickCount >= CHAT_CONFIG.clickToUnlock){
      devUnlocked = true;
      // default: enable both as requested
      nightEnabled = true;
      aiEnabled = true;
      localStorage.setItem(LS_KEYS.unlocked,'1');
      localStorage.setItem(LS_KEYS.night, '1');
      localStorage.setItem(LS_KEYS.ai, '1');
      // set UI
      nightCheckbox.checked = true;
      aiCheckbox.checked = true;
      applyNight(true);
      devToggle.style.display = 'block';
      // feedback toast
      flashToast('Developer options unlocked — Night Mode & AI Chat enabled.');
      clickCount = 0;
    } else if(devUnlocked){
      // toggle modal open/close on single clicks after unlocked
      const isOpen = devModal.style.display === 'block';
      setDevVisible(!isOpen);
    }
    // reset clickCount after short time to avoid accidental
    setTimeout(()=>{ clickCount = 0; }, 1200);
  });

  // when user toggles checkboxes
  nightCheckbox.addEventListener('change', e=>{
    nightEnabled = e.target.checked;
    localStorage.setItem(LS_KEYS.night, nightEnabled ? '1' : '0');
    applyNight(nightEnabled);
  });
  aiCheckbox.addEventListener('change', e=>{
    aiEnabled = e.target.checked;
    localStorage.setItem(LS_KEYS.ai, aiEnabled ? '1' : '0');
    updateChatVisibility();
  });

  // quick toast helper
  function flashToast(text, duration=2000){
    const t = document.createElement('div');
    t.style.position='fixed'; t.style.left='50%'; t.style.transform='translateX(-50%)';
    t.style.bottom='16px'; t.style.background='rgba(0,0,0,0.75)'; t.style.color='#fff';
    t.style.padding='10px 14px'; t.style.borderRadius='10px'; t.style.zIndex=12000;
    t.style.fontFamily='Poppins, sans-serif'; t.style.fontSize='13px';
    t.textContent = text; document.body.appendChild(t);
    setTimeout(()=> t.remove(), duration);
  }

  /* -------------------- CHAT VISIBILITY / EXCLUDED PAGES -------------------- */
  function updateChatVisibility(){
    // hide entirely if page excluded
    if(inExcludedPage()){
      chatRoot.style.display = 'none';
      chatToggle.style.display = 'none';
      return;
    }
    if(devUnlocked && aiEnabled){
      // show minimized toggle button by default
      chatToggle.style.display = 'flex';
      chatRoot.style.display = 'none'; // panel closed initially
    } else {
      chatToggle.style.display = 'none';
      chatRoot.style.display = 'none';
    }
  }
  updateChatVisibility();

  /* -------------------- Chatting helpers -------------------- */
  function appendMessage(text, who='ai'){
    const el = document.createElement('div');
    el.className = 'aichat-msg ' + (who==='ai' ? 'ai' : 'user');
    el.innerHTML = text;
    chatBody.appendChild(el);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTyping(){
    const t = document.createElement('div');
    t.className = 'typing';
    t.id = '__typing__';
    t.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatBody.appendChild(t);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
  function hideTyping(){ const t=document.getElementById('__typing__'); if(t) t.remove(); }

  /* process user input (very simple keyword matching) */
  function processInput(text){
    const lower = text.toLowerCase();
    // quick map: check each keyword list
    for(const page in CHAT_CONFIG.keywords){
      const arr = CHAT_CONFIG.keywords[page];
      for(const k of arr){
        if(lower.includes(k)){
          return { match: true, page };
        }
      }
    }
    return { match:false };
  }

  /* respond with Airi; optionally navigate */
  function airiRespond(msg, opts={}){
    // opts: { navigate: 'about' }
    hideTyping();
    appendMessage(msg, 'ai');
    if(opts.navigate){
      // short delay to let user read
      setTimeout(()=>{ 
        const target = opts.navigate;
        const routes = {
          home: 'index.html',
          about: 'about.html',
          gallery: 'gallery.html',
          contact: 'contact.html',
          journey: 'journey.html',
          games: 'games.html'
        };
        const url = routes[target] || 'index.html';
        // navigate
        window.location.href = url;
      }, 900);
    }
  }

  /* handle send event */
  function handleSend(){
    const text = chatInput.value.trim();
    if(!text) return;
    appendMessage(text,'user');
    chatInput.value = '';
    // show typing
    showTyping();
    // fake thinking time
    setTimeout(()=>{
      const res = processInput(text);
      hideTyping();
      if(res.match){
        // cute reply and navigate
        const mapReplies = {
          home: `Oke~ aku bawa kamu ke Home. Yuk! ✨`,
          about: `Siap! Menuju About. Aku ceritain tentang Rayhan ya~`,
          gallery: `Ayo cek Gallery~ semoga kamu suka karya-karyanya ♪`,
          contact: `Baik, ini mengarah ke Contact. Kamu bisa kirim pesan disana.`,
          journey: `Kita ke My Journey! ayo lihat perjalanan yang seru~`,
          games: `Berangkat ke halaman Games! siap main? 🎮`
        };
        showTyping();
        setTimeout(()=> airiRespond(mapReplies[res.page] || 'Oke, mengalihkan...', { navigate: res.page }), 700);
      } else {
        // not found
        showTyping();
        setTimeout(()=> airiRespond("Ah... maaf, aku gak paham maksudnya. Coba kata kunci lain misal: games, about, gallery, contact.", {}), 800);
      }
    }, 250);
  }

  /* -------------------- EVENTS: toggle/open/close -------------------- */
  // toggle minimized -> open panel
  chatToggle.addEventListener('click', ()=>{
    if(chatRoot.style.display === 'none' || chatRoot.style.display === ''){
      chatRoot.style.display = 'block';
      chatToggle.style.display = 'none';
      // greet if first open
      setTimeout(()=> {
        appendMessage(`Hai! Aku Airi — mau dibantu apa hari ini?`, 'ai');
      }, 120);
    }
  });
  // close button
  chatClose.addEventListener('click', ()=>{
    chatRoot.style.display = 'none';
    chatToggle.style.display = devUnlocked ? 'flex' : 'none';
  });

  // send
  chatSend.addEventListener('click', handleSend);
  chatInput.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); handleSend(); }
  });

  /* shortcut: if user clicks a navigation link on page, optionally tell chatbot to hide (so it doesn't persist open) */
  document.addEventListener('click', (ev)=>{
    const a = ev.target.closest && ev.target.closest('a');
    if(a && a.getAttribute('href')){
      // no special handling required — since we persist state across pages via localStorage, the ui will re-render on next page load
    }
  });

  /* -------------------- initialize visibility + checkbox bindings -------------------- */
  function initFromStorage(){
    devUnlocked = localStorage.getItem(LS_KEYS.unlocked) === '1';
    nightEnabled = localStorage.getItem(LS_KEYS.night) === '1';
    aiEnabled = localStorage.getItem(LS_KEYS.ai) === '1';
    nightCheckbox.checked = nightEnabled;
    aiCheckbox.checked = aiEnabled;
    applyNight(nightEnabled);
    updateChatVisibility();
  }
  initFromStorage();

  /* keep modal shown state closed by default after unlock (user clicks logo to open) */
  setDevVisible(false);

  /* make sure when user toggles in-modal checkboxes we update LS and UI (done above) */

  /* helpful: auto-focus chat input when pressing "/" anywhere */
  window.addEventListener('keydown', e=>{
    if(e.key === '/' && !inExcludedPage()){
      // open chat if enabled
      if(devUnlocked && aiEnabled){
        chatRoot.style.display = 'block';
        chatToggle.style.display = 'none';
        chatInput.focus();
      }
    }
  });

  // expose updateChatVisibility globally (for debug)
  window.__AIRI_updateUI = updateChatVisibility;
});
