import { create } from 'zustand'

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('msp_token') || null,
  user: JSON.parse(localStorage.getItem('msp_user') || 'null'),
  isAuthenticated: !!localStorage.getItem('msp_token'),

  login: (token, user) => {
    localStorage.setItem('msp_token', token)
    localStorage.setItem('msp_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('msp_token')
    localStorage.removeItem('msp_user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  hasRole: (...roles) => {
    const { user } = get()
    return user ? roles.includes(user.role) : false
  },

  isAdmin: () => {
    const { user } = get()
    return user?.role === 'admin'
  },

  isStaff: () => {
    const { user } = get()
    return user?.role === 'staff'
  },
}))

export { useAuthStore }
export default useAuthStore
