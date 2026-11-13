// Análises: lista os modelos da IA, envia a imagem, decide a classe, grava e registra no log o resultado e monta o histórico.
package com.pixoramed.service;

import com.pixoramed.dto.AiModel;
import com.pixoramed.dto.AiPrediction;
import com.pixoramed.dto.ModelResponse;
import com.pixoramed.dto.PredictionHistoryResponse;
import com.pixoramed.dto.PredictionResponse;
import com.pixoramed.dto.PredictionResponse.ClassProbability;
import com.pixoramed.exception.ApiException;
import com.pixoramed.model.Prediction;
import com.pixoramed.repository.PredictionRepository;
import com.pixoramed.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PredictionService {

    // O log registra id do usuário, modelo e resultado: nunca a imagem nem o nome do arquivo
    private static final Logger log = LoggerFactory.getLogger(PredictionService.class);
    private static final String WARNING = "Resultado de um modelo experimental, feito para fins acadêmicos. "
            + "Não é um diagnóstico e não substitui a avaliação de um profissional de saúde.";

    private final AiServiceClient aiService;
    private final DecisionService decisionService;
    private final PredictionRepository predictions;
    private final UserRepository users;

    public PredictionService(AiServiceClient aiService, DecisionService decisionService,
                             PredictionRepository predictions, UserRepository users) {
        this.aiService = aiService;
        this.decisionService = decisionService;
        this.predictions = predictions;
        this.users = users;
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
        // O token continua válido até vencer mesmo depois que a conta é excluída: não grava análise sem dono
        if (!users.existsById(userId)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Conta não encontrada. Entre novamente.");
        }
        // A IA pré-processa, roda o modelo e devolve as probabilidades; a imagem não fica guardada
        AiPrediction result;
        try {
            result = aiService.predict(modelId, file);
        } catch (ApiException e) {
            log.warn("Análise não concluída: usuário {}, modelo {}, status {}",
                    userId, safeModelId(modelId), e.getStatus().value());
            throw e;
        }
        DecisionService.Decision decision =
                decisionService.decide(result.probabilities(), result.classes(), result.threshold());

        // Só o resultado vai para o banco: classe, confiança e a probabilidade de cada classe (nunca a imagem)
        Map<String, Double> byClass = new LinkedHashMap<>();
        for (int i = 0; i < result.classes().size(); i++) {
            byClass.put(result.classes().get(i), result.probabilities().get(i));
        }
        Prediction saved = predictions.save(new Prediction(userId, result.modelId(), decision.predictedClass(),
                decision.confidence(), result.timeMs(), byClass));
        log.info("Análise {} concluída: usuário {}, modelo {}, classe {}, confiança {}, IA em {} ms",
                saved.getId(), userId, result.modelId(), decision.predictedClass(),
                String.format(Locale.ROOT, "%.4f", decision.confidence()),
                String.format(Locale.ROOT, "%.0f", result.timeMs()));

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

    // O modelId vem do navegador: no log, só letras, números e "_" (evita linhas falsas no log)
    private static String safeModelId(String modelId) {
        return modelId == null ? "-" : modelId.replaceAll("[^A-Za-z0-9_]", "?");
    }

    // Cada usuário vê só as próprias análises
    public List<PredictionHistoryResponse> history(Long userId, int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        return predictions.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, size)).stream()
                .map(PredictionHistoryResponse::from)
                .toList();
    }
}
