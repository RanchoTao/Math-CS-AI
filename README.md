# Math · CS · AI Atlas

一个面向纯数学、计算机科学与人工智能的多尺度知识图谱与学习导航系统。

网站不是把某所学校的课程表直接画成树，而是把相对稳定的知识本体、真实课程实现、培养方案和个人学习路线分开建模。

## 当前结构

### 1. KnowledgeNode：知识节点

例如：

- 实分析
- 操作系统
- 机器学习
- 大语言模型

知识节点代表相对稳定的知识模块。领域、层级、学科群、必要前置、推荐关联和直接后续以 `data/catalog.*` 为唯一事实源。

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
```

校验内容包括：

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

打开：

`http://localhost:8000`

## 下一阶段

先完成 12 个标杆标准页，稳定研究、canonicalization、draft 和 audit 流程，再决定是否批量扩展到约 100 个标准页和 20–30 个精品页。
