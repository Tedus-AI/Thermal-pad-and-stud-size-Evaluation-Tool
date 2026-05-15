# SPEC: Teams Quick Contact 功能

## 1. 專案背景

### 1.1 既有專案資訊
- **Repo 名稱**：`AI-Thermal-pad-and-stud-size-Evaluation-Tool`
- **部署**：GitHub Pages（純前端應用）
- **後端**：Azure AD + SharePoint（透過 Microsoft Graph API）
- **認證**：MSAL.js（已實作，App 開啟後自動登入）
- **資料庫架構**:
  - `config.js`：含 `DB_MODE` 切換（local / sharepoint）
  - `fileDb.js`：本地 JSON via File System Access API
  - `dbAdapter.js`：統一路由介面
  - SharePoint 模式使用 pessimistic locking

### 1.2 本次新增功能目標
在 App 右側既有浮動工具列下方，新增一個 **Teams Quick Contact 浮動按鈕**。
使用者填完資料後，點該按鈕 → 彈出 Modal 顯示**該專案**的相關同事（依 Function 分類為 TH/ME、EE、RF 三個 Tab）→ 點同事 → 開啟 Teams 預填訊息（含當前頁面 URL 作為附件連結）→ 使用者按送出。

### 1.3 為什麼這樣設計
- **解決痛點**：公司同事很多，但每個 RRU 專案實際合作人員只有一小部分。不希望使用者每次都從全公司目錄挑人。
- **資料來源**：在 SharePoint `Thermal-Spec-DB` 站台新增 `Project_Members` 清單，由 PM 維護該專案的成員名冊。
- **沿用既有架構**：Reuse 現有的 Azure AD App、MSAL token、SharePoint Graph API pipeline，零額外認證成本。

---

## 2. SharePoint 資料來源規格

### 2.1 站台資訊
- **SharePoint 站台名稱**：`Thermal-Spec-DB`

> ⚠️ **重要**：SharePoint 站台 URL、Azure AD Tenant ID、Client ID **已存在於本專案的既有程式碼中**（因為元件資料庫的讀寫功能已使用這些認證）。
>
> **請 Claude Code 先掃描 repo 找出這些資訊的存放位置**（可能在 `config.js`、`authConfig.js`、`msalConfig.js` 或類似檔案），然後**重用既有的常數/變數**，**絕對不要新增重複的設定**。
>
> 預期會找到的常數名稱（實際以 repo 為準）：
> - `tenantId` / `TENANT_ID`
> - `clientId` / `CLIENT_ID`
> - `sharepointSiteUrl` / `SITE_URL` 或類似命名
> - 既有的 MSAL instance（很可能名為 `msalInstance` 或 `pca`）

### 2.2 List 名稱
`Project_Members`

### 2.3 List 欄位 Schema

| 欄位顯示名稱 | 內部名稱（Graph API 用） | 型別 | 必填 | 說明 |
|---|---|---|---|---|
| ProjectID | `Title` | 單行文字 | ✅ | 例如 `Cygnus_V2`、`Lyra_38G` |
| MemberName | `MemberName` | 單行文字 | ✅ | 同事姓名（顯示用）|
| MemberEmail | `MemberEmail` | 單行文字 | ✅ | 完整公司信箱 |
| Function | `Function` | Choice | ✅ | 選項：`TH/ME`、`EE`、`RF`、`PWR`、`PM`、`Sales`|
| IsActive | `IsActive` | Yes/No | ✅ | 預設 Yes |

> ⚠️ **重要**：`ProjectID` 的內部名稱是 `Title`（因為它是 SharePoint 系統內建主欄位重新命名而來）。Graph API 查詢時要用 `fields/Title`，不是 `fields/ProjectID`。

### 2.4 目前測試資料
僅 1 筆，為使用者自己（測試 Teams Deep Link 用）。

---

## 3. Microsoft Graph API 規格

### 3.1 需要的權限（Delegated Permissions）
- `Sites.Read.All`（讀取 SharePoint List）
- `User.Read`（已有，登入用）

> 若 Azure AD App 尚未授予 `Sites.Read.All`，需到 Azure Portal → App Registrations → API Permissions 新增並 grant admin consent。

### 3.2 API Endpoints

**Step 1：取得 Site ID（只需做一次，可寫死或快取）**
```
GET https://graph.microsoft.com/v1.0/sites/{hostname}:/sites/{site-path}
```
範例：
```
GET https://graph.microsoft.com/v1.0/sites/deltaww.sharepoint.com:/sites/Thermal-Spec-DB
```

