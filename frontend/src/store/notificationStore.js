import { create } from 'zustand'
import axios from '../api/axios'

const useNotificationStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  fetchUnreadCount: async () => {
    try {
      const res = await axios.get('/notifications/unread-count')
      if (res.data.success) {
        set({ unreadCount: res.data.data.count })
      }
    } catch {
      // silently fail
    }
  }
}))

export default useNotificationStore
