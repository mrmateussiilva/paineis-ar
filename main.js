import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const THEMES = [
  { id:'geometrico', label:'Geométrico Dourado', panelBase:'#141018', panelBase2:'#221a2c', accent:'#D4AF37', totem:'#181119', balloons:['#D4AF37','#181119','#F5F1EA'] },
  { id:'tropical', label:'Tropical Neon', panelBase:'#1B1033', panelBase2:'#0e0a2e', accent:'#33D6C0', totem:'#241947', balloons:['#33D6C0','#FF3D7A','#241947'] },
  { id:'floral', label:'Floral Rose', panelBase:'#F7E9E6', panelBase2:'#efd8d3', accent:'#C98E8E', totem:'#C98E8E', balloons:['#E8A0A0','#F7E9E6','#B5714B'] },
  { id:'marmore', label:'Marmore & Ouro', panelBase:'#EDEAE3', panelBase2:'#dcd6c8', accent:'#C9A24B', totem:'#2B2B2B', balloons:['#C9A24B','#EDEAE3','#2B2B2B'] },
];

const config = {
  theme: THEMES[0],
  panelWidthM: 3.0,
  showTotems: true,
  showArch: true,
  showTable: false,
  balloonColor1: THEMES[0].balloons[0],
  balloonColor2: THEMES[0].balloons[1],
};

const $ = selector => document.querySelector(selector);
const byId = id => document.getElementById(id);

function createPanelCanvas(theme){
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 768;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,1024,768);
  grad.addColorStop(0, theme.panelBase);
  grad.addColorStop(1, theme.panelBase2);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,1024,768);

  if(theme.id === 'geometrico'){
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    const step = 96;
    for(let y=-step; y<768+step; y+=step){
      ctx.beginPath();
      for(let x=0; x<=1024; x+=step){
        const yy = y + (Math.floor(x/step)%2===0 ? 0 : step/2);
        ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if(theme.id === 'tropical'){
    ctx.globalAlpha = 0.5;
    for(let i=0;i<14;i++){
      const x = Math.random()*1024;
      const y = Math.random()*768;
      const s = 60+Math.random()*90;
      ctx.fillStyle = i%2===0 ? theme.accent : '#FF3D7A';
      ctx.beginPath();
      ctx.ellipse(x,y,s*0.25,s,Math.random()*Math.PI,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if(theme.id === 'floral'){
    ctx.globalAlpha = 0.5;
    for(let i=0;i<26;i++){
      const x = Math.random()*1024;
      const y = Math.random()*768;
      const r = 10+Math.random()*22;
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if(theme.id === 'marmore'){
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.5;
    for(let i=0;i<10;i++){
      ctx.beginPath();
      const x0 = Math.random()*1024;
      ctx.moveTo(x0,0);
      ctx.bezierCurveTo(x0+Math.random()*300-150,256,x0+Math.random()*300-150,512,x0+Math.random()*200-100,768);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = theme.accent;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 10;
  ctx.strokeRect(5,5,1014,758);
  return c;
}

function createShadowBlobTexture(){
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256,128,10,256,128,240);
  g.addColorStop(0,'rgba(0,0,0,0.55)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,512,256);
  return c;
}

function createFloorTexture(){
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#141019';
  ctx.fillRect(0,0,512,512);
  const g = ctx.createRadialGradient(256,256,20,256,256,300);
  g.addColorStop(0,'rgba(255,255,255,0.06)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,512,512);
  return c;
}

function buildAssemblyGroup(cfg, opts = {}){
  const group = new THREE.Group();
  const theme = cfg.theme;
  const w = cfg.panelWidthM;
  const h = 2.4;

  const poleMat = new THREE.MeshStandardMaterial({color:0x2a2a2e, metalness:0.6, roughness:0.4});
  [-w/2+0.05, w/2-0.05].forEach(px=>{
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,h+0.3,10), poleMat);
    pole.position.set(px, (h+0.3)/2, -1.55);
    group.add(pole);
  });

  const panelTex = new THREE.CanvasTexture(createPanelCanvas(theme));
  panelTex.anisotropy = 4;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.04),
    new THREE.MeshStandardMaterial({map:panelTex, roughness:0.55, metalness:0.05})
  );
  panel.position.set(0, h/2, -1.5);
  panel.castShadow = true;
  group.add(panel);

  if(cfg.showTotems){
    const totemMat = new THREE.MeshStandardMaterial({color:new THREE.Color(theme.totem), roughness:0.4, metalness:0.25});
    const ringMat = new THREE.MeshStandardMaterial({color:new THREE.Color(theme.accent), metalness:0.8, roughness:0.3});
    [-1,1].forEach(side=>{
      const tx = side * (w/2 + 0.55);
      const totem = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,1.9,20), totemMat);
      totem.position.set(tx, 0.95, -0.4);
      totem.castShadow = true;
      group.add(totem);
      [0.05, 1.85].forEach(ry=>{
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.235,0.02,8,24), ringMat);
        ring.rotation.x = Math.PI/2;
        ring.position.set(tx, ry, -0.4);
        group.add(ring);
      });
    });
  }

  if(cfg.showArch){
    const colors = [cfg.balloonColor1, cfg.balloonColor2, theme.accent];
    const archGroup = new THREE.Group();
    const arcRadius = w*0.42;
    const segments = Math.max(18, Math.round(w*7));
    for(let i=0;i<=segments;i++){
      const t = i/segments;
      const angle = Math.PI - t*Math.PI;
      const bx = Math.cos(angle)*arcRadius;
      const by = Math.sin(angle)*arcRadius + 0.15;
      const r = 0.13 + Math.random()*0.05;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(r, 14, 14),
        new THREE.MeshStandardMaterial({color:new THREE.Color(colors[i%colors.length]), roughness:0.25, metalness:0.05})
      );
      sphere.position.set(bx, by, -0.05 + (Math.random()-0.5)*0.15);
      sphere.castShadow = true;
      archGroup.add(sphere);
    }
    group.add(archGroup);
  }

  if(cfg.showTable){
    const clothMat = new THREE.MeshStandardMaterial({color:new THREE.Color(theme.accent), roughness:0.6});
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.6,0.75,24), clothMat);
    top.position.set(0, 0.375, 0.9);
    top.castShadow = true;
    group.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55,0.02,8,32), new THREE.MeshStandardMaterial({color:new THREE.Color(theme.totem), metalness:0.7, roughness:0.3}));
    rim.rotation.x = Math.PI/2;
    rim.position.set(0, 0.75, 0.9);
    group.add(rim);
    const topper = new THREE.Mesh(new THREE.SphereGeometry(0.12,16,16), new THREE.MeshStandardMaterial({color:new THREE.Color(theme.balloons[0])}));
    topper.position.set(0, 0.95, 0.9);
    group.add(topper);
  }

  if(opts.includeShadowBlob){
    const tex = new THREE.CanvasTexture(createShadowBlobTexture());
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(w*1.4, 1.2),
      new THREE.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false})
    );
    blob.rotation.x = -Math.PI/2;
    blob.position.set(0, 0.005, -0.3);
    group.add(blob);
  }

  return group;
}

