package com.syncstudy.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "availabilities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Availability {
    @Id
    private String id;

    @NotBlank
    private String userId;

    @Min(0)
    @Max(6)
    private int dayOfWeek;

    @NotBlank
    private String startTime; // "HH:mm"

    @NotBlank
    private String endTime;   // "HH:mm"

    @Builder.Default
    private boolean recurring = true;
}
