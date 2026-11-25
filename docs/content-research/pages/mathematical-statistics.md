# 数理统计 审核记录

页面：`content/pages/mathematical-statistics.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [MS1] [MS1] MIT 18.05 Spring 2022 Reading 10b: Maximum Likelihood Estimates，§3、§3.1、§3.2 例 3–4 — https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class10-prep-b.pdf — 2026-11-25
- [MS2] [MS2] Penn State STAT 415 Lesson 1.3: Unbiased Estimation — https://online.stat.psu.edu/stat415/lesson/1/1.3 — 2026-11-25
- [MS3] [MS3] MIT 18.05 Spring 2022 Reading 22: Confidence intervals based on normal data — https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class22-prep.pdf — 2026-11-25

## 出处核对（lesson 部分）

- 定义「似然函数」「最大似然估计」→ [MS1] §3、§3.1、§3.2：2026-11-25 打开 MIT 18.05 Reading 10b 核对，一致（含“不要与 P(p|data) 混淆”）
- 定义「无偏估计量」、推导 → [MS2] §1.3：E[u]=θ 的定义与 E[σ̂²]=(n−1)σ²/n 的推导，经检索结果核对，一致；推导步骤按本页记号重写
- 定义「z 置信区间」→ [MS3] 式 (1)、z₀.₀₂₅=1.96：经检索结果核对，一致
- 例子 → [MS1] §3.2 例 3：寿命 2、3、1、3、4，ℓ=5lnλ−13λ，λ̂=5/13，一致
- 误区 1 → [MS1] §3；误区 2 → [MS3]（置信水平从来不是未知参数落在所算区间的概率），一致；误区 3 → [MS2] 与 [MS1] 附录“渐近无偏”，一致；误区 4 为本项目编写（Jensen 不等式）

## 复核

- 例子：5/13≈0.3846，ℓ″=−33.8<0 ✓
- MS-E01 49/80=0.6125 ✓；MS-E02 5/13 ✓；MS-E03 2.5、1.25、5/3（NumPy）✓；MS-E04 0.0021、0.0458 ✓
- MS-E05 [0.855,4.145]、[0.54,4.46]（临界值 1.6449、1.9600）✓；MS-E06 z=2.5、p=0.01242 ✓
- MS-E07 2/3 与 7/16 ✓；MS-E08 种子 1 模拟：0.7485、0.9979、MSE 0.4391、0.6682、覆盖率 0.9502 ✓

## 待解决

- [MS2]、[MS3] 通过检索结果中的页面摘录核对，未逐段通读全文。
