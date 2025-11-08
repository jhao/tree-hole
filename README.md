
# 心灵树洞 (Mind Tree Hole)

这是一个安全的数字空间，您可以匿名地分享您的想法和感受。无论您发送什么，它都会以一个充满同情心的倾听者的身份，作出安慰、聆听和肯定的答复。所有的数据都安全地存储在您自己的浏览器本地，确保了绝对的隐私。

在后台，程序会利用 Google Gemini API 对您的消息进行智能分类，帮助您更好地理解自己的情绪和想法模式，但这些分类信息同样只存储在本地。

## ✨ 核心功能

- **AI 聊天伙伴**: 基于 Google Gemini 的 AI 提供温暖、支持性的回复，始终为您提供一个安全的倾诉空间。
- **智能内容分类**: 自动将您的消息按情绪（悲伤、高兴、中性）和内容（事件、感情、心情、图片、工作、学习、生活等）进行分类。
- **隐私优先**: 所有聊天记录和分类数据 **100% 存储在浏览器的 LocalStorage 中**，不会上传到任何服务器，完全由您掌控。
- **存储空间管理**: 应用默认提供 5MB 的本地存储空间。界面上会清晰地显示存储使用情况，当空间不足时会友好地提示。
- **历史记录与搜索**: 提供一个专门的历史记录页面，您可以在其中：
  - 按关键词搜索您的消息。
  - 按情绪和内容类型筛选消息。
  - 选择并删除一条或多条记录以释放空间。
- **支持图片分享**: 您可以发送图片，AI 会理解图片的存在并作出相应的回应和分类。
- **优雅的着陆页**: 一个简洁美观的欢迎页面，引导用户开启他们的“树洞”之旅。

## 🛠️ 技术栈

- **前端框架**: React, TypeScript
- **AI 模型**: Google Gemini API (`@google/genai`)
- **样式**: Tailwind CSS
- **运行方式**: 无需构建步骤，直接通过现代浏览器支持的 `importmap` 运行。

## 📁 项目结构

```
/
├── components/           # 可复用的 React 组件
│   ├── ChatInput.tsx
│   ├── icons.tsx
│   ├── Message.tsx
│   ├── StorageIndicator.tsx
│   └── UpgradeModal.tsx
├── services/             # 与外部 API 通信的服务
│   └── geminiService.ts
├── App.tsx               # 主应用组件，管理视图和状态
├── constants.ts          # 应用常量
├── index.html            # HTML 入口文件
├── index.tsx             # React 应用挂载点
├── metadata.json         # 应用元数据
└── types.ts              # TypeScript 类型定义
```

## 🚀 如何运行与部署

本项目是一个纯前端应用，没有复杂的后端或构建过程，可以非常轻松地部署在任何静态网站托管服务上。

### 先决条件

1.  **Google Gemini API Key**: 您需要一个有效的 Google Gemini API 密钥。
2.  **Web 服务器**: 一个用于托管静态文件的简单 Web 服务器。您可以使用 Node.js 的 `serve` 包、Python 的内置服务器或任何其他类似工具。

### 运行步骤

1.  **获取代码**: 将所有项目文件下载或克隆到一个文件夹中。

2.  **配置 API 密钥**:
    本项目通过 `process.env.API_KEY` 来获取 Gemini API 密钥。您需要确保在您的托管环境中设置了这个环境变量。
    - **对于本地测试**:
        最简单的方式是临时修改 `services/geminiService.ts` 文件，将 `process.env.API_KEY` 替换为您的真实密钥字符串。**请注意，这仅适用于本地开发，切勿将您的密钥直接提交到代码仓库中。**
        ```typescript
        // services/geminiService.ts
        // 临时修改以供本地测试
        const ai = new GoogleGenAI({ apiKey: "在此处替换为您的API密钥" });
        ```
    - **对于生产部署**:
        您的托管平台（如 Vercel, Netlify 等）通常会提供设置环境变量的界面。请将您的 Gemini API 密钥配置为名为 `API_KEY` 的环境变量。

3.  **启动本地服务器**:
    在您的项目文件夹根目录下，打开终端并运行以下命令之一：
    - **使用 Node.js `serve`**:
      ```bash
      # 如果您没有安装 serve，请先安装
      # npm install -g serve
      serve .
      ```
    - **使用 Python 3**:
      ```bash
      python -m http.server
      ```
    - **使用 Python 2**:
      ```bash
      python -m SimpleHTTPServer
      ```

4.  **访问应用**:
    打开您的浏览器，访问服务器提供的地址（通常是 `http://localhost:3000` 或 `http://localhost:8000`）。

### 部署与打包

由于没有编译步骤，"打包" 的过程就是将整个项目文件夹的内容上传。

您可以将所有文件部署到任何支持静态文件托管的平台，例如：
- Vercel
- Netlify
- GitHub Pages
- Firebase Hosting
- 阿里云 OSS / 腾讯云 COS

只需将文件夹拖拽上传或通过 Git 推送到这些平台，它们就能自动为您部署应用。别忘了在平台的设置中配置好 `API_KEY` 环境变量。
