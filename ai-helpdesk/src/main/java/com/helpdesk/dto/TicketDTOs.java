package com.helpdesk.dto;

import com.helpdesk.entity.Message;
import com.helpdesk.entity.Ticket;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class TicketDTOs {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateTicketRequest {
        @NotBlank(message = "Title is required")
        private String title;

        private String description;

        private Ticket.Category category;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TicketResponse {
        private Long id;
        private String title;
        private String description;
        private Ticket.Status status;
        private Ticket.Priority priority;
        private Ticket.Category category;
        private String assignedTo;
        private boolean aiResolved;
        private Ticket.Sentiment sentiment;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<MessageResponse> messages;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateTicketRequest {
        private Ticket.Status status;
        private Ticket.Priority priority;
        private String assignedTo;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MessageResponse {
        private Long id;
        private Message.SenderType senderType;
        private String content;
        private LocalDateTime sentAt;
    }
}
