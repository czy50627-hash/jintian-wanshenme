export function haversineKm(a,b){
  const R=6371, toRad=v=>v*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

export function estimateDriveMinutes(origin, place){
  if(!origin || place.isCoordinatePrecise!==true) return null;
  const km=haversineKm(origin,{lat:place.lat,lng:place.lng});
  return Math.max(8,Math.round(km*2.2));
}

function dayForWhen(when){
  const d=new Date();
  if(when==="tomorrow") d.setDate(d.getDate()+1);
  if(when==="weekend"){
    const add=(6-d.getDay()+7)%7;
    d.setDate(d.getDate()+add);
  }
  return d;
}

function isClosedByKnownSchedule(place,when){
  const d=dayForWhen(when);
  const closed=place.schedule?.closedDays||[];
  return closed.includes(d.getDay());
}

function matchesPlayStyles(place,styles){
  if(!styles || styles.length===0 || styles.includes("auto")) return true;
  if(styles.includes("indoor") && !place.indoor) return false;
  if(styles.includes("outdoor") && !place.outdoor) return false;
  if(styles.includes("free") && !place.isFree) return false;
  return true;
}

export function evaluateRecommendations(pool,prefs){
  const survivors=pool.filter(place=>{
    if(place.verificationStatus!=="verified" || place.publishStatus!=="published") return false;
    if(place.temporaryClosed===true) return false;
    if(place.isCoordinatePrecise!==true) return false;
    if(place.county!==prefs.selectedCounty) return false;
    if(prefs.excludedPlaceIds.includes(place.id)) return false;
    if(isClosedByKnownSchedule(place,prefs.when)) return false;
    if(prefs.when==="now" && place.schedule?.requiresBooking===true) return false;
    if(!matchesPlayStyles(place,prefs.playStyles)) return false;
    if(prefs.currentRainProb>=60 && ["now","afternoon"].includes(prefs.when) && place.outdoor && !place.covered && !place.indoor) return false;
    if(!place.ageTags?.some(tag=>prefs.ages.includes(tag))) return false;
    const drive=estimateDriveMinutes(prefs.userCoords,place);
    if(drive!==null && drive>prefs.maxDriveMinutes) return false;
    return true;
  });

  if(!survivors.length){
    return {hero:null,alternatives:[],fallbackNote:`目前在 ${prefs.selectedCounty} 沒有通過正式驗證且符合條件的景點。請放寬條件，或等待該區資料完成驗證。`};
  }

  const scored=survivors.map(place=>{
    let score=0;
    const ageMatch=place.ageTags.filter(t=>prefs.ages.includes(t)).length;
    const ageRatio=ageMatch/Math.max(1,prefs.ages.length);
    score+=ageRatio*24;
    if(prefs.ages.length>1 && place.multiKidFriendly) score+=6;

    const drive=estimateDriveMinutes(prefs.userCoords,place);
    if(drive===null) score+=5;
    else score+=Math.max(0,(prefs.maxDriveMinutes-drive)/prefs.maxDriveMinutes)*18;

    if(prefs.currentRainProb<30 && place.outdoor) score+=16;
    else if(prefs.currentRainProb>=40 && place.indoor) score+=16;
    else score+=8;

    if(place.amenities?.stroller) score+=4;
    if(place.amenities?.parking==="easy") score+=4;
    if(place.amenities?.diaperStation || place.amenities?.nursingRoom) score+=6;

    if(place.category==="park") score+=2;
    const pg=place.playground||{};
    const equipment=[pg.officialEquipmentText,pg.playgroundType].filter(Boolean).join(" ");
    if(equipment && !/unknown|未知/i.test(equipment)) score+=10;
    if(/共融/.test(equipment)) score+=8;
    if(/攀爬|攀網|滑索|高塔|溜滑梯|鞦韆|沙坑/.test(equipment)) score+=6;
    if(place.covered||pg.coveredPlayArea===true) score+=4;
    if(pg.toilet===true) score+=3;
    if(pg.shadeLevel==="high") score+=3;
    if(place.socialPopularity) score+=Math.min(8,place.socialPopularity/15);
    return {...place,_score:score,_driveMinutes:drive};
  }).sort((a,b)=>b._score-a._score);

  const hero=scored[0];
  const alternatives=[];
  const usedTypes=new Set([hero.category]);
  for(const candidate of scored.slice(1)){
    if(alternatives.length>=2) break;
    if(usedTypes.has(candidate.category) && scored.length-alternatives.length>3) continue;
    alternatives.push(candidate);
    usedTypes.add(candidate.category);
  }
  if(alternatives.length<2){
    for(const candidate of scored.slice(1)){
      if(alternatives.length>=2) break;
      if(!alternatives.some(x=>x.id===candidate.id)) alternatives.push(candidate);
    }
  }
  return {hero,alternatives,fallbackNote:alternatives.length<2?"符合條件的安全備選不足，系統不會跨縣市或放寬硬條件湊滿卡片。":undefined};
}

export function evaluateCandidatePreview(pool,prefs){
  const c=pool.filter(place=>
    place.county===prefs.selectedCounty &&
    !prefs.excludedPlaceIds.includes(place.id) &&
    place.ageTags?.some(tag=>prefs.ages.includes(tag)) &&
    matchesPlayStyles(place,prefs.playStyles) &&
    !(prefs.currentRainProb>=60 && ["now","afternoon"].includes(prefs.when) && place.outdoor && !place.covered && !place.indoor)
  ).map(place=>({...place,_score:(place.socialPopularity||0)+((place.category==="park")?8:0)}))
   .sort((a,b)=>b._score-a._score);
  return {hero:c[0]||null,alternatives:c.slice(1,3)};
}
