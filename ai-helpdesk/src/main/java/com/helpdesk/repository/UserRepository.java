package com.helpdesk.repository;

import com.helpdesk.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByName(String name);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.role IN :roles AND u.active = true")
    List<User> findSupportAgentsByRoles(@Param("roles") List<User.Role> roles);

    @Query("SELECT u FROM User u WHERE u.role = :role AND u.active = true")
    List<User> findUsersByRole(@Param("role") User.Role role);

    default List<User> findSupportAgents() {
        return findSupportAgentsByRoles(List.of(User.Role.ADMIN, User.Role.AGENT));
    }

    default List<User> findSupportAgents(List<User.Role> roles) {
        return findSupportAgentsByRoles(roles);
    }

    default List<User> findAdminUsers() {
        return findUsersByRole(User.Role.ADMIN);
    }

    default List<User> findAdminUsers(User.Role role) {
        return findUsersByRole(role);
    }
}