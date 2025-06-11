# Weibo Retro Twitter-Style Clone

Tampermonkey userscript `weibo-retro-twitter-style-clone.user.js`

---

## Project Summary

_Weibo Retro Twitter-Style Clone_ restores a chronological, advertisement-free timeline for the Weibo desktop site while synchronising with your official blacklist. The script hides promotional modules, removes every trace of blocked users (original posts, reposts, comments, avatars, nicknames) and forces the “Latest Tweets” view—replicating the experience of early Twitter.

---

## Key Features

| Category                  | Details                                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ad and Promotion Removal  | Hides the **“All Followings”** ad stream, hot-search cards, game/monetisation entries, sidebar recommendations and related widgets.                                                                                                    |
| Blacklist Synchronisation | • First run: one-time full fetch (~600 pages) with 250 ms throttling and auto-retry on HTTP 418.<br>• Subsequent launches: homepage delta fetch (~2.5 KB).<br>• Three menu commands: _Update_ (delta), _Sync Five Pages_, _Full Sync_. |
| Timeline Optimisation     | Forces “Latest” tab; filters Fetch/XHR/WebSocket traffic; MutationObserver debounced to minimise overhead.                                                                                                                             |
| Reliability               | UID list persisted to Tampermonkey storage; automatic re-attachment on SPA navigation; configurable throttle and retry limits.                                                                                                         |

---

## Installation

1. Install **[Tampermonkey](https://www.tampermonkey.net/)** in your browser.
2. Open the raw file [`weibo-retro-twitter-style-clone.user.js`](./dist/weibo-retro-twitter-style-clone.user.js) and allow Tampermonkey to install it, or copy the contents into a new script manually.
3. Refresh any open Weibo tabs.  
   _If no local UID cache is found, the script performs a full sync automatically._

---

## Usage

### Tampermonkey Menu Commands

| Command                   | Action                            | Use Case                                    |
| ------------------------- | --------------------------------- | ------------------------------------------- |
| **Update Blacklist**      | Single-page delta sync            | Daily routine                               |
| **Sync First Five Pages** | Fetches five pages before caching | When frequent blocking activity is expected |
| **Full Blacklist Sync**   | Exhaustive rescan                 | New account or major list changes           |

### Adjustable Constants

| Variable      | Default | Purpose                                                          |
| ------------- | ------- | ---------------------------------------------------------------- |
| `THROTTLE_MS` | `250`   | Minimum delay (ms) between successive API calls during full sync |
| `MAX_418`     | `3`     | Abort threshold after consecutive HTTP 418 responses             |

---

## FAQ

<details>
<summary>Why is the throttling interval set to 250&nbsp;ms?</summary>

Testing shows that 20–30 rapid consecutive requests often trigger Weibo’s WAF, returning HTTP 418.  
A 250 ms delay all but eliminates these blocks. Increase the value if you continue to receive 418s.

</details>

<details>
<summary>Does the script block every advertisement?</summary>

It targets all ad and promotion elements present on the desktop site as of 11 June 2025. Structural changes by Weibo may require script updates.

</details>

---

## Contributing

Pull requests and issue reports are welcome.  
Please ensure code passes ESLint/Prettier checks and include concise test notes.

---

## License

Released under the **MIT License**. See `LICENSE` for details.
