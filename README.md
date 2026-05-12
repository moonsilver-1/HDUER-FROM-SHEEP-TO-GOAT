# HDU Wiki — 杭电百科

> **HDUER FROM SHEEP TO GOAT**
> 帮助每一位杭电新生从懵懂的小羊蜕变成老练的山羊。

**线上地址：[www.hdu-wiki.cn](https://www.hdu-wiki.cn)**

---

## 目录

- [项目简介](#项目简介)
- [贡献者](#贡献者)
- [技术栈](#技术栈)
- [项目架构](#项目架构)
- [本地开发](#本地开发)
- [如何添加文章](#如何添加文章)
- [文章规范化指南](#文章规范化指南)
- [词条系统（Wiki Entries）](#词条系统wiki-entries)
- [后续词条设计思路](#后续词条设计思路)
- [部署](#部署)

---

## 项目简介

杭电百科是一个面向杭州电子科技大学全体学生的校园百科与经验分享平台。站点提供：

- **经验文章**：学长学姐撰写的学业、竞赛、科研、求职等领域的长文指南
- **词条解释**：对校园高频词汇（绩点、平时分、竞赛、科研等）的快速释义
- **全文搜索**：输入关键词即可筛选文章并高亮跳转到相关段落

所有内容以 Markdown 文本存储在 `articles/` 目录下，无需数据库，纯文件驱动。

---

## 贡献者

感谢以下同学为杭电百科做出的贡献（排名不分先后）：

**moonsilver** · **如山** · **09** · **langji** · **hina_daisuki** · **Miss** · **blair** · **东风揽月** · **Zkaqtch**

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | **Next.js 16**（App Router） | 页面路由、静态生成 |
| 语言 | **TypeScript 5** | 全项目类型安全 |
| 前端 | **React 19** | 组件化 UI |
| 样式 | **手写 CSS** | 全局 CSS 变量主题，无 Tailwind / CSS 框架 |
| Markdown | **自研渲染器** | `src/lib/markdown.tsx`，无第三方 Markdown 库 |
| 部署 | **Vercel** | 自动识别 Next.js，零配置部署 |

---

## 项目架构

```
HDUER-FROM-SHEEP-TO-GOAT/
├── articles/                          # 所有文章（Markdown 格式）
│   ├── main-guide.md                  # 置顶总指南
│   ├── how-to-grow-in-hdu.md
│   ├── how-to-become-a-qualified-developer.md
│   ├── how-too-use-github.md
│   ├── how-to-use-llm.md
│   └── how-to-install-software.md
│
├── entries/                           # 词条目录（预留，暂未使用）
│
├── src/
│   ├── app/                           # Next.js App Router 页面
│   │   ├── layout.tsx                 # 根布局：HTML 结构、metadata
│   │   ├── page.tsx                   # 首页：渲染 WikiHome 组件
│   │   ├── not-found.tsx              # 自定义 404 页面
│   │   ├── globals.css                # 全局样式 + CSS 变量主题（430 行）
│   │   └── articles/
│   │       └── [slug]/
│   │           └── page.tsx           # 动态文章页，generateStaticParams 预渲染
│   │
│   ├── components/                    # React 组件
│   │   ├── wiki-home.tsx              # 首页：搜索栏 + 词条建议 + 文章卡片网格 + 贡献者
│   │   └── article-content.tsx        # 文章页：加载文章内容并传给 MarkdownView
│   │
│   └── lib/                           # 工具函数
│       ├── content.ts                 # 文章读取、标题/摘要提取、词条数据定义
│       └── markdown.tsx               # Markdown → React 渲染器 + 搜索高亮 + 自动滚动
│
├── package.json                       # 项目依赖与脚本
├── next.config.ts                     # Next.js 配置（当前为空）
├── tsconfig.json                      # TypeScript 配置
└── eslint.config.mjs                  # ESLint 配置
```

### 核心数据流

```
articles/*.md
    ↓  (Node.js fs 读取)
src/lib/content.ts → getArticles()
    ↓  (提取 title / excerpt / slug)
src/app/page.tsx → WikiHome 组件
    ↓  (用户搜索 / 点击)
/articles/[slug]?q=关键词
    ↓  (Markdown 渲染 + 关键词高亮)
MarkdownView 组件
```

### 关键设计决策

- **无数据库**：文章直接从文件系统读取，构建时静态生成所有页面
- **无第三方 Markdown 库**：自研 `MarkdownView` 组件，支持标题、列表、加粗、行内代码、链接、引用块，以及搜索关键词高亮与自动滚动定位
- **无 CSS 框架**：全部手写 CSS，使用 CSS 变量（`--bg`、`--fg`、`--accent` 等）管理暗色主题
- **词条硬编码**：首页词条建议按钮的数据来自 `content.ts` 中的 `wikiEntries` 数组，暂未接入 `entries/` 目录

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 <http://localhost:3000> 查看站点。

其他命令：

```bash
npm run build    # 生产构建
npm run start    # 启动生产服务器
npm run lint     # ESLint 检查
```

---

## 如何添加文章

### 第一步：创建 Markdown 文件

在 `articles/` 目录下新建 `.md` 文件，文件名即为 URL slug（使用英文短横线命名）：

```text
articles/your-article-name.md
```

### 第二步：编写文章内容

```markdown
# 文章标题

作者：你的名字

这里是第一段正文，会被自动提取为文章摘要（超过 20 个字符的第一个段落）。

## 第一节标题

正文内容...

## 第二节标题

- 列表项一
- 列表项二

### 子标题

更多内容...
```

### 第三步：无需其他操作

文章会被 `getArticles()` 自动发现和加载：

- **标题**：自动提取第一个 `# ` 开头的行
- **摘要**：自动提取第一个超过 20 个字符的段落，截取前 118 个字符加 `...`
- **排序**：`main-guide` 始终置顶，其余按标题拼音排序
- **路由**：文件名去掉 `.md` 即为访问路径，例如 `how-to-use-llm.md` → `/articles/how-to-use-llm`

---

## 文章规范化指南

为了让百科保持一致的质量和风格，新文章应遵循以下规范：

### 文件命名

- 使用**英文短横线**命名，全部小写：`how-to-xxx.md`、`campus-life.md`
- 名称应简洁且能体现文章主题
- 文件名即 URL，避免过长的命名

### 文章结构

```markdown
# 文章标题（一句话概括主题）

作者：作者A、作者B

## （一）章节名

正文...

## （二）章节名

正文...
```

### 格式要求

| 元素 | 写法 | 说明 |
|------|------|------|
| 标题 | `# 标题` | 文章只有一个一级标题，放在第一行 |
| 章节 | `## 章节名` | 使用二级标题划分章节 |
| 子节 | `### 子节名` | 需要进一步细分时使用 |
| 加粗 | `**文本**` | 强调重要概念时使用 |
| 列表 | `- 项目` | 无序列表使用短横线 |
| 行内代码 | `` `代码` `` | 提及命令、文件名、变量名等时使用 |
| 链接 | `[文字](URL)` | 引用外部资源时使用 |
| 引用 | `> 引用内容` | 补充说明或注意事项 |

### 写作风格

- **语气亲切**：以学长学姐的口吻写作，可以适当使用口语化表达和网络用语
- **实用为主**：避免空话套话，给出具体可操作的建议
- **保持客观**：涉及政策类内容注明"以当年学院文件为准"
- **注明作者**：第二行写 `作者：xxx`，多人合作用顿号分隔

### 文件命名参考

现有文章的命名风格：

| 文件名 | 标题 |
|--------|------|
| `main-guide.md` | HDUER-FROM-SHEEP-TO-GOAT（总指南） |
| `how-to-grow-in-hdu.md` | 在 HDU 快乐成长 |
| `how-to-become-a-qualified-developer.md` | 如何成为一个合格的开发者 |
| `how-too-use-github.md` | GitHub 使用指南 |
| `how-to-use-llm.md` | AI 使用指北 |
| `how-to-install-software.md` | 软件安装指南 |

---

## 词条系统（Wiki Entries）

首页搜索栏下方有一排词条建议按钮（绩点、平时分、竞赛、科研、GitHub、AI），这些词条定义在 `src/lib/content.ts` 的 `wikiEntries` 数组中。

### 词条数据结构

```typescript
type WikiEntry = {
  term: string;      // 词条名称
  aliases: string[]; // 搜索别名（用户输入别名也能匹配到）
  summary: string;   // 一句话摘要
  details: string[]; // 详细说明（多条要点）
};
```

### 添加新词条

在 `src/lib/content.ts` 的 `wikiEntries` 数组中新增一个对象：

```typescript
{
  term: "选课",
  aliases: ["抢课", "退课", "补选"],
  summary: "每学期选课是大学生活的固定节目，合理规划课程和时间很重要。",
  details: [
    "选课通常分为预选、正选、退补选几个阶段。",
    "热门课程名额有限，建议提前规划好备选方案。"
  ]
}
```

词条会在首页搜索栏下方以按钮形式展示，点击后触发搜索筛选。

---

## 后续词条设计思路

`entries/` 目录已预留，后续计划将词条从硬编码迁移为文件驱动，与文章系统统一。以下是词条扩展的设计思路：

### 优先覆盖的词条方向

1. **学业类**：绩点、学分、平时分、选课、补考、重修、转专业、辅修、保研
2. **竞赛类**：A类甲等、挑战杯、数模、电赛、蓝桥杯、互联网+、创新学分
3. **生活类**：食堂、宿舍、图书馆、校园网、校医院、体育打卡
4. **行政类**：综测、奖学金、学生组织、社团、入党
5. **技术类**：GitHub、AI、VPN、校园邮箱、教务系统
6. **求职/升学类**：实习、秋招、春招、考研、保研、简历

### 词条内容规范

每个词条应包含：

- **一句话定义**：让新生 3 秒内理解这个概念是什么
- **别称/缩写**：列出所有常见叫法，方便搜索匹配
- **关键要点**（2-4 条）：最常见的场景和注意事项
- **关联文章**：指向 `articles/` 中的详细文章（后续实现）

### 从词条到文章的联动

理想的交互流程：

```
用户搜索 "绩点"
  → 匹配到词条 "绩点"，显示摘要
  → 同时筛选出包含 "绩点" 的文章
  → 用户点击文章，页面跳转并高亮关键词
```

当前已实现搜索匹配和文章高亮，后续需要完善词条摘要卡片在搜索结果中的展示。

### `entries/` 目录迁移计划

将词条从 `wikiEntries` 硬编码迁移到 `entries/` 目录下独立的 Markdown 或 JSON 文件，实现：

- 贡献者可以通过提交文件来添加/修改词条，无需改代码
- 词条与文章使用相同的文件读取机制
- 词条页面可以有独立的 URL（如 `/entries/gpa`）

---

## 部署

项目部署在 **Vercel** 上，线上地址：[www.hdu-wiki.cn](https://www.hdu-wiki.cn)

### Vercel 部署步骤

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入该仓库
3. Vercel 会自动识别 Next.js 项目，保持默认设置即可：
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
4. 在域名设置中添加 `hdu-wiki.cn` 并配置 DNS

### 自定义域名

域名 `hdu-wiki.cn` 需要在域名服务商处添加 CNAME 记录指向 Vercel，然后在 Vercel 项目设置 → Domains 中添加该域名。

---

## 给后续开发者的说明

如果你是通过 Claude 或其他 AI 工具接手这个项目，以下是关键信息：

1. **没有使用任何 UI 框架或 CSS 框架**——所有样式在 `src/app/globals.css` 中手写，修改样式直接改 CSS 变量或对应类名即可
2. **Markdown 渲染是自研的**——在 `src/lib/markdown.tsx` 中，支持的功能有限（标题、列表、加粗、代码、链接、引用），如需扩展 Markdown 语法需修改此文件
3. **文章元数据靠约定**——标题取第一个 `# ` 行，摘要取第一个超过 20 字符的段落，没有 YAML frontmatter
4. **词条数据在代码里**——`src/lib/content.ts` 的 `wikiEntries` 数组，添加/修改词条需要改这个文件
5. **`entries/` 目录是空的**——预留给未来的词条文件化方案，目前未使用
6. **`main-guide` 是特殊 slug**——排序时始终置顶，UI 上带"置顶"标签

---

## 文章列表

- [总指南：HDUER FROM SHEEP TO GOAT](articles/main-guide.md)（置顶）
- [在 HDU 快乐成长](articles/how-to-grow-in-hdu.md)
- [如何成为一个合格的开发者](articles/how-to-become-a-qualified-developer.md)
- [GitHub 使用指南](articles/how-too-use-github.md)
- [AI 使用指北](articles/how-to-use-llm.md)
- [软件安装指南](articles/how-to-install-software.md)
