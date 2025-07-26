import React, { useState, useEffect, useCallback } from 'react';
import useSearch from '../hooks/useSearch';

const SearchModal = ({ onClose, onUserSelect, userMap }) => {
  const API_URL = 'http://localhost:3065';

  const dataForSearch = userMap && typeof userMap === 'object' ? Object.values(userMap) : [];

  const [localTerm, setLocalTerm] = useState('');

  const { searchTerm, handleSearchChange, filteredData: searchedUsers } = useSearch(
    '',
    dataForSearch,
    'nickname'
  );

  return (
    <div 
    className="search-modal"
    style={{
      position: 'absolute',
      top: '450px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '400px',
      maxHeight: '60%',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
    }}>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0 }}>새로운 채팅 시작</h3>
        <button onClick={onClose} className="search-close-btn">
          &times;
        </button>
      </div>


      <input
        type="text"
        placeholder="닉네임을 검색하세요."
        value={searchTerm}
        onChange={handleSearchChange}
        className="search-input"
      />


      <div style={{ flex: 1, overflowY: 'auto' }}>
        {searchedUsers && searchedUsers.length > 0 ? (
          searchedUsers.map(user => (
            <div
              key={user.id}
              onClick={() => onUserSelect(user)}
              className="search-user-card"
            >
              <img
                src={user.profileImage ? `${API_URL}${user.profileImage}` : '/default.png'}
                alt={user.nickname}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  marginRight: 15
                }}
              />
              <span style={{ fontWeight: 'bold' }}>{user.nickname}</span>
            </div>
          ))
        ) : (
           <p style={{ textAlign: 'center', color: '#999' }}>
             {searchTerm ? '검색 결과가 없습니다.' : '다른 유저를 검색해보세요.'}
           </p>
        )
        }
      </div>
    </div>
  );
};

export default SearchModal;
