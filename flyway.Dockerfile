FROM flyway/flyway:latest

COPY services/auth-service/migrations /flyway/sql
