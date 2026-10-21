import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, className].filter(Boolean)
  return <button type={type} className={classes.join(' ')} {...rest} />
}
