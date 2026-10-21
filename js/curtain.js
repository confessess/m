// LarpBlox - curtain: keeps the page hidden until the larp has applied

(function () {
    var root = document.documentElement;
    if (!root) return;

    root.classList.add('larp-pending');

    var style = document.createElement('style');
    style.id = 'larp-curtain-style';
    style.textContent = [
        'html.larp-pending { background: #ffffff; }',
        'html.larp-pending body { visibility: hidden !important; }',
        'body.larp-revealed { animation: larp-fade-in 0.14s ease-out; }',
        '@keyframes larp-fade-in { from { opacity: 0.35; } to { opacity: 1; } }'
    ].join('\n');
    (document.head || root).appendChild(style);

    // match Roblox's theme as soon as body exists so there is no white flash in dark mode
    var backdropTimer = setInterval(function () {
        if (!document.body) return;
        var dark = document.body.classList.contains('dark-theme');
        root.style.background = dark ? '#191919' : '#ffffff';
        clearInterval(backdropTimer);
    }, 10);
    setTimeout(function () { clearInterval(backdropTimer); }, 3000);

    window.__larpReveal = function () {
        if (window.__larpRevealed) return;
        window.__larpRevealed = true;
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                root.classList.remove('larp-pending');
                root.style.background = '';
                if (document.body) document.body.classList.add('larp-revealed');
            });
        });
    };

    // failsafe 1 — page finished loading
    window.addEventListener('load', function () {
        setTimeout(function () { window.__larpReveal(); }, 100);
    });

    // failsafe 2 — absolute backstop
    setTimeout(function () { window.__larpReveal(); }, 2000);
})();