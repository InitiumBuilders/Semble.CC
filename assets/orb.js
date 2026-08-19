/* ═══════════════════════════════════════════════════════════
   THE HELD ORB v4 — a window into the backend.
   Beneath every page: the SEMBLE MAINBOARD — the stack, etched
   in silicon. Literal PCB anatomy (QFP leads, exposed dies, VRM
   chokes, gold edge fingers, 45° routing, silkscreen), each
   component a system we shipped:
     U1  CC CORES   — six-core processor (the six-word guide)
     SCC ×3        — Semble Compute Cores: four linked SCUs each
     MCC            — the Motus Compute Core, gold; ignites only
                      when thresholds are crossed elsewhere
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
  'float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(0.5,0.866025)),p.x);}\n' +
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
  '    float hc=clamp(uResolution.x/64.0,9.0,34.0);' +
  '    vec2 hp=(vUv-vec2(0.5))*uResolution.zw*hc;' +
  '    hp+=0.24*vec2(sin(hp.y*0.85+uTime*0.7),sin(hp.x*0.85-uTime*0.6));' +
  '    vec2 hr2=vec2(1.0,1.732051);' +
  '    vec2 ha=mod(hp,hr2)-hr2*0.5;' +
  '    vec2 hb=mod(hp-hr2*0.5,hr2)-hr2*0.5;' +
  '    vec2 hgv=(dot(ha,ha)<dot(hb,hb))?ha:hb;' +
  '    float hedge=smoothstep(0.435,0.5,hexD(hgv));' +
  '    finalColor.rgb*=1.0-hedge*0.20*clamp(1.0-fres,0.35,1.0);' +
  '  } else { finalColor.a=0.0; }' +
  '  if(t>tMax&&t<(tMax+uGlow)){finalColor.rgb=vec3(1.0);finalColor.a=mapTo(t,tMax,tMax+uGlow,1.0,0.0);}' +
  '  gl_FragColor=finalColor;gl_FragColor.a*=uOpacity;}';

  /* ════════ THE COMPONENT LIBRARY — silicon, made physical ════════
     Each core construct carries its own light:
       cyan CC CORES · violet TRAX · ice STEPS · teal SCU fabric ·
       aqua SCC cores · rose CROSSING · amber !MOTUS · gold MCC.
     The body stays black; color lives only where energy does.     */
  var INK  = 'rgba(178,216,240,';         /* silkscreen  */
  var TRC  = 'rgba(56,112,164,';          /* copper, unlit */
  var LIT  = 'rgba(112,222,255,';         /* copper, charged */
  var ACC = {
    cpu: '92,225,255',  gpu: '84,186,242', ram: '150,205,255',
    scu: '96,232,210',  scc: '104,216,235', brg: '130,200,255',
    mcc: '236,204,138', xtal: '224,234,244', rom: '255,216,150',
    choke: '255,192,112', phy: '92,225,255', loop: '124,214,255',
    guide: '255,216,150', seats: '92,225,255',
    models: '104,216,235', commons: '96,232,210'
  };
  function acc(c){ return 'rgba(' + (ACC[c.kind] || '92,225,255') + ','; }
  var A2k = acc;

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

  function drop(g, x, y, w, h, r){
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.38)';
    g.shadowBlur = 24; g.shadowOffsetY = 7;
    g.fillStyle = 'rgba(4,7,12,0.85)';
    rr(g, x, y, w, h, r); g.fill();
    g.restore();
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 9; g.shadowOffsetY = 3;
    g.fillStyle = 'rgba(5,9,15,0.92)';
    rr(g, x, y, w, h, r); g.fill();
    g.restore();
  }

  function speckle(g, x, y, w, h, seed){
    var r = lcg(seed), n = Math.min(400, Math.round(w * h / 34));
    for (var i = 0; i < n; i++){
      g.fillStyle = r() > 0.5 ? 'rgba(160,190,215,0.05)' : 'rgba(0,0,0,0.13)';
      g.fillRect(x + 1 + r() * (w - 2), y + 1 + r() * (h - 2), 1, 1);
    }
  }

  function etch(g, x, y, txt, size, e, align, accStr){
    g.font = '600 ' + size + 'px ui-monospace, "Cascadia Mono", Consolas, monospace';
    g.textAlign = align || 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillText(txt, Math.round(x), Math.round(y) + 1);
    g.fillStyle = (accStr && e > 0.15 ? accStr : INK) + (0.72 + 0.28 * e).toFixed(3) + ')';
    g.fillText(txt, Math.round(x), Math.round(y));
  }

  /* laser 2D matrix + lot code — the marks real silicon wears */
  function dotCode(g, x, y, s, seed){
    var r = lcg(seed);
    g.fillStyle = 'rgba(190,215,235,0.4)';
    for (var i = 0; i < 5; i++)
      for (var j = 0; j < 5; j++)
        if (r() > 0.45) g.fillRect(x + i * s, y + j * s, s * 0.75, s * 0.75);
    g.strokeStyle = 'rgba(190,215,235,0.25)';
    g.lineWidth = 0.6;
    g.strokeRect(x - s * 0.4, y - s * 0.4, s * 5.4, s * 5.4);
  }

  function qfpLeads(g, x, y, w, h, pitch, len, e, accStr){
    var body = 'rgba(120,146,166,0.92)';
    var foot = 'rgba(220,238,250,' + (0.4 + 0.4 * e).toFixed(3) + ')';
    var chg  = (accStr || LIT) + (0.22 * e).toFixed(3) + ')';
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

  /* breakout stubs — the fan of traces every real QFP wears */
  function breakout(g, x, y, w, h, pitch, len){
    g.strokeStyle = 'rgba(56,112,164,0.28)';
    g.lineWidth = 0.8;
    var p, o = len + 1;
    g.beginPath();
    for (p = x + pitch; p < x + w - pitch * 0.6; p += pitch){
      g.moveTo(p + pitch * 0.21, y - o); g.lineTo(p + pitch * 0.21, y - o - len * 2.2);
      g.moveTo(p + pitch * 0.21, y + h + o); g.lineTo(p + pitch * 0.21, y + h + o + len * 2.2);
    }
    for (p = y + pitch; p < y + h - pitch * 0.6; p += pitch){
      g.moveTo(x - o, p + pitch * 0.21); g.lineTo(x - o - len * 2.2, p + pitch * 0.21);
      g.moveTo(x + w + o, p + pitch * 0.21); g.lineTo(x + w + o + len * 2.2, p + pitch * 0.21);
    }
    g.stroke();
  }

  function pkg(g, x, y, w, h, e, r, seed, accStr){
    if (e > 0.03){
      g.save();
      g.shadowColor = (accStr || LIT) + (0.8 * e).toFixed(3) + ')';
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
    /* the studio light lives top-left — every body agrees */
    g.fillStyle = 'rgba(200,228,250,0.10)';
    g.fillRect(x + 2, y + 1, w - 4, 1);
    g.fillRect(x + 1, y + 2, 1, h - 4);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(x + 2, y + h - 2, w - 4, 1);
    g.fillRect(x + w - 2, y + 2, 1, h - 4);
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

  function die(g, x, y, w, h, e, glow, seed, accStr){
    var A = accStr || LIT;
    var grd = g.createLinearGradient(x, y, x + w, y + h);
    grd.addColorStop(0, 'rgba(96,170,220,' + (0.32 + 0.5 * e) + ')');
    grd.addColorStop(0.5, 'rgba(120,110,215,' + (0.26 + 0.4 * e) + ')');
    grd.addColorStop(1, 'rgba(52,90,180,' + (0.3 + 0.45 * e) + ')');
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
    if (w > 16 && h > 12){
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
      g.fillStyle = 'rgba(210,235,255,' + (0.22 + 0.4 * e).toFixed(3) + ')';
      for (var px = x + 3; px < x + w - 2; px += 3.2){
        g.fillRect(px, y + 0.8, 1.4, 1);
        g.fillRect(px, y + h - 1.8, 1.4, 1);
      }
      var sh = g.createLinearGradient(x, y + h, x + w, y);
      sh.addColorStop(0, 'rgba(140,240,255,0.10)');
      sh.addColorStop(0.5, 'rgba(255,255,255,0.02)');
      sh.addColorStop(1, 'rgba(170,140,255,0.10)');
      g.fillStyle = sh;
      g.fillRect(x, y, w, h);
    }
    g.strokeStyle = A + (0.3 + 0.5 * e).toFixed(3) + ')';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (glow && e > 0.03){
      g.save();
      g.shadowColor = A + (0.85 * e).toFixed(3) + ')';
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
    /* solder pads peeking out */
    g.fillStyle = 'rgba(140,160,175,0.35)';
    g.fillRect(x - 1.2, y + h * 0.15, 1.2, h * 0.7);
    g.fillRect(x + w, y + h * 0.15, 1.2, h * 0.7);
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

  /* the solder-ball array a package sits on — visible at its skirt */
  function bga(g, x, y, w, h, e){
    var p = Math.max(3.2, Math.min(w, h) * 0.055);
    g.fillStyle = 'rgba(150,168,182,' + (0.30 + 0.25 * e).toFixed(3) + ')';
    for (var bx = x + p; bx < x + w - p * 0.6; bx += p){
      g.beginPath(); g.arc(bx, y + h + p * 0.42, p * 0.30, 0, 6.29); g.fill();
      g.beginPath(); g.arc(bx, y - p * 0.42, p * 0.30, 0, 6.29); g.fill();
    }
    for (var by = y + p; by < y + h - p * 0.6; by += p){
      g.beginPath(); g.arc(x - p * 0.42, by, p * 0.30, 0, 6.29); g.fill();
      g.beginPath(); g.arc(x + w + p * 0.42, by, p * 0.30, 0, 6.29); g.fill();
    }
  }

  /* the substrate the die assembly is mounted on */
  function substrate(g, x, y, w, h, e){
    var m = Math.min(w, h) * 0.085;
    var sg = g.createLinearGradient(x - m, y - m, x + w + m, y + h + m);
    sg.addColorStop(0, 'rgba(26,38,52,0.96)');
    sg.addColorStop(0.5, 'rgba(18,28,40,0.96)');
    sg.addColorStop(1, 'rgba(12,20,30,0.96)');
    g.fillStyle = sg;
    rr(g, x - m, y - m, w + m * 2, h + m * 2, 3); g.fill();
    g.strokeStyle = 'rgba(150,180,205,' + (0.16 + 0.2 * e).toFixed(3) + ')';
    g.lineWidth = 1;
    rr(g, x - m + 0.5, y - m + 0.5, w + m * 2 - 1, h + m * 2 - 1, 3); g.stroke();
    /* substrate decoupling caps around the assembly */
    for (var cx2 = x - m * 0.4; cx2 < x + w + m * 0.4; cx2 += m * 0.85)
      smdCap(g, cx2, y + h + m * 0.18, m * 0.4, m * 0.24, e);
  }

  /* an HBM stack — the tell of a real accelerator */
  function hbm(g, x, y, w, h, e, t, ph){
    var lay = 5, lh = h / lay;
    for (var i = 0; i < lay; i++){
      var lg = g.createLinearGradient(x, y + i * lh, x + w, y + i * lh + lh);
      var li = 0.13 + 0.05 * (lay - i);
      lg.addColorStop(0, 'rgba(' + Math.round(70 + 60 * li) + ',' +
                          Math.round(90 + 70 * li) + ',' + Math.round(112 + 80 * li) + ',0.96)');
      lg.addColorStop(1, 'rgba(30,42,56,0.96)');
      g.fillStyle = lg;
      g.fillRect(x, y + i * lh, w, lh - 0.7);
      g.fillStyle = 'rgba(200,222,238,0.10)';
      g.fillRect(x, y + i * lh, w, 0.7);
    }
    if (e > 0.03){
      var band = (t * 0.5 + ph) % 1;
      var byy = y + band * (h - lh);
      g.save();
      g.shadowColor = 'rgba(120,225,255,' + (0.8 * e).toFixed(3) + ')';
      g.shadowBlur = 9 * e;
      g.fillStyle = 'rgba(150,235,255,' + (0.34 * e).toFixed(3) + ')';
      g.fillRect(x, byy, w, lh * 0.55);
      g.restore();
    }
    g.strokeStyle = 'rgba(180,210,235,' + (0.24 + 0.4 * e).toFixed(3) + ')';
    g.lineWidth = 0.9;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  /* the integrated heat spreader — brushed nickel, bevelled, notched */
  function ihs(g, x, y, w, h, e){
    var bev = Math.min(w, h) * 0.14;
    var lg = g.createLinearGradient(x, y, x + w, y + h);
    lg.addColorStop(0, 'rgba(196,210,222,0.95)');
    lg.addColorStop(0.35, 'rgba(128,144,158,0.95)');
    lg.addColorStop(0.62, 'rgba(168,184,198,0.95)');
    lg.addColorStop(1, 'rgba(96,110,124,0.95)');
    g.fillStyle = lg;
    rr(g, x, y, w, h, 2.5); g.fill();
    /* the bevel */
    g.strokeStyle = 'rgba(226,238,248,0.55)';
    g.lineWidth = 1.1;
    rr(g, x + bev * 0.5, y + bev * 0.5, w - bev, h - bev, 2); g.stroke();
    g.strokeStyle = 'rgba(30,40,50,0.55)';
    rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 2.5); g.stroke();
    /* brushed grain */
    var br = lcg(Math.round(x * 13 + y * 7));
    g.strokeStyle = 'rgba(255,255,255,0.045)';
    g.lineWidth = 0.6;
    for (var i = 0; i < 26; i++){
      var gy2 = y + br() * h;
      g.beginPath(); g.moveTo(x + 1, gy2); g.lineTo(x + w - 1, gy2); g.stroke();
    }
    /* the corner notch every lid has */
    g.fillStyle = 'rgba(40,52,64,0.85)';
    g.beginPath();
    g.moveTo(x + w, y); g.lineTo(x + w - bev, y); g.lineTo(x + w, y + bev);
    g.closePath(); g.fill();
    if (e > 0.03){
      g.save();
      g.shadowColor = 'rgba(120,225,255,' + (0.55 * e).toFixed(3) + ')';
      g.shadowBlur = 16 * e;
      g.strokeStyle = 'rgba(150,235,255,' + (0.35 * e).toFixed(3) + ')';
      g.lineWidth = 1.2;
      rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 2.5); g.stroke();
      g.restore();
    }
  }

  function stiffener(g, dx, dy, dw, dh){
    var m2 = 4.5;
    var sg = g.createLinearGradient(dx - m2, dy - m2, dx + dw + m2, dy + dh + m2);
    sg.addColorStop(0, 'rgba(190,205,215,0.55)');
    sg.addColorStop(0.5, 'rgba(110,125,138,0.45)');
    sg.addColorStop(1, 'rgba(205,220,230,0.55)');
    g.strokeStyle = sg; g.lineWidth = 2.4;
    g.strokeRect(dx - m2, dy - m2, dw + m2 * 2, dh + m2 * 2);
    g.fillStyle = 'rgba(210,225,235,0.5)';
    [[dx - m2, dy - m2], [dx + dw + m2, dy - m2],
     [dx - m2, dy + dh + m2], [dx + dw + m2, dy + dh + m2]].forEach(function(p2){
      g.beginPath(); g.arc(p2[0], p2[1], 1.3, 0, 6.29); g.fill();
    });
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
    var surge = c.surge || 0;
    var pulse = e > 0.02
      ? Math.min(1.25, e * (0.8 + 0.2 * Math.sin(t * 1.6 + c.phase)) + surge * 0.55)
      : surge * 0.5;
    if (surge > 0.05){
      /* the whole body blooms as the release lands */
      g.save();
      g.shadowColor = acc(c) + (0.9 * surge).toFixed(3) + ')';
      g.shadowBlur = 34 * surge;
      g.fillStyle = acc(c) + (0.14 * surge).toFixed(3) + ')';
      rr(g, x - 3, y - 3, w + 6, h + 6, 6);
      g.fill();
      g.restore();
    }
    var u = c.u, i;
    var seed = Math.round(c.x * 31 + c.y * 17);
    var A = acc(c);

    if (c.kind === 'cpu'){
      breakout(g, x, y, w, h, Math.max(4, u * 0.16), u * 0.14);
      drop(g, x, y, w, h, 4);
      qfpLeads(g, x, y, w, h, Math.max(4, u * 0.16), u * 0.14, pulse, A);
      pkg(g, x, y, w, h, pulse, 4, seed, A);
      pin1(g, x + u * 0.2, y + u * 0.2, pulse);
      dotCode(g, x + w - u * 0.5, y + u * 0.18, u * 0.055, seed);
      for (i = 0; i < 6; i++)
        smdCap(g, x + w * 0.18 + i * w * 0.115, y + h - u * 0.18, u * 0.09, u * 0.06, pulse);
      var dw = w * 0.62, dh = h * 0.56, dx = c.x - dw / 2, dy = c.y - dh / 2 - u * 0.06;
      substrate(g, dx - u * 0.3, dy - u * 0.3, dw + u * 0.6, dh + u * 0.6, pulse);
      stiffener(g, dx, dy, dw, dh);
      die(g, dx, dy, dw, dh, pulse * 0.4, false, seed, A);
      var lit = Math.ceil(6 * Math.min(1, e * 1.1));
      var k = 0;
      for (var ry = 0; ry < 2; ry++) for (var rx = 0; rx < 3; rx++){
        var cx2 = dx + dw * (rx + 0.5) / 3, cy2 = dy + dh * (ry + 0.5) / 2;
        var cw2 = dw / 3 - 3, ch2 = dh / 2 - 3;
        var on = k < lit && e > 0.03;
        var cp = on ? (0.55 + 0.45 * Math.sin(t * 2.1 + c.phase + k * 0.9)) * pulse : 0;
        die(g, cx2 - cw2 / 2, cy2 - ch2 / 2, cw2, ch2, cp, on, seed + k, A);
        k++;
      }
      /* the lid closes over the cores until energy opens it */
      if (e < 0.55){
        var lidA = 1 - Math.max(0, (e - 0.2) / 0.35);
        g.save();
        g.globalAlpha = lidA;
        ihs(g, dx - u * 0.34, dy - u * 0.34, dw + u * 0.68, dh + u * 0.68, pulse);
        etch(g, c.x, c.y - u * 0.06, 'SEMBLE', Math.max(6, u * 0.24), 0);
        etch(g, c.x, c.y + u * 0.24, 'CC-6C', Math.max(5, u * 0.17), 0);
        g.restore();
      }
      bga(g, x, y, w, h, pulse);
      etch(g, c.x, y + h - u * 0.42, 'CC CORES', Math.max(6, u * 0.26), pulse, null, A);
      etch(g, c.x, y + h - u * 0.18, 'SMBL-6C-2643', Math.max(4.5, u * 0.13), 0);
      etch(g, x - u * 0.34, y - u * 0.3, 'U1', Math.max(5, u * 0.2), pulse);
      etch(g, x + u * 0.55, y + h + u * 0.36, '2643-B', Math.max(4.5, u * 0.14), 0, 'left');

    } else if (c.kind === 'gpu'){
      breakout(g, x, y, w, h, Math.max(4, u * 0.16), u * 0.12);
      drop(g, x, y, w, h, 4);
      qfpLeads(g, x, y, w, h, Math.max(4, u * 0.16), u * 0.12, pulse, A);
      pkg(g, x, y, w, h, pulse, 4, seed, A);
      pin1(g, x + u * 0.18, y + u * 0.18, pulse);
      dotCode(g, x + w - u * 0.48, y + u * 0.16, u * 0.05, seed + 9);
      var gw = w * 0.44, gh = h * 0.6, gx2 = c.x - gw / 2, gy2 = c.y - gh / 2;
      stiffener(g, gx2, gy2, gw, gh);
      die(g, gx2, gy2, gw, gh, pulse * 0.6, pulse > 0.03, seed, A);
      /* substrate micro-caps flanking the die */
      for (i = 0; i < 5; i++)
        smdCap(g, gx2 + i * gw * 0.2, gy2 + gh + 3.2, u * 0.07, u * 0.05, pulse);
      var pts = [[0.06,0.7],[0.22,0.52],[0.4,0.6],[0.58,0.34],[0.76,0.44],[0.94,0.22]];
      g.beginPath();
      for (i = 0; i < pts.length; i++){
        var px2 = gx2 + gw * pts[i][0], py2 = gy2 + gh * pts[i][1];
        if (i === 0) g.moveTo(px2, py2); else g.lineTo(px2, py2);
      }
      g.strokeStyle = 'rgba(210,200,255,' + (0.25 + 0.75 * pulse).toFixed(3) + ')';
      g.lineWidth = 1.5;
      if (e > 0.03){
        g.save();
        g.setLineDash([300]);
        g.lineDashOffset = 300 * (1 - Math.min(1, e * 1.15));
        g.shadowColor = A + (0.9 * pulse).toFixed(3) + ')';
        g.shadowBlur = 10 * pulse;
        g.stroke();
        g.restore();
      } else g.stroke();
      var ge = Math.max(0, (e - 0.55) / 0.45);
      for (i = 0; i < 4; i++){
        var mx = i < 2 ? x + u * 0.26 : x + w - u * 0.26 - u * 0.46;
        var my = c.y - h * 0.26 + (i % 2) * h * 0.28;
        hbm(g, mx, my, u * 0.46, h * 0.24, ge * pulse, t, i * 0.31);
      }
      etch(g, c.x, y + h - u * 0.3, 'TRAX GFX', Math.max(6, u * 0.24), pulse, null, A);
      etch(g, x - u * 0.34, y - u * 0.28, 'U2', Math.max(5, u * 0.2), pulse);

    } else if (c.kind === 'ram'){
      drop(g, x, y, w, h, 3);
      pkg(g, x, y, w, h, pulse, 3, seed, A);
      var n = 8, litC = Math.ceil(n * Math.min(1, e * 1.05));
      for (i = 0; i < n; i++){
        var rx2 = x + w * 0.05 + i * (w * 0.9 / n), rw = w * 0.9 / n - 3;
        var on2 = i < litC && e > 0.03;
        var cp2 = on2 ? (0.55 + 0.45 * Math.sin(t * 2.4 + c.phase + i * 0.8)) * pulse : 0;
        die(g, rx2, y + h * 0.2, rw, h * 0.6, cp2, on2, seed + i, A);
      }
      g.fillStyle = 'rgba(201,168,106,' + (0.5 + 0.3 * pulse) + ')';
      for (i = 0; i < 14; i++){
        if (i === 9) continue;
        g.fillRect(x + w * 0.06 + i * w * 0.064, y + h - 2.5, w * 0.036, 2.5);
      }
      etch(g, x - u * 0.32, c.y, c.label, Math.max(5, u * 0.2), pulse);

    } else if (c.kind === 'choke'){
      drop(g, x, y, w, h, 3);
      pkg(g, x, y, w, h, pulse, 3, seed, A);
      g.beginPath(); g.arc(c.x, c.y, w * 0.3, 0, 6.29);
      g.strokeStyle = 'rgba(160,200,230,' + (0.35 + 0.6 * pulse).toFixed(3) + ')';
      g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(c.x, c.y, w * 0.1, 0, 6.29);
      g.fillStyle = 'rgba(160,200,230,' + (0.25 + 0.6 * pulse).toFixed(3) + ')';
      g.fill();
      if (e > 0.03){
        g.save();
        g.shadowColor = A + (0.9 * pulse).toFixed(3) + ')';
        g.shadowBlur = 12 * pulse;
        g.beginPath(); g.arc(c.x, c.y, w * 0.3, 0, 6.29); g.stroke();
        g.restore();
      }
      etch(g, c.x, y + h + u * 0.22, c.label || 'R15', Math.max(5, u * 0.16), pulse);

    } else if (c.kind === 'xtal'){
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
      g.fillStyle = 'rgba(225,240,250,0.5)';
      g.beginPath(); g.arc(x + h * 0.5, c.y, 1, 0, 6.29); g.fill();
      g.beginPath(); g.arc(x + w - h * 0.5, c.y, 1, 0, 6.29); g.fill();
      if (e > 0.03){
        g.save();
        g.shadowColor = A + (0.8 * e * tick).toFixed(3) + ')';
        g.shadowBlur = 14 * e;
        g.strokeStyle = 'rgba(230,240,250,' + (0.6 * e * tick).toFixed(3) + ')';
        rr(g, x, y, w, h, h / 2); g.stroke();
        g.restore();
      }
      etch(g, c.x, y + h + u * 0.24, 'X1 SESH', Math.max(5, u * 0.18), e);

    } else if (c.kind === 'rom'){
      drop(g, x, y, w, h, 2.5);
      qfpLeads(g, x, y, w, h, Math.max(3.5, u * 0.18), u * 0.12, pulse, A);
      pkg(g, x, y, w, h, pulse, 2.5, seed, A);
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
      g.save();
      g.translate(c.x, c.y); g.rotate(Math.PI / 4);
      drop(g, -w / 2, -h / 2, w, h, 3);
      qfpLeads(g, -w / 2, -h / 2, w, h, Math.max(4, u * 0.16), u * 0.12, pulse, A);
      pkg(g, -w / 2, -h / 2, w, h, pulse, 3, seed, A);
      var e1 = Math.min(1, e * 2), e2 = Math.max(0, e * 2 - 1);
      die(g, -w * 0.36, -h * 0.36, w * 0.32, h * 0.72, e1 * pulse, e1 > 0.05 && e > 0.03, seed, A);
      die(g, w * 0.04, -h * 0.36, w * 0.32, h * 0.72, e2 * pulse, e2 > 0.05, seed + 3, A);
      g.restore();
      etch(g, c.x, c.y + h * 0.85 + u * 0.2, 'CROSSING', Math.max(5, u * 0.19), pulse, null, A);

    } else if (c.kind === 'scu'){
      /* SCU ARRAY — a real accelerator module: interposer, compute die
         flanked by HBM stacks, all on substrate under a stiffener frame.
         The fabric lattice is the die's own floorplan. */
      substrate(g, x, y, w, h, pulse);
      bga(g, x - w * 0.085, y - h * 0.085, w * 1.17, h * 1.17, pulse);
      var chm = w * 0.16;
      var oct = function(){
        g.beginPath();
        g.moveTo(x + chm, y);
        g.lineTo(x + w - chm, y); g.lineTo(x + w, y + chm);
        g.lineTo(x + w, y + h - chm); g.lineTo(x + w - chm, y + h);
        g.lineTo(x + chm, y + h); g.lineTo(x, y + h - chm);
        g.lineTo(x, y + chm); g.closePath();
      };
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      oct(); g.fillStyle = '#0a1524'; g.fill();
      g.restore();
      if (e > 0.03){
        g.save();
        g.shadowColor = A + (0.8 * e).toFixed(3) + ')';
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
      g.fillStyle = 'rgba(201,168,106,0.6)';
      g.fillRect(x + 1.5, y + 1.5, chm * 0.5, chm * 0.5);
      g.fillRect(x + w - 1.5 - chm * 0.5, y + 1.5, chm * 0.5, chm * 0.5);
      g.fillRect(x + 1.5, y + h - 1.5 - chm * 0.5, chm * 0.5, chm * 0.5);
      g.fillRect(x + w - 1.5 - chm * 0.5, y + h - 1.5 - chm * 0.5, chm * 0.5, chm * 0.5);
      dotCode(g, x + w - u * 0.52, y + u * 0.3, u * 0.05, seed + 21);
      /* the interposer: compute die centre, four HBM stacks flanking */
      var ipw = w * 0.78, iph = h * 0.62;
      var ipx = c.x - ipw / 2, ipy = c.y - iph / 2 - u * 0.08;
      stiffener(g, ipx, ipy, ipw, iph);
      var stw = ipw * 0.13, sth = iph * 0.66;
      for (i = 0; i < 4; i++){
        var sxx = i < 2 ? ipx + stw * (0.18 + i * 1.12)
                        : ipx + ipw - stw * (1.3 + (i - 2) * 1.12);
        hbm(g, sxx, c.y - sth / 2 - u * 0.08, stw, sth, pulse, t, i * 0.27);
      }
      var hr = w * 0.075, cx3 = c.x, cy3 = c.y - u * 0.08;
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
        g.fillStyle = 'rgba(70,170,190,' + (0.10 + 0.5 * te).toFixed(3) + ')';
        g.fill();
        g.strokeStyle = A + (0.22 + 0.6 * te).toFixed(3) + ')';
        g.lineWidth = 0.9;
        if (te > 0.25){
          g.save();
          g.shadowColor = A + (0.8 * te).toFixed(3) + ')';
          g.shadowBlur = 9 * te;
          g.stroke();
          g.restore();
          g.beginPath(); g.arc(hx, hy, 1.1, 0, 6.29);
          g.fillStyle = 'rgba(220,250,245,' + (0.85 * te).toFixed(3) + ')';
          g.fill();
        } else g.stroke();
      }
      etch(g, c.x, y + h - u * 0.3, 'SCU ARRAY', Math.max(6, u * 0.22), pulse, null, A);

    } else if (c.kind === 'scc'){
      /* SCC — a Semble Compute Core: four SCUs linked, on real substrate */
      breakout(g, x, y, w, h, Math.max(3.5, u * 0.17), u * 0.11);
      substrate(g, x, y, w, h, pulse);
      bga(g, x, y, w, h, pulse);
      drop(g, x, y, w, h, 3);
      qfpLeads(g, x, y, w, h, Math.max(3.5, u * 0.17), u * 0.11, pulse, A);
      pkg(g, x, y, w, h, pulse, 3, seed, A);
      pin1(g, x + u * 0.13, y + u * 0.13, pulse);
      var hr2 = w * 0.14;
      var q = [[-1.05, 0], [0, -1.05], [1.05, 0], [0, 1.05]];
      /* the links first, then the units */
      g.beginPath();
      for (i = 0; i < 4; i++){
        g.moveTo(c.x, c.y);
        g.lineTo(c.x + q[i][0] * hr2 * 1.6, c.y + q[i][1] * hr2 * 1.6);
      }
      g.strokeStyle = A + (0.25 + 0.55 * pulse).toFixed(3) + ')';
      g.lineWidth = 1; g.stroke();
      for (i = 0; i < 4; i++){
        var qe = Math.max(0, Math.min(1, e * 4.4 - i));
        var qt = qe > 0 && e > 0.03
          ? qe * (0.6 + 0.4 * Math.sin(t * 2.8 + c.phase + i * 1.2)) : 0;
        var qx = c.x + q[i][0] * hr2 * 1.6, qy = c.y + q[i][1] * hr2 * 1.6;
        hexPath(g, qx, qy, hr2 * 0.8);
        g.fillStyle = 'rgba(70,150,220,' + (0.12 + 0.5 * qt).toFixed(3) + ')';
        g.fill();
        g.strokeStyle = A + (0.25 + 0.6 * qt).toFixed(3) + ')';
        g.lineWidth = 0.9;
        if (qt > 0.25){
          g.save();
          g.shadowColor = A + (0.8 * qt).toFixed(3) + ')';
          g.shadowBlur = 8 * qt;
          g.stroke(); g.restore();
        } else g.stroke();
      }
      g.beginPath(); g.arc(c.x, c.y, 1.3, 0, 6.29);
      g.fillStyle = 'rgba(220,245,255,' + (0.3 + 0.6 * pulse).toFixed(3) + ')';
      g.fill();
      etch(g, c.x, y + h + u * 0.24, c.label || 'SCC', Math.max(5, u * 0.18), pulse, null, A);

    } else if (c.kind === 'mcc'){
      /* MCC — the Motus Compute Core. Gold. It cannot be watered;
         it ignites only when thresholds are crossed elsewhere. */
      breakout(g, x, y, w, h, Math.max(4, u * 0.17), u * 0.12);
      drop(g, x, y, w, h, 4);
      qfpLeads(g, x, y, w, h, Math.max(4, u * 0.17), u * 0.12, pulse, A);
      pkg(g, x, y, w, h, pulse, 4, seed, A);
      /* the gold lid ring */
      var lg = g.createLinearGradient(x, y, x + w, y + h);
      lg.addColorStop(0, 'rgba(232,205,150,' + (0.5 + 0.4 * pulse) + ')');
      lg.addColorStop(0.5, 'rgba(160,132,80,' + (0.35 + 0.3 * pulse) + ')');
      lg.addColorStop(1, 'rgba(226,198,140,' + (0.5 + 0.4 * pulse) + ')');
      g.strokeStyle = lg;
      g.lineWidth = 2;
      rr(g, x + u * 0.22, y + u * 0.22, w - u * 0.44, h - u * 0.44, 3); g.stroke();
      var mdw = w * 0.46, mdh = h * 0.42;
      var mdx = c.x - mdw / 2, mdy = c.y - mdh / 2;
      if (e > 0.03){
        g.save();
        g.shadowColor = A + (0.9 * pulse).toFixed(3) + ')';
        g.shadowBlur = 20 * pulse;
        g.fillStyle = 'rgba(60,48,26,0.9)';
        g.fillRect(mdx, mdy, mdw, mdh);
        g.restore();
      }
      var mg = g.createLinearGradient(mdx, mdy, mdx + mdw, mdy + mdh);
      mg.addColorStop(0, 'rgba(210,180,120,' + (0.25 + 0.6 * pulse) + ')');
      mg.addColorStop(0.5, 'rgba(120,96,54,' + (0.3 + 0.35 * pulse) + ')');
      mg.addColorStop(1, 'rgba(236,210,150,' + (0.25 + 0.6 * pulse) + ')');
      g.fillStyle = mg;
      g.fillRect(mdx, mdy, mdw, mdh);
      g.strokeStyle = A + (0.4 + 0.55 * pulse).toFixed(3) + ')';
      g.lineWidth = 1;
      g.strokeRect(mdx + 0.5, mdy + 0.5, mdw - 1, mdh - 1);
      /* the threshold mark: a triangle inside, lit only at ignition */
      g.beginPath();
      g.moveTo(c.x, mdy + mdh * 0.22);
      g.lineTo(c.x + mdw * 0.22, mdy + mdh * 0.75);
      g.lineTo(c.x - mdw * 0.22, mdy + mdh * 0.75);
      g.closePath();
      g.strokeStyle = 'rgba(255,240,200,' + (0.25 + 0.7 * pulse).toFixed(3) + ')';
      g.stroke();
      dotCode(g, x + w - u * 0.46, y + u * 0.16, u * 0.045, seed + 33);
      etch(g, c.x, y + h - u * 0.28, 'MCC · MOTUS', Math.max(5.5, u * 0.2), pulse, null, A);

    } else if (c.kind === 'guide'){
      /* THE GUIDE — six words in a row; watered, they speak in order */
      drop(g, x, y, w, h, 2.5);
      pkg(g, x, y, w, h, pulse, 2.5, seed, A2k(c));
      var gl2 = Math.ceil(6 * Math.min(1, e * 1.08));
      for (i = 0; i < 6; i++){
        var gon = i < gl2 && e > 0.03;
        var gcp = gon ? (0.55 + 0.45 * Math.sin(t * 2.2 + c.phase + i * 1.05)) * pulse : 0;
        die(g, x + w * 0.08 + i * w * 0.145, y + h * 0.26, w * 0.115, h * 0.48,
            gcp, gon, seed + i, A2k(c));
      }
      etch(g, c.x, y + h + u * 0.24, 'GUIDE', Math.max(5, u * 0.18), pulse, null, A2k(c));

    } else if (c.kind === 'seats'){
      /* SEATS — the header people plug into; watered, the seats fill */
      drop(g, x, y, w, h, 2.5);
      pkg(g, x, y, w, h, pulse, 2.5, seed);
      var srow = 6, sfill = Math.ceil(srow * 2 * Math.min(1, e * 1.05));
      var kx = 0;
      for (var sr = 0; sr < 2; sr++)
        for (i = 0; i < srow; i++){
          var hx3 = x + w * 0.14 + i * w * 0.145, hy3 = y + h * (sr ? 0.66 : 0.34);
          g.beginPath(); g.arc(hx3, hy3, u * 0.085, 0, 6.29);
          g.fillStyle = '#03060b'; g.fill();
          g.strokeStyle = 'rgba(201,168,106,0.7)';
          g.lineWidth = 1; g.stroke();
          var son = kx < sfill && e > 0.03;
          if (son){
            var scp = (0.5 + 0.5 * Math.sin(t * 2.6 + c.phase + kx * 0.7)) * pulse;
            g.beginPath(); g.arc(hx3, hy3, u * 0.045, 0, 6.29);
            g.fillStyle = 'rgba(210,245,255,' + (0.4 + 0.55 * scp).toFixed(3) + ')';
            g.save();
            g.shadowColor = A2k(c) + (0.85 * scp).toFixed(3) + ')';
            g.shadowBlur = 7;
            g.fill();
            g.restore();
          }
          kx++;
        }
      etch(g, c.x, y + h + u * 0.24, 'SEATS', Math.max(5, u * 0.18), pulse, null, A2k(c));

    } else if (c.kind === 'models'){
      /* MODELS — four dies, four patterns: the C-models a room can run */
      drop(g, x, y, w, h, 3);
      qfpLeads(g, x, y, w, h, Math.max(3.5, u * 0.17), u * 0.11, pulse, A2k(c));
      pkg(g, x, y, w, h, pulse, 3, seed, A2k(c));
      pin1(g, x + u * 0.13, y + u * 0.13, pulse);
      var mq = [[0.28, 0.3], [0.72, 0.3], [0.28, 0.7], [0.72, 0.7]];
      for (i = 0; i < 4; i++){
        var me2 = Math.max(0, Math.min(1, e * 4.4 - i));
        var mt2 = me2 > 0 && e > 0.03
          ? me2 * (0.6 + 0.4 * Math.sin(t * 2.5 + c.phase + i * 1.3)) : 0;
        var mx3 = x + w * mq[i][0], my3 = y + h * mq[i][1];
        var ms2 = w * 0.17;
        die(g, mx3 - ms2 / 2, my3 - ms2 / 2, ms2, ms2, mt2, me2 > 0.4, seed + i, A2k(c));
        /* each model its own micro-mark */
        g.strokeStyle = 'rgba(220,245,255,' + (0.3 + 0.55 * mt2).toFixed(3) + ')';
        g.lineWidth = 0.9;
        if (i === 0){ g.beginPath(); g.arc(mx3, my3, ms2 * 0.22, 0, 6.29); g.stroke(); }
        if (i === 1){ g.beginPath(); g.moveTo(mx3 - ms2 * 0.22, my3); g.lineTo(mx3 + ms2 * 0.22, my3); g.stroke(); }
        if (i === 2){ g.strokeRect(mx3 - ms2 * 0.18, my3 - ms2 * 0.18, ms2 * 0.36, ms2 * 0.36); }
        if (i === 3){ g.beginPath(); g.moveTo(mx3, my3 - ms2 * 0.24); g.lineTo(mx3 + ms2 * 0.21, my3 + 0.13 * ms2); g.lineTo(mx3 - ms2 * 0.21, my3 + 0.13 * ms2); g.closePath(); g.stroke(); }
      }
      etch(g, c.x, y + h + u * 0.24, 'MODELS', Math.max(5, u * 0.18), pulse, null, A2k(c));

    } else if (c.kind === 'commons'){
      /* THE COMMONS — the shield can, perforated, always on air */
      drop(g, x, y, w, h, 3);
      var cg = g.createLinearGradient(x, y, x, y + h);
      cg.addColorStop(0, 'rgba(158,176,190,0.9)');
      cg.addColorStop(0.5, 'rgba(108,124,138,0.85)');
      cg.addColorStop(1, 'rgba(70,84,96,0.9)');
      g.fillStyle = cg;
      rr(g, x, y, w, h, 3); g.fill();
      g.fillStyle = 'rgba(220,235,245,0.35)';
      g.fillRect(x + 2, y + 1, w - 4, 1);
      g.strokeStyle = 'rgba(50,62,72,0.8)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + w * 0.5, y + 2); g.lineTo(x + w * 0.5, y + h - 2); g.stroke();
      for (var pyy = y + u * 0.22; pyy < y + h - u * 0.14; pyy += u * 0.2)
        for (var pxx = x + u * 0.22; pxx < x + w - u * 0.14; pxx += u * 0.2){
          var pon = e > 0.03 ? (0.4 + 0.6 * Math.sin(t * 2.2 + pxx * 0.7 + pyy)) * pulse : 0;
          g.beginPath(); g.arc(pxx, pyy, 1, 0, 6.29);
          g.fillStyle = pon > 0.25
            ? A2k(c) + (0.3 + 0.5 * pon).toFixed(3) + ')'
            : 'rgba(30,40,48,0.8)';
          g.fill();
        }
      if (e > 0.03){
        g.save();
        g.shadowColor = A2k(c) + (0.7 * pulse).toFixed(3) + ')';
        g.shadowBlur = 16 * pulse;
        g.strokeStyle = A2k(c) + (0.5 * pulse).toFixed(3) + ')';
        rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 3); g.stroke();
        g.restore();
      }
      etch(g, c.x, y + h + u * 0.24, 'COMMONS', Math.max(5, u * 0.18), pulse, null, A2k(c));

    } else if (c.kind === 'loop'){
      /* THE LOOP — a closed track. What goes around, compounds. */
      var lr = c.w * 0.42;
      g.beginPath(); g.arc(c.x, c.y, lr, 0, 6.29);
      g.strokeStyle = TRC + (0.5 + 0.2 * pulse).toFixed(3) + ')';
      g.lineWidth = 2.2; g.stroke();
      if (e > 0.03){
        g.save();
        g.setLineDash([lr * 0.7, lr * 0.5]);
        g.lineDashOffset = -t * 26;
        g.shadowColor = A2k(c) + (0.85 * pulse).toFixed(3) + ')';
        g.shadowBlur = 12 * pulse;
        g.strokeStyle = A2k(c) + (0.6 * pulse).toFixed(3) + ')';
        g.beginPath(); g.arc(c.x, c.y, lr, 0, 6.29); g.stroke();
        g.restore();
      }
      for (i = 0; i < 4; i++){
        var la2 = i * Math.PI / 2 + Math.PI / 4;
        var nx = c.x + Math.cos(la2) * lr, ny2 = c.y + Math.sin(la2) * lr;
        var ne = e > 0.03 ? (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.57)) * pulse : 0;
        g.beginPath(); g.arc(nx, ny2, 3, 0, 6.29);
        g.fillStyle = 'rgba(96,190,250,' + (0.4 + 0.5 * ne).toFixed(3) + ')';
        g.fill();
        g.beginPath(); g.arc(nx, ny2, 4.6, 0, 6.29);
        g.strokeStyle = TRC + '0.5)'; g.lineWidth = 0.9; g.stroke();
      }
      g.beginPath(); g.arc(c.x, c.y, 2, 0, 6.29);
      g.fillStyle = 'rgba(220,245,255,' + (0.3 + 0.6 * pulse).toFixed(3) + ')';
      g.fill();
      etch(g, c.x, c.y + lr + u * 0.3, 'THE LOOP', Math.max(5, u * 0.18), pulse, null, A2k(c));

    } else if (c.kind === 'phy'){
      drop(g, x, y, w, h, 2.5);
      qfpLeads(g, x, y, w, h, Math.max(3.5, u * 0.16), u * 0.11, pulse, A);
      pkg(g, x, y, w, h, pulse, 2.5, seed, A);
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

  /* ════════ THE BOARD — a world taller than the window ════════ */
  function makeBoard(CW, WH, VH){
    var base = document.createElement('canvas');
    var work = document.createElement('canvas');
    base.width = work.width = CW; base.height = work.height = WH;
    var bctx = base.getContext('2d'), wctx = work.getContext('2d');
    var comps = [], nets = [], crossed = {};
    var u = Math.min(CW, VH) / 11.4;

    /* film grain, baked once */
    var grain = document.createElement('canvas');
    grain.width = 256; grain.height = 256;
    (function(){
      var gg = grain.getContext('2d');
      var gr = lcg(777);
      var im = gg.createImageData(256, 256);
      for (var gi = 0; gi < im.data.length; gi += 4){
        var v = Math.round(gr() * 255);
        im.data[gi] = im.data[gi + 1] = im.data[gi + 2] = v;
        im.data[gi + 3] = 10;
      }
      gg.putImageData(im, 0, 0);
    })();

    var plan = [
      {id: 'cpu',  x: CW * 0.30, y: WH * 0.155, hw: u * 1.8,  hh: u * 1.8},
      {id: 'xtal', x: CW * 0.30 + u * 3.5, y: WH * 0.155 - u * 0.9, hw: u * 0.58, hh: u * 0.45},
      {id: 'rom',  x: CW * 0.30 + u * 3.55, y: WH * 0.155 + u * 0.85, hw: u * 0.53, hh: u * 0.4},
      {id: 'rams', x: CW * 0.845, y: WH * 0.13, hw: u * 1.55, hh: u * 2.25},
      {id: 'scu',  x: CW * 0.63, y: WH * 0.40, hw: u * 1.5,  hh: u * 1.5},
      {id: 'sccs', x: CW * 0.27, y: WH * 0.435, hw: u * 2.45, hh: u * 0.72},
      {id: 'brg',  x: CW * 0.50, y: WH * 0.575, hw: u * 1.12, hh: u * 1.12},
      {id: 'mcc',  x: CW * 0.72, y: WH * 0.63, hw: u * 1.15, hh: u * 1.15},
      {id: 'gpu',  x: CW * 0.30, y: WH * 0.80, hw: u * 2.15, hh: u * 1.3},
      {id: 'phy',  x: CW * 0.86, y: WH * 0.82, hw: u * 0.63, hh: u * 0.48},
      {id: 'guide', x: CW * 0.60, y: WH * 0.245, hw: u * 0.78, hh: u * 0.5},
      {id: 'seats', x: CW * 0.14, y: WH * 0.55, hw: u * 1.0, hh: u * 0.5},
      {id: 'models', x: CW * 0.24, y: WH * 0.665, hw: u * 0.85, hh: u * 0.7},
      {id: 'commons', x: CW * 0.63, y: WH * 0.755, hw: u * 0.95, hh: u * 0.65},
      {id: 'loop', x: CW * 0.47, y: WH * 0.30, hw: u * 1.05, hh: u * 1.05}
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
        a2.x = Math.max(u * 0.8 + a2.hw, Math.min(CW - u * 0.8 - a2.hw, a2.x));
        a2.y = Math.max((a2.id === 'cpu' ? u * 2.45 : u * 1.0) + a2.hh,
                        Math.min(WH - u * 1.5 - a2.hh, a2.y));
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
    var scu = comp('scu', P.scu.x, P.scu.y, u * 2.9, u * 2.9);
    var sccs = [];
    for (i = 0; i < 3; i++)
      sccs.push(comp('scc', P.sccs.x - u * 1.6 + i * u * 1.6, P.sccs.y, u * 1.3, u * 1.3,
                     {label: 'SCC-' + (i + 1)}));
    var brg = comp('brg', P.brg.x, P.brg.y, u * 1.45, u * 1.45);
    var mcc = comp('mcc', P.mcc.x, P.mcc.y, u * 2.0, u * 2.0, {noWater: true});
    var gpu = comp('gpu', P.gpu.x, P.gpu.y, u * 4.3, u * 2.35);
    var phy = comp('phy', P.phy.x, P.phy.y, u * 1.25, u * 0.95);
    var guide = comp('guide', P.guide.x, P.guide.y, u * 1.5, u * 0.95);
    var seats = comp('seats', P.seats.x, P.seats.y, u * 1.95, u * 0.95);
    var models = comp('models', P.models.x, P.models.y, u * 1.65, u * 1.35);
    var commons = comp('commons', P.commons.x, P.commons.y, u * 1.85, u * 1.25);
    var loop = comp('loop', P.loop.x, P.loop.y, u * 2.0, u * 2.0);

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
    for (i = 0; i < 3; i++)
      net(scu, cpu, route(scu.x - u * 0.6 + i * u * 0.6, scu.y - scu.h / 2,
                          cpu.x + u * 0.4 + i * u * 0.5, cpu.y + cpu.h / 2), 1.2);
    for (i = 0; i < 3; i++)
      net(scu, sccs[i], route(scu.x - scu.w / 2, scu.y - u * 0.5 + i * u * 0.5,
                              sccs[i].x + sccs[i].w / 2, sccs[i].y), 1.2);
    for (i = 0; i < 2; i++)
      net(scu, mcc, route(scu.x + u * 0.4 + i * u * 0.5, scu.y + scu.h / 2,
                          mcc.x - u * 0.3 + i * u * 0.6, mcc.y - mcc.h / 2), 1.4);
    net(mcc, brg, route(mcc.x - mcc.w / 2, mcc.y, brg.x + u * 1.05, brg.y), 1);
    for (i = 0; i < 3; i++)
      net(brg, gpu, route(brg.x - u * 0.4 + i * u * 0.4, brg.y + u * 1.05,
                          gpu.x + u * 0.7 + i * u * 0.4, gpu.y - gpu.h / 2), 1);
    for (i = 0; i < 2; i++)
      net(sccs[0], gpu, route(sccs[0].x - u * 0.3 + i * u * 0.5, sccs[0].y + sccs[0].h / 2,
                              gpu.x - u * 1.2 + i * u * 0.5, gpu.y - gpu.h / 2), 1);
    net(phy, mcc, route(phy.x - phy.w / 2, phy.y, mcc.x + mcc.w / 2, mcc.y + u * 0.4), 1);
    net(guide, cpu, route(guide.x - guide.w / 2, guide.y, cpu.x + cpu.w / 2, cpu.y - u * 0.4), 1);
    for (i = 0; i < 2; i++)
      net(seats, cpu, route(seats.x + seats.w / 2, seats.y - u * 0.15 + i * u * 0.3,
                            cpu.x - cpu.w / 2, cpu.y + u * 0.6 + i * u * 0.4), 1);
    net(models, brg, route(models.x + models.w / 2, models.y, brg.x - u * 1.05, brg.y), 1);
    net(commons, phy, route(commons.x + commons.w / 2, commons.y, phy.x - phy.w / 2, phy.y + u * 0.2), 1);
    net(loop, cpu, route(loop.x - loop.w / 2, loop.y, cpu.x + cpu.w / 2, cpu.y + u * 0.2), 1);
    net(loop, scu, route(loop.x + loop.w / 2, loop.y, scu.x - scu.w / 2, scu.y - u * 0.3), 1);
    var fingersX = CW * 0.5, fingersW = u * 4;
    for (i = 0; i < 4; i++)
      net(phy, null, route(phy.x - u * 0.4 + i * u * 0.26, phy.y + phy.h / 2,
                           fingersX + fingersW * 0.28 + i * u * 0.22, WH - u * 0.5), 1);

    function meters(g, scc, mcc2, top){
      if (typeof window !== 'undefined' && window.__semblePool){
        scc = window.__semblePool.scc || 0;
        mcc2 = window.__semblePool.mcc || 0;
      }
      var y0 = top + VH - u * 1.05, seg = u * 0.3, gap = u * 0.1, x0 = u * 0.6, k;
      etch(g, x0, y0 - u * 0.35, 'SCC', Math.max(5, u * 0.18), scc > 0 ? 1 : 0, 'left');
      for (k = 0; k < 12; k++){
        var on = k < Math.round(scc * 12);
        g.fillStyle = on ? LIT + '0.8)' : 'rgba(60,100,140,0.25)';
        if (on){ g.save(); g.shadowColor = LIT + '0.7)'; g.shadowBlur = 6;
          g.fillRect(x0 + k * (seg + gap), y0, seg, u * 0.26); g.restore(); }
        else g.fillRect(x0 + k * (seg + gap), y0, seg, u * 0.26);
      }
      var x1 = CW - u * 0.6 - 6 * (seg + gap);
      etch(g, CW - u * 0.6, y0 - u * 0.35, 'MCC · MOTUS LEVEL', Math.max(5, u * 0.18), mcc2 > 0 ? 1 : 0, 'right');
      for (k = 0; k < 6; k++){
        var on2 = k < Math.round(mcc2 * 6);
        g.fillStyle = on2 ? 'rgba(232,207,150,0.9)' : 'rgba(120,100,60,0.22)';
        if (on2){ g.save(); g.shadowColor = 'rgba(226,200,143,0.8)'; g.shadowBlur = 7;
          g.fillRect(x1 + k * (seg + gap), y0, seg, u * 0.26); g.restore(); }
        else g.fillRect(x1 + k * (seg + gap), y0, seg, u * 0.26);
      }
    }

    (function paintBase(){
      var g = bctx;
      var bgr = g.createLinearGradient(0, 0, 0, WH);
      bgr.addColorStop(0, '#050b14'); bgr.addColorStop(1, '#040810');
      g.fillStyle = bgr; g.fillRect(0, 0, CW, WH);
      var sheen = g.createLinearGradient(0, 0, CW, 0);
      sheen.addColorStop(0, 'rgba(120,170,220,0.02)');
      sheen.addColorStop(0.5, 'rgba(120,170,220,0.045)');
      sheen.addColorStop(1, 'rgba(120,170,220,0.015)');
      g.fillStyle = sheen; g.fillRect(0, 0, CW, WH);
      g.strokeStyle = 'rgba(120,165,205,0.18)';
      g.lineWidth = 1;
      rr(g, u * 0.25, u * 0.25, CW - u * 0.5, WH - u * 0.5, 8); g.stroke();
      [[0.05, 0.035], [0.95, 0.035], [0.05, 0.965], [0.95, 0.965]].forEach(function(f){
        var hx = CW * f[0], hy = WH * f[1];
        g.beginPath(); g.arc(hx, hy, u * 0.22, 0, 6.29);
        g.fillStyle = '#02050a'; g.fill();
        g.strokeStyle = 'rgba(201,168,106,0.45)';
        g.lineWidth = 1.5; g.stroke();
      });
      var pours = [[0.06, 0.05, 0.52, 0.24], [0.62, 0.05, 0.32, 0.22],
                   [0.08, 0.33, 0.55, 0.2], [0.55, 0.32, 0.38, 0.24],
                   [0.08, 0.66, 0.5, 0.22], [0.62, 0.58, 0.32, 0.22]];
      pours.forEach(function(pr){
        var px4 = CW * pr[0], py4 = WH * pr[1], pw = CW * pr[2], ph2 = WH * pr[3];
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
      g.fillStyle = 'rgba(80,140,190,0.055)';
      for (var gy = 10; gy < WH; gy += 22)
        for (var gx = 10; gx < CW; gx += 22)
          g.fillRect(gx, gy, 1.2, 1.2);
      var vr = lcg(4242);
      for (i = 0; i < 300; i++){
        g.beginPath(); g.arc(vr() * CW, vr() * WH, 0.7 + vr() * 0.8, 0, 6.29);
        g.fillStyle = 'rgba(90,150,200,' + (0.08 + vr() * 0.1).toFixed(3) + ')'; g.fill();
      }
      /* background trace bundles — the highways between tiers */
      var bnd = [[0.10, 0.28, 0.86, 0.30, 10], [0.14, 0.60, 0.60, 0.63, 8],
                 [0.50, 0.06, 0.52, 0.94, 9], [0.88, 0.30, 0.70, 0.72, 7]];
      bnd.forEach(function(bb, b3){
        var ax2 = CW * bb[0], ay2 = WH * bb[1], bx3 = CW * bb[2], by3 = WH * bb[3];
        for (var li = 0; li < bb[4]; li++){
          var off = (li - bb[4] / 2) * 3.2;
          var ddx = bx3 - ax2, ddy = by3 - ay2;
          var mid = Math.min(Math.abs(ddx), Math.abs(ddy));
          g.beginPath();
          if (Math.abs(ddx) >= Math.abs(ddy)){
            g.moveTo(ax2, ay2 + off);
            g.lineTo(bx3 - Math.sign(ddx) * mid, ay2 + off);
            g.lineTo(bx3 + off * 0.3, by3 + off);
          } else {
            g.moveTo(ax2 + off, ay2);
            g.lineTo(ax2 + off, by3 - Math.sign(ddy) * mid);
            g.lineTo(bx3 + off, by3 + off * 0.3);
          }
          g.strokeStyle = 'rgba(46,96,142,' + (0.10 + (li % 3) * 0.025).toFixed(3) + ')';
          g.lineWidth = 0.9;
          g.stroke();
        }
      });
      /* flux ghosts — the residue of assembly */
      var fr = lcg(9911);
      for (i = 0; i < 8; i++){
        var fx2 = fr() * CW, fy2 = fr() * WH, frr = u * (1.2 + fr() * 2.2);
        var fgr = g.createRadialGradient(fx2, fy2, 1, fx2, fy2, frr);
        var warm = fr() > 0.45;
        fgr.addColorStop(0, warm ? 'rgba(140,105,50,0.035)' : 'rgba(70,110,160,0.03)');
        fgr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fgr;
        g.beginPath(); g.arc(fx2, fy2, frr, 0, 6.29); g.fill();
      }
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
      for (var f2 = 0; f2 < 12; f2++){
        var fx = fingersX - fingersW / 2 + f2 * (fingersW / 12);
        var gg = g.createLinearGradient(0, WH - u * 0.5, 0, WH);
        gg.addColorStop(0, '#e2c88f'); gg.addColorStop(1, '#9d7f4b');
        g.fillStyle = gg;
        rr(g, fx, WH - u * 0.5, fingersW / 12 - 2.5, u * 0.5, 1.5); g.fill();
      }
      caps.forEach(function(cp){ polyCap(g, cp.x, cp.y, cp.r, 0); });
      var s = 987654321;
      function rnd(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
      for (var p2 = 0; p2 < 54; p2++){
        var px3 = u * 0.6 + rnd() * (CW - u * 1.2), py3 = u * 0.6 + rnd() * (WH - u * 1.9);
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
      /* gold test points */
      var tp = lcg(5150);
      for (i = 0; i < 26; i++){
        var tx2 = u * 0.7 + tp() * (CW - u * 1.4), ty2 = u * 0.7 + tp() * (WH - u * 2);
        var okc = comps.every(function(c){
          return Math.abs(tx2 - c.x) > c.w / 2 + u * 0.4 || Math.abs(ty2 - c.y) > c.h / 2 + u * 0.4; });
        if (!okc) continue;
        g.beginPath(); g.arc(tx2, ty2, 1.9, 0, 6.29);
        g.strokeStyle = 'rgba(212,180,120,0.5)'; g.lineWidth = 1; g.stroke();
      }
      /* reference designators — the board's own handwriting */
      g.font = '600 ' + Math.max(4.5, u * 0.13) + 'px ui-monospace, Consolas, monospace';
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = INK + '0.26)';
      var dg2 = lcg(2718);
      for (i = 0; i < 16; i++){
        var dx3 = u * 0.8 + dg2() * (CW - u * 1.6), dy3 = u * 0.8 + dg2() * (WH - u * 2);
        var okd = comps.every(function(c){
          return Math.abs(dx3 - c.x) > c.w / 2 + u * 0.45 || Math.abs(dy3 - c.y) > c.h / 2 + u * 0.45; });
        if (!okd) continue;
        g.fillText((dg2() > 0.5 ? 'C' : 'R') + Math.round(dg2() * 89 + 10), dx3, dy3);
      }
      /* the assembly sticker — proof a factory touched it */
      (function(){
        var sw2 = u * 1.7, sh2 = u * 0.6, sx3 = CW - u * 2.6, sy3 = WH * 0.47;
        g.save();
        g.translate(sx3, sy3); g.rotate(-0.06);
        g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 5; g.shadowOffsetY = 2;
        g.fillStyle = 'rgba(225,232,238,0.85)';
        rr(g, 0, 0, sw2, sh2, 2); g.fill();
        g.shadowColor = 'transparent';
        g.fillStyle = 'rgba(20,28,36,0.9)';
        var bx4 = u * 0.12, br2 = lcg(31337);
        while (bx4 < sw2 - u * 0.14){
          var bw3 = 0.8 + br2() * 1.8;
          g.fillRect(bx4, sh2 * 0.16, bw3, sh2 * 0.5);
          bx4 += bw3 + 0.9 + br2() * 1.4;
        }
        g.font = '600 ' + Math.max(4, u * 0.12) + 'px ui-monospace, Consolas, monospace';
        g.textAlign = 'center'; g.fillStyle = 'rgba(30,40,50,0.85)';
        g.fillText('SMBL-2643-REV3', sw2 / 2, sh2 * 0.82);
        g.restore();
      })();
      g.font = '600 ' + Math.max(7, u * 0.24) + 'px ui-monospace, Consolas, monospace';
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = INK + '0.4)';
      g.fillText('SEMBLE STACK', u * 0.6, WH - u * 0.35);
      g.textAlign = 'right';
      g.fillText('REV 3', CW - u * 0.6, WH - u * 0.35);
      g.setLineDash([4, 4]);
      g.strokeStyle = INK + '0.14)';
      g.lineWidth = 1;
      rr(g, cpu.x - cpu.w / 2 - u * 0.55, caps[0].y - u * 0.5,
         cpu.w + u * 1.1, (chokes[0].y + u * 0.75) - (caps[0].y - u * 0.5), 6);
      g.stroke();
      rr(g, sccs[0].x - u * 0.95, sccs[0].y - u * 1.05, (sccs[2].x - sccs[0].x) + u * 1.9, u * 2.35, 6);
      g.stroke();
      g.setLineDash([]);
      etch(g, chokes[3].x + u * 1.15, chokes[0].y, '!MOTUS PWR', Math.max(6, u * 0.2), 0, 'left');
      etch(g, rams[0].x, rams[0].y - u * 0.85, 'STEPS', Math.max(6, u * 0.2), 0);
      etch(g, sccs[1].x, sccs[0].y - u * 1.32, 'SEMBLE COMPUTE CORES', Math.max(5.5, u * 0.18), 0);
      comps.forEach(function(c){ drawComp(g, c, 0, 0); });
      /* one light across the whole board — uniformity is what reads digital */
      var lightG = g.createLinearGradient(0, 0, CW, WH);
      lightG.addColorStop(0, 'rgba(190,225,255,0.05)');
      lightG.addColorStop(0.45, 'rgba(120,170,220,0.012)');
      lightG.addColorStop(1, 'rgba(0,0,10,0.12)');
      g.fillStyle = lightG;
      g.fillRect(0, 0, CW, WH);
      /* the grain — what makes a render a photograph */
      g.globalAlpha = 0.5;
      for (var gy2 = 0; gy2 < WH; gy2 += 256)
        for (var gx2 = 0; gx2 < CW; gx2 += 256)
          g.drawImage(grain, gx2, gy2);
      g.globalAlpha = 1;
    })();

    function render(t, o, top, focus){
      top = top || 0;
      wctx.drawImage(base, 0, 0);
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
      /* the MOTUS core ignites from thresholds, never from watering */
      var nCross = Object.keys(crossed).length;
      mcc.e += (Math.min(1, nCross / 4) - mcc.e) * 0.06;
      comps.forEach(function(c){ if (c.e > 0.02) drawComp(wctx, c, c.e, t); });
      /* the chips sing — notes rise while the energy runs */
      comps.forEach(function(c){
        if (c.e < 0.55) return;
        for (var nk = 0; nk < 2; nk++){
          var cyc = ((t * 0.5) + c.phase * 0.3 + nk * 0.7) % 1.4;
          var na = Math.sin(Math.PI * cyc / 1.4) * 0.45 * c.e;
          if (na < 0.04) continue;
          wctx.font = '600 ' + Math.round(u * 0.44) + 'px ui-monospace, Consolas, monospace';
          wctx.textAlign = 'center';
          wctx.fillStyle = acc(c) + na.toFixed(3) + ')';
          wctx.fillText(nk ? '♫' : '♪',
            Math.round(c.x + Math.sin(cyc * 3.1 + c.phase) * u * 0.6 + (nk ? u * 0.5 : -u * 0.5)),
            Math.round(c.y - c.h / 2 - u * 0.25 - cyc * u * 1.5));
        }
      });
      /* surges decay; the beam re-arms */
      if (typeof render.__lt !== 'number') render.__lt = 0;
      var dt2 = Math.max(0, Math.min(0.12, t - render.__lt));
      render.__lt = t;
      comps.forEach(function(c){ if (c.surge) c.surge = Math.max(0, c.surge - dt2 * 2.1); });
      /* the life of the orb: energy motes fall into the focused one, and ripple */
      if (focus && o){
        for (var mi = 0; mi < 3; mi++){
          var mp = (t * 0.55 + mi / 3) % 1;
          var ex = o.x + (focus.x - o.x) * mp;
          var ey = o.y + (focus.y - o.y) * mp;
          var dxn = focus.y - o.y, dyn = -(focus.x - o.x);
          var dl = Math.hypot(dxn, dyn) || 1;
          var perp = Math.sin(mp * 6.283 + mi * 2.1) * u * (1 - mp) * 0.5;
          ex += dxn / dl * perp; ey += dyn / dl * perp;
          wctx.save();
          wctx.shadowColor = acc(focus) + '0.9)';
          wctx.shadowBlur = 10;
          wctx.beginPath(); wctx.arc(ex, ey, 2.6 * (1 - mp * 0.55), 0, 6.29);
          wctx.fillStyle = 'rgba(230,250,255,' + (0.5 + 0.4 * (1 - mp)).toFixed(3) + ')';
          wctx.fill();
          wctx.restore();
        }
        var rp = (t * 0.55) % 1;
        if (typeof render.__rp !== 'number') render.__rp = 0;
        if (render.__rp > rp) focus.surge = 1;   /* the release lands */
        render.__rp = rp;
        if (rp > 0.66){
          var rq = (rp - 0.66) / 0.34;
          wctx.beginPath();
          wctx.arc(focus.x, focus.y, Math.max(focus.w, focus.h) * 0.5 * (0.4 + rq * 0.85), 0, 6.29);
          wctx.strokeStyle = acc(focus) + (0.5 * (1 - rq)).toFixed(3) + ')';
          wctx.lineWidth = 1.4;
          wctx.stroke();
        }
        /* the discharge itself — a beam, for one breath */
        var fsg = focus.surge || 0;
        if (fsg > 0.55){
          var ba = (fsg - 0.55) / 0.45;
          var bg2 = wctx.createLinearGradient(o.x, o.y, focus.x, focus.y);
          bg2.addColorStop(0, 'rgba(235,252,255,' + (0.05 * ba).toFixed(3) + ')');
          bg2.addColorStop(1, acc(focus) + (0.5 * ba).toFixed(3) + ')');
          wctx.save();
          wctx.strokeStyle = bg2;
          wctx.lineWidth = 2.6 * ba;
          wctx.shadowColor = acc(focus) + (0.8 * ba).toFixed(3) + ')';
          wctx.shadowBlur = 14 * ba;
          wctx.beginPath();
          wctx.moveTo(o.x, o.y); wctx.lineTo(focus.x, focus.y);
          wctx.stroke();
          wctx.restore();
          /* shockwave */
          wctx.beginPath();
          wctx.arc(focus.x, focus.y, Math.max(focus.w, focus.h) * (0.55 + (1 - ba) * 1.1), 0, 6.29);
          wctx.strokeStyle = acc(focus) + (0.4 * ba).toFixed(3) + ')';
          wctx.lineWidth = 1.6;
          wctx.stroke();
        }
      }
      /* the scanner's reticle — a slow hex ring around the studied one */
      if (focus){
        var fr2 = Math.max(focus.w, focus.h) * 0.74 + u * 0.4;
        wctx.save();
        wctx.setLineDash([7, 5]);
        wctx.lineDashOffset = -t * 9;
        wctx.strokeStyle = acc(focus) + '0.55)';
        wctx.lineWidth = 1.2;
        wctx.shadowColor = acc(focus) + '0.6)';
        wctx.shadowBlur = 8;
        hexPath(wctx, focus.x, focus.y, fr2);
        wctx.stroke();
        wctx.restore();
      }
      var sum = 0;
      comps.forEach(function(c){
        if (c.noWater) return;
        sum += c.e;
        if (c.e >= 0.98) crossed[c.kind + Math.round(c.x)] = 1;
      });
      meters(wctx, Math.min(1, sum / 5), Math.min(1, nCross / 6), top);
    }

    return {work: work, comps: comps, render: render, u: u, WH: WH,
            mcc: function(){ return Object.keys(crossed).length; }};
  }

  /* the orblet's world — one SYMBOL per tab, big enough to read at 54px.
     Trax = the line · Init = the first light · Semble = the ring of cores ·
     Next Sesh = the keeper of time. Magical, not miniature. */
  function makeStrip(order){
    var SW = 512, SH = 128;
    var base = document.createElement('canvas');
    var work = document.createElement('canvas');
    base.width = work.width = SW; base.height = work.height = SH;
    var bctx = base.getContext('2d'), wctx = work.getContext('2d');
    var comps = [];
    var SYM = {trax: 'line', init: 'spark', me: 'ring', semble: 'ring', sesh: 'time'};
    var SYMACC = {line: '140,200,255', spark: '255,216,150',
                  ring: '102,228,255', time: '96,232,210'};
    order.forEach(function(tag, i){
      var sy3 = SYM[tag] || 'spark';
      comps.push({sym: sy3, acc: SYMACC[sy3], x: SW * (i + 0.5) / order.length,
                  y: SH * 0.5, e: 0, phase: i * 1.7});
    });

    function paintBack(g){
      var bgr = g.createLinearGradient(0, 0, 0, SH);
      bgr.addColorStop(0, '#060d18'); bgr.addColorStop(1, '#040810');
      g.fillStyle = bgr; g.fillRect(0, 0, SW, SH);
      g.fillStyle = 'rgba(80,140,190,0.05)';
      for (var gy = 8; gy < SH; gy += 16)
        for (var gx = 8; gx < SW; gx += 16)
          g.fillRect(gx, gy, 1, 1);
      g.beginPath();
      g.moveTo(0, SH * 0.5); g.lineTo(SW, SH * 0.5);
      g.strokeStyle = TRC + '0.35)'; g.lineWidth = 1.2; g.stroke();
      comps.forEach(function(c){
        g.beginPath(); g.arc(c.x, SH * 0.5, 1.8, 0, 6.29);
        g.fillStyle = 'rgba(96,190,250,0.5)'; g.fill();
      });
    }

    function drawSym(g, c, t){
      var e = c.e, R = 44;
      var pulse = e > 0.02 ? e * (0.8 + 0.2 * Math.sin(t * 1.8 + c.phase)) : 0;
      var glow = 'rgba(' + (c.acc || '120,230,255') + ',';
      var i;

      if (c.sym === 'line'){
        /* TRAX — the line your steps make, drawing itself */
        var pts = [[-0.8, 0.45], [-0.45, 0.05], [-0.12, 0.3], [0.22, -0.28], [0.55, -0.05], [0.85, -0.5]];
        g.beginPath();
        for (i = 0; i < pts.length; i++){
          var lx = c.x + pts[i][0] * R, ly = c.y + pts[i][1] * R;
          i ? g.lineTo(lx, ly) : g.moveTo(lx, ly);
        }
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(150,200,240,' + (0.3 + 0.65 * pulse).toFixed(3) + ')';
        g.lineWidth = 3.4;
        if (e > 0.02){
          g.save();
          g.setLineDash([400]);
          g.lineDashOffset = 400 * (1 - Math.min(1, e * 1.12));
          g.shadowColor = glow + (0.95 * pulse).toFixed(3) + ')';
          g.shadowBlur = 16 * Math.max(0.35, pulse);
          g.stroke();
          g.restore();
        } else g.stroke();
        /* the steps themselves — dots on the line */
        for (i = 0; i < pts.length; i++){
          var se = Math.max(0, Math.min(1, e * pts.length * 1.1 - i));
          if (se <= 0 && e > 0.02) continue;
          g.beginPath();
          g.arc(c.x + pts[i][0] * R, c.y + pts[i][1] * R, 2.6, 0, 6.29);
          g.fillStyle = 'rgba(225,248,255,' + (e > 0.02 ? (0.4 + 0.6 * se * pulse) : 0.35).toFixed(3) + ')';
          g.fill();
        }

      } else if (c.sym === 'spark'){
        /* INIT — one dot, then everything */
        var br = 4 + Math.min(1, e * 1.15) * R * 0.85;
        if (e > 0.02){
          var bg = g.createRadialGradient(c.x, c.y, 1, c.x, c.y, br);
          bg.addColorStop(0, 'rgba(210,250,255,' + (0.75 * pulse).toFixed(3) + ')');
          bg.addColorStop(0.4, glow + (0.4 * pulse).toFixed(3) + ')');
          bg.addColorStop(1, 'rgba(120,230,255,0)');
          g.fillStyle = bg;
          g.beginPath(); g.arc(c.x, c.y, br, 0, 6.29); g.fill();
        }
        /* rays at full ignition */
        if (e > 0.6){
          g.strokeStyle = 'rgba(220,250,255,' + (0.5 * pulse).toFixed(3) + ')';
          g.lineWidth = 1.4;
          for (i = 0; i < 6; i++){
            var ra = i * Math.PI / 3 + t * 0.22;
            g.beginPath();
            g.moveTo(c.x + Math.cos(ra) * R * 0.42, c.y + Math.sin(ra) * R * 0.42);
            g.lineTo(c.x + Math.cos(ra) * R * (0.58 + 0.1 * pulse), c.y + Math.sin(ra) * R * (0.58 + 0.1 * pulse));
            g.stroke();
          }
        }
        g.save();
        g.shadowColor = glow + '0.95)'; g.shadowBlur = 10;
        g.beginPath(); g.arc(c.x, c.y, 3.4 + 1.4 * pulse, 0, 6.29);
        g.fillStyle = 'rgba(235,252,255,' + (0.6 + 0.4 * pulse).toFixed(3) + ')';
        g.fill();
        g.restore();

      } else if (c.sym === 'ring'){
        /* SEMBLE — six cores in a ring; the community assembles */
        var hr = R * 0.30;
        for (i = 0; i < 6; i++){
          var aa = i * Math.PI / 3 - Math.PI / 2;
          var ce = Math.max(0, Math.min(1, e * 6.6 - i));
          var ct = ce > 0 && e > 0.02
            ? ce * (0.6 + 0.4 * Math.sin(t * 2.4 + c.phase + i)) : 0;
          var hx = c.x + Math.cos(aa) * R * 0.52, hy = c.y + Math.sin(aa) * R * 0.52;
          /* the bond to centre */
          g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(hx, hy);
          g.strokeStyle = glow + (0.12 + 0.5 * ct).toFixed(3) + ')';
          g.lineWidth = 1.2; g.stroke();
          hexPath(g, hx, hy, hr * 0.62);
          g.fillStyle = 'rgba(70,150,220,' + (0.14 + 0.55 * ct).toFixed(3) + ')';
          g.fill();
          if (ct > 0.25){
            g.save();
            g.shadowColor = glow + (0.9 * ct).toFixed(3) + ')';
            g.shadowBlur = 11 * ct;
            g.strokeStyle = glow + (0.5 + 0.5 * ct).toFixed(3) + ')';
            g.lineWidth = 1.2; g.stroke();
            g.restore();
          } else {
            g.strokeStyle = glow + '0.35)';
            g.lineWidth = 1.1; g.stroke();
          }
        }
        hexPath(g, c.x, c.y, hr * 0.55);
        g.fillStyle = 'rgba(210,245,255,' + (0.25 + 0.65 * pulse).toFixed(3) + ')';
        g.fill();

      } else if (c.sym === 'time'){
        /* NEXT SESH — the keeper of time; the countdown arc closes */
        g.save();
        if (e > 0.02){ g.shadowColor = glow + (0.7 * pulse).toFixed(3) + ')'; g.shadowBlur = 12 * pulse; }
        g.beginPath(); g.arc(c.x, c.y, R * 0.5, 0, 6.29);
        g.strokeStyle = 'rgba(170,200,225,' + (0.35 + 0.4 * pulse).toFixed(3) + ')';
        g.lineWidth = 2; g.stroke();
        g.restore();
        /* the arc of commitment, filling */
        g.beginPath();
        g.arc(c.x, c.y, R * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.min(1, e * 1.1) * 6.283);
        g.strokeStyle = 'rgba(220,250,255,' + (0.25 + 0.7 * pulse).toFixed(3) + ')';
        g.lineWidth = 3; g.lineCap = 'round'; g.stroke();
        /* the hand — it ticks when watered */
        var ha = -Math.PI / 2 + (e > 0.02 ? Math.floor(t * 2) * 0.5236 : 0.9);
        g.beginPath();
        g.moveTo(c.x, c.y);
        g.lineTo(c.x + Math.cos(ha) * R * 0.34, c.y + Math.sin(ha) * R * 0.34);
        g.strokeStyle = 'rgba(235,250,255,' + (0.5 + 0.5 * pulse).toFixed(3) + ')';
        g.lineWidth = 2; g.stroke();
        g.beginPath(); g.arc(c.x, c.y, 2.2, 0, 6.29);
        g.fillStyle = 'rgba(235,250,255,0.85)'; g.fill();
        /* twelve marks */
        for (i = 0; i < 12; i++){
          var ma = i * Math.PI / 6;
          g.beginPath();
          g.moveTo(c.x + Math.cos(ma) * R * 0.44, c.y + Math.sin(ma) * R * 0.44);
          g.lineTo(c.x + Math.cos(ma) * R * 0.5, c.y + Math.sin(ma) * R * 0.5);
          g.strokeStyle = 'rgba(190,220,240,' + (0.25 + 0.4 * pulse).toFixed(3) + ')';
          g.lineWidth = 1; g.stroke();
        }
      }
    }

    paintBack(bctx);
    comps.forEach(function(c){ drawSym(bctx, c, 0); });
    function render(t){
      paintBack(wctx);
      comps.forEach(function(c){ drawSym(wctx, c, t); });
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
    var MOB = !matchMedia('(min-width: 1000px)').matches;
    if (MOB && document.querySelector('.tabs')) return null;  /* the app has its orblet */
    var C = {
      displacementSpeed: 0.18,   /* steadier surface               */
      sizeDefault: 0.275,
      lerp1: 0.032, lerp2: 0.05,
      scrollLerp1: 0.12, scrollLerp2: 0.09,
      reach: 0.3,                /* shorter leash — it holds place */
      sideDrift: 0.16, yClamp: 0.22,
      idleAfter: 2600            /* ms without a mouse → dock home */
    };
    if (MOB){                    /* the phone: fewer pixels, same soul */
      C.idleAfter = 300;         /* no cursor — it lives on its own at once */
      C.reach = 0.34;
    }
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
    document.body.insertBefore(cv, document.body.firstChild);
    var E = makeEngine(cv);
    if (!E){ cv.remove(); return null; }
    var gl = E.gl, U = E.U;
    var bgc = null, bgx = null;
    if (new URLSearchParams(location.search).get('board') === '1'){
      bgc = document.createElement('canvas');
      bgc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1';
      document.body.insertBefore(bgc, document.body.firstChild);
      bgx = bgc.getContext('2d');
    }

    /* the glass lives BEHIND the words — always, on every page, forever */
    var LIFT = '.wrap, .hero, nav.nav, footer, .app, .tabs, .cc, section, main, ' +
               'article, header, .comp, .initform, .sesh, .act, .pane, .hud, .made';
    function lift(){
      [].forEach.call(document.querySelectorAll(LIFT), function(el){
        var cs = getComputedStyle(el);
        if (cs.position === 'static') el.style.position = 'relative';
        if (cs.zIndex === 'auto' || cs.zIndex === '0') el.style.zIndex = '1';
      });
    }
    lift();
    /* THE WORDS ALWAYS WIN. The glass is depth behind them, never noise
       through them — so every reading surface gets a real backing while
       the orb is alive, and on a phone the orb itself sits back. */
    document.body.classList.add('orb-on');
    (function(){
      var st = document.createElement('style');
      st.textContent =
        'body.orb-on .step,body.orb-on .pane,body.orb-on .card,body.orb-on .tier,' +
        'body.orb-on .f,body.orb-on .meta,body.orb-on .seat,body.orb-on .cc,' +
        'body.orb-on .stg,body.orb-on .colo,body.orb-on .sig{' +
        'background-color:rgba(7,11,19,.88)!important;' +
        'box-shadow:0 0 0 1px rgba(140,180,215,.10)}' +
        '@media(max-width:999px){' +
        'body.orb-on p,body.orb-on h1,body.orb-on h2,body.orb-on h3,body.orb-on h4,' +
        'body.orb-on .kick,body.orb-on li{' +
        'text-shadow:0 1px 10px rgba(3,6,12,.95),0 0 26px rgba(3,6,12,.85)}}';
      document.head.appendChild(st);
    })();
    /* pages that build their DOM after us must be lifted too */
    if (window.MutationObserver){
      var mo = new MutationObserver(function(){ lift(); });
      mo.observe(document.body, {childList: true, subtree: true});
      setTimeout(function(){ mo.disconnect(); }, 8000);
    }

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

    var W, H, board, VH, WORLD_K = MOB ? 2.6 : 2.2, worldMax = 0, ky = 1, baseSize = 0.3;
    /* this visit's growth personality — no two loads bloom alike */
    var GR = {
      a: 0.22 + Math.random() * 0.12,      /* how small it starts        */
      b: 0.92 + Math.random() * 0.52,      /* how large it ends          */
      curve: 0.72 + Math.random() * 0.95,  /* early bloom vs late surge  */
      wob: 0.03 + Math.random() * 0.05,    /* the breath in its size     */
      ph: Math.random() * 6.28
    };
    var energy = 0, lastSF = 0;
    function fit(){
      var DPR = Math.min(devicePixelRatio || 1, MOB ? 1.15 : 1.5);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform4f(U.uResolution, cv.width, cv.height, W >= H ? W / H : 1, W >= H ? 1 : H / W);
      baseSize = Math.min(Math.max(W, 800), 2000) / Math.max(W, 1000) * C.sizeDefault
                 * (MOB ? 1.55 : 1.24);
      if (bgc){ bgc.width = W; bgc.height = H; }
      VH = H;
      var WHW = Math.round(VH * WORLD_K);
      board = makeBoard(W, WHW, VH);
      worldMax = WHW - VH;
      ky = VH / WHW;
      board.render(0, null, 0);
      E.uploadWorld(board.work);
    }
    fit();
    var rsT;
    addEventListener('resize', function(){ clearTimeout(rsT); rsT = setTimeout(fit, 180); }, {passive: true});

    var HOME = {x: 0, y: -0.05};
    var mouse = {x: HOME.x, y: HOME.y}, m1 = {x: HOME.x, y: HOME.y}, m2 = {x: HOME.x, y: HOME.y};
    var lerp1 = C.lerp1, lerp2 = C.lerp2, scrolling = false, scrollT = 0;
    var lastMouseT = -1e9, wanderT = 0, wLast = null, wRecent = [], wVisits = {};

    if (MOB){
      addEventListener('touchstart', function(e){
        var tch = e.touches && e.touches[0]; if (!tch) return;
        mouse.x = Math.max(-0.55, Math.min(0.55, (tch.clientX / W - 0.5) * C.reach * 2));
        mouse.y = Math.max(-0.55, Math.min(0.55, (-tch.clientY / H + 0.5) * C.reach * 2));
        wLast = null;
        wanderT = performance.now() + 2600;   /* it looks where you touched */
      }, {passive: true});
    }
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
      return {x: (0.5 + m1.x * 0.6) * W, y: (0.5 - m1.y * 0.6) * H,
              r: Math.min(W, H) * 0.30 * (isFinite(growNow) && growNow > 0 ? growNow : 0.3)};
    }
    /* scroll couples the window to the world: the board pans beneath the page */
    var sFrac = 0;
    function scrollFrac(){
      var mx2 = Math.max(1, document.documentElement.scrollHeight - H);
      return Math.max(0, Math.min(1, (scrollY || 0) / mx2));
    }
    function worldTop(){ return sFrac * worldMax; }
    function water(dt, focus){
      var o = orbPx(), top = worldTop(), changed = false;
      for (var i = 0; i < board.comps.length; i++){
        var c = board.comps[i];
        if (c.noWater) continue;
        var d = Math.hypot(c.x - o.x, (c.y - top) - o.y);
        var e0 = c.e;
        if (d < o.r * 1.05) c.e = Math.min(1, c.e + (1 - c.e) * (c === focus ? 1.5 : 0.9) * dt);
        else c.e = Math.max(0, c.e - c.e * 0.28 * dt);
        if (Math.abs(c.e - e0) > 0.001) changed = true;
      }
      return changed;
    }

    var opacity = 0, t0 = performance.now(), last = t0, worldDirty = true, lastTop = -1, frameN = 0, growNow = 0.3;
    function draw(now){
      var t = (now - t0) / 1000 * C.displacementSpeed;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (scrolling && Date.now() - scrollT > 900){
        scrolling = false; lerp1 = C.lerp1; lerp2 = C.lerp2;
      }
      var focus2 = (!scrolling && now - lastMouseT > C.idleAfter) ? wLast : null;
      /* the wanderer: idle → visit a system, water it, move on */
      if (!scrolling && now - lastMouseT > C.idleAfter){
        if (now > wanderT){
          var topW = worldTop();
          /* THE ZIG-ZAG BUG: a hard viewport filter left only ~3 candidates,
             so the orb could only alternate. Visibility is now a WEIGHT, not
             a gate — the whole board competes, near things simply weigh more. */
          var cands = board.comps.filter(function(c){
            return c.kind !== 'choke' && !c.noWater
              && wRecent.slice(-2).indexOf(c.kind + Math.round(c.x)) < 0;
          });
          if (!cands.length) cands = board.comps.filter(function(c){
            return c.kind !== 'choke' && !c.noWater; });
          var KW = {scu: 1.7, scc: 1.55, loop: 1.5, cpu: 1.25, gpu: 1.2,
                    models: 1.15, mcc: 0, guide: 1.1};
          var tw = 0, wts = cands.map(function(c){
            var key = c.kind + Math.round(c.x);
            var wt = (1.15 - c.e) * Math.sqrt(c.w * c.h);
            wt *= KW[c.kind] || 1;
            /* reachability: how near the viewport centre it would sit */
            var sy2 = (c.y - topW) / H;
            wt *= Math.exp(-Math.pow((sy2 - 0.5) / 0.42, 2));
            /* a long memory, and a hard aversion to anything recent */
            wt /= (1 + 0.55 * (wVisits[key] || 0));
            var ri = wRecent.indexOf(key);
            if (ri >= 0) wt *= 0.04 + 0.12 * (ri / Math.max(1, wRecent.length));
            /* distance: it should travel, not twitch in place */
            var dpx = Math.hypot(c.x - (0.5 + m1.x * 0.6) * W,
                                 (c.y - topW) - (0.5 - m1.y * 0.6) * H);
            wt *= 0.35 + Math.min(1.6, dpx / (W * 0.30));
            wt *= 0.55 + Math.random() * 1.1;   /* no two tours alike */
            tw += wt; return Math.max(0, wt); });
          var pick = cands[0], rw = Math.random() * tw;
          for (var wi = 0; wi < cands.length; wi++){
            rw -= wts[wi]; if (rw <= 0){ pick = cands[wi]; break; } }
          wLast = pick;
          var pkey = pick.kind + Math.round(pick.x);
          wVisits[pkey] = (wVisits[pkey] || 0) + 1;
          wRecent.push(pkey);
          if (wRecent.length > 8) wRecent.shift();
          /* land somewhere ON it, not always dead centre */
          var jx = (Math.random() - 0.5) * pick.w * 0.34;
          var jy = (Math.random() - 0.5) * pick.h * 0.34;
          mouse.x = Math.max(-0.55, Math.min(0.55, ((pick.x + jx) / W - 0.5) / 0.6));
          mouse.y = Math.max(-0.55, Math.min(0.55, (0.5 - (pick.y + jy - worldTop()) / H) / 0.6));
          wanderT = now + 3000 + Math.random() * 5000;
          if (Math.random() < 0.14){   /* sometimes it just drifts, looking */
            wLast = null;
            mouse.x = (Math.random() - 0.5) * 0.9;
            mouse.y = (Math.random() - 0.5) * 0.9;
            wanderT = now + 1600 + Math.random() * 1600;
          }
        } else if (wLast){
          /* the breathing hold — locked, but alive */
          /* clamped: a frozen clock must never let the breath run away */
          mouse.x = Math.max(-0.55, Math.min(0.55, mouse.x + Math.sin(now * 0.00047) * 0.00022));
          mouse.y = Math.max(-0.55, Math.min(0.55, mouse.y + Math.cos(now * 0.00039) * 0.00019));
        }
      }
      var f1 = 1 - Math.pow(1 - lerp1, dt * 60);
      var f2 = 1 - Math.pow(1 - lerp2, dt * 60);
      if (focus2){
        var dLock = Math.hypot(mouse.x - m1.x, mouse.y - m1.y);
        f1 = Math.min(1, f1 * (1 + 3.0 * Math.max(0, 1 - dLock * 6)));
      }
      m1.x += (mouse.x - m1.x) * f1; m1.y += (mouse.y - m1.y) * f1;
      m2.x += (m1.x - m2.x) * f2;   m2.y += (m1.y - m2.y) * f2;
      opacity += ((MOB ? 0.60 : 1) - opacity) * (1 - Math.pow(0.965, dt * 60));
      imgOpacity += (imgTarget - imgOpacity) * (1 - Math.pow(0.95, dt * 60));

      sFrac += (scrollFrac() - sFrac) * (1 - Math.pow(0.88, dt * 60));
      /* a negative frac (rubber-band) would make pow() NaN and kill the frame */
      if (!(sFrac >= 0)) sFrac = 0; else if (sFrac > 1) sFrac = 1;
      var top2 = worldTop();
      gl.uniform4f(U.uWorld, 1, ky, 0, (1 - ky) * (1 - (worldMax ? top2 / worldMax : 0)));
      /* growth: an organic curve + a breath + a surge from the reader's own motion */
      var sv = Math.abs(sFrac - lastSF); lastSF = sFrac;
      energy += (Math.min(1, sv * 26) - energy) * (1 - Math.pow(0.93, dt * 60));
      var shaped = Math.pow(sFrac, GR.curve);
      var breath = 1 + GR.wob * Math.sin(now * 0.00041 + GR.ph)
                     + GR.wob * 0.6 * Math.sin(now * 0.00097 + GR.ph * 1.7);
      var grow = (GR.a + GR.b * shaped) * breath * (1 + energy * 0.16);
      if (!isFinite(grow) || grow <= 0) grow = GR.a;
      gl.uniform1f(U.uSize, baseSize * grow);
      growNow = grow;
      if (water(dt, focus2) || worldDirty || Math.abs(top2 - lastTop) > 0.75){
        var ob = orbPx();
        board.render((now - t0) / 1000, {x: ob.x, y: top2 + ob.y, r: ob.r}, top2, focus2);
        frameN++;
        if ((frameN & 1) === 0 || !worldDirty) E.uploadWorld(board.work);
        lastTop = top2;
        worldDirty = board.comps.some(function(c){ return c.e > 0.02; });
      }
      if (bgx) bgx.drawImage(board.work, 0, top2, board.work.width, VH, 0, 0, W, H);
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
                litKinds: lit.map(function(c){ return c.kind; }), mcc: board.mcc(),
                top: Math.round(worldTop()), worldMax: worldMax};
      },
      board: function(){ board.render(1, null, worldTop()); return board.work.toDataURL('image/png'); },
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
  /* a window widened past the desktop gate deserves the orb too */
  if (!full){
    var mq = matchMedia('(min-width: 1000px)');
    var wake = function(){
      if (!mq.matches || full) return;
      full = initFull();
      if (full){
        SembleOrb.setImage = full.setImage; SembleOrb.clearImage = full.clearImage;
        SembleOrb.state = full.state; SembleOrb.board = full.board; SembleOrb.shot = full.shot;
      }
    };
    mq.addEventListener ? mq.addEventListener('change', wake) : addEventListener('resize', wake);
  }
  window.SembleOrb = {
    setImage: full ? full.setImage : function(){},
    clearImage: full ? full.clearImage : function(){},
    state: full ? full.state : function(){ return null; },
    board: full ? full.board : function(){ return null; },
    shot: full ? full.shot : function(){ return null; },
    mini: initMini
  };
})();
