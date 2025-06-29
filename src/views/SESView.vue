<template>
  <div>
    <v-row>
      <v-col cols="12" class="bg-secondary opacity-50">
        <div class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-email-multiple</v-icon>
            <h1 class="text-h5">SES Emails</h1>
          </div>
          <div class="d-flex align-center ga-2">
            <v-btn color="primary" @click="identitiesDialog = true">
              <v-icon class="mr-2">mdi-email-seal-outline</v-icon>
              Identidades
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filter -->
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          class="mr-4"
          label="Buscar emails (id, remetente, assunto)"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
        >
          <template v-slot:append>
            <v-btn @click="loadEmails" :loading="loading" variant="outlined">
              <v-icon class="mr-2">mdi-refresh</v-icon>
              Atualizar
            </v-btn>
          </template>
        </v-text-field>
      </v-col>
    </v-row>

    <!-- Email List -->
    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="message in filteredMessages" :key="message.Id">
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ message.Subject }}</span>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" size="small"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="openMessageDetails(message)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-email-open-outline</v-icon>
                    Detalhes
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="deleteMessage(message)">
                  <v-list-item-title>
                    <v-icon class="mr-2">mdi-delete</v-icon>
                    Deletar
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-title>

          <v-card-text>
            <div class="text-caption text-grey text-truncate">
              Destino: {{ message.Destination.ToAddresses.join(', ') }}
            </div>
            <div class="text-caption text-grey">Enviado por: {{ message.Source }}</div>
            <div class="text-caption text-grey">Criado em: {{ formatDate(message.Timestamp) }}</div>
            <div class="text-caption text-grey">Id: {{ message.Id }}</div>
            <div class="mt-2">
              <v-chip v-if="message.Body.text_part" size="small" class="mr-2">
                <v-icon class="mr-1" size="small">mdi-text</v-icon>
                Text body
              </v-chip>
              <v-chip v-if="message.Body.html_part" size="small">
                <v-icon class="mr-1" size="small">mdi-code-block-tags</v-icon>
                HTML body
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!loading && messages.length === 0">
      <v-col cols="12" class="text-center">
        <v-icon size="64" color="grey-lighten-1">mdi-email-open-multiple-outline</v-icon>
        <h3 class="text-h5 mt-4 text-grey">Nenhum email encontrado</h3>
        <p class="text-grey">Quando novos emails forem enviados, eles aparecerão aqui</p>
      </v-col>
    </v-row>

    <!-- Identities Dialog -->
    <v-dialog v-model="identitiesDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Identidades</span>
          <div>
            <v-btn
              color="primary"
              variant="outlined"
              class="mr-2"
              @click="verifyIdentityDialog = true"
            >
              <v-icon class="mr-2">mdi-email-seal-outline</v-icon>
              Verificar Identidade
            </v-btn>
            <v-btn icon @click="identitiesDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-card-text style="height: 400px">
          <v-list v-if="identities.length > 0">
            <v-list-item v-for="identity in identities" :key="identity" class="mb-2">
              <template v-slot:prepend>
                <v-icon>mdi-file</v-icon>
              </template>
              <v-list-item-title>{{ identity }}</v-list-item-title>
              <v-list-item-subtitle> </v-list-item-subtitle>
              <template v-slot:append>
                <v-btn icon size="small" @click="deleteIdentity(identity)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>

          <div v-else class="text-center text-grey mt-8">
            <v-icon size="48">mdi-email-off-outline</v-icon>
            <p class="mt-2">Nenhuma identidade</p>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Verify Identity Dialog -->
    <v-dialog v-model="verifyIdentityDialog" max-width="500">
      <v-card>
        <v-card-title>Verificar Identidade</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="emailAddress"
            label="Endereço de E-mail"
            :rules="emailAddressRules"
            @keyup.enter="verifyIdentity"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="verifyIdentityDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="verifyIdentity" :loading="verifying">Verificar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Message Details Dialog -->
    <v-dialog v-model="messageDetailsDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-truncate">Detalhes do E-mail: {{ currentMessage.Subject }}</span>
          <v-btn icon @click="messageDetailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text style="min-height: 400px; max-height: 500px">
          <div class="d-flex flex-column ga-2">
            <div>
              <p class="font-weight-bold">Id</p>
              <p>{{ currentMessage.Id }}</p>
            </div>
            <div>
              <p class="font-weight-bold">Enviado por</p>
              <p>{{ currentMessage.Source }}</p>
            </div>
            <div>
              <p class="font-weight-bold">Destino(s)</p>
              <p>{{ currentMessage.Destination.ToAddresses.join(", ") }}</p>
            </div>
            <div>
              <p class="font-weight-bold">Assunto</p>
              <p>{{ currentMessage.Subject }}</p>
            </div>
            <div>
              <p class="font-weight-bold">Data</p>
              <p>{{ formatDate(currentMessage.Timestamp) }}</p>
            </div>
            <div>
              <p class="font-weight-bold">Body - Texto</p>
              <p>{{ currentMessage.Body.text_part || 'Não disponível' }}</p>
            </div>
            <div>
              <p class="font-weight-bold">Body - HTML</p>
              <v-btn
                v-if="currentMessage.Body.html_part"
                variant="text"
                color="primary"
                @click="messageHtmlBodyDialog = true"
              >
                Visualizar
              </v-btn>
              <p v-else>Não disponível</p>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Message HTML Body Dialog -->
    <v-dialog v-model="messageHtmlBodyDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-truncate">Body HTML</span>
          <v-btn icon @click="messageHtmlBodyDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <div v-html="currentMessage.Body.html_part"></div>
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
  DeleteIdentityCommand,
  ListIdentitiesCommand,
  VerifyEmailIdentityCommand,
} from '@aws-sdk/client-ses'
import { deleteSesMessage, getSesData } from '@/utils/api.js'
import { formatDate } from '../utils/formatDate.js'

