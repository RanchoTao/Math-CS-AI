# Math-CS-AI

一个桌面端优先的交互式知识地图，展示纯数学、计算机科学与人工智能课程之间保守、可解释的学习关系。

## MVP 功能

- 首页、交互地图、动态课程路由
- 39 门课程，区分严格前置、建议先学、应用和相关关系
- 搜索、领域筛选、缩放、平移、Fit View、MiniMap
- 自定义领域节点与邻接课程高亮；节点不可拖动或连线
- 5 份完整 MDX 课程指南，其余课程使用明确的建设中页面
- 移动端自动切换为课程列表

## 技术栈

Next.js App Router、TypeScript（strict）、Tailwind CSS、React Flow（`@xyflow/react`）和 MDX。MVP 数据保存在 `src/data/knowledge.ts`，不依赖数据库。

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 质量检查

```bash
npm run lint
npm run build
```

## 目录结构

```text
src/
├── app/                 # App Router 页面与全局样式
├── components/map/      # 地图与自定义节点
├── content/courses/     # 精选课程 MDX
├── data/                # 节点、边和检索方法
└── types/               # 知识图谱领域类型
```

## 数据约定

`prerequisite` 只表示不可轻易省略的直接前置；有帮助但并非必需的课程使用 `recommended`。`application` 表示知识的典型应用方向，`related` 仅表达非方向性的概念联系。