**Step 2：取得 List ID（同上，可快取）**
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists?$filter=displayName eq 'Project_Members'
```

**Step 3：取得指定 ProjectID 的成員（核心查詢）**
```
GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{list-id}/items?$expand=fields&$filter=fields/Title eq '{projectID}' and fields/IsActive eq true
```

> ⚠️ 若 `Title` 欄位未建立索引，Graph 會回 warning。可在 request header 加：
> ```
> Prefer: HonorNonIndexedQueriesWarningMayFailRandomly
> ```

### 3.3 回應資料處理
從回應的 `value[].fields` 取出：
- `Title` → ProjectID
- `MemberName`
- `MemberEmail`
- `Function`
- `IsActive`

依 `Function` 分組為 `TH/ME`、`EE`、`RF` 三個陣列。

---

## 4. UI 規格

### 4.1 浮動按鈕（Teams Quick Contact FAB）

**位置**：
- 在 App 既有「右側浮動工具列」**正下方**
- 與既有工具列保持一致的右邊距與垂直間距（約 8-12px gap）
- 固定 position（CSS `position: fixed`）

**樣式**：
- 圓形按鈕（與既有工具列風格一致，建議 48x48px 或匹配既有 size）
- 圖示：使用 **Microsoft Teams 官方代表色 ICON**（紫色 `#6264A7`）
- 可用 SVG inline 或 Teams 品牌 logo（建議從 Microsoft 官方品牌資源取得，避免版權問題）
  - 推薦來源：`https://learn.microsoft.com/en-us/microsoftteams/platform/assets/icons/teams-logo.svg`
  - 或自繪近似 ICON
- Hover 效果：陰影加深 + 輕微上浮（與既有 UI 一致）
- Tooltip：「快速聯絡專案成員」

**狀態**：
- 未登入 Azure：disable + tooltip 提示「請先登入」
- 載入中：spinner 覆蓋
- 該專案無成員資料：可點，但 Modal 顯示「該專案尚未維護成員名單，請聯絡 PM」

### 4.2 Modal 設計

**觸發**：點 FAB → 開啟 Modal（建議 fade-in 動畫）

**Modal 結構**：
```
┌─────────────────────────────────────────┐
│ 聯絡專案成員                      [✕]   │
│ 專案：Cygnus_V2                          │
├─────────────────────────────────────────┤
│ [ TH/ME ]  [ EE ]  [ RF ]               │  ← Tab 切換
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────┐    │
│ │ 👤 Tedus Wang                   │    │
│ │    tedus.wang@deltaww.com       │    │
│ │                    [📨 傳訊息]   │    │  ← 按下開啟 Teams
│ └─────────────────────────────────┘    │
│ ┌─────────────────────────────────┐    │
│ │ 👤 Tom Chen                     │    │
│ │    tom.chen@deltaww.com         │    │
│ │                    [📨 傳訊息]   │    │
│ └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│ 訊息預覽（可編輯）：                     │
│ ┌─────────────────────────────────┐    │
│ │ Hi [Name]，                      │    │
│ │ Cygnus_V2 的元件資料已更新，    │    │
│ │ 請協助 review：                  │    │
│ │ {current_page_url}              │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Tab 邏輯**：
- 預設選中第一個有資料的 Tab
- 各 Tab 顯示對應 Function 的成員數量徽章，例如 `RF (3)`
- 該 Function 沒人時，Tab 顯示「無成員」灰字

**訊息預覽區**：
- 可編輯 textarea
- 預設模板（範本見 4.3）
- `{current_page_url}` 自動帶入 `window.location.href`
- `[Name]` 在點選對象時自動取代為該同事姓名

### 4.3 預設訊息模板

依 Function 區分（建議）：

```js
const MESSAGE_TEMPLATES = {
  'TH/ME': `Hi {name}，\n${PROJECT_ID} 熱模擬/結構相關資料已更新，請協助確認：\n{url}`,
  'EE':    `Hi {name}，\n${PROJECT_ID} EE 相關元件規格已填寫，請協助 review：\n{url}`,
  'RF':    `Hi {name}，\n${PROJECT_ID} RF 元件規格已填寫，請協助 review：\n{url}`,
};
```

使用者可在送出前手動編輯。

---

## 5. Teams Deep Link 規格

### 5.1 格式
```
https://teams.microsoft.com/l/chat/0/0?users={email}&message={encodedMessage}
```

### 5.2 注意事項
- `email`：完整公司信箱，URL encode
- `message`:
  - 必須 `encodeURIComponent`
  - 上限約 2000 字元（含 URL）
  - 換行用 `\n`（encode 後為 `%0A`）

### 5.3 開啟方式
```js
window.open(deepLink, '_blank');
```
不要用 `location.href`，避免取代當前頁面（使用者填的資料會掉）。

---

## 6. 程式碼整合規格

### 6.1 新增檔案
建議結構（依現有專案習慣調整）：
```
/src
  /teamsContact
    teamsContact.js          ← 主要邏輯
    teamsContactUI.js        ← Modal & FAB UI
    teamsContact.css         ← 樣式
  /api
    sharepointMembers.js     ← Graph API 撈 Project_Members
