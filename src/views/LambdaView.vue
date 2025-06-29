<template>
  <div>
    <v-row>
      <v-col cols="12" class="bg-secondary opacity-50">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-function</v-icon>
            <h1 class="text-h5">Lambda Functions</h1>
          </div>
          <v-btn color="primary" @click="createFunctionDialog = true">
            <v-icon class="mr-2">mdi-plus</v-icon>
            Criar Função
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filter -->
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          label="Buscar funções"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
        >
          <template v-slot:append>
            <v-btn @click="loadFunctions" :loading="loading" variant="outlined">
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>
          </template>      
      </v-text-field>
      </v-col>
    </v-row>

    <!-- Functions List -->
    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="func in filteredFunctions" :key="func.FunctionName">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ func.FunctionName }}</span>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" size="small"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="viewFunction(func)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-eye</v-icon>
                    Ver Detalhes
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="invokeFunction(func)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-play</v-icon>
                    Invocar
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="deleteFunction(func.FunctionName)">
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
              {{ func.Runtime }}
            </v-chip>
            <v-chip size="small" class="mr-2 mb-2" :color="getStateColor(func.State)">
              {{ func.State }}
            </v-chip>
            <div class="text-caption text-grey mt-2">
              Handler: {{ func.Handler }}
            </div>
            <div class="text-caption text-grey">
              Timeout: {{ func.Timeout }}s • Memory: {{ func.MemorySize }}MB
            </div>
            <div class="text-caption text-grey">
              Última modificação: {{ formatDate(func.LastModified) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!loading && functions.length === 0">
      <v-col cols="12" class="text-center">
        <v-icon size="64" color="grey-lighten-1">mdi-function</v-icon>
        <h3 class="text-h5 mt-4 text-grey">Nenhuma função encontrada</h3>
        <p class="text-grey">Crie sua primeira função Lambda para começar</p>
        <v-btn color="primary" @click="createFunctionDialog = true" class="mt-4">
          <v-icon class="mr-2">mdi-plus</v-icon>
          Criar Função
        </v-btn>
      </v-col>
    </v-row>

    <!-- Function Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Detalhes: {{ currentFunction?.FunctionName }}</span>
          <v-btn icon @click="detailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text style="height: 500px;" v-if="currentFunction">
          <v-row>
            <v-col cols="6">
              <strong>Nome:</strong> {{ currentFunction.FunctionName }}
            </v-col>
            <v-col cols="6">
              <strong>ARN:</strong> {{ currentFunction.FunctionArn }}
            </v-col>
            <v-col cols="6">
              <strong>Runtime:</strong> {{ currentFunction.Runtime }}
            </v-col>
            <v-col cols="6">
              <strong>Handler:</strong> {{ currentFunction.Handler }}
            </v-col>
            <v-col cols="6">
              <strong>Estado:</strong> 
              <v-chip size="small" :color="getStateColor(currentFunction.State)">
                {{ currentFunction.State }}
              </v-chip>
            </v-col>
            <v-col cols="6">
              <strong>Última Modificação:</strong> {{ formatDate(currentFunction.LastModified) }}
            </v-col>
            <v-col cols="6">
              <strong>Timeout:</strong> {{ currentFunction.Timeout }} segundos
            </v-col>
            <v-col cols="6">
              <strong>Memória:</strong> {{ currentFunction.MemorySize }} MB
            </v-col>
            <v-col cols="12">
              <strong>Descrição:</strong> {{ currentFunction.Description || 'Nenhuma descrição' }}
            </v-col>
          </v-row>
          
          <v-divider class="my-4"></v-divider>
          
          <h4 class="mb-3">Variáveis de Ambiente</h4>
          <v-card variant="outlined" class="pa-3">
            <div v-if="currentFunction.Environment?.Variables && Object.keys(currentFunction.Environment.Variables).length > 0">
              <div v-for="(value, key) in currentFunction.Environment.Variables" :key="key" class="mb-2">
                <strong>{{ key }}:</strong> {{ value }}
              </div>
            </div>
            <div v-else class="text-grey text-center">
              Nenhuma variável de ambiente configurada
            </div>
          </v-card>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Invoke Function Dialog -->
    <v-dialog v-model="invokeDialog" max-width="700">
      <v-card>
        <v-card-title>Invocar Função: {{ functionToInvoke?.FunctionName }}</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="invokePayload"
            label="Payload (JSON)"
            rows="8"
            variant="outlined"
            :rules="[validateJson]"
          ></v-textarea>
          
          <v-select
            v-model="invocationType"
            label="Tipo de Invocação"
            :items="[
              { title: 'RequestResponse (Síncrono)', value: 'RequestResponse' },
              { title: 'Event (Assíncrono)', value: 'Event' }
            ]"
            variant="outlined"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="invokeDialog = false">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="executeFunctionInvoke" 
            :loading="invoking"
            :disabled="!isValidJson"
          >
            Invocar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Invoke Result Dialog -->
    <v-dialog v-model="resultDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Resultado da Invocação</span>
          <v-btn icon @click="resultDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text style="height: 400px;">
          <div class="mb-4">
            <strong>Status Code:</strong> 
            <v-chip :color="invokeResult.StatusCode === 200 ? 'success' : 'error'" size="small">
              {{ invokeResult.StatusCode }}
            </v-chip>
          </div>
          
          <div class="mb-4" v-if="invokeResult.LogResult">
            <strong>Logs:</strong>
            <v-card variant="outlined" class="pa-3 mt-2">
              <pre class="text-caption">{{ decodeLogs(invokeResult.LogResult) }}</pre>
            </v-card>
          </div>
          
          <div class="mb-4" v-if="invokeResult.Payload">
            <strong>Response:</strong>
            <v-card variant="outlined" class="pa-3 mt-2">
              <pre class="text-body-2">{{ formatJsonResponse(invokeResult.Payload) }}</pre>
            </v-card>
          </div>
          
          <div v-if="invokeResult.FunctionError">
            <strong>Erro:</strong>
            <v-card variant="outlined" class="pa-3 mt-2" color="error">
              <pre class="text-body-2">{{ invokeResult.FunctionError }}</pre>
            </v-card>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Create Function Dialog -->
    <v-dialog v-model="createFunctionDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title>
          <span class="text-h5">Criar Nova Função Lambda</span>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newFunction.functionName"
                label="Nome da Função *"
                placeholder="minha-funcao-lambda"
                variant="outlined"
                :rules="[rules.required]"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="newFunction.runtime"
                :items="runtimeOptions"
                label="Runtime *"
                variant="outlined"
                :rules="[rules.required]"
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newFunction.handler"
                label="Handler *"
                placeholder="index.handler"
                variant="outlined"
                :rules="[rules.required]"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="newFunction.timeout"
                type="number"
                label="Timeout (segundos)"
                variant="outlined"
                min="1"
                max="900"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="newFunction.memorySize"
                type="number"
                label="Memória (MB)"
                variant="outlined"
                min="128"
                max="10240"
                step="64"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newFunction.role"
                label="Role ARN"
                placeholder="arn:aws:iam::123456789012:role/lambda-role"
                variant="outlined"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="newFunction.description"
                label="Descrição"
                placeholder="Descrição da função Lambda"
                variant="outlined"
                rows="2"
              ></v-textarea>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="newFunction.code"
                label="Código da Função *"
                placeholder="def lambda_handler(event, context):&#10;    return {&#10;        'statusCode': 200,&#10;        'body': 'Hello from Lambda!'&#10;    }"
                variant="outlined"
                rows="8"
                :rules="[rules.required]"
              ></v-textarea>
            </v-col>
          </v-row>
          
          <v-expansion-panels class="mt-4">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-cog</v-icon>
                Variáveis de Ambiente
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row v-for="(envVar, index) in environmentVariables" :key="index" class="mb-2">
                  <v-col cols="5">
                    <v-text-field
                      v-model="envVar.key"
                      label="Chave"
                      variant="outlined"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="5">
                    <v-text-field
                      v-model="envVar.value"
                      label="Valor"
                      variant="outlined"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="2" class="d-flex align-center">
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      color="error"
                      variant="text"
                      @click="removeEnvironmentVariable(index)"
                    ></v-btn>
                  </v-col>
                </v-row>
                <v-btn
                  color="primary"
                  variant="outlined"
                  size="small"
                  @click="addEnvironmentVariable"
                >
                  <v-icon class="mr-2">mdi-plus</v-icon>
                  Adicionar Variável
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeCreateDialog">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="createFunction"
            :loading="creating"
            :disabled="!isCreateFormValid"
          >
            Criar Função
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { storeToRefs } from 'pinia'
import JSZip from 'jszip'
import { 
  ListFunctionsCommand, 
  GetFunctionCommand, 
  InvokeCommand, 
  DeleteFunctionCommand, 
  CreateFunctionCommand 
} from '@aws-sdk/client-lambda'

const appStore = useAppStore()
const { lambda } = storeToRefs(appStore)

const functions = ref([])
const loading = ref(false)
const searchQuery = ref('')
const detailsDialog = ref(false)
const currentFunction = ref(null)
const invokeDialog = ref(false)
const functionToInvoke = ref(null)
const invokePayload = ref('{}')
const invocationType = ref('RequestResponse')
const invoking = ref(false)
const resultDialog = ref(false)
const invokeResult = ref({})

// Create Function Dialog
const createFunctionDialog = ref(false)
const creating = ref(false)
const newFunction = ref({
  functionName: '',
  runtime: 'python3.9',
  handler: 'index.lambda_handler',
  timeout: 30,
  memorySize: 128,
  role: 'arn:aws:iam::123456789012:role/lambda-role',
  description: '',
  code: `def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }`
})
const environmentVariables = ref([])

// Runtime options
const runtimeOptions = [
  'python3.9',
  'python3.8',
  'nodejs18.x',
  'nodejs16.x',
  'nodejs14.x',
  'java11',
  'java8',
  'dotnet6',
  'go1.x',
  'ruby2.7'
]

// Validation rules
const rules = {
  required: value => !!value || 'Campo obrigatório'
}

const filteredFunctions = computed(() => {
  if (!searchQuery.value) return functions.value
  return functions.value.filter(func => 
    func.FunctionName.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const isValidJson = computed(() => {
  try {
    JSON.parse(invokePayload.value)
    return true
  } catch {
    return false
  }
})

const isCreateFormValid = computed(() => {
  return newFunction.value.functionName && 
         newFunction.value.runtime && 
         newFunction.value.handler && 
         newFunction.value.code
})

// Watch runtime changes to update handler and code template
watch(() => newFunction.value.runtime, (newRuntime) => {
  updateCodeTemplate(newRuntime)
})

// Function to get code template and handler based on runtime
const updateCodeTemplate = (runtime) => {
  if (runtime.startsWith('python')) {
    newFunction.value.handler = 'index.lambda_handler'
    newFunction.value.code = `def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }`
  } else if (runtime.startsWith('nodejs')) {
    newFunction.value.handler = 'index.handler'
    newFunction.value.code = `exports.handler = async (event) => {
    return {
        statusCode: 200,
        body: 'Hello from Lambda!'
    };
};`
  } else if (runtime.startsWith('java')) {
    newFunction.value.handler = 'example.Handler::handleRequest'
    newFunction.value.code = `package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class Handler implements RequestHandler<Object, String> {
    @Override
    public String handleRequest(Object input, Context context) {
        return "Hello from Lambda!";
    }
}`
  } else if (runtime.startsWith('go')) {
    newFunction.value.handler = 'main'
    newFunction.value.code = `package main

import (
    "context"
    "github.com/aws/aws-lambda-go/lambda"
)

func HandleRequest(ctx context.Context) (string, error) {
    return "Hello from Lambda!", nil
}

func main() {
    lambda.Start(HandleRequest)
}`
  } else if (runtime.startsWith('dotnet')) {
    newFunction.value.handler = 'Function::Function.Handler'
    newFunction.value.code = `using Amazon.Lambda.Core;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace Function;

public class Function
{
    public string Handler(ILambdaContext context)
    {
        return "Hello from Lambda!";
    }
}`
  } else if (runtime.startsWith('ruby')) {
    newFunction.value.handler = 'lambda_function.lambda_handler'
    newFunction.value.code = `def lambda_handler(event:, context:)
    {
        statusCode: 200,
        body: 'Hello from Lambda!'
    }
end`
  }
}

const validateJson = (value) => {
  try {
    JSON.parse(value)
    return true
  } catch (error) {
    return 'JSON inválido'
  }
}

const loadFunctions = async () => {
  loading.value = true
  try {
    const response = await lambda.value.send(new ListFunctionsCommand({}))
    functions.value = response.Functions || []
  } catch (error) {
    console.error('Error loading functions:', error)
    appStore.showSnackbar('Erro ao carregar funções', 'error')
  } finally {
    loading.value = false
  }
}

const viewFunction = async (func) => {
  try {
    const response = await lambda.value.send(new GetFunctionCommand({ FunctionName: func.FunctionName }))
    currentFunction.value = response.Configuration
    detailsDialog.value = true
  } catch (error) {
    console.error('Error getting function details:', error)
    appStore.showSnackbar('Erro ao carregar detalhes da função', 'error')
  }
}

const invokeFunction = (func) => {
  functionToInvoke.value = func
  invokePayload.value = JSON.stringify({
    "key1": "value1",
    "key2": "value2"
  }, null, 2)
  invokeDialog.value = true
}

const executeFunctionInvoke = async () => {
  if (!functionToInvoke.value || !isValidJson.value) return
  
  invoking.value = true
  try {
    const params = {
      FunctionName: functionToInvoke.value.FunctionName,
      Payload: invokePayload.value
    }
    
    // Only add InvocationType if it's not the default to avoid CORS issues
    if (invocationType.value !== 'RequestResponse') {
      params.InvocationType = invocationType.value
    }
    
    // Add LogType only if supported
    if (invocationType.value === 'RequestResponse') {
      params.LogType = 'Tail'
    }
    
    const response = await lambda.value.send(new InvokeCommand(params))
    invokeResult.value = response
    
    invokeDialog.value = false
    resultDialog.value = true
    
    appStore.showSnackbar('Função invocada com sucesso!', 'success')
  } catch (error) {
    console.error('Error invoking function:', error)
    appStore.showSnackbar('Erro ao invocar função', 'error')
  } finally {
    invoking.value = false
  }
}

const deleteFunction = async (functionName) => {
  if (!confirm(`Deseja realmente deletar a função "${functionName}"?`)) return
  
  try {
    await lambda.value.send(new DeleteFunctionCommand({ FunctionName: functionName }))
    appStore.showSnackbar(`Função "${functionName}" deletada com sucesso!`, 'success')
    await loadFunctions()
  } catch (error) {
    console.error('Error deleting function:', error)
    appStore.showSnackbar('Erro ao deletar função', 'error')
  }
}

const getStateColor = (state) => {
  switch (state) {
    case 'Active': return 'success'
    case 'Pending': return 'warning'
    case 'Inactive': return 'error'
    case 'Failed': return 'error'
    default: return 'grey'
  }
}

const decodeLogs = (logResult) => {
  try {
    return atob(logResult)
  } catch {
    return logResult
  }
}

const formatJsonResponse = (payload) => {
  try {
    // AWS SDK v3 returns Payload as Uint8Array, need to decode it
    let payloadString = ''
    
    if (payload instanceof Uint8Array) {
      // Convert Uint8Array to string
      payloadString = new TextDecoder().decode(payload)
    } else if (typeof payload === 'string') {
      payloadString = payload
    } else {
      // If it's already an object, stringify it
      return JSON.stringify(payload, null, 2)
    }
    
    // Try to parse as JSON for pretty formatting
    const parsed = JSON.parse(payloadString)
    return JSON.stringify(parsed, null, 2)
  } catch (error) {
    // If JSON parsing fails, return as string
    if (payload instanceof Uint8Array) {
      return new TextDecoder().decode(payload)
    }
    return String(payload)
  }
}

// Create Function Functions
const addEnvironmentVariable = () => {
  environmentVariables.value.push({ key: '', value: '' })
}

const removeEnvironmentVariable = (index) => {
  environmentVariables.value.splice(index, 1)
}

const closeCreateDialog = () => {
  createFunctionDialog.value = false
  resetCreateForm()
}

const resetCreateForm = () => {
  newFunction.value = {
    functionName: '',
    runtime: 'python3.9',
    handler: 'index.lambda_handler',
    timeout: 30,
    memorySize: 128,
    role: 'arn:aws:iam::123456789012:role/lambda-role',
    description: '',
    code: `def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }`
  }
  environmentVariables.value = []
}

const createFunction = async () => {
  if (!isCreateFormValid.value) return
  
  try {
    creating.value = true
    
    // Create ZIP file with the function code
    const zip = new JSZip()
    
    // Determine filename based on runtime
    let filename = 'index.py'
    if (newFunction.value.runtime.startsWith('nodejs')) {
      filename = 'index.js'
    } else if (newFunction.value.runtime.startsWith('java')) {
      filename = 'Function.java'
    } else if (newFunction.value.runtime.startsWith('dotnet')) {
      filename = 'Function.cs'
    } else if (newFunction.value.runtime.startsWith('go')) {
      filename = 'main.go'
    } else if (newFunction.value.runtime.startsWith('ruby')) {
      filename = 'lambda_function.rb'
    }
    
    zip.file(filename, newFunction.value.code)
    
    // Generate ZIP file as Uint8Array
    const zipContent = await zip.generateAsync({ type: 'uint8array' })
    
    // Prepare environment variables
    const environment = {}
    if (environmentVariables.value.length > 0) {
      const validEnvVars = environmentVariables.value.filter(env => env.key && env.value)
      if (validEnvVars.length > 0) {
        environment.Variables = {}
        validEnvVars.forEach(env => {
          environment.Variables[env.key] = env.value
        })
      }
    }
    
    // Prepare function parameters
    const params = {
      FunctionName: newFunction.value.functionName,
      Runtime: newFunction.value.runtime,
      Role: newFunction.value.role,
      Handler: newFunction.value.handler,
      Code: {
        ZipFile: zipContent
      },
      Timeout: newFunction.value.timeout,
      MemorySize: newFunction.value.memorySize
    }
    
    if (newFunction.value.description) {
      params.Description = newFunction.value.description
    }
    
    if (Object.keys(environment).length > 0) {
      params.Environment = environment
    }
    
    await lambda.value.send(new CreateFunctionCommand(params))
    
    appStore.showSnackbar('Função Lambda criada com sucesso!', 'success')
    closeCreateDialog()
    await loadFunctions()
  } catch (error) {
    console.error('Erro ao criar função:', error)
    appStore.showSnackbar('Erro ao criar função Lambda', 'error')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  loadFunctions()
})
</script>
