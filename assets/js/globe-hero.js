/**
 * Globe Hero - Interactive 3D Globe with Memory Management
 * Optimized for performance and RAM stability
 */

// ========================================
// MEMORY MANAGEMENT & LIFECYCLE
// ========================================

let animationFrameId = null;
let isAnimating = false;
let globeRenderer = null;
let globeScene = null;
let globeCamera = null;
let globeMesh = null;
let controls = null;

// Pause animation when page is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('🌍 Globe: Page hidden, pausing animation');
    pauseAnimation();
  } else {
    console.log('🌍 Globe: Page visible, resuming animation');
    resumeAnimation();
  }
});

// Pause when scrolled off screen
const globeElement = document.getElementById('globe-hero');
if (globeElement) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        console.log('🌍 Globe: In view, animating');
        resumeAnimation();
      } else {
        console.log('🌍 Globe: Out of view, pausing');
        pauseAnimation();
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '100px' // Start animating slightly before in view
  });

  observer.observe(globeElement);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  console.log('🌍 Globe: Page unloading, cleaning up');
  cleanupGlobe();
});

// Helper functions
function pauseAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  isAnimating = false;
}

function resumeAnimation() {
  if (!isAnimating && globeRenderer && globeScene && globeCamera) {
    isAnimating = true;
    animate();
  }
}

function cleanupGlobe() {
  // Cancel animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Dispose renderer
  if (globeRenderer) {
    globeRenderer.dispose();
    globeRenderer.forceContextLoss();
    globeRenderer.domElement = null;
    globeRenderer = null;
  }

  // Dispose scene objects
  if (globeScene) {
    globeScene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => {
            disposeMaterial(material);
          });
        } else {
          disposeMaterial(object.material);
        }
      }
    });
    globeScene = null;
  }

  // Clear references
  globeCamera = null;
  globeMesh = null;
  controls = null;
  isAnimating = false;
}

function disposeMaterial(material) {
  if (!material) return;

  // Dispose textures
  if (material.map) material.map.dispose();
  if (material.lightMap) material.lightMap.dispose();
  if (material.bumpMap) material.bumpMap.dispose();
  if (material.normalMap) material.normalMap.dispose();
  if (material.specularMap) material.specularMap.dispose();
  if (material.envMap) material.envMap.dispose();

  // Dispose material
  material.dispose();
}

// ========================================
// GLOBE INITIALIZATION
// ========================================

// Import Three.js from CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Initialize globe
function initGlobe() {
  const container = document.getElementById('globe-hero');
  if (!container) {
    console.error('Globe container not found');
    return;
  }

  // Scene
  const scene = new THREE.Scene();
  globeScene = scene;

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45, // FOV
    container.clientWidth / container.clientHeight, // Aspect ratio
    0.1, // Near plane
    1000 // Far plane
  );
  camera.position.z = 2.5;
  globeCamera = camera;

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power' // Optimize for battery/power
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
  container.appendChild(renderer.domElement);
  globeRenderer = renderer;

  // Globe geometry
  const geometry = new THREE.SphereGeometry(1, 64, 64);

  // Globe material with gradient/texture
  const material = new THREE.MeshPhongMaterial({
    color: 0x667eea,
    emissive: 0x112244,
    emissiveIntensity: 0.3,
    shininess: 20,
    transparent: true,
    opacity: 0.9,
    wireframe: false
  });

  // Create globe mesh
  const globe = new THREE.Mesh(geometry, material);
  scene.add(globe);
  globeMesh = globe;

  // Add wireframe overlay
  const wireframeGeometry = new THREE.SphereGeometry(1.01, 32, 32);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x8ab4ff,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
  scene.add(wireframe);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 3, 5);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0x667eea, 1, 100);
  pointLight.position.set(-5, 3, 5);
  scene.add(pointLight);

  // Add glow effect (outer atmosphere)
  const glowGeometry = new THREE.SphereGeometry(1.1, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x667eea,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  scene.add(glow);

  // Handle window resize
  function onWindowResize() {
    if (!container || !globeCamera || !globeRenderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    globeCamera.aspect = width / height;
    globeCamera.updateProjectionMatrix();
    globeRenderer.setSize(width, height);
  }

  window.addEventListener('resize', onWindowResize);

  // Start animation
  console.log('🌍 Globe initialized');
  isAnimating = true;
  animate();
}

// ========================================
// ANIMATION LOOP
// ========================================

function animate() {
  // Check if should continue animating
  if (!isAnimating) {
    console.log('🌍 Globe: Animation stopped');
    return;
  }

  // Schedule next frame
  animationFrameId = requestAnimationFrame(animate);

  // Rotate globe
  if (globeMesh) {
    globeMesh.rotation.y += 0.001; // Slow rotation
  }

  // Render scene
  if (globeRenderer && globeScene && globeCamera) {
    globeRenderer.render(globeScene, globeCamera);
  }
}

// ========================================
// INITIALIZE ON LOAD
// ========================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobe);
} else {
  initGlobe();
}

// Export for debugging (optional)
window.globeDebug = {
  pause: pauseAnimation,
  resume: resumeAnimation,
  cleanup: cleanupGlobe,
  getStats: () => ({
    isAnimating,
    hasRenderer: !!globeRenderer,
    hasScene: !!globeScene,
    hasCamera: !!globeCamera,
    hasMesh: !!globeMesh
  })
};

console.log('🌍 Globe module loaded - use window.globeDebug for controls');