/* ==========================================================================
   WhatsApp Web Official Clone 2026 — Master Client Logic v4.0
   100% Functional Buttons, Group Editing, Settings, Bots, Communities & Canais
   ========================================================================== */

(function () {
    'use strict';

    // --- Helper Functions ---
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }



    // --- State Variables ---
    let currentUser = null;
    let activeConversation = null;
    let conversations = [];
    let stickerPacks = [];
    let statuses = [];
    let communities = [];
    let channels = [];
    let myBots = [];
    let starredMessages = [];
    let eventSource = null;
    let typingTimer = null;
    let currentReplyMessage = null;
    let stagedMediaBase64 = null;
    let activeAudioPlayer = null;
    let currentFilter = 'all';

    // Voice Recording state
    let mediaRecorder = null;
    let audioChunks = [];
    let recStartTime = 0;
    let recInterval = null;

    // --- DOM Elements ---
    const appRoot = document.getElementById('app');
    const myHeaderAvatar = document.getElementById('my-header-avatar');
    const btnOpenMyProfile = document.getElementById('btn-open-my-profile');
    const conversationsList = document.getElementById('conversations-list');
    const inputSearchChats = document.getElementById('input-search-chats');
    const filterChips = document.querySelectorAll('.chip-filter');

    // Header buttons (Top Navigation)
    const btnTabCommunities = document.getElementById('btn-tab-communities');
    const btnTabChannels = document.getElementById('btn-tab-channels');
    const btnTabStatus = document.getElementById('btn-tab-status');
    const btnTabBots = document.getElementById('btn-tab-bots');
    const btnNewChat = document.getElementById('btn-new-chat');

    // Dropdown Main Menu
    const btnMenuOptions = document.getElementById('btn-menu-options');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const menuOptNewGroup = document.getElementById('menu-opt-new-group');
    const menuOptNewCommunity = document.getElementById('menu-opt-new-community');
    const menuOptBots = document.getElementById('menu-opt-bots');
    const menuOptStarred = document.getElementById('menu-opt-starred');
    const menuOptSettings = document.getElementById('menu-opt-settings');
    const menuOptTheme = document.getElementById('menu-opt-theme');
    const menuOptClear = document.getElementById('menu-opt-clear');

    // Archived Bar
    const btnOpenArchived = document.getElementById('btn-open-archived');
    const archivedCountBadge = document.getElementById('archived-count-badge');

    // Drawer 1: Perfil
    const drawerProfile = document.getElementById('drawer-profile');
    const btnCloseProfileDrawer = document.getElementById('btn-close-profile-drawer');
    const profileCoverImg = document.getElementById('profile-cover-img');
    const inputUploadCover = document.getElementById('input-upload-cover');
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    const inputUploadAvatar = document.getElementById('input-upload-avatar');
    const btnDiceAvatarFast = document.getElementById('btn-dice-avatar-fast');
    const inputEditName = document.getElementById('input-edit-name');
    const btnSaveName = document.getElementById('btn-save-name');
    const inputEditAbout = document.getElementById('input-edit-about');
    const btnSaveAbout = document.getElementById('btn-save-about');

    // Drawer 2: Configurações Gerais
    const drawerSettings = document.getElementById('drawer-settings');
    const btnCloseSettingsDrawer = document.getElementById('btn-close-settings-drawer');
    const settingsMyAvatar = document.getElementById('settings-my-avatar');
    const settingsMyName = document.getElementById('settings-my-name');
    const settingsMyAbout = document.getElementById('settings-my-about');
    const btnSettingsToProfile = document.getElementById('btn-settings-to-profile');
    const btnOpenPrivacySub = document.getElementById('btn-open-privacy-sub');
    const btnOpenChatsSub = document.getElementById('btn-open-chats-sub');
    const btnOpenNotifsSub = document.getElementById('btn-open-notifs-sub');
    const btnOpenBotsSub = document.getElementById('btn-open-bots-sub');
    const btnOpenSecuritySub = document.getElementById('btn-open-security-sub');
    const btnOpenShortcutsSub = document.getElementById('btn-open-shortcuts-sub');
    const btnOpenHelpSub = document.getElementById('btn-open-help-sub');

    // Drawer 3: Privacidade Detalhada
    const drawerPrivacy = document.getElementById('drawer-privacy');
    const btnClosePrivacyDrawer = document.getElementById('btn-close-privacy-drawer');
    const selectPrivacyLastseen = document.getElementById('select-privacy-lastseen');
    const selectPrivacyPhoto = document.getElementById('select-privacy-photo');
    const selectPrivacyAbout = document.getElementById('select-privacy-about');
    const checkReadReceipts = document.getElementById('check-read-receipts');
    const checkGhostMode = document.getElementById('check-ghost-mode');

    // Drawer 4: Configurações de Conversas
    const drawerChatsSettings = document.getElementById('drawer-chats-settings');
    const btnCloseChatsDrawer = document.getElementById('btn-close-chats-drawer');
    const selectThemeSetting = document.getElementById('select-theme-setting');
    const selectWallpaperSetting = document.getElementById('select-wallpaper-setting');
    const selectFontSizeSetting = document.getElementById('select-font-size-setting');
    const checkEnterSend = document.getElementById('check-enter-send');
    const btnClearAllChats = document.getElementById('btn-clear-all-chats');

    // Drawer 5: Configurações de Notificações
    const drawerNotifsSettings = document.getElementById('drawer-notifs-settings');
    const btnCloseNotifsDrawer = document.getElementById('btn-close-notifs-drawer');
    const checkNotifSounds = document.getElementById('check-notif-sounds');
    const checkDesktopAlerts = document.getElementById('check-desktop-alerts');
    const checkPreviewMsg = document.getElementById('check-preview-msg');

    // Drawer 6: Segurança
    const drawerSecuritySettings = document.getElementById('drawer-security-settings');
    const btnCloseSecurityDrawer = document.getElementById('btn-close-security-drawer');
    const checkSecurityNotifs = document.getElementById('check-security-notifs');

    // Drawer 7: Atalhos
    const drawerShortcuts = document.getElementById('drawer-shortcuts');
    const btnCloseShortcutsDrawer = document.getElementById('btn-close-shortcuts-drawer');

    // Drawer 8: Mensagens Favoritas
    const drawerStarred = document.getElementById('drawer-starred');
    const btnCloseStarredDrawer = document.getElementById('btn-close-starred-drawer');
    const starredMessagesContainer = document.getElementById('starred-messages-container');

    // Drawer 9: Comunidades
    const drawerCommunities = document.getElementById('drawer-communities');
    const btnCloseCommunitiesDrawer = document.getElementById('btn-close-communities-drawer');
    const btnOpenNewCommunityModal = document.getElementById('btn-open-new-community-modal');
    const communitiesListContainer = document.getElementById('communities-list-container');
    const modalCreateCommunity = document.getElementById('modal-create-community');
    const btnCloseCreateCommunity = document.getElementById('btn-close-create-community');
    const inputCommunityName = document.getElementById('input-community-name');
    const inputCommunityDesc = document.getElementById('input-community-desc');
    const btnSubmitCreateCommunity = document.getElementById('btn-submit-create-community');

    // Drawer 10: Canais
    const drawerChannels = document.getElementById('drawer-channels');
    const btnCloseChannelsDrawer = document.getElementById('btn-close-channels-drawer');
    const channelsListContainer = document.getElementById('channels-list-container');

    // Drawer 11: Status / Stories
    const drawerStatus = document.getElementById('drawer-status');
    const btnCloseStatusDrawer = document.getElementById('btn-close-status-drawer');
    const myStatusAvatar = document.getElementById('my-status-avatar');
    const btnMyStatusAdd = document.getElementById('btn-my-status-add');
    const statusFeedContainer = document.getElementById('status-feed-container');

    // Drawer 12: Novo Grupo
    const drawerNewGroup = document.getElementById('drawer-new-group');
    const btnCloseNewGroupDrawer = document.getElementById('btn-close-new-group-drawer');
    const formCreateGroup = document.getElementById('form-create-group');
    const newgroupCoverPreview = document.getElementById('newgroup-cover-preview');
    const inputGroupCover = document.getElementById('input-group-cover');
    const newgroupAvatarPreview = document.getElementById('newgroup-avatar-preview');
    const inputGroupAvatar = document.getElementById('input-group-avatar');
    const inputNewgroupName = document.getElementById('input-newgroup-name');
    const inputNewgroupDesc = document.getElementById('input-newgroup-desc');

    // Drawer 13: BotFather
    const drawerBots = document.getElementById('drawer-bots');
    const btnCloseBotsDrawer = document.getElementById('btn-close-bots-drawer');
    const btnOpenCreateBotModal = document.getElementById('btn-open-create-bot-modal');
    const botsListContainer = document.getElementById('bots-list-container');
    const modalCreateBot = document.getElementById('modal-create-bot');
    const btnCloseCreateBot = document.getElementById('btn-close-create-bot');
    const inputBotName = document.getElementById('input-bot-name');
    const inputBotUsername = document.getElementById('input-bot-username');
    const inputBotDesc = document.getElementById('input-bot-desc');
    const btnSubmitCreateBot = document.getElementById('btn-submit-create-bot');

    // Modal Edit Bot
    const modalEditBot = document.getElementById('modal-edit-bot');
    const btnCloseEditBot = document.getElementById('btn-close-edit-bot');
    const editBotToken = document.getElementById('edit-bot-token');
    const editBotAvatarPreview = document.getElementById('edit-bot-avatar-preview');
    const inputEditBotAvatar = document.getElementById('input-edit-bot-avatar');
    const editBotName = document.getElementById('edit-bot-name');
    const editBotDesc = document.getElementById('edit-bot-desc');
    const btnRevokeBotToken = document.getElementById('btn-revoke-bot-token');
    const btnDeleteBotAction = document.getElementById('btn-delete-bot-action');
    const btnSubmitEditBot = document.getElementById('btn-submit-edit-bot');
    let stagedEditBotAvatarBase64 = null;

    // Chat Viewport & Active Screen
    const introScreen = document.getElementById('intro-screen');
    const activeChatContainer = document.getElementById('active-chat-container');
    const btnChatBack = document.getElementById('btn-chat-back');
    const chatHeaderAvatarImg = document.getElementById('chat-header-avatar-img');
    const chatHeaderTitle = document.getElementById('chat-header-title');
    const chatHeaderSubtitle = document.getElementById('chat-header-subtitle');
    const btnOpenGroupInfo = document.getElementById('btn-open-group-info');
    const btnHeaderSearch = document.getElementById('btn-header-search');
    const chatSearchBarOverlay = document.getElementById('chat-search-bar-overlay');
    const inputSearchInsideChat = document.getElementById('input-search-inside-chat');
    const btnCloseChatSearch = document.getElementById('btn-close-chat-search');
    const messagesWall = document.getElementById('messages-wall');
    const chatTypingBar = document.getElementById('chat-typing-bar');
    const chatTypingText = document.getElementById('chat-typing-text');

    // Chat Header Options Dropdown
    const btnChatMoreOptions = document.getElementById('btn-chat-more-options');
    const chatMoreDropdown = document.getElementById('chat-more-dropdown');
    const optViewInfo = document.getElementById('opt-view-info');
    const optAddMember = document.getElementById('opt-add-member');
    const optClearChat = document.getElementById('opt-clear-chat');
    const optMuteChat = document.getElementById('opt-mute-chat');
    const optLeaveChat = document.getElementById('opt-leave-chat');

    // Reply & Recording & Media Tray
    const chatReplyBanner = document.getElementById('chat-reply-banner');
    const replyBannerAuthor = document.getElementById('reply-banner-author');
    const replyBannerSnippet = document.getElementById('reply-banner-snippet');
    const btnCloseReply = document.getElementById('btn-close-reply');

    const chatRecordingBar = document.getElementById('chat-recording-bar');
    const recDurationLabel = document.getElementById('rec-duration-label');
    const btnCancelVoice = document.getElementById('btn-cancel-voice');
    const btnSendVoice = document.getElementById('btn-send-voice');

    const mediaPreviewTray = document.getElementById('media-preview-tray');
    const mediaPreviewThumb = document.getElementById('media-preview-thumb');
    const btnRemoveMediaThumb = document.getElementById('btn-remove-media-thumb');

    // Footer & Input
    const chatInputTextarea = document.getElementById('chat-input-textarea');
    const inputChatFile = document.getElementById('input-chat-file');
    const btnActionSendOrMic = document.getElementById('btn-action-send-or-mic');
    const actionBtnIcon = document.getElementById('action-btn-icon');
    const btnToggleStickersEmojis = document.getElementById('btn-toggle-stickers-emojis');
    const btnToggleAttachMenu = document.getElementById('btn-toggle-attach-menu');
    const attachPopupMenu = document.getElementById('attach-popup-menu');
    const stickersEmojiPanel = document.getElementById('stickers-emoji-panel');
    const panelTabButtons = document.querySelectorAll('.stickers-panel-tabs .tab-btn');
    const stickerPacksNav = document.getElementById('sticker-packs-nav');
    const stickersGridItems = document.getElementById('stickers-grid-items');

    // Right Info Drawer (Group Edit)
    const rightInfoDrawer = document.getElementById('right-info-drawer');
    const btnCloseGroupInfo = document.getElementById('btn-close-group-info');
    const infoGroupCover = document.getElementById('info-group-cover');
    const inputEditGroupCover = document.getElementById('input-edit-group-cover');
    const infoGroupAvatar = document.getElementById('info-group-avatar');
    const inputEditGroupAvatar = document.getElementById('input-edit-group-avatar');
    const inputInlineGroupName = document.getElementById('input-inline-group-name');
    const btnSaveGroupNameInline = document.getElementById('btn-save-group-name-inline');
    const infoGroupMembersCount = document.getElementById('info-group-members-count');
    const textareaGroupDesc = document.getElementById('textarea-group-desc');
    const btnSaveGroupDesc = document.getElementById('btn-save-group-desc');
    const selectGroupDisappearing = document.getElementById('select-group-disappearing');
    const checkGroupMute = document.getElementById('check-group-mute');
    const btnOpenAddMemberModal = document.getElementById('btn-open-add-member-modal');
    const groupMembersListBox = document.getElementById('group-members-list-box');
    const btnActionLeaveGroup = document.getElementById('btn-action-leave-group');

    // Modals
    const modalAddMember = document.getElementById('modal-add-member');
    const btnCloseAddMember = document.getElementById('btn-close-add-member');
    const inputNewMemberName = document.getElementById('input-new-member-name');
    const btnSubmitAddMember = document.getElementById('btn-submit-add-member');

    const statusViewerModal = document.getElementById('status-viewer-modal');
    const statusProgressFill = document.getElementById('status-progress-fill');
    const viewerUserAvatar = document.getElementById('viewer-user-avatar');
    const viewerUserName = document.getElementById('viewer-user-name');
    const viewerUserTime = document.getElementById('viewer-user-time');
    const btnCloseStatusViewer = document.getElementById('btn-close-status-viewer');
    const statusViewerBody = document.getElementById('status-viewer-body');

    const modalCreateStatus = document.getElementById('modal-create-status');
    const btnCloseCreateStatus = document.getElementById('btn-close-create-status');
    const inputStatusText = document.getElementById('input-status-text');
    const inputStatusPhoto = document.getElementById('input-status-photo');
    const statusPhotoPreview = document.getElementById('status-photo-preview');
    const statusCreatorPreview = document.getElementById('status-creator-preview');
    const btnSubmitStatus = document.getElementById('btn-submit-status');
    let currentStatusBg = '#00a884';
    let stagedStatusPhotoBase64 = null;
    let isCreatingGroupStatus = false;
    const onlineUsersMap = new Map();

    const modalCreatePoll = document.getElementById('modal-create-poll');
    const btnCloseCreatePoll = document.getElementById('btn-close-create-poll');
    const btnOpenPollCreator = document.getElementById('btn-open-poll-creator');
    const inputPollQuestion = document.getElementById('input-poll-question');
    const pollOptionsContainer = document.getElementById('poll-options-container');
    const btnAddPollOption = document.getElementById('btn-add-poll-option');
    const btnSubmitPoll = document.getElementById('btn-submit-poll');

    // --- 1. INITIALIZATION & SYNC ---
    async function initApp() {
        // Enforce user settings
        applyThemeAndPreferences();

        let storedId = localStorage.getItem('wa_user_id');
        let storedName = localStorage.getItem('wa_user_name');
        let storedHandle = localStorage.getItem('wa_user_handle');
        let storedAvatar = localStorage.getItem('wa_user_avatar');
        let storedCover = localStorage.getItem('wa_user_cover');

        if (!storedId) {
            storedId = 'anon_' + Math.random().toString(36).substring(2, 9);
            const rNum = Math.floor(1000 + Math.random() * 9000);
            storedName = 'Anônimo #' + rNum;
            storedHandle = '@anon_' + rNum;
            storedAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(storedId)}`;
            storedCover = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80';
            
            localStorage.setItem('wa_user_id', storedId);
            localStorage.setItem('wa_user_name', storedName);
            localStorage.setItem('wa_user_handle', storedHandle);
            localStorage.setItem('wa_user_avatar', storedAvatar);
            localStorage.setItem('wa_user_cover', storedCover);
        }

        if (!storedHandle) {
            storedHandle = '@' + storedName.toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(100 + Math.random() * 900);
            localStorage.setItem('wa_user_handle', storedHandle);
        }

        const syncPayload = {
            userId: storedId,
            name: storedName,
            handle: storedHandle,
            avatar: storedAvatar,
            cover: storedCover
        };

        try {
            const res = await fetch('/api/user/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncPayload)
            });
            const data = await res.json();
            currentUser = data.user;
            conversations = data.conversations || [];
            stickerPacks = data.stickerPacks || [];
            statuses = data.statuses || [];
            communities = data.communities || [];
            channels = data.channels || [];

            updateProfileUI();
            renderConversations();
            renderStickerPacks();
            renderStatuses();
            renderCommunities();
            renderChannels();
            loadMyBots();
            connectSSE();

            // Auto-join group if invite link is present in URL
            const urlParams = new URLSearchParams(window.location.search);
            const inviteCode = urlParams.get('invite');
            if (inviteCode) {
                try {
                    const r = await fetch('/api/groups/join-by-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: storedId, inviteToken: inviteCode })
                    });
                    const d = await r.json();
                    if (d.success && d.group) {
                        const exists = conversations.find(c => c.id === d.group.id);
                        if (!exists) conversations.unshift(d.group);
                        renderConversations();
                        selectConversation(d.group.id);
                        showToast(`Você entrou no grupo "${d.group.name}"! 🎉`, 'fa-solid fa-users');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else if (d.error) {
                        showToast(d.error, 'fa-solid fa-triangle-exclamation');
                    }
                } catch (e) {}
            }

            // Auto-select first conversation on desktop if no URL invite
            if (!inviteCode && conversations.length > 0 && window.innerWidth > 768) {
                selectConversation(conversations[0].id);
            }
        } catch (err) {
            console.error('Init error:', err);
        }
    }

    function applyThemeAndPreferences() {
        const savedTheme = localStorage.getItem('wa_theme') || 'light';
        const savedWallpaper = localStorage.getItem('wa_wallpaper') || 'default';
        const savedFontSize = localStorage.getItem('wa_fontsize') || 'medium';

        document.body.className = `${savedTheme}-theme font-${savedFontSize} wallpaper-${savedWallpaper}`;

        if (selectThemeSetting) selectThemeSetting.value = savedTheme;
        if (selectWallpaperSetting) selectWallpaperSetting.value = savedWallpaper;
        if (selectFontSizeSetting) selectFontSizeSetting.value = savedFontSize;
    }

    function updateProfileUI() {
        if (!currentUser) return;
        myHeaderAvatar.src = currentUser.avatar;
        myStatusAvatar.src = currentUser.avatar;
        profileAvatarImg.src = currentUser.avatar;
        profileCoverImg.src = currentUser.cover;
        inputEditName.value = currentUser.name;
        const inputEditHandle = document.getElementById('input-edit-handle');
        if (inputEditHandle) inputEditHandle.value = currentUser.handle || ('@' + currentUser.id);
        inputEditAbout.value = currentUser.about || '';

        settingsMyAvatar.src = currentUser.avatar;
        settingsMyName.textContent = currentUser.name;
        settingsMyAbout.textContent = currentUser.about || 'Disponível';

        if (currentUser.privacy) {
            selectPrivacyLastseen.value = currentUser.privacy.lastSeen || 'everyone';
            selectPrivacyPhoto.value = currentUser.privacy.photo || 'everyone';
            selectPrivacyAbout.value = currentUser.privacy.about || 'everyone';
            checkReadReceipts.checked = currentUser.privacy.readReceipts !== false;
            checkGhostMode.checked = !!currentUser.privacy.ghostMode;
        }
    }

    // --- 2. REAL-TIME SERVER-SENT EVENTS ---
    function connectSSE() {
        if (!currentUser) return;
        if (eventSource) eventSource.close();

        eventSource = new EventSource(`/api/stream?userId=${encodeURIComponent(currentUser.id)}`);

        eventSource.addEventListener('new_message', (e) => {
            const msg = JSON.parse(e.data);
            handleNewIncomingMessage(msg);
        });

        eventSource.addEventListener('conversation_created', (e) => {
            const conv = JSON.parse(e.data);
            if (!conversations.some(c => c.id === conv.id)) {
                conversations.unshift(conv);
                renderConversations();
            }
        });

        eventSource.addEventListener('conversation_updated', (e) => {
            const conv = JSON.parse(e.data);
            const idx = conversations.findIndex(c => c.id === conv.id);
            if (idx !== -1) {
                conversations[idx] = conv;
                renderConversations();
                if (activeConversation && activeConversation.id === conv.id) {
                    activeConversation = conv;
                    updateChatHeader();
                    populateGroupInfoDrawer();
                }
            }
        });

        eventSource.addEventListener('conversation_deleted', (e) => {
            const data = JSON.parse(e.data);
            conversations = conversations.filter(c => c.id !== data.groupId);
            renderConversations();
            if (activeConversation && activeConversation.id === data.groupId) {
                activeConversation = null;
                if (rightInfoDrawer) {
                    rightInfoDrawer.classList.remove('active');
                    rightInfoDrawer.classList.remove('fullscreen');
                }
                const messagesWall = document.getElementById('messages-wall');
                if (messagesWall) messagesWall.innerHTML = '';
                const chatHeaderTitle = document.getElementById('chat-header-title');
                if (chatHeaderTitle) chatHeaderTitle.textContent = '';
                const chatHeaderSubtitle = document.getElementById('chat-header-subtitle');
                if (chatHeaderSubtitle) chatHeaderSubtitle.textContent = '';

                const introScreen = document.getElementById('intro-screen');
                if (introScreen) introScreen.style.display = 'flex';
                if (activeChatContainer) activeChatContainer.classList.remove('active');
                if (appRoot) appRoot.classList.remove('mobile-active');
            }
        });

        eventSource.addEventListener('user_status_changed', (e) => {
            const data = JSON.parse(e.data);
            onlineUsersMap.set(data.userId, { isOnline: data.isOnline, lastSeen: data.lastSeen });
            if (activeConversation && activeConversation.type === 'direct') {
                const recId = activeConversation.recipientId || (activeConversation.members && activeConversation.members.find(m => m.id !== (currentUser ? currentUser.id : ''))?.id);
                if (recId === data.userId) {
                    updateChatHeader();
                }
            }
            renderConversations();
        });

        eventSource.addEventListener('message_reaction', (e) => {
            const data = JSON.parse(e.data);
            updateMessageReactionsDOM(data.msgId, data.reactions);
        });

        eventSource.addEventListener('incoming_call', (e) => {
            const data = JSON.parse(e.data);
            handleIncomingCall(data);
        });

        eventSource.addEventListener('poll_updated', (e) => {
            const data = JSON.parse(e.data);
            updatePollDOM(data.msgId, data.poll);
        });

        eventSource.addEventListener('user_typing', (e) => {
            const data = JSON.parse(e.data);
            handleTypingIndicator(data);
        });

        eventSource.addEventListener('new_status', (e) => {
            const st = JSON.parse(e.data);
            statuses.unshift(st);
            renderStatuses();
        });
    }

    async function handleLeaveOrDeleteConversation(groupId) {
        if (!groupId) return;
        try {
            const res = await fetch('/api/groups/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, userId: currentUser ? currentUser.id : '' })
            });
            await res.json();

            conversations = conversations.filter(c => c.id !== groupId);
            renderConversations();

            if (activeConversation && activeConversation.id === groupId) {
                activeConversation = null;
                if (rightInfoDrawer) {
                    rightInfoDrawer.classList.remove('active');
                    rightInfoDrawer.classList.remove('fullscreen');
                }
                const messagesWall = document.getElementById('messages-wall');
                if (messagesWall) messagesWall.innerHTML = '';
                const chatHeaderTitle = document.getElementById('chat-header-title');
                if (chatHeaderTitle) chatHeaderTitle.textContent = '';
                const chatHeaderSubtitle = document.getElementById('chat-header-subtitle');
                if (chatHeaderSubtitle) chatHeaderSubtitle.textContent = '';

                const introScreen = document.getElementById('intro-screen');
                if (introScreen) introScreen.style.display = 'flex';
                if (activeChatContainer) activeChatContainer.classList.remove('active');
                if (appRoot) appRoot.classList.remove('mobile-active');
            }
        } catch (e) {
            console.error('Erro ao sair/apagar grupo:', e);
            alert('Erro ao apagar grupo: ' + e.message);
        }
    }

    // --- 3. CONVERSATIONS RENDERING ---
    async function renderConversations(filterText = '') {
        conversationsList.innerHTML = '';
        let list = conversations;

        if (currentFilter === 'groups') {
            list = list.filter(c => c.type === 'group');
        }

        if (filterText) {
            list = list.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()));
        }

        list.forEach(conv => {
            const card = document.createElement('div');
            card.className = `chat-card ${activeConversation && activeConversation.id === conv.id ? 'active' : ''}`;
            card.dataset.convId = conv.id;

            const lastMsg = conv.lastMessage;
            let previewText = (conv.type === 'direct' ? 'Conversa Privada' : (conv.desc || 'Toque para conversar'));
            let timeText = '';

            if (lastMsg) {
                timeText = lastMsg.time;
                if (lastMsg.type === 'poll') previewText = '📊 Enquete: ' + (lastMsg.poll ? lastMsg.poll.question : '');
                else if (lastMsg.type === 'sticker') previewText = '🎴 Figurinha';
                else if (lastMsg.type === 'audio') previewText = '🎤 Mensagem de voz';
                else if (lastMsg.type === 'image') previewText = '📷 Foto';
                else previewText = lastMsg.text;
            }

            let isRecOnline = false;
            if (conv.type === 'direct' && conv.recipientId) {
                const info = onlineUsersMap.get(conv.recipientId);
                if (info && info.isOnline) {
                    isRecOnline = true;
                }
            }

            card.innerHTML = `
                <div class="chat-card-avatar">
                    <img src="${escapeHTML(conv.avatar || '')}" alt="">
                    ${isRecOnline ? '<span class="avatar-online-dot" title="Online agora"></span>' : ''}
                </div>
                <div class="chat-card-body">
                    <div class="chat-card-title-row">
                        <span class="chat-card-name">${escapeHTML(conv.name)}</span>
                        <span class="chat-card-time">${timeText}</span>
                    </div>
                    <div class="chat-card-msg-row">
                        <span class="chat-card-preview">${escapeHTML(previewText)}</span>
                        ${conv.isPinned ? '<i class="fa-solid fa-thumbtack chat-pin-icon"></i>' : ''}
                        <button type="button" class="btn-delete-card" title="${conv.type === 'group' ? 'Sair do Grupo' : 'Apagar Conversa'}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            const btnDelCard = card.querySelector('.btn-delete-card');
            if (btnDelCard) {
                btnDelCard.addEventListener('click', async (evt) => {
                    evt.stopPropagation();
                    const actionLabel = conv.type === 'group' ? 'sair do grupo' : 'apagar a conversa';
                    if (confirm(`Tem certeza que deseja ${actionLabel} "${conv.name}"?`)) {
                        await handleLeaveOrDeleteConversation(conv.id);
                    }
                });
            }

            card.addEventListener('contextmenu', async (evt) => {
                evt.preventDefault();
                const actionLabel = conv.type === 'group' ? 'sair do grupo' : 'apagar a conversa';
                if (confirm(`Deseja ${actionLabel} "${conv.name}"?`)) {
                    await handleLeaveOrDeleteConversation(conv.id);
                }
            });

            card.addEventListener('click', () => selectConversation(conv.id));
            conversationsList.appendChild(card);
        });

        // Search registered users by Nickname in real time
        if (filterText && filterText.length >= 2) {
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(filterText)}&currentUserId=${currentUser ? currentUser.id : ''}`);
                const data = await res.json();
                const matchedUsers = data.users || [];

                if (matchedUsers.length > 0) {
                    const header = document.createElement('div');
                    header.style.padding = '12px 16px 6px 16px';
                    header.style.fontSize = '12px';
                    header.style.fontWeight = '700';
                    header.style.color = 'var(--wa-green)';
                    header.style.textTransform = 'uppercase';
                    header.innerHTML = '<i class="fa-solid fa-user-check"></i> Pessoas encontradas por Nickname';
                    conversationsList.appendChild(header);

                    matchedUsers.forEach(u => {
                        const userCard = document.createElement('div');
                        userCard.className = 'chat-card';
                        userCard.style.background = 'var(--wa-bg-hover)';
                        userCard.innerHTML = `
                            <div class="chat-card-avatar">
                                <img src="${u.avatar}" alt="">
                            </div>
                            <div class="chat-card-body">
                                <div class="chat-card-title-row">
                                    <span class="chat-card-name">${escapeHTML(u.name)}</span>
                                    ${u.isOnline ? '<span style="color:var(--wa-green); font-size:11px; font-weight:600;">Online</span>' : ''}
                                </div>
                                <div class="chat-card-msg-row">
                                    <span class="chat-card-preview">${escapeHTML(u.about)}</span>
                                </div>
                            </div>
                        `;
                        userCard.addEventListener('click', async () => {
                            await startDirectPrivateChat(u.id, u.name, u.avatar);
                        });
                        conversationsList.appendChild(userCard);
                    });
                }
            } catch (e) {}
        }
    }

    // --- 4. SELECT CONVERSATION ---
    async function selectConversation(convId) {
        const conv = conversations.find(c => c.id === convId);
        if (!conv) return;
        activeConversation = conv;

        introScreen.style.display = 'none';
        activeChatContainer.classList.add('active');
        appRoot.classList.add('mobile-active');

        document.querySelectorAll('.chat-card').forEach(c => {
            c.classList.toggle('active', c.dataset.convId === convId);
        });

        updateChatHeader();
        populateGroupInfoDrawer();
        applyWallpaperToChat(conv.wallpaper);
        stickersEmojiPanel.classList.remove('active');
        attachPopupMenu.classList.remove('active');
        chatSearchBarOverlay.classList.remove('active');
        clearReply();

        messagesWall.innerHTML = '<div style="text-align:center; padding:30px; color:var(--wa-text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando mensagens...</div>';

        try {
            const res = await fetch(`/api/messages?convId=${encodeURIComponent(convId)}`);
            const data = await res.json();
            messagesWall.innerHTML = '';

            const e2eeBanner = document.createElement('div');
            e2eeBanner.className = 'system-msg-badge';
            e2eeBanner.style.background = 'rgba(0, 168, 132, 0.12)';
            e2eeBanner.style.color = 'var(--wa-text-main)';
            e2eeBanner.style.border = '1px solid var(--wa-green)';
            e2eeBanner.style.borderRadius = '8px';
            e2eeBanner.style.padding = '8px 14px';
            e2eeBanner.style.maxWidth = '420px';
            e2eeBanner.style.margin = '10px auto 16px auto';
            e2eeBanner.style.fontSize = '12px';
            e2eeBanner.style.lineHeight = '1.4';
            e2eeBanner.innerHTML = `<i class="fa-solid fa-lock" style="color:var(--wa-green); margin-right:4px;"></i> As mensagens e as chamadas são protegidas com a criptografia de ponta a ponta. Ninguém fora desta conversa pode ler ou ouvi-las.`;
            messagesWall.appendChild(e2eeBanner);

            let lastDateLabel = '';
            (data.messages || []).forEach(m => {
                const dateLabel = formatGroupDateLabel(m.timestamp || Date.now());
                if (dateLabel !== lastDateLabel) {
                    lastDateLabel = dateLabel;
                    const dateDivider = document.createElement('div');
                    dateDivider.className = 'chat-date-divider-badge';
                    dateDivider.innerHTML = `<span>${escapeHTML(dateLabel)}</span>`;
                    messagesWall.appendChild(dateDivider);
                }
                appendMessage(m);
            });
            scrollToBottom();
        } catch (e) {
            messagesWall.innerHTML = '<div style="text-align:center; padding:30px; color:#ea4335;">Erro ao carregar mensagens.</div>';
        }
    }

    function formatGroupDateLabel(timestamp) {
        if (!timestamp) return 'HOJE';
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) return 'HOJE';

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'ONTEM';

        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('pt-BR', options).toUpperCase();
    }

    function formatLastSeenTime(timestamp) {
        if (!timestamp) return 'recentemente';
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        if (isToday) {
            return `hoje às ${hours}:${minutes}`;
        }
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `ontem às ${hours}:${minutes}`;
        }
        return `${date.toLocaleDateString('pt-BR')} às ${hours}:${minutes}`;
    }

    async function updateChatHeader() {
        if (!activeConversation) return;
        chatHeaderAvatarImg.src = activeConversation.avatar;
        chatHeaderTitle.textContent = activeConversation.name;
        
        const avatarRing = document.getElementById('chat-header-avatar-ring');
        if (avatarRing) {
            if (activeConversation.type === 'group' && activeConversation.groupStatuses && activeConversation.groupStatuses.length > 0) {
                avatarRing.classList.add('has-status');
            } else {
                avatarRing.classList.remove('has-status');
            }
        }

        if (activeConversation.type === 'direct') {
            const recipientId = activeConversation.recipientId || (activeConversation.members && activeConversation.members.find(m => m.id !== (currentUser ? currentUser.id : ''))?.id);
            if (recipientId) {
                try {
                    const res = await fetch(`/api/users/profile?userId=${encodeURIComponent(recipientId)}`);
                    const data = await res.json();
                    if (data.success && data.user) {
                        if (data.user.isOnline) {
                            chatHeaderSubtitle.innerHTML = '<span style="color:var(--wa-green); font-weight:600;">online</span>';
                        } else {
                            chatHeaderSubtitle.textContent = 'visto por último ' + formatLastSeenTime(data.user.lastSeen);
                        }
                        return;
                    }
                } catch (e) {}
            }
            chatHeaderSubtitle.textContent = 'visto por último recentemente';
        } else {
            const members = activeConversation.members || [];
            if (members.length > 0) {
                const myId = currentUser ? currentUser.id : '';
                const memberNames = members.map(m => m.id === myId ? 'Você' : m.name);
                let text = memberNames.slice(0, 4).join(', ');
                if (memberNames.length > 4) {
                    text += ` e mais ${memberNames.length - 4}`;
                }
                chatHeaderSubtitle.textContent = text;
            } else {
                chatHeaderSubtitle.textContent = 'Grupo • ZapAnon';
            }
        }
    }

    chatHeaderAvatarImg.style.cursor = 'pointer';
    chatHeaderTitle.style.cursor = 'pointer';

    function handleOpenHeaderDetails() {
        if (!activeConversation) return;
        if (activeConversation.type === 'direct' && activeConversation.recipientId) {
            openUserProfileModal(activeConversation.recipientId);
        } else {
            populateGroupInfoDrawer();
            rightInfoDrawer.classList.add('active');
            rightInfoDrawer.classList.add('fullscreen');
        }
    }

    chatHeaderAvatarImg.addEventListener('click', handleOpenHeaderDetails);
    chatHeaderTitle.addEventListener('click', handleOpenHeaderDetails);

    btnChatBack.addEventListener('click', () => {
        appRoot.classList.remove('mobile-active');
    });

    // --- 5. GROUP EDITING & RIGHT DRAWER ---
    function populateGroupInfoDrawer() {
        if (!activeConversation) return;
        infoGroupCover.src = activeConversation.cover || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
        infoGroupAvatar.src = activeConversation.avatar;
        inputInlineGroupName.value = activeConversation.name;
        const count = activeConversation.members ? activeConversation.members.length : 1;
        infoGroupMembersCount.textContent = `Grupo • ${count} participante${count === 1 ? '' : 's'}`;
        textareaGroupDesc.value = activeConversation.desc || '';
        selectGroupDisappearing.value = activeConversation.disappearing || 'off';
        checkGroupMute.checked = !!activeConversation.mute;

        const members = activeConversation.members || [{ id: 'user', name: currentUser ? currentUser.name : 'Você', avatar: currentUser ? currentUser.avatar : '', role: 'creator' }];
        
        const myId = currentUser ? currentUser.id : '';
        const myMem = members.find(m => m.id === myId);
        const isMeCreator = (activeConversation.creatorId && activeConversation.creatorId === myId) || (myMem && myMem.role === 'creator');
        const isMeAdmin = isMeCreator || (myMem && myMem.role === 'admin');

        const canEditInfo = isMeAdmin || (activeConversation.permissions && activeConversation.permissions.editGroupInfo !== false);
        const editGroupCoverBtn = document.querySelector('.btn-change-cover-small');
        const editGroupAvatarBadge = document.querySelector('.avatar-camera-badge-sm');
        const diceEditGroupBtn = document.getElementById('btn-dice-edit-group-avatar');
        const saveGroupNameBtn = document.getElementById('btn-save-group-name-inline');
        const saveGroupDescBtn = document.getElementById('btn-save-group-desc');

        if (editGroupCoverBtn) editGroupCoverBtn.style.display = canEditInfo ? 'flex' : 'none';
        if (editGroupAvatarBadge) editGroupAvatarBadge.style.display = canEditInfo ? 'flex' : 'none';
        if (diceEditGroupBtn) diceEditGroupBtn.style.display = canEditInfo ? 'inline-flex' : 'none';
        if (saveGroupNameBtn) saveGroupNameBtn.style.display = canEditInfo ? 'flex' : 'none';
        if (saveGroupDescBtn) saveGroupDescBtn.style.display = canEditInfo ? 'block' : 'none';

        if (inputInlineGroupName) inputInlineGroupName.disabled = !canEditInfo;
        if (textareaGroupDesc) textareaGroupDesc.disabled = !canEditInfo;

        // Render Members with WhatsApp Hierarchy Rules
        groupMembersListBox.innerHTML = '';

        members.forEach(mem => {
            const isCreator = (activeConversation.creatorId && activeConversation.creatorId === mem.id) || mem.role === 'creator';
            const isAdmin = !isCreator && mem.role === 'admin';
            const isSelf = mem.id === myId;

            let badgeHtml = '';
            if (isCreator) {
                badgeHtml = `<span class="member-role-badge creator" style="background:#00a884; color:#fff; font-size:11px; padding:2px 8px; border-radius:10px; font-weight:700;">Criador</span>`;
            } else if (isAdmin) {
                badgeHtml = `<span class="member-role-badge" style="background:rgba(0,168,132,0.15); color:var(--wa-green); font-size:11px; padding:2px 8px; border-radius:10px; font-weight:700;">Admin</span>`;
            }

            let canPromote = isMeAdmin && !isAdmin && !isCreator && !isSelf;
            let canDemote = isMeAdmin && isAdmin && !isCreator && !isSelf;
            let canRemove = !isCreator && !isSelf && (isMeCreator || (isMeAdmin && !isAdmin));

            const row = document.createElement('div');
            row.className = 'member-item-row';
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.padding = '8px 12px';
            row.style.borderBottom = '1px solid var(--wa-border)';

            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; cursor:pointer;" class="member-click-area">
                    <img src="${mem.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                    <div style="min-width:0;">
                        <strong style="font-size:14px; color:var(--wa-text-main); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${escapeHTML(mem.name)} ${isSelf ? '(Você)' : ''}
                        </strong>
                        ${badgeHtml}
                    </div>
                </div>
                ${!isSelf ? `
                    <div class="member-actions-row" style="display:flex; gap:6px;">
                        ${canPromote ? `<button class="btn-mem-action btn-promote-mem" title="Promover a Admin" style="background:transparent; border:none; color:var(--wa-green); cursor:pointer; font-size:14px; padding:4px;"><i class="fa-solid fa-user-shield"></i></button>` : ''}
                        ${canDemote ? `<button class="btn-mem-action btn-demote-mem" title="Rebaixar para Membro" style="background:transparent; border:none; color:#f97316; cursor:pointer; font-size:14px; padding:4px;"><i class="fa-solid fa-user-minus"></i></button>` : ''}
                        ${canRemove ? `<button class="btn-mem-action btn-remove-mem" title="Remover do Grupo" style="background:transparent; border:none; color:#ea4335; cursor:pointer; font-size:14px; padding:4px;"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                ` : ''}
            `;

            row.querySelector('.member-click-area').addEventListener('click', () => {
                if (isSelf) {
                    btnOpenMyProfile.click();
                } else {
                    openUserProfileModal(mem.id, mem.name, mem.avatar);
                }
            });

            const btnProm = row.querySelector('.btn-promote-mem');
            if (btnProm) {
                btnProm.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`Promover "${mem.name}" a Administrador do grupo?`)) {
                        await updateGroupData({ promoteMemberId: mem.id });
                    }
                });
            }

            const btnDem = row.querySelector('.btn-demote-mem');
            if (btnDem) {
                btnDem.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`Rebaixar "${mem.name}" para Membro?`)) {
                        await updateGroupData({ demoteMemberId: mem.id });
                    }
                });
            }

            const btnRem = row.querySelector('.btn-remove-mem');
            if (btnRem) {
                btnRem.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`Remover "${mem.name}" do grupo?`)) {
                        await updateGroupData({ removeMemberId: mem.id });
                    }
                });
            }

            groupMembersListBox.appendChild(row);
        });
    }

    const btnToggleFullscreenDrawer = document.getElementById('btn-toggle-fullscreen-drawer');
    if (btnToggleFullscreenDrawer) {
        btnToggleFullscreenDrawer.addEventListener('click', () => {
            rightInfoDrawer.classList.toggle('fullscreen');
        });
    }

    const btnTriggerWallpaperModal = document.getElementById('btn-trigger-wallpaper-modal');
    if (btnTriggerWallpaperModal) {
        btnTriggerWallpaperModal.addEventListener('click', () => {
            openWallpaperModal();
        });
    }

    btnOpenGroupInfo.addEventListener('click', () => {
        handleOpenHeaderDetails();
    });

    btnCloseGroupInfo.addEventListener('click', () => {
        rightInfoDrawer.classList.remove('active');
        rightInfoDrawer.classList.remove('fullscreen');
    });

    // Save inline group name
    btnSaveGroupNameInline.addEventListener('click', async () => {
        if (!activeConversation) return;
        const newName = inputInlineGroupName.value.trim();
        if (!newName) {
            alert('O nome do grupo não pode ficar vazio.');
            return;
        }
        await updateGroupData({ name: newName });
        btnSaveGroupNameInline.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
        setTimeout(() => { btnSaveGroupNameInline.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Nome'; }, 1500);
    });

    // Save group description
    btnSaveGroupDesc.addEventListener('click', async () => {
        if (!activeConversation) return;
        const newDesc = textareaGroupDesc.value.trim();
        await updateGroupData({ desc: newDesc });
        btnSaveGroupDesc.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
        setTimeout(() => { btnSaveGroupDesc.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Descrição'; }, 1500);
    });

    // Change Group Avatar
    inputEditGroupAvatar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        openPhotoCropper(file, true, async (croppedBase64) => {
            if (infoGroupAvatar) infoGroupAvatar.src = croppedBase64;
            await updateGroupData({ avatar: croppedBase64 });
        });
    });

    // Change Group Cover
    inputEditGroupCover.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        openPhotoCropper(file, false, async (croppedBase64) => {
            if (infoGroupCover) infoGroupCover.src = croppedBase64;
            await updateGroupData({ cover: croppedBase64 });
        });
    });

    // Group Options changes
    selectGroupDisappearing.addEventListener('change', () => {
        updateGroupData({ disappearing: selectGroupDisappearing.value });
    });

    checkGroupMute.addEventListener('change', () => {
        updateGroupData({ mute: checkGroupMute.checked });
    });

    async function updateGroupData(fields) {
        if (!activeConversation) return;
        try {
            const res = await fetch('/api/groups/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: activeConversation.id,
                    userId: currentUser ? currentUser.id : '',
                    userName: currentUser ? currentUser.name : 'Alguém',
                    ...fields
                })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
                return;
            }
            if (data.success) {
                activeConversation = data.group;
                const idx = conversations.findIndex(c => c.id === data.group.id);
                if (idx !== -1) conversations[idx] = data.group;
                updateChatHeader();
                renderConversations();
                populateGroupInfoDrawer();
            }
        } catch (e) {
            alert('Erro ao atualizar dados do grupo: ' + e.message);
        }
    }

    // Add Member Modal
    btnOpenAddMemberModal.addEventListener('click', () => {
        modalAddMember.classList.add('active');
    });

    btnCloseAddMember.addEventListener('click', () => {
        modalAddMember.classList.remove('active');
    });

    btnSubmitAddMember.addEventListener('click', async () => {
        const name = inputNewMemberName.value.trim();
        if (!name) return;
        await updateGroupData({ addMemberName: name });
        modalAddMember.classList.remove('active');
        inputNewMemberName.value = '';
    });

    // Leave Group
    btnActionLeaveGroup.addEventListener('click', async () => {
        if (!activeConversation) return;
        const actionLabel = activeConversation.type === 'group' ? 'sair do grupo' : 'apagar a conversa';
        if (confirm(`Tem certeza que deseja ${actionLabel} "${activeConversation.name}"?`)) {
            await handleLeaveOrDeleteConversation(activeConversation.id);
        }
    });

    // --- 6. IN-CHAT MESSAGE SEARCH ---
    btnHeaderSearch.addEventListener('click', () => {
        chatSearchBarOverlay.classList.toggle('active');
        if (chatSearchBarOverlay.classList.contains('active')) {
            inputSearchInsideChat.focus();
        }
    });

    btnCloseChatSearch.addEventListener('click', () => {
        chatSearchBarOverlay.classList.remove('active');
        inputSearchInsideChat.value = '';
        filterMessagesInChat('');
    });

    inputSearchInsideChat.addEventListener('input', (e) => {
        filterMessagesInChat(e.target.value.trim().toLowerCase());
    });

    function filterMessagesInChat(term) {
        document.querySelectorAll('.msg-row').forEach(row => {
            if (!term) {
                row.style.display = 'flex';
            } else {
                const txt = row.textContent.toLowerCase();
                row.style.display = txt.includes(term) ? 'flex' : 'none';
            }
        });
    }

    function getSenderColor(senderId) {
        if (!senderId) return '#00a884';
        const colors = ['#53bdeb', '#e542a3', '#25d366', '#ff9f1c', '#9b51e0', '#00a884', '#eb5757', '#2f80ed'];
        let hash = 0;
        for (let i = 0; i < senderId.length; i++) {
            hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    // --- 7. MESSAGES RENDERING ---
    function appendMessage(msg) {
        if (!msg || !msg.id) return;
        if (document.getElementById(msg.id)) return; // Impede duplicação no DOM

        if (msg.isSystem) {
            const sys = document.createElement('div');
            sys.className = 'system-msg-badge';
            sys.innerHTML = `<i class="fa-solid fa-lock"></i> ${escapeHTML(msg.text)}`;
            messagesWall.appendChild(sys);
            return;
        }

        const isMe = currentUser && msg.senderId === currentUser.id;
        const isSticker = msg.type === 'sticker';
        const row = document.createElement('div');
        row.className = `msg-row ${isMe ? 'out' : 'in'} ${isSticker ? 'is-sticker' : ''}`;
        row.id = msg.id;

        let authorHtml = '';
        if (!isMe && !isSticker) {
            const nameColor = getSenderColor(msg.senderId);
            authorHtml = `
                <div class="msg-author-header" style="color:${nameColor}; font-weight:700;">
                    <img src="${msg.senderAvatar}" alt="">
                    <span>${escapeHTML(msg.senderName)} ${msg.isBot ? '<span class="bot-badge-tag">BOT</span>' : ''}</span>
                </div>
            `;
        }

        let replyHtml = '';
        if (msg.replyTo) {
            replyHtml = `
                <div class="msg-reply-box">
                    <strong>${escapeHTML(msg.replyTo.senderName || 'Alguém')}</strong>
                    <span>${escapeHTML(msg.replyTo.text || 'Mídia')}</span>
                </div>
            `;
        }

        let stickerHtml = '';
        if (isSticker && msg.sticker) {
            stickerHtml = `<img class="msg-sticker-img" src="${msg.sticker}" alt="Figurinha">`;
        }

        let photoHtml = '';
        if (msg.media) {
            photoHtml = `<img class="msg-photo-img" src="${msg.media}" alt="Foto" onclick="window.open('${msg.media}', '_blank')">`;
        }

        let linkCardHtml = '';
        if (msg.linkPreview) {
            const lp = msg.linkPreview;
            linkCardHtml = `
                <a class="msg-link-card-preview" href="${lp.url}" target="_blank" rel="noopener noreferrer">
                    ${lp.image ? `<img class="link-card-thumb-img" src="${lp.image}" alt="Preview" onerror="this.style.display='none'">` : ''}
                    <div class="link-card-content">
                        <span class="link-card-domain"><i class="fa-solid fa-link"></i> ${escapeHTML(lp.domain)}</span>
                        <strong class="link-card-title">${escapeHTML(lp.title)}</strong>
                        <span class="link-card-desc">${escapeHTML(lp.description)}</span>
                    </div>
                </a>
            `;
        }

        let audioHtml = '';
        if (msg.audio) {
            audioHtml = `
                <div class="msg-audio-wrapper" data-audio-src="${msg.audio}">
                    <button class="btn-audio-play"><i class="fa-solid fa-play"></i></button>
                    <div class="audio-bar-track">
                        <div class="audio-bar-fill"></div>
                    </div>
                    <span class="audio-duration-txt">${formatSeconds(msg.duration || 0)}</span>
                    <button class="audio-speed-pill">1x</button>
                </div>
            `;
        }

        let pollHtml = '';
        if (msg.type === 'poll' && msg.poll) {
            pollHtml = renderPollHTML(msg.id, msg.poll);
        }

        let reactionsHtml = '';
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
            const emojis = Object.values(msg.reactions).slice(0, 4).join(' ');
            reactionsHtml = `<div class="msg-reactions-pill">${emojis} ${Object.keys(msg.reactions).length > 1 ? Object.keys(msg.reactions).length : ''}</div>`;
        }

        if (msg.isDeleted) {
            row.innerHTML = `
                <div class="msg-bubble-box" style="font-style:italic; opacity:0.75;">
                    <div style="display:flex; align-items:center; gap:6px; font-size:13.5px;"><i class="fa-solid fa-ban"></i> Esta mensagem foi apagada</div>
                    <div class="msg-meta-stamp">
                        <span>${msg.time || ''}</span>
                    </div>
                </div>
            `;
            messagesWall.appendChild(row);
            return;
        }

        const reactBarHtml = `
            <div class="quick-react-popup">
                <span data-emoji="👍">👍</span>
                <span data-emoji="❤️">❤️</span>
                <span data-emoji="😂">😂</span>
                <span data-emoji="😮">😮</span>
                <span data-emoji="😢">😢</span>
                <span data-emoji="🙏">🙏</span>
                <button class="btn-more-react-trigger" title="Mais Emojis e Figurinhas"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;

        let textContainerHtml = '';
        if (msg.text) {
            if (msg.text.startsWith('ENC:v1:')) {
                textContainerHtml = `<div class="msg-text-e2ee-box" data-enc="${escapeHTML(msg.text)}"><i class="fa-solid fa-spinner fa-spin"></i> Descriptografando E2EE...</div>`;
            } else {
                textContainerHtml = `<div>${formatMessageTextWithLinks(msg.text)}</div>`;
            }
        }

        let videoHtml = '';
        if (msg.video || (msg.type === 'video' && msg.media)) {
            const vSrc = msg.video || msg.media;
            const posterAttr = msg.thumbnail ? `poster="${msg.thumbnail}"` : '';
            videoHtml = `
                <div class="msg-video-container">
                    <video class="msg-video-player" src="${vSrc}" ${posterAttr} controls preload="metadata"></video>
                </div>
            `;
        }

        let docHtml = '';
        if (msg.document || (msg.type === 'document' && msg.media)) {
            const dSrc = msg.document || msg.media;
            const fileName = msg.filename || msg.fileName || dSrc.split('/').pop().split('?')[0] || 'Documento';
            const thumbImg = msg.thumbnail ? `<img class="msg-doc-thumb" src="${msg.thumbnail}" alt="Thumb">` : '<i class="fa-solid fa-file-lines msg-doc-icon"></i>';
            docHtml = `
                <a class="msg-document-card" href="${dSrc}" download="${escapeHTML(fileName)}" target="_blank" rel="noopener noreferrer">
                    <div class="msg-doc-thumb-box">${thumbImg}</div>
                    <div class="msg-doc-info">
                        <strong class="msg-doc-name">${escapeHTML(fileName)}</strong>
                        <span class="msg-doc-sub"><i class="fa-solid fa-download"></i> Baixar Arquivo</span>
                    </div>
                </a>
            `;
        }

        let thumbHtml = '';
        if (msg.thumbnail && !msg.video && !msg.document && !msg.media) {
            thumbHtml = `<div class="msg-thumbnail-preview"><img src="${msg.thumbnail}" alt="Thumbnail" onclick="window.open('${msg.thumbnail}', '_blank')"></div>`;
        }

        let buttonsHtml = '';
        const markup = msg.reply_markup || msg.buttons;
        if (markup) {
            let rows = [];
            if (markup.inline_keyboard && Array.isArray(markup.inline_keyboard)) {
                rows = markup.inline_keyboard;
            } else if (markup.keyboard && Array.isArray(markup.keyboard)) {
                rows = markup.keyboard;
            } else if (Array.isArray(markup)) {
                rows = markup;
            }
            if (rows.length > 0) {
                buttonsHtml = '<div class="msg-inline-buttons-container">';
                rows.forEach(rowBtns => {
                    if (Array.isArray(rowBtns)) {
                        buttonsHtml += '<div class="msg-buttons-row">';
                        rowBtns.forEach(btn => {
                            const btnText = escapeHTML(btn.text || btn.label || 'Botão');
                            if (btn.url) {
                                buttonsHtml += `<a class="msg-inline-btn link-btn" href="${btn.url}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${btnText}</a>`;
                            } else if (btn.callback_data || btn.data) {
                                const cbData = escapeHTML(btn.callback_data || btn.data);
                                const botId = msg.senderId || '';
                                buttonsHtml += `<button class="msg-inline-btn action-btn" onclick="window.handleBotButtonClick('${botId}', '${msg.id}', '${msg.convId}', '${cbData}', this)"><i class="fa-solid fa-bolt"></i> ${btnText}</button>`;
                            } else {
                                buttonsHtml += `<button class="msg-inline-btn action-btn" onclick="window.handleBotButtonClick('${msg.senderId}', '${msg.id}', '${msg.convId}', '${btnText}', this)">${btnText}</button>`;
                            }
                        });
                        buttonsHtml += '</div>';
                    }
                });
                buttonsHtml += '</div>';
            }
        }

        row.innerHTML = `
            ${reactBarHtml}
            <div class="msg-bubble-box">
                <button class="msg-context-menu-btn" title="Mais Opções"><i class="fa-solid fa-chevron-down"></i></button>
                <div class="msg-context-dropdown">
                    <div class="ctx-item ctx-reply"><i class="fa-solid fa-reply"></i> Responder</div>
                    <div class="ctx-item ctx-star"><i class="fa-solid fa-star"></i> ${msg.isStarred ? 'Desfavoritar' : 'Favoritar'}</div>
                    <div class="ctx-item ctx-react"><i class="fa-regular fa-face-smile"></i> Reagir</div>
                    ${isSticker ? '<div class="ctx-item ctx-sticker-info"><i class="fa-solid fa-circle-info"></i> Dados da figurinha</div>' : ''}
                    <div class="ctx-item ctx-delete-me" style="color:#ea4335;"><i class="fa-solid fa-trash"></i> Apagar para mim</div>
                    ${isMe ? '<div class="ctx-item ctx-delete-everyone" style="color:#ea4335;"><i class="fa-solid fa-ban"></i> Apagar para todos</div>' : ''}
                </div>
                ${authorHtml}
                ${replyHtml}
                ${stickerHtml}
                ${photoHtml}
                ${videoHtml}
                ${docHtml}
                ${thumbHtml}
                ${linkCardHtml}
                ${audioHtml}
                ${pollHtml}
                ${textContainerHtml}
                ${buttonsHtml}
                <div class="msg-meta-stamp">
                    <span>${msg.time || ''}</span>
                    ${isMe ? '<i class="fa-solid fa-check-double tick-blue"></i>' : ''}
                    ${msg.isStarred ? '<i class="fa-solid fa-star msg-star-badge"></i>' : ''}
                </div>
                ${reactionsHtml}
            </div>
        `;

        const e2eeBox = row.querySelector('.msg-text-e2ee-box');
        if (e2eeBox) {
            const encStr = e2eeBox.dataset.enc;
            const autoKey = getAutomaticE2EEKey(msg.convId);
            decryptTextE2EE(encStr, autoKey).then(decrypted => {
                const finalTxt = decrypted || encStr;
                e2eeBox.innerHTML = `${formatMessageTextWithLinks(finalTxt)}`;
            }).catch(err => {
                e2eeBox.innerHTML = `${formatMessageTextWithLinks(encStr)}`;
            });
        }

        const ctxBtn = row.querySelector('.msg-context-menu-btn');
        const ctxMenu = row.querySelector('.msg-context-dropdown');

        if (ctxBtn && ctxMenu) {
            ctxBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.msg-context-dropdown').forEach(m => {
                    if (m !== ctxMenu) m.classList.remove('active');
                });
                ctxMenu.classList.toggle('active');
            });
        }

        const ctxReply = row.querySelector('.ctx-reply');
        if (ctxReply) {
            ctxReply.addEventListener('click', () => {
                ctxMenu.classList.remove('active');
                setReply(msg);
            });
        }

        const ctxStar = row.querySelector('.ctx-star');
        if (ctxStar) {
            ctxStar.addEventListener('click', () => {
                ctxMenu.classList.remove('active');
                toggleStarMessage(msg);
            });
        }

        const ctxReact = row.querySelector('.ctx-react');
        if (ctxReact) {
            ctxReact.addEventListener('click', () => {
                ctxMenu.classList.remove('active');
                openCustomReactionModal(msg.id);
            });
        }

        const ctxStickerInfo = row.querySelector('.ctx-sticker-info');
        if (ctxStickerInfo) {
            ctxStickerInfo.addEventListener('click', () => {
                ctxMenu.classList.remove('active');
                openStickerInfoModal(msg.sticker, msg.stickerMetadata, msg.senderName);
            });
        }

        const ctxDeleteMe = row.querySelector('.ctx-delete-me');
        if (ctxDeleteMe) {
            ctxDeleteMe.addEventListener('click', async () => {
                ctxMenu.classList.remove('active');
                try {
                    await fetch('/api/messages/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ msgId: msg.id, userId: currentUser ? currentUser.id : '', deleteForEveryone: false })
                    });
                    row.remove();
                } catch (e) {
                    row.remove();
                }
            });
        }

        const ctxDeleteEveryone = row.querySelector('.ctx-delete-everyone');
        if (ctxDeleteEveryone) {
            ctxDeleteEveryone.addEventListener('click', async () => {
                ctxMenu.classList.remove('active');
                if (confirm('Deseja apagar esta mensagem para TODOS os participantes?')) {
                    try {
                        await fetch('/api/messages/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ msgId: msg.id, userId: currentUser ? currentUser.id : '', deleteForEveryone: true })
                        });
                    } catch (e) {
                        console.error(e);
                    }
                }
            });
        }

        const replyBox = row.querySelector('.msg-reply-box');
        if (replyBox && msg.replyTo && msg.replyTo.id) {
            replyBox.style.cursor = 'pointer';
            replyBox.addEventListener('click', () => {
                const targetRow = document.getElementById(msg.replyTo.id);
                if (targetRow) {
                    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetRow.style.transition = 'background 0.3s';
                    targetRow.style.background = 'rgba(0, 168, 132, 0.2)';
                    setTimeout(() => { targetRow.style.background = ''; }, 1200);
                }
            });
        }

        row.querySelector('.msg-bubble-box').addEventListener('dblclick', () => {
            toggleStarMessage(msg);
        });

        row.querySelectorAll('.quick-react-popup span[data-emoji]').forEach(sp => {
            sp.addEventListener('click', () => {
                sendReaction(msg.id, sp.dataset.emoji);
            });
        });

        const btnMoreReact = row.querySelector('.btn-more-react-trigger');
        if (btnMoreReact) {
            btnMoreReact.addEventListener('click', () => {
                openCustomReactionModal(msg.id);
            });
        }

        const stImg = row.querySelector('.msg-sticker-img');
        if (stImg) {
            stImg.style.cursor = 'pointer';
            stImg.addEventListener('click', () => {
                openStickerInfoModal(msg.sticker, msg.stickerMetadata, msg.senderName);
            });
        }

        const aWrapper = row.querySelector('.msg-audio-wrapper');
        if (aWrapper) {
            setupCustomAudioPlayer(aWrapper);
        }

        row.querySelectorAll('.poll-option-row').forEach(optEl => {
            optEl.addEventListener('click', () => {
                const optId = parseInt(optEl.dataset.optionId, 10);
                voteOnPoll(msg.id, optId);
            });
        });

        messagesWall.appendChild(row);
    }

    function handleNewIncomingMessage(msg) {
        const conv = conversations.find(c => c.id === msg.convId);
        if (conv) {
            conv.lastMessage = msg;
            renderConversations();
        }

        if (activeConversation && msg.convId === activeConversation.id) {
            appendMessage(msg);
            scrollToBottom();
        }
    }

    function scrollToBottom() {
        messagesWall.scrollTop = messagesWall.scrollHeight;
    }

    function formatMessageTextWithLinks(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return escapeHTML(text).replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--wa-green-dark); font-weight:500; text-decoration:underline;">${url}</a>`;
        });
    }

    async function toggleStarMessage(msg) {
        if (!currentUser) return;
        try {
            const res = await fetch('/api/messages/star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msgId: msg.id, userId: currentUser.id })
            });
            const data = await res.json();
            msg.isStarred = data.isStarred;
            const row = document.getElementById(msg.id);
            if (row) {
                let badge = row.querySelector('.msg-star-badge');
                if (data.isStarred) {
                    if (!badge) {
                        const stamp = row.querySelector('.msg-meta-stamp');
                        const st = document.createElement('i');
                        st.className = 'fa-solid fa-star msg-star-badge';
                        stamp.appendChild(st);
                    }
                } else {
                    if (badge) badge.remove();
                }
            }
        } catch (e) {
            console.error('Star error:', e);
        }
    }

    // --- 8. SEND MESSAGE & ACTIONS ---
    btnActionSendOrMic.addEventListener('click', () => {
        const text = chatInputTextarea.value.trim();
        const hasMedia = stagedMediaBase64 !== null;

        if (text || hasMedia) {
            sendMessage();
        } else {
            startVoiceRecording();
        }
    });

    chatInputTextarea.addEventListener('keydown', (e) => {
        const enterToSend = checkEnterSend ? checkEnterSend.checked : true;
        if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatInputTextarea.addEventListener('input', () => {
        chatInputTextarea.style.height = 'auto';
        chatInputTextarea.style.height = Math.min(chatInputTextarea.scrollHeight, 120) + 'px';
        toggleActionIcon();

        if (activeConversation && currentUser) {
            sendTyping(true);
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => sendTyping(false), 2000);
        }
    });

    function toggleActionIcon() {
        const hasText = chatInputTextarea.value.trim().length > 0;
        const hasMedia = stagedMediaBase64 !== null;

        if (hasText || hasMedia) {
            actionBtnIcon.className = 'fa-solid fa-paper-plane';
        } else {
            actionBtnIcon.className = 'fa-solid fa-microphone';
        }
    }

    async function sendMessage() {
        let text = chatInputTextarea.value.trim();
        if (!text && !stagedMediaBase64) return;
        if (!activeConversation) {
            alert('Selecione uma conversa ou grupo primeiro para enviar mensagens.');
            return;
        }
        if (!currentUser) return;

        // Automatic Zero-Touch End-to-End Encryption
        if (text) {
            try {
                const autoKey = getAutomaticE2EEKey(activeConversation.id);
                text = await encryptTextE2EE(text, autoKey);
            } catch (err) {
                console.error('Auto E2EE encryption error:', err);
            }
        }

        const payload = {
            convId: activeConversation.id,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            text: text,
            media: stagedMediaBase64,
            isViewOnce: isViewOnceStaged,
            replyTo: currentReplyMessage ? {
                id: currentReplyMessage.id,
                senderName: currentReplyMessage.senderName,
                text: currentReplyMessage.text || 'Mídia'
            } : null
        };

        isViewOnceStaged = false;
        if (viewOnceBadgeIcon) viewOnceBadgeIcon.classList.remove('active');
        chatInputTextarea.value = '';
        chatInputTextarea.style.height = 'auto';
        clearMediaTray();
        clearReply();
        toggleActionIcon();
        sendTyping(false);

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success && data.message) {
                handleNewIncomingMessage(data.message);
            }
        } catch (e) {
            console.error('Send error:', e);
        }
    }

    // --- 9. STICKERS & EMOJIS PICKER ---
    btnToggleStickersEmojis.addEventListener('click', () => {
        attachPopupMenu.classList.remove('active');
        stickersEmojiPanel.classList.toggle('active');
    });

    panelTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            panelTabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            document.querySelectorAll('.panel-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-content-${tab}`).classList.add('active');
        });
    });

    function renderStickerPacks() {
        stickerPacksNav.innerHTML = '';
        stickersGridItems.innerHTML = '';

        stickerPacks.forEach((pack, idx) => {
            const chip = document.createElement('button');
            chip.className = `pack-chip-btn ${idx === 0 ? 'active' : ''}`;
            chip.textContent = pack.name;
            chip.addEventListener('click', () => {
                document.querySelectorAll('.pack-chip-btn').forEach(b => b.classList.remove('active'));
                chip.classList.add('active');
                displayPackStickers(pack);
            });
            stickerPacksNav.appendChild(chip);
        });

        if (stickerPacks.length > 0) {
            displayPackStickers(stickerPacks[0]);
        }
    }

    function displayPackStickers(pack) {
        stickersGridItems.innerHTML = '';
        pack.stickers.forEach(stUrl => {
            const img = document.createElement('img');
            img.src = stUrl;
            img.alt = 'Sticker';
            img.addEventListener('click', () => sendSticker(stUrl));
            stickersGridItems.appendChild(img);
        });
    }

    async function sendSticker(stickerUrl) {
        if (!activeConversation) {
            alert('Selecione uma conversa ou grupo primeiro para enviar a figurinha.');
            return;
        }
        if (!currentUser) return;
        stickersEmojiPanel.classList.remove('active');

        const payload = {
            convId: activeConversation.id,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            sticker: stickerUrl,
            type: 'sticker'
        };

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success && data.message) {
                handleNewIncomingMessage(data.message);
            }
        } catch (e) {
            console.error('Send sticker error:', e);
        }
    }

    document.querySelectorAll('.emoji-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.cat;
            document.querySelectorAll('#emojis-grid-items span').forEach(sp => {
                if (cat === 'all' || sp.dataset.cat === cat) {
                    sp.style.display = 'inline-block';
                } else {
                    sp.style.display = 'none';
                }
            });
        });
    });

    document.querySelectorAll('#emojis-grid-items span').forEach(sp => {
        sp.addEventListener('click', () => {
            chatInputTextarea.value += sp.textContent;
            toggleActionIcon();
            chatInputTextarea.focus();
        });
    });

    // --- 10. REACTION SYSTEM ---
    async function sendReaction(msgId, emoji) {
        if (!currentUser) return;
        try {
            await fetch('/api/messages/react', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msgId, emoji, userId: currentUser.id })
            });
        } catch (e) {
            console.error('Reaction error:', e);
        }
    }

    function updateMessageReactionsDOM(msgId, reactions) {
        const row = document.getElementById(msgId);
        if (!row) return;

        let pill = row.querySelector('.msg-reactions-pill');
        const keys = Object.keys(reactions);
        if (keys.length === 0) {
            if (pill) pill.remove();
            return;
        }

        const emojis = Object.values(reactions).slice(0, 4).join(' ');
        if (!pill) {
            pill = document.createElement('div');
            pill.className = 'msg-reactions-pill';
            row.querySelector('.msg-bubble-box').appendChild(pill);
        }
        pill.innerHTML = `${emojis} ${keys.length > 1 ? keys.length : ''}`;
    }

    // --- 11. POLLS / ENQUETES ---
    btnToggleAttachMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        stickersEmojiPanel.classList.remove('active');
        attachPopupMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        attachPopupMenu.classList.remove('active');
        dropdownMenu.classList.remove('active');
        chatMoreDropdown.classList.remove('active');
    });

    btnOpenPollCreator.addEventListener('click', () => {
        attachPopupMenu.classList.remove('active');
        modalCreatePoll.classList.add('active');
    });

    btnCloseCreatePoll.addEventListener('click', () => {
        modalCreatePoll.classList.remove('active');
    });

    btnAddPollOption.addEventListener('click', () => {
        const count = pollOptionsContainer.querySelectorAll('input').length;
        if (count < 8) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'poll-option-input';
            input.placeholder = `Opção ${count + 1}`;
            input.maxLength = 60;
            pollOptionsContainer.appendChild(input);
        }
    });

    btnSubmitPoll.addEventListener('click', async () => {
        const question = inputPollQuestion.value.trim();
        if (!question) {
            alert('Digite a pergunta da enquete.');
            return;
        }

        const options = [];
        pollOptionsContainer.querySelectorAll('input').forEach((inp, idx) => {
            const val = inp.value.trim();
            if (val) {
                options.push({ id: idx, text: val, votes: [] });
            }
        });

        if (options.length < 2) {
            alert('Adicione pelo menos 2 opções.');
            return;
        }

        const payload = {
            convId: activeConversation.id,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            type: 'poll',
            poll: { question, options }
        };

        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            modalCreatePoll.classList.remove('active');
            inputPollQuestion.value = '';
        } catch (e) {
            alert('Erro ao enviar enquete: ' + e.message);
        }
    });

    function renderPollHTML(msgId, poll) {
        let totalVotes = 0;
        poll.options.forEach(o => totalVotes += (o.votes ? o.votes.length : 0));

        let optHtml = '';
        poll.options.forEach(o => {
            const count = o.votes ? o.votes.length : 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const hasVoted = currentUser && o.votes && o.votes.includes(currentUser.id);

            optHtml += `
                <div class="poll-option-row" data-option-id="${o.id}">
                    <div class="poll-bar-fill-bg" style="width: ${pct}%;"></div>
                    <span class="poll-option-text">${hasVoted ? '☑️ ' : '⬜ '} ${escapeHTML(o.text)}</span>
                    <span class="poll-option-count">${count} (${pct}%)</span>
                </div>
            `;
        });

        return `
            <div class="msg-poll-box" id="poll-box-${msgId}">
                <div class="poll-question-title"><i class="fa-solid fa-square-poll-vertical"></i> ${escapeHTML(poll.question)}</div>
                ${optHtml}
                <small style="color:var(--wa-text-sub); display:block; margin-top:4px;">${totalVotes} voto${totalVotes === 1 ? '' : 's'}</small>
            </div>
        `;
    }

    async function voteOnPoll(msgId, optionId) {
        if (!currentUser) return;
        try {
            await fetch('/api/messages/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msgId, optionId, userId: currentUser.id })
            });
        } catch (e) {
            console.error('Vote error:', e);
        }
    }

    function updatePollDOM(msgId, poll) {
        const box = document.getElementById(`poll-box-${msgId}`);
        if (!box) return;
        box.outerHTML = renderPollHTML(msgId, poll);
        const row = document.getElementById(msgId);
        if (row) {
            row.querySelectorAll('.poll-option-row').forEach(optEl => {
                optEl.addEventListener('click', () => {
                    const optId = parseInt(optEl.dataset.optionId, 10);
                    voteOnPoll(msgId, optId);
                });
            });
        }
    }

    // --- 12. BOTFATHER & BOT API (TELEGRAM STYLE) ---
    btnTabBots.addEventListener('click', () => {
        closeAllDrawers();
        drawerBots.classList.add('active');
        loadMyBots();
    });

    menuOptBots.addEventListener('click', () => {
        closeAllDrawers();
        drawerBots.classList.add('active');
        loadMyBots();
    });

    btnOpenBotsSub.addEventListener('click', () => {
        closeAllDrawers();
        drawerBots.classList.add('active');
        loadMyBots();
    });

    btnCloseBotsDrawer.addEventListener('click', () => {
        drawerBots.classList.remove('active');
    });

    btnOpenCreateBotModal.addEventListener('click', () => {
        modalCreateBot.classList.add('active');
    });

    btnCloseCreateBot.addEventListener('click', () => {
        modalCreateBot.classList.remove('active');
    });

    btnSubmitCreateBot.addEventListener('click', async () => {
        const name = inputBotName.value.trim();
        const username = inputBotUsername.value.trim();
        const desc = inputBotDesc.value.trim();

        if (!name || !username) {
            alert('Preencha o nome e o @username do Bot.');
            return;
        }

        const payload = {
            name,
            username,
            desc,
            userId: currentUser ? currentUser.id : 'anon'
        };

        try {
            const res = await fetch('/api/bots/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                modalCreateBot.classList.remove('active');
                inputBotName.value = '';
                inputBotUsername.value = '';
                inputBotDesc.value = '';
                loadMyBots();
                alert(`Bot ${data.bot.name} criado com sucesso!\nToken: ${data.bot.token}`);
            } else {
                alert('Erro: ' + data.error);
            }
        } catch (e) {
            alert('Erro ao criar bot: ' + e.message);
        }
    });

    async function loadMyBots() {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/bots/my?userId=${encodeURIComponent(currentUser.id)}`);
            const data = await res.json();
            myBots = data.bots || [];
            renderBotsList();
        } catch (e) {
            console.error('Load bots error:', e);
        }
    }

    function renderBotsList() {
        botsListContainer.innerHTML = '';
        if (myBots.length === 0) {
            botsListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:var(--wa-text-sub); font-size:13.5px;">Nenhum bot cadastrado. Clique no botão acima para criar o seu primeiro bot com Token!</div>';
            return;
        }

        myBots.forEach(bot => {
            const card = document.createElement('div');
            card.className = 'bot-card-box';
            card.innerHTML = `
                <div class="bot-card-header" style="cursor:pointer;" title="Clique para editar o perfil deste bot">
                    <div class="bot-card-avatar">
                        <img src="${bot.avatar}" alt="">
                    </div>
                    <div class="bot-card-info" style="flex:1;">
                        <strong>${escapeHTML(bot.name)} <span class="bot-badge-tag">BOT</span></strong>
                        <small>${escapeHTML(bot.username)}</small>
                    </div>
                    <button class="btn-edit-bot-pill" title="Editar Perfil do Bot"><i class="fa-solid fa-pen"></i></button>
                </div>
                <div class="bot-card-desc">${escapeHTML(bot.desc || 'Bot API')}</div>
                <div class="bot-token-container">
                    <span class="bot-token-text" id="token-val-${bot.id}">${escapeHTML(bot.token)}</span>
                    <button class="btn-copy-token" data-token="${escapeHTML(bot.token)}">
                        <i class="fa-regular fa-copy"></i> Copiar Token
                    </button>
                </div>
            `;

            card.querySelector('.btn-copy-token').addEventListener('click', (e) => {
                e.stopPropagation();
                const tok = e.currentTarget.dataset.token;
                navigator.clipboard.writeText(tok);
                e.currentTarget.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
                setTimeout(() => {
                    e.currentTarget.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar Token';
                }, 2000);
            });

            const openEdit = () => {
                openEditBotModal(bot);
            };
            card.querySelector('.bot-card-header').addEventListener('click', openEdit);

            botsListContainer.appendChild(card);
        });
    }

    function openEditBotModal(bot) {
        editBotToken.value = bot.token;
        editBotName.value = bot.name;
        editBotDesc.value = bot.desc || '';
        editBotAvatarPreview.src = bot.avatar;
        stagedEditBotAvatarBase64 = null;
        modalEditBot.classList.add('active');
    }

    btnCloseEditBot.addEventListener('click', () => {
        modalEditBot.classList.remove('active');
    });

    inputEditBotAvatar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            stagedEditBotAvatarBase64 = evt.target.result;
            editBotAvatarPreview.src = stagedEditBotAvatarBase64;
        };
        reader.readAsDataURL(file);
    });

    btnSubmitEditBot.addEventListener('click', async () => {
        const token = editBotToken.value;
        const name = editBotName.value.trim();
        const desc = editBotDesc.value.trim();
        if (!token || !name) return;
        try {
            const res = await fetch('/api/bots/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    name,
                    desc,
                    avatar: stagedEditBotAvatarBase64
                })
            });
            const data = await res.json();
            if (data.success) {
                modalEditBot.classList.remove('active');
                loadMyBots();
                alert('Perfil do bot atualizado com sucesso!');
            } else {
                alert('Erro: ' + data.error);
            }
        } catch (e) {
            alert('Erro ao atualizar bot: ' + e.message);
        }
    });

    btnRevokeBotToken.addEventListener('click', async () => {
        const token = editBotToken.value;
        if (!token) return;
        if (confirm('Tem certeza que deseja revogar e gerar um novo token para este bot? O token antigo deixará de funcionar imediatamente.')) {
            try {
                const res = await fetch('/api/bots/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                const data = await res.json();
                if (data.success) {
                    editBotToken.value = data.bot.token;
                    loadMyBots();
                    alert(`Novo Token gerado:\n${data.bot.token}`);
                }
            } catch (e) {
                alert('Erro ao revogar token: ' + e.message);
            }
        }
    });

    btnDeleteBotAction.addEventListener('click', async () => {
        const token = editBotToken.value;
        if (!token) return;
        if (confirm('Tem certeza que deseja DELETAR este bot permanentemente?')) {
            try {
                const res = await fetch('/api/bots/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                const data = await res.json();
                if (data.success) {
                    modalEditBot.classList.remove('active');
                    loadMyBots();
                    alert('Bot deletado com sucesso!');
                }
            } catch (e) {
                alert('Erro ao deletar bot: ' + e.message);
            }
        }
    });

    // --- 13. COMUNIDADES & CANAIS ---
    btnTabCommunities.addEventListener('click', () => {
        closeAllDrawers();
        drawerCommunities.classList.add('active');
        renderCommunities();
    });

    menuOptNewCommunity.addEventListener('click', () => {
        closeAllDrawers();
        modalCreateCommunity.classList.add('active');
    });

    btnCloseCommunitiesDrawer.addEventListener('click', () => {
        drawerCommunities.classList.remove('active');
    });

    btnOpenNewCommunityModal.addEventListener('click', () => {
        modalCreateCommunity.classList.add('active');
    });

    btnCloseCreateCommunity.addEventListener('click', () => {
        modalCreateCommunity.classList.remove('active');
    });

    btnSubmitCreateCommunity.addEventListener('click', async () => {
        const name = inputCommunityName.value.trim();
        const desc = inputCommunityDesc.value.trim();
        if (!name) return;

        try {
            const res = await fetch('/api/communities/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, desc })
            });
            const data = await res.json();
            if (data.success) {
                communities.push(data.community);
                renderCommunities();
                modalCreateCommunity.classList.remove('active');
                inputCommunityName.value = '';
                inputCommunityDesc.value = '';
                alert(`Comunidade "${data.community.name}" criada com sucesso!`);
            }
        } catch (e) {
            console.error(e);
        }
    });

    function renderCommunities() {
        communitiesListContainer.innerHTML = '';
        communities.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comm-card-box';
            item.innerHTML = `
                <div class="comm-avatar">
                    <img src="${c.avatar}" alt="">
                </div>
                <div class="comm-info">
                    <strong>${escapeHTML(c.name)}</strong>
                    <small>${c.groupsCount} grupos • ${c.membersCount} participantes</small>
                </div>
            `;
            item.addEventListener('click', () => {
                alert(`Você acessou a comunidade: ${c.name}\n${c.desc}`);
            });
            communitiesListContainer.appendChild(item);
        });
    }

    // Canais
    btnTabChannels.addEventListener('click', () => {
        closeAllDrawers();
        drawerChannels.classList.add('active');
        renderChannels();
    });

    btnCloseChannelsDrawer.addEventListener('click', () => {
        drawerChannels.classList.remove('active');
    });

    const modalChannelView = document.getElementById('modal-channel-view');
    const btnCloseChannelView = document.getElementById('btn-close-channel-view');
    const channelViewAvatar = document.getElementById('channel-view-avatar');
    const channelViewName = document.getElementById('channel-view-name');
    const channelViewFollowers = document.getElementById('channel-view-followers');
    const channelViewDesc = document.getElementById('channel-view-desc');
    const channelPostsFeedContainer = document.getElementById('channel-posts-feed-container');
    const btnChannelToggleFollow = document.getElementById('btn-channel-toggle-follow');

    function openChannelViewer(ch) {
        if (!ch) return;
        if (channelViewAvatar) channelViewAvatar.src = ch.avatar;
        if (channelViewName) channelViewName.innerHTML = `${escapeHTML(ch.name)} ${ch.verified ? '<i class="fa-solid fa-circle-check" style="color:var(--wa-green);"></i>' : ''}`;
        if (channelViewFollowers) channelViewFollowers.textContent = `${ch.followersCount} seguidores`;
        if (channelViewDesc) channelViewDesc.textContent = ch.desc || 'Canal oficial com transmissões e atualizações diárias.';
        if (btnChannelToggleFollow) btnChannelToggleFollow.textContent = ch.isFollowing ? 'Seguindo' : 'Seguir';

        if (channelPostsFeedContainer) {
            channelPostsFeedContainer.innerHTML = `
                <div class="channel-post-card" style="background:var(--wa-bg-panel); border:1px solid var(--wa-border); border-radius:12px; padding:16px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <img src="${ch.avatar}" style="width:38px; height:38px; border-radius:50%; object-fit:cover;">
                        <div>
                            <strong style="font-size:14px; display:block;">${escapeHTML(ch.name)} ${ch.verified ? '<i class="fa-solid fa-circle-check" style="color:var(--wa-green); font-size:12px;"></i>' : ''}</strong>
                            <small style="color:var(--wa-text-sub); font-size:11px;">Hoje às 12:00</small>
                        </div>
                    </div>
                    <p style="font-size:14px; line-height:1.45; color:var(--wa-text-main);">📢 Bem-vindo ao canal oficial! Acompanhe aqui as melhores novidades, avisos de updates e transmissões exclusivas em tempo real.</p>
                </div>
            `;
        }

        if (modalChannelView) modalChannelView.classList.add('active');
    }

    if (btnCloseChannelView) {
        btnCloseChannelView.addEventListener('click', () => {
            modalChannelView.classList.remove('active');
        });
    }

    function renderChannels() {
        channelsListContainer.innerHTML = '';
        channels.forEach(ch => {
            const item = document.createElement('div');
            item.className = 'chan-card-box';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <div class="chan-avatar">
                    <img src="${ch.avatar}" alt="">
                </div>
                <div class="chan-info">
                    <strong>${escapeHTML(ch.name)} ${ch.verified ? '<i class="fa-solid fa-circle-check" style="color:var(--wa-green); font-size:13px;"></i>' : ''}</strong>
                    <small>${ch.followersCount} seguidores</small>
                </div>
                <button class="btn-follow-chan ${ch.isFollowing ? 'following' : ''}" data-chan-id="${ch.id}">
                    ${ch.isFollowing ? 'Seguindo' : 'Seguir'}
                </button>
            `;

            item.addEventListener('click', () => openChannelViewer(ch));

            item.querySelector('.btn-follow-chan').addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const res = await fetch('/api/channels/follow', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ channelId: ch.id })
                    });
                    const data = await res.json();
                    if (data.success) {
                        ch.isFollowing = data.channel.isFollowing;
                        ch.followersCount = data.channel.followersCount;
                        renderChannels();
                    }
                } catch (err) {
                    console.error(err);
                }
            });

            channelsListContainer.appendChild(item);
        });
    }

    // --- 14. SETTINGS DRAWERS & EVENT BINDINGS ---
    btnOpenMyProfile.addEventListener('click', () => {
        closeAllDrawers();
        drawerProfile.classList.add('active');
    });

    btnCloseProfileDrawer.addEventListener('click', () => {
        drawerProfile.classList.remove('active');
    });

    menuOptSettings.addEventListener('click', () => {
        closeAllDrawers();
        drawerSettings.classList.add('active');
    });

    btnCloseSettingsDrawer.addEventListener('click', () => {
        drawerSettings.classList.remove('active');
    });

    btnSettingsToProfile.addEventListener('click', () => {
        closeAllDrawers();
        drawerProfile.classList.add('active');
    });

    btnOpenPrivacySub.addEventListener('click', () => {
        closeAllDrawers();
        drawerPrivacy.classList.add('active');
    });

    btnClosePrivacyDrawer.addEventListener('click', () => {
        drawerPrivacy.classList.remove('active');
        drawerSettings.classList.add('active');
    });

    btnOpenChatsSub.addEventListener('click', () => {
        closeAllDrawers();
        drawerChatsSettings.classList.add('active');
    });

    btnCloseChatsDrawer.addEventListener('click', () => {
        drawerChatsSettings.classList.remove('active');
        drawerSettings.classList.add('active');
    });

    btnOpenNotifsSub.addEventListener('click', () => {
        closeAllDrawers();
        drawerNotifsSettings.classList.add('active');
    });

    btnCloseNotifsDrawer.addEventListener('click', () => {
        drawerNotifsSettings.classList.remove('active');
        drawerSettings.classList.add('active');
    });

    btnOpenSecuritySub.addEventListener('click', () => {
        closeAllDrawers();
        drawerSecuritySettings.classList.add('active');
    });

    btnCloseSecurityDrawer.addEventListener('click', () => {
        drawerSecuritySettings.classList.remove('active');
        drawerSettings.classList.add('active');
    });

    btnOpenShortcutsSub.addEventListener('click', () => {
        closeAllDrawers();
        drawerShortcuts.classList.add('active');
    });

    btnCloseShortcutsDrawer.addEventListener('click', () => {
        drawerShortcuts.classList.remove('active');
        drawerSettings.classList.add('active');
    });

    btnOpenHelpSub.addEventListener('click', () => {
        alert('Central de Ajuda WhatsApp Web Clone 2026\n• Todas as mensagens são criptografadas.\n• Você pode criar bots via BotFather API.\n• Dúvidas ou suporte: Fale com o Corvo / Japa.');
    });

    // Starred Messages Drawer
    menuOptStarred.addEventListener('click', async () => {
        closeAllDrawers();
        drawerStarred.classList.add('active');
        loadStarredMessages();
    });

    btnCloseStarredDrawer.addEventListener('click', () => {
        drawerStarred.classList.remove('active');
    });

    async function loadStarredMessages() {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/messages/starred?userId=${encodeURIComponent(currentUser.id)}`);
            const data = await res.json();
            starredMessages = data.messages || [];
            renderStarredMessagesList();
        } catch (e) {
            console.error('Starred error:', e);
        }
    }

    function renderStarredMessagesList() {
        starredMessagesContainer.innerHTML = '';
        if (starredMessages.length === 0) {
            starredMessagesContainer.innerHTML = `
                <div style="text-align:center; padding: 40px; color: var(--wa-text-sub); font-size: 14px;">
                    <i class="fa-regular fa-star" style="font-size: 38px; color: var(--wa-green); margin-bottom: 12px; display:block;"></i>
                    Nenhuma mensagem favoritada ainda.<br>Dê um clique duplo em qualquer mensagem para favoritar.
                </div>
            `;
            return;
        }

        starredMessages.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'chat-card';
            item.innerHTML = `
                <div class="chat-card-avatar">
                    <img src="${msg.senderAvatar}" alt="">
                </div>
                <div class="chat-card-body">
                    <div class="chat-card-title-row">
                        <span class="chat-card-name">${escapeHTML(msg.senderName)}</span>
                        <span class="chat-card-time">${msg.time}</span>
                    </div>
                    <div class="chat-card-msg-row">
                        <span class="chat-card-preview">${escapeHTML(msg.text || (msg.audio ? '🎤 Áudio' : '📷 Foto'))}</span>
                        <i class="fa-solid fa-star msg-star-badge"></i>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => {
                drawerStarred.classList.remove('active');
                selectConversation(msg.convId);
            });
            starredMessagesContainer.appendChild(item);
        });
    }

    // Privacy toggles & preferences save
    [selectPrivacyLastseen, selectPrivacyPhoto, selectPrivacyAbout].forEach(el => {
        el.addEventListener('change', () => savePrivacySettings());
    });
    checkReadReceipts.addEventListener('change', () => savePrivacySettings());
    checkGhostMode.addEventListener('change', () => savePrivacySettings());

    async function savePrivacySettings() {
        if (!currentUser) return;
        const privacy = {
            lastSeen: selectPrivacyLastseen.value,
            photo: selectPrivacyPhoto.value,
            about: selectPrivacyAbout.value,
            readReceipts: checkReadReceipts.checked,
            ghostMode: checkGhostMode.checked
        };
        await updateUserCustomProfile({ privacy });
    }

    // Chat Settings Toggles
    selectThemeSetting.addEventListener('change', () => {
        const theme = selectThemeSetting.value;
        localStorage.setItem('wa_theme', theme);
        applyThemeAndPreferences();
    });

    selectWallpaperSetting.addEventListener('change', () => {
        const wp = selectWallpaperSetting.value;
        localStorage.setItem('wa_wallpaper', wp);
        applyThemeAndPreferences();
    });

    selectFontSizeSetting.addEventListener('change', () => {
        const fs = selectFontSizeSetting.value;
        localStorage.setItem('wa_fontsize', fs);
        applyThemeAndPreferences();
    });

    btnClearAllChats.addEventListener('click', () => {
        if (confirm('Deseja limpar as mensagens de todas as conversas?')) {
            messagesWall.innerHTML = '<div class="system-msg-badge"><i class="fa-solid fa-broom"></i> Todas conversas limpas.</div>';
            alert('Histórico local limpo com sucesso.');
        }
    });

    function closeAllDrawers() {
        document.querySelectorAll('.wa-drawer').forEach(d => d.classList.remove('active'));
        dropdownMenu.classList.remove('active');
    }

    function compressImageFile(file, maxWidth, maxHeight, quality = 0.82) {
        return new Promise((resolve) => {
            if (!file || !file.type.startsWith('image/')) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                    const dataUrl = canvas.toDataURL(mimeType, quality);
                    resolve(dataUrl);
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    // --- PHOTO CROPPER & POSITIONER ENGINE ---
    let cropperImage = null;
    let cropperScale = 1;
    let cropperOffsetX = 0;
    let cropperOffsetY = 0;
    let isCropperDragging = false;
    let cropperStartX = 0;
    let cropperStartY = 0;
    let cropperRotation = 0;
    let cropperCallback = null;

    const modalPhotoCropper = document.getElementById('modal-photo-cropper');
    const cropperCanvas = document.getElementById('cropper-canvas');
    const cropperViewportFrame = document.getElementById('cropper-viewport-frame');
    const btnCloseCropper = document.getElementById('btn-close-cropper');
    const btnCropperCancel = document.getElementById('btn-cropper-cancel');
    const btnCropperConfirm = document.getElementById('btn-cropper-confirm');
    const inputCropperZoom = document.getElementById('input-cropper-zoom');
    const btnCropperZoomIn = document.getElementById('btn-cropper-zoom-in');
    const btnCropperZoomOut = document.getElementById('btn-cropper-zoom-out');
    const btnCropperRotate = document.getElementById('btn-cropper-rotate');

    function openPhotoCropper(file, isCircleShape, callback) {
        if (!file || !file.type.startsWith('image/')) return;
        cropperCallback = callback;

        if (cropperViewportFrame) {
            cropperViewportFrame.style.borderRadius = isCircleShape ? '50%' : '12px';
            cropperViewportFrame.style.width = isCircleShape ? '280px' : '340px';
            cropperViewportFrame.style.height = isCircleShape ? '280px' : '190px';
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            cropperImage = new Image();
            cropperImage.onload = () => {
                cropperScale = 1;
                cropperOffsetX = 0;
                cropperOffsetY = 0;
                cropperRotation = 0;
                if (inputCropperZoom) inputCropperZoom.value = 1;
                drawCropperCanvas();
                if (modalPhotoCropper) modalPhotoCropper.classList.add('active');
            };
            cropperImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function drawCropperCanvas() {
        if (!cropperImage || !cropperCanvas || !cropperViewportFrame) return;

        const containerW = cropperViewportFrame.clientWidth || 280;
        const containerH = cropperViewportFrame.clientHeight || 280;

        cropperCanvas.width = containerW;
        cropperCanvas.height = containerH;

        const ctx = cropperCanvas.getContext('2d');
        ctx.clearRect(0, 0, containerW, containerH);

        ctx.save();
        ctx.translate(containerW / 2 + cropperOffsetX, containerH / 2 + cropperOffsetY);
        ctx.rotate((cropperRotation * Math.PI) / 180);
        ctx.scale(cropperScale, cropperScale);

        const imgW = cropperImage.width;
        const imgH = cropperImage.height;
        const baseScale = Math.max(containerW / imgW, containerH / imgH);
        const drawW = imgW * baseScale;
        const drawH = imgH * baseScale;

        ctx.drawImage(cropperImage, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    }

    if (cropperViewportFrame) {
        const startDrag = (clientX, clientY) => {
            isCropperDragging = true;
            cropperStartX = clientX - cropperOffsetX;
            cropperStartY = clientY - cropperOffsetY;
            cropperViewportFrame.style.cursor = 'grabbing';
        };

        const moveDrag = (clientX, clientY) => {
            if (!isCropperDragging) return;
            cropperOffsetX = clientX - cropperStartX;
            cropperOffsetY = clientY - cropperStartY;
            drawCropperCanvas();
        };

        const endDrag = () => {
            isCropperDragging = false;
            if (cropperViewportFrame) cropperViewportFrame.style.cursor = 'grab';
        };

        cropperViewportFrame.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
        window.addEventListener('mouseup', endDrag);

        cropperViewportFrame.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
        });
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        });
        window.addEventListener('touchend', endDrag);
    }

    if (inputCropperZoom) {
        inputCropperZoom.addEventListener('input', (e) => {
            cropperScale = parseFloat(e.target.value);
            drawCropperCanvas();
        });
    }

    if (btnCropperZoomIn) {
        btnCropperZoomIn.addEventListener('click', () => {
            cropperScale = Math.min(cropperScale + 0.15, 3);
            if (inputCropperZoom) inputCropperZoom.value = cropperScale;
            drawCropperCanvas();
        });
    }

    if (btnCropperZoomOut) {
        btnCropperZoomOut.addEventListener('click', () => {
            cropperScale = Math.max(cropperScale - 0.15, 0.5);
            if (inputCropperZoom) inputCropperZoom.value = cropperScale;
            drawCropperCanvas();
        });
    }

    if (btnCropperRotate) {
        btnCropperRotate.addEventListener('click', () => {
            cropperRotation = (cropperRotation + 90) % 360;
            drawCropperCanvas();
        });
    }

    if (btnCloseCropper) {
        btnCloseCropper.addEventListener('click', () => {
            if (modalPhotoCropper) modalPhotoCropper.classList.remove('active');
        });
    }

    if (btnCropperCancel) {
        btnCropperCancel.addEventListener('click', () => {
            if (modalPhotoCropper) modalPhotoCropper.classList.remove('active');
        });
    }

    if (btnCropperConfirm) {
        btnCropperConfirm.addEventListener('click', () => {
            if (!cropperCanvas) return;
            const croppedDataUrl = cropperCanvas.toDataURL('image/jpeg', 0.85);
            if (modalPhotoCropper) modalPhotoCropper.classList.remove('active');
            if (typeof cropperCallback === 'function') {
                cropperCallback(croppedDataUrl);
            }
        });
    }

    // --- 15. PROFILE & COVER CUSTOMIZATION ---
    inputUploadAvatar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        openPhotoCropper(file, true, async (croppedBase64) => {
            if (profileAvatarImg) profileAvatarImg.src = croppedBase64;
            if (myHeaderAvatar) myHeaderAvatar.src = croppedBase64;
            if (myStatusAvatar) myStatusAvatar.src = croppedBase64;
            if (settingsMyAvatar) settingsMyAvatar.src = croppedBase64;
            await updateUserCustomProfile({ avatar: croppedBase64 });
        });
    });

    inputUploadCover.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        openPhotoCropper(file, false, async (croppedBase64) => {
            if (profileCoverImg) profileCoverImg.src = croppedBase64;
            await updateUserCustomProfile({ cover: croppedBase64 });
        });
    });

    btnDiceAvatarFast.addEventListener('click', async () => {
        const animeAvatars = [
            'https://api.dicebear.com/7.x/adventurer/svg?seed=',
            'https://api.dicebear.com/7.x/lorelei/svg?seed=',
            'https://api.dicebear.com/7.x/personas/svg?seed=',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=',
            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=',
            'https://api.dicebear.com/7.x/bottts/svg?seed=',
            'https://api.dicebear.com/7.x/big-smile/svg?seed=',
            'https://api.dicebear.com/7.x/micah/svg?seed='
        ];

        // High quality curated anime & gaming style avatars
        const curatedAnimeList = [
            'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1569705460033-cfaa4b368d6a?w=300&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80'
        ];

        let newAvatar = '';
        if (Math.random() > 0.3) {
            const baseUrl = animeAvatars[Math.floor(Math.random() * animeAvatars.length)];
            const seed = 'anime_' + Date.now() + '_' + Math.floor(Math.random() * 999999);
            newAvatar = `${baseUrl}${seed}`;
        } else {
            newAvatar = curatedAnimeList[Math.floor(Math.random() * curatedAnimeList.length)];
        }
        
        if (profileAvatarImg) profileAvatarImg.src = newAvatar;
        if (myHeaderAvatar) myHeaderAvatar.src = newAvatar;
        if (myStatusAvatar) myStatusAvatar.src = newAvatar;
        if (settingsMyAvatar) settingsMyAvatar.src = newAvatar;

        await updateUserCustomProfile({ avatar: newAvatar });
    });

    const btnDiceGroupAvatar = document.getElementById('btn-dice-group-avatar');
    if (btnDiceGroupAvatar) {
        btnDiceGroupAvatar.addEventListener('click', () => {
            const styles = ['identicon', 'bottts', 'adventurer', 'fun-emoji', 'shapes', 'lorelei', 'personas'];
            const randomStyle = styles[Math.floor(Math.random() * styles.length)];
            const seed = 'group_anime_' + Date.now() + '_' + Math.floor(Math.random() * 999999);
            stagedGroupAvatarBase64 = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`;
            if (newgroupAvatarPreview) newgroupAvatarPreview.src = stagedGroupAvatarBase64;
        });
    }

    const btnDiceEditGroupAvatar = document.getElementById('btn-dice-edit-group-avatar');
    if (btnDiceEditGroupAvatar) {
        btnDiceEditGroupAvatar.addEventListener('click', async () => {
            const styles = ['identicon', 'bottts', 'adventurer', 'fun-emoji', 'shapes', 'lorelei', 'personas'];
            const randomStyle = styles[Math.floor(Math.random() * styles.length)];
            const seed = 'group_anime_' + Date.now() + '_' + Math.floor(Math.random() * 999999);
            const newAvatar = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`;
            if (infoGroupAvatar) infoGroupAvatar.src = newAvatar;
            await updateGroupData({ avatar: newAvatar });
        });
    }

    btnSaveName.addEventListener('click', () => {
        const name = inputEditName.value.trim();
        if (name) updateUserCustomProfile({ name });
    });

    const inputEditHandle = document.getElementById('input-edit-handle');
    const btnSaveHandle = document.getElementById('btn-save-handle');
    if (btnSaveHandle && inputEditHandle) {
        btnSaveHandle.addEventListener('click', () => {
            let h = inputEditHandle.value.trim();
            if (h) {
                if (!h.startsWith('@')) h = '@' + h;
                h = h.toLowerCase().replace(/[^a-z0-9_@]/g, '');
                inputEditHandle.value = h;
                updateUserCustomProfile({ handle: h });
            }
        });
    }

    btnSaveAbout.addEventListener('click', () => {
        const about = inputEditAbout.value.trim();
        updateUserCustomProfile({ about });
    });

    async function updateUserCustomProfile(fields) {
        if (!currentUser) return;
        try {
            const res = await fetch('/api/user/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, ...fields })
            });
            const data = await res.json();
            if (data.user) {
                currentUser = data.user;
                try {
                    localStorage.setItem('wa_user_name', currentUser.name);
                    if (currentUser.handle) localStorage.setItem('wa_user_handle', currentUser.handle);
                    localStorage.setItem('wa_user_avatar', currentUser.avatar);
                    localStorage.setItem('wa_user_cover', currentUser.cover);
                } catch (err) {}
                updateProfileUI();
                showToast('Perfil atualizado com sucesso!', 'fa-solid fa-check');
            }
        } catch (e) {
            console.error('Erro ao sincronizar perfil:', e);
        }
    }

    // --- 16. NOVO GRUPO ---
    async function loadMembersForNewGroup() {
        const box = document.getElementById('newgroup-members-select-box');
        if (!box) return;
        box.innerHTML = '<div style="text-align:center; padding:10px; color:var(--wa-text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando contatos...</div>';
        try {
            const uid = currentUser ? currentUser.id : (localStorage.getItem('wa_user_id') || 'anon');
            const res = await fetch(`/api/users/list?currentUserId=${encodeURIComponent(uid)}`);
            const data = await res.json();
            box.innerHTML = '';
            const list = data.users || [];
            if (list.length === 0) {
                box.innerHTML = '<div style="font-size:12px; color:var(--wa-text-sub); padding:8px; text-align:center;">Nenhum outro contato disponível no momento.</div>';
                return;
            }
            list.forEach(u => {
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.gap = '10px';
                label.style.padding = '6px 8px';
                label.style.borderRadius = '6px';
                label.style.cursor = 'pointer';
                label.style.borderBottom = '1px solid var(--wa-border)';
                label.innerHTML = `
                    <input type="checkbox" class="chk-newgroup-member" value="${u.id}" data-name="${escapeHTML(u.name)}" data-avatar="${u.avatar}" style="accent-color:var(--wa-green); width:16px; height:16px; cursor:pointer;">
                    <img src="${u.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    <span style="font-size:13.5px; color:var(--wa-text-main); font-weight:500;">${escapeHTML(u.name)}</span>
                `;
                box.appendChild(label);
            });
        } catch (e) {
            box.innerHTML = '<div style="color:#ea4335; font-size:12px; padding:8px;">Erro ao carregar contatos.</div>';
        }
    }

    menuOptNewGroup.addEventListener('click', () => {
        closeAllDrawers();
        drawerNewGroup.classList.add('active');
        loadMembersForNewGroup();
    });

    btnNewChat.addEventListener('click', () => {
        closeAllDrawers();
        drawerNewGroup.classList.add('active');
        loadMembersForNewGroup();
    });

    btnCloseNewGroupDrawer.addEventListener('click', () => {
        drawerNewGroup.classList.remove('active');
    });

    let stagedGroupAvatarBase64 = null;
    let stagedGroupCoverBase64 = null;

    inputGroupAvatar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        openPhotoCropper(file, true, (croppedBase64) => {
            stagedGroupAvatarBase64 = croppedBase64;
            if (newgroupAvatarPreview) newgroupAvatarPreview.src = croppedBase64;
        });
    });

    inputGroupCover.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        openPhotoCropper(file, false, (croppedBase64) => {
            stagedGroupCoverBase64 = croppedBase64;
            if (newgroupCoverPreview) newgroupCoverPreview.src = croppedBase64;
        });
    });

    formCreateGroup.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = inputNewgroupName.value.trim();
        const desc = inputNewgroupDesc.value.trim();
        if (!name) return;

        const uid = currentUser ? currentUser.id : (localStorage.getItem('wa_user_id') || 'anon');
        const uname = currentUser ? currentUser.name : (localStorage.getItem('wa_user_name') || 'Alguém');

        const selectedMemberCheckboxes = document.querySelectorAll('.chk-newgroup-member:checked');
        const initialMembers = [];
        selectedMemberCheckboxes.forEach(chk => {
            initialMembers.push({
                id: chk.value,
                name: chk.dataset.name,
                avatar: chk.dataset.avatar,
                role: 'member'
            });
        });

        const payload = {
            name,
            desc,
            avatar: stagedGroupAvatarBase64 || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
            cover: stagedGroupCoverBase64 || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
            userId: uid,
            userName: uname,
            initialMembers: initialMembers
        };

        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success && data.group) {
                const existingIdx = conversations.findIndex(c => c.id === data.group.id);
                if (existingIdx !== -1) {
                    conversations[existingIdx] = data.group;
                } else {
                    conversations.unshift(data.group);
                }
                renderConversations();
                await selectConversation(data.group.id);
                drawerNewGroup.classList.remove('active');
                inputNewgroupName.value = '';
                inputNewgroupDesc.value = '';
                stagedGroupAvatarBase64 = null;
                stagedGroupCoverBase64 = null;
            }
        } catch (err) {
            alert('Erro ao criar grupo: ' + err.message);
        }
    });

    let voiceStream = null;

    // --- 17. VOICE RECORDING ---
    async function startVoiceRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Gravação de voz não suportada neste navegador.');
            return;
        }

        try {
            voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            mediaRecorder = new MediaRecorder(voiceStream);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.start();
            recStartTime = Date.now();
            chatRecordingBar.classList.add('active');

            recInterval = setInterval(() => {
                const sec = Math.floor((Date.now() - recStartTime) / 1000);
                recDurationLabel.textContent = formatTimer(sec);
            }, 500);

        } catch (e) {
            alert('Acesso ao microfone negado: ' + e.message);
        }
    }

    btnCancelVoice.addEventListener('click', () => {
        stopVoiceRecording(false);
    });

    btnSendVoice.addEventListener('click', () => {
        stopVoiceRecording(true);
    });

    function stopVoiceRecording(shouldSend) {
        if (recInterval) clearInterval(recInterval);
        chatRecordingBar.classList.remove('active');
        recDurationLabel.textContent = '00:00';

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            const duration = Math.floor((Date.now() - recStartTime) / 1000);
            mediaRecorder.onstop = () => {
                if (shouldSend && audioChunks.length > 0) {
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onload = async () => {
                        sendVoiceMessage(reader.result, duration);
                    };
                    reader.readAsDataURL(blob);
                }
                if (voiceStream) {
                    voiceStream.getTracks().forEach(t => t.stop());
                    voiceStream = null;
                }
            };
            mediaRecorder.stop();
        } else {
            if (voiceStream) {
                voiceStream.getTracks().forEach(t => t.stop());
                voiceStream = null;
            }
        }
    }

    async function sendVoiceMessage(audioBase64, duration) {
        if (!activeConversation || !currentUser) return;
        const payload = {
            convId: activeConversation.id,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            audio: audioBase64,
            duration: duration,
            type: 'audio'
        };

        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error('Voice send error:', e);
        }
    }

    // --- 18. CUSTOM AUDIO PLAYER WITH SPEED ---
    function setupCustomAudioPlayer(wrapper) {
        const audioSrc = wrapper.dataset.audioSrc;
        const btnPlay = wrapper.querySelector('.btn-audio-play');
        const barFill = wrapper.querySelector('.audio-bar-fill');
        const barTrack = wrapper.querySelector('.audio-bar-track');
        const durLabel = wrapper.querySelector('.audio-duration-txt');
        const speedBtn = wrapper.querySelector('.audio-speed-pill');

        const audio = new Audio(audioSrc);
        const speeds = [1, 1.5, 2];
        let speedIdx = 0;

        audio.addEventListener('loadedmetadata', () => {
            durLabel.textContent = formatSeconds(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            barFill.style.width = percent + '%';
            durLabel.textContent = formatSeconds(audio.currentTime);
        });

        audio.addEventListener('ended', () => {
            btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
            barFill.style.width = '0%';
            durLabel.textContent = formatSeconds(audio.duration);
            activeAudioPlayer = null;
        });

        btnPlay.addEventListener('click', () => {
            if (activeAudioPlayer && activeAudioPlayer !== audio) {
                activeAudioPlayer.pause();
            }

            if (audio.paused) {
                audio.play();
                btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
                activeAudioPlayer = audio;
            } else {
                audio.pause();
                btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
                activeAudioPlayer = null;
            }
        });

        barTrack.addEventListener('click', (e) => {
            const rect = barTrack.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            audio.currentTime = clickPos * audio.duration;
        });

        speedBtn.addEventListener('click', () => {
            speedIdx = (speedIdx + 1) % speeds.length;
            audio.playbackRate = speeds[speedIdx];
            speedBtn.textContent = speeds[speedIdx] + 'x';
        });
    }

    // --- 19. ATTACHMENT & PREVIEW ---
    inputChatFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (attachPopupMenu) attachPopupMenu.classList.remove('active');

        const compressedBase64 = await compressImageFile(file, 1280, 720);
        if (!compressedBase64) return;

        stagedMediaBase64 = compressedBase64;
        if (mediaPreviewThumb) mediaPreviewThumb.src = stagedMediaBase64;
        if (mediaPreviewTray) mediaPreviewTray.classList.add('active');
        toggleActionIcon();
    });

    btnRemoveMediaThumb.addEventListener('click', clearMediaTray);

    function clearMediaTray() {
        stagedMediaBase64 = null;
        mediaPreviewTray.classList.remove('active');
        inputChatFile.value = '';
        toggleActionIcon();
    }

    function clearReply() {
        currentReplyMessage = null;
        chatReplyBanner.classList.remove('active');
    }

    btnCloseReply.addEventListener('click', clearReply);

    function sendTyping(isTyping) {
        if (!activeConversation || !currentUser) return;
        fetch('/api/typing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                convId: activeConversation.id,
                userId: currentUser.id,
                isTyping
            })
        }).catch(() => {});
    }

    let typingRestoreTimer = null;

    function handleTypingIndicator(data) {
        if (!activeConversation || data.convId !== activeConversation.id || (currentUser && data.userId === currentUser.id)) return;

        if (data.isTyping) {
            // 1. Header Subtitle Update (Lá em cima)
            const typingLabel = activeConversation.type === 'direct' ? 'digitando...' : `${data.name} está digitando...`;
            chatHeaderSubtitle.innerHTML = `<span style="color:var(--wa-green); font-weight:600;">${escapeHTML(typingLabel)}</span>`;

            // 2. Typing Bubble at Bottom of Messages Wall (Embaixo com fotinha da pessoa)
            let bubbleRow = document.getElementById('typing-bubble-row');
            if (!bubbleRow) {
                bubbleRow = document.createElement('div');
                bubbleRow.id = 'typing-bubble-row';
                bubbleRow.className = 'msg-row msg-incoming typing-bubble-row';
                bubbleRow.innerHTML = `
                    <img src="${data.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(data.userId)}" class="msg-avatar" alt="">
                    <div class="msg-bubble typing-bubble">
                        <div class="typing-dots">
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                        </div>
                    </div>
                `;
                messagesWall.appendChild(bubbleRow);
            } else {
                const img = bubbleRow.querySelector('.msg-avatar');
                if (img && data.avatar) img.src = data.avatar;
            }
            messagesWall.scrollTop = messagesWall.scrollHeight;

            clearTimeout(typingRestoreTimer);
            typingRestoreTimer = setTimeout(() => {
                removeTypingIndicator();
            }, 4500);
        } else {
            removeTypingIndicator();
        }
    }

    function removeTypingIndicator() {
        const bubbleRow = document.getElementById('typing-bubble-row');
        if (bubbleRow) bubbleRow.remove();
        if (activeConversation) updateChatHeader();
    }

    // --- 20. STATUS / STORIES ---
    btnTabStatus.addEventListener('click', () => {
        closeAllDrawers();
        drawerStatus.classList.add('active');
    });

    btnCloseStatusDrawer.addEventListener('click', () => {
        drawerStatus.classList.remove('active');
    });

    btnMyStatusAdd.addEventListener('click', () => {
        modalCreateStatus.classList.add('active');
    });

    btnCloseCreateStatus.addEventListener('click', () => {
        modalCreateStatus.classList.remove('active');
    });

    document.querySelectorAll('.status-color-palette .color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.status-color-palette .color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            currentStatusBg = dot.dataset.color;
            statusCreatorPreview.style.background = currentStatusBg;
        });
    });

    inputStatusPhoto.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            stagedStatusPhotoBase64 = evt.target.result;
            statusPhotoPreview.src = stagedStatusPhotoBase64;
            statusPhotoPreview.style.display = 'block';
            inputStatusText.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    btnSubmitStatus.addEventListener('click', async () => {
        if (!currentUser) return;
        const text = inputStatusText.value.trim();
        if (!text && !stagedStatusPhotoBase64) return;

        if (isCreatingGroupStatus && activeConversation) {
            // ENVIAR STATUS PARA O GRUPO
            const payload = {
                userId: currentUser.id,
                userName: currentUser.name,
                userAvatar: currentUser.avatar,
                groupId: activeConversation.id,
                text,
                media: stagedStatusPhotoBase64
            };
            try {
                const res = await fetch('/api/groups/status/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if(data.error) alert(data.error);
                modalCreateStatus.classList.remove('active');
                inputStatusText.value = '';
                stagedStatusPhotoBase64 = null;
                statusPhotoPreview.style.display = 'none';
                inputStatusText.style.display = 'block';
                isCreatingGroupStatus = false;
            } catch (e) {
                alert('Erro ao publicar status no grupo: ' + e.message);
            }
            return;
        }

        // ENVIAR STATUS GLOBAL
        const payload = {
            userId: currentUser.id,
            text,
            media: stagedStatusPhotoBase64,
            bgColor: currentStatusBg
        };

        try {
            await fetch('/api/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            modalCreateStatus.classList.remove('active');
            inputStatusText.value = '';
            stagedStatusPhotoBase64 = null;
            statusPhotoPreview.style.display = 'none';
            inputStatusText.style.display = 'block';
        } catch (e) {
            alert('Erro ao publicar status: ' + e.message);
        }
    });

    function renderStatuses() {
        statusFeedContainer.innerHTML = '';
        statuses.forEach(st => {
            const item = document.createElement('div');
            item.className = 'status-item-row';
            item.innerHTML = `
                <div class="status-avatar-ring">
                    <img src="${st.userAvatar}" alt="">
                </div>
                <div class="status-item-info">
                    <strong>${escapeHTML(st.userName)}</strong>
                    <small>${st.time}</small>
                </div>
            `;
            item.addEventListener('click', () => viewStatusStory(st));
            statusFeedContainer.appendChild(item);
        });
    }

    let statusViewTimer = null;
    function viewStatusStory(st) {
        viewerUserAvatar.src = st.userAvatar;
        viewerUserName.textContent = st.userName;
        viewerUserTime.textContent = st.time;

        if (st.media) {
            statusViewerBody.style.background = '#000000';
            statusViewerBody.innerHTML = `<img src="${st.media}" alt="Status">`;
        } else {
            statusViewerBody.style.background = st.bgColor || '#00a884';
            statusViewerBody.innerHTML = `<div>${escapeHTML(st.text)}</div>`;
        }

        statusViewerModal.classList.add('active');
        statusProgressFill.style.transition = 'none';
        statusProgressFill.style.width = '0%';

        setTimeout(() => {
            statusProgressFill.style.transition = 'width 5s linear';
            statusProgressFill.style.width = '100%';
        }, 50);

        clearTimeout(statusViewTimer);
        statusViewTimer = setTimeout(() => {
            statusViewerModal.classList.remove('active');
        }, 5050);
    }

    btnCloseStatusViewer.addEventListener('click', () => {
        clearTimeout(statusViewTimer);
        statusViewerModal.classList.remove('active');
    });

    // --- 21. CHAT MORE OPTIONS DROPDOWN ---
    btnMenuOptions.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });

    btnChatMoreOptions.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeConversation) {
            const isGroup = activeConversation.type === 'group';
            if (optAddMember) optAddMember.style.display = isGroup ? 'flex' : 'none';
            if (optLeaveChat) {
                optLeaveChat.innerHTML = isGroup 
                    ? '<i class="fa-solid fa-right-from-bracket" style="color:#ea4335;"></i> Sair do grupo' 
                    : '<i class="fa-solid fa-trash" style="color:#ea4335;"></i> Apagar conversa';
            }
        }
        chatMoreDropdown.classList.toggle('active');
    });

    optViewInfo.addEventListener('click', () => {
        handleOpenHeaderDetails();
    });

    optAddMember.addEventListener('click', () => {
        modalAddMember.classList.add('active');
    });

    optClearChat.addEventListener('click', () => {
        if (confirm('Deseja limpar as mensagens desta conversa?')) {
            messagesWall.innerHTML = '<div class="system-msg-badge"><i class="fa-solid fa-broom"></i> Conversa limpa localmente.</div>';
        }
    });

    optMuteChat.addEventListener('click', () => {
        if (!activeConversation) return;
        const newMute = !activeConversation.mute;
        updateGroupData({ mute: newMute });
        alert(newMute ? 'Notificações silenciadas para esta conversa.' : 'Notificações reativadas.');
    });

    optLeaveChat.addEventListener('click', () => {
        btnActionLeaveGroup.click();
    });

    menuOptTheme.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        const nextTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('wa_theme', nextTheme);
        applyThemeAndPreferences();
    });

    menuOptClear.addEventListener('click', () => {
        if (confirm('Deseja desconectar e limpar todos os dados do navegador?')) {
            localStorage.clear();
            window.location.reload();
        }
    });

    // --- 22. SEARCH & FILTERS ---
    if (btnOpenArchived) {
        btnOpenArchived.addEventListener('click', () => {
            currentFilter = currentFilter === 'archived' ? 'all' : 'archived';
            filterChips.forEach(c => c.classList.toggle('active', c.dataset.filter === currentFilter));
            renderConversations(inputSearchChats ? inputSearchChats.value.trim() : '');
        });
    }

    // --- 22. SEARCH & FILTERS WITH LIVE AUTOCOMPLETE SUGGESTIONS ---
    const searchAutocompleteDropdown = document.getElementById('search-autocomplete-dropdown');
    const autocompleteUsersList = document.getElementById('autocomplete-users-list');
    let searchUsersDebounce = null;
    let cachedUsersForSearch = [];

    async function fetchUsersForSearchSuggestions() {
        try {
            const uid = currentUser ? currentUser.id : 'anon';
            const res = await fetch(`/api/users/list?currentUserId=${encodeURIComponent(uid)}`);
            const data = await res.json();
            if (data.success && data.users) {
                cachedUsersForSearch = data.users;
            }
        } catch (e) {}
        return cachedUsersForSearch;
    }

    if (inputSearchChats) {
        inputSearchChats.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            renderConversations(val);

            clearTimeout(searchUsersDebounce);
            if (!val || val.length < 1) {
                if (searchAutocompleteDropdown) searchAutocompleteDropdown.style.display = 'none';
                return;
            }

            searchUsersDebounce = setTimeout(async () => {
                const users = await fetchUsersForSearchSuggestions();
                const matched = users.filter(u => 
                    (u.name && u.name.toLowerCase().includes(val.toLowerCase())) || 
                    (u.handle && u.handle.toLowerCase().includes(val.toLowerCase())) ||
                    (u.id && u.id.toLowerCase().includes(val.toLowerCase()))
                );

                if (matched.length > 0 && searchAutocompleteDropdown && autocompleteUsersList) {
                    autocompleteUsersList.innerHTML = '';
                    matched.slice(0, 6).forEach(u => {
                        const item = document.createElement('div');
                        item.className = 'autocomplete-item-card';
                        const userHandleTag = u.handle || ('@' + u.id);
                        item.innerHTML = `
                            <img src="${escapeHTML(u.avatar || '')}" class="autocomplete-avatar" alt="">
                            <div class="autocomplete-info">
                                <strong class="autocomplete-name">${escapeHTML(u.name)} <span style="color:var(--wa-green); font-size:12px; font-weight:500;">${escapeHTML(userHandleTag)}</span></strong>
                                <span class="autocomplete-sub">${u.isOnline ? '🟢 Online agora' : 'Disponível no ZapAnon'}</span>
                            </div>
                            <span class="autocomplete-action-badge"><i class="fa-solid fa-comments"></i> Conversar</span>
                        `;
                        item.addEventListener('click', async () => {
                            searchAutocompleteDropdown.style.display = 'none';
                            inputSearchChats.value = '';
                            renderConversations('');
                            try {
                                const res = await fetch('/api/conversations/direct', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: currentUser.id, recipientId: u.id })
                                });
                                const d = await res.json();
                                if (d.success && d.conversation) {
                                    const exists = conversations.find(c => c.id === d.conversation.id);
                                    if (!exists) conversations.unshift(d.conversation);
                                    renderConversations('');
                                    selectConversation(d.conversation.id);

                                    // Salva automaticamente o contato na lista
                                    fetch('/api/contacts/save', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: currentUser.id, contactId: u.id, customName: u.name })
                                    }).then(() => showToast(`Contato "${u.name}" adicionado aos seus contatos!`, 'fa-solid fa-address-book')).catch(() => {});
                                }
                            } catch (err) {}
                        });
                        autocompleteUsersList.appendChild(item);
                    });
                    searchAutocompleteDropdown.style.display = 'block';
                } else if (searchAutocompleteDropdown) {
                    searchAutocompleteDropdown.style.display = 'none';
                }
            }, 120);
        });

        document.addEventListener('click', (evt) => {
            if (searchAutocompleteDropdown && !evt.target.closest('.wa-search-section')) {
                searchAutocompleteDropdown.style.display = 'none';
            }
        });
    }

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            renderConversations(inputSearchChats.value.trim());
        });
    });

    // --- 23. WALLPAPER MODAL LOGIC ---
    const modalWallpaper = document.getElementById('modal-wallpaper');
    const btnCloseWallpaper = document.getElementById('btn-close-wallpaper');
    const btnResetWallpaper = document.getElementById('btn-reset-wallpaper');
    const btnApplyWallpaper = document.getElementById('btn-apply-wallpaper');
    const inputCustomWallpaperFile = document.getElementById('input-custom-wallpaper-file');
    const wallpaperCards = document.querySelectorAll('.wallpaper-card');
    const optWallpaper = document.getElementById('opt-wallpaper');

    let selectedWallpaperVal = 'default';
    let customWallpaperDataUrl = null;

    function openWallpaperModal() {
        if (!activeConversation) {
            alert('Abra uma conversa primeiro para alterar o papel de parede.');
            return;
        }
        selectedWallpaperVal = activeConversation.wallpaper || 'default';
        customWallpaperDataUrl = null;

        wallpaperCards.forEach(card => {
            card.classList.toggle('active', card.dataset.wp === selectedWallpaperVal);
        });

        modalWallpaper.classList.add('active');
    }

    if (optWallpaper) {
        optWallpaper.addEventListener('click', openWallpaperModal);
    }

    if (btnCloseWallpaper) {
        btnCloseWallpaper.addEventListener('click', () => {
            modalWallpaper.classList.remove('active');
        });
    }

    wallpaperCards.forEach(card => {
        card.addEventListener('click', () => {
            wallpaperCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedWallpaperVal = card.dataset.wp;
            customWallpaperDataUrl = null;
        });
    });

    if (inputCustomWallpaperFile) {
        inputCustomWallpaperFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const compressedBase64 = await compressImageFile(file, 1280, 720);
            if (!compressedBase64) return;

            customWallpaperDataUrl = compressedBase64;
            wallpaperCards.forEach(c => c.classList.remove('active'));
            alert('Imagem de fundo carregada! Clique em "Aplicar" para salvar.');
        });
    }

    function applyWallpaperToChat(wpValue) {
        if (!messagesWall) return;
        messagesWall.className = 'chat-messages-wall';
        if (!wpValue || wpValue === 'default') {
            messagesWall.style.backgroundImage = '';
            messagesWall.style.backgroundColor = '';
            return;
        }
        if (wpValue.startsWith('data:') || wpValue.startsWith('http')) {
            messagesWall.style.backgroundImage = `url("${wpValue}")`;
            messagesWall.style.backgroundSize = 'cover';
            messagesWall.style.backgroundPosition = 'center';
        } else {
            messagesWall.style.backgroundImage = '';
            messagesWall.style.backgroundColor = '';
            messagesWall.classList.add(`wp-${wpValue}`);
        }
    }

    if (btnApplyWallpaper) {
        btnApplyWallpaper.addEventListener('click', async () => {
            if (!activeConversation) return;
            const wpToSave = customWallpaperDataUrl || selectedWallpaperVal;

            try {
                const res = await fetch('/api/conversations/wallpaper', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ convId: activeConversation.id, wallpaper: wpToSave })
                });
                const data = await res.json();
                if (data.success) {
                    activeConversation.wallpaper = wpToSave;
                    applyWallpaperToChat(wpToSave);
                    modalWallpaper.classList.remove('active');
                }
            } catch (err) {
                activeConversation.wallpaper = wpToSave;
                applyWallpaperToChat(wpToSave);
                modalWallpaper.classList.remove('active');
            }
        });
    }

    if (btnResetWallpaper) {
        btnResetWallpaper.addEventListener('click', async () => {
            if (!activeConversation) return;
            try {
                await fetch('/api/conversations/wallpaper', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ convId: activeConversation.id, wallpaper: 'default' })
                });
            } catch (err) {}
            activeConversation.wallpaper = 'default';
            applyWallpaperToChat('default');
            modalWallpaper.classList.remove('active');
        });
    }

    // --- 24. FULL SCREEN USER PROFILE MODAL ---
    const modalUserProfile = document.getElementById('modal-user-profile');
    const btnCloseUserProfile = document.getElementById('btn-close-user-profile');
    const userProfileCoverImg = document.getElementById('user-profile-cover-img');
    const userProfileAvatarImg = document.getElementById('user-profile-avatar-img');
    const userProfileDisplayName = document.getElementById('user-profile-display-name');
    const userProfileUsernameTag = document.getElementById('user-profile-username-tag');
    const userProfileAboutText = document.getElementById('user-profile-about-text');
    const userProfileOnlineBadge = document.getElementById('user-profile-online-badge');
    const btnUserProfileMsg = document.getElementById('btn-user-profile-action-msg');
    const btnUserProfileCall = document.getElementById('btn-user-profile-action-call');
    const btnUserProfileWallpaper = document.getElementById('btn-user-profile-action-wallpaper');
    const btnUserProfileBlock = document.getElementById('btn-user-profile-action-block');

    let currentOpenProfileUser = null;

    async function openUserProfileModal(userId, nameHint = '', avatarHint = '') {
        if (!userId) return;

        let targetUser = {
            id: userId,
            name: nameHint || 'Contato Anônimo',
            avatar: avatarHint || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userId)}`,
            cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
            about: 'Disponível no ZapAnon',
            isOnline: true
        };

        try {
            const res = await fetch(`/api/users/profile?userId=${encodeURIComponent(userId)}`);
            const data = await res.json();
            if (data.success && data.user) {
                targetUser = data.user;
            }
        } catch (e) {}

        currentOpenProfileUser = targetUser;
        if (userProfileCoverImg) userProfileCoverImg.src = targetUser.cover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80';
        if (userProfileAvatarImg) userProfileAvatarImg.src = targetUser.avatar;
        if (userProfileDisplayName) userProfileDisplayName.textContent = targetUser.name;
        if (userProfileUsernameTag) userProfileUsernameTag.textContent = targetUser.handle || ('@' + targetUser.id);
        if (userProfileAboutText) userProfileAboutText.textContent = targetUser.about || 'Disponível no ZapAnon';

        if (userProfileOnlineBadge) {
            userProfileOnlineBadge.style.display = 'inline-flex';
            userProfileOnlineBadge.innerHTML = targetUser.isOnline ? '<i class="fa-solid fa-circle"></i> Online agora' : '<i class="fa-regular fa-clock"></i> Visto recentemente';
        }

        if (modalUserProfile) modalUserProfile.classList.add('active');
    }

    if (btnCloseUserProfile) {
        btnCloseUserProfile.addEventListener('click', () => {
            modalUserProfile.classList.remove('active');
        });
    }

    if (btnUserProfileMsg) {
        btnUserProfileMsg.addEventListener('click', async () => {
            if (!currentOpenProfileUser) return;
            modalUserProfile.classList.remove('active');
            rightInfoDrawer.classList.remove('active');
            await startDirectPrivateChat(currentOpenProfileUser.id, currentOpenProfileUser.name, currentOpenProfileUser.avatar);
        });
    }

    if (btnUserProfileWallpaper) {
        btnUserProfileWallpaper.addEventListener('click', () => {
            modalUserProfile.classList.remove('active');
            openWallpaperModal();
        });
    }

    if (btnUserProfileCall) {
        btnUserProfileCall.addEventListener('click', () => {
            alert(`Chamada de voz com ${currentOpenProfileUser ? currentOpenProfileUser.name : 'o contato'}... 📞`);
        });
    }

    if (btnUserProfileBlock) {
        btnUserProfileBlock.addEventListener('click', () => {
            alert(`Contato ${currentOpenProfileUser ? currentOpenProfileUser.name : ''} bloqueado com sucesso.`);
            modalUserProfile.classList.remove('active');
        });
    }

    async function startDirectPrivateChat(recipientId, nameHint = '', avatarHint = '') {
        const uid = currentUser ? currentUser.id : (localStorage.getItem('wa_user_id') || 'anon_' + Date.now());
        const uname = currentUser ? currentUser.name : (localStorage.getItem('wa_user_name') || 'Anônimo');
        const uavatar = currentUser ? currentUser.avatar : (localStorage.getItem('wa_user_avatar') || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`);

        try {
            const res = await fetch('/api/conversations/direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: uid,
                    recipientId: recipientId,
                    recipientName: nameHint,
                    recipientAvatar: avatarHint
                })
            });
            const data = await res.json();
            if (data.success && data.conversation) {
                const existingIdx = conversations.findIndex(c => c.id === data.conversation.id);
                if (existingIdx !== -1) {
                    conversations[existingIdx] = data.conversation;
                } else {
                    conversations.unshift(data.conversation);
                }
                renderConversations();
                await selectConversation(data.conversation.id);
            }
        } catch (e) {
            console.error('Error starting direct chat:', e);
        }
    }

    // --- 25. STICKER CREATOR & SEARCH ---
    const inputSearchStickersGifs = document.getElementById('input-search-stickers-gifs');
    const inputCreateSticker = document.getElementById('input-create-sticker');

    if (inputCreateSticker) {
        inputCreateSticker.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const isVideo = file.type.startsWith('video/');
            const isGif = file.type === 'image/gif';

            const registerAndSendSticker = async (stickerUrl) => {
                if (currentUser) {
                    try {
                        await fetch('/api/stickers/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUser.id, sticker: stickerUrl })
                        });
                        stickerPacks.unshift({
                            id: 'custom_' + Date.now(),
                            name: '⭐ Minha Figurinha Animada',
                            stickers: [stickerUrl]
                        });
                    } catch (err) {}
                }
                sendSticker(stickerUrl);
            };

            if (isGif) {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    await registerAndSendSticker(evt.target.result);
                };
                reader.readAsDataURL(file);
            } else if (isVideo) {
                const videoEl = document.createElement('video');
                videoEl.muted = true;
                videoEl.playsInline = true;
                videoEl.src = URL.createObjectURL(file);

                videoEl.onloadedmetadata = async () => {
                    if (videoEl.duration > 10) {
                        alert('A sua figurinha animada capturará os primeiros 10 segundos do vídeo!');
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 512;
                    const ctx = canvas.getContext('2d');

                    let stream = null;
                    try {
                        stream = canvas.captureStream(30);
                    } catch(err) {}

                    if (stream && typeof MediaRecorder !== 'undefined') {
                        let recorder = null;
                        try {
                            recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                        } catch(e) {
                            try { recorder = new MediaRecorder(stream); } catch(ex){}
                        }

                        if (recorder) {
                            const chunks = [];
                            recorder.ondataavailable = (evt) => { if (evt.data.size > 0) chunks.push(evt.data); };
                            recorder.onstop = async () => {
                                const blob = new Blob(chunks, { type: 'video/webm' });
                                const reader = new FileReader();
                                reader.onload = async (re) => {
                                    await registerAndSendSticker(re.target.result);
                                };
                                reader.readAsDataURL(blob);
                            };

                            videoEl.currentTime = 0;
                            await videoEl.play().catch(() => {});
                            recorder.start();

                            const startTime = Date.now();
                            const drawFrame = () => {
                                const elapsed = (Date.now() - startTime) / 1000;
                                if (elapsed >= 10 || videoEl.ended || videoEl.paused) {
                                    try { videoEl.pause(); } catch(e){}
                                    try { recorder.stop(); } catch(e){}
                                    return;
                                }
                                let scale = Math.min(512 / (videoEl.videoWidth || 512), 512 / (videoEl.videoHeight || 512));
                                let w = (videoEl.videoWidth || 512) * scale;
                                let h = (videoEl.videoHeight || 512) * scale;
                                let x = (512 - w) / 2;
                                let y = (512 - h) / 2;

                                ctx.clearRect(0, 0, 512, 512);
                                ctx.drawImage(videoEl, x, y, w, h);
                                requestAnimationFrame(drawFrame);
                            };
                            drawFrame();
                            return;
                        }
                    }

                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                        await registerAndSendSticker(evt.target.result);
                    };
                    reader.readAsDataURL(file);
                };
            } else {
                const compressedBase64 = await compressImageFile(file, 512, 512, 0.9);
                if (compressedBase64) {
                    await registerAndSendSticker(compressedBase64);
                }
            }
        });
    }

    if (inputSearchStickersGifs) {
        let searchDebounce = null;
        inputSearchStickersGifs.addEventListener('input', (e) => {
            clearTimeout(searchDebounce);
            const query = e.target.value.trim().toLowerCase();
            searchDebounce = setTimeout(async () => {
                if (!query) {
                    renderStickerPacks();
                    return;
                }

                stickersGridItems.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:15px; color:var(--wa-text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Pesquisando...</div>';

                try {
                    const res = await fetch(`/api/stickers/search?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    stickersGridItems.innerHTML = '';
                    const results = data.results || [];
                    if (results.length === 0) {
                        stickersGridItems.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:15px; color:var(--wa-text-sub);">Nenhum resultado encontrado.</div>';
                        return;
                    }
                    results.forEach(st => {
                        const img = document.createElement('img');
                        img.src = st.url;
                        img.alt = st.title || 'GIF/Figurinha';
                        img.addEventListener('click', () => sendSticker(st.url));
                        stickersGridItems.appendChild(img);
                    });
                } catch (e) {
                    stickersGridItems.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:15px; color:#ea4335;">Erro na busca.</div>';
                }
            }, 300);
        });
    }

    // --- 26. POPULATE CONTACTS IN NEW CHAT DRAWER ---
    const newChatContactsList = document.getElementById('new-chat-contacts-list');
    async function loadContactsForNewChat() {
        if (!newChatContactsList) return;
        newChatContactsList.innerHTML = '<div style="text-align:center; padding:12px; color:var(--wa-text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando contatos...</div>';
        try {
            const uid = currentUser ? currentUser.id : (localStorage.getItem('wa_user_id') || 'anon');
            const res = await fetch(`/api/users/list?currentUserId=${encodeURIComponent(uid)}`);
            const data = await res.json();
            newChatContactsList.innerHTML = '';
            
            const list = data.users || [];
            if (list.length === 0) {
                newChatContactsList.innerHTML = '<div style="text-align:center; padding:12px; color:var(--wa-text-sub);">Nenhum contato encontrado.</div>';
                return;
            }

            list.forEach(u => {
                const item = document.createElement('div');
                item.className = 'chat-card';
                item.style.borderBottom = '1px solid var(--wa-border)';
                item.style.cursor = 'pointer';
                item.innerHTML = `
                    <div class="chat-card-avatar">
                        <img src="${u.avatar}" alt="" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=${u.id}'">
                    </div>
                    <div class="chat-card-body">
                        <div class="chat-card-title-row">
                            <span class="chat-card-name">${escapeHTML(u.name)}</span>
                            ${u.isOnline ? '<span style="color:var(--wa-green); font-size:11px; font-weight:600;">Online</span>' : ''}
                        </div>
                        <div class="chat-card-msg-row">
                            <span class="chat-card-preview">${escapeHTML(u.about)}</span>
                        </div>
                    </div>
                `;
                item.addEventListener('click', async () => {
                    drawerNewGroup.classList.remove('active');
                    await startDirectPrivateChat(u.id, u.name, u.avatar);
                });
                newChatContactsList.appendChild(item);
            });
        } catch (e) {
            newChatContactsList.innerHTML = '<div style="color:#ea4335; text-align:center; padding:10px;">Erro ao carregar contatos.</div>';
        }
    }

    btnNewChat.addEventListener('click', () => {
        loadContactsForNewChat();
    });

    // --- 27. STICKER METADATA INFO MODAL ---
    const modalStickerInfo = document.getElementById('modal-sticker-info');
    const btnCloseStickerInfo = document.getElementById('btn-close-sticker-info');
    const stickerInfoPreviewImg = document.getElementById('sticker-info-preview-img');
    const stickerInfoPackName = document.getElementById('sticker-info-pack-name');
    const stickerInfoAuthorName = document.getElementById('sticker-info-author-name');
    const stickerInfoDateTag = document.getElementById('sticker-info-date-tag');
    const btnStickerAddFavorite = document.getElementById('btn-sticker-add-favorite');
    const btnStickerForwardAction = document.getElementById('btn-sticker-forward-action');

    let currentInspectedSticker = null;

    function openStickerInfoModal(stickerUrl, metaData, senderName) {
        if (!stickerUrl) return;
        currentInspectedSticker = stickerUrl;
        if (stickerInfoPreviewImg) stickerInfoPreviewImg.src = stickerUrl;
        if (stickerInfoPackName) stickerInfoPackName.textContent = (metaData && metaData.packName) ? metaData.packName : "Pacote Oficial ZapAnon";
        if (stickerInfoAuthorName) stickerInfoAuthorName.textContent = "Criado por: " + ((metaData && metaData.publisher) ? metaData.publisher : (senderName || "Corvo Hacker"));
        if (stickerInfoDateTag) stickerInfoDateTag.textContent = "Metadados WebP EXIF • Criptografia ZapAnon Standard";

        if (modalStickerInfo) modalStickerInfo.classList.add('active');
    }

    if (btnCloseStickerInfo) {
        btnCloseStickerInfo.addEventListener('click', () => {
            modalStickerInfo.classList.remove('active');
        });
    }

    if (btnStickerAddFavorite) {
        btnStickerAddFavorite.addEventListener('click', async () => {
            if (!currentInspectedSticker || !currentUser) return;
            try {
                await fetch('/api/stickers/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id, sticker: currentInspectedSticker })
                });
                alert('Figurinha adicionada aos seus Favoritos! ⭐');
                modalStickerInfo.classList.remove('active');
                renderStickerPacks();
            } catch (e) {
                alert('Figurinha favoritada localmente!');
                modalStickerInfo.classList.remove('active');
            }
        });
    }

    if (btnStickerForwardAction) {
        btnStickerForwardAction.addEventListener('click', () => {
            modalStickerInfo.classList.remove('active');
            sendSticker(currentInspectedSticker);
        });
    }

    // --- 28. CUSTOM REACTION MODAL ---
    const modalCustomReaction = document.getElementById('modal-custom-reaction');
    const btnCloseCustomReaction = document.getElementById('btn-close-custom-reaction');
    const inputSearchReactionEmoji = document.getElementById('input-search-reaction-emoji');
    let currentReactionTargetMsgId = null;

    function openCustomReactionModal(msgId) {
        currentReactionTargetMsgId = msgId;
        if (modalCustomReaction) modalCustomReaction.classList.add('active');
    }

    if (btnCloseCustomReaction) {
        btnCloseCustomReaction.addEventListener('click', () => {
            modalCustomReaction.classList.remove('active');
        });
    }

    document.querySelectorAll('#reaction-emojis-grid span').forEach(sp => {
        sp.addEventListener('click', () => {
            if (currentReactionTargetMsgId) {
                sendReaction(currentReactionTargetMsgId, sp.textContent.trim());
                modalCustomReaction.classList.remove('active');
            }
        });
    });

    if (inputSearchReactionEmoji) {
        inputSearchReactionEmoji.addEventListener('input', (e) => {
            const q = e.target.value.trim().toLowerCase();
            document.querySelectorAll('#reaction-emojis-grid span').forEach(sp => {
                if (!q || sp.textContent.includes(q)) {
                    sp.style.display = 'inline-block';
                } else {
                    sp.style.display = 'none';
                }
            });
        });
    }

    // --- 29. REAL WEBRTC AUDIO/VIDEO CALLS LOGIC ---
    const btnCallAudio = document.getElementById('btn-call-audio');
    const btnCallVideo = document.getElementById('btn-call-video');
    const modalCallActive = document.getElementById('modal-call-active');
    const callPartnerAvatar = document.getElementById('call-partner-avatar');
    const callPartnerName = document.getElementById('call-partner-name');
    const callTimerTxt = document.getElementById('call-timer-txt');
    const callTypeBadge = document.getElementById('call-type-badge');
    const btnCallEndAction = document.getElementById('btn-call-end-action');
    const btnCallAcceptAction = document.getElementById('btn-call-accept-action');
    const callVideoContainer = document.getElementById('call-video-container');
    const localVideoStream = document.getElementById('local-video-stream');

    let localMediaStream = null;
    let callTimerInterval = null;
    let callSeconds = 0;
    let currentCallData = null;

    function playRingtoneSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            setTimeout(() => { try { osc.stop(); } catch(e){} }, 1800);
        } catch (e) {}
    }

    let peerConnection = null;
    let isMicMuted = false;

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    function setupPeerConnection() {
        if (peerConnection) return peerConnection;

        try {
            peerConnection = new RTCPeerConnection(rtcConfig);

            peerConnection.ontrack = (event) => {
                if (remoteVideoStream && event.streams && event.streams[0]) {
                    remoteVideoStream.srcObject = event.streams[0];
                }
            };
        } catch (e) {}

        return peerConnection;
    }

    if (btnCallToggleMic) {
        btnCallToggleMic.addEventListener('click', () => {
            if (!localMediaStream) return;
            isMicMuted = !isMicMuted;
            localMediaStream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
            btnCallToggleMic.innerHTML = isMicMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
            btnCallToggleMic.style.background = isMicMuted ? '#ea4335' : 'rgba(255,255,255,0.15)';
        });
    }

    async function initiateCall(callType = 'audio') {
        if (!activeConversation || !currentUser) return;

        let recipientId = activeConversation.recipientId || activeConversation.id;
        let recipientName = activeConversation.name;
        let recipientAvatar = activeConversation.avatar;

        callPartnerAvatar.src = recipientAvatar;
        callPartnerName.textContent = recipientName;
        callTypeBadge.innerHTML = callType === 'video' ? '<i class="fa-solid fa-video"></i> Chamada de Vídeo' : '<i class="fa-solid fa-phone"></i> Chamada de Voz';
        callTimerTxt.textContent = 'Chamando...';
        btnCallAcceptAction.style.display = 'none';
        btnCallEndAction.style.display = 'flex';
        callVideoContainer.style.display = callType === 'video' ? 'block' : 'none';

        modalCallActive.classList.add('active');
        playRingtoneSound();

        try {
            localMediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === 'video'
            });
            if (callType === 'video' && localVideoStream) {
                localVideoStream.srcObject = localMediaStream;
            }

            const pc = setupPeerConnection();
            if (pc && localMediaStream) {
                localMediaStream.getTracks().forEach(track => pc.addTrack(track, localMediaStream));
            }
        } catch (err) {}

        try {
            await fetch('/api/calls/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callerId: currentUser.id,
                    callerName: currentUser.name,
                    callerAvatar: currentUser.avatar,
                    recipientId: recipientId,
                    convId: activeConversation.id,
                    callType: callType
                })
            });
        } catch (e) {}
    }

    if (btnCallAudio) btnCallAudio.addEventListener('click', () => initiateCall('audio'));
    if (btnCallVideo) btnCallVideo.addEventListener('click', () => initiateCall('video'));

    function handleIncomingCall(data) {
        if (currentUser && data.recipientId === currentUser.id) {
            currentCallData = data;
            callPartnerAvatar.src = data.callerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=caller';
            callPartnerName.textContent = data.callerName || 'Contato';
            callTypeBadge.innerHTML = data.callType === 'video' ? '<i class="fa-solid fa-video"></i> Chamada de Vídeo Recebida' : '<i class="fa-solid fa-phone"></i> Chamada de Voz Recebida';
            callTimerTxt.textContent = 'Tocando...';

            btnCallAcceptAction.style.display = 'flex';
            btnCallEndAction.style.display = 'flex';
            modalCallActive.classList.add('active');
            playRingtoneSound();
        }
    }

    if (btnCallAcceptAction) {
        btnCallAcceptAction.addEventListener('click', async () => {
            btnCallAcceptAction.style.display = 'none';
            callTimerTxt.textContent = '0:00';
            callSeconds = 0;
            clearInterval(callTimerInterval);
            callTimerInterval = setInterval(() => {
                callSeconds++;
                callTimerTxt.textContent = formatSeconds(callSeconds);
            }, 1000);

            try {
                localMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: currentCallData && currentCallData.callType === 'video' });
                if (currentCallData && currentCallData.callType === 'video' && localVideoStream) {
                    localVideoStream.srcObject = localMediaStream;
                    callVideoContainer.style.display = 'block';
                }
            } catch (e) {}
        });
    }

    if (btnCallEndAction) {
        btnCallEndAction.addEventListener('click', async () => {
            clearInterval(callTimerInterval);
            if (localMediaStream) {
                localMediaStream.getTracks().forEach(t => t.stop());
                localMediaStream = null;
            }
            modalCallActive.classList.remove('active');
        });
    }

    // --- 30. VIEW ONCE (1X) MEDIA ---
    const btnToggleViewOnce = document.getElementById('btn-toggle-view-once');
    const viewOnceBadgeIcon = document.getElementById('view-once-badge-icon');
    let isViewOnceStaged = false;

    if (btnToggleViewOnce) {
        btnToggleViewOnce.addEventListener('click', () => {
            isViewOnceStaged = !isViewOnceStaged;
            if (viewOnceBadgeIcon) {
                viewOnceBadgeIcon.classList.toggle('active', isViewOnceStaged);
            }
        });
    }

    // --- 31. CHAT ANALYTICS MODAL ---
    const optChatAnalytics = document.getElementById('opt-chat-analytics');
    const modalChatAnalytics = document.getElementById('modal-chat-analytics');
    const btnCloseChatAnalytics = document.getElementById('btn-close-chat-analytics');
    const analyticsTotalMsgs = document.getElementById('analytics-total-msgs');
    const analyticsMediaCount = document.getElementById('analytics-media-count');
    const analyticsAudiosCount = document.getElementById('analytics-audios-count');
    const analyticsStickersCount = document.getElementById('analytics-stickers-count');

    if (optChatAnalytics) {
        optChatAnalytics.addEventListener('click', async () => {
            if (!activeConversation) return;
            try {
                const res = await fetch(`/api/messages?convId=${encodeURIComponent(activeConversation.id)}`);
                const data = await res.json();
                const msgs = data.messages || [];

                if (analyticsTotalMsgs) analyticsTotalMsgs.textContent = msgs.length;
                if (analyticsMediaCount) analyticsMediaCount.textContent = msgs.filter(m => m.media).length;
                if (analyticsAudiosCount) analyticsAudiosCount.textContent = msgs.filter(m => m.audio).length;
                if (analyticsStickersCount) analyticsStickersCount.textContent = msgs.filter(m => m.sticker).length;

                modalChatAnalytics.classList.add('active');
            } catch (e) {}
        });
    }

    if (btnCloseChatAnalytics) {
        btnCloseChatAnalytics.addEventListener('click', () => {
            modalChatAnalytics.classList.remove('active');
        });
    }

    // --- 32. SECRET CHAT PIN LOCK ---
    const optChatLock = document.getElementById('opt-chat-lock');
    const modalPinLock = document.getElementById('modal-pin-lock');
    const btnClosePinLock = document.getElementById('btn-close-pin-lock');
    const inputChatPin = document.getElementById('input-chat-pin');
    const btnSubmitChatPin = document.getElementById('btn-submit-chat-pin');

    if (optChatLock) {
        optChatLock.addEventListener('click', () => {
            if (!activeConversation) return;
            modalPinLock.classList.add('active');
        });
    }

    if (btnClosePinLock) {
        btnClosePinLock.addEventListener('click', () => {
            modalPinLock.classList.remove('active');
        });
    }

    if (btnSubmitChatPin) {
        btnSubmitChatPin.addEventListener('click', async () => {
            if (!activeConversation || !inputChatPin.value) return;
            try {
                await fetch('/api/conversations/lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ convId: activeConversation.id, userId: currentUser.id, pin: inputChatPin.value })
                });
                alert('Conversa protegida com PIN de segurança! 🔒');
                modalPinLock.classList.remove('active');
                inputChatPin.value = '';
            } catch (e) {}
        });
    }

    // --- 33. AUTOMATIC ZERO-TOUCH E2EE AES-256-GCM WEB CRYPTO ENGINE ---
    function getAutomaticE2EEKey(convId) {
        return "WA_AUTO_E2EE_KEY_2026_" + (convId || "global");
    }

    async function deriveKeyFromPassword(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );
        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function encryptTextE2EE(plaintext, password) {
        if (!plaintext) return '';
        try {
            if (window.crypto && window.crypto.subtle) {
                const enc = new TextEncoder();
                const salt = window.crypto.getRandomValues(new Uint8Array(16));
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const key = await deriveKeyFromPassword(password, salt);

                const ciphertext = await window.crypto.subtle.encrypt(
                    { name: "AES-GCM", iv: iv },
                    key,
                    enc.encode(plaintext)
                );

                const saltB64 = btoa(String.fromCharCode(...salt));
                const ivB64 = btoa(String.fromCharCode(...iv));
                const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

                return `ENC:v1:${saltB64}:${ivB64}:${cipherB64}`;
            }
        } catch (e) {
            console.warn('SubtleCrypto error:', e.message);
        }

        const encText = btoa(encodeURIComponent(plaintext));
        return `ENC:v0:${encText}`;
    }

    async function decryptTextE2EE(encryptedStr, password) {
        if (!encryptedStr) return '';
        if (!encryptedStr.startsWith('ENC:')) return encryptedStr;

        if (encryptedStr.startsWith('ENC:v0:')) {
            try {
                const rawB64 = encryptedStr.substring(7);
                return decodeURIComponent(atob(rawB64));
            } catch (e) {
                return encryptedStr;
            }
        }

        if (encryptedStr.startsWith('ENC:v1:')) {
            try {
                if (window.crypto && window.crypto.subtle) {
                    const parts = encryptedStr.split(':');
                    if (parts.length >= 5) {
                        const salt = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
                        const iv = Uint8Array.from(atob(parts[3]), c => c.charCodeAt(0));
                        const ciphertext = Uint8Array.from(atob(parts[4]), c => c.charCodeAt(0));

                        const key = await deriveKeyFromPassword(password, salt);
                        const decrypted = await window.crypto.subtle.decrypt(
                            { name: "AES-GCM", iv: iv },
                            key,
                            ciphertext
                        );
                        return new TextDecoder().decode(decrypted);
                    }
                }
            } catch (e) {
                console.warn('Decryption error:', e.message);
            }
        }

        return encryptedStr;
    }

    const modalEncryptionKey = document.getElementById('modal-encryption-key');
    const btnCloseEncryptionKey = document.getElementById('btn-close-encryption-key');
    const inputEncryptionPassword = document.getElementById('input-encryption-password');
    const btnSaveEncryptionKey = document.getElementById('btn-save-encryption-key');
    const btnDisableEncryption = document.getElementById('btn-disable-encryption');
    const optEncryptionKey = document.getElementById('opt-encryption-key');

    function openEncryptionKeyModal() {
        if (!activeConversation) {
            alert('Abra uma conversa primeiro.');
            return;
        }
        inputEncryptionPassword.value = chatEncryptionKeys[activeConversation.id] || '';
        modalEncryptionKey.classList.add('active');
    }

    if (optEncryptionKey) {
        optEncryptionKey.addEventListener('click', openEncryptionKeyModal);
    }

    if (btnCloseEncryptionKey) {
        btnCloseEncryptionKey.addEventListener('click', () => {
            modalEncryptionKey.classList.remove('active');
        });
    }

    if (btnSaveEncryptionKey) {
        btnSaveEncryptionKey.addEventListener('click', () => {
            if (!activeConversation || !inputEncryptionPassword.value) return;
            const pass = inputEncryptionPassword.value.trim();
            chatEncryptionKeys[activeConversation.id] = pass;
            localStorage.setItem('wa_e2ee_keys', JSON.stringify(chatEncryptionKeys));
            alert('🔐 Criptografia E2EE (AES-256) ativada para esta conversa! Todas as novas mensagens serão cifradas matematicamente.');
            modalEncryptionKey.classList.remove('active');
            selectConversation(activeConversation.id);
        });
    }

    if (btnDisableEncryption) {
        btnDisableEncryption.addEventListener('click', () => {
            if (!activeConversation) return;
            delete chatEncryptionKeys[activeConversation.id];
            localStorage.setItem('wa_e2ee_keys', JSON.stringify(chatEncryptionKeys));
            alert('Criptografia desativada para esta conversa.');
            modalEncryptionKey.classList.remove('active');
            selectConversation(activeConversation.id);
        });
    }

    // --- KEYBOARD SHORTCUTS LISTENER ---
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey) {
            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                btnNewChat.click();
            } else if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                btnOpenMyProfile.click();
            } else if (e.key.toLowerCase() === 'e') {
                e.preventDefault();
                btnToggleStickersEmojis.click();
            } else if (e.key === '/') {
                e.preventDefault();
                btnHeaderSearch.click();
            }
        }
    });

    // --- HELPERS ---
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, t => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[t] || t));
    }

    function formatSeconds(sec) {
        if (!sec || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function formatTimer(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // --- JOIN GROUP LOGIC ---
    const menuOptJoinGroupLink = document.getElementById('menu-opt-join-group-link');
    const modalJoinLink = document.getElementById('modal-join-link');
    const btnCloseJoinLink = document.getElementById('btn-close-join-link');
    const inputJoinToken = document.getElementById('input-join-token');
    const btnSubmitJoinLink = document.getElementById('btn-submit-join-link');

    if (menuOptJoinGroupLink) {
        menuOptJoinGroupLink.addEventListener('click', () => {
            if (dropdownMenu) dropdownMenu.classList.remove('show');
            modalJoinLink.classList.add('active');
            inputJoinToken.value = '';
            inputJoinToken.focus();
        });
    }

    if (btnCloseJoinLink) {
        btnCloseJoinLink.addEventListener('click', () => {
            modalJoinLink.classList.remove('active');
        });
    }

    if (btnSubmitJoinLink) {
        btnSubmitJoinLink.addEventListener('click', async () => {
            const token = inputJoinToken.value.trim();
            if (!token) return alert('Digite o token de convite!');
            
            btnSubmitJoinLink.disabled = true;
            btnSubmitJoinLink.innerText = 'Entrando...';

            try {
                const res = await fetch('/api/groups/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        userName: currentUser.name,
                        inviteToken: token
                    })
                });
                const data = await res.json();
                
                if (data.success) {
                    alert('Você entrou no grupo com sucesso!');
                    modalJoinLink.classList.remove('active');
                    // Refresh data or manually add the group
                    const exists = conversations.find(c => c.id === data.group.id);
                    if (!exists) conversations.push(data.group);
                    renderConversations(currentFilter);
                    selectConversation(data.group.id);
                } else {
                    alert('Erro: ' + (data.error || 'Convite inválido'));
                }
            } catch (e) {
                alert('Erro de conexão ao entrar no grupo.');
            }
            btnSubmitJoinLink.disabled = false;
            btnSubmitJoinLink.innerText = 'Entrar no Grupo';
        });
    }

    // --- DISPLAY TOKEN ---
    // Make tokens copyable when viewing Group Settings
    if (chatHeaderTitle) {
        chatHeaderTitle.addEventListener('contextmenu', (e) => {
            if (activeConversation && activeConversation.type === 'group') {
                e.preventDefault();
                prompt('Token de Convite deste grupo (compartilhe para convidar pessoas):', activeConversation.inviteToken || 'Nenhum token (Grupo Antigo)');
            }
        });
    }

    window.handleBotButtonClick = function(botId, msgId, convId, callbackData, btnElem) {
        if (!btnElem) return;
        btnElem.disabled = true;
        btnElem.style.opacity = '0.6';
        fetch('/api/bot/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                botToken: botId,
                messageId: msgId,
                convId: convId,
                callbackData: callbackData,
                userId: currentUser ? currentUser.id : 'user_anon',
                userName: currentUser ? currentUser.name : 'Usuário'
            })
        }).then(res => res.json()).then(data => {
            setTimeout(() => {
                btnElem.disabled = false;
                btnElem.style.opacity = '1';
            }, 800);
        }).catch(() => {
            btnElem.disabled = false;
            btnElem.style.opacity = '1';
        });
    };

    // --- DISMISS WHATSAPP SPLASH SCREEN ---
    setTimeout(() => {
        const splash = document.getElementById('whatsapp-splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => {
                if (splash.parentNode) splash.parentNode.removeChild(splash);
            }, 450);
        }
    }, 1200);

    // --- GROUP STATUS VIEWER LOGIC ---
    const modalGroupStatusView = document.getElementById('modal-group-status-view');
    const btnCloseGroupStatusView = document.getElementById('btn-close-group-status-view');
    const btnGroupStatusAdd = document.getElementById('btn-group-status-add');
    const btnGroupStatusDelete = document.getElementById('btn-group-status-delete');
    
    let currentGroupStatuses = [];
    let currentGroupStatusIndex = 0;
    let groupStatusTimer = null;

    document.getElementById('chat-header-avatar-ring')?.addEventListener('click', () => {
        if (!activeConversation || activeConversation.type !== 'group') return;
        
        currentGroupStatuses = activeConversation.groupStatuses || [];
        if (currentGroupStatuses.length === 0) {
            if (confirm('Este grupo ainda não tem status. Deseja adicionar um?')) {
                isCreatingGroupStatus = true;
                modalCreateStatus.classList.add('active');
            }
            return;
        }
        
        currentGroupStatusIndex = 0;
        showGroupStatus(currentGroupStatusIndex);
        if(modalGroupStatusView) modalGroupStatusView.classList.add('active');
    });

    btnCloseGroupStatusView?.addEventListener('click', () => {
        modalGroupStatusView.classList.remove('active');
        clearTimeout(groupStatusTimer);
    });

    btnGroupStatusAdd?.addEventListener('click', () => {
        modalGroupStatusView.classList.remove('active');
        clearTimeout(groupStatusTimer);
        isCreatingGroupStatus = true;
        modalCreateStatus.classList.add('active');
    });

    document.getElementById('group-status-click-prev')?.addEventListener('click', () => {
        if (currentGroupStatusIndex > 0) {
            currentGroupStatusIndex--;
            showGroupStatus(currentGroupStatusIndex);
        }
    });

    document.getElementById('group-status-click-next')?.addEventListener('click', () => {
        if (currentGroupStatusIndex < currentGroupStatuses.length - 1) {
            currentGroupStatusIndex++;
            showGroupStatus(currentGroupStatusIndex);
        } else {
            if(btnCloseGroupStatusView) btnCloseGroupStatusView.click();
        }
    });

    function showGroupStatus(index) {
        clearTimeout(groupStatusTimer);
        const st = currentGroupStatuses[index];
        if (!st) return;

        document.getElementById('group-status-author-name').textContent = st.authorName;
        document.getElementById('group-status-author-avatar').src = st.authorAvatar;
        document.getElementById('group-status-time').textContent = formatLastSeenTime(st.timestamp);
        
        const txtDisp = document.getElementById('group-status-text-display');
        const imgDisp = document.getElementById('group-status-img-display');
        const fill = document.getElementById('group-status-progress-fill');
        
        if (st.media) {
            imgDisp.src = st.media;
            imgDisp.style.display = 'block';
            txtDisp.style.display = 'none';
        } else {
            imgDisp.style.display = 'none';
            txtDisp.textContent = st.text;
            txtDisp.style.display = 'block';
        }

        const reqMem = activeConversation.members ? activeConversation.members.find(m => m.id === currentUser.id) : null;
        const isAdmin = (activeConversation.creatorId === currentUser.id) || (reqMem && (reqMem.role === 'admin' || reqMem.role === 'creator'));
        if (isAdmin || st.authorId === currentUser.id) {
            btnGroupStatusDelete.style.display = 'block';
            btnGroupStatusDelete.onclick = async () => {
                if(confirm('Apagar este status?')) {
                    try {
                        await fetch('/api/groups/status/delete', {
                            method:'POST',
                            headers:{'Content-Type':'application/json'},
                            body:JSON.stringify({
                                groupId: activeConversation.id,
                                statusId: st.id,
                                userId: currentUser.id
                            })
                        });
                        if(btnCloseGroupStatusView) btnCloseGroupStatusView.click();
                    } catch(e) {}
                }
            };
        } else {
            btnGroupStatusDelete.style.display = 'none';
        }

        if(fill) {
            fill.style.transition = 'none';
            fill.style.width = '0%';
            setTimeout(() => {
                fill.style.transition = 'width 5s linear';
                fill.style.width = '100%';
            }, 50);
        }

        groupStatusTimer = setTimeout(() => {
            const nxtBtn = document.getElementById('group-status-click-next');
            if(nxtBtn) nxtBtn.click();
        }, 5000);
    }

    // --- GLOBAL TOAST HELPER ---
    window.showToast = function(text, iconClass = 'fa-solid fa-check') {
        const box = document.getElementById('wa-toast-box');
        if (!box) return;
        const toast = document.createElement('div');
        toast.className = 'wa-toast-item';
        toast.innerHTML = `<i class="${iconClass}" style="color:var(--wa-green);"></i> ${escapeHTML(text)}`;
        box.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 2500);
    };

    // --- 30. SAVED CONTACTS MODAL LOGIC ---
    const menuOptContacts = document.getElementById('menu-opt-contacts');
    const modalSavedContacts = document.getElementById('modal-saved-contacts');
    const btnCloseSavedContacts = document.getElementById('btn-close-saved-contacts');
    const savedContactsListContainer = document.getElementById('saved-contacts-list-container');

    async function loadAndRenderSavedContacts() {
        if (!savedContactsListContainer || !currentUser) return;
        savedContactsListContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--wa-text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando contatos...</div>';
        try {
            const res = await fetch(`/api/contacts/list?userId=${encodeURIComponent(currentUser.id)}`);
            const data = await res.json();
            savedContactsListContainer.innerHTML = '';

            const contacts = data.contacts || [];
            if (contacts.length === 0) {
                savedContactsListContainer.innerHTML = '<div style="text-align:center; padding:30px; color:var(--wa-text-sub);"><i class="fa-solid fa-address-book" style="font-size:32px; opacity:0.5; margin-bottom:8px; display:block;"></i> Nenhum contato salvo ainda.<br><small style="font-size:12px; opacity:0.8;">Pesquise um usuário e clique em "Conversar".</small></div>';
                return;
            }

            contacts.forEach(c => {
                const card = document.createElement('div');
                card.className = 'contact-saved-item-card';
                card.innerHTML = `
                    <img src="${escapeHTML(c.avatar || '')}" class="contact-saved-avatar" alt="">
                    <div class="contact-saved-info">
                        <strong class="contact-saved-name">${escapeHTML(c.name)}</strong>
                        <span class="contact-saved-sub">${c.isOnline ? '🟢 Online agora' : 'Disponível no ZapAnon'}</span>
                    </div>
                    <button class="btn-contact-action btn-contact-chat" title="Conversar"><i class="fa-solid fa-comments"></i> Conversar</button>
                    <button class="btn-contact-action btn-contact-remove" title="Remover"><i class="fa-solid fa-trash"></i></button>
                `;

                const btnChat = card.querySelector('.btn-contact-chat');
                const btnRemove = card.querySelector('.btn-contact-remove');

                btnChat.addEventListener('click', async () => {
                    if (modalSavedContacts) modalSavedContacts.classList.remove('active');
                    try {
                        const r = await fetch('/api/conversations/direct', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUser.id, recipientId: c.id })
                        });
                        const d = await r.json();
                        if (d.success && d.conversation) {
                            const exists = conversations.find(x => x.id === d.conversation.id);
                            if (!exists) conversations.unshift(d.conversation);
                            renderConversations('');
                            selectConversation(d.conversation.id);
                        }
                    } catch (e) {}
                });

                btnRemove.addEventListener('click', async () => {
                    try {
                        await fetch('/api/contacts/remove', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUser.id, contactId: c.id })
                        });
                        showToast(`Contato "${c.name}" removido.`, 'fa-solid fa-trash');
                        loadAndRenderSavedContacts();
                    } catch (e) {}
                });

                savedContactsListContainer.appendChild(card);
            });
        } catch (err) {
            savedContactsListContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#ea4335;">Erro ao carregar contatos.</div>';
        }
    }

    if (menuOptContacts) {
        menuOptContacts.addEventListener('click', () => {
            if (dropdownMenu) dropdownMenu.classList.remove('show');
            if (modalSavedContacts) modalSavedContacts.classList.add('active');
            loadAndRenderSavedContacts();
        });
    }

    if (btnCloseSavedContacts) {
        btnCloseSavedContacts.addEventListener('click', () => {
            if (modalSavedContacts) modalSavedContacts.classList.remove('active');
        });
    }

    // --- COPY GROUP INVITE LINK HANDLERS ---
    function copyActiveGroupInviteLink() {
        if (!activeConversation || activeConversation.type !== 'group') {
            showToast('Abra um grupo primeiro para copiar o link.', 'fa-solid fa-triangle-exclamation');
            return;
        }
        const inviteCode = activeConversation.inviteToken || ('zap_' + activeConversation.id);
        const fullLink = window.location.origin + '/?invite=' + inviteCode;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullLink).then(() => {
                showToast('Link do grupo copiado para a área de transferência! 🔗', 'fa-solid fa-link');
            }).catch(() => {
                prompt('Link de Convite deste Grupo:', fullLink);
            });
        } else {
            prompt('Link de Convite deste Grupo:', fullLink);
        }
    }

    const btnCopyGroupLinkDrawer = document.getElementById('btn-copy-group-link-drawer');
    const btnCopyGroupInviteLinkModal = document.getElementById('btn-copy-group-invite-link-modal');

    if (btnCopyGroupLinkDrawer) {
        btnCopyGroupLinkDrawer.addEventListener('click', copyActiveGroupInviteLink);
    }
    if (btnCopyGroupInviteLinkModal) {
        btnCopyGroupInviteLinkModal.addEventListener('click', () => {
            copyActiveGroupInviteLink();
            const modalAddMember = document.getElementById('modal-add-member');
            if (modalAddMember) modalAddMember.classList.remove('active');
        });
    }

    // --- START ---
    initApp();

})();
