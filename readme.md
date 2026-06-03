# Weibo Retro Twitter-Style Clone

微博复古时间线 Tampermonkey 脚本：`weibo-retro-twitter-style-clone.user.js`

---

## 中文说明

### 项目简介

Weibo Retro Twitter-Style Clone 是一个面向微博网页版桌面端的 Tampermonkey 脚本。脚本维护一套本地屏蔽规则，用于过滤指定用户、清理推荐模块、隐藏热搜容器，并提供官方黑名单导入与同步能力。

本地屏蔽规则是插件的主要过滤依据。当前版本支持直接用鼠标右键屏蔽用户；考虑到新浪微博官方黑名单数量有限，日常使用可优先将用户加入本地屏蔽规则；需要同步到新浪微博账号级黑名单时，可使用右键菜单中的“同时加入新浪微博黑名单”功能，或从设置面板同步官方黑名单。

---

### 核心功能

| 功能 | 说明 |
| --- | --- |
| 时间线恢复 | 可将微博首页默认切换到“最新微博”，按时间顺序浏览内容。 |
| 本地屏蔽规则 | 使用本地 UID 列表过滤用户内容，不依赖新浪微博官方黑名单容量。 |
| 官方黑名单导入 | 支持增量同步、同步前五页、完整同步，将新浪微博官方黑名单导入本地屏蔽规则。 |
| 原生拉黑同步 | 在网页中使用新浪微博原生拉黑功能后，脚本会在请求成功后自动把该 UID 加入本地屏蔽规则。 |
| 右键屏蔽菜单 | 在用户名称或用户链接上使用鼠标右键，可直接屏蔽该用户、同时加入新浪微博黑名单，或在新选项卡打开用户主页。 |
| 多层过滤 | 通过 Fetch、XHR、WebSocket 和 DOM 监听过滤内容，覆盖动态加载的信息流和搜索结果。 |
| 搜索页支持 | 支持 `s.weibo.com` 搜索页，过滤本地规则命中的搜索结果，并移除搜索页热搜容器。 |
| 导航与侧栏清理 | 可分别隐藏“视频”“推荐”“游戏”入口，并隐藏微博热搜、你可能感兴趣的人等模块。 |
| 数据备份 | 支持导出、合并导入、替换导入本地屏蔽规则。 |

---

### 使用方法

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 安装或复制 `weibo-retro-twitter-style-clone.user.js` 到 Tampermonkey。
3. 刷新微博网页版页面。
4. 打开脚本设置面板，根据需要同步官方黑名单或手动管理本地屏蔽规则。

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
- 新浪微博官方黑名单可作为导入来源，但不是脚本过滤的唯一来源。
- 当需要减少官方黑名单占用时，可只使用本地屏蔽规则。
- 当需要账号级屏蔽时，可选择“屏蔽（同时加入新浪微博黑名单）”。

---

### 同步选项

| 选项 | 说明 |
| --- | --- |
| 增量同步 | 同步官方黑名单第一页，适合日常更新。 |
| 同步前五页 | 同步官方黑名单前五页，适合近期有较多拉黑操作的情况。 |
| 完整同步 | 遍历官方黑名单全部分页，适合新设备、首次迁移或大规模变动。 |

同步官方黑名单需要在 `weibo.com` 主站页面执行。搜索页 `s.weibo.com` 使用本地缓存规则过滤内容，不执行官方黑名单同步。

---

### 右键菜单

在可识别 UID 的用户名称、用户链接或用户卡片上点击鼠标右键，会显示脚本菜单，可直接完成用户屏蔽：

- `屏蔽 @用户`：加入本地屏蔽规则并立即隐藏当前卡片。
- `屏蔽 @用户（同时加入新浪微博黑名单）`：加入本地屏蔽规则，并调用新浪微博官方黑名单接口。
- `在新选项卡中打开链接`：打开该用户主页。

---

### 使用说明

