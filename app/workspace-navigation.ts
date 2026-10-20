import {childSections,navGroups,AI_CONNECTIONS_LABEL} from './navigation';
import {visibleModule} from './workspace-access';

/** 30 octubre 2026 00:00 America/Asuncion (UTC-03). Only the shortcut expires. */
export const AI_NAV_EXPIRES_AT=Date.parse('2026-10-30T00:00:00-03:00');
export function temporaryAiNavigationVisible(now:number){return Number.isFinite(now)&&now<AI_NAV_EXPIRES_AT;}
/** Both desktop and mobile consume this exact ordered, capability-filtered list. */
export function workspaceNavGroups(role:string,capabilities:Record<string,boolean>|undefined,showAiShortcut:boolean){
 return navGroups.filter(([group])=>group!==AI_CONNECTIONS_LABEL||showAiShortcut)
  .map(([group,modules])=>({group,modules:modules.filter(module=>childSections(module).some(child=>visibleModule(child,role,capabilities)))}))
  .filter(group=>group.modules.length>0);
}
