import { useState } from 'react';
import { IconInfo, IconLock } from './icons';
import { Modal } from './ui';

export default function PrivacyNote({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`card privacy-note ${compact ? 'compact' : ''}`}>
      <span className="privacy-icon">
        <IconLock width={16} height={16} />
      </span>
      <div className="privacy-copy">
        <strong>Your activity stays on this device.</strong>
        <p>
          Nothing is uploaded. No screenshots are stored. Typed content is not permanently stored by
          the observer.
        </p>
      </div>
      <button className="text-btn" onClick={() => setOpen(true)}>
        <IconInfo width={14} height={14} />
        How this works
      </button>

      {open && (
        <Modal title="How this works" onClose={() => setOpen(false)} width={400}>
          <p className="modal-copy">
            Allworks is local-first. Here’s what the observer actually does:
          </p>
          <ol className="modal-steps">
            <li>Allworks observes interaction metadata locally — which apps you use and what you click, type or open.</li>
            <li>It looks for sequences you repeat and notes when one appears enough times to be worth automating.</li>
            <li>Nothing is sent to the cloud. There is no account, and no screenshots are taken.</li>
            <li>You decide whether to turn a suggestion into an automation — nothing runs without you choosing it.</li>
          </ol>
          <div className="modal-actions">
            <button className="btn primary" onClick={() => setOpen(false)}>
              Got it
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}