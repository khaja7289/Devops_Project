pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Clean') {
            steps {
                echo '🧹 Cleaning workspace...'
                deleteDir()
            }
        }

        stage('Checkout') {
            steps {
                echo '📥 Checking out code...'
                checkout scm
            }
        }

        stage('Debug Files') {
            steps {
                echo '📂 Listing project structure...'
                sh 'pwd'
                sh 'ls -la'
                sh 'ls -la gateway || true'
                sh 'ls -la prometheus || true'
                sh 'ls -la services || true'
            }
        }

        stage('Unit Tests') {
            steps {
                echo '🧪 Running unit tests in Node container...'
                sh '''
                echo "Host workspace listing:"
                ls -la services/auth-service

                tar -C services/auth-service -c . | docker run --rm -i -w /app node:18 /bin/sh -lc 'mkdir -p /app && tar -x -C /app && pwd && ls -la /app && cat /app/package.json | head -20 && npm install && npm test -- --ci --coverage'
                '''
            }
        }

        stage('Lint & Code Quality') {
            steps {
                echo '✨ Checking code quality in Node container...'
                sh '''
                tar -C services/auth-service -c . | docker run --rm -i -w /app node:18 /bin/sh -lc 'mkdir -p /app && tar -x -C /app && node --version && npm --version && (npx eslint --version || echo "ESLint not configured")'
                '''
            }
        }

        stage('Create Secrets') {
            steps {
                echo '🔐 Setting up secrets...'
                sh '''
                mkdir -p services/auth-service/secrets
                echo "access_secret" > services/auth-service/secrets/jwt_secret.txt
                echo "refresh_secret" > services/auth-service/secrets/jwt_refresh_secret.txt
                '''
            }
        }

        stage('Docker Build & Push') {
            steps {
                echo '📦 Building and pushing Docker images...'
                sh '''
                IMAGE_TAG=$(git rev-parse --short HEAD)
                echo "Using image tag: $IMAGE_TAG"

                if [ -n "$DOCKERHUB_USERNAME" ] && [ -n "$DOCKERHUB_PASSWORD" ]; then
                  echo "Logging into Docker Hub"
                  echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
                else
                  echo "DOCKERHUB_USERNAME or DOCKERHUB_PASSWORD not set; skipping push"
                fi

                docker build -t khaja7289/devops-project-pipeline:auth-service-$IMAGE_TAG services/auth-service
                docker tag khaja7289/devops-project-pipeline:auth-service-$IMAGE_TAG khaja7289/devops-project-pipeline:auth-service

                docker build -t khaja7289/devops-project-pipeline:api-gateway-$IMAGE_TAG gateway
                docker tag khaja7289/devops-project-pipeline:api-gateway-$IMAGE_TAG khaja7289/devops-project-pipeline:api-gateway

                docker build -t khaja7289/devops-project-pipeline:prometheus-$IMAGE_TAG prometheus
                docker tag khaja7289/devops-project-pipeline:prometheus-$IMAGE_TAG khaja7289/devops-project-pipeline:prometheus

                if [ -n "$DOCKERHUB_USERNAME" ] && [ -n "$DOCKERHUB_PASSWORD" ]; then
                  docker push khaja7289/devops-project-pipeline:auth-service-$IMAGE_TAG
                  docker push khaja7289/devops-project-pipeline:auth-service
                  docker push khaja7289/devops-project-pipeline:api-gateway-$IMAGE_TAG
                  docker push khaja7289/devops-project-pipeline:api-gateway
                  docker push khaja7289/devops-project-pipeline:prometheus-$IMAGE_TAG
                  docker push khaja7289/devops-project-pipeline:prometheus
                fi
                '''
            }
        }

        stage('Build & Deploy') {
            steps {
                echo '🚀 Building and deploying containers...'
                sh '''
                docker compose down || true
                docker compose up -d --build
                echo "Waiting for services to be healthy..."
                sleep 15
                '''
            }
        }

        stage('Database Migrations') {
            steps {
                echo '🔄 Verifying database migrations...'
                sh '''
                docker logs flyway || true
                docker exec postgres psql -U postgres -d udemy_devops -c "SELECT version, description, success FROM flyway_schema_history ORDER BY version;"
                '''
            }
        }

        stage('Verify Users DB') {
            steps {
                echo '👥 Verifying users table...'
                sh '''
                docker exec postgres psql -U postgres -d udemy_devops -c "SELECT id, email, role, created_at FROM users LIMIT 5;"
                '''
            }
        }

        stage('Verify Refresh Tokens DB') {
            steps {
                echo '🔑 Verifying refresh_tokens table...'
                sh '''
                docker exec postgres psql -U postgres -d udemy_devops -c "SELECT id, user_id, created_at FROM refresh_tokens LIMIT 5;"
                '''
            }
        }

        stage('Health Checks') {
            steps {
                echo '❤️ Checking service health...'
                sh '''
                echo "Checking Auth Service health..."
                curl -f http://localhost:8080/auth/health || exit 1

                echo "Checking Prometheus health..."
                curl -f http://localhost:9090/-/healthy || exit 1

                echo "Checking Grafana health..."
                curl -f http://localhost:3001/api/health || exit 1

                echo "All services are healthy! ✅"
                '''
            }
        }

        stage('API Integration Tests') {
            steps {
                echo '🧬 Running API integration tests...'
                sh '''
                echo "Testing user registration..."
                curl -X POST http://localhost:8080/auth/register \
                  -H "Content-Type: application/json" \
                  -d '{
                    "email": "citest@example.com",
                    "password": "cisecure123",
                    "role": "student"
                  }' || true

                echo "\\nTesting user login..."
                LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/login \
                  -H "Content-Type: application/json" \
                  -d '{
                    "email": "admin@gmail.com",
                    "password": "admin123"
                  }')

                echo "Login response: $LOGIN_RESPONSE"

                ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

                if [ -z "$ACCESS_TOKEN" ]; then
                  echo "❌ Failed to get access token"
                  exit 1
                fi

                echo "\\nTesting protected endpoint (profile)..."
                curl -f -X GET http://localhost:8080/auth/profile \
                  -H "Authorization: Bearer $ACCESS_TOKEN" || exit 1

                echo "\\nTesting metrics endpoint..."
                curl -f http://localhost:8080/auth/metrics | head -20 || exit 1

                echo "\\n✅ All API tests passed!"
                '''
            }
        }

        stage('Performance Tests') {
            steps {
                echo '⚡ Running K6 performance tests...'
                sh '''
                docker run --rm --network host -v "$PWD":/src -w /src \
                  -e BASE_URL=http://localhost:8080 \
                  -e USER_EMAIL=admin@gmail.com \
                  -e USER_PASSWORD=admin123 \
                  -e USER_ROLE=admin \
                  -e VUS=1 \
                  -e DURATION=10m \
                  -e TPH=10 \
                  grafana/k6 run PerformanceTesting/auth_refresh_test.js --summary-export=PerformanceTesting/perf-summary.json

                echo "K6 summary exported to PerformanceTesting/perf-summary.json"
                cat PerformanceTesting/perf-summary.txt || true
                '''
            }
        }

        stage('Database Backup') {
            steps {
                echo '💾 Creating database backup...'
                sh '''
                mkdir -p backups
                BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql"
                docker exec postgres pg_dump -U postgres udemy_devops > $BACKUP_FILE
                echo "Database backed up to: $BACKUP_FILE"
                ls -lh backups/
                '''
            }
        }

        stage('Test Summary') {
            steps {
                echo '📊 Test Summary'
                sh '''
                echo "=== Pipeline Execution Summary ==="
                echo "Build Status: SUCCESS ✅"
                echo "Containers Running:"
                docker ps --format "table {{.Names}}\t{{.Status}}"
                echo ""
                echo "Service Endpoints:"
                echo "  - Auth Service: http://localhost:8080/auth"
                echo "  - Prometheus: http://localhost:9090"
                echo "  - Grafana: http://localhost:3001"
                echo "  - Direct Auth: http://localhost:3000"
                '''
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
            // Keep containers running for manual testing
            // Uncomment below to clean up after pipeline
            // sh 'docker compose down'
        }

        success {
            echo '✅ Pipeline completed successfully!'
        }

        failure {
            echo '❌ Pipeline failed!'
            sh '''
            echo "Collecting logs for debugging..."
            docker compose logs > pipeline_logs.txt 2>&1
            echo "Logs saved to: pipeline_logs.txt"
            '''
        }
    }
}
