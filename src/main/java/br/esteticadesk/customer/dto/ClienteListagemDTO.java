package br.esteticadesk.customer.dto;

import br.esteticadesk.common.ContatoClienteLinks;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.enums.RelacionamentoCliente;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public record ClienteListagemDTO(Long id, String nome, String telefone, String cpfCnpj, int veiculos, boolean ativo,
        LocalDateTime ultimoAtendimento, long totalAtendimentos, BigDecimal valorTotalGasto) {

    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final NumberFormat MOEDA = NumberFormat.getCurrencyInstance(Locale.of("pt", "BR"));

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

    public String ultimoAtendimentoFormatado() {
        return ultimoAtendimento == null ? "—" : DATA_HORA.format(ultimoAtendimento);
    }

    public String valorTotalFormatado() {
        var valor = valorTotalGasto == null ? BigDecimal.ZERO : valorTotalGasto;
        return MOEDA.format(valor.setScale(2, RoundingMode.HALF_UP));
    }

    public String linkWhatsApp() {
        return ContatoClienteLinks.whatsapp(telefone);
    }

    public RelacionamentoCliente relacionamento() {
        return RelacionamentoCliente.de(ultimoAtendimento, HorarioSistema.agora());
    }

    private String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }
}
