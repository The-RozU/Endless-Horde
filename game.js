/* Calion Survivors · prototype 0.0.19 · Vanilla Canvas 2D */
(() => {
  'use strict';
  const VERSION = '0.0.19';
  const RUN_DURATION = 300; // Five-minute playtest; balance is intentionally provisional.
  const MAX_ENEMIES = 80; // Requested population cap for the denser arena.
  const MAX_PROJECTILES = 70;
  const MAX_HOSTILE_PROJECTILES = 26;
  const ENEMY_UNLOCK_INTERVAL = 30;
  const ELITE_SPAWN_INTERVAL = 60;
  const PLAYER_HIT_FLASH = .23; // Warm white hit feedback; separate from immunity blinking.
  const SLIME_BLUE_OVERSHOOT = 30; // Dash must pass beyond a stationary target.
  const MAX_DROPS = 100;
  const MOD_SLOTS = 2;
  const BOUNCE_CHANCE_STEP = .20; // Every card level grants +20 percentage points.
  const BOUNCE_MAX_HITS = 2; // Chance is checked separately for each possible ricochet.
  const MODIFIER_EXCLUDES = Object.freeze({
    bounce:'split',split:'bounce',
    wideSlash:'bleed',bleed:'wideSlash',
    longChain:'doubleChain',doubleChain:'longChain'
  });
  const WEAPONS=[
    {id:'bow',name:'Łuk',symbol:'➶',desc:'Strzały, odbicia i rozdzielenie.'},
    {id:'daggers',name:'Sztylety',symbol:'⚔',desc:'Szybkie cięcia i krwawienie.'},
    {id:'chain',name:'Łańcuch',symbol:'⛓',desc:'Wirujący atak obszarowy.'}
  ];
  const CHAIN_BASE_LENGTH=64,CHAIN_BASE_RATE=4.3,DEG=Math.PI/180;
  let roulette=null;
  const CAMERA_ZOOM = 0.74; // v0.0.3: wider view without shrinking player hitboxes.
  const TAU = Math.PI * 2;
  const $ = id => document.getElementById(id);
  const canvas = $('arena');
  const ctx = canvas.getContext('2d', { alpha: false });
  const shell = $('game-shell');
  const overlay = $('overlay');
  const panelTitle = $('panel-title');
  const panelSubtitle = $('panel-subtitle');
  const panelContent = $('panel-content');
  const toastEl = $('toast');
  const statsOverlay = $('stats-overlay');
  const keys = new Set();
  const touchMove = { x: 0, y: 0 };
  let activeJoystick = null;
  let screenW = 480, screenH = 270;
  let state = null, mode = 'menu', lastTimestamp = 0, toastLeft = 0, statsOpen = false;
  let worldTile = null;

  const UPGRADE_DEFS = [
    { id: 'damage', title: 'Mocniejsze uderzenia', icon: '⚔', max: 3, type: 'stat', desc: 'Obrażenia broni +2 na poziom.' },
    { id: 'speed', title: 'Sprawne dłonie', icon: '➶', max: 3, type: 'stat', desc: 'Przyspiesza ataki lub obrót łańcucha.' },
    { id: 'reach', title: 'Sokoli wzrok', icon: '◎', max: 2, type: 'stat', desc: 'Zwiększa zasięg aktualnej broni.' },
    { id: 'feet', title: 'Lekki krok', icon: '✦', max: 2, type: 'stat', desc: 'Każdy poziom zwiększa prędkość ruchu o 10%.' },
    { id: 'health', title: 'Hart ducha', icon: '✚', max: 2, type: 'stat', desc: 'Zwiększa maksymalne życie o 20 i leczy 20 HP.' },
    { id: 'bounce', title: 'Odbijająca strzała', icon: '↗', max: 5, type: 'modifier', weapon:'bow', desc: 'Szansa na odbicie +20% na poziom.' },
    { id: 'split', title: 'Rozdzielenie', icon: '⋔', max: 2, type: 'modifier', weapon:'bow', desc: 'Dzieli strzałę na 2/3 słabsze pociski.' },
    { id: 'wideSlash', title: 'Szerokie cięcie', icon: '◡', max: 3, type:'modifier', weapon:'daggers', desc:'Poszerza zamach do 60° / 90° / 120°.' },
    { id: 'bleed', title: 'Krwawiące ostrza', icon: '♠', max: 3, type:'modifier', weapon:'daggers', desc:'Krwawienie przez 3 s: 2 / 4 / 6 HP/s, bez kumulowania.' },
    { id: 'longChain', title: 'Długi łańcuch', icon: '⛓', max: 3, type:'modifier', weapon:'chain', desc:'Długość łańcucha +20% na poziom.' },
    { id: 'doubleChain', title: 'Podwójny łańcuch', icon: '⟲', max: 3, type:'modifier', weapon:'chain', desc:'Drugi łańcuch, następnie obroty +20% / +40%.' }
  ];

  // Every 30 seconds one more enemy kind joins the spawn pool.
  const ENEMY_ROSTER = [
    { id:'slime-green', name:'Zielony slime', weight:6, hp:18, speed:24, radius:8, contact:5, xp:1 },
    { id:'slime-blue', name:'Niebieski slime', weight:4, hp:20, speed:39, radius:8, contact:7, xp:1 },
    { id:'slime-red', name:'Czerwony slime', weight:3, hp:83, speed:21, radius:15, contact:15, xp:3 },
    { id:'goblin', name:'Goblin', weight:3, hp:36, speed:35, radius:10, contact:11, xp:2 },
    { id:'goblin-archer', name:'Goblin łucznik', weight:2, hp:29, speed:31, radius:10, contact:7, xp:2 }
  ];
  const ELITE_ENEMY = {
    id:'slime-elite', name:'Spaczony slime', hp:150, speed:28,
    radius:19, contact:17, xp:8
  };
  const JUMP_DATA = {
    'slime-blue':{range:310,travel:224,windup:.42,duration:.26,cooldown:3.6,radius:0,damage:8},
    'slime-red':{range:160,travel:115,windup:.68,duration:.42,cooldown:4.7,radius:35,damage:11},
    'slime-elite':{range:190,travel:135,windup:.80,duration:.47,cooldown:4.1,radius:46,damage:16}
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const int = Math.floor;

  function newState() {
    return {
      elapsed: 0, spawnClock: .95, enemyStage: 0, nextEliteAt: ELITE_SPAWN_INTERVAL, eliteSpawns: 0,
      shots: 0, kills: 0, nextEnemyId: 1, weapon:'bow', chainAngle:0, slash:null,
      player: { x: 0, y: 0, motionX: 0, motionY: 0, hp: 100, maxHp: 100, hitCooldown: 0, flashTimer: 0, shotCooldown: .45, face: 1 },
      level: 1, xp: 0, upgrades: Object.fromEntries(UPGRADE_DEFS.map(u => [u.id, 0])),
      enemies: [], projectiles: [], enemyProjectiles: [], drops: [], particles: [], offered: []
    };
  }
  function neededXp(level) { return 8 + (level - 1) * 9; }

  const BASE_DAMAGE=17, DAMAGE_PER_LEVEL=2, BASE_INTERVAL=.75, INTERVAL_FACTOR=.11;
  const BASE_RANGE=205, RANGE_STEP=40, BASE_SPEED=99, SPEED_FACTOR=.10;
  function combatStats(){
    const u=state.upgrades,p=state.player,w=state.weapon;
    const damage=(w==='daggers'?8:w==='chain'?17:BASE_DAMAGE)+u.damage*DAMAGE_PER_LEVEL;
    let interval,range,chainCount=0,chainRate=0,arc=0;
    if(w==='daggers'){
      interval=.32*(1-u.speed*INTERVAL_FACTOR);range=58+u.reach*14;
      arc=[40,60,90,120][u.wideSlash];
    }else if(w==='chain'){
      chainCount=u.doubleChain?2:1;
      chainRate=CHAIN_BASE_RATE*(1+u.speed*INTERVAL_FACTOR)*(1+Math.max(0,u.doubleChain-1)*.2);
      interval=TAU/chainRate;
      range=CHAIN_BASE_LENGTH*(1+u.longChain*.2)+u.reach*11;
    }else{interval=BASE_INTERVAL*(1-u.speed*INTERVAL_FACTOR);range=BASE_RANGE+u.reach*RANGE_STEP;}
    const rate=w==='chain'?chainRate/TAU*chainCount:1/interval;
    const usedMods=UPGRADE_DEFS.filter(def=>def.type==='modifier'&&def.weapon===w&&u[def.id]>0).length;
    return {weapon:w,weaponName:WEAPONS.find(z=>z.id===w).name,damage,interval,rate,dps:damage*rate,range,
      arc,chainCount,chainRate,bleedDps:u.bleed*2,speed:BASE_SPEED*(1+u.feet*SPEED_FACTOR),
      hp:p.hp,maxHp:p.maxHp,bounce:u.bounce,bounceChance:Math.round(u.bounce*BOUNCE_CHANCE_STEP*100),
      split:u.split,splitCount:u.split?u.split+1:0,usedMods};
  }
  const fmt=(x,n=1)=>x.toFixed(n).replace('.',',');
  function buildSummary(){
    const s=combatStats(),unit=s.weapon==='chain'?'traf./s':s.weapon==='daggers'?'cięć/s':'strz./s';
    return `<div class="build-summary"><span>${s.weaponName.toUpperCase()} · BUILD</span>
      <strong>${s.damage} obr. · ${fmt(s.rate,2)} ${unit} · ${Math.ceil(s.hp)}/${s.maxHp} HP</strong>
      <button class="build-details" data-action="stats" type="button">Szczegóły (C)</button></div>`;
  }

  // Lightweight, local vector pictograms: consistent medieval UI instead of OS-dependent emoji.
  const STAT_ICONS = {
    level:'<path d="M12 2l7 4v6c0 5-3.5 7.5-7 10-3.5-2.5-7-5-7-10V6z"/><path d="M9 12h6m-3-3v6"/>',
    hp:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    xp:'<path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
    damage:'<path d="M14 4l6 6-9 9-5 1 1-5z"/><path d="M13 5l5 5M4 20l5-5"/>',
    interval:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    rate:'<path d="M4 8h11l-3-3m3 3-3 3M4 16h16m-5-3 5 3-5 3"/>',
    dps:'<path d="M3 19V5M3 19h18M6 15l4-5 3 2 6-7"/><path d="M15 5h4v4"/>',
    range:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    movement:'<path d="M4 18l4-7 4 2-4 7H4zM13 9l3-7 4 2-3 7-4-2z"/><path d="M5 7l3 2m6 8 3 2"/>',
    bounce:'<path d="M4 18h7c4 0 5-2 5-6V6"/><path d="M12 10l4-4 4 4"/><circle cx="5" cy="18" r="2"/>',
    split:'<path d="M4 12h7m0 0 7-7m-7 7 7 7"/><path d="M15 5h3v3m-3 11h3v-3"/>',
    splitDamage:'<path d="M6 18L18 6M6 6h.01M18 18h.01"/><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/>',
    slots:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };
  const UPGRADE_STAT_ICONS = {
    damage:'damage', speed:'rate', reach:'range', feet:'movement',
    health:'hp', bounce:'bounce', split:'split', wideSlash:'range', bleed:'damage', longChain:'range', doubleChain:'rate'
  };
  function statIcon(name) {
    const shape = STAT_ICONS[name] || STAT_ICONS.level;
    return `<span class="stats-icon stats-icon--${name}" aria-hidden="true"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">${shape}</svg></span>`;
  }

  function excludedModifier(id) {
    const rival=MODIFIER_EXCLUDES[id];
    return rival && state.upgrades[rival]>0 ? UPGRADE_DEFS.find(u=>u.id===rival) : null;
  }
  function modifierNote(id) {
    if (!MODIFIER_EXCLUDES[id]) return '';
    const blocked=excludedModifier(id);
    if (blocked) return 'Zablokowane przez: '+blocked.title;
    const rival=UPGRADE_DEFS.find(u=>u.id===MODIFIER_EXCLUDES[id]);
    return 'Wyklucza: '+rival.title;
  }

  function renderStats(){
    const s=combatStats(),w=s.weapon;
    const rows=[
      ['level','Poziom',state.level],['hp','HP',`${Math.ceil(s.hp)} / ${s.maxHp}`],
      ['xp','EXP',`${state.xp} / ${neededXp(state.level)}`],
      ['damage',w==='bow'?'Obrażenia strzały':w==='daggers'?'Obrażenia cięcia':'Obrażenia łańcucha',s.damage],
      ['interval',w==='chain'?'Czas pełnego obrotu':'Czas między atakami',`${fmt(s.interval,3)} s`],
      ['rate',w==='chain'?'Trafienia/s na cel':'Ataki/s',fmt(s.rate,2)],
      ['dps','DPS na jednym celu (teor.)',fmt(s.dps,2)],
      ['range',w==='chain'?'Długość łańcucha':'Zasięg',`${fmt(s.range)} jedn.`],
      ['movement','Prędkość ruchu',`${fmt(s.speed)} jedn./s`]
    ];
    if(w==='bow'){
      rows.push(['bounce','Szansa na odbicie',s.bounceChance?`${s.bounceChance}%`:'0%']);
      rows.push(['split','Rozdzielenie',s.splitCount?`${s.splitCount} strzały`:'Brak']);
    }else if(w==='daggers'){
      rows.push(['range','Kąt cięcia',`${s.arc}°`]);
      rows.push(['damage','Krwawienie',s.bleedDps?`${s.bleedDps} HP/s przez 3 s`:'Brak']);
    }else{
      rows.push(['rate','Obroty/s',fmt(s.chainRate/TAU,2)]);
      rows.push(['slots','Liczba łańcuchów',s.chainCount]);
    }
    rows.push(['slots','Sloty modyfikatorów',`${s.usedMods} / ${MOD_SLOTS}`]);
    const list=UPGRADE_DEFS.filter(u=>!u.weapon||u.weapon===w);
    const note=w==='bow'?'Odbijająca strzała i Rozdzielenie wzajemnie się wykluczają.':
      w==='daggers'?'Szerokie cięcie i Krwawiące ostrza wzajemnie się wykluczają. Krwawienie nie kumuluje się.':
      'Długi łańcuch i Podwójny łańcuch wzajemnie się wykluczają. Łańcuch trafia wroga raz na obrót.';
    $('stats-content').innerHTML=`<p class="stats-section">ŁOTRZYK · ${s.weaponName.toUpperCase()}</p>
      <div class="stats-grid">${rows.map(([icon,title,value])=>`<div class="stats-item"><div class="stats-item-heading">${statIcon(icon)}<span>${title}</span></div><strong>${value}</strong></div>`).join('')}</div>
      <p class="stats-section">ULEPSZENIA</p>
      <div class="stats-upgrades">${list.map(u=>`<div class="${excludedModifier(u.id)?'is-locked':''}"><span class="stats-upgrade-heading">${statIcon(UPGRADE_STAT_ICONS[u.id])}<span>${u.title}${modifierNote(u.id)?`<small class="upgrade-rule">${modifierNote(u.id)}</small>`:''}</span></span><strong>${excludedModifier(u.id)?'BLOKADA':`${state.upgrades[u.id]}/${u.max}`}</strong></div>`).join('')}</div>
      <p class="stats-exclusion-note">${note}</p>
      <p class="stats-note">Teoretyczny DPS na jednym celu, bez dodatkowych efektów.</p>`;
  }
  function closeStats(){
    if(!statsOpen)return;
    statsOpen=false;statsOverlay.classList.remove('shown');
    statsOverlay.setAttribute('aria-hidden','true');keys.clear();
  }
  function showStats(){
    if(statsOpen)return;
    renderStats();statsOpen=true;resetJoystick();
    statsOverlay.classList.add('shown');
    statsOverlay.setAttribute('aria-hidden','false');
  }
  function toggleStats(){if(statsOpen)closeStats();else showStats();}

  function visibleMode(next) {
    mode=next;
    overlay.classList.toggle('shown',next!=='playing');
    overlay.classList.toggle('levelup-mode',next==='levelup');
    overlay.classList.toggle('roulette-mode',next==='roulette');
  }
  function button(label, action, secondary = false) {
    return `<button class="${secondary ? 'secondary-button' : 'primary-button'}" data-action="${action}">${label}</button>`;
  }
  function showMenu() {
    closeStats();
    state = newState();
    visibleMode('menu');
    panelTitle.textContent = 'SURVIVORS';
    panelSubtitle.textContent = 'Zapomniany Trakt';
    panelContent.innerHTML = `<p class="intro-text">Na Zapomniany Trakt wpełzły slime’y. Co 30 sekund dołączają kolejne potwory, a na końcu gobliny. Przetrwaj 5 minut. Ruletka przed wyprawą losuje łuk, sztylety lub łańcuch. Możesz raz ponownie losować.</p>
      <div class="info-trio"><div class="info-box"><b>05:00</b><span>CZAS PRÓBY</span></div><div class="info-box"><b>1</b><span>BROŃ NA RUN</span></div><div class="info-box"><b>3</b><span>KARTY WYBORU</span></div></div>
      ${button('Rozpocznij wyprawę', 'start')}
      ${button('Pełny ekran', 'fullscreen', true)}
      <p class="hint">PC: WSAD / strzałki · P: pauza · C: statystyki · 1, 2, 3: wybór karty<br>Telefon: joystick po lewej lub prawej stronie</p>`;
    updateHud();
  }

  function beginRoulette(){
    closeStats();state=newState();keys.clear();touchMove.x=touchMove.y=0;resetJoystick();
    roulette={
      spinning:false,phase:'ready',selection:null,rerollsLeft:1,reducedWeapon:null,
      angle:0,spinSpeed:0,stopStartAngle:0,stopElapsed:0,stopDuration:2.7,
      weights:[],sectors:[],target:null
    };
    visibleMode('roulette');panelTitle.textContent='RULETKA BRONI';
    panelSubtitle.textContent='Los łotrzyka · jedna broń na wyprawę';
    spinRoulette(false);
  }
  function rouletteSectors(weights){
    // One complete circle; segment lengths are exactly proportional to weights.
    let start=-weights[0]*180;
    return weights.map((weight,index)=>{
      const end=start+weight*360;
      const sector={index,weight,start,end,center:(start+end)/2};
      start=end;
      return sector;
    });
  }
  function spinRoulette(reroll){
    if(mode!=='roulette'||!roulette||roulette.spinning)return;
    const r=roulette;
    if(reroll){
      if(r.rerollsLeft<=0||!r.selection)return;
      r.reducedWeapon=r.selection;
      r.rerollsLeft--;
    }else if(r.selection!==null)return;
    r.weights=WEAPONS.map(w=>r.reducedWeapon?(w.id===r.reducedWeapon?.25:.375):1/3);
    r.sectors=rouletteSectors(r.weights);
    // The starting phase is random; the player decides when to trigger deceleration.
    r.angle=Math.random()*360;
    r.spinSpeed=590+Math.random()*60; // Degrees per second during free spin.
    r.phase='spinning';r.spinning=true;r.selection=null;r.target=null;
    r.stopElapsed=0;
    renderRoulette();
  }
  function stopRoulette(){
    if(mode!=='roulette'||!roulette||roulette.phase!=='spinning')return;
    const r=roulette;
    r.phase='stopping';
    r.stopStartAngle=r.angle;
    r.stopElapsed=0;
    renderRoulette();
  }
  function selectedRouletteSector(r){
    // The static pointer points up (0 degrees). Undo wheel rotation.
    const start=r.sectors[0].start;
    const position=((-r.angle-start)%360+360)%360+start;
    return r.sectors.find(sector=>position>=sector.start&&position<sector.end)||
      r.sectors[r.sectors.length-1];
  }
  function updateRoulette(dt){
    if(mode!=='roulette'||!roulette||!roulette.spinning)return;
    const r=roulette;
    if(r.phase==='spinning'){
      r.angle=(r.angle+r.spinSpeed*dt)%360;
    }else if(r.phase==='stopping'){
      r.stopElapsed=Math.min(r.stopDuration,r.stopElapsed+dt);
      const progress=r.stopElapsed/r.stopDuration;
      // Ease-out cubic: derivative at t=0 equals prior spinSpeed,
      // derivative at t=1 is zero, with no abrupt speed jump.
      r.angle=r.stopStartAngle+r.spinSpeed*r.stopDuration/3*
        (1-(1-progress)**3);
      if(progress>=1){
        r.spinning=false;r.phase='done';
        const sector=selectedRouletteSector(r);
        r.target=sector.index;
        r.selection=WEAPONS[sector.index].id;
        renderRoulette();
        return;
      }
    }
    const wheel=$('roulette-wheel');
    if(wheel)wheel.style.transform='rotate('+r.angle+'deg)';
  }
  function wheelSlicePath(startAngle,endAngle){
    const radius=146,cx=160,cy=160;
    const a=(startAngle-90)*DEG,b=(endAngle-90)*DEG;
    const x1=cx+Math.cos(a)*radius,y1=cy+Math.sin(a)*radius;
    const x2=cx+Math.cos(b)*radius,y2=cy+Math.sin(b)*radius;
    const large=endAngle-startAngle>180?1:0;
    return 'M '+cx+' '+cy+' L '+x1.toFixed(2)+' '+y1.toFixed(2)+
      ' A '+radius+' '+radius+' 0 '+large+' 1 '+x2.toFixed(2)+' '+y2.toFixed(2)+' Z';
  }
  function roulettePercent(value){
    return Math.abs(value-1/3)<.00001?'33,3%':
      (value*100).toFixed(value*100%1===0?0:1).replace('.',',')+'%';
  }

  function roulettePercent(value){
    return Math.abs(value-1/3)<.00001?'33,3%':
      (value*100).toFixed(value*100%1===0?0:1).replace('.',',')+'%';
  }
  function renderRoulette(){
    const r=roulette,isDone=r.phase==='done';
    const palette=['#385243','#6b4b34','#3c5263'];
    const sectors=r.sectors.map(sector=>{
      const weapon=WEAPONS[sector.index];
      const theta=(sector.center-90)*DEG;
      const x=160+Math.cos(theta)*96;
      const y=160+Math.sin(theta)*96;
      // While turning only weapon icons are shown; after stopping, rotate
      // the captions back to horizontal, independent of wheel angle.
      const textGroup=isDone?
        '<g transform="rotate('+(-r.angle)+' '+x+' '+y+')" text-anchor="middle" fill="#f5e9c7" font-family="Georgia,serif">'+
        '<text x="'+x+'" y="'+(y-24)+'" class="wheel-weapon-symbol">'+weapon.symbol+'</text>'+
        '<text x="'+x+'" y="'+(y+0)+'" class="wheel-weapon-name">'+weapon.name+'</text>'+
        '<text x="'+x+'" y="'+(y+23)+'" class="wheel-weapon-percent">'+roulettePercent(sector.weight)+'</text></g>':
        '<g text-anchor="middle" fill="#f5e9c7" font-family="Georgia,serif">'+
        '<text x="'+x+'" y="'+(y+11)+'" class="wheel-weapon-icon-only">'+weapon.symbol+'</text></g>';
      return '<path d="'+wheelSlicePath(sector.start,sector.end)+
        '" fill="'+palette[sector.index]+'" stroke="#121a16" stroke-width="4" />'+textGroup;
    }).join('');
    const legend=WEAPONS.map((w,i)=>
      '<div class="roulette-odd'+(r.reducedWeapon===w.id?' reduced':'')+'">'+
      '<span class="roulette-odd-name">'+w.symbol+' '+w.name+'</span>'+
      '<strong>'+roulettePercent(r.weights[i])+'</strong></div>'
    ).join('');
    let outcome,controls;
    if(r.phase==='spinning'){
      outcome='Koło się kręci. Zatrzymaj je w wybranej chwili!';
      controls=button('ZATRZYMAJ KOŁO','stop');
    }else if(r.phase==='stopping'){
      outcome='Koło zwalnia…';
      controls='<p class="roulette-spinning-hint">Koło zatrzymuje się…</p>';
    }else{
      outcome='Wylosowano: <strong>'+WEAPONS[r.target].name+'</strong>';
      controls=(r.rerollsLeft?button('Losuj ponownie (1 raz)','reroll',true):
        '<p class="roulette-spent">Ponowne losowanie wykorzystane</p>')+
        button('Ruszaj w drogę','confirm');
    }
    panelContent.innerHTML='<div class="roulette-wheel-stage">'+
      '<span class="roulette-pointer" aria-hidden="true"></span>'+
      '<div class="roulette-wheel" id="roulette-wheel" style="transform:rotate('+r.angle+'deg)">'+
      '<svg viewBox="0 0 320 320" class="roulette-wheel-art" role="img" aria-label="Koło losujące broń">'+
      '<circle cx="160" cy="160" r="155" fill="#1b251e" stroke="#c9a66a" stroke-width="8"/>'+
      sectors+
      '<circle cx="160" cy="160" r="21" fill="#1b2923" stroke="#d2ae70" stroke-width="5"/>'+
      '<circle cx="160" cy="160" r="7" fill="#cbb17e"/></svg></div></div>'+
      '<p class="roulette-outcome" aria-live="polite">'+outcome+'</p>'+
      '<div class="roulette-odds">'+legend+'</div>'+
      '<p class="roulette-odds-note">'+(r.reducedWeapon?
        'Poprzednia broń: 25%. Dwie pozostałe: po 37,5%.':
        'Każda broń ma równą szansę: 33,3%.')+'</p>'+
      controls+
      '<p class="hint">Jedna broń na całą wyprawę. '+(r.rerollsLeft?
        'Masz jedno ponowne losowanie.':'Wynik jest ostateczny.')+'</p>';
  }
  function startGame(){
    if(mode!=='roulette'||!roulette||roulette.spinning||!roulette.selection)return;
    const weapon=roulette.selection;
    closeStats();state=newState();state.weapon=weapon;roulette=null;
    keys.clear();touchMove.x=touchMove.y=0;resetJoystick();
    visibleMode('playing');updateHud();
    toast('Broń: '+WEAPONS.find(w=>w.id===weapon).name+'. Przetrwaj pięć minut!');
  }
  function pauseGame() {
    if (mode === 'playing') {
      resetJoystick();
      visibleMode('paused');
      panelTitle.textContent = 'PAUZA'; panelSubtitle.textContent = 'Odpoczynek na trakcie';
      panelContent.innerHTML = `<p class="pause-text">Walka zatrzymana. Możesz wrócić do wyprawy lub zacząć od początku.</p>${button('Wróć do walki', 'resume')}${button('Statystyki postaci', 'stats', true)}${button('Nowa wyprawa', 'restart', true)}`;
    } else if (mode === 'paused') visibleMode('playing');
  }
  function endRun(won) {
    visibleMode('result');
    panelTitle.textContent = won ? 'PRZETRWANO!' : 'WYPRAWA ZAKOŃCZONA';
    panelSubtitle.textContent = won ? 'Trakt oczyszczony' : 'Mrok zwyciężył tym razem';
    panelContent.innerHTML = `<p class="end-text">${won ? 'Udało Ci się przetrwać pięciominutową próbę.' : 'Potwory otoczyły łotrzyka. Następnym razem spróbuj innego zestawu ulepszeń.'}</p>
      <div class="info-trio"><div class="info-box"><b>${formatTime(state.elapsed)}</b><span>CZAS</span></div><div class="info-box"><b>${state.kills}</b><span>POKONANI</span></div><div class="info-box"><b>${state.level}</b><span>POZIOM</span></div></div>
      ${button('Zagraj ponownie', 'restart')}${button('Statystyki postaci', 'stats', true)}${button('Menu', 'menu', true)}`;
  }
  function getEligible() {
    const levels = state.upgrades;
    const occupied=UPGRADE_DEFS.filter(u=>u.type==='modifier'&&u.weapon===state.weapon&&levels[u.id]>0).length;
    return UPGRADE_DEFS.filter(u=>(!u.weapon||u.weapon===state.weapon)&&levels[u.id]<u.max&&
      !excludedModifier(u.id)&&(u.type!=='modifier'||levels[u.id]>0||occupied<MOD_SLOTS));
  }
  function showLevelUp() {
    const options = getEligible();
    for (let i = options.length - 1; i > 0; i--) { const j = int(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
    state.offered = options.slice(0, 3);
    if (!state.offered.length) { toast('Wszystkie ulepszenia rozwinięte'); return; }
    visibleMode('levelup');
    panelTitle.textContent = `POZIOM ${state.level}`;
    panelSubtitle.textContent = 'Wybierz jedno ulepszenie';
    panelContent.innerHTML = `<div class="level-header"><span class="level-headline">TRZY DROGI · JEDEN WYBÓR</span></div>
      <div class="card-grid">${state.offered.map((u, i) => `<button class="upgrade-card ${u.type === 'modifier' ? 'modifier' : ''}" data-card="${i}">
      <span class="upgrade-icon">${u.icon}</span><span class="upgrade-title">${u.title}</span>
      <span class="upgrade-desc">${u.desc}</span>
      ${u.id==='bounce' ? `<span class="upgrade-progression">SZANSA: ${state.upgrades.bounce*20}% → ${(state.upgrades.bounce+1)*20}%</span>` : ''}
      ${u.type==='modifier' ? `<span class="upgrade-conflict">${modifierNote(u.id)}</span>` : ''}
      <span class="upgrade-level">POZIOM ${state.upgrades[u.id]} / ${u.max}</span>
      <span class="upgrade-choice"><kbd>${i+1}</kbd><span>WYBIERZ</span></span></button>`).join('')}</div>
      ${buildSummary()}
      <p class="hint">Walka jest wstrzymana. Wybierz kartę kliknięciem lub klawiszem 1–3.</p>`;
  }
  function selectCard(index) {
    if (mode !== 'levelup') return;
    const u = state.offered[index];
    if (!u || !getEligible().some(available=>available.id===u.id)) return;
    state.upgrades[u.id]++;
    if (u.id === 'health') {
      state.player.maxHp += 20;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
    }
    visibleMode('playing');
    updateHud();
    toast(`${u.title} ${state.upgrades[u.id]}/${u.max}`);
    // If multiple levels are gained from a large pickup, offer the next on the following frame.
  }
  function toast(message) {
    toastEl.textContent = message; toastEl.classList.add('active'); toastLeft = 2.1;
  }
  function formatTime(value) { const seconds = Math.max(0, Math.ceil(value)); return `${String(int(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`; }
  function updateHud() {
    if (!state) return;
    $('timer').textContent = formatTime(RUN_DURATION - state.elapsed);
    $('hp-text').textContent = `${Math.ceil(state.player.hp)} / ${state.player.maxHp}`;
    $('hp-fill').style.width = `${clamp(state.player.hp / state.player.maxHp * 100,0,100)}%`;
    $('level-text').textContent = `POZIOM ${state.level}`;
    $('xp-text').textContent = `${state.xp} / ${neededXp(state.level)} EXP`;
    $('xp-fill').style.width = `${clamp(state.xp / neededXp(state.level) * 100,0,100)}%`;
    $('weapon-name').textContent=combatStats().weaponName.toUpperCase();
    const icons={bounce:'↗',split:'⋔',wideSlash:'◡',bleed:'♠',longChain:'⛓',doubleChain:'⟲'};
    const m=UPGRADE_DEFS.filter(u=>u.type==='modifier'&&u.weapon===state.weapon&&state.upgrades[u.id]>0)
      .map(u=>`${icons[u.id]} ${u.title} ${state.upgrades[u.id]}/${u.max}`);
    while (m.length < MOD_SLOTS) m.push('◇ PUSTE');
    $('mods-text').textContent = m.join(' · ');
    $('kills-text').textContent = `Pokonani: ${state.kills}`;
  }

  function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    screenW = Math.max(160, int(r.width / (2 * CAMERA_ZOOM)));
    screenH = Math.max(100, int(r.height / (2 * CAMERA_ZOOM)));
    canvas.width = screenW; canvas.height = screenH;
    ctx.imageSmoothingEnabled = false;
  }

  function makeGroundTile() {
    const tile = document.createElement('canvas'); tile.width = tile.height = 96;
    const g = tile.getContext('2d');
    g.fillStyle = '#252d27'; g.fillRect(0, 0, 96, 96);
    for (let y = 0; y < 96; y += 4) for (let x = 0; x < 96; x += 4) {
      const v = hash(x + 123, y + 112);
      g.fillStyle = v < .3 ? '#212923' : v < .48 ? '#2b3229' : v < .72 ? '#30362d' : '#273027';
      g.fillRect(x, y, 4, 4);
    }
    for (let i = 0; i < 85; i++) {
      const x = int(hash(i, 91) * 96), y = int(hash(i, 102) * 96);
      const v = hash(i, 201);
      g.fillStyle = v < .3 ? '#3d4937' : v < .6 ? '#3b3b31' : '#22291f';
      g.fillRect(x, y, 2 + int(v * 3), 1 + int(v * 2));
    }
    return tile;
  }
  function spawnEnemy(forcedType = null) {
    const p = state.player;
    const eligible = ENEMY_ROSTER.slice(0, Math.min(ENEMY_ROSTER.length, state.enemyStage + 1));
    const weightSum = eligible.reduce((sum, def) => sum + def.weight, 0);
    let roll = Math.random() * weightSum, kind = eligible[eligible.length - 1];
    for (const def of eligible) { roll -= def.weight; if (roll < 0) { kind = def; break; } }
    if (forcedType) kind = forcedType===ELITE_ENEMY.id
      ? ELITE_ENEMY : (ENEMY_ROSTER.find(def => def.id === forcedType) || kind);
    const moving=Math.hypot(p.motionX,p.motionY)>10;
    // Every third ordinary spawn approaches from in front of a moving player,
    // instead of always feeding the trailing crowd at the center of a circular route.
    const angle= !forcedType && moving && state.nextEnemyId%3===0
      ? Math.atan2(p.motionY,p.motionX)+rand(-.85,.85)
      : rand(0,TAU);
    // Limited distance keeps enemies participating on ultrawide monitors as well as phones.
    const radius = clamp(Math.min(screenW,screenH)/2 + 52, 225, 355);
    const x = p.x + Math.cos(angle) * radius;
    const y = p.y + Math.sin(angle) * radius;
    const factor = state.elapsed / RUN_DURATION;
    const hp = Math.round(kind.hp * (1 + .28 * factor));
    state.enemies.push({
      id:state.nextEnemyId++, type:kind.id, x, y, hp, maxHp:hp, xp:kind.xp,
      elite:kind.id===ELITE_ENEMY.id,
      speed:kind.speed*1.08*(1 + .13*factor) + rand(-1.8,1.8),
      contact:kind.contact, hit:0, attackTimer:rand(1.1,2.4),
      skillCooldown:kind.id===ELITE_ENEMY.id?1.5:rand(1.8,3.0),
      jump:null, impact:null, recovery:0,
      aiTime:rand(0,TAU), wobble:rand(0,TAU), radius:kind.radius, spawnAge:0
    });
  }
  function nearestEnemy(x,y,range,excluded=new Set()) {
    let best = null, min = range * range;
    for (const e of state.enemies) {
      if (e.hp <= 0 || excluded.has(e.id)) continue;
      const d = (e.x - x)**2 + (e.y - y)**2;
      if (d < min) { min = d; best = e; }
    }
    return best;
  }
  function fireArrow() {
    const p = state.player, levels = state.upgrades;
    const range = combatStats().range;
    const enemy = nearestEnemy(p.x,p.y,range);
    if (!enemy || state.projectiles.length >= MAX_PROJECTILES) return;
    const a = Math.atan2(enemy.y - p.y, enemy.x - p.x);
    p.face = Math.cos(a) >= 0 ? 1 : -1;
    state.shots++;
    state.projectiles.push({ x:p.x + Math.cos(a)*11, y:p.y - 4 + Math.sin(a)*11, vx:Math.cos(a)*258, vy:Math.sin(a)*258,
      angle:a, life:1.5, damage:combatStats().damage, visited:new Set(), bounces:0, generation:0, splitUsed:false });
    addParticles(p.x + Math.cos(a)*13, p.y - 4 + Math.sin(a)*11, 1, '#d3b988');
  }
  function attackDaggers(){
    const p=state.player,s=combatStats(),target=nearestEnemy(p.x,p.y,s.range);
    if(!target)return;
    const angle=Math.atan2(target.y-p.y,target.x-p.x),half=s.arc*DEG/2;
    p.face=Math.cos(angle)>=0?1:-1;
    state.shots++;state.slash={angle,half,range:s.range,time:.18,full:.18};
    for(const e of state.enemies){
      if(e.hp<=0)continue;
      const d=Math.hypot(e.x-p.x,e.y-p.y);
      if(d>s.range+e.radius)continue;
      const theta=Math.atan2(e.y-p.y,e.x-p.x);
      const diff=Math.atan2(Math.sin(theta-angle),Math.cos(theta-angle));
      if(Math.abs(diff)>half+Math.asin(Math.min(1,e.radius/Math.max(d,e.radius))))continue;
      hurtEnemy(e,s.damage);
      if(e.hp>0&&state.upgrades.bleed>0)e.bleed={time:3,dps:state.upgrades.bleed*2,visualClock:0};
    }
  }
  function updateBleeds(dt){
    for(const e of state.enemies){
      if(e.hp<=0||!e.bleed)continue;
      const b=e.bleed,active=Math.min(dt,b.time);
      b.time-=active;b.visualClock+=active;
      if(active>0)hurtEnemy(e,b.dps*active,false);
      if(e.hp>0&&b.visualClock>=.5){b.visualClock-=.5;addParticles(e.x,e.y-10,1,'#b34c49');}
      if(b.time<=.00001)e.bleed=null;
    }
  }
  function advanceChains(dt){
    const p=state.player,s=combatStats(),before=state.chainAngle;
    const delta=s.chainRate*dt,steps=Math.max(1,Math.ceil(delta/.16));
    for(let step=1;step<=steps;step++){
      const angle=before+delta*step/steps;
      for(let c=0;c<s.chainCount;c++){
        const rotation=angle+c*Math.PI,turn=Math.floor(rotation/TAU);
        const ex=p.x+Math.cos(rotation)*s.range,ey=p.y+Math.sin(rotation)*s.range;
        for(const e of state.enemies){
          if(e.hp<=0)continue;
          if(!e.chainTurns)e.chainTurns=[-Infinity,-Infinity];
          if(e.chainTurns[c]===turn)continue;
          const radius=e.radius+4;
          if(distanceToSegmentSq(e.x,e.y,p.x,p.y,ex,ey)>radius*radius)continue;
          e.chainTurns[c]=turn;hurtEnemy(e,s.damage);
        }
      }
    }
    state.chainAngle=before+delta;
  }
  function addParticles(x,y,count,color) {
    for (let i = 0; i < count && state.particles.length < 90; i++) {
      state.particles.push({ x, y, vx:rand(-40,40), vy:rand(-48,22), life:rand(.2,.42), max:.42, color });
    }
  }
  function hurtEnemy(enemy,damage,visual=true) {
    if(enemy.hp<=0)return;
    enemy.hp-=damage;
    if(visual){enemy.hit=.13;addParticles(enemy.x,enemy.y-6,2,'#9ca57b');}
    if(enemy.hp<=0) {
      state.kills++;
      addParticles(enemy.x,enemy.y,5,'#677a53');
      if (state.drops.length < MAX_DROPS) state.drops.push({x:enemy.x,y:enemy.y,amount:enemy.xp+(state.kills%8===0?1:0),phase:rand(0,TAU)});
    }
  }
  function processArrowHit(arrow, enemy) {
    arrow.visited.add(enemy.id);
    hurtEnemy(enemy,arrow.damage);
    const levels = state.upgrades;
    // Split cannot chain. Bounce is mutually exclusive with split and rolls per hit.
    if (levels.split > 0 && !arrow.splitUsed && arrow.generation === 0 && state.projectiles.length < MAX_PROJECTILES - 3) {
      arrow.splitUsed = true;
      const count = levels.split + 1;
      const a = arrow.angle;
      for (let i = 0; i < count; i++) {
        const angle = a + (i - (count-1)/2) * .60;
        state.projectiles.push({ x:enemy.x,y:enemy.y, vx:Math.cos(angle)*225, vy:Math.sin(angle)*225, angle,
          life:.80, damage:arrow.damage*.58, visited:new Set(arrow.visited), bounces:arrow.bounces, generation:1, splitUsed:true });
      }
    }
    if (levels.bounce > 0 && arrow.bounces < BOUNCE_MAX_HITS) {
      const next = nearestEnemy(enemy.x,enemy.y,140,arrow.visited);
      if (next && Math.random() < levels.bounce * BOUNCE_CHANCE_STEP) {
        const a = Math.atan2(next.y - enemy.y,next.x - enemy.x);
        arrow.x = enemy.x; arrow.y = enemy.y; arrow.vx = Math.cos(a)*245; arrow.vy = Math.sin(a)*245;
        arrow.angle = a; arrow.bounces++; arrow.damage *= .75; arrow.life = Math.min(arrow.life, .75); return true;
      }
    }
    return false;
  }
  function collectXp(drop) {
    state.xp += drop.amount;
    addParticles(drop.x,drop.y - 5,3,'#7dd3b4');
  }
  function hurtPlayer(damage) {
    const p = state.player;
    if (p.hitCooldown > 0) return;
    p.hp = Math.max(0, p.hp - damage);
    p.hitCooldown = .85;
    p.flashTimer = PLAYER_HIT_FLASH;
    addParticles(p.x,p.y,6,'#bc6353');
    if (p.hp <= 0) endRun(false);
  }

  function beginEnemyJump(e, p, distance) {
    const info=JUMP_DATA[e.type];
    if(!info || e.jump || e.skillCooldown>0 || e.spawnAge<.85 ||
        distance > info.range || distance<28) return false;
    // Target locks in during the tell. A moving player can dodge the landing zone.
    // The previous 224-unit blue dash could activate from 310 units away and
    // stop short. It now always goes 30 units PAST the player's locked position,
    // while keeping the 310-unit activation range and same dodgable telegraph.
    const dashDistance=e.type==='slime-blue' ? distance+SLIME_BLUE_OVERSHOOT : Math.min(distance,info.travel);
    const fraction=dashDistance/distance;
    e.jump={
      phase:'warning',time:info.windup,windup:info.windup,
      duration:info.duration,elapsed:0,
      startX:e.x,startY:e.y,
      targetX:e.x+(p.x-e.x)*fraction,
      targetY:e.y+(p.y-e.y)*fraction,
      dash:e.type==='slime-blue',dashHit:false,
      radius:info.radius,damage:info.damage
    };
    e.skillCooldown=info.cooldown+rand(-.3,.5);
    return true;
  }

  function distanceToSegmentSq(px,py,ax,ay,bx,by){
    const dx=bx-ax,dy=by-ay;
    const lengthSq=dx*dx+dy*dy;
    const t=lengthSq===0?0:clamp(((px-ax)*dx+(py-ay)*dy)/lengthSq,0,1);
    const cx=ax+t*dx,cy=ay+t*dy;
    return (px-cx)*(px-cx)+(py-cy)*(py-cy);
  }

  function advanceEnemyJump(e,dt) {
    if(!e.jump) return false;
    const j=e.jump;
    if(j.phase==='warning'){
      j.time-=dt;
      if(j.time<=0){j.phase='airborne';j.elapsed=0;}
      return true;
    }
    j.elapsed+=dt;
    const t=clamp(j.elapsed/j.duration,0,1);
    // Blue uses a fast, straight dash along the warned line; red and elite still jump.
    const move=j.dash?t:t*t*(3-2*t);
    const oldX=e.x,oldY=e.y;
    e.x=j.startX+(j.targetX-j.startX)*move;
    e.y=j.startY+(j.targetY-j.startY)*move;
    if(j.dash&&!j.dashHit){
      const p=state.player;
      const contact=e.radius+5;
      // Segment test catches hits even if a dash moves past the player in one frame.
      if(distanceToSegmentSq(p.x,p.y,oldX,oldY,e.x,e.y)<=contact*contact){
        j.dashHit=true;
        hurtPlayer(j.damage);
      }
    }
    if(t>=1){
      e.x=j.targetX;e.y=j.targetY;
      e.jump=null;
      if(j.radius>0){
        e.impact={x:e.x,y:e.y,radius:j.radius,time:.27,full:.27};
        const p=state.player;
        if(Math.hypot(p.x-e.x,p.y-e.y)<=j.radius+5) hurtPlayer(j.damage);
        addParticles(e.x,e.y,9,e.elite?'#b69bba':'#c36d53');
      } else {
        e.recovery=.48; // Brief pause after sprint gives the player time to react.
        addParticles(e.x,e.y,5,'#75afd2');
      }
    }
    return true;
  }

  function spawnElite() {
    // Elite arrival is guaranteed even if the arena reaches the ordinary spawn cap.
    if(state.enemies.length>=MAX_ENEMIES){
      const index=state.enemies.findIndex(e=>!e.elite);
      if(index>=0)state.enemies.splice(index,1);
    }
    if(state.enemies.length>=MAX_ENEMIES)return;
    spawnEnemy(ELITE_ENEMY.id);
    state.eliteSpawns++;
    toast('ELITA: Spaczony slime!');
  }


  function enemyBodyRadius(e) {
    // Space taken by the visible sprite, wider than its damage hitbox.
    if(e.elite)return 22;
    if(e.type==='slime-red')return 18;
    if(e.type==='goblin-archer')return 14; // Bow extends beyond the torso.
    if(e.type==='goblin')return 12;
    return 11;
  }

  function nudgeEnemy(e,dx,dy) {
    e.x+=dx;e.y+=dy;
    if(e.jump) {
      // Keep telegraphs and trajectories aligned while passing through a crowd.
      e.jump.startX+=dx;e.jump.startY+=dy;
      e.jump.targetX+=dx;e.jump.targetY+=dy;
    }
  }

  function crowdAvoidance(e) {
    let rx=0,ry=0;
    const personal=enemyBodyRadius(e);
    for(const other of state.enemies) {
      if(other===e||other.hp<=0)continue;
      let dx=e.x-other.x,dy=e.y-other.y;
      const area=personal+enemyBodyRadius(other)+12;
      if(Math.abs(dx)>=area||Math.abs(dy)>=area)continue;
      const sq=dx*dx+dy*dy;
      if(sq>=area*area)continue;
      let len=Math.sqrt(sq);
      if(len<.001) {
        const a=(e.id*2.3999632+other.id*.6180339)%TAU;
        dx=Math.cos(a);dy=Math.sin(a);len=1;
      }
      const strength=(area-Math.sqrt(sq))/area;
      rx+=dx/len*strength;ry+=dy/len*strength;
    }
    return {x:rx,y:ry};
  }

  function resolveEnemyCrowding() {
    const enemies=state.enemies;
    // Broad-phase distance checks keep separation manageable at the 80-enemy cap.
    for(let pass=0;pass<12;pass++) {
      let found=false;
      for(let i=0;i<enemies.length;i++) {
        const a=enemies[i];if(a.hp<=0)continue;
        for(let j=i+1;j<enemies.length;j++) {
          const b=enemies[j];if(b.hp<=0)continue;
          const gap=enemyBodyRadius(a)+enemyBodyRadius(b);
          let dx=b.x-a.x,dy=b.y-a.y;
          if(Math.abs(dx)>=gap||Math.abs(dy)>=gap)continue;
          const sq=dx*dx+dy*dy;
          if(sq>=gap*gap)continue;
          let nx,ny;
          if(sq<.000001) {
            // Deterministic direction even if five archers share one pixel.
            const angle=(a.id*2.3999632+b.id*.6180339)%TAU;
            nx=Math.cos(angle);ny=Math.sin(angle);
          } else {
            const length=Math.sqrt(sq);nx=dx/length;ny=dy/length;
          }
          const overlap=gap-Math.sqrt(sq)+.02;
          const massA=a.jump?18:(a.elite?4:1);
          const massB=b.jump?18:(b.elite?4:1);
          const shareA=massB/(massA+massB);
          nudgeEnemy(a,-nx*overlap*shareA,-ny*overlap*shareA);
          nudgeEnemy(b,nx*overlap*(1-shareA),ny*overlap*(1-shareA));
          found=true;
        }
      }
      if(!found)break;
    }
  }

  function moveEnemy(e, dt) {
    if(e.hp<=0)return;
    const p = state.player;
    const vx=p.x-e.x,vy=p.y-e.y,d=Math.max(.0001,Math.hypot(vx,vy));
    // Pursuit lanes: some monsters aim ahead of the moving player, others flank
    // to either side. This breaks up the knot of enemies left in the center
    // when the player runs in circles, without adding unavoidable attacks.
    const movement=Math.hypot(p.motionX||0,p.motionY||0);
    const lead=movement>1 ? clamp(d/145,.25,1.4) *
      (e.type==='goblin-archer'?.35:e.type==='slime-green'?.60:.95) : 0;
    const lane=(e.id%3)-1;
    const flank=lane*Math.min(movement>1?46:17,d*.29);
    const sideX=movement>1?-p.motionY/movement:-vy/d;
    const sideY=movement>1?p.motionX/movement:vx/d;
    const chaseX=vx+p.motionX*lead+sideX*flank;
    const chaseY=vy+p.motionY*lead+sideY*flank;
    const chaseDist=Math.max(.0001,Math.hypot(chaseX,chaseY));
    const ux=chaseX/chaseDist,uy=chaseY/chaseDist;
    e.aiTime+=dt;e.wobble+=dt*(e.type==='slime-blue'?9:5);
    e.hit=Math.max(0,e.hit-dt);
    e.spawnAge+=dt;
    e.skillCooldown=Math.max(0,(e.skillCooldown||0)-dt);
    if(e.impact){
      e.impact.time-=dt;
      if(e.impact.time<=0)e.impact=null;
    }
    if(advanceEnemyJump(e,dt))return;
    if(e.recovery>0){
      e.recovery=Math.max(0,e.recovery-dt);
      return;
    }
    if(beginEnemyJump(e,p,d))return;
    let forward=1, sideways=0, speed=e.speed;
    // Catch-up burst far from the hero: base movement returns as they close.
    // This is not used during committed blue sprints or red/elite jumps.
    if(d>160 && e.type!=='goblin-archer')speed*=clamp(1+(d-160)/240,1,1.6);
    if(e.type==='slime-blue'){
      sideways=Math.sin(e.aiTime*6+e.id)*.21;
    } else if(e.type==='slime-red'||e.elite){
      // Heavy slimes mostly advance normally, leaving their jumps as main threat.
      sideways=Math.sin(e.aiTime*2+e.id)*.12;
    } else if(e.type==='goblin'){
      sideways=Math.sin(e.aiTime*3.6+e.id)*.42;
    } else if(e.type==='goblin-archer'){
      forward=d>198?1:d<128?-1:0;
      sideways=d<280?Math.sin(e.aiTime*1.65+e.id)*.68:0;
      e.attackTimer-=dt;
      if(e.spawnAge>.5&&d<275&&e.attackTimer<=0&&state.enemyProjectiles.length<MAX_HOSTILE_PROJECTILES){
        const angle=Math.atan2(vy,vx);
        state.enemyProjectiles.push({
          x:e.x,y:e.y-5,vx:Math.cos(angle)*138,vy:Math.sin(angle)*138,
          angle,life:2.6,damage:9
        });
        e.attackTimer=rand(2.1,2.9);
        addParticles(e.x,e.y-6,3,'#bd8c55');
      }
    }
    // Soft steering prevents archers from walking back into the same spot.
    const avoid=crowdAvoidance(e);
    const dirX=ux*forward-uy*sideways+avoid.x*.95;
    const dirY=uy*forward+ux*sideways+avoid.y*.95;
    const mag=Math.max(1,Math.hypot(dirX,dirY));
    if(d>e.radius+5||forward<0){
      e.x+=dirX/mag*speed*dt;
      e.y+=dirY/mag*speed*dt;
    }
    if(e.spawnAge>.40&&Math.hypot(e.x-p.x,e.y-p.y)<e.radius+8)hurtPlayer(e.contact);
  }

  function update(dt) {
    const s = state, p = s.player, levels = s.upgrades;
    s.elapsed += dt;
    if (s.elapsed >= RUN_DURATION) { s.elapsed = RUN_DURATION; endRun(true); updateHud(); return; }
    let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')) + touchMove.x;
    let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) + touchMove.y;
    const length = Math.hypot(dx,dy);
    if(length>0){
      dx/=Math.max(1,length);dy/=Math.max(1,length);
      const moveSpeed=combatStats().speed;
      p.motionX=dx*moveSpeed;p.motionY=dy*moveSpeed;
      p.x+=p.motionX*dt;p.y+=p.motionY*dt;
      if(Math.abs(dx)>.15)p.face=dx>0?1:-1;
    } else {p.motionX=0;p.motionY=0;}
    p.hitCooldown = Math.max(0,p.hitCooldown - dt);
    p.flashTimer = Math.max(0,p.flashTimer - dt);
    p.shotCooldown -= dt;
    if(state.weapon==='chain')advanceChains(dt);
    else if(p.shotCooldown<=0){
      if(state.weapon==='daggers')attackDaggers();else fireArrow();
      p.shotCooldown+=combatStats().interval;
    }
    if(state.slash){state.slash.time-=dt;if(state.slash.time<=0)state.slash=null;}
    // Unlock order: 0 s green, 30 s blue, 60 s red, 90 s goblin, 120 s archer.
    const stage = Math.min(ENEMY_ROSTER.length-1, int(s.elapsed/ENEMY_UNLOCK_INTERVAL));
    while (s.enemyStage < stage) {
      s.enemyStage++;
      const newcomer = ENEMY_ROSTER[s.enemyStage];
      if (s.enemies.length < MAX_ENEMIES) spawnEnemy(newcomer.id);
      toast('Nowy przeciwnik: ' + newcomer.name);
    }
    while(s.elapsed>=s.nextEliteAt && s.nextEliteAt<RUN_DURATION){
      spawnElite();
      s.nextEliteAt+=ELITE_SPAWN_INTERVAL;
    }
    s.spawnClock-=dt;
    const interval=1.47-(s.elapsed/RUN_DURATION)*.74;
    while(s.spawnClock<=0){
      if(s.enemies.length<MAX_ENEMIES)spawnEnemy();
      s.spawnClock+=interval;
    }

    for (const e of s.enemies) {
      moveEnemy(e,dt);
      if (p.hp <= 0) { updateHud(); return; }
    }
    resolveEnemyCrowding();
    updateBleeds(dt);
    for (let i = s.projectiles.length-1; i >= 0; i--) {
      const a = s.projectiles[i]; a.x += a.vx*dt; a.y += a.vy*dt; a.life -= dt;
      let keep = a.life > 0;
      if (keep) for (const e of s.enemies) {
        if (e.hp <= 0 || a.visited.has(e.id)) continue;
        if ((e.x-a.x)**2+(e.y-a.y)**2 < (e.radius+3)**2) { keep = processArrowHit(a,e); break; }
      }
      if (!keep) s.projectiles.splice(i,1);
    }
    for (let i=s.enemyProjectiles.length-1;i>=0;i--) {
      const a=s.enemyProjectiles[i];
      a.x += a.vx*dt; a.y += a.vy*dt; a.life -= dt;
      if (Math.hypot(a.x-p.x,a.y-p.y) < 11) {
        hurtPlayer(a.damage);
        a.life = 0; // Consume the shot even while the hero is invulnerable.
      }
      if (a.life <= 0) s.enemyProjectiles.splice(i,1);
      if (p.hp <= 0) { updateHud(); return; }
    }
    s.enemies = s.enemies.filter(e=>e.hp > 0 && dist2(e,p) < Math.max(screenW,screenH)**2*5);
    for (let i=s.drops.length-1;i>=0;i--) {
      const d=s.drops[i]; d.phase += dt*4;
      const distance = Math.hypot(p.x-d.x,p.y-d.y);
      if (distance < 50 && distance > 0) { const speed = 110 + (50-distance)*2; d.x += (p.x-d.x)/distance*speed*dt; d.y += (p.y-d.y)/distance*speed*dt; }
      if (distance < 10) { collectXp(d); s.drops.splice(i,1); }
    }
    for (const pfx of s.particles) { pfx.x += pfx.vx*dt; pfx.y += pfx.vy*dt; pfx.life -= dt; }
    s.particles = s.particles.filter(pfx => pfx.life > 0);
    if (s.xp >= neededXp(s.level)) {
      s.xp -= neededXp(s.level); s.level++;
      updateHud(); showLevelUp(); return;
    }
    updateHud();
  }

  function rect(color,x,y,w,h) { ctx.fillStyle=color; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
  function drawGround(camX,camY) {
    if (!worldTile) worldTile = makeGroundTile();
    ctx.fillStyle='#252d27'; ctx.fillRect(0,0,screenW,screenH);
    const tile=96, left=int(camX/tile)-1, top=int(camY/tile)-1;
    for(let gy=top;gy<=int((camY+screenH)/tile)+1;gy++) for(let gx=left;gx<=int((camX+screenW)/tile)+1;gx++) {
      const x=int(gx*tile-camX), y=int(gy*tile-camY);
      ctx.drawImage(worldTile,x,y);
      if (hash(gx,gy)>.37) {
        const r=hash(gx+36,gy-11); const sx=x+int(13+r*65), sy=y+int(9+hash(gx+4,gy+16)*66);
        drawDecoration(sx,sy,gx,gy);
      }
    }
  }
  function drawDecoration(x,y,gx,gy) {
    const a=hash(gx+19,gy+49);
    if(a<.33){
      rect('#171e1a',x-8,y+3,16,4);rect('#4b4d46',x-7,y-2,11,7);rect('#62645b',x-4,y-4,6,3);rect('#394b3a',x+2,y-2,5,3);
    } else if(a<.62){
      rect('#253626',x-9,y-5,19,11);rect('#47583b',x-6,y-7,4,6);rect('#546746',x-1,y-9,4,9);rect('#3b5136',x+5,y-6,3,7);
    } else if(a<.82){
      rect('#171d17',x-7,y+5,18,4);rect('#614f39',x-5,y-7,4,13);rect('#362a22',x-4,y-8,2,15);rect('#54452f',x+4,y-4,3,10);
    } else {
      rect('#37362d',x-8,y,16,3);rect('#48463b',x-5,y-1,10,2);rect('#2a3228',x-12,y+3,25,2);
    }
  }
  function drawDrop(d,cx,cy) {
    const x=int(d.x-cx), y=int(d.y-cy + Math.sin(d.phase)*2);
    rect('#132a25',x-5,y+1,10,6);rect('#77cab0',x-2,y-5,5,8);rect('#b3e8cc',x-1,y-6,2,5);rect('#378878',x-3,y-1,3,5);
  }
  function drawEnemy(e,cx,cy) {
    const x=int(e.x-cx), y=int(e.y-cy), w=int(Math.sin(e.wobble)*1.5);
    ctx.save();
    if (e.spawnAge < .35) ctx.globalAlpha = Math.max(.22,e.spawnAge/.35);
    const slime = e.type.startsWith('slime-');
    if (slime) {
      const red = e.type==='slime-red', blue = e.type==='slime-blue', elite = e.elite;
      const size = elite ? 20 : red ? 16 : 10;
      const base = elite ? '#756281' : red ? '#9d493c' : blue ? '#427da2' : '#5e9750';
      const light = elite ? '#b9a1cb' : red ? '#d7775c' : blue ? '#76b9dd' : '#97c576';
      const dark = elite ? '#3f324d' : red ? '#542a2c' : blue ? '#224c6c' : '#315737';
      const jump = e.jump?.phase==='airborne' && !e.jump.dash
        ? Math.sin(Math.PI*clamp(e.jump.elapsed/e.jump.duration,0,1))*(elite?13:red?11:9)
        : Math.abs(Math.sin(e.wobble))*(blue?3:1.3);
      const top = y - Math.round(jump);
      ctx.fillStyle='#101811a8';ctx.beginPath();ctx.ellipse(x,y+7,size+2,4,0,0,TAU);ctx.fill();
      rect(dark,x-size,top-4,size*2,size+9);
      rect(base,x-size-2,top+1,size*2+4,size+2);
      rect(base,x-size+3,top-9,size*2-6,11);
      rect(light,x-size+4,top-8,size-2,4);
      rect(light,x-size-1,top-5,4,3);
      rect(dark,x-size+2,top+size-3,size*2-4,4);
      const eyeY=top+1;
      rect('#15231e',x-5,eyeY,3,4); rect('#15231e',x+3,eyeY,3,4);
      rect('#e1ead0',x-4,eyeY,1,2); rect('#e1ead0',x+4,eyeY,1,2);
      if(red || elite) {rect(elite?'#b79a56':'#b75849',x-size+2,top-12,9,5);rect(elite?'#e1c889':'#e39a72',x-size+5,top-11,4,2);}
      if(elite){
        rect('#cbb781',x-12,top-15,24,4);
        rect('#e1c98f',x-6,top-19,12,5);
        rect('#c3a46f',x-2,top-23,4,5);
        rect('#f2c782',x-5,top+1,4,3);rect('#f2c782',x+2,top+1,4,3);
      }
      if(e.hit>0){ctx.globalAlpha=.45;rect('#fff0cc',x-size-2,top-10,size*2+4,size+19);}
    } else {
      const archer=e.type==='goblin-archer';
      ctx.fillStyle='#101a13b8';ctx.beginPath();ctx.ellipse(x,y+8,11,4,0,0,TAU);ctx.fill();
      rect('#171d15',x-8,y-10+w,17,14);rect(archer?'#49613e':'#556b42',x-7,y-9+w,15,11);
      rect('#7b8c51',x-11,y-7+w,5,4);rect('#7b8c51',x+7,y-7+w,5,4);
      rect('#39482f',x-6,y+2,13,5);rect('#483c2d',x-7,y+5,6,5);rect('#483c2d',x+2,y+5,6,5);
      rect('#9b5141',x-5,y-5+w,3,2);rect('#9b5141',x+3,y-5+w,3,2);
      rect('#b1a97d',x-2,y-1+w,5,2);rect(archer?'#283b2d':'#333b2d',x-7,y-12+w,15,3);
      if(archer){
        // Dark hood, small quiver and visible bow distinguish the ranged goblin.
        rect('#303d30',x-8,y-15+w,16,4);rect('#4f6048',x-6,y-16+w,12,3);
        rect('#48392b',x-11,y-1,4,12);rect('#a68b5c',x-10,y-5,1,7);
        rect('#8c663b',x+11,y-14,2,25);rect('#d5c7a5',x+10,y-11,1,20);
        rect('#b18b53',x+9,y-15,3,3);rect('#b18b53',x+9,y+10,3,3);
      }
      if(e.hit>0){ctx.globalAlpha=.55;rect('#f2d7aa',x-10,y-16,20,27);}
    }
    ctx.restore();
    if(e.bleed&&e.bleed.time>0){
      rect('#a53c3c',x-3,y-20,3,4);rect('#e06a58',x+3,y-24,3,4);
    }
    // Every enemy, including green and blue slimes, reveals HP after taking damage.
    // Keep it small and legible over moving sprites without flooding the arena with full bars.
    if (e.hp > 0 && (e.hp < e.maxHp || e.elite)) {
      const red = e.type === 'slime-red';
      const slime = e.type.startsWith('slime-');
      const width = e.elite?38:red?30:slime?22:21;
      // Below the feet of each sprite, rather than above its head.
      const barX = x-int(width/2), barY = y+(e.elite?28:red?22:slime?16:15);
      const fill = Math.max(1, int((width - 2)*clamp(e.hp/e.maxHp,0,1)));
      rect('#100f0d',barX-1,barY-1,width+2,5);
      rect('#5d3a35',barX,barY,width,3);
      rect('#a9c279',barX+1,barY+1,fill,2);
    }
  }
  function drawHero(p,cx,cy,animated) {
    const x=int(p.x-cx),y=int(p.y-cy), bounce=animated?int(Math.sin(state.elapsed*12)*1.2):0;
    ctx.fillStyle='#101811b8';ctx.beginPath();ctx.ellipse(x,y+11,12,4,0,0,TAU);ctx.fill();
    if(p.hitCooldown>0 && p.flashTimer<=0 && int(p.hitCooldown*10)%2===0) ctx.globalAlpha=.48;
    // Boots, cloak, leather body, hood and face, readable even at 2x CSS size.
    rect('#121710',x-7,y+6,6,7);rect('#171b14',x+2,y+6,6,7);
    rect('#253e33',x-9,y-6+bounce,19,17);rect('#345244',x-10,y+1+bounce,6,10);rect('#172c25',x+5,y+2+bounce,6,11);
    rect('#70533b',x-6,y-3+bounce,13,10);rect('#9a7950',x-5,y-2+bounce,8,2);
    rect('#1b3229',x-9,y-16+bounce,19,13);rect('#2f5341',x-7,y-17+bounce,15,10);rect('#132720',x-6,y-10+bounce,13,7);
    rect('#c4a27e',x-4,y-11+bounce,10,7);rect('#dfba8b',x-2,y-10+bounce,7,4);rect('#171f19',x+2*p.face,y-8+bounce,2,2);
    rect('#1b2921',x-9,y-15+bounce,4,10);rect('#3b6550',x-7,y-16+bounce,3,8);
    ctx.save();ctx.translate(x+p.face*10,y-4+bounce);ctx.scale(p.face,1);
    if(state.weapon==='daggers'){
      rect('#9b7851',-5,1,7,3);
      rect('#7d8184',2,-8,4,12);rect('#e7e6db',3,-12,2,6);
      rect('#9b7851',-20,1,7,3);
      rect('#838b8c',-24,-9,4,12);rect('#e7e6db',-23,-13,2,6);
    }else if(state.weapon==='chain'){
      rect('#9b7851',-6,1,9,3);
      rect('#a2a198',3,0,8,4);rect('#c0a66c',9,-1,4,6);
    }else{
      rect('#9b7851',-6,1,9,3);
      rect('#e4d7af',4,-12,1,25);
      rect('#bc8c53',4,-14,4,3);rect('#ad7d45',6,-11,3,4);
      rect('#9d7044',8,-7,3,6);rect('#b5844b',9,-1,3,4);
      rect('#9d7044',8,3,3,6);rect('#ad7d45',6,9,3,4);
      rect('#bc8c53',4,12,4,3);
    }
    ctx.restore();
    if(p.flashTimer>0){
      // Silhouette highlights reproduce the monsters' hit flash, without a box over the player.
      ctx.save();
      ctx.globalAlpha=.28+.65*clamp(p.flashTimer/PLAYER_HIT_FLASH,0,1);
      ctx.shadowColor='#fff1c9';ctx.shadowBlur=8;
      rect('#fff1df',x-8,y-16+bounce,17,12); // Hood
      rect('#ffddc6',x-5,y-10+bounce,12,7); // Face
      rect('#fff1df',x-8,y-5+bounce,17,14); // Torso
      rect('#fff1df',x-10,y+1+bounce,5,9); // Arms
      rect('#fff1df',x+7,y+1+bounce,5,9);
      rect('#fff1df',x-7,y+7+bounce,6,6); // Boots
      rect('#fff1df',x+2,y+7+bounce,6,6);
      ctx.save();
      ctx.translate(x+p.face*10,y-4+bounce);ctx.scale(p.face,1);
      if(state.weapon==='bow')rect('#ffddb1',4,-13,8,27);
      else if(state.weapon==='daggers'){rect('#ffddb1',2,-13,4,18);rect('#ffddb1',-24,-13,4,18);}
      else rect('#ffddb1',3,-1,10,6);
      ctx.restore();
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }
  function drawChains(cx,cy){
    const p=state.player,s=combatStats(),x=p.x-cx,y=p.y-cy;
    for(let chain=0;chain<s.chainCount;chain++){
      const angle=state.chainAngle+chain*Math.PI;
      const ex=x+Math.cos(angle)*s.range,ey=y+Math.sin(angle)*s.range;
      ctx.save();ctx.lineCap='square';
      ctx.strokeStyle='#151a19';ctx.lineWidth=6;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.strokeStyle='#a4a39b';ctx.lineWidth=3;ctx.setLineDash([5,4]);
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#d5b37c';ctx.fillRect(ex-5,ey-5,10,10);
      ctx.fillStyle='#626c6b';ctx.fillRect(ex-3,ey-3,6,6);
      ctx.restore();
    }
  }
  function drawSlash(cx,cy){
    const slash=state.slash;
    if(!slash)return;
    const x=state.player.x-cx,y=state.player.y-cy;
    ctx.save();ctx.globalAlpha=clamp(slash.time/slash.full,0,1)*.85;
    ctx.strokeStyle='#e0d7b5';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(x,y,slash.range,slash.angle-slash.half,slash.angle+slash.half);ctx.stroke();
    ctx.strokeStyle='#87a6a0';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y,slash.range-5,slash.angle-slash.half,slash.angle+slash.half);ctx.stroke();
    ctx.restore();
  }
  function drawArrow(a,cx,cy) {
    const x=a.x-cx,y=a.y-cy;
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(a.angle);rect('#e9d5a6',-9,-1,18,2);rect('#826747',-9,1,12,1);rect('#d2d0bc',7,-3,6,5);rect('#587563',-8,-4,5,2);rect('#587563',-8,2,5,2);ctx.restore();
  }
  function drawEnemyArrow(a,cx,cy) {
    ctx.save();ctx.translate(Math.round(a.x-cx),Math.round(a.y-cy));ctx.rotate(a.angle);
    rect('#704735',-8,-1,16,2);rect('#dda96a',3,-1,6,2);
    rect('#e0c1a0',7,-2,3,4);rect('#aa614c',-8,-3,4,2);rect('#aa614c',-8,2,4,2);
    ctx.restore();
  }

  function drawDangerMarkers(cx,cy) {
    for(const e of state.enemies){
      if(e.hp<=0)continue;
      const j=e.jump,impact=e.impact;
      if(j && (j.phase==='warning'||j.phase==='airborne')){
        const progress=j.phase==='warning'?1-clamp(j.time/j.windup,0,1):1;
        ctx.save();
        if(j.dash){
          // Luminous blue telegraph shows the exact path, not just the endpoint.
          const ax=j.startX-cx,ay=j.startY-cy;
          const bx=j.targetX-cx,by=j.targetY-cy;
          const dashWidth=enemyBodyRadius(e)*2+6; // 28 world pixels, wider than a blue slime.
          ctx.lineCap='round';
          ctx.globalAlpha=.14+.12*progress;
          ctx.strokeStyle='#2c679a'; // Subtle outer halo.
          ctx.lineWidth=dashWidth+10;
          ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
          ctx.globalAlpha=.40+.20*progress;
          ctx.strokeStyle='#3b87bd'; // The visible warning lane.
          ctx.lineWidth=dashWidth;
          ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
          ctx.globalAlpha=.58+.24*progress;
          ctx.strokeStyle='#a4e9ff'; // Brighter central stripe.
          ctx.lineWidth=dashWidth*.5;
          ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
          ctx.fillStyle='#c7f2ff';
          ctx.fillRect(bx-4,by-4,8,8);
        } else {
          // Red slime and elite retain their circular area-of-effect warnings.
          const radius=j.radius;
          const x=j.targetX-cx,y=j.targetY-cy;
          ctx.globalAlpha=.55+progress*.35;
          ctx.fillStyle=e.elite?'#87619b3b':'#a842333b';
          ctx.strokeStyle=e.elite?'#c9a5d5':'#e88b65';
          ctx.lineWidth=2.3;
          ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();ctx.stroke();
          const pulse=radius*(.35+.65*progress);
          ctx.beginPath();ctx.arc(x,y,pulse,0,TAU);ctx.stroke();
        }
        ctx.restore();
      }
      if(impact && impact.time>0){
        const life=clamp(impact.time/impact.full,0,1);
        ctx.save();ctx.globalAlpha=life*.85;
        ctx.lineWidth=2.5;
        ctx.strokeStyle=e.elite?'#d1b4e6':'#e89b6e';
        ctx.beginPath();ctx.arc(impact.x-cx,impact.y-cy,impact.radius*(1.1-life*.12),0,TAU);ctx.stroke();
        ctx.restore();
      }
    }
  }

  function draw() {
    if (!state) return;
    const cx=state.player.x-screenW/2,cy=state.player.y-screenH/2;
    drawGround(cx,cy);
    drawDangerMarkers(cx,cy);
    for(const d of state.drops) drawDrop(d,cx,cy);
    const entities = state.enemies.map(e=>({y:e.y,draw:()=>drawEnemy(e,cx,cy)}));
    entities.push({y:state.player.y,draw:()=>drawHero(state.player,cx,cy,mode==='playing')});
    entities.sort((a,b)=>a.y-b.y);for(const e of entities)e.draw();
    if(state.weapon==='chain')drawChains(cx,cy);
    if(state.weapon==='daggers')drawSlash(cx,cy);
    for(const a of state.projectiles)drawArrow(a,cx,cy);
    for(const a of state.enemyProjectiles)drawEnemyArrow(a,cx,cy);
    for(const a of state.particles){ctx.globalAlpha=clamp(a.life/a.max,0,1);rect(a.color,a.x-cx,a.y-cy,2,2);}ctx.globalAlpha=1;
    // Atmospheric subtle boundary illumination, no screen-filling combat effects.
    ctx.fillStyle='#0b100d30';ctx.fillRect(0,0,screenW,2);ctx.fillRect(0,screenH-2,screenW,2);
  }
  function tick(ts) {
    const dt=Math.min((ts-lastTimestamp)/1000||0,.04);lastTimestamp=ts;
    if(mode==='playing' && !statsOpen)update(dt);
    if(mode==='roulette' && !statsOpen)updateRoulette(dt);
    if(toastLeft>0){toastLeft-=dt;if(toastLeft<=0)toastEl.classList.remove('active');}
    draw();requestAnimationFrame(tick);
  }
  function resetJoystick(){
    activeJoystick = null;
    touchMove.x = touchMove.y = 0;
    for (const side of ['left','right']) {
      const knob = $(`joystick-${side}-knob`);
      if (knob) knob.style.transform = 'translate(-50%,-50%)';
    }
  }
  function setupJoystick(){
    const sides = ['left','right'];
    const chooseSide = side => {
      for (const name of sides) {
        document.querySelector(`.touch-${name}`).classList.toggle('is-primary',name===side);
      }
    };
    for (const side of sides) {
      const stick = $(`joystick-${side}`), knob = $(`joystick-${side}-knob`);
      const move = e => {
        const r = stick.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2;
        const dx = e.clientX-cx, dy = e.clientY-cy, mag = Math.max(1,Math.hypot(dx,dy)), radius = 35;
        touchMove.x = dx/mag*Math.min(1,mag/radius);
        touchMove.y = dy/mag*Math.min(1,mag/radius);
        knob.style.transform = `translate(calc(-50% + ${touchMove.x*radius}px),calc(-50% + ${touchMove.y*radius}px))`;
      };
      stick.addEventListener('pointerdown',e=>{
        if (mode!=='playing' || activeJoystick) return;
        activeJoystick={side,pointerId:e.pointerId};
        chooseSide(side);
        stick.setPointerCapture(e.pointerId);
        move(e);
        e.preventDefault();
      });
      stick.addEventListener('pointermove',e=>{
        if (!activeJoystick || activeJoystick.pointerId!==e.pointerId || activeJoystick.side!==side) return;
        move(e);
        e.preventDefault();
      });
      const end=e=>{
        if (!activeJoystick || activeJoystick.pointerId!==e.pointerId || activeJoystick.side!==side) return;
        resetJoystick();
      };
      stick.addEventListener('pointerup',end);
      stick.addEventListener('pointercancel',end);
      stick.addEventListener('lostpointercapture',end);
    }
  }
  function isFullscreen() {
    return document.fullscreenElement === shell || document.webkitFullscreenElement === shell;
  }

  function syncFullscreen() {
    const active = isFullscreen();
    const btn = $('fullscreen-btn');
    btn.classList.toggle('is-fullscreen',active);
    btn.setAttribute('aria-pressed',String(active));
    btn.setAttribute('aria-label',active?'Wyłącz pełny ekran':'Włącz pełny ekran');
    btn.title = active ? 'Wyłącz pełny ekran (F)' : 'Pełny ekran (F)';
    resizeCanvas();
  }

  async function toggleFullscreen() {
    try {
      if (isFullscreen()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      } else if (shell.webkitRequestFullscreen) {
        await shell.webkitRequestFullscreen();
      } else {
        toast('Ta przeglądarka nie obsługuje pełnego ekranu');
      }
    } catch (error) {
      toast('Nie udało się włączyć pełnego ekranu');
    }
    syncFullscreen();
  }

  function setupInput(){
    document.addEventListener('keydown',e=>{
      const key=e.key.toLowerCase();
      if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
      if(key==='c'&&mode!=='roulette'&&!e.repeat&&!e.altKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();toggleStats();return;}
      if(key==='escape'&&statsOpen){e.preventDefault();closeStats();return;}
      if(statsOpen)return;
      if(key==='f'&&!e.repeat&&!e.altKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();toggleFullscreen();return;}
      if(key==='escape'&&isFullscreen()) return; // Browser handles Esc to exit full screen.
      if(key==='p'||key==='escape'){pauseGame();return;}
      if(mode==='levelup'&&['1','2','3'].includes(key)){selectCard(Number(key)-1);return;}
      if(mode==='roulette')return;
      keys.add(key);
    });
    document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur',()=>{keys.clear();touchMove.x=touchMove.y=0;resetJoystick();if(mode==='playing'&&!statsOpen)pauseGame();});
    overlay.addEventListener('click',e=>{
      const card=e.target.closest('[data-card]');if(card){selectCard(Number(card.dataset.card));return;}
      const action=e.target.closest('[data-action]')?.dataset.action;
      if(action==='start'||action==='restart')beginRoulette();
      else if(action==='reroll')spinRoulette(true);
      else if(action==='stop')stopRoulette();
      else if(action==='confirm')startGame();
      else if(action==='menu')showMenu();else if(action==='resume')visibleMode('playing');
      else if(action==='fullscreen')toggleFullscreen();
      else if(action==='stats')showStats();
    });
    $('pause-btn').addEventListener('click',pauseGame);
    $('stats-btn').addEventListener('click',toggleStats);
    $('stats-close').addEventListener('click',closeStats);
    statsOverlay.addEventListener('click',e=>{if(e.target===statsOverlay)closeStats();});
    $('fullscreen-btn').addEventListener('click',toggleFullscreen);
    document.addEventListener('fullscreenchange',syncFullscreen);
    document.addEventListener('webkitfullscreenchange',syncFullscreen);
    window.addEventListener('resize',resizeCanvas);
    setupJoystick();
  }
  setupInput();resizeCanvas();showMenu();requestAnimationFrame(tick);
  // Stable read-only debug bridge to inspect the prototype in browser tests.
  window.CalionPrototype={version:VERSION,getSnapshot:()=>({mode,statsOpen,weapon:state.weapon,
    roulette:roulette?{spinning:roulette.spinning,phase:roulette.phase,selection:roulette.selection,rerollsLeft:roulette.rerollsLeft,weights:roulette.weights.slice()}:null,
    stats:combatStats(),elapsed:state.elapsed,level:state.level,xp:state.xp,kills:state.kills,hp:state.player.hp,
    upgrades:{...state.upgrades},enemies:state.enemies.length,enemyTypes:state.enemies.map(e=>e.type),
    enemyStage:state.enemyStage,enemyShots:state.enemyProjectiles.length,eliteSpawns:state.eliteSpawns,nextEliteAt:state.nextEliteAt}),start:beginRoulette};
})();

