const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = { config: null, skills: [], selectedReply: '', selectedOutput: '', alwaysOnTop: false, compact: false, autoCapture: false, autoRecognizing: false, captureMode: 'manual' };

function toast(message, kind = '') {
  const node = $('#toast');
  node.textContent = message;
  node.className = `toast show ${kind}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.className = 'toast'; }, 3200);
}

function setBadge(text, kind = '') {
  const node = $('#outputBadge');
  node.textContent = text;
  node.className = `badge ${kind}`;
}

function setServiceStatus(config) {
  const provider = config?.providers?.[config.activeProvider];
  const ready = Boolean(provider?.keyConfigured);
  $('#serviceDot').className = `status-dot ${ready ? '' : 'muted'}`;
  $('#serviceStatus').textContent = ready ? `已配置：${provider.name}` : '未连接模型';
}

function skillLabel(name) {
  if (!name) return '未选择';
  const skill = state.skills.find((item) => item.name === name);
  return skill ? skill.name : `${name}（未导入）`;
}

function renderModeSelect() {
  const select = $('#modeSelect');
  if (!select) return;
  const modes = state.config?.modes || [];
  select.innerHTML = modes.map((mode) => `<option value="${escapeHtml(mode.id)}">${escapeHtml(mode.name)}</option>`).join('');
  select.value = state.config?.activeModeId || modes[0]?.id || '';
  const active = modes.find((mode) => mode.id === select.value) || modes[0];
  if (active) $('#modeSummary').textContent = `主：${skillLabel(active.primarySkill)} · 辅：${skillLabel(active.secondarySkill)}`;
}

function renderModeManagement() {
  const node = $('#modeList');
  if (!node) return;
  const modes = state.config?.modes || [];
  if (!modes.length) { node.innerHTML = '<div class="empty-replies">还没有沟通模式。</div>'; return; }
  const options = (selected, allowEmpty = true) => `${allowEmpty ? '<option value="">不使用</option>' : ''}${state.skills.map((skill) => `<option value="${escapeHtml(skill.name)}" ${skill.name === selected ? 'selected' : ''}>${escapeHtml(skill.name)}</option>`).join('')}`;
  node.innerHTML = modes.map((mode) => `<article class="mode-card ${mode.id === state.config.activeModeId ? 'active' : ''}" data-mode-id="${escapeHtml(mode.id)}"><div><h3>${escapeHtml(mode.name)}</h3><p>${escapeHtml(mode.description || '自定义沟通模式。')}</p></div><label>主 Skill<select class="mode-primary">${options(mode.primarySkill, false)}</select></label><label>辅助 Skill<select class="mode-secondary">${options(mode.secondarySkill)}</select></label><button type="button" class="outline-btn mode-save">保存</button></article>`).join('');
  node.querySelectorAll('.mode-save').forEach((button) => button.addEventListener('click', () => saveMode(button.closest('.mode-card'))));
}

async function saveMode(card) {
  if (!card) return;
  const modeId = card.dataset.modeId;
  const modes = (state.config?.modes || []).map((mode) => mode.id === modeId
    ? { ...mode, primarySkill: card.querySelector('.mode-primary').value, secondarySkill: card.querySelector('.mode-secondary').value }
    : mode);
  try {
    state.config = await window.assistantApi.saveModes({ modes, activeModeId: state.config.activeModeId });
    renderModeSelect();
    renderModeManagement();
    toast('沟通模式已保存');
  } catch (error) { toast(error.message || '保存模式失败', 'error'); }
}

function showView(name) {
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === name));
  $$('.view').forEach((view) => view.classList.remove('active-view'));
  $(`#view${name[0].toUpperCase()}${name.slice(1)}`).classList.add('active-view');
  if (name === 'skills') loadSkills();
}

function updateCount() { $('#charCount').textContent = `${$('#sourceText').value.length} 字`; }

function localIntent(text) {
  const source = text.toLowerCase();
  const rules = [
    [/price|报价|价格|cost|quote|discount|折扣/, '询价 / 议价'],
    [/ship|delivery|交期|发货|多久|lead time/, '交期 / 发货'],
    [/refund|refund|质量|broken|damaged|投诉|赔偿/, '售后 / 风险'],
    [/sample|样品|规格|size|material|材质/, '样品 / 规格确认']
  ];
  const match = rules.find(([regex]) => regex.test(source));
  return { intent: match?.[1] || '一般沟通', risk: /urgent|asap|退款|赔偿|complaint|投诉/.test(source) ? '需要谨慎确认' : '低风险' };
}

