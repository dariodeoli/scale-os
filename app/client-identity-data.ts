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
