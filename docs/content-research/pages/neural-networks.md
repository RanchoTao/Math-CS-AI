# 神经网络 审核记录

页面：`content/pages/neural-networks.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [NN-P] [NN-P] Stanford CS229 学习理论讲义：感知机预测及错分更新 — https://cs229.stanford.edu/notes_archive/cs229-notes-all/cs229-notes6.pdf — 2026-11-24
- [NN-S] [NN-S] Stanford CS229 Deep Learning 讲义：第 1–3 节的基础部分 — https://cs229.stanford.edu/summer2020/cs229-notes-deep_learning.pdf — 2026-11-24
- [NN-D] [NN-D] Dive into Deep Learning 1.0.3：第 5 章，使用 5.1–5.3 — https://en.d2l.ai/chapter_multilayer-perceptrons/index.html — 2026-11-25
- [NN-B] [NN-B] Dive into Deep Learning 1.0.3：5.3.1–5.3.4 — https://en.d2l.ai/chapter_multilayer-perceptrons/backprop.html — 2026-11-25
- [NN-G] [NN-G] Google Machine Learning Crash Course：神经网络模块目录与学习目标 — https://developers.google.com/machine-learning/crash-course/neural-networks — 2026-11-24
- [NN-X] [NN-X] Google Machine Learning Crash Course：神经网络交互练习的 Exercise 2 — https://developers.google.com/machine-learning/crash-course/neural-networks/interactive-exercises — 2026-11-24

## 出处核对（lesson 部分）

- 定义「MLP」「ReLU」→ [NN-D] §5.1.1.3 式 (5.1.3)、§5.1.2.1 式 (5.1.4)：2026-11-25 打开 d2l §5.1 核对，一致（含 0 处取左导数 0 的约定）
- 定义「反向传播」、推导 → [NN-B] §5.3.3 式 (5.3.9)–(5.3.14)：2026-11-25 打开 d2l §5.3 核对，公式一致；推导步骤为本项目按分量写出
- 例子 → [NN-B] 式 (5.3.11)–(5.3.14)；数据为本项目编写
- 误区 1 → [NN-D] 式 (5.1.2)，一致；误区 2 → [NN-B] §5.3；误区 3 → [NN-B] §5.3.4（训练比预测需要显著更多内存，随层数与批量增长），一致；误区 4 为本项目编写

## 复核

- 例子：z=(−1,2)，h=(0,2)，o=6，L=2，∂W⁽²⁾=[[0,4]]，∂W⁽¹⁾=[[0,0],[6,12]]（NumPy）✓
- NN-E01 新预测 +1 ✓；NN-E02 构造在四点逐一核对 ✓；NN-E03 (1/2,1/4)、(3/4,3/16) ✓；NN-E04 ŷ=2、L=1/2、11 个参数 ✓
- NN-E05 p=3/4、梯度 −1/4 ✓；NN-E06 δ₁=(3/2,0)，∇W₁=[[3,−3/2,3/2],[0,0,0]] ✓；NN-E07 逐项核对 ✓
- NN-E08 平均损失 5/4，平均梯度与解析一致（NumPy）✓；NN-E09 η=0.1 时 L=29929/80000≈0.3741，η=1 时 L=9/2 ✓
- NN-E10 (W₁)₁₂ 差分 −3/2；ReLU 原点差分 1/2 ✓；NN-E11、NN-E12 数值逐项核对（基线验证损失 7/8）✓

## 待解决

- [NN-P]、[NN-S]、[NN-G]、[NN-X] 沿用 2026-11-24 内容队列的核验记录，本轮未重新打开。
