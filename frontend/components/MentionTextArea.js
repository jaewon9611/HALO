import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import useDebounce from '../hooks/useDebounce';

const MentionTextArea = React.forwardRef(({ value, onChange, placeholder = "댓글을 입력하세요...", style = {} }, ref) => {
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentionList, setShowMentionList] = useState(false);

  const debouncedMentionQuery = useDebounce(mentionQuery, 300);
  const API_URL = 'http://localhost:3065';
  const textareaRef = ref || useRef(null);

  useEffect(() => {
    if (debouncedMentionQuery) {
      fetchMentionUsers(debouncedMentionQuery);
    } else {
      setMentionResults([]);
    }
  }, [debouncedMentionQuery]);

  const fetchMentionUsers = async (query) => {
    try {
      const res = await axios.get(`${API_URL}/mention/users?q=${encodeURIComponent(query)}&limit=5`, {
        withCredentials: true,
      });
      setMentionResults(res.data);
    } catch (err) {
      console.error('mention user fetch error:', err);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(e);

    const match = newValue.slice(0, e.target.selectionStart).match(/@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentionList(true);
    } else {
      setMentionQuery('');
      setShowMentionList(false);
    }
  };

  const handleMentionClick = (user) => {
    const textarea = textareaRef.current;
    const { selectionStart } = textarea;
    const before = value.slice(0, selectionStart).replace(/@([^\s@]*)$/, `@${user.nickname} `);
    const after = value.slice(selectionStart);
    const newText = before + after;
    onChange({ target: { value: newText } });

    setMentionQuery('');
    setMentionResults([]);
    setShowMentionList(false);
  };

  const combinedStyle = {
    width: '100%',
    height: 68,
    fontSize: 15,
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #ccc',
    resize: 'none',
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        style={combinedStyle}
        className="comment-textarea"
      />

      {showMentionList && mentionResults.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            width: '100%',
            background: '#fff',
            border: '1px solid #ccc',
            maxHeight: '150px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '5px 0',
            listStyle: 'none',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {mentionResults.map((user) => (
            <li
              key={user.id}
              onClick={() => handleMentionClick(user)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <img
                src={user.profile_img ? `${API_URL}${user.profile_img}` : `${API_URL}/img/profile/default.jpg`}
                alt={user.nickname}
                style={{ width: 20, height: 20, borderRadius: '50%' }}
              />
              {user.nickname}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default MentionTextArea;
