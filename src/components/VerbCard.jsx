import { memo } from 'react';
import { BookOpenCheck, Pencil, Trash2 } from 'lucide-react';

const VerbCard = ({ verb, onEdit, onDelete }) => {
  const conjugations = Array.isArray(verb.conjugations) ? verb.conjugations : [];

  return (
    <article className="card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
        <div>
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-900/40 text-primary-300 text-xs font-semibold border border-primary-800/70 mb-2">
            <BookOpenCheck size={14} />
            {verb.tense}
          </span>
          <h2 className="text-2xl font-bold text-gray-100">{verb.infinitive}</h2>
          {verb.translation && (
            <p className="text-sm text-primary-300 mt-0.5">{verb.translation}</p>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(verb)}
                className="p-2 rounded-lg bg-[#252525] text-gray-400 hover:text-primary-300 hover:border-primary-700 border border-gray-800 transition-colors"
                title="Modifica verbo"
                aria-label={`Modifica ${verb.infinitive}`}
              >
                <Pencil size={16} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(verb.id)}
                className="p-2 rounded-lg bg-[#252525] text-gray-400 hover:text-red-400 hover:border-red-800 border border-gray-800 transition-colors"
                title="Elimina verbo"
                aria-label={`Elimina ${verb.infinitive}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {conjugations.map((item) => (
          <div
            key={`${verb.id}-${item.pronoun}`}
            className="grid grid-cols-[72px_1fr] items-center gap-3 rounded-lg border border-gray-800 bg-[#252525] px-3 py-2"
          >
            <dt className="text-sm font-semibold text-gray-400">{item.pronoun}</dt>
            <dd className="text-base font-bold text-gray-100 text-left">
              {item.form}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
};

export default memo(VerbCard);
