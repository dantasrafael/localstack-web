<template>
  <div>
    <v-row>
      <v-col cols="12" class="bg-secondary opacity-50">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-key</v-icon>
            <h1 class="text-h5">KMS Keys</h1>
          </div>
          <v-btn color="primary" @click="createKeyDialog = true">
            <v-icon class="mr-2">mdi-plus</v-icon>
            Criar Chave
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filter -->
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          label="Buscar chaves"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
        >
          <template v-slot:append>
            <v-btn @click="loadKeys" :loading="loading" variant="outlined">
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>
          </template>      
      </v-text-field>
      </v-col>
    </v-row>

    <!-- Keys List -->
    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="key in filteredKeys" :key="key.KeyId">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ key.Description || 'Chave sem descrição' }}</span>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" size="small"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="openKey(key.KeyId)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-key</v-icon>
                    Detalhes
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="encryptData(key.KeyId)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-lock</v-icon>
                    Criptografar
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="decryptData(key.KeyId)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-lock-open</v-icon>
                    Descriptografar
                  </v-list-item-title>
                </v-list-item>
                <v-list-item 
                  @click="confirmDeleteKey(key.KeyId)"
                  :disabled="key.KeyState === 'PendingDeletion'"
                >
                  <v-list-item-title class="text-error">
                    <v-icon class="mr-2">mdi-delete</v-icon>
                    {{ key.KeyState === 'PendingDeletion' ? 'Agendada para exclusão' : 'Excluir' }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-title>
          <v-card-text>
            <v-chip 
              :color="getKeyStateColor(key.KeyState)" 
              size="small" 
              class="mb-2"
            >
              {{ key.KeyState }}
            </v-chip>
            <p class="text-caption text-break"><strong>Key ID:</strong> {{ key.KeyId }}</p>
            <p class="text-caption text-break"><strong>ARN:</strong> {{ key.Arn }}</p>
            <p class="text-caption"><strong>Uso:</strong> {{ key.KeyUsage }}</p>
            <p class="text-caption"><strong>Origem:</strong> {{ key.Origin }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!loading && keys.length === 0">
      <v-col cols="12" class="text-center">
        <v-icon size="120" color="grey-lighten-2">mdi-key-outline</v-icon>
        <h2 class="text-h5 text-grey-lighten-1 mt-4">Nenhuma chave encontrada</h2>
        <p class="text-grey-lighten-1">Crie sua primeira chave KMS para começar</p>
        <v-btn color="primary" @click="createKeyDialog = true" class="mt-4">
          <v-icon class="mr-2">mdi-plus</v-icon>
          Criar Chave
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
        <p class="mt-4 text-grey-lighten-1">Carregando chaves...</p>
      </v-col>
    </v-row>

    <!-- Create Key Dialog -->
    <v-dialog v-model="createKeyDialog" max-width="600">
      <v-card>
        <v-card-title>
          <span class="text-h5">Criar Nova Chave</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newKeyDescription"
            label="Descrição da Chave"
            placeholder="Minha chave de criptografia"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          
          <v-select
            v-model="newKeyUsage"
            :items="keyUsageOptions"
            label="Uso da Chave"
            variant="outlined"
            class="mb-4"
          ></v-select>
          
          <v-select
            v-model="newKeySpec"
            :items="keySpecOptions"
            label="Especificação da Chave"
            variant="outlined"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="createKeyDialog = false">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="createKey"
            :loading="creating"
          >
            Criar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Encrypt Dialog -->
    <v-dialog v-model="encryptDialog" max-width="600">
      <v-card>
        <v-card-title>
          <span class="text-h5">Criptografar Dados</span>
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="dataToEncrypt"
            label="Dados para criptografar"
            placeholder="Digite os dados que deseja criptografar"
            variant="outlined"
            rows="4"
            :rules="[rules.required]"
            class="mb-4"
          ></v-textarea>
          
          <v-textarea
            v-model="encryptedData"
            label="Dados criptografados"
            placeholder="O resultado aparecerá aqui"
            variant="outlined"
            rows="4"
            readonly
            v-if="encryptedData"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="encryptDialog = false">Fechar</v-btn>
          <v-btn 
            color="primary" 
            @click="performEncrypt"
            :loading="encrypting"
            :disabled="!dataToEncrypt"
          >
            Criptografar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Decrypt Dialog -->
    <v-dialog v-model="decryptDialog" max-width="600">
      <v-card>
        <v-card-title>
          <span class="text-h5">Descriptografar Dados</span>
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="dataToDecrypt"
            label="Dados criptografados"
            placeholder="Cole os dados criptografados aqui"
            variant="outlined"
            rows="4"
            :rules="[rules.required]"
            class="mb-4"
          ></v-textarea>
          
          <v-textarea
            v-model="decryptedData"
            label="Dados descriptografados"
            placeholder="O resultado aparecerá aqui"
            variant="outlined"
            rows="4"
            readonly
            v-if="decryptedData"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="decryptDialog = false">Fechar</v-btn>
          <v-btn 
            color="primary" 
            @click="performDecrypt"
            :loading="decrypting"
            :disabled="!dataToDecrypt"
          >
            Descriptografar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Key Details Dialog -->
    <v-dialog v-model="keyDetailsDialog" max-width="800">
      <v-card v-if="selectedKey">
        <v-card-title>
          <span class="text-h5">Detalhes da Chave</span>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-text>
                  <p><strong>Descrição:</strong> {{ selectedKey.Description || 'Sem descrição' }}</p>
                  <p><strong>Key ID:</strong> {{ selectedKey.KeyId }}</p>
                  <p><strong>ARN:</strong> {{ selectedKey.Arn }}</p>
                  <p><strong>Estado:</strong> 
                    <v-chip :color="getKeyStateColor(selectedKey.KeyState)" size="small">
                      {{ selectedKey.KeyState }}
                    </v-chip>
                  </p>
                  <p><strong>Uso:</strong> {{ selectedKey.KeyUsage }}</p>
                  <p><strong>Especificação:</strong> {{ selectedKey.KeySpec }}</p>
                  <p><strong>Origem:</strong> {{ selectedKey.Origin }}</p>
                  <p><strong>Gerenciador:</strong> {{ selectedKey.KeyManager }}</p>
                  <p><strong>Data de Criação:</strong> {{ formatDate(selectedKey.CreationDate) }}</p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="keyDetailsDialog = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">Confirmar Exclusão</v-card-title>
        <v-card-text>
          Tem certeza que deseja agendar a exclusão desta chave?
          A chave será excluída após 7 dias (padrão) e esta ação não pode ser desfeita.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" @click="deleteKey" :loading="deleting">Agendar Exclusão</v-btn>
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
  ListKeysCommand, 
  DescribeKeyCommand, 
  CreateKeyCommand, 
  EncryptCommand, 
  DecryptCommand, 
  ScheduleKeyDeletionCommand 
} from '@aws-sdk/client-kms'
import { formatDate } from '../utils/formatDate.js'

const appStore = useAppStore()
const { kms } = storeToRefs(appStore)

// Reactive data
const keys = ref([])
const searchQuery = ref('')
const loading = ref(false)
const creating = ref(false)
const encrypting = ref(false)
const decrypting = ref(false)
const deleting = ref(false)

// Dialog states
const createKeyDialog = ref(false)
const encryptDialog = ref(false)
const decryptDialog = ref(false)
const keyDetailsDialog = ref(false)
const deleteDialog = ref(false)

// Form data
const newKeyDescription = ref('')
const newKeyUsage = ref('ENCRYPT_DECRYPT')
const newKeySpec = ref('SYMMETRIC_DEFAULT')
const dataToEncrypt = ref('')
const encryptedData = ref('')
const dataToDecrypt = ref('')
const decryptedData = ref('')
const keyToDelete = ref('')
const keyToEncrypt = ref('')
const selectedKey = ref(null)

// Options
const keyUsageOptions = [
  { title: 'Encrypt/Decrypt', value: 'ENCRYPT_DECRYPT' },
  { title: 'Sign/Verify', value: 'SIGN_VERIFY' }
]

const keySpecOptions = [
  { title: 'Symmetric Default', value: 'SYMMETRIC_DEFAULT' },
  { title: 'RSA 2048', value: 'RSA_2048' },
  { title: 'RSA 3072', value: 'RSA_3072' },
  { title: 'RSA 4096', value: 'RSA_4096' },
  { title: 'ECC NIST P256', value: 'ECC_NIST_P256' },
  { title: 'ECC NIST P384', value: 'ECC_NIST_P384' },
  { title: 'ECC NIST P521', value: 'ECC_NIST_P521' }
]

// Validation rules
const rules = {
  required: value => !!value || 'Campo obrigatório'
}

// Computed properties
const filteredKeys = computed(() => {
  if (!searchQuery.value) return keys.value
  return keys.value.filter(key => 
    (key.Description || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    key.KeyId.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Helper functions
const getKeyStateColor = (state) => {
  switch (state) {
    case 'Enabled': return 'success'
    case 'Disabled': return 'warning'
    case 'PendingDeletion': return 'error'
    case 'PendingImport': return 'info'
    default: return 'grey'
  }
}

// KMS API functions
const loadKeys = async () => {
  try {
    loading.value = true
    const response = await kms.value.send(new ListKeysCommand({}))
    const keyList = response.Keys || []
    
    // Get detailed information for each key
    const detailedKeys = await Promise.all(
      keyList.map(async (key) => {
        try {
          const detailResponse = await kms.value.send(new DescribeKeyCommand({ KeyId: key.KeyId }))
          return detailResponse.KeyMetadata
        } catch (error) {
          console.error('Erro ao carregar detalhes da chave:', error)
          return key
        }
      })
    )
    
    keys.value = detailedKeys
  } catch (error) {
    console.error('Erro ao carregar chaves:', error)
    appStore.showSnackbar('Erro ao carregar chaves KMS', 'error')
  } finally {
    loading.value = false
  }
}

const createKey = async () => {
  try {
    creating.value = true
    const payload = {
      KeyUsage: newKeyUsage.value,
      KeySpec: newKeySpec.value
    }
    
    if (newKeyDescription.value) {
      payload.Description = newKeyDescription.value
    }
    
    await kms.value.send(new CreateKeyCommand(payload))
    
    appStore.showSnackbar('Chave criada com sucesso!', 'success')
    createKeyDialog.value = false
    resetCreateForm()
    await loadKeys()
  } catch (error) {
    console.error('Erro ao criar chave:', error)
    appStore.showSnackbar('Erro ao criar chave', 'error')
  } finally {
    creating.value = false
  }
}

const openKey = async (keyId) => {
  try {
    const response = await kms.value.send(new DescribeKeyCommand({ KeyId: keyId }))
    selectedKey.value = response.KeyMetadata
    keyDetailsDialog.value = true
  } catch (error) {
    console.error('Erro ao carregar detalhes da chave:', error)
    appStore.showSnackbar('Erro ao carregar detalhes da chave', 'error')
  }
}

const encryptData = (keyId) => {
  keyToEncrypt.value = keyId
  dataToEncrypt.value = ''
  encryptedData.value = ''
  encryptDialog.value = true
}

const performEncrypt = async () => {
  if (!dataToEncrypt.value) return
  
  try {
    encrypting.value = true
    const response = await kms.value.send(new EncryptCommand({
      KeyId: keyToEncrypt.value,
      Plaintext: dataToEncrypt.value
    }))
    
    encryptedData.value = btoa(String.fromCharCode(...new Uint8Array(response.CiphertextBlob)))    
    appStore.showSnackbar('Dados criptografados com sucesso!', 'success')
  } catch (error) {
    console.error('Erro ao criptografar dados:', error)
    appStore.showSnackbar('Erro ao criptografar dados', 'error')
  } finally {
    encrypting.value = false
  }
}

const decryptData = (keyId) => {
  dataToDecrypt.value = ''
  decryptedData.value = ''
  decryptDialog.value = true
}

const performDecrypt = async () => {
  if (!dataToDecrypt.value) return
  
  try {
    decrypting.value = true
    
    // Convert base64 string to Uint8Array for browser compatibility
    const binaryString = atob(dataToDecrypt.value)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    const response = await kms.value.send(new DecryptCommand({
      CiphertextBlob: bytes
    }))
    
    decryptedData.value = new TextDecoder().decode(response.Plaintext)
    appStore.showSnackbar('Dados descriptografados com sucesso!', 'success')
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error)
    appStore.showSnackbar('Erro ao descriptografar dados', 'error')
  } finally {
    decrypting.value = false
  }
}

const confirmDeleteKey = (keyId) => {
  keyToDelete.value = keyId
  deleteDialog.value = true
}

const deleteKey = async () => {
  try {
    deleting.value = true
    await kms.value.send(new ScheduleKeyDeletionCommand({
      KeyId: keyToDelete.value,
      PendingWindowInDays: 7
    }))
    
    appStore.showSnackbar('Exclusão da chave agendada com sucesso!', 'success')
    deleteDialog.value = false
    await loadKeys()
  } catch (error) {
    console.error('Erro ao agendar exclusão da chave:', error)
    appStore.showSnackbar('Erro ao agendar exclusão da chave', 'error')
  } finally {
    deleting.value = false
  }
}

const resetCreateForm = () => {
  newKeyDescription.value = ''
  newKeyUsage.value = 'ENCRYPT_DECRYPT'
  newKeySpec.value = 'SYMMETRIC_DEFAULT'
}

// Lifecycle
onMounted(() => {
  loadKeys()
})
</script>

<style scoped>
.text-break {
  word-break: break-all;
}
</style>
