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
assert.doesNotMatch(source, /^\/\/ @match\s+http:\/\//m);
assert.match(source, /function isTrustedUserEvent\(event\)/);
assert.match(
  sourceBetween('  function createCenteredConfirm(', '  function showCenteredConfirm('),
  /if \(!isTrustedUserEvent\(event\)\) return;/
);
assert.match(
  sourceBetween('    const handleContextMenu = (e) => {', "    document.addEventListener('contextmenu'"),
  /if \(!isTrustedUserEvent\(e\)\) return;/
);
assert.match(source, /function\s+filterContentTree\s*\(/);
assert.match(source, /function\s+runControlledSync\s*\(/);
assert.match(source, /controller\.abort\(\)/);
assert.match(source, /USER_SCRIPT_UI_SELECTOR/);
assert.doesNotMatch(source, /\balert\s*\(/);
assert.match(source, /function\s+showNotification\s*\(/);
assert.match(source, /WB_INTERNAL\.notify\s*=\s*showNotification/);
assert.match(source, /const GITHUB_URL = 'https:\/\/github\.com\/DanielZenFlow\/Pynseq-Weibo'/);
const filteredUsersParserSource = sourceBetween(
  '  function normalizeSyncCursor(value) {',
  '  function buildFilteredUsersURL(page, cursor) {'
);
const filteredUsersParserContext = {};
vm.runInNewContext(
  `${filteredUsersParserSource}
globalThis.parseFilteredUsers = parseFilteredUsersResponse;`,
  filteredUsersParserContext
);
assert.throws(
  () => filteredUsersParserContext.parseFilteredUsers({ ok: 0 }, '测试'),
  /失败/
);
assert.throws(
  () =>
    filteredUsersParserContext.parseFilteredUsers(
      { ok: 1, card_group: {} },
      '测试'
    ),
  /缺少名单数据/
);
assert.equal(
  filteredUsersParserContext.parseFilteredUsers(
    { ok: 1, card_group: [], next_cursor: 0 },
    '测试'
  ).nextCursor,
  ''
);
assert.equal(
  (source.match(/const parsed = parseFilteredUsersResponse\(data,/g) || []).length,
  3
);
const observerSource = sourceBetween(
  '      observer.observe(root, {',
  '    function subscribeMutations('
);
[
  'href',
  'data-user-id',
  'data-user-card',
  'data-usercard',
  'data-usercard-mid',
  'data-uid',
  'uid',
  'usercard',
  'nick-name',
].forEach((attribute) => {
  assert.match(observerSource, new RegExp(`'${attribute}'`));
});
const userContextSelectorSource = sourceBetween(
  '  const USER_CONTEXT_TARGET_SELECTOR = [',
  '  function getUserNameLabel('
);
assert.match(userContextSelectorSource, /'\.woo-avatar-main'/);
assert.match(userContextSelectorSource, /'\.woo-avatar-img'/);
assert.match(userContextSelectorSource, /'\[usercard\^="name=@"\]'/);
assert.match(userContextSelectorSource, /'header a\[href=""\]'/);
const extractDOMUIDsSource = sourceBetween(
  '  function extractDOMUIDs(el) {',
  '  function collectScopedUserContextUIDs('
);
assert.match(
  extractDOMUIDsSource,
  /addDirectUID\(el\.getAttribute\('data-user-card'\)\)/
);
assert.match(
  extractDOMUIDsSource,
  /addMatches\(href, \/\^\\\/\(\\d\{5,\}\)/
);
const uidParserSandbox = {};
vm.runInNewContext(
  `${extractDOMUIDsSource}
globalThis.extractDOMUIDsForTest = extractDOMUIDs;`,
  uidParserSandbox
);
const fakeUIDElement = (attributes) => ({
  getAttribute(name) {
    return Object.hasOwn(attributes, name) ? attributes[name] : null;
  },
});
assert.deepEqual(
  Array.from(
    uidParserSandbox.extractDOMUIDsForTest(
      fakeUIDElement({ 'data-user-card': '3210890705' })
    )
  ),
  ['3210890705']
);
assert.deepEqual(
  Array.from(
    uidParserSandbox.extractDOMUIDsForTest(
      fakeUIDElement({ href: '/3210890705/Rad3Fk9LU' })
    )
  ),
  ['3210890705']
);
assert.deepEqual(
  Array.from(
    uidParserSandbox.extractDOMUIDsForTest(
      fakeUIDElement({ usercard: 'name=@_苏世独立_横而不流' })
    )
  ),
  []
);
const userContextResolverSource = sourceBetween(
  '  function getUserContextFromTarget(target) {',
  '  function shouldConfirmBeforeBlocking('
);
const searchContextResolverSource = sourceBetween(
  '  function getSearchResultUserContext(el) {',
  '  function getCurrentProfilePageUID() {'
);
assert.match(
  searchContextResolverSource,
  /unresolvedDirectTarget[\s\S]*?expectedName[\s\S]*?fallbackName[\s\S]*?expectedName !== fallbackName[\s\S]*?return null/
);
assert.match(
  userContextResolverSource,
  /firstDOMUID\(source\)\s*\|\|\s*getScopedUserContextUID\(nameTarget, explicitName\)/
);
assert.doesNotMatch(
  userContextResolverSource,
  /firstDOMUID\(source,\s*post\)/
);
assert.match(
  sourceBetween(
    '  function getCurrentProfilePageUID() {',
    '  function getUserContextFromTarget('
  ),
  /\/p\\\/100505\(\\d\{5,\}\)/
);
const scopedUserResolverSource = sourceBetween(
  '  function getScopedUserContextUID(',
  '  function normDOMText('
);
assert.match(
  scopedUserResolverSource,
  /addScope\(target\.closest\(DOM_COMMENT_ROOT_SELECTOR\), false\)/
);
assert.match(
  scopedUserResolverSource,
  /chooseScopedUserContextUID\(\s*records,\s*expectedName,\s*allowUniqueFallback\s*\)/
);
const chooseScopedUserContextUIDSource = sourceBetween(
  '  function chooseScopedUserContextUID(',
  '  function getScopedUserContextUID('
);
const scopedUIDSandbox = {
  cleanUserDisplayName(text) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    return value.replace(/^@+/, '');
  },
};
vm.runInNewContext(
  `${chooseScopedUserContextUIDSource}
globalThis.chooseScopedUserContextUIDForTest = chooseScopedUserContextUID;`,
  scopedUIDSandbox
);
const scopedUIDRecords = [
  {
    uid: '3210890705',
    labels: ['_苏世独立_横而不流', ''],
  },
  {
    uid: '7299117014',
    labels: ['科技主理人'],
  },
];
assert.equal(
  scopedUIDSandbox.chooseScopedUserContextUIDForTest(
    scopedUIDRecords,
    '_苏世独立_横而不流',
    false
  ),
  '3210890705'
);
assert.equal(
  scopedUIDSandbox.chooseScopedUserContextUIDForTest(
    scopedUIDRecords,
    '没有数字 UID 的提及用户',
    false
  ),
  '',
  'an unresolved mention must never fall back to the post author'
);
assert.equal(
  scopedUIDSandbox.chooseScopedUserContextUIDForTest(
    [{ uid: '3210890705', labels: [] }],
    '',
    true
  ),
  '3210890705'
);
assert.equal(
  scopedUIDSandbox.chooseScopedUserContextUIDForTest(
    [{ uid: '3210890705', labels: [] }],
    '',
    false
  ),
  ''
);
const contextMenuHandlerSource = sourceBetween(
  '    const handleContextMenu = (e) => {',
  "    document.addEventListener('contextmenu', handleContextMenu, true);"
);
assert.match(
  contextMenuHandlerSource,
  /const contextTarget = nameTarget \|\| directTarget/
);
assert.match(
  contextMenuHandlerSource,
  /USER_CONTEXT_TARGET_SELECTOR/
);
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
assert.match(source, /const UID_MUTATION_LOCK_KEY = 'WB_BL_mutation_lock_v1'/);
assert.match(source, /async function withLocalBLMutationLock\(task\)/);
assert.match(source, /confirmed\?\.owner === owner/);
assert.match(source, /async function mutateLocalBLStorage\(options = \{\}\)/);
assert.match(source, /async function commitSyncedLocalBL\(/);
assert.equal(
  (source.match(/await commitSyncedLocalBL\(/g) || []).length,
  3
);
assert.match(settingsSource, /function isTrustedSettingsEvent\(event\)/);
assert.match(
  settingsSource,
  /#wbset-save'\)\.addEventListener\('click', \(event\) => \{[\s\S]*?if \(!isTrustedSettingsEvent\(event\)\) return;/
);
assert.doesNotMatch(source, /cdn\.buymeacoffee\.com/);
assert.match(source, /function buyMeACoffeeIconMarkup\(\)[\s\S]*?<svg viewBox="0 0 24 24"/);
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
assert.match(source, /@version\s+2\.2\.0/);
assert.match(source, /const SCRIPT_VERSION = '2\.2\.0'/);
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
assert.match(onboardingFinishSource, /const previousCfg = loadCfg\(\)/);
assert.match(
  onboardingFinishSource,
  /previousCfg\.defaultLatestTimeline !== false/
);
assert.match(
  onboardingFinishSource,
  /const previousHotSearchHidden = previousCfg\.hideHotSearch === true/
);
assert.match(onboardingFinishSource, /CFG = saveCfg\(normalizeCfg\(nextSettings\)\)/);
assert.match(onboardingFinishSource, /WB_INTERNAL\.applyConfig\?\.\(CFG\)/);
assert.match(
  onboardingFinishSource,
  /applyPanelSettingsNow\(\{[\s\S]*?restoredHotSearch:/
);
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
  '  async function addContextUserToBL(',
  '  function getCookieValue('
);
assert.match(immediateBlockSource, /hideContentRoot\(post, ctx\.uid\)/);
assert.match(immediateBlockSource, /compactVirtualScrollerGaps\(document\)/);
assert.match(immediateBlockSource, /nudgeTimelineLayout\(\)/);
assert.match(
  immediateBlockSource,
  /const added = await addUIDToLocalBL\(ctx\.uid\);[\s\S]*try \{/
);
assert.match(
  immediateBlockSource,
  /catch \(err\) \{[\s\S]*当前页面刷新失败/
);
const hideShellSource = sourceBetween(
  '  function findHideShell(',
  '  function hideContentRoot('
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
assert.match(
  virtualGapSource,
  /updateNativeTimelinePaginationGuards\(scanRoot\)/
);
assert.doesNotMatch(
  virtualGapSource,
  /(?:transform|top|min-height|height|scrollTo|scrollBy)\s*[=:]/
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
  /prepareNativeTimelinePaginationGuard\(target\)[\s\S]*?BLOCKED_CONTENT_ORIGINAL_ARIA_ATTR[\s\S]*?target\.setAttribute\(BLOCKED_CONTENT_HIDE_ATTR/
);
const floatingVideoSuppressionSource = sourceBetween(
  '  function suppressFloatingVideoPlayers(',
  '  function getNativeTimelinePaginationParts('
);
assert.match(
  source,
  /\[\$\{FLOATING_VIDEO_SUPPRESS_ATTR\}="1"\][\s\S]*?display:\s*none !important/
);
assert.match(
  floatingVideoSuppressionSource,
  /player\.setAttribute\(FLOATING_VIDEO_SUPPRESS_ATTR, '1'\)/
);
assert.match(
  floatingVideoSuppressionSource,
  /restoreSuppressedFloatingVideoPlayers/
);
assert.doesNotMatch(
  floatingVideoSuppressionSource,
  /player\.remove\(\)|style\.(?:setProperty|removeProperty)/
);
assert.doesNotMatch(
  source,
  /removeWeiboFloatingVideoPlayers|removeFloatingVideoPlayer/
);
const clearBlockedStateSource = sourceBetween(
  '  function clearOwnBlockedContentHideState(el) {',
  '  function clearBlockedContentHideState(root) {'
);
assert.match(
  clearBlockedStateSource,
  /originalAria === BLOCKED_CONTENT_ARIA_ABSENT[\s\S]*?removeAttribute\('aria-hidden'\)/
);
assert.match(
  clearBlockedStateSource,
  /originalAria !== null[\s\S]*?setAttribute\('aria-hidden', originalAria\)/
);
assert.doesNotMatch(
  clearBlockedStateSource,
  /style\.(?:removeProperty|setProperty)|style\.[A-Za-z]+\s*=/
);
class FakeRestorableElement {
  constructor(attributes = {}) {
    this.attributes = new Map(Object.entries(attributes));
    this.style = {
      cssText:
        'display:flex;height:72px;margin:8px;padding:4px;overflow:visible',
    };
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
}
const blockedRestoreContext = vm.createContext({
  Element: FakeRestorableElement,
  BLOCKED_CONTENT_HIDE_ATTR: 'data-hidden',
  BLOCKED_CONTENT_UID_ATTR: 'data-hidden-uid',
  BLOCKED_CONTENT_ORIGINAL_ARIA_ATTR: 'data-original-aria',
  BLOCKED_CONTENT_ARIA_ABSENT: '__absent__',
  COMMENT_CONTENT_ROOT_ATTR: 'data-comment-root',
});
vm.runInContext(
  `${clearBlockedStateSource}
   this.clearOwnBlockedContentHideState = clearOwnBlockedContentHideState;`,
  blockedRestoreContext
);
const nativeStyledCard = new FakeRestorableElement({
  'data-hidden': '1',
  'data-hidden-uid': '123456',
  'data-comment-root': '1',
  'data-original-aria': 'false',
  'aria-hidden': 'true',
});
const nativeStyleBeforeRestore = nativeStyledCard.style.cssText;
blockedRestoreContext.clearOwnBlockedContentHideState(nativeStyledCard);
assert.equal(nativeStyledCard.getAttribute('aria-hidden'), 'false');
assert.equal(nativeStyledCard.style.cssText, nativeStyleBeforeRestore);
assert.equal(nativeStyledCard.hasAttribute('data-hidden'), false);
assert.equal(nativeStyledCard.hasAttribute('data-hidden-uid'), false);
assert.equal(nativeStyledCard.hasAttribute('data-comment-root'), false);
assert.equal(nativeStyledCard.hasAttribute('data-original-aria'), false);
const nativeCardWithoutAria = new FakeRestorableElement({
  'data-hidden': '1',
  'data-original-aria': '__absent__',
  'aria-hidden': 'true',
});
blockedRestoreContext.clearOwnBlockedContentHideState(nativeCardWithoutAria);
assert.equal(nativeCardWithoutAria.hasAttribute('aria-hidden'), false);
assert.equal(nativeCardWithoutAria.style.cssText, nativeStyleBeforeRestore);
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
  /updateNativeTimelinePaginationGuards\(scanRoot\)/
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
const uidOutsideCommentRootsSource = sourceBetween(
  '  function hasUIDOutsideCommentRoots(',
  '  function findCommentRootForUID('
);
assert.match(
  uidOutsideCommentRootsSource,
  /getElementsForUID\(root, id\)\.some/
);
assert.match(
  uidOutsideCommentRootsSource,
  /!findCommentRootForUID\(candidate, id\)/
);
class FakeUIDScope {
  constructor(candidates = []) {
    this.candidates = candidates;
  }
}
const uidOutsideCommentRootsSandbox = {
  Element: FakeUIDScope,
  getElementsForUID(root) {
    return root.candidates;
  },
  findCommentRootForUID(candidate) {
    return candidate.commentRoot ? {} : null;
  },
};
vm.runInNewContext(
  `${uidOutsideCommentRootsSource}
globalThis.hasUIDOutsideCommentRootsForTest = hasUIDOutsideCommentRoots;`,
  uidOutsideCommentRootsSandbox
);
assert.equal(
  uidOutsideCommentRootsSandbox.hasUIDOutsideCommentRootsForTest(
    new FakeUIDScope([{ commentRoot: true }]),
    '5288245215'
  ),
  false,
  'a blocked UID found only in comments must not keep a recycled feed shell hidden'
);
assert.equal(
  uidOutsideCommentRootsSandbox.hasUIDOutsideCommentRootsForTest(
    new FakeUIDScope([{ commentRoot: true }, { commentRoot: false }]),
    '5288245215'
  ),
  true,
  'a blocked feed author outside comment roots must keep its content shell hidden'
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
assert.doesNotMatch(
  source,
  /VIRTUAL_COMPACTION|COMPACTED_VIRTUAL|applyVirtual(?:Item|Wrapper)Compaction|clearVirtualCompactionState/
);
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
const relayCloseSource = sourceBetween(
  '  function scheduleOfficialBlockRelayClose(',
  '  function requestOfficialBlockViaMainHost('
);
assert.match(
  relayCloseSource,
  /clearOfficialBlockRelayState\(requestId\)/
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
assert.match(
  saveHandlerSource,
  /applyPanelSettingsNow\(\{[\s\S]*?restoredHotSearch:/
);
assert.match(saveHandlerSource, /syncLauncherButton\(\)/);
assert.match(saveHandlerSource, /closePanel\(\{ reset: false \}\)/);
assert.match(saveHandlerSource, /reconcileHomeTimelineSetting\(/);
assert.equal((source.match(/location\.reload\s*\(/g) || []).length, 1);
assert.match(
  source,
  /const HOT_SEARCH_SIDEBAR_OVERFLOW_SPACING_ATTR\s*=\s*[\s\S]*?'data-__wb_hot_search_sidebar_overflow_spacing'/
);
assert.doesNotMatch(
  source,
  /HOT_SEARCH_SIDEBAR_AUTO_HEIGHT_ATTR|data-__wb_hot_search_sidebar_auto_height/
);
assert.doesNotMatch(
  source,
  /normalizeFirstVisibleSidebarGaps|alignFirstVisibleSidebarToComposer|data-__wb_sidebar_anchor_aligned|data-__wb_original_margin_top/
);
assert.doesNotMatch(
  sourceBetween(
    '  function hideSearchRelatedUsersPanel(',
    '  // ---- Settings UI ----'
  ),
  /(?:panel|side|target)\.style\.(?:setProperty|removeProperty)|\.style\.(?:marginTop|marginBottom|transform)\s*=/
);
const settingsModuleSource = sourceBetween(
  '/* === Settings v5: standard navigation + UID management === */',
  '/* === /Settings v5 === */'
);
assert.doesNotMatch(
  settingsModuleSource,
  /\binjectCSSWhenReady\s*\(/,
  'Settings must not call helpers outside its IIFE before launcher initialization'
);
assert.doesNotMatch(
  sourceBetween('  function ensureStyles() {', '  function githubIconMarkup() {'),
  /height:\s*auto\s*!important/
);
assert.match(
  sourceBetween('  function ensureStyles() {', '  function githubIconMarkup() {'),
  /HOT_SEARCH_SIDEBAR_OVERFLOW_SPACING_ATTR[\s\S]*?::after/
);
const restoreHotSearchSidebarLayoutSource = sourceBetween(
  '  function restoreHotSearchSidebarOverflowSpacing(rail) {',
  '  function syncHotSearchSidebarLayout() {'
);
assert.match(
  restoreHotSearchSidebarLayoutSource,
  /rail\.style\.removeProperty\(HOT_SEARCH_SIDEBAR_OVERFLOW_PROPERTY\)/
);
assert.match(
  restoreHotSearchSidebarLayoutSource,
  /rail\.removeAttribute\(HOT_SEARCH_SIDEBAR_OVERFLOW_SPACING_ATTR\)/
);
const hotSearchSidebarLayoutSource = sourceBetween(
  '  function syncHotSearchSidebarLayout() {',
  '  function promoteHiddenSidebarShells('
);
assert.match(
  hotSearchSidebarLayoutSource,
  /const targetRailOverflow = new Map\(\)/
);
assert.match(
  hotSearchSidebarLayoutSource,
  /if \(hotSearchSidebarOverflowSpacingActive && !CFG\.hideHotSearch\)/
);
assert.match(
  hotSearchSidebarLayoutSource,
  /side\.closest\('\.rightSide, \[class\*="_sideBox_"\]'\)/
);
assert.match(
  hotSearchSidebarLayoutSource,
  /while \(shell\.parentElement && shell\.parentElement !== rail\)/
);
assert.match(
  hotSearchSidebarLayoutSource,
  /if \(shell\.parentElement !== rail\) return;/
);
assert.match(
  hotSearchSidebarLayoutSource,
  /document\.querySelectorAll\(markedSelector\)[\s\S]*?!targetRailOverflow\.has\(rail\)[\s\S]*?restoreHotSearchSidebarOverflowSpacing\(rail\)/
);
assert.match(
  hotSearchSidebarLayoutSource,
  /Math\.ceil\(shell\.scrollHeight - shell\.clientHeight\)/
);
assert.match(
  hotSearchSidebarLayoutSource,
  /rail\.style\.setProperty\([\s\S]*?HOT_SEARCH_SIDEBAR_OVERFLOW_PROPERTY,[\s\S]*?`\$\{overflowHeight\}px`/
);
assert.match(
  hotSearchSidebarLayoutSource,
  /rail\.setAttribute\(HOT_SEARCH_SIDEBAR_OVERFLOW_SPACING_ATTR, '1'\)/
);
assert.doesNotMatch(
  hotSearchSidebarLayoutSource,
  /shell\.style\.(?:height|minHeight|maxHeight)|height:\s*auto/
);
assert.match(
  sourceBetween('  function hidePanels(', '  function restoreManagedPanels()'),
  /hideSearchHotBand\(root\);[\s\S]*?syncHotSearchSidebarLayout\(\);/
);
const applyPanelSettingsSource = sourceBetween(
  '  function applyPanelSettingsNow(options = {}) {',
  '  function queuePanelRefresh('
);
assert.match(
  applyPanelSettingsSource,
  /if \(options\.restoredHotSearch\)[\s\S]*?hotSearchSidebarOverflowSpacingActive = true/
);
assert.match(
  applyPanelSettingsSource,
  /if \(CFG\.hideHotSearch\)[\s\S]*?hotSearchSidebarOverflowSpacingActive = false/
);
assert.match(
  saveHandlerSource,
  /const previousHotSearchHidden = CFG\.hideHotSearch === true/
);
assert.match(
  saveHandlerSource,
  /applyPanelSettingsNow\(\{[\s\S]*?restoredHotSearch:\s*previousHotSearchHidden && CFG\.hideHotSearch === false/
);
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
  `globalThis.testAPI = {
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
assert.doesNotMatch(source, /EMPTY_UNREAD_TIMELINE_RESPONSE/);
assert.doesNotMatch(
  source,
  /timelineDefault\.value\s*&&\s*request\.unreadTimeline/
);
assert.doesNotMatch(source, /ENABLE_PAGE_NETWORK_INTERCEPTION/);
assert.doesNotMatch(source, /window\.fetch\s*=/);
assert.doesNotMatch(source, /XMLHttpRequest\.prototype\.(?:open|send|abort)\s*=/);
assert.doesNotMatch(source, /window\.WebSocket\s*=/);
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
console.log('regression tests: PASS');
