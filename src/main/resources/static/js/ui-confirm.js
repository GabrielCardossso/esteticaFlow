(function () {
    'use strict';

    function ensureToastHost() {
        var host = document.getElementById('toast-host');
        if (host) return host;
        host = document.createElement('div');
        host.id = 'toast-host';
        host.className = 'toast-host';
        host.setAttribute('aria-live', 'polite');
        document.body.appendChild(host);
        return host;
    }

    function toast(message, type) {
        var host = ensureToastHost();
        var el = document.createElement('div');
        el.className = 'toast toast-' + (type || 'info');
        el.textContent = message;
        host.appendChild(el);
        setTimeout(function () {
            el.classList.add('is-leaving');
            setTimeout(function () { el.remove(); }, 250);
        }, 3200);
    }

    function openConfirm(message, onConfirm) {
        var existing = document.getElementById('confirm-modal');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'confirm-modal';
        overlay.className = 'confirm-overlay';
        overlay.innerHTML =
            '<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">' +
            '<h2 id="confirm-title">Confirmar ação</h2>' +
            '<p class="confirm-message"></p>' +
            '<div class="confirm-actions">' +
            '<button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>' +
            '<button type="button" class="btn btn-primary" data-action="ok">Confirmar</button>' +
            '</div></div>';
        overlay.querySelector('.confirm-message').textContent = message;
        document.body.appendChild(overlay);
        function close() { overlay.remove(); }
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) close();
        });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
        overlay.querySelector('[data-action="ok"]').addEventListener('click', function () {
            close();
            onConfirm();
        });
        overlay.querySelector('[data-action="ok"]').focus();
    }

    document.addEventListener('submit', function (event) {
        var form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        var message = form.getAttribute('data-confirm');
        if (!message || form.dataset.confirmed === 'true') return;
        event.preventDefault();
        openConfirm(message, function () {
            form.dataset.confirmed = 'true';
            form.requestSubmit();
        });
    });

    window.EsteticaUI = { toast: toast, confirm: openConfirm };
})();
