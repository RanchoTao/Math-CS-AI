# 首批学习内容：线性代数与概率论

日期：2026-10-11。基于 main `d3334fb0537dae7be2e62f3939bba0dbe92739b2`。

## 覆盖审计与选题

完整逐节点结果见 [296 节点覆盖清单](2026-10-11-coverage.json)。解压现有五段 catalog，按运行时标题与 aliases 归一化规则匹配 manifest；全部条目可唯一映射。

| 项目 | main 基线 | 本批 draft |
|---|---:|---:|
| 图谱节点／学科群 | 296／26 | 296／26 |
| 独立知识页 | 4 | 6 |
| 仅有元数据基础页的节点 | 292 | 290 |
| 标为 reviewed／published 的知识页 | 0 | 0 |
| 课程实现记录 | 1 | 3 |

领域为数学 87、计算机科学 94、人工智能 115 个节点。原有四篇独立知识页全部是标准页 **draft**，不能把 manifest 数量当作经过审核的课程覆盖率。其内容逐字保持不变，哈希记录在覆盖清单中；catalog、Schema、学习经验和 PR #6 均未修改。

| 本批节点 | catalog 必要前置 | 直接后续节点数 | 选择理由 |
|---|---|---:|---|
| `linear-algebra` 线性代数，L2 | `elementary-algebra` 初等代数 | 29 | 覆盖当前高等代数的线性代数核心，支撑统计、优化、神经网络等 |
| `probability` 概率论，L2 | `calculus` 微积分、`elementary-combinatorics` 初等组合 | 25 | 为统计、概率建模、统计学习理论等建立共同基础 |

catalog 没有“高等代数”或“概率论与数理统计”的合并节点。`mathematical-statistics` 数理统计以 `probability`、`linear-algebra` 为必要前置，故下一批首先建设它。学校课名不作为新节点或过宽别名；本页也不声称覆盖学校高等代数的全部考核范围。

## 发现与一手核验

用户已明确指定方向，本批直接研究成熟官方课程与教材，无需将社区候选升格为事实。核验范围为课程 syllabus、主题目录、教材目录／前言及相关定义定位，**不是通读整本教材**。所有下列来源在 2026-10-11 通过网页检索／打开实际检查，正文均可读取；链接可访问性只代表该检查时点。

### 线性代数：三套体系

