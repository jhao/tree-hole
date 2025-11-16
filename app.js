import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import CryptoJS from 'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/+esm';

const TREE_HOLES_DATA_KEY = 'treeHolesData';
const SUPABASE_SETTINGS_KEY = 'treeHoleSupabaseSettings';
const SUPABASE_LAST_SYNC_KEY = 'treeHoleSupabaseLastSync';
const SUPABASE_TABLE_NAME = 'tree_holes_backups';
const WEBLLM_CACHE_KEY = 'treeHoleWebLLMCache';
const MAX_STORAGE_BYTES = 5 * 1024 * 1024;
const STORAGE_WARNING_THRESHOLD = 0.9;

const initialHolePositions = [
  { top: '14%', left: '50%' }, { top: '24%', left: '45%' }, { top: '30%', left: '55%' },
  { top: '40%', left: '48%' }, { top: '50%', left: '52%' }, { top: '62%', left: '44%' },
  { top: '72%', left: '56%' }, { top: '84%', left: '47%' }, { top: '96%', left: '53%' },
  { top: '110%', left: '46%' }, { top: '124%', left: '50%' }, { top: '140%', left: '54%' }
];

const comfortingPhrases = [
  '嗯嗯，我听着呢。', '别担心，我在这里陪着你。', '这样啊，听起来这一定很不容易。', '没关系，把你想说的都说出来吧。',
  '我理解你的感受。', '谢谢你愿意告诉我这些。', '继续说，我一直在听。', '你不是一个人在面对这些。',
  '给你一个温暖的拥抱。', '你已经做得很好了。', '慢慢来，不着急。', '深呼吸，一切都会好起来的。',
  '你所说的，我都记在心里。', '拍拍你的背。', '你的感受是完全合理的。', '谢谢你，让我知道你的心事。',
  '这听起来让人心疼。', '这真的不怪你。', '请给自己一些空间和时间。', '你的感受值得被认真对待。',
  '辛苦了，真的辛苦了。', '允许自己脆弱，这是一种力量。', '如果可以，试着对自己温柔一点。', '放心，你的秘密在这里是安全的。',
  '继续说，我在。', '你已经承受了太多本不该你承受的东西。', '我能理解为什么你会这么想。', '这听起来像一个很沉重的负担。',
  '无论发生什么，感受自己的情绪都是可以的。', '慢慢说，把思绪理一理。', '我知道这不容易，但你正在努力。'
];

const greetingKeywords = [
  '你好', 'hi', 'hello', '在吗', '你好呀', 'hey', '嗨', '哈喽',
  '早上好', '中午好', '下午好', '晚上好', 'good morning',
  'good afternoon', 'good evening', 'yo', "what's up",
  'how are you', '有人吗', '吃了么'
];

const greetingResponses = ['你好呀！', '嗯嗯，我在。', 'Hello!', '随时都在听你说。', '嗨！有什么想和我说的吗？'];

const emotionKeywords = {
  '悲伤': ['难过', '伤心', '哭', '不开心', '痛苦', '郁闷', '烦', '唉', '失望'],
  '高兴': ['开心', '高兴', '快乐', '哈哈', '嘻嘻', '太棒了', '好棒', '幸福', '幸运']
};

const contentTypeKeywords = {
  '工作': ['工作', '上班', '同事', '老板', '公司', '项目', '加班', '职业'],
  '学习': ['学习', '考试', '作业', '同学', '老师', '学校', '课程', '论文'],
  '感情': ['喜欢', '爱', '男朋友', '女朋友', '分手', '关系', '暗恋', '约会', 'ta'],
  '生活': ['生活', '日常', '今天', '明天', '事情', '最近', '东西', '吃饭'],
  '事件': ['发生', '遇到', '经历', '然后', '后来', '结果'],
  '心情': ['感觉', '觉得', '心情', '情绪']
};

function tripleMd5(value) {
  let hash = CryptoJS.MD5(value);
  hash = CryptoJS.MD5(hash.toString());
  hash = CryptoJS.MD5(hash.toString());
  return hash.toString();
}

function encryptWithPassword(plainText, password) {
  if (!plainText) {
    return '';
  }
  return CryptoJS.AES.encrypt(plainText, password).toString();
}

function decryptWithPassword(cipherText, password) {
  if (!cipherText) {
    return '';
  }
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || '';
  } catch (error) {
    console.error('解密失败：', error);
    return '';
  }
}

function setActiveHolePassword(holeId, password) {
  state.activePasswords[holeId] = password;
}

function getActiveHolePassword(holeId) {
  return state.activePasswords[holeId] || null;
}

function clearActiveHolePassword(holeId) {
  delete state.activePasswords[holeId];
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') {
    return null;
  }
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    return null;
  }
  return {
    mimeType: matches[1],
    data: matches[2]
  };
}

