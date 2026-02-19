const LABELS = [
  { val: 'sexual', label: 'Sexual' },
  { val: 'nudity', label: 'Nudity' },
  { val: 'porn', label: 'Porn' },
  { val: 'graphic-media', label: 'Graphic Media' },
];

const LANGUAGES = [
  { code: 'ja', label: 'Japanese' },
  { code: 'en', label: 'English' },
];

interface PostOptionsProps {
  languages: string[];
  setLanguages: (langs: string[]) => void;
  labels: string[];
  setLabels: (labels: string[]) => void;
  threadgate: string[];
  setThreadgate: (rules: string[]) => void;
}

export function PostOptions({
  languages,
  setLanguages,
  labels,
  setLabels,
  threadgate,
  setThreadgate,
}: PostOptionsProps) {
  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
      <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Languages</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {LANGUAGES.map((lang) => (
          <label key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input
              type="checkbox"
              checked={languages.includes(lang.code)}
              onChange={(e) => {
                if (e.target.checked) setLanguages([...languages, lang.code]);
                else setLanguages(languages.filter((l) => l !== lang.code));
              }}
            />
            {lang.label}
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Content Warnings</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {LABELS.map((lbl) => (
          <label key={lbl.val} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input
              type="checkbox"
              checked={labels.includes(lbl.val)}
              onChange={(e) => {
                if (e.target.checked) setLabels([...labels, lbl.val]);
                else setLabels(labels.filter((l) => l !== lbl.val));
              }}
            />
            {lbl.label}
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Advanced</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', gap: 15 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>Who can reply?</span>
          {['mention', 'follower', 'following'].map((rule) => (
            <label key={rule} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input
                type="checkbox"
                value={rule}
                checked={threadgate.includes(rule)}
                onChange={(e) => {
                  if (e.target.checked) setThreadgate([...threadgate, rule]);
                  else setThreadgate(threadgate.filter((r) => r !== rule));
                }}
              />
              {rule.charAt(0).toUpperCase() + rule.slice(1)}s
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
