package com.helpdesk.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.helpdesk.entity.Message;
import com.helpdesk.entity.Ticket;
import com.helpdesk.repository.MessageRepository;
import com.helpdesk.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class DatasetService {

    private final TicketRepository ticketRepository;
    private final MessageRepository messageRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String SYSTEM_PROMPT = "You are HelpDesk AI, a professional customer support assistant. Answer questions clearly and detect sentiment, priority, and escalation needs.";

    /**
     * Generates Fine-Tuning dataset in JSONL format (OpenAI / Groq / Llama format).
     * Each line is a single JSON object containing system, user, and assistant messages.
     */
    public String generateFineTuningJsonl() {
        List<Ticket> tickets = ticketRepository.findAll();
        StringBuilder jsonlBuilder = new StringBuilder();

        for (Ticket ticket : tickets) {
            List<Message> messages = messageRepository.findByTicketIdOrderBySentAtAsc(ticket.getId());

            ArrayNode messageArray = objectMapper.createArrayNode();

            // System prompt
            ObjectNode sysNode = messageArray.addObject();
            sysNode.put("role", "system");
            sysNode.put("content", SYSTEM_PROMPT);

            // User initial description
            ObjectNode firstUserNode = messageArray.addObject();
            firstUserNode.put("role", "user");
            firstUserNode.put("content", ticket.getTitle() + ": " + (ticket.getDescription() != null ? ticket.getDescription() : ""));

            // Conversation history
            for (Message msg : messages) {
                if (msg.getContent() == null || msg.getContent().isBlank()) continue;

                ObjectNode node = messageArray.addObject();
                if (msg.getSenderType() == Message.SenderType.CUSTOMER) {
                    node.put("role", "user");
                    node.put("content", msg.getContent());
                } else {
                    node.put("role", "assistant");
                    node.put("content", msg.getContent());
                }
            }

            // Only include non-empty conversation samples
            if (messageArray.size() > 1) {
                ObjectNode lineObject = objectMapper.createObjectNode();
                lineObject.set("messages", messageArray);

                try {
                    jsonlBuilder.append(objectMapper.writeValueAsString(lineObject)).append("\n");
                } catch (Exception e) {
                    log.error("Error serializing ticket #{} to JSONL: {}", ticket.getId(), e.getMessage());
                }
            }
        }

        return jsonlBuilder.toString();
    }

    /**
     * Generates RAG Knowledge Base dataset in JSON format.
     * Contains structured Q&A pairs and ticket metadata for vector indexing.
     */
    public String generateRagKnowledgeJson() {
        List<Ticket> tickets = ticketRepository.findAll();
        ArrayNode knowledgeList = objectMapper.createArrayNode();

        for (Ticket ticket : tickets) {
            List<Message> messages = messageRepository.findByTicketIdOrderBySentAtAsc(ticket.getId());

            StringBuilder resolution = new StringBuilder();
            for (Message msg : messages) {
                if (msg.getSenderType() == Message.SenderType.AI || msg.getSenderType() == Message.SenderType.AGENT) {
                    if (resolution.length() > 0) resolution.append("\n");
                    resolution.append(msg.getContent());
                }
            }

            ObjectNode doc = objectMapper.createObjectNode();
            doc.put("ticketId", ticket.getId());
            doc.put("title", ticket.getTitle());
            doc.put("category", ticket.getCategory() != null ? ticket.getCategory().name() : "GENERAL");
            doc.put("priority", ticket.getPriority() != null ? ticket.getPriority().name() : "MEDIUM");
            doc.put("sentiment", ticket.getSentiment() != null ? ticket.getSentiment().name() : "NEUTRAL");
            doc.put("status", ticket.getStatus() != null ? ticket.getStatus().name() : "OPEN");
            doc.put("aiResolved", ticket.isAiResolved());
            doc.put("question", ticket.getDescription() != null ? ticket.getDescription() : ticket.getTitle());
            doc.put("answer", resolution.length() > 0 ? resolution.toString() : "No AI/Agent answer recorded yet.");
            doc.put("createdAt", ticket.getCreatedAt() != null ? ticket.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "");

            knowledgeList.add(doc);
        }

        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(knowledgeList);
        } catch (Exception e) {
            log.error("Error generating RAG Knowledge JSON: {}", e.getMessage());
            return "[]";
        }
    }

    /**
     * Generates Classification CSV dataset for model training and data analysis.
     */
    public String generateClassificationCsv() {
        List<Ticket> tickets = ticketRepository.findAll();
        StringBuilder csv = new StringBuilder();
        csv.append("ticket_id,title,category,priority,sentiment,ai_resolved,status,created_at\n");

        for (Ticket t : tickets) {
            csv.append(t.getId()).append(",")
                    .append(escapeCsv(t.getTitle())).append(",")
                    .append(t.getCategory() != null ? t.getCategory().name() : "GENERAL").append(",")
                    .append(t.getPriority() != null ? t.getPriority().name() : "MEDIUM").append(",")
                    .append(t.getSentiment() != null ? t.getSentiment().name() : "NEUTRAL").append(",")
                    .append(t.isAiResolved()).append(",")
                    .append(t.getStatus() != null ? t.getStatus().name() : "OPEN").append(",")
                    .append(t.getCreatedAt() != null ? t.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "")
                    .append("\n");
        }

        return csv.toString();
    }

    /**
     * Calculates dataset summary statistics for admin analytics.
     */
    public Map<String, Object> getDatasetSummary() {
        List<Ticket> tickets = ticketRepository.findAll();
        long totalTickets = tickets.size();
        long totalMessages = messageRepository.count();
        long aiResolvedCount = tickets.stream().filter(Ticket::isAiResolved).count();

        Map<String, Integer> categoryDistribution = new HashMap<>();
        for (Ticket t : tickets) {
            String cat = t.getCategory() != null ? t.getCategory().name() : "OTHER";
            categoryDistribution.put(cat, categoryDistribution.getOrDefault(cat, 0) + 1);
        }

        // Token savings estimate: Fine-tuning saves ~450 system prompt tokens per API call
        long estimatedTokenSavings = totalTickets * 450;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTickets", totalTickets);
        stats.put("totalMessages", totalMessages);
        stats.put("aiResolvedCount", aiResolvedCount);
        stats.put("categoryDistribution", categoryDistribution);
        stats.put("estimatedTokenSavings", estimatedTokenSavings);
        stats.put("fineTuningSamples", totalTickets);
        stats.put("ragKnowledgeChunks", totalTickets);

        return stats;
    }

    private String escapeCsv(String input) {
        if (input == null) return "\"\"";
        String clean = input.replace("\"", "\"\"");
        return "\"" + clean + "\"";
    }
}
