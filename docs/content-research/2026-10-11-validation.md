# 首批内容验证回执

日期：2026-10-11。知识页与课程实现均保持draft；不将校验结果写成reviewed。

| 检查 | 结果 | 证据／限制 |
|---|---|---|
| 296节点覆盖审计 | PASS | catalog完整解压；manifest一对一映射；前置快照及原页SHA-256见coverage JSON |
| main的内容命令 | PASS | 6知识页、3课程实现、1学习经验，296节点 |
| 完整JSON Schema | PASS | 用Python jsonschema的Draft202012Validator及FormatChecker校验全部知识页、课程实现、经验；不只依赖仓库简化校验器 |
| 页面回归 | 5/5 PASS | 执行真实knowledge.js，加载真实catalog、manifest及JSON；新页内容、原四页兼容、统计fallback、前置、HTTP(S)引用与转义 |
| PR #6兼容性 | 53/53 PASS | 隔离worktree位于`ccabfd7385f4a655164b8e68a9b64c029047a6a8`，复制本批内容与页面改动再跑其现有回归；PR #6不合并也不修改 |
| 题解计算抽查 | PASS | 独立NumPy计算／Fraction精确计算；不是将答案字符串与自身比较 |
| JS语法与diff空白 | PASS | `node --check knowledge.js`、`git diff --check` |
| 真实浏览器截图／视觉检查 | 未完成 | 环境无Chromium，Playwright下载收到不完整压缩包；页面测试是VM环境中的实际渲染逻辑，不能冒充浏览器布局验收 |
| 完整人工教学审核／学习者反馈 | 待进行 | source核验与结构测试不替代教学内容审阅；不自动升级发布状态 |

题解独立核对覆盖：LA-E01秩／核／通解，E05换基，E07最小二乘与平方残差1/6，E08 QR正交性与重构，E10谱分解，E11伪逆与秩1误差；P-E02 Bayes结果2/13，E05方差1/18，E10组间方差9/100及总方差1/4，E11 Chebyshev界21/100。证明题已逐步检查论证与假设，但没有形式化证明认证。

## 本分支可复现命令

```sh
node scripts/validate-content.mjs
node --test tests/knowledge-content.test.mjs
node --check knowledge.js
git diff --check
```

完整Schema核验需本地安装`jsonschema`（不新增网站运行时依赖）：

```python
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

for manifest, key, schema in [
    ('content/manifest.json', 'pages', 'schemas/knowledge-page.schema.json'),
    ('content/courses/manifest.json', 'courses', 'schemas/course-implementation.schema.json'),
    ('content/experiences/manifest.json', 'experiences', 'schemas/learning-experience.schema.json'),
]:
    contract = json.loads(Path(schema).read_text())
    Draft202012Validator.check_schema(contract)
    validator = Draft202012Validator(contract, format_checker=FormatChecker())
    for entry in json.loads(Path(manifest).read_text())[key]:
        validator.validate(json.loads(Path(entry['path']).read_text()))
    print('PASS', key)
```

PR #6的图谱回归不在main中，故本分支不复制其实现。对该commit建立隔离worktree，将本批修改的`content`、`knowledge.js`及本分支页面测试复制过去，再执行：

```sh
node scripts/validate-content.mjs
node --test tests/validate-graph.test.mjs tests/knowledge-content.test.mjs
```

合计58项通过。新增页面测试本批手动运行；现有部署工作流未改，避免把内容审阅分支与部署或PR #6的CI改动混在一起。
