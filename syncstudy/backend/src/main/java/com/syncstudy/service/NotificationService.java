package com.syncstudy.service;

import com.syncstudy.model.Notification;
import com.syncstudy.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;

    private static final Map<String, String[]> TYPE_ICON_COLOR = new HashMap<>();
    static {
        TYPE_ICON_COLOR.put("reminder",         new String[]{"alarm",            "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"});
        TYPE_ICON_COLOR.put("invitation",       new String[]{"person_add",       "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"});
        TYPE_ICON_COLOR.put("achievement",      new String[]{"military_tech",    "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"});
        TYPE_ICON_COLOR.put("group_session",    new String[]{"groups",           "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"});
        TYPE_ICON_COLOR.put("user_registered",  new String[]{"how_to_reg",       "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"});
        TYPE_ICON_COLOR.put("user_deleted",     new String[]{"person_remove",    "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"});
        TYPE_ICON_COLOR.put("user_suspended",   new String[]{"block",            "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"});
        TYPE_ICON_COLOR.put("user_reactivated", new String[]{"check_circle",     "bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400"});
        TYPE_ICON_COLOR.put("user_created",     new String[]{"manage_accounts",  "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400"});
        TYPE_ICON_COLOR.put("password_reset",   new String[]{"lock_reset",       "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"});
    }

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<Notification> getNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void markRead(String userId, String notificationId) {
        notificationRepository.findById(notificationId)
                .filter(n -> userId.equals(n.getUserId()))
                .ifPresent(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                });
    }

    public void markAllRead(String userId) {
        List<Notification> all = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        all.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(all);
    }

    public void push(String userId, String type, String title, String message, String referenceId) {
        push(userId, type, title, message, null, referenceId);
    }

    public void push(String userId, String type, String title, String message, String details, String referenceId) {
        String[] iconColor = TYPE_ICON_COLOR.getOrDefault(type,
                new String[]{"notifications", "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"});
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .details(details)
                .referenceId(referenceId)
                .icon(iconColor[0])
                .colorClass(iconColor[1])
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);
    }
}
