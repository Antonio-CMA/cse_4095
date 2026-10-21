import { Link, type LinkProps } from 'react-router'
import type { ButtonVariant } from './Button'

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
}

/** A router link that looks and behaves like a Button. */
export function ButtonLink({
  variant = 'primary',
  className,
  ...rest
}: ButtonLinkProps) {
  const classes = ['btn', `btn--${variant}`, className].filter(Boolean)
  return <Link className={classes.join(' ')} {...rest} />
}
