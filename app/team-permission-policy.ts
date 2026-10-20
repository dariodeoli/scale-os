import type {TeamMember} from './team-directory';
/** Hierarchy and grantability are supplied by the live API, never inferred from labels. */
export type TeamPermissionPolicy={canManageRoles:boolean;canManageMembers:boolean;canResetRoles?:boolean;visibleRoles:string[];permissionRoles:string[];editableRoles:string[];grantableCapabilities:string[];canViewSalary:boolean;canViewBalance:boolean};
export const editableMemberAccess=(member:TeamMember|null,currentUserId:string)=>Boolean(member&&member.access_editable===true&&String(member.id)!==String(currentUserId));
export const editableMemberPermissions=(member:TeamMember|null,currentUserId:string)=>Boolean(member&&member.permissions_editable===true&&String(member.id)!==String(currentUserId));
export function accessRoleChoices(policy:TeamPermissionPolicy|undefined,currentRole?:string){return [...new Set([...(currentRole?[currentRole]:[]),...(policy?.editableRoles||[])])];}
