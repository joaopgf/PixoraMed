// Uma análise do histórico (GET /api/predictions): resultado e probabilidades por classe. O banco não guarda a imagem.
package com.pixoramed.dto;

import com.pixoramed.dto.PredictionResponse.ClassProbability;
import com.pixoramed.model.Prediction;
import java.time.Instant;
import java.util.List;

// probabilities: na ordem das classes do modelo; lista vazia nas análises gravadas antes de o banco guardar as probabilidades
public record PredictionHistoryResponse(
        Long id, Instant createdAt, String modelId, String predictedClass, double confidence, double timeMs,
        List<ClassProbability> probabilities) {

    public static PredictionHistoryResponse from(Prediction p) {
        List<ClassProbability> probabilities = p.getProbabilities() == null
                ? List.of()
                : p.getProbabilities().entrySet().stream()
                        .map(entry -> new ClassProbability(entry.getKey(), entry.getValue()))
                        .toList();
        return new PredictionHistoryResponse(p.getId(), p.getCreatedAt(), p.getModelId(), p.getPredictedClass(),
                p.getConfidence(), p.getTimeMs(), probabilities);
    }
}
