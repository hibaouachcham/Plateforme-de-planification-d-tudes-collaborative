package com.syncstudy.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "session_notes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionNote {
    @Id
    private String id;

    /** Clé de room : groupId pour les sessions de groupe */
    private String chatRoomKey;

    private String authorId;
    private String authorName;
    private String text;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
