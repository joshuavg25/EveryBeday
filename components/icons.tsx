import type { ReactNode, SVGProps } from 'react';

// Line icons drawn on a 24px grid. They are decorative: the text next to them carries the meaning.

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const DropletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3c3.5 4.6 6.5 8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.500 11 8.500 7.600 12 3Z" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const DoorIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 20.500V4.500a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M4 20.500h16M14.500 12.500v.01" />
  </Icon>
);

export const StairsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 19.500h4.500v-4.500H13v-4.500h4.500V6H20" />
  </Icon>
);

export const PeopleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="7.500" r="2.500" />
    <circle cx="16.500" cy="8.500" r="2" />
    <path d="M3.500 19.500c0-3 2-5 4.500-5s4.500 2 4.500 5M14.500 14.800c.6-.2 1.300-.3 2-.3 2.200 0 4 1.800 4 4.500" />
  </Icon>
);

export const WheelchairIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="4.500" r="1.500" />
    <path d="M10 8v6h5l2.500 5M10 10.500h4.500" />
    <path d="M8 11.500a5 5 0 1 0 6.500 6.500" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.500 4.500 4.500L19 7.500" />
  </Icon>
);

export const LocateIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.500" />
    <path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V3.500M8 7l4-3.500L16 7M5 12.500v6a1.500 1.500 0 0 0 1.500 1.500h11a1.500 1.500 0 0 0 1.500-1.500v-6" />
  </Icon>
);

export const DirectionsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m20.500 3.500-7 17-2.500-7-7-2.500 16.500-7.500Z" />
  </Icon>
);

export const FlagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4M5 4.500c4-2 6 2 10 0 1.300-.6 2.500-.8 4-.5v9c-1.500-.3-2.700-.1-4 .5-4 2-6-2-10 0" />
  </Icon>
);

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.500" />
    <path d="M5 20c0-3.600 3-6 7-6s7 2.400 7 6" />
  </Icon>
);

export const BackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.500 5.500 8 12l6.500 6.500" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-6.500 7-12a7 7 0 0 0-14 0c0 5.500 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.500" />
  </Icon>
);

export const NoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5.500a1.500 1.500 0 0 1 1.500-1.500h11A1.500 1.500 0 0 1 19 5.500v9l-4.500 4.500h-8A1.500 1.500 0 0 1 5 17.500v-12ZM14.500 19v-4.500H19M8.500 9h7M8.500 12.500h4" />
  </Icon>
);
