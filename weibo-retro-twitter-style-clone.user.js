// ==UserScript==
// @sandbox      raw
// @name         微博按时间线显示|隐藏黑名单用户所有言论|屏蔽热搜
// @namespace    https://github.com/DanielZenFlow
// @version      1.2.1
// @description  增强版：模仿早期Twitter的时间线展示。自动切换到"最新微博"；全接口劫持并隐藏黑名单用户所有言论与转发；隐藏除"最新微博"外导航项、微博热搜、游戏入口、推荐关注等模块；单一防抖MutationObserver；SPA路由清理；手动更新黑名单功能；永久屏蔽"全部关注"接口返回内容；新增全量同步与五页同步黑名单菜单。
// @author       DanielZenFlow
// @license      MIT
// @homepage     https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone
// @supportURL   https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone/issues
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com/set/*
// @match        http://s.weibo.com/*
// @match        https://s.weibo.com/*
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
 * GitHub: [DanielZenFlow/Weibo-Retro-Twitter-Style-Clone](https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone)
 */

(function () {
  'use strict';

  const SCRIPT_VERSION = '1.2.1';

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
      'https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone';

    // 优先使用油猴的专用API（不会被拦截）
    if (_GM_openInTab) {
      _GM_openInTab(url, { active: true });
      return;
    }

    // 降级到普通弹窗
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    try {
      if (newWindow) newWindow.opener = null;
    } catch {}

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
    if (!canUseSettingApi()) return;

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
    if (!canUseSettingApi()) return;

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
              refreshBlockedDOMAfterBLChange({ restoreHidden: true });
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

  // 读取时间线默认设置（不再创建油猴菜单，统一在设置面板管理）
  function getTimelineDefault() {
    try {
      const cfg = JSON.parse(_GM_getValue('cfg', '{}'));
      return cfg.defaultLatestTimeline !== false; // 默认 true
    } catch {
      return true;
    }
  }
  const timelineDefault = {
    get value() {
      return getTimelineDefault();
    },
  };

  // === 强制切换到"最新微博"分栏 ===
  // 策略：1. API层面劫持，将默认推荐流替换为时间线流
  //       2. DOM层面同步Tab选中状态
  (function forceLatestTab() {
    if (!timelineDefault.value) return;

    const isHomePage = () => {
      return (
        ['weibo.com', 'www.weibo.com'].includes(location.hostname) &&
        (location.pathname === '/' || location.pathname === '')
      );
    };

    // DOM层：确保Tab UI状态正确（点击切换）
    const syncTabUI = () => {
      const btn = document.querySelector('[role="link"][title="最新微博"]');
      if (btn && btn.getAttribute('aria-selected') !== 'true') {
        btn.click();
      }
    };

    if (isHomePage()) {
      // 使用 MutationObserver 监听Tab出现后立即点击（比setTimeout更快）
      const tabObserver = new MutationObserver((mutations, obs) => {
        const btn = document.querySelector('[role="link"][title="最新微博"]');
        if (btn) {
          if (btn.getAttribute('aria-selected') !== 'true') {
            btn.click();
          }
          obs.disconnect();
        }
      });

      // 尽早开始监听
      const startObserve = () => {
        tabObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
        // 5秒后自动停止，防止无限监听
        setTimeout(() => tabObserver.disconnect(), 5000);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserve);
      } else {
        startObserve();
      }
    }

    // SPA路由变化时同步Tab状态
    let currentPath = location.pathname;
    const handleRouteChange = () => {
      syncRelationshipPageMode();
      const newPath = location.pathname;
      if (newPath !== currentPath) {
        const isNowHome = newPath === '/' || newPath === '';
        currentPath = newPath;

        if (isNowHome) {
          // 延迟等待Tab渲染，然后同步UI
          setTimeout(syncTabUI, 100);
          setTimeout(syncTabUI, 300);
          setTimeout(syncTabUI, 600);
        }
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    const origPushState = history.pushState;
    history.pushState = function (...args) {
      origPushState.apply(this, args);
      handleRouteChange();
    };
    const origReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      handleRouteChange();
    };
  })();

  // === 黑名单数据与同步 ===
  const UID_KEY = 'WB_BL_list'; // 本地存 UID
  const BLOCKED_CONTENT_HIDE_ATTR = 'data-__wb_bl_hidden_by_userscript';
  const BLOCKED_CONTENT_UID_ATTR = 'data-__wb_bl_hidden_uid';
  const BLOCKED_CONTENT_HIDE_SELECTOR = `[${BLOCKED_CONTENT_HIDE_ATTR}]`;
  const RELATIONSHIP_PAGE_ATTR = 'data-__wb_relationship_list_page';
  const LAYOUT_REFRESH_EVENT = 'wb-retro-layout-refresh';
  const FLOATING_VIDEO_PLAYER_SELECTOR = [
    '.mini-player',
    '[class*="mini-player"]',
    '[class*="miniPlayer"]',
    '[class*="MiniPlayer"]',
    '[class*="_miniPlayer_"]',
  ].join(',');
  const COMPACTED_VIRTUAL_ITEM_ATTR = 'data-__wb_compacted_virtual_item';
  const COMPACTED_TOP_ITEM_ATTR = 'data-__wb_compacted_top_item';
  const COMPACTED_VIRTUAL_WRAPPER_ATTR =
    'data-__wb_compacted_virtual_wrapper';
  const ORIGINAL_TRANSLATE_Y_ATTR = 'data-__wb_original_translate_y';
  const ORIGINAL_TRANSLATE_X_ATTR = 'data-__wb_original_translate_x';
  const ORIGINAL_TOP_ATTR = 'data-__wb_original_top';
  const ORIGINAL_LAYOUT_MODE_ATTR = 'data-__wb_original_layout_mode';
  const ORIGINAL_TRANSFORM_STYLE_ATTR = 'data-__wb_original_transform_style';
  const ORIGINAL_TOP_STYLE_ATTR = 'data-__wb_original_top_style';
  const ORIGINAL_SLOT_HEIGHT_ATTR = 'data-__wb_original_slot_height';
  const ORIGINAL_WRAPPER_MIN_HEIGHT_ATTR =
    'data-__wb_original_wrapper_min_height';
  const VIRTUAL_VIEW_SELECTOR = [
    '.vue-recycle-scroller__item-view',
    '[class*="vue-recycle-scroller__item-view"]',
  ].join(',');
  const VIRTUAL_WRAPPER_SELECTOR = [
    '.vue-recycle-scroller__item-wrapper',
    '[class*="vue-recycle-scroller__item-wrapper"]',
  ].join(',');
  const VIRTUAL_ITEM_SELECTOR = [
    '.vue-recycle-scroller__item-view',
    '[class*="vue-recycle-scroller__item-view"]',
    '[class*="wbpro-scroller-item"]',
    '[style*="translateY("]',
    '[style*="translate3d("]',
    '[style*="translate("]',
    '[style*="matrix("]',
    '[style*="top:"]',
  ].join(',');
  let virtualScrollerCompactionState = new WeakMap();
  const THROTTLE_MS = 300; // 节流（毫秒）
  const MAX_418 = 3; // 连续 418 次数上限
  const MAIN_WEIBO_HOSTS = new Set(['weibo.com', 'www.weibo.com']);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const canUseSettingApi = () => MAIN_WEIBO_HOSTS.has(location.hostname);
  const SETTING_API_HOST_ERROR = '请在 weibo.com 主站页面同步黑名单';

  // 保存原生接口。不要挂到 window，避免页面脚本绕过过滤器或读取内部状态。
  const WB_BL_NATIVE = {
    fetch: window.fetch.bind(window),
    XHROpen: XMLHttpRequest.prototype.open,
    XHRSend: XMLHttpRequest.prototype.send,
    WebSocket: window.WebSocket,
  };

  function extractUIDFromScheme(item) {
    const m = String(item?.scheme || '').match(/uid=(\d{5,})/);
    return m ? m[1] : '';
  }

  /**
   * 全量同步：只在用户手动触发或无缓存时使用
   */
  async function fullSync() {
    if (!canUseSettingApi()) {
      throw new Error(SETTING_API_HOST_ERROR);
    }
    const list = [];
    let page = 1,
      cursor = 0,
      strikes = 0;
    while (true) {
      let url = `/ajax/setting/getFilteredUsers?page=${page}`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await WB_BL_NATIVE.fetch(url, {
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
        const uid = extractUIDFromScheme(item);
        if (uid) list.push(uid);
      });
      if (!data.next_cursor) break;
      cursor = data.next_cursor;
      page++;
      await sleep(THROTTLE_MS);
    }
    const merged = readLocalBLCache();
    list.forEach((uid) => merged.add(uid));
    _GM_setValue(UID_KEY, Array.from(merged).join(','));
    return merged;
  }

  /**
   * 增量同步：默认只跑第一页
   */
  async function deltaSync(set, options = {}) {
    if (!canUseSettingApi()) {
      if (options.silent) return set;
      throw new Error(SETTING_API_HOST_ERROR);
    }
    const res = await WB_BL_NATIVE.fetch(
      '/ajax/setting/getFilteredUsers?page=1',
      { credentials: 'include' }
    );
    if (!res.ok) return set;
    const data = await res.json();
    let added = 0;
    (data.card_group || []).forEach((item) => {
      const uid = extractUIDFromScheme(item);
      if (uid && !set.has(uid)) {
        set.add(uid);
        added++;
      }
    });
    const { merged, changed } = mergeWithLocalBLCache(set);
    replaceSetContents(set, merged);
    if (added || changed) _GM_setValue(UID_KEY, Array.from(set).join(','));
    return set;
  }

  /**
   * 指定页数同步（默认 5 页）
   * @param {Set}   set    现有 BL 集合
   * @param {Number}pages  要同步的页数
   * @returns {Number} 新增 UID 数
   */
  async function syncPages(set, pages = 5) {
    if (!canUseSettingApi()) {
      throw new Error(SETTING_API_HOST_ERROR);
    }
    let page = 1,
      cursor = 0,
      strikes = 0,
      added = 0;
    while (page <= pages) {
      let url = `/ajax/setting/getFilteredUsers?page=${page}`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await WB_BL_NATIVE.fetch(url, {
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
        const uid = extractUIDFromScheme(item);
        if (uid && !set.has(uid)) {
          set.add(uid);
          added++;
        }
      });
      if (!data.next_cursor) break;
      cursor = data.next_cursor;
      page++;
      await sleep(THROTTLE_MS);
    }
    const { merged, changed } = mergeWithLocalBLCache(set);
    replaceSetContents(set, merged);
    if (added || changed) _GM_setValue(UID_KEY, Array.from(set).join(','));
    return added;
  }

  let BL = new Set();

  function readLocalBLCache() {
    const cache = _GM_getValue(UID_KEY, '');
    return new Set(
      String(cache || '')
        .split(',')
        .map((uid) => uid.trim())
        .filter((uid) => /^\d{5,}$/.test(uid))
    );
  }

  function replaceSetContents(target, source) {
    target.clear();
    source.forEach((uid) => target.add(uid));
    return target;
  }

  function mergeWithLocalBLCache(set) {
    const merged = readLocalBLCache();
    const before = merged.size;
    set.forEach((uid) => merged.add(uid));
    return {
      merged,
      changed: merged.size !== before,
    };
  }

  function restoreBlockedContentHideState(root = document) {
    if (!root || !root.querySelectorAll) return;
    virtualScrollerCompactionState = new WeakMap();
    clearVirtualCompactionState(root);
    const nodes = [];
    if (root instanceof Element && root.matches(BLOCKED_CONTENT_HIDE_SELECTOR)) {
      nodes.push(root);
    }
    root
      .querySelectorAll(BLOCKED_CONTENT_HIDE_SELECTOR)
      .forEach((node) => nodes.push(node));
    Array.from(new Set(nodes)).forEach((node) =>
      clearBlockedContentHideState(node)
    );
  }

  function refreshBlockedDOMAfterBLChange(options = {}) {
    syncRelationshipPageMode();
    if (isRelationshipListPage()) {
      restoreHiddenRelationshipItems(document);
      return;
    }
    if (options.restoreHidden) {
      restoreBlockedContentHideState(document);
    }
    hideBlockedDOMPosts(document);
    compactVirtualScrollerGaps(document);
    if (options.nudgeLayout !== false) {
      scheduleBlockedDOMRefresh();
      nudgeTimelineLayout();
    }
  }

  function reloadLocalBLFromStorage(options = {}) {
    BL = readLocalBLCache();
    refreshBlockedDOMAfterBLChange({
      restoreHidden: options.restoreHidden !== false,
      nudgeLayout: options.nudgeLayout !== false,
    });
    return BL.size;
  }

  // 将同步能力暴露给设置面板，但不暴露完整 UID 集合。
  const WB_BL_SYNC_BRIDGE = Object.freeze({
    getCount: () => BL.size,
    reloadFromStorage: (options = {}) => reloadLocalBLFromStorage(options),
    fullSync: async () => {
      BL = await fullSync();
      refreshBlockedDOMAfterBLChange({ restoreHidden: true });
      return BL.size;
    },
    deltaSync: async () => {
      const before = BL.size;
      BL = await deltaSync(BL);
      refreshBlockedDOMAfterBLChange({ restoreHidden: false });
      return {
        added: BL.size - before,
        total: BL.size,
      };
    },
    syncPages: async (pages) => {
      const count = Math.max(1, Math.min(Number(pages) || 5, 20));
      const added = await syncPages(BL, count);
      refreshBlockedDOMAfterBLChange({ restoreHidden: false });
      return {
        added,
        total: BL.size,
      };
    },
  });
  try {
    Object.defineProperty(window, 'WB_BL_SYNC', {
      value: WB_BL_SYNC_BRIDGE,
      configurable: false,
      writable: false,
    });
  } catch {}

  (async () => {
    syncRelationshipPageMode();
    BL = readLocalBLCache();
    // 启动时静默合并官方黑名单第一页，修复官方已拉黑但本地未屏蔽的近期用户。
    try {
      BL = await deltaSync(BL, { silent: true });
    } catch (e) {
      console.warn('[WB-BL] 黑名单增量同步失败，继续使用本地缓存', e);
    }
    injectCSSWhenReady(generateCSSRules());
    clearVirtualCompactionState(document);
    refreshBlockedDOMAfterBLChange({
      restoreHidden: false,
      nudgeLayout: false,
    });

    // 检查首次运行和Star提醒
    checkFirstRun();
    checkStarReminder();
  })();

  function generateCSSRules() {
    // 从设置中读取是否隐藏导航栏入口。兼容旧版 hideNavVideoRecommend。
    let cfg = {};
    try {
      cfg = JSON.parse(_GM_getValue('cfg', '{}') || '{}');
    } catch (e) {}

    const legacyHideNav = cfg.hideNavVideoRecommend === true;
    const hideHotSearch = cfg.hideHotSearch !== false;
    const hideNavVideo = cfg.hideNavVideo === true || legacyHideNav;
    const hideNavRecommend = cfg.hideNavRecommend === true || legacyHideNav;
    const hideNavGame = cfg.hideNavGame !== false;
    const hideNavSelectors = [];

    if (hideNavVideo) {
      hideNavSelectors.push(
        'nav a[title="视频"]',
        'nav [title="视频"]',
        '[class*="_item_"][title="视频"]',
        'a[href*="/tv"]',
        'nav svg[title="视频"]',
        '[class*="Nav_"] a[href*="/tv"]'
      );
    }

    if (hideNavRecommend) {
      hideNavSelectors.push(
        'nav a[title="推荐"]',
        'nav [title="推荐"]',
        '[class*="_item_"][title="推荐"]',
        'a[href*="/hot"]',
        'nav svg[title="画板"]',
        '[class*="Nav_"] a[href*="/hot"]'
      );
    }

    if (hideNavGame) {
      hideNavSelectors.push('a[title="游戏"]', 'a[href*="game.weibo.com"]');
    }

    const hideNavIconsCSS = hideNavSelectors.length
      ? `
          /* 隐藏导航栏入口 */
          ${hideNavSelectors.join(',\n          ')} {
            display: none !important;
          }
        `
      : '';
    const hideSearchHotBandCSS = hideHotSearch
      ? `
          /* 隐藏微博搜索页热搜榜 */
          #hot-band-container,
          .hot-band-container,
          .hot-band-tabs,
          div:has(> .hot-band-tabs),
          div:has(> #hot-band-container),
          div:has(> .hot-band-container),
          .card-wrap:has(.hot-band-tabs),
          .card-wrap:has(.hot-band-container),
          [class*="card"]:has(> .hot-band-tabs),
          [class*="card"]:has(> .hot-band-container),
          [class*="Card"]:has(> .hot-band-tabs) {
            display: none !important;
          }
        `
      : '';

    return `
      ${BLOCKED_CONTENT_HIDE_SELECTOR} {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        overflow: hidden !important;
      }
      html[${RELATIONSHIP_PAGE_ATTR}="1"] ${BLOCKED_CONTENT_HIDE_SELECTOR} {
        display: revert !important;
        height: auto !important;
        min-height: 0 !important;
        margin: revert !important;
        padding: revert !important;
        border: revert !important;
        overflow: visible !important;
      }
      html[${RELATIONSHIP_PAGE_ATTR}="1"] ${BLOCKED_CONTENT_HIDE_SELECTOR}.woo-box-flex,
      html[${RELATIONSHIP_PAGE_ATTR}="1"] ${BLOCKED_CONTENT_HIDE_SELECTOR}[class*="woo-box-flex"],
      html[${RELATIONSHIP_PAGE_ATTR}="1"] ${BLOCKED_CONTENT_HIDE_SELECTOR}.wbpro-scroller-item,
      html[${RELATIONSHIP_PAGE_ATTR}="1"] ${BLOCKED_CONTENT_HIDE_SELECTOR}[class*="wbpro-scroller-item"],
      html[${RELATIONSHIP_PAGE_ATTR}="1"] .vue-recycle-scroller__item-view ${BLOCKED_CONTENT_HIDE_SELECTOR}.woo-box-flex,
      html[${RELATIONSHIP_PAGE_ATTR}="1"] .vue-recycle-scroller__item-view ${BLOCKED_CONTENT_HIDE_SELECTOR}[class*="woo-box-flex"],
      html[${RELATIONSHIP_PAGE_ATTR}="1"] .vue-recycle-scroller__item-view ${BLOCKED_CONTENT_HIDE_SELECTOR}.wbpro-scroller-item,
      html[${RELATIONSHIP_PAGE_ATTR}="1"] .vue-recycle-scroller__item-view ${BLOCKED_CONTENT_HIDE_SELECTOR}[class*="wbpro-scroller-item"] {
        display: flex !important;
      }
      html[${RELATIONSHIP_PAGE_ATTR}="1"] a${BLOCKED_CONTENT_HIDE_SELECTOR},
      html[${RELATIONSHIP_PAGE_ATTR}="1"] div${BLOCKED_CONTENT_HIDE_SELECTOR}:not(.woo-box-flex):not([class*="woo-box-flex"]) {
        display: block !important;
      }
      [${COMPACTED_VIRTUAL_ITEM_ATTR}] {
        transform: translateY(var(--wb-bl-compact-y, 0px)) translateX(var(--wb-bl-compact-x, 0px)) !important;
      }
      [${COMPACTED_TOP_ITEM_ATTR}] {
        top: var(--wb-bl-compact-top, 0px) !important;
      }
      [${COMPACTED_VIRTUAL_WRAPPER_ATTR}] {
        min-height: var(--wb-bl-compact-wrapper-min-height, auto) !important;
      }
      ${FLOATING_VIDEO_PLAYER_SELECTOR} {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      div[role="link"][title="全部关注"] { display: none !important; }
      .Links_box_17T3k { display: none !important; }
      ${hideSearchHotBandCSS}
      ${hideNavIconsCSS}
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

  const MAX_UID_EXTRACTION_NODES = 5000;
  const MAX_FILTER_DEPTH = 80;

  function isLikelyUserPayload(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    return [
      'screen_name',
      'profile_url',
      'profile_image_url',
      'avatar_hd',
      'avatar_large',
      'verified',
      'gender',
      'followers_count',
      'follow_count',
    ].some((key) => Object.prototype.hasOwnProperty.call(obj, key));
  }

  function addUIDIfValid(targetSet, value) {
    const uid = String(value || '').trim();
    if (/^\d{5,}$/.test(uid)) targetSet.add(uid);
  }

  function extractUIDs(data) {
    const uids = new Set();
    const seen = new WeakSet();
    const stack = [data];
    let visited = 0;

    while (stack.length && visited < MAX_UID_EXTRACTION_NODES) {
      const o = stack.pop();
      if (!o || typeof o !== 'object') continue;
      if (seen.has(o)) continue;
      seen.add(o);
      visited++;

      const likelyUser = isLikelyUserPayload(o);
      Object.entries(o).forEach(([k, v]) => {
        const scalar = typeof v === 'number' ? String(v) : v;
        if (
          /^(?:uid|user_id|userId)$/i.test(k) &&
          typeof scalar === 'string' &&
          /^\d{5,}$/.test(scalar)
        ) {
          uids.add(scalar);
        }
        if (
          likelyUser &&
          /^(?:id|idstr)$/i.test(k) &&
          typeof scalar === 'string'
        ) {
          addUIDIfValid(uids, scalar);
        }
        if (k === 'user' && v && typeof v === 'object') {
          addUIDIfValid(uids, v.id);
          addUIDIfValid(uids, v.idstr);
        }
        if (Array.isArray(v)) {
          v.forEach((item) => {
            if (item && typeof item === 'object') stack.push(item);
          });
        } else if (v && typeof v === 'object') {
          stack.push(v);
        }
      });
    }
    return uids;
  }

  function filterData(obj, seen = new WeakMap(), depth = 0) {
    if (isRelationshipListPage()) return obj;
    if (!obj || typeof obj !== 'object') return obj;
    if (depth > MAX_FILTER_DEPTH) return obj;
    if (seen.has(obj)) return seen.get(obj);

    if (Array.isArray(obj)) {
      const out = [];
      seen.set(obj, out);
      obj.forEach((item) => {
        if ([...extractUIDs(item)].some((uid) => BL.has(uid))) return;
        out.push(filterData(item, seen, depth + 1));
      });
      return out;
    }
    const out = {};
    seen.set(obj, out);
    for (const [k, v] of Object.entries(obj)) {
      out[k] = Array.isArray(v)
        ? filterData(v, seen, depth + 1)
        : v && typeof v === 'object'
          ? filterData(v, seen, depth + 1)
          : v;
    }
    return out;
  }

  function isRelationshipFriendsURL(url) {
    return (
      typeof url === 'string' &&
      /\/ajax\/friendships\/friends(?:[?#]|$)/.test(url)
    );
  }

  function normalizeRelationshipFriendsData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const hasOfficialFilteredUsers =
      data.has_filtered_fans === true || data.has_filtered_attentions === true;
    if (!hasOfficialFilteredUsers) return data;

    const displayTotal = Number(data.display_total_number);
    if (!Number.isFinite(displayTotal) || displayTotal < 0) return data;

    const normalized = Object.assign({}, data);
    normalized.total_number = displayTotal;
    return normalized;
  }

  const DOM_UID_SELECTOR = [
    '[data-user-id]',
    '[data-uid]',
    '[uid]',
    '[usercard]',
    '[data-usercard]',
    '[tbinfo*="ouid="]',
    '[action-data*="uid="]',
    '[action-data*="ouid="]',
    '[data-card*="uid"]',
    'a[href*="/u/"]',
    'a[href*="/p/100505"]',
    'a[href*="/n/"]',
    'a[nick-name]',
    '[nick-name]',
    'a[href*="weibo.com/"]',
  ].join(',');
  const DOM_POST_ROOT_SELECTOR = [
    'article',
    '.Feed_body_3R0rO',
    '[class*="Feed_body_"]',
    '[class*="Feed_wrap_"]',
    '[class*="Feed_card_"]',
    '.card-wrap',
    '[action-type="feed_list_item"]',
    '[node-type="feed_list_item"]',
  ].join(',');
  const COMMENT_CONTENT_ROOT_ATTR = 'data-__wb_comment_root_by_userscript';
  const DOM_COMMENT_ROOT_SELECTOR = [
    `[${COMMENT_CONTENT_ROOT_ATTR}]`,
    '.wbpro-list > .item1',
    '.wbpro-list [class~="item1"]',
    '.wbpro-list .list2 > .item2',
    '.wbpro-list [class~="item2"]',
    '[class*="Comment_wrap_"]',
    '[class*="Comment_item_"]',
    '[class*="CommentItem"]',
    '[class*="comment_wrap"]',
    '[class*="comment-item"]',
    '[class*="commentItem"]',
    '[class*="comment_item"]',
    '[action-type*="comment"]',
    '[node-type*="comment"]',
  ].join(',');
  const DOM_CONTENT_ROOT_SELECTOR = [
    DOM_POST_ROOT_SELECTOR,
    DOM_COMMENT_ROOT_SELECTOR,
  ].join(',');
  const PRIMARY_CONTENT_ROOT_SELECTOR = [
    'article',
    '.card-wrap',
    '[action-type="feed_list_item"]',
    '[node-type="feed_list_item"]',
  ].join(',');

  function persistBL() {
    _GM_setValue(UID_KEY, [...BL].join(','));
  }

  function addUIDToLocalBL(uid) {
    const id = String(uid || '').trim();
    if (!/^\d{5,}$/.test(id)) return false;
    readLocalBLCache().forEach((item) => BL.add(item));
    const existed = BL.has(id);
    BL.add(id);
    if (!existed) persistBL();
    return !existed;
  }

  function removeUIDFromLocalBL(uid) {
    const id = String(uid || '').trim();
    if (!/^\d{5,}$/.test(id)) return false;
    readLocalBLCache().forEach((item) => BL.add(item));
    const existed = BL.delete(id);
    if (existed) persistBL();
    return existed;
  }

  function parseUIDFromRequestBody(body) {
    if (!body) return '';

    if (body instanceof URLSearchParams) {
      return body.get('uid') || '';
    }
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      return body.get('uid') || '';
    }
    if (typeof body === 'string') {
      const text = body.trim();
      if (!text) return '';
      try {
        const json = JSON.parse(text);
        if (json?.uid) return String(json.uid);
      } catch {}
      try {
        return new URLSearchParams(text).get('uid') || '';
      } catch {}
      const m = text.match(/(?:^|[?&])uid=(\d{5,})/);
      return m ? m[1] : '';
    }
    if (typeof body === 'object' && body.uid) {
      return String(body.uid);
    }
    return '';
  }

  function parseUIDFromRequestURL(url) {
    try {
      return new URL(url, location.href).searchParams.get('uid') || '';
    } catch {
      const m = String(url || '').match(/(?:^|[?&])uid=(\d{5,})/);
      return m ? m[1] : '';
    }
  }

  function parseUIDFromRequest(url, body) {
    return parseUIDFromRequestBody(body) || parseUIDFromRequestURL(url);
  }

  async function didFilterRequestSucceed(res) {
    if (!res?.ok) return false;
    try {
      const data = await res.clone().json();
      return data?.ok !== 0;
    } catch {
      return true;
    }
  }
  const USER_CONTEXT_TARGET_SELECTOR = [
    '[data-user-id]',
    '[data-uid]',
    '[uid]',
    '[usercard]',
    '[data-usercard]',
    '[nick-name]',
    '[action-data*="uid="]',
    '[action-data*="ouid="]',
    'a[href*="/u/"]',
    'a[href*="/p/100505"]',
    'a[href*="/n/"]',
    'a[href*="//weibo.com/u/"]',
    'a[href*="//weibo.com/p/100505"]',
    'a[href*="//weibo.com/n/"]',
  ].join(',');

  function extractDOMUIDs(el) {
    const uids = new Set();
    const addDirectUID = (value) => {
      const uid = String(value || '').trim();
      if (/^\d{5,}$/.test(uid)) uids.add(uid);
    };
    const addMatches = (value, re) => {
      const text = String(value || '');
      for (const m of text.matchAll(re)) {
        if (m[1]) uids.add(m[1]);
      }
    };

    addDirectUID(el.getAttribute('data-user-id'));
    addDirectUID(el.getAttribute('data-uid'));
    addDirectUID(el.getAttribute('uid'));
    addDirectUID(el.getAttribute('usercard'));
    addDirectUID(el.getAttribute('data-usercard'));

    ['usercard', 'data-usercard'].forEach((attr) => {
      const value = el.getAttribute(attr);
      addMatches(value, /(?:^|[?&#;\s])id=(\d{5,})/g);
      addMatches(
        value,
        /(?:^|[?&#;\s])(?:uid|ouid|user_id|userId|profile_uid)=(\d{5,})/g
      );
    });

    [
      'usercard',
      'data-usercard',
      'action-data',
      'tbinfo',
      'suda-data',
      'diss-data',
      'data-card',
      'data-params',
    ].forEach((attr) => {
      const value = el.getAttribute(attr);
      addMatches(
        value,
        /(?:^|[?&#;\s])(?:uid|ouid|user_id|userId|profile_uid)=(\d{5,})/g
      );
    });

    const href = el.getAttribute('href');
    addMatches(href, /\/u\/(\d{5,})/g);
    addMatches(href, /\/p\/100505(\d{5,})/g);
    addMatches(href, /weibo\.com\/(\d{5,})(?:[/?#]|$)/g);
    addMatches(href, /(?:[?&#])(?:uid|ouid)=(\d{5,})/g);

    return uids;
  }

  function normDOMText(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function isRelationshipListPage() {
    return /^\/u\/page\/follow\/\d+/.test(location.pathname);
  }

  function syncRelationshipPageMode() {
    const root = document.documentElement;
    if (!root) return;
    if (isRelationshipListPage()) {
      root.setAttribute(RELATIONSHIP_PAGE_ATTR, '1');
    } else {
      root.removeAttribute(RELATIONSHIP_PAGE_ATTR);
    }
  }

  function restoreHiddenRelationshipItems(root = document, options = {}) {
    syncRelationshipPageMode();
    if (!isRelationshipListPage() || !document.querySelectorAll) return;
    virtualScrollerCompactionState = new WeakMap();
    clearVirtualCompactionState(document);
    const nodes = new Set();
    const collect = (scope) => {
      if (!scope || !scope.querySelectorAll) return;
      if (
        scope instanceof Element &&
        scope.matches(BLOCKED_CONTENT_HIDE_SELECTOR)
      ) {
        nodes.add(scope);
      }
      scope
        .querySelectorAll(BLOCKED_CONTENT_HIDE_SELECTOR)
        .forEach((el) => nodes.add(el));
    };
    collect(root);
    if (root !== document) collect(document);
    nodes.forEach((el) => {
      clearOwnBlockedContentHideState(el);
      const item = el.closest?.(VIRTUAL_VIEW_SELECTOR);
      if (item) clearVirtualItemCompaction(item);
      const wrapper = el.closest?.(VIRTUAL_WRAPPER_SELECTOR);
      if (wrapper) clearVirtualWrapperCompaction(wrapper);
    });
    if (options.reschedule === false) return;
    const rerun = () =>
      restoreHiddenRelationshipItems(document, { reschedule: false });
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(rerun);
    }
    setTimeout(rerun, 80);
    setTimeout(rerun, 300);
  }

  function clearOwnBlockedContentHideState(el) {
    if (!(el instanceof Element)) return;
    el.removeAttribute(BLOCKED_CONTENT_HIDE_ATTR);
    el.removeAttribute(BLOCKED_CONTENT_UID_ATTR);
    el.removeAttribute(COMMENT_CONTENT_ROOT_ATTR);
    el.style.removeProperty('display');
    el.style.removeProperty('height');
    el.style.removeProperty('min-height');
    el.style.removeProperty('margin');
    el.style.removeProperty('padding');
    el.style.removeProperty('border');
    el.style.removeProperty('overflow');
  }

  function clearBlockedContentHideState(root) {
    if (!(root instanceof Element)) return;
    const nodes = [root];
    root
      .querySelectorAll?.(BLOCKED_CONTENT_HIDE_SELECTOR)
      .forEach((el) => nodes.push(el));
    nodes.forEach((el) => clearOwnBlockedContentHideState(el));
  }

  function getOwnDOMText(el) {
    if (!(el instanceof Element)) return '';
    let text = '';
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent || '';
    });
    return normDOMText(text);
  }

  const BAD_USER_NAME_TEXT = new Set([
    '关注',
    '已关注',
    '互相关注',
    '特别关注',
    '取消关注',
    '粉丝',
    '微博',
  ]);

  function cleanUserDisplayName(text) {
    const name = normDOMText(text).replace(/^@+/, '');
    if (!name || BAD_USER_NAME_TEXT.has(name)) return '';
    if (name.length > 32) return '';
    return name;
  }

  function pushNameCandidate(candidates, text, score) {
    const name = cleanUserDisplayName(text);
    if (name) candidates.push({ name, score });
  }

  function getElementsForUID(root, uid) {
    if (!(root instanceof Element) || !uid) return [];
    const selector = [
      `[data-user-id="${uid}"]`,
      `[data-uid="${uid}"]`,
      `[uid="${uid}"]`,
      `[usercard="${uid}"]`,
      `[data-usercard="${uid}"]`,
      `a[href*="/u/${uid}"]`,
      `a[href*="/p/100505${uid}"]`,
    ].join(',');
    const elements = [];
    if (root.matches(selector)) elements.push(root);
    root.querySelectorAll(selector).forEach((item) => elements.push(item));
    return elements;
  }

  function getNameFromElementAttributes(el) {
    return (
      el.getAttribute?.('nick-name') ||
      el.getAttribute?.('title') ||
      el.getAttribute?.('aria-label') ||
      ''
    );
  }

  function normalizeProfileURL(href, uid) {
    const raw = String(href || '').trim();
    if (!raw || /^(?:javascript:|#)/i.test(raw)) {
      return uid ? `https://weibo.com/u/${uid}` : '';
    }
    const isProfilePath = (pathname) =>
      /^\/u\/\d{5,}(?:\/|$)/.test(pathname) ||
      /^\/p\/100505\d{5,}(?:\/|$)/.test(pathname) ||
      /^\/n\/[^/?#]+/.test(pathname) ||
      /^\/\d{5,}(?:\/|$)/.test(pathname);
    try {
      if (/^\/(?:u|p|n)\//.test(raw)) {
        const relative = new URL(raw, 'https://weibo.com');
        return isProfilePath(relative.pathname)
          ? relative.href
          : uid
            ? `https://weibo.com/u/${uid}`
            : '';
      }
      if (/^\/\/(?:www\.)?weibo\.com\//.test(raw)) {
        const protocolRelative = new URL(`https:${raw}`);
        return isProfilePath(protocolRelative.pathname)
          ? protocolRelative.href
          : uid
            ? `https://weibo.com/u/${uid}`
            : '';
      }
      const url = new URL(raw, location.href);
      if (
        url.hostname === 's.weibo.com' &&
        /^\/(?:u|p|n)\//.test(url.pathname)
      ) {
        url.hostname = 'weibo.com';
      }
      const hostname = url.hostname.replace(/^www\./, '');
      if (hostname !== 'weibo.com') {
        return uid ? `https://weibo.com/u/${uid}` : '';
      }
      return isProfilePath(url.pathname)
        ? url.href
        : uid
          ? `https://weibo.com/u/${uid}`
          : '';
    } catch {
      return uid ? `https://weibo.com/u/${uid}` : '';
    }
  }

  const PROFILE_LINK_SELECTOR = [
    'a[href*="/u/"]',
    'a[href*="/p/100505"]',
    'a[href*="/n/"]',
    'a[href*="//weibo.com/u/"]',
    'a[href*="//weibo.com/p/100505"]',
    'a[href*="//weibo.com/n/"]',
    'a[href*="weibo.com/"]',
  ].join(',');

  function getProfileURL(el, uid, root = null) {
    const link =
      el.closest('a[href]') ||
      root?.querySelector?.(PROFILE_LINK_SELECTOR) ||
      null;
    const href = link?.getAttribute('href') || '';
    return normalizeProfileURL(href, uid);
  }

  function getUserDisplayName(el, uid, root = null) {
    const candidates = [];
    const userRoots = [el, root, el.closest('a[href]')].filter(Boolean);
    let parent = el.parentElement;
    let depth = 0;
    while (
      parent &&
      parent !== document.body &&
      parent !== document.documentElement &&
      depth < 5
    ) {
      userRoots.push(parent);
      parent = parent.parentElement;
      depth++;
    }

    userRoots.forEach((item) => {
      getElementsForUID(item, uid).forEach((candidateEl) => {
        pushNameCandidate(candidates, getOwnDOMText(candidateEl), 100);
        pushNameCandidate(
          candidates,
          getNameFromElementAttributes(candidateEl),
          80
        );
      });
    });

    const directNameSource =
      el.closest('[nick-name]') ||
      el.closest('[title]') ||
      el.closest('[aria-label]');
    if (directNameSource) {
      pushNameCandidate(
        candidates,
        getNameFromElementAttributes(directNameSource),
        70
      );
    }

    pushNameCandidate(candidates, getOwnDOMText(el), 60);
    pushNameCandidate(candidates, getNameFromElementAttributes(el), 50);

    candidates.sort(
      (a, b) => b.score - a.score || a.name.length - b.name.length
    );
    return candidates[0]?.name || uid;
  }

  function firstDOMUID(...elements) {
    for (const el of elements) {
      if (!(el instanceof Element)) continue;
      const uid = [...extractDOMUIDs(el)][0];
      if (uid) return uid;
    }
    return '';
  }

  function elementHasUID(el, uid) {
    return getElementsForUID(el, String(uid || '').trim()).length > 0;
  }

  function firstBlockedDOMUIDIn(root) {
    if (!(root instanceof Element) || !BL.size) return '';
    const nodes = [];
    if (root.matches(DOM_UID_SELECTOR)) nodes.push(root);
    root.querySelectorAll(DOM_UID_SELECTOR).forEach((el) => nodes.push(el));
    for (const node of nodes) {
      const uid = [...extractDOMUIDs(node)].find((item) => BL.has(item));
      if (uid) return uid;
    }
    return '';
  }

  function getPrimaryContentRoots(el) {
    if (!(el instanceof Element)) return [];
    const nodes = [];
    if (el.matches(PRIMARY_CONTENT_ROOT_SELECTOR)) nodes.push(el);
    el.querySelectorAll(PRIMARY_CONTENT_ROOT_SELECTOR).forEach((node) => {
      nodes.push(node);
    });
    return nodes.filter(
      (node, index) =>
        nodes.indexOf(node) === index &&
        !nodes.some(
          (other) => other !== node && other.contains(node)
        )
    );
  }

  function containsOnlyThisContentRoot(parent, child) {
    if (!(parent instanceof Element) || !(child instanceof Element)) {
      return false;
    }
    const roots = getPrimaryContentRoots(parent);
    if (roots.length !== 1) return false;
    const root = roots[0];
    return root === child || root.contains(child) || child.contains(root);
  }

  function isHardHideBoundary(el) {
    return (
      !(el instanceof Element) ||
      el === document.body ||
      el === document.documentElement ||
      el.matches(
        `main, aside, nav, [role="main"], #app, ${VIRTUAL_WRAPPER_SELECTOR}`
      )
    );
  }

  function isOverBroadHideRoot(el, child = null) {
    if (!(el instanceof Element)) return true;
    if (isHardHideBoundary(el)) return true;
    if (
      el.matches(
        'article, .card-wrap, [action-type="feed_list_item"], [node-type="feed_list_item"]'
      )
    ) {
      return false;
    }
    if (child && containsOnlyThisContentRoot(el, child)) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return false;
    if (rect.width > window.innerWidth * 0.92) return true;
    if (rect.height > Math.max(window.innerHeight * 0.75, 720)) return true;
    return false;
  }

  function looksLikeContentRoot(el) {
    if (!(el instanceof Element)) return false;
    if (el.matches('a, button, svg, path, img')) return false;
    const cls = String(el.className || '');
    const attrText = [
      el.getAttribute('action-type'),
      el.getAttribute('node-type'),
      el.getAttribute('data-testid'),
      el.getAttribute('role'),
    ]
      .filter(Boolean)
      .join(' ');
    if (
      /Feed|feed|Comment|comment|card|Card|item|Item|wbpro-scroller/i.test(
        `${cls} ${attrText}`
      )
    ) {
      return true;
    }
    const children = Array.from(el.children);
    if (
      children.some((child) => child.matches?.('.woo-divider-main')) ||
      el.nextElementSibling?.matches?.('.woo-divider-main') ||
      el.previousElementSibling?.matches?.('.woo-divider-main')
    ) {
      return true;
    }
    const text = normDOMText(el.textContent);
    return text.length > 30 && el.children.length >= 2;
  }

  function isPostContentRoot(el) {
    return (
      el instanceof Element &&
      el.matches(DOM_POST_ROOT_SELECTOR) &&
      !el.matches(DOM_COMMENT_ROOT_SELECTOR)
    );
  }

  function isUnsafePostRootForUID(root, uid) {
    if (!isPostContentRoot(root) || !uid) return false;
    const primaryUID = firstDOMUID(root);
    return !!(primaryUID && primaryUID !== uid);
  }

  function looksLikeCommentRoot(el, source = null) {
    if (!(el instanceof Element)) return false;
    if (isHardHideBoundary(el) || isPostContentRoot(el)) return false;
    const marker = [
      el.className,
      el.getAttribute('action-type'),
      el.getAttribute('node-type'),
      el.getAttribute('data-testid'),
      el.getAttribute('role'),
    ]
      .filter(Boolean)
      .join(' ');
    if (/comment|reply|Comment|Reply|评论|回复/.test(marker)) return true;

    const rect = el.getBoundingClientRect();
    if (
      rect.height <= 0 ||
      rect.height > Math.min(window.innerHeight * 0.65, 560)
    ) {
      return false;
    }
    if (source && !el.contains(source)) return false;
    const text = normDOMText(el.textContent);
    if (!text || text.length > 1200) return false;
    const hasCommentAction = /回复|赞|删除|举报|展开|查看/.test(text);
    const hasSiblingDivider =
      el.nextElementSibling?.matches?.('.woo-divider-main') ||
      el.previousElementSibling?.matches?.('.woo-divider-main');
    return hasCommentAction || hasSiblingDivider;
  }

  function markCommentRoot(root) {
    if (root instanceof Element) {
      root.setAttribute(COMMENT_CONTENT_ROOT_ATTR, '1');
    }
    return root;
  }

  function isCommentContentRoot(el) {
    return el instanceof Element && el.matches(DOM_COMMENT_ROOT_SELECTOR);
  }

  function isInsideCommentContentRoot(el) {
    return el instanceof Element && !!el.closest(DOM_COMMENT_ROOT_SELECTOR);
  }

  function hasHiddenNonCommentContent(root = document) {
    if (isRelationshipListPage()) return false;
    if (!root || !root.querySelectorAll) return false;
    const nodes = [];
    if (root instanceof Element && root.matches(BLOCKED_CONTENT_HIDE_SELECTOR)) {
      nodes.push(root);
    }
    root
      .querySelectorAll(BLOCKED_CONTENT_HIDE_SELECTOR)
      .forEach((node) => nodes.push(node));
    return nodes.some((node) => !isInsideCommentContentRoot(node));
  }

  function findCommentRootForUID(el, uid) {
    if (!(el instanceof Element) || !uid || isRelationshipListPage()) {
      return null;
    }
    const explicit = el.closest(DOM_COMMENT_ROOT_SELECTOR);
    if (
      explicit &&
      elementHasUID(explicit, uid) &&
      !isOverBroadHideRoot(explicit, el)
    ) {
      return markCommentRoot(explicit);
    }

    let fallback = null;
    let cur = el.parentElement;
    let depth = 0;
    while (
      cur &&
      cur !== document.body &&
      cur !== document.documentElement &&
      depth < 10
    ) {
      if (isPostContentRoot(cur) || cur.matches(VIRTUAL_VIEW_SELECTOR)) break;
      if (
        elementHasUID(cur, uid) &&
        !isOverBroadHideRoot(cur, el) &&
        looksLikeCommentRoot(cur, el)
      ) {
        return markCommentRoot(cur);
      }
      if (
        !fallback &&
        elementHasUID(cur, uid) &&
        !isOverBroadHideRoot(cur, el) &&
        cur.children.length >= 2
      ) {
        fallback = cur;
      }
      cur = cur.parentElement;
      depth++;
    }
    return fallback ? markCommentRoot(fallback) : null;
  }

  function findContentRootForUID(el, uid) {
    if (!(el instanceof Element) || !uid || isRelationshipListPage()) {
      return null;
    }

    const commentRoot = findCommentRootForUID(el, uid);
    if (commentRoot) return commentRoot;

    const explicit = el.closest(DOM_CONTENT_ROOT_SELECTOR);
    if (
      explicit &&
      elementHasUID(explicit, uid) &&
      !isUnsafePostRootForUID(explicit, uid) &&
      !isOverBroadHideRoot(explicit, el)
    ) {
      return explicit;
    }

    let cur = el.parentElement;
    let depth = 0;
    while (
      cur &&
      cur !== document.body &&
      cur !== document.documentElement &&
      depth < 10
    ) {
      if (
        elementHasUID(cur, uid) &&
        !isUnsafePostRootForUID(cur, uid) &&
        !isOverBroadHideRoot(cur, el) &&
        looksLikeContentRoot(cur)
      ) {
        return cur;
      }
      cur = cur.parentElement;
      depth++;
    }

    return null;
  }

  function shouldPromoteFeedShell(parent, child) {
    if (!(parent instanceof Element) || !(child instanceof Element)) return false;
    if (parent === document.body || parent === document.documentElement) {
      return false;
    }
    if (
      parent.matches(
        `main, aside, nav, [role="main"], ${VIRTUAL_WRAPPER_SELECTOR}`
      )
    ) {
      return false;
    }
    if (isOverBroadHideRoot(parent, child)) return false;

    const cls = String(parent.className || '');
    const directElementChildren = Array.from(parent.children).filter(
      (item) => item instanceof Element
    );
    const meaningfulChildren = directElementChildren.filter((item) => {
      if (item === child) return true;
      if (item.matches?.('style, script, .woo-divider-main')) return false;
      const text = normDOMText(item.textContent);
      if (!text && item.getBoundingClientRect().height <= 4) return false;
      return true;
    });
    const hasFeedShellClass =
      /vue-recycle-scroller__item-view|wbpro-scroller-item|feed_list_item|Feed_item|FeedItem|card-wrap|(?:^|\s)_[\w-]*(?:feed|item|card)[\w-]*_/i.test(
        cls
      );
    const isSingleChildShell =
      meaningfulChildren.length === 1 && meaningfulChildren[0] === child;
    const hasInlineLayoutReservation =
      parent.hasAttribute('style') &&
      /(?:height|min-height|transform)\s*:/i.test(parent.getAttribute('style'));

    return hasFeedShellClass || isSingleChildShell || hasInlineLayoutReservation;
  }

  function findHideShell(root) {
    if (!(root instanceof Element)) return null;
    const commentRoot = root.closest(DOM_COMMENT_ROOT_SELECTOR);
    if (
      commentRoot &&
      isEligibleVirtualScrollerItem(commentRoot) &&
      !isOverBroadHideRoot(commentRoot, root)
    ) {
      return commentRoot;
    }

    const virtualView = root.closest(VIRTUAL_VIEW_SELECTOR);
    if (
      virtualView &&
      isEligibleVirtualScrollerItem(virtualView) &&
      !isOverBroadHideRoot(virtualView, root)
    ) {
      return virtualView;
    }

    const explicitShell = root.closest(VIRTUAL_ITEM_SELECTOR);
    if (
      explicitShell &&
      isEligibleVirtualScrollerItem(explicitShell) &&
      !isOverBroadHideRoot(explicitShell, root)
    ) {
      return explicitShell;
    }

    let target = root;
    let cur = root.parentElement;
    let depth = 0;
    while (
      cur &&
      cur !== document.body &&
      cur !== document.documentElement &&
      depth < 8
    ) {
      if (!shouldPromoteFeedShell(cur, target)) break;
      target = cur;
      cur = cur.parentElement;
      depth++;
    }
    return target;
  }

  function setImportantStyleIfNeeded(el, prop, value) {
    if (!(el instanceof Element)) return false;
    if (
      el.style.getPropertyValue(prop) === value &&
      el.style.getPropertyPriority(prop) === 'important'
    ) {
      return false;
    }
    el.style.setProperty(prop, value, 'important');
    return true;
  }

  function setStyleVarIfNeeded(el, prop, value) {
    if (!(el instanceof Element)) return false;
    if (el.style.getPropertyValue(prop) === value) return false;
    el.style.setProperty(prop, value);
    return true;
  }

  function hideContentRoot(root, uid = '') {
    if (isRelationshipListPage()) {
      restoreHiddenRelationshipItems(document);
      return false;
    }
    const target = findHideShell(root);
    if (
      !(target instanceof Element) ||
      target.hasAttribute(BLOCKED_CONTENT_HIDE_ATTR)
    ) {
      return false;
    }
    rememberVirtualItemSlotHeight(target);
    rememberBlockedContentVideos(target);
    pauseVideosIn(target);
    target.setAttribute(BLOCKED_CONTENT_HIDE_ATTR, '1');
    const id = String(uid || '').trim();
    if (/^\d{5,}$/.test(id)) {
      target.setAttribute(BLOCKED_CONTENT_UID_ATTR, id);
    }
    suppressFloatingVideoPlayers(document);
    return true;
  }

  let floatingVideoSuppressUntil = 0;
  let blockedVideoFingerprints = new Set();
  let floatingVideoSuppressFallback = false;
  let ignoredFloatingVideoPlayers = new WeakSet();

  function isFloatingVideoSuppressActive() {
    if (Date.now() <= floatingVideoSuppressUntil) return true;
    blockedVideoFingerprints = new Set();
    floatingVideoSuppressFallback = false;
    ignoredFloatingVideoPlayers = new WeakSet();
    return false;
  }

  function getVideoFingerprint(video) {
    if (!(video instanceof HTMLVideoElement)) return '';
    return [
      video.currentSrc,
      video.src,
      video.getAttribute('src'),
      video.poster,
      video.getAttribute('poster'),
    ]
      .map((item) => String(item || '').trim())
      .find(Boolean) || '';
  }

  function collectVideoElements(root) {
    if (!root || !root.querySelectorAll) return [];
    const videos = [];
    if (root instanceof HTMLVideoElement) {
      videos.push(root);
    }
    root.querySelectorAll('video').forEach((video) => videos.push(video));
    return Array.from(new Set(videos));
  }

  function collectFloatingVideoPlayers(root = document) {
    if (!root || !root.querySelectorAll) return [];
    const nodes = [];
    if (
      root instanceof Element &&
      looksLikeFloatingVideoPlayer(root)
    ) {
      nodes.push(root);
    }
    root
      .querySelectorAll(FLOATING_VIDEO_PLAYER_SELECTOR)
      .forEach((el) => {
        if (looksLikeFloatingVideoPlayer(el)) nodes.push(el);
      });
    root.querySelectorAll('video').forEach((video) => {
      const floating = video.closest(FLOATING_VIDEO_PLAYER_SELECTOR);
      if (floating && looksLikeFloatingVideoPlayer(floating)) {
        nodes.push(floating);
      }
      let cur = video.parentElement;
      let depth = 0;
      while (cur && cur !== document.body && depth < 6) {
        if (looksLikeFloatingVideoPlayer(cur)) {
          nodes.push(cur);
          break;
        }
        cur = cur.parentElement;
        depth++;
      }
    });
    return Array.from(new Set(nodes));
  }

  function collectExplicitFloatingVideoPlayers(root = document) {
    if (!root || !root.querySelectorAll) return [];
    const nodes = [];
    if (root instanceof Element && root.matches(FLOATING_VIDEO_PLAYER_SELECTOR)) {
      nodes.push(root);
    }
    root
      .querySelectorAll(FLOATING_VIDEO_PLAYER_SELECTOR)
      .forEach((el) => nodes.push(el));
    return Array.from(new Set(nodes));
  }

  function removeFloatingVideoPlayer(player) {
    if (!(player instanceof Element)) return;
    pauseVideosIn(player);
    try {
      player.remove();
    } catch {
      player.style.setProperty('display', 'none', 'important');
      player.style.setProperty('visibility', 'hidden', 'important');
      player.style.setProperty('pointer-events', 'none', 'important');
    }
  }

  function rememberExistingFloatingVideoPlayers() {
    ignoredFloatingVideoPlayers = new WeakSet();
    collectFloatingVideoPlayers(document).forEach((player) => {
      ignoredFloatingVideoPlayers.add(player);
    });
  }

  function looksLikeVideoBearingContent(root) {
    if (!(root instanceof Element)) return false;
    if (root instanceof HTMLVideoElement) return true;
    if (
      root.querySelector(
        [
          'video',
          '[class*="video"]',
          '[class*="Video"]',
          '[action-type*="video"]',
          '[node-type*="video"]',
          'a[href*="/tv/show"]',
          'a[href*="video.weibo.com"]',
        ].join(',')
      )
    ) {
      return true;
    }
    return /微博视频|视频|播放|观看/.test(normDOMText(root.textContent));
  }

  function rememberBlockedContentVideos(root) {
    if (!root || !root.querySelectorAll || !looksLikeVideoBearingContent(root)) {
      return;
    }
    rememberExistingFloatingVideoPlayers();
    const fingerprints = collectVideoElements(root)
      .map((video) => getVideoFingerprint(video))
      .filter(Boolean);
    blockedVideoFingerprints = new Set(fingerprints);
    floatingVideoSuppressFallback = true;
    floatingVideoSuppressUntil = Date.now() + 5000;
  }

  function pauseVideosIn(root) {
    if (!root || !root.querySelectorAll) return;
    collectVideoElements(root).forEach((video) => {
      try {
        video.pause();
      } catch {}
      try {
        if (document.pictureInPictureElement === video) {
          document.exitPictureInPicture?.();
        }
      } catch {}
    });
  }

  function looksLikeFloatingVideoPlayer(el) {
    if (!(el instanceof Element)) return false;
    const hasMiniPlayerMarker = el.matches(FLOATING_VIDEO_PLAYER_SELECTOR);
    const hasVideo = el instanceof HTMLVideoElement || !!el.querySelector('video');
    if (!hasMiniPlayerMarker && !hasVideo) return false;
    const style = getComputedStyle(el);
    if (style.position !== 'fixed') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 80) return false;
    const rightSide = rect.left > window.innerWidth * 0.45;
    const lowerHalf = rect.top > window.innerHeight * 0.35;
    if (!rightSide || !lowerHalf) return false;
    const marker = `${el.className || ''} ${el.id || ''} ${el.textContent || ''}`;
    return hasMiniPlayerMarker || /mini|player|video|pip|picture|play/i.test(marker);
  }

  function shouldSuppressFloatingVideoPlayer(player) {
    if (!isFloatingVideoSuppressActive()) return false;
    if (ignoredFloatingVideoPlayers.has(player)) return false;
    const hasFingerprintMatch = collectVideoElements(player).some((video) => {
      const fp = getVideoFingerprint(video);
      return fp && blockedVideoFingerprints.has(fp);
    });
    return hasFingerprintMatch || floatingVideoSuppressFallback;
  }

  function suppressFloatingVideoPlayers(root = document) {
    if (!isFloatingVideoSuppressActive()) return;
    collectFloatingVideoPlayers(root).forEach((player) => {
      if (!shouldSuppressFloatingVideoPlayer(player)) return;
      removeFloatingVideoPlayer(player);
    });
  }

  function removeWeiboFloatingVideoPlayers(root = document) {
    const players = new Set([
      ...collectExplicitFloatingVideoPlayers(root),
      ...collectFloatingVideoPlayers(root),
    ]);
    players.forEach((player) => removeFloatingVideoPlayer(player));
  }

  function getTransformSource(el) {
    if (!(el instanceof Element)) return '';
    const inline = el.style?.transform || '';
    if (inline) return inline;
    if (el.hasAttribute(COMPACTED_VIRTUAL_ITEM_ATTR)) return '';
    return getComputedStyle(el).transform || '';
  }

  function getTopSource(el) {
    if (!(el instanceof Element)) return '';
    const inline = el.style?.top || '';
    if (inline) return inline;
    if (el.hasAttribute(COMPACTED_TOP_ITEM_ATTR)) return '';
    return getComputedStyle(el).top || '';
  }

  function parseTranslateYFromTransform(transform) {
    const translateY = transform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
    if (translateY) return Number(translateY[1]);
    const translate3d = transform.match(
      /translate3d\(\s*-?\d+(?:\.\d+)?px,\s*(-?\d+(?:\.\d+)?)px/i
    );
    if (translate3d) return Number(translate3d[1]);
    const translate = transform.match(
      /translate\(\s*-?\d+(?:\.\d+)?px,\s*(-?\d+(?:\.\d+)?)px/i
    );
    if (translate) return Number(translate[1]);
    const matrix = transform.match(/matrix\(([^)]+)\)/);
    if (matrix) {
      const parts = matrix[1].split(',').map((part) => Number(part.trim()));
      if (parts.length >= 6 && Number.isFinite(parts[5])) return parts[5];
    }
    return 0;
  }

  function parseTranslateY(el) {
    return parseTranslateYFromTransform(getTransformSource(el));
  }

  function parseTranslateXFromTransform(transform) {
    const translateX = transform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
    if (translateX) return Number(translateX[1]);
    const translate3d = transform.match(
      /translate3d\(\s*(-?\d+(?:\.\d+)?)px/i
    );
    if (translate3d) return Number(translate3d[1]);
    const translate = transform.match(/translate\(\s*(-?\d+(?:\.\d+)?)px/i);
    if (translate) return Number(translate[1]);
    const matrix = transform.match(/matrix\(([^)]+)\)/);
    if (matrix) {
      const parts = matrix[1].split(',').map((part) => Number(part.trim()));
      if (parts.length >= 6 && Number.isFinite(parts[4])) return parts[4];
    }
    return 0;
  }

  function getTranslateX(el) {
    return parseTranslateXFromTransform(getTransformSource(el));
  }

  function usesTransformLayout(el) {
    if (!(el instanceof Element)) return false;
    const transform = getTransformSource(el);
    return !!transform && transform !== 'none' && /translate|matrix/i.test(transform);
  }

  function parseTop(el) {
    if (!(el instanceof Element)) return 0;
    const top = getTopSource(el);
    const match = String(top).match(/(-?\d+(?:\.\d+)?)px/);
    return match ? Number(match[1]) : 0;
  }

  function usesTopLayout(el) {
    if (!(el instanceof Element)) return false;
    const top = getTopSource(el);
    return /-?\d+(?:\.\d+)?px/.test(String(top));
  }

  function isEligibleVirtualScrollerItem(item) {
    if (!(item instanceof Element)) return false;
    if (
      item.matches(FLOATING_VIDEO_PLAYER_SELECTOR) ||
      item.closest(FLOATING_VIDEO_PLAYER_SELECTOR)
    ) {
      return false;
    }
    const style = getComputedStyle(item);
    if (style.position === 'fixed' || style.position === 'sticky') {
      return false;
    }
    return true;
  }

  function isEligibleVirtualScrollerWrapper(wrapper) {
    if (!(wrapper instanceof Element)) return false;
    if (wrapper === document.body || wrapper === document.documentElement) {
      return false;
    }
    if (
      wrapper.matches(FLOATING_VIDEO_PLAYER_SELECTOR) ||
      wrapper.closest(FLOATING_VIDEO_PLAYER_SELECTOR)
    ) {
      return false;
    }
    const style = getComputedStyle(wrapper);
    return style.position !== 'fixed' && style.position !== 'sticky';
  }

  function getVirtualLayoutMode(item) {
    if (usesTransformLayout(item)) return 'transform';
    if (usesTopLayout(item)) return 'top';
    return 'flow';
  }

  function isParkedVirtualItem(item, y) {
    if (!(item instanceof Element)) return false;
    const transform = getTransformSource(item);
    return y <= -9000 || /translateY\(\s*-9999px\s*\)/i.test(transform);
  }

  function hasUIDOutsideCommentRoots(root, uid) {
    const id = String(uid || '').trim();
    if (!(root instanceof Element) || !/^\d{5,}$/.test(id)) return false;
    return getElementsForUID(root, id).some(
      (el) => !el.closest(DOM_COMMENT_ROOT_SELECTOR)
    );
  }

  function getHiddenVirtualItemUID(item) {
    if (
      !(item instanceof Element) ||
      !item.hasAttribute(BLOCKED_CONTENT_HIDE_ATTR)
    ) {
      return '';
    }
    const uid = String(item.getAttribute(BLOCKED_CONTENT_UID_ATTR) || '').trim();
    if (!/^\d{5,}$/.test(uid)) return '';
    if (hasUIDOutsideCommentRoots(item, uid)) return uid;

    // A hidden comment inside this virtual feed item must not collapse the
    // entire feed item. Clear only the virtual shell marker and keep descendants.
    clearOwnBlockedContentHideState(item);
    return '';
  }

  function isBlockedVirtualItem(item) {
    return !!getHiddenVirtualItemUID(item);
  }

  function readStoredNumber(el, attr) {
    const value = Number(el.getAttribute(attr));
    return Number.isFinite(value) ? value : null;
  }

  function parsePixelValue(value) {
    const match = String(value || '').match(/(-?\d+(?:\.\d+)?)px/);
    return match ? Number(match[1]) : null;
  }

  function getVirtualBaseY(item) {
    if (!(item instanceof Element)) return 0;
    const mode = getVirtualLayoutMode(item);
    const source =
      mode === 'top' ? getTopSource(item) : getTransformSource(item);
    const stored = readStoredNumber(item, ORIGINAL_TRANSLATE_Y_ATTR);
    if (
      stored !== null &&
      item.getAttribute(ORIGINAL_LAYOUT_MODE_ATTR) === mode &&
      item.getAttribute(
        mode === 'top'
          ? ORIGINAL_TOP_STYLE_ATTR
          : ORIGINAL_TRANSFORM_STYLE_ATTR
      ) === source
    ) {
      return stored;
    }

    const y = mode === 'top' ? parseTop(item) : parseTranslateY(item);
    item.setAttribute(ORIGINAL_LAYOUT_MODE_ATTR, mode);
    item.setAttribute(ORIGINAL_TRANSLATE_Y_ATTR, String(y));
    if (mode === 'top') {
      item.setAttribute(ORIGINAL_TOP_STYLE_ATTR, source);
      item.setAttribute(ORIGINAL_TOP_ATTR, String(y));
    } else {
      item.setAttribute(ORIGINAL_TRANSFORM_STYLE_ATTR, source);
    }
    return y;
  }

  function getVirtualBaseX(item) {
    if (!(item instanceof Element)) return 0;
    const source = getTransformSource(item);
    const stored = readStoredNumber(item, ORIGINAL_TRANSLATE_X_ATTR);
    if (
      stored !== null &&
      item.getAttribute(ORIGINAL_TRANSFORM_STYLE_ATTR) === source
    ) {
      return stored;
    }

    const x = parseTranslateXFromTransform(source);
    item.setAttribute(ORIGINAL_TRANSLATE_X_ATTR, String(x));
    item.setAttribute(ORIGINAL_TRANSFORM_STYLE_ATTR, source);
    return x;
  }

  function clearVirtualItemCompaction(item) {
    if (!(item instanceof Element)) return;
    item.removeAttribute(COMPACTED_VIRTUAL_ITEM_ATTR);
    item.removeAttribute(COMPACTED_TOP_ITEM_ATTR);
    item.style.removeProperty('--wb-bl-compact-y');
    item.style.removeProperty('--wb-bl-compact-x');
    item.style.removeProperty('--wb-bl-compact-top');
    item.style.removeProperty('display');
    item.style.removeProperty('height');
    item.style.removeProperty('min-height');
    item.style.removeProperty('margin');
    item.style.removeProperty('padding');
  }

  function getVirtualSlotHeight(view, nextView) {
    if (!view?.item) return 0;
    const stored = readStoredNumber(view.item, ORIGINAL_SLOT_HEIGHT_ATTR);
    const yGap = nextView ? Math.max(0, nextView.y - view.y) : null;
    const currentHeight = Math.max(
      0,
      view.item.getBoundingClientRect().height
    );
    const height = yGap ?? (currentHeight || stored || 0);
    if (height > 0) {
      view.item.setAttribute(ORIGINAL_SLOT_HEIGHT_ATTR, String(height));
      return height;
    }
    return stored || 0;
  }

  function getWrapperBaseMinHeight(wrapper) {
    if (!(wrapper instanceof Element)) return 0;
    const inlineMinHeight = parsePixelValue(wrapper.style?.minHeight || '');
    if (inlineMinHeight !== null) {
      wrapper.setAttribute(
        ORIGINAL_WRAPPER_MIN_HEIGHT_ATTR,
        String(inlineMinHeight)
      );
      return inlineMinHeight;
    }

    const stored = readStoredNumber(wrapper, ORIGINAL_WRAPPER_MIN_HEIGHT_ATTR);
    if (stored !== null) return stored;

    const current = Math.max(0, wrapper.getBoundingClientRect().height);
    wrapper.setAttribute(ORIGINAL_WRAPPER_MIN_HEIGHT_ATTR, String(current));
    return current;
  }

  function clearVirtualWrapperCompaction(wrapper) {
    if (!(wrapper instanceof Element)) return;
    wrapper.removeAttribute(COMPACTED_VIRTUAL_WRAPPER_ATTR);
    wrapper.style.removeProperty('--wb-bl-compact-wrapper-min-height');
  }

  function rememberVirtualItemSlotHeight(item) {
    if (!(item instanceof Element) || !item.matches(VIRTUAL_VIEW_SELECTOR)) {
      return 0;
    }
    const current = Math.max(0, item.getBoundingClientRect().height);
    if (current > 0) {
      item.setAttribute(ORIGINAL_SLOT_HEIGHT_ATTR, String(current));
    }
    return current;
  }

  function getVirtualItemIndex(item) {
    if (!(item instanceof Element)) return null;
    const direct = item.getAttribute('data-index');
    const nested =
      direct ||
      item
        .querySelector(':scope > [data-index], :scope [data-index]')
        ?.getAttribute('data-index');
    const index = Number(nested);
    return Number.isFinite(index) ? index : null;
  }

  function getVirtualWrapperCompactionState(wrapper) {
    let state = virtualScrollerCompactionState.get(wrapper);
    if (!state) {
      state = { hiddenSlots: new Map() };
      virtualScrollerCompactionState.set(wrapper, state);
    }
    return state;
  }

  function sumHiddenSlotHeights(state, beforeIndex = Infinity) {
    let total = 0;
    state.hiddenSlots.forEach((height, index) => {
      if (index < beforeIndex) total += height;
    });
    return total;
  }

  function clearVirtualCompactionState(root = document) {
    if (!root || !root.querySelectorAll) return;
    const selector = [
      `[${COMPACTED_VIRTUAL_ITEM_ATTR}]`,
      `[${COMPACTED_TOP_ITEM_ATTR}]`,
      `[${COMPACTED_VIRTUAL_WRAPPER_ATTR}]`,
      `[${ORIGINAL_LAYOUT_MODE_ATTR}]`,
      `[${ORIGINAL_TRANSLATE_Y_ATTR}]`,
      `[${ORIGINAL_TRANSLATE_X_ATTR}]`,
      `[${ORIGINAL_TOP_ATTR}]`,
      `[${ORIGINAL_TRANSFORM_STYLE_ATTR}]`,
      `[${ORIGINAL_TOP_STYLE_ATTR}]`,
      `[${ORIGINAL_SLOT_HEIGHT_ATTR}]`,
      `[${ORIGINAL_WRAPPER_MIN_HEIGHT_ATTR}]`,
    ].join(',');
    const nodes = [];
    if (root instanceof Element && root.matches(selector)) nodes.push(root);
    root.querySelectorAll(selector).forEach((node) => nodes.push(node));
    Array.from(new Set(nodes)).forEach((node) => {
      node.removeAttribute(COMPACTED_VIRTUAL_ITEM_ATTR);
      node.removeAttribute(COMPACTED_TOP_ITEM_ATTR);
      node.removeAttribute(COMPACTED_VIRTUAL_WRAPPER_ATTR);
      node.removeAttribute(ORIGINAL_LAYOUT_MODE_ATTR);
      node.removeAttribute(ORIGINAL_TRANSLATE_Y_ATTR);
      node.removeAttribute(ORIGINAL_TRANSLATE_X_ATTR);
      node.removeAttribute(ORIGINAL_TOP_ATTR);
      node.removeAttribute(ORIGINAL_TRANSFORM_STYLE_ATTR);
      node.removeAttribute(ORIGINAL_TOP_STYLE_ATTR);
      node.removeAttribute(ORIGINAL_SLOT_HEIGHT_ATTR);
      node.removeAttribute(ORIGINAL_WRAPPER_MIN_HEIGHT_ATTR);
      node.style.removeProperty('--wb-bl-compact-y');
      node.style.removeProperty('--wb-bl-compact-x');
      node.style.removeProperty('--wb-bl-compact-top');
      node.style.removeProperty('--wb-bl-compact-wrapper-min-height');
      if (!node.hasAttribute(BLOCKED_CONTENT_HIDE_ATTR)) {
        node.style.removeProperty('display');
        node.style.removeProperty('height');
        node.style.removeProperty('min-height');
        node.style.removeProperty('margin');
        node.style.removeProperty('padding');
      }
    });
  }

  function applyVirtualWrapperCompaction(wrapper, removedHeight) {
    if (!(wrapper instanceof Element) || removedHeight <= 0) {
      clearVirtualWrapperCompaction(wrapper);
      return;
    }
    const baseHeight = getWrapperBaseMinHeight(wrapper);
    const nextHeight = Math.max(0, baseHeight - removedHeight);
    wrapper.setAttribute(COMPACTED_VIRTUAL_WRAPPER_ATTR, '1');
    setStyleVarIfNeeded(
      wrapper,
      '--wb-bl-compact-wrapper-min-height',
      `${nextHeight}px`
    );
  }

  function applyVirtualItemCompaction(item, x, y, mode) {
    if (!(item instanceof Element)) return;
    if (mode === 'top') {
      item.removeAttribute(COMPACTED_VIRTUAL_ITEM_ATTR);
      item.setAttribute(COMPACTED_TOP_ITEM_ATTR, '1');
      setStyleVarIfNeeded(item, '--wb-bl-compact-top', `${y}px`);
      return;
    }
    item.removeAttribute(COMPACTED_TOP_ITEM_ATTR);
    item.setAttribute(COMPACTED_VIRTUAL_ITEM_ATTR, '1');
    setStyleVarIfNeeded(item, '--wb-bl-compact-y', `${y}px`);
    setStyleVarIfNeeded(item, '--wb-bl-compact-x', `${x}px`);
  }

  function compactVirtualScrollerGaps(root = document) {
    if (isRelationshipListPage()) {
      restoreHiddenRelationshipItems(document);
      return;
    }
    if (!root || !root.querySelectorAll) return;
    const wrappers = new Set();

    if (root instanceof Element) {
      const ownWrapper = root.matches(VIRTUAL_WRAPPER_SELECTOR)
        ? root
        : root.closest(VIRTUAL_WRAPPER_SELECTOR);
      if (ownWrapper) wrappers.add(ownWrapper);
    }
    root
      .querySelectorAll(VIRTUAL_WRAPPER_SELECTOR)
      .forEach((wrapper) => wrappers.add(wrapper));

    wrappers.forEach((wrapper) => {
      if (!isEligibleVirtualScrollerWrapper(wrapper)) return;
      if (!wrapper.closest('.vue-recycle-scroller, #scroller')) return;

      const views = Array.from(wrapper.children)
        .filter(
          (item) =>
            item instanceof Element &&
            item.matches(VIRTUAL_VIEW_SELECTOR) &&
            isEligibleVirtualScrollerItem(item)
        )
        .map((item) => {
          const y = getVirtualBaseY(item);
          const index = getVirtualItemIndex(item);
          const hiddenUID = String(
            item.getAttribute(BLOCKED_CONTENT_UID_ATTR) || ''
          ).trim();
          const hiddenVirtualUID = getHiddenVirtualItemUID(item);
          const view = {
            item,
            index,
            mode: getVirtualLayoutMode(item),
            y,
            x: getTranslateX(item),
            hidden: !!hiddenVirtualUID,
            hiddenUID: hiddenVirtualUID || hiddenUID,
            parked: isParkedVirtualItem(item, y),
            slotHeight: 0,
            estimatedY: y,
          };
          return view;
        })
        .filter((view) => view.index !== null)
        .sort((a, b) => a.index - b.index || a.y - b.y);

      const state = getVirtualWrapperCompactionState(wrapper);
      views.forEach((view, index) => {
        const nextNonParked = views
          .slice(index + 1)
          .find(
            (candidate) =>
              !candidate.parked &&
              Number.isFinite(candidate.y) &&
              candidate.y > view.y
          );
        view.slotHeight = getVirtualSlotHeight(view, nextNonParked);
      });
      views.forEach((view, index) => {
        if (!view.parked) {
          view.estimatedY = view.y;
          return;
        }
        const previous = views[index - 1];
        if (previous && Number.isFinite(previous.estimatedY)) {
          view.estimatedY =
            previous.estimatedY + Math.max(0, previous.slotHeight || 0);
        }
      });
      views.forEach((view, index) => {
        if (view.hidden) {
          const slotHeight =
            view.slotHeight || rememberVirtualItemSlotHeight(view.item);
          if (slotHeight > 0) {
            state.hiddenSlots.set(view.index, slotHeight);
          }
          return;
        }

        if (state.hiddenSlots.has(view.index)) {
          state.hiddenSlots.delete(view.index);
        }
      });

      if (!views.length || !state.hiddenSlots.size) {
        views.forEach((view) => clearVirtualItemCompaction(view.item));
        clearVirtualWrapperCompaction(wrapper);
        return;
      }

      views.forEach((view) => {
        if (view.hidden) {
          view.item.setAttribute(BLOCKED_CONTENT_HIDE_ATTR, '1');
          if (view.hiddenUID) {
            view.item.setAttribute(BLOCKED_CONTENT_UID_ATTR, view.hiddenUID);
          }
          view.item.removeAttribute(COMPACTED_VIRTUAL_ITEM_ATTR);
          view.item.removeAttribute(COMPACTED_TOP_ITEM_ATTR);
          setImportantStyleIfNeeded(view.item, 'display', 'none');
          setImportantStyleIfNeeded(view.item, 'height', '0px');
          setImportantStyleIfNeeded(view.item, 'min-height', '0px');
          setImportantStyleIfNeeded(view.item, 'margin', '0px');
          setImportantStyleIfNeeded(view.item, 'padding', '0px');
          return;
        }

        clearBlockedContentHideState(view.item);
        const removedBefore = sumHiddenSlotHeights(state, view.index);
        if (removedBefore > 0) {
          if (
            view.parked &&
            (!Number.isFinite(view.estimatedY) || view.estimatedY <= -9000)
          ) {
            clearVirtualItemCompaction(view.item);
            return;
          }
          const baseY = view.parked ? view.estimatedY : view.y;
          const y = Math.max(0, baseY - removedBefore);
          applyVirtualItemCompaction(view.item, view.x, y, view.mode);
        } else {
          clearVirtualItemCompaction(view.item);
        }
      });
      applyVirtualWrapperCompaction(
        wrapper,
        sumHiddenSlotHeights(state)
      );
    });
  }

  function getUserContextFromTarget(target) {
    const el =
      target instanceof Element ? target : target?.parentElement || null;
    if (!el) return null;

    const source = el.closest(USER_CONTEXT_TARGET_SELECTOR);
    if (!source) return null;

    const post = source.closest(DOM_CONTENT_ROOT_SELECTOR);
    const uid = firstDOMUID(source, post);
    if (!uid) return null;

    const url = getProfileURL(source, uid, post);
    if (!url) return null;
    const root = findContentRootForUID(source, uid);
    const fallbackRoot =
      post && !isUnsafePostRootForUID(post, uid) ? post : null;

    return {
      uid,
      url,
      name: getUserDisplayName(el, uid, post),
      source,
      root: root || fallbackRoot,
    };
  }

  function addContextUserToBL(ctx, options = {}) {
    if (!ctx?.uid) return;
    const existed = BL.has(ctx.uid);
    addUIDToLocalBL(ctx.uid);

    if (isRelationshipListPage()) {
      restoreHiddenRelationshipItems(document);
    } else {
      const post = ctx.root || findContentRootForUID(ctx.source, ctx.uid);
      hideContentRoot(post, ctx.uid);
      if (isCommentContentRoot(post)) {
        const commentList = post.closest('.wbpro-list') || post.parentElement;
        hideBlockedCommentRoots(commentList || post);
      } else {
        hideBlockedDOMPosts(document);
        scheduleBlockedDOMRefresh();
      }
    }

    if (options.showToast !== false) {
      showUserContextToast(
        existed ? `@${ctx.name} 已在黑名单中` : `已屏蔽 @${ctx.name}`
      );
    }
    return { existed };
  }

  function getCookieValue(name) {
    const item = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
  }

  async function addUserToWeiboBlacklist(uid) {
    const headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'x-requested-with': 'XMLHttpRequest',
      'client-version': '3.0.0',
    };
    const xsrf = getCookieValue('XSRF-TOKEN');
    if (xsrf) headers['x-xsrf-token'] = xsrf;

    const body = new URLSearchParams({
      uid,
      status: '1',
      interact: '1',
      follow: '1',
    });

    const res = await WB_BL_NATIVE.fetch(
      'https://weibo.com/ajax/statuses/filterUser',
      {
        method: 'POST',
        credentials: 'include',
        headers,
        body,
      }
    );

    let data = null;
    try {
      data = await res.clone().json();
    } catch {}
    if (!res.ok || data?.ok === 0) {
      throw new Error(data?.msg || data?.message || `HTTP ${res.status}`);
    }
    return data;
  }

  async function addContextUserToBLAndWeibo(ctx) {
    if (!ctx?.uid) return;
    addContextUserToBL(ctx, { showToast: false });
    showUserContextToast(`已本地屏蔽 @${ctx.name}，正在加入新浪微博黑名单...`);

    try {
      await addUserToWeiboBlacklist(ctx.uid);
      showUserContextToast(`已屏蔽 @${ctx.name}，并加入新浪微博黑名单`);
    } catch (err) {
      console.warn('[WB-BL] 新浪微博黑名单加入失败', err);
      showUserContextToast(`本地已屏蔽 @${ctx.name}，新浪微博黑名单加入失败`);
    }
  }

  function openContextUserProfile(ctx) {
    if (!ctx?.url) return;
    if (_GM_openInTab) {
      _GM_openInTab(ctx.url, { active: true });
      return;
    }
    window.open(ctx.url, '_blank', 'noopener');
  }

  function injectUserContextMenuCSS() {
    injectCSSWhenReady(`
      .wb-user-context-menu {
        position: fixed;
        z-index: 1000000;
        min-width: 248px;
        padding: 6px;
        display: none;
        background: #fff;
        color: #111;
        border: 1px solid rgba(0,0,0,.08);
        border-radius: 10px;
        box-shadow: 0 12px 32px rgba(0,0,0,.18);
        font-size: 14px;
        line-height: 1.4;
        pointer-events: auto;
        user-select: none;
      }
      .wb-user-context-menu[data-wb-open="1"] {
        display: block !important;
      }
      .wb-user-context-menu button {
        width: 100%;
        display: block;
        border: 0;
        border-radius: 8px;
        padding: 9px 10px;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
        font: inherit;
      }
      .wb-user-context-menu button:hover {
        background: #f5f5f5;
      }
      .wb-user-context-toast {
        position: fixed;
        left: 50%;
        bottom: 28px;
        z-index: 1000001;
        transform: translateX(-50%);
        padding: 9px 12px;
        display: none;
        max-width: min(360px, 88vw);
        background: rgba(17,17,17,.92);
        color: #fff;
        border-radius: 999px;
        font-size: 13px;
        line-height: 1.4;
        box-shadow: 0 8px 24px rgba(0,0,0,.22);
      }
    `);
  }

  let showUserContextToastImpl = null;

  function initUserContextMenu() {
    injectUserContextMenuCSS();
    let activeCtx = null;
    let toastTimer = null;
    let menuOpenedAt = 0;
    let lastViewportWidth = window.innerWidth;
    let lastViewportHeight = window.innerHeight;

    const ensureMenu = () => {
      let menu = document.querySelector('.wb-user-context-menu');
      if (menu?.getAttribute('data-__wb_context_menu_ready') === '1') {
        return menu;
      }
      if (menu) menu.remove();

      menu = document.createElement('div');
      menu.className = 'wb-user-context-menu';
      menu.setAttribute('data-__wb_context_menu_ready', '1');
      menu.innerHTML = `
        <button type="button" data-action="block"></button>
        <button type="button" data-action="block-official"></button>
        <button type="button" data-action="open">在新选项卡中打开链接</button>
      `;
      menu.addEventListener('pointerdown', (e) => e.stopPropagation());
      menu.addEventListener('mousedown', (e) => e.stopPropagation());
      menu.addEventListener('mouseup', (e) => e.stopPropagation());
      menu.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const btn = e.target.closest('button[data-action]');
        if (!btn || !activeCtx) return;
        const action = btn.getAttribute('data-action');
        const ctx = activeCtx;
        hideMenu({ force: true });
        if (action === 'block') addContextUserToBL(ctx);
        if (action === 'block-official') addContextUserToBLAndWeibo(ctx);
        if (action === 'open') openContextUserProfile(ctx);
      });
      (document.body || document.documentElement).appendChild(menu);
      return menu;
    };

    const positionMenu = (menu, x, y) => {
      menu.style.removeProperty('display');
      menu.setAttribute('data-wb-open', '1');
      menu.style.setProperty('pointer-events', 'auto', 'important');
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;

      const rect = menu.getBoundingClientRect();
      const left = Math.min(x, window.innerWidth - rect.width - 8);
      const top = Math.min(y, window.innerHeight - rect.height - 8);
      menu.style.left = `${Math.max(8, left)}px`;
      menu.style.top = `${Math.max(8, top)}px`;
      menuOpenedAt = Date.now();
    };

    const isEventInsideMenu = (event) => {
      const menu = document.querySelector('.wb-user-context-menu');
      if (!menu || getComputedStyle(menu).display === 'none') return false;
      return !!(
        event?.target instanceof Node &&
        menu.contains(event.target)
      );
    };

    const hideMenu = (options = {}) => {
      const force = !!options.force;
      const event = options.event || null;
      if (!force && isEventInsideMenu(event)) return;
      const menu = document.querySelector('.wb-user-context-menu');
      if (menu) {
        menu.removeAttribute('data-wb-open');
        menu.style.removeProperty('display');
      }
      activeCtx = null;
    };

    showUserContextToastImpl = (message) => {
      let toast = document.querySelector('.wb-user-context-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'wb-user-context-toast';
        (document.body || document.documentElement).appendChild(toast);
      }
      toast.textContent = message;
      toast.style.display = 'block';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.style.display = 'none';
      }, 1800);
    };

    const handleContextMenu = (e) => {
      const ctx = getUserContextFromTarget(e.target);
      if (!ctx) {
        hideMenu({ force: true });
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      activeCtx = ctx;

      const menu = ensureMenu();
      const blockBtn = menu.querySelector('[data-action="block"]');
      const officialBlockBtn = menu.querySelector(
        '[data-action="block-official"]'
      );
      blockBtn.textContent = BL.has(ctx.uid)
        ? `已屏蔽 @${ctx.name}`
        : `屏蔽 @${ctx.name}`;
      officialBlockBtn.textContent = `屏蔽 @${ctx.name}（同时加入新浪微博黑名单）`;
      positionMenu(menu, e.clientX, e.clientY);
    };

    document.addEventListener('contextmenu', handleContextMenu, true);

    document.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 0) return;
        if (Date.now() - menuOpenedAt < 80) return;
        hideMenu({ event: e });
      },
      true
    );
    window.addEventListener(
      'scroll',
      () => {
        const menu = document.querySelector('.wb-user-context-menu');
        if (menu && getComputedStyle(menu).display !== 'none') return;
        hideMenu();
      },
      true
    );
    window.addEventListener('resize', (e) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const changed =
        width !== lastViewportWidth || height !== lastViewportHeight;
      lastViewportWidth = width;
      lastViewportHeight = height;
      if (!changed) return;
      hideMenu({ event: e });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideMenu({ force: true });
    });
  }

  function showUserContextToast(message) {
    if (typeof showUserContextToastImpl === 'function') {
      showUserContextToastImpl(message);
    }
  }

  function hideBlockedCommentRoots(root = document) {
    if (isRelationshipListPage()) {
      restoreHiddenRelationshipItems(document);
      return false;
    }
    if (!BL.size || !root || !root.querySelectorAll) return false;
    const nodes = [];
    if (root instanceof Element && root.matches(DOM_UID_SELECTOR)) {
      nodes.push(root);
    }
    root.querySelectorAll(DOM_UID_SELECTOR).forEach((el) => nodes.push(el));

    let hiddenAny = false;
    nodes.forEach((el) => {
      const blockedUID = [...extractDOMUIDs(el)].find((uid) => BL.has(uid));
      if (!blockedUID) return;
      const commentRoot = findCommentRootForUID(el, blockedUID);
      if (commentRoot && hideContentRoot(commentRoot, blockedUID)) {
        hiddenAny = true;
      }
    });
    return hiddenAny;
  }

  function hideBlockedDOMPosts(root = document) {
    syncRelationshipPageMode();
    removeWeiboFloatingVideoPlayers(root || document);
    suppressFloatingVideoPlayers(root || document);
    if (isRelationshipListPage()) {
      restoreHiddenRelationshipItems(document);
      return;
    }
    if (!BL.size || !root || !root.querySelectorAll) return;
    const nodes = [];
    if (root instanceof Element && root.matches(DOM_UID_SELECTOR)) {
      nodes.push(root);
    }
    root.querySelectorAll(DOM_UID_SELECTOR).forEach((el) => nodes.push(el));

    let hiddenAny = false;
    nodes.forEach((el) => {
      const blockedUID = [...extractDOMUIDs(el)].find((uid) => BL.has(uid));
      if (!blockedUID) return;

      const post = findContentRootForUID(el, blockedUID);
      if (hideContentRoot(post, blockedUID)) hiddenAny = true;
    });
    compactVirtualScrollerGaps(hiddenAny ? document : root);
    if (hiddenAny) {
      suppressFloatingVideoPlayers(document);
      nudgeTimelineLayout();
    }
  }

  let queuedBlockedDOMRefreshTimer = 0;
  function queueBlockedDOMRefresh(root = document, delay = 60) {
    if (queuedBlockedDOMRefreshTimer) return;
    queuedBlockedDOMRefreshTimer = setTimeout(() => {
      queuedBlockedDOMRefreshTimer = 0;
      hideBlockedDOMPosts(root || document);
    }, delay);
  }

  let layoutNudgeTimer = 0;
  function nudgeTimelineLayout() {
    if (layoutNudgeTimer) return;
    layoutNudgeTimer = setTimeout(() => {
      layoutNudgeTimer = 0;
      document.dispatchEvent(
        new CustomEvent(LAYOUT_REFRESH_EVENT, {
          detail: { reason: 'blocked-content' },
        })
      );
      setTimeout(() => {
        document.dispatchEvent(
          new CustomEvent(LAYOUT_REFRESH_EVENT, {
            detail: { reason: 'blocked-content' },
          })
        );
      }, 160);
      setTimeout(() => {
        document.dispatchEvent(
          new CustomEvent(LAYOUT_REFRESH_EVENT, {
            detail: { reason: 'blocked-content' },
          })
        );
      }, 420);
    }, 30);
  }

  function scheduleBlockedDOMRefresh() {
    if (isRelationshipListPage()) {
      restoreHiddenRelationshipItems(document);
      return;
    }
    const run = () => hideBlockedDOMPosts(document);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    }
    setTimeout(run, 80);
    setTimeout(run, 350);
    setTimeout(run, 900);
    setTimeout(run, 1600);
  }

  function isRelevantBlockedLayoutMutationTarget(target) {
    if (!(target instanceof Element)) return false;
    if (!hasHiddenNonCommentContent(document)) return false;
    if (isInsideCommentContentRoot(target)) return false;
    if (
      target.matches(FLOATING_VIDEO_PLAYER_SELECTOR) ||
      target.closest(FLOATING_VIDEO_PLAYER_SELECTOR)
    ) {
      return false;
    }
    return (
      target.matches(VIRTUAL_WRAPPER_SELECTOR) ||
      !!target.closest(VIRTUAL_WRAPPER_SELECTOR) ||
      (target.matches(VIRTUAL_ITEM_SELECTOR) &&
        isEligibleVirtualScrollerItem(target)) ||
      (isEligibleVirtualScrollerItem(target) &&
        !!target.closest(VIRTUAL_ITEM_SELECTOR)) ||
      !!target.querySelector?.(BLOCKED_CONTENT_HIDE_SELECTOR)
    );
  }

  // === 全局 Fetch 拦截 ===
  window.fetch = async function (input, init) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input?.url || '';
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
    const isFilterUserRequest =
      typeof url === 'string' && url.includes('/filterUser');
    const isUnfilterUserRequest =
      typeof url === 'string' && url.includes('/unfilterUser');
    const filterUID =
      isFilterUserRequest || isUnfilterUserRequest
        ? parseUIDFromRequest(url, init?.body)
        : '';

    const res = await WB_BL_NATIVE.fetch(input, init);

    if (isRelationshipFriendsURL(url)) {
      try {
        const data = await res.clone().json();
        return new Response(
          JSON.stringify(normalizeRelationshipFriendsData(data)),
          {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          }
        );
      } catch {}
    }

    if (filterUID && (await didFilterRequestSucceed(res))) {
      if (isFilterUserRequest) {
        addUIDToLocalBL(filterUID);
        hideBlockedDOMPosts(document);
        scheduleBlockedDOMRefresh();
      }
      if (isUnfilterUserRequest) {
        removeUIDFromLocalBL(filterUID);
      }
    }

    if (
      typeof url === 'string' &&
      /\/(?:ajax\/(?:feed|statuses|comment|getCommentList|repost|like)|graphql\/|(?:mymblog|timeline|index))/.test(
        url
      )
    ) {
      try {
        const data = await res.clone().json();
        return new Response(JSON.stringify(filterData(data)), {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      } catch {}
    }
    return res;
  };

  // === XHR 拦截 ===
  function defineXHRTextResponse(xhr, text) {
    try {
      Object.defineProperty(xhr, 'responseText', {
        configurable: true,
        get: () => text,
      });
    } catch {
      return;
    }
    const responseType = xhr.responseType || '';
    if (!['', 'text', 'json'].includes(responseType)) return;
    let responseValue = text;
    if (responseType === 'json') {
      try {
        responseValue = JSON.parse(text);
      } catch {}
    }
    try {
      Object.defineProperty(xhr, 'response', {
        configurable: true,
        get: () => responseValue,
      });
    } catch {}
  }

  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this._url = url instanceof URL ? url.href : String(url || '');
    return WB_BL_NATIVE.XHROpen.call(this, method, url, ...args);
  };
  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('readystatechange', () => {
      if (this.readyState === 4 && this.status === 200 && this._url) {
        const url = String(this._url || '');
        const isFilterUserRequest = url.includes('/filterUser');
        const isUnfilterUserRequest = url.includes('/unfilterUser');
        if (isFilterUserRequest || isUnfilterUserRequest) {
          const uid = parseUIDFromRequest(url, body);
          let ok = true;
          try {
            const data = JSON.parse(this.responseText);
            ok = data?.ok !== 0;
          } catch {}
          if (uid && ok) {
            if (isFilterUserRequest) {
              addUIDToLocalBL(uid);
              hideBlockedDOMPosts(document);
              scheduleBlockedDOMRefresh();
            }
            if (isUnfilterUserRequest) {
              removeUIDFromLocalBL(uid);
            }
          }
        }

        // 屏蔽"全部关注"流
        if (url.includes('unreadfriendstimeline')) {
          defineXHRTextResponse(
            this,
            JSON.stringify({
              ok: 1,
              statuses: [],
              since_id_str: '0',
              max_id_str: '0',
            })
          );
          return;
        }
        if (isRelationshipFriendsURL(url)) {
          try {
            const data = JSON.parse(this.responseText);
            defineXHRTextResponse(
              this,
              JSON.stringify(normalizeRelationshipFriendsData(data))
            );
          } catch {}
          return;
        }
        // 过滤黑名单内容
        if (
          /\/(?:ajax\/(?:feed|statuses)|(?:mymblog|timeline))/.test(url)
        ) {
          try {
            const o = JSON.parse(this.responseText);
            defineXHRTextResponse(this, JSON.stringify(filterData(o)));
          } catch {}
        }
      }
    });
    return WB_BL_NATIVE.XHRSend.call(this, body);
  };

  // === WebSocket 拦截 ===
  function getFilteredWebSocketEvent(evt) {
    if (!evt || typeof evt.data !== 'string') return evt;
    try {
      const data = JSON.stringify(filterData(JSON.parse(evt.data)));
      return new Proxy(evt, {
        get(target, prop, receiver) {
          if (prop === 'data') return data;
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    } catch {
      return evt;
    }
  }

  window.WebSocket = class extends WB_BL_NATIVE.WebSocket {
    constructor(url, protocols) {
      if (protocols === undefined) super(url);
      else super(url, protocols);
      this.__wbMessageListeners = new WeakMap();
      this.__wbOnMessage = null;
      this.__wbOnMessageWrapper = null;
    }

    addEventListener(type, listener, options) {
      if (type !== 'message' || !listener) {
        return super.addEventListener(type, listener, options);
      }
      if (
        typeof listener !== 'function' &&
        typeof listener.handleEvent !== 'function'
      ) {
        return super.addEventListener(type, listener, options);
      }
      let wrapped = this.__wbMessageListeners.get(listener);
      if (!wrapped) {
        wrapped =
          typeof listener === 'function'
            ? function (evt) {
                return listener.call(this, getFilteredWebSocketEvent(evt));
              }
            : {
                handleEvent: (evt) =>
                  listener.handleEvent.call(
                    listener,
                    getFilteredWebSocketEvent(evt)
                  ),
              };
        this.__wbMessageListeners.set(listener, wrapped);
      }
      return super.addEventListener(type, wrapped, options);
    }

    removeEventListener(type, listener, options) {
      const wrapped =
        type === 'message' && listener
          ? this.__wbMessageListeners.get(listener)
          : null;
      return super.removeEventListener(type, wrapped || listener, options);
    }

    get onmessage() {
      return this.__wbOnMessage;
    }

    set onmessage(listener) {
      if (this.__wbOnMessageWrapper) {
        super.removeEventListener('message', this.__wbOnMessageWrapper);
      }
      this.__wbOnMessage = typeof listener === 'function' ? listener : null;
      this.__wbOnMessageWrapper = this.__wbOnMessage
        ? (evt) => this.__wbOnMessage.call(this, getFilteredWebSocketEvent(evt))
        : null;
      if (this.__wbOnMessageWrapper) {
        super.addEventListener('message', this.__wbOnMessageWrapper);
      }
    }
  };

  // === MutationObserver 过滤 ===
  (function () {
    const observeOptions = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    };
    const obs = new MutationObserver((ms) => {
      clearTimeout(window._wbbl_t);
      window._wbbl_t = setTimeout(() => {
        if (isRelationshipListPage()) {
          restoreHiddenRelationshipItems(document);
          return;
        }
        let needsFullRefresh = false;
        const hasHiddenFeedContent = hasHiddenNonCommentContent(document);
        ms.forEach((m) => {
          if (
            m.type === 'attributes' &&
            isRelevantBlockedLayoutMutationTarget(m.target)
          ) {
            needsFullRefresh = true;
            return;
          }
          Array.from(m.addedNodes).forEach((n) => {
            if (n instanceof HTMLElement) {
              removeWeiboFloatingVideoPlayers(n);
              suppressFloatingVideoPlayers(n);
              if (hasHiddenFeedContent) {
                hideBlockedDOMPosts(n);
              } else {
                hideBlockedCommentRoots(n);
              }
            }
          });
        });
        if (needsFullRefresh) queueBlockedDOMRefresh(document, 30);
      }, 60);
    });
    const attach = () => {
      const root = document.body || document.documentElement;
      if (root) {
        hideBlockedDOMPosts(root);
        obs.observe(root, observeOptions);
        window.addEventListener('beforeunload', () => obs.disconnect());
        // SPA 路由重置
        const push = history.pushState;
        history.pushState = function (s, title, url) {
          push.call(this, s, title, url);
          obs.disconnect();
          const nextRoot = document.body || document.documentElement;
          syncRelationshipPageMode();
          hideBlockedDOMPosts(nextRoot);
          obs.observe(nextRoot, observeOptions);
        };
      } else {
        setTimeout(attach, 50);
      }
    };
    attach();
  })();

  initUserContextMenu();

  /* === Tampermonkey 菜单（精简版） === */

  // Star
  _GM_registerMenuCommand('⭐ 给我们 Star', () => {
    openGitHub();
  });

  // 关于
  _GM_registerMenuCommand('ℹ️ 关于', () => {
    const isDisabled = _GM_getValue(
      STAR_CONFIG.STAR_REMINDER_DISABLED_KEY,
      false
    );
    const starStatus = isDisabled ? '🔕 Star提醒已关闭' : '🔔 Star提醒已开启';

    alert(
      `Weibo Retro Twitter-Style Clone v${SCRIPT_VERSION}\n` +
        `模仿早期Twitter时间线的完整版微博增强工具\n\n` +
        `当前缓存: ${BL.size} 个用户\n` +
        `${starStatus}\n\n` +
        `作者: DanielZenFlow\n` +
        `许可: MIT License\n` +
        `GitHub: [DanielZenFlow/Weibo-Retro-Twitter-Style-Clone](https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone)\n\n` +
        `感谢使用！如果有帮助请给我们 Star ⭐`
    );
  });

  console.log(
    `[WB-BL] 启动完成 v${SCRIPT_VERSION} @ ${location.hostname}，已缓存 ${BL.size} UIDs`
  );
  console.log(
    `[WB-BL] Author: DanielZenFlow | GitHub: [DanielZenFlow/Weibo-Retro-Twitter-Style-Clone](https://github.com/DanielZenFlow/Weibo-Retro-Twitter-Style-Clone)`
  );
})();

