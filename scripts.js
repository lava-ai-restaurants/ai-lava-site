/* ═══════════════════════════════════════════════════════
   LAVA — Shared Scripts
   ═══════════════════════════════════════════════════════ */

// ── Page Transition ──
(function(){
  const overlay=document.querySelector('.page-transition');
  if(!overlay)return;
  // On page load, wipe exit
  overlay.classList.add('wipe-exit');
  overlay.addEventListener('animationend',function handler(){
    overlay.classList.remove('wipe-exit');
    overlay.removeEventListener('animationend',handler);
  });
  // Intercept internal links
  document.addEventListener('click',function(e){
    const a=e.target.closest('a');
    if(!a)return;
    const href=a.getAttribute('href');
    if(!href)return;
    // Skip external, anchors-only, mailto, tel
    if(href.startsWith('http')||href.startsWith('mailto:')||href.startsWith('tel:')||href==='#')return;
    // If it's a hash link on the same page
    if(href.startsWith('#'))return;
    // If it has a hash but different page
    const isInternal=href.endsWith('.html')||href.includes('.html#')||href==='index.html';
    if(!isInternal)return;
    e.preventDefault();
    overlay.classList.add('wipe-enter');
    setTimeout(()=>{window.location.href=href},420);
  });
})();

// ── Lava Canvas Embers ──
const lavaCanvas=document.getElementById('lavaCanvas');
if(lavaCanvas){
  const ctx=lavaCanvas.getContext('2d');
  let W,H;
  function resizeCanvas(){W=lavaCanvas.width=window.innerWidth;H=lavaCanvas.height=window.innerHeight}
  resizeCanvas();
  window.addEventListener('resize',resizeCanvas);
  const embers=[];
  for(let i=0;i<80;i++){
    embers.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:-(Math.random()*.5+.2),size:Math.random()*3+1,life:Math.random(),decay:Math.random()*.003+.001,color:Math.random()>.5?'220,38,38':'245,158,11'});
  }
  function animateEmbers(){
    ctx.clearRect(0,0,W,H);
    embers.forEach(e=>{
      e.x+=e.vx+Math.sin(e.life*10)*.2;e.y+=e.vy;e.life-=e.decay;
      if(e.life<=0||e.y<-10){e.x=Math.random()*W;e.y=H+10;e.life=1}
      ctx.beginPath();ctx.arc(e.x,e.y,e.size*e.life,0,Math.PI*2);
      ctx.fillStyle=`rgba(${e.color},${e.life*.15})`;ctx.fill();
      ctx.beginPath();ctx.arc(e.x,e.y,e.size*e.life*3,0,Math.PI*2);
      ctx.fillStyle=`rgba(${e.color},${e.life*.03})`;ctx.fill();
    });
    requestAnimationFrame(animateEmbers);
  }
  animateEmbers();
}

// ── Hero Letter Animation ──
const heroTitle=document.getElementById('heroTitle');
if(heroTitle){
  const glitchSpan=heroTitle.querySelector('.glitch-text');
  if(glitchSpan){
    const text=glitchSpan.textContent;
    glitchSpan.innerHTML='';
    [...text].forEach((char,i)=>{
      const span=document.createElement('span');
      span.className='hero-letter';
      span.style.animationDelay=(.3+i*.15)+'s';
      span.textContent=char;
      glitchSpan.appendChild(span);
    });
  }
}

// ── Word Reveal ──
document.querySelectorAll('.word-reveal').forEach(el=>{
  const text=el.textContent;
  el.innerHTML=text.split(' ').map(w=>`<span class="word">${w}</span>`).join(' ');
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('visible');
        e.target.querySelectorAll('.word').forEach((w,i)=>{w.style.transitionDelay=(i*.04)+'s'});
        obs.unobserve(e.target);
      }
    });
  },{threshold:.3});
  obs.observe(el);
});

// ── Particles ──
const particleContainer=document.getElementById('particles');
if(particleContainer){
  for(let i=0;i<30;i++){
    const p=document.createElement('div');p.className='particle';
    p.style.left=Math.random()*100+'%';p.style.top=Math.random()*100+'%';
    p.style.animationDuration=(8+Math.random()*12)+'s';p.style.animationDelay=Math.random()*8+'s';
    p.style.width=p.style.height=(1+Math.random()*3)+'px';
    p.style.background=Math.random()>.5?'rgba(220,38,38,.4)':'rgba(245,158,11,.3)';
    particleContainer.appendChild(p);
  }
}

