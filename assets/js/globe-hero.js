// Globe Hero Animation with Attack Visualization
// Optimized for performance with memory leak prevention
// Uses global THREE variable from CDN

// Performance Configuration
const MAX_ACTIVE_ATTACKS = 30;
const ATTACK_CLEANUP_TIME = 10000;
const FPS_TARGET = 30;
const UI_UPDATE_THROTTLE = 100;

class GlobeHero {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Globe container not found:', containerId);
            return;
        }

        // Check if THREE is available
        if (typeof THREE === 'undefined') {
            console.error('THREE.js is not loaded. Make sure to include it before this script.');
            return;
        }

        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );

        // Renderer with optimizations
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Globe properties
        this.globe = null;
        this.attacks = [];
        this.attackCounter = 0;
        this.lastUIUpdate = 0;

        // Performance monitoring
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.currentFPS = 60;
        this.quality = 1.0;

        // Animation state
        this.animationId = null;
        this.isRunning = false;

        this.init();
    }

    init() {
        this.camera.position.z = 2.5;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);

        // Create globe
        this.createGlobe();

        // Start animation
        this.start();

        // Handle window resize
        this.resizeHandler = () => this.onWindowResize();
        window.addEventListener('resize', this.resizeHandler);

        // Start attack simulation
        this.startAttackSimulation();
    }

    createGlobe() {
        const geometry = new THREE.SphereGeometry(1, 64, 64);

        const material = new THREE.MeshPhongMaterial({
            color: 0x2194ce,
            emissive: 0x112244,
            specular: 0x333333,
            shininess: 5,
            transparent: false,
            wireframe: false
        });

        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);
    }

    createAttackArc(startLat, startLon, endLat, endLon) {
        // Limit active attacks
        if (this.attacks.length >= MAX_ACTIVE_ATTACKS) {
            const oldestAttack = this.attacks.shift();
            this.removeAttackFromScene(oldestAttack);
        }

        const start = this.latLonToVector3(startLat, startLon, 1.01);
        const end = this.latLonToVector3(endLat, endLon, 1.01);

        const pointCount = Math.floor(50 * this.quality);
        const curve = new THREE.QuadraticBezierCurve3(
            start,
            this.getMidPoint(start, end, 0.3),
            end
        );

        const points = curve.getPoints(pointCount);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });

        const arc = new THREE.Line(geometry, material);

        const attack = {
            arc: arc,
            startTime: Date.now(),
            progress: 0,
            totalPoints: points.length
        };

        this.scene.add(arc);
        this.attacks.push(attack);
        this.attackCounter++;

        const now = Date.now();
        if (now - this.lastUIUpdate > UI_UPDATE_THROTTLE) {
            this.updateAttackCounter();
            this.lastUIUpdate = now;
        }

        return attack;
    }

    removeAttackFromScene(attack) {
        if (attack && attack.arc) {
            this.scene.remove(attack.arc);
            if (attack.arc.geometry) attack.arc.geometry.dispose();
            if (attack.arc.material) attack.arc.material.dispose();
        }
    }

    latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        return new THREE.Vector3(x, y, z);
    }

    getMidPoint(start, end, height) {
        const mid = new THREE.Vector3()
            .addVectors(start, end)
            .multiplyScalar(0.5);

        mid.normalize();
        mid.multiplyScalar(1 + height);

        return mid;
    }

    startAttackSimulation() {
        const attackOrigins = [
            { lat: 55.7558, lon: 37.6173, name: 'Moscow' },
            { lat: 39.9042, lon: 116.4074, name: 'Beijing' },
            { lat: 35.6762, lon: 51.4244, name: 'Tehran' },
            { lat: 40.7128, lon: -74.0060, name: 'New York' },
            { lat: 37.5665, lon: 126.9780, name: 'Seoul' }
        ];

        const targets = [
            { lat: 37.7749, lon: -122.4194, name: 'San Francisco' },
            { lat: 51.5074, lon: -0.1278, name: 'London' },
            { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
            { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
            { lat: 52.5200, lon: 13.4050, name: 'Berlin' }
        ];

        this.attackInterval = setInterval(() => {
            const origin = attackOrigins[Math.floor(Math.random() * attackOrigins.length)];
            const target = targets[Math.floor(Math.random() * targets.length)];

            this.createAttackArc(
                origin.lat,
                origin.lon,
                target.lat,
                target.lon
            );
        }, 500);
    }

    cleanupOldAttacks() {
        const now = Date.now();
        this.attacks = this.attacks.filter(attack => {
            if (now - attack.startTime > ATTACK_CLEANUP_TIME) {
                this.removeAttackFromScene(attack);
                return false;
            }
            return true;
        });
    }

    updateAttackCounter() {
        const counterElement = document.getElementById('attack-counter');
        if (counterElement) {
            counterElement.textContent = this.attackCounter.toLocaleString();
        }
    }

    monitorPerformance() {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastFrameTime;

        if (delta >= 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastFrameTime = now;

            // Auto-adjust quality
            if (this.currentFPS < FPS_TARGET * 0.8) {
                this.quality = Math.max(0.5, this.quality - 0.1);
            } else if (this.currentFPS > FPS_TARGET * 1.2 && this.quality < 1.0) {
                this.quality = Math.min(1.0, this.quality + 0.1);
            }
        }
    }

    animate() {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // Rotate globe
        if (this.globe) {
            this.globe.rotation.y += 0.001;
        }

        // Update attack arcs
        this.attacks.forEach(attack => {
            if (attack.arc && attack.arc.material) {
                attack.progress += 0.02;
                attack.arc.material.opacity = 0.4 + Math.sin(attack.progress) * 0.4;
            }
        });

        // Periodic cleanup
        if (Math.random() < 0.01) {
            this.cleanupOldAttacks();
        }

        // Performance monitoring
        this.monitorPerformance();

        this.renderer.render(this.scene, this.camera);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = null;
        }
    }

    onWindowResize() {
        if (!this.container) return;

        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    dispose() {
        this.stop();

        // Remove all attacks
        this.attacks.forEach(attack => this.removeAttackFromScene(attack));
        this.attacks = [];

        // Dispose globe
        if (this.globe) {
            if (this.globe.geometry) this.globe.geometry.dispose();
            if (this.globe.material) this.globe.material.dispose();
            this.scene.remove(this.globe);
        }

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        // Remove event listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
    }
}

// Function to initialize globe when dependencies are ready
function initGlobe() {
    if (typeof THREE === 'undefined') {
        console.error('❌ THREE.js not loaded');
        return null;
    }

    console.log('✅ Initializing globe...');
    const globeHero = new GlobeHero('globe-container');

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (globeHero) {
            globeHero.dispose();
        }
    });

    return globeHero;
}

// Make initGlobe available globally
window.initGlobe = initGlobe;

// Auto-initialize if DOM is ready and THREE is available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof THREE !== 'undefined') {
            initGlobe();
        }
    });
} else {
    if (typeof THREE !== 'undefined') {
        initGlobe();
    }
}