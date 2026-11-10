// Testes da leitura do training-results.csv (formato dos notebooks: ";" e vírgula decimal).
package com.pixoramed.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.pixoramed.model.Training;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class TrainingServiceTest {

    @Test
    void parsesTheRealCsv() throws Exception {
        List<Training> trainings = TrainingService.parseCsv(new ClassPathResource("data/training-results.csv").getInputStream());
        assertFalse(trainings.isEmpty());
        Training first = trainings.get(0);
        assertEquals("color", first.getMode());
        assertEquals(17 * 60 + 40, first.getTotalSeconds());
        assertEquals(99.95, first.getAccuracyMean());
    }

    @Test
    void mapsCancerNamesToIds() {
        assertEquals("skin", TrainingService.cancerType("Pele"));
        assertEquals("brain", TrainingService.cancerType("Cérebro"));
        assertEquals("rim", TrainingService.cancerType("Rim"));
    }
}
