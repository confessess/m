var state = {
    fakeRobux: 10000000,
    setFakeRobux: 10000000,
    inventory: [],
    history: [],
    transactions: [],
    equipped: [],
    larpId: null,
    larpTarget: null,
    larpBio: null,
    larpDisplayName: '',
    larpUsername: '',
    larpFollowers: 0,
    larpFollowing: 0,
    larpFriends: 0,
    realUserId: null,
    uiMode: 'auto'
};

const ROBUX_ICON_URL = chrome.runtime.getURL('robux.png');
const ROBUX_ICON_LIGHT_URL = chrome.runtime.getURL('robux2.png');
const ROBLOX_LOGO_URL = chrome.runtime.getURL('roblox_logo.png');