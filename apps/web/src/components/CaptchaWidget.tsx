// CaptchaWidget — wraps Cloudflare Turnstile in production; renders a mock
// checkbox in dev/test environments (when VITE_CAPTCHA_MOCK=true or no site-key).
// TODO(w79-w80): Turnstile site-key delivery endpoint ships in W#80 sub-cohort 2.
//               Wire real Turnstile widget once site-key endpoint is available.

import { useState } from 'react'

export const MOCK_CAPTCHA_TOKEN = 'mock-pass'

export interface CaptchaWidgetProps {
  onToken: (token: string) => void
  onExpire?: () => void
}

export function CaptchaWidget({ onToken, onExpire: _onExpire }: CaptchaWidgetProps) {
  const [checked, setChecked] = useState(false)

  const isMockMode =
    import.meta.env.VITE_CAPTCHA_MOCK === 'true' ||
    !import.meta.env.VITE_TURNSTILE_SITE_KEY

  if (isMockMode) {
    return (
      <div
        className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-4 py-3"
        data-testid="captcha-widget-mock"
      >
        <input
          id="captcha-mock-checkbox"
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked)
            if (e.target.checked) {
              onToken(MOCK_CAPTCHA_TOKEN)
            }
          }}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor="captcha-mock-checkbox" className="text-sm text-gray-600">
          I'm not a robot
          <span className="ml-2 text-xs text-gray-400">(dev mock)</span>
        </label>
      </div>
    )
  }

  // TODO(w79-w80): replace with real @cloudflare/turnstile-react once site-key lands.
  return (
    <div
      className="flex items-center justify-center rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
      data-testid="captcha-widget-pending"
    >
      CAPTCHA widget pending site-key configuration
    </div>
  )
}
