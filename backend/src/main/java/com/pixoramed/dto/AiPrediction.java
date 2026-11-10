// Resposta do microsserviço de IA em POST /predict: uma probabilidade por classe, na ordem de "classes".
package com.pixoramed.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

public record AiPrediction(
        @JsonAlias("model_id") String modelId,
        @JsonAlias("cancer_type") String cancerType,
        List<String> classes,
        List<Double> probabilities,
        @JsonAlias("time_ms") double timeMs,
        Double threshold) {
}
