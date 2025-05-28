import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class ModelViewer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('viewer'),
            antialias: true
        });
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.loader = new GLTFLoader();
        this.currentModel = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        this.annotations = [];
        this.isAnnotationsMode = false;
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0xffffff);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Setup camera
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Setup controls
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 50;

        // Enhanced lighting setup with increased brightness
        // Ambient light for overall scene brightness
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        // Main directional light (sun-like)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Fill light from opposite direction
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        // Rim light for edge highlighting
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(0, 5, -5);
        this.scene.add(rimLight);

        // Add grid helper
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Drag and drop
        const dropZone = document.getElementById('drop-zone');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
                this.loadModel(file);
            }
        });

        // UI Controls
        document.getElementById('reset-camera').addEventListener('click', () => this.resetCamera());
        document.getElementById('toggle-wireframe').addEventListener('click', () => this.toggleWireframe());
        document.getElementById('toggle-theme').addEventListener('click', () => this.toggleTheme());
        document.getElementById('toggle-annotations').addEventListener('click', () => this.toggleAnnotations());

        // Click for annotations
        this.renderer.domElement.addEventListener('click', (e) => this.handleClick(e));
    }

    async loadModel(file) {
        const loadingSpinner = document.getElementById('loading-spinner');
        loadingSpinner.style.display = 'block';

        try {
            const url = URL.createObjectURL(file);
            const gltf = await this.loader.loadAsync(url);
            
            // Remove old model and animations
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
                if (this.mixer) {
                    this.mixer.stopAllAction();
                    this.mixer = null;
                }
            }

            this.currentModel = gltf.scene;
            this.scene.add(this.currentModel);

            // Setup animations if they exist
            if (gltf.animations && gltf.animations.length) {
                this.mixer = new THREE.AnimationMixer(this.currentModel);
                gltf.animations.forEach(clip => {
                    const action = this.mixer.clipAction(clip);
                    action.play();
                });
            }

            // Center and scale model
            const box = new THREE.Box3().setFromObject(this.currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim;
            this.currentModel.scale.setScalar(scale);
            
            this.currentModel.position.sub(center.multiplyScalar(scale));
            
            // Reset camera
            this.resetCamera();
        } catch (error) {
            console.error('Error loading model:', error);
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    resetCamera() {
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }

    toggleWireframe() {
        if (this.currentModel) {
            this.currentModel.traverse((child) => {
                if (child.isMesh) {
                    child.material.wireframe = !child.material.wireframe;
                }
            });
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        this.renderer.setClearColor(
            document.body.classList.contains('dark-theme') ? 0x1a1a1a : 0xffffff
        );
    }

    toggleAnnotations() {
        this.isAnnotationsMode = !this.isAnnotationsMode;
        document.getElementById('toggle-annotations').classList.toggle('active');
    }

    handleClick(event) {
        if (!this.isAnnotationsMode || !this.currentModel) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

        const intersects = raycaster.intersectObject(this.currentModel, true);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.addAnnotation(point);
        }
    }

    addAnnotation(point) {
        const annotation = document.createElement('div');
        annotation.className = 'annotation';
        annotation.style.position = 'absolute';
        annotation.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
        annotation.style.color = 'white';
        annotation.style.padding = '5px 10px';
        annotation.style.borderRadius = '4px';
        annotation.style.fontSize = '14px';
        annotation.textContent = 'Annotation ' + (this.annotations.length + 1);

        const vector = point.clone();
        vector.project(this.camera);

        const x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
        const y = -(vector.y * 0.5 - 0.5) * this.renderer.domElement.clientHeight;

        annotation.style.left = x + 'px';
        annotation.style.top = y + 'px';

        this.renderer.domElement.parentElement.appendChild(annotation);
        this.annotations.push({ element: annotation, point: point });
    }

    updateAnnotations() {
        this.annotations.forEach(annotation => {
            const vector = annotation.point.clone();
            vector.project(this.camera);

            const x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
            const y = -(vector.y * 0.5 - 0.5) * this.renderer.domElement.clientHeight;

            annotation.element.style.left = x + 'px';
            annotation.element.style.top = y + 'px';
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update animations
        if (this.mixer) {
            this.mixer.update(this.clock.getDelta());
        }
        
        this.controls.update();
        this.updateAnnotations();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the viewer
new ModelViewer(); 