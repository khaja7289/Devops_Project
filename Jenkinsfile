pipeline {
    agent any

    stages {
        stage('Clone') {
            steps {
                git 'https://github.com/khaja7289/Devops_Project.git'
            }
        }

        stage('Build') {
            steps {
                sh 'docker compose down || true'
                sh 'docker compose build'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose up -d'
            }
        }
    }
}
