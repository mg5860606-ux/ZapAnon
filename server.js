const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// --- FIREBASE ADMIN SETUP (Chave Privada via ENV ou Arquivo) ---
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("Erro ao realizar parse de FIREBASE_SERVICE_ACCOUNT:", e.message);
  }
}

if (!serviceAccount) {
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (e) {
    console.warn("⚠️ serviceAccountKey.json não encontrado localmente.");
  }
}

if (serviceAccount) {
  try {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin SDK ativado com sucesso!");
  } catch (e) {
    console.error("Erro ao inicializar Firebase Admin:", e.message);
  }
} else {
  console.warn("⚠️ Servidor rodando em modo desacoplado de Admin Firebase.");
}

const db = getFirestore();

// Wrappers para manter compatibilidade com as chamadas de banco do server.js
function collection(dbInst, name) { 
  return dbInst.collection(name); 
}
function doc(dbInst, colName, docId) {
  if (typeof dbInst.doc === 'function' && !docId) return dbInst;
  return dbInst.collection(colName).doc(docId);
}
async function setDoc(docRef, data) { return await docRef.set(data); }
async function updateDoc(docRef, data) { return await docRef.update(data); }
async function addDoc(colRef, data) {
  const ref = await colRef.add(data);
  return { id: ref.id };
}
async function getDoc(docRef) {
  const snap = await docRef.get();
  return {
    exists: () => snap.exists,
    data: () => snap.data(),
    id: snap.id
  };
}
async function getDocs(colRef) {
  const snap = await colRef.get();
  return {
    size: snap.size,
    empty: snap.empty,
    forEach: (cb) => snap.forEach(d => cb({ id: d.id, data: () => d.data() }))
  };
}
async function deleteDoc(docRef) { return await docRef.delete(); }
function query(colRef, ...constraints) {
  let ref = colRef;
  constraints.forEach(c => {
    if (c && typeof c.apply === 'function') {
      ref = c.apply(ref);
    }
  });
  return ref;
}
function where(field, op, val) {
  return {
    apply: (ref) => ref.where(field, op, val)
  };
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- DATABASE IN-MEMORY ---
let users = new Map();             // userId -> userObj
let sseClients = new Map();        // userId -> res
let conversations = new Map();     // convId -> convObj
let messages = [];                 // list of message objects
let statuses = [];                 // list of story/status objects
let bots = new Map();              // botToken -> botObj
let botUpdates = new Map();        // botToken -> array of update objects
let botPollingWaiting = new Map(); // botToken -> array of { res, offset, timeoutId }
let starredMessages = new Map();   // userId -> Set of msgIds
let archivedConversations = new Map(); // userId -> Set of convIds
let userHiddenConversations = new Map(); // userId -> Set of convIds
let communities = new Map();       // commId -> commObj
let channels = new Map();          // chanId -> chanObj
let userCustomStickers = new Map(); // userId -> array of sticker URLs
let chatWallpapers = new Map();     // convId -> wallpaper url / color

let nextUpdateId = 10001;

// Pre-configured Stickers & GIFs Database
const STICKER_PACKS = [
    {
        id: 'memes_br',
        name: '😂 Memes BR',
        stickers: [
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme1',
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme2',
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme3',
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme4',
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme5',
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme6',
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme7',
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=meme8'
        ]
    },
    {
        id: 'flork_funny',
        name: '🥟 Flork & Zoeira',
        stickers: [
            'https://api.dicebear.com/7.x/big-smile/svg?seed=flork1',
            'https://api.dicebear.com/7.x/big-smile/svg?seed=flork2',
            'https://api.dicebear.com/7.x/big-smile/svg?seed=flork3',
            'https://api.dicebear.com/7.x/big-smile/svg?seed=flork4',
            'https://api.dicebear.com/7.x/big-smile/svg?seed=flork5',
            'https://api.dicebear.com/7.x/big-smile/svg?seed=flork6'
        ]
    },
    {
        id: 'cyber_anon',
        name: '🕶️ Cyber & Hacker',
        stickers: [
            'https://api.dicebear.com/7.x/bottts/svg?seed=cyber1',
            'https://api.dicebear.com/7.x/bottts/svg?seed=cyber2',
            'https://api.dicebear.com/7.x/bottts/svg?seed=cyber3',
            'https://api.dicebear.com/7.x/bottts/svg?seed=cyber4',
            'https://api.dicebear.com/7.x/bottts/svg?seed=cyber5'
        ]
    },
    {
        id: 'anime_reactions',
        name: '✨ Anime & Reações',
        stickers: [
            'https://api.dicebear.com/7.x/lorelei/svg?seed=anime1',
            'https://api.dicebear.com/7.x/lorelei/svg?seed=anime2',
            'https://api.dicebear.com/7.x/lorelei/svg?seed=anime3',
            'https://api.dicebear.com/7.x/personas/svg?seed=anime4',
            'https://api.dicebear.com/7.x/personas/svg?seed=anime5',
            'https://api.dicebear.com/7.x/personas/svg?seed=anime6'
        ]
    }
];

// Rich searchable GIF library
const GIF_CATALOG = [
    { tag: 'risada', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=laugh1', title: 'Risada' },
    { tag: 'risada', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=laugh2', title: 'Kkkkk' },
    { tag: 'meme', url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=meme1', title: 'Meme clássico' },
    { tag: 'danca', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=dance1', title: 'Dançando' },
    { tag: 'meme', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', title: 'Zoeira' },
    { tag: 'meme', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', title: 'Confuso' },
    { tag: 'gato', url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', title: 'Gato piscando' },
    { tag: 'gato', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', title: 'Gato digitando' },
    { tag: 'gato', url: 'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif', title: 'Gatinho fofo' },
    { tag: 'hacker', url: 'https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif', title: 'Hacker Matrix' },
    { tag: 'hacker', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', title: 'Terminal hacker' },
    { tag: 'hacker', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', title: 'Cyber Sec' },
    { tag: 'amor', url: 'https://media.giphy.com/media/26ufc039BcFz8pHBm/giphy.gif', title: 'Coração' },
    { tag: 'amor', url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif', title: 'Abraço' },
    { tag: 'choro', url: 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif', title: 'Chorando' },
    { tag: 'choro', url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif', title: 'Tristeza' },
    { tag: 'danca', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', title: 'Dançando' },
    { tag: 'danca', url: 'https://media.giphy.com/media/mKMGLhoD8L4yc/giphy.gif', title: 'Comemoração' },
    { tag: 'ok', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', title: 'Joinha' },
    { tag: 'ok', url: 'https://media.giphy.com/media/mgqefOvJJVTNW/giphy.gif', title: 'Beleza' }
];

// Pre-configured Groups
const defaultGroups = [
    {
        id: 'group_oficial',
        type: 'group',
        name: '🟢 ZapAnon Brasil [Oficial]',
        avatar: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80',
        cover: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000&auto=format&fit=crop&q=80',
        wallpaper: null,
        desc: 'Grupo oficial aberto para todos trocarem ideia no anonimato total com privacidade absoluta.',
        creatorId: 'system',
        adminId: 'system',
        members: [
            { id: 'system', name: 'ZapAnon Oficial 🛡️', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=zap_official', role: 'creator' },
            { id: 'japa_master', name: 'Japa 🐦⬛', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=japa_corvo', role: 'admin' }
        ],
        disappearing: 'off',
        mute: false,
        permissions: { sendMessages: true, editGroupInfo: true },
        inviteToken: 'zap_oficial',
        created: Date.now(),
        isDefault: true,
        isPinned: true
    },
    {
        id: 'group_segredos',
        type: 'group',
        name: '🤫 Desabafos & Segredos',
        avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
        cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=80',
        wallpaper: null,
        desc: 'Conte seus segredos e desabafe sem medo de julgamento. 100% anônimo.',
        creatorId: 'system',
        adminId: 'system',
        members: [
            { id: 'system', name: 'Administrador 🤫', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=segredos', role: 'creator' }
        ],
        disappearing: 'off',
        mute: false,
        permissions: { sendMessages: true, editGroupInfo: true },
        inviteToken: 'zap_segredos',
        created: Date.now(),
        isDefault: true,
        isPinned: false
    },
    {
        id: 'group_cyber',
        type: 'group',
        name: '💻 Cyber, Tech & Segurança',
        avatar: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80',
        cover: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1000&auto=format&fit=crop&q=80',
        wallpaper: 'cyber',
        desc: 'Espaço para debater tecnologia, ferramentas, segurança e zoeiras nerd.',
        creatorId: 'system',
        adminId: 'system',
        members: [
            { id: 'system', name: 'Cyber Sec 💻', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=cyber_sec', role: 'creator' }
        ],
        disappearing: 'off',
        mute: false,
        permissions: { sendMessages: true, editGroupInfo: true },
        inviteToken: 'zap_cyber',
        created: Date.now(),
        isDefault: true,
        isPinned: false
    }
];

defaultGroups.forEach(g => conversations.set(g.id, g));

// Seed Default Communities
const defaultCommunities = [
    {
        id: 'comm_tech',
        name: '🌐 Comunidade Tech & Devs Brasil',
        desc: 'Comunidade geral de programadores, entusiastas e hackers.',
        avatar: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&auto=format&fit=crop&q=80',
        groupsCount: 4,
        membersCount: 1420
    },
    {
        id: 'comm_gamers',
        name: '🎮 Guilda dos Gamers Anônimos',
        desc: 'Comunidade de jogos, streams e novidades do mundo gamer.',
        avatar: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&auto=format&fit=crop&q=80',
        groupsCount: 3,
        membersCount: 890
    }
];
defaultCommunities.forEach(c => communities.set(c.id, c));

// Seed Default Channels
const defaultChannels = [
    {
        id: 'chan_noticias',
        name: '📢 Notícias & Novidades Web',
        desc: 'Canal oficial com avisos de updates, novidades de tecnologia e alertas.',
        avatar: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&auto=format&fit=crop&q=80',
        followersCount: 5230,
        verified: true,
        isFollowing: true
    },
    {
        id: 'chan_memes',
        name: '🔥 Humor & Memes Diários',
        desc: 'Os melhores memes e pérolas da internet direto no seu WhatsApp.',
        avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80',
        followersCount: 12400,
        verified: false,
        isFollowing: false
    }
];
defaultChannels.forEach(c => channels.set(c.id, c));

// Seed Official Bot
const demoBotToken = 'bot_corvo_master_777_tok_99x';
const demoBot = {
    id: 'bot_corvo_official',
    token: demoBotToken,
    name: 'Corvo Bot 🦅',
    username: '@corvo_bot',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=corvo_bot_master',
    desc: 'Bot oficial controlado 100% via API externa (Python / Node / cURL na sua VPS).',
    ownerId: 'system',
    created: Date.now()
};
bots.set(demoBotToken, demoBot);
botUpdates.set(demoBotToken, []);

// Seed Welcome System Message
messages.push({
    id: 'msg_welcome_sys',
    convId: 'group_oficial',
    senderId: 'system',
    senderName: 'ZapAnon Seguro 🛡️',
    senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=zap_official',
    type: 'text',
    text: '🔒 As mensagens desta conversa estão protegidas com criptografia de ponta a ponta e anonimato garantido. Ninguém fora desta conversa pode ler ou ouvir o que você envia.',
    isSystem: true,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
});

messages.push({
    id: 'msg_japa_hi',
    convId: 'group_oficial',
    senderId: 'japa_master',
    senderName: 'Japa 🐦⬛',
    senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=japa_corvo',
    type: 'text',
    text: 'ZapAnon 2026 100% atualizado: troca de papel de parede por conversa e grupo, criador de figurinhas, busca de GIFs, experiência app mobile nativa e Bot API Telegram! 🟢🚀',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now() + 1000
});

// Broadcast Helper
function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach((client, userId) => {
        try {
            client.write(payload);
        } catch (err) {
            sseClients.delete(userId);
        }
    });
}

// Push Telegram-style update to bot queue
function pushBotUpdate(msg) {
    const updateObj = {
        update_id: nextUpdateId++,
        message: {
            message_id: msg.id,
            from: {
                id: msg.senderId,
                first_name: msg.senderName,
                is_bot: !!msg.isBot
            },
            chat: {
                id: msg.convId,
                type: 'group'
            },
            date: Math.floor(msg.timestamp / 1000),
            text: msg.text || '',
            media: msg.media || null,
            sticker: msg.sticker || null,
            audio: msg.audio || null,
            poll: msg.poll || null,
            reply_to_message: msg.replyTo || null
        }
    };

    bots.forEach((bot, token) => {
        if (!botUpdates.has(token)) {
            botUpdates.set(token, []);
        }
        const q = botUpdates.get(token);
        q.push(updateObj);
        if (q.length > 500) q.shift();

        // Check if bot has long polling connection waiting
        const waiters = botPollingWaiting.get(token);
        if (waiters && waiters.length > 0) {
            while (waiters.length > 0) {
                const waiter = waiters.shift();
                clearTimeout(waiter.timeoutId);
                const updatesToSend = q.filter(u => u.update_id >= (waiter.offset || 0));
                try {
                    waiter.res.writeHead(200, { 'Content-Type': 'application/json' });
                    waiter.res.end(JSON.stringify({ ok: true, result: updatesToSend }));
                } catch (e) {}
            }
        }
    });
}

// Parse Body Helper
function parseBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk;
        if (body.length > 50 * 1024 * 1024) { // 50MB max for base64 audio/images
            req.destroy();
        }
    });
    req.on('end', () => {
        if (!body) return callback(null, {});
        try {
            const data = JSON.parse(body);
            callback(null, data);
        } catch (err) {
            callback(err, null);
        }
    });
}

// Extract URL from text
function extractUrl(text) {
    if (!text) return null;
    const match = text.match(/(https?:\/\/[^\s]+)/i);
    return match ? match[0] : null;
}

// Fetch OpenGraph Metadata
function fetchLinkPreview(targetUrl, callback) {
    try {
        const parsed = new URL(targetUrl);
        const protocol = parsed.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WhatsApp/2.24.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 4500
        };

        const req = protocol.request(options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (!redirectUrl.startsWith('http')) {
                    redirectUrl = new URL(redirectUrl, targetUrl).href;
                }
                return fetchLinkPreview(redirectUrl, callback);
            }

            if (res.statusCode !== 200) {
                return callback(null, {
                    url: targetUrl,
                    domain: parsed.hostname,
                    title: parsed.hostname,
                    description: targetUrl,
                    image: null
                });
            }

            let html = '';
            res.setEncoding('utf8');
            res.on('data', chunk => {
                html += chunk;
                if (html.length > 250000) {
                    req.destroy();
                }
            });

            res.on('end', () => {
                let title = '';
                let description = '';
                let image = '';
                let siteName = parsed.hostname;

                const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                                     html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i);
                if (ogTitleMatch) {
                    title = decodeEntities(ogTitleMatch[1]);
                } else {
                    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
                    if (titleMatch) title = decodeEntities(titleMatch[1]);
                }

                const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                                    html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
                                    html.match(/<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i);
                if (ogDescMatch) {
                    description = decodeEntities(ogDescMatch[1]);
                }

                const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                                   html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i) ||
                                   html.match(/<link\s+rel=["']image_src["']\s+href=["'](.*?)["']/i);
                if (ogImgMatch) {
                    image = ogImgMatch[1];
                    if (image.startsWith('//')) image = 'https:' + image;
                    else if (image.startsWith('/')) image = new URL(image, targetUrl).href;
                }

                const ogSiteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["'](.*?)["']/i);
                if (ogSiteMatch) siteName = decodeEntities(ogSiteMatch[1]);

                if (!title) title = parsed.hostname;
                if (!description) description = `Acesse o link em ${parsed.hostname}`;

                callback(null, {
                    url: targetUrl,
                    domain: siteName || parsed.hostname,
                    title: title.trim().substring(0, 100),
                    description: description.trim().substring(0, 200),
                    image: image || null
                });
            });
        });

        req.on('error', () => {
            callback(null, { url: targetUrl, domain: parsed.hostname, title: parsed.hostname, description: targetUrl, image: null });
        });

        req.on('timeout', () => {
            req.destroy();
            callback(null, { url: targetUrl, domain: parsed.hostname, title: parsed.hostname, description: targetUrl, image: null });
        });

        req.end();
    } catch (e) {
        callback(null, null);
    }
}

function decodeEntities(str) {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');
}

// Background cleanup
setInterval(() => {
    const now = Date.now();
    users.forEach((user, id) => {
        if (now - user.lastSeen > 90000 && !sseClients.has(id)) {
            user.isOnline = false;
        }
    });
    // Remove expired stories (>24h)
    statuses = statuses.filter(s => now - s.timestamp < 24 * 60 * 60 * 1000);
}, 30000);

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm'
};

// Helper: Extract token from request url or headers
function extractBotToken(req, parsedUrl, data) {
    let token = data ? data.token : null;
    if (!token && parsedUrl.query) token = parsedUrl.query.token;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '').trim();
    }

    const pathname = parsedUrl.pathname;
    if (!token && pathname.startsWith('/api/bot')) {
        // format: /api/bot<token>/method or /api/bot/<token>/method
        const match = pathname.match(/^\/api\/bot([^\/]+)\//) || pathname.match(/^\/api\/bot\/([^\/]+)\//);
        if (match && match[1] !== 'sendMessage' && match[1] !== 'getUpdates' && match[1] !== 'getMe') {
            token = match[1];
        }
    }
    return token;
}

// --- RATE LIMITER (MVP SECURITY) ---
const requestLimits = new Map();

// --- SERVER INSTANCE ---
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Rate Limiting Básico (Impede Spam massivo no banco de dados)
    if (req.method === 'POST') {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const userLimit = requestLimits.get(ip) || [];
        const recentReqs = userLimit.filter(time => now - time < 1000);
        
        if (recentReqs.length >= 15) { // Max 15 requests per second per IP
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Muitas requisições. Tente novamente mais tarde.' }));
            return;
        }
        
        recentReqs.push(now);
        requestLimits.set(ip, recentReqs);
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // --- SSE STREAM ---
    if (pathname === '/api/stream' && req.method === 'GET') {
        const userId = parsedUrl.query.userId || 'anon_' + Math.random().toString(36).substring(2, 8);
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        sseClients.set(userId, res);

        if (users.has(userId)) {
            users.get(userId).isOnline = true;
            users.get(userId).lastSeen = Date.now();
            broadcast('user_status_changed', { userId, isOnline: true, lastSeen: Date.now() });
        }

        const heartbeat = setInterval(() => {
            try {
                res.write(': ping\n\n');
            } catch (e) {
                clearInterval(heartbeat);
                sseClients.delete(userId);
            }
        }, 20000);

        req.on('close', () => {
            clearInterval(heartbeat);
            sseClients.delete(userId);
            if (users.has(userId)) {
                users.get(userId).isOnline = false;
                users.get(userId).lastSeen = Date.now();
                broadcast('user_status_changed', { userId, isOnline: false, lastSeen: Date.now() });
            }
        });
        return;
    }

    // --- LINK PREVIEW ENDPOINT ---
    if (pathname === '/api/link-preview' && req.method === 'GET') {
        const targetUrl = parsedUrl.query.url;
        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'URL query parameter required' }));
            return;
        }

        fetchLinkPreview(targetUrl, (err, preview) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, preview }));
        });
        return;
    }

    // --- USER SYNC & PROFILE ---
    if (pathname === '/api/user/sync' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Dados inválidos' }));
                return;
            }

            let user;
            try {
                const userRef = doc(db, 'users', data.userId);
                const userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) {
                    user = {
                        id: data.userId,
                        name: data.name || 'Anônimo',
                        avatar: data.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.userId)}`,
                        cover: data.cover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
                        about: data.about || 'Disponível no ZapAnon',
                        privacy: data.privacy || { lastSeen: 'everyone', photo: 'everyone', about: 'everyone', readReceipts: true, ghostMode: false },
                        isOnline: true,
                        lastSeen: Date.now()
                    };
                    await setDoc(userRef, user);
                } else {
                    user = userSnap.data();
                    if (data.name) user.name = data.name.trim().substring(0, 35);
                    if (data.avatar) user.avatar = data.avatar;
                    if (data.cover) user.cover = data.cover;
                    if (data.about !== undefined) user.about = data.about.trim().substring(0, 140);
                    if (data.privacy) user.privacy = { ...user.privacy, ...data.privacy };
                    user.lastSeen = Date.now();
                    user.isOnline = true;
                    await updateDoc(userRef, user);
                }
                // Mantém compatibilidade com o resto do código síncrono
                users.set(data.userId, user);
                userCustomStickers.set(data.userId, user.customStickers || []);
            } catch (firebaseErr) {
                console.error("Firebase error on /api/user/sync:", firebaseErr);
                // Fallback para memória em caso de erro
                user = users.get(data.userId) || { id: data.userId, name: 'Erro', avatar: '' };
            }

            // Sync user avatar & name across all group member lists
            for (const conv of conversations.values()) {
                if (conv.members) {
                    let updatedMem = false;
                    conv.members.forEach(mem => {
                        if (mem.id === data.userId) {
                            if (data.name) mem.name = user.name;
                            if (data.avatar) mem.avatar = user.avatar;
                            updatedMem = true;
                        }
                    });
                    if (updatedMem) {
                        broadcast('conversation_updated', conv);
                    }
                }
            }

            const hiddenSet = userHiddenConversations.get(data.userId) || new Set();
            const convList = Array.from(conversations.values())
                .filter(conv => {
                    if (hiddenSet.has(conv.id)) return false;
                    if (conv.type === 'direct') {
                        if (conv.isDefault && !hiddenSet.has(conv.id)) return true;
                        return conv.recipientId === data.userId || (conv.members && conv.members.some(m => m.id === data.userId)) || conv.id.includes(data.userId);
                    }
                    if (conv.type === 'group') {
                        return true; // Todos os grupos são visíveis para todos
                    }
                    return true;
                })
                .map(conv => {
                    return {
                        ...conv,
                        lastMessage: conv.lastMessage || null,
                        memberCount: conv.members ? conv.members.length : 1
                    };
                });

            const userStickers = userCustomStickers.get(data.userId) || [];
            
            let statusList = statuses.slice(0, 50);
            try {
                const sSnap = await getDocs(collection(db, 'statuses'));
                let sTemp = [];
                sSnap.forEach(d => sTemp.push(d.data()));
                sTemp.sort((a,b) => b.timestamp - a.timestamp);
                statusList = sTemp.slice(0, 50);
                
                // Limpa e atualiza memória
                statuses = statusList;
            } catch(e) {
                console.error("Firebase error loading statuses:", e);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                user,
                conversations: convList,
                stickerPacks: STICKER_PACKS,
                customStickers: userStickers,
                statuses: statusList,
                communities: Array.from(communities.values()),
                channels: Array.from(channels.values())
            }));
        });
        return;
    }

    // --- GET CONVERSATIONS LIST ---
    if (pathname === '/api/conversations' && req.method === 'GET') {
        (async () => {
            try {
                const convsSnap = await getDocs(collection(db, 'conversations'));
                let convList = [];
                convsSnap.forEach(docSnap => {
                    const conv = docSnap.data();
                    conversations.set(conv.id, conv); // Atualiza cache
                    convList.push({
                        ...conv,
                        lastMessage: conv.lastMessage || null,
                        memberCount: conv.members ? conv.members.length : 1
                    });
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    conversations: convList,
                    onlineCount: sseClients.size
                }));
            } catch (err) {
                console.error("Firebase error on /conversations:", err);
                const memList = Array.from(conversations.values()).map(conv => {
                    const convMsgs = messages.filter(m => m.convId === conv.id);
                    return { ...conv, lastMessage: convMsgs[convMsgs.length - 1] || null, memberCount: conv.members ? conv.members.length : 1 };
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ conversations: memList, onlineCount: sseClients.size }));
            }
        })();
        return;
    }

    // --- GET ALL USERS / CONTACTS LIST ---
    if (pathname === '/api/users/list' && req.method === 'GET') {
        (async () => {
            const currentUserId = parsedUrl.query.currentUserId;
            try {
                const usersSnap = await getDocs(collection(db, 'users'));
                const list = [];
                usersSnap.forEach(docSnap => {
                    const u = docSnap.data();
                    if (u.id !== currentUserId) {
                        list.push({
                            id: u.id,
                            name: u.name,
                            avatar: u.avatar,
                            about: u.about || 'Disponível no WhatsApp',
                            isOnline: u.isOnline,
                            lastSeen: u.lastSeen
                        });
                        // Atualiza a cache de memória
                        users.set(u.id, u);
                    }
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, users: list }));
            } catch (err) {
                console.error("Firebase error on /users/list:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro ao buscar usuários do Firebase' }));
            }
        })();
        return;
    }

    // --- SEARCH USERS BY NICKNAME / USERNAME ---
    if (pathname === '/api/users/search' && req.method === 'GET') {
        const q = (parsedUrl.query.q || '').trim().toLowerCase();
        const currentUserId = parsedUrl.query.currentUserId;
        let matched = [];
        if (q) {
            const matchedUsers = Array.from(users.values())
                .filter(u => u.id !== currentUserId && (
                    u.name.toLowerCase().includes(q) || 
                    u.id.toLowerCase().includes(q) || 
                    (u.about && u.about.toLowerCase().includes(q))
                ))
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    avatar: u.avatar,
                    about: u.about || 'Disponível no WhatsApp',
                    isOnline: u.isOnline,
                    lastSeen: u.lastSeen
                }));
                
            const matchedBots = Array.from(bots.values())
                .filter(b => (
                    b.name.toLowerCase().includes(q) ||
                    (b.username && b.username.toLowerCase().includes(q)) ||
                    (b.desc && b.desc.toLowerCase().includes(q))
                ))
                .map(b => ({
                    id: b.token, // Use token as ID so the direct message is sent correctly to the bot
                    name: b.name + ' ✓', // Verified tick
                    avatar: b.avatar,
                    about: b.username + ' • Bot',
                    isOnline: true,
                    lastSeen: Date.now()
                }));

            matched = matchedUsers.concat(matchedBots);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, users: matched }));
        return;
    }

    // --- GET USER PROFILE DETAILS ---
    if (pathname === '/api/users/profile' && req.method === 'GET') {
        const targetUserId = parsedUrl.query.userId;
        const targetUser = users.get(targetUserId);
        if (!targetUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Usuário não encontrado' }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: targetUser }));
        return;
    }

    // --- SAVE CONTACT ---
    if (pathname === '/api/contacts/save' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.userId || !data.contactId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'userId e contactId obrigatórios' }));
                return;
            }

            let u = users.get(data.userId);
            if (!u) {
                u = { id: data.userId, name: 'Anônimo', avatar: '', savedContacts: [] };
                users.set(data.userId, u);
            }

            if (!Array.isArray(u.savedContacts)) u.savedContacts = [];
            
            const existingIdx = u.savedContacts.findIndex(c => (typeof c === 'object' ? c.id : c) === data.contactId);
            if (existingIdx === -1) {
                u.savedContacts.push({
                    id: data.contactId,
                    customName: data.customName || '',
                    savedAt: Date.now()
                });
            } else if (data.customName) {
                u.savedContacts[existingIdx] = { id: data.contactId, customName: data.customName, savedAt: Date.now() };
            }

            try {
                await updateDoc(doc(db, 'users', data.userId), { savedContacts: u.savedContacts });
            } catch(e) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, savedContacts: u.savedContacts }));
        });
        return;
    }

    // --- REMOVE CONTACT ---
    if (pathname === '/api/contacts/remove' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.userId || !data.contactId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'userId e contactId obrigatórios' }));
                return;
            }

            const u = users.get(data.userId);
            if (u && Array.isArray(u.savedContacts)) {
                u.savedContacts = u.savedContacts.filter(c => (typeof c === 'object' ? c.id : c) !== data.contactId);
                try {
                    await updateDoc(doc(db, 'users', data.userId), { savedContacts: u.savedContacts });
                } catch(e) {}
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, savedContacts: u ? u.savedContacts : [] }));
        });
        return;
    }

    // --- LIST SAVED CONTACTS ---
    if (pathname === '/api/contacts/list' && req.method === 'GET') {
        const userId = parsedUrl.query.userId;
        const u = users.get(userId);
        const savedList = (u && Array.isArray(u.savedContacts)) ? u.savedContacts : [];
        
        const details = savedList.map(item => {
            const cid = typeof item === 'object' ? item.id : item;
            const target = users.get(cid) || { id: cid, name: 'Anônimo', avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cid}` };
            return {
                id: target.id,
                name: (typeof item === 'object' && item.customName) ? item.customName : target.name,
                originalName: target.name,
                avatar: target.avatar,
                about: target.about || 'Disponível no ZapAnon',
                isOnline: target.isOnline || false,
                lastSeen: target.lastSeen || Date.now()
            };
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, contacts: details }));
        return;
    }

    // --- CREATE OR GET DIRECT 1X1 CONVERSATION ---
    if (pathname === '/api/conversations/direct' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.recipientId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'recipientId obrigatório' }));
                return;
            }

            const recipient = users.get(data.recipientId) || {
                id: data.recipientId,
                name: data.recipientName || 'Contato Anônimo',
                avatar: data.recipientAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.recipientId}`,
                about: 'Disponível no WhatsApp Anônimo'
            };

            const directId = 'direct_' + (data.userId ? [data.userId, data.recipientId].sort().join('_') : data.recipientId);
            
            let conv = conversations.get(directId);
            if (!conv) {
                conv = {
                    id: directId,
                    type: 'direct',
                    name: recipient.name,
                    avatar: recipient.avatar,
                    about: recipient.about,
                    recipientId: recipient.id,
                    wallpaper: null,
                    created: Date.now(),
                    isPinned: false
                };
                conversations.set(directId, conv);
                broadcast('conversation_created', conv);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, conversation: conv, recipient }));
        });
        return;
    }

    // --- SEARCH STICKERS / GIFS ---
    if (pathname === '/api/stickers/search' && req.method === 'GET') {
        const q = (parsedUrl.query.q || '').trim().toLowerCase();
        let results = [];
        if (!q) {
            results = GIF_CATALOG.slice(0, 20);
        } else {
            // Search in GIF_CATALOG
            results = GIF_CATALOG.filter(g => g.tag.includes(q) || g.title.toLowerCase().includes(q));
            
            // Search in STICKER_PACKS
            STICKER_PACKS.forEach(pack => {
                if (pack.name.toLowerCase().includes(q) || pack.id.toLowerCase().includes(q)) {
                    pack.stickers.forEach((stUrl, i) => {
                        results.push({ tag: q, url: stUrl, title: `${pack.name} #${i+1}` });
                    });
                }
            });

            // Dynamic sticker generation for ANY search query
            const styles = ['fun-emoji', 'big-smile', 'bottts', 'lorelei', 'personas', 'adventurer'];
            for (let i = 1; i <= 12; i++) {
                const style = styles[(i + q.length) % styles.length];
                const seed = encodeURIComponent(`${q}_${i}`);
                results.push({
                    tag: q,
                    title: `${q.toUpperCase()} #${i}`,
                    url: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`
                });
            }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, results }));
        return;
    }

    // --- CREATE / UPLOAD CUSTOM STICKER ---
    if (pathname === '/api/stickers/create' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.userId || !data.sticker) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Sticker data e userId obrigatórios' }));
                return;
            }

            if (!userCustomStickers.has(data.userId)) {
                userCustomStickers.set(data.userId, []);
            }
            const list = userCustomStickers.get(data.userId);
            list.unshift(data.sticker);
            if (list.length > 50) list.pop();
            
            const u = users.get(data.userId);
            if (u) u.customStickers = list;

            try {
                await updateDoc(doc(db, 'users', data.userId), { customStickers: list });
            } catch(e) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, sticker: data.sticker, customStickers: list }));
        });
        return;
    }

    // --- UPDATE CONVERSATION WALLPAPER (PRIVATE CHAT OR GROUP) ---
    if (pathname === '/api/conversations/wallpaper' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.convId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'convId obrigatório' }));
                return;
            }

            chatWallpapers.set(data.convId, data.wallpaper || null);

            const conv = conversations.get(data.convId);
            if (conv) {
                conv.wallpaper = data.wallpaper || null;
                
                try {
                    await updateDoc(doc(db, 'conversations', data.convId), { wallpaper: conv.wallpaper });
                } catch(e) {}

                broadcast('conversation_updated', conv);
            }

            broadcast('wallpaper_updated', { convId: data.convId, wallpaper: data.wallpaper || null });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, convId: data.convId, wallpaper: data.wallpaper || null }));
        });
        return;
    }

    // --- CREATE NEW GROUP ---
    if (pathname === '/api/groups' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Nome do grupo obrigatório' }));
                return;
            }

            const groupId = 'group_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
            const creatorUser = users.get(data.userId) || {
                id: data.userId || 'anon',
                name: data.userName || 'Criador',
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.userId || 'anon'}`
            };

            const newGroup = {
                id: groupId,
                type: 'group',
                name: data.name.trim().substring(0, 45),
                desc: data.desc ? data.desc.trim().substring(0, 250) : 'Grupo no WhatsApp',
                avatar: data.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(data.name)}`,
                cover: data.cover || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000&auto=format&fit=crop&q=80',
                wallpaper: data.wallpaper || null,
                creatorId: creatorUser.id,
                adminId: creatorUser.id,
                members: [
                    { id: creatorUser.id, name: creatorUser.name, avatar: creatorUser.avatar, role: 'creator' },
                    ...(Array.isArray(data.initialMembers) ? data.initialMembers : [])
                ],
                disappearing: 'off',
                mute: false,
                permissions: { sendMessages: true, editGroupInfo: true },
                inviteToken: 'zap_' + Math.random().toString(36).substring(2, 10),
                created: Date.now(),
                isDefault: false,
                isPinned: false
            };

            try {
                await setDoc(doc(db, 'conversations', groupId), newGroup);
            } catch (e) {
                console.error("Firebase error saving group:", e);
            }

            conversations.set(groupId, newGroup);

            const sysMsg = {
                id: 'msg_created_' + Date.now(),
                convId: groupId,
                senderId: 'system',
                senderName: 'Sistema',
                type: 'text',
                text: `"${creatorUser.name}" criou o grupo "${newGroup.name}".`,
                isSystem: true,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };
            
            try {
                await setDoc(doc(db, 'messages', sysMsg.id), sysMsg);
            } catch (e) {}

            messages.push(sysMsg);

            broadcast('conversation_created', newGroup);
            broadcast('new_message', sysMsg);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, group: newGroup }));
        });
        return;
    }

    // --- UPDATE GROUP DETAILS ---
    if (pathname === '/api/groups/update' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.groupId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'groupId obrigatório' }));
                return;
            }

            const group = conversations.get(data.groupId);
            if (!group) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Grupo não encontrado' }));
                return;
            }

            let changes = [];
            if (data.name && data.name.trim() !== group.name) {
                changes.push(`alterou o nome do grupo para "${data.name.trim()}"`);
                group.name = data.name.trim().substring(0, 45);
            }
            if (data.desc !== undefined && data.desc.trim() !== group.desc) {
                changes.push(`alterou a descrição do grupo`);
                group.desc = data.desc.trim().substring(0, 250);
            }
            if (data.avatar) {
                group.avatar = data.avatar;
                changes.push(`alterou o ícone do grupo`);
            }
            if (data.cover) {
                group.cover = data.cover;
                changes.push(`alterou a foto de capa do grupo`);
            }
            if (data.wallpaper !== undefined) {
                group.wallpaper = data.wallpaper;
                changes.push(`alterou o papel de parede do grupo`);
            }
            if (data.disappearing) {
                group.disappearing = data.disappearing;
                changes.push(`definiu mensagens temporárias como: ${data.disappearing}`);
            }
            if (data.mute !== undefined) group.mute = !!data.mute;
            if (data.permissions) group.permissions = { ...group.permissions, ...data.permissions };

            // Add member if requested
            if (data.addMemberName) {
                const newMemId = 'mem_' + Math.random().toString(36).substring(2, 7);
                const newMem = {
                    id: newMemId,
                    name: data.addMemberName.trim(),
                    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.addMemberName)}`,
                    role: 'member'
                };
                if (!group.members) group.members = [];
                group.members.push(newMem);
                changes.push(`adicionou ${newMem.name} ao grupo`);
            }

            // Promote member to Admin
            if (data.promoteMemberId) {
                const reqMem = group.members.find(m => m.id === data.userId);
                const isCreator = (group.creatorId && group.creatorId === data.userId) || (reqMem && reqMem.role === 'creator');
                const isAdmin = reqMem && (reqMem.role === 'admin' || reqMem.role === 'creator');

                if (!isCreator && !isAdmin) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Apenas administradores ou o criador podem promover membros.' }));
                    return;
                }

                const target = group.members.find(m => m.id === data.promoteMemberId);
                if (target && target.role !== 'creator') {
                    target.role = 'admin';
                    changes.push(`promoveu ${target.name} a Administrador do grupo`);
                }
            }

            // Demote Admin to Member
            if (data.demoteMemberId) {
                const reqMem = group.members ? group.members.find(m => m.id === data.userId) : null;
                const isCreator = (group.creatorId && group.creatorId === data.userId) || (reqMem && reqMem.role === 'creator');
                const isAdmin = isCreator || (reqMem && reqMem.role === 'admin');

                if (!isCreator && !isAdmin) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Apenas administradores ou o criador podem rebaixar administradores.' }));
                    return;
                }

                const target = group.members ? group.members.find(m => m.id === data.demoteMemberId) : null;
                if (target) {
                    if (target.role === 'creator' || target.id === group.creatorId) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'O criador do grupo não pode ser rebaixado!' }));
                        return;
                    }

                    if (target.id === data.userId) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Você não pode rebaixar a si mesmo.' }));
                        return;
                    }

                    target.role = 'member';
                    changes.push(`rebaixou ${target.name} para Membro`);
                }
            }

            // Remove member if requested with strict ZapAnon Hierarchy Validation
            if (data.removeMemberId) {
                if (group.members) {
                    const targetIdx = group.members.findIndex(m => m.id === data.removeMemberId);
                    if (targetIdx !== -1) {
                        const target = group.members[targetIdx];
                        const isSelfLeaving = data.removeMemberId === data.userId;

                        if (!isSelfLeaving) {
                            const reqMem = group.members.find(m => m.id === data.userId);
                            const isCreator = (group.creatorId && group.creatorId === data.userId) || (reqMem && reqMem.role === 'creator');
                            const isAdmin = reqMem && (reqMem.role === 'admin' || reqMem.role === 'creator');

                            if (!isAdmin && !isCreator) {
                                res.writeHead(403, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Membros comuns não têm permissão para remover participantes.' }));
                                return;
                            }

                            if (target.role === 'creator' || target.id === group.creatorId) {
                                res.writeHead(403, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'O criador do grupo não pode ser removido por ninguém!' }));
                                return;
                            }
                        }

                        const removed = group.members.splice(targetIdx, 1)[0];
                        changes.push(isSelfLeaving ? `saiu do grupo` : `removeu ${removed.name} do grupo`);
                    }
                }
            }

            // Broadcast notification if something changed
            if (changes.length > 0) {
                const sysNotice = {
                    id: 'msg_upd_' + Date.now(),
                    convId: group.id,
                    senderId: 'system',
                    senderName: 'Sistema',
                    type: 'text',
                    text: `${data.userName || 'Alguém'} ${changes.join(' e ')}.`,
                    isSystem: true,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Date.now()
                };
                
                try {
                    await setDoc(doc(db, 'messages', sysNotice.id), sysNotice);
                } catch(e) {}

                messages.push(sysNotice);
                broadcast('new_message', sysNotice);
            }

            try {
                await updateDoc(doc(db, 'conversations', group.id), group);
            } catch(e) {
                console.error("Firebase error updating group:", e);
            }

            broadcast('conversation_updated', group);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, group }));
        });
        return;
    }

    // --- LEAVE / DELETE GROUP ---
    if (pathname === '/api/groups/leave' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.groupId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'groupId obrigatório' }));
                return;
            }

            const userId = data.userId;
            if (userId) {
                if (!userHiddenConversations.has(userId)) {
                    userHiddenConversations.set(userId, new Set());
                }
                userHiddenConversations.get(userId).add(data.groupId);
            }

            const group = conversations.get(data.groupId);
            if (group) {
                if (group.members) {
                    const idx = group.members.findIndex(m => m.id === userId);
                    if (idx !== -1) {
                        const removed = group.members.splice(idx, 1)[0];
                        const sysNotice = {
                            id: 'msg_upd_' + Date.now(),
                            convId: group.id,
                            senderId: 'system',
                            senderName: 'Sistema',
                            type: 'text',
                            text: `${removed.name} saiu do grupo.`,
                            isSystem: true,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            timestamp: Date.now()
                        };
                        try {
                            await setDoc(doc(db, 'messages', sysNotice.id), sysNotice);
                        } catch(e) {}
                        messages.push(sysNotice);
                        broadcast('new_message', sysNotice);
                        broadcast('conversation_updated', group);
                    }
                }
                if (!group.isDefault && (group.creatorId === userId || !group.members || group.members.length === 0)) {
                    conversations.delete(data.groupId);
                    try {
                        await deleteDoc(doc(db, 'conversations', data.groupId));
                    } catch(e) {}
                } else {
                    try {
                        await updateDoc(doc(db, 'conversations', data.groupId), group);
                    } catch(e) {}
                }
            } else {
                conversations.delete(data.groupId);
                try {
                    await deleteDoc(doc(db, 'conversations', data.groupId));
                } catch(e) {}
            }

            broadcast('conversation_deleted', { groupId: data.groupId, userId });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, groupId: data.groupId }));
        });
        return;
    }

    // --- JOIN GROUP VIA INVITE LINK ---
    if ((pathname === '/api/groups/join' || pathname === '/api/groups/join-by-link') && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.inviteToken || !data.userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token e userId obrigatórios' }));
                return;
            }

            const group = Array.from(conversations.values()).find(c => c.type === 'group' && c.inviteToken === data.inviteToken);
            
            if (!group) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Convite inválido ou expirado' }));
                return;
            }

            if (!group.members) group.members = [];
            const alreadyIn = group.members.some(m => m.id === data.userId);

            if (!alreadyIn) {
                const user = users.get(data.userId) || {
                    id: data.userId,
                    name: data.userName || 'Anônimo',
                    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.userId)}`
                };

                group.members.push({
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    role: 'member'
                });

                const sysNotice = {
                    id: 'msg_upd_' + Date.now(),
                    convId: group.id,
                    senderId: 'system',
                    senderName: 'Sistema',
                    type: 'text',
                    text: `${user.name} entrou via link de convite.`,
                    isSystem: true,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Date.now()
                };

                try {
                    await setDoc(doc(db, 'messages', sysNotice.id), sysNotice);
                    await updateDoc(doc(db, 'conversations', group.id), group);
                } catch(e) {
                    console.error("Firebase error saving join:", e);
                }

                messages.push(sysNotice);
                broadcast('new_message', sysNotice);
                broadcast('conversation_updated', group);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, group }));
        });
        return;
    }

    // --- GROUP STATUS (STORIES) ---
    if (pathname === '/api/groups/status/create' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.groupId || !data.userId || (!data.text && !data.media)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Dados inválidos para status do grupo' }));
                return;
            }
            
            const group = conversations.get(data.groupId);
            if (!group || group.type !== 'group') {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Grupo não encontrado' }));
                return;
            }

            const member = group.members ? group.members.find(m => m.id === data.userId) : null;
            if (!member) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Apenas membros do grupo podem postar status.' }));
                return;
            }

            const senderInfo = users.get(data.userId) || { id: data.userId, name: data.userName || 'Membro', avatar: data.userAvatar || '' };

            const newStatus = {
                id: 'gstatus_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
                authorId: senderInfo.id,
                authorName: senderInfo.name,
                authorAvatar: senderInfo.avatar,
                text: data.text || '',
                media: data.media || null,
                timestamp: Date.now()
            };

            if (!group.groupStatuses) group.groupStatuses = [];
            group.groupStatuses.push(newStatus);
            
            if (group.groupStatuses.length > 50) group.groupStatuses.shift();

            try {
                await updateDoc(doc(db, 'conversations', group.id), { groupStatuses: group.groupStatuses });
            } catch(e) {}

            broadcast('conversation_updated', group);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, status: newStatus }));
        });
        return;
    }

    if (pathname === '/api/groups/status/delete' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.groupId || !data.statusId || !data.userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Dados incompletos' }));
                return;
            }

            const group = conversations.get(data.groupId);
            if (!group) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Grupo não encontrado' }));
                return;
            }

            const reqMem = group.members ? group.members.find(m => m.id === data.userId) : null;
            const isCreator = group.creatorId === data.userId || (reqMem && reqMem.role === 'creator');
            const isAdmin = isCreator || (reqMem && reqMem.role === 'admin');

            if (!isAdmin) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Apenas administradores podem apagar status do grupo.' }));
                return;
            }

            if (group.groupStatuses) {
                group.groupStatuses = group.groupStatuses.filter(st => st.id !== data.statusId);
                try {
                    await updateDoc(doc(db, 'conversations', group.id), { groupStatuses: group.groupStatuses });
                } catch(e) {}
                broadcast('conversation_updated', group);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // --- GET MESSAGES OF A CONVERSATION ---
    if (pathname === '/api/messages' && req.method === 'GET') {
        (async () => {
            const convId = parsedUrl.query.convId || 'group_oficial';
            try {
                const q = query(collection(db, 'messages'), where('convId', '==', convId));
                const msgsSnap = await getDocs(q);
                let convMsgs = [];
                msgsSnap.forEach(d => convMsgs.push(d.data()));
                
                // Mescla mensagens do Firestore com o cache em memória da conversa
                const memMsgs = messages.filter(m => m.convId === convId);
                const allMap = new Map();
                convMsgs.forEach(m => allMap.set(m.id, m));
                memMsgs.forEach(m => allMap.set(m.id, m));

                let combinedMsgs = Array.from(allMap.values());
                combinedMsgs.sort((a, b) => a.timestamp - b.timestamp);
                combinedMsgs = combinedMsgs.slice(-300);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ messages: combinedMsgs }));
            } catch(e) {
                console.error("Firebase error on GET /api/messages:", e);
                const fallbackMsgs = messages.filter(m => m.convId === convId).slice(-300);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ messages: fallbackMsgs }));
            }
        })();
        return;
    }

    // --- SEND MESSAGE (WITH AUTO LINK PREVIEW & BOT UPDATE QUEUE) ---
    if (pathname === '/api/messages' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.convId || (!data.text && !data.media && !data.audio && !data.sticker && !data.poll)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Mensagem inválida ou vazia' }));
                return;
            }

            const sender = users.get(data.senderId) || {
                id: data.senderId || 'anon',
                name: data.senderName || 'Anônimo',
                avatar: data.senderAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=anon'
            };

            let msgType = 'text';
            if (data.poll) msgType = 'poll';
            else if (data.sticker) msgType = 'sticker';
            else if (data.audio) msgType = 'audio';
            else if (data.media) msgType = 'image';

            const rawText = data.text ? data.text.trim().substring(0, 4000) : '';
            const detectedUrl = (!data.media && !data.sticker && !data.audio) ? extractUrl(rawText) : null;

            const handleFinishMessage = async (linkPreview) => {
                const newMsg = {
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    convId: data.convId,
                    senderId: sender.id,
                    senderName: sender.name,
                    senderAvatar: sender.avatar,
                    type: msgType,
                    text: rawText,
                    media: data.media || null,
                    sticker: data.sticker || null,
                    audio: data.audio || null,
                    duration: data.duration || 0,
                    poll: data.poll || null,
                    replyTo: data.replyTo || null,
                    linkPreview: linkPreview || null,
                    stickerMetadata: data.stickerMetadata || (data.sticker ? {
                        packName: data.packName || "Figurinhas do ZapAnon",
                        publisher: sender.name || "Corvo Hacker",
                        createdAt: Date.now()
                    } : null),
                    isStarred: false,
                    isDeleted: false,
                    reactions: {},
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Date.now()
                };

                messages.push(newMsg);
                if (messages.length > 3000) messages.shift();

                const targetConv = conversations.get(data.convId);
                if (targetConv) {
                    targetConv.lastMessage = newMsg;
                    if (targetConv.type === 'group' && targetConv.members) {
                        if (!targetConv.members.some(m => m.id === sender.id)) {
                            targetConv.members.push({
                                id: sender.id,
                                name: sender.name,
                                avatar: sender.avatar,
                                role: 'member'
                            });
                            broadcast('conversation_updated', targetConv);
                        }
                    }
                }

                if (users.has(sender.id)) {
                    users.get(sender.id).lastSeen = Date.now();
                    users.get(sender.id).isOnline = true;
                }

                broadcast('new_message', newMsg);
                pushBotUpdate(newMsg);

                // Save to Firebase asynchronously in background
                (async () => {
                    try {
                        await setDoc(doc(db, 'messages', newMsg.id), newMsg);
                        await updateDoc(doc(db, 'conversations', data.convId), { lastMessage: newMsg });
                    } catch (e) {
                        console.error("Firebase background save error:", e);
                    }
                })();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: newMsg }));
            };

            if (detectedUrl) {
                fetchLinkPreview(detectedUrl, (err, preview) => {
                    handleFinishMessage(preview);
                });
            } else {
                handleFinishMessage(null);
            }
        });
        return;
    }

    // --- STAR / FAVORITE MESSAGE ---
    if (pathname === '/api/messages/star' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.msgId || !data.userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'msgId e userId obrigatórios' }));
                return;
            }

            if (!starredMessages.has(data.userId)) {
                starredMessages.set(data.userId, new Set());
            }

            const userStars = starredMessages.get(data.userId);
            let isStarred = false;
            if (userStars.has(data.msgId)) {
                userStars.delete(data.msgId);
                isStarred = false;
            } else {
                userStars.add(data.msgId);
                isStarred = true;
            }

            try {
                await updateDoc(doc(db, 'users', data.userId), {
                    starredMessages: Array.from(userStars)
                });
            } catch(e) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, isStarred }));
        });
        return;
    }

    // --- GET STARRED MESSAGES ---
    if (pathname === '/api/messages/starred' && req.method === 'GET') {
        const userId = parsedUrl.query.userId;
        const userStars = starredMessages.get(userId) || new Set();
        const favMsgs = messages.filter(m => userStars.has(m.id));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, messages: favMsgs }));
        return;
    }

    // --- COMMUNITIES API ---
    if (pathname === '/api/communities' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, communities: Array.from(communities.values()) }));
        return;
    }

    if (pathname === '/api/communities/create' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Nome obrigatório' }));
                return;
            }
            const comm = {
                id: 'comm_' + Date.now().toString(36),
                name: data.name.trim().substring(0, 45),
                desc: data.desc ? data.desc.trim().substring(0, 200) : 'Nova comunidade',
                avatar: data.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(data.name)}`,
                groupsCount: 1,
                membersCount: 1
            };
            
            try {
                await setDoc(doc(db, 'communities', comm.id), comm);
            } catch(e) {}

            communities.set(comm.id, comm);
            broadcast('community_created', comm);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, community: comm }));
        });
        return;
    }

    // --- CHANNELS API ---
    if (pathname === '/api/channels' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, channels: Array.from(channels.values()) }));
        return;
    }

    if (pathname === '/api/channels/follow' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.channelId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'channelId obrigatório' }));
                return;
            }
            const chan = channels.get(data.channelId);
            if (chan) {
                chan.isFollowing = !chan.isFollowing;
                chan.followersCount += chan.isFollowing ? 1 : -1;
                
                try {
                    await updateDoc(doc(db, 'channels', chan.id), { 
                        isFollowing: chan.isFollowing, 
                        followersCount: chan.followersCount 
                    });
                } catch(e) {}
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, channel: chan }));
        });
        return;
    }

    // =========================================================================
    // BOTFATHER & TELEGRAM-COMPATIBLE BOT API (FOR EXTERNAL HOST / VPS SCRIPTS)
    // =========================================================================

    // 1. Create New Bot
    if (pathname === '/api/bots/create' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.name || !data.username) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Nome e Username (@bot) são obrigatórios.' }));
                return;
            }

            let username = data.username.trim().toLowerCase();
            if (!username.startsWith('@')) username = '@' + username;
            if (!username.endsWith('_bot') && !username.endsWith('bot')) username += '_bot';

            const token = 'bot_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
            const botId = 'bot_' + Date.now().toString(36);

            const newBot = {
                id: botId,
                token: token,
                name: data.name.trim().substring(0, 35),
                username: username,
                avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
                desc: data.desc ? data.desc.trim().substring(0, 200) : 'Bot criado via WhatsApp Bot API',
                ownerId: data.userId || 'anon',
                created: Date.now()
            };

            try {
                await setDoc(doc(db, 'bots', token), newBot);
            } catch(e) {}

            bots.set(token, newBot);
            botUpdates.set(token, []);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, bot: newBot }));
        });
        return;
    }

    // 2. List User's Bots
    if (pathname === '/api/bots/my' && req.method === 'GET') {
        const userId = parsedUrl.query.userId;
        const userBots = [];
        bots.forEach(b => {
            if (b.ownerId === userId || b.ownerId === 'system') {
                userBots.push(b);
            }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, bots: userBots }));
        return;
    }

    // 3. Edit Bot Profile (Name, Description, Avatar)
    if (pathname === '/api/bots/update' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Dados inválidos' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token do Bot inválido.' }));
                return;
            }

            const bot = bots.get(token);
            if (data.name) bot.name = data.name.trim().substring(0, 35);
            if (data.desc !== undefined) bot.desc = data.desc.trim().substring(0, 250);
            if (data.avatar) bot.avatar = data.avatar;

            try {
                await updateDoc(doc(db, 'bots', token), bot);
            } catch(e) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, bot }));
        });
        return;
    }

    // 4. Revoke / Regenerate Bot Token
    if (pathname === '/api/bots/revoke' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            const oldToken = extractBotToken(req, parsedUrl, data);
            if (!oldToken || !bots.has(oldToken)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token atual inválido.' }));
                return;
            }

            const bot = bots.get(oldToken);
            bots.delete(oldToken);

            const newToken = 'bot_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
            bot.token = newToken;
            bots.set(newToken, bot);

            botUpdates.set(newToken, botUpdates.get(oldToken) || []);
            botUpdates.delete(oldToken);

            try {
                await deleteDoc(doc(db, 'bots', oldToken));
                await setDoc(doc(db, 'bots', newToken), bot);
            } catch(e) {
                console.error("Erro salvando revogação de bot no Firestore:", e);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, bot }));
        });
        return;
    }

    // 5. Delete Bot
    if (pathname === '/api/bots/delete' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token do Bot inválido.' }));
                return;
            }

            bots.delete(token);
            botUpdates.delete(token);

            try {
                await deleteDoc(doc(db, 'bots', token));
            } catch(e) {
                console.error("Erro deletando bot do Firestore:", e);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // 6. Telegram-compatible /getMe
    if (pathname.endsWith('/getMe')) {
        const token = extractBotToken(req, parsedUrl, null);
        if (!token || !bots.has(token)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
            return;
        }

        const bot = bots.get(token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            result: {
                id: bot.id,
                is_bot: true,
                first_name: bot.name,
                username: bot.username.replace('@', ''),
                can_join_groups: true,
                can_read_all_group_messages: true,
                supports_inline_queries: true
            }
        }));
        return;
    }

    // 7. Telegram-compatible Long Polling /getUpdates
    if (pathname.endsWith('/getUpdates')) {
        const token = extractBotToken(req, parsedUrl, null);
        if (!token || !bots.has(token)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
            return;
        }

        const offset = parseInt(parsedUrl.query.offset || '0', 10);
        const timeout = Math.min(parseInt(parsedUrl.query.timeout || '0', 10), 30); // Max 30s timeout

        const q = botUpdates.get(token) || [];
        const filtered = q.filter(u => u.update_id >= offset);

        if (filtered.length > 0 || timeout <= 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: filtered }));
            return;
        }

        // Long Polling wait
        if (!botPollingWaiting.has(token)) {
            botPollingWaiting.set(token, []);
        }

        const timeoutId = setTimeout(() => {
            const waiters = botPollingWaiting.get(token) || [];
            const idx = waiters.findIndex(w => w.res === res);
            if (idx !== -1) waiters.splice(idx, 1);
            try {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, result: [] }));
            } catch (e) {}
        }, timeout * 1000);

        botPollingWaiting.get(token).push({ res, offset, timeoutId });

        req.on('close', () => {
            clearTimeout(timeoutId);
            const waiters = botPollingWaiting.get(token) || [];
            const idx = waiters.findIndex(w => w.res === res);
            if (idx !== -1) waiters.splice(idx, 1);
        });
        return;
    }

    // Helper para extrair reply_markup / botões
    function parseReplyMarkup(data) {
        let markup = data.reply_markup || data.buttons || null;
        if (typeof markup === 'string') {
            try { markup = JSON.parse(markup); } catch (e) {}
        }
        return markup;
    }

    // 8. Telegram-compatible /sendMessage
    if (pathname.endsWith('/sendMessage') && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
                return;
            }

            const bot = bots.get(token);
            const chatId = data.chat_id || data.convId || 'group_oficial';
            const text = data.text || data.message || '';
            const replyMarkup = parseReplyMarkup(data);
            const thumb = data.thumb || data.thumbnail || null;
            const video = data.video || null;
            const document = data.document || null;
            const media = data.media || data.photo || null;

            if (!text && !media && !video && !document) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: message content is empty' }));
                return;
            }

            let msgType = 'text';
            if (video) msgType = 'video';
            else if (document) msgType = 'document';
            else if (media) msgType = 'image';

            const botMsg = {
                id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                convId: chatId,
                senderId: bot.id,
                senderName: bot.name,
                senderAvatar: bot.avatar,
                isBot: true,
                type: msgType,
                text: text,
                media: media,
                video: video,
                document: document,
                filename: data.filename || data.file_name || null,
                thumbnail: thumb,
                reply_markup: replyMarkup,
                replyTo: data.reply_to_message_id ? { id: data.reply_to_message_id, senderName: 'Mensagem', text: '' } : null,
                isStarred: false,
                reactions: {},
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            messages.push(botMsg);
            if (messages.length > 3000) messages.shift();

            broadcast('new_message', botMsg);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                result: {
                    message_id: botMsg.id,
                    from: { id: bot.id, is_bot: true, first_name: bot.name, username: bot.username },
                    chat: { id: chatId, type: 'group' },
                    date: Math.floor(botMsg.timestamp / 1000),
                    text: botMsg.text,
                    reply_markup: replyMarkup
                }
            }));
        });
        return;
    }

    // 9. Telegram-compatible /sendPhoto
    if (pathname.endsWith('/sendPhoto') && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
                return;
            }

            const bot = bots.get(token);
            const chatId = data.chat_id || data.convId || 'group_oficial';
            const photo = data.photo || data.image || data.media;
            const caption = data.caption || data.text || '';
            const replyMarkup = parseReplyMarkup(data);

            const botMsg = {
                id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                convId: chatId,
                senderId: bot.id,
                senderName: bot.name,
                senderAvatar: bot.avatar,
                isBot: true,
                type: 'image',
                text: caption,
                media: photo,
                reply_markup: replyMarkup,
                isStarred: false,
                reactions: {},
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            messages.push(botMsg);
            broadcast('new_message', botMsg);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: { message_id: botMsg.id, text: caption, media: photo, reply_markup: replyMarkup } }));
        });
        return;
    }

    // 9.1 Telegram-compatible /sendVideo
    if (pathname.endsWith('/sendVideo') && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
                return;
            }

            const bot = bots.get(token);
            const chatId = data.chat_id || data.convId || 'group_oficial';
            const video = data.video || data.media;
            const caption = data.caption || data.text || '';
            const thumb = data.thumb || data.thumbnail || null;
            const replyMarkup = parseReplyMarkup(data);

            const botMsg = {
                id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                convId: chatId,
                senderId: bot.id,
                senderName: bot.name,
                senderAvatar: bot.avatar,
                isBot: true,
                type: 'video',
                text: caption,
                video: video,
                thumbnail: thumb,
                reply_markup: replyMarkup,
                isStarred: false,
                reactions: {},
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            messages.push(botMsg);
            broadcast('new_message', botMsg);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: { message_id: botMsg.id, video, text: caption, thumbnail: thumb, reply_markup: replyMarkup } }));
        });
        return;
    }

    // 9.2 Telegram-compatible /sendDocument
    if (pathname.endsWith('/sendDocument') && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
                return;
            }

            const bot = bots.get(token);
            const chatId = data.chat_id || data.convId || 'group_oficial';
            const document = data.document || data.file || data.media;
            const caption = data.caption || data.text || '';
            const filename = data.filename || data.file_name || '';
            const thumb = data.thumb || data.thumbnail || null;
            const replyMarkup = parseReplyMarkup(data);

            const botMsg = {
                id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                convId: chatId,
                senderId: bot.id,
                senderName: bot.name,
                senderAvatar: bot.avatar,
                isBot: true,
                type: 'document',
                text: caption,
                document: document,
                filename: filename,
                thumbnail: thumb,
                reply_markup: replyMarkup,
                isStarred: false,
                reactions: {},
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            messages.push(botMsg);
            broadcast('new_message', botMsg);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: { message_id: botMsg.id, document, text: caption, filename, thumbnail: thumb, reply_markup: replyMarkup } }));
        });
        return;
    }

    // 9.3 Telegram-compatible /sendAnimation
    if ((pathname.endsWith('/sendAnimation') || pathname.endsWith('/sendGif')) && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
                return;
            }

            const bot = bots.get(token);
            const chatId = data.chat_id || data.convId || 'group_oficial';
            const animation = data.animation || data.gif || data.media;
            const caption = data.caption || data.text || '';
            const replyMarkup = parseReplyMarkup(data);

            const botMsg = {
                id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                convId: chatId,
                senderId: bot.id,
                senderName: bot.name,
                senderAvatar: bot.avatar,
                isBot: true,
                type: 'image',
                text: caption,
                media: animation,
                reply_markup: replyMarkup,
                isStarred: false,
                reactions: {},
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            messages.push(botMsg);
            broadcast('new_message', botMsg);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: { message_id: botMsg.id, animation, text: caption, reply_markup: replyMarkup } }));
        });
        return;
    }

    // 9.4 Bot Callback Query Action Endpoint
    if (pathname === '/api/bot/callback' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data || !data.callbackData) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'callbackData é obrigatório' }));
                return;
            }

            const botToken = data.botToken || data.botId;
            const updateObj = {
                update_id: nextUpdateId++,
                callback_query: {
                    id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    from: {
                        id: data.userId || 'user_anon',
                        first_name: data.userName || 'Usuário',
                        is_bot: false
                    },
                    message: {
                        message_id: data.messageId || '',
                        chat: { id: data.convId || 'group_oficial', type: 'group' }
                    },
                    data: data.callbackData
                }
            };

            if (botToken && bots.has(botToken)) {
                if (!botUpdates.has(botToken)) botUpdates.set(botToken, []);
                botUpdates.get(botToken).push(updateObj);

                const waiters = botPollingWaiting.get(botToken) || [];
                while (waiters.length > 0) {
                    const waiter = waiters.shift();
                    clearTimeout(waiter.timeoutId);
                    try {
                        waiter.res.writeHead(200, { 'Content-Type': 'application/json' });
                        waiter.res.end(JSON.stringify({ ok: true, result: [updateObj] }));
                    } catch (e) {}
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, updateId: updateObj.update_id }));
        });
        return;
    }

    // 10. Telegram-compatible /sendSticker
    if (pathname.endsWith('/sendSticker') && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
                return;
            }

            const bot = bots.get(token);
            const chatId = data.chat_id || data.convId || 'group_oficial';
            const sticker = data.sticker;

            const botMsg = {
                id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                convId: chatId,
                senderId: bot.id,
                senderName: bot.name,
                senderAvatar: bot.avatar,
                isBot: true,
                type: 'sticker',
                sticker: sticker,
                isStarred: false,
                reactions: {},
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            messages.push(botMsg);
            broadcast('new_message', botMsg);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: { message_id: botMsg.id, sticker } }));
        });
        return;
    }

    // 11. Telegram-compatible /sendAudio /sendVoice
    if ((pathname.endsWith('/sendAudio') || pathname.endsWith('/sendVoice')) && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
                return;
            }

            const bot = bots.get(token);
            const chatId = data.chat_id || data.convId || 'group_oficial';
            const audio = data.audio || data.voice;

            const botMsg = {
                id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                convId: chatId,
                senderId: bot.id,
                senderName: bot.name,
                senderAvatar: bot.avatar,
                isBot: true,
                type: 'audio',
                audio: audio,
                duration: data.duration || 5,
                isStarred: false,
                reactions: {},
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            messages.push(botMsg);
            broadcast('new_message', botMsg);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: { message_id: botMsg.id, audio } }));
        });
        return;
    }

    // 12. Telegram-compatible /sendChatAction (typing status)
    if (pathname.endsWith('/sendChatAction') && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: invalid JSON' }));
                return;
            }
            const token = extractBotToken(req, parsedUrl, data);
            if (!token || !bots.has(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }));
                return;
            }

            const bot = bots.get(token);
            const chatId = data.chat_id || data.convId || 'group_oficial';

            broadcast('user_typing', {
                convId: chatId,
                userId: bot.id,
                name: bot.name,
                isTyping: true
            });

            setTimeout(() => {
                broadcast('user_typing', {
                    convId: chatId,
                    userId: bot.id,
                    name: bot.name,
                    isTyping: false
                });
            }, 3000);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, result: true }));
        });
        return;
    }

    // --- POLL VOTE ---
    if (pathname === '/api/messages/vote' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.msgId || data.optionId === undefined || !data.userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Parâmetros inválidos' }));
                return;
            }

            const msg = messages.find(m => m.id === data.msgId);
            if (msg && msg.poll && msg.poll.options) {
                const opt = msg.poll.options.find(o => o.id === data.optionId);
                if (opt) {
                    if (!opt.votes) opt.votes = [];
                    const vIdx = opt.votes.indexOf(data.userId);
                    if (vIdx !== -1) {
                        opt.votes.splice(vIdx, 1);
                    } else {
                        opt.votes.push(data.userId);
                    }
                    broadcast('poll_updated', { msgId: msg.id, convId: msg.convId, poll: msg.poll });
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, poll: msg ? msg.poll : null }));
        });
        return;
    }

    // --- REACT TO MESSAGE ---
    if (pathname === '/api/messages/react' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.msgId || !data.emoji || !data.userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Parâmetros inválidos' }));
                return;
            }

            const msg = messages.find(m => m.id === data.msgId);
            if (msg) {
                if (!msg.reactions) msg.reactions = {};
                if (msg.reactions[data.userId] === data.emoji) {
                    delete msg.reactions[data.userId];
                } else {
                    msg.reactions[data.userId] = data.emoji;
                }
                broadcast('message_reaction', { msgId: msg.id, convId: msg.convId, reactions: msg.reactions });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, reactions: msg ? msg.reactions : {} }));
        });
        return;
    }

    // --- DELETE MESSAGE (FOR ME OR FOR EVERYONE) ---
    if (pathname === '/api/messages/delete' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.msgId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'msgId obrigatório' }));
                return;
            }

            const msgIndex = messages.findIndex(m => m.id === data.msgId);
            if (msgIndex !== -1) {
                const msg = messages[msgIndex];
                if (data.deleteForEveryone) {
                    msg.isDeleted = true;
                    msg.text = '🚫 Esta mensagem foi apagada';
                    msg.media = null;
                    msg.sticker = null;
                    msg.audio = null;
                    msg.poll = null;
                    broadcast('message_deleted', { msgId: msg.id, convId: msg.convId, deleteForEveryone: true });
                    
                    try {
                        await updateDoc(doc(db, 'messages', msg.id), msg);
                    } catch(e) {}
                } else {
                    broadcast('message_deleted', { msgId: msg.id, convId: msg.convId, userId: data.userId, deleteForEveryone: false });
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // --- CLEAR ALL MESSAGES IN A CONVERSATION ---
    if (pathname === '/api/conversations/clear' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.convId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'convId obrigatório' }));
                return;
            }

            messages = messages.filter(m => m.convId !== data.convId);
            
            try {
                const q = query(collection(db, 'messages'), where('convId', '==', data.convId));
                const snap = await getDocs(q);
                snap.forEach(d => {
                    deleteDoc(doc(db, 'messages', d.id)).catch(e => console.error(e));
                });
                
                // Limpa também o lastMessage da conversa no Firestore
                const conv = conversations.get(data.convId);
                if (conv) {
                    conv.lastMessage = null;
                    await updateDoc(doc(db, 'conversations', data.convId), { lastMessage: null });
                }
            } catch (e) {
                console.error("Erro limpando chat no firebase:", e);
            }

            broadcast('conversation_cleared', { convId: data.convId });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, convId: data.convId }));
        });
        return;
    }

    // --- WEBRTC CALL START / SIGNALING ---
    if (pathname === '/api/calls/start' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.recipientId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'recipientId obrigatório' }));
                return;
            }

            broadcast('incoming_call', {
                callerId: data.callerId,
                callerName: data.callerName,
                callerAvatar: data.callerAvatar,
                recipientId: data.recipientId,
                convId: data.convId,
                callType: data.callType || 'audio'
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    if (pathname === '/api/calls/answer' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Dados inválidos' }));
                return;
            }
            broadcast('call_answered', data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    if (pathname === '/api/calls/end' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Dados inválidos' }));
                return;
            }
            broadcast('call_ended', data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // --- LOCK CONVERSATION WITH PIN ---
    if (pathname === '/api/conversations/lock' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.convId || !data.pin) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'convId e pin obrigatórios' }));
                return;
            }

            const conv = conversations.get(data.convId);
            if (conv) {
                conv.pinLock = data.pin;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, convId: data.convId }));
        });
        return;
    }

    // --- TYPING INDICATOR ---
    if (pathname === '/api/typing' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.convId || !data.userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Parâmetros inválidos' }));
                return;
            }

            const user = users.get(data.userId);
            const userName = user ? user.name : 'Alguém';
            const userAvatar = user ? user.avatar : `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.userId)}`;

            broadcast('user_typing', {
                convId: data.convId,
                userId: data.userId,
                name: userName,
                avatar: userAvatar,
                isTyping: !!data.isTyping
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    // --- STATUS / STORIES POST ---
    if (pathname === '/api/status' && req.method === 'POST') {
        parseBody(req, async (err, data) => {
            if (err || !data.userId || (!data.text && !data.media)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Dados inválidos' }));
                return;
            }

            const user = users.get(data.userId) || { name: 'Anônimo', avatar: '' };
            const newStatus = {
                id: 'status_' + Date.now(),
                userId: data.userId,
                userName: user.name,
                userAvatar: user.avatar,
                text: data.text || '',
                media: data.media || null,
                bgColor: data.bgColor || '#00a884',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            try {
                await setDoc(doc(db, 'statuses', newStatus.id), newStatus);
            } catch(e) {}

            statuses.unshift(newStatus);
            broadcast('new_status', newStatus);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, status: newStatus }));
        });
        return;
    }

    // --- STATIC FILES SERVING ---
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : safePath);
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🟢 ZapAnon Server Master v4.0 is LIVE!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🤖 Bot API: http://localhost:${PORT}/api/bot<token>/getUpdates`);
    console.log(`=======================================================`);
    
    // Carrega Bots do Firestore na inicialização
    getDocs(collection(db, 'bots')).then(snap => {
        snap.forEach(d => {
            bots.set(d.id, d.data());
            botUpdates.set(d.id, []);
        });
        console.log(`🤖 Carregados ${snap.size} bots do banco de dados.`);
    }).catch(e => console.error('Erro carregando bots do Firebase:', e));

    getDocs(collection(db, 'conversations')).then(snap => {
        if (snap.size === 0) {
            defaultGroups.forEach(async (g) => {
                conversations.set(g.id, g);
                try { await setDoc(doc(db, 'conversations', g.id), g); } catch(e) {}
            });
            console.log(`💬 Inicializados ${defaultGroups.length} grupos padrão no banco.`);
        } else {
            snap.forEach(d => conversations.set(d.id, d.data()));
            defaultGroups.forEach(g => {
                if (!conversations.has(g.id)) conversations.set(g.id, g);
            });
            console.log(`💬 Carregadas ${conversations.size} conversas/grupos do banco.`);
        }
    }).catch(e => console.error('Erro carregando conversas:', e));

    getDocs(collection(db, 'communities')).then(snap => {
        snap.forEach(d => communities.set(d.id, d.data()));
        console.log(`🏢 Carregadas ${snap.size} comunidades do banco.`);
    }).catch(e => console.error(e));

    getDocs(collection(db, 'channels')).then(snap => {
        snap.forEach(d => channels.set(d.id, d.data()));
        console.log(`📢 Carregados ${snap.size} canais do banco.`);
    }).catch(e => console.error(e));

    // --- KEEP-ALIVE AUTO-PING ENGINE (ANTI-SLEEP FOR RENDER 24/7) ---
    const APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || `http://localhost:${PORT}`;
    console.log(`⚡ Auto-Ping Anti-Sleep ativado 24/7 para: ${APP_URL}`);

    setInterval(() => {
        const pingUrl = `${APP_URL}/api/users/list`;
        const client = pingUrl.startsWith('https') ? https : http;
        
        client.get(pingUrl, (res) => {
            // Sucesso no Keep-Alive Ping
        }).on('error', (err) => {});
    }, 4 * 60 * 1000); // Dispara a cada 4 minutos (evita o sono de 15 min do Render)
});
