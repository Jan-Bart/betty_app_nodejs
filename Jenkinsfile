node {
   stage('Preparation') { // for display purposes
      checkout poll: false,
      scm: [$class: 'GitSCM',
        branches: [[name: '*/master']],
        doGenerateSubmoduleConfigurations: false,
        extensions: [], submoduleCfg: [],
        userRemoteConfigs: [
          [credentialsId: 'xxx',
          url: 'https://github.com/Jan-Bart/betty_app_nodejs']
        ]
      ]
   }
   stage('Build') {
    sh '''echo $PATH
        node --version
        npm --version
        npm i
        npm run build'''
   }
   stage('Deploy') {
    sshPublisher(publishers: [
      sshPublisherDesc(
        configName: 'Hetzner 1 publish ssh betty',
        transfers: [
          sshTransfer(
            cleanRemote: false,
            excludes: 'src/**,Dockerfile,README.md,package-lock.json',
            execCommand: 'pm2 restart betty',
            execTimeout: 120000,
            flatten: false,
            makeEmptyDirs: false,
            noDefaultExcludes: false,
            patternSeparator: '[, ]+',
            remoteDirectory: '.',
            remoteDirectorySDF: false,
            removePrefix: '',
            sourceFiles: '**')
        ],
        usePromotionTimestamp: false,
        useWorkspaceInPromotion: false,
        verbose: false)])
   }
   stage('Finish') {
       cleanWs()
   }
}