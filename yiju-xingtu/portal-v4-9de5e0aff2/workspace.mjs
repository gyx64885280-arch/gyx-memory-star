import {runAnalysis,streets,categories,assess,paths} from './engine.mjs';
import {atlas} from './map.mjs';
import {roles,caption} from './content.mjs';
import {regionModel} from './regions.mjs';
import {buildTrip,errands,tripCard,sortCandidates,shopCard,shopBudget,govCard} from './decisions.mjs';
import {serviceBase} from './config.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opts=(a,v)=>a.map(([k,t])=>`<option value="${esc(k)}" ${String(k)===String(v)?'selected':''}>${esc(t)}</option>`).join('');
const sel=(key,label,arr,value)=>`<label class="field">${label}<select data-param="${key}">${opts(arr,value)}</select></label>`;
const stat=(v,l)=>`<div class="stat"><strong>${v}</strong><small>${l}</small></div>`;
const table=(heads,rows)=>`<div class="tablewrap"><table><thead><tr>${heads.map(x=>'<th>'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`;
const tags=['综合','医疗','养老','买菜','教育','体育','商超','停车','微服务'];
const round=t=>Number(t).toFixed(1);
function save(file,data,type='text/plain;charset=utf-8'){const u=URL.createObjectURL(new Blob(['\ufeff',data],{type})),a=document.createElement('a');a.href=u;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(u),4000)}
let s={},r=null,seq=0,custom=null,selected=null,filter='综合',showPlan=true,query='',currentSource='';
let intent='随便逛逛',peak=false,shopGoal='供给缺口',budget=[6000,10,20],activeRegion='';
function favoriteIds(){
 try{const saved=JSON.parse(localStorage.getItem('yiju-favourites-'+s.area)||'[]');return Array.isArray(saved)?saved.filter(Number.isInteger):[]}catch{return []}
}
export function resetDesk(){seq++}
export function workspace(role,area,useRegion=false){
 s={area,role,home:0,mode:'walk',senior:false,wait:4,trade:'生鲜菜店',cat:['医疗','养老','停车'][area]};query='';filter='综合';selected=null;custom=null;showPlan=true;
 intent='随便逛逛';peak=false;shopGoal='供给缺口';budget=[6000,10,20];activeRegion='';
 if(role==='govern'&&useRegion&&regionModel()){custom=regionModel();s.cat=custom.add.cat;activeRegion=custom.region}
 const item=roles.find(x=>x[0]===role);
 return `<div class="wrap page"><div class="title"><div><div class="crumb"><a href="#home">门户首页</a>　/　<a href="#experience">在线体验</a>　/　${item[2]}</div><div class="kicker">LIVE WORKSPACE　/　0${roles.indexOf(item)+1}</div><h1>${item[2]}</h1><p>${item[4]}</p></div>${role==='govern'?'<a class="btn blue" href="#trial">申请单位试用 ↗</a>':''}</div><div class="switch">${roles.map(x=>`<a href="#${x[0]}/${area}" class="${x[0]===role?'active':''}">${x[5]}　${x[2]}</a>`).join('')}<a href="#experience">产品总览</a></div><div class="desk ${role==='resident'?'residentDesk':''}"><aside class="panel controls" id="controls"></aside><section id="output" class="stack" aria-label="分析结果"></section></div><div class="panel"><details><summary>查看${item[2]}概念图与功能说明</summary><div class="grid ${role==='resident'?'three':'two'}">${(role==='resident'?[[4,'多模式等时圈'],[5,'出行助手'],[6,'便民资源']]:[[item[7],item[2]]]).map(([id,name])=>`<figure><button class="imgbtn" data-fig="${id}"><img class="thumb" src="media/fig${id}.jpg" alt="${name}概念图"></button><figcaption>${name} · ${caption}</figcaption></figure>`).join('')}</div></details></div></div>`;
}
function controls(){
 const resident=s.role==='resident',gov=s.role==='govern';
 const homes=(custom||r.net).homes;
 return `${resident?'<button class="phonePrefs" data-prefs aria-expanded="false">出发设置 · 楼栋与出行方式 <span>⌄</span></button>':''}<h3>分析条件</h3>${sel('area',resident?'我所在的街道':'研究街道',[...(custom?[['custom',activeRegion||'自定义片区']]:[]),...streets.map((t,i)=>[i,t])],custom?'custom':s.area)}${resident?sel('home','出发楼栋',homes.map((h,i)=>[i,h.name]),s.home):''}
 ${!gov?sel('mode','出行方式',[['walk','步行'],['bike','骑行'],['bus','公交接驳（含步行）']],s.mode):''}
 ${(resident&&s.mode!=='bike')||gov?sel('senior','人群步速',[['false','普通 · 1.2 米/秒'],['true','适老 · 0.7 米/秒']],String(s.senior)):''}
 ${resident&&s.mode==='bus'?sel('wait','示例平均候车时间',[[4,'高峰 · 4 分钟'],[7.5,'平峰 · 7.5 分钟']],s.wait):''}
 ${resident?sel('peak','示例通行情景',[['false','平时 · 信号等候较短'],['true','高峰 · 部分路口缓行']],String(peak)):''}
 ${s.role==='merchant'?sel('goal','我更看重',['供给缺口','客群规模','竞争较少'].map(v=>[v,v]),shopGoal):''}
 ${s.role==='merchant'?sel('trade','目标业态',['生鲜菜店','便利店','便民餐饮','社区维修'].map(v=>[v,v]),s.trade):''}
 ${gov?sel('cat','评估设施类型',categories.map(v=>[v,v]),s.cat):''}
 <div class="info modelNote"><b>计算口径</b><p>${gov?'按楼栋人口加权，比较设施增补与过街改善。':resident?'从楼栋出发计时，沿道路求最短时间；公交会比较接驳与全程步行。':'结合 15 分钟可达居民、需求频次与现有日供给量排序。'}</p><small>${esc(currentSource)}</small></div>
 ${gov?'<div class="actions"><button data-action="template">下载路网模板</button><label class="btn">导入路网 JSON<input type="file" accept=".json,application/json" id="netfile" style="width:1px;opacity:0"></label></div><small class="full" id="importmsg" role="status"></small>':''}`;
}
function mapbox(map,title,legend){
 return `<div class="mapstage"><div class="cartohead"><b><i class="indicator"></i>${esc(custom?(activeRegion||'自定义片区'):streets[s.area])}　/　${title}</b><span>${custom?'导入模型':'示例路网'}</span></div>${map}<div class="cartofoot">${legend}</div></div>`;
}
function resident(){
 const trip=buildTrip(r,s,peak);
 const favorites=favoriteIds();
 const pool=trip.facilities.filter(v=>intent==='我的常去'?favorites.includes(v.id):(!errands[intent]||errands[intent].includes(v.cat)));
 const list=pool.filter(f=>(filter==='综合'||filter===f.cat)&&(!query||f.name.includes(query)||f.cat.includes(query)));
 let f=list.find(v=>v.id===selected)||list[0];selected=f?.id;
 const visible=trip.facilities.filter(v=>v.t<=15).length;
 const map=atlas({...r,times:trip.times},{delays:trip.delays,picked:selected,route:f?.route||[],markers:list.map(v=>({id:v.id,label:v.name}))});
 return `${tripCard(r,s,f,list[0],visible,intent,favorites.includes(f?.id),peak)}${mapbox(map,'居民生活圈','<span>青色：可达道路　橙虚线：选定路线　红色：高峰模拟缓行</span><span>线路示意</span>')}<div class="panel"><h3>便民设施查询</h3><label class="field">搜索设施或类别<input id="search" type="search" value="${esc(query)}" placeholder="例如：社区卫生站"></label><div class="chips">${tags.map(t=>`<button data-filter="${t}" class="${filter===t?'active':''}">${t}</button>`).join('')}</div><div class="rows" style="margin-top:12px">${list.length?list.map(v=>`<button data-poi="${v.id}" class="resbtn ${v.id===selected?'sel':''}"><span>${esc(v.name)}　·　${esc(v.cat)}</span><span>${round(v.t)} 分钟　${v.t<=15?'圈内':'超时'}</span></button>`).join(''):'未找到符合条件的设施。'}</div>${f?`<p class="info"><b>出行助手　${esc(f.name)}</b><br>由${esc(r.home.name)}出发，途经 ${f.route.length-1} 段示例连接，预计 ${round(f.t)} 分钟。${s.mode==='bus'?'公交路径计入所选候车时间；结果取最快路径。':''}${f.cat==='停车'?' 此处显示到停车场的步行或接驳路线，余位未接入。':''}</p>`:''}</div><div class="panel"><h3>出行助手 · 示例时刻与停车</h3><div class="compare"><div class="stat"><small>平峰 / 高峰 · 候车假设</small><strong>7.5 / 4 分</strong><small>按发车间隔一半估算；切换到公交接驳可调整。</small></div><div class="stat"><small>公共停车场 · 从选定楼栋出发</small><strong>${round(trip.facilities.find(v=>v.cat==='停车').t)} 分</strong><button data-parking>查看到场路线 →</button></div></div></div><details><summary>随手拍 · 生成问题记录</summary><div><form id="feedback"><label class="field">位置与问题描述<textarea name="issue" required maxlength="600" placeholder="例如：西门过街处缺少无障碍坡道"></textarea></label><label class="field">现场照片（可选）<input name="photo" type="file" accept="image/*"></label><button>导出本地记录 ↓</button><p class="fine">照片留在设备上，可选一张不超过 3 MB 的图片，随描述一起导出为 JSON 记录，供线下交接。</p><span id="feedmsg" role="status"></span></form></div></details>`;
}
function merchant(){
 const items=sortCandidates(r.ranking,shopGoal),best=items[0],m=items.find(v=>v.id===selected)||best;selected=m.id;
 return `${shopCard(m,best,shopGoal)}<div class="kpis">${stat(esc(best.name),'优先核查候选点')}${stat(m.pop+' 人','所选点可达客群')}${stat(m.ratio===null?'—':m.ratio.toFixed(2),'所选点供需比')}</div>${mapbox(atlas(r,{mode:'heat',picked:m.id,markers:items.map(v=>({id:v.id,label:v.name})),values:items.map(v=>({id:v.id,c:v.ratio===null?'#89939b':v.ratio>1.5?'#e67662':v.ratio<.6?'#459acb':'#45ad84',r:34}))}),'业态供需分布','蓝：缺口 ＜0.6　　绿：平衡 0.6–1.5　　红：饱和 ＞1.5')}<div class="panel"><h3>候选点比较 · ${esc(s.trade)}</h3><p class="bodycopy">当前候选点按「${esc(shopGoal)}」排序。可达客群来自楼栋人口；预计日需求为可达人口乘以业态示例频次，表示潜在客流。</p>${table(['候选点','15 分钟客群','预计需求 / 日','供给 / 日','供需比'],items.map(v=>[`<button data-poi="${v.id}" class="${m.id===v.id?'onbtn':''}">${esc(v.name)}</button>`,v.pop,v.demand,v.supply,v.ratio?.toFixed(2)??'—']))}<p class="info">所选点 ${esc(m.name)} · ${m.gap>0?'按当前假设尚有约 '+m.gap+' 人次/日供给缺口。':'当前供给可覆盖估计需求。'} 正式选址还需实查租金、客流、竞品与可租面积。</p><section class="budgetbox"><h3>这家店每天要做多少单？</h3><p>为选中的${esc(m.name)}调整经营假设。</p><div class="budgetinputs">${[['月租金（元）',1,10000000],['单笔贡献（元）',0.1,100000],['承接缺口比例（%）',0,100]].map(([title,min,max],i)=>`<label class="field">${title}<input data-budget="${i}" type="number" min="${min}" max="${max}" step="any" value="${budget[i]}"></label>`).join('')}</div><div id="budgetResult" role="status">${shopBudget(m,budget)}</div></section><button class="btn blue" data-action="report">导出选址报告 ↓</button></div>`;
}
function governance(){
 const a=r.base,b=r.plan,current=showPlan?b:a;
 const marks=current.scores.map(h=>({id:h.id,label:h.name,color:h.t>15?'#cf7059':'#198c78'}));
 const add=r.net.add,hasAdd=s.cat===add.cat;
 if(showPlan&&hasAdd)marks.push({id:add.id,label:add.name,color:'#236eb1'});
 const map=atlas(r,{mode:'heat',markers:marks,values:current.scores.map(h=>({id:h.id,c:h.t>15?'#e27161':'#3aa98c',r:24+Math.min(24,h.pop/60)}))});
 return `<div class="kpis">${stat(round(current.rate)+'%','15 分钟覆盖率')}${stat(current.mean.toFixed(3),'人均容量 · 2SFCA')}${stat(current.gini?.toFixed(3)??'—','人口加权基尼系数')}</div>${govCard(r,s,showPlan)}<div class="tabs"><button data-scenario="0" class="${showPlan?'':'active'}">现状评估</button><button data-scenario="1" class="${showPlan?'active':''}">优化情景</button></div>${mapbox(map,'楼栋服务盲区','绿：圈内楼栋　红：超出 15 分钟　蓝：拟增设施')}<div class="panel"><h3>方案模拟 · ${esc(s.cat)}</h3><p class="bodycopy">${hasAdd?'新增「'+esc(add.name)+'」，容量 '+add.cap+' 人次/期。':'所选类别暂无新增点。'} 有信号路段平均等待由 45 秒缩短至 21 秒。楼栋人口与步速在前后对照中保持一致。</p>${table(['指标','现状','优化方案'],[['覆盖人口',a.covered+' / '+a.pop,b.covered+' / '+b.pop],['覆盖率',round(a.rate)+'%',round(b.rate)+'%'],['可达性',a.mean.toFixed(3),b.mean.toFixed(3)],['基尼系数',a.gini?.toFixed(3)??'—',b.gini?.toFixed(3)??'—']])}<p class="info">方案比现状新增覆盖 <b>${b.covered-a.covered} 人</b>，覆盖率变化 <b>${round(b.rate-a.rate)} 个百分点</b>。</p><h3>楼栋预警清单</h3>${table(['住宅楼栋','人口','最近设施','判断'],current.scores.map(h=>[esc(h.name),h.pop,Number.isFinite(h.t)?round(h.t)+' 分钟':'无可用设施',h.t<=15?'可达':'服务盲区']))}<div class="row"><button class="btn blue" data-action="report">导出治理报告 ↓</button><a class="btn" href="#trial">申请单位试用 ↗</a></div></div>`;
}
function output(){
 $('#output').innerHTML=s.role==='resident'?resident():s.role==='merchant'?merchant():governance();
}
function report(){
 const text=$('#output').innerText+(s.role==='merchant'?'\n经营假设：月租金 '+budget[0]+' 元，单笔贡献 '+budget[1]+' 元，承接缺口 '+budget[2]+'%。排序依据：'+shopGoal:'');
 save('宜居星图-'+s.role+'-分析报告.txt','宜居星图 · 分析报告\n数据：'+currentSource+'\n街道：'+(custom?(activeRegion||'导入片区'):streets[s.area])+'\n参数：'+JSON.stringify(s)+'\n\n'+text+'\n\n生成时间：'+new Date().toLocaleString('zh-CN'));
}
function containerPrefs(){return document.querySelector('[data-prefs]')}
async function compute(){
 const ticket=++seq;
 try{
 let next;
 if(custom){
   const home=custom.homes[0],pr=paths(custom,home);next={net:custom,home,times:pr.time,base:assess(custom,s.cat,false,15,s.senior),plan:assess(custom,s.cat,true,15,s.senior)};currentSource=(activeRegion||'用户导入')+' · 本机计算';
 }else if(serviceBase){
   const resp=await fetch(serviceBase.replace(/\/$/,'')+'/v1/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s),signal:AbortSignal.timeout(12000)});
   if(!resp.ok)throw Error('分析服务返回 '+resp.status);
   next=await resp.json();currentSource='SaaS 接口计算 · 示例模型';
 }else {next=runAnalysis(s);currentSource='合成路网 · 浏览器本地计算'}
 if(ticket!==seq||!$('#output'))return;
 r=next;$('#controls').innerHTML=controls();const prefs=containerPrefs();if(prefs)prefs.setAttribute('aria-expanded',String($('#controls').classList.contains('expanded')));output();
 }catch(err){if(ticket===seq&&$('#output'))$('#output').innerHTML='<p class="info">分析未完成。'+esc(err.message)+'</p><button data-action="retry">重试</button>'}
}
function validateNetwork(net){
 const fail=()=>{throw Error('文件需符合下载模板的节点、道路、楼栋和设施结构。')};
 if(!net||!Array.isArray(net.nodes)||net.nodes.length<2||net.nodes.length>300)fail();
 const ref=x=>Number.isInteger(x)&&x>=0&&x<net.nodes.length;
 const num=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
 const name=v=>typeof v==='string'&&v.trim().length>0&&v.length<=50;
 if(!net.nodes.every((p,i)=>p&&p.id===i&&num(p.x,0,640)&&num(p.y,0,410)))fail();
 if(!Array.isArray(net.edges)||net.edges.length>1500||!net.edges.every(e=>e&&ref(e.a)&&ref(e.b)&&num(e.m,1,50000)&&typeof e.signal==='boolean'))fail();
 if(!Array.isArray(net.homes)||!net.homes.length||net.homes.length>120||!net.homes.every(h=>h&&ref(h.id)&&num(h.pop,1,1e7)&&Number.isInteger(h.pop)&&name(h.name)&&num(h.inside,0,60)))fail();
 const ok=f=>f&&ref(f.id)&&categories.includes(f.cat)&&name(f.name)&&num(f.cap,0,1e7);
 if(!Array.isArray(net.facilities)||net.facilities.length>500||!net.facilities.every(ok)||!ok(net.add))fail();
 return net;
}
export function wireDesk(){
 const container=$('.desk');
 container.onchange=async e=>{const k=e.target.dataset.param;
 if(k==='peak'){peak=e.target.value==='true';selected=null;output();return}
 if(k==='goal'){shopGoal=e.target.value;selected=null;output();return}
 if(k){s[k]=['area','home','wait'].includes(k)?Number(e.target.value):k==='senior'?e.target.value==='true':e.target.value;
 if(k==='area'){custom=null;activeRegion='';s.cat=['医疗','养老','停车'][s.area];s.home=0}
 if(k==='mode'&&s.mode==='bike')s.senior=false;
 selected=null;await compute();return}
 if(e.target.id==='netfile'){try{const f=e.target.files[0];if(!f)return;if(f.size>2e6)throw Error('文件须小于 2 MB');custom=validateNetwork(JSON.parse((await f.text()).replace(/^\uFEFF/,'')));activeRegion='自定义片区';s.cat=custom.add.cat;await compute();$('#importmsg').textContent='已导入 '+custom.nodes.length+' 个节点。'}catch(err){$('#importmsg').textContent='导入失败：'+err.message}}
 };
 container.onclick=e=>{const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-prefs')){const open=$('#controls').classList.toggle('expanded');b.setAttribute('aria-expanded',String(open));return}
 if(b.dataset.errand){intent=b.dataset.errand;filter='综合';selected=null;query='';output();return}
 if(b.hasAttribute('data-favorite')&&selected!=null){const ids=new Set(favoriteIds());if(ids.has(selected))ids.delete(selected);else ids.add(selected);try{localStorage.setItem('yiju-favourites-'+s.area,JSON.stringify([...ids]));output()}catch{b.textContent='浏览器暂不能保存收藏'}return}
 if(b.dataset.filter){intent='随便逛逛';filter=b.dataset.filter;selected=null;output()}
 if(b.dataset.poi!==undefined){selected=Number(b.dataset.poi);output()}
 if(b.dataset.scenario!==undefined){showPlan=b.dataset.scenario==='1';output()}
 if(b.dataset.action==='template')save('路网模板.json',JSON.stringify(runAnalysis({area:s.area}).net,null,2),'application/json');
 if(b.dataset.action==='report')report();
 if(b.hasAttribute('data-parking')){intent='随便逛逛';query='';filter='停车';selected=null;output();document.querySelector('.mapstage').scrollIntoView({block:'center'})}
 if(b.dataset.action==='retry')compute();
 };
 container.oninput=e=>{
 if(e.target.hasAttribute('data-budget')){
   const inputs=[...container.querySelectorAll('[data-budget]')];
   const valid=inputs.every(i=>i.value!==''&&i.validity.valid);
   const exportButton=container.querySelector('[data-action="report"]');exportButton.disabled=!valid;
   if(!valid){$('#budgetResult').textContent='请为三个参数填写范围内的数值。';return}
   budget=inputs.map(i=>i.valueAsNumber);
   $('#budgetResult').innerHTML=shopBudget(r.ranking.find(v=>v.id===selected),budget);return
 }
 if(e.target.id==='search'){if(e.isComposing)return;query=e.target.value;output();const field=$('#search');field.focus();field.setSelectionRange(query.length,query.length)}};
 container.onsubmit=async e=>{
   if(e.target.id!=='feedback')return;
   e.preventDefault();
   const fd=new FormData(e.target),photo=fd.get('photo'),msg=$('#feedmsg');
   const record={street:streets[s.area],home:r.home.name,issue:String(fd.get('issue')).trim(),createdAt:new Date().toISOString()};
   if(!record.issue){msg.textContent='请输入问题描述。';return}
   try{
     if(photo?.size){
       if(photo.size>3*1024*1024||!photo.type.startsWith('image/'))throw Error('请选择 3 MB 以内的图片。');
       const image=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(Error('图片读取失败'));fr.readAsDataURL(photo)});
       record.photo={name:photo.name,data:image};
     }
     save('社区问题记录.json',JSON.stringify(record,null,2),'application/json');msg.textContent=' 已生成本地问题记录。';
   }catch(err){msg.textContent=err.message}
 };
 compute();
}
