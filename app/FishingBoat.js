"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function makeFisher() {
  const figure = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x263941, roughness: 0.94 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x34352f, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x826c58, roughness: 1 });
  const hat = new THREE.MeshStandardMaterial({ color: 0x9a8060, roughness: 1 });

  function part(geometry, material, position, scale, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    figure.add(mesh);
  }

  function limb(start, end, radius, material) {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(to, from);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius, direction.length(), 7), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    figure.add(mesh);
  }

  part(new THREE.SphereGeometry(0.13, 8, 7), jacket, [0, 0.98, 0], [0.72, 1.42, 0.72], [0, 0, -0.12]);
  part(new THREE.SphereGeometry(0.10, 8, 7), skin, [0.02, 1.39, 0]);
  part(new THREE.CylinderGeometry(0.075, 0.09, 0.07, 8), hat, [0.02, 1.49, 0]);
  part(new THREE.CylinderGeometry(0.05, 0.07, 0.11, 8), hat, [0.02, 1.55, 0]);
  limb([-0.04, 0.83, -0.06], [0.22, 0.54, -0.06], 0.085, trousers);
  limb([0.22, 0.54, -0.06], [0.43, 0.46, -0.06], 0.07, trousers);
  limb([-0.04, 0.83, 0.06], [0.20, 0.54, 0.06], 0.085, trousers);
  limb([0.20, 0.54, 0.06], [0.42, 0.46, 0.06], 0.07, trousers);
  limb([-0.08, 1.17, -0.10], [0.19, 0.94, -0.12], 0.048, jacket);
  limb([0.19, 0.94, -0.12], [0.34, 0.78, -0.12], 0.038, jacket);
  limb([-0.08, 1.17, 0.10], [0.18, 0.95, 0.11], 0.048, jacket);
  limb([0.18, 0.95, 0.11], [0.32, 0.80, 0.11], 0.038, jacket);
  part(new THREE.SphereGeometry(0.045, 7, 6), skin, [0.34, 0.78, -0.12]);
  part(new THREE.SphereGeometry(0.045, 7, 6), skin, [0.32, 0.80, 0.11]);
  return figure;
}

function makeWaterShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, "rgba(8, 20, 25, .30)");
  gradient.addColorStop(0.42, "rgba(8, 20, 25, .14)");
  gradient.addColorStop(1, "rgba(8, 20, 25, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
}

function disposeTree(root) {
  root?.traverse((object) => {
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material?.map?.dispose();
      material?.dispose();
    });
  });
}

export default function FishingBoat({ horizon, boatPass }) {
  const canvasRef = useRef(null);
  const boatPassRef = useRef(boatPass);
  boatPassRef.current = boatPass;

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xd4e3e8, 0x26343a, 1.45));
    const sunlight = new THREE.DirectionalLight(0xffe7c7, 1.8);
    sunlight.position.set(-5, 8, 10);
    scene.add(sunlight);

    let aspect = stage.clientWidth / Math.max(stage.clientHeight, 1);
    const camera = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 60);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);
    let boat = null;
    let boatSize = new THREE.Vector3(8.7, 4.1, 3.5);
    let animationFrame = 0;
    let lastDraw = 0;
    let disposed = false;

    function resize() {
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      aspect = width / height;
      camera.left = -5 * aspect;
      camera.right = 5 * aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    new GLTFLoader().load("/models/fishing-boat.glb", ({ scene: model }) => {
      if (disposed) {
        disposeTree(model);
        return;
      }
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      boatSize = bounds.getSize(new THREE.Vector3());
      const group = new THREE.Group();
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(boatSize.x * 0.95, boatSize.y * 0.72), makeWaterShadow());
      shadow.position.set(0, -boatSize.y * 0.10, -boatSize.z * 0.08);
      shadow.renderOrder = -1;
      group.add(shadow);
      model.position.set(-center.x, -bounds.min.y, -center.z);
      group.add(model);
      group.add(makeFisher());
      boat = group;
      boat.visible = false;
      scene.add(boat);
    }, undefined, (error) => console.error("Unable to load fishing boat model", error));

    function animate(now) {
      animationFrame = requestAnimationFrame(animate);
      if (now - lastDraw < 34) return;
      lastDraw = now;
      const pass = boatPassRef.current;
      if (boat && pass) {
        const age = (performance.now() - pass.startedAt) / 1000;
        const cycleDuration = pass.cycleDuration || pass.duration;
        const progress = Math.max(0, Math.min(1, (age % cycleDuration) / cycleDuration));
        boat.visible = age >= 0 && age < pass.duration;
        if (boat.visible) {
          const route = pass.route;
          const x = route === 0 ? -0.14 + progress * 1.28 : route === 1 ? 1.14 - progress * 1.28 : 0.19 + progress * 0.53;
          const y = route === 0 ? horizon + 0.045 : route === 1 ? horizon + 0.245 : horizon + 0.34 - progress * 0.285;
          const width = route === 0 ? 0.12 : route === 1 ? 0.22 : 0.25 - progress * 0.15;
          const scale = width * 10 * aspect / Math.max(boatSize.x, 0.001);
          boat.position.set((x - 0.5) * 10 * aspect, 5 - y * 10 + Math.sin(age * 1.7) * 0.018, 0.55);
          boat.scale.setScalar(scale);
          boat.rotation.y = route === 1 ? Math.PI : route === 2 ? -progress * 0.72 : Math.sin(age * 0.22) * 0.025;
          boat.rotation.z = Math.sin(age * 1.9) * 0.016;
        }
      } else if (boat) {
        boat.visible = false;
      }
      renderer.render(scene, camera);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    animationFrame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      disposeTree(boat);
      renderer.dispose();
    };
  }, [horizon]);

  return <canvas ref={canvasRef} className="scene-models" aria-hidden="true" />;
}
