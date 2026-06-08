package com.syncstudy.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "study_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyGroup {
    @Id
    private String id;

    @NotBlank
    private String name;

    private String description;
    private String colorClass;

    @NotBlank
    private String ownerId;

    @Indexed(unique = true)
    private String inviteCode;

    @Builder.Default
    private List<String> memberIds = new ArrayList<>();

    private LocalDateTime createdAt;

    /** Tâches / objectifs du groupe */
    @Builder.Default
    private List<java.util.Map<String, Object>> tasks = new ArrayList<>();

    // Explicit getters/setters for IDEs where Lombok isn't processed reliably.
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getColorClass() { return colorClass; }
    public void setColorClass(String colorClass) { this.colorClass = colorClass; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getInviteCode() { return inviteCode; }
    public void setInviteCode(String inviteCode) { this.inviteCode = inviteCode; }

    public List<String> getMemberIds() { return memberIds; }
    public void setMemberIds(List<String> memberIds) { this.memberIds = memberIds; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<java.util.Map<String, Object>> getTasks() { return tasks; }
    public void setTasks(List<java.util.Map<String, Object>> tasks) { this.tasks = tasks; }
}
