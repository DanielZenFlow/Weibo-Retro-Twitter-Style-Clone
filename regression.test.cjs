const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(
  __dirname,
  'weibo-retro-twitter-style-clone.user.js'
);
const source = fs.readFileSync(scriptPath, 'utf8');

function sourceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

assert.doesNotMatch(source, /window\.(?:WB_RETRO_CONFIRM|WB_BL_SYNC)/);
assert.doesNotMatch(source, /function\s+(?:filterData|filterAdsFromData)\s*\(/);
assert.match(source, /function\s+filterContentTree\s*\(/);
assert.match(source, /function\s+runControlledSync\s*\(/);
assert.match(source, /controller\.abort\(\)/);
assert.match(source, /USER_SCRIPT_UI_SELECTOR/);
assert.doesNotMatch(source, /\balert\s*\(/);
assert.match(source, /function\s+showNotification\s*\(/);
assert.match(source, /WB_INTERNAL\.notify\s*=\s*showNotification/);
assert.match(source, /WB_INTERNAL\.applyConfig\s*=\s*applyRuntimeConfig/);
assert.match(source, /wb-retro-runtime-style/);
assert.match(source, /const WB_CONFIG_SCHEMA_VERSION = 1/);
assert.match(source, /@grant\s+GM_removeValueChangeListener/);
assert.match(source, /WB_INTERNAL\.getDiagnostics\s*=/);
assert.match(source, /wbset-diagnostics-copy/);
const diagnosticsSource = sourceBetween(
  '  function getDiagnosticPageType() {',
  '  (async () => {'
);
assert.match(diagnosticsSource, /pageType:\s*getDiagnosticPageType\(\)/);
assert.doesNotMatch(diagnosticsSource, /path:\s*location\.pathname/);
const diagnosticContext = vm.createContext({
  location: { hostname: 'weibo.com', pathname: '/u/1960878503' },
});
vm.runInContext(
  sourceBetween(
    '  function getDiagnosticPageType() {',
    '  WB_INTERNAL.getDiagnostics ='
  ),
  diagnosticContext
);
assert.equal(
  vm.runInContext('getDiagnosticPageType()', diagnosticContext),
  'user-profile'
);
diagnosticContext.location.hostname = 's.weibo.com';
diagnosticContext.location.pathname = '/weibo';
assert.equal(
  vm.runInContext('getDiagnosticPageType()', diagnosticContext),
  'search-results'
);
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
  /data-wbset-page="uids">本地屏蔽列表<\/button>/
);
assert.match(source, /data-wbset-page="data">数据管理<\/button>/);
assert.match(
  source,
  /data-wbset-page="diagnostics">高级诊断<\/button>/
);
assert.match(
  source,
  /data-wbset-section="diagnostics"/
);
const settingsSource = sourceBetween(
  '/* === Settings v5:',
  '/* === /Settings v5 === */'
);
const settingsHTMLIds = new Set(
  Array.from(settingsSource.matchAll(/\bid="([^"]+)"/g), (match) => match[1])
);
assert.equal(
  settingsHTMLIds.size,
  Array.from(settingsSource.matchAll(/\bid="([^"]+)"/g)).length,
  'settings markup must not contain duplicate IDs'
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
  'data-wbset-section="diagnostics"'
);
assert.doesNotMatch(dataSettingsSection, /wbset-diagnostics/);
assert.match(source, /@version\s+2\.0\.0/);
assert.match(source, /const SCRIPT_VERSION = '2\.0\.0'/);
assert.match(settingsSource, /<span class="wbset-version">v2\.0\.0<\/span>/);
assert.doesNotMatch(source, /本地黑名单/);
assert.match(source, /weibo-local-block-list-/);
assert.doesNotMatch(source, /weibo-blacklist-backup-/);
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
    '  function normalizeStoredConfig(rawCfg) {',
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
assert.match(saveHandlerSource, /openNativeHomeTimeline\(\)/);
assert.match(saveHandlerSource, /location\.assign\s*\(/);
assert.equal((source.match(/location\.reload\s*\(/g) || []).length, 1);
const nativeHomeSource = sourceBetween(
  '      function openNativeHomeTimeline() {',
  "      panel.querySelector('#wbset-save').addEventListener"
);
assert.match(nativeHomeSource, /title="全部关注"/);
assert.match(nativeHomeSource, /allFollowingTab\.click\(\)/);
assert.match(nativeHomeSource, /settings-native-home-fallback/);

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
  sourceBetween(
    '  const MAX_FILTER_DEPTH = 80;',
    '  const DOM_UID_SELECTOR = ['
  ),
  context
);
vm.runInContext(
  sourceBetween(
    '  function classifyInterceptedRequest(url) {',
    '  const EMPTY_UNREAD_TIMELINE_RESPONSE'
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
  'https://weibo.com/ajax/feed/hottimeline'
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

const untouched = { statuses: [{ id: 'visible', user: { idstr: '67890' } }] };
const untouchedResult = testAPI.transformContentResponseData(
  untouched,
  'https://weibo.com/ajax/feed/hottimeline'
);
assert.equal(untouchedResult.changed, false);
assert.equal(untouchedResult.data, untouched);

assert.equal(
  testAPI.isFilterableContentURL('https://weibo.com/ajax/feed/hottimeline'),
  true
);
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
