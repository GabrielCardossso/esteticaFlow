package br.esteticadesk.web.controller;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.appointment.entity.Servico;
import br.esteticadesk.appointment.entity.ServicoAgendamento;
import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.appointment.service.AgendamentoService;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.common.HorarioSistema;
import br.esteticadesk.common.repository.LogSistemaRepository;
import br.esteticadesk.customer.entity.Cliente;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.employee.entity.Funcionario;
import br.esteticadesk.employee.repository.FuncionarioRepository;
import br.esteticadesk.enums.StatusAgendamento;
import br.esteticadesk.exception.ConflitoDeHorarioException;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.exception.SlotOcupadoConfirmacaoException;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.finance.repository.ReceitaRepository;
import br.esteticadesk.vehicle.entity.Veiculo;
import br.esteticadesk.vehicle.repository.VeiculoRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/agenda")
public class AgendaWebController {

    private final AgendamentoRepository agendamentos;
    private final AgendamentoService agendamentoService;
    private final ClienteRepository clientes;
    private final VeiculoRepository veiculos;
    private final ServicoRepository servicos;
    private final FuncionarioRepository funcionarios;
    private final FormaPagamentoRepository formasPagamento;
    private final ReceitaRepository receitas;
    private final LogSistemaRepository logs;
    private final SessaoUsuario sessao;

    public AgendaWebController(AgendamentoRepository agendamentos, AgendamentoService agendamentoService,
            ClienteRepository clientes, VeiculoRepository veiculos, ServicoRepository servicos,
            FuncionarioRepository funcionarios, FormaPagamentoRepository formasPagamento, ReceitaRepository receitas,
            LogSistemaRepository logs, SessaoUsuario sessao) {
        this.agendamentos = agendamentos;
        this.agendamentoService = agendamentoService;
        this.clientes = clientes;
        this.veiculos = veiculos;
        this.servicos = servicos;
        this.funcionarios = funcionarios;
        this.formasPagamento = formasPagamento;
        this.receitas = receitas;
        this.logs = logs;
        this.sessao = sessao;
    }

