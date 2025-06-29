<template>
  <div>
    <v-row>
      <v-col cols="12" class="bg-secondary opacity-50">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-view-dashboard</v-icon>
          <h1 class="text-h5">Dashboard</h1>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="service in services" :key="service.name">
        <v-card
          :color="service.status === 'active' ? 'primary' : 'grey-lighten-2'"
          :variant="service.status === 'active' ? 'elevated' : 'outlined'"
          class="pa-4"
          height="150"
          @click="service.status === 'active' ? navigateToService(service.route): null"
          style="cursor: pointer"
        >
          <div class="d-flex align-center mb-3">
            <v-icon 
              :color="service.status === 'active' ? 'white' : 'grey'" 
              size="x-large" 
              class="mr-3"
            >
              {{ service.icon }}
            </v-icon>
            <div>
              <h3 :class="service.status === 'active' ? 'text-white' : 'text-grey'">
                {{ service.name }}
              </h3>
              <v-chip 
                :color="service.status === 'active' ? 'success' : 'warning'"
                size="small"
                variant="elevated"
              >
                {{ service.status === 'active' ? 'Ativo' : 'Inativo' }}
              </v-chip>
            </div>
          </div>
          
          <div v-if="service.status === 'active'" class="text-white">
            <div v-if="service.stats">
              <div v-for="(value, key) in service.stats" :key="key" class="mb-1">
                <strong>{{ key }}:</strong> {{ value }}
              </div>
            </div>
            <div v-else class="text-caption">
              Carregando estatísticas...
            </div>
          </div>
          
          <div v-else class="text-grey">
            <p class="text-caption mb-0">Serviço não disponível ou sem recursos</p>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-cog</v-icon>
            Ações Rápidas
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6" lg="3" v-for="action in quickActions" :key="action.title">
                <v-btn
                  :color="action.color"
                  variant="outlined"
                  block
                  size="large"
                  class="mb-2"
                  @click="executeQuickAction(action)"
                  :loading="action.loading"
                >
                  <v-icon class="mr-2">{{ action.icon }}</v-icon>
                  {{ action.title }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmDialog.show" max-width="400">
      <v-card>
        <v-card-title class="text-h5">
          {{ confirmDialog.title }}
        </v-card-title>
        <v-card-text>
          {{ confirmDialog.text }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="confirmDialog.show = false">Cancelar</v-btn>
          <v-btn 
            :color="confirmDialog.color" 
            @click="confirmDialog.confirm"
            :loading="confirmDialog.loading"
          >
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { storeToRefs } from 'pinia'

// AWS SDK v3 Commands
import { ListTablesCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb'
import { ListStreamsCommand } from '@aws-sdk/client-kinesis'
import { ListKeysCommand } from '@aws-sdk/client-kms'
import { ListFunctionsCommand } from '@aws-sdk/client-lambda'
import { ListBucketsCommand, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand } from '@aws-sdk/client-s3'
import { ListTopicsCommand } from '@aws-sdk/client-sns'
import { ListQueuesCommand, DeleteQueueCommand } from '@aws-sdk/client-sqs'
import { ListIdentitiesCommand } from '@aws-sdk/client-ses'
import { deleteSesMessage, getSesData } from '@/utils/api.js'

const router = useRouter()
const appStore = useAppStore()
const { s3, ses, sns, sqs, dynamodb, lambda, kinesis, kms } = storeToRefs(appStore)

const services = ref([
  {
    name: 'DynamoDB',
    icon: 'mdi-table',
    route: '/dynamodb',
    status: 'inactive',
    stats: null
  },
  {
    name: 'Kinesis',
    icon: 'mdi-view-stream',
    route: '/kinesis',
    status: 'inactive',
    stats: null
  },
  {
    name: 'KMS',
    icon: 'mdi-key',
    route: '/kms',
    status: 'inactive',
    stats: null
  },
  {
    name: 'Lambda',
    icon: 'mdi-function',
    route: '/lambda',
    status: 'inactive',
    stats: null
  },
  {
    name: 'S3',
    icon: 'mdi-folder-multiple',
    route: '/s3',
    status: 'inactive',
    stats: null
  },
  {
    name: 'SES',
    icon: 'mdi-email',
    route: '/ses',
    status: 'inactive',
    stats: null
  },
  {
    name: 'SNS',
    icon: 'mdi-forum',
    route: '/sns',
    status: 'inactive',
    stats: null
  },
  {
    name: 'SQS',
    icon: 'mdi-format-list-bulleted',
    route: '/sqs',
    status: 'inactive',
    stats: null
  },
])

const quickActions = ref([
  {
    title: 'Limpar S3',
    icon: 'mdi-delete-sweep',
    color: 'error',
    action: 'clearS3',
    loading: false
  },
  {
    title: 'Limpar SQS',
    icon: 'mdi-broom',
    color: 'warning',
    action: 'clearSQS',
    loading: false
  },
  {
    title: 'Limpar DynamoDB',
    icon: 'mdi-table-remove',
    color: 'orange',
    action: 'clearDynamoDB',
    loading: false
  },
  {
    title: 'Limpar SES',
    icon: 'mdi-email-remove',
    color: 'error',
    action: 'clearSES',
    loading: false
  },
  {
    title: 'Atualizar Status',
    icon: 'mdi-refresh',
    color: 'primary',
    action: 'refreshStatus',
    loading: false
  }
])

const confirmDialog = ref({
  show: false,
  title: '',
  text: '',
  color: 'primary',
  confirm: null,
  loading: false
})

const navigateToService = (route) => {
  router.push(route)
}

const loadServiceStats = async () => {
  try {
    // DynamoDB Stats
    try {
      const dynamoTables = await dynamodb.value.send(new ListTablesCommand({}))
      services.value[0].status = 'active'
      services.value[0].stats = {
        'Tabelas': dynamoTables.TableNames ? dynamoTables.TableNames.length : 0
      }
    } catch (error) {
      console.error('DynamoDB error:', error)
      services.value[0].status = 'inactive'
    }

    // Kinesis Stats
    try {
      const kinesisStreams = await kinesis.value.send(new ListStreamsCommand({}))
      services.value[1].status = 'active'
      services.value[1].stats = {
        'Streams': kinesisStreams.StreamNames ? kinesisStreams.StreamNames.length : 0
      }
    } catch (error) {
      console.error('Kinesis error:', error)
      services.value[1].status = 'inactive'
    }

    // KMS Stats
    try {
      const kmsKeys = await kms.value.send(new ListKeysCommand({}))
      services.value[2].status = 'active'
      services.value[2].stats = {
        'Chaves': kmsKeys.Keys ? kmsKeys.Keys.length : 0
      }
    } catch (error) {
      console.error('KMS error:', error)
      services.value[2].status = 'inactive'
    }

    // Lambda Stats
    try {
      const lambdaFunctions = await lambda.value.send(new ListFunctionsCommand({}))
      services.value[3].status = 'active'
      services.value[3].stats = {
        'Funções': lambdaFunctions.Functions ? lambdaFunctions.Functions.length : 0
      }
    } catch (error) {
      console.error('Lambda error:', error)
      services.value[3].status = 'inactive'
    }

    // S3 Stats
    try {
      const s3Buckets = await s3.value.send(new ListBucketsCommand({}))
      services.value[4].status = 'active'
      services.value[4].stats = {
        'Buckets': s3Buckets.Buckets ? s3Buckets.Buckets.length : 0
      }
    } catch (error) {
      console.error('S3 error:', error)
      services.value[4].status = 'inactive'
    }

    // SES Stats
    try {
      const sesIdentities = await ses.value.send(new ListIdentitiesCommand({ IdentityType: 'EmailAddress' }))
      const sesData = await getSesData();
      services.value[5].status = 'active'
      services.value[5].stats = {
        'E-mails': sesData.messages ? sesData.messages.length : 0,
        'Identidades': sesIdentities.Identities ? sesIdentities.Identities.length : 0
      }
    } catch (error) {
      console.error('SES error:', error)
      services.value[5].status = 'inactive'
    }

    // SNS Stats
    try {
      const snsTopics = await sns.value.send(new ListTopicsCommand({}))
      services.value[6].status = 'active'
      services.value[6].stats = {
        'Tópicos': snsTopics.Topics ? snsTopics.Topics.length : 0
      }
    } catch (error) {
      console.error('SNS error:', error)
      services.value[6].status = 'inactive'
    }

    // SQS Stats
    try {
      const sqsQueues = await sqs.value.send(new ListQueuesCommand({}))
      services.value[7].status = 'active'
      services.value[7].stats = {
        'Filas': sqsQueues.QueueUrls ? sqsQueues.QueueUrls.length : 0
      }
    } catch (error) {
      console.error('SQS error:', error)
      services.value[7].status = 'inactive'
    }

  } catch (error) {
    console.error('Error loading service stats:', error)
    appStore.showSnackbar('Erro ao carregar estatísticas dos serviços', 'error')
  }
}

const executeQuickAction = (action) => {
  if (action.action === 'refreshStatus') {
    action.loading = true
    loadServiceStats().finally(() => {
      action.loading = false
      appStore.showSnackbar('Status atualizado!', 'success')
    })
    return
  }

  // For destructive actions, show confirmation
  let title, text, color
  
  switch (action.action) {
    case 'clearS3':
      title = 'Limpar todos os buckets S3'
      text = 'Esta ação irá deletar todos os buckets e objetos S3. Deseja continuar?'
      color = 'error'
      break
    case 'clearSQS':
      title = 'Limpar todas as filas SQS'
      text = 'Esta ação irá deletar todas as filas SQS. Deseja continuar?'
      color = 'warning'
      break
    case 'clearSES':
      title = 'Limpar todos os emails SES'
      text = 'Esta ação irá deletar todos os emails do SES. Deseja continuar?'
      color = 'error'
      break
    case 'clearDynamoDB':
      title = 'Limpar todas as tabelas DynamoDB'
      text = 'Esta ação irá deletar todas as tabelas DynamoDB. Deseja continuar?'
      color = 'orange'
      break
  }

  confirmDialog.value = {
    show: true,
    title,
    text,
    color,
    confirm: () => performClearAction(action),
    loading: false
  }
}

const performClearAction = async (action) => {
  confirmDialog.value.loading = true
  action.loading = true

  try {
    switch (action.action) {
      case 'clearS3':
        await clearAllS3Buckets()
        break
      case 'clearSQS':
        await clearAllSQSQueues()
        break
      case 'clearSES':
        await clearAllSESData()
        break
      case 'clearDynamoDB':
        await clearAllDynamoDBTables()
        break
    }
    
    appStore.showSnackbar(`${action.title} executado com sucesso!`, 'success')
    await loadServiceStats()
  } catch (error) {
    console.error(`Error in ${action.action}:`, error)
    appStore.showSnackbar(`Erro ao executar ${action.title}`, 'error')
  } finally {
    confirmDialog.value.show = false
    confirmDialog.value.loading = false
    action.loading = false
  }
}

const clearAllS3Buckets = async () => {
  const buckets = await s3.value.send(new ListBucketsCommand({}))
  
  for (const bucket of buckets.Buckets) {
    // First, delete all objects in the bucket
    const objects = await s3.value.send(new ListObjectsV2Command({ Bucket: bucket.Name }))
    
    if (objects.Contents && objects.Contents.length > 0) {
      const deleteParams = {
        Bucket: bucket.Name,
        Delete: {
          Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
        }
      }
      await s3.value.send(new DeleteObjectsCommand(deleteParams))
    }
    
    // Then delete the bucket
    await s3.value.send(new DeleteBucketCommand({ Bucket: bucket.Name }))
  }
}

const clearAllSQSQueues = async () => {
  const queues = await sqs.value.send(new ListQueuesCommand({}))
  
  if (queues.QueueUrls) {
    for (const queueUrl of queues.QueueUrls) {
      await sqs.value.send(new DeleteQueueCommand({ QueueUrl: queueUrl }))
    }
  }
}

const clearAllSESData = async () => {
  await deleteSesMessage()
}

const clearAllDynamoDBTables = async () => {
  const tables = await dynamodb.value.send(new ListTablesCommand({}))
  
  for (const tableName of tables.TableNames) {
    await dynamodb.value.send(new DeleteTableCommand({ TableName: tableName }))
  }
}

onMounted(() => {
  loadServiceStats()
})
</script>

<style scoped>
.v-card {
  transition: transform 0.2s ease-in-out;
}

.v-card:hover {
  transform: translateY(-4px);
}
</style>
