/* ═══════════════════════════════════════════════════════════
   THE HELD ORB — desktop only.
   Studied live from thoughtlab.com: a dark glass sphere held in the
   void while the page passes around it. The body is black; every
   photon lives on the rim — iridescence at the edge, never the fill.
   Ours travels: held low in the hero, then passed down the page,
   drifting side to side as each section arrives to meet it.
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (!matchMedia('(min-width: 1000px)').matches) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden','true');
  cv.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none';
  document.body.insertBefore(cv, document.body.firstChild);
  var g = cv.getContext('2d');

  /* content rides above the orb */
  [].forEach.call(document.querySelectorAll('.wrap, .hero, nav.nav, footer'), function(el){
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.zIndex === 'auto') el.style.zIndex = '1';
  });

  var W, H, DPR;
  function fit(){
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  fit();
  addEventListener('resize', function(){ fit(); draw(); }, {passive:true});

  /* the wobble — three slow sines; the surface is alive, never busy */
  var seeds = [[3, .050, .00016], [5, .028, -.00011], [7, .014, .00007]];
  function radius(base, a, t){
    var r = base;
    for (var i = 0; i < seeds.length; i++)
      r += base * seeds[i][1] * Math.sin(seeds[i][0] * a + t * seeds[i][2] * 1000);
    return r;
  }

  /* the journey — held in the hero, then passed down the page */
  var px = 0.5, py = 0.62, ps = 1;      /* current (lerped) */
  function targets(){
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - H);
    var p = Math.min(1, Math.max(0, scrollY / max));
    return {
      x: 0.5 + 0.27 * Math.sin(p * Math.PI * 3),
      y: 0.62 - 0.14 * p,
      s: 1 - 0.52 * p,
      p: p
    };
  }

  function draw(t){
    t = t || 0;
    var tg = targets();
    var k = RM ? 1 : 0.055;
    px += (tg.x - px) * k; py += (tg.y - py) * k; ps += (tg.s - ps) * k;

    g.clearRect(0, 0, W, H);
    var cx = px * W, cy = py * H;
    var R = Math.min(W, H) * 0.335 * ps;

    /* the body — void made solid: barely lighter than the page */
    var body = g.createRadialGradient(cx - R*0.25, cy - R*0.35, R*0.1, cx, cy, R);
    body.addColorStop(0, '#101014');
    body.addColorStop(0.55, '#0a0a0d');
    body.addColorStop(1, '#050506');
    g.beginPath();
    for (var a = 0; a <= Math.PI * 2 + 0.02; a += Math.PI / 90){
      var r = radius(R, a, t);
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = body;
    g.fill();

    /* the rim — iridescence lives only on the edge. Segments, each with
       its own hue: crimson through violet and blue, amber at the crown. */
    var SEG = 120;
    for (var i = 0; i < SEG; i++){
      var a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1.35) / SEG) * Math.PI * 2;
      var hue = 330 + 80 * Math.sin(a0 * 1.5 + t * 0.00025 * 1000)
                    - 90 * Math.sin(a0 * 0.5 - t * 0.00013 * 1000);
      var lift = Math.max(0, -Math.sin(a0));            /* the crown */
      var alpha = 0.16 + 0.5 * Math.pow(Math.abs(Math.sin(a0 * 2 + t * 0.0002 * 1000)), 3)
                       + 0.28 * lift;
      g.beginPath();
      var r0 = radius(R, a0, t), r1 = radius(R, a1, t);
      g.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
      g.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
      g.strokeStyle = 'hsla(' + hue + ',88%,' + (58 + 16 * lift) + '%,' + alpha.toFixed(3) + ')';
      g.lineWidth = 1.6 + 1.7 * lift;
      g.stroke();
    }

    /* one crown sheen — white light landing from above, softly */
    g.save();
    g.beginPath();
    for (var a2 = Math.PI * 1.12; a2 <= Math.PI * 1.88; a2 += Math.PI / 90){
      var rr = radius(R, a2, t) - 0.6;
      var xx = cx + Math.cos(a2) * rr, yy = cy + Math.sin(a2) * rr;
      if (a2 === Math.PI * 1.12) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.strokeStyle = 'rgba(255,250,244,.34)';
    g.lineWidth = 1.1;
    g.shadowColor = 'rgba(255,240,220,.5)';
    g.shadowBlur = 14;
    g.stroke();
    g.restore();
  }

  /* static first — the orb must exist even where rAF never runs */
  draw(0);
  if (RM) return;

  var running = true, raf = 0;
  document.addEventListener('visibilitychange', function(){
    running = !document.hidden;
    if (running && !raf) raf = requestAnimationFrame(loop);
  });
  function loop(ts){
    if (!running){ raf = 0; return; }
    draw(ts);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
})();
