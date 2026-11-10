// Um treino como a API devolve em GET /api/trainings.
package com.pixoramed.dto;

import com.pixoramed.model.Training;
import java.time.LocalDateTime;

public record TrainingResponse(
        Long id, LocalDateTime runAt, String dataset, String cancerType, String variant, String mode,
        boolean normalized, int totalImages, String imagesPerClass, String imageSize, int epochs, int batchSize,
        double learningRate, String folds, String gpu, String totalTime, int totalSeconds, double accuracyMean,
        double accuracyStd, double f1Mean, double f1Std, String accuracyPerFold, String f1PerFold) {

    public static TrainingResponse from(Training t) {
        return new TrainingResponse(
                t.getId(), t.getRunAt(), t.getDataset(), t.getCancerType(), t.getVariant(), t.getMode(),
                t.isNormalized(), t.getTotalImages(), t.getImagesPerClass(), t.getImageSize(), t.getEpochs(),
                t.getBatchSize(), t.getLearningRate(), t.getFolds(), t.getGpu(), t.getTotalTime(),
                t.getTotalSeconds(), t.getAccuracyMean(), t.getAccuracyStd(), t.getF1Mean(), t.getF1Std(),
                t.getAccuracyPerFold(), t.getF1PerFold());
    }
}
