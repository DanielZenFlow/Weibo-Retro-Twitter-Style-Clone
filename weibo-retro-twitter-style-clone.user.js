// ==UserScript==
// @sandbox      raw
// @name         微博按时间线显示|隐藏黑名单用户所有言论|屏蔽热搜
// @namespace    https://github.com/DanielZenFlow
// @version      2.0.0
// @description  增强版：模仿早期Twitter的时间线展示。可自动切换到"最新微博"；全接口劫持并隐藏黑名单用户所有言论与转发；隐藏除"最新微博"外导航项、微博热搜、游戏入口、推荐关注等模块；单一防抖MutationObserver；SPA路由清理；手动更新黑名单功能；时间线恢复启用时屏蔽"全部关注"接口返回内容；新增全量同步与五页同步黑名单菜单。
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

  const SCRIPT_VERSION = '2.0.0';

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
  // 策略：1. 启用时屏蔽"全部关注"接口
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
  const OFFICIAL_BLOCK_REQUEST_KEY = 'WB_BL_official_block_request';
  const OFFICIAL_BLOCK_RESPONSE_KEY = 'WB_BL_official_block_response';
  const OFFICIAL_BLOCK_RELAY_PARAM = 'wb_retro_official_block';
  const OFFICIAL_BLOCK_RELAY_TIMEOUT_MS = 15000;
  const CONTENT_FILTER_DEFAULTS = {
    hideBlacklistPosts: true,
    hideBlacklistComments: true,
    hideBlacklistSearchResults: true,
    hideBlacklistUserCards: true,
    hideBlacklistInteractions: true,
    hideAds: true,
  };
  const CONTENT_FILTER_CFG = (() => {
    let cfg = {};
    try {
      cfg = JSON.parse(_GM_getValue('cfg', '{}') || '{}');
    } catch {}
    return Object.assign({}, CONTENT_FILTER_DEFAULTS, cfg);
  })();
  const BLOCKED_CONTENT_HIDE_ATTR = 'data-__wb_bl_hidden_by_userscript';
  const BLOCKED_CONTENT_UID_ATTR = 'data-__wb_bl_hidden_uid';
  const BLOCKED_CONTENT_HIDE_SELECTOR = `[${BLOCKED_CONTENT_HIDE_ATTR}]`;
  const HIDDEN_AD_ATTR = 'data-__wb_ad_hidden_by_userscript';
  const HIDDEN_AD_SELECTOR = `[${HIDDEN_AD_ATTR}]`;
  const RELATIONSHIP_PAGE_ATTR = 'data-__wb_relationship_list_page';
  const LAYOUT_REFRESH_EVENT = 'wb-retro-layout-refresh';
  const FLOATING_VIDEO_PLAYER_SELECTOR = [
    '.mini-player',
    '[class*="mini-player"]',
    '[class*="miniPlayer"]',
    '[class*="MiniPlayer"]',
    '[class*="_miniPlayer_"]',
  ].join(',');
  const EXPLICIT_AD_SELECTOR = [
    '[data-ad-id]',
    '[data-adid]',
    '[ad-id]',
    '[adid]',
    '[data-ad="true"]',
    '[data-is-ad="true"]',
    '[is-ad="true"]',
    '[feedtype="ad"]',
    '[mblogtype="ad"]',
    '[action-type*="feed_ad"]',
    '[action-type*="advert"]',
    '[node-type*="feed_ad"]',
    '[node-type*="advert"]',
    '[class*="feed-ad"]',
    '[class*="feed_ad"]',
    '[class*="FeedAd"]',
    '[class*="advert"]',
    '[class*="Advert"]',
    '[class*="promoted"]',
    '[class*="Promoted"]',
  ].join(',');
  const COMPACTED_VIRTUAL_ITEM_ATTR = 'data-__wb_compacted_virtual_item';
  const COMPACTED_TOP_ITEM_ATTR = 'data-__wb_compacted_top_item';
  const NATIVE_HIDDEN_VIRTUAL_GAP_ATTR =
    'data-__wb_native_hidden_virtual_gap';
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
    scheduleBlockedDOMRefreshWhenPageReady();

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
      ${HIDDEN_AD_SELECTOR} {
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
      /* 首页有新微博时，将红色 NEW 胶囊替换为圆点 */
      [role="navigation"] a[title="首页"][href="/"] .woo-badge-main:has(.woo-badge-new) {
        min-width: var(--w-badge-dot, .625rem) !important;
        width: var(--w-badge-dot, .625rem) !important;
        height: var(--w-badge-dot, .625rem) !important;
        padding: 0 !important;
        border-radius: 50% !important;
        line-height: 0 !important;
        top: 0 !important;
        right: 0 !important;
        transform: translate(50%, -50%) !important;
      }
      [role="navigation"] a[title="首页"][href="/"] .woo-badge-main:has(.woo-badge-new) .woo-badge-new {
        display: none !important;
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

  function hasExplicitAdMarker(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const truthyAdFlag = ['is_ad', 'isAd', 'is_ads', 'is_advert'].some(
      (key) =>
        obj[key] === true ||
        obj[key] === 1 ||
        String(obj[key] || '').toLowerCase() === 'true'
    );
    if (truthyAdFlag) return true;

    const adState = Number(obj.ad_state ?? obj.adState);
    if (Number.isFinite(adState) && adState > 0) return true;

    const hasAdID = ['ad_id', 'adid', 'adId'].some((key) => {
      const value = obj[key];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });
    if (hasAdID) return true;

    if (
      obj.ad_info ||
      obj.adInfo ||
      obj.ad_data ||
      obj.adData ||
      obj.promote_info ||
      obj.promoteInfo ||
      obj.advertise_info ||
      obj.advertiseInfo
    ) {
      return true;
    }

    return ['mblog', 'status'].some((key) => {
      const nested = obj[key];
      return (
        nested &&
        typeof nested === 'object' &&
        !Array.isArray(nested) &&
        hasExplicitAdMarker(nested)
      );
    });
  }

  function filterAdsFromData(obj, seen = new WeakMap(), depth = 0) {
    if (!CONTENT_FILTER_CFG.hideAds) return obj;
    if (!obj || typeof obj !== 'object') return obj;
    if (depth > MAX_FILTER_DEPTH) return obj;
    if (seen.has(obj)) return seen.get(obj);

    if (Array.isArray(obj)) {
      const out = [];
      seen.set(obj, out);
      obj.forEach((item) => {
        if (hasExplicitAdMarker(item)) return;
        out.push(filterAdsFromData(item, seen, depth + 1));
      });
      return out;
    }

    const out = {};
    seen.set(obj, out);
    for (const [key, value] of Object.entries(obj)) {
      out[key] =
        value && typeof value === 'object'
          ? filterAdsFromData(value, seen, depth + 1)
          : value;
    }
    return out;
  }

  function isFilterableContentURL(url) {
    return (
      typeof url === 'string' &&
      /\/(?:ajax\/(?:feed|statuses|comment|getCommentList|repost|like)|graphql\/|(?:mymblog|timeline|index))/.test(
        url
      )
    );
  }

  function shouldFilterBlacklistResponse(url) {
    if (isRelationshipListPage()) return false;
    if (isWeiboSearchResultPage()) {
      return CONTENT_FILTER_CFG.hideBlacklistSearchResults;
    }
    if (
      /\/ajax\/(?:comment|getCommentList)|\/ajax\/statuses\/(?:buildComments|comment|reply)/i.test(
        url
      )
    ) {
      return CONTENT_FILTER_CFG.hideBlacklistComments;
    }
    if (
      /\/ajax\/(?:repost|like)|\/ajax\/statuses\/(?:repost|like)/i.test(url)
    ) {
      return CONTENT_FILTER_CFG.hideBlacklistInteractions;
    }
    return CONTENT_FILTER_CFG.hideBlacklistPosts;
  }

  function filterContentResponseData(data, url = '') {
    let result = data;
    if (CONTENT_FILTER_CFG.hideAds) result = filterAdsFromData(result);
    if (shouldFilterBlacklistResponse(String(url || ''))) {
      result = filterData(result);
    }
    return result;
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
    '[data-user-card]',
    '[data-usercard-mid]',
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
    '[data-user-card]',
    '[data-usercard-mid]',
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
  const USER_CONTEXT_NAME_TARGET_SELECTOR = [
    '.card-feed .content > .info a.name[href]',
    '.content > .info a.name[nick-name][href]',
    '.card-user-c a.name[href]',
    '.card-user-b a.name[href]',
    'a.name[nick-name][href]',
    'a[nick-name][href]',
    'a[href][class*="_name_"]',
    '[class*="_name_"][data-user-id]',
    '[class*="_name_"][data-uid]',
    '[class*="_name_"][usercard]',
    '[class*="_name_"][data-user-card]',
    '[class*="_name_"][data-usercard]',
    'main [class*="_name_"]',
  ].join(',');

  function getUserNameLabel(el) {
    if (!(el instanceof Element)) return '';
    const directLabel = cleanUserDisplayName(
      getNameFromElementAttributes(el) || getOwnDOMText(el)
    );
    if (directLabel) return directLabel;

    // 新版首页/分组时间线会把用户名放在
    // <a class="..._name_..."><span title="用户名">用户名</span></a> 中。
    const labelledChild = el.querySelector(
      ':scope > [title], :scope > [aria-label]'
    );
    if (!(labelledChild instanceof Element)) {
      return cleanUserDisplayName(el.textContent);
    }
    return cleanUserDisplayName(
      getNameFromElementAttributes(labelledChild) ||
        getOwnDOMText(labelledChild) ||
        labelledChild.textContent ||
        el.textContent
    );
  }

  function getUserNameContextTarget(target) {
    const el =
      target instanceof Element ? target : target?.parentElement || null;
    if (!el) return null;
    const candidate = el.closest(USER_CONTEXT_NAME_TARGET_SELECTOR);
    if (!(candidate instanceof Element)) return null;

    const label = getUserNameLabel(candidate);
    if (!label) return null;
    if (
      candidate.matches('a') &&
      !candidate.getAttribute('href') &&
      !firstDOMUID(candidate)
    ) {
      return null;
    }
    return candidate;
  }

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
    addDirectUID(el.getAttribute('data-usercard-mid'));
    addDirectUID(el.getAttribute('data-uid'));
    addDirectUID(el.getAttribute('uid'));
    addDirectUID(el.getAttribute('usercard'));
    addDirectUID(el.getAttribute('data-usercard'));

    ['usercard', 'data-user-card', 'data-usercard'].forEach((attr) => {
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
      'data-user-card',
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
    '转发',
    '评论',
    '赞',
    '收藏',
    '分享',
    '举报',
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
    const elements = [];
    const collect = (item) => {
      if (
        item instanceof Element &&
        extractDOMUIDs(item).has(String(uid))
      ) {
        elements.push(item);
      }
    };
    collect(root);
    root.querySelectorAll(DOM_UID_SELECTOR).forEach(collect);
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
    if (
      el.closest(
        '.card-user-b, .card-user-c, [class*="UserCard"], [class*="user-card"], [class*="user_card"]'
      )
    ) {
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

  function isNativeHiddenVirtualGap(item, y = null) {
    if (!(item instanceof Element) || !item.matches(VIRTUAL_VIEW_SELECTOR)) {
      return false;
    }
    if (item.hasAttribute(BLOCKED_CONTENT_HIDE_ATTR)) return false;

    const style = getComputedStyle(item);
    if (style.display !== 'none') return false;

    const baseY = y === null ? getVirtualBaseY(item) : y;
    if (!Number.isFinite(baseY) || isParkedVirtualItem(item, baseY)) {
      return false;
    }

    const text = normDOMText(item.textContent);
    if (!text) return false;

    const wrapper = item.closest(VIRTUAL_WRAPPER_SELECTOR);
    if (!wrapper) return false;

    let parent = item.parentElement;
    while (parent && parent !== wrapper) {
      if (getComputedStyle(parent).display === 'none') return false;
      parent = parent.parentElement;
    }
    if (getComputedStyle(wrapper).display === 'none') return false;

    const wrapperRect = wrapper.getBoundingClientRect();
    const expectedTop = wrapperRect.top + baseY;
    const viewport = Math.max(window.innerHeight || 0, 1);
    return expectedTop > -viewport && expectedTop < viewport * 2;
  }

  function hasNativeHiddenVirtualGaps(root = document) {
    if (!root || !root.querySelectorAll) return false;
    const items = [];
    if (root instanceof Element) {
      if (root.matches(VIRTUAL_VIEW_SELECTOR)) items.push(root);
      root
        .querySelectorAll(VIRTUAL_VIEW_SELECTOR)
        .forEach((item) => items.push(item));
    } else {
      root
        .querySelectorAll(VIRTUAL_VIEW_SELECTOR)
        .forEach((item) => items.push(item));
    }
    return items.some((item) => isNativeHiddenVirtualGap(item));
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
    item.removeAttribute(NATIVE_HIDDEN_VIRTUAL_GAP_ATTR);
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
      `[${NATIVE_HIDDEN_VIRTUAL_GAP_ATTR}]`,
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
      node.removeAttribute(NATIVE_HIDDEN_VIRTUAL_GAP_ATTR);
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
    item.removeAttribute(NATIVE_HIDDEN_VIRTUAL_GAP_ATTR);
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
          const rawIndex = getVirtualItemIndex(item);
          const index =
            rawIndex !== null
              ? rawIndex
              : Number.isFinite(y)
                ? y
                : null;
          const hiddenUID = String(
            item.getAttribute(BLOCKED_CONTENT_UID_ATTR) || ''
          ).trim();
          const hiddenVirtualUID = getHiddenVirtualItemUID(item);
          const nativeHiddenGap = isNativeHiddenVirtualGap(item, y);
          const view = {
            item,
            index,
            mode: getVirtualLayoutMode(item),
            y,
            x: getTranslateX(item),
            hidden: !!hiddenVirtualUID || nativeHiddenGap,
            hiddenUID: hiddenVirtualUID || hiddenUID,
            nativeHiddenGap,
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
          if (view.nativeHiddenGap && !view.hiddenUID) {
            view.item.removeAttribute(BLOCKED_CONTENT_HIDE_ATTR);
            view.item.removeAttribute(BLOCKED_CONTENT_UID_ATTR);
            view.item.setAttribute(NATIVE_HIDDEN_VIRTUAL_GAP_ATTR, '1');
          } else if (view.hiddenUID) {
            view.item.setAttribute(BLOCKED_CONTENT_UID_ATTR, view.hiddenUID);
          }
          view.item.removeAttribute(COMPACTED_VIRTUAL_ITEM_ATTR);
          view.item.removeAttribute(COMPACTED_TOP_ITEM_ATTR);
          if (!view.nativeHiddenGap || view.hiddenUID) {
            view.item.removeAttribute(NATIVE_HIDDEN_VIRTUAL_GAP_ATTR);
            setImportantStyleIfNeeded(view.item, 'display', 'none');
            setImportantStyleIfNeeded(view.item, 'height', '0px');
            setImportantStyleIfNeeded(view.item, 'min-height', '0px');
            setImportantStyleIfNeeded(view.item, 'margin', '0px');
            setImportantStyleIfNeeded(view.item, 'padding', '0px');
          }
          return;
        }

        view.item.removeAttribute(NATIVE_HIDDEN_VIRTUAL_GAP_ATTR);
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

  function isWeiboSearchResultPage() {
    return (
      location.hostname === 's.weibo.com' &&
      /^\/weibo(?:\/|$)/.test(location.pathname)
    );
  }

  const SEARCH_RESULT_CARD_SELECTOR = [
    '.card-wrap[action-type="feed_list_item"]',
    '.card-wrap[mid]',
  ].join(',');
  const SEARCH_RESULT_AUTHOR_SELECTOR = [
    '.card-feed .content > .info a.name[href]',
    '.card-feed .content > .info [nick-name]',
    '.card-feed .avator a[href]',
    '.card-feed .avatar a[href]',
    '.content > .info a.name[href]',
  ].join(',');

  function getBlacklistDOMCategory(root) {
    if (!(root instanceof Element)) return 'posts';
    if (
      isWeiboSearchResultPage() &&
      root.closest('.card-wrap') &&
      !root.closest(SEARCH_RESULT_CARD_SELECTOR)
    ) {
      return 'userCards';
    }
    if (isCommentContentRoot(root) || isInsideCommentContentRoot(root)) {
      return 'comments';
    }
    if (
      isWeiboSearchResultPage() &&
      root.closest(SEARCH_RESULT_CARD_SELECTOR)
    ) {
      return 'searchResults';
    }
    if (isPostContentRoot(root) || root.closest(DOM_POST_ROOT_SELECTOR)) {
      return 'posts';
    }
    return 'userCards';
  }

  function shouldHideBlacklistDOMRoot(root) {
    const category = getBlacklistDOMCategory(root);
    if (category === 'comments') {
      return CONTENT_FILTER_CFG.hideBlacklistComments;
    }
    if (category === 'searchResults') {
      return CONTENT_FILTER_CFG.hideBlacklistSearchResults;
    }
    if (category === 'userCards') {
      return CONTENT_FILTER_CFG.hideBlacklistUserCards;
    }
    return CONTENT_FILTER_CFG.hideBlacklistPosts;
  }

  function findExplicitAdRoot(marker) {
    if (!(marker instanceof Element)) return null;
    return (
      marker.closest(
        [
          'article',
          '.card-wrap[action-type="feed_list_item"]',
          '.card-wrap[mid]',
          '[action-type="feed_list_item"]',
          '[node-type="feed_list_item"]',
          '[class*="Feed_wrap_"]',
          '[class*="Feed_card_"]',
        ].join(',')
      ) || marker
    );
  }

  function hasExplicitAdLabel(root) {
    if (!(root instanceof Element)) return false;
    const labels = root.querySelectorAll(
      [
        '[class*="ad-label"]',
        '[class*="ad_label"]',
        '[class*="AdLabel"]',
        '[class*="advert"]',
        '[class*="Advert"]',
        '[class*="promoted"]',
        '[class*="Promoted"]',
        'span',
        'a',
      ].join(',')
    );
    return Array.from(labels).some((label) =>
      /^(?:广告|推广|赞助)$/.test(normDOMText(label.textContent))
    );
  }

  function hideRecognizedAds(root = document) {
    if (
      !CONTENT_FILTER_CFG.hideAds ||
      !root ||
      !root.querySelectorAll
    ) {
      return false;
    }

    const markers = new Set();
    if (root instanceof Element) {
      if (root.matches(EXPLICIT_AD_SELECTOR)) markers.add(root);
      const containing = root.closest(EXPLICIT_AD_SELECTOR);
      if (containing) markers.add(containing);
    }
    root
      .querySelectorAll(EXPLICIT_AD_SELECTOR)
      .forEach((marker) => markers.add(marker));

    const contentRoots = new Set();
    const addContentRoot = (item) => {
      const adRoot = findExplicitAdRoot(item);
      if (adRoot) contentRoots.add(adRoot);
    };
    markers.forEach(addContentRoot);

    const candidates = [];
    if (
      root instanceof Element &&
      root.matches(DOM_POST_ROOT_SELECTOR)
    ) {
      candidates.push(root);
    }
    root
      .querySelectorAll(DOM_POST_ROOT_SELECTOR)
      .forEach((item) => candidates.push(item));
    candidates.forEach((item) => {
      if (hasExplicitAdLabel(item)) contentRoots.add(item);
    });

    let hiddenAny = false;
    contentRoots.forEach((adRoot) => {
      const target = findHideShell(adRoot);
      if (
        !(target instanceof Element) ||
        target.hasAttribute(HIDDEN_AD_ATTR)
      ) {
        return;
      }
      rememberVirtualItemSlotHeight(target);
      pauseVideosIn(target);
      target.setAttribute(HIDDEN_AD_ATTR, '1');
      hiddenAny = true;
    });
    return hiddenAny;
  }

  function hideBlockedSearchResultCards(root = document) {
    if (
      !isWeiboSearchResultPage() ||
      !CONTENT_FILTER_CFG.hideBlacklistSearchResults ||
      !BL.size ||
      !root ||
      !root.querySelectorAll
    ) {
      return false;
    }

    const cards = new Set();
    if (root instanceof Element) {
      if (root.matches(SEARCH_RESULT_CARD_SELECTOR)) cards.add(root);
      const containingCard = root.closest(SEARCH_RESULT_CARD_SELECTOR);
      if (containingCard) cards.add(containingCard);
    }
    root
      .querySelectorAll(SEARCH_RESULT_CARD_SELECTOR)
      .forEach((card) => cards.add(card));

    let hiddenAny = false;
    cards.forEach((card) => {
      if (card.hasAttribute(BLOCKED_CONTENT_HIDE_ATTR)) return;
      const author = card.querySelector(SEARCH_RESULT_AUTHOR_SELECTOR);
      const uid = firstDOMUID(author);
      if (!uid || !BL.has(uid)) return;
      if (hideContentRoot(card, uid)) hiddenAny = true;
    });
    return hiddenAny;
  }

  function initSearchResultBlacklistFilter() {
    if (!isWeiboSearchResultPage()) return;

    let refreshTimer = 0;
    const run = () => {
      refreshTimer = 0;
      hideBlockedSearchResultCards(document);
    };
    const schedule = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(run, 40);
    };
    const observer = new MutationObserver(schedule);
    const attach = () => {
      const root = document.body || document.documentElement;
      if (!root) {
        setTimeout(attach, 50);
        return;
      }
      observer.observe(root, { childList: true, subtree: true });
      run();
    };

    attach();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    }
    window.addEventListener('load', run, { once: true });
    setTimeout(run, 250);
    setTimeout(run, 1000);
    setTimeout(run, 2500);
    window.addEventListener('beforeunload', () => observer.disconnect(), {
      once: true,
    });
  }

  function getSearchResultUserContext(el) {
    if (!(el instanceof Element) || !isWeiboSearchResultPage()) return null;

    const card = el.closest(
      '.card-wrap[action-type="feed_list_item"], .card-wrap[mid], .card-wrap'
    );
    if (!card) return null;

    const buildContext = (source, nameSource = source) => {
      if (!(source instanceof Element)) return null;
      const uid = firstDOMUID(source);
      if (!uid) return null;

      const explicitName = cleanUserDisplayName(
        getNameFromElementAttributes(nameSource) || getOwnDOMText(nameSource)
      );
      const name =
        explicitName || getUserDisplayName(nameSource || source, uid, card);
      const url = getProfileURL(nameSource || source, uid, card);
      if (!url) return null;

      return {
        uid,
        url,
        name,
        source,
        root: card,
      };
    };

    // 点击的元素本身明确属于某个用户时优先使用它，但绝不从转发/评论操作区取 UID。
    const directNameSource = getUserNameContextTarget(el);
    if (directNameSource && card.contains(directNameSource)) {
      const directNameContext = buildContext(
        directNameSource,
        directNameSource
      );
      if (directNameContext) return directNameContext;
    }

    const directSource = el.closest(
      [
        '[data-user-id]',
        '[data-user-card]',
        '[data-usercard-mid]',
        '[data-uid]',
        '[uid]',
        '[usercard]',
        '[data-usercard]',
        '[nick-name]',
        'a[href*="/u/"]',
        'a[href*="/p/100505"]',
        'a[href*="/n/"]',
      ].join(',')
    );
    if (directSource && card.contains(directSource)) {
      const directContext = buildContext(directSource, directSource);
      if (directContext) return directContext;
    }

    // 搜索卡片头像常常不带 UID；此时从卡片头部主作者区域解析，避开底部“转发”按钮。
    const feed =
      Array.from(card.children).find((child) =>
        child.matches?.('.card-feed')
      ) ||
      card.querySelector('.card-feed') ||
      card;
    const nameSource = feed.querySelector(
      [
        '.content > .info a.name',
        '.content > .info [nick-name]',
        'a.name[nick-name]',
        '[nick-name][usercard]',
        '[nick-name][data-user-card]',
        '[nick-name][data-usercard]',
      ].join(',')
    );
    const avatarSource = feed.querySelector(
      [
        '.avator [usercard]',
        '.avator [data-user-card]',
        '.avator [data-usercard]',
        '.avator [data-user-id]',
        '.avator [data-uid]',
        '.avatar [usercard]',
        '.avatar [data-user-card]',
        '.avatar [data-usercard]',
        '.avatar [data-user-id]',
        '.avatar [data-uid]',
      ].join(',')
    );
    const fallbackUIDSource = feed.querySelector(
      [
        '.content > .info [usercard]',
        '.content > .info [data-user-card]',
        '.content > .info [data-usercard]',
        '.content > .info [data-user-id]',
        '.content > .info [data-uid]',
      ].join(',')
    );
    const uidSource = [
      nameSource,
      nameSource?.closest('.info'),
      avatarSource,
      fallbackUIDSource,
    ]
      .filter((item) => item instanceof Element)
      .find((item) => !!firstDOMUID(item));

    return buildContext(uidSource, nameSource || uidSource);
  }

  function getCurrentProfilePageUID() {
    if (!['weibo.com', 'www.weibo.com'].includes(location.hostname)) return '';
    const match = location.pathname.match(/^\/(?:u\/)?(\d{5,})(?:\/|$)/);
    return match ? match[1] : '';
  }

  function getUserContextFromTarget(target) {
    const el =
      target instanceof Element ? target : target?.parentElement || null;
    if (!el) return null;
    const searchContext = getSearchResultUserContext(el);
    if (searchContext) return searchContext;

    const source = el.closest(USER_CONTEXT_TARGET_SELECTOR) || el;

    const post = source.closest(DOM_CONTENT_ROOT_SELECTOR);
    const uid = firstDOMUID(source, post) || getCurrentProfilePageUID();
    if (!uid) return null;

    const url =
      getProfileURL(source, uid, post) ||
      (uid === getCurrentProfilePageUID() ? location.href : '');
    if (!url) return null;
    const root = findContentRootForUID(source, uid);
    const fallbackRoot =
      post && !isUnsafePostRootForUID(post, uid) ? post : null;

    return {
      uid,
      url,
      name:
        getUserNameLabel(el) || getUserDisplayName(el, uid, post),
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
      if (shouldHideBlacklistDOMRoot(post)) {
        hideContentRoot(post, ctx.uid);
      }
      if (
        CONTENT_FILTER_CFG.hideBlacklistComments &&
        isCommentContentRoot(post)
      ) {
        const commentList = post.closest('.wbpro-list') || post.parentElement;
        hideBlockedCommentRoots(commentList || post);
      } else if (CONTENT_FILTER_CFG.hideBlacklistPosts) {
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

  function clearOfficialBlockRelayState(requestId) {
    const request = _GM_getValue(OFFICIAL_BLOCK_REQUEST_KEY, null);
    if (request?.id === requestId) {
      _GM_setValue(OFFICIAL_BLOCK_REQUEST_KEY, null);
    }
    const response = _GM_getValue(OFFICIAL_BLOCK_RESPONSE_KEY, null);
    if (response?.id === requestId) {
      _GM_setValue(OFFICIAL_BLOCK_RESPONSE_KEY, null);
    }
  }

  function requestOfficialBlockViaMainHost(uid) {
    if (!_GM_openInTab) {
      return Promise.reject(new Error('当前脚本管理器不支持主站中继请求'));
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    _GM_setValue(OFFICIAL_BLOCK_RESPONSE_KEY, null);
    _GM_setValue(OFFICIAL_BLOCK_REQUEST_KEY, {
      id: requestId,
      uid: String(uid),
      createdAt: Date.now(),
    });

    const relayURL = new URL('https://weibo.com/');
    relayURL.searchParams.set(OFFICIAL_BLOCK_RELAY_PARAM, requestId);
    const relayTab = _GM_openInTab(relayURL.href, {
      active: false,
      insert: true,
      setParent: true,
    });

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const response = _GM_getValue(OFFICIAL_BLOCK_RESPONSE_KEY, null);
        if (response?.id === requestId) {
          clearInterval(timer);
          try {
            relayTab?.close?.();
          } catch {}
          clearOfficialBlockRelayState(requestId);
          if (response.ok) {
            resolve(response.data || { ok: 1 });
          } else {
            reject(new Error(response.error || '新浪微博黑名单请求失败'));
          }
          return;
        }

        if (Date.now() - startedAt < OFFICIAL_BLOCK_RELAY_TIMEOUT_MS) return;
        clearInterval(timer);
        try {
          relayTab?.close?.();
        } catch {}
        clearOfficialBlockRelayState(requestId);
        reject(new Error('新浪微博主站中继请求超时'));
      }, 200);
    });
  }

  async function processOfficialBlockRelay() {
    if (!canUseSettingApi()) return;

    let requestId = '';
    try {
      requestId = new URL(location.href).searchParams.get(
        OFFICIAL_BLOCK_RELAY_PARAM
      );
    } catch {}
    if (!requestId) return;

    const request = _GM_getValue(OFFICIAL_BLOCK_REQUEST_KEY, null);
    if (
      request?.id !== requestId ||
      !/^\d{5,}$/.test(String(request?.uid || '')) ||
      Date.now() - Number(request?.createdAt || 0) >
        OFFICIAL_BLOCK_RELAY_TIMEOUT_MS
    ) {
      _GM_setValue(OFFICIAL_BLOCK_RESPONSE_KEY, {
        id: requestId,
        ok: false,
        error: '新浪微博主站中继请求无效或已过期',
      });
      return;
    }

    try {
      const data = await addUserToWeiboBlacklist(request.uid, {
        allowRelay: false,
      });
      _GM_setValue(OFFICIAL_BLOCK_RESPONSE_KEY, {
        id: requestId,
        ok: true,
        data,
      });
    } catch (err) {
      _GM_setValue(OFFICIAL_BLOCK_RESPONSE_KEY, {
        id: requestId,
        ok: false,
        error: err?.message || String(err),
      });
    }

    setTimeout(() => {
      try {
        window.close();
      } catch {}
    }, 250);
  }

  async function addUserToWeiboBlacklist(uid, options = {}) {
    const headers = {
      'content-type': 'application/json; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
      'client-version': '3.0.0',
    };
    const xsrf = getCookieValue('XSRF-TOKEN');
    if (xsrf) headers['x-xsrf-token'] = xsrf;

    const payload = {
      uid: Number(uid),
      status: 1,
      interact: 1,
      follow: 1,
    };
    const body = JSON.stringify(payload);

    // 微博 WAF 会拒绝搜索子域发起的跨域拉黑请求；交给后台主站页同源执行。
    if (location.hostname === 's.weibo.com') {
      if (options.allowRelay === false) {
        throw new Error('新浪微博黑名单请求必须在主站同源执行');
      }
      return requestOfficialBlockViaMainHost(uid);
    }

    const apiHost =
      location.hostname === 'www.weibo.com'
        ? 'https://www.weibo.com'
        : 'https://weibo.com';
    const res = await WB_BL_NATIVE.fetch(`${apiHost}/ajax/statuses/filterUser`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body,
    });

    let data = null;
    try {
      data = await res.clone().json();
    } catch {}
    if (!res.ok || data?.ok !== 1) {
      throw new Error(
        data?.msg || data?.message || `新浪微博返回异常（HTTP ${res.status}）`
      );
    }
    return data;
  }

  processOfficialBlockRelay();

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
      const nameTarget = getUserNameContextTarget(e.target);
      const ctx = nameTarget ? getUserContextFromTarget(nameTarget) : null;
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
    if (!CONTENT_FILTER_CFG.hideBlacklistComments) return false;
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
    const hiddenAd = hideRecognizedAds(root || document);
    removeWeiboFloatingVideoPlayers(root || document);
    suppressFloatingVideoPlayers(root || document);
    if (!root || !root.querySelectorAll) return;
    if (isRelationshipListPage()) {
      restoreHiddenRelationshipItems(document);
      return;
    }
    if (!BL.size) {
      compactVirtualScrollerGaps(root);
      return;
    }
    const nodes = [];
    if (root instanceof Element && root.matches(DOM_UID_SELECTOR)) {
      nodes.push(root);
    }
    root.querySelectorAll(DOM_UID_SELECTOR).forEach((el) => nodes.push(el));

    let hiddenAny = hiddenAd || hideBlockedSearchResultCards(root);
    nodes.forEach((el) => {
      const blockedUID = [...extractDOMUIDs(el)].find((uid) => BL.has(uid));
      if (!blockedUID) return;

      const post = findContentRootForUID(el, blockedUID);
      if (!shouldHideBlacklistDOMRoot(post)) return;
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

  function scheduleBlockedDOMRefreshWhenPageReady() {
    const run = () => {
      hideBlockedDOMPosts(document);
      hideBlockedCommentRoots(document);
      scheduleBlockedDOMRefresh();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
    window.addEventListener('load', run, { once: true });
    setTimeout(run, 2500);
  }

  let nativeVirtualGapRefreshFrame = 0;
  function refreshNativeVirtualGapsOnScroll() {
    if (nativeVirtualGapRefreshFrame) return;
    nativeVirtualGapRefreshFrame = requestAnimationFrame(() => {
      nativeVirtualGapRefreshFrame = 0;
      if (isRelationshipListPage()) return;
      if (hasNativeHiddenVirtualGaps(document)) {
        compactVirtualScrollerGaps(document);
      }
    });
  }

  function isRelevantBlockedLayoutMutationTarget(target) {
    if (!(target instanceof Element)) return false;
    if (
      !hasHiddenNonCommentContent(document) &&
      !hasNativeHiddenVirtualGaps(document)
    ) {
      return false;
    }
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
    // 只在启用"主页默认显示最新微博"时屏蔽"全部关注"流
    if (
      timelineDefault.value &&
      url.includes('unreadfriendstimeline')
    ) {
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

    if (isFilterableContentURL(url)) {
      try {
        const data = await res.clone().json();
        return new Response(JSON.stringify(filterContentResponseData(data, url)), {
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

        // 只在启用"主页默认显示最新微博"时屏蔽"全部关注"流
        if (
          timelineDefault.value &&
          url.includes('unreadfriendstimeline')
        ) {
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
        if (isFilterableContentURL(url)) {
          try {
            const o = JSON.parse(this.responseText);
            defineXHRTextResponse(
              this,
              JSON.stringify(filterContentResponseData(o, url))
            );
          } catch {}
        }
      }
    });
    return WB_BL_NATIVE.XHRSend.call(this, body);
  };

  // === WebSocket 拦截 ===
  function getFilteredWebSocketEvent(evt, url = '') {
    if (!evt || typeof evt.data !== 'string') return evt;
    try {
      const data = JSON.stringify(
        filterContentResponseData(JSON.parse(evt.data), url)
      );
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
      this.__wbURL = String(url || '');
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
                return listener.call(
                  this,
                  getFilteredWebSocketEvent(evt, this.__wbURL)
                );
              }
            : {
                handleEvent: (evt) =>
                  listener.handleEvent.call(
                    listener,
                    getFilteredWebSocketEvent(evt, this.__wbURL)
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
        ? (evt) =>
            this.__wbOnMessage.call(
              this,
              getFilteredWebSocketEvent(evt, this.__wbURL)
            )
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
        const hasNativeHiddenGap = hasNativeHiddenVirtualGaps(document);
        ms.forEach((m) => {
          if (
            m.type === 'attributes' &&
            isRelevantBlockedLayoutMutationTarget(m.target)
          ) {
            needsFullRefresh = true;
            return;
          }
          Array.from(m.addedNodes).forEach((n) => {
            if (n?.nodeType === 1) {
              const addedElement = n;
              hideRecognizedAds(addedElement);
              removeWeiboFloatingVideoPlayers(addedElement);
              suppressFloatingVideoPlayers(addedElement);
              if (
                hasHiddenFeedContent ||
                hasNativeHiddenGap ||
                addedElement.matches(DOM_UID_SELECTOR) ||
                addedElement.querySelector(DOM_UID_SELECTOR)
              ) {
                hideBlockedDOMPosts(
                  hasNativeHiddenGap ? document : addedElement
                );
              }
              hideBlockedCommentRoots(addedElement);
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

  window.addEventListener('scroll', refreshNativeVirtualGapsOnScroll, {
    passive: true,
  });
  document.addEventListener('scroll', refreshNativeVirtualGapsOnScroll, {
    passive: true,
    capture: true,
  });

  initUserContextMenu();
  initSearchResultBlacklistFilter();

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

/* === Settings v5: standard navigation + UID management === */
(function () {
  'use strict';
  const UID_KEY = 'WB_BL_list';
  const UID_MANAGER_PAGE_SIZE = 50;
  const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;
  const MAX_IMPORT_UIDS = 100000;

  const DEFAULTS = {
    hideHotSearch: true,
    hideSuggestedPeople: true,
    hideFollowRecommendations: true,
    hideCommonFunctions: true,
    hideFanGroups: true,
    hideFrequentSuperTopics: true,
    hideNavVideo: false,
    hideNavRecommend: false,
    hideNavGame: true,
    defaultLatestTimeline: true,
    hideSearchRelatedUsers: true,
    hideBlacklistPosts: true,
    hideBlacklistComments: true,
    hideBlacklistSearchResults: true,
    hideBlacklistUserCards: true,
    hideBlacklistInteractions: true,
    hideAds: true,
    showSettingsButton: true,
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
    const addedUIDs = [];
    uids.forEach((u) => {
      const uid = String(u).trim();
      if (!set.has(uid)) addedUIDs.push(uid);
      set.add(uid);
    });
    writeBLSet(set);
    return { size: set.size, added: addedUIDs.length };
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
      version: '2.0.0',
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
          const addedUIDs = uidsToImport.filter(
            (uid) => !currentSet.has(uid)
          );

          if (mode === 'replace') {
            // 替换模式：清空后导入
            const newSet = new Set(uidsToImport);
            writeBLSet(newSet);
            newSize = newSet.size;
            addedCount = addedUIDs.length;
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
    if (CFG.hideFrequentSuperTopics) {
      t.push('经常访问的超话', '经常访问超话');
    }
    return new Set(t);
  }
  const SEARCH_RELATED_USERS_HIDDEN_ATTR =
    'data-__wb_search_related_users_hidden';

  function hideSearchRelatedUsersPanel(root = document) {
    if (
      location.hostname !== 's.weibo.com' ||
      !/^\/weibo(?:\/|$)/.test(location.pathname) ||
      !root ||
      !root.querySelectorAll
    ) {
      return;
    }

    if (!CFG.hideSearchRelatedUsers) {
      document
        .querySelectorAll(`[${SEARCH_RELATED_USERS_HIDDEN_ATTR}]`)
        .forEach((panel) => {
          panel.style.removeProperty('display');
          panel.removeAttribute(SEARCH_RELATED_USERS_HIDDEN_ATTR);
          panel.removeAttribute('data-__wb_hidden_by_userscript');
        });
      return;
    }

    const headings = [];
    if (
      root instanceof Element &&
      root.matches('.card-head .title') &&
      normText(root.textContent) === '相关用户'
    ) {
      headings.push(root);
    }
    root.querySelectorAll('.card-head .title').forEach((heading) => {
      if (normText(heading.textContent) === '相关用户') headings.push(heading);
    });

    headings.forEach((heading) => {
      const panel = heading.closest('.card-wrap');
      if (
        !panel ||
        panel === document.body ||
        panel === document.documentElement
      ) {
        return;
      }
      panel.style.setProperty('display', 'none', 'important');
      panel.setAttribute(SEARCH_RELATED_USERS_HIDDEN_ATTR, '1');
      panel.setAttribute('data-__wb_hidden_by_userscript', '1');
    });
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
    hideSearchRelatedUsersPanel(root);

    const BLOCK_TITLES = buildBlockTitles();
    const headings = root.querySelectorAll(
      '.wbpro-side-tit .cla, [class*="cardHotSearch_tit_"] .cla, .wbpro-side .f16.fm.cla, .wbpro-side-tit .woo-box-item-flex, .wbpro-side [class*="_topicTitleText_"], .wbpro-side [class*="topicTitleText"]'
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
    .wbset-btn{position:fixed;right:24px;bottom:24px;z-index:999999;width:46px;height:46px;display:grid;place-items:center;padding:0;border:1px solid rgba(0,0,0,.1);border-radius:50%;background:rgba(255,255,255,.94);color:#252525;cursor:pointer;box-shadow:0 8px 26px rgba(0,0,0,.18);backdrop-filter:blur(10px);transition:transform .18s ease,box-shadow .18s ease,background .18s ease;}
    .wbset-btn svg{width:21px;height:21px;display:block;transition:transform .22s ease}
    .wbset-btn:hover{background:#fff;transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,.22)}
    .wbset-btn:hover svg{transform:rotate(24deg)}.wbset-btn:active{transform:translateY(0) scale(.96)}
    .wbset-panel{--wbset-bg:#fff;--wbset-sidebar:#f7f7f8;--wbset-text:#171717;--wbset-muted:#6f6f78;--wbset-border:#e8e8eb;--wbset-hover:#eeeeF1;--wbset-accent:#111;position:fixed;inset:0;z-index:999998;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.42);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--wbset-text);}
    .wbset-card{width:min(940px,94vw);height:min(720px,90vh);display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;background:var(--wbset-bg);color:var(--wbset-text);border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.28);}
    .wbset-hdr{min-height:64px;padding:0 20px;border-bottom:1px solid var(--wbset-border);display:flex;align-items:center;justify-content:space-between;}
    .wbset-title{display:flex;align-items:baseline;gap:10px}.wbset-title strong{font-size:16px}.wbset-version{font-size:12px;color:var(--wbset-muted)}
    .wbset-shell{display:grid;grid-template-columns:196px minmax(0,1fr);min-height:0}
    .wbset-nav{padding:14px 10px;background:var(--wbset-sidebar);border-right:1px solid var(--wbset-border);overflow:auto}
    .wbset-nav button{width:100%;padding:9px 11px;margin:2px 0;border:0;border-radius:8px;background:transparent;color:var(--wbset-muted);font:500 13px/1.3 inherit;text-align:left;cursor:pointer}
    .wbset-nav button:hover{background:var(--wbset-hover);color:var(--wbset-text)}
    .wbset-nav button.is-active{background:var(--wbset-bg);color:var(--wbset-text);box-shadow:0 0 0 1px var(--wbset-border)}
    .wbset-content{min-width:0;overflow:auto;padding:26px 30px 34px}
    .wbset-page{display:none}.wbset-page.is-active{display:block}
    .wbset-page-head{margin-bottom:22px}.wbset-page-head h3{margin:0 0 5px;font-size:20px;line-height:1.3}.wbset-page-head p{margin:0;color:var(--wbset-muted);font-size:13px}
    .wbset-sec{padding:0;border:1px solid var(--wbset-border);border-radius:12px;overflow:hidden;margin-bottom:16px;background:var(--wbset-bg)}
    .wbset-sec-title{padding:13px 15px 10px;font-size:13px;font-weight:650;border-bottom:1px solid var(--wbset-border)}
    .wbset-setting{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 15px;border-bottom:1px solid var(--wbset-border);cursor:pointer}
    .wbset-setting:last-child{border-bottom:0}.wbset-setting:hover{background:color-mix(in srgb,var(--wbset-sidebar) 58%,transparent)}
    .wbset-setting-copy{min-width:0;display:grid;gap:3px}.wbset-setting-copy strong{font-size:13px;font-weight:560}.wbset-setting-copy span{font-size:12px;line-height:1.45;color:var(--wbset-muted)}
    .wbset-setting input[type="checkbox"]{position:absolute;opacity:0;pointer-events:none}
    .wbset-switch{position:relative;flex:0 0 auto;width:34px;height:20px;border-radius:999px;background:#c9c9cf;transition:.16s ease}
    .wbset-switch::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:.16s ease}
    .wbset-setting input:checked + .wbset-switch{background:#202020}.wbset-setting input:checked + .wbset-switch::after{transform:translateX(14px)}
    .wbset-row{display:flex;align-items:center;flex-wrap:wrap;gap:9px;padding:12px 15px}.wbset-row + .wbset-row{padding-top:0}
    .wbset-row textarea{width:100%;min-height:68px;box-sizing:border-box;resize:vertical;padding:9px 10px;border:1px solid var(--wbset-border);border-radius:8px;background:var(--wbset-bg);color:var(--wbset-text);font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}
    .wbset-input{box-sizing:border-box;padding:9px 10px;border:1px solid var(--wbset-border);border-radius:8px;background:var(--wbset-bg);color:var(--wbset-text);font:13px/1.3 inherit;outline:none}.wbset-input:focus,.wbset-row textarea:focus{border-color:#8b8b94;box-shadow:0 0 0 3px rgba(127,127,138,.12)}
    .wbset-note{font-size:12px;line-height:1.5;color:var(--wbset-muted)}
    .wbset-ftr{min-height:64px;padding:0 20px;border-top:1px solid var(--wbset-border);display:flex;gap:9px;align-items:center;justify-content:flex-end}
    .wbset-btn2{border:1px solid transparent;border-radius:8px;padding:8px 12px;background:var(--wbset-hover);color:var(--wbset-text);font:500 13px/1.2 inherit;cursor:pointer}
    .wbset-btn2:hover{filter:brightness(.97)}.wbset-btn2.primary{background:var(--wbset-accent);color:#fff}.wbset-btn2.ghost{border-color:var(--wbset-border);background:transparent}.wbset-btn2.danger{background:#c9362b;color:#fff}.wbset-icon-btn{width:34px;height:34px;padding:0;font-size:18px}
    .wbset-stats{display:flex;gap:10px;padding:0 0 16px}.wbset-stat{flex:1;padding:13px 15px;border:1px solid var(--wbset-border);border-radius:10px}.wbset-stat span{display:block;font-size:12px;color:var(--wbset-muted)}.wbset-stat strong{display:block;margin-top:4px;font-size:20px}
    .wbset-manager-tools{display:grid;grid-template-columns:minmax(160px,1fr) auto;gap:10px;margin-bottom:12px}.wbset-manager-tools .wbset-input{width:100%}
    .wbset-uid-list{border:1px solid var(--wbset-border);border-radius:10px;overflow:hidden}.wbset-uid-item{display:grid;grid-template-columns:minmax(140px,1fr) auto auto;gap:10px;align-items:center;min-height:43px;padding:0 10px 0 13px;border-bottom:1px solid var(--wbset-border);font-size:12px}.wbset-uid-item:last-child{border-bottom:0}.wbset-uid-item code{font-size:12px;color:var(--wbset-text)}.wbset-uid-link{color:var(--wbset-muted);text-decoration:none}.wbset-uid-link:hover{color:var(--wbset-text);text-decoration:underline}.wbset-uid-remove{padding:6px 9px;color:#b12e25}
    .wbset-pagination{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;padding-top:13px}.wbset-pagination > span{min-width:110px;text-align:center;font-size:12px;color:var(--wbset-muted)}.wbset-page-jump{display:flex}.wbset-page-jump .wbset-input{width:74px;border-radius:8px 0 0 8px}.wbset-page-jump .wbset-btn2{border-radius:0 8px 8px 0;white-space:nowrap}.wbset-btn2:disabled{opacity:.42;cursor:not-allowed;filter:none}
    .wbset-empty{padding:34px 18px;text-align:center;color:var(--wbset-muted);font-size:13px}
    .danger-zone{border-color:rgba(201,54,43,.45);background:rgba(201,54,43,.035)}
    @media (prefers-color-scheme:dark){.wbset-btn{border-color:rgba(255,255,255,.12);background:rgba(35,35,35,.94);color:#f1f1f1}.wbset-btn:hover{background:#303030}.wbset-panel{--wbset-bg:#202020;--wbset-sidebar:#181818;--wbset-text:#f1f1f1;--wbset-muted:#aaaab2;--wbset-border:#36363a;--wbset-hover:#303034;--wbset-accent:#f1f1f1}.wbset-btn2.primary{color:#171717}.wbset-setting input:checked + .wbset-switch{background:#ededed}.wbset-switch::after{background:#fff}}
    @media (max-width:720px){.wbset-panel{padding:10px}.wbset-card{width:100%;height:94vh}.wbset-shell{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.wbset-nav{display:flex;gap:4px;padding:8px;overflow:auto;border-right:0;border-bottom:1px solid var(--wbset-border)}.wbset-nav button{width:auto;white-space:nowrap}.wbset-content{padding:20px 16px 28px}.wbset-manager-tools{grid-template-columns:1fr}.wbset-uid-item{grid-template-columns:1fr auto}.wbset-uid-link{display:none}.wbset-stats{flex-direction:column}}
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
        <div class="wbset-card" role="dialog" aria-modal="true" aria-labelledby="wbset-dialog-title">
          <div class="wbset-hdr">
            <div class="wbset-title">
              <strong id="wbset-dialog-title">微博增强设置</strong>
              <span class="wbset-version">v2.0.0</span>
            </div>
            <button class="wbset-btn2 ghost wbset-icon-btn" id="wbset-close" aria-label="关闭设置">×</button>
          </div>
          <div class="wbset-shell">
            <nav class="wbset-nav" role="tablist" aria-label="设置分类">
              <button type="button" role="tab" aria-selected="true" class="is-active" data-wbset-page="general">常规</button>
              <button type="button" role="tab" aria-selected="false" data-wbset-page="appearance">外观</button>
              <button type="button" role="tab" aria-selected="false" data-wbset-page="blacklist">黑名单</button>
              <button type="button" role="tab" aria-selected="false" data-wbset-page="uids">UID 管理</button>
              <button type="button" role="tab" aria-selected="false" data-wbset-page="data">数据与同步</button>
            </nav>
            <div class="wbset-content">
              <section class="wbset-page is-active" role="tabpanel" data-wbset-section="general">
                <div class="wbset-page-head">
                  <h3>常规</h3>
                  <p>控制时间线、搜索结果和广告过滤的默认行为。</p>
                </div>
                <div class="wbset-sec">
                  <div class="wbset-sec-title">浏览体验</div>
                  <label class="wbset-setting">
                    <span class="wbset-setting-copy"><strong>主页默认显示「最新微博」</strong><span>打开首页时自动切换到按时间顺序排列的时间线。</span></span>
                    <input type="checkbox" id="wbset-latest"><span class="wbset-switch" aria-hidden="true"></span>
                  </label>
                  <label class="wbset-setting">
                    <span class="wbset-setting-copy"><strong>隐藏搜索页「相关用户」</strong><span>隐藏综合搜索页右侧的整个相关用户卡片。</span></span>
                    <input type="checkbox" id="wbset-search-related-users"><span class="wbset-switch" aria-hidden="true"></span>
                  </label>
                  <label class="wbset-setting">
                    <span class="wbset-setting-copy"><strong>隐藏广告和推广微博</strong><span>识别接口广告标记及页面中的广告、推广和赞助标识。</span></span>
                    <input type="checkbox" id="wbset-hide-ads"><span class="wbset-switch" aria-hidden="true"></span>
                  </label>
                </div>
              </section>

              <section class="wbset-page" role="tabpanel" data-wbset-section="appearance">
                <div class="wbset-page-head">
                  <h3>外观</h3>
                  <p>决定脚本入口以及微博页面各区域是否显示。</p>
                </div>
                <div class="wbset-sec">
                  <div class="wbset-sec-title">脚本入口</div>
                  <label class="wbset-setting">
                    <span class="wbset-setting-copy"><strong>显示右下角设置按钮</strong><span>关闭后仍可从 Tampermonkey 菜单中的「打开脚本设置」进入。</span></span>
                    <input type="checkbox" id="wbset-show-settings-button"><span class="wbset-switch" aria-hidden="true"></span>
                  </label>
                </div>
                <div class="wbset-sec">
                  <div class="wbset-sec-title">顶部导航</div>
                  <label class="wbset-setting">
                    <span class="wbset-setting-copy"><strong>隐藏「视频」图标</strong><span>控制顶部导航栏的视频入口。</span></span>
                    <input type="checkbox" id="wbset-nav-video"><span class="wbset-switch" aria-hidden="true"></span>
                  </label>
                  <label class="wbset-setting">
                    <span class="wbset-setting-copy"><strong>隐藏「推荐」图标</strong><span>控制顶部导航栏的推荐入口。</span></span>
                    <input type="checkbox" id="wbset-nav-recommend"><span class="wbset-switch" aria-hidden="true"></span>
                  </label>
                  <label class="wbset-setting">
                    <span class="wbset-setting-copy"><strong>隐藏「游戏」图标</strong><span>控制顶部导航栏的游戏入口。</span></span>
                    <input type="checkbox" id="wbset-nav-game"><span class="wbset-switch" aria-hidden="true"></span>
                  </label>
                </div>
                <div class="wbset-sec">
                  <div class="wbset-sec-title">侧栏版块</div>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>隐藏微博热搜</strong><span>移除侧栏热搜榜。</span></span><input type="checkbox" id="wbset-hot"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>隐藏你可能感兴趣的人</strong><span>移除侧栏用户推荐。</span></span><input type="checkbox" id="wbset-sug"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>隐藏关注推荐</strong><span>移除关注推荐版块。</span></span><input type="checkbox" id="wbset-follow-rec"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>隐藏常用功能</strong><span>移除常用功能版块。</span></span><input type="checkbox" id="wbset-common-functions"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>隐藏粉丝群</strong><span>移除粉丝群版块。</span></span><input type="checkbox" id="wbset-fan-groups"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>隐藏经常访问的超话</strong><span>移除经常访问的超话版块。</span></span><input type="checkbox" id="wbset-frequent-supertopics"><span class="wbset-switch" aria-hidden="true"></span></label>
                </div>
              </section>

              <section class="wbset-page" role="tabpanel" data-wbset-section="blacklist">
                <div class="wbset-page-head">
                  <h3>黑名单</h3>
                  <p>选择黑名单中的用户需要在哪些页面和内容类型中隐藏。</p>
                </div>
                <div class="wbset-sec">
                  <div class="wbset-sec-title">屏蔽范围</div>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>微博和转发</strong><span>隐藏黑名单用户发布或转发的微博。</span></span><input type="checkbox" id="wbset-bl-posts"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>评论和回复</strong><span>隐藏黑名单用户的评论和楼中楼回复。</span></span><input type="checkbox" id="wbset-bl-comments"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>搜索结果</strong><span>隐藏黑名单用户作为主作者的搜索结果。</span></span><input type="checkbox" id="wbset-bl-search"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>用户卡片和推荐项</strong><span>隐藏相关用户和推荐用户卡片。</span></span><input type="checkbox" id="wbset-bl-user-cards"><span class="wbset-switch" aria-hidden="true"></span></label>
                  <label class="wbset-setting"><span class="wbset-setting-copy"><strong>转发和点赞用户列表</strong><span>隐藏互动列表里的黑名单用户；关注和粉丝页始终保留。</span></span><input type="checkbox" id="wbset-bl-interactions"><span class="wbset-switch" aria-hidden="true"></span></label>
                </div>
              </section>

              <section class="wbset-page" role="tabpanel" data-wbset-section="uids">
                <div class="wbset-page-head">
                  <h3>UID 管理</h3>
                  <p>浏览和搜索所有已保存 UID，并直接添加或删除本地黑名单条目。</p>
                </div>
                <div class="wbset-stats">
                  <div class="wbset-stat"><span>已保存 UID</span><strong id="wbset-count">0</strong></div>
                  <div class="wbset-stat"><span>当前匹配</span><strong id="wbset-uid-match-count">0</strong></div>
                </div>
                <div class="wbset-sec">
                  <div class="wbset-sec-title">新增 UID</div>
                  <div class="wbset-row"><textarea id="wbset-uids" rows="3" placeholder="输入一个或多个 UID，支持逗号、空格或换行分隔"></textarea></div>
                  <div class="wbset-row">
                    <button class="wbset-btn2" id="wbset-bl-add">加入黑名单</button>
                    <button class="wbset-btn2 ghost" id="wbset-reload">重载页面</button>
                  </div>
                </div>
                <div class="wbset-manager-tools">
                  <input class="wbset-input" type="search" id="wbset-uid-search" inputmode="numeric" placeholder="搜索 UID">
                  <button class="wbset-btn2 ghost" id="wbset-refresh">刷新列表</button>
                </div>
                <div class="wbset-uid-list" id="wbset-uid-list" aria-live="polite"></div>
                <div class="wbset-pagination">
                  <button class="wbset-btn2 ghost" id="wbset-uid-prev">上一页</button>
                  <span id="wbset-uid-page">第 1 / 1 页</span>
                  <div class="wbset-page-jump">
                    <input class="wbset-input" type="number" id="wbset-page-jump-input" min="1" step="1" inputmode="numeric" aria-label="输入页数" placeholder="页数">
                    <button class="wbset-btn2" id="wbset-page-jump">跳转</button>
                  </div>
                  <button class="wbset-btn2 ghost" id="wbset-uid-next">下一页</button>
                </div>
                <p class="wbset-note">每页显示 ${UID_MANAGER_PAGE_SIZE} 条，按最近写入顺序排列。可输入页数快速跳转；删除后会立即更新本地黑名单和当前页面过滤结果。</p>
              </section>

              <section class="wbset-page" role="tabpanel" data-wbset-section="data">
                <div class="wbset-page-head">
                  <h3>数据与同步</h3>
                  <p>同步新浪微博官方黑名单，或备份和恢复本地数据。</p>
                </div>
                <div class="wbset-sec">
                  <div class="wbset-sec-title">黑名单同步</div>
                  <div class="wbset-row">
                    <button class="wbset-btn2" id="wbset-sync-delta">增量同步</button>
                    <button class="wbset-btn2 ghost" id="wbset-sync-five">同步前 5 页</button>
                    <button class="wbset-btn2 ghost" id="wbset-sync-full">完整同步</button>
                  </div>
                  <div class="wbset-row wbset-note">增量同步只读取第 1 页；完整同步会遍历全部分页。</div>
                </div>
                <div class="wbset-sec">
                  <div class="wbset-sec-title">备份与恢复</div>
                  <div class="wbset-row">
                    <button class="wbset-btn2" id="wbset-export">导出黑名单</button>
                    <button class="wbset-btn2" id="wbset-import-merge">导入并合并</button>
                    <button class="wbset-btn2 ghost" id="wbset-import-replace">导入并替换</button>
                  </div>
                  <div class="wbset-row wbset-note">导出格式为 JSON；替换操作会删除文件中不存在的现有 UID。</div>
                </div>
                <div class="wbset-sec danger-zone">
                  <div class="wbset-sec-title">危险操作</div>
                  <div class="wbset-row">
                    <button class="wbset-btn2 danger" id="wbset-clear-all">清空本地黑名单</button>
                    <span class="wbset-note">此操作不可恢复，请先导出备份。</span>
                  </div>
                </div>
              </section>
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
      const $frequentSuperTopics = panel.querySelector(
        '#wbset-frequent-supertopics'
      );
      const $latest = panel.querySelector('#wbset-latest');
      const $navVideo = panel.querySelector('#wbset-nav-video');
      const $navRecommend = panel.querySelector('#wbset-nav-recommend');
      const $navGame = panel.querySelector('#wbset-nav-game');
      const $searchRelatedUsers = panel.querySelector(
        '#wbset-search-related-users'
      );
      const $blacklistPosts = panel.querySelector('#wbset-bl-posts');
      const $blacklistComments = panel.querySelector('#wbset-bl-comments');
      const $blacklistSearch = panel.querySelector('#wbset-bl-search');
      const $blacklistUserCards = panel.querySelector(
        '#wbset-bl-user-cards'
      );
      const $blacklistInteractions = panel.querySelector(
        '#wbset-bl-interactions'
      );
      const $hideAds = panel.querySelector('#wbset-hide-ads');
      const $showSettingsButton = panel.querySelector(
        '#wbset-show-settings-button'
      );
      const $uids = panel.querySelector('#wbset-uids');
      const $count = panel.querySelector('#wbset-count');
      const $uidMatchCount = panel.querySelector('#wbset-uid-match-count');
      const $uidSearch = panel.querySelector('#wbset-uid-search');
      const $uidList = panel.querySelector('#wbset-uid-list');
      const $uidPage = panel.querySelector('#wbset-uid-page');
      const $pageJumpInput = panel.querySelector(
        '#wbset-page-jump-input'
      );
      const $pageJump = panel.querySelector('#wbset-page-jump');
      const $uidPrev = panel.querySelector('#wbset-uid-prev');
      const $uidNext = panel.querySelector('#wbset-uid-next');
      let uidManagerPage = 1;
      let uidManagerTotalPages = 1;

      function refreshCfgUI() {
        $hot.checked = !!CFG.hideHotSearch;
        $sug.checked = !!CFG.hideSuggestedPeople;
        $followRec.checked = CFG.hideFollowRecommendations !== false;
        $commonFunctions.checked = CFG.hideCommonFunctions !== false;
        $fanGroups.checked = CFG.hideFanGroups !== false;
        $frequentSuperTopics.checked =
          CFG.hideFrequentSuperTopics !== false;
        $latest.checked = CFG.defaultLatestTimeline !== false; // 默认true
        $navVideo.checked = !!CFG.hideNavVideo;
        $navRecommend.checked = !!CFG.hideNavRecommend;
        $navGame.checked = CFG.hideNavGame !== false;
        $searchRelatedUsers.checked = CFG.hideSearchRelatedUsers !== false;
        $blacklistPosts.checked = CFG.hideBlacklistPosts !== false;
        $blacklistComments.checked = CFG.hideBlacklistComments !== false;
        $blacklistSearch.checked =
          CFG.hideBlacklistSearchResults !== false;
        $blacklistUserCards.checked =
          CFG.hideBlacklistUserCards !== false;
        $blacklistInteractions.checked =
          CFG.hideBlacklistInteractions !== false;
        $hideAds.checked = CFG.hideAds !== false;
        $showSettingsButton.checked = CFG.showSettingsButton !== false;
      }
      function refreshUIDManager(options = {}) {
        if (options.resetPage) uidManagerPage = 1;
        const allUIDs = Array.from(readBLSet()).reverse();
        const query = String($uidSearch.value || '').trim();
        const matchingUIDs = query
          ? allUIDs.filter((uid) => uid.includes(query))
          : allUIDs;
        const totalPages = Math.max(
          1,
          Math.ceil(matchingUIDs.length / UID_MANAGER_PAGE_SIZE)
        );
        uidManagerTotalPages = totalPages;
        uidManagerPage = Math.min(Math.max(1, uidManagerPage), totalPages);

        const pageStart = (uidManagerPage - 1) * UID_MANAGER_PAGE_SIZE;
        const pageUIDs = matchingUIDs.slice(
          pageStart,
          pageStart + UID_MANAGER_PAGE_SIZE
        );

        $count.textContent = String(allUIDs.length);
        $uidMatchCount.textContent = String(matchingUIDs.length);
        $uidPage.textContent = `第 ${uidManagerPage} / ${totalPages} 页`;
        $pageJumpInput.max = String(totalPages);
        $uidPrev.disabled = uidManagerPage <= 1;
        $uidNext.disabled = uidManagerPage >= totalPages;
        $uidList.replaceChildren();

        if (!pageUIDs.length) {
          const empty = document.createElement('div');
          empty.className = 'wbset-empty';
          empty.textContent = query
            ? `没有找到包含“${query}”的 UID`
            : '本地黑名单中暂无 UID';
          $uidList.appendChild(empty);
          return;
        }

        const fragment = document.createDocumentFragment();
        pageUIDs.forEach((uid) => {
          const item = document.createElement('div');
          item.className = 'wbset-uid-item';

          const code = document.createElement('code');
          code.textContent = uid;
          const profile = document.createElement('a');
          profile.className = 'wbset-uid-link';
          profile.href = `https://weibo.com/u/${uid}`;
          profile.target = '_blank';
          profile.rel = 'noopener';
          profile.textContent = '查看主页';
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'wbset-btn2 ghost wbset-uid-remove';
          remove.setAttribute('data-wbset-remove-uid', uid);
          remove.textContent = '删除';

          item.append(code, profile, remove);
          fragment.appendChild(item);
        });
        $uidList.appendChild(fragment);
      }
      function jumpToPage() {
        const page = Number($pageJumpInput.value);
        if (
          !Number.isInteger(page) ||
          page < 1 ||
          page > uidManagerTotalPages
        ) {
          alert(`请输入 1 到 ${uidManagerTotalPages} 之间的页数`);
          return;
        }
        uidManagerPage = page;
        refreshUIDManager();
      }
      function closePanel({ reset = true } = {}) {
        if (reset) CFG = loadCfg();
        panel.style.display = 'none';
      }
      function setActivePage(pageName) {
        panel.querySelectorAll('[data-wbset-page]').forEach((button) => {
          const active = button.getAttribute('data-wbset-page') === pageName;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-selected', String(active));
        });
        panel.querySelectorAll('[data-wbset-section]').forEach((section) => {
          section.classList.toggle(
            'is-active',
            section.getAttribute('data-wbset-section') === pageName
          );
        });
        if (pageName === 'uids') refreshUIDManager();
      }

      refreshCfgUI();
      refreshUIDManager();

      const nav = panel.querySelector('.wbset-nav');
      nav.addEventListener('click', (e) => {
        const button = e.target.closest('[data-wbset-page]');
        if (!button) return;
        setActivePage(button.getAttribute('data-wbset-page'));
      });
      nav.addEventListener('keydown', (e) => {
        if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
          return;
        }
        const buttons = Array.from(nav.querySelectorAll('[data-wbset-page]'));
        const currentIndex = buttons.indexOf(document.activeElement);
        if (currentIndex < 0) return;
        e.preventDefault();
        const direction =
          e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        const next =
          buttons[(currentIndex + direction + buttons.length) % buttons.length];
        next.focus();
        next.click();
      });

      panel
        .querySelector('#wbset-refresh')
        .addEventListener('click', () => refreshUIDManager());
      panel
        .querySelector('#wbset-reload')
        .addEventListener('click', () => location.reload());
      $uidSearch.addEventListener('input', () => {
        refreshUIDManager({ resetPage: true });
      });
      $pageJump.addEventListener('click', jumpToPage);
      $pageJumpInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        jumpToPage();
      });
      $uidPrev.addEventListener('click', () => {
        if (uidManagerPage <= 1) return;
        uidManagerPage--;
        refreshUIDManager();
      });
      $uidNext.addEventListener('click', () => {
        uidManagerPage++;
        refreshUIDManager();
      });
      $uidList.addEventListener('click', (e) => {
        const button = e.target.closest('[data-wbset-remove-uid]');
        if (!button) return;
        const uid = button.getAttribute('data-wbset-remove-uid');
        if (!/^\d{5,}$/.test(uid || '')) return;
        if (!confirm(`确定从本地黑名单删除 UID ${uid} 吗？`)) return;
        removeFromBL([uid]);
        syncRuntimeBL({ restoreHidden: true });
        refreshUIDManager();
      });
      panel.querySelector('#wbset-export').addEventListener('click', () => {
        const count = exportBlacklist();
        alert(`✅ 已导出 ${count} 个 UID 到 JSON 文件`);
      });

      // 导入（合并）按钮事件
      const fileInputMerge = createFileInput(async (file) => {
        try {
          const result = await importBlacklist(file, 'merge');
          syncRuntimeBL({ restoreHidden: false });
          refreshUIDManager();
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
          refreshUIDManager({ resetPage: true });
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
          refreshUIDManager();
        } catch (err) {
          alert(`❌ 同步失败：${err.message}`);
        }
      });

      panel.querySelector('#wbset-sync-five').addEventListener('click', async () => {
        try {
          const result = await window.WB_BL_SYNC.syncPages(5);
          alert(`✅ 同步前5页完成！新增 ${result.added} 个 UID`);
          refreshUIDManager();
        } catch (err) {
          alert(`❌ 同步失败：${err.message}`);
        }
      });

      panel.querySelector('#wbset-sync-full').addEventListener('click', async () => {
        try {
          const oldSize = window.WB_BL_SYNC.getCount();
          const newSize = await window.WB_BL_SYNC.fullSync();
          alert(`✅ 完整同步完成！新增 ${newSize - oldSize} 个 UID（共 ${newSize}）`);
          refreshUIDManager();
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
        refreshUIDManager({ resetPage: true });
        alert('✅ 已清空黑名单');
      });

      panel.querySelector('#wbset-bl-add').addEventListener('click', () => {
        const ids = parseUIDInput($uids.value);
        if (!ids.length) return alert('请输入有效的 UID');
        const result = addToBL(ids);
        syncRuntimeBL({ restoreHidden: false });
        $uids.value = '';
        refreshUIDManager({ resetPage: true });
        alert(
          `已处理 ${ids.length} 个 UID，新增 ${result.added} 个，当前缓存总数：${result.size}`
        );
      });

      panel.querySelector('#wbset-save').addEventListener('click', () => {
        const previousLatestTimeline = CFG.defaultLatestTimeline !== false;
        const nextLatestTimeline = $latest.checked;
        CFG.hideHotSearch = $hot.checked;
        CFG.hideSuggestedPeople = $sug.checked;
        CFG.hideFollowRecommendations = $followRec.checked;
        CFG.hideCommonFunctions = $commonFunctions.checked;
        CFG.hideFanGroups = $fanGroups.checked;
        CFG.hideFrequentSuperTopics = $frequentSuperTopics.checked;
        CFG.defaultLatestTimeline = nextLatestTimeline;
        CFG.hideNavVideo = $navVideo.checked;
        CFG.hideNavRecommend = $navRecommend.checked;
        CFG.hideNavGame = $navGame.checked;
        CFG.hideSearchRelatedUsers = $searchRelatedUsers.checked;
        CFG.hideBlacklistPosts = $blacklistPosts.checked;
        CFG.hideBlacklistComments = $blacklistComments.checked;
        CFG.hideBlacklistSearchResults = $blacklistSearch.checked;
        CFG.hideBlacklistUserCards = $blacklistUserCards.checked;
        CFG.hideBlacklistInteractions = $blacklistInteractions.checked;
        CFG.hideAds = $hideAds.checked;
        CFG.showSettingsButton = $showSettingsButton.checked;
        delete CFG.hideNavVideoRecommend;
        saveCfg(CFG);
        // 同步更新 defaultLatest 到油猴菜单使用的存储
        GM_setValue('defaultLatest', nextLatestTimeline);
        const isMainWeiboHost = ['weibo.com', 'www.weibo.com'].includes(
          location.hostname
        );
        const isHomeTimelineRoute =
          location.pathname === '/' ||
          location.pathname === '' ||
          /^\/mygroups(?:\/|$)/.test(location.pathname);
        // 从"最新微博"页关闭开关时，不能原地刷新 /mygroups；
        // 回到首页后，关闭状态会保留原生首页，开启状态则重新切到最新微博。
        if (
          previousLatestTimeline !== nextLatestTimeline &&
          isMainWeiboHost &&
          isHomeTimelineRoute
        ) {
          location.assign(`${location.origin}/`);
          return;
        }
        // 刷新页面以确保布局正确更新
        location.reload();
      });
      panel.querySelector('#wbset-cancel').addEventListener('click', () => {
        closePanel();
      });
      panel.querySelector('#wbset-close').addEventListener('click', () => {
        closePanel();
      });
      panel.addEventListener('click', (e) => {
        if (e.target === panel) {
          closePanel();
        }
      });
      panel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
      });
      panel.addEventListener('wbset:open', () => {
        CFG = loadCfg();
        refreshCfgUI();
        refreshUIDManager();
      });
    }
    panel.style.display = 'flex';
    panel.dispatchEvent(new CustomEvent('wbset:open'));
  }

  function initLauncher() {
    ensureStyles();
    const existingButton = document.querySelector('.wbset-btn');
    if (CFG.showSettingsButton === false) {
      existingButton?.remove();
    } else if (!existingButton) {
      const btn = document.createElement('button');
      btn.className = 'wbset-btn';
      btn.type = 'button';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `;
      btn.title = '微博增强设置';
      btn.setAttribute('aria-label', '打开微博增强设置');
      btn.addEventListener('click', openPanel);
      document.documentElement.appendChild(btn);
    }
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('打开脚本设置', openPanel);
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initLauncher);
  else initLauncher();
})();
/* === /Settings v5 === */
