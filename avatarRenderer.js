/**
 * avatarRenderer.js — renders a 2D avatar via avatar.roblox.com/v1/avatar/render
 */

const RENDER_ENDPOINT = 'https://avatar.roblox.com/v1/avatar/render';
const AVATAR_ENDPOINT = 'https://avatar.roblox.com/v1/users/{userId}/avatar';
const AUTH_ENDPOINT = 'https://users.roblox.com/v1/users/authenticated';

const POLL_INTERVAL_MS = 800;
const POLL_MAX_TRIES = 30;

let activeAbortController = null;
const avatarBaseCache = new Map();
const renderCache = new Map();

const sleep = (ms, signal) =>
    new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); });
    });

async function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    const res = await fetch('https://auth.roblox.com/v2/logout', { method: 'POST', credentials: 'include' });
    const token = res.headers.get('x-csrf-token');
    if (token) return token;
    throw new Error('Could not obtain CSRF token — are you logged into Roblox?');
}

async function fetchAvatarBase(userId) {
    if (avatarBaseCache.has(userId)) return avatarBaseCache.get(userId);
    const res = await fetch(AVATAR_ENDPOINT.replace('{userId}', userId), { credentials: 'include' });
    if (!res.ok) throw new Error(`Avatar fetch failed: ${res.status}`);
    const data = await res.json();
    avatarBaseCache.set(userId, data);
    return data;
}

function clearAvatarBaseCache(userId) {
    if (userId) avatarBaseCache.delete(userId);
    else avatarBaseCache.clear();
}
window.clearAvatarBaseCache = clearAvatarBaseCache;

