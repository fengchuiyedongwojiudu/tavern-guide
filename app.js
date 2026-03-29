const els = {
  sidebar: document.getElementById("sidebar"),
  toggleSidebar: document.getElementById("toggleSidebar"),
  apiBase: document.getElementById("apiBase"),
  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  systemPrompt: document.getElementById("systemPrompt"),
  userName: document.getElementById("userName"),
  charName: document.getElementById("charName"),
  saveSettings: document.getElementById("saveSettings"),
  testApi: document.getElementById("testApi"),
  clearChat: document.getElementById("clearChat"),
  bgUpload: document.getElementById("bgUpload"),
  bg: document.getElementById("bg"),
  messages: document.getElementById("messages"),
  userInput: document.getElementById("userInput"),
  sendBtn: document.getElementById("sendBtn"),
  status: document.getElementById("status"),
  chatTitle: document.getElementById("chatTitle"),
};

let chatHistory = [];
let sending = false;

// 初始化
init();

function init() {
  loadSettings();
  loadChat();
  bindEvents();
  renderAllMessages();
  updateTitle();
}

function bindEvents() {
  els.toggleSidebar.addEventListener("click", () => {
    els.sidebar.classList.toggle("open");
  });

  els.saveSettings.addEventListener("click", () => {
    saveSettings();
    updateTitle();
    alert("设置已保存");
  });

  els.testApi.addEventListener("click", testApiConnection);

  els.clearChat.addEventListener("click", () => {
    if (!confirm("确定清空聊天记录吗？")) return;
    chatHistory = [];
    saveChat();
    renderAllMessages();
  });

  els.bgUpload.addEventListener("change", handleBgUpload);

  els.sendBtn.addEventListener("click", sendMessage);

  els.userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

function updateTitle() {
  els.chatTitle.textContent = els.charName.value || "简易酒馆";
}

function saveSettings() {
  const settings = {
    apiBase: els.apiBase.value.trim(),
    apiKey: els.apiKey.value.trim(),
    model: els.model.value.trim(),
    systemPrompt: els.systemPrompt.value,
    userName: els.userName.value.trim(),
    charName: els.charName.value.trim(),
    bgImage: localStorage.getItem("bgImage") || "",
  };
  localStorage.setItem("tavernSettings", JSON.stringify(settings));
}

function loadSettings() {
  const raw = localStorage.getItem("tavernSettings");
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    els.apiBase.value = s.apiBase || "";
    els.apiKey.value = s.apiKey || "";
    els.model.value = s.model || "gpt-4o-mini";
    els.systemPrompt.value = s.systemPrompt || "";
    els.userName.value = s.userName || "我";
    els.charName.value = s.charName || "酒馆老板娘";
    if (s.bgImage) {
      els.bg.style.backgroundImage = `url("${s.bgImage}")`;
    }
  } catch (e) {
    console.error("加载设置失败", e);
  }
}

function saveChat() {
  localStorage.setItem("tavernChat", JSON.stringify(chatHistory));
}

function loadChat() {
  const raw = localStorage.getItem("tavernChat");
  if (!raw) return;
  try {
    chatHistory = JSON.parse(raw) || [];
  } catch (e) {
    console.error("加载聊天失败", e);
  }
}

function renderAllMessages() {
  els.messages.innerHTML = "";
  chatHistory.forEach(msg => appendMessage(msg.role, msg.content, false));
  scrollToBottom();
}

function appendMessage(role, content, save = true) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = content;
  els.messages.appendChild(div);

  if (save) {
    chatHistory.push({ role, content });
    saveChat();
  }

  scrollToBottom();
}

function scrollToBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function handleBgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    els.bg.style.backgroundImage = `url("${dataUrl}")`;
    localStorage.setItem("bgImage", dataUrl);

    const raw = localStorage.getItem("tavernSettings");
    let s = {};
    try { s = raw ? JSON.parse(raw) : {}; } catch {}
    s.bgImage = dataUrl;
    localStorage.setItem("tavernSettings", JSON.stringify(s));
  };
  reader.readAsDataURL(file);
}

async function testApiConnection() {
  const apiBase = els.apiBase.value.trim();
  const apiKey = els.apiKey.value.trim();
  const model = els.model.value.trim();

  if (!apiBase || !apiKey || !model) {
    alert("请先填写代理地址、API Key 和模型名");
    return;
  }

  els.status.textContent = "测试中...";

  try {
    const res = await fetch(apiBase.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "user", content: "请只回复：连接成功" }
        ],
        temperature: 0.7,
        max_tokens: 20,
        stream: false
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    els.status.textContent = "连接正常";
    alert("连接成功：" + (data.choices?.[0]?.message?.content || "已收到返回"));
  } catch (err) {
    console.error(err);
    els.status.textContent = "连接失败";
    alert("连接失败：\n" + err.message + "\n\n如果提示 Failed to fetch，多半是你的中转不支持浏览器跨域 CORS。");
  }
}

async function sendMessage() {
  if (sending) return;

  const text = els.userInput.value.trim();
  if (!text) return;

  const apiBase = els.apiBase.value.trim();
  const apiKey = els.apiKey.value.trim();
  const model = els.model.value.trim();
  const systemPrompt = els.systemPrompt.value.trim();
  const userName = els.userName.value.trim() || "我";
  const charName = els.charName.value.trim() || "助手";

  if (!apiBase || !apiKey || !model) {
    alert("请先填写 API 设置");
    return;
  }

  appendMessage("user", `${userName}：${text}`);
  els.userInput.value = "";
  sending = true;
  els.sendBtn.disabled = true;
  els.status.textContent = "思考中...";

  const loadingId = "loading-" + Date.now();
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai";
  loadingDiv.id = loadingId;
  loadingDiv.textContent = `${charName}：正在思考……`;
  els.messages.appendChild(loadingDiv);
  scrollToBottom();

  try {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    // 把历史记录转回标准 role
    const recent = chatHistory.slice(-20);
    for (const item of recent) {
      if (item.role === "user") {
        const content = item.content.replace(new RegExp("^" + escapeReg(userName) + "："), "");
        messages.push({ role: "user", content });
      } else if (item.role === "ai") {
        const content = item.content.replace(new RegExp("^" + escapeReg(charName) + "："), "");
        messages.push({ role: "assistant", content });
      }
    }

    // 当前用户消息
    messages.push({ role: "user", content: text });

    const res = await fetch(apiBase.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8,
        max_tokens: 1024,
        stream: false
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    document.getElementById(loadingId)?.remove();

    const reply = data.choices?.[0]?.message?.content || "（没有返回内容）";
    appendMessage("ai", `${charName}：${reply}`);
    els.status.textContent = "已连接";
  } catch (err) {
    console.error(err);
    document.getElementById(loadingId)?.remove();
    appendMessage("system", "发送失败：" + err.message);
    els.status.textContent = "发送失败";
  } finally {
    sending = false;
    els.sendBtn.disabled = false;
  }
}

function escapeReg(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
