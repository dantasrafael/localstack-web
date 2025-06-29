<template>
  <div>
    <v-row>
      <v-col cols="12" class="bg-secondary opacity-50">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
            <h1 class="text-h5">SQS Queues</h1>
          </div>          
          <v-btn color="primary" @click="createQueueDialog = true">
            <v-icon class="mr-2">mdi-plus</v-icon>
            Criar Fila
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filter -->
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          label="Buscar filas"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
        >
          <template v-slot:append>
            <v-btn @click="loadQueues" :loading="loading" variant="outlined">
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>            
          </template>      
      </v-text-field>
      </v-col>
    </v-row>

    <!-- Queues List -->
    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="queue in filteredQueues" :key="queue.url">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ queue.name }}</span>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" size="small"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="openQueue(queue)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-eye</v-icon>
                    Ver Mensagens
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="sendMessageDialog = true; currentQueue = queue">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-send</v-icon>
                    Enviar Mensagem
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="purgeQueue(queue)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-broom</v-icon>
                    Limpar Fila
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="deleteQueue(queue)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-delete</v-icon>
                    Deletar
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-title>
          
          <v-card-text>
            <v-chip size="small" class="mr-2 mb-2" color="primary">
              <v-icon class="mr-1" size="small">mdi-message</v-icon>
              {{ queue.attributes.ApproximateNumberOfMessages || 0 }} disponíveis
            </v-chip>
            <v-chip size="small" class="mr-2 mb-2" color="warning">
              <v-icon class="mr-1" size="small">mdi-clock</v-icon>
              {{ queue.attributes.ApproximateNumberOfMessagesNotVisible || 0 }} em processamento
            </v-chip>
            <div class="text-caption text-grey mt-2">
              Delay: {{ queue.attributes.DelaySeconds || 0 }}s • 
              Visibility: {{ queue.attributes.VisibilityTimeoutSeconds || 30 }}s
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!loading && queues.length === 0">
      <v-col cols="12" class="text-center">
        <v-icon size="64" color="grey-lighten-1">mdi-format-list-bulleted</v-icon>
        <h3 class="text-h5 mt-4 text-grey">Nenhuma fila encontrada</h3>
        <p class="text-grey">Crie sua primeira fila SQS para começar</p>
        <v-btn color="primary" @click="createQueueDialog = true">
          Criar Fila
        </v-btn>
      </v-col>
    </v-row>

    <!-- Create Queue Dialog -->
    <v-dialog v-model="createQueueDialog" max-width="600">
      <v-card>
        <v-card-title>Criar Nova Fila</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newQueue.name"
            label="Nome da Fila"
            :rules="queueNameRules"
            class="mb-4"
          ></v-text-field>
          
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="newQueue.delaySeconds"
                label="Delay (segundos)"
                type="number"
                min="0"
                max="900"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="newQueue.visibilityTimeout"
                label="Visibility Timeout (segundos)"
                type="number"
                min="0"
                max="43200"
              ></v-text-field>
            </v-col>
          </v-row>
          
          <v-text-field
            v-model.number="newQueue.messageRetentionPeriod"
            label="Message Retention Period (segundos)"
            type="number"
            min="60"
            max="1209600"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="createQueueDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="createQueue" :loading="creating">Criar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Queue Messages Dialog -->
    <v-dialog v-model="messagesDialog" max-width="900" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Mensagens: {{ currentQueue?.name }}</span>
          <div>
            <v-btn 
              color="primary" 
              variant="outlined" 
              class="mr-2"
              @click="receiveMessages"
              :loading="receivingMessages"
            >
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Receber Mensagens
            </v-btn>
            <v-btn icon @click="messagesDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>
        
        <v-card-text style="height: 500px;">
          <v-expansion-panels v-if="messages.length > 0">
            <v-expansion-panel
              v-for="(message, index) in messages"
              :key="message.MessageId"
            >
              <v-expansion-panel-title>
                <div class="d-flex justify-space-between align-center w-100">
                  <span>Mensagem {{ index + 1 }}</span>
                  <v-chip size="small" color="info">
                    {{ parseAndFormatDate(message.Attributes?.SentTimestamp) }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="mb-2">
                  <strong>Message ID:</strong> {{ message.MessageId }}
                </div>
                <div class="mb-2">
                  <strong>Receipt Handle:</strong> 
                  <code class="text-caption">{{ message.ReceiptHandle }}</code>
                </div>
                <div class="mb-3">
                  <strong>Body:</strong>
                </div>
                <v-card variant="outlined" class="pa-3 mb-3">
                  <pre class="text-body-2">{{ message.Body }}</pre>
                </v-card>
                <v-btn 
                  color="error" 
                  size="small" 
                  @click="deleteMessage(message)"
                >
                  <v-icon class="mr-2">mdi-delete</v-icon>
                  Deletar Mensagem
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
          
          <div v-else class="text-center text-grey mt-8">
            <v-icon size="48">mdi-message-outline</v-icon>
            <p class="mt-2">Nenhuma mensagem disponível</p>
            <v-btn @click="receiveMessages" :loading="receivingMessages">
              Verificar Mensagens
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Send Message Dialog -->
    <v-dialog v-model="sendMessageDialog" max-width="600">
      <v-card>
        <v-card-title>Enviar Mensagem</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="newMessage.body"
            label="Corpo da Mensagem"
            rows="6"
            variant="outlined"
          ></v-textarea>
          
          <v-text-field
            v-model.number="newMessage.delaySeconds"
            label="Delay (segundos)"
            type="number"
            min="0"
            max="900"
            class="mt-3"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="sendMessageDialog = false">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="sendMessage" 
            :loading="sending"
            :disabled="!newMessage.body"
          >
            Enviar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { storeToRefs } from 'pinia'
import { 
  ListQueuesCommand, 
  GetQueueAttributesCommand, 
  CreateQueueCommand, 
  DeleteQueueCommand, 
  PurgeQueueCommand, 
  ReceiveMessageCommand, 
  SendMessageCommand, 
  DeleteMessageCommand 
} from '@aws-sdk/client-sqs'
import { formatDate } from '@/utils/formatDate.js'

const appStore = useAppStore()
const { sqs } = storeToRefs(appStore)

const queues = ref([])
const loading = ref(false)
const searchQuery = ref('')
const createQueueDialog = ref(false)
const creating = ref(false)
const messagesDialog = ref(false)
const sendMessageDialog = ref(false)
const currentQueue = ref(null)
const messages = ref([])
const receivingMessages = ref(false)
const sending = ref(false)

const newQueue = ref({
  name: '',
  delaySeconds: 0,
  visibilityTimeout: 30,
  messageRetentionPeriod: 345600
})

const newMessage = ref({
  body: '',
  delaySeconds: 0
})

const queueNameRules = [
  v => !!v || 'Nome é obrigatório',
  v => /^[a-zA-Z0-9_-]+$/.test(v) || 'Nome deve conter apenas letras, números, _ e -',
  v => v.length >= 1 || 'Nome deve ter pelo menos 1 caractere',
  v => v.length <= 80 || 'Nome deve ter no máximo 80 caracteres'
]

const filteredQueues = computed(() => {
  if (!searchQuery.value) return queues.value
  return queues.value.filter(queue => 
    queue.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const loadQueues = async () => {
  loading.value = true
  try {
    const response = await sqs.value.send(new ListQueuesCommand({}))
    
    if (response.QueueUrls) {
      queues.value = await Promise.all(
        response.QueueUrls.map(async (url) => {
          const attributes = await sqs.value.send(new GetQueueAttributesCommand({
            QueueUrl: url,
            AttributeNames: ['All']
          }))
          
          return {
            url,
            name: url.split('/').pop(),
            attributes: attributes.Attributes
          }
        })
      )
    } else {
      queues.value = []
    }
  } catch (error) {
    console.error('Error loading queues:', error)
    appStore.showSnackbar('Erro ao carregar filas', 'error')
  } finally {
    loading.value = false
  }
}

const createQueue = async () => {
  if (!newQueue.value.name) return
  
  creating.value = true
  try {
    const params = {
      QueueName: newQueue.value.name,
      Attributes: {
        DelaySeconds: newQueue.value.delaySeconds.toString(),
        VisibilityTimeoutSeconds: newQueue.value.visibilityTimeout.toString(),
        MessageRetentionPeriod: newQueue.value.messageRetentionPeriod.toString()
      }
    }
    
    await sqs.value.send(new CreateQueueCommand(params))
    appStore.showSnackbar(`Fila "${newQueue.value.name}" criada com sucesso!`, 'success')
    
    createQueueDialog.value = false
    newQueue.value = {
      name: '',
      delaySeconds: 0,
      visibilityTimeout: 30,
      messageRetentionPeriod: 345600
    }
    
    await loadQueues()
  } catch (error) {
    console.error('Error creating queue:', error)
    appStore.showSnackbar('Erro ao criar fila', 'error')
  } finally {
    creating.value = false
  }
}

const deleteQueue = async (queue) => {
  if (!confirm(`Deseja realmente deletar a fila "${queue.name}"?`)) return
  
  try {
    await sqs.value.send(new DeleteQueueCommand({ QueueUrl: queue.url }))
    appStore.showSnackbar(`Fila "${queue.name}" deletada com sucesso!`, 'success')
    await loadQueues()
  } catch (error) {
    console.error('Error deleting queue:', error)
    appStore.showSnackbar('Erro ao deletar fila', 'error')
  }
}

const purgeQueue = async (queue) => {
  if (!confirm(`Deseja realmente limpar todas as mensagens da fila "${queue.name}"?`)) return
  
  try {
    await sqs.value.send(new PurgeQueueCommand({ QueueUrl: queue.url }))
    appStore.showSnackbar(`Fila "${queue.name}" limpa com sucesso!`, 'success')
    await loadQueues()
  } catch (error) {
    console.error('Error purging queue:', error)
    appStore.showSnackbar('Erro ao limpar fila', 'error')
  }
}

const openQueue = async (queue) => {
  currentQueue.value = queue
  messagesDialog.value = true
  await receiveMessages()
}

const receiveMessages = async () => {
  if (!currentQueue.value) return
  
  receivingMessages.value = true
  try {
    const params = {
      QueueUrl: currentQueue.value.url,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
      AttributeNames: ['All']
    }
    
    const response = await sqs.value.send(new ReceiveMessageCommand(params))
    messages.value = response.Messages || []
  } catch (error) {
    console.error('Error receiving messages:', error)
    appStore.showSnackbar('Erro ao receber mensagens', 'error')
  } finally {
    receivingMessages.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.body || !currentQueue.value) return
  
  sending.value = true
  try {
    const params = {
      QueueUrl: currentQueue.value.url,
      MessageBody: newMessage.value.body,
      DelaySeconds: newMessage.value.delaySeconds
    }
    
    await sqs.value.send(new SendMessageCommand(params))
    appStore.showSnackbar('Mensagem enviada com sucesso!', 'success')
    
    sendMessageDialog.value = false
    newMessage.value = { body: '', delaySeconds: 0 }
    
    await loadQueues()
    await receiveMessages()
  } catch (error) {
    console.error('Error sending message:', error)
    appStore.showSnackbar('Erro ao enviar mensagem', 'error')
  } finally {
    sending.value = false
  }
}

const deleteMessage = async (message) => {
  if (!confirm('Deseja realmente deletar esta mensagem?')) return
  
  try {
    await sqs.value.send(new DeleteMessageCommand({
      QueueUrl: currentQueue.value.url,
      ReceiptHandle: message.ReceiptHandle
    }))
    
    appStore.showSnackbar('Mensagem deletada com sucesso!', 'success')
    await receiveMessages()
    await loadQueues()
  } catch (error) {
    console.error('Error deleting message:', error)
    appStore.showSnackbar('Erro ao deletar mensagem', 'error')
  }
}

const parseAndFormatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  return formatDate(parseInt(timestamp))
}

onMounted(() => {
  loadQueues()
})
</script>
