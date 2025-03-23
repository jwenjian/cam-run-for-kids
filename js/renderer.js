import { SKELETON_CONFIG, RENDER_CONFIG, GAME_CONFIG } from './config.js';
import { shadowRenderer } from './shadowRenderer.js';

class Renderer {
    constructor() {
        this.skeletonCanvas = null;
        this.skeletonCtx = null;
        this.initialized = false;
        this.isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.frameTimes = [];
        this.lastFrameTime = performance.now();
        this.memoryUsage = {
            jsHeapSizeLimit: 0,
            totalJSHeapSize: 0,
            usedJSHeapSize: 0
        };
        this.fps = 0;
        this.memory = 0;
        this.lastMemoryCheck = 0;
        this.debugElement = null;
        
        // 不活动检测
        this.lastActivityTime = performance.now();
        this.isInactive = false;
        this.inactivityThreshold = GAME_CONFIG.mobileOptimization.inactivityTimeout || 30000; // 默认30秒
    }

    init() {
        if (this.initialized) return;

        this.initSkeletonCanvas();
        shadowRenderer.init();
        this.addTouchListeners();
        
        // 初始化调试元素
        this.debugElement = document.getElementById('debug');
        
        // 初始化骨骼渲染优化
        initSkeletonOptimization();
        
        this.initialized = true;
    }

    initSkeletonCanvas() {
        this.skeletonCanvas = document.getElementById('skeletonCanvas');
        if (!this.skeletonCanvas) {
            console.error('找不到骨骼画布元素');
            return;
        }
        this.skeletonCtx = this.skeletonCanvas.getContext('2d');
        const width = this.isMobile ? window.innerWidth * 0.8 : 320;
        const height = this.isMobile ? width * 0.75 : 240;
        this.skeletonCanvas.width = width;
        this.skeletonCanvas.height = height;
    }

    addTouchListeners() {
        if (!this.skeletonCanvas) return;

        this.skeletonCanvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.skeletonCanvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    handleTouchStart(event) {
        // 更新活动时间戳
        this.lastActivityTime = performance.now();
        
        // 如果处于不活动状态，则恢复正常模式
        if (this.isInactive) {
            this.isInactive = false;
            console.log('检测到触摸，恢复正常模式');
            
            // 恢复阴影渲染频率
            if (typeof shadowRenderer !== 'undefined' && shadowRenderer) {
                shadowRenderer.renderInterval = this.isMobile ? 100 : 50;
            }
            
            // 恢复FPS上限
            if (typeof RENDER_CONFIG !== 'undefined' && RENDER_CONFIG && RENDER_CONFIG.mobile) {
                RENDER_CONFIG.mobile.maxFPS = 30;
            }
        }
        
        if (event.touches.length > 0) {
            this.touchStartX = event.touches[0].clientX;
            this.touchStartY = event.touches[0].clientY;
        }
    }

    handleTouchEnd(event) {
        // 更新活动时间戳
        this.lastActivityTime = performance.now();
        
        if (event.changedTouches.length > 0) {
            this.touchEndX = event.changedTouches[0].clientX;
            this.touchEndY = event.changedTouches[0].clientY;
            this.handleGesture();
        }
    }

    handleGesture() {
        const dx = this.touchEndX - this.touchStartX;
        const dy = this.touchEndY - this.touchStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) { // 最小滑动距离
            if (Math.abs(dx) > Math.abs(dy)) {
                // 水平滑动
                if (dx > 0) {
                    this.onSwipeRight();
                } else {
                    this.onSwipeLeft();
                }
            } else {
                // 垂直滑动
                if (dy > 0) {
                    this.onSwipeDown();
                } else {
                    this.onSwipeUp();
                }
            }
        }
    }

    onSwipeRight() {
        const speed = Math.min(GAME_CONFIG.maxSpeed, GAME_CONFIG.maxSpeed + 0.5);
        GAME_CONFIG.maxSpeed = speed;
        console.log(`速度增加到: ${speed.toFixed(1)} m/s`);
        console.log('Swipe right');
    }

