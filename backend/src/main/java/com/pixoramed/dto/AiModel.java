// Um modelo como o microsserviço de IA devolve em GET /models. A IA responde em snake_case (@JsonAlias).
package com.pixoramed.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

public record AiModel(
        String id,
        @JsonAlias("cancer_type") String cancerType,
        String mode,
        int size,
        boolean normalized,
        List<String> classes,
        String description,
        ModelMetrics metrics,
        // Limiar próprio do modelo (só o da Pele tem); null nos demais
        Double threshold) {
}
