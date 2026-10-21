// LarpBlox - Avatar Editor Injection

const ASSET_TYPE_CATEGORIES = {
    8: 'hats',
    41: 'hair',
    42: 'face',
    43: 'neck',
    44: 'shoulder',
    45: 'front',
    46: 'back',
    47: 'waist',
    11: 'shirt',
    12: 'pants',
    2: 'tshirt',
    17: 'head',
    18: 'face',
    19: 'gear',
    32: 'package'
};

function getActiveCategory() {
    // Check URL hash first
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('accessories-hats')) return 'hats';
    if (hash.includes('accessories-hair')) return 'hair';
    if (hash.includes('accessories-face')) return 'face';
    if (hash.includes('accessories-neck')) return 'neck';
    if (hash.includes('accessories-shoulder')) return 'shoulder';
    if (hash.includes('accessories-front')) return 'front';
    if (hash.includes('accessories-back')) return 'back';
    if (hash.includes('accessories-waist')) return 'waist';
    if (hash.includes('body-hair')) return 'hair';
    if (hash.includes('body-face')) return 'face';
    if (hash.includes('body-head')) return 'head';
    if (hash.includes('clothing-shirt')) return 'shirt';
    if (hash.includes('clothing-pants')) return 'pants';
    if (hash.includes('clothing-tshirt')) return 'tshirt';
    if (hash.includes('recent')) return 'recent';

    // Check active tab buttons
    const activeTabs = document.querySelectorAll(
        '[role="tab"][aria-selected="true"], .tab.active, .category-tab.active, [data-testid*="tab"].active'
    );
    for (const tab of activeTabs) {
        const text = tab.textContent.trim().toLowerCase();
        if (text.includes('hat')) return 'hats';
        if (text.includes('hair')) return 'hair';
        if (text.includes('face')) return 'face';
        if (text.includes('neck')) return 'neck';
        if (text.includes('shoulder')) return 'shoulder';
        if (text.includes('front')) return 'front';
        if (text.includes('back')) return 'back';
        if (text.includes('waist')) return 'waist';
        if (text.includes('shirt')) return 'shirt';
        if (text.includes('pants')) return 'pants';
        if (text.includes('t-shirt') || text.includes('tshirt')) return 'tshirt';
        if (text.includes('head')) return 'head';
        if (text.includes('recent')) return 'recent';
    }

    // Default to recent if we can't detect
    return 'recent';
}

function getItemCategory(item) {
    if (!item.assetType && item.assetType !== 0) return 'recent';
    const type = Number(item.assetType);
    return ASSET_TYPE_CATEGORIES[type] || 'recent';
}

