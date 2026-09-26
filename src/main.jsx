import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {
  MapPin,Share2,RotateCcw,Menu,Car,Bus,Clock3,Star,
  ShieldCheck,Heart,ArrowLeft,ExternalLink,CalendarDays,Umbrella,
  TreePine,House,WalletCards,Navigation,Utensils,ParkingCircle,
  Baby,Accessibility,SunMedium
} from "lucide-react";
import {evaluateRecommendations,evaluateCandidatePreview} from "./engine/recommend.js";
import {generateEvidenceReason} from "./engine/reasonGenerator.js";
import {normalizePlace} from "./lib/normalizePlace.js";
import {priceLabel} from "./lib/pricing.js";
import "./styles.css";

const AGES=[
  {id:"0-2",label:"0–2歲",sub:"幼兒"},
  {id:"3-5",label:"3–5歲",sub:"學齡前"},
  {id:"6-8",label:"6–8歲",sub:"國小低年級"},
  {id:"9-12",label:"9–12歲",sub:"國小高年級"}
];
const COUNTIES=["台北","新北","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東","基隆","澎湖","金門","連江"];
const CENTERS={"台北":[25.0478,121.5319],"新北":[25.012,121.4657],"桃園":[24.9937,121.301],"新竹":[24.8138,120.9675],"苗栗":[24.5602,120.8214],"台中":[24.1477,120.6736],"彰化":[24.0756,120.544],"南投":[23.9609,120.9719],"雲林":[23.7092,120.4313],"嘉義":[23.4801,120.4491],"台南":[22.9999,120.227],"高雄":[22.6273,120.3014],"屏東":[22.6761,120.4942],"宜蘭":[24.7021,121.7378],"花蓮":[23.9911,121.6112],"台東":[22.7554,121.15],"基隆":[25.1276,121.7392],"澎湖":[23.5655,119.5863],"金門":[24.4368,118.3171],"連江":[26.1605,119.9517]};

function HeroIllustration(){
  return <svg viewBox="0 0 390 260" className="heroArt" aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#94dcff"/><stop offset="1" stopColor="#eaf8ff"/></linearGradient>
      <linearGradient id="sea" x1="0" x2="1"><stop stopColor="#71cfe7"/><stop offset="1" stopColor="#80dfcf"/></linearGradient>
      <linearGradient id="hill" x1="0" x2="1"><stop stopColor="#84c879"/><stop offset="1" stopColor="#b8df83"/></linearGradient>
    </defs>
    <rect width="390" height="260" rx="32" fill="url(#sky)"/>
    <g opacity=".9" fill="#fff"><ellipse cx="54" cy="45" rx="36" ry="16"/><ellipse cx="82" cy="39" rx="30" ry="20"/><ellipse cx="325" cy="52" rx="38" ry="17"/></g>
    <path d="M0 145 Q55 110 110 140 T215 135 T390 125 V260 H0Z" fill="#8bcf8d"/>
    <path d="M0 173 Q70 142 125 170 T245 160 T390 155 V260 H0Z" fill="url(#hill)"/>
    <path d="M0 202 Q98 178 198 201 T390 190 V260 H0Z" fill="url(#sea)" opacity=".86"/>
    <g transform="translate(28 118)"><path d="M12 70 Q30 20 57 70Z" fill="#5ea866"/><circle cx="34" cy="27" r="13" fill="#397d46"/><path d="M63 69 Q83 12 112 69Z" fill="#68b56c"/><circle cx="87" cy="24" r="14" fill="#438d4d"/></g>
    <g transform="translate(198 70)" stroke="#603c2e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="36" cy="56" r="24" fill="#f0b07d"/><path d="M18 49 q16-31 39-5 q-14-6-38 12" fill="#784b37"/>
      <path d="M19 81 q17-10 34 0 l10 43 h-54z" fill="#f5a26d"/>
      <circle cx="95" cy="83" r="19" fill="#f4b47f"/><path d="M80 77 q12-25 31-3 q-16-7-29 9" fill="#6f4b39"/>
      <path d="M80 101 q16-8 29 1 l8 33H73z" fill="#ffd368"/>
      <circle cx="143" cy="93" r="18" fill="#f1af7e"/><path d="M129 88 q10-21 28-4" fill="#704a36"/>
      <path d="M128 109 q13-7 27 0 l8 30h-41z" fill="#70c2db"/>
      <circle cx="29" cy="55" r="2.5"/><circle cx="44" cy="55" r="2.5"/><path d="M31 66 q7 6 14 0" fill="none"/>
      <circle cx="90" cy="83" r="2"/><circle cx="101" cy="83" r="2"/><path d="M91 91 q5 4 10 0" fill="none"/>
      <circle cx="138" cy="93" r="2"/><circle cx="148" cy="93" r="2"/><path d="M139 101 q4 3 9 0" fill="none"/>
    </g>
    <g stroke="#e7b420" strokeWidth="4" strokeLinecap="round"><path d="M310 94 l10-18"/><path d="M326 100 l21-7"/><path d="M302 105 l-18-7"/></g>
  </svg>
}

