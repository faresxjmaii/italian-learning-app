import { useMemo, useState } from 'react';
import { ExternalLink, Loader2, PlayCircle, Search, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';

const searchYoutubeVideos = async (query) => {
  const response = await fetch('/api/youtube-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Ricerca YouTube non riuscita.');
  }

  return data.videos || [];
};

const getShortDescription = (description) => {
  const text = String(description || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > 220 ? `${text.slice(0, 220).trim()}...` : text;
};

const Pronuncia = () => {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const selectedVideo = useMemo(
    () => videos.find((video) => video.videoId === selectedVideoId) || videos[0],
    [selectedVideoId, videos]
  );
  const otherVideos = videos.filter((video) => video.videoId !== selectedVideo?.videoId).slice(0, 4);
  const shortDescription = getShortDescription(selectedVideo?.description);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      toast.error('Inserisci una parola italiana');
      return;
    }

    setIsLoading(true);
    setError('');
    setVideos([]);
    setSelectedVideoId('');
    setHasSearched(true);

    try {
      const results = await searchYoutubeVideos(cleanQuery);
      setVideos(results);
      setSelectedVideoId(results[0]?.videoId || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="surface-panel p-5 md:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-800/70 bg-primary-950/30 px-3 py-1 text-xs font-bold text-primary-300 mb-3">
          <Volume2 size={16} />
          Ascolto guidato
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-100">Pronuncia</h1>
        <p className="text-gray-400 mt-1">
          Cerca una parola italiana e ascolta la pronuncia in contesto.
        </p>
      </header>

      <section className="card p-4">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-field pl-12"
              placeholder="es. necessario, andare, buongiorno..."
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary py-3 px-5 md:min-w-40 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <PlayCircle size={20} />}
            <span>{isLoading ? 'Ricerca...' : 'Cerca video'}</span>
          </button>
        </form>
      </section>

      {error && (
        <section className="card p-5 border-l-4 border-l-red-500">
          <p className="font-bold text-red-300">Errore</p>
          <p className="text-gray-400 mt-1">{error}</p>
        </section>
      )}

      {!isLoading && videos.length === 0 && !error && !hasSearched && (
        <section className="card p-8 text-center">
          <PlayCircle className="mx-auto text-primary-400 mb-4" size={52} />
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Cerca una parola</h2>
          <p className="text-gray-400">Troverai video utili per ascoltare la pronuncia italiana.</p>
        </section>
      )}

      {!isLoading && videos.length === 0 && !error && hasSearched && (
        <section className="card p-8 text-center">
          <p className="text-gray-400">Nessun video trovato.</p>
        </section>
      )}

      {selectedVideo && (
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="card overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe
                title={selectedVideo.title}
                src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="p-5">
              <h2 className="text-xl md:text-2xl font-bold text-gray-100">{selectedVideo.title}</h2>
              {selectedVideo.channelTitle && (
                <p className="text-sm font-semibold text-primary-300 mt-1">{selectedVideo.channelTitle}</p>
              )}
              <div className="mt-4 rounded-xl border border-white/10 bg-[#11191d] p-4">
                <p className="text-sm font-bold text-gray-300 mb-2">Caption / Esempio</p>
                {selectedVideo.captionStatus === 'available' ? (
                  <p className="text-gray-400">
                    Caption rilevate per questo video, ma il testo non viene caricato in questa modalita stabile.
                  </p>
                ) : (
                  <p className="text-gray-400">Caption non disponibile per questo video.</p>
                )}
                {shortDescription && (
                  <p className="text-gray-300 mt-3">{shortDescription}</p>
                )}
                <p className="text-primary-200 mt-3 font-semibold">
                  Ascolta la parola nel video e ripeti ad alta voce.
                </p>
                <a
                  href={selectedVideo.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-primary-300 hover:text-primary-200 font-bold mt-3"
                >
                  <ExternalLink size={16} />
                  <span>Apri su YouTube</span>
                </a>
              </div>
            </div>
          </div>

          <aside className="card p-4 h-fit">
            <h3 className="text-lg font-bold text-gray-100 mb-3">Altri risultati</h3>
            <div className="space-y-3">
              {otherVideos.length > 0 ? otherVideos.map((video) => (
                <button
                  key={video.videoId}
                  type="button"
                  onClick={() => setSelectedVideoId(video.videoId)}
                  className="w-full rounded-xl border border-gray-800 bg-[#11191d] p-2 text-left transition-colors hover:border-primary-700 hover:bg-primary-950/20"
                >
                  <div className="flex gap-3">
                    {video.thumbnail && (
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="h-16 w-24 rounded-lg object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-bold text-gray-100">{video.title}</p>
                      {video.channelTitle && (
                        <p className="mt-1 truncate text-xs text-gray-500">{video.channelTitle}</p>
                      )}
                    </div>
                  </div>
                </button>
              )) : (
                <p className="text-sm text-gray-500">Nessun altro risultato.</p>
              )}
            </div>
          </aside>
        </section>
      )}
    </div>
  );
};

export default Pronuncia;
