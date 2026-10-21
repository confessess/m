// LarpBlox - Content Script Bootstrap

chrome.storage.local.get(
    ['fakeRobux', 'setFakeRobux', 'inventory', 'history', 'equipped', 'larpId',
     'larpBodyColors', 'transactions', 'larpDisplayName', 'larpUsername',
     'larpFollowers', 'larpBio', 'larpTarget', 'uiMode'],
    (result) => {
        if (result.fakeRobux !== undefined) state.fakeRobux = result.fakeRobux;
        if (result.setFakeRobux !== undefined) state.setFakeRobux = result.setFakeRobux;
        else state.setFakeRobux = state.fakeRobux;
        if (result.inventory !== undefined) state.inventory = result.inventory;
        if (result.history !== undefined) state.history = result.history;
        if (result.transactions !== undefined) state.transactions = result.transactions;
        if (result.equipped !== undefined) state.equipped = result.equipped;
        if (result.larpId !== undefined) state.larpId = result.larpId;
        if (result.larpBodyColors !== undefined) window._larpCustomBodyColors = result.larpBodyColors;
        if (result.larpDisplayName !== undefined) state.larpDisplayName = result.larpDisplayName;
        if (result.larpUsername !== undefined) state.larpUsername = result.larpUsername;
        if (result.larpFollowers !== undefined) state.larpFollowers = result.larpFollowers;
        if (result.larpBio !== undefined) state.larpBio = result.larpBio;
        if (result.larpTarget !== undefined) state.larpTarget = result.larpTarget;
        if (result.uiMode !== undefined) state.uiMode = result.uiMode;

        pushConfig();
        resolveMyId().then(pushConfig);

        applyGlobalStyles();

        const fullRefresh = () => {
            updateRobuxElements();
            handleBuyButton();
            handleOwnedStatus();
            handleAvatarLarping();
            handleInventoryInjection();
            handleNameChanges();
            handleFollowerChanges();
            handleLarpTarget();
            handleBioChanges();
        };

        fullRefresh();
        setInterval(fullRefresh, 600);

        const observer = new MutationObserver((mutations) => {
            if (!mutations.some((m) => m.addedNodes.length > 0)) return;
            updateRobuxElements();
            handleBuyButton();
            handleOwnedStatus();
            handleNameChanges();
            handleFollowerChanges();
        });
        if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    }
);

chrome.storage.onChanged.addListener((changes) => {
    if (changes.fakeRobux) state.fakeRobux = changes.fakeRobux.newValue;
    if (changes.inventory) state.inventory = changes.inventory.newValue;
    if (changes.history) state.history = changes.history.newValue;
    if (changes.transactions) state.transactions = changes.transactions.newValue;
    if (changes.equipped) state.equipped = changes.equipped.newValue;
    if (changes.uiMode) state.uiMode = changes.uiMode.newValue;

    if (changes.larpId) {
        state.larpId = changes.larpId.newValue;
        window._larpComboKey = null;
        window._larpRenderCache = null;
        if (typeof window.clearRenderCache === 'function') window.clearRenderCache();
    }
    if (changes.larpBodyColors) {
        window._larpCustomBodyColors = changes.larpBodyColors.newValue;
        window._larpComboKey = null;
        window._larpRenderCache = null;
        if (typeof window.clearRenderCache === 'function') window.clearRenderCache();
        if (typeof window.clearAvatarBaseCache === 'function') window.clearAvatarBaseCache();
    }
    if (changes.larpDisplayName) state.larpDisplayName = changes.larpDisplayName.newValue;
    if (changes.larpUsername) state.larpUsername = changes.larpUsername.newValue;
    if (changes.larpFollowers) state.larpFollowers = changes.larpFollowers.newValue;
    if (changes.larpBio) state.larpBio = changes.larpBio.newValue;
    if (changes.larpTarget) {
        state.larpTarget = changes.larpTarget.newValue;
        resetLarpTargetCaches();
        window._larpComboKey = null;
        window._larpRenderCache = null;
        if (typeof window.clearRenderCache === 'function') window.clearRenderCache();
    }

    pushConfig();
    updateRobuxElements();
    handleAvatarLarping();
    handleNameChanges();
    handleFollowerChanges();
    handleLarpTarget();
    handleBioChanges();
});

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'LARP_BODY_COLORS_UPDATED') {
        if (!event.data.colors) return;
        window._larpCustomBodyColors = event.data.colors;
        chrome.storage.local.set({ larpBodyColors: event.data.colors });
        if (typeof window.clearRenderCache === 'function') window.clearRenderCache();
        if (typeof window.clearAvatarBaseCache === 'function') window.clearAvatarBaseCache();
        window._larpComboKey = null;
        window._larpRenderCache = null;
        pushConfig();
        handleAvatarLarping();
    }
});