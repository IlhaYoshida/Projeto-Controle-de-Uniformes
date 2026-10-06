import { FileUp, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../App';
import { getEscolas, getTurmas } from '../api';
import { Button } from './UI';

const semAcento = (t = '') => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export default function ImportModal({ close }) {
  const { addStudent } = useApp();
  const input = useRef();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [importando, setImportando] = useState(false);

  const choose = f => {
    if (!f) return;
    if (/\.(pdf|xlsx?)$/i.test(f.name)) {
      setError('Suporte a PDF e Excel ainda não foi implementado nesta versão — use CSV ou JSON por enquanto.');
      setFile(null);
    } else if (!/\.(csv|json)$/i.test(f.name)) {
      setError('Selecione um arquivo CSV, JSON (ou, no futuro, PDF/Excel).');
      setFile(null);
    } else {
      setError(''); setFile(f); setResultado(null);
    }
  };

  const submit = async () => {
    if (!file) return setError('Selecione um arquivo para importar.');
    setError(''); setImportando(true);

    try {
      const text = await file.text();
      let rows;
      if (/\.json$/i.test(file.name)) {
        rows = JSON.parse(text);
      } else {
        const [head, ...lines] = text.trim().split(/\r?\n/);
        const keys = head.split(/[,;]/).map(x => x.trim());
        rows = lines.filter(Boolean).map(line => Object.fromEntries(line.split(/[,;]/).map((v, i) => [keys[i], v.trim()])));
      }
      if (!Array.isArray(rows) || !rows.length) throw new Error('Arquivo vazio ou em formato inesperado.');

      const [escolas, turmas] = await Promise.all([getEscolas(), getTurmas()]);

      let ok = 0;
      const falhas = [];
      for (const row of rows) {
        try {
          const escolaId = row.escola_id || escolas.find(e => semAcento(e.nome) === semAcento(row.escola))?.id || (escolas.length === 1 ? escolas[0].id : null);
          const turmaId = row.turma_id || turmas.find(t => semAcento(t.nome) === semAcento(row.turma) && (!escolaId || t.escola_id === Number(escolaId)))?.id;

          if (!escolaId || !turmaId || !row.nome) {
            throw new Error('Faltam dados obrigatórios (nome, escola e turma precisam existir previamente).');
          }

          await addStudent({
            nome: row.nome,
            matricula: row.matricula || null,
            data_nascimento: row.data_nascimento || row.nascimento || null,
            nome_pai: row.nome_pai || row.pai || null,
            nome_mae: row.nome_mae || row.mae || null,
            escola_id: Number(escolaId),
            turma_id: Number(turmaId),
          });
          ok += 1;
        } catch (err) {
          falhas.push(`${row.nome || '(sem nome)'}: ${err.message}`);
        }
      }
      setResultado({ ok, falhas });
      if (!falhas.length) setTimeout(close, 1500);
    } catch (err) {
      setError(err.message || 'Não foi possível ler o arquivo. Verifique o formato.');
    } finally {
      setImportando(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5">
    <div className="page-enter relative w-full max-w-[610px] rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
      <button onClick={close} className="absolute right-6 top-6 text-slate-400 hover:text-slate-700"><X size={20} /></button>
      <h2 className="text-2xl font-bold">Importar alunos</h2>
      <p className="mt-1 text-sm text-slate-500">Envie um arquivo com os alunos para cadastro em lote.</p>
      <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }} className="mt-8 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
        <FileUp className="mb-3 text-[#2563eb]" size={32} />
        <b className="text-sm">{file ? file.name : 'Arraste o arquivo aqui'}</b>
        <span className="mt-1 text-xs text-slate-400">PDF, CSV ou Excel (.xlsx)</span>
        <input ref={input} type="file" accept=".csv,.json,.xlsx,.xls,.pdf" hidden onChange={e => choose(e.target.files[0])} />
        <Button variant="secondary" onClick={() => input.current.click()} className="mt-5 h-10">Selecionar arquivo</Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {resultado && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
          <p className="font-semibold text-emerald-700">{resultado.ok} aluno(s) importado(s) com sucesso.</p>
          {!!resultado.falhas.length && <div className="mt-2 text-red-600"><p className="font-semibold">{resultado.falhas.length} falharam:</p><ul className="mt-1 list-disc pl-4">{resultado.falhas.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
        </div>
      )}
      <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
        <Button variant="secondary" onClick={close}>Cancelar</Button>
        <Button onClick={submit} disabled={importando}>{importando ? 'Importando...' : 'Importar'}</Button>
      </div>
      <p className="mt-5 text-xs text-slate-400">
        Colunas esperadas no CSV/JSON: nome, matricula, data_nascimento, escola (ou escola_id), turma (ou turma_id), nome_pai, nome_mae.
        A escola e a turma já precisam existir no sistema — o nome informado é comparado ignorando acento/maiúsculas.
      </p>
    </div>
  </div>;
}
