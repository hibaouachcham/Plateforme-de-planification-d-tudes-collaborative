package com.syncstudy.service;

import com.syncstudy.model.PasswordResetToken;
import com.syncstudy.model.User;
import com.syncstudy.repository.PasswordResetTokenRepository;
import com.syncstudy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Gère le flux mot de passe oublié / réinitialisation (CDC §4.1.1).
 *
 * Séparé de AuthService pour éviter les dépendances circulaires.
 */
@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Value("${app.reset-token.expiration-minutes:30}")
    private int expirationMinutes;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository resetTokenRepository,
            PasswordEncoder passwordEncoder,
            MailService mailService
    ) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
    }

    /**
     * Envoie un email de réinitialisation si l'adresse est connue.
     * Retourne toujours silencieusement (anti-énumération).
     */
    public void requestReset(String email) {
        String normalized = (email == null) ? "" : email.trim().toLowerCase();
        userRepository.findByEmail(normalized).ifPresent(user -> {
            // Invalider tout token précédent pour cet utilisateur
            resetTokenRepository.deleteByUserId(user.getId());

            String rawToken = UUID.randomUUID().toString();
            PasswordResetToken token = PasswordResetToken.builder()
                    .token(rawToken)
                    .userId(user.getId())
                    .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                    .used(false)
                    .build();
            resetTokenRepository.save(token);

            String link = frontendUrl + "/auth?mode=reset&token=" + rawToken;
            String subject = "SyncStudy — Réinitialisation de votre mot de passe";
            String body = """
                    Bonjour %s,

                    Vous avez demandé la réinitialisation de votre mot de passe SyncStudy.

                    Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valable %d minutes) :

                    %s

                    Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

                    L'équipe SyncStudy
                    """.formatted(user.getName(), expirationMinutes, link);

            mailService.send(normalized, subject, body);
        });
    }

    /**
     * Valide le token et met à jour le mot de passe.
     *
     * @throws ResponseStatusException 400 si le token est invalide, expiré ou déjà utilisé
     */
    public void confirmReset(String rawToken, String newPassword) {
        PasswordResetToken token = resetTokenRepository.findByToken(rawToken)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Token invalide ou expiré"));

        if (token.isUsed()) {
            throw new ResponseStatusException(BAD_REQUEST, "Ce lien a déjà été utilisé");
        }
        if (token.isExpired()) {
            resetTokenRepository.delete(token);
            throw new ResponseStatusException(BAD_REQUEST, "Ce lien a expiré. Veuillez faire une nouvelle demande.");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Utilisateur introuvable"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        // Invalider toutes les sessions actives après changement de mot de passe
        user.setRefreshTokens(new ArrayList<>());
        userRepository.save(user);

        token.setUsed(true);
        resetTokenRepository.save(token);
    }
}
