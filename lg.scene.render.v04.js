/* lg.scene.render.v04.js ────────────────────────────────────────────
 *  3D Room Mode Calculator, Resonance Export, and SPAT Visualizer
 *  this version: corrects world coordinates, opacity dimmers, azimuth updaters  
 *  © 2025 Louis Goldford — Licensed under the Creative Commons
 *  Attribution-NoDerivatives 4.0 International Licence (CC BY-ND 4.0)
 *  https://creativecommons.org/licenses/by-nd/4.0/
 * 
 * 3D Model Attributions — 
 * 
 * "Male Head" (https://skfb.ly/6uKGM) by Alexander Antipov
 * is licensed under Creative Commons Attribution (CC BY 4.0)
 * http://creativecommons.org/licenses/by/4.0/
 * 
 * Model used in this scene to visualize the listener's head.
 * Blinking ear lights (red/green) added to indicate orientation.
 * 
 * "Yamaha HS5 Studio Monitor" (https://skfb.ly/osqu7) by Ivan_WSK
 * is licensed under Creative Commons Attribution (CC BY 4.0)
 * http://creativecommons.org/licenses/by/4.0/
 * 
 * Skybox environments from "penguins-skybox-pack" by Zachery "skiingpenguins" Slocum
 * (freezurbern@gmail.com) — http://www.freezurbern.com
 * Licensed under Creative Commons Attribution-ShareAlike 3.0 Unported License
 * http://creativecommons.org/licenses/by-sa/3.0/
 * 
 *──────────────────────────────────────────────────────────────*/

import * as THREE from 'three';
import { OrbitControls }      from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/CSS2DRenderer.js';
import { GUI }               from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';
import { AnaglyphEffect }    from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/effects/AnaglyphEffect.js';
import { ParallaxBarrierEffect } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/effects/ParallaxBarrierEffect.js';
import {
  createDefaultScene,
  convertThreeToSpat,
  convertSpatToThree,
//   Area, // <= DEPRACATED! Area properties will later be sent to Max via OSC using current room coordintes set in the gui.
  convertAEDtoXYZ, 
  convertAedToThree,
  computeSpeakerRingLayout,
  computeSourceRingLayout,
  Source,
  Speaker
} from './lg.spat.io.v01.js';
import { SpatOscBridge }  from './lg.spatOscBridge.v03.js';
// moves the listener / sources / speakers in real time,
// maintains a dat.gui “OSC Log”.
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

/*──────── PARAMS ───────────────────────────────────────*/
const params = {
  Lx: 5.2, Ly: 4.3, Lz: 2.7, dx: 0.05, T60: 0.50,
  mx: 1,   my: 2,   mz: 1,
  // freq: 0.4, pointSize: 0.035, opacity: 0.6,
  freq: 0.4, pointSize: 0.035, opacity: 0., // temporarily transparent for head modeling
  hueBlue: 0.79, gamma: 0.6, Lmin: 0.35, Lmax: 0.5,
  schroMult: 1.1, showRulers: false, showRulerLabels: false,
  // visibility parameters:
  speakerOpacity: 0.35,
  sourceOpacity: 1.0,
  sourceColor: 'green-yellow', // Default current color
  sourceMetalness: 0.1,
  sourceRoughness: 0.6,
  // Reflection lighting for metallic sources
  reflectionLightingEnabled: true,
  reflectionLightIntensity: 1.0,
  ambientLightIntensity: 0.05,
  keyLightIntensity: 0.8,
  listenerHeadOpacity: 0.3,
  aircraftLightsOpacity: 0.5,
  blinkingEnabled: true,
  // animation parameters:
  voxelAnimationEnabled: true,
  // environment parameters:
  environmentEnabled: false,
  skyboxType: 'cube',
  skyboxEnvironment: 'dusk',
  skyboxIntensity: 1.0,
  skyboxOpacity: 1.0,
  // 3D stereoscopic parameters:
  stereoMode: 'none',
  eyeSeparation: 0.064,
  focalDistance: 10.0,
  // Camera tracking parameters:
  cameraMode: 'manual',
  orbitRadius: 7.5,
  orbitSpeed: 0.2,
  orbitHeight: 1.5,
  orbitAnimating: false,
  attachTarget: 'none',
  attachOffsetX: 0,
  attachOffsetY: 0.5,
  attachOffsetZ: 0.2,
  lookAtTarget: 'none',
  // Tracking mode parameters:
  trackingEnabled: false,
  trackingSmooth: true,
  trackingInterpolation: 0.1,
  // Presentation presets:
  cameraPreset: 'none',
  // Projector window parameters:
  projectorWindowEnabled: false,
  projectorWidth: 1920,
  projectorHeight: 1080,
  projectorBackground: 'black',
  projectorShowInfo: false,
  // OSC parameters:
  oscLogEnabled: false
};

/* snapshot the defaults once, before any slider interaction */
const defaults = JSON.parse(JSON.stringify(params));

/* Skybox environments from penguins-skybox-pack */
const skyboxOptions = {
  'arid': 'penguins',
  'arid2': 'penguins (2)',
  'barren': 'penguins (3)',
  'battery': 'penguins (4)',
  'bay': 'penguins (5)',
  'blizzard': 'penguins (6)',
  'cocoa': 'penguins (7)',
  'desertdawn': 'penguins (8)',
  'divine': 'penguins (9)',
  'dusk': 'penguins (10)',
  'dust': 'penguins (11)',
  'flames': 'penguins (12)',
  'gloom': 'penguins (13)',
  'harmony': 'penguins (14)',
  'haze': 'penguins (15)',
  'heather': 'penguins (16)',
  'humble': 'penguins (17)',
  'kenon_cloudbox': 'penguins (18)',
  'kenon_star': 'penguins (19)',
  'majik': 'penguins (20)',
  'meadow': 'penguins (21)',
  'mellow': 'penguins (22)',
  'morning': 'penguins (23)',
  'mystic': 'penguins (24)',
  'ocean': 'penguins (25)',
  'overcast': 'penguins (26)',
  'paze': 'penguins (27)',
  'pit': 'penguins (28)',
  'quirk': 'penguins (29)',
  'raspberry': 'penguins (30)',
  'serenity': 'penguins (31)',
  'sleepyhollow': 'penguins (32)',
  'sun': 'penguins (33)',
  'tears': 'penguins (34)',
  'torture': 'penguins (35)',
  'trance': 'penguins (36)',
  'tropic': 'penguins (37)',
  'trouble': 'penguins (38)',
  'valley': 'penguins (39)',
  'violence': 'penguins (40)',
  'vulcan': 'penguins (41)',
  'wasteland': 'penguins (42)',
  'wrath': 'penguins (43)',
  'yonder': 'penguins (44)',
  'zeus': 'penguins (45)'
};

/*──────── DOM: MODE TABLE + BUTTONS ────────────────────────*/
{
  document.body.appendChild(Object.assign(document.createElement('div'),{id:'modeTable'}));
  const txtBtn=document.getElementById('downloadBtn'); const jsonBtn=document.getElementById('downloadJsonBtn');
  const nodeBtn=document.getElementById('nodeSourcesBtn');
  const entityBtn=document.getElementById('entityTableBtn'); const controllerBtn=document.getElementById('controllerTableBtn');
  if(txtBtn) txtBtn.addEventListener('click',downloadColl);
  if(jsonBtn)jsonBtn.addEventListener('click',sendJsonToMax);
  if(nodeBtn)nodeBtn.addEventListener('click',toggleNodeSourcesMode);
  if(entityBtn)entityBtn.addEventListener('click',toggleEntityTableDisplay);
  if(controllerBtn)controllerBtn.addEventListener('click',toggleControllerTableDisplay);
}

/*──────────────────────────────────────────────────────────────
  THREE.JS SCAFFOLDING
──────────────────────────────────────────────────────────────*/

const container=document.getElementById('container');
let scene = new THREE.Scene();
let sourceMesh, sourceLabel;
let sourceMeshes = [];
let sourceLabels = [];

let speakerMeshes = [];
let listenerMeshes = []; // head + ears
let earGlowSprites = []; // red + green glow

let redMat, greenMat;
let redGlow, greenGlow;

let yamahaSpeakerTemplate = null;
let skyBox = null;

let sources = [];
let speakers = [];
let resonanceSources = [];  // Store resonance-based sources separately

/*──────── DYNAMIC POSITION TABLES ───────────────────────────────*/
// Entity position tracking for OSC coordination and origin repositioning
const entityPositions = {
  listener: { x: 0, y: 0, z: 0, lastUpdated: null, initialized: false },
  sources: {},
  speakers: {}
};

// Active mobile controller management
const activeControllers = {
  // Structure: "deviceId": { label, boundSource, lastSeen, originOffset, customOrigin }
};

// Update entity position and timestamp
function updateEntityPosition(type, id, x, y, z) {
  const timestamp = Date.now();
  
  if (type === 'listener') {
    entityPositions.listener = { x, y, z, lastUpdated: timestamp, initialized: true };
  } else if (type === 'source') {
    if (!entityPositions.sources[id]) {
      entityPositions.sources[id] = {};
    }
    Object.assign(entityPositions.sources[id], { x, y, z, lastUpdated: timestamp });
  } else if (type === 'speaker') {
    if (!entityPositions.speakers[id]) {
      entityPositions.speakers[id] = {};
    }
    Object.assign(entityPositions.speakers[id], { x, y, z, lastUpdated: timestamp });
  }
  
  // console.log(`[EntityTable] Updated ${type}${id ? ` ${id}` : ''} position: (${x}, ${y}, ${z})`);
}

// Get current entity position
function getEntityPosition(type, id = null) {
  if (type === 'listener') {
    return entityPositions.listener;
  } else if (type === 'source' && id && entityPositions.sources[id]) {
    return entityPositions.sources[id];
  } else if (type === 'speaker' && id && entityPositions.speakers[id]) {
    return entityPositions.speakers[id];
  }
  return null;
}

// Register mobile controller
function registerController(deviceId, label = '') {
  activeControllers[deviceId] = {
    label: label || deviceId,
    boundSource: null,
    lastSeen: Date.now(),
    originOffset: { x: 0, y: 0, z: 0 },
    customOrigin: false
  };
  console.log(`[ControllerTable] Registered controller: ${deviceId} (${label})`);
  
  // Update the UI display if the controller table is visible
  if (controllerTableVisible) {
    updateControllerTableDisplay();
  }
}

// Bind controller to source
function bindControllerToSource(deviceId, sourceId, label = '') {
  if (activeControllers[deviceId] && entityPositions.sources[sourceId]) {
    // Unbind any previous source
    const previousSource = activeControllers[deviceId].boundSource;
    if (previousSource) {
      if (entityPositions.sources[previousSource]) {
        entityPositions.sources[previousSource].controller = null;
        entityPositions.sources[previousSource].label = `s${previousSource}`;
      }
    }
    
    // Bind to new source
    activeControllers[deviceId].boundSource = sourceId;
    activeControllers[deviceId].lastSeen = Date.now();
    
    const sourceLabel = label ? `s${sourceId} ${label}` : `s${sourceId} ${deviceId}`;
    entityPositions.sources[sourceId].controller = deviceId;
    entityPositions.sources[sourceId].label = sourceLabel;
    
    console.log(`[ControllerTable] Bound ${deviceId} to source ${sourceId}: ${sourceLabel}`);
    
    // Update the UI display if the controller table is visible
    if (controllerTableVisible) {
      updateControllerTableDisplay();
    }
    // Also update entity table since source binding changed
    if (entityTableVisible) {
      updateEntityTableDisplay();
    }
    
    return sourceLabel;
  }
  return null;
}

// Unbind controller from source
function unbindControllerFromSource(deviceId) {
  if (activeControllers[deviceId] && activeControllers[deviceId].boundSource) {
    const sourceId = activeControllers[deviceId].boundSource;
    
    // Clear source binding
    if (entityPositions.sources[sourceId]) {
      entityPositions.sources[sourceId].controller = null;
      entityPositions.sources[sourceId].label = `s${sourceId}`;
    }
    
    // Clear controller binding
    activeControllers[deviceId].boundSource = null;
    activeControllers[deviceId].lastSeen = Date.now();
    
    console.log(`[ControllerTable] Unbound ${deviceId} from source ${sourceId}`);
    
    // Update the UI display if the controller table is visible
    if (controllerTableVisible) {
      updateControllerTableDisplay();
    }
    // Also update entity table since source binding changed
    if (entityTableVisible) {
      updateEntityTableDisplay();
    }
    
    return sourceId;
  }
  return null;
}
let nodeSourcesMode = false;  // Track if NODE SOURCES mode is active

let listener = null;  // Do not add a dummy — wait for /listener/aed
let headGroup = null;

// Track current counts for OSC callbacks
let currentSourceCount = 3;
let currentSpeakerCount = 8;

function onListenerAED(az, el, d) {
  const pos = convertAedToThree(az, el, d);
  console.log('[DEBUG] /listener/aed → XYZ', pos);

  const first = !listener;
  if (first) {
    listener = new THREE.Object3D();
    scene.add(listener);
    loadHeadModel(pos);
  }

  listener.position.set(pos.x, pos.y, pos.z);
  
  // Update dynamic position table
  updateEntityPosition('listener', null, pos.x, pos.y, pos.z);
}

function onListenerXYZ(x, y, z) {
  const p = convertSpatToThree(x, y, z);
  const first = !listener;

  if (first) {
    listener = new THREE.Object3D();
    scene.add(listener);

    // Use the same complete head setup as rebuildScene()
    loadHeadModel(p, ({ headGroup, leftEar, rightEar, redGlow, greenGlow }) => {
      listener.add(headGroup);

      // Assign globals properly for main animate() loop
      window.headGroup = headGroup;
      window.leftEar = leftEar;
      window.rightEar = rightEar;
      window.leftLight = headGroup.children.find(obj => obj instanceof THREE.PointLight && obj.color.getHex() === 0xff0000);
      window.rightLight = headGroup.children.find(obj => obj instanceof THREE.PointLight && obj.color.getHex() === 0x00ff00);

      redMat = leftEar.material;
      greenMat = rightEar.material;

      listenerMeshes.push(headGroup, leftEar, rightEar);
      earGlowSprites.push(redGlow, greenGlow);

      // Make listener head semi-transparent
      headGroup.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = params.listenerHeadOpacity;
          child.material.depthWrite = true;
        }
      });

      // Start the same blinking animation as rebuildScene()
      let maxGlowOpacity = params.aircraftLightsOpacity;
      let maxEarOpacity = params.aircraftLightsOpacity;

      // Hook slider changes
      Object.defineProperty(params, 'aircraftLightsOpacity', {
        set(val) {
          maxGlowOpacity = val;
          maxEarOpacity = val;
        },
        get() {
          return maxGlowOpacity;
        }
      });

      // Add PointLights to simulate glow
      const redLight = new THREE.PointLight(0xff0000, 0, 1.5);
      const greenLight = new THREE.PointLight(0x00ff00, 0, 1.5);
      redLight.position.copy(leftEar.position);
      greenLight.position.copy(rightEar.position);
      headGroup.add(redLight, greenLight);

      // Blinking rates and intensities
      const maxEmissive = 2.5;
      const maxLightIntensity = 1.2;
      const blinkSpeedRed = 1.0;
      const blinkSpeedGreen = 1.15;

      const blinkLoop = () => {
        const currentTime = performance.now() * 0.001; // Convert to seconds

        const redBlink = Math.max(0, Math.sin(currentTime * blinkSpeedRed * Math.PI));
        const greenBlink = Math.max(0, Math.sin(currentTime * blinkSpeedGreen * Math.PI));

        if (!params.blinkingEnabled) {
          redLight.intensity = 0;
          greenLight.intensity = 0;
          redMat.emissiveIntensity = 0;
          greenMat.emissiveIntensity = 0;
          redMat.opacity = 0;
          greenMat.opacity = 0;
          redGlow.material.opacity = 0;
          greenGlow.material.opacity = 0;
        } else {
          redLight.intensity = redBlink * maxLightIntensity;
          greenLight.intensity = greenBlink * maxLightIntensity;
          redMat.emissiveIntensity = redBlink * maxEmissive;
          greenMat.emissiveIntensity = greenBlink * maxEmissive;
          redMat.opacity = redBlink * maxEarOpacity;
          greenMat.opacity = greenBlink * maxEarOpacity;
          redGlow.material.opacity = redBlink * maxGlowOpacity;
          greenGlow.material.opacity = greenBlink * maxGlowOpacity;
        }

        requestAnimationFrame(blinkLoop);
      };

      blinkLoop();
      
      // Update attachment dropdown options after head model is loaded
      updateAvailableTargets();
    });
  } else {
    // If listener already exists, just update dropdown options
    updateAvailableTargets();
  }

  listener.position.set(p.x, p.y, p.z);
  
  // Update dynamic position table
  updateEntityPosition('listener', null, p.x, p.y, p.z);
}

/*──────────────────────────────────────────────────────────────
  Create SPAT listener + source + speaker + area structure
──────────────────────────────────────────────────────────────*/

// listener, sources, speakers, areas already exist
sources.forEach((src, i) => {
  const colorData = sourceColorMap[params.sourceColor] || { color: 0xadff2f, metalness: 0.1, roughness: 0.6 };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 16),
    new THREE.MeshStandardMaterial({ 
      color: colorData.color,
      metalness: params.sourceMetalness,
      roughness: params.sourceRoughness,
      transparent: true,
      opacity: params.sourceOpacity
    })
  );
  mesh.name = `source${i + 1}`;      // mesh can now be found by SpatOscBridge
  // mesh.position.copy(src.position);  // initial pos from the data model
  const threePos = convertSpatToThree(src.position.x, src.position.y, src.position.z);
  mesh.position.set(threePos.x, threePos.y, threePos.z);  // convert SPAT to Three.js coords
  scene.add(mesh);
});

let rulerGroups = [];
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.05,200);
const renderer=new THREE.WebGLRenderer({antialias:true}); 
renderer.setSize(innerWidth,innerHeight); 
renderer.setPixelRatio(window.devicePixelRatio); // Match projector quality settings
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// 3D Stereoscopic Effects Setup
let anaglyphEffect, parallaxBarrierEffect, stereoCamera;
let leftRenderTarget, rightRenderTarget, anaglyphMaterial, anaglyphScene, anaglyphCamera;

