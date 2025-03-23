import { GAME_CONFIG } from './config.js';

class GameState {
    constructor() {
        this.state = {
            fps: 0,
            movementQuality: 0,
            currentSpeed: 0,
            stepCount: 0,
            caloriesBurned: 0,
            userWeight: 60, // 默认体重60kg
            debugInfo: '',
            isCloseUpMode: false,
            shoulderDistance: 0,
            estimatedHeight: 0,
            shoulderDistanceHistory: []
        };
        this.lastUpdate = 0;
        this.movementBuffer = [];
        
        // FPS 计算相关变量
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fpsUpdateInterval = 1000; // 每秒更新一次 FPS
        
        // 步数检测相关变量
        this.lastStepTime = 0;
        this.armPhase = 'neutral'; // 'left_up', 'right_up', 'neutral'
        this.lastArmPhase = 'neutral';
        this.stepDetectionCooldown = false;
        
        // 新增：手臂运动检测相关变量（用于近距离模式）
        this.armMovementHistory = [];
        this.lastArmMovementTime = 0;
        
        // 新增：卡路里计算相关变量
        this.lastCalorieUpdateTime = 0;
        this.calorieCalculationInterval = 1000; // 每秒更新一次卡路里
        
        // 初始化体重修改功能
        this.initWeightModification();
    }

    getState() {
        return { ...this.state };
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateDisplay();
    }

    reset() {
        this.state = {
            fps: 0,
            movementQuality: 0,
            currentSpeed: 0,
            stepCount: 0,
            caloriesBurned: 0,
            userWeight: this.state.userWeight, // 保留当前体重
            debugInfo: '',
            isCloseUpMode: false,
            shoulderDistance: 0,
            estimatedHeight: 0,
            shoulderDistanceHistory: []
        };
        this.movementBuffer = [];
        this.lastStepTime = 0;
        this.armPhase = 'neutral';
        this.lastArmPhase = 'neutral';
        this.stepDetectionCooldown = false;
        this.armMovementHistory = [];
        this.lastArmMovementTime = 0;
        this.lastCalorieUpdateTime = 0;
        this.updateDisplay();
    }

    updateMovement(quality) {
        // 更新 FPS
        this.updateFps();
        
        // 更新动作质量
        this.state.movementQuality = quality * 100;

        // 更新速度
        if (quality > 0) {
            this.state.currentSpeed = Math.min(
                this.state.currentSpeed + GAME_CONFIG.acceleration,
                GAME_CONFIG.maxSpeed
            );
            
            // 检测步数 - 使用更合理的步数检测机制
            this.detectAndCountSteps(quality);
            
            // 计算卡路里消耗
            this.calculateCalories();
        } else {
            this.state.currentSpeed = Math.max(
                0,
                this.state.currentSpeed - GAME_CONFIG.deceleration
            );
        }

        // 更新状态显示
        this.updateDisplay();
    }
    
