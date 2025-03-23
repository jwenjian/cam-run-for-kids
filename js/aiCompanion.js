// AI陪跑模块
import { GAME_CONFIG } from './config.js';
import { gameState } from './gameState.js';

class AICompanion {
    constructor() {
        this.config = {
            // 提示语类型
            promptTypes: ['Encouragement', 'Prank', 'Fun Facts', 'Challenge'],
            // 默认用户偏好
            defaultPreference: {
                favoriteTypes: ['Encouragement', 'Teasing'],
                frequency: 'High', // Low, Medium, High
                style: 'Humorous'
            },
            // 提示语显示时间(毫秒)
            displayDuration: 5000,
            // 提示语间隔时间范围(毫秒)
            intervalRange: {
                low: { min: 60000, max: 120000 },      // 低频率：1-2分钟
                medium: { min: 30000, max: 60000 },    // 中等频率：30秒-1分钟
                high: { min: 15000, max: 30000 }       // 高频率：15-30秒
            },
            // API 配置
            apiConfig: GAME_CONFIG.aiCompanion.apiConfig
        };

        // 用户偏好设置
        this.userPreference = {...this.config.defaultPreference};
        
        // 提示语计时器
        this.promptTimer = null;
        
        // 上次提示时间
        this.lastPromptTime = 0;
        
        // 提示语历史
        this.promptHistory = [];
        
        // 提示语DOM元素
        this.promptElement = null;
        
        // 状态指示器元素
        this.statusIndicator = document.querySelector('.ai-status-indicator i');
        
        // 是否已初始化
        // 初始化为 true, 取消加载这个模块
        this.initialized = true;
        
        // 初始化时检查API状态
        this.checkAPIStatus();
    }

    // 初始化
    init() {
        if (this.initialized) return;

        // 创建提示语DOM元素
        this.createPromptElement();
        
        // 加载用户偏好
        this.loadUserPreference();
        
        // 设置提示语计时器
        this.scheduleNextPrompt();
        
        // 监听用户开始跑步事件
        window.addEventListener('userStartedRunning', () => {
            // 用户开始跑步时，显示一个鼓励提示
            this.showEncouragementPrompt();
        });
        
        console.log('AI陪跑模块初始化完成');
        this.initialized = true;
    }

    // 创建提示语DOM元素
    createPromptElement() {
        // 检查是否已存在
        let promptElement = document.getElementById('ai-prompt');
        if (!promptElement) {
            // 创建新元素
            promptElement = document.createElement('div');
            promptElement.id = 'ai-prompt';
            promptElement.className = 'ai-prompt';
            document.body.appendChild(promptElement);
        }
        
        this.promptElement = promptElement;
    }

    // 加载用户偏好
    loadUserPreference() {
        // 尝试从localStorage加载用户偏好
        try {
            const savedPreference = localStorage.getItem('aiCompanionPreference');
            if (savedPreference) {
                this.userPreference = JSON.parse(savedPreference);
                //console.log('已加载用户偏好设置:', this.userPreference);
            }
        } catch (error) {
            console.error('加载用户偏好失败:', error);
        }
    }

    // 保存用户偏好 (public method)
    saveUserPreference() {
        const dialog = document.getElementById('ai-settings-dialog');
        const promptTypeCheckboxes = dialog.querySelectorAll('input[name="promptType"]:checked');
        const promptFrequencySelect = dialog.querySelector('#promptFrequency');
        const promptStyleSelect = dialog.querySelector('#promptStyle');

        // 获取选中的提示类型
        const selectedTypes = [];
        promptTypeCheckboxes.forEach(checkbox => {
            selectedTypes.push(checkbox.value);
        });

        // 确保至少选择了一种提示类型
        if (selectedTypes.length === 0) {
            alert('Please select at least one prompt type');
            return;
        }

        // 获取频率和风格
        const frequency = promptFrequencySelect.value;
        const style = promptStyleSelect.value;

        // 保存设置
        this.setUserPreference({
            favoriteTypes: selectedTypes,
            frequency: frequency,
            style: style
        });

        // 关闭对话框
        dialog.style.display = 'none';
    }

