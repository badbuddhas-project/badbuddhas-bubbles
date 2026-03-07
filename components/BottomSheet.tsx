'use client'

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      requestAnimationFrame(() => {
        setIsAnimating(true)
      })
      document.body.style.overflow = 'hidden'
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 300)
      document.body.style.overflow = ''
      return () => clearTimeout(timer)
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current
    if (diff > 0) {
      setDragY(diff)
    }
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    if (dragY > 100) {
      onClose()
    }
    setDragY(0)
  }, [dragY, onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 transition-colors duration-300 ${
        isAnimating ? 'bg-black/60' : 'bg-transparent'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          transform: isDragging
            ? `translateY(${dragY}px)`
            : isAnimating
            ? 'translateY(0)'
            : 'translateY(100%)',
          transition: isDragging ? 'none' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-3 border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-white text-center">
              {title}
            </h3>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Safe area padding */}
        <div className="h-8" />
      </div>
    </div>
  )
}

interface BottomSheetOptionProps {
  label: string
  isSelected?: boolean
  onClick: () => void
}

export function BottomSheetOption({ label, isSelected, onClick }: BottomSheetOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3.5 text-left transition-colors ${
        isSelected
          ? 'text-emerald-300 bg-zinc-800/50'
          : 'text-zinc-300 active:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        {isSelected && <CheckIcon className="w-5 h-5 text-emerald-300" />}
      </div>
    </button>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
