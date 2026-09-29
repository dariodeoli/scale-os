import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import {workspaceSource} from './workspace-source';
require.extensions[".css"] = (module: NodeModule) => {
  module.exports = { toggle: "toggle" };
};
Object.assign(globalThis, { React });
const { ClientDirectoryToolbar, filterClientDirectory } =
  require("../app/client-directory-toolbar") as typeof import("../app/client-directory-toolbar");

const text = (node: ReactTestInstance | string): string =>
  typeof node === "string" ? node : node.children.map(text).join("");

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
  // Un dato, una fuente: el conteo sale de mora-data, no de una copia en el shell.
  assert.match(workspace, /const cobrosKpis = useMemo\(\(\) => moraKpis\(paymentStatuses\), \[paymentStatuses\]\)/);
  assert.match(moraData, /if \(!client\.has_invoice\) sinFactura \+= 1;/);
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
  // #91: el contador vive en el título, el resumen es auxiliar en la misma
  // línea y el estado conserva su nombre accesible sin gastar una fila.
  const title = root.findByType("h1");
  assert.equal(text(title), "Clientes · 2", "el título lleva el contador del directorio");
  const summary = root.findByProps({ role: "status" });
  assert.equal(summary.props.title, "Mostrando 1 cliente de 2 clientes", "el resumen completo queda en el tooltip");
  assert.equal(summary.parent!.findAllByType("h1").length, 1, "el resumen vive junto al título, no como bloque propio");
  assert.equal(root.findByProps({ id: "clientes-estado" }).props["aria-label"], "Estado", "el estado conserva su nombre accesible");
  assert.match(String(createButton!.props.className || ""), /max-md:w-full/, "la acción primaria va a lo ancho en mobile");
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
  assert.match(source, /ViewSwitch/, "el selector de vista es el wrapper v2 del objeto compartido, sin variantes");
  assert.match(source, /flex-wrap/, "los controles bajan de fila a 360 px");
  assert.match(source, /aria-label="Controles del directorio de clientes"/);
  assert.doesNotMatch(source, /SelectCustom|ViewToggle|search-field'|search-field"/, "los objetos legados quedaron atrás; las clases de la referencia de Clientes se conservan");
  assert.match(source, /directorySummaryText/, "el resumen sale de la capa de datos del dominio");
});

test("el header de Clientes vive en una fila con el resumen auxiliar (#91)", () => {
  const source = readFileSync("app/client-directory-toolbar.tsx", "utf8");
  assert.match(
    source,
    /client-directory-toolbar flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 md:min-h-14/,
    "la fila declara el ritmo (gap 12) y la altura de 56 px en desktop",
  );
  assert.match(
    source,
    /client-directory-toolbar-title flex min-w-\[12rem\] flex-1 flex-nowrap items-baseline/,
    "título y contador comparten el grupo del header",
  );
  assert.match(
    source,
    /client-directory-toolbar-title[\s\S]*?<h1[\s\S]*?<\/h1>[\s\S]*?directory-summary[\s\S]*?<\/div>/,
    "el resumen auxiliar vive dentro del grupo del título",
  );
  assert.doesNotMatch(source, /directory-summary mt-1\.5/, "el resumen dejó de ser un bloque propio");
  assert.match(
    source,
    /<Label htmlFor="clientes-estado" className="sr-only">Estado<\/Label>/,
    "el rótulo del estado queda accesible sin ocupar una línea",
  );
  assert.match(source, /aria-label="Estado"/, "el select conserva su nombre accesible");
  assert.match(source, /title=\{loading \? undefined : summary\}/, "el resumen completo queda disponible en el tooltip y se calla mientras carga (#109)");
  assert.match(source, /loading \? 'Cargando el directorio…' : summary/, "mientras el shell carga no se afirma un directorio de cero (#109)");
});

test("los KPIs de Clientes priorizan el dato real y el estado chico (#91)", () => {
  const clientes = readFileSync(new URL("../app/sections/clientes.tsx", import.meta.url), "utf8");
  for (const label of ["Clientes activos", "Cobros al día", "Facturación contratada", "Entregas próximas"]) {
    assert(clientes.includes(`label="${label}"`), `la franja conserva el KPI ${label}`);
  }
  assert.match(
    clientes,
    /<StateChip tone="mute" title="No hay contratos comerciales activos">Sin contratos<\/StateChip>/,
    "sin contratos es un estado secundario chico",
  );
  assert.doesNotMatch(clientes, /'Sin contratos activos'/, "no vuelve como titular de tres líneas");
  assert.match(clientes, /\{valor: '—', hint: 'Sin dato'\}/, "sin dato devuelve el vacío explícito");
  assert.match(clientes, /role="alert" className="text-bad">No se pudo cargar/, "el error del API se anuncia en chico");
  assert.match(clientes, /billingExpectationState\(commercialSummary, commercialState\)/, "la expectativa contratada sale de la derivación compartida (§15.5)");
  assert.match(clientes, /billingMontos/, "el valor con contratos sale del dato real");
  assert.match(clientes, /billingResto/, "las monedas secundarias van en la línea de explicación, sin estirar el KPI");
});
