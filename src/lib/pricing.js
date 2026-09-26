export function derivePricing(raw){
  if(raw.isFree===true || raw.pricing?.isFree===true){
    return {isFree:true,minPrice:0,maxPrice:0,kind:"free",label:"免費入場"};
  }

  const sourceMin=Number.isFinite(raw.priceMin)
    ? raw.priceMin
    : Number.isFinite(raw.pricing?.minPrice) ? raw.pricing.minPrice : null;
  const sourceMax=Number.isFinite(raw.priceMax)
    ? raw.priceMax
    : Number.isFinite(raw.pricing?.maxPrice) ? raw.pricing.maxPrice : null;

  if(sourceMin!==null || sourceMax!==null){
    const min=sourceMin??sourceMax;
    const max=sourceMax??sourceMin;
    return {
      isFree:false,
      minPrice:min,
      maxPrice:max,
      kind:"source_estimate",
      label:min===max ? `約 NT$ ${min}` : `約 NT$ ${min}–${max}`,
      disclaimer:"實際票價依年齡、票種與官方公告為準"
    };
  }

  return {
    isFree:false,
    minPrice:null,
    maxPrice:null,
    kind:"unknown",
    label:"票價待確認",
    disclaimer:"尚未取得可靠官方票價資料"
  };
}

export function priceLabel(place){
  return place.pricing?.label || derivePricing(place).label;
}