function PlaceIllustration({kind="park",compact=false}){
  const isIndoor=["museum","indoor_play","aquarium","library","art","factory"].includes(kind);
  return <svg viewBox="0 0 420 220" className={compact?"placeArt compact":"placeArt"} aria-hidden="true">
    <rect width="420" height="220" rx="26" fill={isIndoor?"#eee9ff":"#9edfff"}/>
    {isIndoor ? <>
      <rect x="56" y="52" width="308" height="132" rx="18" fill="#fff6e3" stroke="#5f554a" strokeWidth="3"/>
      <rect x="84" y="76" width="74" height="80" rx="10" fill="#8fd2ef"/><rect x="174" y="76" width="74" height="80" rx="10" fill="#ffc96b"/><rect x="264" y="76" width="74" height="80" rx="10" fill="#9bd59c"/>
      <circle cx="121" cy="116" r="19" fill="#fff"/><path d="M111 117 q10-18 20 0 q-10 16-20 0" fill="#ea7c73"/>
    </> : <>
      <path d="M0 172 Q90 128 165 170 T420 152 V220 H0Z" fill="#8bce82"/><path d="M0 195 Q90 164 210 192 T420 178 V220 H0Z" fill="#b7df86"/>
      <g transform="translate(72 72)" stroke="#72513a" strokeWidth="3" strokeLinejoin="round"><rect x="0" y="44" width="88" height="62" rx="7" fill="#dfab65"/><path d="M-10 44 L44 0 L98 44Z" fill="#9a6a3c"/><path d="M44 14 v92"/><path d="M88 106 q38 15 52 44" fill="none"/></g>
      <g transform="translate(265 112)"><circle cx="0" cy="0" r="27" fill="#4c9a52"/><rect x="-5" y="15" width="10" height="55" fill="#7d5739"/><circle cx="35" cy="14" r="22" fill="#65ae5e"/><rect x="31" y="27" width="8" height="43" fill="#7d5739"/></g>
      <g transform="translate(185 146)"><circle cx="0" cy="0" r="10" fill="#f0ad79"/><rect x="-8" y="9" width="16" height="28" rx="7" fill="#ff866f"/><circle cx="42" cy="3" r="9" fill="#efad79"/><rect x="35" y="12" width="14" height="25" rx="6" fill="#6cc0dc"/></g>
    </>}
  </svg>
}

