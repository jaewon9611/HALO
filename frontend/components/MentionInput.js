import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useDebounce from '../hooks/useDebounce';

const MentionInput = ({ onMentionSelect }) => {
  const [inputValue, setInputValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentionList, setShowMentionList] = useState(false);

  const debouncedMentionQuery = useDebounce(mentionQuery, 300);

  useEffect(() => {
    if (debouncedMentionQuery) {
      fetchMentionUsers(debouncedMentionQuery);
    } else {
      setMentionResults([]);
    }
  }, [debouncedMentionQuery]);

  const fetchMentionUsers = async (query) => {
    try {
      const response = await axios.get(`/mention/users?q=${encodeURIComponent(query)}&limit=5`);
      setMentionResults(response.data);
    } catch (error) {
      console.error('mention user fetch error:', error);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    const mentionMatch = value.match(/@(\w+)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionList(true);
    } else {
      setMentionQuery('');
      setShowMentionList(false);
    }
  };

  const handleMentionClick = (user) => {
    const newValue = inputValue.replace(/@(\w+)$/, `@${user.nickname} `);
    setInputValue(newValue);

    if (onMentionSelect) {
      onMentionSelect(user);
    }

    setMentionResults([]);
    setMentionQuery('');
    setShowMentionList(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={inputValue}
        onChange={handleInputChange}
        placeholder="내용을 입력하세요 (@닉네임 입력 가능)"
        rows={5}
        style={{ width: '100%' }}
      />

      {showMentionList && mentionResults.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            background: 'white',
            border: '1px solid #ccc',
            maxHeight: '150px',
            overflowY: 'auto',
            zIndex: 1000,
            margin: 0,
            padding: '5px',
            listStyle: 'none',
          }}
        >
          {mentionResults.map((user) => (
            <li
              key={user.id}
              onClick={() => handleMentionClick(user)}
              style={{ padding: '5px', cursor: 'pointer' }}
            >
              <img
                src={user.profile_img}
                alt={user.nickname}
                style={{ width: '20px', height: '20px', borderRadius: '50%', marginRight: '5px' }}
              />
              {user.nickname}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MentionInput;