function handleInventoryInjection() {
    const isAvatar = window.location.href.includes('/my/avatar');
    if (!isAvatar) return;

    const gridSelectors = [
        '.avatar-cards',
        '[data-testid="category-items"]',
        '.item-cards-stackable',
        '.item-list',
        '#assets-items ul',
        '.items-list',
        '.item-card-list',
        '.avatar-editor-avatar-card-grid',
        '.asset-cards',
        '.card-list',
        '.hlist'
    ];

    let grid = null;
    for (const selector of gridSelectors) {
        grid = document.querySelector(selector);
        if (grid) break;
    }
    if (!grid) return;

    const realCard = grid.querySelector('.item-card:not([data-sim-id])');
    const activeCategory = getActiveCategory();

    // Filter items to only those matching the active category
    const itemsToInject = state.inventory.filter(item => {
        const itemCategory = getItemCategory(item);
        // In Recent tab, show ALL items
        if (activeCategory === 'recent') return true;
        // In category tabs, only show matching items
        return itemCategory === activeCategory;
    });

    // Sort by date (oldest last) for category tabs
    // For Recent, keep original order (newest first)
    let sortedItems = itemsToInject;
    if (activeCategory !== 'recent') {
        sortedItems = [...itemsToInject].sort((a, b) => {
            return new Date(a.date || 0) - new Date(b.date || 0);
        });
    }

    // Remove stale injected items that don't belong in this category
    const currentIds = new Set(sortedItems.map(i => i.id));
    grid.querySelectorAll('[data-sim-id]').forEach(el => {
        if (!currentIds.has(el.dataset.simId)) {
            el.remove();
        }
    });

    sortedItems.forEach(item => {
        let existing = grid.querySelector(`[data-sim-id="${item.id}"]`);
        const isEquipped = (state.equipped || []).includes(item.id);

        let limitedBadge = '';
        if (item.limitedStatus === 'limited_u') {
            limitedBadge = `<span class="restriction-icon icon-limited-unique-label"></span>`;
        } else if (item.limitedStatus === 'limited') {
            limitedBadge = `<span class="restriction-icon icon-limited-label"></span>`;
        }

        const equippedBadge = isEquipped ? `
            <div class="larp-check-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#393b3d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        ` : '';

        const itemHTML = `
        <li class="item-card avatar-card ${isEquipped ? 'larp-equipped' : ''}"
            data-sim-id="${item.id}">
            <a href="#"
               class="item-card-thumb-container"
               data-item-name="${item.name}"
               data-availability-status="Available">
                <div class="item-card-thumb"
                     data-thumbnail-target-id="${item.id}"
                     data-thumbnail-type="Asset">
                    ${equippedBadge}
                    <span class="thumbnail-2d-container">
                        <img class=""
                             src="${item.image || ROBLOX_LOGO_URL}"
                             alt="">
                    </span>
                    ${limitedBadge}
                </div>
            </a>
            <div class="item-card-details">
                <div class="item-card-name"
                     title="${item.name}">
                    ${item.name}
                </div>
            </div>
        </li>
        `.replace(/>\s+</g, '><').trim();

        if (!existing) {
            // For Recent: prepend (newest first)
            // For categories: append (oldest at bottom)
            const insertPosition = activeCategory === 'recent' ? 'afterbegin' : 'beforeend';
            grid.insertAdjacentHTML(insertPosition, itemHTML);
            existing = grid.querySelector(`[data-sim-id="${item.id}"]`);

            if (!existing) return;

            // Match Roblox card spacing and font
            if (realCard) {
                const styles = window.getComputedStyle(realCard);
                [
                    "width", "height", "minWidth", "maxWidth",
                    "margin", "padding", "boxSizing",
                    "display", "flex", "flexGrow", "flexShrink", "flexBasis"
                ].forEach(prop => {
                    existing.style[prop] = styles[prop];
                });

                const realName = realCard.querySelector('.item-card-name');
                const ourName = existing.querySelector('.item-card-name');
                if (realName && ourName) {
                    const nameStyles = window.getComputedStyle(realName);
                    ourName.style.fontFamily = nameStyles.fontFamily;
                    ourName.style.fontSize = nameStyles.fontSize;
                    ourName.style.fontWeight = nameStyles.fontWeight;
                    ourName.style.color = nameStyles.color;
                    ourName.style.letterSpacing = nameStyles.letterSpacing;
                }
            }

            existing.addEventListener('click', e => {
                e.preventDefault();
                state.equipped ||= [];
                const thumb = existing.querySelector('.item-card-thumb');
                if (!thumb) return;

                if (state.equipped.includes(item.id)) {
                    state.equipped = state.equipped.filter(id => id !== item.id);
                    existing.classList.remove('larp-equipped');
                    const check = thumb.querySelector('.larp-check-overlay');
                    if (check) check.remove();
                } else {
                    state.equipped.push(item.id);
                    existing.classList.add('larp-equipped');
                    if (!thumb.querySelector('.larp-check-overlay')) {
                        thumb.insertAdjacentHTML('afterbegin', `
                            <div class="larp-check-overlay">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17L4 12" stroke="#393b3d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        `);
                    }
                }

                chrome.storage.local.set({ equipped: state.equipped });
                handleAvatarLarping();
            });

            if ((!item.image || item.image === "") && item.assetId) {
                fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${item.assetId}&size=150x150&format=Png&isCircular=false`)
                    .then(res => res.json())
                    .then(data => {
                        const url = data?.data?.[0]?.imageUrl;
                        if (url) {
                            item.image = url;
                            const img = existing.querySelector('img');
                            if (img) img.src = url;
                            chrome.storage.local.set({ inventory: state.inventory });
                        }
                    })
                    .catch(err => console.error("[LarpBlox] Thumbnail repair failed", err));
            }
        }
    });
}