function App(){
 const [places,setPlaces]=useState([]);
 const [candidatePlaces,setCandidatePlaces]=useState([]);
 const [ages,setAges]=useState(["3-5"]);
 const [county,setCounty]=useState("台北");
 const [prefs,setPrefs]=useState(["auto"]);
 const [weather,setWeather]=useState(null);
 const [result,setResult]=useState(null);
 const [selectedPlace,setSelectedPlace]=useState(null);
 const [excluded,setExcluded]=useState([]);
 const [when,setWhen]=useState("now");
 const [notice,setNotice]=useState("");
 const [sharedPlace,setSharedPlace]=useState(null);
 const [userCoords,setUserCoords]=useState(null);
 const [maxDrive,setMaxDrive]=useState(30);
 const [transport,setTransport]=useState("drive");

 useEffect(()=>{
   Promise.all([fetch("/data/places.production.json").then(r=>r.json()),fetch("/data/places.json").then(r=>r.json())]).then(([prod,cand])=>{
     const pp=(prod.records||[]).map(normalizePlace), cp=(cand.records||[]).map(normalizePlace);
     setPlaces(pp);setCandidatePlaces(cp);
     const m=location.pathname.match(/^\/r\/([^/]+)/);
     if(m){
       const id=decodeURIComponent(m[1]); const q=new URLSearchParams(location.search); const found=pp.find(p=>p.id===id);
       if(found){
         const qa=(q.get("ages")||"").split(",").filter(Boolean); if(qa.length)setAges(qa);
         if(q.get("county"))setCounty(q.get("county")); if(q.get("when"))setWhen(q.get("when")); setSharedPlace(found);
       }
     }
   });
   try{const saved=JSON.parse(localStorage.getItem("jtw-family")||"null");if(saved?.ages?.length)setAges(saved.ages);if(saved?.county)setCounty(saved.county);if(saved?.prefs?.length)setPrefs(saved.prefs);if(saved?.maxDrive)setMaxDrive(saved.maxDrive);if(saved?.transport)setTransport(saved.transport)}catch{}
   if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p=>setUserCoords({lat:p.coords.latitude,lng:p.coords.longitude}),()=>setUserCoords(null),{enableHighAccuracy:false,timeout:5000,maximumAge:600000});
 },[]);

 useEffect(()=>{localStorage.setItem("jtw-family",JSON.stringify({ages,county,prefs,maxDrive,transport}))},[ages,county,prefs,maxDrive,transport]);
 useEffect(()=>{
   const c=CENTERS[county];if(!c)return;
   const u="https://api.open-meteo.com/v1/forecast?latitude="+c[0]+"&longitude="+c[1]+"&current=temperature_2m&hourly=precipitation_probability&forecast_days=3&timezone=Asia%2FTaipei";
   fetch(u).then(r=>r.json()).then(d=>{const now=new Date();const i=Math.max(0,d.hourly.time.findIndex(t=>new Date(t)>=now));const offset=when==="tomorrow"?24:0;const arr=d.hourly.precipitation_probability.slice(i+offset,i+offset+6).filter(Number.isFinite);setWeather({temp:d.current?.temperature_2m,pop:arr.length?Math.max(...arr):null})}).catch(()=>setWeather(null));
 },[county,when]);

 const currentPrefs=useMemo(()=>({selectedCounty:county,userCoords,ages,when,maxDriveMinutes:maxDrive,playStyles:prefs,excludedPlaceIds:excluded,currentRainProb:weather?.pop??0}),[county,userCoords,ages,when,maxDrive,prefs,excluded,weather]);
 const production=useMemo(()=>evaluateRecommendations(places,currentPrefs),[places,currentPrefs]);
 const preview=useMemo(()=>evaluateCandidatePreview(candidatePlaces,currentPrefs),[candidatePlaces,currentPrefs]);

 function decide(){setExcluded([]);setResult(production)}
 function toggleAge(a){setAges(v=>v.includes(a)?(v.length===1?v:v.filter(x=>x!==a)):[...v,a])}
 function togglePref(p){if(p==="auto"){setPrefs(["auto"]);return}setPrefs(v=>{const next=v.filter(x=>x!=="auto");return next.includes(p)?(next.length===1?["auto"]:next.filter(x=>x!==p)):[...next,p]})}
 function reroll(){if(!result?.hero)return;const ids=[result.hero,...(result.alternatives||[])].map(p=>p.id);const nextExcluded=[...new Set([...excluded,...ids])];setExcluded(nextExcluded);setResult(evaluateRecommendations(places,{...currentPrefs,excludedPlaceIds:nextExcluded}))}
 function share(p){const url=location.origin+"/r/"+p.id+"?ages="+ages.join(",")+"&county="+encodeURIComponent(county)+"&when="+when;if(navigator.share)navigator.share({title:p.name,text:"今天帶小孩去【"+p.name+"】好不好？",url}).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>setNotice("推薦連結已複製"))}
 function map(p){if(!p.isCoordinatePrecise){setNotice("此點位座標尚未完成驗證");return}window.open("https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lng,"_blank")}
 function typeLabel(p){return p.category==="park"?"公園・戶外":p.indoor&&!p.outdoor?"室內":"親子景點"}
 function reason(p){return generateEvidenceReason(p,currentPrefs)}
 function ageText(p){return (p.ageTags||[]).join("、")+"歲"}
 function showDetail(p){setSelectedPlace(p);window.scrollTo({top:0,behavior:"smooth"})}

 const detailPlace=sharedPlace||selectedPlace;
 if(detailPlace){
   return <main className="phoneShell detailPage">
     <div className="detailHero"><PlaceIllustration kind={detailPlace.category}/><button className="roundIcon backBtn" onClick={()=>{if(sharedPlace){history.pushState({},"","/");setSharedPlace(null)}else setSelectedPlace(null)}}><ArrowLeft size={22}/></button><div className="detailTools"><button className="roundIcon"><Heart size={19}/></button><button className="roundIcon" onClick={()=>share(detailPlace)}><Share2 size={19}/></button></div></div>
     <section className="detailSheet">
       <h1>{detailPlace.name}</h1><p className="subLine">{detailPlace.county}・{typeLabel(detailPlace)}</p>
       <div className="tagRow">{detailPlace.isFree&&<span className="softTag amber">免費</span>}{detailPlace.multiKidFriendly&&<span className="softTag green">親子友善</span>}<span className="softTag blue">{detailPlace.indoor?"室內":"戶外"}</span><span className="softTag coral">{priceLabel(detailPlace)}</span></div>
       <p className="description">依你目前設定條件篩選出的親子去處。實際開放、票價與設施仍以官方資料為準。</p>
       <div className="metricGrid"><div><Car/><b>車程</b><span>{detailPlace._driveMinutes?detailPlace._driveMinutes+" 分鐘":"依導航為準"}</span></div><div><Clock3/><b>建議停留</b><span>{detailPlace.durationMin?Math.round(detailPlace.durationMin/60)+"–3 小時":"約 2 小時"}</span></div><div><WalletCards/><b>費用</b><span>{priceLabel(detailPlace)}</span></div></div>
       <section className="detailBlock"><h2>適合年齡</h2><div className="ageDetailGrid">{AGES.map(a=><div key={a.id} className={(detailPlace.ageTags||[]).includes(a.id)?"ageMini on":"ageMini"}><Baby size={21}/><b>{a.label}</b></div>)}</div></section>
       <section className="detailBlock"><h2>設施與服務</h2><div className="facilityGrid"><div><ParkingCircle/><span>{detailPlace.amenities?.parking==="easy"?"好停車":"停車依現場"}</span></div><div><Baby/><span>{detailPlace.amenities?.stroller?"推車友善":"推車資訊待確認"}</span></div><div><Accessibility/><span>{detailPlace.amenities?.diaperStation?"有尿布台":"尿布台待確認"}</span></div><div><Utensils/><span>{detailPlace.amenities?.foodNearby?"附近有餐飲":"餐飲待確認"}</span></div></div></section>
       <section className="detailBlock"><h2>為什麼推薦給你？</h2><div className="reasonCard">{reason(detailPlace).split("・").map((r,i)=><div key={i}><span className="checkDot">✓</span>{r}</div>)}</div></section>
       <div className="trustStrip"><ShieldCheck size={18}/><span>{detailPlace.sourceLabel||"官方資料"}</span>{detailPlace.trustLayer?.lastVerifiedAt&&<span>驗證 {detailPlace.trustLayer.lastVerifiedAt}</span>}{detailPlace.trustLayer?.officialUrl&&<a href={detailPlace.trustLayer.officialUrl} target="_blank" rel="noreferrer">官方來源 <ExternalLink size={13}/></a>}</div>
       <div className="stickyActions"><button className="navPrimary" onClick={()=>map(detailPlace)}><Navigation size={19}/>導航去這裡</button><button className="shareSecondary" onClick={()=>share(detailPlace)}><Share2 size={18}/>傳給另一半</button></div>
     </section>
     {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}</div>}
   </main>
 }

 return <main className={result?"phoneShell resultMode":"phoneShell"}>
   <header className="appHeader"><div className="logoText">今天玩什麼<span>✦</span></div><button className="menuBtn"><Menu size={25}/></button></header>

   {!result ? <>
     <section className="introHero"><HeroIllustration/><div className="heroCopy"><h1>不知道去哪？<br/><strong>今天玩什麼</strong><br/>幫你決定！</h1><p>輸入幾個條件，<br/>3 秒給你今天最適合的親子行程！</p></div></section>
     <section className="decisionPanel">
       <h2>孩子幾歲？ <span>（可複選）</span></h2>
       <div className="ageChoiceGrid">{AGES.map(a=><button key={a.id} className={ages.includes(a.id)?"choiceCard selected":"choiceCard"} onClick={()=>toggleAge(a.id)}><div className="kidBadge"><Baby size={22}/></div><div><b>{a.label}</b><small>{a.sub}</small></div></button>)}</div>
       <h2>想怎麼玩？ <span>（可複選）</span></h2>
       <div className="playGrid">
         {[["outdoor","戶外放電",TreePine],["indoor","室內玩樂",House],["free","免費景點",WalletCards],["auto","雨天備案",Umbrella]].map(([id,label,Icon])=><button key={id} className={prefs.includes(id)?"playCard selected":"playCard"} onClick={()=>togglePref(id)}><Icon size={24}/><b>{label}</b></button>)}
         <button className="playCard"><CalendarDays size={24}/><b>本週活動</b></button><button className="playCard"><Star size={24}/><b>期間限定</b></button>
       </div>
       <h2>何時出發？</h2>
       <div className="whenGrid">{[["now","現在",SunMedium],["afternoon","今天下午",Clock3],["tomorrow","明天",CalendarDays],["weekend","這週末",CalendarDays]].map(([id,label,Icon])=><button key={id} className={when===id?"miniChoice selected":"miniChoice"} onClick={()=>setWhen(id)}><Icon size={21}/><span>{label}</span></button>)}</div>
       <h2>出發地點</h2>
       <div className="locationRow"><button className="locationPrimary"><MapPin size={20}/>使用我的位置<small>{userCoords?"已取得大概位置":"未授權時使用縣市"}</small></button><select value={county} onChange={e=>setCounty(e.target.value)}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
       <h2>交通方式</h2>
       <div className="transportRow"><button className={transport==="drive"?"transportChoice selected":"transportChoice"} onClick={()=>setTransport("drive")}><Car size={22}/>開車</button><button className={transport==="transit"?"transportChoice selected":"transportChoice"} onClick={()=>setTransport("transit")}><Bus size={22}/>大眾運輸</button></div>
       <h2>最多願意開多久？ <span>（單程）</span></h2>
       <div className="driveRow">{[15,30,45,60].map(v=><button key={v} className={maxDrive===v?"driveChip selected":"driveChip"} onClick={()=>setMaxDrive(v)}>{v}分</button>)}</div>
       <button className="decideBtn" onClick={decide}><span className="spark">✦</span>幫我決定今天玩什麼 <span>→</span></button>
     </section>
   </> : <section className="resultScreen">
     <div className="weatherBanner"><MapPin size={19}/><div><b>{county}・{weather?"多雲時晴":"天氣讀取中"}</b><span>{weather?("降雨機率 "+weather.pop+"%・"+Math.round(weather.temp)+"°C"):"依選擇縣市自動判斷"}</span></div><SunMedium className="sunIcon"/></div>
     {!result.hero ? <div className="empty prettyEmpty"><div className="emptyArt"><Umbrella size={38}/></div><h3>這個條件目前沒有通過驗證的選擇</h3><p>{result.fallbackNote}</p><div className="emptyActions">{prefs.includes("indoor")&&<button onClick={()=>{setPrefs(["outdoor"]);setResult(null)}}>改看戶外</button>}{prefs.includes("free")&&<button onClick={()=>{setPrefs(v=>v.filter(x=>x!=="free"));setResult(null)}}>接受門票</button>}<button onClick={()=>setResult(null)}>重新調整</button></div>{preview.hero&&<button className="previewLink" onClick={()=>setResult({...preview,preview:true,fallbackNote:"尚未完成官方驗證，只供參考。"})}>看看尚未驗證的候選方向</button>}</div> : <>
       <div className="resultIntro"><div className="avatarMom"><Baby size={25}/></div><div><b>根據你選的條件</b><span>今天最適合的行程是…</span></div><Heart size={21}/></div>
       <article className="heroResultCard">
         <div className="heroImageWrap"><PlaceIllustration kind={result.hero.category}/><span className="crownBadge">首選推薦</span></div>
         <div className="heroResultBody">
           <h1 onClick={()=>showDetail(result.hero)}>{result.hero.name}</h1><p>{result.hero.county}・{typeLabel(result.hero)}</p>
           <div className="quickLine"><Car size={18}/>車程約 {result.hero._driveMinutes||"—"} 分鐘 <button onClick={()=>showDetail(result.hero)}><MapPin size={17}/>查看地圖</button></div>
           <div className="miniStats"><div><span>適合年齡</span><b>{ageText(result.hero)}</b></div><div><span>費用</span><b>{priceLabel(result.hero)}</b></div><div><span>建議停留</span><b>{result.hero.durationMin?Math.round(result.hero.durationMin/60)+"–3小時":"約2小時"}</b></div></div>
           <div className="ratingRow"><div><span>放電程度</span><b>{"★".repeat(Math.min(5,result.hero.energyLevel||3))}</b></div><div><span>爸媽輕鬆度</span><b>{"★".repeat(Math.max(2,5-(result.hero.parentEffort||2)))}</b></div></div>
           <div className="amenityLine"><span><ParkingCircle/>好停車</span><span><Baby/>推車友善</span><span><Utensils/>附近有美食</span></div>
           <div className="whyBox"><h3>為什麼推薦給你？</h3>{reason(result.hero).split("・").slice(0,4).map((r,i)=><p key={i}><span>✓</span>{r}</p>)}</div>
           <div className="mainActions"><button className="navPrimary" onClick={()=>map(result.hero)}><Navigation size={19}/>導航去這裡</button><button className="shareSecondary" onClick={()=>share(result.hero)}><Share2 size={18}/>傳給另一半</button></div>
         </div>
       </article>
       <div className="altsHeader"><h2>另外兩個備選方案</h2><button onClick={reroll}><RotateCcw size={16}/>換一批推薦</button></div>
       <div className="altStack">{(result.alternatives||[]).map(p=><article className="altResultCard" key={p.id}><button className="altThumb" onClick={()=>showDetail(p)}><PlaceIllustration kind={p.category} compact/></button><div className="altContent"><h3 onClick={()=>showDetail(p)}>{p.name}</h3><p>{p.county}・{typeLabel(p)}</p><div className="altMeta"><span><Car/>約 {p._driveMinutes||"—"} 分</span><span>{priceLabel(p)}</span></div><div className="altTags"><span>{p.indoor?"室內":"戶外"}</span>{p.isFree&&<span>免費</span>}</div></div><div className="altButtons"><button onClick={()=>map(p)}><Navigation size={16}/>導航</button><button onClick={()=>share(p)}><Share2 size={15}/>分享</button></div></article>)}{(result.alternatives||[]).length<2&&<div className="emptyAlt">沒有更多安全備選，系統不會跨縣市硬補。</div>}</div>
       <button className="modifyBtn" onClick={()=>setResult(null)}>修改條件</button>
     </>}
   </section>}
   {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}</div>}
 </main>
}

createRoot(document.getElementById("root")).render(<App/>);
