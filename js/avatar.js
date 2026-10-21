// LarpBlox - Avatar Selection and Rendering Logic

function applyRenderToImgs(url, targetImgs) {
    targetImgs.forEach(img => {
        if (!url) return;
        if (img.src !== url) img.src = url;
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

function isOwnProfilePage() {
    const c = document.querySelector('.profile-platform-container');
    if (c && c.dataset && c.dataset.profileId) {
        if (!state.realUserId) return true;
        return String(c.dataset.profileId) === String(state.realUserId);
    }
    if (!location.pathname.includes('/users/')) return false;
    const meta = document.querySelector('meta[name="user-data"]');
    const m = location.pathname.match(/\/users\/(\d+)/);
    if (meta && m && meta.dataset && meta.dataset.userid) return m[1] === meta.dataset.userid;
    return Array.from(document.querySelectorAll('a, button, span'))
        .some(el => el.textContent.trim() === 'Edit Profile' || el.textContent.trim() === 'Edit Avatar');
}

async function handleAvatarLarping() {
    const isAvatarPage = window.location.href.includes('/my/avatar');
    const isProfilePage = window.location.href.includes('/users/') && window.location.href.includes('/profile');
    const isMyProfile = isProfilePage && isOwnProfilePage();

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
            mainImg = Array.from(document.querySelectorAll('img')).filter(img => {
                const src = img.src.toLowerCase();
                if (!src.includes('/avatar/')) return false;
                if (img.width < 100 && img.height < 100) return false;
                if (img.closest('.rbx-header') || img.closest('.item-card') || img.closest('.item-card-container')) return false;
                return img.width > 200 || img.height > 200;
            })[0];
        }
        if (mainImg) targetImgs.push(mainImg);
    } else if (isMyProfile) {
        const bigAvatar = Array.from(document.querySelectorAll(
            '.profile-avatar-left img, .profile-avatar-left .thumbnail-2d-container, .currently-wearing-avatar-with-background img'
        )).filter(el => el.tagName === 'IMG' || el.classList.contains('thumbnail-2d-container'));

        const profileImgs = bigAvatar
            .map(el => el.tagName === 'IMG' ? el : el.querySelector('img'))
            .filter(Boolean)
            .concat(Array.from(document.querySelectorAll(
                '.user-profile-header-details-avatar-container img, .avatar-card-image'
            )));

        profileImgs.forEach(img => {
            const w = img.offsetWidth || img.clientWidth || (img.parentElement ? img.parentElement.offsetWidth : 0);
            const h = img.offsetHeight || img.clientHeight || (img.parentElement ? img.parentElement.offsetHeight : 0);
            img.dataset.needsCrop = (w > 0 && w < 250 && h < 250) ? 'true' : 'false';
        });
        targetImgs.push(...profileImgs);
    }

    targetImgs.forEach(img => {
        if (!img.dataset.larpOriginal && !img.src.startsWith('data:') && !img.src.includes('/avatar/render') && !img.src.startsWith('blob:')) {
            img.dataset.larpOriginal = img.src;
        }
    });

    const isTargetLarp = !!state.larpTarget;
    const equippedLarpItems = isTargetLarp
        ? []
        : state.inventory.filter(item => (state.equipped || []).includes(item.id));
    const isLarping = !!state.larpId || equippedLarpItems.length > 0;

    if (!isLarping) {
        targetImgs.forEach(img => {
            if (img.dataset.larpOriginal && img.src !== img.dataset.larpOriginal) img.src = img.dataset.larpOriginal;
            if (img.dataset.needsCrop === 'true') {
                if (img.parentElement) img.parentElement.style.overflow = '';
                img.style.objectFit = '';
                img.style.objectPosition = '';
                img.style.transform = '';
                img.style.transformOrigin = '';
            }
        });
        return;
    }

    const equippedAssetIds = equippedLarpItems.map(item => Number(item.assetId)).filter(id => id && !isNaN(id));
    const colorHash = window._larpCustomBodyColors ? JSON.stringify(window._larpCustomBodyColors) : '';
    const comboKey = (state.larpId || 'self') + ':' + equippedAssetIds.slice().sort().join(',') + '|' + colorHash;

    if (window._larpComboKey === comboKey) {
        if (window._larpRenderCache) applyRenderToImgs(window._larpRenderCache, targetImgs);
        return;
    }

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
                const res = await fetch('https://users.roblox.com/v1/users/authenticated');
                targetUserId = (await res.json()).id;
            }
            if (!targetUserId) { window._larpComboKey = null; return; }

            const newUrl = await renderAvatarWithItems({
                userId: targetUserId,
                assetIds: equippedAssetIds,
                bodyColors: window._larpCustomBodyColors || null
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
            console.error('[LarpBlox] Render error:', e);
            window._larpComboKey = null;
        }
    })();
}