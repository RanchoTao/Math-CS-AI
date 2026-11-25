# 序列模型 审核记录

页面：`content/pages/sequence-models.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [SQ1] [SQ1] Stanford CS224n Part V：第 1–4 节 — https://web.stanford.edu/class/archive/cs/cs224n/cs224n.1214/readings/cs224n-2019-notes05-LM_RNN.pdf — 2026-11-24
- [SQ2] [SQ2] Dive into Deep Learning 1.0.3：第 9.3–9.5 节 — https://d2l.ai/chapter_recurrent-neural-networks/index.html — 2026-11-25
- [SQ3] [SQ3] Dive into Deep Learning 1.0.3：第 9.7 节完整与截断反传 — https://d2l.ai/chapter_recurrent-neural-networks/bptt.html — 2026-11-25
- [SQ4] [SQ4] Dive into Deep Learning 1.0.3：第 10.1、10.2 和 10.7.1 节 — https://d2l.ai/chapter_recurrent-modern/index.html — 2026-11-25
- [SQ5] [SQ5] Deep Learning 第 10 章：展开、BPTT、长程梯度与门控 — https://www.deeplearningbook.org/contents/rnn — 2026-11-24
- [SQ6] [SQ6] PyTorch 2.15 torch.nn.GRU：公式与实现差异注记 — https://docs.pytorch.org/docs/2.15/generated/torch.nn.GRU.html — 2026-11-24

## 出处核对（lesson 部分）

- 定义「RNN」→ [SQ2] §9.4.2 式 (9.4.5)、(9.4.6)：2026-11-25 经检索结果核对式 (9.4.5) 与 (9.4.6)，一致
- 定义「截断 BPTT」→ [SQ3] §9.7.1.2：2026-11-25 打开核对，近似真实梯度、偏向短期影响，一致；“显著减少计算量”为本项目概括
- 定义「LSTM」→ [SQ4] §10.1.1 式 (10.1.1)–(10.1.4)：2026-11-25 打开 d2l §10.1 核对，一致
- 推导 → [SQ3] §9.7.2：线性情形式 (9.7.15) 的 W_hhᵀ 幂次与“特征值小于 1 消失、大于 1 发散”一致；非线性情形的范数上界与 LSTM 对照为本项目补充的标准推导
- 例子、误区 1、误区 4 为本项目编写；误区 2 → [SQ3] §9.7.1.2；误区 3 → [SQ4] 式 (10.1.3)

## 复核

- 例子：0.9⁵⁰≈0.005154，1.1⁵⁰≈117.39，0.99⁵⁰≈0.6050（Python）✓
- SQ-E01 困惑度 4 ✓；SQ-E02 (5/2,1/4,25/8) 与 (7/2,3/4,19/8) ✓；SQ-E03 2ln2 与 4，逐句平均 (9/4)ln2 ✓
- SQ-E04 h=(3,5)，L=17，dL/dw=28 ✓；SQ-E05 |a|ᵏ 六组值 ✓；SQ-E06 1/2 与 (3,−4) ✓
- SQ-E07 完整 39/64、截断 33/64 ✓；SQ-E08 c₁=1/4、h₁≈0.122459、c₂=5/16、h₂≈0.227032、导数 3/8 ✓
- SQ-E09 两种状态 ≈(0.216213,−0.031735) 与 (0.313770,0.143768) ✓；SQ-E10 12、36、48 ✓；SQ-E11 逐步核对 ✓
- SQ-E12 导数 1/8、1/128、1/32768，截断后 T=8、16 为 0 ✓

## 待解决

- [SQ1]、[SQ5]、[SQ6] 沿用 2026-11-24 内容队列的核验记录，本轮未重新打开。
