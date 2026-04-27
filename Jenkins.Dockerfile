FROM jenkins/jenkins:lts

USER root

# Install Docker CLI only (not full engine)
RUN apt-get update && \
    apt-get install -y docker.io

# Give Jenkins permission to use Docker socket
RUN usermod -aG docker jenkins

USER jenkins
