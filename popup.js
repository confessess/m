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

    // Clock
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

    // Tab switching
    document.querySelectorAll('.frost-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.frost-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.frost-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panelId = 'panel-' + tab.dataset.tab;
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.add('active');
        });
    });

    function showStatus(text, type = 'ready') {
        statusText.textContent = text;
        if (type === 'error') {
            statusBulb.style.background = 'var(--frost-danger)';
            statusBulb.style.boxShadow = '0 0 6px var(--frost-danger)';
        } else if (type === 'success') {
            statusBulb.style.background = 'var(--frost-success)';
            statusBulb.style.boxShadow = '0 0 6px var(--frost-success)';
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
        const items = (inventory || []).slice(0, 16);
        if (invCount) invCount.textContent = (inventory || []).length + ' items';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'vault-item';
            if (item.image) {
                div.innerHTML = `<img src="${item.image}" alt="">`;
            } else {
                div.innerHTML = `<span style="color:var(--frost-text-dim);font-size:0.6rem;">?</span>`;
            }
            invGrid.appendChild(div);
        });
    }

    function renderTransactions(transactions) {
        if (!txList) return;
        txList.innerHTML = '';
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        sorted.forEach((t, i) => {
            const div = document.createElement('div');
            div.className = 'ledger-entry';
            const amountColor = t.amount >= 0 ? 'pos' : 'neg';
            const sign = t.amount >= 0 ? '+' : '';
            div.innerHTML = `
                <div>
                    <div class="entry-desc">${t.description}</div>
                    <div class="entry-meta">${t.type} • ${new Date(t.date).toLocaleDateString()}</div>
                </div>
                <div class="entry-amount ${amountColor}">${sign}${parseInt(t.amount).toLocaleString()}</div>
            `;
            txList.appendChild(div);
        });
    }

    chrome.storage.local.get(['fakeRobux', 'larpId', 'uiMode', 'transactions', 'larpDisplayName', 'larpUsername', 'larpFollowers', 'inventory'], (result) => {
        if (result.fakeRobux !== undefined) robuxInput.value = result.fakeRobux;
        if (result.larpDisplayName !== undefined && displayNameInput) displayNameInput.value = result.larpDisplayName;
        if (result.larpUsername !== undefined && usernameInput) usernameInput.value = result.larpUsername;
        if (result.larpFollowers !== undefined && followerInput) followerInput.value = result.larpFollowers;
        renderTransactions(result.transactions || []);
        renderInventoryPreview(result.inventory || []);
    });

    saveBtn.addEventListener('click', () => {
        const amount = parseInt(robuxInput.value);
        const displayName = displayNameInput ? displayNameInput.value.trim() : '';
        const username = usernameInput ? usernameInput.value.trim() : '';
        const followers = followerInput ? parseInt(followerInput.value) || 0 : 0;
        if (isNaN(amount) && amount !== undefined) return;
        chrome.storage.local.set({ 
            fakeRobux: amount, 
            setFakeRobux: amount,
            larpDisplayName: displayName,
            larpUsername: username,
            larpFollowers: followers
        }, () => {
            showStatus('committed', 'success');
        });
    });

    addTxBtn.addEventListener('click', () => {
        if (!txDesc || !txType || !txAmount || !txDate) return;
        const desc = txDesc.value.trim();
        const type = txType.value;
        const amount = parseInt(txAmount.value);
        const date = txDate.value || new Date().toISOString().split('T')[0];
        if (!desc || isNaN(amount)) { showStatus('incomplete', 'error'); return; }
        chrome.storage.local.get(['transactions'], (res) => {
            const txs = res.transactions || [];
            txs.push({ id: Math.random().toString(36).substr(2,9), description: desc, type, amount, date });
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
        showStatus('fetching...');
        addItemBtn.disabled = true;
        try {
            let detailRes = await fetch(`https://economy.roblox.com/v2/assets/${assetId}/details`);
            if (!detailRes.ok) {
                const bundleRes = await fetch(`https://catalog.roblox.com/v1/bundles/${assetId}/details`);
                if (bundleRes.ok) {
                    showStatus('bundle...');
                    const bundleData = await bundleRes.json();
                    if (bundleData.items && bundleData.items.length > 0) {
                        const assets = bundleData.items.filter(item => item.type === "Asset");
                        if (assets.length > 0) {
                            const assetIdsStr = assets.map(a => a.id).join(',');
                            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${assetIdsStr}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`);
                            let thumbsMap = {};
                            if (thumbRes.ok) {
                                const thumbData = await thumbRes.json();
                                (thumbData.data || []).forEach(t => { thumbsMap[t.targetId] = t.imageUrl; });
                            }

                            const assetTypePromises = assets.map(async (item) => {
                                try {
                                    const typeRes = await fetch(`https://economy.roblox.com/v2/assets/${item.id}/details`);
                                    if (typeRes.ok) {
                                        const typeData = await typeRes.json();
                                        return { id: item.id, assetType: typeData.AssetTypeId };
                                    }
                                } catch (e) {}
                                return { id: item.id, assetType: null };
                            });
                            const assetTypes = await Promise.all(assetTypePromises);
                            const assetTypeMap = {};
                            assetTypes.forEach(at => { assetTypeMap[at.id] = at.assetType; });

                            chrome.storage.local.get(['inventory'], (result) => {
                                const inventory = result.inventory || [];
                                for (const item of assets) {
                                    inventory.push({ 
                                        name: item.name, 
                                        image: thumbsMap[item.id] || "", 
                                        creator: bundleData.creator?.name || "Roblox", 
                                        date: new Date().toISOString(), 
                                        id: Math.random().toString(36).substr(2,9), 
                                        assetId: item.id.toString(), 
                                        limitedStatus: null, 
                                        assetType: assetTypeMap[item.id] || null 
                                    });
                                }
                                chrome.storage.local.set({ inventory }, () => {
                                    addItemIdInput.value = '';
                                    showStatus('bundle added', 'success');
                                    addItemBtn.disabled = false;
                                    renderInventoryPreview(inventory);
                                });
                            });
                            return;
                        }
                    }
                }
                throw new Error('Invalid Asset or Bundle ID');
            }
            const data = await detailRes.json();
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`);
            let imageUrl = '';
            if (thumbRes.ok) {
                const thumbData = await thumbRes.json();
                imageUrl = thumbData.data?.[0]?.imageUrl || '';
            }
            let limitedStatus = null;
            if (data.IsLimitedUnique) limitedStatus = 'limited_u';
            else if (data.IsLimited) limitedStatus = 'limited';
            chrome.storage.local.get(['inventory'], (result) => {
                const inventory = result.inventory || [];
                inventory.push({ 
                    name: data.Name || data.name || "Roblox Item", 
                    image: imageUrl, 
                    creator: data.Creator?.Name || "Roblox", 
                    date: new Date().toISOString(), 
                    id: Math.random().toString(36).substr(2,9), 
                    assetId: assetId, 
                    limitedStatus: limitedStatus, 
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
            console.error(e);
            addItemBtn.disabled = false;
        }
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Purge all simulated data?')) {
            chrome.storage.local.remove(['fakeRobux', 'inventory', 'history', 'equipped', 'transactions', 'larpDisplayName', 'larpUsername', 'larpFollowers'], () => {
                robuxInput.value = 10000000;
                if (displayNameInput) displayNameInput.value = '';
                if (usernameInput) usernameInput.value = '';
                if (followerInput) followerInput.value = '';
                if (txList) txList.innerHTML = '';
                if (invGrid) invGrid.innerHTML = '';
                if (invCount) invCount.textContent = '0 items';
                showStatus('purged', 'success');
            });
        }
    });
});