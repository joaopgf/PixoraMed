// Uma análise do histórico (GET /api/predictions). O banco não guarda imagem nem probabilidades.
package com.pixoramed.dto;

import com.pixoramed.model.Prediction;
import java.time.Instant;

public record PredictionHistoryResponse(
        Long id, Instant createdAt, String modelId, String predictedClass, double confidence, double timeMs) {

    public static PredictionHistoryResponse from(Prediction p) {
        return new PredictionHistoryResponse(
                p.getId(), p.getCreatedAt(), p.getModelId(), p.getPredictedClass(), p.getConfidence(), p.getTimeMs());
    }
}
