"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
  model.traverse((object) => {
    if (!object.isMesh) return;
    if (/wing|feather/i.test(object.name)) wingParts.push(object);
    if (/leg root|bird toe|bird claw|tarsal|interdigital|toe scale/i.test(object.name)) footParts.push(object);
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
  root.userData.wingHinges = hinges;
  root.userData.footHinges = feet;
  root.userData.jawHinge = jawHinge;
  root.userData.modelSize = size;
  root.visible = false;
  return root;
}

function makeFish(source) {
  const model = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  model.position.sub(center);
  let fishShader = null;

  model.traverse((object) => {
    if (!object.isMesh) return;
    const material = object.material.clone();
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
      fishShader = shader;
    };
    material.customProgramCacheKey = () => "barramundi-tail-sway-v1";
    object.material = material;
  });

  const root = new THREE.Group();
  root.add(model);
  root.userData.modelSize = size;
  root.userData.setFishTime = (time) => {
    if (fishShader) fishShader.uniforms.uFishTime.value = time;
  };
  root.visible = false;
  return root;
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
  passRef.current = pass;

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
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
    const birds = [];
    const fish = [];
    const leaves = [];
    const ghosts = [];
    let birdReady = false;
    let fishReady = false;
    let leavesReady = false;
    let disposed = false;
    let raf = 0;
    let lastDraw = 0;

    function resize() {
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      aspect = width / height;
      camera.left = -5 * aspect;
      camera.right = 5 * aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    const loader = new GLTFLoader();
    loader.load("/models/seagull.glb", ({ scene: source }) => {
      if (disposed) return disposeScene(source);
      for (let index = 0; index < 3; index++) {
        const bird = makeBird(source);
        bird.userData.flockIndex = index;
        birds.push(bird);
        scene.add(bird);
      }
      birdReady = true;
    }, undefined, (error) => console.error("Unable to load seagull model", error));

    loader.load("/models/barramundi-fish.glb", ({ scene: source }) => {
      if (disposed) return disposeScene(source);
      for (let index = 0; index < 3; index++) {
        const swimmer = makeFish(source);
        swimmer.userData.flockIndex = index;
        fish.push(swimmer);
        scene.add(swimmer);
      }
      fishReady = true;
    }, undefined, (error) => console.error("Unable to load barramundi model", error));

    loader.load("/models/maple-leaf.glb", ({ scene: source }) => {
      if (disposed) return disposeScene(source);
      for (let index = 0; index < 20; index++) {
        const leaf = makeLeaf(source, index);
        leaves.push(leaf);
        scene.add(leaf);
      }
      leavesReady = true;
    }, undefined, (error) => console.error("Unable to load maple leaf model", error));

    loader.load("/models/ghost.glb", ({ scene: source, animations }) => {
      if (disposed) return disposeScene(source);
      const ghost = makeGhost(source, animations);
      ghosts.push(ghost);
      scene.add(ghost);
    }, undefined, (error) => console.error("Unable to load ghost model", error));

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - lastDraw < 24) return;
      const delta = lastDraw ? Math.min((now - lastDraw) / 1000, 0.08) : 0;
      lastDraw = now;
      const current = passRef.current;
      const age = current ? (now - current.startedAt) / 1000 : -1;
      const duration = current?.duration || 1;
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
          let bank = 0;
          let step = 0;
          let preen = 0;

          if (reducedMotion) {
            x = toriiLanding ? 0.5 + (index % 2) * 0.045 : 0.42 + index * 0.07;
            const bodyHeight = bird.userData.modelSize?.y || 0.4;
            y = toriiLanding ? horizon - 0.13 - bodyHeight * scale * 0.05 : horizon - 0.20;
            scale = toriiLanding ? routeScale : Math.max(routeScale, 0.70);
          } else {
            if (toriiLanding) {
              const bodyHeight = bird.userData.modelSize?.y || 0.4;
              const beamY = horizon - 0.13;
              const bodyY = beamY - bodyHeight * routeScale * 0.05;
              const flyY = horizon - [0.12, 0.21, 0.30][route];
              const startX = direction > 0 ? -0.14 : 1.14;
              const exitX = direction > 0 ? 1.14 : -0.14;
              const approach = THREE.MathUtils.clamp(phase / 10.5, 0, 1);
              const landing = ease((phase - 8.5) / 3.5);
              const takeoff = ease((phase - 55) / 6);
              const walk = ease((phase - 20) / 2) * (1 - ease((phase - 43) / 2));
              shown = phase < 64;
              bird.visible = shown;
              if (!shown) return;
              visibility = Math.min(ease(phase / 0.8), ease((64 - phase) / 1.2));
              const perchX = 0.5 + direction * 0.035 * ease((phase - 20) / 24) + Math.sin(phase * 0.42) * 0.003;
              if (phase < 12) {
                x = THREE.MathUtils.lerp(startX, 0.5, approach);
                y = THREE.MathUtils.lerp(flyY - Math.sin(approach * Math.PI) * 0.025, bodyY, landing);
              } else if (phase < 55) {
                x = perchX;
                const footfall = Math.abs(Math.sin((phase - 20) * 3.2));
                y = bodyY - footfall * walk * 0.004;
              } else {
                x = THREE.MathUtils.lerp(perchX, exitX, takeoff);
                y = THREE.MathUtils.lerp(bodyY, flyY - 0.05, takeoff) - Math.sin(takeoff * Math.PI) * 0.035;
              }
              const settlingFlap = (1 - landing) * Math.sin(phase * 11) * 0.78;
              const restingFlap = Math.sin(phase * 0.75) * 0.035;
              const stretch = ease((phase - 29) / 0.7) * (1 - ease((phase - 33) / 0.8));
              const takeoffFlap = Math.sin(phase * 13) * 0.92 * takeoff;
              flap = phase < 13 ? settlingFlap : restingFlap + Math.sin(phase * 12) * 0.55 * stretch + takeoffFlap;
              preen = ease((phase - 29) / 0.9) * (1 - ease((phase - 34) / 0.9));
              step = Math.sin((phase - 20) * 3.2) * walk * 0.13;
              bank = -preen * 0.16 + Math.sin(phase * 1.3) * 0.018 + takeoff * 0.08;
              scale = routeScale;
            } else {
              const stagger = Math.max(0, index - (subject === "torii" ? 1 : 0)) * 1.35;
              const flightAge = phase - stagger;
              const flightDuration = 11.5;
              shown = flightAge >= 0 && flightAge < flightDuration;
              bird.visible = shown;
              if (!shown) return;
              const path = THREE.MathUtils.clamp(flightAge / 10.5, 0, 1);
              const fromX = direction > 0 ? -0.16 : 1.16;
              const toX = direction > 0 ? 1.16 : -0.16;
              x = THREE.MathUtils.lerp(fromX, toX, path);
              y = horizon - [0.12, 0.21, 0.30][route] - Math.sin(path * Math.PI) * 0.035 + Math.sin(flightAge * 1.8 + index) * 0.006;
              visibility = Math.min(ease(flightAge / 0.7), ease((flightDuration - flightAge) / 1.1));
              scale = Math.max(routeScale, index === 1 ? 0.82 : 0.58);
              flap = Math.sin(flightAge * 10.8 + index * 1.4) * 0.66;
              bank = Math.sin(flightAge * 1.4 + index) * 0.045;
              step = -0.08;
            }
          }
          bird.position.copy(screenPosition(x, y));
          bird.scale.setScalar(scale * visibility);
          bird.rotation.y = direction > 0 ? 0 : Math.PI;
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
          const diveOpacity = jump ? THREE.MathUtils.lerp(0.5, 1, arc / 0.105) : 0.56;
          swimmer.position.copy(screenPosition(x + Math.sin(cycleAge * 1.8 + index) * 0.008, surfaceY - arc));
          swimmer.position.z = 0.45;
          swimmer.scale.set(scale * Math.max(reveal * fadeOut, 0.001));
          swimmer.rotation.y = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
          swimmer.rotation.z = Math.sin(cycleAge * 2.7 + index) * 0.025 + (jump ? -arc * 2.4 : 0);
          swimmer.traverse((object) => {
            if (!object.isMesh) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => { material.opacity = diveOpacity; });
          });
          swimmer.userData.setFishTime?.(cycleAge + index * 0.6);
        });
      }

      if (leavesReady) {
        const autumnFall = current?.id === 18 && age >= 0 && age < duration;
        const windBurst = current?.id === 27 && age >= 0 && age < duration;
        const leafAge = cycleAge;
        const level = current?.level || 1;
        const leafCount = autumnFall ? [4, 7, 10][level - 1] : windBurst ? [7, 13, 20][level - 1] : 0;
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
            const fall = ease(THREE.MathUtils.clamp((leafAge - index * 0.28) / (3.1 + seed * 0.9), 0, 1));
            const startX = 0.08 + ((index * 0.271 + seed) % 0.84);
            const drift = (current.direction || 1) * (0.06 + seed * 0.10) * fall;
            x = startX + drift + Math.sin(leafAge * (1.3 + seed) + index) * (0.012 + seed * 0.014);
            const startY = horizon - 0.16 - seed * 0.22;
            const landingY = horizon + 0.025 + seed * 0.045;
            y = THREE.MathUtils.lerp(startY, landingY, fall) + Math.sin(leafAge * 1.2 + index) * 0.003 * fall;
            scale = [2.2, 5.0, 10.5][index % 3] * (0.82 + seed * 0.38);
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
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      disposeScene(scene);
      renderer.dispose();
    };
  }, [horizon, subject]);

  return <canvas ref={canvasRef} className="scene-models" aria-hidden="true" />;
}
