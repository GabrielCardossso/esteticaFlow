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

    function toast(message, type, options) {
        options = options || {};
        var host = ensureToastHost();
        var el = document.createElement('div');
        el.className = 'toast toast-' + (type || 'info');
        el.setAttribute('role', 'status');

        var text = document.createElement('span');
        text.className = 'toast-message';
        text.textContent = message;
        el.appendChild(text);

        if (options.undoUrl && options.csrfToken) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'toast-undo';
            btn.textContent = 'Desfazer';
            btn.addEventListener('click', function () {
                var form = document.createElement('form');
                form.method = 'post';
                form.action = options.undoUrl;
                var csrf = document.createElement('input');
                csrf.type = 'hidden';
                csrf.name = options.csrfParam || '_csrf';
                csrf.value = options.csrfToken;
                form.appendChild(csrf);
                document.body.appendChild(form);
                form.submit();
            });
            el.appendChild(btn);
        }

        host.appendChild(el);
        var ttl = options.duration || (options.undoUrl ? 5000 : 3200);
        setTimeout(function () {
            el.classList.add('is-leaving');
            setTimeout(function () { el.remove(); }, 220);
        }, ttl);
        return el;
    }

    function openConfirm(message, onConfirm, options) {
        options = options || {};
        var existing = document.getElementById('confirm-modal');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'confirm-modal';
        overlay.className = 'confirm-overlay';
        overlay.innerHTML =
            '<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">' +
            '<h2 id="confirm-title">' + (options.title || 'Confirmar exclusão') + '</h2>' +
            '<p class="confirm-message"></p>' +
            '<p class="confirm-hint">Ela poderá impactar os dados relacionados e, dependendo do caso, não poderá ser desfeita.</p>' +
            '<div class="confirm-actions">' +
            '<button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>' +
            '<button type="button" class="btn btn-danger" data-action="ok">Confirmar</button>' +
            '</div></div>';
        overlay.querySelector('.confirm-message').textContent =
            message || 'Tem certeza que deseja realizar esta ação?';
        document.body.appendChild(overlay);

        function close() {
            overlay.classList.add('is-closing');
            setTimeout(function () { overlay.remove(); }, 180);
        }
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) close();
        });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
        overlay.querySelector('[data-action="ok"]').addEventListener('click', function () {
            close();
            onConfirm();
        });
        document.addEventListener('keydown', function onKey(event) {
            if (event.key === 'Escape') {
                close();
                document.removeEventListener('keydown', onKey);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                close();
                onConfirm();
                document.removeEventListener('keydown', onKey);
            }
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
            if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
            } else {
                form.submit();
            }
        }, {
            title: form.getAttribute('data-confirm-title') || 'Confirmar exclusão'
        });
    });

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-toast-message]').forEach(function (node) {
            toast(node.getAttribute('data-toast-message'), node.getAttribute('data-toast-type') || 'sucesso', {
                undoUrl: node.getAttribute('data-undo-url') || null,
                csrfToken: node.getAttribute('data-csrf-token') || null,
                csrfParam: node.getAttribute('data-csrf-param') || '_csrf',
                duration: node.getAttribute('data-undo-url') ? 5000 : 3200
            });
            node.remove();
        });
    });

    window.EsteticaUI = { toast: toast, confirm: openConfirm };
})();
