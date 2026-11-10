// Acesso à tabela "trainings".
package com.pixoramed.repository;

import com.pixoramed.model.Training;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingRepository extends JpaRepository<Training, Long> {
}
