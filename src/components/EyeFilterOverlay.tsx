import { motion } from 'framer-motion';
import { EyeFilter } from '../store/readerStore';

interface Props {
  filter: EyeFilter;
}

const filterStyles: Record<EyeFilter, React.CSSProperties> = {
  none: { display: 'none' },
  night: {
    background: 'rgba(50, 0, 0, 0.25)',
    mixBlendMode: 'multiply',
  },
  bluelight: {
    background: 'rgba(255, 140, 0, 0.12)',
    mixBlendMode: 'multiply',
  },
  sepia: {
    background: 'rgba(112, 66, 20, 0.18)',
    mixBlendMode: 'multiply',
  },
  lowcontrast: {
    background: 'rgba(200, 200, 200, 0.08)',
    mixBlendMode: 'overlay',
  },
};

const filterNames: Record<EyeFilter, string> = {
  none: 'Default',
  night: 'Night Mode',
  bluelight: 'Blue Light Filter',
  sepia: 'Sepia',
  lowcontrast: 'Low Contrast',
};

export default function EyeFilterOverlay({ filter }: Props) {
  if (filter === 'none') return null;

  return (
    <motion.div
      key={filter}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-20 pointer-events-none"
      style={filterStyles[filter]}
      aria-hidden="true"
    />
  );
}
