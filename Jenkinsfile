node {
   stage('Preparation') {
      checkout poll: false, scm: [$class: 'GitSCM', branches: [[name: '*/master']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[credentialsId: 'xxx', url: 'https://github.com/Jan-Bart/betty_app_nodejs']]]
   }
   stage('Build') {
       nodejs('nodejs-10.4.0') {
           env.NODEJS_HOME = "${tool 'nodejs-10.4.0'}"
           env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"
           sh '''echo $PATH
           node --version
           npm --version
           npm i --scripts-prepend-node-path
           npm run build --scripts-prepend-node-path
           pwd'''
        }
   }
   stage('Deploy') {
      sshPublisher(publishers: [sshPublisherDesc(configName: 'xxx', transfers: [sshTransfer(excludes: 'src/**,Dockerfile,README.md,package-lock.json', execCommand: 'pm2 restart betty', execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: 'betty_app_nodejs', remoteDirectorySDF: false, removePrefix: '', sourceFiles: '**')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])
   }
   stage('Finish') {
       cleanWs()
   }
}