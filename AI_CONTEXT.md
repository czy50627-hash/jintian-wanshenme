# AI_CONTEXT.md — 今天玩什麼

## Product goal
「今天玩什麼」是台灣親子出遊 Decision Engine，不是景點部落格或搜尋清單。核心任務是讓爸媽在約 30 秒內從少量條件得到 1 個首選 + 最多 2 個備選，降低決策成本。

Production: https://jintian-wanshenme-demo.vercel.app/
Repo: https://github.com/czy50627-hash/jintian-wanshenme
Branch: main. GitHub main 已連接 Vercel production，自動部署。

## 已完成
- React/Vite mobile-first frontend。
- 20 縣市選擇；沒有 GPS 仍以縣市中心呼叫 Open-Meteo。
- 年齡 0–2 / 3–5 / 6–8 / 9–12 多選。
- 玩法 auto / indoor / outdoor / free，多條件採 AND semantics。
- 同縣市推薦；禁止跨縣市 fake fallback。
- 雨天 auto mode：降雨機率 >=40% 時排除 uncovered outdoor。
- 1 primary + 最多 2 alternatives；資料不足就誠實少顯示。
- 公園為 first-class category，ranking 有 park bonus。
- multiKidFriendly、age overlap、socialPopularity（僅 soft score）參與排序。
- reroll 會排除本輪 primary + alternatives，避免立即重複。
- 今天 / 明天 / 這週末 context UI 已加入；目前尚未與正式 opening-hours engine 完整串接。
- 家庭 ages/county/prefs 存 localStorage。
- Google Maps navigation。
- Web Share API + clipboard fallback。
- 分享 URL 已帶 /r/{id}、ages、county、when；但 SPA 尚未完整 restore deep-link state。
- Result 顯示推薦理由與資料可信度聲明。
- canonical / OG / WebApplication JSON-LD / robots / sitemap / llms / site-spec 基礎已存在。
- Production 已改為 GitHub -> Vercel 自動部署。

## 資料現況
public/data/places.json 目前約 152 candidate records，跨 20 縣市。它們不是完整 verified production dataset。部分 lat/lng 是縣市中心 placeholder；不得稱為真實景點座標。Candidate 不可冒充 verified/published。

正式資料模型應區分 official facts 與 editorial tags。每筆至少需要 id,name,slug,county,district,address,lat,lng,type,indoor,outdoor,covered,ageTags,multiKidFriendly,isFree,priceMin,priceMax,energyLevel,parentEffort,durationMin,parking,stroller,diaperStation,nursingRoom,foodNearby,officialUrl,openingHours,hoursRaw,lastVerifiedAt,dataSource,sourceUrl,temporaryClosed,verificationStatus,publishStatus,socialPopularity。

公園另需 playgroundType,ageZones,slide,climbing,sandPit,swing,scooterFriendly,bikeFriendly,waterPlay,waterPlaySeason,shadeLevel,coveredPlayArea,toilet,accessibleToilet,picnicFriendly,grassArea,nightLighting。

## 不可違反
- 不捏造營業、票價、設施、座標或即時狀態。
- 不把 candidate 說成 verified。
- 不用外縣市景點湊滿三張卡。
- 不把 unknown hours 顯示為營業中。
- 未接 Directions API 前只能稱「預估車程」。
- social popularity 只能 soft score。
- 不做 50 筆搜尋結果；維持 Decision Engine。
- 不用 emoji 當主要品牌視覺。
- 不因 SEO 犧牲推薦決策體驗。

## P0 下一步
1. 擴充 1,000+ candidate POIs，其中 300–400+ 公園/共融/特色/水玩遊戲場。
2. 建 verified/published pipeline；優先官方全國 POI、地方政府 open data、營運單位官網。
3. 補真實 lat/lng/address/officialUrl/hours/price/parking/lastVerifiedAt。
4. Production recommendation pool 最終只用 verified + published。
5. 建區域/分類/年齡 post-filter density gate，不再用每縣市 3 筆當上線門檻。
6. 完成 opening-hours/closure hard filter、max drive、distance ranking。
7. 完整實作 /r/{placeId} deep-link restore、LINE share。
8. Trust layer：official source、last verified、report issue。
9. Recommendation reason 應由實際 scoring/filter evidence 產生。
10. Regression test 後 push main，等待 Vercel READY，再實際開 production 驗證。

## P1
Original illustration system；park-specific ranking；multi-child optimization；diversity；district-level location；travel-time API；20 縣市 SEO landing architecture；rainy/indoor/free/age/parks pages；TouristAttraction/CivicStructure structured data。

## P2
Event engine、收藏/去過/不要再推薦、週末提醒、feedback、affiliate、sponsored listing、merchant backend。

## North Star
不是 POI 總數，而是「一次推薦成功率」與 post-filter candidate density。例如台北 + 3–5歲 + 室內 + 免費 + 雨天，hard filter 後仍應有約 8–15 個可信候選。

## Agent workflow
先 audit repo 與 production，再依 P0→P1→P2。不要重做網站。每次修改保持 production 可用；build success 不等於功能成功。實際驗證推薦、mobile、share、navigation、fallback、data honesty。