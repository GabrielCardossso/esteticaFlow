package br.esteticadesk.web.advice;

import br.esteticadesk.exception.RecursoNaoEncontradoException;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class WebExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public String recursoNaoEncontrado(RecursoNaoEncontradoException exception, Model model) {
        model.addAttribute("erro", exception.getMessage());
        return "error/nao-encontrado";
    }

    @ExceptionHandler({IllegalArgumentException.class, SecurityException.class})
    public String regraDeNegocio(RuntimeException exception, Model model) {
        model.addAttribute("erro", exception.getMessage());
        return "error/erro";
    }
}
