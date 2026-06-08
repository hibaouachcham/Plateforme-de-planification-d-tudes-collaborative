package com.syncstudy.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String from;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Tente d'envoyer un email.
     * Si SMTP n'est pas configuré ou si l'envoi échoue, logue un avertissement
     * au lieu de lever une exception — best-effort, ne bloque pas l'appelant.
     *
     * @return true si l'email a été envoyé avec succès, false sinon.
     */
    public boolean send(String to, String subject, String text) {
        if (!StringUtils.hasText(from)) {
            log.warn("MAIL_USERNAME non configuré — email non envoyé à {}", to);
            return false;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(text);
            mailSender.send(msg);
            log.info("Email envoyé à {}", to);
            return true;
        } catch (MailException ex) {
            log.error("Échec d'envoi de l'email à {} : {}", to, ex.getMessage());
            return false;
        }
    }
}
