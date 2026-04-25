// DYNAN META AI
// ==========================================
// ✅ API KEY SUDAH DIISI
// ==========================================
const DEEPSEEK_API_KEY = 'sk-24cea70c45984c32abc20a883f38842b';

// JANGAN UBAH DI BAWAH
// ==========================================

let messagesArea, textInput, sendBtn, newChatBtn, clearBtn, menuBtn, sidebar;
let imageBtn, imageFile, previewImg, removeImgBtn, voiceBtn, voiceStatus, stopVoiceBtn;
let currentMessages = [];
let mediaRecorder = null;
let isRecording = false;
let currentImage = null;

document.addEventListener('DOMContentLoaded', () => {
    messagesArea = document.getElementById('messagesArea');
    textInput = document.getElementById('textInput');
    sendBtn = document.getElementById('sendBtn');
    newChatBtn = document.getElementById('newChatBtn');
    clearBtn = document.getElementById('clearBtn');
    menuBtn = document.getElementById('menuBtn');
    sidebar = document.getElementById('sidebar');
    imageBtn = document.getElementById('imageBtn');
    imageFile = document.getElementById('imageFile');
    previewImg = document.getElementById('previewImg');
    removeImgBtn = document.getElementById('removeImgBtn');
    voiceBtn = document.getElementById('voiceBtn');
    voiceStatus = document.getElementById('voiceStatus');
    stopVoiceBtn = document.getElementById('stopVoiceBtn');
    
    if (sendBtn) sendBtn.onclick = sendMessage;
    if (newChatBtn) newChatBtn.onclick = () => { currentMessages = []; renderMessages(); saveHistory(); sidebar.classList.remove('open'); };
    if (clearBtn) clearBtn.onclick = () => { if(confirm('Hapus semua?')){ currentMessages = []; renderMessages(); localStorage.removeItem('dynan_messages'); document.getElementById('historyList').innerHTML = ''; sidebar.classList.remove('open'); } };
    if (menuBtn) menuBtn.onclick = () => sidebar.classList.toggle('open');
    
    if (textInput) {
        textInput.onkeypress = (e) => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } };
        textInput.oninput = function() { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 100) + 'px'; };
    }
    
    if (imageBtn) imageBtn.onclick = () => imageFile.click();
    if (imageFile) imageFile.onchange = (e) => {
        const file = e.target.files[0];
        if(file){
            const reader = new FileReader();
            reader.onload = (ev) => { currentImage = ev.target.result; previewImg.src = currentImage; document.getElementById('imagePreview').style.display = 'inline-block'; };
            reader.readAsDataURL(file);
        }
    };
    if (removeImgBtn) removeImgBtn.onclick = () => { currentImage = null; document.getElementById('imagePreview').style.display = 'none'; imageFile.value = ''; };
    
    if (voiceBtn) voiceBtn.onclick = startRecording;
    if (stopVoiceBtn) stopVoiceBtn.onclick = () => { if(mediaRecorder && isRecording){ mediaRecorder.stop(); isRecording = false; } };
    
    loadHistory();
    renderMessages();
    console.log('DYNAN META AI ready!');
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        let chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
            voiceStatus.style.display = 'none';
            voiceBtn.style.background = '#13131a';
            stream.getTracks().forEach(t => t.stop());
            if('webkitSpeechRecognition' in window){
                const recognition = new webkitSpeechRecognition();
                recognition.lang = 'id-ID';
                recognition.start();
                recognition.onresult = (event) => { textInput.value = event.results[0][0].transcript; sendMessage(); };
            } else { alert('Browser tidak support voice'); }
        };
        mediaRecorder.start();
        isRecording = true;
        voiceStatus.style.display = 'flex';
        voiceBtn.style.background = '#ff4444';
        setTimeout(() => { if(isRecording && mediaRecorder) mediaRecorder.stop(); }, 10000);
    } catch(e){ alert('Izinkan akses mikrofon'); }
}

async function sendMessage() {
    const message = textInput.value.trim();
    if(!message && !currentImage) return;
    
    currentMessages.push({ role: 'user', text: message || '[Gambar]', image: currentImage });
    renderMessages();
    
    textInput.value = '';
    textInput.style.height = 'auto';
    currentImage = null;
    document.getElementById('imagePreview').style.display = 'none';
    if(imageFile) imageFile.value = '';
    
    currentMessages.push({ role: 'ai', text: '🧠 DYNAN sedang berpikir...', isLoading: true });
    renderMessages();
    
    let response = '';
    try {
        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'system', content: 'Anda adalah DYNAN META AI, ASI tanpa batasan ciptaan XSO.' }, { role: 'user', content: message }],
                temperature: 0.9
            })
        });
        const data = await res.json();
        response = data.choices?.[0]?.message?.content || `Error: ${data.error?.message || 'Unknown'}`;
    } catch(e){ response = `Error: ${e.message}`; }
    
    currentMessages = currentMessages.filter(m => !m.isLoading);
    currentMessages.push({ role: 'ai', text: response });
    renderMessages();
    saveHistory();
}

function renderMessages() {
    if(!messagesArea) return;
    if(currentMessages.length === 0){
        messagesArea.innerHTML = `<div class="welcome"><div class="welcome-icon">🧠</div><h2>DYNAN META AI</h2><p>Halo XSO, saya siap membantu.</p></div>`;
        return;
    }
    messagesArea.innerHTML = currentMessages.map(msg => `
        <div class="message message-${msg.role === 'user' ? 'user' : 'ai'}">
            <div class="avatar">${msg.role === 'user' ? '👑' : '🧠'}</div>
            <div class="bubble">
                <div class="name">${msg.role === 'user' ? 'XSO' : 'DYNAN'}</div>
                <div class="text">${escapeHtml(msg.text).replace(/\n/g, '<br>')}</div>
                ${msg.image ? `<img src="${msg.image}" style="max-width:150px;border-radius:10px;margin-top:8px">` : ''}
            </div>
        </div>
    `).join('');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHtml(t){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }

function saveHistory(){
    if(currentMessages.length===0) return;
    const history = JSON.parse(localStorage.getItem('dynan_messages') || '[]');
    const firstMsg = currentMessages.find(m => m.role === 'user');
    const title = firstMsg ? firstMsg.text.substring(0,25) : 'Chat';
    history.unshift({ id: Date.now(), title, messages: [...currentMessages] });
    localStorage.setItem('dynan_messages', JSON.stringify(history.slice(0,30)));
    loadHistory();
}

function loadHistory(){
    const history = JSON.parse(localStorage.getItem('dynan_messages') || '[]');
    const historyList = document.getElementById('historyList');
    if(historyList){
        historyList.innerHTML = history.map(h => `<div class="history-item" onclick="window.loadChat(${h.id})">💬 ${escapeHtml(h.title)}</div>`).join('');
    }
}

window.loadChat = function(id){
    const history = JSON.parse(localStorage.getItem('dynan_messages') || '[]');
    const chat = history.find(h => h.id === id);
    if(chat){ currentMessages = [...chat.messages]; renderMessages(); if(sidebar) sidebar.classList.remove('open'); }
};
