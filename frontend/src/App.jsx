import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Categories from './pages/Categories'
import Brands from './pages/Brands'
import Suppliers from './pages/Suppliers'
import Customers from './pages/Customers'
import Sales from './pages/Sales'
import SaleDetail from './pages/SaleDetail'
import Purchases from './pages/Purchases'
import PurchaseDetail from './pages/PurchaseDetail'
import Expenses from './pages/Expenses'
import Warranties from './pages/Warranties'
import Notifications from './pages/Notifications'
import Reports from './pages/Reports'
import DeleteHistory from './pages/DeleteHistory'
import Settings from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="customers" element={<Customers />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sales/:id" element={<SaleDetail />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="purchases/:id" element={<PurchaseDetail />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="warranties" element={<Warranties />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route
            path="delete-history"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DeleteHistory />
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
