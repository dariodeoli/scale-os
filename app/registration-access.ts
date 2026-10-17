/** Registration returns only to the normal shell or fixed access destinations.
 * Never follow a URL from the query string or an arbitrary API redirect. */
export function registrationAuthDestination(value:unknown):string{
 return value==='/produccion'||value==='/acceso-pendiente'||value==='/?chooseCompany=1'?value:'/';
}

/** UX guard only; the API authenticates and authorizes every actual request. */
export function isRealRegistrationSession(user:unknown):boolean{
 if(!user||typeof user!=='object')return false;
 const value=user as Record<string,unknown>;
 return !!value.id&&!value.demo_owner_user_id&&!value.demo_source_id&&!value.is_demo_guest&&!value.is_demo_template&&value.organization_slug!=='scale-demo-controles-20260908';
}
