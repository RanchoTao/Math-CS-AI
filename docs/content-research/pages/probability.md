# 概率论 审核记录

页面：`content/pages/probability.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [P1] [P1] Harvard Stat 110：课程主题与前置 — https://stat110.hsites.harvard.edu/about — 2026-10-11
- [P1-X] [P1-X] Harvard Stat 110：官方练习与解答入口 — https://stat110.hsites.harvard.edu/strategic-practice-problems — 2026-10-11
- [P2] [P2] MIT 18.05，Spring 2022：syllabus（仅取概率部分） — https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/pages/syllabus/ — 2026-10-11
- [P2-R] [P2-R] MIT 18.05：Unit 1阅读与课堂练习目录 — https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/pages/classes-reading-and-in-class-materials/ — 2026-10-11
- [P3] [P3] Grinstead–Snell，CHANCE开放版本（2006-07-04），第1–9章 — https://math.dartmouth.edu/~prob/prob/prob.pdf — 2026-10-11
- [P3-L] [P3-L] Grinstead–Snell，Introductory Probability（LibreTexts 版）§4.1 Discrete Conditional Probability — https://stats.libretexts.org/Bookshelves/Probability_Theory/Introductory_Probability_(Grinstead_and_Snell)/04%3A_Conditional_Probability/4.01%3A_Discrete_Conditional_Probability — 2026-11-25

## 出处核对（lesson 部分）

- 定义「条件概率」→ [P3-L] §4.1：P(F|E)=P(F∩E)/P(E)，要求 P(E)>0，一致
- 定义「独立事件」→ [P3-L] §4.1：书中以条件概率定义并给出等价的乘积判据；本页以乘积式为定义、条件概率式为等价形式，内容一致
- 定义「假设组」→ [P3-L] §4.1 Bayes’ Formula：两两不相交且并为 Ω，一致
- 推导「Bayes 公式」→ [P3-L] §4.1：公式形式一致；推导步骤为本项目编写
- 例子 → [P3-L] Example 4.17：患病率 0.001、敏感度 0.99、特异度 0.95、后验约 0.019，一致
- 误区 1 → [P3-L] Example 4.17，一致；误区 2–4 为本项目编写，反例已复算
- [P3-L] 是 Grinstead–Snell 同一教材的 LibreTexts 版本；2026-11-25 打开的是这个版本，[P3] Dartmouth PDF 本轮未能重新打开（访问请求未获批准）

## 复核

- 例子：0.00099/0.05094=0.019435；10 万人频数表 99/5094 相同 ✓
- P-E01：C(5,2)C(3,1)/C(8,3)=15/28 ✓
- P-E02：0.009/0.0585=2/13≈0.153846 ✓
- P-E03：四个等可能样本逐一枚举，两两交集 1/4，三者交集 1/4 ✓
- P-E04：几何分布尾和 Σ(1−p)^k=1/p ✓
- P-E05：EX=2/3，Var X=1/18（SymPy）✓
- P-E06：逆变换推导逐步核对 ✓
- P-E07：指标变量 n·(1/n)=1 ✓
- P-E08：∫₀¹∫₀ʸ2dxdy=1；边缘与条件期望逐步核对 ✓
- P-E09：Cov=0，P(Y=0|X=0)=1≠1/3 ✓
- P-E10：Var X₁=0.16+0.09=0.25，E[X₁X₂]=0.34，Cov=0.09 ✓
- P-E11：0.21/(100×0.01)=0.21 ✓
- P-E12：模拟题，理论基准与 E10、E11 一致

## 待解决

- [P1]、[P1-X]、[P2]、[P2-R]、[P3] 沿用 2026-10-11 的核验，本轮未重新打开。
