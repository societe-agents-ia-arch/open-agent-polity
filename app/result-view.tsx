export function ResultView({ result }: { result: unknown }) {
  if (typeof result === 'string') return <p className="result-text">{result}</p>;
  if (typeof result === 'number' || typeof result === 'boolean') return <p className="result-text">{String(result)}</p>;
  if (result === null || result === undefined) return <p className="result-text">No structured result was provided.</p>;
  return <pre className="result-json"><code>{JSON.stringify(result, null, 2)}</code></pre>;
}
