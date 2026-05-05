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

        stage('Debug Files') {
            steps {
                sh 'pwd'
                sh 'ls -la'
                sh 'ls -la gateway || true'
                sh 'ls -la prometheus || true'
                sh 'ls -la services || true'
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
#JWT_SECRET=my_super_secret_key
JWT_SECRET=access_secret
JWT_REFRESH_SECRET=refresh_secret
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
        stage('Verify DB') {
    steps {
        sh '''
        sleep 10
        docker exec postgres psql -U postgres -d udemy_devops -c "SELECT * FROM users;"
        '''
    }
}
    }
}