    onSwipeLeft() {
        const speed = Math.max(1, GAME_CONFIG.maxSpeed - 0.5);
        GAME_CONFIG.maxSpeed = speed;
        console.log(`速度降低到: ${speed.toFixed(1)} m/s`);
        console.log('Swipe left');
    }

    onSwipeDown() {
        shadowRenderer.SHADOW_QUALITY = (shadowRenderer.SHADOW_QUALITY + 1) % 3;
        const quality = ['低', '中', '高'][shadowRenderer.SHADOW_QUALITY];
        console.log(`阴影质量调整为: ${quality}`);
        console.log('Swipe down');
    }

    onSwipeUp() {
        const debugInfo = document.getElementById('debug');
        if (debugInfo) {
            debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
            console.log(`调试信息${debugInfo.style.display === 'none' ? '隐藏' : '显示'}`);
        }
        console.log('Swipe up');
    }

    clearCanvas(ctx) {
        if (!ctx || !ctx.canvas) return;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    updatePerformanceMetrics() {
        const now = performance.now();
        
        // 计算帧率
        if (this.lastFrameTime) {
            const frameTime = now - this.lastFrameTime;
            this.frameTimes.push(frameTime);
            
            // 限制帧时间数组大小
            if (this.frameTimes.length > 30) {
                this.frameTimes.shift();
            }
            
            // 计算平均帧率 - 使用更长的时间窗口计算平均值
            if (this.frameTimes.length >= 10) {
                const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
                this.fps = Math.round(1000 / avgFrameTime);
                
                // 更新shadowRenderer的帧时间历史
                if (typeof shadowRenderer !== 'undefined' && shadowRenderer) {
                    shadowRenderer.frameTimeHistory.push(frameTime);
                    if (shadowRenderer.frameTimeHistory.length > shadowRenderer.maxFrameTimeHistoryLength) {
                        shadowRenderer.frameTimeHistory.shift();
                    }
                    
                    // 加快性能检测 - 只在足够帧数和性能测试未完成时进行检测
                    if (shadowRenderer.frameTimeHistory.length >= 15 && !shadowRenderer.performanceTestCompleted) {
                        shadowRenderer.detectDevicePerformance();
                    }
                    
                    // 减少质量调整的频率 - 只有每20秒才检查一次
                    if (shadowRenderer.performanceTestCompleted && now - shadowRenderer.lastAdaptiveCheck > 20000) {
                        shadowRenderer.lastAdaptiveCheck = now;
                        shadowRenderer.adaptQualityBasedOnPerformance();
                    }
                    
                    // 电脑端保持高质量阴影的逻辑 - 添加冷却时间和计数器
                    if (!this.isMobile && this.fps > 40 && shadowRenderer.SHADOW_QUALITY < 2 && shadowRenderer.performanceTestCompleted) {
                        // 只有当距离上次质量变化超过10秒时才考虑提高质量
                        if (now - shadowRenderer.lastQualityChangeTime > shadowRenderer.qualityChangeCooldown) {
                            shadowRenderer.SHADOW_QUALITY = 2;
                            shadowRenderer.lastQualityChangeTime = now;
                            shadowRenderer.qualityChangeCounter = 0;
                            console.log('电脑端恢复高质量阴影');
                        }
                    } else {
                        // 重置计数器
                        shadowRenderer.qualityChangeCounter = 0;
                    }
                }
            }
        }
        
        this.lastFrameTime = now;
        
        // 获取内存使用情况 (每2秒更新一次，减少频繁检查)
        if (now - this.lastMemoryCheck > 2000) {
            this.lastMemoryCheck = now;
            if (performance.memory) {
                const newMemory = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
                // 使用平滑过渡而不是突变
                this.memory = this.memory ? (this.memory * 0.7 + newMemory * 0.3) : newMemory;
            }
        }
        
        // 检查不活动状态
        this.checkInactivity(now);
        
        // 更新调试信息
        if (this.debugElement) {
            this.debugElement.textContent = `FPS: ${this.fps} | 内存: ${Math.round(this.memory)}MB | ${this.isInactive ? '不活动' : '活动中'} | 阴影质量: ${shadowRenderer ? shadowRenderer.SHADOW_QUALITY : 'N/A'}`;
        }
    }

    updateSkeleton(landmarks) {
        if (!landmarks) return;
        
        const now = performance.now();
        
        // 移动端骨骼渲染优化
        if (this.isMobile && MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.enabled) {
            // 节流渲染
            if (MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.throttleRender && 
                now - renderController.skeletonRenderer.lastRenderTime < MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.renderInterval) {
                return;
            }
            
            // 确保离屏渲染已初始化
            if (!renderController.skeletonRenderer.isInitialized) {
                initSkeletonOptimization();
                if (!renderController.skeletonRenderer.isInitialized) return;
            }
            
            // 清除离屏画布
            const offCtx = renderController.skeletonRenderer.offscreenCtx;
            offCtx.clearRect(0, 0, offCtx.canvas.width, offCtx.canvas.height);
            
            // 在离屏画布上绘制骨骼
            this.drawSkeleton(landmarks, offCtx);
            
            // 使用帧缓冲
            if (MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.frameBuffering) {
                // 获取当前缓冲区
                const currentBuffer = renderController.skeletonRenderer.buffers[
                    renderController.skeletonRenderer.currentBufferIndex
                ];
                
                // 将离屏画布内容复制到当前缓冲区
                currentBuffer.ctx.clearRect(0, 0, currentBuffer.canvas.width, currentBuffer.canvas.height);
                currentBuffer.ctx.drawImage(renderController.skeletonRenderer.offscreenCanvas, 0, 0);
                currentBuffer.timestamp = now;
                
                // 更新缓冲区索引
                renderController.skeletonRenderer.currentBufferIndex = 
                    (renderController.skeletonRenderer.currentBufferIndex + 1) % 
                    MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.bufferSize;
                
                // 将缓冲区内容绘制到实际画布
                this.skeletonCtx.clearRect(0, 0, this.skeletonCanvas.width, this.skeletonCanvas.height);
                this.skeletonCtx.drawImage(currentBuffer.canvas, 0, 0);
            } else {
                // 直接将离屏画布内容绘制到实际画布
                this.skeletonCtx.clearRect(0, 0, this.skeletonCanvas.width, this.skeletonCanvas.height);
                this.skeletonCtx.drawImage(renderController.skeletonRenderer.offscreenCanvas, 0, 0);
            }
            
            // 保存关键点用于插值
            if (MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.interpolation) {
                renderController.skeletonRenderer.previousLandmarks = [...landmarks];
            }
            
            renderController.skeletonRenderer.lastRenderTime = now;
            return;
        }
        
        // 移动端帧率控制（硬性限制）
        if (this.isMobile && now - renderController.lastFrame < 1000/MOBILE_RENDER_PRO.TARGET_FPS) {
            return;
        }

        // 渐进式批处理渲染（新增）
        const batchStart = renderController.currentBatch * MOBILE_RENDER_PRO.BATCH_SIZE;
        const batchEnd = batchStart + MOBILE_RENDER_PRO.BATCH_SIZE;
        
        MOBILE_RENDER_PRO.KEY_POINTS.slice(batchStart, batchEnd).forEach(i => {
            const matrix = renderController.matrixPool[
                (renderController.currentBatch) % MOBILE_RENDER_PRO.CACHE_POOL_SIZE
            ];
            // 仅更新关键节点...
        });

        renderController.currentBatch = 
            (renderController.currentBatch + 1) % 
            Math.ceil(MOBILE_RENDER_PRO.KEY_POINTS.length / MOBILE_RENDER_PRO.BATCH_SIZE);
        renderController.lastFrame = now;
        
        // 绘制骨骼
        this.clearCanvas(this.skeletonCtx);
        this.drawSkeleton(landmarks, this.skeletonCtx);
    }
    
    // 添加骨骼绘制方法
    drawSkeleton(landmarks, ctx) {
        if (!landmarks || !ctx) return;
        
        const { color, lineWidth, radius, connections } = SKELETON_CONFIG;
        
        // 绘制连接线
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        
        for (const [i, j] of connections) {
            if (landmarks[i] && landmarks[j]) {
                const start = landmarks[i];
                const end = landmarks[j];
                
                // 检查关键点可见性
                if (start.visibility < 0.5 || end.visibility < 0.5) continue;
                
                ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height);
                ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height);
            }
        }
        ctx.stroke();
        
