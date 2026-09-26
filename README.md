# 今天玩什麼

全台親子出遊決策工具。產品目標不是提供更多景點，而是讓爸媽在 30 秒內得到「1 個首選 + 2 個備選」。

## Production 原則
- 玩法複選採 AND。
- 公園是一級推薦類型，與博物館、農場、觀光工廠、室內樂園並列。
- 社群熱門度只作 Soft Score，不可繞過 Hard Filter。
- 未驗證資料不可假裝即時。
- 資料不足時寧可少給，也不跨半個台灣補卡。
- 只有 `verificationStatus=verified` 且 `publishStatus=published` 才能進 Production 首選池。

目前 repo 內先放全台候選資料與 Production Schema；後續以官方資料逐筆驗證後升級 published。
