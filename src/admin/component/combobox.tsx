import React, { useState, useRef, useEffect } from 'react';
import { clx } from "@medusajs/ui";
import { TrianglesMini } from "@medusajs/icons";

type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  image?: string;
  price?: number;
  currency_code?: string;
};

type Value = string[] | string;

interface ComboboxProps<T extends Value = Value> {
  value?: T;
  onChange?: (value?: T) => void;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  "aria-label"?: string;
}

const Combobox = <T extends Value = string>({
  value: controlledValue,
  onChange,
  searchValue: controlledSearchValue,
  onSearchValueChange,
  options,
  placeholder,
  className = '',
  disabled = false,
  fetchNextPage,
  isFetchingNextPage,
  "aria-label": ariaLabel,
}: ComboboxProps<T>) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(controlledSearchValue || '');
  const [selectedValues, setSelectedValues] = useState<T>(controlledValue || (Array.isArray(controlledValue) ? [] : '') as T);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isArrayValue = Array.isArray(selectedValues);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }

    if (open && dropdownRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      dropdownRef.current.style.position = 'absolute';
      dropdownRef.current.style.width = `${containerRect.width}px`;
      dropdownRef.current.style.left = '0';
      dropdownRef.current.style.top = `${containerRect.height + 4}px`;
    }
  }, [open]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onSearchValueChange?.(newValue);
  };

  const handleSelect = (option: ComboboxOption) => {
    if (option.disabled) return;

    let newValue: T;
    if (isArrayValue) {
      const currentValues = selectedValues as string[];
      newValue = (currentValues.includes(option.value)
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value]) as T;
    } else {
      newValue = option.value as T;
    }

    setSelectedValues(newValue);
    onChange?.(newValue);
    setOpen(false);
    setSearchValue('');
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const getSelectedLabels = (): string[] | string | undefined => {
    if (isArrayValue) {
      return (selectedValues as string[]).map(v => options.find(o => o.value === v)?.label).filter(Boolean) as string[];
    }
    return options.find(o => o.value === selectedValues)?.label;
  };

  const selectedLabels = getSelectedLabels();

  return (
    <div
      ref={containerRef}
      className={clx(
        "relative flex cursor-pointer items-center gap-x-2",
        "h-8 w-full rounded-md",
        "bg-ui-bg-field transition-fg shadow-borders-base",
        "has-[input:focus]:shadow-borders-interactive-with-active",
        "has-[:invalid]:shadow-borders-error has-[[aria-invalid=true]]:shadow-borders-error",
        "has-[:disabled]:bg-ui-bg-disabled has-[:disabled]:text-ui-fg-disabled has-[:disabled]:cursor-not-allowed",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={ariaLabel}
    >
      <div className="relative flex size-full items-center">
        {!open && selectedLabels && (
          <div className="pointer-events-none absolute inset-y-0 flex size-full items-center overflow-hidden left-2">
            <span className="txt-compact-small text-ui-fg-base truncate">
              {selectedLabels}
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={open ? searchValue : ''}
          onChange={handleSearchChange}
          onClick={() => !disabled && setOpen(true)}
          className={clx(
            "txt-compact-small text-ui-fg-base !placeholder:text-ui-fg-muted transition-fg",
            "size-full cursor-pointer bg-transparent pl-2 pr-8 outline-none focus:cursor-text",
            "hover:bg-ui-bg-field-hover",
            { "opacity-0": !open && selectedLabels }
          )}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="button"
          className="text-ui-fg-muted transition-fg hover:bg-ui-bg-field-hover absolute right-0 flex size-8 items-center justify-center rounded-r outline-none"
          onClick={(e) => {
            e.stopPropagation();
            !disabled && setOpen(!open);
          }}
        >
          <TrianglesMini />
        </button>
      </div>

      {open && (
        <div
          ref={dropdownRef}
          className={clx(
            "absolute left-0 z-50",
            "shadow-elevation-flyout bg-ui-bg-base rounded-lg p-1",
            "max-h-[300px] overflow-y-auto",
            "animate-in fade-in-0 zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=top]:slide-in-from-bottom-2"
          )}
          style={{
            minWidth: "220px"
          }}
        >
          <div className="py-1">
            {filteredOptions.map((option, index) => (
              <div
                key={option.value}
                className={clx(
                  "transition-fg bg-ui-bg-base hover:bg-ui-bg-base-hover",
                  "group flex cursor-pointer items-center gap-x-2 rounded-[4px] px-2 py-1.5",
                  option.disabled && "text-ui-fg-disabled bg-ui-bg-component cursor-not-allowed",
                  selectedValues === option.value && "bg-ui-bg-base-hover"
                )}
                onClick={() => handleSelect(option)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {option.image && (
                    <img
                      src={option.image}
                      alt={option.label}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  <span className="txt-compact-small text-ui-fg-base truncate">{option.label}</span>
                </div>
                {option.price !== undefined && (
                  <span className="txt-compact-small text-ui-fg-subtle ml-auto">
                    {option.price} {option.currency_code}
                  </span>
                )}
              </div>
            ))}
            {isFetchingNextPage && (
              <div className="transition-fg bg-ui-bg-base flex items-center rounded-[4px] px-2 py-1.5">
                <div className="bg-ui-bg-component size-full h-5 w-full animate-pulse rounded-[4px]" />
              </div>
            )}
            {!filteredOptions.length && (
              <div className="flex items-center gap-x-2 rounded-[4px] px-2 py-1.5">
                <span className="txt-compact-small text-ui-fg-subtle">
                  No results found
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { Combobox };