function initStereoEffects() {
  // Create our own stereo camera that we can control
  stereoCamera = new THREE.StereoCamera();
  stereoCamera.eyeSep = params.eyeSeparation;
  stereoCamera.aspect = camera.aspect;

  // Create render targets for left and right eyes
  leftRenderTarget = new THREE.WebGLRenderTarget(innerWidth, innerHeight);
  rightRenderTarget = new THREE.WebGLRenderTarget(innerWidth, innerHeight);

  // Create anaglyph material for combining left/right images
  anaglyphMaterial = new THREE.ShaderMaterial({
    uniforms: {
      leftTexture: { value: leftRenderTarget.texture },
      rightTexture: { value: rightRenderTarget.texture }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D leftTexture;
      uniform sampler2D rightTexture;
      varying vec2 vUv;
      void main() {
        vec4 left = texture2D(leftTexture, vUv);
        vec4 right = texture2D(rightTexture, vUv);
        gl_FragColor = vec4(left.r, right.g, right.b, 1.0);
      }
    `
  });

  // Create scene and camera for final anaglyph rendering
  anaglyphScene = new THREE.Scene();
  anaglyphCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const plane = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(plane, anaglyphMaterial);
  anaglyphScene.add(mesh);

  parallaxBarrierEffect = new ParallaxBarrierEffect(renderer);
  parallaxBarrierEffect.setSize(innerWidth, innerHeight);
}

initStereoEffects();

function updateStereoEffects() {
  if (stereoCamera) {
    stereoCamera.eyeSep = params.eyeSeparation;
    stereoCamera.aspect = camera.aspect;
  }
}

// Color mapping for source materials with metallic properties
const sourceColorMap = {
  'green-yellow': { color: 0xadff2f, metalness: 0.1, roughness: 0.6 }, // Original default
  'white': { color: 0xffffff, metalness: 0.1, roughness: 0.6 },
  'light-gray': { color: 0xd3d3d3, metalness: 0.1, roughness: 0.6 },
  'silver': { color: 0xc0c0c0, metalness: 0.1, roughness: 0.6 },
  'off-white': { color: 0xfaf0e6, metalness: 0.1, roughness: 0.6 },
  'warm-white': { color: 0xfdf5e6, metalness: 0.1, roughness: 0.6 },
  'cool-white': { color: 0xf0f8ff, metalness: 0.1, roughness: 0.6 },
  'cream': { color: 0xfffdd0, metalness: 0.1, roughness: 0.6 },
  'pearl': { color: 0xeae0c8, metalness: 0.1, roughness: 0.6 },
  'platinum': { color: 0xe5e4e2, metalness: 0.1, roughness: 0.6 },
  // Highly reflective metallic variants
  'chrome': { color: 0xffffff, metalness: 1.0, roughness: 0.0 }, // Perfect mirror
  'liquid-silver': { color: 0xc0c0c0, metalness: 1.0, roughness: 0.05 }, // Almost mirror
  'polished-steel': { color: 0xb0b0b0, metalness: 0.9, roughness: 0.1 },
  'brushed-metal': { color: 0xa0a0a0, metalness: 0.8, roughness: 0.3 },
  'gold-mirror': { color: 0xffd700, metalness: 1.0, roughness: 0.0 },
  'copper-mirror': { color: 0xb87333, metalness: 1.0, roughness: 0.05 },
  // Non-metallic colors
  'red': { color: 0xff0000, metalness: 0.1, roughness: 0.6 },
  'blue': { color: 0x0080ff, metalness: 0.1, roughness: 0.6 },
  'cyan': { color: 0x00ffff, metalness: 0.1, roughness: 0.6 },
  'magenta': { color: 0xff00ff, metalness: 0.1, roughness: 0.6 },
  'yellow': { color: 0xffff00, metalness: 0.1, roughness: 0.6 },
  'orange': { color: 0xff8000, metalness: 0.1, roughness: 0.6 }
};

function updateSourceColors() {
  const colorData = sourceColorMap[params.sourceColor] || { color: 0xadff2f, metalness: 0.1, roughness: 0.6 };
  sourceMeshes.forEach(mesh => {
    if (mesh.material) {
      mesh.material.color.setHex(colorData.color);
      mesh.material.metalness = params.sourceMetalness;
      mesh.material.roughness = params.sourceRoughness;
      mesh.material.needsUpdate = true;
    }
  });
}

function updateSourceMaterial() {
  sourceMeshes.forEach(mesh => {
    if (mesh.material) {
      mesh.material.metalness = params.sourceMetalness;
      mesh.material.roughness = params.sourceRoughness;
      mesh.material.needsUpdate = true;
    }
  });
}

function updateReflectionLighting() {
  // console.log('updateReflectionLighting called', params.reflectionLightingEnabled, params.reflectionLightIntensity);
  
  if (window.scenelights) {
    const lights = window.scenelights;
    // console.log('Found scene lights:', lights);
    
    // Update reflection light intensities with dramatic range
    const intensity = params.reflectionLightingEnabled ? params.reflectionLightIntensity : 0;
    
    // Main reflection lights
    if (lights.reflectionLight1) {
      lights.reflectionLight1.intensity = intensity;
      // console.log('Updated reflectionLight1 intensity to:', intensity);
    }
    if (lights.reflectionLight2) {
      lights.reflectionLight2.intensity = intensity;
      // console.log('Updated reflectionLight2 intensity to:', intensity);
    }
    if (lights.reflectionLight3) {
      lights.reflectionLight3.intensity = intensity * 0.8;
      // console.log('Updated reflectionLight3 intensity to:', intensity * 0.8);
    }
    
    // Additional reflection lights for dramatic effect
    if (lights.reflectionLight4) {
      lights.reflectionLight4.intensity = intensity;
      // console.log('Updated reflectionLight4 intensity to:', intensity);
    }
    if (lights.reflectionLight5) {
      lights.reflectionLight5.intensity = intensity;
      // console.log('Updated reflectionLight5 intensity to:', intensity);
    }
    if (lights.reflectionLight6) {
      lights.reflectionLight6.intensity = intensity * 0.6;
      // console.log('Updated reflectionLight6 intensity to:', intensity * 0.6);
    }
    if (lights.reflectionLight7) {
      lights.reflectionLight7.intensity = intensity * 0.6;
      // console.log('Updated reflectionLight7 intensity to:', intensity * 0.6);
    }
    
    // Update ambient light
    if (lights.ambient) {
      lights.ambient.intensity = params.ambientLightIntensity;
      // console.log('Updated ambient intensity to:', params.ambientLightIntensity);
    }
    
    // Update key light
    if (lights.keyLight) {
      lights.keyLight.intensity = params.keyLightIntensity;
      // console.log('Updated key light intensity to:', params.keyLightIntensity);
    }
  } else {
    console.log('No scene lights found - window.scenelights is undefined');
  }
}

/*──────── CAMERA TRACKING SYSTEM ───────────────────────────────*/

const cameraTracker = {
  // Animation state
  isAnimating: false,
  currentAngle: 0,
  previousCameraPosition: null,
  
  // Orbit center point
  orbitCenter: { x: 0, y: 0, z: 0 },
  
  // Smooth transition system
  transitionDuration: 1000,
  isTransitioning: false,
  transitionStartTime: 0,
  transitionStartPos: null,
  transitionTargetPos: null,
  
  // Target references
  attachedObject: null,
  lookAtObject: null,
  
  // Target tracking system
  currentAttachTargetId: null,
  currentLookAtTargetId: null,
  availableTargets: [],
  
  // Tracking mode system
  trackingTarget: null,
  trackingLastPosition: null,
  trackingInterpolatedLookAt: null,
  
  // Target resolution
  resolveTarget: function(targetId) {
    if (!targetId || targetId === 'none') return null;
    
    // Parse target ID (e.g., "source_1", "speaker_2", "listener")
    const parts = targetId.split('_');
    const type = parts[0];
    const index = parts[1] ? parseInt(parts[1]) : null;
    
    // console.log('resolveTarget - targetId:', targetId, 'type:', type, 'index:', index);
    
    switch (type) {
      case 'source':
        const source = sourceMeshes[index - 1] || null;
        // console.log('resolveTarget - source mesh:', source);
        return source;
      case 'speaker':
        const speaker = speakerMeshes[index - 1] || null;
        // console.log('resolveTarget - speaker mesh:', speaker);
        return speaker;
      case 'listener':
        const listener = window.headGroup || null;
        // console.log('resolveTarget - listener:', listener);
        return listener;
      default:
        // console.log('resolveTarget - unknown type:', type);
        return null;
    }
  }
};

function initCameraTracking() {
  // Initialize camera tracking system
  cameraTracker.previousCameraPosition = camera.position.clone();
  updateOrbitCenter();
  
  // Initialize available targets
  updateAvailableTargets();
}

function updateOrbitCenter() {
  // Calculate scene center based on current room dimensions
  cameraTracker.orbitCenter.x = 0;
  cameraTracker.orbitCenter.y = 0;
  cameraTracker.orbitCenter.z = 0;
}

function getDynamicOrbitMax() {
  // Calculate maximum orbit radius based on room dimensions
  // Use diagonal distance plus padding to maintain good viewing distance
  const diagonalDistance = Math.sqrt(params.Lx * params.Lx + params.Ly * params.Ly + params.Lz * params.Lz);
  
  // Return diagonal distance plus 50% padding, with a minimum of 10.0
  return Math.max(diagonalDistance * 1.5, 10.0);
}

function updateOrbitRadiusRange() {
  // Update the orbit radius GUI control max value when room dimensions change
  const newMax = getDynamicOrbitMax();
  
  // Find the orbit radius control and update its range
  const orbitRadiusControl = gCamera.__controllers.find(c => c.property === 'orbitRadius');
  if (orbitRadiusControl) {
    orbitRadiusControl.max(newMax);
    
    // If current value exceeds new max, clamp it
    if (params.orbitRadius > newMax) {
      params.orbitRadius = newMax;
      orbitRadiusControl.setValue(newMax);
    }
  }
}

function updateOrbitGUI() {
  // Update GUI controls to reflect manual camera changes
  const orbitRadiusControl = gCamera.__controllers.find(c => c.property === 'orbitRadius');
  const orbitHeightControl = gCamera.__controllers.find(c => c.property === 'orbitHeight');
  
  if (orbitRadiusControl) {
    orbitRadiusControl.setValue(params.orbitRadius);
  }
  
  if (orbitHeightControl) {
    orbitHeightControl.setValue(params.orbitHeight);
  }
}

function updateAvailableTargets() {
  // Build list of available targets with stable IDs
  const targets = [{ id: 'none', label: 'None' }];
  
  // Add sources
  sourceMeshes.forEach((mesh, index) => {
    if (mesh) {
      const id = `source_${index + 1}`;
      const label = `Source ${index + 1}`;
      targets.push({ id, label });
    }
  });
  
  // Add speakers
  speakerMeshes.forEach((speaker, index) => {
    if (speaker) {
      const id = `speaker_${index + 1}`;
      const label = `Speaker ${index + 1}`;
      targets.push({ id, label });
    }
  });
  
  // Add listener
  if (window.headGroup) {
    targets.push({ id: 'listener', label: 'Listener' });
  }
  
  // Store updated targets
  cameraTracker.availableTargets = targets;
  
  // Update GUI dropdowns while preserving current selection
  updateTargetDropdowns();
}

function updateTargetDropdowns() {
  // Find attachment target dropdown
  const attachControl = gCamera.__controllers.find(c => c.property === 'attachTarget');
  const lookAtControl = gCamera.__controllers.find(c => c.property === 'lookAtTarget');
  
  if (attachControl) {
    updateDropdownOptions(attachControl, 'attachTarget');
  }
  
  if (lookAtControl) {
    updateDropdownOptions(lookAtControl, 'lookAtTarget');
  }
}

function updateDropdownOptions(control, paramName) {
  // Get current selection
  const currentValue = params[paramName];
  
  // Create new options array
  const options = cameraTracker.availableTargets.map(target => target.id);
  const labels = {};
  cameraTracker.availableTargets.forEach(target => {
    labels[target.id] = target.label;
  });
  
  // Update dropdown options
  control.__select.innerHTML = '';
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = labels[option] || option;
    control.__select.appendChild(optionElement);
  });
  
  // Preserve current selection if it still exists
  if (options.includes(currentValue)) {
    control.setValue(currentValue);
  } else {
    // Current target no longer exists, reset to 'none'
    control.setValue('none');
    params[paramName] = 'none';
  }
}

function switchCameraMode(mode) {
  const prevMode = params.cameraMode;
  params.cameraMode = mode;
  
  // Stop tracking mode if switching away from it
  if (prevMode === 'tracking' && mode !== 'tracking') {
    params.trackingEnabled = false;
  }
  
  // Handle mode transitions
  switch (mode) {
    case 'manual':
      stopCameraAnimation();
      controls.enabled = true;
      break;
      
    case 'orbit':
      startOrbitMode();
      break;
      
    case 'attached':
      startAttachmentMode();
      break;
      
    case 'tracking':
      startTrackingMode();
      break;
  }
}

function stopCameraAnimation() {
  cameraTracker.isAnimating = false;
  params.orbitAnimating = false;
}

function startOrbitMode() {
  controls.enabled = true; // Keep mouse controls enabled
  
  // Set initial angle based on current camera position
  const currentPos = camera.position.clone();
  const centerPos = new THREE.Vector3(
    cameraTracker.orbitCenter.x,
    cameraTracker.orbitCenter.y,
    cameraTracker.orbitCenter.z
  );
  
  const offset = currentPos.clone().sub(centerPos);
  cameraTracker.currentAngle = Math.atan2(offset.z, offset.x);
  
  // Store initial camera position for manual adjustments
  cameraTracker.previousCameraPosition = currentPos.clone();
  
  // Start animation if checkbox is checked
  if (params.orbitAnimating) {
    cameraTracker.isAnimating = true;
  }
}

function startAttachmentMode() {
  controls.enabled = false; // Disable manual controls in attachment mode
  
  // Update available targets when entering attachment mode
  updateAvailableTargets();
  
  // Resolve current attachment target
  cameraTracker.currentAttachTargetId = params.attachTarget;
  cameraTracker.attachedObject = cameraTracker.resolveTarget(params.attachTarget);
  
  // Resolve current look-at target
  cameraTracker.currentLookAtTargetId = params.lookAtTarget;
  cameraTracker.lookAtObject = cameraTracker.resolveTarget(params.lookAtTarget);
  
  // console.log('Attachment mode started - attached to:', params.attachTarget, 'looking at:', params.lookAtTarget);
}

function startTrackingMode() {
  // Update available targets
  updateAvailableTargets();
  
  // Resolve tracking target
  cameraTracker.trackingTarget = cameraTracker.resolveTarget(params.lookAtTarget);
  
  // Initialize tracking interpolation
  if (cameraTracker.trackingTarget) {
    cameraTracker.trackingLastPosition = cameraTracker.trackingTarget.position.clone();
    cameraTracker.trackingInterpolatedLookAt = cameraTracker.trackingTarget.position.clone();
  } else {
    cameraTracker.trackingLastPosition = new THREE.Vector3(0, 0, 0);
    cameraTracker.trackingInterpolatedLookAt = new THREE.Vector3(0, 0, 0);
  }
  
  // Enable tracking
  params.trackingEnabled = true;
  
  console.log('Tracking mode started - looking at:', params.lookAtTarget);
}

// Camera preset configurations for common use cases
const cameraPresets = {
  'none': {
    name: 'None',
    description: 'Manual camera control'
  },
  'overview': {
    name: 'Overview',
    description: 'Orbit around scene center for general overview',
    mode: 'orbit',
    orbitRadius: 8.0,
    orbitSpeed: 0.3,
    orbitHeight: 2.0,
    lookAtTarget: 'none',
    orbitAnimating: true
  },
  'follow_listener': {
    name: 'Follow Listener',
    description: 'Track listener head movements',
    mode: 'tracking',
    lookAtTarget: 'listener',
    trackingSmooth: true,
    trackingInterpolation: 0.15
  },
  'source_focus': {
    name: 'Source Focus',
    description: 'Orbit while tracking first source',
    mode: 'orbit',
    orbitRadius: 6.0,
    orbitSpeed: 0.4,
    orbitHeight: 1.0,
    lookAtTarget: 'source_1',
    orbitAnimating: true,
    trackingSmooth: true,
    trackingInterpolation: 0.1
  },
  'close_attach': {
    name: 'Close Attach',
    description: 'Attach to first source with close offset',
    mode: 'attached',
    attachTarget: 'source_1',
    attachOffsetX: 0.5,
    attachOffsetY: 0.3,
    attachOffsetZ: 0.5,
    lookAtTarget: 'listener'
  }
};

function applyCameraPreset(presetName) {
  if (presetName === 'none') return;
  
  const preset = cameraPresets[presetName];
  if (!preset) return;
  
  // Apply preset parameters
  if (preset.mode) {
    params.cameraMode = preset.mode;
    switchCameraMode(preset.mode);
  }
  
  if (preset.orbitRadius !== undefined) params.orbitRadius = preset.orbitRadius;
  if (preset.orbitSpeed !== undefined) params.orbitSpeed = preset.orbitSpeed;
  if (preset.orbitHeight !== undefined) params.orbitHeight = preset.orbitHeight;
  if (preset.orbitAnimating !== undefined) params.orbitAnimating = preset.orbitAnimating;
  
  if (preset.attachTarget !== undefined) params.attachTarget = preset.attachTarget;
  if (preset.attachOffsetX !== undefined) params.attachOffsetX = preset.attachOffsetX;
  if (preset.attachOffsetY !== undefined) params.attachOffsetY = preset.attachOffsetY;
  if (preset.attachOffsetZ !== undefined) params.attachOffsetZ = preset.attachOffsetZ;
  
  if (preset.lookAtTarget !== undefined) params.lookAtTarget = preset.lookAtTarget;
  if (preset.trackingSmooth !== undefined) params.trackingSmooth = preset.trackingSmooth;
  if (preset.trackingInterpolation !== undefined) params.trackingInterpolation = preset.trackingInterpolation;
  
  // Update GUI controls to reflect preset values
  updateCameraGUI();
  
  // Apply the mode switch to activate the preset
  switchCameraMode(params.cameraMode);
  
  console.log(`Applied camera preset: ${preset.name}`);
}

function updateCameraGUI() {
  // Update GUI controllers to reflect current parameter values
  const controllers = gui.__controllers;
  controllers.forEach(controller => {
    if (controller.property in params) {
      controller.setValue(params[controller.property]);
    }
  });
}

/*──────── PROJECTOR WINDOW SYSTEM ───────────────────────────────*/

// Projector window management
let projectorWindow = null;
let projectorRenderer = null;
let projectorCamera = null;
let projectorAnimationId = null;
// Projector stereoscopic rendering components
let projectorParallaxBarrierEffect = null;
let projectorLeftRenderTarget = null;
let projectorRightRenderTarget = null;
let projectorAnaglyphMaterial = null;
let projectorAnaglyphScene = null;
let projectorAnaglyphCamera = null;
// Projector label rendering
let projectorLabelRenderer = null;

function toggleProjectorWindow(enabled) {
  if (enabled) {
    openProjectorWindow();
    // If QR code is already showing, display it on projector too
    if (qrParams.showQR && projectorQrContainer) {
      setTimeout(() => {
        projectorQrContainer.style.display = 'block';
        generateQRCode(); // Regenerate to include projector
      }, 500); // Small delay to ensure projector window is fully loaded
    }
  } else {
    closeProjectorWindow();
  }
}

function openProjectorWindow() {
  try {
    // Create pop-out window
    const windowFeatures = `width=${params.projectorWidth},height=${params.projectorHeight},toolbar=no,menubar=no,scrollbars=no,status=no,resizable=yes`;
    projectorWindow = window.open('', 'projector', windowFeatures);
    
    if (!projectorWindow) {
      console.error('Failed to open projector window. Please check popup blocker settings.');
      params.projectorWindowEnabled = false;
      return;
    }
    
    // Set up clean HTML for projector display
    projectorWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Projector View - 3D Room Mode Visualizer</title>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            overflow: hidden; 
            background: ${params.projectorBackground};
            font-family: Arial, sans-serif;
          }
          canvas { 
            display: block; 
            margin: 0 auto;
          }
          .info {
            position: absolute;
            top: 10px;
            left: 10px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            z-index: 1000;
            display: ${params.projectorShowInfo ? 'block' : 'none'};
          }
        </style>
      </head>
      <body>
        <div class="info" id="projector-info">Projector View - 3D Room Mode Visualizer</div>
      </body>
      </html>
    `);
    
    // Create second renderer for projector display with high quality settings
    projectorRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    projectorRenderer.setSize(params.projectorWidth, params.projectorHeight);
    projectorRenderer.setPixelRatio(window.devicePixelRatio); // Use device pixel ratio for crisp display
    projectorRenderer.shadowMap.enabled = true;
    projectorRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Match main renderer tone mapping settings for consistent quality
    projectorRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    projectorRenderer.toneMappingExposure = 1.0;
    
    // Set projector background
    const backgroundColor = params.projectorBackground === 'black' ? 0x000000 : 0xffffff;
    projectorRenderer.setClearColor(backgroundColor, 1.0);
    
    // Add canvas to projector window
    projectorWindow.document.body.appendChild(projectorRenderer.domElement);
    
    // Create QR container for projector window
    projectorQrContainer = projectorWindow.document.createElement('div');
    projectorQrContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      padding: 20px;
      z-index: 1000;
      display: none;
      border: 1px solid #C4E538;
    `;
    projectorWindow.document.body.appendChild(projectorQrContainer);
    
    // Create camera for projector (initially synced with main camera)
    projectorCamera = camera.clone();
    
    // Initialize stereoscopic effects for projector
    initProjectorStereoEffects();
    
    // Handle window close
    projectorWindow.addEventListener('beforeunload', () => {
      closeProjectorWindow();
      params.projectorWindowEnabled = false;
      
      // Update GUI to reflect window closure
      const projectorControl = gui.__controllers.find(c => c.property === 'projectorWindowEnabled');
      if (projectorControl) {
        projectorControl.setValue(false);
      }
    });
    
    // Handle window resize
    projectorWindow.addEventListener('resize', () => {
      if (projectorRenderer && projectorCamera) {
        const width = projectorWindow.innerWidth;
        const height = projectorWindow.innerHeight;
        projectorRenderer.setSize(width, height);
        projectorCamera.aspect = width / height;
        projectorCamera.updateProjectionMatrix();
        
        // Update label renderer size
        if (projectorLabelRenderer) {
          projectorLabelRenderer.setSize(width, height);
        }
      }
    });
    
    // Add ESC key handler to exit fullscreen and de-maximize
    projectorWindow.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        
        // Exit fullscreen if in fullscreen mode
        if (projectorWindow.document.fullscreenElement) {
          projectorWindow.document.exitFullscreen().catch(err => {
            console.log('Error exiting fullscreen:', err);
          });
        }
        
        // Restore window size if appears maximized
        // Check if window is larger than default size (likely maximized)
        const isLikelyMaximized = projectorWindow.outerWidth > params.projectorWidth + 100 || 
                                 projectorWindow.outerHeight > params.projectorHeight + 100;
        
        if (isLikelyMaximized) {
          try {
            // Move window to center and resize to default size
            const screenWidth = projectorWindow.screen.availWidth;
            const screenHeight = projectorWindow.screen.availHeight;
            const left = (screenWidth - params.projectorWidth) / 2;
            const top = (screenHeight - params.projectorHeight) / 2;
            
            projectorWindow.resizeTo(params.projectorWidth, params.projectorHeight);
            projectorWindow.moveTo(left, top);
            
            // Update renderer size to match restored window
            if (projectorRenderer && projectorCamera) {
              projectorRenderer.setSize(params.projectorWidth, params.projectorHeight);
              projectorCamera.aspect = params.projectorWidth / params.projectorHeight;
              projectorCamera.updateProjectionMatrix();
              
              // Update stereo render targets if they exist
              if (projectorLeftRenderTarget) projectorLeftRenderTarget.setSize(params.projectorWidth, params.projectorHeight);
              if (projectorRightRenderTarget) projectorRightRenderTarget.setSize(params.projectorWidth, params.projectorHeight);
              if (projectorParallaxBarrierEffect) projectorParallaxBarrierEffect.setSize(params.projectorWidth, params.projectorHeight);
              
              // Update label renderer size
              if (projectorLabelRenderer) {
                projectorLabelRenderer.setSize(params.projectorWidth, params.projectorHeight);
              }
            }
            
            console.log('Projector window restored to default size and renderer updated');
          } catch (error) {
            console.log('Could not restore window size:', error);
          }
        }
      }
    });
    
    // Ensure window can receive keyboard focus
    projectorWindow.focus();
    
    // Start separate animation loop for projector to prevent freezing
    startProjectorAnimation();
    
    // Add visibility change handler (keeping for logging/debugging)
    projectorWindow.addEventListener('visibilitychange', () => {
      if (projectorWindow && projectorWindow.document) {
        if (projectorWindow.document.hidden) {
          console.log('Projector window hidden - continuing animation with separate loop');
        } else {
          console.log('Projector window visible - animation active');
        }
      }
    });
    
    console.log('Projector window opened successfully with independent animation loop');
    
  } catch (error) {
    console.error('Error opening projector window:', error);
    params.projectorWindowEnabled = false;
  }
}

function closeProjectorWindow() {
  // Stop the projector animation loop first
  stopProjectorAnimation();
  
  // Dispose of stereo effects
  disposeProjectorStereoEffects();
  
  if (projectorWindow) {
    projectorWindow.close();
    projectorWindow = null;
  }
  
  if (projectorRenderer) {
    projectorRenderer.dispose();
    projectorRenderer = null;
  }
  
  if (projectorCamera) {
    projectorCamera = null;
  }
  
  // Clean up projector QR container
  projectorQrContainer = null;
  
  console.log('Projector window closed, stereo effects disposed, and animation loop stopped');
}

function updateProjectorCamera() {
  if (projectorCamera && camera) {
    // Sync projector camera with main camera
    projectorCamera.position.copy(camera.position);
    projectorCamera.rotation.copy(camera.rotation);
    projectorCamera.updateMatrixWorld();
  }
}

function updateProjectorInfo() {
  if (projectorWindow && !projectorWindow.closed) {
    try {
      const infoElement = projectorWindow.document.getElementById('projector-info');
      if (infoElement) {
        infoElement.style.display = params.projectorShowInfo ? 'block' : 'none';
      }
    } catch (error) {
      console.warn('Error updating projector info:', error);
    }
  }
}

// Separate animation loop for projector window to prevent freezing
function animateProjector() {
  if (projectorWindow && !projectorWindow.closed && projectorRenderer && projectorCamera) {
    try {
      // Use projector window's requestAnimationFrame to ensure continuous rendering
      projectorAnimationId = projectorWindow.requestAnimationFrame(animateProjector);
      
      // Update blinking lights to ensure continuous animation
      updateBlinkingLights();
      
      // Update camera tracking to ensure continuous movement even when main window is hidden
      updateCameraTracking();
      
      // Update controls if needed
      if (params.cameraMode === 'manual' || params.cameraMode === 'orbit') {
        controls.update();
      } else if (params.cameraMode === 'attached') {
        // Controls should be disabled in attached mode
        controls.enabled = false;
      }
      
      // Update projector camera to match main camera
      updateProjectorCamera();
      
      // Render the scene to projector
      renderStereoToProjector(scene, projectorCamera);
      
      // Render labels to projector
      if (projectorLabelRenderer) {
        projectorLabelRenderer.render(scene, projectorCamera);
      }
    } catch (error) {
      console.warn('Error in projector animation loop:', error);
      stopProjectorAnimation();
    }
  }
}

function startProjectorAnimation() {
  if (projectorWindow && !projectorWindow.closed) {
    stopProjectorAnimation(); // Ensure no duplicate loops
    animateProjector();
  }
}

function stopProjectorAnimation() {
  if (projectorAnimationId && projectorWindow && !projectorWindow.closed) {
    try {
      projectorWindow.cancelAnimationFrame(projectorAnimationId);
    } catch (error) {
      // Window might be closed, ignore error
    }
    projectorAnimationId = null;
  }
}

function updateBlinkingLights() {
  if (!params.blinkingEnabled) return;
  
  // Access global light references (same as main blinkLoop)
  const leftLight = window.leftLight;
  const rightLight = window.rightLight;
  const leftEar = window.leftEar;
  const rightEar = window.rightEar;
  
  if (!leftLight || !rightLight || !leftEar || !rightEar) return;
  
  const currentTime = performance.now() * 0.001; // Convert to seconds
  
  // Same blinking speeds as original implementation
  const blinkSpeedRed = 1.2;
  const blinkSpeedGreen = 1.15;
  
  const redBlink = Math.max(0, Math.sin(currentTime * blinkSpeedRed * Math.PI));
  const greenBlink = Math.max(0, Math.sin(currentTime * blinkSpeedGreen * Math.PI));
  
  const maxLightIntensity = params.aircraftLightsOpacity;
  const maxGlowOpacity = params.aircraftLightsOpacity;
  const maxEarOpacity = params.aircraftLightsOpacity;
  
  // Update light intensities
  leftLight.intensity = redBlink * maxLightIntensity;
  rightLight.intensity = greenBlink * maxLightIntensity;
  
  // Update material emissive intensities
  if (leftEar.material) {
    leftEar.material.emissiveIntensity = redBlink * maxEarOpacity;
    leftEar.material.needsUpdate = true;
  }
  if (rightEar.material) {
    rightEar.material.emissiveIntensity = greenBlink * maxEarOpacity;
    rightEar.material.needsUpdate = true;
  }
  
  // Update glow sprites if they exist
  if (earGlowSprites && earGlowSprites.length >= 2) {
    const redGlow = earGlowSprites[0];
    const greenGlow = earGlowSprites[1];
    if (redGlow && redGlow.material) {
      redGlow.material.opacity = redBlink * maxGlowOpacity;
    }
    if (greenGlow && greenGlow.material) {
      greenGlow.material.opacity = greenBlink * maxGlowOpacity;
    }
  }
}

function initProjectorStereoEffects() {
  if (!projectorRenderer) return;
  
  // Create render targets for projector anaglyph rendering
  projectorLeftRenderTarget = new THREE.WebGLRenderTarget(params.projectorWidth, params.projectorHeight);
  projectorRightRenderTarget = new THREE.WebGLRenderTarget(params.projectorWidth, params.projectorHeight);
  
  // Create anaglyph material for projector (reuse the shader from main window)
  projectorAnaglyphMaterial = new THREE.ShaderMaterial({
    uniforms: {
      leftTexture: { value: projectorLeftRenderTarget.texture },
      rightTexture: { value: projectorRightRenderTarget.texture }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D leftTexture;
      uniform sampler2D rightTexture;
      varying vec2 vUv;
      void main() {
        vec4 left = texture2D(leftTexture, vUv);
        vec4 right = texture2D(rightTexture, vUv);
        // Red-cyan anaglyph
        gl_FragColor = vec4(left.r, right.g, right.b, max(left.a, right.a));
      }
    `
  });
  
  // Create anaglyph scene and camera for projector
  projectorAnaglyphScene = new THREE.Scene();
  projectorAnaglyphCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  
  const anaglyphGeometry = new THREE.PlaneGeometry(2, 2);
  const anaglyphMesh = new THREE.Mesh(anaglyphGeometry, projectorAnaglyphMaterial);
  projectorAnaglyphScene.add(anaglyphMesh);
  
  // Create parallax barrier effect for projector
  projectorParallaxBarrierEffect = new ParallaxBarrierEffect(projectorRenderer);
  projectorParallaxBarrierEffect.setSize(params.projectorWidth, params.projectorHeight);
  
  // Create CSS2D label renderer for projector
  projectorLabelRenderer = new CSS2DRenderer();
  projectorLabelRenderer.setSize(params.projectorWidth, params.projectorHeight);
  projectorLabelRenderer.domElement.id = 'projector-label-layer';
  Object.assign(projectorLabelRenderer.domElement.style, {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    zIndex: 3
  });
  
  // Add label renderer to projector window
  if (projectorWindow && !projectorWindow.closed) {
    projectorWindow.document.body.appendChild(projectorLabelRenderer.domElement);
  }
  
  console.log('Projector stereo effects and label renderer initialized');
}

