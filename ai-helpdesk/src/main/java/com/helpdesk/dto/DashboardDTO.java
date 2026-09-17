package com.helpdesk.dto;

import lombok.*;

public class DashboardDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DashboardStats {
        private long openTickets;
        private long closedToday;
        private long highPriority;
        private long aiResolved;
        private long humanRequired;
        private double aiSuccessRate;
    }
}
