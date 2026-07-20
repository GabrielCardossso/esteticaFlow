package br.esteticadesk.web.api;

import br.esteticadesk.search.dto.BuscaGlobalDTO;
import br.esteticadesk.search.service.BuscaGlobalService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/busca")
public class BuscaGlobalController {

    private final BuscaGlobalService buscaGlobal;

    public BuscaGlobalController(BuscaGlobalService buscaGlobal) {
        this.buscaGlobal = buscaGlobal;
    }

    @GetMapping
    public BuscaGlobalDTO buscar(@RequestParam(required = false, defaultValue = "") String q) {
        return buscaGlobal.buscar(q);
    }
}
