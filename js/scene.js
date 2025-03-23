import { GAME_CONFIG, RENDER_CONFIG } from './config.js';
import { renderer } from './renderer.js';
import { sceneEnhancer } from './sceneEnhancer.js';
import * as THREE from 'three';


class Scene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.ground = null;
        this.player = null;
        this.isRunning = false;
        this.speed = 0;
        this.targetSpeed = 0;
        this.terrainSystem = {
            grounds: [],
            decorations: [],
            segmentLength: GAME_CONFIG.terrainSegmentLength,
            segmentWidth: GAME_CONFIG.terrainWidth,
            activeSegments: GAME_CONFIG.activeTerrainSegments,
            decorationsPerSegment: GAME_CONFIG.decorationsPerSegment,
            maxDecorationsPool: GAME_CONFIG.maxDecorationsPool,
            lastGeneratedZ: 0
        };
        this.decorationPool = [];
        this.fps = 0;
        this.frameCount = 0;
        this.fpsUpdateInterval = 1000; 
        this.lastFpsUpdate = performance.now();
    }

    async init() {
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initTerrain();
        
        // 初始化场景增强器
        sceneEnhancer.scene = this.scene;
        sceneEnhancer.init();
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    initScene() {
        this.scene.background = new THREE.Color(0x87ceeb);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 10000);
        this.camera.position.set(0, 2, -5);
        this.camera.lookAt(0, 0, 5);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: false,
            powerPreference: 'high-performance',
            precision: 'lowp',
            logarithmicDepthBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap; 
        
        this.renderer.dispose = function() {
            this.forceContextLoss();
            this.domElement = null;
            this.context = null;
        };
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    initTerrain() {
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.8,
            metalness: 0.2
        });

        // 创建初始树木池
        for (let i = 0; i < this.terrainSystem.maxDecorationsPool; i++) {
            this.createNewDecoration();
        }

        for (let i = 0; i < this.terrainSystem.activeSegments; i++) {
            const groundGeometry = new THREE.PlaneGeometry(
                this.terrainSystem.segmentWidth,
                this.terrainSystem.segmentLength
            );
            const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
            groundMesh.rotation.x = -Math.PI / 2;
            groundMesh.receiveShadow = true;
            groundMesh.position.z = i * this.terrainSystem.segmentLength;
            this.scene.add(groundMesh);
            this.terrainSystem.grounds.push(groundMesh);
            this.terrainSystem.lastGeneratedZ = (i + 1) * this.terrainSystem.segmentLength;

            // 为每个初始地形段添加更多的树木
            this.addDecorationsToSegment(i);
        }
    }

    addDecorationsToSegment(segmentIndex) {
        const newSegmentDecorations = Math.floor(this.terrainSystem.decorationsPerSegment * 2);
        for (let i = 0; i < newSegmentDecorations && this.decorationPool.length > 0; i++) {
            const decoration = this.decorationPool.pop();
            decoration.visible = true;

            const x = (Math.random() - 0.5) * (this.terrainSystem.segmentWidth - 10);
            const z = segmentIndex * this.terrainSystem.segmentLength + Math.random() * this.terrainSystem.segmentLength;
            decoration.position.set(x, 0, z);

            decoration.rotation.y = Math.random() * Math.PI * 2;
            const scale = 0.5 + Math.random() * 0.5;
            decoration.scale.set(scale, scale, scale);

            this.terrainSystem.decorations.push(decoration);
        }
    }

    updateSpeed(speed) {
        this.speed = speed;
        
        // 增强摄像机高度变化和左右摇摆
        const cameraHeight = 2 + Math.sin(performance.now() * 0.005) * (speed * 0.08); 
        const cameraX = Math.cos(performance.now() * 0.003) * (speed * 0.06); 
        
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, cameraHeight, 0.15); 
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, cameraX, 0.15); 
        
        // 为移动设备设置更高的速度系数
        let speedMultiplier = 0.02; // PC端默认系数
        
        // 检测是否为移动设备，使用导入的renderer对象
        if (renderer && renderer.isMobile) {
            speedMultiplier = 0.18; // 移动端使用更高的系数
        }
        
        // 应用速度系数
        this.camera.position.z += speed * speedMultiplier;
        
        // 调整视角，增强前进感
        const lookAtPoint = new THREE.Vector3(
            0,
            this.camera.position.y + 0.5,
            this.camera.position.z + 15 // 增加前视距离
        );
        this.camera.lookAt(lookAtPoint);

        // 更新场景增强器
        sceneEnhancer.update(this.camera.position);

        this.updateTerrain();
    }

    updateTerrain() {
        const cameraZ = this.camera.position.z;
        
        if (cameraZ + this.terrainSystem.segmentLength > this.terrainSystem.lastGeneratedZ - this.terrainSystem.segmentLength) {
            const oldGround = this.terrainSystem.grounds.shift();
            if (oldGround) {
                oldGround.position.z = this.terrainSystem.lastGeneratedZ;
                this.terrainSystem.grounds.push(oldGround);
                
                this.terrainSystem.lastGeneratedZ += this.terrainSystem.segmentLength;
            }
            
            // 修改：只回收真正远离视野的树木，增加距离判断
            const decorationsToRecycle = this.terrainSystem.decorations.filter(decoration => {
                return decoration.position.z < cameraZ - this.terrainSystem.segmentLength * 6; // 增加距离，从4倍增加到6倍
            });
            
            decorationsToRecycle.forEach(decoration => {
                decoration.visible = false;
                this.decorationPool.push(decoration);
            });
            
            this.terrainSystem.decorations = this.terrainSystem.decorations.filter(
                decoration => !decorationsToRecycle.includes(decoration)
            );
            
            const newSegmentStart = this.terrainSystem.lastGeneratedZ - this.terrainSystem.segmentLength;
            const newSegmentEnd = this.terrainSystem.lastGeneratedZ;
            
            // 修改：确保每个新段都有足够的装饰物，不受速度影响
            const decorationsToAdd = Math.max(30, Math.floor(this.terrainSystem.decorationsPerSegment));
            
            this.ensureDecorationPool();
            
            for (let i = 0; i < decorationsToAdd; i++) {
                if (this.decorationPool.length === 0) {
                    this.createNewDecoration();
                }
                
                const decoration = this.decorationPool.pop();
                if (!decoration) continue;
                
                const z = newSegmentStart + (Math.random() * this.terrainSystem.segmentLength);
                const x = (Math.random() - 0.5) * this.terrainSystem.segmentWidth * 0.9;
                
                decoration.position.set(x, 0, z);

                decoration.rotation.y = Math.random() * Math.PI * 2;
                decoration.visible = true;
                
                // 保持一致的大小
                decoration.scale.setScalar(1.0);
                
                if (!this.scene.children.includes(decoration)) {
                    this.scene.add(decoration);
                }
                
                this.terrainSystem.decorations.push(decoration);
            }
        }
        
        // 确保所有树木都可见
        this.terrainSystem.decorations.forEach(decoration => {
            const distanceToCamera = Math.abs(decoration.position.z - cameraZ);
            let targetScale = 1.0;
            
            if (distanceToCamera > 150) {
                targetScale = 0.5;
            } else if (distanceToCamera > 100) {
                targetScale = 0.8;
            }
            
            decoration.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
            
            // 确保所有树木都可见
            decoration.visible = true;
        });
    }
    
    ensureDecorationPool() {
        // 增加最小池大小，确保有足够的树木可以使用
        const minPoolSize = Math.max(50, this.terrainSystem.decorationsPerSegment * 2); // 从30增加到50，并确保至少是每段装饰物的2倍
        
        // 如果装饰物池太小，创建更多的装饰物
        while (this.decorationPool.length < minPoolSize && 
               this.decorationPool.length + this.terrainSystem.decorations.length < this.terrainSystem.maxDecorationsPool) {
            this.createNewDecoration();
        }
        
        // 如果总装饰物数量不足，也创建更多装饰物
        const totalDecorations = this.decorationPool.length + this.terrainSystem.decorations.length;
        if (totalDecorations < this.terrainSystem.maxDecorationsPool * 0.9) { // 从0.8增加到0.9，更积极地创建树木
            const decorationsToCreate = Math.min(
                30, // 从20增加到30，每次创建更多树木
                this.terrainSystem.maxDecorationsPool - totalDecorations
            );
            
            for (let i = 0; i < decorationsToCreate; i++) {
                this.createNewDecoration();
            }
        }
    }
    
    
    createNewDecoration() {
        // 只创建树木类型，但有不同形状
        const treeTypes = [
            // 尖形树
            { 
                geometry: new THREE.CylinderGeometry(0, 1, 4, 4), 
                color: 0x228B22, 
                scale: 1.5,
                height: 3.5
            },
            // 更尖的树
            { 
                geometry: new THREE.CylinderGeometry(0, 1.2, 6, 6), 
                color: 0x228B32, 
                scale: 1.3,
                height: 4
            },
            // 圆形树冠
            { 
                geometry: new THREE.SphereGeometry(0.8, 8, 8), 
                color: 0x006400, 
                scale: 1.3,
                height: 3
            },
            // 椭圆形树冠
            {
                geometry: new THREE.SphereGeometry(1.2, 8, 8),
                color: 0x228B22,
                scale: 1.2,
                height: 3.2
            }

        ];
        
        const typeIndex = Math.floor(Math.random() * treeTypes.length);
        const type = treeTypes[typeIndex];
        
        // 创建树木
        const tree = new THREE.Group();
        
        // 创建树冠
        const crownMaterial = new THREE.MeshStandardMaterial({ color: type.color });
        const crown = new THREE.Mesh(type.geometry, crownMaterial);
        crown.position.y = type.height;
        crown.castShadow = true;
        tree.add(crown);
        
        // 创建树干
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.2, type.height * 0.7, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = type.height * 0.35;
        trunk.castShadow = true;
        tree.add(trunk);

        // 随机缩放树木，使其大小多样化
        const scale = 0.8 + Math.random() * 0.4;
        tree.scale.set(scale, scale, scale);

        // 随机生成树木的位置
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;
        const treePosition = {
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            scale: 0.5 + Math.random() * 0.5
        };
        tree.position.set(treePosition.x, treePosition.y, 0);

        // 将树木添加到场景和装饰物池
        this.scene.add(tree);
        this.decorationPool.push(tree);
    }

    setRunningState(isRunning, targetSpeed) {
        this.isRunning = isRunning;
        this.targetSpeed = Math.min(targetSpeed, GAME_CONFIG.maxSpeed);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    optimizePerformance() {
        const { dynamicQuality, lodDistances } = RENDER_CONFIG;
        
        // 动态质量调整
        if (dynamicQuality && this.fps < 30) {
            // 如果FPS低于30，逐步降低质量
            if (this.renderer.getPixelRatio() > 1) {
                this.renderer.setPixelRatio(this.renderer.getPixelRatio() - 0.25);
            }
            
            // 修改：不再隐藏任何树木，即使在低FPS情况下
            // 确保所有树木都可见
            this.terrainSystem.decorations.forEach(d => {
                d.visible = true;
            });
        }
    }

    // 确保所有树木始终可见的辅助方法
    ensureTreesVisible() { 
        this.terrainSystem.decorations.forEach(decoration => { 
            decoration.visible = true; 
        }); 
    }

    render() {
        if (!this.renderer) return;
        
        // 计算FPS
        const now = performance.now();
        this.frameCount++;
        
        if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.lastFpsUpdate = now;
            this.frameCount = 0;
            
            // 每秒执行一次性能优化
            this.optimizePerformance();
        }
        
        // // 平滑过渡到目标速度
        // if (this.isRunning) {
        //     this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, 0.05);
        // } else {
        //     this.speed = THREE.MathUtils.lerp(this.speed, 0, 0.1);
        // }
        
        // // 更新速度
        // this.updateSpeed(this.speed);
        
        // // 确保所有树木可见
        this.ensureTreesVisible();
        
        // 渲染场景
        const directionalLight = this.scene.children.find(child => child instanceof THREE.DirectionalLight);
        if (directionalLight) {
            directionalLight.position.set(
                this.camera.position.x + 50,
                50,
                this.camera.position.z
            );
            directionalLight.target.position.set(
                this.camera.position.x,
                0,
                this.camera.position.z
            );
            directionalLight.target.updateMatrixWorld();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

export const sceneManager = new Scene();
