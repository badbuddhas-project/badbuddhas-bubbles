'use client'

import { useState } from 'react'
import { BottomSheet, BottomSheetOption } from './BottomSheet'

interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title?: string
}

export function FilterDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select',
  title,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)
  const isActive = value !== options[0]?.value

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-full text-sm
          transition-colors whitespace-nowrap
          ${isActive
            ? 'bg-transparent border border-emerald-300 text-emerald-300'
            : 'bg-zinc-800/80 border border-transparent text-zinc-400'
          }
        `}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title || placeholder}
      >
        <div className="py-2">
          {options.map((option) => (
            <BottomSheetOption
              key={option.value}
              label={option.label}
              isSelected={option.value === value}
              onClick={() => handleSelect(option.value)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  )
}

interface FilterButtonProps {
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
}

export function FilterButton({ isActive, onClick, children }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center w-10 h-10 rounded-full
        transition-colors
        ${isActive
          ? 'bg-transparent border border-emerald-300 text-emerald-300'
          : 'bg-zinc-800/80 border border-transparent text-zinc-400'
        }
      `}
    >
      {children}
    </button>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
