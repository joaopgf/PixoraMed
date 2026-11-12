// Testes do conversor das probabilidades: ida e volta pelo JSON mantendo a ordem, e análises antigas sem a coluna.
package com.pixoramed.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProbabilitiesConverterTest {

    private final ProbabilitiesConverter converter = new ProbabilitiesConverter();

    @Test
    void roundTripKeepsValuesAndClassOrder() {
        Map<String, Double> original = new LinkedHashMap<>();
        original.put("glioma", 0.1);
        original.put("menin", 0.85);
        original.put("tumor", 0.05);

        Map<String, Double> back = converter.convertToEntityAttribute(converter.convertToDatabaseColumn(original));

        assertEquals(original, back);
        assertEquals(List.of("glioma", "menin", "tumor"), List.copyOf(back.keySet()));
    }

    @Test
    void oldRowsWithoutProbabilitiesStayNull() {
        assertNull(converter.convertToEntityAttribute(null));
        assertNull(converter.convertToDatabaseColumn(null));
    }
}
