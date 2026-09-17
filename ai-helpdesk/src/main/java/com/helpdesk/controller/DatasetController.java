package com.helpdesk.controller;

import com.helpdesk.service.DatasetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/dataset")
@RequiredArgsConstructor
@Tag(name = "AI Dataset", description = "AI Dataset generator and exporter endpoints for fine-tuning and RAG")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','AGENT')")
public class DatasetController {

    private final DatasetService datasetService;

    @GetMapping("/stats")
    @Operation(summary = "Get AI dataset metrics and training statistics")
    public ResponseEntity<Map<String, Object>> getDatasetStats() {
        return ResponseEntity.ok(datasetService.getDatasetSummary());
    }

    @GetMapping("/preview")
    @Operation(summary = "Preview generated AI dataset content snippet")
    public ResponseEntity<String> previewDataset(@RequestParam(defaultValue = "jsonl") String format) {
        String data;
        switch (format.toLowerCase()) {
            case "rag":
                data = datasetService.generateRagKnowledgeJson();
                break;
            case "csv":
                data = datasetService.generateClassificationCsv();
                break;
            case "jsonl":
            default:
                data = datasetService.generateFineTuningJsonl();
                break;
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping("/download")
    @Operation(summary = "Export and download generated AI dataset file")
    public ResponseEntity<byte[]> downloadDataset(@RequestParam(defaultValue = "jsonl") String format) {
        String content;
        String filename;
        String contentType;

        switch (format.toLowerCase()) {
            case "rag":
                content = datasetService.generateRagKnowledgeJson();
                filename = "ai_helpdesk_rag_knowledge_base.json";
                contentType = MediaType.APPLICATION_JSON_VALUE;
                break;
            case "csv":
                content = datasetService.generateClassificationCsv();
                filename = "ai_helpdesk_classification.csv";
                contentType = "text/csv";
                break;
            case "jsonl":
            default:
                content = datasetService.generateFineTuningJsonl();
                filename = "ai_helpdesk_finetuning.jsonl";
                contentType = "application/x-jsonlines";
                break;
        }

        byte[] bytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .contentLength(bytes.length)
                .body(bytes);
    }
}
