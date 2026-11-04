import {paths,assess} from './engine.mjs';
const safe=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const errands={'随便逛逛':null,'买菜补货':['买菜','商超'],'看诊助餐':['医疗','养老'],'散步运动':['体育'],'我的常去':[]};
export function buildTrip(result,state,peak){
 const net=result.net;
 const delays=net.edges.filter(e=>e.signal&&peak);
 const path=paths(net,result.home,state.mode,state.senior,false,state.wait,peak?2:.75);
 return {delays,times:path.time,facilities:net.facilities.map(p=>({...p,t:path.time[p.id],route:path.route(p.id),legs:path.legs(p.id)})).sort((a,b)=>a.t-b.t)};
}
function direction(a,b){
 const dx=b.x-a.x,dy=b.y-a.y;
 return Math.abs(dx)>Math.abs(dy)?(dx>0?'东':'西'):(dy>0?'南':'北');
}
export function tripCard(result,state,f,first,count,intent,saved,peak){
 const buttons=Object.keys(errands).map(t=>`<button data-errand="${t}" aria-pressed="${intent===t}" class="${intent===t?'active':''}">${t}</button>`).join('');
 const name=safe(f?.name||''),motion={walk:'步行',bike:'骑行',bus:'公交或步行'}[state.mode];
 let content='<p>当前条件下没有匹配地点。试试其他需求，或清空搜索条件。</p>';
 if(intent==='我的常去'&&!f)content='<p>在目的地卡片点击「收藏地点」，下次来这里就能快速查看路线。</p>';
 if(f){
  const waits=f.legs.filter(l=>l.kind==='road'&&l.signal).length;
  const road=(state.mode==='bike'?'骑行':'步行');
  const route=f.legs.filter(l=>l.kind!=='alight').map(l=>{
   if(l.kind==='board')return '在示例站点候车约 '+l.minutes.toFixed(1)+' 分钟';
   if(l.kind==='ride')return '乘坐社区接驳车一站，约 '+l.minutes.toFixed(1)+' 分钟';
   return '向'+direction(result.net.nodes[l.from],result.net.nodes[l.to])+road+'约 '+Math.round(l.metres)+' 米'+(l.signal?'，经信号路口':'');
  });
  content=`<div class="pick"><div><small>${f.id===first?.id?'所选需求中最快到达':'当前选择'} · ${motion}</small><h2>${name}</h2><p>${f.t<=15?'这趟在生活圈内，还余约 '+(15-f.t).toFixed(1)+' 分钟。':'这趟比一刻钟多 '+(f.t-15).toFixed(1)+' 分钟，可切换方式比较。'}</p></div><div class="bigtime">${Math.ceil(f.t)}<small>约 / 分钟</small></div></div><div class="row"><button data-favorite aria-pressed="${saved}">${saved?'★ 已收藏':'☆ 收藏地点'}</button><span class="fine">${waits?'经过 '+waits+' 个信号路段，模型累计等待约 '+(waits*(peak?2:.75)).toFixed(1)+' 分钟。':'该条路线没有模拟信号等待。'}</span></div><details><summary>查看从家门口出发的分段路线</summary><div><ol class="routeSteps"><li>从${safe(result.home.name)}到出口，约 ${(result.home.inside*(state.senior?1.2/.7:1)).toFixed(1)} 分钟</li>${route.map(t=>'<li>'+t+'</li>').join('')}<li>到达${name}</li></ol></div></details>`;
 }
 return `<section class="panel trip"><div class="kicker">MY NEIGHBOURHOOD　/　居民出行</div><h3>今天想去哪儿？</h3><div class="chips">${buttons}</div>${content}<p class="fine">从当前楼栋出发，有 ${count} 处示例设施可在一刻钟内到达。路况采用所选时段的情景假设。</p></section>`;
}
export function sortCandidates(items,goal){
 return [...items].sort((a,b)=>{if(goal==='客群规模')return b.pop-a.pop||b.gap-a.gap;
 if(goal==='竞争较少')return (a.ratio??Infinity)-(b.ratio??Infinity)||b.gap-a.gap;
 return b.gap-a.gap});
}
export function shopCard(m,top,goal){
 const reason=goal==='客群规模'?`15 分钟内可触达 ${top.pop} 位居民`:goal==='竞争较少'?`现有供给与预计需求之比为 ${top.ratio?.toFixed(2)??'—'}`:`预计需求比现有日供给多 ${top.gap} 人次`;
 return `<div class="panel rolelead"><div class="kicker">SITE SELECTION　/　选址备忘</div><h3>先去${safe(top.name)}看铺</h3><p>按「${safe(goal)}」排序，${reason}。实地核查门前有效人流、同类店营业时段和租约，再决定是否入驻。</p></div>`;
}
export function shopBudget(m,params){
 const [rent,contribution,share]=params;
 const orders=Math.ceil(rent/30/contribution);
 const demand=Math.max(0,m.gap)*share/100,delta=demand-orders;
 return `<b>每日约需 ${orders} 单覆盖租金</b><p>假设能承接该点未满足需求的 ${share}%，对应约 ${demand.toFixed(1)} 单/日。${delta>=0?'高出租金门槛约 '+delta.toFixed(1)+' 单。':'距离租金门槛还差约 '+(-delta).toFixed(1)+' 单/日。'}</p><small>按每月 30 天、每人次一单估算。此处只核算租金，人工、水电和税费需另计。</small>`;
}
export function govCard(r,s,plan){
 const current=plan?r.plan:r.base;
 const missing=current.scores.filter(h=>h.t>15).sort((a,b)=>b.pop-a.pop||b.t-a.t);
 const priority=missing[0]||[...current.scores].sort((a,b)=>a.score-b.score)[0];
 const left=current.pop-current.covered;
 const addOnly=assess({...r.net,facilities:[...r.net.facilities,...(r.net.add.cat===s.cat?[r.net.add]:[])]},s.cat,false,15,s.senior);
 const gained=r.plan.covered-r.base.covered;
 return `<section class="panel decision"><div class="kicker">ACTION BRIEF　/　${plan?'优化后复核':'现状研判'}</div><h3>${left?'优先核查 '+safe(priority.name):'全部楼栋已覆盖，继续核查服务容量'}</h3><p>${left?`仍有 ${missing.length} 栋、${left} 人位于 15 分钟服务范围外。${safe(priority.name)}涉及 ${priority.pop} 人，按未覆盖人口排序居首。`:`最低容量可达性楼栋为 ${safe(priority.name)}，得分 ${priority.score.toFixed(3)}。先核对设施开放时段与可接待人数。`}</p><div class="compare"><div class="item"><b>设施选址</b><p>${r.net.add.cat===s.cat?'仅增加「'+safe(r.net.add.name)+'」可新增覆盖 '+(addOnly.covered-r.base.covered)+' 人。':'当前情景未给该类设施设新增点，建议先走访供需薄弱楼栋。'}</p></div><div class="item"><b>交通配套</b><p>在增补基础上再缩短信号等待，可再覆盖 ${r.plan.covered-addOnly.covered} 人。两项合计新增 ${gained} 人。</p></div></div><small>核查顺序按受影响人口确定。计算基于当前所选设施、人群步速和输入模型。</small></section>`;
}
