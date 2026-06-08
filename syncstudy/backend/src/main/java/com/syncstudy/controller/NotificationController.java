package com.syncstudy.controller;

import com.syncstudy.model.Notification;
import com.syncstudy.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    private Map<String, Object> toFrontend(Notification n) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", n.getId());
        m.put("type", n.getType());
        m.put("title", n.getTitle());
        m.put("desc", n.getMessage());
        m.put("details", n.getDetails() != null ? n.getDetails() : n.getMessage());
        m.put("time", n.getCreatedAt() != null ? n.getCreatedAt().toString() : "now");
        m.put("icon", n.getIcon() != null ? n.getIcon() : "notifications");
        m.put("colorClass", n.getColorClass() != null ? n.getColorClass() : "bg-indigo-100 text-indigo-600");
        m.put("isRead", n.isRead());
        m.put("referenceId", n.getReferenceId());
        return m;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication authentication) {
        return ResponseEntity.ok(notificationService.getNotifications(authentication.getName())
                .stream().map(this::toFrontend).toList());
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(Authentication authentication, @PathVariable String id) {
        notificationService.markRead(authentication.getName(), id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> readAll(Authentication authentication) {
        notificationService.markAllRead(authentication.getName());
        return ResponseEntity.ok().build();
    }
}