function getDecryptedMessageContent(hole, message) {
  const password = getActiveHolePassword(hole.id);
  if (!password) {
    return { text: '', imageUrl: null };
  }

  let text = '';
  if (typeof message.encryptedText === 'string' && message.encryptedText) {
    text = decryptWithPassword(message.encryptedText, password);
  } else if (typeof message.text === 'string') {
    text = message.text;
  }

  let imageUrl = null;
  if (typeof message.encryptedImage === 'string' && message.encryptedImage) {
    const decrypted = decryptWithPassword(message.encryptedImage, password);
    if (decrypted) {
      try {
        const payload = JSON.parse(decrypted);
        if (payload && payload.data) {
          const mimeType = payload.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${payload.data}`;
        }
      } catch (error) {
        console.error('解析解密后的图片数据失败：', error);
      }
    }
  } else if (typeof message.imageUrl === 'string') {
    imageUrl = message.imageUrl;
  }

  return { text, imageUrl };
}

function migrateHoleMessagesToEncrypted(hole, password) {
  if (!hole || !Array.isArray(hole.messages) || !password) {
    return false;
  }
  let updated = false;
  hole.messages.forEach(message => {
    if (typeof message.text === 'string' && message.text && !message.encryptedText) {
      message.encryptedText = encryptWithPassword(message.text, password);
      delete message.text;
      updated = true;
    }
    if (typeof message.imageUrl === 'string' && message.imageUrl && !message.encryptedImage) {
      const parsed = parseDataUrl(message.imageUrl);
      if (parsed) {
        const payload = JSON.stringify({ data: parsed.data, mimeType: parsed.mimeType });
        message.encryptedImage = encryptWithPassword(payload, password);
        delete message.imageUrl;
        updated = true;
      }
    }
  });
  return updated;
}

const state = {
  treeHoles: [],
  activeHoleId: null,
  activeView: 'chat',
  passwordModal: null,
  storageUsage: 0,
  isLoading: false,
  searchTerm: '',
  emotionFilter: 'all',
  contentTypeFilter: 'all',
  selectedMessageIds: new Set(),
  editingName: '',
  inputText: '',
  inputImageFile: null,
  inputImagePreview: null,
  cloud: {
    client: null,
    config: { url: '', anonKey: '' },
    session: null,
    isSyncing: false,
    lastSyncedAt: null,
    remoteSnapshot: null,
    statusMessage: '',
    errorMessage: '',
    promptedForStorage: false
  },
  cloudModal: null,
  activePasswords: {},
  llm: {
    mode: 'webllm',
    loading: false,
    progress: 100,
    ready: true,
    lastClearedAt: null,
    lastInvocationAt: null
  },
  autoScrollEnabled: true,
  modelDialogOpen: false
};

const root = document.getElementById('root');
const modalRoot = document.getElementById('modal-root');

let lastTouchEnd = 0;
let cloudSyncTimeoutId = null;
let skipNextCloudSync = false;
let cloudAuthSubscription = null;
let webLlmLoadingTimer = null;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  const allowRapidTap = event.target && event.target.closest('[data-allow-rapid-tap]');
  if (now - lastTouchEnd <= 300 && !allowRapidTap) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener('gesturestart', (event) => {
  event.preventDefault();
}, false);

function loadSupabaseSettings() {
  try {
    const stored = localStorage.getItem(SUPABASE_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        state.cloud.config.url = typeof parsed.url === 'string' ? parsed.url : '';
        state.cloud.config.anonKey = typeof parsed.anonKey === 'string' ? parsed.anonKey : '';
      }
    }
    const lastSync = localStorage.getItem(SUPABASE_LAST_SYNC_KEY);
    if (lastSync) {
      const timestamp = Number(lastSync);
      if (!Number.isNaN(timestamp)) {
        state.cloud.lastSyncedAt = timestamp;
      }
    }
  } catch (error) {
    console.error('加载 Supabase 配置失败：', error);
  }
}

function loadModelState() {
  try {
    const cached = localStorage.getItem(WEBLLM_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        state.llm.mode = parsed.mode === 'webllm' ? 'webllm' : 'classic';
        state.llm.ready = parsed.ready !== undefined ? Boolean(parsed.ready) : true;
        state.llm.progress = Number(parsed.progress) || (state.llm.ready ? 100 : 0);
        state.llm.loading = Boolean(parsed.loading);
        state.llm.lastClearedAt = parsed.lastClearedAt || null;
        state.llm.lastInvocationAt = parsed.lastInvocationAt || null;
        if (state.llm.ready && state.llm.progress < 100) {
          state.llm.progress = 100;
        }
      }
    }
  } catch (error) {
    console.error('加载模型配置失败：', error);
  }
}

function persistModelState() {
  try {
    localStorage.setItem(WEBLLM_CACHE_KEY, JSON.stringify({
      mode: state.llm.mode,
      loading: state.llm.loading,
      progress: state.llm.progress,
      ready: state.llm.ready,
      lastClearedAt: state.llm.lastClearedAt,
      lastInvocationAt: state.llm.lastInvocationAt
    }));
  } catch (error) {
    console.error('保存模型配置失败：', error);
  }
}

function resetWebLlmProgress() {
  if (webLlmLoadingTimer) {
    clearInterval(webLlmLoadingTimer);
    webLlmLoadingTimer = null;
  }
  state.llm.loading = false;
  state.llm.ready = false;
  state.llm.progress = 0;
}

function clearWebLlmCache() {
  resetWebLlmProgress();
  state.llm.mode = 'classic';
  state.llm.lastClearedAt = Date.now();
  try {
    localStorage.removeItem(WEBLLM_CACHE_KEY);
  } catch (error) {
    console.warn('移除 WebLLM 缓存失败：', error);
  }
  render();
}

function startWebLlmLoading() {
  if (state.llm.ready) return;
  state.llm.loading = true;
  state.llm.progress = Math.max(state.llm.progress, 5);
  persistModelState();

  if (webLlmLoadingTimer) {
    clearInterval(webLlmLoadingTimer);
  }

  webLlmLoadingTimer = setInterval(() => {
    if (state.llm.progress >= 100) {
      state.llm.ready = true;
      state.llm.loading = false;
      clearInterval(webLlmLoadingTimer);
      webLlmLoadingTimer = null;
      persistModelState();
      render();
      return;
    }
    const increment = Math.max(2, Math.round(Math.random() * 8));
    state.llm.progress = Math.min(100, state.llm.progress + increment);
    persistModelState();
    render();
  }, 800);
}

function setModelMode(mode) {
  if (mode !== 'classic' && mode !== 'webllm') return;
  state.llm.mode = mode;
  if (mode === 'webllm' && !state.llm.ready) {
    startWebLlmLoading();
  }
  persistModelState();
  render();
}

function openModelDialog() {
  state.modelDialogOpen = true;
  renderModals();
}

function closeModelDialog() {
  state.modelDialogOpen = false;
  renderModals();
}

function ensureWebLlmReadyForReply() {
  if (state.llm.ready) {
    return;
  }
  state.llm.loading = false;
  state.llm.ready = true;
  state.llm.progress = 100;
  persistModelState();
}

function persistSupabaseConfig() {
  try {
    localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(state.cloud.config));
  } catch (error) {
    console.error('保存 Supabase 配置失败：', error);
  }
}

function setSupabaseConfig(url, anonKey) {
  state.cloud.config = { url, anonKey };
  persistSupabaseConfig();
}

function setCloudSession(session) {
  state.cloud.session = session;
  if (!session) {
    state.cloud.remoteSnapshot = null;
    state.cloud.statusMessage = '';
    state.cloud.errorMessage = '';
  }
}

function getSupabaseErrorMessage(error) {
  if (!error) return '未知错误';
  if (error.code === '42P01') {
    return `未找到名为 ${SUPABASE_TABLE_NAME} 的表，请先在 Supabase 中创建它。`;
  }
  if (error.message) {
    return error.message;
  }
  return '请求失败，请稍后再试。';
}

async function initSupabaseClient() {
  const { url, anonKey } = state.cloud.config;
  if (!url || !anonKey) {
    state.cloud.client = null;
    setCloudSession(null);
    return;
  }

  state.cloud.errorMessage = '';
  state.cloud.statusMessage = '';

  try {
    state.cloud.client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  } catch (error) {
    console.error('初始化 Supabase 客户端失败：', error);
    state.cloud.errorMessage = '无法初始化 Supabase 客户端，请检查配置。';
    renderModals();
    return;
  }

  try {
    const { data, error } = await state.cloud.client.auth.getSession();
    if (error) {
      throw error;
    }
    setCloudSession(data.session);
  } catch (error) {
    console.error('获取 Supabase 会话失败：', error);
    state.cloud.errorMessage = getSupabaseErrorMessage(error);
    renderModals();
  }

  if (cloudAuthSubscription) {
    try {
      cloudAuthSubscription.unsubscribe();
    } catch (error) {
      console.warn('取消之前的 Supabase 监听器失败：', error);
    }
    cloudAuthSubscription = null;
  }

  const { data: authListener } = state.cloud.client.auth.onAuthStateChange(async (_event, session) => {
    setCloudSession(session);
    if (session) {
      await fetchCloudSnapshot();
    } else {
      state.cloud.lastSyncedAt = null;
      localStorage.removeItem(SUPABASE_LAST_SYNC_KEY);
    }
    render();
    renderModals();
  });
  cloudAuthSubscription = authListener?.subscription || null;

  if (state.cloud.session) {
    await fetchCloudSnapshot();
  }
}

async function fetchCloudSnapshot() {
  if (!state.cloud.client || !state.cloud.session) {
    return null;
  }

  try {
    const { data, error } = await state.cloud.client
      .from(SUPABASE_TABLE_NAME)
      .select('data, updated_at')
      .eq('user_id', state.cloud.session.user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      state.cloud.remoteSnapshot = null;
      state.cloud.errorMessage = '';
      return null;
    }

    state.cloud.remoteSnapshot = {
      data: data.data,
      updatedAt: data.updated_at
    };
    state.cloud.errorMessage = '';
    return state.cloud.remoteSnapshot;
  } catch (error) {
    console.error('获取云端数据失败：', error);
    state.cloud.errorMessage = getSupabaseErrorMessage(error);
    return null;
  }
}

function scheduleCloudSync(immediate = false) {
  if (!state.cloud.client || !state.cloud.session) {
    return;
  }
  if (skipNextCloudSync) {
    skipNextCloudSync = false;
    return;
  }
  if (cloudSyncTimeoutId) {
    clearTimeout(cloudSyncTimeoutId);
  }
  cloudSyncTimeoutId = setTimeout(() => {
    uploadTreeHolesToCloud({ manual: false }).catch(error => {
      console.error('自动同步到云端失败：', error);
    });
    cloudSyncTimeoutId = null;
  }, immediate ? 0 : 1200);
}

async function uploadTreeHolesToCloud({ manual } = { manual: true }) {
  if (!state.cloud.client || !state.cloud.session) {
    return;
  }

  if (state.cloud.isSyncing && !manual) {
    return;
  }

  state.cloud.isSyncing = true;
  state.cloud.statusMessage = manual ? '正在备份到云端...' : '正在自动备份到云端...';
  state.cloud.errorMessage = '';
  renderModals();

  try {
    const payload = {
      user_id: state.cloud.session.user.id,
      data: state.treeHoles
    };

    const { error } = await state.cloud.client
      .from(SUPABASE_TABLE_NAME)
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      throw error;
    }

    state.cloud.lastSyncedAt = Date.now();
    localStorage.setItem(SUPABASE_LAST_SYNC_KEY, String(state.cloud.lastSyncedAt));
    state.cloud.statusMessage = manual ? '已完成备份。' : '已自动同步到云端。';
    state.cloud.remoteSnapshot = {
      data: JSON.parse(JSON.stringify(state.treeHoles)),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('上传至云端失败：', error);
    state.cloud.errorMessage = getSupabaseErrorMessage(error);
    state.cloud.statusMessage = '';
  } finally {
    state.cloud.isSyncing = false;
    renderModals();
  }
}

async function downloadTreeHolesFromCloud() {
  if (!state.cloud.client || !state.cloud.session) {
    return;
  }

  state.cloud.isSyncing = true;
  state.cloud.statusMessage = '正在从云端恢复数据...';
  state.cloud.errorMessage = '';
  renderModals();

  try {
    const snapshot = await fetchCloudSnapshot();
    if (!snapshot || !Array.isArray(snapshot.data)) {
      state.cloud.statusMessage = '云端暂无备份。';
      return;
    }

    skipNextCloudSync = true;
    state.treeHoles = snapshot.data;
    saveTreeHoles();
    state.cloud.statusMessage = '已从云端恢复到本地。';
  } catch (error) {
    console.error('从云端恢复失败：', error);
    state.cloud.errorMessage = getSupabaseErrorMessage(error);
    state.cloud.statusMessage = '';
  } finally {
    state.cloud.isSyncing = false;
    render();
    renderModals();
  }
}

async function signOutFromCloud() {
  if (!state.cloud.client) {
    return;
  }
  try {
    await state.cloud.client.auth.signOut();
  } catch (error) {
    console.error('退出 Supabase 失败：', error);
    state.cloud.errorMessage = getSupabaseErrorMessage(error);
  } finally {
    setCloudSession(null);
    state.cloud.lastSyncedAt = null;
    localStorage.removeItem(SUPABASE_LAST_SYNC_KEY);
    render();
    renderModals();
  }
}

function openCloudModal(options = {}) {
  const authMode = options.authMode
    ? options.authMode
    : (state.cloud.session ? 'dashboard' : 'signIn');
  state.cloudModal = {
    open: true,
    authMode,
    email: '',
    password: '',
    confirmPassword: '',
    configUrl: state.cloud.config.url,
    configAnonKey: state.cloud.config.anonKey,
    message: options.message || '',
    error: '',
    isSubmitting: false,
    isSavingConfig: false
  };
  renderModals();
}

function closeCloudModal() {
  state.cloudModal = null;
  renderModals();
}

function loadTreeHoles() {
  try {
    const storedData = localStorage.getItem(TREE_HOLES_DATA_KEY);
    if (storedData) {
      state.treeHoles = JSON.parse(storedData);
      state.treeHoles.forEach((hole, index) => {
        if (typeof hole.createdAt !== 'number') {
          hole.createdAt = 0;
        }
        if (!hole.position && initialHolePositions[index]) {
          hole.position = initialHolePositions[index];
        }
      });
    } else {
      state.treeHoles = initialHolePositions.map((position, index) => ({
        id: `hole-${index}`,
        name: '',
        passwordHash: '',
        messages: [],
        position,
        createdAt: 0
      }));
      saveTreeHoles();
    }
  } catch (error) {
    console.error('Failed to load tree holes:', error);
    state.treeHoles = [];
  }
  updateStorageUsage();
}

function saveTreeHoles() {
  try {
    const sanitizedTreeHoles = state.treeHoles.map(hole => {
      const sanitizedMessages = Array.isArray(hole.messages)
        ? hole.messages.map(message => {
            const { decryptedText, decryptedImageUrl, ...rest } = message;
            const sanitizedMessage = { ...rest };
            delete sanitizedMessage.text;
            delete sanitizedMessage.imageUrl;
            return sanitizedMessage;
          })
        : [];
      return { ...hole, messages: sanitizedMessages };
    });
    localStorage.setItem(TREE_HOLES_DATA_KEY, JSON.stringify(sanitizedTreeHoles));
  } catch (error) {
    console.error('Failed to save tree holes:', error);
  }
  updateStorageUsage();
  scheduleCloudSync();
}

function updateStorageUsage() {
  try {
    const storedData = localStorage.getItem(TREE_HOLES_DATA_KEY);
    if (!storedData) {
      state.storageUsage = 0;
      state.cloud.promptedForStorage = false;
      return;
    }
    const bytes = new Blob([storedData]).size;
    state.storageUsage = Math.min(1, bytes / MAX_STORAGE_BYTES);
    if (
      state.storageUsage > STORAGE_WARNING_THRESHOLD &&
      !state.cloud.promptedForStorage &&
      !(state.cloudModal && state.cloudModal.open)
    ) {
      state.cloud.promptedForStorage = true;
      openCloudModal({ message: '本地存储空间接近上限，试试同步到云端吧。' });
    } else if (state.storageUsage < STORAGE_WARNING_THRESHOLD * 0.6) {
      state.cloud.promptedForStorage = false;
    }
  } catch (error) {
    console.error('Failed to calculate storage usage:', error);
    state.storageUsage = 0;
  }
}

function getActiveHole() {
  return state.treeHoles.find(hole => hole.id === state.activeHoleId) || null;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateYMD(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('无法读取文件'));
        return;
      }
      resolve({
        data: dataUrl.split(',')[1],
        mimeType: file.type,
        displayUrl: dataUrl
      });
    };
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

async function getComfortingReply(text, imagePayload) {
  return getWebLlmReply(text, imagePayload);
}

async function getWebLlmReply(text, imagePayload) {
  state.llm.lastInvocationAt = Date.now();
  persistModelState();
  const trimmed = text.trim();
  const greetingHit = greetingKeywords.some(keyword => trimmed.toLowerCase().includes(keyword.toLowerCase()));
  const baseGreeting = greetingHit ? greetingResponses[Math.floor(Math.random() * greetingResponses.length)] : '';
  const imageLine = imagePayload?.present ? '看到了你分享的图片，想听听它背后的故事。' : '';
  const feelingLine = trimmed
    ? '听到了你的分享，我会认真回应。'
    : '我在这里，随时准备好听你说。';
  const followUpLine = imagePayload?.present ? '想聊聊这张图片带给你的感觉吗？' : '';
  return [baseGreeting, feelingLine, imageLine, followUpLine]
    .filter(Boolean)
    .join(' ');
}

function buildCompanionReply(text, imagePayload) {
  const normalized = text.trim();
  const lowerCase = normalized.toLowerCase();
  const greetingHit = greetingKeywords.some(keyword => lowerCase.includes(keyword.toLowerCase()));
  if (greetingHit) {
    return `${greetingResponses[Math.floor(Math.random() * greetingResponses.length)]} 我在陪伴模式下倾听你。`;
  }

  const comfort = comfortingPhrases[Math.floor(Math.random() * comfortingPhrases.length)];
  if (!normalized && imagePayload?.present) {
    return '看到了你的分享，这张图片背后有什么故事吗？';
  }

  const emotionEntry = Object.entries(emotionKeywords).find(([, keywords]) =>
    keywords.some(keyword => lowerCase.includes(keyword))
  );

  if (emotionEntry) {
    const [emotion] = emotionEntry;
    return `感受到你现在有些${emotion}，${comfort}`;
  }

  return `${comfort} 如果愿意，多告诉我一些细节，我会一直听着。`;
}

async function getModelReply(text, imagePayload) {
  if (state.llm.mode === 'webllm') {
    ensureWebLlmReadyForReply();
    return getWebLlmReply(text, imagePayload);
  }
  return buildCompanionReply(text, imagePayload);
}

async function analyzeMessage(text, imagePayload) {
  const lowerCaseText = text.toLowerCase();
  let emotion = '中性';
  let contentType = '其他';

  if (imagePayload && imagePayload.present) {
    contentType = '图片';
  }

  for (const [emo, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some(keyword => lowerCaseText.includes(keyword))) {
      emotion = emo;
      break;
    }
  }

  if (contentType !== '图片') {
    for (const [type, keywords] of Object.entries(contentTypeKeywords)) {
      if (keywords.some(keyword => lowerCaseText.includes(keyword))) {
        contentType = type;
        break;
      }
    }
  }

  if (contentType === '图片' && !text.trim()) {
    emotion = '中性';
  } else if (contentType === '其他' && emotion !== '中性' && text.length < 20) {
    contentType = '心情';
  }

  return { emotion, content_type: contentType };
}

function ensurePreviewRevoked() {
  if (state.inputImagePreview) {
    URL.revokeObjectURL(state.inputImagePreview);
    state.inputImagePreview = null;
  }
}

function setActiveHole(holeId) {
  state.activeHoleId = holeId;
  state.activeView = 'chat';
  state.selectedMessageIds.clear();
  state.searchTerm = '';
  state.emotionFilter = 'all';
  state.contentTypeFilter = 'all';
  state.isLoading = false;
  state.autoScrollEnabled = true;
  ensurePreviewRevoked();
  state.inputText = '';
  state.inputImageFile = null;
  const activeHole = getActiveHole();
  state.editingName = activeHole ? activeHole.name || '' : '';
  render();
}

function exitActiveHole() {
  if (state.activeHoleId) {
    clearActiveHolePassword(state.activeHoleId);
  }
  state.activeHoleId = null;
  state.activeView = 'chat';
  state.selectedMessageIds.clear();
  state.editingName = '';
  ensurePreviewRevoked();
  state.inputText = '';
  state.inputImageFile = null;
  render();
  scheduleTrunkHeightUpdate();
}

function handleHoleClick(hole) {
  if (state.llm.mode === 'webllm' && !state.llm.ready) {
    ensureWebLlmReadyForReply();
  }
  state.passwordModal = {
    open: true,
    mode: hole.passwordHash ? 'login' : 'setup',
    holeId: hole.id,
    step: hole.passwordHash ? 1 : 1,
    pin: '',
    confirmPin: '',
    error: ''
  };
  renderModals();
}

function closePasswordModal() {
  state.passwordModal = null;
  renderModals();
}

function handlePinInput(value) {
  const modal = state.passwordModal;
  if (!modal) return;

  if (modal.mode === 'setup') {
    if (modal.step === 1 && modal.pin.length < 4) {
      modal.pin += value;
      if (modal.pin.length === 4) {
        setTimeout(() => {
          const current = state.passwordModal;
          if (current && current.holeId === modal.holeId) {
            current.step = 2;
            current.error = '';
            renderModals();
          }
        }, 180);
      }
    } else if (modal.step === 2 && modal.confirmPin.length < 4) {
      modal.confirmPin += value;
      if (modal.confirmPin.length === 4) {
        if (modal.confirmPin === modal.pin) {
          const hole = state.treeHoles.find(h => h.id === modal.holeId);
          if (hole) {
            const hashedPassword = tripleMd5(modal.confirmPin);
            hole.passwordHash = hashedPassword;
            hole.createdAt = Date.now();
            setActiveHolePassword(hole.id, modal.confirmPin);
            saveTreeHoles();
            closePasswordModal();
            setActiveHole(hole.id);
          }
        } else {
          modal.error = '两次输入的密码不匹配。';
          setTimeout(() => {
            const current = state.passwordModal;
            if (current && current.holeId === modal.holeId) {
              current.pin = '';
              current.confirmPin = '';
              current.step = 1;
              current.error = '';
              renderModals();
            }
          }, 1400);
        }
      }
    }
  } else {
    if (modal.pin.length < 4) {
      modal.pin += value;
      if (modal.pin.length === 4) {
        const hole = state.treeHoles.find(h => h.id === modal.holeId);
        if (hole) {
          const hashedInput = tripleMd5(modal.pin);
          const isLegacy = hole.passwordHash === modal.pin;
          const isMatch = hole.passwordHash === hashedInput || isLegacy;
          if (isMatch) {
            if (isLegacy) {
              hole.passwordHash = hashedInput;
            }
            const migrated = migrateHoleMessagesToEncrypted(hole, modal.pin);
            setActiveHolePassword(hole.id, modal.pin);
            if (isLegacy || migrated) {
              saveTreeHoles();
            }
            closePasswordModal();
            setActiveHole(hole.id);
          } else {
            modal.error = '密码错误，请重试。';
            setTimeout(() => {
              const current = state.passwordModal;
              if (current && current.holeId === modal.holeId) {
                current.pin = '';
                current.error = '';
                renderModals();
              }
            }, 1400);
          }
        }
      }
    }
  }
  renderModals();
}

function handlePinDelete() {
  const modal = state.passwordModal;
  if (!modal) return;
  if (modal.mode === 'setup') {
    if (modal.step === 2 && modal.confirmPin) {
      modal.confirmPin = modal.confirmPin.slice(0, -1);
    } else if (modal.step === 1 && modal.pin) {
      modal.pin = modal.pin.slice(0, -1);
    }
  } else if (modal.pin) {
    modal.pin = modal.pin.slice(0, -1);
  }
  renderModals();
}

function resetHole(holeId) {
  const hole = state.treeHoles.find(h => h.id === holeId);
  if (!hole) return;

  const wasActive = state.activeHoleId === holeId;

  clearActiveHolePassword(holeId);

  hole.passwordHash = '';
  hole.messages = [];
  hole.name = '';
  hole.createdAt = 0;
  saveTreeHoles();

  if (wasActive) {
    exitActiveHole();
  } else {
    closePasswordModal();
    render();
  }
}

function handleHoleResetConfirmation(holeId) {
  const hole = state.treeHoles.find(h => h.id === holeId);
  if (!hole) return;
  const confirmed = confirm('警告：关闭该树洞会清空所有内容，并需要重新设置密码。确定继续吗？');
  if (!confirmed) {
    return;
  }
  resetHole(holeId);
}

function renderPasswordModal() {
  const modal = state.passwordModal;
  const hole = modal ? state.treeHoles.find(h => h.id === modal.holeId) : null;
  let container = document.getElementById('password-modal');

  if (!modal || !modal.open) {
    if (container) {
      container.remove();
    }
    return;
  }

  if (!container) {
    container = document.createElement('div');
    container.id = 'password-modal';
    container.className = 'modal-overlay';
    container.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true">
        <h2 class="modal-title" data-role="title"></h2>
        <p class="modal-subtitle" data-role="subtitle"></p>
        <div class="pin-dots" data-role="dots">
          ${[...Array(4)].map((_, index) => `<div class="pin-dot" data-pin-dot="${index}"></div>`).join('')}
        </div>
        <div class="error-text" data-role="error"></div>
        <div class="keypad" data-role="keypad" data-allow-rapid-tap>
          ${['1','2','3','4','5','6','7','8','9','','0','⌫'].map(key => {
            if (key === '') {
              return '<span></span>';
            }
            return `<button type="button" data-key="${key}">${key}</button>`;
          }).join('')}
        </div>
        <button type="button" class="modal-danger-link" data-action="reset-hole">关闭该树洞，清空里面所有内容</button>
      </div>
    `;

    container.addEventListener('click', (event) => {
      if (event.target === container) {
        closePasswordModal();
      }
    });

    container.querySelectorAll('button[data-key]').forEach(button => {
      const value = button.getAttribute('data-key');
      if (value === '⌫') {
        button.addEventListener('click', () => handlePinDelete());
      } else {
        button.addEventListener('click', () => handlePinInput(value));
      }
    });

    const resetButton = container.querySelector('[data-action="reset-hole"]');
    if (resetButton) {
      resetButton.addEventListener('click', (event) => {
        event.preventDefault();
        const currentModal = state.passwordModal;
        if (currentModal) {
          handleHoleResetConfirmation(currentModal.holeId);
        }
      });
    }

    modalRoot.appendChild(container);
  }

  const titleEl = container.querySelector('[data-role="title"]');
  const subtitleEl = container.querySelector('[data-role="subtitle"]');
  const errorEl = container.querySelector('[data-role="error"]');
  const dots = container.querySelectorAll('[data-pin-dot]');

  if (titleEl) {
    titleEl.textContent = modal.mode === 'setup'
      ? (modal.step === 1 ? '设置4位密码' : '请再次输入以确认')
      : '输入密码';
  }
  if (subtitleEl) {
    subtitleEl.textContent = modal.mode === 'setup'
      ? '为这个树洞创建一个密码。'
      : '请输入密码以进入。';
  }
  if (errorEl) {
    errorEl.textContent = modal.error || '';
  }
  dots.forEach((dot, index) => {
    const filled = modal.step === 2 ? modal.confirmPin.length > index : modal.pin.length > index;
    if (filled) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });

  const resetButton = container.querySelector('[data-action="reset-hole"]');
  if (resetButton) {
    resetButton.style.display = hole && hole.passwordHash ? 'inline-flex' : 'none';
  }
}

function renderCloudModal() {
  const modalState = state.cloudModal;
  const existing = document.getElementById('cloud-modal');
  if (!modalState || !modalState.open) {
    if (existing) {
      existing.remove();
    }
    return;
  }

  if (state.cloud.session && modalState.authMode !== 'dashboard') {
    modalState.authMode = 'dashboard';
  }
  if (!state.cloud.session && modalState.authMode === 'dashboard') {
    modalState.authMode = 'signIn';
  }

  if (existing) {
    existing.remove();
  }

  const hasConfig = modalState.configUrl.trim() && modalState.configAnonKey.trim();
  const session = state.cloud.session;
  const lastSyncText = state.cloud.lastSyncedAt
    ? formatDateTime(state.cloud.lastSyncedAt)
    : '尚未同步';
  const remoteUpdatedTimestamp = state.cloud.remoteSnapshot?.updatedAt
    ? Date.parse(state.cloud.remoteSnapshot.updatedAt)
    : null;
  const remoteUpdatedText = remoteUpdatedTimestamp && !Number.isNaN(remoteUpdatedTimestamp)
    ? formatDateTime(remoteUpdatedTimestamp)
    : '暂无云端备份';
  const statusMessage = state.cloud.statusMessage;
  const successMessage = modalState.message;
  const errorMessage = modalState.error || state.cloud.errorMessage;
  const disableConfigInputs = modalState.isSavingConfig;
  const disableAuthInputs = modalState.isSubmitting || state.cloud.isSyncing;
  const disableActions = state.cloud.isSyncing;

  const authTabsHtml = `
    <div class="cloud-auth-tabs">
      <button type="button" data-auth-mode="signIn" class="${modalState.authMode === 'signIn' ? 'active' : ''}">登录</button>
      <button type="button" data-auth-mode="signUp" class="${modalState.authMode === 'signUp' ? 'active' : ''}">注册</button>
    </div>
  `;

  const authFormHtml = `
    <section class="cloud-section">
      <h3>2. 登录 Supabase 账号</h3>
      ${authTabsHtml}
      <label class="cloud-field">
        <span>邮箱</span>
        <input type="email" name="cloud-email" placeholder="you@example.com" value="${escapeHtml(modalState.email)}" ${disableAuthInputs ? 'disabled' : ''} />
      </label>
      <label class="cloud-field">
        <span>密码</span>
        <input type="password" name="cloud-password" placeholder="至少 6 位字符" value="${escapeHtml(modalState.password)}" ${disableAuthInputs ? 'disabled' : ''} />
      </label>
      ${modalState.authMode === 'signUp' ? `
        <label class="cloud-field">
          <span>确认密码</span>
          <input type="password" name="cloud-confirm" placeholder="再次输入密码" value="${escapeHtml(modalState.confirmPassword)}" ${disableAuthInputs ? 'disabled' : ''} />
        </label>
      ` : ''}
      <button type="button" class="cloud-button primary" data-action="cloud-auth-submit" ${disableAuthInputs ? 'disabled' : ''}>
        ${modalState.isSubmitting ? '提交中...' : (modalState.authMode === 'signIn' ? '登录' : '注册')}
      </button>
      <p class="cloud-hint">注册时将使用 Supabase 的邮箱登录流程。若开启邮箱验证，请在收件箱中完成确认后再登录。</p>
    </section>
  `;

  const dashboardHtml = `
    <section class="cloud-section">
      <h3>2. 管理云端备份</h3>
      <div class="cloud-summary">
        <p><strong>当前账号：</strong>${escapeHtml(session?.user?.email || '')}</p>
        <p><strong>上次同步：</strong>${escapeHtml(lastSyncText)}</p>
        <p><strong>云端最近备份：</strong>${escapeHtml(remoteUpdatedText)}</p>
      </div>
      <div class="cloud-actions">
        <button type="button" class="cloud-button primary" data-action="cloud-sync-now" ${disableActions ? 'disabled' : ''}>立即备份</button>
        <button type="button" class="cloud-button secondary" data-action="cloud-download" ${disableActions ? 'disabled' : ''}>从云端恢复</button>
        <button type="button" class="cloud-button danger" data-action="cloud-sign-out" ${disableActions ? 'disabled' : ''}>退出登录</button>
      </div>
    </section>
  `;

  const container = document.createElement('div');
  container.id = 'cloud-modal';
  container.className = 'modal-overlay';
  container.innerHTML = `
    <div class="modal-card cloud-modal-card" role="dialog" aria-modal="true">
      <button type="button" class="cloud-close" data-action="close-cloud-modal" aria-label="关闭">×</button>
      <h2 class="modal-title">云端同步（Supabase）</h2>
      <p class="modal-subtitle">将树洞内容备份到 Supabase，登录后可在不同设备间同步与恢复。</p>
      ${successMessage ? `<div class="cloud-banner success">${escapeHtml(successMessage)}</div>` : ''}
      ${statusMessage ? `<div class="cloud-banner info">${escapeHtml(statusMessage)}</div>` : ''}
      ${errorMessage ? `<div class="cloud-banner error">${escapeHtml(errorMessage)}</div>` : ''}
      <section class="cloud-section">
        <h3>1. 填写项目配置</h3>
        <label class="cloud-field">
          <span>Supabase URL</span>
          <input type="url" name="supabase-url" placeholder="https://xxxx.supabase.co" value="${escapeHtml(modalState.configUrl)}" ${disableConfigInputs ? 'disabled' : ''} />
        </label>
        <label class="cloud-field">
          <span>Supabase 匿名密钥</span>
          <input type="password" name="supabase-key" placeholder="eyJhbGciOi..." value="${escapeHtml(modalState.configAnonKey)}" ${disableConfigInputs ? 'disabled' : ''} />
        </label>
        <button type="button" class="cloud-button primary" data-action="cloud-save-config" ${disableConfigInputs ? 'disabled' : ''}>
          ${modalState.isSavingConfig ? '保存中...' : '保存配置'}
        </button>
        <p class="cloud-hint">请在 Supabase 的 SQL 编辑器中创建 <code>${SUPABASE_TABLE_NAME}</code> 表：
          <code>create table if not exists ${SUPABASE_TABLE_NAME} (user_id uuid primary key references auth.users, data jsonb not null, updated_at timestamptz default now());</code>
        </p>
      </section>
      ${hasConfig ? (session ? dashboardHtml : authFormHtml) : `<section class="cloud-section"><p class="cloud-hint">保存配置后即可登录 Supabase。</p></section>`}
    </div>
  `;

  container.addEventListener('click', (event) => {
    if (event.target === container) {
      closeCloudModal();
    }
  });

  const closeButton = container.querySelector('[data-action="close-cloud-modal"]');
  if (closeButton) {
    closeButton.addEventListener('click', () => closeCloudModal());
  }

  const urlInput = container.querySelector('input[name="supabase-url"]');
  if (urlInput) {
    urlInput.addEventListener('input', (event) => {
      modalState.configUrl = event.target.value;
    });
  }

  const keyInput = container.querySelector('input[name="supabase-key"]');
  if (keyInput) {
    keyInput.addEventListener('input', (event) => {
      modalState.configAnonKey = event.target.value;
    });
  }

  const saveButton = container.querySelector('[data-action="cloud-save-config"]');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const url = modalState.configUrl.trim();
      const anonKey = modalState.configAnonKey.trim();
      if (!url || !anonKey) {
        modalState.error = '请填写完整的 Supabase 项目信息。';
        modalState.message = '';
        renderCloudModal();
        return;
      }
      modalState.isSavingConfig = true;
      modalState.error = '';
      modalState.message = '';
      modalState.configUrl = url;
      modalState.configAnonKey = anonKey;
      renderCloudModal();
      try {
        setSupabaseConfig(url, anonKey);
        await initSupabaseClient();
        if (state.cloud.client) {
          modalState.message = 'Supabase 配置已保存。';
        } else {
          modalState.error = state.cloud.errorMessage || '无法连接到 Supabase，请检查配置。';
        }
      } catch (error) {
        console.error('保存 Supabase 配置失败：', error);
        modalState.error = '保存配置失败，请稍后重试。';
      } finally {
        modalState.isSavingConfig = false;
        renderCloudModal();
      }
    });
  }

  if (hasConfig && !session) {
    container.querySelectorAll('[data-auth-mode]').forEach(button => {
      button.addEventListener('click', (event) => {
        const mode = event.currentTarget.getAttribute('data-auth-mode');
        if (mode && (mode === 'signIn' || mode === 'signUp')) {
          modalState.authMode = mode;
          modalState.error = '';
          modalState.message = '';
          renderCloudModal();
        }
      });
    });

    const emailInput = container.querySelector('input[name="cloud-email"]');
    if (emailInput) {
      emailInput.addEventListener('input', (event) => {
        modalState.email = event.target.value;
      });
    }

    const passwordInput = container.querySelector('input[name="cloud-password"]');
    if (passwordInput) {
      passwordInput.addEventListener('input', (event) => {
        modalState.password = event.target.value;
      });
    }

    const confirmInput = container.querySelector('input[name="cloud-confirm"]');
    if (confirmInput) {
      confirmInput.addEventListener('input', (event) => {
        modalState.confirmPassword = event.target.value;
      });
    }

    const authSubmit = container.querySelector('[data-action="cloud-auth-submit"]');
    if (authSubmit) {
      authSubmit.addEventListener('click', async () => {
        const email = modalState.email.trim();
        const password = modalState.password;
        if (!email || !password) {
          modalState.error = '请输入邮箱和密码。';
          modalState.message = '';
          renderCloudModal();
          return;
        }
        if (modalState.authMode === 'signUp' && password !== modalState.confirmPassword) {
          modalState.error = '两次输入的密码不一致。';
          modalState.message = '';
          renderCloudModal();
          return;
        }
        if (!state.cloud.client) {
          modalState.error = '请先保存有效的 Supabase 配置。';
          renderCloudModal();
          return;
        }

        modalState.isSubmitting = true;
        modalState.error = '';
        modalState.message = '';
        renderCloudModal();

        try {
          if (modalState.authMode === 'signIn') {
            const { error } = await state.cloud.client.auth.signInWithPassword({ email, password });
            if (error) {
              modalState.error = getSupabaseErrorMessage(error);
            } else {
              modalState.message = '登录成功！';
            }
          } else {
            const { data, error } = await state.cloud.client.auth.signUp({ email, password });
            if (error) {
              modalState.error = getSupabaseErrorMessage(error);
            } else if (data.session) {
              modalState.message = '注册成功，已自动登录。';
            } else {
              modalState.message = '注册成功，请到邮箱完成验证后再登录。';
            }
            modalState.confirmPassword = '';
          }
          if (!modalState.error) {
            modalState.password = '';
          }
        } catch (error) {
          console.error('Supabase 认证失败：', error);
          modalState.error = getSupabaseErrorMessage(error);
        } finally {
          modalState.isSubmitting = false;
          renderCloudModal();
        }
      });
    }
  }

  if (hasConfig && session) {
    const syncButton = container.querySelector('[data-action="cloud-sync-now"]');
    if (syncButton) {
      syncButton.addEventListener('click', async () => {
        await uploadTreeHolesToCloud({ manual: true });
      });
    }

    const downloadButton = container.querySelector('[data-action="cloud-download"]');
    if (downloadButton) {
      downloadButton.addEventListener('click', async () => {
        await downloadTreeHolesFromCloud();
      });
    }

    const signOutButton = container.querySelector('[data-action="cloud-sign-out"]');
    if (signOutButton) {
      signOutButton.addEventListener('click', async () => {
        await signOutFromCloud();
      });
    }
  }

  modalRoot.appendChild(container);
}

