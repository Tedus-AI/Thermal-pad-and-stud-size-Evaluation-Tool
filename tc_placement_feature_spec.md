# Feature Spec: TC Placement (元件位置標註頁) 移植與整合

## 0. 開工前重要事實 (Verified Facts — 已由 Tedus 確認)

| 項目 | 事實 |
|------|------|
| **來源 Module 3 狀態** | ✅ **已實作完成**（直接從來源 index.html 抓現成程式碼移植，不是依規格重建） |
| **元件 ID 策略** | ✅ **不需要 stable ID**。標註直接用 `Component` 字串值綁定即可（同專案內唯一，跨專案無參照） |
| **目標 repo Modal 元件** | ✅ 已有 5 個（add-comp / lock-warning / fb-detail / fb-delete / tc-modal-overlay），但都是純 div + CSS overlay，**未統一為可複用元件**，每個有獨立 CSS prefix |
| **案名讀取路徑** | `currentProjectData.project_name`（DB 路徑：`projects.<projectId>.project_name`） |
| **案名取得函式** | `getProjectName()` 已存在於 index.html，會 fallback 到 `currentProjectId` |
| **元件刪除連動** | 透過監聽既有「刪除元件」函式，加入清掃 tcPlacement 標註的邏輯（用 `componentRef === Component字串` 比對） |

---

## 1. 目的 (Purpose)

