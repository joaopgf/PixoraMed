// Um modelo como a API devolve em GET /api/models: os dados da IA mais os limiares de decisão do backend.
package com.pixoramed.dto;

import java.util.List;

public record ModelResponse(
        String id, String cancerType, String mode, int size, boolean normalized, List<String> classes,
        String description, ModelMetrics metrics, Double threshold, Double inconclusiveThreshold,
        Double lowConfidenceThreshold) {
}