function disposeProjectorStereoEffects() {
  if (projectorLeftRenderTarget) {
    projectorLeftRenderTarget.dispose();
    projectorLeftRenderTarget = null;
  }
  if (projectorRightRenderTarget) {
    projectorRightRenderTarget.dispose();
    projectorRightRenderTarget = null;
  }
  if (projectorAnaglyphMaterial) {
    projectorAnaglyphMaterial.dispose();
    projectorAnaglyphMaterial = null;
  }
  // Clean up label renderer
  if (projectorLabelRenderer) {
    if (projectorLabelRenderer.domElement && projectorLabelRenderer.domElement.parentNode) {
      projectorLabelRenderer.domElement.parentNode.removeChild(projectorLabelRenderer.domElement);
    }
    projectorLabelRenderer = null;
  }
  projectorAnaglyphScene = null;
  projectorAnaglyphCamera = null;
  projectorParallaxBarrierEffect = null;
}

function renderProjectorAnaglyph(scene, camera) {
  if (!projectorRenderer || !projectorLeftRenderTarget || !projectorRightRenderTarget) return;
  
  // Update stereo camera with current camera settings (reuse main stereoCamera)
  stereoCamera.update(camera);
  
  // Render left eye to left render target
  projectorRenderer.setRenderTarget(projectorLeftRenderTarget);
  projectorRenderer.render(scene, stereoCamera.cameraL);
  
  // Render right eye to right render target
  projectorRenderer.setRenderTarget(projectorRightRenderTarget);
  projectorRenderer.render(scene, stereoCamera.cameraR);
  
  // Render combined anaglyph to projector screen
  projectorRenderer.setRenderTarget(null);
  projectorRenderer.render(projectorAnaglyphScene, projectorAnaglyphCamera);
}

function updateCameraTracking() {
  switch (params.cameraMode) {
    case 'orbit':
      if (cameraTracker.isAnimating) {
        updateOrbitCamera();
      }
      break;
      
    case 'attached':
      updateAttachedCamera();
      break;
      
    case 'tracking':
      updateTrackingCamera();
      break;
  }
}

function updateOrbitCamera() {
  const centerPos = new THREE.Vector3(
    cameraTracker.orbitCenter.x,
    cameraTracker.orbitCenter.y,
    cameraTracker.orbitCenter.z
  );
  
  // Check if user has manually moved the camera
  const currentPos = camera.position.clone();
  const hasManualChange = !currentPos.equals(cameraTracker.previousCameraPosition);
  
  if (hasManualChange) {
    // Update orbit parameters based on manual camera movement
    const offset = currentPos.clone().sub(centerPos);
    params.orbitRadius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
    params.orbitHeight = currentPos.y;
    cameraTracker.currentAngle = Math.atan2(offset.z, offset.x);
    
    // Update GUI to reflect manual changes
    updateOrbitGUI();
  }
  
  // Apply automatic orbit rotation if enabled
  if (params.orbitAnimating) {
    cameraTracker.currentAngle += params.orbitSpeed * 0.01;
  }
  
  // Calculate and apply orbit position (either from manual adjustment or automatic rotation)
  const newPos = new THREE.Vector3(
    centerPos.x + Math.cos(cameraTracker.currentAngle) * params.orbitRadius,
    params.orbitHeight,
    centerPos.z + Math.sin(cameraTracker.currentAngle) * params.orbitRadius
  );
  
  camera.position.copy(newPos);
  
  // Apply look-at target if set, otherwise look at orbit center
  if (params.lookAtTarget !== 'none') {
    applyLookAtTarget();
  } else {
    // Default orbit behavior - look at center
    camera.lookAt(centerPos);
  }
  
  // Store current position for next frame comparison
  cameraTracker.previousCameraPosition = newPos.clone();
}

function updateAttachedCamera() {
  // Update target references in case scene has changed
  cameraTracker.attachedObject = cameraTracker.resolveTarget(cameraTracker.currentAttachTargetId);
  cameraTracker.lookAtObject = cameraTracker.resolveTarget(cameraTracker.currentLookAtTargetId);
  
  // console.log('updateAttachedCamera - attachTargetId:', cameraTracker.currentAttachTargetId);
  // console.log('updateAttachedCamera - attachedObject:', cameraTracker.attachedObject);
  
  // Position camera relative to attached object
  if (cameraTracker.attachedObject) {
    const attachPos = cameraTracker.attachedObject.position.clone();
    const offset = new THREE.Vector3(
      params.attachOffsetX,
      params.attachOffsetY,
      params.attachOffsetZ
    );
    
    // Apply offset in world space
    const newPos = attachPos.clone().add(offset);
    camera.position.copy(newPos);
    
    // console.log('updateAttachedCamera - setting camera position to:', newPos);
    
    // Look at target priority: lookAtTarget > lookAtObject > attachedObject
    if (params.lookAtTarget !== 'none') {
      applyLookAtTarget();
    } else if (cameraTracker.lookAtObject) {
      camera.lookAt(cameraTracker.lookAtObject.position);
    } else {
      camera.lookAt(attachPos);
    }
  } else {
    // console.log('updateAttachedCamera - no attached object, looking at scene center');
    // If attached object doesn't exist, look at scene center
    camera.lookAt(0, 0, 0);
  }
}

function updateTrackingCamera() {
  // Update tracking target reference
  cameraTracker.trackingTarget = cameraTracker.resolveTarget(params.lookAtTarget);
  
  if (cameraTracker.trackingTarget) {
    const targetPos = cameraTracker.trackingTarget.position.clone();
    
    if (params.trackingSmooth) {
      // Smooth interpolation toward target
      if (!cameraTracker.trackingInterpolatedLookAt) {
        cameraTracker.trackingInterpolatedLookAt = targetPos.clone();
      }
      
      cameraTracker.trackingInterpolatedLookAt.lerp(targetPos, params.trackingInterpolation);
      camera.lookAt(cameraTracker.trackingInterpolatedLookAt);
    } else {
      // Direct look-at without interpolation
      camera.lookAt(targetPos);
    }
    
    // Update last position for interpolation
    cameraTracker.trackingLastPosition = targetPos.clone();
  } else {
    // No tracking target, look at scene center
    if (params.trackingSmooth) {
      const sceneCenter = new THREE.Vector3(0, 0, 0);
      if (!cameraTracker.trackingInterpolatedLookAt) {
        cameraTracker.trackingInterpolatedLookAt = sceneCenter.clone();
      }
      cameraTracker.trackingInterpolatedLookAt.lerp(sceneCenter, params.trackingInterpolation);
      camera.lookAt(cameraTracker.trackingInterpolatedLookAt);
    } else {
      camera.lookAt(0, 0, 0);
    }
  }
}

function applyLookAtTarget() {
  // Apply look-at behavior for all modes if a target is selected
  if (params.lookAtTarget !== 'none') {
    const lookAtTarget = cameraTracker.resolveTarget(params.lookAtTarget);
    
    if (lookAtTarget) {
      const targetPos = lookAtTarget.position.clone();
      
      if (params.trackingSmooth) {
        // Smooth interpolation toward target
        if (!cameraTracker.trackingInterpolatedLookAt) {
          cameraTracker.trackingInterpolatedLookAt = targetPos.clone();
        }
        
        cameraTracker.trackingInterpolatedLookAt.lerp(targetPos, params.trackingInterpolation);
        camera.lookAt(cameraTracker.trackingInterpolatedLookAt);
      } else {
        // Direct look-at without interpolation
        camera.lookAt(targetPos);
      }
    }
  }
}

function toggleOrbitAnimation(value) {
  if (params.cameraMode !== 'orbit') {
    params.orbitAnimating = false;
    cameraTracker.isAnimating = false;
    return;
  }
  
  params.orbitAnimating = value;
  cameraTracker.isAnimating = value;
}

function renderStereo(scene, camera) {
  switch (params.stereoMode) {
    case 'anaglyph':
      renderAnaglyph(scene, camera);
      break;
    case 'parallax':
      parallaxBarrierEffect.render(scene, camera);
      break;
    default:
      renderer.render(scene, camera);
      break;
  }
}

function renderStereoToProjector(scene, camera) {
  if (!projectorRenderer) return;
  
  switch (params.stereoMode) {
    case 'anaglyph':
      // Full anaglyph rendering for projector
      renderProjectorAnaglyph(scene, camera);
      break;
    case 'parallax':
      // Parallax barrier effect for projector
      if (projectorParallaxBarrierEffect) {
        projectorParallaxBarrierEffect.render(scene, camera);
      } else {
        projectorRenderer.render(scene, camera);
      }
      break;
    default:
      projectorRenderer.render(scene, camera);
      break;
  }
}

function renderAnaglyph(scene, camera) {
  // Update stereo camera with current camera settings
  stereoCamera.update(camera);
  
  // Render left eye to left render target
  renderer.setRenderTarget(leftRenderTarget);
  renderer.render(scene, stereoCamera.cameraL);
  
  // Render right eye to right render target
  renderer.setRenderTarget(rightRenderTarget);
  renderer.render(scene, stereoCamera.cameraR);
  
  // Render combined anaglyph to screen
  renderer.setRenderTarget(null);
  renderer.render(anaglyphScene, anaglyphCamera);
}

const labelR=new CSS2DRenderer(); labelR.setSize(innerWidth,innerHeight); labelR.domElement.id='label-layer'; Object.assign(labelR.domElement.style,{position:'absolute',top:0,left:0,pointerEvents:'none',zIndex:3}); container.appendChild(labelR.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true;


/*──────────────────────────────────────────────────────────────
  HELPERS
──────────────────────────────────────────────────────────────*/

function getOrigin(){return{ x:params.Lx/2,y:1.2,z:params.Ly/2 };}
function centerVec(x,y,z){const o=getOrigin();return new THREE.Vector3(x-o.x,y-o.y,z-o.z);}  
function setCam(){const dx=params.Lx/2,dz=params.Ly/2,dy=Math.max(1.2,Math.abs(params.Lz/2-1.2));camera.position.set(dx*1.6,dy*1.6,dz*1.6);controls.target.set(0,0,0);controls.update();}

let frameH,axisLines,voxelPts,voxelGeom,colourAttr; const labels=[];
const makeLabel=t=>{const d=document.createElement('div');d.textContent=t;d.style.font='14px/1.2 Arial,Helvetica,sans-serif';d.style.color='#fff';d.style.userSelect='none';return new CSS2DObject(d);}  
const fmt=v=>Number(v).toFixed(3)+' m';

function createRulerTicks(axis, length, minorStep = 0.1, majorStep = 0.5) {
  const group = new THREE.Group();
  const minorLength = 0.06;
  const majorLength = 0.12;
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -1,  // push forward
    polygonOffsetUnits: -1
  });
  for (let i = 0; i <= length; i += minorStep) {
    const isMajor = (Math.abs(i % majorStep) < 1e-6) || (Math.abs((i % majorStep) - majorStep) < 1e-6);
    const len = isMajor ? majorLength : minorLength;

    const points = [
      new THREE.Vector3(0, -len / 2, 0),
      new THREE.Vector3(0, len / 2, 0)
    ];

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const tick = new THREE.Line(geom, mat);

    if (axis === 'x') tick.position.set(i, 0, 0);
    if (axis === 'y') {
      tick.rotation.z = Math.PI / 2;
      tick.position.set(0, i, 0);
    }

    if (axis === 'z') {
      tick.rotation.y = Math.PI / 2;
      tick.position.set(0, 0, i);
    }

    group.add(tick);
    if (isMajor) {
      const div = document.createElement('div');
      div.className = 'label';
      div.textContent = i.toFixed(1);
      div.style.color = '#aaa';
      div.style.fontSize = '10px';

      const label = new CSS2DObject(div);
      label.visible = params.showRulerLabels; // control visibility here

      if (axis === 'x') label.position.set(i, -0.08, 0);
      if (axis === 'y') label.position.set(0.08, i, 0);
      if (axis === 'z') label.position.set(0, -0.08, i);

      group.add(label);
    }
  }

  return group;
}

const pc=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const freq2mc=f=>1200*Math.log2(f/440)+6900;
function mc2bach(mc){const n=mc/100,s=Math.floor(n),c=(n-s)*100,step=Math.round(c/25),oct=Math.floor(s/12)-1;const map={'-4':'b','-3':'v-','-2':'v','-1':'-','0':'','1':'+','2':'^','3':'^+','4':''};return pc[s%12]+map[step]+oct;}
const fam=(nx,ny,nz)=>['—','ax','tan','obl'][(nx>0)+(ny>0)+(nz>0)];
const fs = ()=>2000*Math.sqrt(params.T60/(params.Lx*params.Ly*params.Lz));

function modeList(){const c=343,max=params.schroMult*fs(),list=[];for(let nx=0;nx<=16;nx++)for(let ny=0;ny<=16;ny++)for(let nz=0;nz<=16;nz++){if(!nx&&!ny&&!nz)continue;const f=0.5*c*Math.hypot(nx/params.Lx,ny/params.Ly,nz/params.Lz);if(f<=max)list.push({f,nx,ny,nz});}return list.sort((a,b)=>a.f-b.f);}  

/*──────── SHARED DOWNLOAD HELPER ───────────────────────────*/
function triggerDownload(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);}  

/*──────────────── FILE NAME HELPER ──────────────────────────*/
function fileStem() {
  // e.g. "room_5.2x4.3x2.7_schro182Hz"
  const dims = `${params.Lx}x${params.Ly}x${params.Lz}`;
  const sch  = Math.round(fs()); // Schroeder frequency in Hz
  return `room_${dims}_schro${sch}Hz`;
}

/*──────────────── .TXT / MAXCOLL EXPORTER ─────────────────────*/
function downloadColl() {
  const rows = modeList().map((m, i) => {
    const mc = freq2mc(m.f);
    return `${i + 1}, ${m.f.toFixed(2)}\t${mc.toFixed(1)}\t${mc2bach(mc)}\t` +
           `${m.nx}-${m.ny}-${m.nz}\t${fam(m.nx, m.ny, m.nz)};`;
  }).join('\n');

  const blob = new Blob([rows], { type: 'text/plain' });
  triggerDownload(blob, `${fileStem()}.txt`);
}

/*──────────────── JSON EXPORTER ────────────────────────────*/
function downloadJson() {
  const blob = new Blob(
    [JSON.stringify(generateResonanceJSON(), null, 2)],
    { type: 'application/json' }
  );
  triggerDownload(blob, `${fileStem()}.json`);
}

/*──────────────── NODE SOURCES MODE TOGGLE ────────────────────────────*/
function toggleNodeSourcesMode() {
  nodeSourcesMode = !nodeSourcesMode;
  const nodeBtn = document.getElementById('nodeSourcesBtn');
  
  if (nodeSourcesMode) {
    nodeBtn.classList.add('active');
    console.log('[NODE SOURCES] Mode enabled - click table rows to place sources at antinodes');
  } else {
    nodeBtn.classList.remove('active');
    clearResonanceSources();
    console.log('[NODE SOURCES] Mode disabled - restored normal table behavior');
  }
}

/*──────────────── DYNAMIC TABLE DISPLAY TOGGLES ────────────────────────────*/
let entityTableVisible = false;
let controllerTableVisible = false;

function toggleEntityTableDisplay() {
  entityTableVisible = !entityTableVisible;
  const entityBtn = document.getElementById('entityTableBtn');
  
  if (entityTableVisible) {
    entityBtn.classList.add('active');
    showEntityTable();
    console.log('[SPAT OBJECTS] Display enabled');
  } else {
    entityBtn.classList.remove('active');
    hideEntityTable();
    console.log('[SPAT OBJECTS] Display disabled');
  }
}

function toggleControllerTableDisplay() {
  controllerTableVisible = !controllerTableVisible;
  const controllerBtn = document.getElementById('controllerTableBtn');
  
  if (controllerTableVisible) {
    controllerBtn.classList.add('active');
    showControllerTable();
    console.log('[CONTROLLER TABLE] Display enabled');
  } else {
    controllerBtn.classList.remove('active');
    hideControllerTable();
    console.log('[CONTROLLER TABLE] Display disabled');
  }
}

function showEntityTable() {
  let tableDiv = document.getElementById('entityTableDisplay');
  if (!tableDiv) {
    tableDiv = document.createElement('div');
    tableDiv.id = 'entityTableDisplay';
    tableDiv.style.cssText = `
      position: fixed;
      top: 180px;
      left: 280px;
      background: rgba(0,0,0,0.8);
      color: #C4E538;
      border: 1px solid #C4E538;
      padding: 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 1000;
      max-width: 800px;
      max-height: 500px;
      overflow: auto;
      border-radius: 0;
    `;
    document.body.appendChild(tableDiv);
  }
  updateEntityTableDisplay();
}

function hideEntityTable() {
  const tableDiv = document.getElementById('entityTableDisplay');
  if (tableDiv) {
    tableDiv.remove();
  }
}

function showControllerTable() {
  let tableDiv = document.getElementById('controllerTableDisplay');
  if (!tableDiv) {
    tableDiv = document.createElement('div');
    tableDiv.id = 'controllerTableDisplay';
    tableDiv.style.cssText = `
      position: fixed;
      top: 180px;
      left: 700px;
      background: rgba(0,0,0,0.8);
      color: #C4E538;
      border: 1px solid #C4E538;
      padding: 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 1000;
      max-width: 800px;
      max-height: 500px;
      overflow: auto;
      border-radius: 0;
    `;
    document.body.appendChild(tableDiv);
  }
  updateControllerTableDisplay();
}

function hideControllerTable() {
  const tableDiv = document.getElementById('controllerTableDisplay');
  if (tableDiv) {
    tableDiv.remove();
  }
}

