// Resultado de uma análise (POST /api/predictions): classe decidida, confiança e probabilidades por classe.
package com.pixoramed.dto;

import java.util.List;

public record PredictionResponse(
        Long id, String modelId, String cancerType, String predictedClass, double confidence,
        List<ClassProbability> probabilities, Double threshold, Double inconclusiveThreshold,
        Double lowConfidenceThreshold, double timeMs, String warning) {

    public record ClassProbability(String className, double probability) {
    }
}
