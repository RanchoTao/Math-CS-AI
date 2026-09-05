(async () => {
  "use strict";

  const root = document.getElementById("knowledgePage");
  const params = new URLSearchParams(location.search);
  const requestedTitle = (params.get("title") || "").trim();
  const requestedId = (params.get("id") || "").trim();

  const normalizeCollection = (value) =>
    Array.isArray(value)
      ? value
      : Object.entries(value || {}).map(([id, item]) => ({ id, ...item }));

  const clean = (value) =>
    String(value || "")
      .replace(/\s+/g, "")
      .toLowerCase();

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[char]);

  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ""), location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const fetchJson = async (url, fallback) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      return response.ok ? await response.json() : fallback;
    } catch {
      return fallback;
    }
  };

  const catalog = await window.loadAtlasCatalog();
  const nodes = normalizeCollection(catalog.nodes);
  const clusters = normalizeCollection(catalog.clusters);
  const nodeById = new Map(nodes.map((node) => [String(node.id), node]));
  const clusterById = new Map(clusters.map((cluster) => [String(cluster.id), cluster]));

  let node = requestedId ? nodeById.get(requestedId) : null;
  if (!node && requestedTitle) {
    node = nodes.find((candidate) => clean(candidate.title) === clean(requestedTitle));
  }
  if (!node && requestedTitle) {
    node = nodes.find(
      (candidate) =>
        clean(candidate.title).includes(clean(requestedTitle)) ||
        clean(requestedTitle).includes(clean(candidate.title)),
    );
  }

  if (!node) {
    root.innerHTML = `
      <section class="loading-card error">
        <h1>没有找到知识节点</h1>
        <p>请从知识塔点击节点进入页面。</p>
        <a class="chip" href="./index.html">返回知识塔</a>
      </section>`;
    return;
  }

  const [pageManifest, courseManifest, experienceManifest] = await Promise.all([
    fetchJson("./content/manifest.json", { pages: [] }),
    fetchJson("./content/courses/manifest.json", { courses: [] }),
    fetchJson("./content/experiences/manifest.json", { experiences: [] }),
  ]);

  const nodeNames = new Set([node.title, ...(node.aliases || [])].map(clean));

  const pageEntry = (pageManifest.pages || []).find((entry) =>
    [entry.title, ...(entry.aliases || [])].some((value) => nodeNames.has(clean(value))),
  );

  let page = null;
  if (pageEntry) {
    page = await fetchJson(pageEntry.path, null);
  }

  const courseEntries = (courseManifest.courses || []).filter((entry) =>
    nodeNames.has(clean(entry.knowledgeNode)),
  );

  const experienceEntries = (experienceManifest.experiences || []).filter((entry) =>
    nodeNames.has(clean(entry.knowledgeNode)),
  );

  const courseImplementations = (
    await Promise.all(courseEntries.map((entry) => fetchJson(entry.path, null)))
  ).filter(Boolean);

  const learningExperiences = (
    await Promise.all(experienceEntries.map((entry) => fetchJson(entry.path, null)))
  ).filter(Boolean);

  const DOMAIN = {
    math: "纯数学",
    cs: "计算机科学",
    ai: "人工智能",
  };

  const TYPE = {
    course: "课程级知识",
    practice: "实践与规范",
    tool: "工具与环境",
    frontier: "研究前沿",
  };

  const COURSE_STATUS = {
    active: "当前课程",
    historical: "历史课程版本",
    unknown: "状态待核验",
  };

  const COURSE_VERIFY = {
    draft: "草稿",
    validated: "已核验基础事实",
    reviewed: "已人工审核",
  };

  const EXPERIENCE_TYPE = {
    "community-project": "社区经验",
    "maintainer-review": "维护者评述",
    "learner-report": "学习者报告",
  };

  const stage = Number(node.stage ?? 0);
  const cluster = clusterById.get(String(node.cluster));
  const nextNodes = nodes.filter((candidate) =>
    (candidate.prerequisites || []).map(String).includes(String(node.id)),
  );

  const relationNodes = (ids) =>
    (ids || []).map((id) => nodeById.get(String(id))).filter(Boolean);

  const link = (target) =>
    `./knowledge.html?id=${encodeURIComponent(target.id)}&title=${encodeURIComponent(target.title)}`;

  const chips = (items) =>
    items.length
      ? `<div class="chips">${items
          .map((item) => `<a class="chip" href="${link(item)}">${esc(item.title)}</a>`)
          .join("")}</div>`
      : `<span class="chip">暂无明确要求</span>`;

  const list = (items) =>
    `<ul>${(items || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;

  const fallback = {
    tier: "基础页",
    status: "draft",
    kind: node.type || "course",
    summary: node.summary || `${node.title}的知识节点基础页。`,
    why: "该页面目前直接使用知识图谱中的结构信息，完整课程内容将在后续内容生产流程中补充。",
    learningObjectives: [],
    coreTopics: node.topics || [],
    syllabus: [],
    resources: [],
    exercises: [],
    projects: [],
    completion: {
      basic: "理解该节点的核心概念与基本问题。",
      proficient: "能够独立使用该节点的主要方法解决典型问题。",
      researchReady: "能够继续进入图谱标注的后续课程或研究方向。",
    },
    sources: [],
  };

  const content = {
    ...fallback,
    ...(page || {}),
    completion: {
      ...fallback.completion,
      ...(page?.completion || {}),
    },
  };

  document.title = `${node.title} · 知识节点`;

  const resourceHtml = (content.resources || []).length
    ? (content.resources || [])
        .map((resource) => {
          const url = safeUrl(resource.url);
          const title = url
            ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(resource.title)}</a>`
            : esc(resource.title);
          return `
            <div class="resource">
              <strong>${title}</strong>
              <small>${esc([resource.type, resource.author, resource.institution].filter(Boolean).join(" · "))}</small>
              ${resource.verification ? `<div class="source-status">${esc(resource.verification)}</div>` : ""}
            </div>`;
        })
        .join("")
    : `<p>资源尚未整理。</p>`;

  const syllabusHtml = (content.syllabus || []).length
    ? (content.syllabus || [])
        .map(
          (section, index) => `
            <div class="syllabus-item">
              <strong>${String(index + 1).padStart(2, "0")} ${esc(section.title)}</strong>
              <div class="chips">${(section.topics || [])
                .map((topic) => `<span class="chip">${esc(topic)}</span>`)
                .join("")}</div>
            </div>`,
        )
        .join("")
    : `<p>章节结构尚未整理。</p>`;

  const sourceHtml = (content.sources || []).length
    ? (content.sources || [])
        .map((source) => {
          const url = safeUrl(source.url);
          const title = url
            ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(source.title)}</a>`
            : esc(source.title);
          return `
            <div class="resource">
              <strong>${title}</strong>
              <small>${esc([source.sourceType, source.institution].filter(Boolean).join(" · "))}</small>
              <div class="source-status">${esc(source.verification || "待核验")}</div>
            </div>`;
        })
        .join("")
    : `<p>来源尚未整理。</p>`;

  const dimensionLabels = {
    theoryDepth: "理论深度",
    practiceIntensity: "实践强度",
    mathRequirement: "数学要求",
    programmingIntensity: "编程强度",
    resourceCompleteness: "资源完整度",
  };

  const dimensionBars = (course) =>
    Object.entries(dimensionLabels)
      .map(([key, label]) => {
        const value = Number(course.dimensions?.[key] || 0);
        const segments = Array.from({ length: 5 }, (_, index) =>
          `<span class="dimension-segment ${index < value ? "filled" : ""}"></span>`,
        ).join("");
        return `
          <div class="dimension-row">
            <span>${label}</span>
            <div class="dimension-scale" aria-label="${esc(label)} ${value}/5">${segments}</div>
            <b>${value}/5</b>
          </div>`;
      })
      .join("");

  const courseCard = (course) => {
    const officialUrl = safeUrl(course.officialUrl);
    const workload = course.workload?.estimatedHours
      ? `${course.workload.estimatedHours.min}–${course.workload.estimatedHours.max} 小时`
      : "未给出统一学时估计";

    const coverage = (course.coverage || [])
      .map(
        (item) =>
          `<span class="chip coverage-${esc(item.level)}">${esc(item.topic)} · ${esc(item.level)}</span>`,
      )
      .join("");

    const features = (course.features || [])
      .map((feature) => `<span class="chip">${esc(feature)}</span>`)
      .join("");

    return `
      <article class="course-card">
        <div class="course-card-head">
          <div>
            <div class="course-meta">
              <span>${esc(course.institution)}</span>
              ${course.courseCode ? `<span>${esc(course.courseCode)}</span>` : ""}
              ${course.academicYear ? `<span>${esc(course.academicYear)}</span>` : ""}
              <span>${esc(course.language)}</span>
            </div>
            <h3>${esc(course.title)}</h3>
          </div>
          <div class="verify-badges">
            <span class="badge">${esc(COURSE_STATUS[course.status] || course.status)}</span>
            <span class="badge">${esc(COURSE_VERIFY[course.verification] || course.verification)}</span>
          </div>
        </div>

        <div class="course-note">
          <strong>课程风格维度</strong>
          <span>仅描述课程特征，不计算总分，不作为学校或课程排名。</span>
        </div>
        <div class="dimension-grid">${dimensionBars(course)}</div>
        ${course.dimensionNote ? `<p class="muted">${esc(course.dimensionNote)}</p>` : ""}

        <div class="course-facts">
          <div><span>预计投入</span><strong>${esc(workload)}</strong></div>
          <div><span>课程特点</span><div class="chips">${features || '<span class="chip">尚未整理</span>'}</div></div>
        </div>

        <div class="course-subsection">
          <h4>覆盖主题</h4>
          <div class="chips">${coverage || '<span class="chip">尚未整理</span>'}</div>
        </div>

        <div class="course-actions">
          ${
            officialUrl
              ? `<a class="primary-link" href="${esc(officialUrl)}" target="_blank" rel="noreferrer">打开官方课程页面 →</a>`
              : `<span class="muted">官方链接尚未核验</span>`
          }
        </div>
      </article>`;
  };

  const coursesHtml = courseImplementations.length
    ? `<div class="course-grid">${courseImplementations.map(courseCard).join("")}</div>`
    : `
      <div class="empty-state">
        <strong>暂无已整理的课程实现</strong>
        <p>该知识节点尚未完成大学课程、公开课或标准教学体系的映射。后续研究会优先回到官方课程主页核验。</p>
      </div>`;

  const experienceBlock = (experience) => {
    const sourceUrl = safeUrl(experience.source?.url);
    const typeLabel = EXPERIENCE_TYPE[experience.sourceType] || experience.sourceType;
    const metricItems = [];
    if (Number.isFinite(experience.workloadHours)) metricItems.push(`社区记录学时：${experience.workloadHours} 小时`);
    if (Number.isFinite(experience.difficulty)) metricItems.push(`社区难度：${experience.difficulty}/5`);

    const section = (title, items) =>
      (items || []).length
        ? `<div class="experience-part"><h4>${esc(title)}</h4>${list(items)}</div>`
        : "";

    return `
      <article class="experience-card">
        <div class="experience-head">
          <div>
            <span class="subjective-badge">社区经验 / 主观经验</span>
            <h3>${esc(typeLabel)}</h3>
          </div>
          <span class="source-status">${esc(experience.verification)}</span>
        </div>

        ${
          metricItems.length
            ? `<div class="experience-metrics">${metricItems
                .map((item) => `<span>${esc(item)}</span>`)
                .join("")}</div>`
            : ""
        }

        ${section("常见难点", experience.hardestParts)}
        ${section("最有价值部分", experience.mostValuableParts)}
        ${section("建议前置", experience.recommendedPreparation)}
        ${section("学习建议", experience.advice)}

        <div class="experience-source">
          <span>来源：</span>
          ${
            sourceUrl
              ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noreferrer">${esc(experience.source?.title || "社区来源")}</a>`
              : `<span>${esc(experience.source?.title || "未注明来源")}</span>`
          }
        </div>
      </article>`;
  };

  const experiencesHtml = learningExperiences.length
    ? `
      <div class="subjective-notice">
        以下内容属于社区经验或学习者主观反馈，不等于学校官方要求，也不参与 canonical syllabus 的事实判定。
      </div>
      <div class="experience-grid">${learningExperiences.map(experienceBlock).join("")}</div>`
    : `
      <div class="empty-state">
        <strong>暂无学习经验记录</strong>
        <p>后续可以接入经过来源标注的社区经验、维护者评述和学习者报告；这些内容会始终与官方课程事实分开展示。</p>
      </div>`;

  root.innerHTML = `
    <section class="hero">
      <div class="eyebrow">
        <span class="badge ${esc(node.domain)}">${esc(DOMAIN[node.domain] || "跨学科")}</span>
        <span class="badge">第${stage}层</span>
        <span class="badge">${esc(TYPE[content.kind] || TYPE[node.type] || "知识节点")}</span>
        <span class="badge">${esc(content.tier)}</span>
      </div>
      <h1>${esc(node.title)}</h1>
      <p class="summary">${esc(content.summary)}</p>
      <div class="hero-grid">
        <div class="stat"><span>所属学科群</span><strong>${esc(cluster?.title || "未分类")}</strong></div>
        <div class="stat"><span>页面状态</span><strong>${esc(content.status)}</strong></div>
        <div class="stat"><span>必要前置</span><strong>${(node.prerequisites || []).length} 个</strong></div>
        <div class="stat"><span>直接后续</span><strong>${nextNodes.length} 个</strong></div>
      </div>
    </section>

    ${
      page
        ? ""
        : `<div class="notice"><strong>基础页：</strong>该节点已经拥有可访问页面，但目前只使用图谱元数据生成。后续将通过统一内容流水线升级为标准页或精品页。</div>`
    }

    <div class="layer-tabs" aria-label="内容层级说明">
      <span><b>知识标准</b>：稳定知识本体与 canonical syllabus</span>
      <span><b>课程实现</b>：真实大学或公开课程如何教授该知识</span>
      <span><b>学习经验</b>：社区或学习者的主观反馈</span>
    </div>

    <div class="content-grid">
      <div class="column">
        <section class="section">
          <div class="section-kicker">知识标准</div>
          <h2>为什么学习</h2>
          <p>${esc(content.why)}</p>
        </section>

        <section class="section">
          <div class="section-kicker">知识标准</div>
          <h2>学习目标</h2>
          ${content.learningObjectives.length ? list(content.learningObjectives) : "<p>学习目标尚未整理。</p>"}
        </section>

        <section class="section">
          <div class="section-kicker">知识标准</div>
          <h2>核心内容</h2>
          ${
            content.coreTopics.length
              ? `<div class="chips">${content.coreTopics.map((topic) => `<span class="chip">${esc(topic)}</span>`).join("")}</div>`
              : "<p>核心内容尚未整理。</p>"
          }
        </section>

        <section class="section">
          <div class="section-kicker">知识标准</div>
          <h2>Canonical Syllabus</h2>
          <p class="muted">这里代表该知识领域相对稳定的教学核心，不等同于任何一所学校的单门课程大纲。</p>
          ${syllabusHtml}
        </section>

        ${
          (content.exercises || []).length
            ? `<section class="section"><div class="section-kicker">知识标准</div><h2>练习类型</h2>${list(
                content.exercises.map((item) => `${item.type}：${item.description}`),
              )}</section>`
            : ""
        }

        ${
          (content.projects || []).length
            ? `<section class="section"><div class="section-kicker">知识标准</div><h2>项目</h2>${content.projects
                .map(
                  (project) => `
                    <div class="syllabus-item">
                      <strong>${esc(project.title)}</strong>
                      <p>${esc(project.description)}</p>
                      ${project.deliverable ? `<small>交付物：${esc(project.deliverable)}</small>` : ""}
                    </div>`,
                )
                .join("")}</section>`
            : ""
        }
      </div>

      <aside class="column">
        <section class="section">
          <h2>必要前置</h2>
          ${chips(relationNodes(node.prerequisites))}
          <h3>推荐关联</h3>
          ${chips(relationNodes(node.recommended))}
          <h3>可继续进入</h3>
          ${chips(nextNodes)}
        </section>

        <section class="section">
          <h2>完成标准</h2>
          <div class="completion">
            <div><b>基础完成</b><span>${esc(content.completion.basic)}</span></div>
            <div><b>熟练掌握</b><span>${esc(content.completion.proficient)}</span></div>
            <div><b>研究准备</b><span>${esc(content.completion.researchReady)}</span></div>
          </div>
        </section>

        <section class="section"><h2>学习资源</h2>${resourceHtml}</section>
        <section class="section"><h2>参考来源</h2>${sourceHtml}</section>
      </aside>
    </div>

    <section class="section wide-section course-layer">
      <div class="section-title-row">
        <div>
          <div class="section-kicker">课程实现</div>
          <h2>推荐课程实现</h2>
          <p>这里展示真实大学、公开课程或标准教学体系对该知识节点的具体实现。课程实现不是知识节点本身。</p>
        </div>
      </div>
      ${coursesHtml}
    </section>

    <section class="section wide-section experience-layer">
      <div class="section-title-row">
        <div>
          <div class="section-kicker">学习经验</div>
          <h2>学习经验</h2>
          <p>这一层用于保留真实学习者和社区项目的经验信息，并与官方课程事实彻底分离。</p>
        </div>
      </div>
      ${experiencesHtml}
    </section>`;

})().catch((error) => {
  console.error(error);
  const root = document.getElementById("knowledgePage");
  if (root) {
    root.innerHTML = `
      <section class="loading-card error">
        <h1>知识页面加载失败</h1>
        <p>${String(error.message || error)}</p>
      </section>`;
  }
});
