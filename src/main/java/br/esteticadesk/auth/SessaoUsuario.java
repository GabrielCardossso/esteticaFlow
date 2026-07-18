package br.esteticadesk.auth;

import br.esteticadesk.enums.PapelUsuario;
import br.esteticadesk.employee.entity.Usuario;
import java.io.Serial;
import java.io.Serializable;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.SessionScope;

@Component
@SessionScope
public class SessaoUsuario implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Usuario usuarioLogado;
    private Long usuarioId;
    private Long empresaId;
    private PapelUsuario papel;

    public void autenticar(Long usuarioId, Long empresaId, PapelUsuario papel) {
        this.usuarioId = usuarioId;
        this.empresaId = empresaId;
        this.papel = papel;
    }

    public void iniciar(Usuario usuario) {
        this.usuarioLogado = usuario;
        autenticar(usuario.getId(), usuario.getEmpresaId(), usuario.getPapel());
    }

    public void encerrar() {
        usuarioLogado = null;
        usuarioId = null;
        empresaId = null;
        papel = null;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public Long getEmpresaId() {
        return empresaId;
    }

    public PapelUsuario getPapel() {
        return papel;
    }

    public boolean isAdministrador() {
        return getPapel() == PapelUsuario.ADMINISTRADOR;
    }

    public Usuario getUsuarioLogado() {
        return usuarioLogado;
    }

    public Long empresaObrigatoria() {
        if (empresaId == null) {
            throw new OperacaoNaoAutenticadaException();
        }
        return empresaId;
    }

    public static class OperacaoNaoAutenticadaException extends RuntimeException {
        public OperacaoNaoAutenticadaException() {
            super("Usuário não autenticado.");
        }
    }
}
