package br.esteticadesk.web.controller;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.appointment.entity.Servico;
import br.esteticadesk.appointment.entity.ServicoAgendamento;
import br.esteticadesk.appointment.repository.AgendamentoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.appointment.service.AgendamentoService;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.customer.entity.Cliente;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.employee.entity.Funcionario;
import br.esteticadesk.employee.repository.FuncionarioRepository;
import br.esteticadesk.exception.ConflitoDeHorarioException;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import br.esteticadesk.finance.repository.FormaPagamentoRepository;
import br.esteticadesk.vehicle.entity.Veiculo;
import br.esteticadesk.vehicle.repository.VeiculoRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
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
    private final SessaoUsuario sessao;

    public AgendaWebController(AgendamentoRepository agendamentos, AgendamentoService agendamentoService,
            ClienteRepository clientes, VeiculoRepository veiculos, ServicoRepository servicos,
            FuncionarioRepository funcionarios, FormaPagamentoRepository formasPagamento, SessaoUsuario sessao) {
        this.agendamentos = agendamentos;
        this.agendamentoService = agendamentoService;
        this.clientes = clientes;
        this.veiculos = veiculos;
        this.servicos = servicos;
        this.funcionarios = funcionarios;
        this.formasPagamento = formasPagamento;
        this.sessao = sessao;
    }

    @GetMapping
    public String index(@RequestParam(required = false) LocalDate data, Model model) {
        var dia = data == null ? LocalDate.now() : data;
        var lista = agendamentos.findByEmpresaIdAndDataHoraBetweenOrderByDataHoraAsc(
                sessao.empresaObrigatoria(), dia.atStartOfDay(), dia.atTime(LocalTime.MAX));
        model.addAttribute("agendamentos", lista);
        model.addAttribute("data", dia);
        model.addAttribute("dataAnterior", dia.minusDays(1));
        model.addAttribute("dataProxima", dia.plusDays(1));
        model.addAttribute("formasPagamento",
                formasPagamento.findByEmpresaIdAndAtivoTrueOrderByNome(sessao.empresaObrigatoria()));
        model.addAttribute("menuAtivo", "agenda");
        return "appointment/index";
    }

    @GetMapping("/novo")
    public String novo(@RequestParam(required = false) LocalDate data, Model model) {
        var empresaId = sessao.empresaObrigatoria();
        var dia = data == null ? LocalDate.now() : data;
        model.addAttribute("data", dia);
        model.addAttribute("clientes", clientes.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        model.addAttribute("servicos", servicos.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        model.addAttribute("funcionarios", funcionarios.findByEmpresaIdAndAtivoTrueOrderById(empresaId));
        model.addAttribute("menuAtivo", "agenda");
        return "appointment/form";
    }

    @GetMapping("/veiculos")
    @ResponseBody
    public java.util.List<VeiculoOption> veiculosDoCliente(@RequestParam Long clienteId) {
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
            @RequestParam(required = false) String observacoes, RedirectAttributes redirectAttributes) {
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

            agendamentoService.criar(agendamento);
            redirectAttributes.addFlashAttribute("sucesso", "Agendamento criado com sucesso.");
            return "redirect:/agenda?data=" + dataHora.toLocalDate();
        } catch (ConflitoDeHorarioException | IllegalArgumentException | RecursoNaoEncontradoException exception) {
            redirectAttributes.addFlashAttribute("erro", exception.getMessage());
            return "redirect:/agenda/novo";
        }
    }

    @PostMapping("/{id}/iniciar")
    public String iniciar(@PathVariable Long id, @RequestParam LocalDate data, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.iniciar(id), "Serviço iniciado.", data, redirectAttributes);
    }

    @PostMapping("/{id}/cancelar")
    public String cancelar(@PathVariable Long id, @RequestParam LocalDate data, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.cancelar(id), "Agendamento cancelado.", data, redirectAttributes);
    }

    @PostMapping("/{id}/concluir")
    public String concluir(@PathVariable Long id, @RequestParam LocalDate data,
            @RequestParam(required = false, defaultValue = "false") boolean pago,
            @RequestParam(required = false) Long formaPagamentoId, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.concluir(id, List.of(), pago, formaPagamentoId),
                pago ? "Serviço concluído e pagamento registrado." : "Serviço concluído como não pago.",
                data, redirectAttributes);
    }

    @PostMapping("/{id}/pagamento")
    public String registrarPagamento(@PathVariable Long id, @RequestParam LocalDate data,
            @RequestParam Long formaPagamentoId, RedirectAttributes redirectAttributes) {
        return executarAcao(() -> agendamentoService.registrarPagamento(id, formaPagamentoId),
                "Pagamento registrado.", data, redirectAttributes);
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

    public record VeiculoOption(Long id, String label) {
    }
}
