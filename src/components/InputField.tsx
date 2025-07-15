interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    value: string;
}

const InputField = ({ label, value, ...rest }: InputFieldProps) => {
    const { name, maxLength } = rest;
    const showCharCount = maxLength && name === 'memo';
    
    return (
        <>
            {label && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor={name}>{label}</label>
                    {showCharCount && (
                        <span style={{ fontSize: '0.85em', color: '#666' }}>
                            {value.length}/{maxLength}
                        </span>
                    )}
                </div>
            )}
            <input
                type='text'
                value={value}
                {...rest}
            />
        </>
    );
};

export default InputField;