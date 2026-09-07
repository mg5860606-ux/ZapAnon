# 🟢 ZapAnon - Web & Mobile Anonymous Chat Server Master v4.0

> **Desenvolvido por 👑 CORVO**

## 🚀 Recursos Principais
- 🟢 **Interface 100% Responsiva (PWA):** Idêntica ao WhatsApp Web e Mobile em Tela Cheia (*Standalone*).
- 💬 **Conversas & Grupos:** Bate-papo Privado 1x1, Grupos Públicos, Canais e Comunidades.
- 🔗 **Links de Convite Exclusivos por Grupo:** Compartilhe o link (`/?invite=zap_xxx`) para pessoas entrarem no grupo automaticamente.
- 📇 **Salvar Contatos:** Lista de contatos salvos com notificações *Toast* em tempo real.
- 🔐 **Criptografia E2EE (AES-256):** Criptografia automática de ponta a ponta com *Fallback HTTP*.
- 🤖 **API Completa do BotFather (Telegram Compatible):** Suporte a `sendMessage`, `sendPhoto`, `sendVideo`, `sendDocument`, `sendAnimation`, `sendAudio`, `sendSticker`, `getUpdates`, `getMe`.
- 🔘 **Botões Interativos:** Suporte total a `reply_markup` / `inline_keyboard` com links e *callback_data*.
- 🔥 **Firebase Admin SDK:** Integração com banco Firestore com permissões de administrador.
- 📱 **Tela de Abertura (Splash Screen):** Tela inicial animada do WhatsApp com a marca CORVO.

## ⚙️ Hospedagem no Render
1. Conecte este repositório no [Render.com](https://render.com).
2. Crie um novo **Web Service** (`Environment: Node`).
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. O Render detectará automaticamente a porta `PORT` e o arquivo `render.yaml`.