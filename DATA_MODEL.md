# Atlas Data Model

当前静态数据由 `data/catalog.js` 提供，运行时解压为以下结构：

```ts
interface Cluster {
  id: string;
  title: string;
  domain: "math" | "cs" | "ai";
  stage: number;
  order: number;
  summary: string;
}

interface KnowledgeNode {
  id: string;
  title: string;
  domain: "math" | "cs" | "ai";
  cluster: string;
  stage: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  type: "course" | "practice" | "tool" | "frontier";
  summary: string;
  prerequisites: string[];
  recommended: string[];
  topics: string[];
  tags: string[];
}
```

## 关系语义

- `prerequisites`：必要或接近必要的前置依赖；
- `recommended`：建议先学，但并非严格必要；
- `clusterEdges`：总览中学科群之间的聚合关系；
- `paths`：面向目标的示例路线；
- `curricula`：覆盖在公共知识图谱上的选择层。

学校课程不应直接替代知识节点。后续课程映射建议使用：

```ts
interface CourseOffering {
  id: string;
  institution: string;
  courseName: string;
  credits?: number;
  covers: string[];
}
```