    // 设置用户偏好
    setUserPreference(preference) {
        // 确保频率设置有效
        const validFrequencies = ['Low', 'Medium', 'High'];
        if (preference.frequency && !validFrequencies.includes(preference.frequency)) {
            console.error('无效的频率设置，使用默认值');
            preference.frequency = this.userPreference.frequency;
        }
        
        this.userPreference = {...this.userPreference, ...preference};
        localStorage.setItem('aiCompanionPreference', JSON.stringify(this.userPreference));
        
        // 调试日志：打印当前频率设置
        console.log(`当前频率设置为：${this.userPreference.frequency}`);
        
        // 重新安排下一次提示
        this.scheduleNextPrompt();
    }

    // 显示设置对话框
    showSettingsDialog() {
        const dialog = document.getElementById('ai-settings-dialog');
        const promptTypeCheckboxes = dialog.querySelectorAll('input[name="promptType"]');
        const promptFrequencySelect = dialog.querySelector('#promptFrequency');
        const promptStyleSelect = dialog.querySelector('#promptStyle');

        // 设置提示类型复选框
        promptTypeCheckboxes.forEach(checkbox => {
            checkbox.checked = this.userPreference.favoriteTypes.includes(checkbox.value);
        });

        // 设置提示频率
        promptFrequencySelect.value = this.userPreference.frequency;

        // 设置提示风格
        promptStyleSelect.value = this.userPreference.style;

        // 显示对话框
        dialog.style.display = 'block';
    }

    // 获取跑步上下文
    getRunningContext() {
        const state = gameState.getState();
        return {
            speed: state.currentSpeed,
            distance: 0, // 目前没有距离数据
            time: performance.now() / 1000, // 转换为秒
            steps: state.stepCount,
            calories: state.caloriesBurned
        };
    }

    // 获取情绪状态
    getEmotionState(context) {
        if (context.speed < 2 && context.time > 60) {
            return 'Tired';
        } else if (context.speed > 4) {
            return 'Excited';
        } else {
            return 'Normal';
        }
    }

    // 生成随机间隔时间
    getRandomInterval() {
        // 将中文频率映射到英文配置键
        let frequencyKey;
        switch(this.userPreference.frequency) {
            case 'Low':
                frequencyKey = 'low';
                break;
            case 'High':
                frequencyKey = 'high';
                break;
            case 'Medium':
            default:
                frequencyKey = 'medium';
                break;
        }
        
        const range = this.config.intervalRange[frequencyKey] || this.config.intervalRange.medium;
        
        // 调试日志：打印当前频率和范围
        console.log(`当前频率：${this.userPreference.frequency}，范围：${JSON.stringify(range)}`);
        
        // 确保范围有效
        if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') {
            console.error('无效的间隔范围，使用默认值');
            return 30000; // 默认30秒
        }
        
        // 确保min <= max
        const min = Math.min(range.min, range.max);
        const max = Math.max(range.min, range.max);
        
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 安排下一次提示
    scheduleNextPrompt() {
        // 清除现有计时器
        if (this.promptTimer) {
            clearTimeout(this.promptTimer);
        }
        
        // 设置新计时器
        const interval = this.getRandomInterval();
        this.promptTimer = setTimeout(() => {
            this.checkAndShowPrompt();
        }, interval);
        
        console.log(`下一次提示将在${interval/1000}秒后显示`);
    }

    // 检查并显示提示
    async checkAndShowPrompt() {
        // 只有当用户正在跑步时才显示提示
        const state = gameState.getState();
        if (state.currentSpeed > 0) {
            // 获取跑步上下文
            const context = this.getRunningContext();
            const emotion = this.getEmotionState(context);
            
            // 生成提示语
            const prompt = await this.generatePrompt(context, emotion);
            
            // 显示提示语
            this.showPrompt(prompt);
        }
        
        // 安排下一次提示
        this.scheduleNextPrompt();
    }

    // 用户开始跑步时显示鼓励提示
    showEncouragementPrompt() {
        const encouragements = [
            "Let's start running! Keep it up!<br>开始跑步了！加油！💪",
            "A new running journey begins, you can do it!<br>新的跑步旅程开始了，你可以的！🏃‍♂️",
            "Are you ready? Let's run together!<br>准备好了吗？让我们一起跑起来！🔥",
            "Today is a great day to become stronger!<br>今天是变得更强的好日子！💯",
            "Here we go! Keep the rhythm and enjoy the fun of running!<br>开始了！保持节奏，享受跑步的乐趣！🌟"
        ];
        
        const randomIndex = Math.floor(Math.random() * encouragements.length);
        this.showPrompt(encouragements[randomIndex]);
    }

