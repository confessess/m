/* hook.js — MAIN world, document_start. Rewrites Roblox API responses. */
(function () {
    'use strict';
    if (window.__LARP_HOOK__) return;
    window.__LARP_HOOK__ = true;

    const cfg = {
        enabled: true, myId: null,
        robux: null, displayName: '', username: '', bio: null, created: null,
        hasVerifiedBadge: null, premium: null,
        followers: null, following: null, friends: null,
        avatarUrl: null, headshotUrl: null, bustUrl: null,
        equippedIds: [], bodyColors: null,
        transactions: [], inventory: [],
        replaceAssets: false, targetAssets: [],
        targetBodyColors: null, targetScales: null, targetAvatarType: null,
        badges: null, socialLinks: null, primaryGroup: null,
        usernameHistory: null, presence: null, targetFriends: null
    };

    try { Object.assign(cfg, JSON.parse(localStorage.getItem('__larp_cfg') || '{}')); } catch (e) { }

    window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d || d.__larp !== true) return;
        if (e.source && e.source !== window) return;
        if (d.type === 'LARP_CONFIG') {
            Object.assign(cfg, d.payload || {});
            try { localStorage.setItem('__larp_cfg', JSON.stringify(cfg)); } catch (e) { }
        }
    });

    const uidOf = (u) => { const m = u.match(/\/users\/(\d+)/); return m ? m[1] : null; };
    const isMe = (u) => { const id = uidOf(u); return !!(id && cfg.myId && id === String(cfg.myId)); };
    const isMeOrUnknown = (u) => !cfg.myId || isMe(u);
    const isSelfId = (id) => cfg.myId != null && String(id) === String(cfg.myId);

    /* ── unmatched-URL radar: tells you which endpoint needs a rule ── */
    const _unseen = new Set();
    function logUnmatched(url) {
        if (!/avatar|wear|profile|description|membership|badge|premium|plus|thumbnails/i.test(url)) return;
        const key = url.split('?')[0];
        if (_unseen.has(key)) return;
        _unseen.add(key);
        console.log('[LarpBlox] UNMATCHED →', url);
    }

    function rename(o) {
        if (!o || typeof o !== 'object') return false;
        let c = false;
        if (cfg.username && 'name' in o && o.name !== cfg.username) { o.name = cfg.username; c = true; }
        if (cfg.displayName && 'displayName' in o && o.displayName !== cfg.displayName) { o.displayName = cfg.displayName; c = true; }
        if (cfg.hasVerifiedBadge != null && 'hasVerifiedBadge' in o) { o.hasVerifiedBadge = cfg.hasVerifiedBadge; c = true; }
        if (cfg.created && 'created' in o && o.created !== cfg.created) { o.created = cfg.created; c = true; }
        if (cfg.bio != null && 'description' in o && o.description !== cfg.bio) { o.description = cfg.bio; c = true; }
        return c;
    }

    function renameInList(list, key) {
        if (!Array.isArray(list)) return false;
        let c = false;
        for (const e of list) {
            if (!e || typeof e !== 'object') continue;
            const id = e.id ?? e.userId ?? e.targetId ?? (key && e[key] && e[key].id);
            if (isSelfId(id)) c = rename(e) || c;
        }
        return c;
    }

    function swapThumb(list, url) {
        if (!url || !Array.isArray(list)) return false;
        let c = false;
        for (const d of list) {
            if (!d) continue;
            const id = d.targetId ?? d.id;
            if (!isSelfId(id)) continue;
            if (d.imageUrl !== url) { d.imageUrl = url; d.state = 'Completed'; c = true; }
        }
        return c;
    }

    function applyAvatarDefinition(j) {
        if (!j || typeof j !== 'object') return false;

        if (cfg.replaceAssets && cfg.targetAssets.length) {
            j.assets = cfg.targetAssets.map((a) => ({
                id: a.id, name: a.name,
                assetType: a.assetType || { id: 0, name: 'Asset' },
                currentVersionId: a.currentVersionId ?? null, meta: a.meta ?? null
            }));
            if (cfg.targetBodyColors) j.bodyColors = { ...j.bodyColors, ...cfg.targetBodyColors };
            if (cfg.targetScales) j.scales = { ...j.scales, ...cfg.targetScales };
            if (cfg.targetAvatarType) j.playerAvatarType = cfg.targetAvatarType;
            return true;
        }

        let c = false;
        if (cfg.equippedIds && cfg.equippedIds.length) {
            const have = new Set((j.assets || []).map((a) => a.id));
            const add = cfg.equippedIds.filter((id) => !have.has(id))
                .map((id) => ({ id, name: 'Larped', assetType: { id: 0, name: 'Larp' } }));
            if (add.length) { j.assets = [...(j.assets || []), ...add]; c = true; }
        }
        if (cfg.bodyColors) { j.bodyColors = { ...j.bodyColors, ...cfg.bodyColors }; c = true; }
        return c;
    }

    function applyMembership(j) {
        if (cfg.premium == null) return null;
        if (typeof j === 'boolean') return j === cfg.premium ? null : cfg.premium;
        if (j && typeof j === 'object') {
            let c = false;
            for (const k of ['isPremium', 'premium', 'isPlus', 'plus', 'hasPlus', 'isPlusMember', 'isSubscribed']) {
                if (k in j && j[k] !== cfg.premium) { j[k] = cfg.premium; c = true; }
            }
            const mt = j.membershipType;
            if (typeof mt === 'string' && cfg.premium) {
                const isNone = /none|free/i.test(mt);
                if (isNone) { j.membershipType = 'Plus'; c = true; }
            }
            return c ? j : null;
        }
        return null;
    }

    const RULES = [
        {
            match: /^https:\/\/users\.roblox\.com\/v1\/users\/authenticated/,
            rewrite(j) { if (!cfg.myId && j.id) cfg.myId = j.id; return rename(j) ? j : null; }
        },
        {
            match: /^https:\/\/users\.roblox\.com\/v1\/users\/\d+\/description/,
            rewrite(j) { if (cfg.bio == null) return null; j.description = cfg.bio; return j; }
        },
        {
            match: /^https:\/\/users\.roblox\.com\/v1\/users\/\d+\/username-history/,
            rewrite(j) { return cfg.usernameHistory ? (j.data = cfg.usernameHistory, j) : null; }
        },
        {
            match: /^https:\/\/users\.roblox\.com\/v1\/users\/\d+(?:[?#]|$)/,
            rewrite(j, url) { return isMe(url) && rename(j) ? j : null; }
        },
        {
            match: /^https:\/\/www\.roblox\.com\/mobileapi\/userinfo/,
            rewrite(j) {
                if (!cfg.myId && j.UserID) cfg.myId = j.UserID;
                let c = false;
                if (cfg.username && j.UserName !== cfg.username) { j.UserName = cfg.username; c = true; }
                if (cfg.displayName && j.DisplayName !== cfg.displayName) { j.DisplayName = cfg.displayName; c = true; }
                if (cfg.robux != null && j.RobuxBalance !== cfg.robux) { j.RobuxBalance = cfg.robux; c = true; }
                if (cfg.headshotUrl && j.ThumbnailUrl !== cfg.headshotUrl) { j.ThumbnailUrl = cfg.headshotUrl; c = true; }
                return c ? j : null;
            }
        },
        {
            /* new profile layout: bio + identity live here, and the field is not always "description" */
            match: /^https:\/\/apis\.roblox\.com\/user-profile-api\/v\d+\/user\/profiles\/get-profiles/,
            rewrite(j) {
                const list = j.profiles || j.data;
                if (!Array.isArray(list)) return null;
                let c = false;
                for (const p of list) {
                    if (!p) continue;
                    if (cfg.bio != null && 'description' in p) { p.description = cfg.bio; c = true; }
                    if (cfg.bio != null && 'bio' in p) { p.bio = cfg.bio; c = true; }
                    if (cfg.bio != null && 'about' in p) { p.about = cfg.bio; c = true; }
                    if (rename(p)) c = true;
                }
                return c ? j : null;
            }
        },
        {
            match: /^https:\/\/users\.roblox\.com\/v1\/users\/search/,
            rewrite(j) { return renameInList(j.data, 'user') ? j : null; }
        },
        {
            match: /^https:\/\/accountinformation\.roblox\.com\/v1\/users\/\d+\/roblox-badges/,
            rewrite(j) {
                if (!Array.isArray(j)) return null;
                let out = cfg.badges ? cfg.badges.slice() : j.slice();
                let c = !!cfg.badges;
                const hasPlus = () => out.some((b) => /plus/i.test((b && b.name) || ''));
                if (cfg.premium === true && !hasPlus()) {
                    out.push({ id: 99, name: 'Roblox Plus', description: 'Roblox Plus subscriber', imageUrl: '' });
                    c = true;
                } else if (cfg.premium === false && hasPlus()) {
                    out = out.filter((b) => !/plus/i.test((b && b.name) || ''));
                    c = true;
                }
                return c ? out : null;
            }
        },
        {
            match: /^https:\/\/accountinformation\.roblox\.com\/v1\/users\/\d+\/promotion-channels/,
            rewrite(j) { return cfg.socialLinks ? Object.assign(j, cfg.socialLinks) : null; }
        },
        {
            match: /validate-membership|premium-membership|memberships-api|plus\.roblox\.com/i,
            rewrite(j) { return applyMembership(j); }
        },
        {
            match: /^https:\/\/groups\.roblox\.com\/v1\/users\/\d+\/groups\/primary\/role/,
            rewrite(j) { return cfg.primaryGroup ? Object.assign(j, cfg.primaryGroup) : null; }
        },
        {
            match: /^https:\/\/economy\.roblox\.com\/v1\/users\/\d+\/currency/,
            rewrite(j) { if (cfg.robux == null) return null; j.robux = cfg.robux; return j; }
        },
        {
            match: /^https:\/\/www\.roblox\.com\/my\/money\.aspx\/getbalance/,
            rewrite(j) { if (cfg.robux == null) return null; j.balance = cfg.robux; return j; }
        },
        { match: /followers\/count/, rewrite(j, u) { return (!isMeOrUnknown(u) || cfg.followers == null) ? null : (j.count = cfg.followers, j); } },
        { match: /followings\/count/, rewrite(j, u) { return (!isMeOrUnknown(u) || cfg.following == null) ? null : (j.count = cfg.following, j); } },
        { match: /\/friends\/count/, rewrite(j, u) { return (!isMeOrUnknown(u) || cfg.friends == null) ? null : (j.count = cfg.friends, j); } },
        {
            match: /^https:\/\/friends\.roblox\.com\/v1\/users\/\d+\/(friends|followers|followings)(?:[?#]|$)/,
            rewrite(j, url) {
                if (/\/friends(?:[?#]|$)/.test(url) && cfg.targetFriends) { j.data = cfg.targetFriends; return j; }
                return renameInList(j.data, 'user') ? j : null;
            }
        },
        {
            match: /^https:\/\/groups\.roblox\.com\/v\d+\/groups\/\d+\/users/,
            rewrite(j) { return renameInList(j.data, 'user') ? j : null; }
        },
        {
            match: /^https:\/\/presence\.roblox\.com\/v1\/presence\/users/,
            rewrite(j) {
                let c = renameInList(j.userPresences, 'user');
                if (cfg.presence && Array.isArray(j.userPresences)) {
                    for (const p of j.userPresences) {
                        if (!isSelfId(p.userId)) continue;
                        Object.assign(p, cfg.presence, { userId: p.userId });
                        c = true;
                    }
                }
                return c ? j : null;
            }
        },
        { match: /^https:\/\/thumbnails\.roblox\.com\/v1\/users\/avatar\?/, rewrite(j) { return swapThumb(j.data, cfg.avatarUrl) ? j : null; } },
        { match: /^https:\/\/thumbnails\.roblox\.com\/v1\/users\/avatar-headshot\?/, rewrite(j) { return swapThumb(j.data, cfg.headshotUrl) ? j : null; } },
        { match: /^https:\/\/thumbnails\.roblox\.com\/v1\/users\/avatar-bust\?/, rewrite(j) { return swapThumb(j.data, cfg.bustUrl) ? j : null; } },
        {
            match: /^https:\/\/avatar\.roblox\.com\/v1\/users\/\d+\/currently-wearing/,
            rewrite(j, url) {
                if (!isMe(url)) return null;
                if (cfg.replaceAssets && cfg.targetAssets.length) {
                    j.assetIds = cfg.targetAssets.map((a) => a.id);
                    return j;
                }
                if (cfg.equippedIds && cfg.equippedIds.length) {
                    const have = new Set(j.assetIds || []);
                    j.assetIds = [...(j.assetIds || []), ...cfg.equippedIds.filter((id) => !have.has(id))];
                    return j;
                }
                return null;
            }
        },
        {
            /* v4 shape used by the current profile page — "avatar" is followed by "/users/{id}" */
            match: /^https:\/\/avatar\.roblox\.com\/v4\/avatar\/users\/\d+/,
            rewrite(j, url) { return isMe(url) && applyAvatarDefinition(j) ? j : null; }
        },
        {
            match: /^https:\/\/avatar\.roblox\.com\/v[14]\/(?:users\/\d+\/)?avatar(?:[?#]|$)/,
            rewrite(j, url) {
                const bare = /\/avatar(?:[?#]|$)/.test(url) && !/\/users\//.test(url);
                if (!bare && !isMe(url)) return null;
                return applyAvatarDefinition(j) ? j : null;
            }
        },
        {
            match: /^https:\/\/inventory\.roblox\.com\/v2\/users\/\d+\/inventory\/(\d+)/,
            rewrite(j, url) {
                if (!Array.isArray(j.data) || !cfg.inventory.length) return null;
                const type = Number(url.match(/\/inventory\/(\d+)/)[1]);
                const have = new Set(j.data.map((d) => d.assetId));
                const add = cfg.inventory
                    .filter((i) => Number(i.assetType) === type && !have.has(Number(i.assetId)))
                    .map((i) => ({ assetId: Number(i.assetId), name: i.name, assetType: type, created: i.date }));
                if (!add.length) return null;
                j.data = [...add, ...j.data];
                return j;
            }
        },
        {
            match: /^https:\/\/economy\.roblox\.com\/v2\/users\/\d+\/transactions/,
            rewrite(j) {
                if (!Array.isArray(j.data) || !cfg.transactions.length) return null;
                j.data = [...cfg.transactions.map((t) => ({
                    id: t.id, created: t.date, isPending: false,
                    agent: { id: 1, name: 'Roblox', type: 'User' },
                    details: { id: 0, name: t.description, type: 'Asset' },
                    currency: { amount: t.amount, type: 'Robux' }
                })), ...j.data];
                return j;
            }
        },
        {
            match: /^https:\/\/economy\.roblox\.com\/v2\/users\/\d+\/transaction-totals/,
            rewrite(j) {
                if (!cfg.transactions.length) return null;
                const sum = (p) => cfg.transactions.filter(p).reduce((a, t) => a + Math.abs(t.amount), 0);
                j.purchases = (j.purchases || 0) + sum((t) => t.amount < 0);
                j.sales = (j.sales || 0) + sum((t) => t.amount > 0);
                return j;
            }
        }
    ];

    const matchRule = (url) => RULES.find((r) => r.match.test(url));

    const origFetch = window.fetch;
    window.fetch = async function (input, init) {
        const res = await origFetch.apply(this, arguments);
        if (!cfg.enabled) return res;
        const url = input instanceof Request ? input.url : String(input);
        const rule = matchRule(url);
        if (!rule) { logUnmatched(url); return res; }
        try {
            const json = await res.clone().json();
            const next = rule.rewrite(json, url);
            if (next == null) return res;
            const h = new Headers(res.headers);
            h.set('content-type', 'application/json; charset=utf-8');
            return new Response(JSON.stringify(next), { status: res.status, statusText: res.statusText, headers: h });
        } catch (e) { return res; }
    };

    const XHRp = XMLHttpRequest.prototype;
    const nativeText = Object.getOwnPropertyDescriptor(XHRp, 'responseText').get;
    const nativeResp = Object.getOwnPropertyDescriptor(XHRp, 'response').get;
    const origOpen = XHRp.open, origSend = XHRp.send;

    XHRp.open = function (method, url) {
        this.__larpUrl = String(url);
        this.__larpCache = undefined;
        if (cfg.enabled && !matchRule(this.__larpUrl)) logUnmatched(this.__larpUrl);
        const self = this;
        Object.defineProperty(self, 'responseText', {
            configurable: true,
            get() {
                const raw = nativeText.call(self);
                if (self.readyState !== 4 || !cfg.enabled) return raw;
                if (self.__larpCache !== undefined) return self.__larpCache;
                const rule = matchRule(self.__larpUrl);
                if (!rule) { self.__larpCache = raw; return raw; }
                try {
                    const next = rule.rewrite(JSON.parse(raw), self.__larpUrl);
                    self.__larpCache = next == null ? raw : JSON.stringify(next);
                } catch (e) { self.__larpCache = raw; }
                return self.__larpCache;
            }
        });
        Object.defineProperty(self, 'response', {
            configurable: true,
            get() {
                const raw = nativeResp.call(self);
                if (self.readyState !== 4 || !cfg.enabled) return raw;
                if (self.responseType === 'blob' || self.responseType === 'arraybuffer') return raw;
                if (self.responseType !== 'json') return self.responseText;
                try { return JSON.parse(self.responseText); } catch (e) { return raw; }
            }
        });
        return origOpen.apply(this, arguments);
    };

    XHRp.send = function () { this.__larpCache = undefined; return origSend.apply(this, arguments); };

    (function patchService() {
        if (window.Roblox && window.Roblox.AvatarAccoutrementService) {
            const s = window.Roblox.AvatarAccoutrementService;
            if (s.__larpPatched) return;
            s.__larpPatched = true;
            if (s.getAdvancedAccessoryLimit) s.getAdvancedAccessoryLimit = () => 100;
        } else setTimeout(patchService, 500);
    })();

    console.log('[LarpBlox] hook armed v1.6');
})();