    @GetMapping
    public String index(@RequestParam(required = false) LocalDate data,
            @RequestParam(required = false, defaultValue = "DIA") String periodo,
            @RequestParam(required = false) StatusAgendamento status,
            @RequestParam(required = false) Long funcionarioId,
            @RequestParam(required = false) Boolean pago,
            @RequestParam(required = false) String q,
            Model model) {
        var dia = data == null ? HorarioSistema.hoje() : data;
        var periodoResolvido = resolverPeriodo(periodo);
        var intervalo = resolverIntervalo(dia, periodoResolvido);
        var empresaId = sessao.empresaObrigatoria();
        var lista = new ArrayList<>(agendamentos.findByEmpresaIdAndDataHoraBetweenOrderByDataHoraAsc(
                empresaId, HorarioSistema.inicioDoDia(intervalo.inicio()), HorarioSistema.fimDoDia(intervalo.fim())));
        filtrarAgendamentos(lista, status, funcionarioId, pago, q);
        model.addAttribute("agendamentos", lista);
        model.addAttribute("data", dia);
        model.addAttribute("dataAnterior", dia.minusDays(1));
        model.addAttribute("dataProxima", dia.plusDays(1));
        model.addAttribute("periodo", periodoResolvido.name());
        model.addAttribute("statusFiltro", status);
        model.addAttribute("funcionarioId", funcionarioId);
        model.addAttribute("pago", pago);
        model.addAttribute("q", q == null ? "" : q);
        model.addAttribute("funcionarios", funcionarios.findByEmpresaIdAndAtivoTrueOrderById(empresaId));
        model.addAttribute("statusValues", StatusAgendamento.values());
        model.addAttribute("intervaloInicio", intervalo.inicio());
        model.addAttribute("intervaloFim", intervalo.fim());
        model.addAttribute("formasPagamento", formasPagamento.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        model.addAttribute("menuAtivo", "agenda");
        return "appointment/index";
    }

    @GetMapping("/novo")
    public String novo(@RequestParam(required = false) LocalDate data,
            @RequestParam(required = false) Long clienteId, Model model) {
        prepararFormulario(model, data == null ? HorarioSistema.hoje() : data, clienteId, false, null);
        return "appointment/form";
    }

    @GetMapping("/{id}")
    public String detalhe(@PathVariable Long id, Model model) {
        var empresaId = sessao.empresaObrigatoria();
        var agendamento = agendamentoService.buscarDetalhe(id);
        model.addAttribute("agendamento", agendamento);
        model.addAttribute("receita", receitas.findByAgendamentoIdAndEmpresaId(id, empresaId).orElse(null));
        model.addAttribute("historico",
                logs.findByEmpresaIdAndDetalhesLikeOrderByDataHoraDesc(empresaId, "%Agendamento " + id + "%"));
        model.addAttribute("formasPagamento",
                formasPagamento.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        model.addAttribute("menuAtivo", "agenda");
        return "appointment/detail";
    }

    @GetMapping("/veiculos")
    @ResponseBody
    public List<VeiculoOption> veiculosDoCliente(@RequestParam Long clienteId) {
        return veiculos.findByEmpresaIdAndClienteIdAndAtivoTrueOrderByModelo(sessao.empresaObrigatoria(), clienteId)
                .stream()
                .map(v -> new VeiculoOption(v.getId(), v.getMarca() + " " + v.getModelo() + " — " + v.getPlaca()))
                .toList();
    }

    @PostMapping
    public String criar(@RequestParam Long clienteId, @RequestParam Long veiculoId,
            @RequestParam List<Long> servicoIds,
            @RequestParam(required = false) Long funcionarioId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm") LocalDateTime dataHora,
            @RequestParam(required = false, defaultValue = "0") BigDecimal desconto,
            @RequestParam(required = false) String observacoes,
            @RequestParam(required = false, defaultValue = "false") boolean confirmarConflito,
            RedirectAttributes redirectAttributes, Model model) {
        try {
            var empresaId = sessao.empresaObrigatoria();
            Cliente cliente = clientes.findByIdAndEmpresaId(clienteId, empresaId)
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente não encontrado."));
            Veiculo veiculo = veiculos.findByIdAndEmpresaId(veiculoId, empresaId)
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Veículo não encontrado."));
            if (!veiculo.getCliente().getId().equals(cliente.getId())) {
                throw new IllegalArgumentException("O veículo não pertence ao cliente selecionado.");
            }
            var agendamento = new Agendamento();
            agendamento.setCliente(cliente);
            agendamento.setVeiculo(veiculo);
            var idsUnicos = servicoIds.stream().distinct().toList();
            if (idsUnicos.size() != servicoIds.size()) {
                throw new IllegalArgumentException("Não repita o mesmo serviço no agendamento.");
            }
            for (Long servicoId : idsUnicos) {
                Servico servico = servicos.findByIdAndEmpresaIdAndAtivoTrue(servicoId, empresaId)
                        .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado ou inativo."));
                var linha = new ServicoAgendamento();
                linha.setServico(servico);
                agendamento.getServicos().add(linha);
            }
            agendamento.setDesconto(desconto);
            agendamento.setDataHora(dataHora);
            agendamento.setObservacoes(observacoes == null || observacoes.isBlank() ? null : observacoes.trim());
            if (funcionarioId != null) {
                Funcionario funcionario = funcionarios.findByIdAndEmpresaId(funcionarioId, empresaId)
                        .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário não encontrado."));
                agendamento.setFuncionario(funcionario);
            }

            agendamentoService.criar(agendamento, confirmarConflito);
            redirectAttributes.addFlashAttribute("sucesso", "Agendamento criado com sucesso.");
            return "redirect:/agenda?data=" + dataHora.toLocalDate();
        } catch (SlotOcupadoConfirmacaoException exception) {
            model.addAttribute("aviso", exception.getMessage());
            model.addAttribute("exigirConfirmacaoConflito", true);
            model.addAttribute("clienteIdSelecionado", clienteId);
            model.addAttribute("veiculoIdSelecionado", veiculoId);
            model.addAttribute("servicoIdsSelecionados", servicoIds);
            model.addAttribute("funcionarioIdSelecionado", funcionarioId);
            model.addAttribute("dataHoraValor",
                    dataHora.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")));
            model.addAttribute("descontoInformado", desconto);
            model.addAttribute("observacoesInformadas", observacoes);
            prepararFormulario(model, dataHora.toLocalDate(), clienteId, true, exception.getMessage());
            return "appointment/form";
        } catch (ConflitoDeHorarioException | IllegalArgumentException | RecursoNaoEncontradoException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
            return "redirect:/agenda/novo?data=" + (dataHora == null ? HorarioSistema.hoje() : dataHora.toLocalDate());
        }
    }

    @PostMapping("/{id}/iniciar")
    public String iniciar(@PathVariable Long id, @RequestParam LocalDate data, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.iniciar(id), "Atendimento iniciado.", data, redirectAttributes);
    }

    @PostMapping("/{id}/cancelar")
    public String cancelar(@PathVariable Long id, @RequestParam LocalDate data, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.cancelar(id), "Agendamento cancelado.", data, redirectAttributes);
    }

    @PostMapping("/{id}/marcar-pago")
    public String marcarPago(@PathVariable Long id, @RequestParam LocalDate data,
            @RequestParam Long formaPagamentoId, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.marcarPago(id, formaPagamentoId),
                "Pagamento registrado. O atendimento continua em andamento.", data, redirectAttributes);
    }

