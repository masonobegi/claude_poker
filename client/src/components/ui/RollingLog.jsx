import React, { useRef, useEffect } from 'react';
import './RollingLog.css';

export default function RollingLog({ entries }) {
  const ref = useRef(null);
  const recent = entries.slice(-5);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries.length]);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="rolling-log" ref={ref}>
      {recent.map(e => (
        <div key={e.id || e.ts} className="rl-entry">{e.message}</div>
      ))}
    </div>
  );
}