const appStore = useAppStore()
const { ses } = storeToRefs(appStore)

const identities = ref([])
const messages = ref([])
const loading = ref(false)
const searchQuery = ref('')
const identitiesDialog = ref(false)
const verifyIdentityDialog = ref(false)
const emailAddress = ref('')
const verifying = ref(false)
const currentMessage = ref(null)
const messageDetailsDialog = ref(false)
const messageHtmlBodyDialog = ref(false)

const emailAddressRules = [
  v => !!v || 'Endereço de e-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'Endereço de e-mail deve ser válido',
  v => (v && v.length <= 254) || 'Endereço de e-mail deve ter no máximo 254 caracteres',
  v => !v.includes(' ') || 'Endereço de e-mail não pode conter espaços',
]

const filteredMessages = computed(() => {
  if (!searchQuery.value) return messages.value

  return messages.value.filter(message => {
    const searchLower = searchQuery.value.toLowerCase()
    return (
      message.Id.toLowerCase().includes(searchLower) ||
      message.Source.toLowerCase().includes(searchLower) ||
      message.Subject.toLowerCase().includes(searchLower)
    )
  })
})

const loadIdentities = async () => {
  loading.value = true
  try {
    const response = await ses.value.send(
      new ListIdentitiesCommand({ IdentityType: 'EmailAddress' })
    )
    identities.value = response.Identities || []
  } catch (error) {
    console.error('Error loading identities:', error)
    appStore.showSnackbar('Erro ao carregar identidades', 'error')
  } finally {
    loading.value = false
  }
}

const loadEmails = async () => {
  loading.value = true
  try {
    const response = await getSesData()
    messages.value = response.messages || []
  } catch (error) {
    console.error('Error loading emails:', error)
    appStore.showSnackbar('Erro ao carregar emails', 'error')
  } finally {
    loading.value = false
  }
}

const verifyIdentity = async () => {
  if (!emailAddress.value) return

  verifying.value = true
  try {
    await ses.value.send(new VerifyEmailIdentityCommand({ EmailAddress: emailAddress.value }))
    appStore.showSnackbar(`Identidade "${emailAddress.value}" verificada com sucesso!`, 'success')
    verifyIdentityDialog.value = false
    emailAddress.value = ''
    await loadIdentities() // Refresh the identities list
  } catch (error) {
    console.error('Error verifying identity:', error)
    appStore.showSnackbar('Erro ao verificar identidade', 'error')
  } finally {
    verifying.value = false
  }
}

const deleteIdentity = async identity => {
  if (!confirm(`Deseja realmente deletar a identidade "${identity}"?`)) return

  try {
    await ses.value.send(new DeleteIdentityCommand({ Identity: identity }))
    appStore.showSnackbar(`Identidade "${identity}" deletada com sucesso!`, 'success')
    await loadIdentities() // Refresh the identities list
  } catch (error) {
    console.error('Error deleting identity:', error)
    appStore.showSnackbar('Erro ao deletar identidade', 'error')
  }
}

const deleteMessage = async message => {
  const messageIdentifier = `${message.Subject} (id: ${message.Id})`
  if (!confirm(`Deseja realmente deletar o e-mail "${messageIdentifier}"?`)) return

  try {
    await deleteSesMessage({ id: message.Id })
    appStore.showSnackbar(`E-mail "${messageIdentifier}" deletado com sucesso!`, 'success')
    await loadEmails() // Refresh the email list
  } catch (error) {
    console.error('Error deleting email:', error)
    appStore.showSnackbar('Erro ao deletar e-mail', 'error')
  }
}

const openMessageDetails = message => {
  currentMessage.value = message
  messageDetailsDialog.value = true
}

onMounted(() => {
  loadEmails()
  loadIdentities()
})
</script>
