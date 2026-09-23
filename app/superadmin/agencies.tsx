"use client";
// Agencias y suscripciones del panel global.
// Extraído de superadmin/page.tsx (issue #46): misma JSX y comportamiento.
import {Building2} from "lucide-react";
import {formatPlatformMetric, type Agency, type State} from "./model";
import {StatusBadge, manualAccessLabel, money, platformDate} from "./model";
import {Trash2} from "lucide-react";

type PlatformAgenciesProps = {
  busy: boolean;
  state: State;
  writable: boolean;
  setConfirming: (value: import("./model").ConfirmRequest) => void;
  setTyped: (value: string) => void;
  manageSubscription: (agency: Agency) => Promise<void>;
};

export function PlatformAgencies({busy, state, writable, setConfirming, setTyped, manageSubscription}: PlatformAgenciesProps){
  return (
          <section className="platform-admin-section platform-admin-agencies">
            <div className="platform-admin-section-heading">
              <div>
                <p className="eyebrow">AGENCIAS</p>
                <h2>Agencias y suscripciones</h2>
              </div>
              <small>Gestioná el acceso manual junto a cada registro</small>
            </div>
            <div className="platform-admin-table-wrap">
              <table className="platform-admin-ledger">
                <thead>
                  <tr>
                    <th>Agencia</th>
                    <th>Estado</th>
                    <th>Plan</th>
                    <th>Usuarios</th>
                    <th>Prueba / vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {state.agencies.length ? (
                    state.agencies.map((agency) => (
                      <tr key={agency.id}>
                        <td>
                          <b>{agency.name || "Agencia sin nombre"}</b>
                          <small>{agency.slug || "Sin identificador"}</small>
                        </td>
                        <td>
                          <div className="platform-admin-cell-stack">
                            <StatusBadge
                              tone={agency.active ? "success" : "neutral"}
                            >
                              {agency.active ? "Activa" : "Inactiva"}
                            </StatusBadge>
                            <StatusBadge
                              tone={
                                agency.internal_subscription_state ===
                                "suspended"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {manualAccessLabel(agency)}
                            </StatusBadge>
                          </div>
                        </td>
                        <td>
                          {money(
                            agency.subscription_amount,
                            agency.subscription_currency,
                          )}
                        </td>
                        <td>{formatPlatformMetric(agency.active_users)}</td>
                        <td>
                          <div className="platform-admin-cell-stack">
                            <span>
                              {platformDate(
                                agency.internal_subscription_expires_at ||
                                  agency.trial_ends_at ||
                                  agency.due_at,
                              )}
                            </span>
                            {writable && (
                            <button
                              type="button"
                              className="text-button platform-admin-inline-action"
                              disabled={busy}
                              onClick={() => void manageSubscription(agency)}
                            >
                              Gestionar estado manual
                            </button>
                            )}
                            {writable && (
                              <button
                                type="button"
                                className="text-button platform-admin-danger"
                                disabled={busy}
                                onClick={() => {
                                  setConfirming({ kind: "agency", agency });
                                  setTyped("");
                                }}
                              >
                                <Trash2 size={14} />
                                Eliminar agencia
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="platform-admin-empty">
                        No hay agencias para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="platform-admin-agency-cards">
              {state.agencies.length ? (
                state.agencies.map((agency) => (
                  <article
                    className="platform-admin-agency-card"
                    key={agency.id}
                  >
                    <div>
                      <b>{agency.name || "Agencia sin nombre"}</b>
                      <small>{agency.slug || "Sin identificador"}</small>
                    </div>
                    <div className="platform-admin-card-badges">
                      <StatusBadge tone={agency.active ? "success" : "neutral"}>
                        {agency.active ? "Activa" : "Inactiva"}
                      </StatusBadge>
                      <StatusBadge
                        tone={
                          agency.internal_subscription_state === "suspended"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {manualAccessLabel(agency)}
                      </StatusBadge>
                    </div>
                    <dl>
                      <div>
                        <dt>Plan</dt>
                        <dd>
                          {money(
                            agency.subscription_amount,
                            agency.subscription_currency,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Usuarios</dt>
                        <dd>{formatPlatformMetric(agency.active_users)}</dd>
                      </div>
                      <div>
                        <dt>Vencimiento</dt>
                        <dd>
                          {platformDate(
                            agency.internal_subscription_expires_at ||
                              agency.trial_ends_at ||
                              agency.due_at,
                          )}
                        </dd>
                      </div>
                    </dl>
                    {writable && (
                    <button
                      type="button"
                      className="text-button platform-admin-inline-action"
                      disabled={busy}
                      onClick={() => void manageSubscription(agency)}
                    >
                      Gestionar estado manual
                    </button>
                    )}
                    {writable && (
                      <button
                        type="button"
                        className="text-button platform-admin-danger"
                        disabled={busy}
                        onClick={() => {
                          setConfirming({ kind: "agency", agency });
                          setTyped("");
                        }}
                      >
                        <Trash2 size={14} />
                        Eliminar agencia
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <p className="platform-admin-empty">
                  No hay agencias para mostrar.
                </p>
              )}
            </div>
          </section>
  );
}
