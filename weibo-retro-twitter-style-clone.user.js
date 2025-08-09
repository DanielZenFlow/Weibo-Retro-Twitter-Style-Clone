// ==UserScript==
// @sandbox      raw
// @name         Weibo Retro Twitter-Style Clone
// @namespace    https://github.com/DanielZenFlow
// @version      1.0.0
// @description  增强版：模仿早期Twitter的时间线展示。自动切换到"最新微博"；全接口劫持并隐藏黑名单用户所有言论与转发；隐藏除"最新微博"外导航项、微博热搜、游戏入口、推荐关注等模块；单一防抖MutationObserver；SPA路由清理；手动更新黑名单功能；永久屏蔽"全部关注"接口返回内容；新增全量同步与五页同步黑名单菜单。
// @author       DanielZenFlow
// @license      MIT
// @homepage     https://github.com/DanielZenFlow/Weibo-Blacklist-Enhanced-Lite
// @supportURL   https://github.com/DanielZenFlow/Weibo-Blacklist-Enhanced-Lite/issues
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com/set/*
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @run-at       document-start
// ==/UserScript==

/*
 * Weibo Retro Twitter-Style Clone
 * Copyright (c) 2025 DanielZenFlow
 * Licensed under MIT License
 * GitHub: https://github.com/DanielZenFlow/Weibo-Blacklist-Enhanced-Lite
 */