function computeAreaText(w){
  return `${(w * 2.4).toFixed(1).replace('.', ',')} m²`;
}

let builderScene;
let builderCamera;
let builderRenderer;
let builderGroup;
const builderTarget = new THREE.Vector3(0,1.1,0);
const sph = { radius:6.5, theta:Math.PI/2, phi:1.05 };
let dragState = null;

function initBuilder(){
  const canvas = byId('builder-canvas');
  builderScene = new THREE.Scene();
  builderCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  builderRenderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  builderRenderer.shadowMap.enabled = true;
  builderRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hemi = new THREE.HemisphereLight(0xfff2e0, 0x0a0810, 0.55);
  builderScene.add(hemi);
  const spot = new THREE.SpotLight(0xfff2df, 1.6, 20, Math.PI/5, 0.5, 1.2);
  spot.position.set(2.5, 5.5, 3);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024,1024);
  builderScene.add(spot);
  const fill = new THREE.DirectionalLight(0x6a5cff, 0.25);
  fill.position.set(-3, 2, -2);
  builderScene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(createFloorTexture()), roughness:0.9})
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  builderScene.add(floor);

  rebuildBuilderGroup();
  bindBuilderPointerEvents(canvas);
  resizeBuilder();
  animateBuilder();
}

function rebuildBuilderGroup(){
  if(builderGroup) builderScene.remove(builderGroup);
  builderGroup = buildAssemblyGroup(config, {includeShadowBlob:false});
  builderScene.add(builderGroup);
}

