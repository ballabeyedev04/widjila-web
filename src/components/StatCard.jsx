import { formatNombre } from '../utils/format.js';

/** Carte KPI : icône colorée + libellé + valeur. */
export default function StatCard({ icon: Icon, label, value, tone = 'navy' }) {
  return (
    <div className="stat-card">
      {Icon && (
        <div className={`stat-icon ${tone}`}>
          <Icon size={22} />
        </div>
      )}
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{formatNombre(value)}</div>
      </div>
    </div>
  );
}