function updateEntityTableDisplay() {
  const tableDiv = document.getElementById('entityTableDisplay');
  if (!tableDiv || !entityTableVisible) return;
  
  let html = '<h4 style="margin: 0 0 10px 0; color: #C4E538;">🗺️ SPAT OBJECTS</h4>';
  html += '<div style="font-size: 10px; overflow-x: auto;">';
  
  // Listener Section
  const listener = entityPositions.listener;
  html += '<div style="margin-bottom: 12px;">';
  html += '<strong style="color: #C4E538;">Listener:</strong>';
  if (!listener.initialized || listener.lastUpdated === null) {
    html += '<div style="margin-left: 10px; color: #888;">(not initialized)</div>';
  } else {
    const spatCoords = convertThreeToSpat(listener.x, listener.y, listener.z);
    html += '<table style="margin-left: 10px; border-collapse: collapse; width: 100%; font-family: monospace;">';
    html += '<tr style="background: #333;"><th style="border: 1px solid #555; padding: 3px; text-align: left;">X</th><th style="border: 1px solid #555; padding: 3px; text-align: left;">Y</th><th style="border: 1px solid #555; padding: 3px; text-align: left;">Z</th><th style="border: 1px solid #555; padding: 3px; text-align: left;">Updated</th></tr>';
    html += `<tr><td style="border: 1px solid #555; padding: 3px;">${spatCoords.x.toFixed(3)}</td><td style="border: 1px solid #555; padding: 3px;">${spatCoords.y.toFixed(3)}</td><td style="border: 1px solid #555; padding: 3px;">${spatCoords.z.toFixed(3)}</td><td style="border: 1px solid #555; padding: 3px;">${new Date(listener.lastUpdated).toLocaleTimeString()}</td></tr>`;
    html += '</table>';
  }
  html += '</div>';
  
  // Sources Section
  html += '<div style="margin-bottom: 12px;">';
  html += '<strong style="color: #C4E538;">Sources:</strong>';
  const sourceCount = Object.keys(entityPositions.sources).length;
  if (sourceCount === 0) {
    html += '<div style="margin-left: 10px; color: #888;">(no sources)</div>';
  } else {
    html += '<table style="margin-left: 10px; border-collapse: collapse; width: max-content; font-family: monospace;">';
    html += '<tr style="background: #333;"><th style="border: 1px solid #555; padding: 3px; text-align: left; white-space: nowrap;">ID</th><th style="border: 1px solid #555; padding: 3px; text-align: left; white-space: nowrap;">Label</th><th style="border: 1px solid #555; padding: 3px; text-align: left; white-space: nowrap;">Position (X,Y,Z)</th><th style="border: 1px solid #555; padding: 3px; text-align: left; white-space: nowrap;">Controller</th><th style="border: 1px solid #555; padding: 3px; text-align: left; white-space: nowrap;">Label</th></tr>';
    Object.entries(entityPositions.sources).forEach(([id, pos]) => {
      const spatCoords = convertThreeToSpat(pos.x, pos.y, pos.z);
      const controllerId = pos.controller || '';
      const controllerLabel = controllerId && activeControllers[controllerId] ? activeControllers[controllerId].label : '';
      const displayLabel = pos.label || `s${id}`;
      
      html += '<tr>';
      html += `<td style="border: 1px solid #555; padding: 3px; white-space: nowrap;">s${id}</td>`;
      html += `<td style="border: 1px solid #555; padding: 3px; white-space: nowrap;">${displayLabel}</td>`;
      html += `<td style="border: 1px solid #555; padding: 3px; white-space: nowrap;">(${spatCoords.x.toFixed(3)}, ${spatCoords.y.toFixed(3)}, ${spatCoords.z.toFixed(3)})</td>`;
      html += `<td style="border: 1px solid #555; padding: 3px; white-space: nowrap; ${controllerId ? 'color: #7FFF00;' : 'color: #888;'}">${controllerId || '-'}</td>`;
      html += `<td style="border: 1px solid #555; padding: 3px; white-space: nowrap; ${controllerLabel ? 'color: #7FFF00;' : 'color: #888;'}">${controllerLabel || '-'}</td>`;
      html += '</tr>';
    });
    html += '</table>';
  }
  html += '</div>';
  
  // Speakers Section
  html += '<div>';
  html += '<strong style="color: #C4E538;">Speakers:</strong>';
  const speakerCount = Object.keys(entityPositions.speakers).length;
  if (speakerCount === 0) {
    html += '<div style="margin-left: 10px; color: #888;">(no speakers)</div>';
  } else {
    html += '<table style="margin-left: 10px; border-collapse: collapse; width: 100%; font-family: monospace;">';
    html += '<tr style="background: #333;"><th style="border: 1px solid #555; padding: 3px; text-align: left;">ID</th><th style="border: 1px solid #555; padding: 3px; text-align: left;">Label</th><th style="border: 1px solid #555; padding: 3px; text-align: left;">Position (X,Y,Z)</th><th style="border: 1px solid #555; padding: 3px; text-align: left;">Updated</th></tr>';
    Object.entries(entityPositions.speakers).forEach(([id, pos]) => {
      const spatCoords = convertThreeToSpat(pos.x, pos.y, pos.z);
      const displayLabel = pos.label || `${id}`;
      
      html += '<tr>';
      html += `<td style="border: 1px solid #555; padding: 3px;">hp${id}</td>`;
      html += `<td style="border: 1px solid #555; padding: 3px;">${displayLabel}</td>`;
      html += `<td style="border: 1px solid #555; padding: 3px;">(${spatCoords.x.toFixed(3)}, ${spatCoords.y.toFixed(3)}, ${spatCoords.z.toFixed(3)})</td>`;
      html += `<td style="border: 1px solid #555; padding: 3px;">${pos.lastUpdated ? new Date(pos.lastUpdated).toLocaleTimeString() : '-'}</td>`;
      html += '</tr>';
    });
    html += '</table>';
  }
  html += '</div>';
  html += '</div>';
  
  tableDiv.innerHTML = html;
}

function updateControllerTableDisplay() {
  const tableDiv = document.getElementById('controllerTableDisplay');
  if (!tableDiv || !controllerTableVisible) return;
  
  let html = '<h4 style="margin: 0 0 10px 0; color: #C4E538;">📱 MOBILE CONTROLLERS</h4>';
  html += '<div style="font-size: 10px; overflow-x: auto;">';
  
  const controllerCount = Object.keys(activeControllers).length;
  if (controllerCount === 0) {
    html += '<div style="color: #888;">(no controllers connected)</div>';
  } else {
    html += '<table style="border-collapse: collapse; width: 100%; font-family: monospace;">';
    html += '<tr style="background: #333;">';
    html += '<th style="border: 1px solid #555; padding: 4px; text-align: left;">Device ID</th>';
    html += '<th style="border: 1px solid #555; padding: 4px; text-align: left;">Label</th>';
    html += '<th style="border: 1px solid #555; padding: 4px; text-align: left;">Bound To</th>';
    html += '<th style="border: 1px solid #555; padding: 4px; text-align: left;">Label</th>';
    html += '<th style="border: 1px solid #555; padding: 4px; text-align: left;">Origin</th>';
    html += '<th style="border: 1px solid #555; padding: 4px; text-align: left;">Origin Offset</th>';
    html += '<th style="border: 1px solid #555; padding: 4px; text-align: left;">Last Seen</th>';
    html += '</tr>';
    
    Object.entries(activeControllers).forEach(([deviceId, controller]) => {
      const boundSourceId = controller.boundSource;
      const sourceLabel = boundSourceId && entityPositions.sources[boundSourceId] ? entityPositions.sources[boundSourceId].label : '';
      const originOffset = controller.originOffset ? 
        `(${controller.originOffset.x.toFixed(2)}, ${controller.originOffset.y.toFixed(2)}, ${controller.originOffset.z.toFixed(2)})` : '-';
      
      html += '<tr>';
      html += `<td style="border: 1px solid #555; padding: 4px; color: #7FFF00;">${deviceId}</td>`;
      html += `<td style="border: 1px solid #555; padding: 4px;">${controller.label || '-'}</td>`;
      html += `<td style="border: 1px solid #555; padding: 4px; ${boundSourceId ? 'color: #7FFF00;' : 'color: #888;'}">${boundSourceId ? `s${boundSourceId}` : '-'}</td>`;
      html += `<td style="border: 1px solid #555; padding: 4px; ${sourceLabel ? 'color: #7FFF00;' : 'color: #888;'}">${sourceLabel || '-'}</td>`;
      html += `<td style="border: 1px solid #555; padding: 4px; ${controller.customOrigin ? 'color: #FFA500;' : ''}">${controller.customOrigin ? 'custom' : 'default'}</td>`;
      html += `<td style="border: 1px solid #555; padding: 4px; font-size: 9px;">${originOffset}</td>`;
      html += `<td style="border: 1px solid #555; padding: 4px; font-size: 9px;">${new Date(controller.lastSeen).toLocaleTimeString()}</td>`;
      html += '</tr>';
    });
    html += '</table>';
  }
  html += '</div>';
  
  tableDiv.innerHTML = html;
}

/*──────────────── RESONANCE SOURCE MANAGEMENT ────────────────────────────*/
function clearResonanceSources() {
  resonanceSources.forEach(sourceObj => {
    if (sourceObj.mesh) {
      // Remove the mesh from the scene
      scene.remove(sourceObj.mesh);
      
      // Remove the CSS2D label from the mesh (important for cleanup)
      if (sourceObj.mesh.userData.labelObject) {
        sourceObj.mesh.remove(sourceObj.mesh.userData.labelObject);
      }
      
      // Remove from sourceMeshes array
      const meshIndex = sourceMeshes.indexOf(sourceObj.mesh);
      if (meshIndex !== -1) sourceMeshes.splice(meshIndex, 1);
    }
    
    if (sourceObj.label) {
      // Remove from sourceLabels array
      const labelIndex = sourceLabels.indexOf(sourceObj.label);
      if (labelIndex !== -1) sourceLabels.splice(labelIndex, 1);
    }
  });
  resonanceSources = [];
  console.log('[RESONANCE SOURCES] Cleared all resonance sources');
}

function onResonanceSelect(resonanceId) {
  const jsonData = generateResonanceJSON();
  const resonance = jsonData.resonances[resonanceId];
  
  if (!resonance) {
    console.error(`[RESONANCE SOURCES] Resonance ${resonanceId} not found`);
    return;
  }
  
  // Clear existing resonance sources
  clearResonanceSources();
  
  // Also clear any regular sources created via OSC from Max
  sourceMeshes.forEach(m => {
    // Remove all CSS2D labels attached to this mesh
    const labelsToRemove = [];
    m.traverse(child => {
      if (child.isCSS2DObject) {
        labelsToRemove.push(child);
      }
    });
    labelsToRemove.forEach(label => {
      if (label.parent) label.parent.remove(label);
    });
    // Remove the mesh from the scene
    scene.remove(m);
  });
  
  // Also remove from sourceLabels array
  sourceLabels.forEach(l => {
    if (l.parent) l.parent.remove(l);
  });
  
  // Clear the arrays
  sourceMeshes = [];
  sourceLabels = [];
  sources.length = 0;
  
  const antinodes = resonance.antinodes;
  const antinodeCount = Object.keys(antinodes).length;
  
  console.log(`[RESONANCE SOURCES] Creating ${antinodeCount} sources for ${resonanceId}`);
  
  Object.entries(antinodes).forEach(([antinodeKey, spatCoords], index) => {
    const sourceId = index + 1;
    const label = `s${sourceId} ${resonanceId}`;
    
    // Convert SPAT coordinates to Three.js coordinates
    const threeCoords = convertSpatToThree(spatCoords.x, spatCoords.y, spatCoords.z);
    
    // Create visual source in Three.js
    const sourceData = createResonanceSourceMesh(threeCoords, label);
    scene.add(sourceData.mesh);
    
    // Add mesh and label to global arrays for GUI opacity control
    sourceMeshes.push(sourceData.mesh);
    sourceLabels.push(sourceData.label);
    
    // Create SPAT source object
    const spatSource = new Source(sourceId, spatCoords);
    spatSource.label = label;
    spatSource.resonanceId = resonanceId;
    
    resonanceSources.push({ 
      mesh: sourceData.mesh, 
      label: sourceData.label,
      spat: spatSource,
      resonanceId: resonanceId,
      labelText: label  // Store the text label for OSC transmission
    });
  });
  
  console.log(`[RESONANCE SOURCES] Created ${antinodeCount} sources for ${resonanceId}`);
  
  // Send source configuration to Max/MSP
  sendSourceConfigToMax(resonanceId, antinodes);
}

