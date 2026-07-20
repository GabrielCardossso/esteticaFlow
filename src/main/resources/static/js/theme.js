(function () {
    const STORAGE_COR = "esteticaflow.tema.cor";
    const CORES = new Set(["teal", "verde", "azul", "roxo", "laranja", "vermelho", "rosa", "dourado", "grafite"]);

    function normalizar(cor) {
        const valor = (cor || "").trim().toLowerCase();
        return CORES.has(valor) ? valor : "teal";
    }

    function aplicar(cor) {
        const root = document.documentElement;
        const corSalva = normalizar(cor || root.dataset.temaCor || localStorage.getItem(STORAGE_COR) || "teal");
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

    // Prioriza a cor enviada pelo servidor (evita localStorage de outra empresa/cor inválida).
    const initialCor = normalizar(document.documentElement.dataset.temaCor || "teal");
    document.documentElement.dataset.temaCor = initialCor;
    aplicar(initialCor);
})();
