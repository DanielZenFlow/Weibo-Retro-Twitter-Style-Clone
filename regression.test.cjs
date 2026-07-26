const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(
  __dirname,
  'pynseq-for-weibo.user.js'
);
const source = fs.readFileSync(scriptPath, 'utf8');
const readmeSource = fs.readFileSync(path.join(__dirname, 'readme.md'), 'utf8');
const iconPath = path.join(__dirname, 'pynseq-for-weibo-icon.png');
const iconSource = fs.readFileSync(iconPath);
const immutableIconURL =
  'https://raw.githubusercontent.com/DanielZenFlow/Pynseq-Weibo/c5e75843ef29f16fdbd1a1a22f11dc9206be184f/pynseq-for-weibo-icon.png';
const greasyForkURL =
  'https://greasyfork.org/en/scripts/564839-pynseq-for-weibo-%E5%B1%8F%E5%BA%8F-%E5%BE%AE%E5%8D%9A-%E6%9C%AC%E5%9C%B0%E5%B1%8F%E8%94%BD%E5%90%8D%E5%8D%95%E4%B8%8E%E6%97%B6%E9%97%B4%E7%BA%BF%E6%8E%A7%E5%88%B6-%E5%B1%8F%E8%94%BD%E7%83%AD%E6%90%9C';

function sourceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

