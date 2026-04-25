pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
		sh 'docker-compose down || true'
		sh 'docker-compose build'
		sh 'docker-compose up -d'                
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose up -d'
            }
        }
    }
}