    @PostMapping("/{id}/concluir")
    public String concluir(@PathVariable Long id, @RequestParam LocalDate data,
            @RequestParam(required = false) Long formaPagamentoId, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.concluir(id, List.of(), formaPagamentoId),
                "Atendimento concluído.", data, redirectAttributes);
    }

    @PostMapping("/{id}/pagamento")
    public String registrarPagamento(@PathVariable Long id, @RequestParam LocalDate data,
            @RequestParam Long formaPagamentoId, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.registrarPagamento(id, formaPagamentoId),
                "Pagamento registrado.", data, redirectAttributes);
    }

    private void prepararFormulario(Model model, LocalDate dia, Long clienteId, boolean exigirConfirmacao,
            String aviso) {
        var empresaId = sessao.empresaObrigatoria();
        model.addAttribute("data", dia);
        model.addAttribute("clienteIdSelecionado",
                model.containsAttribute("clienteIdSelecionado") ? model.getAttribute("clienteIdSelecionado")
                        : clienteId);
        model.addAttribute("clientes", clientes.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        model.addAttribute("servicos", servicos.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        model.addAttribute("funcionarios", funcionarios.findByEmpresaIdAndAtivoTrueOrderById(empresaId));
        model.addAttribute("exigirConfirmacaoConflito", exigirConfirmacao);
        if (aviso != null) {
            model.addAttribute("aviso", aviso);
        }
        model.addAttribute("menuAtivo", "agenda");
    }

    private String executarAcao(Runnable acao, String mensagem, LocalDate data,
            RedirectAttributes redirectAttributes) {
        try {
            acao.run();
            redirectAttributes.addFlashAttribute("sucesso", mensagem);
        } catch (RuntimeException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
        }
        return "redirect:/agenda?data=" + data;
    }

    private enum PeriodoAgenda {
        DIA, AMANHA, SEMANA, MES
    }

    private record IntervaloDatas(LocalDate inicio, LocalDate fim) {
    }

    private PeriodoAgenda resolverPeriodo(String periodo) {
        if (periodo == null || periodo.isBlank()) {
            return PeriodoAgenda.DIA;
        }
        try {
            return PeriodoAgenda.valueOf(periodo.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return PeriodoAgenda.DIA;
        }
    }

    private IntervaloDatas resolverIntervalo(LocalDate referencia, PeriodoAgenda periodo) {
        return switch (periodo) {
            case DIA -> new IntervaloDatas(referencia, referencia);
            case AMANHA -> {
                var amanha = referencia.plusDays(1);
                yield new IntervaloDatas(amanha, amanha);
            }
            case SEMANA -> new IntervaloDatas(
                    referencia.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                    referencia.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY)));
            case MES -> new IntervaloDatas(
                    referencia.withDayOfMonth(1),
                    referencia.withDayOfMonth(referencia.lengthOfMonth()));
        };
    }

    private void filtrarAgendamentos(List<Agendamento> lista, StatusAgendamento status, Long funcionarioId,
            Boolean pago, String busca) {
        var termo = busca == null ? "" : busca.trim().toLowerCase(Locale.ROOT);
        lista.removeIf(agendamento -> {
            if (status != null && agendamento.getStatus() != status) {
                return true;
            }
            if (funcionarioId != null) {
                var funcionario = agendamento.getFuncionario();
                if (funcionario == null || !funcionarioId.equals(funcionario.getId())) {
                    return true;
                }
            }
            if (pago != null && !pago.equals(agendamento.getPago())) {
                return true;
            }
            if (!termo.isEmpty()) {
                var nomeCliente = agendamento.getCliente().getNome().toLowerCase(Locale.ROOT);
                var placa = agendamento.getVeiculo().getPlaca().toLowerCase(Locale.ROOT);
                if (!nomeCliente.contains(termo) && !placa.contains(termo)) {
                    return true;
                }
            }
            return false;
        });
    }

    public record VeiculoOption(Long id, String label) {
    }
}
