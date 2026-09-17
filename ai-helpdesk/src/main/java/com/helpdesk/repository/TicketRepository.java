package com.helpdesk.repository;

import com.helpdesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT t FROM Ticket t WHERE t.user.id = :userId OR (t.assignedTo IS NOT NULL AND (LOWER(t.assignedTo) = LOWER(:userEmail) OR (:userName IS NOT NULL AND :userName != '' AND LOWER(t.assignedTo) = LOWER(:userName)))) ORDER BY t.createdAt DESC")
    List<Ticket> findMyTicketsForAgentOrAdmin(@Param("userId") Long userId, @Param("userName") String userName, @Param("userEmail") String userEmail);

    List<Ticket> findByStatusOrderByCreatedAtDesc(Ticket.Status status);
    List<Ticket> findByPriorityOrderByCreatedAtDesc(Ticket.Priority priority);
    List<Ticket> findByCategoryOrderByCreatedAtDesc(Ticket.Category category);
    List<Ticket> findByOrderByCreatedAtDesc();

    @Query("SELECT t FROM Ticket t WHERE t.status != 'CLOSED' ORDER BY t.updatedAt DESC")
    List<Ticket> findHumanSupportTickets();

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.status = :status")
    long countByStatus(@Param("status") Ticket.Status status);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.priority = :priority AND t.status = 'OPEN'")
    long countOpenByPriority(@Param("priority") Ticket.Priority priority);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.aiResolved = true")
    long countAiResolved();

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.updatedAt >= :since AND t.status = 'CLOSED'")
    long countClosedSince(@Param("since") LocalDateTime since);
}