import React from 'react'
import { useState, useEffect } from 'react'
import BirthForm from './BirthForm'
import Chat from './Chat'

function App() {
  const [birthDetails, setBirthDetails] = useState(null)
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    // Generate session ID on mount
    setSessionId(crypto.randomUUID())
  }, [])

  const handleBirthSubmit = (details) => {
    setBirthDetails(details)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F0E8',
      padding: '40px 20px'
    }}>
      {!birthDetails ? (
        <BirthForm onSubmit={handleBirthSubmit} />
      ) : (
        <Chat birthDetails={birthDetails} sessionId={sessionId} />
      )}
    </div>
  )
}

export default App
