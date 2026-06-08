# SyncStudy Backend (Spring Boot 3 + MongoDB)

Backend API de SyncStudy, basé sur Spring Boot 3 et MongoDB.

## Prérequis

- Java 21
- Maven 3.9+ (ou wrapper Maven)
- MongoDB (local ou distant)

## Variables d'environnement

Copier/adapter les variables depuis `backend/.env.example` :

- `MONGODB_URI`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `MAIL_HOST`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`

## Lancement en développement

Depuis `backend/` :

```bash
./mvnw spring-boot:run
```

Si le wrapper n'est pas disponible :

```bash
mvn spring-boot:run
```

API exposée sur `http://localhost:8080/api`.

## Compilation

```bash
mvn clean test -DskipTests
```

## Fichiers importants

- Entrée application : `src/main/java/com/syncstudy/SyncStudyApplication.java`
- Config : `src/main/resources/application.properties`
- Profil prod : `src/main/resources/application-prod.properties`
- Structure API : `controller/`, `service/`, `repository/`, `model/`, `dto/`, `security/`
