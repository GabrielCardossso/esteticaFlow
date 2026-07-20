package br.esteticadesk.web.advice;

import br.esteticadesk.exception.RecursoNaoEncontradoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice(basePackages = "br.esteticadesk.web.controller")
public class WebExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(WebExceptionHandler.class);

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public String recursoNaoEncontrado(RecursoNaoEncontradoException exception, Model model) {
        model.addAttribute("erro", exception.getMessage());
        return "error/nao-encontrado";
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, SecurityException.class})
    public String regraDeNegocio(RuntimeException exception, Model model) {
        model.addAttribute("erro", exception.getMessage());
        return "error/erro";
    }

    @ExceptionHandler(Exception.class)
    public String erroGenerico(Exception exception, Model model) {
        log.error("Erro não tratado na camada web", exception);
        model.addAttribute("erro", "Ocorreu um erro inesperado. Tente novamente ou contate o suporte.");
        return "error/erro";
    }
}
