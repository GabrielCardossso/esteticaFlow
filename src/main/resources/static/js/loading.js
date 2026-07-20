(function () {
    'use strict';

    function ensureOverlay() {
        var overlay = document.querySelector('.page-loading');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'page-loading';
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-live', 'polite');
        var spinner = document.createElement('div');
        spinner.className = 'page-loading-spinner';
        spinner.setAttribute('role', 'status');
        spinner.setAttribute('aria-label', 'Carregando');
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
        return overlay;
    }

    function show() {
        var overlay = ensureOverlay();
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
    }

    function shouldSkipLink(anchor) {
        if (!anchor || !anchor.href) return true;
        if (anchor.target === '_blank') return true;
        if (anchor.hasAttribute('download')) return true;
        var href = anchor.getAttribute('href') || '';
        if (href.charAt(0) === '#') return true;
        if (anchor.dataset.noLoading === 'true') return true;
        try {
            var url = new URL(anchor.href, window.location.origin);
            if (url.origin !== window.location.origin) return true;
        } catch (e) {
            return true;
        }
        return false;
    }

    document.addEventListener('submit', function (event) {
        var form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.dataset.noLoading === 'true') return;
        show();
    });

    document.addEventListener('click', function (event) {
        var anchor = event.target.closest('a[href]');
        if (!anchor || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (shouldSkipLink(anchor)) return;
        show();
    });
})();