function bindBuilderPointerEvents(canvas){
  canvas.addEventListener('pointerdown', e=>{
    dragState = {x:e.clientX, y:e.clientY, theta:sph.theta, phi:sph.phi};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e=>{
    if(!dragState) return;
    const dx = e.clientX - dragState.x;
    const dy = e.clientY - dragState.y;
    sph.theta = dragState.theta - dx*0.007;
    sph.phi = Math.min(Math.PI-0.15, Math.max(0.25, dragState.phi - dy*0.007));
  });
  canvas.addEventListener('pointerup', ()=> dragState = null);
  canvas.addEventListener('pointerleave', ()=> dragState = null);
  canvas.addEventListener('wheel', e=>{
    e.preventDefault();
    sph.radius = Math.min(11, Math.max(3.5, sph.radius + e.deltaY*0.003));
  }, {passive:false});
}

function updateBuilderCamera(){
  const {radius, theta, phi} = sph;
  builderCamera.position.set(
    builderTarget.x + radius*Math.sin(phi)*Math.cos(theta),
    builderTarget.y + radius*Math.cos(phi),
    builderTarget.z + radius*Math.sin(phi)*Math.sin(theta)
  );
  builderCamera.lookAt(builderTarget);
}

function resizeBuilder(){
  if(!builderRenderer) return;
  const stage = $('#builder-view .stage');
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if(!w || !h) return;
  builderRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  builderRenderer.setSize(w,h,false);
  builderCamera.aspect = w/h;
  builderCamera.updateProjectionMatrix();
}

function animateBuilder(){
  requestAnimationFrame(animateBuilder);
  if(!byId('builder-view').classList.contains('active')) return;
  updateBuilderCamera();
  builderRenderer.render(builderScene, builderCamera);
}

function renderThemeGrid(){
  const grid = byId('theme-grid');
  grid.innerHTML = '';
  THEMES.forEach(theme=>{
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `theme-card${theme.id===config.theme.id ? ' active' : ''}`;
    card.innerHTML = `<div class="theme-swatch" style="background:linear-gradient(135deg, ${theme.panelBase}, ${theme.accent})"></div><span>${theme.label}</span>`;
    card.addEventListener('click', ()=>{
      config.theme = theme;
      config.balloonColor1 = theme.balloons[0];
      config.balloonColor2 = theme.balloons[1];
      byId('balloon-color-1').value = theme.balloons[0];
      byId('balloon-color-2').value = theme.balloons[1];
      renderThemeGrid();
      rebuildBuilderGroup();
      rebuildARGroup();
      updateDrawerSummary();
    });
    grid.appendChild(card);
  });
}

function updateDrawerSummary(){
  const el = byId('drawer-summary');
  if(el) el.textContent = `${config.theme.label} · ${config.panelWidthM.toFixed(1).replace('.', ',')} m`;
}

function initControls(){
  renderThemeGrid();
  byId('drawer-handle').addEventListener('click', ()=> byId('controls-drawer').classList.toggle('open'));
  byId('balloon-color-1').value = config.balloonColor1;
  byId('balloon-color-2').value = config.balloonColor2;
  byId('area-val').textContent = computeAreaText(config.panelWidthM);

  byId('width-slider').addEventListener('input', e=>{
    config.panelWidthM = parseFloat(e.target.value);
    byId('width-val').textContent = `${config.panelWidthM.toFixed(1)} m`;
    byId('area-val').textContent = computeAreaText(config.panelWidthM);
    rebuildBuilderGroup();
    rebuildARGroup();
    updateDrawerSummary();
  });

  byId('balloon-color-1').addEventListener('input', e=>{
    config.balloonColor1 = e.target.value;
    rebuildBuilderGroup();
    rebuildARGroup();
  });
  byId('balloon-color-2').addEventListener('input', e=>{
    config.balloonColor2 = e.target.value;
    rebuildBuilderGroup();
    rebuildARGroup();
  });

  byId('toggle-totems').addEventListener('change', e=>{ config.showTotems = e.target.checked; rebuildBuilderGroup(); rebuildARGroup(); });
  byId('toggle-arch').addEventListener('change', e=>{ config.showArch = e.target.checked; rebuildBuilderGroup(); rebuildARGroup(); });
  byId('toggle-table').addEventListener('change', e=>{ config.showTable = e.target.checked; rebuildBuilderGroup(); rebuildARGroup(); });
  byId('go-to-ar').addEventListener('click', ()=> switchTab('ar'));
  byId('send-quote').addEventListener('click', sendQuote);
}

function sendQuote(){
  const itens = [];
  if(config.showTotems) itens.push('totens');
  if(config.showArch) itens.push('arco de baloes');
  if(config.showTable) itens.push('mesa de apoio');
  const msg = `Quero orcamento dessa montagem: painel ${config.theme.label} de ${config.panelWidthM.toFixed(1)}m de largura` +
    (itens.length ? `, com ${itens.join(', ')}` : '') +
    `, baloes nas cores ${config.balloonColor1} e ${config.balloonColor2}.`;
  if(window.sendPrompt) window.sendPrompt(msg);
}

function switchTab(name){
  byId('tab-builder').classList.toggle('active', name === 'builder');
  byId('tab-ar').classList.toggle('active', name === 'ar');
  byId('builder-view').classList.toggle('active', name === 'builder');
  byId('ar-view').classList.toggle('active', name === 'ar');
  if(name === 'ar') onEnterAR();
  else onLeaveAR();
  if(name === 'builder') requestAnimationFrame(resizeBuilder);
}

let arScene;
let arCamera;
let arRenderer;
let arGroup;
let arReticle;
let arController;
let arHitTestSource = null;
let arHitTestSourceRequested = false;
let nativeARButton = null;
let iosObjectUrl = null;
let webXRSupported = false;

function initARThree(){
  if(arScene) return;
  const canvas = byId('ar-canvas');
  arScene = new THREE.Scene();
  arCamera = new THREE.PerspectiveCamera(70, 1, 0.01, 40);
  arRenderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  arRenderer.setClearColor(0x000000, 0);
  arRenderer.xr.enabled = true;
  arRenderer.setAnimationLoop(renderARFrame);

  arScene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.05));
  const dir = new THREE.DirectionalLight(0xffffff, 0.65);
  dir.position.set(2,4,2);
  arScene.add(dir);

  arReticle = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({color:0xff6a3d})
  );
  arReticle.matrixAutoUpdate = false;
  arReticle.visible = false;
  arScene.add(arReticle);

  rebuildARGroup();
  arGroup.visible = false;

  arController = arRenderer.xr.getController(0);
  arController.addEventListener('select', placeARGroupAtReticle);
  arScene.add(arController);

  createNativeARButton();
  resizeAR();
}

