# Webcam Runner

一个基于网络摄像头的跑步游戏，通过检测用户的动作来控制游戏角色在无限场景中奔跑。**新增AI陪跑功能**，提供实时动作指导和个性化反馈。主要技术：Three.js，MediaPipe Pose

## 技术架构

### 核心框架
- **Three.js**: 用于3D场景渲染
  - 实现无限地形生成
  - 处理场景物体
  - 管理相机动画
- **MediaPipe Pose**: 用于动作检测
  - 支持全身/半身动作识别
  - 实时姿势估计
  - 关键点追踪
  - 用户距离检测（支持近距离模式）
  - 动作力度计算（基于用户体重）

## 功能特性

### 现有功能
1. **AI运动陪跑**
   - 实时动作指导
   - 个性化反馈系统
   - 自适应难度调节
   - 运动强度监测

2. 基础3D场景
   - 无限地形生成
   - 基本场景物体
   - 动态相机系统

3. 动作检测系统
   - 支持全身/半身检测
   - 实时动作分析
   - 智能运动判定
   - 用户距离检测（支持近距离模式）
   - 动作力度计算（基于用户体重）

## 系统要求
- 处理器：Intel i3 或同等性能的处理器（建议支持 AVX 指令集）
- 网络摄像头：支持 720p 分辨率的摄像头
- 浏览器：Chrome 或 Edge 最新版本（建议使用 Chrome，因为 MediaPipe 在 Chrome 上的性能最佳）
- 内存：4GB RAM+
- 显卡：支持 WebGL 2.0 的显卡（如 Intel HD Graphics 4000 或更高）

## 安装和运行
1. 克隆项目
2. 在浏览器中打开index.html
3. 允许摄像头访问权限


## 许可
GNU General Public License v3.0 所有代码，包括历史记录，应视为受GPLv3约束

## 打赏
如果你觉得好，可以为我买杯咖啡：

[![paypal](https://github.com/Ximi1970/Donate/blob/master/paypal_btn_donateCC_LG_1.gif)](https://paypal.me/jameszhai78)
[![爱发电](https://static.afdiancdn.com/static/img/logo/logo.png)](https://afdian.com/a/cam-run)
<img src="images/alipay_qr.webp" alt="支付宝收款码" style="width:200px;" />
<img src="images/wechat_qr.webp" alt="微信收款码" style="width:200px;" />
