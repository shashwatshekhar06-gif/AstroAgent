import React, { useState, useEffect } from 'react'
import BirthForm from './BirthForm'
import Chat from './Chat'

function App() {
  const [birthDetails, setBirthDetails] = useState(null)
  const [sessionId, setSessionId] = useState('')
  const [sessions, setSessions] = useState([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [chatKey, setChatKey] = useState(0) // Force Chat remount

  useEffect(() => {
    // Generate initial session ID
    setSessionId(crypto.randomUUID())
    // Load sessions
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const response = await fetch('http://localhost:8000/sessions')
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const handleBirthSubmit = (details) => {
    setBirthDetails(details)
  }

  const handleNewChat = () => {
    setSessionId(crypto.randomUUID())
    setChatKey(prev => prev + 1) // Force Chat component to remount with empty messages
    loadSessions()
  }

  const handleSelectSession = async (selectedSessionId) => {
    try {
      const response = await fetch(`http://localhost:8000/sessions/${selectedSessionId}/messages`)
      const data = await response.json()
      
      setSessionId(selectedSessionId)
      setChatKey(prev => prev + 1) // Force remount when switching sessions
      // If session has messages, we're continuing a conversation
      if (data.messages && data.messages.length > 0) {
        // Extract birth details from chart if available
        if (data.chart) {
          setBirthDetails(data.chart)
        } else {
          setBirthDetails({ loaded: true })
        }
      } else {
        setBirthDetails(null)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  const handleDeleteSession = async (sessionIdToDelete, event) => {
    event.stopPropagation() // Prevent triggering handleSelectSession
    
    try {
      const response = await fetch(`http://localhost:8000/sessions/${sessionIdToDelete}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        // If we deleted the current session, create a new one
        if (sessionIdToDelete === sessionId) {
          handleNewChat()
        }
        // Reload sessions list
        loadSessions()
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  // If no birth details, show only BirthForm centered with no sidebar
  if (!birthDetails) {
    return (
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh', 
        overflow: 'hidden',
        background: '#F5F0E8',
        padding: '20px'
      }}>
        <BirthForm onSubmit={handleBirthSubmit} />
      </div>
    )
  }

  // Once birth details are filled, show sidebar + chat
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      background: '#F5F0E8' 
    }}>
      {/* Sidebar toggle button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        style={{
          position: 'absolute',
          left: showSidebar ? '260px' : '0',
          top: '20px',
          zIndex: 1000,
          width: '32px',
          height: '32px',
          background: 'white',
          border: '1px solid #E5E0D8',
          borderRadius: '0 8px 8px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          transition: 'left 0.3s ease'
        }}
      >
        {showSidebar ? '◀' : '▶'}
      </button>

      {/* Sidebar */}
      <div style={{
        width: showSidebar ? '260px' : '0',
        background: 'white',
        borderRight: showSidebar ? '1px solid #E5E0D8' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        flexShrink: 0
      }}>
        {showSidebar && (
          <>
            <div style={{ padding: '20px', flexShrink: 0 }}>
              <button
                onClick={handleNewChat}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#C4714A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                + New Chat
              </button>
            </div>

            <div style={{ 
              padding: '0 20px 12px 20px', 
              fontSize: '0.85rem', 
              color: '#6B6B68', 
              fontWeight: '500',
              flexShrink: 0
            }}>
              Recent Conversations
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              padding: '0 20px 20px 20px'
            }}>
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  style={{
                    position: 'relative',
                    padding: '12px',
                    marginBottom: '8px',
                    background: session.session_id === sessionId ? '#F0E6D6' : 'transparent',
                    borderLeft: session.session_id === sessionId ? '3px solid #C4714A' : '3px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => handleSelectSession(session.session_id)}
                  onMouseEnter={(e) => {
                    if (session.session_id !== sessionId) {
                      e.currentTarget.style.background = '#F5F0E8'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (session.session_id !== sessionId) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#1C1C1A', 
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {session.preview}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9B9B98' }}>
                      {new Date(session.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.session_id, e)}
                    style={{
                      marginLeft: '8px',
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#9B9B98',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#DC2626'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9B9B98'
                    }}
                    title="Delete conversation"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Chat 
          key={chatKey}
          birthDetails={birthDetails} 
          sessionId={sessionId}
          onNewMessage={loadSessions}
        />
      </div>
    </div>
  )
}

export default App
