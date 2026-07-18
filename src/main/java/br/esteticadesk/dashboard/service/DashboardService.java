package br.esteticadesk.dashboard.service;

import br.esteticadesk.dashboard.dto.DashboardDTO;
import java.time.LocalDate;

public interface DashboardService {
    DashboardDTO carregar(LocalDate inicio, LocalDate fim);
}
