import { useApp } from '../AppContext';
import MicWidget from '../components/MicWidget';
import { IconSparkle } from '../components/icons';
import { plural } from '../format';

export default function VoiceView() {
  const app = useApp();

  return (
    <div className="view view-voice">
      <header className="page-head">
        <div>
          <h1>Voice</h1>
          <p className="page-sub">Run any saved automation just by saying its name.</p>
        </div>
      </header>

      {app.automations.length === 0 ? (
        <div className="card empty-suggest pop-in">
          <span className="suggestion-icon dim">
            <IconSparkle width={20} height={20} />
          </span>
          <h3>Hear more to say, say more to do</h3>
          <p>
            Voice needs at least one saved automation. Record a workflow, save it, then come back
            here and say its name.
          </p>
        </div>
      ) : (
        <>
          <MicWidget />

          <div className="card voice-list">
            <strong>Speakable automations</strong>
            {app.automations.length === 0 ? null : (
              <ul>
                {app.automations.map((automation) => (
                  <li key={automation.id}>
                    <span className="voice-name">{automation.name}</span>
                    <span className="voice-meta">{plural(automation.steps.length, 'step')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}