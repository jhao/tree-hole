const TREE_HOLES_DATA_KEY = 'treeHolesData';
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

const state = {
  treeHoles: [],
  activeHoleId: null,
  activeView: 'chat',
  passwordModal: null,
  upgradeModalOpen: false,
  storageUsage: 0,
  isLoading: false,
  searchTerm: '',
  emotionFilter: 'all',
  contentTypeFilter: 'all',
  selectedMessageIds: new Set(),
  editingName: '',
  inputText: '',
  inputImageFile: null,
  inputImagePreview: null
};

const root = document.getElementById('root');
const modalRoot = document.getElementById('modal-root');

let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener('gesturestart', (event) => {
  event.preventDefault();
}, false);

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
    localStorage.setItem(TREE_HOLES_DATA_KEY, JSON.stringify(state.treeHoles));
  } catch (error) {
    console.error('Failed to save tree holes:', error);
  }
  updateStorageUsage();
}

function updateStorageUsage() {
  try {
    const storedData = localStorage.getItem(TREE_HOLES_DATA_KEY);
    if (!storedData) {
      state.storageUsage = 0;
      return;
    }
    const bytes = new Blob([storedData]).size;
    state.storageUsage = Math.min(1, bytes / MAX_STORAGE_BYTES);
    if (state.storageUsage > STORAGE_WARNING_THRESHOLD && !state.upgradeModalOpen) {
      state.upgradeModalOpen = true;
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
  const lowerCaseText = text.trim().toLowerCase();
  if (greetingKeywords.some(keyword => lowerCaseText.includes(keyword))) {
    const index = Math.floor(Math.random() * greetingResponses.length);
    return greetingResponses[index];
  }
  if (imagePayload && imagePayload.present) {
    return '这张图片一定承载了很多心情，我会认真听你说。';
  }
  const randomIndex = Math.floor(Math.random() * comfortingPhrases.length);
  return comfortingPhrases[randomIndex];
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
  ensurePreviewRevoked();
  state.inputText = '';
  state.inputImageFile = null;
  const activeHole = getActiveHole();
  state.editingName = activeHole ? activeHole.name || '' : '';
  render();
}

function exitActiveHole() {
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
            hole.passwordHash = modal.confirmPin;
            hole.createdAt = Date.now();
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
        if (hole && modal.pin === hole.passwordHash) {
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
        <div class="keypad" data-role="keypad">
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

function renderUpgradeModal() {
  const existing = document.getElementById('upgrade-modal');
  if (existing) {
    existing.remove();
  }
  if (!state.upgradeModalOpen) return;

  const container = document.createElement('div');
  container.id = 'upgrade-modal';
  container.className = 'modal-overlay';
  container.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <h2 class="modal-title">升级您的存储</h2>
      <p class="modal-subtitle">您的本地存储空间即将用尽。升级到云存储，以安全地保存您的所有记录，并在任何设备上访问它们。</p>
      <div class="upgrade-options">
        ${[
          { name: 'Firebase Firestore', description: 'Google提供的实时NoSQL数据库，易于集成和扩展。' },
          { name: 'Supabase', description: '开源的Firebase替代品，提供PostgreSQL数据库和自动生成的API。' },
          { name: 'AWS DynamoDB', description: '亚马逊提供的完全托管的NoSQL数据库，具有高可用性和可扩展性。' }
        ].map(option => `
          <div class="history-item" style="margin-bottom: 12px;">
            <div>
              <p style="font-weight: 600; color: var(--accent); margin-bottom: 6px;">${option.name}</p>
              <p style="font-size: 0.9rem; color: var(--muted); margin: 0;">${option.description}</p>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary" data-action="later">以后再说</button>
        <button type="button" class="primary" data-action="upgrade">登录并开始升级</button>
      </div>
    </div>
  `;

  container.addEventListener('click', (event) => {
    if (event.target === container) {
      state.upgradeModalOpen = false;
      renderModals();
    }
  });

  container.querySelector('[data-action="later"]').addEventListener('click', () => {
    state.upgradeModalOpen = false;
    renderModals();
  });
  container.querySelector('[data-action="upgrade"]').addEventListener('click', () => {
    state.upgradeModalOpen = false;
    renderModals();
    alert('敬请期待云端功能 ✨');
  });

  modalRoot.appendChild(container);
}

function renderModals() {
  renderPasswordModal();
  renderUpgradeModal();
}

function getStorageColor(usage) {
  if (usage >= 0.9) return '#dc2626';
  if (usage >= 0.7) return '#f59e0b';
  return '#22c55e';
}

function renderMainView() {
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
          <h1>树洞之树</h1>
          <p>选择一个树洞，开始你的诉说</p>
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
    const bubbleContent = [];
    if (message.imageUrl) {
      bubbleContent.push(`<img class="message-image" src="${message.imageUrl}" alt="用户上传的图片" />`);
    }
    if (message.text) {
      bubbleContent.push(`<div class="message-text">${escapeHtml(message.text).replace(/\n/g, '<br>')}</div>`);
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
        <div class="storage-indicator" data-action="upgrade">
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
              ${message.imageUrl ? `<img src="${message.imageUrl}" alt="用户上传的图片" />` : ''}
              <p>${escapeHtml(message.text).replace(/\n/g, '<br>')}</p>
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
        <div class="storage-indicator" style="max-width:220px;" data-action="upgrade">
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
    .filter(message => {
      const matchesText = !state.searchTerm || (message.text && message.text.toLowerCase().includes(state.searchTerm.toLowerCase()));
      const matchesEmotion = state.emotionFilter === 'all' || message.classification?.emotion === state.emotionFilter;
      const matchesType = state.contentTypeFilter === 'all' || message.classification?.content_type === state.contentTypeFilter;
      return matchesText && matchesEmotion && matchesType;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

function scrollMessagesToBottom() {
  requestAnimationFrame(() => {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
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

  const upgradeAreas = document.querySelectorAll('[data-action="upgrade"]');
  upgradeAreas.forEach(area => area.addEventListener('click', () => {
    state.upgradeModalOpen = true;
    renderModals();
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

  updateSendButtonState();
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

function updateSendButtonState() {
  const sendButton = document.querySelector('[data-action="send"]');
  if (!sendButton) return;
  const shouldDisable = state.isLoading || (!state.inputText.trim() && !state.inputImageFile);
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

  document.querySelectorAll('[data-action="upgrade"]').forEach(area => {
    area.addEventListener('click', () => {
      state.upgradeModalOpen = true;
      renderModals();
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

  state.isLoading = true;
  render();

  let imageDisplayUrl = null;
  let imagePayload = null;
  if (state.inputImageFile) {
    try {
      const { displayUrl } = await fileToBase64(state.inputImageFile);
      imageDisplayUrl = displayUrl;
      imagePayload = { present: true };
    } catch (error) {
      console.error('处理图片时出错：', error);
      state.isLoading = false;
      alert('图片处理失败，请重试。');
      render();
      return;
    }
  }

  const messageId = `user-${Date.now()}`;
  const userMessage = {
    id: messageId,
    sender: 'user',
    text,
    imageUrl: imageDisplayUrl,
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
      getComfortingReply(text, imagePayload),
      analyzeMessage(text, imagePayload)
    ]);

    const targetMessage = hole.messages.find(message => message.id === messageId);
    if (targetMessage) {
      targetMessage.classification = classification;
    }

    const aiMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: replyText,
      timestamp: Date.now()
    };
    hole.messages.push(aiMessage);
    saveTreeHoles();
  } catch (error) {
    console.error('生成回复时出错：', error);
    const aiMessage = {
      id: `ai-error-${Date.now()}`,
      sender: 'ai',
      text: '抱歉，我好像走神了。你能再说一遍吗？',
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

loadTreeHoles();
render();
