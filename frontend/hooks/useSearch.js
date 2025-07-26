import { useState, useEffect } from 'react';
import useDebounce from './useDebounce'; 

const useSearch = (initialSearchTerm, dataToSearch, searchKey, delay = 300) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, delay); 
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    if (dataToSearch && Array.isArray(dataToSearch) && debouncedSearchTerm) {
      const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase();
      const result = dataToSearch.filter(item =>
        item[searchKey] && String(item[searchKey]).toLowerCase().includes(lowerCaseSearchTerm)
      );
      setFilteredData(result);
    } else {
      setFilteredData([]);
    }
  }, [debouncedSearchTerm, dataToSearch, searchKey]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return { searchTerm, handleSearchChange, filteredData };
};

export default useSearch;