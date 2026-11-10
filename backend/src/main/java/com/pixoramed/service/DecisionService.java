// Regra de decisão: a IA devolve probabilidades e aqui se decide a classe final (ou "inconclusive").
package com.pixoramed.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class DecisionService {

    public static final String INCONCLUSIVE = "inconclusive";

    private final double inconclusiveThreshold;

    public DecisionService(@Value("${app.inconclusive-threshold}") double inconclusiveThreshold) {
        this.inconclusiveThreshold = inconclusiveThreshold;
    }

    /**
     * Sem limiar próprio: a classe mais provável, ou "inconclusive" se a confiança ficar abaixo do limite.
     * Com limiar próprio (Pele): a segunda classe quando a probabilidade dela alcança o limiar.
     */
    public Decision decide(List<Double> probabilities, List<String> classes, Double modelThreshold) {
        int index;
        if (modelThreshold != null) {
            index = probabilities.get(1) >= modelThreshold ? 1 : 0;
        } else {
            index = 0;
            for (int i = 1; i < probabilities.size(); i++) {
                if (probabilities.get(i) > probabilities.get(index)) {
                    index = i;
                }
            }
        }
        double confidence = probabilities.get(index);
        Double cut = inconclusiveThresholdFor(modelThreshold);
        if (cut != null && confidence < cut) {
            return new Decision(INCONCLUSIVE, confidence);
        }
        return new Decision(classes.get(index), confidence);
    }

    // Modelos com limiar próprio já decidem por ele; os demais ficam inconclusivos abaixo do limite configurado
    public Double inconclusiveThresholdFor(Double modelThreshold) {
        return modelThreshold == null ? inconclusiveThreshold : null;
    }

    // Modelos com limiar próprio mantêm a classe, mas a tela avisa quando a confiança fica abaixo deste valor
    public Double lowConfidenceThresholdFor(Double modelThreshold) {
        return modelThreshold != null ? inconclusiveThreshold : null;
    }

    public record Decision(String predictedClass, double confidence) {
    }
}
