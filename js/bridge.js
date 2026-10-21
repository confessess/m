// LarpBlox - Config bridge (isolated world -> MAIN world hook)

const LARP_KEYS = [
    'fakeRobux', 'inventory', 'equipped', 'transactions',
    'larpDisplayName', 'larpUsername', 'larpFollowers', 'larpFollowing',
    'larpFriends', 'larpBio', 'larpTarget', 'larpId', 'larpBodyColors', 'uiMode'
];

function larpBuildConfig(r) {
    const inv = r.inventory || [];
    const t = r.larpTarget || null;
    const on = !!(t && r.larpId && String(r.larpId) === String(t.id));

    return {
        enabled: r.uiMode !== 'off',
        myId: state.realUserId || null,
        robux: r.fakeRobux ?? null,
        displayName: r.larpDisplayName || '',
        username: r.larpUsername || '',
        bio: r.larpBio ?? null,
        created: (t && t.created) || null,
        hasVerifiedBadge: t ? !!t.hasVerifiedBadge : null,
        premium: t && t.premium != null ? !!t.premium : null,
        followers: r.larpFollowers ?? null,
        following: r.larpFollowing ?? null,
        friends: r.larpFriends ?? null,
        equippedIds: on ? [] : inv.filter((i) => i.equipped && i.assetId).map((i) => Number(i.assetId)),
        bodyColors: r.larpBodyColors || null,
        transactions: r.transactions || [],
        inventory: inv,
        avatarUrl: window.__larpAvatarUrl || null,
        headshotUrl: (t && t.headshot) || null,
        bustUrl: (t && t.bust) || null,

        replaceAssets: on,
        targetAssets: on ? ((t.avatar && t.avatar.assets) || []) : [],
        targetBodyColors: on ? ((t.avatar && t.avatar.bodyColors) || null) : null,
        targetScales: on ? ((t.avatar && t.avatar.scales) || null) : null,
        targetAvatarType: on ? ((t.avatar && t.avatar.playerAvatarType) || null) : null,

        badges: (t && t.badges) || null,
        socialLinks: (t && t.socialLinks) || null,
        primaryGroup: (t && t.primaryGroup) || null,
        usernameHistory: (t && t.usernameHistory) || null,
        presence: (t && t.presence) || null,
        targetFriends: (t && t.friends) || null
    };
}

function pushConfig() {
    chrome.storage.local.get(LARP_KEYS, (r) => {
        const cfg = larpBuildConfig(r);
        try { localStorage.setItem('__larp_cfg', JSON.stringify(cfg)); } catch (e) { }
        window.postMessage({ __larp: true, type: 'LARP_CONFIG', payload: cfg }, '*');
    });
}

async function resolveMyId() {
    if (state.realUserId) return state.realUserId;
    const meta = document.querySelector('meta[name="user-data"]');
    if (meta && meta.dataset && meta.dataset.userid) {
        state.realUserId = meta.dataset.userid;
        return state.realUserId;
    }
    try {
        const r = await fetch('https://users.roblox.com/v1/users/authenticated', { credentials: 'include' });
        state.realUserId = (await r.json()).id;
    } catch (e) { }
    return state.realUserId;
}