將 [Thermal-Test-Report-Builder](https://github.com/Tedus-AI/Thermal-Test-Report-Builder) 中的「標註頁 (TC Thermocouple Placement)」功能移植到 [AI-Thermal-pad-and-stud-size-Evaluation-Tool](https://github.com/Tedus-AI/AI-Thermal-pad-and-stud-size-Evaluation-Tool)，作為 **EE/RF/PWR 專案元件清單分頁** 的延伸功能，讓電子工程師能將「已建立的元件清單」與「PCB 版圖上的實際位置」做視覺化對應標註。

> **重要差異**：原工具的標註點儲存格是「自由輸入文字」，新版改為「從該分類已建立的元件中下拉選擇」。

---

## 2. 來源與目標 (Source / Target)

| 項目 | Repo | 路徑/位置 |
|------|------|----------|
| **來源功能** | `Thermal-Test-Report-Builder` | 標註頁模組（含 SVG/Canvas 標註、拉線、儲存格邏輯） |
| **目標 Repo** | `AI-Thermal-pad-and-stud-size-Evaluation-Tool` | EE/RF/PWR 專案元件清單分頁 |
| **觸發位置** | RF / Digital / PWR 三個分類區塊 | 「新增 XXX 元件」按鈕**同一列的最右側**（如附圖紅框處） |

---

## 3. 觸發 UI (Trigger Button)

### 3.1 按鈕配置
- 每個分類（RF / Digital / PWR）**各自獨立**擁有一顆觸發按鈕。
- 按鈕**不取代**現有的「新增 XXX 元件」按鈕，而是並列於同一列、最右側。
- 三顆按鈕分別開啟「該分類專屬」的標註頁浮動視窗：
  - RF 分類 → 開啟 RF Component Location 標註頁
  - Digital 分類 → 開啟 Digital Component Location 標註頁
  - PWR 分類 → 開啟 PWR Component Location 標註頁

### 3.2 按鈕樣式
- 採用 `AI-Thermal-pad-and-stud-size-Evaluation-Tool` 既有的 **Claude 風格**（暖色調、Anthropic 配色），與該分類的主色一致：
  - RF → 紅色系
  - Digital → 藍色系
  - PWR → 橘色系
- 按鈕文字建議：「📍 元件位置標註」或「📍 Component Location」

---

## 4. 浮動標註頁面 (Floating Modal)

### 4.1 開啟方式
- 點擊觸發按鈕後，以 **Modal / Floating Panel** 形式顯示（覆蓋於主介面之上）。
- 提供關閉鈕（右上角 ✕）與背景遮罩。
- Modal 尺寸建議：寬度 90vw、高度 90vh，可調整。

#### 既有 Modal 參考
目標 repo 已有 5 個 Modal（`add-comp-modal`、`lock-warning-modal`、`fb-detail-modal`、`fb-delete-modal`、`tc-modal-overlay`），都是純 div + CSS overlay 實作。

⚠️ **注意**：每個 Modal 有獨立 CSS prefix（`.modal-*`、`.lock-modal-*`、`.fb-modal-*`、`.tc-modal-*`），尚未統一為可複用元件。

**新 tcPlacement Modal 建議：**
- 新建獨立 CSS prefix（如 `.tcp-modal-*`），不要混用既有 prefix 以免互相影響
- 但**參考既有 Modal 的開關邏輯、遮罩處理、ESC 鍵關閉**等共通行為，保持 UX 一致
- 若未來要重構為可複用 Modal 元件，這次先保持獨立、清楚標示，方便日後抽出

> 順帶一提：目標 repo 已有名為 `tc-modal-overlay` 的元件（用於「聯絡專案成員 / Teams Contact」），新功能命名請避開 `tc-modal-*` 避免衝突。建議用 `tcp-` 或 `placement-` 前綴。

### 4.2 UI 風格
- **務必**改回 `AI-Thermal-pad-and-stud-size-Evaluation-Tool` 的 **Claude 風格**，**不要**沿用來源工具的深藍科技風。
- 字體、按鈕、配色、間距等遵循目標工具現有的設計系統。

### 4.3 功能組成

#### (A) 頂部標題列（可編輯）
- 左上角顯示一個 **可編輯文字欄**。
- 預設值格式：`{案名} + {分類} Component Location`
  - 例如 RF 標註頁：`Cygnus V2 RF Component Location`
  - 例如 Digital 標註頁：`Cygnus V2 Digital Component Location`
  - 例如 PWR 標註頁：`Cygnus V2 PWR Component Location`
- 「案名」需從專案主資料中讀取（若尚未建立，預設為空字串或 `Untitled`）。
- 使用者可自由修改此標題，修改後需即時儲存。

#### (B) 主編輯區（圖片 + 標註）
移植自來源工具，但需符合下述新規則：

1. **上傳/顯示 PCB 圖片**：使用者上傳 PCB 版圖或佈局圖。
2. **點擊圖片新增標註點**：
   - 點擊圖片任一位置 → 自動在該點放置一個標註點（圓點）。
   - 自動從該點拉一條線到一個「儲存格 (label box)」。
3. **儲存格內容（與原版差異點）**：
   - **原版**：使用者自由輸入文字。
   - **新版**：儲存格為 **下拉選單 (dropdown)**，可選內容為「該分類目前已建立的元件清單」。
     - RF 標註頁的下拉選單來源 = RF 區所有 `Component` 欄位（例如 `GTRB384608FC-Final`、`B11G3338N81D-Driver` 等）。
     - Digital 標註頁的下拉選單來源 = Digital 區所有 `Component`。
     - PWR 標註頁的下拉選單來源 = PWR 區所有 `Component`。
   - 同一個元件**允許**被多次選擇（例如 PA 有 4 顆，可以拉 4 條線都指向 `GTRB384608FC-Final`）。
   - 下拉選單需即時反映元件清單的變更（新增/刪除元件後，已開啟的標註頁應同步更新可選項）。
4. **標註點/線/儲存格的操作**：
   - 可拖曳調整儲存格位置（線會自動跟隨）。
   - 可刪除單一標註（每個標註旁有 ✕ 按鈕）。
   - 可調整標註點半徑、線顏色（沿用原版設定，UI 風格改 Claude 風格）。

#### (C) 多頁管理（新增次頁功能）
移植自來源工具的「頁面列表」概念，但僅限於該分類內部：

- 左側或頂部放置「頁面列表 (Page List)」。
- 預設只有 1 頁（例如 `Page 1`）。
- 提供「**+ 新增次頁**」按鈕，可建立 `Page 2`, `Page 3`...
- 每一頁獨立擁有：
  - 自己的 PCB 圖片
  - 自己的標題（可獨立編輯）
  - 自己的標註點/線/儲存格集合
- 可刪除頁面（至少保留 1 頁）。
- 可切換頁面（點擊頁面列表項目）。

---

## 5. 資料結構 (Data Schema)

建議擴充現有專案資料結構，加入 `tcPlacement` 欄位：

```json
{
  "projectName": "Cygnus V2",
  "components": {
    "rf": [ ... ],
    "digital": [ ... ],
    "pwr": [ ... ]
  },
  "tcPlacement": {
    "rf": {
      "pages": [
        {
          "id": "page-uuid-1",
          "title": "Cygnus V2 RF Component Location",
          "imageData": "data:image/png;base64,...",  // 或圖片參考
          "annotations": [
            {
              "id": "anno-uuid-1",
              "pointX": 0.42,        // 相對座標 (0~1)
              "pointY": 0.55,
              "labelX": 0.10,
              "labelY": 0.20,
              "componentRef": "GTRB384608FC-Final"  // Component 欄位的字串值（同專案內唯一）
            }
          ]
        }
      ]
    },
    "digital": { "pages": [...] },
    "pwr": { "pages": [...] }
  }
}
```

### 重點
- **座標使用相對值 (0~1)**：避免圖片縮放/視窗 resize 後標註位置跑掉。
- **componentRef 綁定元件 stable ID**：若元件被刪除，對應的標註（包含標註點、線、儲存格）**自動同步刪除**，不殘留孤立標註。
- **儲存方式**：透過現有的 `dbAdapter.js` 與 `fileDb.js`/`SharePoint` 同步機制儲存。圖片若為大型 base64，考慮分離儲存或壓縮。

---

## 6. 邏輯細節 (Logic Details)

### 6.1 下拉選單來源即時更新
- 當使用者在主清單**新增/刪除/修改** Component 名稱時，所有對應分類的標註頁下拉選單需即時更新。
- 建議使用 reactive pattern（例如 Vue 的 computed、React 的 useMemo + props，或純 JS 的 event emitter）。

### 6.2 Component 變更與刪除處理

#### 核心觀念
標註頁的資料與元件清單**活在同一個專案 object 下**，不存在跨專案參照問題。Dropdown 開啟時直接讀「當下這個專案的元件 array」，標註的 `componentRef` 用 **Component 字串值**綁定即可，不需要 UUID 或 stable ID。

#### 資料綁定方式
```javascript
// 標註 annotation 物件
{
  pointX: 0.42,
  pointY: 0.55,
  labelX: 0.10,
  labelY: 0.20,
  componentRef: "GTRB384608FC-Final"  // 直接存 Component 欄位的字串值
}
```

#### Dropdown 選單來源
Modal 開啟時直接讀當下專案的 Array：
```javascript
function getDropdownOptions(category) {
  // category: 'rf' | 'digital' | 'pwr'
  return currentProjectData[`${category}_data`].map(comp => ({
    value: comp.Component,    // dropdown 的 value
    label: comp.Component     // dropdown 顯示文字（可加 Type 等資訊）
  }));
}
```

#### 操作行為

| 操作 | tcPlacement 反應 |
|------|-----------------|
| 新增元件 | 該分類的 dropdown 多一個選項（reactive 更新） |
| 修改元件 `Component` 名稱 | 已存在的標註 `componentRef` 不會自動跟著改；dropdown 顯示新名稱，但舊標註的字串值還是舊的。**這是合理的，因為改名稱通常代表使用者要重新指定**（可在標註處顯示「⚠ Component not found」提示讓使用者重選） |
| 修改元件其他欄位（Qty、Power） | 標註不受影響 |
| 刪除元件 | **自動掃描該分類所有分頁**，刪除所有 `componentRef === 該元件.Component` 的標註（點、線、label 一併移除） |
| 刪除元件前 | 跳出確認提示：`此元件被 N 個位置標註引用，刪除後標註將一併移除，是否繼續？` |

#### 刪除實作 snippet
```javascript
function deleteComponentWithCleanup(category, componentName) {
  // 1. 算出有多少標註會被連帶刪除
  const pages = currentProjectData.tcPlacement?.[category]?.pages || [];
  const affectedCount = pages.reduce((sum, page) =>
    sum + page.annotations.filter(a => a.componentRef === componentName).length, 0);

  if (affectedCount > 0) {
    const ok = confirm(`此元件被 ${affectedCount} 個位置標註引用，刪除後標註將一併移除，是否繼續？`);
    if (!ok) return;
  }

  // 2. 從元件清單移除
  currentProjectData[`${category}_data`] =
    currentProjectData[`${category}_data`].filter(c => c.Component !== componentName);

  // 3. 從所有 tcPlacement 分頁清掉對應標註
  pages.forEach(page => {
    page.annotations = page.annotations.filter(a => a.componentRef !== componentName);
  });

  // 4. 儲存
  saveProject();
}
```

#### 為什麼不需要 stable ID？
- **同專案內 Component 字串值就是唯一鍵**：實務上不會有兩個一樣 Component 名稱的元件（如果有，dropdown 也分不出來，所以 UI 上應禁止重名）
- **跨專案參照不存在**：標註與元件同屬一個專案，不會跨界引用
- **改名是少見情境**：料號通常穩定，真要改也是少數，讓使用者自行重新指定即可
- **避免重構成本**：保持目標 repo 既有結構不動，降低風險

### 6.3 案名同步
- **讀取路徑**：`currentProjectData.project_name`（或直接呼叫既有的 `getProjectName()` 函式，會自動 fallback 到 `currentProjectId`）
- **DB 路徑**：`projects.<projectId>.project_name`
- **預設標題組合**：`${getProjectName()} ${category.toUpperCase()} Component Location`
  - 例：`StarKcore-12L RF Component Location`
  - 例：`StarKcore-12L Digital Component Location`
- **使用者自訂處理**：若使用者已手動修改過標題，加一個 `isCustomTitle: true` 旗標，案名變更時**不要**覆蓋。
  ```javascript
  // 標題渲染邏輯
  function getDisplayTitle(page) {
    if (page.isCustomTitle) return page.title;  // 使用者已自訂，不動
    return `${getProjectName()} ${category.toUpperCase()} Component Location`;
  }
  // 使用者編輯標題時
  function onTitleEdit(page, newTitle) {
    page.title = newTitle;
    page.isCustomTitle = true;  // 鎖定不再自動同步
  }
  ```

### 6.4 圖片儲存
- 上傳的 PCB 圖片以 base64 存入 JSON，或考慮使用 IndexedDB 分離儲存大型 blob。
- 上傳前提供尺寸提示（建議 < 5MB），超過時警告或自動壓縮。

---

## 7. 移植範圍 (What to Port)

從 `Thermal-Test-Report-Builder` 標註頁模組移植：

✅ **要移植**：
- 圖片顯示與縮放
- 點擊新增標註點 + 自動拉線到儲存格的互動
- 拖曳儲存格 / 線條跟隨
- 刪除標註
- 多頁切換與新增次頁的概念
- 標註資料結構

❌ **不要移植**：
- 原工具的深藍科技風 UI（改用 Claude 風格）
- 「自由輸入文字」的儲存格（改為下拉選單）
- 原工具的「封面頁、數據頁、比對頁、結論頁」（這些不在本次需求內）
- 任何與 Thermal Test Report 簡報輸出相關的功能

---

## 8. 程式架構建議 (Implementation Suggestion)

### 8.1 檔案組織
建議在 `AI-Thermal-pad-and-stud-size-Evaluation-Tool` 內新增模組：

```
/js
  /tcPlacement
    tcPlacementModal.js        // Modal 容器與開關控制
    tcPlacementCanvas.js       // 圖片 + 標註點/線/儲存格渲染
    tcPlacementPageList.js     // 多頁管理
    tcPlacementDropdown.js     // 元件下拉選單（reactive）
    tcPlacementStore.js        // 狀態與資料持久化
/css
  tcPlacement.css              // Claude 風格樣式
```

### 8.2 與現有元件清單的整合點
- 在 `EE/RF/PWR 專案元件清單分頁` 的 render 函式中，於每個分類「新增元件」按鈕的同列右側插入觸發按鈕。
- 觸發按鈕 onClick → `tcPlacementModal.open(category)`，其中 `category` 為 `'rf' | 'digital' | 'pwr'`。
- Modal 開啟時，從 `tcPlacementStore` 讀取該 category 的 pages 資料；從現有元件清單讀取該 category 的元件名稱作為下拉選項。

### 8.3 儲存
- 透過現有的 `dbAdapter.js` 介面儲存 `tcPlacement` 欄位，與專案其他資料一同持久化。
- 不需要額外建立新的 SharePoint 欄位（直接擴充現有專案 JSON）。

---

## 9. 驗收條件 (Acceptance Criteria)

完成後請逐項驗證：

- [ ] RF / Digital / PWR 三個分類各自的「新增元件」按鈕同列右側皆有觸發按鈕，樣式符合 Claude 風格。
- [ ] 點擊任一觸發按鈕，彈出對應分類的浮動標註頁，UI 為 Claude 風格（非深藍科技風）。
- [ ] 標註頁左上角顯示可編輯標題，預設為 `{案名} + {分類} Component Location`，可被使用者修改且修改後持久化。
- [ ] 上傳 PCB 圖片後，點擊圖片任一處可新增標註點 + 拉線 + 儲存格。
- [ ] 儲存格為下拉選單，選項為「該分類目前已建立的元件清單」，且元件清單變更時下拉選單即時同步。
- [ ] 可拖曳儲存格位置、可刪除單一標註。
- [ ] 支援多頁：可新增次頁（Page 2, Page 3...）、可切換、可刪除（至少保留 1 頁）。
- [ ] 所有資料透過現有 `dbAdapter` 儲存，重新載入專案後資料完整保留。
- [ ] RF / Digital / PWR 三個分類的標註頁資料**完全獨立**，互不干擾。
- [ ] 視窗 resize 或圖片縮放後，標註點/線/儲存格位置正確（使用相對座標）。

---

## 10. 開發建議步驟 (Suggested Implementation Order)

1. **資料層**：先在 `dbAdapter`/專案 schema 加入 `tcPlacement` 欄位與讀寫邏輯。
2. **元件 ID 重構**：為現有 RF/Digital/PWR 元件加上 stable ID（若尚未有）。
3. **Modal 容器**：建立空的 Modal 與三個觸發按鈕。
4. **單頁標註核心**：實作圖片上傳、點擊新增標註、拉線、下拉選單儲存格。
5. **多頁管理**：加入頁面列表與新增/切換/刪除頁面。
6. **持久化與同步**：整合 dbAdapter，確認 SharePoint/Local JSON 兩種模式都正常。
7. **樣式打磨**：套用 Claude 風格，確認視覺一致性。
8. **回歸測試**：驗證原有元件清單功能未受影響。

---

## 11. 補充說明

- 由於目標工具為純前端（Corporate Firewall 限制），所有邏輯需在 browser 端完成，**不依賴後端 API**。
- 若使用 React/Vue/原生 JS，請沿用目標 repo 既有的技術棧（請先確認 repo 內現有架構）。
- 移植前請先 clone 來源 repo 並閱讀其標註頁的程式碼，特別注意座標計算、SVG 線條渲染、拖曳事件處理三個關鍵邏輯。
