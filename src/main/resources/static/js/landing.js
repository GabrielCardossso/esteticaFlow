(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Menu mobile ---------- */
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (toggle && nav) {
        var setOpen = function (open) {
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
            document.body.classList.toggle('nav-open', open);
        };
        toggle.addEventListener('click', function () {
            setOpen(toggle.getAttribute('aria-expanded') !== 'true');
        });
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () { setOpen(false); });
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') setOpen(false);
        });
    }

    /* ---------- Header com sombra ao rolar ---------- */
    var header = document.querySelector('.site-header');
    if (header) {
        var onScroll = function () {
            header.classList.toggle('is-scrolled', window.scrollY > 8);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ---------- Scrollspy: destaca a seção visível na navegação ---------- */
    if (nav && 'IntersectionObserver' in window) {
        var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
        var sections = navLinks
            .map(function (link) { return document.querySelector(link.getAttribute('href')); })
            .filter(Boolean);
        var setActive = function (id) {
            navLinks.forEach(function (link) {
                var active = link.getAttribute('href') === '#' + id;
                link.classList.toggle('is-active', active);
                if (active) {
                    link.setAttribute('aria-current', 'true');
                } else {
                    link.removeAttribute('aria-current');
                }
            });
        };
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        sections.forEach(function (section) { spy.observe(section); });
    }

    /* ---------- Animações de entrada ao rolar ---------- */
    if (!reduceMotion && 'IntersectionObserver' in window) {
        var revealTargets = document.querySelectorAll(
            '.section-heading, .owner-grid article, .problem-grid article, .benefit-grid article, ' +
            '.step-list li, .demo-wrap, .credibility-box, .price-card, .faq-list details, .final-cta .container'
        );
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
        revealTargets.forEach(function (element, index) {
            element.classList.add('reveal');
            element.style.transitionDelay = (index % 4) * 70 + 'ms';
            revealObserver.observe(element);
        });
    }

    /* ---------- Prévia interativa: abas ---------- */
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.demo-tabs [role="tab"]'));
    var demoTitle = document.getElementById('demo-title');
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (other) {
                var selected = other === tab;
                other.setAttribute('aria-selected', selected ? 'true' : 'false');
                var panel = document.getElementById(other.getAttribute('aria-controls'));
                if (panel) panel.hidden = !selected;
            });
            if (demoTitle) demoTitle.textContent = tab.textContent;
        });
    });

    /* ---------- Prévia interativa: agenda ---------- */
    var agendaStatuses = ['Agendado', 'Em andamento', 'Concluído'];
    var agendaFeedback = document.getElementById('agenda-feedback');
    document.querySelectorAll('.agenda-item').forEach(function (item) {
        var badge = item.querySelector('.status-badge');
        var button = item.querySelector('.agenda-advance');
        if (!badge || !button) return;
        var render = function () {
            var status = Number(item.dataset.status);
            badge.textContent = agendaStatuses[status];
            badge.className = 'status-badge status-' + status;
            button.disabled = status === agendaStatuses.length - 1;
            button.textContent = button.disabled ? 'Concluído ✓' : 'Avançar';
        };
        button.addEventListener('click', function () {
            var status = Math.min(Number(item.dataset.status) + 1, agendaStatuses.length - 1);
            item.dataset.status = String(status);
            render();
            if (agendaFeedback && status === agendaStatuses.length - 1) {
                agendaFeedback.textContent =
                    'Serviço concluído! No sistema real, você registraria o pagamento neste momento.';
            }
        });
        render();
    });

    /* ---------- Prévia interativa: estoque ---------- */
    var stockFeedback = document.getElementById('stock-feedback');
    document.querySelectorAll('.stock-item').forEach(function (item) {
        var qtyLabel = item.querySelector('.stock-qty');
        var meter = item.querySelector('meter');
        var min = Number(item.dataset.min);
        var render = function () {
            var qty = Number(item.dataset.qty);
            if (qtyLabel) qtyLabel.textContent = String(qty);
            if (meter) {
                meter.value = Math.min(qty, Number(meter.max));
                meter.textContent = qty + ' de ' + meter.max;
            }
            item.classList.toggle('is-low', qty < min);
        };
        item.querySelectorAll('[data-delta]').forEach(function (button) {
            button.addEventListener('click', function () {
                var next = Math.max(0, Number(item.dataset.qty) + Number(button.dataset.delta));
                item.dataset.qty = String(next);
                render();
                if (stockFeedback) {
                    stockFeedback.textContent = next < min
                        ? 'Produto abaixo do mínimo: no sistema real, ele aparece nos alertas do dashboard.'
                        : 'Estoque saudável. Entradas podem gerar despesa automática no financeiro.';
                }
            });
        });
        render();
    });

    /* ---------- Prévia interativa: relatório ---------- */
    var reportData = {
        semana: { total: 'R$ 2.140,00', bars: [38, 62, 48, 78, 66, 92] },
        mes: { total: 'R$ 8.420,00', bars: [55, 42, 70, 60, 85, 74] }
    };
    var reportChart = document.querySelector('.report-chart');
    var reportTotal = document.getElementById('report-total');
    var periodButtons = Array.prototype.slice.call(document.querySelectorAll('.report-toggle [data-period]'));
    var renderReport = function (period) {
        var data = reportData[period];
        if (!data || !reportChart || !reportTotal) return;
        reportTotal.textContent = data.total;
        Array.prototype.forEach.call(reportChart.children, function (bar, index) {
            bar.style.height = data.bars[index] + '%';
        });
    };
    periodButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            periodButtons.forEach(function (other) {
                other.classList.toggle('is-active', other === button);
            });
            renderReport(button.dataset.period);
        });
    });
    renderReport('semana');
})();