function createResonanceSourceMesh(position, label) {
  // Use the same geometry and material as regular sources
  const geometry = new THREE.SphereGeometry(0.06, 32, 32);
  
  // Convert SPAT default color to THREE.js color
  const spatColor = { r: 0.490196, g: 1.0, b: 0.0 }; // Default green-yellow from SPAT
  const threeColor = new THREE.Color(spatColor.r, spatColor.g, spatColor.b);
  
  const material = new THREE.MeshStandardMaterial({
    color: threeColor,
    roughness: 0.6,
    metalness: 0.1,
    transparent: true,
    opacity: params.sourceOpacity  // Use the same opacity as other sources
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.userData = { type: 'resonanceSource', label: label };
  
  // Add text label matching the style of regular sources
  const labelDiv = document.createElement('div');
  labelDiv.className = 'label';
  labelDiv.textContent = label;
  labelDiv.style.font = '12px Arial';
  labelDiv.style.color = '#7EFF00';  // Green-yellow color for labels
  labelDiv.style.opacity = params.sourceOpacity;
  
  const labelObject = new CSS2DObject(labelDiv);
  labelObject.position.set(0, 0.1, 0);
  mesh.add(labelObject);
  
  // Store reference to label for cleanup
  mesh.userData.labelObject = labelObject;
  
  return { mesh, label: labelObject };
}

function sendSourceConfigToMax(resonanceId, antinodes) {
  if (!oscBridge) {
    console.warn('[RESONANCE SOURCES] OSC bridge not available - cannot send source data');
    return;
  }
  
  const sourceCount = resonanceSources.length;
  const bundleMessages = [];
  
  // Add source count message to bundle
  bundleMessages.push({
    address: '/source/number',
    args: [{ type: 'i', value: sourceCount }]
  });
  
  // Add individual source positions and labels to bundle
  resonanceSources.forEach((sourceObj, index) => {
    const sourceId = index + 1;
    const spatCoords = sourceObj.spat.position;
    
    // Add source position message
    bundleMessages.push({
      address: `/source/${sourceId}/xyz`,
      args: [
        { type: 'f', value: spatCoords.x },
        { type: 'f', value: spatCoords.y },
        { type: 'f', value: spatCoords.z }
      ]
    });
    
    // Add source label message
    bundleMessages.push({
      address: `/source/${sourceId}/label`,
      args: [{ type: 's', value: sourceObj.labelText }]
    });
  });
  
  // Send as single OSC bundle
  oscBridge.sendBundle(bundleMessages);
  
  console.log(`[RESONANCE SOURCES] Sent OSC bundle with ${bundleMessages.length} messages for ${resonanceId} (${sourceCount} sources)`);
}

/*──────────────── JSON HTTP SENDER ────────────────────────────*/
async function sendJsonToMax() {
  const jsonData = generateResonanceJSON();
  
  console.log(`[JSON HTTP] Sending scene calculations to MaxMSP (${JSON.stringify(jsonData).length} characters)`);
  console.log(`[JSON HTTP] Room: ${jsonData.room.Lx}x${jsonData.room.Ly}x${jsonData.room.Lz}m, ${jsonData.room.num_resonances} modes`);
  
  try {
    const response = await fetch('http://127.0.0.1:2112', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: jsonData
      })
    });
    
    if (response.ok) {
      const result = await response.text();
      console.log(`[JSON HTTP] Successfully sent to MaxMSP: ${result}`);
    } else {
      console.error(`[JSON HTTP] HTTP error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`[JSON HTTP] Network error:`, error);
    console.log(`[JSON HTTP] Make sure the Node.js HTTP server is running on port 2112`);
  }
}

function generateResonanceJSON(){
  const resonances={}, clusters={}, clusterModes=new Map();
  const voxel=0.25, vKey=(x,y,z)=>[Math.round(x/voxel),Math.round(y/voxel),Math.round(z/voxel)].join('');
  const V=params.Lx*params.Ly*params.Lz;
  modeList().forEach((m,i)=>{
    const key=`r${String(i+1).padStart(3,'0')}`;
    const active=[m.nx,m.ny,m.nz].filter(n=>n>0).length;
    const famW=[0.8,0.3,0.1][active-1];
    const Qinv=(Math.PI/13.8)*(params.T60/m.f);
    const mu=(Math.PI*m.f*m.f*params.T60)/(4*V);
    const amp=+(famW*Qinv/(1+mu)).toFixed(6);
    const bw =+(m.f*Qinv).toFixed(6);
    const mc =+(freq2mc(m.f).toFixed(6));

    /*──────────────── UPDATED ANTINODE ALGORITHM ────────────────*/
    /* true pressure maxima: centres of each half-wave per axis  */
    const antinodes = {};
    let   aCount    = 1;

    // For n > 0: n+1 antinodes; for n = 0: 1 antinode at center
    const xPts = m.nx ? Array.from({length: m.nx + 1}, (_, k) => (k + 0.5) * params.Lx / (m.nx + 1))
                  : [params.Lx / 2];
    const yPts = m.ny ? Array.from({length: m.ny + 1}, (_, k) => (k + 0.5) * params.Ly / (m.ny + 1))
                      : [params.Ly / 2];
    const zPts = m.nz ? Array.from({length: m.nz + 1}, (_, k) => (k + 0.5) * params.Lz / (m.nz + 1))
                      : [params.Lz / 2];
    

    /* 2. Cartesian product of those arrays → 3-D antinode list  */
    for (const x of xPts)
      for (const y of yPts)
        for (const z of zPts) {
          // Always add antinode with unique key (no voxel clustering)
          const centeredVec = centerVec(x, z, y);
          const antinodeKey = `a${aCount++}`;
          antinodes[antinodeKey] = convertThreeToSpat(centeredVec.x, centeredVec.y, centeredVec.z);

          /* 3. register voxel in cluster dict (for JSON export clustering) */
          const voxelKey = vKey(x, y, z); // 25-cm hash
          if (!clusters[voxelKey]) {
            const clusterCenteredVec = centerVec(x, z, y);
            clusters[voxelKey] = { xyz: convertThreeToSpat(clusterCenteredVec.x, clusterCenteredVec.y, clusterCenteredVec.z),
                                  resonances: [], modes: [] };
          }
          clusters[voxelKey].resonances.push(key);
          clusters[voxelKey].modes.push(`${m.nx}-${m.ny}-${m.nz}`);
        }
    resonances[key]={ id:i+1, f:+m.f.toFixed(6), mc, amp, bw, mode:`${m.nx}-${m.ny}-${m.nz}`, fam:fam(m.nx,m.ny,m.nz), num_antinodes:Object.keys(antinodes).length, antinodes};
  });

  // remove duplicate mode strings per cluster
  Object.values(clusters).forEach(c=>{c.modes=[...new Set(c.modes)];});

  // Convert clusters to use c001 format instead of voxelKey
  const formattedClusters = {};
  Object.values(clusters).forEach((cluster, i) => {
    const clusterKey = `c${String(i + 1).padStart(3, '0')}`;
    formattedClusters[clusterKey] = cluster;
  });

  const verts={};
  [[0,0,0],[params.Lx,0,0],[params.Lx,params.Ly,0],[0,params.Ly,0],[0,0,params.Lz],[params.Lx,0,params.Lz],[params.Lx,params.Ly,params.Lz],[0,params.Ly,params.Lz]].forEach((v,i)=>verts[`v${i+1}`]=convertThreeToSpat(...v));

  return{
    room:{Lx:params.Lx,Ly:params.Ly,Lz:params.Lz,num_resonances:Object.keys(resonances).length,num_clusters:Object.keys(formattedClusters).length,vertices:verts,num_vertices:8,listener:{x:0,y:0,z:1.2}},
    settings:{T60:params.T60,fs:+fs().toFixed(6),schroMult:params.schroMult,voxelResolution:{x:Math.round(params.Lx/voxel),y:Math.round(params.Ly/voxel),z:Math.round(params.Lz/voxel)}},
    resonances, clusters: formattedClusters
  };
}

/*──────────────────────────────────────────────────────────────
  SPAT HELPERS
──────────────────────────────────────────────────────────────*/

function createSpeakerRing(numSpeakers = 8) {
  // Clear existing speakers first
  speakers.length = 0;
  
  // Properly remove speaker meshes and their CSS2D labels
  speakerMeshes.forEach(m => {
    // Remove all CSS2D labels attached to this mesh
    const labelsToRemove = [];
    m.traverse(child => {
      if (child.isCSS2DObject) {
        labelsToRemove.push(child);
      }
    });
    labelsToRemove.forEach(label => {
      if (label.parent) label.parent.remove(label);
    });
    // Remove the mesh from the scene
    scene.remove(m);
  });
  speakerMeshes = [];

  const radius = 1;
  // Use OSC azimuth offset if available
  const offsetDeg = window.oscBridge?.speakerAzimuthOffset || 0;
  const startAngle = Math.PI / 2 + THREE.MathUtils.degToRad(offsetDeg);
  currentSpeakerCount = numSpeakers; // Store current count

  for (let i = 0; i < numSpeakers; i++) {
    const speakerId = i + 1;
    const theta = startAngle + (i / numSpeakers) * Math.PI * 2;
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);

    // Create SPAT Speaker object
    const speaker = new Speaker(
      speakerId,
      { x, y: 0, z },
      { x: 0, y: 0, z: 0, w: 1 },
      { label: `hp-${speakerId}` }
    );
    
    // Override setPosition to update both visual mesh and entity table
    const originalSetPosition = speaker.setPosition.bind(speaker);
    speaker.setPosition = function(x, y, z) {
      originalSetPosition(x, y, z);
      
      // Convert SPAT coordinates to Three.js for visual mesh
      const threeCoords = convertSpatToThree(x, y, z);
      
      // Update visual mesh if it exists
      if (this.mesh) {
        this.mesh.position.set(threeCoords.x, threeCoords.y, threeCoords.z);
        
        // Re-orient speaker to face center
        this.mesh.up.set(0, 1, 0);
        const target = new THREE.Vector3(0, threeCoords.y, 0);
        this.mesh.lookAt(target);
        this.mesh.rotateX(THREE.MathUtils.degToRad(15));
      }
      
      // Update entity table with Three.js coordinates
      updateEntityPosition('speaker', this.id, threeCoords.x, threeCoords.y, threeCoords.z);
    };
    
    speakers.push(speaker);

    // Create visual mesh
    const spk = {
      position: new THREE.Vector3(x, 0., z),
      label: `${speakerId}`
    };

    loadYamahaSpeaker(spk, mesh => {
      scene.add(mesh);
      
      // Connect mesh to SPAT speaker object
      speaker.mesh = mesh;
      
      // Initialize speaker in entity position table
      updateEntityPosition('speaker', speakerId, x, 0, z);
    });
  }
  
  // Update attachment dropdown options when speaker count changes
  updateAvailableTargets();
}

function createSourceRing(numSources = 3) {
  // Properly remove source meshes and their CSS2D labels
  sourceMeshes.forEach(m => {
    // Remove all CSS2D labels attached to this mesh
    const labelsToRemove = [];
    m.traverse(child => {
      if (child.isCSS2DObject) {
        labelsToRemove.push(child);
      }
    });
    labelsToRemove.forEach(label => {
      if (label.parent) label.parent.remove(label);
    });
    // Remove the mesh from the scene
    scene.remove(m);
  });
  
  // Also remove from sourceLabels array
  sourceLabels.forEach(l => {
    if (l.parent) l.parent.remove(l);
  });
  
  sourceMeshes = [];
  sourceLabels = [];
  sources.length = 0;  // Clear existing array instead of creating new one
  
  // Also clear resonance sources when creating new regular sources
  resonanceSources.forEach(sourceObj => {
    if (sourceObj.mesh) {
      // Remove CSS2D label from mesh
      if (sourceObj.mesh.userData.labelObject) {
        sourceObj.mesh.remove(sourceObj.mesh.userData.labelObject);
      }
    }
  });
  resonanceSources = [];
  
  // Turn off NODE SOURCES mode if it was active
  if (nodeSourcesMode) {
    nodeSourcesMode = false;
    const nodeBtn = document.getElementById('nodeSourcesBtn');
    if (nodeBtn) nodeBtn.classList.remove('active');
    console.log('[NODE SOURCES] Mode disabled due to new /sources/number message');
  }

  const radius = 0.8;
  // Use OSC azimuth offset if available
  const offsetDeg = window.oscBridge?.sourceAzimuthOffset || 0;
  const startAngle = Math.PI / 2 + THREE.MathUtils.degToRad(offsetDeg);

    // Use the SPAT default source color
    const dummySource = new Source(0);  // No need for real ID
    const defaultColor = new THREE.Color(
    dummySource.color.r,
    dummySource.color.g,
    dummySource.color.b
    );

    const labelColor = `rgb(${dummySource.labelColor.r * 255}, ${dummySource.labelColor.g * 255}, ${dummySource.labelColor.b * 255})`;

  for (let i = 0; i < numSources; i++) {
    const theta = startAngle + (i / numSources) * Math.PI * 2;
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);

    const geo = new THREE.SphereGeometry(0.06, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: defaultColor,
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: params.sourceOpacity
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    sourceMeshes.push(mesh);

    const div = document.createElement('div');
    div.textContent = `${i + 1}`;
    div.style.font = '12px Arial';
    div.style.color = labelColor;
    div.style.opacity = params.sourceOpacity;

    const label = new CSS2DObject(div);
    label.position.set(0, 0.1, 0);
    mesh.add(label);
    sourceLabels.push(label);
    
    // Create Source object for OSC bridge with mesh connection
    const source = new Source(i + 1, { x, y: 0, z });
    source.mesh = mesh;  // Connect to visual mesh
    
    // Override setPosition to update both SPAT data and visual mesh
    const originalSetPosition = source.setPosition.bind(source);
    source.setPosition = function(x, y, z) {
      // console.log(`[Source${this.id}] setPosition called with SPAT coords: (${x}, ${y}, ${z})`);
      originalSetPosition(x, y, z);
      
      // Update dynamic position table
      updateEntityPosition('source', this.id, x, y, z);
      
      if (this.mesh) {
        const threePos = convertSpatToThree(x, y, z);
        // console.log(`[Source${this.id}] Converted to Three.js coords: (${threePos.x}, ${threePos.y}, ${threePos.z})`);
        // console.log(`[Source${this.id}] Mesh before:`, this.mesh.position);
        this.mesh.position.set(threePos.x, threePos.y, threePos.z);
        // console.log(`[Source${this.id}] Mesh after:`, this.mesh.position);
      } else {
        // console.warn(`[Source${this.id}] No mesh connected!`);
      }
    };
    
    sources.push(source);
    
    // Initialize source in entity position table
    entityPositions.sources[source.id] = {
      x: source.position.x,
      y: source.position.y, 
      z: source.position.z,
      label: `s${source.id}`,
      controller: null,
      lastUpdated: Date.now()
    };
  }
  
  currentSourceCount = numSources;
  
  // Update attachment dropdown options when source count changes
  updateAvailableTargets();
}

function loadHeadModel(pos, onLoad) {
  const loader = new GLTFLoader();
  loader.load('./assets/male_head.glb', (gltf) => {
    headGroup = new THREE.Group(); // global assignment
    const head = gltf.scene;

    // Silver material for all meshes
    head.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: "silver",
          roughness: 0.0,
          metalness: 0.75
        });
      }
    });

    head.scale.set(0.1, 0.1, 0.1);
    head.position.set(0, -0.25, 0); // offset inside group
    headGroup.add(head);

    // Create ears
    const earGeo = new THREE.SphereGeometry(0.035, 16, 16);

    const leftMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xff0000,
      emissiveIntensity: params.blinkingEnabled ? 1.0 : 0.0,
      transparent: true,
      opacity: params.listenerHeadOpacity ?? 0.3
    });

    const rightMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x00ff00,
      emissiveIntensity: params.blinkingEnabled ? 1.0 : 0.0,
      transparent: true,
      opacity: params.listenerHeadOpacity ?? 0.3
    });

    const leftEar = new THREE.Mesh(earGeo, leftMat);
    const rightEar = new THREE.Mesh(earGeo, rightMat);

    // Glow sprites
    function createGlowSprite(color = 0xff0000, size = 0.35) {
      const texture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
      const material = new THREE.SpriteMaterial({
        map: texture,
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(size, size, size);
      return sprite;
    }

    const redGlow = createGlowSprite(0xff0000);
    const greenGlow = createGlowSprite(0x00ff00);
    leftEar.add(redGlow);
    rightEar.add(greenGlow);
    redGlow.position.set(0, 0, 0);
    greenGlow.position.set(0, 0, 0);

    // Ear lights
    const leftLight = new THREE.PointLight(0xff0000, params.blinkingEnabled ? 1.0 : 0.0, 1);
    const rightLight = new THREE.PointLight(0x00ff00, params.blinkingEnabled ? 1.0 : 0.0, 1);
    leftLight.position.copy(leftEar.position);
    rightLight.position.copy(rightEar.position);
    headGroup.add(leftLight, rightLight);

    // Position ears
    leftEar.position.set(-0.15, 0, 0);
    rightEar.position.set(0.15, 0, 0);
    headGroup.add(leftEar, rightEar);

    // Position and orient
    headGroup.position.copy(pos);
    if (listener) {
      headGroup.quaternion.copy(listener.quaternion);
    }

    // Add to scene
    scene.add(headGroup);

    // Globals for GUI + animation
    window.headGroup = headGroup;
    window.leftEar = leftEar;
    window.rightEar = rightEar;
    window.leftLight = leftLight;
    window.rightLight = rightLight;

    // Apply params-based values for opacity and glow
    leftMat.opacity = params.listenerHeadOpacity;
    leftMat.emissiveIntensity = params.blinkingEnabled ? 1.0 : 0.0;

    rightMat.opacity = params.listenerHeadOpacity;
    rightMat.emissiveIntensity = params.blinkingEnabled ? 1.0 : 0.0;

    leftLight.intensity = params.blinkingEnabled ? 1.0 : 0.0;
    rightLight.intensity = params.blinkingEnabled ? 1.0 : 0.0;

    // Optional callback
    if (typeof onLoad === 'function') {
      onLoad({
        headGroup,
        leftEar,
        rightEar,
        redGlow,
        greenGlow
      });
    }
  });
}

function preloadYamahaSpeakerModel(onReady) {
  const loader = new GLTFLoader();
  loader.load('./assets/yamaha_hs5_studio_monitor.glb', (gltf) => {
    yamahaSpeakerTemplate = gltf.scene;
    onReady();
  });
}

function loadYamahaSpeaker(spk, onLoad) {
  if (!yamahaSpeakerTemplate) {
    console.warn("⚠️ Yamaha speaker model not yet loaded.");
    return;
  }

  const model = yamahaSpeakerTemplate.clone(true);

  model.scale.set(0.7, 0.7, 0.7);
  model.position.copy(spk.position);

  model.up.set(0, 1, 0);
  const target = new THREE.Vector3(0, model.position.y, 0);
  model.lookAt(target);
  model.rotateX(THREE.MathUtils.degToRad(15));

  model.traverse((child) => {
    if (child.isMesh && child.material) {
      const mat = child.material;
      mat.transparent = true;
      mat.opacity = params.speakerOpacity;
      mat.roughness = 1.0;
      mat.metalness = 0.1;
      mat.side = THREE.FrontSide;
    }
  });

  const labelDiv = document.createElement('div');
  labelDiv.textContent = spk.label || 'spk';
  labelDiv.style.font = '12px Arial';
  labelDiv.style.color = '#f00';
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, 0.5, 0);
  model.add(label);

  const light = new THREE.PointLight(0xffffff, 0.8, 1.5);
  light.position.set(0, 0.25, 0.2);
  model.add(light);

  speakerMeshes.push(model);

  onLoad(model);
}

function createSkyBox() {
  if (skyBox) {
    scene.remove(skyBox);
    skyBox = null;
  }
  
  // Clear any existing scene background
  scene.background = null;

  if (!params.environmentEnabled) return;

  let skyGeometry, skyMaterial;

  if (params.skyboxType === 'cube' && skyboxOptions[params.skyboxEnvironment]) {
    // Try proper cube texture mapping with corrected face order
    const folderName = skyboxOptions[params.skyboxEnvironment];
    const basePath = `./assets/penguins-skybox-pack/${folderName}/`;
    
    // Determine file extension based on environment
    const ext = params.skyboxEnvironment === 'kenon_cloudbox' ? '.png' : '.jpg';
    
    // Load and flip textures manually using canvas
    const faceOrder = [
      basePath + params.skyboxEnvironment + '_ft' + ext, // +X (front->right)
      basePath + params.skyboxEnvironment + '_bk' + ext, // -X (back->left) 
      basePath + params.skyboxEnvironment + '_dn' + ext, // +Y (down->up) SWAPPED
      basePath + params.skyboxEnvironment + '_up' + ext, // -Y (up->down) SWAPPED
      basePath + params.skyboxEnvironment + '_rt' + ext, // +Z (right->front)
      basePath + params.skyboxEnvironment + '_lf' + ext  // -Z (left->back)
    ];
    
    // Function to flip a texture vertically with maximum quality preservation
    function flipTextureVertically(image) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { 
        alpha: false,
        willReadFrequently: false,
        colorSpace: 'srgb'
      });
      
      // Use original image dimensions for pixel-perfect quality
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      
      // Highest quality settings
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      
      // Flip vertically with exact pixel mapping
      ctx.scale(1, -1);
      ctx.drawImage(image, 0, -canvas.height, canvas.width, canvas.height);
      
      return canvas;
    }
    
    // Function to flip a texture horizontally with maximum quality preservation
    function flipTextureHorizontally(image) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { 
        alpha: false,
        willReadFrequently: false,
        colorSpace: 'srgb'
      });
      
      // Use original image dimensions for pixel-perfect quality
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      
      // Highest quality settings
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      
      // Flip horizontally with exact pixel mapping
      ctx.scale(-1, 1);
      ctx.drawImage(image, -canvas.width, 0, canvas.width, canvas.height);
      
      return canvas;
    }
    
    // Function to rotate a texture 90° counterclockwise with maximum quality preservation
    function rotateTextureCounterclockwise(image) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { 
        alpha: false,
        willReadFrequently: false,
        colorSpace: 'srgb'
      });
      
      // Use original image dimensions and swap for rotation
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      canvas.width = height;  // Swapped for 90° rotation
      canvas.height = width;  // Swapped for 90° rotation
      
      // Highest quality settings
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      
      // Rotate 90° counterclockwise with exact pixel mapping
      ctx.translate(0, width);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(image, 0, 0, width, height);
      
      return canvas;
    }
    
    // Load each face individually
    const textureLoader = new THREE.TextureLoader();
    const faceTextures = [];
    let loadedCount = 0;
    
    faceOrder.forEach((faceUrl, index) => {
      textureLoader.load(faceUrl, function(texture) {
        const image = texture.image;
        
        // ✅ WORKING SOLUTION - Correct cube texture orientation transformations:
        if (index === 0 || index === 1 || index === 4 || index === 5) {
          // Side faces: Vertical flip only (corrects upside-down sides)
          const flippedCanvas = flipTextureVertically(image);
          faceTextures[index] = flippedCanvas;
        } else if (index === 3) {
          // Top face: Horizontal flip + 180° rotation (corrects orientation)
          let processedCanvas = flipTextureHorizontally(image);
          processedCanvas = rotateTextureCounterclockwise(processedCanvas);
          processedCanvas = rotateTextureCounterclockwise(processedCanvas);
          faceTextures[index] = processedCanvas;
        } else {
          // Bottom face: Horizontal flip + 180° rotation (corrects orientation)
          let processedCanvas = flipTextureHorizontally(image);
          processedCanvas = rotateTextureCounterclockwise(processedCanvas);
          processedCanvas = rotateTextureCounterclockwise(processedCanvas);
          faceTextures[index] = processedCanvas;
        }
        
        loadedCount++;
        if (loadedCount === 6) {
          // All faces loaded, create cube texture with maximum quality preservation
          const cubeTexture = new THREE.CubeTexture(faceTextures);
          cubeTexture.needsUpdate = true;
          
          // High quality texture settings that work with canvas data
          cubeTexture.magFilter = THREE.LinearFilter;
          cubeTexture.minFilter = THREE.LinearFilter;
          cubeTexture.generateMipmaps = false;          // Prevent quality loss
          cubeTexture.flipY = false;
          cubeTexture.format = THREE.RGBAFormat;        // Canvas outputs RGBA
          cubeTexture.type = THREE.UnsignedByteType;
          
          window.currentCubeTexture = cubeTexture;
          
          // Update the material
          if (skyMaterial) {
            skyMaterial.envMap = cubeTexture;
            skyMaterial.needsUpdate = true;
          }
          // Cube texture successfully created with correct orientation
        }
      });
    });
    
    // Create initial empty cube texture
    const texture = new THREE.CubeTexture();
    
    // Back to SphereGeometry for seamless mapping
    skyGeometry = new THREE.SphereGeometry(100, 64, 32);
    
    // Apply the coordinate transform that scene.background uses
    skyGeometry.scale(-1, 1, 1); // Flip X to match scene.background
    
    skyMaterial = new THREE.MeshBasicMaterial({
      envMap: texture,
      side: THREE.FrontSide, // Use FrontSide since we flipped X
      transparent: true,
      opacity: params.skyboxOpacity,
      depthWrite: false, // Don't write to depth buffer
      depthTest: true    // Enable depth testing to respect room outline
    });
    
    // Store reference for updates
    window.currentCubeTexture = texture;
  }

  skyBox = new THREE.Mesh(skyGeometry, skyMaterial);
  
  // Ensure skybox renders behind most objects but respects depth testing
  skyBox.renderOrder = -10;
  
  // Note: Mesh rotation not needed since we handle orientation via texture transformations
  // Cube texture orientation is corrected in the canvas processing above
  
  scene.add(skyBox);
}

function applyCubeTextureEffects(cubeTexture) {
  // Update the skybox material directly
  if (skyBox && skyBox.material) {
    // Update opacity directly
    skyBox.material.opacity = params.skyboxOpacity;
    
    // Update intensity by modifying the material color
    const intensity = params.skyboxIntensity;
    skyBox.material.color.setRGB(intensity, intensity, intensity);
    
    skyBox.material.needsUpdate = true;
  }
}

function updateSkyBox() {
  // Update cube texture effects in real-time
  if (window.currentCubeTexture) {
    applyCubeTextureEffects(window.currentCubeTexture);
  }
}

function onSourceNumber(n) {
  currentSourceCount = n;
  createSourceRing(n);
}

function onListenerEarHeight(h) {
  console.log(`[EarHeight] Setting listener ear height to ${h}m`);
  
  // Update SPAT objects
  const speakerLayout = computeSpeakerRingLayout(currentSpeakerCount, undefined, h, oscBridge.speakerAzimuthOffset);
  speakerLayout.forEach((pos, i) => {
    const p = convertSpatToThree(pos.x, pos.y, pos.z);
    if (speakers[i]) {
      speakers[i].setPosition(p.x, p.y, p.z);
      // Update entity table with Three.js coordinates
      updateEntityPosition('speaker', i + 1, p.x, p.y, p.z);
    }
  });

  const sourceLayout = computeSourceRingLayout(currentSourceCount, undefined, h, oscBridge.sourceAzimuthOffset);
  sourceLayout.forEach((pos, i) => {
    const p = convertSpatToThree(pos.x, pos.y, pos.z);
    if (sources[i]) {
      sources[i].setPosition(p.x, p.y, p.z);
      // Update entity table with Three.js coordinates
      updateEntityPosition('source', i + 1, p.x, p.y, p.z);
    }
  });
  
  // Update visual Three.js objects
  // Update listener head position
  if (listener) {
    listener.position.y = h;
    console.log(`[EarHeight] Updated listener position to y=${h}`);
    // Update entity table with Three.js coordinates
    updateEntityPosition('listener', null, listener.position.x, listener.position.y, listener.position.z);
  }
  
  // Collect all coordinate updates for OSC bundle
  const coordinateMessages = [];
  
  // Update visual speaker meshes and collect coordinates
  speakerMeshes.forEach((mesh, i) => {
    if (i < currentSpeakerCount) {
      mesh.position.y = h;
      
      // Convert Three.js position back to SPAT coordinates
      const spatPos = convertThreeToSpat(mesh.position.x, mesh.position.y, mesh.position.z);
      coordinateMessages.push({
        address: `/speaker/${i + 1}/xyz`,
        args: [
          { type: 'f', value: spatPos.x },
          { type: 'f', value: spatPos.y }, 
          { type: 'f', value: spatPos.z }
        ]
      });
    }
  });
  console.log(`[EarHeight] Updated ${speakerMeshes.length} speaker meshes`);
  
  // Update visual source meshes and collect coordinates
  sourceMeshes.forEach((mesh, i) => {
    if (i < currentSourceCount) {
      mesh.position.y = h;
      
      // Convert Three.js position back to SPAT coordinates
      const spatPos = convertThreeToSpat(mesh.position.x, mesh.position.y, mesh.position.z);
      coordinateMessages.push({
        address: `/source/${i + 1}/xyz`,
        args: [
          { type: 'f', value: spatPos.x },
          { type: 'f', value: spatPos.y },
          { type: 'f', value: spatPos.z }
        ]
      });
    }
  });
  console.log(`[EarHeight] Updated ${sourceMeshes.length} source meshes`);
  
  // Add updated listener position to bundle
  if (listener) {
    const spatPos = convertThreeToSpat(listener.position.x, listener.position.y, listener.position.z);
    coordinateMessages.push({
      address: '/listener/xyz',
      args: [
        { type: 'f', value: spatPos.x },
        { type: 'f', value: spatPos.y },
        { type: 'f', value: spatPos.z }
      ]
    });
    console.log(`[EarHeight] Added listener coordinates to bundle: ${spatPos.x}, ${spatPos.y}, ${spatPos.z}`);
  }
  
  // Send all coordinate updates as a single OSC bundle
  if (window.oscBridge && coordinateMessages.length > 0) {
    window.oscBridge.sendBundle(coordinateMessages);
    console.log(`[EarHeight] Sent coordinate bundle with ${coordinateMessages.length} messages to MaxMSP`);
  }
}

function onSpeakerAzimuthOffset(offset) {
  oscBridge.speakerAzimuthOffset = offset;
  // Reposition existing speakers instead of creating new ones
  repositionSpeakers(currentSpeakerCount, offset);
}

// ============================================================================
// SPEAKER-SPECIFIC COORDINATE CONVERSION FUNCTIONS
// ============================================================================
// These functions are specifically for SPAT5 speaker configuration messages
// and avoid interfering with existing source/listener coordinate conversions.

/**
 * Convert SPAT5 AED coordinates directly to Three.js coordinates for speakers
 * @param {number} azimuth - Azimuth in degrees (SPAT: 0° = front, positive = clockwise)
 * @param {number} elevation - Elevation in degrees 
 * @param {number} distance - Distance in meters
 * @returns {{x: number, y: number, z: number}} Three.js coordinates
 */
function convertSpatSpeakerAedToThree(azimuth, elevation, distance) {
  // console.log(`[convertSpatSpeakerAedToThree] Input: az=${azimuth}°, el=${elevation}°, d=${distance}m`);
  
  try {
    // SPAT coordinate system:
    // - Azimuth: 0° = front, positive = clockwise when viewed from above
    // - Elevation: 0° = horizontal plane, positive = up
    // - Distance: meters from origin
    
    // Three.js coordinate system:
    // - X: right (positive), left (negative)
    // - Y: up (positive), down (negative) 
    // - Z: forward (positive), backward (negative)
    
    const azRad = THREE.MathUtils.degToRad(azimuth);
    const elRad = THREE.MathUtils.degToRad(elevation);
    
    // Standard spherical to Cartesian conversion with SPAT→Three.js mapping
    const x = -distance * Math.sin(azRad) * Math.cos(elRad);  // Left/Right (negated for correct orientation)
    const y = distance * Math.sin(elRad);                    // Up/Down
    const z = distance * Math.cos(azRad) * Math.cos(elRad);  // Front/Back
    
    // console.log(`[convertSpatSpeakerAedToThree] Output: x=${x}, y=${y}, z=${z}`);
    return { x, y, z };
  } catch (error) {
    console.error(`[convertSpatSpeakerAedToThree] Error:`, error);
    return { x: 0, y: 0, z: 0 };
  }
}

/**
 * Convert SPAT5 XYZ coordinates directly to Three.js coordinates for speakers
 * @param {number} spatX - SPAT X coordinate
 * @param {number} spatY - SPAT Y coordinate  
 * @param {number} spatZ - SPAT Z coordinate
 * @returns {{x: number, y: number, z: number}} Three.js coordinates
 */
function convertSpatSpeakerXyzToThree(spatX, spatY, spatZ) {
  console.log(`[convertSpatSpeakerXyzToThree] Input: x=${spatX}, y=${spatY}, z=${spatZ}`);
  
  try {
    // For now, assume SPAT5 XYZ matches Three.js XYZ
    // This may need adjustment based on testing
    const result = { x: spatX, y: spatZ, z: -spatY }; // Common SPAT→Three.js mapping
    console.log(`[convertSpatSpeakerXyzToThree] Output: x=${result.x}, y=${result.y}, z=${result.z}`);
    return result;
  } catch (error) {
    console.error(`[convertSpatSpeakerXyzToThree] Error:`, error);
    return { x: 0, y: 0, z: 0 };
  }
}

function onSpeakersAzimuthList(azimuths) {
  console.log(`[SpeakersAzimuthList] FUNCTION CALLED! Positioning ${azimuths.length} speakers at azimuths: [${azimuths.join(', ')}]`);
  
  // Validate: number of azimuths must match number of speakers
  if (azimuths.length !== currentSpeakerCount) {
    console.error(`[SpeakersAzimuthList] Error: ${azimuths.length} azimuths provided, but ${currentSpeakerCount} speakers exist`);
    return;
  }
  
  const radius = 1; // Fixed radius
  const height = 0; // Fixed height (will be overridden by ear height)
  
  // Position each speaker at its specific azimuth
  azimuths.forEach((azimuth, i) => {
    if (i < speakerMeshes.length) {
      // Convert azimuth (SPAT degrees) to Three.js coordinates
      const azRad = THREE.MathUtils.degToRad(-azimuth); // Negative to match SPAT convention
      const x = radius * Math.sin(azRad);
      const z = radius * Math.cos(azRad);
      
      // Update visual mesh
      const mesh = speakerMeshes[i];
      mesh.position.set(x, mesh.position.y, z); // Keep existing Y height
      
      // Update entity table with Three.js coordinates
      updateEntityPosition('speaker', i + 1, x, mesh.position.y, z);
      
      // Re-orient speaker to face center
      mesh.up.set(0, 1, 0);
      const target = new THREE.Vector3(0, mesh.position.y, 0);
      mesh.lookAt(target);
      mesh.rotateX(THREE.MathUtils.degToRad(15));
      
      // console.log(`[SpeakersAzimuthList] Speaker ${i + 1} positioned at azimuth ${azimuth}° -> (${x.toFixed(3)}, ${mesh.position.y}, ${z.toFixed(3)})`);
    }
  });
}

function onSpeakersAEDList(aedValues) {
  // console.log(`[SpeakersAEDList] === FUNCTION ENTRY === Positioning ${aedValues.length / 3} speakers with AED values: [${aedValues.join(', ')}]`);
  
  // Validate: number of values must be divisible by 3 (az, el, dist triples)
  if (aedValues.length % 3 !== 0) {
    console.error(`[SpeakersAEDList] Error: ${aedValues.length} values provided, but must be divisible by 3 for AED triples`);
    return;
  }
  
  const numSpeakers = aedValues.length / 3;
  
  // Adjust speaker count if needed - SPAT config determines the count
  if (numSpeakers !== currentSpeakerCount) {
    console.log(`[SpeakersAEDList] Adjusting speaker count from ${currentSpeakerCount} to ${numSpeakers} based on SPAT configuration`);
    createSpeakerRing(numSpeakers);
  }
  
  // Position each speaker using its AED values
  for (let i = 0; i < numSpeakers; i++) {
    const azimuth = aedValues[i * 3];     // degrees
    const elevation = aedValues[i * 3 + 1]; // degrees
    const distance = aedValues[i * 3 + 2];  // meters
    
    if (i < speakerMeshes.length) {
      // Debug: Log raw AED coordinates and converted coordinates
      // console.log(`[SpeakersAEDList DEBUG] Speaker ${i + 1}: Raw AED (${azimuth}°, ${elevation}°, ${distance}m)`);
      
      // Convert AED to Three.js coordinates using speaker-specific conversion
      const { x, y, z } = convertSpatSpeakerAedToThree(azimuth, elevation, distance);
      // console.log(`[SpeakersAEDList DEBUG] Speaker ${i + 1}: Speaker-specific conversion to Three.js (${x}, ${y}, ${z})`);
      
      // Update visual mesh
      const mesh = speakerMeshes[i];
      mesh.position.set(x, y, z);
      
      // Update entity table with Three.js coordinates
      updateEntityPosition('speaker', i + 1, x, y, z);
      
      // Re-orient speaker to face center
      mesh.up.set(0, 1, 0);
      const target = new THREE.Vector3(0, y, 0);
      mesh.lookAt(target);
      mesh.rotateX(THREE.MathUtils.degToRad(15));
      
      // console.log(`[SpeakersAEDList] Speaker ${i + 1} positioned at AED (${azimuth}°, ${elevation}°, ${distance}m) -> (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`);
    }
  }
}

function onSpeakersXYZList(xyzValues) {
  // console.log(`[SpeakersXYZList] FUNCTION CALLED! Positioning ${xyzValues.length / 3} speakers with XYZ values: [${xyzValues.join(', ')}]`);
  
  // Validate: number of values must be divisible by 3 (x, y, z triples)
  if (xyzValues.length % 3 !== 0) {
    console.error(`[SpeakersXYZList] Error: ${xyzValues.length} values provided, but must be divisible by 3 for XYZ triples`);
    return;
  }
  
  const numSpeakers = xyzValues.length / 3;
  
  // Validate: number of speakers must match existing speaker count
  if (numSpeakers !== currentSpeakerCount) {
    console.error(`[SpeakersXYZList] Error: ${numSpeakers} speakers provided, but ${currentSpeakerCount} speakers exist`);
    return;
  }
  
  // Position each speaker using its XYZ values (SPAT coordinates)
  for (let i = 0; i < numSpeakers; i++) {
    const spatX = xyzValues[i * 3];     // SPAT X
    const spatY = xyzValues[i * 3 + 1]; // SPAT Y
    const spatZ = xyzValues[i * 3 + 2]; // SPAT Z
    
    if (i < speakerMeshes.length) {
      // Debug: Log raw SPAT coordinates and converted coordinates
      console.log(`[SpeakersXYZList DEBUG] Speaker ${i + 1}: Raw SPAT XYZ (${spatX}, ${spatY}, ${spatZ})`);
      
      // Convert SPAT coordinates to Three.js coordinates using speaker-specific conversion
      const { x, y, z } = convertSpatSpeakerXyzToThree(spatX, spatY, spatZ);
      console.log(`[SpeakersXYZList DEBUG] Speaker ${i + 1}: Speaker-specific conversion to Three.js (${x}, ${y}, ${z})`);
      
      // Update visual mesh
      const mesh = speakerMeshes[i];
      mesh.position.set(x, y, z);
      
      // Update entity table with Three.js coordinates
      updateEntityPosition('speaker', i + 1, x, y, z);
      
      // Re-orient speaker to face center
      mesh.up.set(0, 1, 0);
      const target = new THREE.Vector3(0, y, 0);
      mesh.lookAt(target);
      mesh.rotateX(THREE.MathUtils.degToRad(15));
      
      console.log(`[SpeakersXYZList] Speaker ${i + 1} positioned at SPAT XYZ (${spatX}, ${spatY}, ${spatZ}) -> Three.js (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`);
    }
  }
}

// Function to update speaker label text in the visual scene
function updateSpeakerLabelText(speakerId, labelText) {
  // console.log(`[UpdateSpeakerLabel] === FUNCTION ENTRY === Updating label for speaker ${speakerId} to: "${labelText}"`);
  
  const speakerIndex = speakerId - 1; // Convert to zero-based index
  const speakerMesh = speakerMeshes[speakerIndex];
  
  if (!speakerMesh) {
    console.error(`[UpdateSpeakerLabel] Error: Speaker mesh ${speakerId} not found in speakerMeshes array`);
    return;
  }
  
  // Find the CSS2D label in the speaker mesh hierarchy
  let labelFound = false;
  speakerMesh.traverse(child => {
    if (child.isCSS2DObject) {
      // console.log(`[UpdateSpeakerLabel] Found CSS2D label for speaker ${speakerId}, updating text from "${child.element.textContent}" to "${labelText}"`);
      child.element.textContent = labelText;
      labelFound = true;
    }
  });
  
  // if (!labelFound) {
  //   console.warn(`[UpdateSpeakerLabel] Warning: No CSS2D label found for speaker ${speakerId}`);
  // } else {
  //   console.log(`[UpdateSpeakerLabel] Successfully updated speaker ${speakerId} label to: "${labelText}"`);
  // }
}

// Function to update source label text in the visual scene
function updateSourceLabelText(sourceId, labelText) {
  console.log(`[UpdateSourceLabel] Updating label for source ${sourceId} to: "${labelText}"`);
  
  const sourceIndex = sourceId - 1; // Convert to zero-based index
  const sourceMesh = sourceMeshes[sourceIndex];
  
  if (!sourceMesh) {
    console.error(`[UpdateSourceLabel] Error: Source mesh ${sourceId} not found in sourceMeshes array`);
    return;
  }
  
  // Find the CSS2D label in the source mesh hierarchy
  let labelFound = false;
  sourceMesh.traverse(child => {
    if (child.isCSS2DObject) {
      console.log(`[UpdateSourceLabel] Found CSS2D label for source ${sourceId}, updating text from "${child.element.textContent}" to "${labelText}"`);
      child.element.textContent = labelText;
      labelFound = true;
    }
  });
  
  if (!labelFound) {
    console.warn(`[UpdateSourceLabel] Warning: No CSS2D label found for source ${sourceId}`);
  } else {
    console.log(`[UpdateSourceLabel] Successfully updated source ${sourceId} label to: "${labelText}"`);
  }
}

function onSourceAzimuthOffset(offset) {
  oscBridge.sourceAzimuthOffset = offset;
  // Reposition existing sources instead of creating new ones
  repositionSources(currentSourceCount, offset);
}

// computeSpeakerRingLayout(count, radius = 1.5, earHeight = 1.3, azimuthOffset = 0)
function repositionSpeakers(count, offset = 0) {
  // Reposition existing Three.js speaker meshes, not SPAT objects
  const radius = 1;
  const startAngle = Math.PI / 2 + THREE.MathUtils.degToRad(offset);
  
  speakerMeshes.forEach((model, i) => {
    if (i < count) {
      const theta = startAngle + (i / count) * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);
      model.position.set(x, model.position.y, z);
      
      // Update entity table with Three.js coordinates
      updateEntityPosition('speaker', i + 1, x, model.position.y, z);
      
      // Update lookAt direction
      model.up.set(0, 1, 0);
      const target = new THREE.Vector3(0, model.position.y, 0);
      model.lookAt(target);
      model.rotateX(THREE.MathUtils.degToRad(15));
    }
  });
}

function repositionSources(count, offset = 0) {
  // Reposition existing Three.js source meshes, not SPAT objects
  const radius = 0.8;
  const startAngle = Math.PI / 2 + THREE.MathUtils.degToRad(offset);
  
  sourceMeshes.forEach((mesh, i) => {
    if (i < count) {
      const theta = startAngle + (i / count) * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);
      mesh.position.set(x, mesh.position.y, z);
      
      // Update entity table with Three.js coordinates
      updateEntityPosition('source', i + 1, x, mesh.position.y, z);
    }
  });
}

/*──────── TEST SPAT SPEAKER RING ───────*/
function createTestSpeakerRing() {
  const radius = 1;
  const numSpeakers = 8;
  const startAngle = Math.PI / 4; // 45° in front

  for (let i = 0; i < numSpeakers; i++) {
    const theta = startAngle + (i / numSpeakers) * Math.PI * 2;
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);

    const spk = {
      position: new THREE.Vector3(x, 0, z),
      label: `${i + 1}`
    };

    loadYamahaSpeaker(spk, (mesh) => scene.add(mesh));
  }
}

/*──────── TEST SPAT SOURCES RING ───────*/
function createTestSources() {
  const radius = 0.8;
  const numSources = 3;
  const startAngle = Math.PI / 2; // align source 1 directly in front of listener

  // Clear old ones
  sourceMeshes.forEach(m => scene.remove(m));
  sourceLabels.forEach(l => scene.remove(l));
  sourceMeshes = [];
  sourceLabels = [];

  const colorData = sourceColorMap[params.sourceColor] || { color: 0xadff2f, metalness: 0.1, roughness: 0.6 };

  const labelColor = `rgb(${sources[0].labelColor.r * 255}, ${sources[0].labelColor.g * 255}, ${sources[0].labelColor.b * 255})`;

  for (let i = 0; i < numSources; i++) {
    const theta = startAngle + (i / numSources) * Math.PI * 2;
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);

    const sourceGeo = new THREE.SphereGeometry(0.06, 32, 32);
    const sourceMat = new THREE.MeshStandardMaterial({
      color: colorData.color,
      roughness: params.sourceRoughness,
      metalness: params.sourceMetalness,
      transparent: true,
      opacity: params.sourceOpacity
    });

    const sourceMesh = new THREE.Mesh(sourceGeo, sourceMat);
    sourceMesh.position.set(x, 0, z);
    scene.add(sourceMesh);
    sourceMeshes.push(sourceMesh);

    const labelDiv = document.createElement('div');
    labelDiv.textContent = `${i + 1}`;
    labelDiv.style.font = '12px Arial';
    labelDiv.style.color = labelColor;
    labelDiv.style.opacity = params.sourceOpacity;

    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 0.1, 0);
    sourceMesh.add(label);
    sourceLabels.push(label);
  }
}

/*──────── BUILD SCENE / TABLE / COLOURS / GUI / RESIZE ───────*/
let hoverInit=false,storedMode=null,selectedMode=null;
function rebuildScene(){
  if (typeof scene !== 'undefined' && typeof CSS2DObject !== 'undefined') {
    try {
      const toRemove = [];
      scene.traverse(obj => {
        if (obj instanceof CSS2DObject) {
          toRemove.push(obj);
        }
      });
      toRemove.forEach(label => {
        if (label.parent) label.parent.remove(label);
      });
      if (labelR?.domElement) {
        labelR.domElement.innerHTML = '';
      }
    } catch (e) {
      console.warn("Scene traversal failed during cleanup:", e);
    }
  }

  /* make a brand-new THREE.Scene */
  scene = new THREE.Scene();

  /* tell SpatOscBridge about the new scene */
  if (window.oscBridge) window.oscBridge.scene = scene;

  /*──────── INIT. NEW SCENE ───────*/
  // Clear previous objects and labels
  [frameH, axisLines, voxelPts, ...labels].forEach(o => o && scene.remove(o));
  labels.length = 0;

  const { Lx, Ly, Lz, dx } = params;
  setCam();
  frameH=new THREE.Box3Helper(new THREE.Box3(centerVec(0,0,0),centerVec(Lx,Lz,Ly)),0x444444);scene.add(frameH);
  axisLines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    centerVec(0,0,0),centerVec(Lx,0,0),centerVec(0,0,0),centerVec(0,Lz,0),centerVec(0,0,0),centerVec(0,0,Ly)
  ]), new THREE.LineBasicMaterial({
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  }));
  const inset=0.3;const lx=makeLabel(fmt(Lx));lx.position.copy(centerVec(Lx+inset,0,0));const ly=makeLabel(fmt(Lz));ly.position.copy(centerVec(0,Lz+inset,0));const lz=makeLabel(fmt(Ly));lz.position.copy(centerVec(0,0,Ly+inset));scene.add(lx,ly,lz);labels.push(lx,ly,lz);

  /*──────── RULERS, CENTERING, VOXEL GRID, + GUI CONTROLS ───────*/
  // Clear old rulers
  rulerGroups.forEach(g => scene.remove(g));
  rulerGroups = [];

  // Create new rulers
  const rulerX = createRulerTicks('x', Lx, 0.1, 0.5);
  const rulerY = createRulerTicks('y', Lz, 0.1, 0.5);
  const rulerZ = createRulerTicks('z', Ly, 0.1, 0.5);

  // Center each at origin
  rulerX.position.copy(centerVec(0, 0, 0));
  rulerY.position.copy(centerVec(0, 0, 0));
  rulerZ.position.copy(centerVec(0, 0, 0));

  scene.add(rulerX, rulerY, rulerZ);
  rulerGroups.push(rulerX, rulerY, rulerZ);

  // Show/hide based on GUI
  rulerGroups.forEach(g => g.visible = params.showRulers);

  /* create skybox */
  createSkyBox();

  /* voxel grid */
  const pos=[];for(let x=0;x<=Lx/dx;x++)for(let y=0;y<=Ly/dx;y++)for(let z=0;z<=Lz/dx;z++){const v=centerVec(x*dx,z*dx,y*dx);pos.push(v.x,v.y,v.z);}  
  voxelGeom=new THREE.BufferGeometry();voxelGeom.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); colourAttr=new THREE.BufferAttribute(new Float32Array(pos.length),3,true);voxelGeom.setAttribute('color',colourAttr);

  /*──────── LIGHTING PACKAGE ───────*/
  // Key light (front)
  const keyLight = new THREE.DirectionalLight(0xffffff, params.keyLightIntensity);
  keyLight.position.set(5, 6, 5); // front-top-right
  scene.add(keyLight);

  // Fill light (side/back)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
  fillLight.position.set(-5, 4, -5); // back-left
  scene.add(fillLight);

  // Back light (rim/highlight from behind)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
  rimLight.position.set(0, 3, -8); // directly from behind
  scene.add(rimLight);

  // Ambient light (soft base layer)
  const ambient = new THREE.AmbientLight(0xffffff, params.ambientLightIntensity);
  scene.add(ambient);

  // Additional reflection lights for metallic sources - positioned for maximum reflection impact
  const reflectionLight1 = new THREE.PointLight(0xffffff, params.reflectionLightIntensity, 20);
  reflectionLight1.position.set(3, 4, 3);
  scene.add(reflectionLight1);

  const reflectionLight2 = new THREE.PointLight(0xffffff, params.reflectionLightIntensity, 20);
  reflectionLight2.position.set(-3, 4, -3);
  scene.add(reflectionLight2);

  const reflectionLight3 = new THREE.PointLight(0xffffff, params.reflectionLightIntensity * 0.8, 18);
  reflectionLight3.position.set(0, 5, 0);
  scene.add(reflectionLight3);

  // Additional high-intensity reflection lights for dramatic effect
  const reflectionLight4 = new THREE.PointLight(0xffffff, params.reflectionLightIntensity, 15);
  reflectionLight4.position.set(4, 2, 0);
  scene.add(reflectionLight4);

  const reflectionLight5 = new THREE.PointLight(0xffffff, params.reflectionLightIntensity, 15);
  reflectionLight5.position.set(-4, 2, 0);
  scene.add(reflectionLight5);

  const reflectionLight6 = new THREE.PointLight(0xffffff, params.reflectionLightIntensity * 0.6, 12);
  reflectionLight6.position.set(0, 2, 4);
  scene.add(reflectionLight6);

  const reflectionLight7 = new THREE.PointLight(0xffffff, params.reflectionLightIntensity * 0.6, 12);
  reflectionLight7.position.set(0, 2, -4);
  scene.add(reflectionLight7);

  // Store light references for GUI control
  window.scenelights = {
    keyLight,
    fillLight,
    rimLight,
    ambient,
    reflectionLight1,
    reflectionLight2,
    reflectionLight3,
    reflectionLight4,
    reflectionLight5,
    reflectionLight6,
    reflectionLight7
  };

  // Call updateReflectionLighting to apply initial parameter values
  updateReflectionLighting();

  /*──────── VOXEL GRID POINTS ───────*/
  voxelPts = new THREE.Points(
    voxelGeom,
    new THREE.PointsMaterial({
      size: params.pointSize,
      vertexColors: true,
      transparent: true,
      opacity: params.opacity,
      depthWrite: false
    })
  );
  scene.add(voxelPts);

    /*──────── SPAT LISTENER HEAD + EARS ───────*/
if (listener) {
    loadHeadModel(listener.position, ({ headGroup, leftEar, rightEar, redGlow, greenGlow }) => {

        // Assign globals properly for main animate() loop
        window.headGroup = headGroup;
        window.leftEar = leftEar;
        window.rightEar = rightEar;
        window.leftLight = headGroup.children.find(obj => obj instanceof THREE.PointLight && obj.color.getHex() === 0xff0000);
        window.rightLight = headGroup.children.find(obj => obj instanceof THREE.PointLight && obj.color.getHex() === 0x00ff00);

        redMat = leftEar.material;
        greenMat = rightEar.material;

        listenerMeshes.push(headGroup, leftEar, rightEar);
        earGlowSprites.push(redGlow, greenGlow);


        // Make listener head semi-transparent
        headGroup.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.transparent = true;
            // child.material.opacity = 0.3; // adjust as needed
            child.material.opacity = params.listenerHeadOpacity;
            child.material.depthWrite = true; // prevent render sorting issues
        }
        });

        // Restore working blinking animation from v02
        let maxGlowOpacity = params.aircraftLightsOpacity;
        let maxEarOpacity = params.aircraftLightsOpacity;

        // Hook slider changes
        Object.defineProperty(params, 'aircraftLightsOpacity', {
        set(val) {
            maxGlowOpacity = val;
            maxEarOpacity = val;
        },
        get() {
            return maxGlowOpacity; // return whatever latest value
        }
        });

        redMat = leftEar.material;
        greenMat = rightEar.material;

        // Add PointLights to simulate glow
        const redLight = new THREE.PointLight(0xff0000, 0, 1.5);
        const greenLight = new THREE.PointLight(0x00ff00, 0, 1.5);
        redLight.position.copy(leftEar.position);
        greenLight.position.copy(rightEar.position);
        headGroup.add(redLight, greenLight);

        // Blinking rates and intensities
        const maxEmissive = 2.5;
        const maxLightIntensity = 1.2;
        const blinkSpeedRed = 1.0;
        const blinkSpeedGreen = 1.15; // slightly out of phase for realism

        listenerMeshes.push(headGroup, leftEar, rightEar);
        earGlowSprites.push(redGlow, greenGlow);

        const blinkLoop = () => {
            const currentTime = performance.now() * 0.001; // Convert to seconds

            const redBlink = Math.max(0, Math.sin(currentTime * blinkSpeedRed * Math.PI));
            const greenBlink = Math.max(0, Math.sin(currentTime * blinkSpeedGreen * Math.PI));

            if (!params.blinkingEnabled) {
                redLight.intensity = 0;
                greenLight.intensity = 0;

                redMat.emissiveIntensity = 0;
                greenMat.emissiveIntensity = 0;

                redMat.opacity = 0;
                greenMat.opacity = 0;

                redGlow.material.opacity = 0;
                greenGlow.material.opacity = 0;
            } else {
                redLight.intensity = redBlink * maxLightIntensity;
                greenLight.intensity = greenBlink * maxLightIntensity;

                redMat.emissiveIntensity = redBlink * maxEmissive;
                greenMat.emissiveIntensity = greenBlink * maxEmissive;

                redMat.opacity = redBlink * maxEarOpacity;
                greenMat.opacity = greenBlink * maxEarOpacity;

                redGlow.material.opacity = redBlink * maxGlowOpacity;
                greenGlow.material.opacity = greenBlink * maxGlowOpacity;
            }

            requestAnimationFrame(blinkLoop);
        };

        blinkLoop();
    });
}
    /*──────── SPAT SOURCES ───────*/
    sourceMeshes = [];
    sourceLabels = [];

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      // Use user-selected color from GUI instead of SPAT color
      const colorData = sourceColorMap[params.sourceColor] || { color: 0xadff2f, metalness: 0.1, roughness: 0.6 };
      const sourceSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 16),
        new THREE.MeshStandardMaterial({ 
          color: colorData.color,
          metalness: params.sourceMetalness,
          roughness: params.sourceRoughness,
          transparent: true,
          opacity: params.sourceOpacity
        })
      );
      sourceSphere.name = `source${i + 1}`;   // ★ so SpatOscBridge can find it
      const threePosForSphere = convertSpatToThree(src.position.x, src.position.y, src.position.z);
      sourceSphere.position.set(threePosForSphere.x, threePosForSphere.y, threePosForSphere.z);
      sourceSphere.quaternion.copy(src.quaternion);

      const labelDiv = document.createElement('div');
      labelDiv.textContent = src.label || `src`;
      labelDiv.style.font = '12px Arial';
      // Guard against undefined labelColor
      const c = src.labelColor || { r: 0.49, g: 1.0, b: 0.0, a: 1.0 };
      labelDiv.style.color = `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${c.a})`;
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, 0.08, 0);
      sourceSphere.add(label);

      scene.add(sourceSphere);

      // Store reference for every source
      sourceMeshes.push(sourceSphere);
      sourceLabels.push(label);
    }

  refreshTable();
  updateColours(0);
  
  // Update available targets after scene rebuild
  updateAvailableTargets();
}

function safeRebuildScene() {
  if (yamahaSpeakerTemplate) {
    rebuildScene();
  } else {
    preloadYamahaSpeakerModel(() => {
      rebuildScene();
    });
  }
}

/*──────── MODE TABLE + HOVER PREVIEW + CLICK SELECTION ─────────────────────────────*/
function attachHover(){
  if(hoverInit) return;
  
  const tbl = document.getElementById('modeTable');
  
  // Click to select mode permanently
  tbl.addEventListener('click', e => {
    const r = e.target.closest('tr[data-nx]');
    if(!r) return;
    
    // Check if NODE SOURCES mode is active
    if (nodeSourcesMode) {
      // Generate resonance ID from row data
      const modes = modeList();
      const modeIndex = modes.findIndex(m => 
        m.nx === +r.dataset.nx && 
        m.ny === +r.dataset.ny && 
        m.nz === +r.dataset.nz
      );
      
      if (modeIndex !== -1) {
        const resonanceId = `r${String(modeIndex + 1).padStart(3, '0')}`;
        onResonanceSelect(resonanceId);
      }
      
      // Continue with normal mode selection so animation persists
    }
    
    // Normal mode selection behavior
    // Check if clicking the same mode to deselect it
    const isCurrentlySelected = r.classList.contains('selected-mode');
    
    // Remove previous selection highlight
    const prevSelected = tbl.querySelector('.selected-mode');
    if(prevSelected) prevSelected.classList.remove('selected-mode');
    
    if (isCurrentlySelected) {
      // Deselect the mode (clear selection)
      selectedMode = null;
      // Clear any temporary hover state
      if(storedMode) {
        storedMode = null;
      }
      // Clear resonance sources from scene when deselecting
      if (nodeSourcesMode) {
        clearResonanceSources();
      }
    } else {
      // Select the new mode
      // Add highlight to clicked row
      r.classList.add('selected-mode');
      
      // Store selected mode
      selectedMode = {
        mx: +r.dataset.nx,
        my: +r.dataset.ny, 
        mz: +r.dataset.nz,
        row: r
      };
      
      // Apply mode immediately
      params.mx = selectedMode.mx;
      params.my = selectedMode.my;
      params.mz = selectedMode.mz;
      
      // Clear any temporary hover state
      if(storedMode) {
        storedMode = null;
      }
    }
  });
  
  // Hover preview (only if no mode is permanently selected)
  tbl.addEventListener('mouseover', e => {
    const r = e.target.closest('tr[data-nx]');
    if(!r) return;
    
    // Only allow hover preview if no mode is selected
    if(selectedMode) return;
    
    if(!storedMode) {
      storedMode = {mx: params.mx, my: params.my, mz: params.mz};
    }
    params.mx = +r.dataset.nx;
    params.my = +r.dataset.ny;
    params.mz = +r.dataset.nz;
  });
  
  // Restore original mode when leaving hover (only if no permanent selection)
  tbl.addEventListener('mouseout', e => {
    const r = e.target.closest('tr[data-nx]');
    const to = e.relatedTarget && e.relatedTarget.closest('tr[data-nx]');
    if(r && to === r) return;
    
    // Only restore if no permanent selection exists
    if(selectedMode) return;
    
    if(storedMode) {
      Object.assign(params, storedMode);
      storedMode = null;
    }
  });
  
  hoverInit = true;
}

function clearModeSelection() {
  if(selectedMode) {
    selectedMode.row.classList.remove('selected-mode');
    selectedMode = null;
  }
  // Clear resonance sources from scene when clearing mode
  if (nodeSourcesMode) {
    clearResonanceSources();
  }
}

function findNearestMode(targetFreq) {
  const modes = modeList();
  let nearest = modes[0];
  let minDiff = Math.abs(modes[0].f - targetFreq);
  
  for (let i = 1; i < modes.length; i++) {
    const diff = Math.abs(modes[i].f - targetFreq);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = modes[i];
    }
  }
  
  return nearest;
}

function onRoomExcite(frequency) {
  console.log(`[RoomExcite] Received frequency: ${frequency} Hz`);
  
  // Find the nearest room mode
  const nearestMode = findNearestMode(frequency);
  console.log(`[RoomExcite] Nearest mode: ${nearestMode.nx}-${nearestMode.ny}-${nearestMode.nz} (${nearestMode.f.toFixed(2)} Hz)`);
  
  // Clear any previous selection 
  const container = document.getElementById('modeTable');
  const prevSelected = container.querySelector('.selected-mode');
  if(prevSelected) prevSelected.classList.remove('selected-mode');
  
  // Find and select the new mode row
  const newRow = container.querySelector(
    `tr[data-nx="${nearestMode.nx}"][data-ny="${nearestMode.ny}"][data-nz="${nearestMode.nz}"]`
  );
  
  if(newRow) {
    // Highlight the row
    newRow.classList.add('selected-mode');
    
    // Update selected mode tracking
    selectedMode = {
      mx: nearestMode.nx,
      my: nearestMode.ny,
      mz: nearestMode.nz,
      row: newRow
    };
    
    // Apply mode immediately to visualization
    params.mx = nearestMode.nx;
    params.my = nearestMode.ny;
    params.mz = nearestMode.nz;
    
    // Clear any temporary hover state
    if(storedMode) {
      storedMode = null;
    }
    
    // Scroll the mode into view if needed
    newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function refreshTable(){
  const container = document.getElementById('modeTable');
  // remember if it was open
  const oldDetails = container.querySelector('details#modeListDetails');
  const wasOpen   = oldDetails?.open;
  
  // Remember current selection
  const currentSelection = selectedMode ? {
    mx: selectedMode.mx,
    my: selectedMode.my,
    mz: selectedMode.mz
  } : null;

// Wrap the table in a <details> so it starts collapsed
  container.innerHTML = `
   <details id="modeListDetails">
   ${wasOpen ? ' open' : ''}
     <summary>
       ROOM MODES
     </summary>
     <table>
       <thead>
         <tr>
           <th>Hz</th>
           <th>mc</th>
           <th>bach</th>
           <th>mode</th>
           <th>fam</th>
           <th>ID</th>
         </tr>
       </thead>
       <tbody>
         ${modeList().map((m, i) => {
           const mc = freq2mc(m.f);
           const resonanceId = `r${String(i + 1).padStart(3, '0')}`;
           const isSelected = currentSelection && 
             m.nx === currentSelection.mx && 
             m.ny === currentSelection.my && 
             m.nz === currentSelection.mz;
           return `
             <tr data-nx="${m.nx}" data-ny="${m.ny}" data-nz="${m.nz}"${isSelected ? ' class="selected-mode"' : ''}>
               <td>${m.f.toFixed(2)}</td>
               <td>${mc.toFixed(1)}</td>
               <td>${mc2bach(mc)}</td>
               <td>${m.nx}-${m.ny}-${m.nz}</td>
               <td>${fam(m.nx,m.ny,m.nz)}</td>
               <td>${resonanceId}</td>
             </tr>`;
         }).join('')}
       </tbody>
     </table>
   </details>`;

 // attach hover handlers to the newly created <table>
 attachHover();
 
 // Restore selection if it existed
 if(currentSelection) {
   const newSelectedRow = container.querySelector(
     `tr[data-nx="${currentSelection.mx}"][data-ny="${currentSelection.my}"][data-nz="${currentSelection.mz}"]`
   );
   if(newSelectedRow) {
     selectedMode = {
       mx: currentSelection.mx,
       my: currentSelection.my,
       mz: currentSelection.mz,
       row: newSelectedRow
     };
   }
 }
}

/*──────── COLOUR UPDATE ─────────────────────────────────────*/
function updateColours(t) {
  // Skip animation if disabled
  if (!params.voxelAnimationEnabled) return;

  const {
    Lx, Ly, Lz,
    mx, my, mz,
    freq, hueBlue,
    gamma, Lmin, Lmax
  } = params;

  const p = voxelGeom.getAttribute('position');
  const c = colourAttr;
  const ω = 2 * Math.PI * freq;

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getY(i);
    const y = p.getZ(i);

    const A = Math.cos(mx * Math.PI * x / Lx) *
              Math.cos(my * Math.PI * y / Ly) *
              Math.cos(mz * Math.PI * z / Lz) *
              Math.cos(ω * t);

    const mag = Math.pow(Math.abs(A), gamma);

    // Clamp lightness to prevent near-zero brightness
    const lightness = Math.max(0.2, Lmin + (Lmax - Lmin) * mag);

    new THREE.Color()
      .setHSL(hueBlue * (1 - mag), 1, lightness)
      .toArray(c.array, i * 3);
  }

  c.needsUpdate = true;
}

/*──────── RENDER LOOP ───────────────────────────────────────*/
function animate(tms) {
  requestAnimationFrame(animate);

  if (oscBridge.needsRender()) {
    updateCameraTracking();
    if (params.cameraMode === 'manual' || params.cameraMode === 'orbit') controls.update();
    else if (params.cameraMode === 'attached') {
      // Controls should be disabled in attached mode
      controls.enabled = false;
    }
    
    renderStereo(scene, camera);
    labelR.render(scene, camera);
    
    // Note: Projector rendering now handled by separate animation loop to prevent freezing
    
    return;
  }

  // Remove conflicting blinking - local blinkLoop() handles it
  updateColours(tms * 0.001);

  voxelPts.material.size = params.pointSize;
  voxelPts.material.opacity = params.opacity;

  // Update visual table displays if visible (data tables always update in background)
  if (entityTableVisible) updateEntityTableDisplay();
  if (controllerTableVisible) updateControllerTableDisplay();

  updateCameraTracking();
  if (params.cameraMode === 'manual' || params.cameraMode === 'orbit') controls.update();
  else if (params.cameraMode === 'attached') {
    // Controls should be disabled in attached mode
    controls.enabled = false;
  }
  
  renderStereo(scene, camera);
  labelR.render(scene, camera);
  
  // Note: Projector rendering now handled by separate animation loop to prevent freezing
}

/*──────────────────────────────────────────────────────────────
  dat.GUI
──────────────────────────────────────────────────────────────*/

const gui = new GUI({ width: 260 });
const tip = (c, t) => (c.__li || c.domElement).title = t;

/*──────── MOBILE CONNECTION QR CODE ───────*/
const qrParams = {
  showQR: false,
  ngrokUrl: 'Detecting...',
  generateQR: () => generateQRCode()
};

// Expose to global scope for OSC bridge access
window.qrParams = qrParams;

const gQR = gui.addFolder('MOBILE CONTROL');
// Expose to global scope for OSC bridge access
window.gQR = gQR;
tip(
  gQR.add(qrParams, 'showQR').name('Show QR Code'),
  'Toggle QR code display for mobile device connection'
);
tip(
  gQR.add(qrParams, 'ngrokUrl').name('Tunnel URL').onChange(() => generateQRCode()),
  'Current ngrok tunnel URL for mobile connections'
);
const refreshQR = gQR.add(qrParams, 'generateQR').name('REFRESH QR');
tip(
  refreshQR,
  'Manually refresh the QR code with current settings'
);

// QR Code display element
const qrContainer = document.createElement('div');
qrContainer.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0,0,0,0.9);
  padding: 20px;
  z-index: 1000;
  display: none;
  border: 1px solid #C4E538;
`;
document.body.appendChild(qrContainer);

// QR Code display element for projector window
let projectorQrContainer = null;

// Auto-detect ngrok URL and generate QR code
async function detectNgrokUrl() {
  try {
    const response = await fetch('http://127.0.0.1:4040/api/tunnels');
    const data = await response.json();
    if (data.tunnels && data.tunnels.length > 0) {
      const url = data.tunnels[0].public_url.replace('https://', '');
      qrParams.ngrokUrl = url;
      console.log(`[QR] Detected ngrok URL: ${url}`);
      generateQRCode();
      return url;
    }
  } catch (err) {
    // CORS error is expected - ngrok API doesn't allow browser access
    // This is normal behavior, not an actual error
    // console.log('[QR] Auto-detection blocked by CORS (normal behavior)');
    // Keep the manually set URL if it's not the default
    if (qrParams.ngrokUrl === 'Detecting...') {
      qrParams.ngrokUrl = '192.168.1.192 (Local)';
    }
  }
  return null;
}

// Load QR code library  
function loadQRLibrary() {
  // console.log('[QR] Loading QRious library...');
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
  script.onload = () => {
    // console.log('[QR] QRious library loaded successfully, window.QRious:', !!window.QRious);
    if (qrParams.showQR) generateQRCode();
  };
  script.onerror = () => {
    console.error('[QR] Failed to load QRious library');
  };
  document.head.appendChild(script);
}

// Generate QR code with connection settings
function generateQRCode() {
  const host = qrParams.ngrokUrl.replace(' (Local)', '');
  const isNgrok = !host.includes('192.168');
  const port = isNgrok ? '443' : '8081';
  const sslPort = '443';
  
  const connectionConfig = {
    host: host,
    port: port,
    sslPort: sslPort
  };
  
  // Create a deep link that will work with PWA
  const configHash = btoa(JSON.stringify(connectionConfig));
  const qrData = `https://lg-3d-room-v01.vercel.app/?pwa=true&config=${configHash}`;
  
  console.log('[QR] Connection config:', connectionConfig);
  console.log('[QR] QR code URL:', qrData);
  
  // Generate content for both main and projector containers
  const qrContent = `
    <div style="color: #C4E538; text-align: center; font-family: monospace;">
      <h3 style="margin-top: 0;">MOBILE CONTROL</h3>
      <div id="qrcode" style="background: white; padding: 10px; margin: 10px 0;"></div>
      <div style="font-size: 12px;">
        <div style="margin-top: 8px; font-size: 9px; line-height: 1.2;">
          In <strong><em>ModeBloom</em></strong> — Scan this QR code <br/>to automatically connect and<br/>control audio source positions.<br/>
          Or manually type these values in:
        </div>
        <div style="margin-top: 8px;">Host IP Address:<br/><strong>${host}</strong></div>
        <div>Port: <strong>${port}</strong> / SSL: <strong>${sslPort}</strong></div>
      </div>
    </div>
  `;
  
  // Identical content for projector display (same as main)
  const projectorQrContent = qrContent.replace('id="qrcode"', 'id="projector-qrcode"');
  
  // Update main container
  qrContainer.innerHTML = qrContent;
  
  // Update projector container if it exists and both projector and mobile control are enabled
  if (projectorQrContainer && params.projectorWindowEnabled && qrParams.showQR) {
    projectorQrContainer.innerHTML = projectorQrContent;
  }
  
  // Generate QR code using QRious library for main container
  const qrElement = document.getElementById('qrcode');
  
  if (window.QRious) {
    console.log('[QR] Generating QR code with data:', qrData);
    qrElement.innerHTML = '<canvas id="qr-canvas" style="background: white;"></canvas>';
    try {
      const qr = new QRious({
        element: document.getElementById('qr-canvas'),
        value: qrData,
        size: 200,
        background: 'white',
        foreground: 'black'
      });
      console.log('[QR] QR code generated successfully');
      
      // Generate QR code for projector if container exists
      if (projectorQrContainer && params.projectorWindowEnabled && qrParams.showQR) {
        const projectorQrElement = projectorWindow.document.getElementById('projector-qrcode');
        if (projectorQrElement) {
          projectorQrElement.innerHTML = '<canvas id="projector-qr-canvas" style="background: white;"></canvas>';
          try {
            // Load QRious library in projector window if not already loaded
            if (!projectorWindow.QRious) {
              const projectorScript = projectorWindow.document.createElement('script');
              projectorScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
              projectorScript.onload = () => {
                const projectorQr = new projectorWindow.QRious({
                  element: projectorWindow.document.getElementById('projector-qr-canvas'),
                  value: qrData,
                  size: 200,
                  background: 'white',
                  foreground: 'black'
                });
                console.log('[QR] Projector QR code generated successfully');
              };
              projectorWindow.document.head.appendChild(projectorScript);
            } else {
              const projectorQr = new projectorWindow.QRious({
                element: projectorWindow.document.getElementById('projector-qr-canvas'),
                value: qrData,
                size: 200,
                background: 'white',
                foreground: 'black'
              });
              console.log('[QR] Projector QR code generated successfully');
            }
          } catch (err) {
            console.error('[QR] Error generating projector QR code:', err);
            projectorQrElement.innerHTML = '<div style="color: black; padding: 20px;">QR Generation Error</div>';
          }
        }
      }
    } catch (err) {
      console.error('[QR] Error generating QR code:', err);
      qrElement.innerHTML = '<div style="color: black; padding: 20px;">QR Generation Error</div>';
    }
  } else {
    console.log('[QR] QRious library not available, loading...');
    qrElement.innerHTML = '<div style="color: black; padding: 20px;">QR Library Loading...</div>';
    if (!document.querySelector('script[src*="qrious"]')) {
      loadQRLibrary();
    }
  }
}

// Expose generateQRCode to global scope for OSC bridge access
window.generateQRCode = generateQRCode;

// Toggle QR code display
Object.defineProperty(qrParams, 'showQR', {
  get() { return qrContainer.style.display === 'block'; },
  set(value) {
    qrContainer.style.display = value ? 'block' : 'none';
    
    // Also toggle projector QR display if projector window is enabled
    if (projectorQrContainer && params.projectorWindowEnabled) {
      projectorQrContainer.style.display = value ? 'block' : 'none';
    }
    
    if (value) {
      generateQRCode();
    }
  }
});

// Load QR library and detect ngrok URL
loadQRLibrary();
detectNgrokUrl();

// Force GUI refresh
setTimeout(() => {
  console.log('[QR] Current ngrok URL:', qrParams.ngrokUrl);
  // Trigger GUI refresh by updating the controller
  gQR.__controllers.forEach(controller => {
    if (controller.property === 'ngrokUrl') {
      controller.updateDisplay();
    }
  });
}, 1000);

/*──────── ROOM DIMENSIONS (m) ───────*/
const gRoom = gui.addFolder('ROOM DIMENSIONS (m)');

tip(
  gRoom.add(params, 'Lx', 3, 60, 0.1)
       .name('x (length)')
       .onFinishChange(() => { rebuildScene(); schroGUI(); updateOrbitRadiusRange(); }),
  'room length (x) in meters'
);

tip(
  gRoom.add(params, 'Ly', 2.5, 40, 0.1)
       .name('y (width)')
       .onFinishChange(() => { rebuildScene(); schroGUI(); updateOrbitRadiusRange(); }),
  'room width (y) in meters'
);

tip(
  gRoom.add(params, 'Lz', 2.3, 25, 0.1)
       .name('z (height)')
       .onFinishChange(() => { rebuildScene(); schroGUI(); updateOrbitRadiusRange(); }),
  'room height (z) in meters'
);

tip(
  gRoom.add(params, 'T60', 0.2, 2.5, 0.05)
       .name('RT60')
       .onFinishChange(() => { refreshTable(); schroGUI(); }),
  'reverb decay time in seconds (i.e., time for the average energy to drop by 60 dB)'
);

/*──────── MODE SELECTOR ───────*/
const gMode = gui.addFolder('MODE SELECTOR (orders 0–16)');

tip(gMode.add(params, 'mx', 0, 16, 1),
  'number of half-wavelengths (pressure antinode pairs) that fit along the room’s X-length, e.g., 0 = uniform, 1 = one half-wave (1st axial standing wave; half-wave fits once, high at one wall, low at the other), 2 = two half-waves, etc...'
);

tip(gMode.add(params, 'my', 0, 16, 1),
  'number of half-wavelengths that fit along the room’s Y-width. Higher value → more nodal planes across Y.'
);

tip(gMode.add(params, 'mz', 0, 16, 1),
  'number of half-wavelengths that fit along the room’s Z-height. Controls vertical nodal layers: 0 = uniform pressure with height, 1 = one layer of nodes/antinodes, 2 = two layers, … up to 16.'
);

/*──────── ANIMATION + VOXEL GRID ───────*/
const gField = gui.addFolder('ANIMATION + VOXEL GRID');

tip(
  gField.add(params, 'voxelAnimationEnabled')
        .name('enable animation'),
  'Toggle voxel field animation on/off. Disabling animation can significantly improve performance when working with large room dimensions or high voxel densities. When disabled, the field displays a static snapshot of the current mode.'
);

tip(
  gField.add(params, 'freq', 0.05, 2, 0.05)
        .name('pulse Hz'),
  'Breathing rate: A slow-motion depiction of the acoustic pressure wave front at a chosen mode order cycling through one full period of pressure change. This shows the compression + rarefaction of air, letting you see the otherwise invisible time dimension of the standing-wave field. In reality, this would happnen at the speed of sound (~343 meters/second), but here you can slow it down and see this movement on a very slow scale (0.5-2 Hz).'
);

tip(
  gField.add(params, 'dx', 0.02, 1, 0.01)
        .name('grid dx')
        .onFinishChange(() => rebuildScene()),
  'voxel spacing in meters'
);

tip(
  gField.add(params, 'pointSize', 0.005, 0.05, 0.005),
  'Point diameter in meters: size of the grid points chosen in grid dx'
);

tip(
  gField.add(params, 'opacity', 0.0, 1.0, 0.005)
        .name('voxel opacity'),
  'Voxel field transparency: 0 = fully opaque, 1 = fully transparent. Lower values let the listener or other structures shine through.'
);

gField.add(params, 'showRulers')
      .name('axis rulers')
      .onChange(val => {
        rulerGroups.forEach(g => g.visible = val);
      });

gField.add(params, 'showRulerLabels')
      .name('axis labels')
      .onChange(val => {
        rulerGroups.forEach(group => {
          group.children.forEach(child => {
            if (child instanceof CSS2DObject) {
              child.visible = val;
            }
          });
        });
      });

/*──────── HEAT MAP COLORS ───────*/
const gCol = gui.addFolder('HEAT MAP COLORS');

const colTips = {
  hueBlue: 'Base tint for the entire field (0 = green, 1 = violet). Note: brightness, not hue, reflects pressure magnitude (nodes = dark, antinodes = bright).',
  gamma:   'Gamma for magnitude-to-colour curve: Values < 1 brighten low-magnitude regions (nodes). 1 is linear. Values > 1 darken lows and push only the strongest antinodes up to full brightness.',
  Lmin:    'Darkest lightness L* of any point (0 = black).',
  Lmax:    'Brightest lightness L* of antinode points (1 = white).'
};

['hueBlue', 'gamma', 'Lmin', 'Lmax'].forEach(k => {
  const min = (k === 'hueBlue') ? 0.5 : 0;
  const max = (k === 'gamma')   ? 2   : 1;
  tip(gCol.add(params, k, min, max, 0.01), colTips[k]);
});

/*──────── SPAT VISIBILITY ───────*/
const gVis = gui.addFolder('SPAT VISIBILITY');

tip(
  gVis.add(params, 'speakerOpacity', 0.0, 1.0, 0.01)
      .name('speaker opacity')
      .onChange(val => {
        speakerMeshes.forEach(model => {

        model.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = val;
                child.material.needsUpdate = true;
            }

            if (child.isCSS2DObject) {
                child.element.style.opacity = val;
            }
            });
        });
      }),
  'Opacity of speaker meshes: 1 = fully visible, 0 = completely transparent. Useful for visually decluttering the scene when the speaker locations are known but not important for visualization.'
);

tip(
  gVis.add(params, 'sourceOpacity', 0, 1, 0.01).name('source opacity')
    .onChange(val => {
      // Update 3D source mesh opacity
      sourceMeshes.forEach(mesh => {
        if (mesh.material) mesh.material.opacity = val;
      });

      // Update CSS2D label visibility
      sourceLabels.forEach(label => {
        if (label.element) label.element.style.opacity = val;
      });
    }),
  'Controls the visibility of both source spheres and their labels in the scene. Useful for focusing attention on speaker layout, modal field, or listener position.'
);

tip(
  gVis.add(params, 'sourceColor', Object.keys(sourceColorMap))
    .name('source color')
    .onChange(() => {
      // Update sliders to match preset values
      const colorData = sourceColorMap[params.sourceColor] || { color: 0xadff2f, metalness: 0.1, roughness: 0.6 };
      params.sourceMetalness = colorData.metalness;
      params.sourceRoughness = colorData.roughness;
      updateSourceColors();
    }),
  'Color of audio source spheres. White/cyan/blue work best for anaglyph 3D viewing with red/cyan glasses.'
);

tip(
  gVis.add(params, 'sourceMetalness', 0.0, 1.0, 0.01)
    .name('metalness')
    .onChange(() => {
      updateSourceMaterial();
    }),
  'Material metalness: 0 = non-metallic (matte), 1 = fully metallic (mirror-like). High values create reflective surfaces.'
);

tip(
  gVis.add(params, 'sourceRoughness', 0.0, 1.0, 0.01)
    .name('roughness')
    .onChange(() => {
      updateSourceMaterial();
    }),
  'Surface roughness: 0 = perfect mirror, 1 = completely rough. Low values create sharp reflections.'
);

// Lighting controls for reflections
const gLighting = gVis.addFolder('REFLECTION LIGHTING');

tip(
  gLighting.add(params, 'reflectionLightingEnabled')
    .name('reflection lights')
    .onChange(() => {
      updateReflectionLighting();
    }),
  'Enable additional point lights positioned around the scene to create bright reflection highlights on metallic sources.'
);

tip(
  gLighting.add(params, 'reflectionLightIntensity', 0.0, 10.0, 0.1)
    .name('reflection intensity')
    .onChange(() => {
      updateReflectionLighting();
    }),
  'Intensity of the reflection point lights. Higher values create brighter, more prominent reflections on metallic surfaces. Use 5.0+ for dramatic "blinding light" effects.'
);

tip(
  gLighting.add(params, 'ambientLightIntensity', 0.0, 0.5, 0.01)
    .name('ambient light')
    .onChange(() => {
      updateReflectionLighting();
    }),
  'Base ambient lighting that affects all surfaces. Higher values brighten the entire scene but reduce contrast on metallic reflections.'
);

tip(
  gLighting.add(params, 'keyLightIntensity', 0.0, 2.0, 0.1)
    .name('key light')
    .onChange(() => {
      updateReflectionLighting();
    }),
  'Main directional light intensity. Controls the primary lighting that creates shadows and highlights on all objects.'
);

tip(
  gVis.add(params, 'listenerHeadOpacity', 0.0, 1.0, 0.01)
      .name('head opacity')
      .onChange(val => {
        listenerMeshes.forEach(obj => {
          if (obj.traverse) {
            obj.traverse(child => {
              if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = val;
                child.material.needsUpdate = true;
              }
            });
          }
        });
      }),
  'Controls the visibility of the listener’s head mesh: lower values make the head semi-transparent or invisible, useful for seeing through it into sources or field data.'
);

