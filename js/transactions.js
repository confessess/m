// LarpBlox - Transactions page fallback
// The MAIN-world hook rewrites /v2/users/{id}/transactions, so Roblox's own
// table renders the fake rows. This only patches the balance header.

(function () {
    if (!window.location.href.includes('/transactions')) return;

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchBalance);
    } else {
        patchBalance();
    }

    setInterval(patchBalance, 1000);
})();