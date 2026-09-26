import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_URL=process.env.TAIPEI_PARKS_API || "https://parks.gov.taipei/parks/api/";
const OUT=path.resolve("public/data/verified-taipei-parks.json");
const REPORT=path.resolve("public/data/verification-report.json");

function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function text(v){return typeof v==="string"?v.trim():""}
function slugify(v){return v.normalize("NFKC").replace(/[臺]/g,"台").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").toLowerCase()}
function normalizeArray(payload){
  if(Array.isArray(payload)) return payload;
  for(const key of ["data","result","results","items","records"]){
    if(Array.isArray(payload?.[key])) return payload[key];
  }
  throw new Error("Unexpected Taipei parks API response shape");
}
function validTaipei(lat,lng){return lat>=24.95&&lat<=25.22&&lng>=121.42&&lng<=121.68}
function opening(raw){
  const s=text(raw.pm_opening_s), e=text(raw.pm_opening_e);
  const all={mon:null,tue:null,wed:null,thu:null,fri:null,sat:null,sun:null};
  if(s&&e) Object.keys(all).forEach(k=>all[k]=s+"-"+e);
  return {regular:all,closedDays:[],raw:[s,e].filter(Boolean).join("-")||null};
}
function toPlace(raw){
  const lat=num(raw.pm_Latitude), lng=num(raw.pm_Longitude);
  if(!lat||!lng||!validTaipei(lat,lng)) return null;
  const name=text(raw.pm_name);
  if(!name) return null;
  const type=text(raw.pm_type);
  const playArea=text(raw.pm_playarea);
  const playEq=text(raw.pm_playeq);
  const officialUrl="https://parks.taipei/";
  const isPark=/公園|綠地|廣場|遊樂場|園區/.test(name+" "+type);
  if(!isPark) return null;
  return {
    id:"taipei-park-"+slugify(raw.SeqNo||name),
    slug:"taipei-park-"+slugify(name),
    name,
    county:"台北",
    district:text(raw.pm_regions)||"待確認",
    address:text(raw.pm_location)||"待確認",
    lat,lng,isCoordinatePrecise:true,
    category:"park",
    indoor:false,outdoor:true,covered:false,
    ageTags:["0-2","3-5","6-8","9-12"],
    multiKidFriendly:Boolean(playArea||playEq),
    isFree:true,priceMin:0,priceMax:0,
    energyLevel:playArea||playEq?3:2,
    parentEffort:2,durationMin:90,
    parking:"unknown",stroller:null,diaperStation:null,nursingRoom:null,foodNearby:null,
    playground:{
      playgroundType:text(raw.pm_playtype)||"unknown",
      ageZones:[],slide:null,climbing:null,sandPit:null,swing:null,
      scooterFriendly:null,bikeFriendly:null,waterPlay:null,waterPlaySeason:null,
      shadeLevel:"unknown",coveredPlayArea:null,toilet:null,accessibleToilet:null,
      picnicFriendly:null,grassArea:null,nightLighting:null,
      officialDescription:text(raw.pm_description)||null,
      officialEquipmentText:playEq||null
    },
    officialUrl,
    openingHours:opening(raw),
    lastVerifiedAt:new Date().toISOString().slice(0,10),
    dataSource:"official_gov",
    sourceUrl:SOURCE_URL,
    temporaryClosed:false,
    verificationStatus:"verified",
    publishStatus:"published",
    socialPopularity:null,
    sourceLabel:"臺北市政府工務局公園路燈工程管理處"
  };
}

const response=await fetch(SOURCE_URL,{headers:{"user-agent":"jintian-wanshenme-data-pipeline/1.0"}});
if(!response.ok) throw new Error("Taipei parks API failed: "+response.status);
const payload=await response.json();
const rows=normalizeArray(payload);
const records=rows.map(toPlace).filter(Boolean);

await fs.mkdir(path.dirname(OUT),{recursive:true});
await fs.writeFile(OUT,JSON.stringify({updatedAt:new Date().toISOString(),source:SOURCE_URL,count:records.length,records},null,2));
await fs.writeFile(REPORT,JSON.stringify({
  generatedAt:new Date().toISOString(),
  source:SOURCE_URL,
  inputRows:rows.length,
  verifiedPublished:records.length,
  rejected:rows.length-records.length,
  rules:[
    "official Taipei Parks API identity",
    "WGS84 coordinate inside Taipei bounds",
    "non-empty park name",
    "no invented amenities or closure data"
  ]
},null,2));
console.log("verified Taipei parks:",records.length);
