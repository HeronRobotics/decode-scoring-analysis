import { useTeamName } from '../contexts/TeamNamesContext';

/**
 * Component to display a team name, loading from FTC API if needed
 * Falls back to showing the team number if name is not available
 */
function TeamName({ teamNumber, showNumber = false, className = '' }) {
  const { info } = useTeamName(teamNumber);

  if (!teamNumber) return null;

  const displayName = info ? info.nameShort : String(teamNumber);

  if (showNumber && info) {
    return (
      <span className={className} title={info.nameFull}>
        {displayName} ({teamNumber})
      </span>
    );
  }

  return (
    <span className={className} title={info?.nameFull || `Team ${teamNumber}`}>
      {displayName}
    </span>
  );
}

export default TeamName;
