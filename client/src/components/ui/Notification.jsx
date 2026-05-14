import React from 'react';
import './Notification.css';

export default function Notification({ msg, type }) {
  return (
    <div className={`notification notification-${type}`}>
      {msg}
    </div>
  );
}
