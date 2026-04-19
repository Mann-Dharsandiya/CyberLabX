pipeline {
  agent any

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Smoke Check') {
      steps {
        sh 'ENTRY_FILE=$(node -p "require(\'./package.json\').main || \'server.js\'") && node --check "$ENTRY_FILE"'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t cyberlabx:latest .'
      }
    }
  }
}
