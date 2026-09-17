package com.helpdesk.controller;

import com.helpdesk.entity.Ticket;
import com.helpdesk.repository.TicketRepository;
import com.helpdesk.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin dashboard and ticket management (ADMIN / AGENT only)")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','AGENT')")
public class AdminController {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final com.helpdesk.repository.MessageRepository messageRepository;

    @GetMapping("/dashboard")
    @Operation(summary = "Get dashboard statistics")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        long open      = ticketRepository.countByStatus(Ticket.Status.OPEN);
        long pending   = ticketRepository.countByStatus(Ticket.Status.PENDING);
        long closedToday = ticketRepository.countClosedSince(LocalDateTime.now().minusDays(1));
        long highPri   = ticketRepository.countOpenByPriority(Ticket.Priority.HIGH);
        long critical  = ticketRepository.countOpenByPriority(Ticket.Priority.CRITICAL);
        long aiResolved = ticketRepository.countAiResolved();
        long total     = ticketRepository.count();
        long totalUsers = userRepository.count();
        double aiRate  = total > 0 ? Math.round((aiResolved * 100.0 / total) * 10) / 10.0 : 0;

        return ResponseEntity.ok(Map.of(
                "openTickets", open,
                "pendingTickets", pending,
                "closedToday", closedToday,
                "highPriority", highPri,
                "critical", critical,
                "aiResolved", aiResolved,
                "totalTickets", total,
                "totalUsers", totalUsers,
                "aiSuccessRate", aiRate,
                "humanRequired", Math.round((100 - aiRate) * 10) / 10.0
        ));
    }

    @GetMapping("/tickets")
    @Operation(summary = "Get all tickets with optional priority filter")
    public ResponseEntity<List<Ticket>> getAllTickets(
            @RequestParam(required = false) Ticket.Priority priority,
            @RequestParam(required = false) Ticket.Status status) {
        List<Ticket> tickets;
        if (priority != null) {
            tickets = ticketRepository.findByPriorityOrderByCreatedAtDesc(priority);
        } else if (status != null) {
            tickets = ticketRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            tickets = ticketRepository.findByOrderByCreatedAtDesc();
        }
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/tickets/human-support")
    @Operation(summary = "Get all active human support tickets requiring agent attention")
    public ResponseEntity<List<Map<String, Object>>> getHumanSupportTickets() {
        List<Ticket> tickets = ticketRepository.findHumanSupportTickets();
        List<Map<String, Object>> result = tickets.stream().map(t -> {
            var msgs = messageRepository.findByTicketIdOrderBySentAtAsc(t.getId());
            String lastMsg = !msgs.isEmpty() ? msgs.get(msgs.size() - 1).getContent() : t.getDescription();

            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", t.getId());
            map.put("title", t.getTitle());
            map.put("description", t.getDescription());
            map.put("category", t.getCategory().name());
            map.put("status", t.getStatus().name());
            map.put("priority", t.getPriority().name());
            map.put("assignedTo", t.getAssignedTo() != null ? t.getAssignedTo() : "Support Queue");
            map.put("aiResolved", t.isAiResolved());
            map.put("user", Map.of(
                    "id", t.getUser().getId(),
                    "name", t.getUser().getName() != null ? t.getUser().getName() : "Customer",
                    "email", t.getUser().getEmail()
            ));
            map.put("createdAt", t.getCreatedAt());
            map.put("updatedAt", t.getUpdatedAt());
            map.put("lastMessage", lastMsg != null ? lastMsg : "");
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PutMapping("/tickets/{id}/assign")
    @Operation(summary = "Assign a ticket to a team or agent")
    public ResponseEntity<Ticket> assignTicket(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new com.helpdesk.exception.AppException("Ticket not found",
                        org.springframework.http.HttpStatus.NOT_FOUND));
        String assignee = body.get("assignedTo");
        ticket.setAssignedTo(assignee);
        ticket.setStatus(Ticket.Status.IN_PROGRESS);
        Ticket saved = ticketRepository.save(ticket);

        // Save system message to DB
        com.helpdesk.entity.Message assignMsg = com.helpdesk.entity.Message.builder()
                .ticket(saved)
                .senderType(com.helpdesk.entity.Message.SenderType.AI)
                .content("🎫 System: Ticket has been assigned to " + assignee + ".")
                .build();
        messageRepository.save(assignMsg);

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/tickets/{id}/priority")
    @Operation(summary = "Update ticket priority")
    public ResponseEntity<Ticket> updatePriority(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new com.helpdesk.exception.AppException("Ticket not found",
                        org.springframework.http.HttpStatus.NOT_FOUND));
        ticket.setPriority(Ticket.Priority.valueOf(body.get("priority")));
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    @PutMapping("/tickets/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin closes a ticket")
    public ResponseEntity<Ticket> closeTicket(
            @PathVariable Long id,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        if (userDetails != null) {
            var userOpt = userRepository.findByEmail(userDetails.getUsername());
            if (userOpt.isPresent() && userOpt.get().getRole() != com.helpdesk.entity.User.Role.ADMIN) {
                throw new com.helpdesk.exception.AppException("Only Admin has authority to close tickets",
                        org.springframework.http.HttpStatus.FORBIDDEN);
            }
        }
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new com.helpdesk.exception.AppException("Ticket not found",
                        org.springframework.http.HttpStatus.NOT_FOUND));
        ticket.setStatus(Ticket.Status.CLOSED);
        Ticket saved = ticketRepository.save(ticket);

        // Save system message
        com.helpdesk.entity.Message closeMsg = com.helpdesk.entity.Message.builder()
                .ticket(saved)
                .senderType(com.helpdesk.entity.Message.SenderType.AI)
                .content("🎫 System: Ticket has been closed by Admin.")
                .build();
        messageRepository.save(closeMsg);

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/tickets/{id}/reply")
    @Operation(summary = "Admin sends a direct reply message to the customer ticket")
    public ResponseEntity<com.helpdesk.entity.Message> replyToTicket(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new com.helpdesk.exception.AppException("Ticket not found",
                        org.springframework.http.HttpStatus.NOT_FOUND));

        String content = body.get("message");
        if (content == null || content.isBlank()) {
            throw new com.helpdesk.exception.AppException("Message content cannot be blank",
                    org.springframework.http.HttpStatus.BAD_REQUEST);
        }

        String adminName = "Support Agent";
        if (userDetails != null) {
            var userOpt = userRepository.findByEmail(userDetails.getUsername());
            if (userOpt.isPresent() && userOpt.get().getName() != null) {
                adminName = userOpt.get().getName();
            }
        }

        com.helpdesk.entity.Message agentMsg = com.helpdesk.entity.Message.builder()
                .ticket(ticket)
                .senderType(com.helpdesk.entity.Message.SenderType.AGENT)
                .content(content)
                .build();
        com.helpdesk.entity.Message savedMsg = messageRepository.save(agentMsg);

        ticket.setStatus(Ticket.Status.IN_PROGRESS);
        if (ticket.getAssignedTo() == null || "AI".equalsIgnoreCase(ticket.getAssignedTo())) {
            ticket.setAssignedTo(adminName);
        }
        ticketRepository.save(ticket);

        return ResponseEntity.ok(savedMsg);
    }
}