function rebuildARGroup(){
  if(!arScene) return;
  const wasPlaced = arGroup ? arGroup.visible : false;
  const oldPosition = arGroup ? arGroup.position.clone() : null;
  const oldQuaternion = arGroup ? arGroup.quaternion.clone() : null;

  if(arGroup) arScene.remove(arGroup);
  arGroup = buildAssemblyGroup(config, {includeShadowBlob:true});
  arGroup.visible = wasPlaced;
  arGroup.scale.setScalar(1);
  if(oldPosition && oldQuaternion){
    arGroup.position.copy(oldPosition);
    arGroup.quaternion.copy(oldQuaternion);
  }
  arScene.add(arGroup);
}

function createNativeARButton(){
  if(nativeARButton) return;
  nativeARButton = ARButton.createButton(arRenderer, {
    requiredFeatures:['hit-test'],
    optionalFeatures:['local-floor', 'dom-overlay'],
    domOverlay:{root:document.body},
  });
  nativeARButton.classList.add('ar-button-hidden');
  nativeARButton.setAttribute('aria-hidden', 'true');
  document.body.appendChild(nativeARButton);

  arRenderer.xr.addEventListener('sessionstart', ()=>{
    arHitTestSource = null;
    arHitTestSourceRequested = false;
    arReticle.visible = false;
    if(arGroup) arGroup.visible = false;
    byId('ar-empty').style.display = 'none';
    byId('ar-placement-hint').classList.remove('hidden');
  });
  arRenderer.xr.addEventListener('sessionend', ()=>{
    arHitTestSource = null;
    arHitTestSourceRequested = false;
    arReticle.visible = false;
    byId('ar-empty').style.display = 'flex';
    byId('ar-placement-hint').classList.add('hidden');
  });
}

function renderARFrame(_timestamp, frame){
  if(frame){
    const referenceSpace = arRenderer.xr.getReferenceSpace();
    const session = arRenderer.xr.getSession();

    if(!arHitTestSourceRequested){
      session.requestReferenceSpace('viewer')
        .then(viewerSpace => session.requestHitTestSource({space:viewerSpace}))
        .then(source => { arHitTestSource = source; })
        .catch(() => {
          arHitTestSourceRequested = false;
          arHitTestSource = null;
        });

      session.addEventListener('end', ()=>{
        arHitTestSourceRequested = false;
        arHitTestSource = null;
      }, {once:true});

      arHitTestSourceRequested = true;
    }

    if(arHitTestSource){
      const hitTestResults = frame.getHitTestResults(arHitTestSource);
      if(hitTestResults.length){
        const pose = hitTestResults[0].getPose(referenceSpace);
        arReticle.visible = true;
        arReticle.matrix.fromArray(pose.transform.matrix);
      } else {
        arReticle.visible = false;
      }
    }
  }

  arRenderer.render(arScene, arCamera);
}

