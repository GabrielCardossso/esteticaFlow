(function () {
    'use strict';

    const HEX_PADRAO = {
        teal: '#157f8f',
        verde: '#15803d',
        'verde-escuro': '#14532d',
        azul: '#2563eb',
        'azul-escuro': '#1e3a8a',
        roxo: '#7c3aed',
        indigo: '#4f46e5',
        laranja: '#ea580c',
        vermelho: '#dc2626',
        ambar: '#d97706',
        rosa: '#db2777',
        ciano: '#0891b2',
        dourado: '#b7791f',
        grafite: '#475569'
    };

    const CORES = new Set(Object.keys(HEX_PADRAO).concat(['custom']));

    function normalizar(cor) {
        const valor = (cor || '').trim().toLowerCase();
        return CORES.has(valor) ? valor : 'teal';
    }

    function hexValido(hex) {
        return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex.trim());
    }

    function misturar(hex, fatorEscuro) {
        // fatorEscuro 0 = cor original, 1 = preto
        const raw = hex.replace('#', '');
        const r = parseInt(raw.slice(0, 2), 16);
        const g = parseInt(raw.slice(2, 4), 16);
        const b = parseInt(raw.slice(4, 6), 16);
        const f = Math.min(1, Math.max(0, fatorEscuro));
        const nr = Math.round(r * (1 - f));
        const ng = Math.round(g * (1 - f));
        const nb = Math.round(b * (1 - f));
        return '#' + [nr, ng, nb].map(function (n) {
            return n.toString(16).padStart(2, '0');
        }).join('');
    }

    function aplicarCustom(hex) {
        const root = document.documentElement;
        const base = hexValido(hex) ? hex.trim().toLowerCase() : '#157f8f';
        root.style.setProperty('--accent', base);
        root.style.setProperty('--accent-hover', misturar(base, 0.12));
        root.style.setProperty('--accent-soft', misturar(base, 0.28));
        root.style.setProperty('--sidebar', misturar(base, 0.55));
        root.style.setProperty('--brand', misturar(base, 0.2));
        root.dataset.accent = 'custom';
        root.dataset.temaCor = 'custom';
        root.dataset.temaHex = base;
        return base;
    }

    function limparCustom() {
        const root = document.documentElement;
        ['--accent', '--accent-hover', '--accent-soft', '--sidebar', '--brand'].forEach(function (v) {
            root.style.removeProperty(v);
        });
    }

    function aplicar(cor, hex) {
        const root = document.documentElement;
        const corSalva = normalizar(cor || root.dataset.temaCor || 'teal');
        root.dataset.theme = 'claro';
        root.dataset.temaCor = corSalva;
        if (corSalva === 'custom') {
            const aplicado = aplicarCustom(hex || root.dataset.temaHex || '#157f8f');
            root.dataset.temaHex = aplicado;
        } else {
            limparCustom();
            root.dataset.accent = corSalva;
            root.dataset.temaHex = HEX_PADRAO[corSalva] || '#157f8f';
        }
        try {
            localStorage.setItem('esteticaflow.tema.cor', corSalva);
            localStorage.setItem('esteticaflow.tema.hex', root.dataset.temaHex || '#157f8f');
        } catch (e) { /* ignore */ }
        return root.dataset.temaHex;
    }

    function syncColorInput(hex) {
        const input = document.getElementById('hex');
        if (input && hexValido(hex)) {
            input.value = hex.toLowerCase();
        }
        const label = document.querySelector('[data-tema-hex-label]');
        if (label && hexValido(hex)) {
            label.textContent = hex.toLowerCase();
        }
    }

    window.EsteticaFlowTheme = {
        apply: aplicar,
        applyPreset: function (nome) {
            const hex = aplicar(nome);
            syncColorInput(hex);
            const radio = document.querySelector('input[name="cor"][value="' + nome + '"]');
            if (radio) radio.checked = true;
        },
        previewHex: function (hex) {
            if (!hexValido(hex)) return;
            const radio = document.getElementById('cor-custom');
            if (radio) radio.checked = true;
            aplicar('custom', hex);
        }
    };

    const initialCor = normalizar(document.documentElement.dataset.temaCor || 'teal');
    const initialHex = hexValido(document.documentElement.dataset.temaHex)
        ? document.documentElement.dataset.temaHex
        : (HEX_PADRAO[initialCor] || '#157f8f');
    aplicar(initialCor, initialHex);
    syncColorInput(document.documentElement.dataset.temaHex);

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('input[name="cor"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                if (radio.value === 'custom') {
                    const hex = document.getElementById('hex')?.value || '#157f8f';
                    window.EsteticaFlowTheme.previewHex(hex);
                } else {
                    window.EsteticaFlowTheme.applyPreset(radio.value);
                }
            });
        });
        const hexInput = document.getElementById('hex');
        if (hexInput) {
            hexInput.addEventListener('input', function () {
                window.EsteticaFlowTheme.previewHex(hexInput.value);
            });
        }
    });
})();
