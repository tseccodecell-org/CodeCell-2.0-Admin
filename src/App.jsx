import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { TOKEN_KEY } from './config'
import Login from './pages/Login'
import Layout from './components/Layout'
import ChallengeList from './challenges/ChallengeList'
import WeekDetail from './challenges/WeekDetail'
import ProblemEditor from './challenges/ProblemEditor'
import EventList from './events/EventList'
import EventDetail from './events/EventDetail'
import StatsList from './statistics/StatsList'
import StatsDetail from './statistics/StatsDetail'

function Guard({ children }) {
  return sessionStorage.getItem(TOKEN_KEY) ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index element={<Navigate to="/challenges" replace />} />
            <Route path="challenges" element={<ChallengeList />} />
            <Route path="challenges/:weekId" element={<WeekDetail />} />
            <Route path="challenges/:weekId/problems/new" element={<ProblemEditor type="week" />} />
            <Route path="events" element={<EventList />} />
            <Route path="events/:eventId" element={<EventDetail />} />
            <Route path="events/:eventId/problems/new" element={<ProblemEditor type="event" />} />
            <Route path="statistics" element={<StatsList />} />
            <Route path="statistics/:weekId" element={<StatsDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}
