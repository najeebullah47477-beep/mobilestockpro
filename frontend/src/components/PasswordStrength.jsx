import { useMemo } from 'react'

const getStrength = (password) => {
  if (!password) return { level: 0, label: '', color: 'bg-gray-200', textColor: 'text-gray-400' }
  const len = password.length
  if (len < 6) return { level: 1, label: 'Weak (Kamzor)', color: 'bg-red-500', textColor: 'text-red-500' }
  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasMix = hasLetters && hasNumbers
  if (len >= 8 && hasMix) return { level: 3, label: 'Strong (Mazboot)', color: 'bg-green-500', textColor: 'text-green-500' }
  return { level: 2, label: 'Medium (Theek)', color: 'bg-yellow-500', textColor: 'text-yellow-500' }
}

export default function PasswordStrength({ password }) {
  const strength = useMemo(() => getStrength(password), [password])

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i <= strength.level ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs mt-1 ${strength.textColor}`}>{strength.label}</p>
    </div>
  )
}
