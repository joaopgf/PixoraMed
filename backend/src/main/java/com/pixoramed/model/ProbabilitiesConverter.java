// Converte as probabilidades de uma análise (classe -> probabilidade) em texto JSON para a coluna "probabilities".
package com.pixoramed.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.LinkedHashMap;
import java.util.Map;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Converter
public class ProbabilitiesConverter implements AttributeConverter<Map<String, Double>, String> {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    // LinkedHashMap mantém a ordem das classes do modelo
    private static final TypeReference<LinkedHashMap<String, Double>> TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(Map<String, Double> probabilities) {
        return probabilities == null ? null : JSON.writeValueAsString(probabilities);
    }

    // Análises gravadas antes desta coluna existir ficam com null
    @Override
    public Map<String, Double> convertToEntityAttribute(String json) {
        return json == null || json.isBlank() ? null : JSON.readValue(json, TYPE);
    }
}
