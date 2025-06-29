<template>
  <div>
    <v-row>
      <v-col cols="12" class="bg-secondary opacity-50">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-table</v-icon>
            <h1 class="text-h5">DynamoDB Tables</h1>
          </div>
          <v-btn color="primary" @click="createTableDialog = true">
            <v-icon class="mr-2">mdi-plus</v-icon>
            Criar Tabela
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filter -->
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          label="Buscar tabelas"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
        >
          <template v-slot:append>
            <v-btn @click="loadTables" :loading="loading" variant="outlined">
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>
          </template>
        </v-text-field>
      </v-col>
    </v-row>

    <!-- Tables List -->
    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="table in filteredTables" :key="table.TableName">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ table.TableName }}</span>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" size="small"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="openTable(table.TableName)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-eye</v-icon>
                    Ver Itens
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="addItemDialog = true; currentTable = table.TableName">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-plus</v-icon>
                    Adicionar Item
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="deleteTable(table.TableName)">
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
              <v-icon class="mr-1" size="small">mdi-key</v-icon>
              {{ table.KeySchema?.map(k => k.AttributeName).join(', ') }}
            </v-chip>
            <v-chip size="small" class="mr-2 mb-2" :color="getStatusColor(table.TableStatus)">
              {{ table.TableStatus }}
            </v-chip>
            <div class="text-caption text-grey mt-2">
              Criada em: {{ formatDate(table.CreationDateTime) }}
            </div>
            <div class="text-caption text-grey">
              Itens: {{ table.ItemCount || 0 }} • 
              Tamanho: {{ formatBytes(table.TableSizeBytes || 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!loading && tables.length === 0">
      <v-col cols="12" class="text-center">
        <v-icon size="64" color="grey-lighten-1">mdi-table</v-icon>
        <h3 class="text-h5 mt-4 text-grey">Nenhuma tabela encontrada</h3>
        <p class="text-grey">Crie sua primeira tabela DynamoDB para começar</p>
        <v-btn color="primary" @click="createTableDialog = true">
          Criar Tabela
        </v-btn>
      </v-col>
    </v-row>

    <!-- Create Table Dialog -->
    <v-dialog v-model="createTableDialog" max-width="700">
      <v-card>
        <v-card-title>Criar Nova Tabela</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newTable.name"
            label="Nome da Tabela"
            :rules="tableNameRules"
            class="mb-4"
          ></v-text-field>
          
          <h4 class="mb-3">Chave Primária</h4>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="newTable.partitionKey.name"
                label="Partition Key"
                :rules="[v => !!v || 'Partition Key é obrigatória']"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="newTable.partitionKey.type"
                label="Tipo"
                :items="[
                  { title: 'String', value: 'S' },
                  { title: 'Number', value: 'N' },
                  { title: 'Binary', value: 'B' }
                ]"
              ></v-select>
            </v-col>
          </v-row>
          
          <v-checkbox
            v-model="newTable.hasSortKey"
            label="Usar Sort Key"
          ></v-checkbox>
          
          <v-row v-if="newTable.hasSortKey">
            <v-col cols="6">
              <v-text-field
                v-model="newTable.sortKey.name"
                label="Sort Key"
                :rules="newTable.hasSortKey ? [v => !!v || 'Sort Key é obrigatória'] : []"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="newTable.sortKey.type"
                label="Tipo"
                :items="[
                  { title: 'String', value: 'S' },
                  { title: 'Number', value: 'N' },
                  { title: 'Binary', value: 'B' }
                ]"
              ></v-select>
            </v-col>
          </v-row>
          
          <h4 class="mb-3 mt-4">Billing Mode</h4>
          <v-radio-group v-model="newTable.billingMode">
            <v-radio label="On-demand" value="PAY_PER_REQUEST"></v-radio>
            <v-radio label="Provisioned" value="PROVISIONED"></v-radio>
          </v-radio-group>
          
          <v-row v-if="newTable.billingMode === 'PROVISIONED'">
            <v-col cols="6">
              <v-text-field
                v-model.number="newTable.readCapacity"
                label="Read Capacity Units"
                type="number"
                min="1"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="newTable.writeCapacity"
                label="Write Capacity Units"
                type="number"
                min="1"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="createTableDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="createTable" :loading="creating">Criar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Table Items Dialog -->
    <v-dialog v-model="itemsDialog" max-width="1200" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Itens: {{ currentTable }}</span>
          <div>
            <v-btn 
              color="primary" 
              variant="outlined" 
              class="mr-2"
              @click="addItemDialog = true"
            >
              <v-icon class="mr-2">mdi-plus</v-icon>
              Adicionar Item
            </v-btn>
            <v-btn 
              variant="outlined" 
              class="mr-2"
              @click="scanTable"
              :loading="scanningTable"
            >
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>
            <v-btn icon @click="itemsDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>
        
        <v-card-text style="height: 600px;">
          <v-data-table
            v-if="tableItems.length > 0"
            :headers="tableHeaders"
            :items="tableItems"
            :items-per-page="10"
          >
            <template v-slot:item.actions="{ item }">
              <v-btn 
                icon 
                size="small" 
                @click="editItem(item)"
                class="mr-2"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn 
                icon 
                size="small" 
                @click="deleteItem(item)"
                color="error"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-data-table>
          
          <div v-else class="text-center text-grey mt-8">
            <v-icon size="48">mdi-table-row</v-icon>
            <p class="mt-2">Nenhum item encontrado</p>
            <v-btn @click="scanTable" :loading="scanningTable">
              Verificar Itens
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Item Dialog -->
    <v-dialog v-model="addItemDialog" max-width="700" scrollable>
      <v-card>
        <v-card-title>{{ editingItem ? 'Editar Item' : 'Adicionar Item' }}</v-card-title>
        <v-card-text style="height: 400px;">
          <v-textarea
            v-model="itemJson"
            label="JSON do Item"
            rows="15"
            variant="outlined"
            :rules="[validateJson]"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="addItemDialog = false">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="saveItem" 
            :loading="savingItem"
            :disabled="!isValidJson"
          >
            {{ editingItem ? 'Atualizar' : 'Adicionar' }}
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
  ListTablesCommand, 
  DescribeTableCommand, 
  CreateTableCommand, 
  DeleteTableCommand, 
  ScanCommand, 
  DeleteItemCommand, 
  PutItemCommand 
} from '@aws-sdk/client-dynamodb'
import { formatDate } from '../utils/formatDate.js'

