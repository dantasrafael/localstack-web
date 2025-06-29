<template>
  <div>
    <v-row>
      <v-col cols="12" class="bg-secondary opacity-50">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-view-stream</v-icon>
            <h1 class="text-h5">Kinesis Streams</h1>
          </div>
          <v-btn color="primary" @click="createStreamDialog = true">
            <v-icon class="mr-2">mdi-plus</v-icon>
            Criar Stream
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filter -->
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          label="Buscar streams"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
        >
          <template v-slot:append>
            <v-btn @click="loadStreams" :loading="loading" variant="outlined">
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>
          </template>      
      </v-text-field>
      </v-col>
    </v-row>

    <!-- Streams List -->
    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="stream in filteredStreams" :key="stream.StreamName">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ stream.StreamName }}</span>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" size="small"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="viewStream(stream)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-eye</v-icon>
                    Ver Detalhes
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="putRecord(stream)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-send</v-icon>
                    Enviar Record
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="getRecords(stream)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-download</v-icon>
                    Ler Records
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="deleteStream(stream.StreamName)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-delete</v-icon>
                    Deletar
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-title>
          
          <v-card-text>
            <v-chip size="small" class="mr-2 mb-2" :color="getStatusColor(stream.StreamStatus)">
              {{ stream.StreamStatus }}
            </v-chip>
            <v-chip size="small" class="mr-2 mb-2" color="primary">
              {{ (stream.Shards && stream.Shards.length) || 0 }} shards
            </v-chip>
            <div class="text-caption text-grey mt-2">
              Criado em: {{ formatDate(stream.StreamCreationTimestamp) }}
            </div>
            <div class="text-caption text-grey">
              Retention: {{ stream.RetentionPeriodHours || 24 }} horas
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!loading && streams.length === 0">
      <v-col cols="12" class="text-center">
        <v-icon size="64" color="grey-lighten-1">mdi-stream</v-icon>
        <h3 class="text-h5 mt-4 text-grey">Nenhum stream encontrado</h3>
        <p class="text-grey">Crie seu primeiro stream Kinesis para começar</p>
        <v-btn color="primary" @click="createStreamDialog = true">
          Criar Stream
        </v-btn>
      </v-col>
    </v-row>

    <!-- Create Stream Dialog -->
    <v-dialog v-model="createStreamDialog" max-width="500">
      <v-card>
        <v-card-title>Criar Novo Stream</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newStream.name"
            label="Nome do Stream"
            :rules="streamNameRules"
            class="mb-4"
          ></v-text-field>
          
          <v-text-field
            v-model.number="newStream.shardCount"
            label="Número de Shards"
            type="number"
            min="1"
            max="10"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="createStreamDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="createStream" :loading="creating">Criar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Stream Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Detalhes: {{ currentStream?.StreamName }}</span>
          <v-btn icon @click="detailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text style="height: 500px;" v-if="currentStream">
          <v-row>
            <v-col cols="6">
              <strong>Nome:</strong> {{ currentStream.StreamName }}
            </v-col>
            <v-col cols="6">
              <strong>ARN:</strong> {{ currentStream.StreamARN }}
            </v-col>
            <v-col cols="6">
              <strong>Status:</strong> 
              <v-chip size="small" :color="getStatusColor(currentStream.StreamStatus)">
                {{ currentStream.StreamStatus }}
              </v-chip>
            </v-col>
            <v-col cols="6">
              <strong>Criação:</strong> {{ formatDate(currentStream.StreamCreationTimestamp) }}
            </v-col>
            <v-col cols="6">
              <strong>Retention:</strong> {{ currentStream.RetentionPeriodHours }} horas
            </v-col>
            <v-col cols="6">
              <strong>Encryption:</strong> {{ currentStream.EncryptionType || 'NONE' }}
            </v-col>
          </v-row>
          
          <v-divider class="my-4"></v-divider>
          
          <h4 class="mb-3">Shards</h4>
          <v-data-table
            v-if="currentStream.Shards && currentStream.Shards.length > 0"
            :headers="shardHeaders"
            :items="currentStream.Shards"
            :items-per-page="5"
          >
            <template v-slot:item.HashKeyRange="{ item }">
              {{ item.HashKeyRange.StartingHashKey }} - {{ item.HashKeyRange.EndingHashKey }}
            </template>
          </v-data-table>
          
          <div v-else class="text-center text-grey">
            Nenhum shard encontrado
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Put Record Dialog -->
    <v-dialog v-model="putRecordDialog" max-width="600">
      <v-card>
        <v-card-title>Enviar Record: {{ streamToSend?.StreamName }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="recordData.partitionKey"
            label="Partition Key"
            :rules="[v => !!v || 'Partition Key é obrigatória']"
            class="mb-4"
          ></v-text-field>
          
          <v-textarea
            v-model="recordData.data"
            label="Dados (JSON ou texto)"
            rows="6"
            variant="outlined"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="putRecordDialog = false">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="sendRecord" 
            :loading="sending"
            :disabled="!recordData.partitionKey || !recordData.data"
          >
            Enviar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Records Dialog -->
    <v-dialog v-model="recordsDialog" max-width="900" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Records: {{ streamToRead?.StreamName }}</span>
          <div>
            <v-btn 
              color="primary" 
              variant="outlined" 
              class="mr-2"
              @click="readRecords"
              :loading="reading"
            >
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>
            <v-btn icon @click="recordsDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>
        
        <v-card-text style="height: 500px;">
          <v-expansion-panels v-if="records.length > 0">
            <v-expansion-panel
              v-for="(record, index) in records"
              :key="record.SequenceNumber"
            >
              <v-expansion-panel-title>
                <div class="d-flex justify-space-between align-center w-100">
                  <span>Record {{ index + 1 }}</span>
                  <v-chip size="small" color="info">
                    {{ formatDate(record.ApproximateArrivalTimestamp) }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="mb-2">
                  <strong>Sequence Number:</strong> {{ record.SequenceNumber }}
                </div>
                <div class="mb-2">
                  <strong>Partition Key:</strong> {{ record.PartitionKey }}
                </div>
                <div class="mb-3">
                  <strong>Data:</strong>
                </div>
                <v-card variant="outlined" class="pa-3">
                  <pre class="text-body-2">{{ decodeData(record.Data) }}</pre>
                </v-card>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
          
          <div v-else class="text-center text-grey mt-8">
            <v-icon size="48">mdi-database-outline</v-icon>
            <p class="mt-2">Nenhum record disponível</p>
            <v-btn @click="readRecords" :loading="reading">
              Verificar Records
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { storeToRefs } from 'pinia'
import { 
  ListStreamsCommand, 
  DescribeStreamCommand, 
  CreateStreamCommand, 
  DeleteStreamCommand, 
  PutRecordCommand, 
  GetShardIteratorCommand, 
  GetRecordsCommand 
} from '@aws-sdk/client-kinesis'
import { formatDate } from '../utils/formatDate.js'

const appStore = useAppStore()
const { kinesis } = storeToRefs(appStore)

const streams = ref([])
const loading = ref(false)
const searchQuery = ref('')
const createStreamDialog = ref(false)
const creating = ref(false)
const detailsDialog = ref(false)
const currentStream = ref(null)
const putRecordDialog = ref(false)
const streamToSend = ref(null)
const recordsDialog = ref(false)
const streamToRead = ref(null)
const records = ref([])
const reading = ref(false)
const sending = ref(false)

const newStream = ref({
  name: '',
  shardCount: 1
})

const recordData = ref({
  partitionKey: '',
  data: ''
})

const streamNameRules = [
  v => !!v || 'Nome é obrigatório',
  v => /^[a-zA-Z0-9_.-]+$/.test(v) || 'Nome deve conter apenas letras, números, _, . e -',
  v => v.length >= 1 || 'Nome deve ter pelo menos 1 caractere',
  v => v.length <= 128 || 'Nome deve ter no máximo 128 caracteres'
]

const shardHeaders = [
  { title: 'Shard ID', key: 'ShardId' },
  { title: 'Hash Key Range', key: 'HashKeyRange' },
  { title: 'Sequence Number Range', key: 'SequenceNumberRange.StartingSequenceNumber' }
]

const filteredStreams = computed(() => {
  if (!searchQuery.value) return streams.value
  return streams.value.filter(stream => 
    stream.StreamName.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const loadStreams = async () => {
  loading.value = true
  try {
    const response = await kinesis.value.send(new ListStreamsCommand({}))
    
    if (response.StreamNames && response.StreamNames.length > 0) {
      streams.value = await Promise.all(
        response.StreamNames.map(async (streamName) => {
          try {
            const description = await kinesis.value.send(new DescribeStreamCommand({ StreamName: streamName }))
            return description.StreamDescription
          } catch (error) {
            console.error(`Error describing stream ${streamName}:`, error)
            return { StreamName: streamName, StreamStatus: 'ERROR' }
          }
        })
      )
    } else {
      streams.value = []
    }
  } catch (error) {
    console.error('Error loading streams:', error)
    appStore.showSnackbar('Erro ao carregar streams', 'error')
  } finally {
    loading.value = false
  }
}

const createStream = async () => {
  if (!newStream.value.name) return
  
  creating.value = true
  try {
    await kinesis.value.send(new CreateStreamCommand({
      StreamName: newStream.value.name,
      ShardCount: newStream.value.shardCount
    }))
    
    appStore.showSnackbar(`Stream "${newStream.value.name}" criado com sucesso!`, 'success')
    
    createStreamDialog.value = false
    newStream.value = { name: '', shardCount: 1 }
    
    await loadStreams()
  } catch (error) {
    console.error('Error creating stream:', error)
    appStore.showSnackbar('Erro ao criar stream', 'error')
  } finally {
    creating.value = false
  }
}

const deleteStream = async (streamName) => {
  if (!confirm(`Deseja realmente deletar o stream "${streamName}"?`)) return
  
  try {
    await kinesis.value.send(new DeleteStreamCommand({ StreamName: streamName }))
    appStore.showSnackbar(`Stream "${streamName}" deletado com sucesso!`, 'success')
    await loadStreams()
  } catch (error) {
    console.error('Error deleting stream:', error)
    appStore.showSnackbar('Erro ao deletar stream', 'error')
  }
}

const viewStream = async (stream) => {
  try {
    const response = await kinesis.value.send(new DescribeStreamCommand({ StreamName: stream.StreamName }))
    currentStream.value = response.StreamDescription
    detailsDialog.value = true
  } catch (error) {
    console.error('Error getting stream details:', error)
    appStore.showSnackbar('Erro ao carregar detalhes do stream', 'error')
  }
}

const putRecord = (stream) => {
  streamToSend.value = stream
  recordData.value = {
    partitionKey: 'test-partition',
    data: JSON.stringify({ message: 'Hello Kinesis!', timestamp: new Date().toISOString() }, null, 2)
  }
  putRecordDialog.value = true
}

const sendRecord = async () => {
  if (!streamToSend.value || !recordData.value.partitionKey || !recordData.value.data) return
  
  sending.value = true
  try {
    await kinesis.value.send(new PutRecordCommand({
      StreamName: streamToSend.value.StreamName,
      PartitionKey: recordData.value.partitionKey,
      Data: recordData.value.data
    }))
    
    appStore.showSnackbar('Record enviado com sucesso!', 'success')
    putRecordDialog.value = false
    recordData.value = { partitionKey: '', data: '' }
  } catch (error) {
    console.error('Error sending record:', error)
    appStore.showSnackbar('Erro ao enviar record', 'error')
  } finally {
    sending.value = false
  }
}

const getRecords = async (stream) => {
  streamToRead.value = stream
  recordsDialog.value = true
  await readRecords()
}

const readRecords = async () => {
  if (!streamToRead.value) return
  
  reading.value = true
  try {
    // First, get shards
    const streamDesc = await kinesis.value.send(new DescribeStreamCommand({ 
      StreamName: streamToRead.value.StreamName 
    }))
    
    if (!streamDesc.StreamDescription.Shards || streamDesc.StreamDescription.Shards.length === 0) {
      records.value = []
      return
    }
    
    // Get shard iterator for the first shard
    const shardId = streamDesc.StreamDescription.Shards[0].ShardId
    const iteratorResponse = await kinesis.value.send(new GetShardIteratorCommand({
      StreamName: streamToRead.value.StreamName,
      ShardId: shardId,
      ShardIteratorType: 'TRIM_HORIZON'
    }))
    
    // Get records
    const recordsResponse = await kinesis.value.send(new GetRecordsCommand({
      ShardIterator: iteratorResponse.ShardIterator,
      Limit: 100
    }))
    
    records.value = recordsResponse.Records || []
  } catch (error) {
    console.error('Error reading records:', error)
    appStore.showSnackbar('Erro ao ler records', 'error')
  } finally {
    reading.value = false
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'ACTIVE': return 'success'
    case 'CREATING': return 'warning'
    case 'DELETING': return 'error'
    case 'UPDATING': return 'info'
    default: return 'grey'
  }
}

const decodeData = (data) => {
  try {
    // Try to decode as UTF-8 string
    const decoded = new TextDecoder().decode(data)
    // Try to parse as JSON for better formatting
    try {
      const parsed = JSON.parse(decoded)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return decoded
    }
  } catch {
    return data.toString()
  }
}

onMounted(() => {
  loadStreams()
})
</script>
