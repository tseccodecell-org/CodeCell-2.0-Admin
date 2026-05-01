import { createContext, useContext, useState } from 'react'
import { initialWeeks, initialEvents } from '../mockData'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [weeks, setWeeks] = useState(initialWeeks)
  const [events, setEvents] = useState(initialEvents)

  // Weeks
  const addWeek = (data) => setWeeks(p => [...p, { displaySection: 'upcoming', ...data, id: Date.now(), problems: [] }])
  const updateWeek = (id, data) => setWeeks(p => p.map(w => w.id === id ? { ...w, ...data } : w))
  const deleteWeek = (id) => setWeeks(p => p.filter(w => w.id !== id))

  // Problems in a week
  const addProblem = (weekId, problem) =>
    setWeeks(p => p.map(w => w.id === weekId
      ? { ...w, problems: [...w.problems, { ...problem, id: Date.now() }] }
      : w))
  const deleteProblem = (weekId, problemId) =>
    setWeeks(p => p.map(w => w.id === weekId
      ? { ...w, problems: w.problems.filter(pr => pr.id !== problemId) }
      : w))

  // Events
  const addEvent = (data) => setEvents(p => [...p, { ...data, id: Date.now(), problems: [] }])
  const updateEvent = (id, data) => setEvents(p => p.map(e => e.id === id ? { ...e, ...data } : e))
  const deleteEvent = (id) => setEvents(p => p.filter(e => e.id !== id))

  // Problems in an event
  const addEventProblem = (eventId, problem) =>
    setEvents(p => p.map(e => e.id === eventId
      ? { ...e, problems: [...e.problems, { ...problem, id: Date.now() }] }
      : e))
  const deleteEventProblem = (eventId, problemId) =>
    setEvents(p => p.map(e => e.id === eventId
      ? { ...e, problems: e.problems.filter(pr => pr.id !== problemId) }
      : e))

  return (
    <DataContext.Provider value={{
      weeks, events,
      addWeek, updateWeek, deleteWeek,
      addProblem, deleteProblem,
      addEvent, updateEvent, deleteEvent,
      addEventProblem, deleteEventProblem,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