function renderModelDialog() {
  const existing = document.getElementById('model-dialog');
  if (!state.modelDialogOpen) {
    if (existing) {
      existing.remove();
    }
    return;
  }

  const isWebLlmSelected = state.llm.mode === 'webllm';
  const webLlmStatus = state.llm.ready
    ? 'WebLLM 已加载完成，可以开始对话。'
    : state.llm.loading
      ? `WebLLM 正在加载模型... ${state.llm.progress}%`
      : '选择后开始加载 WebLLM，等待完成即可开始使用。';

  const progressHtml = `
    <div class="model-progress">
      <div class="model-progress-bar" style="width:${state.llm.progress}%;"></div>
      <span class="model-progress-text">${state.llm.progress}%</span>
    </div>
  `;

  if (existing) {
    existing.remove();
  }

  const container = document.createElement('div');
  container.id = 'model-dialog';
  container.className = 'model-dialog-overlay';
  container.innerHTML = `
    <div class="model-dialog-card" role="dialog" aria-modal="true">
      <div class="model-dialog-header">
        <div>
          <div class="model-dialog-title">陪伴模式 / WebLLM 模型</div>
          <div class="model-dialog-subtitle">点击选择你的陪伴方式</div>
        </div>
        <button type="button" class="dialog-close" aria-label="关闭模式选择" data-action="close-model-dialog">×</button>
      </div>
      <div class="model-selector">
        <button class="model-card ${state.llm.mode === 'classic' ? 'active' : ''}" data-model="classic">
          <div class="model-card-header">
            <div>
              <div class="model-title">陪伴模式</div>
              <div class="model-desc">使用当前的温柔安慰逻辑快速回复</div>
            </div>
            ${state.llm.mode === 'classic' ? '<span class="model-badge">已选择</span>' : ''}
          </div>
        </button>
        <button class="model-card ${isWebLlmSelected ? 'active' : ''}" data-model="webllm">
          <div class="model-card-header">
            <div>
              <div class="model-title">WebLLM 模型</div>
              <div class="model-desc">加载本地大语言模型，获取更细腻的回复</div>
            </div>
            ${isWebLlmSelected ? '<span class="model-badge">已选择</span>' : ''}
          </div>
          ${progressHtml}
          <div class="model-status ${state.llm.ready ? 'ok' : ''}">${webLlmStatus}</div>
          <div class="model-actions">
            <button type="button" class="model-ghost" data-action="clear-webllm" ${state.llm.progress ? '' : 'disabled'}>清空 WebLLM 本地缓存</button>
            <span class="model-hint">清空后可重新加载，提升设备空间</span>
          </div>
        </button>
      </div>
    </div>
  `;

  container.addEventListener('click', (event) => {
    if (event.target === container) {
      closeModelDialog();
    }
  });

  container.querySelectorAll('.model-card').forEach(button => {
    button.addEventListener('click', (event) => {
      const model = event.currentTarget.getAttribute('data-model');
      setModelMode(model);
      closeModelDialog();
    });
  });

  const clearButton = container.querySelector('[data-action="clear-webllm"]');
  if (clearButton) {
    clearButton.addEventListener('click', (event) => {
      event.stopPropagation();
      clearWebLlmCache();
    });
  }

  const closeButton = container.querySelector('[data-action="close-model-dialog"]');
  if (closeButton) {
    closeButton.addEventListener('click', () => closeModelDialog());
  }

  modalRoot.appendChild(container);
}

