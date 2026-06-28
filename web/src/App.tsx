import { Navigate, Route, Routes } from 'react-router-dom'
import { SimProvider } from './sim/SimContext'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './screens/Dashboard'
import { MyTeam } from './screens/MyTeam'
import { Standings } from './screens/Standings'
import { Matchup } from './screens/Matchup'
import { Waivers } from './screens/Waivers'
import { Trades } from './screens/Trades'
import { Draft } from './screens/Draft'

function App() {
  return (
    <SimProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/myteam" element={<MyTeam />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/matchup" element={<Matchup />} />
          <Route path="/waivers" element={<Waivers />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/draft" element={<Draft />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </SimProvider>
  )
}

export default App
