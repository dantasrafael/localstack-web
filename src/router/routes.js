import Dashboard from '@/views/Dashboard.vue'
import S3View from '@/views/S3View.vue'
import SQSView from '@/views/SQSView.vue'
import DynamoDBView from '@/views/DynamoDBView.vue'
import LambdaView from '@/views/LambdaView.vue'
import KinesisView from '@/views/KinesisView.vue'
import SNSView from '@/views/SNSView.vue'
import KMSView from '@/views/KMSView.vue'
import AboutView from '@/views/AboutView.vue'
import SESView from '@/views/SESView.vue'

export default [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/s3',
    name: 'S3',
    component: S3View
  },
  {
    path: '/ses',
    name: 'SES',
    component: SESView
  },
  {
    path: '/sqs',
    name: 'SQS',
    component: SQSView
  },
  {
    path: '/dynamodb',
    name: 'DynamoDB',
    component: DynamoDBView
  },
  {
    path: '/lambda',
    name: 'Lambda',
    component: LambdaView
  },
  {
    path: '/kinesis',
    name: 'Kinesis',
    component: KinesisView
  },
  {
    path: '/sns',
    name: 'SNS',
    component: SNSView
  },
  {
    path: '/kms',
    name: 'KMS',
    component: KMSView
  },
  {
    path: '/about',
    name: 'About',
    component: AboutView
  }
]
