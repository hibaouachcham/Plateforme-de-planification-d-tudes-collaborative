package com.syncstudy.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "password_reset_tokens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetToken {

    @Id
    private String id;

    @Indexed(unique = true)
    private String token;

    @Indexed
    private String userId;

    private LocalDateTime expiresAt;

    @Builder.Default
    private boolean used = false;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public String getId()                        { return id; }
    public void   setId(String id)               { this.id = id; }
    public String getToken()                     { return token; }
    public void   setToken(String token)         { this.token = token; }
    public String getUserId()                    { return userId; }
    public void   setUserId(String userId)       { this.userId = userId; }
    public LocalDateTime getExpiresAt()          { return expiresAt; }
    public void   setExpiresAt(LocalDateTime e)  { this.expiresAt = e; }
    public boolean isUsed()                      { return used; }
    public void   setUsed(boolean used)          { this.used = used; }
}