function setSelectedOutput(value) {
  state.selectedOutput = value || '';
  $('#btnCopy').disabled = !state.selectedOutput;
}

function setAutoCaptureUi(enabled, sourceName = '') {
  state.autoCapture = enabled;
  const button = $('#btnAutoCapture');
  button.classList.toggle('active', enabled);
  button.querySelector('strong').textContent = enabled ? '自动识别中' : '自动识别';
  button.querySelector('small').textContent = enabled ? `监控：${sourceName || '聊天窗口'}` : '选择聊天窗口后自动检测变化';
  button.querySelector('b').textContent = enabled ? '■' : '→';
  if (enabled) setBadge('自动识别中', 'ready');
}

function applyJudgment(judgment) {
  if (!judgment || judgment.status !== 'ok') return false;
  if (judgment.intent) $('#intentOutput').textContent = judgment.intent;
  if (judgment.risk) $('#riskOutput').textContent = judgment.risk;
  return true;
}

function renderReplies(content) {
  let parsed;
  try { parsed = JSON.parse(content); } catch { parsed = null; }
  const replies = parsed && typeof parsed === 'object'
    ? [['简短版', parsed.short], ['正式版', parsed.formal], ['谈判版', parsed.negotiation]].filter(([, value]) => value)
    : content.split(/\n+/).map((line) => line.replace(/^[-*\d.、) ]+/, '').trim()).filter(Boolean).slice(0, 3).map((line, index) => [[`建议 ${index + 1}`], line]).map(([label, value]) => [label[0], value]);
  const list = $('#replyList');
  list.innerHTML = '';
  if (!replies.length) { list.innerHTML = '<div class="empty-replies">模型没有返回可用回复。</div>'; return; }
  replies.forEach(([label, value], index) => {
    const card = document.createElement('article');
    card.className = `reply-card ${index === 0 ? 'selected' : ''}`;
    card.innerHTML = `<div class="reply-card-header"><span>${label}</span><button type="button">复制</button></div><div class="reply-card-text"></div>`;
    card.querySelector('.reply-card-text').textContent = value;
    card.addEventListener('click', (event) => {
      if (event.target.tagName === 'BUTTON') return;
      $$('.reply-card').forEach((item) => item.classList.remove('selected'));
      card.classList.add('selected');
      setSelectedOutput(value);
    });
    card.querySelector('button').addEventListener('click', async () => { await window.assistantApi.writeClipboard(value); toast('已复制这条回复'); });
    list.appendChild(card);
    if (index === 0) setSelectedOutput(value);
  });
}

async function openCapturePicker(mode = 'manual') {
  state.captureMode = mode;
  $('#captureTitle').textContent = mode === 'auto' ? '选择要自动识别的窗口' : '选择需要识别的窗口';
  $('#captureHelp').textContent = mode === 'auto'
    ? '只监控你选定的窗口；检测到画面变化后才会调用视觉模型，不会保存截图。'
    : '只在你点击窗口后读取当前画面，截图仅用于本次识别，不会自动保存。';
  const sources = await window.assistantApi.getCaptureSources();
  if (!sources.length) { toast('没有找到可捕获的窗口。', 'error'); return; }
  renderCaptureSources(sources);
  $('#captureModal').classList.remove('hidden');
}

async function captureClipboard() {
  const text = await window.assistantApi.readClipboard();
  if (!text.trim()) {
    try { await openCapturePicker('manual'); } catch (error) { toast(error.message || '读取窗口失败', 'error'); }
    return;
  }
  $('#sourceText').value = text.trim();
  updateCount();
  const result = localIntent(text);
  $('#intentOutput').textContent = result.intent;
  $('#riskOutput').textContent = result.risk;
  setBadge('已识别', 'ready');
  toast('已读取剪贴板中的聊天内容');
}

function renderCaptureSources(sources) {
  const list = $('#captureSourceList');
  list.innerHTML = '';
  sources.forEach((source) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'capture-source';
    button.innerHTML = `<img alt="" src="${source.thumbnail}"><span>${escapeHtml(source.name)}</span>`;
    button.addEventListener('click', () => state.captureMode === 'auto' ? startAutoCapture(source) : recognizeScreenshot(source));
    list.appendChild(button);
  });
}