tip(
  gVis.add(params, 'aircraftLightsOpacity', 0.0, 1.5, 0.01)
      .name('lights opacity'),
  'Maximum opacity of blinking aircraft-style orientation lights on the listener’s ears. 1 = fully visible at peak blink, lower values make the lights more subtle. Values above 1 can make the glow halos appear even stronger.'
);

tip(
  gVis.add(params, 'blinkingEnabled')
      .name('blinking on/off'),
  'Enable or disable the red/green blinking lights on the listener’s ears. These lights simulate aircraft navigation markers to indicate listener orientation. When disabled, both the light intensity and emissive glow are turned off completely.'
);

/*──────── ENVIRONMENT ───────*/
const gEnv = gui.addFolder('ENVIRONMENT');

tip(
  gEnv.add(params, 'environmentEnabled')
      .name('enable skybox')
      .onChange(val => {
        createSkyBox();
      }),
  'Enable or disable the procedural skybox environment. When enabled, adds a gradient sky sphere around the scene for atmospheric depth.'
);

// Skybox is now cube texture only - no type selection needed

tip(
  gEnv.add(params, 'skyboxEnvironment', Object.keys(skyboxOptions))
      .name('environment')
      .onChange(val => {
        createSkyBox();
      }),
  'Select skybox environment from the penguins-skybox-pack with 46 high-quality environments.'
);

