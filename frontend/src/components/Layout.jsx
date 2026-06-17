import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{
          flex: 1,
          padding: '24px',
          backgroundColor: '#f3f4f6',
          overflowY: 'auto'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
