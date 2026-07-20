(function () {
    'use strict';

    var cfg = window.EsteticaFlowSession || {};
    if (!cfg.enabled) return;

    var timeoutMs = (cfg.minutes || 30) * 60 * 1000;
    var warnBeforeMs = Math.min(60 * 1000, Math.floor(timeoutMs * 0.15));
    var lastActivity = Date.now();
    var warnOpen = false;
    var timer = null;

    function ping() {
        fetch('/api/sessao/ping', { credentials: 'same-origin' }).catch(function () {});
    }

    function markActivity() {
        lastActivity = Date.now();
        if (warnOpen) return;
        ping();
    }

    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(function (evt) {
        document.addEventListener(evt, markActivity, { passive: true });
    });

    function logout() {
        var form = document.createElement('form');
        form.method = 'post';
        form.action = '/logout';
        if (cfg.csrfToken) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = cfg.csrfParam || '_csrf';
            input.value = cfg.csrfToken;
            form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
    }

    function closeWarn() {
        var modal = document.getElementById('session-timeout-modal');
        if (modal) modal.remove();
        warnOpen = false;
    }

    function openWarn() {
        if (warnOpen) return;
        warnOpen = true;
        var overlay = document.createElement('div');
        overlay.id = 'session-timeout-modal';
        overlay.className = 'confirm-overlay';
        overlay.innerHTML =
            '<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="session-title">' +
            '<h2 id="session-title">Sua sessão está prestes a expirar</h2>' +
            '<p class="confirm-message">Por inatividade, você será desconectado em breve.</p>' +
            '<div class="confirm-actions">' +
            '<button type="button" class="btn btn-secondary" data-action="logout">Encerrar sessão</button>' +
            '<button type="button" class="btn btn-primary" data-action="stay">Permanecer conectado</button>' +
            '</div></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('[data-action="stay"]').addEventListener('click', function () {
            closeWarn();
            lastActivity = Date.now();
            ping();
        });
        overlay.querySelector('[data-action="logout"]').addEventListener('click', logout);
    }

    function tick() {
        var idle = Date.now() - lastActivity;
        if (idle >= timeoutMs) {
            logout();
            return;
        }
        if (idle >= timeoutMs - warnBeforeMs) {
            openWarn();
        }
    }

    timer = setInterval(tick, 5000);
    ping();
})();
