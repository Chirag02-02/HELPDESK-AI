package com.helpdesk.service;

import com.helpdesk.entity.KnowledgeArticle;
import com.helpdesk.entity.Ticket;
import com.helpdesk.exception.AppException;
import com.helpdesk.repository.KnowledgeArticleRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class KnowledgeService {

    private final KnowledgeArticleRepository knowledgeArticleRepository;

    private static final Set<String> STOP_WORDS = Set.of(
            "how", "can", "i", "to", "my", "the", "a", "an", "is", "it", "in", "on", "for", "with",
            "you", "do", "does", "what", "where", "when", "why", "help", "please", "need"
    );

    @PostConstruct
    public void initDefaultKnowledgeBase() {
        try {
            if (knowledgeArticleRepository.count() == 0) {
                log.info("Initializing default HelpDesk Knowledge Base dataset into MySQL database...");

                List<KnowledgeArticle> defaultArticles = List.of(
                        KnowledgeArticle.builder()
                                .title("Password Reset Guide")
                                .question("How can I reset my password?")
                                .answer("To reset your password:\n1. Go to the login screen and click 'Forgot Password'.\n2. Enter your registered email address.\n3. Follow the secure password reset link sent to your inbox.\n4. Create a new strong password (at least 8 characters).")
                                .keywords("password, reset, forgot, login, credentials, change password, account recovery")
                                .category(Ticket.Category.ACCOUNT)
                                .active(true)
                                .build(),

                        KnowledgeArticle.builder()
                                .title("Account Login & Sign-In Assistance")
                                .question("Why can't I log into my account?")
                                .answer("If you are experiencing sign-in issues:\n1. Verify your registered email address and password spelling.\n2. Ensure Caps Lock is off.\n3. Clear your browser cache and cookies.\n4. If your account is locked, click 'Forgot Password' to unlock it.")
                                .keywords("login, sign in, signin, cannot log in, authentication, credentials, access, error")
                                .category(Ticket.Category.ACCOUNT)
                                .active(true)
                                .build(),

                        KnowledgeArticle.builder()
                                .title("Refund & Billing Policy")
                                .question("How do I request a refund for a billing charge?")
                                .answer("Our Refund Policy:\n1. Refunds can be requested within 14 days of purchase.\n2. Go to My Tickets and submit a ticket under the 'REFUND' category with your Order ID.\n3. Standard refunds take 3-5 business days to process back to your original payment method.\n4. Note: Financial validation requires human review by our Billing Team.")
                                .keywords("refund, billing, charge, payment, money back, invoice, transaction, credit card")
                                .category(Ticket.Category.REFUND)
                                .active(true)
                                .build(),

                        KnowledgeArticle.builder()
                                .title("Order Tracking & Shipping Status")
                                .question("How do I track my order or package shipment?")
                                .answer("To track your order:\n1. Check your email for the Order Shipping Confirmation email.\n2. Click the tracking link provided in the email.\n3. Standard shipping takes 3 to 5 business days.\n4. If your package is delayed past 7 days, please let us know so we can investigate.")
                                .keywords("order, track, tracking, ship, shipping, delivery, package, status, delay")
                                .category(Ticket.Category.ORDER)
                                .active(true)
                                .build(),

                        KnowledgeArticle.builder()
                                .title("Technical Errors & App Crash Troubleshooting")
                                .question("What should I do if the application crashes or shows a technical error?")
                                .answer("Troubleshooting Technical Issues:\n1. Refresh your web browser or restart the application.\n2. Ensure your browser is updated to the latest version.\n3. Disable third-party ad-blockers or browser extensions.\n4. If the problem persists, take a screenshot of the error code and attach it to a TECHNICAL ticket.")
                                .keywords("technical, error, bug, crash, broken, glitch, app, site down, failed, 500, 404")
                                .category(Ticket.Category.TECHNICAL)
                                .active(true)
                                .build(),

                        KnowledgeArticle.builder()
                                .title("New User Account Registration")
                                .question("How do I create a new HelpDesk account?")
                                .answer("To register a new account:\n1. Click the 'Register' or 'Sign Up' link on the login page.\n2. Enter your Full Name, Email Address, and Password.\n3. Click 'Create Account' to log into your new customer dashboard.")
                                .keywords("register, registration, create account, signup, sign up, new user, join")
                                .category(Ticket.Category.ACCOUNT)
                                .active(true)
                                .build()
                );

                knowledgeArticleRepository.saveAll(defaultArticles);
                log.info("Successfully seeded {} knowledge articles into MySQL database.", defaultArticles.size());
            }
        } catch (Exception e) {
            log.error("Failed to seed initial knowledge base: {}", e.getMessage(), e);
        }
    }

    /**
     * RAG Search Retrieval: Searches Knowledge Base articles for relevant matching context.
     * Evaluates keyword relevance scoring against title, question, keywords, and answer.
     * Returns matching article if score >= threshold (e.g. at least 1 significant keyword match).
     */
    public Optional<KnowledgeArticle> findRelevantKnowledge(String query, Ticket.Category category) {
        if (query == null || query.isBlank()) return Optional.empty();

        List<KnowledgeArticle> candidates;
        if (category != null && category != Ticket.Category.OTHER) {
            candidates = knowledgeArticleRepository.findByCategoryAndActiveTrue(category);
            if (candidates.isEmpty()) {
                candidates = knowledgeArticleRepository.findByActiveTrueOrderByCreatedAtDesc();
            }
        } else {
            candidates = knowledgeArticleRepository.findByActiveTrueOrderByCreatedAtDesc();
        }

        // Clean & extract significant keywords from customer query
        List<String> queryTokens = Arrays.stream(query.toLowerCase().split("\\W+"))
                .filter(t -> t.length() > 2 && !STOP_WORDS.contains(t))
                .collect(Collectors.toList());

        if (queryTokens.isEmpty()) {
            return candidates.isEmpty() ? Optional.empty() : Optional.of(candidates.get(0));
        }

        KnowledgeArticle bestMatch = null;
        int maxScore = 0;

        for (KnowledgeArticle article : candidates) {
            int score = 0;
            String titleLower = article.getTitle() != null ? article.getTitle().toLowerCase() : "";
            String questionLower = article.getQuestion() != null ? article.getQuestion().toLowerCase() : "";
            String keywordsLower = article.getKeywords() != null ? article.getKeywords().toLowerCase() : "";
            String answerLower = article.getAnswer() != null ? article.getAnswer().toLowerCase() : "";

            for (String token : queryTokens) {
                if (titleLower.contains(token)) score += 5;
                if (questionLower.contains(token)) score += 4;
                if (keywordsLower.contains(token)) score += 3;
                if (answerLower.contains(token)) score += 1;
            }

            if (score > maxScore) {
                maxScore = score;
                bestMatch = article;
            }
        }

        // Relevance Threshold: Require a score of at least 3 to consider the article relevant context
        if (maxScore >= 3 && bestMatch != null) {
            log.info("RAG Knowledge Search Found Match: '{}' (Score: {}) for query: '{}'", bestMatch.getTitle(), maxScore, query);
            return Optional.of(bestMatch);
        }

        log.info("RAG Knowledge Search: No sufficiently relevant context found (Max Score: {}) for query: '{}'", maxScore, query);
        return Optional.empty();
    }

    public List<KnowledgeArticle> getAllArticles() {
        return knowledgeArticleRepository.findAll();
    }

    public KnowledgeArticle getArticleById(Long id) {
        return knowledgeArticleRepository.findById(id)
                .orElseThrow(() -> new AppException("Knowledge article not found", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public KnowledgeArticle createArticle(KnowledgeArticle article) {
        if (article.getCategory() == null) article.setCategory(Ticket.Category.OTHER);
        article.setActive(true);
        return knowledgeArticleRepository.save(article);
    }

    @Transactional
    public KnowledgeArticle updateArticle(Long id, KnowledgeArticle details) {
        KnowledgeArticle existing = getArticleById(id);
        existing.setTitle(details.getTitle());
        existing.setQuestion(details.getQuestion());
        existing.setAnswer(details.getAnswer());
        existing.setKeywords(details.getKeywords());
        if (details.getCategory() != null) existing.setCategory(details.getCategory());
        existing.setActive(details.isActive());
        return knowledgeArticleRepository.save(existing);
    }

    @Transactional
    public void deleteArticle(Long id) {
        KnowledgeArticle existing = getArticleById(id);
        knowledgeArticleRepository.delete(existing);
    }
}
