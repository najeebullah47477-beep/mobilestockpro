export const useInputMask = () => {
  const maskPhone = (value) => value.replace(/[^0-9+\-]/g, '').slice(0, 14)

  const maskCNIC = (value) => {
    let digits = value.replace(/[^0-9]/g, '')
    if (digits.length > 5) digits = digits.slice(0, 5) + '-' + digits.slice(5)
    if (digits.length > 13) digits = digits.slice(0, 13) + '-' + digits.slice(13)
    return digits.slice(0, 15)
  }

  const maskEmail = (value) => value.toLowerCase().trim()

  const maskSKU = (value) => value.toUpperCase().replace(/[^A-Z0-9\-]/g, '')

  const maskIMEI = (value) => value.replace(/[^0-9]/g, '').slice(0, 15)

  const maskUsername = (value) =>
    value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50)

  const maskPrice = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return parts[0] + '.' + parts[1]
    if (parts[1]?.length > 2) return parts[0] + '.' + parts[1].slice(0, 2)
    return cleaned
  }

  const maskPositiveInt = (value) => value.replace(/[^0-9]/g, '')

  return {
    maskPhone, maskCNIC, maskEmail, maskSKU,
    maskIMEI, maskUsername, maskPrice, maskPositiveInt,
  }
}
