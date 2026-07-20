package br.esteticadesk.common;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Monta links externos para contato rápido com o cliente (WhatsApp e rotas).
 */
public final class ContatoClienteLinks {

    private ContatoClienteLinks() {
    }

    public static String whatsapp(String telefone) {
        var digitos = somenteDigitos(telefone);
        if (digitos == null || digitos.length() < 10) {
            return null;
        }
        if (!digitos.startsWith("55")) {
            digitos = "55" + digitos;
        }
        return "https://wa.me/" + digitos + "?text=" + URLEncoder.encode("Olá", StandardCharsets.UTF_8);
    }

    public static String googleMaps(String logradouro, String numero, String bairro, String cidade, String uf,
            String cep) {
        var consulta = montarEndereco(logradouro, numero, bairro, cidade, uf, cep);
        if (consulta == null) {
            return null;
        }
        return "https://www.google.com/maps/dir/?api=1&destination="
                + URLEncoder.encode(consulta, StandardCharsets.UTF_8);
    }

    public static String appleMaps(String logradouro, String numero, String bairro, String cidade, String uf,
            String cep) {
        var consulta = montarEndereco(logradouro, numero, bairro, cidade, uf, cep);
        if (consulta == null) {
            return null;
        }
        return "https://maps.apple.com/?daddr=" + URLEncoder.encode(consulta, StandardCharsets.UTF_8);
    }

    private static String montarEndereco(String logradouro, String numero, String bairro, String cidade, String uf,
            String cep) {
        var texto = Stream.of(logradouro, numero, bairro, cidade, uf, cep)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(parte -> !parte.isEmpty())
                .collect(Collectors.joining(", "));
        return texto.isEmpty() ? null : texto;
    }

    private static String somenteDigitos(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        var digitos = valor.replaceAll("\\D", "");
        return digitos.isEmpty() ? null : digitos;
    }
}
