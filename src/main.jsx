import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {MapPin,Share2,RotateCcw,ChevronDown} from "lucide-react";
import "./styles.css";

const AGES=["0-2","3-5","6-8","9-12"];
const COUNTIES=["台北","新北","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東","基隆","澎湖","金門","連江"];

function App(){
 const [places,setPlaces]=useState([]);
 const [ages,setAges]=useState(["3-5"]);
 const [county,setCounty]=useState("台北");
 const [prefs,setPrefs]=useState(["auto"]);
 const [weather,setWeather]=useState(null);
 const [result,setResult]=useState(null);
 const [excluded,setExcluded]=useState([]);
 const [open,setOpen]=useState(false);
 const [when,setWhen]=useState("today");
 const [notice,setNotice]=useState("");

 useEffect(()=>{fetch("/data/places.json").then(r=>r.json()).then(d=>setPlaces(d.records||[]));try{const saved=JSON.parse(localStorage.getItem("jtw-family")||"null");if(saved){if(saved.ages?.length)setAges(saved.ages);if(saved.county)setCounty(saved.county);if(saved.prefs?.length)setPrefs(saved.prefs)}}catch{}},[]);
 useEffect(()=>{localStorage.setItem("jtw-family",JSON.stringify({ages,county,prefs}))},[ages,county,prefs]);
 useEffect(()=>{const c={"台北":[25.0478,121.5319],"新北":[25.012,121.4657],"桃園":[24.9937,121.301],"新竹":[24.8138,120.9675],"苗栗":[24.5602,120.8214],"台中":[24.1477,120.6736],"彰化":[24.0756,120.544],"南投":[23.9609,120.9719],"雲林":[23.7092,120.4313],"嘉義":[23.4801,120.4491],"台南":[22.9999,120.227],"高雄":[22.6273,120.3014],"屏東":[22.6761,120.4942],"宜蘭":[24.7021,121.7378],"花蓮":[23.9911,121.6112],"台東":[22.7554,121.15],"基隆":[25.1276,121.7392],"澎湖":[23.5655,119.5863],"金門":[24.4368,118.3171],"連江":[26.1605,119.9517]}[county];if(!c)return;const u="https://api.open-meteo.com/v1/forecast?latitude="+c[0]+"&longitude="+c[1]+"&current=temperature_2m&hourly=precipitation_probability&forecast_days=1&timezone=Asia%2FTaipei";fetch(u).then(r=>r.json()).then(d=>{const i=Math.max(0,d.hourly.time.findIndex(t=>new Date(t)>=new Date()));const arr=d.hourly.precipitation_probability.slice(i,i+6).filter(Number.isFinite);setWeather({temp:d.current.temperature_2m,pop:arr.length?Math.max(...arr):null})}).catch(()=>setWeather(null))},[county]);

 const pool=useMemo(()=>{
  return places.filter(p=>p.county===county && !excluded.includes(p.id) &&
   ages.some(a=>p.ageTags.includes(a)) &&
   (prefs.includes("auto") ||
    (!prefs.includes("indoor")||p.indoor) &&
    (!prefs.includes("outdoor")||p.outdoor) &&
    (!prefs.includes("free")||p.isFree)) &&
   !(prefs.includes("auto")&&weather?.pop>=40&&p.outdoor&&!p.covered)
  ).map(p=>{
   const overlap=ages.filter(a=>p.ageTags.includes(a)).length/ages.length;
   const parkBonus=p.category==="park"?8:0;
   const rainBonus=weather?.pop>=40&&p.indoor?8:0;
   return {...p,score:overlap*45+p.socialPopularity*.3+(p.multiKidFriendly?8:0)+parkBonus+rainBonus}
  }).sort((a,b)=>b.score-a.score);
 },[places,county,ages,prefs,weather,excluded]);

 function decide(){setExcluded([]);setResult({primary:pool[0]||null,alts:pool.slice(1,3)})}
 function toggleAge(a){setAges(v=>v.includes(a)?(v.length===1?v:v.filter(x=>x!==a)):[...v,a])}
 function togglePref(p){if(p==="auto"){setPrefs(["auto"]);return}setPrefs(v=>{const next=v.filter(x=>x!=="auto");return next.includes(p)?(next.length===1?["auto"]:next.filter(x=>x!==p)):[...next,p]})}
 function reroll(){if(!result?.primary)return;const ids=[result.primary,...result.alts].map(p=>p.id);const nextExcluded=[...new Set([...excluded,...ids])];setExcluded(nextExcluded);const next=places.filter(p=>p.county===county&&!nextExcluded.includes(p.id)&&ages.some(a=>p.ageTags.includes(a))&&(!prefs.includes("indoor")||p.indoor)&&(!prefs.includes("outdoor")||p.outdoor)&&(!prefs.includes("free")||p.isFree)&&!(prefs.includes("auto")&&weather?.pop>=40&&p.outdoor&&!p.covered)).map(p=>({...p,score:(ages.filter(a=>p.ageTags.includes(a)).length/ages.length)*45+p.socialPopularity*.3+(p.multiKidFriendly?8:0)+(p.category==="park"?8:0)+(weather?.pop>=40&&p.indoor?8:0)})).sort((a,b)=>b.score-a.score);setResult({primary:next[0]||null,alts:next.slice(1,3)})}
 function share(p){const url=location.origin+"/r/"+p.id+"?ages="+ages.join(",")+"&county="+encodeURIComponent(county)+"&when="+when;if(navigator.share)navigator.share({title:p.name,text:"今天帶小孩去【"+p.name+"】好不好？",url}).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>setNotice("推薦連結已複製"))}
 function map(p){window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.name+" "+p.county),"_blank")}
 function typeLabel(p){return p.category==="park"?"特色公園":p.indoor&&!p.outdoor?"室內":"親子景點"}

 return <main className="app">
   <header className="top"><div className="brand">今天玩什麼</div><div className="weather">{county}<br/>{weather?Math.round(weather.temp)+"°C・降雨 "+weather.pop+"%":"天氣讀取中"}</div></header>
   <section className="hero"><h1>不知道去哪？<br/>今天玩什麼<br/>幫你決定！</h1><p>選孩子年齡，直接從全台親子景點與公園裡幫你縮小選擇。</p><div className="scene"><div className="hill"/><div className="family"/></div></section>
   {!result&&<section className="card">
     <h2>孩子幾歲？</h2><p className="muted">可複選，適合多寶家庭</p>
     <div className="agegrid">{AGES.map(a=><button key={a} className={"age "+(ages.includes(a)?"on":"")} onClick={()=>toggleAge(a)}>{a}歲</button>)}</div>
     <button className="primary" onClick={decide}>幫我決定今天玩什麼</button>
     <button className="fine" onClick={()=>setOpen(v=>!v)}>微調條件 <ChevronDown size={16}/></button>
     {open&&<div className="drawer">
       <b>想去哪一天？</b><div className="pills when">{[["today","今天"],["tomorrow","明天"],["weekend","這週末"]].map(([v,l])=><button key={v} className={"pill "+(when===v?"on":"")} onClick={()=>setWhen(v)}>{l}</button>)}</div><b>所在縣市</b><select value={county} onChange={e=>setCounty(e.target.value)}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select>
       <b>玩法（可複選，需同時符合）</b><div className="pills">{["auto","indoor","outdoor","free"].map(p=><button key={p} className={"pill "+(prefs.includes(p)?"on":"")} onClick={()=>togglePref(p)}>{({auto:"自動最適",indoor:"室內",outdoor:"戶外",free:"免費"})[p]}</button>)}</div>
     </div>}
   </section>}
   {result&&<section className="results">
     {!result.primary?<div className="empty"><h3>目前沒有符合的同縣市結果</h3><p>這個版本不會拿外縣市硬湊。請調整玩法或年齡條件。</p><button onClick={()=>setResult(null)}>返回調整</button></div>:<>
       <div className="summary">{ages.join("＋")}歲・{county}・{({today:"今天",tomorrow:"明天",weekend:"這週末"})[when]}・{prefs.includes("auto")?"自動最適":prefs.join("＋")}</div>
       <h3>今天就去這裡</h3><article className="resultCard"><div className="illustration"><span>{typeLabel(result.primary)}</span></div><div className="body"><h2>{result.primary.name}</h2><p className="muted">{result.primary.county}・{typeLabel(result.primary)}・熱門度 {result.primary.socialPopularity}</p><div className="why"><b>為什麼推薦：</b> 符合你選的年齡；{weather?"目前降雨約 "+weather.pop+"%；":""}{result.primary.isFree?"免費；":""}{result.primary.category==="park"?"適合日常放電；":""}</div><div className="actions"><button onClick={()=>map(result.primary)}><MapPin size={18}/>導航</button><button onClick={()=>share(result.primary)}><Share2 size={18}/>傳給另一半</button></div><button className="reroll" onClick={reroll}><RotateCcw size={18}/>不要這個，再幫我決定一次</button><p className="trust">資料狀態：候選資料。營業時間、設施與即時狀態尚未完成逐筆官方驗證，因此不做推測。</p></div></article>
       <h3>另外兩個備選</h3>{result.alts.map(p=><article className="alt" key={p.id}><div><b>{p.name}</b><p>{typeLabel(p)}・{p.isFree?"免費":"付費/票價待驗證"}</p></div><div className="altActions"><button onClick={()=>map(p)}>導航</button><button onClick={()=>share(p)}>分享</button></div></article>)}
       {result.alts.length<2&&<div className="alt"><b>備選資料仍在補</b><p>寧可少給，也不跨縣市湊數。</p></div>}
       <button className="secondary" onClick={()=>setResult(null)}>修改條件</button>
     </>}
   </section>}
 {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}</div>}
 </main>
}
createRoot(document.getElementById("root")).render(<App/>);
