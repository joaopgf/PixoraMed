// Testes da regra de decisão: classe mais provável, inconclusivo e limiar próprio da Pele.
package com.pixoramed.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import org.junit.jupiter.api.Test;

class DecisionServiceTest {

    private final DecisionService decision = new DecisionService(0.8);

    @Test
    void picksMostLikelyClass() {
        var result = decision.decide(List.of(0.1, 0.9), List.of("normal", "scc"), null);
        assertEquals("scc", result.predictedClass());
        assertEquals(0.9, result.confidence());
    }

    @Test
    void lowConfidenceIsInconclusive() {
        var result = decision.decide(List.of(0.3, 0.3, 0.4), List.of("glioma", "menin", "tumor"), null);
        assertEquals(DecisionService.INCONCLUSIVE, result.predictedClass());
    }

    @Test
    void modelThresholdDecidesEvenBelowHalf() {
        var result = decision.decide(List.of(0.8, 0.2), List.of("benign", "malignant"), 0.18);
        assertEquals("malignant", result.predictedClass());
        assertNull(decision.inconclusiveThresholdFor(0.18));
        assertEquals(0.8, decision.lowConfidenceThresholdFor(0.18));
    }
}
