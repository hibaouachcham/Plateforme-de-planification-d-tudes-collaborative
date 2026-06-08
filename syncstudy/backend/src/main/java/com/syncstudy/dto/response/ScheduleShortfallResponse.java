package com.syncstudy.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleShortfallResponse {
    private String subjectId;
    private String subjectName;
    private double hoursMissing;
    private String studyType;          // "course" | "project"
    private double totalAvailableHours; // heures dispo totales cette semaine
    private double hoursNeeded;         // objectif hebdomadaire
    private boolean needsMoreAvailability; // true si les dispos sont insuffisantes
}
