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
        sh 'node --check server.js'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t cyberlabx:latest .'
      }
    }
  }
}
