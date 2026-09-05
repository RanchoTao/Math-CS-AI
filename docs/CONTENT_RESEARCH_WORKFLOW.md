# 标准页内容研究流水线

本流程用于逐个生产标准知识页。它不授权批量生成内容，也不得覆盖 `reviewed` 或 `published` 内容。

## 三类对象与事实边界

- **KnowledgeNode / KnowledgePage**：知识领域稳定的教学核心；canonical syllabus 是多套成熟体系的共同核心，不等同于任何一校课表。
- **CourseImplementation**：大学、公开课程或标准教学体系对节点的具体实现。课程号、年份、链接、作业等均需一手来源核验。
- **LearningExperience**：社区或学习者的主观经验。必须显示来源类型和核验状态，不得写入课程官方事实或知识节点 syllabus。

领域、阶段、学科群、前置与推荐关系始终只来自 `data/catalog.*`。

## Phase 1 — Discovery

使用 REKCARC、CS DIY、HackWay 发现候选课程、教材、实验与社区经验。此阶段的条目只能标为 `draft` / `unverified`；不得复制社区项目的大段文字，也不得将其评价当作官方事实。

## Phase 2 — Primary Source Verification

回到大学官方课程主页、官方 syllabus、教师主页、官方课程仓库和教材官网，逐项验证：

- 课程名称、课程号和年份；
- prerequisites 与 syllabus；
- labs、projects 和教材；
- 资源链接及其当前可访问性。

记录来源和检查日期。无法核验的信息保留为空或明确标记待核验，不根据模型记忆补齐。

## Phase 3 — Canonicalization

比较至少三个成熟课程实现或教材体系，提取重复出现的稳定主题，形成：

- 核心问题；
- 稳定章节结构；
- 学习目标；
- 典型习题类型；
- 实践要求；
- 可验证的完成标准。

保留课程间取向差异，不计算总分、不建立全局排行榜。课程特有内容留在 CourseImplementation 中。

## Phase 4 — Draft

按 `schemas/knowledge-page.schema.json` 写入页面；课程与经验分别按各自 Schema 写入独立目录和 manifest。自动生成内容最高只能进入 `draft`，经验默认 `unverified`。

## Phase 5 — Audit

发布前逐项检查：

- 是否编造课程、教师、教材或 URL；
- URL 是否真实可访问，课程是否过时，课程号是否变化；
- 是否把社区经验写成官方事实；
- 是否与图谱前置关系冲突；
- 是否缺少公认核心内容或加入明显越级内容；
- 是否存在大量空话或与其他节点重复；
- 是否意外覆盖 `reviewed` / `published` 内容。

运行 `node scripts/validate-content.mjs`。校验通过只代表结构与引用一致，不替代人工事实审核。
