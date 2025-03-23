import * as THREE from 'three';
// 游戏配置
export const GAME_CONFIG = {
    // 移动端优化
    mobileOptimization: {
        enabled: true,
        // 性能优化
        frameRate: 30,               // 降低移动端帧率
        bufferSize: 5,              // 减少缓冲区大小
        // 运动检测优化
        movementThreshold: 1.8,     // 降低移动端运动检测阈值
        stepDetectionThreshold: 0.3,// 降低步伐检测阈值
        // 渲染优化
        shadowQuality: 0.5,         // 降低阴影质量
        decorationDensity: 0.7,     // 减少装饰物密度
        // 新增移动端优化参数
        adaptiveQuality: true,      // 启用自适应质量
        memoryLimit: 150,           // 内存使用限制(MB)
        shadowRenderInterval: 100,  // 阴影渲染间隔(ms)
        lowEndDeviceDetection: true, // 低端设备检测
        // 不活动检测
        inactivityTimeout: 30000,   // 不活动超时时间(ms)
        // 触摸交互优化
        touchResponseThreshold: 50, // 触摸响应阈值(ms)
        gestureMinDistance: 30,     // 最小手势距离(px)
        // 资源加载优化
        progressiveLoading: true,   // 渐进式加载
        textureQuality: 0.7         // 纹理质量(0.0-1.0)
    },
    // 速度相关
    maxSpeed: 6,              // 提高最大速度上限
    acceleration: 0.12,       // 提高加速度使变化更快
    deceleration: 0.12,       // 保持减速度不变
    runningThreshold: 0.5,    // 降低运动阈值，使其更容易达到运动状态
    bufferSize: 10,          // 减少缓冲区大小以更快地响应变化
    requiredConsecutiveMovements: 8,  // 减少连续运动检测次数要求

    // 速度颜色阈值
    speedColorThresholds: {
        slow: 2.0,            // 低于此值为慢速 (红色)
        medium: 4.0,          // 低于此值为中速 (黄色)，高于为快速 (绿色)
    },
    speedColors: {
        slow: '#B81D13',      // 慢速 - 红色
        medium: '#EFB700',    // 中速 - 黄色
        fast: '#008450',      // 快速 - 绿色
    },

    // 姿势检测
    poseConfidenceThreshold: 0.5,    // 提高姿势检测要求
    calibrationFrames: 20,           // 保持校准帧数要求
    movementThreshold: 2.2,          // 提高运动强度阈值
    stepDetectionThreshold: 0.4,     // 提高步伐检测阈值，确保只有明显的动作才会被计为步伐

    // 新增：近距离检测模式参数
    closeUpDetection: {
        enabled: true,                // 启用近距离检测模式
        upperBodyFocusThreshold: 0.6, // 降低上半身可见度阈值，使其更容易进入近距离模式
        movementThresholdMultiplier: 0.6, // 进一步降低近距离模式下的运动阈值，使检测更灵敏
        armMovementWeight: 1.8,       // 增加近距离模式下手臂运动的权重
        shoulderDistanceThreshold: 0.25, // 降低肩膀距离阈值，使系统更容易识别近距离状态
    },
    
    // 新增：体重估算参数
    weightEstimation: {
        enabled: true,                 // 启用体重估算
        defaultWeight: 60,             // 默认体重（kg）
        averageShoulderToHeightRatio: 0.25, // 调整肩宽与身高的比例
        heightScaleFactor: 550,        // 新增：身高缩放因子
        averageHeight: {               // 平均身高（cm）
            male: 170,
            female: 160
        },
        defaultGender: 'male',         // 默认性别
        averageBMI: {                  // 平均BMI值
            male: 24,
            female: 23
        },
        shoulderWidthCalibrationFrames: 30,  // 肩宽校准帧数
        minShoulderDistance: 0.1,      // 最小有效肩膀距离
        maxShoulderDistance: 0.9,      // 最大有效肩膀距离
        weightAdjustmentFactor: 0.9    // 体重调整因子
    },

    // 运动评估参数
    motionEvaluation: {
        frequencyWeight: 0.7,         // 进一步增加频率权重
        amplitudeWeight: 0.3,         // 进一步降低幅度权重
        nonLinearScaling: 2.5,        // 增加非线性映射使变化更陡峭
        minQualityThreshold: 0.8,     // 提高姿势质量要求
        speedChangeLimit: 0.08,       // 进一步降低速度变化限制
        posturePenalty: 0.8,         // 增加姿势惩罚
        speedRampUpFactor: 0.4,      // 进一步降低速度增长因子
        initialSpeedPenalty: 0.5     // 增加初始速度惩罚
    },

    // 地形系统
    terrainSegmentLength: 1000,
    terrainWidth: 100,
    activeTerrainSegments: 5,
    decorationsPerSegment: 50,       // 增加每个地形段的装饰物（树木）数量，从30增加到50
    maxDecorationsPool: 800,         // 增加最大装饰物池大小，从500增加到800

    // 步伐检测相关参数
    minStepInterval: 150,            // 进一步减少最小步伐间隔（毫秒），使步数增长更快
    armPhaseThreshold: 0.05,         // 保持手臂相位变化阈值不变
    
    // 新增：场景增强器配置
    sceneEnhancer: {
        enabled: true,                // 启用场景增强器
        // 小动物配置
        animals: {
            types: ['pigeon', 'squirrel', 'rabbit'],
            maxCount: 100,             // 场景中最大小动物数量
            poolSize: 200,             // 小动物对象池大小
            spawnDistance: 30,        // 生成距离
            despawnDistance: 50,      // 消失距离
            spawnProbability: 0.2     // 每次更新的生成概率
        },
        // 植物配置
        plants: {
            types: ['bush', 'flower', 'grass'],
            maxCount: 30,             // 场景中最大植物数量
            poolSize: 50,             // 植物对象池大小
            spawnDistance: 40,        // 生成距离
            despawnDistance: 60,      // 消失距离
            spawnProbability: 0.4     // 每次更新的生成概率
        },
        // 移动端优化
        mobile: {
            animalsEnabled: true,     // 移动端是否启用小动物
            plantsEnabled: true,      // 移动端是否启用植物
            maxAnimals: 5,            // 移动端最大小动物数量
            maxPlants: 15,            // 移动端最大植物数量
            spawnProbability: 0.1     // 移动端生成概率降低
        }
    },
    
    // 新增：AI陪跑功能配置
    aiCompanion: {
        enabled: false,                // 启用AI陪跑功能
        promptTypes: ['Encouragement', 'Prank', 'Fun Facts', 'Challenge'], // 提示语类型
        defaultFrequency: 'Medium',      // 默认提示频率
        defaultStyle: 'Humorous',          // 默认提示风格
        displayDuration: 5000,        // 提示语显示时间(毫秒)
        // 提示语间隔时间范围(毫秒)
        intervalRange: {
            low: { min: 60000, max: 120000 },      // 低频率：1-2分钟
            medium: { min: 30000, max: 60000 },    // 中等频率：30秒-1分钟
            high: { min: 15000, max: 30000 }       // 高频率：15-30秒
        },
        // 情绪检测阈值
        emotionThresholds: {
            tired: 2.0,               // 低于此速度视为疲惫(当跑步时间>60秒)
            excited: 4.0              // 高于此速度视为兴奋
        },
        // API配置
        apiConfig: { // 向 https://github.com/liseami/DeepRant 致敬
            url: 'https://api.stepfun.com/v1/chat/completions',                  // API地址，留空则使用本地提示语
            model: 'step-2-16k',   // 模型名称
            apiKey: '605JU1zU7cGmFp0ibbZlZZ3Qra3lRH7FDtpvICyf2pTrRrUaO6CQgW8p3sQatd5Wh'                // API密钥，实际使用时应从环境变量或用户输入获取
        }
    }
};

