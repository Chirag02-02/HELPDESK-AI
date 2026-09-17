package com.helpdesk.service.rag;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class EmbeddingServiceTest {

    @Autowired
    private EmbeddingService embeddingService;

    @Test
    @DisplayName("Verify EmbeddingService generates float vector with correct dimension")
    void testEmbedText() {
        String input = "When will my package arrive?";
        float[] vector = embeddingService.embedText(input);

        assertNotNull(vector, "Generated embedding vector must not be null");
        assertEquals(384, vector.length, "Embedding vector length must match configured dimension (384)");

        // Verify non-zero vector values
        boolean hasNonZero = false;
        for (float val : vector) {
            if (val != 0.0f) {
                hasNonZero = true;
                break;
            }
        }
        assertTrue(hasNonZero, "Embedding vector should contain non-zero float values");
    }

    @Test
    @DisplayName("Verify batch embedding generation")
    void testEmbedBatch() {
        var texts = java.util.List.of("How do I reset password?", "Where is my order?");
        var batchVectors = embeddingService.embedBatch(texts);

        assertEquals(2, batchVectors.size());
        assertEquals(384, batchVectors.get(0).length);
        assertEquals(384, batchVectors.get(1).length);
    }
}
