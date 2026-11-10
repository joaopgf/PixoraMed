// Rotas das análises: modelos disponíveis, nova análise (envio da imagem) e histórico do usuário.
package com.pixoramed.controller;

import com.pixoramed.dto.ModelResponse;
import com.pixoramed.dto.PredictionHistoryResponse;
import com.pixoramed.dto.PredictionResponse;
import com.pixoramed.service.PredictionService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class PredictionController {

    private final PredictionService predictionService;

    public PredictionController(PredictionService predictionService) {
        this.predictionService = predictionService;
    }

    @GetMapping("/api/models")
    public List<ModelResponse> models() {
        return predictionService.listModels();
    }

    @PostMapping("/api/predictions")
    public PredictionResponse predict(@AuthenticationPrincipal Jwt jwt,
                                      @RequestParam String modelId,
                                      @RequestPart MultipartFile file) {
        return predictionService.predict(Long.valueOf(jwt.getSubject()), modelId, file);
    }

    @GetMapping("/api/predictions")
    public List<PredictionHistoryResponse> history(@AuthenticationPrincipal Jwt jwt,
                                                   @RequestParam(defaultValue = "20") int limit) {
        return predictionService.history(Long.valueOf(jwt.getSubject()), limit);
    }
}
