// LarpBlox - Global Styles and CSS Injection

function larpHead() {
    return document.head || document.documentElement;
}

function applyGlobalStyles() {
    if (document.getElementById('larp-global-styles')) return;

    const style = document.createElement('style');
    style.id = 'larp-global-styles';

    style.textContent = `
        .profile-avatar-accoutrements .hlist,
        .profile-avatar-accoutrements ul,
        .currently-wearing-list ul,
        .slide-item-container-inner.hlist {
            display: flex !important;
            flex-wrap: nowrap !important;
            width: max-content !important;
            min-width: 100% !important;
        }

        .profile-avatar-accoutrements .hlist > li,
        .profile-avatar-accoutrements ul > li,
        .currently-wearing-list ul > li {
            display: block !important;
            float: none !important;
            flex: 0 0 auto !important;
            margin-right: 12px !important;
        }
    `;

    larpHead().appendChild(style);
}

// Add Global Style Fixes for Larp items
const larpStyle = document.createElement('style');

larpStyle.textContent = `
    :root {
        --larp-bg: #2B2E31;
        --larp-border: #393B3D;
        --larp-text: #FFFFFF;
        --larp-subtext: #ADB0B1;
        --larp-overlay: rgba(0, 0, 0, 0.55);
        --larp-modal-bg: #2B2E31;
        --larp-modal-hr: #393B3D;
        --larp-modal-text: #FFFFFF;
    }

    [data-theme-light], .light-theme {
        --larp-bg: #EBEDEF;
        --larp-border: #D6D6D6;
        --larp-text: #191B1D;
        --larp-subtext: #656667;
        --larp-overlay: rgba(0, 0, 0, 0.45);
        --larp-modal-bg: #FFFFFF;
        --larp-modal-hr: #E3E3E3;
        --larp-modal-text: #191B1D;
    }

    /* Larp injected cards */
    .avatar-card[data-sim-id],
    .list-item[data-sim-id].item-card {
        list-style: none !important;
        position: relative !important;
        box-sizing: border-box !important;
    }

    /* Equipped state */
    [data-sim-id] {
        cursor: pointer;
    }

    [data-sim-id] .item-card-thumb-container {
        position: relative !important;
        display: block !important;
    }

    /* Dark overlay while worn */
    [data-sim-id].larp-equipped .item-card-thumb-container::after {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        border-radius: 6px;
        z-index: 10;
        pointer-events: none;
    }

    /* Check badge — real DOM element inside .item-card-thumb */
    [data-sim-id] .item-card-thumb {
        position: relative !important;
    }

    [data-sim-id] .larp-check-overlay {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        background: #ffffff;
        border-radius: 4px;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.25);
    }

    [data-sim-id] .larp-check-overlay svg {
        display: block;
    }

    [data-sim-id] .larp-check-overlay path {
        stroke: #6b6b6b;
    }

    /* Item name — let Roblox's native font cascade through */
    [data-sim-id] .item-card-name {
        margin-top: 6px !important;
        line-height: 1.2 !important;
        max-height: 34px !important;
        overflow: hidden !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
    }

    /* Item creator — also native font */
    [data-sim-id] .item-card-creator {
        margin-top: 4px !important;
        line-height: 1.2 !important;
        height: 14px !important;
        overflow: hidden !important;
    }

    /* Price/owned label — native font */
    [data-sim-id] .item-card-price {
        margin-top: 7px !important;
        display: flex !important;
        align-items: center !important;
    }

    .larp-wearing-item,
    .larp-thumb-bg {
        background: var(--larp-bg) !important;
        border: none !important;
    }

    .larp-wearing-item img,
    .larp-thumb-bg img {
        background: transparent !important;
    }

    /* Modal Styling */
    .larp-modal {
        background: var(--larp-modal-bg) !important;
        color: var(--larp-modal-text) !important;
    }

    .larp-modal hr {
        border-top: 1px solid var(--larp-modal-hr) !important;
    }

    .larp-modal p,
    .larp-modal div {
        color: var(--larp-modal-text) !important;
    }

    .larp-modal img {
        display: inline-block !important;
        color: unset !important;
    }

    .larp-modal-thumb-bg {
        background: var(--larp-bg) !important;
    }

    .larp-modal-close {
        color: var(--larp-subtext) !important;
    }

    .larp-modal-secondary-btn {
        background: var(--larp-bg) !important;
        color: var(--larp-text) !important;
    }
`;

larpHead().appendChild(larpStyle);