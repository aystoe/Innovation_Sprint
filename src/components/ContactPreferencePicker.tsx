import type { ContactPreference } from '../types'
import { CONTACT_OPTIONS } from '../data/contactPreferences'

interface Props {
  value: ContactPreference
  onChange: (value: ContactPreference) => void
}

export function ContactPreferencePicker({ value, onChange }: Props) {
  return (
    <fieldset className="contact-settings">
      <legend>Who can contact you?</legend>

      <p className="help">
        Choose your contact preference.
      </p>

      <div className="contact-options">
        {CONTACT_OPTIONS.map(option => (
          <label
            key={option.value}
            className={`contact-option ${
              value === option.value ? 'selected' : ''
            }`}
          >
            <input
              type="radio"
              name="contact-preference"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />

            <span
              className={`contact-dot contact-dot--${option.value}`}
              aria-hidden="true"
            />

            <span className="contact-option-copy">
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}