package com.syncstudy.controller;

import com.syncstudy.dto.request.CreateGroupRequest;
import com.syncstudy.dto.request.InviteMemberRequest;
import com.syncstudy.dto.request.JoinGroupRequest;
import com.syncstudy.dto.request.SendMessageRequest;
import com.syncstudy.model.GroupMessage;
import com.syncstudy.model.StudyGroup;
import com.syncstudy.model.User;
import com.syncstudy.repository.UserRepository;
import com.syncstudy.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/groups")
@PreAuthorize("isAuthenticated()")
public class GroupController {
    private final GroupService groupService;
    private final UserRepository userRepository;

    public GroupController(GroupService groupService, UserRepository userRepository) {
        this.groupService = groupService;
        this.userRepository = userRepository;
    }

    private Map<String, Object> toFrontend(StudyGroup g, String userId) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", g.getId());
        m.put("name", g.getName());
        m.put("description", g.getDescription());
        m.put("colorClass", g.getColorClass());
        m.put("ownerId", g.getOwnerId());
        m.put("inviteCode", g.getInviteCode());
        int count = g.getMemberIds() == null ? 0 : g.getMemberIds().size();
        m.put("members", count);
        m.put("lastActive", g.getCreatedAt() != null ? g.getCreatedAt().toLocalDate().toString() : "Maintenant");
        m.put("isJoined", g.getMemberIds() != null && g.getMemberIds().contains(userId));
        m.put("memberDetails", memberDetails(g));
        m.put("tasks", g.getTasks() != null ? g.getTasks() : List.of());
        return m;
    }

    private List<Map<String, Object>> memberDetails(StudyGroup g) {
        List<String> ids = g.getMemberIds() == null ? List.of() : g.getMemberIds();
        Map<String, User> byId = new HashMap<>();
        userRepository.findAllById(ids).forEach(u -> byId.put(u.getId(), u));
        return ids.stream().map(id -> {
            User u = byId.get(id);
            String name = u != null && u.getName() != null && !u.getName().isBlank()
                    ? u.getName()
                    : "Membre";
            Map<String, Object> item = new HashMap<>();
            item.put("id", id);
            item.put("name", name);
            item.put("role", id.equals(g.getOwnerId()) ? "Propriétaire" : "Membre");
            return item;
        }).toList();
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

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication authentication) {
        String userId = authentication.getName();
        return ResponseEntity.ok(groupService.getGroupsByUser(userId)
                .stream().map(g -> toFrontend(g, userId)).toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(Authentication authentication, @Valid @RequestBody CreateGroupRequest req) {
        StudyGroup g = groupService.createGroup(authentication.getName(), req);
        return ResponseEntity.ok(toFrontend(g, authentication.getName()));
    }

    @PostMapping("/join")
    public ResponseEntity<Map<String, Object>> join(Authentication authentication, @Valid @RequestBody JoinGroupRequest req) {
        StudyGroup g = groupService.joinGroup(authentication.getName(), req.getInviteCode());
        return ResponseEntity.ok(toFrontend(g, authentication.getName()));
    }

    /**
     * Rejoindre un groupe par son ID (depuis la liste des groupes disponibles).
     * Contrairement à POST /join qui exige un code d'invitation,
     * cet endpoint est utilisé quand le frontend a déjà l'ID du groupe.
     */
    @PostMapping("/{id}/join")
    public ResponseEntity<Map<String, Object>> joinById(Authentication authentication, @PathVariable String id) {
        StudyGroup g = groupService.joinGroupById(authentication.getName(), id);
        return ResponseEntity.ok(toFrontend(g, authentication.getName()));
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<Void> invite(Authentication authentication, @PathVariable String id, @Valid @RequestBody InviteMemberRequest req) {
        groupService.inviteMember(id, authentication.getName(), req.getEmail());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(Authentication authentication,
                                                       @PathVariable String id,
                                                       @RequestBody Map<String, Object> fields) {
        StudyGroup g = groupService.updateGroup(authentication.getName(), id, fields);
        return ResponseEntity.ok(toFrontend(g, authentication.getName()));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(Authentication authentication,
                                              @PathVariable String id,
                                              @PathVariable String userId) {
        groupService.removeMember(authentication.getName(), id, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leave(Authentication authentication, @PathVariable String id) {
        groupService.leaveGroup(authentication.getName(), id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> dissolve(Authentication authentication, @PathVariable String id) {
        groupService.dissolveGroup(authentication.getName(), id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<Map<String, Object>>> messages(Authentication authentication, @PathVariable String id) {
        return ResponseEntity.ok(groupService.getMessages(id, authentication.getName())
                .stream().map(this::toFrontend).toList());
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<Map<String, Object>> sendMessage(Authentication authentication, @PathVariable String id, @Valid @RequestBody SendMessageRequest req) {
        return ResponseEntity.ok(toFrontend(groupService.sendMessage(id, authentication.getName(), req.getText())));
    }
}
