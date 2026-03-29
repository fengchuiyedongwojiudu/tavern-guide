/* ============================================
   酒馆 · 完整交互 + AI 对话
   ============================================ */
'use strict';

// ==========================================
//  全局状态
// ==========================================
const S = {
    // API 配置
    proxy: '',
    key: '',
    model: 'gpt-4o',
    // 角色配置
    userName: 'User',
    charName: '助手',
    system: '你是一个聪明、温柔、富有文学气息的AI助手。请用中文回复，语气自然亲切。',
    greeting: '*轻轻推开木质的门，烛光摇曳* 欢迎来到这里，今晚想聊些什么？',
    // 参数
    temperature: 0.8,
    maxTokens: 1024,
    contextRounds: 20,
    // 外观
    bgDim: 50,
    bgBlur: 0,
    bubbleOpacity: 85,
    bubbleStyle: 'glass',
    // 对话历史
    history: [],
    // 状态
    thinking: false,
    started: false,
    bgType: 'gradient',
    bgGradient: 'linear-gradient(135deg,#0c0c14,#1a1a2e)',
    bgImageData: null,
};

// ==========================================
//  DOM 快捷获取
// ==========================================
const $ = id => document.getElementById(id);
const el = (sel, ctx = document) => ctx.querySelector(sel);

// ==========================================
//  初始化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initDate();
    initParticles();
    initSidebar();
    initBg();
    initSliders();
    initInput();
    initChat();
    initStyleBtns();
    applyAll();
});

// ==========================================
//  日期
// ==========================================
function initDate() {
    const now = new Date();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const h = now.getHours();
    $('welcomeDay').textContent = now.getDate();
    $('welcomeMonth').textContent = `${months[now.getMonth()]} · ${days[now.getDay()]}`;
}

