FROM jenkins/jenkins:lts

USER root

<<<<<<< HEAD
# Install Docker + docker-compose (v1)
RUN apt-get update && \
    apt-get install -y docker.io docker-compose

# Give Jenkins permission
=======
# Install Docker
RUN apt-get update && \
    apt-get install -y docker.io curl

# Install Docker Compose manually (v2 binary)
RUN curl -L https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
    -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose

# Give permission
>>>>>>> f8b5949 (Jenkins.Dockerfile updated)
RUN usermod -aG docker jenkins

USER jenkins