// ── Nav Scroll ──
const nav=document.getElementById('nav');
if(nav)window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',window.scrollY>50));

// ── Hamburger ──
const hamburger=document.getElementById('hamburger'),mobileMenu=document.getElementById('mobileMenu');
if(hamburger&&mobileMenu){
  hamburger.addEventListener('click',()=>{hamburger.classList.toggle('active');mobileMenu.classList.toggle('open')});
}
function closeMenu(){
  if(hamburger)hamburger.classList.remove('active');
  if(mobileMenu)mobileMenu.classList.remove('open');
}
window.closeMenu=closeMenu;

// ── Reveal Observer ──
const revealObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObs.unobserve(e.target)}});
},{threshold:.1,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.reveal').forEach(el=>revealObs.observe(el));

// ── Pain Cards Stagger ──
const painCards=document.getElementById('painCards');
if(painCards){
  const painObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.querySelectorAll('.pain-card').forEach((c,i)=>setTimeout(()=>c.classList.add('visible'),i*150));
        painObs.unobserve(e.target);
      }
    });
  },{threshold:.2});
  painObs.observe(painCards);
}

// ── Dashboard Chart Animation ──
const chartSection=document.getElementById('chartSection');
if(chartSection){
  const chartObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.querySelectorAll('.bar-fill').forEach((b,i)=>setTimeout(()=>b.classList.add('animated'),i*200));
        chartObs.unobserve(e.target);
      }
    });
  },{threshold:.3});
  chartObs.observe(chartSection);
}

// ── Dashboard KPI Counter ──
function animateKPI(id,start,end,prefix,suffix,decimals){
  const el=document.getElementById(id);if(!el)return;
  const duration=1500,steps=60;let step=0;
  const timer=setInterval(()=>{
    step++;const progress=step/steps;const eased=1-Math.pow(1-progress,3);
    const current=start+(end-start)*eased;
    el.textContent=prefix+(decimals?current.toFixed(decimals):Math.round(current).toLocaleString())+suffix;
    if(step>=steps)clearInterval(timer);
  },duration/steps);
}
const dashboardBody=document.getElementById('dashboardBody');
if(dashboardBody){
  const kpiTargets={sales:39210,guests:647,labor:26.8,check:60.60};
  const dashObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        animateKPI('kpi-sales',0,kpiTargets.sales,'$','',0);
        animateKPI('kpi-guests',0,kpiTargets.guests,'','',0);
        animateKPI('kpi-labor',0,kpiTargets.labor,'','%',1);
        animateKPI('kpi-check',0,kpiTargets.check,'$','',2);
        dashObs.unobserve(e.target);
      }
    });
  },{threshold:.3});
  dashObs.observe(dashboardBody);
}

// ── Dashboard Tabs ──
document.querySelectorAll('.dashboard-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    const tabName=tab.dataset.tab;
    document.querySelectorAll('.dashboard-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.dashboard-tab-content').forEach(c=>c.classList.remove('active'));
    const target=document.getElementById('tab-'+tabName);
    if(target)target.classList.add('active');
  });
});

// ── Terminal Typing ──
const terminalLines=[
  {prompt:'lava',cmd:' scan --location "all" --date yesterday',delay:0},
  {text:'Connecting to Toast POS... ',cls:'cmd',delay:800},
  {text:'✓ Sales data pulled (3 locations)',cls:'success',delay:1500},
  {text:'Connecting to 7shifts... ',cls:'cmd',delay:2200},
  {text:'✓ Labor data: 847 hours, $14,209 wages',cls:'success',delay:2900},
  {text:'Scanning R365 manager logs... ',cls:'cmd',delay:3500},
  {text:'✓ 12 entries found (Cala: 5, Americano: 5, Neon Spur: 2)',cls:'success',delay:4200},
  {text:'Analyzing OpenTable reviews... ',cls:'cmd',delay:4800},
  {text:'✓ 8 new reviews — 2 require attention',cls:'warning',delay:5500},
  {text:'⚡ ALERT: BOH overtime trending 12% above target at Location B',cls:'error',delay:6200},
  {text:'Generating daily intelligence reports...',cls:'cmd',delay:7000},
  {text:'✓ 5 emails sent to leadership team at 5:00 AM',cls:'success',delay:7800},
  {text:'✓ All locations reporting. Zero data gaps.',cls:'data',delay:8500},
];
let terminalStarted=false;
const terminalEl=document.getElementById('terminal');
if(terminalEl){
  const termObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting&&!terminalStarted){
        terminalStarted=true;
        const body=document.getElementById('terminalBody');
        terminalLines.forEach((line,i)=>{
          setTimeout(()=>{
            const div=document.createElement('div');div.className='terminal-line';
            if(line.prompt){div.innerHTML=`<span class="prompt">${line.prompt} $</span><span class="cmd">${line.cmd}</span>`}
            else{div.innerHTML=`<span class="${line.cls}">${line.text}</span>`}
            body.appendChild(div);body.scrollTop=body.scrollHeight;
            if(i===terminalLines.length-1){
              setTimeout(()=>{const c=document.createElement('span');c.className='cursor-blink';body.appendChild(c)},300);
            }
          },line.delay);
        });
        termObs.unobserve(e.target);
      }
    });
  },{threshold:.3});
  termObs.observe(terminalEl);
}

