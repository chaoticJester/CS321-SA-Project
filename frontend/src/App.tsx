import { useState } from 'react'
import { Auth } from './components/Auth'
import { ApproverLanding } from './components/ApproverLanding'
import './App.css'

export default function App() {
  const [signedIn, setSignedIn] = useState(false)
  return signedIn
    ? <ApproverLanding onSignOut={() => setSignedIn(false)} />
    : <Auth onSignIn={() => setSignedIn(true)} />
}
