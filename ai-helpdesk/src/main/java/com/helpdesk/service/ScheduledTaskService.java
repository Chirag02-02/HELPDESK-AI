package com.helpdesk.service;

import com.helpdesk.entity.Ticket;
import com.helpdesk.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledTaskService {

    private final TicketRepository ticketRepository;
    private final EmailService emailService;

    @Value("${app.mail.from}")
    private String adminEmail;

    /**
     * Runs every night at 11:00 PM and sends a daily report to admin.
     */
    @Scheduled(cron = "0 0 23 * * *")
    public void sendDailyReport() {
        log.info("Generating daily report for {}", LocalDate.now());

        long open     = ticketRepository.countByStatus(Ticket.Status.OPEN);
        long pending  = ticketRepository.countByStatus(Ticket.Status.PENDING);
        long closed   = ticketRepository.countClosedSince(LocalDateTime.now().minusDays(1));
        long highPri  = ticketRepository.countOpenByPriority(Ticket.Priority.HIGH);
        long critical = ticketRepository.countOpenByPriority(Ticket.Priority.CRITICAL);
        long aiSolved = ticketRepository.countAiResolved();
        long total    = ticketRepository.count();

        double aiRate = total > 0 ? (aiSolved * 100.0 / total) : 0;

        String report = String.format("""
                HelpDesk AI — Daily Report (%s)
                ==========================================
                
                Open tickets      : %d
                Pending tickets   : %d
                Closed today      : %d
                High priority     : %d
                Critical          : %d
                
                AI resolved total : %d
                AI success rate   : %.1f%%
                Human required    : %.1f%%
                
                ==========================================
                Generated automatically by HelpDesk AI Scheduler
                """,
                LocalDate.now(), open, pending, closed, highPri, critical,
                aiSolved, aiRate, 100 - aiRate);

        emailService.sendDailyReport(adminEmail, report);
        log.info("Daily report sent to {}", adminEmail);
    }

    /**
     * Every hour — check for stale open tickets and log a warning.
     */
    @Scheduled(fixedRate = 3_600_000)
    public void checkStaleTickets() {
        long stale = ticketRepository.countByStatus(Ticket.Status.OPEN);
        if (stale > 50) {
            log.warn("High open ticket count: {} tickets need attention!", stale);
        }
    }
}
