package br.esteticadesk.search.dto;

import java.util.List;

public record BuscaGlobalDTO(String termo, List<GrupoResultado> grupos) {

    public record GrupoResultado(String categoria, List<ItemResultado> itens) {
    }

    public record ItemResultado(String titulo, String subtitulo, String url) {
    }
}
