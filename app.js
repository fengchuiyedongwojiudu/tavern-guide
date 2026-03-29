// ============================================
//  酒馆设置指南 · 交互逻辑
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // -------- 日期与问候 --------
    const now = new Date();
    const h = now.getHours();
    const greetings = [
        [0,  '夜 深 了'],  [6,  '早 上 好'],  [9,  '上 午 好'],
        [12, '中 午 好'],  [14, '下 午 好'],  [18, '傍 晚 好'],
        [20, '晚 上 好'],  [23, '夜 深 了']
    ];
    let g = '你 好';
    for (let i = greetings.length - 1; i >= 0; i--) {
        if (h >= greetings[i][0]) { g = greetings[i][1]; break; }
    }
    document.getElementById('greeting').textContent = g;
    document.getElementById('heroDay').textContent = now.getDate();

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    document.getElementById('heroMonth').textContent = `${months[now.getMonth()]} · ${days[now.getDay()]}`;

    // 数字动画
    setTimeout(() => {
        document.querySelectorAll('.stat-num').forEach(el => {
            const target = +el.dataset.target;
            const start = performance.now();
            const dur = 1100;
            (function tick(t) {
                const p = Math.min((t - start) / dur, 1);
                el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
                if (p < 1) requestAnimationFrame(tick);
            })(start);
        });
    }, 1000);

    // -------- 粒子背景 --------
    const cvs = document.getElementById('particles');
    const ctx = cvs.getContext('2d');
    let dots = [];

    function resizeCvs() {
        cvs.width = innerWidth;
        cvs.height = innerHeight;
    }

    function initDots() {
        resizeCvs();
        dots = [];
        const n = Math.min(Math.floor(cvs.width * cvs.height / 28000), 35);
        for (let i = 0; i < n; i++) {
            dots.push({
                x: Math.random() * cvs.width,
                y: Math.random() * cvs.height,
                r: Math.random() * 1.2 + .4,
                dy: -(Math.random() * .12 + .04),
                dx: (Math.random() - .5) * .08,
                o: Math.random() * .25 + .05,
                ph: Math.random() * 6.28,
                ps: Math.random() * .008 + .004
            });
        }
    }

    function drawDots() {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        dots.forEach(d => {
            d.y += d.dy; d.x += d.dx; d.ph += d.ps;
            if (d.y < -10) { d.y = cvs.height + 10; d.x = Math.random() * cvs.width; }
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, 6.28);
            ctx.fillStyle = `rgba(196,168,130,${d.o * (.5 + .5 * Math.sin(d.ph))})`;
            ctx.fill();
        });
        requestAnimationFrame(drawDots);
    }

    initDots(); drawDots();
    addEventListener('resize', initDots);

    // -------- 卡片滚动出现 --------
    const cards = document.querySelectorAll('.card');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                obs.unobserve(e.target);
            }
        });
    }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
    cards.forEach(c => obs.observe(c));

    // -------- 卡片展开 / 折叠 --------
    document.querySelectorAll('.card-arrow').forEach(btn => {
        btn.addEventListener('click', () => toggle(btn));
    });
    document.querySelectorAll('.card-title').forEach(t => {
        t.addEventListener('click', () => toggle(t.closest('.card').querySelector('.card-arrow')));
    });

    function toggle(btn) {
        const body = btn.closest('.card').querySelector('.card-body');
        const open = body.classList.toggle('open');
        btn.classList.toggle('open', open);
    }

    // -------- 滑块 --------
    const sliders = {
        temperature: 'tempVal', topP: 'topPVal', maxTokens: 'maxTVal',
        freqPen: 'freqVal', presPen: 'presVal', ctxSize: 'ctxVal',
        bgBlur: 'blurVal', bgDim: 'dimVal', bubbleOpacity: 'bubbleVal'
    };

    Object.entries(sliders).forEach(([id, vid]) => {
        const s = document.getElementById(id);
        const v = document.getElementById(vid);
        if (!s || !v) return;
        const upd = () => {
            const val = +s.value;
            v.textContent = (['maxTokens','ctxSize','bgBlur','bgDim','bubbleOpacity'].includes(id)) ? Math.round(val) : val.toFixed(2);
            const pct = (val - s.min) / (s.max - s.min) * 100;
            s.style.background = `linear-gradient(to right,var(--gold) ${pct}%,var(--b1) ${pct}%)`;
            // 实时更新背景预览
            if (['bgBlur','bgDim','bubbleOpacity'].includes(id)) updateBgPreview();
        };
        s.addEventListener('input', upd);
        upd();
    });

    // -------- 文本框字数 --------
    document.querySelectorAll('.counter').forEach(c => {
        const ta = document.getElementById(c.dataset.for);
        if (!ta) return;
        const upd = () => c.textContent = ta.value.length + ' 字符';
        ta.addEventListener('input', upd);
        upd();
    });

    // -------- 复制按钮 --------
    document.querySelectorAll('.copy-btn').forEach(b => {
        b.addEventListener('click', () => {
            const ta = document.getElementById(b.dataset.for);
            if (!ta) return;
            navigator.clipboard.writeText(ta.value).then(
                () => toast('✓ 已复制', 'ok'),
                () => { ta.select(); document.execCommand('copy'); toast('✓ 已复制', 'ok'); }
            );
        });
    });

    // -------- 密码切换 --------
    document.querySelectorAll('.eye-btn').forEach(b => {
        b.addEventListener('click', () => {
            const inp = document.getElementById(b.dataset.for);
            inp.type = inp.type === 'password' ? 'text' : 'password';
            b.textContent = inp.type === 'password' ? '👁' : '🙈';
        });
    });

    // -------- 分类筛选 --------
    const tabBtns = document.querySelectorAll('.tab');
    const tlMonths = document.querySelectorAll('.tl-month');
    tabBtns.forEach(b => {
        b.addEventListener('click', () => {
            const cat = b.dataset.cat;
            tabBtns.forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            cards.forEach(c => {
                if (cat === 'all' || c.dataset.cat === cat) {
                    c.classList.remove('hidden');
                    setTimeout(() => c.classList.add('visible'), 30);
                } else {
                    c.classList.add('hidden');
                    c.classList.remove('visible');
                }
            });
            tlMonths.forEach(m => m.style.display = cat === 'all' ? '' : 'none');
        });
    });

    // -------- 搜索 --------
    let sto;
    document.getElementById('searchInput').addEventListener('input', e => {
        clearTimeout(sto);
        sto = setTimeout(() => {
            const q = e.target.value.toLowerCase().trim();
            tabBtns.forEach(x => x.classList.remove('active'));
            document.querySelector('.tab[data-cat="all"]').classList.add('active');
            tlMonths.forEach(m => m.style.display = q ? 'none' : '');
            cards.forEach(c => {
                if (!q || c.textContent.toLowerCase().includes(q)) {
                    c.classList.remove('hidden');
                    c.classList.add('visible');
                } else {
                    c.classList.add('hidden');
                }
            });
        }, 180);
    });

    // -------- 预设 Chips --------
    document.querySelectorAll('.chip').forEach(c => {
        c.addEventListener('click', () => {
            if (c.dataset.t) { const s = document.getElementById('temperature'); s.value = c.dataset.t; s.dispatchEvent(new Event('input')); }
            if (c.dataset.p) { const s = document.getElementById('topP'); s.value = c.dataset.p; s.dispatchEvent(new Event('input')); }
            toast('✓ 已应用预设 ' + c.textContent.trim(), 'ok');
        });
    });

    // -------- 测试连接 --------
    const testBtn = document.getElementById('testBtn');
    testBtn && testBtn.addEventListener('click', () => {
        testBtn.disabled = true;
        testBtn.textContent = '⟳ 测试中…';
        setTimeout(() => {
            testBtn.disabled = false;
            testBtn.textContent = '✓ 测试连接';
            toast(document.getElementById('apiKey').value ? '✓ 连接成功（模拟）' : '✗ 请先填写密钥', document.getElementById('apiKey').value ? 'ok' : 'err');
        }, 1200);
    });

    // -------- 回到顶部 --------
    const fab = document.getElementById('fabTop');
    addEventListener('scroll', () => fab.classList.toggle('show', scrollY > 350));
    fab.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

    // ============================================
    //  ★★ 聊天背景功能 ★★
    // ============================================
    const bgPreview   = document.getElementById('bgPreview');
    const bgImage     = document.getElementById('bgImage');
    const bgPlaceholder = document.getElementById('bgPlaceholder');
    const bgFileInput = document.getElementById('bgFileInput');
    const mockChat    = document.getElementById('mockChat');
    let currentBgType = 'none'; // 'none' | 'image' | 'gradient'

    // 点击预览区上传
    bgPreview.addEventListener('click', e => {
        if (e.target.closest('.mock-bubble')) return;
        bgFileInput.click();
    });

    // 上传按钮
    document.getElementById('bgUploadBtn').addEventListener('click', () => bgFileInput.click());

    // 文件选择
    bgFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        loadBgFile(file);
    });

    // 拖拽上传
    bgPreview.addEventListener('dragover', e => { e.preventDefault(); bgPreview.style.borderColor = 'var(--gold)'; });
    bgPreview.addEventListener('dragleave', () => { bgPreview.style.borderColor = ''; });
    bgPreview.addEventListener('drop', e => {
        e.preventDefault();
        bgPreview.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) loadBgFile(file);
    });

    function loadBgFile(file) {
        const reader = new FileReader();
        reader.onload = ev => {
            bgImage.src = ev.target.result;
            bgImage.style.display = 'block';
            bgPlaceholder.style.opacity = '0';
            mockChat.style.display = 'flex';
            bgPreview.style.background = 'var(--bg-in)';
            currentBgType = 'image';
            updateBgPreview();
            toast('✓ 背景已加载', 'ok');

            // 存入 localStorage
            try { localStorage.setItem('tavern-bg', ev.target.result); } catch(e) {}
        };
        reader.readAsDataURL(file);
    }

    // 清除背景
    document.getElementById('bgClearBtn').addEventListener('click', () => {
        bgImage.src = '';
        bgImage.style.display = 'none';
        bgPlaceholder.style.opacity = '1';
        mockChat.style.display = 'none';
        bgPreview.style.background = 'var(--bg-in)';
        currentBgType = 'none';
        document.querySelectorAll('.preset-bg').forEach(p => p.classList.remove('active'));
        try { localStorage.removeItem('tavern-bg'); localStorage.removeItem('tavern-bg-type'); } catch(e) {}
        toast('背景已清除', '');
    });

    // 预设背景
    document.querySelectorAll('.preset-bg').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-bg').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const grad = btn.dataset.bg;
            bgImage.style.display = 'none';
            bgPlaceholder.style.opacity = '0';
            mockChat.style.display = 'flex';
            bgPreview.style.background = grad;
            currentBgType = 'gradient';
            updateBgPreview();
            try {
                localStorage.setItem('tavern-bg-type', 'gradient');
                localStorage.setItem('tavern-bg-gradient', grad);
                localStorage.removeItem('tavern-bg');
            } catch(e) {}
            toast('✓ 已应用预设背景', 'ok');
        });
    });

    // 实时更新预览效果
    function updateBgPreview() {
        const blur = document.getElementById('bgBlur').value;
        const dim  = document.getElementById('bgDim').value;
        const bub  = document.getElementById('bubbleOpacity').value;

        if (currentBgType === 'image') {
            bgImage.style.filter = `blur(${blur}px) brightness(${1 - dim / 100})`;
        } else if (currentBgType === 'gradient') {
            // gradient 的暗度靠叠一层遮罩
            bgPreview.style.setProperty('--dim', dim / 100);
        }

        // 气泡透明度
        const aiAlpha  = (.15 + .55 * bub / 100).toFixed(2);
        const userAlpha = (.08 + .12 * bub / 100).toFixed(2);
        document.querySelectorAll('.mock-bubble.ai').forEach(b => {
            b.style.background = `rgba(30,30,30,${aiAlpha})`;
        });
        document.querySelectorAll('.mock-bubble.user').forEach(b => {
            b.style.background = `rgba(196,168,130,${userAlpha})`;
        });
    }

    // 加载已保存的背景
    try {
        const savedBg = localStorage.getItem('tavern-bg');
        const savedType = localStorage.getItem('tavern-bg-type');
        if (savedBg) {
            bgImage.src = savedBg;
            bgImage.style.display = 'block';
            bgPlaceholder.style.opacity = '0';
            mockChat.style.display = 'flex';
            currentBgType = 'image';
            updateBgPreview();
        } else if (savedType === 'gradient') {
            const grad = localStorage.getItem('tavern-bg-gradient');
            if (grad) {
                bgImage.style.display = 'none';
                bgPlaceholder.style.opacity = '0';
                mockChat.style.display = 'flex';
                bgPreview.style.background = grad;
                currentBgType = 'gradient';
                updateBgPreview();
            }
        }
    } catch(e) {}

    // -------- 导出 / 导入 / 重置 --------
    document.getElementById('exportBtn').addEventListener('click', () => {
        const data = {
            note: 'SillyTavern Settings Guide Export',
            timestamp: new Date().toISOString(),
            api: { type: val('apiType') },
            model: { selected: val('modelSelect') },
            sampler: { temperature: nval('temperature'), topP: nval('topP'), maxTokens: nval('maxTokens') },
            prompts: { system: val('sysPrompt'), nsfw: val('nsfwPrompt'), jailbreak: val('jbPrompt') },
            persona: { name: val('userName'), description: val('personaDesc') },
            chat: { bgBlur: nval('bgBlur'), bgDim: nval('bgDim'), bubbleOpacity: nval('bubbleOpacity') }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tavern-settings.json';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('✓ 已导出', 'ok');
    });

    document.getElementById('importBtn').addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json';
        inp.addEventListener('change', e => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = ev => {
                try { JSON.parse(ev.target.result); toast('✓ 已导入（预览）', 'ok'); }
                catch { toast('✗ 格式错误', 'err'); }
            };
            r.readAsText(f);
        });
        inp.click();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm('确定重置所有设置？')) {
            localStorage.clear();
            location.reload();
        }
    });

    // -------- 工具函数 --------
    function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
    function nval(id) { return parseFloat(val(id)) || 0; }
    function toast(msg, type) {
        const t = document.createElement('div');
        t.className = 'toast' + (type ? ' ' + type : '');
        t.textContent = msg;
        document.getElementById('toasts').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
});
