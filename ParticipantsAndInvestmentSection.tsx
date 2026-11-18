import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Compass,
  DollarSign,
  ExternalLink,
  Filter,
  Info,
  Users,
} from 'lucide-react';
import {
  CameraPresetId,
  ComponentId,
  ParticipantCategory,
} from '../types/port';
import { TECHNICAL_SHEETS } from '../data/portData';
import {
  DOCUMENTED_PROFESSIONALS,
  INVESTMENT_RECORDS,
  PARTICIPANTS_APA_REFERENCES,
  PARTICIPANT_CATEGORY_LABELS,
  PROJECT_PARTICIPANTS,
} from '../data/participantsAndInvestmentData';

interface ParticipantsAndInvestmentSectionProps {
  highlightedComponentId: ComponentId | null;
  highlightedParticipantId: string | null;
  onClearHighlight: () => void;
  onFocusComponentIn3D: (id: ComponentId, preset: CameraPresetId) => void;
}

type CategoryFilter = 'todos' | ParticipantCategory;

export const ParticipantsAndInvestmentSection: React.FC<
  ParticipantsAndInvestmentSectionProps
> = ({
  highlightedComponentId,
  highlightedParticipantId,
  onClearHighlight,
  onFocusComponentIn3D,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('todos');

  const visibleParticipants = useMemo(() => {
    return PROJECT_PARTICIPANTS.filter((p) => {
      if (categoryFilter !== 'todos' && p.categoria !== categoryFilter) {
        return false;
      }
      if (
        highlightedComponentId &&
        !p.componentesRelacionados.includes(highlightedComponentId)
      ) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, highlightedComponentId]);

  const highlightedSheetName = highlightedComponentId
    ? TECHNICAL_SHEETS[highlightedComponentId]?.nombre
    : null;

  return (
    <section
      id="participantes-inversion"
      className="border-t border-slate-200 bg-[#F6F8FB] py-14"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        {/* Section Header */}
        <div className="border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
            Sección G · Gobernanza, Empresas y Economía de Obra
          </p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#0A192F] sm:text-3xl">
            Participantes e inversión del proyecto
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">
            Síntesis documental de los actores públicos y privados vinculados al Terminal Portuario
            Multipropósito de Chancay (corte de referencia: Fase 1 inaugurada el 14 de noviembre de
            2024 y hechos societarios hasta enero de 2025). Se distinguen expresamente propietarios,
            contratistas de alcance parcial, consultoras especializadas, proveedores de equipamiento
            y profesionales con cargo verificable en fuentes abiertas.
          </p>
        </div>

        {/* Highlight Banner when navigated from 3D Technical Sheet */}
        {highlightedComponentId && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-[#0A192F]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 shrink-0 text-[#2A5C82]" aria-hidden="true" />
              <span>
                Mostrando participantes vinculados al componente 3D:{' '}
                <strong>{highlightedSheetName || highlightedComponentId}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClearHighlight();
                setCategoryFilter('todos');
              }}
              className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0A192F] hover:bg-sky-100 cursor-pointer"
            >
              Ver todos los participantes
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrar participantes por función">
          {(
            [
              { id: 'todos', label: 'Todos los actores' },
              { id: 'propietarios', label: 'Propietarios y operador' },
              { id: 'constructores', label: 'Constructoras y contratistas' },
              { id: 'consultoras', label: 'Consultoras y supervisión' },
              { id: 'equipos', label: 'Proveedores de equipos' },
            ] as { id: CategoryFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={categoryFilter === tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                categoryFilter === tab.id
                  ? 'border-[#0A192F] bg-[#0A192F] text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Participant Cards Grid */}
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleParticipants.map((p) => {
            const isHighlightedCard = highlightedParticipantId === p.id;
            return (
              <article
                key={p.id}
                id={`participante-${p.id}`}
                className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition-shadow ${
                  isHighlightedCard
                    ? 'border-[#C83228] ring-2 ring-[#C83228]/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2A5C82]">
                      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {PARTICIPANT_CATEGORY_LABELS[p.categoria]}
                    </span>
                  </div>

                  <h3 className="font-display mt-2 text-base font-bold leading-snug text-[#0A192F]">
                    {p.nombre}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#C83228]">{p.categoriaEtiqueta}</p>

                  <dl className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
                    <div>
                      <dt className="font-semibold text-slate-900">Función:</dt>
                      <dd>{p.funcion}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Componente o alcance:</dt>
                      <dd>{p.alcanceEspecifico}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Etapa y período:</dt>
                      <dd>
                        {p.etapa} · <span className="font-mono-tech">{p.periodoReferencia}</span>
                      </dd>
                    </div>
                  </dl>

                  {p.notaAclaratoria && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-950">
                      <strong className="font-semibold">Precisión documental:</strong>{' '}
                      {p.notaAclaratoria}
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  {p.componentesRelacionados.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {p.componentesRelacionados.map((cid) => {
                        const sheet = TECHNICAL_SHEETS[cid];
                        if (!sheet) return null;
                        return (
                          <button
                            key={cid}
                            type="button"
                            onClick={() => onFocusComponentIn3D(cid, sheet.cameraPreset)}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-[#0A192F] hover:border-[#2A5C82] hover:bg-sky-50 cursor-pointer"
                          >
                            <Compass className="h-3 w-3 text-[#2A5C82]" aria-hidden="true" />
                            {sheet.nombre.split(' ')[0]} en 3D
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate" title={p.fuenteNombre}>
                      Fuente: {p.fuenteNombre}
                    </span>
                    <a
                      href={p.fuenteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#2A5C82] hover:underline"
                    >
                      Consultar
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {visibleParticipants.length === 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            No hay empresas registradas en esta categoría para el componente seleccionado.
          </div>
        )}

        {/* ================================================================= */}
        {/* DOCUMENTED PROFESSIONALS & ENGINEERING TEAMS                      */}
        {/* ================================================================= */}
        <div className="mt-14 border-t border-slate-200 pt-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Profesionales y equipos técnicos
              </p>
              <h3 className="font-display mt-1 text-xl font-bold text-[#0A192F]">
                Responsables con trayectoria públicamente documentada y equipos de ingeniería
              </h3>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-700">
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2A5C82]" aria-hidden="true" />
              <span>
                <strong>Criterio de rigor académico:</strong> Únicamente se listan ejecutivos y
                directivos de la concesionaria cuya función en el proyecto consta en registros y
                comunicaciones públicas verificables. No se incluyen autoridades políticas asistentes
                a ceremonias inaugurales como responsables de diseño u obra, ni se inventan nombres o
                biografías privadas. Asimismo, no se incorporan fotografías sin licencia o procedencia
                verificable.
              </span>
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DOCUMENTED_PROFESSIONALS.map((prof) => (
              <article
                key={prof.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <h4 className="font-display text-base font-bold text-[#0A192F]">
                    {prof.nombre}
                  </h4>
                  <p className="mt-0.5 text-xs font-semibold text-[#C83228]">
                    {prof.cargoPeriodo}
                  </p>
                  <p className="text-xs text-slate-500">{prof.entidad}</p>

                  <dl className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-700">
                    <div>
                      <dt className="font-semibold text-slate-900">Especialidad verificada:</dt>
                      <dd>{prof.especialidadVerificada}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Contribución al proyecto:</dt>
                      <dd>{prof.contribucionProyecto}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-900">Período de referencia:</dt>
                      <dd className="font-mono-tech">{prof.periodoReferencia}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                  <span className="truncate">{prof.fuenteNombre}</span>
                  <a
                    href={prof.fuenteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#2A5C82] hover:underline"
                  >
                    Fuente
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}

            {/* Explicit Multidisciplinary Engineering Teams Card */}
            <article className="flex flex-col justify-between rounded-xl border border-slate-300 bg-slate-50 p-4">
              <div>
                <h4 className="font-display text-base font-bold text-[#0A192F]">
                  Equipos multidisciplinarios de ingeniería y obra
                </h4>
                <p className="mt-0.5 text-xs font-semibold text-[#2A5C82]">
                  Diseño de detalle, geotecnia, obra marítima y control ambiental
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-700">
                  El cálculo estructural de pilotes y losas, el modelamiento hidrodinámico del
                  rompeolas, la excavación subterránea del túnel viaducto y la gestión ambiental del
                  MEIA-d fueron ejecutados por equipos técnicos especializados de{' '}
                  <strong>Consorcio CHEC–CCCC 4th</strong>, <strong>CREC 10</strong>,{' '}
                  <strong>Subterra (Systra Subterra)</strong>, <strong>ECSA Ingenieros</strong> y
                  supervisores geotécnicos. Los nombres individuales de proyectistas y residentes de
                  frente no figuran en nóminas públicas abiertas, por lo que no se atribuyen
                  autorías individuales no confirmadas.
                </p>
              </div>
              <p className="mt-3 border-t border-slate-200 pt-2.5 text-[11px] text-slate-500">
                Nota metodológica: En la maqueta 3D, los avatares de campo ilustran especialidades
                genéricas de obra sin nombres propios ficticios.
              </p>
            </article>
          </div>
        </div>

        {/* ================================================================= */}
        {/* INVESTMENTS AND COSTS                                             */}
        {/* ================================================================= */}
        <div className="mt-14 border-t border-slate-200 pt-10">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
            <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
            Inversiones y costos
          </p>
          <h3 className="font-display mt-1 text-xl font-bold text-[#0A192F]">
            Estructura financiera documentada y delimitación de montos
          </h3>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">
            Los importes se mantienen en su moneda original reportada (dólares estadounidenses, USD)
            para evitar distorsiones cambiarias sin fecha contractual única. No deben sumarse montos
            de contratos parciales con el total de la Fase 1 ni mezclarse la Fase 1 con la
            proyección multietapa del Plan Maestro.
          </p>

          {/* Economic Cards */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INVESTMENT_RECORDS.map((inv) => (
              <div
                key={inv.id}
                className={`flex flex-col justify-between rounded-xl border p-4 ${
                  inv.esSubconjuntoDeFase1
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2A5C82]">
                    {inv.concepto}
                  </span>
                  <p className="font-mono-tech mt-2 text-lg font-bold text-[#0A192F]">
                    {inv.importeOriginal}
                  </p>
                  <h4 className="font-display mt-1 text-sm font-semibold text-slate-900">
                    {inv.titulo}
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{inv.notaAlcance}</p>
                </div>
                <p className="mt-3 border-t border-slate-200/70 pt-2 text-[11px] text-slate-500">
                  Ref.: {inv.fechaReferencia}
                </p>
              </div>
            ))}
          </div>

          {/* Comparative Economic Table */}
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#0A192F]">
                  <th className="px-4 py-3 font-semibold">Etapa, contrato o componente</th>
                  <th className="px-4 py-3 font-semibold">Importe y moneda</th>
                  <th className="px-4 py-3 font-semibold">Fecha de referencia</th>
                  <th className="px-4 py-3 font-semibold">Concepto</th>
                  <th className="px-4 py-3 font-semibold">Fuente documental</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {INVESTMENT_RECORDS.map((inv) => (
                  <tr key={inv.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{inv.titulo}</p>
                      <p className="mt-0.5 text-slate-600">{inv.etapaContratoComponente}</p>
                    </td>
                    <td className="px-4 py-3 font-mono-tech font-semibold text-[#0A192F]">
                      {inv.importeOriginal}
                    </td>
                    <td className="px-4 py-3">{inv.fechaReferencia}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-medium text-slate-800">
                        {inv.concepto}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={inv.fuenteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#2A5C82] hover:underline"
                      >
                        {inv.fuenteNombre}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <p>
              <strong>Trazabilidad societaria y ausencia de desgloses unitarios:</strong> La
              participación accionaria del proyecto (60 % COSCO Shipping Ports / 40 % socio peruano)
              se actualiza respecto a su estructura inicial tras la escisión de Volcan hacia{' '}
              <em>Inversiones Portuarias Chancay S.A.A. (IPCH)</em> (2023–2024) y los procesos
              corporativos posteriores registrados ante la SMV/BVL (Integra Capital en Volcan y OPA de
              Transition Metals AG sobre IPCH entre dic. 2024 y ene. 2025). No existe desglose
              público verificado del costo unitario del túnel, de cada muelle ni de las grúas STS.
            </p>
          </div>
        </div>

        {/* Specific APA 7 References for Participants & Investment */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="font-display text-sm font-bold text-[#0A192F]">
            Referencias documentales de participantes e inversión (APA 7)
          </h4>
          <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-700">
            {PARTICIPANTS_APA_REFERENCES.map((r) => (
              <li key={r.id} className="border-b border-slate-100 pb-2 last:border-none last:pb-0">
                <p>{r.cita}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-slate-500">
                  <span>{r.notaVerificacion}</span>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#2A5C82] hover:underline"
                    >
                      {r.url}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
