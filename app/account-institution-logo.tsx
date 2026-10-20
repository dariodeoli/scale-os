"use client";

import {BancoLogoLazy} from 'owncoding-ui/financial-lazy';

/** Shared bank identity for saved accounts and account choices. The persisted
 * institution is the catalog key/name; the account's editable label is not. */
export function AccountInstitutionLogo({institution,className}:{institution?:string|null;className?:string}) {
  const bank=institution?.trim();
  if(!bank)return null;
  return <span className={['inline-flex h-8 w-8 shrink-0 items-center justify-center',className].filter(Boolean).join(' ')} data-account-institution={bank} title={bank}>
    <BancoLogoLazy banco={bank} variante="compacto" alto="h-8" decorativo/>
  </span>;
}