    // 显示提示语
    showPrompt(message) {
        if (!this.promptElement) return;
        
        // 显示提示语
        this.promptElement.innerHTML = message;
        this.promptElement.style.display = 'block';
        
        // 使用淡入效果
        setTimeout(() => {
            this.promptElement.style.opacity = '1';
        }, 10);
        
        // 设置自动隐藏
        setTimeout(() => {
            // 淡出效果
            this.promptElement.style.opacity = '0';
            
            // 完全隐藏
            setTimeout(() => {
                this.promptElement.style.display = 'none';
            }, 500);
        }, this.config.displayDuration);
        
        // 更新最后提示时间
        this.lastPromptTime = Date.now();
        
        // 记录提示历史
        this.promptHistory.push({
            time: Date.now(),
            message: message
        });
        
        // 只保留最近10条记录
        if (this.promptHistory.length > 10) {
            this.promptHistory.shift();
        }
    }

    // 生成提示语
    async generatePrompt(context, emotion) {
        console.log('generatePrompt:', this.config.apiConfig.url,context, emotion);
        // 如果配置了API，则调用API生成提示语
        if (this.config.apiConfig.url && this.config.apiConfig.apiKey) {
            try {
                this.updateStatusIndicator('active'); // 开始调用API时更新状态
                const prompt = await this.callPromptAPI(context, emotion);
                this.updateStatusIndicator('api-available'); // API调用成功后更新状态
                return prompt;
            } catch (error) {
                this.updateStatusIndicator('error'); // 发生错误时更新状态
                console.error('API调用失败，使用本地提示语:', error);
                return this.getLocalPrompt(context, emotion);
            }
        } else {
            // 否则使用本地提示语
            return this.getLocalPrompt(context, emotion);
        }
    }