```

### 6.2 與既有架構整合

**Token 取得**：
- 使用現有 MSAL instance（不要新建）
- 透過 `acquireTokenSilent` 取 token，scope 加上 `Sites.Read.All`

**dbAdapter.js**：
- 若選擇統一管理，可在 `dbAdapter.js` 新增 `getProjectMembers(projectId)` method
- 否則獨立在 `sharepointMembers.js`，與既有 dbAdapter 解耦（推薦，因為這個功能僅讀不寫，沒有 locking 需求，跟元件資料庫的 CRUD 性質不同）

**ProjectID 來源**：
- App 中已有「**專案下拉選單**」(`<select>` element) 讓使用者選擇當前專案
- 取值方式：
  1. 找到該下拉選單的 DOM element（請 Claude Code 在 repo 中搜尋 `<select>` 或相關 ID/class）
  2. 讀取目前選中的 value（`selectElement.value`）
  3. 該 value 即為 `ProjectID`，傳給 Graph API `$filter` 查詢
- **重要**：訂閱下拉選單的 `change` 事件
  - 當使用者切換專案時，若 Modal 已開啟 → 重新撈該專案的成員清單
  - 若 Modal 未開啟 → 清掉 cache（下次開啟時重撈）

```js
// 範例邏輯
const projectSelect = document.querySelector('#project-select'); // 實際 selector 以 repo 為準
const currentProjectId = projectSelect.value;

projectSelect.addEventListener('change', (e) => {
  invalidateMembersCache();
  if (isModalOpen) refetchMembers(e.target.value);
});
```

### 6.3 錯誤處理
- 401（token 過期）→ 觸發 `acquireTokenSilent` 或 `acquireTokenPopup`
- 403（權限不足）→ 顯示「請聯絡管理員確認 Sites.Read.All 權限」
- 404（List 不存在）→ 顯示「Project_Members 清單未建立」
- 空資料 → 顯示「該專案尚未維護成員名單」
- Network error → 顯示「網路錯誤，請稍後重試」

---

## 7. 實作順序建議

1. **Phase 0：摸熟既有 codebase（必做，先做這個）**
   - 找出既有的 MSAL 設定檔（Tenant ID、Client ID 位置）
   - 找出既有的 Graph API 呼叫範例（學 token 怎麼拿、Site ID 怎麼取）
   - 找出專案下拉選單的 DOM selector 與其 change 事件處理器位置
   - 找出既有「右側浮動工具列」的 CSS / JS 位置，理解其樣式系統
   - **完成後跟使用者報告找到了什麼**，再進 Phase 1

2. **Phase 1**：API 層
   - 寫 `sharepointMembers.js`，可獨立測試
   - console.log 驗證能撈到 1 筆測試資料

3. **Phase 2**：UI 骨架
   - 加 FAB 按鈕（先不接邏輯）
   - 確認位置、樣式、Hover 效果

4. **Phase 3**：Modal
   - Tab 切換邏輯
   - 成員卡片列表
   - 訊息預覽編輯

5. **Phase 4**：Teams Deep Link
   - 拼 URL、encode、`window.open`
   - 用測試資料（使用者自己的信箱）驗證

6. **Phase 5**：整合 + 錯誤處理
   - 串接 MSAL token
   - 處理各種 error case
   - Loading state
   - 訂閱專案下拉選單 change 事件

---

## 8. 驗收條件

- [ ] FAB 在右側既有工具列正下方，視覺一致
- [ ] 點 FAB 開啟 Modal，預設選中第一個有資料的 Tab
- [ ] Modal 正確顯示測試資料中的 1 筆成員
- [ ] 三個 Tab 都能切換（即使有些是空的）
- [ ] 訊息預覽包含當前頁面 URL
- [ ] 點「傳訊息」開啟 Teams（新分頁），訊息已預填
- [ ] 訊息預覽可手動編輯
- [ ] Token 過期能自動續期
- [ ] 該專案無資料時有友善提示

---

## 9. 未來擴充（不在本次範圍）

- 多選成員一次群發（需要 Teams group chat deep link）
- 訊息歷史記錄（記錄誰傳給誰、傳了什麼）
- PM 端的 Project_Members 維護 UI（目前先在 SharePoint List 介面手動管理）
- 整合既有「Cross Function Request List」工具，傳訊息時自動帶入 Request 內容

---

## 10. 給 Claude Code 的額外提示

- 此 App 是純前端 GitHub Pages，**不要引入 Node.js backend**
- 不要用 npm 套件需要 build step 的，**保持可直接在瀏覽器執行**
- **MSAL.js、Tenant ID、Client ID、SharePoint Site URL 全部已存在於既有 code 中**：
  - **絕對不要重複宣告**，先掃 repo 找到既有變數/常數，直接 import 或引用
  - 既有的元件資料庫讀寫已經在用這套認證了，照抄它的 pattern 就對了
- 樣式建議用既有 CSS variable 與 Delta 品牌色一致
- 撰寫過程使用 `str_replace` 編輯既有檔案以節省 token
- **Phase 0 完成後務必停下來跟使用者報告**，列出：
  1. 既有 MSAL 設定檔位置與變數名稱
  2. 既有 Graph API helper（若有）位置
  3. 專案下拉選單的 DOM selector
  4. 右側浮動工具列的 CSS 位置與既有按鈕的樣式 class
  - 確認無誤後再進入 Phase 1
- 若 Phase 0 過程中發現 spec 有錯誤或與實際 codebase 不符，**先停下來告訴使用者**，不要硬照 spec 寫
