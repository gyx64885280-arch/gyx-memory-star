import {parsePlaces,project,joinNetwork,sample,systems} from './region-data.mjs';
const safe=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const get=id=>document.getElementById(id);
let catalog=null,model=null,chosen='全部',label='',frame='GCJ-02';
export const regionModel=()=>model;
function fileSave(name,obj){const u=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)}
export function regionPage(){return `<div class="wrap page" id="regionPage"><div class="title"><div><div class="crumb"><a href="#home">门户首页</a>　/　区域接入</div><div class="kicker">DATA STUDIO　/　LOCAL IMPORT</div><h1>接入你的街道</h1><p>先核对设施点位，再用本街道的道路和楼栋评估服务覆盖。文件只在当前浏览器中处理。</p></div></div>
 <div class="panel introband"><div><b>第一次使用？试试青禾街道</b><p>用另一张合成路网走一遍完整流程：7 个设施、16 个节点、2 栋住宅。</p></div><button class="btn blue" id="regionDemo">载入迁移示例 →</button></div>
 <div class="grid two"><section class="panel"><div class="kicker">01　/　设施清单</div><h3>导入地图点位</h3><p>支持高德地点检索 JSON、百度地点检索 JSON、GeoJSON 点或 CSV。选择文件本身的坐标系。</p><label class="field">文件坐标系<select id="regionCrs">${systems.map(v=>`<option ${v===frame?'selected':''}>${v}</option>`).join('')}</select></label><label class="field">点位文件（最多 2 MB）<input type="file" id="placeFile" accept=".json,.geojson,.csv"></label><details><summary>字段与样例</summary><div>高德读取 pois[].location；百度读取 results[].location.lng / lat。CSV 需要 name、lng、lat，可选 category、district、capacity。GeoJSON 在 Point 的 properties 中填写同名属性。<p><a class="link" href="https://lbs.amap.com/api/webservice/guide/api-advanced/search" target="_blank" rel="noopener">高德格式 ↗</a>　<a class="link" href="https://lbsyun.baidu.com/docs/webapi?title=placev3%2Fguide%2Fwebservice-placeapiV3%2FinterfaceDocumentV2" target="_blank" rel="noopener">百度格式 ↗</a></p><button id="poiTemplate">下载合成点位样例</button></div></details></section>
 <section class="panel"><div class="kicker">02　/　覆盖评估</div><h3>匹配本地步行网络</h3><p>载入同坐标系的路网、楼栋人口和拟增设施。每个设施连接至 80 米内最近的节点，未匹配项单独计数。</p><label class="field">缺失容量时采用的情景假设（人次/期）<input type="number" id="regionCapacity" value="100" min="1" max="10000000"></label><label class="field">片区路网 JSON<input type="file" id="streetFile" accept=".json"></label><button id="graphTemplate">下载带经纬度的路网模板 ↓</button></section></div>
 <p id="regionMessage" class="info" role="status">点位可单独查看；计算覆盖率还需要道路连通关系、路段长度、楼栋人口和设施容量。</p><div id="regionResult"></div></div>`;}
const colors=['#167e77','#287daf','#b87825','#966f96','#5e7950','#655db1','#a04d55','#3b6b80','#7e8286'];
function draw(){
 if(!catalog){get('regionResult').innerHTML='';return}
 const groups=[...new Set(catalog.places.map(p=>p.cat))],projected=project(catalog.places);
 const filtered=projected.filter(p=>chosen==='全部'||chosen===p.cat);
 const dots=filtered.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${colors[groups.indexOf(p.cat)]}" stroke="white"><title>${safe(p.name)} · ${safe(p.cat)}</title></circle>`).join('');
 get('regionResult').innerHTML=`<section class="panel"><div class="kicker">IMPORT RESULTS</div><h3>${safe(label)} · 点位预览</h3><p>${safe(catalog.format)} · ${safe(catalog.crs)}　有效 ${catalog.places.length} 项，剔除重复 ${catalog.duplicates} 项，无效 ${catalog.invalid} 项。</p><label class="field">查看类别<select id="regionFilter">${['全部',...groups].map(g=>`<option ${chosen===g?'selected':''}>${safe(g)}</option>`).join('')}</select></label><div class="grid two"><div class="pointplot"><svg viewBox="0 0 640 400" role="img" aria-label="按原始经纬度绘制的相对分布图"><path d="M35 35V370H615" fill="none" stroke="#adc5c8"/>${dots}<text x="45" y="35">↑ 北</text></svg><small>设施相对分布 · 同一坐标系 · ${filtered.length} 个点位</small></div><div class="scrolllist">${filtered.map(p=>`<div class="item"><b>${safe(p.name)}</b><small>　${safe(p.cat)} · ${safe(p.district)}　${p.lng.toFixed(5)}, ${p.lat.toFixed(5)}</small></div>`).join('')}</div></div></section>
 ${model?`<div class="panel introband"><div><h3>${safe(model.region)}已可评估</h3><p>匹配 ${model.facilities.length} 个设施，超出距离 ${model.unmatched} 个，未分类 ${model.unknown} 个。采用假设容量 ${model.assumed} 个（${model.defaultCap} 人次/期）。</p></div><a class="btn blue" href="#govern/region">评估这个片区 →</a></div>`:''}`;
 get('regionFilter').onchange=e=>{chosen=e.target.value;draw()};
}
export function wireRegion(){
 draw();const notice=t=>{get('regionMessage').textContent=t};
 const read=async(file)=>{if(!file||file.size>2e6)throw Error('文件不存在或超过 2 MB。');return (await file.text()).replace(/^\uFEFF/,'')};
 const root=get('regionPage');let revision=0;
 get('regionDemo').onclick=()=>{revision++;const d=sample();catalog=parsePlaces(JSON.stringify(d.pois),'GCJ-02');frame='GCJ-02';get('regionCrs').value=frame;model=joinNetwork(catalog,d.graph,100);chosen='全部';label=d.graph.region;draw();notice('合成迁移样区已载入，可查看设施或进入治理评估。')};
 get('poiTemplate').onclick=()=>fileSave('青禾样区-高德格式示例.json',sample().pois);
 get('graphTemplate').onclick=()=>fileSave('青禾样区-路网模板.json',sample().graph);
 get('regionCrs').onchange=e=>{frame=e.target.value;notice('该选择用于下一份点位文件。请重新选择文件以更换其坐标系。');get('placeFile').value=''};
 get('placeFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;const rev=++revision;try{const d=parsePlaces(await read(file),frame);if(!root.isConnected||rev!==revision)return;catalog=d;model=null;chosen='全部';label=file.name;draw();notice('点位已载入。可继续导入配套路网计算覆盖率。')}catch(err){if(root.isConnected&&rev===revision)notice('导入失败：'+err.message)}finally{e.target.value=''}};
 get('streetFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;const rev=++revision;try{if(!catalog)throw Error('请先导入点位文件。');const graph=JSON.parse(await read(file));if(!root.isConnected||rev!==revision)return;model=joinNetwork(catalog,graph,Number(get('regionCapacity').value));draw();notice('路网匹配完成，详细计数见下方。')}catch(err){if(root.isConnected&&rev===revision)notice('匹配失败：'+err.message)}finally{e.target.value=''}};
}
