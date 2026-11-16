'use client'

import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  onError: () => void
}

type State = { failed: boolean }

/** Catches Leaflet/react-leaflet render failures and triggers static fallback. */
export class JobAreaMapErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}
