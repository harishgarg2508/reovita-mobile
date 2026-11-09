import { ReportDropZone } from '@shared/ui/report-drop-zone';

// Step 4 "First Report": the shared report upload block, with a skip link. Matches the Figma frame 29:554.
export function StepReportPrompt({ onChoose, onSkip }: { onChoose: () => void; onSkip: () => void }) {
  return <ReportDropZone onChoose={onChoose} onSkip={onSkip} />;
}