// ==========================================
//  粒子
// ==========================================
function initParticles() {
    const cvs = $('particles');
    const ctx = cvs.getContext('2d');
    let dots = [];

    function resize() {
        cvs.width = innerWidth;
        cvs.height = innerHeight;
    }

    function makeDots() {
        resize();
        dots = [];
        const n = Math.min(Math.floor(cvs.width * cvs.height / 30000), 30);
        for (let i = 0; i < n; i++) {
            dots.push({
                x: Math.random() * cvs.width,
                y: Math.random() * cvs.height,
                r: Math.random() * 1.1 + .3,
                dy: -(Math.random() * .1 + .03),
                dx: (Math.random() - .5) * .06,
                o: Math.random() * .2 + .04,
                ph: Math.random() * 6.28,
                ps: Math.random() * .007 + .003,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        dots.forEach(d => {
            d.y += d.dy; d.x += d.dx; d.ph += d.ps;
            if (d.y < -10) { d.y = cvs.height + 10; d.x = Math.random() * cvs.width; }
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, 6.28);
            ctx.fillStyle = `rgba(196,168,130,${d.o * (.5 + .5 * Math.sin(d.ph))})`;
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }

    makeDots(); draw();
    addEventListener('resize', makeDots);
}

// ==========================================
//  侧边栏
// ==========================================
function initSidebar() {
    const sb = $('sidebar');
    const mask = $('sidebarMask');
    const main = $('main');

    function open() {
        sb.classList.add('open');
        mask.classList.add('show');
        main.classList.add('blurred');
    }
    function close() {
        sb.classList.remove('open');
        mask.classList.remove('show');
        main.classList.remove('blurred');
    }

    $('openSidebar').addEventListener('click', open);
    $('sidebarClose').addEventListener('click', close);
    mask.addEventListener('click', close);

    // 同步输入框 → S
    const bindings = [
        ['cfgProxy','proxy','url'],
        ['cfgKey','key','pw'],
        ['cfgModel','model','text'],
        ['cfgUserName','userName','text'],
        ['cfgCharName','charName','text'],
        ['cfgSystem','system','text'],
        ['cfgGreeting','greeting','text'],
    ];
    bindings.forEach(([id, key]) => {
        const inp = $(id);
        inp.value = S[key] || '';
        inp.addEventListener('input', () => { S[key] = inp.value; });
    });

    // 密码眼睛
    document.querySelectorAll('.eye').forEach(b => {
        b.addEventListener('click', () => {
            const inp = $(b.dataset.for);
            inp.type = inp.type === 'password' ? 'text' : 'password';
            b.textContent = inp.type === 'password' ? '👁' : '🙈';
        });
    });

    // 测试连接
    $('testApi').addEventListener('click', testConnection);

    // 清空对话
    $('clearChat').addEventListener('click', () => {
        if (!confirm('确定清空所有对话？')) return;
        S.history = [];
        S.started = false;
        $('messages').innerHTML = '';
        $('welcome').style.display = '';
        close();
        toast('对话已清空', 'ok');
    });

    // 应用设置
    $('applySettings').addEventListener('click', () => {
        saveState();
        applyAll();
        close();
        // 更新顶栏角色名
        $('topbarChar').textContent = S.charName;
        toast('✓ 设置已应用', 'ok');
    });
}

// ==========================================
//  背景
// ==========================================
function initBg() {
    const zone = $('bgUploadZone');
    const file = $('bgFile');

    zone.addEventListener('click', () => file.click());
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.style.borderColor = 'var(--gold)';
    });
    zone.addEventListener('dragleave', () => {
        zone.style.borderColor = '';
    });
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.style.borderColor = '';
        const f = e.dataTransfer.files[0];
        if (f && f.type.startsWith('image/')) loadBgFile(f);
    });
    file.addEventListener('change', e => {
        const f = e.target.files[0];
        if (f) loadBgFile(f);
    });

    function loadBgFile(f) {
        // 限制文件大小 5MB
        if (f.size > 5 * 1024 * 1024) {
            toast('图片太大，请选择5MB以内的图片', 'err');
            return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
            S.bgImageData = ev.target.result;
            S.bgType = 'image';
            applyBg();
            toast('✓ 背景已更新', 'ok');
            try { localStorage.setItem('tb-bg', ev.target.result); } catch(e) {}
        };
        reader.readAsDataURL(f);
    }

    // 预设
    document.querySelectorAll('.bp').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.bp').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            S.bgGradient = b.dataset.g;
            S.bgType = 'gradient';
            S.bgImageData = null;
            applyBg();
            try {
                localStorage.setItem('tb-bg-type', 'gradient');
                localStorage.setItem('tb-bg-grad', b.dataset.g);
                localStorage.removeItem('tb-bg');
            } catch(e) {}
            toast('✓ 已应用背景', 'ok');
        });
    });

    // 清除
    $('bgClear').addEventListener('click', () => {
        S.bgType = 'gradient';
        S.bgGradient = 'linear-gradient(135deg,#0c0c14,#1a1a2e)';
        S.bgImageData = null;
        document.querySelectorAll('.bp').forEach(x => x.classList.remove('active'));
        applyBg();
        try {
            localStorage.removeItem('tb-bg');
            localStorage.setItem('tb-bg-type', 'gradient');
        } catch(e) {}
        toast('背景已清除', '');
    });

    // 维度滑块实时更新
    ['cfgDim','cfgBlur','cfgBubble'].forEach(id => {
        $(id).addEventListener('input', applyBg);
    });
}

function applyBg() {
    const layer = $('bgLayer');
    const dim = +($('cfgDim').value);
    const blur = +($('cfgBlur').value);

    S.bgDim = dim;
    S.bgBlur = blur;
    S.bubbleOpacity = +($('cfgBubble').value);

    if (S.bgType === 'image' && S.bgImageData) {
        layer.style.backgroundImage = `
            linear-gradient(rgba(0,0,0,${dim/100}),rgba(0,0,0,${dim/100})),
            url('${S.bgImageData}')
        `;
        layer.style.backgroundSize = 'cover';
        layer.style.backgroundPosition = 'center';
        layer.style.filter = blur > 0 ? `blur(${blur}px)` : '';
    } else {
        layer.style.backgroundImage = `
            linear-gradient(rgba(0,0,0,${dim/100}),rgba(0,0,0,${dim/100})),
            ${S.bgGradient}
        `;
        layer.style.backgroundSize = '';
        layer.style.backgroundPosition = '';
        layer.style.filter = '';
    }
}

