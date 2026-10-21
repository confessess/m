// LarpBlox - Profile Clone (bio, verified badge, target state)

let _myUserId = null;
let _realBio = null;

async function getMyUserId() {
    if (_myUserId) return _myUserId;
    if (state.realUserId) { _myUserId = state.realUserId; return _myUserId; }
    const meta = document.querySelector('meta[name="user-data"]');
    if (meta && meta.dataset && meta.dataset.userid) {
        _myUserId = meta.dataset.userid;
        return _myUserId;
    }
    try {
        const r = await fetch('https://users.roblox.com/v1/users/authenticated', { credentials: 'include' });
        _myUserId = (await r.json()).id;
    } catch (e) { }
    return _myUserId;
}

async function getRealBio() {
    if (_realBio !== null) return _realBio;
    const id = await getMyUserId();
    if (!id) { _realBio = ''; return _realBio; }
    try {
        const r = await fetch(`https://users.roblox.com/v1/users/${id}/description`, { credentials: 'include' });
        const j = await r.json();
        _realBio = (typeof j === 'string' ? j : j.description) ?? '';
    } catch (e) { _realBio = ''; }
    return _realBio;
}

const BIO_SELECTORS = [
    '.profile-content .user-description',
    '.profile-content [class*="user-description"]',
    '#user-description-container',
    '.profile-about-content-text',
    '[data-testid="profile-about-content"]',
    '.profile-about pre'
];

function isOwnProfile() {
    const c = document.querySelector('.profile-platform-container');
    if (c && c.dataset && c.dataset.profileId) {
        if (!state.realUserId) return true;
        return String(c.dataset.profileId) === String(state.realUserId);
    }
    if (!location.pathname.includes('/users/')) return false;
    const m = location.pathname.match(/\/users\/(\d+)/);
    const meta = document.querySelector('meta[name="user-data"]');
    if (m && meta && meta.dataset && meta.dataset.userid) {
        return m[1] === meta.dataset.userid;
    }
    return Array.from(document.querySelectorAll('a, button, span'))
        .some((el) => el.textContent.trim() === 'Edit Profile');
}

function resetLarpTargetCaches() {
    _myUserId = null;
    _realBio = null;
}

async function handleBioChanges() {
    if (state.larpBio == null) return;
    if (!isOwnProfile()) return;

    const wanted = state.larpBio;
    const real = await getRealBio();
    const found = new Set();

    BIO_SELECTORS.forEach((sel) => document.querySelectorAll(sel).forEach((el) => found.add(el)));

    if (real) {
        const rt = real.trim();
        document.querySelectorAll('.profile-content div, .profile-content pre, .profile-content span, .profile-content p')
            .forEach((el) => {
                if (el.children.length === 0 && el.textContent.trim() === rt) found.add(el);
            });
    } else {
        document.querySelectorAll('.profile-content div, .profile-content span, .profile-content p')
            .forEach((el) => {
                const t = el.textContent.trim();
                if (el.children.length === 0 && /no bio|hasn't added|has not added|no description/i.test(t)) found.add(el);
            });
    }

    found.forEach((el) => {
        if (el.textContent !== wanted) el.textContent = wanted;
    });
}

function handleVerifiedBadge() {
    if (!state.larpTarget) return;
    if (!isOwnProfile()) return;

    const want = !!state.larpTarget.hasVerifiedBadge;
    const nameEl = document.getElementById('profile-header-title-container-name');
    if (!nameEl) return;
    const wrapper = nameEl.parentElement;
    if (!wrapper) return;

    const existing = wrapper.querySelector('[class*="icon-filled-verified-backplate"]');

    if (want && !existing) {
        wrapper.insertAdjacentHTML('beforeend',
            `<span class="items-center gap-xxsmall inline-flex shrink-0" style="--icon-size-small:1em">
               <span class="relative flex items-center justify-center">
                 <span class="icon icon-filled-verified-backplate size-[var(--icon-size-large)] content-system-emphasis"></span>
                 <span class="icon icon-filled-verified-check size-[var(--icon-size-large)] absolute" style="color: white;"></span>
               </span>
             </span>`);
    } else if (!want && existing) {
        const group = existing.closest('span.items-center.gap-xxsmall');
        if (group) group.remove(); else existing.remove();
    }
}

function handleLarpTarget() {
    const t = state.larpTarget;
    if (!t) return;
    if (t.id && state.larpId !== t.id) {
        state.larpId = t.id;
        window._larpComboKey = null;
        window._larpRenderCache = null;
    }
}