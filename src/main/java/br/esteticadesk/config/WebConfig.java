package br.esteticadesk.config;

import br.esteticadesk.web.auth.EmpresaAcessoInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final EmpresaAcessoInterceptor empresaAcessoInterceptor;

    public WebConfig(EmpresaAcessoInterceptor empresaAcessoInterceptor) {
        this.empresaAcessoInterceptor = empresaAcessoInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(empresaAcessoInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/", "/login", "/logout", "/error", "/css/**", "/js/**");
    }
}
