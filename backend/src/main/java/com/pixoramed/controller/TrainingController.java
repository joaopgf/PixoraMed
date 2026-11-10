// Rotas públicas: saúde da API (usada pelo Render) e lista de treinos para a tela de resultados.
package com.pixoramed.controller;

import com.pixoramed.dto.TrainingResponse;
import com.pixoramed.service.TrainingService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TrainingController {

    private final TrainingService trainingService;

    public TrainingController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    // Não consulta a IA: o Render usa esta rota para saber se a API subiu, e a IA pode estar dormindo
    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/api/trainings")
    public List<TrainingResponse> trainings() {
        return trainingService.list();
    }
}
