package com.syncstudy.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateScheduleRequest {
    @Builder.Default
    private List<Integer> restDayIndices = new ArrayList<>();

    /** Si true, fusionner automatiquement les créneaux qui se chevauchent */
    @Builder.Default
    private Boolean mergeDuplicates = false;
}
