# Transformer 审核记录

页面：`content/pages/transformer.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [TF1] [TF1] arXiv:1706.03762v7，§3.1–3.5、§5.1–5.4 与表 3 — https://arxiv.org/html/1706.03762v7 — 2026-11-25
- [TF2] [TF2] Dive into Deep Learning 1.0.3：§11.7.1–11.7.6 — https://en.d2l.ai/chapter_attention-mechanisms-and-transformers/transformer.html — 2026-11-24
- [TF3] [TF3] The Annotated Transformer v2022：模型、掩码、优化与生成 — https://nlp.seas.harvard.edu/annotated-transformer/ — 2026-11-24
- [TF4] [TF4] Dive into Deep Learning 1.0.3：§11.6.3 正弦位置编码 — https://en.d2l.ai/chapter_attention-mechanisms-and-transformers/self-attention-and-positional-encoding.html — 2026-11-25

## 出处核对（lesson 部分）

- 定义 → [TF1] §3.1（N=6、三个子层、掩码、LayerNorm(x+Sublayer(x))、d_model=512）、§3.3（FFN、d_ff=2048）、§3.5（正弦公式、与嵌入相加）：2026-11-25 打开 arXiv HTML v7 核对，一致
- 推导 → [TF4] §11.6.3 式 (11.6.3)：2×2 投影矩阵与位置无关，一致（经 d2l 的 arXiv 版本 2106.11342 检索结果核对）；[TF1] §3.5 称其为假设，页面表述与之一致
- 例子 → [TF1] §3.2.2、§3.3 给出的维度；参数计数为本项目推算
- 误区 1、3、4 → [TF1] §3.5、§3.3，一致；误区 4 中“学习到的位置嵌入结果几乎相同”见 §3.5 末尾与表 3 行 (E)
- 误区 2 → [TF1] §3.1、§3.2.3 的掩码与自回归描述，一致

## 复核

- 例子：4×(512²+512)=1 050 624；512×2048+2048+2048×512+512=2 099 712；LN 2 048；合计 3 152 384（Python 复算）✓
- 推导：p=3、k=2、ω=1 与 ω=0.01 时旋转结果与直接计算一致（NumPy）✓
- TF-E02 PE(1)≈(0.841471,0.540302,0.010000,0.999950)，结果 (2,−1,0,5) ✓
- TF-E03 cos 3+cos 0.03，由推导第 2–3 步同理可得 ✓；TF-E04 (1,1,0)→(2,1)→(3,0)→(1,−1) ✓
- TF-E05 256+256=512 ✓；TF-E06、TF-E07 形状与掩码逐项核对 ✓；TF-E08 (1,5/2,4)→(1,5/2,8)，无掩码 (4,4,4)→(8,8,8) ✓
- TF-E09 L=ln(16/5)/2≈0.5816，困惑度 4/√5≈1.7889 ✓；TF-E10 硬标签 ln2，平滑 1.3 ln2≈0.9011 ✓
- TF-E11 学习率 1/32、1/8、1/16，峰值第 4 步 ✓；TF-E12 贪心依次选 A、B、EOS ✓

## 待解决

- [TF2]、[TF3] 沿用 2026-11-24 内容队列的核验记录，本轮未重新打开。
- 例子的 PyTorch 计数没有在本环境运行（未安装 PyTorch），数值由公式复算。
