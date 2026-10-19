/** Shown during client-side navigation while a page's data loads. */
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading">
      <div className="skel" style={{ height: 34, width: "40%", marginBottom: 14 }} />
      <div className="skel" style={{ height: 16, width: "70%", marginBottom: 22 }} />
      <div className="kpis">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel" style={{ height: 74 }} />)}</div>
      {Array.from({ length: 8 }, (_, i) => <div key={i} className="skel" style={{ height: 38, marginBottom: 8 }} />)}
    </main>
  );
}
