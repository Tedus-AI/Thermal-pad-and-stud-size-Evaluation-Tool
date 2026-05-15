# Source Code Reading Guide: Thermal-Test-Report-Builder 標註頁移植

> 本文件指引 Claude Code 在動工前，先有系統地閱讀來源 repo 的標註頁實作，避免盲目重寫或漏掉關鍵邏輯。
> **本版已驗證來源 repo 為 public，並已抽取 SPEC.md 中 Module 3 的精確規格。**

**來源 Repo**：[Thermal-Test-Report-Builder](https://github.com/Tedus-AI/Thermal-Test-Report-Builder)（Public）
**目標 Repo**：[AI-Thermal-pad-and-stud-size-Evaluation-Tool](https://github.com/Tedus-AI/AI-Thermal-pad-and-stud-size-Evaluation-Tool)

---

## 0. 來源 repo 架構速覽 (Quick Architecture Overview)

**重要：來源工具是純單檔架構，所有 UI 與邏輯都在 `index.html` 一個檔案內（7540 行、303KB），不是模組化專案。**

### 0.1 檔案清單

| 檔案 | 用途 |
|------|------|
| `index.html` | **所有 UI + JS 邏輯在這裡**（96.3% HTML, 3.7% JS） |
| `config.js` | DB_MODE 切換（Firebase / Local JSON） |
| `dbAdapter.js` | 統一資料存取介面 |
| `fileDb.js` | File System Access API + IndexedDB 本地儲存 |
| `SPEC.md` | 完整功能規格（902 行，必讀） |
| `DESIGN_SPEC.md` | 設計規格 |
| `CLAUDE.md` | Claude Code 工作上下文 |
| `CLAUDE_CODE_SESSIONS.md` | session 紀錄 |

### 0.2 引入的外部資源
```html
<script src="fileDb.js"></script>
<script src="dbAdapter.js"></script>
<!-- Google Fonts: Space Grotesk + DM Sans + JetBrains Mono -->
<script src="sortablejs@1.15.6"></script>      <!-- 頁面拖曳排序 -->
<script src="html2canvas@1.4.1"></script>       <!-- PDF 截圖 -->
<script src="jspdf@2.5.2"></script>             <!-- PDF 生成 -->
```

### 0.3 目前 UI 風格實況
> SPEC.md 寫的是「Liquid Glass UI」（iOS 26 風格），但 **index.html 實際實作的是「Delta Blue Futuristic」深藍科技風**（CSS variable 前綴 `--d-900` 到 `--d-50`，含 angle-cut clip-path 按鈕、blueprint grid 背景）。以圖 1（你貼的截圖）為準，採用後者。

---

## 1. 標註頁在來源中的對應名稱 (Where to Find It)

來源 SPEC.md 第 3 節將標註頁定義為 **Module 3：量測點標註頁（Monitor Point Annotation）**。

### 在 `index.html` 中搜尋以下關鍵字定位程式碼：

```
type: "annotation"     ← Firestore 資料結構的頁面型別
markers              ← 標註點陣列名稱
Monitor Point Annotation
量測點標註
TC Thermocouple Placement
addMarker
renderAnnotation
```

### 預期會找到：
- HTML template（一個顯示 PCB 照片 + SVG overlay 的 wrapper）
- JS 函式群（addMarker、renderMarkers、handleClick on image、drag handlers）
- CSS class（`.annotation-page`、`.marker-dot`、`.marker-label`、`.marker-line` 之類命名）

---

## 2. 來源資料結構（已從 SPEC.md 抽出）

**這是來源工具的精確 schema，直接拿來作為移植參考：**

```json
{
  "type": "annotation",
  "data": {
    "title": "TC Thermocouple Placement",
    "photo_url": "...",                // 照片 URL 或 base64
    "markers": [
      {
        "id": 1,                       // 自動遞增的編號（顯示於圓點內）
        "x": 0.42,                     // 標記點在照片內的座標（百分比 0~1）
        "y": 0.55,
        "label": "TC1 - PA_GaN_U1",    // 標籤文字（原版自由輸入，新版改下拉）
        "label_x": 0.10,               // 標籤框位置（百分比 0~1）
        "label_y": 0.20,
        "component_type": "PA"         // 選填：PA/FPGA/DDR/DC-DC/Connector
      }
    ]
  }
}
```

### 關鍵發現
- ✅ **座標已使用百分比 (0~1)**：不需要做絕對 pixel 轉換，直接移植即可。
- ✅ **每個 marker 有自動遞增 id**：但 id 是顯示用編號（1, 2, 3...），不是 stable component reference。
- ⚠️ **`label` 是自由文字**：新版要改成 dropdown，且綁定元件的 stable ID。
- ⚠️ **`component_type` 是手動選的 tag**：新版不需要這個欄位（因為元件分類由「在哪個分類按鈕開啟的標註頁」決定）。

---

## 3. 來源互動流程（已從 SPEC.md 抽出）

```
Step 1  上傳 / 貼上 PCB 或設備照片（拖拉 / 選檔 / Ctrl+V 貼上）
Step 2  點擊照片上任意位置 → 產生 [●] 標記點 + 自動編號
Step 3  從標記點拖曳 → 引線延伸至照片四周空白區
Step 4  放開滑鼠 → 產生可鍵入標籤框
Step 5  鍵入元件名稱（原版格式建議：TC1 - PA_GaN_U1）
Step 6  可移動標籤框位置 / 刪除標記點 / 刪除標籤框
```

### 元件規格細節（SPEC.md 原文）

| 規格項目 | 來源實作 | 移植時是否保留 |
|---------|---------|---------------|
| 照片插入 | 拖拉 / 選檔 / 貼上（Ctrl+V） | ✅ 全部保留 |
| 標記點樣式 | 紅色實心圓點 + 白色數字編號 | ✅ 保留，但配色改 Claude 風 |
| 自動編號 | 1, 2, 3... 自動遞增 | ✅ 保留 |
| 引線 | SVG 折線，不可被截斷 | ✅ 保留（SVG 是關鍵技術） |
| 標籤框 | 白底黑框，可自由移動，點擊可編輯 | ⚠️ 改為「下拉選單」而非文字輸入 |
| 標籤內容 | 自由文字 `TC# - 元件名稱` | ❌ 改為下拉選元件 |
| 元件類型 Tag | 選填，PA/FPGA/DDR/DC-DC/Connector | ❌ 移除（分類由按鈕決定） |
| 刪除操作 | 右鍵標記點 → 刪除（連同引線與標籤框） | ✅ 保留 |
| 匯出 | 合併為單一圖層 | ❌ 不移植（新版不輸出 PDF） |

---

## 4. 必讀的六個核心 JS 邏輯 (Six Core Logic to Read)

進入 `index.html` 後，**重點閱讀以下六段 JS**：

### 4.1 圖片載入
搜尋：`photo_url`、`FileReader`、`paste` event handler。

來源支援三種上傳方式：拖拉 / 選檔 / Ctrl+V 貼上。**Ctrl+V 貼上**是常被忽略但實用的功能，建議移植。

### 4.2 點擊新增標記點
搜尋：`addMarker`、image 的 `click` event。

關鍵邏輯（預期長相）：
```javascript
function handleImageClick(event) {
    const rect = imageElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;  // 轉成 0~1
    const y = (event.clientY - rect.top) / rect.height;
    markers.push({ id: nextId++, x, y, label: '', label_x: ..., label_y: ... });
    renderMarkers();
}
```

### 4.3 SVG 引線渲染
搜尋：`<line`、`<polyline`、`<path`、`svg` 相關 DOM 操作。

SPEC.md 明確指定使用 **SVG 折線**，所以一定有 `<line>` 或 `<polyline>` element。重點看：
- 線條兩端如何綁定座標（marker 中心點 → label 框邊緣）
- 拖曳 label 時線條如何即時更新

### 4.4 標籤框拖曳
搜尋：`mousedown`、`mousemove`、`mouseup`、`drag`。

注意拖曳時：
- 是否計算「label 邊框中心」還是「label 左上角」作為線條終點
- 是否處理拖出照片範圍的邊界條件

### 4.5 多頁管理
搜尋：`page-list`、`addPage`、`Sortable`。

來源頁面是**陣列結構**（`pages: [{ type, order, data }]`），使用 SortableJS 拖曳排序。**新版要把這個邏輯範圍縮到「單一分類內」**：
- RF / Digital / PWR 各自有獨立的 pages 陣列
- 不需要不同頁面類型（cover/image/data/...），只有一種類型：annotation

### 4.6 資料持久化
搜尋：`dbAdapter`、`saveDoc`、`updatePage`、`debounce`。

關鍵：
- 自動儲存使用 debounce 1000ms（這是 SPEC 規定的）
- 透過 `dbAdapter.js` 統一介面（不直接呼叫 Firebase）

---

## 5. 來源 vs 目標的差異對照表 (Diff to Implement)

| 項目 | 來源 (Thermal-Test-Report-Builder) | 目標 (AI-Thermal-pad-and-stud-size-Evaluation-Tool) |
|------|-----------------------------------|----------------------------------------------------|
| **檔案架構** | 單檔 index.html（7540 行） | 沿用目標 repo 既有架構（建議切分模組） |
| **UI 風格** | Delta Blue Futuristic（深藍科技風） | Claude 風格（暖色、Anthropic 配色） |
| **頁面類型** | 6 種（cover/image/annotation/data/sim_vs_meas/conclusion） | 只有 1 種：annotation |
| **頁面範圍** | 全工具共享 pages 陣列 | 三個分類**各自獨立** pages 陣列 |
| **觸發方式** | 左側頁面列表「+ 新增頁面 ▾ → 標註頁」 | RF/Digital/PWR 三個按鈕分別開啟 Modal |
| **儲存格內容** | `<input type="text">` 自由輸入 | `<select>` 下拉選元件 |
| **標籤綁定** | 字串值 `"TC1 - PA_GaN_U1"` | 元件 stable ID（component UUID） |
| **元件刪除** | 與外部資料無關聯 | **自動刪除**所有引用該元件 ID 的標註 |
| **標題列** | 固定「TC Thermocouple Placement」 | 可編輯，預設 `{案名} + {分類} Component Location` |
| **元件編號** | 自動 1, 2, 3...（顯示於圓點） | 保留自動編號（顯示用） |
| **component_type tag** | 選填 PA/FPGA/DDR/... | 移除（由按鈕分類決定） |
| **圖片儲存** | <500KB 存 Firestore，否則 Storage | 走目標 repo 既有 dbAdapter（SharePoint / Local JSON） |
| **匯出 PDF** | 有（html2canvas + jsPDF） | **不需要**（新版不輸出報告） |

---

## 6. 不要移植的部分 (What NOT to Port)

來源 repo 有大量功能與標註頁耦合，**移植時請切斷**：

- ❌ **PDF 匯出**（html2canvas + jsPDF）：新版不輸出報告
- ❌ **PPTX 匯出**（PptxGenJS）：新版不輸出簡報
- ❌ **預覽模式 Slide Show**：新版只是內嵌 Modal
- ❌ **頁面型別切換**（cover / image / data / sim_vs_meas / conclusion）：新版只有 annotation 一種
- ❌ **Module 4b 數據表的 TC 量測值綁定**：原版 TC 編號可能與量測數據連動，新版只是位置標註
- ❌ **報告書首頁列表**：新版功能屬於既有專案，不需要獨立列表
- ❌ **Sortable 頁面排序**：新版次頁切換可不需拖曳（簡化即可）
- ❌ **Delta Blue 深藍科技風樣式**：用 Claude 風格

---

## 7. 動工建議流程 (Implementation Workflow)

### Step 1：建立 feature branch
```bash
cd AI-Thermal-pad-and-stud-size-Evaluation-Tool
git checkout -b feature/tc-placement
```

### Step 2：閱讀目標 repo 現況
- 確認目標 repo 既有的：
  - Modal/Dialog 元件實作模式（參考 add-comp-modal 的開關邏輯，但**用獨立 CSS prefix**）
  - CSS 變數（Claude 風格的色彩 token）
  - dbAdapter.js 介面（讀寫專案資料的方法）
  - `getProjectName()` 函式位置（取案名用，已存在）
  - **既有的「刪除元件」函式位置**（之後要在這裡掛上「清掃 tcPlacement 標註」的邏輯）

### Step 3：閱讀來源 repo 的 Module 3 程式碼
- 開啟 `Thermal-Test-Report-Builder/index.html`
- 搜尋 `type: "annotation"` 與 `markers` 找到所有相關邏輯
- 摘錄以下函式（這是核心）：
  - 渲染 annotation 頁的 HTML template
  - 點擊圖片新增 marker 的 handler
  - SVG 線條繪製函式
  - 拖曳 label 的事件群
  - 刪除 marker 的函式

### Step 4：在目標 repo 重構為模組
建議新增以下檔案：
```
/js/tcPlacement/
  tcPlacementModal.js         // Modal 容器與開關
  tcPlacementCanvas.js        // 圖片 + SVG overlay
  tcPlacementMarker.js        // 標記點 + 線 + label 渲染
  tcPlacementDropdown.js      // 下拉選單元件（reactive）
  tcPlacementPages.js         // 多頁管理
  tcPlacementStore.js         // 狀態與 dbAdapter 整合
/css/
  tcPlacement.css             // Claude 風格樣式
```

### Step 5：MVP 最小可行原型
按以下順序逐步驗證：

1. **觸發按鈕 + Modal 開關**（先只做 RF 一顆）
2. **圖片上傳**（拖拉、選檔、Ctrl+V 三種至少做兩種）
3. **點擊新增 marker + SVG 渲染**（先用 hardcoded 字串作為 label）
4. **拖曳 label**（含線條跟隨）
5. **刪除 marker**（右鍵或 ✕ 按鈕）

完成後讓 Tedus 驗證互動是否正確，再進下一步。

### Step 6：接通元件清單下拉選單
- label 框改用 `<select>`
- options 從 RF 元件清單動態產生（用 component ID 作 value，name 作顯示）
- 元件清單變更時 dropdown 即時更新（observer pattern）

### Step 7：加入元件刪除連動
- 在主元件清單的「刪除元件」操作中，加入清掃所有 tcPlacement 標註的邏輯
- 跳出確認提示「此元件被 N 個位置標註引用，刪除後標註將一併移除」

### Step 8：複製給 Digital 與 PWR
- 確認 RF 完整運作後，複製按鈕與資料路徑
- **資料嚴格分離**：tcPlacement.rf / tcPlacement.digital / tcPlacement.pwr

### Step 9：多頁管理
- 加入「+ 新增次頁」、頁面切換、刪除頁面
- 至少保留 1 頁的邊界處理

### Step 10：可編輯標題
- 預設 `{案名} + {分類} Component Location`
- 使用者修改後設 `isCustomTitle = true`，案名變更時不覆蓋

### Step 11：持久化與美化
- 接 dbAdapter，驗證 SharePoint 與 Local JSON 兩模式
- 套 Claude 風格 CSS
- 加 debounce 1000ms 自動儲存

### Step 12：回歸測試
- 跑一輪原有元件清單功能，確認沒被影響
- 驗收條件逐項勾選

---

## 8. 容易踩雷的地方 (Common Pitfalls)

### 8.1 ✅ 座標已是相對值，但仍要小心
來源已用 0~1 百分比，但渲染時要乘以**當下圖片實際顯示尺寸**（非自然尺寸）。視窗 resize 後要重新渲染。

### 8.2 圖片載入時序
開啟 Modal 後標註點先出現、圖片後出現，造成位置錯亂。
→ 等 `<img>.onload` 觸發後再渲染 SVG overlay。

### 8.3 下拉選單不同步
新增元件後，已開啟的標註頁下拉選單沒更新。
→ 用 observer / event emitter，或框架的 reactivity。

### 8.4 拖曳事件衝突
在 label 上拖曳時，誤觸發圖片點擊新增標註。
→ label 的 `mousedown` 要 `stopPropagation()`，且在 mousedown 設 dragging flag，圖片 click 要檢查 flag。

### 8.5 Modal 與背景捲動
Modal 開啟後背景仍可捲動。
→ 開啟時 `body.style.overflow = 'hidden'`，關閉時還原。

### 8.6 圖片 base64 太大塞爆 JSON
PCB 圖 10MB → base64 後 13MB → 整個專案 JSON 卡頓。
→ 上傳前用 canvas 壓縮（長邊 2000px、JPEG quality 0.85）。

### 8.7 三分類資料污染
RF 標註出現在 Digital 標註頁。
→ 資料結構嚴格分離 `tcPlacement: { rf: {...}, digital: {...}, pwr: {...} }`，所有函式都帶 `category` 參數。

### 8.8 同名元件導致 dropdown 識別不出
若使用者在同一專案內新增兩個 Component 名稱完全相同的元件，dropdown 會出現兩個一模一樣的選項，無法區分。
→ 新增元件 UI 應檢查同名禁止；或在 dropdown 顯示時加上 Type 或 index 作區別（如 `GTRB384608FC-Final (#1)`、`GTRB384608FC-Final (#2)`）。
→ 實務上料號通常不會重複，此情境出現機率低，但 UI 層加個保護仍是好習慣。

### 8.9 SVG 線條與 marker 的 z-index
marker 應在線條之上，否則圓點被線蓋住。
→ SVG render 順序：line first, dot last。

### 8.10 自動編號的 nextId 持久化
原版 marker.id 是顯示用數字（1, 2, 3...），自動遞增。
→ 持久化時要存 `nextId` 計數器，避免刪除中間 marker 後新增重複 id。
→ 或改用：取 max(現有 ids) + 1。

---

## 9. 給 Claude Code 的提示語建議 (Prompt Template)

貼給 Claude Code 時，可以這樣下指令：

```
請依照以下兩份文件實作 TC Placement 功能：
1. tc_placement_feature_spec.md（功能規格）
2. source_code_reading_guide.md（來源 repo 閱讀指南）

關鍵事實（已驗證）：
- 來源 repo Module 3 已實作完成，可直接抓現成程式碼移植
- 不需要重構元件 schema，標註直接用 Component 字串值綁定即可
- 目標 repo 已有 5 個 Modal 但未統一，新功能請用獨立 CSS prefix（建議 tcp-，避開既有的 tc- 前綴）
- 案名讀取請呼叫既有的 getProjectName() 函式
- 刪除元件連動：在既有「刪除元件」函式中掛勾，掃描 tcPlacement 各分頁找 componentRef 相符的標註刪除

請按以下順序：
1. 取得來源 repo Thermal-Test-Report-Builder 的 index.html
2. 搜尋 type: "annotation" 與 markers 相關段落，摘錄出 §4 列出的六個核心 JS 邏輯
3. 摘錄完成後，先列給我看你抓到的程式碼片段，等我確認後再開始實作
4. 實作時嚴格按 §7 動工建議流程逐步推進
5. 每完成一個 Step，先讓我驗證再進下一步
6. 注意 §8 容易踩雷的地方
```

---

## 10. 補充：來源關鍵程式碼定位地圖 (Code Location Map)

由於 index.html 有 7540 行，提供以下定位地圖加速搜尋：

| 想找什麼 | 搜尋關鍵字 | 預期位置 |
|---------|----------|---------|
| 標註頁 HTML template | `annotation` 或 `量測點標註` | template/render 區段 |
| 標記點 CSS | `.marker`、`marker-dot` | `<style>` 內 |
| SVG 線條樣式 | `marker-line`、`<line` | `<style>` + JS render |
| 點擊新增 marker | `addMarker` 或 `markers.push` | JS 函式區 |
| 拖曳 label | `mousedown` + `marker-label` | JS event handlers |
| 多頁管理 | `pages.push`、`Sortable.create` | JS state management |
| dbAdapter 呼叫 | `dbAdapter.` | 整份檔案散落 |
| 自動儲存 debounce | `debounce(` 或 `setTimeout` | JS 工具函式區 |

---

## 11. 已驗證事實（Tedus 已確認）

✅ **Module 3 已實作完成**：來源 index.html 內已有完整的 Module 3 程式碼可直接抓來移植，不需依規格自建。

✅ **目標 repo 環境摘要：**

| 項目 | 事實 |
|------|------|
| 元件 ID 策略 | ✅ **不需要 stable ID**，標註直接用 `Component` 字串值綁定（同專案內唯一） |
| Modal 元件 | ✅ 已有 5 個獨立 Modal（add-comp、lock-warning、fb-detail、fb-delete、tc-modal-overlay），未統一為可複用元件 |
| 案名讀取路徑 | `currentProjectData.project_name` 或呼叫既有 `getProjectName()` 函式 |
| DB 路徑 | `projects.<projectId>.project_name` |

### 這對實作有什麼影響？

1. **不需要重構元件 schema**：保持目標 repo 既有結構不動，tcPlacement annotation 直接存 `componentRef: "Component字串值"`。
2. **新 Modal 不要用 `tc-modal-*` CSS prefix**：避免與既有的「聯絡專案成員 Modal」（tc-modal-overlay）衝突。建議用 `tcp-` 或 `placement-` 前綴。
3. **標題預設值用既有的 `getProjectName()` 函式**：不要重新寫一個讀取邏輯。
4. **元件刪除連動實作**：在既有的「刪除元件」函式中加掛邏輯：用 `componentRef === Component字串` 比對，找出所有對應 tcPlacement 分頁的標註並一併刪除。
