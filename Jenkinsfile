pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    stages {
        stage('Clean Workspace') {
            steps {
                deleteDir()
            }
        }

        stage('Checkout Code') {
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
                sh 'docker-compose down || true'

                sh '''
                docker build -t auth-service ./services/auth-service
                docker-compose up -d
                '''
            }
        }
    }
}
