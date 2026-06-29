import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GeocoderInput from './GeocoderInput'

describe('GeocoderInput', () => {
  it('renderiza el input con placeholder default', () => {
    render(<GeocoderInput value="" onChange={() => {}} onSelect={() => {}} />)
    expect(screen.getByPlaceholderText('Escribe una dirección...')).toBeTruthy()
  })

  it('muestra placeholder personalizado', () => {
    render(<GeocoderInput value="" onChange={() => {}} onSelect={() => {}} placeholder="Buscar dirección..." />)
    expect(screen.getByPlaceholderText('Buscar dirección...')).toBeTruthy()
  })

  it('llama onChange cuando el usuario escribe', () => {
    const onChange = vi.fn()
    render(<GeocoderInput value="" onChange={onChange} onSelect={() => {}} />)
    const input = screen.getByPlaceholderText('Escribe una dirección...')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalled()
  })
})
