// Acesso à tabela "predictions".
package com.pixoramed.repository;

import com.pixoramed.model.Prediction;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    // Análises de um usuário, da mais nova para a mais antiga
    List<Prediction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