async function startAutoCapture(source) {
  $('#captureModal').classList.add('hidden');
  setAutoCaptureUi(true, source.name);
  try {
    const result = await window.assistantApi.startAutoCapture({ id: source.id, name: source.name });
    setAutoCaptureUi(true, result.sourceName || source.name);
    toast(`已开始自动识别：${result.sourceName || source.name}`);
  } catch (error) { setAutoCaptureUi(false); toast(error.message || '启动自动识别失败', 'error'); }
}

async function stopAutoCapture() {
  await window.assistantApi.stopAutoCapture();
  setAutoCaptureUi(false);
  setBadge('等待内容');
  toast('已停止自动识别');
}

async function recognizeAutoFrame(payload) {
  if (!state.autoCapture || state.autoRecognizing || !payload?.imageData) return;
  state.autoRecognizing = true;
  setBadge('自动识别…');
  try {
    const result = await window.assistantApi.complete({ operation: 'vision', imageData: payload.imageData });
    const text = result.content.trim();
    if (text) {
      $('#sourceText').value = text;
      updateCount();
      const intent = localIntent(text);
      $('#intentOutput').textContent = intent.intent;
      $('#riskOutput').textContent = intent.risk;
      toast(`已自动识别${payload.sourceName ? `：${payload.sourceName}` : ''}`);
    }
    setBadge('自动识别中', 'ready');
  } catch (error) {
    setBadge('自动识别失败', 'error');
    toast(error.message || '自动识别失败，请确认视觉模型和 API Key。', 'error');
  } finally { state.autoRecognizing = false; }
}

async function recognizeScreenshot(source) {
  $('#captureModal').classList.add('hidden');
  setBadge('识别截图…');
  try {
    const result = await window.assistantApi.complete({ operation: 'vision', imageData: source.thumbnail });
    $('#sourceText').value = result.content.trim();
    updateCount();
    const intent = localIntent(result.content);
    $('#intentOutput').textContent = intent.intent;
    $('#riskOutput').textContent = intent.risk;
    setBadge('截图已识别', 'ready');
    toast('已识别截图文字；现在可以继续翻译或生成回复');
  } catch (error) { setBadge('需要视觉模型', 'error'); toast(error.message || '截图识别失败，请确认模型支持图片输入。', 'error'); }
}

async function complete(operation) {
  const source = $('#sourceText').value.trim();
  const draft = $('#draftText').value.trim();
  const text = operation === 'optimize' ? draft : source;
  if (!text) { toast(operation === 'optimize' ? '请先填写回复草稿。' : '请先识别或粘贴聊天内容。', 'error'); return; }
  setBadge('处理中…');
  try {
    const result = await window.assistantApi.complete({ operation, text, context: source, modeId: state.config?.activeModeId });
    if (operation === 'translate') {
      $('#translationOutput').textContent = result.content;
      setSelectedOutput(result.content);
    } else if (operation === 'reply') {
      renderReplies(result.content);
      applyJudgment(result.jev);
    } else if (operation === 'optimize') {
      $('#translationOutput').textContent = result.content;
      setSelectedOutput(result.content);
    }
    const usedJev = operation === 'reply' && result.jev?.status === 'ok';
    setBadge(usedJev ? '已完成 · Jev' : '已完成', 'ready');
    if (operation === 'reply' && result.jev?.status === 'unavailable') toast('回复已生成，但 Jev 当前不可用；本次未使用 Jev 判断。', 'error');
    else toast(`${operation === 'translate' ? '翻译' : operation === 'reply' ? '回复建议' : '草稿优化'}已完成`);
  } catch (error) {
    setBadge('需要配置', 'error');
    toast(error.message || '操作失败', 'error');
  }
}

async function analyze() {
  const text = $('#sourceText').value.trim();
  if (!text) { toast('请先识别或粘贴聊天内容。', 'error'); return; }
  setBadge('判断中…');
  try {
    const judgment = await window.assistantApi.judge({ text });
    if (applyJudgment(judgment)) {
      setBadge('Jev 已判断', 'ready');
      toast('已使用 Jev 完成意图和风险判断');
      return;
    }
  } catch (error) { toast(error.message || 'Jev 暂不可用，已使用本地判断', 'error'); }
  const result = localIntent(text);
  $('#intentOutput').textContent = result.intent;
  $('#riskOutput').textContent = result.risk;
  setBadge('本地已判断', 'ready');
}