function renderModals() {
  renderPasswordModal();
  renderCloudModal();
  renderModelDialog();
}

function getStorageColor(usage) {
  if (usage >= 0.9) return '#dc2626';
  if (usage >= 0.7) return '#f59e0b';
  return '#22c55e';
}

function renderMainView() {
  const isWebLlmSelected = state.llm.mode === 'webllm';
  const webLlmStatus = state.llm.ready
    ? 'WebLLM 已加载完成，可以开始对话。'
    : state.llm.loading
      ? `WebLLM 正在加载模型... ${state.llm.progress}%`
      : '选择后开始加载 WebLLM，等待完成即可开始使用。';

  const modeSummary = state.llm.mode === 'webllm'
    ? '当前模式：WebLLM 模型'
    : '当前模式：陪伴模式';

  const progressHtml = `
    <div class="model-progress">
      <div class="model-progress-bar" style="width:${state.llm.progress}%;"></div>
      <span class="model-progress-text">${state.llm.progress}%</span>
    </div>
  `;

  const treeHolesHtml = state.treeHoles.map(hole => {
    const createdDate = formatDateYMD(hole.createdAt);
    const dateHtml = createdDate ? `<span class="hole-date">${createdDate}</span>` : '';
    const nameHtml = hole.name ? `<span class="hole-name">${escapeHtml(hole.name)}</span>` : '';
    const metaHtml = (dateHtml || nameHtml) ? `<div class="hole-meta">${dateHtml}${nameHtml}</div>` : '';

    return `
      <div class="tree-hole" style="top: ${hole.position.top}; left: ${hole.position.left};" data-hole-id="${hole.id}">
        <button type="button" class="${hole.passwordHash ? '' : 'locked'}" aria-label="${hole.passwordHash ? '打开树洞' : '创建树洞'}">
          ${hole.passwordHash ? '<div style="width:32px;height:32px;border-radius:50%;background:rgba(250,204,21,0.85);animation:pulse 1.6s infinite;"></div>' : lockIcon()}
        </button>
        ${metaHtml}
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="tree-container">
      <div class="tree-trunk" id="tree-trunk"></div>
      <div class="tree-content">
        <header class="tree-header">
          <div class="header-top">
            <div>
              <h1>树洞之树</h1>
              <p>选择一个树洞，开始你的诉说</p>
              <div class="model-selection-note">${modeSummary}</div>
            </div>
            <button class="model-trigger" type="button" aria-label="选择陪伴模式" data-action="open-model-dialog">${modelIcon()}</button>
          </div>
        </header>
        <div style="position:relative; min-height: 180vh;">
          ${treeHolesHtml}
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.tree-hole button').forEach(button => {
    const holeId = button.parentElement.getAttribute('data-hole-id');
    const hole = state.treeHoles.find(h => h.id === holeId);
    button.addEventListener('click', () => handleHoleClick(hole));
  });

  scheduleTrunkHeightUpdate();

  const modelTrigger = document.querySelector('[data-action="open-model-dialog"]');
  if (modelTrigger) {
    modelTrigger.addEventListener('click', () => openModelDialog());
  }
}

function scheduleTrunkHeightUpdate() {
  requestAnimationFrame(() => {
    const trunk = document.getElementById('tree-trunk');
    const content = document.querySelector('.tree-content');
    if (trunk && content) {
      const height = Math.max(content.scrollHeight + 120, window.innerHeight * 1.2);
      trunk.style.height = `${height}px`;
    }
  });
}

function renderChatView() {
  const hole = getActiveHole();
  if (!hole) {
    renderMainView();
    return;
  }

  const messagesHtml = hole.messages.map(message => {
    const isUser = message.sender === 'user';
    const { text: decryptedText, imageUrl } = getDecryptedMessageContent(hole, message);
    const displayText = decryptedText || (message.encryptedText ? '（内容无法解密）' : '');
    const bubbleContent = [];
    if (imageUrl) {
      bubbleContent.push(`<img class="message-image" src="${imageUrl}" alt="用户上传的图片" />`);
    }
    if (displayText) {
      bubbleContent.push(`<div class="message-text">${escapeHtml(displayText).replace(/\n/g, '<br>')}</div>`);
    }
    const bubble = `<div class="message-bubble">${bubbleContent.join('')}</div>`;
    return `
      <div class="chat-message ${isUser ? 'from-user' : 'from-ai'}">
        ${bubble}
        <span class="message-time">${formatTime(message.timestamp)}</span>
      </div>
    `;
  }).join('');

  const typingHtml = state.isLoading ? `
    <div class="chat-message from-ai">
      <div class="message-bubble"><span class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span></div>
    </div>
  ` : '';

  const previewHtml = state.inputImagePreview ? `
    <div class="image-preview">
      <img src="${state.inputImagePreview}" alt="预览" />
      <button type="button" class="remove-preview" aria-label="移除图片">×</button>
    </div>
  ` : '';

  const sendDisabled = state.isLoading || (!state.inputText.trim() && !state.inputImageFile);
  const modelNotice = state.llm.mode === 'webllm'
    ? `<div class="model-banner ${state.llm.ready ? 'ready' : ''}">${state.llm.ready ? '回复来自于 webllm' : 'WebLLM 加载中，完成后即可继续。'}</div>`
    : '<div class="model-banner">回复来自于陪伴模式</div>';
  const usagePercent = Math.round(state.storageUsage * 100);

  root.innerHTML = `
    <div class="chat-container">
      <header class="chat-header">
        <button class="icon-button" type="button" data-action="back" aria-label="返回树洞之树">${arrowLeftIcon()}</button>
        <input id="hole-name-input" maxlength="10" class="hole-name-input" placeholder="为这个树洞起个名字" value="${escapeHtml(state.editingName)}" />
        <button class="icon-button" type="button" data-action="history" aria-label="查看历史记录">${historyIcon()}</button>
      </header>
      <main class="chat-body messages" id="messages">${messagesHtml}${typingHtml}</main>
      <footer class="chat-footer">
        ${modelNotice}
        <div class="storage-indicator" data-action="cloud-sync">
          <div class="storage-label">
            <span>本地存储空间</span>
            <span>${usagePercent}%</span>
          </div>
          <div class="storage-bar"><div class="storage-progress" style="width:${usagePercent}%;background:${getStorageColor(state.storageUsage)}"></div></div>
        </div>
        <div class="input-area">
          ${previewHtml}
          <div class="compose-row">
            <input id="file-input" type="file" accept="image/*" style="display:none" />
            <button type="button" class="upload-button" data-action="upload" aria-label="上传图片">${imageIcon()}</button>
            <textarea id="chat-textarea" class="textarea" placeholder="说点什么吧..." ${state.isLoading ? 'disabled' : ''}>${escapeHtml(state.inputText)}</textarea>
            <button type="button" class="send-button" data-action="send" ${sendDisabled ? 'disabled' : ''}>${sendIcon()}</button>
          </div>
        </div>
      </footer>
    </div>
  `;

  attachChatEvents();
  scrollMessagesToBottom();
}

function renderHistoryView() {
  const hole = getActiveHole();
  if (!hole) {
    renderMainView();
    return;
  }
  const filteredMessages = getFilteredMessages(hole);

  const itemsHtml = filteredMessages.length === 0
    ? `<div class="history-empty">没有找到匹配的记录</div>`
    : filteredMessages.map(message => {
        const checked = state.selectedMessageIds.has(message.id) ? 'checked' : '';
        const emotionClass = message.classification?.emotion === '高兴'
          ? 'badge-emotion-happy'
          : message.classification?.emotion === '悲伤'
            ? 'badge-emotion-sad'
            : 'badge-emotion-neutral';
        const badges = message.classification ? `
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
            <span class="badge ${emotionClass}">${message.classification.emotion}</span>
            <span class="badge badge-type">${message.classification.content_type}</span>
          </div>
        ` : '';
        return `
          <label class="history-item">
            <input type="checkbox" data-message-id="${message.id}" ${checked} style="margin-top:6px;" />
            <div style="flex:1;">
              ${message.decryptedImageUrl ? `<img src="${message.decryptedImageUrl}" alt="用户上传的图片" />` : ''}
              <p>${escapeHtml(message.decryptedText || (message.encryptedText ? '（内容无法解密）' : '')).replace(/\n/g, '<br>')}</p>
              ${badges}
              <div class="meta">${formatDateTime(message.timestamp)}</div>
            </div>
          </label>
        `;
      }).join('');

  const usagePercent = Math.round(state.storageUsage * 100);

  root.innerHTML = `
    <div class="history-container">
      <header class="history-header">
        <button class="icon-button" type="button" data-action="back-chat" aria-label="返回聊天">${arrowLeftIcon()}</button>
        <h1 style="flex:1;font-size:1.1rem;margin:0;">聊天记录: ${hole.name ? escapeHtml(hole.name) : '未命名'}</h1>
        <div class="storage-indicator" style="max-width:220px;" data-action="cloud-sync">
          <div class="storage-label">
            <span>存储</span>
            <span>${usagePercent}%</span>
          </div>
          <div class="storage-bar"><div class="storage-progress" style="width:${usagePercent}%;background:${getStorageColor(state.storageUsage)}"></div></div>
        </div>
      </header>
      <div class="history-controls">
        <input type="text" id="search-input" placeholder="搜索..." value="${escapeHtml(state.searchTerm)}" />
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <select id="emotion-filter">
            <option value="all" ${state.emotionFilter === 'all' ? 'selected' : ''}>所有情绪</option>
            <option value="高兴" ${state.emotionFilter === '高兴' ? 'selected' : ''}>高兴</option>
            <option value="悲伤" ${state.emotionFilter === '悲伤' ? 'selected' : ''}>悲伤</option>
            <option value="中性" ${state.emotionFilter === '中性' ? 'selected' : ''}>中性</option>
          </select>
          <select id="content-filter">
            <option value="all" ${state.contentTypeFilter === 'all' ? 'selected' : ''}>所有类型</option>
            ${['事件','感情','心情','图片','工作','学习','生活','其他'].map(type => `<option value="${type}" ${state.contentTypeFilter === type ? 'selected' : ''}>${type}</option>`).join('')}
          </select>
          <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;color:var(--muted);">
            <input type="checkbox" id="select-all" ${filteredMessages.length && state.selectedMessageIds.size === filteredMessages.length ? 'checked' : ''} />
            全选
          </label>
        </div>
        <div style="font-size:0.85rem;color:var(--muted);">${filteredMessages.length} 条记录</div>
      </div>
      <div class="history-list">${itemsHtml}</div>
      ${state.selectedMessageIds.size ? `
        <div class="selection-bar">
          <span>已选择 ${state.selectedMessageIds.size} 项</span>
          <button type="button" class="delete-button" data-action="delete">${trashIcon()}删除</button>
        </div>
      ` : ''}
    </div>
  `;

  attachHistoryEvents(filteredMessages);
}

function getFilteredMessages(hole) {
  return hole.messages
    .filter(message => message.sender === 'user')
    .map(message => {
      const { text, imageUrl } = getDecryptedMessageContent(hole, message);
      return {
        ...message,
        decryptedText: text,
        decryptedImageUrl: imageUrl
      };
    })
    .filter(message => {
      const text = message.decryptedText || '';
      const matchesText = !state.searchTerm || (text && text.toLowerCase().includes(state.searchTerm.toLowerCase()));
      const matchesEmotion = state.emotionFilter === 'all' || message.classification?.emotion === state.emotionFilter;
      const matchesType = state.contentTypeFilter === 'all' || message.classification?.content_type === state.contentTypeFilter;
      return matchesText && matchesEmotion && matchesType;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

function scrollMessagesToBottom() {
  requestAnimationFrame(() => {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer && state.autoScrollEnabled) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
}

function attachChatEvents() {
  const backButton = document.querySelector('[data-action="back"]');
  if (backButton) {
    backButton.addEventListener('click', () => exitActiveHole());
  }

  const historyButton = document.querySelector('[data-action="history"]');
  if (historyButton) {
    historyButton.addEventListener('click', () => {
      state.activeView = 'history';
      render();
    });
  }

  const cloudAreas = document.querySelectorAll('[data-action="cloud-sync"]');
  cloudAreas.forEach(area => area.addEventListener('click', () => {
    openCloudModal();
  }));

  const nameInput = document.getElementById('hole-name-input');
  if (nameInput) {
    nameInput.addEventListener('input', (event) => {
      const value = event.target.value.slice(0, 10);
      event.target.value = value;
      state.editingName = value;
    });
    nameInput.addEventListener('blur', () => {
      const hole = getActiveHole();
      if (hole) {
        hole.name = state.editingName.trim();
        saveTreeHoles();
      }
    });
    nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        nameInput.blur();
      }
    });
  }

  const textarea = document.getElementById('chat-textarea');
  if (textarea) {
    textarea.addEventListener('input', (event) => {
      state.inputText = event.target.value;
      autoResizeTextarea(event.target);
      updateSendButtonState();
    });
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    });
    autoResizeTextarea(textarea);
  }

  const uploadButton = document.querySelector('[data-action="upload"]');
  const fileInput = document.getElementById('file-input');
  if (uploadButton && fileInput) {
    uploadButton.addEventListener('click', () => {
      if (!state.isLoading) {
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      ensurePreviewRevoked();
      state.inputImageFile = file;
      state.inputImagePreview = URL.createObjectURL(file);
      render();
      fileInput.value = '';
    });
  }

  const removePreviewButton = document.querySelector('.remove-preview');
  if (removePreviewButton) {
    removePreviewButton.addEventListener('click', () => {
      ensurePreviewRevoked();
      state.inputImageFile = null;
      render();
    });
  }

  const sendButton = document.querySelector('[data-action="send"]');
  if (sendButton) {
    sendButton.addEventListener('click', () => handleSendMessage());
  }

  const messagesContainer = document.getElementById('messages');
  if (messagesContainer) {
    messagesContainer.addEventListener('scroll', () => {
      const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight - messagesContainer.scrollTop;
      if (distanceFromBottom > 60 && state.autoScrollEnabled) {
        state.autoScrollEnabled = false;
      }
    });
  }

  updateSendButtonState();
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

function updateSendButtonState() {
  const sendButton = document.querySelector('[data-action="send"]');
  if (!sendButton) return;
  const modelBlocked = state.llm.mode === 'webllm' && !state.llm.ready;
  const shouldDisable = state.isLoading || (!state.inputText.trim() && !state.inputImageFile) || modelBlocked;
  sendButton.disabled = shouldDisable;
}

function attachHistoryEvents(filteredMessages) {
  const backButton = document.querySelector('[data-action="back-chat"]');
  if (backButton) {
    backButton.addEventListener('click', () => {
      state.activeView = 'chat';
      render();
    });
  }

  document.querySelectorAll('[data-action="cloud-sync"]').forEach(area => {
    area.addEventListener('click', () => {
      openCloudModal();
    });
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      state.searchTerm = event.target.value;
      render();
    });
  }

  const emotionFilter = document.getElementById('emotion-filter');
  if (emotionFilter) {
    emotionFilter.addEventListener('change', (event) => {
      state.emotionFilter = event.target.value;
      render();
    });
  }

  const contentFilter = document.getElementById('content-filter');
  if (contentFilter) {
    contentFilter.addEventListener('change', (event) => {
      state.contentTypeFilter = event.target.value;
      render();
    });
  }

  const selectAll = document.getElementById('select-all');
  if (selectAll) {
    selectAll.addEventListener('change', (event) => {
      if (event.target.checked) {
        state.selectedMessageIds = new Set(filteredMessages.map(message => message.id));
      } else {
        state.selectedMessageIds.clear();
      }
      render();
    });
  }

  document.querySelectorAll('input[data-message-id]').forEach(input => {
    input.addEventListener('change', (event) => {
      const id = event.target.getAttribute('data-message-id');
      if (state.selectedMessageIds.has(id)) {
        state.selectedMessageIds.delete(id);
      } else {
        state.selectedMessageIds.add(id);
      }
      render();
    });
  });

  const deleteButton = document.querySelector('[data-action="delete"]');
  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      const hole = getActiveHole();
      if (!hole) return;
      hole.messages = hole.messages.filter(message => !state.selectedMessageIds.has(message.id));
      saveTreeHoles();
      state.selectedMessageIds.clear();
      render();
    });
  }
}

async function handleSendMessage() {
  if (state.isLoading) return;
  const text = state.inputText.trim();
  if (!text && !state.inputImageFile) {
    return;
  }

  const hole = getActiveHole();
  if (!hole) return;

  const password = getActiveHolePassword(hole.id);
  if (!password) {
    console.error('缺少用于加密的树洞密码。');
    state.isLoading = false;
    render();
    return;
  }

  state.autoScrollEnabled = true;
  state.isLoading = true;
  render();

  let imagePayload = null;
  if (state.inputImageFile) {
    try {
      const { data, mimeType } = await fileToBase64(state.inputImageFile);
      imagePayload = { present: true, data, mimeType };
    } catch (error) {
      console.error('处理图片时出错：', error);
      state.isLoading = false;
      alert('图片处理失败，请重试。');
      render();
      return;
    }
  }

  const messageId = `user-${Date.now()}`;
  const encryptedText = text ? encryptWithPassword(text, password) : '';
  let encryptedImage = '';
  if (imagePayload && imagePayload.present) {
    const payload = JSON.stringify({ data: imagePayload.data, mimeType: imagePayload.mimeType });
    encryptedImage = encryptWithPassword(payload, password);
  }
  const userMessage = {
    id: messageId,
    sender: 'user',
    encryptedText,
    encryptedImage,
    timestamp: Date.now()
  };
  hole.messages.push(userMessage);
  saveTreeHoles();

  state.inputText = '';
  state.inputImageFile = null;
  ensurePreviewRevoked();
  render();

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const [replyText, classification] = await Promise.all([
      getModelReply(text, imagePayload),
      analyzeMessage(text, imagePayload)
    ]);

    const targetMessage = hole.messages.find(message => message.id === messageId);
    if (targetMessage) {
      targetMessage.classification = classification;
    }

    const aiMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      encryptedText: encryptWithPassword(replyText, password),
      encryptedImage: '',
      timestamp: Date.now()
    };
    hole.messages.push(aiMessage);
    saveTreeHoles();
  } catch (error) {
    console.error('生成回复时出错：', error);
    const aiMessage = {
      id: `ai-error-${Date.now()}`,
      sender: 'ai',
      encryptedText: encryptWithPassword('抱歉，我好像走神了。你能再说一遍吗？', password),
      encryptedImage: '',
      timestamp: Date.now()
    };
    hole.messages.push(aiMessage);
    saveTreeHoles();
  }

  state.isLoading = false;
  render();
}

function render() {
  if (!state.activeHoleId) {
    renderMainView();
  } else if (state.activeView === 'chat') {
    renderChatView();
  } else {
    renderHistoryView();
  }
  renderModals();
}

function modelIcon() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8a4.5 4.5 0 119 0c0 1.415-.424 2.305-1.06 3.06C14.57 12.784 12 15 12 17.5v1.5" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 21h6" />
    </svg>
  `;
}

function lockIcon() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="28" height="28">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  `;
}

function historyIcon() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="24" height="24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `;
}

function arrowLeftIcon() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="24" height="24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  `;
}

function trashIcon() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  `;
}

function imageIcon() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 6.75A2.25 2.25 0 016.75 4.5h10.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 17.25V6.75z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l3.72-3.72a1.5 1.5 0 012.12 0l3.66 3.66" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 11.25l1.47-1.47a1.5 1.5 0 012.13 0l1.87 1.87" />
      <circle cx="8.25" cy="8.25" r="1.5" fill="currentColor" />
    </svg>
  `;
}

function sendIcon() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
    </svg>
  `;
}

window.addEventListener('resize', scheduleTrunkHeightUpdate);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !state.activeHoleId) {
    scheduleTrunkHeightUpdate();
  }
});

loadSupabaseSettings();
initSupabaseClient().catch(error => {
  console.error('初始化 Supabase 失败：', error);
});
loadModelState();
if (state.llm.mode === 'webllm' && !state.llm.ready && !state.llm.loading) {
  startWebLlmLoading();
}
loadTreeHoles();
render();