const appStore = useAppStore()
const { dynamodb } = storeToRefs(appStore)

const tables = ref([])
const loading = ref(false)
const searchQuery = ref('')
const createTableDialog = ref(false)
const creating = ref(false)
const itemsDialog = ref(false)
const addItemDialog = ref(false)
const currentTable = ref('')
const tableItems = ref([])
const tableHeaders = ref([])
const scanningTable = ref(false)
const savingItem = ref(false)
const editingItem = ref(null)
const itemJson = ref('')

const newTable = ref({
  name: '',
  partitionKey: { name: '', type: 'S' },
  sortKey: { name: '', type: 'S' },
  hasSortKey: false,
  billingMode: 'PAY_PER_REQUEST',
  readCapacity: 5,
  writeCapacity: 5
})

const tableNameRules = [
  v => !!v || 'Nome é obrigatório',
  v => /^[a-zA-Z0-9_.-]+$/.test(v) || 'Nome deve conter apenas letras, números, _, . e -',
  v => v.length >= 3 || 'Nome deve ter pelo menos 3 caracteres',
  v => v.length <= 255 || 'Nome deve ter no máximo 255 caracteres'
]

const filteredTables = computed(() => {
  if (!searchQuery.value) return tables.value
  return tables.value.filter(table => 
    table.TableName.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const isValidJson = computed(() => {
  try {
    JSON.parse(itemJson.value)
    return true
  } catch {
    return false
  }
})

const validateJson = (value) => {
  try {
    JSON.parse(value)
    return true
  } catch (error) {
    return 'JSON inválido'
  }
}

const loadTables = async () => {
  loading.value = true
  try {
    const response = await dynamodb.value.send(new ListTablesCommand({}))
    
    tables.value = await Promise.all(
      response.TableNames.map(async (tableName) => {
        try {
          const description = await dynamodb.value.send(new DescribeTableCommand({ TableName: tableName }))
          return description.Table
        } catch (error) {
          console.error(`Error describing table ${tableName}:`, error)
          return { TableName: tableName, TableStatus: 'ERROR' }
        }
      })
    )
  } catch (error) {
    console.error('Error loading tables:', error)
    appStore.showSnackbar('Erro ao carregar tabelas', 'error')
  } finally {
    loading.value = false
  }
}

const createTable = async () => {
  if (!newTable.value.name || !newTable.value.partitionKey.name) return
  
  creating.value = true
  try {
    const keySchema = [
      {
        AttributeName: newTable.value.partitionKey.name,
        KeyType: 'HASH'
      }
    ]
    
    const attributeDefinitions = [
      {
        AttributeName: newTable.value.partitionKey.name,
        AttributeType: newTable.value.partitionKey.type
      }
    ]
    
    if (newTable.value.hasSortKey && newTable.value.sortKey.name) {
      keySchema.push({
        AttributeName: newTable.value.sortKey.name,
        KeyType: 'RANGE'
      })
      
      attributeDefinitions.push({
        AttributeName: newTable.value.sortKey.name,
        AttributeType: newTable.value.sortKey.type
      })
    }
    
    const params = {
      TableName: newTable.value.name,
      KeySchema: keySchema,
      AttributeDefinitions: attributeDefinitions,
      BillingMode: newTable.value.billingMode
    }
    
    if (newTable.value.billingMode === 'PROVISIONED') {
      params.ProvisionedThroughput = {
        ReadCapacityUnits: newTable.value.readCapacity,
        WriteCapacityUnits: newTable.value.writeCapacity
      }
    }
    
    await dynamodb.value.send(new CreateTableCommand(params))
    appStore.showSnackbar(`Tabela "${newTable.value.name}" criada com sucesso!`, 'success')
    
    createTableDialog.value = false
    newTable.value = {
      name: '',
      partitionKey: { name: '', type: 'S' },
      sortKey: { name: '', type: 'S' },
      hasSortKey: false,
      billingMode: 'PAY_PER_REQUEST',
      readCapacity: 5,
      writeCapacity: 5
    }
    
    await loadTables()
  } catch (error) {
    console.error('Error creating table:', error)
    appStore.showSnackbar('Erro ao criar tabela', 'error')
  } finally {
    creating.value = false
  }
}

const deleteTable = async (tableName) => {
  if (!confirm(`Deseja realmente deletar a tabela "${tableName}"?`)) return
  
  try {
    await dynamodb.value.send(new DeleteTableCommand({ TableName: tableName }))
    appStore.showSnackbar(`Tabela "${tableName}" deletada com sucesso!`, 'success')
    await loadTables()
  } catch (error) {
    console.error('Error deleting table:', error)
    appStore.showSnackbar('Erro ao deletar tabela', 'error')
  }
}

const openTable = async (tableName) => {
  currentTable.value = tableName
  itemsDialog.value = true
  await scanTable()
}

const scanTable = async () => {
  if (!currentTable.value) return
  
  scanningTable.value = true
  try {
    const response = await dynamodb.value.send(new ScanCommand({ TableName: currentTable.value }))
    
    if (response.Items && response.Items.length > 0) {
      // Convert DynamoDB items to regular objects
      tableItems.value = response.Items.map(item => {
        const converted = {}
        for (const [key, value] of Object.entries(item)) {
          converted[key] = convertDynamoDBValue(value)
        }
        converted._rawItem = item // Keep raw item for editing
        return converted
      })
      
      // Generate headers from first item
      const firstItem = tableItems.value[0]
      tableHeaders.value = Object.keys(firstItem)
        .filter(key => key !== '_rawItem')
        .map(key => ({
          title: key,
          key: key,
          sortable: true
        }))
      
      // Add actions column
      tableHeaders.value.push({
        title: 'Ações',
        key: 'actions',
        sortable: false,
        width: 120
      })
    } else {
      tableItems.value = []
      tableHeaders.value = []
    }
  } catch (error) {
    console.error('Error scanning table:', error)
    appStore.showSnackbar('Erro ao escanear tabela', 'error')
  } finally {
    scanningTable.value = false
  }
}

const editItem = (item) => {
  editingItem.value = item._rawItem
  itemJson.value = JSON.stringify(item._rawItem, null, 2)
  addItemDialog.value = true
}

const deleteItem = async (item) => {
  if (!confirm('Deseja realmente deletar este item?')) return
  
  try {
    // Get table key schema to build the key
    const tableDesc = await dynamodb.value.send(new DescribeTableCommand({ TableName: currentTable.value }))
    const keySchema = tableDesc.Table.KeySchema
    
    const key = {}
    for (const keyAttr of keySchema) {
      key[keyAttr.AttributeName] = item._rawItem[keyAttr.AttributeName]
    }
    
    await dynamodb.value.send(new DeleteItemCommand({
      TableName: currentTable.value,
      Key: key
    }))
    
    appStore.showSnackbar('Item deletado com sucesso!', 'success')
    await scanTable()
  } catch (error) {
    console.error('Error deleting item:', error)
    appStore.showSnackbar('Erro ao deletar item', 'error')
  }
}

const saveItem = async () => {
  if (!isValidJson.value) return
  
  savingItem.value = true
  try {
    const item = JSON.parse(itemJson.value)
    
    if (editingItem.value) {
      // Update existing item
      await dynamodb.value.send(new PutItemCommand({
        TableName: currentTable.value,
        Item: item
      }))
      appStore.showSnackbar('Item atualizado com sucesso!', 'success')
    } else {
      // Add new item
      await dynamodb.value.send(new PutItemCommand({
        TableName: currentTable.value,
        Item: item
      }))
      appStore.showSnackbar('Item adicionado com sucesso!', 'success')
    }
    
    addItemDialog.value = false
    editingItem.value = null
    itemJson.value = ''
    await scanTable()
  } catch (error) {
    console.error('Error saving item:', error)
    appStore.showSnackbar('Erro ao salvar item', 'error')
  } finally {
    savingItem.value = false
  }
}

const convertDynamoDBValue = (value) => {
  if (value.S !== undefined) return value.S
  if (value.N !== undefined) return Number(value.N)
  if (value.B !== undefined) return value.B
  if (value.BOOL !== undefined) return value.BOOL
  if (value.NULL !== undefined) return null
  if (value.SS !== undefined) return value.SS
  if (value.NS !== undefined) return value.NS.map(Number)
  if (value.BS !== undefined) return value.BS
  if (value.M !== undefined) {
    const obj = {}
    for (const [k, v] of Object.entries(value.M)) {
      obj[k] = convertDynamoDBValue(v)
    }
    return obj
  }
  if (value.L !== undefined) {
    return value.L.map(convertDynamoDBValue)
  }
  return value
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

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  loadTables()
})
</script>
