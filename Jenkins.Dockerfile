FROM jenkins/jenkins:lts

USER root

# Install Docker + docker-compose (v1)
RUN apt-get update && \
    apt-get install -y docker.io docker-compose

# Give Jenkins permission
RUN usermod -aG docker jenkins

USER jenkins
