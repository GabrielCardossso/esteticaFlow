(function () {
    const STORAGE_COR = "esteticaflow.tema.cor";

    function aplicar(cor) {
        const root = document.documentElement;
        const corSalva = cor || localStorage.getItem(STORAGE_COR) || root.dataset.temaCor || "teal";
        root.dataset.theme = "claro";
        root.dataset.accent = corSalva;
        root.dataset.temaCor = corSalva;
        localStorage.setItem(STORAGE_COR, corSalva);
    }

    window.EsteticaFlowTheme = {
        apply: aplicar,
        syncFromForm: function (form) {
            if (!form) return;
            const cor = form.querySelector('input[name="cor"]:checked')?.value;
            aplicar(cor);
        }
    };

    const initialCor = document.documentElement.dataset.temaCor;
    if (initialCor) localStorage.setItem(STORAGE_COR, initialCor);
    aplicar(initialCor);
})();
