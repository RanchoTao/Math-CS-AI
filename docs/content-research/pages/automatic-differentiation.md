# 自动微分 审核记录

页面：`content/pages/automatic-differentiation.json`，标准 v2，状态 `draft`，等待维护者抽查。

## 来源

- [AD1] [AD1] Baydin 等《Automatic Differentiation in Machine Learning: a Survey》，arXiv:1502.05767v4（JMLR 18(153), 2018），§2–§4 — https://arxiv.org/pdf/1502.05767 — 2026-11-25
- [AD2] [AD2] JAX 文档：Forward- and reverse-mode autodiff in JAX — https://docs.jax.dev/en/latest/jacobian-vector-products.html — 2026-11-25
- [AD3] [AD3] PyTorch 教程：Jacobians, Hessians, hvp, vhp, and more（jacrev 与 jacfwd） — https://pytorch.org/tutorials/intermediate/jacobians_hessians.html — 2026-11-25

## 出处核对（lesson 部分）

- 定义「自动微分」「对偶数」「伴随量」→ [AD1] §1、§3.1.1、§3.2：2026-11-25 打开 arXiv:1502.05767 核对，一致（ε²=0、ε≠0；v̄ᵢ=∂yⱼ/∂vᵢ）
- 定义「JVP 与 VJP」→ [AD2]：JVP 按列构造雅可比、每列代价约一次求值、适合“高”矩阵；VJP 用于反向模式，经检索结果核对，一致。[AD3] 说明 jacrev 逐行、jacfwd 逐列，一致
- 推导 → [AD1] §3.2 与表 3：伴随量递推、一遍反向得梯度、Jacobian 需 m 遍、内存最坏与运算数成正比，一致；归纳证明为本项目补写
- 例子 → [AD1] 表 2、表 3：轨迹值、切向量与伴随量逐项一致
- 误区 1、2 → [AD1] §2.1、§2.2，一致；误区 3 → [AD1] §4.2（反向传播是 AD 的特例），一致；误区 4 → [AD2]，一致

## 复核

- 例子：v₅=11.652071，∂/∂x₁=5.5，∂/∂x₂=2−cos5=1.716338（Python）✓
- AD-E01 10+7ε ✓；AD-E02 2+e≈4.718、1 ✓；AD-E03 遍数按 n/m 计数 ✓；AD-E04 6 与 3 ✓
- AD-E05 双精度误差 1.6675e−3、1.667e−9、−6.08e−9、3.34e−5（Python）✓
- AD-E06 (1,3,5)、(1,2)，2 次与 3 次 ✓；AD-E07 期望值同例子 ✓；AD-E08 400 MB 与约 80 MB 为量级估计 ✓

## 待解决

- [AD1] 关于反向模式运算量常数 c（c<6，通常 2–3）的说法本页未引用，只写“常数倍”。
