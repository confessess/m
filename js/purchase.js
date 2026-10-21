// LarpBlox - Purchase Simulation

function handleBuyButton() {
    const buyButtonSelectors = [
        '.PurchaseButton',
        '[data-testid="purchase-button"]',
        '.item-purchase-button button',
        '.robux-buy-button',
        '#confirm-purchase-button',
        '.btn-growth-lg'
    ];

    buyButtonSelectors.forEach(selector => {
        const buyButtons = document.querySelectorAll(selector);
        buyButtons.forEach(buyButton => {
            if (buyButton && !buyButton.dataset.simulatorHooked) {
                buyButton.dataset.simulatorHooked = "true";

                buyButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const nameSelectors = [
                        '.item-details h1',
                        '[data-testid="share-item-name"]',
                        '.item-name-container h1',
                        '.item-title',
                        'h1'
                    ];
                    let itemName = "Roblox Item";
                    for (const sel of nameSelectors) {
                        const el = document.querySelector(sel);
                        if (el && el.textContent.trim()) {
                            itemName = el.textContent.trim();
                            break;
                        }
                    }

                    const priceSelectors = [
                        '.item-price-value',
                        '.text-robux-lg',
                        '.robux-price',
                        '.amount.icon-robux-container',
                        '[data-testid="item-price-value"]'
                    ];
                    let itemPrice = 0;
                    for (const sel of priceSelectors) {
                        const el = document.querySelector(sel);
                        if (el) {
                            const val = el.textContent.replace(/[^0-9]/g, '');
                            if (val) {
                                itemPrice = parseInt(val);
                                break;
                            }
                        }
                    }

                    let itemImage = await getAssetThumbnail();

                    if (!itemImage) {
                        const allImgs = Array.from(document.querySelectorAll('img'));
                        for (const i of allImgs) {
                            if (i.src && i.src.includes('rbxcdn.com') && i.naturalWidth > 50 && !i.closest('.item-card') && !i.src.toLowerCase().includes('avatar')) {
                                itemImage = i.src;
                                break;
                            }
                        }
                    }

                    const creatorSelectors = [
                        '.item-details .text-name',
                        '[data-testid="share-item-creator"]',
                        '.item-name-container .text-name',
                        '.creator-name-link',
                        'a[href*="/users/"]',
                        'a[href*="/groups/"]'
                    ];
                    let creatorName = "Roblox";
                    for (const sel of creatorSelectors) {
                        const el = document.querySelector(sel);
                        if (el && el.textContent.trim()) {
                            creatorName = el.textContent.trim().replace(/^by\s+/i, '');
                            break;
                        }
                    }

                    const limitedStatus = await detectLimitedStatus();
                    showSimulatedPurchase(itemName, itemPrice, itemImage, limitedStatus, creatorName);
                }, true);
            }
        });
    });
}

