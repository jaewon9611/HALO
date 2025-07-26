import React from 'react';

const Advertisement = ({ ad }) => {
  if (!ad) return null;

  const {
    title,
    image_url,
    target_url,
    start_date,
    end_date,
    is_active,
  } = ad;

  return (
    <div style={{
      border: '1px solid #ccc',
      padding: '16px',
      marginBottom: '20px',
      borderRadius: '8px'
    }}>
      <h3>{title}</h3>

      <a href={target_url} target="_blank" rel="noopener noreferrer">
        <img src={image_url} alt={title} style={{ width: '100%', maxWidth: '400px' }} />
      </a>

      <p>📅 {start_date} ~ {end_date}</p>
      <p>🔘 상태: {is_active ? '노출중' : '비노출'}</p>
    </div>
  );
};

export default Advertisement;
