"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

function disposeScene(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root?.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

function ease(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function makeBird(source) {
  const model = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  model.position.sub(center);
  model.updateMatrixWorld(true);

  const wingParts = [];
  const footParts = [];
  const tailParts = [];
  model.traverse((object) => {
    if (!object.isMesh) return;
    if (/wing|feather/i.test(object.name)) wingParts.push(object);
    if (/leg root|bird toe|bird claw|tarsal|interdigital|toe scale/i.test(object.name)) footParts.push(object);
    if (/tail rectrix/i.test(object.name)) tailParts.push(object);
  });
  const hinges = [-1, 1].map((side) => {
    const hinge = new THREE.Group();
    hinge.position.set(-0.045, 0.23, side * 0.05);
    model.add(hinge);
    return hinge;
  });
  for (const part of wingParts) {
    const worldCenter = new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3());
    const localCenter = model.worldToLocal(worldCenter.clone());
    const side = localCenter.z < 0 ? 0 : 1;
    hinges[side].attach(part);
  }

  const feet = [-1, 1].map((side) => {
    const foot = new THREE.Group();
    foot.position.set(0.018, 0.17, side * 0.024);
    model.add(foot);
    return foot;
  });
  for (const part of footParts) {
    const worldCenter = new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3());
    const localCenter = model.worldToLocal(worldCenter.clone());
    feet[localCenter.z < 0 ? 0 : 1].attach(part);
  }

  const tailHinge = new THREE.Group();
  tailHinge.position.set(-size.x * 0.38, -size.y * 0.02, 0);
  model.add(tailHinge);
  for (const part of tailParts) tailHinge.attach(part);

  const jaw = model.getObjectByName("Closed lower mandible");
  let jawHinge = null;
  if (jaw) {
    const worldCenter = new THREE.Box3().setFromObject(jaw).getCenter(new THREE.Vector3());
    const localCenter = model.worldToLocal(worldCenter.clone());
    jawHinge = new THREE.Group();
    jawHinge.position.set(localCenter.x - 0.03, localCenter.y + 0.002, localCenter.z);
    model.add(jawHinge);
    jawHinge.attach(jaw);
  }

  const root = new THREE.Group();
  root.add(model);
  model.updateMatrixWorld(true);
  const perchFootOffset = new THREE.Box3().setFromObject(model).min.y;
  root.userData.wingHinges = hinges;
  root.userData.footHinges = feet;
  root.userData.tailHinge = tailHinge;
  root.userData.jawHinge = jawHinge;
  root.userData.modelSize = size;
  root.userData.perchFootOffset = perchFootOffset;
  root.visible = false;
  return root;
}

function makeFish(source) {
  const model = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  model.position.sub(center);
  const fishShaders = [];
  const fishMaterials = [];

  model.traverse((object) => {
    if (!object.isMesh) return;
    const material = object.material.clone();
    fishMaterials.push(material);
    material.transparent = true;
    material.depthWrite = false;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFishTime = { value: 0 };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uFishTime;")
        .replace("#include <begin_vertex>", `
          #include <begin_vertex>
          float tailWeight = smoothstep(0.02, 0.25, abs(position.z));
          transformed.y += sin(uFishTime * 7.2 + position.z * 13.0) * 0.014 * tailWeight;
          transformed.x += sin(uFishTime * 6.5 + position.z * 12.0) * 0.010 * tailWeight;
        `);
      fishShaders.push(shader);
    };
    material.customProgramCacheKey = () => "barramundi-tail-sway-v1";
    object.material = material;
  });

  const root = new THREE.Group();
  root.add(model);
  root.userData.modelSize = size;
  root.userData.fishMaterials = fishMaterials;
  root.userData.setFishTime = (time) => fishShaders.forEach((shader) => { shader.uniforms.uFishTime.value = time; });
  root.visible = false;
  return root;
}