function showSimulatedPurchase(name, price, image, limitedStatus, creator = "Roblox") {
    const theme = getResolvedTheme();
    const isDark = (theme === 'dark');
    const itemType = document.querySelector('.item-type-field-container, .type-label')?.textContent?.trim() || "Asset";
    const newBalance = state.fakeRobux - price;
    const newBalanceFormatted = newBalance.toLocaleString();

    const overlayHtml = `<div id="simplemodal-overlay" class="simplemodal-overlay" style="background-color: rgb(0, 0, 0); opacity: 0.8; height: 100%; width: 100%; position: fixed; left: 0px; top: 0px; z-index: 1041;"></div>`;

    const confirmModalHtml = `
        <div id="larp-purchase-modal" role="dialog" tabindex="-1" style="display: block; z-index: 1042; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);" class="in modal">
            <div class="modal-window modal-sm modal-dialog" style="margin: 0;">
                <div class="modal-content" role="document">
                    <div class="modal-header">
                        <button type="button" class="close larp-modal-close" title="close"><span class="icon-close"></span></button>
                        <h4 class="modal-title">Buy Item</h4>
                    </div>
                    <div class="modal-body">
                        <div class="modal-message">Would you like to buy the ${itemType} "<span class="font-bold" data-reactroot="">${name}</span>" from ${creator} for <span class="icon-robux-16x16"></span><span class="text-robux">${price.toLocaleString()}</span>?</div>
                        <div class="img-container modal-image-container">
                            <span class="thumbnail-2d-container modal-thumb"><img class="" src="${image}" alt="${name}" title="${name}"></span>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="loading"></div>
                        <div class="modal-buttons">
                            <button type="button" class="modal-button btn-primary-md btn-min-width" id="larp-buy-now">Buy Now</button>
                            <button type="button" class="modal-button btn-control-md btn-min-width" id="larp-cancel">Cancel</button>
                        </div>
                        <div class="text-footer">
                            <span>Your balance after this transaction will be <span class="icon-robux-gray-16x16"></span><span class="text-robux">${newBalanceFormatted}</span>.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);
    document.body.insertAdjacentHTML('beforeend', confirmModalHtml);

    const confirmModal = document.getElementById('larp-purchase-modal');
    const overlay = document.getElementById('simplemodal-overlay');

    const cleanUp = () => { confirmModal.remove(); overlay.remove(); };
    confirmModal.querySelector('.close').onclick = cleanUp;
    confirmModal.querySelector('#larp-cancel').onclick = cleanUp;

    const buyNowButton = confirmModal.querySelector('#larp-buy-now');
    const modalButtonsContainer = confirmModal.querySelector('.modal-buttons');

    buyNowButton.onclick = async () => {
        modalButtonsContainer.innerHTML = `<div ng-show="loading" loading-animated="" class=""><span class="spinner spinner-default"></span></div>`;
        localStorage.setItem("rbxBal", newBalance);
        setTimeout(async () => {
            confirmModal.remove();
            await processPurchase();
        }, 700);
    };

    const processPurchase = async () => {
        if (state.fakeRobux >= price) {
            state.fakeRobux -= price;
            const assetId = getAssetIdFromUrl();
            const isBundle = window.location.href.includes('/bundles/');

            let assetType = null;
            if (!isBundle && assetId) {
                try {
                    const typeRes = await fetch(`https://economy.roblox.com/v2/assets/${assetId}/details`);
                    if (typeRes.ok) {
                        const typeData = await typeRes.json();
                        assetType = typeData.AssetTypeId;
                    }
                } catch (e) {}
            }

            state.inventory.push({
                name, image, creator,
                date: new Date().toISOString(),
                id: Math.random().toString(36).substr(2, 9),
                assetId: assetId,
                limitedStatus: limitedStatus || null,
                price: price,
                assetType: assetType
            });
            state.history.push({ name, price, image, creator, date: new Date().toISOString() });

            if (isBundle && assetId) {
                try {
                    const bundleRes = await fetch(`https://catalog.roblox.com/v1/bundles/${assetId}/details`);
                    if (bundleRes.ok) {
                        const bundleData = await bundleRes.json();
                        if (bundleData.items) {
                            const bundleAssets = bundleData.items.filter(i => i.type === "Asset");
                            const assetIdsStr = bundleAssets.map(i => i.id).join(',');
                            let thumbsMap = {};
                            try {
                                const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${assetIdsStr}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`);
                                if (thumbRes.ok) {
                                    const thumbData = await thumbRes.json();
                                    (thumbData.data || []).forEach(t => { thumbsMap[t.targetId] = t.imageUrl; });
                                }
                            } catch (e) { }

                            const assetTypePromises = bundleAssets.map(async (item) => {
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

                            for (const item of bundleAssets) {
                                state.inventory.push({
                                    name: item.name,
                                    image: thumbsMap[item.id] || "",
                                    creator,
                                    date: new Date().toISOString(),
                                    id: Math.random().toString(36).substr(2, 9),
                                    assetId: item.id.toString(),
                                    limitedStatus: null,
                                    price: 0,
                                    isBundlePart: true,
                                    assetType: assetTypeMap[item.id] || null
                                });
                            }
                        }
                    }
                } catch (e) { }
            }

            chrome.storage.local.set(state, () => {
                updateRobuxElements();
                const successModalHtml = `
                    <div id="larp-success-modal" role="dialog" tabindex="-1" style="display: block; z-index: 1042; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);" class="in modal">
                        <div class="modal-window modal-sm modal-dialog" style="margin: 0;">
                            <div class="modal-content" role="document">
                                <div class="modal-header">
                                    <button type="button" class="close larp-modal-close" title="close"><span class="icon-close"></span></button>
                                    <h4 class="modal-title">Purchase Complete</h4>
                                </div>
                                <div class="modal-body">
                                    <div class="modal-message">You have successfully bought the <span class="font-bold" data-reactroot="">${name}</span> ${itemType.toLowerCase()} from ${creator} for <span class="icon-robux-16x16"></span><span class="text-robux">${price.toLocaleString()}</span>.</div>
                                    <div class="img-container modal-image-container">
                                        <span class="thumbnail-2d-container modal-thumb"><img class="" src="${image}" alt="${name}" title="${name}"></span>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <div class="loading"></div>
                                    <div class="modal-buttons">
                                        <button type="button" class="modal-button btn-primary-md btn-min-width" id="larp-customize">Customize</button>
                                        <button type="button" class="modal-button btn-control-md btn-min-width" id="larp-not-now">Not Now</button>
                                    </div>
                                    <div class="text-footer">
                                        <span>Your balance after this transaction will be <span class="icon-robux-gray-16x16"></span><span class="text-robux">${newBalanceFormatted}</span>.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', successModalHtml);
                const successModal = document.getElementById('larp-success-modal');
                const cleanUpSuccess = () => { successModal.remove(); overlay.remove(); };
                successModal.querySelector('.close').onclick = cleanUpSuccess;
                successModal.querySelector('#larp-customize').onclick = () => { window.location.href = "https://www.roblox.com/my/avatar"; };
                successModal.querySelector('#larp-not-now').onclick = () => {
                    localStorage.setItem("itemOwned", true);
                    const currentUrl = window.location.href;
                    const match = currentUrl.match(/\/(\d+)\//);
                    if (match && match[1]) {
                        const itemId = match[1];
                        let itemDatabase = JSON.parse(localStorage.getItem('itemDB')) || [];
                        if (!itemDatabase.includes(itemId)) {
                            itemDatabase.push(itemId);
                            localStorage.setItem('itemDB', JSON.stringify(itemDatabase));
                        }
                    }
                    cleanUpSuccess();
                    window.location.reload();
                };
            });
        }
    };
}

function handleOwnedStatus() {
    const assetId = getAssetIdFromUrl();
    if (!assetId) return;
    const isBought = state.inventory.some(item => String(item.assetId) === String(assetId));
    if (!isBought) return;

    const theme = getResolvedTheme();
    const statusTextColor = (theme === 'dark') ? '#eee' : '#191b1d';

    const creatorArea = document.querySelector('.item-details-creator-container, .item-details .text-label, [data-testid="share-item-creator"]');
    if (creatorArea) {
        const badge = creatorArea.querySelector('[data-rblx-verified-badge-icon], .verified-badge, .icon-verified-badge-tiny, [data-testid="verified-badge"], .verified-badge-icon-item-details');
        const existing = creatorArea.querySelector('.item-owned');
        if (!existing) {
            const ownedWrapper = document.createElement('span');
            ownedWrapper.className = 'item-owned larp-owned-checkmark';
            ownedWrapper.style.cssText = 'display: inline-flex; align-items: center; margin-left: 8px; vertical-align: middle;';
            ownedWrapper.innerHTML = `
                <div class="label-checkmark" style="background-color: #00b06f; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; margin-right: 5px;">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.5 4L4 6.5L8.5 1.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <span style="color: ${statusTextColor}; font-size: 14px; font-weight: 400; white-space: nowrap;">Item Owned</span>
            `;
            if (badge) badge.after(ownedWrapper); else creatorArea.appendChild(ownedWrapper);
        } else if (badge && badge.nextSibling !== existing) {
            badge.after(existing);
        }
    }

    const detailsSection = document.querySelector('.item-details-section, #item-details');
    if (detailsSection) {
        let priceRow = detailsSection.querySelector('.price-row-container');
        const ownedHtml = `
            <div class="price-container-text">
                <div class="item-first-line" style="color: ${statusTextColor}; font-size: 16px;">This item is available in your inventory.</div>
            </div>
            <a id="edit-avatar-button" href="/my/avatar" class="btn-control-md" style="display: flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0;">
                <span class="icon-nav-charactercustomizer"></span>
            </a>
        `;
        if (!priceRow) {
            priceRow = document.createElement('div');
            priceRow.className = 'price-row-container larp-owned-row';
            priceRow.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid ${theme === 'dark' ? '#393b3d' : '#e3e5e7'}; margin-bottom: 15px;`;
            priceRow.innerHTML = ownedHtml;
            const creatorLine = detailsSection.querySelector('.item-name-container, [data-testid="share-item-creator"]')?.parentElement;
            if (creatorLine) creatorLine.after(priceRow); else detailsSection.prepend(priceRow);
        } else if (!priceRow.classList.contains('larp-owned-row')) {
            priceRow.classList.add('larp-owned-row');
            priceRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
            priceRow.innerHTML = ownedHtml;
        }
    }

    const hideSelectors = ['.item-purchase-button-container', '.buy-button-container', '.action-button-container', '#item-purchase-buttons', '.best-price-section', '.reseller-list-container', '.robux-buy-button-container', '.item-card-buttons'];
    hideSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.style.setProperty('display', 'none', 'important'));
    });
}