/* ═══════════════════════════════════════════════════════════
   THE HELD ORB v3 — a window into the backend.
   Beneath every page lies a generated circuit world — processors,
   GPU arrays, RAM banks, buses, vias — cyan on deep navy, visible
   ONLY through the orb. Where the orb rests, the chips beneath it
   are watered: they charge cell by cell, glow, and hold their light
   a while after it moves on.
   Shader pipeline is the thoughtlab port (raymarched smin pair ·
   perturbed normals · dual fresnel · cubemap rim · RGB-split
   refraction). Motion calmed: slower time, shorter reach, deeper lag.
   API: SembleOrb.setImage(urlOrFile) · clearImage() · state()
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (!matchMedia('(min-width: 1000px)').matches) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var C = {
    displacementSpeed: 0.21,          /* was .315 — steadier surface   */
    sizeDefault: 0.275,
    lerp1: 0.032, lerp2: 0.05,        /* deeper viscous lag            */
    scrollLerp1: 0.12, scrollLerp2: 0.09,
    reach: 0.5,                       /* how far the mouse can pull it */
    sideDrift: 0.2, yClamp: 0.3
  };

  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden','true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
  document.body.insertBefore(cv, document.body.firstChild);
  var gl = cv.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:false});
  if (!gl) return;

  [].forEach.call(document.querySelectorAll('.wrap, .hero, nav.nav, footer, .app, .tabs, .cc'), function(el){
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.zIndex === 'auto') el.style.zIndex = '1';
  });

  /* ════════ THE CIRCUIT WORLD ════════ */
  var base = document.createElement('canvas');
  var work = document.createElement('canvas');
  var bctx = base.getContext('2d'), wctx = work.getContext('2d');
  var CW = 0, CH = 0, chips = [], vias = [];

  function rnd(seed){ var s = seed; return function(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function drawChip(g2, c, e, t){
    var x = c.x, y = c.y, w = c.w, h = c.h;
    var pulse = e > 0.02 ? e * (0.75 + 0.25 * Math.sin(t * 1.7 + c.phase)) : 0;

    if (pulse > 0.03){
      g2.save();
      g2.shadowColor = 'rgba(92,225,255,' + (0.85 * pulse).toFixed(3) + ')';
      g2.shadowBlur = 22 * pulse;
      g2.fillStyle = 'rgba(10,26,40,1)';
      g2.fillRect(x, y, w, h);
      g2.restore();
    }
    g2.fillStyle = pulse > 0.03 ? 'rgba(13,32,50,1)' : '#0a1420';
    g2.fillRect(x, y, w, h);
    g2.strokeStyle = 'rgba(92,225,255,' + (0.16 + 0.7 * pulse).toFixed(3) + ')';
    g2.lineWidth = 1;
    g2.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    g2.fillStyle = 'rgba(70,140,190,' + (0.35 + 0.45 * pulse).toFixed(3) + ')';
    var px2;
    if (c.kind !== 'ram'){
      for (px2 = x + 6; px2 < x + w - 4; px2 += 7){
        g2.fillRect(px2, y - 3, 2, 3); g2.fillRect(px2, y + h, 2, 3);
      }
      for (var py2 = y + 6; py2 < y + h - 4; py2 += 7){
        g2.fillRect(x - 3, py2, 3, 2); g2.fillRect(x + w, py2, 3, 2);
      }
    } else {
      for (px2 = x + 3; px2 < x + w - 2; px2 += 5) g2.fillRect(px2, y + h, 1.5, 2.5);
    }

    /* the die — growth is visible: cells charge one by one */
    var m = 5, gx0 = x + m, gy0 = y + m, gw = w - m * 2, gh = h - m * 2;
    var n = c.grid, cw2 = gw / n;
    var rows = c.kind === 'ram' ? 1 : n;
    var chh = gh / rows;
    var total = n * rows, lit = Math.ceil(total * Math.min(1, e * 1.25));
    var k = 0;
    for (var ry = 0; ry < rows; ry++){
      for (var rx = 0; rx < n; rx++){
        var on = k < lit && pulse > 0.02;
        var cp = on ? (0.5 + 0.5 * Math.sin(t * 2.3 + c.phase + k * 0.7)) * pulse : 0;
        g2.fillStyle = on
          ? 'rgba(' + Math.round(60 + 140 * cp) + ',' + Math.round(160 + 65 * cp) + ',255,' + (0.35 + 0.6 * cp).toFixed(3) + ')'
          : 'rgba(30,70,105,0.5)';
        g2.fillRect(gx0 + rx * cw2 + 1, gy0 + ry * chh + 1, Math.max(1, cw2 - 2), Math.max(1, chh - 2));
        k++;
      }
    }
  }

  function buildWorld(w, h){
    CW = Math.round(w / 2); CH = Math.round(h / 2);
    base.width = work.width = CW; base.height = work.height = CH;
    var R = rnd(20260818);
    chips = []; vias = [];

    bctx.fillStyle = '#04070d';
    bctx.fillRect(0, 0, CW, CH);
    bctx.fillStyle = 'rgba(80,140,190,0.05)';
    for (var gy = 8; gy < CH; gy += 16)
      for (var gx = 8; gx < CW; gx += 16)
        bctx.fillRect(gx, gy, 1, 1);

    function place(w2, h2){
      for (var tries = 0; tries < 40; tries++){
        var x = 12 + R() * (CW - w2 - 24), y = 12 + R() * (CH - h2 - 24);
        var ok = true;
        for (var i2 = 0; i2 < chips.length; i2++){
          var c = chips[i2];
          if (x < c.x + c.w + 14 && x + w2 + 14 > c.x && y < c.y + c.h + 14 && y + h2 + 14 > c.y){ ok = false; break; }
        }
        if (ok) return {x: Math.round(x), y: Math.round(y)};
      }
      return null;
    }
    function addChip(kind, w2, h2, grid){
      var p = place(w2, h2); if (!p) return;
      chips.push({kind: kind, x: p.x, y: p.y, w: w2, h: h2, grid: grid, e: 0, phase: R() * 6.28});
    }
    var i;
    for (i = 0; i < 3; i++) addChip('cpu', 54 + Math.round(R() * 18), 54 + Math.round(R() * 18), 4 + Math.round(R() * 2));
    for (i = 0; i < 2; i++) addChip('gpu', 88 + Math.round(R() * 22), 50 + Math.round(R() * 10), 8);
    for (i = 0; i < 4; i++) addChip('ram', 64, 22, 6);
    for (i = 0; i < 6; i++) addChip('ctl', 20 + Math.round(R() * 10), 14 + Math.round(R() * 8), 2);

    bctx.lineWidth = 1;
    for (i = 0; i < 46; i++){
      var a = chips[Math.floor(R() * chips.length)], b = chips[Math.floor(R() * chips.length)];
      if (!a || !b || a === b) continue;
      var ax = a.x + a.w / 2 + (R() - 0.5) * a.w * 0.6, ay = a.y + a.h / 2;
      var bx2 = b.x + b.w / 2, by = b.y + b.h / 2 + (R() - 0.5) * b.h * 0.6;
      bctx.strokeStyle = R() > 0.65 ? 'rgba(40,120,170,0.5)' : 'rgba(22,70,105,0.45)';
      bctx.beginPath();
      bctx.moveTo(ax, ay); bctx.lineTo(ax, by); bctx.lineTo(bx2, by);
      bctx.stroke();
      vias.push({x: ax, y: by});
      if (R() > 0.5) vias.push({x: bx2, y: by});
    }
    bctx.fillStyle = 'rgba(90,190,255,0.55)';
    vias.forEach(function(v){ bctx.beginPath(); bctx.arc(v.x, v.y, 1.6, 0, 6.29); bctx.fill(); });

    chips.forEach(function(c){ drawChip(bctx, c, 0, 0); });
  }

  var worldDirty = true;
  function renderWorld(t){
    wctx.drawImage(base, 0, 0);
    for (var i = 0; i < chips.length; i++){
      if (chips[i].e > 0.02) drawChip(wctx, chips[i], chips[i].e, t);
    }
  }

  /* ════════ SHADERS — the thoughtlab port ════════ */
  var VERT =
  'attribute vec2 aPos;varying vec2 vUv;' +
  'void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';

  var FRAG =
  'precision highp float;\n' +
  'varying vec2 vUv;uniform vec4 uResolution;uniform float uTime;uniform float uOpacity;\n' +
  'uniform vec2 uMouse1;uniform vec2 uMouse2;uniform float uSize;\n' +
  'uniform samplerCube tMap;uniform sampler2D tRender;uniform sampler2D tImage;uniform float uImageOpacity;\n' +
  '#define DISTANCE 2.0\n' +
  'vec3 screenB(vec3 a,vec3 b){return 1.-(1.-a)*(1.-b);}\n' +
  'vec3 sat3(vec3 rgb,float adj){const vec3 W=vec3(0.2125,0.7154,0.0721);return mix(vec3(dot(rgb,W)),rgb,adj);}\n' +
  'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}\n' +
  'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}\n' +
  'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}\n' +
  'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}\n' +
  'vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}\n' +
  'float cnoise(vec3 P){vec3 Pi0=floor(P);vec3 Pi1=Pi0+vec3(1.0);Pi0=mod289(Pi0);Pi1=mod289(Pi1);' +
  'vec3 Pf0=fract(P);vec3 Pf1=Pf0-vec3(1.0);vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);vec4 iy=vec4(Pi0.yy,Pi1.yy);' +
  'vec4 iz0=Pi0.zzzz;vec4 iz1=Pi1.zzzz;vec4 ixy=permute(permute(ix)+iy);vec4 ixy0=permute(ixy+iz0);vec4 ixy1=permute(ixy+iz1);' +
  'vec4 gx0=ixy0*(1.0/7.0);vec4 gy0=fract(floor(gx0)*(1.0/7.0))-0.5;gx0=fract(gx0);' +
  'vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);vec4 sz0=step(gz0,vec4(0.0));gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);' +
  'vec4 gx1=ixy1*(1.0/7.0);vec4 gy1=fract(floor(gx1)*(1.0/7.0))-0.5;gx1=fract(gx1);' +
  'vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);vec4 sz1=step(gz1,vec4(0.0));gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);' +
  'vec3 g000=vec3(gx0.x,gy0.x,gz0.x);vec3 g100=vec3(gx0.y,gy0.y,gz0.y);vec3 g010=vec3(gx0.z,gy0.z,gz0.z);vec3 g110=vec3(gx0.w,gy0.w,gz0.w);' +
  'vec3 g001=vec3(gx1.x,gy1.x,gz1.x);vec3 g101=vec3(gx1.y,gy1.y,gz1.y);vec3 g011=vec3(gx1.z,gy1.z,gz1.z);vec3 g111=vec3(gx1.w,gy1.w,gz1.w);' +
  'vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));' +
  'g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;' +
  'vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));' +
  'g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;' +
  'float n000=dot(g000,Pf0);float n100=dot(g100,vec3(Pf1.x,Pf0.yz));float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));float n110=dot(g110,vec3(Pf1.xy,Pf0.z));' +
  'float n001=dot(g001,vec3(Pf0.xy,Pf1.z));float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));float n011=dot(g011,vec3(Pf0.x,Pf1.yz));float n111=dot(g111,Pf1);' +
  'vec3 fxyz=fade(Pf0);vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fxyz.z);' +
  'vec2 n_yz=mix(n_z.xy,n_z.zw,fxyz.y);return 2.2*mix(n_yz.x,n_yz.y,fxyz.x);}\n' +
  'float sdSphere(vec3 p,float r){return length(p)-r;}\n' +
  'float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}\n' +
  'float sdf(vec3 p){' +
  '  vec3 c1=vec3(uMouse1*uResolution.zw*1.2,0.0);' +
  '  vec3 c2=vec3(uMouse2*uResolution.zw*1.2,0.0);' +
  '  return smin(sdSphere(p-c1,uSize),sdSphere(p-c2,uSize*0.92),0.35);}\n' +
  'vec3 getDisplacedPosition(vec3 p){' +
  '  float t=uTime;' +
  '  vec3 distort=vec3(cnoise(p*2.174+vec3(t*0.5)),cnoise(p*2.174+vec3(t*0.5+13.7)),cnoise(p*2.174+vec3(t*0.5+27.1)))*1.63*0.1;' +
  '  vec3 q=p+distort;' +
  '  float d=cnoise(q*(0.186*10.0)+vec3(t))*0.042*(1.0/0.675);' +
  '  vec3 ctr=vec3(uMouse1*uResolution.zw*1.2,0.0);' +
  '  return p+normalize(p-ctr+vec3(0.0,0.0,0.0001))*d*3.0;}\n' +
  'float sdfD(vec3 p){return sdf(getDisplacedPosition(p));}\n' +
  'vec3 calcNormal(vec3 p){float e=0.002;' +
  'float dx=sdfD(p+vec3(e,0.0,0.0))-sdfD(p-vec3(e,0.0,0.0));' +
  'float dy=sdfD(p+vec3(0.0,e,0.0))-sdfD(p-vec3(0.0,e,0.0));' +
  'float dz=sdfD(p+vec3(0.0,0.0,e))-sdfD(p-vec3(0.0,0.0,e));' +
  'return normalize(vec3(dx,dy,dz));}\n' +
  'float mapTo(float v,float a,float b,float c,float d){return c+(v-a)*(d-c)/(b-a);}\n' +
  'void main(){' +
  '  float uGlow=0.005;vec4 finalColor=vec4(0.0);' +
  '  vec3 camPos=vec3(0.0,0.0,DISTANCE);' +
  '  vec3 ray=normalize(vec3((vUv-vec2(0.5))*uResolution.zw,-1.0));' +
  '  float t=0.0;float tMax=2.15;' +
  '  for(int i=0;i<24;++i){vec3 pos=camPos+t*ray;float h=sdfD(pos);if(h<0.001||t>(tMax+uGlow))break;t+=h;}' +
  '  vec2 screenUv=vUv;' +
  '  if(t<tMax){' +
  '    vec3 pos=camPos+t*ray;' +
  '    vec3 vNormal=calcNormal(pos);' +
  '    vec3 nView=normalize(vNormal-vec3(0.0,0.0,1.0)+vec3(0.0001,0.0,0.0));' +
  '    float fres=(-1.4)+(1.0+dot(nView,vNormal))*1.435;' +
  '    float fres2=(-1.4)+(2.0+dot(ray,vNormal))*1.435;' +
  '    fres=pow(max(0.0,fres),1.239);' +
  '    float fresFactor=pow(max(0.0,fres+fres2),1.239);' +
  '    vec3 vFresnelColor=mix(vec3(0.0),vec3(1.0),clamp(pow(max(0.0,fres-0.62),2.0),0.0,1.0));' +
  '    vFresnelColor+=vec3(max((t-2.1)*1.0,0.0));' +
  '    vec3 refr=refract(vec3(0.0,0.0,-2.0),vNormal,0.5);' +
  '    screenUv+=refr.xy*0.03*0.35;' +
  '    vec3 cubeTex=textureCube(tMap,vec3(screenUv*2.0-1.0,0.35)).rgb;' +
  '    vec3 texCube=sat3(cubeTex,5.0);' +
  '    vec3 texCubeFresnel=screenB(mix(vec3(0.0),texCube,vFresnelColor),vFresnelColor);' +
  '    float offset=(0.01*vNormal.x*0.15+0.002)*0.75;' +
  '    vec3 refracted=vec3(texture2D(tRender,vec2(screenUv.x,screenUv.y+offset)).r,' +
  '                        texture2D(tRender,screenUv).g,' +
  '                        texture2D(tRender,vec2(screenUv.x,screenUv.y-offset)).b);' +
  '    vec3 mixed1=vec3(smoothstep(0.0,0.25,texCubeFresnel.r));' +
  '    float sgn=smoothstep(0.012,0.0012,texCubeFresnel.r);' +
  '    float invF=min(1.0-fresFactor+2.0,20.0);' +
  '    vec3 mixed2=mix(vec3(0.0),mix(vec3(0.0),max(vec3(invF),vec3(0.5)),sgn),0.07);' +
  '    vec3 mixed3=vec3(smoothstep(texCubeFresnel.r*10.0,-0.01,0.5),' +
  '                     smoothstep(texCubeFresnel.g*10.0,-0.01,0.5),' +
  '                     smoothstep(texCubeFresnel.b*10.0,-0.01,0.5));' +
  '    vec3 mixed=screenB(screenB(mixed1,mixed3),mixed2);' +
  '    vec3 bw=sat3(mixed,0.0);' +
  '    mixed.r=mix(bw.r,mixed.r,1.891);mixed.g=mix(bw.g,mixed.g,1.0);mixed.b=mix(bw.b,mixed.b,1.5);' +
  '    mixed=sat3(mixed,0.978);' +
  '    vec4 img=texture2D(tImage,vec2(screenUv.x,1.0-screenUv.y));' +
  '    vec3 windowTex=texture2D(tRender,screenUv).rgb;' +
  '    vec3 background=mix(screenB(refracted*0.55,windowTex*0.75),img.rgb,uImageOpacity*img.a);' +
  '    vec3 extraFres=max(vec3((t-2.135)*30.0),vec3(0.0));' +
  '    finalColor.rgb=screenB(mixed+extraFres,background);finalColor.a=1.0;' +
  '  } else { finalColor.a=0.0; }' +
  '  if(t>tMax&&t<(tMax+uGlow)){finalColor.rgb=vec3(1.0);finalColor.a=mapTo(t,tMax,tMax+uGlow,1.0,0.0);}' +
  '  gl_FragColor=finalColor;gl_FragColor.a*=uOpacity;}';

  function shader(type, src){
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
      console.warn('orb shader:', gl.getShaderInfoLog(sh)); return null;
    }
    return sh;
  }
  var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  var U = {};
  ['uResolution','uTime','uOpacity','uMouse1','uMouse2','uSize','tMap','tRender','tImage','uImageOpacity']
    .forEach(function(n){ U[n] = gl.getUniformLocation(prog, n); });

  /* the rim environment — the electric cool family: cyan, blue, one violet */
  function envFace(hues){
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g2 = c.getContext('2d');
    g2.fillStyle = '#04060a'; g2.fillRect(0, 0, 128, 128);
    hues.forEach(function(h){
      var gr = g2.createRadialGradient(h[0], h[1], 4, h[0], h[1], h[3]);
      gr.addColorStop(0, h[2]); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
    });
    return c;
  }
  var faces = [
    envFace([[36,44,'rgba(92,225,255,.95)',72],[96,100,'rgba(50,110,255,.8)',66]]),
    envFace([[90,40,'rgba(120,235,255,.9)',70],[30,96,'rgba(40,90,230,.75)',64]]),
    envFace([[64,30,'rgba(200,245,255,.95)',78],[100,90,'rgba(120,90,255,.6)',60]]),
    envFace([[40,90,'rgba(30,70,190,.85)',72],[100,30,'rgba(92,225,255,.6)',58]]),
    envFace([[70,64,'rgba(70,190,255,.9)',80],[20,20,'rgba(140,110,255,.55)',56]]),
    envFace([[54,70,'rgba(50,140,255,.85)',74],[104,40,'rgba(150,240,255,.7)',58]])
  ];
  var cube = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube);
  [gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
   gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
   gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
    .forEach(function(t, i){ gl.texImage2D(t, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, faces[i]); });
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.tMap, 0);

  function tex2D(unit){
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var renderTex = tex2D(1); gl.uniform1i(U.tRender, 1);
  var imgTex = tex2D(2);    gl.uniform1i(U.tImage, 2);
  (function(){ var c = document.createElement('canvas'); c.width = c.height = 2;
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); })();

  var imgOpacity = 0, imgTarget = 0;
  function setImage(src){
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      var c = document.createElement('canvas');
      var s2 = Math.min(1024 / img.width, 1024 / img.height, 1);
      c.width = Math.round(img.width * s2); c.height = Math.round(img.height * s2);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      imgTarget = 1;
    };
    img.onerror = function(){ imgTarget = 0; };
    img.src = (src instanceof File) ? URL.createObjectURL(src) : src;
  }
  addEventListener('dragover', function(e){ e.preventDefault(); });
  addEventListener('drop', function(e){
    e.preventDefault();
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) setImage(f);
  });
  var qImg = new URLSearchParams(location.search).get('img');
  if (qImg) setImage(qImg);

  /* ════════ SIZE + MOTION ════════ */
  var W, H, DPR;
  function fit(){
    DPR = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform4f(U.uResolution, cv.width, cv.height, W >= H ? W / H : 1, W >= H ? 1 : H / W);
    var size = Math.min(Math.max(W, 800), 2000) / Math.max(W, 1000) * C.sizeDefault;
    gl.uniform1f(U.uSize, size * 1.35);
    buildWorld(W, H);
    renderWorld(0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, renderTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, work);
    worldDirty = true;
  }
  fit();
  var rsT;
  addEventListener('resize', function(){ clearTimeout(rsT); rsT = setTimeout(fit, 180); }, {passive:true});

  var mouse = {x: 0, y: -0.05}, m1 = {x: 0, y: -0.05}, m2 = {x: 0, y: -0.05};
  var lerp1 = C.lerp1, lerp2 = C.lerp2, scrolling = false, scrollT = 0;

  addEventListener('mousemove', function(e){
    if (scrolling) return;
    mouse.x = (e.clientX / W - 0.5) * C.reach;
    mouse.y = (-e.clientY / H + 0.5) * C.reach;
  }, {passive:true});

  var points = [].slice.call(document.querySelectorAll('section, .hero')).map(function(el, i){
    return {el: el, side: (i % 2 ? C.sideDrift : -C.sideDrift)};
  });
  addEventListener('scroll', function(){
    if (!points.length) return;
    scrolling = true; scrollT = Date.now();
    lerp1 = C.scrollLerp1; lerp2 = C.scrollLerp2;
    var best = null, bd = 1e9;
    for (var i = 0; i < points.length; i++){
      var r = points[i].el.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - H / 2);
      if (d < bd){ bd = d; best = points[i]; }
    }
    if (best){
      var r2 = best.el.getBoundingClientRect();
      mouse.x = best.side;
      mouse.y = Math.max(-C.yClamp, Math.min(C.yClamp, -(r2.top + r2.height / 2 - H / 2) / H * 0.5));
    }
  }, {passive:true});

  /* world x = m·zw·1.2 → screen uv = 0.5 + m·0.6 */
  function orbPx(){
    return {x: (0.5 + m1.x * 0.6) * W, y: (0.5 - m1.y * 0.6) * H, r: Math.min(W, H) * 0.30};
  }

  /* ════════ THE WATERING ════════ */
  function water(dt){
    var o = orbPx(), changed = false;
    for (var i = 0; i < chips.length; i++){
      var c = chips[i];
      var cx2 = (c.x + c.w / 2) * 2, cy2 = (c.y + c.h / 2) * 2;
      var d = Math.hypot(cx2 - o.x, cy2 - o.y);
      var e0 = c.e;
      if (d < o.r * 1.05) c.e = Math.min(1, c.e + (1 - c.e) * 0.9 * dt);
      else c.e = Math.max(0, c.e - c.e * 0.28 * dt);
      if (Math.abs(c.e - e0) > 0.001) changed = true;
    }
    return changed;
  }

  window.SembleOrb = {
    setImage: setImage,
    clearImage: function(){ imgTarget = 0; },
    state: function(){
      var lit = chips.filter(function(c){ return c.e > 0.1; });
      return {chips: chips.length, lit: lit.length, orb: orbPx(),
              litKinds: lit.map(function(c){ return c.kind; })};
    }
  };

  var opacity = 0, t0 = performance.now(), last = t0;
  function draw(now){
    var t = (now - t0) / 1000 * C.displacementSpeed;
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (scrolling && Date.now() - scrollT > 900){
      scrolling = false; lerp1 = C.lerp1; lerp2 = C.lerp2;
    }
    /* time-normalized follows — identical feel at 5fps, 60Hz and 144Hz */
    var f1 = 1 - Math.pow(1 - lerp1, dt * 60);
    var f2 = 1 - Math.pow(1 - lerp2, dt * 60);
    m1.x += (mouse.x - m1.x) * f1; m1.y += (mouse.y - m1.y) * f1;
    m2.x += (m1.x - m2.x) * f2;   m2.y += (m1.y - m2.y) * f2;
    opacity += (1 - opacity) * (1 - Math.pow(0.965, dt * 60));
    imgOpacity += (imgTarget - imgOpacity) * (1 - Math.pow(0.95, dt * 60));

    /* stream the living board only while something on it is charged */
    if (water(dt) || worldDirty){
      renderWorld((now - t0) / 1000);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, renderTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, work);
      worldDirty = chips.some(function(c){ return c.e > 0.02; });
    }

    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uOpacity, opacity);
    gl.uniform2f(U.uMouse1, m1.x, m1.y);
    gl.uniform2f(U.uMouse2, m2.x, m2.y);
    gl.uniform1f(U.uImageOpacity, imgOpacity);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  draw(t0 + 16);
  if (RM){ opacity = 1; draw(t0 + 32); return; }

  var running = true, raf = 0;
  document.addEventListener('visibilitychange', function(){
    running = !document.hidden;
    if (running && !raf) raf = requestAnimationFrame(loop);
  });
  function loop(now){
    if (!running){ raf = 0; return; }
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
})();
