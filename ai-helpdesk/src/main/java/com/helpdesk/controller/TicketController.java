package com.helpdesk.controller;

import com.helpdesk.entity.Ticket;
import com.helpdesk.entity.Message;
import com.helpdesk.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// ── Ticket Controller ────────────────────────────────────────

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Create and manage support tickets")
@SecurityRequirement(name = "bearerAuth")
public class TicketController {

    private final TicketService ticketService;
    private final com.helpdesk.service.UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Create a new support ticket")
    public ResponseEntity<?> createTicket(
            @Valid @RequestBody CreateTicketRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required. Please log in again."));
        }
        try {
            Ticket ticket = ticketService.createTicket(
                    userDetails.getUsername(),
                    request.title(),
                    request.description(),
                    request.category()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(ticket);
        } catch (com.helpdesk.exception.AppException ex) {
            return ResponseEntity.status(ex.getStatus())
                    .body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", ex.getMessage() != null ? ex.getMessage() : "An error occurred while creating the ticket.", "type", ex.getClass().getName()));
        }
    }

    @GetMapping("/my")
    @Operation(summary = "Get all tickets for the logged-in customer")
    public ResponseEntity<List<Ticket>> getMyTickets(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.getMyTickets(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single ticket by ID")
    public ResponseEntity<Ticket> getTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.getTicket(id, userDetails.getUsername()));
    }

    @GetMapping("/{id}/messages")
    @Operation(summary = "Get all messages for a ticket")
    public ResponseEntity<List<Message>> getTicketMessages(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.getTicketMessages(id, userDetails.getUsername()));
    }

    @PutMapping("/{id}/close")
    @Operation(summary = "Close a ticket")
    public ResponseEntity<Ticket> closeTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.closeTicket(id, userDetails.getUsername()));
    }

    @PutMapping("/{id}/reopen")
    @Operation(summary = "Reopen a closed ticket")
    public ResponseEntity<Ticket> reopenTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.reopenTicket(id, userDetails.getUsername()));
    }

    @GetMapping({"/agents", "/support-agents", "/admins"})
    @Operation(summary = "Get list of available support agents/admins for customer selection")
    public ResponseEntity<List<java.util.Map<String, Object>>> getSupportAgents() {
        List<java.util.Map<String, Object>> agents = userService.getSupportAgents().stream()
                .map(u -> {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", u.getId());
                    map.put("name", u.getName() != null && !u.getName().isBlank() ? u.getName() : (u.getEmail() != null ? u.getEmail() : "Support Agent"));
                    map.put("email", u.getEmail() != null ? u.getEmail() : "");
                    map.put("role", u.getRole() != null ? u.getRole().name() : "ADMIN");
                    map.put("active", u.isActive());
                    map.put("available", u.isActive());
                    return map;
                })
                .toList();
        return ResponseEntity.ok(agents);
    }

    @PostMapping("/{id}/assign-agent")
    @PutMapping("/{id}/assign-agent")
    @Operation(summary = "Customer explicitly assigns a support representative for human escalation")
    public ResponseEntity<?> assignAgent(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required. Please log in."));
        }

        Object assigneeObj = body.get("assigneeId");
        if (assigneeObj == null) {
            assigneeObj = body.get("agentId");
        }

        if (assigneeObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "assigneeId is required to select a support representative."));
        }

        Long agentId;
        if (assigneeObj instanceof Number n) {
            agentId = n.longValue();
        } else {
            try {
                agentId = Long.parseLong(assigneeObj.toString());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid assigneeId format."));
            }
        }

        try {
            Ticket ticket = ticketService.assignSupportAgentByCustomer(id, agentId, userDetails.getUsername());
            return ResponseEntity.ok(ticket);
        } catch (com.helpdesk.exception.AppException ex) {
            return ResponseEntity.status(ex.getStatus()).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{id}/escalate")
    @Operation(summary = "Escalate ticket to human support agent")
    public ResponseEntity<Ticket> escalateTicket(
            @PathVariable Long id,
            @RequestParam(required = false) String targetAgent,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.escalateTicket(id, userDetails.getUsername(), targetAgent));
    }

    public record CreateTicketRequest(
            @NotBlank String title,
            String description,
            Ticket.Category category
    ) {}
}

// ── Chat Controller ──────────────────────────────────────────

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "AI Chat", description = "Send messages and get AI responses")
@SecurityRequirement(name = "bearerAuth")
class ChatController {

    private final TicketService ticketService;
    private final com.helpdesk.service.GroqAiService groqAiService;
    private final com.helpdesk.service.KnowledgeService knowledgeService;

    @PostMapping("/direct")
    @Operation(summary = "Direct chat with AI assistant using RAG knowledge base without requiring a pre-existing ticket")
    public ResponseEntity<?> directChat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required. Please log in again."));
        }
        var matchingArticle = knowledgeService.findRelevantKnowledge(request.message(), null);
        String knowledgeContext = matchingArticle.map(a -> "Article Title: " + a.getTitle() + "\nVerified Solution:\n" + a.getAnswer()).orElse(null);

        com.helpdesk.service.GroqAiService.AiResponse response = groqAiService.chat(
                request.message(),
                java.util.List.of(),
                userDetails.getUsername(),
                null,
                knowledgeContext
        );
        return ResponseEntity.ok(Map.of("reply", response.getReply(), "escalate", response.isEscalate()));
    }

    @PostMapping("/{ticketId}")
    @Operation(summary = "Send a message to the AI assistant for a ticket")
    public ResponseEntity<?> chat(
            @PathVariable Long ticketId,
            @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required. Please log in again."));
        }
        String reply = ticketService.chat(ticketId, userDetails.getUsername(), request.message());
        return ResponseEntity.ok(Map.of("reply", reply));
    }

    public record ChatRequest(@NotBlank String message) {}
}
