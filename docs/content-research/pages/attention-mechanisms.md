# 注意力机制 审核记录

页面：`content/pages/attention-mechanisms.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [AM1] [AM1] arXiv:1409.0473，§3.1、§A.1.2 及对齐公式 — https://arxiv.org/html/1409.0473 — 2026-11-24
- [AM2] [AM2] Dive into Deep Learning 1.0.3：§11.3 的归一化、缩放点积与加性打分 — https://en.d2l.ai/chapter_attention-mechanisms-and-transformers/attention-scoring-functions.html — 2026-11-24
- [AM3] [AM3] Dive into Deep Learning 1.0.3：§11.5.1–11.5.2 多头投影和实现 — https://en.d2l.ai/chapter_attention-mechanisms-and-transformers/multihead-attention.html — 2026-11-24
- [AM4] [AM4] arXiv:1706.03762v7，§3.2.1–3.2.3 的注意力公式与用途 — https://arxiv.org/html/1706.03762v7 — 2026-11-25
- [AM5] [AM5] Dive into Deep Learning 1.0.3：§11.4.1 的 Bahdanau 模型 — https://en.d2l.ai/chapter_attention-mechanisms-and-transformers/bahdanau-attention.html — 2026-11-24

## 出处核对（lesson 部分）

- 定义「注意力函数」「缩放点积注意力」「多头注意力」「掩码」→ [AM4] §3.2、§3.2.1 式 (1)、§3.2.2、§3.2.3：2026-11-25 打开 arXiv HTML v7 逐条核对，一致（h=8，dₖ=dᵥ=64；掩码设为 −∞）
- 推导「除以 √dₖ」→ [AM4] §3.2.1 及脚注：脚注假设与结论（均值 0、方差 dₖ）一致；HTML 版脚注编号显示为 1，PDF 版为 4，因此出处不写编号。“标准差约为 8”和“启发式论证”的说明为本项目所加
- 例子 → [AM4] 式 (1) 与 §3.2.3 掩码方法；数据为本项目编写
- 误区 1 为本项目编写；误区 2–4 → [AM4] 对应小节，一致

## 复核

- 例子：分数 (ln3, ln2, 0)，权重 (1/2,1/3,1/6)，输出 (4,3)；掩码后 (3/5,2/5)，输出 (18/5,12/5)（NumPy 复算）✓
- AM-E01 (2,3)、(5/2,5/2) ✓；AM-E02 (2,7/2) ✓；AM-E03 (3,2) ✓；AM-E04 18/5 与 3 ✓
- AM-E05 方差 64 与 1，同推导 ✓；AM-E06 (2e+5)/(e+1)≈2.806824 ✓；AM-E07 7 与 28 ✓
- AM-E08 形状逐项核对 ✓；AM-E09 (25/3, 2/3) ✓；AM-E10 576 个权重、45 个分数、180 次乘法 ✓
- AM-E11 o=3，偏导 (−4/3, 4/3) ✓；AM-E12 正确屏蔽 5、漏屏蔽 10 ✓

## 待解决

- [AM1]、[AM2]、[AM3]、[AM5] 沿用 2026-11-24 内容队列的核验记录，本轮未重新打开。
