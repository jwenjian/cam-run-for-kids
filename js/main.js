import * as THREE from 'three';
import { GAME_CONFIG } from './config.js';
import { gameState } from './gameState.js';
import { poseDetector } from './pose.js';
import { sceneManager } from './scene.js';
import { renderer } from './renderer.js';
import { aiCompanion } from './aiCompanion.js';

class Game {
    constructor() {
        this.lastTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.isRunning = false;
    }

    async init() {
        try {
            // Initialize game state
            gameState.init();
            
            // Initialize renderer
            renderer.init();
            
            // Initialize scene
            await sceneManager.init();
            
            // Detect operating system
            const isMacOS = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
            if (isMacOS) {
                console.log('Detected macOS platform, using special handling...');
                gameState.setState({ debugInfo: 'Detected macOS platform, initializing camera...' });
            }
            
            // Initialize camera
            const video = document.getElementById('webcamView');
            
            try {
                // First, check if in HTTPS environment
                const isSecure = window.location.protocol === 'https:' || 
                                window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1';
                
                if (!isSecure && isMacOS) {
                    console.warn('On macOS, camera access usually requires HTTPS connection');
                    gameState.setState({ debugInfo: 'Warning: Non-HTTPS connection may not be able to access the camera' });
                }
                
                // First, try using modern API
                if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                    console.log('Using modern mediaDevices API');
                    
                    // On macOS, use simpler constraints
                    const constraints = isMacOS ? 
                        { video: true } : 
                        { 
                            video: {
                                width: 320,
                                height: 240,
                                frameRate: { ideal: 30 }
                            } 
                        };
                    
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    video.srcObject = stream;
                    await video.play();
                    
                    // Continue initialization process
                    console.log('Camera initialized, calling continueInit');
                    await this.continueInit();
                    return;
                }
                
                // If modern API is not available, try old API
                console.log('Modern API not available, trying old API');
                const getUserMedia = navigator.getUserMedia || 
                                    navigator.webkitGetUserMedia || 
                                    navigator.mozGetUserMedia || 
                                    navigator.msGetUserMedia;
                
                if (!getUserMedia) {
                    throw new Error('Browser does not support camera access, please use latest Chrome, Firefox or Edge browser');
                }
                
                // On macOS, use simpler constraints
                const constraints = isMacOS ? 
                    { video: true } : 
                    { 
                        video: {
                            width: 320,
                            height: 240,
                            frameRate: { ideal: 30 }
                        } 
                    };
                
                // Use old API
                getUserMedia.call(navigator, 
                    constraints,
                    (stream) => {
                        video.srcObject = stream;
                        video.play().then(() => {
                            // Continue initialization process
                            console.log('Camera initialized, calling continueInit');
                            this.continueInit();
                        }).catch(err => {
                            console.error('Video playback failed:', err);
                            gameState.setState({ debugInfo: 'Video playback failed: ' + err.message });
                        });
                    },
                    (err) => {
                        console.error('Camera access failed:', err);
                        gameState.setState({ debugInfo: 'Camera access failed: ' + err.message });
                        
                        // Provide more guidance on macOS
                        if (isMacOS) {
                            gameState.setState({ 
                                debugInfo: 'macOS camera access failed: Please check browser permission settings and ensure using https or localhost' 
                            });
                        }
                    }
                );
            } catch (mediaError) {
                console.error('Media access error:', mediaError);
                
                // More detailed error message
                let errorMessage = 'Camera access failed: ' + mediaError.message;
                if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
                    errorMessage = 'Camera access denied, please allow camera access in browser settings';
                } else if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
                    errorMessage = 'No camera device found, please ensure your device has a camera and is properly connected';
                } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'TrackStartError') {
                    errorMessage = 'Unable to read camera, possibly occupied by another application';
                } else if (mediaError.name === 'OverconstrainedError') {
                    errorMessage = 'Camera does not support the requested resolution or frame rate';
                } else if (mediaError.name === 'TypeError' && mediaError.message.includes('getUserMedia')) {
                    errorMessage = 'Browser does not support camera API or requires HTTPS connection';
                    
                    // Special guidance for macOS
                    if (isMacOS) {
                        errorMessage += '. On macOS, please ensure using https or localhost and allow browser camera access in system preferences';
                    }
                }
                
                gameState.setState({ debugInfo: errorMessage });
            }
        } catch (error) {
            console.error('Game initialization failed:', error);
            gameState.setState({ debugInfo: 'Initialization failed: ' + error.message });
        }
    }
    
    async continueInit() {
        try {
            // Initialize pose detection
            await poseDetector.init();
            
            // Start pose detection
            poseDetector.startDetection();
            
            // Initialize AI companion module
            console.log('Preparing to initialize AI companion module');
            await aiCompanion.init();
            
            // Add AI settings button event listener
            document.getElementById('aiSettingsButton').addEventListener('click', (e) => {
                e.preventDefault();
                aiCompanion.showSettingsDialog();
            });

            // 绑定保存按钮事件
            document.getElementById('save-ai-settings').addEventListener('click', () => {
                aiCompanion.saveUserPreference();
                const statusElement = document.createElement('div');
                statusElement.textContent = 'Settings saved! ✔️';
                statusElement.style.color = '#4CAF50';
                document.body.appendChild(statusElement);
                setTimeout(() => statusElement.remove(), 2000);
            });
            
            // Start game loop
            this.isRunning = true;
            this.animate();
            
            console.log('Game initialization successful');
            gameState.setState({ debugInfo: 'Ready to start...' });
        } catch (error) {
            console.error('Game initialization failed:', error);
            gameState.setState({ debugInfo: 'Initialization failed: ' + error.message });
        }
    }

    animate(currentTime = 0) {
        if (!this.isRunning) return;

        // Calculate FPS
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            gameState.updateFPS(fps);
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        // Update scene
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        const state = gameState.getState();
        if (state.currentSpeed > 0) {
            sceneManager.updateSpeed(state.currentSpeed);
        }

        // Render scene
        sceneManager.render();

        // Continue animation loop
        requestAnimationFrame(time => this.animate(time));
    }

    reset() {
        gameState.reset();
        poseDetector.calibrate();
    }
}

// Wait for page load to initialize game
window.addEventListener('load', () => {
    const game = new Game();
    game.init().catch(console.error);
    
    document.getElementById('shareButton').addEventListener('click', function() {
        const websiteUrl = window.location.href;
        const steps = gameState.getSteps(); 
        const calories = gameState.getCalories(); 
        const shareText = `I just completed ${steps} steps and burned ${calories} calories on ${websiteUrl}! Try it out!`;
        navigator.clipboard.writeText(shareText).then(function() {
            alert('Share content copied to clipboard!');
        }, function(err) {
            console.error('Failed to copy share content: ', err);
        });
    });
});
