[中文说明](README.cn.md)
# Webcam Runner

A running game based on webcam, controlling the game character in an infinite scene by detecting user movements. **Now with AI Companion** providing real-time movement guidance and personalized feedback. Main technologies: Three.js, MediaPipe Pose

## Technical Architecture

### Core Frameworks
- **Three.js**: For 3D scene rendering
  - Infinite terrain generation
  - Scene object handling
  - Camera animation management
- **MediaPipe Pose**: For motion detection
  - Supports full-body/half-body recognition
  - Real-time pose estimation 
  - Keypoint tracking
  - User distance detection (supports close-range mode)
  - Movement intensity calculation (based on user weight)

## Features

### Current Features
1. **AI Running Companion**
   - Real-time movement guidance
   - Personalized feedback system
   - Adaptive difficulty adjustment
   - Exercise intensity monitoring

2. Motion Detection System
   - Supports full-body/half-body detection
   - Real-time motion analysis
   - Intelligent movement judgment
   - User distance detection (supports close-range mode)
   - Movement intensity calculation (based on user weight)

3. Basic 3D Scene
   - Infinite terrain generation
   - Basic scene objects
   - Dynamic camera system

## System Requirements
- Processor: Intel i3 or equivalent (recommended with AVX instruction set)
- Webcam: Supports 720p resolution
- Browser: Latest version of Chrome or Edge (Chrome recommended for best MediaPipe performance)
- Memory: 4GB RAM+
- Graphics: Supports WebGL 2.0 (e.g., Intel HD Graphics 4000 or higher)

## Installation and Running
1. Clone the project
2. Open index.html in the browser
3. Allow camera access

## License
GNU General Public License v3.0 所有代码，包括历史记录，应视为受GPLv3约束

## Donate
If you find this project useful, you can buy me a coffee:

[![paypal](https://github.com/Ximi1970/Donate/blob/master/paypal_btn_donateCC_LG_1.gif)](https://paypal.me/jameszhai78)
[![afdian.com](https://static.afdiancdn.com/static/img/logo/logo.png)](https://afdian.com/a/cam-run)
<img src="images/alipay_qr.webp" alt="Alipay QR Code" style="width:200px;" />
<img src="images/wechat_qr.webp" alt="WeChat QR Code" style="width:200px;" />
