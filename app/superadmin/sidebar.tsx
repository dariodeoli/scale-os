"use client";
// Riel lateral del panel global (guía §2/§7): logo, un ícono por sección y el
// contador como badge. Sale de la lista única `PLATFORM_SECTIONS`. En mobile el
// mismo riel se vuelve una tira horizontal con scroll silencioso (CSS).
import Link from "next/link";
import {appHome, formatPlatformMetric} from "./model";
import {WorkspaceBrand} from "../workspace-brand";
import type {PlatformSection, PlatformSectionProps} from "./sections";

export function PlatformSidebar({sections, current, props, onSelect}: {sections: PlatformSection[]; current: string; props: PlatformSectionProps | null; onSelect: (id: string) => void}) {
  return <aside className="platform-sidebar">
    <Link className="platform-sidebar-brand" href={appHome()} aria-label="Scale OS · volver a la app">
      <WorkspaceBrand />
      <span className="platform-sidebar-scope">Control global</span>
    </Link>
    <nav className="platform-sidebar-nav silent-scroll" aria-label="Secciones del panel global">
      {sections.map((section) => {
        const count = props && section.count ? section.count(props) : undefined;
        const label = typeof count === "number" ? `${section.label} (${count})` : section.label;
        const Icon = section.icon;
        const inner = <>
          <Icon aria-hidden="true" className="platform-nav-icon"/>
          <span className="platform-nav-label">{section.label}</span>
          {typeof count === "number" ? <span className="platform-nav-badge" data-attention={section.attention ? "true" : undefined}>{formatPlatformMetric(count)}</span> : null}
        </>;
        if (section.href) return <Link key={section.id} className="platform-nav-item" href={section.href} aria-label={label} title={section.label}>{inner}</Link>;
        const active = section.id === current;
        return <button key={section.id} type="button" className="platform-nav-item" aria-current={active ? "page" : undefined} aria-label={label} title={section.label} onClick={() => onSelect(section.id)}>{inner}</button>;
      })}
    </nav>
  </aside>;
}