    // 新增：计算并更新 FPS
    updateFps() {
        const now = performance.now();
        this.frameCount++;
        
        // 每秒更新一次 FPS
        if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            // 计算 FPS：帧数 / 时间（秒）
            this.state.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
            
            // 重置计数器
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            
            // 在控制台输出 FPS（可选，调试用）
            if (GAME_CONFIG.debug) {
                console.log(`当前 FPS: ${this.state.fps}`);
            }
        }
    }
    
    // 新增：计算卡路里消耗
    calculateCalories() {
        const now = performance.now();
        
        // 每秒更新一次卡路里
        if (now - this.lastCalorieUpdateTime >= this.calorieCalculationInterval) {
            // 只有当用户正在运动时才计算卡路里消耗
            if (this.state.currentSpeed > 0) {
                // 基于当前速度和时间间隔计算卡路里
                // 根据MET值计算卡路里消耗
                // 慢跑 MET ≈ 4-5, 中速跑 MET ≈ 7-8, 快速跑 MET ≈ 9-10
                
                let met = 0;
                if (this.state.currentSpeed < GAME_CONFIG.speedColorThresholds.slow) {
                    met = 4.5; // 慢跑，降低MET值
                } else if (this.state.currentSpeed < GAME_CONFIG.speedColorThresholds.medium) {
                    met = 7.5; // 中速跑，降低MET值
                } else {
                    met = 9.5; // 快速跑，降低MET值
                }
                
                // 卡路里计算公式: 卡路里 = MET * 体重(kg) * 时间(小时)
                // 使用估算的用户体重，时间转换为小时
                const weight = this.state.userWeight; // 使用估算的用户体重
                const timeInHours = (now - this.lastCalorieUpdateTime) / 1000 / 60 / 60;
                
                // 计算这段时间内消耗的卡路里
                const caloriesBurned = met * weight * timeInHours;
                
                // 应用调整系数，使卡路里增加更合理（考虑到这是模拟而非真实跑步）
                const adjustedCalories = caloriesBurned * 0.7;
                
                // 累加到总卡路里
                this.state.caloriesBurned += adjustedCalories;
                
                // 确保卡路里显示不超过两位小数
                this.state.caloriesBurned = parseFloat(this.state.caloriesBurned.toFixed(2));
            }
            
            // 更新最后计算时间
            this.lastCalorieUpdateTime = now;
        }
    }

    detectAndCountSteps(quality) {
        const now = performance.now();
        
        // 只有当动作质量超过阈值时才考虑计步
        if (quality < GAME_CONFIG.stepDetectionThreshold) {
            this.armPhase = 'neutral';
            return;
        }
        
        // 从姿势检测器获取当前手臂相位
        if (window.currentArmPhase) {
            this.armPhase = window.currentArmPhase;
        }
        
        // 检测手臂相位变化，表示一个步伐
        // 修改：每次手臂相位变化都计为一步（从中性状态变为任一手臂抬起，或者从一只手臂抬起变为另一只手臂抬起）
        const isPhaseChange = (
            (this.lastArmPhase !== this.armPhase) && 
            !(this.lastArmPhase === 'neutral' && this.armPhase === 'neutral')
        );
        
        // 确保步数检测有冷却时间，防止过快计步
        const canCountStep = !this.stepDetectionCooldown && 
                             (now - this.lastStepTime) > GAME_CONFIG.minStepInterval;
        
        // 新增：检测是否处于近距离模式
        this.state.isCloseUpMode = window.poseDetector && window.poseDetector.isCloseUpMode;
        
        // 检测用户是否开始跑步，并触发自定义事件
        if ((this.state.isCloseUpMode || isPhaseChange) && canCountStep && this.state.stepCount === 0) {
            // 用户开始跑步，触发自定义事件
            const userStartedRunningEvent = new Event('userStartedRunning');
            window.dispatchEvent(userStartedRunningEvent);
        }
        
        // 在近距离模式下，使用更灵敏的步数检测
        if (this.state.isCloseUpMode) {
            // 记录当前动作质量到历史记录
            this.armMovementHistory.push({
                time: now,
                quality: quality
            });
            
            // 只保留最近2秒的历史记录
            while (this.armMovementHistory.length > 0 && 
                   now - this.armMovementHistory[0].time > 2000) {
                this.armMovementHistory.shift();
            }
            
            // 检测动作质量的波峰，作为步伐的标志
            if (this.armMovementHistory.length >= 3 && canCountStep) {
                const current = this.armMovementHistory[this.armMovementHistory.length - 1].quality;
                const previous = this.armMovementHistory[this.armMovementHistory.length - 2].quality;
                const beforePrevious = this.armMovementHistory[this.armMovementHistory.length - 3].quality;
                
                // 当前值比前一个值大，且前一个值比前前一个值小，表示一个波峰
                if (current > previous && previous < beforePrevious && 
                    current > GAME_CONFIG.stepDetectionThreshold * 0.8) {
                    // 增加步数
                    this.state.stepCount++;
                    this.lastStepTime = now;
                    
                    // 设置冷却时间
                    this.stepDetectionCooldown = true;
                    setTimeout(() => {
                        this.stepDetectionCooldown = false;
                    }, GAME_CONFIG.minStepInterval);
                    
                    // 更新调试信息
                    this.state.debugInfo = `近距离模式检测到步伐 (总步数: ${this.state.stepCount})`;
                }
            }
        }
        // 标准模式下的步数检测
        else if (isPhaseChange && canCountStep) {
            // 增加步数（每次相位变化增加1步）
            this.state.stepCount++;
            this.lastStepTime = now;
            
            // 设置冷却时间
            this.stepDetectionCooldown = true;
            setTimeout(() => {
                this.stepDetectionCooldown = false;
            }, GAME_CONFIG.minStepInterval);
            
            // 更新调试信息
            this.state.debugInfo = `检测到步伐: ${this.armPhase} (总步数: ${this.state.stepCount})`;
        }
        
        // 更新上一次的手臂相位
        this.lastArmPhase = this.armPhase;
    }

    // 新增：初始化体重修改功能
    initWeightModification() {
        // 等待DOM加载完成
        document.addEventListener('DOMContentLoaded', () => {
            // 为体重显示元素添加点击事件
            const weightElements = ['user-weight-debug', 'weight-bottom', 'weightDisplay'];
            
            weightElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.style.cursor = 'pointer'; // 添加指针样式表明可点击
                    element.title = '点击修改体重'; // 添加提示
                    
                    element.addEventListener('click', () => {
                        this.showWeightDialog();
                    });
                }
            });
        });
    }
    
    // 显示修改体重的对话框
    showWeightDialog() {
        const currentWeight = this.state.userWeight;
        const newWeight = prompt(`请输入您的体重(kg)，当前体重: ${currentWeight}kg`, currentWeight);
        
        // 验证输入
        if (newWeight !== null) {
            const weightValue = parseFloat(newWeight);
            if (!isNaN(weightValue) && weightValue > 0) {
                this.updateUserWeight(weightValue);
            } else {
                alert('请输入有效的体重值');
            }
        }
    }

    // 更新用户体重
    updateUserWeight(weight) {
        if (weight && weight > 0) {
            this.state.userWeight = weight;
            // 更新显示
            this.updateDisplay();
        }
    }

    updateDisplay() {
        try {
            // 更新 FPS
            document.getElementById('fps').textContent = Math.round(this.state.fps);
            
            // 更新动作质量
            document.getElementById('quality').textContent = 
                this.state.movementQuality.toFixed(1) + '%';
            
            // 更新速度并应用样式
            const speedValue = this.state.currentSpeed.toFixed(1);
            let speedText = speedValue + ' m/s';
            let speedClass = '';
            
            if (this.state.currentSpeed === 0) {
                // 未开始跑步
                document.getElementById('speed').innerHTML = '当前速度: ' + speedText ;
            } else {
                // 确定速度级别和对应的样式类
                if (this.state.currentSpeed < GAME_CONFIG.speedColorThresholds.slow) {
                    speedClass = 'speed-slow';
                } else if (this.state.currentSpeed < GAME_CONFIG.speedColorThresholds.medium) {
                    speedClass = 'speed-medium';
                } else {
                    speedClass = 'speed-fast';
                }
                
                // 创建带有样式的速度显示
                document.getElementById('speed').innerHTML = 
                    '当前速度: <span class="speed-indicator ' + speedClass + '">' + 
                    speedText + '</span>';
            }
            
            // 右下角速度显示 - 同步更新并应用相同的样式类
            const speedBottomElement = document.getElementById('speed-bottom');
            if (speedBottomElement) {
                if (this.state.currentSpeed === 0) {
                    speedBottomElement.textContent = speedText;
                } else {
                    speedBottomElement.innerHTML = '<span class="' + speedClass + '">' + speedText + '</span>';
                }
            }
            
            // 更新步数
            document.getElementById('steps').textContent = this.state.stepCount;
            
            // 更新右下角步数
            const stepsBottomElement = document.getElementById('steps-bottom');
            if (stepsBottomElement) {
                stepsBottomElement.textContent = this.state.stepCount;
            }
            
            // 更新卡路里消耗
            document.getElementById('calories').textContent = 
                this.state.caloriesBurned.toFixed(1);
            
            // 更新右下角卡路里消耗
            const caloriesBottomElement = document.getElementById('calories-bottom');
            if (caloriesBottomElement) {
                caloriesBottomElement.textContent = this.state.caloriesBurned.toFixed(1);
            }
            
            // 更新所有体重显示元素
            const weightElements = {
                'user-weight-debug': true,  // 调试区域显示
                'weight-bottom': true,      // 右下角显示
                'weightDisplay': false      // 其他显示
            };
            
            for (const [id, isSpan] of Object.entries(weightElements)) {
                const element = document.getElementById(id);
                if (element) {
                    if (isSpan) {
                        element.textContent = this.state.userWeight;
                    } else {
                        element.textContent = `Weight: ${this.state.userWeight} kg`;
                    }
                }
            }
            
            // 更新调试信息
            const debugElements = ['debug', 'debugInfo'];
            debugElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = this.state.debugInfo;
                }
            });
            
            // 更新其他状态显示
            this.updateMetrics();
        } catch (error) {
            console.error('更新显示错误:', error);
        }
    }
    
    // 新增：更新其他状态显示
    updateMetrics() {
        // 确定速度级别和对应的样式类
        let speedClass = '';
        const speedValue = this.state.currentSpeed.toFixed(1);
        const speedText = `${speedValue} m/s`;
        
        if (this.state.currentSpeed > 0) {
            // 确定速度级别和对应的样式类
            if (this.state.currentSpeed < GAME_CONFIG.speedColorThresholds.slow) {
                speedClass = 'speed-slow';
            } else if (this.state.currentSpeed < GAME_CONFIG.speedColorThresholds.medium) {
                speedClass = 'speed-medium';
            } else {
                speedClass = 'speed-fast';
            }
        }
        
        const metrics = {
            'speed-bottom': this.state.currentSpeed === 0 ? 
                speedText : 
                `<span class="${speedClass}">${speedText}</span>`,
            'steps-bottom': this.state.stepCount,
            'calories-bottom': `${this.state.caloriesBurned.toFixed(1)}`
        };
        
        for (const [id, value] of Object.entries(metrics)) {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = value;
            }
        }
    }

    updateFPS(fps) {
        this.state.fps = fps;
        this.updateDisplay();
    }
    
    // 添加初始化方法
    init() {
        // 重置游戏状态
        this.reset();
        
        // 确保所有显示元素都已更新
        this.updateDisplay();
        
        console.log('游戏状态初始化完成');
        return this;
    }

    getSteps() {
        return this.state.stepCount;
    }

    getCalories() {
        return this.state.caloriesBurned;
    }
}

export const gameState = new GameState();
