import {runAnalysis,streets,categories} from './engine.mjs';
import {regionPage,wireRegion} from './regions.mjs';
import {atlas} from './map.mjs';
import {cases,roles,figures,caption,sourcesNote,dataTypes,strategies} from './content.mjs';
import {workspace,wireDesk,resetDesk} from './workspace.mjs';
const $=s=>document.querySelector(s);
const view=$('#view');
const btn=(text,hash,cls='blue')=>`<a class="btn ${cls}" href="#${hash}">${text}</a>`;
const card=(h,p,k='')=>`<article class="card"><div class="kicker">${k}</div><h3>${h}</h3><p>${p}</p></article>`;
const title=(k,h,p)=>`<div class="title"><div><div class="crumb"><a href="#home">门户首页</a>　/　${h}</div><div class="kicker">${k}</div><h1>${h}</h1><p>${p}</p></div></div>`;
const section=(k,h)=>`<div class="sectionhead"><div><div class="kicker">${k}</div><h2>${h}</h2></div></div>`;
const imageBtn=(id,alt)=>`<button class="imgbtn" data-fig="${id}" aria-label="放大${alt}"><img loading="lazy" class="thumb" src="media/fig${id}.jpg" alt="${alt}"></button>`;
const rolecards=()=>`<div class="grid three">${roles.map(([url,num,name,tag,desc,sym,color])=>`<a href="#${url}" class="card rolecard" style="--accent:${color}"><span class="badge">工作台 ${num}</span><span class="sym">${sym}</span><h3>${name}</h3><b>${tag}</b><p>${desc}</p><span class="more">进入体验 →</span></a>`).join('')}</div>`;
const bars=c=>c.bars.map(([label,v],i)=>`<div class="chart"><label>${label}<b>${v}%</b></label><div class="bar"><i class="${i===2?'green':''}" style="width:${v}%"></i></div></div>`).join('');
const page=(k,h,p,body)=>`<div class="wrap page">${title(k,h,p)}${body}</div>`;
let carousel=0,timer=null,paused=false;
function gallery(){
 const [id,h,p]=figures[carousel];
 return `<div class="gallery"><div><span class="kicker">图集　0${carousel+1} / 04</span><h3>${h}</h3><p class="bodycopy">${p}</p><div class="row"><button data-cycle="-1" aria-label="上一张">←</button><button data-carousel-pause>${paused?'播放':'暂停'}</button><button data-cycle="1" aria-label="下一张">→</button></div><small>来源：参赛 PPT · 概念图，可点击放大</small></div><figure>${imageBtn(id,h)}</figure></div>`;
}
function home(){
 const r=runAnalysis();
 const map=atlas(r,{dark:true,route:r.facilities.find(f=>f.cat==='买菜').route,markers:r.facilities.filter(f=>['医疗','买菜','体育','养老'].includes(f.cat)).map(f=>({id:f.id,label:f.name}))});
 return `<section class="hero"><div class="wrap herogrid"><div><div class="eyebrow">◉　天枢杯参赛项目　 /　 URBAN ACCESS ATLAS</div><h1>宜居星图<span>・智联生活圈</span></h1><div class="hero-sub">基于空天地一体化感知的<br>15 分钟宜居生活圈优化规划</div><p>让 15 分钟生活圈，从画在图上，走到身边</p><div class="actions">${btn('打开生活圈地图 ↗','resident','mint')}${btn('进入治理工作台','govern','ghost')}</div></div><div class="carto"><div class="cartohead"><b><i class="indicator"></i>回龙观 · 生活圈图层</b><span>步行 / 15 MIN</span></div>${map}<div class="cartofoot"><span>━━ 可达道路　┄ 推荐路线</span><span>示例路网 · 非实地导航</span></div></div></div></section><div class="highlights"><div class="wrap">${[['◎','自适应动态等时圈','从楼栋开始计时','tech'],['⇄','多模态可达分析','步行 · 骑行 · 公交','resident'],['◫','三类用户服务','居民 · 商户 · 治理者','experience'],['⌖','北京三街道实证','三类社区案例研判','cases']].map(([i,h,p,a])=>`<a href="#${a}"><span class="tileicon">${i}</span><div><b>${h}</b><small>${p}</small></div></a>`).join('')}</div></div><div class="wrap section">${section('01　/　WORKSPACES','选择你的工作台')}${rolecards()}<div class="panel introband"><div><span class="kicker">REGIONAL DATA STUDIO</span><h3>把分析带到另一个街道</h3><p>导入已有的高德、百度或自有点位，核对设施分布；配上路网和楼栋即可试算覆盖。</p></div><a class="btn blue" href="#regions">区域数据接入 →</a></div></div><section class="band"><div class="wrap section">${section('02　/　PROJECT ATLAS','方案图集')}<div id="gallery">${gallery()}</div></div></section><div class="wrap section">${section('03　/　FIELD STUDIES','北京三个典型街道')}<div class="grid three">${cases.map((c,i)=>`<a href="#cases/${i}" class="card"><span class="kicker">BEIJING　0${i+1}　/　${c.district}</span><h3>${c.name}街道</h3><p>${c.type} · ${c.theme}</p><span class="more">查看指标与方案 →</span></a>`).join('')}</div></div>`;
}
function project(){
 const issues=[['固定半径失真','大型社区的围墙和出入口会延长家到设施的实际路径。'],['仅步行评估','年轻人的骑行和老年人的公交接驳带来不同可达范围。'],['等待时间遗漏','过街红灯和公交发车间隔都会消耗出行预算。'],['设施隐性盲区','网点数量相同，容量和需求仍可能错配。'],['停车时空错配','夜间居民缺车位的同时，周边公共停车场仍有空位。']];
 return page('01　/　PROJECT','项目简介','一座卫生站离家不到一公里，为什么仍然走不到？',`<div class="grid two"><div class="panel"><span class="badge">政策与治理场景</span><h3>在存量社区里补足日常服务</h3><p>一刻钟便民生活圈关注买菜、修补和助餐。完整社区建设关注基本服务配套。结合城市更新与网格化治理，可以把居民日常诉求落实到楼栋、道路和设施。</p></div><div class="panel"><span class="badge">研究问题</span><h3>家门口的 15 分钟够做什么？</h3><p>从住宅单元门开始计时，经过内部道路、社区出口和街道交叉口，再核对周边设施是否有容量服务居民。</p></div></div><div class="section">${section('DIAGNOSIS','传统规划的五个盲点')}<div class="grid three">${issues.map(([h,p],i)=>card(h,p,'0'+(i+1))).join('')}</div></div>${section('BEIJING','三类社区的不同约束')}<div class="grid three">${cases.map((c,i)=>`<a href="#cases/${i}" class="card"><span class="badge">${c.type}</span><h3>${c.name}</h3><p>${c.problem}</p><b class="more">查看案例 →</b></a>`).join('')}</div>`);
}
function tech(){
 return page('02　/　METHODOLOGY','技术体系','沿楼栋、道路、设施三类空间对象，计算可达范围、服务供需与公平性。',`<div class="grid three">${[['天基定位','北斗定位用于校核空间位置，数据统一到 CGCS2000 坐标基准。'],['空基测绘','遥感影像和倾斜摄影帮助识别建筑、绿地、道路阻隔与立体通道。'],['地基感知','踏勘核对出入口、无障碍通行与营业状态，物联网可补充人流与车位。']].map(([h,p],i)=>card(h,p,'SENSOR / 0'+(i+1))).join('')}</div><div class="section">${section('DATA　/　08','八类数据如何进入模型')}<div class="grid four">${dataTypes.map(([h,p],i)=>card(h,p,'LAYER / 0'+(i+1))).join('')}</div><p class="info">预处理顺序　统一坐标 → 检查路网拓扑 → 匹配设施与人口网格 → 去重、校验时效并现场抽核。</p></div><div class="grid two"><div class="panel">${imageBtn(2,'动态等时圈原理图')}<h3>动态等时圈</h3><p>固定半径默认内部通行为零。动态模型扣除楼栋到出口的时间，按道路长度和不同人群速度计时，再加入过街等待。公交路径另计步行至站、候车、乘车和末端步行。</p>${btn('调整参数，查看路线','resident')}</div><div class="panel">${imageBtn(3,'总体架构图')}<h3>四层系统设计</h3><p>感知层汇集八类数据。计算层以 PostGIS 管理空间对象，方案设计可选 ArcGIS Network Analyst 与开源 pgRouting 双引擎。服务层向三类角色分发分析结果，展示层连接 PC 与 H5。</p><p class="fine">三维适老化方案可加入台阶、天桥和电梯阻抗。公开体验使用平面示例路网、步速和等待参数。</p></div></div><div class="section">${section('INDICES','三个指标，三个判断')}<div class="grid three">${card('人口覆盖率','15 分钟内能到达目标设施的居民数 ÷ 总居民数。反映有多少人被服务。')}${card('两步移动搜索法 · 2SFCA','先把设施容量除以可达人口，再为每栋楼汇总可达设施的供需比。体验版采用 15 分钟二元权重。')}${card('人口加权基尼系数','按楼栋人口加权比较服务得分差异。越接近 0 越均衡；当所有得分为零时没有可比较的基尼值。')}</div></div>${btn('下载项目技术方案 PDF','docs')}`);
}
function casePage(i){
 const c=cases[i];
 return page('03　/　FIELD STUDIES','案例实证','按街道查看材料中的基线、短板与优化预期。',`<div class="switch">${cases.map((v,j)=>btn(v.name+'街道','cases/'+j,j===i?'active':'')).join('')}</div><div class="section grid two"><div class="panel"><span class="kicker">${c.district}　/　${c.type}</span><h2>${c.theme}</h2><p>${c.problem}</p><div class="compare">${c.facts.map(([v,h])=>`<div class="stat"><strong>${v}</strong><small>${h}</small></div>`).join('')}</div><h3>优先行动</h3><p>${c.action}</p></div><div class="panel"><span class="kicker">INDICATORS</span><h3>现状与方案对照</h3>${bars(c)}<p>${c.effect}</p><p class="fine">来源：参赛 PPT 第 12–14 页。仅回龙观提供了同口径的固定半径与动态覆盖率对照。</p></div></div><p class="info">${sourcesNote}</p>${btn('用该街道的示例模型试算 ↗','govern/'+i)}`);
}
function plan(){
 return page('04　/　PLANNING','方案成果','从材料中的规划预期，走到可以比较的干预情景。',`<div class="grid three">${cases.map((c,i)=>`<article class="card"><span class="badge">${c.name} · 模拟预期</span><h3>${['医疗覆盖率','西部 / 东部养老可达性','夜间车位缺口'][i]}</h3><b class="metric">${['71.5% → 89%','44% → 约 85%','40% → 15% 以内'][i]}</b><p>${c.action}</p></article>`).join('')}</div><div class="section grid two"><div class="panel">${section('INTERVENTIONS','五类优化措施')}${strategies.map(([h,p])=>`<div class="item"><b>${h}</b><p class="bodycopy">${p}</p></div>`).join('')}</div><div class="panel"><h3>优化效果模拟界面</h3>${imageBtn(9,'方案模拟概念界面')}<p class="fine">${caption} 图中示意数字以案例正文口径为准。</p>${btn('打开治理端情景模拟','govern')}</div></div>${section('ROADMAP','分期实施与成效验证')}<div class="grid three">${card('0–12 个月','完成三街道数据整理、路网建模和试点运行。','第一阶段')}${card('12–24 个月','推进卫生分站、助餐点、便民市集与错峰共享，前后对照。','第二阶段')}${card('24–36 个月','复核服务提升与公平性，校准参数并推广到其他街道。','第三阶段')}</div><h3>运营保障</h3><p class="info">街道台账、市场接口和公众反馈组成混合数据生态；先选择试点再扩大覆盖。SaaS 接入采用分级授权和人口聚合。四级迭代依次校验数据鲜活度、校准模型、回收使用反馈、灰度验证效果。</p>${section('VALUE','预期价值')}<div class="grid three">${[['民生','缩短居民买菜、助餐与就医的步行时间。'],['治理','将网格化治理延伸到设施布局研判。'],['经济','按缺口业态改善社区商业配置。'],['政策','支持完整社区和一刻钟便民生活圈评估。'],['技术','将遥感判读、网络分析和人口统计纳入同一计算流程。']].map(([h,p])=>card(h+'价值',p)).join('')}</div>`);
}
function experience(){
 return page('05　/　APPLICATIONS','在线体验','选择角色，使用北京三类社区的示例数据开展分析。',rolecards()+`<div class="section">${section('INTERFACES','三端产品概念界面')}<div class="grid three">${roles.map(([url,num,h,tag,desc,sym,color,img])=>`<div class="panel shot">${imageBtn(img,h+'概念图')}<div><h3>${h}</h3><p>${desc}</p><a class="link" href="#${url}">打开工作台 →</a></div></div>`).join('')}</div><p class="fine">${caption}</p></div>${btn('申请街道单位试用','trial')}`);
}
function docs(){return page('06　/　LIBRARY','文档下载','下载参赛汇报和完整技术方案，可用于离线答辩。',`<div class="grid three">${[['briefing.pdf','PPT 汇报 PDF','18 页成果汇报，含数据融合、等时圈原理、三端界面与优化结果。'],['plan.pdf','项目技术白皮书 PDF','《基于时空大数据的 15 分钟宜居生活圈优化规划与应用方案》原始 PDF。'],['plan.docx','方案可编辑文档','与方案 PDF 配套的 Word 文档，用于研讨与汇报准备。'],['analysis-service.zip','分析服务接入包','Node.js 分析接口、同版计算引擎和部署说明，可接入单位已有 SaaS 网关。']].map(([file,h,p])=>`<article class="card"><span class="kicker">DOCUMENT　/　${file.split('.')[1].toUpperCase()}</span><h3>${h}</h3><p>${p}</p><a class="btn blue" download href="downloads/${file}">下载文件 ↓</a></article>`).join('')}</div>`)}
function about(){return page('07　/　ABOUT','关于我们','宜居星图・智联生活圈参赛项目',`<div class="grid two">${card('天枢杯 · 赛题一','围绕基于时空大数据的 15 分钟宜居生活圈优化规划与应用，展示数据融合、智能分析、方案落地、价值与技术融合。','COMPETITION')}<div class="panel"><h3>街道与社区对接</h3><p>可填写试用需求，导出供项目双方沟通的申请材料。</p><div class="row">${btn('申请治理端试用','trial')}${btn('填写联系表','contact','')}</div></div></div><p class="info">${sourcesNote}</p>`)}
function formPage(trial){
 const h=trial?'街道单位试用申请':'联系咨询';
 return page('SERVICE　/　REQUEST',h,'填写后导出对接单，供线下交接。当前未配置线上接收地址。',`<form id="requestForm" class="panel" style="max-width:760px"><h3>${h}单</h3><div class="formgrid"><label class="field">单位或街道名称<input required name="单位" maxlength="80"></label><label class="field">所在区县<input required name="区县" maxlength="60"></label><label class="field">联系人<input required name="联系人" maxlength="50"></label><label class="field">联系邮箱<input required type="email" name="邮箱" maxlength="120"></label><label class="field full">关注方向<select name="方向"><option>设施覆盖与盲区评估</option><option>养老助餐与公交接驳</option><option>便民商业与选址</option><option>停车资源共享</option><option>其他合作咨询</option></select></label><label class="field full">具体需求<textarea required name="需求" rows="4" maxlength="1500"></textarea></label></div><button type="submit" class="btn blue">导出${trial?'试用申请':'咨询'}单 ↓</button><p id="formmsg" class="formmsg" role="status"></p></form>`);
}
function downloadText(text,file){const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function render(){
 clearInterval(timer);resetDesk();const [path='home',param]=location.hash.slice(1).split('/');const route=path||'home';
 const i=['0','1','2'].includes(param)?Number(param):0;
 const pages={regions:regionPage,home,project,tech,cases:()=>casePage(i),plan,experience,docs,about,trial:()=>formPage(true),contact:()=>formPage(false)};
 const desk=roles.some(r=>r[0]===route);
 view.innerHTML=desk?workspace(route,i,param==='region'):((pages[route]||home)());
 document.title=(desk?roles.find(r=>r[0]===route)[2]:(view.querySelector('h1')?.textContent||'业务门户'))+' | 宜居星图';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+route));
 $('nav').classList.remove('open');$('#menu').setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:'instant'});
 if(desk)wireDesk();
 if(route==='regions')wireRegion();
 if(route==='home')timer=setInterval(()=>{const g=$('#gallery');if(g&&!paused&&!document.hidden&&!g.matches(':hover')&&!g.contains(document.activeElement)&&!$('#dialog').open&&!matchMedia('(prefers-reduced-motion:reduce)').matches){carousel=(carousel+1)%4;g.innerHTML=gallery()}},7000);
 const f=$('#requestForm');if(f)f.onsubmit=e=>{e.preventDefault();const h=route==='trial'?'试用申请':'联系咨询';downloadText('宜居星图 · '+h+'\n'+Array.from(new FormData(f)).map(([k,v])=>k+'：'+v).join('\n'),'宜居星图-'+h+'.txt');$('#formmsg').textContent='对接单已生成，可自行交付给项目联系人。'};
}
view.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.fig){const i=Number(b.dataset.fig);$('#dialogBody').innerHTML=`<img src="media/fig${i}.jpg" alt="项目图 ${i}"><p class="fine">${i>=4?caption:'来源：参赛 PPT 概念图'}</p>`;$('#dialog').showModal()}
 if(b.dataset.cycle){carousel=(carousel+Number(b.dataset.cycle)+4)%4;$('#gallery').innerHTML=gallery()}
 if(b.hasAttribute('data-carousel-pause')){paused=!paused;$('#gallery').innerHTML=gallery()}
});
$('#menu').onclick=()=>$('#menu').setAttribute('aria-expanded',String($('nav').classList.toggle('open')));
$('#dialog .close').onclick=()=>$('#dialog').close();window.addEventListener('hashchange',render);render();

