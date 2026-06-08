# Auth API Contract (Frontend <-> Backend)

This document defines the expected API contract for module 4.1 (authentication, profile/session security, admin password reset) used by the Angular frontend.

## Base URL

- Development: `http://localhost:3000/api`
- Prefix: `/api`

---

## 1) Login

- **Method**: `POST`
- **Path**: `/auth/login`
- **Request body**:

```json
{
  "email": "student@example.com",
  "password": "SecurePass1"
}
```

- **Success response** (`200`):

```json
{
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "id": "u1",
    "name": "Student Name",
    "email": "student@example.com",
    "role": "student",
    "status": "active",
    "joinedDate": "2026-04-13",
    "school": "EST",
    "level": "2eme annee",
    "avatar": "Student",
    "preferences": {
      "preferredSessionMinutes": 45,
      "restDayIndices": [0]
    },
    "onboardingCompleted": true
  }
}
```

- **Error codes**: `400`, `401`

---

## 2) Register

- **Method**: `POST`
- **Path**: `/auth/register`
- **Request body**:

```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "password": "SecurePass1",
  "school": "EST",
  "level": "2eme annee",
  "phone": "+212600000000",
  "birthDate": "2003-01-15"
}
```

- **Success response** (`201` or `200`):

```json
{
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "id": "u9",
    "name": "Student Name",
    "email": "student@example.com",
    "role": "student",
    "status": "active",
    "joinedDate": "2026-04-13",
    "school": "EST",
    "level": "2eme annee",
    "onboardingCompleted": false,
    "preferences": {
      "preferredSessionMinutes": 45,
      "restDayIndices": []
    }
  }
}
```

- **Error codes**: `400`, `409`

---

## 3) Forgot Password

- **Method**: `POST`
- **Path**: `/auth/forgot-password`
- **Request body**:

```json
{
  "email": "student@example.com"
}
```

- **Success response** (`200`):

```json
{
  "message": "Reset link sent"
}
```

- **Error codes**: `400`, `404`

---

## 4) Refresh Access Token

- **Method**: `POST`
- **Path**: `/auth/refresh`
- **Request body**:

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

- **Success response** (`200`):

```json
{
  "accessToken": "new_jwt_access_token"
}
```

- **Error codes**: `401`, `403`

---

## 5) Logout (token invalidation / blacklist)

- **Method**: `POST`
- **Path**: `/auth/logout`
- **Request body**:

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

- **Headers**:
  - `Authorization: Bearer <accessToken>` (recommended)

- **Success response** (`200`):

```json
{
  "message": "Logged out"
}
```

- **Expected backend behavior**:
  - Invalidate / blacklist token(s) (e.g. Redis).

---

## 6) Admin - Reset User Password

- **Method**: `POST`
- **Path**: `/users/reset-password`
- **Headers**:
  - `Authorization: Bearer <adminAccessToken>`
- **Request body**:

```json
{
  "email": "student@example.com"
}
```

- **Success response** (`200`):

```json
{
  "message": "Reset link sent"
}
```

- **Error codes**: `400`, `403`, `404`

---

## 7) Sessions list (admin KPI support)

- **Method**: `GET`
- **Path**: `/sessions`
- **Headers**:
  - `Authorization: Bearer <accessToken>`
- **Success response** (`200`):

```json
[
  {
    "id": "s1",
    "subjectId": "sub1",
    "startTime": "2026-04-13T09:00:00.000Z",
    "endTime": "2026-04-13T10:00:00.000Z",
    "isCompleted": false
  }
]
```

---

## Common Error Format (recommended)

Use a consistent error payload for frontend toast handling:

```json
{
  "message": "Human readable error",
  "code": "OPTIONAL_MACHINE_CODE"
}
```

## JWT Lifetime (CDC target)

- Access token: **15 minutes**
- Refresh token: **7 days**

