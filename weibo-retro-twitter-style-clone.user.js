// ==UserScript==
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
        return new Response(JSON.stringify(filterData(data)), res);
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
            value: JSON.stringify({
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
              value: JSON.stringify(filterData(o)),
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
