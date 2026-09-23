import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {workspaceSource} from './workspace-source';
require.extensions[".css"] = (module: NodeModule) => {
  module.exports = { toggle: "toggle" };
};
Object.assign(globalThis, { React });
const { ClientDirectoryToolbar, filterClientDirectory } =
  require("../app/client-directory-toolbar") as typeof import("../app/client-directory-toolbar");

const clients = [
  {
    id: "1",
    name: "Árbol Studio",
    email: "hola@arbol.example",
    phone: "0981 111111",
    active: true,
    lifecycle_status: "active",
  },
  {
    id: "2",
    name: "Norte",
    email: "equipo@norte.example",
    phone: "0981 222222",
    active: false,
    lifecycle_status: "paused",
  },
];

test("client directory filtering uses the same displayed subset for query and lifecycle state", () => {
  assert.deepEqual(
    filterClientDirectory(clients, "arbol", "").map((client) => client.id),
    ["1"],
  );
  assert.deepEqual(
    filterClientDirectory(clients, "0981 222", "paused").map(
      (client) => client.id,
    ),
    ["2"],
  );
  assert.deepEqual(filterClientDirectory(clients, "norte", "active"), []);
});

test("client directory renders either onboarding or filtered no-results, with a reset affordance", () => {
  const workspace = workspaceSource();

  assert.match(
    workspace,
    /!displayedClients\.length \? \([\s\S]*?clients\.length===0 \? \([\s\S]*?Todavía no hay clientes\. Creá el primero para empezar\.[\s\S]*?\) : \([\s\S]*?Limpiar filtros/,
  );
  assert.doesNotMatch(
    workspace,
    /clients\.length>0&&displayedClients\.length===0/,
  );
});

test("client directory and mora views flag clients that were never invoiced", () => {
  const workspace = workspaceSource();
  assert.match(workspace, /invoice_count: number;[\s\S]*?has_invoice: boolean;/);
  // El filtro de cobranza vive en la sección de Mora (v2) y su lógica en la capa de datos.
  assert.match(workspace, /'no_invoice', 'Sin factura'/);
  const moraData = readFileSync(new URL('../app/mora-data.ts', import.meta.url), 'utf8');
  assert.match(moraData, /filter === 'no_invoice'[\s\S]*?!client\.has_invoice/);
  assert.match(workspace, /cobrosKpis\.sinFactura\} sin factura/);
  assert.match(workspace, /if \(!client\.has_invoice\) sinFactura \+= 1;/);
});

test("client toolbar exposes accessible search, count, view controls, and role-gated creation", async () => {
  let renderer: ReactTestRenderer;
  let query = "";
  let view = "list";
  let created = false;
  await act(async () => {
    renderer = create(
      <ClientDirectoryToolbar
        canCreate
        onCreate={() => {
          created = true;
        }}
        onQueryChange={(value) => {
          query = value;
        }}
        onStatusChange={() => {}}
        onViewChange={(value) => {
          view = value;
        }}
        query=""
        resultCount={1}
        status=""
        totalCount={2}
        view="list"
      />,
    );
  });
  const root = renderer!.root;
  const search = root.findByProps({ type: "search" });
  assert.equal(
    search.props.placeholder,
    "Buscar por nombre, correo o teléfono",
  );
  assert.equal(
    root.findByProps({ role: "status" }).children.join(""),
    "Mostrando 1 cliente de 2 clientes",
  );
  const buttons = root.findAllByType("button");
  const grid = buttons.find(
    (button) => button.props["aria-label"] === "Ver como cuadrícula",
  );
  const createButton = buttons.find((button) =>
    button.children.join(" ").includes("Nuevo cliente"),
  );
  assert.ok(grid);
  assert.ok(createButton);
  await act(async () => search.props.onChange({ target: { value: "Árbol" } }));
  assert.equal(query, "Árbol");
  await act(async () => grid!.props.onClick());
  assert.equal(view, "grid");
  await act(async () => createButton!.props.onClick());
  assert.equal(created, true);
  await act(async () => renderer!.unmount());

  await act(async () => {
    renderer = create(
      <ClientDirectoryToolbar
        canCreate={false}
        onCreate={() => {}}
        onQueryChange={() => {}}
        onStatusChange={() => {}}
        onViewChange={() => {}}
        query=""
        resultCount={2}
        status=""
        totalCount={2}
        view="list"
      />,
    );
  });
  assert.equal(
    renderer!.root
      .findAllByType("button")
      .some((button) => button.children.join(" ").includes("Nuevo cliente")),
    false,
  );
  await act(async () => renderer!.unmount());
});

test("client toolbar protects touch targets and small-screen layout with the v2 objects", () => {
  const source = readFileSync("app/client-directory-toolbar.tsx", "utf8");
  assert.match(source, /from ['"]owncoding-ui['"]/, "el toolbar usa los objetos compartidos");
  assert.match(source, /SearchField/, "la búsqueda es el campo compartido");
  assert.match(source, /ListGridToggle/, "el selector de vista es el objeto compartido, sin variantes");
  assert.match(source, /flex-wrap/, "los controles bajan de fila a 360 px");
  assert.match(source, /aria-label="Controles del directorio de clientes"/);
  assert.doesNotMatch(source, /SelectCustom|ViewToggle|search-field'|search-field"/, "los objetos legados quedaron atrás; las clases de la referencia de Clientes se conservan");
  assert.match(source, /directorySummaryText/, "el resumen sale de la capa de datos del dominio");
});
