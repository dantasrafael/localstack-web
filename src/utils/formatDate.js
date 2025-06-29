export const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('pt-BR')
}
