/* Semble — shared behaviour. Small on purpose. */
(function(){
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reveal(){
    var rv = [].slice.call(document.querySelectorAll('.rv'));
    if(!rv.length) return;
    if(RM || !('IntersectionObserver' in window)){
      rv.forEach(function(n){ n.classList.add('seen') }); return;
    }
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('seen'); io.unobserve(e.target); } });
    },{threshold:.1,rootMargin:'0px 0px -6% 0px'});
    rv.forEach(function(n){
      if(n.getBoundingClientRect().top < innerHeight) n.classList.add('seen');
      else io.observe(n);
    });
  }

  /* run a callback the first time an element is seen — with a timer fallback,
     because a reveal that never fires is worse than one that fires early */
  function onceVisible(el, fn){
    if(!el) return;
    var fired = false;
    var run = function(){ if(fired) return; fired = true; fn(); };
    if(RM){ run(); return; }
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting){ io.disconnect(); run(); } });
      },{threshold:.35});
      io.observe(el);
    }
    var check = function(){
      var r = el.getBoundingClientRect();
      if(r.top < innerHeight*0.8 && r.bottom > 0) run();
    };
    addEventListener('scroll', check, {passive:true});
    setTimeout(check, 600);
  }

  /* animate only while on screen — .rest pauses whatever is running inside */
  function whileVisible(el){
    if(!el || RM || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function(es){
      es.forEach(function(e){ el.classList.toggle('rest', !e.isIntersecting) });
    },{threshold:0}).observe(el);
  }

  document.addEventListener('DOMContentLoaded', reveal);
  if(document.readyState !== 'loading') reveal();
  window.SEMBLE = { onceVisible:onceVisible, whileVisible:whileVisible, reveal:reveal, reducedMotion:RM };
})();

/* ── THE CROSSING ── arm the paths with their true length, then fire once. */
(function(){
  function arm(el){
    [].forEach.call(el.querySelectorAll('.cx'), function(p){
      var L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
    });
  }
  window.SEMBLE = window.SEMBLE || {};
  /* Land the end state no matter what. A CSS animation can sit frozen at
     progress 0 in a throttled or non-compositing context, and a frozen animation
     BEATS inline style — so the guarantee has to remove the animation first,
     then write the final values. If the draw ran normally this is a silent no-op
     at a moment the animation has already finished. */
  function land(el, done){
    [].forEach.call(el.querySelectorAll('.cx'), function(p){
      p.style.animation = 'none'; p.style.strokeDashoffset = '0';
    });
    var core = el.querySelector('.cxc');
    if(core){ core.style.animation = 'none'; core.style.opacity = '1';
              core.style.transform = 'scale(1)'; }
    var halo = el.querySelector('.cxh');
    if(halo){ halo.style.animation = 'none'; halo.style.opacity = '0'; }
    if(typeof done === 'function') done();
  }

  window.SEMBLE.cross = function(el, done){
    if(!el || el.classList.contains('on')) return;
    arm(el);
    void el.offsetWidth;            /* commit the start state before animating */
    el.classList.add('on');
    setTimeout(function(){ land(el, done); }, 1900);
  };
  window.SEMBLE.armCrosses = function(root){
    [].forEach.call((root||document).querySelectorAll('.cross'), arm);
  };
  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function(){ window.SEMBLE.armCrosses(); });
  else window.SEMBLE.armCrosses();
})();
