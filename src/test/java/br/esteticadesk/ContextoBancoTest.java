package br.esteticadesk;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ContextoBancoTest {
    @Test
    void contextoIniciaComSchemaValidado() {
        // A inicialização aplica o Flyway e executa a validação Hibernate
        // (ddl-auto=validate).
    }
}
