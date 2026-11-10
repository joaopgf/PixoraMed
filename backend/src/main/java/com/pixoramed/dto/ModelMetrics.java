// Métricas de teste de um modelo, em %. Campos ausentes ficam null (ex.: modelo ainda sem métricas registradas).
package com.pixoramed.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public record ModelMetrics(
        @JsonAlias("accuracy_mean") Double accuracyMean,
        @JsonAlias("accuracy_std") Double accuracyStd,
        @JsonAlias("f1_mean") Double f1Mean,
        @JsonAlias("f1_std") Double f1Std) {
}
