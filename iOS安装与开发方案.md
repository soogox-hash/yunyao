# 云遥 iOS 安装与开发方案（不上架 App Store）

适用设备：iPhone，iOS 18.5。目标：不通过 App Store，用"信任证书"方式安装使用。

---

## 一、最快能用：PWA 方式（0 成本，今天就能用）

当前 `index.html` 已做好 iOS 适配（全屏运行、云遥图标、状态栏沉浸），**不需要任何证书**：

1. 把 `index.html` 放到任意可访问的服务器/网盘（或局域网内电脑起个静态服务，手机 Safari 访问）
2. iPhone 用 **Safari** 打开页面
3. 点底部「分享」按钮 → **添加到主屏幕**
4. 桌面出现「云遥」图标，点开即全屏 App 体验（无 Safari 地址栏）

> 限制：本质是网页壳，定位/震动等能力受 Safari 权限限制；适合现阶段原型验证。

## 二、正法：打包成原生 App + 签名分发（推荐开发路线）

技术栈建议沿用产品方案：**React Native + Expo**，用 `npx expo prebuild` 生成 Xcode 工程。

### 方案 A：Apple Developer 个人账号（¥688/年）— 最稳
1. 注册 Apple Developer Program（个人即可）
2. Xcode 中登录 Apple ID，Bundle ID 如 `com.yunyao.velo`
3. 真机运行或 Archive → **Ad Hoc** 分发（注册测试设备的 UDID，每类设备上限 100 台）
4. **安装时信任**：设置 → 通用 → VPN与设备管理 → 找到开发者证书（你的 Apple ID）→ 点「信任」

### 方案 B：免费 Apple ID（7 天签名）— 零成本试用
1. Xcode → Settings → Accounts 登录普通 Apple ID（免费）
2. 真机运行云遥 App，签名 7 天有效，到期重新用数据线跑一次即可
3. 首次运行需在 **设置 → 通用 → VPN与设备管理** 中信任开发者证书
4. 适合自用开发期；不适合长期给别人装

### 方案 C：企业证书（In-House）— 谨慎
- ¥299 美元/年的企业级账户可直接签发内部分发包，无需 UDID
- 苹果对企业证书滥用打击严格，**个人小团队很难申请**，且随时可能被吊销，不建议押注

### 方案 D：TestFlight（配合方案 A）
- 上传构建到 TestFlight，内部测试最多 100 人、外部测试 1 万人
- 虽然流程挂在 App Store Connect 上，但**不需要过审发布**（外部测试需简单 Beta 审核，通过率极高），体验最接近正式分发

## 三、安装后"信任证书"操作步骤（iOS 18.5 实测路径）

```
设置 → 通用 → VPN与设备管理 → [你的开发者证书] → 信任
```
- 首次打开未信任的 App 会提示"不受信任的开发者"，按上面路径信任后即可正常使用
- 自签/Ad Hoc 证书有效期 1 年，过期后需重新签名安装

## 四、iOS 侧需要重点适配的技术点

| 项目 | 说明 |
|---|---|
| 定位 | `NSLocationWhenInUseUsageDescription` 必须写清用途文案，否则骑行记录无法定位 |
| 后台定位 | 骑行记录需要 `location` background mode + `allowsBackgroundLocationUpdates`，这是骑行 App 的核心合规点 |
| 运动与健康 | CoreMotion 取踏频/爬升更精准；HealthKit 写入体能训练 |
| 震动 | UIImpactFeedbackGenerator 替代 navigator.vibrate |
| 键盘/安全区 | 刘海屏安全区已用 `env(safe-area-inset-*)` 处理 |
| 照片/相机 | 若做骑行拍照打卡需 `NSCameraUsageDescription` |

## 五、推荐落地顺序

1. **现在**：PWA 加到主屏幕，日常原型演示（已完成适配）
2. **第 1 步原生**：Expo 打包 + 免费 Apple ID 真机安装，验证 GPS 记录链路
3. **正式**：¥688 开发者账号 + TestFlight 给种子用户（不上架商店）
4. 骑行中后台定位、低电量策略在真机上重点测试
