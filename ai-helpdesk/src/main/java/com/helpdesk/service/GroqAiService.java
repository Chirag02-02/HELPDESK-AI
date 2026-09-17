package com.helpdesk.service;

import com.helpdesk.entity.Ticket;
import com.helpdesk.repository.UserRepository;
import com.helpdesk.repository.TicketRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class GroqAiService {

    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.model}")
    private String model;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.groq.com/openai/v1")
            .build();

    private static final String SYSTEM_PROMPT = """
            You are HelpDesk AI, a professional customer support assistant.
            Answer questions clearly and detect sentiment, priority, and escalation needs.
            
            Always respond in this JSON format:
            {
              "reply": "Your response here",
              "sentiment": "NEUTRAL",
              "priority": "MEDIUM",
              "escalate": false,
              "department": "GENERAL"
            }
            """;

    private static final String RAG_SYSTEM_PROMPT_TEMPLATE = """
            You are HelpDesk AI, a professional customer support assistant.
            
            STRICT RAG (GROUNDED KNOWLEDGE) INSTRUCTION:
            Answer the user's question using ONLY the facts present in the Knowledge Base Context below.
            Do NOT invent, guess, or hallucinate information outside of this context.
            If the Knowledge Base Context is empty, irrelevant, or insufficient to confidently resolve the issue, set "escalate": true and politely state that you are routing the ticket to a human support agent.
            
            --- VERIFIED KNOWLEDGE BASE CONTEXT ---
            %s
            ---------------------------------------
            
            Always respond in this exact JSON format:
            {
              "reply": "Your helpful grounded response here",
              "sentiment": "NEUTRAL",
              "priority": "MEDIUM",
              "escalate": false,
              "department": "TECHNICAL"
            }
            
            Sentiment options: HAPPY, NEUTRAL, FRUSTRATED, ANGRY
            Priority options: LOW, MEDIUM, HIGH, CRITICAL
            Department options: BILLING, TECHNICAL, DELIVERY, ACCOUNT, GENERAL
            """;

    public AiResponse chat(String userMessage, List<ConversationMessage> history) {
        return chat(userMessage, history, null, null, null);
    }

    public AiResponse chat(String userMessage, List<ConversationMessage> history, String userEmail, Long ticketId) {
        return chat(userMessage, history, userEmail, ticketId, null);
    }

    public AiResponse chat(String userMessage, List<ConversationMessage> history, String userEmail, Long ticketId, String knowledgeContext) {
        if (apiKey == null || apiKey.isBlank() || apiKey.equals("your_groq_api_key_here") || apiKey.contains("placeholder")) {
            return generateMockResponse(userMessage, userEmail, ticketId, knowledgeContext);
        }
        try {
            String systemPrompt = (knowledgeContext != null && !knowledgeContext.isBlank())
                    ? String.format(RAG_SYSTEM_PROMPT_TEMPLATE, knowledgeContext)
                    : SYSTEM_PROMPT;

            var messages = new java.util.ArrayList<ConversationMessage>();
            messages.add(new ConversationMessage("system", systemPrompt));
            if (history != null) messages.addAll(history);
            messages.add(new ConversationMessage("user", userMessage));

            var request = new GroqRequest(model, messages, 1024, 0.5);

            var response = webClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(GroqResponse.class)
                    .block();

            if (response != null && !response.choices().isEmpty()) {
                String content = response.choices().get(0).message().content();
                return parseAiResponse(content);
            }
        } catch (Exception e) {
            log.error("Groq API execution failed: {}. Falling back to local RAG knowledge response.", e.getMessage());
        }

        return generateMockResponse(userMessage, userEmail, ticketId, knowledgeContext);
    }

    private AiResponse generateMockResponse(String userMessage, String userEmail, Long ticketId, String knowledgeContext) {
        String msg = userMessage.toLowerCase();
        String reply;
        Ticket.Sentiment sentiment = Ticket.Sentiment.NEUTRAL;
        Ticket.Priority priority = Ticket.Priority.MEDIUM;
        boolean escalate = false;
        String department = "GENERAL";

        String userName = "there";
        if (userEmail != null && userRepository != null) {
            var userOpt = userRepository.findByEmail(userEmail);
            if (userOpt.isPresent()) {
                userName = userOpt.get().getName();
            }
        }

        // If Grounded Knowledge Context was retrieved from Knowledge Base, use it!
        if (knowledgeContext != null && !knowledgeContext.isBlank()) {
            reply = "Hi " + userName + ",\n\n" + knowledgeContext;
            sentiment = Ticket.Sentiment.NEUTRAL;
            priority = Ticket.Priority.LOW;
            escalate = false;
            department = "GENERAL";
        } else {
            reply = "Hi " + userName + ", I'm your HelpDesk AI assistant. How can I help resolve your issue today?";
            sentiment = Ticket.Sentiment.NEUTRAL;
            priority = Ticket.Priority.MEDIUM;
            escalate = false;
            department = "GENERAL";
        }

        if (msg.contains("hi") || msg.contains("hello") || msg.contains("hey")) {
            reply = "Hello " + userName + "! How can I assist you with your support ticket today?";
        } else if (msg.contains("ticket status") || msg.contains("list my tickets") || msg.contains("my tickets")) {
            if (userEmail != null && ticketRepository != null && userRepository != null) {
                var userOpt = userRepository.findByEmail(userEmail);
                if (userOpt.isPresent()) {
                    var tickets = ticketRepository.findByUserIdOrderByCreatedAtDesc(userOpt.get().getId());
                    if (tickets.isEmpty()) {
                        reply = "Hi " + userName + ", you don't have any support tickets registered yet.";
                    } else {
                        StringBuilder sb = new StringBuilder("Hi " + userName + ", here are your recent tickets:\n");
                        for (Ticket t : tickets) {
                            sb.append(String.format("• Ticket #%d: [%s] %s (Status: %s)\n",
                                    t.getId(), t.getCategory(), t.getTitle(), t.getStatus()));
                        }
                        reply = sb.toString();
                    }
                } else {
                    reply = "I couldn't locate your user details to retrieve your tickets.";
                }
            } else {
                reply = "I can help you check your ticket status, but I don't have access to your account details in this context.";
            }
        } else if (msg.contains("password")) {
            reply = "Hi " + userName + ", I understand you're having issues with your password. You can perform a secure password reset using the link sent to your registered email (" + (userEmail != null ? userEmail : "associated with your account") + "), or by clicking 'Forgot Password' on the login screen.";
            sentiment = Ticket.Sentiment.NEUTRAL;
            priority = Ticket.Priority.LOW;
            department = "ACCOUNT";
            escalate = false;
        } else if (msg.contains("login") || msg.contains("sign in") || msg.contains("sign-in")) {
            reply = "Hi " + userName + ", if you're experiencing login issues, please verify that you are using your registered email and correct password. If your credentials are correct and you still cannot sign in, please clear your browser cache or reset your password.";
            sentiment = Ticket.Sentiment.NEUTRAL;
            priority = Ticket.Priority.LOW;
            department = "ACCOUNT";
            escalate = false;
        } else if (msg.contains("register") || msg.contains("registration") || msg.contains("create account") || msg.contains("sign up")) {
            reply = "Hi " + userName + ", you can register a new account by navigating to the Registration page and filling in your details (name, email, and password).";
            sentiment = Ticket.Sentiment.NEUTRAL;
            priority = Ticket.Priority.LOW;
            department = "ACCOUNT";
            escalate = false;
        } else if (msg.contains("refund")) {
            reply = "Hi " + userName + ", I have registered your refund request. Because financial issues require manual human validation, I am escalating this to our Billing & Accounts team. A specialist will review it shortly.";
            sentiment = Ticket.Sentiment.FRUSTRATED;
            priority = Ticket.Priority.HIGH;
            escalate = true;
            department = "BILLING";
        } else if (msg.contains("billing") || msg.contains("charge") || msg.contains("payment")) {
            reply = "Hi " + userName + ", billing issues require human review. I am escalating this ticket to our Billing team. A specialist will review it shortly.";
            sentiment = Ticket.Sentiment.FRUSTRATED;
            priority = Ticket.Priority.HIGH;
            escalate = true;
            department = "BILLING";
        } else if (msg.contains("order") || msg.contains("ship") || msg.contains("delivery") || msg.contains("track")) {
            reply = "Hi " + userName + ", standard orders take 3-5 business days to ship. Please verify your order confirmation email for tracking links, or let me know if your package is delayed.";
            sentiment = Ticket.Sentiment.NEUTRAL;
            priority = Ticket.Priority.LOW;
            department = "DELIVERY";
            escalate = false;
        } else if (msg.contains("hack") || msg.contains("fraud") || msg.contains("server down") || msg.contains("broken")) {
            reply = "WARNING: Critical issue detected. I am escalating this support session (" + (ticketId != null ? "Ticket #" + ticketId : "New Ticket") + ") immediately to our Technical Operations emergency queue for urgent agent action.";
            sentiment = Ticket.Sentiment.ANGRY;
            priority = Ticket.Priority.CRITICAL;
            escalate = true;
            department = "TECHNICAL";
        } else if (msg.contains("thank you") || msg.contains("thanks") || msg.contains("resolved") || msg.contains("close")) {
            reply = "You're very welcome, " + userName + "! I'm glad I could help. Feel free to let me know if you need anything else.";
            sentiment = Ticket.Sentiment.HAPPY;
            escalate = false;
        } else {
            reply = "Hi " + userName + ", thank you for your query. I am analyzing your request and here to help resolve your issue promptly. Please let me know if you would like more details or if you'd prefer to be connected with a human agent.";
            sentiment = Ticket.Sentiment.NEUTRAL;
            priority = Ticket.Priority.MEDIUM;
            department = "GENERAL";
            escalate = false;
        }

        return AiResponse.builder()
                .reply(reply)
                .sentiment(sentiment)
                .priority(priority)
                .escalate(escalate)
                .department(department)
                .build();
    }

    private AiResponse parseAiResponse(String content) {
        try {
            String cleaned = content.trim();
            // Remove markdown code block wrappers if generated by the LLM
            if (cleaned.startsWith("```")) {
                int firstLineEnd = cleaned.indexOf("\n");
                if (firstLineEnd != -1) {
                    cleaned = cleaned.substring(firstLineEnd + 1);
                }
                if (cleaned.endsWith("```")) {
                    cleaned = cleaned.substring(0, cleaned.length() - 3);
                }
                cleaned = cleaned.trim();
            }

            JsonNode root = objectMapper.readTree(cleaned);

            String reply = root.has("reply") ? root.get("reply").asText() : cleaned;
            String sentimentStr = root.has("sentiment") ? root.get("sentiment").asText() : "NEUTRAL";
            String priorityStr = root.has("priority") ? root.get("priority").asText() : "MEDIUM";
            boolean escalate = root.has("escalate") && root.get("escalate").asBoolean();
            String department = root.has("department") ? root.get("department").asText() : "GENERAL";

            return AiResponse.builder()
                    .reply(reply)
                    .sentiment(parseSentiment(sentimentStr))
                    .priority(parsePriority(priorityStr))
                    .escalate(escalate)
                    .department(department)
                    .build();
        } catch (Exception e) {
            log.warn("Could not parse AI JSON response, returning raw content: {}", e.getMessage());
            return AiResponse.builder()
                    .reply(content)
                    .sentiment(Ticket.Sentiment.NEUTRAL)
                    .priority(Ticket.Priority.MEDIUM)
                    .escalate(false)
                    .department("GENERAL")
                    .build();
        }
    }

    private Ticket.Sentiment parseSentiment(String s) {
        try { return Ticket.Sentiment.valueOf(s.toUpperCase().trim()); } catch (Exception e) { return Ticket.Sentiment.NEUTRAL; }
    }

    private Ticket.Priority parsePriority(String p) {
        try { return Ticket.Priority.valueOf(p.toUpperCase().trim()); } catch (Exception e) { return Ticket.Priority.MEDIUM; }
    }

    // ── Inner records (request/response models) ──────────────

    public record ConversationMessage(String role, String content) {}

    private record GroqRequest(
            String model,
            List<ConversationMessage> messages,
            int max_tokens,
            double temperature
    ) {}

    private record GroqResponse(List<Choice> choices) {}
    private record Choice(Message message) {}
    private record Message(String content) {}

    @lombok.Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiResponse {
        private String reply;
        private Ticket.Sentiment sentiment;
        private Ticket.Priority priority;
        private boolean escalate;
        private String department;
    }
}
