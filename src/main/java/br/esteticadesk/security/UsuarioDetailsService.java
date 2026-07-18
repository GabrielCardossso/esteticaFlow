package br.esteticadesk.security;

import br.esteticadesk.employee.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UsuarioDetailsService implements UserDetailsService {
    private final UsuarioRepository usuarioRepository;

    public UsuarioDetailsService(UsuarioRepository usuarioRepository) { this.usuarioRepository = usuarioRepository; }

    @Override
    public UserDetails loadUserByUsername(String email) {
        var usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas."));
        return User.builder().username(usuario.getEmail()).password(usuario.getSenhaHash())
                .disabled(!Boolean.TRUE.equals(usuario.getAtivo())).authorities(usuario.getPapel().name()).build();
    }
}
