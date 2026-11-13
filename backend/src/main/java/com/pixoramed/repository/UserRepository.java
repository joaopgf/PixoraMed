// Acesso à tabela "users".
package com.pixoramed.repository;

import com.pixoramed.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // E-mail já usado por outra conta (na edição, o próprio e-mail não conta)
    boolean existsByEmailAndIdNot(String email, Long id);
}