function placeARGroupAtReticle(){
  if(!arReticle || !arReticle.visible || !arGroup) return;
  arReticle.matrix.decompose(arGroup.position, arGroup.quaternion, arGroup.scale);
  arGroup.scale.setScalar(1);
  arGroup.visible = true;
  byId('ar-empty').style.display = 'none';
  byId('ar-placement-hint').classList.add('hidden');
}

function resizeAR(){
  if(!arRenderer) return;
  const stage = byId('ar-stage');
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if(!w || !h) return;
  arRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  arRenderer.setSize(w,h,false);
  arCamera.aspect = w/h;
  arCamera.updateProjectionMatrix();
}

async function updateARDeviceUI(){
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const androidBtn = byId('ar-open-android');
  const iosBtn = byId('ar-open-ios');
  const note = byId('ar-device-note');

  webXRSupported = Boolean(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar').catch(()=>false));

  androidBtn.classList.toggle('is-hidden', !webXRSupported || isIOS);
  iosBtn.classList.toggle('is-hidden', webXRSupported && !isIOS);

  if(webXRSupported && !isIOS){
    note.textContent = 'WebXR disponivel: o Chrome detecta o piso via hit-test e ancora a montagem em escala real.';
  } else if(isIOS){
    note.textContent = 'iOS nao oferece WebXR no Safari. O modelo atual sera exportado como GLB e aberto pelo fluxo AR do aparelho.';
  } else {
    note.textContent = 'WebXR AR nao esta disponivel neste navegador. Use um Android compativel ou o fallback de exportacao GLB.';
  }
}

function onEnterAR(){
  initARThree();
  rebuildARGroup();
  resizeAR();
  updateARDeviceUI();
}

function onLeaveAR(){
  const session = arRenderer?.xr?.getSession();
  if(session) session.end();
  byId('ar-placement-hint').classList.add('hidden');
}

function openAndroidAR(){
  initARThree();
  resizeAR();
  if(webXRSupported && nativeARButton && typeof nativeARButton.click === 'function'){
    nativeARButton.click();
    return;
  }
  alert('WebXR AR nao esta disponivel neste navegador. Use Chrome em um Android compativel.');
}

function exportCurrentAssemblyGLB(){
  return new Promise((resolve, reject)=>{
    const exportScene = new THREE.Scene();
    const exportGroup = buildAssemblyGroup(config, {includeShadowBlob:false});
    exportGroup.name = 'Vitrine 3D - escala real';
    exportScene.add(exportGroup);

    const exporter = new GLTFExporter();
    exporter.parse(
      exportScene,
      result=>{
        const blob = result instanceof ArrayBuffer
          ? new Blob([result], {type:'model/gltf-binary'})
          : new Blob([JSON.stringify(result)], {type:'model/gltf+json'});
        resolve(blob);
      },
      reject,
      {binary:true}
    );
  });
}

async function openIOSQuickLook(){
  const iosBtn = byId('ar-open-ios');
  iosBtn.disabled = true;
  iosBtn.textContent = 'Gerando GLB...';
  try{
    const blob = await exportCurrentAssemblyGLB();
    if(iosObjectUrl) URL.revokeObjectURL(iosObjectUrl);
    iosObjectUrl = URL.createObjectURL(blob);
    const link = byId('ios-ar-link');
    link.href = iosObjectUrl;
    link.download = 'vitrine-3d.glb';
    link.click();
  }catch(err){
    alert(`Nao consegui gerar o arquivo AR: ${err.message}`);
  }finally{
    iosBtn.disabled = false;
    iosBtn.textContent = 'Ver no iPhone (AR)';
  }
}

function initApp(){
  byId('tab-builder').addEventListener('click', ()=> switchTab('builder'));
  byId('tab-ar').addEventListener('click', ()=> switchTab('ar'));
  byId('ar-open-android').addEventListener('click', openAndroidAR);
  byId('ar-open-ios').addEventListener('click', openIOSQuickLook);
  window.addEventListener('resize', ()=>{
    resizeBuilder();
    resizeAR();
  });

  initControls();
  initBuilder();
  updateARDeviceUI();
}

initApp();