/* === Settings v4 (no whitelist) + DOM toggles + BL add/remove === */
(function () {
  'use strict';
  const UID_KEY = 'WB_BL_list';
  const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;
  const MAX_IMPORT_UIDS = 100000;

  const DEFAULTS = {
    hideHotSearch: true,
    hideSuggestedPeople: true,
    hideFollowRecommendations: true,
    hideCommonFunctions: true,
    hideFanGroups: true,
    hideNavVideo: false,
    hideNavRecommend: false,
    hideNavGame: true,
    defaultLatestTimeline: true,
  };

  function normalizeCfg(rawCfg) {
    const raw = rawCfg && typeof rawCfg === 'object' ? rawCfg : {};
    const cfg = Object.assign({}, DEFAULTS, raw);
    if (raw.hideNavVideoRecommend === true) {
      if (raw.hideNavVideo === undefined) cfg.hideNavVideo = true;
      if (raw.hideNavRecommend === undefined) cfg.hideNavRecommend = true;
    }
    delete cfg.hideNavVideoRecommend;
    return cfg;
  }

  function loadCfg() {
    try {
      return normalizeCfg(JSON.parse(GM_getValue('cfg', '{}') || '{}'));
    } catch {
      return normalizeCfg();
    }
  }
  function saveCfg(cfg) {
    GM_setValue('cfg', JSON.stringify(cfg || {}));
  }
  let CFG = loadCfg();
  const LAYOUT_REFRESH_EVENT = 'wb-retro-layout-refresh';

  // ---- BL Store helpers (operate on GM cache only) ----
  function readBLSet() {
    const raw = GM_getValue(UID_KEY, '');
    if (!raw) return new Set();
    return new Set(
      raw
        .split(',')
        .map((s) => String(s).trim())
        .filter((s) => /^\d{5,}$/.test(s))
    );
  }
  function writeBLSet(set) {
    GM_setValue(UID_KEY, Array.from(set).join(','));
  }
  function syncRuntimeBL(options = {}) {
    return window.WB_BL_SYNC?.reloadFromStorage?.(options);
  }
  function addToBL(uids) {
    const set = readBLSet();
    uids.forEach((u) => set.add(String(u).trim()));
    writeBLSet(set);
    return set.size;
  }
  function removeFromBL(uids) {
    const set = readBLSet();
    uids.forEach((u) => set.delete(String(u).trim()));
    writeBLSet(set);
    return set.size;
  }
  function parseUIDInput(text) {
    return (text || '')
      .split(/[^0-9]+/g) // allow comma/space/newline
      .map((s) => s.trim())
      .filter((s) => /^\d{5,}$/.test(s));
  }

  // 导出黑名单备份为 JSON 文件
  function exportBlacklist() {
    const blSet = readBLSet();
    const uids = Array.from(blSet);
    const exportData = {
      exportTime: new Date().toISOString(),
      version: '1.2.1',
      scriptName: 'Weibo Retro Twitter-Style Clone',
      count: uids.length,
      uids: uids,
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weibo-blacklist-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return uids.length;
  }

  // 导入黑名单备份，支持 JSON 或纯文本 UID 列表。
  function importBlacklist(file, mode = 'merge') {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('未选择文件'));
        return;
      }
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        reject(new Error('文件过大，请导入 2MB 以内的黑名单文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          let importData = null;

          try {
            importData = JSON.parse(content);
          } catch (parseErr) {
            importData = null;
          }

          // 验证数据格式
          let uidsToImport = [];

          if (importData?.uids && Array.isArray(importData.uids)) {
            // 标准格式：{ uids: [...] }
            uidsToImport = importData.uids
              .map((u) => String(u).trim())
              .filter((u) => /^\d{5,}$/.test(u));
          } else if (Array.isArray(importData)) {
            // 简单数组格式：[...]
            uidsToImport = importData
              .map((u) => String(u).trim())
              .filter((u) => /^\d{5,}$/.test(u));
          } else if (typeof content === 'string') {
            // 纯文本格式：逗号/换行分隔
            uidsToImport = content
              .split(/[,\s\n]+/)
              .map((u) => u.trim())
              .filter((u) => /^\d{5,}$/.test(u));
          }

          if (uidsToImport.length === 0) {
            reject(new Error('未在文件中找到有效的 UID'));
            return;
          }
          uidsToImport = Array.from(new Set(uidsToImport));
          if (uidsToImport.length > MAX_IMPORT_UIDS) {
            reject(new Error(`单次最多导入 ${MAX_IMPORT_UIDS} 个 UID`));
            return;
          }

          const currentSet = readBLSet();
          const oldSize = currentSet.size;
          let newSize,
            addedCount,
            removedCount = 0;

          if (mode === 'replace') {
            // 替换模式：清空后导入
            const newSet = new Set(uidsToImport);
            writeBLSet(newSet);
            newSize = newSet.size;
            addedCount = uidsToImport.filter((u) => !currentSet.has(u)).length;
            removedCount = Array.from(currentSet).filter(
              (u) => !newSet.has(u)
            ).length;
          } else {
            // 合并模式（默认）：保留现有 + 添加新的
            uidsToImport.forEach((u) => currentSet.add(u));
            writeBLSet(currentSet);
            newSize = currentSet.size;
            addedCount = newSize - oldSize;
          }

          resolve({
            success: true,
            importedCount: uidsToImport.length,
            addedCount,
            removedCount,
            totalCount: newSize,
            mode,
            exportTime: importData?.exportTime || '未知',
            exportVersion: importData?.version || '未知',
          });
        } catch (err) {
          reject(new Error('导入失败：' + err.message));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsText(file);
    });
  }

  // 创建隐藏的文件输入元素
  function createFileInput(onFileSelected) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.style.display = 'none';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        onFileSelected(file);
      }
      // 清空以便重复选择同一文件
      input.value = '';
    });
    document.body.appendChild(input);
    return input;
  }

  // ---- DOM hider based on titles ----
  function normText(s) {
    return (s || '').replace(/\s+/g, '').trim();
  }
  function buildBlockTitles() {
    const t = [];
    if (CFG.hideHotSearch) t.push('微博热搜');
    if (CFG.hideSuggestedPeople) t.push('你可能感兴趣的人');
    if (CFG.hideFollowRecommendations) t.push('关注推荐');
    if (CFG.hideCommonFunctions) t.push('常用功能');
    if (CFG.hideFanGroups) t.push('粉丝群');
    return new Set(t);
  }
  function findSectionRootFromHeading(h) {
    const side = h.closest('.wbpro-side');
    if (side && side !== document.body && side !== document.documentElement) {
      return side;
    }

    let cur = h;
    while (cur && cur !== document.documentElement) {
      const hasHotSearchParts = cur.querySelector(
        '.wbpro-side-bottom, .wbpro-side-card7, [class*="cardHotSearch_tab_"]'
      );
      const isSidePanel = cur.matches(
        '.wbpro-side, .wbpro-side-panel, [class*="Card_wrap_"]'
      );
      if (hasHotSearchParts || isSidePanel) return cur;
      cur = cur.parentElement;
    }
    return (
      h.closest('.wbpro-side, .wbpro-side-panel, [class*="Card_wrap_"]') || h
    );
  }

  // 恢复所有被脚本隐藏的面板
  function showAllHiddenPanels() {
    document
      .querySelectorAll('[data-__wb_hidden_by_userscript]')
      .forEach((panel) => {
        panel.style.removeProperty('display');
        panel.removeAttribute('data-__wb_hidden_by_userscript');
      });
  }
  function promoteHiddenSidebarShells(root = document) {
    if (!root || !root.querySelectorAll) return;
    const hidden = [];
    const selector = '[data-__wb_hidden_by_userscript]';
    if (root instanceof Element && root.matches(selector)) hidden.push(root);
    root.querySelectorAll(selector).forEach((panel) => hidden.push(panel));

    hidden.forEach((panel) => {
      const side = panel.closest('.wbpro-side');
      if (
        !side ||
        side === panel ||
        side === document.body ||
        side === document.documentElement
      ) {
        return;
      }
      panel.style.removeProperty('display');
      panel.removeAttribute('data-__wb_hidden_by_userscript');
      side.style.setProperty('display', 'none', 'important');
      side.setAttribute('data-__wb_hidden_by_userscript', '1');
    });
  }
  function normalizeFirstVisibleSidebarGaps(root = document) {
    const scope =
      root && root.querySelectorAll
        ? root instanceof Element
          ? root.closest('.wbpro-side')?.parentElement || root
          : root
        : document;
    const sidebarParents = new Set();
    const sides = [];
    if (scope instanceof Element && scope.matches('.wbpro-side')) {
      sides.push(scope);
    }
    scope.querySelectorAll?.('.wbpro-side').forEach((side) => sides.push(side));
    sides.forEach((side) => {
      if (side.parentElement) sidebarParents.add(side.parentElement);
    });

    sidebarParents.forEach((parent) => {
      const panels = Array.from(parent.children).filter(
        (item) => item instanceof Element && item.matches('.wbpro-side')
      );
      let firstVisible = null;
      panels.forEach((panel) => {
        const marked = panel.hasAttribute('data-__wb_first_visible_sidebar');
        if (marked) {
          const original = panel.getAttribute(
            'data-__wb_original_margin_top'
          );
          if (original) panel.style.marginTop = original;
          else panel.style.removeProperty('margin-top');
          panel.removeAttribute('data-__wb_first_visible_sidebar');
        }

        const isVisible =
          !panel.hasAttribute('data-__wb_hidden_by_userscript') &&
          getComputedStyle(panel).display !== 'none';
        if (!firstVisible && isVisible) firstVisible = panel;
      });

      if (!firstVisible) return;
      if (!firstVisible.hasAttribute('data-__wb_original_margin_top')) {
        firstVisible.setAttribute(
          'data-__wb_original_margin_top',
          firstVisible.style.marginTop || ''
        );
      }
      firstVisible.style.setProperty('margin-top', '0', 'important');
      firstVisible.setAttribute('data-__wb_first_visible_sidebar', '1');
    });
  }

  function findComposerTopAnchor() {
    const isVisibleAnchor = (el) => {
      const rect = el?.getBoundingClientRect?.();
      return !!(rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0);
    };
    const getPublishShell = (el) =>
      el?.closest?.(
        '[class*="_publishCard_"], [class*="publishCard"], .woo-panel-main'
      ) ||
      el?.closest?.('[class*="_box_vkpry_"]') ||
      el?.closest?.('.wbpro-form') ||
      null;
    const textarea =
      document.querySelector(
        'textarea[placeholder*="新鲜事"], textarea[placeholder*="分享给大家"]'
      ) ||
      Array.from(document.querySelectorAll('textarea')).find((item) => {
        if (!isVisibleAnchor(item)) return false;
        const shell = getPublishShell(item);
        if (!shell || !isVisibleAnchor(shell)) return false;
        return !item.closest('aside, nav, .wbpro-side');
      });
    const textareaShell = getPublishShell(textarea);
    if (isVisibleAnchor(textareaShell)) return textareaShell;
    if (isVisibleAnchor(textarea)) return textarea;

    return (
      Array.from(
        document.querySelectorAll('[class*="_publishCard_"], [class*="publishCard"]')
      ).find(isVisibleAnchor) || null
    );
  }

  function findFirstVisibleSidebarPanel(anchor = null) {
    const anchorRect = anchor?.getBoundingClientRect?.() || null;
    const panels = Array.from(document.querySelectorAll('.wbpro-side'));
    return (
      panels
        .filter((panel) => {
          if (panel.hasAttribute('data-__wb_hidden_by_userscript')) return false;
          const style = getComputedStyle(panel);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
          }
          const rect = panel.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return false;
          if (anchorRect && rect.left < anchorRect.right - 12) return false;
          return true;
        })
        .sort(
          (a, b) =>
            a.getBoundingClientRect().top - b.getBoundingClientRect().top
        )[0] || null
    );
  }

  const SIDEBAR_ALIGN_ORIGINAL_TRANSFORM_ATTR =
    'data-__wb_anchor_original_transform';

  function restoreSidebarPanelAnchorAlignment(item) {
    if (!(item instanceof Element)) return;
    if (item.hasAttribute('data-__wb_anchor_original_margin_top')) {
      const originalMargin = item.getAttribute(
        'data-__wb_anchor_original_margin_top'
      );
      if (originalMargin) item.style.marginTop = originalMargin;
      else item.style.removeProperty('margin-top');
    }
    if (item.hasAttribute(SIDEBAR_ALIGN_ORIGINAL_TRANSFORM_ATTR)) {
      const originalTransform = item.getAttribute(
        SIDEBAR_ALIGN_ORIGINAL_TRANSFORM_ATTR
      );
      if (originalTransform) item.style.transform = originalTransform;
      else item.style.removeProperty('transform');
    }
    item.removeAttribute('data-__wb_sidebar_anchor_aligned');
  }

  function alignFirstVisibleSidebarToComposer() {
    const anchor = findComposerTopAnchor();
    const panel = findFirstVisibleSidebarPanel(anchor);
    if (!anchor || !panel) return;
    const anchorRect = anchor.getBoundingClientRect();
    if (!isComposerAnchorVisible(anchor)) {
      restoreSidebarAnchorAlignment();
      return;
    }

    document
      .querySelectorAll('[data-__wb_sidebar_anchor_aligned]')
      .forEach((item) => {
        if (item === panel) return;
        restoreSidebarPanelAnchorAlignment(item);
      });

    if (!panel.hasAttribute('data-__wb_anchor_original_margin_top')) {
      panel.setAttribute(
        'data-__wb_anchor_original_margin_top',
        panel.style.marginTop || ''
      );
    }
    if (!panel.hasAttribute(SIDEBAR_ALIGN_ORIGINAL_TRANSFORM_ATTR)) {
      panel.setAttribute(
        SIDEBAR_ALIGN_ORIGINAL_TRANSFORM_ATTR,
        panel.style.transform || ''
      );
    }

    const original = panel.getAttribute('data-__wb_anchor_original_margin_top');
    if (original) panel.style.marginTop = original;
    else panel.style.removeProperty('margin-top');
    const originalTransform = panel.getAttribute(
      SIDEBAR_ALIGN_ORIGINAL_TRANSFORM_ATTR
    );
    if (originalTransform) panel.style.transform = originalTransform;
    else panel.style.removeProperty('transform');

    const desiredTop = anchorRect.top;
    const delta = Math.round(desiredTop - panel.getBoundingClientRect().top);
    if (Math.abs(delta) <= 1) return;

    const translate = `translateY(${delta}px)`;
    panel.style.transform = originalTransform
      ? `${originalTransform} ${translate}`
      : translate;
    panel.setAttribute('data-__wb_sidebar_anchor_aligned', '1');
  }

  function restoreSidebarAnchorAlignment() {
    document
      .querySelectorAll('[data-__wb_sidebar_anchor_aligned]')
      .forEach((item) => restoreSidebarPanelAnchorAlignment(item));
  }

  let sidebarAlignPausedUntil = 0;
  function pauseSidebarAlignment(ms = 1800) {
    sidebarAlignPausedUntil = Math.max(sidebarAlignPausedUntil, Date.now() + ms);
  }

  function isComposerAnchorVisible(anchor = findComposerTopAnchor()) {
    const rect = anchor?.getBoundingClientRect?.();
    return !!(
      rect &&
      rect.bottom > 0 &&
      rect.top >= 0 &&
      rect.top < window.innerHeight * 0.75
    );
  }

  function hidePanels(root = document, options = {}) {
    promoteHiddenSidebarShells(root);
    hideFollowRecommendationPanel(root);

    const BLOCK_TITLES = buildBlockTitles();
    const headings = root.querySelectorAll(
      '.wbpro-side-tit .cla, [class*="cardHotSearch_tit_"] .cla, .wbpro-side .f16.fm.cla, .wbpro-side-tit .woo-box-item-flex'
    );
    headings.forEach((h) => {
      const text = normText(h.textContent);
      if (!text) return;
      for (const t of BLOCK_TITLES) {
        if (text.includes(normText(t))) {
          const panel = findSectionRootFromHeading(h);
          if (panel && !panel.hasAttribute('data-__wb_hidden_by_userscript')) {
            panel.style.setProperty('display', 'none', 'important');
            panel.setAttribute('data-__wb_hidden_by_userscript', '1');
          }
          break;
        }
      }
    });
    hideSearchHotBand(root);
    if (!options.skipSidebarLayout) {
      const alignPaused = Date.now() < sidebarAlignPausedUntil;
      normalizeFirstVisibleSidebarGaps(root);
      if (!options.skipAlign && !alignPaused) {
        alignFirstVisibleSidebarToComposer();
      }
    }
  }

  let sidebarScrollRefreshFrame = 0;
  function refreshSidebarAlignmentNow() {
    if (isComposerAnchorVisible()) {
      sidebarAlignPausedUntil = 0;
      normalizeFirstVisibleSidebarGaps(document);
      alignFirstVisibleSidebarToComposer();
      return;
    }
    restoreSidebarAnchorAlignment();
    normalizeFirstVisibleSidebarGaps(document);
  }

  function refreshSidebarAlignmentOnScroll() {
    if (sidebarScrollRefreshFrame) return;
    sidebarScrollRefreshFrame = requestAnimationFrame(() => {
      sidebarScrollRefreshFrame = 0;
      refreshSidebarAlignmentNow();
    });
  }

  let queuedPanelRefreshTimer = 0;
  function queuePanelRefresh(root = document, delay = 80, options = {}) {
    clearTimeout(queuedPanelRefreshTimer);
    queuedPanelRefreshTimer = setTimeout(() => {
      queuedPanelRefreshTimer = 0;
      hidePanels(root || document, options);
    }, delay);
  }

  function scheduleInitialPanelAlignment() {
    const run = () => hidePanels(document);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    }
    [80, 220, 520, 1000, 1800, 2800].forEach((delay) => {
      setTimeout(run, delay);
    });
  }

  function hideFollowRecommendationPanel(root = document) {
    if (!CFG.hideFollowRecommendations || !root || !root.querySelectorAll)
      return;
    const selector = '[page="profileRecom"]';
    const panels = [];
    if (root instanceof Element && root.matches(selector)) panels.push(root);
    root.querySelectorAll(selector).forEach((panel) => panels.push(panel));
    panels.forEach((panel) => {
      if (!panel.hasAttribute('data-__wb_hidden_by_userscript')) {
        panel.style.setProperty('display', 'none', 'important');
        panel.setAttribute('data-__wb_hidden_by_userscript', '1');
      }
    });
  }
  function hideSearchHotBand(root = document) {
    if (!CFG.hideHotSearch || !root || !root.querySelectorAll) return;
    const HOT_BAND_SELECTOR =
      '#hot-band-container, .hot-band-container, .hot-band-tabs';
    const panels = new Set();
    if (root instanceof Element && root.matches(HOT_BAND_SELECTOR)) {
      panels.add(root);
    }
    root.querySelectorAll(HOT_BAND_SELECTOR).forEach((panel) => {
      panels.add(panel);
    });
    panels.forEach((panel) => {
      const side = panel.closest('.wbpro-side');
      if (
        side &&
        side !== document.body &&
        side !== document.documentElement &&
        normText(side.textContent).includes('微博热搜')
      ) {
        side.style.setProperty('display', 'none', 'important');
        side.setAttribute('data-__wb_hidden_by_userscript', '1');
        return;
      }

      const target = findSearchHotBandContainer(panel);
      if (target && target.isConnected) {
        const parent = target.parentElement;
        target.remove();
        removeEmptyHotBandShells(parent);
      }
    });
  }
  function findSearchHotBandContainer(panel) {
    if (
      panel.id === 'hot-band-container' ||
      panel.classList.contains('hot-band-container')
    ) {
      return panel;
    }

    const card = panel.closest(
      '.card-wrap, .card, [class*="card"], [class*="Card"]'
    );
    if (
      card &&
      card !== document.body &&
      card !== document.documentElement
    ) {
      return card;
    }

    const parent = panel.parentElement;
    if (
      parent &&
      parent !== document.body &&
      parent !== document.documentElement &&
      parent.children.length <= 2
    ) {
      return parent;
    }
    return panel;
  }
  function removeEmptyHotBandShells(start) {
    let cur = start;
    while (
      cur &&
      cur !== document.body &&
      cur !== document.documentElement &&
      !normText(cur.textContent) &&
      cur.children.length === 0
    ) {
      const parent = cur.parentElement;
      cur.remove();
      cur = parent;
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => {
      hidePanels();
      scheduleInitialPanelAlignment();
    });
  else {
    hidePanels();
    scheduleInitialPanelAlignment();
  }
  document.addEventListener(LAYOUT_REFRESH_EVENT, (event) => {
    const isBlockedRefresh = event?.detail?.reason === 'blocked-content';
    const composerVisible = isComposerAnchorVisible();
    if (isBlockedRefresh && !composerVisible) {
      pauseSidebarAlignment();
    }
    const panelRefreshOptions = {
      skipAlign: isBlockedRefresh && !composerVisible,
      skipSidebarLayout: false,
    };
    if (isBlockedRefresh) {
      hidePanels(document, panelRefreshOptions);
    }
    queuePanelRefresh(
      document,
      isBlockedRefresh ? 180 : 90,
      panelRefreshOptions
    );
  });
  const mo = new MutationObserver((m) => {
    for (const r of m) {
      for (const n of r.addedNodes) {
        if (n.nodeType === 1) hidePanels(n);
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('scroll', refreshSidebarAlignmentOnScroll, {
    passive: true,
  });
  document.addEventListener('scroll', refreshSidebarAlignmentOnScroll, {
    passive: true,
    capture: true,
  });
  setInterval(() => {
    if (!document.querySelector('.wbpro-side')) return;
    refreshSidebarAlignmentNow();
  }, 600);

  // ---- Settings UI ----
  function ensureStyles() {
    if (document.getElementById('wbset-style')) return;
    const css = `
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
    .wbset-btn2.danger{background:#e74c3c;color:#fff}
    .wbset-btn2.danger:hover{background:#c0392b}
    .danger-zone{border:1px solid #e74c3c;border-radius:12px;padding:12px;margin-top:12px;background:#fdf2f2}
    `;
    const s = document.createElement('style');
    s.id = 'wbset-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function openPanel() {
    ensureStyles();
    let panel = document.querySelector('.wbset-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'wbset-panel';
      panel.innerHTML = `
        <div class="wbset-card" role="dialog" aria-modal="true">
          <div class="wbset-hdr">
            <div>脚本设置</div>
            <button class="wbset-btn2 ghost" id="wbset-close">关闭</button>
          </div>
          <div class="wbset-bdy">
            <div class="wbset-sec">
              <h4>时间线设置</h4>
              <label class="wbset-row"><input type="checkbox" id="wbset-latest"> 主页默认显示「最新微博」（按时间顺序）</label>
              <div class="wbset-row wbset-note">说明：勾选后每次打开首页自动切换到「最新微博」分栏。</div>
            </div>

            <div class="wbset-sec">
              <h4>导航栏设置</h4>
              <label class="wbset-row"><input type="checkbox" id="wbset-nav-video"> 隐藏导航栏「视频」图标</label>
              <label class="wbset-row"><input type="checkbox" id="wbset-nav-recommend"> 隐藏导航栏「推荐」图标</label>
              <label class="wbset-row"><input type="checkbox" id="wbset-nav-game"> 隐藏导航栏「游戏」图标</label>
              <div class="wbset-row wbset-note">说明：分别控制顶部导航栏中的视频、推荐和游戏入口。</div>
            </div>

            <div class="wbset-sec">
              <h4>侧栏版块隐藏</h4>
              <label class="wbset-row"><input type="checkbox" id="wbset-hot"> 隐藏：微博热搜</label>
              <label class="wbset-row"><input type="checkbox" id="wbset-sug"> 隐藏：你可能感兴趣的人</label>
              <label class="wbset-row"><input type="checkbox" id="wbset-follow-rec"> 隐藏：关注推荐</label>
              <label class="wbset-row"><input type="checkbox" id="wbset-common-functions"> 隐藏：常用功能</label>
              <label class="wbset-row"><input type="checkbox" id="wbset-fan-groups"> 隐藏：粉丝群</label>
              <div class="wbset-row wbset-note">说明：仅影响侧栏版块的显示，不改动你的黑名单数据。</div>
            </div>
            <div class="wbset-sec">

              <h4>🛠️ 手动管理</h4>

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

              <div class="wbset-row wbset-note">添加/移除后立即写入本地缓存。</div>

            </div>



            <div class="wbset-sec">

              <h4>🔄 黑名单同步</h4>

              <div class="wbset-row">

                <button class="wbset-btn2" id="wbset-sync-delta">⚡ 增量同步</button>

                <button class="wbset-btn2 ghost" id="wbset-sync-five">🔄 同步前5页</button>

                <button class="wbset-btn2 ghost" id="wbset-sync-full">📡 完整同步</button>

              </div>

              <div class="wbset-row wbset-note">增量：仅第1页；前5页：扫描前5页增量更新；完整：遍历全部分页。</div>

            </div>



            <div class="wbset-sec">

              <h4>💾 备份与恢复</h4>

              <div class="wbset-row">

                <button class="wbset-btn2" id="wbset-export">📤 导出黑名单</button>

                <button class="wbset-btn2" id="wbset-import-merge">📥 导入（合并）</button>

                <button class="wbset-btn2 ghost" id="wbset-import-replace">🔄 导入（替换）</button>

              </div>

              <div class="wbset-row wbset-note">导出为 JSON 文件；合并保留现有数据；替换完全覆盖。</div>

            </div>



            <div class="wbset-sec danger-zone">

              <h4>⚠️ 危险操作</h4>

              <div class="wbset-row">

                <button class="wbset-btn2 danger" id="wbset-clear-all">🗑️ 清空本地黑名单</button>

              </div>

              <div class="wbset-row wbset-note" style="color:#c0392b;">此操作不可恢复，请先导出备份！</div>

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
      const $followRec = panel.querySelector('#wbset-follow-rec');
      const $commonFunctions = panel.querySelector('#wbset-common-functions');
      const $fanGroups = panel.querySelector('#wbset-fan-groups');
      const $latest = panel.querySelector('#wbset-latest');
      const $navVideo = panel.querySelector('#wbset-nav-video');
      const $navRecommend = panel.querySelector('#wbset-nav-recommend');
      const $navGame = panel.querySelector('#wbset-nav-game');
      const $uids = panel.querySelector('#wbset-uids');
      const $count = panel.querySelector('#wbset-count');

      function refreshCfgUI() {
        $hot.checked = !!CFG.hideHotSearch;
        $sug.checked = !!CFG.hideSuggestedPeople;
        $followRec.checked = CFG.hideFollowRecommendations !== false;
        $commonFunctions.checked = CFG.hideCommonFunctions !== false;
        $fanGroups.checked = CFG.hideFanGroups !== false;
        $latest.checked = CFG.defaultLatestTimeline !== false; // 默认true
        $navVideo.checked = !!CFG.hideNavVideo;
        $navRecommend.checked = !!CFG.hideNavRecommend;
        $navGame.checked = CFG.hideNavGame !== false;
      }
      function refreshCount() {
        $count.textContent = String(readBLSet().size);
      }

      refreshCfgUI();
      refreshCount();

      panel
        .querySelector('#wbset-refresh')
        .addEventListener('click', refreshCount);
      panel
        .querySelector('#wbset-reload')
        .addEventListener('click', () => location.reload());
      panel.querySelector('#wbset-export').addEventListener('click', () => {
        const count = exportBlacklist();
        alert(`✅ 已导出 ${count} 个 UID 到 JSON 文件`);
      });

      // 导入（合并）按钮事件
      const fileInputMerge = createFileInput(async (file) => {
        try {
          const result = await importBlacklist(file, 'merge');
          syncRuntimeBL({ restoreHidden: false });
          refreshCount();
          alert(
            `✅ 导入成功！\n` +
              `📂 文件导出时间：${result.exportTime}\n` +
              `📊 文件中 UID 数：${result.importedCount}\n` +
              `➕ 新增 UID 数：${result.addedCount}\n` +
              `📋 当前总数：${result.totalCount}`
          );
        } catch (err) {
          alert(`❌ ${err.message}`);
        }
      });
      panel
        .querySelector('#wbset-import-merge')
        .addEventListener('click', () => {
          fileInputMerge.click();
        });

      // 导入（替换）按钮事件
      const fileInputReplace = createFileInput(async (file) => {
        const confirmReplace = confirm(
          '⚠️ 警告：替换模式将清空现有黑名单！\n\n' +
            '确定要用文件内容完全替换当前黑名单吗？\n' +
            '（建议先导出备份）'
        );
        if (!confirmReplace) return;

        try {
          const result = await importBlacklist(file, 'replace');
          syncRuntimeBL({ restoreHidden: true });
          refreshCount();
          alert(
              `✅ 替换成功！\n` +
              `📂 文件导出时间：${result.exportTime}\n` +
              `📊 导入 UID 数：${result.importedCount}\n` +
              `📋 当前总数：${result.totalCount}`
          );
        } catch (err) {
          alert(`❌ ${err.message}`);
        }
      });
      panel
        .querySelector('#wbset-import-replace')
        .addEventListener('click', () => {
          fileInputReplace.click();
        });

      // 同步按钮事件
      panel.querySelector('#wbset-sync-delta').addEventListener('click', async () => {
        try {
          const result = await window.WB_BL_SYNC.deltaSync();
          alert(`✅ 增量同步完成！新增 ${result.added} 个 UID`);
          refreshCount();
        } catch (err) {
          alert(`❌ 同步失败：${err.message}`);
        }
      });

      panel.querySelector('#wbset-sync-five').addEventListener('click', async () => {
        try {
          const result = await window.WB_BL_SYNC.syncPages(5);
          alert(`✅ 同步前5页完成！新增 ${result.added} 个 UID`);
          refreshCount();
        } catch (err) {
          alert(`❌ 同步失败：${err.message}`);
        }
      });

      panel.querySelector('#wbset-sync-full').addEventListener('click', async () => {
        try {
          const oldSize = window.WB_BL_SYNC.getCount();
          const newSize = await window.WB_BL_SYNC.fullSync();
          alert(`✅ 完整同步完成！新增 ${newSize - oldSize} 个 UID（共 ${newSize}）`);
          refreshCount();
        } catch (err) {
          alert(`❌ 同步失败：${err.message}`);
        }
      });

      panel.querySelector('#wbset-clear-all').addEventListener('click', () => {
        const currentCount = readBLSet().size;
        if (currentCount === 0) {
          alert('黑名单已经是空的');
          return;
        }
        const confirmClear = confirm(
          `⚠️ 警告：此操作不可恢复！\n\n` +
            `确定要清空所有 ${currentCount} 个黑名单 UID 吗？\n` +
            `（强烈建议先点击"导出黑名单"备份）`
        );
        if (!confirmClear) return;

        const doubleConfirm = confirm(
          `🔴 最后确认：真的要清空吗？\n\n` +
            `这将删除 ${currentCount} 个 UID，无法恢复！`
        );
        if (!doubleConfirm) return;

        writeBLSet(new Set());
        syncRuntimeBL({ restoreHidden: true });
        refreshCount();
        alert('✅ 已清空黑名单');
      });

      panel.querySelector('#wbset-bl-add').addEventListener('click', () => {
        const ids = parseUIDInput($uids.value);
        if (!ids.length) return alert('请输入有效的 UID');
        const size = addToBL(ids);
        syncRuntimeBL({ restoreHidden: false });
        refreshCount();
        alert(`已加入 ${ids.length} 个 UID，当前缓存总数：${size}`);
      });
      panel.querySelector('#wbset-bl-remove').addEventListener('click', () => {
        const ids = parseUIDInput($uids.value);
        if (!ids.length) return alert('请输入有效的 UID');
        const size = removeFromBL(ids);
        syncRuntimeBL({ restoreHidden: true });
        refreshCount();
        alert(
          `已从黑名单移除 ${ids.length} 个 UID，当前缓存总数：${size}`
        );
      });

      panel.querySelector('#wbset-save').addEventListener('click', () => {
        CFG.hideHotSearch = $hot.checked;
        CFG.hideSuggestedPeople = $sug.checked;
        CFG.hideFollowRecommendations = $followRec.checked;
        CFG.hideCommonFunctions = $commonFunctions.checked;
        CFG.hideFanGroups = $fanGroups.checked;
        CFG.defaultLatestTimeline = $latest.checked;
        CFG.hideNavVideo = $navVideo.checked;
        CFG.hideNavRecommend = $navRecommend.checked;
        CFG.hideNavGame = $navGame.checked;
        delete CFG.hideNavVideoRecommend;
        saveCfg(CFG);
        // 同步更新 defaultLatest 到油猴菜单使用的存储
        GM_setValue('defaultLatest', $latest.checked);
        // 刷新页面以确保布局正确更新
        location.reload();
      });
      panel.querySelector('#wbset-cancel').addEventListener('click', () => {
        CFG = loadCfg();
        panel.style.display = 'none';
      });
      panel.querySelector('#wbset-close').addEventListener('click', () => {
        CFG = loadCfg();
        panel.style.display = 'none';
      });
      panel.addEventListener('click', (e) => {
        if (e.target === panel) {
          panel.style.display = 'none';
        }
      });
    }
    panel.style.display = 'flex';
  }

  function initLauncher() {
    if (document.querySelector('.wbset-btn')) return;
    ensureStyles();
    const btn = document.createElement('button');
    btn.className = 'wbset-btn';
    btn.textContent = '设置';
    btn.title = '脚本设置';
    btn.addEventListener('click', openPanel);
    document.documentElement.appendChild(btn);
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('打开脚本设置', openPanel);
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initLauncher);
  else initLauncher();
})();
/* === /Settings v4 === */
