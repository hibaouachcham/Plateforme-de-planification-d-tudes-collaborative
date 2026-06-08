package com.syncstudy.service;

import com.syncstudy.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final JwtConfig jwtConfig;

    public JwtService(JwtConfig jwtConfig) {
        this.jwtConfig = jwtConfig;
    }

    private Key key() {
        return Keys.hmacShaKeyFor(jwtConfig.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    private Claims claims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String generateAccessToken(String userId, String role) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + jwtConfig.getAccessTokenExpiration());
        return Jwts.builder()
                .setSubject(userId)
                .claim("role", role)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(key())
                .compact();
    }

    public String generateRefreshToken(String userId) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + jwtConfig.getRefreshTokenExpiration());
        return Jwts.builder()
                .setSubject(userId)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(key())
                .compact();
    }

    public String extractUserId(String token) {
        return claims(token).getSubject();
    }

    public String extractRole(String token) {
        Object role = claims(token).get("role");
        return role == null ? "student" : role.toString();
    }

    public boolean isTokenValid(String token) {
        try {
            return !isTokenExpired(token);
        } catch (Exception ex) {
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return claims(token).getExpiration().before(new Date());
    }
}
