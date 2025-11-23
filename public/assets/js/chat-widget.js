
(function () {
    // 1. Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
    #faq-chat-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: 'Inter', sans-serif;
    }
    #faq-chat-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #047857 0%, #10b981 100%);
      color: white;
      border: none;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      transition: transform 0.3s;
    }
    #faq-chat-btn:hover {
      transform: scale(1.1);
    }
    #faq-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 5px 30px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
      transition: all 0.3s ease;
      border: 1px solid #e5e7eb;
    }
    #faq-chat-window.open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: all;
    }
    .chat-header {
      background: linear-gradient(135deg, #047857 0%, #10b981 100%);
      color: white;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chat-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .chat-body {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .chat-footer {
      padding: 10px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      background: white;
    }
    .chat-input {
      flex: 1;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 20px;
      outline: none;
      font-size: 14px;
    }
    .chat-input:focus {
      border-color: #10b981;
    }
    .chat-send-btn {
      background: #047857;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
    }
    .message {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }
    .message.user {
      align-self: flex-end;
      background: #047857;
      color: white;
      border-bottom-right-radius: 2px;
    }
    .message.bot {
      align-self: flex-start;
      background: white;
      color: #1f2937;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 2px;
    }
    .typing-indicator {
      display: none;
      align-self: flex-start;
      background: white;
      padding: 8px 12px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    @media (max-width: 480px) {
      #faq-chat-window {
        width: calc(100vw - 40px);
        height: 60vh;
        right: 0;
      }
    }
  `;
    document.head.appendChild(style);

    // 2. Inject HTML
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'faq-chat-widget';
    widgetContainer.innerHTML = `
    <div id="faq-chat-window">
      <div class="chat-header">
        <div>
          <h4>Asisten Santri</h4>
          <small style="opacity:0.9; font-size:12px;">Online Otomatis</small>
        </div>
        <button id="close-chat-btn" style="background:none;border:none;color:white;cursor:pointer;font-size:18px;">&times;</button>
      </div>
      <div class="chat-body" id="chat-messages">
        <div class="message bot">
          Assalamu'alaikum! Ada yang bisa saya bantu terkait pendaftaran?
        </div>
        <div class="typing-indicator" id="typing-indicator">Sedang mengetik...</div>
      </div>
      <div class="chat-footer">
        <input type="text" id="chat-input" class="chat-input" placeholder="Ketik pertanyaan..." />
        <button id="chat-send-btn" class="chat-send-btn"><i class="bi bi-send-fill"></i></button>
      </div>
    </div>
    <button id="faq-chat-btn">
      <i class="bi bi-chat-dots-fill"></i>
    </button>
  `;
    document.body.appendChild(widgetContainer);

    // 3. Logic
    const chatBtn = document.getElementById('faq-chat-btn');
    const chatWindow = document.getElementById('faq-chat-window');
    const closeBtn = document.getElementById('close-chat-btn');
    const sendBtn = document.getElementById('chat-send-btn');
    const input = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    function toggleChat() {
        chatWindow.classList.toggle('open');
        if (chatWindow.classList.contains('open')) {
            input.focus();
        }
    }

    chatBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // Add user message
        appendMessage(text, 'user');
        input.value = '';

        // Show typing
        typingIndicator.style.display = 'block';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await fetch('/api/chat/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text })
            });

            const data = await response.json();

            typingIndicator.style.display = 'none';

            if (data.ok && data.matches && data.matches.length > 0) {
                // Pick the best match (first one)
                const bestMatch = data.matches[0];
                appendMessage(bestMatch.answer, 'bot');
            } else {
                appendMessage("Maaf, saya belum mengerti pertanyaan tersebut. Silakan hubungi admin via WhatsApp untuk info lebih lanjut.", 'bot');
            }

        } catch (error) {
            console.error('Chat error:', error);
            typingIndicator.style.display = 'none';
            appendMessage("Maaf, terjadi kesalahan koneksi.", 'bot');
        }
    }

    function appendMessage(text, sender) {
        const div = document.createElement('div');
        div.classList.add('message', sender);
        // Convert newlines to <br> for bot messages
        if (sender === 'bot') {
            div.innerHTML = text.replace(/\n/g, '<br>');
        } else {
            div.textContent = text;
        }

        // Insert before typing indicator
        messagesContainer.insertBefore(div, typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

})();
