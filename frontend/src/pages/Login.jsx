import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { useAuthStore } from '../store/authStore'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      const response = await api.post('/auth/login', {
        username: data.username,
        password: data.password
      })

      if (response.data.success) {
        const { token, user } = response.data.data
        login(token, user)
        toast.success(`Welcome, ${user.full_name}!`)
        navigate('/')
      } else {
        toast.error(response.data.error || 'Login failed')
      }
    } catch (error) {
      const msg = error.response?.data?.error || 'Login failed. Check credentials.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📱</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            MobileStock Pro
          </h1>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Username
            </label>
            <input
              {...register('username', { required: 'Username is required' })}
              placeholder="Enter username"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: `1px solid ${errors.username ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {errors.username && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.username.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                {...register('password', { required: 'Password is required' })}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  border: `1px solid ${errors.password ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#166534',
          textAlign: 'center'
        }}>
          <strong></strong><br />
          
        </div>
      </div>
    </div>
  )
}

export default Login
