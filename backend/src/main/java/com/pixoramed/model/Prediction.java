// Entidade da tabela "predictions": histórico das análises (resultado e probabilidades). A imagem enviada nunca é guardada.
package com.pixoramed.model;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "predictions", indexes = @Index(name = "idx_predictions_user_id", columnList = "user_id"))
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Dono da análise. O id vem do token, então a análise é gravada só com o número, sem carregar o usuário
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Relação N análises -> 1 usuário, na mesma coluna user_id. Só leitura (quem grava é o userId acima);
    // existe para o banco ter a chave estrangeira fk_predictions_user e recusar análise sem usuário.
    // Sem getter de propósito: o histórico não precisa dos dados do usuário e nada disso vai para o JSON
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_predictions_user"))
    private User user;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false, length = 60)
    private String modelId;

    @Column(nullable = false, length = 60)
    private String predictedClass;

    private double confidence;

    private double timeMs;

    // Probabilidade de cada classe, na ordem do modelo (JSON). Vazia nas análises feitas antes desta coluna
    @Convert(converter = ProbabilitiesConverter.class)
    @Column(columnDefinition = "text")
    private Map<String, Double> probabilities;

    protected Prediction() {
    }

    public Prediction(Long userId, String modelId, String predictedClass, double confidence, double timeMs,
                      Map<String, Double> probabilities) {
        this.userId = userId;
        this.modelId = modelId;
        this.predictedClass = predictedClass;
        this.confidence = confidence;
        this.timeMs = timeMs;
        this.probabilities = probabilities;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getModelId() {
        return modelId;
    }

    public String getPredictedClass() {
        return predictedClass;
    }

    public double getConfidence() {
        return confidence;
    }

    public double getTimeMs() {
        return timeMs;
    }

    public Map<String, Double> getProbabilities() {
        return probabilities;
    }
}
