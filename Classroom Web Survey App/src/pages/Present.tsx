import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { closeSurvey, getResponseCount, getSurvey, publicSurveyUrl } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { safeFilename } from '../lib/csv'
import type { Survey } from '../lib/types'
import { ConfirmDialog, ErrorBanner, Loading } from '../components/ui'

export default function Present() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [qr, setQr] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [busy, setBusy] = useState(false)

  const url = survey?.public_slug ? publicSurveyUrl(survey.public_slug) : null

  useEffect(() => {
    let cancelled = false
    getSurvey(id)
      .then((s) => !cancelled && setSurvey(s))
      .catch((e) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!url) return
    let cancelled = false
    QRCode.toDataURL(url, { width: 900, margin: 2, errorCorrectionLevel: 'M' })
      .then((d) => !cancelled && setQr(d))
      .catch(() => !cancelled && setError('Could not generate the QR code.'))
    return () => {
      cancelled = true
    }
  }, [url])

  const refreshCount = useCallback(async () => {
    try {
      setCount(await getResponseCount(id))
    } catch {
      /* keep showing the last known count */
    }
  }, [id])

  // Poll the response count while the survey is active.
  useEffect(() => {
    if (survey?.status !== 'active') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCount()
    const t = setInterval(refreshCount, 4000)
    return () => clearInterval(t)
  }, [survey?.status, refreshCount])

  async function onClose() {
    setBusy(true)
    try {
      await closeSurvey(id)
      navigate(`/surveys/${id}/results`)
    } catch (e) {
      setConfirmClose(false)
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (error && !survey) return <ErrorBanner message={error} />
  if (!survey) return <Loading label="Loading survey..." />

  if (survey.status !== 'active') {
    return (
      <div className="space-y-4">
        <ErrorBanner message="This survey is not active, so there is no QR code to present. Activate it from the dashboard first." />
        <Link to="/dashboard" className="btn-secondary">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-center">
      {error && <ErrorBanner message={error} />}
      <h1 className="text-4xl font-bold sm:text-5xl">{survey.title}</h1>
      <p className="text-xl text-slate-700">Scan the QR code to answer</p>

      <div className="mx-auto w-full max-w-[min(90vw,70vh)] rounded-2xl border border-slate-300 bg-white p-3">
        {qr ? (
          <img src={qr} alt={`QR code linking to ${url}`} className="h-auto w-full" />
        ) : (
          <Loading label="Generating QR code..." />
        )}
      </div>

      <p className="break-all text-2xl font-semibold sm:text-3xl">
        <a href={url ?? '#'} className="text-blue-800 underline">
          {url}
        </a>
      </p>
      <p className="text-4xl font-bold" aria-live="polite">
        Responses: {count}
      </p>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <Link to={`/surveys/${id}/results`} className="btn-secondary">
          View Results
        </Link>
        {qr && (
          <a href={qr} download={`${safeFilename(survey.title)}-qr.png`} className="btn-secondary">
            Download QR Code
          </a>
        )}
        <button
          className="btn-secondary"
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}
        >
          Full Screen
        </button>
        <button className="btn-danger" onClick={() => setConfirmClose(true)}>
          Close Survey
        </button>
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="Close this survey?"
        confirmLabel="Close Survey"
        busy={busy}
        onConfirm={onClose}
        onCancel={() => setConfirmClose(false)}
      >
        <p>Students will no longer be able to submit responses.</p>
      </ConfirmDialog>
    </div>
  )
}
