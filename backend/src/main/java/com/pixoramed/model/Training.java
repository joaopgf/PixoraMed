// Entidade da tabela "trainings": uma linha do training-results.csv (uma execução de treino com 5 folds).
package com.pixoramed.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(name = "trainings", uniqueConstraints = @UniqueConstraint(columnNames = {"runAt", "dataset"}))
public class Training {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime runAt;
    private String dataset;
    // "skin", "oral", "brain"...
    private String cancerType;
    // ex.: "grupos pesos limit1000" em alguns treinos da pele
    private String variant;
    // "color" ou "gray"
    private String mode;
    private boolean normalized;
    private int totalImages;
    @Column(length = 500)
    private String imagesPerClass;
    private String imageSize;
    private int epochs;
    private int batchSize;
    private double learningRate;
    private String folds;
    private String gpu;
    private String totalTime;
    private int totalSeconds;
    private double accuracyMean;
    private double accuracyStd;
    private double f1Mean;
    private double f1Std;
    private String accuracyPerFold;
    private String f1PerFold;

    protected Training() {
    }

    // Construtor usado pela importação do CSV
    public Training(LocalDateTime runAt, String dataset, String cancerType, String variant, String mode,
                    boolean normalized, int totalImages, String imagesPerClass, String imageSize, int epochs,
                    int batchSize, double learningRate, String folds, String gpu, String totalTime,
                    int totalSeconds, double accuracyMean, double accuracyStd, double f1Mean, double f1Std,
                    String accuracyPerFold, String f1PerFold) {
        this.runAt = runAt;
        this.dataset = dataset;
        this.cancerType = cancerType;
        this.variant = variant;
        this.mode = mode;
        this.normalized = normalized;
        this.totalImages = totalImages;
        this.imagesPerClass = imagesPerClass;
        this.imageSize = imageSize;
        this.epochs = epochs;
        this.batchSize = batchSize;
        this.learningRate = learningRate;
        this.folds = folds;
        this.gpu = gpu;
        this.totalTime = totalTime;
        this.totalSeconds = totalSeconds;
        this.accuracyMean = accuracyMean;
        this.accuracyStd = accuracyStd;
        this.f1Mean = f1Mean;
        this.f1Std = f1Std;
        this.accuracyPerFold = accuracyPerFold;
        this.f1PerFold = f1PerFold;
    }

    public Long getId() { return id; }
    public LocalDateTime getRunAt() { return runAt; }
    public String getDataset() { return dataset; }
    public String getCancerType() { return cancerType; }
    public String getVariant() { return variant; }
    public String getMode() { return mode; }
    public boolean isNormalized() { return normalized; }
    public int getTotalImages() { return totalImages; }
    public String getImagesPerClass() { return imagesPerClass; }
    public String getImageSize() { return imageSize; }
    public int getEpochs() { return epochs; }
    public int getBatchSize() { return batchSize; }
    public double getLearningRate() { return learningRate; }
    public String getFolds() { return folds; }
    public String getGpu() { return gpu; }
    public String getTotalTime() { return totalTime; }
    public int getTotalSeconds() { return totalSeconds; }
    public double getAccuracyMean() { return accuracyMean; }
    public double getAccuracyStd() { return accuracyStd; }
    public double getF1Mean() { return f1Mean; }
    public double getF1Std() { return f1Std; }
    public String getAccuracyPerFold() { return accuracyPerFold; }
    public String getF1PerFold() { return f1PerFold; }
}
