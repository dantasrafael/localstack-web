import { defineStore } from 'pinia'
import { ref } from 'vue'
import AWS from 'aws-sdk'

export const useAppStore = defineStore('app', () => {
  const endpoint = ref(localStorage.getItem('localstack-endpoint') || 'http://localhost:4566')
  const connectionStatus = ref('disconnected')
  const snackbar = ref({
    show: false,
    text: '',
    color: 'info',
    timeout: 4000
  })

  // AWS SDK Configuration
  const awsConfig = {
    region: 'us-east-1',
    accessKeyId: 'test',
    secretAccessKey: 'test',    
    endpoint: endpoint.value,
    s3ForcePathStyle: true,
    sslEnabled: false
  }

  // Initialize AWS services
  const s3 = ref(null)
  const sns = ref(null)
  const sqs = ref(null)
  const dynamodb = ref(null)
  const lambda = ref(null)
  const kinesis = ref(null)
  const kms = ref(null)

  const initializeServices = () => {
    const config = { ...awsConfig, endpoint: endpoint.value }
    
    s3.value = new AWS.S3(config)
    sns.value = new AWS.SNS(config)
    sqs.value = new AWS.SQS(config)
    dynamodb.value = new AWS.DynamoDB(config)
    lambda.value = new AWS.Lambda(config)
    kinesis.value = new AWS.Kinesis(config)
    kms.value = new AWS.KMS(config)
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
      
      await s3.value.listBuckets().promise()
      connectionStatus.value = 'connected'
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
