import { useCallback, useEffect, useState } from "react";

/**
 * Hook for debouncing search input
 * @returns searchValue, onSearchValueChange, query
 */
export const useDebouncedSearch = () => {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const onSearchValueChange = (value: string) => {
    setSearchValue(value);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchValue]);

  return {
    searchValue,
    onSearchValueChange,
    query: debouncedQuery || undefined,
  };
};
