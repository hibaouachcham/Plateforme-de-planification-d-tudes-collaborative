package com.syncstudy.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAvailabilityRequest {
    private List<AvailabilitySlot> slots;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AvailabilitySlot {
        @Min(0)
        @Max(6)
        private int dayOfWeek;

        @NotBlank
        private String startTime;

        @NotBlank
        private String endTime;

        @Builder.Default
        private boolean recurring = true;
    }
}
