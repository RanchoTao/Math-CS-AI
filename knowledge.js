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
const DOMAIN={math:"纯数学",cs:"计算机科学",ai:"人工智能"};
const TYPE={course:"课程级知识",practice:"实践与规范",tool:"工具与环境",frontier:"研究前沿"};
const stage=Number(node.stage??0),cluster=clusterById.get(String(node.cluster));
const nextNodes=nodes.filter(n=>(n.prerequisites||[]).map(String).includes(String(node.id)));
const relationNodes=ids=>(ids||[]).map(id=>nodeById.get(String(id))).filter(Boolean);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
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
<section class="section"><h2>课程结构</h2>${syllabusHtml}</section>
${(content.exercises||[]).length?`<section class="section"><h2>练习类型</h2>${list(content.exercises.map(x=>`${x.type}：${x.description}`))}</section>`:""}
${(content.projects||[]).length?`<section class="section"><h2>项目</h2>${content.projects.map(p=>`<div class="syllabus-item"><strong>${esc(p.title)}</strong><p>${esc(p.description)}</p>${p.deliverable?`<small>交付物：${esc(p.deliverable)}</small>`:""}</div>`).join("")}</section>`:""}
</div><aside class="column">
<section class="section"><h2>必要前置</h2>${chips(relationNodes(node.prerequisites))}<h3>推荐关联</h3>${chips(relationNodes(node.recommended))}<h3>可继续进入</h3>${chips(nextNodes)}</section>
<section class="section"><h2>完成标准</h2><div class="completion"><div><b>基础完成</b><span>${esc(content.completion.basic)}</span></div><div><b>熟练掌握</b><span>${esc(content.completion.proficient)}</span></div><div><b>研究准备</b><span>${esc(content.completion.researchReady)}</span></div></div></section>
<section class="section"><h2>学习资源</h2>${resourceHtml}</section>
<section class="section"><h2>参考来源</h2>${sourceHtml}</section>
</aside></div>`;
})().catch(err=>{console.error(err);const root=document.getElementById("knowledgePage");if(root)root.innerHTML=`<section class="loading-card error"><h1>知识页面加载失败</h1><p>${String(err.message||err)}</p></section>`;});