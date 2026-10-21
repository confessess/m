// LarpBlox - Follower / Following / Friends spoofer (verified against live DOM)

const STAT_RE = /^([\d.,]+)\s*([KMB]?)\+?\s*(Friends|Followers|Following)$/i;

const ACTIVE_ONLY = ['clip', 'group/interactable', 'focus-visible:outline-focus', 'disabled:outline-none', 'cursor-pointer'];
const ZERO_ONLY = ['opacity-[0.5]'];

function findStatPills() {
    const row = document.querySelector('#user-profile-header-bg .flex-nowrap.gap-small.flex');
    let pills = row ? Array.from(row.querySelectorAll('a')) : [];
    if (!pills.length) {
        pills = Array.from(document.querySelectorAll('a'))
            .filter((a) => STAT_RE.test(a.textContent.trim()));
    }
    return pills.filter((a) => STAT_RE.test(a.textContent.trim()));
}

function formatStat(n) {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
}

function setPillText(a, text) {
    const span = a.querySelector('span.padding-y-xsmall') || a.querySelector('span');
    if (span) { if (span.textContent !== text) span.textContent = text; }
    else if (a.textContent !== text) a.textContent = text;
}

function stylePill(a, active) {
    a.setAttribute('aria-disabled', active ? 'false' : 'true');
    if (active) {
        ACTIVE_ONLY.forEach((c) => a.classList.add(c));
        ZERO_ONLY.forEach((c) => a.classList.remove(c));
    } else {
        ZERO_ONLY.forEach((c) => a.classList.add(c));
        ACTIVE_ONLY.forEach((c) => a.classList.remove(c));
    }
}

function handleFollowerChanges() {
    const pills = findStatPills();
    if (!pills.length) return;

    const want = {
        friends: state.larpFriends,
        followers: state.larpFollowers,
        following: state.larpFollowing
    };
    if (want.friends == null && want.followers == null && want.following == null) return;

    pills.forEach((a) => {
        const m = a.textContent.trim().match(STAT_RE);
        if (!m) return;
        const label = m[3];
        const value = want[label.toLowerCase()];
        if (value == null) return;

        setPillText(a, formatStat(value) + ' ' + label);
        stylePill(a, Number(value) > 0);
    });
}