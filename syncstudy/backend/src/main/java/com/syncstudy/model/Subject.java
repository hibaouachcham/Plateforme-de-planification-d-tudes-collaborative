package com.syncstudy.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "subjects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subject {
    @Id
    private String id;

    @NotBlank
    private String userId;

    @NotBlank
    private String name;

    private String color;
    private String priority; // Basse | Moyenne | Haute
    private double weeklyGoalHours;
    private String studyType; // course | project
    private String workMode; // private | group

    @Builder.Default
    private int minSessionMin = 45;

    @Builder.Default
    private int maxSessionMin = 120;
}
