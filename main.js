import * as THREE from 'three';
import { gsap } from 'gsap';

class PortfolioScene {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        this.init();
        this.createGeometry();
        this.animate();
        this.setupEventListeners();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.z = 5;

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }

    createGeometry() {
        // Create a group to hold all geometries
        this.geometryGroup = new THREE.Group();
        this.scene.add(this.geometryGroup);

        // Create main torus
        const torusGeometry = new THREE.TorusGeometry(1, 0.3, 16, 100);
        const torusMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            metalness: 0.7,
            roughness: 0.2,
        });
        this.torus = new THREE.Mesh(torusGeometry, torusMaterial);
        this.geometryGroup.add(this.torus);

        // Create floating particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 1000;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 10;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.02,
            color: 0xffffff,
        });

        this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
        this.geometryGroup.add(this.particles);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Rotate torus
        this.torus.rotation.x += 0.01;
        this.torus.rotation.y += 0.005;

        // Rotate particles
        this.particles.rotation.y += 0.001;

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Handle mouse movement
        window.addEventListener('mousemove', (event) => {
            const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

            gsap.to(this.geometryGroup.rotation, {
                x: mouseY * 0.3,
                y: mouseX * 0.3,
                duration: 1,
            });
        });

        // Handle scroll
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            const scrollProgress = scrollY / windowHeight;

            // Adjust camera position based on scroll
            gsap.to(this.camera.position, {
                z: 5 + scrollProgress * 2,
                duration: 0.5
            });

            // Adjust geometry group position and rotation based on scroll
            gsap.to(this.geometryGroup.position, {
                y: -scrollProgress * 2,
                duration: 0.5
            });

            gsap.to(this.geometryGroup.rotation, {
                x: scrollProgress * 0.5,
                y: scrollProgress * 0.5,
                duration: 0.5
            });

            // Adjust opacity of particles based on scroll
            gsap.to(this.particles.material, {
                opacity: 1 - scrollProgress * 0.5,
                duration: 0.5
            });
        });

        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// Initialize the scene
new PortfolioScene(); 