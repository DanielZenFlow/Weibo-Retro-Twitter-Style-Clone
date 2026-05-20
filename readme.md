# Weibo Retro Twitter-Style Clone

Tampermonkey userscript: `weibo-retro-twitter-style-clone.user.js`

---

## Project Summary

_Weibo Retro Twitter-Style Clone_ restores a cleaner chronological Weibo desktop experience. It can force the home timeline to the "Latest" tab, filter blocked users from feeds and search results, hide promotional navigation entries, remove hot-search modules, and manage the local blacklist cache from an in-page settings panel.

---

## Key Features

| Category | Details |
| --- | --- |
| Timeline Control | Automatically switches the Weibo home page to the "Latest Weibo" timeline when enabled. |
| Blacklist Filtering | Filters blocked users across Fetch, XHR, WebSocket payloads, and DOM-rendered posts. Search-result pages on `s.weibo.com` are also scanned for UID links and user-card metadata. |
| Search Page Cleanup | Supports `s.weibo.com` search pages and removes the search hot-search container, including `#hot-band-container`, `.hot-band-container`, and `.hot-band-tabs`. |
| Navigation Cleanup | Provides separate settings for hiding the "Video", "Recommended", and "Game" navigation entries. |
| Sidebar Cleanup | Hides hot-search cards and suggested-people modules when enabled. |
| Blacklist Management | Includes manual UID add/remove, import/export, delta sync, first-five-pages sync, and full sync. |
| Reliability | Keeps the blacklist in Tampermonkey storage, re-applies DOM filters through MutationObserver, and avoids blacklist sync calls on `s.weibo.com` where the settings API is unavailable. |

---

## Installation

1. Install **[Tampermonkey](https://www.tampermonkey.net/)** in your browser.
2. Open `weibo-retro-twitter-style-clone.user.js` and install it in Tampermonkey, or copy the file contents into a new Tampermonkey script.
3. Refresh open Weibo tabs.
4. Open the script settings panel and sync your blacklist from a `weibo.com` page.

The script runs on:

- `https://weibo.com/*`
- `https://www.weibo.com/*`
- `https://weibo.com/set/*`
- `http://s.weibo.com/*`
- `https://s.weibo.com/*`

---

## Usage

### Settings Panel

Click the floating **Settings** button or use the Tampermonkey menu command.

Available settings include:

- Default the home page to "Latest Weibo".
- Hide the navigation entries for "Video", "Recommended", and "Game" independently.
- Hide hot-search and suggested-people sidebar modules.
- Add or remove blacklist UIDs manually.
- Export or import blacklist backups.
- Run delta, first-five-pages, or full blacklist sync.

### Search Pages

On `s.weibo.com`, the script uses the locally cached blacklist to filter matching search-result cards. Blacklist sync should be run from the main `weibo.com` domain because the settings API is not available on the search host.

The search hot-search module is removed by targeting the current search-page structures:

- `#hot-band-container`
- `.hot-band-container`
- `.hot-band-tabs`

---

## Notes

- Weibo changes its DOM structure frequently. If a module reappears, inspect the remaining container and add the stable outer selector.
- Very large blacklists may increase CSS and DOM scanning work. The script keeps the filters scoped to known Weibo post and search-result containers where possible.
- Some settings require a page reload to fully refresh injected CSS and layout.

---

## License

Released under the **MIT License**. See `LICENSE` for details.
