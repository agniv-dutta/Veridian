import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data) => {
    setErrorMsg('')
    setIsLoading(true)
    const result = await login(data.email, data.password)
    setIsLoading(false)

    if (result.success) {
      navigate('/')
    } else {
      setErrorMsg(result.error || 'Invalid credentials. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-secondary)] px-4 py-8 text-[var(--text-secondary)] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden h-full flex-col justify-between overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#0A1628_0%,#0D6E6E_60%,#0F9484_100%)] p-10 text-white shadow-[var(--shadow-modal)] lg:flex">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/80">
              Carbon intelligence for audit teams
            </div>
            <h1 className="mt-6 max-w-xl text-[42px] font-semibold leading-[1.05] tracking-tight text-white">
              Operational confidence for sustainability reporting.
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-white/80">
              Veridian centralizes SAP, utility, and travel data into a controlled review workspace with traceable approvals and export-ready reporting.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            {[
              ['Review', 'Queue-based approval workflow'],
              ['Traceable', 'Audit trail and comments'],
              ['Trusted', 'Locked export controls'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[16px] bg-white/10 p-4">
                <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/80">{title}</div>
                <div className="mt-2 text-[13px] leading-6 text-white/80">{copy}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">Veridian</div>
            <h2 className="mt-6 text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">Sign in to your account</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Or{' '}
              <Link to="/landing" className="font-medium text-[var(--brand-primary)] hover:text-[var(--brand-secondary)]">
                back to landing page
              </Link>
            </p>
          </div>

          <div className="surface-card p-6 sm:p-8">
            {errorMsg && (
              <div className="mb-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                {errorMsg}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-[var(--text-primary)]">Email address / Username</label>
                <input
                  id="email"
                  type="text"
                  autoComplete="email"
                  {...register('email', { required: 'Email/Username is required' })}
                  className={`input-base mt-2 h-11 w-full px-4 text-[14px] ${errors.email ? 'border-[#EF4444]' : ''}`}
                />
                {errors.email && <p className="mt-2 text-[12px] text-[#EF4444]">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-[var(--text-primary)]">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                  className={`input-base mt-2 h-11 w-full px-4 text-[14px] ${errors.password ? 'border-[#EF4444]' : ''}`}
                />
                {errors.password && <p className="mt-2 text-[12px] text-[#EF4444]">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                  <input type="checkbox" className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                  Remember me
                </label>
                <a href="#" className="text-[13px] font-medium text-[var(--brand-primary)] hover:text-[var(--brand-secondary)]">Forgot password?</a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="button-primary flex h-11 w-full items-center justify-center text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Login
