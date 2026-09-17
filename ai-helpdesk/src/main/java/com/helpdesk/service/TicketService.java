package com.helpdesk.service;

import com.helpdesk.entity.*;
import com.helpdesk.exception.AppException;
import com.helpdesk.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final GroqAiService groqAiService;
    private final KnowledgeService knowledgeService;

    @Transactional
    public Ticket createTicket(String email, String title, String description, Ticket.Category category) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        Ticket ticket = Ticket.builder()
                .title(title)
                .description(description)
                .category(category != null ? category : Ticket.Category.OTHER)
                .status(Ticket.Status.OPEN)
                .priority(Ticket.Priority.MEDIUM)
                .assignedTo("AI")
                .sentiment(Ticket.Sentiment.NEUTRAL)
                .aiResolved(false)
                .user(user)
                .build();

        Ticket saved = ticketRepository.save(ticket);

        // Process directly with AI upon ticket creation
        String userMsgText = (description != null && !description.isBlank())
                ? description
                : (title != null ? title : "Help me with this issue");

        // 1. Save Customer initial message
        Message customerMsg = Message.builder()
                .ticket(saved)
                .senderType(Message.SenderType.CUSTOMER)
                .content(userMsgText)
                .build();
        messageRepository.save(customerMsg);

        // 2. Perform RAG Search in Knowledge Base
        var matchingArticle = knowledgeService.findRelevantKnowledge(userMsgText, saved.getCategory());
        String knowledgeContext = matchingArticle.map(a -> "Article Title: " + a.getTitle() + "\nVerified Solution:\n" + a.getAnswer()).orElse(null);

        // 3. Send to AI with Grounded Knowledge Context
        GroqAiService.AiResponse aiResponse = groqAiService.chat(userMsgText, java.util.List.of(), user.getEmail(), saved.getId(), knowledgeContext);

        // 4. Update ticket metadata based on AI response
        saved.setSentiment(aiResponse.getSentiment());
        saved.setPriority(aiResponse.getPriority());
        if (aiResponse.isEscalate()) {
            saved.setAiResolved(false);
            saved.setAssignedTo("UNASSIGNED");
            saved.setStatus(Ticket.Status.PENDING);
        } else {
            saved.setAiResolved(true);
            saved.setAssignedTo("AI");
            saved.setStatus(Ticket.Status.OPEN);
        }
        saved = ticketRepository.save(saved);

        // 5. Save AI initial response message
        Message aiMsg = Message.builder()
                .ticket(saved)
                .senderType(Message.SenderType.AI)
                .content(aiResponse.getReply())
                .build();
        messageRepository.save(aiMsg);

        // Send confirmation email async
        emailService.sendTicketCreated(user.getEmail(), user.getName(), saved.getId(), title);

        log.info("Ticket #{} created & processed via RAG AI context for {} — aiResolved: {}", saved.getId(), email, saved.isAiResolved());
        return saved;
    }

    @Transactional
    public String chat(Long ticketId, String userEmail, String userMessage) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new AppException("Ticket not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        if (user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.AGENT) {
            // Save Agent/Admin response
            Message agentMsg = Message.builder()
                    .ticket(ticket)
                    .senderType(Message.SenderType.AGENT)
                    .content(userMessage)
                    .build();
            messageRepository.save(agentMsg);

            // Update ticket status to IN_PROGRESS since agent/admin replied
            ticket.setStatus(Ticket.Status.IN_PROGRESS);
            if (ticket.getAssignedTo() == null || "AI".equalsIgnoreCase(ticket.getAssignedTo()) || "UNASSIGNED".equalsIgnoreCase(ticket.getAssignedTo())) {
                ticket.setAssignedTo(user.getName() != null ? user.getName() : user.getEmail());
            }
            ticketRepository.save(ticket);

            return "Agent reply saved successfully";
        }

        boolean isAssignedToHumanOrDept = ticket.getAssignedTo() != null &&
                !"AI".equalsIgnoreCase(ticket.getAssignedTo()) &&
                !"UNASSIGNED".equalsIgnoreCase(ticket.getAssignedTo()) &&
                (ticket.getStatus() == Ticket.Status.PENDING || ticket.getStatus() == Ticket.Status.IN_PROGRESS);

        if (isAssignedToHumanOrDept) {
            // Forward message to assigned support agent / department
            Message customerMsg = Message.builder()
                    .ticket(ticket)
                    .senderType(Message.SenderType.CUSTOMER)
                    .content(userMessage)
                    .build();
            messageRepository.save(customerMsg);

            ticket.setStatus(Ticket.Status.PENDING);
            ticketRepository.save(ticket);

            return "Message forwarded to assigned support agent (" + ticket.getAssignedTo() + ").";
        }

        // Build conversation history for context
        List<Message> history = messageRepository.findByTicketIdOrderBySentAtAsc(ticketId);
        List<GroqAiService.ConversationMessage> conversationHistory = history.stream()
                .map(m -> new GroqAiService.ConversationMessage(
                        (m.getSenderType() == Message.SenderType.AI || m.getSenderType() == Message.SenderType.AGENT) ? "assistant" : "user",
                        m.getContent()))
                .toList();

        // Save customer message
        Message customerMsg = Message.builder()
                .ticket(ticket)
                .senderType(Message.SenderType.CUSTOMER)
                .content(userMessage)
                .build();
        messageRepository.save(customerMsg);

        // Perform RAG Search in Knowledge Base
        var matchingArticle = knowledgeService.findRelevantKnowledge(userMessage, ticket.getCategory());
        String knowledgeContext = matchingArticle.map(a -> "Article Title: " + a.getTitle() + "\nVerified Solution:\n" + a.getAnswer()).orElse(null);

        // Get AI response with Grounded Knowledge Context
        GroqAiService.AiResponse aiResponse = groqAiService.chat(userMessage, conversationHistory, userEmail, ticketId, knowledgeContext);

        // Update ticket metadata
        ticket.setSentiment(aiResponse.getSentiment());
        if (aiResponse.isEscalate()) {
            ticket.setPriority(Ticket.Priority.HIGH);
            ticket.setAssignedTo("UNASSIGNED");
            ticket.setAiResolved(false);
            ticket.setStatus(Ticket.Status.PENDING); // PENDING represents "Pending Human Review"
        } else {
            ticket.setAiResolved(true);
        }
        ticketRepository.save(ticket);

        // Save AI reply
        Message aiMsg = Message.builder()
                .ticket(ticket)
                .senderType(Message.SenderType.AI)
                .content(aiResponse.getReply())
                .build();
        messageRepository.save(aiMsg);

        return aiResponse.getReply();
    }

    public List<Ticket> getMyTickets(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        if (user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.AGENT) {
            String name = user.getName() != null ? user.getName() : "";
            return ticketRepository.findMyTicketsForAgentOrAdmin(user.getId(), name, user.getEmail());
        }

        return ticketRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    public Ticket getTicket(Long id, String email) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new AppException("Ticket not found", HttpStatus.NOT_FOUND));
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        
        // Allow customer owner or administrative roles to load ticket
        if (user.getRole() != User.Role.ADMIN && user.getRole() != User.Role.AGENT && !ticket.getUser().getEmail().equals(email)) {
            throw new AppException("Access denied", HttpStatus.FORBIDDEN);
        }
        return ticket;
    }

    public List<Message> getTicketMessages(Long ticketId, String email) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new AppException("Ticket not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        // Customers can only see messages of their own tickets; admins/agents see all
        if (user.getRole() != User.Role.ADMIN && user.getRole() != User.Role.AGENT && !ticket.getUser().getEmail().equals(email)) {
            throw new AppException("Access denied", HttpStatus.FORBIDDEN);
        }

        return messageRepository.findByTicketIdOrderBySentAtAsc(ticketId);
    }

    @Transactional
    public Ticket closeTicket(Long id, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        if (user.getRole() != User.Role.ADMIN) {
            throw new AppException("Only Admin has authority to close tickets", HttpStatus.FORBIDDEN);
        }

        Ticket ticket = getTicket(id, email);
        ticket.setStatus(Ticket.Status.CLOSED);
        Ticket saved = ticketRepository.save(ticket);
        emailService.sendTicketClosed(ticket.getUser().getEmail(), ticket.getUser().getName(), id, ticket.getTitle());

        // Save system message to DB
        Message closeMsg = Message.builder()
                .ticket(saved)
                .senderType(Message.SenderType.AI)
                .content("🎫 System: This ticket has been marked as resolved and closed.")
                .build();
        messageRepository.save(closeMsg);

        return saved;
    }

    @Transactional
    public Ticket reopenTicket(Long id, String email) {
        Ticket ticket = getTicket(id, email);
        ticket.setStatus(Ticket.Status.OPEN);
        Ticket saved = ticketRepository.save(ticket);

        // Save system message to DB
        Message reopenMsg = Message.builder()
                .ticket(saved)
                .senderType(Message.SenderType.AI)
                .content("🎫 System: Ticket has been reopened.")
                .build();
        messageRepository.save(reopenMsg);

        return saved;
    }

    @Transactional
    public Ticket escalateTicket(Long id, String email) {
        return escalateTicket(id, email, null);
    }

    @Transactional
    public Ticket escalateTicket(Long id, String email, String targetAgent) {
        Ticket ticket = getTicket(id, email);
        ticket.setStatus(Ticket.Status.PENDING); // PENDING represents Pending Human Review
        ticket.setAiResolved(false);
        String target = targetAgent != null && !targetAgent.isBlank() ? targetAgent : "UNASSIGNED";
        ticket.setAssignedTo(target);
        ticket.setPriority(Ticket.Priority.HIGH);
        Ticket saved = ticketRepository.save(ticket);

        // Save system message to DB
        Message escalateMsg = Message.builder()
                .ticket(saved)
                .senderType(Message.SenderType.AI)
                .content("🎫 System: Ticket has been escalated for human support selection.")
                .build();
        messageRepository.save(escalateMsg);

        return saved;
    }

    @Transactional
    public Ticket assignSupportAgentByCustomer(Long ticketId, Long agentUserId, String customerEmail) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new AppException("Ticket not found", HttpStatus.NOT_FOUND));

        User customer = userRepository.findByEmail(customerEmail)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        // Strict Ownership Check: Only the ticket owner (or admin/agent) can assign human support for their ticket
        if (customer.getRole() != User.Role.ADMIN && customer.getRole() != User.Role.AGENT && !ticket.getUser().getId().equals(customer.getId())) {
            throw new AppException("Access denied. You do not own this ticket.", HttpStatus.FORBIDDEN);
        }

        User agent = userRepository.findById(agentUserId)
                .orElseThrow(() -> new AppException("Support representative not found", HttpStatus.NOT_FOUND));

        if (agent.getRole() != User.Role.ADMIN && agent.getRole() != User.Role.AGENT) {
            throw new AppException("Selected user is not a valid support agent", HttpStatus.BAD_REQUEST);
        }

        String agentName = agent.getName() != null && !agent.getName().isBlank() ? agent.getName() : agent.getEmail();
        ticket.setAssignedTo(agentName);
        ticket.setStatus(Ticket.Status.PENDING);
        ticket.setAiResolved(false);
        Ticket saved = ticketRepository.save(ticket);

        // System message logging customer choice
        Message msg = Message.builder()
                .ticket(saved)
                .senderType(Message.SenderType.AI)
                .content("🎫 System: Customer connected with support representative " + agentName + ".")
                .build();
        messageRepository.save(msg);

        log.info("Ticket #{} explicitly assigned to agent '{}' (ID: {}) by customer {}", ticketId, agentName, agentUserId, customerEmail);
        return saved;
    }

    public List<User> getSupportAgents() {
        return userRepository.findSupportAgents();
    }
}