async function loadConfig() {
  state.config = await window.assistantApi.getConfig();
  setServiceStatus(state.config);
  const provider = state.config.providers[state.config.activeProvider] || {};
  $('#providerName').value = provider.name || '';
  $('#providerBaseUrl').value = provider.baseUrl || '';
  $('#providerModel').value = provider.model || '';
  $('#providerEndpoint').value = provider.endpoint || '/chat/completions';
  $('#keyState').textContent = provider.keyConfigured ? '已配置' : '未配置';
  $('#keyState').className = `badge ${provider.keyConfigured ? 'ready' : ''}`;
  const jev = state.config.jev || {};
  $('#jevEnabled').checked = Boolean(jev.enabled);
  $('#jevBaseUrl').value = jev.baseUrl || 'https://api.typesafe.ai';
  $('#jevModel').value = jev.model || 'jev-latest';
  $('#jevState').textContent = jev.enabled && jev.keyConfigured ? '已启用' : jev.keyConfigured ? '已配置' : '未启用';
  $('#jevState').className = `badge ${jev.enabled && jev.keyConfigured ? 'ready' : ''}`;
  renderModeSelect();
}

async function loadSkills() {
  const list = await window.assistantApi.getSkills();
  state.skills = list;
  const node = $('#skillsList');
  node.innerHTML = list.map((skill) => `<article class="skill-card"><h3>${escapeHtml(skill.name)}</h3><p>生成回复时可作为沟通规则参考。</p><span class="skill-source">${skill.source === 'built-in' ? '内置' : '已导入'}</span></article>`).join('') || '<div class="panel empty-panel"><div class="empty-icon">▦</div><h2>还没有 Skill</h2><p>点击右上角导入一个 SKILL.md。</p></div>';
  renderModeSelect();
  renderModeManagement();
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

async function init() {
  $$('.nav-item').forEach((item) => item.addEventListener('click', () => showView(item.dataset.view)));
  $('#sourceText').addEventListener('input', updateCount);
  $('#btnCapture').addEventListener('click', captureClipboard);
  $('#btnAutoCapture').addEventListener('click', async () => { if (state.autoCapture) { await stopAutoCapture(); return; } try { await openCapturePicker('auto'); } catch (error) { toast(error.message || '读取窗口失败', 'error'); } });
  $('#btnCloseCapture').addEventListener('click', () => $('#captureModal').classList.add('hidden'));
  $('#captureModal').addEventListener('click', (event) => { if (event.target.id === 'captureModal') $('#captureModal').classList.add('hidden'); });
  $('#btnTranslate').addEventListener('click', () => complete('translate'));
  $('#btnReply').addEventListener('click', () => complete('reply'));
  $('#btnOptimize').addEventListener('click', () => complete('optimize'));
  $('#btnAnalyze').addEventListener('click', analyze);
  $('#modeSelect').addEventListener('change', async (event) => { try { state.config = await window.assistantApi.setActiveMode(event.target.value); renderModeSelect(); renderModeManagement(); toast(`已切换到：${state.config.modes.find((mode) => mode.id === state.config.activeModeId)?.name || '沟通模式'}`); } catch (error) { toast(error.message || '切换模式失败', 'error'); } });
  $('#btnManageModes').addEventListener('click', () => showView('skills'));
  $('#btnClear').addEventListener('click', () => { $('#sourceText').value = ''; $('#draftText').value = ''; $('#translationOutput').textContent = '识别聊天后，这里会显示中文翻译。'; $('#intentOutput').textContent = '尚未分析'; $('#riskOutput').textContent = '—'; $('#replyList').innerHTML = '<div class="empty-replies">点击“生成回复”，这里会出现可以直接复制的版本。</div>'; setSelectedOutput(''); setBadge('等待内容'); updateCount(); });
  $('#btnCopy').addEventListener('click', async () => { await window.assistantApi.writeClipboard(state.selectedOutput); toast('已复制选中内容'); });
  $('#btnMinimize').addEventListener('click', () => window.assistantApi.minimize());
  $('#btnMaximize').addEventListener('click', () => window.assistantApi.maximize());
  $('#btnHide').addEventListener('click', () => window.assistantApi.hide());
  $('#btnAlwaysOnTop').addEventListener('click', async () => { state.alwaysOnTop = await window.assistantApi.setAlwaysOnTop(!state.alwaysOnTop); $('#topState').classList.toggle('on', state.alwaysOnTop); toast(state.alwaysOnTop ? '已保持窗口悬浮' : '已关闭保持悬浮'); });
  $('#btnCompact').addEventListener('click', async () => { state.compact = await window.assistantApi.setCompact(!state.compact); toast(state.compact ? '已切换到小窗口模式' : '已恢复完整窗口'); });
  $('#btnImportSkill').addEventListener('click', async () => { const result = await window.assistantApi.importSkill(); if (!result.canceled) { await loadSkills(); toast(`已导入 Skill：${result.name}`); } });
  $('#btnAddMode').addEventListener('click', async () => { const name = window.prompt('请输入新的沟通模式名称：'); if (!name?.trim()) return; try { state.config = await window.assistantApi.createMode({ name: name.trim() }); renderModeSelect(); renderModeManagement(); toast(`已新增模式：${name.trim()}`); } catch (error) { toast(error.message || '新增模式失败', 'error'); } });
  $('#providerForm').addEventListener('submit', async (event) => { event.preventDefault(); const message = $('#providerMessage'); message.textContent = '正在保存…'; message.className = 'form-message'; try { state.config = await window.assistantApi.saveSettings({ id: 'primary', name: $('#providerName').value, baseUrl: $('#providerBaseUrl').value, model: $('#providerModel').value, endpoint: $('#providerEndpoint').value, apiKey: $('#providerApiKey').value }); $('#providerApiKey').value = ''; message.textContent = '配置已保存。'; message.className = 'form-message success'; setServiceStatus(state.config); $('#keyState').textContent = '已配置'; $('#keyState').className = 'badge ready'; toast('模型服务配置已保存'); } catch (error) { message.textContent = error.message || '保存失败'; message.className = 'form-message error'; } });
  $('#btnTestProvider').addEventListener('click', async () => { const message = $('#providerMessage'); message.textContent = '正在测试…'; message.className = 'form-message'; try { await window.assistantApi.complete({ operation: 'test', text: 'OK' }); message.textContent = '连接成功，模型已返回结果。'; message.className = 'form-message success'; } catch (error) { message.textContent = error.message || '连接失败'; message.className = 'form-message error'; } });
  $('#jevForm').addEventListener('submit', async (event) => { event.preventDefault(); const message = $('#jevMessage'); message.textContent = '正在保存…'; message.className = 'form-message'; try { state.config = await window.assistantApi.saveJevSettings({ enabled: $('#jevEnabled').checked, baseUrl: $('#jevBaseUrl').value, model: $('#jevModel').value, apiKey: $('#jevApiKey').value }); $('#jevApiKey').value = ''; const jev = state.config.jev || {}; $('#jevState').textContent = jev.enabled && jev.keyConfigured ? '已启用' : jev.keyConfigured ? '已配置' : '未启用'; $('#jevState').className = `badge ${jev.enabled && jev.keyConfigured ? 'ready' : ''}`; message.textContent = 'Jev 配置已保存。'; message.className = 'form-message success'; toast('Jev 判断配置已保存'); } catch (error) { message.textContent = error.message || '保存失败'; message.className = 'form-message error'; } });
  $('#btnTestJev').addEventListener('click', async () => { const message = $('#jevMessage'); message.textContent = '正在测试判断…'; message.className = 'form-message'; try { const result = await window.assistantApi.testJev(); message.textContent = `Jev 测试成功：${result.intent} / ${result.risk}`; message.className = 'form-message success'; } catch (error) { message.textContent = error.message || 'Jev 测试失败'; message.className = 'form-message error'; } });
  window.assistantApi.onAutoCaptureFrame(recognizeAutoFrame);
  window.assistantApi.onAutoCaptureStatus((payload) => {
    if (!payload?.enabled) { if (state.autoCapture) setAutoCaptureUi(false); return; }
    if (payload.status === 'target-missing') {
      setBadge('窗口未找到', 'error');
      toast(`自动识别窗口已关闭：${payload.sourceName || '目标窗口'}`, 'error');
    }
  });
  window.assistantApi.onTrayCompact(() => $('#btnCompact').click());
  const windowState = await window.assistantApi.getWindowState();
  state.alwaysOnTop = windowState.alwaysOnTop;
  state.compact = windowState.compact;
  $('#topState').classList.toggle('on', state.alwaysOnTop);
  await loadConfig();
  await loadSkills();
}

init().catch((error) => toast(error.message || '初始化失败', 'error'));