// ==========================================
//  滑块
// ==========================================
function initSliders() {
    const map = [
        ['cfgTemp','svTemp','temperature',2],
        ['cfgMax','svMax','maxTokens',0],
        ['cfgCtx','svCtx','contextRounds',0],
        ['cfgDim','svDim','bgDim',0],
        ['cfgBlur','svBlur','bgBlur',0],
        ['cfgBubble','svBubble','bubbleOpacity',0],
    ];
    map.forEach(([sid, vid, key, dec]) => {
        const s = $(sid), v = $(vid);
        if (!s || !v) return;
        s.value = S[key];
        const upd = () => {
            const val = +s.value;
            v.textContent = dec ? val.toFixed(dec) : Math.round(val);
            S[key] = val;
            const pct = (val - s.min) / (s.max - s.min) * 100;
            s.style.background = `linear-gradient(to right,var(--gold) ${pct}%,var(--b1) ${pct}%)`;
        };
        s.addEventListener('input', upd);
        upd();
    });
}

// ==========================================
//  气泡风格
// ==========================================
function initStyleBtns() {
    document.querySelectorAll('.style-btn').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.style-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            S.bubbleStyle = b.dataset.style;
            applyBubbleStyle();
        });
    });
}

function applyBubbleStyle() {
    const msgs = $('messages');
    msgs.className = `messages bubble-style-${S.bubbleStyle}`;
}

// ==========================================
//  应用所有设置
// ==========================================
function applyAll() {
    $('topbarChar').textContent = S.charName;
    applyBg();
    applyBubbleStyle();

    // 同步侧边栏输入框
    const fields = {
        cfgProxy: 'proxy', cfgKey: 'key', cfgModel: 'model',
        cfgUserName: 'userName', cfgCharName: 'charName',
        cfgSystem: 'system', cfgGreeting: 'greeting',
    };
    Object.entries(fields).forEach(([id, key]) => {
        if ($(id)) $(id).value = S[key] || '';
    });
}

// ==========================================
//  对话输入
// ==========================================
function initInput() {
    const inp = $('userInput');
    const btn = $('sendBtn');

    // 自动撑高
    inp.addEventListener('input', () => {
        inp.style.height = 'auto';
        inp.style.height = Math.min(inp.scrollHeight, 140) + 'px';
        $('inputCount').textContent = `${inp.value.length} / 4000`;
    });

    // Enter 发送，Shift+Enter 换行
    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!S.thinking) sendMessage();
        }
    });

    btn.addEventListener('click', () => {
        if (!S.thinking) sendMessage();
    });

    // 新对话按钮
    $('newChat').addEventListener('click', () => {
        if (S.history.length > 0 && !confirm('开始新对话？当前对话将被清除。')) return;
        S.history = [];
        S.started = false;
        $('messages').innerHTML = '';
        $('welcome').style.display = '';
        applyBubbleStyle();
    });

    // 开始对话按钮
    $('startBtn').addEventListener('click', startChat);
}

function initChat() {
    // 如果有历史记录，恢复显示
    if (S.history.length > 0) {
        S.started = true;
        $('welcome').style.display = 'none';
        S.history.forEach(msg => {
            if (msg.role !== 'system') {
                appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content, false);
            }
        });
        scrollToBottom();
    }
    applyBubbleStyle();
}

// ==========================================
//  开始对话（显示开场白）
// ==========================================
function startChat() {
    if (!S.proxy || !S.key) {
        // 没配置API，还是可以显示开场白
        $('welcome').style.display = 'none';
        S.started = true;
        if (S.greeting) {
            appendMessage('ai', S.greeting);
            // 不加入history，开场白不作为对话历史
        }
        return;
    }
    $('welcome').style.display = 'none';
    S.started = true;
    if (S.greeting) {
        appendMessage('ai', S.greeting);
    }
}

