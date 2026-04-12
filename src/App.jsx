import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import './App.css'
import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useRef, useMemo } from 'react'; 

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  // 1. 状态管理
  // state management
  const [activeTab, setActiveTab] = useState('report')
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 表单相关状态
  // Form-related status
  const [category, setCategory] = useState('Facility Damage')
  const [inputText, setInputText] = useState('')
  const [photo, setPhoto] = useState(null)

  // 网络状态检测
  // Network status detection
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // 2. 从 Dexie 数据库实时读取数据
  // Real-time data reading from Dexie database
  const tickets = useLiveQuery(() => db.tickets.toArray())

  // 3. 监听网络上线/离线状态
  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      // 网络恢复时，将所有 'Pending Sync' 的工单批量更新为 'Synced'
      // When the network is restored, batch update all 'Pending Sync' tickets to 'Synced'
      try {
        const updatedCount = await db.tickets
          .where('syncStatus')
          .equals('Pending Sync')
          .modify({ syncStatus: 'Synced' })
        if (updatedCount > 0) {
          alert(`Network restored! ${updatedCount} offline record(s) have been synced.`)
        }
      } catch (err) {
        console.error('Failed to sync pending records:', err)
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, []) 

  // 4.  (Hardware API: Geolocation)
  const handleGetLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation not supported.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude.toFixed(5),
          lng: position.coords.longitude.toFixed(5)
        })
        setLoading(false)
        // (Hardware API: Vibration API)
        navigator.vibrate?.(100)
      },
      () => {
        setError('Location access denied.')
        setLoading(false)
      }
    )
  }

  // 5. 相机与图片压缩 (Hardware API: Camera)
  // Photo and album
  const handlePhotoCapture = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const img = new Image()
        img.src = reader.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 800
          const scaleSize = MAX_WIDTH / img.width
          canvas.width = MAX_WIDTH
          canvas.height = img.height * scaleSize

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          const compressedPhoto = canvas.toDataURL('image/jpeg', 0.7)
          setPhoto(compressedPhoto)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // 6. CRUD: Create (Add new ticket)
  const handleAddTicket = async () => {
    if (!inputText.trim()) {
      alert('Please enter a description!')
      return
    }

    try {
      await db.tickets.add({
        category: category,
        description: inputText,
        coords: location ? `${location.lat}, ${location.lng}` : 'No location provided',
        photoData: photo,
        isFixed: false,
        date: new Date().toLocaleString(),
        syncStatus: isOnline ? 'Synced' : 'Pending Sync'
      })

      setCategory('Facility Damage')
      setInputText('')
      setLocation(null)
      setPhoto(null)

      // A vibration feedback is triggered when the submission is successful. 
      // (Hardware API: Vibration API) (Not useful for implementation)
      navigator.vibrate?.(200)

      alert(isOnline ? 'Report submitted successfully!' : 'Saved offline. Will sync when network returns.')
      setActiveTab('history')
    } catch (err) {
      console.error('Failed to add ticket:', err)
      alert('Failed to save to database.')
    }
  }

  // 7. CRUD: Update (Toggle fixed status)
  const toggleFixedStatus = async (id, currentStatus) => {
    try {
      await db.tickets.update(id, { isFixed: !currentStatus })
    } catch (err) {
      console.error('Failed to update:', err)
    }
  }

  // 8. CRUD: delete
  const handleDeleteTicket = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this report? This action cannot be undone.')
    if (!confirmed) return
    try {
      await db.tickets.delete(id)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  // 9. 智能派单 (Web Share API)
  const handleDispatch = async (ticket) => {
    const dispatchMap = {
      'Facility Damage': { department: 'Maintenance Team',      email: 'maintenance@park.com' },
      'Hygiene':         { department: 'Cleaning Squad',         email: 'cleaning@park.com'    },
      'Supply Shortage': { department: 'Supply Manager',         email: 'supply@park.com'      },
      'Animal Welfare':  { department: 'Animal Care Team',       email: 'animalcare@park.com'  },
      'Rule Violation':  { department: 'Security Office',        email: 'security@park.com'    },
      'Other':           { department: 'General Administration',  email: 'admin@park.com'       },
    }

    const { department, email } = dispatchMap[ticket.category] || dispatchMap['Other']

    const reportText = `
        [SmartPet Warden Alert]
        Forwarded to: ${department}
        Category: ${ticket.category}
        Description: ${ticket.description}
        Time: ${ticket.date}
        Location Coordinates: ${ticket.coords}

    Please check and resolve this issue as soon as possible.
    `.trim()

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Park Issue: ${ticket.category}`,
          text: reportText,
        })
        console.log('Report dispatched successfully')
      } catch (error) {
        console.log('User cancelled the share or share failed', error)
      }
    } else {
      alert(`Web Share not supported on this device. Opening email client to contact ${department}...`)
      const mailtoLink = `mailto:${email}?subject=Park Issue: ${ticket.category}&body=${encodeURIComponent(reportText)}`
      window.location.href = mailtoLink
    }
  }

  // 10. 下载/导出数据 (Export to JSON)
  // 文件名加入日期时间戳，避免多次导出时覆盖同名文件
  const handleExportData = () => {
    if (!tickets || tickets.length === 0) {
      alert('No data to export. The park is safe!')
      return
    }

    const jsonString = JSON.stringify(tickets, null, 2)
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonString)

    const timestamp = new Date().toISOString().slice(0, 10) // 格式：YYYY-MM-DD
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute('href', dataStr)
    downloadAnchorNode.setAttribute('download', `SmartPetWarden_Audit_Logs_${timestamp}.json`)

    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  // 11. UI
  return (
    <div className="app-container">
      <div className="header">
        <h1>SmartPet Warden</h1>
        <p>Park Management System</p>
      </div>

      

      {/* Network status indicator */}
      <div style={{
        backgroundColor: isOnline ? '#e8f5e9' : '#ffebee',
        color: isOnline ? '#2e7d32' : '#c62828',
        textAlign: 'center',
        padding: '8px',
        fontSize: '13px',
        fontWeight: 'bold',
        borderBottom: `1px solid ${isOnline ? '#c8e6c9' : '#ffcdd2'}`
      }}>
        {isOnline ? 'Online Mode - Sync Active' : 'Offline Mode - Saving Locally'}
      </div>

      <div className="content">
        {/* === Report Tab === */}
        {activeTab === 'report' && (
          <div className="card">
            <h3 style={{ marginTop: 0, color: '#2e7d32' }}>New Issue Report</h3>

            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Facility Damage">Facility Damage – Broken Equipment</option>
              <option value="Hygiene">Hygiene – Cleaning Required</option>
              <option value="Supply Shortage">Supply Shortage – Food / Water / Bags</option>
              <option value="Animal Welfare">Animal Welfare – Injured / Lost Pet</option>
              <option value="Rule Violation">Rule Violation – Aggressive Pet / Owner</option>
              <option value="Other">Other</option>
            </select>

            <textarea
              className="input-field"
              placeholder="Issue description and details (e.g., Broken fence)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ resize: 'vertical', minHeight: '100px' }}
            />

            <button className="btn btn-secondary" onClick={handleGetLocation} disabled={loading}>
              {loading ? 'Locating...' : 'Attach GPS Location'}
            </button>

            {location && (
  <div style={{ marginTop: '15px', marginBottom: '15px' }}>
    <p style={{ color: '#2e7d32', fontSize: '12px', textAlign: 'center', marginBottom: '10px' }}>
      Coordinates: {location.lat}, {location.lng}
      <br/>
      <span style={{ color: '#757575', fontSize: '11px' }}>
        (You can drag the marker to adjust the exact location)
      </span>
    </p>
    
    {/* Map container, height must be specified */}
    <MapContainer 
      center={[location.lat, location.lng]} 
      zoom={16} 
      style={{ height: '200px', width: '100%', borderRadius: '8px', zIndex: 0 }}
    >
      {/* Call for the free OSM */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Draggable pins */}
      <Marker 
        position={[location.lat, location.lng]}
        draggable={true}

        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            setLocation({
              lat: position.lat.toFixed(5),
              lng: position.lng.toFixed(5)
            });
            navigator.vibrate?.(50); 
          },
        }}
      >
      </Marker>
    </MapContainer>
  </div>
)}

            {/* Camera and photo album */}
            <label className="btn btn-outline" style={{ display: 'flex', boxSizing: 'border-box' }}>
              Take / Choose Evidence Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoCapture}
                style={{ display: 'none' }}
              />
            </label>

            {photo && (
              <p style={{ color: '#2e7d32', fontSize: '12px', textAlign: 'center', margin: '5px 0 15px' }}>
                Photo attached successfully
              </p>
            )}

            {error && (
              <p style={{ color: '#d32f2f', fontSize: '12px', textAlign: 'center' }}>
                Error: {error}
              </p>
            )}

            <div style={{ marginTop: '25px' }}>
              <button className="btn btn-primary" onClick={handleAddTicket}>
                Submit Report
              </button>
            </div>
          </div>
        )}

        {/* === History Tab === */}
        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#2e7d32', margin: 0 }}>
                Audit Logs ({tickets ? tickets.length : 0})
              </h3>
              {/* Data export button */}
              <button
                onClick={handleExportData}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #2e7d32',
                  color: '#2e7d32',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                Export JSON
              </button>
            </div>

            {(!tickets || tickets.length === 0) ? (
              <div className="card" style={{ textAlign: 'center', color: '#9e9e9e', padding: '40px 20px' }}>
                <p>No records found. The park is secure.</p>
              </div>
            ) : (
              [...tickets].reverse().map((ticket) => (
                <div key={ticket.id} className={`ticket-item ${ticket.isFixed ? 'fixed' : ''}`}>
                  <h4 style={{ margin: '0 0 8px', textDecoration: ticket.isFixed ? 'line-through' : 'none' }}>
                    <span style={{ color: '#2e7d32', marginRight: '8px', border: '1px solid #2e7d32', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', textDecoration: 'none', display: 'inline-block' }}>
                      {ticket.category}
                    </span>
                    {ticket.description}
                  </h4>

                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#757575' }}>
                    <strong>Time:</strong> {ticket.date}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#757575' }}>
                    <strong>Location:</strong> {ticket.coords}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: (isOnline && ticket.syncStatus === 'Pending Sync') ? '#d32f2f' : '#2e7d32' }}>
                    <strong>Status:</strong> {ticket.syncStatus || 'Synced'}
                  </p>

                  {ticket.photoData && (
                    <img src={ticket.photoData} alt="Audit Evidence" className="ticket-image" />
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button
                      className="btn"
                      style={{
                        flex: 1,
                        backgroundColor: ticket.isFixed ? '#e0e0e0' : '#e8f5e9',
                        color: ticket.isFixed ? '#757575' : '#2e7d32',
                        padding: '10px',
                        fontSize: '12px'
                      }}
                      onClick={() => toggleFixedStatus(ticket.id, ticket.isFixed)}
                    >
                      {ticket.isFixed ? 'Reopen' : 'Resolve'}
                    </button>
                    <button
                      className="btn"
                      style={{
                        flex: 1,
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '10px',
                        fontSize: '12px'
                      }}
                      onClick={() => handleDispatch(ticket)}
                    >
                      Dispatch
                    </button>
                    {/* A confirmation box will pop up for deletion after clicking. */}
                    <button
                      className="btn"
                      style={{
                        flex: 1,
                        backgroundColor: '#ffebee',
                        color: '#d32f2f',
                        padding: '10px',
                        fontSize: '12px'
                      }}
                      onClick={() => handleDeleteTicket(ticket.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
          style={{ padding: '10px', flex: 1 }}
        >
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>REPORT</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{ padding: '10px', flex: 1 }}
        >
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>HISTORY</span>
        </button>
      </div>
    </div>
  )
}

export default App