tip(
  gEnv.add(params, 'skyboxIntensity', 0.0, 3.0, 0.05)
      .name('intensity')
      .onChange(val => {
        updateSkyBox();
      }),
  'Brightness/luminosity multiplier for skyboxes. For cube textures, this uses renderer exposure.'
);

tip(
  gEnv.add(params, 'skyboxOpacity', 0.0, 1.0, 0.05)
      .name('opacity')
      .onChange(val => {
        updateSkyBox();
      }),
  'Opacity/transparency control for skyboxes. (Work in progress for cube textures)'
);

// Procedural skybox controls removed - cube texture only

/*──────── 3D STEREOSCOPIC ───────*/
const gStereo = gui.addFolder('3D STEREOSCOPIC');

tip(
  gStereo.add(params, 'stereoMode', ['none', 'anaglyph', 'parallax'])
      .name('stereo mode'),
  'Select 3D stereoscopic viewing mode: none (standard), anaglyph (red/cyan glasses), or parallax barrier (glasses-free 3D display).'
);

tip(
  gStereo.add(params, 'eyeSeparation', 0.010, 0.200, 0.001)
      .name('eye separation')
      .onChange(val => {
        updateStereoEffects();
      }),
  'Distance between the virtual eyes in meters. Average human IPD is 0.064m. Use 0.030-0.064 for close viewing, 0.064-0.120 for medium distance, 0.120-0.200 for large/distant screens.'
);

