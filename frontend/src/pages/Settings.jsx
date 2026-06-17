import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import useAuthStore from '../store/authStore'
import api from '../api/axios'
import FormField from '../components/FormField'
import PasswordStrength from '../components/PasswordStrength'
import { useInputMask } from '../hooks/useInputMask'
import { useAsyncValidation } from '../hooks/useAsyncValidation'

const roleBadgeColors = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  staff: 'bg-green-100 text-green-700',
}

const EyeIcon = () => (
  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

export default function Settings() {
  const user = useAuthStore((state) => state.user)
  const [dbStatus, setDbStatus] = useState(null)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [resetPwModalOpen, setResetPwModalOpen] = useState(false)
  const [resetPwUser, setResetPwUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [showUserPw, setShowUserPw] = useState(false)
  const [showResetPw, setShowResetPw] = useState(false)

  const { maskEmail, maskUsername } = useInputMask()
  const { loading: asyncLoading, results: asyncResults, checkAvailability, resetResult } = useAsyncValidation()

  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    watch: watchPw,
    reset: resetPw,
    formState: { errors: pwErrors, touchedFields: pwTouched },
  } = useForm({ mode: 'onChange' })

  const newPwValue = watchPw('newPassword', '')

  const {
    register: registerUser,
    handleSubmit: handleUserSubmit,
    watch: watchUser,
    reset: resetUserForm,
    setValue: setUserValue,
    formState: { errors: userErrors, touchedFields: userTouched },
  } = useForm({ mode: 'onChange' })

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    watch: watchReset,
    reset: resetResetForm,
    formState: { errors: resetErrors, touchedFields: resetTouched },
  } = useForm({ mode: 'onChange' })

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health')
        setDbStatus(response.data?.database === 'connected' ? 'connected' : 'disconnected')
      } catch {
        setDbStatus('disconnected')
      }
    }
    checkHealth()
  }, [])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await api.get('/auth/users')
      if (res.data.success) {
        setUsers(res.data.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch users')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
    }
  }, [user])

  const onSubmitPassword = async (data) => {
    try {
      await api.put('/auth/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      })
      toast.success('Password changed successfully')
      resetPw({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to change password'
      toast.error(message)
    }
  }

  const openAddUserModal = () => {
    setEditingUser(null)
    resetUserForm({ full_name: '', username: '', email: '', password: '', role: 'staff' })
    setUserModalOpen(true)
  }

  const openEditUserModal = (u) => {
    setEditingUser(u)
    resetUserForm({ full_name: u.full_name, username: u.username, email: u.email, role: u.role, password: '' })
    setUserModalOpen(true)
  }

  const onUserFormSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editingUser) {
        const payload = { full_name: data.full_name, email: data.email, role: data.role }
        await api.put(`/auth/users/${editingUser.id}`, payload)
        toast.success('User updated successfully')
      } else {
        await api.post('/auth/users', data)
        toast.success('User created successfully')
      }
      setUserModalOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async (u) => {
    if (!window.confirm(`Deactivate user "${u.full_name}"?`)) return
    try {
      await api.delete(`/auth/users/${u.id}`)
      toast.success('User deactivated successfully')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate user')
    }
  }

  const openResetPwModal = (u) => {
    setResetPwUser(u)
    resetResetForm({ new_password: '' })
    setResetPwModalOpen(true)
  }

  const onResetPwSubmit = async (data) => {
    setSubmitting(true)
    try {
      await api.put(`/auth/users/${resetPwUser.id}/reset-password`, { new_password: data.new_password })
      toast.success('Password reset successfully')
      setResetPwModalOpen(false)
      setResetPwUser(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  const borderClass = (field, errors, touched) =>
    errors?.[field] && touched?.[field] ? 'border-red-400' : 'border-gray-300'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

          <form onSubmit={handlePwSubmit(onSubmitPassword)} className="space-y-4">
            <FormField
              label="Old Password / Purana Password"
              error={pwErrors.oldPassword?.message}
              touched={pwTouched.oldPassword}
              required
            >
              <input
                type="password"
                {...registerPw('oldPassword', {
                  required: 'Purana password zaroori hai (Old password is required)',
                })}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            </FormField>

            <FormField
              label="New Password / Naya Password"
              error={pwErrors.newPassword?.message}
              touched={pwTouched.newPassword}
              required
            >
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  {...registerPw('newPassword', {
                    required: 'Naya password zaroori hai (New password is required)',
                    minLength: { value: 6, message: 'Password kam az kam 6 characters ka hona chahiye (Password must be at least 6 characters)' },
                  })}
                  className={`w-full px-4 py-2.5 pr-10 border ${borderClass('newPassword', pwErrors, pwTouched)} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showNewPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </FormField>
            <PasswordStrength password={newPwValue} />

            <FormField
              label="Confirm New Password / Naya Password Confirm Karein"
              error={pwErrors.confirmNewPassword?.message}
              touched={pwTouched.confirmNewPassword}
              required
            >
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  {...registerPw('confirmNewPassword', {
                    required: 'Password confirm karein (Please confirm password)',
                    validate: (value) => value === newPwValue || 'Passwords match nahi kar rahe (Passwords do not match)',
                  })}
                  className={`w-full px-4 py-2.5 pr-10 border ${borderClass('confirmNewPassword', pwErrors, pwTouched)} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </FormField>

            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-6 rounded-lg transition"
            >
              Update Password
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">App Info</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">App Version</span>
                <span className="text-sm font-medium text-gray-900">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Database</span>
                {dbStatus === null ? (
                  <span className="text-sm text-gray-400">Checking...</span>
                ) : (
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      dbStatus === 'connected'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Backend URL</span>
                <span className="text-sm font-mono text-gray-600">
                  {import.meta.env.VITE_API_URL || '/api'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <button
              onClick={openAddUserModal}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm transition-colors duration-150"
            >
              Add User
            </button>
          </div>

          {usersLoading ? (
            <div className="text-center py-8 text-sm text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleBadgeColors[u.role] || 'bg-gray-100 text-gray-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openResetPwModal(u)}
                            className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors duration-150"
                          >
                            Reset Password
                          </button>
                          {u.is_active && u.id !== user?.id && (
                            <button
                              onClick={() => handleDeactivate(u)}
                              className="px-3 py-1.5 text-xs font-medium text-danger-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit User Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${userModalOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => {
          setUserModalOpen(false)
          resetResult('username')
          resetResult('email')
        }} />
        <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 z-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingUser ? 'Edit User' : 'Add User'}</h3>
          <form onSubmit={handleUserSubmit(onUserFormSubmit)} className="space-y-4">
            <FormField
              label="Full Name / Poora Naam"
              error={userErrors.full_name?.message}
              touched={userTouched.full_name}
              required
            >
              <input
                {...registerUser('full_name', {
                  required: 'Name zaroori hai (Name is required)',
                  minLength: { value: 2, message: 'Name kam az kam 2 characters ka hona chahiye (Name must be at least 2 characters)' },
                  maxLength: { value: 150, message: 'Name zyada se zyada 150 characters ka ho sakta hai (Name can be at most 150 characters)' },
                  pattern: { value: /^[a-zA-Z0-9\s\-'.]+$/, message: 'Name mein sirf letters, numbers, spaces, hyphens, apostrophes aur dots allowed hain (Only letters, numbers, spaces, hyphens, apostrophes and dots are allowed)' },
                })}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                onBlur={(e) => {
                  const capitalized = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase())
                  if (capitalized !== e.target.value) {
                    setUserValue('full_name', capitalized, { shouldValidate: true })
                  }
                }}
              />
            </FormField>

            {(() => {
              const usernameReg = registerUser('username', {
                required: 'Username zaroori hai (Username is required)',
                minLength: { value: 3, message: 'Username kam az kam 3 characters ka hona chahiye (Username must be at least 3 characters)' },
                maxLength: { value: 50, message: 'Username zyada se zyada 50 characters ka ho sakta hai (Username can be at most 50 characters)' },
                pattern: { value: /^[a-z0-9_]+$/, message: 'Username mein sirf chhotay letters, numbers aur underscore (_) allowed hain (Only lowercase letters, numbers, and underscore (_) are allowed)' },
              })
              const origUserChange = usernameReg.onChange
              const origUserBlur = usernameReg.onBlur

              return (
                <FormField
                  label="Username"
                  error={userErrors.username?.message}
                  touched={userTouched.username}
                  loading={asyncLoading.username}
                  success={asyncResults.username?.available === true && asyncResults.username?.checked}
                  required
                >
                  <input
                    {...usernameReg}
                    disabled={!!editingUser}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition ${editingUser ? 'bg-gray-100' : ''}`}
                    onChange={(e) => {
                      origUserChange(e)
                      const masked = maskUsername(e.target.value)
                      if (masked !== e.target.value) {
                        setUserValue('username', masked)
                      }
                      if (!editingUser) {
                        resetResult('username')
                      }
                    }}
                    onBlur={(e) => {
                      origUserBlur(e)
                      if (!editingUser && e.target.value) {
                        checkAvailability('/auth/check-username', { username: e.target.value, exclude_id: editingUser?.id }, 'username')
                      }
                    }}
                  />
                </FormField>
              )
            })()}

            {(() => {
              const emailReg = registerUser('email', {
                required: 'Email zaroori hai (Email is required)',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email ka format sahi nahi hai (Invalid email format)' },
              })
              const origEmailChange = emailReg.onChange
              const origEmailBlur = emailReg.onBlur

              return (
                <FormField
                  label="Email"
                  error={userErrors.email?.message}
                  touched={userTouched.email}
                  loading={asyncLoading.email}
                  success={asyncResults.email?.available === true && asyncResults.email?.checked}
                  required
                >
                  <input
                    type="email"
                    {...emailReg}
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    onChange={(e) => {
                      origEmailChange(e)
                      const masked = maskEmail(e.target.value)
                      if (masked !== e.target.value) {
                        setUserValue('email', masked)
                      }
                      resetResult('email')
                    }}
                    onBlur={(e) => {
                      origEmailBlur(e)
                      if (e.target.value) {
                        checkAvailability('/auth/check-email', { email: e.target.value, exclude_id: editingUser?.id }, 'email')
                      }
                    }}
                  />
                </FormField>
              )
            })()}

            {!editingUser && (
              <FormField
                label="Password / Password"
                error={userErrors.password?.message}
                touched={userTouched.password}
                required
              >
                <div className="relative">
                  <input
                    type={showUserPw ? 'text' : 'password'}
                    {...registerUser('password', {
                      required: 'Password zaroori hai (Password is required)',
                      minLength: { value: 6, message: 'Password kam az kam 6 characters ka hona chahiye (Password must be at least 6 characters)' },
                    })}
                    className={`w-full px-4 py-2.5 pr-10 border ${borderClass('password', userErrors, userTouched)} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showUserPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </FormField>
            )}
            {!editingUser && <PasswordStrength password={watchUser('password', '')} />}

            <FormField label="Role / Kirdar">
              <select
                {...registerUser('role')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setUserModalOpen(false)
                  resetResult('username')
                  resetResult('email')
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg text-sm transition-colors duration-150"
              >
                {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Reset Password Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${resetPwModalOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setResetPwModalOpen(false)} />
        <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 z-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Password - {resetPwUser?.full_name}</h3>
          <form onSubmit={handleResetSubmit(onResetPwSubmit)} className="space-y-4">
            <FormField
              label="New Password / Naya Password"
              error={resetErrors.new_password?.message}
              touched={resetTouched.new_password}
              required
            >
              <div className="relative">
                <input
                  type={showResetPw ? 'text' : 'password'}
                  {...registerReset('new_password', {
                    required: 'Naya password zaroori hai (New password is required)',
                    minLength: { value: 6, message: 'Password kam az kam 6 characters ka hona chahiye (Password must be at least 6 characters)' },
                  })}
                  className={`w-full px-4 py-2.5 pr-10 border ${borderClass('new_password', resetErrors, resetTouched)} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition`}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showResetPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </FormField>
            <PasswordStrength password={watchReset('new_password', '')} />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setResetPwModalOpen(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg text-sm transition-colors duration-150"
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
