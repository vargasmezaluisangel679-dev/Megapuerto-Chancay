import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'explorador-3d', label: 'Explorador 3D' },
    { id: 'infraestructura', label: 'Infraestructura' },
    { id: 'ingenieria', label: 'Ingeniería' },
    { id: 'participantes-inversion', label: 'Participantes' },
    { id: 'documentacion', label: 'Documentación' },
    { id: 'opiniones', label: 'Opiniones' },
  ];

  const handleNav = (id: string) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 py-3.5 sm:px-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            handleNav('inicio');
          }}
          className="font-display text-lg font-bold tracking-tight text-[#0A192F] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#2A5C82]"
        >
          Megapuerto de Chancay
        </a>

        {/* Zone 2: Concise single-line text links */}
        <nav
          aria-label="Navegación principal"
          className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNav(item.id);
              }}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#0A192F] hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#2A5C82]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('explorador-3d')}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#0A192F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E3A5F] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C83228]"
          >
            Explorar Maqueta
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Menú móvil"
          className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
        >
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.id);
                }}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => handleNav('explorador-3d')}
              className="mt-1 w-full rounded-lg bg-[#0A192F] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Explorar Maqueta 3D
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};
