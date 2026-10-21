// LarpBlox - Config bridge (isolated world -> MAIN world hook)

const LARP_KEYS = [
    'fakeRobux', 'inventory', 'equipped', 'transactions',
    'larpDisplayName', 'larpUsername', 'larpFollowers', 'larpFollowing',
    'larpFriends', 'larpBio', 'larpTarget', 'larpBodyColors', 'uiMode'
];

function larpBuildConfig(r) {
    const inv = r.inventory || [];
    const target = r.larpTarget || null;
    const targetActive = !!(target && r.larpId && String(r.larpId) === String(target.id));

    return {
        enabled: r.uiMode !== 'off',
        myId: state.realUserId || null,
        robux: r.fakeRobux ?? null,
        displayName: r.larpDisplayName || '',
        username: r.larpUsername || '',
        bio: r.larpBio ?? null,
        followers: r.larpFollowers ?? null,
        following: r.larpFollowing ?? null,
        friends: r.larpFriends ?? null,
        equippedIds: targetActive ? [] : inv.filter((i) => i.equipped && i.assetId).map((i) => Number(i.assetId)),
        bodyColors: r.larpBodyColors || null,
        transactions: r.transactions || [],
        inventory: inv,
        avatarUrl: window.__larpAvatarUrl || null,
        headshotUrl: (target && target.headshot) || null,
        bustUrl: (target && target.bust) || null,

        replaceAssets: targetActive,
        targetAssets: targetActive ? ((target.avatar && target.avatar.assets) || []) : [],
        targetBodyColors: targetActive ? ((target.avatar && target.avatar.bodyColors) || null) : null,
        targetScales: targetActive ? ((target.avatar && target.avatar.scales) || null) : null,
        targetAvatarType: targetActive ? ((target.avatar && target.avatar.playerAvatarType) || null) : null
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