function makeDolphin(source) {
  const model = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  model.position.sub(center);
  const shaders = [];
  const materials = [];

  model.traverse((object) => {
    if (!object.isMesh) return;
    const cloneMaterial = (sourceMaterial) => {
      const material = sourceMaterial.clone();
      materials.push(material);
      material.transparent = true;
      material.depthWrite = false;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uDolphinTime = { value: 0 };
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uDolphinTime;")
          .replace("#include <begin_vertex>", `
            #include <begin_vertex>
            float tailWeight = 1.0 - smoothstep(-1.48, -0.72, position.x);
            transformed.z += sin(uDolphinTime * 4.7 + position.x * 2.0) * 0.15 * tailWeight;
            transformed.y += cos(uDolphinTime * 4.7 + position.x * 2.0) * 0.025 * tailWeight;
          `);
        shaders.push(shader);
      };
      material.customProgramCacheKey = () => "bottlenose-tail-sway-v1";
      return material;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
  });

  const root = new THREE.Group();
  root.add(model);
  root.userData.modelSize = size;
  root.userData.dolphinMaterials = materials;
  root.userData.setDolphinTime = (time) => shaders.forEach((shader) => {
    shader.uniforms.uDolphinTime.value = time;
  });
  root.visible = false;
  return root;
}

function makeSakuraPetalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.48);
  shape.bezierCurveTo(-0.17, -0.38, -0.35, -0.10, -0.31, 0.17);
  shape.bezierCurveTo(-0.28, 0.38, -0.11, 0.48, -0.025, 0.42);
  shape.quadraticCurveTo(0, 0.34, 0.025, 0.42);
  shape.bezierCurveTo(0.11, 0.48, 0.28, 0.38, 0.31, 0.17);
  shape.bezierCurveTo(0.35, -0.10, 0.17, -0.38, 0, -0.48);

  const geometry = new THREE.ShapeGeometry(shape, 10);
  const positions = geometry.getAttribute("position");
  const colors = [];
  const centerColor = new THREE.Color("#fff0f2");
  const edgeColor = new THREE.Color("#dc7f9c");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const edge = THREE.MathUtils.clamp(Math.max(Math.abs(x) / 0.32, (Math.abs(y) + Math.abs(x) * 0.25) / 0.50), 0, 1);
    const color = centerColor.clone().lerp(edgeColor, THREE.MathUtils.smoothstep(edge, 0.34, 0.96));
    colors.push(color.r, color.g, color.b);
    const cup = Math.pow(THREE.MathUtils.clamp(Math.max(Math.abs(x) / 0.34, Math.abs(y) / 0.48), 0, 1), 1.7);
    positions.setZ(index, 0.024 * cup + Math.sin((y + 0.48) * Math.PI) * 0.004);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeSakuraPetals() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const petals = new THREE.InstancedMesh(makeSakuraPetalGeometry(), material, 54);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false;
  petals.count = 0;
  const tint = new THREE.Color();
  for (let index = 0; index < petals.instanceMatrix.count; index += 1) {
    tint.setHSL(0.955 + (index % 5) * 0.004, 0.18 + (index % 4) * 0.025, 0.94 - (index % 3) * 0.018);
    petals.setColorAt(index, tint);
  }
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  petals.visible = false;
  return petals;
}

function makeLeaf(source, index) {
  const leaf = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(leaf);
  leaf.position.sub(bounds.getCenter(new THREE.Vector3()));
  leaf.traverse((object) => {
    if (!object.isMesh) return;
    const material = object.material.clone();
    material.color.setHSL(0.015 + (index % 7) * 0.014, 0.66 + (index % 3) * 0.08, 0.34 + (index % 4) * 0.055);
    material.roughness = 0.82;
    material.side = THREE.DoubleSide;
    object.material = material;
  });
  const root = new THREE.Group();
  root.add(leaf);
  root.userData.seed = (index * 0.61803398875) % 1;
  root.visible = false;
  return root;
}

function makeGhost(source, animations) {
  const bounds = new THREE.Box3().setFromObject(source);
  const center = bounds.getCenter(new THREE.Vector3());
  source.position.sub(center);
  source.traverse((object) => {
    if (!object.isMesh) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (!material) continue;
      if (/Ghost_Main/i.test(material.name)) {
        material.color.set(0xc9deea);
        if (material.emissive) material.emissive.set(0x293f50);
        material.emissiveIntensity = 0.22;
      } else if (/Eye_White/i.test(material.name)) {
        material.color.set(0xf7f4e8);
      } else if (/Eye_Black/i.test(material.name)) {
        material.color.set(0x121820);
      }
      material.roughness = 0.78;
      material.metalness = 0;
    }
  });

  const root = new THREE.Group();
  root.add(source);
  const mixer = new THREE.AnimationMixer(source);
  const idle = (animations || []).find((clip) => /Flying_Idle|Idle/i.test(clip.name));
  if (idle) mixer.clipAction(idle).play();
  root.userData.updateAnimation = (delta) => mixer.update(delta);
  root.visible = false;
  return root;
}

