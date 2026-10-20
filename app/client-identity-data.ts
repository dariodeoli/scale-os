// Capa de datos de identidad de cliente (SOS-COM, spec #43 §1): paleta y campos
// reales que la identidad pinta (`agency_clients.name`, `logo_url`, `color_key`).
export const CLIENT_COLOR_VALUES=['violet','blue','teal','green','gold','rose','slate'] as const;
export type ClientColorKey=(typeof CLIENT_COLOR_VALUES)[number];

export const clientColors:[ClientColorKey,string][]=[
 ['violet','Violeta'],
 ['blue','Azul'],
 ['teal','Turquesa'],
 ['green','Verde'],
 ['gold','Dorado'],
 ['rose','Rosa'],
 ['slate','Gris'],
];

export const clientColorLabels:Record<ClientColorKey,string>=Object.fromEntries(clientColors) as Record<ClientColorKey,string>;

export function identityColor(value?:string|null):ClientColorKey{
 return CLIENT_COLOR_VALUES.some(key=>key===value)?value as ClientColorKey:'violet';
}

/** Campos reales que alimentan la identidad del cliente en la UI. */
export type ClientIdentityRecord={
 name:string;
 logo_url?:string|null;
 color_key?:string|null;
};

/** Identidad legal declarada; el nombre comercial sólo es respaldo explícito. */
export function clientLegalName(values:Record<string,unknown>):string{
 return String(values.legal_name||'').trim()||String(values.name||'').trim();
}

/** Client selectors share the same identity metadata before and after saving. */
export function clientSelectChoices(clients:readonly (ClientIdentityRecord&{id:string|number;legal_name?:string|null;tax_id?:string|null})[]){
 return clients.map(client=>({value:String(client.id),label:client.name,photoUrl:client.logo_url,kind:'entity' as const,secondary:[client.legal_name?.trim(),client.tax_id?.trim()].filter(Boolean).join(' · ')||undefined,searchText:[client.name,client.legal_name,client.tax_id].filter(Boolean).join(' ')}));
}
