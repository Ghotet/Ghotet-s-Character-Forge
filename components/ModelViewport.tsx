import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from './Button';
import type { ImagePart } from '../types'; // Import ImagePart

interface ModelViewportProps {
  image: ImagePart; // Changed from string to ImagePart
  onReset: () => void;
}

export const ModelViewport: React.FC<ModelViewportProps> = ({ image, onReset }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // Deep studio charcoal

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 1, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // --- Studio Lighting (3-Point Setup) ---
    // 1. Key Light (Main character illumination)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // 2. Fill Light (Softens shadows)
    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.6);
    fillLight.position.set(-5, 0, 2);
    scene.add(fillLight);

    // 3. Rim Light (Edge highlights)
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // --- Floor / Cyclorama ---
    const floorGeom = new THREE.CircleGeometry(10, 64);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- Character Model Projection ---
    const textureLoader = new THREE.TextureLoader();
    const imageUrl = image.data.startsWith('http') ? image.data : `data:${image.mimeType};base64,${image.data}`; // Use ImagePart properties

    let geometry: THREE.PlaneGeometry | undefined;
    let material: THREE.MeshStandardMaterial | undefined;

    textureLoader.load(imageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      
      // High-resolution mesh for detailed displacement
      geometry = new THREE.PlaneGeometry(3, 4, 300, 300);
      
      material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        displacementMap: texture,
        displacementScale: 0.8, // Depth pop
        displacementBias: -0.1,
        roughness: 0.5,
        metalness: 0.2,
        alphaTest: 0.05,
      });

      const characterMesh = new THREE.Mesh(geometry, material);
      characterMesh.castShadow = true;
      characterMesh.position.y = 0;
      scene.add(characterMesh);

      // Clean Backing
      const backGeom = new THREE.PlaneGeometry(3.02, 4.02);
      const backMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
      const backPlane = new THREE.Mesh(backGeom, backMat);
      backPlane.position.z = -0.02;
      characterMesh.add(backPlane);

      setLoading(false);
    });

    // --- Animation Loop ---
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [image]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          3D Character Inspector
        </h2>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
          Professional Studio View
        </p>
      </div>
      
      <div className="relative w-full aspect-video bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden border border-white/5">
        <div ref={mountRef} className="w-full h-full cursor-move" />
        
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
            <p className="text-white/40 font-medium uppercase tracking-tighter text-[10px]">Processing Volumetric Data</p>
          </div>
        )}

        {/* Minimal Control Hint */}
        <div className="absolute bottom-6 left-6 text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] pointer-events-none">
          Rotate: Left Click • Pan: Right Click • Zoom: Scroll
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <Button onClick={() => controlsRef.current?.reset()} variant="secondary">Reset Camera</Button>
        <Button onClick={onReset} variant="primary">New Concept</Button>
      </div>
    </div>
  );
};