export default function SceneWildlife({ horizon, subject, pass }) {
  const canvasRef = useRef(null);
  const passRef = useRef(pass);
  const wakeRef = useRef(() => {});
  passRef.current = pass;

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xc7d9dc, 0x182a2c, 1.25));
    const keyLight = new THREE.DirectionalLight(0xf7ead4, 1.7);
    keyLight.position.set(-5, 7, 8);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xa8c5d3, 0.65);
    fillLight.position.set(5, 2, 5);
    scene.add(fillLight);

    let aspect = stage.clientWidth / Math.max(stage.clientHeight, 1);
    const camera = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 50);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);
    const petalTransform = new THREE.Object3D();
    const birds = [];
    const fish = [];
    const dolphins = [];
    const leaves = [];
    const ghosts = [];
    const sakuraSeeds = Array.from({ length: 54 }, (_, index) => (index * 0.61803398875) % 1);
    let sakuraPetals = null;
    let birdReady = false;
    let fishReady = false;
    let dolphinReady = false;
    let leavesReady = false;
    let disposed = false;
    let raf = 0;
    let lastDraw = 0;
    let activeAssetId = null;
    let pendingAssetId = null;
    let failedAssetId = null;
    let assetToken = 0;
    let assetRoots = [];
    let inView = true;
    let pageVisible = !document.hidden;

    function canDraw() {
      return inView && pageVisible && !disposed;
    }

    function scheduleFrame() {
      if (!raf && canDraw()) raf = requestAnimationFrame(frame);
    }

    function clearEventAssets() {
      assetToken += 1;
      pendingAssetId = null;
      activeAssetId = null;
      failedAssetId = null;
      for (const root of assetRoots) {
        scene.remove(root);
        disposeScene(root);
      }
      assetRoots = [];
      birds.length = 0;
      fish.length = 0;
      dolphins.length = 0;
      leaves.length = 0;
      ghosts.length = 0;
      sakuraPetals = null;
      birdReady = false;
      fishReady = false;
      dolphinReady = false;
      leavesReady = false;
    }

    function eventAssetId(id) {
      if (id === 7) return 7;
      if (id === 9) return 9;
      if (id === 10) return 10;
      if (id === 8 || id === 11) return 8;
      if (id === 16) return 16;
      if (id === 18 || id === 27) return 18;
      return null;
    }

    function loadEventAssets(id) {
      if (activeAssetId === id || pendingAssetId === id || failedAssetId === id) return;
      clearEventAssets();
      renderer.clear();
      activeAssetId = id;
      if (id === 16) {
        sakuraPetals = makeSakuraPetals();
        assetRoots.push(sakuraPetals);
        scene.add(sakuraPetals);
        pendingAssetId = null;
        scheduleFrame();
        return;
      }
      pendingAssetId = id;
      const requestToken = assetToken;
      const path = id === 7 ? "/models/ghost.glb"
        : id === 9 ? "/models/common-bottlenose-dolphin.glb"
          : id === 10 ? "/models/seagull.glb"
            : id === 8 ? "/models/barramundi-fish.glb"
              : "/models/maple-leaf.glb";

      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(path, ({ scene: source, animations }) => {
        if (disposed || requestToken !== assetToken || eventAssetId(passRef.current?.id) !== id) {
          disposeScene(source);
          return;
        }
        pendingAssetId = null;
        if (id === 7) {
          const ghost = makeGhost(source, animations);
          ghosts.push(ghost);
          assetRoots.push(ghost);
          scene.add(ghost);
        } else if (id === 9) {
          for (let index = 0; index < 3; index += 1) {
            const dolphin = makeDolphin(source);
            dolphin.userData.flockIndex = index;
            dolphins.push(dolphin);
            assetRoots.push(dolphin);
            scene.add(dolphin);
          }
          dolphinReady = true;
        } else if (id === 10) {
          for (let index = 0; index < 3; index++) {
            const bird = makeBird(source);
            bird.userData.flockIndex = index;
            birds.push(bird);
            assetRoots.push(bird);
            scene.add(bird);
          }
          birdReady = true;
        } else if (id === 8) {
          for (let index = 0; index < 3; index++) {
            const swimmer = makeFish(source);
            swimmer.userData.flockIndex = index;
            fish.push(swimmer);
            assetRoots.push(swimmer);
            scene.add(swimmer);
          }
          fishReady = true;
        } else {
          for (let index = 0; index < 40; index++) {
            const leaf = makeLeaf(source, index);
            leaves.push(leaf);
            assetRoots.push(leaf);
            scene.add(leaf);
          }
          leavesReady = true;
        }
        scheduleFrame();
      }, undefined, (error) => {
        if (requestToken === assetToken) {
          pendingAssetId = null;
          activeAssetId = id;
          failedAssetId = id;
          console.error(`Unable to load event model ${path}`, error);
        }
      });
    }

    function resize() {
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      aspect = width / height;
      camera.left = -5 * aspect;
      camera.right = 5 * aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      scheduleFrame();
    }

    function onVisibilityChange() {
      pageVisible = !document.hidden;
      if (pageVisible) scheduleFrame();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) scheduleFrame();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }, { rootMargin: "120px" });
    observer?.observe(stage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    function frame(now) {
      raf = 0;
      if (!canDraw()) return;
      if (now - lastDraw < 24) {
        scheduleFrame();
        return;
      }
      const delta = lastDraw ? Math.min((now - lastDraw) / 1000, 0.08) : 0;
      lastDraw = now;
      const current = passRef.current;
      const age = current ? (now - current.startedAt) / 1000 : -1;
      const duration = current?.duration || 1;
      const assetId = current && age >= 0 && age < duration ? eventAssetId(current.id) : null;
      if (!assetId) {
        if (activeAssetId !== null || pendingAssetId !== null) clearEventAssets();
        renderer.clear();
        return;
      }
      if (activeAssetId !== assetId) loadEventAssets(assetId);
      if (pendingAssetId !== null || activeAssetId !== assetId) return;
      const cycleDuration = current?.cycleDuration || duration;
      const cycleAge = age >= 0 ? age % cycleDuration : 0;
      const direction = current?.direction || 1;
      const screenPosition = (x, y) => new THREE.Vector3((x - 0.5) * 10 * aspect, 5 - y * 10, 0.55);

      if (ghosts.length) {
        const active = current?.id === 7 && age >= 0 && age < duration;
        ghosts.forEach((ghost) => {
          ghost.visible = active;
          if (!active) return;
          const entrance = ease(age / 28);
          const exit = ease((duration - age) / 42);
          const visibility = Math.min(entrance, exit);
          const level = current.level || 1;
          const scale = [0.15, 0.18, 0.22][level - 1];
          const x = 0.75 + Math.sin(age * 0.14) * 0.035;
          const y = horizon - 0.10 + Math.sin(age * 0.82) * 0.008;
          ghost.position.copy(screenPosition(x, y));
          ghost.position.z = 0.72;
          ghost.scale.setScalar(scale * visibility);
          ghost.rotation.y = Math.sin(age * 0.20) * 0.12;
          ghost.rotation.z = Math.sin(age * 0.66) * 0.018;
          ghost.userData.updateAnimation(delta);
        });
      }

      if (birdReady) {
        const activeBirdEvent = current?.id === 10 && age >= 0 && age < duration;
        const route = THREE.MathUtils.clamp(current?.route ?? 0, 0, 2);
        const level = current?.level ?? 1;
        const routeScale = [0.54, 0.76, 1.0][route];
        const birdPattern = ((current?.birdPattern ?? 0) % 4 + 4) % 4;
        const count = activeBirdEvent ? Math.min(birds.length, level > 1 ? 3 : 2) : 0;
        birds.forEach((bird, index) => {
          const toriiLanding = subject === "torii" && index === 0;
          const phase = cycleAge;
          let shown = index < count;
          bird.visible = shown;
          if (!shown) return;
          let x = 0;
          let y = horizon - 0.18;
          let scale = routeScale;
          let visibility = 1;
          let flap = 0;
          let heading = 1;
          let bank = 0;
          let step = 0;
          let preen = 0;
          let look = 0;
          let tailMotion = 0;

          if (reducedMotion) {
            x = toriiLanding ? 0.5 : 0.42 + index * 0.07;
            heading = direction;
            const beamY = horizon - 0.095;
            const footOffset = bird.userData.perchFootOffset || -(bird.userData.modelSize?.y || 0.4) / 2;
            y = toriiLanding ? beamY + footOffset * scale / 10 : horizon - 0.20;
            scale = toriiLanding ? routeScale : Math.max(routeScale, 0.70);
          } else {
            if (toriiLanding) {
              const beamY = horizon - 0.095;
              const footOffset = bird.userData.perchFootOffset || -(bird.userData.modelSize?.y || 0.4) / 2;
              const bodyY = beamY + footOffset * routeScale / 10;
              const approachDirection = birdPattern < 2 ? direction : -direction;
              const overheadApproach = birdPattern >= 2;
              const startX = overheadApproach ? (birdPattern === 2 ? 0.30 : 0.70) : approachDirection > 0 ? -0.16 : 1.16;
              const exitX = overheadApproach ? (birdPattern === 2 ? 0.42 : 0.58) : direction > 0 ? 1.14 : -0.14;
              const entryY = overheadApproach ? horizon - 0.44 : horizon - [0.14, 0.28][birdPattern];
              const exitY = overheadApproach ? horizon - 0.44 : horizon - 0.23;
              const flyY = horizon - [0.14, 0.28, 0.19, 0.34][birdPattern];
              const approach = ease(phase / 10.5);
              const landing = ease((phase - 8.5) / 3.5);
              const takeoff = ease((phase - 55) / 6);
              const firstStep = ease((phase - 20) / 0.45) * (1 - ease((phase - 22) / 0.5));
              const secondStep = ease((phase - 39) / 0.45) * (1 - ease((phase - 41) / 0.5));
              const walk = firstStep - secondStep;
              shown = phase < 64;
              bird.visible = shown;
              if (!shown) return;
              visibility = Math.min(ease(phase / 0.8), ease((64 - phase) / 1.2));
              const perchX = 0.5 + approachDirection * walk * 0.016 + Math.sin(phase * 0.31) * 0.002;
              const approachBank = Math.atan2(-(bodyY - entryY), Math.abs(0.5 - startX));
              const perchedDirection = overheadApproach ? (birdPattern === 2 ? 1 : -1) : approachDirection;
              const departureBank = Math.atan2(-(exitY - bodyY), Math.abs(exitX - 0.5));
              if (phase < 12) {
                x = THREE.MathUtils.lerp(startX, 0.5, approach) + Math.sin(phase * 1.5 + index) * (1 - approach) * 0.009;
                y = THREE.MathUtils.lerp(entryY, bodyY, landing)
                  - Math.sin(approach * Math.PI) * (0.035 + birdPattern * 0.008) * (1 - landing * 0.55);
                heading = approachDirection;
                bank = THREE.MathUtils.lerp(approachBank, 0, landing)
                  + Math.sin(phase * 1.7) * 0.035 * (1 - landing);
              } else if (phase < 55) {
                x = perchX;
                y = bodyY + Math.sin(phase * 1.65) * 0.0014;
                heading = perchedDirection;
                preen = ease((phase - 29) / 0.9) * (1 - ease((phase - 33) / 1.0))
                  + ease((phase - 45) / 0.8) * (1 - ease((phase - 48) / 0.9));
                bank = Math.sin(phase * 0.53) * 0.012 - preen * 0.08;
                look = Math.sin(phase * 0.37 + index) * 0.11;
                const wingStretch = ease((phase - 24) / 0.7) * (1 - ease((phase - 27) / 0.8));
                flap = Math.sin(phase * 12.0) * 0.34 * wingStretch;
                step = Math.sin((phase - 20) * 3.2) * Math.abs(walk) * 0.10;
                tailMotion = Math.sin(phase * 0.62) * 0.035 + preen * 0.08;
              } else {
                x = THREE.MathUtils.lerp(perchX, exitX, takeoff);
                y = THREE.MathUtils.lerp(bodyY, exitY, takeoff) - Math.sin(takeoff * Math.PI) * 0.045;
                heading = exitX > 0.5 ? 1 : -1;
                bank = departureBank * takeoff;
                tailMotion = -takeoff * 0.10;
              }
              if (phase < 13) flap = (1 - landing) * Math.sin(phase * 10.5 + index) * 0.98;
              if (phase >= 55) flap = Math.sin(phase * 12.5 + index) * 1.05 * takeoff;
              scale = routeScale;
            } else {
              const stagger = Math.max(0, index - (subject === "torii" ? 1 : 0)) * 1.35;
              const flightAge = phase - stagger;
              const flightDuration = 11.5;
              shown = flightAge >= 0 && flightAge < flightDuration;
              bird.visible = shown;
              if (!shown) return;
              const path = ease(flightAge / 10.5);
              const flightDirection = index % 2 === 0 ? direction : -direction;
              const fromX = flightDirection > 0 ? -0.16 : 1.16;
              const toX = flightDirection > 0 ? 1.16 : -0.16;
              const laneY = horizon - [0.12, 0.21, 0.30][route];
              const pathPattern = (birdPattern + index) % 3;
              const startY = laneY + (pathPattern === 1 ? 0.10 : pathPattern === 2 ? -0.07 : 0);
              const endY = laneY + (pathPattern === 1 ? -0.07 : pathPattern === 2 ? 0.11 : 0);
              heading = flightDirection;
              x = THREE.MathUtils.lerp(fromX, toX, path);
              y = THREE.MathUtils.lerp(startY, endY, path) - Math.sin(path * Math.PI) * (pathPattern === 0 ? 0.05 : 0.025)
                + Math.sin(flightAge * 1.55 + index * 1.8) * 0.004;
              bank = Math.atan2(-(endY - startY), Math.abs(toX - fromX)) + Math.sin(flightAge * 1.35 + index) * 0.055;
              visibility = Math.min(ease(flightAge / 0.7), ease((flightDuration - flightAge) / 1.1));
              scale = routeScale;
              flap = Math.sin(flightAge * 10.2 + index * 1.4) * 0.78;
              step = -0.045;
            }
          }
          bird.position.copy(screenPosition(x, y));
          bird.scale.setScalar(scale * visibility);
          bird.rotation.y = (heading > 0 ? 0 : Math.PI) + look;
          bird.rotation.z = bank;
          const hinges = bird.userData.wingHinges;
          if (hinges) {
            hinges[0].rotation.x = -flap;
            hinges[1].rotation.x = flap;
          }
          const feet = bird.userData.footHinges;
          if (feet) {
            feet[0].rotation.z = step;
            feet[1].rotation.z = -step;
          }
          if (bird.userData.tailHinge) {
            bird.userData.tailHinge.rotation.z = tailMotion;
            bird.userData.tailHinge.rotation.x = Math.sin(phase * 0.46) * 0.018;
          }
          if (bird.userData.jawHinge) bird.userData.jawHinge.rotation.z = -Math.abs(Math.sin(phase * 9)) * 0.09 * preen;
        });
      }

      if (fishReady) {
        const activeFishEvent = [8, 11].includes(current?.id) && age >= 0 && age < duration;
        const route = current?.route ?? 0;
        const level = current?.level ?? 1;
        const jump = activeFishEvent && current?.id === 11;
        const routeCount = jump ? 1 : route === 0 ? 3 : route === 1 ? 2 : 1;
        const count = activeFishEvent ? Math.min(routeCount, level) : 0;
        fish.forEach((swimmer, index) => {
          const shown = index < count;
          swimmer.visible = shown;
          if (!shown) return;
          const direction = index % 2 === 0 ? 1 : -1;
          const path = THREE.MathUtils.clamp((cycleAge - index * 0.26) / cycleDuration, 0, 1);
          const x = direction > 0 ? THREE.MathUtils.lerp(-0.08, 1.08, path) : THREE.MathUtils.lerp(1.08, -0.08, path);
          const depthOffset = route === 0 ? 0.13 : route === 1 ? 0.20 : 0.27;
          const surfaceY = jump ? horizon + 0.16 : horizon + depthOffset;
          const jumpPhase = THREE.MathUtils.clamp((cycleAge - 1.8) / 3.2, 0, 1);
          const arc = jump ? Math.sin(jumpPhase * Math.PI) * 0.105 : 0;
          const reveal = jump ? ease((cycleAge - 0.8) / 0.75) : ease(cycleAge / 0.8);
          const fadeOut = ease((cycleDuration - cycleAge) / 0.9);
          const scale = route === 0 ? 0.60 : route === 1 ? 1.08 : 1.68;
          const diveOpacity = jump ? THREE.MathUtils.lerp(0.58, 1, arc / 0.105) : 0.72;
          swimmer.position.copy(screenPosition(x + Math.sin(cycleAge * 1.8 + index) * 0.008, surfaceY - arc));
          swimmer.position.z = 0.45;
          swimmer.scale.set(scale * Math.max(reveal * fadeOut, 0.001));
          swimmer.rotation.y = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
          swimmer.rotation.z = Math.sin(cycleAge * 2.7 + index) * 0.025 + (jump ? -arc * 2.4 : 0);
          swimmer.userData.fishMaterials?.forEach((material) => { material.opacity = diveOpacity; });
          swimmer.userData.setFishTime?.(cycleAge + index * 0.6);
        });
      }

      if (dolphinReady) {
        const activeDolphinEvent = current?.id === 9 && age >= 0 && age < duration;
        const level = current?.level || 1;
        const count = activeDolphinEvent ? [1, 2, 3][level - 1] : 0;
        const direction = current?.direction || 1;
        dolphins.forEach((dolphin, index) => {
          const phase = cycleAge - index * 1.1;
          const shown = index < count && phase >= 0 && phase < 4.9;
          dolphin.visible = shown;
          if (!shown) return;
          const progress = THREE.MathUtils.clamp((phase - 0.12) / 3.05, 0, 1);
          const arc = Math.sin(progress * Math.PI);
          const startX = direction > 0 ? -0.16 : 1.16;
          const endX = direction > 0 ? 0.78 - index * 0.07 : 0.22 + index * 0.07;
          const x = THREE.MathUtils.lerp(startX, endX, progress);
          const y = horizon + 0.055 + index * 0.012 - arc * (0.095 + index * 0.008);
          const scale = [0.19, 0.24, 0.29][Math.min(index, 2)];
          const visibility = Math.min(ease(phase / 0.28), ease((4.9 - phase) / 0.55));
          dolphin.position.copy(screenPosition(x, y));
          dolphin.position.z = 0.74 + index * 0.015;
          dolphin.scale.setScalar(scale * visibility);
          dolphin.rotation.y = direction > 0 ? 0 : Math.PI;
          dolphin.rotation.z = direction * (0.18 * (1 - progress) - 0.22 * progress) * arc;
          dolphin.userData.dolphinMaterials?.forEach((material) => { material.opacity = visibility; });
          dolphin.userData.setDolphinTime?.(age + index * 1.2);
        });
      }

      if (sakuraPetals) {
        const activeSpringEvent = current?.id === 16 && age >= 0 && age < duration;
        const level = current?.level || 1;
        const count = activeSpringEvent ? [28, 42, 54][level - 1] : 0;
        const direction = current?.direction || 1;
        const petalCycle = 32;
        sakuraPetals.visible = activeSpringEvent;
        sakuraPetals.count = count;
        for (let index = 0; index < count; index += 1) {
          const seed = sakuraSeeds[index];
          const phaseOffset = seed * petalCycle;
          const phase = (cycleAge + phaseOffset) % petalCycle;
          const fallDuration = 2.5 + seed * 1.2;
          const fall = ease(phase / fallDuration);
          const floatAge = Math.max(0, phase - fallDuration);
          const waterBand = ((index * 0.7548776662 + 0.17) % 1);
          const landingY = horizon + 0.035 + waterBand * Math.max(0.02, 0.98 - horizon);
          const startY = horizon - 0.075 - ((index * 0.438 + seed) % 1) * 0.19;
          const loop = Math.floor((cycleAge + phaseOffset) / petalCycle);
          const startX = ((seed * 3.71 + loop * 0.213) % 1 + 1) % 1;
          const landingX = ((startX + direction * (0.045 + seed * 0.035)) % 1 + 1) % 1;
          const fallSway = Math.sin(phase * (1.4 + seed) + index * 1.7);
          const x = phase < fallDuration
            ? startX + (landingX - startX) * fall + fallSway * 0.018 * (1 - fall)
            : ((landingX + direction * floatAge * (0.0045 + seed * 0.006)
              + Math.sin(floatAge * 0.48 + index) * 0.006) % 1 + 1) % 1;
          const y = phase < fallDuration
            ? THREE.MathUtils.lerp(startY, landingY, fall) + fallSway * 0.006 * (1 - fall)
            : landingY + Math.sin(floatAge * 1.65 + index * 0.71) * 0.0018;
          const depth = THREE.MathUtils.clamp((y - horizon) / Math.max(0.08, 1 - horizon), 0, 1);
          const visibility = ease(phase / 0.42);
          const size = (0.052 + depth * 0.16) * visibility;
          const spin = phase < fallDuration
            ? phase * (0.9 + seed * 1.5) + fallSway * 0.35
            : phase * (0.10 + seed * 0.07) + Math.sin(floatAge * 0.35 + index) * 0.05;
          petalTransform.position.set((x - 0.5) * 10 * aspect, 5 - y * 10, 0.86 + depth * 0.03);
          petalTransform.rotation.set(
            Math.sin(spin * 0.72) * (phase < fallDuration ? 0.75 : 0.10),
            Math.cos(spin * 0.62) * (phase < fallDuration ? 0.82 : 0.16),
            spin,
          );
          petalTransform.scale.set(size, size, size);
          petalTransform.updateMatrix();
          sakuraPetals.setMatrixAt(index, petalTransform.matrix);
        }
        sakuraPetals.instanceMatrix.needsUpdate = true;
      }

      if (leavesReady) {
        const autumnFall = current?.id === 18 && age >= 0 && age < duration;
        const windBurst = current?.id === 27 && age >= 0 && age < duration;
        const leafAge = cycleAge;
        const level = current?.level || 1;
        const leafCount = autumnFall ? [8, 14, 20][level - 1] : windBurst ? [7, 13, 20][level - 1] : 0;
        leaves.forEach((leaf, index) => {
          const shown = index < leafCount;
          leaf.visible = shown;
          if (!shown) return;
          const seed = leaf.userData.seed;
          const entrance = ease((leafAge - index * (windBurst ? 0.09 : 0.28)) / (windBurst ? 0.55 : 0.85));
          const exit = windBurst
            ? ease((cycleDuration - leafAge - seed * 0.85) / 1.65)
            : ease((cycleDuration - leafAge) / 3.5);
          const visibility = Math.max(0.001, Math.min(entrance, exit));
          let x;
          let y;
          let scale;
          if (windBurst) {
            const travel = THREE.MathUtils.clamp((leafAge - index * 0.09) / (4.0 + seed * 1.8), 0, 1);
            const dir = current.direction || 1;
            const startX = dir > 0 ? -0.23 - seed * 0.65 : 1.23 + seed * 0.65;
            const endX = dir > 0 ? 1.23 + seed * 0.65 : -0.23 - seed * 0.65;
            x = THREE.MathUtils.lerp(startX, endX, travel) + Math.sin(leafAge * (1.9 + seed) + index) * 0.045;
            const lane = (index * 0.61803398875) % 1;
            y = lane + Math.sin(leafAge * (1.2 + seed * 1.6) + index * 1.7) * (0.10 + seed * 0.05);
            scale = [6.5, 11.5, 17.5][index % 3] * (0.86 + seed * 0.34);
          } else {
            const leafCycle = 18;
            const phase = (leafAge + seed * leafCycle) % leafCycle;
            const fallDuration = 2.8 + seed * 1.0;
            const fall = ease(phase / fallDuration);
            const floatAge = Math.max(0, phase - fallDuration);
            const startX = ((seed * 2.91 + Math.floor((leafAge + seed * leafCycle) / leafCycle) * 0.19) % 1 + 1) % 1;
            const landingX = ((startX + (current.direction || 1) * (0.04 + seed * 0.06)) % 1 + 1) % 1;
            const landingY = horizon + 0.035 + ((index * 0.7548776662 + seed * 0.29) % 1) * Math.max(0.02, 0.98 - horizon);
            const startY = horizon - 0.13 - seed * 0.18;
            x = phase < fallDuration
              ? startX + (landingX - startX) * fall + Math.sin(phase * 1.7 + index) * 0.022 * (1 - fall)
              : ((landingX + (current.direction || 1) * floatAge * (0.004 + seed * 0.006)
                + Math.sin(floatAge * 0.5 + index) * 0.008) % 1 + 1) % 1;
            y = phase < fallDuration
              ? THREE.MathUtils.lerp(startY, landingY, fall) + Math.sin(phase * 1.1 + index) * 0.006 * (1 - fall)
              : landingY + Math.sin(floatAge * 1.45 + index) * 0.002;
            scale = [2.2, 5.0, 10.5][index % 3] * (0.82 + seed * 0.38) * ease(phase / 0.42);
          }
          leaf.position.set((x - 0.5) * 10 * aspect, 5 - y * 10, 0.85 + seed * 0.18);
          leaf.scale.setScalar(scale * visibility);
          const phase = age * (3.0 + seed * 4.5) + index * 1.83;
          leaf.rotation.set(
            Math.sin(phase * 0.73) * (0.45 + seed * 0.55),
            Math.cos(phase * 0.51) * (0.35 + seed * 0.50),
            phase * (current.direction || 1) * (windBurst ? 0.9 + seed * 1.6 : 0.35 + seed * 0.55),
          );
        });
      }

      renderer.render(scene, camera);
      scheduleFrame();
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    wakeRef.current = scheduleFrame;
    scheduleFrame();
    return () => {
      disposed = true;
      wakeRef.current = () => {};
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer?.disconnect();
      clearEventAssets();
      disposeScene(scene);
      renderer.dispose();
    };
  }, [horizon, subject]);

  useEffect(() => {
    wakeRef.current();
  }, [pass]);

  return <canvas ref={canvasRef} className="scene-models" aria-hidden="true" />;
}
