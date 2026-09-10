"use client";
import {createContext,useContext,useMemo,useState,type ReactNode} from 'react';
import {validCurrency,type Currency} from './currencies';

type CompanyCurrency={currency:Currency;setCurrency:(currency:Currency)=>void};
const CurrencyContext=createContext<CompanyCurrency>({currency:'PYG',setCurrency:()=>{}});

function TenantCurrency({defaultCurrency,children}:{defaultCurrency:unknown;children:ReactNode}) {
 const [currency,setCurrency]=useState<Currency>(()=>validCurrency(defaultCurrency));
 const value=useMemo(()=>({currency,setCurrency}),[currency]);
 return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

// Mount only after /auth/me resolves. A tenant change discards the old preference
// and open forms synchronously. No global/localStorage state can cross tenants.
export function CompanyCurrencyProvider({organizationId,defaultCurrency,children}:{organizationId:string|number;defaultCurrency:unknown;children:ReactNode}) {
 return <TenantCurrency key={String(organizationId)} defaultCurrency={defaultCurrency}>{children}</TenantCurrency>;
}
export function useCompanyCurrency(){return useContext(CurrencyContext);}
