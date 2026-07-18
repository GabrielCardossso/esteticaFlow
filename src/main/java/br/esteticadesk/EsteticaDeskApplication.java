package br.esteticadesk;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EsteticaDeskApplication {

    public static void main(String[] args) {
        SpringApplication.run(EsteticaDeskApplication.class, args);
    }
}
