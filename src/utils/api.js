import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_LOCALSTACK_ENDPOINT || 'http://localhost:4566',
  timeout: 10000, // 10 seconds
})

export const getSesData = async (params = {}) => {
  try {
    const response = await api.get('/_aws/ses', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching SES data:', error);
    throw error
  }
}

export const deleteSesMessage = async (params = {}) => {
  try {
    await api.delete('/_aws/ses', { params })
  } catch (error) {
    console.error('Error deleting SES message:', error);
    throw error
  }
}