        // 绘制关节点
        ctx.fillStyle = color;
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            if (landmark && landmark.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(
                    landmark.x * ctx.canvas.width,
                    landmark.y * ctx.canvas.height,
                    radius,
                    0,
                    2 * Math.PI
                );
                ctx.fill();
            }
        }
    }

    updateShadow(video, results) {
        if (!results || !results.poseLandmarks) return;
        
        // 确保shadowRenderer已初始化
        if (typeof shadowRenderer === 'undefined' || !shadowRenderer) {
            console.error('shadowRenderer未定义');
            return;
        }
        
        // 性能优化：根据FPS动态调整阴影渲染频率
        if (this.fps > 0 && this.fps < 30 && this.isMobile) {
            // 当FPS低于30时，降低阴影渲染频率
            if (Math.random() > 0.7) { // 只有30%的帧会渲染阴影
                shadowRenderer.render(results.poseLandmarks);
            }
        } else {
            shadowRenderer.render(results.poseLandmarks);
        }
        
        // 性能优化：当内存使用过高时，临时降低阴影质量
        if (this.memory > 150 && this.isMobile) { // 超过150MB时
            if (!shadowRenderer.tempLowQuality) {
                shadowRenderer.tempLowQuality = true;
                shadowRenderer.previousQuality = shadowRenderer.SHADOW_QUALITY;
                shadowRenderer.SHADOW_QUALITY = 0; // 设置为最低质量
                console.log('内存使用过高，临时降低阴影质量');
            }
        } else if (shadowRenderer.tempLowQuality) {
            // 恢复之前的质量设置
            shadowRenderer.SHADOW_QUALITY = shadowRenderer.previousQuality;
            shadowRenderer.tempLowQuality = false;
            console.log('内存使用恢复，恢复阴影质量');
        }
        
        this.updatePerformanceMetrics();
    }

    checkInactivity(now) {
        // 检查是否超过不活动阈值
        if (now - this.lastActivityTime > this.inactivityThreshold) {
            if (!this.isInactive) {
                this.isInactive = true;
                console.log('检测到不活动，启用省电模式');
                
                // 降低阴影渲染频率
                if (typeof shadowRenderer !== 'undefined' && shadowRenderer) {
                    shadowRenderer.renderInterval = shadowRenderer.renderInterval * 2;
                }
                
                // 如果在移动设备上，进一步降低性能消耗
                if (this.isMobile) {
                    // 降低FPS上限
                    if (typeof RENDER_CONFIG !== 'undefined' && RENDER_CONFIG && 
                        RENDER_CONFIG.mobile) {
                        RENDER_CONFIG.mobile.maxFPS = 10; // 降低不活动时的FPS
                    }
                }
            }
        } else if (this.isInactive) {
            // 恢复正常模式
            this.isInactive = false;
            console.log('检测到活动，恢复正常模式');
            
            // 恢复阴影渲染频率
            if (typeof shadowRenderer !== 'undefined' && shadowRenderer) {
                shadowRenderer.renderInterval = this.isMobile ? 100 : 50;
            }
            
            // 恢复FPS上限
            if (typeof RENDER_CONFIG !== 'undefined' && RENDER_CONFIG && RENDER_CONFIG.mobile) {
                RENDER_CONFIG.mobile.maxFPS = 30;
            }
        }
    }
}

