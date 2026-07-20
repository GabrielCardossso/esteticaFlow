package br.esteticadesk.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class ContatoClienteLinksTest {

    @Test
    void montaWhatsAppComDdiBrasil() {
        assertEquals("https://wa.me/5548991746960?text=Ol%C3%A1", ContatoClienteLinks.whatsapp("(48) 99174-6960"));
    }

    @Test
    void ignoraTelefoneIncompleto() {
        assertNull(ContatoClienteLinks.whatsapp("123"));
    }

    @Test
    void montaRotaQuandoHaEndereco() {
        var link = ContatoClienteLinks.googleMaps("Rua das Palmeiras", "120", "Centro", "Florianópolis", "SC",
                "88010000");
        assertEquals(
                "https://www.google.com/maps/dir/?api=1&destination=Rua+das+Palmeiras%2C+120%2C+Centro%2C+Florian%C3%B3polis%2C+SC%2C+88010000",
                link);
    }
}
