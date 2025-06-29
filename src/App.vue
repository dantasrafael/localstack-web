<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      app
      clipped
      :width="280"
    >
      <v-list nav dense>
        <v-list-item
          :to="'/'"
          router
          exact
        >
          <template v-slot:prepend>
            <v-icon>mdi-view-dashboard</v-icon>
          </template>
          <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>
      </v-list>


      <v-divider></v-divider>
      
      <v-list nav dense>
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :to="item.to"
          router
          exact
        >
          <template v-slot:prepend>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar
      app
      clipped-left
      color="primary"
      dark
    >
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>      
      
      <v-toolbar-title class="text-h4">
        <div class="d-flex align-center">
          <img 
            :src="logoImage" 
            alt="LocalStack Logo" 
            height="45"
            class="mr-2"
          />
          LocalStack Web
        </div>
      </v-toolbar-title>
      
      <v-spacer></v-spacer>
      
      <v-chip
        :color="connectionStatus === 'connected' ? 'success' : 'error'"
        :style="{ marginRight: '16px' }"
        variant="elevated"
        size="small"
      >
        <v-icon start>
          {{ connectionStatus === 'connected' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        {{ connectionStatus === 'connected' ? 'Conectado' : 'Desconectado' }}
      </v-chip>


      <v-tooltip :text="isDark ? 'Modo Claro' : 'Modo Escuro'" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon @click="toggleTheme" v-bind="props">
            <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Configurações" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon @click="openSettings" v-bind="props">
            <v-icon>mdi-cog</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Sobre" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon @click="$router.push('/about')" v-bind="props">
            <v-icon>mdi-information</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

    </v-app-bar>

    <v-main>
      <v-container fluid>
        <router-view></router-view>
      </v-container>
    </v-main>

    <!-- Settings Dialog -->
    <v-dialog v-model="settingsDialog" max-width="500">
      <v-card>
        <v-card-title>
          <span class="text-h5">Configurações</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="localstackEndpoint"
            label="LocalStack Endpoint"
            placeholder="http://localhost:4566"
            prepend-icon="mdi-server"
            @keyup.enter="saveSettings"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="settingsDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="saveSettings">Salvar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { useAppStore } from '@/stores/app'
import { storeToRefs } from 'pinia'
import logoImage from '@/assets/localstack-logo.png'

const theme = useTheme()
const appStore = useAppStore()
const { connectionStatus, snackbar } = storeToRefs(appStore)

const drawer = ref(true)
const settingsDialog = ref(false)
const localstackEndpoint = ref('')

const isDark = computed(() => theme.global.name.value === 'dark')

const menuItems = [
  { title: 'DynamoDB Tables', icon: 'mdi-table', to: '/dynamodb' },
  { title: 'Kinesis Streams', icon: 'mdi-view-stream', to: '/kinesis' },
  { title: 'KMS Keys', icon: 'mdi-key', to: '/kms' },
  { title: 'Lambda Functions', icon: 'mdi-function', to: '/lambda' },
  { title: 'S3 Buckets', icon: 'mdi-folder-multiple', to: '/s3' },
  { title: 'SES Emails', icon: 'mdi-email-multiple', to: '/ses' },
  { title: 'SNS Topics', icon: 'mdi-forum', to: '/sns' },
  { title: 'SQS Queues', icon: 'mdi-format-list-bulleted', to: '/sqs' },
]

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

const openSettings = () => {
  localstackEndpoint.value = appStore.endpoint
  settingsDialog.value = true
}

const saveSettings = () => {
  appStore.setEndpoint(localstackEndpoint.value)
  settingsDialog.value = false
  appStore.showSnackbar('Configurações salvas com sucesso!', 'success')
}

onMounted(() => {
  appStore.checkConnection()
})
</script>

<style scoped>
.v-navigation-drawer {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