    // 调用提示语API
    async callPromptAPI(context, emotion) {
        try {
            const response = await fetch(this.config.apiConfig.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.apiConfig.model,
                    seed : context.steps,
                    temperature: 0.8,
                    messages: [{ 
                        role: "user", 
                        content: `根据以下跑步上下文和用户偏好生成个性化提示语，融合他的步数、速度和卡路里消耗情况：
                        上下文：用户当前速度${context.speed}m/s，已跑${context.steps}步，消耗${context.calories}卡路里，情绪状态：${emotion}
                        用户偏好：喜欢的提示内容类型：${this.userPreference.favoriteTypes.join(' 或 ')}，你要输出的风格为：${this.userPreference.style}
                        请生成一个简短、有趣、鼓舞人心的中文提示语，中文长度控制在10-20字。禁止任何解释解析。禁止重复/冗余内容。
                        请务必返回两行内容：首先生成中文，然后根据生成的中文翻译为英文。英文放在第一行，中文放在第二行，两行中间用html换行符分隔<br>。`
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('API调用错误:', error);
            throw error;
        }
    }

    // 获取本地提示语
    getLocalPrompt(context, emotion) {
        // 根据用户偏好和上下文选择提示类型
        const availableTypes = this.userPreference.favoriteTypes.length > 0 ? 
                              this.userPreference.favoriteTypes : 
                              this.config.promptTypes;
        
        const randomTypeIndex = Math.floor(Math.random() * availableTypes.length);
        const promptType = availableTypes[randomTypeIndex];
        
        // 根据提示类型和情绪状态获取提示语
        let prompts = [];
        
        switch (promptType) {
            case 'Encouragement':
                if (emotion === 'Tired') {
                    prompts = [
                        "Keep going, rest is for better persistence!<br>坚持住，休息是为了更好的坚持！💪",
                        "Every step is a victory, keep it up!<br>每一步都是胜利，继续加油！🌟",
                        "Feeling tired is normal, but you are stronger than you think!<br>感到累很正常，但你比你想象的更强大！🔥",
                        "It's okay to go slow, the important thing is not to stop!<br>慢一点也没关系，重要的是不停下来！👣",
                        "Breathe, relax, and keep moving forward!<br>呼吸，放松，然后继续前进！🌈"
                    ];
                } else if (emotion === 'Excited') {
                    prompts = [
                        "Awesome! Your state is perfect!<br>太棒了！你的状态简直完美！⚡",
                        "Look at your speed, you're flying!<br>看看你的速度，简直是飞起来了！🚀",
                        "This feeling is great, keep it up!<br>这种感觉真好，继续保持！🏆",
                        "You were born to run!<br>你就是为跑步而生的！💯",
                        "This energy is amazing, keep releasing it!<br>这股能量太惊人了，继续释放它！✨"
                    ];
                } else {
                    prompts = [
                        "Keep the rhythm, you're doing great!<br>保持节奏，你做得很好！👍",
                        "Every step brings you closer to your goal!<br>每一步都让你更接近目标！🎯",
                        "Feel the power of your body, you can do it!<br>感受身体的力量，你可以做到！💪",
                        "Focus on the present, enjoy the fun of running!<br>专注当下，享受跑步的乐趣！🌟",
                        "Steady breathing, relax your body, keep moving forward!<br>稳定呼吸，放松身体，继续前进！🏃‍♂️"
                    ];
                }
                break;
                
            case 'Prank':
                prompts = [
                    "Imagine a tiger is chasing you... run faster!<br>想象身后有只老虎在追你...跑快点！🐯",
                    "Your shoelaces seem loose... just kidding!<br>你的鞋带好像松了...哈哈，骗你的！😜",
                    "Look around, you're the coolest runner on this road!<br>左看右看，你是这条路上最帅的跑者！😎",
                    "Run a little faster, and I'll tell you a secret!<br>跑得再快一点，我就告诉你一个秘密！🤫",
                    "Your running posture looks like an elegant... penguin?<br>你的跑步姿势像极了一只优雅的...企鹅？🐧"
                ];
                break;
                
            case 'Fun Facts':
                prompts = [
                    "Did you know? Running can improve cardiovascular health!<br>你知道吗？跑步可以提高心血管健康！❤️",
                    "The average cadence of professional runners is 160-170 steps per minute!<br>专业跑者的平均步频是每分钟160-170步！👣",
                    "Breathing while running can help you relax!<br>跑步时呼吸可以帮助你放松！🌬️",
                    "Running can increase your metabolic rate!<br>跑步可以提高你的新陈代谢率！🔥",
                    "Running can make you happier!<br>跑步可以让你更快乐！😊"
                ];
                break;
                
            case 'Challenge':
                prompts = [
                    "Try sprinting for the next 30 seconds!<br>接下来30秒，试着加速冲刺一下！⚡",
                    "Challenge: Keep the current speed for another minute!<br>挑战：保持当前速度再跑1分钟！⏱️",
                    "Count the next 20 steps, feel your rhythm!<br>数一数接下来20步，感受你的节奏！👣",
                    "Take 3 deep breaths, then try to speed up!<br>深呼吸3次，然后试着加快步伐！🌬️",
                    "Lift your knees for the next 10 steps!<br>接下来10步，抬高你的膝盖！🦵"
                ];
                break;
                
            default:
                prompts = [
                    "Keep moving forward, you're doing great!<br>继续前进，你做得很棒！👍",
                    "Every step is a victory!<br>每一步都是胜利！🏆",
                    "Feel the rhythm, enjoy the run!<br>感受节奏，享受跑步！🎵",
                    "You are stronger than yesterday!<br>你比昨天的自己更强大！💪",
                    "Breathe, relax, keep going!<br>呼吸，放松，继续！🌈"
                ];
        }
        
        // 随机选择一条提示语
        const randomIndex = Math.floor(Math.random() * prompts.length);
        return prompts[randomIndex];
    }

    // 更新AI状态指示器
    updateStatusIndicator(status) {
        if (!this.statusIndicator) return;
        
        // 移除之前的动画
        this.statusIndicator.style.animation = 'none';
        this.statusIndicator.offsetHeight; // 触发重绘
        
        switch(status) {
            case 'active':
            case 'api-available':
                this.statusIndicator.style.color = '#4CAF50'; // 绿色
                this.statusIndicator.style.animation = status === 'active' ? 'fadeInOut 2s 3' : 'none';
                break;
            default:
                this.statusIndicator.style.color = '#000000'; // 黑色
                this.statusIndicator.style.animation = 'none';
                break;
        }
    }

    // 检查API状态
    async checkAPIStatus() {
        try {
            if (!this.config.apiConfig.url || !this.config.apiConfig.apiKey) {
                this.updateStatusIndicator('api-unavailable');
                return false;
            }
            
            const response = await fetch(this.config.apiConfig.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.apiConfig.model,
                    messages: [{ role: 'user', content: '返回ok' }]
                })
            });
            
            const isAvailable = response.ok;
            this.updateStatusIndicator(isAvailable ? 'api-available' : 'api-unavailable');
            return isAvailable;
        } catch (error) {
            this.updateStatusIndicator('api-unavailable');
            return false;
        }
    }
}

export const aiCompanion = new AICompanion();
