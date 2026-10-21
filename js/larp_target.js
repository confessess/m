// LarpBlox - Profile Clone (bio + target state)

let _myUserId = null;
let _realBio = null;

async function getMyUserId() {
    if (_myUserId) return _myUserId;
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
        const r = await fetch(`https://users.roblox.com/v1/users/${id}`, { credentials: 'include' });
        _realBio = (await r.json()).description ?? '';
    } catch (e) { _realBio = ''; }
    return _realBio;
}

const BIO_SELECTORS = [
    '[data-testid="profile-about-content"]',
    '.profile-about-content-text',
    '#about .profile-about-content',
    '.about-section .text-lead',
    '#profile-about-content',
    'pre.profile-about-content-text',
    '.profile-about pre'
];

function isOwnProfile() {
    if (!location.pathname.includes('/users/')) return false;
    const meta = document.querySelector('meta[name="user-data"]');
    const mine = meta && meta.dataset ? meta.dataset.userid : null;
    const m = location.pathname.match(/\/users\/(\d+)/);
    if (mine && m && m[1] === mine) return true;
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
        document.querySelectorAll('div, pre, span, p').forEach((el) => {
            if (el.children.length === 0 && el.textContent.trim() === rt) found.add(el);
        });
    } else {
        document.querySelectorAll('div, pre, span, p').forEach((el) => {
            const t = el.textContent.trim();
            if (el.children.length === 0 && /no bio|hasn't added|has not added/i.test(t)) found.add(el);
        });
    }

    found.forEach((el) => {
        if (el.textContent !== wanted) el.textContent = wanted;
    });
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