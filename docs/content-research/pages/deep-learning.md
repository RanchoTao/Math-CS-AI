# 深度学习 审核记录

页面：`content/pages/deep-learning.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [DL-D] [DL-D] Dive into Deep Learning 1.0.3：§3.7、§5.4、§5.6、§8.5–8.6、§12.5–12.6、§12.10–12.11 — https://en.d2l.ai/ — 2026-11-24
- [DL-G] [DL-G] Goodfellow、Bengio、Courville《Deep Learning》：第 7–8 章 — https://www.deeplearningbook.org/ — 2026-11-24
- [DL-S2] [DL-S2] Stanford CS231n Neural Networks Part 2：Weight Initialization、Batch Normalization、Regularization — https://cs231n.github.io/neural-networks-2/ — 2026-11-24
- [DL-S3] [DL-S3] Stanford CS231n Neural Networks Part 3：训练监控、小批量更新与超参数选择 — https://cs231n.github.io/neural-networks-3/ — 2026-11-24
- [DL-N] [DL-N] Ba、Kiros、Hinton《Layer Normalization》，arXiv:1607.06450v1，§3 — https://arxiv.org/html/1607.06450v1 — 2026-11-24
- [DL-R] [DL-R] He 等《Deep Residual Learning for Image Recognition》，arXiv:1512.03385v1，§3.1–3.2 — https://arxiv.org/html/1512.03385v1 — 2026-11-25
- [DL-W] [DL-W] Loshchilov、Hutter《Decoupled Weight Decay Regularization》，arXiv:1711.05101，§2 — https://arxiv.org/html/1711.05101 — 2026-11-24
- [DL-H] [DL-H] He、Zhang、Ren、Sun《Delving Deep into Rectifiers》，arXiv:1502.01852，§2.2 初始化 — https://arxiv.org/pdf/1502.01852 — 2026-11-25

## 出处核对（lesson 部分）

- 定义「He 初始化」「层响应的方差递推」、推导 → [DL-H] §2.2 式 (7)–(10)：2026-11-25 打开 arXiv PDF 核对，公式、对称与零偏置假设、E[x²]=½Var[y] 一致；“标准差 √(2/nₗ)”一致
- 定义「残差块」→ [DL-R] §3.2 式 (1)：2026-11-25 经 arXiv PDF 检索结果核对，一致（含“不增加参数和计算量”“维度须相同”）
- 误区 2 → [DL-R] §1：退化“不是由过拟合引起”“训练误差更高”，一致；误区 3 → [DL-H] §2.2 假设；误区 1、4 为本项目编写，分别对应 DL-E01、DL-E06
- 例子 → [DL-H] 式 (8)–(9)；数据为本项目编写

## 复核

- 例子：(1/2)⁹=1/512≈0.00195；NumPy 模拟 Var[w]=1/n 时 0.00194；He 初始化 20 个网络平均 0.966（范围 0.63–1.69）✓
- DL-E01 更新后 (27/10,8/5)、7/10、2/5，逐步核对 ✓；DL-E02 9/4、6，ReLU 后 9/8、3 ✓；DL-E03 a¹² 两组 ✓
- DL-E04 BN (−1,−2)、(3,0)，LN 两行 (−1,0)，推理 (7,1) ✓；DL-E05 同 DL-E04 ✓；DL-E06 期望训练损失 7/2、推理 2 ✓
- DL-E07 (93/50,−32/25)、(93/50,−57/50)、(93/50,−113/100) ✓；DL-E08 Adam θ₂=9/10−√2/15≈0.805719 ✓；DL-E09 同 DL-E08 第一坐标 ✓
- DL-E10 y=(1/2,−3/2)，梯度 (1,1/2) ✓；DL-E11 选 A 第 2 轮 ✓；DL-E12 c=625/256，验证损失 12769/32768 ✓

## 待解决

- [DL-D]、[DL-G]、[DL-S2]、[DL-S3]、[DL-N]、[DL-W] 沿用 2026-11-24 内容队列的核验记录，本轮未重新打开。
