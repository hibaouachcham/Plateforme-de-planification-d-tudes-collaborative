package com.syncstudy.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    @Id
    private String id;

    @NotBlank
    private String userId;

    private String type; // reminder | invitation | achievement
    private String title;
    private String message;
    private String details; // informations secondaires affichées dans la zone grise
    private String icon;
    private String colorClass;

    @Builder.Default
    private boolean read = false;

    private String referenceId;
    private LocalDateTime createdAt;
}
