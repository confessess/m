// LarpBlox - Avatar Selection and Rendering Logic

console.log('[LarpBlox] avatar.js reverted');

function applyRenderToImgs(url, targetImgs) {
    targetImgs.forEach(img => {
        if (!url) return;
        if (img.src !== url) {
            img.src = url;
            console.trace('[LarpBlox] image src set to:', url);
        }
        if (img.dataset.needsCrop === 'true') {
            if (img.parentElement) img.parentElement.style.overflow = 'hidden';
            img.style.objectFit = 'cover';
            img.style.objectPosition = 'center top';
            img.style.transform = 'scale(2.4)';
            img.style.transformOrigin = 'center 12%';
        } else {
            if (img.parentElement) img.parentElement.style.overflow = '';
            img.style.objectFit = '';
            img.style.objectPosition = '';
            img.style.transform = '';
            img.style.transformOrigin = '';
        }
    });
}

async function handleAvatarLarping() {
    const isAvatarPage = window.location.href.includes('/my/avatar');
    const isProfilePage = window.location.href.includes('/users/') && window.location.href.includes('/profile');

    // Check if it's OUR profile
    let isMyProfile = false;
    if (isProfilePage) {
        const metaTag = document.querySelector('meta[name="user-data"]');
        if (metaTag) {
            const myUserId = metaTag.getAttribute('data-userid');
            const match = window.location.href.match(/\/users\/(\d+)/);
            if (match && myUserId && match[1] === myUserId) {
                isMyProfile = true;
            }
        }
        if (!isMyProfile && document.body) {
            const btns = Array.from(document.querySelectorAll('a, button, span'));
            if (btns.some(el => el.textContent.trim() === 'Edit Profile' || el.textContent.trim() === 'Edit Avatar')) {
                isMyProfile = true;
            }
        }
    }

    // Grab Global Nav Icons (Sidebar & Top Right)
    const navImgs = Array.from(document.querySelectorAll('img')).filter(img => {
        if (!img.src) return false;
        if (!img.src.includes('rbxcdn.com') && !img.src.startsWith('blob:') && !img.src.startsWith('data:')) return false;
        if (img.closest('.dropdown-menu, .popover, [class*="notification"]')) return false;

        const inLeftSidebar = img.closest('#navigation, .rbx-left-col, [id*="navigation"], nav');
        const inTopHeader = img.closest('#header, .rbx-header, .navbar-right, header, [id="navbar-user-avatar"]');

        if (inLeftSidebar || inTopHeader) {
            const isAvatarClass = img.className.includes('avatar') || (img.parentElement && img.parentElement.className.includes('avatar'));
            const isAvatarSrc = img.src.toLowerCase().includes('avatar') || img.src.toLowerCase().includes('headshot');
            const isProfileLink = img.closest('a') && (img.closest('a').href.includes('/profile') || img.closest('a').href.includes('/users/'));

            return isAvatarClass || isAvatarSrc || isProfileLink;
        }
        return false;
    });

    if (!isAvatarPage && !isMyProfile && navImgs.length === 0) return;

    navImgs.forEach(img => img.dataset.needsCrop = 'true');
    let targetImgs = [...navImgs];
    if (isAvatarPage) {
        let mainImg = document.querySelector('img[src*="rbxcdn.com"][width="420"], img[alt*="Avatar"], [data-testid="avatar-preview-image"]');
        if (!mainImg) {
            const previewImgs = Array.from(document.querySelectorAll('img')).filter(img => {
                const src = img.src.toLowerCase();
                if (!src.includes('/avatar/')) return false;
                if (img.width < 100 && img.height < 100) return false;
                if (img.closest('.rbx-header') || img.closest('.item-card') || img.closest('.item-card-container')) return false;
                return img.width > 200 || img.height > 200;
            });
            mainImg = previewImgs[0];
        }
        if (mainImg) targetImgs.push(mainImg);
    } else if (isMyProfile) {
        const headerImgs = Array.from(document.querySelectorAll('.profile-header .avatar-headshot img, #profile-header img, [data-testid="profile-header"] img'));

        const avatarContainerImgs = Array.from(document.querySelectorAll('.profile-avatar-image img, #profile-avatar-left img, .profile-avatar-left img, [data-testid="profile-avatar"] img, div[class*="avatar"] img')).filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width > 60 && rect.height > 60;
        });

        const profileImgs = [...new Set([...headerImgs, ...avatarContainerImgs])].filter(img =>
            img && img.src && (img.src.includes('rbxcdn.com') || img.src.startsWith('blob:'))
            && !img.closest('[class*="friend"], .people-list, .friend-list, [class*="carousel"], .item-card, .hlist, .profile-accoutrements-slider')
        );

        profileImgs.forEach(img => {
            const width = img.offsetWidth || img.clientWidth || (img.parentElement ? img.parentElement.offsetWidth : 0);
            const height = img.offsetHeight || img.clientHeight || (img.parentElement ? img.parentElement.offsetHeight : 0);

            if (width > 0 && width < 250 && height < 250) {
                img.dataset.needsCrop = 'true';
            } else if (width >= 250 || height >= 250) {
                img.dataset.needsCrop = 'false';
            }
        });
        targetImgs.push(...profileImgs);
    }

    targetImgs.forEach(img => {
        if (!img.dataset.larpOriginal && !img.src.startsWith('data:') && !img.src.includes('roblox.com/v1/avatar/render') && !img.src.startsWith('blob:')) {
            img.dataset.larpOriginal = img.src;
        }
    });

    const equippedLarpItems = state.inventory.filter(item => (state.equipped || []).includes(item.id));
    const isLarping = !!state.larpId || equippedLarpItems.length > 0;

    if (!isLarping) {
        targetImgs.forEach(img => {
            if (img.dataset.larpOriginal && img.src !== img.dataset.larpOriginal) {
                img.src = img.dataset.larpOriginal;
            }
            if (img.dataset.needsCrop === 'true') {
                if (img.parentElement) img.parentElement.style.overflow = '';
                img.style.objectFit = '';
                img.style.objectPosition = '';
                img.style.transform = '';
                img.style.transformOrigin = '';
            }
        });
    } else {
        const equippedAssetIds = equippedLarpItems.map(item => Number(item.assetId)).filter(id => id && !isNaN(id));
        const colorHash = window._larpCustomBodyColors ? JSON.stringify(window._larpCustomBodyColors) : '';
        const comboKey = (state.larpId || 'self') + ':' + equippedAssetIds.sort().join(',') + '|' + colorHash;

        if (window._larpComboKey !== comboKey) {
            console.log('[LarpBlox] ComboKey mismatch, starting render. Target imgs count:', targetImgs.length);
            if (window._larpRenderCache && window._larpRenderCacheCombo === comboKey) {
                window._larpComboKey = comboKey;
                applyRenderToImgs(window._larpRenderCache, targetImgs);
                return;
            }

            window._larpComboKey = comboKey;

            (async () => {
                try {
                    let targetUserId = state.larpId;
                    if (!targetUserId) {
                        const meta = document.querySelector('meta[name="user-data"]');
                        if (meta) targetUserId = meta.getAttribute('data-userid');
                    }
                    if (!targetUserId) {
                        try {
                            const res = await fetch('https://users.roblox.com/v1/users/authenticated');
                            const data = await res.json();
                            targetUserId = data.id;
                        } catch (e) { }
                    }

                    if (!targetUserId) {
                        window._larpComboKey = null;
                        return;
                    }

                    const currentColors = window._larpCustomBodyColors || null;
                    const newUrl = await renderAvatarWithItems({
                        userId: targetUserId,
                        assetIds: equippedAssetIds,
                        bodyColors: currentColors
                    });

                    if (newUrl) {
                        window._larpRenderCache = newUrl;
                        window._larpRenderCacheCombo = comboKey;
                        window.__larpAvatarUrl = newUrl;
                        if (typeof pushConfig === 'function') pushConfig();
                        applyRenderToImgs(newUrl, targetImgs);
                    } else {
                        window._larpComboKey = null;
                    }
                } catch (e) {
                    console.error("[LarpBlox] Render error:", e);
                    window._larpComboKey = null;
                }
            })();
        } else if (window._larpRenderCache) {
            applyRenderToImgs(window._larpRenderCache, targetImgs);
        }
    }

    // Handle "Currently Wearing" list injection
    if (isAvatarPage || isMyProfile) {
        let wearingList = null;
        const headings = Array.from(document.querySelectorAll('h2, h3, div')).filter(el => el.textContent.trim() === 'Currently Wearing');
        if (headings.length > 0) {
            let container = headings[0].parentElement;
            while (container && container !== document.body) {
                const realItem = container.querySelector('li.list-item, li.item-card, li.avatar-status-item, [id="collection-carousel-item"], .profile-item-card');
                if (realItem) {
                    const carouselItem = realItem.closest('[id="collection-carousel-item"]') || realItem.closest('.css-izzd58-carouselItem');
                    if (carouselItem && carouselItem.parentElement) {
                        wearingList = carouselItem.parentElement;
                        break;
                    }
                    if (realItem.parentElement && realItem.parentElement.tagName === 'UL') {
                        wearingList = realItem.parentElement;
                        break;
                    }
                    if (realItem.classList.contains('item-card')) {
                        wearingList = realItem.parentElement;
                        break;
                    }
                }
                const ul = container.querySelector('ul.hlist, ul.slide-item-container-inner, ul');
                if (ul) {
                    wearingList = ul;
                    break;
                }
                container = container.parentElement;
            }
        }

        if (!wearingList) {
            const listSelectors = ['.avatar-status-list', '[data-testid="avatar-status-list"]', '.currently-wearing-list', '.profile-accoutrements-slider .hlist'];
            for (const sel of listSelectors) {
                wearingList = document.querySelector(sel);
                if (wearingList) break;
            }
        }

        if (wearingList) {
            state.inventory.forEach(item => {
                const isEquipped = (state.equipped || []).includes(item.id);
                let innerList = wearingList.tagName === 'UL' ? wearingList : (wearingList.querySelector('ul') || wearingList);
                const alreadyInList = innerList.querySelector(`[data-sim-wearing="${item.id}"]`);

                if (isEquipped && !alreadyInList) {
                    const wrapper = document.createElement(isProfilePage ? 'div' : 'li');
                    wrapper.dataset.simWearing = item.id;
                    wrapper.dataset.simId = item.id; // Added for CSS targeting

                    if (isProfilePage) {
                        wrapper.id = "collection-carousel-item";
                        wrapper.className = "css-izzd58-carouselItem";

                        let limitedBadge = '';
                        if (item.limitedStatus === 'limited_u') limitedBadge = `<span class="restriction-icon icon-limited-unique-label"></span>`;
                        else if (item.limitedStatus === 'limited') limitedBadge = `<span class="restriction-icon icon-limited-label"></span>`;

                        wrapper.innerHTML = `
                            <div>
                                <div class="item-card profile-item-card remove-panel">
                                    <div class="item-card-container">
                                        <a href="javascript:void(0)" class="item-card-link" style="text-decoration:none; cursor:default;">
                                            <div class="item-card-link">
                                                <div class="item-card-thumb-container">
                                                <div class="item-card-thumb-container-inner larp-thumb-bg" style="border-radius: 4px; overflow: hidden; border: none !important;">
                                                        <span class="thumbnail-2d-container">
                                                            <img class="" src="${item.image || ''}" alt="${item.name}" title="${item.name}">
                                                        </span>
                                                    </div>
                                                    ${limitedBadge}
                                                </div>
                                            </div>
                                            <div class="item-card-caption">
                                                <div class="item-card-name-link">
                                                    <div class="item-card-name" title="${item.name}">${item.name}</div>
                                                </div>
                                                <div class="text-overflow item-card-price font-header-2 text-subheader">
                                                    ${item.isBundlePart ? '' : (item.price > 0 ? `
                                                    <span class="icon-robux-16x16"></span>
                                                    <span class="text-robux-tile">${item.price.toLocaleString()}</span>
                                                    ` : `
                                                    <span class="text-label">${item.price === 0 ? "Free" : "Off Sale"}</span>
                                                    `)}
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        wrapper.className = 'avatar-status-item larp-wearing-item';
                        wrapper.style.cssText = "border-radius: 4px; margin: 2px; overflow: hidden;";
                        wrapper.innerHTML = `
                            <a href="#" class="avatar-status-link">
                                <span class="thumbnail-2d-container larp-thumb-bg">
                                    <img src="${item.image || ''}" alt="${item.name}" style="width:100% !important; height:100% !important; object-fit: contain;">
                                </span>
                            </a>
                        `;
                    }
                    innerList.insertAdjacentElement('afterbegin', wrapper);
                } else if (!isEquipped && alreadyInList) {
                    alreadyInList.remove();
                }
            });
        }
    }
}