(function(){
  "use strict";
  var $ = function(s,c){return (c||document).querySelector(s)};
  var $$ = function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var root = document.documentElement;
  var TAU = Math.PI * 2;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer:fine)').matches;
  function rnd(a,b){ return a + Math.random()*(b-a); }
  function clamp(v,a,b){ return v<a?a:v>b?b:v; }

  /* ============================================================
     气候数据
     ============================================================ */
  var SEASON = {
    spring:{cn:'春',en:'SPRING',temp:18,book:'《花的智慧》',song:'久石让 — Spring',
      line:'万物正在很小心地展开', tags:['樱花','新绿','潮湿','长焦','慢门'],
      petal:'255,188,212', mote:'255,238,190', bokeh:'255,206,220'},
    summer:{cn:'夏',en:'SUMMER',temp:31,book:'《夏日走过山间》',song:'Nils Frahm — Says',
      line:'蝉声把下午拉得无限长', tags:['暴雨','柏油味','傍晚','逆光','冰'],
      petal:'255,226,150', mote:'255,246,214', bokeh:'255,232,170'},
    autumn:{cn:'秋',en:'AUTUMN',temp:24,book:'《看不见的城市》',song:'坂本龍一 — async',
      line:'光开始变斜，影子开始变长', tags:['晨雾','玻璃','长曝光','手冲','散步'],
      petal:'232,150,88', mote:'255,226,180', bokeh:'255,190,120'},
    winter:{cn:'冬',en:'WINTER',temp:2,book:'《冬牧场》',song:'Ólafur Arnalds — Near Light',
      line:'一年里最安静的那部分', tags:['霜','暖气','早黑','热茶','窗'],
      petal:'255,255,255', mote:'236,246,255', bokeh:'214,232,248'}
  };
  var WEATHER = {
    clear:{cn:'晴',en:'CLEAR',dTemp:3,desc:'锐利、有影子'},
    rain:{cn:'雨',en:'RAIN',dTemp:-4,desc:'一切都在往下淌'},
    fog:{cn:'雾',en:'FOG',dTemp:-2,desc:'边界被拿走了'},
    snow:{cn:'雪',en:'SNOW',dTemp:-16,desc:'世界调成了静音'}
  };
  var COMBO = {
    'spring-clear':'樱花正落在有影子的墙上',
    'spring-rain':'一场把花打下来的雨',
    'spring-fog':'新绿在雾里显得更绿',
    'spring-snow':'倒春寒，雪落在花上',
    'summer-clear':'蝉声、白光、晃眼的柏油路',
    'summer-rain':'暴雨之后，空气是甜的',
    'summer-fog':'江面上浮着一层热雾',
    'summer-snow':'一个不可能的、梦里的夏天',
    'autumn-clear':'光开始斜着穿过梧桐叶',
    'autumn-rain':'雨把落叶压在地上',
    'autumn-fog':'江面上全是雾，楼只剩十四层',
    'autumn-snow':'初雪来得比往年早',
    'winter-clear':'冷，但是每一道影子都很清楚',
    'winter-rain':'冻雨，落在什么上都是一层壳',
    'winter-fog':'雾和霾分不清的早晨',
    'winter-snow':'窗上结霜，外面很安静'
  };
  var HERO_EM = {spring:'一块刚化开的玻璃',summer:'一块被晒热的玻璃',autumn:'一块雾玻璃',winter:'一块结了霜的玻璃'};
  var FOOT = {
    'spring-clear':'愿你今天也能遇到一点好光。','spring-rain':'愿你有一把够大的伞。',
    'spring-fog':'愿你走得慢一点，反正看不清。','spring-snow':'愿你有人一起看这场不合时宜的雪。',
    'summer-clear':'愿你有树荫，和一杯冰的东西。','summer-rain':'愿你赶上雨停的那十分钟。',
    'summer-fog':'愿你在热雾里找到一点风。','summer-snow':'愿你做几个不合规矩的梦。',
    'autumn-clear':'愿你今天也能遇到一点好光。','autumn-rain':'愿你回家时鞋还是干的。',
    'autumn-fog':'愿你在雾里认出自己的那栋楼。','autumn-snow':'愿你有人提醒你添衣。',
    'winter-clear':'愿你晒到今天全部的太阳。','winter-rain':'愿你有一扇关得紧的窗。',
    'winter-fog':'愿你不必赶路。','winter-snow':'愿你有一个可以一直看雪的下午。'
  };
  var WEATHER_TEXT = {
    clear:function(t){return '晴 · ' + t + '℃'},
    rain:function(t){return '中雨 · ' + t + '℃'},
    fog:function(t){return '雾 · 能见度约 400m · ' + t + '℃'},
    snow:function(t){return '小雪 · ' + t + '℃'}
  };
  var JIEQI = [
    ['小寒',1,5],['大寒',1,20],['立春',2,4],['雨水',2,19],['惊蛰',3,5],['春分',3,20],
    ['清明',4,5],['谷雨',4,20],['立夏',5,5],['小满',5,21],['芒种',6,6],['夏至',6,21],
    ['小暑',7,7],['大暑',7,23],['立秋',8,7],['处暑',8,23],['白露',9,7],['秋分',9,23],
    ['寒露',10,8],['霜降',10,23],['立冬',11,7],['小雪',11,22],['大雪',12,7],['冬至',12,22]
  ];
  function solarTerm(d){
    var m = d.getMonth()+1, day = d.getDate(), cur = JIEQI[JIEQI.length-1], ci = 23;
    for(var i=0;i<JIEQI.length;i++){
      var j = JIEQI[i];
      if(m > j[1] || (m === j[1] && day >= j[2])){ cur = j; ci = i; }
    }
    var start = new Date(d.getFullYear(), cur[1]-1, cur[2]);
    return cur[0] + ' · 第 ' + (Math.floor((d - start)/86400000) + 1) + ' 天';
  }
  function seasonOfDate(d){
    var m = d.getMonth()+1;
    return (m<=2||m===12) ? 'winter' : (m<=5 ? 'spring' : (m<=8 ? 'summer' : 'autumn'));
  }

  /* ============================================================
     状态
     ============================================================ */
  var state = {season:'autumn', weather:'fog'};
  try{
    var st = JSON.parse(localStorage.getItem('misty-climate') || 'null');
    if(st && SEASON[st.season] && WEATHER[st.weather]) state = st;
    else state = {season:seasonOfDate(new Date()), weather:'fog'};
  }catch(e){ state = {season:seasonOfDate(new Date()), weather:'fog'}; }

  var WARM = '255,240,210', INKRGB = '90,66,48', ACCRGB = '210,105,30', S_BOKEH = '255,190,120';
  function cvar(n){ return getComputedStyle(document.body).getPropertyValue(n).trim(); }
  function rgbOf(hex){
    hex = String(hex).trim(); if(hex.charAt(0) === '#') hex = hex.slice(1);
    if(hex.length === 3) hex = hex.split('').map(function(c){return c+c}).join('');
    var n = parseInt(hex,16);
    if(isNaN(n)) return '90,66,48';
    return ((n>>16)&255) + ',' + ((n>>8)&255) + ',' + (n&255);
  }
  function rgba(hex,a){
    hex = String(hex).trim(); if(hex.charAt(0)==='#') hex = hex.slice(1);
    if(hex.length===3) hex = hex.split('').map(function(c){return c+c}).join('');
    var n = parseInt(hex,16);
    if(isNaN(n)) return 'rgba(255,255,255,'+a+')';
    return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
  }

  function apply(fx){
    root.setAttribute('data-season', state.season);
    root.setAttribute('data-weather', state.weather);
    var s = SEASON[state.season], w = WEATHER[state.weather];
    var key = state.season + '-' + state.weather;
    var tmp = (realTemp === null || realTemp === undefined) ? (s.temp + w.dTemp) : realTemp;

    $('#dockS').textContent = s.cn;
    $('#dockW').textContent = w.cn;
    $('#coreCn').textContent = s.cn + ' · ' + w.cn;
    $('#coreEn').textContent = s.en + ' ' + w.en;
    $('#dialHint').textContent = COMBO[key] || w.desc;
    $('#heroEm').textContent = HERO_EM[state.season];
    $('#footLine').textContent = FOOT[key] || FOOT['autumn-clear'];
    $('#lede').textContent = s.line + '。' + w.desc + '——这里是雾屿，写一点关于光怎么落在墙上的观察，存一些没拍好的照片，以及那些还没长成文章的句子。';
    $('#vSeason').textContent = s.cn;
    $('#vWeather').textContent = WEATHER_TEXT[state.weather](tmp) +
      (realTemp === null || realTemp === undefined ? '' : ' · 实况');
    $('#vTemp').textContent = tmp + '℃';
    $('#vBook').textContent = s.book;
    $('#vSong').textContent = s.song;
    $('#tagRow').innerHTML = s.tags.map(function(t){
      return '<button class="tag" data-tag="' + esc(t) + '" title="看这个标签的碎片">' + esc(t) + '</button>';
    }).join('');
    $('#seal').textContent = w.cn;
    bindHover($('#tagRow'));

    $$('.node').forEach(function(n){
      n.classList.toggle('on', (n.dataset.s === state.season) || (n.dataset.w === state.weather));
    });
    rotateRings();
    WARM = cvar('--warm') || '255,240,210';
    INKRGB = rgbOf(cvar('--ink'));
    ACCRGB = rgbOf(cvar('--accent'));
    S_BOKEH = s.bokeh;
    buildWeather();
    try{ localStorage.setItem('misty-climate', JSON.stringify(state)); }catch(e){}
    if(fx){ var f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  }

  var SEASON_ORDER = ['spring','summer','autumn','winter'];
  var WEATHER_ORDER = ['clear','rain','fog','snow'];
  function rotateRings(){
    var aS = -SEASON_ORDER.indexOf(state.season)*90;
    var aW = -WEATHER_ORDER.indexOf(state.weather)*90;
    $('#ringSeason').style.transform = 'rotate(' + aS + 'deg)';
    $('#ringWeather').style.transform = 'rotate(' + aW + 'deg)';
    $$('#ringSeason .node').forEach(function(n){ n.style.setProperty('--tf','rotate(' + (-aS) + 'deg)'); n.style.transform = 'rotate(' + (-aS) + 'deg)'; });
    $$('#ringWeather .node').forEach(function(n){ n.style.setProperty('--tf','rotate(' + (-aW) + 'deg)'); n.style.transform = 'rotate(' + (-aW) + 'deg)'; });
  }

  /* ============================================================
     画布与工具
     ============================================================ */
  var back = $('#fxBack'), front = $('#fxFront');
  var bc = back.getContext('2d'), fc = front.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  var W = 0, H = 0;

  /* 雾层：可被鼠标擦开、又会慢慢重新糊上 */
  var fogC = document.createElement('canvas'), fgc = fogC.getContext('2d');

  var SPRITE = {};
  function sprite(rgb){
    if(!SPRITE[rgb]){
      var s = document.createElement('canvas'); s.width = s.height = 128;
      var c = s.getContext('2d');
      var g = c.createRadialGradient(64,64,0,64,64,64);
      g.addColorStop(0,'rgba('+rgb+',1)');
      g.addColorStop(.42,'rgba('+rgb+',.42)');
      g.addColorStop(1,'rgba('+rgb+',0)');
      c.fillStyle = g; c.fillRect(0,0,128,128);
      SPRITE[rgb] = s;
    }
    return SPRITE[rgb];
  }
  function blob(ctx,x,y,r,rgb,a){
    if(a<=0) return;
    ctx.globalAlpha = a;
    ctx.drawImage(sprite(rgb), x-r, y-r, r*2, r*2);
    ctx.globalAlpha = 1;
  }

  function sizeCanvas(){
    W = window.innerWidth; H = window.innerHeight;
    [back, front].forEach(function(c){
      c.width = W*dpr; c.height = H*dpr;
      c.style.width = W+'px'; c.style.height = H+'px';
      c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
    });
    fogC.width = W; fogC.height = H;
  }

  /* ============================================================
     天气粒子
     ============================================================ */
  var drops = [], runners = [], streaks = [], flakes = [], motes = [], banks = [], bokeh = [], dapple = [];
  var paused = false, slow = 0, degraded = false;
  var spawnAcc = 0, dripTimer = 0, mousePath = {x:-999, y:-999, px:-999, py:-999};

  function buildWeather(){
    drops = []; runners = []; streaks = []; flakes = []; motes = []; banks = []; bokeh = []; dapple = [];
    bokehRain = [];
    fgc.clearRect(0,0,W,H);
    if(reduced || !W) return;

    var w = state.weather, s = SEASON[state.season];
    var area = (W*H)/1440000; // 以 1440*1000 为 1 单位
    var i;

    if(w === 'rain'){
      var ns = Math.round(clamp(48*area, 22, 72));
      for(i=0;i<ns;i++) streaks.push({x:rnd(-60,W+60), y:rnd(-H,H), len:rnd(60,180), v:rnd(9,20), w:rnd(.6,1.5)});
      buildBokehRain();
      gustTimer = 5; gustAge = 99; gust = 0;
    } else if(w === 'snow'){
      var n1 = Math.round(clamp(120*area, 55, 180));
      for(i=0;i<n1;i++) flakes.push(mkFlake(0));
      var n2 = Math.round(clamp(80*area, 35, 120));
      for(i=0;i<n2;i++) flakes.push(mkFlake(1));
      var n3 = Math.round(clamp(38*area, 16, 56));
      for(i=0;i<n3;i++) flakes.push(mkFlake(2));
    } else if(w === 'clear'){
      var kind = s === 'spring' ? 'petal' : s === 'autumn' ? 'leaf' : s === 'summer' ? 'dust' : 'ice';
      var n4 = Math.round(clamp((kind==='dust'?96:kind==='ice'?88:52)*area, 20, 150));
      for(i=0;i<n4;i++) motes.push({t:kind, x:rnd(0,W), y:rnd(0,H), r:rnd(2.6,9),
        v:rnd(.22,1.1), sw:rnd(.35,1.7), ph:rnd(0,TAU), rot:rnd(0,TAU), vr:rnd(-.022,.022), a:rnd(.3,.85)});
      if(kind === 'dust' || kind === 'leaf'){
        for(i=0;i<6;i++) dapple.push({x:rnd(0,W), y:rnd(0,H), r:rnd(70,190), ph:rnd(0,TAU), sp:rnd(.06,.2)});
      }
    } else { /* fog */
      for(i=0;i<11;i++) banks.push({x:rnd(-300,W+300), y:rnd(-40,H+40), r:rnd(200,520),
        v:rnd(5,22), ph:rnd(0,TAU), a:rnd(.05,.13), sv:rnd(.1,.3)});
      for(i=0;i<9;i++) bokeh.push({x:rnd(0,W), y:rnd(H*0.12,H*0.92), r:rnd(16,46),
        ph:rnd(0,TAU), sp:rnd(.12,.34), a:rnd(.1,.28)});
      paintFogLayer();
      for(i=0;i<Math.round(clamp(60*area,26,90));i++) drops.push(mk(rnd(0,W), rnd(0,H), rnd(0.8,2.4)));
    }
  }

  function mk(x,y,r){ return {x:x, y:y, r:r, a:rnd(.5,1), g:rnd(.024,.078)}; }
  function mkFlake(layer){
    var r = layer===0 ? rnd(.7,1.7) : layer===1 ? rnd(1.6,3) : rnd(3,5.6);
    return {L:layer, x:rnd(0,W), y:rnd(-H,H), r:r,
      v:(layer===0?rnd(.35,.9):layer===1?rnd(.9,1.8):rnd(1.8,3.4)),
      sw:rnd(.25,1.5), ph:rnd(0,TAU), rot:rnd(0,TAU), vr:rnd(-.04,.04), a:rnd(.35,.95)};
  }

  function paintFogLayer(){
    fgc.clearRect(0,0,W,H);
    var rgb = state.season === 'winter' ? '236,246,255' :
              state.season === 'autumn' ? '255,240,220' :
              state.season === 'summer' ? '242,252,252' : '248,252,242';
    fgc.fillStyle = 'rgba(' + rgb + ',0.16)';
    fgc.fillRect(0,0,W,H);
    /* 冷凝的细颗粒 */
    for(var i=0;i<2600;i++){
      var x = Math.random()*W, y = Math.random()*H, r = rnd(.4,1.5);
      fgc.fillStyle = 'rgba(' + rgb + ',' + rnd(.05,.2).toFixed(3) + ')';
      fgc.beginPath(); fgc.arc(x,y,r,0,TAU); fgc.fill();
    }
  }

  /* ============================================================
     雨：湿玻璃后的散景
     不再"画水"，改做"真折射"：
     先把背景（含散景灯光）画进离屏画布，再按水的形状重新采样它 ——
       水痕 = 这块背景被纵向拉长后裁出的形状
       水珠 = 这块背景倒过来、被放大的一小块
     所以它折射的是真的光：灯光会被水痕拉成一条，
     水珠里装着一个倒过来的窗外。这是画不出来的。
     ============================================================ */
  var bokehRain = [];
  var wetAcc = 0, gust = 0, gustTimer = 5, gustAge = 99, gustDur = 1, curT = 0;

  /* 雾天用的凝结点：很小，是雾不是水珠 */
  function staticDrop(ctx, x, y, r){
    ctx.fillStyle = 'rgba(' + INKRGB + ',.05)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(.5, r*.17);
    ctx.strokeStyle = 'rgba(' + INKRGB + ',.18)';
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI*0.18, Math.PI*0.92); ctx.stroke();
    ctx.lineWidth = Math.max(.5, r*.19);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.arc(x, y, r*.93, Math.PI*1.20, Math.PI*1.90); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(x - r*.32, y - r*.34, Math.max(.6, r*.22), 0, TAU); ctx.fill();
  }
  function slideDrop(ctx, x, y, r, len){
    var ry = r*1.28;
    if(len > 2){
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = Math.max(.6, r*.5); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(' + INKRGB + ',.05)';
    ctx.beginPath(); ctx.ellipse(x, y, r*.88, ry, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(.5, r*.15);
    ctx.strokeStyle = 'rgba(' + INKRGB + ',.2)';
    ctx.beginPath(); ctx.ellipse(x, y, r*.88, ry, 0, Math.PI*0.20, Math.PI*0.90); ctx.stroke();
    ctx.lineWidth = Math.max(.5, r*.17);
    ctx.strokeStyle = 'rgba(255,255,255,.54)';
    ctx.beginPath(); ctx.ellipse(x, y, r*.86, ry*.96, 0, Math.PI*1.22, Math.PI*1.88); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.86)';
    ctx.beginPath(); ctx.arc(x - r*.30, y - ry*.32, Math.max(.6, r*.2), 0, TAU); ctx.fill();
  }

  /* ---------- 散景：湿玻璃后面的灯光 ---------- */
  function buildBokehRain(){
    bokehRain = [];
    var n = Math.round(clamp(30*(W*H)/1440000, 16, 42));
    for(var i=0;i<n;i++){
      bokehRain.push({
        x: rnd(-.04,1.04)*W, y: rnd(H*0.02, H*0.98),
        r: rnd(16,64), ph: rnd(0,TAU), sp: rnd(.12,.4),
        vx: rnd(-.10,.10), vy: rnd(-.026,.026),
        a: rnd(.18,.58),
        c: (i%3===0) ? WARM : ((i%3===1) ? S_BOKEH : ACCRGB)
      });
    }
  }
  function updateBokeh(k){
    for(var i=0;i<bokehRain.length;i++){
      var b = bokehRain[i];
      b.x += b.vx*k; b.y += b.vy*k;
      if(b.x < -90) b.x = W+90; else if(b.x > W+90) b.x = -90;
      if(b.y < -70) b.y = H+70; else if(b.y > H+70) b.y = -70;
    }
  }
  /* 雨把光往下拖出一条尾巴，这是雨天最好看的东西 */
  function paintBokeh(ctx, g){
    var boost = 1 + g*.4;
    for(var i=0;i<bokehRain.length;i++){
      var b = bokehRain[i];
      var a = b.a * (.55 + .45*Math.sin(curT*b.sp + b.ph)) * boost;
      blob(ctx, b.x, b.y + b.r*0.55, b.r*1.18, b.c, a*.30);
      blob(ctx, b.x, b.y + b.r*1.15, b.r*0.92, b.c, a*.17);
      blob(ctx, b.x, b.y, b.r, b.c, a*.60);
      blob(ctx, b.x, b.y, b.r*.42, '255,255,255', a*.32);
    }
  }

  /* ---------- 雪花：六角、带风 ---------- */
  function crystal(ctx,x,y,r,rot,a){
    ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
    ctx.lineWidth = Math.max(.6, r*.2); ctx.lineCap = 'round';
    var i;
    for(i=0;i<3;i++){
      var ang = i*Math.PI/3;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(ang)*r, -Math.sin(ang)*r);
      ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
      ctx.stroke();
    }
    if(r > 2.6){
      ctx.lineWidth = Math.max(.45, r*.11);
      for(i=0;i<6;i++){
        var a2 = i*Math.PI/3, bx = Math.cos(a2)*r*.6, by = Math.sin(a2)*r*.6;
        ctx.beginPath();
        ctx.moveTo(bx,by); ctx.lineTo(bx + Math.cos(a2+.75)*r*.3, by + Math.sin(a2+.75)*r*.3);
        ctx.moveTo(bx,by); ctx.lineTo(bx + Math.cos(a2-.75)*r*.3, by + Math.sin(a2-.75)*r*.3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- 晴天的光束 ---------- */
  function beams(ctx,t){
    var rgb = WARM;
    var base = mx ? mx : W*0.7;
    var sunX = W*0.68 + (base - W*0.5)*0.28;
    for(var i=0;i<4;i++){
      var x0 = sunX - W*0.5 + W*(0.06 + i*0.19) + Math.sin(t*.06 + i*1.4)*26;
      var wd = 100 + Math.sin(t*.1 + i*2)*26;
      var a = .045 + .04*Math.sin(t*.33 + i*1.7);
      var g = ctx.createLinearGradient(x0 - wd, 0, x0 + wd, H);
      g.addColorStop(0,'rgba('+rgb+',0)');
      g.addColorStop(.5,'rgba('+rgb+','+Math.max(0,a).toFixed(3)+')');
      g.addColorStop(1,'rgba('+rgb+',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 - wd*.35, -20); ctx.lineTo(x0 + wd*.35, -20);
      ctx.lineTo(x0 + wd*2.0, H+20); ctx.lineTo(x0 + wd*0.2, H+20);
      ctx.closePath(); ctx.fill();
    }
    /* 太阳本体：暖光晕，跟着鼠标轻轻偏 */
    blob(ctx, sunX, -H*0.06, H*0.55, rgb, .3);
  }

  /* ============================================================
     主循环
     ============================================================ */
  var t0 = 0, last = 0;
  document.addEventListener('visibilitychange', function(){ paused = document.hidden; });
  function frame(now){
    if(!t0) { t0 = now; last = now; }
    if(paused){ t0 += (now - last); last = now; requestAnimationFrame(frame); return; }
    var t = (now - t0)/1000;
    curT = t;
    var dt = Math.min(48, now - last); last = now;
    /* 掉帧就自动降级：关掉位移，只留水膜层 */
    if(dt > 28) slow++; else if(slow > 0) slow--;
    if(!degraded && slow > 26){ degraded = true; root.setAttribute('data-fx','low'); }
    var k = dt/16.7;
    bc.clearRect(0,0,W,H); fc.clearRect(0,0,W,H);
    if(reduced){ requestAnimationFrame(frame); return; }

    var s = SEASON[state.season], w = state.weather, i, d;

    /* ---- 背景：雾团 / 远处散景 / 树影光斑 ---- */
    if(w === 'fog'){
      for(i=0;i<banks.length;i++){
        var b = banks[i];
        b.x -= b.v * k * 0.016 * 60 * 0.06;
        if(b.x < -b.r - 40) b.x = W + b.r;
        var yy = b.y + Math.sin(t*b.sv + b.ph)*30;
        blob(bc, b.x, yy, b.r, '255,255,255', b.a);
        blob(bc, b.x, yy, b.r*.6, s.bokeh, b.a*.5);
      }
      for(i=0;i<bokeh.length;i++){
        var bo = bokeh[i];
        var pulse = .35 + .65*Math.pow(Math.max(0, Math.sin(t*bo.sp + bo.ph)), 3);
        blob(bc, bo.x, bo.y, bo.r*(1 + pulse*.25), s.bokeh, bo.a*pulse);
      }
    }
    if(w === 'clear' && dapple.length){
      for(i=0;i<dapple.length;i++){
        var dp = dapple[i];
        var ox = dp.x + Math.sin(t*dp.sp + dp.ph)*70;
        var oy = dp.y + Math.cos(t*dp.sp*.8 + dp.ph)*46;
        blob(bc, ox, oy, dp.r*(.8 + .2*Math.sin(t*.4 + dp.ph)), '255,255,255', .16);
      }
    }

    /* ---- 前景 ---- */
    if(w === 'rain'){
      /* 阵雨：隔一阵来一阵，雨更斜、光更亮 */
      gustTimer -= dt/1000;
      if(gustTimer <= 0){ gustTimer = rnd(9,22); gustDur = rnd(2.4,4.8); gustAge = 0; }
      if(gustAge < gustDur){ gustAge += dt/1000; gust = Math.sin((gustAge/gustDur)*Math.PI); }
      else gust = 0;

      /* 玻璃后面：散景灯光，被雨往下拖出尾巴 */
      updateBokeh(k);
      paintBokeh(bc, gust);

      /* 天上还在下的雨丝（阵雨时更斜） */
      var slant = .13 + gust*.55;
      fc.lineCap = 'round';
      fc.strokeStyle = 'rgba(255,255,255,' + (.12 + gust*.06).toFixed(3) + ')';
      for(i=0;i<streaks.length;i++){
        var st3 = streaks[i];
        st3.y += st3.v*k; st3.x += st3.v*slant*k;
        if(st3.y - st3.len > H){ st3.y = -rnd(20,200); st3.x = rnd(-60,W+60); }
        fc.lineWidth = st3.w;
        fc.beginPath(); fc.moveTo(st3.x, st3.y - st3.len); fc.lineTo(st3.x, st3.y); fc.stroke();
      }
    }

    else if(w === 'snow'){
      var wind = Math.sin(t*.13)*1.3 + Math.sin(t*.41 + 1.2)*.6 + Math.sin(t*.07)*.8;
      for(i=0;i<flakes.length;i++){
        var f = flakes[i];
        var lf = f.L === 0 ? .45 : f.L === 1 ? .85 : 1.5;
        f.y += f.v*k*lf;
        f.x += (wind*lf*.9 + Math.sin(t*.8 + f.ph)*f.sw)*k;
        f.rot += f.vr*k;
        if(f.y > H + 12){ f.y = -12; f.x = rnd(-40,W+40); }
        if(f.x > W + 20) f.x = -20; if(f.x < -20) f.x = W + 20;
        if(f.L === 0){
          blob(fc, f.x, f.y, f.r*3, '255,255,255', f.a*.30);
        } else if(f.L === 1){
          blob(fc, f.x, f.y, f.r*2.4, '255,255,255', f.a*.34);
          fc.fillStyle = 'rgba(255,255,255,' + f.a + ')';
          fc.beginPath(); fc.arc(f.x, f.y, f.r*.62, 0, TAU); fc.fill();
        } else {
          blob(fc, f.x, f.y, f.r*2.2, '255,255,255', f.a*.28);
          crystal(fc, f.x, f.y, f.r, f.rot, f.a*.85);
          /* 近处雪花拖一点残影 */
          fc.fillStyle = 'rgba(255,255,255,' + (f.a*.14) + ')';
          fc.beginPath(); fc.ellipse(f.x, f.y - f.v*2, f.r*.4, f.r*1.5, 0, 0, TAU); fc.fill();
        }
      }
      /* 玻璃内侧慢慢积起来的一点寒气 */
      if(Math.random() < .02*k) blob(fc, rnd(0,W), rnd(0,H), rnd(60,140), '235,246,255', .05);
    }

    else if(w === 'clear'){
      beams(bc, t);
      for(i=0;i<motes.length;i++){
        var m = motes[i];
        if(m.t === 'dust'){
          m.y -= m.v*.45*k; m.x += Math.sin(t*.4 + m.ph)*m.sw*.5*k;
          if(m.y < -20){ m.y = H + 20; m.x = rnd(0,W); }
          var br = .3 + .5*Math.sin(t*1.1 + m.ph);
          blob(fc, m.x, m.y, m.r*2.4, s.mote, Math.max(0, br)*.45*m.a);
        } else if(m.t === 'ice'){
          m.y += m.v*k; m.x += Math.sin(t*.5 + m.ph)*m.sw*.6*k;
          if(m.y > H + 10){ m.y = -10; m.x = rnd(0,W); }
          var tw = .25 + .6*Math.abs(Math.sin(t*1.7 + m.ph));
          blob(fc, m.x, m.y, m.r*1.7, s.mote, tw*.5*m.a);
          if(tw > .8 && m.r > 5){
            /* 偶尔闪一下十字星芒 */
            var rr = m.r*2.4;
            fc.strokeStyle = 'rgba(' + s.mote + ',' + (tw*.55) + ')';
            fc.lineWidth = .8;
            fc.beginPath();
            fc.moveTo(m.x - rr, m.y); fc.lineTo(m.x + rr, m.y);
            fc.moveTo(m.x, m.y - rr); fc.lineTo(m.x, m.y + rr);
            fc.stroke();
          }
        } else {
          /* 花瓣 / 落叶：翻着面往下落 */
          m.y += m.v*k; m.x += (Math.sin(t*.55 + m.ph)*m.sw + Math.sin(t*.17)*.5)*k;
          m.rot += m.vr*k;
          if(m.y > H + 30){ m.y = -30; m.x = rnd(0,W); }
          var sc = Math.cos(m.rot*1.6);
          fc.save(); fc.translate(m.x, m.y); fc.rotate(m.rot*.4); fc.scale(sc, 1);
          fc.fillStyle = 'rgba(' + s.petal + ',' + (m.a*.92) + ')';
          fc.beginPath();
          if(m.t === 'leaf') fc.ellipse(0, 0, m.r*1.45, m.r*.62, 0, 0, TAU);
          else fc.ellipse(0, 0, m.r*.58, m.r*.92, 0, 0, TAU);
          fc.fill();
          fc.restore();
        }
      }
    }

    else { /* fog：玻璃起雾，鼠标划过会擦开，然后慢慢又糊上 */
      /* 背景雾团已在上面画完；这里画玻璃上的凝结层 */
      dripTimer += dt;
      if(dripTimer > 2600 && drops.length){
        dripTimer = 0;
        var sd = drops[(Math.random()*drops.length)|0];
        runners.push({x:sd.x, y:sd.y, r:rnd(2,4.4), vy:.5, len:0, wob:rnd(0,TAU)});
      }
      /* 用鼠标擦出一小片清楚的地方 */
      if(mousePath.x > -900){
        fgc.save();
        fgc.globalCompositeOperation = 'destination-out';
        var er = sprite('0,0,0');
        var steps = 5, dx = (mousePath.x - mousePath.px), dy = (mousePath.y - mousePath.py);
        for(var q=0;q<steps;q++){
          var px = mousePath.px + dx*(q/steps), py = mousePath.py + dy*(q/steps);
          fgc.globalAlpha = .16;
          fgc.drawImage(er, px - 58, py - 58, 116, 116);
        }
        fgc.globalAlpha = 1;
        fgc.restore();
      }
      mousePath.px = mousePath.x; mousePath.py = mousePath.y;
      /* 又慢慢糊回去 */
      var rgbF = state.season === 'winter' ? '236,246,255' :
                 state.season === 'autumn' ? '255,240,220' :
                 state.season === 'summer' ? '242,252,252' : '248,252,242';
      fgc.fillStyle = 'rgba(' + rgbF + ',0.0035)';
      fgc.fillRect(0,0,W,H);
      fc.drawImage(fogC, 0, 0, W, H);
      /* 凝结成的水珠，偶尔顺着玻璃滑下来 */
      for(i=0;i<drops.length;i++) staticDrop(fc, drops[i].x, drops[i].y, drops[i].r);
      for(i=runners.length-1;i>=0;i--){
        var fr = runners[i];
        fr.vy += 0.012*k; fr.y += fr.vy*k; fr.len = Math.min(fr.len + fr.vy*k*1.2, 90);
        fr.x += Math.sin(fr.wob += .05*k)*0.12*k;
        for(var jj=drops.length-1;jj>=0;jj--){
          var fd = drops[jj], ddx = fd.x - fr.x, ddy = fd.y - fr.y;
          if(ddx*ddx + ddy*ddy < (fr.r + fd.r*.7)*(fr.r + fd.r*.7)){
            fr.r = Math.min(8, Math.sqrt(fr.r*fr.r + fd.r*fd.r*.5)); drops.splice(jj,1);
          }
        }
        fr.r -= 0.004*k;
        if(fr.y - fr.len > H + 20 || fr.r < .9) runners.splice(i,1);
        else slideDrop(fc, fr.x, fr.y, fr.r, fr.len);
      }
    }

    requestAnimationFrame(frame);
  }

  /* ============================================================
     雨天：让玻璃本身被淋湿
     不画水 —— 用 SVG feTurbulence 做一张缓慢流动的水膜，
     再用 feDisplacementMap 折射卡片真实的内容（文字、描边、高光）。
     所有元素共享同一张噪声场（userSpaceOnUse），位移才连续。
     ============================================================ */
  var ioWet = new IntersectionObserver(function(es){
    es.forEach(function(en){ en.target.classList.toggle('inview', en.isIntersecting); });
  }, {rootMargin:'140px'});

  /* 水膜层按需注入：全站元素一多，逐个插 .film + 绑监听会线性变重，
     所以只给「快要进入视口」的元素做，滚走了也不再补。 */
  function addFilm(el){
    if(el.__film || el.querySelector('.film')) return;
    el.__film = 1;
    var fm = document.createElement('i');
    fm.className = 'film';
    fm.style.setProperty('--mx','-999px');
    fm.style.setProperty('--my','-999px');
    fm.style.setProperty('--sx', rnd(6,94).toFixed(1)+'%');
    fm.style.setProperty('--sw', rnd(1.4,3.4).toFixed(1)+'px');
    fm.style.setProperty('--sdu', rnd(5,11).toFixed(1)+'s');
    fm.style.setProperty('--sd', rnd(0,6).toFixed(1)+'s');
    fm.style.setProperty('--rx', rnd(12,88).toFixed(1)+'%');
    fm.style.setProperty('--ry', rnd(15,85).toFixed(1)+'%');
    fm.style.setProperty('--rdu', rnd(7,14).toFixed(1)+'s');
    fm.style.setProperty('--rd', rnd(0,8).toFixed(1)+'s');
    el.appendChild(fm);
    el.addEventListener('mousemove', function(e){
      var r = el.getBoundingClientRect();
      fm.style.setProperty('--mx', (e.clientX-r.left)+'px');
      fm.style.setProperty('--my', (e.clientY-r.top)+'px');
    }, {passive:true});
    el.addEventListener('mouseleave', function(){
      fm.style.setProperty('--mx','-999px');
      fm.style.setProperty('--my','-999px');
    });
  }
  var ioFilm = new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(!en.isIntersecting) return;
      ioFilm.unobserve(en.target);
      addFilm(en.target);
    });
  }, {rootMargin:'240px 0px'});
  function initFilm(scope){
    $$('.glass, .cell, .f, .nav', scope).forEach(function(el){
      if(el.__film || el.__filmWatch) return;
      el.__filmWatch = 1;
      ioFilm.observe(el);
    });
  }

  /* 雨天水膜位移：只作用在大号文字上。
     小卡片内的文字一律不加滤镜 —— 位移/光照会破坏细笔画字形。
     卡片的水感全部交给 .film 纯 CSS 层，永不遮挡或吃掉文字。 */
  function initWet(){
    $$('.hero h1').forEach(function(el){
      el.setAttribute('data-wet','a'); el.classList.add('self'); ioWet.observe(el);
    });
    $$('.hero .lede').forEach(function(el){
      el.setAttribute('data-wet','b'); el.classList.add('self'); ioWet.observe(el);
    });
  }

  function sizeFilters(){
    ['wetA','wetB'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      el.setAttribute('x', -60); el.setAttribute('y', -60);
      el.setAttribute('width', (W+120)); el.setAttribute('height', (H+120));
    });
  }

  /* ============================================================
     罗盘交互
     ============================================================ */
  var climate = $('#climate'), dock = $('#dock');
  dock.addEventListener('click', function(){ climate.classList.toggle('open'); });
  document.addEventListener('click', function(e){
    if(climate.classList.contains('open') && !climate.contains(e.target)) climate.classList.remove('open');
  });
  $$('.node').forEach(function(n){
    n.addEventListener('click', function(){
      if(n.dataset.s) state.season = n.dataset.s;
      if(n.dataset.w) state.weather = n.dataset.w;
      realTemp = null;
      apply(true);
    });
    n.addEventListener('mouseenter', function(){ $('#cring').classList.add('hot'); });
    n.addEventListener('mouseleave', function(){ $('#cring').classList.remove('hot'); });
  });
  $('#locBtn').addEventListener('click', function(){ pullWeather(); });

  /* ============================================================
     光标
     ============================================================ */
  var dot = $('#cdot'), ring = $('#cring'), glow = $('#cglow');
  var mx = window.innerWidth/2, my = window.innerHeight/2, rx = mx, ry = my, gx = mx, gy = my;
  if(fine) glow.style.opacity = '.9';
  else { dot.style.display = ring.style.display = 'none'; }
  window.addEventListener('mousemove', function(e){
    mx = e.clientX; my = e.clientY;
    mousePath.x = mx; mousePath.y = my;
    if(mousePath.px < -900){ mousePath.px = mx; mousePath.py = my; }
    dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
  }, {passive:true});
  (function loop(){
    rx += (mx-rx)*.16; ry += (my-ry)*.16;
    gx += (mx-gx)*.055; gy += (my-gy)*.055;
    ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
    glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px) translate(-50%,-50%)';
    requestAnimationFrame(loop);
  })();
  /* 动态渲染出来的元素也要能触发光标放大 / 高光 / 倾斜，
     所以这几段绑定都做成可重复调用的函数，渲染完再调一次。 */
  function bindHover(scope){
    $$('a,button,.post,.cell,.f,.pill,.tag,.res', scope).forEach(function(el){
      if(el.__hot) return; el.__hot = 1;
      el.addEventListener('mouseenter', function(){ ring.classList.add('hot'); });
      el.addEventListener('mouseleave', function(){ ring.classList.remove('hot'); });
    });
  }
  function bindSpot(scope){
    $$('.spot, .cell, .f', scope).forEach(function(el){
      if(el.__spot) return; el.__spot = 1;
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX-r.left)+'px');
        el.style.setProperty('--my', (e.clientY-r.top)+'px');
      }, {passive:true});
    });
  }
  function bindTilt(scope){
    $$('.post', scope).forEach(function(el){
      if(el.__tilt) return; el.__tilt = 1;
      el.addEventListener('mousemove', function(e){
        if(!fine) return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX-r.left)/r.width - .5, py = (e.clientY-r.top)/r.height - .5;
        el.style.transform = 'perspective(1100px) rotateX(' + (-py*2.2).toFixed(2) + 'deg) rotateY(' + (px*2.6).toFixed(2) + 'deg) translateY(-6px)';
      });
      el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
    });
  }
  bindHover(document); bindSpot(document); bindTilt(document);

  var prog = $('#prog');
  window.addEventListener('scroll', function(){
    var h = document.documentElement;
    prog.style.width = ((h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight))*100).toFixed(2) + '%';
  }, {passive:true});

  var io = new IntersectionObserver(function(es){
    es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
  }, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
  function observeReveal(scope){ $$('.rv', scope).forEach(function(el){ io.observe(el); }); }
  observeReveal(document);

  var io2 = new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(!en.isIntersecting) return;
      var a = $('.nav-links a[href="#' + en.target.id + '"]');
      if(a){ $$('.nav-links a').forEach(function(x){x.classList.remove('on')}); a.classList.add('on'); }
    });
  }, {threshold:.3});
  ['longform','gallery','fragments','about'].forEach(function(id){
    var s = document.getElementById(id); if(s) io2.observe(s);
  });

  function tick(){
    var d = new Date(), p = function(n){return n<10?'0'+n:''+n};
    $('#clock').textContent = p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
    $('#solar').textContent = solarTerm(d);
  }
  tick(); setInterval(tick, 1000);

  /* ============================================================
     内容数据（assets/content.js，由 build.mjs 从 content/ 生成）
     ============================================================ */
  var CONTENT = window.MISTY_CONTENT || null;
  var SITE = (CONTENT && CONTENT.site) || {};
  var POSTS = (CONTENT && CONTENT.posts) || [];
  var FRAGMENTS = (CONTENT && CONTENT.fragments) || [];
  var GALLERY = (CONTENT && CONTENT.gallery) || [];
  var ARROW = '<svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M0 5h13M10 1l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

  function esc(s){
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* 站内相对资源：独立文章页会注入 __MISTY_BASE__（例如 '../../'） */
  var BASE = (window.__MISTY_BASE__ === undefined) ? '' : window.__MISTY_BASE__;
  function hrefOf(p){
    return /^(https?:|mailto:|tel:|data:|#|\/)/.test(p) ? p : BASE + p;
  }
  function isBuiltin(v){ return /^img-\d+$/.test(String(v)); }
  function imgTag(v, cls){
    var pre = cls ? cls + ' ' : '';
    if(isBuiltin(v)) return '<i class="' + pre + v + '"></i>';
    /* 真实照片用 <img loading="lazy">：背景图没法懒加载，图一多就会一次性全下 */
    return '<img class="' + pre + 'img-real" src="' + esc(hrefOf(v)) + '" alt="" loading="lazy" decoding="async">';
  }
  function tagChips(tags, cls){
    return (tags || []).map(function(t){
      return '<button class="tag' + (cls ? ' ' + cls : '') + '" data-tag="' + esc(t) + '">#' + esc(t) + '</button>';
    }).join('');
  }
  function slugIndex(slug){
    for(var i = 0; i < POSTS.length; i++) if(POSTS[i].slug === slug) return i;
    return -1;
  }

  /* 每页先铺多少：文章多了以后首页不该变成目录，
     深度浏览交给「看全部」和归档面板，面板里再分批。 */
  var PAGE = { posts: 8, frags: 9, gal: 7, stepFrag: 12, stepGal: 7, panel: 30 };
  var shownFrag = PAGE.frags, shownGal = PAGE.gal;

  /* 搜索索引：用渲染后的正文建一次小写副本，比每次按键都剥标签划算 */
  POSTS.forEach(function(p){
    p._s = (p.title + ' ' + p.summary + ' ' + p.category + ' ' + p.tags.join(' ') + ' ' +
      String(p.html).replace(/<[^>]+>/g, ' ')).toLowerCase();
  });

  /* 渲染完统一补一次交互绑定 */
  function afterRender(scope){
    bindHover(scope); bindSpot(scope); bindTilt(scope); observeReveal(scope); initFilm(scope);
  }
  function moreRow(sel, total, shown, unit, label, onClick){
    var el = $(sel); if(!el) return;
    if(total - shown <= 0){ el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<button class="pill" type="button">' + label + ' · 还有 ' + (total - shown) + ' ' + unit + ' →</button>';
    el.querySelector('button').addEventListener('click', onClick);
  }

  /* ---------- 渲染：文章 / 图集 / 碎片 / 关于 ---------- */
  function renderPosts(){
    var g = $('#postGrid'); if(!g) return;
    if(!POSTS.length){
      g.innerHTML = '<p class="empty">还没有文章。在 <code>content/posts/</code> 放一个 .md，再跑 <code>node build.mjs</code>。</p>';
      return;
    }
    var list = POSTS.slice(0, PAGE.posts);
    g.innerHTML = list.map(function(p, i){
      return '<article class="glass post spot rv" data-post="' + i + '" tabindex="0" role="button"' +
        ' aria-label="阅读：' + esc(p.title) + '"' +
        (i ? ' style="transition-delay:' + Math.min(i, 5) * 0.07 + 's"' : '') + '>' +
        '<div class="meta"><span>' + esc(p.dateText) + '</span><i></i><span>' + esc(p.category) + '</span><i></i><span>' + p.minutes + ' min</span></div>' +
        '<div class="thumb">' + imgTag(p.cover) + '</div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p>' + esc(p.summary) + '</p>' +
        '<div class="foot"><span class="read">阅读全文 ' + ARROW + '</span><span class="lab">NO.' + p.no + '</span></div>' +
        '</article>';
    }).join('');
    moreRow('#postMore', POSTS.length, list.length, '篇', '看全部 ' + POSTS.length + ' 篇',
      function(){ openPanel('all', null); });
  }

  var GAL_SLOT = ['c-a', 'c-b', 'c-c', 'c-d', 'c-e', 'c-f', 'c-g'];
  function renderGallery(){
    var g = $('#galGrid'); if(!g) return;
    if(!GALLERY.length){ g.innerHTML = '<p class="empty">图集还空着。</p>'; return; }
    var list = GALLERY.slice(0, shownGal);
    g.innerHTML = list.map(function(it, i){
      return '<button class="cell ' + GAL_SLOT[i % GAL_SLOT.length] + ' rv" data-gal="' + i + '"' +
        ' aria-label="看图：' + esc(it.title) + '"' +
        (i ? ' style="transition-delay:' + ((i % 6) * 0.06).toFixed(2) + 's"' : '') + '>' +
        imgTag(it.img, 'i') +
        '<span class="cap"><span>' + esc(it.title) + '</span><em>' + esc(it.time) + '</em></span>' +
        '</button>';
    }).join('');
    moreRow('#galMore', GALLERY.length, list.length, '张', '继续看图',
      function(){ shownGal += PAGE.stepGal; renderGallery(); afterRender($('#galGrid')); });
  }

  var fragFilter = null;
  function renderFragments(){
    var g = $('#fragList'); if(!g) return;
    var list = FRAGMENTS.filter(function(f){ return !fragFilter || f.tags.indexOf(fragFilter) >= 0; });
    var shown = list.slice(0, shownFrag);
    g.innerHTML = shown.map(function(f, i){
      return '<div class="f' + (f.style ? ' ' + f.style : '') + ' rv" style="transition-delay:' +
        ((i % 6) * 0.06).toFixed(2) + 's">' +
        '<div class="d"><span>' + esc(f.dateText) + '</span><span>' + esc(f.kind) + '</span></div>' +
        '<div class="ftext">' + f.html + '</div>' +
        (f.tags.length ? '<div class="ftags">' + tagChips(f.tags) + '</div>' : '') +
        '<div class="sig">' + esc(f.sig) + '</div>' +
        '</div>';
    }).join('') || '<p class="empty">这个标签下还没有碎片。</p>';
    $('#fragFilter').hidden = !fragFilter;
    if(fragFilter) $('#fragChipText').textContent = '#' + fragFilter;
    moreRow('#fragMore', list.length, shown.length, '条', '继续看碎片',
      function(){ shownFrag += PAGE.stepFrag; renderFragments(); afterRender($('#fragList')); });
  }

  function renderAbout(){
    var a = SITE.about || {};
    $('#aboutKicker').textContent = a.kicker || 'ABOUT';
    $('#aboutHeading').textContent = a.heading || '';
    $('#aboutBody').innerHTML = a.html || '';
    $('#social').innerHTML = (SITE.social || []).map(function(s){
      var href = hrefOf(s.href || '#');
      var attr = 'href="' + esc(href) + '"';
      if(/^https?:/.test(href)) attr += ' target="_blank" rel="noopener"';
      if(s.copy) attr += ' data-copy="' + esc(String(href).replace(/^mailto:/, '')) + '" title="点击复制邮箱"';
      if(href === '#') attr += ' data-todo="' + esc(s.todo || '') + '"';
      return '<a class="pill" ' + attr + '>' + esc(s.label) + '</a>';
    }).join('');
  }

  function renderStats(){
    $('#cnt').textContent = POSTS.length;
    $('#fragCount').textContent = FRAGMENTS.length;
    var c = $('#kCity'), y = $('#kYear');
    if(c) c.textContent = SITE.city || '武汉';
    if(y) y.textContent = new Date().getFullYear();
  }

  /* ============================================================
     阅读层（文章 / 图集共用）
     ============================================================ */
  var reader = $('#reader'), rp = $('#rp'), rpWrap = $('#rpWrap');
  var panel = $('#panel');
  var curIdx = -1;

  /* 锁滚动用显式状态，不能靠读取 .on 这个类 ——
     关闭时 .on 要等淡出动画（480ms）才摘掉，靠它判断会永远锁着页面，滚轮就死了。 */
  var lockState = { reader: false, panel: false };
  function lockBody(){
    var held = lockState.reader || lockState.panel;
    document.body.style.overflow = held ? 'hidden' : '';
    document.body.classList.toggle('reading', held);
  }
  function setHash(h){
    var base = location.pathname + location.search;
    if(h) location.hash = h;
    else if(location.hash) history.replaceState(null, '', base);
  }

  function postHTML(i){
    var p = POSTS[i]; if(!p) return '';
    var older = POSTS[i + 1], newer = POSTS[i - 1];
    return '<div class="rmeta">' + esc(p.dateText) + ' · ' + esc(p.category) + ' · ' + p.minutes + ' MIN · NO.' + p.no + '</div>' +
      '<h2>' + esc(p.title) + '</h2>' +
      (p.cover ? '<div class="thumb rthumb">' + imgTag(p.cover) + '</div>' : '') +
      '<div class="body">' + p.html + '</div>' +
      '<div class="rtags">' + tagChips(p.tags) + '</div>' +
      '<nav class="rnav">' +
        (older ? '<button class="rnav-item" data-go="' + (i + 1) + '">' +
          '<span class="lab">更早的一篇</span><b>' + esc(older.title) + '</b></button>' : '<span></span>') +
        (newer ? '<button class="rnav-item next" data-go="' + (i - 1) + '">' +
          '<span class="lab">更新的一篇</span><b>' + esc(newer.title) + '</b></button>' : '') +
      '</nav>';
  }

  function showReader(html, label){
    rp.innerHTML = html;
    reader.classList.add('on');
    requestAnimationFrame(function(){ reader.classList.add('show'); });
    lockState.reader = true;
    lockBody();
    rpWrap.scrollTop = 0;
    if(label) reader.setAttribute('aria-label', label);
    bindHover(reader); bindSpot(reader);
  }
  function openPost(i, silent){
    var p = POSTS[i]; if(!p) return;
    curIdx = i;
    showReader(postHTML(i), p.title);
    if(!silent) setHash('post/' + p.slug);
  }
  function closePost(){
    if(!reader.classList.contains('on')) return;
    reader.classList.remove('show');
    setTimeout(function(){ reader.classList.remove('on'); }, 480);
    curIdx = -1;
    lockState.reader = false;
    lockBody();
    if(/^#post\//.test(location.hash)) setHash('');
  }

  var grid = $('#postGrid');
  if(grid){
    grid.addEventListener('click', function(e){
      var el = e.target.closest('[data-post]'); if(!el) return;
      openPost(parseInt(el.dataset.post, 10));
    });
    grid.addEventListener('keydown', function(e){
      if(e.key !== 'Enter' && e.key !== ' ') return;
      var el = e.target.closest('[data-post]'); if(!el) return;
      e.preventDefault(); openPost(parseInt(el.dataset.post, 10));
    });
  }

  var gal = $('#galGrid');
  if(gal){
    gal.addEventListener('click', function(e){
      var el = e.target.closest('[data-gal]'); if(!el) return;
      var it = GALLERY[parseInt(el.dataset.gal, 10)]; if(!it) return;
      var s = SEASON[state.season].cn, w = WEATHER[state.weather].cn;
      showReader('<div class="rmeta">GALLERY · ' + esc(s) + ' · ' + esc(w) + ' · ' + esc(it.exif) + '</div>' +
        '<h2>' + esc(it.title) + '</h2>' +
        '<div class="thumb rthumb wide">' + imgTag(it.img) + '</div>' +
        '<div class="body">' + it.html + '</div>' +
        '<div class="rtags">' + tagChips(it.tags) + '</div>', it.title);
    });
  }

  rp.addEventListener('click', function(e){
    var go = e.target.closest('[data-go]'); if(!go) return;
    openPost(curIdx + parseInt(go.dataset.go, 10));
  });
  $('#closeBtn').addEventListener('click', closePost);
  reader.addEventListener('click', function(e){ if(e.target === reader || e.target === rpWrap) closePost(); });

  /* ============================================================
     搜索 / 标签 / 归档
     ============================================================ */
  var qEl = $('#q'), resEl = $('#resList'), tagPoolEl = $('#tagPool');
  var panelTab = 'all', panelTag = null;

  function openPanel(tab, tag){
    if(tab) panelTab = tab;
    if(tag !== undefined) panelTag = tag;
    panel.classList.add('on');
    lockState.panel = true;
    lockBody();
    renderPanel();
    if(fine) setTimeout(function(){ qEl.focus(); }, 160);
  }
  function closePanel(){
    if(!panel.classList.contains('on')) return;
    panel.classList.remove('on');
    lockState.panel = false;
    qEl.value = '';
    panelTag = null; panelTab = 'all';
    lockBody();
    if(location.hash === '#archive' || location.hash === '#search') setHash('');
  }

  function allTags(){
    var m = Object.create(null);
    POSTS.forEach(function(p){ p.tags.forEach(function(t){ m[t] = (m[t] || 0) + 1; }); });
    return Object.keys(m).map(function(t){ return { tag: t, n: m[t] }; })
      .sort(function(a, b){ return b.n - a.n || (a.tag < b.tag ? -1 : 1); });
  }
  function matchedPosts(){
    var q = (qEl.value || '').trim().toLowerCase();
    return POSTS.filter(function(p){
      if(panelTag && p.tags.indexOf(panelTag) < 0) return false;
      if(!q) return true;
      return p._s.indexOf(q) >= 0;
    });
  }
  function resRow(p){
    var meta = esc(p.category) + (p.tags.length ? ' · ' + esc(p.tags.join(' / ')) : '');
    return '<button class="res" data-slug="' + esc(p.slug) + '">' +
      '<span class="res-date">' + esc(p.dateText) + '</span>' +
      '<span class="res-title">' + esc(p.title) + '</span>' +
      '<span class="res-meta">' + meta + '</span>' +
      '</button>';
  }
  var EMPTY_ROW = '<p class="empty">没有匹配的文章。</p>';
  var panelShown = PAGE.panel, panelTotal = 0;

  function renderPanel(reset){
    if(reset !== false) panelShown = PAGE.panel;
    var list = matchedPosts();
    panelTotal = list.length;
    $$('#panelTabs .tab').forEach(function(t){ t.classList.toggle('on', t.dataset.tab === panelTab); });
    $('#tabCountAll').textContent = list.length;

    if(panelTab === 'tag' || panelTab === 'all'){
      tagPoolEl.hidden = false;
      /* 标签只铺前 40 个（按文章数排序），几百个标签也不至于把面板塞满 */
      var tags = allTags(), TAG_CAP = 40;
      tagPoolEl.innerHTML = tags.slice(0, TAG_CAP).map(function(t){
        return '<button class="chip' + (panelTag === t.tag ? ' on' : '') + '" data-tag="' + esc(t.tag) + '">' +
          esc(t.tag) + '<b>' + t.n + '</b></button>';
      }).join('') + (tags.length > TAG_CAP
        ? '<span class="chip chip-dim">还有 ' + (tags.length - TAG_CAP) + ' 个标签，搜关键词更快</span>' : '');
    } else {
      tagPoolEl.hidden = true;
    }

    if(!list.length){ resEl.innerHTML = EMPTY_ROW; return; }

    /* 面板也分批：一次只铺 30 条，滚到底再续 */
    var slice = list.slice(0, panelShown);
    var tail = (panelShown < list.length)
      ? '<div class="res-more">还有 ' + (list.length - panelShown) + ' 篇 · 继续往下滚</div>' : '';

    if(panelTab === 'archive'){
      var byYear = {};
      slice.forEach(function(p){ (byYear[p.year] = byYear[p.year] || []).push(p); });
      resEl.innerHTML = Object.keys(byYear).sort().reverse().map(function(y){
        return '<div class="res-year"><span class="lab">' + y + '</span><span class="lab">' +
          byYear[y].length + ' 篇</span></div>' + byYear[y].map(resRow).join('');
      }).join('') + tail;
    } else if(panelTab === 'tag' && !panelTag){
      var byTag = {};
      slice.forEach(function(p){ p.tags.forEach(function(t){ (byTag[t] = byTag[t] || []).push(p); }); });
      resEl.innerHTML = Object.keys(byTag).map(function(t){
        return '<div class="res-year"><span class="lab">#' + esc(t) + '</span><span class="lab">' +
          byTag[t].length + ' 篇</span></div>' + byTag[t].map(resRow).join('');
      }).join('') + tail;
    } else {
      resEl.innerHTML = slice.map(resRow).join('') + tail;
    }
  }

  /* 输入时防抖，别每敲一个字就重排一遍 */
  var qTimer = 0;
  function onQuery(){
    clearTimeout(qTimer);
    qTimer = setTimeout(function(){ renderPanel(); }, 120);
  }
  qEl.addEventListener('input', onQuery);
  qEl.addEventListener('search', onQuery);   // 原生 ✕ 清除按钮
  resEl.addEventListener('scroll', function(){
    if(panelShown >= panelTotal) return;
    if(resEl.scrollTop + resEl.clientHeight >= resEl.scrollHeight - 120){
      panelShown += PAGE.panel;
      renderPanel(false);
    }
  }, {passive:true});
  $$('#panelTabs .tab').forEach(function(t){
    t.addEventListener('click', function(){ panelTab = t.dataset.tab; renderPanel(); });
  });
  $('#panelClose').addEventListener('click', closePanel);
  $('#searchBtn').addEventListener('click', function(){ openPanel('all', null); });
  panel.addEventListener('click', function(e){
    if(e.target === panel) { closePanel(); return; }
    var chip = e.target.closest('.chip');
    if(chip){
      panelTag = (panelTag === chip.dataset.tag) ? null : chip.dataset.tag;
      renderPanel();
      return;
    }
    var row = e.target.closest('.res');
    if(row){
      var i = slugIndex(row.dataset.slug);
      closePanel();
      if(i >= 0) openPost(i);
    }
  });

  /* ============================================================
     移动端菜单
     ============================================================ */
  var menuBtn = $('#menuBtn'), menuSheet = $('#menuSheet');
  function closeMenu(){ menuSheet.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function(e){
    e.stopPropagation();
    menuSheet.hidden = !menuSheet.hidden;
    menuBtn.setAttribute('aria-expanded', String(!menuSheet.hidden));
    bindHover(menuSheet);
  });
  menuSheet.addEventListener('click', function(e){
    if(e.target.closest('a')) closeMenu();
  });
  $('#menuSearch').addEventListener('click', function(){ closeMenu(); openPanel('all', null); });
  document.addEventListener('click', function(e){
    if(!menuSheet.hidden && !menuSheet.contains(e.target)) closeMenu();
  });

  /* ============================================================
     标签 / 复制邮箱 / 归档入口（统一走事件委托）
     ============================================================ */
  function setFragFilter(tag, scroll){
    fragFilter = tag;
    shownFrag = PAGE.frags;
    renderFragments();
    afterRender($('#fragList'));
    if(scroll){
      var sec = $('#fragments');
      if(sec) sec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  }

  document.addEventListener('click', function(e){
    var nav = e.target.closest('[data-navpanel]');
    if(nav){ e.preventDefault(); closeMenu(); openPanel('archive'); setHash('archive'); return; }

    var todo = e.target.closest('[data-todo]');
    if(todo){ e.preventDefault(); toast(todo.dataset.todo || '这个链接还没填，改 content/site.json'); return; }

    var copy = e.target.closest('[data-copy]');
    if(copy){
      e.preventDefault();
      var text = copy.dataset.copy;
      var done = function(){ toast('邮箱已复制：' + text); };
      if(navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
      else done();
      return;
    }

    var tagEl = e.target.closest('[data-tag]');
    if(!tagEl) return;
    var tag = tagEl.dataset.tag;
    if(tagEl.closest('#reader')){ closePost(); openPanel('all', tag); return; }
    setFragFilter(fragFilter === tag ? null : tag, true);
  });
  $('#fragChip').addEventListener('click', function(){ setFragFilter(null, false); });

  /* ============================================================
     真实天气（Open-Meteo，无需 API Key；失败就按日期切季节）
     ============================================================ */
  var realTemp = null;
  function weatherFromCode(c){
    if(c === 0 || c === 1 || c === 2) return 'clear';
    if(c === 45 || c === 48) return 'fog';
    if((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'rain';
    return null;
  }
  function pullWeather(){
    state.season = seasonOfDate(new Date());
    if(!window.fetch){ realTemp = null; apply(true); return; }
    var lat = SITE.lat || 30.5928, lon = SITE.lon || 114.3055;
    toast('正在取' + (SITE.city || '本地') + '的实况天气…');
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,weather_code', { cache: 'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function(d){
        var c = d && d.current;
        if(!c || typeof c.temperature_2m !== 'number') throw new Error('payload');
        var w = weatherFromCode(c.weather_code);
        if(w) state.weather = w;
        realTemp = Math.round(c.temperature_2m);
        apply(true);
        toast('已切到实况：' + WEATHER[state.weather].cn + ' ' + realTemp + '℃');
      })
      .catch(function(){
        realTemp = null;
        apply(true);
        toast('取不到天气，先按日期切季节');
      });
  }

  /* ============================================================
     提示条
     ============================================================ */
  var toastEl = null, toastTimer = 0;
  function toast(msg){
    if(!toastEl){
      toastEl = document.createElement('div');
      toastEl.className = 'toast glass';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('on'); }, 2800);
  }

  /* ============================================================
     路由：#post/<slug> · #archive · #search
     ============================================================ */
  function route(){
    var h = location.hash.replace(/^#/, '');
    if(h.indexOf('post/') === 0){
      var i = slugIndex(decodeURIComponent(h.slice(5)));
      if(i >= 0 && i !== curIdx) openPost(i, true);
      return;
    }
    if(h === 'archive'){ openPanel('archive'); return; }
    if(h === 'search'){ openPanel('all', null); return; }
    if(h.indexOf('tag/') === 0){ openPanel('all', decodeURIComponent(h.slice(4))); }
  }

  /* ============================================================
     键盘
     ============================================================ */
  document.addEventListener('keydown', function(e){
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
    if(e.key === 'Escape'){
      if(!panel.classList.contains('on') && !reader.classList.contains('on')){ climate.classList.remove('open'); closeMenu(); }
      closePanel(); closePost(); climate.classList.remove('open');
      return;
    }
    if(typing) return;
    if(e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')){
      e.preventDefault(); openPanel('all', null); return;
    }
    if(reader.classList.contains('on') && curIdx >= 0){
      if(e.key === 'ArrowLeft'){ openPost(curIdx + 1); e.preventDefault(); }
      if(e.key === 'ArrowRight'){ openPost(curIdx - 1); e.preventDefault(); }
    }
  });

  /* ============================================================
     启动
     ============================================================ */
  renderPosts();
  renderGallery();
  renderFragments();
  renderAbout();
  renderStats();
  afterRender(document);

  sizeCanvas();
  sizeFilters();
  initFilm();
  initWet();
  root.setAttribute('data-fx', (fine && !reduced && window.innerWidth > 820) ? 'full' : 'low');
  apply(false);
  requestAnimationFrame(frame);

  var rt;
  window.addEventListener('resize', function(){
    clearTimeout(rt);
    rt = setTimeout(function(){ sizeCanvas(); sizeFilters(); buildWeather(); }, 180);
  });

  if(window.__MISTY_POST__){
    var deep = slugIndex(window.__MISTY_POST__);
    if(deep >= 0) openPost(deep, true);
  } else {
    route();
  }
  window.addEventListener('hashchange', route);
  if(!CONTENT) console.warn('[雾屿] 没找到 assets/content.js，先跑 node build.mjs');
})();
