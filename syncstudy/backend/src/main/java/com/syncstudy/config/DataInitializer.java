package com.syncstudy.config;

import com.syncstudy.model.User;
import com.syncstudy.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;

/**
 * Initialise les données de base au démarrage de l'application.
 * Crée le compte administrateur s'il n'existe pas encore en base.
 */
@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private static final String ADMIN_EMAIL    = "adminsyncstudy@gmail.com";
    private static final String ADMIN_PASSWORD = "Admin@2026";
    private static final String ADMIN_NAME     = "Administrateur SyncStudy";

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        // Créer le compte admin uniquement s'il n'existe pas déjà
        if (!userRepository.existsByEmail(ADMIN_EMAIL)) {
            User admin = User.builder()
                    .name(ADMIN_NAME)
                    .email(ADMIN_EMAIL)
                    .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                    .role("admin")
                    .status("active")
                    .school("SyncStudy")
                    .level("Administrateur")
                    .onboardingCompleted(true)
                    .createdAt(LocalDateTime.now())
                    .refreshTokens(new ArrayList<>())
                    .build();
            userRepository.save(admin);
            log.info("✅ Compte admin créé : {} / {}", ADMIN_EMAIL, ADMIN_PASSWORD);
        } else {
            log.info("✅ Compte admin déjà présent en base : {}", ADMIN_EMAIL);
        }
    }
}
