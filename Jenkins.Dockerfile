FROM jenkins/jenkins:lts

USER root

# Install Docker
RUN apt-get update && \
    apt-get install -y docker.io curl

# Install Docker Compose v2 manually
RUN curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
    -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose

USER jenkins
