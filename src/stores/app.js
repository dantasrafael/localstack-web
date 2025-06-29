import { defineStore } from 'pinia'
import { ref } from 'vue'
import { S3Client } from '@aws-sdk/client-s3'
import { SESClient} from '@aws-sdk/client-ses'
import { SNSClient } from '@aws-sdk/client-sns'
import { SQSClient } from '@aws-sdk/client-sqs'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { KinesisClient } from '@aws-sdk/client-kinesis'
import { KMSClient } from '@aws-sdk/client-kms'

export const useAppStore = defineStore('app', () => {
  const endpoint = ref(import.meta.env.VITE_LOCALSTACK_ENDPOINT || 'http://localhost:4566')
  const region = ref(import.meta.env.VITE_AWS_DEFAULT_REGION || 'us-east-1')
  const accessKeyId = ref(import.meta.env.VITE_AWS_ACCESS_KEY_ID || 'test')
  const secretAccessKey = ref(import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || 'test')
  const connectionStatus = ref('disconnected')
  const snackbar = ref({
    show: false,
    text: '',
    color: 'info',
    timeout: 4000
  })

  // AWS SDK v3 Configuration
  const awsConfig = {
    region: region.value,
    credentials: {
      accessKeyId: accessKeyId.value,
      secretAccessKey: secretAccessKey.value
    },
    endpoint: endpoint.value,
    forcePathStyle: true,
    tls: false
  }

  // Initialize AWS services
  const s3 = ref(null)
  const ses = ref(null)
  const sns = ref(null)
  const sqs = ref(null)
  const dynamodb = ref(null)
  const lambda = ref(null)
  const kinesis = ref(null)
  const kms = ref(null)

  const initializeServices = () => {
    const config = { 
      ...awsConfig, 
      endpoint: endpoint.value,
      credentials: {
        accessKeyId: accessKeyId.value,
        secretAccessKey: secretAccessKey.value
      }
    }
    
    s3.value = new S3Client(config)
    ses.value = new SESClient(config)
    sns.value = new SNSClient(config)
    sqs.value = new SQSClient(config)
    dynamodb.value = new DynamoDBClient(config)
    lambda.value = new LambdaClient(config)
    kinesis.value = new KinesisClient(config)
    kms.value = new KMSClient(config)
  }

  const setEndpoint = (newEndpoint) => {
    endpoint.value = newEndpoint
    localStorage.setItem('localstack-endpoint', newEndpoint)
    initializeServices()
    checkConnection()
  }

  const checkConnection = async () => {
    try {
      connectionStatus.value = 'connecting'

      // Try to list S3 buckets as a health check
      if (!s3.value) initializeServices()

      if (s3.value) {
        const { ListBucketsCommand } = await import('@aws-sdk/client-s3')
        const command = new ListBucketsCommand({})
        await s3.value.send(command)
        connectionStatus.value = 'connected'
      } else {
        connectionStatus.value = 'disconnected'
      }
    } catch (error) {
      connectionStatus.value = 'disconnected'
      console.error('Connection failed:', error)
    }
  }

  const showSnackbar = (text, color = 'info', timeout = 4000) => {
    snackbar.value = {
      show: true,
      text,
      color,
      timeout
    }
  }

// Initialize services on store creation
  initializeServices()

  return {
    endpoint,
    connectionStatus,
    snackbar,
    s3,
    ses,
    sns,
    sqs,
    dynamodb,
    lambda,
    kinesis,
    kms,
    setEndpoint,
    checkConnection,
    showSnackbar,
    initializeServices
  }
})