// ── ROI Calculator ──
const revenueSlider=document.getElementById('revenueSlider');
const locationSlider=document.getElementById('locationSlider');
if(revenueSlider&&locationSlider){
  function updateCalc(){
    const rev=parseInt(revenueSlider.value),locs=parseInt(locationSlider.value);
    document.getElementById('revenueDisplay').textContent='$'+rev.toLocaleString();
    document.getElementById('locationDisplay').textContent=locs;
    const annualRev=rev*12*locs;
    const savings=Math.round(annualRev*.035);
    const uplift=Math.round(annualRev*.01);
    const lavaCost=locs*3000*12;
    const roi=((savings+uplift)/lavaCost).toFixed(1);
    document.getElementById('savingsDisplay').textContent='$'+savings.toLocaleString();
    document.getElementById('revenueUplift').textContent='$'+uplift.toLocaleString();
    document.getElementById('roiDisplay').textContent=roi+'x';
  }
  revenueSlider.addEventListener('input',updateCalc);
  locationSlider.addEventListener('input',updateCalc);
  updateCalc();
}

// ── Stat Counters ──
const statObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const el=e.target;const target=parseInt(el.dataset.target);const suffix=el.dataset.suffix||'';
      if(target===0){el.textContent='0'+suffix;statObs.unobserve(el);return}
      let current=0;const inc=Math.max(1,Math.floor(target/25));
      const timer=setInterval(()=>{current+=inc;if(current>=target){current=target;clearInterval(timer)}el.textContent=current+suffix},40);
      statObs.unobserve(el);
    }
  });
},{threshold:.5});
document.querySelectorAll('.stat-number').forEach(el=>statObs.observe(el));

// ── Scroll Progress ──
const scrollProgress=document.createElement('div');
scrollProgress.className='scroll-progress';
document.body.prepend(scrollProgress);
window.addEventListener('scroll',()=>{
  const h=document.documentElement.scrollHeight-window.innerHeight;
  if(h>0)scrollProgress.style.width=(window.scrollY/h*100)+'%';
});

// ── Mouse Glow ──
const mouseGlow=document.createElement('div');
mouseGlow.className='mouse-glow';
document.body.appendChild(mouseGlow);
document.addEventListener('mousemove',e=>{mouseGlow.style.left=e.clientX+'px';mouseGlow.style.top=e.clientY+'px'});

// ── Video Play Overlay ──
const videoOverlay=document.getElementById('videoOverlay');
const showcaseVideo=document.getElementById('showcaseVideo');
if(videoOverlay&&showcaseVideo){
  videoOverlay.addEventListener('click',()=>{videoOverlay.classList.add('hidden');showcaseVideo.play()});
  showcaseVideo.addEventListener('pause',()=>{if(showcaseVideo.currentTime>0&&!showcaseVideo.ended)videoOverlay.classList.remove('hidden')});
  showcaseVideo.addEventListener('ended',()=>videoOverlay.classList.remove('hidden'));
}

// ── Magnetic Buttons ──
document.querySelectorAll('.btn-primary,.btn-outline').forEach(btn=>{
  btn.classList.add('btn-magnetic');
  btn.addEventListener('mousemove',e=>{
    const rect=btn.getBoundingClientRect();
    const x=(e.clientX-rect.left-rect.width/2)*.15;
    const y=(e.clientY-rect.top-rect.height/2)*.15;
    btn.style.transform=`translate(${x}px,${y}px)`;
  });
  btn.addEventListener('mouseleave',()=>{btn.style.transform=''});
});

