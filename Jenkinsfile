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
        sh 'ENTRY_FILE=$(node -e "try { const pkg = require(\"./package.json\"); process.stdout.write(pkg.main || \"server.js\"); } catch (err) { console.error(\"Unable to read package.json\"); process.exit(1); }") && node --check "$ENTRY_FILE"'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t cyberlabx:latest .'
      }
    }
  }
}
