# Weibo Retro Twitter-Style Clone

微博复古时间线 Tampermonkey 脚本：`weibo-retro-twitter-style-clone.user.js`

---

## 中文说明

### 项目简介

Weibo Retro Twitter-Style Clone 是一个面向微博网页版桌面端的 Tampermonkey 脚本。脚本使用本地 UID 黑名单过滤指定用户，并提供时间线切换、推荐模块清理、热搜隐藏、广告过滤和新浪微博官方黑名单同步功能。

右键菜单支持仅加入本地黑名单，以及同时加入本地黑名单和新浪微博官方黑名单。设置面板支持浏览、搜索、新增、删除、导入、导出和同步本地 UID 数据。

---

### 核心功能

| 功能 | 说明 |
| --- | --- |
| 时间线恢复 | 可将微博首页默认切换到“最新微博”，按时间顺序浏览内容；关闭后恢复微博原生首页与“全部关注”接口行为。 |
| 本地屏蔽规则 | 使用本地 UID 列表过滤用户内容，不依赖新浪微博官方黑名单容量。 |
| 官方黑名单导入 | 支持增量同步、同步前五页、完整同步，将新浪微博官方黑名单导入本地屏蔽规则。 |
| 原生拉黑同步 | 在网页中使用新浪微博原生拉黑功能后，脚本会在请求成功后自动把该 UID 加入本地屏蔽规则。 |
| 右键屏蔽菜单 | 仅在用户名文字区域使用鼠标右键，可直接屏蔽该用户、同时加入新浪微博黑名单，或在新选项卡打开用户主页。 |
| 多层过滤 | 通过 Fetch、XHR、WebSocket 和 DOM 监听过滤内容，覆盖动态加载的信息流和搜索结果。 |
| 可配置内容过滤 | 可分别控制黑名单用户的微博/转发、评论/回复、搜索结果、用户卡片，以及转发/点赞列表。 |
| 搜索页支持 | 支持 `s.weibo.com` 搜索页，过滤本地规则命中的搜索结果，并可隐藏热搜和「相关用户」容器。 |
| 广告过滤 | 可隐藏接口或页面中带有明确广告、推广、赞助标识的内容。 |
| 导航与侧栏清理 | 可分别隐藏“视频”“推荐”“游戏”入口，并隐藏微博热搜、你可能感兴趣的人等模块。 |
| 新微博提示 | 首页存在新微博时，顶部首页按钮以红色圆点代替红色 `NEW` 文字徽标。 |
| 标准设置面板 | 设置按“常规、外观、黑名单、UID 管理、数据与同步”分类，并支持隐藏右下角齿轮按钮。 |
| UID 管理 | 直接浏览全部已保存 UID，支持搜索、输入页数快速跳转、每页 50 条分页显示、批量新增、单条删除和打开用户主页。 |
| 数据备份 | 支持导出、合并导入、替换导入本地屏蔽规则。 |

---

### 使用方法

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 安装或复制 `weibo-retro-twitter-style-clone.user.js` 到 Tampermonkey。
3. 刷新微博网页版页面。
4. 点击右下角齿轮按钮，或使用 Tampermonkey 菜单中的“打开脚本设置”。设置面板包含外观、UID 管理、官方黑名单同步和本地数据管理功能。

脚本匹配以下页面：

- `https://weibo.com/*`
- `https://www.weibo.com/*`
- `https://weibo.com/set/*`
- `http://s.weibo.com/*`
- `https://s.weibo.com/*`

---

### 屏蔽规则与黑名单

- 本地屏蔽规则保存在 Tampermonkey 本地存储中。
- 本地屏蔽规则可通过手动输入 UID、右键菜单、导入备份、同步官方黑名单等方式更新。
- 页面内容过滤使用本地黑名单；新浪微博官方黑名单是本地黑名单的同步来源之一。
- 右键菜单中的“屏蔽 @用户”只写入本地黑名单。
- 右键菜单中的“屏蔽 @用户（同时加入新浪微博黑名单）”同时写入本地黑名单和新浪微博官方黑名单。
- 设置面板可分别决定在哪些内容类型中隐藏黑名单用户；关注和粉丝关系页始终保留显示。
- “UID 管理”页面读取本地黑名单中的完整 UID 列表。
- UID 列表按最近写入顺序排列，每页显示 50 条；分页栏支持输入页数快速跳转。搜索、添加和删除操作均直接作用于本地黑名单。

---

### 同步选项

| 选项 | 说明 |
| --- | --- |
| 增量同步 | 读取并合并官方黑名单第 1 页。 |
| 同步前五页 | 读取并合并官方黑名单前 5 页。 |
| 完整同步 | 遍历并合并官方黑名单全部分页。 |

官方黑名单同步仅在 `weibo.com` 主站页面执行。搜索页 `s.weibo.com` 使用本地缓存规则过滤内容，不执行官方黑名单同步。

---

### 右键菜单

仅在可识别 UID 的用户名文字区域点击鼠标右键，会显示脚本菜单；在头像、正文、按钮或卡片空白处右键时不会接管浏览器菜单：

- `屏蔽 @用户`：加入本地屏蔽规则并立即隐藏当前卡片。
- `屏蔽 @用户（同时加入新浪微博黑名单）`：加入本地屏蔽规则，并调用新浪微博官方黑名单接口。
- `在新选项卡中打开链接`：打开该用户主页。