// ── Parallax Hero ──
window.addEventListener('scroll',()=>{
  const hero=document.querySelector('.hero-content');
  if(hero&&window.scrollY<window.innerHeight){
    hero.style.transform=`translateY(${window.scrollY*.3}px)`;
    hero.style.opacity=1-window.scrollY/(window.innerHeight*.8);
  }
});

// ── Ticker Duplicate ──
const ticker=document.getElementById('ticker');
if(ticker)ticker.innerHTML+=ticker.innerHTML;

// ── Wipe-in / Scale-in ──
document.querySelectorAll('.wipe-in,.scale-in').forEach(el=>{
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}});
  },{threshold:.15});
  obs.observe(el);
});

// ── Custom Cursor with Lerp ──
const cursorDot=document.getElementById('cursorDot');
const cursorRing=document.getElementById('cursorRing');
if(cursorDot&&cursorRing&&window.innerWidth>768){
  let mx=0,my=0,rx=0,ry=0;
  cursorDot.classList.add('active');
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
  function animCursor(){
    rx+=(mx-rx)*.12;ry+=(my-ry)*.12;
    cursorDot.style.transform=`translate(${mx-4}px,${my-4}px)`;
    cursorRing.style.transform=`translate(${rx-20}px,${ry-20}px)`;
    requestAnimationFrame(animCursor);
  }
  animCursor();
  document.querySelectorAll('a,.btn,button,.service-card,.price-card,.scenario-card,.case-card,.testimonial-card').forEach(el=>{
    el.addEventListener('mouseenter',()=>cursorRing.classList.add('hover'));
    el.addEventListener('mouseleave',()=>cursorRing.classList.remove('hover'));
  });
}

// ── 3D Tilt on Cards ──
document.querySelectorAll('.service-card,.price-card,.scenario-card,.testimonial-card').forEach(card=>{
  card.classList.add('tilt-card');
  card.addEventListener('mousemove',e=>{
    const rect=card.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width-.5;
    const y=(e.clientY-rect.top)/rect.height-.5;
    card.style.transform=`perspective(1000px) rotateY(${x*8}deg) rotateX(${-y*8}deg) scale(1.02)`;
  });
  card.addEventListener('mouseleave',()=>{card.style.transform='perspective(1000px) rotateX(0) rotateY(0) scale(1)'});
});

// ── Stagger Animation for Grids ──
const staggerObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.querySelectorAll('.service-card,.scenario-card,.testimonial-card,.price-card').forEach((item,i)=>{
        item.classList.add('stagger-item');
        setTimeout(()=>item.classList.add('visible'),i*100);
      });
      staggerObs.unobserve(e.target);
    }
  });
},{threshold:.1});
document.querySelectorAll('.services-grid,.scenario-grid,.testimonial-grid,.pricing-grid').forEach(g=>staggerObs.observe(g));

// ── Highlight Text on Scroll ──
document.querySelectorAll('.reality-text .accent,.philosophy-quote blockquote,.impact').forEach(el=>{
  el.classList.add('highlight-text');
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}});
  },{threshold:.5});
  obs.observe(el);
});

// ── Hero Proof Counter ──
document.querySelectorAll('.hero-proof-item .num').forEach(el=>{
  const text=el.textContent;const match=text.match(/(\d+)/);
  if(match){
    const target=parseInt(match[1]);const suffix=text.replace(match[1],'');
    el.textContent='0'+suffix;
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          let start=0;const dur=1200;const startTime=performance.now();
          function step(now){
            const progress=Math.min((now-startTime)/dur,1);
            const eased=1-Math.pow(1-progress,4);
            el.textContent=Math.round(target*eased)+suffix;
            if(progress<1)requestAnimationFrame(step);
          }
          requestAnimationFrame(step);obs.unobserve(e.target);
        }
      });
    },{threshold:.5});
    obs.observe(el);
  }
});

// ── Service Card Expand/Collapse ──
document.querySelectorAll('.service-card[data-expandable]').forEach(card=>{
  card.addEventListener('click',()=>{
    const wasExpanded=card.classList.contains('expanded');
    // Close all others
    document.querySelectorAll('.service-card.expanded').forEach(c=>c.classList.remove('expanded'));
    if(!wasExpanded)card.classList.add('expanded');
  });
});
