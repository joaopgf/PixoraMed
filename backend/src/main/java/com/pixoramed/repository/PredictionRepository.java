// Acesso à tabela "predictions".
package com.pixoramed.repository;

import com.pixoramed.model.Prediction;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    // Análises de um usuário, da mais nova para a mais antiga
    List<Prediction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // Apaga o histórico inteiro de um usuário com um DELETE só (usado na exclusão da conta)
    @Modifying
    @Query("delete from Prediction p where p.userId = :userId")
    int deleteByUserId(Long userId);
}
