document.addEventListener('DOMContentLoaded', () => {
    const robuxInput = document.getElementById('robux-amount');
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn');
    const statusText = document.getElementById('status');
    const statusBulb = document.getElementById('status-bulb');
    const addItemIdInput = document.getElementById('manual-item-id');
    const addItemBtn = document.getElementById('add-item-btn');
    const displayNameInput = document.getElementById('display-name');
    const usernameInput = document.getElementById('username');
    const followerInput = document.getElementById('follower-count');
    const invCount = document.getElementById('inv-count');
    const invGrid = document.getElementById('inventory-preview-grid');
    const txList = document.getElementById('transaction-list');
    const txDesc = document.getElementById('tx-desc');
    const txType = document.getElementById('tx-type');
    const txAmount = document.getElementById('tx-amount');
    const txDate = document.getElementById('tx-date');
    const addTxBtn = document.getElementById('add-tx-btn');

    if (txDate) txDate.valueAsDate = new Date();

    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const clock = document.getElementById('clock');
        if (clock) clock.textContent = `${h}:${m}:${s}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    document.querySelectorAll('.frost-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.frost-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.frost-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('panel-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });

    function showStatus(text, type = 'ready') {
        statusText.textContent = text;
        if (type === 'error') {
            statusBulb.style.background = 'var(--frost-danger)';
            statusBulb.style.boxShadow = '0 0 6px var(--frost-danger)';
        } else {
            statusBulb.style.background = 'var(--frost-success)';
            statusBulb.style.boxShadow = '0 0 6px var(--frost-success)';
        }
        setTimeout(() => {
            statusText.textContent = 'ready';
            statusBulb.style.background = 'var(--frost-success)';
            statusBulb.style.boxShadow = '0 0 6px var(--frost-success)';
        }, 2000);
    }

    function renderInventoryPreview(inventory) {
        if (!invGrid) return;
        invGrid.innerHTML = '';
        if (invCount) invCount.textContent = (inventory || []).length + ' items';
        (inventory || []).slice(0, 16).forEach(item => {
            const div = document.createElement('div');
            div.className = 'vault-item';
            div.innerHTML = item.image
                ? `<img src="${item.image}" alt="">`
                : `<span style="color:var(--frost-text-dim);font-size:0.6rem;">?</span>`;
            invGrid.appendChild(div);
        });
    }

    function renderTransactions(transactions) {
        if (!txList) return;
        txList.innerHTML = '';
        [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((t) => {
            const div = document.createElement('div');
            div.className = 'ledger-entry';
            const cls = t.amount >= 0 ? 'pos' : 'neg';
            const sign = t.amount >= 0 ? '+' : '';
            div.innerHTML = `
                <div>
                    <div class="entry-desc">${t.description}</div>
                    <div class="entry-meta">${t.type} • ${new Date(t.date).toLocaleDateString()}</div>
                </div>
                <div class="entry-amount ${cls}">${sign}${parseInt(t.amount).toLocaleString()}</div>`;
            txList.appendChild(div);
        });
    }

    chrome.storage.local.get(
        ['fakeRobux', 'uiMode', 'transactions', 'larpDisplayName', 'larpUsername', 'larpFollowers', 'inventory'],
        (result) => {
            if (result.fakeRobux !== undefined) robuxInput.value = result.fakeRobux;
            if (result.larpDisplayName !== undefined && displayNameInput) displayNameInput.value = result.larpDisplayName;
            if (result.larpUsername !== undefined && usernameInput) usernameInput.value = result.larpUsername;
            if (result.larpFollowers !== undefined && followerInput) followerInput.value = result.larpFollowers;
            renderTransactions(result.transactions || []);
            renderInventoryPreview(result.inventory || []);
        }
    );

    // ── FIX: empty Robux box used to abort the whole save ──
    saveBtn.addEventListener('click', () => {
        const raw = robuxInput.value.trim();
        const amount = raw === '' ? undefined : parseInt(raw);
        if (amount !== undefined && isNaN(amount)) { showStatus('bad amount', 'error'); return; }

        const patch = {
            larpDisplayName: displayNameInput ? displayNameInput.value.trim() : '',
            larpUsername: usernameInput ? usernameInput.value.trim() : '',
            larpFollowers: followerInput ? (parseInt(followerInput.value) || 0) : 0
        };
        if (amount !== undefined) { patch.fakeRobux = amount; patch.setFakeRobux = amount; }

        chrome.storage.local.set(patch, () => showStatus('committed', 'success'));
    });

    addTxBtn.addEventListener('click', () => {
        const desc = txDesc.value.trim();
        const type = txType.value;
        const amount = parseInt(txAmount.value);
        const date = txDate.value || new Date().toISOString().split('T')[0];
        if (!desc || isNaN(amount)) { showStatus('incomplete', 'error'); return; }
        chrome.storage.local.get(['transactions'], (res) => {
            const txs = res.transactions || [];
            txs.push({ id: Math.random().toString(36).substr(2, 9), description: desc, type, amount, date });
            chrome.storage.local.set({ transactions: txs }, () => {
                txDesc.value = ''; txAmount.value = ''; txDate.valueAsDate = new Date();
                renderTransactions(txs);
                showStatus('recorded', 'success');
            });
        });
    });

    addItemBtn.addEventListener('click', async () => {
        const assetId = addItemIdInput.value.trim();
        if (!assetId) return;
        showStatus('fetching');
        addItemBtn.disabled = true;
        try {
            const detailRes = await fetch(`https://economy.roblox.com/v2/assets/${assetId}/details`);
            if (!detailRes.ok) {
                const bundleRes = await fetch(`https://catalog.roblox.com/v1/bundles/${assetId}/details`);
                if (!bundleRes.ok) throw new Error('Invalid Asset or Bundle ID');
                const bundleData = await bundleRes.json();
                const assets = (bundleData.items || []).filter(i => i.type === 'Asset');
                if (!assets.length) throw new Error('Empty bundle');
                const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${assets.map(a => a.id).join(',')}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`);
                const thumbsMap = {};
                if (thumbRes.ok) ((await thumbRes.json()).data || []).forEach(t => { thumbsMap[t.targetId] = t.imageUrl; });
                const typeMap = {};
                await Promise.all(assets.map(async (item) => {
                    try {
                        const r = await fetch(`https://economy.roblox.com/v2/assets/${item.id}/details`);
                        if (r.ok) typeMap[item.id] = (await r.json()).AssetTypeId;
                    } catch (e) { }
                }));
                chrome.storage.local.get(['inventory'], (result) => {
                    const inventory = result.inventory || [];
                    assets.forEach(item => inventory.push({
                        name: item.name, image: thumbsMap[item.id] || '',
                        creator: (bundleData.creator && bundleData.creator.name) || 'Roblox',
                        date: new Date().toISOString(),
                        id: Math.random().toString(36).substr(2, 9),
                        assetId: item.id.toString(), limitedStatus: null,
                        assetType: typeMap[item.id] || null
                    }));
                    chrome.storage.local.set({ inventory }, () => {
                        addItemIdInput.value = '';
                        showStatus('bundle added', 'success');
                        addItemBtn.disabled = false;
                        renderInventoryPreview(inventory);
                    });
                });
                return;
            }
            const data = await detailRes.json();
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`);
            let imageUrl = '';
            if (thumbRes.ok) imageUrl = ((await thumbRes.json()).data || [])[0]?.imageUrl || '';
            chrome.storage.local.get(['inventory'], (result) => {
                const inventory = result.inventory || [];
                inventory.push({
                    name: data.Name || data.name || 'Roblox Item',
                    image: imageUrl,
                    creator: (data.Creator && data.Creator.Name) || 'Roblox',
                    date: new Date().toISOString(),
                    id: Math.random().toString(36).substr(2, 9),
                    assetId,
                    limitedStatus: data.IsLimitedUnique ? 'limited_u' : (data.IsLimited ? 'limited' : null),
                    assetType: data.AssetTypeId
                });
                chrome.storage.local.set({ inventory }, () => {
                    addItemIdInput.value = '';
                    showStatus('item added', 'success');
                    addItemBtn.disabled = false;
                    renderInventoryPreview(inventory);
                });
            });
        } catch (e) {
            showStatus('failed', 'error');
            addItemBtn.disabled = false;
        }
    });

    // ══════════════ LARP TARGET ══════════════
    const tUser = document.getElementById('target-username');
    const tLoad = document.getElementById('target-load-btn');
    const tApply = document.getElementById('target-apply-btn');
    const tClear = document.getElementById('target-clear-btn');
    const tPreview = document.getElementById('target-preview');
    const tOpts = {
        name: document.getElementById('opt-name'),
        bio: document.getElementById('opt-bio'),
        followers: document.getElementById('opt-followers'),
        outfit: document.getElementById('opt-outfit'),
        badges: document.getElementById('opt-badges'),
        plus: document.getElementById('opt-plus')
    };
    let target = null;

    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const jget = (url) => fetch(url, { credentials: 'include' }).then(r => r.json());

    async function resolveUser(username) {
        const clean = username.trim().replace(/^@/, '');
        if (!clean) throw new Error('empty');
        try {
            const r = await fetch('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames: [clean], excludeBannedUsers: true })
            });
            if (r.ok) {
                const j = await r.json();
                if (j.data && j.data.length) return j.data[0];
            }
        } catch (e) { }
        const j2 = await jget(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(clean)}&limit=10`);
        const hit = (j2.data || []).find(u => u.name.toLowerCase() === clean.toLowerCase());
        if (!hit) throw new Error('not found');
        return hit;
    }

    // ── Plus detection across every endpoint shape we know of ──
    function readBool(j) {
        if (typeof j === 'boolean') return j;
        if (j && typeof j === 'object') {
            for (const k of ['isPremium', 'premium', 'isPlus', 'plus', 'hasPlus', 'isPlusMember', 'isSubscribed']) {
                if (typeof j[k] === 'boolean') return j[k];
            }
            const mt = j.membershipType ?? j.tier;
            if (typeof mt === 'string') return !/none|free/i.test(mt);
            if (typeof mt === 'number') return mt > 0;
        }
        return null;
    }

    async function detectPlus(id, badges) {
        if (Array.isArray(badges) && badges.some(b => /plus/i.test((b && b.name) || ''))) return true;
        const urls = [
            `https://premiumfeatures.roblox.com/v1/users/${id}/validate-membership`,
            `https://apis.roblox.com/premium-membership-api/v1/users/${id}`,
            `https://apis.roblox.com/memberships-api/v1/users/${id}/membership`
        ];
        for (const u of urls) {
            try {
                const r = await fetch(u, { credentials: 'include' });
                if (!r.ok) continue;
                const v = readBool(await r.json());
                if (v !== null) return v;
            } catch (e) { }
        }
        return null;
    }

    function renderTargetPreview() {
        if (!target) { tPreview.innerHTML = '<div class="target-empty">no target</div>'; return; }
        tPreview.innerHTML = `
            <div class="target-card">
                ${target.thumb ? `<img class="target-avatar" src="${esc(target.thumb)}" alt="">` : '<div class="target-avatar"></div>'}
                <div class="target-meta">
                    <div class="target-name">${esc(target.displayName)}${target.plus ? ' <span class="target-plus">Ⓟ</span>' : ''}</div>
                    <div class="target-handle">@${esc(target.name)}</div>
                    <div class="target-stats">${(target.followers || 0).toLocaleString()} followers · ${(target.friends || []).length} friends</div>
                    ${target.description ? `<div class="target-bio">${esc(target.description)}</div>` : ''}
                </div>
            </div>`;
    }

    async function loadTarget(username) {
        tLoad.disabled = true;
        showStatus('looking up');
        try {
            const hit = await resolveUser(username);
            const id = hit.id;
            const [profile, followers, followings, friends, avatar, thumb, headshot, bust,
                   badges, socialLinks, primaryGroup, usernameHistory, friendsList, presence] = await Promise.all([
                jget(`https://users.roblox.com/v1/users/${id}`).catch(() => ({})),
                jget(`https://friends.roblox.com/v1/users/${id}/followers/count`).catch(() => ({ count: 0 })),
                jget(`https://friends.roblox.com/v1/users/${id}/followings/count`).catch(() => ({ count: 0 })),
                jget(`https://friends.roblox.com/v1/users/${id}/friends/count`).catch(() => ({ count: 0 })),
                jget(`https://avatar.roblox.com/v1/users/${id}/avatar`).catch(() => null),
                jget(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png&isCircular=false`).then(j => j.data?.[0]?.imageUrl).catch(() => null),
                jget(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`).then(j => j.data?.[0]?.imageUrl).catch(() => null),
                jget(`https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${id}&size=420x420&format=Png&isCircular=false`).then(j => j.data?.[0]?.imageUrl).catch(() => null),
                jget(`https://accountinformation.roblox.com/v1/users/${id}/roblox-badges`).catch(() => null),
                jget(`https://accountinformation.roblox.com/v1/users/${id}/promotion-channels`).catch(() => null),
                jget(`https://groups.roblox.com/v1/users/${id}/groups/primary/role`).catch(() => null),
                jget(`https://users.roblox.com/v1/users/${id}/username-history`).catch(() => null),
                jget(`https://friends.roblox.com/v1/users/${id}/friends?limit=50`).catch(() => ({})),
                fetch('https://presence.roblox.com/v1/presence/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userIds: [id] })
                }).then(r => r.json()).catch(() => ({}))
            ]);

            const plus = await detectPlus(id, badges);

            target = {
                id,
                name: profile.name || hit.name,
                displayName: profile.displayName || hit.displayName || hit.name,
                description: profile.description || '',
                created: profile.created || null,
                hasVerifiedBadge: !!profile.hasVerifiedBadge,
                premium: plus === true,
                plus: plus,
                followers: followers.count ?? 0,
                followings: followings.count ?? 0,
                friendsCount: friends.count ?? 0,
                avatar: avatar ? {
                    assets: avatar.assets || [],
                    bodyColors: avatar.bodyColors || null,
                    scales: avatar.scales || null,
                    playerAvatarType: avatar.playerAvatarType || 'R15'
                } : null,
                thumb, headshot, bust,
                badges,
                socialLinks,
                primaryGroup,
                usernameHistory: usernameHistory ? usernameHistory.data : null,
                friends: (friendsList && friendsList.data) || null,
                presence: (presence.userPresences || [])[0] || null
            };
            if (tOpts.plus) tOpts.plus.checked = plus !== false;

            renderTargetPreview();
            tApply.disabled = false;
            showStatus(plus === null ? 'loaded (plus?)' : 'target loaded', 'success');
        } catch (e) {
            target = null;
            tApply.disabled = true;
            tPreview.innerHTML = '<div class="target-empty">no user found</div>';
            showStatus('not found', 'error');
        } finally {
            tLoad.disabled = false;
        }
    }

    tLoad.addEventListener('click', () => loadTarget(tUser.value));
    tUser.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadTarget(tUser.value); });

    tApply.addEventListener('click', () => {
        if (!target) return;

        // every checkbox is now explicit in BOTH directions, so unticking actually clears
        const on = (el, dflt = true) => (el ? el.checked : dflt);

        if (on(tOpts.name)) {
            target.displayName = target.displayName;
        }
        const patch = {};

        patch.larpDisplayName = on(tOpts.name) ? target.displayName : '';
        patch.larpUsername = on(tOpts.name) ? target.name : '';
        patch.larpBio = on(tOpts.bio) ? target.description : null;

        if (on(tOpts.followers)) {
            patch.larpFollowers = target.followers;
            patch.larpFollowing = target.followings;
            patch.larpFriends = target.friendsCount;
        } else {
            patch.larpFollowers = null;
            patch.larpFollowing = null;
            patch.larpFriends = null;
        }

        // outfit is the MASTER SWITCH: larpId is what arms replaceAssets in bridge.js
        if (on(tOpts.outfit)) {
            patch.larpId = target.id;
            patch.larpBodyColors = null;
        } else {
            patch.larpId = null;
        }

        if (!on(tOpts.badges)) target.badges = null;
        target.hasVerifiedBadge = on(tOpts.badges) ? !!target.hasVerifiedBadge : false;

        // Plus: drives both the DOM badge and the membership API rewrite
        const wantPlus = on(tOpts.plus, target.premium === true);
        target.premium = wantPlus;
        target.plus = wantPlus;
        patch.larpPlus = wantPlus;

        patch.larpTarget = target;

        chrome.storage.local.set(patch, () => showStatus('larping', 'success'));
    });

    tClear.addEventListener('click', () => {
        chrome.storage.local.remove(
            ['larpTarget', 'larpBio', 'larpId', 'larpDisplayName', 'larpUsername',
             'larpFollowers', 'larpFollowing', 'larpFriends', 'larpBodyColors', 'larpPlus'],
            () => {
                target = null;
                tUser.value = '';
                tApply.disabled = true;
                renderTargetPreview();
                showStatus('cleared', 'success');
            }
        );
    });

    chrome.storage.local.get(['larpTarget'], (r) => {
        if (r.larpTarget) {
            target = r.larpTarget;
            tUser.value = target.name;
            if (tOpts.plus && (target.plus || target.premium)) tOpts.plus.checked = true;
            renderTargetPreview();
            tApply.disabled = false;
        } else {
            renderTargetPreview();
        }
    });

    resetBtn.addEventListener('click', () => {
        if (!confirm('Purge all simulated data?')) return;
        chrome.storage.local.remove(
            ['fakeRobux', 'setFakeRobux', 'inventory', 'history', 'equipped', 'transactions',
             'larpDisplayName', 'larpUsername', 'larpFollowers', 'larpFollowing', 'larpFriends',
             'larpBio', 'larpTarget', 'larpId', 'larpBodyColors', 'larpPlus'],
            () => {
                robuxInput.value = 10000000;
                [displayNameInput, usernameInput, followerInput].forEach(el => { if (el) el.value = ''; });
                if (txList) txList.innerHTML = '';
                if (invGrid) invGrid.innerHTML = '';
                if (invCount) invCount.textContent = '0 items';
                target = null;
                if (tUser) tUser.value = '';
                if (tApply) tApply.disabled = true;
                renderTargetPreview();
                showStatus('purged', 'success');
            }
        );
    });
});