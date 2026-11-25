# 机器学习 审核记录

页面：`content/pages/machine-learning.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [ML1] [ML1] CS229 Lecture Notes（Tengyu Ma、Andrew Ng），§2.1 逻辑回归、§8.1 偏差—方差、§9.1 正则化、§9.3 交叉验证 — https://cs229.stanford.edu/main_notes.pdf — 2026-11-25
- [ML2] [ML2] Shalev-Shwartz、Ben-David《Understanding Machine Learning》第 2 章：式 (2.1)–(2.3)、§2.3 — https://cs.huji.ac.il/~shais/UnderstandingMachineLearning/understanding-machine-learning-theory-algorithms.pdf — 2026-11-25
- [ML3] [ML3] scikit-learn 用户指南 §3.1 Cross-validation: evaluating estimator performance — https://scikit-learn.org/stable/modules/cross_validation.html — 2026-11-25

## 出处核对（lesson 部分）

- 定义「真实误差与训练误差」→ [ML2] 式 (2.1)、(2.2)：2026-11-25 打开作者公开 PDF 核对，一致
- 定义「ERM_H」→ [ML2] §2.3：一致（H 越大越易过拟合）
- 定义「逻辑回归」「正则化」→ [ML1] §2.1 式 (2.1)、§9.1 式 (9.1)：2026-11-25 打开 CS229 main_notes.pdf 核对，一致
- 推导 → [ML1] §2.1 式 (2.2) 与随机梯度上升规则，结论一致；步骤为本项目展开
- 例子 → [ML1] §2.1 更新规则；数据为本项目编写
- 误区 1 → [ML2] 式 (2.3)（记忆预测器训练误差 0、真实误差 1/2），一致；误区 2 → [ML1] §8.1（五次多项式训练误差为零但泛化差、复杂度权衡），一致
- 误区 3、4 → [ML3] §3.1：测试集留作最终评估、在测试集上调参会泄漏、预处理只在训练集上学习，经检索结果核对，一致

## 复核

- 例子：σ(0)=0.5，θ=(0.05,0.1)，σ(0.25)=0.56218，损失 0.69315→0.57594（Python）✓
- ML-E01 错误数 3,2,1,2,1,2 ✓；ML-E02 按 [ML2] 式 (2.3) 论证 ✓；ML-E03 13/14、13/20 ✓
- ML-E04 h=0.11920，梯度 (0.88080,−1.76159)，θ=(0.44040,0.11920) ✓；ML-E05 50+1=51 次，每次 720 个 ✓
- ML-E06 0.97、0.75、0.6、2/3、0.95 ✓；ML-E07 0.5 ✓
- ML-E08 例子：全体均值 4、总体标准差 √(56/3)≈4.32，(0−4)/4.32≈−0.93，(2−4)/4.32≈−0.46，(10−4)/4.32≈1.39 ✓

## 待解决

- CS229 讲义每年更新，页码和小节号可能随版本变化；本页按 2026-11-25 打开的 main_notes.pdf 记录。
