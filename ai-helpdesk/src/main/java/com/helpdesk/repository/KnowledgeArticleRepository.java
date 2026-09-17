package com.helpdesk.repository;

import com.helpdesk.entity.KnowledgeArticle;
import com.helpdesk.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeArticleRepository extends JpaRepository<KnowledgeArticle, Long> {

    List<KnowledgeArticle> findByActiveTrueOrderByCreatedAtDesc();

    List<KnowledgeArticle> findByCategoryAndActiveTrue(Ticket.Category category);

    @Query("SELECT k FROM KnowledgeArticle k WHERE k.active = true AND (" +
           "LOWER(k.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(k.question) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(k.answer) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(k.keywords) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<KnowledgeArticle> searchByKeyword(@Param("keyword") String keyword);
}