// 移动端渲染终极配置（新增）
const MOBILE_RENDER_PRO = {
  TARGET_FPS: 30,
  CACHE_POOL_SIZE: 24,
  KEY_POINTS: [0,5,11,12,13,14,15,16,23,24,25,26,27,28], // 关键骨骼节点索引
  BATCH_SIZE: 4,
  SKELETON_OPTIMIZATION: {
    enabled: true,
    useOffscreenCanvas: true,    // 使用离屏渲染
    frameBuffering: true,        // 启用帧缓冲
    bufferSize: 10,               // 缓冲区大小
    interpolation: true,         // 启用关键点插值
    throttleRender: true,        // 节流渲染
    renderInterval: 50           // 渲染间隔(ms)
  }
};

// 智能渲染控制器（新增）
let renderController = {
  lastFrame: 0,
  currentBatch: 0,
  matrixPool: Array.from({length: MOBILE_RENDER_PRO.CACHE_POOL_SIZE}, 
    () => new DOMMatrix()),
  skeletonRenderer: {
    offscreenCanvas: null,
    offscreenCtx: null,
    buffers: [],
    currentBufferIndex: 0,
    lastRenderTime: 0,
    isInitialized: false,
    previousLandmarks: null
  }
};

// 初始化骨骼渲染优化
function initSkeletonOptimization() {
  if (!renderController.skeletonRenderer.isInitialized && MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.enabled) {
    const renderer = window.renderer;
    if (!renderer || !renderer.skeletonCanvas) return;
    
    // 创建离屏画布
    if (MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.useOffscreenCanvas && typeof OffscreenCanvas !== 'undefined') {
      try {
        renderController.skeletonRenderer.offscreenCanvas = new OffscreenCanvas(
          renderer.skeletonCanvas.width,
          renderer.skeletonCanvas.height
        );
        renderController.skeletonRenderer.offscreenCtx = renderController.skeletonRenderer.offscreenCanvas.getContext('2d');
      } catch (e) {
        console.warn('离屏画布创建失败，回退到普通缓冲', e);
        // 回退到普通缓冲
        renderController.skeletonRenderer.offscreenCanvas = document.createElement('canvas');
        renderController.skeletonRenderer.offscreenCanvas.width = renderer.skeletonCanvas.width;
        renderController.skeletonRenderer.offscreenCanvas.height = renderer.skeletonCanvas.height;
        renderController.skeletonRenderer.offscreenCtx = renderController.skeletonRenderer.offscreenCanvas.getContext('2d');
      }
    } else {
      // 回退到普通缓冲
      renderController.skeletonRenderer.offscreenCanvas = document.createElement('canvas');
      renderController.skeletonRenderer.offscreenCanvas.width = renderer.skeletonCanvas.width;
      renderController.skeletonRenderer.offscreenCanvas.height = renderer.skeletonCanvas.height;
      renderController.skeletonRenderer.offscreenCtx = renderController.skeletonRenderer.offscreenCanvas.getContext('2d');
    }
    
    // 初始化帧缓冲
    if (MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.frameBuffering) {
      for (let i = 0; i < MOBILE_RENDER_PRO.SKELETON_OPTIMIZATION.bufferSize; i++) {
        const buffer = document.createElement('canvas');
        buffer.width = renderer.skeletonCanvas.width;
        buffer.height = renderer.skeletonCanvas.height;
        renderController.skeletonRenderer.buffers.push({
          canvas: buffer,
          ctx: buffer.getContext('2d'),
          timestamp: 0
        });
      }
    }
    
    renderController.skeletonRenderer.isInitialized = true;
    console.log('骨骼渲染优化初始化完成');
  }
}

// 导出初始化函数供外部调用
export { initSkeletonOptimization };

export const renderer = new Renderer();

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/js/service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch((error) => {
      console.log('Service Worker registration failed:', error);
    });
}
