(async()=>{
"use strict";
const root=document.getElementById("knowledgePage");
const params=new URLSearchParams(location.search);
const requestedTitle=(params.get("title")||"").trim();
const requestedId=(params.get("id")||"").trim();
const normalize=v=>Array.isArray(v)?v:Object.entries(v||{}).map(([id,item])=>({id,...item}));
const catalog=await window.loadAtlasCatalog();
const nodes=normalize(catalog.nodes),clusters=normalize(catalog.clusters);
const nodeById=new Map(nodes.map(n=>[String(n.id),n]));
const clusterById=new Map(clusters.map(c=>[String(c.id),c]));
const clean=s=>String(s||"").replace(/\s+/g,"").toLowerCase();
let node=requestedId?nodeById.get(requestedId):null;
if(!node&&requestedTitle) node=nodes.find(n=>clean(n.title)===clean(requestedTitle));
if(!node&&requestedTitle) node=nodes.find(n=>clean(n.title).includes(clean(requestedTitle))||clean(requestedTitle).includes(clean(n.title)));
if(!node){root.innerHTML=`<section class="loading-card error"><h1>没有找到知识节点</h1><p>请从知识塔点击节点进入页面。</p><a class="chip" href="./index.html">返回知识塔</a></section>`;return;}
const manifest=await fetch("./content/manifest.json",{cache:"no-store"}).then(r=>r.ok?r.json():({pages:[]}));
const entry=(manifest.pages||[]).find(p=>[p.title,...(p.aliases||[])].some(x=>clean(x)===clean(node.title)));
let page=null;
if(entry){try{page=await fetch(entry.path,{cache:"no-store"}).then(r=>r.ok?r.json():null);}catch{page=null;}}
const loadCollection=async(manifestPath,key)=>{
 try{
  const data=await fetch(manifestPath,{cache:"no-store"}).then(r=>r.ok?r.json():({[key]:[]}));
  const entries=(data[key]||[]).filter(item=>clean(item.knowledgeNode)===clean(node.title));
  return (await Promise.all(entries.map(item=>fetch(item.path,{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null)))).filter(Boolean);
 }catch{return [];}
};
const [courses,experiences]=await Promise.all([
 loadCollection("./content/courses/manifest.json","courses"),
 loadCollection("./content/experiences/manifest.json","experiences")
]);
const DOMAIN={math:"纯数学",cs:"计算机科学",ai:"人工智能"};
const TYPE={course:"课程级知识",practice:"实践与规范",tool:"工具与环境",frontier:"研究前沿"};
const stage=Number(node.stage??0),cluster=clusterById.get(String(node.cluster));
const nextNodes=nodes.filter(n=>(n.prerequisites||[]).map(String).includes(String(node.id)));
const relationNodes=ids=>(ids||[]).map(id=>nodeById.get(String(id))).filter(Boolean);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const safeUrl=value=>{try{const url=new URL(value,location.href);return ["http:","https:"].includes(url.protocol)?url.href:null;}catch{return null;}};
const link=n=>`./knowledge.html?id=${encodeURIComponent(n.id)}&title=${encodeURIComponent(n.title)}`;
const chips=list=>list.length?`<div class="chips">${list.map(n=>`<a class="chip" href="${link(n)}">${esc(n.title)}</a>`).join("")}</div>`:`<span class="chip">暂无明确要求</span>`;
const list=items=>`<ul>${(items||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
const fallback={
 tier:"基础页",status:"draft",kind:node.type||"course",summary:node.summary||`${node.title}的知识节点基础页。`,why:"该页面目前直接使用知识图谱中的结构信息，完整课程内容将在后续内容生产流程中补充。",learningObjectives:[],coreTopics:node.topics||[],syllabus:[],resources:[],exercises:[],projects:[],completion:{basic:"理解该节点的核心概念与基本问题。",proficient:"能够独立使用该节点的主要方法解决典型问题。",researchReady:"能够继续进入图谱标注的后续课程或研究方向。"},sources:[]
};
const content={...fallback,...(page||{}),completion:{...fallback.completion,...(page?.completion||{})}};
document.title=`${node.title} · 知识节点`;
const resourceHtml=(content.resources||[]).length?(content.resources||[]).map(r=>`<div class="resource"><strong>${esc(r.title)}</strong><small>${esc([r.type,r.author,r.institution].filter(Boolean).join(" · "))}</small>${r.verification?`<div class="source-status">${esc(r.verification)}</div>`:""}</div>`).join(""):`<p>资源尚未整理。</p>`;
const syllabusHtml=(content.syllabus||[]).length?(content.syllabus||[]).map((s,i)=>`<div class="syllabus-item"><strong>${String(i+1).padStart(2,"0")} ${esc(s.title)}</strong><div class="chips">${(s.topics||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div></div>`).join(""):`<p>章节结构尚未整理。</p>`;
const sourceHtml=(content.sources||[]).length?(content.sources||[]).map(s=>`<div class="resource"><strong>${esc(s.title)}</strong><small>${esc([s.sourceType,s.institution].filter(Boolean).join(" · "))}</small><div class="source-status">${esc(s.verification||"待核验")}</div></div>`).join(""):`<p>来源尚未整理。</p>`;
const dimensionLabels={theoryDepth:"理论深度",practiceIntensity:"实践强度",mathRequirement:"数学要求",programmingIntensity:"编程强度",resourceCompleteness:"资源完整度"};
const courseHtml=courses.length?`<div class="course-cards">${courses.map(course=>{
 const hours=course.workload?.estimatedHours;
 const official=safeUrl(course.officialUrl);
 return `<article class="course-card"><div class="course-heading"><div><span class="object-label">课程实现 · ${esc(course.verification)}</span><h3>${esc(course.institution)} · ${esc(course.courseCode)}</h3><p>${esc(course.title)}</p></div><span class="badge">${esc(course.status)}</span></div><dl class="course-meta"><div><dt>年份</dt><dd>${esc(course.academicYear)}</dd></div><div><dt>语言</dt><dd>${esc(course.language)}</dd></div><div><dt>预计总投入</dt><dd>${hours?`${esc(hours.min)}–${esc(hours.max)} 小时`:"待核验"}</dd></div></dl><div class="dimensions">${Object.entries(dimensionLabels).map(([key,label])=>`<div><span>${label}</span><meter min="1" max="5" value="${esc(course.dimensions?.[key]||1)}">${esc(course.dimensions?.[key]||1)}/5</meter><b>${esc(course.dimensions?.[key]||1)}/5</b></div>`).join("")}</div>${course.features?.length?`<div class="chips">${course.features.map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div>`:""}${official?`<a class="official-link" href="${esc(official)}" target="_blank" rel="noopener noreferrer">官方课程链接</a>`:`<span class="muted">官方链接待核验</span>`}</article>`;
 }).join("")}</div>`:`<div class="empty-state"><strong>暂无经过整理的课程实现</strong><p>知识标准仍可独立学习；课程候选将在一手来源核验后加入。</p></div>`;
const experienceHtml=experiences.length?`<div class="experience-list">${experiences.map(item=>`<article class="experience-card"><div class="experience-title"><span class="subjective-label">社区经验 / 主观经验</span><span>${esc(item.sourceType)} · ${esc(item.verification)}</span></div>${item.workloadHours==null?"":`<p><b>时间投入：</b>${esc(item.workloadHours)} 小时</p>`}${item.hardestParts?.length?`<h3>常见难点</h3>${list(item.hardestParts)}`:""}${item.recommendedPreparation?.length?`<h3>建议前置</h3>${list(item.recommendedPreparation)}`:""}${item.mostValuableParts?.length?`<h3>最有价值部分</h3>${list(item.mostValuableParts)}`:""}${item.advice?.length?`<h3>学习建议</h3>${list(item.advice)}`:""}<small>来源：${esc(item.source?.title||"未注明")}</small></article>`).join("")}</div>`:`<div class="empty-state"><strong>暂无学习经验</strong><p>这里不会用未经标记的主观评价填充官方课程信息。</p></div>`;
root.innerHTML=`
<section class="hero">
  <div class="eyebrow"><span class="badge ${esc(node.domain)}">${esc(DOMAIN[node.domain]||"跨学科")}</span><span class="badge">第${stage}层</span><span class="badge">${esc(TYPE[content.kind]||TYPE[node.type]||"知识节点")}</span><span class="badge">${esc(content.tier)}</span></div>
  <h1>${esc(node.title)}</h1><p class="summary">${esc(content.summary)}</p>
  <div class="hero-grid"><div class="stat"><span>所属学科群</span><strong>${esc(cluster?.title||"未分类")}</strong></div><div class="stat"><span>页面状态</span><strong>${esc(content.status)}</strong></div><div class="stat"><span>必要前置</span><strong>${(node.prerequisites||[]).length} 个</strong></div><div class="stat"><span>直接后续</span><strong>${nextNodes.length} 个</strong></div></div>
</section>
${page?"":`<div class="notice"><strong>基础页：</strong>该节点已经拥有可访问页面，但目前只使用图谱元数据生成。后续将通过统一内容流水线升级为标准页或精品页。</div>`}
<div class="content-grid"><div class="column">
<section class="section"><h2>为什么学习</h2><p>${esc(content.why)}</p></section>
<section class="section"><h2>学习目标</h2>${content.learningObjectives.length?list(content.learningObjectives):"<p>学习目标尚未整理。</p>"}</section>
<section class="section"><h2>核心内容</h2>${content.coreTopics.length?`<div class="chips">${content.coreTopics.map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>`:"<p>核心内容尚未整理。</p>"}</section>
<section class="section"><h2>Canonical syllabus</h2><p class="section-note">该知识领域稳定的教学核心，不复制任何一所学校的 syllabus。</p>${syllabusHtml}</section>
${(content.exercises||[]).length?`<section class="section"><h2>练习类型</h2>${list(content.exercises.map(x=>`${x.type}：${x.description}`))}</section>`:""}
${(content.projects||[]).length?`<section class="section"><h2>项目</h2>${content.projects.map(p=>`<div class="syllabus-item"><strong>${esc(p.title)}</strong><p>${esc(p.description)}</p>${p.deliverable?`<small>交付物：${esc(p.deliverable)}</small>`:""}</div>`).join("")}</section>`:""}
</div><aside class="column">
<section class="section"><h2>必要前置</h2>${chips(relationNodes(node.prerequisites))}<h3>推荐关联</h3>${chips(relationNodes(node.recommended))}<h3>可继续进入</h3>${chips(nextNodes)}</section>
<section class="section"><h2>完成标准</h2><div class="completion"><div><b>基础完成</b><span>${esc(content.completion.basic)}</span></div><div><b>熟练掌握</b><span>${esc(content.completion.proficient)}</span></div><div><b>研究准备</b><span>${esc(content.completion.researchReady)}</span></div></div></section>
<section class="section"><h2>学习资源</h2>${resourceHtml}</section>
<section class="section"><h2>参考来源</h2>${sourceHtml}</section>
</aside></div>
<section class="section related-content"><h2>推荐课程实现</h2><p class="section-note">课程实现与知识节点分开记录；各维度描述取向，不汇总为总分或排名。</p>${courseHtml}</section>
<section class="section related-content"><h2>学习经验</h2><p class="section-note">以下内容是主观经验，不属于官方课程事实，也不会进入 canonical syllabus。</p>${experienceHtml}</section>`;
})().catch(err=>{console.error(err);const root=document.getElementById("knowledgePage");if(root)root.innerHTML=`<section class="loading-card error"><h1>知识页面加载失败</h1><p>${String(err.message||err)}</p></section>`;});