const BRICK_COLOR_HEX = {
    1: '#f2f3f3', 2: '#a1a5a2', 3: '#f9e999', 5: '#d7c59a',
    6: '#c2dab8', 9: '#e8bac8', 11: '#80bbe3', 12: '#cb8442',
    18: '#cc8e69', 21: '#c4281c', 22: '#c470a0', 23: '#0d69ac',
    24: '#f5cd30', 25: '#624732', 26: '#1b2a35', 27: '#6d6e6c',
    28: '#287f47', 29: '#a1c48c', 36: '#f3cf9b', 37: '#4b974b',
    38: '#a05f35', 39: '#c1cade', 40: '#ececec', 41: '#cd544b',
    42: '#c1dff0', 43: '#7bb6e8', 44: '#f7f17d', 45: '#b4d2e4',
    47: '#d9856c', 48: '#84b68d', 49: '#f8f184', 50: '#ece8de',
    100: '#eec4b6', 101: '#da867a', 102: '#6e99ca', 103: '#c7c1b7',
    104: '#6b327c', 105: '#e29b40', 106: '#da8541', 107: '#008f9c',
    108: '#685c43', 110: '#435493', 111: '#bfb7b1', 112: '#6874ac',
    113: '#e5adc8', 115: '#c7d23c', 116: '#55a5af', 118: '#b7d7d5',
    119: '#a4bd47', 120: '#d9e4a7', 121: '#e7ac58', 123: '#d36f4c',
    124: '#923974', 125: '#eab896', 126: '#a5a5cb', 127: '#dcbc0a',
    128: '#ae7a59', 131: '#9ca3a8', 133: '#d5733d', 134: '#d8dd56',
    135: '#74869d', 136: '#877c90', 137: '#e09864', 138: '#958a73',
    140: '#203a56', 141: '#27462d', 143: '#cfe2f7', 145: '#79889f',
    146: '#958ea3', 147: '#938367', 148: '#575857', 149: '#161d32',
    150: '#ababac', 151: '#789182', 153: '#957577', 154: '#7b2e2f',
    157: '#fff67b', 158: '#e1a4c2', 168: '#756a62', 176: '#976b5b',
    178: '#b48455', 179: '#898788', 180: '#d7a94b', 190: '#f9d62e',
    191: '#e8ab2d', 192: '#694028', 193: '#cf6024', 194: '#a3a2a5',
    195: '#4667a4', 196: '#23478b', 198: '#8e4285', 199: '#635f62',
    200: '#828d5d', 208: '#e5e4df', 209: '#b08e44', 210: '#709178',
    211: '#79b5b5', 212: '#9fc3e9', 213: '#6c81b7', 216: '#904c2a',
    217: '#7c5c46', 218: '#96709f', 219: '#6b629b', 220: '#a7a9ce',
    221: '#cd6298', 222: '#e4adc8', 223: '#dc9095', 224: '#f0d5a0',
    225: '#ebb87f', 226: '#fdea8d', 232: '#7dbbc3', 268: '#342b75',
    301: '#506d54', 302: '#5b5d69', 303: '#0010b0', 304: '#2c651d',
    305: '#527cae', 306: '#335882', 307: '#102adc', 308: '#3d1585',
    309: '#348040', 310: '#5b9a4c', 311: '#9fa1ac', 312: '#592259',
    313: '#1f801d', 314: '#9fadc0', 315: '#0989cf', 316: '#7b007b',
    317: '#7c9c6b', 318: '#8aab85', 319: '#b9c4b1', 320: '#cacbd1',
    321: '#a75e9b', 322: '#7b2f7b', 323: '#94be81', 324: '#a8bd99',
    325: '#dfdfde', 327: '#970000', 328: '#b1e5a6', 329: '#98c2db',
    330: '#ff98dc', 331: '#ff5959', 332: '#750000', 333: '#efb838',
    334: '#f8d96d', 335: '#e7e7ec', 336: '#c7d4e4', 337: '#ff9494',
    338: '#be6862', 339: '#562424', 340: '#f1e7c7', 341: '#fef3bb',
    342: '#e0b2d0', 343: '#d490bd', 344: '#965555', 345: '#8f4c2a',
    346: '#d3be96', 347: '#e2dcbc', 348: '#edeeea', 349: '#e9dada',
    350: '#883e3e', 351: '#bc9b5d', 352: '#c7ac78', 353: '#cabfa3',
    354: '#bbb3b2', 355: '#6c5844', 356: '#a0844f', 357: '#958988',
    358: '#aba89e', 359: '#af9483', 360: '#966666', 361: '#564236',
    362: '#7e683f', 363: '#69665c', 364: '#5a4c42', 365: '#6a3909',
    1001: '#f8f8f8', 1002: '#cdcdcd', 1003: '#111111', 1004: '#ff0000',
    1005: '#ffb000', 1006: '#b480ff', 1007: '#a34b4b', 1008: '#c1be42',
    1009: '#ffff00', 1010: '#0000ff', 1011: '#002060', 1012: '#2154b9',
    1013: '#04afec', 1014: '#aa5500', 1015: '#aa00aa', 1016: '#ff66cc',
    1017: '#ffaf00', 1018: '#12eed4', 1019: '#00ffff', 1020: '#00ff00',
    1021: '#3a7d15', 1022: '#7f8e64', 1023: '#8c5b9f', 1024: '#afdcff',
    1025: '#ffc9c9', 1026: '#b1a7ff', 1027: '#9ff3e9', 1028: '#ccffcc',
    1029: '#ffffcc', 1030: '#ffcc99', 1031: '#6225d1', 1032: '#ff00bf',
};

function toHex(value) {
    if (!value && value !== 0) return '#f5cda3';
    if (typeof value === 'string' && value.startsWith('#')) return value;
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
        return BRICK_COLOR_HEX[Number(value)] ?? '#f5cda3';
    }
    return String(value);
}

function convertBodyColors(bodyColors) {
    if (!bodyColors) return {
        headColor: '#f5cda3', torsoColor: '#f5cda3', rightArmColor: '#f5cda3',
        leftArmColor: '#f5cda3', rightLegColor: '#f5cda3', leftLegColor: '#f5cda3',
    };
    return {
        headColor: toHex(bodyColors.headColor ?? bodyColors.headColorId),
        torsoColor: toHex(bodyColors.torsoColor ?? bodyColors.torsoColorId),
        rightArmColor: toHex(bodyColors.rightArmColor ?? bodyColors.rightArmColorId),
        leftArmColor: toHex(bodyColors.leftArmColor ?? bodyColors.leftArmColorId),
        rightLegColor: toHex(bodyColors.rightLegColor ?? bodyColors.rightLegColorId),
        leftLegColor: toHex(bodyColors.leftLegColor ?? bodyColors.leftLegColorId),
    };
}

