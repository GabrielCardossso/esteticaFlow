(function () {
    const menu = document.querySelector(".side-menu");
    if (!menu) {
        return;
    }

    const toggle = menu.querySelector(".mobile-menu-toggle");
    const backdrop = menu.querySelector(".mobile-nav-backdrop");
    const links = menu.querySelector("#side-menu-links");
    if (!toggle || !links) {
        return;
    }

    function setOpen(aberto) {
        menu.classList.toggle("is-open", aberto);
        document.body.classList.toggle("nav-open", aberto);
        toggle.setAttribute("aria-expanded", aberto ? "true" : "false");
        toggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
        if (backdrop) {
            backdrop.hidden = !aberto;
        }
    }

    function fechar() {
        setOpen(false);
    }

    toggle.addEventListener("click", function () {
        setOpen(!menu.classList.contains("is-open"));
    });

    if (backdrop) {
        backdrop.addEventListener("click", fechar);
    }

    links.querySelectorAll("a.menu-button").forEach(function (link) {
        link.addEventListener("click", fechar);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            fechar();
        }
    });

    window.addEventListener("resize", function () {
        if (window.matchMedia("(min-width: 901px)").matches) {
            fechar();
        }
    });

    document.querySelectorAll("main .table").forEach(function (table) {
        if (table.parentElement && table.parentElement.classList.contains("table-responsive")) {
            return;
        }
        const wrap = document.createElement("div");
        wrap.className = "table-responsive";
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
    });
})();
