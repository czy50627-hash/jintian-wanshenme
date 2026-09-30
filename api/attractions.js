import AdmZip from "adm-zip";

const URL="https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Attraction-json.zip";
let cache={ts:0,records:[]};
const TTL=1000*60*60*6;

function allArrays(v,out=[]){
  if(Array.isArray(v)) out.push(v);
  else if(v&&typeof v==="object") for(const x of Object.values(v)) allArrays(x,out);
  return out;
}
function text(v){
  if(v==null) return "";
  if(typeof v==="string"||typeof v==="number") return String(v);
  if(Array.isArray(v)) return v.map(text).filter(Boolean).join(" ");
  if(typeof v==="object") return Object.values(v).map(text).filter(Boolean).join(" ");
  return "";
}
function cityName(r){
  const s=text(r.LocatedCities||r.PostalAddress||r.Address||"");
  const m=s.match(/(臺北市|台北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|臺中市|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|臺南市|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|基隆市|澎湖縣|金門縣|連江縣)/);
  return m?.[1]||"";
}
const alias={"台北":"臺北市","新北":"新北市","桃園":"桃園市","新竹":"新竹","苗栗":"苗栗縣","台中":"臺中市","彰化":"彰化縣","南投":"南投縣","雲林":"雲林縣","嘉義":"嘉義","台南":"臺南市","高雄":"高雄市","屏東":"屏東縣","宜蘭":"宜蘭縣","花蓮":"花蓮縣","台東":"臺東縣","基隆":"基隆市","澎湖":"澎湖縣","金門":"金門縣","連江":"連江縣"};
function countyMatch(city,county){
  const a=alias[county]||county;
  if(county==="新竹") return /新竹[市縣]/.test(city);
  if(county==="嘉義") return /嘉義[市縣]/.test(city);
  return city===a || city.replace(/^台/,"臺")===a;
}
function familyFriendly(r){
  const s=[r.AttractionName,r.Description,r.AttractionClasses,r.Facilities,r.AssetsClass,r.Remarks].map(text).join(" ");
  return /(公園|遊戲場|遊樂|親子|兒童|博物館|美術館|科學|天文|動物園|水族|農場|牧場|觀光工廠|生態|森林|休閒農業|文化館|故事館|樂園|植物園|展館|教育館|探索館|遊客中心)/.test(s);
}
function appCounty(city){
  const pairs=[["臺北市","台北"],["台北市","台北"],["新北市","新北"],["桃園市","桃園"],["新竹市","新竹"],["新竹縣","新竹"],["苗栗縣","苗栗"],["臺中市","台中"],["台中市","台中"],["彰化縣","彰化"],["南投縣","南投"],["雲林縣","雲林"],["嘉義市","嘉義"],["嘉義縣","嘉義"],["臺南市","台南"],["台南市","台南"],["高雄市","高雄"],["屏東縣","屏東"],["宜蘭縣","宜蘭"],["花蓮縣","花蓮"],["臺東縣","台東"],["台東縣","台東"],["基隆市","基隆"],["澎湖縣","澎湖"],["金門縣","金門"],["連江縣","連江"]];
  return pairs.find(([a])=>a===city)?.[1]||city;
}
function normalize(r){
  const name=text(r.AttractionName||r.Name).trim();
  const lat=Number(r.PositionLat??r.Py??r.lat);
  const lng=Number(r.PositionLon??r.Px??r.lng);
  if(!name||!Number.isFinite(lat)||!Number.isFinite(lng)) return null;
  const full=[name,text(r.Description),text(r.AttractionClasses)].join(" ");
  let category="attraction",indoor=false,outdoor=true,covered=null;
  if(/公園|植物園|森林|步道|農場|牧場/.test(full)) category="park";
  if(/遊戲場|遊樂場/.test(full)) category="playground";
  if(/博物館|美術館|科學|天文|文化館|故事館|展館|教育館|探索館/.test(full)){category="museum";indoor=true;outdoor=/公園|戶外|園區/.test(full);}
  if(/動物園/.test(full)) category="zoo";
  if(/水族|海洋生物/.test(full)){category="aquarium";indoor=true;}
  if(/樂園/.test(full)) category="theme_park";
  const isFree = r.IsAccessibleForFree===true ? true : r.IsAccessibleForFree===false ? false : null;
  const city=cityName(r);
  return {
    id:"tourism-"+text(r.AttractionID||r.Id||name).replace(/\s+/g,"-"),
    slug:"",
    name,
    county:appCounty(city),
    district:null,
    address:text(r.PostalAddress||r.Address||r.Add).trim()||null,
    lat,lng,isCoordinatePrecise:true,category,indoor,outdoor,covered,
    ageTags:category==="zoo"||category==="park"||category==="playground"?["0-2","3-5","6-8","9-12"]:["3-5","6-8","9-12"],
    ageTagSource:"editorial_from_official_category",
    multiKidFriendly:true,
    isFree,priceMin:null,priceMax:null,
    energyLevel:null,parentEffort:null,durationMin:null,
    parking:/停車/.test(text(r.ParkingInfo))?"normal":"unknown",
    stroller:null,diaperStation:null,nursingRoom:null,foodNearby:null,
    officialUrl:text(r.WebsiteURL).trim()||null,
    sourceUrl:"https://data.gov.tw/dataset/7777",
    openingHours:{regular:{},closedDays:[]},
    hoursRaw:text(r.ServiceTimeInfo).trim()||null,
    feeRaw:text(r.FeeInfo).trim()||null,
    trafficRaw:text(r.TrafficInfo).trim()||null,
    imageUrl:(()=>{const imgs=allArrays(r.Images||[]).flat();for(const im of imgs){if(typeof im==="string"&&/^https?:/.test(im))return im;if(im&&typeof im==="object"){for(const v of Object.values(im)){if(typeof v==="string"&&/^https?:/.test(v))return v}}}return null})(),
    lastVerifiedAt:new Date().toISOString().slice(0,10),
    dataSource:"tourism_admin_open_data",
    temporaryClosed:false,verificationStatus:"verified",publishStatus:"published",
    sourceLabel:"交通部觀光署觀光資訊資料庫"
  };
}
async function load(){
  if(cache.records.length&&Date.now()-cache.ts<TTL) return cache.records;
  const r=await fetch(URL); if(!r.ok) throw new Error("source "+r.status);
  const buf=Buffer.from(await r.arrayBuffer());
  const zip=new AdmZip(buf); const entries=zip.getEntries().filter(e=>!e.isDirectory&&/\.json$/i.test(e.entryName));
  if(!entries.length) throw new Error("json missing");
  let obj;
  for(const e of entries){
    try{obj=JSON.parse(e.getData().toString("utf8"));break}catch{}
  }
  if(!obj) throw new Error("invalid json");
  const arrays=allArrays(obj).filter(a=>a.length&&typeof a[0]==="object");
  const arr=arrays.sort((a,b)=>b.length-a.length)[0]||[];
  cache={ts:Date.now(),records:arr};
  return arr;
}
export default async function handler(req,res){
  try{
    const county=String(req.query.county||"");
    const raw=await load();
    const inCounty=raw.filter(r=>!county||countyMatch(cityName(r),county));
    const preferred=inCounty.filter(familyFriendly);
    const remainder=inCounty.filter(r=>!familyFriendly(r));
    const rows=[...preferred,...remainder].map(normalize).filter(Boolean).slice(0,300);
    res.setHeader("Cache-Control","s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json({count:rows.length,records:rows});
  }catch(e){res.status(502).json({error:String(e.message||e),count:0,records:[]})}
}
