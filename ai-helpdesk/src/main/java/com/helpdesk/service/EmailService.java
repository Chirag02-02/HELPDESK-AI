package com.helpdesk.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Async
    public void sendTicketCreated(String to, String name, Long ticketId, String title) {
        sendEmail(to, "Ticket #" + ticketId + " Created — HelpDesk AI",
                "Hi " + name + ",\n\n" +
                "Your support ticket has been created successfully.\n\n" +
                "Ticket ID : #" + ticketId + "\n" +
                "Subject   : " + title + "\n\n" +
                "Our AI assistant is already looking into this. If your issue requires a human agent, " +
                "we will assign one shortly.\n\n" +
                "You can track your ticket at any time by logging into your account.\n\n" +
                "Best regards,\nHelpDesk AI Team");
    }

    @Async
    public void sendTicketClosed(String to, String name, Long ticketId, String title) {
        sendEmail(to, "Ticket #" + ticketId + " Closed — HelpDesk AI",
                "Hi " + name + ",\n\n" +
                "Your support ticket has been resolved and closed.\n\n" +
                "Ticket ID : #" + ticketId + "\n" +
                "Subject   : " + title + "\n\n" +
                "If you feel your issue was not fully resolved, you can reopen the ticket from your dashboard.\n\n" +
                "We'd love to hear your feedback!\n\n" +
                "Best regards,\nHelpDesk AI Team");
    }

    @Async
    public void sendDailyReport(String adminEmail, String reportContent) {
        sendEmail(adminEmail, "Daily HelpDesk Report — " + java.time.LocalDate.now(), reportContent);
    }

    @Async
    public void sendEscalationAlert(String agentEmail, Long ticketId, String title, String priority) {
        sendEmail(agentEmail, "[" + priority + " PRIORITY] Ticket #" + ticketId + " Needs Attention",
                "A ticket has been escalated to your team.\n\n" +
                "Ticket ID : #" + ticketId + "\n" +
                "Subject   : " + title + "\n" +
                "Priority  : " + priority + "\n\n" +
                "Please log in to your agent dashboard to handle this ticket.\n\n" +
                "HelpDesk AI System");
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent to {}: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
