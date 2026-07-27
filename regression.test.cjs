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
const changelog = fs.readFileSync(
  path.join(__dirname, 'CHANGELOG.zh-CN.md'),
  'utf8'
);
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
assert.match(source, /@version\s+2\.3\.1/);
assert.match(source, /const SCRIPT_VERSION = '2\.3\.1'/);
// 元数据版本号与运行时常量必须始终一致，否则设置面板会显示错误版本。
assert.equal(
  source.match(/@version\s+(\S+)/)?.[1],
  source.match(/const SCRIPT_VERSION = '([^']+)'/)?.[1],
  'the userscript metadata version and SCRIPT_VERSION must stay in sync'
);
// 更新日志必须为当前版本留有条目。
assert.ok(
  changelog.includes(
    `## v${source.match(/const SCRIPT_VERSION = '([^']+)'/)?.[1]} `
  ),
  'CHANGELOG must document the current version'
);
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
// 旧的 192px「分页保护间距」对微博的哨兵毫无作用：哨兵用 rootMargin 1500px
// 的 IntersectionObserver 监听，推开 192px 根本不会改变可见性判定；而且它取的
// 是第一个 __slot（前置槽，永远是空的），实际从未生效过。
assert.doesNotMatch(source, /NATIVE_PAGINATION_GUARD/);
assert.match(
  source,
  /\[\$\{TIMELINE_LOADER_NUDGE_ATTR\}="1"\]\s*\{[\s\S]*?display:\s*none !important;/
);
assert.doesNotMatch(
  source,
  /\[class\*="vue-recycle-scroller__item-view"\]\s*\{[\s\S]*?(?:transform|min-height):/
);
assert.match(
  sourceBetween(
    '  function hideContentRoot(',
    '  let floatingVideoSuppressUntil ='
  ),
  /markTimelineScrollerCollapsed\(target\)[\s\S]*?BLOCKED_CONTENT_ORIGINAL_ARIA_ATTR[\s\S]*?target\.setAttribute\(BLOCKED_CONTENT_HIDE_ATTR/
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
const timelineStallSource = sourceBetween(
  '  function findNativeTimelineLoaderCard(scroller) {',
  '  function compactVirtualScrollerGaps('
);
// 停滞恢复只允许隐藏/恢复哨兵，绝不能改行坐标、外层高度或替微博滚动。
assert.doesNotMatch(
  timelineStallSource,
  /(?:transform|min-height|scrollTo|scrollBy)\s*[=:]/
);
// 后置槽才有哨兵，必须遍历全部 __slot，不能只 querySelector 第一个。
assert.match(
  timelineStallSource,
  /querySelectorAll\(\s*'?\s*:scope > \.vue-recycle-scroller__slot/
);
assert.doesNotMatch(
  timelineStallSource,
  /querySelector\(\s*\n?\s*'?:scope > \.vue-recycle-scroller__slot/
);
// 后台标签页里 rAF 会停摆，必须有定时兜底，否则哨兵会被永久隐藏。
assert.match(
  timelineStallSource,
  /setTimeout\(restore, TIMELINE_NUDGE_RESTORE_MS\)/
);
assert.match(
  timelineStallSource,
  /document\.visibilityState !== 'visible'/
);
// 只在脚本确实折叠过内容时才补偿，避免干预未被影响的原生分页。
assert.match(
  timelineStallSource,
  /hasAttribute\(TIMELINE_COLLAPSED_ANY_ATTR\)/
);
assert.match(
  timelineStallSource,
  /timelineStall\.staleNudges >= TIMELINE_NUDGE_MAX_STALE/
);
// 停滞判定不得读取 document.scrollHeight：微博的图片、视频和侧栏会持续改变它，
// 以它为信号会把静止计时不断清零，补偿将无法触发。
assert.doesNotMatch(timelineStallSource, /documentElement[^\n]*scrollHeight/);
assert.match(
  timelineStallSource,
  /readTimelineContentHeight\(scroller\)/
);
assert.match(
  sourceBetween(
    '  function readTimelineContentHeight(scroller) {',
    '  const timelineStall = {'
  ),
  /vue-recycle-scroller__item-wrapper[\s\S]*?wrapper\.style\.minHeight/
);
// 只有大幅增长才算"新一页到了"，否则图片撑开的小幅重测会不断重置计时。
assert.match(
  timelineStallSource,
  /timelineStall\.lastContentHeight >\s*TIMELINE_PAGE_GROWTH_PX/
);
// 所有入口都不传 root，统一解析到同一个滚动容器，避免不同入口命中不同容器
// 而把停滞计时反复重置。
assert.match(
  virtualGapSource,
  /recoverStalledTimelinePagination\(\)/
);
// 哨兵查不到时必须整拍跳过：既不清静止计时，也不换容器。任何"查不到就重置"
// 的写法都是拿噪声信号复位计时器，400ms 心跳叠加滚动回调会让计时永远走不满。
assert.match(
  timelineStallSource,
  /const card = findNativeTimelineLoaderCard\(scroller\);\s*if \(!card\) return;/
);
assert.doesNotMatch(timelineStallSource, /findPaginatingTimeline/);

// 行为验证：哨兵在后置槽里，findNativeTimelineLoaderCard 必须找得到，
// 并且返回的是槽的直接子节点（微博用来包裹 spinner 的那张卡片）。
// 最小 DOM 替身，只实现该函数用到的能力：:scope 直接子节点查询、
// 后代类名查询和 parentElement 链。
class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = String(tagName).toUpperCase();
    this.className = '';
    this.children = [];
    this.parentElement = null;
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  hasClass(cls) {
    return String(this.className || '')
      .split(/\s+/)
      .filter(Boolean)
      .includes(cls);
  }
  querySelectorAll(selector) {
    const scoped = selector.startsWith(':scope >');
    const cls = selector.replace(/^:scope >\s*/, '').replace(/^\./, '').trim();
    if (scoped) return this.children.filter((child) => child.hasClass(cls));
    const found = [];
    const walk = (node) => {
      node.children.forEach((child) => {
        if (child.hasClass(cls)) found.push(child);
        walk(child);
      });
    };
    walk(this);
    return found;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}
const loaderLookupContext = vm.createContext({ Element: FakeElement });
vm.runInContext(
  `${sourceBetween(
    '  function findNativeTimelineLoaderCard(scroller) {',
    '  function markTimelineScrollerCollapsed('
  )}
  globalThis.findLoaderCard = findNativeTimelineLoaderCard;`,
  loaderLookupContext
);
const makeSlot = () => {
  const slot = new FakeElement('div');
  slot.className = 'vue-recycle-scroller__slot';
  return slot;
};
const fakeScroller = new FakeElement('div');
fakeScroller.className = 'vue-recycle-scroller';
const beforeSlot = makeSlot();
const afterSlot = makeSlot();
const loaderCard = new FakeElement('div');
loaderCard.className = 'woo-panel-main';
const spinner = new FakeElement('i');
spinner.className = 'woo-spinner-main';
loaderCard.appendChild(spinner);
afterSlot.appendChild(loaderCard);
fakeScroller.appendChild(beforeSlot);
fakeScroller.appendChild(afterSlot);
assert.equal(
  loaderLookupContext.findLoaderCard(fakeScroller),
  loaderCard,
  'loader lookup must skip the empty before-slot and return the after-slot card'
);
assert.equal(loaderLookupContext.findLoaderCard(makeSlot()), null);
assert.equal(loaderLookupContext.findLoaderCard(null), null);

// 行为验证：仅检查源码文本的断言无法确认补偿是否真的会执行。这里直接跑一遍
// 状态机，模拟"哨兵停在视口里、列表总高不再增长"的卡死现场，确认补偿会触发，
// 并且在健康、后台标签页、未折叠内容等情况下保持沉默。
function runTimelineStallScenario({
  sentinelTop = 670,
  visibilityState = 'visible',
  collapsed = true,
  pageGrowthPx = 0,
  ticks = 60,
  // Vue 在续页前后会重建后置槽，哨兵会间歇性查不到。设为 N 表示每 N 拍
  // 有一拍找不到哨兵。
  sentinelMissingEvery = 0,
} = {}) {
  let tick = 0;
  const sentinelPresent = () =>
    !sentinelMissingEvery || tick % sentinelMissingEvery !== 0;
  const stallSource =
    sourceBetween(
      '  const TIMELINE_COLLAPSED_ANY_ATTR =',
      '  const VIRTUAL_VIEW_SELECTOR ='
    ) +
    sourceBetween(
      '  function findNativeTimelineLoaderCard(scroller) {',
      '  function compactVirtualScrollerGaps('
    );

  let contentHeight = 7502;
  const nudges = [];
  class StallElement {}
  const spinner = new StallElement();
  spinner.className = 'woo-spinner-main';
  const card = new StallElement();
  card.className = 'woo-panel-main';
  card.getBoundingClientRect = () => ({
    top: sentinelTop,
    bottom: sentinelTop + 40,
  });
  card.setAttribute = () => {};
  card.removeAttribute = () => {};
  spinner.parentElement = card;
  const makeStallSlot = (kids) => {
    const slot = new StallElement();
    slot.className = 'vue-recycle-scroller__slot';
    slot.querySelector = (sel) =>
      sel === '.woo-spinner-main' && kids.length && sentinelPresent()
        ? spinner
        : null;
    kids.forEach((kid) => {
      kid.parentElement = slot;
    });
    return slot;
  };
  const slots = [makeStallSlot([]), makeStallSlot([card])];
  const wrapper = {
    style: {
      get minHeight() {
        return `${contentHeight}px`;
      },
    },
    getBoundingClientRect: () => ({ height: contentHeight }),
  };
  const scroller = new StallElement();
  scroller.className = 'vue-recycle-scroller';
  scroller.matches = (sel) => sel === '.vue-recycle-scroller';
  scroller.closest = () => scroller;
  scroller.hasAttribute = () => collapsed;
  scroller.querySelectorAll = (sel) => (sel.includes('__slot') ? slots : []);
  scroller.querySelector = (sel) =>
    sel.includes('item-wrapper') ? wrapper : null;

  const fakeDocument = { visibilityState, querySelector: () => scroller };
  const factory = new Function(
    'Element',
    'document',
    'window',
    'isRelationshipListPage',
    'requestAnimationFrame',
    'setTimeout',
    'onNudge',
    `${stallSource}
     nudgeNativeTimelineLoader = onNudge;
     return { recover: recoverStalledTimelinePagination };`
  );
  const instance = factory(
    StallElement,
    fakeDocument,
    { innerHeight: 711 },
    () => false,
    (fn) => fn,
    (fn) => fn,
    () => {
      nudges.push(contentHeight);
      contentHeight += pageGrowthPx;
    }
  );

  const realNow = Date.now;
  let clock = 1_000_000;
  Date.now = () => clock;
  try {
    for (let i = 0; i < ticks; i += 1) {
      tick = i;
      instance.recover();
      clock += 400;
    }
  } finally {
    Date.now = realNow;
  }
  return nudges.length;
}

// 卡死现场：补偿必须触发，且在时间线真的到头时收敛到上限。
assert.equal(
  runTimelineStallScenario({ pageGrowthPx: 0 }),
  3,
  'a stalled timeline must be nudged, then give up after the retry cap'
);
// 每次补偿都换来新的一页时，必须能一直翻下去，而不是三次之后就永久停摆。
assert.ok(
  runTimelineStallScenario({ pageGrowthPx: 900 }) > 3,
  'pagination must keep going while each nudge actually loads a page'
);
// 哨兵被顶出视口 = 原生分页正常，不能插手。
assert.equal(runTimelineStallScenario({ sentinelTop: 4000 }), 0);
// 后台标签页不渲染，翻转不会被投递，必须完全不动。
assert.equal(runTimelineStallScenario({ visibilityState: 'hidden' }), 0);
// 没折叠过任何内容就不是脚本造成的，交给微博原生行为。
assert.equal(runTimelineStallScenario({ collapsed: false }), 0);
// 哨兵间歇性查不到（Vue 重建后置槽）时补偿仍须触发：若在这一拍复位计时或
// 更换跟踪容器，静止判定将无法走满，补偿不再执行。
assert.ok(
  runTimelineStallScenario({ sentinelMissingEvery: 3, pageGrowthPx: 900 }) > 3,
  'a sentinel that briefly disappears must not reset the stall timer'
);
assert.ok(
  runTimelineStallScenario({ sentinelMissingEvery: 2 }) > 0,
  'pagination recovery must survive an intermittently missing sentinel'
);
// 关系列表页要还原成原生形态，遗留的哨兵隐藏标记必须一并清掉，
// 否则哨兵会被永久隐藏。
assert.match(
  sourceBetween(
    '  function restoreHiddenRelationshipItems(',
    '  function clearOwnBlockedContentHideState('
  ),
  /removeAttribute\(TIMELINE_LOADER_NUDGE_ATTR\)/
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

const forceLatestTabSource = sourceBetween(
  '  (function forceLatestTab() {',
  '  // === 本地屏蔽列表与新浪微博官方黑名单同步 ==='
);
// 微博不写 aria-selected，按它判断选中态等于"永远未选中"，脚本会每次都
// 点回「最新微博」，用户再也停不到「全部关注」。选中判定必须走共享实现。
assert.doesNotMatch(
  forceLatestTabSource,
  /getAttribute\('aria-selected'\)\s*!==\s*'true'/
);
assert.match(forceLatestTabSource, /!isTimelineTabActive\(btn\)/);
// 「全部关注」就是主页根路由，所以必须记住用户亲手点过的分栏，
// 否则路由回调会把人从「全部关注」立刻弹回「最新微博」。
assert.match(forceLatestTabSource, /userJustChoseAnotherTab\(\)/);
assert.match(forceLatestTabSource, /isTrustedUserEvent\(event\)/);
assert.match(
  forceLatestTabSource,
  /manualTabChoiceTitle !== LATEST_TITLE/
);
// 设置面板侧的分栏判定必须复用同一实现，不能再各留一份。
assert.match(
  sourceBetween(
    '  function findTimelineTab(title) {',
    '  function openNativeHomeTimeline('
  ),
  /WB_INTERNAL\.timelineTabs\.find\(title\)[\s\S]*?WB_INTERNAL\.timelineTabs\.isActive\(tab\)/
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
assert.match(saveHandlerSource, /applyPanelSettingsNow\(\)/);
assert.match(saveHandlerSource, /syncLauncherButton\(\)/);
assert.match(saveHandlerSource, /closePanel\(\{ reset: false \}\)/);
assert.match(saveHandlerSource, /reconcileHomeTimelineSetting\(/);
assert.equal((source.match(/location\.reload\s*\(/g) || []).length, 1);
// 侧栏恢复必须完全交回微博原生布局：脚本不得再保留任何自有的轨道占位、
// sticky top 覆盖或热搜专用的恢复状态开关。
assert.doesNotMatch(
  source,
  /HOT_SEARCH_SIDEBAR_RESTORE_SPACING_ATTR|HOT_SEARCH_SIDEBAR_AUTO_HEIGHT_ATTR|data-__wb_hot_search_sidebar_(?:restore_spacing|native_bottom_gap|auto_height)/
);
assert.doesNotMatch(
  source,
  /--wb-pynseq-sidebar-restore-space|--wb-pynseq-sidebar-sticky-top|hotSearchSidebarRestoreSpacingActive|restoredHotSearch/
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
// 侧栏隐藏/恢复只保留标记属性配合样式表，样式里不得再出现脚本自造的占位。
assert.doesNotMatch(
  sourceBetween('  function ensureStyles() {', '  function githubIconMarkup() {'),
  /\.wbpro-side-copy::before|--wb-pynseq-sidebar/
);

// 微博右侧轨道由微博自身的 MutationObserver（childList/characterData/subtree）
// 重新计算高度，属性变化不会触发它。脚本改变卡片可见性后必须制造一次真实的
// childList 变化，把重排交回原生逻辑，而不是自行改写 top / 占位高度。
const sidebarVisibilitySource = sourceBetween(
  '  function markPanelHidden(panel) {',
  '  function hideSearchRelatedUsersPanel('
);
assert.match(sidebarVisibilitySource, /sidebarVisibilityDirty = true/);
assert.match(
  sidebarVisibilitySource,
  /function nudgeNativeSidebarObserver\(\)[\s\S]*?document\.createComment\('wb-pynseq-relayout'\)/
);
assert.match(
  sidebarVisibilitySource,
  /rail\.appendChild\(marker\);\s*\n\s*marker\.remove\(\);/
);
assert.match(
  sidebarVisibilitySource,
  /function flushSidebarVisibilityChanges\(\)[\s\S]*?if \(!sidebarVisibilityDirty\) return;[\s\S]*?requestNativeSidebarRelayout\(\)/
);
assert.doesNotMatch(
  sidebarVisibilitySource,
  /dispatchEvent|\.style\.(?:setProperty|removeProperty|top|height)/
);
assert.match(
  sourceBetween('  function hidePanels(', '  function restoreManagedPanels()'),
  /hideSearchHotBand\(root\);\s*\n\s*markSidebarLeadGap\(\);\s*\n\s*flushSidebarVisibilityChanges\(\);/
);

// 微博把侧栏首个模块渲染成没有上外边距的卡片。脚本隐藏靠前的模块后，后一个
// 模块的上外边距会向上塌陷成整条轨道的前导空白，首个可见模块比左侧主列低
// 几个像素。只在确实由脚本隐藏时清零那一段塌陷出来的外边距。
const leadGapSource = sourceBetween(
  '  function markSidebarLeadGap() {',
  '  // 微博右侧轨道的高度由微博自身的 MutationObserver 负责'
);
assert.match(leadGapSource, /querySelectorAll\('\.wbpro-side-main'\)/);
assert.match(leadGapSource, /if \(firstVisibleIndex <= 0\) return;/);
assert.match(leadGapSource, /if \(!hiddenByUserscript\) return;/);
assert.match(
  leadGapSource,
  /borderTopWidth[\s\S]*?paddingTop[\s\S]*?\)\s*\{\s*\n\s*return;/,
  'must stop walking once the margin can no longer collapse upward'
);
assert.match(leadGapSource, /cur = cur\.firstElementChild;/);
assert.match(leadGapSource, /setAttribute\(SIDEBAR_LEAD_GAP_ATTR, '1'\)/);
assert.match(leadGapSource, /removeAttribute\(SIDEBAR_LEAD_GAP_ATTR\)/);
assert.doesNotMatch(leadGapSource, /\.style\./);
assert.match(
  sourceBetween('  function ensureStyles() {', '  function githubIconMarkup() {'),
  /\[\$\{SIDEBAR_LEAD_GAP_ATTR\}="1"\]\{margin-top:0!important\}/
);

// 搜索页右栏 #pl_right_side 是 #hot-band-container 的直接父节点，父级选择器
// 会连带隐藏创作者中心和帮助中心整条右栏。
const runtimeCSSRules = sourceBetween(
  '  function generateCSSRules() {',
  '  function injectCSSWhenReady('
);
assert.doesNotMatch(runtimeCSSRules, /div:has\(>\s*[.#]hot-band/);
// 微博构建产物里的哈希类名会随版本变化，不得写死。
assert.doesNotMatch(runtimeCSSRules, /Links_box_[A-Za-z0-9]+/);
assert.match(runtimeCSSRules, /div\[role="link"\]\[title="全部关注"\]/);
const applyPanelSettingsSource = sourceBetween(
  '  function applyPanelSettingsNow() {',
  '  function queuePanelRefresh('
);
assert.match(
  applyPanelSettingsSource,
  /restoreManagedPanels\(\);[\s\S]*?hidePanels\(document\);/
);
// 恢复与隐藏都必须经过带脏标记的统一入口，避免漏掉原生重排通知。
assert.match(
  sourceBetween('  function restoreManagedPanels()', '  function applyPanelSettingsNow'),
  /unmarkPanelHidden\(panel\)/
);

// 虚拟列表里的广告必须与被屏蔽微博使用同一套 1px 测量壳，否则 DynamicScroller
// 会忽略 0 高度并沿用旧行高，留下大片空白。
const runtimeCSSSource = sourceBetween(
  '  function generateCSSRules() {',
  '  function injectCSSWhenReady('
);
assert.match(
  runtimeCSSSource,
  /vue-recycle-scroller__item-view"\] > \$\{HIDDEN_AD_SELECTOR\}/
);
// 回收壳上的广告标记必须重新验证，否则复用后的正常微博会继续被隐藏。
const recycledAdSource = sourceBetween(
  '  function restoreRecycledVirtualAdShells(scope) {',
  '  function restoreRecycledVirtualContentShells('
);
assert.match(recycledAdSource, /node\.closest\(VIRTUAL_VIEW_SELECTOR\)/);
assert.match(
  recycledAdSource,
  /if \(!stillLooksLikeRecognizedAd\(node\)\)[\s\S]*?node\.removeAttribute\(HIDDEN_AD_ATTR\)/
);
assert.match(
  sourceBetween(
    '  function restoreRecycledVirtualContentShells(',
    '  function hideBlockedDOMPosts('
  ),
  /restoreRecycledVirtualAdShells\(scope\);/
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
// 微博的分栏节点上没有 aria-selected / aria-current，选中态只体现为带构建
// 哈希的类名（例如 _cur_118ye_33）。替身必须还原这一点，否则"永远判成未
// 选中、于是反复点回最新微博"的回归会再次溜过去。
const SELECTED_TAB_CLASS = '_cur_118ye_33';
class FakeTimelineTab {
  constructor(title) {
    this.title = title;
    this.clicks = 0;
    this.classList = ['woo-box-flex', 'woo-box-alignCenter', '_main_118ye_2'];
  }
  get selected() {
    return this.classList.includes(SELECTED_TAB_CLASS);
  }
  set selected(value) {
    const index = this.classList.indexOf(SELECTED_TAB_CLASS);
    if (value && index === -1) this.classList.push(SELECTED_TAB_CLASS);
    if (!value && index !== -1) this.classList.splice(index, 1);
  }
  click() {
    this.clicks++;
    this.selected = true;
  }
  getAttribute(name) {
    if (name === 'title') return this.title;
    return null;
  }
}
const allFollowingTimelineTab = new FakeTimelineTab('全部关注');
const latestTimelineTab = new FakeTimelineTab('最新微博');
const fakeTimelineDocument = {
  querySelector(selector) {
    if (selector.includes('全部关注')) return allFollowingTimelineTab;
    if (selector.includes('最新微博')) return latestTimelineTab;
    return null;
  },
};
// 用脚本里真正的实现构造 WB_INTERNAL.timelineTabs，保证设置面板与默认分栏
// 逻辑共用同一套判定。
const timelineTabHelperContext = vm.createContext({
  HTMLElement: FakeTimelineTab,
  document: fakeTimelineDocument,
});
vm.runInContext(
  `${sourceBetween(
    '  function findTimelineTabElement(title) {',
    '  WB_INTERNAL.timelineTabs = Object.freeze({'
  )}
  globalThis.tabsAPI = { find: findTimelineTabElement, isActive: isTimelineTabActive };`,
  timelineTabHelperContext
);
const timelineTabsAPI = timelineTabHelperContext.tabsAPI;
assert.equal(timelineTabsAPI.isActive(latestTimelineTab), false);
latestTimelineTab.selected = true;
assert.equal(
  timelineTabsAPI.isActive(latestTimelineTab),
  true,
  'selection must be detected from the hashed _cur_ class, not aria-selected'
);
latestTimelineTab.selected = false;
assert.equal(timelineTabsAPI.isActive(null), false);
assert.equal(timelineTabsAPI.find('最新微博'), latestTimelineTab);
const timelineAssignments = [];
const timelineContext = vm.createContext({
  WB_INTERNAL: { dom: { schedule() {} }, timelineTabs: timelineTabsAPI },
  HTMLElement: FakeTimelineTab,
  document: fakeTimelineDocument,
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
assert.match(hotBandSource, /markPanelHidden\((?:side|target)\)/);
assert.match(source, /const PANEL_HIDDEN_ATTR = 'data-__wb_hidden_by_userscript'/);

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