(function () {
  'use strict';

  // === GM_* 接口封装 ===
  const _GM_getValue =
    typeof GM_getValue !== 'undefined' ? GM_getValue : () => {};
  const _GM_setValue =
    typeof GM_setValue !== 'undefined' ? GM_setValue : () => {};
  const _GM_registerMenuCommand =
    typeof GM_registerMenuCommand !== 'undefined'
      ? GM_registerMenuCommand
      : () => {};
  const _GM_openInTab =
    typeof GM_openInTab !== 'undefined' ? GM_openInTab : null;

  // === Star提醒配置 ===
  const STAR_CONFIG = {
    FIRST_RUN_KEY: 'WB_FULL_FIRST_RUN',
    STAR_REMINDER_DISABLED_KEY: 'WB_FULL_STAR_REMINDER_DISABLED',
    LAST_STAR_REMINDER_TIME_KEY: 'WB_FULL_LAST_STAR_REMINDER_TIME',
    // Star提醒间隔：首次安装 → 7天后 → 30天后 → 90天后 → 不再提醒
    STAR_REMINDER_INTERVALS: [0, 7, 30, 90], // 天数
  };

  // === 智能打开链接函数 ===
  function openGitHub() {
    const url =
      'https://github.com/DanielZenFlow/Weibo-Blacklist-Enhanced-Lite';

    // 优先使用油猴的专用API（不会被拦截）
    if (_GM_openInTab) {
      _GM_openInTab(url, { active: true });
      return;
    }

    // 降级到普通弹窗
    const newWindow = window.open(url, '_blank');

    // 检测是否被拦截
    if (
      !newWindow ||
      newWindow.closed ||
      typeof newWindow.closed === 'undefined'
    ) {
      // 延迟检测，有些浏览器需要时间
      setTimeout(() => {
        if (!newWindow || newWindow.closed) {
          alert(
            '🚫 弹窗被浏览器拦截了！\n\n' +
              '📋 GitHub链接：' +
              url +
              '\n\n' +
              '💡 解决方法：\n' +
              '1. 复制上面的链接到新标签页\n' +
              '2. 或者允许此网站的弹窗权限'
          );
        }
      }, 100);
    }
  }

  // === Star提醒检查（时间间隔策略） ===
  function checkStarReminder() {
    const isDisabled = _GM_getValue(
      STAR_CONFIG.STAR_REMINDER_DISABLED_KEY,
      false
    );
    if (isDisabled) return;

    const now = Date.now();
    const lastReminderTime = _GM_getValue(
      STAR_CONFIG.LAST_STAR_REMINDER_TIME_KEY,
      0
    );
    const daysSinceLastReminder =
      (now - lastReminderTime) / (1000 * 60 * 60 * 24);

    // 检查是否需要提醒
    let shouldRemind = false;
    let currentInterval = 0;

    if (lastReminderTime === 0) {
      // 首次运行
      shouldRemind = true;
    } else {
      // 找到当前应该的间隔
      for (let i = 1; i < STAR_CONFIG.STAR_REMINDER_INTERVALS.length; i++) {
        if (daysSinceLastReminder >= STAR_CONFIG.STAR_REMINDER_INTERVALS[i]) {
          currentInterval = i;
          shouldRemind = true;
        }
      }
    }

    if (shouldRemind) {
      setTimeout(() => {
        showStarReminder(currentInterval);
        _GM_setValue(STAR_CONFIG.LAST_STAR_REMINDER_TIME_KEY, now);
      }, 3000); // 3秒后弹出
    }
  }

  // === 显示Star提醒 ===
  function showStarReminder(intervalIndex) {
    const isFirstTime = intervalIndex === 0;
    const message = isFirstTime
      ? '🎉 感谢使用 Weibo Retro Twitter-Style Clone！\n\n如果这个工具对您有帮助，请考虑给我们点个 ⭐ Star！'
      : '⭐ 再次感谢使用我们的工具！\n\n如果觉得有用，请考虑给项目点个 Star 支持一下！';

    const result = confirm(
      `${message}\n\n` +
        `点击"确定"打开 GitHub 页面\n` +
        `点击"取消"${isFirstTime ? '稍后提醒' : '不再提醒'}`
    );

    if (result) {
      openGitHub();

      // 30秒后询问是否已给star
      setTimeout(() => {
        const hasStarred = confirm(
          '感谢访问我们的 GitHub 页面！\n\n' +
            '如果您已经给了 ⭐ Star，点击"确定"我们将不再提醒\n' +
            '点击"取消"我们稍后再提醒'
        );

        if (hasStarred) {
          _GM_setValue(STAR_CONFIG.STAR_REMINDER_DISABLED_KEY, true);
          alert('🎉 感谢您的 Star！我们将不再显示提醒。');
        }
      }, 30000);
    } else if (!isFirstTime) {
      // 非首次提醒，用户选择取消就不再提醒
      _GM_setValue(STAR_CONFIG.STAR_REMINDER_DISABLED_KEY, true);
    }
  }

  // === 首次运行检查 ===
  function checkFirstRun() {
    const isFirstRun = !_GM_getValue(STAR_CONFIG.FIRST_RUN_KEY, false);

    if (isFirstRun) {
      setTimeout(() => {
        const shouldSync = confirm(
          '🎉 欢迎使用 Weibo Retro Twitter-Style Clone！\n\n' +
            '首次使用建议进行全量黑名单同步以确保最佳效果。\n' +
            '这个过程可能需要几分钟时间。\n\n' +
            '点击"确定"现在同步，"取消"稍后手动同步'
        );

        if (shouldSync) {
          // 调用全量同步（这里使用现有的全量同步函数）
          (async () => {
            try {
              const oldSize = BL.size;
              BL = await fullSync();
              alert(
                `🎉 黑名单同步完成！共获取到 ${BL.size} 个用户（新增 ${
                  BL.size - oldSize
                }）`
              );
            } catch (error) {
              alert('❌ 同步过程中出现错误，请稍后手动同步');
              console.error('First run sync error:', error);
            }
          })();
        }
      }, 2000);

      _GM_setValue(STAR_CONFIG.FIRST_RUN_KEY, true);
    }
  }

  function useOption(key, title, defaultVal) {
    let val = _GM_getValue(key, defaultVal);
    _GM_registerMenuCommand(`${title}: ${val ? '✅' : '❌'}`, () => {
      val = !val;
      _GM_setValue(key, val);
      location.reload();
    });
    return {
      get value() {
        return val;
      },
    };
  }
  const timelineDefault = useOption('defaultLatest', '默认最新微博', true);

  // === 强制切换到"最新微博"分栏 ===
  (function forceLatestTab() {
    if (!timelineDefault.value) return;
    if (
      location.hostname === 'weibo.com' &&
      (location.pathname === '/' || location.pathname === '')
    ) {
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
  const UID_KEY = 'WB_BL_list'; // 本地存 UID
  const THROTTLE_MS = 300; // 节流（毫秒）
  const MAX_418 = 3; // 连续 418 次数上限
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 保存原生接口
  if (!window.WB_BL_NATIVE) {
    window.WB_BL_NATIVE = {
      fetch: window.fetch,
      XHROpen: XMLHttpRequest.prototype.open,
      XHRSend: XMLHttpRequest.prototype.send,
      WebSocket: window.WebSocket,
    };
  }

  /**
   * 全量同步：只在用户手动触发或无缓存时使用
   */
  async function fullSync() {
    const list = [];
    let page = 1,
      cursor = 0,
      strikes = 0;
    while (true) {
      let url = `/ajax/setting/getFilteredUsers?page=${page}`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await window.WB_BL_NATIVE.fetch(url, {
        credentials: 'include',
      });
      if (res.status === 418) {
        if (++strikes > MAX_418) break;
        await sleep(3000);
        continue;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      (data.card_group || []).forEach((item) => {
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
    const res = await window.WB_BL_NATIVE.fetch(
      '/ajax/setting/getFilteredUsers?page=1',
      { credentials: 'include' }
    );
    if (!res.ok) return set;
    const data = await res.json();
    let added = 0;
    (data.card_group || []).forEach((item) => {
      const m = item.scheme.match(/uid=(\d{5,})/);
      if (m && !set.has(m[1])) {
        set.add(m[1]);
        added++;
      }
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
    let page = 1,
      cursor = 0,
      strikes = 0,
      added = 0;
    while (page <= pages) {
      let url = `/ajax/setting/getFilteredUsers?page=${page}`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await window.WB_BL_NATIVE.fetch(url, {
        credentials: 'include',
      });
      if (res.status === 418) {
        if (++strikes > MAX_418) break;
        await sleep(3000);
        continue;
      }
      if (!res.ok) break;
      const data = await res.json();
      (data.card_group || []).forEach((item) => {
        const m = item.scheme.match(/uid=(\d{5,})/);
        if (m && !set.has(m[1])) {
          set.add(m[1]);
          added++;
        }
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

    // 检查首次运行和Star提醒
    checkFirstRun();
    checkStarReminder();
  })();

  function generateCSSRules() {
    const blRules = Array.from(BL)
      .map(
        (uid) => `
      .Feed_body_3R0rO:has([data-user-id="${uid}"]),
      .card-wrap:has([data-user-id="${uid}"]) {
        display: none !important;
      }
    `
      )
      .join('\n');
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
      Object.entries(o).forEach(([k, v]) => {
        if (
          /^(?:uid|user_id|userId|id|idstr)$/i.test(k) &&
          typeof v === 'string' &&
          /^\d{5,}$/.test(v)
        ) {
          uids.add(v);
        }
        if (k === 'user' && v && v.id) uids.add(String(v.id));
        if (Array.isArray(v)) v.forEach(trav);
        else if (v && typeof v === 'object') trav(v);
      });
    })(data);
    return uids;
  }

  function filterData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj
        .filter((item) => ![...extractUIDs(item)].some((uid) => BL.has(uid)))
        .map(filterData);
    }
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = Array.isArray(v)
        ? filterData(v)
        : v && typeof v === 'object'
        ? filterData(v)
        : v;
    }
    return out;
  }

  // === 全局 Fetch 拦截 ===
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input.url;
    // 永久屏蔽"全部关注"流
    if (url.includes('unreadfriendstimeline')) {
      return new Response(
        JSON.stringify({
          ok: 1,
          statuses: [],
          since_id_str: '0',
          max_id_str: '0',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    // 黑名单增删
    if (typeof url === 'string') {
      if (url.includes('/filterUser')) {
        const uid = JSON.parse(init?.body || '{}').uid;
        BL.add(String(uid));
        _GM_setValue(UID_KEY, [...BL].join(','));
      }
      if (url.includes('/unfilterUser')) {
        const uid = JSON.parse(init?.body || '{}').uid;
        BL.delete(String(uid));
        _GM_setValue(UID_KEY, [...BL].join(','));
      }
    }
    const res = await window.WB_BL_NATIVE.fetch(input, init);
    if (
      typeof url === 'string' &&
      /\/(?:ajax\/(?:feed|statuses|comment|getCommentList|repost|like)|graphql\/|(?:mymblog|timeline|index))/.test(
        url
      )
    ) {
      try {
        const data = await res.clone().json();
        return new Response(
          JSON.stringify(filterData(data)),
          { status: res.status, statusText: res.statusText, headers: res.headers }
        );
      } catch {}
    }
    return res;
  };

  // === XHR 拦截 ===
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this._url = url;
    return window.WB_BL_NATIVE.XHROpen.call(this, method, url, ...args);
  };
  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('readystatechange', () => {
      if (this.readyState === 4 && this.status === 200 && this._url) {
        // 屏蔽"全部关注"流
        if (this._url.includes('unreadfriendstimeline')) {
          Object.defineProperty(this, 'responseText', {
            configurable: true,
            get: () => JSON.stringify({
              ok: 1,
              statuses: [],
              since_id_str: '0',
              max_id_str: '0',
            }),
          });
          return;
        }
        // 过滤黑名单内容
        if (
          /\/(?:ajax\/(?:feed|statuses)|(?:mymblog|timeline))/.test(this._url)
        ) {
          try {
            const o = JSON.parse(this.responseText);
            Object.defineProperty(this, 'responseText', {
              configurable: true,
              get: () => JSON.stringify(filterData(o)),
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
      this.addEventListener('message', (evt) => {
        try {
          const o = JSON.parse(evt.data);
          evt.data = JSON.stringify(filterData(o));
        } catch {}
      });
    }
  };

  // === MutationObserver 过滤 ===
  (function () {
    const obs = new MutationObserver((ms) => {
      clearTimeout(window._wbbl_t);
      window._wbbl_t = setTimeout(() => {
        ms.forEach((m) => {
          Array.from(m.addedNodes).forEach((n) => {
            if (n instanceof HTMLElement && n.matches('.Feed_body_3R0rO')) {
              if (
                [...n.querySelectorAll('[data-user-id]')].some((el) =>
                  BL.has(el.getAttribute('data-user-id'))
                )
              ) {
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
        history.pushState = function (s, title, url) {
          push.call(this, s, title, url);
          obs.disconnect();
          obs.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
          });
        };
      } else {
        setTimeout(attach, 50);
      }
    };
    attach();
  })();

  /* === Tampermonkey 菜单 === */

  // 更新（第一页增量）
  _GM_registerMenuCommand('🔄 更新黑名单', async () => {
    const oldSize = BL.size;
    BL = await deltaSync(new Set(BL));
    _GM_setValue(UID_KEY, [...BL].join(','));
    alert(`黑名单更新完成！新增 ${BL.size - oldSize} 个用户`);
  });

  // 五页同步
  _GM_registerMenuCommand('📄 同步前五页黑名单', async () => {
    const added = await syncPages(BL, 5);
    alert(`同步五页完成！新增 ${added} 个用户`);
  });

  // 全量同步
  _GM_registerMenuCommand('🔄 全量同步黑名单', async () => {
    const oldSize = BL.size;
    BL = await fullSync();
    alert(`全量同步完成！新增 ${BL.size - oldSize} 个用户（共 ${BL.size}）`);
  });

  // Star相关菜单
  _GM_registerMenuCommand('⭐ 给我们 Star', () => {
    openGitHub();
  });

  _GM_registerMenuCommand('🔕 不再提醒Star', () => {
    const shouldDisable = confirm(
      '确认要关闭 Star 提醒吗？\n\n' + '这将永久停止所有 Star 相关提醒'
    );

    if (shouldDisable) {
      _GM_setValue(STAR_CONFIG.STAR_REMINDER_DISABLED_KEY, true);
      alert('✅ Star 提醒已关闭');
    }
  });

  _GM_registerMenuCommand('ℹ️ 关于', () => {
    const isDisabled = _GM_getValue(
      STAR_CONFIG.STAR_REMINDER_DISABLED_KEY,
      false
    );
    const starStatus = isDisabled ? '🔕 Star提醒已关闭' : '🔔 Star提醒已开启';

    alert(
      `Weibo Retro Twitter-Style Clone v1.0.0\n` +
        `模仿早期Twitter时间线的完整版微博增强工具\n\n` +
        `当前缓存: ${BL.size} 个用户\n` +
        `${starStatus}\n\n` +
        `作者: DanielZenFlow\n` +
        `许可: MIT License\n` +
        `GitHub: https://github.com/DanielZenFlow/Weibo-Blacklist-Enhanced-Lite\n\n` +
        `感谢使用！如果有帮助请给我们 Star ⭐`
    );
  });

  console.log(
    `[WB-BL] 启动完成 v1.0.0，模仿早期Twitter流式时间线，已缓存 ${BL.size} UIDs`
  );
  console.log(
    `[WB-BL] Author: DanielZenFlow | GitHub: https://github.com/DanielZenFlow/Weibo-Blacklist-Enhanced-Lite`
  );
})();

/* === Settings v4 (no whitelist) + DOM toggles + BL add/remove === */
(function(){
  'use strict';
  const UID_KEY = 'WB_BL_list';

  const DEFAULTS = {
    hideHotSearch: true,
    hideSuggestedPeople: true
  };

  function loadCfg() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(GM_getValue('cfg', '{}'))); }
    catch { return Object.assign({}, DEFAULTS); }
  }
  function saveCfg(cfg) { GM_setValue('cfg', JSON.stringify(cfg||{})); }
  let CFG = loadCfg();

  // ---- BL Store helpers (operate on GM cache only) ----
  function readBLSet() {
    const raw = GM_getValue(UID_KEY, '');
    if (!raw) return new Set();
    return new Set(raw.split(',').map(s => String(s).trim()).filter(Boolean));
  }
  function writeBLSet(set) {
    GM_setValue(UID_KEY, Array.from(set).join(','));
  }
  function addToBL(uids) {
    const set = readBLSet();
    uids.forEach(u=>set.add(String(u).trim()));
    writeBLSet(set);
    return set.size;
  }
  function removeFromBL(uids) {
    const set = readBLSet();
    uids.forEach(u=>set.delete(String(u).trim()));
    writeBLSet(set);
    return set.size;
  }
  function parseUIDInput(text) {
    return (text||'')
      .split(/[^0-9]+/g)  // allow comma/space/newline
      .map(s => s.trim())
      .filter(s => /^\d{5,}$/.test(s));
  }

  // ---- DOM hider based on titles ----
  function normText(s){return (s||'').replace(/\s+/g,'').trim();}
  function buildBlockTitles(){
    const t=[];
    if (CFG.hideHotSearch) t.push('微博热搜');
    if (CFG.hideSuggestedPeople) t.push('你可能感兴趣的人');
    return new Set(t);
  }
  function findSectionRootFromHeading(h){
    let cur=h;
    while(cur&&cur!==document.documentElement){
      const hasHotSearchParts = cur.querySelector('.wbpro-side-bottom, .wbpro-side-card7, [class*="cardHotSearch_tab_"]');
      const isSidePanel = cur.matches('.wbpro-side, .wbpro-side-panel, [class*="Card_wrap_"]');
      if (hasHotSearchParts || isSidePanel) return cur;
      cur = cur.parentElement;
    }
    return h.closest('.wbpro-side, .wbpro-side-panel, [class*="Card_wrap_"]') || h;
  }
  function hidePanels(root=document){
    const BLOCK_TITLES = buildBlockTitles();
    const headings = root.querySelectorAll('.wbpro-side-tit .cla, [class*="cardHotSearch_tit_"] .cla, .wbpro-side .f16.fm.cla, .wbpro-side-tit .woo-box-item-flex');
    headings.forEach(h=>{
      const text = normText(h.textContent);
      if (!text) return;
      for (const t of BLOCK_TITLES){
        if (text.includes(normText(t))){
          const panel = findSectionRootFromHeading(h);
          if (panel && !panel.dataset.__wb_hidden_by_userscript){
            panel.style.setProperty('display','none','important');
            panel.dataset.__wb_hidden_by_userscript='1';
          }
          break;
        }
      }
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>hidePanels());
  else hidePanels();
  const mo = new MutationObserver(m=>{for(const r of m){for(const n of r.addedNodes){if(n.nodeType===1) hidePanels(n);}}});
  mo.observe(document.documentElement,{childList:true,subtree:true});

  // ---- Settings UI ----
  function ensureStyles(){
    const css=`
    .wbset-btn{position:fixed;right:24px;bottom:24px;z-index:999999;border:0;border-radius:999px;padding:10px 12px;background:#111;color:#fff;font-size:13px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.2);}
    .wbset-panel{position:fixed;inset:0;z-index:999998;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.35);}
    .wbset-card{width:min(620px,92vw);max-height:86vh;overflow:auto;background:#fff;color:#111;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);}
    .wbset-hdr{padding:14px 18px;border-bottom:1px solid #eee;font-weight:600;font-size:15px;display:flex;align-items:center;justify-content:space-between;}
    .wbset-bdy{padding:16px 18px;display:grid;gap:14px;}
    .wbset-sec{padding:12px 12px;border:1px solid #f0f0f0;border-radius:12px}
    .wbset-sec h4{margin:0 0 8px 0;font-size:14px}
    .wbset-row{display:flex;align-items:center;gap:8px;margin:6px 0}
    .wbset-row input[type="text"], .wbset-row textarea{flex:1;padding:8px 10px;border:1px solid #ddd;border-radius:8px}
    .wbset-note{font-size:12px;color:#777}
    .wbset-ftr{padding:14px 18px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end}
    .wbset-btn2{border:0;border-radius:10px;padding:10px 14px;cursor:pointer}
    .wbset-btn2.primary{background:#111;color:#fff}
    .wbset-btn2.ghost{background:#f6f6f6}
    `;
    if (typeof GM_addStyle==='function') GM_addStyle(css);
    else { const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); }
  }

  function openPanel(){
    ensureStyles();
    let panel=document.querySelector('.wbset-panel');
    if(!panel){
      panel=document.createElement('div');
      panel.className='wbset-panel';
      panel.innerHTML=`
        <div class="wbset-card" role="dialog" aria-modal="true">
          <div class="wbset-hdr">
            <div>脚本设置</div>
            <button class="wbset-btn2 ghost" id="wbset-close">关闭</button>
          </div>
          <div class="wbset-bdy">
            <div class="wbset-sec">
              <h4>版块隐藏</h4>
              <label class="wbset-row"><input type="checkbox" id="wbset-hot"> 隐藏：微博热搜</label>
              <label class="wbset-row"><input type="checkbox" id="wbset-sug"> 隐藏：你可能感兴趣的人</label>
              <div class="wbset-row wbset-note">说明：仅影响侧栏版块的显示，不改动你的黑名单数据。</div>
            </div>

            <div class="wbset-sec">
              <h4>黑名单管理</h4>
              <div class="wbset-row">
                <textarea id="wbset-uids" rows="2" placeholder="输入一个或多个 UID，支持逗号/空格/换行分隔"></textarea>
              </div>
              <div class="wbset-row">
                <button class="wbset-btn2" id="wbset-bl-add">加入黑名单</button>
                <button class="wbset-btn2" id="wbset-bl-remove">从黑名单移除</button>
                <button class="wbset-btn2 ghost" id="wbset-reload">重载页面</button>
              </div>
              <div class="wbset-row">
                <span class="wbset-note">当前缓存 UID 数：<b id="wbset-count">-</b></span>
                <button class="wbset-btn2 ghost" id="wbset-refresh">刷新统计</button>
              </div>
              <div class="wbset-row wbset-note">
                注：移除后立即写入本地缓存（WB_BL_list）。原脚本的内存列表会在页面刷新后与缓存同步，
                因此“关于”里的统计建议刷新页面后再看。
              </div>
            </div>
          </div>
          <div class="wbset-ftr">
            <button class="wbset-btn2 ghost" id="wbset-cancel">取消</button>
            <button class="wbset-btn2 primary" id="wbset-save">保存</button>
          </div>
        </div>
      `;
      document.body.appendChild(panel);

      const $hot = panel.querySelector('#wbset-hot');
      const $sug = panel.querySelector('#wbset-sug');
      const $uids = panel.querySelector('#wbset-uids');
      const $count = panel.querySelector('#wbset-count');

      function refreshCfgUI(){
        $hot.checked = !!CFG.hideHotSearch;
        $sug.checked = !!CFG.hideSuggestedPeople;
      }
      function refreshCount(){
        $count.textContent = String(readBLSet().size);
      }

      refreshCfgUI();
      refreshCount();

      panel.querySelector('#wbset-refresh').addEventListener('click', refreshCount);
      panel.querySelector('#wbset-reload').addEventListener('click', ()=>location.reload());

      panel.querySelector('#wbset-bl-add').addEventListener('click', ()=>{
        const ids = parseUIDInput($uids.value);
        if (!ids.length) return alert('请输入有效的 UID');
        const size = addToBL(ids);
        refreshCount();
        alert(`已加入 ${ids.length} 个 UID，当前缓存总数：${size}`);
      });
      panel.querySelector('#wbset-bl-remove').addEventListener('click', ()=>{
        const ids = parseUIDInput($uids.value);
        if (!ids.length) return alert('请输入有效的 UID');
        const size = removeFromBL(ids);
        refreshCount();
        alert(`已从黑名单移除 ${ids.length} 个 UID，当前缓存总数：${size}\n（建议点击“重载页面”使内存列表立即生效）`);
      });

      panel.querySelector('#wbset-save').addEventListener('click', ()=>{
        CFG.hideHotSearch = $hot.checked;
        CFG.hideSuggestedPeople = $sug.checked;
        saveCfg(CFG);
        panel.style.display='none';
        hidePanels(document);
      });
      panel.querySelector('#wbset-cancel').addEventListener('click', ()=>{
        CFG = loadCfg();
        panel.style.display='none';
      });
      panel.querySelector('#wbset-close').addEventListener('click', ()=>{
        CFG = loadCfg();
        panel.style.display='none';
      });
      panel.addEventListener('click', (e)=>{ if(e.target===panel){ panel.style.display='none'; }});
    }
    panel.style.display='flex';
  }

  function initLauncher(){
    ensureStyles();
    const btn=document.createElement('button');
    btn.className='wbset-btn';
    btn.textContent='设置';
    btn.title='脚本设置';
    btn.addEventListener('click', openPanel);
    document.documentElement.appendChild(btn);
    if (typeof GM_registerMenuCommand==='function') {
      GM_registerMenuCommand('打开脚本设置', openPanel);
    }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', initLauncher);
  else initLauncher();

})();
/* === /Settings v4 === */
