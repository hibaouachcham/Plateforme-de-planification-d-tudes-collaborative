package com.syncstudy.dto.request;

import jakarta.validation.constraints.Email;
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
public class InviteMemberRequest {
    @NotBlank
    @Email
    private String email;

    // Explicit getters/setters for IDEs where Lombok isn't processed reliably.
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
