package br.esteticadesk.customer.dto;

public record ClienteListagemDTO(Long id, String nome, String telefone, String cpfCnpj, int veiculos,
        boolean ativo) {

    public String telefoneFormatado() {
        var digitos = somenteDigitos(telefone);
        if (digitos.length() == 11) {
            return "(%s) %s-%s".formatted(digitos.substring(0, 2), digitos.substring(2, 7),
                    digitos.substring(7));
        }
        if (digitos.length() == 10) {
            return "(%s) %s-%s".formatted(digitos.substring(0, 2), digitos.substring(2, 6),
                    digitos.substring(6));
        }
        return telefone;
    }

    public String documentoFormatado() {
        var digitos = somenteDigitos(cpfCnpj);
        if (digitos.length() == 11) {
            return "%s.%s.%s-%s".formatted(digitos.substring(0, 3), digitos.substring(3, 6),
                    digitos.substring(6, 9), digitos.substring(9));
        }
        if (digitos.length() == 14) {
            return "%s.%s.%s/%s-%s".formatted(digitos.substring(0, 2), digitos.substring(2, 5),
                    digitos.substring(5, 8), digitos.substring(8, 12), digitos.substring(12));
        }
        return cpfCnpj;
    }

    private String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }
}
