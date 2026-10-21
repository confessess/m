// LarpBlox - Follower / Following / Friends spoofer + pill state sync

const STAT_LABELS = { followers: 'Followers', following: 'Following', friends: 'Friends' };
const STAT_RE = /^([\d.,]+)\s*([KMB]?)\+?\s*(Followers|Following|Friends)$/i;

function findStatPills() {
    const hits = Array.from(document.querySelectorAll('a, button, div, span'))
        .filter((el) => STAT_RE.test(el.textContent.trim()));
    // keep only the outermost match so we don't style a nested span
    return hits.filter((el) => !hits.some((o) => o !== el && o.contains(el)));
}

function setPillText(el, text) {
    const kid = el.children.length === 1 ? el.children[0] : null;
    if (kid && kid.children.length === 0 && kid.textContent.trim().length) {
        if (kid.textContent !== text) kid.textContent = text;
    } else if (el.textContent !== text) {
        el.textContent = text;
    }
}

function handleFollowerChanges() {
    const pills = findStatPills();
    if (!pills.length) return;

    // record the REAL count once, before we overwrite anything
    pills.forEach((el) => {
        if (el.dataset.larpReal !== undefined) return;
        const m = el.textContent.trim().match(STAT_RE);
        if (m) el.dataset.larpReal = Number(m[1].replace(/[^\d]/g, '')) || 0;
    });

    const want = {
        followers: state.larpFollowers,
        following: state.larpFollowing,
        friends: state.larpFriends
    };
    if (want.followers == null && want.following == null && want.friends == null) return;

    // diff the class lists of a zero-count pill vs a non-zero pill
    const zeroRef = pills.find((el) => Number(el.dataset.larpReal) === 0);
    const activeRef = pills.find((el) => Number(el.dataset.larpReal) > 0);

    let activeOnly = [];
    let zeroOnly = [];
    if (zeroRef && activeRef) {
        const z = new Set(zeroRef.classList);
        const a = new Set(activeRef.classList);
        activeOnly = [...a].filter((c) => !z.has(c));
        zeroOnly = [...z].filter((c) => !a.has(c));
    }

    pills.forEach((el) => {
        const m = el.textContent.trim().match(STAT_RE);
        if (!m) return;
        const label = m[3].toLowerCase();
        const value = want[label];
        if (value == null) return;

        setPillText(el, Number(value).toLocaleString() + ' ' + m[3]);

        if (!activeOnly.length && !zeroOnly.length) return;

        if (Number(value) > 0) {
            activeOnly.forEach((c) => el.classList.add(c));
            zeroOnly.forEach((c) => el.classList.remove(c));
        } else {
            zeroOnly.forEach((c) => el.classList.add(c));
            activeOnly.forEach((c) => el.classList.remove(c));
        }
    });
}