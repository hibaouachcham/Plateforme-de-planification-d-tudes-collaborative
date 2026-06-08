package com.syncstudy.dto.request;

import jakarta.validation.constraints.NotBlank;
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
public class SendMessageRequest {
    @NotBlank
    private String text;

    // Explicit getters/setters for IDEs where Lombok isn't processed reliably.
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}
