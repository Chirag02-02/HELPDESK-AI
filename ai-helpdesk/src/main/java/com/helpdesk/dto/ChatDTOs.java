package com.helpdesk.dto;

import com.helpdesk.entity.Ticket;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

public class ChatDTOs {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatRequest {
        @NotBlank(message = "Message cannot be empty")
        private String message;

        private Long ticketId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatResponse {
        private String reply;
        private boolean escalated;
        private Ticket.Priority detectedPriority;
        private Ticket.Sentiment detectedSentiment;
        private Long ticketId;
    }
}