| 体系与一手来源 | 实际核验位置 | 取向差异与使用方式 |
|---|---|---|
| [LA1：MIT 18.06，Spring 2010](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/syllabus/)；[主题目录](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/calendar/) | syllabus 的 Goals、Prerequisites、Text；calendar 的消元、子空间、投影、谱与SVD单元 | 计算、几何与应用路线；官方前置18.02属于课程事实，不复制为本体依赖 |
| [LA2：Axler《Linear Algebra Done Right》第4版](https://linear.axler.net/LADR4e.pdf)；[作者网站](https://linear.axler.net/) | 2026-08-16 PDF目录，第1–3、5–7、9章；§7E–7F及§9A主题定位 | 有限维线性算子与证明路线；行列式安排较晚，不强迫其他体系遵循该顺序 |
| [LA3：Treil《Linear Algebra Done Wrong》](https://www.math.brown.edu/~treil/papers/LADW/LADW_2026_08-31.pdf)；[作者网站](https://sites.google.com/a/brown.edu/sergei-treil-homepage/linear-algebra-done-wrong) | 2026-08-31 PDF前言与第1–7章目录；谱、SVD与二次型定位 | 用计算与几何引入证明，限有限维实／复空间；Jordan和张量不升格为入门必修 |

| Canonical 主题 | MIT | Axler | Treil |
|---|---|---|---|
| 方程组／核与像、基与维数、线性映射 | Goals 1–3、9 | 第1–3章（核／像视角；消元由另两套补足） | 第1–2章 |
| 行列式 | Goals 6 | 第9章 | 第3章 |
| 内积／投影／最小二乘 | Goals 4–5 | 第6章 | 第5章 |
| 特征值／谱／正定性 | Goals 7–8 | 第5、7章 | 第4、6–7章 |
| SVD | Goals 9、calendar | §7E–7F | 第6章§3 |

矩阵消元不是 Axler 的主线；本体采用三体系稳定核心的综合，保留教学方法差异，而非宣称每套体系以同样深度涵盖所有方法。共8个核心学习单元、1组选学说明，配12道本项目编写的题目与解析。

### 概率论：三套体系

| 体系与一手来源 | 实际核验位置 | 取向差异与使用方式 |
|---|---|---|
| [P1：Harvard Stat 110](https://stat110.hsites.harvard.edu/about)；[官方练习入口](https://stat110.hsites.harvard.edu/strategic-practice-problems) | About 的主题／前置；练习页的概念练习及解答组织说明 | 概念与条件化；课程同时包含Markov链，但这不是本批基础完成要求；页面未给固定开课年份，不编造年份记录 |
| [P2：MIT 18.05，Spring 2022](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/pages/syllabus/)；[阅读目录](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/pages/classes-reading-and-in-class-materials/) | syllabus的Probability goals；Unit 1 Classes 1–8 | 概率／统计合授并使用R；本页和课程实现记录只映射其概率部分，未把后面的统计单元并入概率本体 |
| [P3：Grinstead–Snell，CHANCE开放版本](https://math.dartmouth.edu/~prob/prob/prob.pdf) | PDF封面版本日期2006-07-04；第1–9章目录；§6.1条件期望与Theorem 6.5 | 计数、模拟与有限模型；该开放文件是第2版的CHANCE版本，不称为最新出版版本 |

| Canonical 主题 | Harvard主题 | MIT概率部分 | Grinstead–Snell |
|---|---|---|---|
| 事件、计数、条件概率／Bayes | Basics | Classes 1–3 | 第1–4章 |
| 离散／连续分布、变量变换 | 单／多变量分布 | Classes 4–5 | 第1–2、5章 |
| 期望、方差、联合分布与相关 | 矩与多变量主题 | Classes 4–7 | 第4、6–7章 |
| 大数律与CLT | Limit theorems | Class 6 | 第8–9章 |
| 条件期望桥接 | 明确列入主题 | 未列为独立必修单元 | §6.1 |

全方差为本项目从全期望推导的桥接练习，不宣称已核实三套课程均将它列作独立单元。Markov链、矩母函数属于选学；估计、检验和回归留给数理统计。共8个学习单元（含1个桥接单元）、1组边界说明，配12道本项目编写的题目与解析。

原先尝试的Harvard `/syllabus`、`/practice` 与MIT `/pages/classes/` 不能直接读取，未作为已核验URL保存；使用官网导航解析出的实际链接。Harvard推荐的 `probabilitybook.net` 转至Drive，正文读取不足，未纳入本批教材内容证据。

## 数据与教学边界

- KnowledgePage：保留现有Schema，引用标号写在章节标题／阅读说明中；`sources` 保存完整URL、核验状态与日期。必要前置仍仅由catalog动态读取。题目、解析、掌握检查写在现有 `exercises.description` 中，以换行分段，不新增不兼容字段。
- CourseImplementation：独立新增MIT 18.06（2010）、MIT 18.05概率部分（2022）两条历史记录；官方课程名称／编号／年份来自各自syllabus。不能以归档年份推断2026仍按同样安排开课。
- 两条课程记录的1–5维度是本项目的**初步编辑判断**，均保留 `verification=draft`；不是大学官方评分或客观核验结果。总工时无可靠来源，保持 `null`；不加入主观学习经验。
- 本项目掌握阈值属于建议自测，不是学校成绩，也不证明科研能力。定义与定理的条件、反例、计算核对与错误修订比页数更重要。
- 页面仅补充已有资源链接和引用日期的显示，以及多行习题的分段；复用现有HTTP(S) URL校验与转义，不更换网站或Schema。

## 质量判断与12篇标杆目标

本批判断：**可进入内容审阅；保持draft**。具备三体系比较、来源定位、具体练习与解析、可检查完成标准；结构验证不能替代完整事实／教学审核，也没有实际学习者使用反馈。

当前为6条标准页draft记录，不能声称已完成6篇“审核通过标杆页”。下一阶段以两篇一批推进，并同步补核原有四篇；暂不启动约100篇扩展。

| 标杆候选 | 当前状态／下一步 |
|---|---|
| 线性代数、概率论 | 本批来源支持draft；审核题解、章节难度和实际学习可用性 |
| 实分析 I、机器学习 | 现有draft；补三体系核验及真实习题解析 |
| 操作系统、命令行与Git | 现有draft；核实课程／官方文档，补可执行练习与验收 |
| 数理统计、微积分 | 下一批优先候选；数理统计依赖本批两门，微积分为概率前置 |
| 多元微积分、最优化 | 后续候选；遵循各自catalog前置，重点服务统计与AI |
| 数据结构、算法设计与分析 | 后续候选；补CS核心教学覆盖，遵循catalog关系 |

每篇进入标杆计数前，应做到：三套成熟体系有一手证据；章节可定位到来源；典型题含解释与假设检查；至少一组未知题检验迁移；审核者能区分本体与课程事实。学习者未知题若暴露系统性空缺，先修复本批再扩大范围。以上仅为推进建议，本轮只制作指定两篇，不批量生成其余课程。

## 验证记录

见本批随附的 `2026-10-11-validation.md`。PR #6仅在隔离worktree执行兼容性验证，不合并、不改变其分支。