---

### 使用说明

- 官方黑名单分页同步请求的间隔为 300ms。
- 本地屏蔽规则从 Tampermonkey 本地存储读取。
- CSS 与 DOM 扫描工作量随本地 UID 数量增加。
- DOM 内容过滤依赖微博网页版的页面结构和选择器。
- 仅支持微博网页版桌面端。

---

### 项目链接

[DanielZenFlow/Weibo-Retro-Twitter-Style-Clone](https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone)

---

## English

### Overview

Weibo Retro Twitter-Style Clone is a Tampermonkey userscript for the desktop Weibo website. It uses a local UID blacklist to filter selected users and provides timeline control, recommendation cleanup, hot-search removal, ad filtering, and official Weibo blacklist synchronization.

The right-click menu supports local-only blocking and combined local plus official Weibo blocking. The settings panel supports browsing, searching, adding, deleting, importing, exporting, and synchronizing local UID data.

---

### Features

| Feature | Description |
| --- | --- |
| Timeline Control | Can switch the Weibo home page to the "Latest Weibo" timeline. |
| Local Blocking Rules | Filters users through a local UID list without depending on the official blacklist capacity. |
| Official Blacklist Import | Supports delta sync, first-five-pages sync, and full sync from the official Weibo blacklist into local rules. |
| Native Block Sync | When a user is blocked through Weibo's native UI, the script adds the UID to local rules after the request succeeds. |
| Right-Click Blocking | Right-click only on user-name text to block the user directly, block locally plus officially, or open the profile in a new tab. |
| Multi-Layer Filtering | Filters through Fetch, XHR, WebSocket, and DOM observers for dynamically loaded feeds and search results. |
| Configurable Blacklist Filtering | Independently controls posts/reposts, comments/replies, search results, user cards, and repost/like user lists. |
| Search Page Support | Supports `s.weibo.com`, filters matching search result cards, and can hide hot-search and related-user containers. |
| Ad Filtering | Hides content with explicit API or DOM advertising, promoted, or sponsored markers. |
| Navigation and Sidebar Cleanup | Separately hides the "Video", "Recommended", and "Game" navigation entries, plus hot-search and suggested-people modules. |
| New Post Indicator | Replaces the red `NEW` text badge on the Home button with a red dot when new posts are available. |
| Standard Settings UI | Organizes settings into General, Appearance, Blacklist, UID Management, and Data & Sync pages, with an option to hide the floating gear button. |
| UID Management | Browses the complete saved UID list with search, direct page-number jumps, 50-item pagination, batch addition, single-item deletion, and profile links. |
| Backup and Restore | Supports exporting, merge importing, and replacement importing local blocking rules. |

---

### Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Install `weibo-retro-twitter-style-clone.user.js`, or copy its contents into a new Tampermonkey script.
3. Refresh open Weibo desktop pages.
4. Open settings from the bottom-right gear button or Tampermonkey's "Open script settings" command. The panel contains appearance controls, UID management, official blacklist synchronization, and local data management.

The script runs on:

- `https://weibo.com/*`
- `https://www.weibo.com/*`
- `https://weibo.com/set/*`
- `http://s.weibo.com/*`
- `https://s.weibo.com/*`

---

### Blocking Rules and Blacklist

- Local blocking rules are stored in Tampermonkey local storage.
- Local rules can be updated by manual UID entry, right-click actions, backup import, or official blacklist sync.
- Page filtering uses the local blacklist. The official Weibo blacklist is one synchronization source for the local blacklist.
- `Block @user` writes only to the local blacklist.
- `Block @user (also add to official Weibo blacklist)` writes to both the local and official Weibo blacklists.
- Content categories can be enabled independently; follower/following relationship pages always remain visible.
- The UID Management page reads the complete UID list from the local blacklist.
- UIDs are shown in recent-write order with 50 entries per page. The pagination controls accept a page number for direct navigation. Search, addition, and deletion operate directly on the local blacklist.

---

### Sync Options

| Option | Description |
| --- | --- |
| Delta Sync | Reads and merges the first official blacklist page. |
| Sync First Five Pages | Reads and merges the first five official blacklist pages. |
| Full Sync | Traverses and merges all official blacklist pages. |

Official blacklist sync runs only on the main `weibo.com` domain. Search pages on `s.weibo.com` use cached local rules and do not run official blacklist sync.

---

### Right-Click Menu

Right-clicking detectable user-name text opens the script menu. Right-clicks on avatars, post bodies, controls, and empty card areas keep the browser's native menu:

- `Block @user`: adds the UID to local blocking rules and hides the current card immediately.
- `Block @user (also add to official Weibo blacklist)`: adds the UID locally and calls the official Weibo blacklist API.
- `Open link in new tab`: opens the user's profile page.

---

### Notes

- Official blacklist pagination requests use a 300ms interval.
- Local blocking rules are read from Tampermonkey local storage.
- CSS and DOM scanning workload grows with the number of local UIDs.
- DOM content filtering depends on the desktop Weibo page structure and selectors.
- Desktop Weibo web pages are supported.

---

### Repository

[DanielZenFlow/Weibo-Retro-Twitter-Style-Clone](https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone)

---

## License

Released under the **MIT License**. See `LICENSE` for details.