// ==========================================
//  发送消息
// ==========================================
async function sendMessage() {
    const inp = $('userInput');
    const text = inp.value.trim();
    if (!text) return;

    // 检查API配置
    if (!S.proxy || !S.key) {
        toast('请先在设置里填写代理地址和API密钥 →', 'warn');
        // 自动打开侧边栏
        $('sidebar').classList.add('open');
        $('sidebarMask').classList.add('show');
        $('main').classList.add('blurred');
        return;
    }

    if (!S.started) {
        $('welcome').style.display = 'none';
        S.started = true;
    }

    // 显示用户消息
    inp.value = '';
    inp.style.height = 'auto';
    $('inputCount').textContent = '0 / 4000';
    appendMessage('user', text);

    // 加入历史
    S.history.push({ role: 'user', content: text });

    // 开始请求
    setThinking(true);
    const dotEl = appendTypingDots();

    try {
        const reply = await callAPI();
        dotEl.remove();
        appendMessage('ai', reply);
        S.history.push({ role: 'assistant', content: reply });
        saveState();
    } catch (err) {
        dotEl.remove();
        const errMsg = parseError(err);
        appendMessage('ai', `⚠️ ${errMsg}`, false, true);
        toast(errMsg, 'err');
        // 移除失败的用户消息（避免上下文混乱）
        S.history.pop();
    } finally {
        setThinking(false);
    }
}

// ==========================================
//  调用 API（支持流式输出）
// ==========================================
async function callAPI() {
    // 构建消息列表
    const messages = [];

    // 系统提示词
    if (S.system) {
        messages.push({ role: 'system', content: S.system });
    }

    // 取最近 N 轮对话作为上下文
    const maxHistory = S.contextRounds * 2;
    const historySlice = S.history.slice(-maxHistory);
    messages.push(...historySlice);

    const url = `${S.proxy.replace(/\/+$/, '')}/chat/completions`;

    const body = {
        model: S.model,
        messages,
        temperature: S.temperature,
        max_tokens: Math.round(S.maxTokens),
        stream: true,
    };

    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${S.key}`,
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errText}`);
    }

    // 流式读取
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let msgEl = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;

            let parsed;
            try { parsed = JSON.parse(data); } catch { continue; }

            const delta = parsed?.choices?.[0]?.delta?.content || '';
            if (!delta) continue;

            fullText += delta;

            // 首次收到内容时，移除打字动画，创建消息气泡
            if (!msgEl) {
                // 移除打字点（已在调用前处理，这里确保）
                const dots = document.querySelector('.typing-msg');
                if (dots) dots.remove();
                msgEl = createStreamBubble();
            }

            // 更新气泡内容（带光标）
            updateStreamBubble(msgEl, fullText);
        }
    }

    // 移除光标
    if (msgEl) finalizeStreamBubble(msgEl, fullText);

    return fullText;
}

// ==========================================
//  流式气泡辅助
// ==========================================
function createStreamBubble() {
    const msgs = $('messages');
    const wrap = document.createElement('div');
    wrap.className = 'msg ai';
    wrap.innerHTML = `
        <span class="msg-name">${escHtml(S.charName)}</span>
        <div class="bubble"><span class="stream-content"></span><span class="cursor"></span></div>
        <span class="msg-time">${nowTime()}</span>
    `;
    msgs.appendChild(wrap);
    scrollToBottom();
    return wrap;
}

function updateStreamBubble(wrap, text) {
    const content = wrap.querySelector('.stream-content');
    if (content) content.innerHTML = formatMsg(text);
    scrollToBottom();
}

function finalizeStreamBubble(wrap, text) {
    const bubble = wrap.querySelector('.bubble');
    const cursor = wrap.querySelector('.cursor');
    if (cursor) cursor.remove();
    if (bubble) bubble.innerHTML = formatMsg(text);
    scrollToBottom();
}

// ==========================================
//  渲染消息气泡
// ==========================================
function appendMessage(role, text, animate = true, isError = false) {
    const msgs = $('messages');
    const isAi = role === 'ai' || role === 'assistant';
    const name = isAi ? S.charName : S.userName;

    const wrap = document.createElement('div');
    wrap.className = `msg ${isAi ? 'ai' : 'user'}`;
    if (!animate) wrap.style.animation = 'none';

    wrap.innerHTML = `
        <span class="msg-name">${escHtml(name)}</span>
        <div class="bubble${isError ? ' error-bubble' : ''}">${formatMsg(text)}</div>
        <span class="msg-time">${nowTime()}</span>
    `;

    msgs.appendChild(wrap);
    scrollToBottom();
    return wrap;
}