assert.doesNotMatch(source, /window\.(?:WB_RETRO_CONFIRM|WB_BL_SYNC)/);
assert.doesNotMatch(source, /function\s+(?:filterData|filterAdsFromData)\s*\(/);
assert.match(source, /^\/\/ @description:en\s+\S.+$/m);
assert.match(source, /function\s+filterContentTree\s*\(/);
assert.match(source, /function\s+runControlledSync\s*\(/);
assert.match(source, /controller\.abort\(\)/);
assert.match(source, /USER_SCRIPT_UI_SELECTOR/);
assert.doesNotMatch(source, /\balert\s*\(/);
assert.match(source, /function\s+showNotification\s*\(/);
assert.match(source, /WB_INTERNAL\.notify\s*=\s*showNotification/);
assert.match(source, /const GITHUB_URL = 'https:\/\/github\.com\/DanielZenFlow\/Pynseq-Weibo'/);
assert.equal(source.includes(`// @icon         ${immutableIconURL}`), true);
assert.equal(source.includes(`// @icon64       ${immutableIconURL}`), true);
assert.equal(
  fs.existsSync(path.join(__dirname, 'weibo-retro-twitter-style-clone.user.js')),
  false
);
assert.deepEqual(
  Array.from(iconSource.subarray(0, 8)),
  [137, 80, 78, 71, 13, 10, 26, 10]
);
assert.equal(iconSource.readUInt32BE(16), iconSource.readUInt32BE(20));
assert.equal(iconSource[25], 2, 'userscript icon must be opaque truecolor PNG');
assert.match(readmeSource, /https:\/\/github\.com\/DanielZenFlow\/Pynseq-Weibo/);
assert.match(readmeSource, /^# Pynseq for Weibo｜屏序·微博$/m);
assert.match(readmeSource, /^> 屏其不欲见者，复其应有之序。$/m);
assert.equal(readmeSource.includes(greasyForkURL), true);
assert.match(readmeSource, /https:\/\/buymeacoffee\.com\/danielzenflow/);
assert.equal(
  (
    readmeSource.match(
      /https:\/\/buymeacoffee\.com\/danielzenflow/g
    ) || []
  ).length,
  2
);
assert.equal(
  readmeSource.includes(
    `项目地址：[Greasy Fork 项目页](${greasyForkURL})`
  ),
  true
);
assert.equal(
  readmeSource.includes(
    `Project page: [Pynseq for Weibo on Greasy Fork](${greasyForkURL})`
  ),
  true
);
assert.doesNotMatch(readmeSource, /(?:项目地址|Project page):\s*<https:/);
assert.match(source, /#wb-retro-toast\s*\{[\s\S]*?z-index:\s*2147483647/);
assert.match(source, /width:\s*min\(215px,\s*calc\(100vw - 32px\)\)/);
assert.match(source, /#wb-retro-toast\.is-visible\s*\{\s*opacity:\s*1/);
assert.match(source, /USER_SCRIPT_UI_SELECTOR[\s\S]*?'#wb-retro-toast'/);
assert.doesNotMatch(source, /wb-retro-notice-stack|wb-retro-notice-close/);
assert.match(
  source,
  /showUserContextToastImpl = \(message\) =>\s*showNotification\(message, \{ type: 'success' \}\)/
);
const confirmStyleSource = sourceBetween(
  '  function ensureCenteredConfirmStyles() {',
  '  function createCenteredConfirm('
);
assert.match(confirmStyleSource, /width:\s*min\(430px,\s*calc\(100vw - 32px\)\)/);
assert.match(confirmStyleSource, /padding:\s*24px/);
assert.match(confirmStyleSource, /border:\s*1px solid #cfc5bb/);
assert.match(confirmStyleSource, /border-radius:\s*0/);
assert.match(confirmStyleSource, /background:\s*#f7f3ee/);
assert.match(confirmStyleSource, /z-index:\s*2147483647/);
assert.match(source, /WB_INTERNAL\.applyConfig\s*=\s*applyRuntimeConfig/);
assert.match(source, /wb-retro-runtime-style/);
assert.match(source, /const WB_CONFIG_SCHEMA_VERSION = 1/);
assert.match(source, /@grant\s+GM_removeValueChangeListener/);
assert.doesNotMatch(source, /WB_INTERNAL\.getDiagnostics\s*=/);
assert.doesNotMatch(source, /diagnostic|高级诊断|运行诊断/i);
assert.match(source, /const THROTTLE_MS = 350/);
assert.ok(
  source.indexOf('const THROTTLE_MS = 350') <
    source.indexOf("const WB_CONFIG_KEY = 'cfg'"),
  'official blacklist request pacing must remain visible to the settings scope'
);
assert.equal((source.match(/await sleep\(THROTTLE_MS, signal\)/g) || []).length, 2);
assert.match(
  source,
  /data-wbset-page="blacklist">屏蔽设置<\/button>/
);
assert.match(
  source,
  /data-wbset-page="uids">本地屏蔽名单<\/button>/
);
assert.match(
  source,
  /data-wbset-page="data">新浪微博黑名单管理<\/button>/
);
assert.match(
  source,
  /data-wbset-page="about">关于<\/button>/
);
const settingsSource = sourceBetween(
  '/* === Settings v5:',
  '/* === /Settings v5 === */'
);
const panelMarkupSource = sourceBetween(
  '      panel.innerHTML = `',
  '      document.body.appendChild(panel);'
);
const settingsHTMLIds = new Set(
  [
    ...Array.from(
      settingsSource.matchAll(/\bid="([^"]+)"/g),
      (match) => match[1]
    ),
    ...Array.from(
      settingsSource.matchAll(/\.id\s*=\s*['"]([^'"]+)['"]/g),
      (match) => match[1]
    ),
  ]
);
assert.equal(
  new Set(
    Array.from(panelMarkupSource.matchAll(/\bid="([^"]+)"/g), (match) => match[1])
  ).size,
  Array.from(panelMarkupSource.matchAll(/\bid="([^"]+)"/g)).length,
  'settings panel markup must not contain duplicate IDs'
);
const settingsNavPages = Array.from(
  settingsSource.matchAll(/data-wbset-page="([^"]+)"/g),
  (match) => match[1]
).sort();
const settingsSections = Array.from(
  settingsSource.matchAll(/data-wbset-section="([^"]+)"/g),
  (match) => match[1]
).sort();
assert.deepEqual(
  settingsNavPages,
  settingsSections,
  'every settings navigation page must have exactly one matching section'
);
const settingsQueriedIds = Array.from(
  settingsSource.matchAll(/querySelector\(\s*['"]#([^'"]+)['"]\s*\)/g),
  (match) => match[1]
);
assert.deepEqual(
  Array.from(
    new Set(settingsQueriedIds.filter((id) => !settingsHTMLIds.has(id)))
  ),
  [],
  'every settings querySelector ID must exist in the settings markup'
);
const dataSettingsSection = sourceBetween(
  'data-wbset-section="data"',
  'data-wbset-section="about"'
);
assert.doesNotMatch(dataSettingsSection, /diagnostic|诊断/i);
const generalSettingsSection = sourceBetween(
  'data-wbset-section="general"',
  'data-wbset-section="blacklist"'
);
assert.equal(
  generalSettingsSection.match(/class="wbset-sec-title">([^<]+)</)?.[1],
  '设置向导',
  'the onboarding launcher must be the first section on the General tab'
);
assert.match(source, /@version\s+2\.1\.0/);
assert.match(source, /const SCRIPT_VERSION = '2\.1\.0'/);
assert.match(source, /const SCRIPT_NAME = 'Pynseq for Weibo｜屏序·微博'/);
assert.match(settingsSource, /<span class="wbset-version">v\$\{SCRIPT_VERSION\}<\/span>/);
assert.doesNotMatch(source, /本地黑名单/);
assert.match(source, /pynseq-for-weibo-blocklist-\$\{timestamp\}\.json/);
assert.doesNotMatch(source, /weibo-blacklist-backup-/);
assert.equal(
  (source.match(/GM_registerMenuCommand\(['"]设置['"]/g) || []).length,
  1
);
assert.equal(
  (source.match(/GM_registerMenuCommand\(['"]关于['"]/g) || []).length,
  1
);
assert.match(source, /function\s+openOnboarding\s*\(/);
assert.match(source, /\$\{stepIndex \+ 1\} \/ 5/);
assert.match(source, /class="wbset-onboard-skip" type="button">使用默认设置<\/button>/);
assert.doesNotMatch(source, /跳过并使用默认设置/);
assert.match(
  source,
  /font-size:11\.5px!important;\s*font-weight:800!important;line-height:1\.3!important/
);
assert.match(source, /Buy me a coffee/);
const onboardingSource = sourceBetween(
  '  function openOnboarding(',
  '  function openPanel('
);
const onboardingSettingKeys = Array.from(
  new Set(
    Array.from(
      onboardingSource.matchAll(/data-wbset-setting="([^"]+)"/g),
      (match) => match[1]
    )
  )
).sort();
assert.deepEqual(onboardingSettingKeys, [
  'confirmBeforeBlocking',
  'defaultLatestTimeline',
  'hideAds',
  'hideBlacklistComments',
  'hideBlacklistInteractions',
  'hideBlacklistPosts',
  'hideBlacklistSearchResults',
  'hideBlacklistUserCards',
  'showSettingsButton',
]);
const onboardingFinishSource = sourceBetween(
  '    const finish = (nextSettings) => {',
  '    const bindDraftInputs = () => {'
);
assert.match(
  onboardingFinishSource,
  /const previousLatestTimeline = loadCfg\(\)\.defaultLatestTimeline !== false/
);
assert.match(onboardingFinishSource, /CFG = saveCfg\(normalizeCfg\(nextSettings\)\)/);
assert.match(onboardingFinishSource, /WB_INTERNAL\.applyConfig\?\.\(CFG\)/);
assert.match(onboardingFinishSource, /applyPanelSettingsNow\(\)/);
assert.match(onboardingFinishSource, /syncLauncherButton\(\)/);
assert.match(onboardingFinishSource, /reconcileHomeTimelineSetting\(/);
assert.match(source, /if \(!isInsideCommentSurface\(el\)\) return null/);
const commentRootSource = sourceBetween(
  '  function findCommentRootForUID(',
  '  function findContentRootForUID('
);
assert.ok(
  commentRootSource.indexOf('if (!isInsideCommentSurface(el)) return null;') <
    commentRootSource.indexOf('let fallback = null;'),
  'non-comment author links must be rejected before generic comment fallback'
);
const immediateBlockSource = sourceBetween(
  '  function addContextUserToBL(',
  '  function getCookieValue('
);
assert.match(immediateBlockSource, /hideContentRoot\(post, ctx\.uid\)/);
assert.match(immediateBlockSource, /compactVirtualScrollerGaps\(document\)/);
assert.match(immediateBlockSource, /nudgeTimelineLayout\(\)/);
const hideShellSource = sourceBetween(
  '  function findHideShell(',
  '  function setImportantStyleIfNeeded('
);
assert.match(hideShellSource, /virtualView\.firstElementChild/);
assert.match(
  hideShellSource,
  /target\.parentElement !== virtualView/
);
assert.doesNotMatch(hideShellSource, /return virtualView;/);
const virtualGapSource = sourceBetween(
  '  function compactVirtualScrollerGaps(',
  '  function isWeiboSearchResultPage('
);
assert.match(virtualGapSource, /clearVirtualCompactionState\(cleanupRoot\)/);
assert.doesNotMatch(
  virtualGapSource,
  /applyVirtual(?:Item|Wrapper)Compaction/
);
assert.equal(
  source.includes('      [${COMPACTED_VIRTUAL_ITEM_ATTR}] {'),
  false,
  'runtime CSS must not override Vue recycler transforms'
);
assert.equal(
  source.includes('      [${COMPACTED_VIRTUAL_WRAPPER_ATTR}] {'),
  false,
  'runtime CSS must not override Vue recycler height'
);
assert.match(
  source,
  /\.vue-recycle-scroller__item-view > \$\{BLOCKED_CONTENT_HIDE_SELECTOR\}[\s\S]*?height:\s*1px !important;[\s\S]*?visibility:\s*hidden !important;/
);
assert.match(
  source,
  /\.vue-recycle-scroller\[\$\{NATIVE_PAGINATION_GUARD_ATTR\}="1"\][\s\S]*?margin-top:\s*\$\{NATIVE_PAGINATION_GUARD_PX\}px !important;/
);
assert.match(source, /const NATIVE_PAGINATION_GUARD_PX = 192;/);
assert.doesNotMatch(
  source,
  /\[class\*="vue-recycle-scroller__item-view"\]\s*\{[\s\S]*?(?:transform|min-height):/
);
assert.match(
  sourceBetween(
    '  function hideContentRoot(',
    '  let floatingVideoSuppressUntil ='
  ),
  /prepareNativeTimelinePaginationGuard\(target\)[\s\S]*?target\.setAttribute\(BLOCKED_CONTENT_HIDE_ATTR/
);
const paginationGuardSource = sourceBetween(
  '  function getNativeTimelinePaginationParts(',
  '  function compactVirtualScrollerGaps('
);
assert.match(
  paginationGuardSource,
  /scroller\.setAttribute\(NATIVE_PAGINATION_GUARD_ATTR, '1'\)/
);
assert.match(
  paginationGuardSource,
  /scroller\.removeAttribute\(NATIVE_PAGINATION_GUARD_ATTR\)/
);
assert.match(
  paginationGuardSource,
  /viewport \+ viewRect\.height \+ NATIVE_PAGINATION_GUARD_PX/
);
assert.doesNotMatch(
  paginationGuardSource,
  /(?:transform|min-height|scrollTo|scrollBy)\s*[=:]/
);
assert.match(
  virtualGapSource,
  /updateNativeTimelinePaginationGuards\(cleanupRoot\)/
);
assert.match(
  sourceBetween(
    '  function restoreHiddenRelationshipItems(',
    '  function clearOwnBlockedContentHideState('
  ),
  /removeAttribute\(NATIVE_PAGINATION_GUARD_ATTR\)/
);
class FakeHideElement {
  constructor(kind, parentElement = null) {
    this.kind = kind;
    this.parentElement = parentElement;
    this.children = [];
    if (parentElement) parentElement.children.push(this);
  }

  get firstElementChild() {
    return this.children[0] || null;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (
        (selector === 'comment-root' && current.kind === 'comment') ||
        (selector === 'virtual-view' && current.kind === 'view') ||
        (selector === 'virtual-item' &&
          (current.kind === 'shell' || current.kind === 'view'))
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
}
const hideShellContext = vm.createContext({
  DOM_COMMENT_ROOT_SELECTOR: 'comment-root',
  Element: FakeHideElement,
  VIRTUAL_ITEM_SELECTOR: 'virtual-item',
  VIRTUAL_VIEW_SELECTOR: 'virtual-view',
  document: { body: null, documentElement: null },
  isEligibleVirtualScrollerItem: () => true,
  isOverBroadHideRoot: () => false,
  shouldPromoteFeedShell: () => false,
});
vm.runInContext(
  `${hideShellSource}
  globalThis.testFindHideShell = findHideShell;`,
  hideShellContext
);
const fakeView = new FakeHideElement('view');
const fakeContentShell = new FakeHideElement('shell', fakeView);
const fakeArticle = new FakeHideElement('article', fakeContentShell);
assert.equal(
  hideShellContext.testFindHideShell(fakeArticle),
  fakeContentShell,
  'a blocked virtual-list post must hide the inner content shell'
);
assert.equal(
  hideShellContext.testFindHideShell(fakeView),
  fakeContentShell,
  'even a virtual-view root must resolve to its inner content shell'
);
const recycledShellSource = sourceBetween(
  '  function restoreRecycledVirtualContentShells(',
  '  function hideBlockedDOMPosts('
);
assert.match(recycledShellSource, /node\.matches\(VIRTUAL_VIEW_SELECTOR\)/);
assert.match(recycledShellSource, /hasUIDOutsideCommentRoots\(node, uid\)/);
assert.match(
  recycledShellSource,
  /clearOwnBlockedContentHideState\(node\)/
);
const hideBlockedPostsSource = sourceBetween(
  '  function hideBlockedDOMPosts(',
  '  function queueBlockedDOMRefresh('
);
assert.ok(
  hideBlockedPostsSource.indexOf(
    'restoreRecycledVirtualContentShells(root)'
  ) <
    hideBlockedPostsSource.indexOf(
      'root.querySelectorAll(DOM_UID_SELECTOR)'
    ),
  'recycled virtual rows must be restored before scanning their current UID'
);
const runtimeApplySource = sourceBetween(
  '  function applyRuntimeConfig(',
  '  WB_INTERNAL.applyConfig ='
);
assert.ok(
  runtimeApplySource.indexOf('restoreBlockedContentHideState(document)') <
    runtimeApplySource.indexOf('hideBlockedDOMPosts(document)'),
  'scope changes must restore previously hidden roots before reapplying enabled filters'
);
assert.match(source, /const VIRTUAL_COMPACTION_RUNTIME =/);
assert.doesNotMatch(source, /virtualScrollerCompactionState/);
assert.equal((source.match(/new MutationObserver/g) || []).length, 2);
assert.equal((source.match(/history\.pushState\s*=/g) || []).length, 1);
assert.equal((source.match(/history\.replaceState\s*=/g) || []).length, 1);
assert.doesNotMatch(source, /queuedBlockedDOMRefreshTimer/);
assert.doesNotMatch(source, /queuedPanelRefreshTimer/);
assert.match(
  source,
  /const syncTabUI = \(\) => \{\s*if \(!timelineDefault\.value\) return;/
);

let mutationObserverInstances = 0;
const domContext = vm.createContext({
  WB_INTERNAL: Object.create(null),
  MutationObserver: class {
    constructor(callback) {
      this.callback = callback;
      mutationObserverInstances++;
    }
    observe() {}
    disconnect() {}
  },
  document: { documentElement: {} },
  history: {
    pushState() {
      return 'push-result';
    },
    replaceState() {
      return 'replace-result';
    },
  },
  window: { addEventListener() {} },
  console,
  setTimeout,
  clearTimeout,
});
vm.runInContext(
  `${sourceBetween(
    '  const WB_DOM_RUNTIME = (() => {',
    '  WB_INTERNAL.dom = WB_DOM_RUNTIME;'
  )}
  globalThis.testDOMRuntime = WB_DOM_RUNTIME;`,
  domContext
);
domContext.testDOMRuntime.subscribeMutations('first', () => {});
domContext.testDOMRuntime.subscribeMutations('second', () => {});
assert.equal(mutationObserverInstances, 1);
let routeNotifications = 0;
domContext.testDOMRuntime.subscribeRoute('test', () => {
  routeNotifications++;
});
assert.equal(domContext.history.pushState(), 'push-result');
assert.equal(domContext.history.replaceState(), 'replace-result');
assert.equal(routeNotifications, 2);
const addedParent = { nodeType: 1, parentElement: null };
const addedChild = { nodeType: 1, parentElement: addedParent };
const minimalRoots = domContext.testDOMRuntime.collectAddedRoots([
  { addedNodes: [addedParent, addedChild] },
]);
assert.equal(minimalRoots.length, 1);
assert.equal(minimalRoots[0], addedParent);

const configWrites = [];
const configStorage = new Map([
  [
    'cfg',
    JSON.stringify({
      hideAds: 'invalid',
      hideNavVideoRecommend: true,
    }),
  ],
]);
const configContext = vm.createContext({
  WB_CONFIG_KEY: 'cfg',
  WB_CONFIG_BACKUP_KEY: 'cfg_recovery_backup',
  WB_CONFIG_SCHEMA_VERSION: 1,
  WB_CONFIG_DEFAULTS: {
    hideAds: true,
    hideNavVideo: false,
    hideNavRecommend: false,
  },
  WB_CONFIG_BOOLEAN_KEYS: [
    'hideAds',
    'hideNavVideo',
    'hideNavRecommend',
  ],
  WB_RUNTIME_METRICS: {
    config: {
      schemaVersion: 1,
      migrations: 0,
      recoveries: 0,
      futureSchema: null,
    },
  },
  wbConfigCacheSignature: null,
  wbConfigCacheValue: null,
  GM_getValue: (key, fallback) =>
    configStorage.has(key) ? configStorage.get(key) : fallback,
  GM_setValue: (key, value) => {
    configStorage.set(key, value);
    configWrites.push([key, value]);
  },
});
vm.runInContext(
  sourceBetween(
    '  function isUnsafeObjectKey(key) {',
    '  WB_INTERNAL.config ='
  ),
  configContext
);
vm.runInContext(
  'globalThis.migratedConfig = readStoredConfig();',
  configContext
);
const migratedConfig = JSON.parse(
  JSON.stringify(configContext.migratedConfig)
);
assert.equal(migratedConfig.schemaVersion, 1);
assert.equal(migratedConfig.hideAds, true);
assert.equal(migratedConfig.hideNavVideo, true);
assert.equal(migratedConfig.hideNavRecommend, true);
assert.equal('hideNavVideoRecommend' in migratedConfig, false);
assert.equal(configWrites.some(([key]) => key === 'cfg'), true);
const writesAfterMigration = configWrites.length;
vm.runInContext('readStoredConfig();', configContext);
assert.equal(configWrites.length, writesAfterMigration);

configStorage.set('cfg', '{broken-json');
vm.runInContext(
  'globalThis.recoveredConfig = readStoredConfig();',
  configContext
);
assert.equal(configContext.recoveredConfig.schemaVersion, 1);
assert.equal(configStorage.has('cfg_recovery_backup'), true);
assert.equal(configContext.WB_RUNTIME_METRICS.config.recoveries, 1);

configStorage.set(
  'cfg',
  JSON.stringify({ schemaVersion: 99, hideAds: false, futureOption: 'kept' })
);
const writesBeforeFutureRead = configWrites.length;
vm.runInContext(
  'globalThis.futureConfig = readStoredConfig();',
  configContext
);
assert.equal(configContext.futureConfig.schemaVersion, 99);
assert.equal(configContext.futureConfig.futureOption, 'kept');
assert.equal(configWrites.length, writesBeforeFutureRead);

configStorage.set(
  'cfg',
  '{"schemaVersion":1,"hideAds":false,"__proto__":{"polluted":true},"constructor":{"polluted":true}}'
);
vm.runInContext(
  'globalThis.safeConfig = readStoredConfig();',
  configContext
);
assert.equal(configContext.safeConfig.hideAds, false);
assert.equal(Object.getPrototypeOf(configContext.safeConfig).polluted, undefined);
assert.equal(
  Object.prototype.hasOwnProperty.call(configContext.safeConfig, '__proto__'),
  false
);
assert.equal(
  Object.prototype.hasOwnProperty.call(configContext.safeConfig, 'constructor'),
  false
);

const relaySource = sourceBetween(
  '  function requestOfficialBlockViaMainHost(uid) {',
  '  async function processOfficialBlockRelay() {'
);
assert.match(relaySource, /_GM_addValueChangeListener/);
assert.match(relaySource, /_GM_removeValueChangeListener/);
assert.match(relaySource, /setTimeout\(\(\) => \{/);
assert.doesNotMatch(relaySource, /\}, 200\)/);

const saveHandlerSource = sourceBetween(
  "      panel.querySelector('#wbset-save').addEventListener",
  "      panel.querySelector('#wbset-cancel').addEventListener"
);
assert.doesNotMatch(saveHandlerSource, /location\.reload\s*\(/);
assert.match(saveHandlerSource, /WB_INTERNAL\.applyConfig\?\.\(CFG\)/);
assert.match(saveHandlerSource, /applyPanelSettingsNow\(\)/);
assert.match(saveHandlerSource, /syncLauncherButton\(\)/);
assert.match(saveHandlerSource, /closePanel\(\{ reset: false \}\)/);
assert.match(saveHandlerSource, /reconcileHomeTimelineSetting\(/);
assert.equal((source.match(/location\.reload\s*\(/g) || []).length, 1);
const nativeHomeSource = sourceBetween(
  '  function openNativeHomeTimeline() {',
  '  function openLatestHomeTimeline() {'
);
assert.match(nativeHomeSource, /const allFollowingTab = findTimelineTab\(/);
assert.match(nativeHomeSource, /allFollowingTab\.click\(\)/);
assert.match(nativeHomeSource, /settings-native-home-fallback/);
const latestHomeSource = sourceBetween(
  '  function openLatestHomeTimeline() {',
  '  function reconcileHomeTimelineSetting('
);
assert.match(latestHomeSource, /latestTab\.click\(\)/);
assert.match(latestHomeSource, /settings-latest-home-fallback/);
const reconcileTimelineSource = sourceBetween(
  '  function reconcileHomeTimelineSetting(',
  '  function openOnboarding('
);
assert.match(reconcileTimelineSource, /openLatestHomeTimeline\(\)/);
assert.match(reconcileTimelineSource, /openNativeHomeTimeline\(\)/);
class FakeTimelineTab {
  constructor(title) {
    this.title = title;
    this.selected = false;
    this.clicks = 0;
  }
  click() {
    this.clicks++;
    this.selected = true;
  }
  getAttribute(name) {
    if (name === 'aria-selected') return this.selected ? 'true' : null;
    return null;
  }
}
const allFollowingTimelineTab = new FakeTimelineTab('全部关注');
const latestTimelineTab = new FakeTimelineTab('最新微博');
const timelineAssignments = [];
const timelineContext = vm.createContext({
  WB_INTERNAL: { dom: { schedule() {} } },
  HTMLElement: FakeTimelineTab,
  document: {
    querySelector(selector) {
      if (selector.includes('全部关注')) return allFollowingTimelineTab;
      if (selector.includes('最新微博')) return latestTimelineTab;
      return null;
    },
  },
  location: {
    hostname: 'weibo.com',
    pathname: '/',
    origin: 'https://weibo.com',
    assign(url) {
      timelineAssignments.push(url);
    },
  },
});
vm.runInContext(
  `${sourceBetween(
    '  function isWeiboHomeTimelineRoute() {',
    '  function openOnboarding('
  )}
  globalThis.reconcileTimeline = reconcileHomeTimelineSetting;`,
  timelineContext
);
assert.equal(timelineContext.reconcileTimeline(false, true), true);
assert.equal(latestTimelineTab.clicks, 1);
assert.equal(allFollowingTimelineTab.clicks, 0);
allFollowingTimelineTab.selected = false;
assert.equal(timelineContext.reconcileTimeline(true, false), true);
assert.equal(allFollowingTimelineTab.clicks, 1);
assert.equal(timelineAssignments.length, 0);
const remoteConfigSource = sourceBetween(
  "  if (typeof GM_addValueChangeListener === 'function') {",
  "  if (document.readyState === 'loading')"
);
assert.match(remoteConfigSource, /WB_INTERNAL\.applyConfig\?\.\(CFG\)/);
assert.match(remoteConfigSource, /reconcileHomeTimelineSetting\(/);

const hotBandSource = sourceBetween(
  '  function hideSearchHotBand(root = document) {',
  '  if (document.readyState ==='
);
assert.doesNotMatch(hotBandSource, /target\.remove\s*\(/);
assert.match(hotBandSource, /data-__wb_hidden_by_userscript/);

const context = vm.createContext({
  AbortController,
  BL: new Set(['12345']),
  CONTENT_FILTER_CFG: {
    hideAds: true,
    hideBlacklistPosts: true,
    hideBlacklistComments: true,
    hideBlacklistSearchResults: true,
    hideBlacklistUserCards: true,
    hideBlacklistInteractions: true,
  },
  Headers,
  Response,
  URL,
  console,
  isRelationshipListPage: () => false,
  isWeiboSearchResultPage: () => false,
  location: {
    origin: 'https://weibo.com',
  },
});

vm.runInContext(
  `${sourceBetween(
    '  function isUnsafeObjectKey(key) {',
    '  function normalizeStoredConfig(rawCfg) {'
  )}
  ${sourceBetween(
    '  const MAX_FILTER_DEPTH = 80;',
    '  const DOM_UID_SELECTOR = ['
  )}`,
  context
);
vm.runInContext(
  sourceBetween(
    '  function classifyInterceptedRequest(url) {',
    '  // 微博新版 Axios 依赖原生网络对象的身份与完整生命周期。'
  ),
  context
);
vm.runInContext(
  `globalThis.testAPI = {
    classifyInterceptedRequest,
    createCompatibleJSONResponse,
    isFilterableContentURL,
    transformContentResponseData,
  };`,
  context
);

const { testAPI } = context;
const fixture = {
  statuses: [
    { id: 'blocked-post', user: { idstr: '12345', screen_name: 'blocked' } },
    { id: 'ad-post', is_ad: true, user: { idstr: '67890' } },
    { id: 'visible-post', user: { idstr: '67890', screen_name: 'visible' } },
  ],
  comments: [
    { id: 'blocked-comment', user: { idstr: '12345', screen_name: 'blocked' } },
    { id: 'visible-comment', user: { idstr: '67890', screen_name: 'visible' } },
  ],
};
const filtered = testAPI.transformContentResponseData(
  fixture,
  'https://weibo.com/ajax/statuses/mymblog'
);
assert.equal(filtered.changed, true);
assert.deepEqual(
  Array.from(filtered.data.statuses, (item) => item.id),
  ['visible-post']
);
assert.deepEqual(
  Array.from(filtered.data.comments, (item) => item.id),
  ['visible-comment']
);

const unsafeFixture = JSON.parse(
  '{"statuses":[{"id":"visible","user":{"idstr":"67890"}}],"__proto__":{"polluted":true},"constructor":{"polluted":true}}'
);
const unsafeResult = testAPI.transformContentResponseData(
  unsafeFixture,
  'https://weibo.com/ajax/statuses/mymblog'
);
assert.equal(unsafeResult.changed, true);
assert.equal(Object.getPrototypeOf(unsafeResult.data).polluted, undefined);
assert.equal(
  Object.prototype.hasOwnProperty.call(unsafeResult.data, '__proto__'),
  false
);
assert.equal(
  Object.prototype.hasOwnProperty.call(unsafeResult.data, 'constructor'),
  false
);

const untouched = { statuses: [{ id: 'visible', user: { idstr: '67890' } }] };
const untouchedResult = testAPI.transformContentResponseData(
  untouched,
  'https://weibo.com/ajax/statuses/mymblog'
);
assert.equal(untouchedResult.changed, false);
assert.equal(untouchedResult.data, untouched);

assert.equal(
  testAPI.isFilterableContentURL('https://weibo.com/ajax/feed/hottimeline'),
  false
);
[
  'unreadfriendstimeline',
  'friendstimeline',
  'groupstimeline',
  'hottimeline',
  'allGroups',
].forEach((endpoint) => {
  assert.equal(
    testAPI.isFilterableContentURL(
      `https://weibo.com/ajax/feed/${endpoint}`
    ),
    false,
    `${endpoint} must preserve native statuses and pagination cursors`
  );
});
assert.equal(
  testAPI.isFilterableContentURL(
    'https://weibo.com/ajax/statuses/mymblog'
  ),
  true
);
const unreadTimelineRequest = testAPI.classifyInterceptedRequest(
  'https://weibo.com/ajax/feed/unreadfriendstimeline'
);
assert.equal(unreadTimelineRequest.unreadTimeline, true);
assert.equal(unreadTimelineRequest.timelinePagination, false);
assert.equal(unreadTimelineRequest.filterContent, false);
assert.equal(unreadTimelineRequest.relevant, false);
const unreadTimelinePageRequest = testAPI.classifyInterceptedRequest(
  'https://weibo.com/ajax/feed/unreadfriendstimeline?max_id=123&count=15'
);
assert.equal(unreadTimelinePageRequest.timelinePagination, true);
assert.equal(unreadTimelinePageRequest.filterContent, false);
assert.equal(unreadTimelinePageRequest.relevant, false);
const friendsTimelineRequest = testAPI.classifyInterceptedRequest(
  'https://weibo.com/ajax/feed/friendstimeline'
);
assert.equal(friendsTimelineRequest.filterContent, false);
assert.equal(friendsTimelineRequest.relevant, false);
assert.doesNotMatch(source, /EMPTY_UNREAD_TIMELINE_RESPONSE/);
assert.doesNotMatch(
  source,
  /timelineDefault\.value\s*&&\s*request\.unreadTimeline/
);
assert.match(source, /const ENABLE_PAGE_NETWORK_INTERCEPTION = false/);
assert.match(
  source,
  /if \(ENABLE_PAGE_NETWORK_INTERCEPTION\) \{[\s\S]*?window\.fetch\s*=[\s\S]*?XMLHttpRequest\.prototype\.send\s*=[\s\S]*?window\.WebSocket\s*=/
);
assert.match(source, /TIMELINE_PAGINATION_MIN_INTERVAL_MS = 1100/);
assert.match(source, /sendNativeXHRWithTimelinePacing\(this, body, request\)/);
assert.match(source, /XMLHttpRequest\.prototype\.abort = function/);
assert.equal(
  testAPI.isFilterableContentURL(
    'https://example.com/ajax/feed/hottimeline'
  ),
  false
);
assert.equal(
  testAPI.isFilterableContentURL(
    'https://weibo.com/anything?next=/ajax/feed/hottimeline'
  ),
  false
);
assert.equal(
  testAPI.classifyInterceptedRequest(
    'https://example.com/ajax/statuses/filterUser'
  ).relevant,
  false
);

const original = new Response('{"ok":1}', {
  status: 201,
  headers: {
    'content-encoding': 'gzip',
    'content-length': '999',
    'content-type': 'application/json',
    'x-regression': 'preserved',
  },
});
Object.defineProperties(original, {
  redirected: { configurable: true, value: true },
  type: { configurable: true, value: 'cors' },
  url: {
    configurable: true,
    value: 'https://weibo.com/ajax/feed/hottimeline',
  },
});
const rebuilt = testAPI.createCompatibleJSONResponse(original, {
  ok: 1,
  statuses: [],
});
assert.equal(rebuilt.status, 201);
assert.equal(rebuilt.url, original.url);
assert.equal(rebuilt.redirected, true);
assert.equal(rebuilt.type, 'cors');
assert.equal(rebuilt.headers.get('content-length'), null);
assert.equal(rebuilt.headers.get('content-encoding'), null);
assert.equal(rebuilt.headers.get('x-regression'), 'preserved');
rebuilt
  .json()
  .then((data) => {
    assert.deepEqual(data, { ok: 1, statuses: [] });
    console.log('regression tests: PASS');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
