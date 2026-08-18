/* ═══════════════════════════════════════════════════════════
   THE HELD ORB v4 — a window into the backend.
   Beneath every page: the SEMBLE MAINBOARD — the stack, etched
   in silicon. Literal PCB anatomy (QFP leads, exposed dies, VRM
   chokes, gold edge fingers, 45° routing, silkscreen), each
   component a system we shipped:
     U1  CC CORES   — six-core processor (the six-word guide)
     U2  TRAX GFX   — GPU, the Trax line etched on the die
     M1–M4 STEPS    — memory modules, steps held in cells
     X1  SESH       — the clock crystal, keeper of time
     U3  INIT       — boot ROM, where everything starts
     U4  CROSSING   — the bridge chip, mounted at 45°
     PWR !MOTUS     — voltage regulation, value in motion
     U5  NET        — the PHY, people to the edge
   Where the orb rests, that system is watered: it charges,
   lights in its own way, and holds the light a while.
   Shader = the thoughtlab port (raymarch smin pair · perturbed
   normals · dual fresnel · cubemap rim · RGB-split refraction).
   Same engine at two scales: full (desktop page) and mini
   (the orblet riding the mobile tab bar).
   API: SembleOrb.setImage/clearImage/state/board/shot/mini
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ════════ SHADERS ════════ */
  var VERT =
  'attribute vec2 aPos;varying vec2 vUv;' +
  'void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';

  var FRAG =
  'precision highp float;\n' +
  'varying vec2 vUv;uniform vec4 uResolution;uniform float uTime;uniform float uOpacity;\n' +
  'uniform vec2 uMouse1;uniform vec2 uMouse2;uniform float uSize;uniform vec4 uWorld;\n' +
  'uniform samplerCube tMap;uniform sampler2D tRender;uniform sampler2D tImage;uniform float uImageOpacity;\n' +
  '#define DISTANCE 2.0\n' +
  'vec2 wuv(vec2 u){return u*uWorld.xy+uWorld.zw;}\n' +
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
  '  return p+normalize(p-ctr+vec3(0.0,0.0,0.0001))*d*2.1;}\n' +
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
  '    vec3 refracted=vec3(texture2D(tRender,wuv(vec2(screenUv.x,screenUv.y+offset))).r,' +
  '                        texture2D(tRender,wuv(screenUv)).g,' +
  '                        texture2D(tRender,wuv(vec2(screenUv.x,screenUv.y-offset))).b);' +
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
  '    vec3 windowTex=texture2D(tRender,wuv(screenUv)).rgb;' +
  '    vec3 background=mix(screenB(refracted*0.55,windowTex*0.75),img.rgb,uImageOpacity*img.a);' +
  '    vec3 extraFres=max(vec3((t-2.135)*30.0),vec3(0.0));' +
  '    finalColor.rgb=screenB(mixed+extraFres,background);finalColor.a=1.0;' +
  '  } else { finalColor.a=0.0; }' +
  '  if(t>tMax&&t<(tMax+uGlow)){finalColor.rgb=vec3(1.0);finalColor.a=mapTo(t,tMax,tMax+uGlow,1.0,0.0);}' +
  '  gl_FragColor=finalColor;gl_FragColor.a*=uOpacity;}';

  /* ════════ THE COMPONENT LIBRARY — silicon, made physical ════════ */
  var INK  = 'rgba(178,216,240,';         /* silkscreen  */
  var TRC  = 'rgba(56,112,164,';          /* copper, unlit */
  var LIT  = 'rgba(112,222,255,';         /* copper, charged */

  function rr(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function lcg(seed){
    var s = (seed >>> 0) || 1;
    return function(){ s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* every physical thing sits above the board — the shadow sells it */
  function drop(g, x, y, w, h, r){
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 9; g.shadowOffsetY = 3;
    g.fillStyle = 'rgba(5,9,15,0.92)';
    rr(g, x, y, w, h, r); g.fill();
    g.restore();
  }

  /* molding-compound grain */
  function speckle(g, x, y, w, h, seed){
    var r = lcg(seed), n = Math.min(400, Math.round(w * h / 34));
    for (var i = 0; i < n; i++){
      g.fillStyle = r() > 0.5 ? 'rgba(160,190,215,0.05)' : 'rgba(0,0,0,0.13)';
      g.fillRect(x + 1 + r() * (w - 2), y + 1 + r() * (h - 2), 1, 1);
    }
  }

  /* laser-etched marking — a dark ghost under a light face */
  function etch(g, x, y, txt, size, e, align){
    g.font = '600 ' + size + 'px ui-monospace, "Cascadia Mono", Consolas, monospace';
    g.textAlign = align || 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillText(txt, Math.round(x), Math.round(y) + 1);
    g.fillStyle = INK + (0.55 + 0.45 * e).toFixed(3) + ')';
    g.fillText(txt, Math.round(x), Math.round(y));
  }

  /* gull-wing leads, four sides, with a bright foot on every pin */
  function qfpLeads(g, x, y, w, h, pitch, len, e){
    var body = 'rgba(120,146,166,0.92)';
    var foot = 'rgba(220,238,250,' + (0.4 + 0.4 * e).toFixed(3) + ')';
    var chg  = LIT + (0.22 * e).toFixed(3) + ')';
    var p;
    for (p = x + pitch; p < x + w - pitch * 0.6; p += pitch){
      g.fillStyle = body;
      g.fillRect(p, y - len, pitch * 0.42, len);
      g.fillRect(p, y + h, pitch * 0.42, len);
      g.fillStyle = foot;
      g.fillRect(p, y - len, pitch * 0.42, 1);
      g.fillRect(p, y + h + len - 1, pitch * 0.42, 1);
      if (e > 0.02){ g.fillStyle = chg;
        g.fillRect(p, y - len, pitch * 0.42, len);
        g.fillRect(p, y + h, pitch * 0.42, len); }
    }
    for (p = y + pitch; p < y + h - pitch * 0.6; p += pitch){
      g.fillStyle = body;
      g.fillRect(x - len, p, len, pitch * 0.42);
      g.fillRect(x + w, p, len, pitch * 0.42);
      g.fillStyle = foot;
      g.fillRect(x - len, p, 1, pitch * 0.42);
      g.fillRect(x + w + len - 1, p, 1, pitch * 0.42);
      if (e > 0.02){ g.fillStyle = chg;
        g.fillRect(x - len, p, len, pitch * 0.42);
        g.fillRect(x + w, p, len, pitch * 0.42); }
    }
  }

  function pkg(g, x, y, w, h, e, r, seed){
    if (e > 0.03){
      g.save();
      g.shadowColor = 'rgba(96,220,255,' + (0.8 * e).toFixed(3) + ')';
      g.shadowBlur = 26 * e;
      g.fillStyle = '#0d1826';
      rr(g, x, y, w, h, r || 3); g.fill();
      g.restore();
    }
    var grd = g.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, e > 0.03 ? '#13233a' : '#101c2c');
    grd.addColorStop(0.55, '#0b1422');
    grd.addColorStop(1, '#070d16');
    g.fillStyle = grd;
    rr(g, x, y, w, h, r || 3); g.fill();
    /* top sheen — one light, one direction */
    g.fillStyle = 'rgba(190,220,245,0.07)';
    g.fillRect(x + 2, y + 1, w - 4, 1);
    if (seed) speckle(g, x, y, w, h, seed);
    g.strokeStyle = 'rgba(150,190,220,' + (0.22 + 0.5 * e).toFixed(3) + ')';
    g.lineWidth = 1;
    rr(g, x + 0.5, y + 0.5, w - 1, h - 1, r || 3); g.stroke();
  }

  function pin1(g, x, y, e){
    g.beginPath(); g.arc(x, y, 2, 0, 6.29);
    g.fillStyle = 'rgba(8,12,18,0.9)'; g.fill();
    g.beginPath(); g.arc(x, y, 1.2, 0, 6.29);
    g.fillStyle = 'rgba(200,225,245,' + (0.45 + 0.5 * e).toFixed(3) + ')';
    g.fill();
  }

  /* an exposed die — IO pad ring, functional blocks, diffraction sheen */
  function die(g, x, y, w, h, e, glow, seed){
    var grd = g.createLinearGradient(x, y, x + w, y + h);
    grd.addColorStop(0, 'rgba(96,170,220,' + (0.32 + 0.5 * e) + ')');
    grd.addColorStop(0.5, 'rgba(120,110,215,' + (0.26 + 0.4 * e) + ')');
    grd.addColorStop(1, 'rgba(52,90,180,' + (0.3 + 0.45 * e) + ')');
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
    if (w > 16 && h > 12){
      /* functional blocks: a core region and a fine SRAM field */
      var r2 = lcg(seed || 7), split = x + w * (0.5 + r2() * 0.14);
      g.strokeStyle = 'rgba(200,230,255,' + (0.14 + 0.3 * e).toFixed(3) + ')';
      g.lineWidth = 0.6;
      g.strokeRect(x + 2.5, y + 2.5, split - x - 4, h - 5);
      g.beginPath();
      for (var sx = split + 2; sx < x + w - 2; sx += 2){
        g.moveTo(sx, y + 3); g.lineTo(sx, y + h - 3);
      }
      g.strokeStyle = 'rgba(180,215,250,' + (0.10 + 0.25 * e).toFixed(3) + ')';
      g.stroke();
      /* IO pad ring */
      g.fillStyle = 'rgba(210,235,255,' + (0.22 + 0.4 * e).toFixed(3) + ')';
      for (var px = x + 3; px < x + w - 2; px += 3.2){
        g.fillRect(px, y + 0.8, 1.4, 1);
        g.fillRect(px, y + h - 1.8, 1.4, 1);
      }
      /* diffraction sheen */
      var sh = g.createLinearGradient(x, y + h, x + w, y);
      sh.addColorStop(0, 'rgba(140,240,255,0.10)');
      sh.addColorStop(0.5, 'rgba(255,255,255,0.02)');
      sh.addColorStop(1, 'rgba(170,140,255,0.10)');
      g.fillStyle = sh;
      g.fillRect(x, y, w, h);
    }
    g.strokeStyle = 'rgba(180,220,250,' + (0.3 + 0.5 * e).toFixed(3) + ')';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (glow && e > 0.03){
      g.save();
      g.shadowColor = 'rgba(120,230,255,' + (0.85 * e).toFixed(3) + ')';
      g.shadowBlur = 14 * e;
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      g.restore();
    }
  }

  function smdCap(g, x, y, w, h, e){
    g.fillStyle = 'rgba(96,126,150,' + (0.55 + 0.3 * e) + ')';
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(190,212,228,' + (0.7 + 0.3 * e) + ')';
    g.fillRect(x, y, w * 0.22, h);
    g.fillRect(x + w * 0.78, y, w * 0.22, h);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(x, y, w, 1);
  }

  function polyCap(g, x, y, r, e){
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 5; g.shadowOffsetY = 2;
    g.beginPath(); g.arc(x, y, r, 0, 6.29);
    g.fillStyle = 'rgba(30,52,76,0.95)'; g.fill();
    g.restore();
    var grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
    grd.addColorStop(0, 'rgba(120,160,195,0.35)');
    grd.addColorStop(1, 'rgba(20,36,54,0.1)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
    g.strokeStyle = 'rgba(150,185,210,' + (0.4 + 0.4 * e).toFixed(3) + ')';
    g.lineWidth = 1; g.stroke();
    g.beginPath();
    g.moveTo(x - r * 0.55, y); g.lineTo(x + r * 0.55, y);
    g.moveTo(x, y - r * 0.55); g.lineTo(x, y + r * 0.55);
    g.strokeStyle = 'rgba(150,185,210,' + (0.3 + 0.5 * e).toFixed(3) + ')';
    g.stroke();
  }

  function hexPath(g, cx, cy, r){
    g.beginPath();
    for (var i = 0; i < 6; i++){
      var a = Math.PI / 6 + i * Math.PI / 3;
      var px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  }

  /* ── the components of the stack ── */
  function drawComp(g, c, e, t){
    var x = c.x - c.w / 2, y = c.y - c.h / 2, w = c.w, h = c.h;
    var pulse = e > 0.02 ? e * (0.8 + 0.2 * Math.sin(t * 1.6 + c.phase)) : 0;
    var u = c.u, i;
    var seed = Math.round(c.x * 31 + c.y * 17);

    if (c.kind === 'cpu'){
      /* U1 · CC CORES — six cores on an interposer, igniting one by one */
      drop(g, x, y, w, h, 4);
      qfpLeads(g, x, y, w, h, Math.max(4, u * 0.16), u * 0.14, pulse);
      pkg(g, x, y, w, h, pulse, 4, seed);
      pin1(g, x + u * 0.2, y + u * 0.2, pulse);
      for (i = 0; i < 6; i++)
        smdCap(g, x + w * 0.18 + i * w * 0.115, y + h - u * 0.18, u * 0.09, u * 0.06, pulse);
      var dw = w * 0.62, dh = h * 0.56, dx = c.x - dw / 2, dy = c.y - dh / 2 - u * 0.06;
      /* interposer ring */
      g.strokeStyle = 'rgba(150,190,225,' + (0.18 + 0.3 * pulse).toFixed(3) + ')';
      g.lineWidth = 1;
      g.strokeRect(dx - 3.5, dy - 3.5, dw + 7, dh + 7);
      die(g, dx, dy, dw, dh, pulse * 0.4, false, seed);
      var lit = Math.ceil(6 * Math.min(1, e * 1.1));
      var k = 0;
      for (var ry = 0; ry < 2; ry++) for (var rx = 0; rx < 3; rx++){
        var cx2 = dx + dw * (rx + 0.5) / 3, cy2 = dy + dh * (ry + 0.5) / 2;
        var cw2 = dw / 3 - 3, ch2 = dh / 2 - 3;
        var on = k < lit && e > 0.03;
        var cp = on ? (0.55 + 0.45 * Math.sin(t * 2.1 + c.phase + k * 0.9)) * pulse : 0;
        die(g, cx2 - cw2 / 2, cy2 - ch2 / 2, cw2, ch2, cp, on, seed + k);
        k++;
      }
      etch(g, c.x, y + h - u * 0.42, 'CC CORES', Math.max(6, u * 0.26), pulse);
      etch(g, x - u * 0.34, y - u * 0.3, 'U1', Math.max(5, u * 0.2), pulse);

    } else if (c.kind === 'gpu'){
      /* U2 · TRAX GFX — a wide die, the Trax line etched across it, GDDR flanking */
      drop(g, x, y, w, h, 4);
      qfpLeads(g, x, y, w, h, Math.max(4, u * 0.16), u * 0.12, pulse);
      pkg(g, x, y, w, h, pulse, 4, seed);
      pin1(g, x + u * 0.18, y + u * 0.18, pulse);
      var gw = w * 0.44, gh = h * 0.6, gx2 = c.x - gw / 2, gy2 = c.y - gh / 2;
      die(g, gx2, gy2, gw, gh, pulse * 0.6, pulse > 0.03, seed);
      var pts = [[0.06,0.7],[0.22,0.52],[0.4,0.6],[0.58,0.34],[0.76,0.44],[0.94,0.22]];
      g.beginPath();
      for (i = 0; i < pts.length; i++){
        var px2 = gx2 + gw * pts[i][0], py2 = gy2 + gh * pts[i][1];
        if (i === 0) g.moveTo(px2, py2); else g.lineTo(px2, py2);
      }
      g.strokeStyle = 'rgba(200,240,255,' + (0.25 + 0.75 * pulse).toFixed(3) + ')';
      g.lineWidth = 1.5;
      if (e > 0.03){
        g.save();
        g.setLineDash([300]);
        g.lineDashOffset = 300 * (1 - Math.min(1, e * 1.15));
        g.shadowColor = 'rgba(130,235,255,' + (0.9 * pulse).toFixed(3) + ')';
        g.shadowBlur = 10 * pulse;
        g.stroke();
        g.restore();
      } else g.stroke();
      var ge = Math.max(0, (e - 0.7) / 0.3);
      for (i = 0; i < 4; i++){
        var mx = i < 2 ? x + u * 0.24 : x + w - u * 0.24 - u * 0.52;
        var my = y + h * 0.24 + (i % 2) * h * 0.4;
        pkg(g, mx, my, u * 0.52, u * 0.4, ge * pulse, 2, seed + 40 + i);
        pin1(g, mx + 3, my + 3, ge * pulse);
      }
      etch(g, c.x, y + h - u * 0.3, 'TRAX GFX', Math.max(6, u * 0.24), pulse);
      etch(g, x - u * 0.34, y - u * 0.28, 'U2', Math.max(5, u * 0.2), pulse);

    } else if (c.kind === 'ram'){
      /* M1–M4 · STEPS — a module, eight cells, filling as steps complete */
      drop(g, x, y, w, h, 3);
      pkg(g, x, y, w, h, pulse, 3, seed);
      var n = 8, litC = Math.ceil(n * Math.min(1, e * 1.05));
      for (i = 0; i < n; i++){
        var rx2 = x + w * 0.05 + i * (w * 0.9 / n), rw = w * 0.9 / n - 3;
        var on2 = i < litC && e > 0.03;
        var cp2 = on2 ? (0.55 + 0.45 * Math.sin(t * 2.4 + c.phase + i * 0.8)) * pulse : 0;
        die(g, rx2, y + h * 0.2, rw, h * 0.6, cp2, on2, seed + i);
      }
      /* gold contacts, with the key notch */
      g.fillStyle = 'rgba(201,168,106,' + (0.5 + 0.3 * pulse) + ')';
      for (i = 0; i < 14; i++){
        if (i === 9) continue;
        g.fillRect(x + w * 0.06 + i * w * 0.064, y + h - 2.5, w * 0.036, 2.5);
      }
      etch(g, x - u * 0.32, c.y, c.label, Math.max(5, u * 0.2), pulse);

    } else if (c.kind === 'choke'){
      /* PWR · !MOTUS — the inductor, value in motion */
      drop(g, x, y, w, h, 3);
      pkg(g, x, y, w, h, pulse, 3, seed);
      g.beginPath(); g.arc(c.x, c.y, w * 0.3, 0, 6.29);
      g.strokeStyle = 'rgba(160,200,230,' + (0.35 + 0.6 * pulse).toFixed(3) + ')';
      g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(c.x, c.y, w * 0.1, 0, 6.29);
      g.fillStyle = 'rgba(160,200,230,' + (0.25 + 0.6 * pulse).toFixed(3) + ')';
      g.fill();
      if (e > 0.03){
        g.save();
        g.shadowColor = 'rgba(120,230,255,' + (0.9 * pulse).toFixed(3) + ')';
        g.shadowBlur = 12 * pulse;
        g.beginPath(); g.arc(c.x, c.y, w * 0.3, 0, 6.29); g.stroke();
        g.restore();
      }
      etch(g, c.x, y + h + u * 0.22, c.label || 'R15', Math.max(5, u * 0.16), pulse);

    } else if (c.kind === 'xtal'){
      /* X1 · SESH — the clock crystal, keeper of the gathering's time */
      var tick = e > 0.03 ? 0.5 + 0.5 * Math.sin(t * 7.5 + c.phase) : 0;
      drop(g, x, y, w, h, h / 2);
      g.fillStyle = 'rgba(140,160,176,0.9)';
      rr(g, x, y, w, h, h / 2); g.fill();
      var shine = g.createLinearGradient(x, y, x, y + h);
      shine.addColorStop(0, 'rgba(220,235,245,' + (0.35 + 0.4 * tick * e) + ')');
      shine.addColorStop(0.5, 'rgba(120,140,155,0.15)');
      shine.addColorStop(1, 'rgba(60,74,86,0.4)');
      g.fillStyle = shine;
      rr(g, x, y, w, h, h / 2); g.fill();
      /* weld dots */
      g.fillStyle = 'rgba(225,240,250,0.5)';
      g.beginPath(); g.arc(x + h * 0.5, c.y, 1, 0, 6.29); g.fill();
      g.beginPath(); g.arc(x + w - h * 0.5, c.y, 1, 0, 6.29); g.fill();
      if (e > 0.03){
        g.save();
        g.shadowColor = 'rgba(140,235,255,' + (0.8 * e * tick).toFixed(3) + ')';
        g.shadowBlur = 14 * e;
        g.strokeStyle = 'rgba(190,240,255,' + (0.6 * e * tick).toFixed(3) + ')';
        rr(g, x, y, w, h, h / 2); g.stroke();
        g.restore();
      }
      etch(g, c.x, y + h + u * 0.24, 'X1 SESH', Math.max(5, u * 0.18), e);

    } else if (c.kind === 'rom'){
      /* U3 · INIT — the boot ROM; one dot, then everything */
      drop(g, x, y, w, h, 2.5);
      qfpLeads(g, x, y, w, h, Math.max(3.5, u * 0.18), u * 0.12, pulse);
      pkg(g, x, y, w, h, pulse, 2.5, seed);
      pin1(g, x + u * 0.14, y + u * 0.14, Math.max(0.35, pulse));
      if (e > 0.02){
        var br = Math.min(1, e * 1.2) * Math.min(w, h) * 0.55;
        var bg = g.createRadialGradient(x + u * 0.14, y + u * 0.14, 1, x + u * 0.14, y + u * 0.14, br);
        bg.addColorStop(0, 'rgba(150,240,255,' + (0.55 * pulse).toFixed(3) + ')');
        bg.addColorStop(1, 'rgba(150,240,255,0)');
        g.fillStyle = bg;
        g.fillRect(x, y, w, h);
      }
      etch(g, c.x, c.y + 1, 'INIT', Math.max(5, u * 0.2), pulse);

    } else if (c.kind === 'brg'){
      /* U4 · THE CROSSING — the bridge, mounted at 45° */
      g.save();
      g.translate(c.x, c.y); g.rotate(Math.PI / 4);
      drop(g, -w / 2, -h / 2, w, h, 3);
      qfpLeads(g, -w / 2, -h / 2, w, h, Math.max(4, u * 0.16), u * 0.12, pulse);
      pkg(g, -w / 2, -h / 2, w, h, pulse, 3, seed);
      var e1 = Math.min(1, e * 2), e2 = Math.max(0, e * 2 - 1);
      die(g, -w * 0.36, -h * 0.36, w * 0.32, h * 0.72, e1 * pulse, e1 > 0.05 && e > 0.03, seed);
      die(g, w * 0.04, -h * 0.36, w * 0.32, h * 0.72, e2 * pulse, e2 > 0.05, seed + 3);
      g.restore();
      etch(g, c.x, c.y + h * 0.85 + u * 0.2, 'CROSSING', Math.max(5, u * 0.19), pulse);

    } else if (c.kind === 'scu'){
      /* SCU ARRAY — the compute fabric. Hex units, linked; charge radiates
         from the core outward, ring by ring. The interstellar block. */
      var ch2 = w * 0.16;
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.beginPath();
      g.moveTo(x + ch2, y);
      g.lineTo(x + w - ch2, y); g.lineTo(x + w, y + ch2);
      g.lineTo(x + w, y + h - ch2); g.lineTo(x + w - ch2, y + h);
      g.lineTo(x + ch2, y + h); g.lineTo(x, y + h - ch2);
      g.lineTo(x, y + ch2); g.closePath();
      g.fillStyle = '#0a1524'; g.fill();
      g.restore();
      var oct = function(){
        g.beginPath();
        g.moveTo(x + ch2, y);
        g.lineTo(x + w - ch2, y); g.lineTo(x + w, y + ch2);
        g.lineTo(x + w, y + h - ch2); g.lineTo(x + w - ch2, y + h);
        g.lineTo(x + ch2, y + h); g.lineTo(x, y + h - ch2);
        g.lineTo(x, y + ch2); g.closePath();
      };
      if (e > 0.03){
        g.save();
        g.shadowColor = 'rgba(96,220,255,' + (0.8 * e).toFixed(3) + ')';
        g.shadowBlur = 24 * e;
        oct(); g.fillStyle = '#0c1a2c'; g.fill();
        g.restore();
      }
      var grd2 = g.createLinearGradient(x, y, x, y + h);
      grd2.addColorStop(0, e > 0.03 ? '#122238' : '#0e1a2c');
      grd2.addColorStop(1, '#081020');
      oct(); g.fillStyle = grd2; g.fill();
      speckle(g, x + 3, y + 3, w - 6, h - 6, seed);
      oct();
      g.strokeStyle = 'rgba(150,190,220,' + (0.24 + 0.5 * pulse).toFixed(3) + ')';
      g.lineWidth = 1; g.stroke();
      /* gold chamfer pads */
      g.fillStyle = 'rgba(201,168,106,0.6)';
      g.fillRect(x + 1.5, y + 1.5, ch2 * 0.5, ch2 * 0.5);
      g.fillRect(x + w - 1.5 - ch2 * 0.5, y + 1.5, ch2 * 0.5, ch2 * 0.5);
      g.fillRect(x + 1.5, y + h - 1.5 - ch2 * 0.5, ch2 * 0.5, ch2 * 0.5);
      g.fillRect(x + w - 1.5 - ch2 * 0.5, y + h - 1.5 - ch2 * 0.5, ch2 * 0.5, ch2 * 0.5);
      /* the lattice — 1 + 6 + 12 units */
      var hr = w * 0.088, cx3 = c.x, cy3 = c.y - u * 0.1;
      var cells = [[0, 0, 0]];
      for (i = 0; i < 6; i++){
        var a1 = i * Math.PI / 3;
        cells.push([Math.cos(a1) * hr * 1.95, Math.sin(a1) * hr * 1.95, 1]);
      }
      for (i = 0; i < 12; i++){
        var a2 = i * Math.PI / 6 + Math.PI / 12;
        var rd = hr * (i % 2 ? 3.55 : 3.85);
        cells.push([Math.cos(a2) * rd, Math.sin(a2) * rd, 2]);
      }
      for (i = 0; i < cells.length; i++){
        var ring = cells[i][2];
        var re = Math.max(0, Math.min(1, e * 3.2 - ring));
        var te = re > 0 && e > 0.03
          ? re * (0.6 + 0.4 * Math.sin(t * 2.6 + c.phase + i * 0.55)) : 0;
        var hx = cx3 + cells[i][0], hy = cy3 + cells[i][1];
        hexPath(g, hx, hy, hr * 0.82);
        g.fillStyle = 'rgba(70,150,220,' + (0.10 + 0.5 * te).toFixed(3) + ')';
        g.fill();
        g.strokeStyle = 'rgba(130,210,255,' + (0.22 + 0.6 * te).toFixed(3) + ')';
        g.lineWidth = 0.9;
        if (te > 0.25){
          g.save();
          g.shadowColor = 'rgba(120,230,255,' + (0.8 * te).toFixed(3) + ')';
          g.shadowBlur = 9 * te;
          g.stroke();
          g.restore();
          g.beginPath(); g.arc(hx, hy, 1.1, 0, 6.29);
          g.fillStyle = 'rgba(210,245,255,' + (0.85 * te).toFixed(3) + ')';
          g.fill();
        } else g.stroke();
      }
      etch(g, c.x, y + h - u * 0.3, 'SCU ARRAY', Math.max(6, u * 0.22), pulse);

    } else if (c.kind === 'phy'){
      /* U5 · NET — the PHY; people, linked to the edge */
      drop(g, x, y, w, h, 2.5);
      qfpLeads(g, x, y, w, h, Math.max(3.5, u * 0.16), u * 0.11, pulse);
      pkg(g, x, y, w, h, pulse, 2.5, seed);
      pin1(g, x + u * 0.13, y + u * 0.13, pulse);
      for (i = 0; i < 2; i++){
        var la = e > 0.03 ? (Math.sin(t * 3.1 + i * 3.14) > 0 ? pulse : pulse * 0.2) : 0;
        g.beginPath(); g.arc(x + w - u * 0.2 - i * u * 0.3, y + u * 0.16, 1.8, 0, 6.29);
        g.fillStyle = 'rgba(120,235,255,' + (0.15 + 0.8 * la).toFixed(3) + ')';
        g.fill();
      }
      etch(g, c.x, c.y + 1, 'NET', Math.max(5, u * 0.2), pulse);
    }
  }

  /* ════════ THE BOARD ════════ */
  function makeBoard(CW, CH){
    var base = document.createElement('canvas');
    var work = document.createElement('canvas');
    base.width = work.width = CW; base.height = work.height = CH;
    var bctx = base.getContext('2d'), wctx = work.getContext('2d');
    var comps = [], nets = [], crossed = {};
    var u = Math.min(CW, CH) / 11.4;

    /* ── plan → relax → place: nothing may cover anything ── */
    var plan = [
      {id: 'cpu',  x: CW * 0.30, y: CH * 0.45, hw: u * 1.8,  hh: u * 1.8},
      {id: 'xtal', x: CW * 0.30 + u * 3.5, y: CH * 0.45 - u * 0.9, hw: u * 0.58, hh: u * 0.45},
      {id: 'rom',  x: CW * 0.30 + u * 3.55, y: CH * 0.45 + u * 0.85, hw: u * 0.53, hh: u * 0.4},
      {id: 'rams', x: CW * 0.845, y: CH * 0.33, hw: u * 1.55, hh: u * 2.25},
      {id: 'gpu',  x: CW * 0.28, y: CH * 0.82, hw: u * 2.15, hh: u * 1.3},
      {id: 'brg',  x: CW * 0.54, y: CH * 0.68, hw: u * 1.12, hh: u * 1.12},
      {id: 'scu',  x: CW * 0.645, y: CH * 0.36, hw: u * 1.5,  hh: u * 1.5},
      {id: 'phy',  x: CW * 0.875, y: CH * 0.79, hw: u * 0.63, hh: u * 0.48}
    ];
    var margin = u * 0.62, it, a2, b2, i;
    for (it = 0; it < 160; it++){
      var moved = false;
      for (i = 0; i < plan.length; i++){
        a2 = plan[i];
        for (var j = i + 1; j < plan.length; j++){
          b2 = plan[j];
          var ox = (a2.hw + b2.hw + margin) - Math.abs(a2.x - b2.x);
          var oy = (a2.hh + b2.hh + margin) - Math.abs(a2.y - b2.y);
          if (ox > 0 && oy > 0){
            moved = true;
            if (ox < oy){
              var sx = a2.x < b2.x ? -1 : 1;
              a2.x += sx * ox / 2; b2.x -= sx * ox / 2;
            } else {
              var sy2 = a2.y < b2.y ? -1 : 1;
              a2.y += sy2 * oy / 2; b2.y -= sy2 * oy / 2;
            }
          }
        }
        /* the VRM row needs sky above the CPU; the fingers need floor */
        a2.x = Math.max(u * 0.8 + a2.hw, Math.min(CW - u * 0.8 - a2.hw, a2.x));
        a2.y = Math.max((a2.id === 'cpu' ? u * 2.45 : u * 1.0) + a2.hh,
                        Math.min(CH - u * 1.5 - a2.hh, a2.y));
      }
      if (!moved) break;
    }
    var P = {};
    plan.forEach(function(p){ P[p.id] = p; });

    function comp(kind, cx, cy, w, h, extra){
      var c = {kind: kind, x: cx, y: cy, w: w, h: h, u: u, e: 0,
               phase: (cx * 7 + cy * 13) % 6.28};
      if (extra) for (var k2 in extra) c[k2] = extra[k2];
      comps.push(c);
      return c;
    }
    function route(ax, ay, bx, by){
      var dx = bx - ax, dy = by - ay;
      if (Math.abs(dx) >= Math.abs(dy))
        return [[ax, ay], [bx - Math.sign(dx) * Math.abs(dy), ay], [bx, by]];
      return [[ax, ay], [ax, by - Math.sign(dy) * Math.abs(dx)], [bx, by]];
    }
    function net(a, b, pts, wdt){
      var len = 0, segs = [];
      for (var s2 = 1; s2 < pts.length; s2++){
        var L = Math.hypot(pts[s2][0] - pts[s2-1][0], pts[s2][1] - pts[s2-1][1]);
        segs.push(L); len += L;
      }
      nets.push({a: a, b: b, pts: pts, w: wdt || 1, len: len, segs: segs});
    }
    function along(n, f){
      var d = f * n.len;
      for (var s2 = 0; s2 < n.segs.length; s2++){
        if (d <= n.segs[s2] || s2 === n.segs.length - 1){
          var p0 = n.pts[s2], p1 = n.pts[s2 + 1], r2 = n.segs[s2] ? d / n.segs[s2] : 0;
          return {x: p0[0] + (p1[0] - p0[0]) * Math.min(1, r2),
                  y: p0[1] + (p1[1] - p0[1]) * Math.min(1, r2)};
        }
        d -= n.segs[s2];
      }
      return {x: n.pts[0][0], y: n.pts[0][1]};
    }

    var cpu = comp('cpu', P.cpu.x, P.cpu.y, u * 3.6, u * 3.6);
    var chokes = [], caps = [];
    for (i = 0; i < 4; i++)
      chokes.push(comp('choke', cpu.x - u * 1.55 + i * u * 1.05, cpu.y - cpu.h / 2 - u * 1.15,
                       u * 0.8, u * 0.8, {label: 'R' + (12 + i * 3)}));
    for (i = 0; i < 6; i++)
      caps.push({x: cpu.x - u * 1.7 + i * u * 0.66, y: cpu.y - cpu.h / 2 - u * 1.85, r: u * 0.24});
    var xtal = comp('xtal', P.xtal.x, P.xtal.y, u * 1.15, u * 0.6);
    var rom  = comp('rom',  P.rom.x, P.rom.y, u * 1.05, u * 0.8);
    var rams = [];
    for (i = 0; i < 4; i++)
      rams.push(comp('ram', P.rams.x, P.rams.y - u * 1.68 + i * u * 1.12, u * 3.1, u * 0.72,
                     {label: 'M' + (i + 1)}));
    var gpu = comp('gpu', P.gpu.x, P.gpu.y, u * 4.3, u * 2.35);
    var brg = comp('brg', P.brg.x, P.brg.y, u * 1.45, u * 1.45);
    var scu = comp('scu', P.scu.x, P.scu.y, u * 2.9, u * 2.9);
    var phy = comp('phy', P.phy.x, P.phy.y, u * 1.25, u * 0.95);

    for (i = 0; i < 4; i++)
      net(chokes[i], cpu, [[chokes[i].x, chokes[i].y + u * 0.4],
                           [chokes[i].x, cpu.y - cpu.h / 2]], 2.5);
    for (i = 0; i < 8; i++){
      var sy = cpu.y - u * 1.3 + i * u * 0.36;
      var ram2 = rams[Math.floor(i / 2)];
      var ty = ram2.y + (i % 2 ? u * 0.14 : -u * 0.14);
      net(cpu, ram2, route(cpu.x + cpu.w / 2, sy, ram2.x - ram2.w / 2, ty), 1);
    }
    net(xtal, cpu, route(xtal.x - xtal.w / 2, xtal.y, cpu.x + cpu.w / 2, cpu.y - u * 0.8), 1);
    net(rom, cpu,  route(rom.x - rom.w / 2, rom.y, cpu.x + cpu.w / 2, cpu.y + u * 0.85), 1);
    for (i = 0; i < 5; i++)
      net(cpu, brg, route(cpu.x - u + i * u * 0.5, cpu.y + cpu.h / 2,
                          brg.x - u * 0.5 + i * u * 0.25, brg.y - u * 1.02), 1);
    for (i = 0; i < 5; i++)
      net(brg, gpu, route(brg.x - u * 0.5 + i * u * 0.25, brg.y + u * 1.02,
                          gpu.x + u * 0.9 + i * u * 0.3, gpu.y - gpu.h / 2), 1);
    /* the fabric: SCU to everything that computes */
    for (i = 0; i < 3; i++)
      net(scu, cpu, route(scu.x - scu.w / 2, scu.y - u * 0.5 + i * u * 0.5,
                          cpu.x + cpu.w / 2, cpu.y - u * 0.2 + i * u * 0.35), 1.2);
    for (i = 0; i < 3; i++)
      net(scu, rams[i + 1] || rams[i],
          route(scu.x + scu.w / 2, scu.y - u * 0.5 + i * u * 0.5,
                rams[0].x - rams[0].w / 2, rams[Math.min(3, i + 1)].y), 1);
    net(scu, brg, route(scu.x, scu.y + scu.h / 2, brg.x, brg.y - u * 1.05), 1.2);
    net(phy, brg, route(phy.x - phy.w / 2, phy.y, brg.x + u * 1.02, brg.y), 1);
    var fingersX = CW * 0.5, fingersW = u * 4;
    for (i = 0; i < 4; i++)
      net(phy, null, route(phy.x - u * 0.4 + i * u * 0.26, phy.y + phy.h / 2,
                           fingersX + fingersW * 0.28 + i * u * 0.22, CH - u * 0.5), 1);

    /* ── the meters: SCC fills as the board is watered; MCC mints at thresholds ── */
    function meters(g, scc, mcc){
      var y0 = CH - u * 1.05, seg = u * 0.3, gap = u * 0.1, x0 = u * 0.6, k;
      etch(g, x0, y0 - u * 0.35, 'SCC', Math.max(5, u * 0.18), scc > 0 ? 1 : 0, 'left');
      for (k = 0; k < 12; k++){
        var on = k < Math.round(scc * 12);
        g.fillStyle = on ? LIT + '0.8)' : 'rgba(60,100,140,0.25)';
        if (on){ g.save(); g.shadowColor = LIT + '0.7)'; g.shadowBlur = 6;
          g.fillRect(x0 + k * (seg + gap), y0, seg, u * 0.26); g.restore(); }
        else g.fillRect(x0 + k * (seg + gap), y0, seg, u * 0.26);
      }
      var x1 = CW - u * 0.6 - 6 * (seg + gap);
      etch(g, CW - u * 0.6, y0 - u * 0.35, 'MCC · MOTUS LEVEL', Math.max(5, u * 0.18), mcc > 0 ? 1 : 0, 'right');
      for (k = 0; k < 6; k++){
        var on2 = k < Math.round(mcc * 6);
        g.fillStyle = on2 ? 'rgba(232,207,150,0.9)' : 'rgba(120,100,60,0.22)';
        if (on2){ g.save(); g.shadowColor = 'rgba(226,200,143,0.8)'; g.shadowBlur = 7;
          g.fillRect(x1 + k * (seg + gap), y0, seg, u * 0.26); g.restore(); }
        else g.fillRect(x1 + k * (seg + gap), y0, seg, u * 0.26);
      }
    }

    /* ── base: substrate, pours, silkscreen, copper, gold ── */
    (function paintBase(){
      var g = bctx;
      var bgr = g.createLinearGradient(0, 0, 0, CH);
      bgr.addColorStop(0, '#050b14'); bgr.addColorStop(1, '#040810');
      g.fillStyle = bgr; g.fillRect(0, 0, CW, CH);
      /* solder-mask sheen */
      var sheen = g.createLinearGradient(0, 0, CW, 0);
      sheen.addColorStop(0, 'rgba(120,170,220,0.02)');
      sheen.addColorStop(0.5, 'rgba(120,170,220,0.045)');
      sheen.addColorStop(1, 'rgba(120,170,220,0.015)');
      g.fillStyle = sheen; g.fillRect(0, 0, CW, CH);
      /* board edge + mounting holes */
      g.strokeStyle = 'rgba(120,165,205,0.18)';
      g.lineWidth = 1;
      rr(g, u * 0.25, u * 0.25, CW - u * 0.5, CH - u * 0.5, 8); g.stroke();
      [[0.05, 0.08], [0.95, 0.08], [0.05, 0.92], [0.95, 0.92]].forEach(function(f){
        var hx = CW * f[0], hy = CH * f[1];
        g.beginPath(); g.arc(hx, hy, u * 0.22, 0, 6.29);
        g.fillStyle = '#02050a'; g.fill();
        g.strokeStyle = 'rgba(201,168,106,0.45)';
        g.lineWidth = 1.5; g.stroke();
      });
      /* ground pours with hatch */
      var pours = [[0.06, 0.1, 0.52, 0.52], [0.62, 0.1, 0.32, 0.5], [0.08, 0.66, 0.5, 0.28]];
      pours.forEach(function(pr){
        var px4 = CW * pr[0], py4 = CH * pr[1], pw = CW * pr[2], ph2 = CH * pr[3];
        g.fillStyle = 'rgba(20,42,66,0.2)';
        rr(g, px4, py4, pw, ph2, 12); g.fill();
        g.save();
        rr(g, px4, py4, pw, ph2, 12); g.clip();
        g.strokeStyle = 'rgba(70,120,170,0.05)';
        g.lineWidth = 0.7;
        for (var hx2 = px4 - ph2; hx2 < px4 + pw; hx2 += 9){
          g.beginPath(); g.moveTo(hx2, py4 + ph2); g.lineTo(hx2 + ph2, py4); g.stroke();
        }
        g.restore();
      });
      /* via grid + tented vias */
      g.fillStyle = 'rgba(80,140,190,0.055)';
      for (var gy = 10; gy < CH; gy += 22)
        for (var gx = 10; gx < CW; gx += 22)
          g.fillRect(gx, gy, 1.2, 1.2);
      var vr = lcg(4242);
      for (i = 0; i < 70; i++){
        g.beginPath(); g.arc(vr() * CW, vr() * CH, 1, 0, 6.29);
        g.fillStyle = 'rgba(90,150,200,0.14)'; g.fill();
      }
      /* copper */
      nets.forEach(function(n){
        g.beginPath();
        n.pts.forEach(function(p, j2){ j2 ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
        g.strokeStyle = TRC + (n.w > 1.5 ? '0.6)' : '0.45)');
        g.lineWidth = n.w;
        g.stroke();
        if (n.pts.length > 2){
          g.beginPath(); g.arc(n.pts[1][0], n.pts[1][1], 1.7, 0, 6.29);
          g.fillStyle = 'rgba(96,190,250,0.5)'; g.fill();
          g.beginPath(); g.arc(n.pts[1][0], n.pts[1][1], 2.8, 0, 6.29);
          g.strokeStyle = TRC + '0.5)'; g.lineWidth = 0.8; g.stroke();
        }
      });
      /* gold edge fingers */
      for (var f2 = 0; f2 < 12; f2++){
        var fx = fingersX - fingersW / 2 + f2 * (fingersW / 12);
        var gg = g.createLinearGradient(0, CH - u * 0.5, 0, CH);
        gg.addColorStop(0, '#e2c88f'); gg.addColorStop(1, '#9d7f4b');
        g.fillStyle = gg;
        rr(g, fx, CH - u * 0.5, fingersW / 12 - 2.5, u * 0.5, 1.5); g.fill();
      }
      caps.forEach(function(cp){ polyCap(g, cp.x, cp.y, cp.r, 0); });
      var s = 987654321;
      function rnd(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
      for (var p2 = 0; p2 < 30; p2++){
        var px3 = u * 0.6 + rnd() * (CW - u * 1.2), py3 = u * 0.6 + rnd() * (CH - u * 1.9);
        var clear = comps.every(function(c){
          return Math.abs(px3 - c.x) > c.w / 2 + u * 0.5 || Math.abs(py3 - c.y) > c.h / 2 + u * 0.5;
        });
        if (!clear) continue;
        if (rnd() > 0.5) smdCap(g, px3, py3, u * 0.22, u * 0.13, 0);
        else {
          g.fillStyle = 'rgba(16,24,36,0.95)';
          g.fillRect(px3, py3, u * 0.24, u * 0.12);
          g.fillStyle = INK + '0.35)';
          g.fillRect(px3 + u * 0.03, py3 + u * 0.035, u * 0.18, u * 0.015);
        }
      }
      /* silkscreen */
      g.font = '600 ' + Math.max(7, u * 0.24) + 'px ui-monospace, Consolas, monospace';
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = INK + '0.4)';
      g.fillText('SEMBLE STACK', u * 0.6, CH - u * 0.35);
      g.textAlign = 'right';
      g.fillText('REV 2', CW - u * 0.6, CH - u * 0.35);
      g.setLineDash([4, 4]);
      g.strokeStyle = INK + '0.14)';
      g.lineWidth = 1;
      rr(g, cpu.x - cpu.w / 2 - u * 0.55, caps[0].y - u * 0.5,
         cpu.w + u * 1.1, (chokes[0].y + u * 0.75) - (caps[0].y - u * 0.5), 6);
      g.stroke();
      g.setLineDash([]);
      etch(g, chokes[3].x + u * 1.15, chokes[0].y, '!MOTUS PWR', Math.max(6, u * 0.2), 0, 'left');
      etch(g, rams[0].x, rams[0].y - u * 0.85, 'STEPS', Math.max(6, u * 0.2), 0);
      meters(g, 0, 0);
      comps.forEach(function(c){ drawComp(g, c, 0, 0); });
    })();

    function render(t, o){
      wctx.drawImage(base, 0, 0);
      /* the beam — the orb feeding energy into the board beneath it */
      if (o){
        var avg = 0, nn = 0;
        comps.forEach(function(c){
          if (Math.hypot(c.x - o.x, c.y - o.y) < o.r * 1.1){ avg += c.e; nn++; }
        });
        avg = nn ? avg / nn : 0;
        var fg = wctx.createRadialGradient(o.x, o.y, 2, o.x, o.y, o.r * 0.62);
        fg.addColorStop(0, 'rgba(110,220,255,' + (0.05 + 0.09 * avg).toFixed(3) + ')');
        fg.addColorStop(1, 'rgba(110,220,255,0)');
        wctx.fillStyle = fg;
        wctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
      }
      /* charged nets glow, and energy pulses travel them */
      nets.forEach(function(n, ni){
        var ea = n.a ? n.a.e : 0, eb = n.b ? n.b.e : 0;
        var e = Math.max(ea, eb);
        if (e < 0.04) return;
        wctx.beginPath();
        n.pts.forEach(function(p, j2){ j2 ? wctx.lineTo(p[0], p[1]) : wctx.moveTo(p[0], p[1]); });
        wctx.save();
        wctx.shadowColor = LIT + (0.7 * e).toFixed(3) + ')';
        wctx.shadowBlur = 7 * e;
        wctx.strokeStyle = LIT + (0.55 * e).toFixed(3) + ')';
        wctx.lineWidth = n.w;
        wctx.stroke();
        wctx.restore();
        if (e > 0.14){
          for (var pi = 0; pi < 2; pi++){
            var ph = (t * 0.16 + pi * 0.5 + ni * 0.377) % 1;
            if (eb > ea) ph = 1 - ph;
            var pt = along(n, ph);
            wctx.save();
            wctx.shadowColor = LIT + (0.9 * e).toFixed(3) + ')';
            wctx.shadowBlur = 9;
            wctx.beginPath(); wctx.arc(pt.x, pt.y, 1.7, 0, 6.29);
            wctx.fillStyle = 'rgba(215,248,255,' + (0.85 * e).toFixed(3) + ')';
            wctx.fill();
            wctx.restore();
          }
        }
      });
      comps.forEach(function(c){ if (c.e > 0.02) drawComp(wctx, c, c.e, t); });
      /* credits: SCC accrues with watering; MCC mints when a system peaks */
      var sum = 0;
      comps.forEach(function(c){
        sum += c.e;
        if (c.e >= 0.98) crossed[c.kind + Math.round(c.x)] = 1;
      });
      meters(wctx, Math.min(1, sum / 5), Math.min(1, Object.keys(crossed).length / 6));
    }

    return {work: work, comps: comps, render: render, u: u,
            mcc: function(){ return Object.keys(crossed).length; }};
  }

  /* the orblet's world — one component of the stack per tab, in tab order */
  function makeStrip(order){
    var SW = 512, SH = 128;
    var base = document.createElement('canvas');
    var work = document.createElement('canvas');
    base.width = work.width = SW; base.height = work.height = SH;
    var bctx = base.getContext('2d'), wctx = work.getContext('2d');
    var u = 30, comps = [];
    var KINDS = {trax: 'gpu', init: 'rom', me: 'cpu', semble: 'cpu', sesh: 'xtal'};
    var SIZES = {gpu: [u * 2.6, u * 1.5], rom: [u * 1.4, u * 1.1],
                 cpu: [u * 1.9, u * 1.9], xtal: [u * 1.7, u * 0.9]};
    order.forEach(function(tag, i){
      var kind = KINDS[tag] || 'rom';
      var sz = SIZES[kind];
      comps.push({kind: kind, x: SW * (i + 0.5) / order.length, y: SH * 0.5,
                  w: sz[0], h: sz[1], u: u, e: 0, phase: i * 1.7});
    });
    var g = bctx;
    var bgr = g.createLinearGradient(0, 0, 0, SH);
    bgr.addColorStop(0, '#050b14'); bgr.addColorStop(1, '#040810');
    g.fillStyle = bgr; g.fillRect(0, 0, SW, SH);
    g.fillStyle = 'rgba(80,140,190,0.06)';
    for (var gy = 8; gy < SH; gy += 18)
      for (var gx = 8; gx < SW; gx += 18)
        g.fillRect(gx, gy, 1.2, 1.2);
    g.beginPath();
    g.moveTo(0, SH * 0.5); g.lineTo(SW, SH * 0.5);
    g.strokeStyle = TRC + '0.4)'; g.lineWidth = 1.5; g.stroke();
    comps.forEach(function(c){
      g.beginPath(); g.arc(c.x, SH * 0.5, 2, 0, 6.29);
      g.fillStyle = 'rgba(96,190,250,0.55)'; g.fill();
      drawComp(g, c, 0, 0);
    });
    function render(t){
      wctx.drawImage(base, 0, 0);
      comps.forEach(function(c){ if (c.e > 0.02) drawComp(wctx, c, c.e, t); });
    }
    return {work: work, comps: comps, render: render, w: SW, h: SH};
  }

  /* ════════ THE ENGINE — one shader, two scales ════════ */
  function makeEngine(cv){
    var gl = cv.getContext('webgl', {alpha: true, antialias: true, premultipliedAlpha: false});
    if (!gl) return null;
    function shader(type, src){
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
        console.warn('orb shader:', gl.getShaderInfoLog(sh)); return null;
      }
      return sh;
    }
    var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var U = {};
    ['uResolution','uTime','uOpacity','uMouse1','uMouse2','uSize','uWorld',
     'tMap','tRender','tImage','uImageOpacity']
      .forEach(function(n){ U[n] = gl.getUniformLocation(prog, n); });

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
    gl.uniform4f(U.uWorld, 1, 1, 0, 0);

    /* the board reads right-way-up through the glass */
    function uploadWorld(canvas){
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, renderTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }

    return {gl: gl, cv: cv, U: U, imgTex: imgTex, uploadWorld: uploadWorld};
  }

  /* ════════ FULL MODE — the page orb ════════ */
  function initFull(){
    if (!matchMedia('(min-width: 1000px)').matches) return null;
    var C = {
      displacementSpeed: 0.18,   /* steadier surface               */
      sizeDefault: 0.275,
      lerp1: 0.032, lerp2: 0.05,
      scrollLerp1: 0.12, scrollLerp2: 0.09,
      reach: 0.3,                /* shorter leash — it holds place */
      sideDrift: 0.16, yClamp: 0.22,
      idleAfter: 2600            /* ms without a mouse → dock home */
    };
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
    document.body.insertBefore(cv, document.body.firstChild);
    var E = makeEngine(cv);
    if (!E){ cv.remove(); return null; }
    var gl = E.gl, U = E.U;

    [].forEach.call(document.querySelectorAll('.wrap, .hero, nav.nav, footer, .app, .tabs, .cc'), function(el){
      var cs = getComputedStyle(el);
      if (cs.position === 'static') el.style.position = 'relative';
      if (cs.zIndex === 'auto') el.style.zIndex = '1';
    });

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
        gl.bindTexture(gl.TEXTURE_2D, E.imgTex);
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

    var W, H, board;
    function fit(){
      var DPR = Math.min(devicePixelRatio || 1, 1.5);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform4f(U.uResolution, cv.width, cv.height, W >= H ? W / H : 1, W >= H ? 1 : H / W);
      var size = Math.min(Math.max(W, 800), 2000) / Math.max(W, 1000) * C.sizeDefault;
      gl.uniform1f(U.uSize, size * 1.35);
      board = makeBoard(Math.round(W / 2), Math.round(H / 2));
      board.render(0);
      E.uploadWorld(board.work);
    }
    fit();
    var rsT;
    addEventListener('resize', function(){ clearTimeout(rsT); rsT = setTimeout(fit, 180); }, {passive: true});

    var HOME = {x: 0, y: -0.05};
    var mouse = {x: HOME.x, y: HOME.y}, m1 = {x: HOME.x, y: HOME.y}, m2 = {x: HOME.x, y: HOME.y};
    var lerp1 = C.lerp1, lerp2 = C.lerp2, scrolling = false, scrollT = 0;
    var lastMouseT = -1e9, wanderT = 0, wLast = null;

    addEventListener('mousemove', function(e){
      if (scrolling) return;
      lastMouseT = performance.now(); wanderT = 0;
      mouse.x = (e.clientX / W - 0.5) * C.reach;
      mouse.y = (-e.clientY / H + 0.5) * C.reach;
    }, {passive: true});

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
    }, {passive: true});

    function orbPx(){
      return {x: (0.5 + m1.x * 0.6) * W, y: (0.5 - m1.y * 0.6) * H, r: Math.min(W, H) * 0.30};
    }
    function water(dt){
      var o = orbPx(), changed = false;
      for (var i = 0; i < board.comps.length; i++){
        var c = board.comps[i];
        var d = Math.hypot(c.x * 2 - o.x, c.y * 2 - o.y);
        var e0 = c.e;
        if (d < o.r * 1.05) c.e = Math.min(1, c.e + (1 - c.e) * 0.9 * dt);
        else c.e = Math.max(0, c.e - c.e * 0.28 * dt);
        if (Math.abs(c.e - e0) > 0.001) changed = true;
      }
      return changed;
    }

    var opacity = 0, t0 = performance.now(), last = t0, worldDirty = true;
    function draw(now){
      var t = (now - t0) / 1000 * C.displacementSpeed;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (scrolling && Date.now() - scrollT > 900){
        scrolling = false; lerp1 = C.lerp1; lerp2 = C.lerp2;
      }
      /* the wanderer: idle → visit a system, water it, move on */
      if (!scrolling && now - lastMouseT > C.idleAfter){
        if (now > wanderT){
          var cands = board.comps.filter(function(c){
            return c.kind !== 'choke' && c !== wLast; });
          var tw = 0, wts = cands.map(function(c){
            var wt = (1.15 - c.e) * Math.sqrt(c.w * c.h); tw += wt; return wt; });
          var pick = cands[0], rw = Math.random() * tw;
          for (var wi = 0; wi < cands.length; wi++){
            rw -= wts[wi]; if (rw <= 0){ pick = cands[wi]; break; } }
          wLast = pick;
          mouse.x = Math.max(-0.55, Math.min(0.55, ((pick.x * 2) / W - 0.5) / 0.6));
          mouse.y = Math.max(-0.55, Math.min(0.55, (0.5 - (pick.y * 2) / H) / 0.6));
          wanderT = now + 3800 + Math.random() * 3400;
        }
      }
      var f1 = 1 - Math.pow(1 - lerp1, dt * 60);
      var f2 = 1 - Math.pow(1 - lerp2, dt * 60);
      m1.x += (mouse.x - m1.x) * f1; m1.y += (mouse.y - m1.y) * f1;
      m2.x += (m1.x - m2.x) * f2;   m2.y += (m1.y - m2.y) * f2;
      opacity += (1 - opacity) * (1 - Math.pow(0.965, dt * 60));
      imgOpacity += (imgTarget - imgOpacity) * (1 - Math.pow(0.95, dt * 60));

      if (water(dt) || worldDirty){
        var ob = orbPx();
        board.render((now - t0) / 1000, {x: ob.x / 2, y: ob.y / 2, r: ob.r / 2});
        E.uploadWorld(board.work);
        worldDirty = board.comps.some(function(c){ return c.e > 0.02; });
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
    if (RM){ opacity = 1; draw(t0 + 32); }
    else {
      var running = true, raf = 0;
      var loop = function(now){
        if (!running){ raf = 0; return; }
        draw(now);
        raf = requestAnimationFrame(loop);
      };
      document.addEventListener('visibilitychange', function(){
        running = !document.hidden;
        if (running && !raf) raf = requestAnimationFrame(loop);
      });
      raf = requestAnimationFrame(loop);
    }

    return {
      setImage: setImage,
      clearImage: function(){ imgTarget = 0; },
      state: function(){
        var lit = board.comps.filter(function(c){ return c.e > 0.1; });
        return {chips: board.comps.length, lit: lit.length, orb: orbPx(),
                litKinds: lit.map(function(c){ return c.kind; }), mcc: board.mcc()};
      },
      board: function(){ board.render(1, null); return board.work.toDataURL('image/png'); },
      shot: function(){ draw(performance.now()); return cv.toDataURL('image/png'); }
    };
  }

  /* ════════ MINI MODE — the orblet, the same glass ════════ */
  function initMini(cv, opts){
    opts = opts || {};
    var CSS = opts.size || 54;
    var DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = cv.height = Math.round(CSS * DPR);
    var E = makeEngine(cv);
    if (!E){ cv.style.display = 'none'; return null; }
    var gl = E.gl, U = E.U;
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform4f(U.uResolution, cv.width, cv.height, 1, 1);
    gl.uniform1f(U.uSize, 0.62);
    gl.uniform2f(U.uMouse1, 0, 0);
    gl.uniform2f(U.uMouse2, 0, 0);
    gl.uniform1f(U.uImageOpacity, 0);
    gl.uniform1f(U.uOpacity, 1);

    var strip = makeStrip(opts.order || ['trax', 'init', 'semble', 'me']);
    strip.render(0);
    E.uploadWorld(strip.work);

    /* the window: the mini canvas samples a slice of the strip at p ∈ [0,1] */
    var p = 0.125, targetP = 0.125, activeIdx = 0, barW = opts.barW || 375;
    function setWorld(){
      /* one system fills the window — a quarter of the strip, centered on p */
      var k = 0.27;
      gl.uniform4f(U.uWorld, k, 1, p - k * 0.5, 0);
    }
    var t0 = performance.now(), last = t0, x = -1e4, tx = 0;
    function draw(now){
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      var f = 1 - Math.pow(1 - 0.14, dt * 60);
      p += (targetP - p) * f;
      if (x < -9000) x = tx;
      x += (tx - x) * f;
      cv.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
      var changed = false;
      strip.comps.forEach(function(c, i){
        var e0 = c.e;
        if (i === activeIdx) c.e = Math.min(1, c.e + (1 - c.e) * 1.4 * dt);
        else c.e = Math.max(0, c.e - c.e * 0.5 * dt);
        if (Math.abs(c.e - e0) > 0.001) changed = true;
      });
      if (changed){
        strip.render((now - t0) / 1000);
        E.uploadWorld(strip.work);
      }
      setWorld();
      gl.uniform1f(U.uTime, (now - t0) / 1000 * 0.22);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    draw(t0 + 16);
    if (!RM){
      var running = true, raf2 = 0;
      var mloop = function(now){
        if (!running){ raf2 = 0; return; }
        draw(now);
        raf2 = requestAnimationFrame(mloop);
      };
      document.addEventListener('visibilitychange', function(){
        running = !document.hidden;
        if (running && !raf2) raf2 = requestAnimationFrame(mloop);
      });
      raf2 = requestAnimationFrame(mloop);
    }
    return {
      set: function(px, idx, bw){
        tx = px; activeIdx = idx;
        if (bw) barW = bw;
        targetP = Math.max(0, Math.min(1, (px + CSS / 2) / Math.max(barW, 1)));
        if (RM){ x = tx; p = targetP; draw(performance.now()); }
      },
      shot: function(){ draw(performance.now()); return cv.toDataURL('image/png'); },
      state: function(){ return {p: +p.toFixed(3), x: +x.toFixed(1), active: activeIdx,
        lit: strip.comps.map(function(c){ return +c.e.toFixed(2); })}; }
    };
  }

  var full = initFull();
  window.SembleOrb = {
    setImage: full ? full.setImage : function(){},
    clearImage: full ? full.clearImage : function(){},
    state: full ? full.state : function(){ return null; },
    board: full ? full.board : function(){ return null; },
    shot: full ? full.shot : function(){ return null; },
    mini: initMini
  };
})();
