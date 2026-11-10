// Cliente HTTP do microsserviço de IA: lista os modelos e envia a imagem para predição, com o token interno.
package com.pixoramed.service;

import com.pixoramed.dto.AiModel;
import com.pixoramed.dto.AiPrediction;
import com.pixoramed.exception.ApiException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AiServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);
    private static final String UNAVAILABLE = "O serviço de IA está indisponível no momento. Tente de novo em instantes.";
    // A lista de modelos quase nunca muda: guarda por 5 minutos para não chamar a IA a cada tela
    private static final Duration MODELS_CACHE = Duration.ofMinutes(5);

    private final RestClient http;
    private List<AiModel> cachedModels;
    private long cachedAt;

    public AiServiceClient(@Value("${app.ai-service.url}") String url,
                           @Value("${app.ai-service.token}") String token,
                           @Value("${app.ai-service.timeout-seconds}") int timeoutSeconds) {
        // No Render gratuito a IA pode estar dormindo: acordar leva perto de 1 minuto
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.http = RestClient.builder()
                .baseUrl(url)
                .defaultHeader("X-Internal-Token", token)
                .requestFactory(factory)
                .build();
    }

    public synchronized List<AiModel> listModels() {
        boolean expired = System.currentTimeMillis() - cachedAt > MODELS_CACHE.toMillis();
        if (cachedModels == null || expired) {
            cachedModels = call(() -> http.get().uri("/models").retrieve().body(new ParameterizedTypeReference<List<AiModel>>() {
            }));
            cachedAt = System.currentTimeMillis();
        }
        return cachedModels;
    }

    public AiPrediction predict(String modelId, MultipartFile file) {
        byte[] content;
        try {
            content = file.getBytes();
        } catch (java.io.IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Não foi possível ler a imagem.");
        }
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image";
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("model_id", modelId);
        form.add("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        return call(() -> http.post().uri("/predict")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(form)
                .retrieve()
                .body(AiPrediction.class));
    }

    // Traduz as falhas da IA: erro do pedido (404, 413, 422) volta para a tela; o resto vira "indisponível"
    private <T> T call(java.util.function.Supplier<T> request) {
        try {
            return request.get();
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 404 || status == 413 || status == 422) {
                Map<?, ?> body = e.getResponseBodyAs(Map.class);
                Object detail = body != null ? body.get("detail") : null;
                throw new ApiException(HttpStatus.valueOf(status),
                        detail != null ? detail.toString() : "Pedido recusado pelo serviço de IA.");
            }
            if (status == 401) {
                log.error("A IA recusou o token: confira AI_SERVICE_TOKEN nos dois serviços");
            } else {
                log.warn("IA respondeu {}", status);
            }
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE);
        } catch (RestClientException e) {
            log.warn("IA sem resposta: {}", e.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE);
        }
    }
}
