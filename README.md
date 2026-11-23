# Math · CS · AI Atlas

一个面向纯数学、计算机科学与人工智能的多尺度知识图谱与学习导航系统。

网站不是把学校课程表直接画成树。内容系统首先严格区分三类对象：

1. **KnowledgeNode / KnowledgePage**：稳定的知识本体与 canonical syllabus；
2. **CourseImplementation**：某所大学、公开课程或教学体系的具体实现；
3. **LearningExperience**：明确标为主观信息的社区、维护者或学习者经验。

课程实现不等于知识节点，学习经验也不等于官方事实。三类对象分别位于 `content/pages/`、`content/courses/` 和 `content/experiences/`，并由独立 Schema 约束。图谱关系仍只由 `data/catalog.json` 维护。详细生产与核验规则见 `docs/CONTENT_RESEARCH_WORKFLOW.md`。

知识图谱的产品视图还区分四层：

## 当前结构

### 1. KnowledgeNode：知识节点

例如：

- 实分析
- 操作系统
- 机器学习
- 大语言模型

知识节点代表相对稳定的知识模块。领域、层级、学科群、必要前置、推荐关联和直接后续以 `data/catalog.json` 为唯一事实源。

### 2. CourseImplementation：课程实现

同一个知识节点可以对应多个真实课程实现，例如“操作系统”可以映射到不同大学和公开课程。

课程实现记录：

- 学校、课程号和课程名称；
- 版本与语言；
- 课程覆盖主题；
- labs / projects / proof-heavy 等特点；
- 理论深度、实践强度、数学要求、编程强度、资源完整度；
- 官方课程链接和一手来源。

维度只用于描述课程风格，不计算总分，不建立全局课程排行榜。

### 3. LearningExperience：学习经验

社区项目、维护者或学习者可以贡献：

- 实际投入时间；
- 常见难点；
- 最有价值部分；
- 建议前置；
- 学习建议。

学习经验始终明确标记为“社区经验 / 主观经验”，不能冒充学校官方事实，也不会自动写入 canonical syllabus。

### 4. Curriculum Layer：培养方案图层

用于表示某个学校、专业或项目选择并组织了哪些知识节点。

### 5. Personal Route：个人路线

用于表示个人希望把哪些节点掌握到什么深度，并在后续与任务和项目系统连接。

---

## 知识页面

所有知识节点都通过统一的 `knowledge.html` 页面渲染。

知识页面分成三层：

1. **知识标准**：为什么学习、学习目标、核心内容、canonical syllabus、完成标准、前置与后续；
2. **课程实现**：真实大学或公开课程如何教授该知识；
3. **学习经验**：社区和学习者的主观反馈。

内容深度分为：

- 基础页；
- 标准页；
- 精品页。

当前不会批量生成 296 个完整课程页面。没有人工内容的节点仍可通过图谱元数据生成基础页。

---

## 内容研究原则

社区项目主要用于发现候选和学习经验，不自动成为最终事实来源。

重点参考：

- REKCARC-TSC-UHT
- CS DIY
- HackWay

课程事实尽量回到：

1. 大学官方课程主页；
2. 教师官方 syllabus / lecture notes；
3. 官方课程仓库；
4. 教材官网 / 出版社；
5. 其他第一手资料。

详细流程见：

`docs/CONTENT_RESEARCH_WORKFLOW.md`

长期内容规则见：

`docs/CONTENT_STANDARD.md`

---

## 当前知识图谱

- 296 个知识节点；
- 26 个学科群；
- 纯数学、计算机科学、人工智能三大领域；
- L0–L8 学习阶段；
- 统一的纵向知识塔；
- 节点依赖按需显示；
- 知识页面与图谱关系动态联动。

## 内容数据目录

```text
content/
  manifest.json
  pages/
  courses/
    manifest.json
  experiences/
    manifest.json

schemas/
  knowledge-page.schema.json
  course-implementation.schema.json
  learning-experience.schema.json
```

---

## 校验

部署前执行：

```bash
node scripts/validate-content.mjs
node --test tests/knowledge-content.test.mjs
```

校验内容包括：

- 图谱结构：节点 ID 唯一、引用存在、必要前置无环、必要前置的层级不高于本节点；

- 知识页 slug 与知识节点映射；
- KnowledgePage 不得复制维护图谱关系；
- CourseImplementation ID、知识节点和 1–5 维度；
- LearningExperience 对课程实现的引用；
- 三类对象的状态和必填字段。

---

## 本地运行

```bash
python -m http.server 8000
```

打开 `http://localhost:8000`。网站是纯静态页面，没有构建步骤。

## 代码结构

```text
index.html            知识地图（探索 / 路线 / 我的地图）
knowledge.html        知识页
assets/atlas.js       地图：分层布局、相机、依赖连线、路线与个人进度
assets/knowledge.js   知识页渲染（测试直接在 VM 中执行它）
assets/*.css          设计令牌（base.css）与两个页面的样式
assets/fonts/         自托管字体：Instrument Serif、Noto Serif SC 子集、JetBrains Mono（均为 OFL）
data/catalog.json     图谱唯一事实源：节点、学科群、示例路线、培养方案图层
```

`src/` 下是早期的 Next.js 原型，当前不参与部署。

## 地图的三种模式

- **探索**：L0 在底部、L8 在顶部，三个领域并排共享同一纵轴。点选节点会高亮它的全部前置与后续，连线做了传递约简，只保留不可省略的依赖。缩小到总览时，标签让位给节点条和整张依赖网。
- **路线**：选一个目标，地图按拓扑序算出还需要补齐的前置；如果你已经在“我的地图”中标记过掌握的节点，这些节点及其前置会被跳过。路线可以播放。
- **我的地图**：标记已掌握的节点，地图会亮出下一步可学的节点。进度只保存在浏览器本地，可以导出、导入 JSON，不需要账号。

## 撰写知识页

- `node scripts/node-brief.mjs --queue`：查看写作队列（大语言模型主干优先）。
- `node scripts/node-brief.mjs <node-id>`：打印某个节点的写作简报。
- `docs/CONTENT_AGENT_PROMPT.md`：交给写作 Agent 的完整提示词。

## 下一阶段

先完成 12 个标杆标准页，稳定研究、canonicalization、draft 和 audit 流程，再决定是否批量扩展到约 100 个标准页和 20–30 个精品页。
