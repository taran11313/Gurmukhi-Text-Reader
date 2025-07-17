import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /punjabi religious reader/i })
    expect(heading).toBeInTheDocument()
  })

  it('displays welcome message', () => {
    render(<App />)
    const welcomeText = screen.getByText(/welcome to the sacred text reader/i)
    expect(welcomeText).toBeInTheDocument()
  })

  it('shows navigation controls', () => {
    render(<App />)
    const navigationControls = screen.getByRole('navigation', { name: /page navigation/i })
    expect(navigationControls).toBeInTheDocument()
  })

  it('shows page viewer', () => {
    render(<App />)
    const pageInfo = screen.getByText(/page 1 of 10000/i)
    expect(pageInfo).toBeInTheDocument()
  })
})