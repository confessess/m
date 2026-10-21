// LarpBlox - Transactions page fallback
// The MAIN-world hook now rewrites /v2/users/{id}/transactions, so Roblox's
// own table renders the fake rows. This file only patches the balance header.

(function () {
    if (!window.location.href.includes('/transactions')) return;

    const STYLE_ID = 'larp-tx-style';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
            .larp-tx-pos { color: #00b06f !important; font-weight: 600; }
            .larp-tx-neg { color: #ef4444 !important; font-weight: 600; }
        `;
        (document.head || document.documentElement).appendChild(s);
    }

    function patchBalance() {
        chrome.storage.local.get(['fakeRobux'], (res) => {
            const bal = res.fakeRobux;
            if (bal == null) return;
            document.querySelectorAll(
                '.robux-balance, .amount.icon-robux-container, [data-testid="robux-amount"], .balance-label'
            ).forEach((el) => {
                if (el.closest('tr') || el.closest('.table-body')) return;
                const txt = bal.toLocaleString();
                if (el.textContent.trim() !== txt) el.textContent = txt;
            });
        });
    }

    injectStyle();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchBalance);
    } else {
        patchBalance();
    }

    setInterval(patchBalance, 1000);
})();