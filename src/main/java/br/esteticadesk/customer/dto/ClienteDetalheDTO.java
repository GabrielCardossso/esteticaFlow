package br.esteticadesk.customer.dto;

import br.esteticadesk.common.ContatoClienteLinks;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.enums.RelacionamentoCliente;
import br.esteticadesk.finance.entity.Receita;
import br.esteticadesk.vehicle.entity.Veiculo;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

public record ClienteDetalheDTO(ClienteDTO cliente, LocalDateTime ultimoAtendimento, long totalAtendimentos,
        BigDecimal valorTotalGasto, List<Veiculo> veiculos, List<Receita> historicoFinanceiro) {

    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final NumberFormat MOEDA = NumberFormat.getCurrencyInstance(Locale.of("pt", "BR"));

    public String ultimoAtendimentoFormatado() {
        return ultimoAtendimento == null ? "Ainda sem atendimentos concluídos" : DATA_HORA.format(ultimoAtendimento);
    }

    public String valorTotalFormatado() {
        var valor = valorTotalGasto == null ? BigDecimal.ZERO : valorTotalGasto;
        return MOEDA.format(valor.setScale(2, RoundingMode.HALF_UP));
    }

    public String telefoneFormatado() {
        var digitos = cliente.telefone() == null ? "" : cliente.telefone().replaceAll("\\D", "");
        if (digitos.length() == 11) {
            return "(%s) %s-%s".formatted(digitos.substring(0, 2), digitos.substring(2, 7), digitos.substring(7));
        }
        if (digitos.length() == 10) {
            return "(%s) %s-%s".formatted(digitos.substring(0, 2), digitos.substring(2, 6), digitos.substring(6));
        }
        return cliente.telefone();
    }

    public String linkWhatsApp() {
        return ContatoClienteLinks.whatsapp(cliente.telefone());
    }

    public String linkGoogleMaps() {
        return ContatoClienteLinks.googleMaps(cliente.logradouro(), cliente.numero(), cliente.bairro(),
                cliente.cidade(), cliente.uf(), cliente.cep());
    }

    public String linkAppleMaps() {
        return ContatoClienteLinks.appleMaps(cliente.logradouro(), cliente.numero(), cliente.bairro(),
                cliente.cidade(), cliente.uf(), cliente.cep());
    }

    public boolean temEndereco() {
        return linkGoogleMaps() != null;
    }

    public RelacionamentoCliente relacionamento() {
        return RelacionamentoCliente.de(ultimoAtendimento, HorarioSistema.agora());
    }

    public String dataCadastroFormatada() {
        // ClienteDTO não expõe dataCriacao; a view usa atributo separado quando necessário.
        return "—";
    }

    public String enderecoResumo() {
        if (!temEndereco()) {
            return "Endereço não cadastrado";
        }
        var builder = new StringBuilder();
        if (cliente.logradouro() != null && !cliente.logradouro().isBlank()) {
            builder.append(cliente.logradouro());
            if (cliente.numero() != null && !cliente.numero().isBlank()) {
                builder.append(", ").append(cliente.numero());
            }
        }
        if (cliente.bairro() != null && !cliente.bairro().isBlank()) {
            if (!builder.isEmpty()) {
                builder.append(" — ");
            }
            builder.append(cliente.bairro());
        }
        if (cliente.cidade() != null && !cliente.cidade().isBlank()) {
            if (!builder.isEmpty()) {
                builder.append(", ");
            }
            builder.append(cliente.cidade());
            if (cliente.uf() != null && !cliente.uf().isBlank()) {
                builder.append('/').append(cliente.uf());
            }
        }
        return builder.toString();
    }
}
