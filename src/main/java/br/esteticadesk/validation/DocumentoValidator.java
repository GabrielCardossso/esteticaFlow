package br.esteticadesk.validation;

public final class DocumentoValidator {
    private DocumentoValidator() {
    }

    public static boolean cpfValido(String valor) {
        var cpf = somenteDigitos(valor);
        if (cpf.length() != 11 || todosIguais(cpf))
            return false;
        return digito(cpf, 9, 10) == cpf.charAt(9) - '0' && digito(cpf, 10, 11) == cpf.charAt(10) - '0';
    }

    public static boolean cnpjValido(String valor) {
        var cnpj = somenteDigitos(valor);
        if (cnpj.length() != 14 || todosIguais(cnpj))
            return false;
        return digitoCnpj(cnpj, 12) == cnpj.charAt(12) - '0' && digitoCnpj(cnpj, 13) == cnpj.charAt(13) - '0';
    }

    public static boolean cpfOuCnpjValido(String valor) {
        if (valor == null || valor.isBlank())
            return true;
        var digitos = somenteDigitos(valor);
        return digitos.length() == 11 ? cpfValido(digitos) : cnpjValido(digitos);
    }

    public static boolean placaValida(String valor) {
        return valor != null && valor.matches("(?i)^[A-Z]{3}-?\\d{4}$|^[A-Z]{3}\\d[A-Z]\\d{2}$");
    }

    private static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    private static boolean todosIguais(String valor) {
        return valor.chars().distinct().count() == 1;
    }

    private static int digito(String cpf, int limite, int pesoInicial) {
        int soma = 0;
        for (int i = 0, peso = pesoInicial; i < limite; i++, peso--)
            soma += (cpf.charAt(i) - '0') * peso;
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    private static int digitoCnpj(String cnpj, int limite) {
        int[] pesos = limite == 12 ? new int[] { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 }
                : new int[] { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        int soma = 0;
        for (int i = 0; i < limite; i++)
            soma += (cnpj.charAt(i) - '0') * pesos[i];
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
