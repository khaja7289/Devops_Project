pipeline {
    agent any

    stages {
        stage('Clean') {
            steps {
                deleteDir()
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Create .env') {
            steps {
                sh '''
                cat <<EOF > services/auth-service/.env
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=udemy_devops
DB_PORT=5432
PORT=3000
JWT_SECRET=my_super_secret_key
EOF
                '''
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                docker compose down || true
                docker compose up -d --build
                '''
            }
        }
        stage('Debug Files') {
    steps {
        sh 'ls -la'
        sh 'ls -la gateway'
    }
}
    }
}
