import React from 'react';
import { Compass, Play } from 'lucide-react';

interface HeroSectionProps {
  onExplore3D: () => void;
  onStartPresentation: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExplore3D,
  onStartPresentation,
}) => {
  return (
    <section
      id="inicio"
      className="border-b border-slate-200 bg-[#0A192F] text-white"
    >
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/images__3__5707f9f7.jpeg"
                alt="Logo de la Universidad Peruana de Ciencias Aplicadas (UPC)"
                className="h-8 w-8 shrink-0 rounded-md bg-white p-0.5 object-contain shadow-xs"
              />
              <p className="text-xs font-medium tracking-wide text-slate-300">
                Ingeniería Civil · Recurso académico estudiantil para exposición universitaria (UPC)
              </p>
            </div>
            <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl text-balance">
              MEGAPUERTO DE CHANCAY — PERÚ
            </h1>
            <p className="font-display mt-2 text-lg font-medium text-sky-200 sm:text-xl">
              Maqueta virtual 3D interactiva
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
              Recorrido técnico por la Fase 1 del Terminal Portuario Multipropósito de Chancay
              (inaugurada el 14 de noviembre de 2024), concebido como nodo logístico de aguas
              profundas en el Pacífico sudamericano. Analiza cómo se articulan sus obras de abrigo
              frente al oleaje oceánico, los cuatro amarraderos sobre pilotes, la transferencia
              buque–muelle con grúas STS, el patio de contenedores y el enlace subterráneo del
              transporte pesado mediante el túnel viaducto hasta el complejo de ingreso.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onExplore3D}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C83228] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A92820] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                EXPLORAR MAQUETA 3D
              </button>

              <button
                type="button"
                onClick={onStartPresentation}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-500 bg-slate-800/70 px-5 py-3 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Recorrido guiado (1 min)
              </button>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              Nota metodológica: Maqueta tridimensional educativa con proporciones ilustrativas
              consistentes. No constituye un levantamiento topográfico oficial, modelo BIM
              contractual ni plano de construcción. Proyecto académico sin respaldo institucional
              oficial del concesionario ni de la UPC.
            </p>
          </div>

          {/* Right reference summary grid */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-700/80 bg-[#0F233D] p-5">
              <div>
                <p className="text-xs text-slate-400">Inauguración Fase 1</p>
                <p className="font-mono-tech mt-1 text-lg font-semibold text-white">
                  14 Nov 2024
                </p>
                <p className="mt-0.5 text-xs text-slate-400">Marco APEC Perú · Documentado</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Rompeolas principal</p>
                <p className="font-mono-tech mt-1 text-lg font-semibold text-white">~2.7 km</p>
                <p className="mt-0.5 text-xs text-slate-400">Obras de abrigo · Fase 1</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Túnel viaducto</p>
                <p className="font-mono-tech mt-1 text-lg font-semibold text-white">~1.8 km</p>
                <p className="mt-0.5 text-xs text-slate-400">Conexión subterránea</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Amarraderos iniciales</p>
                <p className="font-mono-tech mt-1 text-lg font-semibold text-white">4 muelles</p>
                <p className="mt-0.5 text-xs text-slate-400">Calado &gt;16 m (hasta 17.8 m)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
