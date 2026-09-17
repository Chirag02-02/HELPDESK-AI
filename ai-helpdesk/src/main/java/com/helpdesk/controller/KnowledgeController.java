package com.helpdesk.controller;

import com.helpdesk.entity.KnowledgeArticle;
import com.helpdesk.service.KnowledgeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/knowledge")
@RequiredArgsConstructor
@Tag(name = "Knowledge Base", description = "HelpDesk RAG Knowledge Base Article Management (ADMIN / AGENT only)")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','AGENT')")
public class KnowledgeController {

    private final KnowledgeService knowledgeService;

    @GetMapping
    @Operation(summary = "Get all knowledge base articles")
    public ResponseEntity<List<KnowledgeArticle>> getAllArticles() {
        return ResponseEntity.ok(knowledgeService.getAllArticles());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a knowledge article by ID")
    public ResponseEntity<KnowledgeArticle> getArticleById(@PathVariable Long id) {
        return ResponseEntity.ok(knowledgeService.getArticleById(id));
    }

    @PostMapping
    @Operation(summary = "Create a new knowledge base article")
    public ResponseEntity<KnowledgeArticle> createArticle(@Valid @RequestBody KnowledgeArticle article) {
        return ResponseEntity.ok(knowledgeService.createArticle(article));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing knowledge base article")
    public ResponseEntity<KnowledgeArticle> updateArticle(@PathVariable Long id, @Valid @RequestBody KnowledgeArticle details) {
        return ResponseEntity.ok(knowledgeService.updateArticle(id, details));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a knowledge base article")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        knowledgeService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }
}
