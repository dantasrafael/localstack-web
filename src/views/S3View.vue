<template>
  <div>
    <v-row>
      <v-col cols="12" class="bg-secondary opacity-50">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-folder-multiple</v-icon>
            <h1 class="text-h5">Buckets S3</h1>
          </div>
          <v-btn color="primary" @click="createBucketDialog = true">
            <v-icon class="mr-2">mdi-plus</v-icon>
            Criar Bucket
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filter -->
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          class="mr-4"
          label="Buscar buckets"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
        >
          <template v-slot:append>
            <v-btn @click="loadBuckets" :loading="loading" variant="outlined">
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>            
          </template>
      </v-text-field>
      </v-col>
    </v-row>

    <!-- Buckets List -->
    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="bucket in filteredBuckets" :key="bucket.Name">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ bucket.Name }}</span>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" size="small"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="openBucket(bucket.Name)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-folder-open</v-icon>
                    Abrir
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="deleteBucket(bucket.Name)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-delete</v-icon>
                    Deletar
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-title>
          
          <v-card-text>
            <div class="text-caption text-grey">
              Criado em: {{ formatDate(bucket.CreationDate) }}
            </div>
            <div v-if="bucket.stats" class="mt-2">
              <v-chip size="small" class="mr-2">
                <v-icon class="mr-1" size="small">mdi-file</v-icon>
                {{ bucket.stats.objectCount }} objetos
              </v-chip>
              <v-chip size="small">
                <v-icon class="mr-1" size="small">mdi-harddisk</v-icon>
                {{ formatBytes(bucket.stats.totalSize) }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!loading && buckets.length === 0">
      <v-col cols="12" class="text-center">
        <v-icon size="64" color="grey-lighten-1">mdi-folder-open-outline</v-icon>
        <h3 class="text-h5 mt-4 text-grey">Nenhum bucket encontrado</h3>
        <p class="text-grey">Crie seu primeiro bucket S3 para começar</p>
        <v-btn color="primary" @click="createBucketDialog = true">
          Criar Bucket
        </v-btn>
      </v-col>
    </v-row>

    <!-- Create Bucket Dialog -->
    <v-dialog v-model="createBucketDialog" max-width="500">
      <v-card>
        <v-card-title>Criar Novo Bucket</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newBucketName"
            label="Nome do Bucket"
            :rules="bucketNameRules"
            @keyup.enter="createBucket"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="createBucketDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="createBucket" :loading="creating">Criar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bucket Contents Dialog -->
    <v-dialog v-model="bucketContentsDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Conteúdo do Bucket: {{ currentBucket }}</span>
          <div>
            <v-btn 
              color="primary" 
              variant="outlined" 
              class="mr-2"
              @click="uploadDialog = true"
            >
              <v-icon class="mr-2">mdi-upload</v-icon>
              Upload
            </v-btn>
            <v-btn icon @click="bucketContentsDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>
        
        <v-card-text style="height: 400px;">
          <v-list v-if="bucketObjects.length > 0">
            <v-list-item
              v-for="object in bucketObjects"
              :key="object.Key"
              class="mb-2"
            >
              <template v-slot:prepend>
                <v-icon>mdi-file</v-icon>
              </template>
              <v-list-item-title>{{ object.Key }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ formatBytes(object.Size) }} • {{ formatDate(object.LastModified) }}
              </v-list-item-subtitle>
              <template v-slot:append>
                <v-btn 
                  icon 
                  size="small" 
                  @click="deleteObject(currentBucket, object.Key)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
          
          <div v-else class="text-center text-grey mt-8">
            <v-icon size="48">mdi-folder-open-outline</v-icon>
            <p class="mt-2">Bucket vazio</p>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Upload Dialog -->
    <v-dialog v-model="uploadDialog" max-width="500">
      <v-card>
        <v-card-title>Upload de Arquivo</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="fileToUpload"
            label="Selecionar arquivo"
            prepend-icon="mdi-paperclip"
            show-size
          ></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="uploadDialog = false">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="uploadFile" 
            :loading="uploading"
            :disabled="!fileToUpload"
          >
            Upload
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
  ListBucketsCommand, 
  ListObjectsV2Command, 
  CreateBucketCommand, 
  DeleteBucketCommand, 
  DeleteObjectsCommand, 
  DeleteObjectCommand, 
  PutObjectCommand 
} from '@aws-sdk/client-s3'
import { formatDate } from '../utils/formatDate.js'

const appStore = useAppStore()
const { s3 } = storeToRefs(appStore)

const buckets = ref([])
const loading = ref(false)
const searchQuery = ref('')
const createBucketDialog = ref(false)
const newBucketName = ref('')
const creating = ref(false)
const bucketContentsDialog = ref(false)
const currentBucket = ref('')
const bucketObjects = ref([])
const uploadDialog = ref(false)
const fileToUpload = ref(null)
const uploading = ref(false)

