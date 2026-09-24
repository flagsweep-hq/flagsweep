export function connectionStringFor(host: string, secret = 'dGVzdA==') {
  return `Endpoint=https://${host};Id=test;Secret=${secret}`
}
