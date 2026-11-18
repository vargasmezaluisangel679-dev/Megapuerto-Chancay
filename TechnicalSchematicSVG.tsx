import React from 'react';
import { TechnicalSheet } from '../types/port';

interface Props {
  tipo: TechnicalSheet['esquemaTipo'];
  className?: string;
}

export const TechnicalSchematicSVG: React.FC<Props> = ({ tipo, className = '' }) => {
  return (
    <div
      className={`w-full rounded-lg border border-slate-200 bg-[#0A192F] p-3 text-slate-100 ${className}`}
    >
      <svg
        viewBox="0 0 360 182"
        className="w-full h-auto"
        role="img"
        aria-label={`Esquema técnico ilustrativo: ${tipo}`}
      >
        <defs>
          <pattern id={`gridTech-${tipo}`} width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="360" height="164" fill={`url(#gridTech-${tipo})`} />

        {tipo === 'rompeolas' && (
          <g>
            <line x1="15" y1="138" x2="345" y2="138" stroke="#64748b" strokeWidth="1.5" />
            <path d="M15,92 Q60,84 105,92 L120,92" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
            <line x1="255" y1="106" x2="345" y2="106" stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="4 3" />
            <polygon points="85,138 165,48 215,48 275,138" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
            <polygon points="115,138 172,64 208,64 245,138" fill="#78716c" />
            <rect x="174" y="34" width="32" height="16" fill="#cbd5e1" />
            <circle cx="132" cy="108" r="6" fill="#94a3b8" />
            <circle cx="144" cy="94" r="6" fill="#94a3b8" />
            <circle cx="156" cy="80" r="6" fill="#94a3b8" />
            <text x="20" y="76" fill="#38bdf8" fontSize="8.5">Oleaje Pacífico (SO)</text>
            <text x="190" y="25" fill="#f8fafc" fontSize="8.5" textAnchor="middle">Coronación / Espaldón</text>
            <text x="190" y="112" fill="#f8fafc" fontSize="8.5" textAnchor="middle">Núcleo granular</text>
            <text x="92" y="56" fill="#e2e8f0" fontSize="8">Coraza disipadora</text>
            <text x="262" y="96" fill="#7dd3fc" fontSize="8.5">Dársena abrigada</text>
            <text x="298" y="119" fill="#94a3b8" fontSize="7.5" textAnchor="middle">NMM 0.00 m (ref.)</text>
            <text x="180" y="156" fill="#94a3b8" fontSize="7.5" textAnchor="middle">Esquema hidráulico didáctico (no representa plano constructivo)</text>
          </g>
        )}

        {tipo === 'muelle' && (
          <g>
            <line x1="15" y1="144" x2="345" y2="144" stroke="#78716c" strokeWidth="2" />
            <line x1="15" y1="92" x2="345" y2="92" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5 3" />
            <line x1="36" y1="92" x2="36" y2="144" stroke="#7dd3fc" strokeWidth="1" />
            <polygon points="33,96 39,96 36,92" fill="#7dd3fc" />
            <polygon points="33,140 39,140 36,144" fill="#7dd3fc" />
            <rect x="65" y="42" width="250" height="14" fill="#cbd5e1" />
            <rect x="85" y="56" width="16" height="14" fill="#94a3b8" />
            <rect x="172" y="56" width="16" height="14" fill="#94a3b8" />
            <rect x="259" y="56" width="16" height="14" fill="#94a3b8" />
            <rect x="89" y="70" width="8" height="74" fill="#64748b" />
            <rect x="176" y="70" width="8" height="74" fill="#64748b" />
            <rect x="263" y="70" width="8" height="74" fill="#64748b" />
            <rect x="54" y="54" width="11" height="20" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.6" />
            <rect x="92" y="34" width="10" height="8" fill="#eab308" />
            <text x="190" y="29" fill="#f8fafc" fontSize="8.5" textAnchor="middle">Losa tablero + Vigas portacarril</text>
            <text x="38" y="47" fill="#cbd5e1" fontSize="7.5">Defensa</text>
            <text x="112" y="37" fill="#fde047" fontSize="7.5">Bolardo</text>
            <text x="296" y="85" fill="#7dd3fc" fontSize="7.5" textAnchor="middle">NMM 0.00 m</text>
            <text x="64" y="114" fill="#7dd3fc" fontSize="7.5">Calado &gt;16 m</text>
            <text x="64" y="124" fill="#7dd3fc" fontSize="7">(hasta 17.8 m)</text>
            <text x="216" y="122" fill="#cbd5e1" fontSize="8.5" textAnchor="middle">Pilotes profundos en lecho marino</text>
          </g>
        )}

        {tipo === 'tunel' && (
          <g>
            <path d="M36,143 L36,64 Q180,4 324,64 L324,143 Z" fill="#475569" opacity="0.55" />
            <path d="M74,138 L74,80 A106,62 0 0,1 286,80 L286,138" fill="none" stroke="#94a3b8" strokeWidth="7" strokeDasharray="6 3" />
            <path d="M84,138 L84,82 A96,54 0 0,1 276,82 L276,138" fill="#0f172a" stroke="#e2e8f0" strokeWidth="5" />
            {/* 3 vehicular lanes */}
            <rect x="94" y="124" width="124" height="11" fill="#334155" />
            <line x1="135" y1="124" x2="135" y2="135" stroke="#facc15" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="176" y1="124" x2="176" y2="135" stroke="#facc15" strokeWidth="1.2" strokeDasharray="3 2" />
            {/* Lateral technical corridor / service duct zone */}
            <rect x="220" y="96" width="46" height="39" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
            <circle cx="243" cy="112" r="7" fill="#38bdf8" opacity="0.85" />
            <rect x="86" y="119" width="8" height="16" fill="#cbd5e1" />
            <circle cx="155" cy="48" r="6" fill="#38bdf8" />
            <text x="180" y="21" fill="#cbd5e1" fontSize="8" textAnchor="middle">Sostenimiento primario (Shotcrete / Pernos)</text>
            <text x="180" y="68" fill="#f8fafc" fontSize="8.5" textAnchor="middle">Revestimiento definitivo concreto armado</text>
            <text x="156" y="116" fill="#7dd3fc" fontSize="7.5" textAnchor="middle">3 carriles vehiculares</text>
            <text x="243" y="91" fill="#fde047" fontSize="7" textAnchor="middle">Corredor servicios</text>
            <text x="180" y="155" fill="#94a3b8" fontSize="7.5" textAnchor="middle">Sección didáctica ilustrativa (no es plano as-built de CREC 10)</text>
          </g>
        )}

        {tipo === 'patio' && (
          <g>
            <rect x="24" y="118" width="312" height="16" fill="#334155" />
            <rect x="46" y="82" width="42" height="36" fill="#0f4c81" stroke="#93c5fd" strokeWidth="0.8" />
            <rect x="94" y="94" width="42" height="24" fill="#c83228" />
            <rect x="142" y="82" width="42" height="36" fill="#d99b18" />
            <path d="M36,118 L36,48 L194,48 L194,118" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
            <line x1="36" y1="118" x2="36" y2="62" stroke="#0f4c81" strokeWidth="3.5" />
            <line x1="194" y1="118" x2="194" y2="62" stroke="#0f4c81" strokeWidth="3.5" />
            <rect x="104" y="45" width="22" height="9" fill="#c83228" />
            <rect x="228" y="86" width="44" height="32" fill="#2f6f4e" />
            <rect x="280" y="60" width="38" height="58" fill="#cbd5e1" />
            <rect x="280" y="54" width="38" height="6" fill="#0f4c81" />
            <text x="115" y="36" fill="#7dd3fc" fontSize="8.5" textAnchor="middle">Pórtico RMG / RTG sobre bloques ISO</text>
            <text x="299" y="48" fill="#cbd5e1" fontSize="7.5" textAnchor="middle">Control</text>
            <text x="180" y="152" fill="#cbd5e1" fontSize="8.5" textAnchor="middle">Explanada pavimentada de patio portuario y carriles internos</text>
          </g>
        )}

        {tipo === 'camiones' && (
          <g>
            {/* Closed logistics loop diagram */}
            <rect x="34" y="42" width="292" height="84" rx="16" fill="none" stroke="#475569" strokeWidth="14" />
            <rect x="34" y="42" width="292" height="84" rx="16" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="6 4" />
            {/* Truck 1 */}
            <rect x="78" y="34" width="46" height="16" rx="2" fill="#0f4c81" />
            <rect x="124" y="36" width="14" height="14" rx="2" fill="#e2e8f0" />
            {/* Truck 2 */}
            <rect x="210" y="118" width="46" height="16" rx="2" fill="#c83228" />
            <rect x="196" y="120" width="14" height="14" rx="2" fill="#e2e8f0" />
            <text x="108" y="24" fill="#7dd3fc" fontSize="8" textAnchor="middle">Espera bajo Grúa STS #1</text>
            <text x="230" y="148" fill="#cbd5e1" fontSize="8" textAnchor="middle">Retorno por carril de patio (giro suavizado)</text>
            <text x="180" y="88" fill="#f8fafc" fontSize="8.5" textAnchor="middle">Circuito cerrado Muelle ⇄ Patio</text>
          </g>
        )}

        {tipo === 'ingreso' && (
          <g>
            <rect x="22" y="114" width="316" height="16" fill="#334155" />
            {/* Tunnel portal east */}
            <path d="M36,114 L36,76 A24,22 0 0,1 84,76 L84,114 Z" fill="#1e293b" stroke="#cbd5e1" strokeWidth="3" />
            {/* Gate canopy + booths */}
            <rect x="150" y="64" width="66" height="9" fill="#0f4c81" />
            <rect x="158" y="73" width="14" height="41" fill="#f1f5f9" />
            <rect x="194" y="73" width="14" height="41" fill="#f1f5f9" />
            {/* Highway ramp */}
            <rect x="260" y="96" width="64" height="18" fill="#475569" />
            <line x1="260" y1="105" x2="324" y2="105" stroke="#facc15" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x="60" y="46" fill="#7dd3fc" fontSize="8" textAnchor="middle">Portal Este Túnel</text>
            <text x="183" y="54" fill="#f8fafc" fontSize="8.5" textAnchor="middle">Garitas y Balanzas</text>
            <text x="292" y="86" fill="#fde047" fontSize="8" textAnchor="middle">Red Vial Nacional</text>
            <text x="180" y="150" fill="#cbd5e1" fontSize="8.5" textAnchor="middle">Articulación Antepuerto Logístico → Túnel → Terminal Marítimo</text>
          </g>
        )}

        {tipo === 'terreno' && (
          <g>
            {/* Sea -> Breakwater -> Yard Slab -> Cerro Trinidad -> Antepuerto */}
            <rect x="16" y="112" width="108" height="24" fill="#1b4b68" />
            <polygon points="48,112 64,92 78,92 92,112" fill="#64748b" />
            <rect x="116" y="98" width="66" height="14" fill="#94a3b8" />
            <path d="M180,112 L195,52 Q226,38 258,56 L272,88 L340,88 L340,136 L116,136 Z" fill="#8b7964" />
            <line x1="182" y1="104" x2="270" y2="96" stroke="#facc15" strokeWidth="2.5" strokeDasharray="4 2" />
            <text x="58" y="82" fill="#7dd3fc" fontSize="8" textAnchor="middle">Rompeolas</text>
            <text x="148" y="90" fill="#f8fafc" fontSize="8" textAnchor="middle">Patio (+1.9 u.)</text>
            <text x="226" y="34" fill="#fde68a" fontSize="8.5" textAnchor="middle">Relieve Costero (Cerro Trinidad)</text>
            <text x="226" y="118" fill="#fef08a" fontSize="7.5" textAnchor="middle">Trazo túnel (~1.8 km ref.)</text>
            <text x="308" y="79" fill="#f8fafc" fontSize="8" textAnchor="middle">Ingreso (+3.25 u.)</text>
          </g>
        )}

        {tipo === 'oceano' && (
          <g>
            <line x1="15" y1="142" x2="345" y2="142" stroke="#64748b" strokeWidth="1.5" />
            <path d="M16,92 Q36,78 56,92 T96,92 T136,92" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
            <polygon points="145,142 164,58 188,58 206,142" fill="#64748b" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M210,98 Q235,96 260,98 T310,98 T344,98" fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
            <text x="76" y="68" fill="#38bdf8" fontSize="8.5" textAnchor="middle">Oleaje Pacífico (Mar abierto)</text>
            <text x="176" y="48" fill="#f8fafc" fontSize="8" textAnchor="middle">Abrigo</text>
            <text x="278" y="86" fill="#7dd3fc" fontSize="8.5" textAnchor="middle">Dársena atenuada (~86% menos amplitud)</text>
            <text x="180" y="156" fill="#cbd5e1" fontSize="8" textAnchor="middle">Contraste hidrodinámico ilustrativo (sin batimetría contractual)</text>
          </g>
        )}

        {/* Academic scale disclaimer footer inside SVG */}
        <rect x="0" y="164" width="360" height="18" fill="#071222" />
        <text x="180" y="176" fill="#94a3b8" fontSize="7.5" textAnchor="middle">
          Esquema didáctico ilustrativo · Sin escala de plano constructivo oficial
        </text>
      </svg>
    </div>
  );
};