const bucketNameRules = [
  v => !!v || 'Nome é obrigatório',
  v => /^[a-z0-9.-]+$/.test(v) || 'Nome deve conter apenas letras minúsculas, números, pontos e hífens',
  v => v.length >= 3 || 'Nome deve ter pelo menos 3 caracteres',
  v => v.length <= 63 || 'Nome deve ter no máximo 63 caracteres'
]

const filteredBuckets = computed(() => {
  if (!searchQuery.value) return buckets.value
  return buckets.value.filter(bucket => 
    bucket.Name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const loadBuckets = async () => {
  loading.value = true
  try {
    const response = await s3.value.send(new ListBucketsCommand({}))
    buckets.value = response.Buckets
    
    // Load stats for each bucket
    for (const bucket of buckets.value) {
      try {
        const objects = await s3.value.send(new ListObjectsV2Command({ Bucket: bucket.Name }))
        bucket.stats = {
          objectCount: objects.KeyCount || 0,
          totalSize: objects.Contents ? objects.Contents.reduce((sum, obj) => sum + obj.Size, 0) : 0
        }
      } catch (error) {
        console.error(`Error loading stats for bucket ${bucket.Name}:`, error)
        bucket.stats = { objectCount: 0, totalSize: 0 }
      }
    }
  } catch (error) {
    console.error('Error loading buckets:', error)
    appStore.showSnackbar('Erro ao carregar buckets', 'error')
  } finally {
    loading.value = false
  }
}

const createBucket = async () => {
  if (!newBucketName.value) return
  
  creating.value = true
  try {
    await s3.value.send(new CreateBucketCommand({ Bucket: newBucketName.value }))
    appStore.showSnackbar(`Bucket "${newBucketName.value}" criado com sucesso!`, 'success')
    createBucketDialog.value = false
    newBucketName.value = ''
    await loadBuckets()
  } catch (error) {
    console.error('Error creating bucket:', error)
    appStore.showSnackbar('Erro ao criar bucket', 'error')
  } finally {
    creating.value = false
  }
}

const deleteBucket = async (bucketName) => {
  if (!confirm(`Deseja realmente deletar o bucket "${bucketName}"?`)) return
  
  try {
    // First, delete all objects in the bucket
    const objects = await s3.value.send(new ListObjectsV2Command({ Bucket: bucketName }))
    
    if (objects.Contents && objects.Contents.length > 0) {
      const deleteParams = {
        Bucket: bucketName,
        Delete: {
          Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
        }
      }
      await s3.value.send(new DeleteObjectsCommand(deleteParams))
    }
    
    // Then delete the bucket
    await s3.value.send(new DeleteBucketCommand({ Bucket: bucketName }))
    appStore.showSnackbar(`Bucket "${bucketName}" deletado com sucesso!`, 'success')
    await loadBuckets()
  } catch (error) {
    console.error('Error deleting bucket:', error)
    appStore.showSnackbar('Erro ao deletar bucket', 'error')
  }
}

const openBucket = async (bucketName) => {
  currentBucket.value = bucketName
  bucketContentsDialog.value = true
  
  try {
    const response = await s3.value.send(new ListObjectsV2Command({ Bucket: bucketName }))
    bucketObjects.value = response.Contents || []
  } catch (error) {
    console.error('Error loading bucket contents:', error)
    appStore.showSnackbar('Erro ao carregar conteúdo do bucket', 'error')
  }
}

const deleteObject = async (bucketName, objectKey) => {
  if (!confirm(`Deseja realmente deletar o objeto "${objectKey}"?`)) return
  
  try {
    await s3.value.send(new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey }))
    appStore.showSnackbar(`Objeto "${objectKey}" deletado com sucesso!`, 'success')
    await openBucket(bucketName) // Refresh the bucket contents
    await loadBuckets() // Refresh the bucket stats
  } catch (error) {
    console.error('Error deleting object:', error)
    appStore.showSnackbar('Erro ao deletar objeto', 'error')
  }
}

const uploadFile = async () => {
  if (!fileToUpload.value) return
  
  uploading.value = true
  try {
    // Convert File to ArrayBuffer for AWS SDK v3 compatibility
    const fileBuffer = await fileToUpload.value.arrayBuffer()
    
    const uploadParams = {
      Bucket: currentBucket.value,
      Key: fileToUpload.value.name,
      Body: new Uint8Array(fileBuffer),
      ContentType: fileToUpload.value.type || 'application/octet-stream'
    }
    
    await s3.value.send(new PutObjectCommand(uploadParams))
    appStore.showSnackbar(`Arquivo "${fileToUpload.value.name}" enviado com sucesso!`, 'success')
    uploadDialog.value = false
    fileToUpload.value = null
    await openBucket(currentBucket.value) // Refresh the bucket contents
    await loadBuckets() // Refresh the bucket stats
  } catch (error) {
    console.error('Error uploading file:', error)
    appStore.showSnackbar('Erro ao enviar arquivo', 'error')
  } finally {
    uploading.value = false
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  loadBuckets()
})
</script>
