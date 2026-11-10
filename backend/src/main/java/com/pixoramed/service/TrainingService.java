// Treinos: importa o training-results.csv para o banco (ao iniciar) e lista os treinos para a tela de resultados.
package com.pixoramed.service;

import com.pixoramed.dto.TrainingResponse;
import com.pixoramed.model.Training;
import com.pixoramed.repository.TrainingRepository;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class TrainingService {

    private static final Logger log = LoggerFactory.getLogger(TrainingService.class);
    private static final String CSV_PATH = "data/training-results.csv";
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    // "Pele cor grupos pesos limit1000" -> câncer "Pele", modo "cor", variante "grupos pesos limit1000"
    private static final Pattern DATASET = Pattern.compile("^(.+?)\\s+(cor|cinza)\\b\\s*(.*)$", Pattern.CASE_INSENSITIVE);
    // Nomes dos notebooks (português) -> identificadores usados no sistema
    private static final Map<String, String> CANCER_TYPES = Map.of("pele", "skin", "oral", "oral", "cerebro", "brain");

    private final TrainingRepository trainings;
    private final boolean importOnStartup;

    public TrainingService(TrainingRepository trainings,
                           @Value("${app.import-trainings-on-startup}") boolean importOnStartup) {
        this.trainings = trainings;
        this.importOnStartup = importOnStartup;
    }

    public List<TrainingResponse> list() {
        return trainings.findAll(Sort.by("cancerType", "mode", "runAt")).stream()
                .map(TrainingResponse::from)
                .toList();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void importOnStartup() throws IOException {
        if (!importOnStartup) {
            return;
        }
        try (InputStream csv = new ClassPathResource(CSV_PATH).getInputStream()) {
            log.info("training-results.csv: {} treinos novos importados", importCsv(csv));
        }
    }

    // Acrescenta só as execuções que ainda não estão no banco (chave: data/hora + dataset)
    public int importCsv(InputStream csv) throws IOException {
        Set<String> existing = trainings.findAll().stream()
                .map(t -> t.getRunAt() + "|" + t.getDataset())
                .collect(Collectors.toSet());
        List<Training> newTrainings = new ArrayList<>();
        for (Training training : parseCsv(csv)) {
            if (existing.add(training.getRunAt() + "|" + training.getDataset())) {
                newTrainings.add(training);
            }
        }
        trainings.saveAll(newTrainings);
        return newTrainings.size();
    }

    // Lê o CSV no formato dos notebooks: separador ";" e vírgula decimal
    static List<Training> parseCsv(InputStream csv) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(csv, StandardCharsets.UTF_8));
        String headerLine = reader.readLine();
        if (headerLine == null) {
            return List.of();
        }
        String[] header = headerLine.replace("﻿", "").split(";");
        List<Training> result = new ArrayList<>();
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.isBlank()) {
                continue;
            }
            String[] values = line.split(";", -1);
            Map<String, String> row = new HashMap<>();
            for (int i = 0; i < header.length && i < values.length; i++) {
                row.put(header[i].trim(), values[i].trim());
            }
            result.add(toTraining(row));
        }
        return result;
    }

    private static Training toTraining(Map<String, String> row) {
        String dataset = row.get("dataset");
        Matcher matcher = DATASET.matcher(dataset);
        String cancer = dataset;
        String mode = row.get("modo").equalsIgnoreCase("RGB") ? "cor" : "cinza";
        String variant = "";
        if (matcher.matches()) {
            cancer = matcher.group(1);
            mode = matcher.group(2).toLowerCase();
            variant = matcher.group(3).trim();
        }
        return new Training(
                LocalDateTime.parse(row.get("data_hora"), DATE_TIME),
                dataset,
                cancerType(cancer),
                variant,
                mode.equals("cor") ? "color" : "gray",
                row.get("normalizado").equalsIgnoreCase("sim"),
                Integer.parseInt(row.get("imagens_total")),
                row.getOrDefault("imagens_por_classe", ""),
                row.get("tamanho"),
                Integer.parseInt(row.get("epocas")),
                Integer.parseInt(row.get("batch")),
                number(row.get("lr")),
                row.getOrDefault("folds", ""),
                row.getOrDefault("gpu", ""),
                row.get("tempo_total"),
                seconds(row.get("tempo_total")),
                number(row.get("acc_media_%")),
                number(row.get("acc_desvio_%")),
                number(row.get("f1_media_%")),
                number(row.get("f1_desvio_%")),
                row.getOrDefault("acc_por_fold_%", ""),
                row.getOrDefault("f1_por_fold_%", ""));
    }

    // "Cérebro" -> "brain"; nomes fora da lista ficam em minúsculas e sem acento
    static String cancerType(String name) {
        String plain = Normalizer.normalize(name.trim().toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return CANCER_TYPES.getOrDefault(plain, plain);
    }

    private static double number(String value) {
        return value == null || value.isBlank() ? 0 : Double.parseDouble(value.replace(",", "."));
    }

    private static int seconds(String hhmmss) {
        String[] parts = hhmmss.split(":");
        return Integer.parseInt(parts[0]) * 3600 + Integer.parseInt(parts[1]) * 60 + Integer.parseInt(parts[2]);
    }
}
