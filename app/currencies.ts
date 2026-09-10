export const currencyCodes=['PYG','USD','EUR','BRL','ARS','MXN'] as const;
export type Currency=typeof currencyCodes[number];
export const currencyLabels:Record<Currency,string>={PYG:'Guaraníes (PYG)',USD:'Dólares (USD)',EUR:'Euros (EUR)',BRL:'Reales (BRL)',ARS:'Pesos argentinos (ARS)',MXN:'Pesos mexicanos (MXN)'};
export const currencyChoices=currencyCodes.map(value=>({value,label:currencyLabels[value]}));
export const validCurrency=(value:unknown):Currency=>currencyCodes.includes(value as Currency)?value as Currency:'PYG';
