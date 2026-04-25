pipeline {
    agent any

    stages {
        stage('Clean Workspace') {
            steps {
                deleteDir()   // 🔥 ALWAYS START FRESH
            }
        }

        stage('Build') {
            steps {
                sh 'docker-compose down || true'
                sh 'docker-compose up -d --build'
            }
        }
    }
}
