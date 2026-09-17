# AI Helpdesk Automation System

A Spring Boot REST API for AI-powered customer support — with JWT auth, Groq LLM integration, auto ticket classification, email notifications, and scheduled reports.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | Java 21 + Spring Boot 3.2           |
| Security    | Spring Security + JWT               |
| Database    | MySQL 8                             |
| AI          | Groq API (LLaMA 3.3 70B)           |
| Email       | Spring Mail + Gmail SMTP            |
| Docs        | Swagger / OpenAPI 3                 |
| Build       | Maven                               |

---

## Quick Start

### 1. Prerequisites

- Java 21
- MySQL 8 running locally
- A [Groq API key](https://console.groq.com) (free)
- Gmail account with App Password for email

### 2. Configure `application.properties`

Open `src/main/resources/application.properties` and fill in:

```properties
spring.datasource.password=YOUR_MYSQL_PASSWORD
app.jwt.secret=YOUR_256_BIT_BASE64_SECRET
groq.api.key=YOUR_GROQ_API_KEY
spring.mail.username=your@gmail.com
spring.mail.password=your_app_password
app.mail.from=your@gmail.com
```

> **JWT secret tip:** Generate with `openssl rand -base64 32`

### 3. Create the MySQL database

```sql
CREATE DATABASE ai_helpdesk;
```

Spring Boot will create all tables automatically on first run (`ddl-auto=update`).

### 4. Run the app

```bash
mvn spring-boot:run
```

The API starts on `http://localhost:8080`.

---

## API Endpoints

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login → get JWT token |

### Customer (requires JWT)
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/tickets` | Create a support ticket |
| GET | `/api/tickets/my` | Get my tickets |
| GET | `/api/tickets/{id}` | Get ticket detail |
| PUT | `/api/tickets/{id}/close` | Close a ticket |
| PUT | `/api/tickets/{id}/reopen` | Reopen a closed ticket |
| POST | `/api/chat/{ticketId}` | Chat with AI on a ticket |

### Admin (requires ADMIN/AGENT role)
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/dashboard` | Get dashboard stats |
| GET | `/api/admin/tickets` | Get all tickets |
| PUT | `/api/admin/tickets/{id}/assign` | Assign to department/agent |
| PUT | `/api/admin/tickets/{id}/priority` | Update priority |
| PUT | `/api/admin/tickets/{id}/close` | Close any ticket |

### Swagger UI
Visit `http://localhost:8080/swagger-ui.html` to explore and test all APIs interactively.

---

## Project Structure

```
src/main/java/com/helpdesk/
├── AiHelpdeskApplication.java      ← Entry point
├── controller/
│   ├── AuthController.java         ← POST /api/auth/**
│   ├── TicketController.java       ← POST/GET /api/tickets + /api/chat
│   └── AdminController.java        ← GET/PUT /api/admin/**
├── service/
│   ├── AuthService.java            ← Register & login logic
│   ├── TicketService.java          ← Ticket CRUD + AI chat
│   ├── GroqAiService.java          ← Groq LLM API integration
│   ├── EmailService.java           ← Async email sending
│   └── ScheduledTaskService.java   ← Daily reports, stale ticket alerts
├── entity/
│   ├── User.java
│   ├── Ticket.java
│   ├── Message.java
│   └── Attachment.java
├── repository/
│   └── Repositories.java           ← JPA repositories
├── security/
│   └── SecurityConfig.java         ← JWT filter + SecurityFilterChain
├── util/
│   └── JwtUtil.java
├── dto/
│   └── DTOs.java
├── config/
│   └── SwaggerConfig.java
└── exception/
    └── GlobalExceptionHandler.java
```

---

## AI Features

- **Auto priority detection** — Groq classifies every ticket as LOW / MEDIUM / HIGH / CRITICAL
- **Sentiment analysis** — detects HAPPY / NEUTRAL / FRUSTRATED / ANGRY
- **Department routing** — auto-assigns to BILLING, TECHNICAL, DELIVERY, ACCOUNT
- **Escalation detection** — flags sensitive issues (payment fraud, server down) for human agents
- **Conversation context** — full message history is sent to Groq for coherent multi-turn chat

---

## Development Notes

- Run tests with `mvn test` — uses H2 in-memory DB, no MySQL needed
- Hot reload via Spring DevTools is enabled
- To create an ADMIN user, manually set `role = 'ADMIN'` in the `users` table after registering
- Scheduled daily report fires at 11 PM (`@Scheduled(cron = "0 0 23 * * *")`)