- 官方黑名单同步请求使用 300ms 间隔，降低触发微博反爬限制的概率。
- 本地屏蔽规则不需要每次重新下载。
- 大量本地屏蔽规则会增加 CSS 与 DOM 扫描工作量。
- 微博页面结构变化时，部分选择器可能需要更新。
- 仅支持微博网页版桌面端。

---

### 项目链接

[DanielZenFlow/Weibo-Retro-Twitter-Style-Clone](https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone)

---

## English

### Overview

Weibo Retro Twitter-Style Clone is a Tampermonkey userscript for the desktop Weibo website. It maintains a local blocking rule set for filtering selected users, cleaning recommendation modules, removing hot-search containers, and importing or syncing users from the official Weibo blacklist.

The local blocking rule set is the primary filtering layer. The current version supports direct user blocking from the mouse right-click menu. Because the official Weibo blacklist has a limited capacity, daily filtering can rely on local rules first. When account-level blocking is required, the right-click menu can also add the user to the official Weibo blacklist.

---

### Features

| Feature | Description |
| --- | --- |
| Timeline Control | Can switch the Weibo home page to the "Latest Weibo" timeline. |
| Local Blocking Rules | Filters users through a local UID list without depending on the official blacklist capacity. |
| Official Blacklist Import | Supports delta sync, first-five-pages sync, and full sync from the official Weibo blacklist into local rules. |
| Native Block Sync | When a user is blocked through Weibo's native UI, the script adds the UID to local rules after the request succeeds. |
| Right-Click Blocking | Use the mouse right-click menu on a user name or profile link to block the user directly, block locally plus officially, or open the profile in a new tab. |
| Multi-Layer Filtering | Filters through Fetch, XHR, WebSocket, and DOM observers for dynamically loaded feeds and search results. |
| Search Page Support | Supports `s.weibo.com`, filters matching search result cards, and removes search hot-search containers. |
| Navigation and Sidebar Cleanup | Separately hides the "Video", "Recommended", and "Game" navigation entries, plus hot-search and suggested-people modules. |
| Backup and Restore | Supports exporting, merge importing, and replacement importing local blocking rules. |

---

### Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Install `weibo-retro-twitter-style-clone.user.js`, or copy its contents into a new Tampermonkey script.
3. Refresh open Weibo desktop pages.
4. Open the script settings panel to sync the official blacklist or manage local blocking rules.

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
- The official Weibo blacklist can be used as an import source, but it is not the only filtering source.
- Local-only blocking can be used when official blacklist capacity should be preserved.
- Account-level blocking is available through the "block and also add to official Weibo blacklist" right-click action.

---

### Sync Options

| Option | Description |
| --- | --- |
| Delta Sync | Syncs the first official blacklist page for daily updates. |
| Sync First Five Pages | Syncs the first five official blacklist pages for recent blocking activity. |
| Full Sync | Traverses all official blacklist pages for new devices, migrations, or large changes. |

Official blacklist sync should be run on the main `weibo.com` domain. Search pages on `s.weibo.com` use cached local rules and do not run official blacklist sync.

---

### Right-Click Menu

Right-clicking a user name, profile link, or user card with a detectable UID opens the script menu and supports direct user blocking:

- `Block @user`: adds the UID to local blocking rules and hides the current card immediately.
- `Block @user (also add to official Weibo blacklist)`: adds the UID locally and calls the official Weibo blacklist API.
- `Open link in new tab`: opens the user's profile page.

---

### Notes

- Official blacklist sync requests use a 300ms interval to reduce the chance of triggering Weibo anti-abuse limits.
- Local blocking rules do not need to be downloaded on every page load.
- Very large local rule sets may increase CSS and DOM scanning work.
- Weibo DOM changes may require selector updates.
- Desktop Weibo web pages are supported.

---

### Repository

[DanielZenFlow/Weibo-Retro-Twitter-Style-Clone](https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone)

---

## License

Released under the **MIT License**. See `LICENSE` for details.
