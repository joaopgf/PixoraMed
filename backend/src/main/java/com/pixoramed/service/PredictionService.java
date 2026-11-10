// Análises: lista os modelos da IA, envia a imagem, decide a classe, grava o resultado e monta o histórico.
package com.pixoramed.service;

import com.pixoramed.dto.AiModel;
import com.pixoramed.dto.AiPrediction;
import com.pixoramed.dto.ModelResponse;
import com.pixoramed.dto.PredictionHistoryResponse;
import com.pixoramed.dto.PredictionResponse;
import com.pixoramed.dto.PredictionResponse.ClassProbability;
import com.pixoramed.model.Prediction;
import com.pixoramed.repository.PredictionRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PredictionService {

    private static final String WARNING = "Resultado de um modelo experimental, feito para fins acadêmicos. "
            + "Não é um diagnóstico e não substitui a avaliação de um profissional de saúde.";

    private final AiServiceClient aiService;
    private final DecisionService decisionService;
    private final PredictionRepository predictions;

    public PredictionService(AiServiceClient aiService, DecisionService decisionService,
                             PredictionRepository predictions) {
        this.aiService = aiService;
        this.decisionService = decisionService;
        this.predictions = predictions;
    }

    public List<ModelResponse> listModels() {
        return aiService.listModels().stream()
                .sorted(Comparator.comparing(AiModel::cancerType).thenComparing(AiModel::mode))
                .map(m -> new ModelResponse(m.id(), m.cancerType(), m.mode(), m.size(), m.normalized(), m.classes(),
                        m.description(), m.metrics(), m.threshold(),
                        decisionService.inconclusiveThresholdFor(m.threshold()),
                        decisionService.lowConfidenceThresholdFor(m.threshold())))
                .toList();
    }

    public PredictionResponse predict(Long userId, String modelId, MultipartFile file) {
        // A IA pré-processa, roda o modelo e devolve as probabilidades; a imagem não fica guardada
        AiPrediction result = aiService.predict(modelId, file);
        DecisionService.Decision decision =
                decisionService.decide(result.probabilities(), result.classes(), result.threshold());

        // Só o resultado vai para o banco
        Prediction saved = predictions.save(new Prediction(
                userId, result.modelId(), decision.predictedClass(), decision.confidence(), result.timeMs()));

        List<ClassProbability> probabilities = new ArrayList<>();
        for (int i = 0; i < result.classes().size(); i++) {
            probabilities.add(new ClassProbability(result.classes().get(i), result.probabilities().get(i)));
        }
        probabilities.sort(Comparator.comparingDouble(ClassProbability::probability).reversed());

        return new PredictionResponse(saved.getId(), result.modelId(), result.cancerType(),
                decision.predictedClass(), decision.confidence(), probabilities, result.threshold(),
                decisionService.inconclusiveThresholdFor(result.threshold()),
                decisionService.lowConfidenceThresholdFor(result.threshold()), result.timeMs(), WARNING);
    }

    // Cada usuário vê só as próprias análises
    public List<PredictionHistoryResponse> history(Long userId, int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        return predictions.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, size)).stream()
                .map(PredictionHistoryResponse::from)
                .toList();
    }
}
