import React, { useState, useEffect } from "react";


const CustomSelect = ({ options, value, onChange, label, placeholder }: 
    { options: { value: string, label: string }[], label: string, 
    placeholder?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }
) => {
    const [inputValue, setInputValue] = useState(value);

  
    useEffect(() => {
      setInputValue(value);
    }, [value]);
  
    const handleChange = (e: 
        React.ChangeEvent<HTMLInputElement>
    ) => {
      setInputValue(e.target.value);
      onChange(e);
    };
  
    return (
      <>
      {label && <label>{label}</label>}
        <input
          list={label}
          value={inputValue}
          onChange={handleChange}
          disabled={options.length === 0}
          placeholder={options.length > 0 ? placeholder : "No options found"}
          style={{ padding: "8px", borderRadius: "4px" }}
        />
        {options.length > 0 && (
        <datalist id={label}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      )}
      </>
    );
  }

  export default CustomSelect;