tip(
  gStereo.add(params, 'focalDistance', 1.0, 100.0, 0.1)
      .name('focal distance')
      .onChange(val => {
        updateStereoEffects();
      }),
  'Distance to the convergence point where objects appear on the screen plane. Objects closer pop out, farther appear recessed. Use 20-50 for close viewing, 50-100 for large/distant screens.'
);

/*──────── CAMERA TRACKING ───────*/
const gCamera = gui.addFolder('CAMERA TRACKING');

tip(
  gCamera.add(params, 'cameraMode', ['manual', 'orbit', 'attached', 'tracking'])
      .name('camera mode')
      .onChange(switchCameraMode),
  'Select camera movement mode: manual (mouse control), orbit (automated rotation), attached (follow objects), tracking (look at targets).'
);

tip(
  gCamera.add(params, 'orbitRadius', 1.0, getDynamicOrbitMax(), 0.1)
      .name('orbit radius'),
  'Distance from scene center for orbit mode. Larger values create wider camera circles. Maximum adjusts with room size.'
);

tip(
  gCamera.add(params, 'orbitSpeed', -3.0, 3.0, 0.1)
      .name('orbit speed'),
  'Orbit rotation speed. Positive values = clockwise, negative = counter-clockwise. Higher absolute values = faster rotation.'
);

tip(
  gCamera.add(params, 'orbitHeight', -7.0, 7.0, 0.1)
      .name('orbit height'),
  'Camera height (Y-axis position) during orbit mode. Negative values view from below. Adjust to change vertical viewing angle.'
);

tip(
  gCamera.add(params, 'orbitAnimating')
      .name('start/stop orbit')
      .onChange(toggleOrbitAnimation),
  'Start or stop orbit animation. Only active when camera mode is set to orbit.'
);

// Attachment mode controls
tip(
  gCamera.add(params, 'attachTarget', ['none'])
      .name('attach to')
      .onChange(val => {
        cameraTracker.currentAttachTargetId = val;
        if (params.cameraMode === 'attached') {
          cameraTracker.attachedObject = cameraTracker.resolveTarget(val);
        }
      }),
  'Select object to attach camera to. Camera will follow this object with the specified offset.'
);

tip(
  gCamera.add(params, 'lookAtTarget', ['none'])
      .name('look at')
      .onChange(val => {
        cameraTracker.currentLookAtTargetId = val;
        // Update look-at target for all camera modes
        if (params.cameraMode === 'attached') {
          cameraTracker.lookAtObject = cameraTracker.resolveTarget(val);
        } else if (params.cameraMode === 'tracking') {
          cameraTracker.trackingTarget = cameraTracker.resolveTarget(val);
        }
        // Initialize tracking interpolation for smooth transitions
        if (val !== 'none' && params.trackingSmooth) {
          const target = cameraTracker.resolveTarget(val);
          if (target) {
            cameraTracker.trackingInterpolatedLookAt = target.position.clone();
          }
        }
      }),
  'Select object for camera to look at. Works in all camera modes - orbit+look-at, attached+look-at, or pure tracking mode.'
);

tip(
  gCamera.add(params, 'attachOffsetX', -5.0, 5.0, 0.1)
      .name('offset X'),
  'Camera offset from attached object in X direction (left/right).'
);

tip(
  gCamera.add(params, 'attachOffsetY', -5.0, 5.0, 0.1)
      .name('offset Y'),
  'Camera offset from attached object in Y direction (up/down).'
);

tip(
  gCamera.add(params, 'attachOffsetZ', -5.0, 5.0, 0.1)
      .name('offset Z'),
  'Camera offset from attached object in Z direction (forward/backward).'
);

// Tracking mode controls
tip(
  gCamera.add(params, 'trackingSmooth')
      .name('smooth tracking'),
  'Enable smooth interpolation when tracking targets. Reduces camera shake from fast-moving objects.'
);

tip(
  gCamera.add(params, 'trackingInterpolation', 0.01, 0.5, 0.01)
      .name('tracking speed'),
  'Speed of smooth tracking interpolation. Lower values = smoother but slower tracking. Higher values = faster but more responsive.'
);

// Camera presets
tip(
  gCamera.add(params, 'cameraPreset', ['none', 'overview', 'follow_listener', 'source_focus', 'close_attach'])
      .name('camera presets')
      .onChange(applyCameraPreset),
  'Quick camera setups for common scenarios: Overview (orbit scene), Follow Listener (track head), Source Focus (orbit+track), Close Attach (attach to source).'
);

/*──────── PROJECTOR SCREEN ───────*/
const gProjector = gui.addFolder('PROJECTOR SCREEN');

tip(
  gProjector.add(params, 'projectorWindowEnabled')
      .name('projector window')
      .onChange(toggleProjectorWindow),
  'Open clean projector window without GUI controls for presentations. Drag to second monitor and maximize for projection.'
);

tip(
  gProjector.add(params, 'projectorWidth', 800, 3840, 1)
      .name('projector width'),
  'Width of projector window in pixels. Common values: 1920 (1080p), 2560 (1440p), 3840 (4K).'
);

tip(
  gProjector.add(params, 'projectorHeight', 600, 2160, 1)
      .name('projector height'),
  'Height of projector window in pixels. Common values: 1080 (1080p), 1440 (1440p), 2160 (4K).'
);

tip(
  gProjector.add(params, 'projectorBackground', ['black', 'white'])
      .name('projector background'),
  'Background color for projector window. Black recommended for most presentations.'
);

tip(
  gProjector.add(params, 'projectorShowInfo')
      .name('show info text')
      .onChange(updateProjectorInfo),
  'Toggle info text in projector window. Turn off for clean presentations.'
);

/*──────── OSC LOG ───────*/
const gOsc = gui.addFolder('OSC LOG');

let oscLogBox;

tip(
  gOsc.add(params, 'oscLogEnabled')
      .name('Show Messages')
      .onChange(val => {
        if (oscLogBox) {
          oscLogBox.style.display = val ? 'block' : 'none';
        }
      }),
  'Toggle display of incoming OSC messages in the log box below. WARNING: Use for debugging purposes only. Leave OFF in production mode. This will inevitably slow down the animation rate of the scene!'
);

// Create log box
oscLogBox = document.createElement("textarea");
Object.assign(oscLogBox.style, {
  width:  "100%",
  height: "50px",
  background: "#000",
  color:      "#0f0",
  font:       "11px/1.3 monospace",
  resize:     "none",
  display:    params.oscLogEnabled ? "block" : "none"
});

gOsc.domElement.appendChild(oscLogBox);

/*──────────────────────────────────────────────────────────────
  OSC bridge: live updates + GUI log
──────────────────────────────────────────────────────────────*/

const oscBridge = new SpatOscBridge({
  listener,
  sources,
  speakers,
  scene,
  wsUrl: "ws://127.0.0.1:8081",
  gui: gui,
  logBox: oscLogBox,
  params: params,

  onSpeakerNumber: createSpeakerRing,
  onSourceNumber: createSourceRing,
  onListenerAED: onListenerAED,
  onListenerEarHeight: onListenerEarHeight,
  onListenerXYZ: onListenerXYZ,
  onSpeakerAzimuthOffset: onSpeakerAzimuthOffset,
  onSpeakersAzimuthList: onSpeakersAzimuthList,
  onSpeakersAEDList: onSpeakersAEDList,
  onSpeakersXYZList: onSpeakersXYZList,
  updateSpeakerLabelText: updateSpeakerLabelText,
  updateSourceLabelText: updateSourceLabelText,
  onSourceAzimuthOffset: onSourceAzimuthOffset,
  onRoomExcite: onRoomExcite,
});

window.oscBridge = oscBridge;

// Export dynamic table functions for OSC bridge access
window.entityPositions = entityPositions;
window.activeControllers = activeControllers;
window.updateEntityPosition = updateEntityPosition;
window.getEntityPosition = getEntityPosition;
window.registerController = registerController;
window.bindControllerToSource = bindControllerToSource;
window.unbindControllerFromSource = unbindControllerFromSource;

let fsCtrl = null;

function schroGUI () {
  const value = fs().toFixed(1);

  if (!fsCtrl) {
    fsCtrl = gui.add({ fs: value }, 'fs')
                .name('Schroeder (Hz)');
    fsCtrl.domElement.style.pointerEvents = 'none';
    tip(
      fsCtrl,
      'Schroeder transition frequency (ƒs, in Hz): Below ƒs, the room‘s response is dominated by discrete standing waves. Above ƒs, modal overlap is high and the field behaves statistically, similar to the late‐reverberation tail in a room model. Above ƒs the sound field behaves statistically.'
    );
    return;
  }

  fsCtrl.setValue(value);
}

const lim = gui.add(params, 'schroMult', 0.8, 2, 0.05)
                .name('mode limit')
                .onChange(refreshTable);

tip(
  lim,
  'Upper cut-off factor for mode generation: max frequency = ƒs × mode limit. Lower this value to shorten the list of frequencies. Raise to include higher-order modes. This is equivalent to exciting the room (or any resonant body, actually) with more high-frequency energy. Dense, stiff materials such as metal readily support these upper modes, while softer, highly dampened materials suppress them.'
);

/*──────── reset-button helper & registration ───────────────*/
function resetParams () {
  Object.assign(params, defaults);

  gui.__controllers.forEach(c => c.updateDisplay());
  Object.values(gui.__folders)
        .forEach(f => f.__controllers.forEach(c => c.updateDisplay()));

  preloadYamahaSpeakerModel(() => {
    rebuildScene();
  });
  refreshTable();
  schroGUI();
  speakerMeshes = []; // clear old refs

}

const reset = gui.add({ 'RESET': resetParams }, 'RESET');
reset.domElement.classList.add('download-btn');
reset.__li.classList.add('reset-row');
tip(reset, 'Restore all parameters to their original default values.');

const clearMode = gui.add({ 'CLEAR MODE': clearModeSelection }, 'CLEAR MODE');
clearMode.domElement.classList.add('download-btn');
clearMode.__li.classList.add('reset-row');
tip(clearMode, 'Clear the selected mode and return to hover preview behavior.');

// Store button references for GUI visibility management
const guiButtons = { reset, clearMode, refreshQR };
// console.log('[GUI] Button references:', guiButtons);

schroGUI();

// all sliders immediately take effect when the page loads
gVis.__controllers.forEach(c => {
  if (c.__onChange) c.__onChange(c.getValue());
});

gui.close();

// GUI Button Visibility Management
let guiState = {
  mainOpen: false,
  mobileControlOpen: false
};

function updateButtonVisibility() {
  // Show regular buttons (reset, clearMode) when main GUI is open
  const regularButtonsVisible = guiState.mainOpen;
  [guiButtons.reset, guiButtons.clearMode].forEach(button => {
    if (button && button.__li) {
      button.__li.style.display = regularButtonsVisible ? 'block' : 'none';
    }
  });

  // Show refresh QR button only when main GUI is open AND mobile control folder is open
  const qrButtonVisible = guiState.mainOpen && guiState.mobileControlOpen;
  // console.log('[GUI] Button visibility - Main:', guiState.mainOpen, 'Mobile:', guiState.mobileControlOpen, 'QR visible:', qrButtonVisible);
  
  if (guiButtons.refreshQR && guiButtons.refreshQR.__li) {
    guiButtons.refreshQR.__li.style.display = qrButtonVisible ? 'block' : 'none';
  }
}

// Initially hide all buttons since GUI starts closed
updateButtonVisibility();

// Monitor GUI folder open/close state
function setupGuiVisibilityMonitoring() {
  // Monitor main GUI folder
  const guiTitle = gui.domElement.querySelector('.close-button');
  if (guiTitle) {
    guiTitle.addEventListener('click', () => {
      setTimeout(() => {
        guiState.mainOpen = !gui.closed;
        // console.log('[GUI] Main GUI state:', guiState.mainOpen);
        updateButtonVisibility();
      }, 10);
    });
  }

  // Monitor Mobile Control subfolder (gQR)
  // console.log('[GUI] Looking for Mobile Control folder:', gQR);
  // console.log('[GUI] Mobile Control DOM element:', gQR.domElement);
  
  const mobileControlTitle = gQR.domElement.querySelector('.close-button');
  // console.log('[GUI] Mobile Control close button found:', !!mobileControlTitle);
  
  if (mobileControlTitle) {
    // Initialize mobile control state based on current state
    guiState.mobileControlOpen = !gQR.closed;
    // console.log('[GUI] Initial Mobile Control state:', guiState.mobileControlOpen);
    
    mobileControlTitle.addEventListener('click', () => {
      // console.log('[GUI] Mobile Control clicked!');
      setTimeout(() => {
        guiState.mobileControlOpen = !gQR.closed;
        // console.log('[GUI] Mobile Control state:', guiState.mobileControlOpen);
        updateButtonVisibility();
      }, 10);
    });
  } else {
    // Try alternative selectors
    const folderTitle = gQR.domElement.querySelector('.title');
    // console.log('[GUI] Alternative selector - folder title:', !!folderTitle);
    if (folderTitle) {
      folderTitle.addEventListener('click', () => {
        // console.log('[GUI] Mobile Control title clicked!');
        setTimeout(() => {
          guiState.mobileControlOpen = !gQR.closed;
          // console.log('[GUI] Mobile Control state:', guiState.mobileControlOpen);
          updateButtonVisibility();
        }, 10);
      });
    }
  }
  
  // Initial state update
  updateButtonVisibility();
}

// Set up monitoring after DOM is ready
setTimeout(setupGuiVisibilityMonitoring, 100);

/*──────────────────────────────────────────────────────────────
  HAMBURGER MENU FUNCTIONALITY
──────────────────────────────────────────────────────────────*/

function setupHamburgerMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const horizontalMenu = document.getElementById('horizontalMenu');
  
  if (hamburgerBtn && horizontalMenu) {
    let isMenuOpen = false;
    
    hamburgerBtn.addEventListener('click', () => {
      isMenuOpen = !isMenuOpen;
      
      // Toggle hamburger animation
      hamburgerBtn.classList.toggle('active', isMenuOpen);
      
      // Toggle menu visibility
      horizontalMenu.classList.toggle('expanded', isMenuOpen);
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburgerBtn.contains(e.target) && !horizontalMenu.contains(e.target)) {
        if (isMenuOpen) {
          isMenuOpen = false;
          hamburgerBtn.classList.remove('active');
          horizontalMenu.classList.remove('expanded');
        }
      }
    });
  }
}

// Initialize hamburger menu
setTimeout(setupHamburgerMenu, 100);

// Debug: Force QR button visible for testing
// setTimeout(() => {
//   console.log('[GUI] Debug - Forcing QR button visible');
//   if (guiButtons.refreshQR && guiButtons.refreshQR.__li) {
//     guiButtons.refreshQR.__li.style.display = 'block';
//     console.log('[GUI] QR button forced visible');
//   } else {
//     console.log('[GUI] QR button not found:', guiButtons.refreshQR);
//   }
// }, 1000);

let patchAttempts = 0;
function patchDatGuiFields() {
  const inputs = document.querySelectorAll('.dg input, .dg select');
  if (inputs.length > 0 || patchAttempts > 10) {
    inputs.forEach((el, i) => {
      if (!el.id && !el.name) {
        el.id = `datgui-input-${i}`;
        el.name = `datgui-input-${i}`;
      }
    });
  } else {
    patchAttempts++;
    requestAnimationFrame(patchDatGuiFields);
  }
}
requestAnimationFrame(patchDatGuiFields);

/*──────── RESIZE + INIT. ─────────────────────────────────────*/
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio); // Maintain crisp display on resize
  labelR.setSize(innerWidth,innerHeight);
  if (leftRenderTarget) leftRenderTarget.setSize(innerWidth, innerHeight);
  if (rightRenderTarget) rightRenderTarget.setSize(innerWidth, innerHeight);
  if (stereoCamera) stereoCamera.aspect = camera.aspect;
  if (parallaxBarrierEffect) parallaxBarrierEffect.setSize(innerWidth, innerHeight);
});

// Cleanup projector window when main window closes
window.addEventListener('beforeunload', () => {
  closeProjectorWindow();
});
// animateSourceOrbit();  // Starts source animation

preloadYamahaSpeakerModel(() => {
  rebuildScene();
  initCameraTracking();
  animate();
});
