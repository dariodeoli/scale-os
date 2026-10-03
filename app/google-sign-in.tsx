import type {MouseEventHandler} from 'react';

// Acceso social (issue #159): Google, Microsoft y Apple comparten una sola
// superficie. `GoogleSignIn` se conserva como alias para no romper llamadas
// existentes; DSN ajusta la piel en el mismo issue.
export type SocialProvider = 'google' | 'microsoft' | 'apple';

export function GoogleMark(){return <svg className="google-g" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.04H12v3.86h5.24a4.48 4.48 0 0 1-1.94 2.94v2.5h3.15c1.84-1.69 2.9-4.18 2.9-7.26Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.22l-3.15-2.5c-.87.59-1.99.94-3.3.94-2.54 0-4.69-1.72-5.46-4.03H3.29v2.58A9.75 9.75 0 0 0 12 21.75Z"/><path fill="#FBBC04" d="M6.54 13.94A5.87 5.87 0 0 1 6.23 12c0-.67.11-1.32.31-1.94V7.48H3.29A9.72 9.72 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.52l3.25-2.58Z"/><path fill="#EA4335" d="M12 6.03c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.13 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.71 5.23l3.25 2.58C7.31 7.75 9.46 6.03 12 6.03Z"/></svg>;}
export function MicrosoftMark(){return <svg className="provider-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#F25022" d="M3 3h8.5v8.5H3z"/><path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z"/><path fill="#00A4EF" d="M3 12.5h8.5V21H3z"/><path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z"/></svg>;}
export function AppleMark(){return <svg className="provider-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.36 12.9c.02 2.5 2.19 3.33 2.22 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.41 2.03-2.55 2.05-1.11.02-1.47-.66-2.74-.66-1.27 0-1.67.64-2.72.68-1.09.04-1.92-1.09-2.62-2.1-1.43-2.07-2.52-5.85-1.05-8.4.73-1.27 2.03-2.07 3.44-2.09 1.07-.02 2.08.72 2.74.72.65 0 1.88-.89 3.17-.76.54.02 2.05.22 3.02 1.64-.08.05-1.8 1.05-1.78 3.14M14.3 5.2c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.54.62-1.01 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16Z"/></svg>;}

const marks = {google: GoogleMark, microsoft: MicrosoftMark, apple: AppleMark} as const;
const labels = {google: 'Continuar con Google', microsoft: 'Continuar con Microsoft', apple: 'Continuar con Apple'} as const;

type ProviderSignInProps = {
  provider: SocialProvider;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  className?: string;
};

export function ProviderSignIn({provider, href, onClick, disabled=false, compact=false, label, className=''}: ProviderSignInProps){
  const Mark=marks[provider], text=label||labels[provider];
  const classes=[compact?'portal-google-icon':'google-login-button',className].filter(Boolean).join(' ');
  const content=<><Mark/>{compact?<span className="sr-only">{text}</span>:text}</>;
  if(href)return <a data-provider={provider} className={classes} href={href} aria-label={compact?text:undefined} title={compact?text:undefined} onClick={onClick}>{content}</a>;
  if(onClick||disabled)return <button type="button" data-provider={provider} className={classes} disabled={disabled} onClick={onClick}>{content}</button>;
  return <a data-provider={provider} className={classes} href={href} aria-label={compact?text:undefined} title={compact?text:undefined}>{content}</a>;
}

export function GoogleSignIn(props: Omit<ProviderSignInProps,'provider'>){
  return <ProviderSignIn provider="google" {...props}/>;
}