function appendTypingDots() {
    const msgs = $('messages');
    const wrap = document.createElement('div');
    wrap.className = 'msg ai typing-msg';
    wrap.style.animation = 'none';
    wrap.innerHTML = `
        <span class="msg-name">${escHtml(S.charName)}</span>
        <div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
    `;
    msgs.appendChild(wrap);
    scrollToBottom();
    return wrap;
}

// ==========================================
//  格式化消息文本
// ==========================================
function formatMsg(text) {
    // 转义HTML
    let t = escHtml(text);
    // *动作描写* → <em>
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // **加粗**
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 换行
    t = t.replace(/\n/g, '<br>');
    return t;
}

function escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

// ==========================================
//  测试连接
// ==========================================
async function testConnection() {
    const btn = $('testApi');
    const proxy = $('cfgProxy').value.trim();
    const key = $('cfgKey').value.trim();
    const model = $('cfgModel').value.trim() || 'gpt-4o';

    if (!proxy || !key) {
        toast('请先填写代理地址和密钥', 'warn');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⟳ 测试中…';

    try {
        const url = `${proxy.replace(/\/+$/, '')}/chat/completions`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Hi, reply "ok" only.' }],
                max_tokens: 5,
                stream: false,
            }),
        });

        if (resp.ok) {
            const data = await resp.json();
            const reply = data?.choices?.[0]?.message?.content || '收到回复';
            toast(`✓ 连接成功！模型回复：${reply.slice(0,30)}`, 'ok');
            // 同步到S
            S.proxy = proxy;
            S.key = key;
            S.model = model;
        } else {
            const errText = await resp.text();
            toast(`✗ HTTP ${resp.status}：${errText.slice(0,60)}`, 'err');
        }
    } catch (e) {
        toast(`✗ 请求失败：${e.message.slice(0,60)}`, 'err');
    } finally {
        btn.disabled = false;
        btn.textContent = '✓ 测试连接';
    }
}

// ==========================================
//  工具
// ==========================================
function setThinking(v) {
    S.thinking = v;
    $('sendBtn').disabled = v;
    const status = $('topbarStatus');
    if (v) {
        status.textContent = '● 思考中…';
        status.className = 'topbar-status thinking';
    } else {
        status.textContent = '● 就绪';
        status.className = 'topbar-status';
    }
}

function scrollToBottom() {
    const area = $('chatArea');
    requestAnimationFrame(() => {
        area.scrollTop = area.scrollHeight;
    });
}

function nowTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}

function parseError(err) {
    const msg = err.message || String(err);
    if (msg.includes('401')) return '密钥无效或已过期，请检查API Key';
    if (msg.includes('403')) return '无权限访问，请检查密钥权限';
    if (msg.includes('429')) return '请求太频繁，稍后再试';
    if (msg.includes('500')) return '服务器错误，请稍后再试';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return '网络连接失败，请检查代理地址';
    if (msg.includes('CORS')) return 'CORS跨域错误，请确认代理支持跨域';
    return msg.slice(0, 80);
}

function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = `toast${type ? ' ' + type : ''}`;
    t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3200);
}

// ==========================================
//  本地存储（保存/读取状态）
// ==========================================
function saveState() {
    try {
        const save = {
            proxy: S.proxy, key: S.key, model: S.model,
            userName: S.userName, charName: S.charName,
            system: S.system, greeting: S.greeting,
            temperature: S.temperature, maxTokens: S.maxTokens,
            contextRounds: S.contextRounds,
            bgDim: S.bgDim, bgBlur: S.bgBlur,
            bubbleOpacity: S.bubbleOpacity, bubbleStyle: S.bubbleStyle,
            bgType: S.bgType, bgGradient: S.bgGradient,
            history: S.history.slice(-100), // 最多保存100条
        };
        localStorage.setItem('tavern-state', JSON.stringify(save));
        if (S.bgImageData) {
            localStorage.setItem('tb-bg', S.bgImageData);
        }
    } catch(e) {
        // localStorage 满了也不崩溃
        console.warn('保存失败', e);
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem('tavern-state');
        if (raw) {
            const saved = JSON.parse(raw);
            Object.assign(S, saved);
        }
        // 读取背景图
        const savedBg = localStorage.getItem('tb-bg');
        if (savedBg) {
            S.bgImageData = savedBg;
            S.bgType = 'image';
        }
    } catch(e) {
        console.warn('读取失败', e);
    }
}
