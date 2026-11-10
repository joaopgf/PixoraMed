// Entidade da tabela "predictions": histórico das análises. A imagem enviada nunca é guardada.
package com.pixoramed.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "predictions", indexes = @Index(columnList = "userId"))
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false, length = 60)
    private String modelId;

    @Column(nullable = false, length = 60)
    private String predictedClass;

    private double confidence;

    private double timeMs;

    protected Prediction() {
    }

    public Prediction(Long userId, String modelId, String predictedClass, double confidence, double timeMs) {
        this.userId = userId;
        this.modelId = modelId;
        this.predictedClass = predictedClass;
        this.confidence = confidence;
        this.timeMs = timeMs;
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
}
