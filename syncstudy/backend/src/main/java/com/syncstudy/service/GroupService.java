package com.syncstudy.service;

import com.syncstudy.dto.request.CreateGroupRequest;
import com.syncstudy.model.GroupMessage;
import com.syncstudy.model.StudyGroup;
import com.syncstudy.repository.UserRepository;
import com.syncstudy.repository.GroupMessageRepository;
import com.syncstudy.repository.StudyGroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class GroupService {
    private final StudyGroupRepository groupRepository;
    private final GroupMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final NotificationService notificationService;
    private final Random random = new Random();

    public GroupService(
            StudyGroupRepository groupRepository,
            GroupMessageRepository messageRepository,
            UserRepository userRepository,
            MailService mailService,
            NotificationService notificationService
    ) {
        this.groupRepository = groupRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.mailService = mailService;
        this.notificationService = notificationService;
    }

    private String inviteCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }

    public List<StudyGroup> getGroupsByUser(String userId) {
        return groupRepository.findByMemberIdsContaining(userId);
    }

    public StudyGroup createGroup(String userId, CreateGroupRequest req) {
        StudyGroup g = new StudyGroup();
        g.setName(req.getName());
        g.setDescription(req.getDescription());
        g.setColorClass(req.getColorClass());
        g.setOwnerId(userId);
        g.setInviteCode(inviteCode());
        g.setMemberIds(new ArrayList<>(List.of(userId)));
        g.setCreatedAt(LocalDateTime.now());
        return groupRepository.save(g);
    }

    public StudyGroup joinGroup(String userId, String inviteCode) {
        StudyGroup g = groupRepository.findByInviteCode(inviteCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Invite code not found"));
        if (g.getMemberIds() == null) g.setMemberIds(new ArrayList<>());
        if (g.getMemberIds().contains(userId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Already in group");
        }
        g.getMemberIds().add(userId);
        return groupRepository.save(g);
    }

    /**
     * Rejoindre un groupe par son ID (sans code d'invitation).
     * Utilisé lorsque l'utilisateur peut déjà voir le groupe dans la liste
     * et clique sur "Rejoindre" directement.
     */
    public StudyGroup joinGroupById(String userId, String groupId) {
        StudyGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Group not found"));
        if (g.getMemberIds() == null) g.setMemberIds(new ArrayList<>());
        if (g.getMemberIds().contains(userId)) {
            throw new ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "Already a member");
        }
        g.getMemberIds().add(userId);
        return groupRepository.save(g);
    }

    public void inviteMember(String groupId, String requesterId, String email) {
        StudyGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Group not found"));
        if (!requesterId.equals(g.getOwnerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Only owner can invite");
        }
        // Vérifier que l'email correspond à un compte SyncStudy enregistré
        if (!userRepository.existsByEmail(email.trim().toLowerCase())) {
            throw new ResponseStatusException(NOT_FOUND,
                    "Aucun compte SyncStudy n'est associé à cette adresse email.");
        }
        // Vérifier que l'utilisateur n'est pas déjà membre
        userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(u -> {
            if (g.getMemberIds() != null && g.getMemberIds().contains(u.getId())) {
                throw new ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "Cet utilisateur est déjà membre du groupe.");
            }
        });
        String invite = g.getInviteCode() == null ? "" : g.getInviteCode();

        // Récupérer le nom de l'expéditeur pour l'afficher dans la notification
        String senderName = userRepository.findById(requesterId)
                .map(u -> (u.getName() == null || u.getName().isBlank()) ? "Un membre" : u.getName().trim())
                .orElse("Un membre");

        // Créer la notification in-app pour l'utilisateur invité
        // referenceId = invite code (utilisé par le frontend pour appeler joinGroupByCode)
        userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(invitedUser -> {
            notificationService.push(
                    invitedUser.getId(),
                    "invitation",
                    "Invitation à rejoindre « " + g.getName() + " »",
                    senderName + " vous invite à rejoindre le groupe. Cliquez sur Accepter pour rejoindre.",
                    "Envoyé par : " + senderName + "  ·  Groupe : " + g.getName() + "  ·  Membres actuels : " + (g.getMemberIds() == null ? 0 : g.getMemberIds().size()),
                    invite
            );
        });

        // Tentative d'envoi email (best-effort)
        String subject = "Invitation SyncStudy — " + g.getName();
        String text = """
                Bonjour,

                Vous avez été invité(e) à rejoindre le groupe "%s" sur SyncStudy.

                Code d'invitation : %s

                Vous pouvez rejoindre le groupe depuis l'application (menu Groupes → Rejoindre avec un code).

                """.formatted(g.getName(), invite);
        boolean sent = mailService.send(email.trim().toLowerCase(), subject, text);
        if (!sent) {
            throw new ResponseStatusException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "Email non envoyé : SMTP non configuré. Partagez le code d'invitation manuellement : " + invite
            );
        }
    }

    public void removeMember(String requesterId, String groupId, String targetUserId) {
        StudyGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Group not found"));
        if (!requesterId.equals(g.getOwnerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Only the owner can remove members");
        }
        if (requesterId.equals(targetUserId)) {
            throw new ResponseStatusException(BAD_REQUEST, "The owner cannot remove themselves");
        }
        if (g.getMemberIds() == null || !g.getMemberIds().contains(targetUserId)) {
            throw new ResponseStatusException(NOT_FOUND, "User is not a member of this group");
        }
        g.getMemberIds().remove(targetUserId);
        groupRepository.save(g);
    }

    public StudyGroup updateGroup(String requesterId, String groupId, java.util.Map<String, Object> fields) {
        StudyGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Group not found"));
        if (!requesterId.equals(g.getOwnerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Only the owner can edit the group");
        }
        if (fields.containsKey("name")) {
            String name = (String) fields.get("name");
            if (name != null && !name.isBlank()) g.setName(name.trim());
        }
        if (fields.containsKey("description")) {
            g.setDescription((String) fields.get("description"));
        }
        if (fields.containsKey("tasks")) {
            @SuppressWarnings("unchecked")
            java.util.List<java.util.Map<String, Object>> tasks =
                    (java.util.List<java.util.Map<String, Object>>) fields.get("tasks");
            g.setTasks(tasks != null ? tasks : new ArrayList<>());
        }
        return groupRepository.save(g);
    }

    public void leaveGroup(String userId, String groupId) {
        StudyGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Group not found"));
        if (g.getMemberIds() != null) {
            g.getMemberIds().remove(userId);
            groupRepository.save(g);
        }
    }

    public void dissolveGroup(String requesterId, String groupId) {
        StudyGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Group not found"));
        if (!requesterId.equals(g.getOwnerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Only the owner can dissolve the group");
        }
        // Supprimer tous les messages du groupe, puis le groupe lui-même
        messageRepository.deleteByGroupId(groupId);
        groupRepository.deleteById(groupId);
    }

    public List<GroupMessage> getMessages(String groupId, String userId) {
        requireMembership(groupId, userId);
        return messageRepository.findByGroupIdOrderBySentAtAsc(groupId);
    }

    public GroupMessage sendMessage(String groupId, String userId, String text) {
        String name = userRepository.findById(userId)
                .map(u -> u.getName() == null || u.getName().isBlank() ? "Member" : u.getName().trim())
                .orElse("Member");
        return sendMessage(groupId, userId, name, text);
    }

    public GroupMessage sendMessage(String groupId, String userId, String senderName, String text) {
        requireMembership(groupId, userId);
        GroupMessage msg = new GroupMessage();
        msg.setGroupId(groupId);
        msg.setSenderId(userId);
        msg.setSenderName(senderName == null || senderName.isBlank() ? "Member" : senderName.trim());
        msg.setText(text);
        msg.setSentAt(LocalDateTime.now());
        return messageRepository.save(msg);
    }

    public void requireMembership(String groupId, String userId) {
        StudyGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Group not found"));
        if (g.getMemberIds() == null || !g.getMemberIds().contains(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "Not a member");
        }
    }
}
