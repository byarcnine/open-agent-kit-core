import * as FeatherIcons from "react-feather";

const FeatherIcon = ({
  iconName,
  className,
}: {
  iconName: keyof typeof FeatherIcons;
  className?: string;
}) => {
  const Icon = FeatherIcons[iconName];
  return <Icon className={className} />;
};

export default FeatherIcon;
