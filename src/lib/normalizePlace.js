import { derivePricing } from "./pricing.js";

export function normalizePlace(raw){
  const regular=raw.openingHours?.regular||{};
  const pricing=derivePricing(raw);
  return {
    ...raw,
    category:raw.category||raw.type||"other",
    isCoordinatePrecise:raw.isCoordinatePrecise===true,
    isFree:pricing.isFree,
    pricing,
    amenities:{
      parking:raw.parking||raw.amenities?.parking||"unknown",
      stroller:raw.stroller===true||raw.amenities?.stroller===true,
      diaperStation:raw.diaperStation===true||raw.amenities?.diaperStation===true,
      nursingRoom:raw.nursingRoom===true||raw.amenities?.nursingRoom===true,
      foodNearby:raw.foodNearby===true||raw.amenities?.foodNearby===true
    },
    schedule:{
      closedDays:raw.openingHours?.closedDays||raw.schedule?.closedDays||[],
      regularHours:Object.keys(regular).length?regular:(raw.schedule?.regularHours||{}),
      requiresBooking:raw.requiresBooking===true||raw.schedule?.requiresBooking===true
    },
    trustLayer:{
      officialUrl:raw.officialUrl||raw.trustLayer?.officialUrl||"",
      lastVerifiedAt:raw.lastVerifiedAt||raw.trustLayer?.lastVerifiedAt||"",
      dataSource:raw.dataSource||raw.trustLayer?.dataSource||"community",
      status:raw.verificationStatus||raw.trustLayer?.status||"candidate"
    },
    verificationStatus:raw.verificationStatus||"candidate",
    publishStatus:raw.publishStatus||"unpublished"
  };
}
