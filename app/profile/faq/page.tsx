'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

export default function FAQPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const FAQ_ITEMS = useMemo(() => [
    {
      question: t('faq.q1'),
      answer: t('faq.a1'),
    },
    {
      question: t('faq.q2'),
      answer: t('faq.a2'),
    },
    {
      question: t('faq.q3'),
      answer: t('faq.a3'),
    },
    {
      question: t('faq.q4'),
      answer: t('faq.a4'),
    },
    {
      question: t('faq.q5'),
      answer: t('faq.a5'),
    },
    {
      question: t('faq.q6'),
      answer: t('faq.a6'),
    },
    {
      question: t('faq.q7'),
      answer: t('faq.a7'),
    },
  ], [t])

  const handleBack = () => {
    router.back()
  }

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <main className="min-h-screen bg-black pb-8">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b border-zinc-800">
        <button
          onClick={handleBack}
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CBCBCB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-lg font-semibold text-white">{t('faq.title')}</h1>
      </header>

      {/* FAQ List */}
      <section className="p-4">
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="px-4 mt-6">
        <p className="text-center text-zinc-500 text-sm">
          {t('faq.stillHaveQuestions')}{' '}
          <a
            href="mailto:contact@badbuddhas.com"
            className="text-emerald-300 underline"
          >
            {t('faq.contactUs')}
          </a>
        </p>
      </section>
    </main>
  )
}

interface AccordionItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

function AccordionItem({ question, answer, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <span className="flex-1 text-white font-medium leading-snug">
          {question}
        </span>
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div className="px-4 pb-4">
          <p className="text-zinc-400 text-sm leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
