# Secrets Management

This directory contains sensitive credentials for the application.

## Files

- `jwt_secret.txt` - JWT access token signing secret
- `jwt_refresh_secret.txt` - JWT refresh token signing secret

## Important Security Notes

⚠️ **NEVER** commit secret files to version control!
- These files are listed in `.gitignore`
- In production, use proper secret management tools:
  - **Kubernetes**: Use `kubectl create secret`
  - **Docker Swarm**: Use `docker secret create`
  - **AWS**: Use AWS Secrets Manager
  - **HashiCorp Vault**: Use Vault KV engine
  - **Azure**: Use Azure Key Vault

## Local Development

For local development with Docker Compose:

```bash
# Create secrets directory
mkdir -p services/auth-service/secrets

# Create secret files with your values
echo "your_jwt_secret_value" > services/auth-service/secrets/jwt_secret.txt
echo "your_jwt_refresh_secret_value" > services/auth-service/secrets/jwt_refresh_secret.txt

# Start services
docker-compose up -d
```

## Production Deployment

### Docker Swarm (Recommended)

```bash
# Create secrets in Docker Swarm
docker secret create jwt_secret -
docker secret create jwt_refresh_secret -

# Reference in docker-compose.yml
secrets:
  jwt_secret:
    external: true
  jwt_refresh_secret:
    external: true
```

### Kubernetes

```bash
# Create secrets in Kubernetes
kubectl create secret generic auth-secrets \
  --from-literal=jwt_secret=<value> \
  --from-literal=jwt_refresh_secret=<value>

# Reference in deployment.yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: auth-secrets
        key: jwt_secret
```

### HashiCorp Vault

```bash
# Store in Vault
vault kv put secret/auth \
  jwt_secret=<value> \
  jwt_refresh_secret=<value>

# Retrieve in application
curl http://vault:8200/v1/secret/data/auth
```

## Best Practices

1. ✅ Use different secrets for dev/staging/prod
2. ✅ Rotate secrets regularly (monthly recommended)
3. ✅ Limit access to secret files (chmod 600)
4. ✅ Use secrets management tools in production
5. ✅ Never log or print secret values
6. ✅ Use strong random values (at least 32 characters)
7. ✅ Audit secret access logs

## Generating Strong Secrets

```bash
# Generate random secret (Linux/Mac)
openssl rand -base64 32

# Generate random secret (Windows PowerShell)
[Convert]::ToBase64String((1..32|ForEach-Object{[byte](Get-Random -Maximum 256)}))
```

## References

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
