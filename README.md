# AI 小说生成平台

一个基于 Next.js 和大语言模型的智能小说创作平台，支持渐进式创作流程。

## 功能特性

- **四步创作流程**：标题/大纲 → 世界/人物设定 → 分章细纲 → 章节正文
- **用户自定义输入**：支持对世界/人物设定提出特殊要求
- **灵活的章节结构**：可设置卷数、每卷章节数、总章节数
- **流式输出**：实时打字机效果，创作过程可视化
- **章节选择**：自动解析分章细纲，支持选择章节创作
- **内容管理**：支持下载生成内容，实时字数统计

## 快速开始

### 开发模式

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:5000
```

### 生产构建

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 访问 http://localhost:5000
```

## 部署方式

### 1. 部署到 Vercel（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 按照提示完成部署
```

### 2. 部署到 Netlify

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 构建项目
pnpm build

# 部署
netlify deploy --prod
```

### 3. 部署到自己的服务器

```bash
# 1. 构建项目
pnpm build

# 2. 上传 .next 文件夹和 public 文件夹到服务器
# 3. 在服务器上安装 Node.js 和 pnpm
# 4. 运行生产服务器
pnpm start

# 或使用 PM2 管理进程
pm2 start npm --name "novel-generator" -- start
```

### 4. Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

构建和运行：

```bash
docker build -t novel-generator .
docker run -p 3000:3000 novel-generator
```

### 5. 使用 Node.js 直接运行

```bash
# 构建项目
pnpm build

# 启动服务器（默认3000端口）
NODE_ENV=production node node_modules/next/dist/bin/next start -p 5000
```

## 环境变量

项目使用 `coze-coding-dev-sdk`，API密钥会自动从环境变量加载。如果需要配置自定义密钥，可以创建 `.env.local` 文件：

```env
# API 配置（可选，SDK 会自动加载）
COZE_API_KEY=your_api_key
COZE_API_BASE_URL=https://api.example.com
```

## 技术栈

- **框架**：Next.js 16 (App Router)
- **React**：React 19
- **语言**：TypeScript 5
- **UI 组件**：shadcn/ui
- **样式**：Tailwind CSS 4
- **AI 集成**：coze-coding-dev-sdk（豆包大语言模型）
- **包管理器**：pnpm

## 项目结构

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── generate/          # API 路由
│   │   │       └── route.ts       # 流式生成接口
│   │   ├── layout.tsx             # 根布局
│   │   └── page.tsx              # 主页面
│   ├── components/
│   │   └── ui/                   # shadcn/ui 组件
│   └── lib/
│       └── utils.ts               # 工具函数
├── public/                       # 静态资源
├── .coze                         # Coze 配置
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── tailwind.config.ts
```

## API 接口

### POST /api/generate

请求体：

```typescript
{
  mode: 'titleAndOutline' | 'worldAndCharacters' | 'chapterOutline' | 'chapterContent',
  theme?: string,                  // 小说主题
  style?: string,                  // 小说风格
  title?: string,                  // 小说标题
  outline?: string,                // 小说大纲
  worldAndCharacters?: string,      // 世界和人物设定
  worldAndCharactersRequirements?: string,  // 世界/人物特殊要求
  chapterOutline?: string,          // 分章细纲
  volumes?: string,                // 卷数
  chaptersPerVolume?: string,      // 每卷章节数
  totalChapters?: string,          // 总章节数
  chapterNumber?: string,          // 章节号
}
```

响应：SSE 流式输出

```typescript
data: {"content":"生成的内容片段"}

data: [DONE]
```

## 使用说明

### 第1步：标题与大纲生成
1. 输入小说主题（如：一艘探索宇宙的飞船...）
2. 输入小说风格（如：科幻、玄幻、武侠）
3. 点击"生成"按钮
4. 等待流式输出完成

### 第2步：世界与人物设定
1. 查看已生成的标题和大纲
2. （可选）在"世界/人物设定特殊要求"中输入具体需求
3. 点击"生成"按钮
4. AI 会根据你的特殊要求进行创作

### 第3步：分章细纲生成
1. 查看小说标题和世界/人物设定
2. （可选）设置章节结构：
   - 卷数：如 3 卷
   - 每卷章节数：如 10 章
   - 总章节数：如 30 章
3. 点击"生成"按钮
4. AI 会生成详细的分章细纲

### 第4步：章节正文创作
1. 查看分章细纲
2. 选择要创作的章节（自动解析章节列表）
3. 点击"创作章节"按钮
4. 等待流式输出完成

## 故障排除

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# 杀死进程
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# 或使用其他端口
pnpm dev -p 3001
```

### 构建失败

```bash
# 清除缓存
rm -rf .next node_modules

# 重新安装依赖
pnpm install

# 重新构建
pnpm build
```

### API 调用失败

- 检查网络连接
- 确认 API 密钥配置正确
- 查看浏览器控制台错误信息

## 开发

### 添加新功能

1. 在 `src/app/api/generate/route.ts` 中添加新的生成模式
2. 在 `src/app/page.tsx` 中添加对应的 UI 和逻辑
3. 使用 TypeScript 确保类型安全

### 自定义样式

项目使用 Tailwind CSS，可以在 `tailwind.config.ts` 中自定义主题：

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#ffffff',
        },
      },
    },
  },
} satisfies Config
```

## 许可证

MIT

## 支持

如有问题，请提交 Issue 或联系开发者。
