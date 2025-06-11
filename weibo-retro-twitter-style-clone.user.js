// ==UserScript==
// @name         Weibo Retro Twitter-Style Clone
// @version      1.0.0
// @description  增强版：模仿早期Twitter的时间线展示。自动切换到“最新微博”；全接口劫持并隐藏黑名单用户所有言论与转发；隐藏除“最新微博”外导航项、微博热搜、游戏入口、推荐关注等模块；单一防抖MutationObserver；SPA路由清理；手动更新黑名单功能；永久屏蔽“全部关注”接口返回内容；新增全量同步与五页同步黑名单菜单。
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com/set/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // === GM_* 接口封装 ===
  const _GM_getValue = typeof GM_getValue !== 'undefined' ? GM_getValue : () => {};
  const _GM_setValue = typeof GM_setValue !== 'undefined' ? GM_setValue : () => {};
  const _GM_registerMenuCommand = typeof GM_registerMenuCommand !== 'undefined' ? GM_registerMenuCommand : () => {};

  function useOption(key, title, defaultVal) {
    let val = _GM_getValue(key, defaultVal);
    _GM_registerMenuCommand(`${title}: ${val ? '✅' : '❌'}`, () => {
      val = !val;
      _GM_setValue(key, val);
      location.reload();
    });
    return { get value() { return val; } };
  }
  const timelineDefault = useOption('defaultLatest', '默认最新微博', true);

  // === 强制切换到“最新微博”分栏 ===
  (function forceLatestTab() {
    if (!timelineDefault.value) return;
    if (location.hostname === 'weibo.com' && (location.pathname === '/' || location.pathname === '')) {
      const clickBtn = () => {
        const btn = document.querySelector('[role="link"][title="最新微博"]');
        if (btn) btn.click();
        else setTimeout(clickBtn, 1000);
      };
      if (document.readyState !== 'loading') clickBtn();
      else window.addEventListener('DOMContentLoaded', clickBtn);
    }
  })();

  // === 黑名单数据与同步 ===
  const UID_KEY     = 'WB_BL_list'; // 本地存 UID
  const THROTTLE_MS = 100;          // 节流（毫秒）
  const MAX_418     = 3;            // 连续 418 次数上限
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 保存原生接口
  if (!window.WB_BL_NATIVE) {
    window.WB_BL_NATIVE = {
      fetch: window.fetch,
      XHROpen: XMLHttpRequest.prototype.open,
      XHRSend: XMLHttpRequest.prototype.send,
      WebSocket: window.WebSocket
    };
  }

  /**
   * 全量同步：只在用户手动触发或无缓存时使用
   */
  async function fullSync() {
    const list = [];
    let page = 1, cursor = 0, strikes = 0;
    while (true) {
      let url = `/ajax/setting/getFilteredUsers?page=${page}`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await window.WB_BL_NATIVE.fetch(url, { credentials: 'include' });
      if (res.status === 418) {
        if (++strikes > MAX_418) break;
        await sleep(3000);
        continue;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      (data.card_group || []).forEach(item => {
        const m = item.scheme.match(/uid=(\d{5,})/);
        if (m) list.push(m[1]);
      });
      if (!data.next_cursor) break;
      cursor = data.next_cursor;
      page++;
      await sleep(THROTTLE_MS);
    }
    _GM_setValue(UID_KEY, list.join(','));
    return new Set(list);
  }

  /**
   * 增量同步：默认只跑第一页
   */
  async function deltaSync(set) {
    const res = await window.WB_BL_NATIVE.fetch('/ajax/setting/getFilteredUsers?page=1', { credentials: 'include' });
    if (!res.ok) return set;
    const data = await res.json(); let added = 0;
    (data.card_group || []).forEach(item => {
      const m = item.scheme.match(/uid=(\d{5,})/);
      if (m && !set.has(m[1])) { set.add(m[1]); added++; }
    });
    if (added) _GM_setValue(UID_KEY, Array.from(set).join(','));
    return set;
  }

  /**
   * 指定页数同步（默认 5 页）
   * @param {Set}   set    现有 BL 集合
   * @param {Number}pages  要同步的页数
   * @returns {Number} 新增 UID 数
   */
  async function syncPages(set, pages = 5) {
    let page = 1, cursor = 0, strikes = 0, added = 0;
    while (page <= pages) {
      let url = `/ajax/setting/getFilteredUsers?page=${page}`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await window.WB_BL_NATIVE.fetch(url, { credentials: 'include' });
      if (res.status === 418) {
        if (++strikes > MAX_418) break;
        await sleep(3000);
        continue;
      }
      if (!res.ok) break;
      const data = await res.json();
      (data.card_group || []).forEach(item => {
        const m = item.scheme.match(/uid=(\d{5,})/);
        if (m && !set.has(m[1])) { set.add(m[1]); added++; }
      });
      if (!data.next_cursor) break;
      cursor = data.next_cursor;
      page++;
      await sleep(THROTTLE_MS);
    }
    if (added) _GM_setValue(UID_KEY, Array.from(set).join(','));
    return added;
  }

  let BL = new Set();
  (async () => {
    const cache = _GM_getValue(UID_KEY, '');
    BL = cache ? new Set(cache.split(',')) : await fullSync();
    if (cache) BL = await deltaSync(BL);
    injectCSSWhenReady(generateCSSRules());
  })();

  function generateCSSRules() {
    const blRules = Array.from(BL).map(uid => `
      .Feed_body_3R0rO:has([data-user-id="${uid}"]),
      .card-wrap:has([data-user-id="${uid}"]) {
        display: none !important;
      }
    `).join('\n');
    return `
      ${blRules}
      div[role="link"][title="全部关注"] { display: none !important; }
      .Links_box_17T3k { display: none !important; }
      .cardHotSearch_tit_2lo7I,
      .cardHotSearch_tab_24u_o,
      .wbpro-side-card7,
      .wbpro-side-tit.woo-box-flex.woo-box-alignCenter,
      .wbpro-side-card4 {
        display: none !important;
      }
    `;
  }

  function injectCSSWhenReady(cssText) {
    const tryInject = () => {
      const head = document.head || document.getElementsByTagName('head')[0];
      if (head) {
        const style = document.createElement('style');
        style.textContent = cssText;
        head.appendChild(style);
      } else {
        setTimeout(tryInject, 50);
      }
    };
    tryInject();
  }

  function extractUIDs(data) {
    const uids = new Set();
    (function trav(o) {
      if (!o || typeof o !== 'object') return;
      Object.entries(o).forEach(([k,v]) => {
        if (/^(?:uid|user_id|userId|id|idstr)$/i.test(k) && typeof v==='string' && /^\d{5,}$/.test(v)) {
          uids.add(v);
        }
        if (k==='user' && v && v.id) uids.add(String(v.id));
        if (Array.isArray(v)) v.forEach(trav);
        else if (v && typeof v==='object') trav(v);
      });
    })(data);
    return uids;
  }

  function filterData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj
        .filter(item => ![...extractUIDs(item)].some(uid => BL.has(uid)))
        .map(filterData);
    }
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = Array.isArray(v) ? filterData(v)
               : (v && typeof v==='object' ? filterData(v)
               : v);
    }
    return out;
  }

  // === 全局 Fetch 拦截 ===
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    // 永久屏蔽“全部关注”流
    if (url.includes('unreadfriendstimeline')) {
      return new Response(JSON.stringify({
        ok: 1,
        statuses: [],
        since_id_str: '0',
        max_id_str: '0'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // 黑名单增删
    if (typeof url === 'string') {
      if (url.includes('/filterUser')) {
        const uid = JSON.parse(init?.body||'{}').uid;
        BL.add(String(uid));
        _GM_setValue(UID_KEY, [...BL].join(','));
      }
      if (url.includes('/unfilterUser')) {
        const uid = JSON.parse(init?.body||'{}').uid;
        BL.delete(String(uid));
        _GM_setValue(UID_KEY, [...BL].join(','));
      }
    }
    const res = await window.WB_BL_NATIVE.fetch(input, init);
    if (typeof url === 'string' && /\/(?:ajax\/(?:feed|statuses|comment|getCommentList|repost|like)|graphql\/|(?:mymblog|timeline|index))/.test(url)) {
      try {
        const data = await res.clone().json();
        return new Response(JSON.stringify(filterData(data)), res);
      } catch {}
    }
    return res;
  };

  // === XHR 拦截 ===
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._url = url;
    return window.WB_BL_NATIVE.XHROpen.call(this, method, url, ...args);
  };
  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('readystatechange', () => {
      if (this.readyState === 4 && this.status === 200 && this._url) {
        // 屏蔽“全部关注”流
        if (this._url.includes('unreadfriendstimeline')) {
          Object.defineProperty(this, 'responseText', {
            value: JSON.stringify({
              ok: 1,
              statuses: [],
              since_id_str: '0',
              max_id_str: '0'
            })
          });
          return;
        }
        // 过滤黑名单内容
        if (/\/(?:ajax\/(?:feed|statuses)|(?:mymblog|timeline))/.test(this._url)) {
          try {
            const o = JSON.parse(this.responseText);
            Object.defineProperty(this, 'responseText', {
              value: JSON.stringify(filterData(o))
            });
          } catch {}
        }
      }
    });
    return window.WB_BL_NATIVE.XHRSend.call(this, body);
  };

  // === WebSocket 拦截 ===
  window.WebSocket = class extends window.WB_BL_NATIVE.WebSocket {
    constructor(url, protocols) {
      super(url, protocols);
      this.addEventListener('message', evt => {
        try {
          const o = JSON.parse(evt.data);
          evt.data = JSON.stringify(filterData(o));
        } catch {}
      });
    }
  };

  // === MutationObserver 过滤 ===
  (function(){
    const obs = new MutationObserver(ms => {
      clearTimeout(window._wbbl_t);
      window._wbbl_t = setTimeout(() => {
        ms.forEach(m => {
          Array.from(m.addedNodes).forEach(n => {
            if (n instanceof HTMLElement && n.matches('.Feed_body_3R0rO')) {
              if ([...n.querySelectorAll('[data-user-id]')]
                    .some(el => BL.has(el.getAttribute('data-user-id')))) {
                n.style.display = 'none';
              }
            }
          });
        });
      }, THROTTLE_MS);
    });
    const attach = () => {
      const root = document.body || document.documentElement;
      if (root) {
        obs.observe(root, { childList: true, subtree: true });
        window.addEventListener('beforeunload', () => obs.disconnect());
        // SPA 路由重置
        const push = history.pushState;
        history.pushState = function(s, title, url) {
          push.call(this, s, title, url);
          obs.disconnect();
          obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
        };
      } else {
        setTimeout(attach, 50);
      }
    };
    attach();
  })();

  /* === Tampermonkey 菜单 === */

  // 更新（第一页增量）
  _GM_registerMenuCommand('更新黑名单', async () => {
    const oldSize = BL.size;
    BL = await deltaSync(new Set(BL));
    _GM_setValue(UID_KEY, [...BL].join(','));
    alert(`黑名单更新完成！新增 ${BL.size - oldSize} 个用户`);
  });

  // 五页同步
  _GM_registerMenuCommand('同步前五页黑名单', async () => {
    const added = await syncPages(BL, 5);
    alert(`同步五页完成！新增 ${added} 个用户`);
  });

  // 全量同步
  _GM_registerMenuCommand('全量同步黑名单', async () => {
    const oldSize = BL.size;
    BL = await fullSync();
    alert(`全量同步完成！新增 ${BL.size - oldSize} 个用户（共 ${BL.size}）`);
  });

  console.log(`[WB-BL] 启动完成 v1.0.3，模仿早期Twitter流式时间线，已缓存 ${BL.size} UIDs`);
})();