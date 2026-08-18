/* ═══════════════════════════════════════════════════════════
   THE HELD ORB v2 — a faithful port of thoughtlab.com's blob,
   rebuilt from their shipped shader (read from their bundle, not
   imagined): a 4-step raymarched sphere pair smin-blended so the
   body stretches viscously while following; perturbed normals;
   dual fresnel; cubemap iridescence at the rim only; RGB-split
   refraction; and a second texture that pipes IMAGES through the
   glass. Their tuned constants kept; textures ours.
   API: SembleOrb.setImage(urlOrFile) · SembleOrb.clearImage()
        drag-drop an image anywhere · ?img=<url>
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (!matchMedia('(min-width: 1000px)').matches) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── their tuned constants, verbatim from the bundle ── */
  var C = {
    distortionFrequency: 2.174, distortionStrength: 1.63,
    displacementFrequency: 0.186, displacementStrength: 0.042,
    displacementScale: 0.675, displacementSpeed: 0.315,
    fresnelOffset: -1.4, fresnelMultiplier: 1.435, fresnelPower: 1.239,
    refraction: 0.03, refractionColorShift: 0.75,
    colorMix1Opacity: 0.11, colorMix1Smooth: 0.12,
    saturation: 0.978, redSat: 1.891, greenSat: 1.0, blueSat: 1.5,
    sizeDefault: 0.275,
    lerp1: 0.05, lerp2: 0.075,          /* hero: viscous mouse follow  */
    scrollLerp1: 0.2, scrollLerp2: 0.15 /* scroll: firmer point follow */
  };

  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden','true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
  document.body.insertBefore(cv, document.body.firstChild);
  var gl = cv.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:false});
  if (!gl) return;

  [].forEach.call(document.querySelectorAll('.wrap, .hero, nav.nav, footer'), function(el){
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.zIndex === 'auto') el.style.zIndex = '1';
  });

  /* ── shaders — their pipeline, reconstructed ── */
  var VERT =
  'attribute vec2 aPos;varying vec2 vUv;' +
  'void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';

  var FRAG =
  'precision highp float;\n' +
  'varying vec2 vUv;uniform vec4 uResolution;uniform float uTime;uniform float uOpacity;\n' +
  'uniform vec2 uMouse1;uniform vec2 uMouse2;uniform float uSize;\n' +
  'uniform samplerCube tMap;uniform sampler2D tRender;uniform sampler2D tImage;uniform float uImageOpacity;\n' +
  '#define DISTANCE 2.0\n' +
  /* — their helper stack — */
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
  /* the body: two spheres at the lagged follow points, smin-blended —
     this is what makes it stretch like liquid while it travels */
  'float sdf(vec3 p){' +
  '  vec3 c1=vec3(uMouse1*uResolution.zw*1.2,0.0);' +
  '  vec3 c2=vec3(uMouse2*uResolution.zw*1.2,0.0);' +
  '  return smin(sdSphere(p-c1,uSize),sdSphere(p-c2,uSize*0.92),0.35);}\n' +
  'vec3 getDisplacedPosition(vec3 p){' +
  '  float t=uTime;' +
  '  vec3 distort=vec3(cnoise(p*' + '2.174' + '+vec3(t*0.5)),cnoise(p*2.174+vec3(t*0.5+13.7)),cnoise(p*2.174+vec3(t*0.5+27.1)))*' + '1.63' + '*0.1;' +
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
  '    float fres=' + '(-1.4)' + '+(1.0+dot(nView,vNormal))*1.435;' +
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
  /* the image pipe — their tRenderHover: media shown through the glass */
  '    vec4 img=texture2D(tImage,vec2(screenUv.x,1.0-screenUv.y));' +
  '    vec3 background=mix(refracted,img.rgb,uImageOpacity*img.a);' +
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

  /* ── the environment: our palette as a cubemap — crimson, violet,
        amber and a cold blue, soft blobs on near-black ── */
  function envFace(hues){
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g2 = c.getContext('2d');
    g2.fillStyle = '#050507'; g2.fillRect(0,0,128,128);
    hues.forEach(function(h){
      var gr = g2.createRadialGradient(h[0],h[1],4,h[0],h[1],h[3]);
      gr.addColorStop(0, h[2]); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = gr; g2.fillRect(0,0,128,128);
    });
    return c;
  }
  var faces = [
    envFace([[36,44,'rgba(252,28,70,.95)',72],[96,100,'rgba(120,60,255,.8)',66]]),
    envFace([[90,40,'rgba(255,160,80,.9)',70],[30,96,'rgba(252,28,70,.75)',64]]),
    envFace([[64,30,'rgba(255,210,150,.95)',78],[100,90,'rgba(160,60,255,.7)',60]]),
    envFace([[40,90,'rgba(70,40,160,.85)',72],[100,30,'rgba(252,28,70,.6)',58]]),
    envFace([[70,64,'rgba(252,28,70,.9)',80],[20,20,'rgba(90,140,255,.65)',56]]),
    envFace([[54,70,'rgba(140,60,255,.85)',74],[104,40,'rgba(255,140,90,.7)',58]])
  ];
  var cube = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube);
  var tgts = [gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
              gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
              gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];
  tgts.forEach(function(t,i){ gl.texImage2D(t,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,faces[i]); });
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
  /* tRender — the page the glass bends: a quiet dark field */
  var bgC = document.createElement('canvas'); bgC.width = bgC.height = 256;
  var bg2 = bgC.getContext('2d');
  var gr = bg2.createRadialGradient(128,110,10,128,128,180);
  gr.addColorStop(0,'#0d0d10'); gr.addColorStop(1,'#000000');
  bg2.fillStyle = gr; bg2.fillRect(0,0,256,256);
  var renderTex = tex2D(1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bgC);
  gl.uniform1i(U.tRender, 1);

  /* tImage — the pipe. Anything loaded here shows through the orb. */
  var imgTex = tex2D(2), imgOpacity = 0, imgTarget = 0;
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,
                new Uint8Array([0,0,0,0]).length === 4 ? (function(){var c=document.createElement('canvas');c.width=c.height=2;return c;})() : null);
  gl.uniform1i(U.tImage, 2);

  function setImage(src){
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      var c = document.createElement('canvas');
      var s = Math.min(1024 / img.width, 1024 / img.height, 1);
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
      imgTarget = 1;
    };
    img.onerror = function(){ imgTarget = 0; };
    img.src = (src instanceof File) ? URL.createObjectURL(src) : src;
  }
  window.SembleOrb = {
    setImage: setImage,
    clearImage: function(){ imgTarget = 0; }
  };
  addEventListener('dragover', function(e){ e.preventDefault(); });
  addEventListener('drop', function(e){
    e.preventDefault();
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) setImage(f);
  });
  var qImg = new URLSearchParams(location.search).get('img');
  if (qImg) setImage(qImg);

  /* ── motion: their double-lerped follow. Mouse leads in the hero;
        scroll hands the orb from section to section. ── */
  var W, H, DPR;
  function fit(){
    DPR = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    gl.viewport(0, 0, cv.width, cv.height);
    var a = H / W, sx, sy;
    if (a > 1){ sx = 1; sy = a; } else { sx = 1 / a * 1; sy = 1; }
    /* uResolution.zw — the ray aspect, as they compute it */
    gl.uniform4f(U.uResolution, cv.width, cv.height, W >= H ? W / H : 1, W >= H ? 1 : H / W);
    var size = Math.min(Math.max(W, 800), 2000) / Math.max(W, 1000) * C.sizeDefault;
    gl.uniform1f(U.uSize, size * 1.35);
  }
  fit();
  addEventListener('resize', fit, {passive:true});

  var mouse = {x: 0, y: -0.05}, m1 = {x: 0, y: -0.05}, m2 = {x: 0, y: -0.05};
  var lerp1 = C.lerp1, lerp2 = C.lerp2, scrolling = false, scrollT = 0;

  addEventListener('mousemove', function(e){
    if (scrolling) return;
    mouse.x = (e.clientX / W - 0.5) * 0.85;
    mouse.y = (-e.clientY / H + 0.5) * 0.85;
  }, {passive:true});

  /* the sections are the waypoints — the orb is passed down to whichever
     section holds the viewport, drifting to its quieter side */
  var points = [];
  function mapPoints(){
    points = [].slice.call(document.querySelectorAll('section, .hero')).map(function(el, i){
      return {el: el, side: (i % 2 ? 0.3 : -0.3)};
    });
  }
  mapPoints();
  addEventListener('scroll', function(){
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
      mouse.y = Math.max(-0.42, Math.min(0.42, -(r2.top + r2.height / 2 - H / 2) / H * 0.6));
    }
  }, {passive:true});

  var opacity = 0, t0 = performance.now();
  function draw(now){
    var t = (now - t0) / 1000 * C.displacementSpeed;
    if (scrolling && Date.now() - scrollT > 900){
      scrolling = false; lerp1 = C.lerp1; lerp2 = C.lerp2;
    }
    m1.x += (mouse.x - m1.x) * lerp1; m1.y += (mouse.y - m1.y) * lerp1;
    m2.x += (m1.x - m2.x) * lerp2;   m2.y += (m1.y - m2.y) * lerp2;
    opacity += ((RM ? 1 : 1) - opacity) * 0.04;
    imgOpacity += (imgTarget - imgOpacity) * 0.05;

    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uOpacity, opacity);
    gl.uniform2f(U.uMouse1, m1.x, m1.y);
    gl.uniform2f(U.uMouse2, m2.x, m2.y);
    gl.uniform1f(U.uImageOpacity, imgOpacity);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  draw(t0 + 16);                       /* exist before any frame loop runs */
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
