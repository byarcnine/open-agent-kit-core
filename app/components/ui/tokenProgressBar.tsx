import { AlertTriangle } from "react-feather";

const getUsagePercentage = (used: number, limit: number): number => {
  return Math.min((used / limit) * 100, 100);
};

interface ProgressBarColorProps {
  percentage: number;
}

const getProgressBarColor = (
  percentage: ProgressBarColorProps["percentage"],
): string => {
  if (percentage >= 75) return "bg-red-500";
  if (percentage >= 50) return "bg-yellow-500";
  return "bg-green-500";
};

const TokenProgressBar = ({ used, limit }: { used: number; limit: number }) => {
  const percentage = getUsagePercentage(used, limit);
  const isWarning = percentage >= 75;

  return (
    <div className="flex items-center space-x-3">
      <div className="flex-1">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-neutral-300 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(
              percentage,
            )}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
      {isWarning && (
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
      )}
    </div>
  );
};

export default TokenProgressBar;
