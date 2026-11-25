# 线性代数 审核记录

页面：`content/pages/linear-algebra.json`（标准 v2 样板），状态 `draft`，等待维护者抽查。

## 来源

- [LA1] MIT 18.06 Spring 2010 syllabus — https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/syllabus/ — 2026-10-11 核验（课程结构）
- [LA1-C] MIT 18.06 calendar — https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/calendar/ — 2026-11-25 重新打开，核对讲次编号：SES 8 Rectangular PA=LU and Ax=b，SES 15 Projections and subspaces，SES 16 Least squares approximations，SES 31 Singular value decomposition
- [LA2] Axler, Linear Algebra Done Right 4e — https://linear.axler.net/LADR4e.pdf — 2026-11-25 重新打开，核对定义 2.15、2.26、3.1、3.11、3.16，定理 3.21 及证明，5.55(d)、5.58，6.61（第 6C 节）
- [LA3] Treil, Linear Algebra Done Wrong — https://www.math.brown.edu/~treil/papers/LADW/LADW_2026_08-31.pdf — 2026-10-11 核验；本轮新增内容没有引用它（2026-11-25 再次打开的请求未获批准）
- [LA4] MIT 18.06 assignments — https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/assignments/ — 2026-10-11 核验

## 出处核对（lesson 部分）

- 定义「线性映射」→ [LA2] 3.1：可加性与齐次性，一致
- 定义「线性无关」→ [LA2] 2.15：含空组约定，一致
- 定义「基」→ [LA2] 2.26：一致；“维数等于基的长度”是 Axler 第 2C 节的定义，表述一致
- 定义「零空间与值域」→ [LA2] 3.11、3.16：一致；“分别是 V、W 的子空间”见 3.13、3.18（本轮未逐号核对，内容是标准结论）
- 推导「秩－零化度」→ [LA2] 3.21：命题与证明结构（取 null T 的基、扩充、证张成与无关）一致；步骤为中文重写，不是逐字翻译
- 例子「直线拟合」→ [LA1-C] SES 15–16：讲次主题一致；具体数据为本项目编写
- 误区 1 → [LA1-C] SES 8：讲次主题一致；反例为本项目编写
- 误区 2 → [LA2] 5.55(d)、5.58：判据与“充分非必要”一致
- 误区 3 → [LA2] 6.61：投影是唯一最近点，一致
- 误区 4：无出处，反例已用 SymPy 验证（rref([[1,2],[2,4]]) = [[1,2],[0,0]]）

## 复核

用 SymPy 精确计算（2026-11-25）：

- 例子：AᵀA=[[3,3],[3,5]]，Aᵀb=(5,6)ᵀ，x=(7/6,1/2)ᵀ，残差 (−1/6,1/3,−1/6)ᵀ，Aᵀ·残差=0，残差平方和 1/6 ✓
- 误区 1 反例：增广矩阵 rref 出现 [0 0 0 | 1]，无解 ✓
- LA-E01：rank 2，null space 基 (1,−1,1)ᵀ，特解 (0,1,0)ᵀ 与 (1,0,1)ᵀ 均满足 Ax=b ✓
- LA-E02：y=(−2,1,0)ᵀ，Aᵀy=0，yᵀb=1 ✓
- LA-E05：P⁻¹ diag(1,2) P = [[3/2,−1/2],[−1/2,3/2]] ✓
- LA-E06：det B=15，det B⁻¹=1/15 ✓
- LA-E07：同例子 ✓
- LA-E08：q₂=(1,−1,2)ᵀ/√6，R₁₂=1/√2，R₂₂=√6/2=√(3/2) ✓
- LA-E10：特征对 (3,(1,1)ᵀ)、(1,(−1,1)ᵀ)，正定 ✓
- LA-E11：A⁺=[[1/3,0,0],[0,1,0]]，秩 1 截断的 Frobenius 误差为 1 ✓
- LA-E03、E04、E09：证明题，按步骤人工复核，论证完整
- LA-E12：编程复现题，结果应与 E07、E11 一致

## 待解决

- [LA3] 本轮未能重新打开，lesson 部分没有引用它。
- 定义 3.13、3.18 的编号未逐号核对。