// 骨骼渲染配置
export const SKELETON_CONFIG = {
    color: '#00ff00',
    lineWidth: 2,
    radius: 4,
    connections: [
        // 躯干
        [11, 12], // 肩膀
        [11, 23], // 左躯干
        [12, 24], // 右躯干
        [23, 24], // 臀部
        
        // 左腿
        [23, 25], // 左大腿
        [25, 27], // 左小腿
        [27, 31], // 左脚
        
        // 右腿
        [24, 26], // 右大腿
        [26, 28], // 右小腿
        [28, 32]  // 右脚
    ]
};

// 渲染设置
export const RENDER_CONFIG = {
    shadowMapSize: 1024,  // 阴影贴图大小
    maxFPS: 60,
    dynamicQuality: true,       // 动态质量调整
    maxDecorations: 400,        // 最大装饰物数量，从200增加到400
    lodDistances: {             // 细节层次距离
        near: 120,              // 从80增加到120
        medium: 180,            // 从120增加到180
        far: 240                // 从160增加到240
    },
    // 移动端特定渲染设置
    mobile: {
        shadowMapType: THREE.BasicShadowMap, // 从PCFSoftShadowMap改为Basic
        shadowFilterQuality: 0, // 禁用滤波
        shadowMapSize: 256,     // 移动端降低阴影贴图大小
        maxFPS: 30,             // 移动端最大FPS
        maxDecorations: 200,    // 移动端减少装饰物数量
        textureQuality: 0.7,    // 纹理质量降低
        lodDistances: {         // 移动端LOD距离缩短
            near: 80,
            medium: 120,
            far: 160
        },
        shadowEnabled: true,    // 是否启用阴影
        effectsEnabled: false,  // 禁用特效
        antialiasing: false,    // 禁用抗锯齿
        postProcessing: false   // 禁用后处理
    }
};

// 调试设置
export const DEBUG_CONFIG = {
    debug: false,
    showSkeleton: true
};
