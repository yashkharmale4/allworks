import { useState } from 'react';
import * as api from '../api';
import { useApp } from '../AppContext';
import { IconCheck, IconDocFile, IconTable, IconX } from '../components/icons';
import type { AppendResult, ContactRecord } from '../types';

function pathName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export default function ExcelView() {
  const app = useApp();
  const [workbookPath, setWorkbookPath] = useState('');
  const [dataPath, setDataPath] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [rows, setRows] = useState<ContactRecord[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [appending, setAppending] = useState(false);
  const [appendResult, setAppendResult] = useState<AppendResult | null>(null);

  async function pickWorkbook() {
    app.clearError();
    const picked = await api.excelPickFile('workbook').catch((e) => {
      app.toast(String(e), 'error');
      return null;
    });
    if (picked) {
      setWorkbookPath(picked);
      setAppendResult(null);
    }
  }

  async function pickData() {
    app.clearError();
    const picked = await api.excelPickFile('data').catch((e) => {
      app.toast(String(e), 'error');
      return null;
    });
    if (!picked) return;
    setDataPath(picked);
    setAppendResult(null);
    await extract(picked);
  }

  async function extract(path: string) {
    setExtracting(true);
    setRows([]);
    setSource('');
    try {
      const result = await api.excelExtract(path);
      setSource(result.source);
      setRows(result.records);
      app.toast(
        `${result.records.length} record(s) found${result.skipped ? `, ${result.skipped} duplicate(s) skipped` : ''}`,
        'success',
      );
    } catch (e) {
      app.toast(String(e), 'error');
    } finally {
      setExtracting(false);
    }
  }

  function updateRow(index: number, field: 'name' | 'phone', value: string) {
    setRows((list) => list.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeRow(index: number) {
    setRows((list) => list.filter((_, i) => i !== index));
  }

  async function appendRows() {
    app.clearError();
    if (!workbookPath.trim()) {
      app.toast('Pick or type the path of your Excel workbook first', 'error');
      return;
    }
    if (rows.length === 0) {
      app.toast('Nothing to append — extract a PDF/JSON first', 'error');
      return;
    }
    setAppending(true);
    try {
      const result = await api.excelAppend(workbookPath.trim(), rows);
      setAppendResult(result);
      app.toast(
        result.appended > 0
          ? `Appended ${result.appended} row(s) to “${result.sheet}”`
          : 'No new rows — they were already in the sheet',
        result.appended > 0 ? 'success' : 'info',
      );
    } catch (e) {
      app.toast(String(e), 'error');
    } finally {
      setAppending(false);
    }
  }

  function startOver() {
    setDataPath(null);
    setSource('');
    setRows([]);
    setAppendResult(null);
  }

  const ready = workbookPath.trim().trimEnd().toLowerCase().endsWith('.xlsx');

  return (
    <div className="view view-excel">
      <header className="page-head">
        <div>
          <h1>Excel Import</h1>
          <p className="page-sub">
            Drop a PDF or JSON, we pull out each Name + Phone, and the next empty cells in your
            sheet get filled — row by row, until every record is in.
          </p>
        </div>
      </header>

      <div className="excel-grid">
        <section className="card excel-step">
          <div className="excel-step-head">
            <span className="excel-step-no">1</span>
            <strong>Open your workbook</strong>
          </div>
          <p className="excel-hint">Your existing .xlsx — rows will be added below whatever is already there.</p>
          <div className="excel-pick-row">
            <input
              className="excel-path-input"
              value={workbookPath}
              onChange={(e) => {
                setWorkbookPath(e.target.value);
                setAppendResult(null);
              }}
              placeholder="C:\path\to\contacts.xlsx"
              spellCheck={false}
            />
            <button className="btn" onClick={pickWorkbook} disabled={app.busy}>
              <IconTable width={15} height={15} />
              Pick file
            </button>
          </div>
        </section>

        <section className="card excel-step">
          <div className="excel-step-head">
            <span className="excel-step-no">2</span>
            <strong>Choose a PDF or JSON</strong>
          </div>
          <p className="excel-hint">Names and mobile numbers are read automatically from the text.</p>
          <div className="excel-pick-row">
            <button className="btn primary" onClick={pickData} disabled={extracting || app.busy}>
              {extracting ? (
                <span className="spinner" />
              ) : (
                <IconDocFile width={15} height={15} />
              )}
              {dataPath ? 'Pick another file…' : 'Pick PDF / JSON…'}
            </button>
            {dataPath && (
              <button className="btn ghost" onClick={startOver} title="Start over">
                <IconX width={13} height={13} />
                Clear
              </button>
            )}
          </div>
          {dataPath && (
            <div className="excel-path-tag">
              <IconDocFile width={13} height={13} />
              <span>{source || pathName(dataPath)}</span>
            </div>
          )}
        </section>
      </div>

      <section className="card excel-step excel-preview">
        <div className="excel-step-head">
          <span className="excel-step-no">3</span>
          <strong>Review, fix, then append</strong>
          {rows.length > 0 && <span className="excel-count">{rows.length} row(s)</span>}
        </div>

        {rows.length === 0 ? (
          <div className="empty excel-empty">
            <div className="empty-icon">
              <IconDocFile width={20} height={20} />
            </div>
            {!dataPath && !extracting ? (
              <>
                <h3>Nothing extracted yet</h3>
                <p>Pick a PDF or JSON in step 2 and the records will show up here for you to check.</p>
              </>
            ) : extracting ? (
              <>
                <h3>Reading the file…</h3>
                <p>Looking for names and phone numbers.</p>
              </>
            ) : (
              <>
                <h3>No Name + Phone records</h3>
                <p>No phone numbers were found in that file. Try a different one.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="col-idx">#</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th className="col-x" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="col-idx">{i + 1}</td>
                      <td>
                        <input
                          className="excel-cell-input"
                          value={row.name}
                          onChange={(e) => updateRow(i, 'name', e.target.value)}
                          placeholder="Name"
                          spellCheck={false}
                        />
                      </td>
                      <td>
                        <input
                          className="excel-cell-input"
                          value={row.phone}
                          onChange={(e) => updateRow(i, 'phone', e.target.value)}
                          placeholder="Phone"
                          spellCheck={false}
                        />
                      </td>
                      <td className="col-x">
                        <button className="icon-btn" title="Remove row" onClick={() => removeRow(i)}>
                          <IconX width={13} height={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="excel-actions">
              <button
                className="btn primary excel-append-btn"
                onClick={appendRows}
                disabled={appending || app.busy || !ready}
                title={ready ? undefined : 'Set a .xlsx workbook path in step 1'}
              >
                {appending ? <span className="spinner" /> : <IconTable width={15} height={15} />}
                {appending ? 'Appending…' : `Append ${rows.length} row(s) to sheet`}
              </button>
              {!ready && workbookPath.trim() && !workbookPath.trimEnd().toLowerCase().endsWith('.xlsx') && (
                <span className="excel-warn">Only .xlsx files are supported.</span>
              )}
            </div>

            {appendResult && (
              <div className="excel-result">
                <IconCheck width={16} height={16} />
                <div>
                  <strong>
                    {appendResult.appended > 0
                      ? `Added ${appendResult.appended} row(s) to “${appendResult.sheet}”`
                      : 'Everything was already in the sheet'}
                  </strong>
                  {appendResult.appended > 0 && (
                    <span>
                      Written into rows {appendResult.start_row} – {appendResult.end_row} (the cells
                      right after your existing data). Open the file in Excel to see them.
                    </span>
                  )}
                  <span className="excel-next-tip">
                    Loop the flow: pick another PDF or JSON and more rows will be appended after these.
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}