function buildAvatarDefinition(base, larpIds, { replaceWornItems = false } = {}) {
    const baseAssets = replaceWornItems ? [] : (base.assets || []).map(a => ({ id: a.id }));
    return {
        scales: {
            head: base.scales?.head ?? 1,
            height: base.scales?.height ?? 1,
            bodyType: base.scales?.bodyType ?? 0,
            width: base.scales?.width ?? 1,
            depth: base.scales?.depth ?? 1,
            proportion: base.scales?.proportion ?? 0,
        },
        bodyColors: convertBodyColors(base.bodyColors),
        playerAvatarType: { playerAvatarType: base.playerAvatarType ?? 'R15' },
        assets: [...baseAssets, ...larpIds.map(id => ({ id }))],
    };
}

function makeCacheKey(userId, assetIds, replaceWornItems, bodyColors) {
    const colorStr = bodyColors ? Object.values(bodyColors).join(',') : '';
    return userId + '|' + [...assetIds].sort().join(',') + '|' + colorStr + (replaceWornItems ? ':replace' : '');
}

async function postRenderAndPoll(avatarDefinition, size, signal) {
    let csrf = await getCsrfToken();

    const bodyJson = JSON.stringify({
        thumbnailConfig: { thumbnailId: 1, size, thumbnailType: '2d' },
        avatarDefinition,
        _cacheBust: Date.now(),
    });

    const doPost = (token) => fetch(RENDER_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
        body: bodyJson,
        signal,
    });

    let res = await doPost(csrf);

    if (res.status === 403) {
        csrf = res.headers.get('x-csrf-token') ?? csrf;
        res = await doPost(csrf);
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Render POST failed ${res.status}: ${err?.errors?.[0]?.message ?? res.statusText}`);
    }

    const initial = await res.json();
    if (initial.state === 'Completed' && initial.imageUrl) return initial.imageUrl;
    if (initial.state === 'Error') throw new Error('Roblox render failed immediately');

    for (let i = 0; i < POLL_MAX_TRIES; i++) {
        await sleep(POLL_INTERVAL_MS, signal);
        const pollRes = await doPost(csrf);
        if (!pollRes.ok) continue;
        const data = await pollRes.json();
        if (data.state === 'Completed' && data.imageUrl) return data.imageUrl;
        if (data.state === 'Error') throw new Error('Roblox render failed server-side');
    }

    throw new Error('Render timed out — try again');
}

async function renderAvatarWithItems({
    userId, assetIds, size = '420x420',
    replaceWornItems = false, bodyColors = null, onStateChange = null,
}) {
    if (activeAbortController) activeAbortController.abort();
    const controller = new AbortController();
    activeAbortController = controller;
    const { signal } = controller;
    const notify = (s, msg) => { if (!signal.aborted) onStateChange?.(s, msg); };

    try {
        const cacheKey = makeCacheKey(userId, assetIds, replaceWornItems, bodyColors);
        if (renderCache.has(cacheKey)) {
            const cached = renderCache.get(cacheKey);
            notify('done', cached);
            return cached;
        }

        if (bodyColors) clearAvatarBaseCache(userId);

        const base = await fetchAvatarBase(userId);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const convertedOverride = bodyColors ? {
            headColor: toHex(bodyColors.headColor ?? bodyColors.headColorId),
            torsoColor: toHex(bodyColors.torsoColor ?? bodyColors.torsoColorId),
            rightArmColor: toHex(bodyColors.rightArmColor ?? bodyColors.rightArmColorId),
            leftArmColor: toHex(bodyColors.leftArmColor ?? bodyColors.leftArmColorId),
            rightLegColor: toHex(bodyColors.rightLegColor ?? bodyColors.rightLegColorId),
            leftLegColor: toHex(bodyColors.leftLegColor ?? bodyColors.leftLegColorId),
        } : null;

        const mergedBase = convertedOverride
            ? { ...base, bodyColors: { ...base.bodyColors, ...convertedOverride } }
            : base;

        const definition = buildAvatarDefinition(mergedBase, assetIds, { replaceWornItems });
        const imageUrl = await postRenderAndPoll(definition, size, signal);

        renderCache.set(cacheKey, imageUrl);
        notify('done', imageUrl);
        return imageUrl;
    } catch (err) {
        if (err.name === 'AbortError') return;
        notify('error', err.message);
        throw err;
    } finally {
        if (activeAbortController === controller) activeAbortController = null;
    }
}

function clearRenderCache() { renderCache.clear(); }
window.clearRenderCache = clearRenderCache;