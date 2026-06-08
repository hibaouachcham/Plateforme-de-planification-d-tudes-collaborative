package com.syncstudy.config;

import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.syncstudy.model.GroupMessage;
import com.syncstudy.model.SessionChatMessage;
import com.syncstudy.model.SessionNote;
import com.syncstudy.repository.SessionChatMessageRepository;
import com.syncstudy.repository.SessionNoteRepository;
import com.syncstudy.service.GroupService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.core.env.Environment;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@org.springframework.context.annotation.Configuration
public class SocketIOConfig {
    private static final String ATTR_USER_ID = "userId";
    private final Environment env;
    private final GroupService groupService;
    private final SessionChatMessageRepository chatMessageRepository;
    private final SessionNoteRepository sessionNoteRepository;
    private SocketIOServer server;

    public SocketIOConfig(Environment env, GroupService groupService,
                          SessionChatMessageRepository chatMessageRepository,
                          SessionNoteRepository sessionNoteRepository) {
        this.env = env;
        this.groupService = groupService;
        this.chatMessageRepository = chatMessageRepository;
        this.sessionNoteRepository = sessionNoteRepository;
    }

    @PostConstruct
    public void start() {
        Configuration cfg = new Configuration();
        cfg.setHostname(env.getProperty("socketio.host", "0.0.0.0"));
        cfg.setPort(Integer.parseInt(env.getProperty("socketio.port", "9092")));
        // Augmenter la taille max des payloads pour supporter les pièces jointes (base64)
        cfg.setMaxHttpContentLength(20 * 1024 * 1024); // 20 MB
        cfg.setMaxFramePayloadLength(20 * 1024 * 1024); // 20 MB
        server = new SocketIOServer(cfg);
        registerListeners(server);
        server.start();
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            server.stop();
        }
    }

    private void registerListeners(SocketIOServer io) {
        io.addEventListener("join-group", JoinGroupPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.groupId) || isBlank(data.userId)) return;
            groupService.requireMembership(data.groupId, data.userId);
            String room = room(data.groupId);
            client.set(ATTR_USER_ID, data.userId);
            client.joinRoom(room);
            List<Map<String, Object>> history = groupService.getMessages(data.groupId, data.userId)
                    .stream()
                    .map(this::toFrontend)
                    .toList();
            client.sendEvent("message-history", Map.of("groupId", data.groupId, "messages", history));
            emitPresence(io, data.groupId);
        });

        io.addEventListener("leave-group", LeaveGroupPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.groupId)) return;
            client.leaveRoom(room(data.groupId));
            emitPresence(io, data.groupId);
        });

        io.addEventListener("send-message", SendMessagePayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.groupId) || data.message == null) return;
            if (!client.getAllRooms().contains(room(data.groupId))) return;
            String boundUserId = trimToNull(client.get(ATTR_USER_ID));
            String senderId = trimToNull(data.message.senderId);
            String senderName = trimToNull(data.message.senderName);
            String text = trimToNull(data.message.text);
            if (boundUserId == null) return;
            if (senderId == null || !boundUserId.equals(senderId)) return;
            if (senderId == null || text == null) return;
            GroupMessage saved = groupService.sendMessage(data.groupId, senderId, senderName, text);
            io.getRoomOperations(room(data.groupId))
                    .sendEvent("receive-message", Map.of("groupId", data.groupId, "message", toFrontend(saved)));
        });

        // ── Propagation session partagée aux membres du groupe ──
        io.addEventListener("shared-session-created", Object.class, (client, data, ackSender) -> {
            if (data == null) return;
            // Récupérer le groupId depuis le payload
            String groupId = null;
            if (data instanceof java.util.Map<?,?> map) {
                Object gid = map.get("groupId");
                if (gid instanceof String s && !s.isBlank()) groupId = s;
            }
            if (groupId == null) return;
            // Broadcaster à tous les membres du groupe (sauf l'émetteur)
            io.getRoomOperations(room(groupId))
                    .sendEvent("new-shared-session", data);
        });

        io.addEventListener("shared-session-modified", Object.class, (client, data, ackSender) -> {
            if (data == null) return;
            String groupId = null;
            if (data instanceof java.util.Map<?,?> map) {
                Object gid = map.get("groupId");
                if (gid instanceof String s && !s.isBlank()) groupId = s;
            }
            if (groupId == null) return;
            io.getRoomOperations(room(groupId))
                    .sendEvent("shared-session-modified", data);
        });

        // ── Session chat (éphémère, pas de persistance) ─────────
        // Sessions de groupe → tous partagent la room "gsession:{groupId}"
        // Sessions personnelles → room "session:{sessionId}"
        io.addEventListener("join-session", JoinSessionPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.sessionId) || isBlank(data.userId) || isBlank(data.userName)) return;
            client.set("sessionUserId", data.userId);
            client.set("sessionUserName", data.userName);
            String roomKey = (!isBlank(data.groupId))
                ? ("gsession:" + data.groupId)
                : ("session:" + data.sessionId);
            String chatId = (!isBlank(data.groupId)) ? data.groupId : data.sessionId;
            client.set("sessionRoomKey", roomKey);
            client.set("sessionChatId", chatId);
            client.joinRoom(roomKey);
            // Envoyer l'historique des messages au client qui vient de rejoindre
            List<Map<String, Object>> history = chatMessageRepository
                .findTop100ByChatRoomKeyOrderBySentAtAsc(chatId)
                .stream()
                .map(m -> {
                    Map<String, Object> msg = new HashMap<>();
                    msg.put("id", m.getId());
                    msg.put("senderId", m.getSenderId());
                    msg.put("senderName", m.getSenderName() != null ? m.getSenderName() : "Membre");
                    msg.put("text", m.getText());
                    msg.put("time", m.getSentAt().toString().substring(11, 16));
                    return msg;
                })
                .toList();
            client.sendEvent("session-chat-history", Map.of("chatId", chatId, "messages", history));
            // Envoyer l'historique des notes partagées
            List<Map<String, Object>> notesHistory = sessionNoteRepository
                .findByChatRoomKeyOrderByCreatedAtAsc(chatId)
                .stream()
                .map(n -> {
                    Map<String, Object> nm = new HashMap<>();
                    nm.put("id", n.getId());
                    nm.put("authorId", n.getAuthorId());
                    nm.put("authorName", n.getAuthorName() != null ? n.getAuthorName() : "Membre");
                    nm.put("text", n.getText());
                    nm.put("createdAt", n.getCreatedAt().toString().substring(11, 16));
                    return nm;
                })
                .toList();
            client.sendEvent("session-notes-history", Map.of("chatId", chatId, "notes", notesHistory));
        });

        io.addEventListener("leave-session", LeaveSessionPayload.class, (client, data, ackSender) -> {
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            if (roomKey != null) {
                client.leaveRoom(roomKey);
            } else if (data != null && !isBlank(data.sessionId)) {
                client.leaveRoom(sessionRoom(data.sessionId));
            }
        });

        io.addEventListener("send-session-message", SessionMessagePayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.text)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            if (roomKey == null) return;
            String userId   = trimToNull(client.get("sessionUserId"));
            String userName = trimToNull(client.get("sessionUserName"));
            String chatId   = trimToNull(client.get("sessionChatId"));
            if (userId == null) return;
            String effectiveName = userName != null ? userName : "Membre";
            String time = java.time.LocalDateTime.now().toString().substring(11, 16);
            // Persister en base
            SessionChatMessage saved = chatMessageRepository.save(
                SessionChatMessage.builder()
                    .chatRoomKey(chatId != null ? chatId : roomKey)
                    .senderId(userId)
                    .senderName(effectiveName)
                    .text(data.text.trim())
                    .build()
            );
            Map<String, Object> msg = new HashMap<>();
            msg.put("id", saved.getId());
            msg.put("senderId", userId);
            msg.put("senderName", effectiveName);
            msg.put("text", saved.getText());
            msg.put("time", time);
            io.getRoomOperations(roomKey)
                    .sendEvent("session-message-receive", Map.of(
                        "chatId", chatId != null ? chatId : "",
                        "message", msg
                    ));
        });

        // ── Notes partagées ──────────────────────────────────────────
        io.addEventListener("session-add-note", AddNotePayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.text)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            if (roomKey == null) return;
            String userId   = trimToNull(client.get("sessionUserId"));
            String userName = trimToNull(client.get("sessionUserName"));
            String chatId   = trimToNull(client.get("sessionChatId"));
            if (userId == null || chatId == null) return;
            String effectiveName = userName != null ? userName : "Membre";
            SessionNote saved = sessionNoteRepository.save(
                SessionNote.builder()
                    .chatRoomKey(chatId)
                    .authorId(userId)
                    .authorName(effectiveName)
                    .text(data.text.trim())
                    .build()
            );
            Map<String, Object> nm = new HashMap<>();
            nm.put("id", saved.getId());
            nm.put("authorId", saved.getAuthorId());
            nm.put("authorName", saved.getAuthorName());
            nm.put("text", saved.getText());
            nm.put("createdAt", saved.getCreatedAt().toString().substring(11, 16));
            io.getRoomOperations(roomKey).sendEvent("session-note-added", Map.of("chatId", chatId, "note", nm));
        });

        io.addEventListener("session-remove-note", RemoveNotePayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.noteId)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            String chatId  = trimToNull(client.get("sessionChatId"));
            if (roomKey == null) return;
            sessionNoteRepository.deleteById(data.noteId);
            io.getRoomOperations(roomKey).sendEvent("session-note-removed",
                Map.of("chatId", chatId != null ? chatId : "", "noteId", data.noteId));
        });

        // ── Cours items partagés (broadcast, chaque client persiste dans sa propre session) ──
        io.addEventListener("session-add-course-item", CourseItemPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.id)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            String chatId  = trimToNull(client.get("sessionChatId"));
            if (roomKey == null) return;
            Map<String, Object> item = new HashMap<>();
            item.put("id", data.id);
            item.put("type", data.type != null ? data.type : "reference");
            item.put("title", data.title != null ? data.title : "");
            item.put("content", data.content != null ? data.content : "");
            item.put("authorName", data.authorName != null ? data.authorName : "Membre");
            io.getRoomOperations(roomKey).sendEvent("session-course-item-added",
                Map.of("chatId", chatId != null ? chatId : "", "item", item));
        });

        io.addEventListener("session-remove-course-item", RemoveCourseItemPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.courseItemId)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            String chatId  = trimToNull(client.get("sessionChatId"));
            if (roomKey == null) return;
            io.getRoomOperations(roomKey).sendEvent("session-course-item-removed",
                Map.of("chatId", chatId != null ? chatId : "", "courseItemId", data.courseItemId));
        });

        // ── Pièces jointes partagées ─────────────────────────────────
        io.addEventListener("session-add-attachment", AttachmentPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.id)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            String chatId  = trimToNull(client.get("sessionChatId"));
            if (roomKey == null) return;
            Map<String, Object> att = new HashMap<>();
            att.put("id", data.id);
            att.put("name", data.name != null ? data.name : "");
            att.put("size", data.size != null ? data.size : "");
            att.put("mimeType", data.mimeType != null ? data.mimeType : "");
            att.put("dataUrl", data.dataUrl != null ? data.dataUrl : "");
            io.getRoomOperations(roomKey).sendEvent("session-attachment-added",
                Map.of("chatId", chatId != null ? chatId : "", "attachment", att));
        });

        io.addEventListener("session-remove-attachment", RemoveByIdPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.id)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            String chatId  = trimToNull(client.get("sessionChatId"));
            if (roomKey == null) return;
            io.getRoomOperations(roomKey).sendEvent("session-attachment-removed",
                Map.of("chatId", chatId != null ? chatId : "", "id", data.id));
        });

        // ── Liens rapides partagés ───────────────────────────────────
        io.addEventListener("session-add-link", LinkPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.id)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            String chatId  = trimToNull(client.get("sessionChatId"));
            if (roomKey == null) return;
            Map<String, Object> link = new HashMap<>();
            link.put("id", data.id);
            link.put("label", data.label != null ? data.label : "");
            link.put("url", data.url != null ? data.url : "#");
            io.getRoomOperations(roomKey).sendEvent("session-link-added",
                Map.of("chatId", chatId != null ? chatId : "", "link", link));
        });

        io.addEventListener("session-remove-link", RemoveByIdPayload.class, (client, data, ackSender) -> {
            if (data == null || isBlank(data.id)) return;
            String roomKey = trimToNull(client.get("sessionRoomKey"));
            String chatId  = trimToNull(client.get("sessionChatId"));
            if (roomKey == null) return;
            io.getRoomOperations(roomKey).sendEvent("session-link-removed",
                Map.of("chatId", chatId != null ? chatId : "", "id", data.id));
        });

        io.addDisconnectListener((client) -> {
            for (String r : client.getAllRooms()) {
                if (r != null && r.startsWith("group:")) {
                    emitPresence(io, r.substring("group:".length()));
                }
            }
        });
    }

    private void emitPresence(SocketIOServer io, String groupId) {
        String room = room(groupId);
        List<String> online = io.getRoomOperations(room)
                .getClients()
                .stream()
                .map(SocketIOClient::getSessionId)
                .map(Object::toString)
                .toList();
        io.getRoomOperations(room)
                .sendEvent("presence-update", Map.of("groupId", groupId, "onlineSocketIds", online));
    }

    private String room(String groupId) {
        return "group:" + groupId;
    }

    private String sessionRoom(String sessionId) {
        return "session:" + sessionId;
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String trimToNull(String s) {
        if (s == null) return null;
        String v = s.trim();
        return v.isEmpty() ? null : v;
    }

    private Map<String, Object> toFrontend(GroupMessage message) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", message.getId());
        m.put("senderId", message.getSenderId());
        m.put("senderName", message.getSenderName());
        m.put("text", message.getText());
        m.put("timestamp", message.getSentAt());
        return m;
    }

    public static class JoinGroupPayload {
        public String groupId;
        public String userId;
    }

    public static class LeaveGroupPayload {
        public String groupId;
    }

    public static class SendMessagePayload {
        public String groupId;
        public IncomingMessage message;
    }

    public static class IncomingMessage {
        public String senderId;
        public String senderName;
        public String text;
        public String timestamp;
    }

    public static class JoinSessionPayload {
        public String sessionId;
        public String userId;
        public String userName;
        public String groupId; // pour les sessions de groupe → room partagée
    }

    public static class LeaveSessionPayload {
        public String sessionId;
    }

    public static class SessionMessagePayload {
        public String text;
    }

    public static class AddNotePayload {
        public String text;
    }

    public static class RemoveNotePayload {
        public String noteId;
    }

    public static class CourseItemPayload {
        public String id;
        public String type;
        public String title;
        public String content;
        public String authorName;
    }

    public static class RemoveCourseItemPayload {
        public String courseItemId;
    }

    public static class AttachmentPayload {
        public String id;
        public String name;
        public String size;
        public String dataUrl;
        public String mimeType;
    }

    public static class LinkPayload {
        public String id;
        public String label;
        public String url;
    }

    /** Payload générique pour supprimer un élément par son id */
    public static class RemoveByIdPayload {
        public String id;
    }
}
