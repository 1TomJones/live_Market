export default function StatCard({ label, value, positive }) {
  return (
    <div className="card stat-card">
      <div className="muted">{label}</div>
      <div className={positive === undefined ? '' : positive ? 'green' : 'red'}>{value}</div>
    </div>
  );
}
