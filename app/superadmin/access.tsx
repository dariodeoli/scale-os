"use client";
// Accesos entre agencias del panel global.
// Extraído de superadmin/page.tsx (issue #46): misma JSX y comportamiento.
import {Users} from "lucide-react";
import {StatusBadge, formatPlatformMetric, type ConfirmRequest, type Person, type State} from "./model";
import {Eye, ShieldCheck, Trash2} from "lucide-react";

type PlatformAccessProps = {
  busy: boolean;
  state: State;
  writable: boolean;
  setConfirming: (value: ConfirmRequest) => void;
  setTyped: (value: string) => void;
  selfRow: (person: Person) => boolean;
  setPlatformAccess: (person: Person, access: "admin" | "viewer" | "none") => Promise<void>;
};

export function PlatformAccess({busy, state, writable, setConfirming, setTyped, selfRow, setPlatformAccess}: PlatformAccessProps){
  return (
            <section className="platform-admin-section platform-admin-users">
              <div className="platform-admin-section-heading">
                <div>
                  <p className="eyebrow">USUARIOS</p>
                  <h2>Accesos entre agencias</h2>
                </div>
                <small>
                  {formatPlatformMetric(state.users.length)} registrados
                </small>
              </div>
              {!writable && (
                <p className="form-note">
                  Solo lectura: podés consultar la administración global, no
                  modificarla.
                </p>
              )}
              <ul className="platform-admin-list">
                {state.users.length ? (
                  <li className="platform-admin-list-head" aria-hidden="true">
                    <span>Usuario</span>
                    <span>Acciones</span>
                  </li>
                ) : null}
                {state.users.length ? (
                  state.users.map((person) => (
                    <li key={person.id}>
                      <span>
                        <b title={person.email || "Usuario sin correo"}>{person.email || "Usuario sin correo"}</b>
                        <small>
                          {formatPlatformMetric(person.active_agencies)}{" "}
                          agencias activas{selfRow(person) ? " · Vos" : ""}
                        </small>
                      </span>
                      <div className="platform-admin-user-actions">
                        {person.platform_admin ? (
                          <StatusBadge tone="success">
                            {person.platform_role === "viewer"
                              ? "Solo lectura"
                              : "Admin global"}
                          </StatusBadge>
                        ) : (
                          <StatusBadge>Acceso de agencia</StatusBadge>
                        )}
                        {selfRow(person) ? (
                          writable ? (
                            <button
                              type="button"
                              className="text-button platform-admin-danger"
                              disabled={busy}
                              onClick={() => {
                                setConfirming({ kind: "user", person });
                                setTyped("");
                              }}
                            >
                              <Trash2 size={14} />
                              Eliminar mi cuenta
                            </button>
                          ) : null
                        ) : writable ? (
                          <>
                            {person.platform_role !== "admin" && (
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy}
                                onClick={() => void setPlatformAccess(person, "admin")}
                              >
                                <ShieldCheck size={14} />
                                Hacer admin global
                              </button>
                            )}
                            {person.platform_role !== "viewer" && (
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy}
                                onClick={() => void setPlatformAccess(person, "viewer")}
                              >
                                <Eye size={14} />
                                Solo lectura
                              </button>
                            )}
                            {person.platform_role && (
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy}
                                onClick={() => void setPlatformAccess(person, "none")}
                              >
                                Quitar acceso
                              </button>
                            )}
                            <button
                              type="button"
                              className="text-button platform-admin-danger"
                              disabled={busy}
                              onClick={() => {
                                setConfirming({ kind: "user", person });
                                setTyped("");
                              }}
                            >
                              <Trash2 size={14} />
                              Eliminar usuario
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="platform-admin-empty">
                    No hay usuarios para mostrar.
                  </li>
                )}
              </ul>
            </section>
  );
}
