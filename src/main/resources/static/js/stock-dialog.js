(function () {
    const dialog = document.getElementById("stock-dialog");
    if (!dialog) {
        return;
    }

    const title = document.getElementById("stock-dialog-title");
    const saldo = document.getElementById("stock-dialog-saldo");
    const minimo = document.getElementById("stock-dialog-minimo");
    const minimoInput = document.getElementById("stock-minimum-quantity");
    const entradaForm = document.getElementById("stock-entry-form");
    const saidaForm = document.getElementById("stock-exit-form");
    const minimoForm = document.getElementById("stock-minimum-form");
    const entradaQuantidade = document.getElementById("stock-entry-quantity");
    const entradaValor = document.getElementById("stock-entry-valor");
    const entradaMotivo = document.getElementById("stock-entry-motivo");

    document.querySelectorAll(".stock-action-button").forEach(function (button) {
        button.addEventListener("click", function () {
            title.textContent = button.dataset.produto;
            saldo.textContent = button.dataset.saldo;
            minimo.textContent = button.dataset.minimo;
            minimoInput.value = button.dataset.minimo;
            entradaForm.action = button.dataset.entradaUrl;
            saidaForm.action = button.dataset.saidaUrl;
            minimoForm.action = button.dataset.minimoUrl;
            entradaQuantidade.value = "";
            if (entradaValor) {
                entradaValor.value = "";
            }
            if (entradaMotivo) {
                entradaMotivo.value = "";
            }
            dialog.showModal();
            entradaQuantidade.focus();
        });
    });

    dialog.querySelectorAll("[data-stock-dialog-close]").forEach(function (button) {
        button.addEventListener("click", function () {
            dialog.close();
        });
    });

    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
            dialog.close();
        }
    });
})();
