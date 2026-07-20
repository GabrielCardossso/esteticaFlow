(function () {
    'use strict';

    var root = document.querySelector('[data-global-search]');
    if (!root) return;

    var input = root.querySelector('[data-global-search-input]');
    var modal = document.querySelector('[data-global-search-modal]');
    var panel = modal ? modal.querySelector('[data-global-search-results]') : null;
    var timer = null;
    if (!input || !modal || !panel) return;

    function fechar() {
        modal.hidden = true;
        input.setAttribute('aria-expanded', 'false');
    }

    function abrir() {
        modal.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }

    function escapeHtml(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function render(data) {
        panel.innerHTML = '';
        var grupos = data && data.grupos ? data.grupos : [];
        if (!grupos.length) {
            panel.innerHTML = '<p class="global-search-empty">Nenhum resultado para "' +
                escapeHtml(data && data.termo ? data.termo : '') + '".</p>';
            abrir();
            return;
        }
        grupos.forEach(function (grupo) {
            var section = document.createElement('section');
            section.className = 'global-search-group';
            var title = document.createElement('h3');
            title.textContent = grupo.categoria;
            section.appendChild(title);
            (grupo.itens || []).forEach(function (item) {
                var a = document.createElement('a');
                a.href = item.url || '#';
                a.className = 'global-search-item';
                a.innerHTML = '<strong></strong><span></span>';
                a.querySelector('strong').textContent = item.titulo || '';
                a.querySelector('span').textContent = item.subtitulo || '';
                section.appendChild(a);
            });
            panel.appendChild(section);
        });
        abrir();
    }

    function pesquisar(termo) {
        if (!termo || termo.trim().length < 2) {
            fechar();
            panel.innerHTML = '';
            return;
        }
        panel.innerHTML = '<p class="global-search-empty">Buscando...</p>';
        abrir();
        fetch('/api/busca?q=' + encodeURIComponent(termo.trim()), {
            headers: { 'Accept': 'application/json' },
            credentials: 'same-origin'
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(render)
            .catch(function () {
                panel.innerHTML = '<p class="global-search-empty">Nao foi possivel buscar agora. Tente novamente.</p>';
                abrir();
            });
    }

    input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { pesquisar(input.value); }, 250);
    });

    input.addEventListener('focus', function () {
        if (input.value.trim().length >= 2) {
            pesquisar(input.value);
        }
    });

    input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            fechar();
            input.blur();
        }
    });

    modal.querySelectorAll('[data-global-search-close]').forEach(function (el) {
        el.addEventListener('click', fechar);
    });

    document.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            input.focus();
            input.select();
        }
        if (event.key === 'Escape' && !modal.hidden) {
            fechar();
        }
    });
})();
