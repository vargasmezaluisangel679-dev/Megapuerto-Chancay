import { useCallback, useState } from 'react';
import { CameraPresetId, ComponentId, ExplorationMode } from './types/port';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { PortExplorer3D } from './components/PortExplorer3D';
import { AcademicSections } from './components/AcademicSections';
import { ParticipantsAndInvestmentSection } from './components/ParticipantsAndInvestmentSection';
import { CommunityFeedbackSection } from './components/CommunityFeedbackSection';

export default function App() {
  const [selectedComponent, setSelectedComponent] = useState<ComponentId | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('general');
  const [mode, setMode] = useState<ExplorationMode>('libre');
  const [activeSpecialtyId, setActiveSpecialtyId] = useState<string>('estructuras');
  const [presentationMode, setPresentationMode] = useState(false);
  const [externalFocusNonce, setExternalFocusNonce] = useState(0);
  const [tunnelCutawayNonce, setTunnelCutawayNonce] = useState(0);
  const [structuralCutawayNonce, setStructuralCutawayNonce] = useState(0);

  const [highlightedComponentForParticipants, setHighlightedComponentForParticipants] =
    useState<ComponentId | null>(null);
  const [highlightedParticipantId, setHighlightedParticipantId] = useState<string | null>(
    null
  );

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleFocusComponentIn3D = useCallback(
    (
      id: ComponentId,
      preset: CameraPresetId,
      options?: { tunnelCutaway?: boolean; structuralCutaway?: boolean }
    ) => {
      setMode('libre');
      setSelectedComponent(id);
      setActivePreset(preset);
      setExternalFocusNonce((n) => n + 1);
      if (options?.tunnelCutaway) {
        setTunnelCutawayNonce((n) => n + 1);
      }
      if (options?.structuralCutaway) {
        setStructuralCutawayNonce((n) => n + 1);
      }
      scrollToSection('explorador-3d');
    },
    [scrollToSection]
  );

  const handleHighlightSpecialtyIn3D = useCallback(
    (specialtyId: string, preset: CameraPresetId) => {
      setSelectedComponent(null);
      setActiveSpecialtyId(specialtyId);
      setMode('ingenieria');
      setActivePreset(preset);
      setExternalFocusNonce((n) => n + 1);
      scrollToSection('explorador-3d');
    },
    [scrollToSection]
  );

  const handleActivateOperationsIn3D = useCallback(() => {
    setMode('operaciones');
    setActivePreset('gruas');
    setExternalFocusNonce((n) => n + 1);
    scrollToSection('explorador-3d');
  }, [scrollToSection]);

  const handleNavigateToParticipant = useCallback(
    (componentId: ComponentId, participantId?: string) => {
      setPresentationMode(false);
      setHighlightedComponentForParticipants(componentId);
      setHighlightedParticipantId(participantId ?? null);
      window.setTimeout(() => {
        const targetId = participantId
          ? `participante-${participantId}`
          : 'participantes-inversion';
        const el =
          document.getElementById(targetId) ||
          document.getElementById('participantes-inversion');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#0B1D33]">
      {!presentationMode && <Navbar onNavigate={scrollToSection} />}

      <main>
        {!presentationMode && (
          <HeroSection
            onExplore3D={() => scrollToSection('explorador-3d')}
            onStartPresentation={() => {
              setMode('guiado');
              setPresentationMode(true);
            }}
          />
        )}

        <PortExplorer3D
          selectedComponent={selectedComponent}
          onSelectComponent={setSelectedComponent}
          activePreset={activePreset}
          onChangePreset={setActivePreset}
          mode={mode}
          onChangeMode={setMode}
          activeSpecialtyId={activeSpecialtyId}
          onChangeSpecialtyId={setActiveSpecialtyId}
          presentationMode={presentationMode}
          onTogglePresentationMode={() => setPresentationMode((p) => !p)}
          externalFocusNonce={externalFocusNonce}
          tunnelCutawayNonce={tunnelCutawayNonce}
          structuralCutawayNonce={structuralCutawayNonce}
          onNavigateToParticipant={handleNavigateToParticipant}
        />

        {!presentationMode && (
          <>
            <AcademicSections
              onFocusComponentIn3D={handleFocusComponentIn3D}
              onHighlightSpecialtyIn3D={handleHighlightSpecialtyIn3D}
              onActivateOperationsIn3D={handleActivateOperationsIn3D}
            />

            <ParticipantsAndInvestmentSection
              highlightedComponentId={highlightedComponentForParticipants}
              highlightedParticipantId={highlightedParticipantId}
              onClearHighlight={() => {
                setHighlightedComponentForParticipants(null);
                setHighlightedParticipantId(null);
              }}
              onFocusComponentIn3D={handleFocusComponentIn3D}
            />

            <CommunityFeedbackSection />
          </>
        )}
      </main>
    </div>
  );
}

